---
order: 400
title: 脏读、不可重复读与幻读
module: 'sql'
category: 数据库
difficulty: intermediate
description: SQL并发异常：脏读、不可重复读、幻读的定义、示例、区别与防护策略
author: fanquanpp
updated: '2026-10-05'
related:
  - 'sql/360-TransactionACIDProperty'
  - 'sql/370-IsolationLevel'
  - 'sql/390-LockMechanism'
prerequisites:
  - 'sql/020-OverviewStandard'
---


## 1. 并发异常概述

当多个事务并发执行时，可能产生三种数据不一致问题：

| 异常       | 英文                | 影响             | 严重程度 |
| ---------- | ------------------- | ---------------- | -------- |
| 脏读       | Dirty Read          | 读到未提交数据   | 高       |
| 不可重复读 | Non-Repeatable Read | 同一查询结果不同 | 中       |
| 幻读       | Phantom Read        | 行数变化         | 低       |

## 2. 脏读（Dirty Read）

### 2.1 定义

事务A读取了事务B**未提交**的修改，如果事务B回滚，事务A读到的就是无效数据。

### 2.2 场景示例

> 方言前提：**PostgreSQL 不会发生脏读**——它的 MVCC 实现根本不暴露未提交数据，
> `READ UNCOMMITTED` 会被静默当作 READ COMMITTED 处理。下面的脏读序列要在
> MySQL（`SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED`）或
> SQL Server 中才能复现。

```sql
-- 初始状态：账户1余额 = 1000

-- 事务A
BEGIN;
UPDATE accounts SET balance = 5000 WHERE id = 1;
-- 未提交

-- 事务B（READ UNCOMMITTED）
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
BEGIN;
SELECT balance FROM accounts WHERE id = 1;
-- MySQL 下返回 5000 ← 脏读！读到事务A未提交的修改
-- PostgreSQL 下返回 1000（READ UNCOMMITTED 形同 READ COMMITTED，无脏读）

-- 事务A回滚
ROLLBACK;
-- balance 恢复为 1000

-- 事务B基于 5000 做出的决策是错误的
```

### 2.3 脏读的危害

```
场景：电商库存
T1: UPDATE stock SET count = 0 WHERE product_id = 100;  -- 库存清零
T2: SELECT count FROM stock WHERE product_id = 100;     -- 读到 0
T2: -- 判断库存不足，拒绝用户下单
T1: ROLLBACK;  -- 库存恢复为 10
-- 结果：用户被错误拒绝，实际有库存
```

### 2.4 防护

- 使用 READ COMMITTED 及以上隔离级别
- 几乎所有生产环境都不使用 READ UNCOMMITTED

## 3. 不可重复读（Non-Repeatable Read）

### 3.1 定义

事务A两次读取同一行数据，中间事务B修改并提交了该行，导致两次读取结果不同。

### 3.2 场景示例

```sql
-- 初始状态：账户1余额 = 1000

-- 事务A（READ COMMITTED）
BEGIN ISOLATION LEVEL READ COMMITTED;
SELECT balance FROM accounts WHERE id = 1;
-- 返回 1000

-- 事务B
BEGIN;
UPDATE accounts SET balance = 2000 WHERE id = 1;
COMMIT;

-- 事务A再次读取同一行
SELECT balance FROM accounts WHERE id = 1;
-- 返回 2000 ← 不可重复读！同一事务内两次读取结果不同
```

### 3.3 不可重复读的危害

```
场景：审计对账
T1: SELECT SUM(balance) FROM accounts;       -- 总额 10000
T2: UPDATE accounts SET balance = balance + 1000 WHERE id = 1; COMMIT;
T1: SELECT SUM(balance) FROM accounts;       -- 总额 11000
-- 两次汇总结果不一致，审计报告不准确
```

### 3.4 防护

