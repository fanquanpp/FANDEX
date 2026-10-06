---
order: 140
title: 视图与物化视图
module: 'sql'
category: 数据库
difficulty: beginner
description: 视图是「存了名字的 SELECT」：为什么需要视图、可更新性与 WITH CHECK OPTION、基于视图的分层、物化视图的缓存心智与刷新代价。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'sql/110-DDL'
  - 'sql/230-CTE'
  - 'sql/340-DCL'
  - 'sql/440-PerformanceOptimization'
prerequisites:
  - 'sql/040-DataQueryBasics'
---

## 场景：同一段 SQL 复制了七次之后

教务系统的成绩报表需求：每个学生的姓名、课程名、分数，只统计已结课的记录。第一次写在
日报里，第二次复制到月报，第三次复制到给辅导员看的 Web 接口——三个月后课程表结构调整
（`course_no` 改名），七处 SQL 改漏了一处，报表静默出错。

这段查询是典型的「值得命名的查询」：逻辑稳定、被多处消费、内部细节（表怎么连接、结课
怎么定义）不该让每个使用方关心。视图（VIEW）就是数据库给「命名一段查询」提供的原生物：

```sql
CREATE VIEW v_student_score AS
SELECT s.studentno, s.studentname, c.coursename, m.score
FROM student  s
JOIN mark     m ON s.studentno = m.studentno
JOIN course   c ON m.courseno  = c.courseno
WHERE m.status = 'finished';
```

之后七个使用方全部只写 `SELECT ... FROM v_student_score WHERE ...`。课程表再怎么改名，
只要视图定义里的 SELECT 修一次，所有使用方无感知。

## 心智模型：视图是一段「存了名字的 SELECT」

理解视图只需要一句话：**视图不存数据，存的是查询定义本身**。每次查询视图，数据库都把
定义展开、对着底层表现算一遍——视图在查询里的角色像宏（macro）而不是副本：

```text
你写的：      SELECT studentname, score FROM v_student_score WHERE score >= 60
优化器看到：  SELECT studentname, score
              FROM student JOIN mark ... WHERE status = 'finished' AND score >= 60
```

由此推出视图的全部性质：

| 推论 | 含义 |
| --- | --- |
| 数据永远是新的 | 查询视图 = 查询底层表，不存在「视图过期」问题 |
| 不占额外存储 | 除了一条定义文本，数据零冗余 |
| 性能不会凭空变差 | 优化器把视图展开后与手写等价 SQL 同等对待（个别方言的物化/屏障除外） |
| 底表变更会传导 | 底表删列/改语义，视图在下次执行时才报错或出错——是延迟爆炸的雷 |

视图、CTE、子查询三者解决的是同一个问题「把复杂查询组织成可读的单元」，差别在**作用域
与复用半径**：CTE 作用于单条语句（见 [CTE](/sql/230-CTE)），子查询作用于单个子句，视图
跨语句、跨会话、跨用户存在。一段查询如果只有当前语句用，用 CTE；如果全系统都要用，才
值得升级成视图。

## 基本操作：建、改、删

```sql
-- 建议带 OR REPLACE（MySQL/PostgreSQL/Oracle 支持）：改定义不用先删后建
CREATE OR REPLACE VIEW v_student_score AS
SELECT s.studentno, s.studentname, c.coursename, m.score
FROM student s
JOIN mark m      ON s.studentno = m.studentno
JOIN course c    ON m.courseno  = c.courseno;

-- SQL Server 没有 OR REPLACE，等价写法是 ALTER VIEW
-- ALTER VIEW v_student_score AS SELECT ...

-- 查看视图定义
SHOW CREATE VIEW v_student_score;        -- MySQL
-- PostgreSQL: \d+ v_student_score（psql）或查询 pg_get_viewdef

DROP VIEW IF EXISTS v_student_score;
```

与建表语法对比着记：CREATE TABLE 定义的「数据长什么样、放在哪」，CREATE VIEW 定义的
「数据怎么算出来」。所以视图不需要指定存储引擎、字符集，只需要一段合法 SELECT。

## 可更新视图：视图上也能 INSERT/UPDATE 吗

