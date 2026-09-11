---
order: 390
title: 锁机制
module: 'sql'
category: 数据库
difficulty: advanced
description: SQL锁机制：共享锁、排他锁、意向锁、间隙锁、临键锁的原理、兼容性与死锁预防
author: fanquanpp
updated: '2026-09-12'
related:
  - 'sql/370-IsolationLevel'
  - 'sql/380-DirtyReadNonRepeatablePhantom'
  - 'sql/270-WindowFunctionFramework'
prerequisites:
  - 'sql/020-OverviewStandard'
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
## 行级锁

**基本写法：共享锁（S 锁）**
`SELECT * FROM <表> WHERE <条件> LOCK IN SHARE MODE;`
```sql
-- MySQL 共享锁：允许其他事务读，不允许写
BEGIN;
SELECT * FROM accounts WHERE id = 1 LOCK IN SHARE MODE;
-- 其他事务可以读，但不能修改此行
COMMIT;
```

---

**基本写法：PostgreSQL 共享锁**
`SELECT * FROM <表> WHERE <条件> FOR SHARE;`
```sql
-- PostgreSQL 共享锁
BEGIN;
SELECT * FROM accounts WHERE id = 1 FOR SHARE;
-- 其他事务可加 SHARE 锁，不能加 EXCLUSIVE 锁
COMMIT;
```

---

**基本写法：排他锁（X 锁）**
`SELECT * FROM <表> WHERE <条件> FOR UPDATE;`
```sql
-- 排他锁：阻止其他事务读写
BEGIN;
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
-- 其他事务无法读取或修改此行
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;
```

---

**基本写法：NOWAIT 不等待锁**
`SELECT * FROM <表> WHERE <条件> FOR UPDATE NOWAIT;`
```sql
-- 获取不到锁立即报错，不等待
BEGIN;
SELECT * FROM accounts WHERE id = 1 FOR UPDATE NOWAIT;
-- 如果行被锁定，立即报错：ERROR: could not obtain lock
COMMIT;
```

---

**基本写法：SKIP LOCKED 跳过锁定行**
`SELECT * FROM <表> WHERE <条件> FOR UPDATE SKIP LOCKED;`
```sql
-- 跳过被锁定的行（适合任务队列）
BEGIN;
SELECT id FROM task_queue WHERE status = 'pending'
FOR UPDATE SKIP LOCKED LIMIT 10;
-- 只返回未被锁定的行
COMMIT;
```

---

## 表级锁

**基本写法：MySQL 表锁**
`LOCK TABLES <表> [READ|WRITE];`
```sql
-- MySQL 表锁
LOCK TABLES employees WRITE;
-- 只有当前会话可读写
UNLOCK TABLES;

LOCK TABLES employees READ;
-- 所有会话只能读
UNLOCK TABLES;
```

---

**基本写法：PostgreSQL 表锁**
`LOCK TABLE <表> IN <模式> MODE;`
```sql
-- PostgreSQL 表级锁
LOCK TABLE employees IN SHARE MODE;
-- 允许并发读，阻止写

LOCK TABLE employees IN EXCLUSIVE MODE;
-- 只允许当前事务读写

LOCK TABLE employees IN ACCESS EXCLUSIVE MODE;
-- 最严格：阻止一切并发访问
```

---

**基本写法：锁模式层级**
`-- PostgreSQL 锁模式从弱到强`
```sql
-- ACCESS SHARE        SELECT 自动加（最弱）
-- ROW SHARE          SELECT FOR UPDATE/SHARE 自动加
-- ROW EXCLUSIVE      INSERT/UPDATE/DELETE 自动加
-- SHARE UPDATE       （预留）
-- SHARE              LOCK TABLE ... IN SHARE MODE
-- SHARE ROW EXCLUSIVE
-- EXCLUSIVE
-- ACCESS EXCLUSIVE   DROP/TRUNCATE/ALTER 自动加（最强）
```

---

## 间隙锁（MySQL InnoDB）

**基本写法：间隙锁防止幻读**
`SELECT * FROM <表> WHERE <范围条件> FOR UPDATE;`
```sql
-- REPEATABLE READ 下，范围查询加间隙锁
BEGIN;
SELECT * FROM accounts WHERE id BETWEEN 10 AND 20 FOR UPDATE;
-- 锁定 id=10 到 id=20 之间的间隙
-- 其他事务无法在此范围内插入数据
COMMIT;
```

---

**基本写法：临键锁（Next-Key Lock）**
`-- InnoDB 默认使用临键锁（行锁+间隙锁）`
```sql
-- 临键锁锁定的范围
-- 如果索引有 10, 15, 20
-- SELECT WHERE id > 10 AND id < 20 FOR UPDATE
-- 锁定：(10, 15], (15, 20)
-- 即锁住了 10 到 20 之间所有可能的位置
```

---

**基本写法：查看锁信息**
`SELECT * FROM information_schema.innodb_locks;`
```sql
-- MySQL 查看当前锁
SELECT * FROM performance_schema.data_locks;
SELECT * FROM performance_schema.data_lock_waits;

-- 查看锁等待
SELECT * FROM sys.innodb_lock_waits;
```

