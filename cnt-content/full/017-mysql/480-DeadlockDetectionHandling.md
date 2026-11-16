---
order: 510
title: 死锁检测与处理
module: 'mysql'
category: 数据库
difficulty: advanced
description: MySQL InnoDB死锁检测与处理：等待图算法、死锁日志解读、data_locks与sys.innodb_lock_waits锁排查、预防策略与重试
author: fanquanpp
updated: '2026-10-11'
related:
  - 'mysql/450-LockClassification'
  - 'mysql/540-DistributedTransaction'
  - 'mysql/490-Binlog'
  - 'mysql/470-GapLockNextKeyLockSolutionPhantomRead'
prerequisites:
  - 'mysql/450-LockClassification'
---

## 1. 什么是死锁，MySQL 怎么发现它

两个（或多个）事务互相持有对方需要的锁、又互不退让，就形成死锁：

```sql
-- 经典双行更新死锁
-- 事务 A                          事务 B
BEGIN;                             BEGIN;
UPDATE t SET v=1 WHERE id=1;      UPDATE t SET v=9 WHERE id=2;
UPDATE t SET v=2 WHERE id=2;      -- 等事务 A 释放 id=1
-- 等事务 B 释放 id=2 → 循环等待，死锁成立
```

InnoDB 默认开启**主动检测**：维护一张"谁在等谁"的等待图（wait-for graph），
锁请求进不来时就往图里加一条边，一旦图中出现**环**即判定死锁，并选择
**回滚代价小**（修改行数少）的事务作为牺牲者：

```sql
SHOW VARIABLES LIKE 'innodb_deadlock_detect';   -- 默认 ON
-- 被牺牲的事务收到：
-- ERROR 1213 (40001): Deadlock found when trying to get lock; try restarting transaction
```

死锁与"锁等待超时"是两回事，错误码不同、处理方式也不同：

| 对比项 | 死锁（1213）              | 锁等待超时（1205）                    |
| ------ | ------------------------- | ------------------------------------- |
| 触发   | 等待图出现环，立即检测到  | 等锁超过 `innodb_lock_wait_timeout`   |
| 默认值 | 即时检测                  | 50 秒                                 |
| 回滚   | 整个事务回滚              | **只回滚当前语句**，事务仍持有其他锁  |
| 处置   | 捕获后重试整个事务        | 排查长事务/慢 SQL，勿盲目调大超时     |

> 1205 的"只回滚当前语句"是高频坑：应用以为超时就没事了，实际事务里前面
> 已执行的语句依旧持锁，直到应用显式 ROLLBACK 或连接断开。

## 2. 死锁日志解读

```sql
SHOW ENGINE INNODB STATUS\G
-- 找 LATEST DETECTED DEADLOCK 段（只保留最近一次）
```

```text
LATEST DETECTED DEADLOCK
------------------------
2026-06-14 10:30:07
*** (1) TRANSACTION:
TRANSACTION 4219388, ACTIVE 2 sec starting index read
mysql tables in use 1, locked 1
LOCK WAIT 3 lock struct(s), heap size 1136, 2 row lock(s)
MySQL thread id 10, query id 100 localhost root updating
UPDATE accounts SET balance = balance - 100 WHERE id = 1
*** (1) HOLDS THE LOCK(S):
RECORD LOCKS space id 58 page no 4 n bits 72 index PRIMARY of table `mydb`.`accounts`
trx id 4219388 lock_mode X locks rec but not gap   ← 持有 id=2 的记录锁
*** (1) WAITING FOR THIS LOCK TO BE GRANTED:
RECORD LOCKS ... index PRIMARY ... lock_mode X locks rec but not gap
                                                   ← 在等 id=1
*** (2) TRANSACTION:
TRANSACTION 4219389, ACTIVE 1 sec starting index read
MySQL thread id 11, query id 101 localhost root updating
UPDATE accounts SET balance = balance - 100 WHERE id = 2
*** (2) HOLDS THE LOCK(S):
RECORD LOCKS ... index PRIMARY ... lock_mode X locks rec but not gap
                                                   ← 持有 id=1
*** (2) WAITING FOR THIS LOCK TO BE GRANTED:
RECORD LOCKS ... index PRIMARY ... lock_mode X locks rec but not gap
                                                   ← 在等 id=2
*** WE ROLL BACK TRANSACTION (2)                    ← 牺牲者
```

