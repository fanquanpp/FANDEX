---
order: 270
title: 窗口函数：不折叠行，也能跨行计算
module: 'sql'
category: 数据库
difficulty: advanced
description: 以播客平台「回声FM」的数据周报为主线，掌握 OVER/PARTITION BY/ORDER BY 三件套、排名与偏移函数、ROWS/RANGE/GROUPS 帧定义，以及 Top-N、环比同比、连续打卡、去重取最新四大实战模式。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'sql/060-AggregateFunction'
  - 'sql/070-GROUPBYGroupingSet'
  - 'sql/230-CTE'
  - 'sql/270-WindowFunctionFramework'
prerequisites:
  - 'sql/060-AggregateFunction'
  - 'sql/230-CTE'
---

## 1. 场景：周报需求单来了

还是回声FM的数据组。这次运营的周报需求单上有四个问题，你很快会发现它们有一个共同点：

1. 每个分类内部，单集播放量排第几？——**分组内排序**
2. 每个单集比"本节目平均播放量"高多少？——**组内平均和每一行同时出现**
3. 每日播放量，以及它的 7 日滑动平均、年初至今累计？——**跨行累计**
4. 每天环比昨天涨了多少？——**拿当前行和上一行比**

用第 6、7 篇学的 GROUP BY 能做 1 的前半截，但做不了 2——GROUP BY 会把每组折叠成一行，"平均值"和"这一行自己"没法同时出现在结果里。这四个需求的共性是：**既要每一行，又要跨行的计算结果**。这正是窗口函数的领地。

窗口函数不是新东西：SQL:2003 并入主标准，PostgreSQL 8.4+、MySQL 8.0+、SQLite 3.25+ 都已支持，2026 年的今天可以放心在任何项目里用。

### 1.1 练习场数据

沿用回声FM的 `shows`/`episodes` 表（见 [数据查询基础](/sql/040-DataQueryBasics)），再补两张：

```sql
-- 每日播放统计（运营已按天汇总好）
CREATE TABLE daily_plays (
  stat_date  DATE NOT NULL,
  show_id    INT NOT NULL,
  play_count INT NOT NULL,
  PRIMARY KEY (stat_date, show_id)
);

-- 听众收听日历：谁哪天来听过（判断"连续打卡"用）
CREATE TABLE listen_log (
  listener_id INT NOT NULL,
  listen_date DATE NOT NULL,
  PRIMARY KEY (listener_id, listen_date)
);

INSERT INTO daily_plays (stat_date, show_id, play_count) VALUES
  ('2026-09-01', 1, 1200), ('2026-09-02', 1, 1350), ('2026-09-03', 1, 1100),
  ('2026-09-04', 1, 1500), ('2026-09-05', 1, 1700), ('2026-09-06', 1, 2100),
  ('2026-09-07', 1, 1900),
  ('2026-09-01', 4, 800),  ('2026-09-02', 4, 950),  ('2026-09-03', 4, 1000),
  ('2026-09-04', 4, 2600), ('2026-09-05', 4, 2800), ('2026-09-06', 4, 3200),
  ('2026-09-07', 4, 3000);

INSERT INTO listen_log (listener_id, listen_date) VALUES
  (1, '2026-09-01'), (1, '2026-09-02'), (1, '2026-09-03'),
  (1, '2026-09-05'), (1, '2026-09-06'),          -- 断了一天
  (2, '2026-09-01'), (2, '2026-09-02'),          -- 只听了两天
  (3, '2026-09-02'), (3, '2026-09-03'), (3, '2026-09-04');
```

## 2. 破冰：聚合和窗口差在哪

同一个"求平均"，两种世界观：

```sql
-- GROUP BY：折叠。6 个单集 → 3 行，每行只剩组平均值
SELECT show_id, AVG(play_count) AS avg_plays
FROM episodes
GROUP BY show_id;

-- 窗口函数：不折叠。6 个单集还是 6 行，每行旁边多一列组平均值
SELECT title, show_id, play_count,
       AVG(play_count) OVER (PARTITION BY show_id) AS show_avg
FROM episodes;
```

第二段查询里，`AVG(...) OVER (...)` 的意思是："对当前行所在的分区（同一节目）求平均，但把结果**贴**在每行旁边，不要合并行"。需求 2 的"比平均高多少"立刻可解：

