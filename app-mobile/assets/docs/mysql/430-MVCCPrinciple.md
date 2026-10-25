---
order: 460
title: MVCC 原理：读写不互相阻塞是怎样实现的
module: 'mysql'
category: 数据库
difficulty: advanced
description: 以「在线商店白天改价、用户随时能看」引入：快照读与锁读的分野、隐藏字段与 undo log 版本链、ReadView 四字段与可见性四条规则的逐步推演，附 Purge 观测与长事务排查实录。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'mysql/440-MVCCSnapshotCurrentRead'
  - 'mysql/420-TransactionIsolationImplementation'
  - 'mysql/510-UndoLog'
  - 'mysql/470-GapLockNextKeyLockSolutionPhantomRead'
prerequisites:
  - 'mysql/420-TransactionIsolationImplementation'
  - 'mysql/110-SQLDataOperationQuery'
---

## 前置知识

- 已完成 [事务隔离级别底层实现](/mysql/420-TransactionIsolationImplementation)：见过「快照读、当前读」这两个词，没读过也能跟；
- 已完成 [SQL 数据操作与查询](/mysql/110-SQLDataOperationQuery)：会跑 SELECT 和 UPDATE。

本篇与 [MVCC 快照读与当前读](/mysql/440-MVCCSnapshotCurrentRead) 的分工：**430 主教学——版本链怎么长出来、ReadView 拿什么规则裁判「哪个版本归你看」；440 深水区——把同一套规则放进 RC 与 RR 两种拍照时机推出两种结果，并讲清当前读为什么不吃这一套**。先把裁判规则学会。

## 学习目标

读完本文你将能够：

1. 一眼看穿一条 SQL 是快照读还是锁读，说出 MVCC 服务的是哪一种；
2. 对着一行数据画出它的版本链，说清 DB_TRX_ID 与 DB_ROLL_PTR 各干了什么；
3. 背出 ReadView 四个字段，用四条规则对版本链上任意版本做出可见性裁决；
4. 观测 History list length，解释长事务为什么能让 undo 膨胀、把整库读慢。

预计 60 分钟，需要两个终端窗口。

## 1. 你现在要解决什么问题

线上商店，运营下午三点把键盘从 128 元改到 108 元，同一时刻成千上万的用户正在浏览商品页。最朴素的解法是读写互斥：用户读时锁行，运营的 UPDATE 等所有人读完；高峰期人人在读，改价永远排队，反过来先改价所有浏览一起卡住。InnoDB 的答案是 MVCC（Multi-Version Concurrency Control，多版本并发控制）：**数据保留多个历史版本，读的人挑一个自己「该看」的版本，写的人只改最新版本**。读不阻塞写，写不阻塞读。但「该看的版本」谁说了算？凭什么你看 108、他看 128？本文就是这套裁判规则的完整说明书。

## 2. 准备现场：一张会改价的商品表

```sql
USE test;

CREATE TABLE products (
  id   INT PRIMARY KEY,
  name VARCHAR(30) NOT NULL,
  price INT NOT NULL
);
INSERT INTO products VALUES (1, '机械键盘', 128), (2, '游戏鼠标', 79);
SELECT @@transaction_isolation;   -- REPEATABLE-READ，InnoDB 默认，后面所有推演基于它
```

## 3. 快照读与锁读：先分清两种读

MVCC 只服务一种读。判断标准一句话：**不带加锁后缀的普通 SELECT 是快照读**。

```sql
-- 快照读：走 MVCC，读「我该看的版本」，不加锁
SELECT price FROM products WHERE id = 1;

-- 锁读（locking read）：读「此刻最新已提交」的版本，并加锁
SELECT price FROM products WHERE id = 1 FOR UPDATE;   -- 排他
SELECT price FROM products WHERE id = 1 FOR SHARE;    -- 共享（8.0+ 语法）
```

UPDATE、DELETE、INSERT 长得不像 SELECT，但定位行的方式与锁读一致，统称「当前读」——为什么改数据不能读快照，440 篇专讲。边界记两条：READ UNCOMMITTED 直接读最新值、不判可见性；SERIALIZABLE 把普通 SELECT 升级成锁读。**MVCC 只在 RC 与 RR（默认）两个级别下工作**。

