---
order: 71
title: 死锁检测与处理
module: mysql
category: MySQL
difficulty: advanced
description: 'MySQL InnoDB死锁检测与处理：死锁检测算法、死锁日志分析、预防策略与自动恢复'
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/多表联查详解
  - mysql/锁分类
  - mysql/分布式事务
  - mysql/二进制日志
prerequisites:
  - mysql/语法速查
---

## 1. 死锁检测

### 1.1 自动检测

InnoDB 自动检测死锁，并回滚代价最小的事务：

```sql
-- 默认开启
SET GLOBAL innodb_deadlock_detect = ON;

-- 死锁发生时，被回滚的事务收到错误
-- ERROR 1213 (40001): Deadlock found when trying to get lock;
-- try restarting transaction
```

### 1.2 等图（Wait-for Graph）

InnoDB 使用等图检测死锁：如果图中存在环，则存在死锁。

```
事务A 等待 事务B 持有的锁
事务B 等待 事务A 持有的锁
→ 形成环 → 死锁
```

## 2. 死锁日志

```sql
-- 查看最近一次死锁信息
SHOW ENGINE INNODB STATUS;

-- 死锁日志示例：
-- LATEST DETECTED DEADLOCK
-- ------------------------
-- 2026-06-14 10:30:00
-- *** (1) TRANSACTION:
-- TRANSACTION 12345, ACTIVE 2 sec starting index read
-- mysql tables in use 1, locked 1
-- LOCK WAIT 2 lock struct(s), heap size 1136, 1 row lock(s)
-- MySQL thread id 10, OS thread handle 12345, query id 100 localhost root updating
-- UPDATE accounts SET balance = balance - 100 WHERE id = 1
-- *** (1) WAITING FOR THIS LOCK TO BE GRANTED:
-- RECORD LOCKS space id 58 page no 4 n bits 72 index PRIMARY of table `mydb`.`accounts`
-- *** (2) TRANSACTION:
-- TRANSACTION 12346, ACTIVE 1 sec starting index read
-- mysql tables in use 1, locked 1
-- 3 lock struct(s), heap size 1136, 2 row lock(s)
-- MySQL thread id 11, OS thread handle 12346, query id 101 localhost root updating
-- UPDATE accounts SET balance = balance - 100 WHERE id = 2
-- *** (2) HOLDS THE LOCK(S):
-- RECORD LOCKS ... index PRIMARY of table `mydb`.`accounts` trx id 12346 lock_mode X locks rec but not gap
-- *** (2) WAITING FOR THIS LOCK TO BE GRANTED:
-- RECORD LOCKS ... index PRIMARY of table `mydb`.`accounts` trx id 12346 lock_mode X locks rec but not gap
-- *** WE ROLL BACK TRANSACTION (2)
```

## 3. 死锁预防

### 3.1 固定顺序访问

```sql
-- 所有事务按 id 升序访问
-- 事务A：先锁 id=1，再锁 id=2
-- 事务B：先锁 id=1，再锁 id=2
-- 不会形成环
```

### 3.2 缩短事务

```sql
-- 减少锁持有时间
BEGIN;
-- 只包含必要的操作
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

### 3.3 降低隔离级别

```sql
-- READ COMMITTED 比 REPEATABLE READ 锁范围更小
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

### 3.4 添加合适索引

```sql
-- 无索引时，InnoDB 锁定全表
-- 有索引时，只锁定匹配行
CREATE INDEX idx_accounts_id ON accounts(id);
```

## 4. 死锁恢复

```sql
-- 应用层重试
-- 捕获 1213 错误，自动重试
-- 建议重试3-5次

-- 设置锁等待超时
SET innodb_lock_wait_timeout = 5;  -- 5秒超时

-- 关闭死锁检测（高并发场景，降低检测开销）
SET GLOBAL innodb_deadlock_detect = OFF;
-- 此时依赖 innodb_lock_wait_timeout 超时回滚
```
