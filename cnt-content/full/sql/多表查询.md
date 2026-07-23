---
order: 3
title: 多表查询
module: sql
category: SQL
difficulty: intermediate
description: 'JOIN 类型、自连接、子查询、EXISTS/IN、CTE 与递归 CTE'
author: fanquanpp
updated: '2026-06-14'
related:
  - sql/概述与标准
  - sql/数据查询基础
  - sql/数据操作
  - sql/数据定义
prerequisites: []
---

# 多表查询

## JOIN 类型概览

关系型数据库的核心思想是将数据分散到不同表中，通过外键关联。JOIN 是将这些分散数据重新组合的手段。

```
┌─────────────┐     ┌─────────────┐
│   Table A    │     │   Table B    │
│  ┌───┬───┐  │     │  ┌───┬───┐  │
│  │ 1 │ a │  │     │  │ 1 │ x │  │
│  │ 2 │ b │  │     │  │ 2 │ y │  │
│  │ 3 │ c │  │     │  │ 4 │ z │  │
│  └───┴───┘  │     │  └───┴───┘  │
└─────────────┘     └─────────────┘

INNER JOIN:  1-a-x, 2-b-y          (交集)
LEFT JOIN:   1-a-x, 2-b-y, 3-c-∅  (A 全部 + 匹配的 B)
RIGHT JOIN:  1-a-x, 2-b-y, ∅-4-z  (B 全部 + 匹配的 A)
FULL JOIN:   1-a-x, 2-b-y, 3-c-∅, ∅-4-z  (并集)
CROSS JOIN:  3×3 = 9 行             (笛卡尔积)
```

## INNER JOIN

内连接：只返回两表中匹配的行。

```sql
-- 基本内连接
SELECT e.name, d.department_name
FROM employees e
INNER JOIN departments d ON e.dept_id = d.id;

-- INNER 可省略
SELECT e.name, d.department_name
FROM employees e
JOIN departments d ON e.dept_id = d.id;

-- 多表连接
SELECT o.order_id, c.name, p.product_name, oi.quantity
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id;

-- 复合连接条件
SELECT e.name, d.department_name
FROM employees e
JOIN departments d ON e.dept_id = d.id AND d.is_active = true;
```

## LEFT JOIN（左外连接）

左连接：返回左表所有行，右表无匹配时填充 NULL。

```sql
-- 查询所有员工及其部门（包括没有部门的员工）
SELECT e.name, d.department_name
FROM employees e
LEFT JOIN departments d ON e.dept_id = d.id;

-- 找出没有部门的员工（左连接 + IS NULL 过滤）
SELECT e.name
FROM employees e
LEFT JOIN departments d ON e.dept_id = d.id
WHERE d.id IS NULL;

-- 多层左连接
SELECT
  u.name,
  o.order_id,
  p.product_name
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id;
```

## RIGHT JOIN（右外连接）

右连接：返回右表所有行，左表无匹配时填充 NULL。

```sql
-- 查询所有部门及其员工（包括没有员工的部门）
SELECT e.name, d.department_name
FROM employees e
RIGHT JOIN departments d ON e.dept_id = d.id;

-- 右连接可以改写为左连接（推荐，可读性更好）
SELECT e.name, d.department_name
FROM departments d
LEFT JOIN employees e ON e.dept_id = d.id;
```

## FULL JOIN（全外连接）

全连接：返回两表所有行，无匹配时填充 NULL。

```sql
-- PostgreSQL / SQL Server / Oracle
SELECT e.name, d.department_name
FROM employees e
FULL JOIN departments d ON e.dept_id = d.id;

-- MySQL 不支持 FULL JOIN，用 UNION 模拟
SELECT e.name, d.department_name
FROM employees e
LEFT JOIN departments d ON e.dept_id = d.id
UNION
SELECT e.name, d.department_name
FROM employees e
RIGHT JOIN departments d ON e.dept_id = d.id;

-- 找出两表不匹配的行
SELECT e.name, d.department_name
FROM employees e
FULL JOIN departments d ON e.dept_id = d.id
WHERE e.id IS NULL OR d.id IS NULL;
```

## CROSS JOIN（交叉连接）

交叉连接：返回两表的笛卡尔积（每行组合）。

```sql
-- 显式交叉连接
SELECT d.department_name, j.job_level
FROM departments d
CROSS JOIN job_levels j;

-- 隐式交叉连接（不推荐）
SELECT d.department_name, j.job_level
FROM departments d, job_levels j;

-- 实际用途：生成日期维度表
SELECT d.date, h.hour
FROM dates d
CROSS JOIN hours h;
```

## 自连接

自连接：表与自身连接，用于处理层级数据。

```sql
-- 员工与经理关系
SELECT
  e.name AS employee,
  m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;

-- 查找同一部门中薪资相同的员工
SELECT a.name, b.name, a.salary
FROM employees a
JOIN employees b ON a.dept_id = b.dept_id AND a.salary = b.salary AND a.id < b.id;

-- 组织层级查询（固定层级）
SELECT
  e3.name AS level3,
  e2.name AS level2,
  e1.name AS level1
FROM employees e1
LEFT JOIN employees e2 ON e2.manager_id = e1.id
LEFT JOIN employees e3 ON e3.manager_id = e2.id
WHERE e1.manager_id IS NULL;  -- 顶级
```

