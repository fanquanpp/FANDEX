---
title: 主题建模
description: 理解LDA和BERTopic两种主题建模方法及其适用场景
module: nlp
difficulty: beginner
tags:
  - 主题建模
  - LDA
  - BERTopic
  - UMAP
  - HDBSCAN
related:
  - nlp/序列到序列模型
  - nlp/长上下文评估
  - nlp/注意力机制
  - nlp/子词分词
prerequisites:
  - 'nlp/词袋模型与TF-IDF'
---

# 主题建模 — LDA与BERTopic

> LDA：文档是主题的混合，主题是词的分布。BERTopic：文档在嵌入空间中聚类，聚类就是主题。目标相同，分解不同。

**类型:** 学习
**语言:** Python
**前置条件:** Phase 5 · 02（BoW + TF-IDF），Phase 5 · 03（Word2Vec）
**时间:** ~45 分钟

## 问题

你有10,000个客户支持工单、50,000篇新闻文章或200,000条推文。你需要知道这个集合关于什么而不阅读它。你没有标注类别。你甚至不知道有多少类别存在。

主题建模在无监督下回答这个问题。给它一个语料库，返回一小组连贯主题，以及每个文档在这些主题上的分布。

两个算法家族主导。LDA（2003）将每个文档视为潜在主题的混合，每个主题视为词的分布。推理是贝叶斯的。它仍然在需要混合成员主题分配和可解释的词级概率分布的生产中发布。

BERTopic（2020）用BERT编码文档，用UMAP降维，用HDBSCAN聚类，通过基于类别的TF-IDF提取主题词。它在短文本、社交媒体和语义相似性比词重叠更重要的任何内容上获胜。一个文档一个主题，这对长内容是限制。

本课程为两者建立直觉并命名给定语料选哪个。

## 概念

**LDA生成故事。** 每个主题是词上的分布。每个文档是主题的混合。要在文档中生成一个词，从文档的混合中采样一个主题，然后从该主题的分布中采样一个词。推理反转这个：给定观察到的词，推断每个文档的主题分布和每个主题的词分布。折叠Gibbs采样或变分贝叶斯做数学。

关键LDA输出：

- `doc_topic`：矩阵 `(n_docs, n_topics)`，每行总和为1（文档的主题混合）。
- `topic_word`：矩阵 `(n_topics, vocab_size)`，每行总和为1（主题的词分布）。

**BERTopic流水线。**

1. 用句子Transformer编码每个文档（如 `all-MiniLM-L6-v2`）。384维向量。
2. 用UMAP降维到约5维。BERT嵌入对聚类来说维度太高。
3. 用HDBSCAN聚类。基于密度，产生可变大小聚类和"离群值"标签。
4. 对每个聚类，计算聚类文档上的基于类别的TF-IDF以提取顶部词。

输出是每个文档一个主题（加-1离群值标签）。可选地，通过HDBSCAN的概率向量获得软成员。

## 构建它

### 步骤 1：通过scikit-learn的LDA

```python
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.decomposition import LatentDirichletAllocation
import numpy as np


def fit_lda(documents, n_topics=5, max_features=1000):
    cv = CountVectorizer(
        max_features=max_features,
        stop_words="english",
        min_df=2,
        max_df=0.9,
    )
    X = cv.fit_transform(documents)
    lda = LatentDirichletAllocation(
        n_components=n_topics,
        random_state=42,
        max_iter=50,
        learning_method="online",
    )
    doc_topic = lda.fit_transform(X)
    feature_names = cv.get_feature_names_out()
    return lda, cv, doc_topic, feature_names


def print_top_words(lda, feature_names, n_top=10):
    for idx, topic in enumerate(lda.components_):
        top_idx = np.argsort(-topic)[:n_top]
        words = [feature_names[i] for i in top_idx]
        print(f"topic {idx}: {' '.join(words)}")
```

注意：去停用词，min_df和max_df过滤罕见和无处不在的术语，CountVectorizer（不是TfidfVectorizer）因为LDA期望原始计数。

### 步骤 2：BERTopic（生产）

```python
from bertopic import BERTopic

topic_model = BERTopic(
    embedding_model="sentence-transformers/all-MiniLM-L6-v2",
    min_topic_size=15,
    verbose=True,
)

topics, probs = topic_model.fit_transform(documents)
info = topic_model.get_topic_info()
print(info.head(20))
valid_topics = info[info["Topic"] != -1]["Topic"].tolist()
for topic_id in valid_topics[:5]:
    print(f"topic {topic_id}: {topic_model.get_topic(topic_id)[:10]}")
```

