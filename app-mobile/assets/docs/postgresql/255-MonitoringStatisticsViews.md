---
order: 220
title: 运行监控与统计视图
module: 'postgresql'
category: 数据库
difficulty: beginner
description: pg_stat_statements 深用、pg_stat_activity 会话诊断、死元组观察、日志分析与 pgBadger，附可复制的日常巡检清单
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：PostgreSQL 服务器管理 / 运行监控（官方文档 Chapter 28 Monitoring Database Activity）。
- **解决什么问题**：数据库"周期性变慢"、"凌晨卡死"、"没人改过代码但报表超时"——这些问题不在 SQL 层面，在**运行时状态**里：谁在耗 CPU、哪个表死元组堆积、哪个慢查询在反复执行。统计视图就是数据库的体检报告。
- **什么时候用到**：接手陌生库先巡检；每周例行体检；慢查询排障第一步（先找最耗时的语句再谈优化，入口衔接[查询优化](/postgresql/250-QueryOptimization)）。
- **前置阅读**：[查询优化](/postgresql/250-QueryOptimization)、[VACUUM 机制](/postgresql/210-VACUUMMechanism)。

## 主线故事：报表"每逢周三变慢"

下面的排查过程贯穿全篇，每一步的命令都值得单独记住：

```text
背景：运营反馈"每周三上午报表平台超时"，其他日子正常。DBA 一周后复现排查。

第一步  pg_stat_statements 排行 → 发现一条 SELECT count(*) 全表扫，单次 40s，
        每周三上午被定时任务调起 20 次。
第二步  pg_stat_user_tables → 该表 n_dead_tup 高达 400 万（表才 500 万行）。
第三步  pg_stat_activity 复现时段观察 → 长事务 hold 住，autovacuum 反复被取消。
第四步  找到业务侧"周三上午批量 UPDATE 状态"的长事务；拆小后 autovacuum 正常完成，
        死元组回收，报表恢复 2s。
```

教训：症状在"慢查询"，根因在"死元组 + 长事务"。**单点看 SQL 优化救不了系统性变慢**——这正是要建立监控视图巡检的原因。

## 第一工具：pg_stat_statements（谁最耗时）

安装一次，永久受益：

```sql
CREATE EXTENSION pg_stat_statements;
-- postgresql.conf 需有：
--   shared_preload_libraries = 'pg_stat_statements'   （改后重启）
--   pg_stat_statements.max = 10000                    （保留语句数）
--   pg_stat_statements.track = all
```

看排行榜的四个姿势：

```sql
-- 耗时总榜（先抓"总账"最大户）
SELECT query, calls, total_exec_time::int AS total_ms,
       mean_exec_time::int AS mean_ms, rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC LIMIT 10;

-- 平均耗时榜（低频但每次很慢的）
SELECT query, calls, mean_exec_time::int AS mean_ms
FROM pg_stat_statements
WHERE calls > 10
ORDER BY mean_exec_time DESC LIMIT 10;

-- 命中率榜：shared_blks_hit/read 比值低 = 缓存白费，多为大扫描
SELECT query, calls,
  round(100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0), 1) AS hit_pct
FROM pg_stat_statements
ORDER BY shared_blks_read DESC LIMIT 10;

-- I/O 时间榜（PG 13+ 字段）
SELECT query, temp_blks_written   -- 临时文件写入量，溢盘信号
FROM pg_stat_statements
ORDER BY temp_blks_written DESC LIMIT 5;
```

逐字段解读：`calls` 调用次数；`total_exec_time` 总耗时毫秒（**找总账**）；`mean_exec_time` 平均（**找怪胎**）；`rows` 影响行数，`rows/calls` 比值过大说明单次拉的数据太多。语句按"指纹"归并——字面量被参数化，同形状 SQL 合并成一行。

两个易错点：

- **统计是自重启以来的累计值**，"最近一小时谁慢"看不出来。诊断时段问题先 `SELECT pg_stat_statements_reset();` 打点重置，业务跑一段再看；
- 被截断的长查询结尾是 `<...>`，`pg_stat_statements.track_utility = on` 才记录 PREPARE/EXPLAIN 这类工具语句。

## 第二工具：pg_stat_activity（现场抓人）

[连接管理篇](/postgresql/165-ConnectionPoolingPgBouncer)讲过它的连接诊断用法，这里补会话诊断三连：

