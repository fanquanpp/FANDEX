---
order: 40
title: 数据查询基础：用 SELECT 问出第一个答案
module: 'sql'
category: 数据库
difficulty: beginner
description: 以播客平台「回声FM」为练习场，从零学会 SELECT 的基本形状：选列、过滤、排序、分页、去重、别名与 CASE WHEN，并理解 NULL 与逻辑执行顺序这两个贯穿全模块的心智模型。
author: fanquanpp
updated: '2026-09-13'
related:
  - 'sql/030-SQLFirstSteps'
  - 'sql/050-FilterCondition'
  - 'sql/060-AggregateFunction'
  - 'sql/080-SelectExecutionOrder'
prerequisites:
  - 'sql/030-SQLFirstSteps'
---

## 1. 场景：你刚入职回声FM的数据组

想象你加入一家播客平台「回声FM」，运营同事丢来一串真实问题：

- "昨晚《代码与咖啡》最新一期播放量多少？"
- "把播放量最高的 5 个单集拉出来，我要发周报。"
- "北京听众里有多少人填了手机号？"
- "帮我把节目列表按分类排好序，一页 20 条发给我。"

这些问题没有一个需要写代码——它们全部是**向数据库提问**，而提问的语言就是 `SELECT`。今天这节课的目标：让你能独立把上面四个问题翻译成 SQL，并且知道每一步数据库是怎么做的。

### 1.1 先把练习场搭起来

整篇文章我们只用三张小表。建议你边读边跑：任何能执行 SQL 的环境都可以（SQLite、PostgreSQL 17、MySQL 8.4 均可，个别方言差异文中会标注）。

```sql
-- 节目表：一档播客节目
CREATE TABLE shows (
  id         INT PRIMARY KEY,
  title      VARCHAR(100) NOT NULL,
  category   VARCHAR(30),        -- 分类：科技 / 文化 / 商业
  host       VARCHAR(50),        -- 主播
  is_premium BOOLEAN NOT NULL DEFAULT FALSE  -- 是否付费节目
);

-- 单集表：节目下的每一期
CREATE TABLE episodes (
  id           INT PRIMARY KEY,
  show_id      INT NOT NULL,
  title        VARCHAR(100) NOT NULL,
  duration_min INT,               -- 时长（分钟），未上架完的为 NULL
  play_count   INT NOT NULL DEFAULT 0,
  published_at DATE NOT NULL
);

-- 听众表
CREATE TABLE listeners (
  id        INT PRIMARY KEY,
  nickname  VARCHAR(50) NOT NULL,
  city      VARCHAR(30),
  phone     VARCHAR(20),          -- 允许为 NULL：没填手机号
  signup_at DATE NOT NULL
);
```

```sql
INSERT INTO shows (id, title, category, host, is_premium) VALUES
  (1, '代码与咖啡', '科技', '阿澜', FALSE),
  (2, '深夜书桌',   '文化', '小满', FALSE),
  (3, '增长手记',   '商业', '老周', TRUE),
  (4, '芯片江湖',   '科技', '阿澜', TRUE),
  (5, '城市漫步指南', '文化', '小满', FALSE);

INSERT INTO episodes (id, show_id, title, duration_min, play_count, published_at) VALUES
  (101, 1, '第 40 期：大模型创业这一年',   95, 51200, '2026-08-01'),
  (102, 1, '第 41 期：一个程序员的退休计划', 88, 46800, '2026-08-15'),
  (103, 2, '第 12 期：重读〈百年孤独〉',    76, 22100, '2026-07-20'),
  (104, 3, '第 8 期：咖啡店的定价心理学',   64, 18900, '2026-08-05'),
  (105, 4, '第 3 期：光刻机突围战',        112, 73500, '2026-08-10'),
  (106, 5, '第 21 期：菜市场人类学',       NULL, 9800, '2026-08-20');

INSERT INTO listeners (id, nickname, city, phone, signup_at) VALUES
  (1, '夜航船', '北京', '13800001111', '2026-01-10'),
  (2, '南方的风', '广州', NULL,           '2026-02-14'),
  (3, '摩卡不加糖', '北京', '13800002222', '2026-03-01'),
  (4, '阿基米德', '上海', NULL,           '2026-03-22'),
  (5, '早八人',  '深圳', '13800003333', '2026-04-05');
```

