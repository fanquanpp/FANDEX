---
order: 430
title: MVCC 原理
module: 'mysql'
category: 数据库
difficulty: advanced
description: MySQL InnoDB MVCC原理：隐藏列、Read View 四要素、undo log版本链可见性判断算法、RC与RR差异与Purge机制
author: fanquanpp
updated: '2026-09-12'
related:
  - 'mysql/420-TransactionIsolationImplementation'
  - 'mysql/450-LockClassification'
  - 'mysql/510-UndoLog'
  - 'mysql/440-MVCCSnapshotCurrentRead'
prerequisites:
  - 'mysql/510-UndoLog'
---

## 1. MVCC 是什么，为什么需要它

数据库并发访问的经典矛盾：读者想看到"稳定"的数据，写者想尽快改数据。最朴素的解法
是读写互斥——读加锁、写等读，并发度立刻崩塌。MVCC（Multi-Version Concurrency
Control，多版本并发控制）换了个思路：**保留数据的多个历史版本，让读事务挑一个
自己"该看"的版本，从而做到读不阻塞写、写不阻塞读**。

```
锁方案：   读 → 加共享锁 → 写事务被阻塞          （串行，慢）
MVCC方案： 读 → 沿版本链找一个可见的旧版本读     （不碰写者的锁，快）
```

类比：图书馆把书改版前的旧版都留在书架上，读者各取所需——想看最新版找当前行，
想看"我进馆那一刻"的版本就翻旧版。管理"哪一版归谁看"的规则，就是本文的主角。

InnoDB 只在 READ COMMITTED 与 REPEATABLE READ（默认）两个级别下使用 MVCC；
READ UNCOMMITTED 直接读最新值不做可见性判断，SERIALIZABLE 则把普通 SELECT
升级为加锁读，都不走这套机制。

## 2. 三块基础设施

### 2.1 行的隐藏列

InnoDB 每行记录额外携带三个隐藏列：

| 隐藏列      | 大小   | 用途                                     |
| ----------- | ------ | ---------------------------------------- |
| DB_TRX_ID   | 6 字节 | 最后一次插入或修改该行的事务 ID           |
| DB_ROLL_PTR | 7 字节 | 回滚指针，指向 undo log 中该行的上一版本 |
| DB_ROW_ID   | 6 字节 | 表无主键（也无非空唯一键）时作为聚簇键   |

### 2.2 undo log 版本链

每次 UPDATE/DELETE 都把旧值写入 undo log，新旧版本经 `DB_ROLL_PTR` 串成链：

```
当前行：{balance=300, trx_id=300, roll_ptr → undo_2}
                                        ↓
undo_2：{balance=200, trx_id=200, roll_ptr → undo_1}
                                        ↓
undo_1：{balance=100, trx_id=100, roll_ptr → NULL}
```

INSERT 只产生"记主键"的轻量 undo（提交后即可回收）；UPDATE/DELETE 的旧版本
要等 Purge 判定无人引用后才能清理（见 Undo Log 一篇）。

### 2.3 ReadView：可见性的裁判

事务做**快照读**（普通 SELECT）时生成一份 ReadView，本质是"此刻活跃事务的名单"：

```
ReadView {
    creator_trx_id : 400   -- 我自己的事务 ID
    m_ids          : [200, 300]  -- 生成视图时所有活跃（未提交）事务 ID
    min_trx_id     : 200   -- m_ids 的最小值
    max_trx_id     : 500   -- 系统下一个将分配的事务 ID（注意：不是 m_ids 的最大值）
}
```

关键点：**RC 与 RR 的全部区别只是创建时机不同**——

| 隔离级别        | ReadView 创建时机            | 效果                       |
| --------------- | ---------------------------- | -------------------------- |
| READ COMMITTED  | 每条 SELECT 都新建           | 每次读都看到"最新已提交"   |
| REPEATABLE READ | 首次快照读创建，整个事务复用 | 事务内多次读结果一致       |

## 3. 可见性判断算法

对版本链上某一版本的 `trx_id`，按顺序回答四个问题：

```
1. trx_id == creator_trx_id ?
   是 → 可见（我自己改的，未提交也可见）

2. trx_id < min_trx_id ?
   是 → 可见（视图创建前就已提交）

3. trx_id >= max_trx_id ?
   是 → 不可见（视图创建后才开启的事务，"未来"的修改）

4. min_trx_id <= trx_id < max_trx_id ?
       在 m_ids 中 → 不可见（当时未提交）
       不在 m_ids 中 → 可见（当时已提交）

不可见 → 沿 roll_ptr 回溯上一版本，重复以上判断
版本链走到头仍不可见 → 该行对当前事务不可见（等于没查到）
```

### 3.1 完整例题（自己动手推一遍）

初始：`account` 表有一行 `{id=1, balance=100, trx_id=100}`，事务 100 已提交。

