---
order: 50
title: 过滤条件
module: 'sql'
category: 数据库
difficulty: beginner
description: 从播客后台的筛选需求出发掌握 SQL 过滤：比较与逻辑运算、IN/BETWEEN/LIKE、NULL 三值逻辑、SARGable 条件与索引的关系。
author: fanquanpp
updated: '2026-09-13'
related:
  - 'sql/060-AggregateFunction'
  - 'sql/080-SelectExecutionOrder'
  - 'sql/100-Constraint'
prerequisites:
  - 'sql/020-OverviewStandard'
---

## 前置知识

建议先阅读以下内容再进入本文：

- [概述与标准](/sql/020-OverviewStandard)

## 场景：运营的三个筛选条件

假设你在给一个播客平台写后台。运营提了第一个数据需求：

> "把上架的、单集时长超过 20 分钟的、标题带 AI 的节目拉出来，我看看这批内容。"

翻译成 SQL 就是三件事：比较（时长）、等值（上架状态）、模糊匹配（标题）。把表建出来跟着做：

```sql
CREATE TABLE episodes (
    id            INT PRIMARY KEY,
    title         VARCHAR(200) NOT NULL,
    show_name     VARCHAR(100) NOT NULL,
    duration_sec  INT,
    is_published  BOOLEAN      NOT NULL DEFAULT false,
    language      VARCHAR(10),
    published_at  TIMESTAMP
);

INSERT INTO episodes (id, title, show_name, duration_sec, is_published, language, published_at) VALUES
(1, 'AI 编程初体验',       '代码夜话',   1860, true,  'zh', '2026-08-01 09:00:00'),
(2, '五分钟新闻',          '早班机',      300, true,  'zh', '2026-08-02 07:30:00'),
(3, 'The AI Stack',        'Tech Abroad',2400, true,  'en', '2026-08-03 20:00:00'),
(4, 'AI 与版权（未上架）',  '代码夜话',   2100, false, 'zh', NULL),
(5, '周末长谈',            '早班机',     5400, true,  NULL, '2026-08-05 10:00:00');
```

注意两行数据故意"不干净"：第 4 行没上架、`published_at` 为 NULL；第 5 行 `language` 没填。过滤条件一半的坑都藏在这种数据里。

## 动手：把三个条件拼出来

### 比较与逻辑运算

```sql
SELECT id, title, duration_sec
FROM episodes
WHERE duration_sec > 1200        -- 大于 20 分钟（1200 秒）
  AND is_published = true;       -- 已上架
```

比较运算符就是日常那套：`= <> < > <= >=`（`!=` 与 `<>` 等价，跨数据库写 `<>` 更稳）。多个条件用 `AND`/`OR` 连接，`NOT` 取反。

第一个真实的坑在优先级上：`NOT` 高于 `AND`，`AND` 高于 `OR`。下面两条含义完全不同：

```sql
-- 实际是：language = 'zh' OR (duration_sec > 1200 AND is_published = true)
SELECT id FROM episodes
WHERE language = 'zh' OR duration_sec > 1200 AND is_published = true;

-- 想要的可能是：(中文或长内容) 且已上架
SELECT id FROM episodes
WHERE (language = 'zh' OR duration_sec > 1200) AND is_published = true;
```

自检习惯：写 OR 的地方就问自己一句"不加括号时 AND 会不会先算"。答案几乎总是"会"，所以直接加括号。

### IN：离散值匹配

```sql
-- 找中文或英文节目（以后加语言只需改列表）
SELECT id, title, language FROM episodes
WHERE language IN ('zh', 'en');

-- 等价于三个 OR，但列表长了以后 IN 可读性好得多
SELECT id FROM episodes
WHERE language = 'zh' OR language = 'en';
```

`NOT IN` 反向排除，但它有一个必须现在就知道的陷阱，放到后面的"NULL 三值逻辑"讲。

### BETWEEN：范围与那个 23:59:59 错误

BETWEEN 是**双闭区间**，包含两端：

```sql
SELECT id, duration_sec FROM episodes
WHERE duration_sec BETWEEN 1200 AND 3000;
-- 等价于 duration_sec >= 1200 AND duration_sec <= 3000
```

查"某一天的数据"时，BETWEEN 的双闭语义会咬人：

```sql
-- 错误示范：可能遗漏 23:59:59.001 到 23:59:59.999 之间的记录
SELECT * FROM episodes
WHERE published_at BETWEEN '2026-08-01 00:00:00' AND '2026-08-01 23:59:59';

-- 正确姿势：左闭右开，[当天 0 点, 次日 0 点)
SELECT * FROM episodes
WHERE published_at >= '2026-08-01 00:00:00'
  AND published_at <  '2026-08-02 00:00:00';
```

