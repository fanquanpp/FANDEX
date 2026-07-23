---
order: 4
title: 高级SQL与扩展
module: postgresql
category: PostgreSQL
difficulty: advanced
description: 窗口函数、CTE与递归CTE、横向连接、分组集、MERGE语句、JSON_TABLE、全文检索、PostGIS、PL/pgSQL、触发器、FDW。
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/事务与并发控制
  - postgresql/索引与查询优化
  - postgresql/复制与高可用
  - postgresql/语法速查
prerequisites: []
---

## 1. 窗口函数

### 1.1 基本语法

```sql
-- 窗口函数语法
function_name() OVER (
  [PARTITION BY expr]
  [ORDER BY expr [ASC|DESC]]
  [frame_clause]
)

-- frame_clause:
-- ROWS BETWEEN start AND end
-- RANGE BETWEEN start AND end
-- start/end: UNBOUNDED PRECEDING | n PRECEDING | CURRENT ROW | n FOLLOWING | UNBOUNDED FOLLOWING
```

### 1.2 常用窗口函数

```sql
-- 排名函数
SELECT name, score,
  ROW_NUMBER() OVER (ORDER BY score DESC) AS row_num,
  RANK() OVER (ORDER BY score DESC) AS rank_val,
  DENSE_RANK() OVER (ORDER BY score DESC) AS dense_rank,
  PERCENT_RANK() OVER (ORDER BY score DESC) AS pct_rank
FROM students;

-- 聚合函数
SELECT product, month, revenue,
  SUM(revenue) OVER (PARTITION BY product ORDER BY month
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total,
  AVG(revenue) OVER (PARTITION BY product ORDER BY month
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS moving_avg_3m,
  SUM(revenue) OVER (PARTITION BY product) AS product_total
FROM sales;

-- 偏移函数
SELECT product, month, revenue,
  LAG(revenue, 1) OVER (PARTITION BY product ORDER BY month) AS prev_month,
  LEAD(revenue, 1) OVER (PARTITION BY product ORDER BY month) AS next_month,
  revenue - LAG(revenue, 1) OVER (PARTITION BY product ORDER BY month) AS growth
FROM sales;

-- 取值函数
SELECT product, month, revenue,
  FIRST_VALUE(revenue) OVER (PARTITION BY product ORDER BY month
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS first_rev,
  LAST_VALUE(revenue) OVER (PARTITION BY product ORDER BY month
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS last_rev,
  NTH_VALUE(revenue, 2) OVER (PARTITION BY product ORDER BY month
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS second_rev
FROM sales;
```

### 1.3 实战案例

```sql
-- 每个部门薪资前3名
SELECT * FROM (
  SELECT dept, name, salary,
    ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC) AS rn
  FROM employees
) t WHERE rn <= 3;

-- 连续登录天数
SELECT user_id, login_date,
  login_date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date))::int AS grp
FROM user_logins
GROUP BY user_id, login_date;

-- 计算连续登录天数
SELECT user_id, COUNT(*) AS consecutive_days
FROM (
  SELECT user_id, login_date,
    login_date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date))::int AS grp
  FROM (SELECT DISTINCT user_id, login_date::date FROM user_logins) t1
) t2
GROUP BY user_id, grp
HAVING COUNT(*) >= 7;
```

## 2. CTE 与递归 CTE

### 2.1 普通 CTE

```sql
-- CTE 提高可读性
WITH monthly_sales AS (
  SELECT date_trunc('month', order_date) AS month,
    SUM(amount) AS total
  FROM orders
  GROUP BY 1
),
ranked AS (
  SELECT month, total,
    RANK() OVER (ORDER BY total DESC) AS rank_val
  FROM monthly_sales
)
SELECT month, total, rank_val
FROM ranked
WHERE rank_val <= 5;
```

### 2.2 递归 CTE

```sql
-- 组织层级遍历
WITH RECURSIVE org_tree AS (
  -- 锚点：顶级管理者
  SELECT id, name, manager_id, 1 AS level, name::text AS path
  FROM employees
  WHERE manager_id IS NULL

  UNION ALL

  -- 递归：下属员工
  SELECT e.id, e.name, e.manager_id, t.level + 1,
    t.path || ' > ' || e.name
  FROM employees e
  JOIN org_tree t ON e.manager_id = t.id
)
SELECT id, name, level, path FROM org_tree
ORDER BY path;

-- 生成日期序列
WITH RECURSIVE dates AS (
  SELECT '2024-01-01'::date AS dt
  UNION ALL
  SELECT dt + 1 FROM dates WHERE dt < '2024-12-31'
)
SELECT dt FROM dates;

-- 物料清单（BOM）展开
WITH RECURSIVE bom AS (
  SELECT parent_id, child_id, quantity, 1 AS depth
  FROM bill_of_materials
  WHERE parent_id = 'PRODUCT-A'

  UNION ALL

  SELECT b.parent_id, m.child_id, b.quantity * m.quantity, b.depth + 1
  FROM bom b
  JOIN bill_of_materials m ON b.child_id = m.parent_id
)
SELECT child_id, SUM(quantity) AS total_qty, MAX(depth) AS max_depth
FROM bom
GROUP BY child_id;
```

