---
order: 110
title: SQL 数据操作与查询：把一张排行榜表管起来
module: 'mysql'
category: 数据库
difficulty: intermediate
description: 用游戏排行榜的完整生命周期串起 INSERT/SELECT/UPDATE/DELETE：建表脚本、批量插入、带条件更新、事务防误操作、聚合统计，附真实报错调试与梯度练习。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'mysql/100-DML'
  - 'mysql/120-DQL'
  - 'mysql/140-MultiTableJoinDetailed'
prerequisites:
  - 'mysql/100-DML'
---

## 前置知识

- [DML 语法](/mysql/100-DML)：认识 INSERT/UPDATE/DELETE 的基本写法；
- 一个能执行 SQL 的环境：装好的 MySQL 客户端，或直接用本模块的 [SQL Playground](/mysql/040-SQLPlayground)。

本篇与相邻两篇的分工：[DML 语法](/mysql/100-DML) 逐条讲增删改的语法，[DQL](/mysql/120-DQL) 逐条讲查询语法；**本篇负责把它们串成一条真实的工作流**——围绕同一张表，从建好、灌数据、改数据、查统计到安全地删，每一步都先预测结果再执行。

## 学习目标

读完本文你将能够：

1. 用一段现成脚本建表并批量灌入测试数据，全程知道每一行在做什么；
2. 写出「加分」「上榜前三」「统计平均分」这类真实需求的 SQL，并预测返回行数；
3. 理解为什么 `UPDATE` 忘写 `WHERE` 是新手第一大事故，并用事务 + 回滚给自己上保险；
4. 读懂 `ERROR 1064`、`ERROR 1054`、`ERROR 1364` 三种高频报错并独立修复。

预计 60 到 90 分钟，全程动手。

## 1. 你现在要解决什么问题

假设你在给一个小游戏做排行榜，需求很朴素：

- 玩家注册后要「存进去」；
- 玩家对局结束要「加分」；
- 排行榜页面要「显示前三名」和「平均分」；
- 玩家注销账号要「删掉」；
- 老板说「把所有人的分数上调 10% 做活动」——你手一抖少写了半句 SQL，全表数据就毁了。

单条的 INSERT/UPDATE 语法你已经认识，但把它们连起来、并且不毁数据，是另一回事。本文用一个 `players` 表把这一切走一遍。

## 2. 先建表灌数据：直接可运行的脚本

连接数据库后，选中你的练习库（`USE test;`），整段执行：

```sql
CREATE TABLE players (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(30) NOT NULL,
  score INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO players (name, score, level) VALUES
  ('小明', 1250, 8),
  ('阿黄', 980, 6),
  ('Rain', 2410, 15),
  ('Nova', 760, 5),
  ('老K', 1520, 10);
```

逐点说明这些建表决定：

- `AUTO_INCREMENT`：id 不用手填，每插一行自动加一，适合做主键；
- `NOT NULL DEFAULT`：分数不许空、缺省 0，等级缺省 1——让数据库替你挡住脏数据；
- `updated_at ... ON UPDATE CURRENT_TIMESTAMP`：行每次被修改，时间戳自动刷新，排查「这条数据什么时候变的」全靠它。

## 3. 最小可运行示例：增查改三连

**先查一遍，确认数据真的进去了**：

```sql
SELECT * FROM players;
```

预期输出（顺序可能不同，内容一致）：

```text
+----+--------+-------+-------+---------------------+
| id | name   | score | level | updated_at          |
+----+--------+-------+-------+---------------------+
|  1 | 小明   |  1250 |     8 | 2026-09-27 10:00:00 |
|  2 | 阿黄   |   980 |     6 | 2026-09-27 10:00:00 |
|  3 | Rain   |  2410 |    15 | 2026-09-27 10:00:00 |
|  4 | Nova   |   760 |     5 | 2026-09-27 10:00:00 |
|  5 | 老K    |  1520 |    10 | 2026-09-27 10:00:00 |
+----+--------+-------+-------+---------------------+
5 rows in set (0.00 sec)
```

**加分**：Rain 打完一局赢了 300 分——注意「在原值上加」的写法，不是先查出来再算：

