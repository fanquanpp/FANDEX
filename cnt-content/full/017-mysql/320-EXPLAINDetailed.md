---
order: 340
title: EXPLAIN 逐列读懂：执行计划是查询的体检报告
module: 'mysql'
category: 数据库
difficulty: intermediate
description: 以「测试库 5 毫秒、生产 5 秒」引入：逐列读懂 EXPLAIN 的 type 优劣阶梯、key/rows/filtered 读法与 Extra 关键信号，附全表扫描三步定位与误读清单。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'mysql/330-MySQLIndexExecutionPlan'
  - 'mysql/230-CompositeIndexLeftmostPrefixPrinciple'
  - 'mysql/340-SlowQueryLog'
  - 'mysql/350-OptimizerTrace'
prerequisites:
  - 'mysql/110-SQLDataOperationQuery'
  - 'mysql/220-ClusteredIndexSecondaryIndex'
---

## 前置知识

- 已完成 [SQL 数据操作与查询](/mysql/110-SQLDataOperationQuery)：手里有那张 `players` 排行榜表。本文所有示例都建立在它之上，建表脚本见该篇第 2 节，不重复给出；
- 读过 [聚簇索引与二级索引](/mysql/220-ClusteredIndexSecondaryIndex) 更好：知道「索引让查询变快」和「回表」。没读过也能跟，出现处就地补课。

本篇与 [执行计划与索引联动](/mysql/330-MySQLIndexExecutionPlan) 的分工：**320 教你逐列读懂 EXPLAIN 的输出；330 回答优化器为什么这么选**——成本怎么算、索引为什么失效、什么时候该 force index。读列是基本功，先来。

## 学习目标

读完本文你将能够：

1. 从 type/key/rows/Extra 四件套读出「扫多少行、走没走索引、有什么隐患」；
2. 背出 type 阶梯 const → eq_ref → ref → range → index → ALL，并给每一级写出对应的 SQL；
3. 看到 Using index / Using filesort / Using temporary 时说出各是什么信号、下一步查什么；
4. 按「定量级、找根因、复查实测」三步定位一条全表扫描查询。

预计 60 分钟，全程动手。

## 1. 你现在要解决什么问题

排行榜有一条「查询等级 8 的玩家」的 SQL：测试库 5 毫秒返回，生产库 5 秒才吐数据。同事说「加索引」，你说「重写 SQL」。都先停一下——**先别改代码，让 EXPLAIN 说话**。它是 MySQL 自带的体检报告，访问方式、走不走索引、扫多少行全在上面。拿不准报告就动手术，大概率白挨一刀。

## 2. 准备现场：把排行榜灌成生产规模

EXPLAIN 在 4 行的小表上也能跑，但看不出量级差别。先把 110 篇的 `players` 灌成 10 万行：

```sql
USE test;   -- 110 篇的 players 表应该已经在这里

SET SESSION cte_max_recursion_depth = 200000;
INSERT INTO players (name, score, level)
WITH RECURSIVE seq(n) AS (
  SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 100000
)
SELECT CONCAT('玩家', n), 100 + n % 3000, 1 + n % 20
FROM seq;

ALTER TABLE players ADD INDEX idx_level (level);
ALTER TABLE players ADD INDEX idx_score (score);

CREATE TABLE teams (id INT PRIMARY KEY AUTO_INCREMENT, team_name VARCHAR(30) NOT NULL);
INSERT INTO teams (team_name) VALUES ('雷霆战队'), ('疾风战队');
ALTER TABLE players ADD COLUMN team_id INT NULL;
UPDATE players SET team_id = 1 + id % 2;
```

递归 CTE 只是「批量生成序号」的工具，先混个眼熟，语法在 [SQL 函数与高级查询](/mysql/130-SQLFunctionAndAdvancedQuery) 展开。先灌数据再建索引不是必须，反过来则每插一行都要维护一次索引，正好体会「写放大」。现在表里有 10 万零几行玩家，level 均匀分布在 1 到 20。

