---
order: 440
title: 事务与锁机制
module: 'mysql'
category: 数据库
difficulty: intermediate
description: 在两个终端里亲手复现并发扣费翻车，掌握事务与锁的动手层：隔离级别实测、FOR UPDATE 悲观锁、乐观锁、死锁复现与长事务排查。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'mysql/420-TransactionIsolationImplementation'
  - 'mysql/430-MVCCPrinciple'
  - 'mysql/450-LockClassification'
  - 'mysql/480-DeadlockDetectionHandling'
prerequisites:
  - 'mysql/120-DQL'
---

## 场景：两笔并发扣费，余额算错了一次

充电账户余额 100 元，用户在两个 App 窗口几乎同时发起两笔 30 元扣费。预期余额 40 元，实际变成了 70 元。伪代码是这样写的：

```text
1. 读出余额 balance = 100
2. 计算 100 - 30 = 70
3. 写回 70
```

两个请求都执行了这段代码：请求 A 读到 100 写回 70，请求 B 也读到 100（A 还没提交）也写回 70。一笔扣费凭空消失——教科书叫**丢失更新**。这类事故的防线不是代码写仔细点，而是事务与锁。本篇全部实验都可以开两个 mysql 客户端窗口跟着做。

```sql
CREATE TABLE accounts (
  user_id   INT PRIMARY KEY,
  name      VARCHAR(50) NOT NULL,
  balance   DECIMAL(10,2) NOT NULL
);
INSERT INTO accounts VALUES (1, '车主小陈', 100.00);
```

约定：下文用「会话 A」「会话 B」表示两个独立的客户端连接。

## 动手一：事务三板斧与保存点

```sql
-- 承接前文：另有一张充电订单表 charge_orders(user_id, kwh, amount)，字段示意
-- 会话 A：充电订单与扣费必须同生共死
START TRANSACTION;
    INSERT INTO charge_orders(user_id, kwh, amount)
    VALUES (1, 25.00, 30.00);
    UPDATE accounts SET balance = balance - 30 WHERE user_id = 1;
COMMIT;
```

把扣费和订单放进一个事务：要么两条都生效，要么都不生效（回滚后余额和订单表都回到原样）。验证回滚很简单，把 COMMIT 换成 ROLLBACK 再查一次。

复杂流程里只反悔一半，用保存点：

```sql
START TRANSACTION;
    UPDATE accounts SET balance = balance - 30 WHERE user_id = 1;
    SAVEPOINT after_deduct;
    INSERT INTO charge_orders(user_id, kwh, amount) VALUES (1, 25, 30);
    -- 发现订单重复了，只撤掉插入这一步
    ROLLBACK TO after_deduct;
COMMIT;
```

两个常见意外要现在就知道：连接断开或客户端退出时，未提交事务自动回滚；事务里执行 DDL（ALTER/DROP 等）会**隐式提交**当前事务——"改个表结构顺便"发生在事务里，会把前面没提交的修改一起提交掉。

## 动手二：亲手复现并发异常

### 实验一：不可重复读与隔离级别

```sql
-- 会话 A
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
START TRANSACTION;
SELECT balance FROM accounts WHERE user_id = 1;   -- 100.00

-- 会话 B
START TRANSACTION;
UPDATE accounts SET balance = balance - 30 WHERE user_id = 1;
COMMIT;

-- 会话 A 再读一次
SELECT balance FROM accounts WHERE user_id = 1;   -- 70.00，变了！
```

同一事务内两次读取结果不同，这就是不可重复读。把会话 A 的隔离级别换成默认的 REPEATABLE READ 重做一遍，第二次读仍是 100——可重复读名副其实。

```sql
SELECT @@transaction_isolation;                    -- 看当前级别
SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;
```

四个级别禁止的异常一览（InnoDB 默认 REPEATABLE READ）：

| 隔离级别 | 脏读 | 不可重复读 | 幻读 |
| --- | --- | --- | --- |
| READ UNCOMMITTED | 可能 | 可能 | 可能 |
| READ COMMITTED | 阻止 | 可能 | 可能 |
| REPEATABLE READ（默认） | 阻止 | 阻止 | 基本阻止 |
| SERIALIZABLE | 阻止 | 阻止 | 阻止 |

