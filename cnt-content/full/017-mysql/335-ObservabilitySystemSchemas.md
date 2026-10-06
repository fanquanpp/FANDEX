---
order: 360
title: 系统库与可观测：INFORMATION_SCHEMA、Performance Schema 与 sys
module: 'mysql'
category: 数据库
difficulty: beginner
description: MySQL 可观测三件套——INFORMATION_SCHEMA 的元数据与锁等待查询、Performance Schema 的事件表与语句摘要、sys 视图三问（谁锁了谁、谁在吃 IO、哪条 SQL 最贵）；与死锁排查、慢日志形成工具链，附遮代码自检练习。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：MySQL 的「可观测三件套」——`INFORMATION_SCHEMA`（元数据字典：表、列、锁、事务）、`performance_schema`（P_S，运行时事件采集：语句、等待、文件 IO、内存）、`sys`（P_S 与 I_S 的友好视图层，开箱即用的分析查询）。它们是「服务器正在发生什么」的三个抽象层次。
- **解决什么问题**：业务报「卡住了」——谁锁了谁、锁在哪一行（I_S 的锁等待视图）；服务器 IO 飙高——哪个文件/表在吃 IO（P_S 文件事件 + sys 视图）；凌晨 DBA 巡检——哪条 SQL 最贵、哪条 SQL 在全表扫描（P_S 语句摘要 + sys 视图）。没有这三件套，这些问题的答案只剩「猜 + 重启」。
- **什么时候用到**：锁等待与死锁的现场定位（与 [死锁排查](/mysql/480-DeadlockDetectionHandling) 配对）、慢 SQL 的证据链（与 [慢查询日志](/mysql/340-SlowQueryLog) 配对：慢日志管「记录」，三件套管「归因」）、容量巡检（表大小、碎片、索引统计）。SHOW 家族的配置面（看变量与状态计数）见 [配置运维](/mysql/850-MySQLConfigOps)——SHOW 回答「配置成什么样」，三件套回答「正在发生什么」。

## 三件套的分工模型

| 层 | 角色 | 回答的问题 | 访问成本 |
| --- | --- | --- | --- |
| `INFORMATION_SCHEMA` | 元数据字典 | 有哪些表/列/索引；谁持有锁、谁在等 | 轻量（8.0 起多为数据字典直查） |
| `performance_schema` | 事件采集器 | 语句跑了多少次多慢；等待在哪类资源上 | 有采集开销，按 instrument 开关控制 |
| `sys` | 友好视图层 | 上面两层的高频问题的现成答案 | 轻量（视图 + 函数封装） |

心智模型：**I_S 是档案室**（结构信息，变化慢），**P_S 是行车记录仪**（事件流，持续采集），**sys 是把记录仪整理好的日报**。查问题先翻日报（sys），日报不够细再下钻到 P_S 原始表，找结构信息去 I_S。8.0 起 I_S 的核心表（TABLES/COLUMNS/STATISTICS）直连数据字典，`SHOW` 命令在底层就是查它们——`SHOW TABLES` 与 `SELECT TABLE_NAME FROM information_schema.TABLES` 是同源的两张皮。

## INFORMATION_SCHEMA：元数据与锁等待

### 结构信息的日常查询

```sql
-- 库内表清单与大小（容量巡检的起点）
SELECT TABLE_NAME, ENGINE, TABLE_ROWS,
       ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 1) AS size_mb,
       ROUND(DATA_FREE / 1024 / 1024, 1) AS fragment_mb
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'green'
ORDER BY DATA_LENGTH + INDEX_LENGTH DESC;

-- 索引清单（冗余索引排查的前置盘点）
SELECT TABLE_NAME, INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols,
       NON_UNIQUE
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'green'
GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE;
```

