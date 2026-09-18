---
order: 380
title: GROUP BY 与 ORDER BY 优化：告别 filesort
module: 'mysql'
category: 数据库
difficulty: advanced
description: 分组与排序的索引化路径：三种索引扫描策略（松散/紧凑/索引分组）、filesort 的单双路与内存机制、组合查询的临时表成因与设计检查单。
author: fanquanpp
updated: '2026-09-19'
related:
  - 'mysql/360-SubqueryOptimization'
  - 'mysql/370-DerivedTableOptimization'
  - 'mysql/230-CompositeIndexLeftmostPrefixPrinciple'
  - 'mysql/390-JOINAlgorithm'
prerequisites:
  - 'mysql/230-CompositeIndexLeftmostPrefixPrinciple'
  - 'mysql/320-EXPLAINDetailed'
---

## 前置知识

- 联合索引的有序性与最左前缀（[联合索引与最左前缀](/mysql/230-CompositeIndexLeftmostPrefixPrinciple)）——本篇是那条原理在分组排序场景的直接应用；
- 会读 EXPLAIN 的 Extra（[EXPLAIN 详解](/mysql/320-EXPLAINDetailed)）。

## 核心认知：GROUP BY 隐含一次排序

`GROUP BY dept_id` 在语义上要"把相同 dept_id 的行聚到一起"。行从哪里"聚"？最快的答案是：**如果数据本来就按 dept_id 有序（走了索引），顺序扫一遍边走边聚合，从头到尾不用打乱任何东西**；如果没有索引，MySQL 必须先建临时表分组、再排序输出——Extra 里那对恶名昭著的组合 `Using temporary; Using filesort` 就是这么来的。

所以本篇的优化只有一个主旋律：**让分组列和排序列落在索引的有序性上**。

## 三种索引扫描策略（GROUP BY 的三级火箭）

以索引 `(dept_id, salary)` 为例，从最优到次优：

```sql
-- 策略一：松散索引扫描（Loose Index Scan）—— 最快
SELECT dept_id, MIN(salary) FROM employees GROUP BY dept_id;
-- Extra: Using index for group-by
-- 原理：B+ 树里每个 dept_id 段的第一条就是 MIN、跳到段尾就是 MAX
-- 聚合时直接"跳跃"读每个分段的头尾，段内数据根本不碰
-- 条件苛刻：聚合仅限 MIN/MAX，且无其他复杂条件

-- 策略二：紧凑索引扫描（Tight/Tight Index Scan）
SELECT dept_id, COUNT(*) FROM employees GROUP BY dept_id;
-- 顺序扫整段索引边走边聚合（COUNT 需要数每行，无法跳跃）
-- 比松散慢，但仍是纯索引操作，无临时表

-- 策略三：无索引可走 —— 临时表 + filesort
SELECT name, COUNT(*) FROM employees GROUP BY name;
-- Extra: Using temporary; Using filesort
-- name 无索引：先物化进临时表分组，再排序输出
```

在 EXPLAIN 里认出它们：`Using index for group-by` 是松散扫描的专属徽章；出现 `Using temporary` 就说明数据被打乱了，值得回过头设计索引。

**8.0 的一个新自由**：`GROUP BY dept_id` 不再隐含排序（5.7 会顺手排序返回）。语义上不再依赖分组结果有序的话写 `ORDER BY NULL` 已无必要，但也意味着"碰巧有序"的依赖要显式写 ORDER BY。

## ORDER BY：与最左前缀的第二次握手

排序对索引有序性的利用规则与 WHERE 定位同源（[联合索引篇](/mysql/230-CompositeIndexLeftmostPrefixPrinciple) 的 ORDER BY 表），本篇补充三条工程要点：

```sql
-- 索引 (user_id, created_at)

-- 1. 等值前缀 + 排序列 = 黄金组合
SELECT * FROM orders WHERE user_id = 5 ORDER BY created_at DESC LIMIT 20;
-- 无 filesort，索引倒序扫描（Backward index scan）直接吐 20 行

-- 2. 混合方向：8.0 降序索引
CREATE INDEX idx_amt_time ON orders (amount ASC, created_at DESC);
SELECT * FROM orders ORDER BY amount ASC, created_at DESC;  -- 免 filesort

-- 3. 排序列上套表达式 = 前功尽弃
SELECT * FROM orders ORDER BY DATE(created_at);   -- Using filesort
```

### filesort 的内存机制

index 化失败时的兜底排序引擎有两种工作模式：

```text
< 8.0.20 常见术语（仍高频出现在面试与老文档里）：
  双路排序（回表排序）：只取 排序列+行指针 排序，排完逐行回表取数据
  单路排序（打包排序）：把 SELECT 的全部列打进 sort buffer 一次排完
  判据：行总宽超过 max_length_for_sort_data 时退回双路

8.0.20+ 实现重构为 pack/don't-pack 加 ADDITIONAL 字段打包，
效果等价：宽行打包不下就分批 + 归并
```