读法：分别还原两个事务"HOLDS（持有什么）→ WAITING FOR（在等什么）"两条链，
交叉处就是环；`locks rec but not gap` 表示纯记录锁，若出现
`lock_mode X waiting` 前带 `insert intention` 则是插入意向锁与间隙锁的
经典冲突（详见间隙锁与临键锁一篇的死锁案例）。

想长期收集（默认只留最后一次）：

```sql
-- [mysqld] innodb_print_all_deadlocks = ON
-- 把每次死锁都写入错误日志，便于事后归因
SHOW VARIABLES LIKE 'innodb_print_all_deadlocks';
```

## 3. 锁等待的实时排查（8.0 视角）

死锁是"已经撞车"，锁等待是"正在堵车"，排查入口在 8.0 变化很大：

```sql
-- 8.0：锁信息在 performance_schema（旧版 information_schema.INNODB_LOCKS /
--      INNODB_LOCK_WAITS 已在 8.0 移除，网上老资料里那两张表查不到东西了）
SELECT ENGINE_TRANSACTION_ID, INDEX_NAME, LOCK_TYPE,
       LOCK_MODE, LOCK_DATA
FROM performance_schema.data_locks
WHERE OBJECT_NAME = 'accounts';

SELECT * FROM performance_schema.data_lock_waits;   -- 谁等谁

-- sys schema 的现成视图（封装了上面两张表 + 线程 + SQL 文本）
SELECT * FROM sys.innodb_lock_waits\G
-- 关键字段：
--   wait_pid            等锁的连接 ID
--   blocking_pid        堵人的连接 ID
--   blocking_query      堵人者正在执行的 SQL
--   blocking_trx_age    堵人者事务已运行多久（找长事务看这里）
```

排查套路：先 `sys.innodb_lock_waits` 找到 blocking_pid → `information_schema.INNODB_TRX`
确认它的事务年龄与修改行数 → 结合业务判断是 kill 还等待。
前提：`performance_schema` 处于开启状态（8.0 默认开启）。

## 4. 死锁预防：四个工程手段

### 4.1 固定顺序访问

```sql
-- 反例：A 先锁 1 后锁 2，B 先锁 2 后锁 1 → 有环
-- 正解：所有事务都按主键升序访问（如先转账方后收款方排序后逐一处理）
UPDATE t SET v = v - 1 WHERE id = 1;
UPDATE t SET v = v + 1 WHERE id = 2;   -- 永远先 1 后 2 → 无环
```

### 4.2 缩小事务与持锁时间

```sql
-- 反例：事务里夹 RPC / 人工确认
BEGIN;
UPDATE accounts SET ... ;          -- 行锁从这里开始持有
CALL external_notify();            -- 外部调用几秒钟，锁被拖住几秒
COMMIT;

-- 正解：把外部调用挪到事务之外，事务只包住纯数据库操作
```

### 4.3 让语句走索引

无索引可走的 UPDATE/DELETE 会扫描并锁住**大量记录与间隙**（接近全表），
锁冲突面急剧放大——给 WHERE 条件列建索引，本质是在缩小锁的范围。

### 4.4 降低隔离级别或减小锁算法（按需）

```sql
-- RC 下间隙锁基本禁用，"两个事务同时持有间隙锁再互相插入"这类死锁消失
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
-- 代价：不可重复读语义需业务自己接受（见隔离级别底层实现一篇）
```

## 5. 兜底：超时与关闭检测

