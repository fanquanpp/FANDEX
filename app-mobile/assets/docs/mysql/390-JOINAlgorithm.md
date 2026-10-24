---
order: 420
title: JOIN 算法
module: 'mysql'
category: 数据库
difficulty: advanced
description: 从一次联查从 30ms 恶化到 12s 的排查出发，讲透 MySQL 的 Nested Loop 与 Hash Join：执行计划怎么读、驱动表怎么选、join_buffer_size 起什么作用。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'mysql/320-EXPLAINDetailed'
  - 'mysql/360-SubqueryOptimization'
  - 'mysql/140-MultiTableJoinDetailed'
prerequisites:
  - 'mysql/140-MultiTableJoinDetailed'
---

## 场景：一条联查从 30ms 恶化到 12 秒

充电平台的订单分析接口周五突然超时。这条查询逻辑没改过：

```sql
SELECT cs.session_id, c.power_kw
FROM charge_sessions cs              -- 数百万行
JOIN chargers c ON cs.charger_tag = c.charger_tag;   -- charger_tag 两边都没索引
```

查询语法正确、结果也对，坏在 `charger_tag` 是新加的标签列：两边都没有索引。同一个 JOIN 关键字，底层执行的算法已经完全不同——这正是本篇要讲清楚的事。

动手复现用小表就行，关键在执行计划：

```sql
-- 复现环境：两张表各有一列 charger_tag，故意都不建索引
EXPLAIN
SELECT cs.session_id, c.power_kw
FROM charge_sessions cs
JOIN chargers c ON cs.charger_tag = c.charger_tag;
-- type: ALL (chargers 全表扫描)
-- Extra: Using join buffer (hash join)
```

看到 `ALL + Using join buffer (hash join)`，就能断定：MySQL 走了哈希连接，而且是对一张表做了全量扫描。修复往往只需一列索引：

```sql
ALTER TABLE charge_sessions ADD INDEX idx_cs_charger_tag (charger_tag);

EXPLAIN SELECT ... ;
-- type: ref (charge_sessions 走新索引逐行匹配；行数极少的 chargers 被选为驱动表)
-- Extra: NULL 或 Using index
```

`Using join buffer (hash join)` 消失，耗时回到毫秒级。下面解释这两种算法各自的原理，以及什么时候该用哪个。

## 为什么：MySQL 只有两类 JOIN 算法

MySQL 不做排序合并连接（Merge Join），算法世界里只有两大家族：嵌套循环（Nested Loop）和哈希连接（Hash Join）。8.0.20 起 Block Nested Loop 已移除，非索引路径全部归哈希连接接管。

### Nested Loop：一层循环套一层循环

```text
for 外层表每一行:
    用连接列的值去内层表找匹配行
```

"找匹配行"的效率决定了它是快是慢：

- **Index NLJ**：内层连接列有索引，每次查找是 O(logN)。外层 10 万行 x log 级查找 = 毫秒到秒级。这是绝大多数 OLTP 联查的形态，也是"连接列要有索引"这条铁律的由来。
- **Simple NLJ（无索引）**：每次查找都全扫内层，O(M x N)。10 万 x 10 万 = 百亿次比较，12 秒都是客气的。

因此读执行计划时先看被驱动表的 type：`eq_ref/ref` 说明是 Index NLJ，`ALL` 说明这个 JOIN 大概率有问题。

### Hash Join：先建哈希表，再一遍探测

MySQL 8.0.18 引入，专门接管"无索引的等值连接"：

```text
Build 阶段：扫描较小的表，把连接列建进哈希表（存进 join buffer）
Probe 阶段：扫描较大的表，每行算哈希去哈希表里找
```

复杂度 O(M + N)，与两表乘积无关——这就是无索引时它远好于朴素嵌套循环的原因。8.0.20 起它的职责继续扩大：外连接、半连接/反连接（IN/EXISTS 的改写）、非等值连接，以及无 ON 条件的笛卡尔积，全部走哈希连接路径。

两个必须知道的限制：

```sql
-- 1. 非等值连接的 hash join 实质是"分块笛卡尔"：
--    没有等值条件就没法建哈希 key，只能全量比较
SELECT * FROM t1 JOIN t2 ON t1.a > t2.b;
-- Extra: Using join buffer (hash join)  -- 出现不代表高效

-- 2. build 侧放不进 join_buffer_size 时按块分批处理，
--    缓冲区太小意味着 build 侧被扫描多遍
SET SESSION join_buffer_size = 8388608;   -- 默认 256KB，常按需调到 MB 级
```

### 历史注脚：Block Nested Loop 去哪了

8.0.20 之前的版本没有哈希连接，无索引连接靠 BNL 硬撑：把外层的行批量装进 join buffer，内层每扫一遍能和一批行匹配，减少内层扫描次数（从 N 次降到 N/批次大小 次），但复杂度仍是 O(M x N) 量级。8.0.20 起 BNL 删除，`Extra` 里的 `Block Nested Loop` 字样不会再出现，看到的 `hash join` 就是当年 BNL 的替代者。读老资料或老版本的执行计划时别混淆。

