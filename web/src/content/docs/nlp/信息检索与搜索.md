---
title: 信息检索与搜索
description: 理解BM25、密集检索、RRF融合和交叉编码器重排序的完整技术栈
module: nlp
difficulty: intermediate
tags:
  - 信息检索
  - BM25
  - 密集检索
  - RRF
  - 重排序
  - RAG
related:
  - nlp/文本CNN与RNN
  - nlp/问答系统
  - nlp/序列到序列模型
  - nlp/长上下文评估
prerequisites:
  - 'nlp/词袋模型与TF-IDF'
---

# 信息检索与搜索

> BM25精确但脆弱。密集检索网撒得广但漏关键词。混合是2026年默认。其他都是调优。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 5 · 02（BoW + TF-IDF），Phase 5 · 04（GloVe、FastText、子词）
**时间:** ~75 分钟

## 问题

用户输入"what happens if someone lies to get money"并期望找到实际覆盖该内容的法规："Section 420 IPC。"关键词搜索完全错过（无共享词汇）。语义搜索如果嵌入未在法律文本上训练也会错过。真实搜索必须处理两者。

IR是每个RAG系统、每个搜索栏、每个文档站模糊查找下的流水线。2026年在生产中有效的架构不是单一方法。它是互补方法的链条，每个捕获前一个的失败。

本课程构建每个部分并命名每个捕获哪些失败。

## 概念

四层。选择你需要的。

1. **稀疏检索 (BM25)。** 快速、精确匹配、语义上糟糕。在倒排索引上运行。百万文档上每查询<10ms。正确处理法规引用、产品代码、错误消息、命名实体。
2. **密集检索。** 将查询和文档编码为向量。最近邻搜索。捕获释义和语义相似度。错过差一个字符的精确关键词匹配。FAISS或向量DB每查询50-200ms。
3. **融合。** 合并稀疏和密集的排序列表。倒数排名融合 (RRF) 是简单的默认，因为它忽略原始分数（不同尺度）只使用排名位置。当你知道某个信号在领域中占主导时，加权融合是选项。
4. **交叉编码器重排序。** 取融合的top-30。运行交叉编码器（查询 + 文档一起，每对评分）。保留top-5。交叉编码器每对比双编码器慢但准确得多。通过只在top-30上运行来摊销成本。

三路检索（BM25 + 密集 + 学习稀疏如SPLADE）在2026年基准上优于两路，但需要学习稀疏索引的基础设施。对大多数团队，两路加交叉编码器重排序是最佳平衡点。

## 构建它

### 步骤 1：从零构建BM25

```python
import math
import re
from collections import Counter

TOKEN_RE = re.compile(r"[a-z0-9]+")


def tokenize(text):
    return TOKEN_RE.findall(text.lower())


class BM25:
    def __init__(self, corpus, k1=1.5, b=0.75):
        if not corpus:
            raise ValueError("corpus must not be empty")
        self.corpus = [tokenize(d) for d in corpus]
        self.k1 = k1
        self.b = b
        self.n_docs = len(self.corpus)
        self.avg_dl = sum(len(d) for d in self.corpus) / self.n_docs
        self.df = Counter()
        for doc in self.corpus:
            for term in set(doc):
                self.df[term] += 1

    def idf(self, term):
        n = self.df.get(term, 0)
        return math.log(1 + (self.n_docs - n + 0.5) / (n + 0.5))

    def score(self, query, doc_idx):
        q_tokens = tokenize(query)
        doc = self.corpus[doc_idx]
        dl = len(doc)
        freq = Counter(doc)
        score = 0.0
        for term in q_tokens:
            f = freq.get(term, 0)
            if f == 0:
                continue
            numerator = f * (self.k1 + 1)
            denominator = f + self.k1 * (1 - self.b + self.b * dl / self.avg_dl)
            score += self.idf(term) * numerator / denominator
        return score

    def rank(self, query, top_k=10):
        scored = [(self.score(query, i), i) for i in range(self.n_docs)]
        scored.sort(reverse=True)
        return scored[:top_k]
```

