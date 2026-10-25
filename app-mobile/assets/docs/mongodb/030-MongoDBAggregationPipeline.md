---
order: 30
title: MongoDB 聚合管道
module: 'mongodb'
category: 数据库
difficulty: intermediate
description: 用 $match/$group/$sort/$project 等管道阶段完成分组、统计、拆数组等复杂查询，替代 SQL 的 GROUP BY。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'mongodb/020-MongoDBCRUDOperations'
  - 'mongodb/040-MongoDBIndexPerformance'
  - 'sql/040-DataQueryBasics'
prerequisites:
  - 'mongodb/020-MongoDBCRUDOperations'
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
- `$group` 本身是内存哈希，索引帮不上它，但给分组键建索引能让它前面的 `$match`/`$sort` 走索引，间接提速；按唯一键去重的 `$group` 还可能被优化成 DISTINCT_SCAN；
- 聚合结果很大时加 `$limit`，或用 `allowDiskUse: true` 允许磁盘临时文件（默认内存上限 100MB，超出直接报错）。

"把 `$match` 放前面"为什么值得单独强调？因为 MongoDB 的查询优化器会做**管道折叠**：开头的 `$match` + `$sort` 如果能命中索引，会被合并成一个带排序条件的索引扫描（IXSCAN），剩下的阶段处理的是已经排好序、数量已缩小的流。而 `$group` 一旦执行，输出就变成"每组一条"的新流，后面的 `$match` 只能内存过滤。也就是说，管道顺序不只影响"处理多少条"，还影响"能不能用上索引"——顺序错了不是慢一点，是慢一个引擎。写完聚合可以跑 `db.collection.explain("executionStats").aggregate([...])` 看每个阶段的 `totalDocsExamined`，用它验证优化有没有生效。

## 7.1 $facet：一次扫描，多路统计

统计仪表盘常有一个需求：对同一批数据同时算"总数、按分类计数、价格分布"。朴素写法要发三次 `aggregate`，数据扫描三遍。`$facet` 把多个子管道并列接在同一个输入流上，一次扫描各自输出：

```javascript
// 商品列表页的侧栏：总数、分类分布、价格区间，一次聚合全出
db.products.aggregate([
  { $match: { status: "onSale" } },
  {
    $facet: {
      total: [{ $count: "value" }],
      byCategory: [
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ],
      priceBuckets: [
        { $bucket: { groupBy: "$price", boundaries: [0, 100, 300, 1000], default: "1000+" } }
      ]
    }
  }
])
// 输出：[{ total: [{value: 42}], byCategory: [...], priceBuckets: [...] }]
```

**讲解：**

1. `$facet` 的每个字段是一条独立子管道，共享上游的 `$match` 结果；三条统计一次扫描完成，替代三次独立查询。
2. `$bucket` 是分组统计的区间版：按 `groupBy` 表达式的值落入 `boundaries` 划定的区间（左闭右开），落不进任何区间的进 `default`。
3. 适用边界：`$facet` 的子管道都在内存里跑，输入量很大时同样受 100MB 限制——它适合"已过滤的中等数据集"做仪表盘，不适合对全表大集合直接统计。

## 8. 动手实践

**任务一：学生排行榜。** 往 `scores` 里再插入几条数据，统计"每个学生的两科总分"，按总分降序输出前 3 名。提示：`$project` 或 `$addFields` 生成总分，再 `$sort` + `$limit`；注意"$group 的 `_id` 可以是 `$student`"。

**任务二：班级成绩画像。** 统计每个班级的英语最高分（`$max`）、最低分（`$min`）与及格人数（条件计数）。提示：条件计数没有现成累加器，用 `$sum` 配合 `$cond` 表达式——`{ $sum: { $cond: [{ $gte: ["$english", 60] }, 1, 0] } }`。

**任务三：最热课程。** 用 `$unwind + $group` 统计 `courses` 数组里出现次数最多的课程；再升级成 `$facet` 版本：一次聚合同时输出"总学生数"与"课程热度榜前 3"。

先自己写，再对照参考实现：

<details>
<summary>任务一与任务二参考实现</summary>

```javascript
// 补充数据
db.scores.insertMany([
  { student: "小张", class: "A班", math: 58, english: 66 },
  { student: "小王", class: "C班", math: 95, english: 91 },
  { student: "小赵", class: "C班", math: 62, english: 55 }
])

// 任务一：每人总分，取前 3
db.scores.aggregate([
  {
    $group: {
      _id: "$student",
      total: { $sum: { $add: ["$math", "$english"] } }
    }
  },
  { $sort: { total: -1 } },
  { $limit: 3 }
])
// 把 $add 放进 $sum 里可以省掉一个 $project 阶段，管道越短越好

// 任务二：班级画像（max/min + 条件计数）
db.scores.aggregate([
  {
    $group: {
      _id: "$class",
      maxEnglish: { $max: "$english" },
      minEnglish: { $min: "$english" },
      passedCount: {
        $sum: { $cond: [{ $gte: ["$english", 60] }, 1, 0] }
      }
    }
  },
  { $sort: { _id: 1 } }
])
```
</details>

<details>
<summary>任务三参考实现</summary>

```javascript
// 准备：students 集合带 courses 数组
db.students.deleteMany({})
db.students.insertMany([
  { name: "小明", courses: ["数学", "英语", "物理"] },
  { name: "小红", courses: ["数学", "物理"] },
  { name: "小刚", courses: ["英语", "化学"] },
  { name: "小丽", courses: ["数学", "化学", "物理"] }
])

// 基础版：拆数组 -> 按课程计数 -> 取第一
db.students.aggregate([
  { $unwind: "$courses" },
  { $group: { _id: "$courses", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 1 }
])

// $facet 版：一次扫描同时出总人数与热度榜
db.students.aggregate([
  {
    $facet: {
      totalStudents: [{ $count: "value" }],
      topCourses: [
        { $unwind: "$courses" },
        { $group: { _id: "$courses", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 3 }
      ]
    }
  }
])
```

`$unwind` 在 `$facet` 子管道里同样可用：每个子管道拿到的都是上游的完整文档流，可以各自拆、各自组。这就是 $facet 与"发三次查询"的本质区别——三份逻辑共享一次数据传输。
</details>


## 9. 一句话记住

> 聚合 = 管道里串过滤、分组、投影、排序；`$match` 尽量放最前，`$group` 的 `_id` 决定"按什么分组"。
