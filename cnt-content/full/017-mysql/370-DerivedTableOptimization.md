---
order: 370
title: 派生表优化：合并、物化与 LATERAL
module: 'mysql'
category: 数据库
difficulty: advanced
description: FROM 子查询的优化器行为：合并与物化两条路线的条件、derived_merge 开关、LATERAL 派生表的正确用法与性能调优检查单。
author: fanquanpp
updated: '2026-09-19'
related:
  - 'mysql/360-SubqueryOptimization'
  - 'mysql/380-GroupByOrderByOptimization'
  - 'mysql/390-JOINAlgorithm'
  - 'mysql/350-OptimizerTrace'
prerequisites:
  - 'mysql/150-AdvancedQueryMultiTableOperation'
  - 'mysql/320-EXPLAINDetailed'
---

## 前置知识

- 子查询基础与 EXPLAIN 读法（[子查询优化](/mysql/360-SubqueryOptimization)、[EXPLAIN 详解](/mysql/320-EXPLAINDetailed)）。

## 派生表是什么：FROM 里的子查询

```sql
SELECT dept_id, avg_salary
FROM (
  SELECT dept_id, AVG(salary) AS avg_salary
  FROM employees
  GROUP BY dept_id
) AS dept_avg          -- 这个 dept_avg 就是派生表（derived table）
WHERE avg_salary > 50000;
```

派生表（也叫内联视图、子查询表）没有被优化器处理之前，语义上是一个"临时结果集"。优化器对它有两条处理路线，性能差异巨大：

```text
路线一：合并（merge）  把派生表"展开"融进外层查询，像它不存在一样优化
路线二：物化（materialize）  真的先执行子查询，结果存进临时表再参与外层
```

## 合并：让派生表"消失"

能合并时优化器默认合并（8.0 的 `derived_merge=on`）。合并后优化器可以把外层的条件下推、索引选择照常进行：

```sql
-- 合并成立的例子（派生表是简单投影/过滤）
SELECT * FROM (
  SELECT id, name FROM users WHERE age > 18
) t WHERE name LIKE '张%';
-- 合并后等价于：SELECT id, name FROM users WHERE age > 18 AND name LIKE '张%'
-- 两个条件直接命中 users 表的索引，零临时表成本
```

合并的生效条件是"派生表足够简单"。以下任一特征出现，合并被放弃，强制物化：

- `GROUP BY` / `DISTINCT` / 聚合函数
- `LIMIT` / `OFFSET`
- `UNION`
- 窗口函数
- 用户变量赋值

注意合并的语义边界：上面 GROUP BY 的例子，合并其实发生在"外层条件变成 HAVING"的意义上（外层条件融入聚合后的过滤），而非无条件摊平——理解到"外层 WHERE 变成对聚合结果的过滤"即可。

### 物化成立时：如何减小代价

物化不可免时（聚合/去重类派生表），三个瘦身手段：

```sql
-- 手段一：派生表只选必要列（物化临时表按列宽度占用内存/磁盘）
SELECT d.dept_id, d.avg_sal
FROM (SELECT dept_id, AVG(salary) AS avg_sal FROM employees
      GROUP BY dept_id) d          -- 只选两列，不要 SELECT *

-- 手段二：条件尽量推进派生表内部（物化前先缩小数据集）
FROM (SELECT dept_id, AVG(salary) AS avg_sal FROM employees
      WHERE hired_at > '2024-01-01'      -- 外层用不到的行别进临时表
      GROUP BY dept_id) d

-- 手段三：为派生表内的大 GROUP BY 配索引列（分组走索引松散扫描）
```

物化在 EXPLAIN 里的标志：`select_type = DERIVED`，8.0 里物化结果还会有 `<!-- 派生表 -->` 的执行节点。`EXPLAIN FORMAT=TREE`（8.0.16+）读起来最直观。

### derived_merge 开关：最后才碰

```sql
SET optimizer_switch = 'derived_merge=off';   -- 会话级关闭合并，强制物化
```

极少数场景需要它：派生表里的 `LIMIT` 语义被合并破坏时的规避、老代码的执行计划回归测试。它是诊断工具不是优化手段——**先怀疑派生表写法，再怀疑开关**。

