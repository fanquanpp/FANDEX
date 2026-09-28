---
order: 60
title: 聚合函数：把多行折成一个数，别把 NULL 折丢
module: 'sql'
category: 数据库
difficulty: intermediate
description: 以播客平台「回声FM」的运营周报为主线，动手掌握 COUNT/SUM/AVG/MAX/MIN 与 GROUP BY/HAVING，吃透 NULL、空结果集、浮点精度三大陷阱，并把条件计数、中位数、字符串聚合、JSON 聚合等高频招式一次练全。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'sql/040-DataQueryBasics'
  - 'sql/070-GROUPBYGroupingSet'
  - 'sql/080-SelectExecutionOrder'
  - 'sql/260-WindowFunction'
prerequisites:
  - 'sql/040-DataQueryBasics'
---

## 1. 场景：运营要一份周报

还是回声FM的数据组。周五下午，运营的周报需求到了：

- "本周总共上架了几期节目？"
- "全平台总播放量、平均播放量多少？"
- "每个分类各有多少期、平均播放量多少？分类里播放量不到 1 万的不要。"
- "哪期节目播放量最高？把那一期整个拉出来。"

前两条是把**很多行折成一个数**；第三条要**先分组再折**，还要在折完之后**筛掉不合格的组**；第四条要顺着"最大值"把**整行**找回来。这四件事正好覆盖聚合函数的全部主干：`COUNT`、`SUM`、`AVG`、`MAX`、`MIN`、`GROUP BY`、`HAVING`。这篇就沿着这份需求单，把聚合一次做全。

### 1.1 练习场数据

沿用[数据查询基础](/sql/040-DataQueryBasics)的三张表（`shows`/`episodes`/`listeners`），另加一张评分表。没建过的读者把下面脚本整体跑一遍即可：

```sql
CREATE TABLE shows (
  id         INT PRIMARY KEY,
  title      VARCHAR(100) NOT NULL,
  category   VARCHAR(30),
  host       VARCHAR(50),
  is_premium BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE episodes (
  id           INT PRIMARY KEY,
  show_id      INT NOT NULL,
  title        VARCHAR(100) NOT NULL,
  duration_min INT,
  play_count   INT NOT NULL DEFAULT 0,
  published_at DATE NOT NULL
);

CREATE TABLE listeners (
  id        INT PRIMARY KEY,
  nickname  VARCHAR(50) NOT NULL,
  city      VARCHAR(30),
  phone     VARCHAR(20),
  signup_at DATE NOT NULL
);

CREATE TABLE ratings (                -- 听众给单集打分，1 到 5 星
  episode_id  INT NOT NULL,
  listener_id INT NOT NULL,
  stars       INT NOT NULL,
  PRIMARY KEY (episode_id, listener_id)
);

INSERT INTO shows VALUES
  (1, '代码与咖啡', '科技', '阿澜', FALSE),
  (2, '深夜书桌',   '文化', '小满', FALSE),
  (3, '增长手记',   '商业', '老周', TRUE),
  (4, '芯片江湖',   '科技', '阿澜', TRUE),
  (5, '城市漫步指南', '文化', '小满', FALSE);

INSERT INTO episodes VALUES
  (101, 1, '第 40 期：大模型创业这一年',   95, 51200, '2026-08-01'),
  (102, 1, '第 41 期：一个程序员的退休计划', 88, 46800, '2026-08-15'),
  (103, 2, '第 12 期：重读〈百年孤独〉',    76, 22100, '2026-07-20'),
  (104, 3, '第 8 期：咖啡店的定价心理学',   64, 18900, '2026-08-05'),
  (105, 4, '第 3 期：光刻机突围战',        112, 73500, '2026-08-10'),
  (106, 5, '第 21 期：菜市场人类学',       NULL,  9800, '2026-08-20');

INSERT INTO listeners VALUES
  (1, '夜航船',   '北京', '13800001111', '2026-01-10'),
  (2, '南方的风', '广州', NULL,          '2026-02-14'),
  (3, '摩卡不加糖', '北京', '13800002222', '2026-03-01'),
  (4, '阿基米德', '上海', NULL,          '2026-03-22'),
  (5, '早八人',   '深圳', '13800003333', '2026-04-05');

INSERT INTO ratings VALUES
  (101, 1, 5), (101, 2, 4), (101, 3, 5),
  (102, 1, 4), (102, 4, 3),
  (103, 2, 5), (103, 3, 5), (103, 5, 4),
  (104, 1, 2), (104, 5, 3);
```

