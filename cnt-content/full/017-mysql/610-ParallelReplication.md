---
order: 610
title: 并行复制
module: 'mysql'
category: 数据库
difficulty: advanced
description: MySQL并行复制：从库多线程回放（MTS）、LOGICAL_CLOCK 与 WRITESET 依赖追踪、8.4 命名与配置变化、监控与延迟优化
author: fanquanpp
updated: '2026-09-12'
related:
  - 'mysql/590-Replication'
  - 'mysql/600-GTID'
  - 'mysql/640-ReplicationHA'
  - 'mysql/650-ReplicationDelayCauseSolution'
prerequisites:
  - 'mysql/590-Replication'
---

## 1. 并行复制概述

MySQL 从库默认只有一条 SQL 线程（Applier）串行回放 relay log，而主库可以并行执行写入，
因此「单线程回放」是复制延迟最典型的根因。并行复制（Multi-Threaded Replica，MTS）
允许多个 Worker 线程同时回放**互不冲突**的事务，把回放能力从「单车道」扩展为「多车道」。

版本演进一览：

| 版本      | 并行粒度           | 关键配置                                                        |
| --------- | ------------------ | --------------------------------------------------------------- |
| 5.6       | 库级（DATABASE）   | `slave_parallel_type=DATABASE`                                  |
| 5.7       | 组提交（逻辑时钟） | `LOGICAL_CLOCK` + `binlog_group_commit_sync_delay`              |
| 8.0       | 写集（行级依赖）   | `binlog_transaction_dependency_tracking=WRITESET`               |
| 8.0.27+   | 默认开启 MTS       | `replica_parallel_workers=4` 成为默认值                         |
| 8.4（LTS）| 写集自动启用       | 移除 `binlog_transaction_dependency_tracking` 等deprecated旧配置 |

> 术语注意：8.0.22 起复制术语全面从 SLAVE/MASTER 迁移到 REPLICA/SOURCE；
> 旧变量名 `slave_parallel_workers` 等在 8.4 中已移除，必须使用 `replica_parallel_workers`。

## 2. 并行策略详解

### 2.1 库级并行（5.6，已被淘汰）

```sql
-- 按数据库并行回放：不同数据库的事务可并行
SET GLOBAL replica_parallel_type = 'DATABASE';   -- 8.4 中该选项已被移除
SET GLOBAL replica_parallel_workers = 4;
```

局限：绝大多数业务是单库或单库热点，库级并行几乎无效。8.0.30 起
`replica_parallel_type` 被废弃（仅允许 LOGICAL_CLOCK），并在 8.4 中彻底移除。

### 2.2 逻辑时钟并行（5.7）

主库在 binlog 中记录事务所属的「组提交序号」（logical clock），
同一组提交内的事务在从库可以并行回放：

```sql
-- 从库：开启基于逻辑时钟的并行回放
STOP REPLICA SQL_THREAD;
SET GLOBAL replica_parallel_type = 'LOGICAL_CLOCK';
SET GLOBAL replica_parallel_workers = 8;
START REPLICA SQL_THREAD;

-- 主库：主动增大组提交规模，让「同一批」事务更多，从库并行度更高
-- （代价是主库提交延迟增加，需要权衡）
SET GLOBAL binlog_group_commit_sync_delay = 1000;         -- 延迟 1ms 攒批
SET GLOBAL binlog_group_commit_sync_no_delay_count = 10;  -- 或攒满 10 个事务立即提交
```

局限：并行度受主库组提交大小制约——主库低峰期每次组提交只有一两个事务，
从库照样并行不起来。

### 2.3 写集并行（8.0+，8.4 默认行为）

写集（WriteSet）是事务修改行的哈希集合。只要两个事务修改的行集合不相交，
就判定无冲突，可以在从库并行回放，不再依赖主库的提交时刻：