"基本阻止"的原因：RR 下普通 SELECT 是**快照读**（靠 MVCC 看旧版本，不加锁），而 UPDATE 这类**当前读**用临键锁挡住范围内的插入，两条路一起把幻读压住。内部实现见 [MVCC 原理](/mysql/430-MVCCPrinciple)与[间隙锁与临键锁](/mysql/470-GapLockNextKeyLockSolutionPhantomRead)。

### 实验二：丢失更新依然会发生

在 RR 下重做开头的并发扣费：两个事务都先 SELECT 读余额，再 UPDATE 写回计算结果——**快照读拿到了同样的旧值，丢失更新照样发生**。隔离级别解决的是"你能看见什么"，不解决"你基于旧值做的决定"。要解决丢失更新，需要锁或原子操作，见下一节。

## 动手三：并发扣费的三种正确姿势

### 姿势一：原子 UPDATE（首选）

```sql
-- 不读出来算，让数据库在行上直接算
UPDATE accounts
SET balance = balance - 30
WHERE user_id = 1 AND balance >= 30;
-- ROW_COUNT() = 0 说明余额不足，事务回滚
```

没有"读-算-写"三步，就没有丢失更新的入口。能用一条 UPDATE 表达的业务规则，永远优先这条路线。

### 姿势二：悲观锁 FOR UPDATE

```sql
-- 会话 A
START TRANSACTION;
SELECT balance FROM accounts WHERE user_id = 1 FOR UPDATE;  -- 行被 A 锁住
-- 会话 B 此时执行同样的 SELECT ... FOR UPDATE 会阻塞等待
UPDATE accounts SET balance = balance - 30 WHERE user_id = 1;
COMMIT;                                                     -- B 才被放行
```

FOR UPDATE 对行加排他锁，把"读-算-写"整段串行化，逻辑再复杂也不会错。代价是并发度下降和死锁风险。只读共享用 `FOR SHARE`（8.0 推荐写法，旧写法 LOCK IN SHARE MODE 已废弃）。等锁有超时：`innodb_lock_wait_timeout` 默认 50 秒。

### 姿势三：乐观锁（version 号）

```sql
ALTER TABLE accounts ADD COLUMN version INT NOT NULL DEFAULT 0;

-- 读出 version
SELECT balance, version FROM accounts WHERE user_id = 1;   -- (100, 0)
-- 程序计算新余额 70，带版本号写回
UPDATE accounts SET balance = 70, version = version + 1
WHERE user_id = 1 AND version = 0;
-- 影响行数为 0：说明期间有人先改过，重新读取再试
```

不锁行，用"提交时版本没变"来赌没有并发冲突；冲突了就重试。读多写少、冲突概率低的场景比悲观锁吞吐高。两种路线的系统对比见[乐观锁与悲观锁](/sql/410-OptimisticPessimisticLock)。

## 死锁现场：五分钟复现一次

```sql
-- 会话 A
START TRANSACTION;
UPDATE accounts SET balance = balance - 10 WHERE user_id = 1;   -- 锁住用户 1

-- 会话 B
START TRANSACTION;
UPDATE accounts SET balance = balance - 10 WHERE user_id = 2;   -- 锁住用户 2

-- 会话 A：转给用户 2
UPDATE accounts SET balance = balance + 10 WHERE user_id = 2;   -- 等 B

-- 会话 B：转给用户 1
UPDATE accounts SET balance = balance + 10 WHERE user_id = 1;
-- ERROR 1213: Deadlock found ... 会话 B 被回滚，会话 A 的这条执行成功
```

互相持有对方要的锁，形成循环等待，InnoDB 自动检测并回滚代价较小的事务（错误码 1213）。查看现场：

```sql
SHOW ENGINE INNODB STATUS;   -- LATEST DETECTED DEADLOCK 段落：两边各持有什么、在等什么
SET GLOBAL innodb_print_all_deadlocks = ON;   -- 所有死锁记入错误日志
```

