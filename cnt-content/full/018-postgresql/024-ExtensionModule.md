---
order: 240
title: 扩展模块
module: 'postgresql'
category: 数据库
difficulty: intermediate
description: PostgreSQL扩展模块：PostGIS、pgvector、pg_stat_statements与常用扩展管理
author: fanquanpp
updated: '2026-09-08'
related:
  - 'postgresql/022-StoredProcedureAndFunction'
  - 'postgresql/023-TriggerEventTrigger'
  - 'postgresql/025-FDWForeignDataWrapper'
  - 'postgresql/026-StreamingReplication'
prerequisites:
  - 'postgresql/001-OverviewInstallConfig'
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
## 扩展管理

**基本写法：安装扩展**
`CREATE EXTENSION [IF NOT EXISTS] <扩展名> [WITH] [SCHEMA <模式>] [VERSION <版本>];`

```sql
-- 安装常用扩展
CREATE EXTENSION IF NOT EXISTS pgcrypto;          -- 加密函数
CREATE EXTENSION IF NOT EXISTS pg_trgm;            -- 模糊匹配与相似度
CREATE EXTENSION IF NOT EXISTS btree_gin;          -- GIN 索引支持 btree 类型
CREATE EXTENSION IF NOT EXISTS hstore SCHEMA public;  -- 键值对类型
-- 指定版本
CREATE EXTENSION IF NOT EXISTS postgis VERSION '3.4.0';
```

**基本写法：查看已安装扩展**
`SELECT * FROM pg_available_extensions;`

```sql
-- 查看所有可用扩展及安装状态
SELECT name, default_version, installed_version
FROM pg_available_extensions
WHERE installed_version IS NOT NULL;
-- 查看所有可用扩展（含未安装）
SELECT name, default_version FROM pg_available_extensions ORDER BY name;
```

**基本写法：查看扩展详细信息**
`\dx+`

```bash
# psql 元命令查看已安装扩展及对象
\dx
# 查看扩展包含的对象
\dx+ pg_trgm
```

**基本写法：更新扩展版本**
`ALTER EXTENSION <扩展名> UPDATE [TO <新版本>];`

```sql
-- 升级扩展到新版本
ALTER EXTENSION postgis UPDATE TO '3.5.0';
```

**基本写法：删除扩展**
`DROP EXTENSION [IF EXISTS] <扩展名> [, <扩展2>] [CASCADE|RESTRICT];`

```sql
-- 删除扩展（默认 RESTRICT，依赖对象存在则失败）
DROP EXTENSION IF EXISTS pg_trgm;
-- 级联删除扩展及其依赖对象
DROP EXTENSION IF EXISTS postgis CASCADE;
```

---

## 常用扩展速查

**基本写法：uuid-OSSP 生成 UUID**
`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`

```sql
-- 生成 UUID（uuid-ossp 扩展）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
SELECT uuid_generate_v4();  -- 随机 UUID
SELECT uuid_generate_v1();  -- 基于时间
-- PG 13+ 内置 gen_random_uuid()，无需扩展
SELECT gen_random_uuid();
```

**基本写法：pg_trgm 模糊匹配**
`CREATE EXTENSION IF NOT EXISTS pg_trgm;`

```sql
-- 三元组相似度匹配
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- 相似度查询
SELECT name, similarity(name, '张三') AS sim
FROM users WHERE name % '张三' ORDER BY sim DESC;
-- 创建 GIN trigram 索引加速 LIKE
CREATE INDEX idx_users_name ON users USING GIN (name gin_trgm_ops);
```

**基本写法：pgcrypto 加密**
`CREATE EXTENSION IF NOT EXISTS pgcrypto;`

```sql
-- 加密解密函数
CREATE EXTENSION IF NOT EXISTS pgcrypto;
SELECT digest('password', 'sha256');            -- 哈希
SELECT encrypt('data', 'key', 'aes');           -- 对称加密
SELECT pgp_sym_encrypt('secret', 'password');   -- PGP 对称加密
```

**基本写法：hstore 键值对**
`CREATE EXTENSION IF NOT EXISTS hstore;`

```sql
-- 键值对存储
CREATE EXTENSION IF NOT EXISTS hstore;
CREATE TABLE kv (id INT, data hstore);
INSERT INTO kv VALUES (1, 'name=>张三, age=>25');
SELECT data->'name' FROM kv WHERE id = 1;
```

**基本写法：postgis 空间数据**
`CREATE EXTENSION IF NOT EXISTS postgis;`

```sql
-- PostGIS 空间扩展
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE geo_points (id SERIAL PRIMARY KEY, geom geometry(Point, 4326));
INSERT INTO geo_points (geom) VALUES (ST_SetSRID(ST_MakePoint(116.4, 39.9), 4326));
-- 距离查询
SELECT id FROM geo_points WHERE ST_DWithin(geom, ST_MakePoint(116.4,39.9)::geography, 1000);
```

---

## 扩展开发相关

**基本写法：查看扩展包含的对象**
`SELECT * FROM pg_extension;`

```sql
-- 查看已安装扩展的详细信息
SELECT extname, extversion, extnamespace::regnamespace
FROM pg_extension;
```

**基本写法：查看扩展依赖对象**
`SELECT * FROM pg_depend WHERE refobjid = '<扩展名>'::regclass;`

```sql
-- 查看扩展提供的函数
SELECT proname, oidvectortypes(proargtypes)
FROM pg_proc p JOIN pg_extension e ON p.proextnamespace = e.extnamespace
WHERE e.extname = 'pg_trgm';
```

**基本写法：控制扩展可用性**
`shared_preload_libraries = '<扩展名>'`

```ini
# postgresql.conf 配置需预加载的扩展（如 pg_stat_statements）
shared_preload_libraries = 'pg_stat_statements, auto_explain'
```

**基本写法：pg_stat_statements 性能统计**
`CREATE EXTENSION IF NOT EXISTS pg_stat_statements;`

```sql
-- 安装并查看 SQL 执行统计
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
-- 查看最慢的 10 条 SQL
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC LIMIT 10;
```
