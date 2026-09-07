---
order: 340
title: MongoDB 索引与查询性能
module: 'redis'
category: 数据库
difficulty: intermediate
description: 单字段/复合/唯一/稀疏索引的创建与选择，用 explain 读懂查询计划，避免全表扫描。
author: fanquanpp
updated: '2026-08-03'
related:
  - 'redis/032-CRUDOperations'
  - 'redis/033-AggregationPipeline'
  - 'mysql/065-IndexPrinciplePerformanceOptimization'
prerequisites:
  - 'redis/032-CRUDOperations'
---

## 0. 一句话理解

> 索引就是数据库给字段做的"目录"：没有目录就一页页翻（全表扫描），有了目录就能直接翻到目标页。索引让查询变快，但每次写入都要维护目录，所以不能乱建。

## 1. 查看与创建索引

```javascript
// 查看现有索引
db.students.getIndexes()

// 给 age 建普通索引（1 升序，-1 降序，对等值查询无区别）
db.students.createIndex({ age: 1 })

// 唯一索引：name 不允许重复
db.students.createIndex({ name: 1 }, { unique: true })

// 复合索引：先按 class，再按 age
db.students.createIndex({ class: 1, age: -1 })
```

**讲解：**

1. `getIndexes()` 会看到默认的 `_id` 索引——主键索引由 MongoDB 自动创建。
2. `createIndex({ age: 1 })` 的 `1/-1` 只影响排序方向，等值查询两种都能用。
3. `unique: true` 用来保证字段唯一，插入重复值会报错，适合用户名、订单号。
4. 复合索引的字段顺序很重要：`{ class: 1, age: -1 }` 能服务"按班级查"和"按班级+年龄查"，但单独按年龄查用不上它。

## 2. 用 explain 读查询计划

```javascript
db.students.find({ age: { $gt: 18 } }).explain("executionStats")
```

**讲解：**

1. `explain("executionStats")` 返回查询计划，重点看三个字段：
   - `winningPlan.stage`：`COLLSCAN` 表示全表扫描，`IXSCAN` 表示走了索引；
   - `totalDocsExamined`：实际翻看了多少条文档，越接近返回条数越好；
   - `executionTimeMillis`：本次查询耗时。
2. 练习：给 `age` 建索引前后各 explain 一次，对比 `COLLSCAN` 与 `IXSCAN` 的 `totalDocsExamined`。

## 3. 索引的代价与取舍

| 情况 | 建议 |
| --- | --- |
| 查询条件字段 | 建索引 |
| 排序字段 | 建索引（避免内存排序） |
| 区分度低的字段（如性别） | 不建索引，扫描率太高 |
| 几乎不查的字段 | 不建索引 |
| 写入密集的集合 | 控制索引数量，写入时每条索引都要更新 |
| 超大文本字段 | 用文本索引（`text`）而非普通索引 |

```javascript
// 稀疏索引：只为存在该字段的文档建索引
db.students.createIndex({ phone: 1 }, { sparse: true })

// TTL 索引：字段超过 3600 秒自动删除文档（日志、会话场景）
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 })
```

**讲解：**

1. `sparse: true` 适合"很多文档没有这个字段"的情况，减少索引体积。
2. `expireAfterSeconds` 是 MongoDB 的定时过期机制，后台约每 60 秒清理一次，适合验证码、临时会话。

## 4. 查询性能自查清单

1. 先用 `explain` 确认是否 `COLLSCAN`；
2. 检查查询条件与排序是否被同一个复合索引覆盖；
3. 避免对索引字段使用 `$where`、正则前缀以外的表达式；
4. 大结果集用游标分批处理，不要一次 `find({})` 全量拉取；
5. 生产环境用 MongoDB Compass 的索引建议或 `$indexStats` 观察索引使用率。

## 5. 动手试试

1. 造 10 万条测试数据（可用 `insertMany` + 循环），对比 `age` 有/无索引时的查询耗时。
2. 给 `{ class: 1, age: -1 }` 建复合索引，测试三种查询：只按 class、按 class+age、只按 age，观察哪个没走索引。
3. 给订单集合加 TTL 索引，插入一条 `createdAt` 为过去时间的文档，等待清理（可把 `expireAfterSeconds` 设小）。

## 6. 一句话记住

> 查询慢先跑 `explain`：看到 `COLLSCAN` 就建索引；索引不是越多越好，查询多、区分度高的字段才值得建。
