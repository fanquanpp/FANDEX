---
order: 280
title: 全文索引
module: 'mysql'
category: 数据库
difficulty: intermediate
description: MySQL全文索引：FULLTEXT索引创建、自然语言模式、布尔模式、n-gram解析器与中文分词
author: fanquanpp
updated: '2026-11-17'
related:
  - 'mysql/230-CompositeIndexLeftmostPrefixPrinciple'
  - 'mysql/250-IndexConditionPushdown'
  - 'mysql/240-PrefixIndex'
  - 'mysql/270-IndexHintForceIndex'
prerequisites:
  - 'mysql/160-View'
---

## 1. 全文索引概述

MySQL 全文索引（FULLTEXT Index）支持对文本内容进行全文检索，InnoDB 和 MyISAM 均支持。

## 2. 创建全文索引

```sql
-- 创建表时定义
CREATE TABLE articles (
    id      INT AUTO_INCREMENT PRIMARY KEY,
    title   VARCHAR(200),
    content TEXT,
    FULLTEXT INDEX ft_title_content (title, content)
) ENGINE = InnoDB;

-- 在已有表上创建
ALTER TABLE articles ADD FULLTEXT INDEX ft_content (content);

-- 使用 n-gram 解析器（支持中文）
ALTER TABLE articles ADD FULLTEXT INDEX ft_content (content)
    WITH PARSER ngram;
```

## 3. 搜索模式

### 3.1 自然语言模式

```sql
-- 默认模式，按相关性排序
SELECT * FROM articles
WHERE MATCH(title, content) AGAINST('数据库 索引');

-- 获取相关性分数
SELECT *, MATCH(title, content) AGAINST('数据库 索引') AS score
FROM articles
WHERE MATCH(title, content) AGAINST('数据库 索引')
ORDER BY score DESC;
```

### 3.2 布尔模式

```sql
-- 支持操作符
SELECT * FROM articles
WHERE MATCH(title, content) AGAINST('+MySQL -索引' IN BOOLEAN MODE);

-- 操作符说明：
-- +  必须包含
-- -  必须不包含
-- 无  可选，包含则提高相关性
-- >  提高权重
-- <  降低权重
-- *  通配符（前缀匹配）
-- "  短语匹配
-- () 分组
-- ~  取反（降低相关性）

-- 短语匹配
SELECT * FROM articles
WHERE MATCH(content) AGAINST('"MySQL索引优化"' IN BOOLEAN MODE);

-- 前缀匹配
SELECT * FROM articles
WHERE MATCH(content) AGAINST('数据*' IN BOOLEAN MODE);
```

### 3.3 查询扩展模式

```sql
-- 两阶段搜索：先搜关键词，再用结果中的词扩展搜索
SELECT * FROM articles
WHERE MATCH(content) AGAINST('数据库' WITH QUERY EXPANSION);
```

## 4. n-gram 解析器

```sql
-- 中文分词支持
-- ngram_token_size = 2（默认，双字分词）

CREATE TABLE chinese_articles (
    id      INT AUTO_INCREMENT PRIMARY KEY,
    title   VARCHAR(200),
    content TEXT,
    FULLTEXT INDEX ft_content (content) WITH PARSER ngram
) ENGINE = InnoDB;

-- 搜索中文
SELECT * FROM chinese_articles
WHERE MATCH(content) AGAINST('数据库' IN NATURAL LANGUAGE MODE);
```

## 5. 限制与注意事项

```sql
-- 最小词长度：innodb_ft_min_token_size = 3（默认）
-- ngram 时由 ngram_token_size 决定

-- 全文索引不支持前缀索引
-- 全文索引列不支持排序
-- 全文索引不支持 % 通配符
-- 建议在数据导入完成后再创建全文索引
```

## 全文索引创建

**基本写法：建表时创建全文索引**
`CREATE TABLE <表名> (... FULLTEXT KEY <索引名>(<列1>[, <列2>...])) [WITH PARSER <解析器>];`

