---
order: 370
title: 慢查询日志：性能优化的起点
module: 'mysql'
category: 数据库
difficulty: intermediate
description: 慢查询日志从零到一：阈值参数、mysqldumpslow 与 pt-query-digest 分析、EXPLAIN 分析闭环，以及长连接环境下的采样陷阱与生产配置建议。
author: fanquanpp
updated: '2026-11-17'
related:
  - 'mysql/320-EXPLAINDetailed'
  - 'mysql/300-IndexStatsHistogram'
  - 'mysql/350-OptimizerTrace'
  - 'mysql/335-ObservabilitySystemSchemas'
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

## SHOW PROFILE

> 版本注：`SHOW PROFILE`/`SHOW PROFILES` 属官方已废弃接口（8.0 起文档标注 deprecated，随时可能移除），本文保留以帮读者看懂存量脚本；新排查请用 Performance Schema——`events_statements_history_long` 看语句清单，`events_stages_history_long` 看各阶段耗时，能力是 profile 的超集。

<!-- 来源：62c90663 版 cnt-content/full/017-mysql/860-PerformanceTuningSecurity.md 小节「SHOW PROFILE」 -->

**基本写法：开启 profile**
`SET profiling = 1;`

```sql
-- 启用查询性能分析
SET profiling = 1;
```

**基本写法：查看 profile 列表**
`SHOW PROFILES;`

```sql
-- 查看最近执行的查询及 Query_ID
SHOW PROFILES;
```

**基本写法：查看单条查询详情**
`SHOW PROFILE [CPU|BLOCK IO|ALL] FOR QUERY <Query_ID>;`

```sql
-- 查看指定查询各阶段耗时
SHOW PROFILE CPU FOR QUERY 1;
-- 查看所有资源使用
SHOW PROFILE ALL FOR QUERY 1;
```

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

## 教学自检（先遮住代码自己写，再对照）

遮码自检法：先只读题干，自己写/自己答，再展开参考答案对照。

1. 写出配置：慢日志常驻开启、阈值 1 秒、记录未走索引的查询。每个参数"开错了"的代价是什么？

参考答案（先自己写，再对照）：

```ini
[mysqld]
slow_query_log = 1
long_query_time = 1
log_queries_not_using_indexes = 1
```

阈值过低（如 0.1）会让日志被正常业务噪音淹没，磁盘 IO 反成新瓶颈；不开 not_using_indexes 会漏掉"没超时但每次多扫几十万行"的隐形消耗；忘了轮转（logrotate）则日志文件无限膨胀。"抓什么"与"抓多少"是同一道权衡。

2. 概念自问：慢日志里 `Rows_examined` 是 20 万、`Rows_sent` 是 10——这个比例告诉你什么？

参考答案（先自己答，再对照）：扫了 20 万行只送回 10 行，过滤效率约 1/20000——要么缺索引（全表捞），要么索引选择性差（捞出一大把再过滤）。比例是比绝对耗时更本质的诊断信号：耗时受硬件波动，比例直接暴露"查询形状"与数据的关系。修复方向从比例推出：补/换索引，或改写查询缩小扫描面。

3. 判断题：慢日志在语句执行到一半卡死时也会记录，所以能抓到"正在卡住"的查询。

参考答案（先自己答，再对照）：写日志发生在执行结束时——还在跑的语句日志里没有它。执行中途被 kill 的语句会带中断标记出现，但"已经卡了 10 分钟还在跑"的现场要用 `SHOW PROCESSLIST` 或 performance_schema 的运行中语句视图实时看。日志管"事后复盘"，PROCESSLIST 管"现场急救"，两套工具别互相顶替。

4. 概念自问：为什么"找出总耗时最高的语句类"比"找出单次最慢的语句"更接近优化目标？

参考答案（先自己答，再对照）：数据库的负载由语句类 × 频次构成。单次 0.2 秒但每秒执行 500 次的查询，对系统的总压力远大于单次 5 秒、每天一次的报表。mysqldumpslow/pt-query-digest 按"总耗时/总行数"聚合语句类，正是把注意力引到累计影响最大处——按单次耗时排序会永远在救偶发的长尾。

## 检验清单

- 能开启慢日志并说清四个关键参数的作用与生产建议值；
- 会读一条慢日志的五个字段，尤其能解读 Rows_sent / Rows_examined 比例的含义；
- 会用 mysqldumpslow 或 pt-query-digest 找出"总耗时最高"的语句类；
- 完整走过一次"抓到 → EXPLAIN → 修复 → 验证"的闭环。

## 下一步

EXPLAIN 看不懂 Extra 里的提示词时，还有终极武器能看到优化器的完整思考过程：[Optimizer Trace](/mysql/350-OptimizerTrace)。

### 配置的两个补充参数

```sql
-- 至少扫描多少行才记录（过滤掉小表误报）
SET GLOBAL min_examined_row_limit = 100;

-- 日志写表还是写文件（写表方便 SQL 分析，写文件方便工具采集）
SET GLOBAL log_output = 'TABLE';     -- 后 SELECT * FROM mysql.slow_log
SET GLOBAL log_output = 'FILE';      -- 后走 slow_query_log_file
```

`min_examined_row_limit` 解决「小表全扫天然快却刷屏」的问题——扫描行数不到 100 的不记；`log_output=TABLE` 的取舍：SQL 直接分析方便，但表写日志在高并发下比文件慢且占数据目录空间——常态用 FILE，专项排查期临时切 TABLE。

### 三个典型慢查询的优化案例

```sql
-- 案例 1：全表扫描 -> 加索引（最常见的结构性慢因）
-- 慢：EXPLAIN 显示 type=ALL, rows=1000000
SELECT * FROM orders WHERE customer_id = 1001;
CREATE INDEX idx_customer ON orders(customer_id);
-- 优化后：type=ref, rows=50

-- 案例 2：索引列套函数 -> 改写查询或函数索引
-- 慢：YEAR() 让索引失效，type=ALL
SELECT * FROM users WHERE YEAR(created_at) = 2024;
-- 改写为范围条件（索引可用）：
SELECT * FROM users
WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01';
-- 或 8.0.13+ 直接建函数索引：
CREATE INDEX idx_year ON users ((YEAR(created_at)));

-- 案例 3：OR 两侧不同列 -> UNION 改写
-- 慢：OR 让优化器只能全表扫
SELECT * FROM orders WHERE customer_id = 1001 OR status = 'urgent';
-- 改写为两条各走各的索引：
SELECT * FROM orders WHERE customer_id = 1001
UNION
SELECT * FROM orders WHERE status = 'urgent' AND customer_id != 1001;
```

三个案例分别对应三类根因：无索引可用（建索引）、索引被表达式废掉（改写或函数索引，原理见 [索引失效场景](/mysql/310-IndexFailureScene) 与 [函数索引](/mysql/290-FunctionalIndex)）、优化器无法为 OR 组合索引（改写为 UNION 让每条各自命中）。分析闭环的完整流程（日志找嫌疑、EXPLAIN 定位、改造、三件套复测）见 [系统库与可观测](/mysql/335-ObservabilitySystemSchemas) 的例子二。
