---
title: 分块策略与RAG
description: 理解固定大小、句子感知、语义和递归分块策略及其对RAG的影响
module: nlp
difficulty: intermediate
tags:
  - 分块
  - RAG
  - 语义分块
  - 递归分块
  - 文档摄取
related:
  - nlp/对话状态跟踪
  - nlp/多语言NLP
  - nlp/共指消解
  - nlp/关系抽取与知识图谱
prerequisites:
  - 'nlp/词袋模型与TF-IDF'
---

# 分块策略与RAG

> 80%的RAG失败可追溯到摄取和分块，不是模型。团队花几周调提示，而检索悄悄每三次查询返回错误上下文。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 5 · 14（信息检索），Phase 5 · 22（嵌入模型）
**时间:** ~75 分钟

## 问题

你有一份50页的PDF。嵌入模型接受512个token。你需要将文档分割成块，使每个块：(1) 足够小以适应嵌入模型，(2) 足够大以携带有意义的信息，(3) 在语义边界上断开而非句子中间。

分块是RAG中最被低估的步骤。错误的分块策略破坏检索，无论嵌入模型或LLM有多好。

## 概念

**固定大小分块。** 每块N个token，重叠M个token。简单、可预测、忽略语义边界。适合快速基线。

**句子感知分块。** 在句子边界上分割。使用spaCy或NLTK的句子分割器。保留句子完整性。可能产生非常短或非常长的块。

**语义分块。** 计算相邻句子的嵌入相似度。当相似度低于阈值时分割。在语义边界上断开。计算成本高但质量更好。

**递归分块。** 使用分隔符层次结构（段落 → 句子 → 字符）。尝试在最高级别分割，如果块太大则降级。LangChain的默认策略。

**父文档模式。** 检索小"子"块以提高精确度。当同一父节的多个子块出现时，换入父块以保留上下文。持续提升答案质量。

### 分块参数

| 参数       | 典型值           | 影响                          |
| ---------- | ---------------- | ----------------------------- |
| 块大小     | 256-1024 token   | 更小 = 更精确检索，更少上下文 |
| 重叠       | 10-25%           | 防止跨块边界信息丢失          |
| 分隔符     | 句子、段落、标题 | 语义边界保持完整性            |
| 最小块大小 | 50-100 token     | 过小的块合并                  |

## 构建它

### 步骤 1：固定大小分块

```python
def fixed_chunk(text, chunk_size=512, overlap=50):
    tokens = text.split()
    chunks = []
    start = 0
    while start < len(tokens):
        end = start + chunk_size
        chunk = " ".join(tokens[start:end])
        chunks.append(chunk)
        start += chunk_size - overlap
    return chunks
```

### 步骤 2：递归分块

```python
def recursive_chunk(text, max_size=512, separators=None):
    if separators is None:
        separators = ["\n\n", "\n", ". ", " ", ""]

    if len(text.split()) <= max_size:
        return [text]

    sep = separators[0]
    remaining = separators[1:]

    parts = text.split(sep)
    chunks = []
    current = ""

    for part in parts:
        candidate = (current + sep + part).strip() if current else part
        if len(candidate.split()) <= max_size:
            current = candidate
        else:
            if current:
                chunks.append(current)
            if len(part.split()) > max_size and remaining:
                chunks.extend(recursive_chunk(part, max_size, remaining))
            else:
                current = part
    if current:
        chunks.append(current)
    return chunks
```

### 步骤 3：语义分块

```python
from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

def semantic_chunk(text, threshold=0.5):
    sentences = text.split(". ")
    if len(sentences) <= 1:
        return [text]

    embeddings = model.encode(sentences, normalize_embeddings=True)
    similarities = [float(embeddings[i] @ embeddings[i + 1]) for i in range(len(embeddings) - 1)]

    chunks = []
    current = [sentences[0]]
    for i, sim in enumerate(similarities):
        if sim < threshold:
            chunks.append(". ".join(current))
            current = [sentences[i + 1]]
        else:
            current.append(sentences[i + 1])
    if current:
        chunks.append(". ".join(current))
    return chunks
```

### 步骤 4：评估分块质量

```python
def chunk_quality(chunks, questions, answers, embed_model, top_k=3):
    total_recall = 0
    for q, a in zip(questions, answers):
        q_emb = embed_model.encode([q], normalize_embeddings=True)
        chunk_embs = embed_model.encode(chunks, normalize_embeddings=True)
        sims = (chunk_embs @ q_emb.T).flatten()
        top_indices = np.argsort(-sims)[:top_k]
        relevant_text = " ".join(chunks[i] for i in top_indices)
        overlap = len(set(a.lower().split()) & set(relevant_text.lower().split()))
        total = len(set(a.lower().split()))
        total_recall += overlap / total if total else 0
    return total_recall / len(questions)
```

## 使用它

| 场景          | 选择                         |
| ------------- | ---------------------------- |
| 快速基线      | 固定大小，256 token，10%重叠 |
| 通用文档      | 递归分块，512 token          |
| 技术文档/手册 | 语义分块 + 标题感知          |
| 法律/合规     | 句子感知，保留条款完整性     |
| 代码          | AST感知分块（函数/类边界）   |
| 长文档        | 父文档模式                   |

### 2026年生产RAG的来之不易的经验

- **80%的RAG失败可追溯到摄取和分块，不是模型。** 先修复分块。
- **分块策略比分块大小更重要。** 固定大小分割破坏表格、代码和嵌套标题。
- **父文档模式持续提升答案质量。** 检索小"子"块，换入父块。
- **k_rerank=3通常最优。** 超过这个的每个额外块增加成本但不提升质量。
- **上下文预算低于8K token。** 在该限制下持续命中意味着重排序器阈值太松。

## 交付它

将结果保存为 `outputs/skill-chunking-picker.md`。

## 练习

1. **简单。** 在相同文档上比较固定大小和递归分块。测量块大小分布。
2. **中等。** 在技术文档上实现语义分块。与递归分块比较检索recall@5。
3. **困难。** 实现父文档模式。测量有和无父文档提升的答案质量。

## 关键术语

| 术语     | 通俗说法       | 实际含义                                  |
| -------- | -------------- | ----------------------------------------- |
| 分块     | 切文档         | 将文档分割为嵌入模型可处理的片段。        |
| 重叠     | 安全网         | 相邻块之间共享的token，防止边界信息丢失。 |
| 语义分块 | 智能分割       | 在语义相似度下降处分割。                  |
| 父文档   | 小检索大上下文 | 检索小子块，返回大父块。                  |
| 摄取     | 文档入流水线   | 分块 + 嵌入 + 索引的完整文档处理过程。    |

## 延伸阅读

- [LangChain — 文本分割器](https://python.langchain.com/docs/concepts/text_splitters/) — 分块策略参考。
- [LlamaIndex — 节点解析器](https://docs.llamaindex.ai/en/stable/module_guides/loading/node_parsers/) — 语义分块实现。
- [Gao et al. (2023). Retrieval-Augmented Generation for Large Language Models: A Survey](https://arxiv.org/abs/2312.10997) — RAG综合调查。
