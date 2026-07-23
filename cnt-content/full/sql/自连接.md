---
order: 58
title: 自连接
module: sql
category: SQL
difficulty: intermediate
description: SQL自连接：同一表与自身连接的语法、典型场景（层级结构、比较、去重）与性能优化
author: fanquanpp
updated: '2026-06-14'
related:
  - sql/连接查询
  - sql/自然连接与USING
  - sql/半连接与反半连接
  - sql/LATERAL派生表
prerequisites:
  - sql/概述与标准
---

## 1. 自连接概述

自连接（Self Join）是将同一张表与自身进行连接的操作。表在自连接中扮演两个不同角色，需要使用不同的别名区分。

```sql
-- 自连接基本语法
SELECT a.column_name, b.column_name
FROM table_name AS a
JOIN table_name AS b ON a.some_id = b.some_id;
```

## 2. 典型场景

### 2.1 层级结构查询

```sql
-- 员工-经理关系
CREATE TABLE employees (
    emp_id    SERIAL PRIMARY KEY,
    name      VARCHAR(100),
    manager_id INTEGER REFERENCES employees(emp_id),
    dept_id   INTEGER
);

-- 查询员工及其直接上级
SELECT
    e.name AS employee,
    m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.emp_id;

-- 查询同一经理下的所有员工对
SELECT
    e1.name AS emp1,
    e2.name AS emp2,
    e1.manager_id
FROM employees e1
JOIN employees e2 ON e1.manager_id = e2.manager_id AND e1.emp_id < e2.emp_id;
```

### 2.2 同表比较

```sql
-- 查找薪资高于所在部门平均薪资的员工
SELECT e.name, e.salary, e.dept_id
FROM employees e
JOIN (
    SELECT dept_id, AVG(salary) AS avg_salary
    FROM employees
    GROUP BY dept_id
) dept_avg ON e.dept_id = dept_avg.dept_id
WHERE e.salary > dept_avg.avg_salary;

-- 使用自连接比较相邻行
SELECT
    curr.order_date,
    curr.amount AS current_amount,
    prev.amount AS previous_amount,
    curr.amount - prev.amount AS diff
FROM daily_sales curr
JOIN daily_sales prev ON curr.order_date = prev.order_date + INTERVAL '1 day';
```

### 2.3 查找重复数据

```sql
-- 查找重复记录
SELECT a.emp_id, a.name, a.email
FROM employees a
JOIN employees b ON a.email = b.email AND a.emp_id <> b.emp_id;

-- 查找每组中除最新一条外的重复记录
SELECT a.id, a.user_id, a.action
FROM user_actions a
JOIN (
    SELECT user_id, MAX(created_at) AS latest
    FROM user_actions
    GROUP BY user_id
) b ON a.user_id = b.user_id AND a.created_at < b.latest;
```

### 2.4 路径与距离计算

```sql
-- 航班中转查询
CREATE TABLE flights (
    flight_id   SERIAL PRIMARY KEY,
    from_city   VARCHAR(50),
    to_city     VARCHAR(50),
    distance    INTEGER
);

-- 查找经停一次的航线
SELECT
    f1.from_city,
    f1.to_city AS via_city,
    f2.to_city,
    f1.distance + f2.distance AS total_distance
FROM flights f1
JOIN flights f2 ON f1.to_city = f2.from_city
WHERE f1.from_city = '北京' AND f2.to_city = '上海';
```

## 3. 自连接与递归查询

### 3.1 自连接的局限

```sql
-- 自连接只能查询固定层级
-- 查询2层：1次自连接
SELECT e.name, m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.emp_id;

-- 查询3层：2次自连接
SELECT e.name, m1.name AS manager, m2.name AS senior_manager
FROM employees e
LEFT JOIN employees m1 ON e.manager_id = m1.emp_id
LEFT JOIN employees m2 ON m1.manager_id = m2.emp_id;

-- 层级不确定时，应使用递归 CTE
```

### 3.2 递归 CTE 替代方案

```sql
-- 使用递归 CTE 查询任意层级
WITH RECURSIVE org_chart AS (
    -- 基础查询：顶级经理
    SELECT emp_id, name, manager_id, 1 AS level
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    -- 递归查询：下属
    SELECT e.emp_id, e.name, e.manager_id, oc.level + 1
    FROM employees e
    JOIN org_chart oc ON e.manager_id = oc.emp_id
)
SELECT * FROM org_chart ORDER BY level, name;
```

## 4. 性能优化

### 4.1 索引策略

```sql
-- 自连接的连接列需要索引
CREATE INDEX idx_employees_manager_id ON employees(manager_id);

-- 覆盖索引减少回表
CREATE INDEX idx_employees_manager_cover ON employees(manager_id, name, salary);
```

### 4.2 避免笛卡尔积

```sql
-- 错误：缺少连接条件导致笛卡尔积
SELECT a.*, b.*
FROM employees a, employees b;  -- n × n 行！

-- 正确：明确连接条件
SELECT a.name, b.name
FROM employees a
JOIN employees b ON a.manager_id = b.emp_id;
```

### 4.3 使用不等条件控制结果

```sql
-- 使用 < 而非 <> 避免重复对
SELECT a.name AS emp1, b.name AS emp2
FROM employees a
JOIN employees b ON a.dept_id = b.dept_id AND a.emp_id < b.emp_id;
-- 只返回 (a,b) 不返回 (b,a)
```
