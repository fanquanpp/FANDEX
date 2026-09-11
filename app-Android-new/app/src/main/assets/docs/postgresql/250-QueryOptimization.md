---
order: 250
title: 查询优化
module: 'postgresql'
category: 数据库
difficulty: advanced
description: PostgreSQL查询优化：统计信息ANALYZE、代价估算、执行计划EXPLAIN与优化器提示
author: fanquanpp
updated: '2026-09-12'
related:
  - 'postgresql/230-CoveringIndexPartialIndex'
  - 'postgresql/320-KNNVectorIndex'
  - 'postgresql/270-PartitionedTable'
  - 'postgresql/280-PartitionPruningPartitionJoin'
prerequisites:
  - 'postgresql/010-OverviewInstallConfig'
---


## 1. 统计信息

### 1.1 ANALYZE

```sql
-- 更新表统计信息
ANALYZE employees;

-- 更新特定列
ANALYZE employees(dept_id, salary);

-- 自动分析配置
ALTER SYSTEM SET autovacuum_analyze_scale_factor = 0.1;
ALTER SYSTEM SET autovacuum_analyze_threshold = 50;
```

### 1.2 统计信息内容

```sql
-- 查看列统计信息
SELECT attname, n_distinct, null_frac, avg_width
FROM pg_stats
WHERE tablename = 'employees';

-- 增加统计目标（更精确但更慢）
ALTER TABLE employees ALTER COLUMN dept_id SET STATISTICS 500;
ANALYZE employees;
```

## 2. 代价估算

```sql
-- 查看代价参数
SHOW seq_page_cost;      -- 1.0  顺序扫描单页代价
SHOW random_page_cost;   -- 4.0  随机I/O单页代价
SHOW cpu_tuple_cost;     -- 0.01 处理每行代价
SHOW cpu_index_tuple_cost; -- 0.005 索引条目代价

-- SSD 可降低 random_page_cost
ALTER SYSTEM SET random_page_cost = 1.1;
```

## 3. EXPLAIN

```sql
-- 查看执行计划
EXPLAIN SELECT * FROM employees WHERE dept_id = 5;

-- 实际执行
EXPLAIN ANALYZE SELECT * FROM employees WHERE dept_id = 5;

-- 详细输出
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM employees WHERE dept_id = 5;

-- 关键指标：
-- cost=0.00..15.50  估算代价
-- rows=5            估算行数
-- actual time=0.01..0.03  实际时间
-- rows=5            实际行数
-- Buffers: shared read=5  缓冲区读取
```

## 4. 常见优化

```sql
-- 1. 更新统计信息
ANALYZE employees;

-- 2. 创建索引
CREATE INDEX idx_employees_dept ON employees(dept_id);

-- 3. 调整 work_mem
SET work_mem = '64MB';  -- 增大排序/哈希内存

-- 4. 使用 CTE 控制优化器
-- PostgreSQL 12+ 中 CTE 默认可被内联优化, 加 MATERIALIZED 才强制物化:
-- 物化后 CTE 只算一次, 但外层过滤条件无法下推
WITH dept_stats AS MATERIALIZED (
    SELECT dept_id, AVG(salary) AS avg_salary
    FROM employees GROUP BY dept_id
)
SELECT * FROM dept_stats WHERE avg_salary > 50000;
```

## 5. 优化器提示（Hint）

```sql
-- PostgreSQL 核心不支持 SQL Hint 注释
-- 需要干预计划时, 常用两种手段:

-- 方案1: 会话级开关（原生, 最常用）
SET enable_seqscan = off;      -- 临时关闭顺序扫描（仅调试用, 不是硬性约束）
SET enable_nestloop = off;     -- 临时关闭嵌套循环连接
SET max_parallel_workers_per_gather = 0;  -- 禁用并行

-- 方案2: pg_hint_plan 扩展（企业常用）
CREATE EXTENSION pg_hint_plan;
-- 通过特殊注释强制连接方法/扫描方法/连接顺序
SELECT /*+ HashJoin(a b) SeqScan(a) */ *
FROM employees a JOIN departments b ON a.dept_id = b.id;
```
