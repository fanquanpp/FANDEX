---
order: 76
title: 订阅与发布
module: postgresql
category: PostgreSQL
difficulty: advanced
description: PostgreSQL逻辑复制：发布与订阅、选择性复制、冲突处理与监控
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/逻辑解码与输出插件
  - postgresql/增量备份
  - 'postgresql/SSL-TLS加密连接'
  - postgresql/基于角色的权限管理
prerequisites:
  - postgresql/概述与安装配置
---

## 1. 逻辑复制概述

逻辑复制基于发布/订阅模型，在表级别复制数据变更。

## 2. 发布端配置

```sql
-- 创建发布
CREATE PUBLICATION my_pub FOR TABLE employees, departments;

-- 发布所有表
CREATE PUBLICATION all_tables FOR ALL TABLES;

-- 发布特定模式
CREATE PUBLICATION schema_pub FOR TABLES IN SCHEMA public;

-- 查看发布
SELECT * FROM pg_publication;
SELECT * FROM pg_publication_tables;
```

## 3. 订阅端配置

```sql
-- 创建订阅
CREATE SUBSCRIPTION my_sub
CONNECTION 'host=publisher-host dbname=mydb user=replicator password=password'
PUBLICATION my_pub;

-- 查看订阅
SELECT * FROM pg_subscription;
SELECT * FROM pg_stat_subscription;
```

## 4. 冲突处理

```sql
-- 逻辑复制冲突时，订阅端会停止
-- 查看冲突
SELECT * FROM pg_stat_subscription;

-- 解决方案1：跳过冲突事务
ALTER SUBSCRIPTION my_sub SKIP (lsn = '0/12345678');

-- 解决方案2：手动修复数据后重启
-- 修复冲突数据
ALTER SUBSCRIPTION my_sub DISABLE;
-- 修复后重新启用
ALTER SUBSCRIPTION my_sub ENABLE;
```

## 5. 监控

```sql
-- 发布端
SELECT * FROM pg_stat_replication;

-- 订阅端
SELECT subname, pid, received_lsn, latest_end_lsn,
       latest_end_time
FROM pg_stat_subscription;
```
