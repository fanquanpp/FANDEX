---
order: 350
title: 隔离级别
module: 'sql'
category: 数据库
difficulty: advanced
description: SQL事务隔离级别：读未提交、读已提交、可重复读、序列化的原理、实现机制与选择策略
author: fanquanpp
updated: '2026-09-08'
related:
  - 'sql/033-ExecutionPlan'
  - 'sql/034-TransactionACIDProperty'
  - 'sql/036-DirtyReadNonRepeatablePhantom'
  - 'sql/037-LockMechanism'
prerequisites:
  - 'sql/002-OverviewStandard'
---

## 1. 隔离级别概述

事务隔离级别定义了一个事务必须与其它事务隔离的程度。更高的隔离级别提供更强的一致性保证，但并发性能更低。

### 1.1 SQL 标准隔离级别

| 级别             | 脏读 | 不可重复读 | 幻读 | 性能 |
| ---------------- | ---- | ---------- | ---- | ---- |
| READ UNCOMMITTED |      |            |      | 最高 |
| READ COMMITTED   |      |            |      | 高   |
| REPEATABLE READ  |      |            | \*   | 中   |
| SERIALIZABLE     |      |            |      | 最低 |

> \*MySQL InnoDB 的 REPEATABLE READ 通过 Next-Key Lock 在一定程度上防止幻读。

## 2. READ UNCOMMITTED（读未提交）

### 2.1 定义

一个事务可以读取另一个事务未提交的修改（脏读）。

```sql
-- 事务A
BEGIN;
UPDATE accounts SET balance = balance + 1000 WHERE id = 1;
-- 未提交

-- 事务B（READ UNCOMMITTED）
BEGIN ISOLATION LEVEL READ UNCOMMITTED;
SELECT balance FROM accounts WHERE id = 1;
-- 读到事务A未提交的修改（脏读）

-- 事务A回滚
ROLLBACK;
-- 事务B读到的数据是无效的
```

### 2.2 脏读问题

```
时间线：
T1: BEGIN; UPDATE accounts SET balance = 2000 WHERE id = 1;
T2:                                SELECT balance → 2000 (脏读)
T1: ROLLBACK; (balance 恢复为 1000)
T2: 基于 2000 做决策 → 错误！
```

### 2.3 使用场景

- 几乎不使用，仅用于监控和调试
- 对数据准确性无要求的场景（如近似统计）

## 3. READ COMMITTED（读已提交）

### 3.1 定义

一个事务只能读取其他事务已提交的修改，解决了脏读问题。

```sql
-- PostgreSQL 默认隔离级别
-- Oracle 默认隔离级别

-- 事务A
BEGIN;
UPDATE accounts SET balance = 2000 WHERE id = 1;
-- 未提交

-- 事务B
BEGIN ISOLATION LEVEL READ COMMITTED;
SELECT balance FROM accounts WHERE id = 1;
-- 返回 1000（事务A未提交的修改不可见）

-- 事务A提交
COMMIT;

-- 事务B再次读取
SELECT balance FROM accounts WHERE id = 1;
-- 返回 2000（事务A已提交，现在可见）
-- 两次读取结果不同 → 不可重复读
```

### 3.2 不可重复读问题

```
时间线：
T1: BEGIN ISOLATION LEVEL READ COMMITTED;
T1: SELECT balance FROM accounts WHERE id = 1; → 1000
T2:                                UPDATE accounts SET balance = 2000 WHERE id = 1; COMMIT;
T1: SELECT balance FROM accounts WHERE id = 1; → 2000 (不可重复读)
```

### 3.3 实现机制

**MVCC（PostgreSQL）**：

- 每次 SELECT 创建新的快照（Snapshot）
- 快照包含：所有已提交事务的可见性信息
- 同一事务内两次 SELECT 可能看到不同数据

**锁机制（SQL Server）**：

- 读取时获取共享锁，读取后立即释放
- 写入时获取排他锁，持有到事务结束

## 4. REPEATABLE READ（可重复读）

### 4.1 定义

同一事务内多次读取同一行数据，结果一致，解决了不可重复读问题。

