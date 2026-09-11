---
order: 440
title: 性能优化
module: 'sql'
category: 数据库
difficulty: advanced
description: 执行计划、索引策略、查询重写、统计信息、参数化查询、分区表与物化视图
author: fanquanpp
updated: '2026-09-12'
related:
  - 'sql/260-WindowFunction'
  - 'sql/320-AdvancedQuery'
  - 'sql/330-PLSQLStoredProcedure'
  - 'sql/450-SQLPracticeInterview'
prerequisites: []
---

## 执行计划

执行计划是数据库查询优化器选择的执行路径，是性能优化的核心工具。

### EXPLAIN 基本用法

```sql
-- PostgreSQL
EXPLAIN SELECT * FROM users WHERE email = 'alice@example.com';

-- 带实际执行时间和行数
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'alice@example.com';

-- 更详细的输出
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM users WHERE email = 'alice@example.com';

-- MySQL
EXPLAIN SELECT * FROM users WHERE email = 'alice@example.com';

-- MySQL 8.0: JSON 格式（更详细）
EXPLAIN FORMAT=JSON SELECT * FROM users WHERE email = 'alice@example.com';

-- SQL Server
SET SHOWPLAN_TEXT ON;
GO
SELECT * FROM users WHERE email = 'alice@example.com';
GO

-- 实际执行计划
SET STATISTICS IO ON;
SET STATISTICS TIME ON;
SELECT * FROM users WHERE email = 'alice@example.com';
```

### PostgreSQL 执行计划解读

```
EXPLAIN ANALYZE SELECT u.name, COUNT(o.id)
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'
GROUP BY u.name;

-- 输出示例:
-- HashAggregate  (cost=1250.00..1300.00 rows=1000 width=36) (actual time=15.2..16.8 rows=950 loops=1)
--   ->  Hash Join  (cost=450.00..1100.00 rows=5000 width=36) (actual time=5.1..12.3 rows=5200 loops=1)
--         Hash Cond: (o.user_id = u.id)
--         ->  Seq Scan on orders o  (cost=0.00..400.00 rows=20000 width=8) (actual time=0.01..3.5 rows=20000 loops=1)
--         ->  Hash  (cost=300.00..300.00 rows=5000 width=36) (actual time=4.8..4.8 rows=5000 loops=1)
--               ->  Seq Scan on users u  (cost=0.00..300.00 rows=5000 width=36) (actual time=0.01..2.8 rows=5000 loops=1)
--                     Filter: (created_at > '2024-01-01')
```

### 关键指标

| 指标          | 含义                     | 关注点                                |
| ------------- | ------------------------ | ------------------------------------- |
| `cost`        | 估算成本（启动..总成本） | 总成本越低越好                        |
| `rows`        | 估算行数                 | 与 actual rows 差距大说明统计信息不准 |
| `actual time` | 实际耗时（ms）           | 真实性能指标                          |
| `loops`       | 执行次数                 | 嵌套循环中内层循环次数                |
| `buffers`     | 缓冲区命中/读取          | shared hit 高说明缓存命中好           |

### 常见扫描类型

```sql
-- Seq Scan（顺序扫描）: 全表扫描
-- 适合: 小表、没有合适索引、返回大部分行
Seq Scan on users  (cost=0.00..300.00 rows=10000)

-- Index Scan（索引扫描）: 通过索引定位行
-- 适合: 返回少量行、有精确匹配条件
Index Scan using idx_users_email on users  (cost=0.29..8.31 rows=1)

-- Index Only Scan（仅索引扫描）: 只读索引不回表
-- 适合: 查询列都在索引中
Index Only Scan using idx_users_email on users  (cost=0.29..4.31 rows=1)

-- Bitmap Scan（位图扫描）: 先收集索引位图，再批量取行
-- 适合: 返回较多行、多条件组合
Bitmap Heap Scan on users  (cost=100.00..500.00 rows=5000)
  ->  Bitmap Index Scan on idx_users_status  (cost=0.00..50.00 rows=5000)
```

