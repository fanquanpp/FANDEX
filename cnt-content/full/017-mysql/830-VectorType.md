---
order: 830
title: VECTOR 向量类型：MySQL 里的嵌入向量
module: 'mysql'
category: 数据库
difficulty: advanced
description: MySQL 9 VECTOR 类型：声明与存储成本、三个转换函数、社区版与 HeatWave 的能力边界、应用层相似度检索的完整工作流与选型对照。
author: fanquanpp
updated: '2026-09-18'
related:
  - 'mysql/820-MySQL9NewFeatures'
  - 'postgresql/320-KNNVectorIndex'
  - 'mysql/810-JSONTypeJSONTable'
  - 'roadmap/050-BackendPythonAIRoute'
prerequisites:
  - 'mysql/070-MySQLDataTypeConstraint'
  - 'mysql/820-MySQL9NewFeatures'
---

## 前置知识

- 新特性版本策略（[MySQL 9 新特性](/mysql/820-MySQL9NewFeatures)）——VECTOR 是 9.0 创新版引入的类型；
- AI 应用背景（嵌入向量的来历见 [Python 与 AI 路线](/roadmap/050-BackendPythonAIRoute)）有助于理解用途，但不强制。

## 问题引入：向量塞 JSON 的土办法为什么不行

AI 应用要把文本/图片的嵌入向量（embedding，几百到几千个浮点数）持久化，最常见土办法是塞进 JSON 字符串列。代价：体积膨胀（JSON 文本比二进制浮点大数倍）、读取后要解析、无类型约束（维度错了存进去才发现）。**MySQL 9.0 的 VECTOR 类型**把它变成一等公民：二进制紧凑存储 + 维度校验 + 专用转换函数。

先立最重要的认知——**版本能力边界**（这是 VECTOR 相关网上资料最大的误导源）：

| 能力 | 社区版 9.x | HeatWave（OCI 商业服务） |
| --- | --- | --- |
| VECTOR 列存储与读取 | 有 | 有 |
| 转换函数（STRING_TO_VECTOR 等） | 有 | 有 |
| DISTANCE 距离函数 | **无** | 有 |
| 向量索引（近似最近邻） | **无** | 有 |

一句话：社区版能"**存**"，不能在 SQL 里"**搜**"；检索要么应用层自己算，要么上 HeatWave 或专业向量库。

## 声明与读写

```sql
-- VECTOR(N)：N 为维度；上限 16383 维。写入时维度不符直接报错（类型价值所在）
CREATE TABLE documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  content TEXT,
  embedding VECTOR(1536)          -- 对齐主流嵌入模型的 1536 维
);

-- 写入：JSON 数组形式的字符串，经 STRING_TO_VECTOR 转为二进制向量
INSERT INTO documents (content, embedding) VALUES (
  'MySQL is a relational database',
  STRING_TO_VECTOR('[0.1, 0.2, 0.3, ...]')
);

-- 读取：二进制向量必须转字符串才能看
SELECT id, content,
       VECTOR_TO_STRING(embedding) AS embedding_json,
       VECTOR_DIM(embedding) AS dims
FROM documents LIMIT 1;
```

**存储成本要算在前面**：每个分量 4 字节浮点，1536 维一行约 6KB，加上 JSON 元数据与页开销实际更高——百万行向量表就是数十 GB 级别，容量规划、内存命中率、备份时长都按这个量级估。选嵌入模型时维度直接决定这笔账（768 维比 3072 维省 4 倍）。

## 社区版的现实检索方案

既然社区版没有距离函数与索引，"找最相似的 K 条"怎么落地？三档方案按数据量选：

```text
方案 A（万行级）：全量取回 + 应用层算相似度
  SELECT id, content, VECTOR_TO_STRING(embedding) FROM documents;
  应用里与查询向量算余弦取 top K。零额外组件，几万行内完全够用

方案 B（十万行以上）：向量出库，MySQL 只管业务字段
  向量存专业向量库（pgvector/Milvus/Qdrant/ES），
  MySQL 存业务数据并以主键关联。两段式：向量库召回 → MySQL 补全业务字段

方案 C（Oracle 技术栈）：HeatWave
  DISTANCE 函数 + 向量索引，库内完成全部检索
```

方案 A 的应用层余弦相似度只需几行（Python 示意）：