```sql
UPDATE players SET score = score + 300 WHERE id = 3;
SELECT name, score FROM players WHERE id = 3;
```

预期：`Rain` 的分数变成 `2710`。

**排行榜**：显示分数前三名，先名次后分数：

```sql
SELECT name, score FROM players ORDER BY score DESC LIMIT 3;
```

预期输出：

```text
+--------+-------+
| name   | score |
+--------+-------+
| Rain   |  2710 |
| 老K    |  1520 |
| 小明   |  1250 |
+--------+-------+
3 rows in set (0.00 sec)
```

`ORDER BY score DESC` 是「按分数从高到低」，`LIMIT 3` 是「只取前三」——排行榜页面的核心 SQL 就这两句。

## 4. 发生了什么：操作与验证的循环

上面三步演示的是数据库开发的基本节奏：**每一次写操作之后，紧跟一条验证查询**。客户端每次执行都会告诉你影响行数（`Rows matched: 1  Changed: 1`），学会读它，你就知道自己的 SQL 实际改了几行——这个习惯在第 5 节救你的命。

## 5. 调试实录：手一抖的全表更新

现在复现那个事故。需求是「给 id 为 2 的玩家加 10 分」，手快写漏了条件：

```sql
START TRANSACTION;
UPDATE players SET score = score + 10;
SELECT COUNT(*) AS affected FROM players WHERE score > 10000;
ROLLBACK;
```

输出关键行是 `Query OK, 5 rows affected`——**五个人全部被加了 10 分**。因为 `UPDATE` 没有 `WHERE` 时作用于全表。这段代码故意包在事务里：

- `START TRANSACTION` 开始记账；
- 后续所有修改暂时只对你可见；
- `ROLLBACK` 整体反悔，回到事务开始前的状态；
- 确认无误时才执行 `COMMIT` 提交。

立即养成肌肉记忆：**在生产库上写 UPDATE/DELETE，先 `START TRANSACTION`，跑完检查影响行数与抽样数据，再 `COMMIT`**。重新执行一遍正确版本并提交：

```sql
START TRANSACTION;
UPDATE players SET score = score + 10 WHERE id = 2;
SELECT name, score FROM players WHERE id = 2;   -- 确认 990
COMMIT;
```

## 6. 核心概念：聚合与删除

**统计**：排行榜后台要显示「当前参赛人数与平均分」：

```sql
SELECT COUNT(*) AS total_players, AVG(score) AS avg_score, MAX(score) AS top_score
FROM players;
```

预期输出一行：`total_players` 为 5，`avg_score` 约 1378，`top_score` 为 2710。`COUNT/AVG/MAX` 这类函数对**整组行**计算，返回一行结果，与前面的「每行一条」查询本质不同（分组聚合在 [DQL](/mysql/120-DQL) 展开）。

**删除**：玩家 Nova 注销账号：

```sql
DELETE FROM players WHERE id = 4;
SELECT COUNT(*) FROM players;   -- 4
```

`DELETE` 的规则与 `UPDATE` 完全一致：没有 `WHERE` 就是清全表，同样要走事务。

## 7. 常见错误与调试实录

错误一，语法错。把 `INSERT` 手滑写成小写混乱：

```sql
inSERT INTO players (name) VALUES ('x');
```

真实报错：

```text
ERROR 1064 (42000): You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'inSERT INTO players (name) VALUES ('x')' at line 1
```

1064 的读法：引号里从出错位置附近开始看。本例报错位置就是整句开头——关键字拼错了。MySQL 关键字不区分大小写，`inSERT` 本身合法，真正的坑通常是少了逗号、引号不配对、括号没闭合。

错误二，列名错：

```sql
SELECT scor FROM players;
```

真实报错：

```text
ERROR 1054 (42S22): Unknown column 'scor' in 'field list'
```

1054 直接告诉你哪个名字不存在，九成是拼错，用 `DESC players;`（看表结构）核对。

错误三，非空列没给值：

```sql
INSERT INTO players (id, score) VALUES (10, 100);
```

真实报错（严格模式下）：

```text
ERROR 1364 (HY000): Field 'name' doesn't have a default value
```