```sql
SELECT title, show_id, play_count,
       play_count - AVG(play_count) OVER (PARTITION BY show_id) AS diff_from_avg
FROM episodes;
```

一句话心智模型：**聚合函数把多行压成一个数；窗口函数给每一行都发一份"我所在群体的统计结果"**。

### 2.1 OVER 三件套

窗口函数的完整形状是：

```sql
函数() OVER (
  [PARTITION BY 分区列 ...]   -- 把行分成若干个独立的"窗口"
  [ORDER BY 排序列 ...]       -- 窗口内行的顺序，决定排名/累计/前后行
  [帧定义]                    -- 进一步圈定参与计算的行范围，第 5 节展开
)
```

三件事层层缩小计算范围：PARTITION BY 决定"和谁一组"，ORDER BY 决定"组内谁前谁后"，帧决定"具体算哪几行"。

不带任何参数的 `OVER()` 表示整张表是一个窗口：

```sql
SELECT title, play_count,
       AVG(play_count) OVER() AS overall_avg,      -- 全表平均
       play_count * 1.0 / SUM(play_count) OVER() AS pct_of_all
FROM episodes;
```

它等价于把标量子查询 `(SELECT AVG(play_count) FROM episodes)` 写在 SELECT 里，但一次扫描完成多个窗口统计，更清晰也更快。

## 3. 排名函数：需求 1 的三种答案

### 3.1 ROW_NUMBER、RANK、DENSE_RANK

回声FM搞"科技分类收听榜"，两个单集并列怎么办？三个函数给出三种哲学：

```sql
SELECT
  title,
  play_count,
  ROW_NUMBER() OVER (ORDER BY play_count DESC) AS rn,
  RANK()       OVER (ORDER BY play_count DESC) AS rnk,
  DENSE_RANK() OVER (ORDER BY play_count DESC) AS drnk
FROM episodes
WHERE play_count > 40000;
```

假设四行播放量是 `73500, 51200, 51200, 46800`：

| title          | play_count | rn | rnk | drnk |
| -------------- | ---------- | -- | --- | ---- |
| 光刻机突围战   | 73500      | 1  | 1   | 1    |
| 大模型创业这一年 | 51200    | 2  | 2   | 2    |
| 一个程序员的退休计划 | 51200 | 3  | 2   | 2    |
| 咖啡店的定价心理学 | 46800  | 4  | 4   | 3    |

- `ROW_NUMBER`：强制唯一，并列也分先后（先后次序不稳定，除非 ORDER BY 加决胜列）；
- `RANK`：并列同名次，下一名**跳号**（两个第 2 之后是第 4）；
- `DENSE_RANK`：并列同名次，**不跳号**（两个第 2 之后是第 3）。

发奖只发 3 份用 ROW_NUMBER（保证恰好 3 人），排行榜展示用 RANK/DENSE_RANK（并列合理）。

### 3.2 分区排名与 Top-N per group

给排名加分组，就是需求 1 的答案——"每个分类内部的排名"：

```sql
SELECT
  e.title,
  s.category,
  e.play_count,
  DENSE_RANK() OVER (PARTITION BY s.category ORDER BY e.play_count DESC) AS cat_rank
FROM episodes e
JOIN shows s ON s.id = e.show_id;
```

`PARTITION BY category` 让科技和文化两列排名互不干扰，每个分区从 1 重新数。

由此得到窗口函数最著名的应用模式——**每组 Top N**：

```sql
WITH ranked AS (
  SELECT
    e.title, s.category, e.play_count,
    ROW_NUMBER() OVER (PARTITION BY s.category ORDER BY e.play_count DESC) AS rn
  FROM episodes e
  JOIN shows s ON s.id = e.show_id
)
SELECT category, title, play_count
FROM ranked
WHERE rn <= 2;    -- 每个分类播放量前 2 名
```

"先编号进 CTE，再外层过滤"是固定套路——窗口函数不能写在 WHERE 里，因为 WHERE 的执行顺序在窗口计算之前（回忆 [SELECT 执行顺序](/sql/080-SelectExecutionOrder)）。

### 3.3 分桶与百分位

