---
order: 61
title: 子查询
module: sql
category: SQL
difficulty: intermediate
description: SQL子查询：标量子查询、行子查询、表子查询、关联子查询的语法、语义与性能优化
author: fanquanpp
updated: '2026-06-14'
related:
  - sql/半连接与反半连接
  - sql/LATERAL派生表
  - sql/公用表表达式
  - sql/递归CTE
prerequisites:
  - sql/概述与标准
---

## 1. 子查询概述

子查询（Subquery）是嵌套在另一个查询中的 SELECT 语句，可以出现在 SELECT、FROM、WHERE、HAVING 等子句中。

### 1.1 子查询分类

| 类型       | 返回结果 | 使用位置              | 示例场景           |
| ---------- | -------- | --------------------- | ------------------ |
| 标量子查询 | 单行单列 | SELECT, WHERE, HAVING | 计算平均值比较     |
| 行子查询   | 单行多列 | WHERE                 | 多列比较           |
| 列子查询   | 多行单列 | WHERE (IN, ANY, ALL)  | 集合成员判断       |
| 表子查询   | 多行多列 | FROM, EXISTS          | 派生表、存在性检查 |

### 1.2 关联 vs 非关联

```sql
-- 非关联子查询：独立于外查询
SELECT * FROM employees
WHERE dept_id IN (SELECT id FROM departments WHERE region = 'East');

-- 关联子查询：引用外查询的列
SELECT * FROM employees e
WHERE salary > (SELECT AVG(salary) FROM employees WHERE dept_id = e.dept_id);
```

## 2. 标量子查询

### 2.1 语法与用法

标量子查询返回恰好一行一列的值，可以出现在任何需要单个值的位置。

```sql
-- WHERE 中使用
SELECT * FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees);

-- SELECT 中使用
SELECT
    name,
    salary,
    (SELECT AVG(salary) FROM employees) AS company_avg,
    salary - (SELECT AVG(salary) FROM employees) AS diff
FROM employees;

-- HAVING 中使用
SELECT dept_id, AVG(salary) AS avg_salary
FROM employees
GROUP BY dept_id
HAVING AVG(salary) > (SELECT AVG(salary) FROM employees);
```

### 2.2 标量子查询返回多行的错误

```sql
-- 如果子查询返回多行，运行时错误
SELECT * FROM employees
WHERE salary = (SELECT salary FROM employees WHERE dept_id = 1);
-- 如果 dept_id=1 有多个员工，报错！

-- 修正：使用聚合确保单行
SELECT * FROM employees
WHERE salary = (SELECT MAX(salary) FROM employees WHERE dept_id = 1);
```

## 3. 行子查询

### 3.1 语法与用法

行子查询返回一行多列，用于多列比较。

```sql
-- 多列等值比较
SELECT * FROM employees
WHERE (dept_id, job_id) = (SELECT dept_id, job_id FROM employees WHERE id = 1);

-- 使用行构造器
SELECT * FROM products
WHERE (category, price) IN (
    SELECT category, MIN(price) FROM products GROUP BY category
);
```

## 4. 列子查询与集合运算符

### 4.1 IN / NOT IN

```sql
-- IN：等于子查询结果中的任一值
SELECT * FROM orders
WHERE user_id IN (SELECT id FROM users WHERE vip = true);

-- NOT IN：注意 NULL 陷阱
SELECT * FROM orders
WHERE user_id NOT IN (
    SELECT user_id FROM cancelled_orders
    WHERE user_id IS NOT NULL  -- 必须排除 NULL
);
```

### 4.2 ANY / SOME

```sql
-- ANY/SOME：与子查询结果的任一值比较
SELECT * FROM employees
WHERE salary > ANY (SELECT salary FROM employees WHERE dept_id = 5);
-- 等价于：salary > 子查询中的最小值

-- = ANY 等价于 IN
SELECT * FROM employees
WHERE dept_id = ANY (SELECT id FROM departments WHERE region = 'East');
```

### 4.3 ALL

```sql
-- ALL：与子查询结果的所有值比较
SELECT * FROM employees
WHERE salary > ALL (SELECT salary FROM employees WHERE dept_id = 5);
-- 等价于：salary > 子查询中的最大值

-- <> ALL 等价于 NOT IN（无 NULL 时）
SELECT * FROM employees
WHERE dept_id <> ALL (SELECT id FROM departments WHERE region = 'East');
```

