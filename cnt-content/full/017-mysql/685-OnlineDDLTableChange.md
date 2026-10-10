---
order: 720
title: 大表变更：Online DDL 与影子表工具
module: 'mysql'
category: 数据库
difficulty: beginner
description: 千万行表加一列为什么能卡住业务四十分钟：INSTANT / INPLACE / COPY 三种算法的成本模型、显式声明让失败提前、gh-ost 与 pt-osc 的影子表思路，以及与主从延迟的联动。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'mysql/090-SQLDataDefinitionAdvanced'
  - 'mysql/650-ReplicationDelayCauseSolution'
  - 'mysql/660-PartitionedTable'
  - 'mysql/670-ShardingStrategy'
prerequisites:
  - 'mysql/090-SQLDataDefinitionAdvanced'
  - 'mysql/220-ClusteredIndexSecondaryIndex'
---

## 前置知识

- DDL 基本语法（[SQL 数据定义进阶](/mysql/090-SQLDataDefinitionAdvanced)）——本文专注"改大表"这个生产场景；
- 聚簇索引即数据的结构（[聚簇索引与二级索引](/mysql/220-ClusteredIndexSecondaryIndex)）——理解"重建表"为什么昂贵的前提；
- 主从复制延迟的成因（[主从复制延迟原因与解决](/mysql/650-ReplicationDelayCauseSolution)）——大表变更最大的连带伤害。

## 故事引入：四十分钟的加列

一张 5000 万行的订单表，产品要求加一列 `refund_status`。开发在业务高峰敲下：

```sql
ALTER TABLE orders ADD COLUMN refund_status TINYINT NOT NULL DEFAULT 0;
```

结果：这条 ALTER 跑了四十分钟，期间写入排队、连接池打满、主从延迟飙升到一小时。而在另一张同规模的表上，同事做过几乎一样的加列，**不到一秒完成**。

差别不在运气，在**算法**：前一条被某种原因（版本、写法、表特性）降级成了"重建全表"的路径，后一条走的是"只改元数据"的路径。理解 Online DDL，就是理解**同一条 ALTER 背后的三条执行路径，各自的成本模型与触发条件**——这是 DBA 与后端工程师协作变更表结构的共同语言。

## 心智模型：三种算法，三种成本

MySQL 8.0 的 InnoDB 执行 DDL 时按代价从低到高有三条路径，用 `ALGORITHM` 子句显式指定或由优化器自动挑选（8.0.29 起**默认优先尝试 INSTANT**，不行再降级 INPLACE，最后才 COPY）：

```text
INSTANT  只改数据字典（元数据），数据行一个字节都不动   → 秒级
INPLACE  InnoDB 内部重建：扫描原表、生成新结构、增量应用 → 分钟到小时级，期间可读写
COPY     Server 层复制：SELECT 全表 → 写入临时表 → 换名  → 期间只许读（写锁）
```

三张对照画像（把它们想成三种装修方式）：

| 算法 | 类比 | 数据是否复制 | 并发 DML | 耗时量级 | 典型操作 |
| --- | --- | --- | --- | --- | --- |
| INSTANT | 改门口的楼层指示牌 | 否，仅元数据 | 允许 | 秒级（与表大小无关） | 加列（8.0.12 起）、改列名、改默认值 |
| INPLACE | 仓库内部翻新 | 内部重建，不经过 Server | 允许（`LOCK=NONE`） | 与表大小成正比 | 加/删索引、加主键 |
| COPY | 搬到临时仓库再搬回来 | 是，全表复制 | 只许读 | 与表大小成正比，最慢 | 改列数据类型、转字符集 |

记忆锚点：**INSTANT 改的是"说明书"，INPLACE 在仓库里翻新，COPY 是搬家**。表越大，三者差距越悬殊——INSTANT 与表大小无关，这正是它对大表的价值。

### 各算法的关键事实（写变更方案前核对）