数据只有十几行，每个结果都能用手算验证——学聚合，能验算比能背语法重要得多。

## 2. 第一问：COUNT，数行数的三种数法

### 2.1 COUNT(*)、COUNT(列)、COUNT(DISTINCT 列)

```sql
SELECT COUNT(*)                    AS episode_total,   -- 6：所有行，含 NULL
       COUNT(duration_min)         AS has_duration,    -- 5：该列非 NULL 的行
       COUNT(DISTINCT show_id)     AS show_count       -- 5：不同值的个数
FROM episodes;
```

三者差别全在"数什么"：

- `COUNT(*)` 数**行**，NULL 一样是一行；
- `COUNT(列)` 数**该列非 NULL 的值**，第 106 期时长是 NULL，被跳过；
- `COUNT(DISTINCT 列)` 先去重再数，NULL 不计入。

"本季上架几期"用 `COUNT(*)`；"填了时长的有几期"用 `COUNT(duration_min)`。两个数一减，就知道数据缺了多少——这是数据质检最便宜的手段。

### 2.2 数行数的性能：各家不一样

```sql
-- MySQL（InnoDB）：没有 WHERE 的 COUNT(*) 会挑最小的索引来数；
-- 8.0.14 起走聚簇索引的全表 COUNT(*) 还能并行（innodb_parallel_read_threads）
SELECT COUNT(*) FROM episodes;

-- PostgreSQL：因为 MVCC（行对每个事务可见性不同），COUNT(*) 必须实扫，
-- 表越大越慢。业务上能接受估算就用系统统计信息：
SELECT reltuples::bigint AS estimate FROM pg_class WHERE relname = 'episodes';
```

结论：**计数结果要求精确就老老实实 COUNT，只做展示就用估算值**。PostgreSQL 大表的"共 X 条"改估算，是后台列表提速的第一刀。

## 3. 第二问：SUM 与 AVG，求和求平均和它们的 NULL 心智

### 3.1 基本用法

```sql
SELECT SUM(play_count)   AS total_plays,    -- 222300
       AVG(play_count)   AS avg_plays,      -- 37050
       MAX(play_count)   AS top_plays,      -- 73500
       MIN(published_at) AS earliest        -- 2026-07-20
FROM episodes;
```

`MAX`/`MIN` 不只对数字生效：日期取"最新/最早"，字符串按排序规则取"字典序最大/最小"，都合法。

### 3.2 NULL 参与运算的三条规则

这是聚合函数的半个灵魂，先背下来再验证：

1. 除 `COUNT(*)` 外，聚合函数**忽略 NULL**：`AVG` 的分母只数非 NULL 行。
2. **所有值都是 NULL（或结果集为空）时，返回 NULL 而不是 0**。
3. 想把 NULL 当 0 参与运算，用 `COALESCE(列, 0)` 显式包一层。

用手头的表验证规则 1：`AVG(duration_min)` 的分母是 5 不是 6，因为第 106 期是 NULL。

```sql
SELECT AVG(duration_min)               AS avg_skip_null,  -- 87
       AVG(COALESCE(duration_min, 0))  AS avg_null_as_0   -- 72.5：NULL 当 0 摊进分母
FROM episodes;
```

两个语义不同的"平均值"，报表里选哪个取决于问题："已上架单集的平均时长"用前者，"含残次品的全量平均"用后者。**先想清楚 NULL 该不该计入，再写 AVG**。

### 3.3 浮点精度：0.1 加十次为什么不是 1.0

```sql
-- PostgreSQL：浮点类型求和有误差
SELECT SUM(0.1::float8) FROM generate_series(1, 10);      -- 0.9999999999999999
SELECT SUM(0.1::numeric) FROM generate_series(1, 10);     -- 1.0 精确
```

原因：`FLOAT`/`DOUBLE`（PG 的 `float8`、MySQL 的 `DOUBLE`）用二进制存小数，`0.1` 在二进制里是无限循环，累加就有误差；`DECIMAL`/`NUMERIC` 按十进制存，精确。注意 MySQL 里裸写的字面量 `0.1` 默认就是 `DECIMAL`，所以 `SUM(0.1)` 在 MySQL 是精确的——**坑只在列本身是浮点类型时出现**。

工程结论：金额、播放量、积分这类要求精确的数值列，一律 `DECIMAL`；浮点只留给科学计算和机器学习特征。

### 3.4 加权平均与中位数