`Topic != -1` 上的过滤丢弃BERTopic的离群值桶（HDBSCAN无法聚类的文档）。`min_topic_size` 控制HDBSCAN的最小聚类大小；BERTopic库默认为10。本例为课程规模显式设为15。对于超过10,000文档的语料库，增加到50或100。

### 步骤 3：评估

两种方法输出主题词。问题是这些词是否连贯。

- **主题连贯性 (c_v)。** 结合顶部词对的NPMI（归一化逐点互信息）在滑动窗口上下文上，将分数聚合为主题向量，通过余弦相似度比较这些向量。越高越好。使用 `gensim.models.CoherenceModel` 配 `coherence="c_v"`。
- **主题多样性。** 所有主题顶部词中唯一词的比例。越高越好（主题不重叠）。
- **定性检查。** 阅读每个主题的顶部词。它们命名了一个真实的东西吗？人类判断仍然是最后一道防线。

## 何时选择哪个

| 情况                       | 选择                 |
| -------------------------- | -------------------- |
| 短文本（推文、评论、标题） | BERTopic             |
| 带主题混合的长文档         | LDA                  |
| 无GPU/计算有限             | LDA或NMF             |
| 需要文档级多主题分布       | LDA                  |
| LLM集成做主题标签          | BERTopic（直接支持） |
| 资源受限边缘部署           | LDA                  |
| 最大语义连贯性             | BERTopic             |

最大的实际考虑是文档长度。BERT嵌入截断；LDA计数适用于任何长度。对于超过嵌入模型上下文的文档，要么分块+聚合，要么使用LDA。

## 使用它

2026年技术栈：

- **BERTopic。** 短文本和语义重要的默认。
- **`gensim.models.LdaModel`。** 经典LDA，生产级，久经考验。
- **`sklearn.decomposition.LatentDirichletAllocation`。** 实验用简单LDA。
- **NMF。** 非负矩阵分解。LDA的快速替代，短文本上质量相当。
- **Top2Vec。** 类似BERTopic的设计。社区较小但某些基准上表现好。
- **FASTopic。** 更新，在超大规模语料上比BERTopic快。
- **基于LLM的标签。** 运行任何聚类，然后提示模型命名每个聚类。

## 交付它

将结果保存为 `outputs/skill-topic-picker.md`。

## 练习

1. **简单。** 在20 Newsgroups数据集上拟合5主题LDA。打印每个主题的top 10词。手工标记每个主题。算法找到真实类别了吗？
2. **中等。** 在相同20 Newsgroups子集上拟合BERTopic。比较找到的主题数、顶部词和定性连贯性与LDA。哪个更清晰地呈现真实类别？
3. **困难。** 在你的语料上计算LDA和BERTopic的c_v连贯性。每个运行5、10、20、50主题。绘制连贯性vs主题数。报告哪个方法跨主题数更稳定。

## 关键术语

| 术语      | 通俗说法       | 实际含义                                            |
| --------- | -------------- | --------------------------------------------------- |
| 主题      | 语料关于的东西 | 词上的概率分布（LDA）或相似文档的聚类（BERTopic）。 |
| 混合成员  | 文档是多主题   | LDA为每个文档分配所有主题上的分布。                 |
| UMAP      | 降维           | 保留局部结构的流形学习；BERTopic中使用。            |
| HDBSCAN   | 密度聚类       | 找到可变大小聚类；产生"噪声"标签(-1)给离群值。      |
| c_v连贯性 | 主题质量指标   | 滑动窗口内顶部主题词的平均逐点互信息。              |

## 延伸阅读

- [Blei, Ng, Jordan (2003). Latent Dirichlet Allocation](https://www.jmlr.org/papers/volume3/blei03a/blei03a.pdf) — LDA论文。
- [Grootendorst (2022). BERTopic: Neural topic modeling with a class-based TF-IDF procedure](https://arxiv.org/abs/2203.05794) — BERTopic论文。
- [Röder, Both, Hinneburg (2015). Exploring the Space of Topic Coherence Measures](https://svn.aksw.org/papers/2015/WSDM_Topic_Evaluation/public.pdf) — 引入c_v和相关指标的论文。
- [BERTopic文档](https://maartengr.github.io/BERTopic/) — 生产参考。优秀示例。