为什么错：`TIMESTAMP` 可以带小数秒，`23:59:59` 之后、`24:00:00` 之前的毫秒照样属于当天，而它们大于你写的上界。左闭右开区间没有缝隙，还天然能拼接连续时间段。把"`>= 当天 AND < 明天`"写成肌肉记忆。

两个补充语义：

```sql
-- BETWEEN 要求下界 <= 上界，写反了永远查不到任何行
SELECT * FROM episodes WHERE duration_sec BETWEEN 3000 AND 1200;  -- 空结果

-- PostgreSQL 提供 SYMMETRIC：边界写反时自动交换（MySQL 不支持）
SELECT * FROM episodes WHERE duration_sec BETWEEN SYMMETRIC 3000 AND 1200;
```

### LIKE：模糊匹配

LIKE 只有两个通配符：`%` 匹配任意个字符，`_` 匹配恰好一个字符。

```sql
-- 标题包含 AI（运营的原话"带 AI"）
SELECT id, title FROM episodes WHERE title LIKE '%AI%';

-- 以 AI 开头
SELECT id, title FROM episodes WHERE title LIKE 'AI%';

-- 三个字的标题，中间任意一个字符
SELECT id, title FROM episodes WHERE title LIKE '___';
```

`_` 也是通配符这一点经常被忘掉。要搜的文本本身含有 `%` 或 `_` 时（比如文件名 `report_2026`），必须用 `ESCAPE` 转义：

```sql
SELECT * FROM episodes WHERE title LIKE '50\%off' ESCAPE '\';
-- 把 \ 后的字符当普通字符。跨数据库稳妥做法：永远显式写 ESCAPE 子句
```

`%` 在开头的模式（`'%AI%'`）无法使用普通 B 树索引，数据量大时会全表扫描——这个性能话题在后面"SARGable"一节展开。

### IS NULL：为什么 `= NULL` 查不到东西

先动手验证一个反直觉的事实：

```sql
-- 这条查询返回 0 行，尽管第 4 行的 published_at 明明是 NULL
SELECT id, title FROM episodes WHERE published_at = NULL;

-- 正确写法
SELECT id, title FROM episodes WHERE published_at IS NULL;
SELECT id, title FROM episodes WHERE published_at IS NOT NULL;
```

## 为什么：NULL 的三值逻辑

普通逻辑只有真和假，SQL 的比较结果是三值：TRUE、FALSE、还有 **UNKNOWN**。任何值与 NULL 的比较（`= <> < >` 全部）结果都是 UNKNOWN，而不是 FALSE。

WHERE 只保留结果为 TRUE 的行——UNKNOWN 不算 TRUE，所以 `published_at = NULL` 一行都查不到。这不是 bug，是标准行为：NULL 的语义是"未知"，"未知等于 NULL 吗"，答案只能是"未知"。

三值逻辑最疼的一刀在 `NOT IN`：

```sql
-- 想排除中文和英文之外的节目，预期拿到第 5 行
SELECT id, language FROM episodes
WHERE language NOT IN ('zh', 'en');
```

如果列表里混进一个 NULL（常见来源是子查询返回了 NULL 值），整条查询**永远返回空集**：

```sql
-- language NOT IN ('zh', 'en', NULL)
-- 展开是 language <> 'zh' AND language <> 'en' AND language <> NULL
-- 最后一项是 UNKNOWN，AND 起来整个条件永远不为 TRUE
SELECT id FROM episodes WHERE language NOT IN ('zh', 'en', NULL);  -- 0 行
```

自检规则：**写 `NOT IN (子查询)` 之前，先确认子查询的那一列不会出 NULL**；做不到就用 `NOT EXISTS`（见[子查询](/sql/190-Subquery)）。

### NULL 安全的比较

想知道"这列要么是 NULL、要么等于某值"，各数据库给了不同工具：

```sql
-- MySQL：<=> 是 NULL 安全等于
SELECT * FROM episodes WHERE language <=> NULL;      -- 等价于 language IS NULL

-- SQL 标准的 IS NOT DISTINCT FROM（PostgreSQL、SQLite 3.39+ 支持）
SELECT * FROM episodes WHERE language IS NOT DISTINCT FROM 'zh';

-- MySQL 至今不支持 IS DISTINCT FROM，用 <=> 承担等价能力
-- SQL Server 两者都没有，要写 (language = 'zh') OR (language IS NULL AND 'zh' IS NULL)
```

配套的 NULL 处理函数，报表里天天用：

```sql
-- COALESCE 返回第一个非 NULL 的参数：语言缺失时显示 unknown
SELECT id, COALESCE(language, 'unknown') AS lang FROM episodes;

-- NULLIF 两参数相等时返回 NULL：分母为 0 时避免除零报错
SELECT NULLIF(duration_sec, 0) AS safe_duration FROM episodes;
```

### 正则与方言

LIKE 够用但表达力有限，需要"以 AI 开头且总长不超过 12 个字符"这类规则时就换正则：