```sql
-- 方法1：使用 REPEATABLE READ 隔离级别
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT balance FROM accounts WHERE id = 1;  -- 1000
-- 事务B修改并提交
SELECT balance FROM accounts WHERE id = 1;  -- 仍然是 1000

-- 方法2：使用 SELECT FOR UPDATE 锁定行
BEGIN ISOLATION LEVEL READ COMMITTED;
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;  -- 加锁
-- 事务B无法修改该行（被锁阻塞）
SELECT balance FROM accounts WHERE id = 1;  -- 一致
COMMIT;
```

## 4. 幻读（Phantom Read）

### 4.1 定义

事务A两次执行相同的范围查询，中间事务B插入并提交了新行，导致第二次查询多出"幻影行"。

### 4.2 场景示例（MySQL InnoDB 专有行为）

```sql
-- 初始状态：dept_id = 5 有3名员工

-- 事务A（REPEATABLE READ，MySQL InnoDB）
BEGIN;
SELECT COUNT(*) FROM employees WHERE dept_id = 5;
-- 返回 3

-- 事务B
INSERT INTO employees (name, dept_id) VALUES ('新员工', 5);
COMMIT;

-- 事务A再次查询
SELECT COUNT(*) FROM employees WHERE dept_id = 5;
-- 返回 3（普通 SELECT 是快照读，无幻读）
-- 但当前读会出现幻读：

-- 事务A执行更新（UPDATE 是当前读，读最新已提交版本）
UPDATE employees SET salary = salary + 100 WHERE dept_id = 5;
-- 影响了4行！（包括事务B插入的行）

SELECT COUNT(*) FROM employees WHERE dept_id = 5;
-- 返回 4 ← 幻读显现
```

> **方言对照**：同样的序列在 PostgreSQL 的 REPEATABLE READ 下不会走到最后——
> 事务快照固定后，`UPDATE` 试图修改快照外的新行会直接报
> `could not serialize access due to concurrent update`。
> "快照读看不到、当前读看得到"的幻读是 MySQL InnoDB 的特有模型。

### 4.3 幻读 vs 不可重复读

| 特性     | 不可重复读       | 幻读             |
| -------- | ---------------- | ---------------- |
| 影响对象 | 已存在的行被修改 | 新行被插入或删除 |
| 锁范围   | 行级锁           | 间隙锁/谓词锁    |
| SQL 语句 | UPDATE/DELETE    | INSERT           |
| 防护方式 | REPEATABLE READ  | SERIALIZABLE     |

### 4.4 防护

```sql
-- 方法1：使用 SERIALIZABLE 隔离级别
BEGIN ISOLATION LEVEL SERIALIZABLE;

-- 方法2：MySQL InnoDB 使用 Next-Key Lock
BEGIN;
SELECT * FROM employees WHERE dept_id = 5 FOR UPDATE;
-- 锁定 dept_id = 5 的所有行及间隙
-- 事务B无法插入 dept_id = 5 的新行

-- 方法3：应用层使用 advisory lock（PostgreSQL）
SELECT pg_advisory_lock(5);  -- 锁定部门5
-- 执行操作
SELECT pg_advisory_unlock(5);
```

## 5. 三种异常的完整对比

### 5.1 时间线对比

**脏读**：

```
T1: BEGIN;     UPDATE → value=200 (未提交)
T2:                    SELECT → 200 (脏读!)
T1: ROLLBACK;  (value 恢复为 100)
```

**不可重复读**：

```
T1: BEGIN;     SELECT → 100
T2:                    UPDATE → 200; COMMIT;
T1:             SELECT → 200 (不可重复读!)
```

**幻读**：

```
T1: BEGIN;     SELECT COUNT → 3
T2:                    INSERT; COMMIT;
T1:             SELECT COUNT → 4 (幻读!)
```

### 5.2 隔离级别与异常关系

| 隔离级别         | 可能残留的异常             |
| ---------------- | -------------------------- |
| READ UNCOMMITTED | 脏读、不可重复读、幻读     |
| READ COMMITTED   | 不可重复读、幻读           |
| REPEATABLE READ  | 幻读（MySQL 已基本消除）   |
| SERIALIZABLE     | 无                         |

## 6. 实战防护策略

### 6.1 选择合适的隔离级别