## 3. 第一次见面：12 列报告怎么读

```sql
EXPLAIN SELECT * FROM players WHERE id = 3;
```

用 `\G` 竖着看更清楚，预期输出：

```text
*************************** 1. row ***************************
           id: 1
  select_type: SIMPLE
        table: players
   partitions: NULL
         type: const
possible_keys: PRIMARY
          key: PRIMARY
      key_len: 4
          ref: const
         rows: 1
     filtered: 100.00
        Extra: NULL
```

12 个列，一句话读法：

| 列 | 读法 |
| --- | --- |
| id / select_type / table | 第几个查询块、什么性质、访问哪张表 |
| type | 访问方式，最重要的一列，下一节展开 |
| possible_keys | 手头可用的索引，只是候选 |
| key | 实际选用的索引，NULL 就是没走索引 |
| key_len | 真正用到的索引字节数，核对联合索引用了前几列（230 篇） |
| ref | 跟索引比对的值来自哪里 |
| rows | 估算要扫描的行数，是估算不是实测 |
| filtered | 被 WHERE 筛掉后剩下的比例 |
| Extra | 补充说明，好坏信号都在这里 |

日常排查九成情况只看 **type / key / rows / Extra 四件套**。本条报告翻译成人话：按主键直接定位一行，扫 1 行，没有额外动作——最好的一档。

## 4. type：访问类型的优劣阶梯

type 有十几个取值，先掌握主干阶梯（全表见官方文档），从优到差：

```text
system（表只有一行的特例，InnoDB 用户表看不到，认得即可）
const > eq_ref > ref > range > index > ALL
```

口诀：**点查最好，范围次之，全量扫描垫底**；线上大表的高频查询至少 range。以下摘录只保留四件套对应行；rows 是估算值、以你的数据为准，type/key/Extra 的结论稳定。

**const**：主键或唯一索引等值点查，一次定位一行——第 3 节那条 `WHERE id = 3` 就是它。

**eq_ref**：JOIN 时被驱动表按主键或唯一索引命中，一次一行：

```sql
EXPLAIN SELECT p.name, t.team_name
FROM players p JOIN teams t ON t.id = p.team_id
WHERE p.id = 3;
```

```text
table: p      type: const     key: PRIMARY      rows: 1
table: t      type: eq_ref    key: PRIMARY      rows: 1
```

p 主键点查（const），t 靠 p 带来的 team_id 走主键（eq_ref）。

**ref**：非唯一索引上的等值查询，可能命中若干行：

```sql
EXPLAIN SELECT * FROM players WHERE level = 8;
```

```text
type: ref      key: idx_level    rows: 约 5000
```

20 个等级均分 10 万行，估 5000 行——比全表省 95%。

**range**：索引范围扫描，`>`、`<`、`BETWEEN`、`IN` 都算：

```sql
EXPLAIN SELECT * FROM players WHERE score > 2900;
```

```text
type: range    key: idx_score    rows: 约 3300
```

**index**：扫描整棵索引树，扫描量仍是全量，某些场景比 ALL 还慢：

```sql
EXPLAIN SELECT level FROM players;
```

```text
type: index    key: idx_level    rows: 约 100000    Extra: Using index
```

**ALL**：全表扫描，一行行翻：

```sql
EXPLAIN SELECT * FROM players WHERE name = '玩家8';
```

```text
type: ALL      key: NULL         rows: 约 100000    Extra: Using where
```

第 9 节会修掉这条 ALL。

## 5. key、rows、filtered：三个数字怎么读

**key** 是裁决书：实际用了哪个索引。possible_keys 有候选、key 却是 NULL，说明优化器算完账弃用了它——不是「失效」，账本在 330 篇展开。

**rows** 是预估的工作量，基于统计信息，不是精确值。和实际差几个数量级时，先 `ANALYZE TABLE players;` 刷新统计再下结论。

**filtered** 是「筛完还剩多少」的百分比，要和 rows 相乘才有意义：

