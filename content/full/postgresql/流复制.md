---
order: 71
title: 流复制
module: postgresql
category: PostgreSQL
difficulty: advanced
description: PostgreSQL流复制：同步复制、异步复制、WAL流传输与复制配置
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/扩展模块
  - postgresql/FDW外部数据包装器
  - postgresql/级联复制
  - postgresql/物理复制槽
prerequisites:
  - postgresql/概述与安装配置
---

## 1. 流复制概述

PostgreSQL 流复制基于 WAL 日志的实时传输，将主库的变更同步到备库。

## 2. 异步复制

### 2.1 主库配置

```ini
# postgresql.conf
wal_level = replica
max_wal_senders = 10
wal_keep_size = '1GB'
hot_standby = on
```

```sql
-- 创建复制用户
CREATE USER replicator REPLICATION LOGIN PASSWORD 'password';
```

```ini
# pg_hba.conf
host replication replicator standby-ip/32 md5
```

### 2.2 备库配置

```bash
# 基础备份
pg_basebackup -h primary-host -U replicator -D /var/lib/postgresql/data -Fp -Xs -P -R

# -R 自动创建 standby.signal 和 postgresql.auto.conf
```

```ini
# postgresql.conf
hot_standby = on
```

## 3. 同步复制

```sql
-- 主库配置
ALTER SYSTEM SET synchronous_standby_names = 'FIRST 1 (standby1, standby2)';
-- FIRST 1：至少1个同步备库

-- 或任意1个同步
ALTER SYSTEM SET synchronous_standby_names = 'ANY 1 (standby1, standby2)';

-- 备库配置
ALTER SYSTEM SET primary_conninfo = 'host=primary-host user=replicator password=password application_name=standby1';
```

## 4. 复制监控

```sql
-- 主库查看复制状态
SELECT client_addr, state, sent_lsn, write_lsn, flush_lsn, replay_lsn,
       sent_lsn - replay_lsn AS replication_lag
FROM pg_stat_replication;

-- 备库查看复制延迟
SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;
SELECT pg_is_in_recovery();  -- true 表示备库
```

## 5. 复制槽

```sql
-- 创建复制槽（防止WAL被清理）
SELECT pg_create_physical_replication_slot('standby1_slot');

-- 配置备库使用复制槽
ALTER SYSTEM SET primary_slot_name = 'standby1_slot';

-- 查看复制槽
SELECT * FROM pg_replication_slots;

-- 删除复制槽
SELECT pg_drop_replication_slot('standby1_slot');
```
