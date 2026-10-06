---
order: 120
title: 变更流与实时应用
module: 'mongodb'
category: 数据库
difficulty: advanced
description: 监听数据变化的每一跳：Change Streams、resume token 与实时架构。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'mongodb/020-MongoDBCRUDOperations'
prerequisites:
  - 'mongodb/030-MongoDBAggregationPipeline'
---

## 知识点地图

- 知识类别：Change Streams 实时变更订阅——三种监听粒度、聚合管道过滤、事件结构（fullDocument/updateDescription）、resume token 断点续听与容错重启。
- 解决什么问题：数据变化后的联动动作（刷缓存、发通知、同步下游）不再靠轮询；订阅端宕机后能从断点接着听。
- 什么时候用到：缓存失效推送、跨系统数据同步（ESD 入口）、审计流水、微服务间"数据库即消息源"的轻量方案。

## 0. 让数据变化主动找你（先读这里）

> 学习目标：说明 Change Streams 与 oplog 的关系；用 watch 订阅集合、库、全集群，并用聚合管道过滤事件；理解 fullDocument 与 updateDescription 的取值差异；保存 resume token 实现断点续听，写出容错重启的监听循环；能判断一个需求该轮询还是订阅。

"订单状态变了怎么通知缓存？"——过去的答案通常是定时轮询：每隔一秒查一遍数据库。轮询有天然的尴尬：间隔大了不实时，间隔小了数据库扛不住，还感知不到删除。MongoDB 3.6 起提供了更好的答案：**Change Streams（变更流）**，让数据变化像消息队列一样"推"给订阅者。

## 1. Change Streams 是什么

Change Streams 是构建在 **oplog** 之上的变更订阅接口：oplog 记录了副本集上的每一次写操作（见 070 第 2 节），变更流把它封装成一个"应用可订阅、可过滤、可断点续听"的游标。对应用来说，它就是一条打开 `$changeStream` 阶段的聚合管道——你在 030 学的管道语法在这里直接复用。

```javascript
// 一条 insert 事件长这样（节选）
{
  _id: { _data: "8266CE..." },     // resume token：断点续听的"存折"
  operationType: "insert",
  clusterTime: Timestamp({ t: 1724832000, i: 1 }),  // 事件的集群时间
  ns: { db: "shop", coll: "orders" },
  documentKey: { _id: ObjectId("...") },
  fullDocument: { _id: ObjectId("..."), orderNo: "A001", total: 199, status: "created" }
}
```

**与直接 tail oplog 相比的优势：**

1. 不需要读 `local` 库（那需要更高权限），走正常的聚合接口与权限体系。
2. 天然支持管道过滤与投影，服务端就把噪音滤掉，省网络流量。
3. 每条事件自带 resume token，断点续听是原生能力。
4. 分片集群同样可用；同一文档的事件保证有序，跨分片的全局顺序则不要依赖。

前提条件：**副本集或分片集群**（oplog 存在才有得订阅）；事件按 oplog 顺序投递；除了增删改，drop、rename 等 DDL 也会产生事件（事件类型随版本增加，以官方文档为准）。

## 2. 三种监听粒度：集合、库、全集群

```javascript
// 1) 集合级：只听 orders 的变化（最常用）
const cs1 = db.orders.watch()

// 2) 库级：听当前库所有集合的变化
use shop
const cs2 = db.watch()

// 3) 部署级：听所有库的变化
const cs3 = db.getMongo().watch()
```

```javascript
// mongosh 里怎么读事件
const cs = db.orders.watch()
cs.next()     // 阻塞直到下一条事件到达
cs.tryNext()  // 非阻塞：没有新事件立即返回 null，适合轮询式演示
cs.close()    // 用完关闭游标
```

**讲解：**

1. 粒度越细开销越小：能用集合级就不要开库级，能用库级就不要开部署级。
2. 权限方面，应用账号拥有对应范围的读权限即可 watch（变更流权限包含在 read 类角色中，细节以官方文档为准），这也是它与裸读 oplog 的重要差别。
3. 另开一个 mongosh 窗口执行 `db.orders.insertOne({...})`，就能在本窗口的 `cs.next()` 里收到事件——这是验证环境是否就绪的最快办法。

