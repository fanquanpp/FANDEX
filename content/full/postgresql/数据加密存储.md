---
order: 80
title: 数据加密存储
module: postgresql
category: PostgreSQL
difficulty: advanced
description: PostgreSQL数据加密存储：pgcrypto扩展、加密函数、列级加密与密钥管理
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/基于角色的权限管理
  - postgresql/行级安全策略
  - postgresql/审计日志
  - postgresql/序列与自增列
prerequisites:
  - postgresql/概述与安装配置
---

## 1. pgcrypto 扩展

```sql
CREATE EXTENSION pgcrypto;
```

## 2. 哈希函数

```sql
-- MD5（不推荐用于安全场景）
SELECT md5('password');

-- SHA-256
SELECT encode(digest('password', 'sha256'), 'hex');

-- bcrypt（推荐用于密码存储）
SELECT crypt('password', gen_salt('bf'));
-- 验证
SELECT crypt('password', stored_hash) = stored_hash;
```

## 3. 加密函数

```sql
-- 对称加密（AES-256）
SELECT encrypt('secret data', 'my_key', 'aes');
SELECT decrypt(encrypt('secret data', 'my_key', 'aes'), 'my_key', 'aes');

-- pgp对称加密
SELECT pgp_sym_encrypt('secret data', 'my_password');
SELECT pgp_sym_decrypt(pgp_sym_encrypt('secret data', 'my_password'), 'my_password');

-- pgp公钥加密
SELECT pgp_pub_encrypt('secret data', dearmor(public_key));
SELECT pgp_pub_decrypt(encrypted_data, dearmor(private_key), 'passphrase');
```

## 4. 列级加密

```sql
-- 加密列
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    ssn BYTEA  -- 加密存储
);

-- 插入加密数据
INSERT INTO users (name, ssn) VALUES (
    'Alice',
    pgp_sym_encrypt('123-45-6789', 'encryption_key')
);

-- 查询解密
SELECT name, pgp_sym_decrypt(ssn, 'encryption_key') AS ssn
FROM users;
```
