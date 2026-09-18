---
order: 490
title: 二进制日志 binlog：复制的血脉与恢复的底气
module: 'mysql'
category: 数据库
difficulty: advanced
description: binlog 全景：与 redo log 的本质分工、三种格式与 ROW 为王的原因、关键参数（sync_binlog/expire）、内部两阶段提交、恢复与清理实战。
author: fanquanpp
updated: '2026-09-18'
related:
  - 'mysql/500-RedoLog'
  - 'mysql/530-TwoPhaseCommit'
  - 'mysql/580-PITR'
  - 'mysql/590-Replication'
prerequisites:
  - 'mysql/410-InnoDBSystemArchitecture'
---

## 前置知识

- InnoDB 体系结构（[InnoDB 系统架构](/mysql/410-InnoDBSystemArchitecture)）——redo log 的层级位置是理解本篇的参照系。

## binlog 是什么：两副面孔，一个本质

二进制日志（binlog）记录**所有修改数据的变更**（DML 与 DDL），是 MySQL 里唯二"必须懂"的日志之一。它同时服务两大场景：

```text
场景一：主从复制     从库拉取主库的 binlog 重放，数据一致（→ 主从复制）
场景二：数据恢复     全量备份 + binlog 重放，恢复到任意时刻（→ PITR）
```

### 与 redo log 的本质分工（高频面试题）

| 特性 | binlog | redo log |
| --- | --- | --- |
| 层级 | Server 层（所有引擎共用） | InnoDB 引擎层私有 |
| 内容 | **逻辑变更**（语句或行变更） | **物理变更**（哪个页哪个字节改了） |
| 写法 | 追加写，写满换新文件 | 循环写，旧内容会被覆盖 |
| 用途 | 复制、时间点恢复、审计 | 崩溃恢复（保证已提交不丢） |

记法：**redo log 是"救自己命的"（宕机重启靠它恢复），binlog 是"往外输出的"（复制与恢复都靠它）**。redo 会循环覆盖，所以需要恢复历史时只有 binlog 可用——这是 PITR 依赖 binlog 的根本原因。

## 三种格式：为什么 ROW 是默认之王

```sql
SET binlog_format = 'ROW';   -- 8.0 起默认；另有 STATEMENT 与 MIXED
```

| 格式 | 记录内容 | 致命短板 |
| --- | --- | --- |
| STATEMENT | 原始 SQL 语句 | 非确定性函数翻车：`NOW()`、`UUID()`、`LIMIT` 无 ORDER BY 在主从上执行结果可能不同——**复制错乱** |
| ROW | 每行的前后镜像 | 日志量大（一条 UPDATE 影响一万行就记一万行变更） |
| MIXED | 自动切换 | 行为难以推理，排障复杂 |

ROW 赢在**确定性**：记录的是"这行数据从 A 变成 B"的事实，重放多少遍结果都一致。日志量大的问题由压缩与合理保留期控制——一致性风险是正确性问题，日志量只是成本问题，正确性永远优先。ROW 还带来一个附带福利：`mysqlbinlog -vv` 能直接看到行级变更明细，审计与排障都受益。

## 关键参数：四个必懂项

```ini
[mysqld]
log_bin = mysql-bin                  # 开启 binlog（只读变量，改配置重启生效）
binlog_format = ROW
sync_binlog = 1                      # 每次提交都 fsync binlog 到磁盘
binlog_expire_logs_seconds = 604800  # 保留 7 天（expire_logs_days 已在 8.4 移除）
max_binlog_size = 1073741824         # 单文件上限 1GB，超过滚动新文件
```

`sync_binlog` 值得单独一分钟：它是 binlog 世界的" durability 旋钮"——

- `1`：每次提交都刷盘，崩溃最多丢一个已提交事务都不丢（配合 `innodb_flush_log_at_trx_commit=1` 即"双一配置"，金融级标配）；
- `0`：交给操作系统，性能最好，宕机可能丢最近一批事务的 binlog；
- `N`：攒 N 个事务刷一次，折中。

**注意联动关系**：`sync_binlog=1` 但 `innodb_flush_log_at_trx_commit=2` 时，redo 可能丢而 binlog 不丢——崩溃恢复靠 redo，会出现"binlog 里有、数据里没有"的分裂。所以要么都求稳（双一），要么明确知道自己在用性能换什么。

## 内部两阶段提交：binlog 与 redo 的一致性

一个事务提交时要在**两个日志**里都留下痕迹，先写谁后写谁都可能崩溃——MySQL 用内部两阶段提交解决（[详解篇](/mysql/530-TwoPhaseCommit)）：

