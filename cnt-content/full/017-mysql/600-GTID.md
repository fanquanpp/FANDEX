---
order: 600
title: GTID
module: 'mysql'
category: 数据库
difficulty: advanced
description: MySQL全局事务标识符GTID：格式与生命周期、gtid_mode在线开启、基于GTID的复制与故障切换、8.4 Tagged GTID与运维
author: fanquanpp
updated: '2026-09-12'
related:
  - 'mysql/590-Replication'
  - 'mysql/610-ParallelReplication'
  - 'mysql/620-GroupReplication'
  - 'mysql/640-ReplicationHA'
prerequisites:
  - 'mysql/590-Replication'
---

## 1. GTID 是什么，解决什么问题

GTID（Global Transaction Identifier，全局事务标识符）为每个在主库提交的事务
分配一个**全拓扑唯一**的编号。没有 GTID 时，从库靠"binlog 文件名 + 位点偏移"
定位复制进度——主库切换后位点失去意义，故障切换要人工对齐。有了 GTID，
从库只回答一个问题："**哪些 GTID 我还没执行**"，主从建立复制、故障切换
都变成了自动化操作。

### 1.1 格式

```sql
-- GTID = source_id:transaction_id（source_id 即 server_uuid）
3E11FA47-71CA-11E1-9E33-C80AA9429562:1-5

-- 集合可用逗号与区间缩写：
3E11FA47-...:1-5,27A87BB2-...:1-100:200-300
```

### 1.2 生命周期

事务在主库提交时获得 GTID 并随 binlog 事件传播 → 从库接收后先记入
`Retrieved_Gtid_Set`，回放完成后记入 `Executed_Gtid_Set` → 重复接收已执行过的
GTID 会被自动跳过，这就是"自动定位"的本质。

## 2. 开启 GTID

### 2.1 全新实例（my.cnf）

```ini
[mysqld]
gtid_mode = ON
enforce_gtid_consistency = ON
log_bin = mysql-bin
binlog_format = ROW
server_id = 1
# log_replica_updates 自 8.0 起默认 ON（旧名 log_slave_updates）：
# 从库自己的更新也写 binlog，级联复制与故障切换候选的前提
```

### 2.2 存量实例在线开启（五步法，可回退）

```sql
SET GLOBAL enforce_gtid_consistency = WARN;  -- 1. 先观察：业务是否有不兼容写法
SET GLOBAL enforce_gtid_consistency = ON;    -- 2. 强制 GTID 一致性
SET GLOBAL gtid_mode = OFF_PERMISSIVE;       -- 3. 允许匿名与 GTID 事务共存
SET GLOBAL gtid_mode = ON_PERMISSIVE;        -- 4. 新事务一律带 GTID
SHOW STATUS LIKE 'Ongoing_anonymous_transaction_count';  -- 等待归零
SET GLOBAL gtid_mode = ON;                   -- 5. 正式开启
```

`enforce_gtid_consistency=ON` 禁止的操作包括：`CREATE TABLE ... SELECT`、
事务内使用 `CREATE/DROP TEMPORARY TABLE`、同一事务内同时更新事务表与非事务表——
因为它们无法保证"一个事务对应一个 GTID"。老系统升级前先跑 WARN 观察期。

## 3. 基于 GTID 的复制

```sql
-- 从库建立复制：无需指定 binlog 文件与位点，SOURCE_AUTO_POSITION=1 即自动定位
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = '192.168.1.100',
  SOURCE_PORT = 3306,
  SOURCE_USER = 'repl',
  SOURCE_PASSWORD = 'ReplPass123!',
  SOURCE_AUTO_POSITION = 1;
START REPLICA;

-- 观察进度
SHOW REPLICA STATUS\G
--   Retrieved_Gtid_Set：已从主库拉取的 GTID 集合
--   Executed_Gtid_Set ：已回放完成的 GTID 集合
-- 两者差集就是"在路上"的事务

SELECT @@GLOBAL.gtid_executed;   -- 本机已执行集合
SELECT @@GLOBAL.gtid_purged;     -- 本机 binlog 已被清理、不可再提供的 GTID
```

