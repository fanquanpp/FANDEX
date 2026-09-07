---
order: 860
title: MySQL 用户与权限管理
module: 'mysql'
category: 数据库
difficulty: beginner
description: MySQL 用户与权限管理 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related: []
prerequisites: []
---

## 用户管理

**单行写法：创建用户**
`CREATE USER '<用户名>'@'<主机>' IDENTIFIED BY '<密码>';`
```sql
-- 创建本地用户
CREATE USER 'appuser'@'localhost' IDENTIFIED BY 'StrongPass123!';
```

**单行写法：创建远程用户**
`CREATE USER '<用户名>'@'%' IDENTIFIED BY '<密码>';`
```sql
-- 允许从任意主机连接
CREATE USER 'appuser'@'%' IDENTIFIED BY 'StrongPass123!';
```

**换行写法：指定认证插件（8.0+ 默认）**
`CREATE USER '<用户名>'@'<主机>' IDENTIFIED WITH caching_sha2_password BY '<密码>';`
```sql
-- 使用默认 caching_sha2_password 认证插件
CREATE USER 'secure_user'@'%' IDENTIFIED WITH caching_sha2_password BY 'StrongPass123!';
```

**换行写法：使用 mysql_native_password 认证**
`CREATE USER '<用户名>'@'<主机>' IDENTIFIED WITH mysql_native_password BY '<密码>';`
```sql
-- 兼容旧客户端的认证方式
CREATE USER 'legacy_user'@'%' IDENTIFIED WITH mysql_native_password BY 'StrongPass123!';
```

**单行写法：修改用户密码**
`ALTER USER '<用户名>'@'<主机>' IDENTIFIED BY '<新密码>';`
```sql
-- 修改用户密码
ALTER USER 'appuser'@'localhost' IDENTIFIED BY 'NewPass456!';
```

**单行写法：修改当前用户密码**
`ALTER USER USER() IDENTIFIED BY '<新密码>';`
```sql
-- 修改当前登录用户密码
ALTER USER USER() IDENTIFIED BY 'NewPass456!';
```

**单行写法：锁定用户**
`ALTER USER '<用户名>'@'<主机>' ACCOUNT LOCK;`
```sql
-- 锁定用户禁止登录
ALTER USER 'appuser'@'localhost' ACCOUNT LOCK;
```

**单行写法：解锁用户**
`ALTER USER '<用户名>'@'<主机>' ACCOUNT UNLOCK;`
```sql
-- 解锁用户
ALTER USER 'appuser'@'localhost' ACCOUNT UNLOCK;
```

**单行写法：设置密码过期**
`ALTER USER '<用户名>'@'<主机>' PASSWORD EXPIRE;`
```sql
-- 强制用户下次登录修改密码
ALTER USER 'appuser'@'localhost' PASSWORD EXPIRE;
```

**单行写法：删除用户**
`DROP USER [IF EXISTS] '<用户名>'@'<主机>';`
```sql
-- 删除用户
DROP USER IF EXISTS 'appuser'@'localhost';
```

**单行写法：重命名用户**
`RENAME USER '<旧名>'@'<主机>' TO '<新名>'@'<主机>';`
```sql
-- 重命名用户
RENAME USER 'appuser'@'localhost' TO 'webapp'@'localhost';
```

---

## 查看用户

**单行写法：查看所有用户**
`SELECT User, Host FROM mysql.user;`
```sql
-- 列出所有用户
SELECT User, Host FROM mysql.user;
```

**单行写法：查看当前用户**
`SELECT CURRENT_USER();`
```sql
-- 查看当前登录用户
SELECT CURRENT_USER();
```

**换行写法：查看用户权限**
`SHOW GRANTS FOR '<用户名>'@'<主机>';`
```sql
-- 查看指定用户权限
SHOW GRANTS FOR 'appuser'@'localhost';
```

**单行写法：查看当前用户权限**
`SHOW GRANTS;`
```sql
-- 查看当前登录用户权限
SHOW GRANTS;
```

---

## 权限授予与回收

**单行写法：授予所有权限**
`GRANT ALL PRIVILEGES ON <库>.<表> TO '<用户名>'@'<主机>';`
```sql
-- 授予某库所有表的所有权限
GRANT ALL PRIVILEGES ON mydb.* TO 'appuser'@'localhost';
```

**单行写法：授予指定权限**
`GRANT SELECT, INSERT, UPDATE ON <库>.<表> TO '<用户名>'@'<主机>';`
```sql
-- 授予增删改查权限
GRANT SELECT, INSERT, UPDATE, DELETE ON mydb.users TO 'appuser'@'localhost';
```

