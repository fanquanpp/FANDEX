---
order: 100
title: Node.js 驱动集成
module: 'mongodb'
category: 数据库
difficulty: intermediate
description: 从 mongosh 到业务代码：MongoClient 连接与连接池、CRUD 语法对照、事务回调 API、Change Stream、重试写与错误处理，以及与 Mongoose 的分工。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'mongodb/030-MongoDBAggregationPipeline'
  - 'mongodb/050-MongoDBSchemaDesign'
  - 'mongodb/060-MongoDBTransactionSession'
  - 'mongodb/090-MongoDBChangeStreamRealtime'
prerequisites:
  - 'mongodb/020-MongoDBCRUDOperations'
  - 'mongodb/060-MongoDBTransactionSession'
---

## 0. 一句话理解

> mongosh 里敲过的每个 `db.students.find()`，在 Node.js 里原样成立——`MongoClient` 换掉 `mongosh`、`await` 换掉同步回显、BSON 类型换成类，其余全部一样。本篇讲的是"怎么把它安全地搬进业务代码"。

## 前置知识

- [MongoDB 增删改查完整语法](/mongodb/020-MongoDBCRUDOperations)：驱动只是把 mongosh 的语法搬进 JS，先掌握那套语法本篇才有效率。
- [事务与会话](/mongodb/060-MongoDBTransactionSession)：第 5 节的 `withTransaction` 是该篇 mongosh 事务在驱动里的标准形态。
- [Change Stream 实时流](/mongodb/090-MongoDBChangeStreamRealtime)：第 6 节会用到 resume token 的概念。

## 学习目标

1. 能正确创建并复用 `MongoClient`，说出"每请求新建连接"错在哪里。
2. 能把 mongosh 的 CRUD 逐句翻译成驱动调用，包括投影、排序分页与数组更新运算符。
3. 能说清 6.0 起 `findOneAndUpdate` 返回值的版本差异，避免照旧教程写出 `result.value`。
4. 能用 `withTransaction` 回调 API 写出自动提交、自动回滚、自动重试的事务。
5. 能在应用层接住驱动错误：重试写、超时与连接失败各自的处置方式。
6. 能判断一个项目该用原生驱动还是 Mongoose。

## 1. 为什么需要这一篇

前面所有篇章都在 mongosh 里操作数据——它是最好的学习工具，但业务代码不会跑在 shell 里。Node 服务要用官方驱动包 `mongodb` 与数据库通信。版本基线：**npm 上的 `mongodb` 包当前主线是 7.x（写作时实测最新为 7.7.0，用 `npm view mongodb version` 可复核）**，本篇示例兼容 6/7 两代，凡 6.0 起有行为变化处都会标注。

心智模型一句话：驱动就是"可编程的 mongosh"。你在 shell 里写的查询文档、更新运算符、聚合管道数组，在驱动里是同样的数据结构；差异只在三处——操作是异步的（返回 Promise）、BSON 类型是类而不是 shell 里的字面量糖、连接与资源管理要自己负责。前两处是小改，第三处是本篇的重心。

## 2. 连接：一个进程一个 MongoClient

```bash
npm i mongodb
```

```javascript
// db.js：模块级单例，整个进程共享
import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI
// 'mongodb://localhost:27017' 或副本集：
// 'mongodb://localhost:27017,localhost:27018,localhost:27019/?replicaSet=rs0'

export const client = new MongoClient(uri, {
  maxPoolSize: 20,        // 连接池上限，默认 100，小服务调小避免压垮数据库
  serverSelectionTimeoutMS: 5000, // 连不上库的等待上限，默认 30s 太长
})

export const db = client.db('shop')
```

**讲解：**

1. `new MongoClient(uri)` 之后**不需要显式 connect**：5.0 起驱动在第一次操作时自动建立连接，`await client.connect()` 只是想提前暴露连接错误时才需要。
2. 连接池由驱动自动管理：并发请求从池里借连接、用完归还，`maxPoolSize` 之外的请求排队。所以"每个请求 new 一个 MongoClient"是最常见也最昂贵的错误——每个客户端自带独立的池与监控连接，会把数据库的连接数打成请求量，内存与握手开销全部翻倍。
3. URI 里副本集写法把多个节点都列上，主节点切换时驱动自动发现新主，应用无感。这就是 070 篇"副本集是高可用基本单位"在应用侧的样子。
4. serverless（Vercel Functions、云函数）环境下实例频繁冷启动，全局单例要挂在模块作用域并复用全局变量，否则每次冷启动都新建连接池；数据库侧要配置连接数上限更小的 URI 选项（如 `maxPoolSize=5`）。

