---
order: 170
title: 索引类型：PostgreSQL 为什么有六种索引
module: 'postgresql'
category: 数据库
difficulty: advanced
description: 以播客平台的六类真实查询为练习场，理解 B-tree/Hash/GiST/GIN/SP-GiST/BRIN 各自解决的查询形状：等值、范围、空间、包含、前缀、时序，配齐索引管理动作（CONCURRENTLY、REINDEX、用量统计）与选型速查。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'postgresql/110-JSONBJSONDifference'
  - 'postgresql/230-CoveringIndexPartialIndex'
  - 'postgresql/300-FullTextSearch'
  - 'postgresql/320-KNNVectorIndex'
prerequisites:
  - 'postgresql/010-OverviewInstallConfig'
---

## 1. 场景：六类查询，六种索引

你负责播客平台"声浪"的 PostgreSQL 17 库。产品排期上排着六个查询需求：

| 需求 | 查询形状 |
| ---- | -------- |
| 单集详情页按 id/标题等值查找 | 等值 `=` |
| 运营按发布日期区间拉单集、按播放量排序 | 范围 + 排序 |
| 听众找附近的线下听友会（经纬度） | 空间近邻 |
| 搜索节目简介关键词、按标签筛选 | 包含/分词匹配 |
| 输入框实时补全用户名前缀、IP 白名单校验 | 前缀/网络包含 |
| 客服查"昨晚 9 点到 10 点的收听事件流水" | 时序范围，十亿行 |

这六种形状没有一种索引能全包——PostgreSQL 提供 B-tree、Hash、GiST、GIN、SP-GiST、BRIN 六种索引类型，**每种索引都是为某种查询形状而生的**。本篇按需求单逐个配索引，顺带建立"拿到查询先识别形状"的选型直觉。

先上总览，后面逐一展开：

| 类型    | 一句话定位           | 支持的典型形状               |
| ------- | -------------------- | ---------------------------- |
| B-tree  | 默认，最通用         | 等值、范围、排序、前缀 LIKE  |
| Hash    | 纯等值               | 只有 `=`                     |
| GiST    | 可扩展的通用框架     | 空间、范围类型、KNN 近邻     |
| GIN     | 倒排索引             | 全文、数组、JSONB 包含       |
| SP-GiST | 空间分区树           | 前缀匹配、inet、非平衡结构   |
| BRIN    | 块范围摘要，极小     | 物理有序大表的范围过滤       |

### 1.1 练习场数据