## 3. 用聚合管道过滤与投影

watch 的第一个参数就是聚合管道，但只允许 `$match`、`$project`、`$addFields`、`$replaceRoot` 等少数阶段（支持范围以官方文档为准）：

```javascript
// 只关心"支付成功"的更新事件，且只取必要字段
const pipeline = [
  {
    $match: {
      operationType: "update",                            // 只要更新事件
      "updateDescription.updatedFields.status": "paid"    // 且 status 恰好变为 paid
    }
  },
  {
    $project: {
      operationType: 1,
      documentKey: 1,                                     // 拿到 _id 就够下游使用
      "updateDescription.updatedFields": 1
    }
  }
]
const cs = db.orders.watch(pipeline)
```

```javascript
// 缓存失效场景：只听 update 与 delete，其他事件全部丢弃
const cs = db.orders.watch([
  { $match: { operationType: { $in: [ "update", "delete" ] } } }
])
```

**讲解：**

1. 过滤条件可以直接引用事件文档的字段路径（如 `fullDocument.status`、`updateDescription.updatedFields.xxx`），写法与普通聚合完全一致。
2. **过滤下推到服务端**是变更流性能的关键：网络里只跑你关心的事件，而不是全库流水。

## 4. 读懂事件：fullDocument 与 updateDescription

update 事件默认**不带完整文档**，只带增量描述 `updateDescription`：

```javascript
// 一次 db.orders.updateOne({...}, { $set: { status: "paid" }, $unset: { couponCode: "" } }) 之后的事件（节选）
{
  operationType: "update",
  documentKey: { _id: ObjectId("...") },
  updateDescription: {
    updatedFields: { status: "paid", "items.1.qty": 2 },  // 点路径精确到数组元素
    removedFields: [ "couponCode" ]                       // 被删除的字段
  }
}
```

需要完整文档时用 `fullDocument` 选项：

| 取值 | 行为 |
| --- | --- |
| default（默认） | update 事件不含 fullDocument |
| updateLookup | 事件送达时回查一次当前文档；注意读到的是"此刻"的值，不保证是变更瞬间的版本 |
| whenAvailable / required | 6.0 起，配合集合级前后镜像（pre/post image），可拿到变更前 / 后的完整快照（有额外存储开销，以官方文档为准） |

```javascript
// 需要"变更后的完整文档"时
const cs = db.orders.watch([], { fullDocument: "updateLookup" })

// 6.0+：开启集合级前后镜像后，可同时拿到变更前后的文档
db.runCommand({ collMod: "orders", changeStreamPreAndPostImages: { enabled: true } })
const cs2 = db.orders.watch(
  [],
  { fullDocument: "whenAvailable", fullDocumentBeforeChange: "whenAvailable" }
)
```

**讲解：**

1. `updateLookup` 有一处语义要特别当心：两次变更挨得很近时，回查到的可能已经是最新状态，事件与快照之间有时间差。
2. 前后镜像解决的是"审计、回滚、Diff"类需求，但每份文档多存一份镜像，要评估存储成本。
3. insert / replace / delete 事件没有这个问题：它们本来就带 `fullDocument`（delete 只带 `documentKey`）。

## 5. resume token 与断点续听

每条事件的 `_id` 就是 **resume token**。把它持久化下来，进程重启后用 `resumeAfter` 从上次位置继续，一条事件都不丢：

```javascript
// 处理完一条事件后，把断点记到 meta 库的 checkpoints 集合
const evt = cs.next()
db.getSiblingDB("meta").checkpoints.updateOne(
  { name: "orders-watcher" },
  { $set: { token: evt._id } },
  { upsert: true }
)

// 重启后从断点继续
const saved = db.getSiblingDB("meta").checkpoints.findOne({ name: "orders-watcher" })
const cs = db.orders.watch([], saved ? { resumeAfter: saved.token } : {})
```

**三个相关选项：**

1. `resumeAfter`：从该事件之后继续；遇到 invalidate（如集合被 drop）后失效。
2. `startAfter`：可以在 invalidate 之后继续，适合"失效后重新接上"的场景。
3. `startAtOperationTime`：从某个时刻开始听，常用于"先做全量初始化、再从初始化时刻接管增量"。