逐段讲两个查询的工程用途：表大小查询把 DATA_LENGTH（数据）与 INDEX_LENGTH（索引）分开加总——「表为什么这么大」的第一反应是把两者拆开看（索引比数据大通常意味着索引泛滥）；`fragment_mb`（DATA_FREE）大于表大小 20% 时考虑重建表消除碎片（`ALTER TABLE ... ENGINE=InnoDB`，见速查 [MySQL 速查表](/mysql/890-MySQLQuickLookup) 的调优清单）。索引清单按列序拼出复合索引定义——肉眼比对冗余（`(a)` 与 `(a, b)` 并存）比任何工具都直观。

### 锁等待现场：谁锁了谁

I_S 在 8.0 提供了锁等待的标准化视图（取代 5.7 的 information_schema.innodb_lock_waits）：

```sql
-- 锁等待全景：等待者、持有者、锁的行
SELECT
  w.REQUESTING_ENGINE_TRANSACTION_ID AS wait_txn,      -- 等待中的事务
  b.BLOCKING_ENGINE_TRANSACTION_ID  AS block_txn,      -- 持锁的事务
  w.REQUESTING_THREAD_ID            AS wait_thd,
  w.REQUESTING_ENGINE_LOCK_ID       AS lock_wanted,     -- 要的锁
  b.BLOCKING_ENGINE_LOCK_ID         AS lock_held        -- 持有的锁
FROM performance_schema.data_lock_waits w
JOIN performance_schema.data_locks b
  ON b.ENGINE_LOCK_ID = w.BLOCKING_ENGINE_LOCK_ID;

-- 配合 processlist 拿到会话细节（在跑什么 SQL、跑了多久）
SELECT p.ID, p.USER, p.HOST, p.TIME, p.STATE, LEFT(p.INFO, 80) AS current_sql
FROM information_schema.PROCESSLIST p
WHERE p.ID IN (SELECT PROCESSLIST_ID FROM performance_schema.threads
               WHERE THREAD_ID IN (SELECT REQUESTING_THREAD_ID
                                   FROM performance_schema.data_lock_waits));
```

逐段讲现场定位流程：`data_lock_waits` 给出「谁在等谁」的边、`data_locks` 给出每条边的锁对象（表锁/行锁/间隙锁与锁的具体记录）、再经 `threads.PROCESSLIST_ID` 关联回 processlist 拿到 SQL 文本——三步构成完整的「锁等待证据链」。这套查询在 [死锁排查](/mysql/480-DeadlockDetectionHandling) 是核心武器（死锁是锁等待图里出现环），日常「业务卡住」先用它确认是不是锁问题：`data_lock_waits` 为空但业务慢，方向转向执行计划（[EXPLAIN 详解](/mysql/320-EXPLAINDetailed)）。

## Performance Schema：事件表与语句摘要

### 开关体系：instruments 与 consumers

P_S 的采集分两层开关：`setup_instruments` 管「采什么」（语句、等待、文件 IO、内存各设开关），`setup_consumers` 管「采到存哪」（current/历史表/摘要表）：

```sql
-- 现状盘点：哪些在采
SELECT NAME, ENABLED, TIMED FROM performance_schema.setup_instruments
WHERE NAME LIKE 'statement/%' AND ENABLED = 'NO';      -- 默认大多已开

SELECT NAME, ENABLED FROM performance_schema.setup_consumers;
-- events_statements_current / _history / _history_long / _summary_by_digest
-- 关键：events_statements_history 默认可能关着，摘要表（by_digest）默认开

-- 按需开启历史事件（排查期）
UPDATE performance_schema.setup_consumers
SET ENABLED = 'YES' WHERE NAME = 'events_statements_history';
```

逐段讲开关纪律：生产环境不要全量打开 instruments——每个开关都有采集开销，「排查期临时开、排查完关回」是纪律；摘要表（`*_summary_by_digest`）是默认开启且最有价值的一层（按语句指纹聚合，无逐条事件的开销），日常巡检主要消费它。

### 语句摘要：哪条 SQL 最贵

