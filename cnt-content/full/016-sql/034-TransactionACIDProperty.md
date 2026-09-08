---
order: 340
title: 事务 ACID 特性
module: 'sql'
category: 数据库
difficulty: intermediate
description: SQL事务ACID特性：原子性、一致性、隔离性、持久性的原理、实现机制与保证
author: fanquanpp
updated: '2026-09-08'
related:
  - 'sql/032-Index'
  - 'sql/033-ExecutionPlan'
  - 'sql/035-IsolationLevel'
  - 'sql/036-DirtyReadNonRepeatablePhantom'
prerequisites:
  - 'sql/002-OverviewStandard'
---

## 1. 事务概述

事务（Transaction）是数据库操作的逻辑单元，由一组 SQL 语句组成，具有 ACID 四大特性。

```sql
-- 典型事务：银行转账
BEGIN;
UPDATE accounts SET balance = balance - 1000 WHERE id = 1;  -- 扣款
UPDATE accounts SET balance = balance + 1000 WHERE id = 2;  -- 入账
COMMIT;
```

## 2. 原子性（Atomicity）

### 2.1 定义

事务中的所有操作要么全部成功，要么全部回滚，不存在部分执行的状态。

$$
T = \{op_1, op_2, \ldots, op_n\} \implies T_{result} \in \{\text{ALL}, \text{NONE}\}
$$

### 2.2 实现机制

**Undo Log（回滚日志）**：

- 事务修改数据前，先将旧值写入 undo log
- 事务回滚时，根据 undo log 恢复原始数据
- 事务提交后，undo log 可以被清理

```
事务执行流程：
1. 读取原始值 → 写入 undo log
2. 修改数据页
3. 如果 COMMIT：标记事务完成
4. 如果 ROLLBACK：根据 undo log 逆向恢复
```

```sql
-- 原子性保证：转账事务
BEGIN;
-- 操作1：扣款
UPDATE accounts SET balance = balance - 1000 WHERE id = 1;
-- 操作2：入账（如果失败，操作1也会回滚）
UPDATE accounts SET balance = balance + 1000 WHERE id = 2;
COMMIT;

-- 如果操作2失败，整个事务回滚，操作1的修改被撤销
```

### 2.3 原子性的边界

```sql
-- 单条 SQL 也是原子的
DELETE FROM large_table WHERE condition;
-- 要么全部删除，要么一条不删

-- DDL 语句的原子性（PostgreSQL）
DROP TABLE table_a, table_b, table_c;
-- 三个表要么全部删除，要么全部保留
```

## 3. 一致性（Consistency）

### 3.1 定义

事务执行前后，数据库从一个一致状态转变为另一个一致状态，不违反任何完整性约束。

$$
\text{State}_{before} \xrightarrow{T} \text{State}_{after}, \quad \text{constraints}(\text{State}_{after}) = \text{true}
$$

### 3.2 一致性保证

```sql
-- 主键约束
INSERT INTO users (id, name) VALUES (1, 'Alice');
INSERT INTO users (id, name) VALUES (1, 'Bob');  -- 违反主键约束，事务回滚

-- 外键约束
BEGIN;
DELETE FROM departments WHERE id = 5;
-- 如果 employees 表中有 dept_id = 5 的记录，且外键为 RESTRICT
-- 事务将被拒绝
COMMIT;

-- CHECK 约束
INSERT INTO products (name, price) VALUES ('item', -10);
-- 违反 CHECK (price > 0)，事务回滚

-- 唯一约束
INSERT INTO users (email) VALUES ('test@example.com');
INSERT INTO users (email) VALUES ('test@example.com');  -- 违反唯一约束
```

### 3.3 一致性的层次

- **数据库层一致性**：由约束、触发器、级联规则保证
- **应用层一致性**：由业务逻辑保证（数据库无法自动验证）

