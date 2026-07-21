---
title: '词袋模型与TF-IDF'
description: '理解词袋模型、TF-IDF文本表示及其在2026年仍然有效的场景'
module: nlp
difficulty: beginner
tags:
  - 词袋模型
  - 'TF-IDF'
  - 文本表示
  - 稀疏向量
related:
  - nlp/词嵌入Word2Vec
  - nlp/词性标注与句法解析
  - python/语法速查
  - algorithm/算法分析基础与学习路线
prerequisites: []
---

# 词袋模型、TF-IDF与文本表示

> 先计数，后思考。TF-IDF在2026年定义明确的任务上仍然击败嵌入。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 5 · 01（文本处理），Phase 2 · 02（从零构建线性回归）
**时间:** ~75 分钟

## 问题

模型需要数字。你有字符串。

每个NLP流水线都必须回答同一个问题。如何将可变长度的token流转换为分类器可以消费的固定大小向量。该领域找到的第一个答案是最笨但有效的。数词。做向量。

那个向量承载了比任何嵌入模型都多的生产NLP。垃圾邮件过滤器、主题分类器、日志异常检测、搜索排序（BM25之前）、第一波情感分析、学术NLP基准的第一个十年。2026年从业者仍然在窄分类任务上首先使用它。它快速、可解释，在词存在就是关键的任务上通常与400M参数的嵌入模型无法区分。

本课程从零构建词袋模型，然后构建TF-IDF。然后展示scikit-learn三行代码做同样的事。然后命名让你转向嵌入的失败模式。

## 概念

**词袋模型 (BoW)** 丢弃顺序。对每个文档，计算每个词表词出现多少次。向量长度是词表大小。位置 `i` 是词 `i` 的计数。

**TF-IDF** 重新加权BoW。在每个文档中都出现的词信息量少，所以缩小它。在整个语料库中罕见但在单个文档中频繁的词是信号，所以放大它。

```
TF-IDF(w, d) = TF(w, d) * IDF(w)
             = count(w in d) / |d| * log(N / df(w))
```

其中 `TF` 是文档中的词频，`df` 是文档频率（多少文档包含该词），`N` 是总文档数。`log` 保持无处不在的词的权重有界。

关键属性：两者都产生具有可解释轴的稀疏向量。你可以查看训练分类器的权重，读取哪些词将文档推向每个类别。768维BERT嵌入做不到这一点。

## 构建它

### 步骤 1：构建词表

```python
def build_vocab(docs):
    vocab = {}
    for doc in docs:
        for token in doc:
            if token not in vocab:
                vocab[token] = len(vocab)
    return vocab
```

输入：token化文档列表。输出：`{word: index}` 字典。稳定插入顺序意味着词索引0是第一个文档中看到的第一个词。

### 步骤 2：词袋模型

```python
def bag_of_words(docs, vocab):
    matrix = [[0] * len(vocab) for _ in docs]
    for i, doc in enumerate(docs):
        for token in doc:
            if token in vocab:
                matrix[i][vocab[token]] += 1
    return matrix
```

```python
>>> docs = [["cat", "sat", "on", "mat"], ["cat", "cat", "ran"]]
>>> vocab = build_vocab(docs)
>>> bag_of_words(docs, vocab)
[[1, 1, 1, 1, 0], [2, 0, 0, 0, 1]]
```

行是文档。列是词表索引。条目 `[i][j]` 是"词 `j` 在文档 `i` 中出现多少次"。

### 步骤 3：词频和文档频率

```python
import math


def term_frequency(doc_bow, doc_length):
    return [c / doc_length if doc_length else 0 for c in doc_bow]


def document_frequency(bow_matrix):
    df = [0] * len(bow_matrix[0])
    for row in bow_matrix:
        for j, count in enumerate(row):
            if count > 0:
                df[j] += 1
    return df


def inverse_document_frequency(df, n_docs):
    return [math.log((n_docs + 1) / (d + 1)) + 1 for d in df]
```

两个平滑技巧值得命名。`(n+1)/(d+1)` 避免 `log(x/0)`。尾部的 `+1` 确保每个文档中都出现的词仍有IDF 1（不是0），匹配scikit-learn的默认值。

### 步骤 4：TF-IDF

```python
def tfidf(bow_matrix):
    n_docs = len(bow_matrix)
    df = document_frequency(bow_matrix)
    idf = inverse_document_frequency(df, n_docs)
    out = []
    for row in bow_matrix:
        length = sum(row)
        tf = term_frequency(row, length)
        out.append([tf_j * idf_j for tf_j, idf_j in zip(tf, idf)])
    return out
```

### 步骤 5：L2归一化行

```python
def l2_normalize(matrix):
    out = []
    for row in matrix:
        norm = math.sqrt(sum(x * x for x in row))
        out.append([x / norm if norm else 0 for x in row])
    return out
```

没有归一化，更长的文档获得更大的向量并主导相似度分数。L2归一化将每个文档放在单位超球面上。行之间的余弦相似度现在就是点积。

## 使用它

scikit-learn提供了生产版本。

