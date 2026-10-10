---
order: 60
title: MongoDB 数据建模与企业落地
module: 'mongodb'
category: 数据库
difficulty: intermediate
description: 内嵌与引用怎么选、读写路径驱动建模的心智模型、常用建模模式与反模式、副本集高可用与事务取舍，从示例项目到生产部署。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'mongodb/010-MongoDBOverviewQuickStart'
  - 'mongodb/040-MongoDBIndexPerformance'
  - 'mongodb/060-MongoDBTransactionSession'
prerequisites:
  - 'mongodb/030-MongoDBAggregationPipeline'
---

## 0. 一句话理解

> 建模的核心只有一道选择题：这条数据是"和父文档一起读"还是"独立存在、被多处引用"？前者内嵌，后者引用——选错是 MongoDB 项目最常见的性能事故来源。

## 0.1 心智模型转变：从"实体关系"到"读写路径"

从关系型数据库转过来的开发者，第一反应往往是"先画 ER 图，再翻译成集合"。这条路在 MongoDB 上会反复碰壁，因为两者回答的是不同的问题：

- 关系建模问的是"**数据是什么**"：实体、关系、范式，目标是消除冗余；
- 文档建模问的是"**数据怎么被用**"：哪些字段总是一起读、多久更新一次、会不会无限增长，目标是让最高频的读写路径一次命中。

同一个业务，两种建模可以都"对"：订单明细在关系库里是独立表（第三范式），在 MongoDB 里是订单文档的内嵌数组（一起读一起写）。判断标准不是教科书范式，而是**读写比与增长曲线**：

1. **一起读、一起写、数量有界**：内嵌。订单与其条目是典型。
2. **被多方共享、独立生命周期**：引用。商品、用户这类主数据。
3. **无限增长**：绝不全量内嵌。评论、日志要么独立集合，要么用子集模式只内嵌"最近 N 条"。

动手建模前，先给每个业务页面列一张"读写路径表"：这个页面读什么、写什么、每秒多少次、数据增长多快。建模决策从这张表里推出来，而不是从直觉里推出来——这也是本篇末尾练习的第一个任务。

## 1. 内嵌（Embedding）

```javascript
// 内嵌：订单直接包含地址，读订单时一次拿到全部
db.orders.insertOne({
  orderNo: "A001",
  user: "小明",
  items: [
    { sku: "m-001", name: "鼠标", price: 99, qty: 2 },
    { sku: "k-002", name: "键盘", price: 299, qty: 1 }
  ],
  total: 497
})
```

**讲解：**

1. 订单条目与订单几乎总是"一起读、一起写"，内嵌让一次查询拿到整份订单，不需要 JOIN。
2. 数组大小有上限（单文档 16MB），购物车、订单明细这类有限条目非常适合内嵌。
3. 内嵌的代价：条目更新必须走整份文档的更新，且无法单独查询"所有订单里的鼠标"（需要聚合 `$unwind`）。

关于 16MB 上限，要知道它不只是"存不下"的问题：文档越接近上限，读写与传输的成本越高，WiredTiger 对大文档的缓存效率也越差。工程上更实用的自设红线是**单个内嵌数组不超过几百个元素、整份文档不超过几百 KB**——远在引擎上限之前，性能就已经开始劣化。数组还会"只进不出"地增长：今天的购物车 3 件商品，三个月后老用户的历史购物车可能上千件，设计时要按**最坏情况**而不是平均值留余量。

## 2. 引用（Referencing）

```javascript
// 商品被所有订单共享，独立成集合，订单里只存 _id 或冗余快照
db.products.insertOne({ _id: "m-001", name: "鼠标", price: 99 })

db.orders.insertOne({
  orderNo: "A002",
  user: "小红",
  items: [{ productId: "m-001", name: "鼠标", price: 99, qty: 1 }]
})
```

**讲解：**

1. 商品是"主数据"，被成千上万订单引用，必须独立集合；订单条目里既存 `productId`，也冗余存 `name/price` 快照。
2. 快照的意义：商品改名、涨价不影响历史订单展示；这是"读时一致性"的工程取舍。
3. 需要跨集合组合数据时用 `$lookup`，但高频查询路径应尽量通过冗余设计避免 `$lookup`。

引用的额外代价是**应用层要自己维护"引用完整性"**：MongoDB 没有外键约束，删掉一个被引用的商品不会报错，只会留下悬空引用。工程惯例是"软删除"（给商品加 `deletedAt` 字段而不是物理删除），既保留了历史订单的语义完整性，也让"恢复"成为可能——这与 060 篇讲的"能用建模解决的就别开事务"是同一个思想。

## 3. 选择决策表

