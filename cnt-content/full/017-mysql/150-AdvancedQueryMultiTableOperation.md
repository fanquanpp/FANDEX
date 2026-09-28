---
order: 140
title: 进阶查询与多表操作
module: 'mysql'
category: 数据库
difficulty: advanced
description: 在充电桩多表数据上完成进阶查询：分组聚合与 GROUP_CONCAT、子查询、窗口函数排名与环比、CTE 与递归 CTE，全部基于 MySQL 8.4。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'mysql/140-MultiTableJoinDetailed'
  - 'mysql/380-GroupByOrderByOptimization'
  - 'sql/260-WindowFunction'
prerequisites:
  - 'mysql/120-DQL'
---

## 前置知识

建议先阅读以下内容再进入本文：

- [多表联查详解](/mysql/140-MultiTableJoinDetailed)

## 场景：分析师连环三问

上篇已经能把充电订单、桩、站三张表拼起来。分析师拿着联查能力又提了三个更刁的问题：

1. "每个站收入第一的桩是哪根？"——分组内排名（窗口函数）；
2. "和前一天比，收入涨了还是跌了？"——跨行取值（LAG）；
3. "9 月每天一行的日历，没数据的日子也要出现"——行生成（递归 CTE）。

这三个问题 JOIN 和 GROUP BY 都不够用，本篇就是补齐 MySQL 8.0+ 的进阶武器。沿用上篇的三张表：

```sql
-- stations(station_id, name, city)
-- chargers(charger_id, station_id, power_kw, status)
-- charge_sessions(session_id, charger_id, started_at, kwh, amount)
-- 数据与上篇一致，此处不再重复建表语句
```

## 动手一：分组聚合的进阶形态

### 多表聚合 + 字符串汇总

```sql
-- 每个站：收入、单量、参与充电的桩清单（一行内拼接）
SELECT s.name,
       SUM(cs.amount)                       AS revenue,
       COUNT(DISTINCT cs.charger_id)        AS used_chargers,
       GROUP_CONCAT(DISTINCT cs.charger_id ORDER BY cs.charger_id) AS charger_list
FROM stations s
JOIN chargers c  ON c.station_id = s.station_id
JOIN charge_sessions cs ON cs.charger_id = c.charger_id
GROUP BY s.station_id, s.name;
```

GROUP_CONCAT 把组内的值拼成一行字符串，配合 ORDER BY 控制拼接顺序、DISTINCT 去重。它有一个默认 1024 字节的截断上限（`group_concat_max_len`），数据多时会被静默截断——长清单要么调参数，要么放弃这个函数改用程序处理。

### WITH ROLLUP：小计与总计

```sql
SELECT s.city, c.power_kw >= 100 AS is_fast, SUM(cs.amount) AS revenue
FROM charge_sessions cs
JOIN chargers c ON cs.charger_id = c.charger_id
JOIN stations s ON c.station_id = s.station_id
GROUP BY s.city, is_fast WITH ROLLUP;
```

结果在明细行之外多出城市小计（is_fast 为 NULL）和总计行（全 NULL）。8.0.1 起 MySQL 提供了 `GROUPING()` 函数区分"数据本来就是 NULL"和"这是汇总行"；要注意 WITH ROLLUP 之后不能再写 ORDER BY，汇总行位置不受控制，精细的报表排序需求 MySQL 得拆成多条查询。完整的多维分组集讲法见 [GROUP BY 与分组集](/sql/070-GROUPBYGroupingSet)。

## 动手二：子查询解决"和谁比"的问题

### 和全局比、和分组比

```sql
-- 高于全网平均单价的订单（标量子查询，算一次）
SELECT session_id, amount
FROM charge_sessions
WHERE amount > (SELECT AVG(amount) FROM charge_sessions);

-- 高于本桩历史均价的订单（关联子查询，外层每行比一次）
SELECT cs.session_id, cs.charger_id, cs.amount
FROM charge_sessions cs
WHERE cs.amount > (
    SELECT AVG(cs2.amount)
    FROM charge_sessions cs2
    WHERE cs2.charger_id = cs.charger_id
);
```

关联子查询写起来最直白，但执行模型是"外层一行，子查询一遍"，大表上要靠优化器改写（见[子查询优化](/mysql/360-SubqueryOptimization)）。

