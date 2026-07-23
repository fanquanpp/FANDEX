---
order: 83
title: 组复制
module: mysql
category: MySQL
difficulty: advanced
description: 'MySQL组复制Group Replication：单主/多主模式、Paxos协议、故障检测与自动切换'
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/全局事务标识
  - mysql/并行复制
  - mysql/InnoDB集群
  - mysql/分区表
prerequisites:
  - mysql/语法速查
---

## 1. 组复制概述

MySQL Group Replication（MGR）基于 Paxos 协议实现多主一致性复制，提供自动故障检测和切换。

### 1.1 模式

| 模式     | 写入点   | 适用场景   |
| -------- | -------- | ---------- |
| 单主模式 | 仅主节点 | 大多数场景 |
| 多主模式 | 所有节点 | 写分散场景 |

## 2. 配置

```ini
[mysqld]
server-id = 1
gtid-mode = ON
enforce-gtid-consistency = ON
log-bin = mysql-bin
binlog-format = ROW
master-info-repository = TABLE
relay-log-info-repository = TABLE

# 组复制配置
plugin_load_add = 'group_replication.so'
group_replication_group_name = '3E11FA47-71CA-11E1-9E33-C80AA9429562'
group_replication_start_on_boot = OFF
group_replication_local_address = 'node1:33061'
group_replication_group_seeds = 'node1:33061,node2:33061,node3:33061'
group_replication_single_primary_mode = ON
```

## 3. 启动组复制

```sql
-- 首个节点（引导组）
SET SQL_LOG_BIN = 0;
CREATE USER 'repl'@'%' IDENTIFIED BY 'password';
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'%';
SET SQL_LOG_BIN = 1;
CHANGE MASTER TO MASTER_USER='repl', MASTER_PASSWORD='password' FOR CHANNEL 'group_replication_recovery';

SET GLOBAL group_replication_bootstrap_group = ON;
START GROUP_REPLICATION;
SET GLOBAL group_replication_bootstrap_group = OFF;

-- 其他节点加入
START GROUP_REPLICATION;

-- 查看成员
SELECT * FROM performance_schema.replication_group_members;
```

## 4. 故障检测

```sql
-- 自动检测故障节点
-- 多数节点同意后剔除故障节点
-- 单主模式下自动选举新主

-- 查看当前主节点
SELECT * FROM performance_schema.replication_group_members
WHERE MEMBER_ROLE = 'PRIMARY';
```