```sql
CREATE TABLE episodes (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title        TEXT NOT NULL,
  synopsis     TEXT,                          -- 简介，全文搜索用
  play_count   BIGINT NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ NOT NULL,
  tags         TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE listeners (
  id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nickname TEXT NOT NULL,
  last_ip  INET
);

CREATE TABLE listen_events (                  -- 收听流水，十亿行级别
  listener_id BIGINT NOT NULL,
  episode_id  BIGINT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 2. B-tree：不知道用哪个时的答案

```sql
CREATE INDEX idx_ep_published ON episodes (published_at);
CREATE INDEX idx_ep_plays     ON episodes (play_count);
```

B-tree 是 `CREATE INDEX` 不指定类型时的默认值，也是唯一支撑 `UNIQUE`/主键约束的索引类型（排除约束另有 GiST 可选，见下文）。它维护**排好序的键**，所以支持的形状最全：

```sql
-- 等值
SELECT * FROM episodes WHERE id = 42;
-- 范围（索引范围扫描）
SELECT * FROM episodes
WHERE published_at >= '2026-09-01' AND published_at < '2026-10-01';
-- 排序（直接按索引顺序读，免排序）
SELECT title FROM episodes ORDER BY play_count DESC LIMIT 10;
-- 前缀 LIKE（等值于一个范围扫描）
SELECT * FROM listeners WHERE nickname LIKE '夜航%';
```

最后一条值得停下：`LIKE '夜航%'` 能走 B-tree，因为"以夜航开头"等价于"落在 [夜航， 夜航+无穷) 这个范围"；而 `LIKE '%航'`（前缀未知）在有序结构里无范围可扫，只能全扫。前缀未知的补救是 pg_trgm 扩展 + GIN 索引（见[全文检索](/postgresql/300-FullTextSearch)）。

复合 B-tree 的列顺序规则、覆盖索引（INCLUDE）、部分索引，是下一站[覆盖索引与部分索引](/postgresql/230-CoveringIndexPartialIndex)的主题，本篇不展开。

## 3. Hash：只会一件事，但有时正是你需要的

```sql
CREATE INDEX idx_ep_title_hash ON episodes USING hash (title);
SELECT * FROM episodes WHERE title = '第 41 期：一个程序员的退休计划';
```

Hash 索引把键散列成桶，等值查找一次定位，O(1)。限制同样绝对：**只支持 `=`**，范围、排序、唯一约束统统不行。

历史包袱要知道：**PostgreSQL 10 之前 Hash 索引不写 WAL**，崩溃后可能损坏，所以老资料说"别用 Hash"。10 起它已完整可靠。今天的真实使用场景很窄：

- 列太长，B-tree 条目超过约 2704 字节的上限建不了（比如很长的 URL、token），Hash 不受此限；
- 纯等值点查的宽字符串列。

但即便这些场景，多数团队仍选 B-tree（顺带获得范围与排序能力）。**Hash 索引是备选答案，不是默认答案**。

## 4. GiST：一个框架，不只是索引

GiST（Generalized Search Tree）的准确定位是**可扩展的索引框架**：任何能定义"距离/包含/相交"语义的数据类型，都能挂上 GiST 操作符类变成可索引的。三大主力用途：

```sql
-- 1. 空间数据（PostGIS）：找附近的听友会
CREATE INDEX idx_venue_geom ON venues USING gist (geom);
SELECT name FROM venues
WHERE ST_DWithin(geom, ST_MakePoint(116.4, 39.9)::geography, 3000);

-- 2. 范围类型：会场档期是否冲突（GiST 还能当约束用）
--    排除约束里 text 的等值判断需要 btree_gist 扩展
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE bookings (room text, during tstzrange);
CREATE INDEX idx_bookings_during ON bookings USING gist (room, during);
ALTER TABLE bookings
  ADD CONSTRAINT no_overlap EXCLUDE USING gist
    (room WITH =, during WITH &&);   -- 同一间房档期不得相交，数据库层硬保证

-- 3. KNN 近邻：<-> 距离排序走 GiST
SELECT name FROM venues
ORDER BY geom <-> ST_MakePoint(116.4, 39.9) LIMIT 5;
```

同为"模糊匹配"，GiST 与 GIN 的分工：全文检索场景 GIN 通常更快，但 GiST 支持 KNN 排序、更新代价更低。空间、范围、近邻是 GiST 的主场。原理上 GiST 是"有损"索引——索引判断命中的行可能只是近似命中，需要回表复核，所以 `EXPLAIN` 里常见 `Recheck Cond`，这是设计使然不是 bug。

## 5. GIN：为"一个值对应一堆条目"而生

GIN（Generalized Inverted Index，倒排索引）把复合值拆成原子项：文档拆成词素、数组拆成元素、JSONB 拆成键值，再为**每个原子项维护指向包含它的行的列表**——和书籍末尾的索引页同构。

```sql
-- 1. 全文检索（推荐配置，表达式必须与查询侧一致）
CREATE INDEX idx_ep_fts ON episodes
  USING gin (to_tsvector('simple', synopsis));
SELECT title FROM episodes
WHERE to_tsvector('simple', synopsis) @@ to_tsquery('simple', '咖啡 & 定价');

-- 2. 数组：打了一个标签就算命中
CREATE INDEX idx_ep_tags ON episodes USING gin (tags);
SELECT title FROM episodes WHERE tags @> ARRAY['AI', '创业'];

