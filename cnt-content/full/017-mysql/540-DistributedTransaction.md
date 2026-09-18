---
order: 540
title: 分布式事务：XA 两阶段提交与它的替代品
module: 'mysql'
category: 数据库
difficulty: advanced
description: 跨库事务的完整图谱：XA 协议与两阶段提交的角色分工、MySQL XA 语法实操、协调者单点与锁定放大两大死穴、以及本地消息表/Saga/TCC 三条务实替代路线。
author: fanquanpp
updated: '2026-09-18'
related:
  - 'mysql/530-TwoPhaseCommit'
  - 'mysql/680-ShardingMiddleware'
  - 'mysql/460-TransactionLockMechanism'
  - 'mysql/450-LockClassification'
prerequisites:
  - 'mysql/420-TransactionIsolationImplementation'
  - 'mysql/530-TwoPhaseCommit'
---

## 前置知识

- 事务 ACID 与隔离级别（[事务与隔离级别](/mysql/420-TransactionIsolationImplementation)）；
- 内部两阶段提交（redo log 与 binlog 之间的 [两阶段提交](/mysql/530-TwoPhaseCommit)）——那是 MySQL 内部保证崩溃一致的机制，本篇讲的是**跨数据库实例**的分布式事务，概念同源、层次不同。

## 问题引入：一笔转账跨了两个库

分库之后（[分库分表中间件](/mysql/680-ShardingMiddleware)），经典业务动作"扣款加余额"被拆到了两个 MySQL 实例：

```text
实例 A：UPDATE accounts SET balance = balance - 100 WHERE user_id = 1;
实例 B：UPDATE accounts SET balance = balance + 100 WHERE user_id = 2;
```

两个本地事务各自都可靠，但组合起来不原子：A 成功、B 失败时，100 元凭空消失。**单库的 ACID 跨不过实例边界**——分布式事务就是解决这个问题（或学会与它共处）的学问。

## XA 协议：两阶段提交的标准答案

XA 是 X/Open 定义的标准协议，三个角色：**AP**（应用程序，发起方）、**TM**（事务管理器，协调者）、**RM**（资源管理器，各数据库实例）。MySQL 实例可以作为 RM 参与协议，协调者由应用或中间件扮演。

协议分两阶段：

```text
阶段一（准备）：TM 问所有 RM"能提交吗？"
  - 每个 RM 执行变更、写好日志，锁定资源，回复 READY
  - 此后 RM 进入"只等号令"状态，任何一方没 READY，全局回滚

阶段二（提交/回滚）：TM 收齐全部 READY 才发 COMMIT，否则发 ROLLBACK
  - 各 RM 收到指令后正式提交或回滚、释放锁
```

### MySQL XA 语法实操

```sql
-- ===== 实例 A（扣款方）=====
XA START 'transfer_001';
UPDATE accounts SET balance = balance - 100 WHERE user_id = 1;
XA END 'transfer_001';        -- 本实例的业务 SQL 结束
XA PREPARE 'transfer_001';    -- 阶段一：准备（锁已加、日志已落盘）

-- ===== 实例 B（收款方）=====
XA START 'transfer_001';
UPDATE accounts SET balance = balance + 100 WHERE user_id = 2;
XA END 'transfer_001';
XA PREPARE 'transfer_001';

-- ===== 协调者：两个都 READY，进入阶段二 =====
-- 实例 A：XA COMMIT 'transfer_001';
-- 实例 B：XA COMMIT 'transfer_001';
-- 任一实例 PREPARE 失败：两边都 XA ROLLBACK 'transfer_001';

-- 运维排查：查看处于 PREPARED 悬挂状态的事务
XA RECOVER;
```

`XA RECOVER` 是关键运维命令：如果协调者在阶段二之前崩溃，各实例上会留下悬挂的 PREPARED 事务（锁全部保持着！），需要人工 `XA COMMIT/ROLLBACK` 裁决——这就是下一节要讲的死穴之一。

## 两大死穴：为什么大厂都在逃离 XA

**死穴一：协调者单点与悬挂事务**。两阶段提交的阿喀琉斯之踵在阶段一与阶段二之间：协调者崩溃后，所有 RM 拿着锁等裁决——转账双方的资金被无限期冻结。协调者必须自己做日志与恢复（高可用协调者本身就是个分布式问题），这套复杂度转移给了应用层。

**死穴二：锁定放大**。本地事务的锁只持到本地提交；XA 事务的锁从 PREPARE 一直持到全局 COMMIT——跨实例网络往返的每一毫秒都在放大锁窗口。并发一上来，锁冲突、连接占用、吞吐坍缩连环出现。**XA 的吞吐通常只有本地事务的几分之一**。

