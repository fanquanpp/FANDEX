---
order: 54
title: 聚合函数
module: sql
category: SQL
difficulty: intermediate
description: SQL聚合函数：COUNT、SUM、AVG、MAX、MIN的语法、NULL处理、DISTINCT聚合与高级聚合技巧
author: fanquanpp
updated: '2026-06-14'
related:
  - sql/SELECT执行顺序
  - sql/过滤条件
  - 'sql/GROUP-BY与分组集'
  - sql/连接查询
prerequisites:
  - sql/概述与标准
---

## 1. 聚合函数概述

聚合函数对一组值进行计算，返回单个汇总值。它们常与 GROUP BY 子句配合使用，也可单独使用对整个表进行汇总。

### 1.1 核心聚合函数

| 函数        | 作用         | 返回类型   | NULL 处理 |
| ----------- | ------------ | ---------- | --------- |
| COUNT(\*)   | 计算行数     | BIGINT     | 包含 NULL |
| COUNT(expr) | 计算非NULL值 | BIGINT     | 忽略 NULL |
| SUM(expr)   | 求和         | 数值类型   | 忽略 NULL |
| AVG(expr)   | 求平均值     | 数值类型   | 忽略 NULL |
| MAX(expr)   | 最大值       | 同输入类型 | 忽略 NULL |
| MIN(expr)   | 最小值       | 同输入类型 | 忽略 NULL |

## 2. COUNT 函数

### 2.1 COUNT 的三种形式

```sql
-- COUNT(*)：计算所有行，包括 NULL
SELECT COUNT(*) FROM employees;          -- 总行数

-- COUNT(expr)：计算 expr 非 NULL 的行数
SELECT COUNT(phone) FROM employees;      -- 有电话号码的员工数

-- COUNT(DISTINCT expr)：计算不同非 NULL 值的数量
SELECT COUNT(DISTINCT dept_id) FROM employees;  -- 不同部门数
```

### 2.2 COUNT 性能差异

```sql
-- COUNT(*) vs COUNT(1)：在大多数数据库中性能相同
-- MySQL InnoDB：COUNT(*) 和 COUNT(1) 等价，选择最小索引扫描
-- PostgreSQL：COUNT(*) 需要全表扫描（MVCC 机制），可使用估算
SELECT reltuples::bigint AS estimate
FROM pg_class WHERE relname = 'employees';

-- 条件计数
SELECT
    COUNT(*) AS total,
    COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_count,
    COUNT(CASE WHEN status = 'inactive' THEN 1 END) AS inactive_count
FROM employees;
```

### 2.3 条件计数的多种写法

```sql
-- 方法1：CASE 表达式（通用）
COUNT(CASE WHEN status = 'active' THEN 1 END)

-- 方法2：FILTER 子句（PostgreSQL）
COUNT(*) FILTER (WHERE status = 'active')

-- 方法3：SUM + 布尔（MySQL/PostgreSQL）
SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END)
SUM(status = 'active')  -- MySQL/PostgreSQL 布尔转整数
```

## 3. SUM 函数

### 3.1 基本用法

```sql
-- 简单求和
SELECT SUM(salary) AS total_salary FROM employees;

-- 分组求和
SELECT dept_id, SUM(salary) AS dept_total
FROM employees
GROUP BY dept_id;

-- 条件求和
SELECT
    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS total_income,
    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expense
FROM transactions;
```

### 3.2 SUM 与 NULL

```sql
-- SUM 忽略 NULL 值
SELECT SUM(bonus) FROM employees;  -- NULL bonus 不参与计算

-- 全部为 NULL 时返回 NULL
SELECT SUM(NULL::INTEGER);  -- 返回 NULL

-- 使用 COALESCE 提供默认值
SELECT COALESCE(SUM(bonus), 0) AS total_bonus FROM employees;
```

### 3.3 精度问题

```sql
-- 浮点数求和可能丢失精度
SELECT SUM(0.1) FROM generate_series(1, 10);  -- 可能不等于 1.0

-- 使用 DECIMAL 保证精度
SELECT SUM(0.1::DECIMAL) FROM generate_series(1, 10);  -- 等于 1.0
```

## 4. AVG 函数

### 4.1 基本用法

```sql
-- 简单平均
SELECT AVG(salary) AS avg_salary FROM employees;

-- 分组平均
SELECT dept_id, AVG(salary) AS avg_salary
FROM employees
GROUP BY dept_id;
```

### 4.2 AVG 的 NULL 处理

```sql
-- AVG 忽略 NULL，只对非 NULL 值计算平均
-- 假设 salary 值为：100, 200, NULL, 300
SELECT AVG(salary) FROM employees;
-- 结果 = (100 + 200 + 300) / 3 = 200，而非 / 4

-- 如果需要将 NULL 视为 0
SELECT AVG(COALESCE(salary, 0)) FROM employees;
-- 结果 = (100 + 200 + 0 + 300) / 4 = 150
```

### 4.3 加权平均

```sql
-- 加权平均 = SUM(值 × 权重) / SUM(权重)
SELECT
    SUM(score * weight) / SUM(weight) AS weighted_avg
FROM exam_results;
```

### 4.4 中位数

SQL 标准没有内置中位数函数，需要手动计算：

