---
order: 340
title: 慢查询日志：性能优化的起点
module: 'mysql'
category: 数据库
difficulty: intermediate
description: 慢查询日志从零到一：阈值参数、mysqldumpslow 与 pt-query-digest 分析、EXPLAIN 分析闭环，以及长连接环境下的采样陷阱与生产配置建议。
author: fanquanpp
updated: '2026-09-18'
related:
  - 'mysql/320-EXPLAINDetailed'
  - 'mysql/300-IndexStatsHistogram'
  - 'mysql/350-OptimizerTrace'
  - 'mysql/860-PerformanceTuningSecurity'
prerequisites:
  - 'mysql/320-EXPLAINDetailed'
---

## 前置知识

- 会用 EXPLAIN 看执行计划（[EXPLAIN 详解](/mysql/320-EXPLAINDetailed)）——本篇的分析闭环最后一环就是它。

## 为什么慢查询日志是一切的起点

性能优化最容易犯的错是"凭感觉"：听说分库分表牛就上分库分表，听说加索引好就乱加索引。正确的顺序永远是：

```text
发现慢（慢查询日志） → 定位慢在哪（EXPLAIN / 执行分析） → 针对性修复 → 验证前后对比
```

慢查询日志（slow query log）负责第一步：**用事实回答"哪些 SQL 慢、慢了多少、慢了多久"**。它是 MySQL 自带、开销可控、生产可开的能力——没有它，后续一切优化技能都没有用武之地。

## 开启与四个关键参数

```sql
-- 查看当前配置
SHOW VARIABLES LIKE 'slow_query%';
SHOW VARIABLES LIKE 'long_query_time';

-- 开启慢查询日志（无需重启）
SET GLOBAL slow_query_log = ON;
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';

-- 阈值：执行超过 1 秒的语句入日志（单位支持小数，如 0.2）
SET GLOBAL long_query_time = 1;

-- 未使用索引的语句也记录（即使没到时间阈值）
SET GLOBAL log_queries_not_using_indexes = ON;
```

参数解读与生产建议：

| 参数 | 建议值 | 理由 |
| --- | --- | --- |
| `long_query_time` | 0.5 到 1 秒起步，逐步收紧 | 设太低（如 0.01）日志会爆炸，先把最痛的抓出来 |
| `log_queries_not_using_indexes` | 排查期开，常态关 | 它能抓到"全表扫描"这种结构性问题，但高频小表查询会让日志量失控 |
| `log_throttle_queries_not_using_indexes` | 60（每分钟限流） | 配合上一项做限流，8.0 同名参数可配 |

修改 `SET GLOBAL` 后**已存在的连接不会感知阈值变化**，新连接才生效——连接池长开的生产环境尤其注意，必要时滚动重启应用让连接重建（这是"改了参数没效果"的头号原因）。

## 读一条慢日志

```text
# Time: 2026-09-18T09:15:42.123456Z
# User@Host: app_user[app_user] @  [10.0.3.17]  Id: 88231
# Query_time: 3.421882  Lock_time: 0.000123 Rows_sent: 20  Rows_examined: 4823110
SET timestamp=1763186142;
SELECT * FROM orders WHERE user_id = 100 ORDER BY created_at DESC LIMIT 20;
```

逐字段读法：

- `Query_time`：执行总时长——这是"病人发烧 3.4 度"；
- `Lock_time`：等锁时间——接近 Query_time 说明病根是锁竞争而不是执行慢，方向完全不同；
- `Rows_sent / Rows_examined`：**最关键的比例**。只发了 20 行却检查了 482 万行，比例 24 万比 1——典型的"没走对索引大海捞针"。反之如果两个数字接近还慢，瓶颈多半在返回数据量或服务器资源；
- `SET timestamp`：语句发起时刻，用于和业务监控对齐。

单条日志看个案，**规模化的瓶颈看分布**——这就需要分析工具。

## 分析工具：从 mysqldumpslow 到 pt-query-digest

**mysqldumpslow**（MySQL 自带）做聚类汇总：

```bash
# 按总耗时排序的前 10 类慢查询
mysqldumpslow -s t -t 10 /var/log/mysql/slow.log

# 常用参数：-s 排序键（t 总时长 / c 次数 / r 返回行 / at 平均时长）
#          -t N 只看前 N 条
```