1. **INSTANT 的版本节点**：8.0.12 引入（加列仅限最后一列）；8.0.29 扩展到**任意位置加列、删列**并成为默认优先算法。注意 8.0.29 本身因 INSTANT 加删列相关的数据损坏缺陷被撤包，**修复在 8.0.30**——生产用 8.0.30 及以后再放心使用 INSTANT 加删列；
2. **INPLACE 不等于轻量**：加索引虽不复制数据，仍要构建一棵完整 B+ 树；加列虽从 8.0.29 起可 INSTANT，但很多变更（如改列类型）只有 COPY 一条路；
3. **COPY 期间写锁**：`LOCK=SHARED` 是它的默认并发级别——业务只读不写。这正是故事里"写入排队"的元凶；
4. 元数据锁（MDL）的隐形杀手：即便走 INSTANT，ALTER 也需要拿表的**排他 MDL**。若此刻有长事务/慢查询持有该表的共享 MDL，ALTER 会排队，**排在它后面的所有新查询也跟着排队**——秒级 DDL 也能演变成全站故障（排查与治理见[事务锁机制](/mysql/460-TransactionLockMechanism)）。

## 显式声明：让失败发生在第一秒

自动选算法的隐患是**你以为在走快路径，实际走了慢路径**。生产变更的第一纪律是把预期写进语句：

```sql
-- 预期秒级完成：显式要求 INSTANT
ALTER TABLE orders ADD COLUMN refund_status TINYINT NOT NULL DEFAULT 0, ALGORITHM=INSTANT;

-- 预期不阻塞写入：显式要求并发级别
ALTER TABLE orders ADD INDEX idx_user_created (user_id, created_at), ALGORITHM=INPLACE, LOCK=NONE;
```

显式声明把"选错路径"从**变更执行到一半才发现**，变成**变更开始的第一个报错**：

```text
ERROR 1846 (0A000): ALGORITHM=INSTANT is not supported.
Reason: Cannot alter column type INPLACE. Try ALGORITHM=COPY.
```

这条报错是好消息：它发生在 0 秒而不是 40 分钟。变更工单的正确姿势：先在**等比缩小的影子库**（生产同版本、同结构、真实分布的抽样数据）上 EXPLAIN 式地试一遍 `ALGORITHM=INSTANT` / `ALGORITHM=INPLACE, LOCK=NONE`，确认支持后再上生产。

## 高频变更的算法速查

| 变更 | 可用算法 | 备注 |
| --- | --- | --- |
| ADD COLUMN | INSTANT（8.0.12；任意位置 8.0.29+） | 大表加列的主力路径 |
| DROP COLUMN | INSTANT（8.0.29+），否则 INPLACE 重建 | 旧版本删列是大动作 |
| RENAME COLUMN | INSTANT | 只改元数据 |
| SET / DROP DEFAULT | INSTANT | 只改元数据 |
| ADD INDEX / DROP INDEX | INPLACE，可 `LOCK=NONE` | 构建 B+ 树，与表大小成正比 |
| ADD PRIMARY KEY | INPLACE，重建表 | 删主键单独做是 COPY，慎之又慎 |
| MODIFY COLUMN 改数据类型 | COPY（写锁） | 唯一路径；大表需影子表工具绕行 |
| CONVERT TO CHARACTER SET | COPY（写锁） | 建表时选对字符集就是最好的变更 |
| OPTIMIZE TABLE | INPLACE，重建表 | 碎片整理的成本模型同 INPLACE |

读表的方法：**先看有没有 INSTANT 路径，再看 INPLACE 能不能 LOCK=NONE，COPY 是最后的选择**。改列数据类型排在"最需要影子表工具"名单首位——它没有在线路径。

## 影子表工具：INSTANT 覆盖不到的怎么办

INSTANT/INPLACE 已解决"能不能不锁写"，但解决不了"耗时长、占资源、主从延迟、不可控"这四件事。INPLACE 重建一张 5000 万行的表，无论放哪个低峰都要跑几十分钟，期间磁盘占用翻倍、binlog 洪峰拖累从库。影子表工具的思路换了一条路：**不"改"表，而是"搬"表**——建一张目标结构的新表，把数据分批搬过去，搬迁期间同步增量，最后原子换名：

```text
1. CREATE TABLE _orders_new LIKE orders; 再在 _orders_new 上执行 DDL（空表，秒完成）
2. 分批把 orders 的存量数据搬进 _orders_new（每批几千行，插入压力可控）
3. 搬迁期间，把 orders 上的增量变更持续同步到 _orders_new
4. 追平后，一个原子 rename 完成 _orders_new → orders 的切换
```

