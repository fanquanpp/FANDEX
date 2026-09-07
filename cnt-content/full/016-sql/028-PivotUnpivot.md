---
order: 280
title: PIVOT 与 UNPIVOT
module: 'sql'
category: 数据库
difficulty: advanced
description: SQL PIVOT与UNPIVOT：行列转换的语法、条件聚合实现、跨数据库兼容方案与性能优化
author: fanquanpp
updated: '2026-08-30'
related:
  - 'sql/027-RecursiveCTE'
  - 'sql/029-SetOperation'
prerequisites:
  - 'sql/002-OverviewStandard'
---

## 1. 行列转换概述

- **PIVOT（行转列）**：将行数据旋转为列，常用于交叉报表
- **UNPIVOT（列转行）**：将列数据旋转为行，常用于数据规范化

## 2. PIVOT 行转列

### 2.1 条件聚合实现（通用方法）

所有数据库都支持的条件聚合方法：

```sql
-- 原始数据：季度收入
-- | dept_id | quarter | revenue |
-- |---------|---------|---------|
-- | 1       | Q1      | 100     |
-- | 1       | Q2      | 150     |

-- 行转列：每个部门一行，季度为列
SELECT
    dept_id,
    SUM(CASE WHEN quarter = 'Q1' THEN revenue ELSE 0 END) AS q1,
    SUM(CASE WHEN quarter = 'Q2' THEN revenue ELSE 0 END) AS q2,
    SUM(CASE WHEN quarter = 'Q3' THEN revenue ELSE 0 END) AS q3,
    SUM(CASE WHEN quarter = 'Q4' THEN revenue ELSE 0 END) AS q4
FROM quarterly_revenue
GROUP BY dept_id;

-- 结果：
-- | dept_id | q1  | q2  | q3  | q4  |
-- |---------|-----|-----|-----|-----|
-- | 1       | 100 | 150 | 200 | 180 |
```

### 2.2 SQL Server PIVOT 语法

```sql
-- SQL Server 专用 PIVOT 语法
SELECT dept_id, [Q1], [Q2], [Q3], [Q4]
FROM quarterly_revenue
PIVOT (
    SUM(revenue)
    FOR quarter IN ([Q1], [Q2], [Q3], [Q4])
) AS p;
```

### 2.3 PostgreSQL crosstab

```sql
-- PostgreSQL: tablefunc 扩展
CREATE EXTENSION IF NOT EXISTS tablefunc;

SELECT *
FROM crosstab(
    'SELECT dept_id, quarter, revenue
     FROM quarterly_revenue
     ORDER BY 1, 2'
) AS ct (dept_id INTEGER, q1 NUMERIC, q2 NUMERIC, q3 NUMERIC, q4 NUMERIC);
```

### 2.4 动态 PIVOT

```sql
-- 列值不固定时，需要动态 SQL
-- PostgreSQL 示例
DO $$
DECLARE
    pivot_cols TEXT;
    query TEXT;
BEGIN
    SELECT STRING_AGG(DISTINCT quote_ident(quarter), ', ')
    INTO pivot_cols
    FROM quarterly_revenue;

    query := format('
        SELECT dept_id, %s
        FROM quarterly_revenue
        PIVOT (SUM(revenue) FOR quarter IN (%s)) AS p
    ', pivot_cols, pivot_cols);

    EXECUTE query;
END $$;
```

### 2.5 多值 PIVOT

```sql
-- 同时转换多个度量
SELECT
    dept_id,
    SUM(CASE WHEN quarter = 'Q1' THEN revenue ELSE 0 END) AS q1_revenue,
    SUM(CASE WHEN quarter = 'Q1' THEN cost ELSE 0 END) AS q1_cost,
    SUM(CASE WHEN quarter = 'Q2' THEN revenue ELSE 0 END) AS q2_revenue,
    SUM(CASE WHEN quarter = 'Q2' THEN cost ELSE 0 END) AS q2_cost
FROM quarterly_data
GROUP BY dept_id;
```

## 3. UNPIVOT 列转行

### 3.1 UNION ALL 实现（通用方法）

