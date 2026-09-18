---
order: 320
title: KNN 向量索引：pgvector 与 AI 应用的相似度检索
module: 'postgresql'
category: 数据库
difficulty: advanced
description: pgvector 从零到生产：向量与嵌入的心智模型、三种距离算子、IVFFlat 与 HNSW 索引的取舍、召回率调参与"精确但全表扫"的兜底策略。
author: fanquanpp
updated: '2026-09-18'
related:
  - 'postgresql/220-IndexType'
  - 'postgresql/250-QueryOptimization'
  - 'postgresql/310-GeoSpatialObject'
  - 'roadmap/050-BackendPythonAIRoute'
prerequisites:
  - 'postgresql/220-IndexType'
  - 'postgresql/330-ExtensionModule'
---

## 前置知识

- PostgreSQL 扩展安装（[扩展模块](/postgresql/330-ExtensionModule)）；
- 有 AI 应用背景更佳（RAG 检索场景见 [Python 与 AI 路线](/roadmap/050-BackendPythonAIRoute)），本篇不假设你懂机器学习。

## 问题引入："语义相似"为什么难存难查

RAG（检索增强生成）类应用的核心动作：把文本变成向量（嵌入，embedding），语义相近的文本向量也相近，检索就是"找出离查询向量最近的 K 个"。两个工程难点：

1. **维度高**：主流嵌入是 768 到 3072 维浮点数组，B+ 树那种一维有序结构完全无能为力；
2. **精确最近邻代价爆炸**：暴力做法是逐行算距离再排序（O(N×D)），百万行数据一次查询要算几亿次乘加。

**pgvector** 扩展给出的答案是 PostgreSQL 一贯的套路：类型管存储（`vector` 列），索引管速度（IVFFlat/HNSW 两类近似索引），用**近似最近邻（ANN）**——牺牲一点召回率，换取几十倍的速度。

## 基础：建表、写入与三种距离

```sql
CREATE EXTENSION vector;

CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  content TEXT,
  embedding vector(1536)      -- 声明维度；写入时维度不符直接报错
);

-- 写入：向量以 JSON 数组字符串字面量表达
INSERT INTO documents (content, embedding) VALUES
  ('PostgreSQL 是关系型数据库', '[0.11, 0.02, 0.87, ...]'),
  ('今天天气不错',              '[0.91, 0.85, 0.03, ...]');
```

三种距离算子对应三种"相似"的数学定义，**选哪个必须与生成嵌入的模型对齐**（模型文档会写明它按什么距离训练）：

| 算子 | 距离 | 语义 | 常见场景 |
| --- | --- | --- | --- |
| `<=>` | 余弦距离 | 方向相似（不关心长度） | 文本嵌入最常用 |
| `<->` | L2 欧氏距离 | 空间直线距离 | 图像特征、坐标类 |
| `<#>` | 负内积 | 方向与幅度都算 | 推荐打分 |

```sql
-- 最近邻查询：与查询向量余弦最相近的 5 条
SELECT id, content, embedding <=> '[0.1, 0.2, ...]' AS dist
FROM documents
ORDER BY embedding <=> '[0.1, 0.2, ...]'
LIMIT 5;
```

这条查询**没有索引也能跑**——退化为全表逐行算距离。小表（几万行内）这样反而最准最快；索引是给大表准备的。

## IVFFlat：先聚类再查桶

```sql
-- 建索引（lists 建议为行数开立方，如 100 万行取 100）
CREATE INDEX idx_doc_ivf ON documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 查询时设置探测桶数（默认 1，太小召回差）
SET ivfflat.probes = 10;
```

原理：建索引时把全库向量**聚成 lists 个簇**；查询时只在与查询向量最近的 `probes` 个簇里找。速度与召回由 probes 一手调节——probes 越大越准越慢，设成 lists 值就退化为全表精确扫描。两个工程要点：**索引要在有数据后建**（聚类需要样本）；数据量剧烈增长后要 REINDEX 重建聚类。

## HNSW：跳表思想的多层图

```sql
CREATE INDEX idx_doc_hnsw ON documents
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

SET hnsw.ef_search = 100;   -- 查询时候选队列宽度
```

原理：把向量组织成多层近邻图，查询从顶层稀疏图快速"跳"到底层精细图——类似跳表的空间换时间。与 IVFFlat 的实质差异：

| | IVFFlat | HNSW |
| --- | --- | --- |
| 构建速度 | 快 | 慢 |
| 查询速度 | 中等 | 快 |
| 召回率 | 依赖 probes | 高且稳定 |
| 数据更新 | 分布漂移后需重建 | 支持增量插入 |
| 索引体积 | 小 | 大（构建慢的代价） |

