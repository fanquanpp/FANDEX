---
order: 430
title: 执行计划
module: 'sql'
category: 数据库
difficulty: advanced
description: EXPLAIN 与 EXPLAIN ANALYZE：PostgreSQL/MySQL 计划输出解读、扫描与连接节点、估算偏差诊断与慢查询定位工作流。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'sql/440-PerformanceOptimization'
  - 'sql/420-Index'
  - 'sql/360-TransactionACIDProperty'
prerequisites:
  - 'sql/420-Index'
---

## 1. 执行计划概述

执行计划（Execution Plan）是优化器为一条 SQL 选定的执行策略：先访问哪张表、用哪个索引、
以什么顺序和算法做连接。**性能优化的第一步永远是看执行计划，而不是凭感觉改写 SQL。**

### 1.1 优化器类型

| 类型            | 说明                         |
| --------------- | ---------------------------- |
| 基于规则（RBO） | 按预定义规则选择执行计划     |
| 基于代价（CBO） | 估算各方案代价，选择最优方案 |

PostgreSQL、MySQL、SQL Server、Oracle 的核心都是 CBO；代价估算依赖统计信息，
所以"统计信息过时"是计划变差的头号常见原因。

## 2. EXPLAIN 语法与安全性

```sql
-- PostgreSQL：EXPLAIN 只估计划不执行；EXPLAIN ANALYZE 真实执行
EXPLAIN SELECT * FROM employees WHERE dept_id = 5;
EXPLAIN ANALYZE SELECT * FROM employees WHERE dept_id = 5;

-- MySQL：EXPLAIN 只估计划；EXPLAIN ANALYZE（8.0.18+）真实执行并给出树状耗时
EXPLAIN SELECT * FROM employees WHERE dept_id = 5;
EXPLAIN ANALYZE SELECT * FROM employees WHERE dept_id = 5;

-- SQL Server
SET SHOWPLAN_TEXT ON;

-- Oracle
EXPLAIN PLAN FOR SELECT * FROM employees WHERE dept_id = 5;
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);
```

| 特性     | EXPLAIN | EXPLAIN ANALYZE            |
| -------- | ------- | -------------------------- |
| 执行查询 | 否      | 是                         |
| 估算代价 | 是      | 是                         |
| 实际耗时 | 否      | 是                         |
| 实际行数 | 否      | 是                         |
| 副作用   | 无      | DML 会真实生效             |

> **重要**：`EXPLAIN ANALYZE UPDATE/DELETE` 会真的改数据。PostgreSQL 的标准做法是
> 包在事务里回滚：`BEGIN; EXPLAIN ANALYZE UPDATE ...; ROLLBACK;`。
> MySQL 8.0.18+ 的 EXPLAIN ANALYZE 仅支持 SELECT（以及 8.0.21+ 的部分 DML 场景），
> 生产数据上验证 DML 计划请先备份或用等价 SELECT。

### 2.1 输出格式控制

```sql
-- MySQL：JSON 树状输出，信息最全
EXPLAIN FORMAT=JSON SELECT * FROM employees WHERE salary > 50000;

-- PostgreSQL：支持 TEXT / JSON / YAML 等格式
EXPLAIN (FORMAT JSON) SELECT * FROM employees;

-- PostgreSQL：BUFFERS 显示缓存命中，判断 IO 是否是瓶颈
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM employees WHERE salary > 50000;
-- 输出含 shared hit=5 read=2（hit 为内存命中，read 为磁盘读）
```

## 3. PostgreSQL 计划解读

### 3.1 一行输出的关键字段

```sql
EXPLAIN ANALYZE SELECT * FROM employees WHERE dept_id = 5;

-- Seq Scan on employees
--   (cost=0.00..15.50 rows=5 width=68)
--   (actual time=0.01..0.03 rows=5 loops=1)
--   Filter: (dept_id = 5)
--   Rows Removed by Filter: 45
-- Planning Time: 0.05 ms
-- Execution Time: 0.05 ms
```

