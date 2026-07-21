---
order: 77
title: 逻辑备份
module: mysql
category: MySQL
difficulty: intermediate
description: MySQL逻辑备份：mysqldump、mysqlpump的用法、选项、一致性备份与恢复流程
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/撤销日志
  - mysql/日志系统
  - mysql/物理备份
  - mysql/基于时间点恢复
prerequisites:
  - mysql/语法速查
---

## 1. mysqldump

### 1.1 基本用法

```bash
# 备份单个数据库
mysqldump -u root -p mydb > mydb_backup.sql

# 备份多个数据库
mysqldump -u root -p --databases mydb1 mydb2 > multi_db.sql

# 备份所有数据库
mysqldump -u root -p --all-databases > all_db.sql

# 备份单个表
mysqldump -u root -p mydb employees > employees.sql
```

### 1.2 一致性备份

```bash
# InnoDB 一致性备份（推荐）
mysqldump -u root -p --single-transaction mydb > mydb_consistent.sql

# MyISAM 一致性备份（锁表）
mysqldump -u root -p --lock-all-tables mydb > mydb_locked.sql

# 混合引擎
mysqldump -u root -p --single-transaction --master-data=2 mydb > mydb.sql
```

### 1.3 常用选项

```bash
--routines          # 包含存储过程和函数
--triggers          # 包含触发器（默认包含）
--events            # 包含事件
--set-gtid-purged=OFF  # 不包含GTID信息
--quick             # 逐行导出（大表必须）
--compress          # 压缩传输
--where="condition" # 条件导出
```

## 2. mysqlpump

```bash
# MySQL 5.7+ 并行备份工具
mysqlpump -u root -p --default-parallelism=4 mydb > mydb_pump.sql

# 并行备份多个数据库
mysqlpump -u root -p --parallel-schemas=4:mydb1,mydb2 mydb1 mydb2 > backup.sql

# 压缩备份
mysqlpump -u root -p --compress-output=LZ4 mydb > mydb.lz4
```

## 3. 恢复

```bash
# 恢复数据库
mysql -u root -p mydb < mydb_backup.sql

# 恢复前创建数据库
mysql -u root -p -e "CREATE DATABASE mydb"
mysql -u root -p mydb < mydb_backup.sql
```