## 3. 横向连接（LATERAL）

```sql
-- LATERAL 允许子查询引用外部查询的列

-- 每个用户最近的3笔订单
SELECT u.name, o.order_date, o.total
FROM users u
CROSS JOIN LATERAL (
  SELECT order_date, total
  FROM orders
  WHERE user_id = u.id
  ORDER BY order_date DESC
  LIMIT 3
) o;

-- 每个分类销量最高的商品
SELECT c.name AS category, p.name AS top_product, p.sales
FROM categories c
CROSS JOIN LATERAL (
  SELECT name, sales
  FROM products
  WHERE category_id = c.id
  ORDER BY sales DESC
  LIMIT 1
) p;

-- LATERAL 与函数
SELECT u.name, recent.*
FROM users u
CROSS JOIN LATERAL get_recent_orders(u.id) AS recent(order_id, order_date);
```

## 4. 分组集（Grouping Sets）

```sql
-- ROLLUP: 层级汇总
SELECT region, product, SUM(sales) AS total
FROM sales_data
GROUP BY ROLLUP (region, product);
-- 等效于:
-- GROUP BY (region, product)
-- GROUP BY (region)
-- GROUP BY ()

-- CUBE: 全组合汇总
SELECT region, product, year, SUM(sales) AS total
FROM sales_data
GROUP BY CUBE (region, product, year);
-- 生成所有维度组合的汇总

-- GROUPING SETS: 自定义分组
SELECT region, product, SUM(sales) AS total
FROM sales_data
GROUP BY GROUPING SETS (
  (region, product),   -- 按区域+产品
  (region),            -- 按区域
  (product),           -- 按产品
  ()                   -- 总计
);

-- GROUPING 函数: 区分汇总行与数据行
SELECT region, product,
  GROUPING(region) AS is_region_total,
  GROUPING(product) AS is_product_total,
  SUM(sales) AS total
FROM sales_data
GROUP BY ROLLUP (region, product);
```

## 5. MERGE 语句增强

```sql
-- MERGE + RETURNING（PostgreSQL 17 增强）
MERGE INTO target_table t
USING source_table s
ON t.id = s.id
WHEN MATCHED AND t.version < s.version THEN
  UPDATE SET name = s.name, version = s.version
WHEN NOT MATCHED THEN
  INSERT (id, name, version) VALUES (s.id, s.name, s.version)
WHEN MATCHED AND t.deleted = true THEN
  DELETE
RETURNING
  merge_action() AS action,
  t.id, t.name;

-- merge_action() 返回: 'INSERT', 'UPDATE', 'DELETE'
```

## 6. JSON_TABLE 标准化

```sql
-- JSON_TABLE（PostgreSQL 17 SQL/JSON 标准化）
SELECT *
FROM JSON_TABLE(
  '[{"name":"Alice","scores":[90,85,92]},
    {"name":"Bob","scores":[78,88,95]}]'::jsonb,
  '$[*]' COLUMNS (
    name TEXT PATH '$.name',
    score1 INT PATH '$.scores[0]',
    score2 INT PATH '$.scores[1]',
    score3 INT PATH '$.scores[2]'
  )
) AS jt;

-- 嵌套 JSON_TABLE
SELECT *
FROM JSON_TABLE(
  '{"department":"Engineering","employees":[...]}'::jsonb,
  '$' COLUMNS (
    dept TEXT PATH '$.department',
    NESTED PATH '$.employees[*]' COLUMNS (
      name TEXT PATH '$.name',
      role TEXT PATH '$.role'
    )
  )
) AS jt;
```

## 7. 全文检索

### 7.1 基本概念

```sql
-- tsvector: 文档的词素向量
SELECT to_tsvector('english', 'The quick brown fox jumps over the lazy dog');
-- 'brown':3 'dog':9 'fox':4 'jump':5 'lazi':8 'quick':2

-- tsquery: 搜索查询
SELECT to_tsquery('english', 'quick & fox');
-- 'quick' & 'fox'

-- 匹配操作符 @@
SELECT 'The quick brown fox'::tsvector @@ 'quick & fox'::tsquery;  -- true
```

### 7.2 全文检索索引与查询

```sql
-- 创建全文检索索引
CREATE INDEX idx_docs_fts ON documents
  USING gin (to_tsvector('english', title || ' ' || content));

-- 全文检索查询
SELECT id, title,
  ts_headline('english', content, websearch_to_tsquery('postgresql index')) AS highlight,
  ts_rank_cd(to_tsvector('english', content), websearch_to_tsquery('postgresql index')) AS rank
FROM documents
WHERE to_tsvector('english', title || ' ' || content) @@ websearch_to_tsquery('postgresql index')
ORDER BY rank DESC
LIMIT 20;

-- 多语言配置
SELECT to_tsvector('simple', '中文测试');    -- 不做词干提取
SELECT to_tsvector('zhparser', '中文测试'); -- 需安装 zhparser 扩展
```

