---
order: 180
title: 覆盖索引与部分索引
module: 'postgresql'
category: 数据库
difficulty: advanced
description: 以声浪播客平台的三条慢查询为线，讲清 B-tree 的三项精修术：复合索引列顺序、INCLUDE 覆盖索引、部分索引与表达式索引，配套 EXPLAIN 验证练习。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'postgresql/220-IndexType'
  - 'postgresql/240-IndexQueryOptimization'
  - 'postgresql/250-QueryOptimization'
  - 'postgresql/180-TransactionIDWraparoundPrevention'
prerequisites:
  - 'postgresql/220-IndexType'
---

## 场景：单列索引救不了的三条慢查询

继续用[索引类型](/postgresql/220-IndexType)里"声浪"播客平台的数据。B-tree 已经铺好，但业务还是报了三条慢查询：

| 慢查询 | 为什么单列索引不够用 |
| ------ | -------------------- |
| 听众个人页：`WHERE listener_id = 42 AND created_at >= ...` 按 `listener_id` 和 `created_at` 各建了一个单列索引，planner 只能用其中一个，剩下的条件逐行过滤 | 范围条件需要"组内有序" |
| 单集列表页：`SELECT title, published_at FROM episodes WHERE play_count = ...` 走了索引却还是慢——每命中一行都要回表取 title 和 published_at | 需要的列不在索引里 |
| 后台管理：`SELECT * FROM episodes WHERE status = 'published'` 的表 95% 的行都是 published，索引选择性差，几乎等于全表扫描还要多付索引的维护成本 | 索引里装满了"无用"的行 |

三条查询指向同一个主题：**B-tree 建好之后，还有三件事可以精修——把多个键排进同一棵树、把要读的列塞进叶子、只索引真正需要索引的行**。本篇一次讲清，每个结论都配 EXPLAIN 验证法。

先把练习场表补全（沿用 220 篇的定义，加两个本篇需要的列）：

```sql
CREATE TABLE episodes (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  show_id      BIGINT NOT NULL,
  title        TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'published',  -- published / drafted / removed
  play_count   BIGINT NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE listen_events (
  listener_id BIGINT NOT NULL,
  episode_id  BIGINT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 一、复合索引：列顺序就是"排序优先级"

```sql
CREATE INDEX idx_le_listener_time ON listen_events (listener_id, created_at);
```

B-tree 按**第一个键排序，第一个键相同再按第二个键排**——这个事实决定了列顺序的全部规则。索引 (listener_id, created_at) 里，同一个听众的收听记录按时间有序；但**只按 created_at 找，整棵树毫无头绪**（时间是散落在各个听众内部的）。

由此推出选列顺序的口诀：

1. **等值条件放前面，范围/排序条件放后面**。`WHERE listener_id = 42 AND created_at >= '2026-09-01'` 走 (listener_id, created_at) 时：先按 listener_id 一次定位，再在"该听众内部"按时间做范围扫描，两列都生效；
2. **顺序反了就只有第一列生效**。索引 (created_at, listener_id) 对上面那条查询：按时间范围扫完后，listener_id 条件只能逐行过滤；
3. **ORDER BY 想免排序，排序列要跟在等值条件后面**。

用 EXPLAIN 验证（这是本篇最重要的习惯：**每建一个索引，都亲眼确认它被用上了、且用得如预期**）：

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT episode_id, created_at FROM listen_events
WHERE listener_id = 42 AND created_at >= '2026-09-01'
ORDER BY created_at DESC
LIMIT 20;

-- 期望看到：
-- Index Scan using idx_le_listener_time on listen_events
--   Index Cond: ((listener_id = 42) AND (created_at >= ...))
--   （LIMIT + 索引内有序，不会出现 Sort 节点）
```

查询里看不到 Sort 节点，说明"该听众最近的收听"直接按索引倒着读了 20 行就停——LIMIT 与有序索引配合，代价与取多少行成正比，与表多大无关。

## 二、INCLUDE 覆盖索引：把要读的列"搭车"进叶子

B-tree 叶子 = 键列（参与排序、可被条件命中）+ 元组指针。INCLUDE 允许把额外列**存进叶子但不参与排序**：

```sql
CREATE INDEX idx_ep_plays_cover
ON episodes (play_count) INCLUDE (title, published_at);

-- 查询需要的列全部在索引里 → Index Only Scan，不回表
SELECT title, published_at FROM episodes WHERE play_count = 1000;
```

INCLUDE 与键列的分界线：