```sql
-- MySQL InnoDB 默认隔离级别

-- 事务A
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT balance FROM accounts WHERE id = 1; → 1000

-- 事务B
UPDATE accounts SET balance = 2000 WHERE id = 1;
COMMIT;

-- 事务A再次读取
SELECT balance FROM accounts WHERE id = 1; → 1000 (可重复读)
```

### 4.2 幻读问题

```sql
-- 事务A
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT COUNT(*) FROM accounts WHERE balance > 1500; → 0

-- 事务B
INSERT INTO accounts (id, balance) VALUES (2, 2000);
COMMIT;

-- 事务A再次查询
SELECT COUNT(*) FROM accounts WHERE balance > 1500; → 0 (MVCC下无幻读)
-- 但如果事务A执行更新：
UPDATE accounts SET balance = balance + 100 WHERE balance > 1500;
-- 影响了事务B插入的行！
SELECT COUNT(*) FROM accounts WHERE balance > 1500; → 1 (幻读)
```

### 4.3 MySQL InnoDB 的幻读防护

InnoDB 通过 Next-Key Lock（记录锁 + 间隙锁）防止幻读：

```sql
-- 事务A
BEGIN;
SELECT * FROM employees WHERE dept_id = 5 FOR UPDATE;
-- 锁定 dept_id = 5 的所有行及间隙

-- 事务B
INSERT INTO employees (name, dept_id) VALUES ('new', 5);
-- 被阻塞！无法插入 dept_id = 5 的新行
```

### 4.4 实现机制

**MVCC（PostgreSQL）**：

- 事务开始时创建快照，整个事务使用同一快照
- 快照决定哪些行版本可见

**锁 + MVCC（MySQL InnoDB）**：

- 快照读（普通 SELECT）：使用 MVCC，基于事务开始时的快照
- 当前读（SELECT FOR UPDATE/LOCK IN SHARE MODE）：使用 Next-Key Lock

## 5. SERIALIZABLE（可串行化）

### 5.1 定义

最高隔离级别，事务执行效果等同于某种串行执行顺序，完全消除并发异常。

```sql
BEGIN ISOLATION LEVEL SERIALIZABLE;
-- 所有操作如同串行执行
```

### 5.2 实现机制

**两阶段锁（2PL）**：

- 事务分为增长阶段（获取锁）和收缩阶段（释放锁）
- 所有锁在事务结束时统一释放

**可串行化快照隔离（SSI）**：

- PostgreSQL 使用 SSI 实现 SERIALIZABLE
- 基于 MVCC，检测读写冲突
- 检测到危险结构时，回滚其中一个事务

```sql
-- PostgreSQL SSI 示例
-- 事务A
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT balance FROM accounts WHERE id = 1;  -- 读取

-- 事务B
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT balance FROM accounts WHERE id = 2;  -- 读取

-- 事务A
UPDATE accounts SET balance = balance - 100 WHERE id = 2;  -- 写入事务B读取的行

-- 事务B
UPDATE accounts SET balance = balance - 100 WHERE id = 1;  -- 写入事务A读取的行

-- 事务A
COMMIT;  -- 成功

-- 事务B
COMMIT;  -- 错误！检测到序列化冲突，回滚
-- ERROR: could not serialize access due to read/write dependencies
```

### 5.3 SERIALIZABLE 的代价

- **性能**：并发度最低，事务冲突回滚率高
- **死锁**：锁范围大，死锁概率增加
- **适用场景**：对一致性要求极高的场景

## 6. 隔离级别选择

### 6.1 各数据库默认隔离级别

| 数据库     | 默认隔离级别    |
| ---------- | --------------- |
| PostgreSQL | READ COMMITTED  |
| MySQL      | REPEATABLE READ |
| Oracle     | READ COMMITTED  |
| SQL Server | READ COMMITTED  |
| SQLite     | SERIALIZABLE    |

### 6.2 选择建议

| 场景      | 推荐隔离级别    | 理由                   |
| --------- | --------------- | ---------------------- |
| 报表查询  | READ COMMITTED  | 能看到最新已提交数据   |
| OLTP 交易 | REPEATABLE READ | 防止不可重复读         |
| 金融核心  | SERIALIZABLE    | 严格一致性             |
| 日志写入  | READ COMMITTED  | 高吞吐，允许不可重复读 |

