---
order: 300
title: 扩展模块详解
module: 'postgresql'
category: 数据库
difficulty: intermediate
description: PostgreSQL 扩展模块详解：PostGIS 地理空间、pgvector 向量搜索、pg_stat_statements 性能分析。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'postgresql/440-LogicalPhysicalReplicationCompare'
  - 'postgresql/110-JSONBJSONDifference'
prerequisites:
  - 'postgresql/010-OverviewInstallConfig'
---


## 1. 扩展模块体系

### 1.1 扩展管理

```sql
-- 查看可用扩展
SELECT * FROM pg_available_extensions;

-- 安装扩展
CREATE EXTENSION IF NOT EXISTS extension_name;

-- 查看已安装扩展
SELECT * FROM pg_extension;

-- 升级扩展
ALTER EXTENSION extension_name UPDATE;

-- 卸载扩展
DROP EXTENSION extension_name;
```

### 1.2 扩展搜索路径

```sql
-- 扩展安装位置
SHOW extension_dir;
-- /usr/share/postgresql/16/extension

-- 控制文件和 SQL 脚本
-- extension_name.control
-- extension_name--version.sql
```

### 1.3 扩展的内部：目录表与预加载

排障和审计时，三个目录查询比 `\dx` 更细：

```sql
-- 已安装扩展的详细信息（版本、所属 schema）
SELECT extname, extversion, extnamespace::regnamespace
FROM pg_extension;

-- 某个扩展提供了哪些函数（以 pg_trgm 为例）
SELECT proname, oidvectortypes(proargtypes)
FROM pg_proc p JOIN pg_extension e ON p.proextnamespace = e.extnamespace
WHERE e.extname = 'pg_trgm';

-- 扩展对象与扩展的依赖关系
SELECT * FROM pg_depend WHERE refobjid = 'pg_trgm'::regclass;
```

第二类扩展必须在配置里**预加载**才能工作（它们要在每个后端启动时挂钩子），典型是 pg_stat_statements 与 auto_explain：

```ini
# postgresql.conf
shared_preload_libraries = 'pg_stat_statements, auto_explain'
```

易错点：`CREATE EXTENSION pg_stat_statements` 成功但视图里没有数据，九成是漏了 `shared_preload_libraries`（改后要重启）——"装了没数据"先查这个。

## 2. PostGIS

### 2.1 安装与验证

```sql
CREATE EXTENSION postgis;

-- 验证安装
SELECT PostGIS_Version();
-- 3.4 USE_GEOS=1 USE_PROJ=1 USE_STATS=1
```

### 2.2 几何类型

| 类型         | 说明     | 示例                                    |
| ------------ | -------- | --------------------------------------- |
| POINT        | 点       | `POINT(116.4 39.9)`                     |
| LINESTRING   | 线       | `LINESTRING(0 0, 1 1, 2 2)`             |
| POLYGON      | 多边形   | `POLYGON((0 0, 4 0, 4 4, 0 4, 0 0))`    |
| MULTIPOINT   | 多点     | `MULTIPOINT(0 0, 1 1)`                  |
| MULTIPOLYGON | 多多边形 | `MULTIPOLYGON(((0 0,1 0,1 1,0 1,0 0)))` |

### 2.3 地理空间查询

```sql
-- 创建空间表
CREATE TABLE stores (
    id      SERIAL PRIMARY KEY,
    name    VARCHAR(100),
    location GEOGRAPHY(POINT, 4326)  -- WGS84 坐标系
);

-- 插入数据（经度 纬度）
INSERT INTO stores (name, location) VALUES
('天安门', ST_GeogFromText('POINT(116.3974 39.9087)')),
('故宫', ST_GeogFromText('POINT(116.3972 39.9163)')),
('颐和园', ST_GeogFromText('POINT(116.2755 39.9999)'));

-- 查找5公里内的商店
SELECT name,
       ST_Distance(location, ST_GeogFromText('POINT(116.3974 39.9087)')) AS distance
FROM stores
WHERE ST_DWithin(location, ST_GeogFromText('POINT(116.3974 39.9087)'), 5000)
ORDER BY distance;

-- 空间索引
CREATE INDEX idx_stores_location ON stores USING gist (location);
```

### 2.4 常用函数

```sql
-- 距离（米）
ST_Distance(geog1, geog2)

-- 范围查询
ST_DWithin(geog1, geog2, distance_meters)

-- 面积（平方米）
ST_Area(geog)

-- 长度（米）
ST_Length(geog)

-- 缓冲区
ST_Buffer(geog, radius_meters)

-- 是否包含
ST_Contains(geom1, geom2)

-- 是否相交
ST_Intersects(geom1, geom2)

-- 坐标转换
ST_Transform(geom, target_srid)
```

## 3. pgvector

### 3.1 安装与基本使用

```sql
CREATE EXTENSION vector;

-- 创建向量列
CREATE TABLE documents (
    id        SERIAL PRIMARY KEY,
    content   TEXT,
    embedding vector(1536)  -- OpenAI ada-002 维度
);

-- 插入向量
INSERT INTO documents (content, embedding) VALUES
('Hello world', '[0.1, 0.2, 0.3, ...]'),
('PostgreSQL vector', '[0.4, 0.5, 0.6, ...]');
```

### 3.2 距离度量