简单视图（单表、无聚合、无 DISTINCT/GROUP BY）通常可以直接 DML，改动落在底表上：

```sql
-- 可更新：单表投影
CREATE VIEW v_active_users AS
SELECT id, name, email FROM users WHERE status = 'active';

UPDATE v_active_users SET email = 'new@ex.com' WHERE id = 1;   -- 实际改的是 users 表
```

```sql
-- 不可更新：含聚合，数据库直接报错
CREATE VIEW v_course_avg AS
SELECT courseno, AVG(score) AS avg_score FROM mark GROUP BY courseno;

UPDATE v_course_avg SET avg_score = 80 WHERE courseno = 'kc1001';
-- ERROR: cannot update view（聚合视图没有「一行」对应底表「一行」的映射）
```

判断标准可以口算：**视图的每一行能否唯一对应底表的一行**。聚合、DISTINCT、多表 JOIN
打乱了这个对应关系，就不能更新。

### WITH CHECK OPTION：把 WHERE 变成写入门禁

可更新视图有个隐蔽漏洞：通过 `v_active_users` 把某行 `status` 改成 `'disabled'` 后，
这行立刻不满足视图的 WHERE 条件，从视图里「消失」了——但底表里它还在。给视图加上
`WITH CHECK OPTION`，让每次写入都必须仍满足视图条件：

```sql
CREATE VIEW v_active_users AS
SELECT id, name, email, status FROM users WHERE status = 'active'
WITH CHECK OPTION;

UPDATE v_active_users SET status = 'disabled' WHERE id = 1;
-- ERROR: 违反检查选项——写入结果若从视图中「看不见」，直接拒绝
```

什么时候需要它：视图作为「受限写入口」暴露给应用时（比如只允许应用操作 active 用户）。
纯报表视图不需要，因为没人通过它写数据。

## 基于视图的视图：分层是工具，不是目标

视图可以引用别的视图，形成分层：底表 → 明细视图 → 过滤视图。成绩系统的三层就很典型：

```sql
-- 第 1 层：明细视图（单表投影）
CREATE VIEW v_student AS
SELECT studentno, studentname, sex FROM student;

-- 第 2 层：多表业务视图
CREATE VIEW v_student_score AS
SELECT s.studentno, s.studentname, m.courseno, m.score
FROM student s JOIN mark m ON s.studentno = m.studentno;

-- 第 3 层：面向场景的过滤视图
CREATE VIEW v_student_score_pass AS
SELECT * FROM v_student_score WHERE score >= 60;
```

分层的收益是**语义复用**：第 2 层定义了「成绩单」这个业务概念，第 3 层只关心及格线。
风险是**层层展开**：查第 3 层实际执行的是三层 SELECT 的展开拼接，嵌套过深（实践中超过
三五层）会让优化器处理的表达式膨胀、报错信息难读、权限排查绕圈。原则：**业务概念分层，
不要为了「少写 JOIN」而层层套壳**。

## 物化视图：把查询结果真的存下来

普通视图每次现算，超重的查询（亿行聚合、多表大 JOIN）每次报表刷新都重算一遍是浪费。
物化视图（Materialized View）把**查询结果落盘存储**，查询直接读结果：

```sql
-- PostgreSQL：创建后数据定格，需手动/定时刷新
CREATE MATERIALIZED VIEW mv_daily_plays AS
SELECT show_name, date_trunc('day', played_at) AS day, COUNT(*) AS cnt
FROM plays
GROUP BY show_name, date_trunc('day', played_at);

-- 刷新（阻塞读）：业务低峰期由定时任务调用
REFRESH MATERIALIZED VIEW mv_daily_plays;
-- 或并发刷新（要求视图上有唯一索引，刷新期间可读）
CREATE UNIQUE INDEX ON mv_daily_plays (show_name, day);
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_plays;
```

| 数据库     | 物化视图支持                                    |
| ---------- | ----------------------------------------------- |
| PostgreSQL | 原生，手动 `REFRESH`（可 CONCURRENTLY）         |
| Oracle     | 最完善：可 `FAST REFRESH` 增量、定时自动刷新    |
| SQL Server | 索引视图（在视图上建聚集唯一索引即物化），自动维护 |
| MySQL      | **无原生物化视图**，用「普通表 + 定时重算」模拟 |

