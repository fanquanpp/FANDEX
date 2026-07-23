---
order: 80
title: 主从复制
module: mysql
category: MySQL
difficulty: advanced
description: MySQL主从复制：异步复制、半同步复制、全同步复制的原理、配置与切换
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/物理备份
  - mysql/基于时间点恢复
  - mysql/进阶查询与多表操作
  - mysql/全局事务标识
prerequisites:
  - mysql/语法速查
---

## 1. 复制概述

MySQL 复制基于 binlog，将主库的变更同步到从库。

### 1.1 复制模式

| 模式       | 主库等待            | 数据安全 | 性能 |
| ---------- | ------------------- | -------- | ---- |
| 异步复制   | 不等待从库          | 可能丢失 | 最高 |
| 半同步复制 | 等待至少1个从库确认 | 较安全   | 中等 |
| 全同步复制 | 等待所有从库确认    | 最安全   | 最低 |

## 2. 异步复制

### 2.1 原理

```
主库 → binlog → 从库 IO线程 → relay log → 从库 SQL线程 → 从库数据
```

### 2.2 配置

```ini
# 主库 my.cnf
[mysqld]
server-id = 1
log-bin = mysql-bin
binlog-format = ROW

# 从库 my.cnf
[mysqld]
server-id = 2
relay-log = relay-bin
read-only = ON
```

```sql
-- 主库创建复制用户
CREATE USER 'repl'@'%' IDENTIFIED BY 'password';
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'%';

-- 从库配置
CHANGE MASTER TO
    MASTER_HOST = 'master-ip',
    MASTER_USER = 'repl',
    MASTER_PASSWORD = 'password',
    MASTER_LOG_FILE = 'mysql-bin.000001',
    MASTER_LOG_POS = 154;

START SLAVE;
SHOW SLAVE STATUS\G
```

## 3. 半同步复制

```sql
-- 主库安装插件
INSTALL PLUGIN rpl_semi_sync_master SONAME 'semisync_master.so';
SET GLOBAL rpl_semi_sync_master_enabled = ON;
SET GLOBAL rpl_semi_sync_master_timeout = 5000;  -- 5秒超时降级为异步

-- 从库安装插件
INSTALL PLUGIN rpl_semi_sync_slave SONAME 'semisync_slave.so';
SET GLOBAL rpl_semi_sync_slave_enabled = ON;
STOP SLAVE IO_THREAD; START SLAVE IO_THREAD;
```

## 4. 复制延迟监控

```sql
-- 查看从库延迟
SHOW SLAVE STATUS\G
-- Seconds_Behind_Master: 0

-- 使用 pt-heartbeat 更精确监控
pt-heartbeat -D test --update -h master
pt-heartbeat -D test --monitor -h slave
```
