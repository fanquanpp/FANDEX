---
order: 60
title: LATERAL派生表
module: sql
category: SQL
difficulty: advanced
description: 'SQL LATERAL派生表：横向连接的语法、关联子查询展开、逐行生成结果与性能优化'
author: fanquanpp
updated: '2026-06-14'
related:
  - sql/自连接
  - sql/半连接与反半连接
  - sql/子查询
  - sql/公用表表达式
prerequisites:
  - sql/概述与标准
---

## 1. LATERAL 概述

### 1.1 什么是 LATERAL

LATERAL 关键字允许子查询引用它之前出现的表（FROM 子句中的表），使子查询能够对外查询的每一行分别执行。类似于关联子查询，但 LATERAL 子查询返回的是行集合而非标量值。

```sql
-- LATERAL 基本语法
SELECT t1.*, sub.*
FROM table1 t1,
LATERAL (SELECT * FROM table2 WHERE table2.id = t1.id) sub;
```

### 1.2 LATERAL 与普通子查询的区别

| 特性     | 普通子查询 | LATERAL 子查询      |
| -------- | ---------- | ------------------- |
| 引用外表 | 不可以     | 可以                |
| 执行方式 | 一次执行   | 对外表每行执行一次  |
| 返回结果 | 固定结果集 | 依赖外表当前行      |
| 出现位置 | FROM 子句  | FROM 子句 + LATERAL |

```sql
-- 普通子查询：不能引用外表
SELECT *
FROM employees,
     (SELECT * FROM departments WHERE id = 1) d;  -- 固定结果

-- LATERAL 子查询：可以引用外表
SELECT e.name, d.dept_name
FROM employees e,
     LATERAL (SELECT * FROM departments WHERE id = e.dept_id) d;  -- 逐行关联
```

## 2. 典型应用场景

### 2.1 获取每组 Top N

```sql
-- 每个部门薪资最高的3名员工
SELECT d.dept_name, top3.name, top3.salary
FROM departments d,
LATERAL (
    SELECT e.name, e.salary
    FROM employees e
    WHERE e.dept_id = d.id
    ORDER BY e.salary DESC
    LIMIT 3
) top3;

-- 等价的窗口函数写法（但 LATERAL 更直观）
SELECT dept_name, name, salary
FROM (
    SELECT d.dept_name, e.name, e.salary,
           ROW_NUMBER() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS rn
    FROM departments d
    JOIN employees e ON d.id = e.dept_id
) t
WHERE rn <= 3;
```

### 2.2 参数化计算

```sql
-- 每个用户的最近5次登录记录
SELECT u.name, recent.login_time, recent.ip
FROM users u,
LATERAL (
    SELECT login_time, ip
    FROM login_logs l
    WHERE l.user_id = u.id
    ORDER BY login_time DESC
    LIMIT 5
) recent;
```

### 2.3 复杂聚合展开

```sql
-- 每个订单及其关联的统计信息
SELECT o.order_id, o.total_amount, stats.item_count, stats.avg_price
FROM orders o,
LATERAL (
    SELECT
        COUNT(*) AS item_count,
        AVG(unit_price) AS avg_price
    FROM order_items oi
    WHERE oi.order_id = o.order_id
) stats;
```

### 2.4 函数调用与数据生成

```sql
-- 每个用户生成最近7天的日期序列
SELECT u.name, d.day
FROM users u,
LATERAL (
    SELECT generate_series(
        CURRENT_DATE - INTERVAL '6 days',
        CURRENT_DATE,
        INTERVAL '1 day'
    )::DATE AS day
) d;

-- 地理空间：每个门店3公里范围内的客户
SELECT s.store_name, nearby.customer_name
FROM stores s,
LATERAL (
    SELECT c.name AS customer_name
    FROM customers c
    WHERE ST_DWithin(s.location, c.location, 3000)
    ORDER BY ST_Distance(s.location, c.location)
    LIMIT 10
) nearby;
```

## 3. LATERAL 与 JOIN 的关系

### 3.1 LATERAL JOIN 等价形式

```sql
-- LATERAL + 逗号语法
SELECT e.*, sub.*
FROM employees e,
LATERAL (SELECT * FROM salaries WHERE emp_id = e.id) sub;

-- 等价的 CROSS JOIN LATERAL
SELECT e.*, sub.*
FROM employees e
CROSS JOIN LATERAL (SELECT * FROM salaries WHERE emp_id = e.id) sub;

-- 等价的 LEFT JOIN LATERAL（保留无匹配的左表行）
SELECT e.*, sub.*
FROM employees e
LEFT JOIN LATERAL (SELECT * FROM salaries WHERE emp_id = e.id) sub ON true;
```

### 3.2 LATERAL 与 INNER JOIN 的区别

```sql
-- INNER JOIN：子查询独立执行
SELECT e.*, s.amount
FROM employees e
JOIN salaries s ON s.emp_id = e.id;

-- LATERAL：子查询可以引用外表
SELECT e.*, sub.max_amount
FROM employees e,
LATERAL (
    SELECT MAX(amount) AS max_amount
    FROM salaries s
    WHERE s.emp_id = e.id AND s.year = e.current_year  -- 引用外表列
) sub;
```

## 4. 各数据库支持

| 数据库     | 语法                      | 说明                |
| ---------- | ------------------------- | ------------------- |
| PostgreSQL | LATERAL                   | 完整支持            |
| MySQL 8.0  | LATERAL                   | 完整支持            |
| SQL Server | CROSS APPLY / OUTER APPLY | 等价于 LATERAL      |
| Oracle     | 无 LATERAL，用表函数替代  | 可用 PIPELINED 函数 |
| SQLite     | 不支持                    | —                   |

```sql
-- SQL Server 等价语法
SELECT e.*, sub.max_amount
FROM employees e
CROSS APPLY (
    SELECT MAX(amount) AS max_amount
    FROM salaries s
    WHERE s.emp_id = e.id
) sub;

-- OUTER APPLY 等价于 LEFT JOIN LATERAL
SELECT e.*, sub.max_amount
FROM employees e
OUTER APPLY (
    SELECT MAX(amount) AS max_amount
    FROM salaries s
    WHERE s.emp_id = e.id
) sub;
```

## 5. 性能考量

### 5.1 执行计划

```sql
-- LATERAL 子查询对外表每行执行一次
-- 如果外表有 N 行，子查询执行 N 次
-- 确保子查询中的连接列有索引

EXPLAIN ANALYZE
SELECT d.dept_name, top3.name
FROM departments d,
LATERAL (
    SELECT name FROM employees
    WHERE dept_id = d.id
    ORDER BY salary DESC LIMIT 3
) top3;

-- 查看是否使用索引扫描子查询
```

### 5.2 优化策略

```sql
-- 优化1：减少外表行数
SELECT d.dept_name, top3.name
FROM departments d,
LATERAL (SELECT name FROM employees WHERE dept_id = d.id ORDER BY salary DESC LIMIT 3) top3
WHERE d.region = 'East';  -- 先过滤部门

-- 优化2：子查询使用索引
CREATE INDEX idx_employees_dept_salary ON employees(dept_id, salary DESC);

-- 优化3：考虑使用窗口函数替代（大数据量时可能更优）
SELECT dept_name, name
FROM (
    SELECT d.dept_name, e.name,
           ROW_NUMBER() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS rn
    FROM departments d
    JOIN employees e ON d.id = e.dept_id
) t
WHERE rn <= 3;
```
