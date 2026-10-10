---
order: 470
title: MVCC 快照读与当前读：同一规则为何推出两种结果
module: 'mysql'
category: 数据库
difficulty: advanced
description: 深水区专题：同一张版本链上 RC 与 RR 的两条时间线推演、快照读下幻读为何不存在而当前读为何仍需间隙锁、当前读语句清单与双会话复现实验。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'mysql/430-MVCCPrinciple'
  - 'mysql/420-TransactionIsolationImplementation'
  - 'mysql/470-GapLockNextKeyLockSolutionPhantomRead'
  - 'mysql/450-LockClassification'
prerequisites:
  - 'mysql/430-MVCCPrinciple'
---

## 前置知识

- 已完成 [MVCC 原理](/mysql/430-MVCCPrinciple)：会画版本链，背得出 ReadView 四字段与可见性四条规则。本文每次推演都直接引用这四条规则，不再重新解释；
- 读过 [事务隔离级别底层实现](/mysql/420-TransactionIsolationImplementation) 更好：知道四种级别的名字，没读过也能跟。

与 430 的分工：**430 主教学——版本链怎么长出来、规则怎么判单个版本；本文深水区——把同一套规则放进 RC 与 RR 两种拍照时机各推一遍，看到「同一规则、两种结果」，再划清快照读与当前读的边界，回答「RR 到底有没有幻读」**。

## 学习目标

读完本文你将能够：

1. 用「拍照时机」一句话说清 RC 与 RR 的全部差别，并对任一时间线手工推演出读数；
2. 解释幻读在快照读下为何不存在、在当前读下为何照样出现；
3. 背出当前读语句清单，说明它们与快照读的三点不同；
4. 用两个会话亲手复现「快照读无幻影、FOR UPDATE 有阻塞」两个现象。

预计 60 分钟，需要两个终端窗口。

## 1. 你现在要解决什么问题

430 篇结尾留了一个悬案：同一套四条规则，RC 的同事说「我第二次查就看到新价了」，RR 的你却「一直看到旧价」。规则没变，结果变了——变量只能有一个。另一个更经典：面试官问「RR 到底有没有幻读」，网上两种答案打架，一边说没有，一边贴出反例。

两个悬案共享同一把钥匙：**ReadView 什么时候拍**。本文用它解锁 RC 与 RR 的全部差异，再补上 430 刻意绕开的那半边——当前读。

## 2. 准备现场：一张秒杀库存表

```sql
USE test;

CREATE TABLE flash_sale (
  id    INT PRIMARY KEY,
  item  VARCHAR(30) NOT NULL,
  stock INT NOT NULL
);
INSERT INTO flash_sale VALUES
  (1, '机械键盘', 10),
  (2, '游戏鼠标', 5),
  (3, '电竞耳机', 8);
SELECT @@transaction_isolation;   -- REPEATABLE-READ，两个会话都确认一遍
```

两个会话各开一个 mysql 客户端，现场就是这 3 行库存。

## 3. 核心概念：拍照时机决定一切

RC 与 RR 用的是同一张版本链、同一套四条规则，唯一差别在 ReadView 的生命周期：

| 级别 | ReadView 何时拍 | 效果 |
| --- | --- | --- |
| READ COMMITTED | 每条快照读都重拍 | 每次读都看到「此刻最新已提交」 |
| REPEATABLE READ | 第一条快照读拍，整个事务复用 | 事务内多次读，结果一致 |

一张照片用到底，就是「可重复读」的全部实现机制；条条重拍，就是「读已提交」——你读到的永远是最新拍下的那帧。下面用同一条版本链把两个级别各推一遍，结论全部从 430 的四条规则里自己长出来。

## 4. 时间线一：RC——条条重拍

初始库存 10（由 trx 50 插入并提交）。会话 A（trx 200，RC），期间会话 B（trx 300）扣减库存：

```text
T1  A: BEGIN; SELECT stock → 拍 ReadView_1：m_ids=[200,300]，min=200，max=301
T2  B: UPDATE stock=7 并 COMMIT；当前行 {7, trx 300}，undo {10, trx 50}
T3  A: SELECT stock → 重拍 ReadView_2：m_ids=[200]
       {7, 300}：300 不在名单里 → 可见 → 读到 7
T5  A: SELECT stock → 重拍 ReadView_3
       {7, 300}：仍不在名单里 → 读到 7
```

