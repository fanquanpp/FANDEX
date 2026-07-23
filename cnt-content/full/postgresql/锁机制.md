---
order: 51
title: 锁机制
module: postgresql
category: PostgreSQL
difficulty: advanced
description: PostgreSQL锁机制：表级锁、行级锁、advisory锁的语法、兼容性与死锁处理
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/语法速查
  - postgresql/体系架构
  - postgresql/死锁检测与处理
  - postgresql/VACUUM机制
prerequisites:
  - postgresql/概述与安装配置
---

## 1. 表级锁

### 1.1 锁模式

| 锁模式                 | SQL 语句                | 冲突范围                                                                                                  |
| ---------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------- |
| ACCESS SHARE           | SELECT                  | ACCESS EXCLUSIVE                                                                                          |
| ROW SHARE              | SELECT FOR UPDATE/SHARE | EXCLUSIVE, ACCESS EXCLUSIVE                                                                               |
| ROW EXCLUSIVE          | UPDATE, DELETE, INSERT  | SHARE, SHARE ROW EXCLUSIVE, EXCLUSIVE, ACCESS EXCLUSIVE                                                   |
| SHARE UPDATE EXCLUSIVE | VACUUM, ALTER INDEX     | SHARE UPDATE EXCLUSIVE, SHARE, SHARE ROW EXCLUSIVE, EXCLUSIVE, ACCESS EXCLUSIVE                           |
| SHARE                  | CREATE INDEX            | ROW EXCLUSIVE, SHARE UPDATE EXCLUSIVE, SHARE ROW EXCLUSIVE, EXCLUSIVE, ACCESS EXCLUSIVE                   |
| SHARE ROW EXCLUSIVE    | —                       | ROW EXCLUSIVE, SHARE UPDATE EXCLUSIVE, SHARE, SHARE ROW EXCLUSIVE, EXCLUSIVE, ACCESS EXCLUSIVE            |
| EXCLUSIVE              | —                       | ROW SHARE, ROW EXCLUSIVE, SHARE UPDATE EXCLUSIVE, SHARE, SHARE ROW EXCLUSIVE, EXCLUSIVE, ACCESS EXCLUSIVE |
| ACCESS EXCLUSIVE       | ALTER TABLE, DROP TABLE | 所有模式                                                                                                  |

```sql
-- 手动获取表锁
LOCK TABLE employees IN ACCESS EXCLUSIVE MODE;
```

## 2. 行级锁

### 2.1 行锁类型

| 锁类型            | 语法                         | 说明     |
| ----------------- | ---------------------------- | -------- |
| FOR UPDATE        | SELECT ... FOR UPDATE        | 排他行锁 |
| FOR NO KEY UPDATE | SELECT ... FOR NO KEY UPDATE | 弱排他锁 |
| FOR SHARE         | SELECT ... FOR SHARE         | 共享行锁 |
| FOR KEY SHARE     | SELECT ... FOR KEY SHARE     | 弱共享锁 |

### 2.2 行锁兼容性

|               | KEY SHARE | SHARE | NO KEY UPDATE | UPDATE |
| ------------- | --------- | ----- | ------------- | ------ |
| KEY SHARE     |           |       |               |        |
| SHARE         |           |       |               |        |
| NO KEY UPDATE |           |       |               |        |
| UPDATE        |           |       |               |        |

```sql
-- 行锁示例
BEGIN;
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;
```

## 3. Advisory 锁

```sql
-- 获取 advisory 锁
SELECT pg_advisory_lock(12345);          -- 阻塞式
SELECT pg_try_advisory_lock(12345);      -- 非阻塞式

-- 释放
SELECT pg_advisory_unlock(12345);

-- 会话级锁（连接断开自动释放）
SELECT pg_advisory_lock(1, 2);  -- 双int参数

-- 事务级锁（事务结束自动释放）
SELECT pg_advisory_xact_lock(12345);
```

## 4. 查看锁

```sql
SELECT locktype, relation::regclass, mode, pid, granted
FROM pg_locks
WHERE pid != pg_backend_pid();

-- 查看阻塞
SELECT blocked.pid, blocker.pid, blocked.query, blocker.query
FROM pg_locks blocked
JOIN pg_locks blocker ON blocked.locktype = blocker.locktype
    AND blocked.database IS NOT DISTINCT FROM blocker.database
    AND blocked.relation IS NOT DISTINCT FROM blocker.relation
    AND NOT blocked.granted AND blocker.granted
    AND blocked.pid != blocker.pid;
```