平台"单集评分"若直接 `AVG(stars)`，10 条评分里刷分者权重和普通听众一样。想按"评分者收听时长"加权：

```sql
-- 加权平均 = SUM(值 x 权重) / SUM(权重)
SELECT SUM(r.stars * l.total_minutes) / SUM(l.total_minutes) AS weighted_score
FROM ratings r
JOIN listeners l ON l.id = r.listener_id;
```

中位数比平均数更抗极端值（播放量被一个爆款拉飞时，中位数才是"典型单集"的水平）。SQL 标准没有直接的 MEDIAN，两条路：

```sql
-- PostgreSQL：有序集聚合
SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY play_count) AS median_plays
FROM episodes;

-- 通用写法（MySQL 8.0+ / SQLite 也行）：窗口函数取中间行再平均
SELECT AVG(play_count) AS median_plays
FROM (
  SELECT play_count,
         ROW_NUMBER() OVER (ORDER BY play_count) AS rn,
         COUNT(*)      OVER ()                    AS total
  FROM episodes WHERE play_count IS NOT NULL
) t
WHERE rn IN (FLOOR((total + 1) / 2.0), CEIL((total + 1) / 2.0));
```

MySQL 没有 `PERCENTILE_CONT`，生产上用第二种；PostgreSQL 两种都可以。窗口函数的完整语法第 26 篇才讲，这里照抄能用即可。

## 4. 第三问：GROUP BY 与 HAVING，先分组、后筛组

### 4.1 分组聚合

"每个分类各有多少期、平均播放多少"：

```sql
SELECT s.category,
       COUNT(*)             AS episode_cnt,
       AVG(e.play_count)    AS avg_plays
FROM episodes e
JOIN shows s ON s.id = e.show_id
GROUP BY s.category;
```

结果（科技含并列，共 3 期）：

```
category | episode_cnt | avg_plays
---------|-------------|----------
科技     | 3           | 57166.67
文化     | 2           | 15950
商业     | 1           | 18900
```

心智模型一句话：**GROUP BY 把行切成若干组，聚合函数在每组内折叠，SELECT 里出现的非聚合列必须都在 GROUP BY 里**。最后半句是硬约束：MySQL 8.0 默认开启 `ONLY_FULL_GROUP_BY`，SELECT 一个没进 GROUP BY 的列会直接报 1055 错误；PostgreSQL 同样拒绝。规则的本意是——没分组的列在组内有多个值，数据库不知道替你挑哪个。

（MySQL 老项目里常见"关掉 ONLY_FULL_GROUP_BY 就不报错了"，那只是把错误藏进结果的不确定性，别学。）

### 4.2 WHERE 与 HAVING：两个字段的过滤器

"播放量不到 1 万的分类不要"——这个条件作用在**组**上（组的平均值），必须用 `HAVING`：

```sql
SELECT s.category, AVG(e.play_count) AS avg_plays
FROM episodes e
JOIN shows s ON s.id = e.show_id
WHERE e.published_at >= '2026-08-01'      -- 行级：分组前先丢掉不符合的行
GROUP BY s.category
HAVING AVG(e.play_count) >= 10000;        -- 组级：分组后筛掉不合格的组
```

判断口诀：**条件能写成"每一行自己就能判断"用 WHERE，必须"攒完组才知道"用 HAVING**。能用 WHERE 的别挪到 HAVING——WHERE 先过滤能减少参与分组的数据量。

## 5. 第四问：找到最大值所在的整行

`MAX(play_count)` 只给一个数，运营要的是"那一期"。三种写法：

```sql
-- 方法 1：子查询（语义最清晰，并列时全部返回）
SELECT * FROM episodes
WHERE play_count = (SELECT MAX(play_count) FROM episodes);

-- 方法 2：排序取一（快，但并列时只给一行，谁上榜看运气）
SELECT * FROM episodes ORDER BY play_count DESC LIMIT 1;

-- 方法 3：每组各取一行（PostgreSQL 专属 DISTINCT ON）
SELECT DISTINCT ON (s.category) s.category, e.title, e.play_count
FROM episodes e JOIN shows s ON s.id = e.show_id
ORDER BY s.category, e.play_count DESC;
```

选型：业务要求"并列都算"用方法 1；明确"只要一条"用方法 2（记得加决胜列 `ORDER BY play_count DESC, id` 让结果稳定）；"每个分类的冠军"用方法 3 或窗口函数（见第 26 篇的 Top-N per group）。