## 自然连接与 USING 子句

```sql
-- NATURAL JOIN: 自动按同名列连接（不推荐，不可控）
SELECT * FROM employees NATURAL JOIN departments;

-- USING 子句: 指定同名列连接（比 ON 更简洁）
SELECT e.name, department_id
FROM employees e
JOIN departments d USING (department_id);

-- USING 与 ON 的区别
-- USING: 连接列只出现一次
-- ON:    连接列可能出现两次（需要指定表别名）
```

## 子查询

### 标量子查询

返回单个值的子查询：

```sql
-- 查询薪资高于平均值的员工
SELECT name, salary
FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees);

-- 在 SELECT 中使用
SELECT
  name,
  salary,
  (SELECT AVG(salary) FROM employees) AS avg_salary,
  salary - (SELECT AVG(salary) FROM employees) AS diff
FROM employees;
```

### 列子查询

返回一列值的子查询：

```sql
-- IN 子查询
SELECT name FROM employees
WHERE dept_id IN (SELECT id FROM departments WHERE location = 'Beijing');

-- ANY / SOME: 与子查询返回的任一值比较
SELECT name, salary FROM employees
WHERE salary > ANY (SELECT salary FROM employees WHERE dept_id = 5);
-- 等价于: 大于子查询结果中的最小值

-- ALL: 与子查询返回的所有值比较
SELECT name, salary FROM employees
WHERE salary > ALL (SELECT salary FROM employees WHERE dept_id = 5);
-- 等价于: 大于子查询结果中的最大值
```

### 表子查询

返回多行多列的子查询：

```sql
-- 在 FROM 中使用（派生表）
SELECT dept_name, avg_salary
FROM (
  SELECT department AS dept_name, AVG(salary) AS avg_salary
  FROM employees
  GROUP BY department
) AS dept_stats
WHERE avg_salary > 50000;

-- MySQL 要求派生表必须有别名
-- PostgreSQL 也要求

-- 多列 IN
SELECT * FROM orders
WHERE (customer_id, order_date) IN (
  SELECT customer_id, MAX(order_date)
  FROM orders
  GROUP BY customer_id
);
```

### 相关子查询

子查询引用外层查询的列：

```sql
-- 查询每个部门薪资最高的员工
SELECT name, department, salary
FROM employees e
WHERE salary = (
  SELECT MAX(salary)
  FROM employees e2
  WHERE e2.department = e.department
);

-- EXISTS 形式（通常更高效）
SELECT name, department, salary
FROM employees e
WHERE EXISTS (
  SELECT 1 FROM employees e2
  WHERE e2.department = e.department AND e2.salary > e.salary
) = false;
```

## EXISTS 与 IN

```sql
-- EXISTS: 检查子查询是否返回行
-- 适合: 子查询表大、外层表小
SELECT d.department_name
FROM departments d
WHERE EXISTS (
  SELECT 1 FROM employees e
  WHERE e.dept_id = d.id AND e.salary > 100000
);

-- IN: 检查值是否在子查询结果中
-- 适合: 子查询结果集小
SELECT d.department_name
FROM departments d
WHERE d.id IN (
  SELECT dept_id FROM employees WHERE salary > 100000
);

-- NOT EXISTS vs NOT IN
--  NOT IN 遇到 NULL 会返回空结果
--  NOT EXISTS 不受 NULL 影响

--  如果子查询包含 NULL，NOT IN 整体返回空
SELECT name FROM employees
WHERE dept_id NOT IN (SELECT dept_id FROM employees WHERE salary > 100000);
-- 如果有 dept_id 为 NULL 的行，结果为空

--  使用 NOT EXISTS 更安全
SELECT name FROM employees e
WHERE NOT EXISTS (
  SELECT 1 FROM employees e2
  WHERE e2.dept_id = e.dept_id AND e2.salary > 100000
);
```

## CTE（通用表表达式）

CTE（Common Table Expression）使用 `WITH` 子句定义临时结果集，比子查询更清晰。

### 基本 CTE

```sql
-- 用 CTE 替代派生表
WITH dept_stats AS (
  SELECT department, AVG(salary) AS avg_salary, COUNT(*) AS emp_count
  FROM employees
  GROUP BY department
)
SELECT department, avg_salary
FROM dept_stats
WHERE emp_count > 5
ORDER BY avg_salary DESC;

-- 多个 CTE
WITH
  high_salary AS (
    SELECT * FROM employees WHERE salary > 80000
  ),
  dept_avg AS (
    SELECT department, AVG(salary) AS avg_salary
    FROM employees
    GROUP BY department
  )
SELECT h.name, h.salary, d.avg_salary
FROM high_salary h
JOIN dept_avg d ON h.department = d.department;
```

### CTE 的优势