### 6.3 应用层加锁替代高隔离级别

```sql
-- 使用 SELECT FOR UPDATE 实现行级串行化
BEGIN ISOLATION LEVEL READ COMMITTED;
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;
-- 应用逻辑检查
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;

-- 比全局 SERIALIZABLE 更高效，只锁定需要的行
```
## 四种隔离级别

**基本写法：查看当前隔离级别**
`SELECT @@transaction_isolation;`
```sql
-- MySQL 查看隔离级别
SELECT @@transaction_isolation;
-- 或
SHOW VARIABLES LIKE 'transaction_isolation';
```

---

**基本写法：设置全局隔离级别**
`SET GLOBAL transaction_isolation = '<级别>';`
```sql
-- MySQL 设置全局隔离级别
SET GLOBAL transaction_isolation = 'READ-COMMITTED';
-- 可选值：
-- 'READ-UNCOMMITTED'
-- 'READ-COMMITTED'
-- 'REPEATABLE-READ'（MySQL 默认）
-- 'SERIALIZABLE'
```

---

**基本写法：设置会话隔离级别**
`SET SESSION transaction_isolation = '<级别>';`
```sql
-- 仅影响当前会话
SET SESSION transaction_isolation = 'READ-COMMITTED';
```

---

**基本写法：设置单事务隔离级别**
`SET TRANSACTION ISOLATION LEVEL <级别>;`
```sql
-- 仅影响下一个事务
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
BEGIN;
SELECT * FROM employees;
COMMIT;
```

---

**基本写法：PostgreSQL 设置隔离级别**
`SET TRANSACTION ISOLATION LEVEL <级别>;`
```sql
-- PostgreSQL 在事务内设置
BEGIN;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SELECT * FROM employees;
COMMIT;

-- 或在 BEGIN 时指定
BEGIN ISOLATION LEVEL READ COMMITTED;
```

---

## READ UNCOMMITTED（读未提交）

**基本写法：允许脏读**
`SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;`
```sql
-- 最低隔离级别：可读取未提交的数据（脏读）
-- 事务A
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
-- 未提交

-- 事务B（READ UNCOMMITTED）
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
SELECT balance FROM accounts WHERE id = 1;
-- 可以看到事务A未提交的修改（脏数据）
```

---

## READ COMMITTED（读已提交）

**基本写法：避免脏读**
`SET TRANSACTION ISOLATION LEVEL READ COMMITTED;`
```sql
-- 只能读取已提交的数据
-- 事务A
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
-- 未提交

-- 事务B（READ COMMITTED - PostgreSQL 默认）
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
SELECT balance FROM accounts WHERE id = 1;
-- 读到的是修改前的值（避免脏读）
```

---

**基本写法：不可重复读现象**
`-- 同一事务内两次读取可能不同`
```sql
-- 事务B 先读取
BEGIN;
SELECT balance FROM accounts WHERE id = 1;  -- 余额 1000

-- 事务A 修改并提交
-- UPDATE accounts SET balance = 500 WHERE id = 1; COMMIT;

-- 事务B 再次读取
SELECT balance FROM accounts WHERE id = 1;  -- 余额 500（不可重复读）
COMMIT;
```

---

## REPEATABLE READ（可重复读）

**基本写法：避免不可重复读**
`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;`
```sql
-- MySQL 默认隔离级别
-- 同一事务内多次读取结果一致
-- 事务B
BEGIN;
SELECT balance FROM accounts WHERE id = 1;  -- 余额 1000

-- 事务A 修改并提交
-- UPDATE accounts SET balance = 500 WHERE id = 1; COMMIT;

-- 事务B 再次读取
SELECT balance FROM accounts WHERE id = 1;  -- 余额仍为 1000（可重复读）
COMMIT;
```

---

**基本写法：MySQL 的幻读避免**
`-- MySQL InnoDB 通过 MVCC + 间隙锁避免幻读`
```sql
-- MySQL 的 REPEATABLE READ 已基本解决幻读
-- 事务B
BEGIN;
SELECT COUNT(*) FROM orders;  -- 10 条

-- 事务A 插入新订单并提交
-- INSERT INTO orders VALUES (...); COMMIT;

-- 事务B 再次查询
SELECT COUNT(*) FROM orders;  -- 仍为 10 条（无幻读）
COMMIT;
```

