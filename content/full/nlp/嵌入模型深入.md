---
title: 嵌入模型深入
description: '理解Sentence-BERT、E5、BGE和ColBERT等嵌入模型的架构与训练'
module: nlp
difficulty: intermediate
tags:
  - 嵌入模型
  - 'Sentence-BERT'
  - E5
  - BGE
  - ColBERT
related:
  - nlp/聊天机器人
  - nlp/命名实体识别
  - nlp/情感分析
  - nlp/实体链接
prerequisites:
  - 'nlp/词袋模型与TF-IDF'
---

# 嵌入模型深入 — Sentence-BERT、E5、BGE、ColBERT

> Word2Vec给每个词一个向量。句子嵌入给每个句子一个向量。RAG、检索和语义搜索依赖后者。模型选择是系统中最有影响力的单一决策。

**类型:** 学习
**语言:** Python
**前置条件:** Phase 5 · 03（Word2Vec），Phase 5 · 14（信息检索）
**时间:** ~60 分钟

## 问题

你有100万份文档。用户输入一个查询。你需要毫秒级返回前5个最相关的文档。你无法每次都运行LLM。你需要一个快速编码器，将查询和文档映射到向量，使语义相似的项目在向量空间中靠近。

这就是句子嵌入。2026年，模型选择是检索系统中最有影响力的单一决策。选错模型，你的RAG流水线在每个查询上都检索到错误的文档，无论下游LLM有多好。

## 概念

**架构家族。**

- **双编码器（Sentence-BERT、E5、BGE）。** 独立编码查询和文档。点积或余弦相似度评分。查询时快速，因为文档嵌入可以预计算。2026年默认。
- **后期交互（ColBERT）。** 独立编码但保留token级嵌入。评分是MaxSim：每个查询token找到最相似的文档token，求和。比双编码器更准确但更慢且存储更多。
- **交叉编码器。** 一起编码查询+文档。最准确但太慢无法用于初始检索。用作重排序器。

**训练方法。**

- **对比学习（SimCSE、Sentence-BERT）。** 正对（相似句子）拉近，负对（不相似句子）推远。SBERT在NLI对上训练：蕴含 = 正，矛盾 = 困难负。
- **指令微调（E5、BGE）。** 添加前缀如"query:"或"passage:"，使同一模型区分查询和文档。在标注数据上微调。
- **知识蒸馏。** 从交叉编码器教师向双编码器学生蒸馏。学生获得教师的排序质量，速度提升100倍。

### 2026年模型地图

| 模型                  | 维度      | 最大长度 | 训练数据 | MTEB排名     |
| --------------------- | --------- | -------- | -------- | ------------ |
| all-MiniLM-L6-v2      | 384       | 256      | 10亿对   | 快速默认     |
| bge-small-en-v1.5     | 384       | 512      | 10亿对   | 小型最佳     |
| bge-large-en-v1.5     | 1024      | 512      | 10亿对   | 双编码器SOTA |
| e5-large-v2           | 1024      | 512      | 10亿对   | 强通用       |
| gte-Qwen2-7B-instruct | 3584      | 32768    | 大规模   | 整体SOTA     |
| ColBERTv2             | 128/token | 512      | MS MARCO | 检索SOTA     |

### MTEB基准

大规模文本嵌入基准（MTEB）跨7个任务（分类、聚类、成对分类、重排序、检索、语义文本相似度、摘要）评估嵌入模型。56个数据集。排行榜在Hugging Face上持续更新。

### 困难负例挖掘

训练嵌入模型时，随机负例太简单。模型学不到细粒度区分。解决方案：困难负例挖掘。对每个查询，找到BM25或初始嵌入模型返回但不相关的文档。这些"困难负例"迫使模型学习更细粒度的语义区分。

## 构建它

### 步骤 1：使用Sentence-BERT

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

embeddings = model.encode([
    "The cat sat on the mat",
    "A feline rested on the rug",
    "The stock market crashed today",
], normalize_embeddings=True)

from sklearn.metrics.pairwise import cosine_similarity
print(cosine_similarity(embeddings))
```

### 步骤 2：使用E5进行检索

```python
model = SentenceTransformer("intfloat/e5-large-v2")

queries = ["query: What is machine learning?"]
docs = ["passage: Machine learning is a subset of artificial intelligence.", "passage: The weather is sunny today."]

q_emb = model.encode(queries, normalize_embeddings=True)
d_emb = model.encode(docs, normalize_embeddings=True)
scores = cosine_similarity(q_emb, d_emb)
print(scores)
```

注意 `query:` 和 `passage:` 前缀。E5在训练时使用这些区分查询和文档。省略它们会降低检索质量。

### 步骤 3：微调嵌入模型

```python
from sentence_transformers import InputExample, losses, SentenceTransformer

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

train_examples = [
    InputExample(texts=["query: flight change", "passage: How to modify your booking"], label=1.0),
    InputExample(texts=["query: flight change", "passage: Weather forecast for today"], label=0.0),
]

train_dataloader = torch.utils.data.DataLoader(train_examples, shuffle=True, batch_size=16)
train_loss = losses.CosineSimilarityLoss(model)

model.fit(train_objectives=[(train_dataloader, train_loss)], epochs=3)
```

### 步骤 4：评估检索质量

```python
def recall_at_k(retrieved_ids, relevant_ids, k=5):
    return len(set(retrieved_ids[:k]) & set(relevant_ids)) / len(relevant_ids) if relevant_ids else 0
```

## 使用它

| 场景           | 选择                                  |
| -------------- | ------------------------------------- |
| 快速原型，通用 | all-MiniLM-L6-v2                      |
| 生产检索，英语 | bge-large-en-v1.5 或 e5-large-v2      |
| 多语言         | paraphrase-multilingual-MiniLM-L12-v2 |
| 最高检索质量   | ColBERTv2 + 重排序                    |
| 长文档         | gte-Qwen2-7B-instruct (32k上下文)     |
| 自定义领域     | 在领域数据上微调                      |

## 交付它

将结果保存为 `outputs/skill-embedding-picker.md`。

## 练习

1. **简单。** 在10个查询-文档对上比较all-MiniLM-L6-v2和bge-small-en-v1.5。测量检索recall@5。
2. **中等。** 在领域特定数据上微调嵌入模型。与基础模型比较检索质量。
3. **困难。** 实现ColBERT MaxSim评分。与双编码器余弦比较检索质量。测量延迟差异。

## 关键术语

| 术语       | 通俗说法    | 实际含义                           |
| ---------- | ----------- | ---------------------------------- |
| 双编码器   | 独立编码    | 查询和文档独立编码，点积评分。     |
| 后期交互   | token级匹配 | 保留token级嵌入，MaxSim评分。      |
| 交叉编码器 | 一起编码    | 查询+文档一起编码。最准确，最慢。  |
| MTEB       | 嵌入基准    | 大规模文本嵌入基准，56个数据集。   |
| 困难负例   | 棘手的反例  | BM25返回但不相关的文档，用于训练。 |

## 延伸阅读

- [Reimers and Gurevych (2019). Sentence-BERT](https://arxiv.org/abs/1908.10084) — Sentence-BERT。
- [Wang et al. (2022). Text Embeddings by Weakly-Supervised Contrastive Pre-training (E5)](https://arxiv.org/abs/2212.03533) — E5。
- [Khattab and Zaharia (2020). ColBERT](https://arxiv.org/abs/2004.12832) — ColBERT。
- [MTEB排行榜](https://huggingface.co/spaces/mteb/leaderboard) — 实时排名。