这是第 2 节的 `NOT NULL` 在工作——建表时的约束此刻变成了报错，挡住了脏数据。给上 `name` 即可。

## 8. 修改实验

1. 把排行榜查询改成「显示分数高于全表平均分的玩家」——先跑第 6 节的 AVG 记下数值，再用 `WHERE score > 数字` 实现；进阶：一行 SQL 里用子查询完成（预告 130 篇）；
2. 把 `LIMIT 3` 改成 `LIMIT 3 OFFSET 1`，预测输出第几名到第几名，运行验证（这是「分页」的雏形）；
3. 故意写一次 `ERROR 1054`：把某条查询的列名删掉一个字母，读报错、修好它。

## 9. 小练习

预测题（不执行，先写答案）：`UPDATE players SET level = level + 1 WHERE score > 1500;` 执行后客户端报告 `2 rows affected`，请写出是哪两位玩家升了级，再用查询验证。

修改题：写一条 SQL 让「所有等级小于 10 的玩家」分数加 50，要求先在事务里执行、验证影响行数正确后再提交。

修 Bug 题：下面这条排行榜 SQL 报 `ERROR 1064`，找出两处语法错误并修复：

```sql
SELECTE name, score FORM players ORDER BY score DESC LIMIT 3;
```

挑战题（不看提示自己写）：一次查询同时给出「总分最高的玩家姓名」与「全表平均分」，只允许用一个 SELECT 语句。提示：聚合函数可以混在普通列里，但要想清楚 `MAX(score)` 和 `AVG(score)` 能不能和 `name` 同行返回，动手试试再下结论。

## 10. 什么时候应该 / 不应该这样用

应该：一切对生产数据的写操作走事务；每次写完紧跟验证查询；批量灌测试数据用一条多值 INSERT。

不应该：在没有 `WHERE` 保险的情况下直接对生产表跑 UPDATE/DELETE；用 `DELETE` 清大表（那是 100-DML 里 `TRUNCATE` 的活，注意它不能回滚的代价）；把「先查出来在代码里算，再写回去」当成加分方式——数据库自己会算。

## 11. 与之前和之后的知识的关系

- 往前：[DML 语法](/mysql/100-DML) 给了你单词表，本文把它们排成了句子；建表约束的作用在第 2、7 节兑现；
- 往后：[DQL](/mysql/120-DQL) 把 `WHERE/ORDER BY/GROUP BY` 系统展开——你在这里用过的 `ORDER BY score DESC LIMIT 3` 将获得完整理论；多表场景见 [多表连接](/mysql/140-MultiTableJoinDetailed)；
- 更远：第 5 节的事务只是「会回滚」级别，事务的隔离级别与 MVCC 在 420 篇之后展开。

## 12. 官方文档

- INSERT 语法：https://dev.mysql.com/doc/refman/8.4/en/insert.html
- UPDATE 语法：https://dev.mysql.com/doc/refman/8.4/en/update.html
- SELECT 语法（含 LIMIT/OFFSET）：https://dev.mysql.com/doc/refman/8.4/en/select.html
- 事务语法（START TRANSACTION/COMMIT/ROLLBACK）：https://dev.mysql.com/doc/refman/8.4/en/commit.html
- 服务端错误码总表（1064/1054/1364 都在这查）：https://dev.mysql.com/doc/mysql-errors/8.4/en/server-error-reference.html

## 13. 自我检查

- 能不看教程完成「建表、插五行、出前三名榜、统计平均分」全流程；
- 能说清 `UPDATE` 忘写 `WHERE` 的后果与事务防护步骤；
- 拿到 1064/1054/1364 报错，各自知道第一步看哪里；
- 养成了「写操作后立即验证影响行数」的习惯。

## 本章总结

真实的数据工作不是一条条孤立语法，而是「写、验、改、查」的循环：写操作用事务兜底，改完立刻验证，查询先预测行数。INSERT/UPDATE/DELETE/SELECT 四件套加上 ORDER BY/LIMIT/聚合函数，已经能支撑一个小排行榜的全部后端需求——也是你后续所有 SQL 学习的骨架。

## 下一步

进入 [DQL 数据查询语言](/mysql/120-DQL)，把本文里用过的每一个查询片段展开讲透。