```
T0: 事务 300 开启（RR），执行第一条 SELECT → 生成 ReadView：
    m_ids=[200, 300]，min_trx_id=200，max_trx_id=301，creator_trx_id=300

T1: 事务 200 执行 UPDATE balance=200（未提交）
    → 当前行变为 {balance=200, trx_id=200}，旧值进 undo

T2: 事务 300 SELECT balance → 300 行 trx_id=200：
    在 m_ids 中 → 不可见 → 回溯 undo → {balance=100, trx_id=100}：
    100 < 200 = min_trx_id → 可见。读到 100。

T3: 事务 200 提交

T4: 事务 300 再次 SELECT → RR 复用原 ReadView：
    trx_id=200 虽已提交，但仍"在 m_ids 中" → 依旧不可见 → 仍读到 100
    （若换成 RC：新建视图 m_ids 不含 200 → 直接读到 200）
```

推完这个例子，RC 与 RR 的差异、幻读与不可重复读的根源就全部落在
"ReadView 什么时候换"这一个点上。

## 4. 快照读与当前读的边界

MVCC 只作用于**快照读**；带锁读与所有 DML 是**当前读**，读最新已提交版本并加锁：

```sql
-- 快照读（走 MVCC）
SELECT * FROM t WHERE id = 1;

-- 当前读（不走 ReadView，读最新版本）
SELECT * FROM t WHERE id = 1 FOR UPDATE;         -- 排他读
SELECT * FROM t WHERE id = 1 FOR SHARE;          -- 共享读（8.0+ 语法）
UPDATE t SET ... WHERE id = 1;                   -- DML 内部是当前读
```

由此产生 RR 下最著名的陷阱——**先快照读、后当前读，"幻影行"出现**：

```sql
-- 事务 A（RR）
BEGIN;
SELECT * FROM t WHERE id = 10;              -- 快照读：0 行
-- 事务 B 插入 id=10 并提交
SELECT * FROM t WHERE id = 10 FOR UPDATE;   -- 当前读：读到了 B 的行！
```

结论：RR 的一致性只对快照读成立；"查了再写"的业务（防重、防超卖）必须靠
唯一约束或 `INSERT ... ON DUPLICATE KEY UPDATE` 这类原子操作兜底，
不能依赖"我先查过了"。
快照读与当前读的行为对照详见 MVCC 快照读与当前读一篇，加锁规则见间隙锁与临键锁一篇。

## 5. ReadView 与 Purge 的联动

ReadView 决定"谁看得到旧版本"，Purge 决定"旧版本什么时候能删"。
两者的接口是：**只要存在某个活跃 ReadView 可能引用某条 undo，Purge 就不能清理它**。

```sql
-- 观测 Purge 进度与"元凶"
SHOW ENGINE INNODB STATUS\G
-- History list length：等待清理的 undo 数量

SELECT trx_id, trx_started, TIMESTAMPDIFF(SECOND, trx_started, NOW()) AS age_sec
FROM information_schema.INNODB_TRX
ORDER BY trx_started;   -- age_sec 很大的会话就是长事务
```

长事务（哪怕只读）会像钉子一样钉住 Purge：它打开的第一个快照之后的**所有**版本
都删不掉，undo 表空间持续膨胀，全库快照读回溯变慢。所以"尽快提交事务"不只是
锁的问题，也是 MVCC 体系健康的问题。

## 6. 常见误区清单

1. **"RR 下 ReadView 在 BEGIN 时生成"**——错。是**第一条快照读**时生成；
   要从严对齐一致性起点，用 `START TRANSACTION WITH CONSISTENT SNAPSHOT`。
2. **"提交了就一定看得见"**——RR 下不见得：只要提交发生在你的 ReadView 生成之后，
   对你就是不可见（例题 T4）。
3. **"MVCC 解决了幻读"**——只对纯快照读成立；当前读仍依赖 Next-Key Lock 阻止插入，
   两者混用仍会看到幻影行。
4. **"读不加锁 = 没有开销"**——版本链很长时，快照读要逐版回溯判断，
   极端情况下一次读要回溯成千上万个版本。
5. **"undo 马上就删"**——insert undo 提交后可立即回收，update undo 必须等 Purge
   确认无引用，二者机制不同。

## 7. 小结

- 初学者要点：MVCC = 隐藏列 + undo 版本链 + ReadView；读不加锁靠"挑版本"实现；
  RC 每条 SELECT 换视图，RR 整个事务一张视图。
- 进阶注意：可见性判断的四步规则建议背下来，是死锁、幻读、复制一致性等
  一切事务问题的底层裁判；长事务钉住 Purge 造成 undo 膨胀是线上最常见的
  MVCC 事故，监控 `History list length` 与 `INNODB_TRX.age` 是基本功。