**没有历史包袱就默认 HNSW**——构建慢是一次性的，查询质量与增量更新能力长期受益；IVFFlat 适合超大规模、写多读少、能接受周期性重建的场景。

## 动手环节：跑通一个迷你语义检索

```sql
-- 1. 建 4 维迷你向量表（手工造数据，理解机制不需要真模型）
CREATE TABLE mini_docs (id serial primary key, txt text, vec vector(4));
INSERT INTO mini_docs (txt, vec) VALUES
  ('数据库教程',   '[0.9, 0.8, 0.1, 0.2]'),
  ('数据库原理',   '[0.85, 0.9, 0.05, 0.1]'),
  ('红烧肉做法',   '[0.1, 0.2, 0.9, 0.8]'),
  ('糖醋排骨做法', '[0.15, 0.1, 0.85, 0.9]');

-- 2. 暴力查询（无索引）：查询向量接近"数据库"语义
SELECT txt, vec <=> '[0.88, 0.85, 0.1, 0.15]' AS dist
FROM mini_docs ORDER BY dist;
-- 数据库教程/原理 排前，菜谱排后——语义近邻生效

-- 3. 建 HNSW 索引后复测：计划出现 Index Scan using ... hnsw
CREATE INDEX ON mini_docs USING hnsw (vec vector_cosine_ops);
EXPLAIN SELECT txt FROM mini_docs ORDER BY vec <=> '[0.88, 0.85, 0.1, 0.15]' LIMIT 2;

-- 4. 召回率对照实验：把 ef_search 压到极小，观察结果是否漏掉该出现的行
SET hnsw.ef_search = 1;
SELECT txt FROM mini_docs ORDER BY vec <=> '[0.88, 0.85, 0.1, 0.15]' LIMIT 2;
SET hnsw.ef_search = 40;
SELECT txt FROM mini_docs ORDER BY vec <=> '[0.88, 0.85, 0.1, 0.15]' LIMIT 2;
```

第 4 步是理解"近似"的钥匙：同一个查询，ef_search=1 可能漏掉真正的第二名——**索引参数本质上是在"快"与"不漏"之间调旋钮**，生产上用评测集（一批已知正确答案的查询）量化召回率后再定参数。

## 生产注意事项

1. **维度即成本**：vector 每维 4 字节，1536 维一行约 6KB，千万行就是几十 GB——选嵌入模型时维度直接决定存储与索引体积，必要时考虑降维模型；
2. **距离类型要全链路一致**：建索引用 `vector_cosine_ops`，查询就必须用 `<=>`——算子与索引算子类不匹配时 pgvector 会**静默放弃索引**（EXPLAIN 里索引消失）；
3. **过滤条件的坑**：`WHERE category = 'x' ORDER BY embedding <=> q` 在过滤后剩很少行时，索引顺序扫描可能反而不划算——pgvector 迭代扫描已缓解大半，极端倾斜场景需要实测；
4. **边界认知**：pgvector 是"OLTP 库内的向量检索"，千万到亿级向量、超高 QPS 的专业检索场景，Milvus/Qdrant 等专用库仍有优势——先测 pgvector 上限再考虑引入新组件，多数应用到不了那个量级。

## 常见困惑

**"为什么我的查询没走索引？"**——高频三条：距离算子与索引算子类不一致；ORDER BY 的表达式与索引列定义不一致（如套了函数）；表太小，优化器判定全表扫更快（这是正确行为）。

**"近似检索漏掉了结果怎么办？"**——三档策略：调大 probes/ef_search（治标）；用评测集量化召回率后定参数（治本）；对精度敏感的业务用"ANN 粗筛 + 精确重排"两段式——先取 top 100，再精确计算重排取 top 10。

**"和 [PostGIS 空间检索](/postgresql/310-GeoSpatialObject) 什么关系？"**——思想同源（都是多维近邻 + 空间划分索引，PostGIS 的 `<->` KNN 操作符与 GiST 是雏形），数学对象不同（地理坐标 vs 高维语义空间）。理解了一个，另一个的索引直觉直接迁移。

## 检验清单

- 能解释"为什么 B+ 树与暴力计算都撑不起向量检索"，以及 ANN 的取舍本质；
- 知道三种距离算子的语义与"必须与嵌入模型对齐"的原则；
- 能对比 IVFFlat 与 HNSW 并给出默认选型理由；
- 完成迷你检索实验，亲眼见过 ef_search 对召回的影响与索引计划的出现。

## 下一步

向量扩展是 PostgreSQL"什么数据都能存"的一角，另一角是"什么数据源都能连"：进入 [FDW 外部数据包装器](/postgresql/350-FDWForeignDataWrapper)，在 SQL 里直接查远程库与 CSV 文件。