| 场景 | 推荐 |
| --- | --- |
| 订单 + 明细，一起读一起写 | 内嵌 |
| 用户 + 地址簿，地址独立管理 | 引用（或内嵌数组，看规模） |
| 商品 + 订单，共享主数据 | 引用 + 快照 |
| 评论 + 文章，评论无限增长 | 引用（文章内嵌最近 3 条 + 评论集合） |
| 日志、事件流 | 独立集合 + TTL 索引 |
| 标签、分类 | 内嵌数组 |

## 4. 常用建模模式

以下模式来自 MongoDB 官方《Building with Patterns》方法论，按使用频率整理。每个模式都对应一个"痛点 -> 解法"的对子，遇到同样的痛点直接套用。

1. **子集模式（Subset）**：文章详情页内嵌"最近评论"，完整评论放独立集合，兼顾速度与无限增长。痛点是"父文档高频读、子数据无限长"。
2. **桶模式（Bucket）**：物联网传感器按"每小时一条桶文档"聚合 60 条采样，减少文档数量与索引体积。痛点是"海量小文档"，桶把它们合并成少量大文档：

   ```javascript
   // 桶模式：一小时一条，而不是一分钟一条
   db.sensor_readings.insertOne({
     sensorId: "s-42",
     hour: ISODate("2026-10-05T14:00:00Z"),
     samples: [
       { t: 0, temp: 23.1 }, { t: 1, temp: 23.3 } /* 每分钟一条，最多 60 */
     ],
     avgTemp: 23.2
   })
   ```

3. **版本字段模式（Schema Versioning）**：文档加 `schemaVersion` 字段，未来结构变更时按版本迁移。MongoDB 是无模式（schema-flexible）的，但**无模式不等于没有模式**——应用代码期望的字段结构就是事实上的模式；发布新版本后线上会同时存在新旧两种形状的文档，读取侧按 `schemaVersion` 分支处理，后台任务逐步迁移，避免"停机改表"。
4. **扩展引用模式（Extended Reference）**：把引用字段（如作者名）冗余到文档里，避免高频 `$lookup`。适用于"冗余字段低频变更"的场景；如果被冗余字段经常改，同步成本会反过来吃掉收益。
5. **离群值模式（Outlier）**：先按常规建模（如"文章内嵌最近 50 条评论"），再为极少数超量文档（爆款文章 10 万条评论）单独处理——文档上加 `hasOverflowComments` 标记，读取侧检测到标记时改查评论集合。它解决的是"95% 的文档符合假设，剩下 5% 拖垮整体"的问题。
6. **计算模式（Computed）**：把聚合结果（如订单总数、平均评分）在写入时算好存进文档，读取时直接返回。痛点是"每次读都要对大集合做聚合"，代价是每次写入多做一次计算——适合读多写少的统计字段。

这些模式不是互斥的：一篇"作者热门文章列表"可以同时用到子集（最近评论）、扩展引用（作者名）、计算（点赞数）三种模式。模式的组合本身就是设计。

## 4.1 反模式清单：建模事故的四个常见来源

1. **无限增长的数组（Massive Arrays）**：把评论、日志、粉丝列表全量内嵌进父文档。症状是文档越来越大、更新越来越慢，最终逼近 16MB 直接写失败。处方：子集模式或独立集合。
2. **无处不在的 `$lookup`**：把关系库的 JOIN 习惯平移过来，列表页动辄三四个 `$lookup`。`$lookup` 在分片集群上代价更高。处方：扩展引用 + 快照，让高频路径单集合完成。
3. **文档当行用（一行一文档、永不聚合）**：传感器每分钟插一条文档，一亿条小文档把索引和内存拖垮。处方：桶模式。
4. **把 MongoDB 当关系库建模**：每个实体一个集合、全部靠 `$lookup` 关联、用事务保证跨集合一致。事务能用但昂贵。处方：回到读写路径表，重新审视哪些"关系"其实可以内嵌。

反模式有一个共同根源：**没有先画读写路径表就开始建集合**。建模评审时最值钱的一个问题就是"这个页面怎么读这份数据"。

## 5. 生产落地：副本集与事务

```yaml
# docker-compose.yml 片段：一主两从副本集
services:
  mongo-primary:
    image: mongo:8.3
    command: ["mongod", "--replSet", "rs0"]
  mongo-secondary-1:
    image: mongo:8.3
    command: ["mongod", "--replSet", "rs0"]
  mongo-secondary-2:
    image: mongo:8.3
    command: ["mongod", "--replSet", "rs0"]
```

**讲解：**

1. 副本集是 MongoDB 高可用的基本单位：主节点写、从节点同步，主节点故障时自动选举新主。
2. 生产环境至少要一主两从（3 个数据副本），单机 `mongod` 只适合学习。
3. MongoDB 4.0+ 支持多文档事务，但事务有性能成本；能用单文档原子更新解决的（`$inc`、`$set` 本身就是原子的）就不要开事务。