```sql
-- 把收听时长前 100 的听众切成 4 层，会员运营按层发券
SELECT listener_id, total_minutes,
       NTILE(4) OVER (ORDER BY total_minutes DESC) AS quartile   -- 1/2/3/4 层
FROM listener_summary;

-- PERCENT_RANK：相对位置 (rank-1)/(总行数-1)，榜首为 0
-- CUME_DIST：累积占比，"不超过我的人占多少"
SELECT nickname, score,
       PERCENT_RANK() OVER (ORDER BY score) AS pct_rank,
       CUME_DIST()    OVER (ORDER BY score) AS cume_dist
FROM quiz_results;
```

NTILE 分桶时行数不能整除 N，多的行会分给前面的桶——第 1 桶永远不比第 4 桶少。

## 4. LAG / LEAD：需求 4，和邻行比

`LAG` 取排序中当前行**前面**第 N 行的值，`LEAD` 取后面第 N 行。环比的最短路径：

```sql
SELECT
  stat_date,
  play_count,
  LAG(play_count) OVER (ORDER BY stat_date)                AS yesterday,
  play_count - LAG(play_count) OVER (ORDER BY stat_date)   AS day_diff
FROM daily_plays
WHERE show_id = 1;
```

第一天没有"昨天"，LAG 返回 NULL——这是**特性不是错误**，NULL 表示"没有可比对象"。想给个占位值可以用第三参数：

```sql
LAG(play_count, 1, 0) OVER (ORDER BY stat_date)   -- 没有前一行时返回 0
LAG(play_count, 7)    OVER (ORDER BY stat_date)   -- 7 天前，同比的原材料
```

注意 LAG/LEAD **必须**配 ORDER BY：没有顺序，"前一行"无从谈起。

## 5. 帧：把计算范围说清楚

PARTITION BY 划出窗口，帧（frame）再在窗口内圈定"这次到底算哪些行"。语法：

```sql
{ROWS | RANGE | GROUPS} BETWEEN 边界1 AND 边界2
-- 边界：UNBOUNDED PRECEDING | N PRECEDING | CURRENT ROW | N FOLLOWING | UNBOUNDED FOLLOWING
```

不写帧时，**带 ORDER BY 的窗口默认帧是 `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`**——从窗口头到当前行。记住这个默认值，一半的窗口 bug 都源于它。

### 5.1 ROWS vs RANGE：一字之差，结果两样

回声FM要看"年初至今累计播放"和"最近 7 天滑动平均"：

```sql
SELECT
  stat_date,
  play_count,
  SUM(play_count) OVER (
    ORDER BY stat_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS running_total,                          -- 累计：头一路加到当前行
  ROUND(AVG(play_count) OVER (
    ORDER BY stat_date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ), 0) AS ma7                                 -- 7 行滑动平均
FROM daily_plays
WHERE show_id = 1;
```

`ROWS` 按物理行数偏移。`RANGE` 按排序列的**值**偏移，排序列相同的行视为"同一格"。假设同一天有两行数据（两个节目混在一起没过滤）：

```sql
-- 某天 stat_date 相同、play_count 分别为 100 和 200
-- ROWS：走到第二行时累计 = 前面全部 + 100 + 200
-- RANGE：两行视作同格，走到任何一行时累计都把同日两行一起算入
```

用 ROWS 想要"按天累计"但数据有同日多行时会算出诡异结果；反之用 RANGE 想要"逐行累计"时会突然跳跃。**累计/滑动类需求，先问自己：同值多行时，我想要逐行还是逐格？**

### 5.2 RANGE + INTERVAL：时间语义的滑动窗口

`ROWS BETWEEN 6 PRECEDING` 是"前 6 **行**"，数据缺一天时它会拿"6 行前"冒充"7 天前"。要严格的时间窗，PostgreSQL（11+）支持 RANGE 搭配 INTERVAL：

```sql
SELECT
  stat_date,
  play_count,
  SUM(play_count) OVER (
    ORDER BY stat_date
    RANGE BETWEEN INTERVAL '6 days' PRECEDING AND CURRENT ROW
  ) AS week_sum_strict          -- 严格"最近 7 个自然日"，缺天的日子不会多算
FROM daily_plays
WHERE show_id = 1;
```

