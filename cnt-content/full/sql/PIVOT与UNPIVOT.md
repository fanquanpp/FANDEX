---
order: 64
title: PIVOT与UNPIVOT
module: sql
category: SQL
difficulty: advanced
description: 'SQL PIVOT与UNPIVOT：行列转换的语法、条件聚合实现、跨数据库兼容方案与性能优化'
author: fanquanpp
updated: '2026-06-14'
related:
  - sql/公用表表达式
  - sql/递归CTE
  - sql/集合操作
  - sql/数据控制语言
prerequisites:
  - sql/概述与标准
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
