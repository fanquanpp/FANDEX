---
order: 88
title: 'SSL-TLS加密'
module: mysql
category: MySQL
difficulty: intermediate
description: 'MySQL SSL/TLS加密连接：证书配置、强制加密、客户端验证与安全最佳实践'
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/分库分表中间件
  - mysql/账户与权限管理
  - mysql/防火墙插件
  - mysql/InnoDB体系架构
prerequisites:
  - mysql/语法速查
---

## 1. SSL/TLS 概述

MySQL 支持SSL/TLS加密客户端与服务器之间的通信，防止数据在传输中被窃听。

## 2. 配置SSL

### 2.1 自动配置

```sql
-- MySQL 8.0 默认自动生成SSL证书
-- 查看SSL状态
SHOW VARIABLES LIKE '%ssl%';
-- have_ssl = YES
```

### 2.2 手动配置

```ini
[mysqld]
ssl-ca = /etc/mysql/ssl/ca.pem
ssl-cert = /etc/mysql/ssl/server-cert.pem
ssl-key = /etc/mysql/ssl/server-key.pem
require_secure_transport = ON  -- 强制加密连接
```

## 3. 强制加密连接

```sql
-- 创建必须使用SSL的用户
CREATE USER 'secure_user'@'%' IDENTIFIED BY 'password'
REQUIRE SSL;

-- 创建需要客户端证书的用户
CREATE USER 'cert_user'@'%' IDENTIFIED BY 'password'
REQUIRE X509;

-- 修改现有用户
ALTER USER 'app_user'@'%' REQUIRE SSL;
```

## 4. 客户端连接

```bash
# 使用SSL连接
mysql -u secure_user -p --ssl-mode=REQUIRED

# 使用客户端证书
mysql -u cert_user -p \
    --ssl-ca=/etc/mysql/ssl/ca.pem \
    --ssl-cert=/etc/mysql/ssl/client-cert.pem \
    --ssl-key=/etc/mysql/ssl/client-key.pem

# 验证SSL连接
mysql> \s
-- SSL: Cipher in use is TLS_AES_256_GCM_SHA384
```

## 5. 验证SSL连接

```sql
-- 查看当前连接是否加密
SELECT * FROM performance_schema.session_status
WHERE VARIABLE_NAME = 'Ssl_cipher';

-- 查看所有连接的SSL状态
SELECT sbt.thread_id, sbt.ssl_cipher, sbt.user, sbt.host
FROM performance_schema.threads t
JOIN performance_schema.session_connect_attrs sca
    ON t.processlist_id = sca.processlist_id
WHERE sca.attr_name = 'ssl_cipher';
```
