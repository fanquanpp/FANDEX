---
order: 72
title: 级联复制
module: postgresql
category: PostgreSQL
difficulty: intermediate
description: PostgreSQL级联复制：备库作为上游、多层级联架构与配置
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/FDW外部数据包装器
  - postgresql/流复制
  - postgresql/物理复制槽
  - postgresql/逻辑解码与输出插件
prerequisites:
  - postgresql/概述与安装配置
---

## 概述

级联复制（Cascading Replication）是 PostgreSQL 流复制的扩展能力，允许备库作为上游，将接收到的 WAL 数据继续转发给其他备库。这种架构可以有效减少主库的复制负载，特别是在需要多个备库的场景下。级联复制广泛应用于跨数据中心部署、读写分离和报表分流等场景，是构建高可用和大规模读取架构的重要手段。

## 基础概念

**级联备库（Cascading Standby）**：既是主库的下游（接收 WAL），又是其他备库的上游（转发 WAL）。级联备库必须启用 hot_standby 参数。

**WAL 发送进程**：主库和级联备库都会启动 wal_sender 进程来发送 WAL。级联备库的 max_wal_senders 参数决定了它能向多少个下游备库转发。

**复制拓扑**：级联复制形成树状拓扑结构。主库是根节点，级联备库是中间节点，叶子备库是末端节点。每一级只从其上游接收 WAL。

**流复制协议**：级联备库使用与主库相同的流复制协议向下游发送 WAL，下游备库的配置方式与直连主库基本相同。

## 快速上手

### 基本架构

```
主库 (Primary)
  |
  +-- 级联备库1 (Cascade Standby 1)
  |     |
  |     +-- 备库2 (Standby 2)
  |     +-- 备库3 (Standby 3)
  |
  +-- 级联备库4 (Cascade Standby 4)
        |
        +-- 备库5 (Standby 5)
```

### 级联备库配置

```ini
# 级联备库的 postgresql.conf
# 启用热备份（允许只读查询）
hot_standby = on

# 允许向下游发送 WAL
max_wal_senders = 10

# WAL 保留大小
wal_keep_size = '1GB'

# 监听所有地址（允许下游备库连接）
listen_addresses = '*'
```

```ini
# 级联备库的 pg_hba.conf
# 允许下游备库的复制连接
# TYPE  DATABASE  USER        ADDRESS         METHOD
host    replication  replicator  192.168.2.0/24  md5
```

### 下游备库配置

```ini
# 下游备库的 postgresql.conf
# primary_conninfo 指向级联备库而非主库
primary_conninfo = 'host=cascade-standby-1 port=5432 user=replicator password=secret'

# 可选：指定复制槽
primary_slot_name = 'standby2'

# 启用热备份
hot_standby = on
```

## 详细用法

### 多层级联架构

```
主库 (Primary) - 数据中心A
  |
  +-- 同城级联备库 (Cascade DC-A)
  |     |
  |     +-- 同城只读备库1
  |     +-- 同城只读备库2
  |
  +-- 异地级联备库 (Cascade DC-B)
        |
        +-- 异地只读备库1
        +-- 异地只读备库2
```

```ini
# 主库配置
# postgresql.conf
wal_level = replica
max_wal_senders = 10
wal_keep_size = '2GB'

# pg_hba.conf
host  replication  replicator  10.0.1.0/24  md5  # 同城级联
host  replication  replicator  10.0.2.0/24  md5  # 异地级联
```

```ini
# 同城级联备库配置
# postgresql.conf
hot_standby = on
max_wal_senders = 5
primary_conninfo = 'host=primary port=5432 user=replicator password=secret'
primary_slot_name = 'cascade_dc_a'

# pg_hba.conf
host  replication  replicator  10.0.1.0/24  md5
```

```ini
# 异地级联备库配置
# postgresql.conf
hot_standby = on
max_wal_senders = 5
primary_conninfo = 'host=primary port=5432 user=replicator password=secret'
primary_slot_name = 'cascade_dc_b'

# pg_hba.conf
host  replication  replicator  10.0.2.0/24  md5
```

### 级联复制与复制槽

```sql
-- 在主库上为级联备库创建复制槽
SELECT pg_create_physical_replication_slot('cascade_dc_a');
SELECT pg_create_physical_replication_slot('cascade_dc_b');

-- 在级联备库上为下游备库创建复制槽
-- 注意：级联备库也需要创建复制槽
SELECT pg_create_physical_replication_slot('standby_ro_1');
SELECT pg_create_physical_replication_slot('standby_ro_2');

-- 查看主库的复制状态
SELECT
    pid,
    usename,
    application_name,
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn
FROM pg_stat_replication;

-- 查看级联备库的复制状态
-- 级联备库上也能看到下游备库的连接
SELECT pid, application_name, client_addr, state, sync_state
FROM pg_stat_replication;
```

### 同步复制与级联

```ini
# 主库配置同步复制
# postgresql.conf
synchronous_standby_names = 'FIRST 1 (cascade_dc_a, cascade_dc_b)'

# 注意：同步复制只适用于直连主库的备库
# 下游备库（通过级联备库连接）不参与同步投票
```

```sql
-- 查看同步状态
SELECT
    pid,
    application_name,
    sync_state,
    sync_priority
FROM pg_stat_replication;

-- sync_state 值：
-- 'sync'    : 同步备库
-- 'async'   : 异步备库
-- 'quorum'  : 法定人数备库
-- 'potential': 潜在同步备库
```

## 常见场景

### 报表分流架构

```
主库 (OLTP 读写)
  |
  +-- 级联备库 (报表专用)
        |
        +-- 报表只读备库1 (BI查询)
        +-- 报表只读备库2 (实时分析)
```

