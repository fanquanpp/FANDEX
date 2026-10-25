---
order: 20
title: 高级 SQL
module: 'postgresql'
category: 数据库
difficulty: advanced
description: 在 psql 里用播客收听数据做三份报表，掌握 PG 特色高级 SQL：FILTER 条件聚合、DISTINCT ON、LATERAL、CTE 内联与 generate_series 补零日历。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'postgresql/270-PartitionedTable'
  - 'sql/260-WindowFunction'
prerequisites:
  - 'postgresql/010-OverviewInstallConfig'
---

## 场景：产品经理的三份报表

你接手一个播客平台的库。产品经理要看三份东西：

1. 每档节目的**播放完成率**（听完次数除以播放次数，两者是同一行数据的两个条件）；
2. 每档节目**最近一次播放**发生在哪天（每组取一行）；
3. 每档节目**播放量前三的城市**（每组取 N 行）。

普通 GROUP BY 答不了这三问。本篇边做边讲 PostgreSQL 的进阶武器，并顺路补上几个 PG 特有、别的数据库没有的能力。

```sql
CREATE TABLE plays (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    show_name  text NOT NULL,
    city       text NOT NULL,
    finished   boolean NOT NULL,
    played_at  timestamptz NOT NULL
);

INSERT INTO plays (show_name, city, finished, played_at) VALUES
('代码夜话', '杭州', true,  '2026-09-01 08:10'),
('代码夜话', '杭州', true,  '2026-09-01 21:40'),
('代码夜话', '上海', false, '2026-09-02 12:00'),
('代码夜话', '深圳', true,  '2026-09-03 19:30'),
('早班机',   '北京', false, '2026-09-01 07:00'),
('早班机',   '北京', true,  '2026-09-02 07:05'),
('早班机',   '上海', true,  '2026-09-02 07:40'),
('闲话芯片', '杭州', false, '2026-09-03 22:10');
```

## 动手一：FILTER 一次扫描算多个条件聚合

完成率的分子分母是同一批行的两个子集，直觉写法是两个 CASE：

```sql
SELECT show_name,
       COUNT(*) AS plays,
       COUNT(*) FILTER (WHERE finished) AS finished_plays
FROM plays
GROUP BY show_name;
```

`COUNT(*) FILTER (WHERE 条件)` 只聚合满足条件的行，和 `SUM(CASE WHEN finished THEN 1 ELSE 0 END)` 完全等价，但意图直白，且能挂在**任何聚合函数**上：

```sql
-- 混用：总数、完成数、完成单的平均收听时长条件（示意）
SELECT show_name,
       COUNT(*) FILTER (WHERE finished)                        AS fin,
       COUNT(*) FILTER (WHERE NOT finished)                    AS dropped,
       MIN(played_at) FILTER (WHERE finished)                  AS first_finish
FROM plays
GROUP BY show_name;
```

FILTER 是 SQL 标准语法，PostgreSQL 与 SQLite 支持；MySQL 里写 CASE 版本即可。一次扫描出多个口径，这是报表查询的第一效率习惯。

## 动手二：DISTINCT ON——每组取一行

"每档节目最近一次播放"，通用 SQL 要窗口函数套子查询绕一圈，PostgreSQL 有专属写法：

```sql
SELECT DISTINCT ON (show_name) show_name, played_at, city
FROM plays
ORDER BY show_name, played_at DESC;
```

DISTINCT ON (列) 保留每组按 ORDER BY 排序后的**第一行**。语法纪律只有一条：**ORDER BY 必须以 DISTINCT ON 的列打头**（这里先按节目分组，再在组内按时间倒序），否则报错。想取"最早一次"就把 DESC 去掉；想控制组内并列时取哪行，在 ORDER BY 后面继续加列。

它解决的是"每组任意一行/极值行"，比窗口函数少一层嵌套。移植性差是代价——这是 PG 专属扩展，MySQL/SQL Server 没有。

## 动手三：LATERAL——每行做一次子查询

"每档节目播放量前三的城市"，窗口函数和 DISTINCT ON 都能做，LATERAL 给出第三种形态，也是语义最灵活的一种：

```sql
SELECT s.show_name, top.city, top.cnt
FROM (SELECT DISTINCT show_name FROM plays) s
CROSS JOIN LATERAL (
    SELECT city, COUNT(*) AS cnt
    FROM plays p
    WHERE p.show_name = s.show_name     -- 引用了外层的列
    GROUP BY city
    ORDER BY cnt DESC
    LIMIT 3
) top;
```

