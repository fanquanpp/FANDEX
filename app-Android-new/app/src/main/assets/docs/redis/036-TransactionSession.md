---
order: 360
title: 事务与会话
module: 'redis'
category: 数据库
difficulty: intermediate
description: 多文档事务、会话与因果一致性——在文档数据库里获得确定性。
author: fanquanpp
updated: '2026-08-28'
related:
  - 'redis/035-SchemaDesignEnterprise'
prerequisites:
  - 'redis/032-CRUDOperations'
---

## 0. 为什么 NoSQL 也需要事务（先读这里）

> 学习目标：说清单文档原子性与多文档事务的边界；会用会话开启、提交、回滚一个多文档事务；理解 writeConcern / readConcern 与 majority 的含义；知道事务的限制清单，并在转账场景写出带重试的完整代码。

很多教程说 MongoDB "为了性能放弃了事务"，这句话只对了一半：**单文档操作天然原子**，一次 `$inc`、一次 `$set` 在服务器端一次性生效，不存在"写了一半"的中间态。所以大量看似需要事务的场景，可以通过建模（内嵌进同一文档，见 005 建模篇）直接消掉，这正是 MongoDB 高性能的来源之一。

业务总有绕不开的跨文档时刻：转账要"扣 A 加 B"同时生效；下单要"建订单、扣库存、加积分"要么全成、要么全不成。于是 MongoDB 4.0 在副本集上引入了多文档 ACID 事务，4.2 起扩展到分片集群。本篇依次回答四个问题：会话是什么、事务怎么写、限制在哪里、一致性怎么读。

## 1. 单文档原子性：很多"事务"其实是建模问题

```javascript
// 秒杀扣库存：把"库存"与"购买记录"内嵌在同一文档，一次原子更新搞定
db.getSiblingDB("shop").flashSales.updateOne(
  { sku: "m-001", stock: { $gt: 0 } },                  // 条件更新：还有库存才允许扣减
  {
    $inc: { stock: -1 },                                // 原子扣减 1 件
    $push: { buyers: { user: "userA", at: new Date() } } // 同步记录买家
  }
)
```

**讲解：**

1. `updateOne` 的"条件 + 修改"在服务器端原子执行：即使一百个请求并发扣减，`stock` 最终一定等于初始值减成功次数；条件里有 `stock > 0`，永远不会扣成负数。
2. 这就是"用建模消灭事务"：数据能放进一个文档，就不需要跨文档协调；005 建模篇"内嵌优先"的原则正是为这一节铺路。
3. 边界也很清楚：一旦数据必须跨集合、跨文档（转账的 A 和 B、订单与库存分表存放），单文档原子性就无能为力了，本篇主角登场。

## 2. 会话（Client Session）：事务与因果一致性的载体

```javascript
// 会话：一组操作的"逻辑上下文"，事务与因果一致性都挂在它身上
const session = db.getMongo().startSession({ causalConsistency: true }) // 默认开启

const bankDb = session.getDatabase("bank")
bankDb.accounts.updateOne({ _id: "A" }, { $inc: { balance: 50 } }) // 经过会话写入

session.getOperationTime() // 会话记录的逻辑时间戳，因果序的"书签"

session.endSession()       // 用完必须释放，否则占用会话资源
```

**讲解：**

1. 会话是客户端与服务器共同维护的逻辑上下文：所有多文档事务必须在会话内执行；可重试写、因果一致性等能力也以会话为单位。
2. 因果一致性：会话记住自己最近一次操作产生的 `operationTime`，之后的读会要求目标节点至少复制到这个时间点。效果是"自己写的自己一定读得到"；即使主从切换，读到的数据也不倒退。
3. 没有会话的普通读没有这种保证："写完立刻读"在极端情况下可能读到旧值，因果一致会话正是这类需求的廉价解法。

## 3. 第一个多文档事务（mongosh 实操）

事务需要副本集或分片集群，单机 mongod 不支持多文档事务；环境搭建见第 7 节与 007 的动手部分。

```javascript
use bank

// 准备两个账户
db.accounts.insertMany([
  { _id: "A", name: "小明", balance: 1000 },
  { _id: "B", name: "小红", balance: 500 }
])

// 开启事务：快照读 + 多数派写
const session = db.getMongo().startSession()
session.startTransaction({
  readConcern: { level: "snapshot" },  // 事务内多次读看到同一版本
  writeConcern: { w: "majority" }      // 提交需获得多数派确认，故障切换不丢
})

try {
  const accounts = session.getDatabase("bank").accounts
  accounts.updateOne({ _id: "A" }, { $inc: { balance: -100 } }, { session }) // 每个操作都必须带 session
  accounts.updateOne({ _id: "B" }, { $inc: { balance: 100 } }, { session })

  // 业务校验：余额不允许为负
  const a = accounts.findOne({ _id: "A" }, { session })
  if (a.balance < 0) { throw new Error("余额不足") }

  session.commitTransaction()   // 全部成功才提交
} catch (err) {
  session.abortTransaction()    // 任一步失败，整体回滚
  print("事务已回滚：" + err.message)
} finally {
  session.endSession()          // 释放会话
}
```