|  | 键列 `(play_count)` | INCLUDE 列 `(title, published_at)` |
| --- | --- | --- |
| 参与 B-tree 排序 | 是 | 否 |
| 能出现在 WHERE / JOIN / ORDER BY 里被索引直接利用 | 是 | 否（只能逐行过滤，或触发回表） |
| 参与唯一约束 | 是（可约束多列） | 否 |
| 索引体积 | 小 | 变大（每行都要存一份） |

INCLUDE 的典型搭档是 UNIQUE：业务要求"同一节目下标题唯一"，但又想让列表页顺带取到 published_at 免回表——

```sql
CREATE UNIQUE INDEX uk_ep_show_title
ON episodes (show_id, title) INCLUDE (published_at);
-- 唯一性只约束 (show_id, title)，published_at 不参与判重
```

### Index Only Scan 有个隐藏前提：可见性映射

"所有列都在索引里"只是必要条件。PostgreSQL 行级可见性在堆元组上（xmin/xmax），索引条目不带它。为免每行都回表验证，PG 用**可见性映射（Visibility Map, VM）**记录"整个页对所有事务可见"；Index Only Scan 只对 VM 标记过"全可见"的页免回表，没标记的页必须回表确认：

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT title FROM episodes WHERE play_count = 1000;
-- Heap Fetches: 0        理想：VM 覆盖，完全不回表
-- Heap Fetches: 99821    VM 落后：大量回表，索引"覆盖"名存实亡
```

VM 落后的典型场景：**大批量写入/更新之后还没跑 VACUUM**。这也是"VACUUM 不只是回收空间"的例证——它同时刷新可见性映射（相关机制见[VACUUM 与 autovacuum](/postgresql/212-VACUUMAutovacuum)）。线上出现 Heap Fetches 异常高时，第一反应是看该表的 VACUUM 是否被欠账。

坑点：INCLUDE 不是免费的。把宽列（TEXT 长文、JSONB）塞进 INCLUDE，索引体积膨胀、每次写入都要多写一份。**只把"这个查询模式确实要读"的列放进去**，为一个低频查询牺牲所有写入，得不偿失。

## 三、部分索引：WHERE 子句写进索引定义

部分索引只索引满足条件的行：

```sql
-- 后台列表只查已发布单集，草稿/下架行不进索引
CREATE INDEX idx_ep_published_time
ON episodes (published_at) WHERE status = 'published';
```

它解决两类问题：

1. **省体积省维护**：95% 的行是 published 的表，部分索引体积约为全量索引的 1/20，每次 UPDATE 不再碰无关行。注意方向：部分索引救的是"高频子集"（status = 'published'、未软删除的行），若查询要的是全集，它帮不上忙；
2. **表达业务不变量**（配合 UNIQUE，这是它最锋利的用法）：

```sql
-- 业务规则：每档节目同时只有一个置顶单集
CREATE UNIQUE INDEX uk_ep_one_pinned
ON episodes (show_id) WHERE pinned;

UPDATE episodes SET pinned = true WHERE id = 42;      -- 可以
UPDATE episodes SET pinned = true WHERE id = 43
  AND show_id = 1;                                    -- 违反唯一约束，数据库层硬保证
```

这条规则以前要靠"先查后插"或触发器实现，都有并发窗口；部分唯一索引让约束在数据库层原子成立。

### 部分索引的契约：查询条件必须"蕴含"索引谓词

planner 只在**能证明查询条件蕴含索引谓词**时才使用部分索引。谓词是 `WHERE status = 'published'`，那么：

```sql
-- 用得上：查询条件蕴含谓词（查的都是 published 行）
SELECT * FROM episodes WHERE status = 'published' AND published_at > now() - interval '30 days';