```sql
-- 原始数据：
-- | dept_id | q1  | q2  | q3  | q4  |
-- |---------|-----|-----|-----|-----|
-- | 1       | 100 | 150 | 200 | 180 |

-- 列转行
SELECT dept_id, 'Q1' AS quarter, q1 AS revenue FROM wide_data
UNION ALL
SELECT dept_id, 'Q2', q2 FROM wide_data
UNION ALL
SELECT dept_id, 'Q3', q3 FROM wide_data
UNION ALL
SELECT dept_id, 'Q4', q4 FROM wide_data;

-- 结果：
-- | dept_id | quarter | revenue |
-- |---------|---------|---------|
-- | 1       | Q1      | 100     |
-- | 1       | Q2      | 150     |
-- | 1       | Q3      | 200     |
-- | 1       | Q4      | 180     |
```

### 3.2 SQL Server UNPIVOT 语法

```sql
SELECT dept_id, quarter, revenue
FROM wide_data
UNPIVOT (
    revenue FOR quarter IN (q1, q2, q3, q4)
) AS u;
```

### 3.3 PostgreSQL 使用 VALUES + LATERAL

```sql
SELECT t.dept_id, v.quarter, v.revenue
FROM wide_data t,
LATERAL (VALUES
    ('Q1', t.q1),
    ('Q2', t.q2),
    ('Q3', t.q3),
    ('Q4', t.q4)
) AS v(quarter, revenue)
WHERE v.revenue IS NOT NULL;  -- 排除 NULL 值
```

### 3.4 UNPIVOT 与 NULL 处理

```sql
-- UNION ALL 保留 NULL
SELECT dept_id, 'Q1' AS quarter, q1 AS revenue FROM wide_data
UNION ALL
SELECT dept_id, 'Q2', q2 FROM wide_data;

-- SQL Server UNPIVOT 自动排除 NULL
SELECT dept_id, quarter, revenue
FROM wide_data
UNPIVOT (revenue FOR quarter IN (q1, q2, q3, q4)) AS u;
-- NULL 值的行不会出现在结果中

-- 如需保留 NULL，使用 CROSS APPLY
SELECT t.dept_id, v.quarter, v.revenue
FROM wide_data t
CROSS APPLY (VALUES
    ('Q1', t.q1), ('Q2', t.q2), ('Q3', t.q3), ('Q4', t.q4)
) v(quarter, revenue);
```

## 4. 实际应用场景

### 4.1 月度报表

```sql
-- 按月展示销售数据
SELECT
    product_name,
    SUM(CASE WHEN EXTRACT(MONTH FROM order_date) = 1  THEN amount ELSE 0 END) AS jan,
    SUM(CASE WHEN EXTRACT(MONTH FROM order_date) = 2  THEN amount ELSE 0 END) AS feb,
    SUM(CASE WHEN EXTRACT(MONTH FROM order_date) = 3  THEN amount ELSE 0 END) AS mar,
    SUM(CASE WHEN EXTRACT(MONTH FROM order_date) = 4  THEN amount ELSE 0 END) AS apr,
    SUM(CASE WHEN EXTRACT(MONTH FROM order_date) = 5  THEN amount ELSE 0 END) AS may,
    SUM(CASE WHEN EXTRACT(MONTH FROM order_date) = 6  THEN amount ELSE 0 END) AS jun
FROM sales
WHERE EXTRACT(YEAR FROM order_date) = 2026
GROUP BY product_name;
```

### 4.2 用户属性宽表

```sql
-- 将 EAV 模型转为宽表
-- 原始：user_id | attribute | value
-- 目标：user_id | age | gender | city

SELECT
    user_id,
    MAX(CASE WHEN attribute = 'age' THEN value END)::INTEGER AS age,
    MAX(CASE WHEN attribute = 'gender' THEN value END) AS gender,
    MAX(CASE WHEN attribute = 'city' THEN value END) AS city
FROM user_attributes
GROUP BY user_id;
```

### 4.3 数据清洗：宽表转长表

```sql
-- 将1月-12月列转为行，便于分析
WITH monthly_data AS (
    SELECT id, jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec_val
    from annual_data
)
SELECT
    id,
    month,
    value
FROM monthly_data
UNPIVOT (
    value FOR month IN (jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec_val)
) u;
```
## 行转列（Pivot）

