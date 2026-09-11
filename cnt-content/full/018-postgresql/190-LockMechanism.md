---
order: 190
title: 锁机制
module: 'postgresql'
category: 数据库
difficulty: advanced
description: PostgreSQL锁机制：表级锁八种模式、行级锁四种强度、advisory锁、锁排队与死锁处理
author: fanquanpp
updated: '2026-09-12'
related:
  - 'postgresql/160-SystemArchitecture'
  - 'postgresql/200-DeadlockDetectionHandling'
  - 'postgresql/210-VACUUMMechanism'
  - 'postgresql/170-TransactionConcurrencyControl'
prerequisites:
  - 'postgresql/010-OverviewInstallConfig'
---

## 1. 锁在 PostgreSQL 中的角色

MVCC 让"读"不阻塞"写"，但"写与写"之间、"改结构"与"一切操作"之间
仍然需要锁来协调。PostgreSQL 的锁分三层，先建立全景再逐层展开：

```
表级锁（8 种模式）     : 保护整张表, 自动由 SQL 语句获取, 持有到事务结束
行级锁（4 种强度）     : 保护单行, 由 SELECT FOR ... / DML 获取
advisory 锁（应用级）  : 与数据无关, 完全由应用自行约定含义
```

类比：表级锁像**整层楼的门禁**（装修时封楼），行级锁像**某个房间的门锁**，
advisory 锁像**团队自己约定的一块"使用中"白板**——数据库只负责登记，
不解释它的业务含义。

## 2. 表级锁

### 2.1 八种锁模式

每条 SQL 都会自动为目标表申请表级锁。记忆主线：从上到下强度递增，
`ACCESS EXCLUSIVE` 与一切互斥。

| 锁模式 | 典型触发语句 | 与谁冲突 |
| ---------------------- | ------------------------------- | ------------------------------------------------------------ |
| ACCESS SHARE | SELECT | ACCESS EXCLUSIVE |
| ROW SHARE | SELECT FOR UPDATE/SHARE | EXCLUSIVE, ACCESS EXCLUSIVE |
| ROW EXCLUSIVE | INSERT / UPDATE / DELETE / MERGE | SHARE, SHARE ROW EXCLUSIVE, EXCLUSIVE, ACCESS EXCLUSIVE |
| SHARE UPDATE EXCLUSIVE | VACUUM(非FULL), ANALYZE, CREATE INDEX CONCURRENTLY, ALTER INDEX | SHARE UPDATE EXCLUSIVE, SHARE, SHARE ROW EXCLUSIVE, EXCLUSIVE, ACCESS EXCLUSIVE |
| SHARE | CREATE INDEX(非并发) | ROW EXCLUSIVE, SHARE UPDATE EXCLUSIVE, SHARE ROW EXCLUSIVE, EXCLUSIVE, ACCESS EXCLUSIVE |
| SHARE ROW EXCLUSIVE | （仅显式指定时使用） | ROW EXCLUSIVE, SHARE UPDATE EXCLUSIVE, SHARE, SHARE ROW EXCLUSIVE, EXCLUSIVE, ACCESS EXCLUSIVE |
| EXCLUSIVE | （仅显式指定时使用） | 除 ACCESS SHARE 外全部 |
| ACCESS EXCLUSIVE | ALTER TABLE / DROP TABLE / TRUNCATE / VACUUM FULL | 所有模式（包括 ACCESS SHARE） |

两个最值得背下来的结论：

1. **SELECT 与 ALTER TABLE 互斥**：`ALTER TABLE` 要拿 ACCESS EXCLUSIVE，
   会等待所有在跑的 SELECT 结束，同时阻塞后续一切查询——大表上随便
   ALTER 一下就可能造成"雪崩式"阻塞（见 2.4 锁排队）。
2. **普通 VACUUM 用 SHARE UPDATE EXCLUSIVE**：它不阻塞读写，但与自身
   互斥（同一张表不能两个 VACUUM 同时跑）。

### 2.2 手动加表锁

```sql
BEGIN;
-- 显式加锁, 持有到 COMMIT/ROLLBACK
LOCK TABLE employees IN SHARE MODE;
-- 未指定模式时默认 ACCESS EXCLUSIVE（慎用）
LOCK TABLE employees;
COMMIT;

-- NOWAIT: 拿不到锁立即报错而不是等待
LOCK TABLE employees IN SHARE MODE NOWAIT;
-- ERROR: could not obtain lock on relation "employees"
```

