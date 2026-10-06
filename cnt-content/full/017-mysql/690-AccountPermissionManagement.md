---
order: 730
title: 账户与权限管理
module: 'mysql'
category: 数据库
difficulty: intermediate
description: MySQL账户与权限管理：用户创建、权限授予、角色、密码策略与审计
author: fanquanpp
updated: '2026-10-05'
related:
  - 'mysql/660-PartitionedTable'
  - 'mysql/680-ShardingMiddleware'
  - 'mysql/710-SSLEncryption'
  - 'mysql/730-FirewallPlugin'
prerequisites:
  - 'mysql/160-View'
---

## 1. 用户管理

```sql
-- 创建用户
CREATE USER 'app_user'@'%' IDENTIFIED BY 'StrongP@ss123';
CREATE USER 'readonly'@'10.0.%' IDENTIFIED BY 'password';

-- 修改密码
ALTER USER 'app_user'@'%' IDENTIFIED BY 'NewP@ss456';

-- 删除用户
DROP USER 'app_user'@'%';

-- 查看用户
SELECT user, host FROM mysql.user;
```

## 2. 权限管理

```sql
-- 授予权限
GRANT SELECT, INSERT ON mydb.* TO 'app_user'@'%';
GRANT ALL PRIVILEGES ON mydb.* TO 'admin'@'localhost';

-- 撤销权限
REVOKE INSERT ON mydb.* FROM 'app_user'@'%';

-- 查看权限
SHOW GRANTS FOR 'app_user'@'%';
```

## 3. 角色（MySQL 8.0+）

```sql
-- 创建角色
CREATE ROLE 'app_read', 'app_write', 'app_admin';

-- 授予角色权限
GRANT SELECT ON mydb.* TO 'app_read';
GRANT SELECT, INSERT, UPDATE, DELETE ON mydb.* TO 'app_write';
GRANT ALL PRIVILEGES ON mydb.* TO 'app_admin';

-- 将角色分配给用户
GRANT 'app_read' TO 'reporting_user'@'%';
GRANT 'app_write' TO 'application_user'@'%';

-- 激活角色
SET DEFAULT ROLE ALL TO 'reporting_user'@'%';
```

## 4. 密码策略

```sql
-- MySQL 8.0 密码验证插件
INSTALL COMPONENT 'file://component_validate_password';
SET GLOBAL validate_password.policy = MEDIUM;
SET GLOBAL validate_password.length = 12;
SET GLOBAL validate_password.mixed_case_count = 1;
SET GLOBAL validate_password.number_count = 1;
SET GLOBAL validate_password.special_char_count = 1;

-- 密码过期
ALTER USER 'app_user'@'%' PASSWORD EXPIRE INTERVAL 90 DAY;
ALTER USER 'app_user'@'%' PASSWORD EXPIRE NEVER;
```

## 5. 连接安全

```sql
-- 限制最大连接数
ALTER USER 'app_user'@'%' WITH MAX_CONNECTIONS_PER_HOUR 100;

-- 限制查询数
ALTER USER 'app_user'@'%' WITH MAX_QUERIES_PER_HOUR 1000;

-- 锁定账户
ALTER USER 'app_user'@'%' ACCOUNT LOCK;
ALTER USER 'app_user'@'%' ACCOUNT UNLOCK;
```
## 用户管理

**单行写法：创建用户允许任意主机连接**
`CREATE USER '<用户名>'@'%' IDENTIFIED BY '<密码>'`
```sql
-- 创建允许任意主机连接的用户
CREATE USER 'app_user'@'%' IDENTIFIED BY 'StrongP@ss123';
```

**单行写法：创建用户限制来源 IP 段**
`CREATE USER '<用户名>'@'<IP 段>' IDENTIFIED BY '<密码>'`
```sql
-- 创建限制来源 IP 段的用户
CREATE USER 'readonly'@'10.0.%' IDENTIFIED BY 'password';
```

**单行写法：修改用户密码**
`ALTER USER '<用户名>'@'<主机>' IDENTIFIED BY '<新密码>'`
```sql
-- 修改用户密码
ALTER USER 'app_user'@'%' IDENTIFIED BY 'NewP@ss456';
```

**单行写法：删除用户**
`DROP USER '<用户名>'@'<主机>'`
```sql
-- 删除指定用户
DROP USER 'app_user'@'%';
```

**单行写法：查看所有用户**
`SELECT user, host FROM mysql.user`
```sql
-- 查看所有用户列表
SELECT user, host FROM mysql.user;
```

