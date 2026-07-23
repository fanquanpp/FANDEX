---
order: 79
title: 基于时间点恢复
module: mysql
category: MySQL
difficulty: advanced
description: MySQL基于时间点恢复PITR：全量恢复+binlog重放、时间点定位与误操作恢复
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/逻辑备份
  - mysql/物理备份
  - mysql/主从复制
  - mysql/进阶查询与多表操作
prerequisites:
  - mysql/语法速查
---

## 1. PITR 概述

基于时间点恢复（Point-In-Time Recovery，PITR）将数据库恢复到任意时间点，通过全量备份 + binlog 重放实现。

## 2. 恢复流程

```
1. 恢复全量备份
2. 找到误操作的时间点
3. 重放 binlog 到误操作之前
4. 跳过误操作
5. 继续重放后续 binlog
```

## 3. 操作步骤

### 3.1 恢复全量备份

```bash
# 停止 MySQL
systemctl stop mysql

# 恢复全量备份
xtrabackup --copy-back --target-dir=/backup/full
chown -R mysql:mysql /var/lib/mysql

# 启动 MySQL
systemctl start mysql
```

### 3.2 定位误操作时间

```bash
# 查看 binlog 事件
mysqlbinlog --base64-output=DECODE-ROWS -v mysql-bin.000123 | grep -A5 "DROP TABLE"

# 查看事件时间
mysqlbinlog --start-datetime="2026-06-14 10:00:00" \
            --stop-datetime="2026-06-14 12:00:00" \
            mysql-bin.000123 | head -100
```

### 3.3 重放 binlog

```bash
# 重放到误操作之前
mysqlbinlog --start-datetime="2026-06-14 10:00:00" \
            --stop-datetime="2026-06-14 10:59:59" \
            mysql-bin.000123 | mysql -u root -p

# 跳过误操作，继续重放
mysqlbinlog --start-datetime="2026-06-14 11:01:00" \
            mysql-bin.000123 | mysql -u root -p
```

## 4. 按位置恢复

```bash
# 查看事件位置
mysqlbinlog mysql-bin.000123 | grep -n "DROP TABLE"

# 按位置恢复
mysqlbinlog --start-position=154 --stop-position=1024 \
            mysql-bin.000123 | mysql -u root -p

# 跳过误操作后继续
mysqlbinlog --start-position=2048 \
            mysql-bin.000123 | mysql -u root -p
```

## 5. 最佳实践

```sql
-- 1. 定期全量备份
-- 2. 确保 binlog 开启且完整
-- 3. sync_binlog = 1 确保不丢失 binlog
-- 4. 保留足够长时间的 binlog
-- 5. 测试恢复流程
```
