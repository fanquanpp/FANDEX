---
order: 78
title: 基于角色的权限管理
module: postgresql
category: PostgreSQL
difficulty: intermediate
description: PostgreSQL基于角色的权限管理：角色继承、组角色、默认权限与权限审计
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/订阅与发布
  - 'postgresql/SSL-TLS加密连接'
  - postgresql/行级安全策略
  - postgresql/数据加密存储
prerequisites:
  - postgresql/概述与安装配置
---

## 1. 角色体系

PostgreSQL 使用角色统一管理用户和组。

```sql
-- 创建登录角色（用户）
CREATE ROLE app_user LOGIN PASSWORD 'password';

-- 创建组角色（不能登录）
CREATE ROLE readonly NOLOGIN;
CREATE ROLE readwrite NOLOGIN;
CREATE ROLE admin NOLOGIN;

-- 授予权限给组角色
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO readwrite;
GRANT ALL PRIVILEGES ON SCHEMA public TO admin;

-- 将组角色授予用户
GRANT readonly TO app_read;
GRANT readwrite TO app_write;
```

## 2. 角色继承

```sql
-- 默认角色继承
SET ROLE readonly;  -- 切换到 readonly 角色
SELECT current_user;  -- readonly
RESET ROLE;  -- 恢复

-- 禁止继承
ALTER ROLE app_user NOINHERIT;
-- 需要显式 SET ROLE 才能获得组角色权限
```

## 3. 默认权限

```sql
-- 新建表的默认权限
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO readonly;

ALTER DEFAULT PRIVILEGES FOR ROLE admin
    GRANT SELECT ON TABLES TO readonly;
```

## 4. 查看权限

```sql
-- 查看表权限
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'employees';

-- 查看角色成员
SELECT r.rolname, m.rolname AS member
FROM pg_roles r
JOIN pg_auth_members am ON r.oid = am.roleid
JOIN pg_roles m ON am.member = m.oid;
```