| 字段            | 含义                                   |
| --------------- | -------------------------------------- |
| cost=X..Y       | 启动代价..总代价（估算值，无量纲单位） |
| rows=N          | 估算返回行数                           |
| width=N         | 估算每行平均字节数                     |
| actual time     | 实际耗时（毫秒，`0.01..0.03` 为首行..全部） |
| actual rows     | 实际行数                               |
| loops           | 该节点执行次数（actual time 是单次均值） |
| Rows Removed by Filter | 被过滤条件丢弃的行数，越大说明扫描越浪费 |

### 3.2 常见扫描节点

```sql
-- Seq Scan：全表顺序扫描（小表或命中大部分行时反而是最优）
-- Index Scan：索引定位 + 回表（选择性高）
-- Index Only Scan：覆盖索引，不回表（可见性映射确认后可跳过堆访问）
-- Bitmap Heap Scan + Bitmap Index Scan：先在索引里选出位图再批量回表（中等选择性）
-- Parallel Seq Scan：并行全表扫描
-- Tid Scan：按物理行号直接定位（少见）
```

### 3.3 连接节点

```sql
-- Nested Loop：外表每行驱动一次内表查找
--   适合：外表小、内表连接列有索引（OLTP 点查）
-- Hash Join：先对小表建哈希表，再扫描大表探测
--   适合：大表等值连接、无可用索引
-- Merge Join：两侧先按连接键排序后归并
--   适合：数据已按连接键有序、需要排序输出的场景
```

### 3.4 聚合与排序节点

```sql
-- HashAggregate：哈希聚合（无序输出）
-- GroupAggregate：先排序后分组聚合（常见于 GROUP BY 已有索引）
-- Sort / Limit / Unique：排序、截断、去重
EXPLAIN SELECT dept, COUNT(*) FROM employees GROUP BY dept;
-- 优化器会在 HashAggregate 与 GroupAggregate 间按代价选择
```

## 4. MySQL 计划解读

### 4.1 EXPLAIN 输出列

| 列            | 含义                                  |
| ------------- | ------------------------------------- |
| id            | 查询标识符（越大越先执行）            |
| select_type   | SIMPLE / PRIMARY / SUBQUERY / DERIVED |
| table         | 访问的表                              |
| type          | 访问类型（最重要）                    |
| possible_keys | 候选索引                              |
| key           | 实际使用的索引（NULL 即未用索引）     |
| key_len       | 使用的索引字节数（判断复合索引用了几列） |
| ref           | 与索引比较的列或常量                  |
| rows          | 估算扫描行数                          |
| filtered      | 存储层返回后按条件过滤的比例          |
| Extra         | 额外信息                              |

### 4.2 type 列：访问类型从优到劣

| type   | 说明                          | 典型场景         |
| ------ | ----------------------------- | ---------------- |
| system | 表仅一行                      | 系统表           |
| const  | 主键/唯一索引等值，最多一行   | WHERE id = 1     |
| eq_ref | 连接时对每行恰好匹配一行      | JOIN ON 主键     |
| ref    | 非唯一索引等值匹配            | WHERE dept_id=5  |
| range  | 索引范围扫描                  | WHERE salary>50000 |
| index  | 全索引扫描（扫整棵索引树）    | 覆盖索引兜底     |
| ALL    | 全表扫描，需要重点优化        | 无可用索引       |

```sql
-- 函数包裹索引列 → 优化器无法使用索引
EXPLAIN SELECT * FROM employees WHERE YEAR(created_at) = 2026;
-- type: ALL。改为范围条件即可用索引：
-- WHERE created_at >= '2026-01-01' AND created_at < '2027-01-01'
```

### 4.3 Extra 列关键值

| Extra 值              | 含义                       | 处置           |
| --------------------- | -------------------------- | -------------- |
| Using index           | 覆盖索引，无需回表         | 理想状态       |
| Using where           | 服务层过滤                 | 通常无害       |
| Using index condition | 索引条件下推（ICP）        | 正向优化       |
| Using temporary       | 用临时表（GROUP BY/DISTINCT） | 尽量消除    |
| Using filesort        | 需额外排序（非索引序）     | 建排序索引     |
| Using join buffer     | 连接列无索引，用缓冲区     | 给连接列建索引 |
| Impossible WHERE      | 条件恒假                   | 检查条件逻辑   |