---

## 权限管理

**单行写法：授予查询和插入权限**
`GRANT <权限列表> ON <库>.<表> TO '<用户名>'@'<主机>'`
```sql
-- 授予查询和插入权限
GRANT SELECT, INSERT ON mydb.* TO 'app_user'@'%';
```

**单行写法：授予所有权限**
`GRANT ALL PRIVILEGES ON <库>.<表> TO '<用户名>'@'<主机>'`
```sql
-- 授予所有权限
GRANT ALL PRIVILEGES ON mydb.* TO 'admin'@'localhost';
```

**单行写法：撤销权限**
`REVOKE <权限列表> ON <库>.<表> FROM '<用户名>'@'<主机>'`
```sql
-- 撤销插入权限
REVOKE INSERT ON mydb.* FROM 'app_user'@'%';
```

**单行写法：查看用户权限**
`SHOW GRANTS FOR '<用户名>'@'<主机>'`
```sql
-- 查看用户权限
SHOW GRANTS FOR 'app_user'@'%';
```

**单行写法：刷新权限**
`FLUSH PRIVILEGES`
```sql
-- 刷新权限表
FLUSH PRIVILEGES;
```

---

## 角色管理

**单行写法：创建多个角色**
`CREATE ROLE '<角色名>'[, '<角色名>'...]`
```sql
-- 创建多个角色
CREATE ROLE 'app_read', 'app_write', 'app_admin';
```

**单行写法：授予只读角色权限**
`GRANT SELECT ON <库>.<表> TO '<角色名>'`
```sql
-- 授予只读角色权限
GRANT SELECT ON mydb.* TO 'app_read';
```

**单行写法：授予读写角色权限**
`GRANT SELECT, INSERT, UPDATE, DELETE ON <库>.<表> TO '<角色名>'`
```sql
-- 授予读写角色权限
GRANT SELECT, INSERT, UPDATE, DELETE ON mydb.* TO 'app_write';
```

**单行写法：授予管理员角色权限**
`GRANT ALL PRIVILEGES ON <库>.<表> TO '<角色名>'`
```sql
-- 授予管理员角色权限
GRANT ALL PRIVILEGES ON mydb.* TO 'app_admin';
```

**单行写法：将角色分配给用户**
`GRANT '<角色名>' TO '<用户名>'@'<主机>'`
```sql
-- 分配角色给用户
GRANT 'app_read' TO 'reporting_user'@'%';
```

**单行写法：设置用户默认角色**
`SET DEFAULT ROLE ALL TO '<用户名>'@'<主机>'`
```sql
-- 设置用户默认角色
SET DEFAULT ROLE ALL TO 'reporting_user'@'%';
```

**单行写法：撤销用户角色**
`REVOKE '<角色名>' FROM '<用户名>'@'<主机>'`
```sql
-- 撤销用户角色
REVOKE 'app_read' FROM 'reporting_user'@'%';
```

**单行写法：删除角色**
`DROP ROLE '<角色名>'[, '<角色名>'...]`
```sql
-- 删除多个角色
DROP ROLE 'app_read', 'app_write', 'app_admin';
```

---

## 密码策略

**单行写法：安装密码验证组件**
`INSTALL COMPONENT 'file://component_validate_password'`
```sql
-- 安装密码验证组件
INSTALL COMPONENT 'file://component_validate_password';
```

**单行写法：设置密码策略级别**
`SET GLOBAL validate_password.policy = <级别>`
```sql
-- 设置密码策略级别为 MEDIUM
SET GLOBAL validate_password.policy = MEDIUM;
```

**单行写法：设置密码最小长度**
`SET GLOBAL validate_password.length = <长度>`
```sql
-- 设置密码最小长度为 12
SET GLOBAL validate_password.length = 12;
```

**单行写法：设置大小写字母数量**
`SET GLOBAL validate_password.mixed_case_count = <数量>`
```sql
-- 设置密码大小写字母数量为 1
SET GLOBAL validate_password.mixed_case_count = 1;
```

**单行写法：设置数字数量**
`SET GLOBAL validate_password.number_count = <数量>`
```sql
-- 设置密码数字数量为 1
SET GLOBAL validate_password.number_count = 1;
```

**单行写法：设置特殊字符数量**
`SET GLOBAL validate_password.special_char_count = <数量>`
```sql
-- 设置密码特殊字符数量为 1
SET GLOBAL validate_password.special_char_count = 1;
```