```sql
-- 按总耗时 Top 10（digest 是语句模板的指纹：字面值归一化后的形状）
SELECT
    DIGEST_TEXT AS query,
    COUNT_STAR AS exec_count,
    ROUND(SUM_TIMER_WAIT / 1e12, 3)  AS total_sec,
    ROUND(AVG_TIMER_WAIT / 1e9, 3)   AS avg_ms,
    SUM_ROWS_EXAMINED AS rows_examined,
    ROUND(SUM_ROWS_EXAMINED / NULLIF(COUNT_STAR, 0)) AS avg_scan
FROM performance_schema.events_statements_summary_by_digest
ORDER BY SUM_TIMER_WAIT DESC LIMIT 10;

-- 全表扫描嫌疑名单
SELECT DIGEST_TEXT, COUNT_STAR, SUM_NO_INDEX_USED AS no_index_hits
FROM performance_schema.events_statements_summary_by_digest
WHERE SUM_NO_INDEX_USED > 0
ORDER BY SUM_NO_INDEX_USED DESC LIMIT 10;
```

逐段讲读法：`DIGEST_TEXT` 把字面值替换成 `?`——「同形状」的语句聚成一行，按总耗时排序找到的是「累计伤害最大」的语句（高频轻查询与低频重查询在 avg 与 total 两个视角下排名不同，两个都要看）；`avg_scan`（平均扫描行数）是「索引是否合理」的信号——单行结果却扫描上万行，直接进 [索引失效现场](/mysql/310-IndexFailureScene) 排查。摘要表有两个运维细节：默认按性能schema容量滚动淘汰（接近 5000 条指纹上限时丢掉最老的），定位具体问题用 `performance_schema.events_statements_history`；`TRUNCATE performance_schema.events_statements_summary_by_digest` 可清零重采——「优化后对比前后数据」的标准动作。

### 等待事件与文件 IO

```sql
-- 全局等待分布：时间花在哪类资源上
SELECT EVENT_NAME, COUNT_STAR AS cnt,
       ROUND(SUM_TIMER_WAIT / 1e12, 3) AS total_sec
FROM performance_schema.events_waits_summary_global_by_event_name
WHERE COUNT_STAR > 0
ORDER BY SUM_TIMER_WAIT DESC LIMIT 10;
-- 读法：wait/io/file/innodb/... 占比高 -> IO 瓶颈；wait/synch/mutex/... 高 -> 锁竞争（内部）

-- 文件 IO 排行：哪个文件在吃 IO
SELECT EVENT_NAME, COUNT_READ, COUNT_WRITE,
       ROUND(SUM_NUMBER_OF_BYTES_READ / 1024 / 1024) AS read_mb,
       ROUND(SUM_NUMBER_OF_BYTES_WRITE / 1024 / 1024) AS write_mb
FROM performance_schema.file_summary_by_instance
ORDER BY SUM_NUMBER_OF_BYTES_READ + SUM_NUMBER_OF_BYTES_WRITE DESC LIMIT 10;
```

读法解释：等待事件的第一层读法是**分类归因**——`wait/io/file` 系占比高说明瓶颈在磁盘（方向：Buffer Pool 加大，见 [配置运维](/mysql/850-MySQLConfigOps) 的内存参数、或索引优化减少随机读）；`wait/synch` 系高说明内部互斥竞争（方向：热点行、大事务）。文件排行把 IO 归到具体文件——redo log 文件写入暴涨对上写入峰值（[RedoLog](/mysql/500-RedoLog) 的容量判断）、ibd 数据文件读暴涨对上缓存不足。

## sys 视图：三问现成答案

sys schema 把上面两层的高频查询封装成视图，日常巡检三个问题各有一条现成答案：

