---
order: 3
title: 索引与查询优化
module: postgresql
category: PostgreSQL
difficulty: advanced
description: 'B-tree/Hash/GiST/GIN/SP-GiST/BRIN索引、覆盖/部分/表达式/KNN向量索引、统计信息、代价估算、执行计划分析、并行查询、分区表。'
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/概述与安装配置
  - postgresql/事务与并发控制
  - postgresql/高级SQL与扩展
  - postgresql/复制与高可用
prerequisites: []
---

## 1. 索引类型

### 1.1 B-tree 索引

B-tree 是 PostgreSQL 的默认索引类型，适用于等值查询、范围查询和排序操作。

```sql
-- 创建 B-tree 索引
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_orders_date ON orders (created_at DESC);

-- 复合索引
CREATE INDEX idx_orders_user_date ON orders (user_id, created_at DESC);

-- 唯一索引
CREATE UNIQUE INDEX idx_users_email_unique ON users (email);

-- B-tree 适用场景
--  等值: WHERE email = 'test@example.com'
--  范围: WHERE created_at > '2024-01-01'
--  排序: ORDER BY created_at DESC
--  前缀: WHERE name LIKE 'abc%'
--  后缀: WHERE name LIKE '%xyz'
--  全模糊: WHERE name LIKE '%abc%'
```

### 1.2 Hash 索引

```sql
-- 创建 Hash 索引
CREATE INDEX idx_session_token ON sessions USING hash (token);

-- Hash 索引特点
--  等值查询性能略优于 B-tree
--  不支持范围查询
--  不支持排序
--  不支持唯一约束
-- 适用: 纯等值查询的长字符串（如 session token）
```

### 1.3 GiST 索引

```sql
-- 几何数据索引
CREATE INDEX idx_locations_point ON locations USING gist (point_col);

-- 全文检索索引
CREATE INDEX idx_docs_fts ON documents USING gist (to_tsvector('english', content));

-- 范围类型索引
CREATE INDEX idx_events_range ON events USING gist (time_range);

-- ltree 路径索引
CREATE INDEX idx_categories_path ON categories USING gist (path);

-- GiST 适用场景
--  几何包含/相交: WHERE point_col @> point '(1,1)'
--  全文检索: WHERE to_tsvector(content) @@ to_tsquery('hello')
--  范围重叠: WHERE time_range && '[2024-01-01, 2024-12-31)'
--  最近邻: ORDER BY point_col <-> '(0,0)' LIMIT 10
```

### 1.4 GIN 索引

```sql
-- JSONB 索引
CREATE INDEX idx_data_jsonb ON records USING gin (data_jsonb);
CREATE INDEX idx_data_jsonb_path ON records USING gin (data_jsonb jsonb_path_ops);

-- 数组索引
CREATE INDEX idx_tags_array ON articles USING gin (tags);

-- 全文检索索引（比 GiST 更适合）
CREATE INDEX idx_docs_fts ON documents USING gin (to_tsvector('english', content));

-- GIN vs GiST（全文检索）
-- GIN: 构建慢、查询快、更新慢 → 读多写少
-- GiST: 构建快、查询慢、更新快 → 写多读少
```

### 1.5 SP-GiST 索引

```sql
-- 电话号码前缀索引
CREATE INDEX idx_phones ON contacts USING spgist (phone);

-- 路由前缀索引
CREATE INDEX idx_routes ON routing USING spgist (prefix);

-- SP-GiST 特点
-- 适用于: 非平衡数据结构（电话号码、路由前缀、四叉树）
-- 不支持: 范围查询
```

### 1.6 BRIN 索引

```sql
-- BRIN 索引（块范围索引）
CREATE INDEX idx_logs_time ON access_logs USING brin (created_at);
CREATE INDEX idx_logs_time_pages ON access_logs USING brin (created_at) WITH (pages_per_range = 32);

-- BRIN 特点
--  索引极小（仅为 B-tree 的 1/1000）
--  适合物理排序的大表（时序数据、日志）
--  过滤精度低（返回较多候选块）
--  不适合随机分布的数据

-- 索引大小对比
SELECT indexname, pg_size_pretty(pg_relation_size(indexname::regclass)) as size
FROM pg_indexes WHERE tablename = 'access_logs';
-- B-tree: ~500MB  |  BRIN: ~500KB
```