```sql
-- 1. 可读性：逻辑分层清晰
WITH
  monthly_sales AS (
    SELECT DATE_TRUNC('month', order_date) AS month, SUM(amount) AS total
    FROM orders
    GROUP BY month
  ),
  growth AS (
    SELECT
      month,
      total,
      LAG(total) OVER(ORDER BY month) AS prev_total
    FROM monthly_sales
  )
SELECT month, total,
  ROUND((total - prev_total) * 100.0 / NULLIF(prev_total, 0), 2) AS growth_pct
FROM growth;

-- 2. 可复用：同一 CTE 可在主查询中多次引用
WITH active_users AS (
  SELECT * FROM users WHERE last_login > CURRENT_DATE - INTERVAL '30 days'
)
SELECT 'total' AS metric, COUNT(*) AS value FROM active_users
UNION ALL
SELECT 'premium', COUNT(*) FROM active_users WHERE plan = 'premium'
UNION ALL
SELECT 'free', COUNT(*) FROM active_users WHERE plan = 'free';

-- 3. 递归查询（见下节）
```

### 递归 CTE

递归 CTE 用于处理层级或图结构数据：

```sql
-- 基本语法
WITH RECURSIVE cte_name AS (
  -- 锚点查询（非递归部分，起点）
  SELECT ...
  UNION ALL
  -- 递归部分（引用自身）
  SELECT ... FROM cte_name WHERE ...
)
SELECT * FROM cte_name;
```

#### 组织架构层级

```sql
WITH RECURSIVE org_tree AS (
  -- 锚点：顶级经理
  SELECT id, name, manager_id, 1 AS level, CAST(name AS VARCHAR(1000)) AS path
  FROM employees
  WHERE manager_id IS NULL

  UNION ALL

  -- 递归：下属员工
  SELECT e.id, e.name, e.manager_id, ot.level + 1,
    CAST(ot.path || ' > ' || e.name AS VARCHAR(1000))
  FROM employees e
  JOIN org_tree ot ON e.manager_id = ot.id
)
SELECT id, name, level, path FROM org_tree ORDER BY path;
```

#### 数字序列生成

```sql
WITH RECURSIVE nums AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM nums WHERE n < 100
)
SELECT n FROM nums;

-- PostgreSQL 更简洁的方式
SELECT generate_series(1, 100) AS n;
```

#### 路径查找（图遍历）

```sql
-- 查找从城市 A 到城市 B 的所有路径
WITH RECURSIVE routes AS (
  -- 起点
  SELECT
    from_city,
    to_city,
    CAST(from_city || ' -> ' || to_city AS VARCHAR(1000)) AS route,
    distance AS total_distance,
    1 AS hops
  FROM flights
  WHERE from_city = 'Beijing'

  UNION ALL

  -- 递归：继续飞往下一个城市
  SELECT
    f.from_city,
    f.to_city,
    CAST(r.route || ' -> ' || f.to_city AS VARCHAR(1000)),
    r.total_distance + f.distance,
    r.hops + 1
  FROM flights f
  JOIN routes r ON f.from_city = r.to_city
  WHERE r.hops < 5            -- 限制最大中转次数
    AND r.route NOT LIKE '%>' || f.to_city || '%'  -- 避免环路
)
SELECT route, total_distance, hops
FROM routes
WHERE to_city = 'Shanghai'
ORDER BY total_distance;
```

#### 日期序列

```sql
WITH RECURSIVE date_series AS (
  SELECT DATE '2024-01-01' AS dt
  UNION ALL
  SELECT dt + INTERVAL '1 day' FROM date_series WHERE dt < DATE '2024-12-31'
)
SELECT dt FROM date_series;
```

## JOIN 性能建议

```sql
-- 1. 小表驱动大表
--  小表在左（逻辑上更清晰）
SELECT * FROM small_table s JOIN big_table b ON s.id = b.small_id;

-- 2. 连接列上建索引
CREATE INDEX idx_orders_customer_id ON orders(customer_id);

-- 3. 避免在 JOIN 条件上使用函数
--
SELECT * FROM users u JOIN orders o ON LOWER(u.email) = LOWER(o.email);
--
SELECT * FROM users u JOIN orders o ON u.email = o.email;

-- 4. 优先使用 EXISTS 替代 IN（大数据量时）
-- 5. 优先使用 CTE 替代嵌套子查询（可读性更好）
-- 6. 限制 JOIN 的表数量（建议不超过 5 张）
```

## 小结

- `INNER JOIN` 返回交集，`LEFT JOIN` 保留左表全部，`FULL JOIN` 保留两表全部
- 自连接用于层级数据，需注意使用表别名区分
- `EXISTS` 通常比 `IN` 更高效，`NOT EXISTS` 比 `NOT IN` 更安全（不受 NULL 影响）
- CTE 提供了比子查询更好的可读性和可维护性
- 递归 CTE 是处理层级和图结构数据的利器，务必设置终止条件防止无限递归
- JOIN 性能优化的核心：索引、小表驱动、避免函数包裹连接列