```sql
-- 问一：哪条 SQL 最贵（P95 分位视图，等价于手写 digest 查询的浓缩版）
SELECT query, exec_count, avg_latency, total_latency, rows_examined_avg
FROM sys.statements_with_runtimes_in_95th_percentile LIMIT 10;

-- 问二：谁在吃 IO（文件聚合视图）
SELECT file, total_latency, count_read, count_write
FROM sys.io_global_by_file_by_bytes LIMIT 10;

-- 问三：现在谁在干活（增强 processlist：锁延迟、语句文本一屏全有）
SELECT conn_id, user, db, command, current_statement,
       statement_latency, lock_latency
FROM sys.session
WHERE command = 'Query'
ORDER BY statement_latency DESC;

-- 运维高频补充：冗余索引与未使用索引（索引瘦身清单的权威来源）
SELECT * FROM sys.schema_redundant_indexes;
SELECT * FROM sys.schema_unused_indexes;
```

逐条讲与手写查询的关系：`statements_with_runtimes_in_95th_percentile` 内部就是上一节 digest 表的 P95 过滤——「最贵」的定义被 sys 预设为「平均延迟落在 P95 分位」，比手写 ORDER BY total 更聚焦（总数大会被少量高频项淹没）；`sys.session` 的 `lock_latency` 列把「这条查询等了多久锁」直接给你——锁等待排查时第一眼先看这列；`schema_unused_indexes` 基于 `index_io` 统计——**重启后统计清零**，判断「未使用」至少要积累一个完整业务周期（含月批、报表）的数据再下刀（索引下线的完整流程见 [不可见索引](/mysql/280-InvisibleIndex)——先设 INVISIBLE 观察再 DROP）。

## 例子一（真实工程）：业务卡住的十分钟定位流程

场景：客服报「订单提交一直转圈」。用三件套按流程走：

```sql
-- 第 1 步（30 秒）：有没有锁等待？
SELECT COUNT(*) FROM performance_schema.data_lock_waits;
-- 结果 > 0：是锁问题，进第 2 步；= 0：进第 3 步

-- 第 2 步：锁等待证据链（谁等谁、SQL 是什么）
SELECT b.BLOCKING_ENGINE_TRANSACTION_ID AS blocker,
       LEFT(p2.INFO, 100) AS blocker_sql,
       p2.TIME AS blocker_sec
FROM performance_schema.data_lock_waits w
JOIN performance_schema.data_locks b
  ON b.ENGINE_LOCK_ID = w.BLOCKING_ENGINE_LOCK_ID
JOIN performance_schema.threads t2
  ON t2.THREAD_ID = w.BLOCKING_THREAD_ID
JOIN information_schema.PROCESSLIST p2
  ON p2.ID = t2.PROCESSLIST_ID;
-- 典型输出：blocker_sql 是一条忘了提交的事务里的 UPDATE，blocker_sec = 800
-- 处置：KILL <blocker 的 process id>，并回查应用代码的事务边界

-- 第 3 步：不是锁，看最贵 SQL 与等待分布
SELECT query, avg_latency, rows_examined_avg
FROM sys.statements_with_runtimes_in_95th_percentile LIMIT 5;
SELECT EVENT_NAME, total_sec FROM (
    SELECT EVENT_NAME, SUM_TIMER_WAIT AS total_sec
    FROM performance_schema.events_waits_summary_global_by_event_name
    WHERE COUNT_STAR > 0 ORDER BY SUM_TIMER_WAIT DESC LIMIT 5) t;
```

流程的价值在**分层排他**：锁等待（第 1 步）排除了「执行慢」的方向；不是锁再看「哪条 SQL 贵」（sys 日报）与「等什么资源」（P_S 等待分布）——两个视角正交：前者找到嫌疑语句（进 EXPLAIN），后者找到资源瓶颈（进容量配置）。十分钟内给业务方一个有证据的答复，而不是「看起来在忙」。

## 例子二（真实工程）：给 340 慢日志形成闭环

慢日志记录「谁慢了」，三件套回答「为什么慢」——两者串成优化闭环（慢日志的采集与分析见 [慢查询日志](/mysql/340-SlowQueryLog)）：

