---
order: 10
title: 数据库是什么：零基础认识数据的世界
module: 'sql'
category: 数据库
difficulty: beginner
description: 面向零基础读者建立数据库、表、SQL 的心智模型，并写出第一条查询语句。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'sql/002-OverviewStandard'
  - 'sql/003-SQLFirstSteps'
prerequisites:
  - 'getting-started/002-WhatIsProgramming'
---

## 为什么程序都需要数据库

用变量存数据有个致命问题：**程序一关，数据就没了**（变量在内存里，断电即失）。真实应用的用户账号、订单、文章，必须存到一个"断电不丢、可并发读写、能快速检索"的地方——这就是**数据库**。

把数据库想象成一个智能 Excel：里面有很多张**表（table）**，每张表像一张表格——列是字段（如用户表的姓名、邮箱），行是一条条记录。但数据库远比 Excel 强大：百万行级检索毫秒返回、事务保证数据不乱、多用户同时读写不冲突。

## SQL：与数据库对话的语言

SQL（Structured Query Language，结构化查询语言）是操作关系型数据库的标准语言。它最大的特点是**声明式**：你描述"要什么"，不需要写"怎么拿"。

```sql
-- 从用户表里找出所有北京的用户，按注册时间倒序
SELECT name, email FROM users
WHERE city = '北京'
ORDER BY registered_at DESC;
```

一行读法：从 `users` 表（FROM）选出姓名与邮箱（SELECT），条件是城市为北京（WHERE），按注册时间倒序排列（ORDER BY）。**没有循环、没有变量管理，四五个关键词就是一次完整的查询。**

## SQL 语言的四大家族

| 类别 | 关键词 | 用途 |
| --- | --- | --- |
| DQL 查询 | SELECT | 检索数据（日常使用占八成） |
| DML 操作 | INSERT、UPDATE、DELETE | 增、改、删数据 |
| DDL 定义 | CREATE、ALTER、DROP | 建表、改结构 |
| DCL 控制 | GRANT、REVOKE | 权限管理 |

本仓库的 `sql` 模块讲通用标准语法，`mysql`、`postgresql` 模块讲两款主流数据库的实战特性——学完标准再看方言，事半功倍。

## 动手环节：不用安装就能跑 SQL

打开浏览器访问在线 SQL 练习环境（搜索 SQLite Online 或 SQL Fiddle），建一张练习表：

```sql
CREATE TABLE students (
  id INTEGER,
  name TEXT,
  score INTEGER
);

INSERT INTO students VALUES (1, '张三', 88);
INSERT INTO students VALUES (2, '李四', 92);
INSERT INTO students VALUES (3, '王五', 79);
```

然后查询：

```sql
SELECT * FROM students ORDER BY score DESC;
-- 星号表示"所有列"，结果按分数从高到低：李四、张三、王五
```

把 `ORDER BY score DESC` 的 `DESC` 删掉再跑一次，观察顺序变化——**改一个词、看一次结果**，是学 SQL 最好的节奏。

## 常见困惑

**"MySQL 和 SQL 是什么关系？"**——SQL 是语言，MySQL/PostgreSQL 是使用这门语言的数据库软件（就像"英语"与"英国人、美国人"的关系）。

**"NoSQL 是什么？"**——不使用表格模型的数据库（如文档型 MongoDB），与关系型互补。零基础阶段先把 SQL 主线学扎实。

**"写 SQL 会不会把数据弄坏？"**——练习环境随便折腾；生产环境遵循"重要操作前备份、删除用软删除"的工程规范，后续 mysql 模块的事务章节会讲安全机制。

## 下一步

进入 [SQL 概述与标准](/sql/002-OverviewStandard) 开始语法主线；想搭建本地数据库环境，接着读 [MySQL 模块](/mysql/001-HowToUseThisCourse) 的环境章节。
