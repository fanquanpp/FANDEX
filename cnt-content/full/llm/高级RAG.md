---
title: 高级RAG
description: '掌握高级 RAG 技术，包括混合搜索、重排序、HyDE 和父子文档检索'
module: llm
difficulty: advanced
tags:
  - 'advanced RAG'
  - reranking
  - 'hybrid search'
  - HyDE
  - 父子文档
related:
  - llm/多Token预测
  - llm/分词器
  - llm/构建分词器
  - llm/构建完整LLM流水线
prerequisites:
  - llm/安全护栏
---

# 高级RAG

> 基础 RAG 用向量搜索找文档，然后把文档塞给模型。高级 RAG 问：搜索结果准确吗？文档切得对吗？有没有更好的检索方式？回答这些问题，RAG 的准确率可以从 60% 提升到 90%。

**类型：** 构建
**语言：** Python
**前置条件：** Phase 11 Lesson 06（RAG）
**预计时间：** ~60 分钟

## 学习目标

- 理解混合搜索：BM25 + 向量搜索的互补性
- 掌握重排序（Reranking）的原理和实现
- 理解 HyDE（假设文档嵌入）和查询改写
- 掌握父子文档检索和元数据过滤

## 混合搜索

向量搜索擅长语义匹配，BM25 擅长关键词匹配。混合搜索结合两者：

```python
import math
from collections import Counter


class BM25:
    """BM25 关键词搜索"""

    def __init__(self, k1=1.5, b=0.75):
        self.k1 = k1
        self.b = b
        self.doc_freqs = []
        self.idf = {}
        self.doc_len = []
        self.avg_doc_len = 0
        self.corpus_size = 0

    def fit(self, corpus):
        """构建索引"""
        self.corpus_size = len(corpus)
        df = Counter()

        for doc in corpus:
            tokens = doc.lower().split()
            self.doc_len.append(len(tokens))
            self.doc_freqs.append(Counter(tokens))
            for token in set(tokens):
                df[token] += 1

        self.avg_doc_len = sum(self.doc_len) / self.corpus_size

        for token, freq in df.items():
            self.idf[token] = math.log(
                (self.corpus_size - freq + 0.5) / (freq + 0.5) + 1
            )

    def score(self, query, doc_idx):
        """计算 BM25 分数"""
        query_tokens = query.lower().split()
        score = 0
        doc_freq = self.doc_freqs[doc_idx]
        doc_len = self.doc_len[doc_idx]

        for token in query_tokens:
            if token in doc_freq:
                tf = doc_freq[token]
                idf = self.idf.get(token, 0)
                numerator = tf * (self.k1 + 1)
                denominator = tf + self.k1 * (1 - self.b + self.b * doc_len / self.avg_doc_len)
                score += idf * numerator / denominator

        return score


def hybrid_search(query, bm25, vector_index, embedding_fn, alpha=0.5, top_k=10):
    """混合搜索：BM25 + 向量搜索"""
    # BM25 搜索
    bm25_scores = []
    for i in range(bm25.corpus_size):
        bm25_scores.append(bm25.score(query, i))

    # 向量搜索
    query_emb = embedding_fn(query)
    vector_scores = vector_index.search(query_emb, top_k=top_k * 2)

    # 归一化分数
    bm25_max = max(bm25_scores) if bm25_scores else 1
    bm25_normalized = [s / bm25_max for s in bm25_scores]

    # 合并分数
    combined = {}
    for i, bm25_s in enumerate(bm25_normalized):
        combined[i] = alpha * bm25_s

    for doc_idx, vec_s in vector_scores:
        combined[doc_idx] = combined.get(doc_idx, 0) + (1 - alpha) * vec_s

    # 排序
    ranked = sorted(combined.items(), key=lambda x: x[1], reverse=True)
    return ranked[:top_k]
```

## 重排序（Reranking）

先用快速检索获取大量候选，再用交叉编码器精确排序：

