---
order: 2
title: 事务与并发控制
module: postgresql
category: PostgreSQL
difficulty: intermediate
description: MVCC多版本并发控制、快照隔离、事务隔离级别、锁机制、死锁检测、VACUUM机制与冻结。
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/概述与安装配置
  - postgresql/索引与查询优化
  - postgresql/高级SQL与扩展
prerequisites: []
---

## 1. MVCC 多版本并发控制

### 1.1 MVCC 原理

PostgreSQL 使用 MVCC（Multi-Version Concurrency Control）实现并发控制，核心思想是**读不阻塞写，写不阻塞读**。

```
每行数据包含 4 个系统列:
  xmin — 插入该行的事务 ID
  xmax — 删除/更新该行的事务 ID（0 表示未删除）
  ctid — 当前行的物理位置（块号+偏移）
  infomask — 标志位（事务状态）

可见性判断:
  行可见 ⟺ xmin 已提交 且 (xmax = 0 或 xmax 未提交)
```

### 1.2 数据版本演进

```sql
-- 创建测试表
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    name TEXT,
    balance NUMERIC(10,2)
);

-- 事务1: 插入数据
BEGIN;
INSERT INTO accounts (name, balance) VALUES ('Alice', 1000);
-- 此时: xmin = 当前事务ID, xmax = 0
COMMIT;

-- 事务2: 更新数据
BEGIN;
UPDATE accounts SET balance = 800 WHERE name = 'Alice';
-- 旧行: xmax = 当前事务ID（标记为已过期）
-- 新行: xmin = 当前事务ID, xmax = 0
COMMIT;

-- 查看系统列
SELECT xmin, xmax, ctid, * FROM accounts;
```

### 1.3 快照隔离

```
快照(Snapshot)记录了事务开始时的数据库状态:
  - xmin: 快照开始时的下一个事务ID
  - xmax: 快照开始时所有活跃事务的最大ID+1
  - xip: 快照开始时的活跃事务列表

可见性规则:
  1. xmin 对应的事务已提交 且 < 快照的 xmin → 可见
  2. xmin 对应的事务在 xip 列表中 → 不可见（活跃中）
  3. xmax 对应的事务已提交 且 < 快照的 xmin → 不可见（已删除）
```

## 2. 事务隔离级别

### 2.1 四种隔离级别

| 隔离级别      | 脏读 | 不可重复读 | 幻读 | PostgreSQL 实现    |
| :------------ | :--- | :--------- | :--- | :----------------- |
| 读未提交      | 否   | 是         | 是   | 等同于读已提交     |
| 读已提交(RC)  | 否   | 是         | 是   | 每条语句获取新快照 |
| 可重复读(RR)  | 否   | 否         | 否\* | 事务开始时获取快照 |
| 可序列化(SER) | 否   | 否         | 否   | SSI 串行化快照隔离 |

> \*PostgreSQL 的可重复读通过谓词锁防止了幻读，这超出了 SQL 标准要求。

### 2.2 读已提交（Read Committed）

```sql
-- 会话1
BEGIN ISOLATION LEVEL READ COMMITTED;
SELECT balance FROM accounts WHERE name = 'Alice';  -- 返回 800

-- 会话2（同时执行）
BEGIN;
UPDATE accounts SET balance = 600 WHERE name = 'Alice';
COMMIT;

-- 会话1 再次查询
SELECT balance FROM accounts WHERE name = 'Alice';  -- 返回 600（看到新数据）
COMMIT;
```

### 2.3 可重复读（Repeatable Read）

```sql
-- 会话1
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT balance FROM accounts WHERE name = 'Alice';  -- 返回 600

-- 会话2（同时执行）
BEGIN;
UPDATE accounts SET balance = 400 WHERE name = 'Alice';
COMMIT;

-- 会话1 再次查询
SELECT balance FROM accounts WHERE name = 'Alice';  -- 返回 600（仍看到旧数据）

-- 会话1 尝试更新
UPDATE accounts SET balance = 500 WHERE name = 'Alice';
-- ERROR: could not serialize access due to concurrent update
COMMIT;
```

### 2.4 可序列化（Serializable）

```sql
-- 会话1
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT COUNT(*) FROM accounts WHERE balance > 500;  -- 返回 1

-- 会话2（同时执行）
BEGIN ISOLATION LEVEL SERIALIZABLE;
INSERT INTO accounts (name, balance) VALUES ('Bob', 600);
COMMIT;

-- 会话1 基于查询结果做决策
INSERT INTO audit_log SELECT 'high_balance', COUNT(*)
  FROM accounts WHERE balance > 500;
COMMIT;
-- 可能抛出: ERROR: could not serialize access due to read/write dependencies
-- 需要重试事务
```