### 派生表：先聚合再连接

```sql
-- 每站收入排名，先在子查询里把每站收入算好，再接站点名
SELECT s.name, t.revenue
FROM stations s
JOIN (
    SELECT c.station_id, SUM(cs.amount) AS revenue
    FROM charge_sessions cs
    JOIN chargers c ON cs.charger_id = c.charger_id
    GROUP BY c.station_id
) t ON t.station_id = s.station_id
ORDER BY t.revenue DESC;
```

派生表必须起别名；嵌套超过两层就换成 CTE（本篇动手三）。

### EXISTS 与反连接

```sql
-- 有过故障桩的站点
SELECT s.name
FROM stations s
WHERE EXISTS (
    SELECT 1 FROM chargers c
    WHERE c.station_id = s.station_id AND c.status = 'fault'
);

-- 没有任何订单的桩（NOT EXISTS，不踩 NOT IN 的 NULL 陷阱）
SELECT c.charger_id
FROM chargers c
WHERE NOT EXISTS (
    SELECT 1 FROM charge_sessions cs WHERE cs.charger_id = c.charger_id
);
```

NOT IN 的子查询含 NULL 时整个查询返回空集，这是 MySQL 里最经典的静默翻车之一；统一用 NOT EXISTS 可规避。原理展开见 [子查询](/sql/190-Subquery)。

## 动手三：窗口函数（MySQL 8.0+）

窗口函数在**不折叠行**的前提下做聚合：每一行都保留，旁边多一列计算结果。这是它与 GROUP BY 的本质区别。

### 分组内排名：每站收入第一的桩

```sql
SELECT station, charger_id, revenue,
       ROW_NUMBER() OVER (PARTITION BY station ORDER BY revenue DESC) AS rn
FROM (
    SELECT s.name AS station, cs.charger_id, SUM(cs.amount) AS revenue
    FROM charge_sessions cs
    JOIN chargers c  ON cs.charger_id = c.charger_id
    JOIN stations s  ON c.station_id = s.station_id
    GROUP BY s.name, cs.charger_id
) t;
-- 外面再套一层 WHERE rn = 1 即得"每站冠军"
```

三个排名函数的差别必须分清：`ROW_NUMBER()` 强制不并列（1,2,3）；`RANK()` 并列同名次但跳号（1,1,3）；`DENSE_RANK()` 并列不跳号（1,1,2）。取"每组的第 N 名"用 ROW_NUMBER，取"并列名次"用后两者。

### LAG/LEAD：和前一天比

```sql
SELECT d,
       revenue,
       LAG(revenue) OVER (ORDER BY d) AS prev_day,
       revenue - LAG(revenue) OVER (ORDER BY d) AS day_diff
FROM ( ...按天聚合收入... ) t;
```

LAG 取排序后的上一行，LEAD 取下一行，第二参数是偏移量，第三参数是无值时的默认（`LAG(revenue, 1, 0)`）。环比、留存、漏斗转化这类"跨行"计算全靠它们。

### 累计与其他常用函数

```sql
-- 累计收入（月度冲量看板）
SUM(revenue) OVER (ORDER BY d) AS running_total,

-- 移动平均（7 日平滑）
AVG(revenue) OVER (ORDER BY d ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS ma7,

-- 分桶：把桩按收入切四份找头部
NTILE(4) OVER (ORDER BY revenue DESC) AS quartile,

-- 组内占比
revenue / SUM(revenue) OVER (PARTITION BY station) AS share
```

窗口定义重复时可命名复用：

```sql
SELECT charger_id, revenue,
       ROW_NUMBER() OVER w AS rn,
       SUM(revenue)  OVER w AS running
FROM t
WINDOW w AS (PARTITION BY station ORDER BY revenue DESC);
```

## 动手四：CTE 与递归 CTE

### CTE：给中间结果起名字

```sql
WITH daily AS (
    SELECT DATE(cs.started_at) AS d, SUM(cs.amount) AS revenue
    FROM charge_sessions cs
    GROUP BY DATE(cs.started_at)
)
SELECT d, revenue,
       LAG(revenue) OVER (ORDER BY d) AS prev_day
FROM daily;
```

