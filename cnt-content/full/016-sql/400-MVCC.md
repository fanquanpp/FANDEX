---
order: 400
title: MVCC
module: 'sql'
category: 数据库
difficulty: advanced
description: SQL多版本并发控制MVCC：版本链、快照读、Read View、可见性判断与垃圾回收机制
author: fanquanpp
updated: '2026-09-12'
related:
  - 'sql/380-DirtyReadNonRepeatablePhantom'
  - 'sql/390-LockMechanism'
  - 'sql/270-WindowFunctionFramework'
  - 'sql/250-RecursiveCTETreeTraversal'
prerequisites:
  - 'sql/020-OverviewStandard'
---

## 1. MVCC 概述

多版本并发控制（Multi-Version Concurrency Control，MVCC）是现代数据库实现高并发读写的核心机制。通过保存数据的多个版本，实现读不阻塞写、写不阻塞读。

### 1.1 MVCC 核心思想

$$
\text{读操作} \perp \text{写操作}
$$

- **读操作**：访问数据的历史版本（快照读），不需要加锁
- **写操作**：创建数据的新版本，不影响正在读取旧版本的事务

### 1.2 MVCC vs 锁机制

| 特性     | MVCC       | 锁机制     |
| -------- | ---------- | ---------- |
| 读写冲突 | 无         | 有         |
| 并发度   | 高         | 低         |
| 存储开销 | 多版本存储 | 锁管理开销 |
| 适用场景 | 读多写少   | 写多       |

## 2. MVCC 实现原理

### 2.1 版本链

每行数据包含隐藏列，用于构建版本链：

**InnoDB 隐藏列**：

| 列名        | 大小  | 用途                             |
| ----------- | ----- | -------------------------------- |
| DB_TRX_ID   | 6字节 | 最后修改该行的事务ID             |
| DB_ROLL_PTR | 7字节 | 回滚指针，指向undo log中的前版本 |
| DB_ROW_ID   | 6字节 | 隐藏自增ID（无主键时使用）       |

```
当前行：{data_v3, trx_id=300, roll_ptr → undo_v2}
                                          ↓
undo_v2：{data_v2, trx_id=200, roll_ptr → undo_v1}
                                          ↓
undo_v1：{data_v1, trx_id=100, roll_ptr → NULL}
```

### 2.2 Read View（读视图）

Read View 决定当前事务能看到哪些版本的数据。

**InnoDB Read View 结构**：

| 字段           | 含义                                |
| -------------- | ----------------------------------- |
| m_ids          | 创建 Read View 时所有活跃事务ID列表 |
| min_trx_id     | 活跃事务中最小的事务ID              |
| max_trx_id     | 下一个将分配的事务ID（最大ID + 1）  |
| creator_trx_id | 创建该 Read View 的事务ID           |

### 2.3 可见性判断规则

对于版本链中某个版本（trx_id）：

$$
\text{visible}(trx\_id) = \begin{cases}
\text{true} & \text{if } trx\_id < \text{min\_trx\_id} \\
\text{false} & \text{if } \text{min\_trx\_id} \leq trx\_id < \text{max\_trx\_id} \land trx\_id \in \text{m\_ids} \\
\text{true} & \text{if } \text{min\_trx\_id} \leq trx\_id < \text{max\_trx\_id} \land trx\_id \notin \text{m\_ids} \\
\text{false} & \text{if } trx\_id \geq \text{max\_trx\_id}
\end{cases}
$$

**简化规则**：

1. 版本的事务ID < min_trx_id → **可见**（事务已提交）
2. 版本的事务ID 在 m_ids 中 → **不可见**（事务未提交）
3. 版本的事务ID ≥ max_trx_id → **不可见**（事务在 Read View 创建后开始）
4. 版本的事务ID 在 [min, max) 但不在 m_ids 中 → **可见**（事务已提交）

### 2.4 版本遍历过程

```
1. 读取当前行的 trx_id
2. 判断当前版本是否可见
3. 如果不可见，沿 roll_ptr 找到上一个版本
4. 重复步骤2-3，直到找到可见版本或版本链结束
```

## 3. 不同隔离级别的 MVCC 行为

### 3.1 READ COMMITTED