### 常见 Join 策略

```
-- Nested Loop（嵌套循环）: 适合小表驱动大表
-- 外层每行扫描内层一次
Nested Loop  (cost=0.58..33.65 rows=10)
  ->  Index Scan on users  (cost=0.29..8.31 rows=1)
  ->  Index Scan on orders  (cost=0.29..25.34 rows=10)

-- Hash Join（哈希连接）: 适合等值连接、大表
-- 内表构建哈希表，外表探测
Hash Join  (cost=450.00..1100.00 rows=5000)
  ->  Seq Scan on orders  (cost=0.00..400.00 rows=20000)
  ->  Hash  (cost=300.00..300.00 rows=5000)
        ->  Seq Scan on users  (cost=0.00..300.00 rows=5000)

-- Merge Join（归并连接）: 适合已排序数据、大表
-- 两边按连接键排序后归并
Merge Join  (cost=0.86..55.00 rows=100)
  ->  Index Scan on users  (cost=0.29..25.00 rows=1000)
  ->  Index Scan on orders  (cost=0.29..25.00 rows=1000)
```

## 索引策略

### B-Tree 索引最佳实践

```sql
-- 1. 选择性高的列优先
--  email 选择性高（几乎唯一）
CREATE INDEX idx_users_email ON users(email);
--  gender 选择性低（只有 M/F）
-- 不建议单独为 gender 建索引

-- 2. 复合索引的列顺序（最左前缀原则）
-- 查询模式: WHERE a = ? AND b = ? AND c = ?
CREATE INDEX idx_t_abc ON t(a, b, c);
-- 支持: (a), (a,b), (a,b,c)
-- 不支持: (b), (c), (b,c)

-- 3. 覆盖索引（避免回表）
-- 查询: SELECT name, email FROM users WHERE department = ?
CREATE INDEX idx_users_dept_name_email ON users(department, name, email);
-- Index Only Scan: 不需要回表取数据

-- 4. 排序优化
-- 查询: SELECT * FROM orders ORDER BY created_at DESC LIMIT 10
CREATE INDEX idx_orders_created_desc ON orders(created_at DESC);
-- 索引本身有序，避免排序操作
```

### 特殊索引类型

```sql
-- PostgreSQL GIN 索引（JSONB / 数组 / 全文搜索）
CREATE INDEX idx_products_attrs ON products USING gin(attrs jsonb_path_ops);
CREATE INDEX idx_articles_tags ON articles USING gin(tags);
CREATE INDEX idx_articles_fts ON articles USING gin(to_tsvector('english', content));

-- PostgreSQL BRIN 索引（大表时序数据）
-- 块级索引，体积极小，适合自然排序的数据
CREATE INDEX idx_logs_created ON logs USING brin(created_at) WITH (pages_per_range = 32);

-- PostgreSQL 部分索引
CREATE INDEX idx_active_users_email ON users(email) WHERE is_active = true;

-- PostgreSQL 表达式索引
CREATE INDEX idx_users_lower_email ON users(LOWER(email));

-- MySQL 前缀索引
CREATE INDEX idx_articles_title ON articles(title(50));

-- MySQL 函数索引（8.0+）
CREATE INDEX idx_users_lower_email ON users((LOWER(email)));
```

### 索引失效场景

