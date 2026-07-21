---
order: 100
title: 并行查询
module: postgresql
category: database
difficulty: advanced
description: 'PostgreSQL 并行查询机制：并行顺序扫描、并行索引扫描、并行聚合、Gather 节点与并行度配置。'
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/生成列
  - postgresql/可更新视图
  - postgresql/逻辑复制与物理复制对比
  - postgresql/JSONB与JSON差异
prerequisites:
  - postgresql/概述与安装配置
---

## 1. 并行查询架构

### 1.1 并行查询模型

PostgreSQL（9.6+）采用**进程模型**实现并行查询：

```
                    ┌──────────────┐
                    │  Backend     │ ← 用户连接进程
                    │  (Leader)    │
                    └──────┬───────┘
                           │ Gather / Gather Merge
              ┌────────────┼────────────┐
              ↓            ↓            ↓
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Worker 1 │ │ Worker 2 │ │ Worker 3 │ ← 后台工作进程
        └──────────┘ └──────────┘ └──────────┘
```

**Leader 进程**：接收查询、协调 Worker、合并结果
**Worker 进程**：并行执行部分数据扫描

### 1.2 并行查询执行流程

```
1. 优化器判断查询是否适合并行
2. 生成包含 Gather 节点的执行计划
3. Leader 启动 Worker 进程
4. Worker 并行扫描数据
5. Leader 收集 Worker 结果并返回
```

## 2. 并行扫描类型

### 2.1 并行顺序扫描（Parallel Sequential Scan）

将表按 Block 分配给各 Worker：

```sql
EXPLAIN ANALYZE
SELECT count(*) FROM large_table WHERE status = 'active';

-- 执行计划示例
-- Finalize Aggregate (cost=... rows=1)
--   -> Gather (cost=... workers=4)
--         -> Partial Aggregate (cost=...)
--               -> Parallel Seq Scan on large_table
--                   Filter: (status = 'active')
```

**Block 分配策略**：

```
表大小: 1000 个 Block
Worker 数: 4

Worker 1: Block 0-249
Worker 2: Block 250-499
Worker 3: Block 500-749
Worker 4: Block 750-999
```

### 2.2 并行索引扫描（Parallel Index Scan）

B-tree 索引的并行扫描，各 Worker 扫描索引的不同范围：

```sql
EXPLAIN ANALYZE
SELECT * FROM orders WHERE order_date > '2026-01-01' ORDER BY order_date;

-- 执行计划示例
-- Gather Merge (cost=...)
--   -> Sort (cost=...)
--         -> Parallel Index Scan using idx_order_date on orders
--             Index Cond: (order_date > '2026-01-01')
```

### 2.3 并行位图堆扫描（Parallel Bitmap Heap Scan）

位图扫描阶段由 Leader 完成，堆扫描阶段由 Worker 并行：

```sql
EXPLAIN ANALYZE
SELECT * FROM orders WHERE customer_id = 100;

-- 执行计划示例
-- Gather (cost=...)
--   -> Parallel Bitmap Heap Scan on orders
--         Recheck Cond: (customer_id = 100)
--         -> Bitmap Index Scan using idx_customer
```

### 2.4 并行仅索引扫描（Parallel Index-Only Scan）

```sql
EXPLAIN ANALYZE
SELECT customer_id FROM orders WHERE customer_id > 5000;

-- Parallel Index-Only Scan using idx_customer on orders
--   Index Cond: (customer_id > 5000)
```

## 3. 并行聚合

### 3.1 两阶段聚合

```
阶段1 (Worker): Partial Aggregate — 各 Worker 独立计算部分聚合
阶段2 (Leader): Finalize Aggregate — 合并各 Worker 的部分结果
```

```sql
EXPLAIN ANALYZE
SELECT department, avg(salary), count(*)
FROM employees
GROUP BY department;

-- Finalize Aggregate
--   -> Gather
--         -> Partial Aggregate
--               -> Parallel Seq Scan on employees
```