预期输出（会话 A 的三次读）：`10 → 7 → 7`。

T3 那次重拍是转折点：拍照瞬间 B 已经提交，300 不在名单里，规则 4 判可见。同一个事务读出 10、7、7——这就是「不可重复读」，在 RC 里是**特性不是缺陷**：名字就叫「读已提交」。

## 5. 时间线二：RR——一张照片用到底

版本链原样照搬，只把会话 A 换成 RR：

```text
T1  A: BEGIN; SELECT stock → 拍 ReadView：m_ids=[200,300]，min=200，max=301
T2  B: UPDATE stock=7（未提交）
T3  A: SELECT stock → 复用 ReadView
       {7, 300}：300 在名单里 → 不可见 → 回溯 {10, 50}：50 < 200 → 读到 10
T4  B: COMMIT
T5  A: SELECT stock → 仍复用 ReadView
       {7, 300}：300 还在名单里 → 不可见 → 读到 10
```

预期输出（会话 A 的三次读）：`10 → 10 → 10`。

T4 之后 B 明明提交了，A 照样看不到——四条规则里没有「对方现在提交了没有」，只有「你拍照那刻它在不在名单上」。名单定格在 T1，之后怎么变都与 A 无关。两条时间线一个字没改规则，只改了拍照时机，10/7/7 与 10/10/10 的分叉自己长了出来。

## 6. 幻读在快照读下为何不存在

把 UPDATE 换成 INSERT。会话 A（RR）拍照后，会话 B 插入一行并提交：

```text
T1  A: SELECT COUNT(*) → 3（拍照：max=301）
T2  B: INSERT (4, '直播补光灯', 6); COMMIT;   新行 {4, trx 300}
T3  A: SELECT COUNT(*) → 复用 ReadView
       新行 trx 300：在名单里 → 不可见 → 不计入 → 仍 3
```

预期输出（A 的两次 COUNT）：`3 → 3`。

新行没藏进谁的版本链，它就实实在在躺在表里，但它的 trx_id 落在 A 的名单里（或晚于 max），规则直接判不可见。所以准确说法是：**RR 的快照读下没有幻读——不是幻读消失了，是被快照挡住了**。挡住的前提是你一直读快照，一旦换读法，见下节。

## 7. 当前读清单：不吃快照这一套的语句

改数据不能对着旧快照改——在过期的照片上做手术必出事故，所以 InnoDB 规定写操作必须读最新已提交版本并加锁：

```sql
SELECT * FROM flash_sale WHERE id = 2 FOR UPDATE;   -- 排他锁读
SELECT * FROM flash_sale WHERE id = 2 FOR SHARE;    -- 共享锁读（8.0+）
UPDATE flash_sale SET stock = stock - 1 WHERE id = 2;   -- 内部当前读
DELETE FROM flash_sale WHERE id = 2;                    -- 内部当前读
INSERT INTO flash_sale VALUES (5, '网卡', 3);           -- 冲突检查属当前读
```

| 维度 | 快照读 | 当前读 |
| --- | --- | --- |
| 读哪个版本 | 我该看的历史版本 | 此刻最新已提交 |
| 加锁 | 不加锁 | 加记录锁（必要时连间隙） |
| ReadView | 用 | 完全不用 |
| 隔离语义 | 事务内一致 | 实时，且排斥并发修改 |

两条例外记一笔：SERIALIZABLE 把普通 SELECT 自动升级为当前读（autocommit 下的单条 SELECT 除外）；RC 的当前读只锁记录不锁间隙，RR 的当前读还会锁住间隙——这个差别马上要用。

## 8. 混用的裂缝：当前读仍会看到幻影

A（RR）先快照读、后当前读，B 在中间插入：

```sql
-- 会话 A
BEGIN;
SELECT * FROM flash_sale WHERE id = 4;            -- 快照读：Empty set
-- 会话 B：INSERT (4, '直播补光灯', 6); COMMIT;
-- 会话 A
SELECT * FROM flash_sale WHERE id = 4 FOR UPDATE; -- 当前读：读到了 B 的行！
```

预期输出（A 的两条 SELECT）：

```text
Empty set (0.00 sec)
1 row in set (0.00 sec)      -- id=4 的行出现了
```