```sql
-- 应用层一致性示例：库存不能为负
-- 数据库约束只能保证单行
CHECK (stock >= 0)

-- 跨行一致性需要应用逻辑或可串行化隔离级别
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT stock FROM inventory WHERE product_id = 100;
-- 应用检查 stock >= quantity
UPDATE inventory SET stock = stock - quantity WHERE product_id = 100;
COMMIT;
```

## 4. 隔离性（Isolation）

### 4.1 定义

并发执行的事务之间互不干扰，每个事务感觉不到其他事务的存在。

$$
T_1 \| T_2 \equiv T_1; T_2 \text{ 或 } T_2; T_1
$$

### 4.2 隔离级别

| 隔离级别         | 脏读   | 不可重复读 | 幻读   |
| ---------------- | ------ | ---------- | ------ |
| READ UNCOMMITTED | 可能   | 可能       | 可能   |
| READ COMMITTED   | 不可能 | 可能       | 可能   |
| REPEATABLE READ  | 不可能 | 不可能     | 可能   |
| SERIALIZABLE     | 不可能 | 不可能     | 不可能 |

```sql
-- 设置隔离级别
BEGIN ISOLATION LEVEL READ COMMITTED;
BEGIN ISOLATION LEVEL REPEATABLE READ;
BEGIN ISOLATION LEVEL SERIALIZABLE;
```

### 4.3 隔离性的实现

- **锁机制**：共享锁、排他锁、意向锁等
- **MVCC**：多版本并发控制，读写互不阻塞
- **串行化**：严格的两阶段锁或可串行化快照隔离

## 5. 持久性（Durability）

### 5.1 定义

事务一旦提交，其修改永久保存，即使系统崩溃也不会丢失。

$$
\text{COMMIT}(T) \implies \text{Persistent}(T) \text{ even after crash}
$$

### 5.2 实现机制

**Redo Log（重做日志）**：

- 事务修改数据时，先将变更写入 redo log（WAL 机制）
- Redo log 是顺序写入，性能高
- 提交时确保 redo log 刷盘（fsync）
- 崩溃恢复时，重放 redo log 恢复已提交事务

```
事务提交流程：
1. 修改数据页（Buffer Pool 中）
2. 写入 redo log buffer
3. redo log buffer 刷盘（fsync）  ← 提交点
4. 返回提交成功
5. 数据页异步刷盘（checkpoint）
```

### 5.3 持久性的权衡

```sql
-- MySQL：控制刷盘策略
-- innodb_flush_log_at_trx_commit
-- = 1：每次提交 fsync（最安全，最慢）
-- = 2：每次提交写入OS缓存，每秒 fsync（折中）
-- = 0：每秒写入并 fsync（最快，可能丢失1秒数据）

-- PostgreSQL：控制 WAL 同步
-- synchronous_commit = on（默认，最安全）
-- synchronous_commit = off（异步提交，可能丢失少量事务）
-- fsync = on（确保WAL刷盘）
```

### 5.4 崩溃恢复

```
崩溃恢复流程：
1. 从最后一个 checkpoint 开始扫描 redo log
2. 重做（REDO）：重放所有已提交事务的修改
3. 撤销（UNDO）：回滚所有未提交事务的修改
4. 恢复完成，数据库进入一致状态
```

## 6. ACID 的权衡

### 6.1 ACID vs BASE

| 特性     | ACID       | BASE       |
| -------- | ---------- | ---------- |
| 一致性   | 强一致性   | 最终一致性 |
| 可用性   | 可能牺牲   | 高可用     |
| 隔离性   | 严格隔离   | 松散隔离   |
| 性能     | 较低       | 较高       |
| 适用场景 | 金融、交易 | 社交、日志 |

### 6.2 实践中的权衡

```sql
-- 降低隔离级别提升并发
BEGIN ISOLATION LEVEL READ COMMITTED;  -- 比 SERIALIZABLE 更快

-- 异步提交提升吞吐
SET synchronous_commit = off;  -- PostgreSQL

-- 批量提交减少 fsync 开销
BEGIN;
INSERT INTO logs VALUES (...);  -- 多条
INSERT INTO logs VALUES (...);
COMMIT;  -- 一次 fsync
```
## 事务基本操作

