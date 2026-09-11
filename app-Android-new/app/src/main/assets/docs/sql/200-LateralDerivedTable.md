---
order: 200
title: LATERAL 派生表
module: 'sql'
category: 数据库
difficulty: advanced
description: SQL LATERAL派生表：横向连接的语法、关联子查询展开、逐行生成结果与性能优化
author: fanquanpp
updated: '2026-09-12'
related:
  - 'sql/170-SelfJoin'
  - 'sql/180-SemiAntiJoin'
  - 'sql/190-Subquery'
prerequisites:
  - 'sql/020-OverviewStandard'
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

| 数据库     | 语法                      | 说明                                       |
| ---------- | ------------------------- | ------------------------------------------ |
| PostgreSQL | LATERAL                   | 完整支持（9.0 起）                         |
| MySQL      | LATERAL                   | 8.0.14 起支持                              |
| SQL Server | CROSS APPLY / OUTER APPLY | 2005 起支持，等价于 LATERAL                |
| Oracle     | LATERAL / CROSS APPLY     | 12c（12.1）起同时支持两种写法              |
| SQLite     | LATERAL                   | 3.39.0（2022-06）起支持，老版本需改写为窗函 |

> 注意：旧资料常说"Oracle/SQLite 不支持 LATERAL"，该说法已过时——Oracle 12c
> 与 SQLite 3.39 都已补齐。面对老版本（如 Oracle 11g）才需要退回表函数或标量子查询。

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
## 派生表（子查询）

**基本写法：FROM 子句中的派生表**
`SELECT * FROM (SELECT <列> FROM <表>) AS <别名>`
```sql
-- 将子查询结果作为临时表
SELECT t.dept, t.avg_sal
FROM (
  SELECT dept, AVG(salary) AS avg_sal
  FROM employees
  GROUP BY dept
) AS t
WHERE t.avg_sal > 50000;
```

---

**基本写法：多派生表 JOIN**
`SELECT * FROM (SELECT ...) AS t1 JOIN (SELECT ...) AS t2 ON <条件>`
```sql
-- 两个派生表连接
SELECT d.dept_name, a.avg_sal, b.max_sal
FROM (
  SELECT dept_id, AVG(salary) AS avg_sal FROM employees GROUP BY dept_id
) AS a
JOIN (
  SELECT dept_id, MAX(salary) AS max_sal FROM employees GROUP BY dept_id
) AS b ON a.dept_id = b.dept_id
JOIN departments d ON d.id = a.dept_id;
```

---

**基本写法：派生表必须命名**
`-- 每个派生表必须有别名`
```sql
-- 正确：派生表有别名 t
SELECT * FROM (SELECT 1 AS val) AS t;

-- 错误：缺少别名
-- SELECT * FROM (SELECT 1 AS val);
```

---

## CTE 替代派生表

**基本写法：CTE 提升可读性**
`WITH <CTE名> AS (SELECT ...) SELECT * FROM <CTE名>`
```sql
-- CTE 替代派生表，可读性更好
WITH dept_stats AS (
  SELECT dept_id, AVG(salary) AS avg_sal, MAX(salary) AS max_sal
  FROM employees
  GROUP BY dept_id
)
SELECT d.dept_name, ds.avg_sal, ds.max_sal
FROM dept_stats ds
JOIN departments d ON d.id = ds.dept_id
WHERE ds.avg_sal > 50000;
```

---

**基本写法：多个 CTE**
`WITH <CTE1> AS (...), <CTE2> AS (...) SELECT ...`
```sql
-- 多个 CTE 串联
WITH
  active_emp AS (
    SELECT * FROM employees WHERE status = 'active'
  ),
  dept_avg AS (
    SELECT dept_id, AVG(salary) AS avg_sal FROM active_emp GROUP BY dept_id
  )
SELECT e.name, e.salary, da.avg_sal
FROM active_emp e
JOIN dept_avg da ON da.dept_id = e.dept_id
WHERE e.salary > da.avg_sal;
```

---

## LATERAL 子查询

**基本写法：LATERAL 关联子查询**
`SELECT * FROM <表1> t1, LATERAL (SELECT ... WHERE <条件引用t1>) t2`
```sql
-- LATERAL 允许子查询引用前面的表
-- PostgreSQL / MySQL 8.0+
SELECT e.name, t.recent_orders
FROM employees e,
LATERAL (
  SELECT COUNT(*) AS recent_orders
  FROM orders o
  WHERE o.emp_id = e.id
    AND o.create_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
) AS t;
```

---

**基本写法：LATERAL 获取 Top N**
`SELECT * FROM <表1> t1, LATERAL (SELECT ... ORDER BY ... LIMIT N) t2`
```sql
-- 获取每个部门薪资最高的 3 名员工
SELECT d.dept_name, t.emp_name, t.salary
FROM departments d,
LATERAL (
  SELECT e.name AS emp_name, e.salary
  FROM employees e
  WHERE e.dept_id = d.id
  ORDER BY e.salary DESC
  LIMIT 3
) AS t;
```

---

**基本写法：LATERAL 替代窗口函数**
`-- 某些场景 LATERAL 比窗口函数更直观`
```sql
-- 每个客户最近的 3 笔订单
SELECT c.name, t.order_date, t.amount
FROM customers c,
LATERAL (
  SELECT order_date, amount
  FROM orders o
  WHERE o.customer_id = c.id
  ORDER BY order_date DESC
  LIMIT 3
) AS t
ORDER BY c.name, t.order_date DESC;
```

