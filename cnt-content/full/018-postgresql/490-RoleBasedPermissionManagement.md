---
order: 450
title: 基于角色的权限管理
module: 'postgresql'
category: 数据库
difficulty: intermediate
description: PostgreSQL基于角色的权限管理：角色继承、组角色、默认权限与权限审计
author: fanquanpp
updated: '2026-10-11'
related:
  - 'postgresql/430-SubscribePublish'
  - 'postgresql/480-SSLEncryptionConnection'
  - 'postgresql/500-RowLevelSecurity'
  - 'postgresql/510-DataEncryptionStorage'
prerequisites:
  - 'postgresql/010-OverviewInstallConfig'
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
## 用户管理

**单行写法：创建用户**
`CREATE USER <用户名> [WITH] PASSWORD '<密码>'`
```sql
-- 创建带密码的用户
CREATE USER app_user WITH PASSWORD 'StrongP@ss123';
```

**单行写法：创建带登录权限的用户**
`CREATE ROLE <角色名> WITH LOGIN PASSWORD '<密码>'`
```sql
-- 创建带登录权限的角色
CREATE ROLE app_role WITH LOGIN PASSWORD 'StrongP@ss123';
```

**单行写法：修改用户密码**
`ALTER USER <用户名> [WITH] PASSWORD '<新密码>'`
```sql
-- 修改用户密码
ALTER USER app_user WITH PASSWORD 'NewP@ss456';
```

**单行写法：删除用户**
`DROP USER [IF EXISTS] <用户名>`
```sql
-- 删除用户
DROP USER IF EXISTS app_user;
```

**单行写法：查看所有用户**
`SELECT <列名> FROM pg_user`
```sql
-- 查看所有用户列表
SELECT usename, usesuper FROM pg_user;
```

---

## 角色管理

**单行写法：创建角色**
`CREATE ROLE <角色名>`
```sql
-- 创建角色
CREATE ROLE readonly;
```

**单行写法：创建带属性的角色**
`CREATE ROLE <角色名> WITH <属性>`
```sql
-- 创建带登录和创建数据库属性的角色
CREATE ROLE admin WITH LOGIN CREATEDB CREATEROLE;
```

**单行写法：将角色分配给用户**
`GRANT <角色名> TO <用户名>`
```sql
-- 分配角色给用户
GRANT readonly TO app_user;
```

**单行写法：撤销用户角色**
`REVOKE <角色名> FROM <用户名>`
```sql
-- 撤销用户的角色
REVOKE readonly FROM app_user;
```

**单行写法：删除角色**
`DROP ROLE [IF EXISTS] <角色名>`
```sql
-- 删除角色
DROP ROLE IF EXISTS readonly;
```

**单行写法：查看所有角色**
`SELECT <列名> FROM pg_roles`
```sql
-- 查看所有角色
SELECT rolname, rolsuper, rolcreaterole FROM pg_roles;
```

---

## 权限管理

**单行写法：授予连接数据库权限**
`GRANT CONNECT ON DATABASE <库名> TO <角色名>`
```sql
-- 授予连接数据库权限
GRANT CONNECT ON DATABASE mydb TO readonly;
```

**单行写法：授予使用模式权限**
`GRANT USAGE ON SCHEMA <模式名> TO <角色名>`
```sql
-- 授予使用模式权限
GRANT USAGE ON SCHEMA public TO readonly;
```

**单行写法：授予表查询权限**
`GRANT SELECT ON <表名> TO <角色名>`
```sql
-- 授予表查询权限
GRANT SELECT ON users TO readonly;
```

**单行写法：授予表所有权限**
`GRANT ALL ON <表名> TO <角色名>`
```sql
-- 授予表所有权限
GRANT ALL ON users TO admin;
```

**单行写法：授予模式所有表查询权限**
`GRANT SELECT ON ALL TABLES IN SCHEMA <模式名> TO <角色名>`
```sql
-- 授予模式所有表查询权限
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;
```

