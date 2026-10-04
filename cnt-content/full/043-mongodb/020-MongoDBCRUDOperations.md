---
order: 20
title: MongoDB 增删改查完整语法
module: 'mongodb'
category: 数据库
difficulty: beginner
description: insert/find/update/delete 四类操作的完整语法、常用查询运算符与实战示例拆解。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'mongodb/010-MongoDBOverviewQuickStart'
  - 'mongodb/030-MongoDBAggregationPipeline'
  - 'mongodb/040-MongoDBIndexPerformance'
prerequisites:
  - 'mongodb/010-MongoDBOverviewQuickStart'
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
2. 正则 `/^小/` 匹配以"小"开头的字符串。带 `^` 锚定且大小写敏感的正则可以利用字段索引前缀；一旦写成 `/小/`（不锚定）或忽略大小写（`i` 选项），就只能全集合扫描，数据量大时慎用。

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

### 3.1 数组更新运算符：文档模型的主战场

标量字段的更新就 `$set`/`$inc` 两个高频运算符，真正需要专门学习的是**数组**——因为文档模型把一对多关系放进数组，"往购物车加一件商品""从标签里去掉一个关键词"都是数组更新。核心运算符按用途分三组：

```javascript
// 第一组：增删元素
db.carts.updateOne(
  { userId: "u-1" },
  { $push: { items: { sku: "m-001", qty: 1 } } }   // 尾部追加
)
db.carts.updateOne(
  { userId: "u-1" },
  { $pull: { items: { sku: "m-001" } } }           // 删除所有匹配元素
)
db.tags.updateOne(
  { _id: "t-1" },
  { $addToSet: { names: "sale" } }                 // 去重追加：已存在则不动
)

// 第二组：按位置改元素
db.carts.updateOne(
  { userId: "u-1", "items.sku": "m-001" },
  { $set: { "items.$.qty": 3 } }                   // $ 指向"查询条件匹配到的那个元素"
)

// 第三组：修剪数组本身
db.carts.updateOne(
  { userId: "u-1" },
  { $push: { logs: { $each: ["a", "b"], $slice: -10 } } } // 追加后只保留最后 10 条
)
```

**讲解：**

1. `$push` 与 `$addToSet` 的区别是**要不要去重**：日志、购物车允许重复用 `$push`；标签、收藏集合语义用 `$addToSet`。选错的表现是"列表里出现重复元素"且查不出原因。
2. 位置运算符 `$` 必须与查询条件配合：查询条件 `"items.sku": "m-001"` 定位到数组里的某个元素后，`items.$.qty` 就指向那个元素的 `qty`。没有查询条件就写 `items.$` 是运行时错误。
3. `$slice` 配合 `$each` 可以做**定长队列**（最近 N 条操作日志），比"读出来裁剪再写回去"安全得多——那条路径在并发下会丢更新，而 `$push + $slice` 是单文档原子操作。
4. 底层视角：这些运算符之所以重要，是因为它们都是**单文档原子**的。两个请求同时 `$push` 同一数组不会互相覆盖；但"读出数组、在应用里改完、整份 `$set` 写回"的写法会丢失其中一个请求的修改——并发修改数组时永远优先用运算符，不要用"读-改-写"。

### 3.2 upsert：查不到就插入

```javascript
// 更新或插入：没有 u-1 的购物车就先建一条
db.carts.updateOne(
  { userId: "u-1" },
  { $push: { items: { sku: "m-001", qty: 1 } }, $setOnInsert: { createdAt: new Date() } },
  { upsert: true }
)
```

**讲解：**

1. 第三个参数 `{ upsert: true }` 让更新操作在"零条匹配"时自动转为插入，查询条件成为新文档的字段来源。
2. `$setOnInsert` 里的字段**只在插入时生效**，更新时不覆盖——`createdAt` 这类"创建时间"字段的标准写法。
3. 典型场景：计数器（`$inc` + upsert，键不存在就从 0 开始加）、购物车、用户配置项。"先 find 判断再决定 insert 还是 update"的写法在并发下会插入重复文档，upsert 是服务端原子完成的，天然免竞态。

### 3.3 findOneAndUpdate：改完顺手拿回来

```javascript
// 原子取号：把计数器加 1，并拿回新值
const r = db.counters.findOneAndUpdate(
  { _id: "order-no" },
  { $inc: { seq: 1 } },
  { returnDocument: "after", upsert: true }
)
print("订单号：NO-" + String(r.seq).padStart(6, "0"))
```

**讲解：**

