---
order: 94
title: 函数索引
module: mysql
category: MySQL
difficulty: intermediate
description: MySQL函数索引：基于表达式的索引、虚拟列索引与函数索引优化
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/不可见索引
  - mysql/性能调优与安全
  - mysql/存储过程与函数
  - mysql/MVCC快照读与当前读
prerequisites:
  - mysql/语法速查
---

## 1. 函数索引概述

MySQL 8.0 支持函数索引（Functional Index），可以对表达式创建索引，解决索引列使用函数导致索引失效的问题。

## 2. 创建函数索引

```sql
-- 方式1：直接创建函数索引
CREATE INDEX idx_year ON orders ((YEAR(created_at)));

-- 方式2：通过虚拟列创建
ALTER TABLE orders ADD COLUMN order_year INT
    GENERATED ALWAYS AS (YEAR(created_at)) VIRTUAL;
CREATE INDEX idx_order_year ON orders(order_year);
```

## 3. 使用场景

### 3.1 日期函数索引

```sql
-- 优化：WHERE YEAR(created_at) = 2026
CREATE INDEX idx_year ON orders ((YEAR(created_at)));

SELECT * FROM orders WHERE YEAR(created_at) = 2026;
-- 现在可以使用索引
```

### 3.2 字符串函数索引

```sql
-- 优化：WHERE LOWER(email) = 'test@example.com'
CREATE INDEX idx_email_lower ON users ((LOWER(email)));

SELECT * FROM users WHERE LOWER(email) = 'test@example.com';
-- 使用索引
```

### 3.3 JSON 路径索引

```sql
-- 优化：WHERE data->>'$.status' = 'active'
CREATE INDEX idx_data_status ON orders ((CAST(data->>'$.status' AS CHAR(20))));

SELECT * FROM orders WHERE data->>'$.status' = 'active';
-- 使用索引
```

### 3.4 计算列索引

```sql
-- 优化：WHERE price * quantity > 1000
CREATE INDEX idx_total ON order_items ((price * quantity));

SELECT * FROM order_items WHERE price * quantity > 1000;
-- 使用索引
```

## 4. 限制

```sql
-- 函数索引不支持前缀索引
-- 函数索引中的表达式必须用括号包裹
-- 子查询不允许出现在函数索引中
-- 函数索引占用存储空间（虚拟列索引不占数据空间）
```
