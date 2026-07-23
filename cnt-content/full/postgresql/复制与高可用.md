---
order: 5
title: 复制与高可用
module: postgresql
category: PostgreSQL
difficulty: advanced
description: 流复制、级联复制、逻辑复制、物理复制槽、逻辑解码、增量备份、订阅与发布、SSL/TLS、行级安全、pgcrypto、pgAudit。
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/索引与查询优化
  - postgresql/高级SQL与扩展
  - postgresql/语法速查
  - postgresql/体系架构
prerequisites: []
---

## 1. 流复制

### 1.1 流复制架构

```
  主节点 (Primary)                    备节点 (Standby)
  ┌──────────────┐                   ┌──────────────┐
  │ WAL 发送进程  │ ─── WAL 流 ────→ │ WAL 接收进程  │
  │              │                   │ WAL 回放进程  │
  │ 读写请求     │                   │ 只读查询     │
  └──────────────┘                   └──────────────┘
```

### 1.2 异步流复制配置

```bash
# === 主节点配置 ===

# postgresql.conf
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10
wal_keep_size = '1GB'
hot_standby = on

# pg_hba.conf 添加
host replication replicator 192.168.1.0/24 scram-sha-256
```

```sql
-- 主节点创建复制用户
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'RepPass123';
```

```bash
# === 备节点配置 ===

# 使用 pg_basebackup 创建基础备份
pg_basebackup \
  -h 192.168.1.10 -U replicator \
  -D /var/lib/postgresql/17/main \
  -Fp -Xs -P -R

# -R 自动创建 standby.signal 和 postgresql.auto.conf

# postgresql.auto.conf（自动生成）
primary_conninfo = 'user=replicator password=RepPass123 host=192.168.1.10 port=5432 sslmode=prefer'
```

### 1.3 同步流复制

```ini
# 主节点 postgresql.conf
synchronous_standby_names = 'FIRST 1 (standby1, standby2)'
# FIRST 1: 至少1个同步备节点
# ANY 1: 任意1个确认即可

# synchronous_commit 参数:
# remote_apply  — 备节点回放完成（最安全，延迟最高）
# remote_write  — 备节点写入 OS 缓存（推荐）
# on            — 备节点写入 WAL（默认）
# local         — 仅本地确认（异步）
# off           — 不等待（最高性能）
```

### 1.4 复制状态监控

```sql
-- 主节点查看复制状态
SELECT client_addr, state, sent_lsn, write_lsn, flush_lsn, replay_lsn,
  write_lag, flush_lag, replay_lag
FROM pg_stat_replication;

-- 备节点查看接收状态
SELECT status, sender_host, sender_port, received_lsn, latest_end_lsn
FROM pg_stat_wal_receiver;

-- 复制延迟计算
SELECT now() - pg_last_xact_replay_timestamp() AS replay_delay;

-- 查看是否处于恢复模式
SELECT pg_is_in_recovery();
```

## 2. 级联复制

```
  主节点
    │
    ├── 备节点1 (级联上游)
    │     │
    │     ├── 备节点2 (级联下游)
    │     └── 备节点3 (级联下游)
    │
    └── 备节点4
```

```ini
# 级联备节点配置
# 备节点2 的 postgresql.auto.conf
primary_conninfo = 'user=replicator host=192.168.1.11 port=5432'
# 指向备节点1而非主节点

# 级联备节点也可以作为上游
# 备节点1 需要开启:
wal_level = replica
max_wal_senders = 5
```

## 3. 逻辑复制

### 3.1 发布与订阅模型

```sql
-- === 发布端（源数据库） ===

-- 创建发布
CREATE PUBLICATION pub_orders FOR TABLE orders, order_items;

-- 发布所有表
CREATE PUBLICATION pub_all FOR ALL TABLES;

-- 发布指定操作
CREATE PUBLICATION pub_orders_insert FOR TABLE orders
  WITH (publish = 'insert, update');  -- 仅复制 INSERT 和 UPDATE

-- 管理发布
ALTER PUBLICATION pub_orders ADD TABLE products;
ALTER PUBLICATION pub_orders DROP TABLE order_items;
DROP PUBLICATION pub_orders;
```