```sql
-- 每次 SELECT 创建新的 Read View
BEGIN;
SELECT * FROM accounts WHERE id = 1;  -- 创建 Read View 1
-- 事务B修改并提交
SELECT * FROM accounts WHERE id = 1;  -- 创建 Read View 2，能看到事务B的修改
COMMIT;
```

### 3.2 REPEATABLE READ

```sql
-- 事务开始时创建 Read View，后续复用
BEGIN;
SELECT * FROM accounts WHERE id = 1;  -- 创建 Read View（唯一）
-- 事务B修改并提交
SELECT * FROM accounts WHERE id = 1;  -- 复用 Read View，看不到事务B的修改
COMMIT;
```

## 4. PostgreSQL 的 MVCC 实现

### 4.1 行头信息

PostgreSQL 每行数据包含：

| 字段 | 含义                                 |
| ---- | ------------------------------------ |
| xmin | 插入该行的事务ID                     |
| xmax | 删除/更新该行的事务ID（0表示未删除） |

```sql
-- 查看行版本信息
SELECT xmin, xmax, * FROM employees WHERE id = 1;
```

### 4.2 可见性判断

```sql
-- PostgreSQL 可见性规则（简化）
-- 行可见当：
-- 1. xmin 对应的事务已提交
-- 2. xmax 为 0 或 xmax 对应的事务未提交

-- 使用 pg_snapshot 理解可见性
SELECT txid_current();           -- 当前事务ID
SELECT txid_snapshot_current();  -- 当前快照
```

### 4.3 UPDATE = DELETE + INSERT

```sql
-- PostgreSQL 的 UPDATE 创建新行版本
UPDATE employees SET salary = 60000 WHERE id = 1;
-- 旧行：xmax = 当前事务ID（标记为已删除）
-- 新行：xmin = 当前事务ID（新版本）
```

## 5. MVCC 与当前读

### 5.1 快照读 vs 当前读

| 类型   | 语句                      | 读取内容       |
| ------ | ------------------------- | -------------- |
| 快照读 | 普通 SELECT               | MVCC 历史版本  |
| 当前读 | SELECT FOR UPDATE         | 最新已提交数据 |
| 当前读 | SELECT LOCK IN SHARE MODE | 最新已提交数据 |
| 当前读 | INSERT, UPDATE, DELETE    | 最新已提交数据 |

```sql
-- 快照读：使用 MVCC
SELECT * FROM employees WHERE id = 1;

-- 当前读：读取最新数据并加锁
SELECT * FROM employees WHERE id = 1 FOR UPDATE;
UPDATE employees SET salary = 60000 WHERE id = 1;
```

## 6. MVCC 的空间回收

### 6.1 版本堆积问题

MVCC 保留历史版本，导致空间不断增长：

- 已提交事务的旧版本可能仍被其他事务引用
- 长事务会阻止旧版本清理
- 频繁更新导致表膨胀

### 6.2 清理机制

**InnoDB**：

- Purge 线程：清理不再需要的 undo log
- 条件：该版本对所有活跃事务都不可见

**PostgreSQL**：

- VACUUM：标记死行空间为可重用
- Autovacuum：自动触发清理
- VACUUM FULL：重建表，回收所有空间

```sql
-- PostgreSQL 手动清理
VACUUM employees;           -- 标记死行空间可重用
VACUUM FULL employees;      -- 重建表，回收空间（锁表）

-- 查看表膨胀
SELECT schemaname, relname,
       pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
       n_dead_tup
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;
```

### 6.3 防止版本堆积

```sql
-- 避免长事务
SELECT pid, now() - xact_start AS duration, query
FROM pg_stat_activity
WHERE xact_start IS NOT NULL
ORDER BY duration DESC;

-- 设置事务超时
SET idle_in_transaction_session_timeout = '5min';  -- PostgreSQL
SET innodb_kill_idle_transaction = 60;             -- MySQL

-- 定期 VACUUM（PostgreSQL）
-- 配置 autovacuum 参数
ALTER TABLE employees SET (autovacuum_vacuum_scale_factor = 0.1);
```
## MVCC 基本概念

**基本写法：MVCC 原理**
`-- 每行保存多个版本，读操作不加锁`
```sql
-- MVCC（Multi-Version Concurrency Control）
-- 每行数据隐藏两个字段：
--   trx_id   最后修改该行的事务 ID
--   roll_ptr 指向 undo log 中该行的上一个版本
-- 读操作根据 Read View 选择合适的版本，不加锁
```

