---
order: 310
title: 执行计划与索引联动：优化器为什么这么选
module: 'mysql'
category: 数据库
difficulty: advanced
description: 深水区专题：优化器的成本两要素、索引失效六大现场的失效与修复 SQL 对照、force index 的使用边界、EXPLAIN ANALYZE 实测与树状执行计划。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'mysql/320-EXPLAINDetailed'
  - 'mysql/270-IndexHintForceIndex'
  - 'mysql/310-IndexFailureScene'
  - 'mysql/300-IndexStatsHistogram'
prerequisites:
  - 'mysql/320-EXPLAINDetailed'
  - 'mysql/230-CompositeIndexLeftmostPrefixPrinciple'
---

## 前置知识

- 已完成 [EXPLAIN 逐列读懂](/mysql/320-EXPLAINDetailed)：会读 type/key/rows/Extra 四件套，见过「possible_keys 有值而 key 是 NULL」这个悬案。本文从解悬案开始；
- 读过 [联合索引与最左前缀](/mysql/230-CompositeIndexLeftmostPrefixPrinciple) 更好：知道 `(a, b)` 只能从 a 用起。没读过也能跟。

与 320 的分工：**320 教你逐列读懂 EXPLAIN——每列是什么意思；本文回答更难的一层——优化器为什么在两个计划之间选了那个看起来更差的**。读完你将能预测索引会不会被用上、修掉六大失效现场、判断 force index 何时是解药何时是毒药。

## 学习目标

读完本文你将能够：

1. 用「读页数 + 处理行数」两要素解释优化器的选择，包括为什么小表不走索引是正确的；
2. 对六大失效现场各写出失效 SQL 与修复 SQL，并用 EXPLAIN 验证；
3. 说出 force index 改变什么、不改变什么，以及三条使用边界；
4. 用 EXPLAIN ANALYZE 对比估算与实测，并读懂 FORMAT=TREE 树状计划。

预计 60 到 90 分钟，全程动手。

## 1. 你现在要解决什么问题

同事按 320 篇的三步定位跑完 EXPLAIN，回来找你：「这条查询 possible_keys 里明明有索引名，key 却是 NULL。索引坏了？还是 MySQL 疯了？」

都没坏。优化器不是「看见索引就用」，而是拿着统计信息算账的会计：每条候选路径估一个成本，挑最便宜的执行。它有时比你想得对（小表全表扫更快），有时算错（统计过期、分布偏斜）。本文两件事：看懂账本，账算错了怎么办。

## 2. 准备现场：一张 10 万行的对局记录表

```sql
CREATE TABLE match_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  player_id INT NOT NULL,
  mode VARCHAR(16) NOT NULL,
  match_code VARCHAR(20) NOT NULL,
  duration INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  KEY idx_player_time (player_id, created_at), KEY idx_mode (mode), KEY idx_code (match_code)
);

SET SESSION cte_max_recursion_depth = 200000;
INSERT INTO match_records (player_id, mode, match_code, duration, created_at)
WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 100000)
SELECT 1 + n % 500, IF(n % 3 = 0, 'ranked', 'casual'),
       CONCAT('M', LPAD(n, 10, '0')), 60 + n % 1800, DATE_ADD('2026-01-01 00:00:00', INTERVAL n MINUTE)
FROM seq;
```

10 万行对局：500 个玩家、两种模式、时间从 1 月 1 日起每分钟一局。注意 duration 和单独的 created_at 没有索引——两个空档正是后面的教案。

## 3. 优化器在算什么：成本两要素

优化器给每条候选路径估一个成本分，主要两项：

- **读页数**：翻多少个数据页。走索引是跳读，全表扫是翻整本——但跳 8 万次可能比翻一遍更贵，这就是账的意义；
- **处理行数**：排序、回表、JOIN 拼接要经手多少行，rows 与 filtered 是它的估算依据。

账本的关键输入是**统计信息**（区分度、分布）。统计过期账就歪——这是「计划选错」的第一大根因，[索引统计信息与直方图](/mysql/300-IndexStatsHistogram) 整篇讲它。成本分本身也能看：第 6 节输出里每个算子后面的 `cost=` 就是它。

