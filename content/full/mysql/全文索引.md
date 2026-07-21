---
order: 56
title: 全文索引
module: mysql
category: MySQL
difficulty: intermediate
description: 'MySQL全文索引：FULLTEXT索引创建、自然语言模式、布尔模式、n-gram解析器与中文分词'
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/联合索引与最左前缀原则
  - mysql/索引下推
  - mysql/前缀索引
  - mysql/索引提示与强制索引
prerequisites:
  - mysql/语法速查
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