### 2.3 行级锁（四种强度）

`SELECT ... FOR` 系列与 DML 获取的行锁，关键在于"这把锁挡不挡住
改主键/改其他列"。强度从弱到强：

| 行锁 | 触发语句 | 被谁冲突 |
| ----------------- | ----------------------------------- | ------------------------------ |
| FOR KEY SHARE | 外键检查时隐式获取; 或显式指定 | FOR UPDATE |
| FOR SHARE | SELECT ... FOR SHARE | FOR NO KEY UPDATE, FOR UPDATE |
| FOR NO KEY UPDATE | UPDATE 不修改键列时 | FOR SHARE, FOR NO KEY UPDATE, FOR UPDATE |
| FOR UPDATE | SELECT ... FOR UPDATE; UPDATE 修改键列或 DELETE | 以上全部 |

完整冲突矩阵（行 = 后来请求的锁, 列 = 已被持有的锁, X = 冲突需等待）：

| 请求\持有 | KEY SHARE | SHARE | NO KEY UPDATE | UPDATE |
| --------------- | --------- | ----- | ------------- | ------ |
| FOR KEY SHARE | | | | X |
| FOR SHARE | | | X | X |
| FOR NO KEY UPDATE | | X | X | X |
| FOR UPDATE | X | X | X | X |

这张矩阵解释了一个经典疑问："两个事务同时 UPDATE 同一行（都不改主键）"
为什么互相等待？——两者都拿 FOR NO KEY UPDATE，而它与自身冲突。

```sql
BEGIN;
-- 阻塞式锁定并读出当前值
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;

-- 不阻塞版本: SKIP LOCKED 跳过被占用的行（任务队列利器）
SELECT id, payload FROM job_queue
WHERE status = 'pending'
ORDER BY id
LIMIT 1
FOR UPDATE SKIP LOCKED;

-- NOWAIT: 拿不到立刻报错
SELECT * FROM accounts WHERE id = 1 FOR UPDATE NOWAIT;
-- ERROR: could not obtain lock on row in relation "accounts"
```

### 2.4 锁排队与"跳队"陷阱

同一张表上的表级锁请求按先来后到排队，且遵循一条关键规则：
**只要有一个 ACCESS EXCLUSIVE 请求在排队，其后新到达的一切请求
（包括普通的 ACCESS SHARE 读）都必须排在它后面**——这是为了防止
排他锁被连续的读请求"饿死"而设计。

```
时间线:
T1: 长查询 SELECT（持 ACCESS SHARE, 跑 10 分钟）
T2: ALTER TABLE（请求 ACCESS EXCLUSIVE, 排队等待 T1）
T3: 新 SELECT（请求 ACCESS SHARE —— 按规则要排在 T2 之后! 也被卡住）
结果: 一条 ALTER 让全表查询全部挂起
```

```sql
-- 防御方式: 给 DDL 设置 lock_timeout, 拿不到锁就放弃, 避免卡死队列
SET lock_timeout = '3s';
ALTER TABLE orders ADD COLUMN remark TEXT;
-- ERROR: canceling statement due to lock timeout
-- 失败后重试, 而不是无限等待

-- 伪代码式运维流程: 先查长事务 → DDL 前设 lock_timeout → 失败即重试
```

### 2.5 轻量锁（LWLock）与死锁的关系

除表锁/行锁外，PostgreSQL 内部还有不参与死锁检测、持有时间极短的
轻量锁（缓冲区锁、WALInsertLock 等）。业务排查死锁问题只关心前两类；
`pg_locks` 里 `locktype = 'lwlock'` 的记录仅用于内核级诊断。

## 3. Advisory 锁（咨询锁）

应用层自定义语义的锁：数据库只负责"加锁/互斥/自动释放"，
不与任何表绑定，典型用途是防止定时任务重复执行、多实例互斥。

```sql
-- 会话级: 一直持有到显式解锁或连接断开（忘记解锁会一直占着!）
SELECT pg_advisory_lock(12345);        -- 阻塞式
SELECT pg_try_advisory_lock(12345);    -- 非阻塞, 立即返回 true/false

-- 事务级: COMMIT/ROLLBACK 时自动释放, 更不容易泄漏
SELECT pg_advisory_xact_lock(12345);

-- 双参数版本: 两个 int 组成一个 key（单参数版本是 bigint, 空间不同）
SELECT pg_advisory_lock(1, 2);

-- 释放（会话级才需要）
SELECT pg_advisory_unlock(12345);
SELECT pg_advisory_unlock_all();       -- 释放本会话全部 advisory 锁
```