```sql
-- L2 距离（欧几里得距离）
SELECT content, embedding <=> '[0.1, 0.2, 0.3, ...]' AS distance
FROM documents
ORDER BY embedding <=> '[0.1, 0.2, 0.3, ...]'
LIMIT 5;

-- 内积（负内积）
SELECT content, embedding <#> '[0.1, 0.2, 0.3, ...]' AS distance
FROM documents
ORDER BY embedding <#> '[0.1, 0.2, 0.3, ...]'
LIMIT 5;

-- 余弦距离
SELECT content, embedding <=> '[0.1, 0.2, 0.3, ...]' AS distance
FROM documents
ORDER BY embedding <=> '[0.1, 0.2, 0.3, ...]'
LIMIT 5;
```

| 操作符 | 度量     | 公式                                                                 |
| ------ | -------- | -------------------------------------------------------------------- |
| `<->`  | L2 距离  | $\sqrt{\sum (a_i - b_i)^2}$                                          |
| `<#>`  | 内积     | $-\sum a_i \cdot b_i$                                                |
| `<=>`  | 余弦距离 | $1 - \frac{\sum a_i b_i}{\sqrt{\sum a_i^2} \cdot \sqrt{\sum b_i^2}}$ |

### 3.3 索引类型

```sql
-- HNSW 索引（推荐，速度快）
CREATE INDEX idx_documents_embedding_hnsw
ON documents USING hnsw (embedding vector_cosine_ops);

-- IVFFlat 索引
CREATE INDEX idx_documents_embedding_ivfflat
ON documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 索引参数
-- HNSW
CREATE INDEX idx_hnsw ON docs USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- IVFFlat
CREATE INDEX idx_ivf ON docs USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100, probes = 10);
```

### 3.4 索引选择

| 索引    | 构建速度 | 查询速度 | 召回率 | 内存 |
| ------- | -------- | -------- | ------ | ---- |
| HNSW    | 慢       | 快       | 高     | 高   |
| IVFFlat | 快       | 中       | 中     | 低   |
| 无索引  | -        | 慢       | 100%   | 无   |

## 4. pg_stat_statements

### 4.1 安装与配置

```sql
-- 安装扩展
CREATE EXTENSION pg_stat_statements;

-- postgresql.conf 配置
-- shared_preload_libraries = 'pg_stat_statements'
-- pg_stat_statements.max = 10000
-- pg_stat_statements.track = all
-- pg_stat_statements.track_utility = on
-- pg_stat_statements.save = on
```

### 4.2 核心查询

```sql
-- 最耗时的 SQL（总时间）
SELECT query,
       calls,
       round(total_exec_time::numeric, 2) AS total_ms,
       round(mean_exec_time::numeric, 2) AS mean_ms,
       round(max_exec_time::numeric, 2) AS max_ms,
       rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- 最慢的 SQL（平均时间）
SELECT query,
       calls,
       round(mean_exec_time::numeric, 2) AS mean_ms
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- 读取最多的 SQL
SELECT query,
       calls,
       shared_blks_hit + shared_blks_read AS total_blks,
       round((shared_blks_hit::float / NULLIF(shared_blks_hit + shared_blks_read, 0) * 100)::numeric, 2) AS hit_ratio
FROM pg_stat_statements
ORDER BY shared_blks_hit + shared_blks_read DESC
LIMIT 10;

-- 产生最多临时文件的 SQL
SELECT query,
       calls,
       temp_blks_written
FROM pg_stat_statements
ORDER BY temp_blks_written DESC
LIMIT 10;
```

### 4.3 重置统计

```sql
-- 重置所有统计
SELECT pg_stat_statements_reset();

-- 重置特定查询（PG 14+）
SELECT pg_stat_statements_reset(userid, dbid, queryid);
```

### 4.4 性能分析工作流

```
1. 重置统计: SELECT pg_stat_statements_reset();
2. 运行业务负载
3. 查询 top SQL
4. EXPLAIN ANALYZE 分析慢查询
5. 优化（索引/SQL改写/配置调整）
6. 重新统计验证效果
```

## 5. 其他常用扩展

| 扩展            | 用途                                 |
| --------------- | ------------------------------------ |
| `uuid-ossp`     | UUID 生成（PG 13+ 内置 `gen_random_uuid()`，新项目优先内置函数） |
| `pg_trgm`       | 模糊搜索、相似度匹配                 |
| `pgcrypto`      | 加密函数、哈希（详见[存储加密](/postgresql/510-DataEncryptionStorage)） |
| `hstore`        | 键值对存储                           |
| `ltree`         | 层级路径数据                         |
| `btree_gin`     | GIN 索引支持 btree 类型              |
| `btree_gist`    | GiST 索引支持 btree 类型（EXCLUDE 约束常客） |
| `intarray`      | 整数数组操作                         |
| `unaccent`      | 去除重音符号                         |
| `fuzzystrmatch` | 字符串相似度（Soundex、Levenshtein） |
| `pg_cron`       | 定时任务                             |
| `pg_repack`     | 在线清理膨胀                         |

两个高频扩展的最小示例：

```sql
-- pg_trgm：任意位置 LIKE 走索引 + 相似度排序
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_users_name_trgm ON users USING GIN (name gin_trgm_ops);
SELECT name, similarity(name, '张三') AS sim
FROM users WHERE name % '张三' ORDER BY sim DESC;

-- uuid-ossp：旧项目遗留的 UUID 函数族
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
SELECT uuid_generate_v4();   -- 新项目改用内置 gen_random_uuid()
```
