---
order: 58
title: 查询优化
module: postgresql
category: PostgreSQL
difficulty: advanced
description: PostgreSQL查询优化：统计信息ANALYZE、代价估算、执行计划EXPLAIN与优化器提示
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/覆盖索引与部分索引
  - postgresql/KNN向量索引
  - postgresql/分区表
  - postgresql/分区裁剪与分区连接
prerequisites:
  - postgresql/概述与安装配置
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
WITH dept_stats AS MATERIALIZED (
    SELECT dept_id, AVG(salary) AS avg_salary
    FROM employees GROUP BY dept_id
)
SELECT * FROM dept_stats WHERE avg_salary > 50000;
```