调参两级：`sort_buffer_size` 是**每个排序操作**的缓冲（与 [work_mem 每节点陷阱](/postgresql/250-QueryOptimization) 同款提醒，勿全局调大）；`max_length_for_sort_data` 影响打包策略。但真正有效的手段永远是"让 ORDER BY 走索引"，filesort 调参属于兜底。

## 组合场景：什么时候必须临时表

```sql
-- 顺路场景：分组列与排序列同源（索引 (dept_id, created_at)）
SELECT dept_id, COUNT(*) FROM orders
GROUP BY dept_id ORDER BY dept_id;         -- 索引有序直达，无临时表

-- 分叉场景：按聚合结果排序（业务高频：取订单最多的部门 TopN）
SELECT dept_id, COUNT(*) AS cnt FROM orders
GROUP BY dept_id ORDER BY cnt DESC LIMIT 10;
-- 必然 Using temporary; Using filesort：cnt 是算出来的，索引里不存在
-- 优化方向不是消除临时表，而是控制它的规模：
--   提前 WHERE 收窄（只算近 30 天）、覆盖索引让扫描不回表
```

判定口诀：**排序列能在"进入聚合之前"就确定有序 → 索引直达；排序列是聚合之后的产物（cnt/sum） → 临时表不可避免，转为控规模**。

## 动手环节：三级火箭亲测

```sql
-- 1. 造数据：50 万行，dept_id 倾斜、name 随机
CREATE TABLE grp_demo (
  id INT PRIMARY KEY AUTO_INCREMENT,
  dept_id INT, salary INT, name VARCHAR(20),
  KEY idx_ds (dept_id, salary)
);
SET SESSION cte_max_recursion_depth = 1000000;   -- 放开递归上限（默认 1000）
INSERT INTO grp_demo (dept_id, salary, name)
WITH RECURSIVE t(n) AS
  (SELECT 1 UNION ALL SELECT n + 1 FROM t WHERE n < 500000)
SELECT n % 50, 5000 + n % 20000, CONCAT('emp', n % 100000) FROM t;

-- 2. 松散扫描：MIN 命中魔法
EXPLAIN SELECT dept_id, MIN(salary) FROM grp_demo GROUP BY dept_id;
-- Extra: Using index for group-by

-- 3. 紧凑扫描：COUNT 退一级
EXPLAIN SELECT dept_id, COUNT(*) FROM grp_demo GROUP BY dept_id;
-- Extra: Using index（无 temporary！索引序扫描边走边数）

-- 4. 无索引分组：临时表现身
EXPLAIN SELECT name, COUNT(*) FROM grp_demo GROUP BY name;
-- Extra: Using temporary; Using filesort

-- 5. 排序黄金组合 vs filesort 对照
EXPLAIN SELECT * FROM grp_demo WHERE dept_id = 5 ORDER BY salary DESC LIMIT 3;
-- Backward index scan，无 filesort
EXPLAIN ANALYZE SELECT name, COUNT(*) cnt FROM grp_demo
GROUP BY name ORDER BY cnt DESC LIMIT 3;
-- 观察 temporary/filesort 的实际耗时占比
```

## 常见困惑

**"Using temporary 一定是坏事吗？"**——不一定，是"有成本"而非"有错误"。小结果集的临时表在内存里完成（[内部临时表机制](/mysql/370-DerivedTableOptimization)），代价可忽略；要警惕的是大表分组 + 溢盘的组合。用 EXPLAIN ANALYZE 看实际耗时，别只盯警告旗。

**"GROUP BY 列没索引，但结果集很小，怎么办？"**——照样会全表扫。小表无所谓；大表的话要么补索引，要么考虑汇总表（物化分组结果，定时刷新）——高频聚合查询的工程终解。

**"ONLY_FULL_GROUP_BY 报错和性能有关吗？"**——无关，是语义严格性（非分组列必须出现在聚合里）。它防止的是"侥幸依赖 MySQL 宽松模式返回不确定值"的老代码；修法是把非聚合列包进 `ANY_VALUE()` 或改写查询，不是关掉该模式。

## 检验清单

- 能解释"GROUP BY 隐含排序"与 `Using temporary; Using filesort` 的因果关系；
- 能默写三种扫描策略的条件与 EXPLAIN 标志（重点：松散扫描的 MIN/MAX 限定）；
- 理解 filesort 打包/回表两模式与 sort_buffer_size 的每操作属性；
- 掌握"排序列是聚合产物时转控规模"的判定口诀；
- 完成三级火箭实验，亲眼见过 Using index for group-by。

## 下一步

排序分组的成本常常发生在连接之后：进入 [JOIN 算法](/mysql/390-JOINAlgorithm)，看 Nested Loop/Hash Join 三种连接引擎的取舍。
