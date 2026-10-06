---
order: 340
title: SQL 全文搜索
module: 'sql'
category: 数据库
difficulty: beginner
description: LIKE 前缀匹配的性能困境、倒排索引心智模型，MySQL FULLTEXT、PostgreSQL tsvector/tsquery、SQL Server CONTAINS 三方言对照与中文分词现状
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：SQL 查询进阶 / 文本检索（横跨三个主流方言的对照篇）。
- **解决什么问题**：商品搜索框输入"无线 蓝牙 键盘"，`LIKE '%关键词%'` 只能全表扫；用户还期望"词序无关、相关度排序、搜 running 能命中 ran"。三大数据库各自内置了全文检索能力，本篇建立统一心智模型再对照方言。
- **什么时候用到**：站内搜索第一版（不想引 Elasticsearch 时）；报表里的关键字筛选；评估"该用数据库全文还是独立搜索引擎"。
- **分工声明**：本篇是**三方言对照篇**。MySQL 方言深入（n-gram 解析器、参数调优）见 [MySQL 全文索引](/mysql/260-FullTextIndex)；PostgreSQL 方言深入（分词配置、zhparser、ts_rank 排序工程）见 [PG 全文检索](/postgresql/300-FullTextSearch)——本篇给对照地图，单方言细节让位专篇。

## 心智模型：为什么 LIKE 慢、倒排索引快

```text
LIKE '%键盘%' 为什么全表扫：
B-tree 索引按"从左到右"排序。前缀已知（LIKE '无线%'）= 一个范围扫描，能走索引；
前缀未知（LIKE '%键盘%'）= 任何行都可能是答案，索引无从定位 → 逐行扫描全文。

倒排索引（Inverted Index）的思路：
写入时把文本拆成词，建"词 → 文档列表"的目录：
  '无线'  → [doc 3, doc 17, doc 42]
  '蓝牙'  → [doc 3, doc 9]
查询时：查目录拿列表求交集 → 直接得到 doc 3，不碰其余文档。
```

三个方言的全文检索本质都是"写入时拆词建目录"，差异在**拆词规则**（分词器）、**查询语法**（布尔逻辑怎么写）、**排序**（相关度怎么算）。

## 场景一：商品搜索（同一需求三方言写法对照）

表：`products(id, name, description)`，搜"蓝牙 键盘"。

**PostgreSQL：tsvector/tsquery**

```sql
-- 表达式与索引同形是硬要求
CREATE INDEX idx_products_fts ON products
  USING gin (to_tsvector('english', name || ' ' || description));

SELECT id, name, ts_rank(...) AS score
FROM products
WHERE to_tsvector('english', name || ' ' || description)
      @@ plainto_tsquery('english', 'wireless keyboard')
ORDER BY score DESC;
-- @@@ 匹配词素集合；ts_rank 出相关度；中文需 zhparser/pg_jieba（见 PG 专篇）
```

**MySQL：FULLTEXT 索引**

```sql
CREATE FULLTEXT INDEX idx_products_fts ON products (name, description);

-- 自然语言模式：默认，按相关度自动排序
SELECT id, name,
       MATCH(name, description) AGAINST('wireless keyboard') AS relevance
FROM products
WHERE MATCH(name, description) AGAINST('wireless keyboard');

-- 布尔模式：手工控制必须/排除
SELECT id FROM products
WHERE MATCH(name, description) AGAINST('+keyboard +bluetooth -wired' IN BOOLEAN MODE);
```

**SQL Server：CONTAINS / FREETEXT**

```sql
-- 前提：建 FULLTEXT CATALOG + FULLTEXT INDEX（一次性的目录设施）
CREATE FULLTEXT CATALOG ft_catalog AS DEFAULT;
CREATE FULLTEXT INDEX ON products (name, description)
  KEY INDEX PK_products ON ft_catalog;

SELECT id, name
FROM products
WHERE CONTAINS((name, description), '"wireless" AND "keyboard"');

-- FREETEXT：宽松的"意思接近"匹配（自动词形变化）
SELECT id, name FROM products
WHERE FREETEXT((name, description), 'wireless keyboards');
```

对照结论表：

