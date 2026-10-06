---
order: 670
title: 复制与高可用：总览与选型决策地图
module: 'mysql'
category: 数据库
difficulty: advanced
description: 复制族全景总览——binlog/异步/半同步/延迟复制/MGR/InnoDB Cluster/ClusterSet/GTID 的分工、数据安全语义与选型决策地图，逐篇指向专篇；延迟复制与误操作恢复为本篇保留的独有专题。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'mysql/590-Replication'
  - 'mysql/620-GroupReplication'
  - 'mysql/630-InnoDBCluster'
  - 'mysql/650-ReplicationDelayCauseSolution'
prerequisites:
  - 'mysql/490-Binlog'
---

## 知识点地图

- **知识类别**：复制与高可用的「总览与选型层」——MySQL 高可用家族的全部方案（异步/半同步/延迟复制、组复制 MGR、InnoDB Cluster、ClusterSet、GTID）各自解决什么、数据安全语义差在哪、什么场景选谁。本篇是决策地图：**实现细节归各专篇，本篇管「怎么选」**。
- **解决什么问题**：业务要「主库挂了自动切」（MGR/Cluster）还是「能接受人工切」（异步+脚本）；「绝不丢已提交事务」（半同步/MGR）还是「容忍秒级丢失换性能」（异步）；「误删了数据要捞回来」（延迟副本）；「跨机房容灾」（ClusterSet）——每个问题族都有对应方案与代价。
- **什么时候用到**：架构评审与容量规划时选型；接手陌生环境时快速定位「这套复制是什么档位」；出故障时按本篇的分界判断该翻哪篇专篇。

## 复制族全景：一张表看清分工

| 方案 | 数据安全语义 | 切换形态 | 一句话定位 | 专篇 |
| --- | --- | --- | --- | --- |
| 异步复制 | 主提交即返回，可能丢最后一段 | 人工为主 | 基础形态：读写分离与副本的地基 | [主从复制](/mysql/590-Replication) |
| 半同步复制 | 至少一个副本收到 binlog 才返回 | 人工为主 | 「少丢」档：超时退化回异步 | [主从复制](/mysql/590-Replication) |
| 延迟复制 | 故意落后 N 秒 | 不参与切换 | 误操作恢复的「时间机器」 | 本篇独有专题（见下） |
| 组复制 MGR | 多数派 Paxos：提交需过半确认 | 自动选主、防脑裂 | 数据不出错的一致性内核 | [MGR 组复制](/mysql/620-GroupReplication) |
| InnoDB Cluster | MGR + Router + Shell | 自动切换、应用透明 | 官方打包的高可用方案 | [InnoDB Cluster](/mysql/630-InnoDBCluster) |
| ClusterSet | 异步串接多套 Cluster | 区域级强制切换 | 机房级容灾（有 RPO 窗口） | [InnoDB Cluster](/mysql/630-InnoDBCluster) 的 ClusterSet 节 |
| GTID | 事务全局身份 | 不改变安全语义 | 让切换/搭建/对账可脚本化 | [GTID](/mysql/600-GTID) |

层级关系一句话：**binlog 是地基（一切复制的运输载体），异步/半同步是传输层（语义差在「何时算成功」），MGR 是一致性内核，Cluster/ClusterSet 是打包产品，GTID 是让整套东西可脚本化的坐标系统**。

## 选型决策地图

按业务的真实约束走这四问：

**第一问：主库挂了，允许多人介入吗？**
- 允许（有 DBA 值守、分钟级 RTO 可接受）→ 异步/半同步 + 切换脚本，成本低、结构简单（[主从复制](/mysql/590-Replication)）。
- 不允许（服务不能停超过几十秒）→ InnoDB Cluster：MGR 自动选主 + Router 流量自动改向，应用零改动（[InnoDB Cluster](/mysql/630-InnoDBCluster)）。

**第二问：已提交事务能丢吗？**
- 一秒级丢失可容忍（日志类、统计类）→ 异步复制够用。
- 已提交必须到达至少一个副本 → 半同步（注意它的退化陷阱：rpl_semi_sync_master_timeout 到点后退化为异步，见 [主从复制](/mysql/590-Replication)）或 MGR（多数派确认，强得多但写入延迟与节点数挂钩）。

**第三问：怕误操作（删库）吗？**
- 怕 → 追加一台延迟副本（本篇独有专题），给「捞回误删数据」留一小时缓冲。
- 不怕（有完备的备份 + binlog 恢复演练）→ 靠 [备份恢复](/mysql/560-LogicalBackup) 体系。

