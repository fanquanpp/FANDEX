---
order: 200
title: 连接查询
module: 'sql'
category: 数据库
difficulty: intermediate
description: SQL连接查询：INNER JOIN、LEFT JOIN、RIGHT JOIN、FULL JOIN、CROSS JOIN、NATURAL JOIN的语法、语义与性能
author: fanquanpp
updated: '2026-08-30'
related:
  - 'sql/018-AggregateFunction'
  - 'sql/019-GROUPBYGroupingSet'
  - 'sql/021-NaturalJoinUsing'
  - 'sql/022-SelfJoin'
prerequisites:
  - 'sql/002-OverviewStandard'
---

## 1. 连接查询概述

连接（JOIN）是 SQL 最强大的特性之一，用于根据列之间的关系组合两个或多个表中的行。

### 1.1 连接类型分类

| 类型     | 关键字       | 说明                    |
| -------- | ------------ | ----------------------- |
| 内连接   | INNER JOIN   | 只返回匹配行            |
| 左外连接 | LEFT JOIN    | 左表全部 + 右表匹配     |
| 右外连接 | RIGHT JOIN   | 右表全部 + 左表匹配     |
| 全外连接 | FULL JOIN    | 两表全部，不匹配填 NULL |
| 交叉连接 | CROSS JOIN   | 笛卡尔积                |
| 自然连接 | NATURAL JOIN | 同名列自动等值连接      |

### 1.2 连接的基本语法

```sql
SELECT select_list
FROM left_table [AS] alias
[JOIN_TYPE] right_table [AS] alias
ON join_condition;
```

## 2. INNER JOIN

### 2.1 基本用法

```sql
-- 只返回两表中满足连接条件的行
SELECT e.name, d.dept_name
FROM employees e
INNER JOIN departments d ON e.dept_id = d.id;
```

### 2.2 等值连接与非等值连接

```sql
-- 等值连接（最常见）
SELECT e.name, d.dept_name
FROM employees e
JOIN departments d ON e.dept_id = d.id;

-- 非等值连接
SELECT e.name, g.grade
FROM employees e
JOIN salary_grades g ON e.salary BETWEEN g.min_salary AND g.max_salary;
```

### 2.3 多表连接

```sql
SELECT e.name, d.dept_name, j.job_title
FROM employees e
JOIN departments d ON e.dept_id = d.id
JOIN jobs j ON e.job_id = j.id
WHERE d.region = 'East';
```

## 3. LEFT JOIN（左外连接）

### 3.1 基本用法

```sql
-- 返回左表所有行，右表无匹配时填 NULL
SELECT d.dept_name, e.name
FROM departments d
LEFT JOIN employees e ON d.id = e.dept_id;
```

### 3.2 LEFT JOIN 的典型场景

```sql
-- 场景1：查找没有员工的部门
SELECT d.dept_name
FROM departments d
LEFT JOIN employees e ON d.id = e.dept_id
WHERE e.id IS NULL;

-- 场景2：统计每个部门的员工数（包括0人部门）
SELECT d.dept_name, COUNT(e.id) AS emp_count
FROM departments d
LEFT JOIN employees e ON d.id = e.dept_id
GROUP BY d.id, d.dept_name;
```

### 3.3 LEFT JOIN + WHERE 陷阱

```sql
-- 错误：WHERE 条件使 LEFT JOIN 退化为 INNER JOIN
SELECT d.dept_name, e.name
FROM departments d
LEFT JOIN employees e ON d.id = e.dept_id
WHERE e.status = 'active';  -- 过滤掉了没有员工的部门

-- 正确：将右表过滤条件移到 ON 子句
SELECT d.dept_name, e.name
FROM departments d
LEFT JOIN employees e ON d.id = e.dept_id AND e.status = 'active';
```

## 4. RIGHT JOIN（右外连接）

