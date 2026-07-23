---
order: 90
title: 数据加密
module: mysql
category: MySQL
difficulty: advanced
description: MySQL数据加密：透明数据加密TDE、密钥管理、加密表空间与静态数据保护
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/防火墙插件
  - mysql/InnoDB体系架构
  - mysql/索引与执行计划
  - mysql/MySQL9新特性与并行查询
prerequisites:
  - mysql/语法速查
---

## 1. 透明数据加密（TDE）

### 1.1 概述

InnoDB 透明数据加密（Transparent Data Encryption）在存储层自动加密数据，对应用透明。

### 1.2 配置

```ini
[mysqld]
early-plugin-load = keyring_file.so
keyring_file_data = /var/lib/mysql-keyring/keyring
```

```sql
-- 安装 keyring 插件
INSTALL PLUGIN keyring_file SONAME 'keyring_file.so';

-- 查看插件状态
SELECT PLUGIN_NAME, PLUGIN_STATUS FROM information_schema.PLUGINS
WHERE PLUGIN_NAME LIKE 'keyring%';
```

## 2. 加密表空间

```sql
-- 创建加密表
CREATE TABLE sensitive_data (
    id BIGINT PRIMARY KEY,
    ssn VARCHAR(20),
    credit_card VARCHAR(20)
) ENCRYPTION = 'Y';

-- 加密现有表
ALTER TABLE sensitive_data ENCRYPTION = 'Y';

-- 加密通用表空间
CREATE TABLESPACE encrypted_ts ADD DATAFILE 'encrypted_ts.ibd' ENCRYPTION = 'Y';
```

## 3. 加密 redo log 和 undo log

```sql
-- 加密 redo log
SET GLOBAL innodb_redo_log_encrypt = ON;

-- 加密 undo log
SET GLOBAL innodb_undo_log_encrypt = ON;
```

## 4. 密钥轮换

```sql
-- 轮换主密钥
ALTER INSTANCE ROTATE INNODB MASTER KEY;

-- 建议定期轮换（如每季度）
```

## 5. 密钥管理

```sql
-- keyring_file：文件存储（开发环境）
-- keyring_encrypted_file：加密文件存储
-- keyring_okv：Oracle Key Vault
-- keyring_aws：AWS KMS

-- 生产环境推荐使用外部密钥管理服务
```