两个值得了解的参数。`k1=1.5` 控制词频饱和；更高意味着词重复权重更大。`b=0.75` 控制长度归一化；0忽略文档长度，1完全归一化。默认值是Robertson原始论文的推荐，很少需要调优。

### 步骤 2：使用双编码器的密集检索

```python
from sentence_transformers import SentenceTransformer
import numpy as np


def build_dense_index(corpus, model_id="sentence-transformers/all-MiniLM-L6-v2"):
    encoder = SentenceTransformer(model_id)
    embeddings = encoder.encode(corpus, normalize_embeddings=True)
    return encoder, embeddings


def dense_search(encoder, embeddings, query, top_k=10):
    q_emb = encoder.encode([query], normalize_embeddings=True)
    sims = (embeddings @ q_emb.T).flatten()
    order = np.argsort(-sims)[:top_k]
    return [(float(sims[i]), int(i)) for i in order]
```

L2归一化嵌入使点积等于余弦。`all-MiniLM-L6-v2` 是384维、快速、对大多数英语检索足够强。多语言工作使用 `paraphrase-multilingual-MiniLM-L12-v2`。最高准确率用 `bge-large-en-v1.5` 或 `e5-large-v2`。

### 步骤 3：倒数排名融合

```python
def reciprocal_rank_fusion(rankings, k=60):
    scores = {}
    for ranking in rankings:
        for rank, (_, doc_idx) in enumerate(ranking):
            scores[doc_idx] = scores.get(doc_idx, 0.0) + 1.0 / (k + rank + 1)
    fused = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return [(score, doc_idx) for doc_idx, score in fused]
```

`k=60` 常数来自原始RRF论文。更高的 `k` 平坦化排名差异的贡献；更低的 `k` 使顶部排名占主导。60是已发布的默认值，很少需要调优。

### 步骤 4：混合搜索 + 重排序

```python
from sentence_transformers import CrossEncoder

reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")


def hybrid_search(query, bm25, encoder, dense_embeddings, corpus, top_k=5, pool_size=30, reranker=reranker):
    sparse_ranking = bm25.rank(query, top_k=pool_size)
    dense_ranking = dense_search(encoder, dense_embeddings, query, top_k=pool_size)
    fused = reciprocal_rank_fusion([sparse_ranking, dense_ranking])[:pool_size]

    pairs = [(query, corpus[doc_idx]) for _, doc_idx in fused]
    scores = reranker.predict(pairs)
    reranked = sorted(zip(scores, [doc_idx for _, doc_idx in fused]), reverse=True)
    return reranked[:top_k]
```

三阶段组合。BM25找到词汇匹配。密集找到语义匹配。RRF合并两个排名无需分数校准。交叉编码器使用查询-文档对重新评分top-30，捕获双编码器遗漏的细粒度相关性。保留top-5。

### 步骤 5：评估

| 指标                | 含义                                      |
| ------------------- | ----------------------------------------- |
| Recall@k            | 正确文档存在的查询中，它在top-k中的频率？ |
| MRR（平均倒数排名） | 第一个相关文档的1/rank的平均值。          |
| nDCG@k              | 考虑相关性梯度，不仅仅是二元相关/不相关。 |

对于RAG，**检索器的Recall@k**是最重要的数字。如果正确段落不在检索集中，阅读器无法回答。

调试提示：对于失败查询，对比稀疏和密集排名。如果一个找到正确文档而另一个没有，你有词汇不匹配（修复：添加缺失的一半）或语义歧义（修复：更好的嵌入或重排序器）。

## 使用它

2026年技术栈：

| 规模         | 技术栈                                                             |
| ------------ | ------------------------------------------------------------------ |
| 1k-100k文档  | 内存BM25 + `all-MiniLM-L6-v2`嵌入 + RRF。无需单独DB。              |
| 100k-10M文档 | FAISS或pgvector做密集 + Elasticsearch/OpenSearch做BM25。并行运行。 |
| 10M+文档     | Qdrant/Weaviate/Vespa/Milvus带混合支持。交叉编码器重排序top-30。   |
| 最高质量前沿 | 三路（BM25 + 密集 + SPLADE）+ ColBERT后期交互重排序                |

