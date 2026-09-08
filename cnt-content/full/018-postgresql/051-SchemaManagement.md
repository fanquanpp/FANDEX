---
order: 510
title: 模式（Schema）管理语法速查手册
module: 'postgresql'
category: 数据库
difficulty: beginner
description: 模式（Schema）管理 语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## 创建与删除模式

**基本写法：创建模式**
`CREATE SCHEMA [IF NOT EXISTS] <模式名> [AUTHORIZATION <用户>];`

```sql
-- 创建业务模式
CREATE SCHEMA IF NOT EXISTS business;
-- 创建模式并指定属主
CREATE SCHEMA sales AUTHORIZATION sales_user;
```

**基本写法：在模式中创建对象**
`CREATE TABLE <模式名>.<表名> (...)`

```sql
-- 在指定模式下建表（使用模式限定名）
CREATE TABLE business.orders (
  id BIGSERIAL PRIMARY KEY,
  amount NUMERIC(10,2)
);
```

**基本写法：删除模式**
`DROP SCHEMA [IF EXISTS] <模式名> [CASCADE|RESTRICT];`

```sql
-- 仅删除空模式
DROP SCHEMA IF EXISTS old_app;
-- 级联删除模式及其所有对象
DROP SCHEMA IF EXISTS test_app CASCADE;
```

---

## 模式搜索路径

**基本写法：查看搜索路径**
`SHOW search_path;`

```sql
-- 查看当前模式搜索路径
SHOW search_path;  -- 默认 "$user", public
```

**基本写法：设置搜索路径**
`SET search_path TO <模式1>[, <模式2>...];`

```sql
-- 临时设置搜索路径（影响对象解析顺序）
SET search_path TO business, public;
-- 在函数内设置（仅函数执行期间生效）
SET search_path TO business, public;
SELECT * FROM orders;  -- 解析为 business.orders
```

**基本写法：持久设置搜索路径**
`ALTER DATABASE <库名> SET search_path TO <模式>;`

```sql
-- 数据库级持久设置
ALTER DATABASE mydb SET search_path TO business, public;
-- 用户级设置
ALTER ROLE app_user SET search_path TO business, public;
```

**基本写法：查看当前模式**
`SELECT current_schema();`

```sql
-- 查看当前生效模式
SELECT current_schema();
-- 查看当前用户名同名模式是否存在
SELECT current_schemas(true);
```

---

## 模式权限

**基本写法：授予模式使用权限**
`GRANT USAGE ON SCHEMA <模式名> TO <角色>;`

```sql
-- 授予角色访问模式的权限
GRANT USAGE ON SCHEMA business TO app_user;
```

**基本写法：授予模式内对象权限**
`GRANT <权限> ON ALL TABLES IN SCHEMA <模式名> TO <角色>;`

```sql
-- 授予模式内所有表的查询权限
GRANT SELECT ON ALL TABLES IN SCHEMA business TO readonly_role;
-- 授予所有序列使用权限
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA business TO app_user;
```

**基本写法：设置默认权限（新对象自动授权）**
`ALTER DEFAULT PRIVILEGES IN SCHEMA <模式名> GRANT <权限> ON TABLES TO <角色>;`

```sql
-- 后续在该模式新建的表自动授予查询权限
ALTER DEFAULT PRIVILEGES IN SCHEMA business
GRANT SELECT ON TABLES TO readonly_role;
```

---

## 模式查询与迁移

**基本写法：查看所有模式**
`SELECT schema_name FROM information_schema.schemata;`

```sql
-- 查看数据库中所有模式
SELECT schema_name, schema_owner
FROM information_schema.schemata
WHERE schema_name NOT LIKE 'pg_%' AND schema_name <> 'information_schema';
```

**基本写法：查看模式内对象**
`SELECT * FROM information_schema.tables WHERE table_schema = '<模式名>';`

```sql
-- 查看 business 模式下的所有表
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'business';
```

**基本写法：将表迁移到另一模式**
`ALTER TABLE <旧模式>.<表名> SET SCHEMA <新模式>;`

```sql
-- 将表迁移到另一模式（索引、约束自动跟随）
ALTER TABLE public.old_orders SET SCHEMA archive;
```

**基本写法：重命名模式**
`ALTER SCHEMA <旧名> RENAME TO <新名>;`

```sql
-- 重命名模式
ALTER SCHEMA old_app RENAME TO legacy_app;
```

**基本写法：修改模式属主**
`ALTER SCHEMA <模式名> OWNER TO <新属主>;`

```sql
-- 修改模式属主
ALTER SCHEMA business OWNER TO dba;
```

---

## 公共模式与扩展模式

**基本写法：public 模式（默认共享模式）**
`CREATE TABLE public.<表名> (...)`

```sql
-- public 是默认共享模式，所有用户默认有访问权
CREATE TABLE public.shared_config (key TEXT PRIMARY KEY, value TEXT);
```

**基本写法：扩展自带模式**
`CREATE EXTENSION <扩展名> SCHEMA <模式名>;`

```sql
-- 将扩展对象放到指定模式
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA geo;
-- pg_catalog 系统模式（不可删除，存放内置对象）
SELECT * FROM pg_catalog.pg_class LIMIT 1;
```