```sql
-- 慢日志 top1 是一条按商家查询的报表 SQL，进入三件套取证
-- 取证 1：它的真实执行画像（digest 里它的累计表现）
SELECT DIGEST_TEXT, COUNT_STAR,
       ROUND(AVG_TIMER_WAIT / 1e9) AS avg_ms,
       SUM_ROWS_EXAMINED / COUNT_STAR AS avg_scan,
       SUM_SELECT_FULL_JOIN AS full_join_cnt
FROM performance_schema.events_statements_summary_by_digest
WHERE DIGEST_TEXT LIKE 'SELECT%merchant_id%' LIMIT 1;
-- avg_scan = 412000：平均扫 41 万行返回 200 行 -> 索引缺失/失效实锤

-- 取证 2：它的执行计划
EXPLAIN <那条 SQL>;
-- type=ALL：全表扫描，确认没有可用索引

-- 取证 3：建索引后清零重采，对比前后
ALTER TABLE orders ADD INDEX idx_orders_merchant (merchant_id, created_at);
TRUNCATE performance_schema.events_statements_summary_by_digest;
-- 24 小时后再看同一 digest：avg_scan 从 412000 降到 200，闭环完成
```

闭环的关键动作是**清零重采**：优化前后的指标必须在同一口径下比较（digest 表是累计值，不清零就分不清「前 30 天」与「后 1 天」的贡献）；`avg_scan` 从 41 万到 200 是「索引生效」的量化证据——比「感觉快了」可信一个量级。这个「慢日志找嫌疑 → 三件套取证 → 改造 → 清零复测」的流程是慢 SQL 优化的标准作业。

## 例子三（真实工程）：索引瘦身与碎片巡检

季度巡检的两个固定动作，都靠三件套出清单：

```sql
-- 动作一：索引瘦身（未使用索引 -> 设 INVISIBLE 观察一个月 -> DROP）
SELECT * FROM sys.schema_unused_indexes
WHERE object_schema = 'green';
-- object_name | index_name
-- orders      | idx_orders_status_old

ALTER TABLE orders ALTER INDEX idx_orders_status_old INVISIBLE;   -- 先隐形
-- 观察 30 天无业务异常后：
ALTER TABLE orders ALTER INDEX idx_orders_status_old INVISIBLE;   -- 如需回滚
-- ALTER TABLE orders DROP INDEX idx_orders_status_old;            -- 最终删除

-- 动作二：碎片巡检（DATA_FREE 占比超 20% 的表进重建队列）
SELECT TABLE_NAME, TABLE_ROWS,
       ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024) AS size_mb,
       ROUND(DATA_FREE / (DATA_LENGTH + INDEX_LENGTH) * 100, 1) AS frag_pct
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'green' AND DATA_FREE > 0
ORDER BY DATA_FREE DESC LIMIT 20;
-- 高碎片表的重建：ALTER TABLE t ENGINE=InnoDB（在线，注意主从延迟，见 685 篇）
```

巡检纪律：未使用索引的判断**必须**跨一个完整业务周期（短周期会误杀月度报表用的索引）；INVISIBLE 是「先观察后删除」的安全阀——误杀时一条 ALTER 即时恢复，见 [不可见索引](/mysql/280-InvisibleIndex)；碎片重建的锁与主从延迟成本评估见 [在线 DDL 与表变更](/mysql/685-OnlineDDLTableChange)，重建窗口避开业务峰。

## 常见坑点速记

- 三件套分工：I_S 管结构（档案室）、P_S 管事件（行车记录仪）、sys 管现成日报——先 sys 后 P_S 下钻；
- P_S 开关有采集开销：instruments 排查期临时开、常态只留摘要表；全开是自残；
- digest 指纹把字面值归一化——看它找「同形状语句」，定位具体参数要去 history 或业务日志；
- `TRUNCATE events_statements_summary_by_digest` 是优化前后对比的标准动作（累计值不清零无口径）；
- `schema_unused_indexes` 重启清零：下刀前至少积累一个完整业务周期，且先 INVISIBLE 观察；
- 锁等待证据链三步：data_lock_waits（谁等谁）→ data_locks（锁对象）→ processlist（SQL 文本）；
- SHOW VARIABLES/STATUS 看「配置与计数」，三件套看「事件与结构」——两类问题别找错门；
- avg_scan（平均扫描行数）是索引合理性的量化信号：单行结果扫描上万行直接进索引排查。

