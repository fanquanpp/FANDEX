---
order: 70
title: 锁分类
module: mysql
category: MySQL
difficulty: advanced
description: 'MySQL InnoDB锁分类：全局锁、表级锁、元数据锁、意向锁、行锁、间隙锁、临键锁、插入意向锁'
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/MVCC原理
  - mysql/多表联查详解
  - mysql/死锁检测与处理
  - mysql/分布式事务
prerequisites:
  - mysql/语法速查
---

## 1. 锁分类总览

```
MySQL 锁
├── 全局锁
├── 表级锁
│   ├── 表锁（READ/WRITE）
│   ├── 元数据锁（MDL）
│   └── 意向锁（IS/IX）
├── 行级锁
│   ├── 记录锁（Record Lock）
│   ├── 间隙锁（Gap Lock）
│   ├── 临键锁（Next-Key Lock）
│   └── 插入意向锁（Insert Intention Lock）
└── 自增锁（AUTO-INC Lock）
```

## 2. 全局锁

```sql
-- 全局读锁（用于备份）
FLUSH TABLES WITH READ LOCK;

-- 备份
mysqldump --single-transaction mydb > backup.sql

-- 释放
UNLOCK TABLES;
```

## 3. 表级锁

### 3.1 表锁

```sql
LOCK TABLES employees READ;       -- 读锁
LOCK TABLES employees WRITE;      -- 写锁
UNLOCK TABLES;
```

### 3.2 元数据锁（MDL）

```sql
-- MDL 自动获取，防止 DDL 与 DML 冲突
-- SELECT → MDL 读锁
-- ALTER → MDL 写锁

-- 长事务阻塞 DDL
-- 事务A: BEGIN; SELECT * FROM t;  -- 持有 MDL 读锁
-- 事务B: ALTER TABLE t ADD COLUMN ...;  -- 等待 MDL 写锁
-- 事务C: SELECT * FROM t;  -- 等待事务B的 MDL 写锁！

-- 查看MDL等待
SELECT * FROM performance_schema.metadata_locks;
```

### 3.3 意向锁

```sql
-- 行级锁的前置声明，快速检测表级锁冲突
-- IS：打算加行级S锁
-- IX：打算加行级X锁

-- 兼容性：
-- IS-IS , IS-IX , IS-S , IS-X
-- IX-IX , IX-S , IX-X
```

## 4. 行级锁

### 4.1 记录锁（Record Lock）

```sql
-- 锁定索引记录
SELECT * FROM t WHERE id = 5 FOR UPDATE;
-- 锁定 id=5 的索引记录
```

### 4.2 间隙锁（Gap Lock）

```sql
-- 锁定索引记录之间的间隙
SELECT * FROM t WHERE id BETWEEN 5 AND 10 FOR UPDATE;
-- 锁定 (5, 10) 间隙，阻止插入 id=6,7,8,9

-- 间隙锁之间不冲突
-- 间隙锁与插入意向锁冲突
```

### 4.3 临键锁（Next-Key Lock）

```sql
-- 记录锁 + 间隙锁
-- InnoDB 在 REPEATABLE READ 下的默认行锁算法

-- 退化为记录锁：唯一索引等值查询且记录存在
SELECT * FROM t WHERE id = 5 FOR UPDATE;  -- id 是主键，存在
-- 只锁 id=5 行

-- 退化为间隙锁：唯一索引等值查询但记录不存在
SELECT * FROM t WHERE id = 5 FOR UPDATE;  -- id=5 不存在
-- 锁 (prev, next) 间隙
```

### 4.4 插入意向锁

```sql
-- INSERT 操作在插入前获取插入意向锁
-- 是一种特殊的间隙锁，不阻止其他插入意向锁
-- 只与间隙锁冲突

-- 多个事务向同一间隙的不同位置插入不冲突
INSERT INTO t VALUES (6, ...);  -- 事务A
INSERT INTO t VALUES (7, ...);  -- 事务B
-- 不冲突
```

## 5. 自增锁

```sql
-- AUTO-INC 锁模式
-- innodb_autoinc_lock_mode = 0：传统模式（每次INSERT加表级锁）
-- innodb_autoinc_lock_mode = 1：连续模式（批量INSERT加锁，单行轻量锁）
-- innodb_autoinc_lock_mode = 2：交叉模式（无锁，最高并发，主从不安全）

SET GLOBAL innodb_autoinc_lock_mode = 2;
```

## 6. 查看锁信息

```sql
-- MySQL 8.0+
SELECT * FROM performance_schema.data_locks;
SELECT * FROM performance_schema.data_lock_waits;

-- 查看锁等待
SELECT
    waiting.pid AS waiting_pid,
    blocking.pid AS blocking_pid,
    waiting.sql_text AS waiting_query,
    blocking.sql_text AS blocking_query
FROM performance_schema.data_lock_waits w
JOIN performance_schema.events_statements_current waiting
    ON w.THREAD_ID = waiting.THREAD_ID
JOIN performance_schema.events_statements_current blocking
    ON w.BLOCKING_THREAD_ID = blocking.THREAD_ID;
```