```sql
-- PostgreSQL：使用 PERCENTILE_CONT
SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary) AS median_salary
FROM employees;

-- 通用方法：使用窗口函数
SELECT AVG(salary) AS median_salary
FROM (
    SELECT salary,
           ROW_NUMBER() OVER (ORDER BY salary) AS rn,
           COUNT(*) OVER () AS total
    FROM employees
    WHERE salary IS NOT NULL
) t
WHERE rn IN (FLOOR((total + 1) / 2.0), CEIL((total + 1) / 2.0));
```

## 5. MAX 与 MIN 函数

### 5.1 基本用法

```sql
-- 数值最大/最小值
SELECT MAX(salary) AS max_salary, MIN(salary) AS min_salary
FROM employees;

-- 日期最大/最小值
SELECT MAX(created_at) AS latest, MIN(created_at) AS earliest
FROM orders;

-- 字符串最大/最小值（按排序规则）
SELECT MAX(name) AS last_name, MIN(name) AS first_name
FROM employees;
```

### 5.2 获取最大/最小值所在行

```sql
-- 方法1：子查询
SELECT * FROM employees
WHERE salary = (SELECT MAX(salary) FROM employees);

-- 方法2：ORDER BY + LIMIT
SELECT * FROM employees ORDER BY salary DESC LIMIT 1;

-- 方法3：DISTINCT ON（PostgreSQL）
SELECT DISTINCT ON (dept_id) *
FROM employees
ORDER BY dept_id, salary DESC;  -- 每个部门薪资最高的员工
```

### 5.3 MAX/MIN 与索引

```sql
-- MAX/MIN 可以利用索引优化，无需全表扫描
CREATE INDEX idx_employees_salary ON employees(salary);
SELECT MAX(salary) FROM employees;  -- 直接取 B+ 树最右叶节点

-- 同时获取 MAX 和 MIN 时，索引优化有限
-- 某些数据库可以一次索引扫描获取两者
```

## 6. DISTINCT 聚合

### 6.1 基本用法

```sql
-- 计算不同值的聚合
SELECT COUNT(DISTINCT dept_id) AS dept_count FROM employees;
SELECT SUM(DISTINCT price) AS distinct_total FROM products;

-- 多列 DISTINCT
SELECT COUNT(DISTINCT dept_id || '-' || job_id) FROM employees;
```

### 6.2 DISTINCT 聚合的性能问题

```sql
-- COUNT(DISTINCT) 需要去重，大数据量下性能较差
-- 优化方案1：近似计数（HyperLogLog）
-- PostgreSQL 扩展
SELECT hll_cardinality(hll_agg(user_id)) FROM page_views;

-- 优化方案2：预聚合表
CREATE TABLE daily_stats AS
SELECT
    DATE(created_at) AS stat_date,
    COUNT(DISTINCT user_id) AS dau,
    COUNT(*) AS pv
FROM page_views
GROUP BY DATE(created_at);
```

## 7. 高级聚合技巧

### 7.1 行列转换聚合

```sql
-- 透视表：将行数据转为列
SELECT
    dept_id,
    SUM(CASE WHEN quarter = 1 THEN revenue ELSE 0 END) AS q1,
    SUM(CASE WHEN quarter = 2 THEN revenue ELSE 0 END) AS q2,
    SUM(CASE WHEN quarter = 3 THEN revenue ELSE 0 END) AS q3,
    SUM(CASE WHEN quarter = 4 THEN revenue ELSE 0 END) AS q4
FROM quarterly_revenue
GROUP BY dept_id;
```

### 7.2 累计聚合

```sql
-- 累计求和（使用窗口函数）
SELECT
    order_date,
    daily_amount,
    SUM(daily_amount) OVER (ORDER BY order_date) AS cumulative_amount
FROM (
    SELECT DATE(created_at) AS order_date, SUM(amount) AS daily_amount
    FROM orders
    GROUP BY DATE(created_at)
) daily;
```

### 7.3 字符串聚合

```sql
-- PostgreSQL: STRING_AGG
SELECT dept_id, STRING_AGG(name, ', ' ORDER BY name) AS employee_names
FROM employees
GROUP BY dept_id;

-- MySQL: GROUP_CONCAT
SELECT dept_id, GROUP_CONCAT(name ORDER BY name SEPARATOR ', ') AS employee_names
FROM employees
GROUP BY dept_id;

-- SQL Server: STRING_AGG
SELECT dept_id, STRING_AGG(name, ', ') WITHIN GROUP (ORDER BY name) AS employee_names
FROM employees
GROUP BY dept_id;
```

### 7.4 JSON 聚合

```sql
-- PostgreSQL: JSON 聚合
SELECT
    dept_id,
    JSON_AGG(JSON_BUILD_OBJECT('name', name, 'salary', salary)) AS employees
FROM employees
GROUP BY dept_id;

-- MySQL: JSON_ARRAYAGG / JSON_OBJECTAGG
SELECT
    dept_id,
    JSON_ARRAYAGG(JSON_OBJECT('name', name, 'salary', salary)) AS employees
FROM employees
GROUP BY dept_id;
```

## 8. 聚合函数与空结果集

```sql
-- 空结果集上聚合函数的行为
SELECT COUNT(*) FROM employees WHERE 1 = 0;   -- 返回 0
SELECT SUM(salary) FROM employees WHERE 1 = 0; -- 返回 NULL
SELECT AVG(salary) FROM employees WHERE 1 = 0; -- 返回 NULL
SELECT MAX(salary) FROM employees WHERE 1 = 0; -- 返回 NULL

-- COUNT(*) 返回 0，其他返回 NULL
-- 原因：COUNT(*) 计算行数（0行=0），其他需要有效值（无值=NULL）
```