```sql
-- === 订阅端（目标数据库） ===

-- 创建订阅
CREATE SUBSCRIPTION sub_orders
  CONNECTION 'host=192.168.1.10 user=replicator password=RepPass123 dbname=fandex'
  PUBLICATION pub_orders;

-- 同步已有数据
CREATE SUBSCRIPTION sub_orders
  CONNECTION 'host=192.168.1.10 ...'
  PUBLICATION pub_orders
  WITH (copy_data = true);    -- 初始数据同步

-- 管理订阅
ALTER SUBSCRIPTION sub_orders REFRESH PUBLICATION;
ALTER SUBSCRIPTION sub_orders DISABLE;
ALTER SUBSCRIPTION sub_orders ENABLE;
DROP SUBSCRIPTION sub_orders;

-- 查看订阅状态
SELECT subname, pid, received_lsn, latest_end_lsn, latest_end_time
FROM pg_stat_subscription;
```

### 3.2 逻辑复制限制

```
1. 不复制 DDL（需手动同步表结构）
2. 不复制序列值（需手动同步）
3. 不复制大对象（BYTEA 可复制）
4. 不复制 TRUNCATE（PostgreSQL 11+ 支持）
5. 主键必须存在（UPDATE/DELETE 需要标识行）
6. 同一表不能有多个订阅源
7. 复制标识: REPLICA IDENTITY DEFAULT (主键) / FULL (所有列) / INDEX / NOTHING
```

## 4. 物理复制槽

```sql
-- 创建复制槽
SELECT pg_create_physical_replication_slot('slot_standby1');

-- 查看复制槽
SELECT slot_name, slot_type, active, restart_lsn, confirmed_flush_lsn
FROM pg_replication_slots;

-- 备节点使用复制槽
# postgresql.auto.conf
primary_conninfo = '... slot=slot_standby1'

-- 删除不活跃的复制槽（防止 WAL 堆积）
SELECT pg_drop_replication_slot('slot_standby1');

--  注意: 不活跃的复制槽会导致 WAL 不被清理，磁盘可能爆满
-- 设置最大保留
max_slot_wal_keep_size = '10GB'   -- 超过则使复制槽失效
```

## 5. 逻辑解码与输出插件

```sql
-- 逻辑解码示例
SELECT * FROM pg_create_logical_replication_slot('test_slot', 'test_decoding');

-- 查看变更
SELECT lsn, xid, data
FROM pg_logical_slot_peek_changes('test_slot', NULL, NULL);

-- 消费变更（推进位置）
SELECT lsn, xid, data
FROM pg_logical_slot_get_changes('test_slot', NULL, NULL);

-- 删除逻辑槽
SELECT pg_drop_replication_slot('test_slot');

-- 常用输出插件
-- test_decoding: 内置，文本格式
-- pgoutput: 内置，逻辑复制协议（默认）
-- wal2json: JSON 格式输出
--Debezium: CDC 集成
```

## 6. 增量备份

### 6.1 pg_basebackup 增量备份（PostgreSQL 17）

```bash
# 全量备份
pg_basebackup -h 192.168.1.10 -U replicator \
  -D /backup/full -Ft -z -P

# 增量备份（基于上次全量备份）
pg_basebackup -h 192.168.1.10 -U replicator \
  -D /backup/incremental \
  -Ft -z -P \
  --incremental /backup/full/base.tar

# 合并增量备份
pg_combinebackup /backup/full /backup/incremental \
  -o /backup/merged
```

### 6.2 pg_receivewal WAL 归档

```bash
# 实时接收 WAL
pg_receivewal -h 192.168.1.10 -U replicator \
  -D /backup/wal_archive \
  --slot=wal_archive_slot \
  --synchronous

# WAL 归档配置（postgresql.conf）
archive_mode = on
archive_command = 'cp %p /backup/wal_archive/%f'
# 或使用 pg_receivewal 替代 archive_command
```

## 7. 高可用方案

### 7.1 Patroni 自动故障转移

