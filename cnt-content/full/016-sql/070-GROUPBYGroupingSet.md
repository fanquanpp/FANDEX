---
order: 80
title: GROUP BY 与分组集
module: 'sql'
category: 数据库
difficulty: advanced
description: 用播客平台的收听周报掌握分组：GROUP BY 基础、ROLLUP 小计总计、GROUPING 区分汇总行、GROUPING SETS 精确控制与 CUBE 的成本。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'sql/050-FilterCondition'
  - 'sql/060-AggregateFunction'
  - 'sql/150-JoinQuery'
prerequisites:
  - 'sql/020-OverviewStandard'
---

## 场景：一张带小计的周报

运营周会要一张收听报表：**每个节目在每个客户端的收听次数**，外加每档节目的小计和全平台总计。数据长这样：

```sql
CREATE TABLE plays (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- MySQL: BIGINT AUTO_INCREMENT
    show_name  VARCHAR(100) NOT NULL,
    platform   VARCHAR(20)  NOT NULL,   -- ios / android / web
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

普通 GROUP BY 能给出最细粒度，但小计和总计要怎么办？把三个结果各查一遍再用程序拼？可以，但三次扫描、三段代码，还容易在程序里拼错。SQL 标准早就为这件事准备了分组集。

## 动手：从 GROUP BY 到 ROLLUP

### 先把最细粒度做对

```sql
SELECT show_name, platform, COUNT(*) AS play_count
FROM plays
GROUP BY show_name, platform;
```

结果只有明细行：

| show_name | platform | play_count |
| --- | --- | --- |
| 代码夜话 | ios | 2 |
| 代码夜话 | android | 1 |
| 早班机 | android | 1 |
| 早班机 | web | 2 |

三条基础规则，先自查一遍：

- SELECT 里的非聚合列必须出现在 GROUP BY 中（否则数据库不知道这行该归哪组）；
- 分组列的 NULL 值会聚成同一组；
- GROUP BY 后面可以写表达式，比如 `GROUP BY DATE(played_at)` 按天分。

**只在分组后能用的过滤是 HAVING，不是 WHERE**：WHERE 在分组前过滤行，HAVING 在分组后过滤组。

```sql
-- 只看播放量达到 2 次的"节目 x 客户端"组合
SELECT show_name, platform, COUNT(*) AS play_count
FROM plays
WHERE played_at >= '2026-09-01' AND played_at < '2026-09-08'  -- 先过滤行
GROUP BY show_name, platform
HAVING COUNT(*) >= 2;                                          -- 再过滤组
```

### ROLLUP：一层层向上卷

把明细、小计、总计一次查出来的写法：

```sql
SELECT show_name, platform, COUNT(*) AS play_count
FROM plays
GROUP BY ROLLUP (show_name, platform);
```

结果多了 4 行（MySQL 的方言写法见下方说明）：

| show_name | platform | play_count | 这行是什么 |
| --- | --- | --- | --- |
| 代码夜话 | ios | 2 | 明细 |
| 代码夜话 | android | 1 | 明细 |
| 代码夜话 | NULL | 3 | 节目小计（不看客户端） |
| 早班机 | android | 1 | 明细 |
| 早班机 | web | 2 | 明细 |
| 早班机 | NULL | 3 | 节目小计 |
| NULL | NULL | 6 | 总计 |

ROLLUP(show_name, platform) 等价于三个分组集依次执行：`(show_name, platform)`、`(show_name)`、`()`。维度多一层就多一层汇总：ROLLUP(年, 月, 日) 会给出月小计、年小计和总计——这正是报表系统"按层级卷起"的含义。

MySQL 的方言写法（8.0 支持 ROLLUP，但不支持 CUBE 和 GROUPING SETS）：

```sql
SELECT show_name, platform, COUNT(*) AS play_count
FROM plays
GROUP BY show_name, platform WITH ROLLUP;
```

## 为什么：汇总行的 NULL 和数据里的 NULL 怎么区分

ROLLUP 的结果里，小计行和总计行的分组列是 NULL。麻烦在于：如果 `platform` 这一列本身允许 NULL，数据里也可能有 NULL。两种 NULL 混在一张报表里，前端没法区分"没有客户端数据"和"这是小计行"。

`GROUPING()` 函数就是为此存在的：分组列参与分组时返回 0，因分组集被卷起时返回 1。

```sql
SELECT
    COALESCE(show_name, 'ALL')                       AS show_label,
    CASE WHEN GROUPING(platform) = 1 THEN 'ALL'
         ELSE platform END                           AS platform_label,
    COUNT(*)                                         AS play_count,
    GROUPING(show_name) + GROUPING(platform)         AS summary_level