## 3. 锁机制

### 3.1 表级锁

| 锁模式           | 冲突锁                                                                     | 获取方式         |
| :--------------- | :------------------------------------------------------------------------- | :--------------- |
| ACCESS SHARE     | ACCESS EXCLUSIVE                                                           | SELECT           |
| ROW SHARE        | ACCESS EXCLUSIVE, EXCLUSIVE                                                | SELECT FOR       |
| ROW EXCLUSIVE    | ACCESS EXCLUSIVE, EXCLUSIVE, SHARE ROW EXCL                                | UPDATE/DELETE    |
| SHARE UPDATE     | ACCESS EXCLUSIVE, EXCLUSIVE, SHARE ROW EXCL                                | VACUUM           |
| SHARE            | ACCESS EXCLUSIVE, EXCLUSIVE, ROW EXCL, SHARE ROW EXCL                      | CREATE INDEX     |
| SHARE ROW EXCL   | ACCESS EXCLUSIVE, EXCLUSIVE, ROW EXCL, SHARE, SHARE ROW EXCL               | -                |
| EXCLUSIVE        | ACCESS EXCLUSIVE, ROW SHARE, ROW EXCL, SHARE, SHARE ROW EXCL, SHARE UPDATE | -                |
| ACCESS EXCLUSIVE | 所有锁模式                                                                 | DROP/ALTER TABLE |

```sql
-- 显式获取表锁
LOCK TABLE accounts IN ACCESS EXCLUSIVE MODE;

-- 查看当前锁
SELECT locktype, relation::regclass, mode, pid, granted
FROM pg_locks
WHERE relation IS NOT NULL
ORDER BY relation, mode;
```

### 3.2 行级锁

```sql
-- FOR UPDATE: 排他行锁（更新/删除时自动获取）
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;

-- FOR NO KEY UPDATE: 弱于 FOR UPDATE，不阻塞 KEY SELECT
SELECT * FROM accounts WHERE id = 1 FOR NO KEY UPDATE;

-- FOR SHARE: 共享行锁（允许并发读，阻止更新）
SELECT * FROM accounts WHERE id = 1 FOR SHARE;

-- FOR KEY SHARE: 弱于 FOR SHARE，仅锁键列
SELECT * FROM accounts WHERE id = 1 FOR KEY SHARE;

-- NOWAIT: 不等待锁，立即报错
SELECT * FROM accounts WHERE id = 1 FOR UPDATE NOWAIT;

-- SKIP LOCKED: 跳过已锁行
SELECT * FROM accounts WHERE id = 1 FOR UPDATE SKIP LOCKED;
```

### 3.3 Advisory 锁

```sql
-- 会话级 Advisory 锁（会话结束自动释放）
SELECT pg_advisory_lock(12345);           -- 获取锁（阻塞等待）
SELECT pg_try_advisory_lock(12345);       -- 尝试获取（非阻塞）
SELECT pg_advisory_unlock(12345);         -- 释放锁

-- 事务级 Advisory 锁（事务结束自动释放）
SELECT pg_advisory_xact_lock(12345);

-- 使用双 int4 参数
SELECT pg_advisory_lock(1, 100);          -- classId=1, objId=100

-- 应用场景：分布式锁、限流
SELECT CASE WHEN pg_try_advisory_lock(12345)
  THEN 'acquired'
  ELSE 'locked'
END;
```

## 4. 死锁检测与处理

### 4.1 死锁场景

```sql
-- 会话1
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE name = 'Alice';
-- 等待会话2释放 Bob 的锁...
UPDATE accounts SET balance = balance + 100 WHERE name = 'Bob';

-- 会话2（同时执行）
BEGIN;
UPDATE accounts SET balance = balance - 50 WHERE name = 'Bob';
-- 等待会话1释放 Alice 的锁...
UPDATE accounts SET balance = balance + 50 WHERE name = 'Alice';
-- DEADLOCK! PostgreSQL 自动检测并终止其中一个事务
-- ERROR: deadlock detected
```

### 4.2 死锁检测机制

```
PostgreSQL 死锁检测:
1. 等待图(Wait-For Graph): 事务 A → 事务 B → 事务 A = 环路
2. 检测间隔: deadlock_timeout (默认 1s)
3. 检测到死锁后: 终止其中一个事务（选择代价最小的）
4. 被终止的事务收到 ERROR，需要应用层重试
```

### 4.3 避免死锁的最佳实践

```sql
-- 1. 按固定顺序访问资源
-- 始终按 id 升序更新
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

-- 2. 使用显式锁预先锁定
BEGIN;
SELECT * FROM accounts WHERE id IN (1, 2) ORDER BY id FOR UPDATE;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;

-- 3. 保持事务简短
-- 4. 设置锁等待超时
SET lock_timeout = '5s';
```