```sql
-- 1. 正在跑什么、跑了多久
SELECT pid, usename, state,
       now() - query_start AS run_time,
       left(query, 80) AS query
FROM pg_stat_activity
WHERE state <> 'idle' AND backend_type = 'client backend'
ORDER BY run_time DESC;

-- 2. 谁在等锁、等谁的（锁等待链）
SELECT blocked.pid AS blocked_pid,
       left(blocked.query, 50) AS blocked_query,
       blocking.pid AS blocking_pid,
       left(blocking.query, 50) AS blocking_query
FROM pg_stat_activity blocked
JOIN pg_stat_activity blocking
  ON blocking.pid = ANY (pg_blocking_pids(blocked.pid));

-- 3. 等待事件分布（PG 9.6+，一秒看出瓶颈类型）
SELECT wait_event_type, wait_event, COUNT(*)
FROM pg_stat_activity
WHERE state <> 'idle'
GROUP BY 1, 2 ORDER BY 3 DESC;
```

`wait_event_type` 判读速记：`Lock`=等锁（找 blocking 链）、`IO`=磁盘瓶颈（看 [VACUUM](/postgresql/210-VACUUMMechanism) 与索引）、`LWLock`=内部争用（缓冲区/锁表）、`Client`=等客户端喂食（应用慢不是库慢）。

## 第三工具：pg_stat_user_tables（表的体检单）

主线故事第二、三步的核心表：

```sql
SELECT relname,
       n_live_tup, n_dead_tup,
       round(n_dead_tup * 100.0 / nullif(n_live_tup + n_dead_tup, 0), 1) AS dead_pct,
       last_autovacuum, last_autoanalyze,
       seq_scan, seq_tup_read, idx_scan
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC LIMIT 10;
```

逐列讲：`n_dead_tup`/`dead_pct` 死元组占比（健康线：持续 >20% 就该查 autovacuum 为什么没跟上）；`last_autovacuum` 从未触发过大表要查阈值公式；`seq_scan` 高而 `idx_scan` 为 0 的表是在裸奔全表扫（配合 [执行计划](/postgresql/250-QueryOptimization) 决定加索引还是它就是小表）。**这些计数是累计值**，重置后观察增量才反映"现在的行为"。

## 第四工具：日志与 pgBadger

统计视图管"现在"，日志管"历史"。三档配置：

```ini
# postgresql.conf：慢查询日志（线上常态开着，别等出事再开）
log_min_duration_statement = 500     -- 超过 500ms 记录
log_lock_waits = on                  -- 锁等待记录（配合 deadlock 报警）
log_checkpoints = on                 -- checkpoint 压力可见
```

pgBadger 把日志解析成 HTML 报告（最耗时语句直方图、按小时分布、checkpoint 摊销图）：

```bash
pgbadger /var/log/postgresql/postgresql-17-main.log -o report.html
# 增量分析：每天跑前一天，月度汇总
pgbadger -I -O /var/www/pgbadger /var/log/postgresql/*.log
```

选型一句话：临时排查用 `grep duration:` 裸看日志，周期报告用 pgBadger，实时聚合接 [日志管理](/devops/270-LogManagement) 的采集链路——三层是叠加关系不是互斥关系。

## 日常巡检清单（可整体复制）

```sql
-- ============ 每日巡检 SQL ============
-- 1. 连接水位（对照 max_connections）
SELECT count(*) AS conns,
       current_setting('max_connections') AS max_conn
FROM pg_stat_activity;

-- 2. 长事务（>5 分钟都要过目）
SELECT pid, usename, now() - xact_start AS xact_age, left(query, 60)
FROM pg_stat_activity
WHERE state <> 'idle' AND now() - xact_start > interval '5 minutes';

-- 3. 死元组 TOP5
SELECT relname, n_dead_tup, last_autovacuum
FROM pg_stat_user_tables ORDER BY n_dead_tup DESC LIMIT 5;

-- 4. 复制延迟（若有备库，见高可用篇）
SELECT application_name,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes
FROM pg_stat_replication;

-- 5. 索引缺失嫌疑：顺序扫描大户
SELECT relname, seq_scan, pg_size_pretty(pg_relation_size(relid))
FROM pg_stat_user_tables
WHERE seq_scan > 1000 ORDER BY seq_tup_read DESC LIMIT 5;

-- 6. 未使用索引（观察期后考虑删除，先确认非主键/约束）
SELECT indexrelname, idx_scan
FROM pg_stat_user_indexes WHERE idx_scan = 0 AND schemaname = 'public';
```