此外还有工程限制：MySQL XA 不支持嵌套、XA 事务期间不能用 SAVEPOINT、与复制的交互（PREPARED 未 COMMIT 的事务不进 binlog，主从切换时可能丢失悬挂事务的裁决依据）。

## 务实替代：三条主流路线

互联网业务的共识是**能不用强一致就不用**，按业务语义三选一：

### 路线一：本地消息表（最终一致，最常用）

把"跨库写"改造成"本地事务 + 异步补偿"：

```text
1. 实例 A 的本地事务里同时写：扣款 + 一条"待发送消息"（同库同事务，天然原子）
2. 后台任务轮询消息表，调用实例 B 的接口完成加钱
3. B 成功后标记消息已处理；失败则重试（要求 B 的接口幂等）
```

本质是把"全局原子"换成"本地原子 + 可重试的最终一致"。资金到账晚几秒，但账目最终必定正确——绝大多数业务（通知、积分、发货）完全可接受。

### 路线二：Saga（长流程拆成补偿链）

把一个大事务拆成一串本地事务，每步配一个**补偿动作**：第 N 步失败，反向执行 N-1 到 1 的补偿（取消订单、退回库存、退回扣款）。适合流程长的业务（下单到履约），一致性模型是"没有孤岛状态，但中间态对外可见"。

### 路线三：TCC（Try-Confirm-Cancel，资金强一致场景）

业务层自己实现两阶段：Try 预留资源（冻结 100 元而非直接扣）、Confirm 确认（真扣）、Cancel 取消（解冻）。把数据库的锁问题转化为业务字段的状态机，性能远好于 XA，代价是每个参与方都要写三个接口，侵入性最强。

| 路线 | 一致性 | 性能 | 侵入性 | 适合 |
| --- | --- | --- | --- | --- |
| XA/2PC | 强一致 | 差 | 低（协议层） | 传统金融、低并发强一致 |
| 本地消息表 | 最终一致 | 好 | 中（消息表+轮询） | 绝大多数互联网业务 |
| Saga | 最终一致（补偿链） | 好 | 中 | 长流程编排 |
| TCC | 准强一致 | 较好 | 高（三接口） | 资金核心链路 |

## 动手环节：亲手制造一次悬挂

理解死穴最快的方式是复现它（单机两个库即可）：

```sql
-- 在实例 A 上走到 PREPARE，然后"扮演崩溃的协调者"——不发 COMMIT
XA START 'hang_demo';
CREATE TABLE IF NOT EXISTS t1 (id INT) ;
INSERT INTO t1 VALUES (1);
XA END 'hang_demo';
XA PREPARE 'hang_demo';

-- 新开会话观察：事务悬挂、锁被持有
XA RECOVER;        -- 看到 hang_demo 处于 xid 列表
-- 另一会话尝试操作 t1：被阻塞（行锁/表锁仍被 PREPARED 事务持有）

-- 以 DBA 身份裁决
XA COMMIT 'hang_demo';   -- 或 ROLLBACK；裁决后锁释放
```

阻塞现象亲历一遍，"协调者崩溃导致资源冻结"就不再是文档里的一句话，而是你手上真实发生过的故障。

## 常见困惑

**"MySQL 内部的两阶段提交和 XA 是一回事吗？"**——机制同源（都是先准备再提交），层次不同：内部 2PC 协调的是**同一个实例的 redo log 与 binlog**，保证崩溃后主库自洽（[两阶段提交](/mysql/530-TwoPhaseCommit)）；XA 协调的是**多个实例**。前者对用户透明，后者需要应用编排。

**"Seata 是什么，和 XA 什么关系？"**——Seata 是流行的分布式事务框架，提供 AT（自动补偿，对业务近似透明）、TCC、Saga 等多种模式，AT 模式底层也借了两阶段思想但锁机制更轻。选框架前先问业务要不要强一致——大多数场景本地消息表就够，框架是给真需要的团队准备的。

**"能不能用消息队列代替？"**——本地消息表的进化版：事务消息（RocketMQ）或"本地表 + MQ 投递"，思想相同（本地原子 + 可重试投递），用 MQ 替掉轮询的实时性短板。前提不变：**消费端必须幂等**。

## 检验清单

- 能画出 2PC 两个阶段的消息时序，说出 XA 协议三个角色的分工；
- 能复述两大死穴（协调者悬挂与锁定放大）并用 XA RECOVER 演示过悬挂裁决；
- 能按业务场景在本地消息表/Saga/TCC/XA 中给出选型与理由；
- 记住替代方案的共同前提：消费端幂等。

## 下一步

跨库一致性之外，跨实例的另一课是高可用：进入[复制与高可用](/mysql/640-ReplicationHA)，看主从架构如何兜住"单机必然故障"的现实。
