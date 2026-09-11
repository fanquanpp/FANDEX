---
order: 420
title: 事务隔离级别底层实现
module: 'mysql'
category: 数据库
difficulty: advanced
description: MySQL InnoDB隔离级别底层实现：MVCC快照读与锁当前读的分工、Read View可见性、RC/RR/SERIALIZABLE差异与幻读处理
author: fanquanpp
updated: '2026-09-12'
related:
  - 'mysql/430-MVCCPrinciple'
  - 'mysql/440-MVCCSnapshotCurrentRead'
  - 'mysql/450-LockClassification'
  - 'mysql/470-GapLockNextKeyLockSolutionPhantomRead'
prerequisites:
  - 'mysql/430-MVCCPrinciple'
---

## 1. 核心机制：MVCC 与锁的分工

InnoDB 实现隔离级别只用两套武器，按「读法」分工：

| 读法                     | 实现方式                 | 隔离能力来源           |
| ------------------------ | ------------------------ | ---------------------- |
| 快照读（普通 SELECT）    | MVCC + Read View 版本链  | 读不加锁，读历史版本   |
| 当前读（FOR UPDATE 等）  | 记录锁 / Next-Key Lock   | 读最新版本并加锁       |

| 隔离级别        | 快照读实现                  | 当前读实现              |
| --------------- | --------------------------- | ----------------------- |
| READ COMMITTED  | 每次 SELECT 新建 Read View  | 记录锁（无间隙锁）      |
| REPEATABLE READ | 首次快照读的 Read View 复用 | Next-Key Lock           |
| SERIALIZABLE    | 退化为当前读（SELECT 加锁） | Next-Key Lock           |

## 2. READ COMMITTED（RC）实现

### 2.1 快照读：每次 SELECT 重新拍照

```sql
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
BEGIN;
SELECT * FROM accounts WHERE id = 1;   -- Read View V1，看到 balance=100
-- 此刻另一个事务提交了 UPDATE balance = 200
SELECT * FROM accounts WHERE id = 1;   -- 新建 Read View V2，看到 200
COMMIT;
-- 同一事务内两次读结果不同（不可重复读）——这正是 RC 的语义
```

### 2.2 当前读：只锁记录，不锁间隙

```sql
BEGIN;
SELECT * FROM t WHERE id > 5 FOR UPDATE;
-- RC 下只有记录锁：锁定"此刻已存在"的 id>5 的行
-- 其他事务仍可插入 id=6 的新行，且插入后立即可被其他事务读到
COMMIT;
```

RC 的两个工程细节：

1. **半一致性读（semi-consistent read）**：UPDATE 遇到被其他事务锁住的行时，
   可以先读取最新已提交版本判断 WHERE 是否命中，未命中的行不必等锁，
   显著减少锁冲突——这是很多互联网公司将默认级别改为 RC 的主因；
2. **间隙锁大部分场景被禁用**，但在**外键检查与唯一键冲突检查**时仍会加
   间隙/插入意向锁，死锁分析时不要想当然。

## 3. REPEATABLE READ（RR，InnoDB 默认）实现

### 3.1 快照读：事务内一张照片用到底

```sql
-- 默认级别
BEGIN;
SELECT * FROM accounts WHERE id = 1;   -- 首次快照读：创建 Read View
-- 另一个事务提交 UPDATE balance = 200，甚至插入/删除了其他行
SELECT * FROM accounts WHERE id = 1;   -- 复用 Read View，仍看到 100
COMMIT;
```

两个高频误区：

1. **Read View 在首个快照读时创建，不是 BEGIN 时**。想从严控制一致性起点：

   ```sql
   START TRANSACTION WITH CONSISTENT SNAPSHOT;  -- 建事务时立刻拍快照
   ```

2. **自己未提交的修改永远可见**：可见性判断中 `trx_id == creator_trx_id` 优先，
   所以 RR 下不 commit 也能看到自己刚 UPDATE 的行。

### 3.2 当前读：Next-Key Lock 封死插入位

