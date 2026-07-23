---
order: 55
title: 索引类型
module: postgresql
category: PostgreSQL
difficulty: advanced
description: 'PostgreSQL索引类型：B-tree、Hash、GiST、GIN、SP-GiST、BRIN的原理与适用场景'
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/VACUUM机制
  - postgresql/事务ID回卷预防
  - postgresql/覆盖索引与部分索引
  - postgresql/KNN向量索引
prerequisites:
  - postgresql/概述与安装配置
---

## 1. 索引类型总览

| 类型    | 适用场景           | 特点               |
| ------- | ------------------ | ------------------ |
| B-tree  | 等值、范围、排序   | 默认，最通用       |
| Hash    | 等值查找           | 简单，不支持范围   |
| GiST    | 空间、范围、全文   | 可扩展的通用框架   |
| GIN     | 数组、全文、JSONB  | 倒排索引           |
| SP-GiST | 电话、路由、四叉树 | 非平衡磁盘数据结构 |
| BRIN    | 大表、有序数据     | 块级索引，极小     |

## 2. B-tree 索引

```sql
-- 默认索引类型
CREATE INDEX idx_employees_name ON employees(name);

-- 支持的操作符：=, >, <, >=, <=, BETWEEN, IN, LIKE 'prefix%'
-- 支持排序：ORDER BY
-- 支持唯一约束
```

## 3. Hash 索引

```sql
CREATE INDEX idx_users_email_hash ON users USING HASH (email);

-- 只支持等值查找（=）
-- 不支持范围、排序
-- PostgreSQL 10+ 后 Hash 索引可靠，但 B-tree 通常更好
```

## 4. GiST 索引

```sql
-- 空间索引（PostGIS）
CREATE INDEX idx_locations_geom ON locations USING GIST (geom);

-- 范围类型
CREATE INDEX idx_reservations_period ON reservations USING GIST (period);

-- 全文检索（较慢，GIN 更常用）
CREATE INDEX idx_articles_fts ON articles USING GIST (to_tsvector('english', content));
```

## 5. GIN 索引

```sql
-- 全文检索（推荐）
CREATE INDEX idx_articles_fts ON articles USING GIN (to_tsvector('english', content));

-- JSONB 索引
CREATE INDEX idx_data_jsonb ON api_logs USING GIN (payload);
CREATE INDEX idx_data_jsonb_path ON api_logs USING GIN (payload jsonb_path_ops);

-- 数组索引
CREATE INDEX idx_tags ON posts USING GIN (tags);

-- GIN 特点：写入慢（需更新倒排列表），查询快
-- 可使用 fastupdate 延迟更新
CREATE INDEX idx_tags ON posts USING GIN (tags) WITH (fastupdate = on);
```

## 6. SP-GiST 索引

```sql
-- 适合非平衡数据结构
-- 电话号码前缀
CREATE INDEX idx_phones ON contacts USING SPGST (phone prefix_range_ops);

-- 路由表
CREATE INDEX idx_routes ON routing USING SPGST (prefix);
```

## 7. BRIN 索引

```sql
-- 块范围索引：记录每个数据块范围的摘要
-- 极小（通常几MB），适合大表有序数据

CREATE INDEX idx_logs_created ON logs USING BRIN (created_at)
    WITH (pages_per_range = 32);

-- 适合：时间序列数据、按插入顺序的表
-- 不适合：随机分布的数据
```