MySQL 不支持 RANGE INTERVAL（排序值必须是数值），需要补齐日历表后再用 ROWS。

### 5.3 GROUPS：按"同值组"数行

GROUPS 帧把"排序列值相同的一组行"当作一个计数单位，介于 ROWS 和 RANGE 之间：

```sql
-- 含当前行在内，最近 3 个"名次组"的平均分（并列名次整组进出窗口）
AVG(score) OVER (
  ORDER BY score DESC
  GROUPS BETWEEN 2 PRECEDING AND CURRENT ROW
)
```

PostgreSQL 11+、MySQL 8.0+、SQLite 3.28+ 支持。需要"并列整组处理"的榜单统计时，它比手工去重干净得多。

### 5.4 常用帧速查

```sql
ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW          -- 累计
ROWS BETWEEN 6 PRECEDING AND CURRENT ROW                  -- 最近 7 行
ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING                  -- 以前后各 3 行为中心的平滑
RANGE BETWEEN INTERVAL '29 days' PRECEDING AND CURRENT ROW -- 最近 30 天（PostgreSQL）
```

## 6. 取值函数与 LAST_VALUE 之坑

`FIRST_VALUE` / `LAST_VALUE` / `NTH_VALUE` 把窗口内某行的值取到当前行：

```sql
SELECT
  title, play_count,
  FIRST_VALUE(title) OVER w AS top_episode,      -- 分区第一名
  NTH_VALUE(title, 2) OVER w AS runner_up        -- 分区第二名
FROM episodes
WINDOW w AS (PARTITION BY show_id ORDER BY play_count DESC
             ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING);
```

这里的 `WINDOW w AS (...)` 是**窗口定义复用**：起个名字，多个函数共用一段 OVER，避免复制粘贴三遍。

**LAST_VALUE 是窗口函数第一坑**。若不写帧，默认帧是"头到当前行"——对 LAST_VALUE 来说"当前行"永远就是窗口最后一行，结果它返回的永远是当前行自己：

```sql
-- 错误示范：last_one 恒等于 play_count 自己
LAST_VALUE(play_count) OVER (PARTITION BY show_id ORDER BY play_count)

-- 正确：显式把帧撑到分区末尾
LAST_VALUE(play_count) OVER (
  PARTITION BY show_id ORDER BY play_count
  ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
)
```

自检口诀：**FIRST_VALUE 天生安全，LAST_VALUE 必查帧**。

## 7. 实战四连

### 7.1 连续收听天数（gaps and islands）

运营想知道：谁在 9 月有"连续 3 天以上"的收听 streak？思路是把"连续的日期"分到同一组：日期减去它自己的序号，连续时差值恒定。

```sql
WITH dated AS (
  SELECT listener_id, listen_date,
         listen_date
           - (ROW_NUMBER() OVER (PARTITION BY listener_id ORDER BY listen_date))::INT
           AS grp
  FROM listen_log
  WHERE listen_date >= '2026-09-01'
)
SELECT listener_id,
       MIN(listen_date) AS streak_start,
       MAX(listen_date) AS streak_end,
       COUNT(*)         AS streak_days
FROM dated
GROUP BY listener_id, grp
HAVING COUNT(*) >= 3
ORDER BY streak_days DESC;
```

以听众 1 为例：9-01/02/03 连续，序号 1/2/3，差值都是同一天（grp 相同）；9-05/06 是第二段，grp 换了新值。这个"日期 - 行号 = 分组键"的技巧叫 gaps and islands，是窗口函数的招牌魔术。MySQL 里日期减整数要改用 `DATE_SUB(listen_date, INTERVAL rn DAY)`。

### 7.2 环比与同比

```sql
WITH monthly AS (
  SELECT DATE_TRUNC('month', published_at)::DATE AS month,
         SUM(play_count) AS plays
  FROM episodes
  GROUP BY 1
)
SELECT
  month, plays,
  LAG(plays) OVER (ORDER BY month) AS prev_month,
  ROUND((plays - LAG(plays) OVER (ORDER BY month)) * 100.0
        / NULLIF(LAG(plays) OVER (ORDER BY month), 0), 1) AS mom_pct,
  LAG(plays, 12) OVER (ORDER BY month) AS same_month_last_year,
  ROUND((plays - LAG(plays, 12) OVER (ORDER BY month)) * 100.0
        / NULLIF(LAG(plays, 12) OVER (ORDER BY month), 0), 1) AS yoy_pct
FROM monthly;
```

