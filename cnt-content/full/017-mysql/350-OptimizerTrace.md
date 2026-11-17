---
order: 380
title: 优化器追踪：看透执行计划选择的全过程
module: 'mysql'
category: 数据库
difficulty: advanced
description: OPTIMIZER_TRACE 的诊断方法：开启与读取、追踪输出的三大阶段、代价估算逐项分析、"为什么不用这个索引"的终极答案。
author: fanquanpp
updated: '2026-11-17'
related:
  - 'mysql/320-EXPLAINDetailed'
  - 'mysql/340-SlowQueryLog'
  - 'mysql/300-IndexStatsHistogram'
  - 'mysql/270-IndexHintForceIndex'
prerequisites:
  - 'mysql/320-EXPLAINDetailed'
---

## 前置知识

- 会读 EXPLAIN（[EXPLAIN 详解](/mysql/320-EXPLAINDetailed)）——追踪是 EXPLAIN 的"幕后纪录片"；
- 慢查询的常规诊断链（[慢查询日志](/mysql/340-SlowQueryLog)）——本篇是诊断链的最深一层。

## 定位：当 EXPLAIN 也不够看时

诊断慢查询的武器按深度排：

```text
EXPLAIN          看"最终选了什么计划"         —— 结果
EXPLAIN ANALYZE  看"这个计划实际跑得多慢"     —— 结果 + 耗时
OPTIMIZER_TRACE  看"为什么选它、放弃了谁"     —— 决策过程
```

最常见的用武之地是那个经典疑问：**"表上有索引，为什么优化器不用？"** EXPLAIN 只告诉你"没用"；追踪会打开优化器的账本，逐行展示每个候选访问方式的代价计算，以及它最终为何落选。这是 MySQL 侧与 PG 的 [Optimizer Trace 等价物](/postgresql/250-QueryOptimization)（PG 靠 explain + 统计信息推理）相比更直观的地方——决策过程是明文 JSON。

## 使用三步法

```sql
-- 1. 开启（会话级，随会话结束自动失效，生产可放心用）
SET optimizer_trace = 'enabled=on';
SET optimizer_trace_max_mem_size = 1048576;   -- 单条追踪内存上限 1MB（超长会被截断）

-- 2. 执行要诊断的查询（原样执行，一行都别改）
SELECT * FROM employees WHERE dept_id = 5;

-- 3. 读取并关闭
SELECT QUERY, TRACE FROM information_schema.OPTIMIZER_TRACE\G
SET optimizer_trace = 'enabled=off';
```

要点三条：追踪表**每个会话只保留最后一条查询**的记录（要对比两条查询就各开一个会话）；`QUERY` 列帮你确认没看串；JSON 很长，用 `\G` 竖排输出，或导出后用 JSON 工具格式化。

## 追踪输出：三大阶段

```json
{
  "steps": [
    { "join_preparation": { ... } },      // 阶段一：准备
    { "join_optimization": { ... } },     // 阶段二：优化（重点在此外）
    { "join_execution": { ... } }         // 阶段三：执行
  ]
}
```

- **join_preparation（准备）**：查询改写的第一手资料——视图展开、子查询代数变换、常量传播都在这里。怀疑"优化器把我的 SQL 改成了什么样"就看这段的 `expanded_query`；
- **join_optimization（优化）**：主角。依次包含条件化简（condition_processing）、表依赖分析、possible_keys 评估、**各访问方式的代价计算（ref_optimizer_key_uses / table_scan / potential_range_indices ...）**、连接顺序排列（rows_estimation 与 considered_access_paths）；
- **join_execution**：执行信息（通常较短）。

## 实战：回答"为什么不用索引"

```sql
-- 场景：status 列有索引 idx_status，但查询走了全表扫
SET optimizer_trace = 'enabled=on';
SELECT * FROM orders WHERE status = 1;
SELECT TRACE FROM information_schema.OPTIMIZER_TRACE\G
SET optimizer_trace = 'enabled=off';
```

在输出里定位三处关键段落：

```json
"rows_estimation": [
  {
    "table": "orders",
    "range_analysis": {
      "table_scan": { "rows": 5000000, "cost": 512000 },     // 全表扫：行数与代价
      "potential_range_indices": [ ... idx_status ... ],
      "analyzed_range": {
        "index": "idx_status",
        "rows": 4950000,                                      // 估算该索引要扫 495 万行！
        "cost": 545000,                                       // 比全表扫还贵
        "chosen": false,
        "cause": "cost"                                       // 落选原因：代价
      }
    }
  }
]
```

诊断结论从数字里自己长出来：status=1 命中 99% 的行，走索引要扫 495 万行再回表 495 万次，比顺序扫全表更贵——**优化器拒绝索引是完全正确的**。此时该做的是去掉这个没价值的索引（用[不可见索引](/mysql/280-InvisibleIndex)下线），而不是逼优化器改道。

反过来，如果 `analyzed_range.rows` 明明只有 1000 行、`chosen: false, cause: "cost"`，那就是统计信息失真的信号——回到 [统计信息与直方图](/mysql/300-IndexStatsHistogram) 修眼镜，而不是上 [FORCE INDEX](/mysql/270-IndexHintForceIndex) 止血。

## 动手环节：完整跑一次追踪

