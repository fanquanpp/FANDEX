---
order: 90
title: SELECT 执行顺序
module: 'sql'
category: 数据库
difficulty: intermediate
description: 从一个别名报错出发，逐段验证 SELECT 的逻辑执行顺序 FROM 到 LIMIT，并解释它带来的别名作用域、HAVING 与 LEFT JOIN 三类经典坑。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'sql/050-FilterCondition'
  - 'sql/060-AggregateFunction'
  - 'sql/070-GROUPBYGroupingSet'
  - 'sql/150-JoinQuery'
prerequisites:
  - 'sql/020-OverviewStandard'
---

## 场景：一条"看起来没错"的查询报错了

继续用播客平台的数据。有人在算"年收入超过阈值的节目"时写了这条查询：

```sql
SELECT show_name, played_at * 0 AS placeholder, COUNT(*) AS cnt
FROM plays
WHERE cnt >= 2          -- 报错：column "cnt" does not exist
GROUP BY show_name;
```

COUNT 明明在 SELECT 里起了别名 `cnt`，WHERE 为什么看不见？反过来，把条件挪到 ORDER BY 里用 `cnt` 却又能用：

```sql
SELECT show_name, COUNT(*) AS cnt
FROM plays
GROUP BY show_name
ORDER BY cnt DESC;      -- 合法，全部数据库都支持
```

要解释这一对矛盾，只有一个入口：**SQL 的书写顺序和执行顺序不是一回事**。

## 动手：把执行顺序一步步验证出来

### 先记住这条链

```text
FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT
```

书写顺序是 `SELECT ... FROM ... WHERE ... GROUP BY ... HAVING ... ORDER BY ... LIMIT`，执行却从 FROM 开始。下面每个阶段都配一个可以在自己库上跑的小实验，比背结论有效。

准备数据：

```sql
CREATE TABLE plays (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    show_name  VARCHAR(100) NOT NULL,
    platform   VARCHAR(20)  NOT NULL,
    played_at  TIMESTAMP    NOT NULL
);

INSERT INTO plays (show_name, platform, played_at) VALUES
('代码夜话', 'ios',     '2026-09-01 08:10:00'),
('代码夜话', 'ios',     '2026-09-01 21:40:00'),
('代码夜话', 'android', '2026-09-02 07:05:00'),
('早班机',   'android', '2026-09-02 07:30:00'),
('早班机',   'web',     '2026-09-03 09:15:00'),
('早班机',   'web',     '2026-09-03 09:20:00');
```

### 第 1-2 步：FROM 与 JOIN 先确定数据从哪来

FROM 把数据源（表、子查询、视图）取出来；JOIN 在此之上把多张表按 ON 条件拼在一起。**表别名在这一步生效**，所以后面所有子句都能用它——包括 SELECT 和 WHERE。

### 第 3 步：WHERE 过滤行，此刻还没有"组"

WHERE 逐行过滤。验证两件事：

```sql
-- 实验 1：WHERE 里不能用聚合函数，因为"组"还不存在
SELECT show_name, COUNT(*) AS cnt
FROM plays
WHERE COUNT(*) >= 2     -- 语法错误
GROUP BY show_name;

-- 实验 2：WHERE 里不能用 SELECT 别名，因为 SELECT 还没执行
SELECT show_name, COUNT(*) AS cnt
FROM plays
WHERE cnt >= 2          -- 报错：找不到列 cnt
GROUP BY show_name;
```

两个错误是同一个原因：WHERE 执行时，聚合和别名都还没有发生。聚合条件的过滤要用 HAVING。

### 第 4-5 步：GROUP BY 与 HAVING 处理"组"

GROUP BY 把行折叠成组；HAVING 对组做过滤。HAVING 里既可以用聚合函数，也可以用（部分数据库的）别名：

```sql
SELECT show_name, COUNT(*) AS cnt
FROM plays
GROUP BY show_name
HAVING COUNT(*) >= 2;    -- 稳妥写法：重复聚合表达式
```

别名在 GROUP BY/HAVING 里能不能用是**方言差异**：MySQL、PostgreSQL、SQLite 允许，SQL Server、Oracle 不允许。跨数据库的 SQL 一律写原始表达式。

### 第 6-8 步：SELECT、DISTINCT、ORDER BY

SELECT 到这里才执行：算表达式、起别名。所以：

- 别名在 ORDER BY 里可用（它排在 SELECT 之后）；
- DISTINCT 在 SELECT 之后去重；
- ORDER BY 排序，是最后一个能引用 SELECT 别名的地方。

### 第 9 步：LIMIT/OFFSET 截取

MySQL/PostgreSQL 用 `LIMIT n OFFSET m`，SQL 标准写法是 `FETCH FIRST n ROWS ONLY`。分页要和 ORDER BY 搭配，否则每页顺序不稳定（见坑点三）。

### 完整走一遍

```sql
SELECT d.region, p.show_name, COUNT(*) AS cnt          -- 6. SELECT
FROM plays p                                            -- 1. FROM
JOIN show_meta d ON p.show_name = d.show_name           -- 2. JOIN
WHERE p.played_at >= '2026-09-01'
  AND p.played_at <  '2026-09-08'                       -- 3. WHERE
GROUP BY d.region, p.show_name                          -- 4. GROUP BY
HAVING COUNT(*) >= 2                                    -- 5. HAVING
ORDER BY cnt DESC                                       -- 7. ORDER BY
LIMIT 10;                                               -- 8. LIMIT
```