## 8. PostGIS 地理空间

```sql
-- 安装 PostGIS
CREATE EXTENSION postgis;

-- 创建空间列
ALTER TABLE locations ADD COLUMN geom geometry(Point, 4326);

-- 插入空间数据
INSERT INTO locations (name, geom)
VALUES ('总部', ST_SetSRID(ST_MakePoint(116.397, 39.908), 4326));

-- 空间索引
CREATE INDEX idx_locations_geom ON locations USING gist (geom);

-- 空间查询
-- 查找 5km 范围内的点
SELECT name, ST_Distance(geom::geography,
  ST_SetSRID(ST_MakePoint(116.4, 39.91), 4326)::geography) AS distance
FROM locations
WHERE ST_DWithin(geom::geography,
  ST_SetSRID(ST_MakePoint(116.4, 39.91), 4326)::geography, 5000)
ORDER BY distance;

-- 常用函数
ST_AsText(geom)           -- WKT 输出
ST_AsGeoJSON(geom)        -- GeoJSON 输出
ST_Area(geom)             -- 面积
ST_Length(geom)           -- 长度
ST_Contains(geom1, geom2) -- 包含关系
ST_Intersects(geom1, geom2) -- 相交
```

## 9. PL/pgSQL 存储过程

```sql
-- 创建存储过程
CREATE OR REPLACE PROCEDURE transfer_funds(
  p_from INTEGER,
  p_to INTEGER,
  p_amount NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- 检查余额
  IF NOT EXISTS (
    SELECT 1 FROM accounts WHERE id = p_from AND balance >= p_amount
  ) THEN
    RAISE EXCEPTION 'Insufficient funds or account not found';
  END IF;

  -- 执行转账
  UPDATE accounts SET balance = balance - p_amount WHERE id = p_from;
  UPDATE accounts SET balance = balance + p_amount WHERE id = p_to;

  -- 记录日志
  INSERT INTO transfer_log (from_id, to_id, amount, created_at)
  VALUES (p_from, p_to, p_amount, now());

  COMMIT;  -- 存储过程中可使用 COMMIT
END;
$$;

-- 调用存储过程
CALL transfer_funds(1, 2, 500.00);
```

```sql
-- 创建函数
CREATE OR REPLACE FUNCTION get_user_orders(p_user_id INTEGER)
RETURNS TABLE(order_id INTEGER, order_date TIMESTAMP, total NUMERIC)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT o.id, o.order_date, SUM(oi.quantity * oi.price) AS total
  FROM orders o
  JOIN order_items oi ON o.id = oi.order_id
  WHERE o.user_id = p_user_id
  GROUP BY o.id, o.order_date
  ORDER BY o.order_date DESC;
END;
$$;

-- 调用函数
SELECT * FROM get_user_orders(100);
```

## 10. 触发器

```sql
-- 创建触发器函数
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (table_name, operation, new_data, changed_at)
    VALUES (TG_TABLE_NAME, 'INSERT', to_jsonb(NEW), now());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (table_name, operation, old_data, new_data, changed_at)
    VALUES (TG_TABLE_NAME, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), now());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (table_name, operation, old_data, changed_at)
    VALUES (TG_TABLE_NAME, 'DELETE', to_jsonb(OLD), now());
    RETURN OLD;
  END IF;
END;
$$;

-- 绑定触发器
CREATE TRIGGER orders_audit
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- 条件触发器
CREATE TRIGGER check_balance
BEFORE UPDATE ON accounts
FOR EACH ROW
WHEN (NEW.balance < 0)
EXECUTE FUNCTION raise_balance_error();
```

## 11. FDW 外部数据包装器

```sql
-- 安装 postgres_fdw
CREATE EXTENSION postgres_fdw;

-- 创建外部服务器
CREATE SERVER remote_db
  FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (host '192.168.1.50', port '5432', dbname 'remote_fandex');

-- 创建用户映射
CREATE USER MAPPING FOR current_user
  SERVER remote_db
  OPTIONS (user 'remote_admin', password 'SecurePass');

-- 导入外部表
IMPORT FOREIGN SCHEMA public
  LIMIT TO (users, orders)
  FROM SERVER remote_db
  INTO public;

-- 手动创建外部表
CREATE FOREIGN TABLE remote_users (
  id INTEGER,
  name TEXT,
  email TEXT
) SERVER remote_db
  OPTIONS (schema_name 'public', table_name 'users');

-- 跨库查询
SELECT u.name, COUNT(o.id) AS order_count
FROM local_orders o
JOIN remote_users u ON o.user_id = u.id
GROUP BY u.name;

-- 其他 FDW 扩展
-- mysql_fdw: 连接 MySQL
-- redis_fdw: 连接 Redis
-- mongo_fdw: 连接 MongoDB
-- file_fdw: 读取外部文件
```