## 3. CRUD 对照：mongosh 到驱动

驱动方法与 shell 同名同参，差异点逐条标注：

```javascript
import { ObjectId, Decimal128 } from 'mongodb'

// 插入：shell 的 ISODate(...) 在驱动里就是 new Date()
const r = await db.collection('products').insertOne({
  name: '机械键盘',
  price: Decimal128.fromString('199.00'),   // 金额用 Decimal128，见 010 篇 1.0 节
  stock: 20,
  createdAt: new Date(),
})
r.insertedId                                 // ObjectId，主键回执

// 查询：条件、投影、排序、分页全在选项对象里
const list = await db.collection('products')
  .find(
    { price: { $lte: Decimal128.fromString('200') } },          // 条件与 shell 完全一致
    { projection: { name: 1, price: 1 }, sort: { price: -1 } }  // shell 的链式写法改成选项
  )
  .limit(10)
  .toArray()                                   // find 返回游标，toArray 才执行

// 按 _id 查：字符串要先转成 ObjectId
const doc = await db.collection('products').findOne({
  _id: new ObjectId(r.insertedId.toHexString()),
})

// 更新：数组运算符原样可用
await db.collection('carts').updateOne(
  { userId: 'u-9', 'items.sku': 'm-001' },
  { $set: { 'items.$.qty': 3 } }               // 位置运算符写法不变
)
```

**讲解：**

1. **条件文档零翻译**：`{ price: { $gte: ... } }`、`"items.$.qty"`、聚合管道数组，shell 与驱动是同一套 DSL。要新学的只有"选项去哪了"——shell 里 `.sort().skip().limit()` 的链式调用，驱动里放进 `find` 的第二个参数选项对象，链上只剩 `limit/toArray` 这类游标操作。
2. **`_id` 是 ObjectId 不是字符串**：路由参数里的 `"6820..."` 必须先 `new ObjectId(s)` 再查，直接拿字符串查永远 null。这是驱动初学者的第一大坑；顺手 `ObjectId.isValid(s)` 校验能挡掉大半恶意输入。
3. **BSON 类型显式化**：shell 的 `NumberDecimal("199.00")` 在驱动里是 `Decimal128.fromString(...)`；`ISODate(...)` 就是 `new Date()`。010 篇讲过为什么金额必须 Decimal128，这里补上"怎么写"。
4. `insertOne` 的返回值带 `insertedId`、`updateOne` 带匹配数与修改数（`matchedCount/modifiedCount`）——用它们替代"改完再查一遍"的确认习惯，省一次往返。

## 4. findOneAndUpdate 的版本差异：6.0 是分水岭

```javascript
// 驱动 6.0 起：直接返回文档或 null
const claimed = await db.collection('jobs').findOneAndUpdate(
  { status: 'pending' },
  { $set: { status: 'claimed', claimedAt: new Date() } },
  { returnDocument: 'after', sort: { createdAt: 1 } }
)
if (claimed) {
  await process(claimed)   // claimed 就是任务文档本身
}

// 驱动 5.x 及更早：返回 { value: 文档 | null, ok: 1 }
// if (result.value) { ... }   —— 旧教程都是这个写法，6.0 起 value 是 undefined
```

**讲解：**

1. 6.0 移除了 `includeResultMetadata` 选项，`findOneAndUpdate / findOneAndReplace / findOneAndDelete` 一律直接返回文档。网上大量旧教程写 `result.value`，在 6/7 上拿到的是 `undefined`——表现为"抢占永远失败"但不报错，非常隐蔽。
2. 用法不变的场景：取号器、任务抢占、库存原子扣减（条件里带 `stock: { $gte: 1 }`），全部依赖"查询与修改一次原子完成"，返回值拿来直接用。
3. 判断自己项目用哪个版本的行为，看 `package.json` 里 `mongodb` 的主版本号即可；升级到 6+ 时全局搜索 `.value` 是必做工序。

## 5. 事务：withTransaction 回调 API

060 篇在 shell 里手写了 commit/abort；驱动里生产代码用回调 API，它把"提交、出错回滚、瞬态错误重试"全部包好：

```javascript
const session = client.startSession()
try {
  await session.withTransaction(async () => {
    const accounts = db.collection('accounts')
    await accounts.updateOne({ user: 'A' }, { $inc: { balance: -100 } }, { session })
    await accounts.updateOne({ user: 'B' }, { $inc: { balance: 100 } }, { session })
  }, {
    readConcern: { level: 'snapshot' },
    writeConcern: { w: 'majority' },
  })
} finally {
  await session.endSession()
}
```

