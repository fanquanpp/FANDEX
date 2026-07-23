---
order: 100
title: MVCC快照读与当前读
module: mysql
category: database
difficulty: advanced
description: 'MySQL InnoDB MVCC 机制详解：快照读与当前读的区别、ReadView 创建时机、Undo Log 版本链与一致性非锁定读原理。'
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/函数索引
  - mysql/存储过程与函数
  - mysql/索引原理与性能优化
  - mysql/触发器与事件
prerequisites:
  - mysql/语法速查
---

## 1. MVCC 基础概念

### 1.1 什么是 MVCC

MVCC（Multi-Version Concurrency Control，多版本并发控制）是 InnoDB 实现高并发读写的核心机制。其核心思想是：**读不阻塞写，写不阻塞读**。

```
传统锁机制：读 → 加共享锁 → 阻塞写
MVCC机制：  读 → 访问历史版本 → 不阻塞写
```

### 1.2 MVCC 的核心组件

| 组件            | 作用                                             |
| --------------- | ------------------------------------------------ |
| 隐藏列          | `DB_TRX_ID`（事务ID）、`DB_ROLL_PTR`（回滚指针） |
| Undo Log 版本链 | 通过 `DB_ROLL_PTR` 串联的历史版本                |
| ReadView        | 决定当前事务能看到哪个版本                       |

### 1.3 隐藏列结构

每行数据包含两个隐藏列：

```
┌──────────┬───────────┬──────────────┬─────────────┐
│ 数据列    │ DB_TRX_ID │ DB_ROLL_PTR  │ DB_ROW_ID   │
│ (用户数据) │ (6字节)   │ (7字节)      │ (6字节)     │
└──────────┴───────────┴──────────────┴─────────────┘

DB_TRX_ID:  最后修改该行的事务ID
DB_ROLL_PTR: 指向 Undo Log 中该行的上一个版本
DB_ROW_ID:  隐藏自增ID（无主键时自动生成）
```

## 2. Undo Log 版本链

### 2.1 版本链构建

当一行数据被多次修改时，每次修改前的旧版本通过 `DB_ROLL_PTR` 串联成链表：

```
当前行: {data='C', trx_id=303, roll_ptr→undo_C}
                                         ↓
Undo版本: {data='B', trx_id=202, roll_ptr→undo_B}
                                         ↓
Undo版本: {data='A', trx_id=101, roll_ptr→NULL}
```

### 2.2 版本链遍历

当事务需要读取数据时，从当前行开始沿版本链向前遍历，找到第一个对当前事务可见的版本。

## 3. ReadView 机制

### 3.1 ReadView 结构

ReadView 是事务进行快照读时创建的"可见性判断规则"，包含四个关键字段：

```
ReadView {
    m_ids:        [201, 302]          -- 创建时所有活跃（未提交）事务ID列表
    min_trx_id:   201                 -- m_ids 中的最小值
    max_trx_id:   401                 -- 下一个将分配的事务ID（当前最大事务ID+1）
    creator_trx_id: 303               -- 创建该 ReadView 的事务ID
}
```

### 3.2 可见性判断规则

对于版本链中某个版本的 `trx_id`：

```
1. trx_id == creator_trx_id → 可见（自己修改的）
2. trx_id < min_trx_id      → 可见（该事务在 ReadView 创建前已提交）
3. trx_id >= max_trx_id     → 不可见（该事务在 ReadView 创建后才开始）
4. min_trx_id <= trx_id < max_trx_id:
   - trx_id 在 m_ids 中 → 不可见（该事务未提交）
   - trx_id 不在 m_ids 中 → 可见（该事务已提交）
```

### 3.3 可见性判断流程图

```
                    trx_id == creator_trx_id?
                    /                    \
                  YES                    NO
                  ↓                       ↓
               可见              trx_id < min_trx_id?
                                /                \
                              YES                NO
                              ↓                  ↓
                            可见        trx_id >= max_trx_id?
                                      /                \
                                    YES                NO
                                    ↓                  ↓
                                 不可见       trx_id ∈ m_ids?
                                            /          \
                                          YES          NO
                                          ↓            ↓
                                        不可见        可见
```