**单行写法：授予模式所有表所有权限**
`GRANT ALL ON ALL TABLES IN SCHEMA <模式名> TO <角色名>`
```sql
-- 授予模式所有表所有权限
GRANT ALL ON ALL TABLES IN SCHEMA public TO admin;
```

**单行写法：授予序列使用权限**
`GRANT USAGE ON SEQUENCE <序列名> TO <角色名>`
```sql
-- 授予序列使用权限
GRANT USAGE ON SEQUENCE users_id_seq TO app_user;
```

**单行写法：撤销表查询权限**
`REVOKE SELECT ON <表名> FROM <角色名>`
```sql
-- 撤销表查询权限
REVOKE SELECT ON users FROM readonly;
```

**单行写法：撤销表所有权限**
`REVOKE ALL ON <表名> FROM <角色名>`
```sql
-- 撤销表所有权限
REVOKE ALL ON users FROM readonly;
```

**单行写法：修改默认权限**
`ALTER DEFAULT PRIVILEGES IN SCHEMA <模式名> GRANT SELECT ON TABLES TO <角色名>`
```sql
-- 设置未来创建表的默认权限
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly;
```

---

## 默认角色

**单行写法：设置用户默认角色**
`SET ROLE <角色名>`
```sql
-- 切换当前会话角色
SET ROLE readonly;
```

**单行写法：重置为原始角色**
`RESET ROLE`
```sql
-- 重置为原始用户
RESET ROLE;
```

**单行写法：设置默认搜索路径**
`ALTER ROLE <角色名> SET search_path TO <模式名>`
```sql
-- 设置角色的默认搜索路径
ALTER ROLE app_user SET search_path TO myschema, public;
```

---

## 权限查看

**单行写法：查看表权限**
`\dp <表名>`
```sql
-- 查看表的权限信息
\dp users;
```

**单行写法：查看角色权限**
`SELECT <列名> FROM information_schema.role_table_grants WHERE <条件>`
```sql
-- 查看角色表权限
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'users';
```

**单行写法：查看用户权限**
`\du <用户名>`
```sql
-- 查看用户角色和属性
\du app_user;
```

**单行写法：查看数据库权限**
`SELECT <列名> FROM pg_database WHERE <条件>`
```sql
-- 查看数据库权限信息
SELECT datname, datacl FROM pg_database WHERE datname = 'mydb';
```

## 教学自检

遮住示例代码，先自己回答再对照参考答案。

### 任务一：角色、组、继承三件事说清楚

需求：建一个不可登录的组角色 `dev_team`，把 `alice` 加入并让 alice 继承其权限。写出 DDL； alice 退出后怎么收回？SET ROLE 的作用是什么？

<details>
<summary>参考实现与讲解</summary>

```sql
CREATE ROLE dev_team NOLOGIN;
GRANT dev_team TO alice;          -- alice 成为成员
REVOKE dev_team FROM alice;       -- 收回成员资格
```
成员身份默认自动继承（INHERIT 属性开启时）组的全部权限；`SET ROLE dev_team;` 让当前会话临时"以组的身份"行使权限（便于测试权限面、也用于非继承成员临时取权），`RESET ROLE;` 退出。"用户"与"组"在 PG 里都是 ROLE，LOGIN 属性是唯一区别——权限挂在组上、人加入组，是权限管理的标准拓扑（新人入职一条 GRANT 搞定）。

</details>

### 任务二：默认权限给"未来的表"

需求：readonly 角色要能自动读上未来新建的所有表。写出 ALTER DEFAULT PRIVILEGES；它对"已经存在的表"生效吗？作用范围由谁决定？

<details>
<summary>参考实现与讲解</summary>

```sql
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO readonly;
```
只对未来创建的表生效，存量表仍需显式 GRANT（或一次性补授 ALL TABLES）。作用范围由"执行该语句的角色"决定：以 app_owner 身份执行，只有 app_owner 建的表自动带上授权——别人的建表不会。这正是它容易被误解的点：默认权限是"某个创建者视角的模板"，不是库级开关，必要时按创建者分别设置。

</details>