**单行写法：密码定期过期**
`ALTER USER '<用户名>'@'<主机>' PASSWORD EXPIRE INTERVAL <天数> DAY`
```sql
-- 设置密码 90 天过期
ALTER USER 'app_user'@'%' PASSWORD EXPIRE INTERVAL 90 DAY;
```

**单行写法：密码永不过期**
`ALTER USER '<用户名>'@'<主机>' PASSWORD EXPIRE NEVER`
```sql
-- 设置密码永不过期
ALTER USER 'app_user'@'%' PASSWORD EXPIRE NEVER;
```

---

## 连接限制

**单行写法：限制每小时最大连接数**
`ALTER USER '<用户名>'@'<主机>' WITH MAX_CONNECTIONS_PER_HOUR <数量>`
```sql
-- 限制每小时最大连接数为 100
ALTER USER 'app_user'@'%' WITH MAX_CONNECTIONS_PER_HOUR 100;
```

**单行写法：限制每小时最大查询数**
`ALTER USER '<用户名>'@'<主机>' WITH MAX_QUERIES_PER_HOUR <数量>`
```sql
-- 限制每小时最大查询数为 1000
ALTER USER 'app_user'@'%' WITH MAX_QUERIES_PER_HOUR 1000;
```

**单行写法：锁定账户**
`ALTER USER '<用户名>'@'<主机>' ACCOUNT LOCK`
```sql
-- 锁定账户
ALTER USER 'app_user'@'%' ACCOUNT LOCK;
```

**单行写法：解锁账户**
`ALTER USER '<用户名>'@'<主机>' ACCOUNT UNLOCK`
```sql
-- 解锁账户
ALTER USER 'app_user'@'%' ACCOUNT UNLOCK;
```

### 认证插件：caching_sha2_password

MySQL 8.0 起默认认证插件从 `mysql_native_password` 换成 `caching_sha2_password`——更安全（挑战-响应 + 全程 SHA-256，密码不以可逆形式传输），但带来两个运维衔接点：

```sql
-- 盘点各用户的认证插件
SELECT user, host, plugin FROM mysql.user;

-- 新建用户默认就是 caching_sha2_password
CREATE USER 'app_user'@'%' IDENTIFIED WITH caching_sha2_password BY 'StrongP@ss123!';

-- 首次连接需要安全通道取公钥（TLS 或 RSA 公钥交换）
-- JDBC 连接串补：allowPublicKeyRetrieval=true&useSSL=true
-- 老客户端（5.x 驱动）不认识该插件时的兼容回退（不推荐生产用）：
ALTER USER 'legacy_user'@'%' IDENTIFIED WITH mysql_native_password BY 'password';
```

两个衔接点：其一，新插件首次认证要求安全通道（TLS）或 RSA 公钥交换——很多「升级 8.0 后应用连不上」的事故根因是驱动没配 `allowPublicKeyRetrieval` 或没开 TLS，报错是 `Authentication plugin 'caching_sha2_password' cannot be loaded` 或公钥获取失败；其二，`mysql_native_password` 在 8.4 起默认禁用（8.0 里已标记废弃）——靠回退插件苟着的旧客户端要排期升级驱动，升级清单见 [8.4 升级指南](/mysql/840-MySQL84UpgradeGuide)。加密通道的完整配置见 [SSL 加密](/mysql/710-SSLEncryption)。

### 登录失败锁定（8.0+）

```sql
-- 连续失败 N 次后锁定 M 天（防爆破的数据库侧闸门）
CREATE USER 'app_user'@'%' IDENTIFIED BY 'P@ss123!'
  FAILED_LOGIN_ATTEMPTS 3
  PASSWORD_LOCK_TIME 1;            -- 失败 3 次锁 1 天

-- 永久锁定直到人工解锁（高敏感账号）
ALTER USER 'app_user'@'%'
  FAILED_LOGIN_ATTEMPTS 5
  PASSWORD_LOCK_TIME UNBOUNDED;
```

与手工 `ACCOUNT LOCK` 的分工：ACCOUNT LOCK 是管理员主动停用（维护期、离职封号），FAILED_LOGIN_ATTEMPTS 是**自动**防爆破——注意阈值别设太低，应用密码轮换窗口期的配置错误会把整个业务账号锁死（计的是「登录失败次数」不是「错误密码」，网络抖动导致的认证中断同样计数）。解锁用 `ALTER USER ... ACCOUNT UNLOCK`。