```python
import json, math

def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb)

rows = query("SELECT id, VECTOR_TO_STRING(embedding) v FROM documents")
q = embed("数据库入门")            # 调嵌入模型得到查询向量
top = sorted(rows, key=lambda r: -cosine(q, json.loads(r["v"])))[:5]
```

这个工作流的完整版（含 RAG 场景、召回率评测）在 [PostgreSQL KNN 篇](/postgresql/320-KNNVectorIndex) 有对位展开——pgvector 的索引与算子正是 MySQL 社区版缺失的那一半。

## 动手环节：社区版全流程体验

```sql
-- 1. 建表与写入（4 维迷你向量，机制与 1536 维完全一致）
CREATE TABLE vec_demo (
  id INT AUTO_INCREMENT PRIMARY KEY,
  txt VARCHAR(100),
  vec VECTOR(4)
);
INSERT INTO vec_demo (txt, vec) VALUES
  ('数据库教程', STRING_TO_VECTOR('[0.9, 0.8, 0.1, 0.2]')),
  ('数据库原理', STRING_TO_VECTOR('[0.85, 0.9, 0.05, 0.1]')),
  ('红烧肉做法', STRING_TO_VECTOR('[0.1, 0.2, 0.9, 0.8]'));

-- 2. 维度校验是类型级的（写入 5 维直接报错）
-- INSERT INTO vec_demo (txt, vec)
-- VALUES ('坏数据', STRING_TO_VECTOR('[1,2,3,4,5]'));
-- ERROR 3854 (HY000): Dimension mismatch

-- 3. 读回验证
SELECT txt, VECTOR_TO_STRING(vec), VECTOR_DIM(vec) FROM vec_demo;

-- 4. 亲测社区版边界：距离函数不存在
-- SELECT DISTANCE(vec, STRING_TO_VECTOR('[0.9,0.8,0.1,0.2]'), 'COSINE') FROM vec_demo;
-- ERROR 1305: FUNCTION DISTANCE does not exist —— 印证能力边界表

-- 5. 网上示例的陷阱复现：向量索引语句同样不可用
-- ALTER TABLE vec_demo ADD VECTOR INDEX ((vec));
-- 同样报错——社区版读到这段语法的教程请直接关闭
```

第 2 步与第 4 步分别验证了 VECTOR 类型的"有所为"（维度约束）与"有所不为"（检索）——把能力边界亲手戳一遍，胜过背十遍对照表。

## 常见困惑

**"为什么不直接用 JSON 数组列？"**——三项差距：体积（4 字节二进制 vs 每个数 10+ 字符的文本）；类型安全（VECTOR 在写入时校验维度，JSON 列什么都收）；语义（VECTOR_TO_STRING/VECTOR_DIM 等配套函数，JSON 要自己解析）。检索能力上两者半斤八两（都得应用层算）——所以正确对比是"VECTOR vs JSON"选存储，"MySQL vs 向量库"选检索。

**"MySQL 会把向量索引下放到社区版吗？"**—— Oracle 的商业策略上向量检索（HeatWave）与 MySQL HeatWave 产品深度绑定，社区版短期内大概率维持"只存不搜"。做技术选型按现状评估，别按路线图赌。

**"该选 MySQL+向量库 还是直接 PostgreSQL+pgvector？"**——若项目本来就以 MySQL 为主、向量规模在 pgvector 舒适区之外，方案 B（MySQL 业务库 + 独立向量库）干净直接；新项目且向量检索是核心能力，[pgvector](/postgresql/320-KNNVectorIndex) 把存储与检索收在一个库里，工程链路更短。判据是"检索在业务里的权重"，不是数据库偏好之争。

## 检验清单

- 能默写社区版与 HeatWave 的能力边界表，并说出它为什么是 VECTOR 第一知识点；
- 会声明带维度的 VECTOR 列并完成三个转换函数的读写闭环；
- 算得清 1536 维百万行的存储账，理解维度选择即容量选择；
- 完成社区版实验：维度校验报错、DISTANCE 报错、索引语句报错三连验证；
- 能按数据量在应用层余弦/独立向量库/HeatWave 三档方案中给出选型。

## 下一步

向量只是 MySQL 9 的特性之一：回看 [MySQL 9 新特性总览](/mysql/820-MySQL9NewFeatures) 补全版本演进全景；AI 检索的完整工程（RAG、评测、成本）则继续 [Python 与 AI 路线](/roadmap/050-BackendPythonAIRoute)。
