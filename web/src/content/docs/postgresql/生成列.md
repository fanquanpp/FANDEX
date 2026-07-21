---
order: 83
title: 生成列
module: postgresql
category: PostgreSQL
difficulty: intermediate
description: PostgreSQL生成列：STORED生成列、VIRTUAL生成列、表达式计算与索引支持
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/审计日志
  - postgresql/序列与自增列
  - postgresql/可更新视图
  - postgresql/并行查询
prerequisites:
  - postgresql/概述与安装配置
---

## 1. 生成列概述

生成列（Generated Column）的值由表达式自动计算，不能手动插入或更新。

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

## 3. 表达式限制

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

## 4. 索引支持

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
