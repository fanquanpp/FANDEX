---
order: 40
title: MongoDB 索引与查询性能
module: 'mongodb'
category: 数据库
difficulty: intermediate
description: 从一次慢查询排查出发：explain 三种模式与 COLLSCAN/IXSCAN 判读、ESR 复合索引法则、覆盖查询、partial/TTL 索引与索引代价实测。
author: fanquanpp
updated: '2026-09-18'
related:
  - 'mongodb/020-MongoDBCRUDOperations'
  - 'mongodb/030-MongoDBAggregationPipeline'
  - 'mysql/400-IndexPrinciplePerformanceOptimization'
prerequisites:
  - 'mongodb/020-MongoDBCRUDOperations'
---

## 1. 场景：首页查询从 5ms 变 2s

商品集合上线半年攒了 10 万条文档，运营反馈后台「按分类筛商品」越来越慢。
你的排查路径应该是固定的：先看查询计划（explain），再决定建不建索引。
本文把这条路径完整走一遍，你以后遇到慢查询照抄即可。

准备实验数据（mongosh 里跑，约 10 秒）：

```javascript
use shop
const cats = ["phone", "laptop", "audio", "wearable"]
const docs = []
for (let i = 0; i < 100000; i++) {
  docs.push({
    name: "item-" + i,
    category: cats[i % 4],
    price: Math.floor(Math.random() * 9000) + 100,
    stock: Math.floor(Math.random() * 200),
    createdAt: new Date()
  })
}
// 分批插入，避免一次 10 万条超限
for (let i = 0; i < docs.length; i += 10000) {
  db.items.insertMany(docs.slice(i, i + 10000))
}
db.items.countDocuments()   // 100000
```

## 2. explain：先诊断，再开药

### 2.1 三种模式

```javascript
// 只看选择什么计划（最快，生产可用）
db.items.find({ category: "phone" }).explain("queryPlanner")

// 真正执行并统计扫描量（本文主力）
db.items.find({ category: "phone" }).explain("executionStats")

// 对比所有候选计划（调优疑难杂症时用）
db.items.find({ category: "phone" }).explain("allPlansExecution")
```

### 2.2 没有索引时，重点读三个字段

```javascript
db.items.find({ category: "phone" }).explain("executionStats")
```

（输出截取，中文注释为解读）

```javascript
{
  executionStats: {
    nReturned: 25000,          // 返回 2.5 万条
    totalKeysExamined: 0,      // 摸过 0 次索引——没索引可摸
    totalDocsExamined: 100000, // 翻看了全部 10 万条文档
    executionTimeMillis: 58
  },
  queryPlanner: {
    winningPlan: { stage: "COLLSCAN" }   // 全表扫描，红色警报
  }
}
```

三个数字就是体检报告：**nReturned / totalDocsExamined** 的比值越接近
1 越健康（查 1 条翻 1 条）；`COLLSCAN` 意味着全集合逐条翻，数据量再涨
十倍，耗时也涨十倍。

### 2.3 建索引后再看一次

```javascript
db.items.createIndex({ category: 1 })

db.items.find({ category: "phone" }).explain("executionStats")
```

```javascript
{
  executionStats: {
    nReturned: 25000,
    totalKeysExamined: 25000,   // 沿索引定位了 2.5 万次
    totalDocsExamined: 25000,   // 只回表取了需要的文档
    executionTimeMillis: 21
  },
  queryPlanner: {
    winningPlan: {
      stage: "FETCH",                     // 回表取文档
      inputStage: { stage: "IXSCAN",      // 索引扫描
        indexName: "category_1" }
    }
  }
}
```

`COLLSCAN` 变成 `IXSCAN`，翻看的文档数从 10 万降到 2.5 万。这就是索引
的全部秘密：**B 树目录 + 按需回表**。

## 3. 复合索引与 ESR 法则

真实查询往往「按分类筛 + 只看在售 + 按价格排」。此时单字段索引不够，
需要复合索引，而字段顺序有一套官方口诀：**ESR（等值 Equality →
排序 Sort → 范围 Range）**。

```javascript
// 查询模板：等值 category，排序 price，范围过滤 stock
db.items.find({ category: "phone", stock: { $gt: 0 } }).sort({ price: -1 })

// 按 ESR 顺序建复合索引（E: category，S: price，R: stock）
db.items.createIndex({ category: 1, price: -1, stock: 1 })
```

用 explain 验证：`winningPlan` 里应出现 `IXSCAN`，且 **不再出现
`SORT_STAGE`（内存排序）**——排序字段在索引里已经有序，直接沿索引
倒着读即可。

为什么顺序是 ESR？B 树索引本质是「按字段顺序排好的字典」：等值条件
把搜索范围锁定到字典的一小段；这一段里次序字段（price）天然有序，
排序可以免掉；范围条件放在最后，因为一旦进入范围扫描，后面字段的
有序性就不复存在了。「要返回的字段」不参与排序——那是覆盖查询的事
（见第 4 节）。顺序错了，前两步就废了。前缀规则同时成立：`{ category, price }` 索引可以服务
「只按 category 查」，但服务不了「只按 price 查」——跳过前导字段
等于查一本没分类的字典。

## 4. 覆盖查询：连回表都省掉