**基本写法：开启事务**
`BEGIN [TRANSACTION] [ISOLATION LEVEL <级别>]`
```sql
-- 显式开启事务
BEGIN;
-- 或
START TRANSACTION;
-- 指定隔离级别
BEGIN ISOLATION LEVEL READ COMMITTED;
```

---

**基本写法：提交事务**
`COMMIT [TRANSACTION]`
```sql
-- 提交当前事务
COMMIT;
-- 所有修改永久保存
```

---

**基本写法：回滚事务**
`ROLLBACK [TRANSACTION] [TO <保存点>]`
```sql
-- 回滚整个事务
ROLLBACK;
-- 回滚到指定保存点
ROLLBACK TO SAVEPOINT sp1;
```

---

**基本写法：设置保存点**
`SAVEPOINT <保存点名>`
```sql
-- 在事务中创建保存点
BEGIN;
INSERT INTO orders (id, amount) VALUES (1, 100);
SAVEPOINT after_insert;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
-- 如果出错回滚到插入之后
ROLLBACK TO SAVEPOINT after_insert;
COMMIT;
```

---

**基本写法：释放保存点**
`RELEASE SAVEPOINT <保存点名>`
```sql
-- 释放保存点（不可再回滚到该点）
RELEASE SAVEPOINT sp1;
```

---

**基本写法：自动提交模式**
`SET autocommit = <0|1>`
```sql
-- MySQL 关闭自动提交
SET autocommit = 0;
-- 每条 SQL 需手动 COMMIT 才生效

-- 开启自动提交（默认）
SET autocommit = 1;
```

---

## ACID 属性

**基本写法：A - 原子性（Atomicity）**
`-- 事务内所有操作要么全部成功，要么全部回滚`
```sql
-- 转账示例：扣款和加款必须同时成功或同时失败
BEGIN;
UPDATE accounts SET balance = balance - 500 WHERE id = 1;
UPDATE accounts SET balance = balance + 500 WHERE id = 2;
-- 如果任一步失败，整个事务回滚
COMMIT;
-- 或出错时 ROLLBACK;
```

---

**基本写法：C - 一致性（Consistency）**
`-- 事务前后数据满足完整性约束`
```sql
-- 转账前后总金额不变
-- 转账前：A=1000, B=1000, 总计=2000
-- 转账后：A=500, B=1500, 总计=2000（一致）
-- 约束检查：balance >= 0
ALTER TABLE accounts ADD CONSTRAINT chk_balance CHECK (balance >= 0);
```

---

**基本写法：I - 隔离性（Isolation）**
`-- 并发事务之间互不干扰`
```sql
-- 设置事务隔离级别
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
-- 隔离级别从低到高：
-- READ UNCOMMITTED  读未提交（脏读）
-- READ COMMITTED    读已提交（不可重复读）
-- REPEATABLE READ    可重复读（幻读）
-- SERIALIZABLE       串行化（最高隔离）
```

---

**基本写法：D - 持久性（Durability）**
`-- 事务提交后数据永久保存，即使系统崩溃`
```sql
-- COMMIT 后数据写入磁盘
-- MySQL 通过 redo log 保证持久性
-- innodb_flush_log_at_trx_commit = 1（默认）确保每次提交都刷盘
SET GLOBAL innodb_flush_log_at_trx_commit = 1;
```

---

## 事务嵌套

**基本写法：MySQL 不支持真正嵌套**
`-- 通过 SAVEPOINT 模拟嵌套`
```sql
-- MySQL 无嵌套事务，用保存点模拟
BEGIN;
  INSERT INTO t1 VALUES (1);
  SAVEPOINT sp1;
    INSERT INTO t2 VALUES (2);
    -- 模拟内层回滚
    ROLLBACK TO SAVEPOINT sp1;
  INSERT INTO t3 VALUES (3);
COMMIT;
-- t1 和 t3 提交，t2 被回滚
```

