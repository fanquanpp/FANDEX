---
order: 7
title: 高级查询
module: sql
category: SQL
difficulty: advanced
description: '递归 CTE、PIVOT/UNPIVOT、GROUPING SETS、LATERAL JOIN、全文搜索与 JSON 查询'
author: fanquanpp
updated: '2026-06-14'
related:
  - sql/数据定义
  - sql/窗口函数
  - sql/性能优化
  - 'sql/PL-SQL与存储过程'
prerequisites: []
---

# 高级查询

## 递归 CTE 进阶

递归 CTE 的基础用法已在多表查询章节介绍，这里补充更复杂的场景。

### 员工薪资汇总链

```sql
-- 从员工到 CEO 的薪资链
WITH RECURSIVE salary_chain AS (
  -- 锚点：指定员工
  SELECT id, name, manager_id, salary, 0 AS level
  FROM employees
  WHERE id = 42  -- 起始员工

  UNION ALL

  -- 递归：向上找经理
  SELECT e.id, e.name, e.manager_id, e.salary, sc.level + 1
  FROM employees e
  JOIN salary_chain sc ON e.id = sc.manager_id
)
SELECT name, salary, level FROM salary_chain ORDER BY level;
```

### 物料清单（BOM）展开

```sql
-- 多级 BOM 展开：计算产品的总物料需求
WITH RECURSIVE bom_explosion AS (
  -- 锚点：顶级产品
  SELECT
    product_id,
    component_id,
    quantity,
    CAST(component_id AS VARCHAR(1000)) AS path,
    1 AS depth
  FROM bill_of_materials
  WHERE product_id = 100  -- 目标产品

  UNION ALL

  -- 递归：展开子组件
  SELECT
    b.product_id,
    b.component_id,
    b.quantity * be.quantity AS quantity,  -- 累乘数量
    CAST(be.path || '>' || b.component_id AS VARCHAR(1000)),
    be.depth + 1
  FROM bill_of_materials b
  JOIN bom_explosion be ON b.product_id = be.component_id
  WHERE be.depth < 10  -- 防止无限递归
)
SELECT
  component_id,
  SUM(quantity) AS total_quantity,
  MAX(depth) AS max_depth
FROM bom_explosion
GROUP BY component_id;
```

### 递归 CTE 注意事项

```sql
-- 1. 必须有终止条件
WITH RECURSIVE infinite AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM infinite  --  无终止条件，会无限递归
)

-- 2. 使用 WHERE 或 LIMIT 终止
WITH RECURSIVE finite AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM finite WHERE n < 100  --  有终止条件
)

-- 3. 防止环路：记录已访问节点
WITH RECURSIVE no_cycle AS (
  SELECT id, parent_id, CAST(id AS VARCHAR(1000)) AS visited
  FROM tree WHERE parent_id IS NULL

  UNION ALL

  SELECT t.id, t.parent_id,
    CAST(n.visited || ',' || t.id AS VARCHAR(1000))
  FROM tree t
  JOIN no_cycle n ON t.parent_id = n.id
  WHERE n.visited NOT LIKE '%,' || t.id || ',%'  -- 排除已访问节点
)
SELECT * FROM no_cycle;
```

## PIVOT / UNPIVOT

### 行转列（PIVOT）

```sql
-- SQL Server: PIVOT 语法
SELECT *
FROM (
  SELECT department, quarter, revenue
  FROM quarterly_sales
) src
PIVOT (
  SUM(revenue) FOR quarter IN ([Q1], [Q2], [Q3], [Q4])
) pvt;

-- 结果:
-- department | Q1    | Q2    | Q3    | Q4
-- IT         | 50000 | 60000 | 55000 | 70000
-- HR         | 30000 | 35000 | 32000 | 40000

-- 通用写法（所有数据库）
SELECT
  department,
  SUM(CASE WHEN quarter = 'Q1' THEN revenue ELSE 0 END) AS Q1,
  SUM(CASE WHEN quarter = 'Q2' THEN revenue ELSE 0 END) AS Q2,
  SUM(CASE WHEN quarter = 'Q3' THEN revenue ELSE 0 END) AS Q3,
  SUM(CASE WHEN quarter = 'Q4' THEN revenue ELSE 0 END) AS Q4
FROM quarterly_sales
GROUP BY department;

-- PostgreSQL: crosstab（需 tablefunc 扩展）
CREATE EXTENSION IF NOT EXISTS tablefunc;

SELECT *
FROM crosstab(
  'SELECT department, quarter, revenue FROM quarterly_sales ORDER BY 1,2'
) AS ct(department VARCHAR, Q1 NUMERIC, Q2 NUMERIC, Q3 NUMERIC, Q4 NUMERIC);

-- Oracle: PIVOT
SELECT *
FROM quarterly_sales
PIVOT (
  SUM(revenue) FOR quarter IN ('Q1' AS Q1, 'Q2' AS Q2, 'Q3' AS Q3, 'Q4' AS Q4)
);
```

