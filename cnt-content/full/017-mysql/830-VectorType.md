---
order: 830
title: VECTOR 向量类型
module: 'mysql'
category: 数据库
difficulty: advanced
description: MySQL VECTOR向量类型：声明与维度上限、STRING_TO_VECTOR与VECTOR_TO_STRING、社区版与HeatWave的能力边界
author: fanquanpp
updated: '2026-09-12'
related:
  - 'mysql/330-MySQLIndexExecutionPlan'
  - 'mysql/820-MySQL9NewFeatures'
  - 'mysql/800-JSONSchemaValidationAggregate'
  - 'mysql/810-JSONTypeJSONTable'
prerequisites:
  - 'mysql/070-MySQLDataTypeConstraint'
---

## 1. VECTOR 类型定位

MySQL 9.0 引入 `VECTOR` 类型（创新版特性），用于把 AI 模型产出的**嵌入向量**
（embedding）直接存进数据库，省去"向量塞 JSON 字符串"的土办法。
先讲清版本边界，避免最常见的误解：

| 能力                         | 社区版 9.x | HeatWave（OCI 商业服务） |
| ---------------------------- | ---------- | ------------------------ |
| VECTOR 列存储                | 有         | 有                       |
| STRING_TO_VECTOR 等转换函数  | 有         | 有                       |
| DISTANCE 距离函数            | **无**     | 有                       |
| 向量索引（近似最近邻检索）   | **无**     | 有                       |

一句话：社区版能"**存**"向量并原样取出，不能在 SQL 里"**搜**"相似度；
检索要么应用层算，要么用 HeatWave / 专业向量库。

## 2. 声明与读写

```sql
-- 声明：VECTOR(N)，N 为维度（可省略，省略时不限维）；上限 16383 维
CREATE TABLE documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content TEXT,
    embedding VECTOR(1536)          -- 例如 OpenAI 嵌入 1536 维
);

-- 写入：字符串字面量（JSON 数组形式）自动转向量；推荐显式转换
INSERT INTO documents (content, embedding) VALUES (
    'MySQL is a relational database',
    STRING_TO_VECTOR('[0.1, 0.2, 0.3, ...]')
);

-- 读取：向量以二进制存储，直接 SELECT 出来是二进制串，需转字符串
SELECT id, content,
       VECTOR_TO_STRING(embedding) AS embedding_json
FROM documents LIMIT 1;

-- 维度
SELECT VECTOR_DIM(embedding) FROM documents LIMIT 1;
```

存储成本是决策因素：**每个分量 4 字节浮点**，1536 维一行约 6KB——
百万行向量表的体量与 IO 都要按这个量级估算，不是"存个字符串"的开销。

## 3. 常见误区

```sql
-- 误区 1：以为社区版能建向量索引（以下语句仅 HeatWave 可用）
-- ALTER TABLE documents ADD VECTOR INDEX idx_emb (embedding);

-- 误区 2：以为有 DISTANCE 函数（社区版报"函数不存在"）
-- SELECT DISTANCE(embedding, STRING_TO_VECTOR('[...]'), 'COSINE') FROM documents;

-- 误区 3：直接 SELECT embedding 期待可读文本
-- 实际返回二进制，展示层必须过 VECTOR_TO_STRING
```

## 4. 社区版的现实用法

```text
方案 A（小数据量）：VECTOR 列存向量 + 应用层计算相似度
  SELECT id, VECTOR_TO_STRING(embedding) FROM documents;  -- 取回后在应用里算余弦

方案 B（中数据量）：向量存外部向量库（Milvus/Qdrant/ES 等），MySQL 只存业务字段与外键

方案 C（Oracle 技术栈）：升级到 HeatWave，使用 DISTANCE + 向量索引做库内检索
```

## 5. 小结

- 初学者要点：VECTOR 是 9.0 起的"存向量"类型，STRING_TO_VECTOR /
  VECTOR_TO_STRING / VECTOR_DIM 三个函数社区版可用；每维 4 字节，成本要算清。
- 进阶注意：DISTANCE 与向量索引是 HeatWave 专属，社区版不要照抄网上
  `ADD VECTOR INDEX` 示例；选型前先确认自己的运行环境是否包含 HeatWave。
