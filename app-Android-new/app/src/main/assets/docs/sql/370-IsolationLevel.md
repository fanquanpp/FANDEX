---
order: 370
title: 隔离级别
module: 'sql'
category: 数据库
difficulty: advanced
description: 四种事务隔离级别的定义、实现机制（MVCC/锁/SSI）、各数据库方言差异与选择策略。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'sql/360-TransactionACIDProperty'
  - 'sql/380-DirtyReadNonRepeatablePhantom'
  - 'sql/390-LockMechanism'
  - 'sql/400-MVCC'
prerequisites:
  - 'sql/360-TransactionACIDProperty'
---

## 1. 隔离级别概述

事务隔离级别定义了一个事务"必须看见"与"可以忽略"其它事务并发修改到什么程度。
隔离越强，一致性越好，并发性能通常越低。

### 1.1 SQL 标准四级对比

| 隔离级别         | 脏读   | 不可重复读 | 幻读   |
| ---------------- | ------ | ---------- | ------ |
| READ UNCOMMITTED | 可能   | 可能       | 可能   |
| READ COMMITTED   | 避免   | 可能       | 可能   |
| REPEATABLE READ  | 避免   | 避免       | 标准：可能* |
| SERIALIZABLE     | 避免   | 避免       | 避免   |

> \* MySQL InnoDB 的 REPEATABLE READ 借助 Next-Key Lock 在很大程度上防止了幻读，
> 是标准允许范围之外的加强实现。

### 1.2 各数据库默认级别

| 数据库     | 默认隔离级别    | 说明                                       |
| ---------- | --------------- | ------------------------------------------ |
| PostgreSQL | READ COMMITTED  | READ UNCOMMITTED 会被当作 READ COMMITTED   |
| MySQL      | REPEATABLE READ | InnoDB 默认                                |
| Oracle     | READ COMMITTED  | 仅支持该级别与 SERIALIZABLE                |
| SQL Server | READ COMMITTED  | 另有快照隔离（SNAPSHOT）可选               |
| SQLite     | SERIALIZABLE    | 单写者模型，事务天然串行                   |

## 2. 查看与设置隔离级别

```sql
-- MySQL 8.0+
SELECT @@transaction_isolation;               -- 当前会话级别（默认 REPEATABLE-READ）
SELECT @@global.transaction_isolation;        -- 全局默认
SET SESSION transaction_isolation = 'READ-COMMITTED';
SET GLOBAL transaction_isolation = 'READ-COMMITTED';

-- PostgreSQL
SHOW default_transaction_isolation;           -- 默认 read committed
ALTER DATABASE mydb SET default_transaction_isolation = 'repeatable read';
-- 单个事务（必须写在第一条查询语句之前）
BEGIN ISOLATION LEVEL REPEATABLE READ;
-- 或
BEGIN;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- 仅影响下一个事务（标准语法，各库通用）
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

注意 `BEGIN ISOLATION LEVEL ...` 是 PostgreSQL 语法；MySQL 用
`START TRANSACTION READ WRITE` 等形式，设置级别统一走 `SET TRANSACTION`。

## 3. READ UNCOMMITTED（读未提交）

允许读取其它事务**未提交**的修改，是唯一会出现脏读的级别。

```
时间线：
T1: BEGIN; UPDATE accounts SET balance = 2000 WHERE id = 1;
T2:                                SELECT balance → 2000（脏读）
T1: ROLLBACK;  -- balance 恢复为 1000
T2: 基于 2000 做的任何决策都是基于从未存在过的数据
```

> **方言事实**：PostgreSQL 接受 `READ UNCOMMITTED` 关键字，但内部按 READ COMMITTED
> 处理——PostgreSQL 的 MVCC 架构下根本不存在脏读。想复现脏读要用 MySQL
> （`SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED`）或 SQL Server。

实际系统几乎不用这个级别，仅个别监控/近似统计场景会接受脏读换取零锁开销。

## 4. READ COMMITTED（读已提交）

只能读取**已提交**的数据，消除了脏读；但同一事务内两次读取可能看到不同结果。

```sql
-- PostgreSQL 默认级别（Oracle、SQL Server 默认亦然）
BEGIN;                                          -- READ COMMITTED
SELECT balance FROM accounts WHERE id = 1;      -- 1000

-- 另一会话：UPDATE accounts SET balance = 2000 WHERE id = 1; COMMIT;