```sql
-- 1. 对索引列使用函数
--
SELECT * FROM users WHERE LOWER(email) = 'alice@example.com';
--
SELECT * FROM users WHERE email = LOWER('Alice@Example.com');
-- 或创建表达式索引

-- 2. 隐式类型转换
--  (email 是 VARCHAR，传入整数会隐式转换)
SELECT * FROM users WHERE email = 12345;
--
SELECT * FROM users WHERE email = '12345';

-- 3. LIKE 前缀通配符
--
SELECT * FROM users WHERE name LIKE '%alice';
--
SELECT * FROM users WHERE name LIKE 'alice%';

-- 4. OR 条件
--  (如果两列分别有索引，OR 可能不走索引)
SELECT * FROM users WHERE email = 'a@b.com' OR phone = '123456';
--  使用 UNION
SELECT * FROM users WHERE email = 'a@b.com'
UNION
SELECT * FROM users WHERE phone = '123456';

-- 5. 不等于
--  大部分数据都不等于某值时，全表扫描更快
SELECT * FROM users WHERE status != 'inactive';

-- 6. IS NULL（部分数据库）
-- PostgreSQL: B-Tree 索引支持 IS NULL
-- MySQL: 索引支持 IS NULL
```

## 查询重写

### 避免SELECT \*

```sql
--  返回不需要的列，浪费 I/O 和网络
SELECT * FROM users WHERE id = 1;

--  只查需要的列
SELECT name, email FROM users WHERE id = 1;
```

### 子查询改写为 JOIN

```sql
--  相关子查询（每行执行一次子查询）
SELECT u.name,
  (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count
FROM users u;

--  LEFT JOIN + GROUP BY（更高效）
SELECT u.name, COALESCE(o.cnt, 0) AS order_count
FROM users u
LEFT JOIN (SELECT user_id, COUNT(*) AS cnt FROM orders GROUP BY user_id) o
ON u.id = o.user_id;
```

### UNION 优化

```sql
--  UNION 会去重（排序操作）
SELECT name FROM customers WHERE region = 'North'
UNION
SELECT name FROM suppliers WHERE region = 'North';

--  如果确定无重复，用 UNION ALL
SELECT name FROM customers WHERE region = 'North'
UNION ALL
SELECT name FROM suppliers WHERE region = 'North';
```

### 分页优化

```sql
--  深分页：OFFSET 需要跳过前面所有行
SELECT * FROM orders ORDER BY id LIMIT 10 OFFSET 1000000;

--  游标分页（Keyset Pagination）
SELECT * FROM orders WHERE id > 1000000 ORDER BY id LIMIT 10;

--  延迟关联（先查 ID 再关联）
SELECT o.* FROM orders o
JOIN (SELECT id FROM orders ORDER BY id LIMIT 10 OFFSET 1000000) t
ON o.id = t.id;
```

### EXISTS 替代 IN

```sql
--  IN 子查询可能生成临时表
SELECT * FROM orders
WHERE customer_id IN (SELECT id FROM customers WHERE vip = true);

--  EXISTS 通常更高效（短路求值）
SELECT * FROM orders o
WHERE EXISTS (SELECT 1 FROM customers c WHERE c.id = o.customer_id AND c.vip = true);

--  JOIN 也可以（如果不需要去重）
SELECT DISTINCT o.* FROM orders o
JOIN customers c ON o.customer_id = c.id AND c.vip = true;
```

## 统计信息

统计信息是查询优化器决策的基础，过时的统计信息会导致错误的执行计划。

```sql
-- PostgreSQL: 查看统计信息
SELECT * FROM pg_stats WHERE tablename = 'users';

-- 手动更新统计信息
ANALYZE users;                    -- 单表
ANALYZE users(email, status);     -- 指定列
VACUUM ANALYZE;                   -- 清理 + 分析全库

-- MySQL: 更新统计信息
ANALYZE TABLE users;

-- SQL Server
UPDATE STATISTICS users;

-- 增加统计信息采样率（PostgreSQL）
ALTER TABLE users ALTER COLUMN email SET STATISTICS 500;
ANALYZE users;

-- 查看表的行数估算
-- PostgreSQL
SELECT reltuples::bigint AS estimate FROM pg_class WHERE relname = 'users';
-- 精确行数
SELECT COUNT(*) FROM users;
```

## 参数化查询