---

## SERIALIZABLE（串行化）

**基本写法：最高隔离级别**
`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;`
```sql
-- 所有事务串行执行，完全隔离
-- 性能最差，并发最低
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
BEGIN;
SELECT * FROM accounts WHERE id = 1;
-- 其他事务对此行的修改会被阻塞
COMMIT;
```

---

**基本写法：PostgreSQL SERIALIZABLE**
`-- PostgreSQL 的 SSI 实现真正可串行化`
```sql
-- PostgreSQL 串行化隔离级别使用 SSI（Serializable Snapshot Isolation）
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT balance FROM accounts WHERE id = 1;
-- 如果检测到冲突，提交时报错
COMMIT;
-- 可能报错：could not serialize access due to read/write dependencies
```

---

## 隔离级别对比

**基本写法：各级别对比**
`-- 四种隔离级别的现象对比`
```sql
-- 隔离级别          脏读   不可重复读  幻读
-- READ UNCOMMITTED  可能    可能        可能
-- READ COMMITTED    避免    可能        可能
-- REPEATABLE READ   避免    避免        MySQL避免/标准可能
-- SERIALIZABLE      避免    避免        避免
```

---

**基本写法：PostgreSQL 默认隔离级别**
`-- PostgreSQL 默认 READ COMMITTED`
```sql
-- 查看 PostgreSQL 默认隔离级别
SHOW default_transaction_isolation;
-- 默认值：read committed

-- 修改默认隔离级别
ALTER DATABASE mydb SET default_transaction_isolation = 'repeatable read';
```

---

**基本写法：MySQL 默认隔离级别**
`-- MySQL InnoDB 默认 REPEATABLE READ`
```sql
-- 查看 MySQL 默认隔离级别
SELECT @@global.transaction_isolation;
-- 默认值：REPEATABLE-READ
```

---

## 并发问题演示

**基本写法：脏读演示**
`-- READ UNCOMMITTED 下出现脏读`
```sql
-- 会话1
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
BEGIN;
UPDATE accounts SET balance = 0 WHERE id = 1;
-- 不提交

-- 会话2
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
SELECT balance FROM accounts WHERE id = 1;
-- 读到 balance=0（脏读：读到未提交的数据）

-- 会话1 回滚
ROLLBACK;
-- 会话2 读到的是无效数据
```

---

**基本写法：不可重复读演示**
`-- READ COMMITTED 下出现不可重复读`
```sql
-- 会话1
BEGIN;
SELECT salary FROM employees WHERE id = 1;  -- 5000

-- 会话2 修改并提交
-- UPDATE employees SET salary = 6000 WHERE id = 1; COMMIT;

-- 会话1 再次查询
SELECT salary FROM employees WHERE id = 1;  -- 6000（不可重复读）
COMMIT;
```

---

**基本写法：幻读演示**
`-- 标准 REPEATABLE READ 下可能出现幻读`
```sql
-- 会话1
BEGIN;
SELECT COUNT(*) FROM employees WHERE dept = 'IT';  -- 5 行

-- 会话2 插入新行并提交
-- INSERT INTO employees VALUES (..., 'IT'); COMMIT;

-- 会话1 再次查询
SELECT COUNT(*) FROM employees WHERE dept = 'IT';  -- 6 行（幻读）
COMMIT;
```

---

**基本写法：加锁避免幻读**
`SELECT ... FOR UPDATE 加锁`
```sql
-- 使用锁避免幻读
BEGIN;
SELECT * FROM employees WHERE dept = 'IT' FOR UPDATE;
-- 此时其他事务无法在此范围插入数据
-- INSERT INTO employees VALUES (..., 'IT') 会被阻塞
COMMIT;
```

---

## 隔离级别选择建议

**基本写法：选择建议**
`-- 根据业务场景选择合适的隔离级别`
```sql
-- 场景与建议：
-- 高并发读、少写    READ COMMITTED
-- 需要一致性读      REPEATABLE READ（MySQL 默认）
-- 金融/关键业务     SERIALIZABLE 或 REPEATABLE READ + 行锁
-- 报表/统计分析     REPEATABLE READ 或 READ ONLY
```