## 2. 高级索引技术

### 2.1 覆盖索引（Covering Index）

```sql
-- 包含列（INCLUDE）— 避免回表
CREATE INDEX idx_orders_user_covering ON orders (user_id)
  INCLUDE (order_date, total_amount);

-- Index-Only Scan（仅索引扫描）
SELECT user_id, order_date, total_amount
FROM orders
WHERE user_id = 100;
-- 直接从索引获取数据，不需要访问表

-- 检查是否使用了 Index-Only Scan
EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, order_date, total_amount
FROM orders WHERE user_id = 100;
-- Index Only Scan using idx_orders_user_covering
```

### 2.2 部分索引（Partial Index）

```sql
-- 仅索引活跃用户
CREATE INDEX idx_active_users_email ON users (email)
  WHERE is_active = true;

-- 仅索引未完成订单
CREATE INDEX idx_pending_orders ON orders (created_at)
  WHERE status = 'pending';

-- 仅索引非空值
CREATE INDEX idx_users_phone ON users (phone)
  WHERE phone IS NOT NULL;

-- 优势: 索引更小、维护成本更低
```

### 2.3 表达式索引

```sql
-- 大小写不敏感搜索
CREATE INDEX idx_users_email_lower ON users (lower(email));

SELECT * FROM users WHERE lower(email) = 'test@example.com';
-- 使用索引

-- JSONB 字段索引
CREATE INDEX idx_data_name ON records ((data->>'name'));

-- 计算列索引
CREATE INDEX idx_orders_monthly ON orders ((date_trunc('month', created_at)));
```

### 2.4 KNN 向量索引（pgvector）

```sql
-- 安装 pgvector 扩展
CREATE EXTENSION vector;

-- 创建向量列
ALTER TABLE products ADD COLUMN embedding vector(1536);

-- 创建 HNSW 索引（推荐）
CREATE INDEX idx_products_embedding ON products
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 创建 IVFFlat 索引
CREATE INDEX idx_products_embedding_ivf ON products
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- KNN 查询
SELECT id, name, 1 - (embedding <=> '[0.1,0.2,...]'::vector) as similarity
FROM products
ORDER BY embedding <=> '[0.1,0.2,...]'::vector
LIMIT 10;

-- 索引类型对比
-- HNSW: 查询快、构建慢、内存大 → 实时推荐
-- IVFFlat: 构建快、查询中、需训练 → 批量场景
```

## 3. 统计信息与 ANALYZE

### 3.1 统计信息收集

```sql
-- 手动收集统计信息
ANALYZE users;                    -- 全表
ANALYZE users (email, status);    -- 指定列

-- 调整统计目标
ALTER TABLE users ALTER COLUMN email SET STATISTICS 500;
-- 默认 100，范围 0~10000
-- 越高统计越精确，但 ANALYZE 越慢

-- 查看统计信息
SELECT attname, n_distinct, null_frac, avg_width
FROM pg_stats
WHERE tablename = 'users';

-- 查看最常见值
SELECT attname, most_common_vals, most_common_freqs
FROM pg_stats
WHERE tablename = 'users' AND attname = 'status';
```

### 3.2 扩展统计信息

```sql
-- 创建扩展统计信息（多列相关性）
CREATE STATISTICS s_orders_user_date (ndistinct, dependencies, mcv)
  ON user_id, created_at FROM orders;

ANALYZE orders;

-- 查看扩展统计信息
SELECT * FROM pg_stats_ext WHERE tablename = 'orders';

-- ndistinct: 多列组合的唯一值数量
-- dependencies: 列间函数依赖关系
-- mcv: 多列最常见值列表
```

## 4. 执行计划分析

### 4.1 EXPLAIN 用法

```sql
-- 查看执行计划
EXPLAIN SELECT * FROM orders WHERE user_id = 100;

-- 查看实际执行统计
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM orders WHERE user_id = 100;

-- JSON 格式输出
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM orders WHERE user_id = 100;

-- WAL 信息
EXPLAIN (ANALYZE, WAL) UPDATE orders SET status = 'done' WHERE id = 1;
```

### 4.2 常见扫描类型