**讲解：**

1. `startTransaction` 的两个参数几乎总是这一套：`snapshot` 读 + `majority` 写，在多数派确认的快照上执行、以多数派确认提交。
2. 事务里的每个读写都必须显式传 `{ session }`，漏传等于在事务外操作；事务内的读固定走主节点。
3. 提交之前，其他会话看不到你的任何修改；提交之后，其他会话看到的是"整体生效"——A 少 100 与 B 多 100 不会出现半个状态。
4. `abortTransaction` 之后两个余额原样不动，这就是原子性；另开窗口在提交前后各查一次数据，可直观感受隔离。

## 4. 错误分类与重试：生产级写法

事务有两类典型的"瞬时错误"，处理方式完全不同：

- `TransientTransactionError`：写冲突、主节点切换等，事务没有真正完成，**整体重开**即可。
- `UnknownTransactionCommitResult`：提交结果未知，事务可能已提交，**只重试提交**，不要重开。

```javascript
// mongosh 手写版：帮助理解重试语义
function transfer(fromId, toId, amount) {
  const session = db.getMongo().startSession()
  try {
    let done = false
    while (!done) {
      session.startTransaction({
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" }
      })
      try {
        const accounts = session.getDatabase("bank").accounts
        accounts.updateOne({ _id: fromId }, { $inc: { balance: -amount } }, { session })
        accounts.updateOne({ _id: toId }, { $inc: { balance: amount } }, { session })

        // 提交阶段：结果未知时只重试提交
        while (true) {
          try {
            session.commitTransaction()
            done = true
            break
          } catch (e) {
            if (e.hasErrorLabel && e.hasErrorLabel("UnknownTransactionCommitResult")) {
              print("提交结果未知，重试提交")
              continue
            }
            throw e
          }
        }
      } catch (e) {
        // 事务体阶段的瞬时错误：整体重开事务
        if (e.hasErrorLabel && e.hasErrorLabel("TransientTransactionError")) {
          print("瞬时冲突，重开事务：" + e.message)
          continue
        }
        throw e // 业务错误直接放弃，不重试
      }
    }
  } finally {
    session.endSession() // 未提交的事务会随会话结束自动中止
  }
}
```

**讲解：**

1. 两层循环对应两类错误：内层只重试 `commit`，外层重开整个事务；判断依据是错误对象上的标签，不要按错误码字符串猜。生产代码应优先使用驱动的 `withTransaction`，它自动处理这两类重试。
2. 业务校验抛出的错误没有瞬时标签，直接上抛放弃——重试解决不了"钱不够"。
3. `finally` 里 `endSession()` 兜底释放资源；若事务还在活动中，会话结束会隐式中止它。

## 5. 事务的限制清单：先知道边界再设计

| 限制 | 说明 |
| --- | --- |
| 运行环境 | 必须是副本集或分片集群，单机 mongod 不支持多文档事务 |
| 默认 60 秒 | `transactionLifetimeLimitSeconds` 默认 60，超时自动中止；长事务还会拖累 oplog 与缓存 |
| oplog 16MB | 整个事务提交后作为一条 oplog 记录写入，总大小超 16MB 直接失败，大批量写不要塞进事务 |
| 会话绑定 | 一个会话同一时刻只能有一个活动事务；事务内的读固定走主节点 |
| 集合与索引 | 早期版本不允许在事务内创建集合与索引（4.4 起放开）；实践仍是"提前建好，事务只做读写"，完整限制以官方文档为准 |
| 写冲突 | 两个事务并发修改同一文档会触发 WriteConflict，后者需整体重试；事务范围越小，冲突概率越低 |
| 吞吐成本 | 事务持有锁与快照，吞吐显著低于普通写，能不用就不用 |

决策顺序：**单文档能解决就内嵌；不需要实时强一致就异步对账补偿；真的跨文档强一致才开事务，并且把事务做小、做短。**

## 6. writeConcern 与 readConcern：确定性从哪来

**写关注 writeConcern** 回答"这次写要多稳才算成功"：

```javascript
// 订单写入：多数派确认 + 落 journal + 5 秒超时
db.orders.insertOne(
  { orderNo: "C001", total: 199 },
  { writeConcern: { w: "majority", j: true, wtimeout: 5000 } }
)
```

| writeConcern | 语义 |
| --- | --- |
| `w: 1` | 主节点确认即返回，最快；主节点宕机时最近的写可能丢失 |
| `w: "majority"` | 多数派节点确认，故障切换后已确认的写不会丢 |
| `j: true` + `wtimeout` | 写入磁盘 journal 后才确认，防掉电丢数据；`wtimeout` 是等待确认的超时毫秒数，超时报错而不是无限挂起 |