## 动手实践

练习一（预测题）：重启 MySQL 后，下面哪些查询的结果会变空？哪些不变？

```sql
A. SELECT COUNT(*) FROM performance_schema.events_statements_summary_by_digest;
B. SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'green';
C. SELECT COUNT(*) FROM sys.schema_unused_indexes;
D. SELECT COUNT(*) FROM performance_schema.data_lock_waits;
```

提示：哪些是「事件采集」，哪些是「结构事实」？

<details>
<summary>参考实现</summary>

变空的：**A 与 C**——digest 摘要与索引使用统计都是 P_S 的运行期采集数据，重启清零重采；**D** 在重启后也是空的（锁是运行期状态，重启后没有锁等待），但它在日常也会随锁等待消失而变化，不算「重启特有」。不变的：**B**——I_S 的表清单是数据字典的结构事实，重启不丢。这道题映射本篇第一性认知：P_S 是行车记录仪（录像随断电丢失），I_S 是档案室（档案常在）——「未使用索引」这类依赖采集数据的判断必须考虑采集窗口是否覆盖完整业务周期。
</details>

练习二（实战题）：写一个「一键巡检」SQL 集（五条查询）：最贵 SQL Top5、全表扫描 Top5、锁等待数、连接数水位（Threads_connected vs max_connections）、最大表 Top10。每条附一句「何时该警觉」的读法。

提示：前两条用 sys 或 P_S 摘要，第三条 data_lock_waits，第四条 SHOW STATUS 或 P_S 的 global_status，第五条 I_S.TABLES。

<details>
<summary>参考实现</summary>

```sql
-- 1. 最贵 SQL Top5 —— 平均延迟 > 500ms 或 total 超过日常 3 倍时警觉
SELECT query, exec_count, avg_latency, total_latency
FROM sys.statements_with_runtimes_in_95th_percentile LIMIT 5;

-- 2. 全表扫描 Top5 —— 高频语句 no_index_hits 持续增长即警觉（有索引失效嫌疑）
SELECT query, count_star, sum_no_index_used
FROM sys.statements_with_full_table_scans LIMIT 5;

-- 3. 锁等待数 —— > 0 且持续超过 10 秒即介入（查证据链见例子一）
SELECT COUNT(*) FROM performance_schema.data_lock_waits;

-- 4. 连接水位 —— Threads_connected / max_connections > 80% 警觉（连接耗尽倒计时）
SELECT VARIABLE_NAME, VARIABLE_VALUE FROM performance_schema.global_status
WHERE VARIABLE_NAME IN ('Threads_connected', 'Threads_running');

-- 5. 最大表 Top10 —— 单表环比涨幅异常（周增 > 20%）时评估分区/归档
SELECT TABLE_NAME, ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024) AS size_mb
FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'green'
ORDER BY DATA_LENGTH + INDEX_LENGTH DESC LIMIT 10;
```

每条的警觉阈值是巡检落地关键——没有阈值的巡检只是一次 SELECT。阈值初始值给保守估计，跑一个月后按本库基线调整。
</details>

练习三（实战题）：复现一次锁等待：双会话——A 开事务 UPDATE 一行不提交，B 对同一行 UPDATE（会阻塞）。用本篇证据链三步查询定位「谁等谁、SQL 是什么」，然后 KILL 释放，最后清点：B 报什么错/等了多久，A 被 KILL 后 B 的行为？

提示：A 的事务不要 COMMIT；KILL 的是 A 的 processlist ID；B 的等待超时由 innodb_lock_wait_timeout（默认 50 秒）控制，KILL A 后 B 立即拿到锁。

<details>
<summary>参考实现</summary>