预防顺序（从根到叶）：固定加锁顺序（都先锁用户 ID 小的）；事务尽量短；UPDATE/SELECT FOR UPDATE 都走索引（不走索引会升级成大范围锁）；重试是被回滚一方的标准动作。检测机制与更多现场见[死锁检测与处理](/mysql/480-DeadlockDetectionHandling)。

## 坑点与自检

### 坑一：长事务拖垮清理与回滚

```sql
-- 找出正在跑的事务，关注时长
SELECT trx_id, trx_started, trx_state, trx_rows_locked, trx_mysql_thread_id
FROM information_schema.INNODB_TRX
ORDER BY trx_started;
```

事务开着不提交，MVCC 旧版本没法清理（undo 膨胀）、锁一直持有。纪律：事务里不放 RPC/HTTP 调用、不放用户交互；批量任务按 1000 行一批分事务提交。

### 坑二：autocommit 的双刃剑

MySQL 默认 `autocommit=1`，单条语句自动提交。它掩盖的坑是：有人以为自己在事务里，实际每条 DML 都独立提交（半成品状态落库）。反过来，框架里常驻 `BEGIN` 却不提交的长事务是连接池耗尽的常见元凶。自检：`SELECT @@autocommit;`，并确认框架的事务边界注解真的生效。

### 坑三：任务队列并发取任务的正确姿势

多 worker 抢任务（超时关单、重试队列）最怕两个 worker 拿到同一批：

```sql
-- SKIP LOCKED：跳过已被别的 worker 锁定的行（MySQL 8.0+）
START TRANSACTION;
SELECT session_id FROM charge_sessions
WHERE status = 'pending'
ORDER BY session_id
LIMIT 10 FOR UPDATE SKIP LOCKED;
UPDATE charge_sessions SET status = 'processing' WHERE session_id IN (...);
COMMIT;
```

配合 NOWAIT（拿不到锁立即报错）可以做成"宁可返回空也不排队"。这是 8.0 后任务队列类需求的标准答案。

### 坑四：把日志当黑盒

事务的持久性（redo）、原子性（undo）与两者的两阶段提交，是这套机制的底层账本，本篇刻意不展开——直接进入对应的专题：[Redo Log](/mysql/500-RedoLog)、[Undo Log](/mysql/510-UndoLog)、[两阶段提交](/mysql/530-TwoPhaseCommit)。

### 自检清单

- 并发改余额，能说出三种姿势分别适用什么冲突率吗？
- 知道当前会话的隔离级别，并且能解释快照读与当前读的差别吗？
- 写多表事务前想好加锁顺序了吗？被 1213 回滚后有重试吗？
- 事务里没有 RPC、没有 DDL、有批量上限吗？

## 练习

1. 复现实验一的不可重复读，然后把级别切到 REPEATABLE READ 验证消失；再在会话 B 用 FOR UPDATE + COMMIT，观察 RR 下的会话 A 是否能看到新值（提示：不会，为什么）。
2. 用姿势一的原子 UPDATE 实现"余额不足则整单失败"，并用两个并发会话验证不出现丢失更新。
3. 用姿势二复现实验二的丢失更新场景，验证 FOR UPDATE 挡住了它；记录会话 B 等待的时长与报错。
4. 复现本文的死锁，用 SHOW ENGINE INNODB STATUS 找到 LATEST DETECTED DEADLOCK，读懂两个事务各自持有和等待的锁。
5. 给 charge_sessions 建一个 1000 行待处理队列，用 SKIP LOCKED 起两个并发会话各取 10 条，验证两批不重叠。

## 下一步

- 隔离级别的实现内幕：[事务隔离级别的实现](/mysql/420-TransactionIsolationImplementation)、[MVCC 原理](/mysql/430-MVCCPrinciple)、[快照读与当前读](/mysql/440-MVCCSnapshotCurrentRead)；
- 锁的分类学与临键锁：[锁分类](/mysql/450-LockClassification)、[间隙锁与幻读](/mysql/470-GapLockNextKeyLockSolutionPhantomRead)；
- 日志与恢复：[Redo Log](/mysql/500-RedoLog)、[Undo Log](/mysql/510-UndoLog)、[两阶段提交](/mysql/530-TwoPhaseCommit)。