**基本写法：CASE WHEN 实现行转列**
`SELECT <分组列>, SUM(CASE WHEN <条件> THEN <值> ELSE 0 END) AS <别名> FROM <表> GROUP BY <分组列>`
```sql
-- 将行数据转为列（通用方式）
SELECT
  dept,
  SUM(CASE WHEN quarter = 'Q1' THEN sales ELSE 0 END) AS q1,
  SUM(CASE WHEN quarter = 'Q2' THEN sales ELSE 0 END) AS q2,
  SUM(CASE WHEN quarter = 'Q3' THEN sales ELSE 0 END) AS q3,
  SUM(CASE WHEN quarter = 'Q4' THEN sales ELSE 0 END) AS q4
FROM quarterly_sales
GROUP BY dept;
```

---

**基本写法：MySQL 行转列（MAX + CASE）**
`SELECT <分组列>, MAX(CASE WHEN <条件> THEN <值> END) AS <别名> FROM <表> GROUP BY <分组列>`
```sql
-- 使用 MAX 替代 SUM（适合非数值去重场景）
SELECT
  user_id,
  MAX(CASE WHEN attr = 'name' THEN value END) AS name,
  MAX(CASE WHEN attr = 'email' THEN value END) AS email,
  MAX(CASE WHEN attr = 'phone' THEN value END) AS phone
FROM user_attributes
GROUP BY user_id;
```

---

**基本写法：SQL Server PIVOT**
`SELECT * FROM (SELECT <列> FROM <表>) <别名> PIVOT (<聚合函数>(<值列>) FOR <转列> IN ([<值1>], [<值2>])) <别名>`
```sql
-- SQL Server 专用 PIVOT 语法
SELECT dept, [Q1], [Q2], [Q3], [Q4]
FROM (
  SELECT dept, quarter, sales FROM quarterly_sales
) AS src
PIVOT (
  SUM(sales) FOR quarter IN ([Q1], [Q2], [Q3], [Q4])
) AS pvt;
```

---

**基本写法：PostgreSQL crosstab**
`SELECT * FROM crosstab('SELECT <分组列>, <转列>, <值列> FROM <表> ORDER BY 1,2') AS <结果>(<列定义>)`
```sql
-- PostgreSQL tablefunc 扩展
CREATE EXTENSION IF NOT EXISTS tablefunc;

SELECT * FROM crosstab(
  'SELECT dept, quarter, sales FROM quarterly_sales ORDER BY 1,2'
) AS result(
  dept VARCHAR,
  q1 INTEGER,
  q2 INTEGER,
  q3 INTEGER,
  q4 INTEGER
);
```

---

**基本写法：MySQL GROUP_CONCAT 行转列**
`SELECT <分组列>, GROUP_CONCAT(<列> SEPARATOR '<分隔>') FROM <表> GROUP BY <分组列>`
```sql
-- 将多行值合并为一个字符串
SELECT
  dept,
  GROUP_CONCAT(name SEPARATOR ', ') AS all_names
FROM employees
GROUP BY dept;
```

---

**基本写法：PostgreSQL STRING_AGG**
`SELECT <分组列>, STRING_AGG(<列>, '<分隔>') FROM <表> GROUP BY <分组列>`
```sql
-- PostgreSQL 字符串聚合
SELECT
  dept,
  STRING_AGG(name, ', ' ORDER BY name) AS all_names
FROM employees
GROUP BY dept;
```

---

## 列转行（Unpivot）

**基本写法：UNION ALL 实现列转行**
`SELECT <分组列>, '<列名1>' AS <类型列>, <列1> AS <值列> FROM <表> UNION ALL SELECT <分组列>, '<列名2>', <列2> FROM <表>`
```sql
-- 将列数据转为行（通用方式）
SELECT dept, 'Q1' AS quarter, q1 AS sales FROM wide_sales
UNION ALL
SELECT dept, 'Q2' AS quarter, q2 AS sales FROM wide_sales
UNION ALL
SELECT dept, 'Q3' AS quarter, q3 AS sales FROM wide_sales
UNION ALL
SELECT dept, 'Q4' AS quarter, q4 AS sales FROM wide_sales
ORDER BY dept, quarter;
```

---

