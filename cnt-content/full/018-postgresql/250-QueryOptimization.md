---
order: 250
title: 查询优化：统计信息、代价与执行计划
module: 'postgresql'
category: 数据库
difficulty: advanced
description: PostgreSQL 查询优化方法论：ANALYZE 与统计信息、代价参数如何左右计划、EXPLAIN ANALYZE BUFFERS 精读、work_mem 与 CTE 物化、pg_hint_plan 干预手段。
author: fanquanpp
updated: '2026-09-18'
related:
  - 'postgresql/240-IndexQueryOptimization'
  - 'postgresql/260-ParallelQuery'
  - 'postgresql/210-VACUUMMechanism'
  - 'postgresql/270-PartitionedTable'
prerequisites:
  - 'postgresql/220-IndexType'
  - 'postgresql/240-IndexQueryOptimization'
---

## 前置知识

- 各类索引的适用场景（[索引类型](/postgresql/220-IndexType)）；
- 会读基础的执行计划节点（[索引与查询优化](/postgresql/240-IndexQueryOptimization)）——本篇在其上补全"优化器为什么这么选"的决策链。

## 优化方法论：先诊断，再开药

PostgreSQL 查询优化最忌"凭感觉改 SQL"。正确的闭环：

```text
发现慢（pg_stat_statements/日志）
  → 读计划（EXPLAIN ANALYZE, BUFFERS）
  → 判断慢在哪一层：估算错（rows 偏差大）？内存不足（溢盘）？访问路径错（该走索引没走）？
  → 对症下药：统计信息 / work_mem / 索引 / SQL 改写
  → 复测验证
```

本篇按这条链路展开四个武器库：统计信息、代价参数、内存与执行计划干预。

## 第一武器：统计信息（优化器的世界观）

优化器不看数据，看统计信息。统计越准，计划越合理。

```sql
-- 手动收集（采样分析，不锁读写）
ANALYZE employees;

-- 只分析变化频繁的列
ANALYZE employees(dept_id, salary);

-- 查看优化器眼里的数据
SELECT attname, n_distinct, null_frac, avg_width
FROM pg_stats
WHERE tablename = 'employees';
-- n_distinct: 不重复值估计（-0.3 表示约 30% 的行是唯一值）
-- null_frac:  NULL 占比——影响优化器对条件选择率的估算
```

**自动分析由 autovacuum 顺带完成**，触发阈值 = `autovacuum_analyze_threshold + autovacuum_analyze_scale_factor × 表行数`。默认 scale_factor=0.1 意味着大表要变更 10% 才触发——亿级表上这就是"统计信息严重滞后"的温床。大表应单独调低：

```sql
-- 给大表单独设置更敏感的触发阈值
ALTER TABLE big_orders SET (autovacuum_analyze_scale_factor = 0.01);
```

**倾斜列的精化**：`SET STATISTICS` 提高采样目标（默认 100），让优化器"看清"倾斜分布：

```sql
ALTER TABLE employees ALTER COLUMN dept_id SET STATISTICS 500;
ANALYZE employees;
-- 统计目标越大，直方图桶越多，倾斜数据的估算越准（代价是 ANALYZE 更慢）
```

## 第二武器：代价参数（优化器的价值观）

同一个查询，优化器在"顺序扫全表"与"走索引随机回表"之间算账。账本的单位成本是可调的：

```sql
SHOW seq_page_cost;        -- 1.0   顺序读一页的基准代价
SHOW random_page_cost;     -- 4.0   随机读一页（默认按机械盘估值）
SHOW cpu_tuple_cost;       -- 0.01  处理一行的 CPU 代价
```

**最经典的一刀**：`random_page_cost` 默认 4.0 是机械盘时代的世界观。SSD 上随机读与顺序读差距很小，保持 4.0 会让优化器系统性低估索引、高估全表扫描——**SSD 环境调成 1.1 是社区公认的标配**：

```sql
ALTER SYSTEM SET random_page_cost = 1.1;
SELECT pg_reload_conf();
```

改完对照 EXPLAIN：许多"明明有索引却走全表扫"的计划会自然痊愈——这是不写任何 hint 就能拿到的优化。

## 第三武器：EXPLAIN ANALYZE BUFFERS（诊断的显微镜）

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM employees WHERE dept_id = 5 ORDER BY salary;
```

三段关键信息逐列对读：

```text
Sort  (cost=...) (actual time=12.3..12.5 rows=50 loops=1)
  Sort Method: external merge  Disk: 8192kB      <- 内存排序溢盘了
  Buffers: shared hit=120 read=4096              <- read=4096 页来自磁盘
  ->  Index Scan using idx_dept on employees
        Index Cond: (dept_id = 5)
        rows=50       <- 估算行数
        actual rows=50 <- 实际行数（两者偏差大 = 统计信息烂了）