**讲解：**

1. 回调里抛任何错误，`withTransaction` 自动回滚并重新抛出；瞬态事务错误（TransientTransactionError）自动重试整个回调——所以**回调必须是可重入的**：不要在里面发 HTTP 请求、不要依赖"上一行已经执行过"的外部副作用。
2. `{ session }` 必须显式传给每个操作，漏传的操作不在事务里且不报错——这是事务代码最阴的坑，code review 时专门盯这一处。
3. `readConcern: snapshot` + `writeConcern: majority` 是事务的推荐组合：读一致快照、写多数派确认，配合 060 篇的语义表理解。
4. 依然保留 050 篇的结论：能用单文档原子更新解决的不要开事务，这里给的是"确实需要跨文档"时的标准姿势。

## 6. Change Streams：把 090 篇搬进代码

```javascript
const stream = db.collection('orders').watch([], {
  fullDocument: 'updateLookup',   // update 事件也带上完整文档
})

// resume token 落盘，重启后续听
let resumeToken = loadToken()

async function listen() {
  for await (const change of stream) {
    resumeToken = change._id
    saveToken(resumeToken)
    if (change.operationType === 'insert') {
      await notifyShipping(change.fullDocument)
    }
  }
}

stream.on('error', (err) => {
  // 断流后用保存的 token 重建
  stream.close()
  const again = db.collection('orders').watch([], { resumeAfter: resumeToken })
  /* 重新进入监听循环 */
})
```

**讲解：**

1. `watch()` 返回的 ChangeStream 既是 EventEmitter 又是异步迭代器，业务代码推荐 `for await` 的形态，逻辑是一条直线。
2. `fullDocument: 'updateLookup'` 解决"update 事件默认只带变更字段"的问题——下游通知通常需要完整文档。
3. 生产级监听的铁律与 090 篇一致：**token 先落盘再处理事件**，进程崩溃重启后 `resumeAfter` 续听，不丢事件（在 oplog 窗口内）。驱动报 `ChangeStreamHistoryLost` 说明 token 已超出 oplog 保留窗口，只能全量重建。

## 7. 错误处理与重试写

```javascript
import { MongoServerError } from 'mongodb'

try {
  await db.collection('users').insertOne({ email: 'a@b.c' })
} catch (err) {
  if (err instanceof MongoServerError && err.code === 11000) {
    // 唯一索引冲突：业务冲突，按"已存在"处理而不是报 500
    return { ok: false, reason: 'duplicate' }
  }
  throw err
}
```

**讲解：**

1. 驱动错误分两层：**连接层**（连不上、超时，`MongoServerSelectionError`）与**服务端错误**（`MongoServerError`，带 `code`）。`11000` 重复键是最常需要业务处理的错误——注册接口撞邮箱唯一索引时，它意味着"正常业务分支"。
2. **重试写（retryable writes）默认开启**：URI 不写任何选项时，单文档的写操作在网络抖动时自动重试一次。它依赖"写操作带幂等标识"，所以**只覆盖单文档写**；`updateMany`、事务不在重试范围，需要业务侧自行幂等。
3. 不要把"驱动会重试"理解成"不用处理错误"：重试只在瞬态故障下救场，主从切换的窗口期、数据库整体不可用仍会抛错——服务启动时的连接失败要有进程级兜底（健康检查、启动重试），运行时的服务端错误按错误码分流。
4. 超时治理三件套：`serverSelectionTimeoutMS`（挑服务器的等待）、`socketTimeoutMS`（单次网络读写的等待）、`connectTimeoutMS`（建连等待）。默认值偏宽松，面向用户的服务把 serverSelection 调到 5 秒左右，让"数据库挂了"快速变成可感知的 503 而不是挂起的请求。

## 8. 与 Mongoose 的分工

原生驱动之上还有一层流行的 ODM（Mongoose）。选型不是二选一的站队，而是按项目形态分工：

| 维度 | 原生驱动 `mongodb` | Mongoose |
| --- | --- | --- |
| 定位 | 传输层：把 BSON 通道直接给你 | ODM：Schema 定义、校验、中间件、填充 |
| 学习成本 | 低：mongosh 语法即驱动语法 | 中：多一套 Schema/Model API |
| 灵活性 | 全量 DSL，聚合管道无包装 | 复杂聚合常要 `.aggregate()` 透传 |
| 适合 | 团队已熟 MongoDB、重聚合、要精确控制 | 快速业务开发、字段校验需求重、团队 Mongo 经验浅 |