## 4. 版本链的诞生：两个隐藏字段加一条 undo 链

SHOW CREATE TABLE 里永远找不到它们，但 InnoDB 给每行偷偷塞了三个隐藏字段：

| 隐藏字段 | 大小 | 作用 |
| --- | --- | --- |
| DB_TRX_ID | 6 字节 | 最后一次插入或修改这行的事务 ID |
| DB_ROLL_PTR | 7 字节 | 回滚指针，指向 undo log 里这行的上一版本 |
| DB_ROW_ID | 6 字节 | 表既无主键也无非空唯一键时才出现，充当聚簇键 |

事务 ID 哪来的？每个事务开启时从系统领一个递增编号。每次 UPDATE，旧行不删，先抄进 undo log，新行的 DB_ROLL_PTR 指向它。拿 1 号商品举例，trx 50 插入 128 已提交，trx 60 改成 99 已提交，trx 70 改成 89 未提交，此刻它串成一条链：

```text
当前行 {price=89, trx_id=70} → undo {price=99, trx_id=60} → undo {price=128, trx_id=50} → NULL
 最新                                                                    越往右越旧
```

这就是**版本链**。INSERT 只产生「记主键」的轻量 undo，提交后即可回收；UPDATE/DELETE 的旧版本要等「确认没有读者还需要它」才能清理——谁来确认，第 8 节的 Purge 见。

## 5. 实验：你自己的修改，未提交也看得见

```sql
-- 会话 A
BEGIN;
UPDATE products SET price = 99 WHERE id = 1;
SELECT price FROM products WHERE id = 1;   -- 99：自己的未提交修改可见
ROLLBACK;
SELECT price FROM products WHERE id = 1;   -- 128：回滚生效，回到原值
```

事务没提交你就能看到 99——这条铁律对应裁判规则的第一条，先记住现象。

## 6. ReadView：可见性的裁判

事务执行**第一条快照读**时，InnoDB 发给它一张 ReadView，内容是「此刻的活跃事务名单 + 我自己的编号」：

```text
ReadView {
  creator_trx_id : 80        -- 我自己的事务 ID
  m_ids          : [70, 80]  -- 拍照瞬间所有活跃（未提交）事务 ID，含我自己
  min_trx_id     : 70        -- m_ids 的最小值
  max_trx_id     : 81        -- 系统下一个将要分配的 ID（注意：不是 m_ids 的最大值）
}
```

两个易错点现在钉死：max_trx_id 是「下一个将分配」，天然比已发出的都大；RC 每条 SELECT 重拍一张，RR 拍一张用到底——**RC 与 RR 的全部差别只是拍照时机**，它如何推出两种隔离结果，是 440 篇的正题。

## 7. 可见性判断：四条规则加一次完整推演

对版本链上某版本的 trx_id，按顺序回答四个问题：

```text
1. trx_id == creator_trx_id ?  是 → 可见（我自己改的，未提交也可见）
2. trx_id <  min_trx_id    ?  是 → 可见（拍照前就已提交）
3. trx_id >= max_trx_id    ?  是 → 不可见（拍照后才开启的事务，属于「未来」）
4. min_trx_id <= trx_id < max_trx_id ?
       在 m_ids 里   → 不可见（拍照那刻还没提交）
       不在 m_ids 里 → 可见（拍照前已提交）
不可见 → 沿 DB_ROLL_PTR 退回上一版重新回答；链走到头仍不可见，当没查到这行。
```

完整推演。沿用第 4 节的版本链，追加两个动作：

```text
T0  trx 50 INSERT 128 已提交；trx 60 UPDATE 99 已提交；trx 70 UPDATE 89 未提交
T1  会话 A（trx 80，RR）SELECT price，拍下 ReadView：
      m_ids=[70, 80]，min=70，max=81，creator=80
T2  trx 90（T1 之后才开启）UPDATE price=59
T3  会话 A 再查 price，从当前行逐步裁决：
      {59,  trx 90}：90 >= 81          → 不可见（规则 3），往旧走
      {89,  trx 70}：70 在 m_ids 里    → 不可见（规则 4），往旧走
      {99,  trx 60}：60 < 70 = min     → 可见  （规则 2）
    A 读到 99。
```

