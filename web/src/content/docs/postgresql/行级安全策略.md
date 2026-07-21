---
order: 79
title: 行级安全策略
module: postgresql
category: PostgreSQL
difficulty: advanced
description: 'PostgreSQL行级安全策略RLS：策略定义、角色策略、WITH CHECK与多租户隔离'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'postgresql/SSL-TLS加密连接'
  - postgresql/基于角色的权限管理
  - postgresql/数据加密存储
  - postgresql/审计日志
prerequisites:
  - postgresql/概述与安装配置
---

## 1. RLS 概述

行级安全策略（Row-Level Security，RLS）控制用户可以访问哪些行。

## 2. 启用RLS

```sql
-- 启用表级RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- 表所有者默认不受RLS限制
-- 强制所有者也受RLS限制
ALTER TABLE employees FORCE ROW LEVEL SECURITY;
```

## 3. 创建策略

```sql
-- 用户只能看到自己部门的员工
CREATE POLICY dept_isolation ON employees
    USING (dept_id = current_user_dept());

-- 只读策略
CREATE POLICY read_own_dept ON employees
    FOR SELECT USING (dept_id = current_user_dept());

-- 插入策略
CREATE POLICY insert_own_dept ON employees
    FOR INSERT WITH CHECK (dept_id = current_user_dept());

-- 更新策略
CREATE POLICY update_own_dept ON employees
    FOR UPDATE USING (dept_id = current_user_dept())
    WITH CHECK (dept_id = current_user_dept());

-- 删除策略
CREATE POLICY delete_own_dept ON employees
    FOR DELETE USING (dept_id = current_user_dept());
```

## 4. 多租户隔离

```sql
-- 租户隔离
CREATE POLICY tenant_isolation ON orders
    USING (tenant_id = current_setting('app.tenant_id')::INTEGER);

-- 设置租户ID
SET app.tenant_id = '42';
SELECT * FROM orders;  -- 只能看到 tenant_id=42 的订单
```

## 5. 策略管理

```sql
-- 查看策略
SELECT * FROM pg_policies WHERE tablename = 'employees';

-- 删除策略
DROP POLICY dept_isolation ON employees;

-- 禁用RLS
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
```