> 语法注意：`CHANGE MASTER TO ... MASTER_AUTO_POSITION`、`START SLAVE`、
> `SHOW SLAVE STATUS` 是 8.0 的旧拼写，**8.4 起已移除**，一律使用
> SOURCE/REPLICA 新名；`SHOW MASTER STATUS` 同样被 `SHOW BINARY LOG STATUS` 取代。

## 4. GTID 模式下的运维

### 4.1 跳过出错的事务

传统复制的 `sql_replica_skip_counter` 在 GTID 模式下不可用，改用注入空事务：

```sql
STOP REPLICA;
-- 用出错事务自己的 GTID 注入一个空事务"占位"
SET GTID_NEXT = '3E11FA47-71CA-11E1-9E33-C80AA9429562:101';
BEGIN;
COMMIT;
SET GTID_NEXT = AUTOMATIC;
START REPLICA;
```

注意：跳过 = 承认主从不一致并把它固定下来，务必先核对数据再决定。

### 4.2 备份恢复与 gtid_purged

```sql
-- 从备份重建从库：让新库"知道自己拥有哪些历史"
--   mysqldump 导出文件中的 SET @@GLOBAL.gtid_purged 会自动完成；
--   需要手工指定时（且执行前 gtid_executed 必须为空）：
SET GLOBAL gtid_purged = '3E11FA47-71CA-11E1-9E33-C80AA9429562:1-100';
```

### 4.3 重置

```sql
-- 清空所有 binlog 并重置 GTID 历史与全局危险操作
RESET BINARY LOGS AND GTIDS;
-- 旧名 RESET MASTER 是同一操作，8.4 起拼写已移除；
-- 仅限全新/废弃重建场景，生产主库执行等于毁掉所有从库的复制前提
```

## 5. 8.4 Tagged GTID（标签）

8.4 允许给事务附加一个业务标签，GTID 变成 `uuid:tag:number`——
运维可以按标签过滤、跳过某类事务（如批量清理任务）而不影响业务事务：

```sql
-- 会话级：本会话后续事务都带标签（标签最长 33 字符，需 TRANSACTION_GTID_TAG 权限）
SET SESSION gtid_next_tag = 'batch_import';
INSERT INTO sales VALUES (...);
SET SESSION gtid_next = AUTOMATIC;

-- 单事务级
SET TRANSACTION GTID_TAG = 'delete_logs';
DELETE FROM logs WHERE created_at < NOW() - INTERVAL 30 DAY;
```

备份与位点管理可按标签区分处理（`gtid_purged` 等接口支持带标签的集合），
这是 8.4 对大型复制拓扑最实用的运维增强之一。

## 6. GTID 的收益与代价

收益：

- 主从建立复制无需人工找位点，故障切换从"分钟级人工"变成"秒级自动"；
- 事务唯一可追踪，校验主从一致性、搭建级联与多源拓扑都更直观；
- 是组复制（MGR）、InnoDB Cluster 的强制前提。

代价与注意：

- `enforce_gtid_consistency` 限制少数不兼容写法（见 2.2）；
- 所有库都要纳入 GTID 管理后拓扑才能完全自动化；
- 主库上执行过的**所有**事务历史都会成为"是否需要"的判断依据，
  从库合并历史时注意 gtid_executed/gtid_purged 的衔接。

## 7. 常用查询速查

```sql
SELECT @@server_uuid;                                        -- 本机 source_id
SELECT @@GLOBAL.gtid_executed;                               -- 已执行集合
SELECT @@GLOBAL.gtid_purged;                                 -- 已清理集合
SHOW VARIABLES LIKE 'gtid_mode';                             -- 当前模式
SELECT received_transaction_set FROM
  performance_schema.replication_connection_status;          -- 已接收集合
```

## 8. 小结

- 初学者要点：GTID 给事务发"全局身份证"，复制靠"还差哪些 GTID"自动对齐；
  开启必须同时设置 `gtid_mode=ON` 与 `enforce_gtid_consistency=ON`。
- 进阶注意：8.4 移除了 MASTER/SLAVE 拼写与 `RESET MASTER`，
  一律换用 SOURCE/REPLICA 与 `RESET BINARY LOGS AND GTIDS`；
  跳事务用 `GTID_NEXT` 注入空事务；标签 GTID（8.4）让批量运维事务可按业务归类管理。
