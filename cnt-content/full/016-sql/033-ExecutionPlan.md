---
order: 330
title: 执行计划
module: 'sql'
category: 数据库
difficulty: advanced
description: SQL执行计划：EXPLAIN与EXPLAIN ANALYZE的输出解读、扫描类型、连接策略与性能诊断
author: fanquanpp
updated: '2026-08-30'
related:
  - 'sql/032-Index'
  - 'sql/034-TransactionACIDProperty'
  - 'sql/035-IsolationLevel'
prerequisites:
  - 'sql/002-OverviewStandard'
---

## 1. 执行计划概述

执行计划（Execution Plan）是数据库优化器为 SQL 查询选择的执行策略。理解执行计划是 SQL 性能优化的核心技能。

### 1.1 优化器类型

| 类型            | 说明                         |
| --------------- | ---------------------------- |
| 基于规则（RBO） | 根据预定义规则选择执行计划   |
| 基于代价（CBO） | 估算各方案代价，选择最优方案 |

现代数据库主要使用 CBO，RBO 作为后备。

## 2. EXPLAIN 语法

### 2.1 各数据库语法

```sql
-- PostgreSQL
EXPLAIN SELECT * FROM employees WHERE dept_id = 5;
EXPLAIN ANALYZE SELECT * FROM employees WHERE dept_id = 5;  -- 实际执行

-- MySQL
EXPLAIN SELECT * FROM employees WHERE dept_id = 5;
EXPLAIN ANALYZE SELECT * FROM employees WHERE dept_id = 5;  -- MySQL 8.0+

-- SQL Server
SET SHOWPLAN_TEXT ON;
SELECT * FROM employees WHERE dept_id = 5;

-- Oracle
EXPLAIN PLAN FOR SELECT * FROM employees WHERE dept_id = 5;
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);
```

### 2.2 EXPLAIN vs EXPLAIN ANALYZE

| 特性     | EXPLAIN | EXPLAIN ANALYZE |
| -------- | ------- | --------------- |
| 执行查询 | 否      | 是              |
| 估算代价 | 是      | 是              |
| 实际时间 | 否      | 是              |
| 实际行数 | 否      | 是              |
| 副作用   | 无      | DML 会实际执行  |

## 3. PostgreSQL 执行计划解读

### 3.1 基本输出

```sql
EXPLAIN ANALYZE SELECT * FROM employees WHERE dept_id = 5;

-- 输出：
-- Seq Scan on employees  (cost=0.00..15.50 rows=5 width=68) (actual time=0.01..0.03 rows=5 loops=1)
--   Filter: (dept_id = 5)
--   Rows Removed by Filter: 45
-- Planning Time: 0.05 ms
-- Execution Time: 0.05 ms
```

**关键字段解读**：

| 字段        | 含义                         |
| ----------- | ---------------------------- |
| cost=X..Y   | X=启动代价，Y=总代价（估算） |
| rows=N      | 估算返回行数                 |
| width=N     | 估算每行平均字节数           |
| actual time | 实际执行时间（毫秒）         |
| actual rows | 实际返回行数                 |
| loops       | 执行次数                     |

### 3.2 扫描类型

```sql
-- 顺序扫描（Seq Scan）：全表扫描
Seq Scan on employees
-- 适合：小表、大部分行需要返回

-- 索引扫描（Index Scan）：使用B+树索引
Index Scan using idx_employees_dept on employees
-- 适合：选择性高的查询

-- 仅索引扫描（Index Only Scan）：覆盖索引
Index Only Scan using idx_employees_dept_name on employees
-- 适合：索引包含所有需要的列

-- 位图扫描（Bitmap Heap Scan + Bitmap Index Scan）
Bitmap Heap Scan on employees
  -> Bitmap Index Scan on idx_employees_dept
-- 适合：选择性中等，返回多行

-- 并行扫描（Parallel Seq Scan）
Parallel Seq Scan on employees
  Workers: 2
-- 适合：大表扫描
```

### 3.3 连接策略

```sql
-- Nested Loop Join
Nested Loop
  -> Index Scan on departments
  -> Index Scan on employees
-- 适合：小表驱动大表

-- Hash Join
Hash Join
  -> Seq Scan on departments
  -> Hash
    -> Seq Scan on employees
-- 适合：大表等值连接

-- Merge Join
Merge Join
  -> Index Scan on departments
  -> Index Scan on employees
-- 适合：已排序数据
```