```sql
-- 返回右表所有行，左表无匹配时填 NULL
-- RIGHT JOIN 等价于交换表顺序的 LEFT JOIN
SELECT e.name, d.dept_name
FROM employees e
RIGHT JOIN departments d ON e.dept_id = d.id;

-- 等价写法
SELECT e.name, d.dept_name
FROM departments d
LEFT JOIN employees e ON e.dept_id = d.id;
```

> **最佳实践**：统一使用 LEFT JOIN，避免混用 LEFT/RIGHT 增加可读性难度。

## 5. FULL JOIN（全外连接）

### 5.1 基本用法

```sql
-- 返回两表所有行，不匹配时填 NULL
SELECT e.name, d.dept_name
FROM employees e
FULL JOIN departments d ON e.dept_id = d.id;
```

### 5.2 典型场景

```sql
-- 场景1：查找两表不匹配的行
SELECT e.name, d.dept_name
FROM employees e
FULL JOIN departments d ON e.dept_id = d.id
WHERE e.id IS NULL OR d.id IS NULL;

-- 场景2：合并两表数据（去重 UNION）
SELECT COALESCE(a.id, b.id) AS id,
       COALESCE(a.name, b.name) AS name
FROM table_a a
FULL JOIN table_b b ON a.id = b.id;
```

### 5.3 MySQL 中的 FULL JOIN 替代

```sql
-- MySQL 不支持 FULL JOIN，使用 UNION ALL 替代
SELECT e.name, d.dept_name
FROM employees e
LEFT JOIN departments d ON e.dept_id = d.id
UNION ALL
SELECT e.name, d.dept_name
FROM employees e
RIGHT JOIN departments d ON e.dept_id = d.id
WHERE e.id IS NULL;
```

## 6. CROSS JOIN（交叉连接）

### 6.1 基本用法

```sql
-- 笛卡尔积：m行 × n行 = m×n行
SELECT d.dept_name, j.job_title
FROM departments d
CROSS JOIN jobs j;

-- 隐式交叉连接
SELECT d.dept_name, j.job_title
FROM departments d, jobs j;
```

### 6.2 典型场景

```sql
-- 场景1：生成日期×产品的组合矩阵
SELECT d.date_key, p.product_id
FROM dim_date d
CROSS JOIN dim_product p
WHERE d.date_key BETWEEN '2026-01-01' AND '2026-12-31';

-- 场景2：生成序列
SELECT x.n, y.m
FROM (SELECT generate_series(1, 12) AS n) x
CROSS JOIN (SELECT generate_series(1, 31) AS m) y;
```

## 7. 连接的执行原理

### 7.1 连接算法

| 算法              | 时间复杂度               | 适用场景         |
| ----------------- | ------------------------ | ---------------- |
| Nested Loop Join  | $O(m \times n)$          | 小表驱动大表     |
| Block Nested Loop | $O(m \times n / B)$      | 利用 join_buffer |
| Hash Join         | $O(m + n)$               | 等值连接，大表   |
| Sort-Merge Join   | $O(m \log m + n \log n)$ | 已排序数据       |

### 7.2 连接顺序优化

```sql
-- 优化器可能重排连接顺序
-- 原始写法
SELECT * FROM a JOIN b ON a.id = b.a_id JOIN c ON b.id = c.b_id;

-- 优化器可能选择更优顺序
-- 如：先连接小表 a 和 c，再连接 b
```

### 7.3 连接条件与过滤条件

```sql
-- ON：连接条件，决定如何匹配行
-- WHERE：过滤条件，在连接后过滤结果

-- INNER JOIN 中 ON 和 WHERE 等价（逻辑上）
SELECT * FROM a INNER JOIN b ON a.id = b.a_id AND a.status = 'active';
-- 等价于
SELECT * FROM a INNER JOIN b ON a.id = b.a_id WHERE a.status = 'active';

-- OUTER JOIN 中 ON 和 WHERE 不等价
SELECT * FROM a LEFT JOIN b ON a.id = b.a_id AND a.status = 'active';
-- a.status = 'active' 只影响右表匹配，左表行仍保留

SELECT * FROM a LEFT JOIN b ON a.id = b.a_id WHERE a.status = 'active';
-- a.status = 'active' 过滤最终结果，左表不满足的行被移除
```

