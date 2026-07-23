---
order: 73
title: 二进制日志
module: mysql
category: MySQL
difficulty: advanced
description: MySQL二进制日志binlog：格式、配置、用途（复制与恢复）、清理策略与最佳实践
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/死锁检测与处理
  - mysql/分布式事务
  - mysql/重做日志
  - mysql/撤销日志
prerequisites:
  - mysql/语法速查
---

## 1. binlog 概述

二进制日志（Binary Log）记录所有修改数据的 SQL 语句或行变更，主要用于复制和数据恢复。

### 1.1 与 redo log 的区别

| 特性     | binlog               | redo log             |
| -------- | -------------------- | -------------------- |
| 层级     | Server 层            | InnoDB 引擎层        |
| 内容     | 逻辑变更（SQL/行）   | 物理变更（页修改）   |
| 用途     | 复制、恢复           | 崩溃恢复             |
| 追加方式 | 追加写入，不覆盖     | 循环写入，覆盖旧数据 |
| 事务性   | 事务提交时一次性写入 | 事务执行中持续写入   |

## 2. binlog 格式

| 格式      | 说明                         | 优缺点                      |
| --------- | ---------------------------- | --------------------------- |
| STATEMENT | 记录 SQL 语句                | 日志小，但非确定性SQL不安全 |
| ROW       | 记录行变更                   | 数据一致性好，日志大        |
| MIXED     | 默认STATEMENT，不安全时用ROW | 折中方案                    |

```sql
-- 设置格式
SET GLOBAL binlog_format = ROW;

-- 推荐 ROW 格式
-- 数据一致性最可靠
```

## 3. 配置

```sql
-- 开启 binlog
SET GLOBAL log_bin = ON;
SET GLOBAL binlog_format = ROW;
SET GLOBAL binlog_row_image = FULL;  -- 记录完整行
SET GLOBAL sync_binlog = 1;          -- 每次提交同步到磁盘
SET GLOBAL max_binlog_size = 1073741824;  -- 1GB

-- 查看binlog文件
SHOW BINARY LOGS;
SHOW MASTER STATUS;
```

## 4. binlog 与两阶段提交

```
InnoDB 与 binlog 的一致性通过两阶段提交保证：
1. Prepare：写入 redo log，标记为 prepared
2. Commit：写入 binlog，标记 redo log 为 committed

崩溃恢复：
- 有 redo log prepared + 有 binlog → 提交
- 有 redo log prepared + 无 binlog → 回滚
```

## 5. 数据恢复

```bash
# 使用 mysqlbinlog 恢复数据
mysqlbinlog --start-datetime="2026-06-14 10:00:00" \
            --stop-datetime="2026-06-14 11:00:00" \
            mysql-bin.000123 | mysql -u root -p

# 指定位置恢复
mysqlbinlog --start-position=154 --stop-position=1024 \
            mysql-bin.000123 | mysql -u root -p
```

## 6. 清理策略

```sql
-- 按时间清理
PURGE BINARY LOGS BEFORE '2026-06-07 00:00:00';

-- 按文件名清理
PURGE BINARY LOGS TO 'mysql-bin.000120';

-- 自动清理
SET GLOBAL expire_logs_days = 7;  -- MySQL 5.x
SET GLOBAL binlog_expire_logs_seconds = 604800;  -- MySQL 8.0+
```
