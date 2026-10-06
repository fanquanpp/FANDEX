---
order: 270
title: 索引条件下推 ICP：把过滤推到引擎层
module: 'mysql'
category: 数据库
difficulty: intermediate
description: 用一次回表成本的故事讲透 Index Condition Pushdown：没有 ICP 时过滤发生在哪、ICP 把什么推到了哪里、EXPLAIN 里如何确认，以及它与覆盖索引的边界。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'mysql/220-ClusteredIndexSecondaryIndex'
  - 'mysql/240-PrefixIndex'
  - 'mysql/320-EXPLAINDetailed'
  - 'mysql/310-IndexFailureScene'
prerequisites:
  - 'mysql/220-ClusteredIndexSecondaryIndex'
  - 'mysql/230-CompositeIndexLeftmostPrefixPrinciple'
---

## 前置知识

- 二级索引结构与回表代价（[聚簇索引与二级索引](/mysql/220-ClusteredIndexSecondaryIndex)）；
- 联合索引最左前缀（[联合索引与最左前缀](/mysql/230-CompositeIndexLeftmostPrefixPrinciple)）；
- 会看 EXPLAIN 的 type/key/Extra（本篇会用到 Extra，细节见 [EXPLAIN 详解](/mysql/320-EXPLAINDetailed)）。

## 故事引入：1000 次冤枉的回表

一张员工表，联合索引 `(last_name, age)`，查询：

```sql
SELECT * FROM employees
WHERE last_name LIKE '张%' AND age > 30;
```

`LIKE '张%'` 是范围条件，按最左前缀原则，`age > 30` **无法参与索引定位**（范围列之后索引失效）。于是在没有 ICP 的年代，执行流程是：

```text
1. 存储引擎（InnoDB）：顺着索引找到所有 last_name 以"张"开头的条目
   —— 假设有 1000 条，拿到 1000 个主键
2. 存储引擎：逐条回表，读出 1000 行完整数据
3. Server 层（MySQL 服务层）：对这 1000 行逐行过滤 age > 30
   —— 只剩 100 行
```

问题一目了然：**age 明明就在索引里**（联合索引的每个条目都带着 age），却要等回表拿到完整行之后、回到 Server 层才被检查。900 次回表是纯浪费。

MySQL 5.6 引入的**索引条件下推（Index Condition Pushdown，ICP）**改变了分工：把"能在索引上判断的剩余条件"下推给存储引擎，在回表**之前**先用索引条目过滤：

```text
1. 存储引擎：找到 last_name 以"张"开头的 1000 个索引条目
2. 存储引擎：在索引条目上直接检查 age > 30（不需要回表）
   —— 剩下 100 条
3. 存储引擎：只对这 100 条回表
4. Server 层：处理剩余无法在索引上判断的条件
```

回表次数从 1000 降到 100，**IO 与随机读开销缩小十倍**。这就是 ICP 的全部价值：不改结果，只改变"过滤动作发生在哪一层、发生在回表前还是回表后"。

## 触发条件与限制

ICP 生效需要同时满足：

1. 访问方式是**范围/Ref 类的二级索引访问**（全表扫描无索引可推，覆盖索引无需回表）；
2. WHERE 中存在**不能用于定位、但引用了索引列**的条件（如上例的 `age > 30`，定位被范围列挡住，但列在索引里）；
3. 引擎支持：InnoDB 与 MyISAM 均支持。

明确**不生效**的场景：

- **覆盖索引**查询：反正不用回表，下推没有意义（Extra 直接显示 `Using index`）；
- 条件列不在所用的索引里；
- 子查询里的条件、存储函数调用（引擎层无法执行 Server 层的函数）。

## 确认 ICP 在工作：EXPLAIN

```sql
EXPLAIN SELECT * FROM employees
WHERE last_name LIKE '张%' AND age > 30;
```

看 Extra 列出现 **`Using index condition`** 即表示 ICP 生效。对照组实验（动手做一遍）：

