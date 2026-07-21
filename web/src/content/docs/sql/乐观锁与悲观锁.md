---
order: 102
title: 乐观锁与悲观锁
module: sql
category: database
difficulty: intermediate
description: 'SQL 并发控制核心机制：乐观锁（版本号/CAS）与悲观锁（SELECT FOR UPDATE）的原理、适用场景与实现细节。'
author: fanquanpp
updated: '2026-06-14'
related:
  - sql/窗口函数框架
  - sql/递归CTE遍历树结构
  - sql/常见SQL反模式
prerequisites:
  - sql/概述与标准
---

## 1. 并发控制基础

### 1.1 并发问题与锁的关系

| 并发问题   | 描述                       | 锁解决方案    |
| ---------- | -------------------------- | ------------- |
| 脏读       | 读到未提交的数据           | 读锁/写锁隔离 |
| 不可重复读 | 同一事务内两次读取结果不同 | 行级共享锁    |
| 幻读       | 同一查询返回不同行集       | 间隙锁/表锁   |
| 丢失更新   | 两个事务覆盖彼此的修改     | 乐观锁/悲观锁 |

### 1.2 乐观锁与悲观锁的核心思想

```
悲观锁：假定冲突一定发生 → 先加锁再操作
乐观锁：假定冲突很少发生 → 先操作再检测冲突
```

## 2. 乐观锁

### 2.1 版本号机制

在表中增加 `version` 字段，每次更新时检查版本号是否一致：

```sql
-- 表定义
CREATE TABLE products (
    id       INT PRIMARY KEY,
    name     VARCHAR(100),
    stock    INT,
    price    DECIMAL(10,2),
    version  INT DEFAULT 0
);

-- 读取数据
SELECT id, name, stock, price, version
FROM products WHERE id = 1;
-- 结果: stock=100, version=3

-- 更新时检查版本号
UPDATE products
SET stock = stock - 1, version = version + 1
WHERE id = 1 AND version = 3;
-- 影响行数 = 1 → 成功
-- 影响行数 = 0 → 版本冲突，需重试
```

**应用层重试逻辑**：

```python
MAX_RETRIES = 3

for attempt in range(MAX_RETRIES):
    product = db.query("SELECT * FROM products WHERE id = 1")
    affected = db.execute(
        "UPDATE products SET stock = stock - 1, version = version + 1 "
        "WHERE id = 1 AND version = :ver",
        {"ver": product.version}
    )
    if affected > 0:
        break  # 更新成功
    else:
        if attempt == MAX_RETRIES - 1:
            raise ConcurrentUpdateError("乐观锁冲突，重试次数耗尽")
        time.sleep(0.1 * (2 ** attempt))  # 指数退避
```

### 2.2 时间戳机制

使用 `updated_at` 时间戳替代版本号：

```sql
CREATE TABLE orders (
    id         INT PRIMARY KEY,
    status     VARCHAR(20),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 读取
SELECT id, status, updated_at FROM orders WHERE id = 100;
-- updated_at = '2026-06-14 10:30:00'

-- 更新
UPDATE orders
SET status = 'shipped', updated_at = CURRENT_TIMESTAMP
WHERE id = 100 AND updated_at = '2026-06-14 10:30:00';
```

> **注意**：时间戳方案在极端情况下可能因时钟精度问题导致冲突漏检，版本号方案更可靠。

### 2.3 CAS（Compare-And-Swap）模式

CAS 是乐观锁在数据库层面的最小化实现，直接比较业务字段：

```sql
-- 扣减库存，条件是库存足够
UPDATE products
SET stock = stock - 1
WHERE id = 1 AND stock >= 1;
-- 影响行数 = 0 表示库存不足

-- 转账，条件是余额足够
UPDATE accounts
SET balance = balance - 500
WHERE id = 1001 AND balance >= 500;
```

### 2.4 乐观锁的适用场景

- **读多写少**：冲突概率低，乐观锁性能优势明显
- **短事务**：操作时间短，冲突窗口小
- **分布式系统**：无需分布式锁管理器
- **高并发读**：不阻塞读操作

## 3. 悲观锁

### 3.1 SELECT ... FOR UPDATE

```sql
-- 排他锁（X锁）：阻止其他事务读写
BEGIN;
SELECT stock FROM products WHERE id = 1 FOR UPDATE;
-- 此时其他事务无法读取（某些隔离级别下）或修改此行
UPDATE products SET stock = stock - 1 WHERE id = 1;
COMMIT;

-- 共享锁（S锁）：阻止其他事务写，但允许读
BEGIN;
SELECT stock FROM products WHERE id = 1 FOR SHARE;
-- 其他事务可以 FOR SHARE，但不能 FOR UPDATE
COMMIT;
```

### 3.2 FOR UPDATE 的变体

