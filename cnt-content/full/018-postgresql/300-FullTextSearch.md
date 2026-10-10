---
order: 270
title: 全文检索
module: 'postgresql'
category: 数据库
difficulty: advanced
description: 以站内搜索场景讲 PG 全文检索：分词配置、中文扩展 zhparser/pg_jieba、GIN 索引、ts_rank 排序与高亮
author: fanquanpp
updated: '2026-10-07'
related:
  - 'postgresql/220-IndexType'
  - 'postgresql/080-AdvancedSQL'
  - 'postgresql/340-ExtensionModuleDetailed'
prerequisites:
  - 'postgresql/010-OverviewInstallConfig'
---

## 知识点地图

- **知识类别**：PostgreSQL 数据类型与功能（Chapter 12 Full Text Search）。
- **解决什么问题**：`LIKE '%关键词%'` 三个死穴——不走索引全表扫、不懂词形（搜 "running" 找不到 "run"）、没有相关度排序。PG 内置的全文检索把文本拆成**词素**建倒排索引，天然支持匹配 + 排名 + 高亮，不用引入 Elasticsearch 就能撑起中小站内搜索。
- **什么时候用到**：文章/商品/工单站内搜索；日志关键字检索；数据量百万行级、不想维护独立搜索集群的场景。
- **前置阅读**：[索引类型](/postgresql/220-IndexType)（GIN 一节）。

## 心智模型：文本 → 词素向量 → 倒排匹配

```text
"The quick brown foxes jumped"
        │ to_tsvector('english', ...)  分词 + 归一化（复数/时态还原）
        ▼
'brown':3 'fox':4 'jump':5 'quick':2        ← tsvector（词素:位置）
        │
'fox' ── to_tsquery('english','fox') ──▶ tsquery
        │ @@ 匹配运算符
        ▼
true（文档含词素 fox）
```

两个类型对应两个世界：`tsvector` 是**文档侧**的归一化结果，`tsquery` 是**查询侧**的归一化结果。匹配运算符 `@@` 问的是"查询的词素集合与文档的词素集合有无交集"。理解了"两侧都要归一化"，一半的坑就解释通了——**查询词和文档词必须走同一个分词配置**，否则归一化结果对不上。

## 场景一：英文文章站内搜索（零扩展起步）

PG 内置十几种语言的分词配置，英文开箱即用：

```sql
CREATE TABLE articles (
    id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title   text NOT NULL,
    body    text NOT NULL
);

-- 查询：标题 + 正文合并成一个向量参与匹配
SELECT id, title
FROM articles
WHERE to_tsvector('english', title || ' ' || body)
      @@ websearch_to_tsquery('english', 'postgres index tuning');
```

四种 tsquery 构造函数的分工：

```sql
to_tsquery('english', 'quick & fox');        -- 严格语法：& | ! () 手写
plainto_tsquery('english', 'quick fox');     -- 全部词 AND 连接
phraseto_tsquery('english', 'quick fox');    -- 短语：还要位置相邻
websearch_to_tsquery('english', '"quick fox" or bear -cat');
--            ↑ 用户输入友好：引号短语、or、-排除，容错最好
```

**给用户输入用 `websearch_to_tsquery`**：它把非法语法容错处理，用户手输 `&` 之类不会让整个查询报错；`to_tsquery` 语法错直接抛异常，只适合代码拼好的查询。

### 生成列：让索引条件与查询条件一字不差

上面的写法每次查询都要重算 `to_tsvector(...)`——就算有 GIN 索引，表达式两边也要**一模一样**才用得上。生产做法是把向量物化成生成列（见[生成列](/postgresql/150-GeneratedColumn)）：

```sql
ALTER TABLE articles ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || body)) STORED;

CREATE INDEX idx_articles_fts ON articles USING gin (fts);

-- 查询侧现在只引用列，形态天然一致
SELECT id, title FROM articles WHERE fts @@ websearch_to_tsquery('english', 'postgres tuning');
```

这一步把"表达式索引要两边同形"的维护负担变成 schema 定义，是官方推荐形态。

### 排名与高亮