```sql
BEGIN;
SELECT * FROM t WHERE id > 5 FOR UPDATE;
-- InnoDB(默认 RR) 对索引记录加记录锁，并对记录之前的间隙加间隙锁（合称 Next-Key Lock）
-- 其他事务无法插入 id>5 区间的新行 → 当前读视角下不出现幻影行
COMMIT;
```

### 3.3 RR 到底有没有幻读？——分场景回答

```sql
-- 场景 A：纯快照读 → 无幻读（MVCC 保证事务内看到一致的快照）
-- 场景 B：纯当前读 → 无幻读（Next-Key Lock 阻止他人插入）
-- 场景 C：先快照读、后当前读 → 幻读复现！

-- 事务 A
BEGIN;
SELECT * FROM t WHERE id = 10;             -- 快照读：不存在（0 行）
-- 事务 B：INSERT INTO t VALUES (10); COMMIT;
SELECT * FROM t WHERE id = 10 FOR UPDATE;  -- 当前读：读到了！事务 B 的行
```

场景 C 中「第一次读说没有、FOR UPDATE 又读到了」就是幻读。根因是：
**RR 的"一致性"只对快照读成立，一旦切换到当前读，读到的是最新版本**。
这也是「先查后插」业务逻辑（检查再写入）在 RR 下仍然要靠唯一约束兜底的原因。

## 4. SERIALIZABLE 实现

```sql
SET SESSION TRANSACTION ISOLATION LEVEL SERIALIZABLE;
BEGIN;
SELECT * FROM t WHERE id = 1;  -- 普通 SELECT 自动升级为当前读
-- 等价于：SELECT ... FOR SHARE（8.0 新语法）
-- 旧语法 LOCK IN SHARE MODE 自 8.0.20 起废弃，两者等价
COMMIT;
```

例外：`autocommit=1` 的单条 SELECT（无显式事务）在 SERIALIZABLE 下仍是
快照读、不加锁——单语句本身就是一个隔离的事务，无需读锁。

## 5. Read View 与可见性（快照读的裁判）

Read View 四要素：

```
creator_trx_id：创建该视图的事务 ID
m_ids        ：创建时刻所有活跃（未提交）事务 ID 列表
min_trx_id   ：m_ids 的最小值
max_trx_id   ：系统下一个将分配的事务 ID（注意：不是 m_ids 的最大值）
```

对版本链上某版本的 `trx_id`：

```
1. trx_id == creator_trx_id        → 可见（自己的修改）
2. trx_id <  min_trx_id            → 可见（创建视图前已提交）
3. trx_id >= max_trx_id            → 不可见（视图创建后才开启的事务）
4. min_trx_id <= trx_id < max_trx_id
     在 m_ids 中 → 不可见（当时还没提交）
     不在 m_ids  → 可见（当时已提交）
不可见 → 沿 DB_ROLL_PTR 回溯上一版本，重复判断，直到找到可见版本
```

RC 与 RR 的全部区别，浓缩成一句话：**RC 每条 SELECT 造一个新 Read View，
RR 整个事务复用第一个**。

## 6. 级别选择与设置

```sql
-- 查看当前与全局级别
SELECT @@transaction_isolation;          -- 8.0 新变量（替代 tx_isolation）
SELECT @@global.transaction_isolation;

-- 设置
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
SET GLOBAL TRANSACTION ISOLATION LEVEL READ COMMITTED;  -- 新连接生效
```

选型建议：

| 级别         | 适用                                   | 代价                               |
| ------------ | -------------------------------------- | ---------------------------------- |
| RC           | 高并发 OLTP、锁冲突敏感的业务          | 不可重复读，业务需接受行值中途变化 |
| RR（默认）   | 默认安全选择；依赖语句级一致性审计     | 间隙锁引发死锁概率更高、回滚段更长 |
| SERIALIZABLE | 极少使用；强串行化报表/对账            | 并发能力大幅下降                   |

## 7. 小结

- 隔离级别 = **快照读交给 MVCC、当前读交给锁**，两种读法的结果可能不同；
- RR 下的幻读只在「快照读与当前读混用」时暴露，唯一约束是最可靠的兜底；
- 从 5.7 迁移注意：`tx_isolation` 已更名 `transaction_isolation`，
  `LOCK IN SHARE MODE` 已被 `FOR SHARE` 取代。