| 扫描类型        | 说明            | 适用场景             |
| :-------------- | :-------------- | :------------------- |
| Seq Scan        | 顺序扫描全表    | 小表、无可用索引     |
| Index Scan      | 索引扫描 + 回表 | 选择性高的查询       |
| Index Only Scan | 仅索引扫描      | 覆盖索引             |
| Bitmap Scan     | 位图索引扫描    | 选择性中等           |
| Tid Scan        | TID 扫描        | WHERE ctid = ...     |
| Subquery Scan   | 子查询扫描      | FROM 子查询          |
| Function Scan   | 函数扫描        | FROM generate_series |

### 4.3 代价估算解读

```
EXPLAIN 输出示例:
Index Scan using idx_orders_user on orders  (cost=0.42..8.44 rows=1 width=72)

cost 解读:
  0.42 — 启动代价（获取第一行前的代价）
  8.44 — 总代价（获取所有行的代价）
  rows — 估计返回行数
  width — 估计每行平均字节数

代价单位: 任意单位（seq_page_cost 的倍数）
默认: seq_page_cost=1.0, random_page_cost=4.0
SSD 建议: random_page_cost=1.1
```

### 4.4 常见优化案例

```sql
-- 案例1: 避免全表扫描
-- 问题: 函数导致无法使用索引
SELECT * FROM users WHERE lower(email) = 'test@example.com';
-- 解决: 创建表达式索引
CREATE INDEX idx_users_email_lower ON users (lower(email));

-- 案例2: OR 条件优化
-- 问题: OR 导致索引失效
SELECT * FROM orders WHERE user_id = 100 OR status = 'pending';
-- 解决: 使用 UNION ALL
SELECT * FROM orders WHERE user_id = 100
UNION ALL
SELECT * FROM orders WHERE status = 'pending' AND user_id != 100;

-- 案例3: LIMIT 优化
-- 问题: 排序大量数据后取少量行
SELECT * FROM logs ORDER BY created_at DESC LIMIT 10;
-- 解决: 创建降序索引
CREATE INDEX idx_logs_created_desc ON logs (created_at DESC);

-- 案例4: JOIN 优化
-- 问题: 嵌套循环连接大表
EXPLAIN SELECT * FROM orders o JOIN users u ON o.user_id = u.id;
-- 解决: 确保连接列有索引，增加 work_mem
SET work_mem = '64MB';
```

## 5. 并行查询

### 5.1 并行查询配置

```ini
# postgresql.conf
max_worker_processes = 8                    # 最大工作进程
max_parallel_workers_per_gather = 4         # 每个 Gather 最大并行度
max_parallel_workers = 8                    # 最大并行工作进程
parallel_tuple_cost = 0.1                   # 并行元组代价
parallel_setup_cost = 1000.0                # 并行启动代价
min_parallel_table_scan_size = 8MB          # 最小并行扫描表大小
min_parallel_index_scan_size = 512kB        # 最小并行索引扫描大小
```

### 5.2 并行查询类型

```sql
-- 并行顺序扫描
SET max_parallel_workers_per_gather = 4;
EXPLAIN (ANALYZE) SELECT COUNT(*) FROM large_table;
-- Gather -> Parallel Seq Scan

-- 并行索引扫描
EXPLAIN (ANALYZE) SELECT * FROM large_table WHERE id > 100000;
-- Gather -> Parallel Index Scan

-- 并行聚合
EXPLAIN (ANALYZE) SELECT avg(amount) FROM orders GROUP BY user_id;
-- Finalize Aggregate -> Gather -> Partial Aggregate

-- 并行 JOIN
EXPLAIN (ANALYZE)
SELECT * FROM orders o JOIN order_items i ON o.id = i.order_id;
-- Gather -> Parallel Hash Join

-- 禁用并行（调试用）
SET max_parallel_workers_per_gather = 0;
```

## 6. 分区表

### 6.1 范围分区（Range）

