---
order: 57
title: 自然连接与USING
module: sql
category: SQL
difficulty: intermediate
description: 'SQL自然连接NATURAL JOIN与USING子句：语法、语义、使用场景与潜在陷阱'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'sql/GROUP-BY与分组集'
  - sql/连接查询
  - sql/自连接
  - sql/半连接与反半连接
prerequisites:
  - sql/概述与标准
---

## 1. 自然连接（NATURAL JOIN）

### 1.1 概念

自然连接自动基于两表中**所有同名列**进行等值连接，且结果集中同名列只保留一份。

```sql
-- 自然连接语法
SELECT * FROM employees NATURAL JOIN departments;
```

### 1.2 等价关系

```sql
-- 假设 employees 和 departments 共有列 dept_id
SELECT * FROM employees NATURAL JOIN departments;

-- 等价于
SELECT e.dept_id, e.name, e.salary, d.dept_name, d.location
FROM employees e
INNER JOIN departments d ON e.dept_id = d.dept_id;

-- 注意：自然连接自动去重同名列，只保留一份 dept_id
```

### 1.3 多同名列的自然连接

```sql
-- 假设两表共有列：dept_id 和 region
SELECT * FROM employees NATURAL JOIN departments;

-- 等价于
SELECT e.dept_id, e.region, e.name, e.salary, d.dept_name, d.location
FROM employees e
INNER JOIN departments d
    ON e.dept_id = d.dept_id AND e.region = d.region;
```

### 1.4 自然连接的风险

```sql
-- 风险1：意外的同名列导致连接条件变化
-- 假设后来给 departments 表添加了 name 列
ALTER TABLE departments ADD COLUMN name VARCHAR(100);
-- 此时 NATURAL JOIN 会同时按 dept_id 和 name 连接！
-- 结果可能返回空集

-- 风险2：难以理解的隐式行为
SELECT * FROM a NATURAL JOIN b NATURAL JOIN c;
-- 需要检查所有表的同名列才能确定连接条件

-- 风险3：列顺序依赖
-- 自然连接结果的列顺序由数据库决定，不可控
```

> **最佳实践**：生产代码中避免使用 NATURAL JOIN，改用显式 JOIN + ON 子句。

## 2. USING 子句

### 2.1 概念

USING 子句指定连接使用的同名列，是 ON 子句的简写形式。

```sql
-- USING 语法
SELECT * FROM employees
JOIN departments USING (dept_id);

-- 等价于
SELECT * FROM employees e
JOIN departments d ON e.dept_id = d.dept_id;
```

### 2.2 USING 与 ON 的区别

| 特性     | ON 子句              | USING 子句           |
| -------- | -------------------- | -------------------- |
| 列指定   | 可使用不同名列       | 只能使用同名列       |
| 条件类型 | 任意条件             | 仅等值条件           |
| 结果列   | 两表同名列各保留一份 | 同名列合并为一份     |
| 可读性   | 显式，意图明确       | 简洁，但需注意同名列 |

```sql
-- ON：两表同名列各保留
SELECT e.dept_id AS emp_dept, d.dept_id AS dept_dept
FROM employees e JOIN departments d ON e.dept_id = d.dept_id;

-- USING：同名列合并为一份
SELECT dept_id  -- 只有一列 dept_id，不能用表别名限定
FROM employees JOIN departments USING (dept_id);
```

### 2.3 多列 USING

```sql
-- 指定多个连接列
SELECT *
FROM orders o
JOIN order_items oi USING (order_id)
JOIN products p USING (product_id);

-- 等价于
SELECT *
FROM orders o
JOIN order_items oi ON o.order_id = oi.order_id
JOIN products p ON oi.product_id = p.product_id;
```

### 2.4 USING 结果中的列

```sql
-- USING 列在结果中只出现一次，且不能用表别名限定
SELECT dept_id        -- 正确，但不能写 e.dept_id 或 d.dept_id
FROM employees e
JOIN departments d USING (dept_id);

-- 如果需要区分两表的值
SELECT e.dept_id AS emp_dept_id, d.dept_id AS dept_dept_id
FROM employees e
JOIN departments d ON e.dept_id = d.dept_id;  -- 必须用 ON
```

## 3. 自然连接变体

### 3.1 NATURAL LEFT JOIN

```sql
SELECT * FROM departments
NATURAL LEFT JOIN employees;
-- 返回所有部门，即使没有员工

-- 等价于
SELECT d.dept_id, d.dept_name, d.location, e.name, e.salary
FROM departments d
LEFT JOIN employees e ON d.dept_id = e.dept_id;
```

### 3.2 NATURAL RIGHT JOIN

```sql
SELECT * FROM employees
NATURAL RIGHT JOIN departments;
-- 等价于 NATURAL LEFT JOIN 交换表顺序
```

### 3.3 NATURAL FULL JOIN

```sql
SELECT * FROM employees
NATURAL FULL JOIN departments;
-- 返回两表所有行，不匹配填 NULL
```

## 4. 实际应用建议

### 4.1 何时使用 USING

```sql
-- 适合场景：外键列名与主键列名相同，且连接条件简单
-- 常见于规范化的数据库设计中

SELECT o.order_id, o.order_date, oi.product_id, oi.quantity
FROM orders o
JOIN order_items oi USING (order_id)
JOIN products p USING (product_id);
```

### 4.2 何时避免 NATURAL JOIN

```sql
-- 避免场景：
-- 1. 表结构可能变化（新增同名列改变连接语义）
-- 2. 多表连接（隐式行为难以追踪）
-- 3. 生产环境代码（可维护性差）

-- 替代方案：显式 JOIN + ON
SELECT e.name, d.dept_name
FROM employees e
INNER JOIN departments d ON e.dept_id = d.id;  -- 明确、安全
```

### 4.3 命名约定支持 USING

```sql
-- 数据库设计时统一外键列名，便于 USING 使用
CREATE TABLE departments (
    dept_id   SERIAL PRIMARY KEY,
    dept_name VARCHAR(100)
);

CREATE TABLE employees (
    emp_id    SERIAL PRIMARY KEY,
    dept_id   INTEGER REFERENCES departments(dept_id),  -- 同名
    name      VARCHAR(100)
);

-- 这样就可以使用 USING
SELECT * FROM employees JOIN departments USING (dept_id);
```
