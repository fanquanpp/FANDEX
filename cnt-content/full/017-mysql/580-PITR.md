---
order: 580
title: 基于时间点恢复 PITR：删库后的最后防线
module: 'mysql'
category: 数据库
difficulty: advanced
description: PITR 完整演练：全量备份加 binlog 重放恢复到任意时刻、GTID 与位点两种定位方式、误操作跳过手法，以及"备份从未演练过等于没备份"的纪律。
author: fanquanpp
updated: '2026-09-18'
related:
  - 'mysql/560-LogicalBackup'
  - 'mysql/570-PhysicalBackup'
  - 'mysql/590-Replication'
  - 'mysql/530-TwoPhaseCommit'
prerequisites:
  - 'mysql/570-PhysicalBackup'
  - 'mysql/490-Binlog'
---

## 前置知识

- 全量备份的两种形态（[物理备份](/mysql/570-PhysicalBackup) 与 [逻辑备份](/mysql/560-LogicalBackup)）——PITR 以全量为起点；
- binlog 的事件模型（[Binlog](/mysql/490-Binlog)）——PITR 的"增量"就是它。

## 场景：上午 10:59 有人删了表

```text
02:00   每日全量备份完成
10:59   开发误执行 DROP TABLE orders（生产环境）
11:00   DBA 介入
```

直接恢复昨晚的全量备份，会丢掉 02:00 之后一整天的正常业务数据——不可接受。**PITR（Point-In-Time Recovery）**的目标是：把数据恢复到 10:58:59（删表前一秒），之后一分钟里的正常业务数据也完好保留。

原理一句话：**全量备份定下基线，binlog 补齐从基线到目标时刻的每一步，跳过误操作那一步**。

```text
恢复 = 全量备份（02:00 状态）
     + 重放 binlog（02:00 → 10:58:59 的所有变更）
     + 跳过 DROP TABLE（10:59:01）
     + 继续重放（10:59:02 → 当前，的正常变更）
```

## 前提条件：灾难点位平时就要埋好

PITR 能不能成功，取决于事故之前是否做对了四件事（出事后无法补救）：

1. **binlog 开启且格式正确**：`log_bin = ON`、`binlog_format = ROW`（ROW 格式重放语义最可靠）；
2. **binlog 完整性**：`sync_binlog = 1` 保证已提交事务的日志落盘，不因宕机丢日志；
3. **保留期覆盖**：`binlog_expire_logs_seconds` 大于备份周期（如每日全备则至少保留 25 小时以上，稳妥做法是 7 天）；
4. **全量备份记录了 binlog 位点**：xtrabackup 的 `xtrabackup_binlog_info`、mysqldump 的 `--master-data`/`--source-data` 都会记录备份对应的日志文件与位置——**没有这个位点，你不知道从哪开始重放**。

## 完整演练：五步恢复法

### 第一步：止血，恢复全量基线

事故后第一动作不是恢复，而是**保护现场**：

```bash
-- 立即让误操作库停止写入（应用切走或锁库），防止后续变更混入恢复过程
FLUSH TABLES WITH READ LOCK;   -- 或直接把应用流量切到备库/下线
```

然后恢复最近一次全量备份（以 xtrabackup 为例）：

```bash
# 预备与恢复（物理备份流程）
xtrabackup --prepare --target-dir=/backup/full_20260614_0200
systemctl stop mysqld
xtrabackup --copy-back --target-dir=/backup/full_20260614_0200
chown -R mysql:mysql /var/lib/mysql
systemctl start mysqld
```

### 第二步：确定起点位点

```bash
# 全量备份记录的 binlog 起点（xtrabackup 生成于备份目录）
cat /backup/full_20260614_0200/xtrabackup_binlog_info
# 输出示例：mysql-bin.000123   1024   <gtid-set>
```

### 第三步：找到误操作的精确位置

