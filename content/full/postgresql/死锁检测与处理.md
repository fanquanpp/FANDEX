---
order: 52
title: 死锁检测与处理
module: postgresql
category: PostgreSQL
difficulty: intermediate
description: PostgreSQL死锁检测与处理：检测算法、日志分析、超时配置与预防策略
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/体系架构
  - postgresql/锁机制
  - postgresql/VACUUM机制
  - postgresql/事务ID回卷预防
prerequisites:
  - postgresql/概述与安装配置
---

## 概述

死锁是数据库并发控制中常见的问题，当两个或多个事务互相等待对方持有的锁时，就会形成循环等待，导致所有涉及的事务都无法继续执行。PostgreSQL 内置了基于等图（Wait-For Graph）的死锁检测机制，能够自动发现并中断死锁。理解死锁的成因、检测原理和处理策略，对于保障数据库系统的稳定运行至关重要。

## 基础概念

**死锁（Deadlock）**：两个或多个事务形成循环等待的情况。事务 A 等待事务 B 持有的锁，事务 B 同时等待事务 A 持有的锁，双方都无法继续。

**等图（Wait-For Graph）**：一种有向图，节点表示事务，边表示等待关系。如果图中存在环，则说明发生了死锁。

**deadlock_timeout**：死锁检测间隔参数，默认 1 秒。PostgreSQL 不会在每次锁等待时都检查死锁，而是等待该时间后才触发检测，因为死锁相对罕见，频繁检测会浪费资源。

**lock_timeout**：锁等待超时参数，设置事务等待锁的最长时间。超过该时间后自动中止等待，与死锁检测无关。

**牺牲者（Victim）**：死锁被检测到后，PostgreSQL 会选择其中一个事务作为牺牲者并中止它，从而打破循环等待。通常选择修改数据量最少的事务。

## 快速上手

### 死锁检测配置

```sql
-- 查看当前死锁检测间隔
SHOW deadlock_timeout;

-- 设置死锁检测间隔为 1 秒（默认值）
SET deadlock_timeout = '1s';

-- 在生产环境中可以适当增大，减少检测开销
-- 但不要设置过大，否则死锁发现会延迟
SET deadlock_timeout = '2s';
```

### 锁等待超时

```sql
-- 设置锁等待超时为 5 秒
-- 超过 5 秒仍未获取锁则自动中止
SET lock_timeout = '5s';

-- 默认值为 0，表示无限等待
SET lock_timeout = 0;

-- 在应用层设置，避免长时间阻塞
SET LOCAL lock_timeout = '10s';
```

### 查看当前锁等待

```sql
-- 查看当前正在等待锁的会话
SELECT
    blocked.pid AS blocked_pid,
    blocked.query AS blocked_query,
    blocking.pid AS blocking_pid,
    blocking.query AS blocking_query,
    blocked.wait_event_type,
    blocked.wait_event
FROM pg_stat_activity blocked
JOIN pg_locks blocked_locks
    ON blocked.pid = blocked_locks.pid
JOIN pg_locks blocking_locks
    ON blocked_locks.locktype = blocking_locks.locktype
    AND blocked_locks.database IS NOT DISTINCT FROM blocking_locks.database
    AND blocked_locks.relation IS NOT DISTINCT FROM blocking_locks.relation
    AND blocked_locks.page IS NOT DISTINCT FROM blocking_locks.page
    AND blocked_locks.tuple IS NOT DISTINCT FROM blocking_locks.tuple
    AND blocked_locks.virtualxid IS NOT DISTINCT FROM blocking_locks.virtualxid
    AND blocked_locks.transactionid IS NOT DISTINCT FROM blocking_locks.transactionid
    AND blocked_locks.classid IS NOT DISTINCT FROM blocking_locks.classid
    AND blocked_locks.objid IS NOT DISTINCT FROM blocking_locks.objid
    AND blocked_locks.objsubid IS NOT DISTINCT FROM blocking_locks.objsubid
    AND blocked_locks.pid != blocking_locks.pid
JOIN pg_stat_activity blocking
    ON blocking_locks.pid = blocking.pid
WHERE NOT blocked_locks.granted;
```

## 详细用法

### 死锁日志分析