它会把具体参数抽象成模式（`WHERE user_id = 100` 与 `= 200` 归为一类），输出"哪类语句"最耗资源。

**pt-query-digest**（Percona Toolkit，业界标准）更专业：

```bash
pt-query-digest /var/log/mysql/slow.log > digest-report.txt
```

报告的价值排序：按**总耗时**（Response time 占比）排名的语句指纹 > 每类的次数、平均/最耗时 > 样本执行计划。优化优先级永远看总耗时占比——一条每天跑 10 万次、每次 50ms 的语句，比一条每天一次 3 秒的语句更值得优化。

## 完整闭环：一次真实的优化演练

```sql
-- 1. 开启采样并制造慢查询
SET GLOBAL slow_query_log = ON;
SET GLOBAL long_query_time = 0.1;

-- （使用此前篇章建的 demo 表；数据量小时先放大，如插入 100 万行）

-- 2. 触发问题语句：函数套列 + 前置通配符双重失效
SELECT * FROM users WHERE LOWER(email) LIKE '%@example.com';

-- 3. 日志确认被抓到
--    Rows_examined 等于全表行数，Rows_sent 只有零星几条

-- 4. EXPLAIN 定位
EXPLAIN SELECT * FROM users WHERE LOWER(email) LIKE '%@example.com';
-- type=ALL：全表扫描。两个失效原因：
--   LOWER() 是函数索引课题（/mysql/290-FunctionalIndex）
--   前置 % 使 LIKE 无法走 B+ 树有序性

-- 5. 修复：后缀匹配 + 表达式归一
--    业务若是找域名后缀，改为正向存储域名冗余列或函数索引 + 后缀 LIKE
SELECT * FROM users WHERE LOWER(email) LIKE 'zhang%';   -- 前缀匹配可走索引

-- 6. 验证：日志里不再出现该指纹，Query_time 从秒级降到毫秒级
```

第 4 步体现闭环的价值：慢日志告诉你"谁病了"，EXPLAIN 告诉你"什么病"，修复后日志的消失就是"治愈证明"。

## 生产环境的采样策略

全天候全量开慢日志是有代价的（磁盘 IO 与文件膨胀），三种常见策略：

1. **常态低阈值**：`long_query_time=1` 全天开，日志按天轮转清理（logrotate），适合多数 OLTP 系统；
2. **按需排查**：平时关闭，出问题时开十分钟抓现场——缺点是抓不到"偶发性劣化"；
3. **采样限流**：配合 `log_throttle_queries_not_using_indexes` 与 `long_query_time=0.5`，在可观测性与开销间平衡，适合高并发大表环境。

配合监控时，把 `Slow_queries` 状态变量（`SHOW GLOBAL STATUS LIKE 'Slow_queries'`）接入指标面板，突增即告警——日志是深挖工具，趋势图是预警工具，两者配合。

## 常见困惑

**"日志里的 SQL 是执行完才写吗？执行中挂死能抓到吗？"**——写日志发生在执行结束时，执行到一半被 kill 的语句也会记录（带中断标记），但"卡了 10 分钟还在跑"的语句日志里没有它——那要用 `SHOW PROCESSLIST` 或 `performance_schema` 的运行中语句视图看。

**"Query_time 高但应用层没感觉慢？"**——三个方向：单次慢但低频（总影响小）；应用有缓存挡在前面；或 SQL 被重写/合并过。优化排序永远以业务视角的总影响为准。

**"能记录所有语句吗（general log）？"**——可以（`general_log`），但开销巨大只适合临时取证，与慢日志定位完全不同，别混用。

## 检验清单

- 能开启慢日志并说清四个关键参数的作用与生产建议值；
- 会读一条慢日志的五个字段，尤其能解读 Rows_sent / Rows_examined 比例的含义；
- 会用 mysqldumpslow 或 pt-query-digest 找出"总耗时最高"的语句类；
- 完整走过一次"抓到 → EXPLAIN → 修复 → 验证"的闭环。

## 下一步

EXPLAIN 看不懂 Extra 里的提示词时，还有终极武器能看到优化器的完整思考过程：[Optimizer Trace](/mysql/350-OptimizerTrace)。
