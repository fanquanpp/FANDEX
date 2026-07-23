---
order: 104
title: 主从复制延迟原因与解决
module: mysql
category: database
difficulty: advanced
description: 'MySQL 主从复制延迟的根因分析：单线程回放、大事务、DDL、网络带宽，以及并行复制、半同步复制等解决方案。'
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/两阶段提交
  - mysql/间隙锁与临键锁解决幻读
  - mysql/分库分表策略
  - 'mysql/JSON类型与JSON-TABLE'
prerequisites:
  - mysql/语法速查
---

## 1. 主从复制架构

### 1.1 复制流程

```
主库 (Master)                        从库 (Slave)
┌──────────────┐                    ┌──────────────┐
│  Client SQL  │                    │  SQL Thread  │
│      ↓       │                    │      ↑       │
│  Binlog Dump │ ──── Binlog ────→  │  Relay Log   │
│  Thread      │     (网络传输)      │  I/O Thread  │
└──────────────┘                    └──────────────┘
```

**三线程模型**（MySQL 5.7+）：

| 线程               | 位置 | 作用                       |
| ------------------ | ---- | -------------------------- |
| Binlog Dump Thread | 主库 | 发送 Binlog 事件给从库     |
| I/O Thread         | 从库 | 接收 Binlog 写入 Relay Log |
| SQL Thread         | 从库 | 回放 Relay Log 中的事件    |

### 1.2 延迟定义

```
延迟 = 主库执行时间 - 从库回放完成时间

监控命令:
SHOW SLAVE STATUS\G
-- Seconds_Behind_Master: 延迟秒数
```

## 2. 延迟根因分析

### 2.1 单线程回放瓶颈

传统从库只有**一个 SQL Thread** 回放事务，主库可以并行写入，从库只能串行回放：

```
主库（并行）:  T1 | T2 | T3 | T4  ← 同时执行
从库（串行）:  T1 → T2 → T3 → T4  ← 逐个回放

如果主库 QPS=10000，从库回放速度 < 10000 → 延迟持续增长
```

### 2.2 大事务

```sql
-- 单条大事务包含百万行修改
BEGIN;
DELETE FROM logs WHERE created_at < '2025-01-01';  -- 500万行
COMMIT;

-- 从库必须完整回放这个事务
-- 回放期间无法回放其他事务 → 延迟飙升
```

### 2.3 DDL 操作

```sql
-- ALTER TABLE 需要拷贝全表数据
ALTER TABLE big_table ADD COLUMN new_col INT;
-- 大表 ALTER 可能耗时数小时
-- 从库回放时阻塞所有其他事务
```

### 2.4 从库硬件差异

| 资源 | 主库     | 从库  | 影响          |
| ---- | -------- | ----- | ------------- |
| CPU  | 32核     | 8核   | 回放速度慢    |
| 磁盘 | NVMe SSD | HDD   | 刷盘慢        |
| 网络 | 10Gbps   | 1Gbps | Binlog 传输慢 |

### 2.5 主从不一致的查询

```sql
-- 从库上执行长查询，阻塞 SQL Thread
-- 从库用于读查询时，长事务可能持有锁
SELECT * FROM big_table WHERE ...;  -- 扫描全表，持锁时间长

-- SQL Thread 等待锁释放 → 延迟
```

## 3. 解决方案

### 3.1 多线程并行复制（MTS）

**库级并行**（MySQL 5.6）：

```sql
-- 按数据库维度并行
SET GLOBAL slave_parallel_type = 'DATABASE';
SET GLOBAL slave_parallel_workers = 8;
```

限制：单库场景无法并行。

**组提交并行**（MySQL 5.7）：

```sql
-- 基于 Binlog Group Commit 的并行
SET GLOBAL slave_parallel_type = 'LOGICAL_CLOCK';
SET GLOBAL slave_parallel_workers = 16;
-- 同一组提交的事务可以并行回放
```

**WRITESET 并行**（MySQL 8.0）：

```sql
-- 基于行修改的依赖关系并行
SET GLOBAL binlog_transaction_dependency_tracking = WRITESET;
SET GLOBAL slave_parallel_workers = 32;
SET Global transaction_write_set_extraction = XXHASH64;
-- 修改不同行的事务可以并行回放
```

| 方案          | 并行度     | 适用场景   |
| ------------- | ---------- | ---------- |
| DATABASE      | 库数量     | 多库业务   |
| LOGICAL_CLOCK | 组提交大小 | 中等并发   |
| WRITESET      | 行级无冲突 | 高并发单库 |

### 3.2 半同步复制

```sql
-- 安装半同步插件
INSTALL PLUGIN rpl_semi_sync_master SONAME 'semisync_master.so';
INSTALL PLUGIN rpl_semi_sync_slave SONAME 'semisync_slave.so';

-- 启用半同步
SET GLOBAL rpl_semi_sync_master_enabled = 1;
SET GLOBAL rpl_semi_sync_slave_enabled = 1;

-- 等待超时（毫秒）
SET GLOBAL rpl_semi_sync_master_timeout = 3000;
```

半同步不直接解决延迟，但保证数据不丢失，从库至少收到 Binlog。

### 3.3 并行复制监控

```sql
-- 查看并行复制状态
SHOW SLAVE STATUS\G

-- 关键指标:
-- Seconds_Behind_Master: 延迟秒数
-- Slave_SQL_Running_State: SQL线程状态
-- Exec_Master_Log_Pos: 已回放位置

-- MySQL 8.0 性能库
SELECT * FROM performance_schema.replication_applier_status_by_worker;
```

### 3.4 大事务拆分

```sql
-- 反模式：单条大事务
DELETE FROM logs WHERE created_at < '2025-01-01';  -- 500万行

-- 正确：分批删除
-- 方案1：LIMIT 分批
DELETE FROM logs WHERE created_at < '2025-01-01' LIMIT 10000;
-- 重复执行直到影响行数为0

-- 方案2：按时间分批
DELETE FROM logs WHERE created_at BETWEEN '2024-01-01' AND '2024-02-01';
DELETE FROM logs WHERE created_at BETWEEN '2024-02-01' AND '2024-03-01';
-- ...

-- 方案3：pt-archiver 工具
pt-archiver --source h=host,D=db,t=logs \
  --where "created_at < '2025-01-01'" \
  --purge --limit 10000 --commit-each
```

### 3.5 从库读流量优化

```sql
-- 1. 使用 READ COMMITTED 减少锁持有时间
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- 2. 避免长事务
SET SESSION innodb_lock_wait_timeout = 5;

-- 3. 使用 pt-query-digest 分析慢查询
-- pt-query-digest slow.log

-- 4. 从库使用 read_only
SET GLOBAL read_only = ON;
SET GLOBAL super_read_only = ON;
```

## 4. 延迟监控与告警

### 4.1 监控指标

```sql
-- 延迟秒数
SHOW SLAVE STATUS\G  -- Seconds_Behind_Master

-- Binlog 位置差异
-- Master_Log_File vs Relay_Master_Log_File
-- Read_Master_Log_Pos vs Exec_Master_Log_Pos

-- MySQL 8.0 延迟直方图
SELECT * FROM performance_schema.replication_connection_status;
```

### 4.2 延迟容忍策略

```
应用层策略：
1. 读写分离时，关键业务读主库
2. 从库延迟超过阈值时，降级读主库
3. 使用 ProxySQL / MaxSQL 自动路由
4. 业务层缓存减少从库读压力
```