1. `updateOne` 的返回值只告诉你"改了几条"，不返回文档内容；`findOneAndUpdate` 执行更新并返回文档。
2. `returnDocument: "after"` 返回更新后的值（默认是更新前）。取号、发号器、任务队列的"抢占一条任务"（`findOneAndUpdate` + 条件 `{ status: "pending" }` + `$set: { status: "claimed" }`）都靠它实现——**查询与修改在一次原子操作里完成**，这是它存在的全部理由。


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

## 6. 动手实践

**任务一：商品集合 CRUD。** 建 `products` 集合，批量插入 5 个商品（名称、分类、价格、库存）；查询价格在 50-200 之间、按价格降序、只显示名称与价格；把所有库存为 0 的商品价格打 8 折；删除"分类为配件"的商品前先数一数有多少条。提示：折扣用 `$mul`，删除前的计数用 `countDocuments`——先数再删是生产习惯。

**任务二：并发安全的购物车。** 为用户 `u-9` 实现三步操作：往购物车 `$push` 两件商品、用位置运算符把其中一件的 `qty` 改成 3、把数组裁剪成"最多保留 5 条日志"的定长 `logs` 字段。完成后插入第二条相同商品，观察 `$push` 与 `$addToSet` 的结果差异。提示：位置运算符 `$` 必须搭配查询条件里对数组元素的匹配。

**任务三：取号器。** 用 `counters` 集合实现"订单号发号器"：每次调用号数加 1 并返回新值，格式化成 `NO-000001`。要求整个过程原子，两个并发请求拿到不同号。提示：`findOneAndUpdate` + `$inc` + `returnDocument: "after"` + upsert 四件套。

先自己写，再对照参考实现：

<details>
<summary>任务一参考实现</summary>

```javascript
db.products.insertMany([
  { name: "机械键盘", category: "外设", price: 199, stock: 20 },
  { name: "无线鼠标", category: "外设", price: 99, stock: 0 },
  { name: "显示器支架", category: "配件", price: 129, stock: 15 },
  { name: "USB 集线器", category: "配件", price: 59, stock: 0 },
  { name: "电竞耳机", category: "外设", price: 349, stock: 8 }
])

// 范围 + 排序 + 投影一次写全
db.products.find(
  { price: { $gte: 50, $lte: 200 } },
  { name: 1, price: 1, _id: 0 }
).sort({ price: -1 })

// 打 8 折：$mul 是乘法运算符
db.products.updateMany(
  { stock: 0 },
  { $mul: { price: 0.8 } }
)

// 先数再删
db.products.countDocuments({ category: "配件" })   // 例如返回 2
db.products.deleteMany({ category: "配件" })
```

注意 `$gte: 50, $lte: 200` 写在同一个条件对象里是"区间与"语义；拆成两个并列字段对象也一样，但不能拆成两个 `{ price: ... }` 键重复——JSON 对象同名键会互相覆盖。
</details>

<details>
<summary>任务二与任务三参考实现</summary>

```javascript
// 任务二：购物车
db.carts.updateOne(
  { userId: "u-9" },
  {
    $push: {
      items: { $each: [{ sku: "m-001", qty: 1 }, { sku: "k-002", qty: 1 }] },
      logs: { $each: ["add m-001", "add k-002"], $slice: -5 }
    }
  },
  { upsert: true }
)

// 位置运算符：查询条件定位元素，items.$ 指向它
db.carts.updateOne(
  { userId: "u-9", "items.sku": "m-001" },
  { $set: { "items.$.qty": 3 } }
)

// 去重对比：再 push 一次会出现两条 m-001；addToSet 则只有一条
db.carts.updateOne(
  { userId: "u-9" },
  { $addToSet: { items: { sku: "m-001", qty: 1 } } }
)

// 任务三：发号器（原子、并发安全）
function nextOrderNo() {
  const r = db.counters.findOneAndUpdate(
    { _id: "order-no" },
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true }
  )
  return "NO-" + String(r.seq).padStart(6, "0")
}
nextOrderNo() // NO-000001
nextOrderNo() // NO-000002
```

任务三的关键在"查询与修改同一瞬间完成"：两个并发调用各自触发一次 `$inc`，MongoDB 对同一文档的写操作串行执行，因此两个号必然不同——换成"先 find 再 update 再加一"的三步写法，并发下两个请求会读到同一个旧值。
</details>


## 7. 一句话记住

> 条件一律写 JSON：`{ 字段: 值 }` 是等值，`{ 字段: { $gt: 值 } }` 是比较；改数据记得先查一遍，`updateOne/deleteOne` 只动第一条。