数据只有十几行，但足够我们把每个子句都摸一遍。真实平台是几百万行，逻辑完全一样。

## 2. SELECT 的基本形状

SELECT 要回答的问题永远是三段式：**要哪些列（SELECT）、从哪张表（FROM）、要哪些行（WHERE）**。

```sql
-- 问题："把节目名单拉出来"
SELECT title, host FROM shows;
```

```
title       | host
------------|------
代码与咖啡  | 阿澜
深夜书桌    | 小满
增长手记    | 老周
芯片江湖    | 阿澜
城市漫步指南 | 小满
```

三个要点：

- **只查需要的列**。`SELECT *` 表示"全部列"，适合临时探查，但业务代码里请写明列名：列少传输快，而且表结构一变，`*` 的下游代码就可能出错。
- 列与列之间用逗号分隔，最后一列后面**不能**带逗号。
- SQL 关键字不区分大小写，`select title from shows` 与上面等价。惯例是大写关键字、小写列名，让人一眼分清"关键字"和"数据"。

### 2.1 计算列：SELECT 后面可以放表达式

SELECT 的每一项不一定是列名，也可以是**对列做计算**：

```sql
SELECT
  title,
  duration_min,
  duration_min / 60.0 AS duration_hr,   -- 分钟转小时
  play_count * 2     AS double_count    -- 随便一个演示表达式
FROM episodes;
```

`AS` 给计算结果起**别名**，否则列名会变成整串表达式。省略 `AS` 直接写空格也合法（`duration_min / 60.0 duration_hr`），但显式写 `AS` 更好读。

> 注意 `60.0` 而不是 `60`：很多数据库里整数除整数还是整数（SQLite/SQL Server 中 `95 / 60` 得 `1`），乘个 `1.0` 或 `60.0` 才会得到小数。这是新手最常见的"为什么结果是 0"问题。

### 2.2 别名的两条铁律

别名一旦定义，能用在 `ORDER BY` 里，**不能**用在 `WHERE` 里：

```sql
-- 可以：排序阶段在 SELECT 之后执行
SELECT title, play_count * 1.0 / 10000 AS wan
FROM episodes
ORDER BY wan DESC;

-- 报错：WHERE 阶段时别名还没出生
SELECT title, play_count * 1.0 / 10000 AS wan
FROM episodes
WHERE wan > 3;          -- ERROR: column "wan" does not exist
```

为什么？记住执行顺序（第 9 节详述）：`WHERE` 在 `SELECT` 之前执行，等别名诞生时 `WHERE` 已经跑完了。想过滤就老老实实重写表达式：`WHERE play_count > 30000`。

## 3. WHERE：先学会三招就够用

WHERE 是**行级过滤器**，每行独立判断，为 TRUE 的行留下，为 FALSE 或 UNKNOWN 的行丢掉。

```sql
-- 比较运算：=  <>  >  <  >=  <=
SELECT title, play_count FROM episodes
WHERE play_count > 30000;

-- AND / OR 组合（AND 优先级高于 OR，拿不准就加括号）
SELECT title FROM episodes
WHERE duration_min > 90 OR play_count > 50000;

-- IN：命中列表中任意一个值
SELECT title FROM shows WHERE category IN ('科技', '商业');

-- BETWEEN：闭区间，两头都包含
SELECT title FROM episodes
WHERE published_at BETWEEN '2026-08-01' AND '2026-08-31';
```

`IN` 与多个 `OR` 等价，但更短、更不容易写错；`BETWEEN a AND b` 等价于 `>= a AND <= b`（取反用 `NOT BETWEEN`）。

### 3.1 LIKE：按样子匹配

```sql
SELECT title FROM episodes WHERE title LIKE '第 4%';   -- "第 4"开头
SELECT nickname FROM listeners WHERE nickname LIKE '%糖'; -- "糖"结尾
SELECT phone FROM listeners WHERE phone LIKE '138%';    -- 138 开头
```

