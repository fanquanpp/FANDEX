---
order: 40
title: 数组与范围类型
module: 'postgresql'
category: 数据库
difficulty: beginner
description: PG 特色复合类型：ARRAY 运算符与 ANY/ALL、数组函数与 GIN 索引、范围类型与 EXCLUDE 排他约束
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：PostgreSQL 数据类型（Chapter 8 Data Types 中的复合类型族）。
- **解决什么问题**：一个字段天然是"多个值"（标签、成员列表、时段）时，MySQL 只能上关联表或逗号分隔字符串；PG 让你把这类数据**原生存进一列**，还配上运算符、函数和索引。范围类型更进一步：把"从几点到几点"这类**区间**变成一个可比较、可索引的值。
- **什么时候用到**：多标签筛选、群成员管理、会议室/档期预订（时段不重叠约束）、监控/计费的区间归属（哪个时间窗费率生效）。
- **前置阅读**：[索引类型](/postgresql/220-IndexType)（GIN/GiST 一节）。

## 心智模型：多值列的两种形状

| 形状 | 类型 | 回答的问题 | 典型索引 |
| --- | --- | --- | --- |
| 一组离散值 | ARRAY | "这行的集合里有没有 X" | GIN |
| 一段连续区间 | range | "这两个区间是否重叠/包含" | GiST |

判型口诀：值之间**没有顺序关系、只有"在不在"**，用数组；值之间**有边界、要问"交不交叉"**，用范围。两者都能在库内建约束表达业务规则——这是它们比"应用层校验 + 普通列"强的根本原因。

## 场景一：文章标签（数组）

```sql
CREATE TABLE articles (
    id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title  text NOT NULL,
    tags   text[] NOT NULL DEFAULT '{}'
);
```

逐段讲解：

- `text[]` 就是"text 的数组"，维度写法 `text[][]` 在 PG 里只是文档性的，实际都按一维存；
- `DEFAULT '{}'` 给空数组而不是 NULL——后续 `array_length`/`@>` 不会因为 NULL 短路出意外，这是**数组列的推荐姿势**。

写入与查询：

```sql
INSERT INTO articles (title, tags) VALUES
('PG 索引入门',  ARRAY['postgres', 'index']),
('Go 并发模式', ARRAY['go', 'concurrency']),
('索引调优实录', ARRAY['postgres', 'index', 'tuning']);

-- 包含：两个标签都得有（AND 语义）
SELECT title FROM articles WHERE tags @> ARRAY['postgres', 'index'];

-- 相交：沾上任意一个就算（OR 语义）
SELECT title FROM articles WHERE tags && ARRAY['index', 'go'];

-- ANY：数组反过来当"批量等值条件"用（标量列上的 IN 替代品）
SELECT title FROM articles WHERE 'postgres' = ANY (tags);
```

`@>` 与 `= ANY` 的区别要分清：`@>` 作用在**数组列**上、可走 GIN 索引；`= ANY(列)` 是把列的每个元素与标量比较，语义同 `IN`，GIN 索引**用不上**（优化器对它的支持随版本变化）。筛选场景默认写 `@>` / `&&`。

数组函数日常四件：

```sql
SELECT array_length(ARRAY['a','b','c'], 1);          -- 3（第二参数是维度）
SELECT array_append(ARRAY['a'], 'b');                 -- {a,b}
SELECT array_remove(ARRAY['a','b','a'], 'a');         -- {b}
SELECT array_position(ARRAY['a','b','c'], 'b');       -- 2
-- array_agg: 把多行聚成一个数组（分组拼接的数组版）
SELECT array_agg(title) FROM articles WHERE tags @> ARRAY['postgres'];
```

多标签与 JSONB 的取舍：标签要**去重、 containment 查询、GIN 索引**，数组最简单；标签还要挂**属性**（颜色、权重）或嵌套结构，才升级 JSONB（见[JSONB 与 JSON](/postgresql/110-JSONBJSONDifference)）。

## 场景二：会议室预订（范围类型 + EXCLUDE）

这是范围类型最能打、别的数据库最难受的场景：**同一间会议室的时段不得重叠**。用应用层判断会有并发竞态，用普通列做检查约束写不出"行与行比较"，PG 的 EXCLUDE 约束一条 DDL 硬保证：

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;   -- text 等值判断进 GiST 需要

