---
order: 69
title: MVCC原理
module: mysql
category: MySQL
difficulty: advanced
description: 'MySQL InnoDB MVCC原理：隐藏列、Read View、undo log版本链与可见性判断算法'
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/JOIN算法
  - mysql/事务隔离级别底层实现
  - mysql/多表联查详解
  - mysql/锁分类
prerequisites:
  - mysql/语法速查
---

## 1. MVCC 基础组件

### 1.1 隐藏列

InnoDB 每行数据包含三个隐藏列：

| 列名        | 大小  | 用途                           |
| ----------- | ----- | ------------------------------ |
| DB_TRX_ID   | 6字节 | 最后修改该行的事务ID           |
| DB_ROLL_PTR | 7字节 | 回滚指针，指向 undo log 前版本 |
| DB_ROW_ID   | 6字节 | 隐藏自增ID（无主键时使用）     |

### 1.2 Undo Log 版本链

```
当前行：{data='Alice', trx_id=300, roll_ptr → undo_2}
                                           ↓
undo_2：{data='Bob', trx_id=200, roll_ptr → undo_1}
                                           ↓
undo_1：{data='Charlie', trx_id=100, roll_ptr → NULL}
```

每次 UPDATE 都在 undo log 中保留旧版本，形成版本链。

## 2. Read View

### 2.1 创建时机

| 隔离级别        | 创建时机                     |
| --------------- | ---------------------------- |
| READ COMMITTED  | 每次 SELECT 创建新 Read View |
| REPEATABLE READ | 事务首次 SELECT 创建，复用   |

### 2.2 核心字段

```
creator_trx_id：创建该 Read View 的事务ID
m_ids：创建时所有活跃（未提交）事务ID列表
min_trx_id：活跃事务最小ID
max_trx_id：下一个将分配的事务ID
```

## 3. 可见性判断

```
对于版本链中某版本的 trx_id：

if trx_id == creator_trx_id:
    → 可见（自己修改的）

if trx_id < min_trx_id:
    → 可见（事务在 Read View 创建前已提交）

if trx_id >= max_trx_id:
    → 不可见（事务在 Read View 创建后才开始）

if min_trx_id <= trx_id < max_trx_id:
    if trx_id in m_ids:
        → 不可见（事务未提交）
    else:
        → 可见（事务已提交）
```

## 4. 版本遍历

```
1. 读取当前行的 trx_id
2. 判断当前版本是否可见
3. 可见 → 返回该版本数据
4. 不可见 → 沿 roll_ptr 找到上一个版本
5. 重复步骤2-4
6. 版本链遍历完仍不可见 → 该行对当前事务不可见
```

## 5. 快照读 vs 当前读

```sql
-- 快照读：使用 MVCC
SELECT * FROM t WHERE id = 1;

-- 当前读：读取最新数据 + 加锁
SELECT * FROM t WHERE id = 1 FOR UPDATE;
SELECT * FROM t WHERE id = 1 LOCK IN SHARE MODE;
UPDATE t SET col = val WHERE id = 1;
DELETE FROM t WHERE id = 1;
```

## 6. Purge 机制

```
Purge 线程负责清理不再需要的 undo log：
1. 检查某版本是否对所有活跃事务都不可见
2. 如果是，该版本可以安全清理
3. 长事务会阻止 Purge，导致 undo log 膨胀
```