---

**基本写法：MySQL LATERAL**
`-- MySQL 8.0.14+ 支持 LATERAL`
```sql
-- MySQL LATERAL 派生表
SELECT e.name, latest.amount
FROM employees e
LEFT JOIN LATERAL (
  SELECT amount FROM orders
  WHERE orders.emp_id = e.id
  ORDER BY order_date DESC
  LIMIT 1
) AS latest ON TRUE;
```

---

## LATERAL JOIN

**基本写法：LATERAL 与 JOIN 结合**
`SELECT * FROM <表1> JOIN LATERAL (<子查询>) <别名> ON TRUE`
```sql
-- LATERAL JOIN
SELECT d.dept_name, t.total
FROM departments d
JOIN LATERAL (
  SELECT SUM(salary) AS total
  FROM employees e
  WHERE e.dept_id = d.id
) AS t ON TRUE
ORDER BY t.total DESC;
```

---

**基本写法：LEFT JOIN LATERAL**
`SELECT * FROM <表1> LEFT JOIN LATERAL (...) <别名> ON TRUE`
```sql
-- LEFT JOIN LATERAL 保留左表所有行
SELECT c.name, t.latest_order
FROM customers c
LEFT JOIN LATERAL (
  SELECT MAX(order_date) AS latest_order
  FROM orders o
  WHERE o.customer_id = c.id
) AS t ON TRUE;
-- 无订单的客户 latest_order 为 NULL
```

---

## CROSS APPLY / OUTER APPLY（SQL Server）

**基本写法：SQL Server CROSS APPLY**
`SELECT * FROM <表1> CROSS APPLY (<子查询>) <别名>`
```sql
-- SQL Server 的 CROSS APPLY 等价于 LATERAL JOIN
SELECT d.dept_name, t.emp_name, t.salary
FROM departments d
CROSS APPLY (
  SELECT TOP 3 e.name AS emp_name, e.salary
  FROM employees e
  WHERE e.dept_id = d.id
  ORDER BY e.salary DESC
) AS t;
```

---

**基本写法：SQL Server OUTER APPLY**
`SELECT * FROM <表1> OUTER APPLY (<子查询>) <别名>`
```sql
-- OUTER APPLY 等价于 LEFT JOIN LATERAL
SELECT c.name, t.latest_order
FROM customers c
OUTER APPLY (
  SELECT TOP 1 order_date AS latest_order
  FROM orders o
  WHERE o.customer_id = c.id
  ORDER BY order_date DESC
) AS t;
```

---

## 应用场景

**基本写法：每组 Top N**
`SELECT ... FROM <分组表>, LATERAL (SELECT ... LIMIT N)`
```sql
-- 每个分类下销量最高的 3 个商品
SELECT cat.name AS category, t.product_name, t.sales
FROM categories cat,
LATERAL (
  SELECT p.name AS product_name, p.sales
  FROM products p
  WHERE p.category_id = cat.id
  ORDER BY p.sales DESC
  LIMIT 3
) AS t;
```

---

**基本写法：关联聚合**
`SELECT ... FROM <表1>, LATERAL (SELECT <聚合> FROM <表2> WHERE ...)`
```sql
-- 每个用户的订单统计
SELECT u.name, t.order_count, t.total_amount
FROM users u,
LATERAL (
  SELECT COUNT(*) AS order_count, SUM(amount) AS total_amount
  FROM orders o
  WHERE o.user_id = u.id
) AS t
WHERE t.order_count > 0;
```

---

**基本写法：层级查询**
`SELECT ... FROM <表1>, LATERAL (SELECT ... FROM <表2> WHERE <关联>)`
```sql
-- 每个部门及其经理信息
SELECT d.dept_name, m.name AS manager_name, m.salary AS mgr_salary
FROM departments d,
LATERAL (
  SELECT e.name, e.salary
  FROM employees e
  WHERE e.id = d.manager_id
) AS m;
```

---

## LATERAL 性能注意

**基本写法：LATERAL 可能导致嵌套循环**
`-- LATERAL 对每行外查询执行一次子查询`
```sql
-- 如果外查询表很大，LATERAL 可能很慢
-- 确保子查询有索引
-- 或改用 JOIN + 窗口函数

-- LATERAL 方式（每行执行子查询）
SELECT u.name, t.cnt
FROM users u,
LATERAL (SELECT COUNT(*) AS cnt FROM orders WHERE user_id = u.id) AS t;

-- 等价 JOIN 方式（通常更快）
SELECT u.name, o.cnt
FROM users u
LEFT JOIN (
  SELECT user_id, COUNT(*) AS cnt FROM orders GROUP BY user_id
) AS o ON o.user_id = u.id;
```

---

**基本写法：索引支持 LATERAL**
`-- 确保 LATERAL 子查询的关联条件列有索引`
```sql
-- 为关联列创建索引
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_emp ON orders(emp_id);

-- LATERAL 子查询使用索引后性能提升
SELECT e.name, t.cnt
FROM employees e,
LATERAL (
  SELECT COUNT(*) AS cnt
  FROM orders o
  WHERE o.emp_id = e.id  -- 此条件使用 idx_orders_emp
) AS t;
```