```sql
-- MySQL
SELECT * FROM orders WHERE id = 1 FOR UPDATE;          -- 排他锁
SELECT * FROM orders WHERE id = 1 LOCK IN SHARE MODE;  -- 共享锁（旧语法）
SELECT * FROM orders WHERE id = 1 FOR SHARE;           -- 共享锁（8.0+）

-- PostgreSQL
SELECT * FROM orders WHERE id = 1 FOR UPDATE;           -- 排他锁
SELECT * FROM orders WHERE id = 1 FOR SHARE;            -- 共享锁
SELECT * FROM orders WHERE id = 1 FOR NO KEY UPDATE;    -- 不锁外键引用
SELECT * FROM orders WHERE id = 1 FOR KEY SHARE;        -- 仅锁外键引用

-- NOWAIT：不等待锁，立即报错
SELECT * FROM orders WHERE id = 1 FOR UPDATE NOWAIT;

-- SKIP LOCKED：跳过已锁定的行
SELECT * FROM orders WHERE id = 1 FOR UPDATE SKIP LOCKED;
```

### 3.3 SKIP LOCKED 实现任务队列

```sql
-- 高效的任务分发：跳过正在处理的任务
BEGIN;
SELECT task_id, payload
FROM task_queue
WHERE status = 'pending'
ORDER BY created_at
LIMIT 1
FOR UPDATE SKIP LOCKED;

-- 标记任务为处理中
UPDATE task_queue SET status = 'processing', worker_id = :worker
WHERE task_id = :id;
COMMIT;
```

**SKIP LOCKED 工作示意**：

```
任务队列: T1(locked) T2(pending) T3(locked) T4(pending) T5(pending)

Worker A: SELECT ... FOR UPDATE SKIP LOCKED → 获取 T2
Worker B: SELECT ... FOR UPDATE SKIP LOCKED → 跳过 T1,T3 → 获取 T4
Worker C: SELECT ... FOR UPDATE SKIP LOCKED → 跳过 T1,T3 → 获取 T5
```

### 3.4 悲观锁的适用场景

- **写多读少**：冲突概率高，提前加锁避免重试
- **长事务**：操作复杂，需要保证一致性
- **严格一致性**：如金融转账，不允许任何不一致
- **多表操作**：需要锁定关联数据

## 4. 乐观锁与悲观锁对比

### 4.1 核心差异

| 维度       | 乐观锁             | 悲观锁          |
| ---------- | ------------------ | --------------- |
| 冲突假设   | 冲突很少           | 冲突频繁        |
| 加锁时机   | 提交时检测         | 操作前加锁      |
| 读阻塞     | 不阻塞             | FOR UPDATE 阻塞 |
| 写阻塞     | 不阻塞（检测冲突） | 阻塞等待        |
| 死锁风险   | 无                 | 有              |
| 重试开销   | 冲突时需重试       | 无重试          |
| 实现复杂度 | 应用层处理重试     | 数据库原生支持  |

### 4.2 性能对比

```
并发度低（冲突率 < 5%）：
  乐观锁 ≈ 悲观锁（差异不大）

并发度中（冲突率 5-20%）：
  乐观锁 > 悲观锁（乐观锁吞吐量更高）

并发度高（冲突率 > 20%）：
  悲观锁 > 乐观锁（乐观锁大量重试导致性能下降）
```

### 4.3 混合策略

```sql
-- 先尝试乐观锁，失败后降级为悲观锁
-- 适用于大部分场景冲突率低但偶尔尖峰的情况

-- 第一轮：乐观锁尝试
UPDATE products
SET stock = stock - 1, version = version + 1
WHERE id = 1 AND version = :ver AND stock >= 1;

-- 如果影响行数为 0，降级为悲观锁
BEGIN;
SELECT stock, version FROM products WHERE id = 1 FOR UPDATE;
-- 检查条件后更新
UPDATE products SET stock = stock - 1, version = version + 1 WHERE id = 1;
COMMIT;
```

## 5. 实战：电商库存扣减

### 5.1 超卖问题

```sql
-- 错误：先查后改存在竞态条件
-- 事务A: SELECT stock FROM products WHERE id=1; -- stock=2
-- 事务B: SELECT stock FROM products WHERE id=1; -- stock=2
-- 事务A: UPDATE products SET stock=1 WHERE id=1;
-- 事务B: UPDATE products SET stock=1 WHERE id=1; -- 超卖！

-- 方案1：乐观锁（CAS）
UPDATE products SET stock = stock - 1 WHERE id = 1 AND stock >= 1;

-- 方案2：悲观锁
BEGIN;
SELECT stock FROM products WHERE id = 1 FOR UPDATE;
UPDATE products SET stock = stock - 1 WHERE id = 1 AND stock >= 1;
COMMIT;

-- 方案3：Redis 预扣 + 数据库最终一致
-- DECR stock:1  → 原子操作，返回值 < 0 则回滚
```

### 5.2 批量库存扣减

```sql
-- 乐观锁批量扣减
UPDATE products
SET stock = stock - CASE id
    WHEN 1 THEN 2
    WHEN 2 THEN 1
    WHEN 3 THEN 3
END,
version = version + 1
WHERE id IN (1, 2, 3)
  AND (id = 1 AND stock >= 2
    OR id = 2 AND stock >= 1
    OR id = 3 AND stock >= 3);
-- 检查影响行数是否等于 3
```