和派生表能力等价，但名字可复用、自上而下读，多个 CTE 用逗号串联。嵌套子查询能改写成 CTE 的都建议改写。

### 递归 CTE：生成 9 月的每一天

"没数据的日子也要出现"需要一张日期表。充电平台不会为它建表，用递归 CTE 现场生成：

```sql
WITH RECURSIVE calendar AS (
    SELECT DATE('2026-09-01') AS d          -- 锚点：起点
    UNION ALL
    SELECT d + INTERVAL 1 DAY               -- 递归：在上一天基础上 +1 天
    FROM calendar
    WHERE d < '2026-09-30'                  -- 递归终止条件
)
SELECT cal.d, COALESCE(t.revenue, 0) AS revenue
FROM calendar cal
LEFT JOIN (
    SELECT DATE(started_at) AS d, SUM(amount) AS revenue
    FROM charge_sessions GROUP BY DATE(started_at)
) t ON t.d = cal.d
ORDER BY cal.d;
```

递归 CTE 的骨架是"锚点查询 UNION ALL 递归查询"，递归部分必须引用 CTE 自身并有终止条件。MySQL 默认递归深度上限 1000（`cte_max_recursion_depth`），生成整年日历（365 层）没问题，忘了终止条件会被这个保护拦下来报错——它是救命绳，别绕过它。

同一个骨架也能走组织树：站点区域表里 `parent_region_id` 指向上级，从根节点出发逐层展开，就是"华东区下有哪些站"的标准解法。

## 坑点与自检

### 坑一：窗口函数不能进 WHERE

```sql
-- 报错：MySQL 不允许 WHERE 里出现窗口函数
SELECT charger_id, revenue
FROM t
WHERE ROW_NUMBER() OVER (ORDER BY revenue DESC) = 1;
```

原因在执行顺序：窗口函数在 SELECT 阶段求值，WHERE 已经跑完了。正确做法是先算好再过滤——套一层派生表或 CTE，外层 `WHERE rn = 1`。

### 坑二：GROUP_CONCAT 静默截断

结果被 1024 字节砍头时没有任何警告。自检：`SELECT @@group_concat_max_len;`，长结果先确认这个值再信任输出。

### 坑三：WITH ROLLUP 与 ORDER BY 互斥

二者不能同用；且 ROLLUP 的汇总行位置固定、无法排序控制。需要"小计紧跟分组"的样式，PostgreSQL 的 `GROUP BY ROLLUP(...) ORDER BY GROUPING(...)` 才做得到，MySQL 里只能程序侧拼装或拆查询。

### 坑四：递归 CTE 无终止条件

忘写 WHERE 的递归会撞上 `cte_max_recursion_depth` 报错。写递归 CTE 时先确认三件事：锚点是什么、下一层怎么来、什么时候停。

### 自检清单

- 分组内取 TopN：是先在派生表/CTE 里算好 rn，再外层过滤？
- NOT IN 的子查询列排除 NULL 了吗，还是直接用了 NOT EXISTS？
- 用了 GROUP_CONCAT 的地方确认过长度上限吗？
- 报表数字对不上时，检查过一对多 JOIN 的金额放大问题吗（COUNT(DISTINCT)/先聚合后 JOIN）？

## 练习

1. 查出每个城市收入最高的那根桩（城市、桩号、收入），只用一次查询。
2. 生成 9 月日历并计算**7 日移动平均**收入，没数据的日子按 0 计。
3. 把"高于本桩均价的订单"改写为窗口函数版本（AVG OVER PARTITION BY），对比两版执行计划里的扫描次数。
4. 每根桩按订单金额标注四分位（NTILE），查出最贵四分位里的订单明细。
5. 递归 CTE 生成 2026 全年日历时，验证 `cte_max_recursion_depth` 默认值是否够用；不够时有哪些正当的调法？

## 下一步

- 这些查询为什么快或慢，进入 [JOIN 算法](/mysql/390-JOINAlgorithm)与 [EXPLAIN 详解](/mysql/320-EXPLAINDetailed)；
- 016 模块的对应通用篇：[窗口函数](/sql/260-WindowFunction)、[CTE](/sql/230-CTE)、[递归 CTE](/sql/240-RecursiveCTE)；
- 子查询的优化器改写细节见[子查询优化](/mysql/360-SubqueryOptimization)。