三个版本三次裁决：一步跳过「未来」，一步挡住「未提交」，最后落在「拍照前已提交」。注意反直觉处：把 T2 的 trx 90 改成**已提交**，答案也不变——规则里没有「对方现在提交了没有」，只有「你拍照那刻它是死是活」。

## 8. 实验：读写真的不互相阻塞吗

两个终端合唱。会话 A 开事务读，会话 B 改价：

```sql
-- 会话 A
BEGIN;
SELECT price FROM products WHERE id = 1;   -- 读到 128
-- A 停在这里，事务不提交

-- 会话 B（另一终端，默认自动提交）
UPDATE products SET price = 108 WHERE id = 1;
```

预期输出（B 这边）：

```text
Query OK, 1 row affected (0.01 sec)      （B 的 UPDATE 瞬间成功）
```

B 的 UPDATE **瞬间成功**，没被 A 的未提交事务卡住——读不加锁。切回 A：

```sql
SELECT price FROM products WHERE id = 1;   -- 仍是 128（读的是快照）
COMMIT;
SELECT price FROM products WHERE id = 1;   -- 108（新事务新快照）
```

两头对照：B 没等 A，A 没看到 B。代价是 A 刚才一直在沿版本链回溯旧值——它提交后再读，B 的 108 才露面，表里的真实值早就变了。

## 9. 修改实验

每个先写预测再动手，基于第 8 节现场。

实验一：在第 8 节会话 A 的 BEGIN 之后、SELECT 之前插一句 `UPDATE products SET price = 100 WHERE id = 1;`。预测 A 的 SELECT 读到多少、B 的 108 能否被 A 看到（提示：四条规则里谁排第一）。

实验二：把时序倒过来——A 先 BEGIN，B 先 UPDATE 并提交，A 才执行第一条 SELECT。预测 A 读到 128 还是 108（提示：拍照那一刻，108 属于哪个世界）。

实验三：A 拍照后，另一事务把价格改成 60 并**提交**，A 再 SELECT。预测读到的值，把每一步落在四条规则上写出来。

## 10. 常见错误与调试实录

**误读一：「ReadView 在 BEGIN 时生成」。** 不是，是第一条快照读时拍；要从严对齐一致性起点，用 `START TRANSACTION WITH CONSISTENT SNAPSHOT`。

**误读二：「对方提交了我就该看见」。** RR 下不见得——提交发生在你拍照之后，对你永远不可见（第 7 节的 trx 70 换成已提交照样被挡）。

**误读三：「读不加锁等于零成本」。** 版本链很长时，快照读要逐版回溯，极端情况一次读爬上千个版本。MVCC 把「读等写」换成了「读多走几步」。

调试实录：同事报障「报表服务上线后磁盘持续上涨，普通查询也变慢」。三步定位。第一步看 purge 积压：

```sql
SHOW ENGINE INNODB STATUS\G
```

```text
History list length 2101441      （TRANSACTIONS 段节选）
```

`History list length` 是等待清理的 undo 单元数，正常几千以内，两百万意味着有快照把整条历史钉住了。第二步找元凶：

```sql
SELECT trx_id, trx_started,
       TIMESTAMPDIFF(SECOND, trx_started, NOW()) AS age_sec
FROM information_schema.INNODB_TRX
ORDER BY trx_started;
-- 预期一行：trx_id=42170，age_sec=14622（四小时前的只读报表事务）
```

它拍照之后产生的**所有**版本都删不得。第三步处置：让业务方提交或断开，紧急时 `KILL 42170;`。想亲手复现，下一节给你一条 1000 次改价的时间线。

## 11. 实际场景：什么时候要惦记 MVCC

- **报表与在线交易并行**：报表用 RR 慢慢扫快照，运营改价、用户下单照常——MVCC 的红利，也是开头场景的答案；
- **长事务巡检是日常功课**：把第 10 节的 INNODB_TRX 查询放进监控，age_sec 超 60 秒告警；
- **何时不用惦记**：全是短小自动提交事务的系统，版本链转瞬被 Purge 回收。需要你出手的，永远是「长」与「大」。

