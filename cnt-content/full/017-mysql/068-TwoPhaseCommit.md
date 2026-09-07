---
order: 680
title: 两阶段提交
module: 'mysql'
category: 数据库
difficulty: advanced
description: MySQL InnoDB 两阶段提交（2PC）机制详解：保证 Redo Log 与 Binlog 一致性、崩溃恢复流程与XA事务。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'mysql/066-TriggerEvent'
  - 'mysql/067-RedoUndoBinlogWriteTiming'
  - 'mysql/069-GapLockNextKeyLockSolutionPhantomRead'
  - 'mysql/070-ReplicationDelayCauseSolution'
prerequisites:
  - 'mysql/089-View'
---


## 1. 两阶段提交的必要性

### 1.1 问题背景

InnoDB 的 Redo Log 和 Server 层的 Binlog 是两个独立的日志系统。如果不协调写入顺序，崩溃后会导致数据不一致：

```
主库执行: UPDATE accounts SET balance = balance - 100 WHERE id = 1;

情况1: Redo Log 写入成功，Binlog 未写入 → 主库已扣款，从库未扣款
情况2: Binlog 写入成功，Redo Log 未写入 → 主库未扣款，从库已扣款
```

### 1.2 两阶段提交方案

将事务提交分为 **Prepare** 和 **Commit** 两个阶段，中间插入 Binlog 写入：

```
阶段1 (Prepare):  写 Redo Log，标记为 prepare 状态
阶段间:           写 Binlog
阶段2 (Commit):   写 Redo Log，标记为 commit 状态
```

## 2. 两阶段提交流程

### 2.1 详细执行步骤

```mermaid
flowchart TD
    subgraph Exec[事务执行阶段]
        E1[1. 执行 SQL，修改数据页 Buffer Pool]
        E2[2. 生成 Undo Log 写入 Undo Tablespace]
        E3[3. 生成 Redo Record 写入 Redo Log Buffer]
    end
    subgraph Prep[Prepare 阶段]
        P1[4. 将 Redo Log Buffer 刷盘 fsync]
        P2[5. Redo Log 中标记事务为 XA_PREPARE]
        P3[6. 持有行锁，事务对外不可见]
    end
    subgraph Bin[Binlog 写入阶段]
        B1[7. 将 Binlog Cache 写入 Binlog File]
        B2[8. 根据 sync_binlog 设置决定是否 fsync]
    end
    subgraph Com[Commit 阶段]
        C1[9. 写 Redo Log commit 标记]
        C2[10. 释放行锁，事务对外可见]
        C3[11. 释放 Undo Log 标记为可清理]
    end
    Exec --> Prep --> Bin --> Com
```

### 2.2 组提交优化

多个事务同时提交时，可以合并 fsync 操作：

```mermaid
flowchart LR
    A[事务A] --> F[Flush Stage 一次fsync]
    B[事务B] --> F
    C[事务C] --> F
    F --> S[Sync Stage 一次fsync]
    S --> K[Commit Stage 顺序commit]
```

阶段1（Flush）：多个事务的 Redo Log 一起 fsync；阶段2（Sync）：多个事务的 Binlog 一起 fsync；阶段3（Commit）：依次标记 commit

## 3. 崩溃恢复

### 3.1 恢复流程

MySQL 重启时，InnoDB 扫描 Redo Log 进行崩溃恢复：

```
1. 从 Checkpoint 点开始扫描 Redo Log
2. 重做（Redo）：重放所有已提交事务的修改
3. 回滚（Undo）：撤销所有未提交事务的修改
4. 处理 XA PREPARE 状态的事务：
   a. 检查 Binlog 中是否有该事务的记录
   b. 有 → 提交事务（commit）
   c. 无 → 回滚事务（rollback）
```

### 3.2 各种崩溃场景分析

| 崩溃时机                  | Redo Log 状态 | Binlog 状态 | 恢复动作         |
| ------------------------- | ------------- | ----------- | ---------------- |
| Prepare 之前              | 无记录        | 无记录      | 无需恢复         |
| Prepare 之后、Binlog 之前 | prepare       | 无记录      | 回滚事务         |
| Binlog 之后、Commit 之前  | prepare       | 有记录      | 提交事务         |
| Commit 之后               | commit        | 有记录      | 已完成，无需处理 |

### 3.3 Binlog 完整性判断

```sql
-- MySQL 通过 XID（事务ID）匹配 Redo Log 和 Binlog
-- 每个 Binlog 事务组以 XID event 结尾

-- Binlog 中的事务格式：
-- BEGIN
-- ... (行变更事件)
-- XID 12345  ← 事务标识

-- 恢复时：在 Binlog 中查找 XID=12345
-- 找到 → 事务完整，提交
-- 找不到 → 事务不完整，回滚
```

## 4. XA 事务

### 4.1 外部 XA 事务

MySQL 支持 X/Open XA 规范，实现跨数据库的分布式事务：

```sql
-- XA 事务语法
XA START 'txn1';
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
XA END 'txn1';
XA PREPARE 'txn1';   -- 第一阶段：准备
-- 此时可以查询事务状态
XA RECOVER;
XA COMMIT 'txn1';    -- 第二阶段：提交
-- 或 XA ROLLBACK 'txn1';  -- 第二阶段：回滚
```

### 4.2 XA 事务状态机

```
START → END → PREPARE → COMMIT
                ↓
            ROLLBACK

状态: ACTIVE → IDLE → PREPARED → COMMITTED
                              → ROLLED_BACK
```

### 4.3 XA 事务的注意事项

- **悬挂事务**：PREPARE 后未 COMMIT 也未 ROLLBACK，占用锁资源
- **超时处理**：`xa_wait_timeout` 控制等待时间
- **监控**：定期执行 `XA RECOVER` 检查悬挂事务

```sql
-- 查看悬挂事务
XA RECOVER;

-- 手动回滚悬挂事务
XA ROLLBACK 'txn1';
```

## 5. 半同步复制与两阶段提交

### 5.1 半同步复制对两阶段提交的影响

```
异步复制:    主库提交 → 返回客户端 → 从库异步拉取 Binlog
半同步复制:  主库提交 → 等待至少1个从库确认收到 Binlog → 返回客户端
```

半同步复制在 Binlog 写入后增加了一个等待步骤：

```
Prepare → Binlog → 等待从库ACK → Commit
```

### 5.2 After Sync vs After Commit

| 模式         | 等待时机                 | 数据安全           | 性能 |
| ------------ | ------------------------ | ------------------ | ---- |
| After Sync   | Binlog 写入后、Commit 前 | 主库崩溃不丢数据   | 较好 |
| After Commit | Commit 后                | 主库崩溃可能丢数据 | 较差 |

```sql
-- MySQL 5.7+ 默认 After Sync
SET GLOBAL rpl_semi_sync_master_wait_point = AFTER_SYNC;
```

### 5.3 After Sync 的优势

```
After Sync 流程:
1. Prepare
2. 写 Binlog
3. 等待从库 ACK  ← 在 Commit 之前
4. Commit

如果主库在步骤3后崩溃：
- 从库已收到 Binlog → 从库会提交
- 主库未 Commit → 恢复时检查 Binlog 完整 → 提交
- 数据一致！
```
