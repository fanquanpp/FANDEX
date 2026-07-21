---
order: 56
title: 覆盖索引与部分索引
module: postgresql
category: PostgreSQL
difficulty: advanced
description: PostgreSQL覆盖索引、部分索引、表达式索引：INCLUDE子句、条件索引与优化策略
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/事务ID回卷预防
  - postgresql/索引类型
  - postgresql/KNN向量索引
  - postgresql/查询优化
prerequisites:
  - postgresql/概述与安装配置
---

## 1. 覆盖索引（INCLUDE）

```sql
-- INCLUDE 子句将额外列存储在索引叶子节点
-- 不参与排序，但可用于覆盖查询
CREATE INDEX idx_employees_dept_cover
ON employees(dept_id) INCLUDE (name, salary);

-- 覆盖查询：不需要回表
SELECT name, salary FROM employees WHERE dept_id = 5;
-- Index Only Scan
```

## 2. 部分索引（Partial Index）

```sql
-- 只索引满足条件的行
CREATE INDEX idx_active_orders
ON orders(created_at) WHERE status = 'active';

-- 每个用户只有一个活跃订阅
CREATE UNIQUE INDEX uk_active_subscription
ON subscriptions(user_id) WHERE status = 'active';

-- 查询必须匹配索引条件
SELECT * FROM orders WHERE status = 'active' AND created_at > '2026-01-01';
-- 使用 idx_active_orders
```

## 3. 表达式索引

```sql
-- 对表达式结果创建索引
CREATE INDEX idx_users_email_lower ON users(LOWER(email));

-- 查询必须使用相同的表达式
SELECT * FROM users WHERE LOWER(email) = 'test@example.com';
-- 使用索引

-- 日期提取
CREATE INDEX idx_orders_month ON orders(EXTRACT(MONTH FROM created_at));
```

## 4. 唯一索引与 NULL

```sql
-- PostgreSQL 唯一索引允许多个 NULL
CREATE UNIQUE INDEX uk_users_email ON users(email);
-- email = NULL 的行可以有多条

-- 部分唯一索引：排除 NULL
CREATE UNIQUE INDEX uk_users_email_notnull ON users(email) WHERE email IS NOT NULL;
```