把这份清单挂进 [Prometheus](/devops/250-Prometheus)（postgres_exporter 自带同款指标）做趋势，SQL 留给人工诊断——趋势用图，定位用查询。

## 常见困惑

**"统计视图自己耗资源吗？"**——计数器更新在内存里，开销可忽略；`pg_stat_statements` 有一点语句哈希开销（<1%），生产标配。`track_activity_query_size` 默认 1024 字节，长 SQL 被截断，诊断时调到 4096 更实用。

**"reset 会不会丢业务数据？"**——只重置统计计数器，不碰任何业务数据，随时可做。但重置后"自重启以来"的历史口径就没了，巡检脚本里最好记录重置时间。

**"pg_stat_activity 的 query 是完整 SQL 吗？"**——受 `track_activity_query_size` 限制；且正在解析/规划阶段的语句显示的是**当前正在执行的**，不是排队中的。

## 动手实践：给自己的库做一次完整体检

任务：

1. 启用 pg_stat_statements，跑一组混合查询后查三个榜单；
2. 造一张表，开一个事务 UPDATE 后不提交，观察 `n_dead_tup` 与 pg_stat_activity 的变化；
3. 提交该事务，观察 autovacuum 是否在 `pg_stat_user_tables` 留下 `last_autovacuum`（提示：小表可能不触发，用 `VACUUM (VERBOSE) 表名` 手动验证并对比行数）；
4. 把"日常巡检清单"存成 `checkup.sql`，在事务进行中与结束后各跑一遍，对比第 2、3 项输出的差异。

<details>
<summary>参考实现（先自己跑再展开）</summary>

```sql
-- 1
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
SELECT pg_stat_statements_reset();
SELECT query, calls, mean_exec_time::int
FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 5;

-- 2
CREATE TABLE mon_demo AS SELECT id, md5(id::text) AS v FROM generate_series(1, 100000) id;
BEGIN;
UPDATE mon_demo SET v = 'x' WHERE id % 2 = 0;   -- 5 万行死元组，事务挂着
-- 另一个会话：
SELECT relname, n_live_tup, n_dead_tup FROM pg_stat_user_tables WHERE relname='mon_demo';
SELECT pid, state, now() - xact_start FROM pg_stat_activity WHERE state <> 'idle';

-- 3
COMMIT;
VACUUM (VERBOSE) mon_demo;   -- 或等待 autovacuum 触发后看 last_autovacuum
SELECT n_live_tup, n_dead_tup FROM pg_stat_user_tables WHERE relname='mon_demo';
-- n_dead_tup 归零（或趋零），last_autovacuum 出现时间戳
```

判读要点：步骤 2 期间事务外的 SELECT 走 MVCC 会跳过那 5 万行死元组，但表扫描多走一趟——这就是"长事务拖慢所有人"的机理。
</details>

## 检验清单

- 能说出 pg_stat_statements 四个榜单各回答什么问题，以及 reset 的正确时机；
- 会用 pg_blocking_pids 拉出锁等待链，并用 wait_event_type 初判瓶颈类型；
- 能解释 n_dead_tup 堆积与长事务的关系（主线故事的因果链）；
- 知道 `log_min_duration_statement` 与 pgBadger 的分工；
- 能独立跑一遍六项巡检清单并解读异常。

## 下一步

- [查询优化](/postgresql/250-QueryOptimization)：榜单揪出语句后，怎么读计划；
- [VACUUM 机制](/postgresql/210-VACUUMMechanism)与[autovacuum 调优](/postgresql/212-VACUUMAutovacuum)：死元组堆积的根治；
- [逻辑备份与 PITR](/postgresql/455-LogicalBackupPITR)：监控发现问题之后，兜底手段在备份。

## 参考与致谢

- PostgreSQL 官方文档 Chapter 28 Monitoring Database Activity、pg_stat_statements 扩展文档（PostgreSQL Licence）：<https://www.postgresql.org/docs/current/>
- pgBadger 官方文档（PostgreSQL Licence）：<https://pgbadger.darold.net/>
- 巡检清单为原创整理，指标语义已对照官方文档核校。