SELECT balance FROM accounts WHERE id = 1;      -- 2000（不可重复读）
COMMIT;
```

**实现机制**：

- PostgreSQL（MVCC）：每条语句开始时取一个新快照，所以同一事务内语句间可见性会变化。
- SQL Server 锁实现（默认）：读取时取共享锁、读完立即释放，写锁持有到事务结束。

## 5. REPEATABLE READ（可重复读）

同一事务内多次读取同一数据结果一致，消除了不可重复读。

```sql
-- MySQL InnoDB 默认级别
BEGIN ISOLATION LEVEL REPEATABLE READ;          -- PostgreSQL 语法
SELECT balance FROM accounts WHERE id = 1;      -- 1000
-- 另一会话：UPDATE ... = 2000; COMMIT;
SELECT balance FROM accounts WHERE id = 1;      -- 仍为 1000（事务快照）
COMMIT;
```

**实现机制**：

- PostgreSQL：事务开始（第一条语句）时固定快照，整个事务使用同一快照。
- MySQL InnoDB：普通 SELECT 是"快照读"（MVCC 一致性读）；
  `SELECT ... FOR UPDATE`、`UPDATE`、`DELETE` 是"当前读"，读最新已提交版本并加锁。

### 5.1 幻读：标准允许的残留异常

标准 REPEATABLE READ 不承诺防止幻读——同一范围内两次查询可能因其它事务的
INSERT 而行数不同。具体表现因数据库实现而异：

```sql
-- MySQL InnoDB 示例（该行为专属于 MySQL 的"当前读"模型）
BEGIN;                                          -- REPEATABLE READ
SELECT COUNT(*) FROM accounts WHERE balance > 1500;   -- 0

-- 另一会话：INSERT INTO accounts VALUES (2, 2000); COMMIT;

SELECT COUNT(*) FROM accounts WHERE balance > 1500;   -- 仍为 0（快照读无幻读）
UPDATE accounts SET balance = balance + 100 WHERE balance > 1500;
-- UPDATE 是当前读：影响 1 行，读到了别的事务新插入的行
SELECT COUNT(*) FROM accounts WHERE balance > 1500;   -- 1（幻读显现）
```

> **方言事实**：同样的序列在 PostgreSQL 的 REPEATABLE READ 下走不到最后一步——
> 事务快照在第一条语句时固定，`UPDATE` 试图修改快照外的新行时会直接报
> `could not serialize access due to concurrent update` 并中止事务。
> "REPEATABLE READ 下用 UPDATE 会看到幻影行"是 MySQL（以及 Oracle 类似实现）特有行为。

### 5.2 MySQL 的幻读防护：Next-Key Lock

```sql
-- 事务A
BEGIN;
SELECT * FROM employees WHERE dept_id = 5 FOR UPDATE;
-- 记录锁 + 间隙锁：锁住已有行及其间的"空隙"

-- 事务B
INSERT INTO employees (name, dept_id) VALUES ('new', 5);
-- 被阻塞！空隙不允许插入 → 范围查询的幻读被挡住
```

## 6. SERIALIZABLE（可串行化）

最高隔离级别：并发事务的执行效果等同于某种串行顺序，所有并发异常都不可能发生。

### 6.1 实现机制

- **两阶段锁（2PL）**：传统实现，读加共享锁、写加排他锁，全部持有到事务结束。
- **可串行化快照隔离（SSI）**：PostgreSQL 9.1 起采用——在 MVCC 快照之上检测
  "危险结构"（读写依赖环），发现冲突时中止其中一个事务。以乐观并发为主的实现，
  冲突少时性能远好于 2PL。

```sql
-- PostgreSQL SSI 示例：两个事务交叉读写对方读过的行
-- 事务A
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT balance FROM accounts WHERE id = 1;

-- 事务B
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT balance FROM accounts WHERE id = 2;

-- 事务A：UPDATE accounts SET balance = balance - 100 WHERE id = 2;  -- 写了B读过的行
-- 事务B：UPDATE accounts SET balance = balance - 100 WHERE id = 1;  -- 写了A读过的行

-- 事务A COMMIT 成功
-- 事务B COMMIT 报错：
-- ERROR: could not serialize access due to read/write dependencies
```

### 6.2 代价

- 冲突回滚率高，应用必须具备**重试逻辑**；
- 长事务更容易被中止；
- 适用于一致性要求极高的少数场景（如余额转移、库存配额）。

## 7. 选择策略

| 场景               | 推荐                    | 理由                                   |
| ------------------ | ----------------------- | -------------------------------------- |
| 一般 OLTP          | READ COMMITTED          | PG/Oracle/SQL Server 默认，够用且并发好 |
| 一致性报表         | REPEATABLE READ         | 同一事务内口径一致                     |
| 金融核心转账       | SERIALIZABLE 或 RR+行锁 | 严格串行化语义                         |
| 高吞吐日志写入     | READ COMMITTED          | 无需跨语句一致性                       |

更常见的实战手法是：**保持较低隔离级别 + 精确加锁**，只对真正需要串行化的行加锁：

```sql
BEGIN ISOLATION LEVEL READ COMMITTED;
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;  -- 只锁这一行
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;
-- 比全局 SERIALIZABLE 便宜得多，同样消除该行上的竞态
```

## 8. 小结

- 标准四级对应三类异常的递进消除：脏读 → 不可重复读 → 幻读。
- 方言差异大：PG 无脏读（READ UNCOMMITTED 形同 READ COMMITTED）、
  MySQL RR 快照读无幻读但当前读会显现、SQLite 天然串行。
- REPEATABLE READ 下"UPDATE 看见新行"是 MySQL 当前读行为；PG 同场景直接报序列化错误。
- SERIALIZABLE 的正确用法必须配套应用层重试。
- 默认级别 + `SELECT ... FOR UPDATE` 局部加锁，是多数业务的最优性价比解。