**读关注 readConcern** 回答"我读到的数据有多可信"：

| readConcern | 语义 |
| --- | --- |
| `local` | 返回本节点可见的最新数据；可能尚未获得多数派确认，故障切换后可能"回滚" |
| `majority` | 只返回已获多数派确认的数据，选举后不会消失 |
| `linearizable` | 线性一致读，最强也最贵；只能配合唯一索引（如 `_id`）的等值查询，且要求对应写使用 majority 写关注 |
| `snapshot` | 一致性快照，事务内默认，保证多次读看到同一版本 |

**组合建议：**

| 场景 | 读 | 写 |
| --- | --- | --- |
| 普通内容浏览 | local（默认） | w: 1 |
| 订单 / 账务 | majority | majority（可加 j: true） |
| 单文档强一致读（如秒杀余量） | linearizable | majority |
| 事务内部 | snapshot（默认） | majority |

写用 `majority`，已提交的写不会因选举丢失；读用 `majority`，读到的版本一定是多数派确认过的——单文档上这就是线性一致的读语义；跨文档的整体一致需要事务 + `snapshot`；"读自己的写"用因果一致会话即可，代价小得多。

## 7. 实战：转账不变量验证

```javascript
use bank

// 1. 准备账户
db.accounts.drop()
db.accounts.insertMany([
  { _id: "A", name: "小明", balance: 1000 },
  { _id: "B", name: "小红", balance: 500 }
])

// 2. 定义不变量：A + B 的总余额恒为 1500
const total = () =>
  db.accounts.aggregate([{ $group: { _id: null, total: { $sum: "$balance" } } }]).toArray()[0].total

// 3. 正常转账 200（复用第 4 节的 transfer 函数）
transfer("A", "B", 200)
print("正常转账后总余额：" + total())   // 1500

// 4. 余额不足的转账：业务失败，分文不动
transfer("A", "B", 5000)
print("失败转账后总余额：" + total())   // 仍是 1500

// 5. 回滚验证：两笔更新都执行了，但提交前模拟下游崩溃
const s = db.getMongo().startSession()
try {
  s.startTransaction({ writeConcern: { w: "majority" } })
  s.getDatabase("bank").accounts.updateOne({ _id: "A" }, { $inc: { balance: -100 } }, { session: s })
  s.getDatabase("bank").accounts.updateOne({ _id: "B" }, { $inc: { balance: 100 } }, { session: s })
  throw new Error("模拟下游服务崩溃")    // 此时尚未提交
} catch (e) {
  s.abortTransaction()                   // 显式回滚
  print("已回滚：" + e.message)
} finally {
  s.endSession()
}

print("回滚后总余额：" + total())        // 仍是 1500
db.accounts.find().sort({ _id: 1 })      // A: 800，B: 700
```

**讲解：**

1. 不变量（总余额恒定）是验证事务正确性最简单的尺子：成功、失败、回滚都不该破坏它。
2. 第 5 步刻意在两笔更新都执行之后才抛错——只要没提交，事务内的写对其他会话完全不可见，abort 后连痕迹都没有。
3. 脚本需在副本集上运行；一条命令即可把单机变成单节点副本集：

```bash
# 单机副本集：一个 mongod 即可练事务
mkdir -p ~/mongo-rs0
mongod --dbpath ~/mongo-rs0 --replSet rs0 --port 27017 --bind_ip 127.0.0.1
```

```javascript
// 另开终端初始化，members 出现 PRIMARY 即可
rs.initiate({ _id: "rs0", members: [ { _id: 0, host: "127.0.0.1:27017" } ] })
```

## 小结与延伸

> 单文档原子性是免费的，多文档事务是收费的；先用建模消灭事务，再用最短的持锁时间使用事务。

收工自查清单：

1. 会话是事务与因果一致性的载体，用完 `endSession()`。
2. 事务默认搭配 `snapshot` 读 + `majority` 写，每个操作显式带 `session`。
3. 两类瞬时错误：`TransientTransactionError` 重开事务，`UnknownTransactionCommitResult` 只重试提交；生产用驱动的 `withTransaction`。
4. 硬限制记三条：默认 60 秒、oplog 记录 16MB、必须副本集环境。
5. 读写的确定性来自 readConcern / writeConcern 的组合，账务类场景用 majority + majority。

延伸阅读：CRUD 前置见 `002-CRUDOperations`；"内嵌优先"建模决策见 `005-SchemaDesignEnterprise`；事务运行环境（副本集与分片）见 007。官方文档关键词：Transactions、Causal Consistency、Read Concern、Write Concern，参数与默认值以官方文档为准。