---

**基本写法：查看隐藏字段**
`-- InnoDB 每行隐藏字段`
```sql
-- MySQL InnoDB 每行记录的隐藏列
-- DB_TRX_ID    事务 ID（6 字节）
-- DB_ROLL_PTR  回滚指针（7 字节）
-- DB_ROW_ID     行 ID（6 字节，无主键时自动生成）
```

---

## Read View（读视图）

**基本写法：Read View 创建时机**
`-- 在 READ COMMITTED 下每次 SELECT 创建新 Read View`
```sql
-- READ COMMITTED 隔离级别
-- 每次 SELECT 都创建新的 Read View
-- 因此能看到其他事务已提交的最新数据

-- REPEATABLE READ 隔离级别
-- 事务第一次 SELECT 时创建 Read View
-- 整个事务使用同一个 Read View
-- 因此看到的是事务开始时的快照
```

---

**基本写法：可见性判断规则**
`-- 行版本对当前事务可见的条件`
```sql
-- Read View 包含：
--   m_ids       活跃事务 ID 列表
--   min_trx_id  最小活跃事务 ID
--   max_trx_id  下一个事务 ID
--   creator_trx_id 当前事务 ID

-- 判断规则：
-- 1. trx_id == creator_trx_id → 可见（自己修改的）
-- 2. trx_id < min_trx_id      → 可见（已提交）
-- 3. trx_id >= max_trx_id     → 不可见（未来事务）
-- 4. min_trx_id <= trx_id < max_trx_id 且不在 m_ids → 可见
--    在 m_ids 中 → 不可见，沿 roll_ptr 找历史版本
```

---

## 快照读

**基本写法：普通 SELECT 是快照读**
`SELECT * FROM <表> WHERE <条件>`
```sql
-- 快照读：读取 MVCC 版本链中的可见版本，不加锁
-- READ COMMITTED 下读到最新已提交版本
-- REPEATABLE READ 下读到事务开始时的快照

SELECT * FROM accounts WHERE id = 1;
-- 不加锁，读的是快照
```

---

**基本写法：不同隔离级别的快照读**
`-- 同一查询在不同隔离级别下结果不同`
```sql
-- 会话A（REPEATABLE READ）
BEGIN;
SELECT balance FROM accounts WHERE id = 1;  -- 1000

-- 会话B 修改并提交
-- UPDATE accounts SET balance = 500 WHERE id = 1; COMMIT;

-- 会话A 再次查询（快照读）
SELECT balance FROM accounts WHERE id = 1;  -- 仍为 1000（使用旧快照）
COMMIT;
```

---

## 当前读

**基本写法：加锁查询是当前读**
`SELECT * FROM <表> WHERE <条件> FOR UPDATE`
```sql
-- 当前读：读取最新版本并加锁
-- FOR UPDATE / LOCK IN SHARE MODE / UPDATE / DELETE 都是当前读

BEGIN;
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
-- 读取最新版本（即使其他事务已提交），并加排他锁
COMMIT;
```

---

**基本写法：UPDATE 是当前读**
`UPDATE <表> SET <列>=<值> WHERE <条件>`
```sql
-- UPDATE/DELETE 操作需要读取最新版本（当前读）
BEGIN;
-- 快照读（读旧版本）
SELECT balance FROM accounts WHERE id = 1;  -- 1000

-- 当前读（读最新版本）
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
-- 此处读到的是最新余额（可能是 2000），更新后为 1900
COMMIT;
```

---

## undo log 版本链

**基本写法：版本链结构**
`-- 每次修改生成 undo log，形成版本链`
```sql
-- 版本链示例
-- 当前行:  trx_id=200, balance=300
--          ↓ roll_ptr
-- undo1:  trx_id=150, balance=500
--          ↓ roll_ptr
-- undo2:  trx_id=100, balance=1000

-- 事务 trx_id=120 的 Read View：
-- 200 不可见（活跃），150 不可见（活跃），100 可见 → 读到 balance=1000
```

---

