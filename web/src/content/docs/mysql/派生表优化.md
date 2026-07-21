---
order: 65
title: 派生表优化
module: mysql
category: MySQL
difficulty: advanced
description: MySQL派生表优化：合并策略、物化策略、LATERAL派生表与性能调优
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/优化器追踪
  - mysql/子查询优化
  - 'mysql/GROUP-BY与ORDER-BY优化'
  - mysql/JOIN算法
prerequisites:
  - mysql/语法速查
---

## 1. 派生表概述

派生表（Derived Table）是 FROM 子句中的子查询，MySQL 8.0 对派生表有多种优化策略。

## 2. 合并策略

### 2.1 条件合并

MySQL 8.0 默认将派生表合并到外查询中，避免物化临时表：

```sql
-- 原始查询
SELECT * FROM (
    SELECT dept_id, AVG(salary) AS avg_salary
    FROM employees
    GROUP BY dept_id
) dept_avg
WHERE avg_salary > 50000;

-- 优化器合并后等价于
SELECT dept_id, AVG(salary) AS avg_salary
FROM employees
GROUP BY dept_id
HAVING AVG(salary) > 50000;
```

### 2.2 合并条件

- 派生表没有 LIMIT
- 派生表没有 GROUP BY（合并后外查询有 GROUP BY 除外）
- 派生表没有 DISTINCT
- 派生表没有窗口函数
- 派生表没有 UNION

```sql
-- 阻止合并（需要物化）
SELECT /*+ NO_MERGE(dept_avg) */ *
FROM (
    SELECT dept_id, AVG(salary) AS avg_salary
    FROM employees
    GROUP BY dept_id
) dept_avg
WHERE avg_salary > 50000;
```

## 3. 物化策略

### 3.1 何时物化

当无法合并时，MySQL 将派生表物化为临时表：

```sql
-- 包含 LIMIT 的派生表会被物化
SELECT * FROM (
    SELECT * FROM employees ORDER BY salary DESC LIMIT 10
) top_earners;

-- 包含 DISTINCT 的派生表会被物化
SELECT * FROM (
    SELECT DISTINCT dept_id FROM employees
) unique_depts;
```

## 4. LATERAL 派生表

```sql
-- MySQL 8.0.14+ 支持 LATERAL
-- 每个部门薪资最高的3名员工
SELECT d.dept_name, top3.name, top3.salary
FROM departments d,
LATERAL (
    SELECT name, salary
    FROM employees e
    WHERE e.dept_id = d.id
    ORDER BY salary DESC
    LIMIT 3
) top3;
```