CREATE TABLE bookings (
    id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    room   text NOT NULL,
    during tstzrange NOT NULL,               -- 时区感知的时间范围
    booked_by text NOT NULL,
    EXCLUDE USING gist (room WITH =, during WITH &&)
);
```

逐段讲解：

- `tstzrange` 是"带时区时间戳的范围"，区间写成 `'[2026-10-08 14:00, 2026-10-08 15:00)'`——**左闭右开**是时段建模的惯例：14:00-15:00 与 15:00-16:00 不算冲突，右开天然表达"结束点可复用"；
- `EXCLUDE USING gist (room WITH =, during WITH &&)` 读作：任意两行不得同时满足"房间相等且时段相交"。`&&` 是相交运算符。这一条约束在数据库层把"双订"从业务 bug 变成**写不进去**的异常；
- `btree_gist` 扩展是必需的：GiST 原生只会范围相交，`room WITH =` 这种标量等值要靠它补操作符。

写入体验：

```sql
-- 正常预订
INSERT INTO bookings (room, during, booked_by)
VALUES ('会议室A', '[2026-10-08 14:00, 2026-10-08 15:00)', '张三');

-- 与上一条相邻（右端点相接）——合法，右开区间不相交
INSERT INTO bookings (room, during, booked_by)
VALUES ('会议室A', '[2026-10-08 15:00, 2026-10-08 16:00)', '李四');

-- 与第一条重叠——违反 EXCLUDE，报错 conflict on excluded constraint
INSERT INTO bookings (room, during, booked_by)
VALUES ('会议室A', '[2026-10-08 14:30, 2026-10-08 15:30)', '王五');
```

换一种写法会发生什么：有人用 `CHECK (start_time < end_time)` 表达这个规则——它只能约束**单行自身**合法，拦不住两行之间重叠；有人把判断写在事务里 `SELECT ... FOR UPDATE` 锁已有记录——能挡住但代码到处都是，且容易漏写锁。EXCLUDE 是唯一"不写代码也绝不错"的方案。

范围查询四件套：

```sql
-- 某会议室某天已被占用的时间段
SELECT during FROM bookings
WHERE room = '会议室A' AND during && '[2026-10-08 00:00, 2026-10-09 00:00)'::tstzrange;

-- 包含判断：这个时刻被谁占着
SELECT * FROM bookings WHERE during @> '2026-10-08 14:20'::timestamptz;

-- 边界函数
SELECT lower(during), upper(during), upper_inc(during) FROM bookings;

-- 两段拼接（收银台合并相邻计费段）
SELECT range_merge('[08:00,09:00)'::timerange, '[09:00,10:00)'::timerange);
```

## 场景三：监控指标窗口（daterange/区间归属）

计费与巡检场景：每个费率/巡检策略有生效区间，查询"某天落在哪个区间"：

```sql
CREATE TABLE price_windows (
    plan      text NOT NULL,
    effective daterange NOT NULL,      -- 日期范围，如 [2026-01-01, 2026-07-01)
    unit_price numeric NOT NULL,
    EXCLUDE USING gist (plan WITH =, effective WITH &&)
);
INSERT INTO price_windows VALUES
('standard', '[2026-01-01, 2026-07-01)', 0.12),
('standard', '[2026-07-01, 2027-01-01)', 0.10);

-- 某笔账单该用哪个价
SELECT unit_price FROM price_windows
WHERE plan = 'standard' AND effective @> DATE '2026-08-15';
```

大表上给 `effective` 建 GiST 索引（`CREATE INDEX ON price_windows USING gist (plan, effective)`）后，区间归属查询与会议室查询同构。日志/指标流水的"每小时窗口聚合"则是另一个问题——那用 `date_trunc` 分桶而不是范围类型，别把 range 当时间桶用。

## 数组上的 GIN 索引：何时该建

```sql
CREATE INDEX idx_articles_tags ON articles USING gin (tags);

