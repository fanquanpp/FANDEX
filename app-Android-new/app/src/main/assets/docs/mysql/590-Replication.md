---
order: 590
title: 主从复制
module: 'mysql'
category: 数据库
difficulty: advanced
description: MySQL主从复制：异步复制、半同步复制、全同步复制的原理、配置与切换
author: fanquanpp
updated: '2026-09-12'
related:
  - 'mysql/570-PhysicalBackup'
  - 'mysql/580-PITR'
  - 'mysql/150-AdvancedQueryMultiTableOperation'
prerequisites:
  - 'mysql/160-View'
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
-- 主库创建复制用户（REPLICATION REPLICA 是 8.0.26+ 的标准拼写；
-- 旧名 REPLICATION SLAVE 已废弃，8.4 起一律使用新名最稳妥）
CREATE USER 'repl'@'%' IDENTIFIED BY 'password';
GRANT REPLICATION REPLICA ON *.* TO 'repl'@'%';

-- 从库配置复制源（8.4 语法；旧名 CHANGE MASTER TO 已在 8.4 移除）
CHANGE REPLICATION SOURCE TO
    SOURCE_HOST = 'master-ip',
    SOURCE_USER = 'repl',
    SOURCE_PASSWORD = 'password',
    SOURCE_LOG_FILE = 'mysql-bin.000001',
    SOURCE_LOG_POS = 154;

START REPLICA;
SHOW REPLICA STATUS\G
```

> MySQL 8.0.22 起推荐 GTID 自动定位，省去手工找 binlog 位点：
> `CHANGE REPLICATION SOURCE TO ... SOURCE_AUTO_POSITION = 1`（详见 GTID 一章）。
> 在 8.0 及更早版本中，上述语句的旧写法为 `CHANGE MASTER TO MASTER_HOST=...`，
> 并使用 `START SLAVE` / `SHOW SLAVE STATUS`。

## 3. 半同步复制

半同步复制始终以**插件**形式提供：8.0.26 起插件更名为
`rpl_semi_sync_source` / `rpl_semi_sync_replica`（对应变量与状态项同步改名），
旧的 master/slave 拼写插件已在 8.4 中移除——从 8.0 升级到 8.4 前必须先
UNINSTALL 旧插件，改装新插件。

```sql
-- 两端先安装新插件（8.4 唯一可用的名字）
INSTALL PLUGIN rpl_semi_sync_source SONAME 'semisync_source.so';  -- 主库
INSTALL PLUGIN rpl_semi_sync_replica SONAME 'semisync_replica.so'; -- 从库

-- 主库：启用半同步
SET GLOBAL rpl_semi_sync_source_enabled = ON;
SET GLOBAL rpl_semi_sync_source_timeout = 5000;  -- 5 秒收不到 ACK 则降级为异步

-- 从库：启用半同步 ACK 回应
SET GLOBAL rpl_semi_sync_replica_enabled = ON;
STOP REPLICA IO_THREAD;
START REPLICA IO_THREAD;   -- 重启 IO 线程使 ACK 生效

-- 验证：Rpl_semi_sync_source_status=ON、Rpl_semi_sync_source_yes_tx 持续增长
SHOW STATUS LIKE 'Rpl_semi_sync_source%';
```

注意：半同步等待的是「从库已收到 binlog（写入 relay log）」的 ACK，而不是
「从库已回放完成」，因此它防止主库宕机丢数据，但不能消除复制延迟。

## 4. 复制延迟监控

```sql
-- 查看从库延迟（8.4 语法；旧名 SHOW SLAVE STATUS 已移除）
SHOW REPLICA STATUS\G
-- Seconds_Behind_Source: 0（旧名 Seconds_Behind_Master）
-- 该值为 0 不代表真同步：IO 线程断开或空闲时可能显示 0

