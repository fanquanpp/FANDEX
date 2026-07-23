---
order: 92
title: 复制与高可用
module: mysql
category: MySQL
difficulty: advanced
description: 'MySQL复制架构：binlog格式、半同步/异步/延迟/组复制、InnoDB Cluster、备份恢复策略'
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/VECTOR向量类型
  - mysql/JSON模式验证与聚合函数
  - mysql/不可见索引
  - mysql/性能调优与安全
prerequisites:
  - mysql/语法速查
---

## 1. 二进制日志 (Binary Log)

### 1.1 Binlog 概述

二进制日志记录所有对数据库进行修改的操作（DDL 和 DML），是 MySQL 复制和数据恢复的基础。Binlog 与 InnoDB 的 redo log 不同：redo log 是引擎级别的物理日志，而 binlog 是 Server 级别的逻辑日志。

```sql
-- 启用二进制日志
-- my.cnf 配置
-- [mysqld]
-- log-bin=mysql-bin
-- binlog_format=ROW
-- server-id=1
-- expire_logs_days=7

-- 查看二进制日志状态
SHOW VARIABLES LIKE 'log_bin%';
SHOW VARIABLES LIKE 'binlog%';

-- 查看当前二进制日志文件列表
SHOW BINARY LOGS;

-- 查看当前正在使用的 binlog 文件
SHOW MASTER STATUS;

-- 查看 binlog 事件内容
SHOW BINLOG EVENTS IN 'mysql-bin.000001';
```

### 1.2 Binlog 格式

| 格式      | 记录内容   | 优点             | 缺点                   |
| :-------- | :--------- | :--------------- | :--------------------- |
| STATEMENT | SQL 语句   | 日志量小         | 非确定性函数结果不一致 |
| ROW       | 行变更数据 | 数据一致性最高   | 日志量大               |
| MIXED     | 自动切换   | 兼顾大小与一致性 | 切换逻辑复杂           |

```sql
-- 设置 binlog 格式
SET GLOBAL binlog_format = 'ROW';     -- 推荐：数据一致性最好
SET GLOBAL binlog_format = 'STATEMENT';
SET GLOBAL binlog_format = 'MIXED';

-- STATEMENT 格式示例
-- binlog 中记录：UPDATE orders SET status='shipped' WHERE id=1;
-- 问题：NOW()、UUID()、USER() 等函数在主从上执行结果不同

-- ROW 格式示例
-- binlog 中记录：
-- ### UPDATE `app_db`.`orders`
-- ### WHERE @1=1 @5='pending'
-- ### SET @5='shipped'
-- 精确记录行变更，无一致性问题

-- 查看当前格式
SHOW VARIABLES LIKE 'binlog_format';
```

### 1.3 Binlog 管理

```sql
-- 手动切换到新的 binlog 文件
FLUSH BINARY LOGS;

-- 设置 binlog 过期时间（秒）
SET GLOBAL binlog_expire_logs_seconds = 604800;  -- 7天

-- 清理过期的 binlog
PURGE BINARY LOGS BEFORE '2024-12-01 00:00:00';
PURGE BINARY LOGS TO 'mysql-bin.000010';  -- 删除指定文件之前的日志

-- 查看 binlog 空间占用
SHOW VARIABLES LIKE 'max_binlog_size';  -- 单个文件最大大小，默认1GB
```

## 2. 异步复制

### 2.1 异步复制架构

异步复制是 MySQL 最基础的复制模式，主库执行事务后立即返回客户端，不等待从库确认接收。

```
主库 (Master)                    从库 (Slave)
    │                                │
    │  1. 事务提交                    │
    │  2. 写入 binlog ──────────────→│ 3. IO线程拉取binlog
    │  4. 返回客户端                  │ 5. 写入relay log
    │                                │ 6. SQL线程执行relay log
    │                                │
```

### 2.2 搭建异步复制