## 4. 索引失效六大现场

判断标准：**失效 = 该走索引却全表扫，原因出在 SQL 写法破坏了索引结构**。每个现场给失效与修复对照，EXPLAIN 只摘 type/key 两项。

### 4.1 函数包裹列

```sql
-- 失效：索引存的是 created_at 原值，对列套函数等于拿打乱的钥匙找树
EXPLAIN SELECT COUNT(*) FROM match_records WHERE DATE(created_at) = '2026-03-01';
-- type: ALL      key: NULL

-- 修复：函数挪到常量一侧，改写成范围
EXPLAIN SELECT COUNT(*) FROM match_records
WHERE created_at >= '2026-03-01' AND created_at < '2026-03-02';
-- type: range    key: idx_player_time
```

1440 行的活儿从 10 万行里捞。改不了 SQL 时可用 8.0.13+ 的[函数索引](/mysql/290-FunctionalIndex)。

### 4.2 隐式类型转换

```sql
-- 失效：VARCHAR 列跟数字比较，列被转成数字，等价于整列套 CAST
EXPLAIN SELECT * FROM match_records WHERE match_code = 1;
-- type: ALL      key: NULL

-- 修复：常量写成同类型
EXPLAIN SELECT * FROM match_records WHERE match_code = 'M0000000042';
-- type: ref      key: idx_code
```

方向性记牢：**字符串列遇数字常量失效，数字列遇字符串常量不失效**（`player_id = '42'` 里是常量转数字，列没动）。

### 4.3 联合索引前导列缺失

```sql
-- 失效：只给 created_at 条件，等于跳过联合索引的前缀 player_id
EXPLAIN SELECT COUNT(*) FROM match_records WHERE created_at > '2026-03-01';
-- type: ALL      key: NULL

-- 修复：条件补回前缀
EXPLAIN SELECT COUNT(*) FROM match_records
WHERE player_id = 42 AND created_at > '2026-03-01';
-- type: range    key: idx_player_time
```

顺带读 key_len：比只按 player_id 等值查询更长，说明两列都吃上了。8.0 的 Skip Scan 有时能补救前缀缺失，但要求前缀区分度很低。

### 4.4 OR 断链

```sql
-- 失效：OR 一侧（duration）没有索引，整条弃用
EXPLAIN SELECT * FROM match_records WHERE player_id = 42 OR duration = 600;
-- type: ALL      key: NULL

-- 修复二：改写成每支各走各索引的 UNION（分别 EXPLAIN 两支可验证）
SELECT * FROM match_records WHERE player_id = 42
UNION
SELECT * FROM match_records WHERE duration = 600;
```

修复一是给 duration 补索引。UNION 第一支 range，第二支建索引前仍是 ALL——它只是把两笔账分开算。对照：OR 两侧都有索引时，优化器以 index_merge 合并两路结果。

### 4.5 LIKE 前缀通配

```sql
-- 失效：% 在开头，任何前缀都可能匹配，有序性作废
EXPLAIN SELECT * FROM match_records WHERE match_code LIKE '%0042';
-- type: ALL      key: NULL

-- 修复：保留前缀，通配符挪到后面
EXPLAIN SELECT * FROM match_records WHERE match_code LIKE 'M0000000042%';
-- type: range    key: idx_code
```

业务必须后缀匹配时，可存一列倒序副本建索引查前缀，或交给搜索引擎（挑战题会动手实现）。

### 4.6 数据弃用：不是失效，是算账

```sql
-- 范围覆盖全部 500 个玩家，走索引等于跳读 10 万次
EXPLAIN SELECT COUNT(*) FROM match_records WHERE player_id BETWEEN 1 AND 500;
-- type: ALL      key: NULL    possible_keys: idx_player_time
```

注意 possible_keys **有值**、key 是 NULL——优化器算完账决定从头翻一遍，这是正确决策，几行的小表同理。修复很反直觉：先检查业务，收窄范围后索引自然回来。