```javascript
// 事务示例：转账（需要副本集环境）
const session = db.getMongo().startSession()
session.startTransaction()
try {
  session.getDatabase("bank").accounts.updateOne(
    { user: "A" }, { $inc: { balance: -100 } }, { session }
  )
  session.getDatabase("bank").accounts.updateOne(
    { user: "B" }, { $inc: { balance: 100 } }, { session }
  )
  session.commitTransaction()
} catch (err) {
  session.abortTransaction()
  throw err
} finally {
  session.endSession()
}
```

**讲解：**

1. `startSession()` 创建会话，`startTransaction()` 开启事务；所有读写都要显式传 `{ session }`，否则不在事务内。
2. 全部成功 `commitTransaction()` 提交；任何一步抛错 `abortTransaction()` 回滚，保证 A 扣钱与 B 加钱同时生效或同时取消。
3. `finally` 里 `endSession()` 释放会话资源，防止连接泄漏。

建模与事务的关系值得单独强调：**好的建模能让你根本不需要事务**。转账场景之所以经典，是因为它真的需要跨文档原子性；而"下单扣库存"这类场景，把库存数与订单条目设计进同一份文档（或用 `$inc` 的原子条件更新 `query: { stock: { $gte: 1 } }`），单文档原子性就够用。事务是建模失败后的补救手段，不是默认选项。

## 6. 动手实践

**任务一：为博客建模。** 需求：文章（标题、正文、作者）、作者（名字、简介）、评论（会无限增长）、文章列表页要显示"作者名 + 最近 3 条评论 + 点赞数"。要求：写出集合结构（可以画 JSON 草图），说明每个字段为什么内嵌或引用，并用到了第 4 节的哪几个模式。提示：列表页的读取路径决定一切，先写"读写路径表"再动手。

**任务二：验证 16MB 不是玩笑。** 写一个循环脚本往单条文档的数组里 `push` 一百万个小元素，观察什么时候报错（或性能何时崩塌）。提示：用 `updateOne` + `$push` 逐批追加，别一次构造超大文档。

**任务三：跑通转账事务。** 用 Docker 起一个三节点副本集（或官方文档的单机副本集初始化），执行第 5 节的转账脚本，然后在第二步故意抛错，验证回滚。

先自己写，再对照下面的参考实现：

<details>
<summary>任务一参考实现：博客模型</summary>

```javascript
// authors：主数据，独立集合（被所有文章引用）
db.authors.insertOne({
  _id: "author-001",
  name: "林晚",
  bio: "写数据库教程的人"
})

// articles：扩展引用（作者名快照）+ 计算模式（likeCount）+ 子集模式（最近评论）
db.articles.insertOne({
  _id: "a-100",
  title: "MongoDB 建模入门",
  content: "……长文正文……",
  // 扩展引用：列表页高频显示作者名，冗余快照避免 $lookup
  author: { id: "author-001", name: "林晚" },
  // 计算模式：点赞数在写入时维护，列表页零聚合
  likeCount: 128,
  // 子集模式：只内嵌最近 3 条，完整评论进 comments 集合
  recentComments: [
    { userId: "u-1", text: "写得清楚", at: ISODate("2026-10-01T10:00:00Z") }
  ],
  hasMoreComments: true,
  schemaVersion: 1
})

// comments：无限增长，独立集合 + TTL 不适用（评论要长期保留），
// 用复合索引支撑"按文章取最新 N 条"
db.comments.createIndex({ articleId: 1, at: -1 })
db.comments.insertOne({
  articleId: "a-100",
  userId: "u-2",
  text: "子集模式学到了",
  at: ISODate("2026-10-02T09:30:00Z")
})
```

要点复盘：三个模式各自服务一个具体读取路径（列表页要作者名、点赞数、最近评论），缺一个字段列表页就要多一次 `$lookup` 或一次聚合；`schemaVersion` 从第一版就加上，迁移成本几乎为零。
</details>

<details>
<summary>任务二参考实现：逼近文档上限</summary>

```javascript
// mongosh 中执行：逐批向同一条文档追加小元素
const docId = (() => {
  const r = db.overflow_test.insertOne({ items: [] })
  return r.insertedId
})()

try {
  for (let batch = 0; batch < 1000; batch++) {
    const items = Array.from({ length: 1000 }, (_, i) => ({ i, s: "x".repeat(16) }))
    db.overflow_test.updateOne({ _id: docId }, { $push: { items: { $each: items } } })
  }
} catch (e) {
  print("报错点：", e.message) // 临近 16MB 时报 BSONObjectTooLarge 或写入失败
}
db.overflow_test.drop()
```

预期现象：数组到几十万元素时，即使还没到 16MB，每次 `$push` 也明显变慢——因为更新要在内存中重写整份文档。这验证了"自设红线远早于引擎上限"的结论。
</details>

## 7. 一句话记住

> 一起读一起写的就内嵌，被共享、被独立管理的就引用；高频路径用快照换速度，跨文档强一致才开事务。建模前先写读写路径表，建模后用模式清单对照检查。