**单行写法：授予全局权限**
`GRANT <权限> ON *.* TO '<用户名>'@'<主机>';`
```sql
-- 授予全局 CREATE 权限
GRANT CREATE ON *.* TO 'appuser'@'localhost';
```

**单行写法：授予并允许授权**
`GRANT <权限> ON <库>.<表> TO '<用户>'@'<主机>' WITH GRANT OPTION;`
```sql
-- 授予权限并允许该用户授权给他人
GRANT SELECT ON mydb.* TO 'admin'@'localhost' WITH GRANT OPTION;
```

**单行写法：回收权限**
`REVOKE <权限> ON <库>.<表> FROM '<用户名>'@'<主机>';`
```sql
-- 回收删除权限
REVOKE DELETE ON mydb.users FROM 'appuser'@'localhost';
```

**单行写法：回收所有权限**
`REVOKE ALL PRIVILEGES ON <库>.<表> FROM '<用户名>'@'<主机>';`
```sql
-- 回收某库所有权限
REVOKE ALL PRIVILEGES ON mydb.* FROM 'appuser'@'localhost';
```

**单行写法：刷新权限**
`FLUSH PRIVILEGES;`
```sql
-- 直接修改 user 表后刷新权限
FLUSH PRIVILEGES;
```

---

## 常用权限列表

**单行写法：授予 DML 权限**
`GRANT SELECT, INSERT, UPDATE, DELETE ON <库>.* TO '<用户>'@'<主机>';`
```sql
-- 授予数据操作权限
GRANT SELECT, INSERT, UPDATE, DELETE ON mydb.* TO 'appuser'@'%';
```

**单行写法：授予 DDL 权限**
`GRANT CREATE, ALTER, DROP, INDEX ON <库>.* TO '<用户>'@'<主机>';`
```sql
-- 授予数据定义权限
GRANT CREATE, ALTER, DROP, INDEX ON mydb.* TO 'devuser'@'%';
```

**单行写法：授予只读权限**
`GRANT SELECT ON <库>.* TO '<用户>'@'<主机>';`
```sql
-- 授予只读权限
GRANT SELECT ON mydb.* TO 'readonly'@'%';
```

**单行写法：授予备份权限**
`GRANT SELECT, LOCK TABLES, RELOAD, REPLICATION CLIENT ON *.* TO '<用户>'@'<主机>';`
```sql
-- 授予 mysqldump 所需权限
GRANT SELECT, LOCK TABLES, RELOAD, REPLICATION CLIENT ON *.* TO 'backup'@'localhost';
```

---

## 角色管理（8.0+）

**单行写法：创建角色**
`CREATE ROLE '<角色名>';`
```sql
-- 创建角色
CREATE ROLE 'app_read';
```

**单行写法：给角色授权**
`GRANT SELECT ON <库>.* TO '<角色名>';`
```sql
-- 给角色授予只读权限
GRANT SELECT ON mydb.* TO 'app_read';
```

**单行写法：将角色授予用户**
`GRANT '<角色名>' TO '<用户名>'@'<主机>';`
```sql
-- 把角色分配给用户
GRANT 'app_read' TO 'appuser'@'localhost';
```

**单行写法：设置默认角色**
`SET DEFAULT ROLE '<角色名>' TO '<用户名>'@'<主机>';`
```sql
-- 设置用户登录后默认激活的角色
SET DEFAULT ROLE 'app_read' TO 'appuser'@'localhost';
```

**单行写法：激活当前角色**
`SET ROLE '<角色名>';`
```sql
-- 当前会话激活指定角色
SET ROLE 'app_read';
```

**单行写法：查看当前角色**
`SELECT CURRENT_ROLE();`
```sql
-- 查看当前激活的角色
SELECT CURRENT_ROLE();
```

**单行写法：回收角色**
`REVOKE '<角色名>' FROM '<用户名>'@'<主机>';`
```sql
-- 从用户回收角色
REVOKE 'app_read' FROM 'appuser'@'localhost';
```

**单行写法：删除角色**
`DROP ROLE [IF EXISTS] '<角色名>';`
```sql
-- 删除角色
DROP ROLE IF EXISTS 'app_read';
```

---

## 密码策略

**单行写法：查看密码策略**
`SHOW VARIABLES LIKE 'validate_password%';`
```sql
-- 查看密码验证插件配置
SHOW VARIABLES LIKE 'validate_password%';
```

**单行写法：设置密码长度**
`SET GLOBAL validate_password.length = <数值>;`
```sql
-- 设置最小密码长度
SET GLOBAL validate_password.length = 12;
```

**单行写法：设置密码复杂度**
`SET GLOBAL validate_password.policy = <级别>;`
```sql
-- 设置密码策略为中等
SET GLOBAL validate_password.policy = 'MEDIUM';
```