-- 使用 pt-heartbeat 更精确监控（毫秒级、不依赖 Seconds_Behind_Source 的缺陷）
pt-heartbeat -D test --update -h master
pt-heartbeat -D test --monitor -h replica
```
## 复制术语（8.4 SOURCE/REPLICA）

**基本写法：查看源库二进制日志状态**
`SHOW BINARY LOG STATUS;`

```sql
-- MySQL 8.4 新语法（替代旧版 SHOW MASTER STATUS）
SHOW BINARY LOG STATUS;
-- 输出: File=mysql-bin.000003, Position=1234, Binlog_Do_DB, Binlog_Ignore_DB
```

**基本写法：查看副本状态**
`SHOW REPLICA STATUS\G`

```sql
-- MySQL 8.4 新语法（替代旧版 SHOW SLAVE STATUS）
SHOW REPLICA STATUS\G
```

**基本写法：查看复制源**
`SHOW REPLICA STATUS FOR CHANNEL '<通道名>'\G`

```sql
-- 查看指定复制通道状态（多源复制）
SHOW REPLICA STATUS FOR CHANNEL 'source_1'\G
```

---

## 副本控制

**基本写法：启动复制**
`START REPLICA [FOR CHANNEL '<通道名>'];`

```sql
-- 启动所有复制线程
START REPLICA;
-- 启动指定通道
START REPLICA FOR CHANNEL 'source_1';
```

**基本写法：停止复制**
`STOP REPLICA [FOR CHANNEL '<通道名>'];`

```sql
-- 停止复制线程
STOP REPLICA;
-- 停止 IO 线程或 SQL 线程
STOP REPLICA IO_THREAD;
STOP REPLICA SQL_THREAD;
```

**基本写法：重置副本**
`RESET REPLICA [ALL] [FOR CHANNEL '<通道名>'];`

```sql
-- 清除副本元数据与中继日志（替换旧 RESET SLAVE）
RESET REPLICA;
-- 彻底删除通道（含元数据）
RESET REPLICA ALL FOR CHANNEL 'source_1';
```

**基本写法：配置复制源**
`CHANGE REPLICATION SOURCE TO SOURCE_HOST='<主机>', SOURCE_PORT=<端口>, SOURCE_USER='<用户>', SOURCE_PASSWORD='<密码>', SOURCE_LOG_FILE='<日志文件>', SOURCE_LOG_POS=<位置>;`

```sql
-- 配置主从复制源（8.4 新语法，替代 CHANGE MASTER TO）
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='192.168.1.100',
  SOURCE_PORT=3306,
  SOURCE_USER='repl',
  SOURCE_PASSWORD='ReplPass123!',
  SOURCE_LOG_FILE='mysql-bin.000003',
  SOURCE_LOG_POS=1234,
  GET_SOURCE_PUBLIC_KEY=1;
```

---

## 二进制日志管理

**基本写法：查看二进制日志列表**
`SHOW BINARY LOGS;`

```sql
-- 查看所有 binlog 文件及大小
SHOW BINARY LOGS;
```

**基本写法：查看 binlog 事件**
`SHOW BINLOG EVENTS [IN '<日志文件>'] [FROM <位置>] [LIMIT <偏移>, <行数>];`

```sql
-- 查看指定 binlog 事件
SHOW BINLOG EVENTS IN 'mysql-bin.000003' FROM 1234 LIMIT 10;
```

**基本写法：查看 binlog 格式**
`SHOW VARIABLES LIKE 'binlog_format';`

```sql
-- 查看 binlog 格式（ROW/STATEMENT/MIXED）
SHOW VARIABLES LIKE 'binlog_format';
```

**基本写法：删除旧 binlog**
`PURGE BINARY LOGS TO '<保留文件>';`

```sql
-- 删除指定文件之前的所有 binlog
PURGE BINARY LOGS TO 'mysql-bin.000010';
```

**基本写法：按时间删除 binlog**
`PURGE BINARY LOGS BEFORE '<日期时间>';`

```sql
-- 删除指定时间之前的 binlog
PURGE BINARY LOGS BEFORE '2024-12-01 00:00:00';
```

**基本写法：自动过期配置**
`SET GLOBAL binlog_expire_logs_seconds = <秒数>;`

```sql
-- 设置 binlog 自动过期（默认 30 天）
SET GLOBAL binlog_expire_logs_seconds = 604800;  -- 7 天
```

---

## binlog 工具

**基本写法：mysqlbinlog 查看日志**
`mysqlbinlog <选项> <日志文件>`

```bash
# 查看二进制日志内容
mysqlbinlog mysql-bin.000003
# 指定时间范围
mysqlbinlog --start-datetime="2024-12-01 00:00:00" --stop-datetime="2024-12-02 00:00:00" mysql-bin.000003
```

**基本写法：mysqlbinlog 重放恢复**
`mysqlbinlog <日志文件> | mysql -u <用户名> -p <数据库名>`

```bash
# 基于位置恢复
mysqlbinlog --start-position=1234 --stop-position=5678 mysql-bin.000003 | mysql -u root -p mydb
```

**基本写法：基于 GTID 恢复**
`mysqlbinlog --exclude-gtids='<GTID集合>' <日志文件>`

```bash
# 排除指定 GTID 事务进行恢复
mysqlbinlog --exclude-gtids='3E11FA47-71CA-11E1-9E33-C80AA9429562:1-5' mysql-bin.000003 | mysql -u root -p
```

---

## 复制过滤

**基本写法：配置复制过滤规则**
`CHANGE REPLICATION FILTER <过滤类型> = (<规则>);`

```sql
-- 仅复制指定库
CHANGE REPLICATION FILTER REPLICATE_DO_DB = (mydb);
-- 排除指定库
CHANGE REPLICATION FILTER REPLICATE_IGNORE_DB = (test, tmp);
-- 仅复制指定表
CHANGE REPLICATION FILTER REPLICATE_DO_TABLE = (mydb.users, mydb.orders);
```
