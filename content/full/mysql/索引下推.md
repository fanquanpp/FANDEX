---
order: 55
title: 索引下推
module: mysql
category: MySQL
difficulty: advanced
description: MySQL索引条件下推ICP：原理、执行流程、适用条件与性能优化
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/聚簇索引与二级索引
  - mysql/联合索引与最左前缀原则
  - mysql/全文索引
  - mysql/前缀索引
prerequisites:
  - mysql/语法速查
---

## 1. ICP 概述

索引条件下推（Index Condition Pushdown，ICP）是 MySQL 5.6 引入的优化，将 WHERE 条件中可以在索引上评估的部分下推到存储引擎层执行，减少回表次数。

## 2. 执行流程对比

### 2.1 无 ICP

```
1. 存储引擎：根据索引最左前缀查找匹配的主键
2. 存储引擎：回表获取完整行数据
3. Server 层：评估剩余 WHERE 条件
4. 返回满足条件的行
```

### 2.2 有 ICP

```
1. 存储引擎：根据索引最左前缀查找匹配的索引项
2. 存储引擎：在索引中评估可以下推的 WHERE 条件
3. 存储引擎：只对满足条件的索引项回表
4. Server 层：评估剩余 WHERE 条件
5. 返回满足条件的行
```

## 3. 示例

```sql
-- 索引 (name, age)
CREATE INDEX idx_name_age ON employees(name, age);

-- 查询
SELECT * FROM employees WHERE name LIKE '张%' AND age > 30;

-- 无 ICP：
-- 1. 通过 name LIKE '张%' 找到所有姓张的主键（如1000条）
-- 2. 回表1000次获取完整行
-- 3. Server 层过滤 age > 30（可能只剩100条）

-- 有 ICP：
-- 1. 通过 name LIKE '张%' 找到索引项
-- 2. 在索引中直接评估 age > 30（age在索引中）
-- 3. 只对满足条件的100条回表
-- 回表次数从1000减少到100
```

## 4. 适用条件

- InnoDB / MyISAM 引擎
- 联合索引中，WHERE 条件包含索引列但不符合最左前缀
- 条件可以在索引上评估（不需要回表获取其他列）

```sql
-- 不适用 ICP 的场景：
-- 1. 覆盖索引（不需要回表，ICP 无意义）
-- 2. WHERE 条件列不在索引中
-- 3. 子查询条件

-- EXPLAIN 中 Extra: Using index condition 表示使用了 ICP
```

## 5. 控制 ICP

```sql
-- 开启 ICP（默认）
SET optimizer_switch = 'index_condition_pushdown=on';

-- 关闭 ICP
SET optimizer_switch = 'index_condition_pushdown=off';
```
