---
order: 74
title: 重做日志
module: mysql
category: MySQL
difficulty: advanced
description: 'MySQL InnoDB重做日志redo log：WAL机制、日志缓冲、LSN、崩溃恢复与性能调优'
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/分布式事务
  - mysql/二进制日志
  - mysql/撤销日志
  - mysql/日志系统
prerequisites:
  - mysql/语法速查
---

## 1. redo log 概述

重做日志（Redo Log）是 InnoDB 的 WAL（Write-Ahead Logging）机制，确保事务提交后的数据不丢失。

### 1.1 核心原理

$$
\text{先写日志，再写数据} \implies \text{崩溃后可通过日志恢复}
$$

### 1.2 与 binlog 的两阶段提交

```
1. 写入 redo log（PREPARED 状态）
2. 写入 binlog
3. 提交 redo log（COMMITTED 状态）
```

## 2. 物理结构

```
redo log 由一组固定大小的文件组成（循环写入）：

ib_logfile0  ib_logfile1  ib_logfile2  ib_logfile3
   ↓            ↓            ↓            ↓
[write_pos] ─────────────────────────→ [checkpoint]
   ↑ 已写入区域                                ↑ 已刷盘区域
   ↑                                          ↑ 可覆盖区域
```

```sql
-- 配置 redo log
SET GLOBAL innodb_log_file_size = 1073741824;  -- 1GB
SET GLOBAL innodb_log_files_in_group = 4;      -- 4个文件
SET GLOBAL innodb_log_group_home_dir = './';   -- 存储目录
```

## 3. LSN（Log Sequence Number）

```
LSN 是 redo log 的全局递增序号：
- log_lsn：当前写入位置
- flush_lsn：已刷盘位置
- checkpoint_lsn：已刷盘数据页对应的位置

LSN 关系：
checkpoint_lsn ≤ flush_lsn ≤ log_lsn
```

## 4. 写入流程

```
1. 事务修改数据页
2. 生成 redo log record
3. 写入 log buffer（内存）
4. 根据策略刷盘：
   - innodb_flush_log_at_trx_commit = 0：每秒刷盘
   - innodb_flush_log_at_trx_commit = 1：每次提交刷盘（最安全）
   - innodb_flush_log_at_trx_commit = 2：每次提交写OS缓存，每秒fsync
```

## 5. 崩溃恢复

```
1. 从 checkpoint_lsn 开始扫描 redo log
2. 重做（REDO）：重放所有已提交事务的修改
3. 撤销（UNDO）：回滚所有未提交事务的修改
4. 恢复完成
```

## 6. 性能调优

```sql
-- 增大 log buffer
SET GLOBAL innodb_log_buffer_size = 16777216;  -- 16MB

-- 增大 redo log 文件（减少 checkpoint 频率）
SET GLOBAL innodb_log_file_size = 2147483648;  -- 2GB

-- 控制刷盘策略
SET GLOBAL innodb_flush_log_at_trx_commit = 1;  -- 最安全
-- 设为 2 可提升性能，但可能丢失1秒数据
```