### 4.4 ANY/ALL 与聚合函数的等价关系

| 表达式              | 等价聚合写法        |
| ------------------- | ------------------- |
| `> ANY (subquery)`  | `> MIN(subquery)`   |
| `< ANY (subquery)`  | `< MAX(subquery)`   |
| `> ALL (subquery)`  | `> MAX(subquery)`   |
| `< ALL (subquery)`  | `< MIN(subquery)`   |
| `= ANY (subquery)`  | `IN (subquery)`     |
| `<> ALL (subquery)` | `NOT IN (subquery)` |

## 5. 关联子查询

### 5.1 执行机制

关联子查询对外查询的每一行分别执行，引用外查询的列作为参数。

```sql
-- 查找每个部门薪资最高的员工
SELECT e.name, e.dept_id, e.salary
FROM employees e
WHERE e.salary = (
    SELECT MAX(e2.salary)
    FROM employees e2
    WHERE e2.dept_id = e.dept_id  -- 关联条件
);
```

### 5.2 关联子查询的性能

```sql
-- 关联子查询可能导致 O(n×m) 复杂度
-- 优化器可能将其转换为半连接或窗口函数

-- 低效写法
SELECT * FROM orders o
WHERE o.amount > (
    SELECT AVG(o2.amount) FROM orders o2 WHERE o2.user_id = o.user_id
);

-- 高效写法：使用窗口函数
SELECT * FROM (
    SELECT *,
           AVG(amount) OVER (PARTITION BY user_id) AS user_avg
    FROM orders
) t
WHERE amount > user_avg;
```

### 5.3 EXISTS 关联子查询

```sql
-- EXISTS 通常比 IN 更高效（大数据量时）
SELECT e.name
FROM employees e
WHERE EXISTS (
    SELECT 1 FROM orders o
    WHERE o.emp_id = e.id AND o.amount > 10000
);

-- NOT EXISTS 避免 NOT IN 的 NULL 陷阱
SELECT d.dept_name
FROM departments d
WHERE NOT EXISTS (
    SELECT 1 FROM employees e WHERE e.dept_id = d.id AND e.status = 'active'
);
```

## 6. 表子查询（派生表）

### 6.1 FROM 子句中的子查询

```sql
-- 派生表必须有别名
SELECT dept_avg.dept_id, dept_avg.avg_salary
FROM (
    SELECT dept_id, AVG(salary) AS avg_salary
    FROM employees
    GROUP BY dept_id
) AS dept_avg
WHERE dept_avg.avg_salary > 50000;
```

### 6.2 派生表的限制

```sql
-- 派生表不能引用同一 FROM 子句中的其他表
-- 错误：
SELECT *
FROM employees e,
     (SELECT * FROM salaries WHERE emp_id = e.id) s;  -- 不能引用 e

-- 修正：使用 LATERAL（PostgreSQL/MySQL 8.0+）
SELECT *
FROM employees e,
     LATERAL (SELECT * FROM salaries WHERE emp_id = e.id) s;
```

## 7. 子查询优化策略

### 7.1 子查询展开

优化器可能将子查询重写为连接：

```sql
-- 原始子查询
SELECT * FROM orders
WHERE user_id IN (SELECT id FROM users WHERE vip = true);

-- 优化器可能重写为
SELECT orders.*
FROM orders
SEMI JOIN users ON orders.user_id = users.id AND users.vip = true;
```

### 7.2 子查询物化

```sql
-- 优化器可能将子查询结果缓存为临时表
-- 适用于非关联子查询
SELECT * FROM orders
WHERE user_id IN (SELECT id FROM users WHERE vip = true);
-- 子查询结果缓存后，外表逐行探测
```

### 7.3 用 CTE 替代嵌套子查询

```sql
-- 嵌套子查询（可读性差）
SELECT * FROM (
    SELECT * FROM (
        SELECT dept_id, AVG(salary) AS avg_salary
        FROM employees
        GROUP BY dept_id
    ) dept_avg
    WHERE avg_salary > 50000
) high_salary_depts;

-- CTE 替代（可读性好）
WITH dept_avg AS (
    SELECT dept_id, AVG(salary) AS avg_salary
    FROM employees
    GROUP BY dept_id
),
high_salary_depts AS (
    SELECT * FROM dept_avg WHERE avg_salary > 50000
)
SELECT * FROM high_salary_depts;
```
