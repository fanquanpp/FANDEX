---
order: 61
title: 分区裁剪与分区连接
module: postgresql
category: PostgreSQL
difficulty: advanced
description: PostgreSQL分区裁剪与分区连接：运行时裁剪、分区智能连接与性能优化
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/查询优化
  - postgresql/分区表
  - postgresql/高级SQL
  - postgresql/MERGE语句增强
prerequisites:
  - postgresql/概述与安装配置
---

## 1. 分区裁剪

### 1.1 计划时裁剪

```sql
-- WHERE 条件常量在计划时已知
EXPLAIN SELECT * FROM orders WHERE order_date = '2026-05-15';
-- 只扫描 orders_2026_q2
```

### 1.2 运行时裁剪

```sql
-- 参数化查询在执行时裁剪
PREPARE get_orders(DATE) AS
    SELECT * FROM orders WHERE order_date = $1;
EXPLAIN EXECUTE get_orders('2026-05-15');
-- Append
--   Subplans Removed: 3  -- 运行时裁剪了3个分区
```

## 2. 分区连接（Partitionwise Join）

```sql
-- 当两表都是分区表且分区策略匹配时
-- PostgreSQL 可以逐分区连接

SET enable_partitionwise_join = ON;

EXPLAIN SELECT * FROM orders o JOIN order_items oi ON o.id = oi.order_id;
-- 每对对应分区单独连接
-- 减少内存使用和计算量
```

## 3. 分区聚合

```sql
SET enable_partitionwise_aggregate = ON;

-- 逐分区聚合后合并
SELECT order_date, SUM(amount) FROM orders GROUP BY order_date;
-- 每个分区先聚合，然后合并结果
```