-- 验证走了索引
EXPLAIN SELECT title FROM articles WHERE tags @> ARRAY['postgres'];
-- Bitmap Index Scan on idx_articles_tags
```

判断标准与 GIN 的通用代价模型一致（写入放大、fastupdate 毛刺，见[索引类型](/postgresql/220-IndexType)）：标签筛选是**高频查询**才值得建；一天写一篇的博客表裸查也够快。范围类型的 GiST 索引则几乎总是要建——`&&`/`@>` 在无索引时只能全表扫。

## 方言差异速记

从 MySQL 视角看，本篇的每一件都是 PG 独有能力：MySQL 没有原生数组（JSON 数组替代，但 containment 查询与索引形态不同）、没有范围类型与 EXCLUDE 约束；PostgreSQL 的 `||` 能拼数组、`ANY/ALL` 能接子查询。这些差异在方言速查表里集中对照过；做跨库项目时，本篇的约束建模要用"PG 原生 + 其他库应用层兜底"的双轨策略。

## 常见困惑

**"数组列违反第一范式吗？"**——教科书意义上违反，但范式的目的是消除"更新异常"。标签这种**整体读、整体写、不按元素更新**的数据，数组比"文章-标签"关联表更诚实：没有幽灵标签行、删除文章无孤儿记录。真正要按元素更新、要外键引用的，老老实实上关联表。

**"范围类型能存 NULL 吗？"**——整列可以 NULL；区间内部用 `'empty'` 表示空区间，用无穷写 `'[2026-01-01,)'`（上界无穷）。`upper_inc()` 返回 false 说明右开。别用空字符串当区间。

**"EXCLUDE 约束报错信息难懂吗？"**——报错是 `conflict on excluded constraint`，默认不带约束名提示。给约束起名（`CONSTRAINT no_overlap EXCLUDE ...`）能让应用捕获到可读的错误。

## 动手实践：给播客库加上档期系统

任务：在[高级 SQL](/postgresql/080-AdvancedSQL) 的播客库基础上：

1. 给 `plays` 表加 `topics text[]` 列，回填三条历史数据，用 `@>` 查"含 AI 标签"的播放；
2. 建 `studio_slots` 表（直播间档期）：主播名 + 时段，EXCLUDE 约束保证同一主播档期不重叠；
3. 写一条查询：找出 2026-10-08 全天已占用与空闲的时段（提示：`&&` 占用 + `range_merge` 合并后与全天区间做差，可用 `*` 与 `-` 区间运算近似实现）；
4. 验证并发：开两个 psql 会话同时插入重叠档期，确认只有一个成功。

<details>
<summary>参考实现（先自己写再展开）</summary>

```sql
-- 1
ALTER TABLE plays ADD COLUMN topics text[] NOT NULL DEFAULT '{}';
UPDATE plays SET topics = ARRAY['AI'] WHERE show_name = '代码夜话';
UPDATE plays SET topics = ARRAY['职场'] WHERE show_name = '早班机';
SELECT show_name FROM plays WHERE topics @> ARRAY['AI'];

-- 2
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE studio_slots (
    id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    host    text NOT NULL,
    during  tstzrange NOT NULL,
    CONSTRAINT no_host_overlap EXCLUDE USING gist (host WITH =, during WITH &&)
);

-- 3（占用的部分；空闲=全天区间减去占用区间的并集）
SELECT during FROM studio_slots
WHERE during && tstzrange('2026-10-08', '2026-10-09');

-- 4：两个会话依次执行，第二条应报错
INSERT INTO studio_slots (host, during) VALUES ('主播A', '[2026-10-08 20:00, 2026-10-08 21:00)');
INSERT INTO studio_slots (host, during) VALUES ('主播A', '[2026-10-08 20:30, 2026-10-08 22:00)');
-- ERROR: conflicting key value violates exclusion constraint "no_host_overlap"
```
</details>

## 检验清单

- 能说出数组与范围类型各自的适用判断（在不在 vs 交不交叉）；
- 会写 `@>`、`&&`、`= ANY` 并说清哪个走 GIN；
- 能用 EXCLUDE 约束把"时段不重叠"写进 DDL，并解释右开边界为什么必要；
- 知道数组列默认 `'{}'` 而非 NULL 的原因；
- 能向 MySQL 同事解释清楚这两个类型在对方体系里的替代方案与代价。

## 下一步

- [JSONB 与 JSON](/postgresql/110-JSONBJSONDifference)：多值数据的另一种形状与取舍；
- [索引类型](/postgresql/220-IndexType)：GIN/GiST 的原理与代价；
- [锁机制](/postgresql/190-LockMechanism)：EXCLUDE 约束冲突背后的并发控制。

## 参考与致谢

- PostgreSQL 官方文档 Chapter 8 Data Types（8.14 Arrays / 8.17 Range Types）、Chapter 11 Indexes（PostgreSQL Licence）：<https://www.postgresql.org/docs/current/>
- 方言对照素材取自仓库内扫描报告 `.workflow-tmp/scan/c-user-dirs.md` 第四节（vocaloid 笔记方言清单）。