```yaml
# patroni.yml
scope: fandex-cluster
name: node1

restapi:
  listen: 0.0.0.0:8008

etcd:
  hosts: 192.168.1.100:2379

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    maximum_lag_on_failover: 1048576
    postgresql:
      use_pg_rewind: true
      use_slots: true
      parameters:
        wal_level: replica
        hot_standby: 'on'
        max_wal_senders: 10
        max_replication_slots: 10
        wal_log_hints: 'on'

postgresql:
  listen: 0.0.0.0:5432
  data_dir: /var/lib/postgresql/17/main
  authentication:
    superuser:
      username: postgres
      password: SuperPass123
    replication:
      username: replicator
      password: RepPass123
```

```bash
# 启动 Patroni
patroni /etc/patroni/patroni.yml

# 查看集群状态
patronictl -c /etc/patroni/patroni.yml list

# 手动切换
patronictl -c /etc/patroni/patroni.yml switchover

# 故障转移
patronictl -c /etc/patroni/patroni.yml failover
```

### 7.2 PgBouncer + Patroni + etcd 架构

```
客户端
  │
  ├── PgBouncer (连接池)
  │     │
  │     ├── Patroni Node1 (主) ←── etcd (Leader选举)
  │     ├── Patroni Node2 (备) ←── etcd
  │     └── Patroni Node3 (备) ←── etcd
  │
  └── HAProxy (自动路由到主节点)
        ├── :5000 → 写 (主节点)
        └── :5001 → 读 (备节点)
```

## 8. 安全机制

### 8.1 SSL/TLS 加密连接

```ini
# postgresql.conf
ssl = on
ssl_ca_file = '/etc/postgresql/ssl/ca.crt'
ssl_cert_file = '/etc/postgresql/ssl/server.crt'
ssl_key_file = '/etc/postgresql/ssl/server.key'
ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL'
ssl_min_protocol_version = 'TLSv1.2'
```

```
# pg_hba.conf 强制 SSL
hostssl all all 0.0.0.0/0 scram-sha-256
# hostssl 仅允许 SSL 连接
```

```bash
# 客户端连接
psql "host=192.168.1.10 sslmode=verify-ca sslcert=client.crt sslkey=client.key"
```

### 8.2 行级安全策略（RLS）

```sql
-- 多租户数据隔离
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 租户只能看到自己的数据
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.tenant_id')::INTEGER);

-- 超级用户默认绕过 RLS
-- 可强制超级用户也受 RLS 约束
ALTER TABLE orders FORCE ROW LEVEL SECURITY;
```

### 8.3 pgcrypto 加密扩展

```sql
CREATE EXTENSION pgcrypto;

-- 密码哈希
SELECT crypt('P@ssw0rd', gen_salt('bf', 12));  -- bcrypt, cost=12

-- 验证密码
SELECT crypt('P@ssw0rd', stored_hash) = stored_hash;

-- 对称加密
SELECT encrypt('secret data'::bytea, 'my_key'::bytea, 'aes');
SELECT decrypt(encrypted_data, 'my_key'::bytea, 'aes');

-- PGP 加密
SELECT pgp_sym_encrypt('secret', 'password');
SELECT pgp_sym_decrypt(encrypted_data, 'password');

-- PGP 非对称加密
SELECT pgp_pub_encrypt('secret', dearmor(public_key));
SELECT pgp_priv_decrypt(encrypted_data, dearmor(private_key), 'passphrase');
```

### 8.4 pgAudit 审计扩展

```sql
CREATE EXTENSION pgaudit;

-- pgaudit.conf 配置
-- pgaudit.log = 'all'              -- 审计所有操作
-- pgaudit.log = 'read,write'       -- 审计读写操作
-- pgaudit.log = 'ddl,role'         -- 审计 DDL 和角色操作
-- pgaudit.log_relation = on        -- 记录具体表名
-- pgaudit.log_parameter = on       -- 记录参数值

-- 会话级审计
SET pgaudit.log = 'write';
SET pgaudit.log_relation = on;

-- 对象级审计
-- 审计对 orders 表的所有 SELECT
SELECT pgaudit.audit_object('orders', 'SELECT');
```