```sql
--  SQL 注入风险 + 无法利用预编译缓存
-- 应用层拼接 SQL:
-- "SELECT * FROM users WHERE name = '" + userName + "'"

--  参数化查询
-- PostgreSQL (libpq)
PREPARE get_user(TEXT) AS
  SELECT * FROM users WHERE name = $1;
EXECUTE get_user('Alice');

-- MySQL (Prepared Statement)
PREPARE stmt FROM 'SELECT * FROM users WHERE name = ?';
SET @name = 'Alice';
EXECUTE stmt USING @name;
DEALLOCATE PREPARE stmt;

-- 应用层（以 Python 为例）
--  参数化
cursor.execute("SELECT * FROM users WHERE name = %s", (user_name,))
--  字符串拼接
cursor.execute(f"SELECT * FROM users WHERE name = '{user_name}'")
```

## 分区表

### PostgreSQL 分区

```sql
-- 范围分区（按日期）
CREATE TABLE orders (
  id BIGINT,
  order_date DATE,
  amount DECIMAL(10,2),
  customer_id INT
) PARTITION BY RANGE (order_date);

-- 创建分区
CREATE TABLE orders_2024_q1 PARTITION OF orders
  FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
CREATE TABLE orders_2024_q2 PARTITION OF orders
  FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');
CREATE TABLE orders_2024_q3 PARTITION OF orders
  FOR VALUES FROM ('2024-07-01') TO ('2024-10-01');
CREATE TABLE orders_2024_q4 PARTITION OF orders
  FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');

-- 默认分区（兜底）
CREATE TABLE orders_default PARTITION OF orders DEFAULT;

-- 列表分区
CREATE TABLE users_by_region PARTITION BY LIST (region);
CREATE TABLE users_asia PARTITION OF users_by_region
  FOR VALUES IN ('China', 'Japan', 'Korea');
CREATE TABLE users_europe PARTITION OF users_by_region
  FOR VALUES IN ('UK', 'France', 'Germany');

-- 哈希分区
CREATE TABLE logs PARTITION BY HASH (id);
CREATE TABLE logs_p0 PARTITION OF logs FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE logs_p1 PARTITION OF logs FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE logs_p2 PARTITION OF logs FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE logs_p3 PARTITION OF logs FOR VALUES WITH (MODULUS 4, REMAINDER 3);

-- 分区裁剪（自动优化）
EXPLAIN SELECT * FROM orders WHERE order_date >= '2024-04-01';
-- 只会扫描 orders_2024_q2, orders_2024_q3, orders_2024_q4

-- 快速删除旧分区
DROP TABLE orders_2022_q1;  -- 比DELETE快得多
```

### MySQL 分区

```sql
-- 范围分区
CREATE TABLE orders (
  id BIGINT AUTO_INCREMENT,
  order_date DATE,
  amount DECIMAL(10,2),
  PRIMARY KEY (id, order_date)
) PARTITION BY RANGE (YEAR(order_date)) (
  PARTITION p2023 VALUES LESS THAN (2024),
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION pmax VALUES LESS THAN MAXVALUE
);

-- 添加分区
ALTER TABLE orders ADD PARTITION (PARTITION p2025 VALUES LESS THAN (2026));

-- 删除分区
ALTER TABLE orders DROP PARTITION p2023;
```

## 物化视图

物化视图将查询结果物理存储，适合昂贵的聚合查询。

### PostgreSQL 物化视图

```sql
-- 创建物化视图
CREATE MATERIALIZED VIEW mv_daily_sales AS
SELECT
  DATE(order_date) AS sale_date,
  COUNT(*) AS order_count,
  SUM(amount) AS total_amount,
  AVG(amount) AS avg_amount
FROM orders
GROUP BY DATE(order_date);

-- 查询物化视图（直接读缓存数据）
SELECT * FROM mv_daily_sales WHERE sale_date >= '2024-01-01';

-- 刷新物化视图
REFRESH MATERIALIZED VIEW mv_daily_sales;              -- 阻塞读取
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_sales;  -- 不阻塞读取（需唯一索引）

-- 为物化视图创建索引
CREATE UNIQUE INDEX idx_mv_daily_sales_date ON mv_daily_sales(sale_date);

-- 删除物化视图
DROP MATERIALIZED VIEW mv_daily_sales;
```