```ini
# 报表级联备库配置
# postgresql.conf
hot_standby = on
max_wal_senders = 5
max_standby_streaming_delay = '30s'  # 允许查询与恢复冲突时延迟
wal_receiver_status_interval = '10s'

# 优化报表查询性能
shared_buffers = '4GB'
work_mem = '256MB'
effective_cache_size = '12GB'
```

```sql
-- 应用层路由：将报表查询导向级联备库
-- 使用连接池（如 PgBouncer）实现读写分离

-- 检查备库是否已追上主库
SELECT
    now() - pg_last_xact_replay_timestamp() AS replication_lag;

-- 如果延迟过大，可以拒绝报表查询
SELECT CASE
    WHEN now() - pg_last_xact_replay_timestamp() > interval '5 seconds'
    THEN false
    ELSE true
END AS is_up_to_date;
```

### 灾备切换

```bash
# 当主库故障时，级联备库可以提升为新主库
# 下游备库需要重新指向新主库

# 步骤1：提升级联备库为新主库
pg_ctl -D /data promote

# 步骤2：下游备库修改 primary_conninfo
# 指向新的主库地址

# 步骤3：重启下游备库
pg_ctl -D /data restart

# 或者使用 pg_rewind 回溯
# 如果下游备库已经与旧主库产生了分歧
```

### 延迟备库

```ini
# 延迟备库配置：故意延迟应用 WAL
# 用于恢复误删除数据

# postgresql.conf
# 延迟 1 小时应用 WAL
recovery_min_apply_delay = '1h'

primary_conninfo = 'host=cascade-standby port=5432 user=replicator password=secret'
```

```sql
-- 延迟备库的使用场景
-- 如果在主库上误删除了数据，延迟备库仍然保留着删除前的数据

-- 查看延迟备库的当前时间点
SELECT pg_last_xact_replay_timestamp();

-- 从延迟备库导出误删除的数据
COPY (SELECT * FROM important_table WHERE id IN (...))
TO '/tmp/recovery_data.csv' WITH CSV HEADER;

-- 然后在主库上恢复数据
```

## 注意事项

- **复制延迟叠加**：级联复制中，每一级都会增加复制延迟。下游备库的数据落后于主库的时间等于所有上游的延迟之和。对延迟敏感的应用应直连主库。
- **max_wal_senders 配置**：级联备库需要为下游备库预留足够的 wal_sender 进程。如果下游备库数量超过 max_wal_senders，新的连接将被拒绝。
- **网络带宽**：级联备库需要同时接收和发送 WAL，网络带宽需求较高。在跨数据中心部署时，确保网络带宽充足。
- **故障切换复杂性**：级联架构的故障切换比单层复制更复杂。需要考虑级联备库提升后下游备库的重新指向问题。
- **监控覆盖**：每一级都需要监控复制状态和延迟。只监控主库的 pg_stat_replication 无法发现下游的问题。

## 进阶用法

### 自动化故障切换

```yaml
# Patroni 级联复制配置
# patroni.yml - 级联备库配置
scope: postgres-cluster
name: cascade-standby-1

restapi:
  listen: 0.0.0.0:8008

postgresql:
  data_dir: /var/lib/postgresql/data
  parameters:
    hot_standby: 'on'
    max_wal_senders: 10
    wal_keep_size: '1GB'

  # 级联复制配置
  replication:
    # 指定上游节点
    follow: primary

# 下游备库配置
# patroni.yml - 下游备库
scope: postgres-cluster
name: standby-2

postgresql:
  data_dir: /var/lib/postgresql/data
  parameters:
    hot_standby: 'on'

  replication:
    # 指向级联备库
    follow: cascade-standby-1
```

### 级联复制监控脚本

```sql
-- 创建级联复制监控视图
CREATE OR REPLACE VIEW v_cascade_replication_status AS
WITH upstream AS (
    SELECT
        pid,
        application_name,
        client_addr,
        state,
        sent_lsn,
        replay_lsn,
        pg_wal_lsn_diff(sent_lsn, replay_lsn) AS replay_lag_bytes,
        sync_state
    FROM pg_stat_replication
),
local_status AS (
    SELECT
        pg_is_in_recovery() AS is_standby,
        pg_last_xact_replay_timestamp() AS last_replay,
        now() - pg_last_xact_replay_timestamp() AS replication_delay
)
SELECT
    (SELECT is_standby FROM local_status) AS is_standby,
    (SELECT replication_delay FROM local_status) AS local_delay,
    u.application_name AS downstream_name,
    u.client_addr AS downstream_addr,
    u.state AS downstream_state,
    pg_size_pretty(u.replay_lag_bytes) AS downstream_lag,
    u.sync_state
FROM upstream u;

-- 查询级联复制状态
SELECT * FROM v_cascade_replication_status;
```

### 多活数据中心架构

```
数据中心A                    数据中心B
主库A (读写)                 主库B (读写)
  |                            |
  +-- 级联备库A1              +-- 级联备库B1
  |     |                      |     |
  |     +-- 只读备库A2        |     +-- 只读备库B2
  |                            |
  +--- 双向逻辑复制 -----------+
       (双向数据同步)
```

```sql
-- 双活架构中，级联复制用于本地读取分流
-- 逻辑复制用于跨数据中心的数据同步

-- 数据中心A的级联备库配置
-- postgresql.conf
hot_standby = on
max_wal_senders = 10
primary_conninfo = 'host=primary-a port=5432 user=replicator'

-- 同时配置逻辑复制发布
CREATE PUBLICATION data_center_a FOR TABLE shared_table1, shared_table2;

-- 数据中心B订阅
CREATE SUBSCRIPTION data_center_b_sub
CONNECTION 'host=primary-b port=5432 user=replicator'
PUBLICATION data_center_b;
```