对照检查：p 别名在 SELECT/WHERE 都能用（FROM 已定义）；WHERE 不能有聚合；HAVING 只能跟在 GROUP BY 后；ORDER BY 用别名合法。

## 为什么：声明式语言只说"要什么"

SQL 是声明式语言：你声明结果长什么样，执行路径由优化器决定。这条链叫**逻辑执行顺序**——它是语义上的处理顺序，决定了哪些名字在哪个子句可见；不是物理执行顺序。优化器实际执行时会谓词下推、重排连接、并行扫描，可能先做 WHERE 的过滤再扫描。

所以正确的用法是：**用逻辑顺序推演语义正确性**（别名、聚合的位置），**用执行计划验证性能**（见[执行计划](/sql/430-ExecutionPlan)）。"WHERE 写在前面就跑得快"属于把两者混为一谈。

## 坑点与自检

### 坑一：WHERE 把 LEFT JOIN 退化成 INNER JOIN

执行顺序里 JOIN 在 WHERE 之前，这直接推出一个高频 bug：

```sql
-- 本意：所有节目都保留，只展示活跃播放行为
SELECT p.show_name, e.title
FROM shows p
LEFT JOIN episodes e ON p.show_name = e.show_name
   AND e.is_published = true;          -- 条件放 ON：LEFT JOIN 语义成立

-- 错误：条件放进 WHERE，未上架的行（e 列全 NULL）被过滤，
-- "没有已上架单集"的节目整个消失，LEFT JOIN 名存实亡
SELECT p.show_name, e.title
FROM shows p
LEFT JOIN episodes e ON p.show_name = e.show_name
WHERE e.is_published = true;
```

规则：**右表的过滤条件想保留左表全部行，就写进 ON；写在 WHERE 里就把外连接变成了内连接**。反过来，想专门找出"没有匹配行"的左表记录，倒是靠 `WHERE 右表.列 IS NULL`，这是刻意的用法。

### 坑二：别名作用域速查

| 子句 | 能否用 SELECT 别名 | 原因 |
| --- | --- | --- |
| FROM 里的表别名 | 反向成立 | FROM 最先执行 |
| WHERE | 否 | SELECT 未执行 |
| GROUP BY | 方言差异 | MySQL/PG/SQLite 可，SQL Server/Oracle 不可 |
| HAVING | 方言差异 | 同上 |
| ORDER BY | 可 | 执行在 SELECT 之后 |

别名复用表达式时（WHERE 和 SELECT 各写一遍 `salary * 12`），嫌重复就上 CTE，把算好的列先物化一层（见[CTE](/sql/230-CTE)）。

### 坑三：无 ORDER BY 的 LIMIT 分页

LIMIT 在排序之后执行，这条链是对的；但如果**根本没写 ORDER BY**，行的顺序由执行路径决定，同一页数据两次查询可能不一样，分页就会丢行、重行。自检：**凡是带 LIMIT 的查询，必须能指出它是按什么排的**。

### 坑四：聚合与非聚合列混用

```sql
-- show_name 没出现在 GROUP BY 里，也没被聚合：语义不明，标准数据库直接报错
SELECT show_name, platform, COUNT(*) FROM plays GROUP BY show_name;

-- 两种正解：要么全进 GROUP BY，要么对它聚合
SELECT show_name, platform, COUNT(*) FROM plays GROUP BY show_name, platform;
SELECT show_name, MAX(platform) AS any_platform, COUNT(*) FROM plays GROUP BY show_name;
```

老版本 MySQL 默认容忍这种写法（取任意一行的值），5.7 起默认 `ONLY_FULL_GROUP_BY` 关掉了这个坑。见过"别的库能跑"的旧 SQL 报错时，先想到这里。

## 练习

1. 不看上文，默写九步逻辑执行顺序，然后解释为什么 HAVING 不能出现在 GROUP BY 之前。
2. 写一条查询：每档节目的播放次数，只保留 9 月第一周的数据，只要播放次数最多的前 2 档。分别标注每行 SQL 对应执行链的第几步。
3. 把练习 2 的 HAVING 条件改写为等价的"先算全部再过滤"的 CTE 版本，体会别名为什么在 CTE 内层可用。
4. 构造一个 LEFT JOIN + WHERE 退化的例子（用 shows/episodes 两张表），先证明退化发生（结果行数变少），再把条件挪进 ON 修复。
5. 解释为什么 `ORDER BY cnt DESC LIMIT 1` 能拿到"播放次数最多的节目"，而 `WHERE cnt = MAX(cnt)` 永远是错的。

## 下一步

- WHERE 的条件形态直接决定索引能否生效，见[过滤条件](/sql/050-FilterCondition)的 SARGable 一节；
- 分组与分组集的展开见[GROUP BY 与分组集](/sql/070-GROUPBYGroupingSet)；
- 想看优化器真实的物理执行顺序，进入[执行计划](/sql/430-ExecutionPlan)。