## 8. 多表连接最佳实践

### 8.1 连接数控制

```sql
-- 避免过多表连接（一般不超过 5-7 个）
-- 过多连接导致：
-- 1. 执行计划搜索空间指数增长
-- 2. 中间结果集膨胀
-- 3. 可读性下降

-- 替代方案：使用 CTE 拆分复杂查询
WITH dept_employees AS (
    SELECT d.dept_name, e.name, e.salary
    FROM departments d
    JOIN employees e ON d.id = e.dept_id
)
SELECT dept_name, name, salary
FROM dept_employees
WHERE salary > (SELECT AVG(salary) FROM dept_employees);
```

### 8.2 索引支持

```sql
-- 连接列应建立索引
CREATE INDEX idx_employees_dept_id ON employees(dept_id);
CREATE INDEX idx_employees_job_id ON employees(job_id);

-- 覆盖索引避免回表
CREATE INDEX idx_employees_dept_cover ON employees(dept_id, name, salary);
```

### 8.3 去重连接

```sql
-- 连接导致行数膨胀时，先去重再连接
SELECT d.dept_name, e_cnt.emp_count
FROM departments d
JOIN (
    SELECT dept_id, COUNT(*) AS emp_count
    FROM employees
    GROUP BY dept_id
) e_cnt ON d.id = e_cnt.dept_id;
```
## INNER JOIN

**换行写法：内连接返回两表匹配行**
`FROM <左表> INNER JOIN <右表> ON <条件>`
```sql
-- 查询员工及其所属部门名称
SELECT e.name, d.dept_name
FROM employees e
INNER JOIN departments d ON e.dept_id = d.id;
```

**换行写法：省略 INNER 的内连接**
`FROM <左表> JOIN <右表> ON <条件>`
```sql
-- 省略 INNER 关键字的内连接
SELECT e.name, d.dept_name
FROM employees e
JOIN departments d ON e.dept_id = d.id;
```

**换行写法：非等值连接**
`FROM <左表> JOIN <右表> ON <非等值条件>`
```sql
-- 根据薪资范围匹配薪资等级
SELECT e.name, g.grade
FROM employees e
JOIN salary_grades g ON e.salary BETWEEN g.min_salary AND g.max_salary;
```

**换行写法：多表连接**
`FROM <表 1> JOIN <表 2> ON ... JOIN <表 3> ON ...`
```sql
-- 连接员工表、部门表和职位表
SELECT e.name, d.dept_name, j.job_title
FROM employees e
JOIN departments d ON e.dept_id = d.id
JOIN jobs j ON e.job_id = j.id
WHERE d.region = 'East';
```

---

## LEFT JOIN

**换行写法：左外连接返回左表全部行**
`FROM <左表> LEFT JOIN <右表> ON <条件>`
```sql
-- 查询所有部门及其员工（包括没有员工的部门）
SELECT d.dept_name, e.name
FROM departments d
LEFT JOIN employees e ON d.id = e.dept_id;
```

**换行写法：左连接查找无匹配行**
`FROM <左表> LEFT JOIN <右表> ON <条件> WHERE <右表>.<列> IS NULL`
```sql
-- 查找没有员工的部门
SELECT d.dept_name
FROM departments d
LEFT JOIN employees e ON d.id = e.dept_id
WHERE e.id IS NULL;
```

**换行写法：左连接统计含零值分组**
`FROM <左表> LEFT JOIN <右表> ON <条件> GROUP BY ...`
```sql
-- 统计每个部门的员工数（包括 0 人部门）
SELECT d.dept_name, COUNT(e.id) AS emp_count
FROM departments d
LEFT JOIN employees e ON d.id = e.dept_id
GROUP BY d.id, d.dept_name;
```

