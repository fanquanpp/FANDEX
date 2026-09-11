---
order: 560
title: 逻辑备份
module: 'mysql'
category: 数据库
difficulty: intermediate
description: MySQL逻辑备份：mysqldump选项与一致性备份、MySQL Shell util.dumpInstance并行导出、mysqlpump移除与恢复流程
author: fanquanpp
updated: '2026-09-12'
related:
  - 'mysql/490-Binlog'
  - 'mysql/550-LogSystem'
  - 'mysql/570-PhysicalBackup'
  - 'mysql/580-PITR'
prerequisites:
  - 'mysql/490-Binlog'
---

## 1. 什么是逻辑备份

逻辑备份把数据库导出为**可读的结构与数据描述**（通常是 SQL 文本或带格式的数据文件），
恢复时重新执行这些语句重建数据。与物理备份（直接拷贝数据文件）相比：

| 维度     | 逻辑备份                       | 物理备份                   |
| -------- | ------------------------------ | -------------------------- |
| 产物     | SQL 文本 / 结构化数据文件      | 数据文件原样拷贝           |
| 速度     | 慢（要解析、生成、重放语句）   | 快（直接复制文件）         |
| 粒度     | 实例/库/表/行，最灵活          | 实例或表空间               |
| 跨版本   | 可跨版本（导入新版本重建）     | 一般要求同版本或向上升级   |
| 可读性   | 人可读可编辑                   | 二进制不可读               |
| 典型工具 | mysqldump、MySQL Shell 导出    | XtraBackup、MEB、Clone 插件 |

经验法则：**小中型库（几十 GB 以内）、跨版本迁移、需要挑表挑数据 → 逻辑备份；
大库、要求快速恢复（RTO 短）→ 物理备份**。两者常组合使用。

## 2. mysqldump：经典单线程导出

### 2.1 基本用法

```bash
# 备份单个数据库
mysqldump -u root -p mydb > mydb_backup.sql

# 备份多个数据库（--databases 会带 CREATE DATABASE 语句）
mysqldump -u root -p --databases mydb1 mydb2 > multi_db.sql

# 备份整个实例
mysqldump -u root -p --all-databases --single-transaction > all_db.sql

# 只备份一张表；表结构 / 数据分别导出
mysqldump -u root -p mydb employees > employees.sql
mysqldump -u root -p --no-data mydb > schema_only.sql      # 仅表结构
mysqldump -u root -p --no-create-info mydb > data_only.sql # 仅数据
```

### 2.2 一致性备份（核心选项）

```bash
# InnoDB 表：一致性快照备份，不锁表（绝大多数场景的标准答案）
#   原理：开启一个 RR 事务做一致性读，业务读写照常
mysqldump -u root -p --single-transaction mydb > mydb_consistent.sql

# 记录备份时的 binlog 位点，供 PITR 衔接（写入 SQL 注释中，--source-data=2）
#   8.4 起只认 --source-data；旧选项 --master-data 已随 8.4 移除
mysqldump -u root -p --single-transaction --source-data=2 mydb > mydb.sql

# MyISAM 等非事务引擎只能锁表保证一致（业务会阻塞）
mysqldump -u root -p --lock-all-tables mydb > mydb_locked.sql
```

GTID 环境注意：向已含数据的实例导入时，常需要 `--set-gtid-purged=OFF`
避免导入语句携带 GTID 执行历史；用于搭建新从库时则按官方流程保留并正确设置。

### 2.3 常用选项速查

```bash
--routines              # 包含存储过程与函数
--triggers              # 包含触发器（默认已包含）
--events                # 包含事件（定时任务）
--set-gtid-purged=OFF   # 不输出 GTID 信息（导入普通实例时常用）
--single-transaction    # InnoDB 一致性不锁表备份
--where="status=1"      # 条件导出（只对单表备份有效）
--max-allowed-packet=*  # 与超长行/大 BLOB 相关的报错时可调
--set-gtid-purged / --source-data 与复制相关，见上文
```

> 选项变更提示：`--compress`（协议层压缩）已在 8.0.18 废弃并于 8.4 移除，
> 需要压缩改用管道：`mysqldump ... | gzip > dump.sql.gz`。