```sql
EXPLAIN SELECT * FROM players WHERE name LIKE '玩家8%' AND level = 8;
```

```text
type: ref      key: idx_level    rows: 约 5000    filtered: 5.00    Extra: Using where
```

idx_level 先砍到约 5000 行；name 没索引可走，由 server 层再过滤——filtered 5.00% 说的就是这一步：5000 × 5% ≈ 250 行活到最后。

## 6. Extra：四个关键信号

**Using index**：好信号。查询要的列索引里全有，不用回表（回表 = 拿主键回聚簇索引再捞整行，见 220 篇）：

```sql
EXPLAIN SELECT score FROM players WHERE score > 2900;
```

```text
type: range    key: idx_score    Extra: Using index
```

**Using where**：中性信号，server 层还要再过滤一遍（上一节那条输出就是它），结合 rows 判断是否可接受。

**Using filesort**：警惕信号。排序没吃上索引的顺序，要额外排一次（小结果集在内存，大了可能落盘）：

```sql
EXPLAIN SELECT name, score FROM players
WHERE team_id = 1 ORDER BY score DESC LIMIT 5;
```

```text
type: ALL      key: NULL    Extra: Using where; Using filesort
```

team_id 没索引，先全表捞再排序。建联合索引 `(team_id, score)` 即消，原理见 230 篇。

**Using temporary**：警惕信号，分组用了内部临时表，常见于无索引可依的 GROUP BY / DISTINCT，修法同 filesort。

## 7. 修改实验

以下每个先预测再运行，基于第 2 节的现场。

实验一：把 `WHERE level = 8` 改成 `WHERE level BETWEEN 5 AND 8`，预测 type 和 rows 各怎么变（提示：等值变范围）。

实验二：建完 idx_name（第 9 节会建）后，跑 `EXPLAIN SELECT id FROM players WHERE name = '玩家8';`，预测 Extra 会不会出现 Using index。提示：想想二级索引的叶子里除了 name 还躺着一列什么。

## 8. 常见错误与调试实录

**误读一：type=ALL 就是慢。** 未必。几十行的小表全表扫比绕一趟索引更快，看 rows 的量级，不看 type 的字面值。

**误读二：key 有值就是快。** type=index 是全索引扫描，扫描量同样是全量，某些场景比 ALL 还慢。

**误读三：把 rows 当精确值。** 严重失真时（实际 10 行估成 10 万），先 ANALYZE TABLE，再用 330 篇的 EXPLAIN ANALYZE 拿实测值。

**误读四：Using filesort 就要落盘。** 它只是「额外排序」的名字，小结果集在内存排完，先看 rows。

调试实录：同事说「明明建了索引，查询还是扫全表」。他的 EXPLAIN 里 possible_keys 躺着索引名，key 却是 NULL——索引没坏，是优化器算完账弃用了它。六大弃用现场与 force index，是 330 篇的正题。

## 9. 实际场景：一条全表扫描查询的三步定位

第 4 节末尾那条 `WHERE name = '玩家8'` 就是开头那条 5 秒的查询，三步修好：

**第一步：EXPLAIN 定量级。** type=ALL、key=NULL、rows 约 10 万——量级问题确认，不是网络不是锁，是访问方式。

**第二步：判断根因。** possible_keys 为 NULL，说明手头就没有可用索引——不是「索引失效」（失效时 possible_keys 通常有值），是压根没建：

```sql
ALTER TABLE players ADD INDEX idx_name (name);
```

**第三步：复查与实测。** 再跑一次 EXPLAIN：

```text
type: ref      key: idx_name    rows: 1
```

10 万行变 1 行，用真实执行计时收尾。两件事别忘：加索引不是免费的，每次写入都要多维护一棵树；生产上别等用户报警，[慢查询日志](/mysql/340-SlowQueryLog) 会把这类查询自动送到你面前。

## 10. 小练习

预测题（5 分钟，先写答案再运行）：

