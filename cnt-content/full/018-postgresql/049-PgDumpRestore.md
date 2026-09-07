---
order: 490
title: pg_dump 与 pg_restore 语法速查手册
module: 'postgresql'
category: 数据库
difficulty: beginner
description: pg_dump 与 pg_restore 语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related: []
prerequisites: []
---

## pg_dump 基本备份

**基本写法：备份单个数据库**
`pg_dump -U <用户名> -d <数据库名> -f <输出文件>`

```bash
# 备份 mydb 数据库到文件
pg_dump -U postgres -d mydb -f mydb_backup.sql
```

**基本写法：自定义压缩格式备份**
`pg_dump -U <用户名> -Fc -d <数据库名> -f <输出文件>.dump`

```bash
# 使用自定义压缩格式（支持选择性恢复，推荐）
pg_dump -U postgres -Fc -d mydb -f mydb.dump
```

**基本写法：目录格式备份（支持并行）**
`pg_dump -U <用户名> -Fd -d <数据库名> -f <输出目录>`

```bash
# 目录格式（每个表一个文件，支持并行恢复）
pg_dump -U postgres -Fd -d mydb -f mydb_dir/
```

**基本写法：并行备份**
`pg_dump -U <用户名> -Fd -j <并行数> -d <数据库名> -f <输出目录>`

```bash
# 4 个并行进程加速备份
pg_dump -U postgres -Fd -j 4 -d mydb -f mydb_dir/
```

---

## 选择性备份

**基本写法：仅备份指定表**
`pg_dump -U <用户名> -d <库名> -t <表名> [-t <表2>] -f <输出文件>`

```bash
# 仅备份 users 和 orders 表
pg_dump -U postgres -d mydb -t users -t orders -f tables_backup.sql
```

**基本写法：排除指定表**
`pg_dump -U <用户名> -d <库名> -T <表名> -f <输出文件>`

```bash
# 备份除 logs 表外的所有表
pg_dump -U postgres -d mydb -T logs -f mydb_no_logs.sql
```

**基本写法：仅备份数据/仅结构**
`pg_dump -U <用户名> -d <库名> --data-only -f <输出文件>`

```bash
# 仅备份数据（不含结构）
pg_dump -U postgres -d mydb --data-only -f mydb_data.sql
# 仅备份结构（不含数据）
pg_dump -U postgres -d mydb --schema-only -f mydb_schema.sql
```

---

## 全库与模式备份

**基本写法：备份所有数据库**
`pg_dumpall -U <用户名> -f <输出文件>`

```bash
# 备份所有数据库（含角色与表空间定义）
pg_dumpall -U postgres -f all_db_backup.sql
# 仅备份全局对象（角色、表空间）
pg_dumpall -U postgres --globals-only -f globals.sql
```

**基本写法：备份指定模式**
`pg_dump -U <用户名> -d <库名> -n <模式名> -f <输出文件>`

```bash
# 仅备份 business 模式
pg_dump -U postgres -d mydb -n business -f business_schema.sql
```

---

## pg_restore 恢复

**基本写法：从自定义格式恢复**
`pg_restore -U <用户名> -d <数据库名> <备份文件>.dump`

```bash
# 恢复自定义格式备份到指定数据库
pg_restore -U postgres -d mydb mydb.dump
```

**基本写法：从 SQL 文本恢复**
`psql -U <用户名> -d <数据库名> -f <备份文件>.sql`

```bash
# 恢复纯文本 SQL 备份
psql -U postgres -d mydb -f mydb_backup.sql
```

**基本写法：并行恢复**
`pg_restore -U <用户名> -d <库名> -j <并行数> <备份文件>.dump`

```bash
# 4 个并行进程加速恢复
pg_restore -U postgres -d mydb -j 4 mydb.dump
```

**基本写法：仅恢复结构/数据**
`pg_restore -U <用户名> -d <库名> --schema-only <备份文件>.dump`

```bash
# 仅恢复结构
pg_restore -U postgres -d mydb --schema-only mydb.dump
# 仅恢复数据
pg_restore -U postgres -d mydb --data-only mydb.dump
```

---

## 增量备份（17 新特性）

**基本写法：pg_basebackup 增量备份**
`pg_basebackup -U <用户名> -D <目录> -Fp -Xs -P --incremental <基础备份manifest路径>`

```bash
# PostgreSQL 17 増量基础备份
pg_basebackup -U postgres -D /backup/incr -Fp -Xs -P -c fast
```

**基本写法：pg_combinebackup 合并备份**
`pg_combinebackup <基础备份目录> <增量备份目录> -o <合并输出目录>`

```bash
# PostgreSQL 17 合并基础与增量备份
pg_combinebackup /backup/base /backup/incr -o /backup/combined
```

---

## 选项速查

**基本写法：连接选项**
`pg_dump -h <主机> -p <端口> -U <用户> -d <数据库>`

```bash
# 远程数据库备份
pg_dump -h 192.168.1.100 -p 5432 -U admin -d mydb -f remote.sql
```

**基本写法：压缩级别**
`pg_dump -U <用户> -Fc -Z <级别> -d <库名> -f <输出文件>`

```bash
# 指定压缩级别 0-9（9 最高压缩率）
pg_dump -U postgres -Fc -Z 6 -d mydb -f mydb.dump
```