```sql
-- 创建带中文全文索引的文章表（需 ngram 解析器支持中文）
CREATE TABLE articles (
  id BIGINT PRIMARY KEY,
  title VARCHAR(200),
  body TEXT,
  FULLTEXT KEY ft_title_body (title, body) WITH PARSER ngram
) ENGINE = InnoDB;
```

**基本写法：为已有表添加全文索引**
`CREATE FULLTEXT INDEX <索引名> ON <表名>(<列>[, <列>...]) [WITH PARSER <解析器>];`

```sql
-- 为 body 列添加全文索引
CREATE FULLTEXT INDEX ft_body ON articles(body) WITH PARSER ngram;
```

**基本写法：ALTER 添加全文索引**
`ALTER TABLE <表名> ADD FULLTEXT INDEX <索引名>(<列>[, <列>...]) [WITH PARSER <解析器>];`

```sql
-- 通过 ALTER 添加复合全文索引
ALTER TABLE articles
ADD FULLTEXT INDEX ft_title_body (title, body) WITH PARSER ngram;
```

---

## 全文搜索查询

**基本写法：MATCH ... AGAINST 自然语言搜索**
`SELECT ... WHERE MATCH(<列>) AGAINST('<关键词>')`

```sql
-- 自然语言模式搜索（默认）
SELECT id, title, MATCH(title, body) AGAINST('数据库') AS relevance
FROM articles
WHERE MATCH(title, body) AGAINST('数据库')
ORDER BY relevance DESC;
```

**基本写法：布尔模式搜索**
`SELECT ... WHERE MATCH(<列>) AGAINST('<表达式>' IN BOOLEAN MODE)`

```sql
-- 布尔模式：+必须包含，-排除，*通配
SELECT * FROM articles
WHERE MATCH(title, body) AGAINST('+MySQL -Oracle' IN BOOLEAN MODE);
-- 包含任意一个词
SELECT * FROM articles
WHERE MATCH(title, body) AGAINST('MySQL PostgreSQL' IN BOOLEAN MODE);
-- 前缀匹配
SELECT * FROM articles
WHERE MATCH(title, body) AGAINST('data*' IN BOOLEAN MODE);
```

**基本写法：查询扩展模式**
`SELECT ... WHERE MATCH(<列>) AGAINST('<关键词>' WITH QUERY EXPANSION)`

```sql
-- 查询扩展：自动扩展相关词进行二次搜索（召回率高但精度低）
SELECT * FROM articles
WHERE MATCH(title, body) AGAINST('database' WITH QUERY EXPANSION);
```

---

## ngram 中文解析器

**基本写法：ngram 分词配置**
`SET GLOBAL ngram_token_size = <数值>;`

```sql
-- 查看 ngram 分词长度（默认 2，需在配置文件设置）
SHOW VARIABLES LIKE 'ngram_token_size';
```

**基本写法：配置文件设置 ngram**
`ngram_token_size = 2`

```ini
# my.cnf 中设置 ngram 分词长度（重启生效）
[mysqld]
ngram_token_size = 2
```

**基本写法：ngram 布尔搜索中文**
`SELECT ... WHERE MATCH(<列>) AGAINST('<中文词>' IN BOOLEAN MODE)`

```sql
-- ngram 模式下中文搜索（"数据库"会被切分为"数据""据库"）
SELECT id, title FROM articles
WHERE MATCH(title, body) AGAINST('+数据 +据库' IN BOOLEAN MODE);
```

---

## 索引维护

**基本写法：查看全文索引**
`SHOW INDEX FROM <表名> WHERE Index_type = 'FULLTEXT';`

```sql
-- 查看表的全文索引
SHOW INDEX FROM articles WHERE Index_type = 'FULLTEXT';
```

**基本写法：删除全文索引**
`ALTER TABLE <表名> DROP INDEX <索引名>;`

```sql
-- 删除全文索引
ALTER TABLE articles DROP INDEX ft_title_body;
-- 或使用 DROP INDEX
DROP INDEX ft_body ON articles;
```

