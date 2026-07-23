---
title: RAG检索增强生成
description: '理解 RAG 的完整架构，包括文档索引、向量检索、上下文注入和生成'
module: llm
difficulty: intermediate
tags:
  - RAG
  - 'retrieval augmented'
  - 向量搜索
  - 文档检索
  - 知识增强
related:
  - llm/LLM工程评估
  - llm/LLM评估
  - llm/RLHF人类反馈强化学习
prerequisites:
  - llm/安全护栏
---

# RAG检索增强生成

> LLM 不知道你公司的内部文档，不知道昨天的新闻，不知道你的数据库内容。RAG 让模型在生成前先"查资料"——检索相关文档，注入上下文，然后基于事实回答。

**类型：** 构建
**语言：** Python
**前置条件：** Phase 11 Lesson 04（嵌入）
**预计时间：** ~60 分钟

## 学习目标

- 理解 RAG 的完整架构：索引 → 检索 → 生成
- 实现端到端的 RAG 流水线
- 掌握分块策略和检索参数调优
- 理解 RAG 的局限性和改进方向

## RAG 架构

```
用户查询
  ↓
查询嵌入
  ↓
向量搜索 → 检索 Top-K 相关文档
  ↓
构建提示：[系统提示] + [检索到的文档] + [用户查询]
  ↓
LLM 生成回答
```

## 完整 RAG 实现

```python
import numpy as np
from dataclasses import dataclass


@dataclass
class Document:
    content: str
    metadata: dict
    embedding: np.ndarray = None


class SimpleRAG:
    """简化的 RAG 系统"""

    def __init__(self, embedding_fn, llm_fn, chunk_size=500, chunk_overlap=50):
        self.embedding_fn = embedding_fn
        self.llm_fn = llm_fn
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.documents = []

    def index(self, texts, metadata_list=None):
        """索引文档"""
        for i, text in enumerate(texts):
            chunks = self._chunk(text)
            meta = metadata_list[i] if metadata_list else {"source": i}

            for j, chunk in enumerate(chunks):
                embedding = self.embedding_fn(chunk)
                self.documents.append(Document(
                    content=chunk,
                    metadata={**meta, "chunk_index": j},
                    embedding=np.array(embedding),
                ))

    def retrieve(self, query, top_k=5):
        """检索相关文档"""
        query_emb = np.array(self.embedding_fn(query))

        scores = []
        for doc in self.documents:
            score = np.dot(query_emb, doc.embedding) / (
                np.linalg.norm(query_emb) * np.linalg.norm(doc.embedding)
            )
            scores.append((doc, score))

        scores.sort(key=lambda x: x[1], reverse=True)
        return scores[:top_k]

    def generate(self, query, top_k=5):
        """RAG 生成"""
        # 检索
        results = self.retrieve(query, top_k)

        # 构建上下文
        context = "\n\n---\n\n".join(
            f"[文档 {i+1}]\n{doc.content}"
            for i, (doc, score) in enumerate(results)
        )

        # 构建提示
        prompt = f"""基于以下检索到的文档回答用户问题。如果文档中没有相关信息，请说明"根据提供的信息，我无法回答这个问题"。

检索到的文档：
{context}

用户问题：{query}

回答："""

        # 生成
        response = self.llm_fn(prompt)
        return response, results

    def _chunk(self, text):
        """文本分块"""
        chunks = []
        start = 0
        while start < len(text):
            end = start + self.chunk_size
            chunks.append(text[start:end])
            start += self.chunk_size - self.chunk_overlap
        return chunks
```

## RAG 提示模板

```python
RAG_PROMPT_TEMPLATE = """你是一个知识助手。根据以下检索到的上下文回答用户问题。

规则：
1. 仅基于提供的上下文回答，不要使用外部知识
2. 如果上下文不足以回答，明确说明
3. 引用具体的文档编号作为依据
4. 不要编造信息

上下文：
{context}

问题：{question}

回答："""
```

## 关键术语

| 术语  | 通俗说法   | 实际含义                                     |
| ----- | ---------- | -------------------------------------------- |
| RAG   | "先查后答" | Retrieval-Augmented Generation，检索增强生成 |
| 索引  | "建资料库" | 将文档分块、嵌入并存入向量数据库的过程       |
| 检索  | "查资料"   | 根据查询向量搜索最相关的文档块               |
| Top-K | "取前K个"  | 检索时返回相似度最高的 K 个文档              |

## 延伸阅读

- [Lewis et al., 2020 -- "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks"](https://arxiv.org/abs/2005.11401) -- RAG 原始论文
- [Gao et al., 2023 -- "Retrieval-Augmented Generation for Large Language Models: A Survey"](https://arxiv.org/abs/2312.10997) -- RAG 综述