```sql
-- 关闭 ICP
SET optimizer_switch = 'index_condition_pushdown=off';
EXPLAIN SELECT * FROM employees WHERE last_name LIKE '张%' AND age > 30;
-- Extra 变为 Using where

-- 重新开启（生产默认开启，无需手动设置）
SET optimizer_switch = 'index_condition_pushdown=on';
EXPLAIN SELECT * FROM employees WHERE last_name LIKE '张%' AND age > 30;
-- Extra 变回 Using index condition
```

注意一个高频误解：`Using index condition` 里的 "index" 与覆盖索引的 `Using index` **完全是两回事**——后者表示"不回表"，前者表示"回表前先在引擎层过滤"。两者不可能同时出现在同一个访问路径上。

## 与其他手段的协作

ICP 不是"优化掉慢查询"的终点，而是三件套中的一件：

| 手段 | 解决的问题 | 关系 |
| --- | --- | --- |
| 调整联合索引列序 | 让 `age` 也能参与定位 | 更根本；但列序是全局取舍，可能顾此失彼 |
| [前缀索引](/mysql/240-PrefixIndex) | 长列省空间 | 前缀索引上同样可用 ICP 过滤 |
| ICP | 定位条件受限时减少回表 | 兜底优化器，无需人工干预 |

写查询时不必"想着 ICP 优化"——它是默认开启的自动机制。你需要做的是：**当 EXPLAIN 里既没有 `Using index` 也没有 `Using index condition`、只有 `Using where` 且 rows 很大时**，说明过滤完全发生在 Server 层且回表量大，此时才回头设计更好的索引。

## 动手练习：三道关卡

规则：先看任务与提示，写下你的预测（Extra 显示什么、rows 量级、为什么），再展开参考对照。预测错了比做对了收获更大——错的地方就是模型的漏洞。

**关卡 1（必做）：给 ICP 造一个生效现场**

建一张 10 万行的员工表，联合索引 `(last_name, age)`。写出能触发 ICP 的查询并证明它生效：EXPLAIN 的哪一列、什么值说明 ICP 在工作？再把 ICP 关掉重跑，前后两份执行计划 diff 出所有变化（不止 Extra 一列）。

提示：条件要满足"定位 + 不能定位但在索引里"两段式；`LIKE '前缀%'` 与范围条件都可以当定位段。

**关卡 2（必做）：造三个不生效的反例**

针对同一张表，构造三条**故意让 ICP 不生效**的查询：覆盖索引场景、条件列不在索引里、主键查询。每条先预测 Extra，再验证。目标：把"ICP 何时缺位"从背诵变成条件反射。

提示：覆盖索引给 Extra 的答案是 `Using index`；第三条想想聚簇索引叶子是什么。

**关卡 3（选做）：量化 ICP 的收益**

用 `EXPLAIN ANALYZE`（8.0.18+）对比开关 ICP 前后的 actual time 与回表行数；如果把回表次数从 10 万降到 1 万，理论上 IO 时间差多少倍？写一段不超过 5 行的结论，说明什么分布的数据 ICP 收益最大（命中率越低越好还是越高越好？）。

提示：收益 = 省掉的回表次数 × 单次回表成本；命中率越低（过滤掉的越多），省得越多。

<details>
<summary>参考实现（先自己动手，再展开对照）</summary>

**关卡 1 参考流程：**

