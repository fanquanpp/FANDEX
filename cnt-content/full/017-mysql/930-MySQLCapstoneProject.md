---
order: 910
title: MySQL 毕业项目：论坛数据库从设计到优化
description: MySQL 模块出口项目：完成论坛数据库全流程——四实体 ER 设计与 utf8mb4 DDL、10 万行长尾分布种子数据、热帖榜/个人主页/评论树三条核心查询、索引设计与 EXPLAIN 前后对比，交付慢查询优化报告；只给需求与验收断言，不给完整方案。
module: 'mysql'
category: 数据库
difficulty: intermediate
author: fanquanpp
updated: '2026-09-29'
related:
  - 'mysql/050-MySQLOverviewDatabaseDesign'
  - 'mysql/070-MySQLDataTypeConstraint'
  - 'mysql/140-MultiTableJoinDetailed'
  - 'mysql/220-ClusteredIndexSecondaryIndex'
  - 'mysql/230-CompositeIndexLeftmostPrefixPrinciple'
  - 'mysql/330-MySQLIndexExecutionPlan'
  - 'mysql/340-SlowQueryLog'
  - 'mysql/770-StoredProcedureAndFunction'
  - 'mysql/870-MySQLProjectExampleDatabaseDesign'
prerequisites:
  - 'mysql/110-SQLDataOperationQuery'
  - 'mysql/320-EXPLAINDetailed'
---

## 前置知识

- 已完成 [SQL 数据操作与查询](/mysql/110-SQLDataOperationQuery)：会建表、灌数据、写带条件的增删改查；
- 已完成 [EXPLAIN 逐列读懂](/mysql/320-EXPLAINDetailed)：能读 type/key/rows/Extra 四件套；
- 其余知识按里程碑开头的指路补读。

本篇与 [MySQL 项目示例：电商数据库设计](/mysql/870-MySQLProjectExampleDatabaseDesign) 分工：870 篇是「跟着做」的完整示例；**本篇是毕业验收**——只给需求与验收断言，不给可粘贴的方案。两篇业务不同构（电商 vs 论坛），照抄无路。

## 背景与目标

你将为一个论坛产品搭数据库。需求一页写完：用户发帖；帖子下有人评论，评论还能被回复（楼中楼）；用户给帖子点赞，同一用户对同一帖最多一次。三个动作覆盖业务库的大多数形态：一对多（用户-帖子）、自关联一对多（评论-评论）、多对多（点赞）。你将走完全流程：ER 设计 → DDL 落地 → 造 10 万行种子数据 → 热帖榜/个人主页/评论树三条核心查询 → 索引设计与 EXPLAIN 前后对比 → 慢查询优化报告。

学完本项目你新增的能力：

1. 从需求文本独立产出 ER 图，说清关系基数与外键落点；
2. 落地带类型、约束与 utf8mb4 的 DDL，让数据库自己挡脏数据；
3. 用存储过程或脚本造出**有分布特征**的 10 万行数据；
4. 为真实查询设计索引，用「基线-改动-复验」证明优化有效，交付可复现的脚本、查询与报告。

预计一到两天。完成标志是「报告有前后对比、脚本可重跑」。

自由度声明（反照抄）：热帖榜口径、评论树方案、种子数据分布曲线都由你决定，验收断言不依赖具体选择。

## User stories（必做 10 条）

每条都是可检查的断言，逐条勾掉。