### 列转行（UNPIVOT）

```sql
-- SQL Server: UNPIVOT
SELECT department, quarter, revenue
FROM quarterly_wide
UNPIVOT (
  revenue FOR quarter IN (Q1, Q2, Q3, Q4)
) unpvt;

-- 通用写法（所有数据库）
SELECT department, 'Q1' AS quarter, Q1 AS revenue FROM quarterly_wide
UNION ALL
SELECT department, 'Q2', Q2 FROM quarterly_wide
UNION ALL
SELECT department, 'Q3', Q3 FROM quarterly_wide
UNION ALL
SELECT department, 'Q4', Q4 FROM quarterly_wide;

-- PostgreSQL: LATERAL + VALUES
SELECT t.department, v.quarter, v.revenue
FROM quarterly_wide t,
LATERAL (VALUES
  ('Q1', t.Q1),
  ('Q2', t.Q2),
  ('Q3', t.Q3),
  ('Q4', t.Q4)
) v(quarter, revenue);
```

## GROUPING SETS / ROLLUP / CUBE

### GROUPING SETS

自定义分组级别：

```sql
-- 按部门和职位分别统计，以及总计
SELECT
  department,
  job_title,
  COUNT(*) AS emp_count,
  AVG(salary) AS avg_salary
FROM employees
GROUP BY GROUPING SETS (
  (department, job_title),  -- 按部门和职位
  (department),             -- 只按部门
  (job_title),              -- 只按职位
  ()                        -- 总计
);

-- 等价于 UNION ALL 多个查询
SELECT department, job_title, COUNT(*), AVG(salary)
FROM employees GROUP BY department, job_title
UNION ALL
SELECT department, NULL, COUNT(*), AVG(salary)
FROM employees GROUP BY department
UNION ALL
SELECT NULL, job_title, COUNT(*), AVG(salary)
FROM employees GROUP BY job_title
UNION ALL
SELECT NULL, NULL, COUNT(*), AVG(salary)
FROM employees;
```

### ROLLUP

层级聚合：从细粒度到粗粒度逐级汇总：

```sql
-- 按年 → 月 → 日层级汇总
SELECT
  EXTRACT(YEAR FROM order_date) AS year,
  EXTRACT(MONTH FROM order_date) AS month,
  EXTRACT(DAY FROM order_date) AS day,
  SUM(amount) AS total
FROM orders
GROUP BY ROLLUP (
  EXTRACT(YEAR FROM order_date),
  EXTRACT(MONTH FROM order_date),
  EXTRACT(DAY FROM order_date)
);

-- 等价于 GROUPING SETS:
-- (year, month, day)
-- (year, month)
-- (year)
-- ()

-- 区分汇总行与数据行
SELECT
  CASE WHEN GROUPING(EXTRACT(YEAR FROM order_date)) = 1 THEN '总计'
       ELSE EXTRACT(YEAR FROM order_date)::TEXT END AS year,
  CASE WHEN GROUPING(EXTRACT(MONTH FROM order_date)) = 1 THEN '小计'
       ELSE EXTRACT(MONTH FROM order_date)::TEXT END AS month,
  SUM(amount) AS total
FROM orders
GROUP BY ROLLUP (
  EXTRACT(YEAR FROM order_date),
  EXTRACT(MONTH FROM order_date)
);
```

### CUBE

全组合聚合：生成所有可能的分组组合：

```sql
-- 按部门和职位的所有组合汇总
SELECT
  department,
  job_title,
  SUM(salary) AS total_salary
FROM employees
GROUP BY CUBE (department, job_title);

-- 等价于 GROUPING SETS:
-- (department, job_title)
-- (department)
-- (job_title)
-- ()

-- ROLLUP vs CUBE
-- ROLLUP(a, b, c) → 4 种分组: (a,b,c), (a,b), (a), ()
-- CUBE(a, b, c)   → 8 种分组: (a,b,c), (a,b), (a,c), (b,c), (a), (b), (c), ()
```

### GROUPING 函数

