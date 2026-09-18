---
order: 270
title: 索引提示与强制索引：什么时候该替优化器做决定
module: 'mysql'
category: 数据库
difficulty: intermediate
description: USE INDEX、FORCE INDEX、IGNORE INDEX 三种提示的正确用法：优化器为什么会选错索引、三种提示的语义差异、作为临时止血手段的完整流程与戒断原则。
author: fanquanpp
updated: '2026-09-18'
related:
  - 'mysql/250-IndexConditionPushdown'
  - 'mysql/280-InvisibleIndex'
  - 'mysql/300-IndexStatsHistogram'
  - 'mysql/320-EXPLAINDetailed'
prerequisites:
  - 'mysql/220-ClusteredIndexSecondaryIndex'
  - 'mysql/320-EXPLAINDetailed'
---

## 前置知识

- 会用 EXPLAIN 读懂 type/key/rows/Extra（[EXPLAIN 详解](/mysql/320-EXPLAINDetailed)）；
- 理解二级索引与回表成本（[聚簇索引与二级索引](/mysql/220-ClusteredIndexSecondaryIndex)）。

## 优化器也会选错：为什么会

MySQL 优化器基于**成本估算**选择索引：估算每个候选索引的扫描行数、回表比例，挑总成本最低的。估算依赖统计信息（见[索引统计与直方图](/mysql/300-IndexStatsHistogram)），而估算就是估算——这些情况会让它翻车：

1. **统计信息过时**：大批量写入后未触发重新统计，优化器按旧分布做决策；
2. **估算模型对特殊分布失灵**：例如查询条件命中 1% 的行，采样却恰好没采到这 1%，误判为"很低效"而放弃索引；
3. **多索引成本接近**：两个索引估算成本相差无几，优化器选了次优的那个；
4. **应用层知道优化器不知道的事**：你确知这批数据是热数据、内存命中率极高，回表几乎零成本，而优化器按冷数据模型估算。

索引提示（Index Hint）就是给这些时刻准备的**人工纠偏通道**。先记住使用哲学：**提示是临时止血药，不是长期饮食**——统计信息修复、索引结构调整之后，提示应该撤掉（戒断原则见文末）。

## 三种提示：语义差异要分清

```sql
-- 1. IGNORE INDEX：禁止使用某些索引（黑名单）
SELECT * FROM orders IGNORE INDEX(idx_created_at)
WHERE created_at > '2026-01-01';

-- 2. FORCE INDEX：强制走某些索引（强约束）
SELECT * FROM orders FORCE INDEX(idx_user_id)
WHERE user_id = 100;

-- 3. USE INDEX：建议优先考虑某些索引（弱建议，优化器仍可能不用）
SELECT * FROM orders USE INDEX(idx_user_id)
WHERE user_id = 100;
```

三者的强度排序：`FORCE` 强于 `USE`；`IGNORE` 是反方向的排除。精确语义：

| 提示 | 语义 | 优化器还会变卦吗 |
| --- | --- | --- |
| `USE INDEX (i1)` | 只在 i1 里挑，或走表扫描 | 会——若它认为 i1 成本更高 |
| `FORCE INDEX (i1)` | 只在 i1 里挑，且**禁止全表扫描**（除非 i1 完全不可用） | 基本不会 |
| `IGNORE INDEX (i1, i2)` | 把 i1/i2 从候选中排除 | 只在剩余候选里选 |

一个反直觉的点：`FORCE INDEX` 并不保证"用上这个索引"，它保证的是"不用其他索引与全表扫描"——如果该索引因条件写法失效（如对列套了函数），查询会退化得很惨。所以加提示前**必须先 EXPLAIN 验证**。

提示的位置在表名之后（JOIN 时每张表可单独指定）：

```sql
SELECT o.*, u.name
FROM orders o FORCE INDEX(idx_user_id)
JOIN users u ON u.id = o.user_id
WHERE o.user_id = 100;
```

## 实战：一次完整的止血流程

场景：订单表 5000 万行，一条按渠道过滤的报表查询忽然从 200ms 掉到 40s，EXPLAIN 显示它放弃了 `idx_channel`（估算扫描 3000 万行）而走了全表扫描。

```sql
-- 第一步：确认现状（优化器的选择）
EXPLAIN SELECT SUM(amount) FROM orders
WHERE channel = 'app' AND created_at > NOW() - INTERVAL 7 DAY;
-- type=ALL, rows 约 30000000 —— 全表扫描

-- 第二步：试探目标索引的表现
EXPLAIN SELECT SUM(amount) FROM orders FORCE INDEX(idx_channel)
WHERE channel = 'app' AND created_at > NOW() - INTERVAL 7 DAY;
-- type=ref, rows 约 120000 —— 估算成本骤降

-- 第三步：真实执行对比（EXPLAIN ANALYZE，MySQL 8.0.18 起可用）
EXPLAIN ANALYZE SELECT SUM(amount) FROM orders
WHERE channel = 'app' AND created_at > NOW() - INTERVAL 7 DAY;
EXPLAIN ANALYZE SELECT SUM(amount) FROM orders FORCE INDEX(idx_channel)
WHERE channel = 'app' AND created_at > NOW() - INTERVAL 7 DAY;
-- 对比 actual time，确认强制索引确实更快

-- 第四步：上线止血版本（提示写进 SQL）
-- 第五步：根因修复后撤掉提示（见下）
```

**根因修复**的方向（按常见程度）：`ANALYZE TABLE orders;` 刷新统计信息 → 检查是否该建更精确的联合索引 `(channel, created_at)` → 数据倾斜（某个渠道占比剧增）则考虑直方图。修复完成、EXPLAIN 自然选中正确索引后，**删掉提示再上线**。

## 常见困惑

**"为什么不干脆 FORCE INDEX 一劳永逸？"**——三个代价：数据分布变化后，曾经正确的强制会变成持续的性能毒药（而优化器至少还会自适应）；SQL 与物理结构耦合，迁移或重构时每条提示都是隐性债务；掩盖问题——止血贴着不拔，伤口永远不好。正确姿势是把提示写进工单：注明"根因修复前临时使用，预计某日移除"。

**"IGNORE INDEX 和不可见索引什么关系？"**——效果相似（都是让优化器不碰某索引），但作用面不同：IGNORE 是**单条 SQL 层面**的局部排除；[不可见索引](/mysql/280-InvisibleIndex)是**全库层面**让索引对整个优化器隐身，用于"删除前验证没人用它"。调试单条语句用 IGNORE，评估下线整个索引用 INVISIBLE。

**"提示能控制 JOIN 顺序吗？"**——索引提示只管索引选择。控制连接顺序需要 8.0 的优化器 hint（如 `/*+ JOIN_ORDER(o, u) */`），那是另一套语法体系。

## 检验清单

- 能说出三种提示的强度与语义差异，以及 FORCE 不保证什么的例外情形；
- 能复述"止血五步"：确认现状、试探对比、真实验证、临时上线、根因修复后撤除；
- 理解提示与不可见索引、optimizer hint 的分工边界。

## 下一步

提示是"人替优化器做决定"，[不可见索引](/mysql/280-InvisibleIndex)则是"让优化器假装索引不存在"——它是安全删除索引这件事的正确姿势。
