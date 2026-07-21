---
title: 嵌入
description: '理解嵌入和向量表示，包括 Word2Vec、句子嵌入、相似度计算和向量索引'
module: llm
difficulty: intermediate
tags:
  - embeddings
  - Word2Vec
  - 向量搜索
  - HNSW
  - 相似度
related:
  - llm/量化
  - llm/模型上下文协议
  - llm/上下文工程
  - llm/少样本与思维链
prerequisites:
  - llm/安全护栏
---

# 嵌入

> 嵌入将文本转换为固定长度的向量——语义相似的文本在向量空间中距离更近。这是语义搜索、RAG 和推荐系统的基础。

**类型：** 构建
**语言：** Python
**前置条件：** Phase 11 Lesson 01（提示工程）
**预计时间：** ~60 分钟

## 学习目标

- 理解嵌入的直觉：语义相似 → 向量相近
- 掌握余弦相似度、欧氏距离等度量方法
- 理解 HNSW 等近似最近邻索引
- 掌握分块策略和嵌入模型的选择

## 嵌入的直觉

```
"猫坐在垫子上" → [0.12, -0.34, 0.56, ..., 0.78]  (1536维)
"小猫趴在地毯上" → [0.11, -0.33, 0.55, ..., 0.77]  (很近!)
"股票市场下跌"   → [-0.45, 0.67, -0.23, ..., 0.12]  (很远)
```

## 相似度计算

```python
import numpy as np


def cosine_similarity(a, b):
    """余弦相似度"""
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))


def euclidean_distance(a, b):
    """欧氏距离"""
    return np.linalg.norm(a - b)


def dot_product_similarity(a, b):
    """点积相似度（已归一化的向量等价于余弦相似度）"""
    return np.dot(a, b)
```

## 嵌入模型

```python
from openai import OpenAI

client = OpenAI()


def get_embeddings(texts, model="text-embedding-3-small"):
    """获取文本嵌入"""
    response = client.embeddings.create(input=texts, model=model)
    return [item.embedding for item in response.data]


# 语义搜索示例
def semantic_search(query, documents, top_k=5):
    """语义搜索"""
    # 嵌入查询和文档
    query_emb = get_embeddings([query])[0]
    doc_embs = get_embeddings(documents)

    # 计算相似度
    scores = [cosine_similarity(query_emb, doc_emb) for doc_emb in doc_embs]

    # 排序
    ranked = sorted(zip(documents, scores), key=lambda x: x[1], reverse=True)
    return ranked[:top_k]
```

## 文本分块

```python
def chunk_text(text, chunk_size=500, overlap=50):
    """按字符数分块"""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start += chunk_size - overlap
    return chunks


def chunk_by_sentences(text, max_chunk_size=500):
    """按句子分块"""
    import re
    sentences = re.split(r'(?<=[.!?])\s+', text)

    chunks = []
    current_chunk = ""

    for sentence in sentences:
        if len(current_chunk) + len(sentence) > max_chunk_size and current_chunk:
            chunks.append(current_chunk.strip())
            current_chunk = sentence
        else:
            current_chunk += " " + sentence

    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks
```

## HNSW 索引

HNSW（Hierarchical Navigable Small World）是最高效的近似最近邻索引之一：

```python
class SimpleHNSW:
    """简化的 HNSW 索引"""

    def __init__(self, dim=1536, M=16, ef_construction=200):
        self.dim = dim
        self.M = M
        self.ef_construction = ef_construction
        self.vectors = []
        self.metadata = []

    def add(self, vector, metadata=None):
        """添加向量"""
        self.vectors.append(np.array(vector))
        self.metadata.append(metadata)

    def search(self, query, top_k=5):
        """搜索最近邻"""
        query = np.array(query)
        scores = [cosine_similarity(query, v) for v in self.vectors]
        ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
        return [(self.metadata[i], score) for i, score in ranked[:top_k]]
```

生产环境推荐使用专业库：`faiss`、`qdrant-client`、`pinecone` 或 `chromadb`。

## 关键术语

| 术语       | 通俗说法       | 实际含义                                     |
| ---------- | -------------- | -------------------------------------------- |
| 嵌入       | "文本向量"     | 将文本映射为固定长度的数值向量，保留语义信息 |
| 余弦相似度 | "方向相似度"   | 两个向量夹角的余弦值，衡量方向相似性         |
| HNSW       | "快速近邻搜索" | 分层可导航小世界图，高效的近似最近邻索引     |
| 分块       | "切文本"       | 将长文本分割为适合嵌入模型处理的片段         |

## 延伸阅读

- [Mikolov et al., 2013 -- "Efficient Estimation of Word Representations in Vector Space"](https://arxiv.org/abs/1301.3781) -- Word2Vec 论文
- [Malkov & Yashunin, 2018 -- "Efficient and robust approximate nearest neighbor search using HNNSW"](https://arxiv.org/abs/1603.09320) -- HNSW 论文
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings) -- OpenAI 嵌入模型文档