```sql
-- 会话 A
START TRANSACTION;
UPDATE vocaloids_setnull SET name = '测试占锁' WHERE id = 1;
-- 不提交

-- 会话 B（另开窗口）
UPDATE vocaloids_setnull SET name = 'B 想改' WHERE id = 1;   -- 阻塞中

-- 会话 C（运维视角）：证据链三步
SELECT REQUESTING_ENGINE_TRANSACTION_ID AS waiter, BLOCKING_ENGINE_TRANSACTION_ID AS holder
FROM performance_schema.data_lock_waits;                     -- waiter != holder
SELECT p.ID, p.USER, LEFT(p.INFO, 60) AS sql_text, p.TIME
FROM information_schema.PROCESSLIST p
WHERE p.INFO IS NOT NULL AND p.COMMAND = 'Query';            -- 看到 B 的 SQL 在等
-- 定位 holder 的 process id：
SELECT t.PROCESSLIST_ID, t.PROCESSLIST_INFO
FROM performance_schema.threads t
WHERE t.THREAD_ID IN (SELECT BLOCKING_THREAD_ID FROM performance_schema.data_lock_waits);

KILL <holder 的 PROCESSLIST_ID>;

-- 回到会话 B：UPDATE 立即成功（不再等 50 秒超时）
```

清点：若不 KILL，B 在 `innodb_lock_wait_timeout`（默认 50 秒）后报 `ERROR 1205 (HY000): Lock wait timeout exceeded`；KILL A 后其未提交事务回滚，B 拿到锁立即完成。这正是例子一定位流程的手工复刻——生产上把这套查询存成常用片段（或 sys.session 的 lock_latency 一眼看等锁耗时）。
</details>

练习四（找错题）：同事想找「最耗时的 SQL」，写了这条查询，有两处问题，先找再修：

```sql
SELECT DIGEST_TEXT, COUNT_STAR, AVG_TIMER_WAIT
FROM performance_schema.events_statements_history_long
ORDER BY AVG_TIMER_WAIT DESC;
```

提示：history_long 是逐条事件还是聚合？「最耗时」看总账还是单次？

<details>
<summary>参考实现</summary>

```sql
SELECT DIGEST_TEXT AS query, COUNT_STAR AS exec_count,
       ROUND(SUM_TIMER_WAIT / 1e12, 3) AS total_sec,
       ROUND(AVG_TIMER_WAIT / 1e9, 3)  AS avg_ms
FROM performance_schema.events_statements_summary_by_digest
ORDER BY SUM_TIMER_WAIT DESC LIMIT 10;
```

两处问题：其一，`events_statements_history_long` 是**逐条原始事件**（每条 SQL 一行，环形缓冲默认 1 万行、滚动淘汰）——高频语句占满缓冲后低频重查询可能根本没被记进去，找「最耗时」应该用**摘要表**（`*_summary_by_digest`，按指纹聚合、永不漏采）；其二，按 `AVG_TIMER_WAIT` 排序找到的是「单次最慢」，一次夜间批跑 10 分钟的 SQL 才进得了榜首——「最耗时」在容量视角应看 `SUM_TIMER_WAIT`（总账 = 频率 x 单次），两个排序视角都要看，但默认巡检用总账。修复版顺带把皮秒级原始值换算成秒/毫秒（P_S 计时单位是皮秒，不换算的数字没法读）。
</details>

练习五（实战题）：把本篇与 340 篇串成完整闭环：从 sys 找到一条全表扫描语句后，用 digest 表取它的「平均扫描行数」，EXPLAIN 验证，补索引，清零重采，一天后报告 avg_scan 的前后变化。写出全流程 SQL（用 vocaloid 或 charging 库任选一个真实语句）。

提示：流程模板见例子二；索引设计依据见 [复合索引](/mysql/230-CompositeIndexLeftmostPrefixPrinciple)。

<details>
<summary>参考实现</summary>