### 3.2 并行聚合的数学原理

```
SUM:  SUM(partial_sum_1, partial_sum_2, ...) = total_sum
AVG:  SUM(partial_sum) / SUM(partial_count) = total_avg
COUNT: SUM(partial_count) = total_count
MIN:  MIN(partial_min_1, partial_min_2, ...) = total_min
MAX:  MAX(partial_max_1, partial_max_2, ...) = total_max
```

## 4. 并行连接

### 4.1 并行嵌套循环连接

```sql
EXPLAIN ANALYZE
SELECT * FROM orders o JOIN customers c ON o.customer_id = c.id;

-- Gather
--   -> Nested Loop
--         -> Parallel Seq Scan on orders
--         -> Index Scan using customers_pkey on customers
```

### 4.2 并行哈希连接

```sql
EXPLAIN ANALYZE
SELECT * FROM large_table l JOIN small_table s ON l.key = s.key;

-- Gather
--   -> Hash Join
--         Hash Cond: (l.key = s.key)
--         -> Parallel Seq Scan on large_table
--         -> Hash
--               -> Seq Scan on small_table
```

### 4.3 并行合并连接

```sql
EXPLAIN ANALYZE
SELECT * FROM orders o JOIN order_items i ON o.id = i.order_id ORDER BY o.id;

-- Gather Merge
--   -> Merge Join
--         Merge Cond: (o.id = i.order_id)
--         -> Parallel Index Scan using orders_pkey on orders
--         -> Index Scan using idx_order_items_order_id on order_items
```

## 5. 并行度配置

### 5.1 核心参数

```sql
-- 最大 Worker 数（全局）
SET max_parallel_workers = 8;

-- 每个 Gather 的最大 Worker 数
SET max_parallel_workers_per_gather = 4;

-- 触发并行的最小表大小（8MB）
SET min_parallel_table_scan_size = '8MB';

-- 触发并行的最小索引大小
SET min_parallel_index_scan_size = '512kB';

-- 并行代价估算因子
SET parallel_tuple_cost = 0.1;     -- Worker 传输一行的代价
SET parallel_setup_cost = 1000.0;  -- 启动 Worker 的代价
```

### 5.2 并行度计算

```
表大小: 1GB
min_parallel_table_scan_size: 8MB

并行度 = log2(table_size / min_parallel_table_scan_size)
       = log2(1024 / 8)
       = log2(128)
       = 7

实际并行度 = min(7, max_parallel_workers_per_gather, max_parallel_workers)
```

### 5.3 强制并行

```sql
-- 临时调大并行度
SET max_parallel_workers_per_gather = 8;
SET parallel_tuple_cost = 0;
SET parallel_setup_cost = 0;

-- 强制使用并行（仅测试用）
SET force_parallel_mode = on;
```

### 5.4 禁用并行

```sql
-- 全局禁用
SET max_parallel_workers_per_gather = 0;

-- 单查询禁用
SELECT /*+ NoParallel(table_name) */ * FROM table_name;
```

## 6. 并行查询限制

### 6.1 不支持并行的场景

| 场景                             | 原因                     |
| -------------------------------- | ------------------------ |
| 数据修改（INSERT/UPDATE/DELETE） | 写操作需串行保证一致性   |
| CTE（WITH 子句）                 | CTE 物化后无法并行       |
| 游标（CURSOR）                   | 需要顺序返回             |
| 触发器中的查询                   | 事务上下文限制           |
| 递归查询                         | 依赖前一步结果           |
| 子事务                           | 事务状态复杂             |
| 非可并行函数                     | volatile/stable 函数限制 |

### 6.2 并行查询监控

```sql
-- 查看当前并行查询
SELECT pid, query, state
FROM pg_stat_activity
WHERE query LIKE '%Gather%';

-- 查看并行 Worker 使用情况
SELECT * FROM pg_stat_progress_parallel;

-- 分析并行查询效果
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT count(*) FROM large_table;
```