### Oracle 物化视图

```sql
-- 创建带自动刷新的物化视图
CREATE MATERIALIZED VIEW mv_daily_sales
REFRESH COMPLETE ON COMMIT  -- 提交时刷新
-- REFRESH FAST ON COMMIT   -- 增量刷新（需物化视图日志）
-- REFRESH COMPLETE ON DEMAND -- 手动刷新
AS
SELECT
  TRUNC(order_date) AS sale_date,
  COUNT(*) AS order_count,
  SUM(amount) AS total_amount
FROM orders
GROUP BY TRUNC(order_date);

-- 手动刷新
EXEC DBMS_MVIEW.REFRESH('mv_daily_sales', 'C');  -- C=COMPLETE, F=FAST
```

### SQL Server 索引视图

```sql
-- 创建带 SCHEMABINDING 的视图
CREATE VIEW mv_daily_sales
WITH SCHEMABINDING
AS
SELECT
  CONVERT(DATE, order_date) AS sale_date,
  COUNT_BIG(*) AS order_count,
  SUM(ISNULL(amount, 0)) AS total_amount
FROM dbo.orders
GROUP BY CONVERT(DATE, order_date);

-- 创建聚集索引（使视图物化）
CREATE UNIQUE CLUSTERED INDEX idx_mv_daily_sales
ON mv_daily_sales(sale_date);
```

## 小结

- `EXPLAIN ANALYZE` 是性能优化的起点，关注估算行数与实际行数的偏差
- B-Tree 索引适合等值和范围查询，GIN 适合 JSON/全文，BRIN 适合时序大表
- 复合索引遵循最左前缀原则，覆盖索引可避免回表
- 避免索引列使用函数、隐式类型转换、前缀通配符等导致索引失效
- 深分页使用游标分页，子查询优先改写为 JOIN
- 分区表将大表拆分为小表，分区裁剪自动优化查询
- 物化视图缓存聚合结果，适合报表和仪表盘场景
## 索引优化

**基本写法：创建合适索引**
`CREATE INDEX <索引名> ON <表>(<列>)`
```sql
-- 为 WHERE 条件列创建索引
CREATE INDEX idx_user_id ON orders(user_id);
-- 为 JOIN 条件列创建索引
CREATE INDEX idx_dept_id ON employees(dept_id);
```

---

**基本写法：复合索引**
`CREATE INDEX <索引名> ON <表>(<列1>, <列2>)`
```sql
-- 多条件查询使用复合索引
CREATE INDEX idx_user_status_date ON orders(user_id, status, create_date);
-- 查询：WHERE user_id=1 AND status='paid'
-- 查询：WHERE user_id=1 AND status='paid' AND create_date > '2026-01-01'
-- 都能命中索引
```

---

**基本写法：覆盖索引**
`-- 索引包含查询所需的所有列`
```sql
-- 查询只需要索引列时，无需回表
CREATE INDEX idx_cover ON employees(dept_id, name, salary);

SELECT name, salary FROM employees WHERE dept_id = 5;
-- Extra: Using index（覆盖索引，性能最优）
```

---

**基本写法：前缀索引**
`CREATE INDEX <索引名> ON <表>(<列>(<前缀长度>))`
```sql
-- 长字符串列使用前缀索引节省空间
CREATE INDEX idx_email ON users(email(10));
-- 仅索引前 10 个字符
```

---

**基本写法：函数索引（MySQL 8.0.13+）**
`CREATE INDEX <索引名> ON <表>((<表达式>))`
```sql
-- MySQL 8.0.13 起才支持函数索引（5.7 无此能力，需生成列 + 索引替代）
-- 为函数表达式创建索引
CREATE INDEX idx_lower_email ON users((LOWER(email)));
-- 查询 WHERE LOWER(email) = 'test@example.com' 可用索引

-- PostgreSQL
CREATE INDEX idx_upper_name ON employees(UPPER(name));
```

