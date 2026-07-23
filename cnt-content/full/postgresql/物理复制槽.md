---
order: 73
title: 物理复制槽
module: postgresql
category: PostgreSQL
difficulty: intermediate
description: PostgreSQL物理复制槽：防止WAL清理、复制槽管理、活跃槽与堆积风险
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/流复制
  - postgresql/级联复制
  - postgresql/逻辑解码与输出插件
  - postgresql/增量备份
prerequisites:
  - postgresql/概述与安装配置
---

## 概述

物理复制槽（Physical Replication Slot）是 PostgreSQL 提供的一种机制，确保主库保留足够的 WAL（Write-Ahead Log）日志，直到所有注册的备库都已接收并处理。没有复制槽时，如果备库断开时间过长，主库可能已经清理了备库尚未接收的 WAL，导致备库需要重新做基础备份。复制槽通过跟踪备库的接收进度，自动延迟 WAL 清理，保障复制连续性。但这也带来了 WAL 堆积的风险，需要合理监控和配置。

## 基础概念

**物理复制槽**：一种服务端机制，记录每个备库的 WAL 接收位置（restart_lsn）。主库在清理 WAL 时会检查所有活跃复制槽的位置，确保不会清理备库尚未接收的 WAL。

**restart_lsn**：复制槽记录的 WAL 位置，表示备库需要从此位置重新开始复制。主库不会清理该位置之后的 WAL。

**活跃与非活跃槽**：活跃槽表示备库正在连接并接收 WAL；非活跃槽表示备库已断开，但主库仍保留其所需的 WAL。非活跃槽是 WAL 堆积的主要风险来源。

**max_slot_wal_keep_size**：限制复制槽可保留的 WAL 总大小。超过该限制后，非活跃的复制槽会被标记为失效，允许清理 WAL。

**WAL 堆积风险**：如果备库长时间断开，复制槽会导致 WAL 不断堆积，可能耗尽磁盘空间。这是使用复制槽时最需要关注的问题。

## 快速上手

### 创建与管理复制槽

```sql
-- 创建物理复制槽
SELECT pg_create_physical_replication_slot('standby1');

-- 查看所有复制槽
SELECT
    slot_name,
    slot_type,
    active,
    restart_lsn,
    confirmed_flush_lsn
FROM pg_replication_slots;

-- 删除复制槽
SELECT pg_drop_replication_slot('standby1');
```

### 在备库配置中使用复制槽

```ini
# postgresql.conf 或 recovery.conf
# 备库连接主库时指定复制槽名称
primary_conninfo = 'host=primary port=5432 user=replicator password=secret'
primary_slot_name = 'standby1'
```

### 监控 WAL 堆积

```sql
-- 查看每个复制槽保留的 WAL 量
SELECT
    slot_name,
    slot_type,
    active,
    restart_lsn,
    pg_current_wal_lsn() AS current_lsn,
    pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS retained_bytes
FROM pg_replication_slots;

-- 以人类可读的格式查看
SELECT
    slot_name,
    active,
    pg_size_pretty(
        pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)
    ) AS retained_wal_size
FROM pg_replication_slots;
```

## 详细用法

### 复制槽类型对比

```sql
-- 物理复制槽：用于流复制，保留 WAL
SELECT pg_create_physical_replication_slot('physical_slot');

-- 逻辑复制槽：用于逻辑解码，保留 WAL 并解码为逻辑变更
SELECT pg_create_logical_replication_slot('logical_slot', 'pgoutput');

-- 查看两种类型的槽
SELECT slot_name, slot_type, active, restart_lsn
FROM pg_replication_slots;

-- slot_type 列：
-- 'physical' 表示物理复制槽
-- 'logical' 表示逻辑复制槽
```

### 复制槽与流复制配置

```ini
# 主库配置 (postgresql.conf)
# 最大复制槽数量
max_replication_slots = 10

# WAL 发送进程数（需要大于等于备库数量）
max_wal_senders = 10

# WAL 保留大小（即使没有复制槽也保留的 WAL 量）
wal_keep_size = '1GB'

# 限制复制槽可保留的最大 WAL 量
max_slot_wal_keep_size = '10GB'
```

```ini
# 备库配置 (postgresql.conf)
# 指定主库连接信息
primary_conninfo = 'host=192.168.1.100 port=5432 user=replicator password=secret'

# 指定使用的复制槽
primary_slot_name = 'standby1'

# 启用热备份（备库可执行只读查询）
hot_standby = on
```

### 复制槽状态监控

```sql
-- 详细监控视图
SELECT
    s.slot_name,
    s.slot_type,
    s.active,
    s.active_pid,
    s.restart_lsn,
    s.confirmed_flush_lsn,
    pg_current_wal_lsn() AS current_wal_lsn,
    pg_size_pretty(
        pg_wal_lsn_diff(pg_current_wal_lsn(), s.restart_lsn)
    ) AS lag_size,
    a.state AS replication_state,
    a.sent_lsn,
    a.write_lsn,
    a.flush_lsn,
    a.replay_lsn,
    pg_size_pretty(
        pg_wal_lsn_diff(a.sent_lsn, a.replay_lsn)
    ) AS replay_lag
FROM pg_replication_slots s
LEFT JOIN pg_stat_replication a
    ON s.active_pid = a.pid;
```

### 临时复制槽

