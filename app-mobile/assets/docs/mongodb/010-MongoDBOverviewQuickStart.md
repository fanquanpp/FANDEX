---
order: 10
title: MongoDB 概述与五分钟快速上手
module: 'mongodb'
category: 数据库
difficulty: beginner
description: 零基础第一课：用 Docker 五分钟跑起 MongoDB，理解文档模型并写出第一句增删改查。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'mongodb/020-MongoDBCRUDOperations'
  - 'mongodb/050-MongoDBSchemaDesign'
  - 'sql/020-OverviewStandard'
prerequisites:
  - 'sql/020-OverviewStandard'
---

## 0. 五分钟跑起 MongoDB（先读这里）

> 学习目标：不管懂不懂概念，先让 MongoDB 跑起来，并插入、查询到第一条数据。

一句话理解：**MongoDB 是"存文档"的数据库——每条数据是一个 JSON 风格的文档，像一张张可以随意增减字段的卡片，而不是必须对齐列名的表格。**

### 0.1 用 Docker 启动（30 秒）

先确认本机已安装 Docker（各操作系统安装步骤见 `shell` 模块的开发环境配置实战篇），然后执行：

```bash
docker run -d --name mongo-dev -p 27017:27017 mongo:8.3
docker exec -it mongo-dev mongosh
```

**讲解：**

1. `docker run -d`：后台启动一个名为 `mongo-dev` 的容器；`-p 27017:27017` 把容器内的 MongoDB 端口映射到本机，方便本地工具连接。
2. `docker exec -it mongo-dev mongosh`：进入容器并打开官方命令行客户端 `mongosh`，此时你已经连上了数据库。
3. 看到 `test>` 提示符即表示成功。MongoDB 默认连接到名为 `test` 的数据库。

### 0.2 第一句增删改查（2 分钟）

在 `mongosh` 里逐行执行：

```javascript
use school

db.students.insertOne({
  name: "小明",
  age: 18,
  courses: ["数学", "英语"]
})

db.students.find({ name: "小明" })

db.students.updateOne(
  { name: "小明" },
  { $set: { age: 19 } }
)

db.students.deleteOne({ name: "小明" })
```

**讲解：**

1. `use school`：切换到（不存在则创建）名为 `school` 的数据库。
2. `db.students.insertOne({...})`：往 `students` 集合里插入一条文档。集合可以理解为"表"，文档可以理解为"行"，但字段不需要预先定义。
3. `find({ name: "小明" })`：按条件查询，参数是一个 JSON 文档，表示"name 等于 小明"。
4. `updateOne(条件, {$set: 新值})`：只更新第一条匹配的文档，`$set` 只修改指定字段，不影响其他字段。
5. `deleteOne(条件)`：删除第一条匹配的文档。
6. 观察：`courses` 直接存了一个数组，不需要建第三张关联表——这是文档模型与关系模型的第一个直观差异。

## 1. MongoDB 是什么

MongoDB 是一个开源的 **NoSQL 文档数据库**，由 MongoDB 公司开发，2009 年发布。它把数据存成 **BSON**（二进制 JSON），支持嵌套对象与数组，天然适合内容、用户、物联网等数据结构多变、读写频繁的场景。

### 1.0 BSON 与 JSON：不是一回事

入门材料常说"MongoDB 存 JSON"，这个说法省略了关键差异。BSON 是 JSON 的二进制超集：**JSON 只有字符串、数字、布尔、null 四种标量，BSON 多出了十几种真实类型**。这些差异不是理论细节，会直接改变你写代码的方式：

| 数据 | JSON 里的尴尬 | BSON 的表达 |
| --- | --- | --- |
| 主键标识 | 只能存字符串，全局唯一要自己做 | `ObjectId`：12 字节，含时间戳，天生有序 |
| 时间 | 字符串 `"2026-10-05"`，无法按时间范围索引计算 | `Date`：64 位毫秒时间戳，可直接比较与聚合 |
| 金额 | 浮点数 `0.1 + 0.2 !== 0.3` | `Decimal128`：精确十进制，账务场景必用 |
| 二进制（图片、文件） | Base64 膨胀 33% | `BinData`：原生二进制 |

心智模型：**把 BSON 当"带类型系统的 JSON"**。在 mongosh 里你写的是 JavaScript 风格的字面量，但 `ISODate(...)`、`ObjectId(...)`、`NumberDecimal("99.00")` 这些构造器就是在显式声明 BSON 类型。最常见的入门坑是把日期存成字符串——当时查询没报错，等要做"最近 30 天"的范围查询时才发现字符串比较与日期比较是两套语义。金额同理，电商库存与价格一律用 `NumberDecimal`，浮点误差在账务上是事故。

### 1.1 与关系型数据库的对比

| 维度 | MySQL / PostgreSQL | MongoDB |
| --- | --- | --- |
| 数据单位 | 表（table）、行（row）、列（column） | 集合（collection）、文档（document）、字段（field） |
| 结构 | 建表前必须定死列 | 文档字段可动态增减 |
| 关联 | 外键 + JOIN | 内嵌或引用，聚合管道实现类似能力 |
| 事务 | ACID 完整 | 4.0 起支持多文档事务 |
| 横向扩展 | 主从/分库分表，成本较高 | 原生分片（sharding），自动路由 |
| 适用场景 | 强一致、复杂报表、金融账务 | 快速迭代、高写入、数据结构多变 |