```sql
-- 大多数 OLTP 场景：READ COMMITTED 足够
-- 需要一致性读取：REPEATABLE READ
-- 严格一致性：SERIALIZABLE（性能代价大）
```

### 6.2 乐观锁替代高隔离级别

```sql
-- 使用版本号实现乐观锁
UPDATE products
SET stock = stock - 1, version = version + 1
WHERE id = 100 AND version = 5 AND stock > 0;
-- 如果影响行数为0，说明并发冲突，重试
```

### 6.3 SELECT FOR UPDATE 精确加锁

```sql
-- 只锁定需要的行，避免提升隔离级别
BEGIN ISOLATION LEVEL READ COMMITTED;
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
-- 检查余额
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;
```

## 7. 动手实验：三种异常各复现一次

双终端交错执行是验证并发异常的唯一可信方法（双终端操作规范见
[隔离级别](/sql/370-IsolationLevel) 第 8 节）。本节三个实验分别锁定一种异常，
做之前先自查表：每个实验你预期看到什么？看到的东西和预期不符时，先怀疑执行顺序。

### 实验 1：脏读（需要 MySQL 或 SQL Server，PostgreSQL 复现不了）

| 步骤 | A 终端 | B 终端 |
| --- | --- | --- |
| 0 | （两终端均）`SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;` | 同左 |
| 1 | `BEGIN; UPDATE accounts SET balance = 5000 WHERE id = 1;`（不提交） | |
| 2 | | `BEGIN; SELECT balance ... WHERE id = 1;` → **5000（脏读）** |
| 3 | `ROLLBACK;` | |
| 4 | | 再 SELECT → 1000。刚才的 5000 从未存在过 |

观察点：步骤 2 与步骤 4 之间，B 若基于 5000 做了任何动作（哪怕只是打印），它消费的就是
「宇宙中从未发生过的数据」。PostgreSQL 上做同样实验，步骤 2 直接返回 1000——用它反向
验证「PG 无脏读」的方言事实。

### 实验 2：不可重复读（PostgreSQL 默认级别即可）

| 步骤 | A 终端 | B 终端 |
| --- | --- | --- |
| 1 | `BEGIN; SELECT balance ... WHERE id = 1;` → 1000 | |
| 2 | | `BEGIN; UPDATE ... = 2000; COMMIT;` |
| 3 | `SELECT balance ... WHERE id = 1;` → **2000** | |
| 4 | `COMMIT;` | |

观察点：与脏读的区别——步骤 3 读到的 2000 是**已提交**的真实数据，问题不在数据真假，
而在「同一事务两次读取口径不一致」。审计类逻辑（第 3.3 节的对账场景）最怕的就是这个。

### 实验 3：幻读的「快照读看不见、当前读看见」（MySQL InnoDB）

| 步骤 | A 终端 | B 终端 |
| --- | --- | --- |
| 1 | `BEGIN;`（RR 级别）`SELECT COUNT(*) FROM employees WHERE dept_id = 5;` → 3 | |
| 2 | | `INSERT INTO employees (name, dept_id) VALUES ('new', 5); COMMIT;` |
| 3 | `SELECT COUNT(*) ...` → **仍 3（快照读）** | |
| 4 | `UPDATE employees SET salary = salary + 100 WHERE dept_id = 5;` → **影响 4 行** | |
| 5 | `SELECT COUNT(*) ...` → **4（幻读显现）** | |

观察点：步骤 4 是整个实验的题眼——UPDATE 走当前读，把 B 插入的行也更新了；随后步骤 5
的快照读因为本事务自己写过该行（MVCC 规则：自己的修改对自己可见），幻影行现形。想亲手
阻止这一切，把步骤 4 之前加一步 `SELECT ... FOR UPDATE WHERE dept_id = 5`，B 的 INSERT
会阻塞在间隙锁上（Next-Key Lock，机制见 [锁机制](/sql/390-LockMechanism)）。

### 异常识别口诀

复现之后要能反着认：给你一段交错时间线，判断它是什么异常。

```text
读到的事务后来 ROLLBACK 了        → 脏读（数据是假的）
两次读同一行，值变了              → 不可重复读（行被 UPDATE）
两次读同一范围，行数变了          → 幻读（有 INSERT/DELETE）
```