```sql
EXPLAIN SELECT id FROM players WHERE score > 2900;
```

预测 type、key、Extra 三项。答案自下而上：range / idx_score / Using index——二级索引的叶子里本来就存着主键，查 id 不用回表。

修改题（10 分钟）：建一个索引，让下面这条查询的 Extra 不再出现 Using filesort：

```sql
EXPLAIN SELECT name, score FROM players
WHERE level = 8 ORDER BY score DESC LIMIT 10;
```

提示：一个索引同时负责过滤列和排序列（[联合索引的列顺序](/mysql/230-CompositeIndexLeftmostPrefixPrinciple)）。验收：新 EXPLAIN 的 Extra 不含 filesort。

修 Bug 题（15 分钟）：同事报告「排行榜翻到深页越来越慢」，SQL 是 `SELECT name, score FROM players ORDER BY score DESC LIMIT 10 OFFSET 99990;`。先 EXPLAIN 看 rows，再回答为什么 OFFSET 越大越慢（LIMIT 语义见 [DQL](/mysql/120-DQL)；OFFSET 是白翻的行数）。

挑战题（半小时，脱离示例）：把三步定位写成 checklist——每步写「看哪个列、出现什么值、下一步做什么」，覆盖 type=ALL、key=NULL、Using filesort、Using temporary 四种现场，拿本文任何一条示例 SQL 自测一遍。

## 11. 什么时候应该 / 不应该这样用

应该：慢 SQL 动手改之前先 EXPLAIN；上线前对高频新查询跑一遍四件套；rows 与实际明显对不上时 ANALYZE TABLE。

不应该：看到 type=ALL 无脑加索引；把估算的 rows 当精确值写进报告；把小表上的结论直接套到大表。

## 12. 与之前和之后的知识的关系

- 往前：[SQL 数据操作与查询](/mysql/110-SQLDataOperationQuery) 建的 players 表是本文现场；[聚簇索引与二级索引](/mysql/220-ClusteredIndexSecondaryIndex) 的回表概念在 Using index 一节兑现；联合索引在 filesort 一节露了一手；
- 往后：[执行计划与索引联动](/mysql/330-MySQLIndexExecutionPlan) 分工明确——**320 教读列，330 讲优化器为什么这么选**：成本两要素、六大失效现场、force index、EXPLAIN ANALYZE 都从 330 开始；
- 更远：[优化器追踪](/mysql/350-OptimizerTrace) 把成本账本逐行打出来，[慢查询日志](/mysql/340-SlowQueryLog) 负责「谁在慢」的自动发现。

## 13. 官方文档

- EXPLAIN 语法（含 FORMAT=TREE/JSON、EXPLAIN ANALYZE 概览）：https://dev.mysql.com/doc/refman/8.4/en/explain.html
- 输出列与 Extra 全表（fulltext/index_merge 等取值在这里查）：https://dev.mysql.com/doc/refman/8.4/en/explain-output.html

## 14. 自我检查

- 能默写 type 阶梯顺序，说出「大表高频查询至少 range」的基准；
- 面对一条 EXPLAIN，30 秒内读出四件套结论；
- 能区分「possible_keys 为 NULL」（没索引可走）与「possible_keys 有值而 key 为 NULL」（优化器弃用）；
- 记得 rows 是估算值，知道失真时第一步做什么。

## 本章总结

EXPLAIN 是查询的体检报告，日常只看四件套：type 定访问方式档位（const > eq_ref > ref > range > index > ALL），key 定有没有走索引，rows 定工作量量级（估算值），Extra 给好坏信号（Using index 好事，filesort 与 temporary 是待办）。修法永远是先读报告再动手术。但报告只是「打算怎么干」，优化器为什么这么打算，下一篇拆账本。

## 下一步

进入 [执行计划与索引联动](/mysql/330-MySQLIndexExecutionPlan)：带着四件套的读法，去拆优化器的成本账本——为什么有索引不用、六大失效现场怎么修、force index 什么时候该出手。