**oplog 窗口是硬约束：** resume token 指向的事件一旦被 oplog 滚动淘汰（比如监听程序停了三天，oplog 只保留两小时），resume 会报 `ChangeStreamHistoryLost`——只能做全量重建后从当前时刻继续。oplog 越大，允许的断线时间越长（用 `rs.printReplicationInfo()` 查看窗口）。

## 6. 容错重启实践：带断点的监听循环

```javascript
// ===== 带断点续听的容错监听循环（mongosh 演示版，Ctrl+C 停止）=====
const META = db.getSiblingDB("meta").checkpoints
const NAME = "orders-watcher"

function handle(evt) {
  // 替换为你的业务：删缓存、推送大屏、同步搜索引擎……
  print(evt.operationType + " -> " + JSON.stringify(evt.documentKey))
}

function watchOrders() {
  // 启动时读取上次断点
  let token = null
  const saved = META.findOne({ name: NAME })
  if (saved) token = saved.token

  while (true) {
    try {
      const cs = db.orders.watch([], token ? { resumeAfter: token } : {})
      if (token) { print("从断点继续监听") } else { print("从当前时刻开始监听") }

      while (true) {
        const evt = cs.tryNext()              // 非阻塞读取
        if (evt) {
          handle(evt)
          token = evt._id                     // 先处理后推进断点（配合幂等消费更稳）
          META.updateOne({ name: NAME }, { $set: { token } }, { upsert: true })
        } else {
          sleep(500)                          // mongosh 的 sleep，单位毫秒
        }
      }
    } catch (err) {
      if (err.hasErrorLabel && err.hasErrorLabel("ChangeStreamHistoryLost")) {
        // 断点已被 oplog 淘汰：执行全量重建（此处略），再从当前时刻接管
        print("断点失效，执行全量重建后从当前时刻继续")
        token = null
      } else {
        // 网络抖动、主从切换等：稍等后带着断点重连
        print("监听异常，5 秒后重连：" + err.message)
        sleep(5000)
      }
    }
  }
}

watchOrders()
```

**讲解：**

1. 循环的三条出口对应三种现实：正常拿到事件、临时故障（带断点重连）、断点失效（全量重建）。生产代码把"全量重建"实现为：清空下游 → 全表扫描灌入 → 用 `startAtOperationTime: 重建开始时刻` 接管增量。
2. mongosh 适合演示与运维脚本；生产环境用官方驱动（Node.js / Java / Python 均内置了 resume 语义与自动重连），并把 checkpoint 落库或落消息队列。
3. "先处理后推进断点"意味着故障重连会重复消费最后一条事件——下游逻辑要写成幂等的（按 `documentKey` 去重或覆盖写）。

## 7. 典型场景与选型对比

**场景一：缓存失效（最经典）**

```javascript
// 变更驱动的缓存失效（伪代码）
if (evt.operationType === "update" || evt.operationType === "delete") {
  redis.del("order:" + evt.documentKey._id)   // 库里一变，缓存立刻失效
}
```

**场景二：实时大屏**——把 `$match` 过滤后的事件经 WebSocket 推给前端，数据入库到图表刷新之间没有轮询间隔。

**场景三：CDC 数据管道**——同步到 Elasticsearch（搜索）、Kafka（消息队列）或数仓，替代"应用层双写"，天然不会漏写、错序。

**场景四：微服务数据分发**——库内一写，多个服务各自订阅，减少服务之间的直接耦合。

**轮询 vs 变更流：**

| 维度 | 定时轮询 | Change Streams |
| --- | --- | --- |
| 实时性 | 取决于轮询间隔（秒到分钟级） | 事件产生即推送，亚秒级 |
| 数据库负载 | 间隔越小负载越高，空转多 | 一条常驻游标，负载平稳 |
| 删除感知 | 难：记录没了才知道 | delete 事件明确送达 |
| 断点续传 | 自己比对时间戳 / 水位，易漏 | resume token 原生支持 |
| 环境要求 | 无 | 需要副本集；注意 oplog 窗口 |
| 适用 | 低频报表、离线任务 | 缓存失效、实时大屏、CDC |

一句话补充：使用 Atlas 的项目可以把"监听 + 处理"托管给 Atlas Triggers（数据库触发器），无需自建常驻进程。

