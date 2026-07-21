---
order: 77
title: 'SSL-TLS加密连接'
module: postgresql
category: PostgreSQL
difficulty: intermediate
description: 'PostgreSQL SSL/TLS加密连接：证书配置、强制加密、客户端证书验证'
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/增量备份
  - postgresql/订阅与发布
  - postgresql/基于角色的权限管理
  - postgresql/行级安全策略
prerequisites:
  - postgresql/概述与安装配置
---

## 1. 配置SSL

```ini
# postgresql.conf
ssl = on
ssl_ca_file = '/etc/postgresql/root.crt'
ssl_cert_file = '/etc/postgresql/server.crt'
ssl_key_file = '/etc/postgresql/server.key'
```

## 2. 强制SSL

```ini
# pg_hba.conf
hostssl all all 0.0.0.0/0 md5       -- 只允许SSL连接
hostnossl all all 0.0.0.0/0 reject   -- 拒绝非SSL连接
```

## 3. 客户端证书验证

```ini
# pg_hba.conf
hostssl all all 0.0.0.0/0 cert       -- 要求客户端证书
```

```bash
# 客户端连接
psql "host=server dbname=mydb user=alice sslmode=verify-full sslcert=client.crt sslkey=client.key sslrootcert=root.crt"
```

## 4. sslmode 选项

| 模式        | 验证级别                |
| ----------- | ----------------------- |
| disable     | 不使用SSL               |
| allow       | 优先非SSL，失败再SSL    |
| prefer      | 优先SSL，失败再非SSL    |
| require     | 必须SSL，不验证证书     |
| verify-ca   | 必须SSL，验证CA         |
| verify-full | 必须SSL，验证CA和主机名 |