SQL Server 的索引视图值得单独理解：它是「写时维护」——底表每次 DML 同步更新物化结果，
读永远是新的，代价是写入变慢；PostgreSQL 的 REFRESH 是「读时重建」——写入零开销，
读到的数据陈旧程度等于刷新间隔。两种模型对应两类场景：写少读多选写时维护，写多读少、
容忍陈旧选定时刷新。

MySQL 的模拟写法（模板，可独立成定时任务）：

```sql
CREATE TABLE mv_daily_plays LIKE 模板结构;             -- 手工按 SELECT 结果建表
-- 定时任务（事件或外部 cron）：
TRUNCATE mv_daily_plays;
INSERT INTO mv_daily_plays SELECT ... GROUP BY ...;    -- 整表重算
```

## 视图做权限：行级与列级安全的经典手法

DCL（见 [DCL](/sql/340-DCL)）的 GRANT 最小粒度是表，但需求常常是「财务助理只能看
salary 列」「区域经理只能看本区域行」。标准解法就是**视图 + 只授权视图**：

```sql
-- 列级：暴露视图而非底表
CREATE VIEW v_employee_public AS
SELECT emp_id, name, dept_id FROM employees;      -- 不含 salary、id_number

GRANT SELECT ON v_employee_public TO analyst_role;
-- analyst_role 对 employees 表本身无任何权限，salary 物理不可见

-- 行级：视图带 WHERE
CREATE VIEW v_sales_east AS
SELECT * FROM sales WHERE region = 'east';
GRANT SELECT ON v_sales_east TO mgr_east;
```

这个手法通用、简单、无需额外组件，是理解「为什么权限要能授到视图」的动机。局限也要
知道：同一个用户面对「多区域权限」时需要动态行级控制，视图就力不从心了，那需要数据库
的行级安全特性（如 PostgreSQL RLS）或应用层过滤——知道边界即可。

## 常见坑

**坑一：底表改列，视图延迟爆炸。** 视图在创建时做合法性检查，但底表之后 `DROP COLUMN`
/ 改名时，多数数据库并不级联检查视图——直到有人查询视图才报错。自检方法：改表结构的
迁移脚本里，把「依赖该表的视图重建」作为固定步骤（很多迁移工具的 migration 就是这么
要求的）。

**坑二：把视图当性能开关。** 「查询慢？套个视图就好了」是误解——视图只是命名，优化器
展开后与原查询同价。真正能改善性能的是物化视图（预计算）或索引；普通视图的价值在**可
读性与权限**，不在速度。

**坑三：可更新视图的「消失行」。** 前面 WITH CHECK OPTION 一节的场景：不加检查选项时，
通过视图 UPDATE 把行改到 WHERE 条件之外，应用下次查视图会「莫名其妙少一行」。规则：
**用作写入口的视图，一律 WITH CHECK OPTION**。

**坑四：物化视图的陈旧数据参与决策。** 定时刷新的物化视图里永远是「上一次刷新时刻」的
数据。报表页面要标注数据截止时间（可以在物化视图里带一列 `refreshed_at`），否则业务方
会拿昨天的聚合当实时数据。

**坑五：SELECT * 视图。** 视图定义里的 `SELECT *` 在创建时就被展开成当时的列清单（多数
数据库如此），底表加列后视图**不会**自动多出新列，行为与直觉相反。视图定义里显式列出
列名，加列时明确地 `CREATE OR REPLACE` 更新定义。

## 练习

以下练习基于一组三表结构（与本文示例同构，可直接建库操作）：

```sql
CREATE TABLE student (
    studentno   CHAR(8) PRIMARY KEY,
    studentname VARCHAR(20) NOT NULL,
    sex         CHAR(2)
);
CREATE TABLE course (
    courseno   CHAR(6) PRIMARY KEY,
    coursename VARCHAR(50) NOT NULL
);
CREATE TABLE mark (
    studentno CHAR(8),
    courseno  CHAR(6),
    score     DECIMAL(4,1),
    PRIMARY KEY (studentno, courseno),
    FOREIGN KEY (studentno) REFERENCES student(studentno),
    FOREIGN KEY (courseno)  REFERENCES course(courseno)
);
```