### 5.1 MAX/MIN 背后的索引加速

```sql
CREATE INDEX idx_ep_plays ON episodes(play_count);
SELECT MAX(play_count) FROM episodes;   -- 走索引，直接读 B+ 树最右端，不扫表
```

排好序的结构让最值查询变成"走到头看一眼"。但 `SELECT MAX(a), MIN(b)` 涉及两个不同列的索引时，多数数据库退化为扫描——最值的索引红利只对"单列最值"全额兑现。

## 6. 条件计数：一条 SQL 数出多类

周报最常见的形状是"总数里，A 类多少、B 类多少"。用 `CASE WHEN` 让聚合函数**条件性地**计数：

```sql
SELECT
  COUNT(*)                                      AS total,
  COUNT(*) FILTER (WHERE is_premium)            AS premium_cnt,     -- PostgreSQL 简写
  COUNT(CASE WHEN is_premium THEN 1 END)        AS premium_classic, -- 全方言通用
  SUM(CASE WHEN is_premium THEN 1 ELSE 0 END)   AS premium_sum      -- 通用备选
FROM shows;
```

三种写法殊途同归，原理都是第 3.2 节的 NULL 规则：条件不满足时 CASE 返回 NULL，`COUNT` 忽略 NULL。方言备注：

- `FILTER (WHERE ...)` 是 SQL 标准语法，PostgreSQL、SQLite 3.30+ 支持；**MySQL 不支持**。
- MySQL 有个独门简写：`SUM(is_premium = TRUE)`——布尔表达式直接转 0/1 求和。**PostgreSQL 里这么写会报错**（`SUM` 不接受 boolean 类型），跨库脚本请用 CASE 通用写法。

把行列拼起来还能做交叉矩阵（行转列的雏形，完整展开见第 28 篇）：

```sql
SELECT s.category,
       SUM(CASE WHEN s.is_premium THEN 1 ELSE 0 END) AS premium_cnt,
       SUM(CASE WHEN NOT s.is_premium THEN 1 ELSE 0 END) AS free_cnt
FROM shows s GROUP BY s.category;
```

## 7. 聚合的进阶形状

### 7.1 空结果集：COUNT 返回 0，其余全是 NULL

```sql
SELECT COUNT(*)     AS cnt,   -- 0
       SUM(play_count) AS s, -- NULL
       AVG(play_count) AS a, -- NULL
       MAX(play_count) AS m  -- NULL
FROM episodes
WHERE show_id = 999;          -- 不存在的节目
```

没有行可折叠，`SUM/AVG/MAX` 无值可用只能给 NULL。**对外展示前务必 `COALESCE(SUM(...), 0)`**，否则接口层拿到 null 轻则前端显示 NaN，重则空指针。

### 7.2 字符串聚合：把一组的值拼成一行

"每个主播名下有哪些节目"：

```sql
-- PostgreSQL / SQL Server
SELECT host, STRING_AGG(title, ' / ' ORDER BY id) AS show_list
FROM shows GROUP BY host;

-- MySQL
SELECT host, GROUP_CONCAT(title ORDER BY id SEPARATOR ' / ') AS show_list
FROM shows GROUP BY host;
```

MySQL 专属坑：`GROUP_CONCAT` 默认最大长度 `group_concat_max_len = 1024` 字节，超长**静默截断**不报错。组内内容多时先 `SET SESSION group_concat_max_len = 1000000;`。

### 7.3 JSON 聚合：一组行折叠成一个 JSON

给小程序端做"节目卡片"接口，直接让数据库吐 JSON：

```sql
-- PostgreSQL
SELECT s.host,
       JSON_AGG(JSON_BUILD_OBJECT('title', s.title, 'category', s.category)) AS cards
FROM shows s GROUP BY s.host;

-- MySQL
SELECT host,
       JSON_ARRAYAGG(JSON_OBJECT('title', title, 'category', category)) AS cards
FROM shows GROUP BY host;
```

`JSON_OBJECTAGG(键, 值)` 则把两列折成 `{键: 值}` 的对象。方向反过来拆 JSON 为行，是第 30 篇（SQL 中的 JSON）的内容。

### 7.4 统计与布尔聚合

