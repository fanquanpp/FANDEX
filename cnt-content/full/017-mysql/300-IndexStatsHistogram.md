---
order: 300
title: 索引统计信息与直方图：优化器的眼镜
module: 'mysql'
category: 数据库
difficulty: intermediate
description: 优化器靠什么估算成本：统计信息的采样机制、过时统计引发的执行计划抖动、ANALYZE TABLE 的正确用法、8.0 直方图解决数据倾斜的原理与实战。
author: fanquanpp
updated: '2026-09-18'
related:
  - 'mysql/270-IndexHintForceIndex'
  - 'mysql/320-EXPLAINDetailed'
  - 'mysql/280-InvisibleIndex'
  - 'mysql/850-MySQLConfigOps'
prerequisites:
  - 'mysql/220-ClusteredIndexSecondaryIndex'
  - 'mysql/320-EXPLAINDetailed'
---

## 前置知识

- 会读 EXPLAIN 的 rows 与实际扫描的差距（[EXPLAIN 详解](/mysql/320-EXPLAINDetailed)）；
- 理解成本估算决定索引选择（[索引提示与强制索引](/mysql/270-IndexHintForceIndex) 里"优化器为什么选错"的根因篇）。

## 优化器不是在"看"数据，是在"回忆"数据

优化器选择执行计划时不可能真的去数一遍数据——那本身就是一个全表扫描。它依据的是预先采集的**统计信息（statistics）**：每个索引的基数（区分度）、每个列的大致分布。整个过程像戴着一副度数过期的眼镜看世界：

```text
表 orders：5000 万行
列 status：真实分布 = 99% 是 1（已完成），1% 是 0（待处理）

统计信息说：status 的基数是 2
优化器推理：基数 2，随便走哪个索引都可能扫一半 —— 还是全表扫吧
现实：WHERE status = 0 只命中 50 万行，走索引快 20 倍
```

**眼镜度数（统计信息）与真实分布（数据）的偏差，就是执行计划不合理的根源。**本篇讲两件事：眼镜的度数是怎么测的（采样机制），以及度数实在配不准时怎么给优化器配助视器（直方图）。

## 统计信息怎么来的：采样与更新时机

InnoDB 的统计信息默认靠**随机采样**若干数据页估算（`innodb_stats_persistent_sample_pages`，默认 20 页）。采样意味着两件事：

1. **是估算值**：千万行表采样 20 页，基数误差百分之几十都属正常；
2. **会过时**：采样在特定时机触发——表数据变化超过阈值（默认约 10% 的行变更，`innodb_stats_auto_recalc=on` 时）、显式执行 `ANALYZE TABLE`、表首次打开等。

两条最重要的运维常识：

```sql
-- 手动刷新统计信息（不阻塞读写，元数据级操作）
ANALYZE TABLE orders;

-- 查看索引基数（Cardinality 列）
SHOW INDEX FROM orders;
```

`SHOW INDEX` 的 Cardinality 是估算的"不重复值数量"。一个实用的体检手法：**拿它除以表行数，与列的真实业务区分度对比**。`user_id` 列理论上基数应接近行数，若 SHOW 出来只有几千——统计信息已经烂了，优化器正在戴着坏眼镜做手术。

## 执行计划抖动：过时统计的经典事故

数据仓库类库表的典型剧本：

```text
凌晨批量写入 800 万行订单
    ↓ 变更比例触发自动重算，但采样恰好偏斜
统计信息漂移
    ↓
早上 9 点核心查询的执行计划"无故"变化：ref 退化成 ALL
    ↓
DBA 群炸锅，代码没发版、数据没暴涨，"MySQL 自己抽风了"
```

标准处置：`EXPLAIN` 对比 rows 估算与真实行数 → 偏差大则 `ANALYZE TABLE` → 计划恢复。若抖动反复出现，把 `ANALYZE TABLE` 固化进批量任务的收尾步骤——**批量写入之后必须分析表**，这条纪律能消灭大半"玄学性能问题"。

## 直方图：给倾斜列定制眼镜

采样统计对**均匀分布**的列够用，但对**倾斜分布**（少数值占绝大多数行）失灵——开头 status 列的例子就是典型。MySQL 8.0 给每列提供了显式的分布描述：**直方图（histogram）**。

