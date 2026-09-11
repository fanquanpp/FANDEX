---
order: 230
title: 覆盖索引与部分索引
module: 'postgresql'
category: 数据库
difficulty: advanced
description: PostgreSQL覆盖索引、部分索引、表达式索引：INCLUDE子句、条件索引与优化策略
author: fanquanpp
updated: '2026-09-12'
related:
  - 'postgresql/180-TransactionIDWraparoundPrevention'
  - 'postgresql/220-IndexType'
  - 'postgresql/320-KNNVectorIndex'
  - 'postgresql/250-QueryOptimization'
prerequisites:
  - 'postgresql/010-OverviewInstallConfig'
---


## 1. 覆盖索引（INCLUDE）

```sql
-- INCLUDE 子句将额外列存储在索引叶子节点
-- 不参与排序，但可用于覆盖查询
CREATE INDEX idx_employees_dept_cover
ON employees(dept_id) INCLUDE (name, salary);

-- 覆盖查询：不需要回表
SELECT name, salary FROM employees WHERE dept_id = 5;
-- EXPLAIN 输出:
-- Index Only Scan using idx_employees_dept_cover on employees
--   Index Cond: (dept_id = 5)
```

### 1.1 Index Only Scan 的前提

```sql
-- Index Only Scan 有两个前提:
-- 1. 查询所需的所有列都在索引里（键列 + INCLUDE 列）
-- 2. 可见性映射（Visibility Map）中对应页面已标记"全可见"
--    若表刚被大量写入、VACUUM 还没跑过，优化器会退回 Index Scan（逐行回表确认可见性）

-- 观察回退: EXPLAIN (ANALYZE, BUFFERS) 中
-- Heap Fetches: 0        -- 理想状态, 完全不回表
-- Heap Fetches: 99821    -- VM 落后, 大量回表, 建议执行 VACUUM
VACUUM employees;  -- 刷新可见性映射后 Heap Fetches 通常降为 0
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
-- PostgreSQL 唯一索引默认允许多个 NULL（NULL 互不相等）
CREATE UNIQUE INDEX uk_users_email ON users(email);
-- email = NULL 的行可以有多条

-- 部分唯一索引：排除 NULL
CREATE UNIQUE INDEX uk_users_email_notnull ON users(email) WHERE email IS NOT NULL;

-- PostgreSQL 15+: NULLS NOT DISTINCT 使 NULL 也参与唯一性判断（与旧行为相反）
CREATE UNIQUE INDEX uk_users_email_strict
ON users(email) NULLS NOT DISTINCT;
-- 此时插入第二个 email = NULL 的行会报唯一约束冲突
```
