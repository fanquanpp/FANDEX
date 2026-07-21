---
order: 60
title: 分区表
module: postgresql
category: PostgreSQL
difficulty: advanced
description: PostgreSQL分区表：范围分区、列表分区、哈希分区的语法、管理与分区裁剪
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/KNN向量索引
  - postgresql/查询优化
  - postgresql/分区裁剪与分区连接
  - postgresql/高级SQL
prerequisites:
  - postgresql/概述与安装配置
---

## 1. 声明式分区

PostgreSQL 10+ 支持声明式分区，语法简洁。

## 2. 范围分区

```sql
CREATE TABLE orders (
    id BIGSERIAL,
    order_date DATE NOT NULL,
    amount DECIMAL(10,2)
) PARTITION BY RANGE (order_date);

CREATE TABLE orders_2026_q1 PARTITION OF orders
    FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE orders_2026_q2 PARTITION OF orders
    FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE orders_default PARTITION OF orders DEFAULT;
```

## 3. 列表分区

```sql
CREATE TABLE customers (
    id SERIAL,
    name VARCHAR(100),
    region VARCHAR(20)
) PARTITION BY LIST (region);

CREATE TABLE customers_east PARTITION OF customers
    FOR VALUES IN ('华东', '华北');
CREATE TABLE customers_south PARTITION OF customers
    FOR VALUES IN ('华南', '西南');
```

## 4. 哈希分区

```sql
CREATE TABLE logs (
    id BIGSERIAL,
    message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY HASH (id);

CREATE TABLE logs_0 PARTITION OF logs FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE logs_1 PARTITION OF logs FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE logs_2 PARTITION OF logs FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE logs_3 PARTITION OF logs FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

## 5. 分区管理

```sql
-- 添加分区
CREATE TABLE orders_2026_q3 PARTITION OF orders
    FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');

-- 分离分区
ALTER TABLE orders DETACH PARTITION orders_2026_q1;

-- 附加分区
ALTER TABLE orders ATTACH PARTITION orders_2026_q1
    FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');

-- 删除分区（数据也删除）
DROP TABLE orders_2026_q1;
```

## 6. 分区裁剪

```sql
-- 查询自动裁剪不需要的分区
EXPLAIN SELECT * FROM orders WHERE order_date >= '2026-04-01';
-- 只扫描 orders_2026_q2

-- 确认裁剪
SET enable_partition_pruning = ON;
```