**基本写法：SQL Server UNPIVOT**
`SELECT <分组列>, <类型列>, <值列> FROM <表> UNPIVOT (<值列> FOR <类型列> IN (<列1>, <列2>)) <别名>`
```sql
-- SQL Server 专用 UNPIVOT 语法
SELECT dept, quarter, sales
FROM wide_sales
UNPIVOT (
  sales FOR quarter IN (q1, q2, q3, q4)
) AS unpvt;
```

---

**基本写法：PostgreSQL UNNEST**
`SELECT <分组列>, <类型列>, <值列> FROM <表>, UNNEST(ARRAY[<值>], ARRAY[<标签>]) AS t(<值>, <标签>)`
```sql
-- PostgreSQL 使用 UNNEST 展开数组
SELECT dept, quarter, sales
FROM wide_sales,
  UNNEST(
    ARRAY[q1, q2, q3, q4],
    ARRAY['Q1', 'Q2', 'Q3', 'Q4']
  ) AS t(sales, quarter);
```

---

## 动态行列转换

**基本写法：动态 SQL 行转列**
`SET @sql = CONCAT('SELECT dept, ', <动态列>, ' FROM ...')`
```sql
-- MySQL 动态生成 PIVOT 查询
SET @sql = NULL;
SELECT
  GROUP_CONCAT(DISTINCT
    CONCAT('SUM(CASE WHEN quarter = ''', quarter,
      ''' THEN sales ELSE 0 END) AS `', quarter, '`')
  ) INTO @sql
FROM quarterly_sales;

SET @sql = CONCAT('SELECT dept, ', @sql,
  ' FROM quarterly_sales GROUP BY dept');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
```

---

**基本写法：PostgreSQL 动态列**
`-- 使用 JSON 聚合实现动态行转列`
```sql
-- PostgreSQL 使用 JSON 构建动态结构
SELECT
  dept,
  json_object_agg(quarter, sales) AS sales_json
FROM quarterly_sales
GROUP BY dept;
-- 结果：{"Q1": 1000, "Q2": 1500, ...}
```

---

## 常见应用场景

**基本写法：成绩表行转列**
`SELECT student, MAX(CASE WHEN subject='数学' THEN score END) AS math, ...`
```sql
-- 学生成绩行转列
SELECT
  student,
  MAX(CASE WHEN subject = '语文' THEN score END) AS chinese,
  MAX(CASE WHEN subject = '数学' THEN score END) AS math,
  MAX(CASE WHEN subject = '英语' THEN score END) AS english
FROM scores
GROUP BY student;
```

---

**基本写法：月度统计行转列**
`SELECT year, SUM(CASE WHEN month=1 THEN amount END) AS jan, ...`
```sql
-- 月度金额统计行转列
SELECT
  year,
  SUM(CASE WHEN month = 1 THEN amount ELSE 0 END) AS jan,
  SUM(CASE WHEN month = 2 THEN amount ELSE 0 END) AS feb,
  SUM(CASE WHEN month = 3 THEN amount ELSE 0 END) AS mar,
  SUM(CASE WHEN month = 4 THEN amount ELSE 0 END) AS apr,
  SUM(CASE WHEN month = 5 THEN amount ELSE 0 END) AS may,
  SUM(CASE WHEN month = 6 THEN amount ELSE 0 END) AS jun
FROM monthly_revenue
GROUP BY year;
```

---

**基本写法：EAV 模型行转列**
`SELECT entity_id, MAX(CASE WHEN attr_name='name' THEN attr_value END) AS name, ...`
```sql
-- Entity-Attribute-Value 模型行转列
SELECT
  entity_id,
  MAX(CASE WHEN attr_name = 'name' THEN attr_value END) AS name,
  MAX(CASE WHEN attr_name = 'age' THEN attr_value END) AS age,
  MAX(CASE WHEN attr_name = 'city' THEN attr_value END) AS city
FROM eav_table
GROUP BY entity_id;
```

---

**基本写法：NULL 值处理**
`COALESCE(SUM(CASE WHEN ...), 0)`
```sql
-- 用 COALESCE 替换 NULL 为 0
SELECT
  dept,
  COALESCE(SUM(CASE WHEN quarter = 'Q1' THEN sales END), 0) AS q1,
  COALESCE(SUM(CASE WHEN quarter = 'Q2' THEN sales END), 0) AS q2
FROM quarterly_sales
GROUP BY dept;
```