FROM plays
GROUP BY ROLLUP (show_name, platform);
```

`summary_level` 一列直接告诉前端：0 是明细，1 是节目小计，2 是总计。比用 NULL 当标记可靠得多。

PostgreSQL 的 `GROUPING(a, b)` 支持多参数，返回按位组合的整数（a 是高位）；SQL Server 把这个能力单独做成了 `GROUPING_ID(a, b)` 函数，语义相同。

## 动手：GROUPING SETS 与 CUBE

### GROUPING SETS：精确指定要哪几层

ROLLUP 是固定的"逐层卷起"。如果周报只要"按节目汇总"和"按客户端汇总"两栏，不要交叉明细，也不要总计，就用 GROUPING SETS 明确列出来：

```sql
SELECT show_name, platform, COUNT(*) AS play_count
FROM plays
GROUP BY GROUPING SETS (
    (show_name),      -- 按节目
    (platform)        -- 按客户端
);
```

它就是两条 GROUP BY 的 UNION ALL，但只扫一遍表：

```sql
-- 等价写法（扫两遍表，结果顺序可能不同）
SELECT show_name, NULL AS platform, COUNT(*) FROM plays GROUP BY show_name
UNION ALL
SELECT NULL, platform, COUNT(*) FROM plays GROUP BY platform;
```

要总计就补一个空集：`GROUPING SETS ((show_name), (platform), ())`。

### CUBE：所有维度组合全来一遍

CUBE 生成全部 2 的 n 次方个分组集。两个维度就是 4 组：明细、按节目、按客户端、总计：

```sql
SELECT show_name, platform, COUNT(*) AS play_count
FROM plays
GROUP BY CUBE (show_name, platform);
```

三维（加 region）就是 8 组，四维 16 组。分组集数量是指数增长的，每个分组集都是一次完整的聚合运算——这是 CUBE 和随意 ROLLUP 之间最重要的区别。

### 三者关系一句话

- GROUPING SETS：点菜，要哪几层写哪几层；
- ROLLUP：套餐，按维度顺序逐层卷起；
- CUBE：自助餐，全组合都上。

任何 ROLLUP/CUBE 都能改写成 GROUPING SETS；拿不准时先写 GROUPING SETS 再看要不要简写。

## 坑点与自检

### 坑一：MySQL 的能力边界

MySQL 只支持 `WITH ROLLUP`（等价于 ROLLUP）和 8.0 起的 `GROUPING()` 函数；**没有 CUBE、没有 GROUPING SETS**。需要多维分组集时，要么在 MySQL 里用多条查询 UNION ALL，要么把这类报表查询放到支持完整分组集的数据库（PostgreSQL、SQL Server、Oracle、ClickHouse 等）执行。选型前先确认报表引擎的分组集能力。

### 坑二：WITH ROLLUP 的排序限制

MySQL 的 `WITH ROLLUP` 不允许结果里再写 ORDER BY（会报错），汇总行的位置也不由你控制。需要"小计跟在每个分组后面并排序"的报表样式，PostgreSQL 的 ROLLUP 配合 `ORDER BY GROUPING(...)` 更合适：

```sql
-- PostgreSQL：明细在前、小计在后、总计最后
SELECT show_name, platform, COUNT(*) AS play_count
FROM plays
GROUP BY ROLLUP (show_name, platform)
ORDER BY GROUPING(show_name), show_name, GROUPING(platform);
```

### 坑三：列数多时 CUBE 失控

`CUBE(a, b, c, d, e)` 是 32 个分组集，大表上就是 32 次聚合。自检方法：**先数维度，再问自己报表真的每一层都要吗**。绝大多数报表只要其中三五层，直接写 GROUPING SETS：

```sql
-- 代替 CUBE(a,b,c,d,e)：只要关键几层
GROUP BY GROUPING SETS ((a, b, c), (a, b), (a), ());
```

### 坑四：大数据量的正解是预聚合

实时扫明细表算 ROLLUP，量一大就顶不住。常规架构是定时把聚合结果写进汇总表或物化视图，报表查汇总表：

```sql
-- PostgreSQL 物化视图（刷新命令支持 CONCURRENTLY 不锁读）
CREATE MATERIALIZED VIEW play_summary AS
SELECT show_name, platform, DATE_TRUNC('day', played_at) AS day, COUNT(*) AS cnt
FROM plays
GROUP BY show_name, platform, DATE_TRUNC('day', played_at);

REFRESH MATERIALIZED VIEW CONCURRENTLY play_summary;
```

分组集负责"一次算对"，预聚合负责"天天算得起"，两者是配合关系。

## 练习

1. 用 plays 表查出"每个节目每天的播放次数 + 每节目小计 + 总计"，一次查询完成（提示：ROLLUP 配合表达式分组）。
2. 把第 1 题的结果加上 `summary_level` 列，区分明细、小计、总计。
3. 用 GROUPING SETS 查"按节目汇总"和"按客户端汇总"两栏加总计行，并与 UNION ALL 写法对比结果行数是否一致。
4. 在 MySQL 里验证：GROUPING SETS 会报什么错？`WITH ROLLUP` 后面加 ORDER BY 会报什么错？
5. 思考题：报表要求"分客户端小计里 ios/android/web 各一行，但不要按节目的小计"。应该用三个关键词中的哪一个？写出 SQL。

## 下一步

- GROUP BY 常与 JOIN 后的多表数据配合，先过[连接查询](/sql/150-JoinQuery)；
- 子句执行顺序（WHERE 与 HAVING 为什么不能互换）在[SELECT 执行顺序](/sql/080-SelectExecutionOrder)有完整推演；
- 报表中的排名、占比、环比要靠窗口函数，见[窗口函数](/sql/260-WindowFunction)。
