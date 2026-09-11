---
order: 360
title: MongoDB 数据建模与企业落地
module: 'redis'
category: 数据库
difficulty: intermediate
description: 内嵌与引用怎么选、常见建模模式、副本集高可用与事务取舍，从示例项目到生产部署。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'redis/320-MongoDBOverviewQuickStart'
  - 'redis/350-MongoDBIndexPerformance'
prerequisites:
  - 'redis/340-MongoDBAggregationPipeline'
---

## 0. 一句话理解

> 建模的核心只有一道选择题：这条数据是"和父文档一起读"还是"独立存在、被多处引用"？前者内嵌，后者引用——选错是 MongoDB 项目最常见的性能事故来源。

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

1. **子集模式**：文章详情页内嵌"最近评论"，完整评论放独立集合，兼顾速度与无限增长。
2. **桶模式**：物联网传感器按"每小时一条桶文档"聚合 60 条采样，减少文档数量与索引体积。
3. **版本字段模式**：文档加 `schemaVersion` 字段，未来结构变更时按版本迁移。
4. **扩展引用模式**：把引用字段（如作者名）冗余到文档里，避免高频 `$lookup`。

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

## 6. 动手试试

1. 设计一个"博客"模型：文章、作者、评论。用内嵌还是引用？写出来并说明理由。
2. 用 Docker 起一个三节点副本集（或使用官方文档的单机副本集初始化），执行上面的转账事务。
3. 为你的模型写一份"读写路径表"：每个页面读哪些集合、需要几次查询。

## 7. 一句话记住

> 一起读一起写的就内嵌，被共享、被独立管理的就引用；高频路径用快照换速度，跨文档强一致才开事务。