```sql
-- 完整的非阻塞任务调度示例
SELECT pg_try_advisory_lock(9101) AS locked;
--  locked
-- -------
--  t
-- 拿到锁才执行; 没拿到说明另一个实例在跑, 直接退出
DO $$
BEGIN
  IF pg_try_advisory_lock(9101) THEN
    -- ... 执行批处理任务 ...
    PERFORM pg_advisory_unlock(9101);
  ELSE
    RAISE NOTICE '另一个实例正在运行, 跳过本次调度';
  END IF;
END $$;
```

## 4. 查看与排查锁

```sql
-- 全量锁视图
SELECT locktype, relation::regclass, mode, pid, granted
FROM pg_locks
WHERE NOT granted OR locktype IN ('relation', 'transactionid')
ORDER BY granted;
--  locktype    | relation |         mode          | pid  | granted
-- -------------+----------+-----------------------+------+---------
--  relation    | accounts | RowExclusiveLock      | 4001 | t
--  transactionid|          | ShareLock             | 4002 | f    <-- 在等 4001 的行锁

-- 一条常用的"谁阻塞谁"查询（含等待时长）
SELECT
  w.pid          AS waiting_pid,
  w.query        AS waiting_query,
  b.pid          AS blocking_pid,
  b.query        AS blocking_query,
  w.wait_event_type,
  w.wait_event,
  now() - w.query_start AS waiting_for
FROM pg_stat_activity w
JOIN pg_locks wl  ON wl.pid = w.pid AND NOT wl.granted
JOIN pg_locks bl  ON bl.locktype = wl.locktype
                 AND bl.relation IS NOT DISTINCT FROM wl.relation
                 AND bl.transactionid IS NOT DISTINCT FROM wl.transactionid
                 AND bl.granted
JOIN pg_stat_activity b ON b.pid = bl.pid
WHERE w.pid != b.pid;

-- 会话级快速版: wait_event = transactionid / relation 即在等行锁/表锁
SELECT pid, wait_event_type, wait_event, state, query
FROM pg_stat_activity
WHERE wait_event IS NOT NULL AND pid != pg_backend_pid();
```

## 5. 常见陷阱与调试

- **以为 SELECT 永远不阻塞**：单看锁矩阵没错，但 ACCESS EXCLUSIVE
  一旦排队，后面的 SELECT 全部被卡（见 2.4），这是"ALTER 卡全站"
  事故的根源。
- **autovacuum 拿不到锁被无限跳过**：VACUUM 需要 SHARE UPDATE EXCLUSIVE，
  若长事务持有冲突锁，autovacuum 反复重试失败，表持续膨胀。
  现象是日志反复出现 `skipping vacuum of "xxx"`。
- **advisory 会话级锁忘记释放**：连接归还连接池后锁仍被持有，
  应用表现为"莫名其妙某个任务再也不执行"。优先用事务级
  `pg_advisory_xact_lock`。
- **在低隔离级别下以为 FOR UPDATE 万无一失**：READ COMMITTED 下
  `FOR UPDATE` 等待的行如果被并发事务改过后，会基于最新版本重新
  评估条件；需要严格快照语义时配合 REPEATABLE READ 使用。
- **死锁**：锁只是"等待"，等成环才是死锁。检测、日志解读与重试
  策略见[死锁检测与处理](postgresql/200-DeadlockDetectionHandling)一文。

## 小结

- 初学者要点：SELECT 取 ACCESS SHARE、DML 取 ROW EXCLUSIVE、
  DDL/VACUUM FULL 取 ACCESS EXCLUSIVE；两个事务同时改同一行会互相等待；
  `SELECT ... FOR UPDATE` 是"先锁再改"的标准写法；锁默认持有到事务结束。
- 进阶注意：用 `lock_timeout` 保护所有 DDL；`SKIP LOCKED`/`NOWAIT`
  处理高竞争；advisory 锁优先事务级；排查阻塞先看
  `pg_stat_activity.wait_event`，再按"谁阻塞谁"SQL 定位罪魁事务。