一条铁律：**索引是排好序的钥匙串——列被函数改写、类型被转换、前缀被跳过、条件断链、通配符吃掉前缀，钥匙就插不进锁**；钥匙好用却没被插，那是优化器在算账，两种情况处理方向不同。更全的失效目录见 [索引失效场景](/mysql/310-IndexFailureScene)。

## 5. force index：解药还是毒药

先给 duration 建上索引 `ALTER TABLE match_records ADD INDEX idx_duration (duration);`，再做机械演示——强制走 idx_player_time 后，`EXPLAIN SELECT * FROM match_records FORCE INDEX (idx_player_time) WHERE player_id = 42 OR duration = 600;` 的输出是：

```text
type: range    key: idx_player_time    Extra: Using where
```

访问路径被钉死在 idx_player_time，但 duration = 600 没被消灭，只是退化成回表后的过滤（Using where）。**force index 是「指定访问路径」，不是「优化条件」**。使用边界三条：

1. **只做止血**：确认优化器持续选错且有数据证据时才用，用 EXPLAIN ANALYZE 验证它真的更快；
2. **必须留案底**：hint 把今天的分布焊死进代码，数据量、分布、版本一变就可能从加速变灾难，review 里当债务标记；
3. **找根因**：统计过期就 ANALYZE TABLE，分布偏斜就上直方图，账本明细用 [优化器追踪](/mysql/350-OptimizerTrace) 打出来对。

force / ignore / use 的完整语法，[索引提示与强制索引](/mysql/270-IndexHintForceIndex) 专门展开。

## 6. EXPLAIN ANALYZE 与树状执行计划

320 篇反复强调 rows 是估算值。8.0.18+ 的 EXPLAIN ANALYZE 把估算变实测——**它会真正执行查询**，输出本身就是树状的（缩进越深越先执行）：

```sql
EXPLAIN ANALYZE
SELECT mr.match_code, p.name
FROM match_records mr JOIN players p ON p.id = mr.player_id
WHERE mr.mode = 'ranked';
```

预期输出（数值随机器不同，结构一致）：

```text
-> Nested loop inner join  (cost=41350 rows=33334) (actual time=0.3..85.2 rows=33334 loops=1)
    -> Index lookup on mr using idx_mode  (mode='ranked')  (cost=6735 rows=33334) (actual time=0.2..18.4 rows=33334 loops=1)
    -> Single-row index lookup on p using PRIMARY  (id=mr.player_id)  (cost=1 rows=1) (actual time=0.001..0.001 rows=1 loops=33334)
```

三个实测指标：**actual time**（首行与全部行耗时）、**actual rows**（实际返回行数）、**loops**（执行了几遍——看最内层，33334 次主键点查就是嵌套循环的代价）。**估算 rows 对比 actual rows，偏离大就怀疑统计信息**。EXPLAIN 只看计划不执行；EXPLAIN ANALYZE 是真跑，大查询与生产库要谨慎，只支持 SELECT 类语句。

## 7. 修改实验

以下每个先预测再运行，基于第 2 节的 match_records。

实验一：把 4.2 的修复再故意写反方向——`WHERE player_id = '42'`（数字列遇字符串常量），预测 key 是否仍非 NULL，验证方向性规则。

实验二：对 4.1 的修复 SQL，把上界误写成 `created_at <= '2026-03-02'`，跑 EXPLAIN ANALYZE 看 actual rows 多了几行，并解释哪一行被多算进了「3 月 1 日」。

## 8. 常见错误与调试实录

**错误一：拿估算 rows 下结论。** 症状：EXPLAIN 显示 rows=200，实际翻了 8 万行。定位三步：ANALYZE 取实测对比、刷新统计、复查计划。根因通常是统计过期或分布偏斜，不是索引坏了。

**错误二：在生产库对大表跑 EXPLAIN ANALYZE。** 它是真跑——10 万行的查询实打实执行一遍，带锁的读还占着锁。纪律：EXPLAIN 看计划（不执行）；ANALYZE 只在测试环境或低峰期对小结果集用。

**错误三：force index 当长期方案。** 三个月后数据涨十倍，当年「快 20 倍」的 hint 变成全索引扫描，没人敢删它。这与第 5 节的「留案底」同一条边界：hint 必须写明何时验证、依据什么数据。