---

**基本写法：PostgreSQL 嵌套**
`-- PostgreSQL 也用保存点实现`
```sql
-- PostgreSQL 保存点实现嵌套效果
BEGIN;
  INSERT INTO users (name) VALUES ('Alice');
  SAVEPOINT sp_user;
    INSERT INTO profiles (user_id, bio) VALUES (1, 'Hello');
    -- 如果 profile 插入失败
    ROLLBACK TO sp_user;
    -- 用户仍然存在，可以继续
  INSERT INTO logs (action) VALUES ('user_created');
COMMIT;
```

---

## 隐式提交

**基本写法：DDL 语句隐式提交**
`-- DDL 语句（CREATE/ALTER/DROP/TRUNCATE）自动触发 COMMIT`
```sql
-- 以下语句会自动提交之前的事务
BEGIN;
INSERT INTO t1 VALUES (1);
-- 以下 DDL 会隐式提交
CREATE TABLE t2 (id INT);
-- 此处 INSERT 已经被提交，无法回滚
ROLLBACK;  -- 只能回滚 DDL 之后的操作
```

---

**基本写法：隐式提交的语句**
`-- 会触发隐式提交的语句`
```sql
-- 以下操作会隐式 COMMIT：
-- CREATE / ALTER / DROP TABLE
-- CREATE / DROP INDEX
-- CREATE / DROP DATABASE
-- TRUNCATE TABLE
-- GRANT / REVOKE
-- LOCK TABLES / UNLOCK TABLES
```

---

## 事务超时与锁等待

**基本写法：设置锁等待超时**
`SET innodb_lock_wait_timeout = <秒>`
```sql
-- MySQL 设置行锁等待超时（秒）
SET innodb_lock_wait_timeout = 10;
-- 10 秒内获取不到锁则报错回滚

-- PostgreSQL 设置语句超时
SET statement_timeout = 10000;  -- 毫秒
```

---

**基本写法：死锁检测**
`SET innodb_deadlock_detect = ON;`
```sql
-- MySQL 开启死锁检测（默认开启）
SET GLOBAL innodb_deadlock_detect = ON;
-- 发生死锁时自动回滚代价较小的事务

-- 查看最近一次死锁信息
SHOW ENGINE INNODB STATUS\G
-- 查看 LATEST DETECTED DEADLOCK 部分
```

---

## 分布式事务

**基本写法：XA 事务**
`XA START '<xid>'; ... XA END '<xid>'; XA PREPARE '<xid>'; XA COMMIT '<xid>'`
```sql
-- MySQL XA 分布式事务
XA START 'tx1';
INSERT INTO db1.orders VALUES (1, 100);
XA END 'tx1';
XA PREPARE 'tx1';
-- 所有参与者 PREPARE 成功后
XA COMMIT 'tx1';
-- 或放弃
-- XA ROLLBACK 'tx1';
```

---

**基本写法：查看 XA 事务**
`XA RECOVER;`
```sql
-- 查看所有未完成的 XA 事务
XA RECOVER;
```

---

## 事务最佳实践

**基本写法：事务尽量短小**
`-- 减少锁持有时间，避免长事务`
```sql
-- 不推荐：事务中包含耗时操作
BEGIN;
SELECT * FROM users WHERE id = 1;  -- 查询
-- ... 执行业务逻辑（耗时操作）
UPDATE users SET balance = balance - 100 WHERE id = 1;
COMMIT;

-- 推荐：先准备好数据，事务中只做必要的写操作
SELECT * FROM users WHERE id = 1;  -- 事务外查询
-- ... 业务逻辑
BEGIN;
UPDATE users SET balance = balance - 100 WHERE id = 1;
COMMIT;
```

---

**基本写法：设置只读事务**
`SET TRANSACTION READ ONLY;`
```sql
-- 声明只读事务，优化器可优化
BEGIN READ ONLY;
SELECT * FROM employees WHERE dept_id = 5;
COMMIT;
```