---

## 死锁

**基本写法：死锁产生场景**
`-- 两个事务互相等待对方释放锁`
```sql
-- 事务A
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;  -- 锁 id=1
UPDATE accounts SET balance = balance + 100 WHERE id = 2;  -- 等待 id=2 的锁

-- 事务B（同时执行）
BEGIN;
UPDATE accounts SET balance = balance - 200 WHERE id = 2;  -- 锁 id=2
UPDATE accounts SET balance = balance + 200 WHERE id = 1;  -- 等待 id=1 的锁
-- 死锁！
```

---

**基本写法：避免死锁**
`-- 按固定顺序访问资源`
```sql
-- 始终按 id 升序加锁，避免交叉等待
-- 事务A 和 事务B 都先锁 id=1 再锁 id=2
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

---

**基本写法：设置锁等待超时**
`SET innodb_lock_wait_timeout = <秒>;`
```sql
-- 设置锁等待超时（默认 50 秒）
SET innodb_lock_wait_timeout = 10;
-- 超时后报错并回滚当前语句
```

---

**基本写法：查看死锁日志**
`SHOW ENGINE INNODB STATUS\G`
```sql
-- 查看最近死锁信息
SHOW ENGINE INNODB STATUS\G
-- 查看 LATEST DETECTED DEADLOCK 部分
```

---

## 悲观锁

**基本写法：悲观锁模式**
`SELECT ... FOR UPDATE`
```sql
-- 先锁定再修改，确保安全
BEGIN;
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;
-- 应用层判断余额是否足够
-- 如果 balance >= 100
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;
```

---

**基本写法：悲观锁实现库存扣减**
`SELECT stock FROM products WHERE id = 1 FOR UPDATE;`
```sql
-- 库存扣减使用悲观锁
BEGIN;
SELECT stock FROM products WHERE id = 1 FOR UPDATE;
-- 检查 stock >= order_qty
-- 如果足够
UPDATE products SET stock = stock - 1 WHERE id = 1;
INSERT INTO orders (product_id, qty) VALUES (1, 1);
COMMIT;
```

---

## 乐观锁

**基本写法：版本号实现乐观锁**
`UPDATE <表> SET <列>=<新值>, version=version+1 WHERE id=<ID> AND version=<版本>`
```sql
-- 乐观锁：先读后写，写入时检查版本
-- 1. 读取数据
SELECT id, balance, version FROM accounts WHERE id = 1;
-- 结果: id=1, balance=1000, version=3

-- 2. 写入时检查版本
UPDATE accounts
SET balance = 900, version = version + 1
WHERE id = 1 AND version = 3;
-- 如果受影响行数 = 0，说明已被其他人修改，需重试
```

---

**基本写法：时间戳实现乐观锁**
`UPDATE <表> SET <列>=<值>, updated_at=NOW() WHERE id=<ID> AND updated_at=<时间>`
```sql
-- 使用时间戳替代版本号
SELECT id, balance, updated_at FROM accounts WHERE id = 1;
-- 假设 updated_at = '2026-07-31 10:00:00'

UPDATE accounts
SET balance = 900, updated_at = NOW()
WHERE id = 1 AND updated_at = '2026-07-31 10:00:00';
```

---

**基本写法：CAS 模式**
`UPDATE <表> SET <列>=<新值> WHERE id=<ID> AND <列>=<旧值>`
```sql
-- Compare And Swap 模式
-- 扣减余额：条件是当前余额足够
UPDATE accounts
SET balance = balance - 100
WHERE id = 1 AND balance >= 100;
-- 如果受影响行数 = 0，说明余额不足或被修改
```

---

## 锁监控

**基本写法：MySQL 锁等待查询**
`SELECT * FROM performance_schema.data_lock_waits;`
```sql
-- 查看锁等待情况
SELECT
  r.trx_id AS waiting_trx,
  r.trx_mysql_thread_id AS waiting_thread,
  b.trx_id AS blocking_trx,
  b.trx_mysql_thread_id AS blocking_thread
FROM information_schema.innodb_trx r
JOIN information_schema.innodb_trx b
  ON r.trx_requested_lock_id = b.trx_lock_id;
```

---

**基本写法：PostgreSQL 锁查询**
`SELECT * FROM pg_locks;`
```sql
-- 查看当前所有锁
SELECT pid, locktype, relation::regclass, mode, granted
FROM pg_locks;

-- 查看阻塞的会话
SELECT
  blocked.pid AS blocked_pid,
  blocking.pid AS blocking_pid,
  query
FROM pg_stat_activity blocked
JOIN pg_locks bl ON bl.pid = blocked.pid AND NOT bl.granted
JOIN pg_locks ul ON ul.locktype = bl.locktype
  AND ul.relation = bl.relation AND ul.granted
JOIN pg_stat_activity blocking ON blocking.pid = ul.pid;
```

---

**基本写法：终止阻塞会话**
`SELECT pg_terminate_backend(<pid>);`
```sql
-- PostgreSQL 终止阻塞进程
SELECT pg_terminate_backend(12345);

-- MySQL 杀死会话
KILL 12345;
```