- **M1** ER 图成形：四实体画进一张 ER 图，关系基数标注正确，能指出每段关系的外键落在哪张表；评论对帖子的从属与评论自关联（楼中楼）都体现在图上；点赞表的主键方案（单列自增还是复合主键）有选择有理由。
- **M2** 独立库与字符集：新建专用数据库（命名自定）。断言：`SELECT @@character_set_database, @@collation_database;` 返回 utf8mb4 系。
- **M3** DDL 落地：四张表建成。断言三连：`SHOW CREATE TABLE` 显示每张表都是 `ENGINE=InnoDB` 与 `CHARSET=utf8mb4`；帖子正文是 TEXT 系而不是 VARCHAR；往点赞表插入同一用户对同一帖子的第二条点赞被唯一约束拒绝（`ERROR 1062`）。外键方案（FOREIGN KEY 或逻辑外键）二选一并写明取舍。
- **M4** 种子数据 10 万行：用存储过程或脚本生成，四表合计不低于 10 万行（参考配比 1 万/2 万/5 万/2 万，可调整）。断言：`SELECT COUNT(*)` 四表达标；数据有分布特征——帖子创建时间跨至少 30 天，点赞向少数热帖倾斜形成长尾；脚本可清空重跑（幂等）。
- **M5** 热帖榜查询：排序口径自定（如近 7 天按点赞数加评论数加权，取前 20）。断言：返回 20 行；同一数据重复执行顺序稳定；口径写在注释或报告里，换时间窗或权重能说清怎么调。
- **M6** 个人主页查询：给定用户 id，返回昵称、发帖数、获赞总数（一次查询或明确拆分的少数几次均可）。断言：三个数字与单独 `COUNT` 一致；报告说明为什么这样拆或合。
- **M7** 评论树查询：给定一个至少有两层回复的帖子，查询按层级返回全部评论，子评论可对上父评论（递归 CTE、路径枚举、应用层拼接，方案自选）。断言：输出层级与造数时设计的一致。
- **M8** 基线存档：在加任何索引**之前**，对三条核心查询各跑一次 EXPLAIN 并存档进报告。断言：报告里有优化前记录，含 type 与 rows——没有基线，M9 无法自证。
- **M9** 索引设计与复验：为热帖榜设计联合索引并落地。断言（核心验收线）：热帖榜 EXPLAIN 的 **type 不低于 ref，且 rows 不超过全表的 10%**；三条核心查询不再出现 `type: ALL`（小表除外）；热帖榜 Extra 里没有 Using temporary。
- **M10** 慢查询优化报告：一份 Markdown 报告放进项目仓库，含需求与口径、基线 EXPLAIN、索引改动 DDL、复验与结论四节。断言：含优化前后 rows 对比，且能用最左前缀原理解释联合索引列顺序为什么这样排。

## Extra credit（选做 4 条）

- **E1** 有事务保护的组合写：实现「点赞并同步更新帖子冗余计数」，先 START TRANSACTION 验证 ROLLBACK 再 COMMIT。断言：能演示回滚前后数据一致。
- **E2** 慢查询日志实证：把 long_query_time 调小到 0.05，让某条优化前的查询出现在慢日志，把关键行贴进报告（340 篇）。
- **E3** 评论树第二方案：用与 M7 不同的方案重做评论树（如 M7 递归 CTE、这里路径枚举），对比 EXPLAIN 与写入代价，写 200 字取舍。
- **E4** 幂等点赞：用 ON DUPLICATE KEY UPDATE 或 INSERT IGNORE 让重复点赞不报错也不重复计数。断言：同一点赞重放多次，计数不变。

## 里程碑拆解（5 步）

### 里程碑 1：从需求到 ER 图（M1、M2）

先读：[MySQL 概述与数据库设计](/mysql/050-MySQLOverviewDatabaseDesign) 的 ER 与范式部分。

方向：先把四实体关系画出来再动手建库；点赞表是「关系」的化身，想清楚它为什么必须存在；建库时字符集显式声明。

完成后应看到：一张 ER 图，加一个字符集正确的空库：

```sql
CREATE DATABASE forum_capstone DEFAULT CHARACTER SET utf8mb4;
SELECT @@character_set_database, @@collation_database;
```

### 里程碑 2：DDL 落地（M3）

先读：[数据类型与约束](/mysql/070-MySQLDataTypeConstraint)、[字符集与排序规则](/mysql/170-CharsetCollation)。

方向：每张表先在纸上列字段清单再写 DDL；时间用 DATETIME，正文用 TEXT 系，状态用 TINYINT 加 COMMENT。建完立刻用非法数据试探约束。

完成后应看到：四张表 `SHOW CREATE TABLE` 均含 InnoDB 与 utf8mb4；一次故意的 `ERROR 1062`。

### 里程碑 3：灌入 10 万行（M4）

先读：[存储过程与函数](/mysql/770-StoredProcedureAndFunction)；递归 CTE 造数可参考 320 篇第 2 节的手法。

方向：分布是灵魂——先想清楚「热帖」该长什么样，再让造数把点赞向少数帖子倾斜；写完清空重跑一次，验证幂等。

完成后应看到：规模与分布达标（脚本重跑总量不变）：

```sql
SELECT 'posts' AS t, COUNT(*) AS c FROM posts
UNION ALL SELECT 'comments', COUNT(*) FROM comments;
```

### 里程碑 4：三条核心查询（M5 至 M7）

先读：[DQL](/mysql/120-DQL)、[多表联查详解](/mysql/140-MultiTableJoinDetailed)；递归 CTE 语法在 [SQL 函数与高级查询](/mysql/130-SQLFunctionAndAdvancedQuery)。

方向：每条查询先手写、跑通、自我验证（计数核对、层级比对）。先别管快慢——里程碑 5 才动索引。

完成后应看到：三条 SQL 结果全部验证通过，口径与验证方法都写进了报告草稿。

### 里程碑 5：索引、EXPLAIN 与报告（M8 至 M10）