## 9. 实际场景

**上线前 SQL 评审清单**：大表 type 低于 range 要给理由；Extra 出现 filesort / temporary 且 rows 大要给理由；possible_keys 有值而 key 为 NULL，要么解释成合理弃用，要么按六大现场修一遍。给不出的，打回。

**线上慢查询的完整路径**：[慢查询日志](/mysql/340-SlowQueryLog) 抓到慢 SQL，EXPLAIN 看四件套，命中失效现场按第 4 节修，疑似算错用 EXPLAIN ANALYZE 取证，确认后 force index 止血并查根因。

## 10. 小练习

预测题（5 分钟，先写答案再运行）：

```sql
EXPLAIN SELECT COUNT(*) FROM match_records WHERE player_id = 42;
```

预测 type、key，以及 Extra 会不会出现 Using index。答案自下而上：ref / idx_player_time / 会出现——索引叶子里存着（player_id, created_at, 主键），COUNT(*) 数主键不用回表。

挑战题（半小时，脱离示例）：运营后台要「按对局码末四位查对局」，即 `WHERE match_code LIKE '%0042'`。先跑 EXPLAIN 证实它全表扫；再从两条路径选一条实现，用 EXPLAIN 验证 key 非 NULL——路径一：加倒序副本列存 REVERSE(match_code) 并建索引；路径二：查 290 篇用函数索引或生成列。提示（思路方向）：把「后缀匹配」翻译成「另一列上的前缀匹配」。展开（关键 API）：`REVERSE()`、`GENERATED ALWAYS AS`。验收：type 不高于 range。

## 11. 与之前和之后的知识的关系

- 往前：[EXPLAIN 逐列读懂](/mysql/320-EXPLAINDetailed) 给了四件套读法，每个现场都用它取证；[联合索引与最左前缀](/mysql/230-CompositeIndexLeftmostPrefixPrinciple) 在 4.3 兑现；「possible_keys 有值而 key 为 NULL」的悬案在 4.6 结案；
- 往后：[索引提示与强制索引](/mysql/270-IndexHintForceIndex) 展开第 5 节完整语法；[索引统计信息与直方图](/mysql/300-IndexStatsHistogram) 深挖账本输入；[优化器追踪](/mysql/350-OptimizerTrace) 逐项对账；[JOIN 算法](/mysql/390-JOINAlgorithm) 讲透树里的连接算子。

## 12. 官方文档

- EXPLAIN 与 EXPLAIN ANALYZE：https://dev.mysql.com/doc/refman/8.4/en/explain.html
- 输出格式（含 FORMAT=TREE 的算子树）：https://dev.mysql.com/doc/refman/8.4/en/explain-output.html
- 索引提示（FORCE/IGNORE/USE INDEX）：https://dev.mysql.com/doc/refman/8.4/en/index-hints.html

## 13. 自我检查

- 能用「读页数 + 处理行数」解释一条全表扫描为什么可能是正确决策；
- 六大失效现场各能在一分钟内写出失效与修复 SQL，并说出 EXPLAIN 上验证哪两项；
- 能说出 force index 改变的是访问路径、不改变过滤条件，以及三条使用边界；
- 拿到 EXPLAIN ANALYZE 输出知道对比估算与实测，且记得它会在生产上真正执行。

## 本章总结

优化器是拿统计信息算账的会计，读页数与处理行数定成本。六大失效现场是 SQL 写法把钥匙掰弯了，修法是把列的原样和前缀还给索引；数据弃用是会计的正确决策，别用 force index 纠正一个没病的人；force index 只钉访问路径、不消灭条件，止血可以，焊死不行；EXPLAIN ANALYZE 把估算换成实测，偏离度就是统计信息的体检指标。

## 下一步

进入 [索引提示与强制索引](/mysql/270-IndexHintForceIndex)：把本文只用了一次的那把止血钳拆开，看清 force / ignore / use 的全部语义与翻车现场。想先补「谁在慢」的入口，也可以去 [慢查询日志](/mysql/340-SlowQueryLog)。
