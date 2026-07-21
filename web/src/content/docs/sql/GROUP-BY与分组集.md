---
order: 55
title: 'GROUP BY与分组集'
module: sql
category: SQL
difficulty: advanced
description: 'SQL分组与分组集：GROUP BY子句、ROLLUP、CUBE、GROUPING SETS多维分析、GROUPING函数与报表生成'
author: fanquanpp
updated: '2026-06-14'
related:
  - sql/过滤条件
  - sql/聚合函数
  - sql/连接查询
  - sql/自然连接与USING
prerequisites:
  - sql/概述与标准
---

## 1. GROUP BY 基础

### 1.1 分组原理

GROUP BY 将结果集按指定列的值分组，每组生成一行汇总结果。

```sql
-- 单列分组
SELECT dept_id, COUNT(*) AS emp_count, AVG(salary) AS avg_salary
FROM employees
GROUP BY dept_id;

-- 多列分组
SELECT dept_id, job_title, COUNT(*) AS emp_count
FROM employees
GROUP BY dept_id, job_title;
```

### 1.2 分组规则

- SELECT 中的非聚合列必须出现在 GROUP BY 中
- GROUP BY 列的 NULL 值被归为同一组
- GROUP BY 可以使用表达式

```sql
-- 按表达式分组
SELECT
    EXTRACT(YEAR FROM created_at) AS year,
    EXTRACT(MONTH FROM created_at) AS month,
    COUNT(*) AS order_count
FROM orders
GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at);
```

## 2. GROUPING SETS

### 2.1 概念

GROUPING SETS 允许在一次查询中指定多个分组集，相当于多个 GROUP BY 查询的 UNION ALL。

```sql
-- 等价于两个 GROUP BY 的 UNION ALL
SELECT dept_id, job_title, COUNT(*) AS emp_count
FROM employees
GROUP BY GROUPING SETS (
    (dept_id),           -- 按部门分组
    (job_title)          -- 按职位分组
);
-- 等价于：
SELECT dept_id, NULL AS job_title, COUNT(*) AS emp_count
FROM employees GROUP BY dept_id
UNION ALL
SELECT NULL AS dept_id, job_title, COUNT(*) AS emp_count
FROM employees GROUP BY job_title;
```

### 2.2 多维分组集

```sql
-- 多个分组集组合
SELECT dept_id, job_title, COUNT(*) AS emp_count
FROM employees
GROUP BY GROUPING SETS (
    (dept_id, job_title),   -- 部门×职位交叉分组
    (dept_id),              -- 仅按部门
    (job_title),            -- 仅按职位
    ()                      -- 总计
);
```

## 3. ROLLUP

### 3.1 概念

ROLLUP 按层级递减生成分组集，用于生成小计和总计行。

```sql
-- ROLLUP(dept_id, job_title) 生成以下分组集：
-- 1. (dept_id, job_title)  -- 最细粒度
-- 2. (dept_id)             -- 部门小计
-- 3. ()                    -- 总计

SELECT
    dept_id,
    job_title,
    COUNT(*) AS emp_count,
    SUM(salary) AS total_salary
FROM employees
GROUP BY ROLLUP (dept_id, job_title);
```

**输出示例**：

| dept_id | job_title | emp_count | total_salary |
| ------- | --------- | --------- | ------------ | ---------- |
| 1 | Engineer | 10 | 1000000 |
| 1 | Manager | 3 | 450000 |
| 1 | NULL | 13 | 1450000 | ← 部门小计 |
| 2 | Engineer | 8 | 800000 |
| 2 | NULL | 8 | 800000 | ← 部门小计 |
| NULL | NULL | 21 | 2250000 | ← 总计 |

### 3.2 三级 ROLLUP

```sql
-- ROLLUP(year, quarter, month)
SELECT
    EXTRACT(YEAR FROM created_at) AS yr,
    EXTRACT(QUARTER FROM created_at) AS qtr,
    EXTRACT(MONTH FROM created_at) AS mon,
    SUM(amount) AS total
FROM orders
GROUP BY ROLLUP (
    EXTRACT(YEAR FROM created_at),
    EXTRACT(QUARTER FROM created_at),
    EXTRACT(MONTH FROM created_at)
);
-- 生成分组集：(yr,qtr,mon), (yr,qtr), (yr), ()
```

## 4. CUBE

### 4.1 概念

CUBE 生成所有可能的分组集组合，用于多维数据分析。

```sql
-- CUBE(dept_id, job_title) 生成以下分组集：
-- 1. (dept_id, job_title)  -- 交叉分组
-- 2. (dept_id)             -- 按部门
-- 3. (job_title)           -- 按职位
-- 4. ()                    -- 总计

SELECT
    dept_id,
    job_title,
    COUNT(*) AS emp_count
FROM employees
GROUP BY CUBE (dept_id, job_title);
```