```sql
-- GROUPING(col): 当前列为 NULL 是因为汇总还是原始数据为 NULL
-- 返回 0: 原始数据
-- 返回 1: 汇总行

SELECT
  CASE WHEN GROUPING(department) = 1 THEN '【全部】' ELSE department END AS dept,
  CASE WHEN GROUPING(job_title) = 1 THEN '【小计】' ELSE job_title END AS title,
  COUNT(*) AS cnt,
  SUM(salary) AS total
FROM employees
GROUP BY ROLLUP (department, job_title)
ORDER BY department, job_title;

-- GROUPING_ID: 将多列 GROUPING 结果合并为位图
-- PostgreSQL: GROUPING(dept, title) 返回位图整数
SELECT
  department,
  job_title,
  GROUPING(department, job_title) AS gid,
  SUM(salary) AS total
FROM employees
GROUP BY ROLLUP (department, job_title);

-- gid = 0: 详细行
-- gid = 1: title 汇总
-- gid = 2: dept 汇总
-- gid = 3: 总计
```

## LATERAL JOIN / APPLY

### LATERAL（PostgreSQL / MySQL 8.0+）

LATERAL 允许子查询引用左侧表的列：

```sql
-- 每个用户最近的 3 笔订单
SELECT u.name, recent_orders.*
FROM users u
JOIN LATERAL (
  SELECT order_id, amount, order_date
  FROM orders o
  WHERE o.user_id = u.id
  ORDER BY order_date DESC
  LIMIT 3
) recent_orders ON true;

-- 没有 LATERAL 的写法（更复杂）
SELECT u.name, o.order_id, o.amount, o.order_date
FROM users u
JOIN orders o ON o.user_id = u.id
WHERE o.order_date IN (
  SELECT order_date FROM orders o2
  WHERE o2.user_id = u.id
  ORDER BY order_date DESC
  LIMIT 3
);

-- LATERAL 与函数
SELECT
  p.name,
  price_stats.*
FROM products p
CROSS JOIN LATERAL (
  SELECT
    MIN(price) AS min_price,
    MAX(price) AS max_price,
    AVG(price) AS avg_price
  FROM order_items oi
  WHERE oi.product_id = p.id
) price_stats;
```

### APPLY（SQL Server）

```sql
-- CROSS APPLY: 类似 INNER JOIN LATERAL
SELECT u.name, top_orders.*
FROM users u
CROSS APPLY (
  SELECT TOP 3 order_id, amount
  FROM orders o
  WHERE o.user_id = u.id
  ORDER BY order_date DESC
) top_orders;

-- OUTER APPLY: 类似 LEFT JOIN LATERAL（无匹配时返回 NULL）
SELECT u.name, top_orders.*
FROM users u
OUTER APPLY (
  SELECT TOP 3 order_id, amount
  FROM orders o
  WHERE o.user_id = u.id
  ORDER BY order_date DESC
) top_orders;
```

## 全文搜索

### PostgreSQL 全文搜索

```sql
-- 基本全文搜索
SELECT title, content
FROM articles
WHERE to_tsvector('english', content) @@ to_tsquery('english', 'database & optimization');

-- tsvector: 文本分词后的词素向量
-- tsquery: 搜索查询
-- @@: 匹配运算符

-- 创建全文索引
CREATE INDEX idx_articles_fts ON articles
  USING gin(to_tsvector('english', title || ' ' || content));

-- 存储预计算的 tsvector 列
ALTER TABLE articles ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,''))) STORED;

CREATE INDEX idx_articles_search ON articles USING gin(search_vector);

-- 搜索并排序（按相关性）
SELECT title,
  ts_rank(search_vector, query) AS rank,
  ts_headline('english', content, query) AS headline
FROM articles, to_tsquery('english', 'database | optimization') query
WHERE search_vector @@ query
ORDER BY rank DESC;

-- 中文全文搜索（需 zhparser 插件）
-- 安装后使用 'zhparser' 配置
SELECT * FROM articles
WHERE to_tsvector('zhparser', content) @@ to_tsquery('zhparser', '数据库 & 优化');
```

### MySQL 全文搜索

```sql
-- 创建全文索引
CREATE FULLTEXT INDEX idx_articles_fts ON articles(title, content);

-- 自然语言搜索
SELECT title, MATCH(title, content) AGAINST('database optimization') AS relevance
FROM articles
WHERE MATCH(title, content) AGAINST('database optimization');

-- 布尔模式
SELECT * FROM articles
WHERE MATCH(title, content) AGAINST('+database -nosql' IN BOOLEAN MODE);

-- 查询扩展
SELECT * FROM articles
WHERE MATCH(title, content) AGAINST('database' WITH QUERY EXPANSION);
```

## JSON 查询

### PostgreSQL JSONB

