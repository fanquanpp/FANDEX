---
order: 74
title: MVCC
module: sql
category: SQL
difficulty: advanced
description: 'SQL多版本并发控制MVCC：版本链、快照读、Read View、可见性判断与垃圾回收机制'
author: fanquanpp
updated: '2026-06-14'
related:
  - sql/脏读不可重复读幻读
  - sql/锁机制
  - sql/窗口函数框架
  - sql/递归CTE遍历树结构
prerequisites:
  - sql/概述与标准
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