**基本写法：purge 清理 undo log**
`-- 没有活跃事务引用的旧版本会被清理`
```sql
-- MySQL InnoDB 后台 purge 线程清理 undo log
-- 当 Read View 不再需要某个旧版本时，purge 线程删除它

-- 查看 purge 状态
SHOW ENGINE INNODB STATUS\G
-- 查看 purge 相关信息
```

---

## MVCC 与隔离级别

**基本写法：READ COMMITTED 下的 MVCC**
`-- 每次查询创建新 Read View`
```sql
-- READ COMMITTED 隔离级别
BEGIN;
SELECT * FROM accounts WHERE id = 1;  -- Read View 1，读到余额 1000

-- 其他事务提交修改

SELECT * FROM accounts WHERE id = 1;  -- Read View 2，读到新余额 500
-- 因为每次 SELECT 都创建新的 Read View
COMMIT;
```

---

**基本写法：REPEATABLE READ 下的 MVCC**
`-- 事务内使用同一个 Read View`
```sql
-- REPEATABLE READ 隔离级别
BEGIN;
SELECT * FROM accounts WHERE id = 1;  -- Read View 创建，读到余额 1000

-- 其他事务提交修改

SELECT * FROM accounts WHERE id = 1;  -- 仍为 1000（使用同一 Read View）
COMMIT;
```

---

## MVCC 相关参数

**基本写法：查看 undo 相关参数**
`SHOW VARIABLES LIKE 'innodb_undo%';`
```sql
-- 查看 undo 表空间配置
SHOW VARIABLES LIKE 'innodb_undo%';
-- innodb_undo_directory: undo log 目录
-- innodb_undo_log_truncate: 是否自动截断
-- innodb_undo_tablespaces: undo 表空间数量
```

---

**基本写法：查看隔离级别**
`SELECT @@transaction_isolation;`
```sql
-- 当前隔离级别决定了 MVCC 的行为
SELECT @@transaction_isolation;
-- REPEATABLE-READ（MySQL 默认，MVCC 效果最佳）
```

---

## MVCC 优势

**基本写法：读不加锁**
`-- 读操作不阻塞写，写不阻塞读`
```sql
-- 传统锁机制：
--   读加共享锁 → 阻塞写
--   写加排他锁 → 阻塞读

-- MVCC：
--   快照读不加锁 → 不阻塞写
--   写加排他锁 → 不阻塞快照读
--   大幅提升读多写少场景的并发性能
```

---

## MVCC 局限性

**基本写法：长事务导致 undo 膨胀**
`-- 长事务持有旧 Read View，旧版本无法清理`
```sql
-- 长事务问题
BEGIN;
SELECT * FROM accounts;  -- 创建 Read View

-- ... 长时间不提交
-- 其他事务大量更新
-- undo log 持续增长，无法 purge
-- 导致 ibdata 或 undo 表空间膨胀

COMMIT;  -- 提交后 purge 才能清理旧版本
```

---

**基本写法：更新频繁的表性能下降**
`-- 版本链过长时，查找可见版本需要遍历`
```sql
-- 高频更新场景下，版本链可能很长
-- 读操作需要遍历版本链找到可见版本
-- 导致读性能下降

-- 建议：
-- 1. 避免长事务
-- 2. 高频更新表考虑降低隔离级别
-- 3. 定期 COMMIT 释放 Read View
```

---

## PostgreSQL MVCC

**基本写法：PostgreSQL MVCC 实现**
`-- 每行存储 xmin（创建事务）和 xmax（删除事务）`
```sql
-- PostgreSQL MVCC 使用 xmin/xmax 标记
-- xmin   插入/更新该行的事务 ID
-- xmax   删除/更新该行的事务 ID（0 表示未删除）

-- 查看行的事务信息（需要超级用户）
SELECT xmin, xmax, * FROM accounts WHERE id = 1;
```

---

**基本写法：PostgreSQL 表膨胀**
`-- 更新产生死元组，需要 VACUUM 清理`
```sql
-- PostgreSQL 更新 = 删除旧行 + 插入新行
-- 旧行标记为 dead tuple

-- 手动清理
VACUUM accounts;

-- 分析并清理
VACUUM ANALYZE accounts;

-- 完全清理（锁表）
VACUUM FULL accounts;

-- 自动清理配置
SHOW autovacuum;
```