```python
def rerank(query, documents, cross_encoder_fn, top_k=5):
    """重排序"""
    scored = []
    for doc in documents:
        score = cross_encoder_fn(query, doc)
        scored.append((doc, score))

    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[:top_k]
```

交叉编码器 vs 双编码器：

| 特性     | 双编码器（Bi-Encoder） | 交叉编码器（Cross-Encoder） |
| -------- | ---------------------- | --------------------------- |
| 速度     | 快（嵌入预计算）       | 慢（每对独立计算）          |
| 准确性   | 中等                   | 高                          |
| 适用阶段 | 初步检索               | 重排序                      |

## HyDE（假设文档嵌入）

HyDE 先让 LLM 生成一个"假设性回答"，再用这个回答的嵌入去检索：

```python
def hyde_retrieve(query, llm_fn, embedding_fn, vector_index, top_k=5):
    """HyDE 检索"""
    # Step 1: 生成假设性回答
    hypothetical_answer = llm_fn(
        f"请回答以下问题，即使你不确定也请给出你的最佳猜测：\n{query}"
    )

    # Step 2: 用假设回答的嵌入检索
    answer_embedding = embedding_fn(hypothetical_answer)
    results = vector_index.search(answer_embedding, top_k=top_k)

    return results
```

## 父子文档检索

小块检索，大块提供上下文：

```python
class ParentChildRetriever:
    """父子文档检索"""

    def __init__(self, embedding_fn, parent_chunk_size=2000, child_chunk_size=200):
        self.embedding_fn = embedding_fn
        self.parent_chunk_size = parent_chunk_size
        self.child_chunk_size = child_chunk_size
        self.parents = []
        self.children = []

    def index(self, documents):
        """索引文档"""
        for doc in documents:
            # 切分为父块
            parent_chunks = self._chunk(doc, self.parent_chunk_size)
            for parent in parent_chunks:
                parent_id = len(self.parents)
                self.parents.append(parent)

                # 每个父块切分为子块
                child_chunks = self._chunk(parent, self.child_chunk_size)
                for child in child_chunks:
                    embedding = self.embedding_fn(child)
                    self.children.append({
                        'content': child,
                        'embedding': embedding,
                        'parent_id': parent_id,
                    })

    def retrieve(self, query, top_k=5):
        """检索：匹配子块，返回父块"""
        query_emb = self.embedding_fn(query)

        # 在子块中搜索
        scores = []
        for child in self.children:
            score = cosine_similarity(query_emb, child['embedding'])
            scores.append((child, score))

        scores.sort(key=lambda x: x[1], reverse=True)

        # 返回对应的父块（去重）
        seen_parents = set()
        results = []
        for child, score in scores:
            parent_id = child['parent_id']
            if parent_id not in seen_parents:
                seen_parents.add(parent_id)
                results.append((self.parents[parent_id], score))
            if len(results) >= top_k:
                break

        return results
```

## 关键术语

| 术语     | 通俗说法         | 实际含义                                              |
| -------- | ---------------- | ----------------------------------------------------- |
| 混合搜索 | "两种搜索一起用" | BM25 关键词搜索 + 向量语义搜索的组合                  |
| 重排序   | "精排"           | 用交叉编码器对初步检索结果重新排序                    |
| HyDE     | "先猜后查"       | Hypothetical Document Embedding，用假设回答的嵌入检索 |
| 父子文档 | "小块搜大块回"   | 用小块匹配查询，返回包含上下文的父块                  |

## 延伸阅读

- [Gao et al., 2023 -- "Precise Zero-Shot Dense Retrieval without Relevance Labels"](https://arxiv.org/abs/2212.10496) -- HyDE 论文
- [Borgeaud et al., 2022 -- "Improving Language Models by Retrieving from Trillions of Tokens"](https://arxiv.org/abs/2112.04426) -- RETRO 论文