```sql
-- ===== 主库配置 =====
-- my.cnf
-- [mysqld]
-- server-id=1
-- log-bin=mysql-bin
-- binlog_format=ROW
-- binlog_do_db=app_db          -- 可选：只复制指定库

-- 创建复制用户
CREATE USER 'repl'@'%' IDENTIFIED WITH caching_sha2_password BY 'ReplP@ss123!';
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'%';

-- 获取主库状态
SHOW MASTER STATUS;
-- 记录 File 和 Position 值

-- ===== 从库配置 =====
-- my.cnf
-- [mysqld]
-- server-id=2
-- relay-log=relay-bin
-- read_only=ON
-- super_read_only=ON          -- 防止超级用户写入

-- 配置复制源
CHANGE REPLICATION SOURCE TO
    SOURCE_HOST='master-host',
    SOURCE_PORT=3306,
    SOURCE_USER='repl',
    SOURCE_PASSWORD='ReplP@ss123!',
    SOURCE_LOG_FILE='mysql-bin.000001',
    SOURCE_LOG_POS=157,
    GET_SOURCE_PUBLIC_KEY=1;   -- caching_sha2_password 需要

-- 启动复制
START REPLICA;  -- MySQL 8.0+ 使用 START REPLICA（替代 START SLAVE）

-- 查看复制状态
SHOW REPLICA STATUS\G
-- 关键字段：
-- Replica_IO_Running: Yes
-- Replica_SQL_Running: Yes
-- Seconds_Behind_Master: 0
-- Last_Error: (空表示无错误)
```

### 2.3 复制过滤

```sql
-- 主库过滤：只记录指定库的 binlog
-- binlog_do_db=app_db
-- binlog_ignore_db=test_db

-- 从库过滤：只应用指定库的 relay log
CHANGE REPLICATION FILTER
    REPLICATE_DO_DB=(app_db),
    REPLICATE_IGNORE_TABLE=(app_db.temp_data),
    REPLICATE_WILD_DO_TABLE=('app_db.log_%');

-- 注意：基于库的过滤可能引发跨库操作问题
-- 推荐使用 REPLICATE_WILD_DO_TABLE 进行表级别过滤
```

## 3. 半同步复制

### 3.1 半同步复制原理

半同步复制要求主库事务提交后，至少一个从库确认接收到该事务的 binlog 事件后，主库才向客户端返回提交成功。

```sql
-- 安装半同步复制插件（主库）
INSTALL PLUGIN rpl_semi_sync_master SONAME 'semisync_master.so';

-- 安装半同步复制插件（从库）
INSTALL PLUGIN rpl_semi_sync_slave SONAME 'semisync_slave.so';

-- 主库配置
SET GLOBAL rpl_semi_sync_master_enabled = ON;
SET GLOBAL rpl_semi_sync_master_timeout = 5000;  -- 超时5秒降级为异步
SET GLOBAL rpl_semi_sync_master_wait_for_replica_count = 1;  -- 至少1个从库确认

-- 从库配置
SET GLOBAL rpl_semi_sync_slave_enabled = ON;

-- 从库重启复制线程以启用半同步
STOP REPLICA;
START REPLICA;

-- 查看半同步状态
SHOW STATUS LIKE 'Rpl_semi_sync_master%';
-- Rpl_semi_sync_master_clients: 当前半同步从库数
-- Rpl_semi_sync_master_status: ON/OFF
-- Rpl_semi_sync_master_no_tx: 未成功半同步的事务数
-- Rpl_semi_sync_master_yes_tx: 成功半同步的事务数
```

### 3.2 半同步复制等待策略

```sql
-- AFTER_SYNC（默认，推荐）：主库将事务写入binlog后等待从库确认，再提交事务
SET GLOBAL rpl_semi_sync_master_wait_point = 'AFTER_SYNC';
-- 优点：从库确认后才提交，不会丢失已提交事务

-- AFTER_COMMIT：主库先提交事务，再等待从库确认
SET GLOBAL rpl_semi_sync_master_wait_point = 'AFTER_COMMIT';
-- 缺点：主库已提交但从库未收到时，其他会话可能看到"幻影"数据
```

## 4. 延迟复制

### 4.1 延迟复制配置

延迟复制让从库故意落后主库指定时间，用于误操作恢复（如误删数据）和读负载分离。

```sql
-- 配置延迟复制（从库落后主库1小时）
CHANGE REPLICATION SOURCE TO
    SOURCE_DELAY = 3600;  -- 延迟3600秒（1小时）

-- 查看延迟状态
SHOW REPLICA STATUS\G
-- SQL_Delay: 3600
-- SQL_Remaining_Delay: 剩余延迟秒数

-- 临时跳过延迟（紧急情况）
START REPLICA UNTIL SQL_AFTER_MTS_GAPS;  -- 跳过多线程复制间隙
```

### 4.2 延迟复制恢复误操作