先读：[EXPLAIN 详解](/mysql/320-EXPLAINDetailed) 第 9 节的三步定位、[联合索引与最左前缀](/mysql/230-CompositeIndexLeftmostPrefixPrinciple)。

方向：按「基线、改动、复验」推进：先存档基线再落地索引；复验不过关就调列顺序，而不是继续堆索引。报告随做随写。

完成后应看到：报告里出现这样一组对比（数字以你的数据为准）：

```text
优化前  type: ALL   key: NULL      rows: 约 100000
优化后  type: ref   key: idx_hot   rows: 约 1800
```

复验达到 M9 断言线，报告成文入库。

## 提示区

本文不提供建表 SQL、造数脚本与查询语句，只给知识地图：

| 专题 | 篇目 |
| --- | --- |
| 设计：ER 与范式 / 类型与约束 / 字符集 | [050](/mysql/050-MySQLOverviewDatabaseDesign) / [070](/mysql/070-MySQLDataTypeConstraint) / [170](/mysql/170-CharsetCollation) |
| 查询：增删改兜底 / DQL / 多表连接 | [110](/mysql/110-SQLDataOperationQuery) 第 5 节 / [120](/mysql/120-DQL) / [140](/mysql/140-MultiTableJoinDetailed) |
| 索引：原理回表 / 联合索引列顺序 | [220](/mysql/220-ClusteredIndexSecondaryIndex) / [230](/mysql/230-CompositeIndexLeftmostPrefixPrinciple) |
| 优化：EXPLAIN / 执行计划 / 慢日志 | [320](/mysql/320-EXPLAINDetailed) / [330](/mysql/330-MySQLIndexExecutionPlan) / [340](/mysql/340-SlowQueryLog) |
| 事务隔离（E1 用） | [420](/mysql/420-TransactionIsolationImplementation) |
| 种子数据：存储过程造数 | [770](/mysql/770-StoredProcedureAndFunction) |

## 验收清单

- [ ] M1 ER 图四实体齐全，基数与外键落点说得清
- [ ] M2 专用库字符集为 utf8mb4 系
- [ ] M3 四表 InnoDB 加 utf8mb4，正文为 TEXT 系，唯一约束拦下重复点赞
- [ ] M4 四表合计 10 万行以上，分布有长尾，脚本幂等
- [ ] M5 热帖榜 20 行、口径明确、顺序稳定
- [ ] M6 主页三个数字与单独 COUNT 一致
- [ ] M7 评论树层级正确，子评论可对父
- [ ] M8 报告含加索引前的 EXPLAIN 基线
- [ ] M9 热帖榜 type 不低于 ref 且 rows 不超过全表 10%，三条查询无 ALL
- [ ] M10 报告含前后 rows 对比，并解释了索引列顺序
- [ ] E1 组合写事务可演示回滚
- [ ] E2 慢日志捕获实证贴进报告
- [ ] E3 评论树第二方案对比成文
- [ ] E4 点赞重放多次计数不变

复查命令：`SHOW CREATE TABLE` 查引擎与字符集；`EXPLAIN` 查 type/key/rows；`SELECT COUNT(*)` 查规模与一致性。

## 常见弯路

- **过早优化**：查询还没跑对就急着堆索引。索引为查询服务，先有 M5 至 M7 的正确查询，才有 M9 的索引设计；
- **无索引意识**：10 万行灌完才发现每条查询都是 `type: ALL`。M8 强制先存基线，就是为了让你看见没有索引的世界；
- **字符集不一致**：建库时没写 CHARACTER SET，服务器默认落到旧字符集，中文写入变问号。M2 的断言就是防这一手，发现太晚只能重建库重灌；
- **把 870 篇的电商 SQL 搬过来**：两篇业务不同构，搬过来一条断言都过不了。870 篇用来对照「数据库项目长什么样」，不是复制答案；
- **造数太均匀**：每帖点赞数差不多，热帖榜失去排序意义，rows 也测不出差别。分布特征本身就是需求的一部分（M4）。

## 完成后你能做什么

- 拿到一页业务需求，能独立完成「ER 图到 DDL、造数、查询、索引、报告」的闭环——这正是后端面试「设计一张 XX 表」题的全套答法；
- 仓库里多了一份可复现的数据库作品：建库脚本、造数脚本、三条核心查询、优化报告，别人能重跑出同样结论；
- 继续深入：优化器为什么这么选在 [执行计划与索引联动](/mysql/330-MySQLIndexExecutionPlan)；当 10 万行变成 10 亿行，[分区表](/mysql/660-PartitionedTable) 与 [分库分表策略](/mysql/670-ShardingStrategy) 是下一阶段的故事。