```sql
-- 创建分区主表
CREATE TABLE access_logs (
    id BIGSERIAL,
    user_id INTEGER,
    action TEXT,
    created_at TIMESTAMP
) PARTITION BY RANGE (created_at);

-- 创建分区
CREATE TABLE access_logs_2024_q1 PARTITION OF access_logs
  FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
CREATE TABLE access_logs_2024_q2 PARTITION OF access_logs
  FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');
CREATE TABLE access_logs_2024_q3 PARTITION OF access_logs
  FOR VALUES FROM ('2024-07-01') TO ('2024-10-01');
CREATE TABLE access_logs_2024_q4 PARTITION OF access_logs
  FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');

-- 默认分区
CREATE TABLE access_logs_default PARTITION OF access_logs DEFAULT;

-- 自动创建分区（pg_partman 扩展）
CREATE EXTENSION pg_partman;
SELECT partman.create_parent(
  p_parent_table := 'public.access_logs',
  p_control := 'created_at',
  p_type := 'range',
  p_interval := '1 month',
  p_premake := 6
);
```

### 6.2 列表分区（List）

```sql
CREATE TABLE orders (
    id BIGSERIAL,
    user_id INTEGER,
    region TEXT,
    total NUMERIC(10,2)
) PARTITION BY LIST (region);

CREATE TABLE orders_cn PARTITION OF orders FOR VALUES IN ('CN');
CREATE TABLE orders_us PARTITION OF orders FOR VALUES IN ('US');
CREATE TABLE orders_eu PARTITION OF orders FOR VALUES IN ('EU', 'UK', 'DE');
CREATE TABLE orders_other PARTITION OF orders DEFAULT;
```

### 6.3 哈希分区（Hash）

```sql
CREATE TABLE events (
    id BIGSERIAL,
    event_type TEXT,
    payload JSONB,
    created_at TIMESTAMP
) PARTITION BY HASH (id);

-- 创建 8 个哈希分区
CREATE TABLE events_p0 PARTITION OF events FOR VALUES WITH (MODULUS 8, REMAINDER 0);
CREATE TABLE events_p1 PARTITION OF events FOR VALUES WITH (MODULUS 8, REMAINDER 1);
CREATE TABLE events_p2 PARTITION OF events FOR VALUES WITH (MODULUS 8, REMAINDER 2);
CREATE TABLE events_p3 PARTITION OF events FOR VALUES WITH (MODULUS 8, REMAINDER 3);
CREATE TABLE events_p4 PARTITION OF events FOR VALUES WITH (MODULUS 8, REMAINDER 4);
CREATE TABLE events_p5 PARTITION OF events FOR VALUES WITH (MODULUS 8, REMAINDER 5);
CREATE TABLE events_p6 PARTITION OF events FOR VALUES WITH (MODULUS 8, REMAINDER 6);
CREATE TABLE events_p7 PARTITION OF events FOR VALUES WITH (MODULUS 8, REMAINDER 7);
```

### 6.4 分区裁剪（Partition Pruning）

```sql
-- 查询时自动裁剪不需要的分区
EXPLAIN (ANALYZE)
SELECT * FROM access_logs
WHERE created_at >= '2024-03-01' AND created_at < '2024-04-01';
-- 仅扫描 access_logs_2024_q1

-- 确保分区裁剪生效
SET enable_partition_pruning = on;  -- 默认开启

-- 运行时分区裁剪（参数化查询）
PREPARE query_logs(TIMESTAMP) AS
  SELECT * FROM access_logs WHERE created_at >= $1;
EXPLAIN (ANALYZE) EXECUTE query_logs('2024-03-01');
```

### 6.5 分区连接（Partitionwise Join）

```sql
-- 启用分区级连接
SET enable_partitionwise_join = on;
SET enable_partitionwise_aggregate = on;

-- 两个分区表连接时，对应分区直接连接
EXPLAIN
SELECT * FROM orders o JOIN order_items i ON o.id = i.order_id;
-- 每对分区单独连接，减少内存使用
```

### 6.6 分区维护

```sql
-- 分离分区
ALTER TABLE access_logs DETACH PARTITION access_logs_2024_q1;

-- 附加分区
ALTER TABLE access_logs ATTACH PARTITION access_logs_2024_q1
  FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

-- 删除旧分区（比 DELETE 快得多）
DROP TABLE access_logs_2023_q1;

-- 分区索引（自动传播到子分区）
CREATE INDEX idx_logs_user ON access_logs (user_id);
-- 等效于在每个分区上创建索引
```