```sql
-- 创建表
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  data JSONB NOT NULL
);

-- 插入数据
INSERT INTO events (data) VALUES
  ('{"name": "click", "user": {"id": 1, "name": "Alice"}, "tags": ["ui", "button"], "metadata": {"page": "/home"}}');

-- 基本查询操作符
SELECT data->>'name' AS event_name FROM events;           -- 文本: "click"
SELECT data->'user'->>'name' AS user_name FROM events;    -- 嵌套: "Alice"
SELECT data->'tags'->0 AS first_tag FROM events;          -- 数组: "ui"

-- 条件查询
SELECT * FROM events WHERE data->>'name' = 'click';
SELECT * FROM events WHERE data->'user'->>'id' = '1';

-- 包含操作符
SELECT * FROM events WHERE data @> '{"name": "click"}';           -- 包含
SELECT * FROM events WHERE data->'tags' ? 'ui';                   -- 键存在
SELECT * FROM events WHERE data->'tags' ?| ARRAY['ui', 'form'];   -- 任一存在
SELECT * FROM events WHERE data->'tags' ?& ARRAY['ui', 'button']; -- 全部存在

-- JSONB 索引
CREATE INDEX idx_events_data ON events USING gin(data);           -- GIN 默认索引
CREATE INDEX idx_events_data_path ON events USING gin(data jsonb_path_ops);  -- 仅 @> 操作符

-- 修改 JSONB
UPDATE events SET data = data || '{"status": "processed"}' WHERE id = 1;  -- 合并
UPDATE events SET data = data - 'status' WHERE id = 1;                     -- 删除键
UPDATE events SET data = jsonb_set(data, '{user,name}', '"Bob"') WHERE id = 1;  -- 更新嵌套

-- SQL/JSON 函数（PostgreSQL 12+）
SELECT
  jsonb_path_query(data, '$.tags[*]') AS tag,
  jsonb_path_query_array(data, '$.tags[*]') AS all_tags,
  jsonb_path_exists(data, '$.tags[*] ? (@ == "ui")') AS has_ui_tag
FROM events;
```

### MySQL JSON

```sql
-- 基本查询
SELECT JSON_EXTRACT(data, '$.name') AS event_name FROM events;
SELECT data->>'$.name' AS event_name FROM events;  -- MySQL 5.7.9+

-- 条件查询
SELECT * FROM events WHERE JSON_EXTRACT(data, '$.name') = 'click';
SELECT * FROM events WHERE data->>'$.name' = 'click';

-- JSON 包含
SELECT * FROM events WHERE JSON_CONTAINS(data, '{"name": "click"}');
SELECT * FROM events WHERE JSON_CONTAINS_PATH(data, 'one', '$.user.name');

-- JSON_TABLE: 将 JSON 数组展开为行（MySQL 8.0+）
SELECT jt.*
FROM orders o,
JSON_TABLE(o.items, '$[*]' COLUMNS(
  product_id INT PATH '$.product_id',
  quantity INT PATH '$.quantity',
  price DECIMAL(10,2) PATH '$.price'
)) AS jt;

-- JSON 修改
UPDATE events SET data = JSON_SET(data, '$.status', 'processed') WHERE id = 1;
UPDATE events SET data = JSON_INSERT(data, '$.new_field', 'value') WHERE id = 1;
UPDATE events SET data = JSON_REMOVE(data, '$.status') WHERE id = 1;
UPDATE events SET data = JSON_MERGE_PATCH(data, '{"status": "done"}') WHERE id = 1;
```

### SQL Server JSON

```sql
-- 查询
SELECT JSON_VALUE(data, '$.name') AS event_name FROM events;
SELECT JSON_QUERY(data, '$.user') AS user_obj FROM events;

-- OPENJSON: 展开 JSON
SELECT *
FROM events
CROSS APPLY OPENJSON(data)
WITH (
  event_name VARCHAR(100) '$.name',
  user_id INT '$.user.id',
  user_name VARCHAR(100) '$.user.name'
);

-- JSON 数组展开
SELECT o.id, jt.product_id, jt.quantity
FROM orders o
CROSS APPLY OPENJSON(o.items)
WITH (
  product_id INT '$.product_id',
  quantity INT '$.quantity'
) jt;

-- 修改
UPDATE events SET data = JSON_MODIFY(data, '$.status', 'processed') WHERE id = 1;
```

## 小结

- 递归 CTE 可处理层级遍历、路径查找等复杂场景，务必设置终止条件和环路检测
- `PIVOT`/`UNPIVOT` 实现行列转换，通用写法使用 `CASE WHEN` + `UNION ALL`
- `ROLLUP` 生成层级汇总，`CUBE` 生成全组合汇总，`GROUPING` 函数区分汇总行
- `LATERAL`/`APPLY` 允许子查询引用左侧表列，是 Top-N per group 的高效写法
- PostgreSQL 的全文搜索功能完善，JSONB 支持索引和丰富操作符
- MySQL 的 `JSON_TABLE` 和 SQL Server 的 `OPENJSON` 可将 JSON 数据展开为关系表