## LATERAL：关联派生表的正规军

派生表默认"看不见"外层的列——直到 8.0.14 引入 `LATERAL`：

```sql
-- 需求：每个部门取薪资最高的前 2 名
-- 普通派生表做不到（无法引用外层 d.dept_id），LATERAL 可以：
SELECT d.dept_name, t.*
FROM departments d
CROSS JOIN LATERAL (
  SELECT id, name, salary
  FROM employees e
  WHERE e.dept_id = d.dept_id          -- 引用了外层列：LATERAL 的核心能力
  ORDER BY salary DESC
  LIMIT 2
) t;
```

性能关键：LATERAL 派生表**对外层每一行执行一次**（这是它的定义），本质是关联执行——与 [关联子查询](/mysql/360-SubqueryOptimization) 同样的复杂度陷阱。上面查询能跑得快的唯一原因是：`employees(dept_id, salary)` 上有联合索引，"每部门取 top 2"变成索引上的两次定位。**LATERAL + LIMIT N + 匹配的索引 = 高效 TopN-per-group**；缺索引就是全表扫描乘以外层行数。

## 动手环节：观察合并与物化的分界

```sql
-- 1. 可合并：简单过滤投影
EXPLAIN SELECT * FROM (
  SELECT id, user_id FROM orders WHERE amount > 100
) t WHERE user_id = 5;
-- select_type = SIMPLE（派生表被合并，EXPLAIN 里只剩一张表）

-- 2. 不可合并：加 GROUP BY 强制物化
EXPLAIN SELECT * FROM (
  SELECT user_id, COUNT(*) AS cnt FROM orders GROUP BY user_id
) t WHERE cnt > 3;
-- select_type = DERIVED：真物化了

-- 3. 验证合并下推：第 1 步的查询用 EXPLAIN ANALYZE 确认条件作用于基表
EXPLAIN ANALYZE SELECT * FROM (
  SELECT id, user_id FROM orders WHERE amount > 100
) t WHERE user_id = 5;
-- 计划里 amount 与 user_id 两个条件都落在 orders 的索引访问上

-- 4. LATERAL TopN（建好索引后对比有无索引的性能）
CREATE INDEX idx_user_amt ON orders (user_id, amount DESC);
EXPLAIN ANALYZE
SELECT t.* FROM users u
CROSS JOIN LATERAL (
  SELECT id, amount FROM orders o
  WHERE o.user_id = u.id ORDER BY amount DESC LIMIT 2
) t LIMIT 10;
```

第 1 步是理解合并的钥匙：**EXPLAIN 里连派生表的影子都没有**（SIMPLE），优化器把它完全消化了；第 2 步则是它"消化不了"时的真身（DERIVED）。

## 常见困惑

**"视图和派生表什么关系？"**——普通视图在查询时展开成派生表，走同一套合并/物化逻辑；`CREATE VIEW ... AS SELECT` 的视图能被合并时性能与手写子查询无异。所以"视图慢"通常是"视图里的聚合/去重导致物化"，与视图本身无关。

**"派生表结果能加索引吗？"**——物化的临时表会自动带上 GROUP BY 列的哈希/树结构，但不能手工建索引。需要复杂索引时改为真实物化：把子查询落成临时表/汇总表（带索引）再查询——空间换时间的常见工程手法。

**"WITH 子句（CTE）呢？"**——CTE 本质是"有名字的派生表"，8.0 默认同样尝试合并，`WITH ... AS MATERIALIZED` 可强制物化，行为与本篇完全同构（MySQL 侧无 PG 那种默认内联差异，详见 [PG 查询优化](/postgresql/250-QueryOptimization) 的对照段）。

## 检验清单

- 能说出合并与物化两条路线及六类强制物化的特征；
- 会用三个瘦身手段降低物化代价，并知道 derived_merge 是诊断工具；
- 能解释 LATERAL 的"每行执行"语义与 TopN-per-group 的索引配合条件；
- 完成"SIMPLE 与 DERIVED 分界"的 EXPLAIN 实验。

## 下一步

查询改写三连的最后一篇：[GROUP BY 与 ORDER BY 优化](/mysql/380-GroupByOrderByOptimization)，看 filesort 的产生条件与索引化排序的设计。