```sql
-- MySQL 8.0 的写法（8.4 已移除这两个变量）：
-- SET GLOBAL transaction_write_set_extraction = XXHASH64;
-- SET GLOBAL binlog_transaction_dependency_tracking = WRITESET;

-- MySQL 8.4：无需任何开关，服务器总是收集写集，
-- 只要 replica_parallel_workers > 0，就自动按「写集优先、COMMIT_ORDER 兜底」
-- 的依赖关系并行回放
STOP REPLICA SQL_THREAD;
SET GLOBAL replica_parallel_workers = 8;
START REPLICA SQL_THREAD;
```

三个方案的对比：

| 方案           | 并行度来源       | 优点               | 缺点                           |
| -------------- | ---------------- | ------------------ | ------------------------------ |
| DATABASE       | 不同数据库       | 实现简单           | 单库场景完全无效，8.4 已移除   |
| LOGICAL_CLOCK  | 主库组提交批次   | 不需要额外主库开销 | 低峰期组小、并行度受限         |
| WRITESET       | 行级依赖关系     | 单库高并发收益最大 | 需要 ROW 格式 binlog；依赖主库收集写集 |

## 3. 关键配置（8.4 视角）

```ini
# 从库 my.cnf
[mysqld]
# 并行回放线程数（8.0.27+ 默认 4，可按 CPU 调整，通常 8-16）
replica_parallel_workers = 8
# 8.4 中只支持 LOGICAL_CLOCK（保留该行仅示意，可省略）
# 当 replica_parallel_workers = 0 时退回单线程回放（保留 PRESERVE 自动重试行为需配
# replica_parallel_workers>0）
replica_preserve_commit_order = ON   # 保证从库提交顺序与主库一致，外部一致性强
relay_log_recovery = ON
```

`replica_preserve_commit_order = ON` 的意义：并行回放时各 Worker 交错执行事务，
但按主库顺序提交，保证从库上不会观察到「乱序」；这是只读从库对外一致性的关键开关。
代价是提交必须排队，吞吐略降，一般建议开启。

## 4. 监控

```sql
-- 查看复制整体状态（8.4 语法；旧名 SHOW SLAVE STATUS 已移除）
SHOW REPLICA STATUS\G
-- 关键字段：
--   Replica_SQL_Running_State：协调器/Worker 状态
--   Seconds_Behind_Source：延迟秒数（旧名 Seconds_Behind_Master）
--   Retrieved_Gtid_Set / Executed_Gtid_Set：接收与回放进度

-- 每个并行 Worker 的回放情况
SELECT worker_id, last_applied_transaction,
       last_processed_transaction
FROM performance_schema.replication_applier_status_by_worker;

-- 协调器视角：最近分派的事务与依赖判定
SELECT * FROM performance_schema.replication_applier_status_by_coordinator\G
```

延迟是否由「回放慢」导致，可用一对差值快速判断：

```
延迟源 = Read_Master_Log_Pos 与 Exec_Source_Log_Pos 的差距
差距大   → SQL 回放跟不上（优先上并行复制/拆大事务）
差距≈0   → IO 或网络跟不上（查主库 IO、带宽、从库接收线程）
```

## 5. 常见陷阱

1. **并行复制不是万能的**：单个大事务只能由一个 Worker 独占回放，
   并行度再高也会被大事务卡住——根治手段是拆分大事务（见主从延迟文档）。
2. **不要在从库做非只读写入**：会破坏回放依赖并造成主从不一致，
   务必设置 `super_read_only = ON`。
3. **`replica_preserve_commit_order=OFF` 时从库读到乱序数据**：
   读写分离场景下可能出现「刚写入的数据读不到、更早的数据反而先出现」的诡异现象。
4. **升级 8.4 前清理废弃配置**：`binlog_transaction_dependency_tracking`、
   `transaction_write_set_extraction`、`replica_parallel_type=DATABASE`、
   `slave_*` 系列变量在 8.4 会直接导致启动失败或报错。