```sql
-- 为 status 列建直方图（等宽型，桶数 16；JSON 输出便于程序读取）
ANALYZE TABLE orders UPDATE HISTOGRAM ON status WITH 16 BUCKETS;

-- 查看直方图内容：每个桶的取值范围与占比一目了然
SELECT * FROM information_schema.COLUMN_STATISTICS
WHERE TABLE_NAME = 'orders'
G

-- 删除直方图
ANALYZE TABLE orders DROP HISTOGRAM ON status;
```

建直方图后，优化器知道"status=0 大约占 1%、status=1 占 99%"，于是：

- `WHERE status = 0` → 走索引（只扫 1%）；
- `WHERE status = 1` → 走全表扫（反正要拿 99%）；
- 甚至能影响 JOIN 顺序（小结果集的表先进内存）。

两种桶型一句话区分：**等宽桶（BUCKETS）**把取值范围均分，适合数值列；**等高桶（SINGULAR 语义，8.0 对字符串自动采用）**让每桶行数接近，适合倾斜的字符串列。桶数在 16 到 128 之间调整，桶越多越精确、分析开销越大。

使用边界（重要）：

- 直方图**不走索引、无维护成本**，但**不自动更新**——数据分布大变后需要手动重建；
- 适合"查询频繁、分布倾斜、又不想为它建索引"的列（如布尔型、状态型、地区型）；
- 已有精确索引的列通常不需要直方图（索引树本身就是分布信息）。

## 动手环节：亲眼看见优化器的眼镜

```sql
-- 1. 造一个重度倾斜的列
CREATE TABLE skew_demo (
  id INT PRIMARY KEY AUTO_INCREMENT,
  status TINYINT NOT NULL
);
-- 1000 行待处理(status=0)，99000 行已完成(status=1)
INSERT INTO skew_demo (status)
SELECT IF(n <= 1000, 0, 1)
FROM (SELECT a.N + b.N*100 + c.N*10000 n
      FROM (SELECT 0 N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
            UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
            UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a,
           (SELECT 0 N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
            UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
            UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b,
           (SELECT 0 N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
            UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
            UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) c) t;
CREATE INDEX idx_status ON skew_demo(status);

-- 2. 建直方图前：两条查询的估算对比
EXPLAIN SELECT * FROM skew_demo WHERE status = 0;
EXPLAIN SELECT * FROM skew_demo WHERE status = 1;
-- rows 估算大概率两条一样（优化器不知道倾斜）

-- 3. 建直方图
ANALYZE TABLE skew_demo UPDATE HISTOGRAM ON status WITH 16 BUCKETS;

-- 4. 再看估算：status=0 的 rows 明显变小
EXPLAIN SELECT * FROM skew_demo WHERE status = 0;
EXPLAIN SELECT * FROM skew_demo WHERE status = 1;
-- 优化器已经"看见"分布

-- 5. 观察基数误差
SHOW INDEX FROM skew_demo;   -- Cardinality 约 2，与真实一致
```

## 常见困惑

**"ANALYZE TABLE 会不会锁表？"**——InnoDB 下它是低开销的采样操作，不阻塞读写（8.0 的 `ANALYZE` 支持并发执行）。生产库低峰期放心跑，高频变更的大表甚至可以在业务时段执行。

**"统计信息与直方图会冲突吗？"**——不冲突，是叠加关系：索引基数管"每个索引值大约多少行"，直方图管"某个具体值的精确占比"。优化器两者都看。

**"采样页数能调大让估算更准吗？"**——可以（调高 `innodb_stats_persistent_sample_pages`），代价是统计信息更新的耗时变长。一般优先方案是"固定批量任务后 ANALYZE + 倾斜列上直方图"，而不是全局调大采样。

## 检验清单

- 能说清统计信息的来源（采样）与过时后果，并演示 `SHOW INDEX` 体检法；
- 能复述"批量写入后必须 ANALYZE"的纪律及其消灭的事故类型；
- 会为倾斜列建直方图，并能解释它为什么能让两条相同形状的查询走向不同计划；
- 理解直方图"不自动更新"这条边界。

## 下一步

到这里，优化器决策链的三块拼图集齐了：索引（选择空间）、统计信息（估算依据）、提示（人工纠偏）。接下来把视线从"怎么选计划"移到"哪里暴露慢"：[慢查询日志](/mysql/340-SlowQueryLog) 是所有优化的起点。
