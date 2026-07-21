---
order: 70
title: FDW外部数据包装器
module: postgresql
category: PostgreSQL
difficulty: advanced
description: 'PostgreSQL FDW外部数据包装器：跨数据库查询、postgres_fdw、文件FDW与数据联邦'
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/触发器与事件触发器
  - postgresql/扩展模块
  - postgresql/流复制
  - postgresql/级联复制
prerequisites:
  - postgresql/概述与安装配置
---

## 1. FDW 概述

外部数据包装器（Foreign Data Wrapper，FDW）允许 PostgreSQL 访问外部数据源，像查询本地表一样查询远程数据。

## 2. postgres_fdw

```sql
-- 安装扩展
CREATE EXTENSION postgres_fdw;

-- 创建外部服务器
CREATE SERVER remote_db
FOREIGN DATA WRAPPER postgres_fdw
OPTIONS (host 'remote-host', dbname 'remotedb', port '5432');

-- 创建用户映射
CREATE USER MAPPING FOR current_user
SERVER remote_db
OPTIONS (user 'remote_user', password 'password');

-- 导入外部表
IMPORT FOREIGN SCHEMA public
LIMIT TO (employees, departments)
FROM SERVER remote_db INTO public;

-- 或手动创建
CREATE FOREIGN TABLE remote_employees (
    id INTEGER,
    name VARCHAR(100),
    salary NUMERIC
) SERVER remote_db
OPTIONS (schema_name 'public', table_name 'employees');

-- 查询外部表
SELECT * FROM remote_employees WHERE salary > 50000;
```

## 3. 文件 FDW

```sql
CREATE EXTENSION file_fdw;

CREATE SERVER csv_server
FOREIGN DATA WRAPPER file_fdw;

CREATE FOREIGN TABLE csv_data (
    id INTEGER,
    name VARCHAR(100),
    value NUMERIC
) SERVER csv_server
OPTIONS (filename '/data/export.csv', format 'csv', header 'true');
```

## 4. 下推优化

```sql
-- postgres_fdw 支持 WHERE 条件下推
-- 远程数据库执行过滤，减少数据传输

-- 启用下推
ALTER SERVER remote_db OPTIONS (ADD fetch_size '10000');

-- 查看下推情况
EXPLAIN VERBOSE
SELECT * FROM remote_employees WHERE salary > 50000;
-- Remote SQL: SELECT id, name, salary FROM public.employees WHERE ((salary > 5000.0))
```
