---
order: 20
title: 学习路线图
module: 'mysql'
category: 数据库
difficulty: beginner
description: 四周零基础 MySQL 学习时间线：每周学什么、读哪些文档、如何验收。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'mysql/001-HowToUseThisCourse'
  - 'mysql/004-SQLPlayground'
prerequisites:
  - 'mysql/001-HowToUseThisCourse'
---

## 0. 四周时间线

```mermaid
timeline
    title MySQL 零基础四周路线
    第 1 周 : 沙箱跑 SQL : SELECT/WHERE/ORDER BY/LIMIT/COUNT : 环境搭建
    第 2 周 : 建表与增删改 : 数据类型/主键/INSERT/UPDATE/DELETE
    第 3 周 : 多表与索引 : INNER JOIN/LEFT JOIN : 索引入门
    第 4 周 : 事务与锁 : ACID/隔离级别/常见锁
```

## 1. 第一周：先跑起来（约 3-4 小时）

必读：

1. `000-SQL-Playground`（沙箱，10 个练习）；
2. `001-MySQLOverviewDatabaseDesign` 第 0 节（五分钟第一句 SQL）；
3. `080-DQL` 前 5 个动作（SELECT、WHERE、ORDER BY、LIMIT、COUNT）；
4. `002-MySQLEnvSetup`（本地环境，可选）。

验收：能独立写出“查询年龄大于 18 的用户并按年龄排序取前 5 条”。

## 2. 第二周：会建表、会增删改（约 4-6 小时）

必读：

1. `003-MySQLDataTypeConstraint`（只学 INT/VARCHAR/DATE + 主键/非空/默认值）；
2. `078-DDL`（CREATE TABLE / ALTER TABLE）；
3. `079-DML`（INSERT/UPDATE/DELETE，重点：UPDATE/DELETE 必须带 WHERE）。

验收：能创建一张 `students` 表并完成增删改查。

## 3. 第三周：多表查询与索引（约 4-6 小时）

必读：

1. `027-MultiTableJoinDetailed`（先只学 INNER JOIN 与 LEFT JOIN）；
2. `009-ClusteredIndexSecondaryIndex`（索引是什么、为什么快）；
3. `071-MySQLQuickLookup`（遇到不会的语法先查这里）。

验收：能解释 INNER JOIN 与 LEFT JOIN 的区别，并说出索引为什么能加速。

## 4. 第四周：事务与锁（约 3-4 小时）

必读：

1. `025-TransactionIsolationImplementation`（ACID 与隔离级别）；
2. `028-LockClassification`（常见锁类型）；
3. `069-TransactionLockMechanism`（事务与锁配合）。

验收：能说出脏读/不可重复读/幻读分别被哪个隔离级别解决。

## 5. 之后：按需查阅

- 索引深入：009-017、051、061；
- 性能优化：018-023、057；
- 日志与备份：031-037；
- 复制与高可用：038-043、055；
- 分库分表：045、067；
- 安全：046-048、073-075；
- 面试与理论：077。

> 一句话记住：第一周先跑通查询，第二周会建表增删改，第三周懂多表与索引，第四周理解事务与锁；之后全是按需查阅。

## 扩展学习

- 使用指南：`mysql/001-HowToUseThisCourse`；
- 术语表：`mysql/003-Glossary`；
- 沙箱：`mysql/004-SQLPlayground`。