```sql
SELECT id, title,
       ts_rank(fts, q) AS rank,
       ts_headline('english', body, q,
                   'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15') AS snippet
FROM articles,
     websearch_to_tsquery('english', 'postgres tuning') q
WHERE fts @@ q
ORDER BY rank DESC
LIMIT 20;
```

`ts_rank` 是词频 × 权重的启发式分数（默认只看 D 权重——正文），够用但不智能；要"标题命中权重更高"用 `setweight` 在生成列里给 title 部分标 A 权重：

```sql
-- 生成列升级版：标题 A 权重、正文 B 权重
to_tsvector('english', title) || setweight(to_tsvector('english', body), 'B')
-- 查询端配 ts_rank(fts, q, 0.1) 之类调权重分配
```

`ts_headline` 在服务端切出关键词前后片段并包标签——注意它**要回表取原文**，列表页只对前 20 行调用，别全量。

## 场景二：中文搜索（zhparser / pg_jieba）

内置配置没有中文分词（'simple' 只按空格切），中文句子会被当成一整个词素，搜索基本不可用。方案是装第三方分词扩展：

```sql
-- zhparser（基于 SCWS）或 pg_jieba（基于结巴分词），以 zhparser 为例
CREATE EXTENSION zhparser;

-- 注册一个基于它的文本搜索配置
CREATE TEXT SEARCH CONFIGURATION chinese (PARSER = zhparser);
ALTER TEXT SEARCH CONFIGURATION chinese
  ADD MAPPING FOR n, v, a, i, e, l WITH simple;   -- 名词/动词/形容词/成语/叹词/习语

-- 使用：两侧配置一致
SELECT to_tsvector('chinese', 'PostgreSQL 全文检索中文分词实践');
-- 'postgresql':1 '全文':2 '检索':3 '中文':4 '分词':5 '实践':6  （示意）

SELECT id, title FROM articles
WHERE to_tsvector('chinese', title || ' ' || body)
      @@ to_tsquery('chinese', '全文 & 检索');
```

要点与坑：

- 扩展装在**服务器上**（RDS 要确认云厂商提供 zhparser；自建编译安装），应用侧零依赖；
- 中文配置的关键是 `ADD MAPPING FOR` 的**词性清单**——zhparser 会输出标点、助词等词性，不筛掉会污染索引；
- 无扩展的降级方案：`to_tsvector('simple', ...)` 配合应用层预分词（写入时先分好词、空格拼接存进专用列），搜索词同样应用层分词后用 plainto_tsquery。能用但两处分词逻辑必须同版本；
- 若中文搜索是核心功能且要同义词、纠错、机器学习排序，那是 Elasticsearch/Meilisearch 的领域——PG 全文检索的定位是"**够用且免维护**"，不是"最强"。

## 场景三：工单搜索（排名调优 + trigram 补位）

客服工单系统要"标题权重高、精确短语置顶、错别字也能命中"，组合拳：

```sql
-- 向量：编号精确 + 标题高权 + 正文
ALTER TABLE tickets ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', ticket_no::text), 'A') ||
    setweight(to_tsvector('simple', title), 'A') ||
    setweight(to_tsvector('simple', coalesce(body,'')), 'D')
  ) STORED;

-- 排名：A 权重命中的分值显著高
SELECT id, title, ts_rank(fts, q) AS score
FROM tickets, websearch_to_tsquery('simple', 'refund order') q
WHERE fts @@ q
ORDER BY score DESC LIMIT 20;

-- 错别字兜底：pg_trgm 相似度（扩展，见扩展篇），与全文检索 OR 合并
SELECT id, title,
       GREATEST(ts_rank(fts, q), similarity(title, 'refnd oder')) AS score
FROM tickets, websearch_to_tsquery('simple', 'refund order') q
WHERE fts @@ q OR title % 'refnd oder'
ORDER BY score DESC LIMIT 20;
```

`%` 运算符走 pg_trgm 的 GIN 索引（`gin_trgm_ops`），与全文检索的 GIN 索引可以并存——精确语义与模糊语义各管一段。

## 索引与维护清单