## 4. 快照读与当前读

### 4.1 快照读（Snapshot Read）

快照读读取的是数据的**历史版本**，不加锁，通过 MVCC 实现：

```sql
-- 普通 SELECT 都是快照读
SELECT * FROM users WHERE id = 1;
```

**RC 隔离级别**：每次 SELECT 都创建新的 ReadView

```
事务A (trx_id=300):
  SELECT * FROM users WHERE id=1;  -- 创建 ReadView_1
  -- 此时事务B修改了 id=1 并提交
  SELECT * FROM users WHERE id=1;  -- 创建 ReadView_2，能看到事务B的修改
```

**RR 隔离级别**：只在第一次 SELECT 时创建 ReadView，后续复用

```
事务A (trx_id=300):
  SELECT * FROM users WHERE id=1;  -- 创建 ReadView_1
  -- 此时事务B修改了 id=1 并提交
  SELECT * FROM users WHERE id=1;  -- 复用 ReadView_1，看不到事务B的修改
```

### 4.2 当前读（Current Read）

当前读读取的是数据的**最新版本**，并加锁：

```sql
-- 当前读语句
SELECT * FROM users WHERE id = 1 FOR UPDATE;      -- 排他锁
SELECT * FROM users WHERE id = 1 LOCK IN SHARE MODE; -- 共享锁
UPDATE users SET name = 'new' WHERE id = 1;        -- 排他锁
DELETE FROM users WHERE id = 1;                     -- 排他锁
INSERT INTO users VALUES (1, 'new');                -- 插入锁
```

### 4.3 快照读与当前读对比

| 维度     | 快照读      | 当前读           |
| -------- | ----------- | ---------------- |
| 读取版本 | 历史版本    | 最新版本         |
| 加锁     | 不加锁      | 加行锁/间隙锁    |
| ReadView | 创建/复用   | 不使用           |
| 语句     | 普通 SELECT | FOR UPDATE / DML |
| 一致性   | 一致性视图  | 实时数据         |

### 4.4 快照读与当前读混合的陷阱

```sql
-- RR 隔离级别下的经典问题
BEGIN;
-- 快照读：读取 stock=10
SELECT stock FROM products WHERE id=1;  -- stock=10

-- 当前读：读取最新 stock
SELECT stock FROM products WHERE id=1 FOR UPDATE;  -- stock=8（已被其他事务修改）

-- 快照读：仍然读取旧值
SELECT stock FROM products WHERE id=1;  -- stock=10（ReadView 未更新）

-- UPDATE 是当前读，基于最新版本
UPDATE products SET stock = stock - 1 WHERE id=1;  -- 基于 stock=8

COMMIT;
```

## 5. 不同隔离级别的 MVCC 行为

### 5.1 READ UNCOMMITTED

不使用 MVCC，直接读取最新数据（可能读到未提交数据）。

### 5.2 READ COMMITTED

每次 SELECT 创建新 ReadView：

```
时间线:  T1        T2        T3        T4
事务A:   BEGIN     SELECT→RV1           SELECT→RV2
事务B:             BEGIN     UPDATE    COMMIT

T2: SELECT 创建 RV1，看到事务B修改前的数据
T4: SELECT 创建 RV2，看到事务B已提交的修改
```

### 5.3 REPEATABLE READ

只在第一次 SELECT 创建 ReadView，后续复用：

```
时间线:  T1        T2        T3        T4
事务A:   BEGIN     SELECT→RV1           SELECT(复用RV1)
事务B:             BEGIN     UPDATE    COMMIT

T2: SELECT 创建 RV1
T4: SELECT 复用 RV1，仍然看到事务B修改前的数据
```

### 5.4 SERIALIZABLE

所有 SELECT 自动加共享锁，退化为当前读，不存在快照读。