LATERAL 让子查询可以引用左侧的行：外层每档节目，内层都执行一次"取前三"。等价于把子查询变成一个"带参数的函数"。凡"每组 Top-N"“每行查最近 K 条"的形态，LATERAL 写法最自然，复杂条件（比如再 JOIN 别的表）也放得下。

## 动手四：CTE 与 PG 12 的内联行为

```sql
WITH daily AS (
    SELECT date_trunc('day', played_at)::date AS d,
           COUNT(*) AS plays
    FROM plays
    GROUP BY 1
)
SELECT d, plays,
       plays - LAG(plays) OVER (ORDER BY d) AS day_diff
FROM daily
ORDER BY d;
```

CTE 与派生表能力等价，但可命名、可复用、自上而下读。**PostgreSQL 12 起有一个重要行为变化**：只被引用一次、非递归、无副作用的 CTE 会被**内联**进主查询——优化器能穿过它做谓词下推，性能和派生表一样。想强制 CTE 物化成临时结果（老版本行为，适合"确实只算一次、后面多次引用"的场景），显式写：

```sql
WITH daily AS MATERIALIZED (SELECT ...) SELECT ... FROM daily a JOIN daily b ...;
-- 多次引用的 CTE 本来就只算一次；MATERIALIZED 用于单引用但想挡住优化器重写的场合
```

从老版本 PG 迁移的查询如果发现某些 CTE"忽然变快/变慢"，先想到内联这条。

递归 CTE 走组织树（report 老大是谁）：

```sql
CREATE TABLE staff (id int PRIMARY KEY, name text, manager_id int REFERENCES staff(id));
INSERT INTO staff VALUES (1,'老板',NULL),(2,'内容负责人',1),(3,'主播A',2),(4,'主播B',2);

WITH RECURSIVE org AS (
    SELECT id, name, manager_id, 1 AS depth
    FROM staff WHERE manager_id IS NULL
  UNION ALL
    SELECT s.id, s.name, s.manager_id, org.depth + 1
    FROM staff s JOIN org ON s.manager_id = org.id
)
SELECT * FROM org ORDER BY depth;
```

锚点 + UNION ALL + 递归引用自身，与 MySQL 同构；PG 额外允许 `UNION`（自动去重，防环安全网）。深度优先/环检测的展开见[递归 CTE](/sql/240-RecursiveCTE)。

## 动手五：generate_series 补零日历

报表要"没数据的日子也要出现"，PG 用内置函数现场生成序列，比递归 CTE 更直接：

```sql
SELECT d::date AS day,
       COALESCE(cnt, 0) AS plays
FROM generate_series('2026-09-01'::timestamptz,
                     '2026-09-30'::timestamptz,
                     interval '1 day') g(d)
LEFT JOIN (
    SELECT date_trunc('day', played_at) AS pd, COUNT(*) AS cnt
    FROM plays GROUP BY 1
) t ON t.pd = g.d
ORDER BY day;
```

generate_series 能生成数字、时间戳序列，是时间填充、抽样、桶对齐类需求的瑞士军刀；配合 LATERAL 还能"每行展开成 N 行"。

## 动手六：窗口排名、连续登录与分组集（进阶案例集）

以下案例沿用播客库之外更常见的员工/销售表，都是从实战里反复出现的形状。

**案例一：每组前 N 名**——"每个部门薪资前三名"，窗口排名 + 子查询过滤：

```sql
SELECT * FROM (
  SELECT dept, name, salary,
    ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC) AS rn
  FROM employees
) t WHERE rn <= 3;
```

为什么不在 WHERE 里直接写窗口函数：执行顺序上 WHERE 先于 SELECT，窗口值此时还没算出来（原理见[SELECT 执行顺序](/sql/080-SelectExecutionOrder)）。把排名当列算完再在外层过滤，是这类题的固定姿势。`ROW_NUMBER` 与 `RANK`/`DENSE_RANK` 的取别：并列时想"跳号"用 RANK、想"并列同号不跳"用 DENSE_RANK，业务上"前三名"多数该用 DENSE_RANK。

**案例二：连续登录天数**——间隙与岛屿（gaps and islands）经典题，两步解法：

```sql
-- 第一步: 日期减去行号得到"分组键" grp。
-- 同一段连续日期的 grp 恒定（日期每天 +1，行号也 +1，相减不变）。
-- 注意: 必须先 DISTINCT 去重（同一天多次登录只算一天）。
SELECT user_id, COUNT(*) AS consecutive_days
FROM (
  SELECT user_id, login_date,
    login_date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date))::int AS grp
  FROM (SELECT DISTINCT user_id, login_date::date FROM user_logins) t1
) t2
GROUP BY user_id, grp
HAVING COUNT(*) >= 7;
```