改写题（10 分钟）：把下面这条「每人平均分」查询改造成视图 `v_student_avg`，要求使用方
查询时能直接 `WHERE avg_score >= 80` 过滤。验收：`SELECT * FROM v_student_avg WHERE
avg_score >= 80;` 可执行且结果正确。

提示（思路方向）：聚合视图不可更新，但作为查询来源完全合法。参考实现：

```sql
CREATE VIEW v_student_avg AS
SELECT s.studentno, s.studentname, AVG(m.score) AS avg_score
FROM student s JOIN mark m ON s.studentno = m.studentno
GROUP BY s.studentno, s.studentname;
```

分层题（15 分钟）：在 `v_student_avg` 之上建第 3 层视图 `v_honor_students`（平均分不低于
85 的学生），然后回答：查询 `v_honor_students` 时优化器实际执行几层展开？手工写出等价的
单条 SQL 验证两者结果一致。验收：两条路径结果集逐行相同。

提示：第 3 层只做过滤，展开后是「JOIN + GROUP BY + HAVING/外层 WHERE」一条链。参考实现：

```sql
CREATE VIEW v_honor_students AS
SELECT * FROM v_student_avg WHERE avg_score >= 85;

-- 等价单条 SQL（先自己写，再看这里）
SELECT s.studentno, s.studentname, AVG(m.score) AS avg_score
FROM student s JOIN mark m ON s.studentno = m.studentno
GROUP BY s.studentno, s.studentname
HAVING AVG(m.score) >= 85;
```

安全题（15 分钟）：为「任课教师只能看自己课程的成绩」设计视图 `v_teacher_mark`（教师表
自建，含 teacher_id 与 courseno），并把权限收敛到视图。验收：用只授了视图权限的账号
尝试查底表 mark，应报权限不足；查视图只返回该教师的行。

提示（思路方向）：视图 WHERE 里引用当前用户可用 `CURRENT_USER` 或会话变量（方言差异
大，PostgreSQL 用 `current_user`，MySQL 可用 `SUBSTRING_INDEX(CURRENT_USER(), '@', 1)`
对上用户名）。先自己写，再对照：

```sql
CREATE TABLE teacher (
    teacher_id VARCHAR(20) PRIMARY KEY,
    courseno   CHAR(6)
);

CREATE VIEW v_teacher_mark AS
SELECT m.studentno, m.courseno, m.score
FROM mark m
JOIN teacher t ON t.courseno = m.courseno
WHERE t.teacher_id = SUBSTRING_INDEX(CURRENT_USER(), '@', 1);   -- MySQL 示例

GRANT SELECT ON v_teacher_mark TO teacher_role;
-- teacher_role 未被授予 mark 表权限，只能通过视图看到自己的课程
```

物化题（20 分钟）：在成绩表插入 100 万行测试数据（用存储过程或递归 CTE 生成），对比
「直接聚合查询」与「查询物化视图」的耗时；然后把刷新放进事务，故意在刷新后、新插入一行
成绩，验证物化视图里查不到这一行。验收：能用数字说明物化视图快多少倍，并指出它的数据
截止时刻在哪。

提示（思路方向）：PostgreSQL 用 `CREATE MATERIALIZED VIEW` + `EXPLAIN ANALYZE` 计时；
MySQL 没有物化视图，用普通表 + INSERT INTO ... SELECT 模拟并观察重算耗时。陈旧性实验
的关键是：刷新之后再 INSERT，物化视图的内容不再变化。

思考题（5 分钟）：为什么「视图不存数据」这个性质让它适合做权限边界，却让它完全帮不上
报表提速？用一句话作答，再对照本文「心智模型」一节检查表述。

## 下一步

- 视图的权限用法落在 DCL 的完整体系里，见 [DCL 与权限管理](/sql/340-DCL)；
- 视图与 CTE 的取舍（单语句 vs 跨会话复用）见 [CTE 公用表表达式](/sql/230-CTE)；
- 物化视图之外的性能手段（索引、执行计划）见 [性能优化](/sql/440-PerformanceOptimization)。