```sql
-- 波动大小：标准差与方差（样本版 / 总体版）
SELECT category, AVG(e.play_count), STDDEV(e.play_count) AS plays_std
FROM episodes e JOIN shows s ON s.id = e.show_id
GROUP BY category;
-- MySQL 用 STDDEV_POP / STDDEV_SAMP，PostgreSQL 用 stddev_pop / stddev_samp

-- "全称"与"存在"：一组里全为真 / 任一为真
SELECT host,
       BOOL_AND(is_premium) AS all_premium,   -- 该主播是否全部节目付费
       BOOL_OR(is_premium)  AS any_premium    -- 是否至少有一档付费节目
FROM shows GROUP BY host;
```

`BOOL_AND`/`BOOL_OR` 是 PostgreSQL 语法；MySQL 没有，用 `MIN(布尔表达式)` 模拟 AND（全 1 才是 1）、`MAX(布尔表达式)` 模拟 OR（有 1 就是 1）。

### 7.5 DISTINCT 聚合与大表代价

```sql
SELECT COUNT(DISTINCT city) AS city_cnt FROM listeners;                    -- 4
SELECT COUNT(DISTINCT city || '-' || COALESCE(phone, '')) FROM listeners;  -- 组合去重（PG 的 || 拼接）
```

`COUNT(DISTINCT)` 要维护去重集合，千万行级别又慢又耗内存。两条出路：

```sql
-- 1. PostgreSQL 的 hll 扩展：HyperLogLog 近似计数，误差约 1%，内存固定
SELECT hll_cardinality(hll_agg(user_id)) FROM page_views;

-- 2. 预聚合：夜间任务把"每天的去重数"算好落表，查询时只读结果
CREATE TABLE daily_stats AS
SELECT published_at, COUNT(DISTINCT show_id) AS active_shows, COUNT(*) AS ep_cnt
FROM episodes GROUP BY published_at;
```

`SUM(DISTINCT x)`、`AVG(DISTINCT x)` 语法也存在，但"去重后的总和"业务上十有八九是理解错了需求——先确认是不是真要去重。

## 8. 坑点清单与自检

1. **`= NULL` 式的过滤**：聚合前的行过滤里出现 `= NULL`，结果恒为空。用 `IS NULL`（回顾[查询基础](/sql/040-DataQueryBasics)第 3 节）。
2. **空组显示成 null**：对外字段包 `COALESCE(聚合, 0)`。记住"COUNT 返回 0，其余返回 NULL"。
3. **AVG 把 NULL 排除了吗？** 想清楚业务要"排除缺失"还是"按 0 摊平"，两个 AVG 差很多。
4. **浮点列求和**：金额与计数类列用 DECIMAL；已上线的浮点列先用 `CAST` 验证误差。
5. **SELECT 了没进 GROUP BY 的列**：MySQL 1055、PostgreSQL 直接报错。不是方言bug，是语义问题。
6. **过滤条件放错层**：行条件进 WHERE（先过滤省算力），组条件进 HAVING。
7. **并列最值**：`ORDER BY ... LIMIT 1` 会随机丢掉并列者；要求并列齐全用 `= (SELECT MAX ...)`。
8. **GROUP_CONCAT 截断**：超 1024 字节静默截断，先调 `group_concat_max_len`。
9. **COUNT(\*) 大表慢**：PostgreSQL 大表展示用 `reltuples` 估算或预聚合表。

## 9. 练习

全部基于回声FM四张表，答案都能用手算验证：

1. 统计听众表中北京、上海两地"填了手机号"的人数（提示：WHERE city IN (...) 后 COUNT(phone)）。
2. 求每个主播名下单集的平均播放量，只保留平均播放量超过 2 万的主播。
3. 一条 SQL 同时输出：总单集数、已上架时长单集数、缺失时长的单集数。
4. 找出评分（stars）的中位数，并和平均分对比，说说哪个更能代表"听众真实评价"。
5. 用条件计数输出每个分类下"付费节目数 / 免费节目数"两列。
6. （思考题）`SELECT host, COUNT(*) FROM shows GROUP BY host` 里，把 `COUNT(*)` 换成 `COUNT(category)`，哪些主播的结果会变？为什么？（提示：category 有没有 NULL。）

## 下一步

- [GROUP BY 与分组集](/sql/070-GROUPBYGroupingSet)：ROLLUP/CUBE/GROUPING SETS 多维报表。
- [SELECT 执行顺序](/sql/080-SelectExecutionOrder)：为什么 WHERE 里不能写聚合、HAVING 能。
- [窗口函数](/sql/260-WindowFunction)：既要每一行又要组统计时，把聚合升级为开窗。
- [连接查询](/sql/150-JoinQuery)：本文用到的 JOIN 只是入门版，下一篇把它讲透。