### 1.2 当前版本现状（2026-08）

- MongoDB 8.3 为当前稳定版（2026-05 发布）；8.0/8.2 处于维护期，7.0 已接近支持尾声。
- 企业部署优先使用官方维护的 LTS 节奏版本，配合 `mongod` 副本集（Replica Set）保证高可用。
- 配套工具：`mongosh` 命令行、MongoDB Compass 图形客户端、官方各语言驱动。

## 2. 核心概念三件套

1. **数据库（Database）**：一个服务下可以有多个数据库，类似 MySQL 的 schema。
2. **集合（Collection）**：一组文档的容器，类似"表"，但不需要定义结构。
3. **文档（Document）**：一条数据，就是一个 JSON 对象，`_id` 字段是默认主键（可自动生成）。

```javascript
// 文档示例：_id 由 MongoDB 自动生成，其余字段按需增减
{
  _id: ObjectId("65f1a2b3c4d5e6f7a8b9c0d1"),
  name: "小明",
  age: 18,
  address: { city: "上海", district: "浦东" },   // 嵌套对象
  courses: ["数学", "英语"],                     // 数组
  createdAt: ISODate("2026-08-03T00:00:00Z")
}
```

**讲解：**

1. `_id` 是主键字段，插入时省略会自动生成 24 位十六进制的 `ObjectId`，保证全局唯一。
2. `address` 是嵌套对象：关系型数据库往往要拆成两张表再加外键，文档模型直接内嵌。
3. `courses` 是数组：一对多关系最自然的表达方式。

## 3. 什么时候该用 MongoDB

适合：

- 数据结构频繁变化（产品原型期、配置类数据）；
- 高写入量、海量日志、物联网时序类数据；
- 内容系统（文章、评论树）、用户画像、购物车等"整份对象读写"场景；
- 需要水平分片扩展读写的场景。

不适合：

- 强事务、多表复杂 JOIN 的财务账务系统；
- 列结构极其稳定、报表高度依赖 SQL 聚合的场景（此时 PostgreSQL 更合适）。

## 4. 动手实践

**任务一：建一个图书集合。** 在 `mongosh` 中新建 `books` 集合，插入 3 本你喜欢的书。要求：价格字段必须用 `NumberDecimal` 声明，出版日期用 `ISODate`，并给其中一本加一个嵌套的 `publisher` 对象与一个 `tags` 数组。提示：回顾 1.0 节的类型表，想一想为什么"价格"是本文最该用 Decimal128 的字段。

**任务二：类型实验。** 插入两条文档，一条把日期存成字符串 `"2026-01-01"`，一条用 `ISODate("2026-01-01")`，然后执行 `find({ createdAt: { $gte: ISODate("2026-06-01") } })`，观察只有哪种文档能被正确筛出。提示：字符串比较与日期比较在同一个查询里不会互相转换。

**任务三：表达一对多。** 不查资料，先自己回答：如果用 MySQL 表达"一本书有多个标签"，需要几张表？然后写一句 MongoDB 的插入语句表达同一件事，对比两者的语句数。

先自己写，再对照参考实现：

<details>
<summary>任务一与任务三参考实现</summary>

```javascript
use library

// 价格用 Decimal128，出版日期用 Date，出版社内嵌对象，标签用数组
db.books.insertMany([
  {
    title: "深入浅出 MongoDB",
    author: "林晚",
    price: NumberDecimal("89.00"),
    publishedAt: ISODate("2025-03-15"),
    publisher: { name: "码上出版社", city: "上海" },
    tags: ["数据库", "NoSQL", "后端"]
  },
  {
    title: "JSON 与 BSON",
    author: "陈默",
    price: NumberDecimal("45.50"),
    publishedAt: ISODate("2024-11-02"),
    tags: ["数据格式"]
  },
  {
    title: "五分钟学会建模",
    author: "林晚",
    price: NumberDecimal("32.00"),
    publishedAt: ISODate("2026-01-20"),
    tags: ["建模", "数据库"]
  }
])

// 按作者查询
db.books.find({ author: "林晚" })

// 价格 +10：$inc 对 Decimal128 同样适用且保持精度
db.books.updateOne({ title: "JSON 与 BSON" }, { $inc: { price: NumberDecimal("10") } })

// 删除一本
db.books.deleteOne({ title: "五分钟学会建模" })
```

任务三的答案：MySQL 需要"书表 + 标签表 + 书标签中间表"三张表与两条 JOIN；MongoDB 一条文档里的 `tags` 数组就表达了全部关系——这是一对多关系在两种模型里表达成本差异的最直观样本。
</details>


## 5. 一句话记住

> MongoDB 把数据当"文档"存：字段随便加、数组随便嵌，先跑起来再设计结构——这是它与 MySQL 最根本的区别。

下一章进入增删改查的完整语法。