两个主流实现，同思路不同增量同步手段：

| | pt-online-schema-change（pt-osc） | gh-ost |
| --- | --- | --- |
| 增量同步方式 | 原表上建 **AFTER 触发器**（INSERT/UPDATE/DELETE 三件套） | **无触发器**：伪装成从库消费 ROW 格式 binlog，回放增量 |
| 写入开销 | 每笔业务写多执行一次触发器逻辑（写放大明显） | 无触发器开销；消耗的是读 binlog 与回放 |
| 可控性 | 支持限流 | 限流、暂停、动态调整、迁移前置测试（test-on-replica）俱全 |
| 执行位置 | 通常在主库 | 可在**从库**上执行（主库几乎无感），再主从切换 |
| 前置条件 | 表需有主键或唯一键 | binlog 必须为 ROW 格式、需可连的 binlog 源 |

选型直觉：**中小表、变更简单，pt-osc 成熟省心；大表、高写入、对主库敏感，gh-ost 的无触发器与从库执行是决定性优势**。两者共同的前提纪律：变更窗口做容量评估（磁盘余量翻倍）、确认有主键、确认 binlog 格式、演练回滚（影子表机制天然可回滚——删掉影子表即可，原表从未被动过）。

## 与复制延迟的联动

三种路径对主从延迟的杀伤力完全不同：

- **COPY/INPLACE 重建**：binlog 记录的是那条 DDL 语句，从库重放时**串行地原样重建**——主库跑 40 分钟，从库再跑 40 分钟，期间延迟持续扩大且无法并行回放（详见[主从复制延迟原因与解决](/mysql/650-ReplicationDelayCauseSolution)）；
- **pt-osc/gh-ost**：产生的是**行级 DML**，从库可用并行复制消化；gh-ost 还能干脆在从库上完成整个变更。这就是影子表工具在主从架构下不可替代的第二重理由。

所以大表变更方案的固定检查项：选路径 → 估时长 → 定窗口 → **写明从库延迟预期与业务侧降级预案** → 准备回滚。

## 动手练习：三道关卡

以下练习在本地或测试库完成（MySQL 8.0.30+）。规则：先看任务与提示，自己写出操作与预期结论，再展开参考对照。核心训练的不是语法，而是"每一步变更之前，先说得出预期行为"。

**关卡 1（必做）：亲手触发三种算法**

准备一张 50 万行的表（构造方式见参考）。依次执行三个变更，每个变更前预测行为、执行时观察耗时与报错：

1. 加一列（预期走什么算法？耗时量级？）；
2. 把一个 `INT` 列 `MODIFY` 成 `BIGINT`（预期走什么算法？并发写入会怎样？）；
3. 给两个已有列建联合索引（预期算法与并发级别？）。

提示：用 `ALGORITHM=` 显式声明让每一步"要么按预期成功，要么立刻报错"；第 2 步想清楚 COPY 模式下其他会话还能不能写。

**关卡 2（必做）：失败提前到第一秒**

不改任何数据，只用显式算法声明做"探测"：对关卡 1 的表，逐一尝试把下列变更标成 `ALGORITHM=INSTANT`——加列到中间位置、改列名、改列类型、删列——记录哪些报错、报错原因是什么。最后用 `information_schema` 确认刚才"探测失败"的表结构没有任何变化。

提示：报错信息里 `Reason:` 一行就是答案；探测失败的 ALTER 是原子失败的，表不会有半点变化。

**关卡 3（选做）：写一份大表变更预案（纸面作业）**

假设生产有一张 8000 万行的日志表，需求是"加一列 + 给旧列加索引"。写一份不超过 20 行的变更预案，必须包含：目标算法与依据、预演环境与步骤、执行窗口与观察指标（至少 3 个）、从库延迟的应对、回滚动作。

提示：预案的每一行都应能回答"如果这一步出错，下一动作是什么"；算法依据引用本文速查表。

<details>
<summary>参考实现（先自己动手，再展开对照）</summary>

**关卡 1 参考流程：**