```

判读表：

| 症状 | 诊断 | 药方 |
| --- | --- | --- |
| estimated rows 与 actual rows 差一个量级以上 | 统计信息失真 | ANALYZE / SET STATISTICS |
| `Sort Method: external merge` 或 `Hash Batches: 2+` | work_mem 不足，排序/哈希溢盘 | 会话或角色级调大 work_mem |
| `Buffers: shared read` 巨大 | 索引未命中/回表过多 | 换覆盖索引或收窄查询 |
| `Seq Scan` 但表巨大且有可用索引 | 代价参数低估索引 | 调 random_page_cost、ANALYZE |

**work_mem 的单位陷阱**：它是**每个排序/哈希节点**的配额而非整个查询——一条 SQL 有 5 个 Sort 节点就可能用 5 份 work_mem，全局调大有并发内存爆炸风险。正确姿势是给重查询角色单独设：

```sql
SET work_mem = '64MB';                          -- 会话级，报表查询前
ALTER ROLE reporting SET work_mem = '256MB';    -- 角色级持久化
```

## CTE 物化：一个主动的改写开关

PostgreSQL 12 起 CTE 默认可内联（像子查询一样被优化器改写、过滤条件下推）。偶尔你需要**反着来**——强制算一次、反复引用：

```sql
-- MATERIALIZED：物化 CTE（只算一次，但外层条件无法下推）
WITH dept_stats AS MATERIALIZED (
  SELECT dept_id, AVG(salary) AS avg_salary
  FROM employees GROUP BY dept_id
)
SELECT * FROM dept_stats WHERE avg_salary > 50000;
-- 聚合结果先落临时结果集，再在其上过滤——避免 AVG 被重复计算
```

判断口诀：CTE 被引用多次且计算昂贵 → MATERIALIZED；单次引用且希望条件优化 → 默认内联即可。

## 第四武器：干预执行计划（最后手段）

PostgreSQL 核心不支持 hint 注释，两条干预路径：

```sql
-- 路径一：会话级开关（诊断用，别留在生产代码里）
SET enable_seqscan = off;    -- 验证"走索引会不会更快"的对照实验
SET enable_nestloop = off;
SET max_parallel_workers_per_gather = 0;   -- 复现单线程行为

-- 路径二：pg_hint_plan 扩展（企业方案，注释式 hint）
CREATE EXTENSION pg_hint_plan;
SELECT /*+ HashJoin(a b) SeqScan(a) */ *
FROM employees a JOIN departments b ON a.dept_id = b.id;
```

与 MySQL 篇（[索引提示](/mysql/270-IndexHintForceIndex)）同样的戒断原则适用：**hint 是止血贴，根因永远在统计信息、代价参数或 SQL 写法里**。`enable_*` 开关只是软约束（优化器在无路可走时仍会违规），用它做 A/B 对照实验极佳，用它当生产方案极差。

## 动手环节：一次完整的优化闭环

```sql
-- 0. 准备：造倾斜数据
CREATE TABLE opt_demo (id serial primary key, status int, note text);
INSERT INTO opt_demo (status, note)
SELECT CASE WHEN n <= 99000 THEN 1 ELSE 0 END, md5(n::text)
FROM generate_series(1, 100000) n;

-- 1. 症状：查 status=0（只占 1%）却走全表扫
EXPLAIN ANALYZE SELECT * FROM opt_demo WHERE status = 0;
-- 观察：Seq Scan + 估算行数与实际严重偏差

-- 2. 诊断：统计信息是否看清了分布？
SELECT n_distinct FROM pg_stats
WHERE tablename='opt_demo' AND attname='status';   -- 只有模糊估计

-- 3. 药方：建索引 + 精化统计后复测
CREATE INDEX idx_opt_status ON opt_demo(status);
ANALYZE opt_demo;
EXPLAIN ANALYZE SELECT * FROM opt_demo WHERE status = 0;
-- 现在走 Bitmap/Index Scan，耗时骤降

-- 4. 对照实验：反向验证"优化器有时拒绝索引是对的"
SET enable_seqscan = off;
EXPLAIN SELECT * FROM opt_demo WHERE status = 1;   -- 99% 的行，强制索引代价更高
RESET enable_seqscan;
-- 印证：优化器拒绝索引是合理的——优化是让估算变准，不是逼它走索引
```

第 4 步是本篇的点睛之笔：**同一条 SQL，status=0 该走索引、status=1 不该走**——优化器的"固执"往往是对的，先怀疑自己的统计信息再怀疑它。

## 常见困惑

**"ANALYZE 与 VACUUM 什么关系？"**——autovacuum 进程两者顺带做：VACUUM 清理死元组并刷新可见性映射（影响 [Index Only Scan](/postgresql/230-CoveringIndexPartialIndex)），ANALYZE 刷新统计信息。手动补救时两者一起跑：`VACUUM ANALYZE 表名;`

**"EXPLAIN 不加 ANALYZE 会执行查询吗？"**——不会，只出估算计划，可安全用于大查询预演；加 ANALYZE 才真执行（UPDATE/DELETE 类慎用，会真的改数据——用 BEGIN ... ROLLBACK 包裹）。

**"pg_stat_statements 是什么？"**——内置扩展（`CREATE EXTENSION pg_stat_statements`），按语句指纹聚合总耗时/调用次数/平均时间，是"发现谁最值得优化"的入口，与本篇的 EXPLAIN 诊断构成前后手。

## 检验清单

- 能说出 autovacuum_analyze 触发公式，以及大表为什么要单独调 scale_factor；
- 理解 random_page_cost 与 SSD 的关系，并解释为什么这一刀能治愈"有索引不走"；
- 会用 BUFFERS 与 Sort Method 判读内存溢盘，并知道 work_mem 的"每节点"陷阱；
- 能用 enable_seqscan 做对照实验，并说出"先怀疑统计信息再怀疑优化器"的纪律。

## 下一步

单机优化之上是并行加速：进入[并行查询](/postgresql/260-ParallelQuery)，看 PostgreSQL 如何把一张大表的扫描拆给多个 worker。