同一个人格、同一个事务，前脚说「没有这行」，后脚读到了——这就是「RR 有幻读」派手里的反例。根因不是 MVCC 失灵，而是 **FOR UPDATE 不走快照**。RR 的对策：当前读时顺手锁住记录之间的间隙，B 的 INSERT 进不来，幻影从源头消失。间隙锁怎么锁、锁多宽，[间隙锁与临键锁解决幻读](/mysql/470-GapLockNextKeyLockSolutionPhantomRead) 有正题；这里记住结论：**RR 的一致性对快照读无条件成立，对当前读靠锁维持，两者混用时以当前读为准**。

## 9. 实验：两个会话手工复现

**实验一：RR 快照读挡住幻影**（对应第 6 节）。

```sql
-- 会话 A
SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;
BEGIN;
SELECT COUNT(*) FROM flash_sale;          -- 3
-- 会话 B
INSERT INTO flash_sale VALUES (4, '直播补光灯', 6);   -- Query OK，自动提交
-- 会话 A
SELECT COUNT(*) FROM flash_sale;          -- 仍 3
SELECT * FROM flash_sale WHERE id = 4;    -- Empty set
```

**实验二：FOR UPDATE 的阻塞**。会话 A 锁行，会话 B 撞锁：

```sql
-- 会话 A
BEGIN;
SELECT * FROM flash_sale WHERE id = 2 FOR UPDATE;   -- 立即返回，拿到排他锁
-- 会话 B
UPDATE flash_sale SET stock = stock - 1 WHERE id = 2;   -- 卡住不动
```

B 卡住期间，A 里顺手查锁等待现场：

```sql
SELECT waiting_pid, waiting_query, blocking_pid, blocking_query
FROM sys.innodb_lock_waits\G
```

预期输出（\G 竖排节选；blocking_query 是 NULL——A 拿着锁在发呆，事务里最危险的状态）：

```text
waiting_pid: 15
waiting_query: UPDATE flash_sale SET stock = stock - 1 WHERE id = 2
 blocking_pid: 14
blocking_query: NULL
```

会话 A 执行 COMMIT，B 立刻放行，预期输出 `Query OK, 1 row affected (8.42 sec)`——等待时长就是你打 COMMIT 花掉的秒数。若一直不提交，B 在默认 50 秒后收到真实报错：

```text
ERROR 1205 (HY000): Lock wait timeout exceeded; try restarting transaction
```

## 10. 修改实验

实验一：把会话 A 改成 RC（`SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED`）重跑第 9 节实验一。预测 A 的两次 COUNT（提示：第二次 SELECT 重拍了名单，新行的 trx_id 还在名单里吗）。

实验二：实验一里把 B 的 INSERT 换成 `UPDATE flash_sale SET stock = stock - 1 WHERE id = 1;` 并提交，预测 A 的 COUNT(*) 与 `SELECT stock FROM flash_sale WHERE id = 1;` 各输出什么（提示：UPDATE 不产生新行，旧版本还在链上）。

## 11. 常见错误与调试实录

**误读一：「RR 就没有幻读」。** 半真。纯快照读成立；混入当前读就破防（第 8 节）；纯当前读则靠间隙锁守住。答题前先问「哪种读」。

**误读二：「先查再写很安全」。** 调试实录：订单防重逻辑「先 SELECT 查有无此单号，没有则 INSERT」，RR 下压测撞出真实报错：

```text
ERROR 1062 (23000): Duplicate entry 'DD-20260927-001' for key 'orders.uk_order_no'
```

读现象三步：两个请求都在对方提交前执行了 SELECT——快照读看不见彼此未提交的插入，于是都判定「单号不存在」，都去 INSERT，唯一键拦下后到的那个。业务没崩是唯一键的功劳，不是检查逻辑的功劳。修法是放弃「先查后插」：靠唯一约束兜底并用 `INSERT ... ON DUPLICATE KEY UPDATE` 原子写入，或把检查升级为 `SELECT ... FOR UPDATE` 当前读。

**误读三：「FOR UPDATE 随手就加」。** 它锁的是**扫描路径上**的所有行：WHERE 不走索引时锁的是全表扫描碰到的每一行，近似锁全表。加锁读之前先 EXPLAIN 确认走索引（[EXPLAIN 逐列读懂](/mysql/320-EXPLAINDetailed)）。