两个通配符：`%` 匹配任意长度，`_` 匹配恰好一个字符。反例：`'138____1234'` 要求 4+1 个固定中间位，共 11 位。

模式匹配在全表扫描时很贵（尤其 `%` 开头），索引与优化技巧见下一篇 [过滤条件](/sql/050-FilterCondition)——本节你只需会写。

### 3.2 NULL：三分钟建立一个终生受用的观念

NULL 不是 0，不是空字符串，而是"**这里没有值**"。它有一个反直觉的规则：

> 任何值与 NULL 做比较（`= NULL`、`<> NULL`、`NULL > 1`……），结果都不是 TRUE 也不是 FALSE，而是 UNKNOWN。而 WHERE 只保留 TRUE。

所以：

```sql
SELECT * FROM listeners WHERE phone = NULL;      -- 永远返回 0 行，不报错！
SELECT * FROM listeners WHERE phone IS NULL;     -- 正确：南方的风、阿基米德
SELECT * FROM listeners WHERE phone IS NOT NULL; -- 正确：其余三人
```

这个查询"看起来对、悄悄错"——不报错、返回 0 行，最危险。自检习惯：写完 `= NULL` 就问自己一句"我为什么不用 IS NULL"。

两个常用补救函数：

```sql
SELECT nickname, COALESCE(phone, '未填写') AS phone_display FROM listeners;
-- COALESCE 返回参数中第一个非 NULL 的值

SELECT play_count / NULLIF(0, 0) FROM t;
-- NULLIF(a, b)：a 等于 b 时返回 NULL，常用于防除零
```

## 4. ORDER BY：没有排序的"第一名"是不可信的

```sql
-- 播放量从高到低
SELECT title, play_count FROM episodes ORDER BY play_count DESC;

-- 先按分类升序，同类内按播放量降序（从左到右依次生效）
SELECT title, category, play_count FROM shows
JOIN episodes ON episodes.show_id = shows.id
ORDER BY category ASC, play_count DESC;

-- 按表达式排序
SELECT title, duration_min FROM episodes ORDER BY duration_min / 60.0 DESC;
```

`ASC` 升序是默认值，可省略；`DESC` 降序必须写。**ORDER BY 几乎总是必写**：不指定顺序时数据库返回行的次序是不承诺的，今天碰巧像排好序，明天数据量一大就变——任何"取前 N 条"的查询，ORDER BY 都不能省。

### 4.1 排序时 NULL 放哪边

不同数据库答案不同，这是个高频坑：

```sql
-- PostgreSQL / Oracle：显式控制
SELECT title, duration_min FROM episodes
ORDER BY duration_min DESC NULLS LAST;

-- MySQL：NULL 被当作最小值（ASC 排最前，DESC 排最后）
-- SQL Server：同样 NULL 最小，但无 NULLS FIRST/LAST 语法
```

回声FM的例子里，`duration_min` 为 NULL 的单集是"未上架完"的第 106 期。做"最长的节目"榜单时，若不指定 `NULLS LAST`，PostgreSQL 的 `DESC` 默认把它排第一——榜单头名是个残次品。

## 5. LIMIT / OFFSET：分页与其代价

```sql
-- 播放量前 5（PostgreSQL / MySQL / SQLite）
SELECT title, play_count FROM episodes
ORDER BY play_count DESC
LIMIT 5;

-- 第 2 页，每页 2 条
SELECT title, play_count FROM episodes
ORDER BY play_count DESC
LIMIT 2 OFFSET 2;

-- SQL Server / Oracle 12c+ / 标准 SQL 写法
SELECT title, play_count FROM episodes
ORDER BY play_count DESC
OFFSET 0 ROWS FETCH FIRST 5 ROWS ONLY;
```

`LIMIT` 必须配 `ORDER BY`，否则"前 5 条"每次可能不一样。

### 5.1 深分页：OFFSET 的隐藏账单

