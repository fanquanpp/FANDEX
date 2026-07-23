---
order: 64
title: 子查询优化
module: mysql
category: MySQL
difficulty: advanced
description: MySQL子查询优化：半连接转换、物化、子查询展开与IN/EXISTS优化策略
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/慢查询日志
  - mysql/优化器追踪
  - mysql/派生表优化
  - 'mysql/GROUP-BY与ORDER-BY优化'
prerequisites:
  - mysql/语法速查
---

## 1. 子查询优化概述

MySQL 优化器对子查询有多种优化策略，理解这些策略有助于编写高效的查询。

## 2. 半连接优化

### 2.1 IN 子查询转半连接

```sql
-- 原始查询
SELECT * FROM orders
WHERE user_id IN (SELECT id FROM users WHERE vip = true);

-- 优化器可能转换为半连接
-- Semi Join：找到第一个匹配即停止
```

### 2.2 半连接策略

| 策略                | 说明                           |
| ------------------- | ------------------------------ |
| FirstMatch          | 对外表每行，在内表找第一个匹配 |
| LooseScan           | 利用索引扫描去重               |
| SemiJoinMaterialize | 物化子查询结果为临时表         |
| DuplicateWeedout    | 使用临时表去重                 |

```sql
-- 查看使用的半连接策略
EXPLAIN FORMAT=JSON
SELECT * FROM orders WHERE user_id IN (SELECT id FROM users WHERE vip = true);
-- 查看 "chosen" 策略
```

## 3. 子查询物化

```sql
-- MySQL 将 IN 子查询结果物化为临时表
SELECT * FROM orders
WHERE user_id IN (SELECT id FROM users WHERE vip = true);

-- 执行流程：
-- 1. 执行子查询，结果写入临时表（带主键去重）
-- 2. 外查询通过临时表进行半连接

-- EXPLAIN 中 select_type = MATERIALIZED
```

## 4. IN vs EXISTS 优化

```sql
-- MySQL 8.0+ 优化器通常将 IN 和 EXISTS 转换为相同的半连接
-- 选择建议：让优化器决定

-- IN 子查询
SELECT * FROM orders
WHERE user_id IN (SELECT id FROM users WHERE vip = true);

-- EXISTS 子查询
SELECT * FROM orders o
WHERE EXISTS (SELECT 1 FROM users u WHERE u.id = o.user_id AND u.vip = true);

-- 两者在 MySQL 8.0 中通常生成相同的执行计划
```

## 5. 关联子查询优化

```sql
-- 低效：关联子查询
SELECT * FROM employees e
WHERE salary > (SELECT AVG(salary) FROM employees WHERE dept_id = e.dept_id);

-- 优化1：使用窗口函数
SELECT * FROM (
    SELECT *, AVG(salary) OVER (PARTITION BY dept_id) AS dept_avg
    FROM employees
) t WHERE salary > dept_avg;

-- 优化2：使用 JOIN
SELECT e.*
FROM employees e
JOIN (
    SELECT dept_id, AVG(salary) AS avg_salary
    FROM employees
    GROUP BY dept_id
) dept_avg ON e.dept_id = dept_avg.dept_id
WHERE e.salary > dept_avg.avg_salary;
```