**第四问：要跨机房容灾吗？**
- 同机房高可用 → InnoDB Cluster 一套即可。
- 机房级故障（断电/区域云故障）→ ClusterSet：主集群 + 异步副本集群，强制切换有数据丢失窗口需人工确认 RPO。

补充两条横向纪律：其一，**节点数按「能坏几台」倒推**——多数派语义下三节点容忍一台故障、五节点容忍两台（[MGR 组复制](/mysql/620-GroupReplication) 的 Paxos 语义）；其二，**GTID 尽早开**——无论选哪条路线，GTID 都让搭建、切换、对账从「对文件名和位点」变成「对事务号」（[GTID](/mysql/600-GTID)）。

## 各方案 30 秒速览

**binlog（地基）**：Server 层逻辑日志，一切复制的运输载体；ROW 格式是默认之王（一致性最好）；与 redo log 的分工（物理 vs 逻辑、引擎层 vs Server 层）见 [Binlog](/mysql/490-Binlog)。

**异步复制**：主库提交不等副本，IO/SQL 线程两段式搬运；读写分离与副本扩容的地基；延迟监控与 SOURCE/REPLICA 术语见 [主从复制](/mysql/590-Replication)，延迟的成因与治理见 [复制延迟](/mysql/650-ReplicationDelayCauseSolution)。

**半同步复制**：提交时等一个 ACK，超时退化异步的「有损保险」；AFTER_SYNC（8.0 默认，lossless）与 AFTER_COMMIT 的语义差见 [主从复制](/mysql/590-Replication)。

**组复制 MGR**：Paxos 多数派提交、自动选主、防脑裂（宁可只读不可脑裂）；单主模式是主流用法；原理与配额见 [MGR 组复制](/mysql/620-GroupReplication)。

**InnoDB Cluster / ClusterSet**：MGR + Router + Shell 的打包产品；搭建、切换真实行为、巡检见 [InnoDB Cluster](/mysql/630-InnoDBCluster) 与 [MySQL Shell 工具链](/mysql/925-MySQLShellToolkit)。

**GTID**：`source_uuid:transaction_id` 的事务身份证；切换与故障转移的脚本化基础；开启条件与运维细节见 [GTID](/mysql/600-GTID)。

## 延迟复制：时间机器（本篇独有专题）

### 4.1 延迟复制配置

延迟复制让从库故意落后主库指定时间，用于误操作恢复（如误删数据）和读负载分离。

```sql
-- 配置延迟复制（从库落后主库1小时）
CHANGE REPLICATION SOURCE TO
    SOURCE_DELAY = 3600;  -- 延迟3600秒（1小时）

-- 查看延迟状态
SHOW REPLICA STATUS\G
-- SQL_Delay: 3600
-- SQL_Remaining_Delay: 剩余延迟秒数

-- 临时跳过延迟（紧急情况）
START REPLICA UNTIL SQL_AFTER_MTS_GAPS;  -- 跳过多线程复制间隙
```

### 4.2 延迟复制恢复误操作

```sql
-- 场景：主库误删数据，延迟从库尚未执行该操作
-- 1. 停止延迟从库的 SQL 线程
STOP REPLICA SQL_THREAD;

-- 2. 查看 relay log 定位误操作位置
SHOW RELAYLOG EVENTS IN 'relay-bin.000005';

-- 3. 将从库设为可读写
SET GLOBAL read_only = OFF;
SET GLOBAL super_read_only = OFF;

-- 4. 导出误删的数据
SELECT * FROM important_table WHERE id IN (1, 2, 3)
INTO OUTFILE '/tmp/recovery_data.csv';

-- 5. 恢复到主库
-- 在主库执行：LOAD DATA INFILE '/tmp/recovery_data.csv' ...
```

## 动手实践

练习一（选型演练）：给三个业务各选一条高可用路线并写出理由——(a) 内部 BI 报表库，主库挂了两小时内恢复可接受；(b) 电商订单库，RTO < 60 秒、已提交订单不可丢；(c) SaaS 多租户库，要防机房断电也要防开发手滑删数据。

提示：对照四问决策地图——(a) 看 RTO 宽松；(b) 自动切换 + 不丢；(c) 机房级容灾 + 误操作恢复是两个独立需求。

<details>
<summary>参考实现</summary>

- (a) **异步复制 + 切换脚本**：RTO 宽松意味着不值得为自动切换付 MGR 的复杂度；一台从库做读写分离 + 半同步可选（报表库连「少丢」都未必需要）。
- (b) **InnoDB Cluster（三节点）+ GTID**：自动选主满足 RTO；多数派提交满足「已提交不丢」；GTID 让切换与对账可脚本化。Router 让应用无感。
- (c) **ClusterSet（主集群 + 异地副本集群）+ 延迟副本**：机房容灾靠 ClusterSet 的副本集群（注意异步意味着 RPO 有窗口，切换要人工确认）；「防手滑」是另一个需求——在主集群内加一台延迟 1 小时副本，或严格执行备份 + 恢复演练。一题双需求正好演示「容灾」与「误操作恢复」是两条独立防线。
</details>

