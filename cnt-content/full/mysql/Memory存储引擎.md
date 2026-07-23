---
order: 51
title: Memory存储引擎
module: mysql
category: MySQL
difficulty: intermediate
description: 'MySQL Memory存储引擎：内存表、哈希索引、表级锁、适用场景与限制'
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/MyISAM存储引擎
  - mysql/SQL数据操作与查询
  - mysql/NDB集群
  - mysql/聚簇索引与二级索引
prerequisites:
  - mysql/语法速查
---

## 1. Memory 概述

Memory（原名 HEAP）存储引擎将数据完全存储在内存中，适用于需要极快访问速度的临时数据。

### 1.1 核心特性

| 特性       | 说明                       |
| ---------- | -------------------------- |
| 存储       | 完全在内存中               |
| 锁粒度     | 表级锁                     |
| 事务       | 不支持                     |
| 索引       | 哈希索引（默认）/ B+树索引 |
| 持久性     | 无（服务器重启数据丢失）   |
| 最大行大小 | 约 32KB（不含 BLOB/TEXT）  |

### 1.2 创建 Memory 表

```sql
CREATE TABLE session_cache (
    session_id VARCHAR(128) PRIMARY KEY,
    user_id    BIGINT NOT NULL,
    data       VARCHAR(5000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE = MEMORY;

-- 指定索引类型
CREATE TABLE lookup (
    id  INT PRIMARY KEY,
    key_col VARCHAR(50),
    INDEX idx_key USING BTREE (key_col)  -- B+树索引
) ENGINE = MEMORY;
```

## 2. 哈希索引 vs B+树索引

| 特性     | 哈希索引（默认） | B+树索引    |
| -------- | ---------------- | ----------- |
| 等值查找 | $O(1)$           | $O(\log n)$ |
| 范围查询 | 不支持           | 支持        |
| 排序     | 不支持           | 支持        |
| 最左前缀 | 不支持           | 支持        |
| 哈希冲突 | 可能             | 无          |

```sql
-- 默认哈希索引：适合等值查找
SELECT * FROM session_cache WHERE session_id = 'abc123';

-- B+树索引：适合范围查询
SELECT * FROM lookup WHERE key_col BETWEEN 'A' AND 'M';
```

## 3. 限制与注意事项

```sql
-- 不支持 BLOB/TEXT 列
-- 不支持行大小超过约 32KB
-- 服务器重启数据丢失
-- 不支持事务
-- 不支持外键
-- 表级锁，并发写入性能差

-- 设置最大 Memory 表大小
SET GLOBAL max_heap_table_size = 256 * 1024 * 1024;  -- 256MB
SET GLOBAL tmp_table_size = 256 * 1024 * 1024;       -- 临时表大小
```

## 4. 适用场景

```sql
-- 1. 会话缓存
CREATE TABLE session_cache (
    session_id VARCHAR(128) PRIMARY KEY,
    user_id BIGINT,
    data VARCHAR(5000)
) ENGINE = MEMORY;

-- 2. 查找表/映射表
CREATE TABLE country_codes (
    code CHAR(2) PRIMARY KEY,
    name VARCHAR(100)
) ENGINE = MEMORY;

-- 3. 中间结果缓存
-- MySQL 内部使用 Memory 引擎处理 GROUP BY、DISTINCT 等操作的临时表
```