## 动手：把驱动表和缓冲区调到可观测

### 驱动表怎么选

嵌套循环下，外层循环次数 = 驱动表行数，所以原则是**小表驱动大表**。但"小"的定义是**过滤之后的行数**，不是物理行数：

```sql
-- charge_sessions 两千万行，但 WHERE 时间条件过滤后只剩 500 行：
-- 它才是"小表"，优化器通常也能自己选对
SELECT ... FROM charge_sessions cs
JOIN chargers c ON cs.charger_id = c.charger_id
WHERE cs.started_at >= '2026-09-01';
```

EXPLAIN 里第一行的表就是驱动表。优化器基于统计信息选择，绝大多数时候是对的；发现它选反了（第一行是全表扫描的大表、第二行却是范围扫描的小表），先用 `ANALYZE TABLE` 更新统计信息，仍不对再用提示干预。

### 干预连接顺序的两种姿势

```sql
-- 姿势 1：STRAIGHT_JOIN，按书写顺序连接（谨慎，写死就失去了优化器的适应性）
SELECT STRAIGHT_JOIN cs.session_id, c.power_kw
FROM charge_sessions cs
JOIN chargers c ON cs.charger_id = c.charger_id;

-- 姿势 2：JOIN_ORDER 优化器 hint，效果相同但只作用于这一条
SELECT /*+ JOIN_ORDER(cs, c) */ cs.session_id, c.power_kw FROM ...;
```

### BKA：批量回表，减少随机读

被驱动表有二级索引、但需要回表取其他列时，Batched Key Access 把驱动表的一批 key 排序后批量提交给存储引擎，把随机 I/O 变得局部性更好：

```sql
SET optimizer_switch = 'batched_key_access=on';  -- 默认 off，且依赖 MRR
SELECT /*+ BKA(c) */ ... ;
-- Extra: Using join buffer (Batched Key Access)
```

BKA 是锦上添花：先确认 Index NLJ 本身没问题，再考虑开它。

## 坑点与自检

### 坑一：看到 hash join 就以为"没用索引也没事"

哈希连接救的是"无索引时的下限"（O(M+N)），不是上限。它没有增量能力：每次执行都要重新扫描 build 侧建表，大表 x 高频调用的接口仍然扛不住。OLTP 接口的联查目标永远是 Index NLJ（`eq_ref/ref`），hash join 是分析型低频查询和兜底方案。

### 坑二：8.0.18 的 HASH_JOIN hint 已是废纸

网上老文章里的 `/*+ HASH_JOIN(t1, t2) */` 与 `NO_HASH_JOIN` 是 8.0.18 的实验性提示，8.0.20 起已不生效（写了不报错，也没有任何作用）。8.4 时代想控制连接行为，用 `JOIN_ORDER`/`BKA` hint 或 `SET optimizer_switch`，并且总是配合 EXPLAIN 验证。

### 坑三：join_buffer_size 是会话级放大器

它是**每个连接、每个 JOIN** 各自分配的缓冲，全局调大 100 个并发连接就是 100 份内存。正确用法：先在会话级针对单条慢查询试验，确认有收益后只对特定账号或查询设置，不要一上来就改全局。

### 坑四：连接数过多的另一种解释

执行计划显示某表 type=ALL 但不是驱动表时，先看它是不是被驱动表缺索引——和"这张表本身慢"是两个问题。自检顺序：先看 type（ALL/ref/eq_ref），再看 rows 估算与实际行数的差距（统计信息陈旧就 ANALYZE TABLE），最后才动 hint。

### 自检清单

- 每条联查都能说出预期算法（Index NLJ 还是 hash join）与依据（Extra 信息）？
- 被驱动表的连接列都有索引吗（外键被删过的历史库重点查）？
- 干预执行计划的 hint 都经过 EXPLAIN 前后对比了吗？
- join_buffer_size 的调整是会话级验证后落地的，还是直接改了全局？

## 练习

1. 构造一个无索引连接列的两表查询，分别记录加索引前后 EXPLAIN 的 type、rows、Extra 与真实耗时。
2. 故意把 join_buffer_size 设为默认 256KB，用一张超过缓冲的表做 build 侧，观察 EXPLAIN ANALYZE（8.0.18+）里的执行时间变化。
3. 写一条非等值连接（`>` 条件），确认它走 hash join，并解释为什么"等值条件是哈希连接高效的前提"。
4. 用 STRAIGHT_JOIN 强制大表驱动小表，量化它与优化器默认选择的耗时差，体会"优化器基于统计信息"意味着什么。
5. 在老版本资料里找一段 `Block Nested Loop` 的执行计划解读，改写成 8.0.20+ 的等价描述。

## 下一步

- EXPLAIN 每一列的完整解读见 [EXPLAIN 详解](/mysql/320-EXPLAINDetailed)；
- 子查询被优化器改写成半连接/物化的机制见[子查询优化](/mysql/360-SubqueryOptimization)；
- 016 模块的通用视角见[执行计划](/sql/430-ExecutionPlan)。