```sql
-- 场景：主库误删数据，延迟从库尚未执行该操作
-- 1. 停止延迟从库的 SQL 线程
STOP REPLICA SQL_THREAD;

-- 2. 查看 relay log 定位误操作位置
SHOW RELAYLOG EVENTS IN 'relay-bin.000005';

-- 3. 将从库设为可读写
SET GLOBAL read_only = OFF;
SET GLOBAL super_read_only = OFF;

-- 4. 导出误删的数据
SELECT * FROM important_table WHERE id IN (1, 2, 3)
INTO OUTFILE '/tmp/recovery_data.csv';

-- 5. 恢复到主库
-- 在主库执行：LOAD DATA INFILE '/tmp/recovery_data.csv' ...
```

## 5. 组复制 (Group Replication)

### 5.1 组复制概述

组复制基于 Paxos 协议实现多主一致性，提供自动成员管理、故障检测和自动恢复能力。

```sql
-- 组复制配置（每个节点）
-- my.cnf
-- [mysqld]
-- server-id=1
-- log-bin=mysql-bin
-- binlog_format=ROW
-- gtid_mode=ON
-- enforce_gtid_consistency=ON
-- plugin_load_add='group_replication.so'
-- group_replication_group_name='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
-- group_replication_start_on_boot=OFF
-- group_replication_local_address='node1:33061'
-- group_replication_group_seeds='node1:33061,node2:33061,node3:33061'
-- group_replication_bootstrap_group=OFF  -- 仅引导节点设为ON

-- 单主模式（默认）
SET GLOBAL group_replication_single_primary_mode = ON;

-- 多主模式
SET GLOBAL group_replication_single_primary_mode = OFF;
```

### 5.2 启动组复制

```sql
-- 引导节点（第一个节点）
SET GLOBAL group_replication_bootstrap_group = ON;
START GROUP_REPLICATION;
SET GLOBAL group_replication_bootstrap_group = OFF;

-- 其他节点加入
START GROUP_REPLICATION;

-- 查看组成员
SELECT * FROM performance_schema.replication_group_members;
-- +---------------------------+-------------+-------------+--------------+
-- | MEMBER_HOST               | MEMBER_PORT | MEMBER_STATE | MEMBER_ROLE  |
-- +---------------------------+-------------+-------------+--------------+
-- | node1                     |        3306 | ONLINE      | PRIMARY      |
-- | node2                     |        3306 | ONLINE      | SECONDARY    |
-- | node3                     |        3306 | ONLINE      | SECONDARY    |
-- +---------------------------+-------------+-------------+--------------+

-- 查看当前主节点
SELECT * FROM performance_schema.replication_group_members
WHERE MEMBER_ROLE = 'PRIMARY';
```

### 5.3 组复制监控

```sql
-- 查看组复制状态
SELECT * FROM performance_schema.replication_group_member_stats\G

-- 关键指标
-- COUNT_TRANSACTIONS_IN_QUEUE: 等待冲突检测的事务数
-- COUNT_TRANSACTIONS_CHECKED: 已通过冲突检测的事务数
-- COUNT_CONFLICTS_DETECTED: 冲突事务数
-- COUNT_TRANSACTIONS_REMOTE_APPLYING: 远程事务正在应用数
-- TRANSACTIONS_COMMITTED_ALL_MEMBERS: 已在所有成员提交的GTID集

-- 查看组复制事务详情
SELECT * FROM performance_schema.replication_applier_status;
```

## 6. InnoDB Cluster

### 6.1 InnoDB Cluster 架构

InnoDB Cluster 是 MySQL 官方的高可用解决方案，整合了 Group Replication、MySQL Router 和 MySQL Shell。

```
┌─────────────┐
│ Application  │
└──────┬───────┘
       │
┌──────▼───────┐
│ MySQL Router  │  ← 读写分离、故障自动切换
└──────┬───────┘
       │
┌──────▼──────────────────────────┐
│       InnoDB Cluster            │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐
│  │ Primary  │ │Secondary│ │Secondary│
│  │ (R/W)    │ │ (R/O)   │ │ (R/O)   │
│  └─────────┘ └─────────┘ └─────────┘
│      Group Replication           │
└──────────────────────────────────┘
```

### 6.2 使用 MySQL Shell AdminAPI 管理