| 维度 | PostgreSQL | MySQL | SQL Server |
| --- | --- | --- | --- |
| 索引类型 | GIN（tsvector 列或表达式） | FULLTEXT | FULLTEXT（需 catalog） |
| 匹配运算 | `@@`（tsvector vs tsquery） | `MATCH...AGAINST` | `CONTAINS` / `FREETEXT` |
| 布尔语法 | tsquery 的 `& \| !` | `+ - * " ()` | `AND OR NOT` + 引号短语 |
| 相关度排序 | `ts_rank`（自己调权重） | 自然语言模式自动带 | `CONTAINSTABLE` 的 RANK |
| 词形还原 | 按语言配置（english 有词干） | 默认无（n-gram/内置中文解析器例外） | 有（语言特定 word breaker） |
| 中文支持 | zhparser / pg_jieba 扩展 | n-gram parser（内置，InnoDB 5.7.6+） | 中文 word breaker（2012+） |

## 场景二：文章站检索（布尔逻辑与短语）

用户输入"数据库 优化 -Redis"这类表达式时，各方言的翻译：

```sql
-- MySQL 布尔模式：+ 必须、- 排除、"..." 短语
WHERE MATCH(body) AGAINST('+数据库 +优化 -redis' IN BOOLEAN MODE)

-- PostgreSQL：websearch_to_tsquery 直接吃用户输入（引号/or/- 与 MySQL 布尔相似）
WHERE fts @@ websearch_to_tsquery('simple', '数据库 优化 -redis')

-- SQL Server：CONTAINS 的布尔表达式
WHERE CONTAINS(body, '数据库 AND 优化 AND NOT "Redis"')
-- 短语：CONTAINS(body, '"全文 检索"')  —— 引号内按位置相邻匹配
```

易错点：MySQL 布尔模式的 `-redis` 要求前面**必须有至少一个 + 词**（纯排除的表达式返回空）；PG 的 `to_tsquery` 不容忍非法语法（用户输入要用 `websearch_to_tsquery` 容错版）；SQL Server 的 NOT 在 CONTAINS 里是 `AND NOT` 而不是独立前缀。三家的"容错边界"不同，用户输入永远走各自的友好解析入口。

## 场景三：日志关键字巡检（查询扩展与容错）

运维在日志表搜"timeout"，但日志里可能写的是 "timed out"：

```sql
-- MySQL 查询扩展：命中结果里的词反哺第二轮搜索
SELECT * FROM app_logs
WHERE MATCH(message) AGAINST('timeout' WITH QUERY EXPANSION);
-- 第一轮找到 "Connection timed out"，第二轮把 timed/out 也搜出来
-- 代价：可能召回大量弱相关行，日志量大时慎用

-- SQL Server FREETEXT：自动词形/同义近似
SELECT * FROM app_logs WHERE FREETEXT(message, 'timeout');

-- PostgreSQL：原生没有查询扩展，用词干还原（english 配置跑→run）+ trigram 兜底
WHERE message_tsv @@ plainto_tsquery('english', 'timeout')
   OR message % 'timeout'          -- pg_trgm 相似度，兜住拼写变体
```

判断：**QUERY EXPANSION 与 FREETEXT 是"求召回"的工具**（宁多勿漏），监控告警类查询反而要"求精确"（CONTAINS/布尔模式），两类别用反。

## 中文分词现状（三方言一览）

中文没有空格分词，是三方言全文检索的共同软肋：

- **MySQL**：默认解析器按空格/标点切，中文整句成词基本不可搜。`WITH PARSER ngram`（5.7.6+ 内置）按 N 字符滑窗切词，"数据"与"数据库"能互相命中但精度一般；参数 `ngram_token_size`（默认 2）控制粒度。专深见 [MySQL 全文索引](/mysql/260-FullTextIndex)；
- **PostgreSQL**：内置无中文分词，路线是装 zhparser（SCWS）或 pg_jieba（结巴）扩展建自定义搜索配置。专深见 [PG 全文检索](/postgresql/300-FullTextSearch)；
- **SQL Server**：2012 起带中文 word breaker，开箱可用但可控性弱（不能选词库）。