无论选什么，为评估做预算。在基准端到端RAG准确率之前先基准检索召回。阅读器无法修复检索器遗漏的。

### 2026年生产RAG的来之不易的经验

- **80%的RAG失败可追溯到摄取和分块，不是模型。** 团队花几周换LLM和调提示，而检索悄悄每三次查询返回错误上下文。先修复分块。
- **分块策略比分块大小更重要。** 固定大小分割破坏表格、代码和嵌套标题。句子感知是默认；语义或基于LLM的分块对技术文档和产品手册有回报。
- **父文档模式。** 检索小"子"块以提高精确度。当同一父节的多个子块出现时，换入父块以保留上下文。这持续提升答案质量，无需重新训练。
- **k_rerank=3通常最优。** 超过这个的每个额外块增加token成本和生成延迟而不提升答案质量。如果k=8仍比k=3好，重排序器表现不佳。
- **HyDE/查询扩展。** 从查询生成假设答案，嵌入那个，检索。桥接短问题和长文档之间的措辞差距。无需训练即可免费提升精确度。
- **上下文预算低于8K token。** 在该限制下持续命中意味着重排序器阈值太松。
- **版本化一切。** 提示、分块规则、嵌入模型、重排序器。任何漂移都会静默破坏答案质量。CI门控忠实度、上下文精确度和未回答问题率在用户看到之前阻止回归。
- **三路检索（BM25 + 密集 + 学习稀疏如SPLADE）优于两路**，在2026年基准上，特别是混合专有名词和语义的查询。当基础设施支持SPLADE索引时发布它。

根据2026年行业测量，适当的检索设计减少70-90%的幻觉。大多数RAG性能提升来自更好的检索，而非模型微调。

## 交付它

将结果保存为 `outputs/skill-retrieval-picker.md`。

## 练习

1. **简单。** 在500文档语料上实现上述 `hybrid_search`。测试20个查询。比较BM25-only、dense-only和混合的recall@5。
2. **中等。** 添加MRR计算。对于每个有已知正确文档的测试查询，找到BM25、密集和混合排名中正确文档的排名。报告每个的MRR。
3. **困难。** 使用MultipleNegativesRankingLoss（Sentence Transformers）在你的领域上微调密集编码器。从500个查询-文档对构建训练集。比较微调前后的召回。

## 关键术语

| 术语       | 通俗说法   | 实际含义                                    |
| ---------- | ---------- | ------------------------------------------- |
| BM25       | 关键词搜索 | Okapi BM25。通过词频、IDF和长度对文档评分。 |
| 密集检索   | 向量搜索   | 将查询+文档编码为向量，找最近邻。           |
| 双编码器   | 嵌入模型   | 独立编码查询和文档。查询时快速。            |
| 交叉编码器 | 重排序模型 | 一起编码查询+文档。慢但准确。               |
| RRF        | 排名融合   | 通过求和 `1/(k + rank)` 合并两个排名。      |
| Recall@k   | 检索指标   | 相关文档在top-k中的查询比例。               |

## 延伸阅读

- [Robertson and Zaragoza (2009). The Probabilistic Relevance Framework: BM25 and Beyond](https://www.staff.city.ac.uk/~sbrp622/papers/foundations_bm25_review.pdf) — 权威BM25论述。
- [Karpukhin et al. (2020). Dense Passage Retrieval for Open-Domain QA](https://arxiv.org/abs/2004.04906) — DPR，标准双编码器。
- [Formal et al. (2021). SPLADE: Sparse Lexical and Expansion Model](https://arxiv.org/abs/2107.05720) — 缩小与密集差距的学习稀疏检索器。
- [Cormack, Clarke, Büttcher (2009). Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf) — RRF论文。
- [Khattab and Zaharia (2020). ColBERT: Efficient and Effective Passage Search](https://arxiv.org/abs/2004.12832) — 后期交互检索。
