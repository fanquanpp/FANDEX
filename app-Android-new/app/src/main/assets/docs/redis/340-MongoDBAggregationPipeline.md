---
order: 340
title: MongoDB 聚合管道
module: 'redis'
category: 数据库
difficulty: intermediate
description: 用 $match/$group/$sort/$project 等管道阶段完成分组、统计、拆数组等复杂查询，替代 SQL 的 GROUP BY。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'redis/330-MongoDBCRUDOperations'
  - 'redis/350-MongoDBIndexPerformance'
  - 'sql/040-DataQueryBasics'
prerequisites:
  - 'redis/330-MongoDBCRUDOperations'
---

## 0. 一句话理解

> 聚合管道就是把数据处理拆成一个个"管道阶段"，数据像水一样流过去：先过滤、再分组、再排序、再取字段——每个阶段只做一件事。

## 1. 为什么需要聚合管道

SQL 里一句 `GROUP BY` 就能统计，文档模型没有这个语法，所以 MongoDB 提供 `aggregate()`。它的参数是一个数组，数组里的每个元素就是一个"处理站"。

## 2. 第一个聚合：按班级统计平均分

先准备数据：

```javascript
db.scores.insertMany([
  { student: "小明", class: "A班", math: 92, english: 88 },
  { student: "小红", class: "A班", math: 85, english: 95 },
  { student: "小刚", class: "B班", math: 70, english: 75 },
  { student: "小丽", class: "B班", math: 90, english: 82 }
])
```

然后执行：

```javascript
db.scores.aggregate([
  { $match: { math: { $gte: 80 } } },
  {
    $group: {
      _id: "$class",
      avgMath: { $avg: "$math" },
      total: { $sum: 1 }
    }
  },
  { $sort: { avgMath: -1 } }
])
```

**讲解：**

1. `$match` 是"过滤器"：只留下 math 大于等于 80 的文档，越早过滤数据越少，后续阶段越快。
2. `$group` 是"分组统计"：`_id: "$class"` 表示按班级分组（`$字段名` 表示取该字段的值）；`$avg: "$math"` 求数学平均分；`$sum: 1` 每来一条加 1，就是计数。
3. `$sort` 按平均分降序输出。
4. 输出结果形如：`[{ _id: "A班", avgMath: 88.5, total: 2 }, ...]`。

## 3. 常用管道阶段速查

| 阶段 | 作用 | 类似 SQL |
| --- | --- | --- |
| `$match` | 过滤文档 | WHERE |
| `$project` | 选择/生成字段 | SELECT |
| `$group` | 分组聚合 | GROUP BY |
| `$sort` | 排序 | ORDER BY |
| `$limit` / `$skip` | 分页 | LIMIT / OFFSET |
| `$unwind` | 把数组拆成多行 | 展开一对多 |
| `$lookup` | 跨集合关联 | LEFT JOIN |
| `$addFields` | 新增计算字段 | 计算列 |

## 4. 实战一：$project 计算字段

```javascript
db.scores.aggregate([
  {
    $project: {
      student: 1,
      class: 1,
      total: { $add: ["$math", "$english"] },
      pass: { $gte: ["$math", 60] }
    }
  }
])
```

**讲解：**

1. `$project` 控制输出字段：`1` 表示保留，不写则丢弃（`_id` 默认保留）。
2. `$add` 是算术表达式，把数学和英语相加生成 `total` 字段。
3. `$gte` 比较表达式返回布尔值，生成 `pass` 字段——聚合表达式里运算符都写成数组形式 `[参数1, 参数2]`。

## 5. 实战二：$unwind 拆数组

```javascript
db.orders.insertOne({
  orderNo: "A001",
  items: ["鼠标", "键盘", "显示器"]
})

db.orders.aggregate([
  { $unwind: "$items" },
  { $group: { _id: "$items", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

**讲解：**

1. `$unwind: "$items"` 把一条含 3 个元素的订单拆成 3 条记录，每条含一个 `items` 值。
2. 拆开后再 `$group` 按商品名统计，就能得到"哪个商品被买得多"。
3. 如果数组字段不存在或为空，`$unwind` 默认丢弃该文档；传 `{ preserveNullAndEmptyArrays: true }` 可保留。

## 6. 实战三：$lookup 跨集合关联

```javascript
db.authors.insertOne({ _id: 1, name: "张三" })
db.books.insertMany([
  { title: "书一", authorId: 1 },
  { title: "书二", authorId: 1 }
])

db.books.aggregate([
  {
    $lookup: {
      from: "authors",
      localField: "authorId",
      foreignField: "_id",
      as: "author"
    }
  }
])
```

**讲解：**

1. `from` 是要关联的集合名，`localField` 是本集合的关联字段，`foreignField` 是对方集合的关联字段。
2. 结果会在每条书文档上多出一个 `author` 数组（匹配到多条时数组里有多个元素）。
3. `$lookup` 相当于 LEFT JOIN，但性能开销较大；查询频繁的一对多关系优先考虑"内嵌"而不是关联。

## 7. 性能注意事项

- 尽量把 `$match` 放在最前面，先缩小数据量再分组；
- `$lookup` 的关联字段要建索引；
- 分组字段（`$group` 的 `_id`）建索引也能显著提速；
- 聚合结果很大时加 `$limit`，或用 `allowDiskUse: true` 允许磁盘临时文件。

## 8. 动手试试

1. 往 `scores` 里再插入几条数据，统计"每个学生的两科总分"，按总分降序输出前 3 名。
2. 统计每个班级的英语最高分（`$max`）与最低分（`$min`）。
3. 用 `$unwind + $group` 统计 `courses` 数组里出现次数最多的课程。

## 9. 一句话记住

> 聚合 = 管道里串过滤、分组、投影、排序；`$match` 尽量放最前，`$group` 的 `_id` 决定"按什么分组"。
