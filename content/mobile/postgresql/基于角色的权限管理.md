# PostgreSQL 基于角色的权限管理

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

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