关键技巧只有一个：**把"连续"翻译成"分组键相等"**。日期与行号同步递增，连续段的差值恒定；中断一次，差值跳变，新段开始。

**案例三：递归 CTE 做 BOM 物料展开**——多层装配，数量要沿路径连乘：

```sql
WITH RECURSIVE bom AS (
  SELECT parent_id, child_id, quantity, 1 AS depth
  FROM bill_of_materials
  WHERE parent_id = 'PRODUCT-A'

  UNION ALL

  SELECT b.parent_id, m.child_id, b.quantity * m.quantity, b.depth + 1
  FROM bom b
  JOIN bill_of_materials m ON b.child_id = m.parent_id
)
SELECT child_id, SUM(quantity) AS total_qty, MAX(depth) AS max_depth
FROM bom
GROUP BY child_id;
```

递归部分把父件的累计用量乘上子件单耗——同一个 child 出现在多条路径时被算作多行，最后 SUM 收拢，`MAX(depth)` 顺带给出它在 BOM 里的最深层级。

**案例四：分组集报表**——一张查询出"明细小计 + 区域小计 + 总计"：

```sql
-- ROLLUP: 层级汇总（region,product → region → 总计）
SELECT region, product, SUM(sales) AS total
FROM sales_data
GROUP BY ROLLUP (region, product);

-- GROUPING SETS: 自定义要哪些组合
SELECT region, product, SUM(sales) AS total
FROM sales_data
GROUP BY GROUPING SETS ((region, product), (region), (product), ());

-- GROUPING(): 区分"这行是数据还是小计"（NULL 行是汇总行）
SELECT region, product,
  GROUPING(region) AS is_region_total,
  SUM(sales) AS total
FROM sales_data
GROUP BY ROLLUP (region, product);
```

`GROUPING(列)` 返回 1 表示该列在当前分组里被"卷起"了——报表前端正靠它渲染"小计/合计"样式，避免拿 `region IS NULL` 误判（数据里本来就可能有空值）。完整体系见[GROUP BY 与分组集](/sql/070-GROUPBYGroupingSet)。

## 坑点与自检

- **窗口函数不能进 WHERE**：执行顺序上 WHERE 先于 SELECT。套一层 CTE 或子查询，外层过滤（原理见[SELECT 执行顺序](/sql/080-SelectExecutionOrder)）。
- **DISTINCT ON 忘了 ORDER BY 前缀**：直接语法错误。反过来说，ORDER BY 的组内部分（played_at DESC）决定取哪行，别只写分组列。
- **CTE 优化屏障**：默认内联，但写了 MATERIALIZED（或 CTE 里含易变函数）就成屏障，过滤条件不会下推，大表上可能差一个数量级。性能异常先 EXPLAIN 看有没有子查询被物化。
- **FILTER 只配聚合函数**：窗口函数不能带 FILTER 子句；组内条件计数用 CASE 表达式窗口变通。
- **group 后的列约束**：PG 对"SELECT 里出现未分组列"零容忍（没有 MySQL 老版本那种任意取值行为），看到的报错先检查 GROUP BY 是否缺列。

## 练习

1. 用 FILTER 一条查询同时给出：总播放数、完成数、未完成数、每个城市的完成数（提示：FILTER + 外层再 GROUP，或 FILTER 配合窗口函数分层做）。
2. 用 DISTINCT ON 求"每档节目最早播放的城市"，再用窗口函数解同一问题，对比行数与可读性。
3. 把 LATERAL Top-3 改写成 `ROW_NUMBER() OVER (PARTITION BY ...)` 版本，用 EXPLAIN ANALYZE 对比两者计划与耗时。
4. 用 generate_series + LEFT JOIN 输出 9 月每周的播放数，要求空周显示 0（提示：date_trunc('week', ...)）。
5. 在递归 CTE 里故意制造一个环（把老板的 manager_id 指向主播 A），观察无限递归现象，再用 UNION 去重版或路径数组法修复。

## 下一步

- 窗口函数的完整体系（框架、滚动、分桶）见 016 模块[窗口函数](/sql/260-WindowFunction)与[窗口函数框架](/sql/270-WindowFunctionFramework)；
- 分组集报表见[GROUP BY 与分组集](/sql/070-GROUPBYGroupingSet)；
- LATERAL 与派生表的专题展开在[横向连接与派生表](/sql/200-LateralDerivedTable)；
- 查询 beyond 单机：[并行查询](/postgresql/260-ParallelQuery)讲大表报表怎么吃满核。