共同结论：**中文全文检索要么接受 n-gram 的粗粒度，要么引入分词扩展**；再往上有同义词、纠错、排序学习需求时，Elasticsearch/Meilisearch 是下一站。数据库全文检索的定位是"中小数据量、免维护"的默认解。

## 选型速查

| 你的场景 | 建议 |
| --- | --- |
| 百万行内、需求是"标题+正文关键词命中并排序" | 数据库全文检索（任一方言） |
| 主要中文、能装扩展/开 n-gram | 同上，配中文解析器 |
| 多方言并存的项目 | 按"倒排索引 + 布尔 + 相关度"三件套对照本篇表格落地 |
| 千万行以上、要同义词纠错高亮聚合 | 独立搜索引擎（ES/Meilisearch），数据库只存原文 |
| 只是子串匹配（SKU、用户名） | LIKE + trigram/前缀索引，不必上全文检索 |

## 动手实践：同一查询三方言落地

任务：建 `articles(id, title, body)`，造 5 行中英混合数据——

1. 在你手头的方言上建全文索引，搜一个词并拿到相关度列；
2. 把同一查询翻译成另外两个方言（可只写到纸面），对照本篇表格核对语法点；
3. 用 EXPLAIN/执行计划确认查询走了全文索引而不是全表扫；
4. （思考）把搜索词改成"该词的过去式/复数"，观察三方言语料行为差异（词形还原有无）。

<details>
<summary>参考实现（MySQL 8.0 版，先自己写再展开）</summary>

```sql
CREATE TABLE articles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200),
  body TEXT,
  FULLTEXT KEY idx_ft (title, body) WITH PARSER ngram
);

INSERT INTO articles (title, body) VALUES
('MySQL 全文索引', 'InnoDB 全文检索与 ngram 解析器'),
('PostgreSQL FTS', 'tsvector 与 GIN 索引的站内搜索实践'),
('搜索引擎选型', '何时从数据库全文迁移到 Elasticsearch');

-- 搜索与相关度
SELECT id, title,
       MATCH(title, body) AGAINST('全文 索引') AS relevance
FROM articles
WHERE MATCH(title, body) AGAINST('全文 索引')
ORDER BY relevance DESC;

-- 验证索引（不走全文索引会显示全表扫描）
EXPLAIN SELECT id FROM articles
WHERE MATCH(title, body) AGAINST('全文 索引');
-- type=fulltext, key=idx_ft
```

判读要点：相关度只在同一查询的结果集内有意义；n=2 的 ngram 下搜"索引"能命中"全文索引"，搜单字"引"则受 `ngram_token_size` 下限限制。
</details>

## 检验清单

- 能画出倒排索引的结构并解释 LIKE '%x%' 走不了 B-tree 的原因；
- 能把"必须 A、必须 B、排除 C、短语 D"翻译成三方言各自的布尔语法；
- 知道三方言中文分词的现状（ngram / zhparser·pg_jieba / word breaker）；
- 能区分"求召回"（QUERY EXPANSION/FREETEXT）与"求精确"（CONTAINS/布尔模式）的适用场景；
- 知道本篇与 mysql-260、postgresql-300 的分工。

## 下一步

- [MySQL 全文索引](/mysql/260-FullTextIndex)：FULLTEXT 的参数、n-gram 细节与 InnoDB 实现；
- [PG 全文检索](/postgresql/300-FullTextSearch)：tsvector/tsquery 工程化与中文扩展；
- [SQL JSON](/sql/300-SqlJson)：半结构化数据的另一条对照线。

## 参考与致谢

- MySQL 8.0 官方文档 InnoDB FULLTEXT Indexes / Natural Language Full-Text Searches（GPLv2 文档许可）：<https://dev.mysql.com/doc/refman/8.0/en/fulltext-search.html>
- PostgreSQL 官方文档 Chapter 12 Full Text Search（PostgreSQL Licence）：<https://www.postgresql.org/docs/current/textsearch.html>
- SQL Server 官方文档 Full-Text Search（Microsoft Docs，允许引用学习）：<https://learn.microsoft.com/sql/relational-databases/search/full-text-search>
- 本篇 PG/MySQL 段落部分素材迁移自旧篇 320-AdvancedQuery.md 并重写，三方言行为已对照各自官方文档核校。