## 12. 实际场景：防超卖为什么要绕开快照

秒杀扣库存，错误写法正是本章两悬案的合体：

```sql
-- 差：检查是快照读，看到的是旧库存，高并发下大家一起通过
SELECT stock FROM flash_sale WHERE id = 2;              -- 10
UPDATE flash_sale SET stock = stock - 1 WHERE id = 2;   -- 每个事务都敢扣

-- 好 A：原子扣减，WHERE 条件在当前读下裁决，不够就不更新（影响行数 0 即售罄）
UPDATE flash_sale SET stock = stock - 1 WHERE id = 2 AND stock > 0;

-- 好 B：必须先读后算的业务（如涉及运费、分摊），用当前读锁住再算
SELECT stock FROM flash_sale WHERE id = 2 FOR UPDATE;
```

反过来，报表、对账、导出这类「要一致性不要实时」的场景，正该用 RR 快照读：跑多久都不阻塞交易，代价只是看到拍照那刻的世界。选型分水岭一句话：**写入路径用当前读，观察路径用快照读；两者同事务混用时，想清楚你要哪一帧**。

## 13. 小练习

预测题（10 分钟）：RR 事务 A 拍照时 `m_ids=[100, 150]，min=100，max=160`。随后 trx 100 提交、trx 200 提交、trx 150 回滚。A 的快照读能看到哪些 trx 的修改？答案自下而上：都看不到——100 仍在名单里（规则 4），200 属于「未来」（规则 3），150 未提交且已回滚，本来就不存在。

挑战题（半小时）：用两个会话设计并跑通一组实验，证明「RC 不可重复读、RR 可重复读」来自同一套规则。验收清单：完整时间线表（谁在 T 几执行什么）；每个读操作附四条规则的逐步裁决；RC 读出两个值、RR 读出同一个值；RC 与 RR 只用一行 SET 语句切换并解释为什么够用。

## 14. 与之前和之后的知识的关系

- 往前：[MVCC 原理](/mysql/430-MVCCPrinciple) 给了本文全部武器——版本链、ReadView、四条规则；[事务隔离级别底层实现](/mysql/420-TransactionIsolationImplementation) 的级别全景在本文兑现成可推演的细节；
- 往后：[间隙锁与临键锁解决幻读](/mysql/470-GapLockNextKeyLockSolutionPhantomRead) 接手第 8 节留下的钩子——当前读怎么用间隙锁把幻影从源头锁死；[锁分类](/mysql/450-LockClassification) 提供读锁的全景地图，[死锁检测与处理](/mysql/480-DeadlockDetectionHandling) 处理间隙锁的死锁副作用。

## 15. 官方文档

- 一致性非锁定读（RC/RR 的快照读语义与示例）：https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html
- 加锁读（FOR UPDATE / FOR SHARE 与唯一索引约束）：https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html

## 16. 自我检查

- 能不查资料说出 RC 与 RR 的唯一机制差异，并手工推演出两条时间线的读数；
- 能回答「RR 有没有幻读」并主动追问对方「你说的读是哪种读」；
- 面对防重、防超卖需求，能立刻说出快照读检查为什么无效、正确写法是哪两种；
- 见到 ERROR 1205 知道先查 sys.innodb_lock_waits 再找 blocking 事务。

## 本章总结

RC 与 RR 的全部差别是 ReadView 的拍照时机：条条重拍则每次读到最新已提交，一张用到底则事务内读数恒定——同一套四条规则，两条时间线推出两种结果。幻读在快照读下被快照挡住、并未消失；当前读（FOR UPDATE、FOR SHARE、UPDATE、DELETE、INSERT）不吃快照、读最新并加锁，RR 靠间隙锁守住当前读的一致性。混用时一切以当前读为准，写入路径永远别信快照里的检查结果。

## 下一步

进入 [锁分类](/mysql/450-LockClassification)：本文反复出现的「记录锁、间隙锁」还只是名字，下一篇把它们排成全景地图；间隙锁如何精确堵死第 8 节那条裂缝，[间隙锁与临键锁解决幻读](/mysql/470-GapLockNextKeyLockSolutionPhantomRead) 有完整答案。