## 4. MySQL 执行计划解读

### 4.1 EXPLAIN 输出列

```sql
EXPLAIN SELECT * FROM employees WHERE dept_id = 5;
```

| 列            | 含义                                  |
| ------------- | ------------------------------------- |
| id            | 查询标识符                            |
| select_type   | 查询类型（SIMPLE, PRIMARY, SUBQUERY） |
| table         | 访问的表                              |
| partitions    | 匹配的分区                            |
| type          | 访问类型（最重要）                    |
| possible_keys | 可能使用的索引                        |
| key           | 实际使用的索引                        |
| key_len       | 使用的索引长度                        |
| ref           | 与索引比较的列                        |
| rows          | 估算扫描行数                          |
| filtered      | 过滤比例                              |
| Extra         | 额外信息                              |

### 4.2 type 列（访问类型）

从优到劣排序：

| type   | 说明                          | 索引使用 |
| ------ | ----------------------------- | -------- |
| system | 表中只有一行                  | —        |
| const  | 最多匹配一行（主键/唯一索引） | 精确匹配 |
| eq_ref | 每行匹配一行（主键/唯一索引） | 精确匹配 |
| ref    | 匹配多行（非唯一索引）        | 前缀匹配 |
| range  | 范围扫描                      | 范围条件 |
| index  | 全索引扫描                    | 全索引   |
| ALL    | 全表扫描                      | 无索引   |

```sql
-- const：主键等值查询
EXPLAIN SELECT * FROM employees WHERE id = 1;
-- type: const

-- ref：非唯一索引等值查询
EXPLAIN SELECT * FROM employees WHERE dept_id = 5;
-- type: ref

-- range：范围查询
EXPLAIN SELECT * FROM employees WHERE salary > 50000;
-- type: range

-- ALL：全表扫描
EXPLAIN SELECT * FROM employees WHERE YEAR(created_at) = 2026;
-- type: ALL（函数导致索引失效）
```

### 4.3 Extra 列关键信息

| Extra 值              | 含义                   |
| --------------------- | ---------------------- |
| Using index           | 覆盖索引，无需回表     |
| Using where           | 服务层过滤             |
| Using index condition | 索引下推（ICP）        |
| Using temporary       | 使用临时表             |
| Using filesort        | 额外排序（非索引排序） |
| Using join buffer     | 使用连接缓冲区         |
| Impossible WHERE      | WHERE 条件不可能为真   |

## 5. 执行计划诊断

### 5.1 估算 vs 实际

```sql
-- PostgreSQL：对比估算与实际
EXPLAIN ANALYZE SELECT * FROM employees WHERE dept_id = 5;

-- 估算 rows=5 vs 实际 rows=5000
-- 说明统计信息过时，需要 ANALYZE
ANALYZE employees;
```

### 5.2 常见问题与解决

```sql
-- 问题1：全表扫描
-- 原因：缺少索引或索引失效
-- 解决：创建索引或改写查询
CREATE INDEX idx_employees_dept ON employees(dept_id);

-- 问题2：Using filesort
-- 原因：排序无法利用索引
-- 解决：创建排序索引
CREATE INDEX idx_employees_dept_salary ON employees(dept_id, salary DESC);

-- 问题3：Using temporary
-- 原因：GROUP BY/DISTINCT 需要临时表
-- 解决：优化 GROUP BY 列顺序，使其与索引一致

-- 问题4：rows 估算偏差大
-- 原因：统计信息过时
-- 解决：更新统计信息
ANALYZE employees;  -- PostgreSQL
ANALYZE TABLE employees;  -- MySQL
```

### 5.3 强制/提示索引

```sql
-- PostgreSQL：禁用顺序扫描
SET enable_seqscan = off;

-- MySQL：USE INDEX / FORCE INDEX
SELECT * FROM employees USE INDEX (idx_dept) WHERE dept_id = 5;
SELECT * FROM employees FORCE INDEX (idx_dept) WHERE dept_id = 5;

-- Oracle：提示
SELECT /*+ INDEX(e idx_dept) */ * FROM employees e WHERE dept_id = 5;
```
## EXPLAIN 基本用法