**换行写法：左连接右表过滤条件放 ON 子句**
`FROM <左表> LEFT JOIN <右表> ON <条件> AND <右表过滤>`
```sql
-- 查询所有部门及活跃状态的员工（右表过滤条件放 ON 子句）
SELECT d.dept_name, e.name
FROM departments d
LEFT JOIN employees e ON d.id = e.dept_id AND e.status = 'active';
```

---

## RIGHT JOIN

**换行写法：右外连接返回右表全部行**
`FROM <左表> RIGHT JOIN <右表> ON <条件>`
```sql
-- 查询所有部门及其员工（包括没有员工的部门）
SELECT e.name, d.dept_name
FROM employees e
RIGHT JOIN departments d ON e.dept_id = d.id;
```

---

## FULL JOIN

**换行写法：全外连接返回两表所有行**
`FROM <左表> FULL JOIN <右表> ON <条件>`
```sql
-- 返回员工和部门的所有行，不匹配时填 NULL
SELECT e.name, d.dept_name
FROM employees e
FULL JOIN departments d ON e.dept_id = d.id;
```

**换行写法：全外连接查找不匹配行**
`FROM <左表> FULL JOIN <右表> ON <条件> WHERE <左表>.<id> IS NULL OR <右表>.<id> IS NULL`
```sql
-- 查找两表不匹配的行
SELECT e.name, d.dept_name
FROM employees e
FULL JOIN departments d ON e.dept_id = d.id
WHERE e.id IS NULL OR d.id IS NULL;
```

**换行写法：MySQL 用 UNION ALL 模拟全外连接**
`LEFT JOIN ... UNION ALL RIGHT JOIN ... WHERE IS NULL`
```sql
-- MySQL 不支持 FULL JOIN，使用 UNION ALL 替代
SELECT e.name, d.dept_name
FROM employees e
LEFT JOIN departments d ON e.dept_id = d.id
UNION ALL
SELECT e.name, d.dept_name
FROM employees e
RIGHT JOIN departments d ON e.dept_id = d.id
WHERE e.id IS NULL;
```

---

## CROSS JOIN

**换行写法：显式交叉连接（笛卡尔积）**
`FROM <左表> CROSS JOIN <右表>`
```sql
-- 生成部门和职位的笛卡尔积
SELECT d.dept_name, j.job_title
FROM departments d
CROSS JOIN jobs j;
```

**换行写法：隐式交叉连接**
`FROM <表 1>, <表 2>`
```sql
-- 使用逗号分隔的隐式交叉连接
SELECT d.dept_name, j.job_title
FROM departments d, jobs j;
```

---

## 自连接

**换行写法：表与自身连接**
`FROM <表> AS <别名 1> JOIN <表> AS <别名 2> ON <条件>`
```sql
-- 查询员工及其经理
SELECT
  e.name AS employee,
  m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;
```

**换行写法：自连接查找同组数据**
`FROM <表> AS <别名 1> JOIN <表> AS <别名 2> ON <条件>`
```sql
-- 查找同一部门中薪资相同的员工
SELECT a.name, b.name, a.salary
FROM employees a
JOIN employees b ON a.dept_id = b.dept_id AND a.salary = b.salary AND a.id < b.id;
```

---

## USING 子句

**换行写法：USING 指定同名列连接**
`FROM <左表> JOIN <右表> USING (<列>)`
```sql
-- 使用 USING 指定同名列连接
SELECT e.name, department_id
FROM employees e
JOIN departments d USING (department_id);
```

**换行写法：NATURAL JOIN 自动按同名列连接**
`FROM <左表> NATURAL JOIN <右表>`
```sql
-- 自动按同名列连接（不推荐，不可控）
SELECT * FROM employees NATURAL JOIN departments;
```