```sql
CREATE TABLE emp_icp (
  id INT PRIMARY KEY AUTO_INCREMENT,
  last_name VARCHAR(32) NOT NULL,
  age INT NOT NULL,
  dept VARCHAR(32) NOT NULL
);
CREATE INDEX idx_name_age ON emp_icp (last_name, age);
-- 造 10 万行：一半姓张、年龄 18-60 随机分布
INSERT INTO emp_icp (last_name, age, dept)
SELECT IF(RAND() < 0.5, CONCAT('张', FLOOR(RAND()*100)), CONCAT('李', FLOOR(RAND()*100))),
       18 + FLOOR(RAND()*43), CONCAT('dept-', FLOOR(RAND()*10))
FROM information_schema.COLUMNS a, information_schema.COLUMNS b LIMIT 100000;
ANALYZE TABLE emp_icp;

-- ICP 生效现场：LIKE 定位 + age 过滤在索引里但不能参与定位
EXPLAIN SELECT * FROM emp_icp
WHERE last_name LIKE '张%' AND age > 30;
-- type=range, key=idx_name_age, Extra=Using index condition ← ICP 生效的证据

-- 开关对照：diff 出的变化
SET optimizer_switch='index_condition_pushdown=off';
EXPLAIN SELECT * FROM emp_icp WHERE last_name LIKE '张%' AND age > 30;
-- Extra=Using where（过滤退回 Server 层）
SET optimizer_switch='index_condition_pushdown=on';
```

**关卡 2 参考反例：**

```sql
-- 反例一：覆盖索引——不回表，ICP 无从谈起
EXPLAIN SELECT id, age FROM emp_icp WHERE last_name LIKE '张%' AND age > 30;
-- Extra=Using where; Using index（注意这里 Using index 表示覆盖，与 ICP 互斥）

-- 反例二：条件列不在索引里——dept 无法在引擎层判断
EXPLAIN SELECT * FROM emp_icp WHERE last_name LIKE '张%' AND dept = 'dept-3';
-- Extra=Using index condition; Using where
-- ICP 只对索引内列生效，dept 的过滤仍在回表后的 Server 层

-- 反例三：主键查询——聚簇索引叶子即整行，不存在"回表前"
EXPLAIN SELECT * FROM emp_icp WHERE id BETWEEN 1 AND 1000 AND age > 30;
-- type=range, Extra=Using where（无任何 index condition 字样）
```

**关卡 3 参考结论：**

```sql
SET optimizer_switch='index_condition_pushdown=on';
EXPLAIN ANALYZE SELECT * FROM emp_icp WHERE last_name LIKE '张%' AND age > 30;
-- 看 actual time 与 rows：引擎层过滤后实际回表的行数
SET optimizer_switch='index_condition_pushdown=off';
EXPLAIN ANALYZE SELECT * FROM emp_icp WHERE last_name LIKE '张%' AND age > 30;
```

结论模板：ICP 的收益 = 命中的索引条目数 × (1 - 过滤后留存率) × 单次回表成本。**留存率越低收益越大**：若 10 万条目里只有 1% 能通过 age 过滤，ICP 把 10 万次回表砍到 1 千次；若 99% 都能通过，收益微乎其微（此时真正该做的是调整索引列序或改查询）。

</details>


## 常见困惑

**"既然 ICP 这么好，为什么还要设计联合索引列序？"**——ICP 只能减少回表，不能减少索引扫描范围。`last_name LIKE '张%'` 命中的 1000 个条目仍要全部扫过。若查询模式固定，把 `age` 放进定位段（如 `(last_name, age)` 改需求为等值时 `(age, last_name)`）能把扫描范围本身缩小，收益远大于 ICP。ICP 是"列序没法完美时的保险"，不是"列序设计的替代品"。

**"为什么覆盖索引反而不显示 ICP？"**——覆盖索引根本不回表，"减少回表"这个目标不存在，下推无从谈起。看到 `Using index` 就已经是该查询的最好形态。

**"ICP 对主键查询有用吗？"**——没有。主键是聚簇索引，叶子就是完整数据行，不存在"回表"这个动作。

## 检验清单

- 能画出 ICP 开启前后两条执行流程，并指出省掉的步骤；
- 能说出三条 ICP 不生效的场景及原因；
- 在自己库里用 optimizer_switch 完成了开关对照实验，亲眼见过两种 Extra；
- 能向别人解释 `Using index condition` 与 `Using index` 的本质区别。

## 下一步

索引设计知识的下一站是把这一切放到显微镜下：[EXPLAIN 详解](/mysql/320-EXPLAINDetailed) 教你逐列读懂执行计划，让每一条慢查询的优化都有数据支撑。