```javascript
// MySQL Shell (JavaScript 模式)

// 创建 InnoDB Cluster
var cluster = dba.createCluster('prodCluster', {
  memberWeight: 50, // 故障切换优先级
  expelTimeout: 5, // 驱逐超时（秒）
  autoRejoinTries: 3, // 自动重连尝试次数
  consistency: 'BEFORE_ON_PRIMARY_FAILOVER', // 一致性级别
});

// 添加实例
cluster.addInstance('node2:3306', {
  recoveryMethod: 'clone', // 使用克隆恢复数据
  replicationConsistency: 'EVENTUAL',
});

cluster.addInstance('node3:3306', {
  recoveryMethod: 'incremental', // 增量恢复
});

// 查看集群状态
cluster.status();
// 输出包含每个节点的状态、角色、地址信息

// 集群描述
cluster.describe();

// 设置主节点（手动切换）
cluster.setPrimaryInstance('node2:3306');

// 移除实例
cluster.removeInstance('node3:3306');

// 重新加入实例
cluster.rejoinInstance('node3:3306');
```

### 6.3 MySQL Router 配置

```bash
# 引导 MySQL Router（自动生成配置）
mysqlrouter --bootstrap root@node1:3306 --user=mysqlrouter

# 配置文件自动生成在 /etc/mysqlrouter/mysqlrouter.conf
# 关键配置：
# [routing:read_write]
# bind_address=0.0.0.0
# bind_port=6446           # 读写端口
# destinations=metadata-cache://prodCluster/?role=PRIMARY
# routing_strategy=first-available

# [routing:read_only]
# bind_address=0.0.0.0
# bind_port=6447           # 只读端口
# destinations=metadata-cache://prodCluster/?role=SECONDARY
# routing_strategy=round-robin

# 启动 Router
systemctl start mysqlrouter
```

```sql
-- 应用连接方式
-- 写操作 → Router 6446 端口 → Primary 节点
-- 读操作 → Router 6447 端口 → Secondary 节点（轮询）
```

## 7. InnoDB ClusterSet

### 7.1 ClusterSet 架构

ClusterSet 是跨数据中心的灾备方案，将多个 InnoDB Cluster 组成一个集群集，提供全局高可用和灾难恢复能力。

```
┌─────────────────────────────────────────┐
│            InnoDB ClusterSet            │
│                                         │
│  ┌───────────────────────┐  ┌───────────────────────┐
│  │  Primary Cluster (DC1)│  │ Replica Cluster (DC2) │
│  │  ┌─────┐ ┌─────┐     │  │  ┌─────┐ ┌─────┐     │
│  │  │ P   │ │ S   │     │  │  │ S   │ │ S   │     │
│  │  └─────┘ └─────┘     │  │  └─────┘ └─────┘     │
│  └───────────────────────┘  └───────────────────────┘
│           ↑ 异步复制 ↑                     │
└─────────────────────────────────────────┘
```

### 7.2 ClusterSet 管理

```javascript
// MySQL Shell

// 创建 ClusterSet
var cluster = dba.getCluster();
var cs = cluster.createClusterSet('globalCS');

// 添加副本集群
cs.createReplicaCluster('node4:3306', 'replicaCluster', {
  recoveryMethod: 'clone',
  replicationConsistency: 'EVENTUAL',
});

// 查看 ClusterSet 状态
cs.status();

// 灾难切换（主集群不可用时）
cs.forcePrimaryCluster('replicaCluster');

// 计划内切换
cs.setPrimaryCluster('replicaCluster');
```

## 8. GTID 复制

### 8.1 GTID 概念

GTID（Global Transaction Identifier）为每个事务分配全局唯一标识符，简化复制管理和故障恢复。

```sql
-- GTID 格式：server_uuid:transaction_id
-- 例如：3E11FA47-71CA-11E1-9E33-C80AA9429562:1-5

-- 启用 GTID
-- my.cnf
-- gtid_mode=ON
-- enforce_gtid_consistency=ON

-- 查看已执行的 GTID
SHOW MASTER STATUS;
-- Executed_Gtid_Set: 3E11FA47-71CA-11E1-9E33-C80AA9429562:1-100

-- 基于 GTID 配置复制（无需指定 binlog 文件和位置）
CHANGE REPLICATION SOURCE TO
    SOURCE_HOST='master-host',
    SOURCE_PORT=3306,
    SOURCE_USER='repl',
    SOURCE_PASSWORD='ReplP@ss123!',
    SOURCE_AUTO_POSITION=1;  -- 使用 GTID 自动定位
```

### 8.2 GTID 故障恢复

