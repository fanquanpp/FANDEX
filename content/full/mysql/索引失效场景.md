---
order: 60
title: 索引失效场景
module: mysql
category: MySQL
difficulty: advanced
description: MySQL索引失效场景：函数操作、隐式转换、LIKE前缀、OR条件、范围查询与优化策略
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/索引统计信息与直方图
  - mysql/SQL函数与高级查询
  - mysql/EXPLAIN输出详解
  - mysql/慢查询日志
prerequisites:
  - mysql/语法速查
---

## 1. 索引失效常见场景

### 1.1 对索引列使用函数

```sql
-- 索引 (created_at)
-- 失效：对列使用函数
SELECT * FROM orders WHERE YEAR(created_at) = 2026;
SELECT * FROM orders WHERE DATE(created_at) = '2026-06-14';

-- 优化：改写条件
SELECT * FROM orders WHERE created_at >= '2026-01-01' AND created_at < '2027-01-01';
SELECT * FROM orders WHERE created_at >= '2026-06-14' AND created_at < '2026-06-15';
```

### 1.2 隐式类型转换

```sql
-- 索引 (phone VARCHAR)
-- 失效：字符串列与数字比较
SELECT * FROM users WHERE phone = 13800138000;  -- 隐式转换为字符串

-- 优化：使用字符串常量
SELECT * FROM users WHERE phone = '13800138000';
```

### 1.3 LIKE 前缀通配符

```sql
-- 索引 (name)
-- 失效：以通配符开头
SELECT * FROM users WHERE name LIKE '%张';
SELECT * FROM users WHERE name LIKE '%张%';

-- 可用：前缀匹配
SELECT * FROM users WHERE name LIKE '张%';
```

### 1.4 OR 条件

```sql
-- 索引 (a), 索引 (b)
-- 可能失效：OR 连接不同索引列
SELECT * FROM t WHERE a = 1 OR b = 2;
-- MySQL 可能使用 index_merge，但效率不如联合索引

-- 优化：使用 UNION ALL
SELECT * FROM t WHERE a = 1
UNION ALL
SELECT * FROM t WHERE b = 2 AND a <> 1;
```

### 1.5 联合索引跳列

```sql
-- 索引 (a, b, c)
-- 失效：跳过最左列
SELECT * FROM t WHERE b = 2;

-- 部分失效：跳过中间列
SELECT * FROM t WHERE a = 1 AND c = 3;  -- 只用 a
```

### 1.6 NOT 条件

```sql
-- 索引 (status)
-- 通常失效：NOT / != / <>
SELECT * FROM orders WHERE status != 'cancelled';
SELECT * FROM orders WHERE NOT (status = 'cancelled');

-- 优化：改写为 IN
SELECT * FROM orders WHERE status IN ('pending', 'processing', 'shipped');
```

### 1.7 IS NOT NULL

```sql
-- MySQL 8.0+ 支持 IS NOT NULL 使用索引
-- 旧版本可能不使用
SELECT * FROM users WHERE phone IS NOT NULL;
```

### 1.8 计算表达式

```sql
-- 索引 (salary)
-- 失效：列参与计算
SELECT * FROM employees WHERE salary * 12 > 100000;

-- 优化：将计算移到常量侧
SELECT * FROM employees WHERE salary > 100000 / 12;
```

## 2. 索引失效诊断

```sql
-- 使用 EXPLAIN 检查
EXPLAIN SELECT * FROM orders WHERE YEAR(created_at) = 2026;
-- type: ALL, key: NULL → 索引失效

-- 使用 EXPLAIN ANALYZE 查看实际执行
EXPLAIN ANALYZE SELECT * FROM orders WHERE YEAR(created_at) = 2026;
```