```sql
-- PostgreSQL：~ 区分大小写，~* 不区分
SELECT id, title FROM episodes WHERE title ~ '^AI.{0,9}$';

-- MySQL：REGEXP
SELECT id, title FROM episodes WHERE title REGEXP '^AI.{0,9}$';

-- SQL 标准的 SIMILAR TO 只有 PostgreSQL 等少数数据库实现
SELECT id, title FROM episodes WHERE title SIMILAR TO 'AI%';
```

跨数据库项目优先 LIKE，正则当作各库内的增强。

## 坑点与自检

### 坑一：把函数套在列上，索引就废了

运营又提需求："统计 2026 年 8 月发布的节目"。直觉写法：

```sql
-- 能出结果，但 created_at 上的索引帮不上忙：
-- 优化器面对的是"每一行都要先算函数"的表达式
SELECT * FROM episodes
WHERE YEAR(published_at) = 2026 AND MONTH(published_at) = 8;
```

这类"对列先用函数再比较"的写法叫非 SARGable（Search ARGument able，可搜索参数）。索引存的是列的原始值，不是函数计算结果，所以只能全表扫描。改写成范围条件即可利用索引：

```sql
SELECT * FROM episodes
WHERE published_at >= '2026-08-01 00:00:00'
  AND published_at <  '2026-09-01 00:00:00';
```

常见的非 SARGable 写法和改法：

```sql
WHERE UPPER(email) = 'A@B.COM'      -- 改：建立表达式索引，或入库时统一大小写
WHERE price * 1.1 > 100             -- 改：WHERE price > 100 / 1.1
WHERE id + 1 = 10                   -- 改：WHERE id = 9
```

### 坑二：`<>` 与 NULL 联手丢数据

```sql
-- 想要"语言不是中文的节目"，直觉上应该返回第 3、5 行
SELECT id, language FROM episodes WHERE language <> 'zh';
-- 实际只返回第 3 行。第 5 行 language 是 NULL：
-- NULL <> 'zh' 结果是 UNKNOWN，被 WHERE 丢弃
```

想要"非中文（含未填语言的）"就要显式写全：

```sql
SELECT id, language FROM episodes
WHERE language <> 'zh' OR language IS NULL;
```

自检问题：**过滤条件里出现 `<>` 或 `NOT IN` 时，目标列有没有 NULL？** 有 NULL 就想清楚要不要它们。

### 坑三：条件顺序不影响逻辑，但影响不了性能

```sql
-- 把选择性高的条件写前面，逻辑等价，但数据库有自己的执行计划
SELECT * FROM episodes
WHERE is_published = true AND duration_sec > 1200;
```

SQL 是声明式语言，你写条件的顺序不决定执行顺序，优化器会自己重排（见[SELECT 执行顺序](/sql/080-SelectExecutionOrder)）。真正决定速度的是索引能不能用上：

| 条件形态 | 能否用索引 | 说明 |
| --- | --- | --- |
| `col = value` | 能 | 等值最有效 |
| `col IN (...)` | 能 | 多个等值的简写 |
| `col BETWEEN a AND b` | 能 | 范围扫描 |
| `col LIKE 'prefix%'` | 能 | 前缀匹配 |
| `col LIKE '%suffix'` | 否 | 扫全表或全索引 |
| `函数(col) = value` | 否 | 改写为裸列比较 |
| `col <> value` | 通常否 | 优化器难以缩小范围 |

多条件联合过滤的索引设计（复合索引、最左前缀）在[索引](/sql/420-Index)一文中展开。

## 练习

继续用 episodes 表，先补一条数据再做题：

```sql
INSERT INTO episodes VALUES
(6, 'AI weekly roundup', '早班机', 900, true, 'en', '2026-08-01 23:59:59.500');
```

1. 查出所有"已上架且时长在 15 到 40 分钟之间"的节目。注意第 6 行落在哪个边界上。
2. 查出 2026-08-01 全天发布的节目。用两种写法：错误的 BETWEEN 23:59:59，和正确的左闭右开，对比结果差异。
3. 查出标题包含 AI 的**未上架**节目（答案只有第 4 行。体会括号的作用）。
4. 查出"语言不是 zh 的节目"，要求未填语言的那行也出现。
5. 把第 1 题改写成非 SARGable 版本（用 YEAR/MONTH），如果 episodes 有百万行，解释为什么两者速度会差几个数量级。

## 下一步

- 过滤出的行要计数、求和，进入[聚合函数](/sql/060-AggregateFunction)；
- 想搞清楚这些子句到底谁先执行、别名为什么在 WHERE 里用不了，进入[SELECT 执行顺序](/sql/080-SelectExecutionOrder)；
- LIKE 搞不定的全文检索，MySQL 侧见[全文索引](/mysql/260-FullTextIndex)，PostgreSQL 侧见[全文搜索](/postgresql/300-FullTextSearch)。
