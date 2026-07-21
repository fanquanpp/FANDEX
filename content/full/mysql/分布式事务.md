---
order: 72
title: 分布式事务
module: mysql
category: MySQL
difficulty: advanced
description: 'MySQL分布式事务：XA事务协议、两阶段提交、MySQL XA语法与跨库事务处理'
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/锁分类
  - mysql/死锁检测与处理
  - mysql/二进制日志
  - mysql/重做日志
prerequisites:
  - mysql/语法速查
---

## 1. XA 事务概述

XA 是 X/Open 组织定义的分布式事务处理标准，采用两阶段提交（2PC）协议。

### 1.1 核心角色

| 角色             | 说明                     |
| ---------------- | ------------------------ |
| AP（应用程序）   | 定义事务边界             |
| TM（事务管理器） | 协调分布式事务           |
| RM（资源管理器） | 管理具体资源（如数据库） |

### 1.2 两阶段提交

```
阶段1：Prepare
  TM → RM1: PREPARE
  TM → RM2: PREPARE
  RM1 → TM: OK
  RM2 → TM: OK

阶段2：Commit/Rollback
  TM → RM1: COMMIT
  TM → RM2: COMMIT
```

## 2. MySQL XA 语法

```sql
-- 开始 XA 事务
XA START 'xid_001';

-- 执行 SQL
UPDATE accounts SET balance = balance - 100 WHERE id = 1;

-- 结束事务（进入 PREPARED 状态）
XA END 'xid_001';

-- 第一阶段：准备
XA PREPARE 'xid_001';

-- 第二阶段：提交或回滚
XA COMMIT 'xid_001';
-- 或
XA ROLLBACK 'xid_001';
```

## 3. 跨库 XA 事务

```sql
-- 在两个数据库上执行 XA 事务
-- 数据库1
XA START 'transfer_001';
UPDATE db1.accounts SET balance = balance - 100 WHERE id = 1;
XA END 'transfer_001';
XA PREPARE 'transfer_001';

-- 数据库2
XA START 'transfer_001';
UPDATE db2.accounts SET balance = balance + 100 WHERE id = 2;
XA END 'transfer_001';
XA PREPARE 'transfer_001';

-- 两个都 PREPARE 成功后提交
-- 数据库1
XA COMMIT 'transfer_001';
-- 数据库2
XA COMMIT 'transfer_001';
```

## 4. 查看XA事务

```sql
-- 查看所有 XA 事务
XA RECOVER;

-- 查看特定状态的事务
XA RECOVER CONVERT XID;
```

## 5. XA 事务的限制

```sql
-- 1. 不支持嵌套 XA 事务
-- 2. XA 事务期间不能使用 SAVEPOINT
-- 3. 复制延迟：PREPARE 后 COMMIT 前的间隙
-- 4. 性能开销：两阶段提交增加网络往返
-- 5. 需要应用层协调 TM
```

## 6. 替代方案

```sql
-- 1. 本地消息表
-- 2. TCC（Try-Confirm-Cancel）
-- 3. Saga 模式
-- 4. Seata 等分布式事务框架
```