### 4.4 EXPLAIN ANALYZE（树状真实耗时）

```sql
EXPLAIN ANALYZE
SELECT * FROM employees e JOIN departments d ON e.dept_id = d.id;
-- 8.0.18+ 输出树状计划，每个节点带 actual time 与 rows，
-- 还能看出优化器预估与实际的偏差
```

## 5. 诊断工作流

### 5.1 第一步：估算与实际对比

```sql
-- PostgreSQL
EXPLAIN ANALYZE SELECT * FROM employees WHERE dept_id = 5;
-- 估算 rows=5 vs 实际 rows=5000 → 统计信息过时
ANALYZE employees;          -- 手动收集统计信息

-- MySQL
ANALYZE TABLE employees;    -- 同理
```

估算偏差超过一个数量级时，优化器可能从正确索引滑向全表扫描；持续偏差大的表考虑
调大统计采样（PG 的 `default_statistics_target`）或给相关列建扩展统计。

### 5.2 第二步：按症状处理

```sql
-- 症状1：全表扫描（Seq Scan / type=ALL）
CREATE INDEX idx_employees_dept ON employees(dept_id);

-- 症状2：Using filesort
-- 建与排序方向一致的复合索引
CREATE INDEX idx_dept_salary ON employees(dept_id, salary DESC);

-- 症状3：Using temporary
-- 让 GROUP BY 列顺序与索引前缀一致，避免隐式去重排序
```

### 5.3 第三步：定位慢 SQL 的源头

计划只是结果，先要找到值得优化的语句：

```sql
-- MySQL：开启慢查询日志
SET GLOBAL slow_query_log = ON;
SET GLOBAL long_query_time = 1;          -- 超过 1 秒记录
-- 用 mysqldumpslow 聚合分析：
-- mysqldumpslow -s t -t 10 /var/log/mysql/slow.log

-- PostgreSQL：postgresql.conf 记录超时语句
--   log_min_duration_statement = 1000
-- 配合 pg_stat_statements 扩展按总耗时排序：
SELECT query, calls, total_exec_time
FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;
```

### 5.4 强制干预：提示与开关

生产改写计划前先验证假设，验证手段要能随时还原：

```sql
-- MySQL：索引提示
SELECT * FROM employees USE INDEX (idx_dept) WHERE dept_id = 5;
SELECT * FROM employees FORCE INDEX (idx_dept) WHERE dept_id = 5;
SELECT * FROM employees IGNORE INDEX (idx_name) WHERE dept_id = 5;

-- PostgreSQL：会话级优化器开关（仅调试用，别写进生产配置）
SET enable_seqscan = off;    -- 逼优化器用索引
SET enable_hashjoin = off;   -- 逼优化器用 Nested Loop / Merge Join
-- 验证完恢复：SET enable_seqscan = on;
```

> PostgreSQL 没有 Oracle/MySQL 式的语句级 hint（扩展除外），干预计划主要靠
> 统计信息、索引设计与（必要时）会话开关。

## 6. 小结

- 先 `EXPLAIN` 看计划，再 `EXPLAIN ANALYZE` 验证真实执行；DML 一定要包事务回滚。
- PostgreSQL 关注 cost/rows 估算与 actual 的偏差、`Rows Removed by Filter`；
  MySQL 关注 type 层级、key 与 Extra 的 temporary/filesort。
- 估算严重偏差时先 `ANALYZE` 更新统计信息，而不是急着加索引。
- 慢查询定位：MySQL 慢日志 + mysqldumpslow；PostgreSQL log_min_duration_statement
  + pg_stat_statements。
- 强制干预只是验证手段：长期解法永远是索引设计、SQL 改写与统计信息维护。
