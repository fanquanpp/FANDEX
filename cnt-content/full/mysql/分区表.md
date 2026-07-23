---
order: 85
title: 分区表
module: mysql
category: MySQL
difficulty: advanced
description: MySQL分区表：RANGE、LIST、HASH、KEY分区的语法、管理、裁剪与性能优化
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/组复制
  - mysql/InnoDB集群
  - mysql/分库分表中间件
  - mysql/账户与权限管理
prerequisites:
  - mysql/语法速查
---

## 1. 分区概述

分区将大表拆分为多个物理小表，对应用透明，用于提升查询性能和管理便利性。

## 2. RANGE 分区

```sql
CREATE TABLE orders (
    id BIGINT AUTO_INCREMENT,
    order_date DATE,
    amount DECIMAL(10,2),
    PRIMARY KEY (id, order_date)
) PARTITION BY RANGE (YEAR(order_date)) (
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p2026 VALUES LESS THAN (2027),
    PARTITION pmax VALUES LESS THAN MAXVALUE
);

-- 添加分区
ALTER TABLE orders ADD PARTITION (PARTITION p2027 VALUES LESS THAN (2028));

-- 删除分区（数据也删除）
ALTER TABLE orders DROP PARTITION p2024;
```

## 3. LIST 分区

```sql
CREATE TABLE customers (
    id BIGINT AUTO_INCREMENT,
    region VARCHAR(20),
    name VARCHAR(100),
    PRIMARY KEY (id, region)
) PARTITION BY LIST COLUMNS (region) (
    PARTITION p_east VALUES IN ('华东', '华北'),
    PARTITION p_south VALUES IN ('华南', '西南'),
    PARTITION p_north VALUES IN ('东北', '西北')
);
```

## 4. HASH 分区

```sql
CREATE TABLE logs (
    id BIGINT AUTO_INCREMENT,
    created_at TIMESTAMP,
    message TEXT,
    PRIMARY KEY (id, created_at)
) PARTITION BY HASH (YEAR(created_at))
PARTITIONS 4;
```

## 5. KEY 分区

```sql
CREATE TABLE sessions (
    session_id VARCHAR(128) PRIMARY KEY,
    user_id BIGINT,
    data TEXT
) PARTITION BY KEY (session_id)
PARTITIONS 8;
```

## 6. 分区裁剪

```sql
-- 查询只扫描相关分区
SELECT * FROM orders WHERE order_date >= '2026-01-01';
-- 只扫描 p2026 分区

-- 查看分区裁剪
EXPLAIN PARTITIONS
SELECT * FROM orders WHERE order_date >= '2026-01-01';
-- partitions: p2026
```

## 7. 分区管理

```sql
-- 重建分区（消除碎片）
ALTER TABLE orders REBUILD PARTITION p2026;

-- 分析分区（更新统计信息）
ALTER TABLE orders ANALYZE PARTITION p2026;

-- 优化分区
ALTER TABLE orders OPTIMIZE PARTITION p2026;

-- 检查分区
ALTER TABLE orders CHECK PARTITION p2026;
```