-- 用不上：条件等价于谓词，但 planner 推不出来
SELECT * FROM episodes WHERE status <> 'drafted' AND status <> 'removed' ...
-- 即使逻辑上只剩 published，也请把查询写成 status = 'published'
```

所以部分索引是**与应用代码的契约**：索引定义里的 WHERE 写什么，所有想受益的查询就得写什么。契约越简单（单一等值、IS NULL、IS NOT NULL），越不容易被无意破坏；`WHERE created_at > '2026-01-01'` 这类随时间漂移的谓词迟早坑人——过了这个日期新数据反而不在索引里。

## 四、表达式索引：索引建立在表达式的值上

```sql
-- 查询按规范化标题搜，索引就建在规范化表达式上
CREATE INDEX idx_ep_title_lower ON episodes (LOWER(title));
SELECT * FROM episodes WHERE LOWER(title) = 'one more episode';
```

两条铁律：

1. **查询侧表达式必须与索引定义同形**。索引建在 `LOWER(title)`，查询写 `WHERE title = 'One More Episode'`（没包 LOWER）用不上索引——这是[查询优化](/postgresql/250-QueryOptimization)里"索引失效"清单的常客；
2. **表达式必须 IMMUTABLE**。`timestamptz::date` 依赖时区设置（同一时刻在不同时区是不同日期），planner 拒绝给它建索引；要按"上海日历日"建索引，就把时区写死在表达式里：`(published_at AT TIME ZONE 'Asia/Shanghai')::date`。

表达式索引与生成列（[生成列](/postgresql/150-GeneratedColumn)）是竞争方案：表达式索引不占表的存储、不随行更新重算，但每条查询都要重复表达式；生成列把值物化进表、可加约束可被所有查询直接引用，代价是写入时计算与存储。查询模式单一选表达式索引，多查询共享派生值选生成列。

## 五、唯一索引与 NULL：默认"互不相等"，PG 15 起可反转

```sql
-- 默认行为（NULLS DISTINCT）：多个 NULL 互不冲突
CREATE UNIQUE INDEX uk_listener_email ON listeners (email);
-- email IS NULL 的行可以插入任意多条

-- PostgreSQL 15+：NULL 也参与唯一性判断
CREATE UNIQUE INDEX uk_listener_email_strict
ON listeners (email) NULLS NOT DISTINCT;
-- 第二条 email IS NULL 的插入直接报唯一约束冲突
```

心智模型：SQL 把 NULL 视为"未知"，两个未知无法判定相等，所以默认允许多个 NULL。业务上"email 可空但填了必须唯一"用默认即可；"占位也算占用"（比如手机号不允许重复空值）才用 NULLS NOT DISTINCT。部分唯一索引 `WHERE email IS NOT NULL` 是老版本里表达"非 NULL 唯一"的方式，NULLS NOT DISTINCT 出现后两者语义有细微差别：前者只约束非 NULL 行（与默认行为等价），后者连 NULL 一起约束。

## 动手环节：三条慢查询逐条修好

先在开发库把三张索引建好、灌少量数据（每表几千行即可），再逐题完成。每题先自己写，写完展开参考实现对照；重点不是抄 DDL，而是把"为什么这样建"说清楚。

### 任务一：个人页查询提速

需求：`WHERE listener_id = ? AND created_at >= ? ORDER BY created_at DESC LIMIT 20`。

提示：两列都进同一棵树；想清楚谁是等值条件；验证时确认执行计划里没有 Sort 节点、Heap Fetches 可接受。

<details>
<summary>参考实现与讲解</summary>

```sql
CREATE INDEX idx_le_listener_time
ON listen_events (listener_id, created_at DESC);
```

等值列在前、范围/排序列在后。`created_at DESC` 写不写都能服务这条查询（PG 支持反向扫描 B-tree），但当同一查询还要 `created_at ASC` 的变体时，默认升序即可反向扫描复用。验证要点：

- `Index Scan using idx_le_listener_time`，Index Cond 含两个条件；
- 无 Sort 节点（LIMIT 借助索引内有序提前终止）；
- 若执行计划退回 `Index Scan` 而非 `Index Only Scan`，本查询 SELECT 了 episode_id——想免回表可把它 INCLUDE 进去。

</details>

### 任务二：把列表页做成免回表

需求：热门页 `SELECT title, published_at FROM episodes WHERE play_count BETWEEN 900 AND 1100 ORDER BY play_count LIMIT 50`，希望 Heap Fetches 趋近 0。

提示：BETWEEN 是范围条件，排序列是 play_count；"免回表"意味着查询的每一列都要在索引里；别忘了先 VACUUM 再看 Heap Fetches。

<details>
<summary>参考实现与讲解</summary>

```sql
CREATE INDEX idx_ep_hot_cover
ON episodes (play_count) INCLUDE (title, published_at);

VACUUM (ANALYZE) episodes;   -- 刷新可见性映射 + 更新统计信息