**基本写法：重建全文索引**
`ALTER TABLE <表名> DROP INDEX <索引名>, ADD FULLTEXT INDEX <索引名>(<列>) WITH PARSER <解析器>;`

```sql
-- 重建全文索引（数据变更后统计信息更新）
ALTER TABLE articles
DROP INDEX ft_body,
ADD FULLTEXT INDEX ft_body (body) WITH PARSER ngram;
```

---

## 布尔模式运算符

**基本写法：运算符速查**
`AGAINST('<+包含> <-排除> <可选> "<短语>" <前缀>*' IN BOOLEAN MODE)`

```sql
-- + 包含该词
MATCH(body) AGAINST('+MySQL' IN BOOLEAN MODE)
-- - 排除该词
MATCH(body) AGAINST('-Oracle' IN BOOLEAN MODE)
-- 无符号：该词可选，相关性更高
MATCH(body) AGAINST('MySQL 性能' IN BOOLEAN MODE)
-- "短语"：完整匹配短语
MATCH(body) AGAINST('"full text search"' IN BOOLEAN MODE)
-- * 前缀通配（必须 3 字符以上）
MATCH(body) AGAINST('opti*' IN BOOLEAN MODE)
-- () 分组
MATCH(body) AGAINST('+MySQL +(优化 调优)' IN BOOLEAN MODE)
-- ~ 词之间距离（接近度）
MATCH(body) AGAINST('MySQL~性能' IN BOOLEAN MODE)
```

**基本写法：相关性排序**
`SELECT MATCH(<列>) AGAINST('<词>') AS <相关度> FROM <表> ORDER BY <相关度> DESC`

```sql
-- 返回相关性分数并排序
SELECT
  id,
  title,
  MATCH(title, body) AGAINST('数据库 优化') AS score
FROM articles
WHERE MATCH(title, body) AGAINST('数据库 优化' IN BOOLEAN MODE)
ORDER BY score DESC
LIMIT 20;
```

## 教学自检（先遮住代码自己写，再对照）

遮码自检法：先只读题干，自己写/自己答，再展开参考答案对照。

1. 概念自问：`LIKE '%数据库%'` 与 `MATCH ... AGAINST` 都是"搜文本"，为什么生产全文检索要走全文索引？

参考答案（先自己答，再对照）：前置 % 的 LIKE 无法用 B+ 树索引（索引按前缀有序），必然全表扫描；全文索引是倒排索引——预先把词映射到文档列表，检索时直接查词项，代价与命中词的文档数相关而不是与表大小相关。LIKE 胜在实现零成本，全文索引胜在规模。

2. 概念自问：中文为什么必须 `WITH PARSER ngram`？`ngram_token_size` 的默认值与含义是什么？

参考答案（先自己答，再对照）：默认解析器按空格/标点分词，而中文没有空格，整句会被当成一个"词"进不了倒排索引——搜索等于失效。ngram 解析器把文本切成固定长度滑窗（默认 `ngram_token_size = 2`，即双字分词），"数据库优化"被切成"数据 据库 库优 优化"。词切得越细召回越高、索引越大，2 是实践平衡点。

3. 判断题：自然语言模式下搜"MySQL"，只要命中行就一定全部返回。

参考答案（先自己答，再对照）：不一定。自然语言模式有 50% 阈值：某个词出现在超过一半的行里，会被当作"停用词"处理而不返回结果（MyISAM 明确生效；InnoDB 相关性排序也会淹没高频词）。需要精确控制"必含/排除/短语"时要用布尔模式（BOOLEAN MODE），它没有 50% 规则。

4. 概念自问：`innodb_ft_min_token_size = 3`（默认）意味着什么？为什么建议"数据导入完成后再建全文索引"？

参考答案（先自己答，再对照）：长度小于 3 的词不进倒排索引——搜两个字（如"海边"）在默认配置下查不到，要么调小该参数要么用 ngram（它有自己的 token_size）。建索引排在导数之后，是因为全文索引写放大明显：边导边建时每行都要做分词与倒排更新，导入完一次性建索引的总成本低得多。