判断标准一句话：**你需不需要"写入前的结构校验与字段约束"**。需要且团队不熟 MongoDB，Mongoose 的 Schema 是生产护栏；反之原生驱动少一层抽象，报错直达原因。两者混用也可行（校验交给 Mongoose 的 Model，重查询用驱动连接），但同一项目里两套连接管理会互相打架，混用要有明确边界。

## 9. 动手实践

**任务一：连接单例与连通检查。** 写一个 `db.js` 模块，导出共享的 `client` 与 `db`，并提供 `checkConnection()` 函数：执行 `await db.command({ ping: 1 })`，成功返回 true，失败打印错误返回 false。提示：把连接参数收进环境变量，别把 URI 写进代码。

**任务二：发号器服务化。** 把 020 篇任务三的取号器改成驱动版：`nextOrderNo()` 用 `findOneAndUpdate` 实现原子取号，格式 `NO-000001`。写好后再故意把取值改成旧教程的 `doc.value.seq` 跑一次，观察它返回 `NaN` 的静默失败，然后修正。提示：020 篇的实现是 mongosh 版，翻译重点在返回值形态，条件与更新文档原样照搬。

**任务三：带断点的订单监听。** 实现一个最小 Change Stream 监听器：监听 `orders` 集合的 insert 事件，把每条事件的处理逻辑简化为 `console.log`，resume token 存入本地 JSON 文件；手动 kill 进程再重启，验证没有丢事件。提示：`watch()` + `for await` + token 读写函数，照第 6 节的骨架填空。

先自己写，再对照参考实现：

<details>
<summary>任务一参考实现</summary>

```javascript
// db.js
import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017'
export const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 5000,
})
export const db = client.db(process.env.MONGODB_DB ?? 'shop')

export async function checkConnection() {
  try {
    await db.command({ ping: 1 })
    return true
  } catch (err) {
    console.error('MongoDB 连接失败：', err.message)
    return false
  }
}
```

`ping` 是最轻量的连通性探针：它走到服务端并返回，同时验证了"选主、认证、网络"整条链路。服务健康检查端点（`/healthz`）内部就是这一个调用。
</details>

<details>
<summary>任务二参考实现（6/7 语义）</summary>

```javascript
import { db } from './db.js'

export async function nextOrderNo() {
  const doc = await db.collection('counters').findOneAndUpdate(
    { _id: 'order-no' },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true }
  )
  return 'NO-' + String(doc.seq).padStart(6, '0')
}
```

若在 5.x 上运行，`doc` 的形态是 `{ value: { seq: 1, ... }, ok: 1 }`，取号要写 `doc.value.seq`。6.0 起返回文档本身，这就是第 4 节说的分水岭：同一个方法、同一个参数，返回值结构随主版本变化，升级依赖时必须重测这类代码。
</details>

<details>
<summary>任务三参考实现</summary>

```javascript
// listen-orders.mjs
import { readFile, writeFile } from 'node:fs/promises'
import { db } from './db.js'

const TOKEN_FILE = './watch-token.json'

async function loadToken() {
  try {
    const raw = await readFile(TOKEN_FILE, 'utf8')
    return JSON.parse(raw)
  } catch {
    return null   // 首次运行没有 token，从当前时刻开始监听
  }
}

async function saveToken(token) {
  await writeFile(TOKEN_FILE, JSON.stringify(token))
}

const token = await loadToken()
const stream = db.collection('orders').watch(
  [{ $match: { operationType: 'insert' } }],
  token ? { resumeAfter: token } : {}
)

console.log('监听中……')
for await (const change of stream) {
  await saveToken(change._id)          // 先存 token 再处理，崩溃不丢
  console.log('新订单：', change.fullDocument)
}
```

验证方法：启动监听后另开一个终端往 `orders` 插入一条文档，确认日志出现；`Ctrl+C` 杀掉进程再插入一条，重新启动监听——重启后那条"错过的"订单应当出现在日志里，这就是 `resumeAfter` 在续听。
</details>

## 10. 一句话记住

> 一个进程一个 MongoClient，条件文档从 mongosh 原样照搬；`_id` 记得转 ObjectId，6.0 起 `findOneAndUpdate` 直接返回文档；事务用 `withTransaction`、监听用 token 续听、错误按 code 分流。
