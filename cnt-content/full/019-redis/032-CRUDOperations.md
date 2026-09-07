---
order: 320
title: MongoDB 增删改查完整语法
module: 'redis'
category: 数据库
difficulty: beginner
description: insert/find/update/delete 四类操作的完整语法、常用查询运算符与实战示例拆解。
author: fanquanpp
updated: '2026-08-03'
related:
  - 'redis/031-MongoDBOverviewQuickStart'
  - 'redis/033-AggregationPipeline'
  - 'redis/034-IndexPerformance'
prerequisites:
  - 'redis/031-MongoDBOverviewQuickStart'
---

## 0. 一句话理解

> MongoDB 的增删改查就是四个动词：`insert` 加、`find` 查、`update` 改、`delete` 删；查询和修改条件都写成 JSON 文档。

## 1. 插入：insertOne 与 insertMany

```javascript
db.students.insertOne({
  name: "小红",
  age: 17,
  scores: { math: 92, english: 88 }
})

db.students.insertMany([
  { name: "小刚", age: 18, scores: { math: 70, english: 75 } },
  { name: "小丽", age: 19, scores: { math: 85, english: 95 } }
])
```

**讲解：**

1. `insertOne` 插入单条；`insertMany` 接收数组批量插入，比循环单条插入快一个数量级。
2. `scores` 字段内嵌了数学和英语成绩，属于典型的"整份对象一起读写"设计。
3. 批量插入时若某条违反唯一索引约束，默认整批失败；传 `{ ordered: false }` 可以让成功的继续、只报告失败的那条。

## 2. 查询：find 与查询运算符

### 2.1 基础查询

```javascript
// 查所有
db.students.find({})

// 等值查询
db.students.find({ age: 18 })

// 投影：只要 name 和 age，_id 默认保留
db.students.find({ age: 18 }, { name: 1, age: 1 })
```

**讲解：**

1. `find({})` 的空对象表示"无条件"，等价于 SQL 的 `SELECT *`。
2. 第二个参数是投影：`1` 表示要的字段，`0` 表示不要的字段（`_id: 0` 可去掉主键）。

### 2.2 比较运算符

```javascript
// age 大于 17：$gt 大于、$gte 大于等于、$lt 小于、$lte 小于等于
db.students.find({ age: { $gt: 17 } })

// age 在 17 到 19 之间（含边界）
db.students.find({ age: { $gte: 17, $lte: 19 } })

// name 在指定数组中
db.students.find({ name: { $in: ["小红", "小刚"] } })

// 逻辑组合：age > 18 且 math 成绩 >= 90
db.students.find({
  age: { $gt: 18 },
  "scores.math": { $gte: 90 }
})
```

**讲解：**

1. `$gt/$gte/$lt/$lte` 对应 `>`、`>=`、`<`、`<=`，是查询条件里最常见的四个运算符。
2. `$in` 相当于 SQL 的 `IN (...)`。
3. 嵌套字段用**点路径** `"scores.math"` 访问，注意键名必须加引号，因为包含点号。
4. 多个条件写在同一对象里表示"并且"（AND）。

### 2.3 数组与正则

```javascript
// courses 数组包含 "数学"
db.students.find({ courses: "数学" })

// name 以 "小" 开头（正则查询）
db.students.find({ name: /^小/ })
```

**讲解：**

1. 数组字段直接写值，表示"包含该元素"，这是文档模型非常实用的特性。
2. 正则 `/^小/` 匹配以"小"开头的字符串；正则查询无法利用普通索引前缀，数据量大时慎用。

## 3. 更新：updateOne / updateMany / replaceOne

```javascript
// 修改第一条匹配的文档：把 age 加 1（$inc 自增）
db.students.updateOne(
  { name: "小红" },
  { $inc: { age: 1 } }
)

// 批量修改：所有 18 岁及以上的学生，标记 adult: true
db.students.updateMany(
  { age: { $gte: 18 } },
  { $set: { adult: true } }
)

// 整个文档替换（保留 _id）
db.students.replaceOne(
  { name: "小刚" },
  { name: "小刚", age: 20, remark: "已毕业" }
)
```

**讲解：**

1. `$set` 只新增/修改指定字段，`$inc` 做原子自增，`$unset` 删除字段。
2. `updateOne` 只更新第一条匹配；需要更新全部匹配时用 `updateMany`，这两个名字最容易写混。
3. `replaceOne` 用新文档整体替换旧文档（`_id` 不变），适合"整份重写"场景；忘记写上的字段会被丢掉。
4. 更新操作的第二个参数必须以 `$` 运算符开头（如 `$set`），直接写 `{ age: 19 }` 是语法错误。

## 4. 删除：deleteOne / deleteMany

```javascript
// 删除第一条匹配
db.students.deleteOne({ name: "小丽" })

// 删除所有 age 小于 18 的学生
db.students.deleteMany({ age: { $lt: 18 } })

// 清空集合（保留集合本身）
db.students.deleteMany({})
```

**讲解：**

1. `deleteOne({})` 会删掉"第一条"文档，而 `deleteMany({})` 会清空整个集合——企业环境里误执行后者是常见事故，操作前务必先用 `find` 确认条件。
2. 想连集合一起删掉，使用 `db.students.drop()`。

## 5. 排序、分页与计数

```javascript
// 按 age 降序，再按 name 升序
db.students.find({}).sort({ age: -1, name: 1 })

// 跳过前 2 条，取 5 条（第 3 页，每页 5 条）
db.students.find({}).sort({ age: -1 }).skip(10).limit(5)

// 计数
db.students.countDocuments({ age: { $gte: 18 } })
```

**讲解：**

1. `sort` 中 `1` 升序、`-1` 降序，多字段按书写顺序依次比较。
2. `skip + limit` 是经典分页写法；数据量极大时深分页性能差，可改用"上一页最后一条的 _id"做游标分页。
3. `countDocuments` 是推荐计数方法，`count()` 已废弃。

## 6. 动手试试

1. 建一个 `products` 集合，批量插入 5 个商品（字段：名称、分类、价格、库存）。
2. 查询价格在 50-200 之间的商品，按价格降序排列，只显示名称和价格。
3. 把所有库存为 0 的商品价格打 8 折（`$mul` 运算符）。
4. 删除"分类为配件"的所有商品，删除前先数一数有多少条。

## 7. 一句话记住

> 条件一律写 JSON：`{ 字段: 值 }` 是等值，`{ 字段: { $gt: 值 } }` 是比较；改数据记得先查一遍，`updateOne/deleteOne` 只动第一条。