EXPLAIN (ANALYZE, BUFFERS)
SELECT title, published_at FROM episodes
WHERE play_count BETWEEN 900 AND 1100
ORDER BY play_count
LIMIT 50;
-- 期望：Index Only Scan using idx_ep_hot_cover；Heap Fetches: 0 或接近 0
```

三步都不可省：建覆盖索引解决"列不全"；VACUUM 解决"VM 落后"；ANALYZE 让 planner 在有最新统计的情况下做选择。若写完发现仍是 Index Scan，优先检查是不是有未提交或最近大量写入导致 VM 未覆盖。

</details>

### 任务三：用部分索引表达业务规则

需求："每档节目最多一个置顶单集"用数据库层约束实现；同时后台"待审核列表"（status = 'drafted'，占全表约 5%）查询要快，但不想为它建全量索引。

提示：UNIQUE + WHERE 的组合题；两个需求各建一个部分索引，验证约束真的能拦住第二次置顶。

<details>
<summary>参考实现与讲解</summary>

```sql
-- 1. 业务不变量：每档节目一个置顶
CREATE UNIQUE INDEX uk_ep_one_pinned
ON episodes (show_id) WHERE pinned;

-- 验证：第二次置顶必须报错
UPDATE episodes SET pinned = true WHERE show_id = 1 AND id = 1;
UPDATE episodes SET pinned = true WHERE show_id = 1 AND id = 2;  -- 报错：duplicate key

-- 2. 高频子集：后台待审核列表
CREATE INDEX idx_ep_drafted
ON episodes (updated_at) WHERE status = 'drafted';

EXPLAIN SELECT * FROM episodes
WHERE status = 'drafted'
ORDER BY updated_at DESC LIMIT 20;
-- 期望：Index Scan using idx_ep_drafted
```

第二问的查询必须写出 `status = 'drafted'` 这一项——只写 `ORDER BY updated_at` 的话 planner 无法证明查询落在谓词范围内，索引不会启用。

</details>

## 坑点清单与自检

1. **把 INCLUDE 列当条件列用**：INCLUDE 列不参与排序，`WHERE title = ...` 打在 INCLUDE 列上只能逐行过滤。条件列进键区，纯取值列才进 INCLUDE。
2. **Heap Fetches 长期高**：覆盖索引建了却没生效，先查该表 VACUUM 欠账（pg_stat_user_tables 的 last_autovacuum / n_dead_tup），而不是急着重建索引。
3. **部分索引谓词与应用查询脱节**：谓词写 `status <> 'removed'`，查询写 `status = 'published'`，planner 推不出蕴含关系。谓词保持简单等值，并让查询侧逐字一致。
4. **表达式索引两侧不同形**：索引 `LOWER(title)`，查询 `title ILIKE 'xxx%'` 是另一回事；ILIKE 大小写折叠的加速方案是 pg_trgm + GIN（见[全文检索](/postgresql/300-FullTextSearch)）。
5. **生产建索引不带 CONCURRENTLY**：本篇所有 DDL 上线时都要加 `CONCURRENTLY`，中途失败记得清理 INVALID 索引（详见[索引类型](/postgresql/220-IndexType)的管理动作一节）。
6. **为低频查询堆宽索引**：每多一个 INCLUDE 列，全表每次写入都多付一份。建之前问：这个查询模式一秒发生几次？

**自检清单**：能画出 B-tree 叶子里"键列 + INCLUDE 列"的结构吗？Index Only Scan 的两个前提能各说出一句话吗？部分索引的"蕴含"是什么意思？NULLS DISTINCT 与 NULLS NOT DISTINCT 各对应什么业务？

## 面试视角

- **为什么复合索引遵循"等值在前、范围在后"**：B-tree 的排序优先级。等值条件把树收缩成一段连续区间，范围条件才能在这段区间内部继续利用有序性；反过来范围在前会让后续列的匹配退化成逐行过滤。
- **Index Only Scan 为什么还要回表**：可见性判断在堆元组上（MVCC 的 xmin/xmax），索引不存它；靠可见性映射兜底，VM 未覆盖的页必须回表。追问方向：VACUUM 与 VM 的关系、长事务为什么阻碍 VM 推进。
- **部分唯一索引 vs 先查后插**：前者在数据库层原子成立，后者在并发下有检查窗口（两个事务同时通过 SELECT 检查再插入）。这个对比是"约束下沉到数据库"的经典论据。
- **UNIQUE(a) INCLUDE(b) 与 UNIQUE(a, b) 的区别**：前者 b 不参与判重也不参与定位，只作覆盖载荷；后者 b 既是判重依据也是定位键。

## 下一步

- [索引查询优化](/postgresql/240-IndexQueryOptimization)：从查询侧盘点"索引为什么没用上"；
- [查询优化](/postgresql/250-QueryOptimization)：统计信息、代价模型与完整的优化闭环；
- [生成列](/postgresql/150-GeneratedColumn)：与表达式索引竞争的"物化派生值"方案；
- [VACUUM 与 autovacuum](/postgresql/212-VACUUMAutovacuum)：可见性映射背后的日常维护机制。
