---
order: 72
title: 脏读不可重复读幻读
module: sql
category: SQL
difficulty: intermediate
description: SQL并发异常：脏读、不可重复读、幻读的定义、示例、区别与防护策略
author: fanquanpp
updated: '2026-06-14'
related:
  - sql/事务ACID特性
  - sql/隔离级别
  - sql/锁机制
  - sql/多版本并发控制
prerequisites:
  - sql/概述与标准
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

```sql
-- 初始状态：账户1余额 = 1000

-- 事务A（READ UNCOMMITTED）
BEGIN ISOLATION LEVEL READ UNCOMMITTED;
SELECT balance FROM accounts WHERE id = 1;
-- 返回 1000

-- 事务B
BEGIN;
UPDATE accounts SET balance = 5000 WHERE id = 1;
-- 未提交

-- 事务A
SELECT balance FROM accounts WHERE id = 1;
-- 返回 5000 ← 脏读！读到事务B未提交的修改

-- 事务B回滚
ROLLBACK;
-- balance 恢复为 1000

-- 事务A基于 5000 做出的决策是错误的
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

### 4.2 场景示例

```sql
-- 初始状态：dept_id = 5 有3名员工

-- 事务A（REPEATABLE READ）
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT COUNT(*) FROM employees WHERE dept_id = 5;
-- 返回 3

-- 事务B
INSERT INTO employees (name, dept_id) VALUES ('新员工', 5);
COMMIT;

-- 事务A再次查询
SELECT COUNT(*) FROM employees WHERE dept_id = 5;
-- MVCC 下：返回 3（快照读无幻读）
-- 但当前读可能出现幻读：

-- 事务A执行更新
UPDATE employees SET salary = salary + 100 WHERE dept_id = 5;
-- 影响了4行！（包括事务B插入的行）

SELECT COUNT(*) FROM employees WHERE dept_id = 5;
-- 返回 4 ← 幻读！
```

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

$$
\begin{aligned}
\text{READ UNCOMMITTED} &\supseteq \{\text{脏读, 不可重复读, 幻读}\} \\
\text{READ COMMITTED} &\supseteq \{\text{不可重复读, 幻读}\} \\
\text{REPEATABLE READ} &\supseteq \{\text{幻读}\} \\
\text{SERIALIZABLE} &= \emptyset
\end{aligned}
$$

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
