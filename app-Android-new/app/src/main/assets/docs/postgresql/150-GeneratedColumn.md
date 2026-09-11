---
order: 150
title: 生成列
module: 'postgresql'
category: 数据库
difficulty: intermediate
description: PostgreSQL生成列：STORED生成列、VIRTUAL生成列、表达式计算与索引支持
author: fanquanpp
updated: '2026-09-12'
related:
  - 'postgresql/520-AuditLog'
  - 'postgresql/090-SequenceAutoIncrement'
  - 'postgresql/140-UpdatableView'
  - 'postgresql/260-ParallelQuery'
prerequisites:
  - 'postgresql/010-OverviewInstallConfig'
---


## 1. 生成列概述

生成列（Generated Column）的值由表达式自动计算，不能手动插入或更新。
PostgreSQL 提供两种生成列：

- **STORED**（PostgreSQL 12+）：写入时计算并存储在磁盘上，读取得快、占空间；
- **VIRTUAL**（PostgreSQL 18+）：读取时实时计算，不占存储，写入更快；
  且自 PG 18 起 VIRTUAL 成为 `GENERATED ALWAYS AS (...)` 未指定种类时的默认值。

## 2. STORED 生成列

```sql
-- 值存储在磁盘上
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    price NUMERIC(10,2),
    tax_rate NUMERIC(5,4) DEFAULT 0.13,
    total_price NUMERIC(10,2) GENERATED ALWAYS AS (price * (1 + tax_rate)) STORED
);

-- 插入时自动计算 total_price
INSERT INTO products (price) VALUES (100);
-- total_price = 100 * 1.13 = 113.00
```

## 3. VIRTUAL 生成列（PostgreSQL 18）

```sql
-- 值在查询时实时计算, 不占存储, 写入更快
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    price NUMERIC(10,2),
    quantity INT,
    subtotal NUMERIC(10,2) GENERATED ALWAYS AS (price * quantity) VIRTUAL
);

INSERT INTO order_items (price, quantity) VALUES (19.90, 3);

-- 查询时才计算 subtotal
SELECT subtotal FROM order_items WHERE id = 1;
-- subtotal
--     59.70

-- PG 18 起 VIRTUAL 是默认种类, 可省略关键字:
-- subtotal NUMERIC(10,2) GENERATED ALWAYS AS (price * quantity)

-- 选型建议:
--  STORED : 读多写少、需要建索引或参与逻辑复制（PG 18 起存储生成列可被逻辑复制）
--  VIRTUAL: 写多读少、表达式计算廉价、存储敏感的场景
-- 注意: VIRTUAL 生成列不能直接创建索引（需要索引时应改用 STORED 或表达式索引）
```

## 4. 表达式限制

```sql
-- 生成列表达式必须是不可变的（IMMUTABLE）
-- 不能使用：随机函数、当前时间、子查询、其他表的列

-- 正确
full_name VARCHAR(200) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED

-- 错误
created_year INT GENERATED ALWAYS AS (EXTRACT(YEAR FROM created_at)) STORED
-- EXTRACT 不是 IMMUTABLE（依赖时区设置）

-- 修正：使用确定性表达式
created_year INT GENERATED ALWAYS AS (EXTRACT(YEAR FROM created_at::timestamp)) STORED
```

## 5. 索引支持

```sql
-- 可以在生成列上创建索引
CREATE INDEX idx_products_total ON products(total_price);

-- 用于函数索引的替代
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    data JSONB,
    status VARCHAR(20) GENERATED ALWAYS AS (data->>'status') STORED
);
CREATE INDEX idx_orders_status ON orders(status);
```