## 3. MySQL Shell 导出工具：当前推荐的并行方案

单线程 mysqldump 面对大库（上百 GB）导出与恢复都太慢。Oracle 当前的推荐
是 **MySQL Shell** 的 `util` 工具族——多线程、压缩、支持断点与直接加载：

```javascript
// 安装独立的 MySQL Shell（mysqlsh），连接目标实例
mysqlsh root@localhost:3306

// 整实例并行导出（多线程、默认 zstd 压缩，产出目录而非单文件）
util.exportTable("mydb.employees", "/backup/employees.tsv")   // 单表，可 CSV/TSV
util.dumpSchemas(["mydb", "report"], "/backup/schemas_dump")  // 库级
util.dumpInstance("/backup/full_dump")                        // 实例级

// 常用参数
util.dumpInstance("/backup/full_dump", {
  threads: 8,                    // 并行线程数
  consistent: true,              // 一致性快照（默认 true）
  ddlOnly: false,
  dataOnly: false
})

// 恢复（并行导入，速度远快于 source 单线程回放）
util.loadDump("/backup/full_dump", {threads: 8})
util.loadDump("/backup/full_dump", {loadIndexes: false})  // 先导数据后建索引的提速技巧
```

工具选择建议（2026 视角）：

| 工具                | 状态                       | 适用                                |
| ------------------- | -------------------------- | ----------------------------------- |
| mysqldump           | 持续维护，单线程           | 小库、需要纯 SQL 文本、简单迁移     |
| MySQL Shell dump    | 官方当前推荐，多线程       | 中大型库备份/恢复、迁入对象存储     |
| mysqlpump           | **8.4 起已移除**           | 不再可用；老教程请不要再引用        |

mysqlpump（5.7 引入的并行导出器）在 8.0 已废弃并于 **8.4 被移除**，
功能由 MySQL Shell 的 dump/load 工具取代。若维护老文档，遇到
`mysqlpump --default-parallelism` 这类命令应整体替换为 `util.dumpInstance`。

## 4. 恢复流程

```bash
# 方式一：mysql 客户端回放 SQL（小库最常用）
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS mydb"
mysql -u root -p mydb < mydb_backup.sql

# 压缩备份的恢复
gunzip < mydb_backup.sql.gz | mysql -u root -p mydb

# 方式二：MySQL Shell 并行恢复（大库）
#   在 mysqlsh 中执行 util.loadDump(...)，见上一节
```

恢复注意事项：

1. 恢复期间通常要临时关闭 binlog（`SET sql_log_bin=0`）与外键检查等，
   以显著提速——但要清楚这会使恢复操作本身不进 binlog；
2. 大文件回放慢是正常的：逐条执行 INSERT 的逻辑恢复本质是"重放业务"，
   这正是大库选择物理备份的原因；
3. **备份可用性以"演练恢复"为准**：未验证过恢复流程的备份等于没有备份。

## 5. 一致性级别对比

| 备份方式                                | 业务影响         | 一致性来源           |
| --------------------------------------- | ---------------- | -------------------- |
| mysqldump --single-transaction          | 低（长查询压力） | RR 快照事务          |
| mysqldump（默认，无事务选项）           | 会锁表           | FLUSH TABLES / 锁    |
| util.dumpInstance(consistent: true)     | 低               | 快照 + 位点记录      |
| 从库上备份                              | 最低             | 从库延迟需为 0       |

补充：`--single-transaction` 备份期间如果混有 DDL（其他会话执行 ALTER），
同一库内"部分表新版本、部分表旧版本"的不一致仍可能出现——
备份窗口内避免 DDL 是逻辑备份的通用纪律。

## 6. 小结

- 初学者要点：InnoDB 备份标准姿势是
  `mysqldump --single-transaction [--source-data=2]`；恢复用 `mysql 库名 < 文件.sql`。
- 进阶注意：8.4 移除了 mysqlpump、`--master-data`、`--compress`；
  中大型库改用 MySQL Shell `util.dumpInstance/loadDump` 并行方案；
  逻辑备份恢复慢，大库与短 RTO 场景应转向物理备份（见物理备份一篇），
  且任何备份策略都必须包含定期的恢复演练。