如果查询要的字段全在索引里，MongoDB 可以只读索引不碰文档：

```javascript
// 索引 { category: 1, price: 1 } 覆盖了这个查询
db.items.find(
  { category: "phone" },
  { _id: 0, price: 1 }        // 显式排除 _id，否则它不在索引里
).explain("executionStats")
```

判读标志：`winningPlan` 出现 `PROJECTION_COVERED`，且
`totalDocsExamined: 0`。高频的列表页、下拉选项类查询值得按覆盖
查询来设计索引（把 SELECT 的字段一起放进索引），代价是索引变大。

## 5. 特殊索引：partial、TTL、唯一

```javascript
// 部分索引（partial）：只为满足条件的文档建索引，比稀疏索引更可控
db.items.createIndex(
  { price: 1 },
  { partialFilterExpression: { stock: { $gt: 0 } } }
)
// 只有「在售」文档进索引；查询必须带相同条件才会用到它

// TTL 索引：过期自动删文档（会话、验证码、临时令牌）
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 })

// 唯一索引：天然防重，配合 partial 解决「多文档字段缺失」冲突
db.users.createIndex(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $exists: true } } }
)
```

三个使用要点：

1. **partial 是 sparse 的现代替代**：sparse 只看「字段是否存在」，
   partial 可以表达任意条件（状态为 active、时间在近 30 天等），
   新代码一律用 partial；
2. **TTL 不是精确倒计时**：后台任务约每 60 秒巡检一次，过期文档的
   实际删除有分钟级延迟，别用它做秒级精确过期；
3. **TTL 删除就是真删除**：字段值必须是 BSON 日期类型（或日期数组），
   存字符串不会过期。

## 6. 哪些查询用不上索引

拿着 explain 逐条对号入座，这些写法会退化成 COLLSCAN 或大范围扫描：

```javascript
// 1. 非锚定正则：找不到索引前缀
db.items.find({ name: /item/ })          // 全扫；/^item/ 才能走索引

// 2. $ne / $nin：语义是「除它之外的一大片」
db.items.find({ category: { $ne: "phone" } })

// 3. 对索引字段做运算后再比较
db.items.find({ $expr: { $gt: ["$price", "$stock"] } })   // 有 $price 索引也难用

// 4. 隐式类型不匹配：price 存的是字符串 "100"，查数字 100 不走索引
db.items.find({ price: "100" })
```

排序也有暗坑：`sort` 的字段若没有任何索引覆盖，MongoDB 会在内存排序，
超过内存限制（默认 100MB）直接报错。线上大集合的 `find().sort()`
必须能被索引尾段满足。

## 7. 索引的代价：不是越多越好

每个索引都是一棵要随写入同步维护的 B 树。做一组感受实验：

```javascript
// 记录无额外索引时的插入耗时
const t0 = Date.now()
for (let i = 0; i < 10000; i++) {
  db.bench.insertOne({ a: i, b: i, c: i, d: i })
}
Date.now() - t0        // 记下数字，比如 900

// 建 3 个索引后重跑（先清空）
db.bench.drop()
db.bench.createIndex({ a: 1 })
db.bench.createIndex({ b: 1 })
db.bench.createIndex({ c: 1 })
const t1 = Date.now()
for (let i = 0; i < 10000; i++) {
  db.bench.insertOne({ a: i, b: i, c: i, d: i })
}
Date.now() - t1        // 明显变慢，每次插入要维护 4 棵树
```

取舍原则（自查清单）：

1. 查询条件字段、排序字段 → 建索引；
2. 区分度低的字段（如布尔值、性别）→ 单独建几乎无用，可考虑放
   复合索引的 E 位置；
3. 几乎不查的字段 → 不建；
4. 写入密集的集合 → 用 `$indexStats` 看使用率，`accesses.ops` 长期为
   0 的索引直接删；
5. 建索引过程本身会锁集合资源，大集合用**滚动重建**（副本集逐节点
   建）或在低峰执行，MongoDB 4.2+ 的索引构建已不再全程阻塞读写。

## 8. 动手试试

1. 用第 1 节的脚本造 10 万条数据，复现 2.2 与 2.3 的两次 explain，
   把 `totalDocsExamined` 和 `executionTimeMillis` 填进你的笔记。
2. 为「按 category 等值 + price 排序 + 只返回 name」设计最优索引并
   验证覆盖查询（目标：`totalDocsExamined: 0`）。
3. 故意写三条用不上索引的查询（非锚定正则、$ne、类型不匹配），逐一
   用 explain 证实 COLLSCAN。
4. 给 `createdAt` 建 `expireAfterSeconds: 5` 的 TTL 索引，插入一条
   文档，观察它在大约何时消失，验证「60 秒巡检」的说法。

## 9. 一句话记住

> 慢查询先跑 `explain("executionStats")`：看到 `COLLSCAN` 或
> `totalDocsExamined` 远大于 `nReturned` 就建索引；复合索引按
> ESR 排字段顺序；索引服务查询，但每一次写入都在为它付息。

下一步：《MongoDB 建模设计》从「怎么组织文档」的源头减少对复杂索引
的依赖；《聚合管道》里的 `$match`/`$sort` 同样受本文规则约束。
