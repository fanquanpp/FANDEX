---
order: 82
title: 并行复制
module: mysql
category: MySQL
difficulty: advanced
description: MySQL并行复制：逻辑时钟、写集并行、多线程回放与复制延迟优化
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/进阶查询与多表操作
  - mysql/全局事务标识
  - mysql/组复制
  - mysql/InnoDB集群
prerequisites:
  - mysql/语法速查
---

## 1. 并行复制概述

MySQL 从库默认单线程回放 relay log，高并发写入时容易产生延迟。并行复制允许多线程同时回放事务。

## 2. 并行复制策略

### 2.1 库级并行（MySQL 5.6）

```sql
-- 按数据库并行回放
SET GLOBAL slave_parallel_type = DATABASE;
SET GLOBAL slave_parallel_workers = 4;
-- 不同数据库的事务可以并行回放
-- 单库场景无效果
```

### 2.2 逻辑时钟（MySQL 5.7）

```sql
-- 基于组提交的并行回放
SET GLOBAL slave_parallel_type = LOGICAL_CLOCK;
SET GLOBAL slave_parallel_workers = 4;

-- 同一组提交的事务可以并行回放
-- 主库 binlog_group_commit_sync_delay 影响分组
SET GLOBAL binlog_group_commit_sync_delay = 1000;  -- 1ms延迟增加组大小
SET GLOBAL binlog_group_commit_sync_no_delay_count = 10;
```

### 2.3 写集并行（MySQL 8.0）

```sql
-- 基于写集（writeset）的更细粒度并行
SET GLOBAL transaction_write_set_extraction = XXHASH64;
SET GLOBAL binlog_transaction_dependency_tracking = WRITESET;
SET GLOBAL slave_parallel_workers = 8;

-- 不修改同一行的事务可以并行回放
-- 粒度最细，效果最好
```

## 3. 监控

```sql
-- 查看并行复制状态
SHOW SLAVE STATUS\G
-- Slave_SQL_Running_State: System lock

-- 查看工作线程状态
SELECT * FROM performance_schema.replication_applier_status_by_worker;
```
