---
order: 320
title: MongoDB 概述与五分钟快速上手
module: 'redis'
category: 数据库
difficulty: beginner
description: 零基础第一课：用 Docker 五分钟跑起 MongoDB，理解文档模型并写出第一句增删改查。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'redis/330-MongoDBCRUDOperations'
  - 'redis/360-MongoDBSchemaDesign'
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

## 4. 动手试试

1. 启动容器后，在 `mongosh` 中新建一个 `books` 集合，插入 3 本你喜欢的书（字段：书名、作者、价格）。
2. 用 `find({ 作者: "..." })` 查询其中一本。
3. 用 `updateOne` 把价格加 10，再用 `deleteOne` 删掉一本。
4. 试想：如果用 MySQL 表达"一本书有多个标签"，需要几张表？MongoDB 怎么表达？

## 5. 一句话记住

> MongoDB 把数据当"文档"存：字段随便加、数组随便嵌，先跑起来再设计结构——这是它与 MySQL 最根本的区别。

下一章进入增删改查的完整语法。
