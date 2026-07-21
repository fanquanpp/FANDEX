---
order: 69
title: 扩展模块
module: postgresql
category: PostgreSQL
difficulty: intermediate
description: PostgreSQL扩展模块：PostGIS、pgvector、pg_stat_statements与常用扩展管理
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/存储过程与函数
  - postgresql/触发器与事件触发器
  - postgresql/FDW外部数据包装器
  - postgresql/流复制
prerequisites:
  - postgresql/概述与安装配置
---

## 1. 扩展管理

```sql
-- 查看可用扩展
SELECT * FROM pg_available_extensions;

-- 安装扩展
CREATE EXTENSION postgis;
CREATE EXTENSION vector;
CREATE EXTENSION pg_stat_statements;

-- 查看已安装扩展
SELECT * FROM pg_extension;

-- 更新扩展
ALTER EXTENSION postgis UPDATE;

-- 卸载扩展
DROP EXTENSION postgis;
```

## 2. PostGIS

```sql
CREATE EXTENSION postgis;
-- 空间数据类型、函数和索引
```

## 3. pgvector

```sql
CREATE EXTENSION vector;
-- 向量存储和相似度搜索
```

## 4. pg_stat_statements

```sql
CREATE EXTENSION pg_stat_statements;

-- 查看最慢的查询
SELECT query, calls, total_exec_time, mean_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- 重置统计
SELECT pg_stat_statements_reset();
```

## 5. 其他常用扩展

| 扩展         | 用途                     |
| ------------ | ------------------------ |
| pgcrypto     | 加密函数                 |
| pg_trgm      | 模糊匹配、相似度搜索     |
| hstore       | 键值对存储               |
| uuid-ossp    | UUID 生成                |
| btree_gin    | GIN 索引支持 B-tree 类型 |
| pg_repack    | 在线消除表膨胀           |
| pgaudit      | 审计日志                 |
| postgres_fdw | 外部数据包装器           |
