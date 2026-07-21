---
order: 59
title: 索引统计信息与直方图
module: mysql
category: MySQL
difficulty: advanced
description: 'MySQL索引统计信息与直方图：ANALYZE TABLE、统计信息存储、直方图类型与优化器利用'
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/前缀索引
  - mysql/索引提示与强制索引
  - mysql/SQL函数与高级查询
  - mysql/索引失效场景
prerequisites:
  - mysql/语法速查
---

## 1. 索引统计信息

### 1.1 统计信息内容

InnoDB 通过随机采样估算索引的基数（Cardinality）：

```sql
-- 查看索引统计信息
SHOW INDEX FROM employees;

-- 关键字段：
-- Cardinality：索引中不同值的估算数量
-- Sub_part：前缀索引长度
-- Null：是否允许 NULL
```

### 1.2 ANALYZE TABLE

```sql
-- 手动更新统计信息
ANALYZE TABLE employees;

-- 查看统计信息更新时间
SELECT table_name, last_update
FROM mysql.innodb_table_stats
WHERE database_name = 'mydb';

-- 控制采样页数
SET GLOBAL innodb_stats_persistent_sample_pages = 20;  -- 默认20
SET GLOBAL innodb_stats_transient_sample_pages = 8;     -- 非持久化统计
```

### 1.3 持久化统计信息

```sql
-- 默认开启持久化统计信息
SET GLOBAL innodb_stats_persistent = ON;

-- 统计信息存储在 mysql.innodb_table_stats 和 mysql.innodb_index_stats
SELECT * FROM mysql.innodb_table_stats WHERE table_name = 'employees';
SELECT * FROM mysql.innodb_index_stats WHERE table_name = 'employees';
```

## 2. 直方图统计

### 2.1 概述

MySQL 8.0 引入直方图（Histogram）统计，提供列值分布的详细信息，帮助优化器做出更好的执行计划选择。

### 2.2 直方图类型

| 类型        | 适用场景 | 说明                     |
| ----------- | -------- | ------------------------ |
| Singleton   | 低基数列 | 每个值一个桶             |
| Equi-Height | 高基数列 | 等高直方图，每桶行数相近 |

### 2.3 创建直方图

```sql
-- 创建直方图
ANALYZE TABLE employees UPDATE HISTOGRAM ON salary WITH 100 BUCKETS;
ANALYZE TABLE employees UPDATE HISTOGRAM ON dept_id, status WITH 50 BUCKETS;

-- 查看直方图
SELECT * FROM information_schema.column_statistics
WHERE table_name = 'employees';

-- 删除直方图
ANALYZE TABLE employees DROP HISTOGRAM ON salary;
```

### 2.4 直方图的作用

```sql
-- 直方图帮助优化器估算 WHERE 条件的选择性
-- 例如：salary > 100000 的比例
-- 无直方图：优化器只能基于索引统计估算
-- 有直方图：优化器可以精确知道分布

-- 对没有索引的列特别有用
-- WHERE status = 'rare_value'
-- 直方图告诉优化器这个值很少，选择索引扫描而非全表扫描
```