**基本写法：MySQL EXPLAIN**
`EXPLAIN <SQL语句>`
```sql
-- 查看 SELECT 执行计划
EXPLAIN SELECT * FROM employees WHERE dept_id = 5;

-- 查看 UPDATE/DELETE 执行计划
EXPLAIN UPDATE employees SET salary = salary * 1.1 WHERE dept_id = 5;
```

---

**基本写法：EXPLAIN ANALYZE 实际执行**
`EXPLAIN ANALYZE <SQL语句>`
```sql
-- PostgreSQL：实际执行并返回耗时统计
EXPLAIN ANALYZE
SELECT * FROM employees WHERE dept_id = 5;

-- MySQL 8.0+ 也支持
EXPLAIN ANALYZE
SELECT * FROM employees e JOIN departments d ON e.dept_id = d.id;
```

---

**基本写法：EXPLAIN FORMAT**
`EXPLAIN FORMAT=JSON <SQL语句>`
```sql
-- MySQL JSON 格式输出更详细信息
EXPLAIN FORMAT=JSON
SELECT * FROM employees WHERE salary > 50000;
```

---

**基本写法：PostgreSQL 详细格式**
`EXPLAIN (FORMAT <格式>) <SQL语句>`
```sql
-- PostgreSQL 输出格式选项
EXPLAIN (FORMAT TEXT) SELECT * FROM employees;
EXPLAIN (FORMAT JSON) SELECT * FROM employees;
EXPLAIN (FORMAT YAML) SELECT * FROM employees;
```

---

**基本写法：查看开销估算**
`EXPLAIN (COSTS ON) <SQL语句>`
```sql
-- PostgreSQL 显示成本估算
EXPLAIN (COSTS ON, ANALYZE ON, BUFFERS ON)
SELECT * FROM employees WHERE salary > 50000;
-- 输出含 cost=0.00..35.50 rows=100 width=256
-- buffers: shared hit=5 read=2
```

---

## MySQL 执行计划字段

**基本写法：type 字段（访问类型）**
`-- type 表示 MySQL 访问数据的方式`
```sql
-- type 性能从好到差：
-- system   表仅一行
-- const    主键/唯一索引等值查询
-- eq_ref   JOIN 时主键/唯一索引等值匹配
-- ref       非唯一索引等值匹配
-- range    索引范围扫描
-- index    全索引扫描
-- ALL      全表扫描（最差）
```

---

**基本写法：key 字段（实际使用的索引）**
`-- key 显示 MySQL 实际使用的索引名`
```sql
-- 查看是否走了索引
EXPLAIN SELECT * FROM employees WHERE emp_id = 100;
-- key: PRIMARY（走了主键索引）

EXPLAIN SELECT * FROM employees WHERE name = 'Alice';
-- key: NULL（未走索引，全表扫描）
```

---

**基本写法：rows 字段（扫描行数估算）**
`-- rows 表示预估需要扫描的行数`
```sql
-- rows 越小越好
EXPLAIN SELECT * FROM employees WHERE emp_id = 100;
-- rows: 1（高效）

EXPLAIN SELECT * FROM employees WHERE salary > 1000;
-- rows: 5000（较差，可能需要优化）
```

---

**基本写法：Extra 字段（额外信息）**
`-- Extra 显示额外的执行信息`
```sql
-- 常见 Extra 信息：
-- Using index        覆盖索引，无需回表
-- Using where        使用 WHERE 过滤
-- Using temporary    使用临时表（需优化）
-- Using filesort     使用文件排序（需优化）
-- Using join buffer   使用连接缓冲（需优化）
-- Impossible WHERE   WHERE 条件恒假
```

---

**基本写法：possible_keys 字段**
`-- possible_keys 显示可能使用的索引`
```sql
EXPLAIN SELECT * FROM employees WHERE dept_id = 5;
-- possible_keys: idx_dept_id
-- key: idx_dept_id  ← 实际用了
```

---

## PostgreSQL 执行计划节点

**基本写法：常见扫描节点**
`-- EXPLAIN 输出的节点类型`
```sql
-- Seq Scan        全表顺序扫描
-- Index Scan      索引扫描（回表）
-- Index Only Scan  仅索引扫描（覆盖索引）
-- Bitmap Index Scan + Bitmap Heap Scan 位图扫描
-- Tid Scan        按 CTID 扫描

EXPLAIN SELECT * FROM employees WHERE id = 100;
-- Index Scan using employees_pkey on employees
```