```sql
-- 锁等待超时（会话级可调，默认 50 秒）
SET SESSION innodb_lock_wait_timeout = 5;

-- 极端高并发热点（如秒杀单行）下，死锁检测本身成为 CPU 热点时，
-- 社区实践是关闭检测、改靠超时——但必须配合极小的超时与幂等重试
SET GLOBAL innodb_deadlock_detect = OFF;
SET GLOBAL innodb_lock_wait_timeout = 1;   -- 快速失败
```

这是一个**权衡**：关检测后真正的死锁要等超时才解开（秒级阻塞），
换来的是热点行场景省掉全图检测的开销。普通 OLTP 不要关。

## 6. 应用层重试模板

死锁不可能 100% 消灭，客户端必须把 1213 当成"可重试错误"：

```sql
-- 伪代码约定：
-- 1. 捕获 1213（死锁）→ 幂等前提下重试整个事务，3-5 次，指数退避
-- 2. 捕获 1205（超时）→ 不要简单重试：先 ROLLBACK 释放残留锁，再排查原因
-- 3. 重试事务必须"整体重跑"：牺牲事务被整体回滚，不能只重跑最后一条语句
```

## 教学自检（先遮住代码自己写，再对照）

遮码自检法：先只读题干，自己写/自己答，再展开参考答案对照。

1. 概念自问：InnoDB 怎么发现死锁？发现后牺牲谁？这与"锁等待超时"（1205）有什么本质区别？

参考答案（先自己答，再对照）：等待图（wait-for graph）即时检测——两个事务的等待关系构成环即判死锁，选 undo 量小、代价低的事务回滚（报 1213）；这是"环已形成"的死结，必须有人退出。锁等待超时是"等太久"（默认 50 秒，innodb_lock_wait_timeout），只回滚当前语句并保留事务上下文——环可能根本不存在，只是持锁方太慢。两者报错码、回滚粒度、处置方式都不同。

2. 概念自问：四个工程手段预防死锁，各自的原理是什么？

参考答案（先自己答，再对照）：固定访问顺序（按主键/业务键排序后逐个加锁——破坏"你等我我等你"的环形成条件）；小事务快提交（缩短持锁窗口，让等待方尽快等到）；走索引（缩小锁范围，避免无索引时升级成大量间隙锁）；降低隔离级别到 RC（去掉间隙锁，消灭"间隙锁互容 + 插入互斥"这一 RR 特色死锁模式）。共同思想：让锁的获取路径可预测、可等待、尽快释放。

3. 判断题：应用层收到 1213 后，把最后一条语句重发一遍就能恢复。

参考答案（先自己答，再对照）：不行。1213 意味着整个事务被回滚——前面已执行的语句效果全部作废，只重发最后一条会让事务处于"半执行"状态。正确做法是整体重跑事务（幂等前提下重试 3-5 次、指数退避）；1205 超时则不同，它只回滚当前语句，事务还在——先决定 COMMIT/ROLLBACK，再考虑下一步。

4. 概念自问：热点行更新（秒杀扣库存）为什么官方文档会建议"权衡关闭死锁检测"？关闭后必须配套什么？

参考答案（先自己答，再对照）：几百个事务同时锁同一行时，等待图检测 + 惊群回滚的 CPU 开销可能超过业务本身，检测反成瓶颈。关闭（innodb_deadlock_detect=OFF）后死锁只能靠锁等待超时兜底，所以必须配套极小的超时（如 1 秒级）、幂等重试与排队削峰——把"死锁检测"换成"快速失败 + 重试"的模型。这是明确的权衡：只有单一热点行、且重试代价低的场景值得这么做。

## 7. 小结

- 初学者要点：死锁由 InnoDB 自动检测并回滚代价小的事务（错误 1213），
  应用要有整体重试；锁等待超时（1205）只回滚当前语句，别混淆。
- 进阶注意：诊断入口是 `performance_schema.data_locks` /
  `sys.innodb_lock_waits`（8.0 已移除 INNODB_LOCKS 系列老表）；
  预防三板斧——固定访问顺序、小事务、走索引；热点行可权衡关闭检测，
  但必须配套小超时与幂等重试。