`NULLIF(..., 0)` 防除零；头几个月的环比/同比天然为 NULL，报表里应显示"—"而不是当 0 处理。MySQL 版本把 `DATE_TRUNC('month', ...)` 换成 `DATE_FORMAT(published_at, '%Y-%m-01')` 即可。

### 7.3 去重取最新

用户资料表被多次同步，同一 `listener_id` 有多版记录，只要每人的最新一版：

```sql
-- 通用：ROW_NUMBER
WITH ranked AS (
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY listener_id ORDER BY updated_at DESC) AS rn
  FROM listener_profiles
)
SELECT * FROM ranked WHERE rn = 1;

-- PostgreSQL 专属短写法：DISTINCT ON
SELECT DISTINCT ON (listener_id) *
FROM listener_profiles
ORDER BY listener_id, updated_at DESC;
```

两种写法等价，DISTINCT ON 更短但只属于 PostgreSQL；写跨库兼容的取数脚本用 ROW_NUMBER。

### 7.4 榜单聚合：窗口套聚合

窗口函数和 GROUP BY 能叠用——先聚合再开窗（窗口在 GROUP BY 之后计算）：

```sql
SELECT
  stat_date,
  SUM(play_count) AS day_total,
  ROUND(SUM(play_count) * 100.0 / SUM(SUM(play_count)) OVER (), 1) AS pct_of_week
FROM daily_plays
WHERE stat_date BETWEEN '2026-09-01' AND '2026-09-07'
GROUP BY stat_date
ORDER BY stat_date;
```

`SUM(SUM(play_count)) OVER ()` 读作"对每天的总和再开一个全表窗口求总和"——嵌套的是聚合结果，不是行。

## 8. 坑点清单与自检

1. **窗口函数写进了 WHERE** → 报错或干脆想不通。它执行在 SELECT 阶段，过滤请包一层 CTE/子查询。
2. **LAST_VALUE 忘了撑帧** → 返回的是当前行自己。见到 LAST_VALUE/NTH_VALUE 先看帧。
3. **累计/滑动用 ROWS 还是 RANGE 没想清楚** → 同值多行时结果跳变。逐行选 ROWS，逐格选 RANGE，按自然日选 RANGE INTERVAL。
4. **ORDER BY 没加决胜列** → ROW_NUMBER 并列行的次序不稳定，分页翻页会"丢行/重行"。补 `ORDER BY play_count DESC, id`。
5. **NULL 排序位置影响排名** → PostgreSQL 默认 ASC 时 NULL 排最后（被认为最大），需要 `NULLS LAST` 明示；MySQL 把 NULL 当最小值。
6. **性能**：窗口函数通常要按分区排序数据，百万行级别先缩小 WHERE 范围、只对必要列开窗；能改成 GROUP BY 的汇总不要硬用窗口。

## 9. 练习

全部基于回声FM的表：

1. 查询每个节目内播放量第 2 的单集（注意并列名次时用哪个函数，写出你的取舍理由）。
2. 给 daily_plays 每行加上"本周内截至当日的累计播放量"和"当日在 7 天中的占比"。
3. 用 LAG 找出播放量"两连涨"（今天比昨天高、昨天比前天也高）的所有日期。
4. 听众 3 在 9 月最长连续收听天数是多少？写出 SQL 并人工验算。
5. 把单集按播放量分成 3 桶（NTILE），输出每桶的播放量上下界。
6. （思考题）`COUNT(*) OVER ()` 和 `COUNT(*)` 什么时候返回同一个数？什么时候不同？

## 下一步

- [窗口函数框架细节](/sql/270-WindowFunctionFramework)：帧定义与窗口规格的更多边界情况。
- [CTE 公用表表达式](/sql/230-CTE)：本文大量使用的 WITH 套路的完整语法。
- [递归 CTE](/sql/240-RecursiveCTE)：窗口解决不了的层级/图遍历问题。
