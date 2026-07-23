---
order: 73
title: 锁机制
module: sql
category: SQL
difficulty: advanced
description: SQL锁机制：共享锁、排他锁、意向锁、间隙锁、临键锁的原理、兼容性与死锁预防
author: fanquanpp
updated: '2026-06-14'
related:
  - sql/隔离级别
  - sql/脏读不可重复读幻读
  - sql/多版本并发控制
  - sql/窗口函数框架
prerequisites:
  - sql/概述与标准
---

## 1. 锁概述

锁是数据库实现事务隔离的核心机制，通过限制并发访问来保证数据一致性。

### 1.1 锁的分类维度

| 维度 | 类型                               |
| ---- | ---------------------------------- |
| 粒度 | 全局锁、表级锁、行级锁             |
| 模式 | 共享锁（S）、排他锁（X）           |
| 意向 | 意向共享锁（IS）、意向排他锁（IX） |
| 算法 | 记录锁、间隙锁、临键锁             |

## 2. 共享锁与排他锁

### 2.1 共享锁（S Lock / Read Lock）

允许多个事务同时读取同一资源，但阻止排他锁。

```sql
-- 获取共享锁
SELECT * FROM employees WHERE id = 1 LOCK IN SHARE MODE;  -- MySQL
SELECT * FROM employees WHERE id = 1 FOR SHARE;            -- PostgreSQL

-- 事务A持有共享锁
BEGIN;
SELECT * FROM employees WHERE id = 1 FOR SHARE;

-- 事务B也可以获取共享锁
BEGIN;
SELECT * FROM employees WHERE id = 1 FOR SHARE;  -- 成功

-- 事务C无法获取排他锁
UPDATE employees SET salary = 50000 WHERE id = 1;  -- 等待
```

### 2.2 排他锁（X Lock / Write Lock）

只允许一个事务访问资源，阻止所有其他锁。

```sql
-- 获取排他锁
SELECT * FROM employees WHERE id = 1 FOR UPDATE;

-- 事务A持有排他锁
BEGIN;
SELECT * FROM employees WHERE id = 1 FOR UPDATE;

-- 事务B无法获取任何锁
SELECT * FROM employees WHERE id = 1 FOR SHARE;   -- 等待
SELECT * FROM employees WHERE id = 1 FOR UPDATE;  -- 等待
UPDATE employees SET salary = 50000 WHERE id = 1;  -- 等待
```

### 2.3 锁兼容性矩阵

|       | S   | X   |
| ----- | --- | --- |
| **S** |     |     |
| **X** |     |     |

## 3. 意向锁

### 3.1 概念

意向锁是表级锁，表示事务打算在表中的行上获取锁。用于快速判断表中是否存在行级锁，避免逐行检查。

```
意向锁的目的：
事务A在行上持有S锁 → 表上自动加IS锁
事务B想加表级X锁 → 检查表上是否有IS/IX锁 → 有则等待
→ 无需逐行检查行级锁
```

### 3.2 意向锁类型

| 锁类型         | 含义                |
| -------------- | ------------------- |
| IS（意向共享） | 事务打算在行上加S锁 |
| IX（意向排他） | 事务打算在行上加X锁 |

### 3.3 完整锁兼容性矩阵

|        | IS  | IX  | S   | X   |
| ------ | --- | --- | --- | --- |
| **IS** |     |     |     |     |
| **IX** |     |     |     |     |
| **S**  |     |     |     |     |
| **X**  |     |     |     |     |

```sql
-- 意向锁自动获取
BEGIN;
SELECT * FROM employees WHERE id = 1 FOR UPDATE;
-- 自动在 employees 表上加 IX 锁
-- 在 id=1 行上加 X 锁

-- 另一个事务尝试加表级锁
LOCK TABLE employees IN EXCLUSIVE MODE;  -- 等待，因为表上有 IX 锁
```

## 4. 间隙锁（Gap Lock）

### 4.1 概念

间隙锁锁定索引记录之间的间隙，防止其他事务在间隙中插入新记录，是 InnoDB 防止幻读的关键机制。

```
索引记录：  [10]  [20]  [30]  [40]
间隙：     (−∞,10) (10,20) (20,30) (30,40) (40,+∞)

间隙锁锁定间隙，不锁定记录本身
```

### 4.2 间隙锁行为

```sql
-- 事务A
BEGIN;
SELECT * FROM employees WHERE id BETWEEN 10 AND 20 FOR UPDATE;
-- 锁定间隙 (10, 20) 和记录 [10], [20]

-- 事务B
INSERT INTO employees (id, name) VALUES (15, 'new');
-- 被阻塞！id=15 在间隙 (10, 20) 内

-- 事务B
INSERT INTO employees (id, name) VALUES (25, 'new');
-- 成功！id=25 不在锁定间隙内
```