三者共享同一个根因：**事务的读操作没有和其他事务的写操作做串行化排序**。差别只在读写
冲突发生在「行」还是「范围」、对方是否提交。这也是为什么防护手段是一族而不是三种：
快照隔离一次性消除前两类，范围谓词锁（间隙锁/SSI）补上第三类。

## 8. 练习

识别题（5 分钟，面试高频）：判断下列时间线各是什么异常，并给出能防住它的最低标准隔离
级别。（初始 balance=100）

```text
时间线 a：T1 读 balance=100 → T2 UPDATE 成 200 并 COMMIT → T1 读到 200
时间线 b：T1 读 balance=100 → T2 UPDATE 成 200 未提交 → T1 读到 200 → T2 ROLLBACK
时间线 c：T1 统计行数=10 → T2 INSERT 并 COMMIT → T1 再统计=11
```

提示：先问「第二次读到的数据若对方回滚还成立吗」，再问「变的是行值还是行集合」。参考
答案：a 是不可重复读，READ COMMITTED 已消除脏读，防它需要 REPEATABLE READ；b 是脏读，
防它需要 READ COMMITTED；c 是幻读，标准里防它需要 SERIALIZABLE（MySQL RR 除外）。

改造题（15 分钟）：第 3.3 节的审计对账场景（两次 SUM 结果不同），要求不改隔离级别、
只用 FOR UPDATE 修复。先说清为什么这里 FOR UPDATE 不太合适（两张表几十万行全锁的代价），
再给出更务实的两种替代：升级为 REPEATABLE READ 事务，或改用「单条聚合 SQL」让对账一次
完成。验收：写出替代方案的可执行 SQL。

提示（思路方向）：锁的粒度要匹配冲突概率——对账是全表读，逐行锁不划算；把两次读合并
成一次读（事务内单条 SQL）则天然一致。参考实现：

```sql
-- 方案一：快照固定，两次 SUM 口径一致（PostgreSQL）
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT SUM(balance) FROM accounts;   -- 10000
-- 无论别人怎么改提交，再查还是 10000
SELECT SUM(balance) FROM accounts;   -- 10000
COMMIT;

-- 方案二：如果「两次读」本来就是应用循环拼的，合并成一条 SQL 最便宜
SELECT region, SUM(balance) FROM accounts GROUP BY region;
```

追问题（10 分钟）：实验 3 步骤 4 的 UPDATE 影响了 4 行。如果不希望本事务「越权」更新
别的事务刚插入的行，在 MySQL 的 RR 级别下有哪两种做法？一种从锁的角度（先 FOR UPDATE
圈住范围），一种从 SQL 语义的角度（UPDATE 加条件排除「本事务没见过的行」）。验收：两种
写法都能让影响行数回到 3。

提示：锁角度即间隙锁方案；语义角度可以用 `WHERE` 带上主键集合或时间戳条件（例如只更新
本事务开始前已存在的行——需要表上有可靠的 created_at）。参考实现：

```sql
-- 做法 1：先锁范围（Next-Key Lock 挡住插入），再更新
BEGIN;
SELECT id FROM employees WHERE dept_id = 5 FOR UPDATE;
UPDATE employees SET salary = salary + 100 WHERE dept_id = 5;
COMMIT;

-- 做法 2：条件收窄——只更新确认过的行（id 集合来自本事务快照读）
UPDATE employees SET salary = salary + 100
WHERE id IN (101, 102, 103);            -- 第一次快照读拿到的 3 个 id
```

## 9. 小结速记

- 三种异常是「读写冲突」的三个侧面：脏读（未提交）、不可重复读（行值变）、幻读（行集合变）。
- 复现手段只有双终端交错执行；识别手段是「回滚测试、行值测试、行数测试」三问。
- 防护优先级：能用单条 SQL 合并的读不要拆事务 → 需要跨语句一致用 REPEATABLE READ →
  范围写入防插入用 FOR UPDATE（间隙锁）→ 全部兜不住再上 SERIALIZABLE。