```sql
-- 临时复制槽：连接断开时自动删除
-- 适合短期备份操作，不会导致 WAL 堆积
SELECT pg_create_physical_replication_slot('temp_backup', true);

-- 第二个参数 true 表示临时槽
-- 连接断开后自动清理

-- 使用 pg_basebackup 时指定临时复制槽
-- pg_basebackup -h primary -D /data/backup -S temp_backup --slot
```

## 常见场景

### 新备库初始化

```bash
# 使用复制槽创建基础备份
pg_basebackup \
    -h primary_host \
    -U replicator \
    -D /var/lib/postgresql/data \
    -Fp -Xs -P -R \
    -S standby1_slot

# -S 指定复制槽名称
# -R 自动创建 standby.signal 和配置
# 备份完成后备库自动使用该复制槽
```

### 备库故障恢复

```sql
-- 步骤1：检查备库是否断开
SELECT slot_name, active, restart_lsn
FROM pg_replication_slots
WHERE slot_name = 'standby1';

-- 如果 active = false，备库已断开

-- 步骤2：检查 WAL 堆积量
SELECT
    slot_name,
    pg_size_pretty(
        pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)
    ) AS retained_wal
FROM pg_replication_slots
WHERE NOT active;

-- 步骤3：如果 WAL 堆积过多，评估是否需要删除复制槽
-- 删除前确保备库可以重新做基础备份

-- 步骤4：删除复制槽（如果需要）
SELECT pg_drop_replication_slot('standby1');

-- 步骤5：重新创建复制槽并做基础备份
SELECT pg_create_physical_replication_slot('standby1');
```

### WAL 堆积告警

```sql
-- 创建 WAL 堆积监控函数
CREATE OR REPLACE FUNCTION check_replication_lag()
RETURNS TABLE(
    slot_name text,
    is_active boolean,
    retained_wal text,
    wal_files_count int
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.slot_name,
        s.active,
        pg_size_pretty(
            pg_wal_lsn_diff(pg_current_wal_lsn(), s.restart_lsn)
        ) AS retained_wal,
        (SELECT count(*)
         FROM pg_ls_waldir()
         WHERE name ~ '^[0-9A-F]{24}$'
        ) AS wal_files_count
    FROM pg_replication_slots s;
END;
$$ LANGUAGE plpgsql;

-- 执行检查
SELECT * FROM check_replication_lag();
```

## 注意事项

- **WAL 堆积风险**：非活跃的复制槽会导致 WAL 无限堆积，可能耗尽磁盘空间。必须设置 max_slot_wal_keep_size 限制，并监控非活跃槽。
- **max_slot_wal_keep_size**：设置该参数后，当 WAL 保留量超过限制时，非活跃槽会被标记为失效（invalid），允许清理 WAL。失效的槽需要手动删除并重建。
- **复制槽数量限制**：max_replication_slots 限制了最大复制槽数量，默认 10。修改后需要重启数据库。
- **删除槽的时机**：确认备库不再需要后再删除复制槽。删除后，主库会立即清理该槽保留的 WAL，正在断开的备库将无法恢复。
- **临时槽 vs 永久槽**：临时槽在连接断开时自动删除，适合备份操作；永久槽需要手动管理，适合长期运行的备库。

## 进阶用法

### 自动化复制槽管理

```sql
-- 清理失效的复制槽
CREATE OR REPLACE FUNCTION cleanup_invalid_slots()
RETURNS int AS $$
DECLARE
    slot_record RECORD;
    cleaned_count int := 0;
BEGIN
    FOR slot_record IN
        SELECT slot_name
        FROM pg_replication_slots
        WHERE NOT active
    LOOP
        -- 检查槽是否已失效
        IF EXISTS (
            SELECT 1 FROM pg_replication_slots
            WHERE slot_name = slot_record.slot_name
            AND active = false
            AND pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) > 10737418240  -- 10GB
        ) THEN
            PERFORM pg_drop_replication_slot(slot_record.slot_name);
            RAISE NOTICE 'Dropped inactive slot: %', slot_record.slot_name;
            cleaned_count := cleaned_count + 1;
        END IF;
    END LOOP;

    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- 执行清理
SELECT cleanup_invalid_slots();
```

### 复制槽与 pg_rewind 配合

```bash
# 当备库需要回溯到主库的时间线时
# 使用 pg_rewind 重新同步

# 步骤1：停止备库
pg_ctl -D /var/lib/postgresql/data stop

# 步骤2：使用 pg_rewind 同步
pg_rewind \
    --source-server="host=primary port=5432 user=postgres" \
    --target-pgdata=/var/lib/postgresql/data

# 步骤3：启动备库，复制槽自动恢复连接
pg_ctl -D /var/lib/postgresql/data start

# 注意：pg_rewind 需要主库开启 wal_log_hints
# 或在初始化时启用 data checksums
```

### 复制槽高可用方案

```sql
-- 在 Patroni 等高可用方案中，复制槽自动管理
-- Patroni 配置示例 (patroni.yml)

-- scope: postgres-cluster
-- name: node1
-- restapi:
--   listen: 0.0.0.0:8008
-- postgresql:
--   parameters:
--     max_replication_slots: 10
--     max_wal_senders: 10
--   replication:
--     slots:
--       standby1:
--         type: physical
--       standby2:
--         type: physical

-- Patroni 自动管理复制槽：
-- 1. 备库加入时自动创建复制槽
-- 2. 备库移除时自动删除复制槽
-- 3. 主库切换时复制槽自动迁移
```