## 动手实践

**任务一：三种粒度与事件结构观察。** 订阅一个集合的 watch，从另一个连接执行 insert/update/delete 各一次，把每个事件的 operationType、documentKey、updateDescription 完整打印出来对比。提示：update 事件的重点在 updateDescription.updatedFields 与 removedFields——"改了什么"比"文档全量"省流量，只在必要时才用 fullDocument: "updateLookup"。

**任务二：管道过滤 + 投影。** 给 watch 加聚合管道：只推 orderStatus 字段发生变化、且新值为 "shipped" 的事件，投影只保留 documentKey 与新状态。验证插入、无关字段更新、目标状态更新三种操作，前两种应静默。提示：管道写在 watch 的第一个参数里；$match 阶段对 update 事件过滤的是 updateDescription.fullDocument——带 fullDocument: "updateLookup" 才能在管道里读到完整文档字段。

**任务三：断点续听实战。** 写监听循环把每个事件的处理进度（resume token）存进一个 checkpoint 集合；处理到第 5 个事件时 kill 监听进程，再插入 3 条新数据后重启监听，验证它从断点接着消费而不是从头或漏掉。提示：重启后 watch 的参数是 resumeAfter: <存下的 token>；token 过期（oplog 滚掉）会报 ChangeStreamHistoryLost——这正是第 5 节"token 保存周期要短于 oplog 窗口"的实证。

先自己操作，再对照参考实现：

<details>
<summary>任务三参考实现（Node 驱动形态）</summary>

```javascript
const checkpointColl = db.collection("stream_checkpoints")
const KEY = "orders-watcher"

async function watchWithResume() {
  const saved = await checkpointColl.findOne({ _id: KEY })
  const options = saved
    ? { resumeAfter: saved.token, fullDocument: "updateLookup" }
    : { fullDocument: "updateLookup" }

  const stream = db.collection("orders").watch([], options)
  console.log("watching", saved ? "from checkpoint" : "from now")

  for await (const event of stream) {
    try {
      await handle(event)                       // 业务处理（刷缓存/发通知）
      await checkpointColl.updateOne(
        { _id: KEY },
        { $set: { token: event._id, at: new Date() } },
        { upsert: true },                       // 处理成功才推进 token
      )
    } catch (err) {
      console.error("handle failed, will retry from same token", err)
      throw err                                 // 交给外层重启循环
    }
  }
}

// 容错外壳：崩了就退避重启，token 保证不丢不重
async function main() {
  for (;;) {
    try {
      await watchWithResume()
    } catch (err) {
      console.error("watch loop crashed, restart in 5s", err)
      await new Promise((r) => setTimeout(r, 5000))
    }
  }
}
```

要点：a) 事件自带 \_id 就是 resume token——"处理成功后存 token"的顺序保证 at-least-once 语义（最多重放一条，不丢）；b) 业务处理要幂等，因为崩溃恢复后同一条事件可能再处理一次；c) for await 断开（选举、网络）会抛错，外层重启循环 + token 是标准容错壳，第 6 节的手写版本与此同构。
</details>

## 小结与延伸

> 变更流 = oplog 的应用层封装；生产可用性取决于三件事：过滤下推、断点持久化、失效重建。

收工自查清单：

1. 三种粒度从细到粗：集合 `watch()`、库 `db.watch()`、部署 `db.getMongo().watch()`。
2. 管道过滤用 `$match` / `$project`，服务端过滤省流量；事件文档的字段路径可直接引用。
3. update 事件默认只带 `updateDescription`；要完整文档用 `fullDocument: "updateLookup"`，要前后镜像用 6.0 的 pre/post image。
4. resume token 每事件一个，持久化到 `checkpoints`；`ChangeStreamHistoryLost` 触发全量重建。
5. 下游消费必须幂等，因为"先处理后推进断点"意味着重连时可能重复消费。

延伸阅读：管道语法详见 030-MongoDBAggregationPipeline（watch 就是管道）；事件里的增删改语义见 020-MongoDBCRUDOperations；oplog 与副本集机制见 070-MongoDBReplicaSetSharding。官方文档关键词：Change Streams、Change Events、Resume a Change Stream，事件类型与选项以官方文档为准。