```sql
-- 准备 50 万行（公用表表达式数字序列，秒级生成）
CREATE TABLE big_t (
  id INT PRIMARY KEY AUTO_INCREMENT,
  val INT NOT NULL,
  note VARCHAR(64) NOT NULL DEFAULT ''
);
INSERT INTO big_t (val, note)
WITH RECURSIVE seq AS (
  SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 500000
)
SELECT n % 1000, CONCAT('note-', n) FROM seq;
-- 从库执行此 INSERT 时注意 max_execution_time / 递归深度上限 cte_max_recursion_depth

-- 1. 加列：预期 INSTANT（8.0.30+ 默认优先尝试），秒级、与 50 万行无关
ALTER TABLE big_t ADD COLUMN flag TINYINT NOT NULL DEFAULT 0, ALGORITHM=INSTANT;

-- 2. 改类型：预期 COPY——显式 LOCK=NONE 会立刻报错（COPY 不允许并发写）
ALTER TABLE big_t MODIFY val BIGINT NOT NULL, ALGORITHM=COPY, LOCK=SHARED;
-- 执行期间另开一个会话验证：
--   SELECT 仍可执行；INSERT INTO big_t (val) VALUES (1) 会被 MDL 排队阻塞
--   （50 万行约几秒到几十秒；生产千万行上是几十分钟起步，这正是影子表工具的用武之地）

-- 3. 加索引：预期 INPLACE + 可并发
ALTER TABLE big_t ADD INDEX idx_val_note (val, note), ALGORITHM=INPLACE, LOCK=NONE;
-- 执行期间另一会话的 INSERT 正常成功——这是 INPLACE 与 COPY 的决定性差异
```

**关卡 2 参考探测：**

```sql
-- 支持：只改元数据
ALTER TABLE big_t RENAME COLUMN note TO remark, ALGORITHM=INSTANT;   -- 成功
-- 支持：8.0.29+ 任意位置加列（8.0.30+ 生产安全）
ALTER TABLE big_t ADD COLUMN mid_col INT NULL AFTER id, ALGORITHM=INSTANT;  -- 成功
-- 不支持：改类型没有 INSTANT 路径
ALTER TABLE big_t MODIFY val BIGINT NOT NULL, ALGORITHM=INSTANT;
-- ERROR 1846: ALGORITHM=INSTANT is not supported.
--            Reason: Cannot alter column type INPLACE. Try ALGORITHM=COPY.
-- 不支持（8.0.30 以下）或支持（8.0.29+）：删列
ALTER TABLE big_t DROP COLUMN mid_col, ALGORITHM=INSTANT;

-- 确认探测失败没有留下任何痕迹
SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS
WHERE TABLE_NAME = 'big_t' ORDER BY ORDINAL_POSITION;
-- val 仍是原类型，mid_col 不存在——失败的 ALTER 是原子失败
```

**关卡 3 参考预案（要点式）：**

```text
目标结构变更：logs 加列 trace_id VARCHAR(64) NULL；加索引 idx_created (created_at)
路径判定：加列走 INSTANT（版本 >= 8.0.30，仅元数据）；加索引走 INPLACE + LOCK=NONE
风险点：MDL 排队——执行前检查 information_schema.INNODB_TRX 无长事务；
        INNO_DB 指标确认无未提交事务占着 logs 的 MDL
预演：抽样 1% 数据在影子库跑通两条 ALTER，记录耗时并按行数线性外推
窗口：低峰 02:00，预计索引构建 X 分钟（按预演外推）
观察指标：执行期间每 30 秒记录——执行进度（performance_schema DDL 进度事件）、
        主从延迟（Seconds_Behind_Source）、活跃连接数、错误日志
从库预案：DDL 将在从库串行重放，延迟预期与主库耗时同量级；
        读从库的业务提前开降级开关（接受主库读或返回缓存数据）
回滚：加列用 DROP COLUMN（8.0.30+ 可 INSTANT）；索引用 DROP INDEX（INPLACE，可并发）
如果改的是列类型（本题之外）：放弃原生 ALTER，改用 gh-ost/pt-osc 影子表方案
```

</details>

## 常见困惑