### 4.3 间隙锁的特性

- 间隙锁之间**不冲突**：多个事务可以同时持有同一间隙的间隙锁
- 间隙锁只阻止**插入**，不阻止读取
- 间隙锁在 REPEATABLE READ 隔离级别下自动使用

```sql
-- 间隙锁不冲突
-- 事务A
SELECT * FROM t WHERE id > 10 FOR UPDATE;  -- 锁定 (10, +∞) 间隙

-- 事务B
SELECT * FROM t WHERE id > 10 FOR UPDATE;  -- 也锁定 (10, +∞) 间隙，不冲突！

-- 但插入会冲突
INSERT INTO t VALUES (15, 'x');  -- 等待事务A或B释放间隙锁
```

## 5. 临键锁（Next-Key Lock）

### 5.1 概念

临键锁 = 记录锁 + 间隙锁，锁定索引记录及其前面的间隙。是 InnoDB 在 REPEATABLE READ 下的默认行锁算法。

```
索引记录：  [10]  [20]  [30]
临键锁：    (−∞,10] (10,20] (20,30] (30,+∞)
```

### 5.2 临键锁示例

```sql
-- 事务A
BEGIN;
SELECT * FROM employees WHERE dept_id = 5 FOR UPDATE;
-- 假设 dept_id = 5 的记录为 [3, 7, 12]
-- 临键锁锁定：(prev, 3], (3, 7], (7, 12], (12, next]

-- 事务B
INSERT INTO employees (dept_id, name) VALUES (5, 'new');
-- 被阻塞！所有 dept_id = 5 的间隙都被锁定
```

### 5.3 临键锁退化为记录锁

```sql
-- 使用唯一索引等值查询且记录存在时，退化为记录锁
BEGIN;
SELECT * FROM employees WHERE id = 5 FOR UPDATE;
-- id 是主键（唯一索引），且 id=5 存在
-- 只锁定 id=5 这一行，不锁定间隙

-- 使用唯一索引等值查询但记录不存在时，退化为间隙锁
BEGIN;
SELECT * FROM employees WHERE id = 5 FOR UPDATE;
-- id=5 不存在
-- 锁定 (prev_id, next_id) 间隙
```

## 6. 锁的查看与诊断

### 6.1 MySQL 查看锁

```sql
-- MySQL 8.0+
SELECT * FROM performance_schema.data_locks;
SELECT * FROM performance_schema.data_lock_waits;

-- 查看InnoDB锁状态
SHOW ENGINE INNODB STATUS;
```

### 6.2 PostgreSQL 查看锁

```sql
-- 查看当前锁
SELECT locktype, relation::regclass, mode, pid, granted
FROM pg_locks
WHERE pid != pg_backend_pid();

-- 查看阻塞关系
SELECT
    blocked.pid AS blocked_pid,
    blocker.pid AS blocker_pid,
    blocked.query AS blocked_query,
    blocker.query AS blocker_query
FROM pg_locks blocked
JOIN pg_locks blocker ON blocked.locktype = blocker.locktype
    AND blocked.database IS NOT DISTINCT FROM blocker.database
    AND blocked.relation IS NOT DISTINCT FROM blocker.relation
    AND blocked.page IS NOT DISTINCT FROM blocker.page
    AND blocked.tuple IS NOT DISTINCT FROM blocker.tuple
    AND blocked.pid != blocker.pid
    AND NOT blocked.granted
    AND blocker.granted;
```

## 7. 死锁

### 7.1 死锁条件

死锁需要同时满足四个条件：

1. 互斥：资源只能被一个事务持有
2. 持有并等待：持有资源的事务等待其他资源
3. 不可抢占：资源不能被强制释放
4. 循环等待：事务之间形成环形等待

### 7.2 死锁示例

```sql
-- 事务A
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;  -- 锁定 id=1

-- 事务B
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 2;  -- 锁定 id=2

-- 事务A
UPDATE accounts SET balance = balance + 100 WHERE id = 2;  -- 等待 id=2

-- 事务B
UPDATE accounts SET balance = balance + 100 WHERE id = 1;  -- 死锁！
```

### 7.3 死锁预防

```sql
-- 方法1：按固定顺序访问资源
-- 所有事务都先锁 id=1 再锁 id=2

-- 方法2：缩短事务时间
-- 减少锁持有时间

-- 方法3：使用低隔离级别
-- READ COMMITTED 比 REPEATABLE READ 锁范围更小

-- 方法4：设置锁超时
SET innodb_lock_wait_timeout = 5;  -- MySQL，5秒超时
SET lock_timeout = '5s';           -- PostgreSQL
```