```text
1. Prepare：   redo log 写入并标记 prepared
2. Commit：    binlog 写入，然后把 redo 标记 committed

崩溃恢复的裁决规则：
- redo 是 prepared 且 binlog 里存在该事务 → 提交（binlog 可能已被从库复制）
- redo 是 prepared 且 binlog 里没有       → 回滚
```

裁决逻辑的深意：**以 binlog 为准**——因为 binlog 可能已经流向从库，主库若单方面回滚会造成主从不一致。

## 实战：查看、恢复与清理

```sql
-- 当前正在写入的 binlog 文件与位点
SHOW BINARY LOG STATUS;          -- 8.4 语法；旧名 SHOW MASTER STATUS 已移除
-- 所有 binlog 文件与大小
SHOW BINARY LOGS;
-- 窥看文件内的事件
SHOW BINLOG EVENTS IN 'mysql-bin.000123';
```

```bash
# ROW 格式的可读化：这是排障与 PITR 定位误操作的日常工具
mysqlbinlog --base64-output=DECODE-ROWS -v mysql-bin.000123 | less

# 恢复（时间/位点两种切法，位点更精确）
mysqlbinlog --start-position=154 --stop-position=1024 \
  mysql-bin.000123 | mysql -uroot -p
```

```sql
-- 清理：优先交给自动过期，手动 PURGE 仅应急
SET GLOBAL binlog_expire_logs_seconds = 604800;
PURGE BINARY LOGS BEFORE '2026-09-11 00:00:00';   -- 应急释放磁盘时用
```

**清理的雷区**：`PURGE` 前先确认所有从库已消费到对应位点（`SHOW REPLICA STATUS` 的坐标对比）——删了从库还没拉走的 binlog，复制链路直接断裂。同理，挂着[复制槽](/mysql/590-Replication)或消费端卡住的场景，binlog 会被 MySQL 强制保留（不给 PURGE），磁盘报警时应先查消费端而不是硬删。

## 动手环节：亲眼看见一行变更的日志

```sql
-- 1. 确认 ROW 格式
SHOW VARIABLES LIKE 'binlog_format';
CREATE TABLE blog_demo (id INT PRIMARY KEY, name VARCHAR(20));
FLUSH BINARY LOGS;    -- 滚动新文件，方便观察

-- 2. 制造变更
INSERT INTO blog_demo VALUES (1, 'alice');
UPDATE blog_demo SET name = 'bob' WHERE id = 1;

-- 3. 用 mysqlbinlog 解码（shell 中执行）
-- mysqlbinlog --base64-output=DECODE-ROWS -v /var/lib/mysql/mysql-bin.000002
-- 能看到 INSERT 的行镜像与 UPDATE 的 WHERE（前镜像）/SET（后镜像）结构

-- 4. 验证位点推进
SHOW BINARY LOG STATUS;   -- Position 比操作前变大
```

第 3 步建议认真读一遍完整输出：文件头、GTID/匿名事务、Query 事件、Rows 事件、Xid 提交点——binlog 不再是黑盒，PITR 与复制排障的地基就此打牢。

## 常见困惑

**"为什么我的 binlog 没开？"**——8.0 起默认开启；若 `SHOW VARIABLES LIKE 'log_bin'` 为 OFF，说明用的是老版本或显式关闭了。log_bin 是只读变量，改 my.cnf 后重启。没有 binlog 意味着没有复制、没有 PITR——生产环境这是不可接受状态。

**"binlog 文件暴涨撑爆磁盘怎么办？"**——按顺序查三件事：保留期是否过长（缩短 `binlog_expire_logs_seconds`）；是否有从库/订阅端卡住导致日志被强制保留；`binlog_row_image` 是否可以收敛为 MINIMAL（只记变更列，降低 ROW 日志量）。禁止上来就 PURGE。

**"GTID 是什么，和位点什么关系？"**——GTID 给每个事务一个全局唯一编号，复制与恢复的定位从"文件名+偏移"升级为"事务号"，切换主库时不再需要手工对位点。详见 [GTID](/mysql/600-GTID)，建议复制场景一律启用。

## 检验清单

- 能默写 binlog 与 redo log 的五行对照表，并解释"为什么历史恢复只有 binlog 能做"；
- 能说出 STATEMENT 格式的确定性缺陷与两个实例；
- 理解双一配置与内部两阶段提交的裁决规则；
- 会用 mysqlbinlog 解码 ROW 事件，完成一次位点级恢复；
- 能按三步排查 binlog 磁盘暴涨，并说出 PURGE 前的从库检查。

## 下一步

binlog 是复制与恢复的共同地基：往上走是[主从复制](/mysql/590-Replication)与 [PITR 时间点恢复](/mysql/580-PITR)，往深处是它内部的[两阶段提交](/mysql/530-TwoPhaseCommit)与[重做日志](/mysql/500-RedoLog)的协作。
