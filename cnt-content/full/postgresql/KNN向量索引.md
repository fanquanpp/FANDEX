---
order: 57
title: KNN向量索引
module: postgresql
category: PostgreSQL
difficulty: advanced
description: 'PostgreSQL KNN向量索引：pgvector扩展、IVFFlat、HNSW索引与近似最近邻搜索'
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/索引类型
  - postgresql/覆盖索引与部分索引
  - postgresql/查询优化
  - postgresql/分区表
prerequisites:
  - postgresql/概述与安装配置
---

## 1. pgvector 概述

pgvector 是 PostgreSQL 的向量相似度搜索扩展，支持高维向量的存储和索引。

## 2. 安装与配置

```sql
-- 安装扩展
CREATE EXTENSION vector;

-- 创建向量列
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    content TEXT,
    embedding vector(1536)
);
```

## 3. 向量操作

```sql
-- 插入向量
INSERT INTO documents (content, embedding)
VALUES ('hello world', '[0.1, 0.2, 0.3, ...]');

-- 余弦距离
SELECT id, content, embedding <=> '[0.1, 0.2, ...]'::vector AS distance
FROM documents
ORDER BY distance
LIMIT 10;

-- L2 距离
SELECT id, embedding <-> '[0.1, 0.2, ...]'::vector AS distance
FROM documents
ORDER BY distance
LIMIT 10;

-- 内积
SELECT id, embedding <#> '[0.1, 0.2, ...]'::vector AS distance
FROM documents
ORDER BY distance
LIMIT 10;
```

## 4. IVFFlat 索引

```sql
-- 创建 IVFFlat 索引
CREATE INDEX idx_documents_embedding_ivfflat
ON documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 查询时设置探测列表数
SET ivfflat.probes = 10;

-- 适合：中等规模数据集
-- 需要先有数据再创建索引（需要聚类中心）
```

## 5. HNSW 索引

```sql
-- 创建 HNSW 索引
CREATE INDEX idx_documents_embedding_hnsw
ON documents USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 查询时设置搜索宽度
SET hnsw.ef_search = 100;

-- 适合：大规模数据集
-- 查询速度更快，索引构建更慢
-- 索引更大
```

## 6. 索引选择

| 特性     | IVFFlat          | HNSW     |
| -------- | ---------------- | -------- |
| 构建速度 | 快               | 慢       |
| 查询速度 | 中等             | 快       |
| 召回率   | 依赖 probes 参数 | 高       |
| 索引大小 | 较小             | 较大     |
| 数据更新 | 需要重建         | 增量更新 |