**"8.0 都有 INSTANT 了，还需要影子表工具吗？"**——需要。INSTANT 只覆盖"改说明书"类变更（加删列、改名、改默认值）；改列类型、重建字符集、压缩行格式这类必须动数据的变更，INPLACE/COPY 的耗时与主从延迟问题依旧。另外大表高频小变更（反复加列）会让表积累"instant 元数据"，下次真正的重建成本更高——变更规划仍然要做。

**"显式声明 ALGORITHM=INPLACE 为什么还报错？"**——报错说明该变更根本不支持 INPLACE（如改列类型），或 `LOCK=NONE` 与该操作不兼容。这正是显式声明的价值：错误在第一个报错点暴露，而不是变更跑到一半。处理方式按报错的 `Reason:` 行判断：能接受降级就改算法声明重试，不能接受（如 COPY 的写锁不可承受）就换影子表方案。

**"锁视图里看到 ALTER 在等 MDL，杀掉查询就行吗？"**——先杀的是**占着 MDL 的长事务/慢查询**（查 `performance_schema.metadata_locks` 与 `INNODB_TRX`），ALTER 自己会继续。反过来杀 ALTER 没用：它只是排队者，队伍的源头是长事务；不治源头，下一次变更照样排队（更多排查工具见[事务锁机制](/mysql/460-TransactionLockMechanism)）。

**"分区表上的大表变更有什么不同？"**——分区裁剪让"只改一个分区"成为可能，`ALTER TABLE ... REBUILD PARTITION` 的成本模型是分区级而非全表级（见[分区表](/mysql/660-PartitionedTable)）。但加列等操作仍作用于全部分区，算法规则不变。

## 检验清单

- 能画出 INSTANT / INPLACE / COPY 三条路径的成本模型，并给加列、改列类型、加索引各指定路径；
- 能说出 8.0.12 / 8.0.29 / 8.0.30 三个版本节点对 INSTANT 加删列的意义；
- 理解显式 `ALGORITHM=` / `LOCK=` 的价值："让失败发生在第一秒"；
- 能解释 MDL 排队如何把秒级 DDL 拖成全站故障，以及先杀谁的排查顺序；
- 能对比 pt-osc 与 gh-ost 的增量同步机制，并说出"从库执行变更"为何是 gh-ost 的独特优势；
- 完成了关卡 1 到 3 的动手（或纸面）练习。

## 下一步

变更能力是"把表改对"，容量能力是"把表拆开"：回看[分库分表策略](/mysql/670-ShardingStrategy) 与[分库分表中间件](/mysql/680-ShardingMiddleware) 时会发现，很多分表动机（单表变更太慢、写入放大）正是本文讨论的问题在容量维度的延伸。运维全景见 [MySQL 配置与运维](/mysql/850-MySQLConfigOps)。

### DDL 进度监控：执行中的 ALTER 到底跑到哪了

长 ALTER 最焦虑的是「它还活着吗」——用 P_S 的阶段事件表看进度：

```sql
-- 1. 先开启 DDL 阶段采集（默认部分关闭）
UPDATE performance_schema.setup_instruments
SET ENABLED = 'YES' WHERE NAME LIKE 'stage/innodb/%';

-- 2. 另一会话执行长 DDL
ALTER TABLE large_table ADD COLUMN new_col INT, ALGORITHM=INPLACE, LOCK=NONE;

-- 3. 执行期间随时查进度（每行给出行数化的完成度）
SELECT STAGE, WORK_COMPLETED, WORK_ESTIMATED,
       ROUND(WORK_COMPLETED / WORK_ESTIMATED * 100, 1) AS pct
FROM performance_schema.events_stages_current
WHERE EVENT_NAME LIKE 'stage/innodb/%';
```

逐段讲用法：`events_stages_current` 是当前活跃的阶段事件，`WORK_COMPLETED/WORK_ESTIMATED` 给出量化进度（按表大小折算的行数）——「还有多久」第一次有了数字答案；采集开关要**先开**（默认部分 stage instrument 关着，临时开不重启）。监控循环的完整套路：每 30 秒采样一次进度 + `SHOW PROCESSLIST` 确认连接存活 + 主从延迟监控（DDL 回放复制到从库的时间可能比主库执行本身更久）。