```sql
-- 当死锁发生时，PostgreSQL 会在日志中记录详细信息
-- 典型的死锁日志如下：

-- ERROR:  deadlock detected
-- DETAIL:  Process 12345 waits for AccessExclusiveLock on relation 16384;
--          blocked by process 12346.
--          Process 12346 waits for ShareLock on transaction 98765;
--          blocked by process 12345.
-- HINT:   See server log for query details.
-- CONTEXT: while updating tuple (0,1) in relation "accounts"

-- 日志解读：
-- 1. 进程 12345 等待关系 16384 上的 AccessExclusiveLock
-- 2. 该锁被进程 12346 持有
-- 3. 进程 12346 等待事务 98765 上的 ShareLock
-- 4. 该锁被进程 12345 持有
-- 5. 形成循环等待 -> 死锁
```

```sql
-- 启用更详细的锁日志
-- 记录所有锁等待事件
SET log_lock_waits = on;

-- 设置锁等待日志阈值（默认 1 秒）
-- 等待超过该时间的锁会记录到日志
SET deadlock_timeout = '1s';

-- 在 postgresql.conf 中配置
-- log_lock_waits = on
-- deadlock_timeout = '1s'
```

### 模拟死锁场景

```sql
-- 会话1：更新账户A的余额
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
-- 此时持有 id=1 的行锁

-- 会话2：更新账户B的余额
BEGIN;
UPDATE accounts SET balance = balance - 50 WHERE id = 2;
-- 此时持有 id=2 的行锁

-- 会话1：尝试更新账户B（等待会话2释放锁）
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
-- 阻塞...

-- 会话2：尝试更新账户A（等待会话1释放锁）
UPDATE accounts SET balance = balance + 50 WHERE id = 1;
-- 死锁形成！PostgreSQL 检测到后自动中止其中一个事务

-- 结果：其中一个会话收到错误
-- ERROR: deadlock detected
```

### 使用 Advisory 锁协调

```sql
-- Advisory 锁是应用级别的锁，不与表数据关联
-- 可用于协调多个会话的执行顺序，避免死锁

-- 获取 Advisory 锁（会阻塞直到获取）
SELECT pg_advisory_lock(12345);

-- 尝试获取 Advisory 锁（非阻塞，获取失败返回 false）
SELECT pg_try_advisory_lock(12345);

-- 释放 Advisory 锁
SELECT pg_advisory_unlock(12345);

-- 使用 Advisory 锁确保按固定顺序访问资源
BEGIN;
-- 先获取账户ID较小的锁
SELECT pg_advisory_lock(least(1, 2));
SELECT pg_advisory_lock(greatest(1, 2));

-- 然后执行更新操作
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

COMMIT;
SELECT pg_advisory_unlock_all();
```

## 常见场景

### 转账场景的死锁预防

```sql
-- 问题：两个用户同时互相转账
-- 用户A给用户B转账，用户B同时给用户A转账
-- 可能形成死锁

-- 解决方案1：按固定顺序获取锁
CREATE OR REPLACE FUNCTION transfer_funds(
    from_id INT,
    to_id INT,
    amount DECIMAL
) RETURNS VOID AS $$
DECLARE
    first_id INT;
    second_id INT;
BEGIN
    -- 按 ID 排序，确保总是先锁较小的 ID
    first_id := least(from_id, to_id);
    second_id := greatest(from_id, to_id);

    -- 按顺序锁定行
    PERFORM * FROM accounts WHERE id = first_id FOR UPDATE;
    PERFORM * FROM accounts WHERE id = second_id FOR UPDATE;

    -- 执行转账
    UPDATE accounts SET balance = balance - amount WHERE id = from_id;
    UPDATE accounts SET balance = balance + amount WHERE id = to_id;
END;
$$ LANGUAGE plpgsql;
```

### 批量更新避免死锁

```sql
-- 问题：批量更新时可能与其他事务形成死锁
-- 解决方案：使用 ORDER BY 确保更新顺序一致

-- 不推荐：无序更新可能导致死锁
UPDATE orders SET status = 'processed'
WHERE status = 'pending';

-- 推荐：按主键顺序更新
UPDATE orders SET status = 'processed'
WHERE id IN (
    SELECT id FROM orders
    WHERE status = 'pending'
    ORDER BY id
    FOR UPDATE SKIP LOCKED  -- 跳过被锁定的行
);

-- SKIP LOCKED：跳过已被其他事务锁定的行
-- 避免等待，减少死锁风险
```

