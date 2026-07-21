---
order: 90
tags:
  - mysql
  - database
difficulty: intermediate
title: 'MySQL 索引与执行计划'
module: mysql
category: 'MySQL Basics'
description: 'B+Tree 索引、EXPLAIN 分析与索引优化策略。'
author: Anonymous
related:
  - mysql/InnoDB体系架构
  - mysql/数据加密
  - mysql/MySQL9新特性与并行查询
  - mysql/VECTOR向量类型
prerequisites:
  - mysql/语法速查
---

## 1. 索引是什么 (What is an Index)

索引是为了加速检索而构建的数据结构。对 InnoDB 来说，常见索引是 B+Tree。
索引带来的收益：

- 加速 `WHERE` 过滤、`JOIN`、`ORDER BY`、`GROUP BY`
  索引带来的成本：
- 写入变慢（INSERT/UPDATE/DELETE 需要维护索引）
- 占用更多空间
- 设计不当会让查询优化器选错计划或无法利用索引

## 2. InnoDB 索引要点 (InnoDB Basics)

### 2.1 聚簇索引与二级索引

- 主键索引（聚簇索引）：叶子节点存放整行数据
- 二级索引：叶子节点存放“索引列 + 主键值”
  因此：
- 用二级索引命中后，可能需要回表（根据主键再查一次聚簇索引）
- 覆盖索引可以避免回表（查询列都在索引里）

## 3. 组合索引与最左前缀 (Composite Index)

假设有索引 `(a, b, c)`：

- 能有效利用：`a`、`a,b`、`a,b,c` 的前缀过滤
- 不能跳过前缀：只用 `b` 或 `c` 往往无法走该索引
  实践建议：
- 把区分度更高、过滤更强的列放在前面（但也要结合排序/分组需求）
- 频繁按 `(tenant_id, created_at)` 查询，优先建立组合索引

## 4. 什么时候索引会失效 (When Index Isn’t Used)

常见原因：

- 对索引列做函数/表达式：`WHERE DATE(created_at) = ...`
- 隐式类型转换：字符串与数字混用导致无法利用索引
- 前缀缺失：组合索引没用到最左前缀
- `LIKE '%xxx'` 前置通配符无法利用普通 B+Tree 索引
- 返回行数过多：优化器认为全表扫描更便宜

## 5. EXPLAIN 怎么看 (How to Read EXPLAIN)

常用字段（MySQL 8）：

- `type`：访问类型（从好到差大致：`const`/`ref`/`range`/`index`/`ALL`）
- `key`：实际使用的索引
- `rows`：估算扫描行数
- `Extra`：额外信息（例如 `Using index`、`Using filesort`、`Using temporary`）
  示例：

```sql
 EXPLAIN
 SELECT id, email
 from user_account
 WHERE email = 'a@b.com';
```

解读目标：

- 是否使用了期望的索引（`key`）
- 扫描行数是否可控（`rows`）
- 是否出现 `Using filesort` / `Using temporary`（可能需要优化索引或 SQL）

## 6. 建索引的实用策略 (Practical Strategy)

- 先写出典型查询，再反推索引，而不是“先建一堆索引”
- 一张表的索引数量控制在合理范围，避免写放大
- 组合索引优先覆盖高频查询路径
- 长字符串字段用前缀索引需谨慎（会影响选择性与排序能力）
- 对时间范围查询：`(tenant_id, created_at)` 常见有效

## 7. 小结 (Summary)

- 索引是“以写换读”的典型优化手段
- 组合索引与最左前缀是 MySQL 索引设计的核心
- EXPLAIN 是验证索引是否生效的第一工具

---

### 更新日志 (Changelog)

- 2026-04-06: 新增「索引与执行计划」知识点，补充 EXPLAIN 解读与建索引策略
