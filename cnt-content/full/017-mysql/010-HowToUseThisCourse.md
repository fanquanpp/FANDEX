---
order: 10
title: 本课程使用指南（先读这里）
module: 'mysql'
category: 数据库
difficulty: beginner
description: 零基础学习 MySQL 的正确姿势：必读/选读/进阶分层、学习路线与预期时间。
author: fanquanpp
updated: '2026-11-17'
related:
  - 'mysql/020-Roadmap'
  - 'mysql/030-Glossary'
  - 'mysql/040-SQLPlayground'
prerequisites: []
---

## 0.1 MySQL 第一阶段实战知识表

### SQL 语句族与学习顺序

| 语句族 | 常用关键字 | 先学目标 | 常见错误 |
| --- | --- | --- | --- |
| DQL | `SELECT`、`FROM`、`WHERE`、`ORDER BY`、`LIMIT` | 查出想要的数据 | 忘记 `WHERE` 导致全表扫描 |
| DML | `INSERT`、`UPDATE`、`DELETE` | 改变表中数据 | 更新或删除前不先 `SELECT` 确认范围 |
| DDL | `CREATE`、`ALTER`、`DROP` | 定义表结构 | 生产库直接改大表且没有回滚方案 |
| DCL | `GRANT`、`REVOKE` | 控制账户权限 | 给应用账号授予过大的权限 |
| TCL | `START TRANSACTION`、`COMMIT`、`ROLLBACK` | 控制事务边界 | 误以为每条语句都能自动回滚 |

### 零基础必须跑通的 5 条语句

```sql
CREATE TABLE students (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  score INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO students (name, score) VALUES ('Ada', 96), ('Linus', 88);
SELECT id, name, score FROM students WHERE score >= 90 ORDER BY score DESC;
UPDATE students SET score = 90 WHERE name = 'Linus';
DELETE FROM students WHERE score < 60;
```

### 读执行计划的最小口径

| 字段 | 先看什么 | 判断标准 |
| --- | --- | --- |
| `type` | 访问类型 | `const`、`ref` 通常优于 `ALL` |
| `key` | 实际使用的索引 | 为空说明没有用上候选索引 |
| `rows` | 预估扫描行数 | 数字越大越需要关注索引和过滤条件 |
| `Extra` | 额外操作 | `Using filesort`、`Using temporary` 需要结合场景分析 |


## 0. 这份资料怎么用

本模块有 97 篇文档，**不要按编号顺序读完**。它分为三类：

**必读（第一周，约 3-4 小时）**

- `040-SQLPlayground`：在线沙箱，先动手跑 SQL；
- `050-MySQLOverviewDatabaseDesign` 的第 0 节：五分钟写出第一句 SQL；
- `060-MySQLEnvSetup`：装好 MySQL 环境；
- `120-DQL` 的前 5 个动作：SELECT、WHERE、ORDER BY、LIMIT、COUNT。

**选读（第二周起，按需）**

- `070-MySQLDataTypeConstraint`、`090-SQLDataDefinitionAdvanced`、`100-DML`：建表与增删改；
- `140-MultiTableJoinDetailed`、`390-JOINAlgorithm`：多表查询；
- `890-MySQLQuickLookup`：随时查阅的速查手册。

**进阶（有基础后再读）**

- 索引原理（220 至 330、400）、事务与锁（410 至 480）、日志与备份（490 至 580）、复制与高可用（590 至 650）、分区与分库分表（660 至 680）、查询优化与性能调优（320 至 400）。

**三条原则**

1. 先动手再理解：先在沙箱里跑通，再回来读原理；
2. 术语不认识先查 `030-Glossary`，不要卡住；
3. 每条 SQL 都要自己敲一遍，复制粘贴记不住。

## 1. 学习路线图

详细时间线见 `020-Roadmap`。一句话版：

```text
第 1 周：沙箱 + SELECT 五动作 + 环境搭建
第 2 周：建表 + 增删改 + 常用函数
第 3 周：多表查询 + 索引入门
第 4 周：事务与锁
之后：按项目需要查对应专题
```

## 2. 预期时间与验收标准

| 阶段 | 预期时间 | 验收标准 |
| --- | --- | --- |
| 第一周 | 3-4 小时 | 能在沙箱里独立写出五条基础查询 |
| 第二周 | 4-6 小时 | 能建一张带主键的表并完成增删改 |
| 第三周 | 4-6 小时 | 能解释 INNER JOIN 与 LEFT JOIN 的区别 |
| 第四周 | 3-4 小时 | 能说出事务 ACID 与常用隔离级别 |

## 3. 常见误区

| 误区 | 真相 |
| --- | --- |
| 背语法 | 语法随用随查，重点是理解“查什么、怎么查” |
| 一上来读索引原理 | 先会写查询，再学优化 |
| 跳过环境搭建 | 沙箱能跑通就过关，本地环境第二周再装也行 |
| 用 MySQL 与 SQL 标准混学 | 先掌握通用 SQL，再学 MySQL 特有语法 |

> 一句话记住：先跑通、再理解、最后优化；看不懂的术语查 `030-Glossary`。

## 教学自检（先遮住代码自己写，再对照）

遮码自检法：先只读题干，自己写/自己答，再展开参考答案对照。

1. 概念自问：本模块的必读/选读/进阶三层各自解决什么问题？为什么强调"不要按编号顺序读完"？

参考答案（先自己答，再对照）：必读层让 SQL 从"听说"变成"手感"（沙箱、概述、环境、DQL 五动作）；选读层解决建表与增删改的动手需求；进阶层是按方向取用的专题库。97 篇约 28 万字，通读既不可能也无必要——它更像一本按主题组织的工具书，读法由"当前卡在什么问题"决定，而不是由文件编号决定。

2. 概念自问：读执行计划的最小口径里，`type`、`key`、`rows`、`Extra` 四个字段各先看什么？`Extra` 里哪两个值需要结合场景分析？

参考答案（先自己答，再对照）：`type` 看访问类型（`const`、`ref` 通常优于 `ALL`）；`key` 看实际用上的索引（为空说明候选索引没生效）；`rows` 看预估扫描行数（越大越要审视索引与过滤条件）；`Extra` 中 `Using filesort` 与 `Using temporary` 需要结合场景分析——小结果集的排序代价可忽略，大结果集才是问题。

3. 判断题：本地环境搭建必须在第一周完成吗？

参考答案（先自己答，再对照）：不必。沙箱能跑通就过关，本地环境第二周再装也行——第一周的目标是建立 SQL 手感，环境问题（安装失败、端口占用、字符集）是典型的"卡住一整天、收益却为零"的早期陷阱。

## 扩展学习

- 路线图：`mysql/020-Roadmap`；
- 术语表：`mysql/030-Glossary`；
- 沙箱练习：`mysql/040-SQLPlayground`；
- 第一课：`mysql/050-MySQLOverviewDatabaseDesign`。