### 读写分离场景的锁冲突

```sql
-- 问题：长事务持有锁导致写入阻塞
-- 解决方案：使用较低隔离级别或优化查询

-- 方案1：使用 READ COMMITTED 隔离级别（默认）
-- 每条语句获取新的快照，减少锁持有时间
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- 方案2：将长查询拆分为多个短事务
-- 而不是一个持续很久的大事务

-- 方案3：使用 NOWAIT 避免阻塞
-- 无法获取锁时立即报错而非等待
SELECT * FROM accounts WHERE id = 1 FOR UPDATE NOWAIT;

-- 方案4：使用 SKIP LOCKED 处理队列
-- 跳过被锁定的行，处理可用的行
SELECT * FROM job_queue
WHERE status = 'pending'
ORDER BY created_at
LIMIT 10
FOR UPDATE SKIP LOCKED;
```

## 注意事项

- **deadlock_timeout 设置**：默认 1 秒适合大多数场景。设置过小会增加 CPU 开销（频繁构建等图），设置过大会延长死锁持续时间。生产环境建议保持默认或设为 2-5 秒。
- **lock_timeout 与 deadlock_timeout 的区别**：lock_timeout 是锁等待超时，无论是否死锁都会触发；deadlock_timeout 是死锁检测间隔，只在检测到循环等待时才触发。两者独立工作。
- **自动恢复**：PostgreSQL 检测到死锁后会自动中止其中一个事务（牺牲者），应用需要捕获错误并重试。
- **重试策略**：被中止的事务应自动重试，通常重试 3-5 次即可。重试时应使用新的连接或重置事务状态。
- **监控告警**：频繁发生死锁说明应用逻辑存在问题，应设置监控告警，当死锁频率超过阈值时及时排查。

## 进阶用法

### 自定义死锁重试逻辑

```sql
-- 在 PL/pgSQL 中实现自动重试
CREATE OR REPLACE FUNCTION safe_transfer(
    from_id INT,
    to_id INT,
    amount DECIMAL,
    max_retries INT DEFAULT 3
) RETURNS BOOLEAN AS $$
DECLARE
    retry_count INT := 0;
BEGIN
    LOOP
        BEGIN
            PERFORM transfer_funds(from_id, to_id, amount);
            RETURN true;
        EXCEPTION WHEN deadlock_detected THEN
            retry_count := retry_count + 1;
            IF retry_count >= max_retries THEN
                RAISE NOTICE 'Transfer failed after % retries', max_retries;
                RETURN false;
            END IF;
            -- 短暂延迟后重试
            PERFORM pg_sleep(0.1 * retry_count);
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### 死锁监控视图

```sql
-- 创建死锁监控视图
CREATE VIEW v_deadlock_monitor AS
SELECT
    datname AS database,
    deadlocks AS deadlock_count,
    xact_commit,
    xact_rollback,
    ROUND(
        deadlocks::numeric / NULLIF(xact_commit + xact_rollback, 0) * 100,
        4
    ) AS deadlock_rate
FROM pg_stat_database
WHERE deadlocks > 0
ORDER BY deadlocks DESC;

-- 查询死锁率
SELECT * FROM v_deadlock_monitor;

-- 重置死锁统计计数器
SELECT pg_stat_reset();
```

### 锁等待超时与语句超时配合

```sql
-- 综合超时策略
BEGIN;
-- 语句执行超时：单条 SQL 最长执行时间
SET LOCAL statement_timeout = '30s';

-- 锁等待超时：等待锁的最长时间
SET LOCAL lock_timeout = '5s';

-- 死锁检测间隔
SET LOCAL deadlock_timeout = '1s';

-- 执行业务操作
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

COMMIT;

-- 三层超时保护：
-- 1. lock_timeout (5s)：快速发现锁冲突
-- 2. deadlock_timeout (1s)：快速发现死锁
-- 3. statement_timeout (30s)：防止语句执行过久
```