```sql
-- 1. 找嫌疑
SELECT query FROM sys.statements_with_full_table_scans LIMIT 5;
-- 假设锁定：SELECT * FROM charge_sessions WHERE charger_id = ? AND started_at > ?

-- 2. 量化基线
SELECT COUNT_STAR, SUM_ROWS_EXAMINED / COUNT_STAR AS avg_scan
FROM performance_schema.events_statements_summary_by_digest
WHERE DIGEST_TEXT LIKE 'SELECT%`charge_sessions`%charger_id%';
-- 基线：avg_scan = 386000

-- 3. 验证执行计划
EXPLAIN SELECT * FROM charge_sessions WHERE charger_id = 42
  AND started_at > '2026-09-01';                 -- 预期 type=ALL

-- 4. 改造（等值列在前、范围列在后）
ALTER TABLE charge_sessions ADD INDEX idx_cs_charger_time (charger_id, started_at);

-- 5. 清零重采（清零前确认优化器统计已刷新）
ANALYZE TABLE charge_sessions;
TRUNCATE performance_schema.events_statements_summary_by_digest;

-- 6. 24 小时后复测同一 digest
SELECT COUNT_STAR, SUM_ROWS_EXAMINED / COUNT_STAR AS avg_scan
FROM performance_schema.events_statements_summary_by_digest
WHERE DIGEST_TEXT LIKE 'SELECT%`charge_sessions`%charger_id%';
-- 预期：avg_scan 从 386000 降到两位数（该 charger 当日订单量）
```

闭环纪律：索引列序「等值在前、范围在后」（最左前缀原理的范围断点，见 230 篇）；`ANALYZE TABLE` 在清零前跑一次让新索引被优化器统计感知；复测窗口要覆盖该语句的正常频率（高频语句一天够，周报类要等一个周期）。
</details>

## 与之前和之后的知识的关系

- 往前：慢日志采集与分析见 [慢查询日志](/mysql/340-SlowQueryLog)（本篇给它提供归因层）；死锁的原理与 InnoDB 检测见 [死锁排查](/mysql/480-DeadlockDetectionHandling)（本篇提供现场证据链）；配置与状态变量的 SHOW 家族见 [配置运维](/mysql/850-MySQLConfigOps)。
- 往后：执行计划的读法（第 3 步的 EXPLAIN 细节）见 [EXPLAIN 详解](/mysql/320-EXPLAINDetailed)；索引下线的安全流程见 [不可见索引](/mysql/280-InvisibleIndex)；碎片重建的锁与延迟评估见 [在线 DDL 与表变更](/mysql/685-OnlineDDLTableChange)；Buffer Pool 与内存参数的调优账见 [配置运维](/mysql/850-MySQLConfigOps) 与 [RedoLog](/mysql/500-RedoLog)。

## 参考与致谢

- MySQL 8.0 Reference Manual, Chapter 28 INFORMATION_SCHEMA Tables：https://dev.mysql.com/doc/refman/8.0/en/information-schema.html（GPL/CC BY-SA 许可）
- MySQL 8.0 Reference Manual, Chapter 29 Performance Schema（setup_instruments/consumers、digest 表、data_lock_waits）：https://dev.mysql.com/doc/refman/8.0/en/performance-schema.html（GPL/CC BY-SA 许可）
- MySQL 8.0 Reference Manual, Chapter 30 MySQL sys Schema：https://dev.mysql.com/doc/refman/8.0/en/sys-schema.html（GPL/CC BY-SA 许可）
- 本篇视图清单、计时单位（皮秒）与 digest 行为均以官方手册为依据。

## 自我检查

- 能用「档案室/行车记录仪/日报」说出三件套的分工并选对排查入口；
- 能写出锁等待证据链三步查询（谁等谁 → 锁对象 → SQL 文本）；
- 能解释 instruments 与 consumers 两层开关的分工及「排查期临时开」的纪律；
- 能说出 digest 摘要的指纹机制与 TRUNCATE 清零复测在优化闭环中的作用；
- 能列出 sys 三问对应的视图并说出 schema_unused_indexes 的采集窗口陷阱；
- 能把 avg_scan（平均扫描行数）作为索引合理性的量化信号写进优化报告。