## 5. VACUUM 机制

### 5.1 为什么需要 VACUUM

```
MVCC 的副作用:
1. UPDATE/DELETE 产生死元组(dead tuples)，占用磁盘空间
2. 事务 ID 回卷(xid wraparound)风险
3. 索引膨胀(index bloat)
4. 统计信息过时影响查询规划

VACUUM 的作用:
1. 回收死元组空间（标记为可重用）
2. 更新空闲空间映射(FSM)
3. 更新可见性映射(VM)
4. 冻结旧事务 ID（防止回卷）
5. 更新统计信息（VACUUM ANALYZE）
```

### 5.2 自动清理（Autovacuum）

```ini
# postgresql.conf 自动清理参数
autovacuum = on                          # 启用自动清理
autovacuum_max_workers = 3               # 工作进程数
autovacuum_naptime = 1min                # 检查间隔

# 触发阈值（基于统计信息）
autovacuum_vacuum_scale_factor = 0.2     # 20% 行被修改时触发
autovacuum_analyze_scale_factor = 0.1    # 10% 行被修改时触发
autovacuum_vacuum_threshold = 50         # 最小修改行数
autovacuum_analyze_threshold = 50

# 性能参数
autovacuum_vacuum_cost_delay = 2ms       # 睡眠延迟
autovacuum_vacuum_cost_limit = 200       # 每轮成本限制
autovacuum_work_mem = -1                 # 使用 maintenance_work_mem
```

```sql
-- 表级自定义自动清理
ALTER TABLE orders SET (
  autovacuum_vacuum_scale_factor = 0.05,    -- 5% 即触发
  autovacuum_analyze_scale_factor = 0.02,   -- 2% 即分析
  autovacuum_vacuum_cost_delay = 1ms        -- 更积极的清理
);

-- 禁用某表自动清理（不推荐）
ALTER TABLE archive_table SET (autovacuum_enabled = false);
```

### 5.3 手动 VACUUM

```sql
-- 普通 VACUUM（不回收磁盘空间，标记可重用）
VACUUM accounts;

-- VACUUM ANALYZE（同时更新统计信息）
VACUUM ANALYZE accounts;

-- VACUUM FULL（回收磁盘空间，重建表，需排他锁）
VACUUM FULL accounts;  --  阻塞所有操作！

-- 并行 VACUUM（PostgreSQL 13+）
VACUUM (PARALLEL 4) accounts;

-- 查看表的死元组统计
SELECT relname, n_live_tup, n_dead_tup,
  last_vacuum, last_autovacuum, last_analyze, last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;
```

### 5.4 事务 ID 冻结（FREEZE）

```
事务 ID 回卷问题:
- 事务 ID 是 32 位无符号整数（0 ~ 2^31-1）
- 超过 20 亿后回卷到 0
- 回卷会导致数据不可见

冻结机制:
- 将旧行的 xmin 标记为 FrozenTransactionId
- 冻结后该行对所有事务可见
- 冻结阈值: vacuum_freeze_min_age (默认 5000万)
- 告警阈值: vacuum_freeze_table_age (默认 1.5亿)
- 强制冻结: autovacuum_freeze_max_age (默认 2亿)
```

```sql
-- 手动冻结
VACUUM FREEZE accounts;

-- 查看冻结状态
SELECT relname, age(relfrozenxid) as xid_age,
  pg_size_pretty(pg_total_relation_size(oid)) as size
FROM pg_class
WHERE relkind = 'r'
ORDER BY age(relfrozenxid) DESC;

-- 查看数据库级别的冻结年龄
SELECT datname, age(datfrozenxid) as xid_age
FROM pg_database
ORDER BY age(datfrozenxid) DESC;
```

### 5.5 可见性映射（Visibility Map）

```
可见性映射(VM)是每张表的辅助文件:
  - 每个数据页占 1 bit
  - bit=1: 该页所有行对所有事务可见（即全是活元组）
  - 用途:
    1. VACUUM 跳过全可见页（加速清理）
    2. Index-Only Scan 不需要回表（仅索引扫描）
    3. VACUUM FREEZE 跳过已冻结页

可见性映射文件: <oid>_vm
```

### 5.6 TID Store 内存优化（PostgreSQL 17）

```
PostgreSQL 17 VACUUM 改进:
- 使用 TID Store 替代原来的数组存储死元组 TID
- TID Store 基于共享内存的 radix tree
- 内存使用更高效，支持更大的表清理
- 减少维护工作内存的需求
- 对大表的 VACUUM 性能显著提升
```