---

**基本写法：删除无用索引**
`DROP INDEX <索引名> ON <表>`
```sql
-- 索引会降低写入性能，删除不使用的索引
DROP INDEX idx_unused ON users;
```

---

## 查询优化

**基本写法：只查询需要的列**
`SELECT <列1>, <列2> FROM <表>`
```sql
-- 避免 SELECT *
SELECT id, name, email FROM users WHERE active = 1;
```

---

**基本写法：LIMIT 分页**
`SELECT * FROM <表> LIMIT <数量> OFFSET <偏移>`
```sql
-- 深度分页优化：避免大 OFFSET
-- 反模式：OFFSET 1000000（扫描 100 万行）
-- SELECT * FROM orders ORDER BY id LIMIT 10 OFFSET 1000000;

-- 正确：使用游标分页
SELECT * FROM orders
WHERE id > 1000000
ORDER BY id
LIMIT 10;
```

---

**基本写法：JOIN 优化小表驱动大表**
`SELECT * FROM <小表> JOIN <大表> ON <条件>`
```sql
-- 小表驱动大表（小表在外层）
SELECT * FROM small_table s
JOIN large_table l ON l.small_id = s.id
WHERE s.status = 'active';
```

---

**基本写法：子查询优化为 JOIN**
`SELECT ... FROM <表1> JOIN <表2> ON <条件>`
```sql
-- IN 子查询改为 JOIN
-- 反模式
-- SELECT * FROM orders WHERE user_id IN (SELECT id FROM users WHERE vip=1);

-- 优化为 JOIN
SELECT o.* FROM orders o
JOIN users u ON o.user_id = u.id
WHERE u.vip = 1;
```

---

**基本写法：批量插入**
`INSERT INTO <表> (<列>) VALUES (<值1>), (<值2>), ...`
```sql
-- 批量插入比逐条快
INSERT INTO users (name, email) VALUES
  ('Alice', 'a@test.com'),
  ('Bob', 'b@test.com'),
  ('Charlie', 'c@test.com');
```

---

**基本写法：INSERT ... ON DUPLICATE KEY UPDATE**
`INSERT INTO <表> (<列>) VALUES (<值>) ON DUPLICATE KEY UPDATE <列>=<值>`
```sql
-- MySQL UPSERT 避免先查后插
INSERT INTO counters (id, count) VALUES (1, 1)
ON DUPLICATE KEY UPDATE count = count + 1;
```

---

**基本写法：PostgreSQL UPSERT**
`INSERT INTO <表> (<列>) VALUES (<值>) ON CONFLICT (<列>) DO UPDATE SET <列>=<值>`
```sql
-- PostgreSQL UPSERT
INSERT INTO counters (id, count) VALUES (1, 1)
ON CONFLICT (id) DO UPDATE SET count = counters.count + 1;
```

---

## 执行计划分析

**基本写法：检查 type 字段**
`EXPLAIN SELECT ...`
```sql
-- type 从好到差：
-- const > eq_ref > ref > range > index > ALL
-- ALL 表示全表扫描，必须优化
EXPLAIN SELECT * FROM users WHERE email = 'test@test.com';
-- 确保 type 为 ref 或更好
```

---

**基本写法：检查 Extra 字段**
`-- 关注 Using filesort 和 Using temporary`
```sql
-- Using filesort: 额外排序，考虑加索引
-- Using temporary: 使用临时表，需优化
-- Using index: 覆盖索引，性能好

EXPLAIN SELECT dept, COUNT(*) FROM employees GROUP BY dept;
-- 如果出现 Using temporary; Using filesort
-- 考虑为 dept 加索引
```

---

## 表结构优化