```python
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer

docs = ["the cat sat on the mat", "the dog sat on the mat", "the cat ran"]

bow_vectorizer = CountVectorizer()
bow = bow_vectorizer.fit_transform(docs)
print(bow_vectorizer.get_feature_names_out())
print(bow.toarray())

tfidf_vectorizer = TfidfVectorizer()
tfidf = tfidf_vectorizer.fit_transform(docs)
print(tfidf.toarray().round(3))
```

改变一切的旋钮：

| 参数                   | 效果                                                                       |
| ---------------------- | -------------------------------------------------------------------------- |
| `ngram_range=(1, 2)`   | 包含二元组。通常提升分类效果。                                             |
| `min_df=2`             | 丢弃在少于2个文档中出现的词。在嘈杂数据上修剪词表。                        |
| `max_df=0.95`          | 丢弃在超过95%文档中出现的词。近似停用词移除。                              |
| `stop_words="english"` | scikit-learn内置停用词表。任务相关 — 情感分析*不应*删除否定词。            |
| `sublinear_tf=True`    | 使用 `1 + log(tf)` 代替原始 `tf`。当一个词在一个文档中重复很多次时有帮助。 |

### TF-IDF何时仍然赢（截至2026年）

- 垃圾邮件检测、主题标注、日志异常标记。词存在就是关键；语义细微差别不重要。
- 低数据场景（数百个标注样本）。TF-IDF加逻辑回归没有预训练成本。
- 任何延迟重要的地方。TF-IDF加线性模型微秒级响应。通过Transformer嵌入文档需要10-100ms。
- 必须解释预测的系统。检查分类器系数。顶部正权重词就是原因。

### TF-IDF何时失败

语义盲点失败。考虑这两个文档：

- "The movie was not good at all."
- "The movie was excellent."

一个负面评论。一个正面。它们的TF-IDF重叠恰好是 `{the, movie, was}`。词袋分类器必须记住 `not` 在 `good` 附近翻转标签。它在足够数据上可以学到这个，但永远不如理解语法的模型优雅。

另一个失败：推理时的词外词。在IMDb评论上训练的BoW模型不知道如何处理 `Zoomer-approved`，如果该token从未在训练中出现。子词嵌入（课程04）处理这个。TF-IDF不能。

### 混合：TF-IDF加权嵌入

2026年中等数据分类的实用默认：使用TF-IDF权重作为词嵌入上的注意力。

```python
def tfidf_weighted_embedding(doc, tfidf_scores, embedding_table, dim):
    vec = [0.0] * dim
    total_weight = 0.0
    for token in doc:
        if token not in embedding_table or token not in tfidf_scores:
            continue
        weight = tfidf_scores[token]
        emb = embedding_table[token]
        for i in range(dim):
            vec[i] += weight * emb[i]
        total_weight += weight
    if total_weight == 0:
        return vec
    return [v / total_weight for v in vec]
```

你从嵌入获得语义能力，从TF-IDF获得罕见词强调。分类器在池化向量上训练。在大约5万标注样本以下的情感、主题和意图分类上，这优于单独使用任何一种。

## 交付它

将结果保存为 `outputs/prompt-vectorization-picker.md`。

## 练习

1. **简单。** 在L2归一化的TF-IDF输出上实现 `cosine_similarity(doc_vec_a, doc_vec_b)`。验证相同文档得分1.0，不相交词表文档得分0.0。
2. **中等。** 为 `bag_of_words` 添加 `n-gram` 支持。参数 `n` 产生 `n`-gram 上的计数。测试 `n=2` 在 `["the", "cat", "sat"]` 上产生 `["the cat", "cat sat"]` 的二元组计数。
3. **困难。** 使用GloVe 100d向量构建上述TF-IDF加权嵌入混合。在20 Newsgroups数据集上与纯TF-IDF和纯均值池化嵌入比较分类准确率。报告哪个在哪里赢。

## 关键术语

| 术语       | 通俗说法   | 实际含义                                             |
| ---------- | ---------- | ---------------------------------------------------- |
| BoW        | 词频向量   | 一个文档中词表词的计数。丢弃顺序。                   |
| TF         | 词频       | 一个词在文档中的计数，可选按文档长度归一化。         |
| DF         | 文档频率   | 至少包含该词一次的文档数。                           |
| IDF        | 逆文档频率 | `log(N / df)` 平滑。降低到处出现的词的权重。         |
| 稀疏向量   | 大部分为零 | 词表通常1万-10万词；大多数在任何给定文档中都不出现。 |
| 余弦相似度 | 向量角度   | L2归一化向量的点积。1为相同，0为正交。               |

## 延伸阅读

- [scikit-learn — feature extraction from text](https://scikit-learn.org/stable/modules/feature_extraction.html#text-feature-extraction) — 标准API参考，加每个旋钮的说明。
- [Salton, G., & Buckley, C. (1988). Term-weighting approaches in automatic text retrieval](https://www.sciencedirect.com/science/article/pii/0306457388900210) — 让TF-IDF成为十年默认的论文。