```sql
-- 查看某配置的分词结果（调试第一步）
SELECT * FROM ts_debug('chinese', '中文全文检索测试');

-- 词典与停用词管理
ALTER TEXT SEARCH DICTIONARY simple (STOPWORDS = 'chinese');  -- 自定义停用词表

-- 索引体积与更新代价评估（GIN 写入放大，见索引类型篇）
SELECT pg_size_pretty(pg_relation_size('idx_articles_fts'));
```

维护要点：生成列方案下**写入即更新向量**，无滞后；若用表达式索引 + 触发器维护的旧方案，注意触发器链耗时。GIN 的 fastupdate 毛刺与 `gin_pending_list_limit` 调参见[索引类型](/postgresql/220-IndexType)。

## 常见困惑

**"为什么搜不到明明包含的词？"**——按顺序查三处：两侧分词配置是否一致（最常见）；`ts_debug` 看目标词被归一化成了什么（复数/词干还原）；词是否进了停用词表。

**"ts_rank 分数能跨查询比较吗？"**——不能。它是文档内词频的相对值，只在同一查询的候选集里有意义。做"热门搜索"之类跨查询排序要自己维护计数。

**"全文检索能替代 LIKE 吗？"**——语义不同。用户名、SKU 这类**子串精确匹配**仍是 `LIKE '%x%'` + pg_trgm GIN；全文检索处理的是**自然语言词素匹配**。两者经常并用（场景三）。

## 动手实践：给播客库装上搜索

任务：

1. 给 plays 表加生成列 `fts`（show_name + city，'simple' 配置）并建 GIN 索引；
2. 写一条带排名与高亮的搜索：关键词"代码 夜话"，返回标题片段；
3. 用 `ts_debug` 观察 'simple' 与 'english' 对 "Running Foxes" 的分词差异；
4. （进阶，若本地装得了 zhparser）建中文配置并对比一句中文在 simple/chinese 下的匹配结果。

<details>
<summary>参考实现（先自己写再展开）</summary>

```sql
-- 1
ALTER TABLE plays ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', show_name || ' ' || city)) STORED;
CREATE INDEX idx_plays_fts ON plays USING gin (fts);

-- 2
SELECT show_name, city,
       ts_rank(fts, q) AS score,
       ts_headline('simple', show_name, q, 'StartSel=[, StopSel=]') AS hl
FROM plays, websearch_to_tsquery('simple', '代码 夜话') q
WHERE fts @@ q
ORDER BY score DESC;

-- 3
SELECT token, lexeme, alias, position FROM ts_debug('english', 'Running Foxes');
-- token=Running → lexeme=run（词干还原）；'simple' 下保留原形 Running
```

判读要点：任务 2 若返回空，先跑 `SELECT to_tsvector('simple','代码夜话')` 看词素——'simple' 不分词，"代码夜话"是整体，与查询词"代码"不匹配；把数据侧改成 `show_name` 与 `city` 拼接处加空格、或查询侧用"代码夜话"整词，体会"两侧归一化必须一致"的含义。
</details>

## 检验清单

- 能画出 tsvector/tsquery/@@ 的关系并解释"两侧同配置"的原因；
- 会选 to_tsquery / websearch_to_tsquery 并说清理由；
- 能用生成列 + GIN 索引落一个生产级搜索字段，并给标题/正文设权重；
- 知道中文场景的三条路线（zhparser / pg_jieba / 应用层预分词）与各自前提；
- 知道 pg_trgm 与全文检索的分工与并用姿势。

## 下一步

- [索引类型](/postgresql/220-IndexType)：GIN 的原理与写入代价；
- [扩展模块详解](/postgresql/340-ExtensionModuleDetailed)：zhparser/pg_trgm 的安装与预加载；
- [数组与范围类型](/postgresql/095-ArrayAndRangeTypes)：标签多值场景的另一种建模。

## 参考与致谢

- PostgreSQL 官方文档 Chapter 12 Full Text Search（PostgreSQL Licence）：<https://www.postgresql.org/docs/current/textsearch.html>
- zhparser 项目主页（PostgreSQL Licence）：<https://github.com/amutu/zhparser>
- pg_jieba 项目主页（BSD-3）：<https://github.com/jaiminpan/pg_jieba>
