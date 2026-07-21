---
order: 65
title: 全文检索
module: postgresql
category: PostgreSQL
difficulty: advanced
description: PostgreSQL全文检索：tsvector、tsquery、GIN索引、排名与多语言支持
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/MERGE语句增强
  - postgresql/JSON表格函数
  - postgresql/地理空间对象
  - postgresql/存储过程与函数
prerequisites:
  - postgresql/概述与安装配置
---

## 1. 全文检索概述

PostgreSQL 内置全文检索功能，基于 tsvector（文档向量）和 tsquery（查询向量）。

## 2. tsvector 与 tsquery

```sql
-- 文本转向量
SELECT to_tsvector('english', 'The quick brown fox jumps over the lazy dog');
-- 'brown':3 'dog':9 'fox':4 'jumps':5 'lazi':8 'quick':2

-- 查询转向量
SELECT to_tsquery('english', 'quick & fox');
-- 'quick' & 'fox'

-- 匹配操作符 @@
SELECT * FROM articles
WHERE to_tsvector('english', content) @@ to_tsquery('english', 'database & index');
```

## 3. GIN 索引

```sql
-- 创建 GIN 全文索引
CREATE INDEX idx_articles_fts ON articles
USING GIN (to_tsvector('english', content));

-- 使用触发器自动更新 tsvector 列
ALTER TABLE articles ADD COLUMN fts tsvector
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,''))) STORED;

CREATE INDEX idx_articles_fts ON articles USING GIN (fts);

-- 查询
SELECT * FROM articles WHERE fts @@ to_tsquery('english', 'database & index');
```

## 4. 排名

```sql
-- ts_rank：基于词频排名
SELECT title, ts_rank(fts, query) AS rank
FROM articles, to_tsquery('english', 'database') query
WHERE fts @@ query
ORDER BY rank DESC;

-- ts_rank_cd：覆盖密度排名
SELECT title, ts_rank_cd(fts, query) AS rank
FROM articles, to_tsquery('english', 'database') query
WHERE fts @@ query
ORDER BY rank DESC;
```

## 5. 中文全文检索

```sql
-- 安装 zhparser 扩展
CREATE EXTENSION zhparser;

-- 创建中文配置
CREATE TEXT SEARCH CONFIGURATION zh (PARSER = zhparser);
ALTER TEXT SEARCH CONFIGURATION zh ADD MAPPING FOR n,v,a,i,e,l WITH simple;

-- 使用中文配置
SELECT to_tsvector('zh', '数据库索引优化');
CREATE INDEX idx_articles_zh ON articles USING GIN (to_tsvector('zh', content));
```
