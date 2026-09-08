---
order: 40
title: SQL 沙箱练习
module: 'mysql'
category: 数据库
difficulty: beginner
description: 一个随时可跑的示例表与 10 个由易到难的练习 SQL，第一周常驻使用。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'mysql/084-DQL'
  - 'mysql/005-MySQLOverviewDatabaseDesign'
prerequisites: []
---

## 0. 怎么用这个沙箱

先准备一个能跑 SQL 的环境，任选其一：

1. 在线工具：SQLite Online、DB Fiddle 等（选 MySQL 模式）；
2. 本地：装好 MySQL 后执行 `mysql -u root -p`。

然后执行下面的建表与插入语句，得到一张 `students` 示例表：

```sql
CREATE TABLE students (
  id INT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  age INT,
  score INT
);

INSERT INTO students (id, name, age, score) VALUES
  (1, 'Alice', 20, 92),
  (2, 'Bob', 18, 78),
  (3, 'Cathy', 22, 85),
  (4, 'David', 19, 65),
  (5, 'Eve', 21, 95);
```

## 1. 十个练习（由易到难）

先自己写，写不出来再看提示，最后跑一遍验证。

**练习 1：查看整张表**

```sql
SELECT * FROM students;
```

**练习 2：只查姓名和分数**

提示：`SELECT name, score FROM ...`

**练习 3：查年龄大于 19 的学生**

提示：`WHERE age > 19`

**练习 4：按分数从高到低排序**

提示：`ORDER BY score DESC`

**练习 5：只显示前 3 条**

提示：`LIMIT 3`

**练习 6：统计一共有多少人**

提示：`COUNT(*)`

**练习 7：查分数最高的学生**

提示：`ORDER BY score DESC LIMIT 1`，或 `MAX(score)`

**练习 8：查平均分**

提示：`AVG(score)`

**练习 9：按年龄段统计人数**

提示：`GROUP BY age` + `COUNT(*)`

**练习 10：组合查询——查年龄大于 18 的学生姓名，按分数降序取前 3**

提示：`SELECT name FROM students WHERE age > 18 ORDER BY score DESC LIMIT 3`

## 2. 参考答案

```sql
-- 练习 2
SELECT name, score FROM students;
-- 练习 3
SELECT * FROM students WHERE age > 19;
-- 练习 4
SELECT * FROM students ORDER BY score DESC;
-- 练习 5
SELECT * FROM students LIMIT 3;
-- 练习 6
SELECT COUNT(*) FROM students;
-- 练习 7
SELECT * FROM students ORDER BY score DESC LIMIT 1;
-- 练习 8
SELECT AVG(score) FROM students;
-- 练习 9
SELECT age, COUNT(*) FROM students GROUP BY age;
-- 练习 10
SELECT name FROM students WHERE age > 18 ORDER BY score DESC LIMIT 3;
```

## 3. 进阶挑战

1. 给表加一列 `gender` 并插入数据；
2. 再建一张 `courses` 表，练习 `INNER JOIN`；
3. 用 `UPDATE` 把某个学生的分数加 5 分，注意带 `WHERE`；
4. 用 `DELETE` 删除一条记录，注意带 `WHERE`。

> 一句话记住：先建表、再插入、然后随便查；每句 SQL 都亲手敲一遍。

## 扩展学习

- 查询语法：`mysql/084-DQL`；
- 建表：`mysql/007-MySQLDataTypeConstraint`；
- 术语：`mysql/003-Glossary`；
- 第一课：`mysql/005-MySQLOverviewDatabaseDesign`。