`OFFSET 1000000` 的含义是：数据库老老实实读出前 100 万行、全部丢掉，再给你 10 行。页码越深越慢， listeners 一多后台就卡。

成熟做法是**游标分页（Keyset Pagination）**：记住上一页最后一行的位置，下一页从它后面接着取。

```sql
-- 第一页
SELECT id, title FROM episodes ORDER BY id LIMIT 20;
-- 下一页：把上一页最后一行的 id 传进来
SELECT id, title FROM episodes WHERE id > 106 ORDER BY id LIMIT 20;
```

它只走索引定位，代价与页码无关。局限：只能按单一方向顺序翻页，且排序列必须不重复（或组合成唯一键）。运营后台的"跳转到第 37 页"用 OFFSET，无限下滑的信息流用游标——按场景选。

### 5.2 一并拿到总数

分页 UI 常要显示"共 X 条"。传统做法发两条 SQL，窗口函数可以一条搞定（此处先见个面，第 26 篇展开）：

```sql
SELECT title, play_count, COUNT(*) OVER() AS total_count
FROM episodes ORDER BY play_count DESC LIMIT 2;
```

## 6. DISTINCT：去重与"有几种"

```sql
-- 平台有哪些分类？
SELECT DISTINCT category FROM shows;        -- 科技 / 文化 / 商业

-- 组合去重：分类 x 是否付费 的每种组合一行
SELECT DISTINCT category, is_premium FROM shows;

-- 去重计数：有多少种分类？
SELECT COUNT(DISTINCT category) AS category_count FROM shows;
```

要点：

- DISTINCT 作用于**整行组合**，不是只对写在前面的第一列。
- 所有 NULL 被视为互相相同：`SELECT DISTINCT phone` 里多个 NULL 只出现一行。
- `COUNT(DISTINCT col)` 只数不同值的个数，NULL 不计入。

## 7. 第一课统计：聚合函数速览

回答"多少、平均、最大最小"的是**聚合函数**——它把多行折叠成一个数：

```sql
SELECT COUNT(*)                        AS episode_total,   -- 全部行数（含 NULL 行）
       COUNT(duration_min)             AS has_duration,    -- 该列非 NULL 的行数
       AVG(play_count)                 AS avg_plays,
       MAX(play_count)                 AS top_plays,
       MIN(published_at)               AS earliest_date
FROM episodes;
```

结果：`6 / 5 / 37050 / 73500 / 2026-07-20`。注意 `COUNT(*)` 与 `COUNT(duration_min)` 差 1——第 106 期的时长是 NULL。

再配合 `GROUP BY` 就能分组统计（"每个分类的平均播放量"）：

```sql
SELECT category, AVG(episodes.play_count) AS avg_plays
FROM shows
JOIN episodes ON episodes.show_id = shows.id
GROUP BY category;
```

> 判断 WHERE 还是 HAVING：**分组前**过滤行用 WHERE，**分组后**筛选组用 HAVING。细节在 [聚合函数](/sql/060-AggregateFunction) 与 [分组与分组集](/sql/070-GROUPBYGroupingSet) 展开。

### 7.1 CASE WHEN：在 SELECT 里写 if/else

```sql
SELECT
  title,
  duration_min,
  CASE
    WHEN duration_min >= 100 THEN '长篇'
    WHEN duration_min >= 60  THEN '标准'
    WHEN duration_min <  60  THEN '短篇'
    ELSE '未上架完'
  END AS length_tier
FROM episodes;
```

三种高频用法：

```sql
-- 1. 条件计数：一次查询同时数出多类
SELECT
  COUNT(*) FILTER (WHERE is_premium)                  AS premium_cnt,   -- PostgreSQL 简写
  COUNT(CASE WHEN is_premium THEN 1 END)              AS premium_classic -- 通用写法
FROM shows;

-- 2. 行转列的雏形
SELECT
  SUM(CASE WHEN category = '科技' THEN 1 ELSE 0 END) AS tech_cnt,
  SUM(CASE WHEN category = '文化' THEN 1 ELSE 0 END) AS culture_cnt
FROM shows;

-- 3. ORDER BY 里的自定义顺序
SELECT title, category FROM shows
ORDER BY CASE category WHEN '科技' THEN 1 WHEN '商业' THEN 2 ELSE 3 END;
```