---

**基本写法：连接节点**
`-- JOIN 操作的执行节点`
```sql
-- Nested Loop    嵌套循环（适合小表）
-- Hash Join      哈希连接（适合大表等值连接）
-- Merge Join     合并连接（有序数据）

EXPLAIN SELECT * FROM employees e
JOIN departments d ON e.dept_id = d.id;
-- Hash Join
```

---

**基本写法：聚合与排序节点**
`-- 聚合和排序的执行方式`
```sql
-- HashAggregate    哈希聚合
-- GroupAggregate   分组聚合
-- Sort             排序
-- Limit            限制行数
-- Unique           去重

EXPLAIN SELECT dept, COUNT(*) FROM employees GROUP BY dept;
-- HashAggregate
```

---

## 索引使用分析

**基本写法：检查索引是否命中**
`EXPLAIN SELECT * FROM <表> WHERE <索引列> = <值>`
```sql
-- 验证索引是否被使用
EXPLAIN SELECT * FROM employees WHERE email = 'test@example.com';
-- key: idx_email ← 索引命中

EXPLAIN SELECT * FROM employees WHERE LEFT(email, 5) = 'test@';
-- key: NULL ← 索引失效（函数操作导致）
```

---

**基本写法：覆盖索引验证**
`EXPLAIN SELECT <索引列> FROM <表> WHERE <条件>`
```sql
-- Extra 显示 Using index 表示覆盖索引
EXPLAIN SELECT emp_id, name FROM employees WHERE dept_id = 5;
-- Extra: Using index ← 覆盖索引，无需回表
```

---

**基本写法：复合索引最左前缀**
`EXPLAIN SELECT * FROM <表> WHERE <复合索引第二列> = <值>`
```sql
-- 验证复合索引是否遵循最左前缀
CREATE INDEX idx_dept_name ON employees(dept_id, name);

-- 能用索引（从 dept_id 开始）
EXPLAIN SELECT * FROM employees WHERE dept_id = 5 AND name = 'Alice';
-- key: idx_dept_name

-- 不能用索引（跳过 dept_id）
EXPLAIN SELECT * FROM employees WHERE name = 'Alice';
-- key: NULL ← 索引失效
```

---

## 慢查询分析

**基本写法：开启慢查询日志**
`SET GLOBAL slow_query_log = ON;`
```sql
-- MySQL 开启慢查询日志
SET GLOBAL slow_query_log = ON;
SET GLOBAL long_query_time = 1;  -- 超过 1 秒记录
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
```

---

**基本写法：查看慢查询**
`-- 分析慢查询日志`
```bash
# 使用 mysqldumpslow 分析慢日志
mysqldumpslow -s t -t 10 /var/log/mysql/slow.log
# -s t 按总时间排序
# -t 10 显示前 10 条
```

---

**基本写法：PostgreSQL 慢查询**
`-- 修改 postgresql.conf`
```ini
# postgresql.conf 配置
log_min_duration_statement = 1000  # 记录超过 1 秒的查询
log_statement = 'none'
log_duration = off
```

---

## 优化器提示

**基本写法：MySQL 索引提示**
`SELECT * FROM <表> FORCE INDEX(<索引名>) WHERE <条件>`
```sql
-- 强制使用指定索引
SELECT * FROM employees FORCE INDEX(idx_dept)
WHERE dept_id = 5;

-- 忽略指定索引
SELECT * FROM employees IGNORE INDEX(idx_name)
WHERE dept_id = 5;
```

---

**基本写法：PostgreSQL 优化器开关**
`SET enable_seqscan = off;`
```sql
-- 临时关闭顺序扫描强制使用索引
SET enable_seqscan = off;
EXPLAIN SELECT * FROM employees WHERE dept_id = 5;
-- 恢复
SET enable_seqscan = on;
```

---

**基本写法：PostgreSQL JOIN 方法控制**
`SET enable_hashjoin = off;`
```sql
-- 强制使用 Nested Loop 而非 Hash Join
SET enable_hashjoin = off;
SET enable_mergejoin = off;
EXPLAIN SELECT * FROM employees e JOIN departments d ON e.dept_id = d.id;
```
