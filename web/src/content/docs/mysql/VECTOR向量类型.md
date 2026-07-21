---
order: 91
title: VECTOR向量类型
module: mysql
category: MySQL
difficulty: advanced
description: 'MySQL VECTOR向量类型：向量存储、距离计算、AI嵌入与近似最近邻搜索'
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/索引与执行计划
  - mysql/MySQL9新特性与并行查询
  - mysql/JSON模式验证与聚合函数
  - mysql/复制与高可用
prerequisites:
  - mysql/语法速查
---

## 1. VECTOR 类型概述

MySQL 9.0 引入 VECTOR 类型，用于存储和检索高维向量，支持 AI/ML 应用中的嵌入向量搜索。

## 2. 创建向量列

```sql
-- 创建包含向量列的表
CREATE TABLE documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content TEXT,
    embedding VECTOR(1536)  -- 1536维向量（OpenAI嵌入）
);

-- 插入向量数据
INSERT INTO documents (content, embedding) VALUES (
    'MySQL is a relational database',
    STRING_TO_VECTOR('[0.1, 0.2, 0.3, ...]')
);
```

## 3. 向量函数

### 3.1 距离计算

```sql
-- 欧几里得距离（L2距离）
SELECT id, content,
    DISTANCE(embedding, STRING_TO_VECTOR('[0.1, 0.2, ...]')) AS dist
FROM documents
ORDER BY dist ASC
LIMIT 10;

-- 余弦相似度
SELECT id, content,
    DISTANCE(embedding, STRING_TO_VECTOR('[0.1, 0.2, ...]'), 'COSINE') AS similarity
FROM documents
ORDER BY similarity DESC
LIMIT 10;
```

### 3.2 向量转换

```sql
-- 字符串转向量
SELECT STRING_TO_VECTOR('[0.1, 0.2, 0.3]');

-- 向量转字符串
SELECT VECTOR_TO_STRING(embedding) FROM documents LIMIT 1;
```

## 4. 向量索引

```sql
-- 创建向量索引（近似最近邻搜索）
ALTER TABLE documents ADD VECTOR INDEX idx_embedding (embedding)
    WITH (DISTANCE = 'COSINE', M = 16, EF_BUILD = 100);

-- 使用向量索引搜索
SELECT id, content,
    DISTANCE(embedding, STRING_TO_VECTOR('[0.1, 0.2, ...]'), 'COSINE') AS dist
FROM documents
ORDER BY dist ASC
LIMIT 10;
-- 自动使用向量索引加速
```

## 5. 应用场景

```sql
-- 语义搜索
-- 1. 使用嵌入模型生成查询向量
-- 2. 在数据库中搜索最近邻向量
-- 3. 返回语义相关的文档

-- 推荐系统
-- 1. 用户偏好向量化
-- 2. 商品特征向量化
-- 3. 基于向量相似度推荐

-- 图像搜索
-- 1. 图像特征提取为向量
-- 2. 基于向量距离搜索相似图像
```