练习二（状态速读）：`SHOW REPLICA STATUS\G` 的输出里挑出五个字段，分别回答「复制通不通、慢不慢、落后多少、错在哪」，并说明延迟副本的输出与普通副本多看哪两个字段。

提示：Replica_IO_Running/Replica_SQL_Running、Seconds_Behind_Source、Last_IO_Error/Last_SQL_Error、SQL_Delay/SQL_Remaining_Delay。

<details>
<summary>参考实现</summary>

- **通不通**：`Replica_IO_Running`（拉 binlog 的线程）与 `Replica_SQL_Running`（回放的线程）必须都是 Yes——一个 No 复制就是断的；
- **落后多少**：`Seconds_Behind_Source`——0 不代表没延迟（空闲时恒 0，要看事件流速），持续增长才是真延迟；
- **错在哪**：`Last_IO_Error`（网络/认证/binlog 被清理）与 `Last_SQL_Error`（回放冲突，如主键撞车）——两者根因层不同，修复路径完全不同；
- **慢不慢（深层）**：`Retrieved_Gtid_Set` 与 `Executed_Gtid_Set` 的差集大小（GTID 开启时）比秒数更客观。

延迟副本多看两个：`SQL_Delay`（配置的延迟秒数）与 `SQL_Remaining_Delay`（距离回放下一条还剩几秒）——它的「落后」是故意的，`Seconds_Behind_Source` 接近 SQL_Delay 才是健康态，误操作恢复时等 `SQL_Remaining_Delay` 归零前把 SQL 线程停在事故位点之前（完整恢复流程见本篇延迟复制节）。
</details>

练习三（实战题）：在实验环境给「捞误删」做一次完整演练：搭建 1 主 1 从（异步）+ 1 台延迟 60 秒副本，故意在主库删一张小表，然后只靠延迟副本把数据捞回来。写出全流程命令。

提示：CHANGE REPLICATION SOURCE TO ... SOURCE_DELAY=60；捞回的方式是「延迟副本停在误删语句之前，把数据导回主库」——不是让主库倒带。

<details>
<summary>参考实现</summary>

```sql
-- 延迟副本上配置（60 秒延迟）
STOP REPLICA;
CHANGE REPLICATION SOURCE TO SOURCE_DELAY = 60;
START REPLICA;

-- 主库：误删（演练里是故意删）
DROP TABLE vocaloids_setnull;

-- 60 秒内赶到延迟副本：
STOP REPLICA;                       -- 1. 先停（别让误删语句回放）
SHOW REPLICA STATUS\G               -- 2. 确认 Executed_Gtid_Set 停在事故之前

-- 3. 从延迟副本把误删的表导出
--    mysqldump -h delay-replica green vocaloids_setnull > rescue.sql

-- 4. 导回主库（此时主库没有这张表，直接导入）
--    mysql -h primary green < rescue.sql

-- 5. 延迟副本恢复回放：跳过那条 DROP（GTID 方式）
SET GTID_NEXT='误删事务的GTID';
BEGIN; COMMIT;                      -- 注入空事务占位
SET GTID_NEXT='AUTOMATIC';
START REPLICA;                      -- 继续回放，跳过误删
```

流程的要害在第 1 步的**抢时间**：延迟窗口内必须完成「停 SQL 线程 → 导出」。GTID 注入空事务（第 5 步）是跳过事故语句的脚本化手法（原理见 [GTID](/mysql/600-GTID)）；没有 GTID 时用 `START REPLICA UNTIL` 定位点跳过。演练价值：真事故时没有时间读文档，肌肉记忆只能来自演练。
</details>

## 自我检查

- 能按「binlog 地基 / 传输层 / 一致性内核 / 打包产品 / 坐标系统」的层级说出高可用家族各成员的位置；
- 能按 RTO（要不要自动切换）与 RPO（能不能丢）两轴给业务选型并说出代价；
- 能说出半同步的退化陷阱（超时回异步）与 MGR 的多数派语义（节点数倒推容错）；
- 能区分「容灾」（ClusterSet）与「误操作恢复」（延迟副本/备份）是两条独立防线；
- 能读 SHOW REPLICA STATUS 的五个关键字段并说出延迟副本的健康态定义；
- 能执行延迟副本的「停 → 导 → 回灌 → 跳过事故事务」完整恢复流程。