```bash
# 用 ROW 格式的可读模式翻找误操作
mysqlbinlog --base64-output=DECODE-ROWS -v \
  /var/lib/mysql/mysql-bin.000123 | grep -B 5 -A 10 "DROP TABLE"

# 记下两样东西：
# 1. 时间戳：#260614 10:59:01 server id 1 ...
# 2. 位点：end_log_pos 4567
```

**优先用位点（position / GTID），不要用时间**。同一秒可能有几十个事务，按时间切割有歧义；位点精确对应单个事件。

### 第四步：跳过误操作重放

```bash
# 段一：从备份位点重放到误操作之前（end_pos=4567 是 DROP 的起始前位置）
mysqlbinlog --start-position=1024 --stop-position=4567 \
  /var/lib/mysql/mysql-bin.000123 | mysql -uroot -p

# 段二：跳过 DROP，从其后继续重放
mysqlbinlog --start-position=4890 \
  /var/lib/mysql/mysql-bin.000123 | mysql -uroot -p

# 若误操作之后还有后续 binlog 文件，依次重放：
mysqlbinlog /var/lib/mysql/mysql-bin.000124 | mysql -uroot -p
```

GTID 环境的等价做法（更精确）：`mysqlbinlog --exclude-gtids=<误操作事务的GTID>` 或在会话里 `SET GTID_NEXT` 注入空事务跳过误操作 GTID。

### 第五步：验证与放行

```sql
-- 数据完整性抽查（行数、关键聚合与业务对账）
SELECT COUNT(*), MAX(created_at) FROM orders;
```

核对无误后才解除只读、切回流量。**每一步都记录时间与操作人**——事故复盘文档的第一手材料。

## 演练纪律：恢复没有彩排过就等于没有备份

行业里反复发生的悲剧：备份天天在做，真出事时发现备份文件损坏、位点缺失、恢复脚本没人看得懂。对策只有一条——**定期全流程演练**：

1. 每季度在隔离环境用真实备份文件走一遍五步法；
2. 演练要含"注入误操作"环节（在演练库故意 DROP，再完整恢复跳过）；
3. 把演练过程固化成 runbook（每步命令、预期输出、耗时），事故时照单执行；
4. 记录实测恢复耗时（RTO）与数据丢失窗口（RPO）——这两个数字是向管理层汇报容灾能力的硬指标，也是[复制高可用](/mysql/640-ReplicationHA)方案设计的数据基础。

## 常见困惑

**"能不能只恢复被删的那张表？"**——binlog 重放是整库语义的，没有官方"只回放某表"开关。变通做法：把 binlog 重放到一台**临时实例**（恢复到误操作后一刻），再从临时实例把误删表数据导回生产——这是最常见的"部分恢复"实践，也解释了为什么演练环境与流程如此重要。

**"备库不是也有数据吗，为什么不用备库？"**——如果 DROP 通过复制同步到了备库（默认会），备库同样被删。备库延迟（[复制延迟](/mysql/650-ReplicationDelayCauseSolution)）反而成了救命稻草：延迟复制的备库（`CHANGE REPLICATION SOURCE TO SOURCE_DELAY=3600`）让误操作晚一小时到达，直接从备库捞回数据。生产环境给核心库配一个延迟从库是性价比极高的保险。

**"恢复期间新来的业务写入怎么办？"**——PITR 恢复到的是"过去某点"，之后的新写入天然冲突。标准流程是恢复到误操作前一刻后，让业务以该状态为基线继续（丢失窗口内业务侧补偿），而不是试图把两个时间线合并。

## 检验清单

- 能画出"全量基线 + binlog 重放 + 跳过误操作"的恢复模型；
- 说出 PITR 的四个平时前提（ROW 格式、sync_binlog=1、保留期、备份位点）；
- 理解为什么用位点/GTID 而不是时间定位误操作；
- 完整跑过（或在演练环境跑过）五步恢复法，并有 runbook；
- 知道延迟从库作为"误操作保险"的配置思路。

## 下一步

PITR 是"事后恢复"，复制是"事前冗余"：进入[主从复制](/mysql/590-Replication)，把单点风险降到设计层面。