`COUNT(CASE WHEN ... THEN 1 END)` 能成立的原理仍是 NULL：条件不满足时 CASE 返回 NULL，`COUNT` 忽略 NULL。理解了三值逻辑，这类惯用法就不再是咒语。

## 8. 谁说了算：SELECT 的逻辑执行顺序

同一段 SQL，写法顺序和执行顺序不一样。数据库按下面的顺序**逻辑上**执行：

```
1. FROM        确定数据源（本篇只有单表，多表在 JOIN 篇展开）
2. WHERE       逐行过滤            ← 别名尚不存在
3. GROUP BY    分组
4. HAVING      组级过滤
5. SELECT      计算列、起别名       ← 别名在这里出生
6. DISTINCT    去重
7. ORDER BY    排序                ← 可以用别名了
8. LIMIT       截取行数
```

这一张图能解释本篇所有"为什么"：

- 为什么 WHERE 里不能用别名？它跑在 SELECT 前面。
- 为什么 ORDER BY 里能用别名？它跑在 SELECT 后面。
- 为什么 `WHERE play_count > 30000` 之后再 `LIMIT 5` 得到的就是前五名？先过滤后截取。
- 为什么 `COUNT(*) FILTER`、窗口函数不写在 WHERE 里？聚合与窗口都在第 5 步及以后才可计算。

> 这是**逻辑**顺序：优化器物理上可能重排（比如先用索引完成 WHERE 和 ORDER BY），但结果永远等价于按此顺序执行。完整推演见 [SELECT 执行顺序](/sql/080-SelectExecutionOrder)。

## 9. 坑点清单与自检

写完任何 SELECT，过一遍这五问：

1. **该排序的地方排序了吗？** 想要"前 N""最新""第一名"，没有 ORDER BY 的结果不可信。
2. **有没有 `= NULL`？** 改成 `IS NULL` / `IS NOT NULL`。
3. **整数除法吞掉小数了吗？** `* 1.0` 或改用小数字面量。
4. **`SELECT *` 是否要换成明确列名？** 业务代码中 `*` 会在表加列、改列时埋雷。
5. **深分页用 OFFSET 还在变慢吗？** 换游标分页。

MySQL 用户补一条：MySQL 的 `<=>` 是 NULL 安全等号（`phone <=> NULL` 等价于 `IS NULL`），标准 SQL 没有它，写可移植 SQL 时别用。

## 10. 练习

全部基于本篇的回声FM三张表，答案都能用文中讲过的句子拼出来：

1. 查询所有付费节目（`is_premium = TRUE`）的标题与主播，按标题排序。
2. 查询时长超过 90 分钟的单集标题、时长（以小时显示，保留小数），按时长降序。
3. 统计北京和上海各有多少听众填了手机号。（提示：`WHERE city IN (...) AND phone IS NOT NULL`，按 city 分组计数。）
4. 找出播放量第二高的单集。（提示：`ORDER BY play_count DESC LIMIT 1 OFFSET 1`；再想想：如果两个单集播放量并列第一，这个答案哪里不对？）
5. 给每个单集打标签：播放量 >= 50000 为"爆款"，>= 20000 为"腰部"，其余为"长尾"，输出标题与标签。
6. （思考题）`SELECT DISTINCT host` 与 `SELECT host` 在回声FM的 shows 表上结果条数一样吗？为什么？

## 下一步

- [过滤条件](/sql/050-FilterCondition)：WHERE 的完整语法、模式匹配性能、索引友好写法。
- [聚合函数](/sql/060-AggregateFunction)：COUNT/SUM/AVG 的 NULL 细节与 DISTINCT 聚合。
- [SELECT 执行顺序](/sql/080-SelectExecutionOrder)：把第 8 节那张图展开成完整推演。
- 查询已经会了，接下来该学怎么把数据放进去：[数据操作](/sql/120-DML)。