```sql
-- 注入空事务跳过有问题的 GTID
SET GTID_NEXT='3E11FA47-71CA-11E1-9E33-C80AA9429562:101';
BEGIN;
COMMIT;
SET GTID_NEXT='AUTOMATIC';

-- 重置从库的 GTID 执行位置
RESET MASTER;  -- 危险操作，仅在新从库上使用

-- 查看从库已检索的 GTID
SHOW REPLICA STATUS\G
-- Retrieved_Gtid_Set: 已从主库拉取的 GTID
-- Executed_Gtid_Set: 已执行的 GTID
```

## 9. 备份与恢复

### 9.1 mysqldump 逻辑备份

```bash
# 全库逻辑备份
mysqldump -u root -p --single-transaction --routines --triggers --events \
    --all-databases > full_backup.sql

# 单库备份
mysqldump -u root -p --single-transaction app_db > app_db_backup.sql

# 仅表结构
mysqldump -u root -p --no-data app_db > schema_only.sql

# 仅数据
mysqldump -u root -p --no-create-info app_db > data_only.sql

# 压缩备份
mysqldump -u root -p --single-transaction app_db | gzip > app_db.sql.gz

# 恢复
mysql -u root -p app_db < app_db_backup.sql
gunzip < app_db.sql.gz | mysql -u root -p app_db
```

```sql
-- --single-transaction：使用一致性快照，不锁表（InnoDB 推荐）
-- --routines：包含存储过程和函数
-- --triggers：包含触发器
-- --events：包含事件
-- --set-gtid-purged=OFF：不输出 GTID 信息（用于非 GTID 环境）
-- --where：条件导出
```

### 9.2 mysqlpump 并行逻辑备份

```bash
# 并行备份（MySQL 8.0+）
mysqlpump -u root -p --default-parallelism=4 \
    --single-transaction app_db > app_db_pump.sql

# 按库并行
mysqlpump -u root -p --parallel-schemas=4:app_db \
    --parallel-schemas=2:log_db \
    --single-transaction > multi_db.sql

# 压缩输出
mysqlpump -u root -p --compress-output=LZ4 \
    --single-transaction app_db > app_db.sql.lz4
```

### 9.3 MySQL Enterprise Backup 物理备份

```bash
# 全量物理备份
mysqlbackup --user=root --password --backup-dir=/backup/full \
    backup

# 增量备份
mysqlbackup --user=root --password --backup-dir=/backup/incr \
    --incremental --incremental-base=dir:/backup/full \
    backup

# 恢复
mysqlbackup --backup-dir=/backup/full copy-back
# 恢复前需确保数据目录为空

# 压缩备份
mysqlbackup --user=root --password --backup-dir=/backup/compressed \
    --compress backup
```

### 9.4 基于时间点的恢复 (PITR)

```bash
# 1. 先恢复全量备份
mysql -u root -p < full_backup.sql

# 2. 查看全量备份后的 binlog 文件
head -20 full_backup.sql | grep 'MASTER_DATA'

# 3. 从 binlog 中提取指定时间段的操作
mysqlbinlog --start-datetime="2024-12-01 00:00:00" \
    --stop-datetime="2024-12-01 14:30:00" \
    mysql-bin.000010 mysql-bin.000011 | mysql -u root -p

# 4. 或基于位置提取
mysqlbinlog --start-position=157 --stop-position=1024 \
    mysql-bin.000010 | mysql -u root -p
```

```sql
-- 查看误操作的时间点
SHOW BINLOG EVENTS IN 'mysql-bin.000010'
FROM 157 LIMIT 100;

-- 跳过误操作（基于 GTID）
-- 找到误操作的 GTID 后注入空事务跳过
SET GTID_NEXT='3E11FA47-71CA-11E1-9E33-C80AA9429562:50';
BEGIN;
COMMIT;
SET GTID_NEXT='AUTOMATIC';
```

### 9.5 备份策略建议

| 策略         | 频率 | 工具                                  | 保留周期 |
| :----------- | :--- | :------------------------------------ | :------- |
| 全量逻辑备份 | 每日 | mysqldump                             | 7天      |
| 全量物理备份 | 每周 | MySQL Enterprise Backup               | 4周      |
| 增量物理备份 | 每日 | MySQL Enterprise Backup               | 7天      |
| Binlog 备份  | 实时 | mysqlbinlog --read-from-remote-server | 7天      |
| 延迟从库     | 实时 | 延迟复制                              | 持续运行 |

```sql
-- 自动化备份验证：定期检查备份可恢复性
-- 在测试环境恢复备份并执行校验查询
SELECT COUNT(*) FROM critical_table;
CHECK TABLE critical_table;
```