亲手钉住一次 Purge，看版本链如何变成账单：

```sql
-- 会话 A：开一个长事务，拍一张快照
BEGIN;
SELECT * FROM products;

-- 会话 B：批量改价 1000 次（过程语法第 770 篇展开）
DELIMITER //
CREATE PROCEDURE bump_price(IN times INT)
BEGIN
  WHILE times > 0 DO
    UPDATE products SET price = price + 1 WHERE id = 1;
    SET times = times - 1;
  END WHILE;
END //
DELIMITER ;
CALL bump_price(1000);
```

观测：期间反复执行 `SHOW ENGINE INNODB STATUS\G`，History list length 爬到 1000 上下并**停在原地**——1000 个旧版本全被会话 A 的快照钉住；A COMMIT 后等几秒再看，数字掉回接近 0，Purge 终于开工。数值以你的实例为准，趋势不变。

## 12. 小练习

预测题（5 分钟）：ReadView 为 `m_ids=[200, 400]，min=200，max=500，creator=400`，某行版本链从新到旧是 `{X, trx 600}`、`{Y, trx 300}`、`{Z, trx 100}`，快照读返回哪个值？答案自下而上：Z——600 触发规则 3，300 触发规则 4，100 触发规则 2。

修改题（10 分钟）：把 `CALL bump_price(1000)` 改成 50，预测 History list length 的最终量级；回答为什么 COMMIT 前它回不到 0。验收：COMMIT 后观测到明显回落。

修 Bug 题（15 分钟）：`SHOW ENGINE INNODB STATUS` 给出 `History list length 1832761`。按第 10 节三步走：解释数字含义、写出找元凶的 SQL、给出两种处置及风险（提示：KILL 会回滚那个事务已做的工作）。

挑战题（半小时）：写一条巡检 SQL，列出存活超 60 秒的事务，按存活时长倒序。验收：无长事务时返回空集；返回列至少含 trx_id、trx_started、age_sec。

## 13. 与之前和之后的知识的关系

- 往前：[事务隔离级别底层实现](/mysql/420-TransactionIsolationImplementation) 给出「快照读交给 MVCC、当前读交给锁」的全景，本文把 MVCC 这一半拆到字段级；[撤销日志](/mysql/510-UndoLog) 只在本文客串版本链的载体；
- 往后：[MVCC 快照读与当前读](/mysql/440-MVCCSnapshotCurrentRead) 是本文的深水区——同一套规则换一个拍照时机，推出 RC 与 RR 的全部差异，并补上当前读半边天；[间隙锁与临键锁解决幻读](/mysql/470-GapLockNextKeyLockSolutionPhantomRead) 接手「当前读不许插入」的那一半。

## 14. 官方文档

- 一致性非锁定读（ReadView 与快照读的权威描述）：https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html
- InnoDB 多版本化（隐藏字段与 undo 记录）：https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html

## 15. 自我检查

- 能默写四条可见性规则，并对一条三节点的版本链逐步裁决出结果；
- 能说出 max_trx_id 与 m_ids 的区别，以及 ReadView 拍在 BEGIN 还是第一条快照读；
- 能向同事解释「A 查不到 B 已提交的修改」为什么不是 bug；
- 记得 History list length 的健康量级与它的钉子是谁。

## 本章总结

MVCC 让读写互不阻塞：写的人改最新版本，读的人沿版本链回溯。链由 DB_TRX_ID 与 DB_ROLL_PTR 串起 undo 里的旧版本；ReadView 四字段加四条规则裁决可见性，不可见就往旧走。RR 一张快照用到底，RC 每读重拍——差异只在拍照时机。快照钉住的旧版本 Purge 不敢删，长事务因此是 MVCC 体系的第一事故源。规则已备，「RR 到底有没有幻读」还没答案——下一篇拆当前读。

## 下一步

进入 [MVCC 快照读与当前读](/mysql/440-MVCCSnapshotCurrentRead)：把四条规则放进 RC 与 RR 两条时间线各推一遍，亲眼看到「同一规则、两种结果」，以及当前读为什么绕开快照、带来了什么新麻烦。
