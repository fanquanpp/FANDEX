---
order: 62
title: 高级SQL
module: postgresql
category: PostgreSQL
difficulty: advanced
description: PostgreSQL高级SQL：窗口函数、CTE与递归CTE、横向连接、分组集与高级聚合
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/分区表
  - postgresql/分区裁剪与分区连接
  - postgresql/MERGE语句增强
  - postgresql/JSON表格函数
prerequisites:
  - postgresql/概述与安装配置
---

## 1. 窗口函数

```sql
-- 排名函数
SELECT name, dept_id, salary,
    RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rank,
    DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS dense_rank,
    ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS row_num
FROM employees;

-- 累计聚合
SELECT order_date, amount,
    SUM(amount) OVER (ORDER BY order_date) AS cumulative,
    AVG(amount) OVER (ORDER BY order_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS moving_avg
FROM daily_sales;

-- LAG/LEAD
SELECT order_date, amount,
    amount - LAG(amount) OVER (ORDER BY order_date) AS day_over_day
FROM daily_sales;

-- FILTER 子句
SELECT dept_id,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE salary > 50000) AS high_earners
FROM employees
GROUP BY dept_id;
```

## 2. CTE 与递归 CTE

```sql
-- CTE
WITH dept_stats AS (
    SELECT dept_id, AVG(salary) AS avg_salary
    FROM employees GROUP BY dept_id
)
SELECT e.name, e.salary, ds.avg_salary
FROM employees e JOIN dept_stats ds ON e.dept_id = ds.dept_id;

-- 递归 CTE
WITH RECURSIVE org_tree AS (
    SELECT emp_id, name, manager_id, 1 AS level
    FROM employees WHERE manager_id IS NULL
    UNION ALL
    SELECT e.emp_id, e.name, e.manager_id, ot.level + 1
    FROM employees e JOIN org_tree ot ON e.manager_id = ot.emp_id
)
SELECT * FROM org_tree;
```

## 3. 横向连接

```sql
-- LATERAL：每行执行子查询
SELECT d.dept_name, top3.name, top3.salary
FROM departments d,
LATERAL (
    SELECT name, salary FROM employees
    WHERE dept_id = d.id
    ORDER BY salary DESC LIMIT 3
) top3;
```

## 4. 分组集

```sql
-- ROLLUP
SELECT dept_id, job_title, SUM(salary)
FROM employees
GROUP BY ROLLUP (dept_id, job_title);

-- CUBE
SELECT dept_id, job_title, SUM(salary)
FROM employees
GROUP BY CUBE (dept_id, job_title);

-- GROUPING SETS
SELECT dept_id, job_title, SUM(salary)
FROM employees
GROUP BY GROUPING SETS ((dept_id, job_title), (dept_id), ());
```