-- 3. JSONB：@> 与 ? 系列查询
CREATE INDEX idx_events_payload ON device_events USING gin (payload);
```

GIN 的代价在写入：一次 INSERT 要更新行内每个原子项的倒排列表。默认开启的 `fastupdate` 把更新攒进待定列表（pending list），刷盘时机由 `gin_pending_list_limit` 控制——这换来批量写提速，代价是**待定列表攒满时那次操作会突然变慢**：

```sql
CREATE INDEX idx_ep_tags_fast ON episodes USING gin (tags)
  WITH (fastupdate = on, gin_pending_list_limit = 4096);   -- 单位 KB
```

写入密集又高频查询的表，要么调小待定列表阈值摊平毛刺，要么 `ALTER INDEX ... SET (fastupdate = off)` 关掉换取平滑延迟。更多 JSONB 索引细节（含 jsonb_path_ops 变体）见[JSONB 与 JSON](/postgresql/110-JSONBJSONDifference)。

## 6. SP-GiST：非平衡分区树的主场

SP-GiST（Space-partitioned GiST）把空间**划分**成互不重叠的区域：四叉树、k-d 树、基数树（trie）。B-tree 是平衡的、页与页之间有重叠语义；SP-GiST 的分区树天然适合"非平衡、分层、前缀"形状的数据：

```sql
-- 用户名前缀补全（text 默认操作符类就是 radix tree 语义）
CREATE INDEX idx_listener_nick ON listeners USING spgist (nickname);
SELECT nickname FROM listeners WHERE nickname ^@ '夜航';   -- 前缀匹配走索引

-- 网络地址：IP 白名单包含判断
CREATE INDEX idx_listener_ip ON listeners USING spgist (last_ip inet_ops);
SELECT * FROM listeners WHERE last_ip << '192.168.0.0/16';
```

与 GiST 的关系一句话：GiST 重叠分区、通用面广；SP-GiST 不重叠分区、对"树形可分"的数据（前缀、坐标、网络段）更快更省空间。拿不准就 GiST，SP-GiST 是特定形状的加速器。

## 7. BRIN：十亿行表的范围查询救星

BRIN（Block Range Index）不索引每一行，只为**每个块范围**（默认 128 个页 = 1 MB）记录 min/max 摘要。查询"昨晚 9 到 10 点的事件"时，扫描摘要就能跳过所有时间范围不相交的块：

```sql
CREATE INDEX idx_le_created ON listen_events USING brin (created_at)
  WITH (pages_per_range = 32);
```

它成立的前提只有一条：**列的物理顺序与逻辑顺序高度相关**。收听流水按时间自然追加，物理顺序就是时间序，完美契合；如果列的数据是随机散布的（比如按用户 id 查询），min/max 区间彼此重叠，每个块都可能命中，BRIN 退化成全表扫描。

| 维度       | B-tree             | BRIN               |
| ---------- | ------------------ | ------------------ |
| 大小       | 与行数同量级，GB 级 | 常数级，几 MB      |
| 精度       | 精确定位行         | 定位到块范围，仍需逐行过滤 |
| 适用       | 通用               | 追加型大表的时序/自增列 |

日志、事件流水、物联网采样这类"只追加、按时间查"的巨表，BRIN 用几十万分之一的索引体积换走 B-tree 的范围扫描能力——十亿行的表，这个差距是"建得起索引"和"建不起"的差距。

## 8. 索引管理：四个必会动作

```sql
-- 1. 无阻塞创建/删除：CONCURRENTLY 不拿排他锁，线上建索引的标准动作
CREATE INDEX CONCURRENTLY idx_ep_title ON episodes (title);
DROP INDEX CONCURRENTLY IF EXISTS idx_ep_title;

-- 2. 重建：膨胀或损坏后重建；REINDEX 也有 CONCURRENTLY 版本（PG 12+）
REINDEX INDEX CONCURRENTLY idx_ep_title;