### 4.2 CUBE 的分组集数量

$n$ 列的 CUBE 生成 $2^n$ 个分组集：

| 列数 | 分组集数量 | 说明                                            |
| ---- | ---------- | ----------------------------------------------- |
| 2    | 4          | (a,b), (a), (b), ()                             |
| 3    | 8          | (a,b,c), (a,b), (a,c), (b,c), (a), (b), (c), () |
| 4    | 16         | 注意性能影响                                    |

```sql
-- 三维 CUBE
SELECT region, dept_id, job_title, SUM(salary) AS total
FROM employees
GROUP BY CUBE (region, dept_id, job_title);
-- 生成 2^3 = 8 个分组集
```

## 5. GROUPING 函数

### 5.1 识别小计与总计行

GROUPING 函数返回 0 或 1，指示某列是否因分组集而被聚合为 NULL：

- `GROUPING(col) = 0`：该列有实际值
- `GROUPING(col) = 1`：该列因分组集而被聚合为 NULL

```sql
SELECT
    dept_id,
    job_title,
    COUNT(*) AS emp_count,
    GROUPING(dept_id) AS is_dept_subtotal,
    GROUPING(job_title) AS is_job_subtotal
FROM employees
GROUP BY ROLLUP (dept_id, job_title);
```

| dept_id | job_title | emp_count | is_dept_subtotal | is_job_subtotal |
| ------- | --------- | --------- | ---------------- | --------------- | ---------- |
| 1 | Engineer | 10 | 0 | 0 |
| 1 | NULL | 13 | 0 | 1 | ← 部门小计 |
| NULL | NULL | 21 | 1 | 1 | ← 总计 |

### 5.2 使用 GROUPING ID

```sql
-- GROUPING_ID：将所有 GROUPING 位组合为整数
-- GROUPING_ID(dept_id, job_title)
-- = GROUPING(dept_id) * 2 + GROUPING(job_title) * 1

SELECT
    dept_id,
    job_title,
    COUNT(*) AS emp_count,
    GROUPING_ID(dept_id, job_title) AS grouping_id
FROM employees
GROUP BY ROLLUP (dept_id, job_title);

-- grouping_id 含义：
-- 0 = (dept_id, job_title)  最细粒度
-- 1 = (dept_id)             部门小计
-- 3 = ()                    总计
```

### 5.3 格式化报表输出

```sql
SELECT
    CASE WHEN GROUPING(dept_id) = 1 THEN '【总计】'
         ELSE dept_id::TEXT END AS dept,
    CASE WHEN GROUPING(job_title) = 1 THEN '【小计】'
         ELSE job_title END AS job,
    COUNT(*) AS emp_count,
    SUM(salary) AS total_salary
FROM employees
GROUP BY ROLLUP (dept_id, job_title)
ORDER BY GROUPING(dept_id), dept_id, GROUPING(job_title), job_title;
```

## 6. 组合使用

### 6.1 混合 ROLLUP 和 CUBE

```sql
SELECT
    region,
    dept_id,
    job_title,
    SUM(salary) AS total
FROM employees
GROUP BY
    region,
    ROLLUP (dept_id, job_title);
-- 等价于 GROUPING SETS (
--     (region, dept_id, job_title),
--     (region, dept_id),
--     (region)
-- )
```

### 6.2 多个 ROLLUP/CUBE

```sql
SELECT
    region,
    dept_id,
    job_title,
    SUM(salary) AS total
FROM employees
GROUP BY
    ROLLUP (region),
    ROLLUP (dept_id, job_title);
-- 等价于两个 ROLLUP 的交叉积
```

## 7. 性能考量

### 7.1 分组集数量控制

```sql
-- CUBE(5列) = 32个分组集，数据量大时性能堪忧
-- 优化：拆分为多个查询或使用 GROUPING SETS 精确指定

-- 替代 CUBE(a, b, c, d, e)
GROUP BY GROUPING SETS (
    (a, b, c),     -- 只需这三个关键分组
    (a, b),
    (a, c),
    (b, c),
    ()
)
```

### 7.2 物化视图与预聚合

```sql
-- PostgreSQL 物化视图
CREATE MATERIALIZED VIEW sales_summary AS
SELECT
    region, dept_id,
    DATE_TRUNC('month', created_at) AS month,
    SUM(amount) AS total,
    COUNT(*) AS cnt
FROM sales
GROUP BY region, dept_id, DATE_TRUNC('month', created_at);

-- 刷新物化视图
REFRESH MATERIALIZED VIEW CONCURRENTLY sales_summary;
```