```sql
-- 1. 造倾斜数据（复用统计信息篇的模型）
CREATE TABLE trace_demo (id INT PRIMARY KEY AUTO_INCREMENT,
  status TINYINT, note VARCHAR(50), KEY idx_status (status));
SET SESSION cte_max_recursion_depth = 1000000;
INSERT INTO trace_demo (status, note)
WITH RECURSIVE t(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM t WHERE n < 100000)
SELECT IF(n <= 100, 0, 1), md5(n) FROM t;
ANALYZE TABLE trace_demo;

-- 2. 开启追踪并执行
SET optimizer_trace = 'enabled=on';
SELECT * FROM trace_demo WHERE status = 0;   -- 只有 100 行，应该走索引
SELECT TRACE FROM information_schema.OPTIMIZER_TRACE\G
SET optimizer_trace = 'enabled=off';

-- 3. 解读作业：在 JSON 里找到以下三项并记下数字
--    a) table_scan 的 rows 与 cost
--    b) idx_status 的 analyzed_range rows 与 cost
--    c) 最终 considered_access_paths 里 chosen=true 的方案

-- 4. 对照实验：查另一个极端
SET optimizer_trace = 'enabled=on';
SELECT * FROM trace_demo WHERE status = 1;   -- 99900 行
SELECT TRACE FROM information_schema.OPTIMIZER_TRACE\G
SET optimizer_trace = 'enabled=off';
-- 对比两个 JSON：同一索引，因估算行数不同而命运相反
```

第 4 步是本篇的点睛处：**同一条 SQL 形状，参数不同、计划相反**——追踪让你亲眼看到代价估算在两个世界里的数值对比，"优化器是账房先生"从此不再是比喻。

## 常见困惑

**"追踪和 EXPLAIN ANALYZE 什么关系？"**——分工不同：ANALYZE 报告"选中的计划跑得如何"（事后验尸），追踪解释"计划是怎么选出来的"（事前决策）。疑难杂症的诊断顺序：ANALYZE 确认慢 → 追踪找原因 → 统计信息/索引/hint 对症下药。

**"JSON 太长看不完怎么办？"**——三个技巧：只搜三个关键词（`chosen`、`cause`、`cost`）就能抓住决策主干；`optimizer_trace_max_mem_size` 调大避免截断失真；对比实验时把两个 JSON 存下来用文本 diff，差异处就是问题的答案。

**"追踪本身有开销吗？"**——只在会话开启时记录，单条查询的诊断开销可忽略；但不要在压力高峰对批量负载开追踪（毕竟要序列化每一步决策）。用完即关。

## 教学自检（先遮住代码自己写，再对照）

遮码自检法：先只读题干，自己写/自己答，再展开参考答案对照。

1. 写出流程：追踪一条查询的优化决策，从开启到读取再到关闭。为什么追踪只在会话级开、用完立刻关？

参考答案（先自己写，再对照）：

```sql
SET optimizer_trace = 'enabled=on';
SELECT * FROM trace_demo WHERE status = 0;
SELECT TRACE FROM information_schema.OPTIMIZER_TRACE\G
SET optimizer_trace = 'enabled=off';
```

trace 会完整记录优化器的枚举与决策过程，输出大、开销明显；它只对开启后的**下一条**可追踪语句生效，全局开启会拖垮整个实例。会话级开关 + 用完即关，是它的安全使用姿势。

2. 概念自问：optimizer trace 回答的是 EXPLAIN 与 EXPLAIN ANALYZE 都回答不了的问题——是什么问题？

参考答案（先自己答，再对照）："优化器为什么这么选"。EXPLAIN 只给结论（用了哪个索引），EXPLAIN ANALYZE 给实测（这个计划跑得多快），trace 给过程——每个候选访问路径的估算行数与成本、被淘汰的理由、JOIN 顺序怎么定的。"为什么不用索引"这类悬案，只有 trace 能给出裁决书。

3. 判断题：trace 里看到候选路径 `idx_status` 的 cost 比全表扫描略高 0.1，说明统计不准，必须人工干预。

参考答案（先自己答，再对照）：不必。0.1 的成本差距在估算误差范围内，两个方案都是"合理选择"，差异来自采样估算的天然噪声。trace 的价值是**理解**决策逻辑，不是把成本数字当成精确值去抠；只有当成本模型与现实的偏差是系统性的（统计严重过时、成本参数失真）时才需要干预——刷新统计、校正参数，而不是每条 SQL 加 hint。

4. 概念自问：trace 输出是 JSON，日常排查时重点看哪三类字段？

参考答案（先自己答，再对照）：一看 considered_access_paths（各候选索引与全表扫描的估算 rows/cost，chosen=true 的就是最终方案）；二看 rows_estimation 阶段（统计信息怎么变成估算值的——采样了哪些索引、区分度多少）；三看各 join 顺序候选的成本对比。三类分别回答"选了什么""为什么这么估""为什么这个顺序"。

## 检验清单

- 能说出追踪与 EXPLAIN/ANALYZE 的分工与"最后一份拼图"的定位；
- 会三步法开启、执行、读取追踪，并知道每会话仅存最后一条；
- 能在 JSON 里定位 table_scan 与 analyzed_range 的代价对比，并据此判断"拒绝索引是否正确"；
- 完成 status=0 与 status=1 的对照追踪实验，亲见同索引不同命运。

## 下一步

优化器三部曲（子查询、派生表、分组排序）加本篇已完整。落地工具箱还差一件：把"数据从哪来"变成可控实验——进入 [SQL 沙箱练习](/mysql/040-SQLPlayground) 或回 [慢查询日志](/mysql/340-SlowQueryLog) 把整条诊断链串成自己的 SOP。
