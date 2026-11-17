---
order: 590
title: 逻辑备份
module: 'mysql'
category: 数据库
difficulty: intermediate
description: MySQL逻辑备份：mysqldump选项与一致性备份、MySQL Shell util.dumpInstance并行导出、mysqlpump移除与恢复流程
author: fanquanpp
updated: '2026-11-17'
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
util.dumpInstance("/backup/full_dump", {threads: 8, consistent: true})

// 恢复（并行导入；loadIndexes: false 是先导数据后建索引的提速技巧）
util.loadDump("/backup/full_dump", {threads: 8})
```

**完整工具面与工程作业单**（dumpSchemas/exportTable/importTable 全家族、
progressFile 断点续传、T 级迁移的四步作业单、导出校验脚本）见专篇
[MySQL Shell 工具链](/mysql/925-MySQLShellToolkit)；AdminAPI 集群管理同篇，
集群搭建场景见 [InnoDB Cluster](/mysql/630-InnoDBCluster)。

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

## 教学自检（先遮住代码自己写，再对照）

遮码自检法：先只读题干，自己写/自己答，再展开参考答案对照。

1. 写出命令：对 InnoDB 库做一次"不锁表、可重放为备份时点"的逻辑备份，并说出每个参数为什么必须在场。

参考答案（先自己写，再对照）：

```bash
mysqldump --single-transaction --source-data=2 -u root -p mydb > backup.sql
```

`--single-transaction` 开一个 RR 快照事务导出，全库一致性且不锁 InnoDB 表；`--source-data=2` 把 binlog 位点（或 GTID）以注释形式写进备份文件——PITR 的起点坐标，没有它重放 binlog 就不知道从哪开始。注意 8.4 已移除旧名 `--master-data` 与 mysqlpump。

2. 概念自问：逻辑备份恢复"慢"的本质原因是什么？它换来了什么好处？

参考答案（先自己答，再对照）：恢复 = 通过 SQL 接口逐条重放 INSERT + 重建索引，本质是"重新执行一遍业务写入"，速度受 SQL 解析、约束检查、索引维护拖累——大库动辄数小时。换来的是：跨版本/跨平台可移植（SQL 是通用表示）、可挑表挑行、人类可读可改——升级预演、小库迁移、按需导出的首选形态。物理备份反其道而行，两者是 RTO 与灵活性的交换。

3. 判断题：`--single-transaction` 备份期间其他会话执行了 ALTER TABLE，备份的一致性自动保持。

参考答案（先自己答，再对照）：不成立。快照事务保证的是"数据页读取"的一致视图，但 DDL 会改变元数据——MDL 与快照机制拦不住"部分表新结构、部分表旧结构"的混合状态，导出的 SQL 里新旧定义混杂。纪律是：备份窗口内禁止 DDL（这也是"备份自动化要与发布窗口错开"的原因）。

4. 概念自问：为什么"备份文件存在"不等于"备份有效"？验证备份有效性的最小动作是什么？

参考答案（先自己答，再对照）：备份的有效性只有"能恢复出来"这一个判据——文件可能中途损坏、可能缺了 GTID 位点、可能与目标版本不兼容，这些只有真恢复一次才暴露。最小动作：定期在隔离环境用备份文件完整恢复并抽查数据（行数、关键聚合对账），把恢复耗时记录为实测 RTO。"未演练过恢复的备份等于没有备份"是备份体系的铁律。

## 6. 小结

- 初学者要点：InnoDB 备份标准姿势是
  `mysqldump --single-transaction [--source-data=2]`；恢复用 `mysql 库名 < 文件.sql`。
- 进阶注意：8.4 移除了 mysqlpump、`--master-data`、`--compress`；
  中大型库改用 MySQL Shell `util.dumpInstance/loadDump` 并行方案；
  逻辑备份恢复慢，大库与短 RTO 场景应转向物理备份（见物理备份一篇），
  且任何备份策略都必须包含定期的恢复演练。
