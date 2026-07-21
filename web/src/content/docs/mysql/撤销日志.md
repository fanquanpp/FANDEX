---
order: 75
title: 撤销日志
module: mysql
category: MySQL
difficulty: advanced
description: 'MySQL InnoDB撤销日志undo log：版本链、回滚段、MVCC支持与Purge机制'
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/二进制日志
  - mysql/重做日志
  - mysql/日志系统
  - mysql/逻辑备份
prerequisites:
  - mysql/语法速查
---

## 1. undo log 概述

撤销日志（Undo Log）记录数据修改前的旧值，用于事务回滚和 MVCC 快照读。

### 1.1 两大功能

| 功能     | 说明                    |
| -------- | ----------------------- |
| 事务回滚 | ROLLBACK 时恢复原始数据 |
| MVCC     | 提供历史版本供快照读    |

## 2. 版本链

```
当前行：{data='Alice', trx_id=300, roll_ptr → undo_2}
                                           ↓
undo_2：{data='Bob', trx_id=200, roll_ptr → undo_1}
                                           ↓
undo_1：{data='Charlie', trx_id=100, roll_ptr → NULL}
```

```sql
-- INSERT：生成 INSERT undo log（事务提交后可立即清理）
-- UPDATE：生成 UPDATE undo log（需要保留给 MVCC）
-- DELETE：生成 DELETE undo log（标记删除，需要保留给 MVCC）
```

## 3. 回滚段

```sql
-- InnoDB 使用回滚段（Rollback Segment）管理 undo log
-- 每个回滚段包含 1024 个 undo slot

-- MySQL 8.0 默认 128 个回滚段
SET GLOBAL innodb_rollback_segments = 128;

-- undo log 表空间
-- MySQL 8.0 默认使用独立 undo 表空间
SET GLOBAL innodb_undo_tablespaces = 2;
SET GLOBAL innodb_max_undo_log_size = 1073741824;  -- 1GB
```

## 4. Purge 机制

```
Purge 线程负责清理不再需要的 undo log：
1. 检查 undo log 是否对所有活跃事务都不可见
2. 如果是，可以安全清理
3. 同时清理标记为删除的行

长事务会阻止 Purge，导致 undo log 膨胀
```

```sql
-- 查看 undo log 状态
SHOW ENGINE INNODB STATUS;

-- 查看历史版本长度
SELECT COUNT(*) FROM information_schema.innodb_trx;
-- 如果 History list length 持续增长，说明 Purge 跟不上
```

## 5. 性能调优

```sql
-- 加速 Purge
SET GLOBAL innodb_purge_batch_size = 300;  -- 每次 Purge 批量大小

-- 独立 undo 表空间（在线收缩）
SET GLOBAL innodb_undo_log_truncate = ON;
SET GLOBAL innodb_max_undo_log_size = 1073741824;
```
