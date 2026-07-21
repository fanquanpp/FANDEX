---
order: 78
title: 物理备份
module: mysql
category: MySQL
difficulty: advanced
description: 'MySQL物理备份：MySQL Enterprise Backup、Percona XtraBackup的原理、热备份与恢复流程'
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/日志系统
  - mysql/逻辑备份
  - mysql/基于时间点恢复
  - mysql/主从复制
prerequisites:
  - mysql/语法速查
---

## 1. 物理备份概述

物理备份直接复制数据库文件（数据文件、日志文件），速度比逻辑备份快得多。

| 特性   | 物理备份       | 逻辑备份      |
| ------ | -------------- | ------------- |
| 速度   | 快             | 慢            |
| 粒度   | 整库/整表      | 可选表/行     |
| 可读性 | 二进制，不可读 | SQL文本，可读 |
| 跨平台 | 不可以         | 可以          |
| 工具   | XtraBackup/MEB | mysqldump     |

## 2. Percona XtraBackup

### 2.1 全量备份

```bash
# 全量热备份
xtrabackup --backup --target-dir=/backup/full -u root -p

# 准备备份（使备份一致）
xtrabackup --prepare --target-dir=/backup/full

# 恢复
xtrabackup --copy-back --target-dir=/backup/full
chown -R mysql:mysql /var/lib/mysql
systemctl start mysql
```

### 2.2 增量备份

```bash
# 增量备份基于全量
xtrabackup --backup --target-dir=/backup/inc1 \
    --incremental-basedir=/backup/full -u root -p

# 准备增量备份
xtrabackup --prepare --apply-log-only --target-dir=/backup/full
xtrabackup --prepare --target-dir=/backup/full --incremental-dir=/backup/inc1

# 恢复（同全量恢复）
xtrabackup --copy-back --target-dir=/backup/full
```

### 2.3 压缩备份

```bash
xtrabackup --backup --compress --target-dir=/backup/compressed -u root -p

# 解压
xtrabackup --decompress --target-dir=/backup/compressed
```

## 3. MySQL Enterprise Backup

```bash
# 全量备份
mysqlbackup --user=root --password --backup-dir=/backup/full backup

# 增量备份
mysqlbackup --user=root --password --backup-dir=/backup/inc1 \
    --incremental --incremental-base=dir:/backup/full backup

# 恢复
mysqlbackup --datadir=/var/lib/mysql --backup-dir=/backup/full copy-back
```