-- 3. 盘点：一个表上到底有什么索引
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'episodes';

-- 4. 用量审计：找出从没被用过的索引（先重置统计再观察一周）
SELECT indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_stat_user_indexes
WHERE relname = 'episodes' AND idx_scan = 0;
```

`CREATE INDEX`（不带 CONCURRENTLY）会拿 SHARE 锁阻塞一切写入——普通索引在开发环境随意建，生产环境默认加 CONCURRENTLY。注意它的两个脾气：耗时约两倍（扫两遍表、等所有旧事务结束）；中途失败会留下一个 `INVALID` 索引（`\d` 或 pg_indexes 里可见），不参与查询还白耗写入，需要 DROP 后重建。

## 9. 选型速查与坑点清单

拿到查询，先识别形状再选索引：

| 查询形状                       | 首选索引          |
| ------------------------------ | ----------------- |
| 等值 / 范围 / 排序 / 前缀 LIKE | B-tree            |
| 超宽列的纯等值                 | Hash（备选）      |
| 空间近邻、范围类型、KNN        | GiST              |
| 全文、数组、JSONB 包含         | GIN               |
| 前缀补全、inet、分区树形状     | SP-GiST           |
| 追加型巨表的时序范围           | BRIN              |

高频坑：

1. **`LIKE '%词'` 建了 B-tree 也不走**：前缀未知无范围可扫。换 pg_trgm + GIN，或改业务为前缀匹配。
2. **表达式索引与查询不同形**：索引建在 `LOWER(email)`，查询必须写 `WHERE LOWER(email) = ...`，写裸列用不上。
3. **表达式必须 IMMUTABLE**：`created_at::date` 若列是 timestamptz，转换依赖时区设置（STABLE），直接建索引会报错；要固定时区写 `(created_at AT TIME ZONE 'Asia/Shanghai')::date`。
4. **GIN 周期性写入毛刺**：fastupdate 待定列表攒满时刷盘。写入密集表调小 `gin_pending_list_limit` 或关闭 fastupdate。
5. **BRIN 建在随机列上**：块区间互相重叠，等于没建。只用于物理有序列。
6. **生产建索引不带 CONCURRENTLY**：阻塞全部写入。例外要靠窗口期，别靠运气。
7. **INVALID 索引残留**：CONCURRENTLY 中途失败后要手动清理重建。

## 10. 练习

基于本文的表：

1. 为"查播放量在 1 万到 10 万之间、按发布时间排序"的单集设计索引，并用 EXPLAIN 验证排序是否还发生。
2. episodes.synopsis 要支持中英混合关键词搜索，写出索引 DDL 与对应查询（提示：to_tsvector 选 'simple' 配置，查询侧表达式必须一致）。
3. listeners.nickname 的补全框要求支持任意位置包含（不只是前缀），现方案为什么不工作？给出 pg_trgm 方案的 DDL。
4. listen_events 已有 10 亿行。比较为 created_at 建 B-tree 与 BRIN 的索引大小（可用 pg_relation_size 估算逻辑），说明何时必须选 BRIN。
5. 用 pg_stat_user_indexes 找出你库里"零扫描"的索引，评估删除收益（记得 DROP INDEX CONCURRENTLY）。
6. （思考题）为什么 GiST 能用 EXCLUDE 约束实现"档期不相交"，而 B-tree 不行？提示：约束要表达的是"相交为假"，这是等值/排序之外的哪类语义？

## 下一步

- [覆盖索引与部分索引](/postgresql/230-CoveringIndexPartialIndex)：B-tree 的 INCLUDE/WHERE 精修。
- [全文检索](/postgresql/300-FullTextSearch)：GIN + tsvector 的完整查询工程。
- [KNN 向量索引](/postgresql/320-KNNVectorIndex)：pgvector 把"近邻"语义推向 AI 检索。
- [JSONB 与 JSON](/postgresql/110-JSONBJSONDifference)：GIN 在 JSONB 上的完整实战。