**基本写法：选择合适数据类型**
`-- 使用最小够用的类型`
```sql
-- 优先使用精确类型
-- TINYINT(1)  代替  INT      节省 3 字节
-- SMALLINT    代替  INT      节省 2 字节
-- VARCHAR(N)  代替  CHAR(N) 变长节省空间
-- DATETIME    代替  VARCHAR 存日期

CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  status TINYINT DEFAULT 0,       -- 而非 INT
  name VARCHAR(50),                -- 而非 CHAR(255)
  email VARCHAR(100)
);
```

---

**基本写法：避免过度规范化**
`-- 高频关联的表可适当冗余`
```sql
-- 订单表冗余商品名称（减少 JOIN）
CREATE TABLE orders (
  id INT PRIMARY KEY,
  product_id INT,
  product_name VARCHAR(100),  -- 冗余字段
  qty INT,
  price DECIMAL(10,2)
);
-- 查询时无需 JOIN products 表
```

---

**基本写法：分区表**
`PARTITION BY <方式>(<列>)`
```sql
-- MySQL 按范围分区
CREATE TABLE logs (
  id BIGINT AUTO_INCREMENT,
  create_time DATETIME,
  level VARCHAR(10),
  message TEXT,
  PRIMARY KEY (id, create_time)
)
PARTITION BY RANGE (TO_DAYS(create_time)) (
  PARTITION p202601 VALUES LESS THAN (TO_DAYS('2026-02-01')),
  PARTITION p202602 VALUES LESS THAN (TO_DAYS('2026-03-01')),
  PARTITION pmax VALUES LESS THAN MAXVALUE
);
```

---

## 缓存优化

**基本写法：使用 SQL_CACHE**
`SELECT SQL_CACHE * FROM <表>`
```sql
-- MySQL 查询缓存（8.0 已移除，仅旧版本）
SELECT SQL_CACHE * FROM users WHERE id = 1;
```

---

**基本写法：应用层缓存**
`-- 高频查询结果缓存到 Redis`
```sql
-- 数据库层面：减少重复查询
-- 对于不变的配置数据，应用层缓存
-- SELECT * FROM config;  -- 每次启动加载一次，缓存到内存
```

---

## 配置优化

**基本写法：InnoDB 缓冲池**
`SET GLOBAL innodb_buffer_pool_size = <字节>`
```sql
-- 设置 InnoDB 缓冲池大小（建议物理内存的 70-80%）
SET GLOBAL innodb_buffer_pool_size = 4294967296;  -- 4GB
```

---

**基本写法：连接池配置**
`SET GLOBAL max_connections = <数量>`
```sql
-- MySQL 最大连接数
SET GLOBAL max_connections = 200;
-- 查看当前连接数
SHOW STATUS LIKE 'Threads_connected';
```

---

**基本写法：PostgreSQL 配置**
`-- 修改 postgresql.conf`
```ini
# postgresql.conf 关键参数
shared_buffers = 2GB          # 内存 25%
effective_cache_size = 6GB     # 内存 75%
work_mem = 16MB
maintenance_work_mem = 256MB
max_connections = 100
```

---

## 慢查询排查

**基本写法：开启慢查询日志**
`SET GLOBAL slow_query_log = ON;`
```sql
-- 开启慢查询日志
SET GLOBAL slow_query_log = ON;
SET GLOBAL long_query_time = 1;  -- 超过 1 秒
```

---

**基本写法：分析慢查询日志**
`-- 使用 mysqldumpslow 分析`
```bash
# 统计慢查询 Top 10
mysqldumpslow -s t -t 10 /var/log/mysql/slow.log

# 按返回行数排序
mysqldumpslow -s r -t 10 /var/log/mysql/slow.log
```

---

**基本写法：实时查看正在执行的查询**
`SHOW PROCESSLIST;`
```sql
-- 查看当前正在执行的查询
SHOW FULL PROCESSLIST;

-- PostgreSQL
SELECT * FROM pg_stat_activity
WHERE state = 'active';
```
