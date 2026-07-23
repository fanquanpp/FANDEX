---
title: 词嵌入Word2Vec
description: 从零构建Word2Vec，理解词嵌入的几何与语义关系
module: nlp
difficulty: intermediate
tags:
  - 词嵌入
  - Word2Vec
  - 'Skip-gram'
  - 负采样
related:
  - 'nlp/词袋模型与TF-IDF'
  - nlp/词性标注与句法解析
  - nlp/对话状态跟踪
prerequisites:
  - 'nlp/词袋模型与TF-IDF'
---

# 词嵌入 — 从零构建Word2Vec

> 一个词由它周围的词决定。在这个想法上训练一个浅层网络，几何就自然涌现。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 5 · 02（BoW + TF-IDF），Phase 3 · 03（从零构建反向传播）
**时间:** ~75 分钟

## 问题

TF-IDF知道 `dog` 和 `puppy` 是不同的词。它不知道它们意思几乎相同。在 `dog` 上训练的分类器不能泛化到关于 `puppy` 的评论。你可以通过列同义词来修补，但在罕见术语、领域行话和你没有预料到的每种语言上都会失败。

你想要一个表示，其中 `dog` 和 `puppy` 在空间中靠得很近。`king - man + woman` 落在 `queen` 附近。在 `dog` 上训练的模型免费将一些信号转移到 `puppy`。

Word2Vec给了我们那个空间。两层神经网络，万亿token训练运行，2013年发表。架构几乎令人尴尬地简单。结果重塑了NLP十年。

## 概念

**分布假设**（Firth, 1957）："你将通过一个词周围的词来认识它。"如果两个词出现在相似的上下文中，它们可能意思相似。

Word2Vec有两种变体，都利用这个想法。

- **Skip-gram。** 给定中心词，预测周围词。`cat -> (the, sat, on)`，窗口大小为2。
- **CBOW（连续词袋）。** 给定周围词，预测中心词。`(the, sat, on) -> cat`。

Skip-gram训练较慢但处理罕见词更好。它成为默认选择。

网络有一个无非线性隐藏层。输入是词表上的one-hot向量。输出是词表上的softmax。训练后，你丢弃输出层。隐藏层权重就是嵌入。

```
one-hot(center) ── W ──▶ hidden (d维) ── W' ──▶ softmax(词表)
                          ^
                          这就是嵌入
```

技巧：10万词上的softmax代价太高。Word2Vec使用**负采样**将其转化为二分类任务。预测"这个上下文词是否出现在这个中心词附近，是或否"。每个训练对采样少量负（非共现）词，而不是计算整个词表的softmax。

## 构建它

### 步骤 1：从语料库生成训练对

```python
def skipgram_pairs(docs, window=2):
    pairs = []
    for doc in docs:
        for i, center in enumerate(doc):
            for j in range(max(0, i - window), min(len(doc), i + window + 1)):
                if i == j:
                    continue
                pairs.append((center, doc[j]))
    return pairs
```

窗口中每个(中心, 上下文)对都是一个正训练样本。

### 步骤 2：嵌入表

两个矩阵。`W` 是中心词嵌入表（你保留的那个）。`W'` 是上下文词表（通常丢弃，有时与 `W` 平均）。

```python
import numpy as np


def init_embeddings(vocab_size, dim, seed=0):
    rng = np.random.default_rng(seed)
    W = rng.normal(0, 0.1, size=(vocab_size, dim))
    W_prime = rng.normal(0, 0.1, size=(vocab_size, dim))
    return W, W_prime
```

### 步骤 3：负采样目标

对每个正对 `(center, context)`，从词表中采样 `k` 个随机词作为负样本。训练模型使正对的点积 `W[center] · W'[context]` 高，负对的低。

```python
def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-np.clip(x, -20, 20)))


def train_pair(W, W_prime, center_idx, context_idx, negative_indices, lr):
    v_c = W[center_idx]
    u_pos = W_prime[context_idx]
    u_negs = W_prime[negative_indices]

    pos_score = sigmoid(v_c @ u_pos)
    neg_scores = sigmoid(u_negs @ v_c)

    grad_center = (pos_score - 1) * u_pos
    for i, u in enumerate(u_negs):
        grad_center += neg_scores[i] * u

    W[context_idx] = W[context_idx]
    W_prime[context_idx] -= lr * (pos_score - 1) * v_c
    for i, neg_idx in enumerate(negative_indices):
        W_prime[neg_idx] -= lr * neg_scores[i] * v_c
    W[center_idx] -= lr * grad_center
```

魔法公式：正对上的逻辑损失（希望sigmoid接近1）加负对上的逻辑损失（希望sigmoid接近0）。梯度流向两个表。

### 步骤 4：在玩具语料上训练

```python
def train(docs, dim=16, window=2, k_neg=5, epochs=100, lr=0.05, seed=0):
    vocab = build_vocab(docs)
    vocab_size = len(vocab)
    rng = np.random.default_rng(seed)
    W, W_prime = init_embeddings(vocab_size, dim, seed=seed)
    pairs = skipgram_pairs(docs, window=window)

    for epoch in range(epochs):
        rng.shuffle(pairs)
        for center, context in pairs:
            c_idx = vocab[center]
            ctx_idx = vocab[context]
            negs = rng.integers(0, vocab_size, size=k_neg)
            negs = [n for n in negs if n != ctx_idx and n != c_idx]
            train_pair(W, W_prime, c_idx, ctx_idx, negs, lr)
    return vocab, W
```

在大语料上足够epoch后，共享上下文的词有相似的中心嵌入。在玩具语料上，你隐约看到效果。在数十亿token上，你戏剧性地看到它。

### 步骤 5：类比技巧

```python
def nearest(vocab, W, target_vec, topk=5, exclude=None):
    exclude = exclude or set()
    inv_vocab = {i: w for w, i in vocab.items()}
    norms = np.linalg.norm(W, axis=1, keepdims=True) + 1e-9
    W_norm = W / norms
    target = target_vec / (np.linalg.norm(target_vec) + 1e-9)
    sims = W_norm @ target
    order = np.argsort(-sims)
    out = []
    for i in order:
        if i in exclude:
            continue
        out.append((inv_vocab[i], float(sims[i])))
        if len(out) == topk:
            break
    return out


def analogy(vocab, W, a, b, c, topk=5):
    v = W[vocab[b]] - W[vocab[a]] + W[vocab[c]]
    return nearest(vocab, W, v, topk=topk, exclude={vocab[a], vocab[b], vocab[c]})
```

在预训练的300d Google News向量上：

```python
>>> analogy(vocab, W, "man", "king", "woman")
[('queen', 0.71), ('monarch', 0.62), ('princess', 0.59), ...]
```

`king - man + woman = queen`。不是因为模型知道什么是皇室。因为向量 `(king - man)` 捕获了类似"皇室"的东西，加到 `woman` 上落在皇室女性区域附近。

## 使用它

从零写Word2Vec是教学。生产NLP使用 `gensim`。

```python
from gensim.models import Word2Vec

sentences = [
    ["the", "cat", "sat", "on", "the", "mat"],
    ["the", "dog", "ran", "across", "the", "room"],
]

model = Word2Vec(
    sentences,
    vector_size=100,
    window=5,
    min_count=1,
    sg=1,
    negative=5,
    workers=4,
    epochs=30,
)

print(model.wv["cat"])
print(model.wv.most_similar("cat", topn=3))
```

真正工作中，你几乎从不自己训练Word2Vec。你下载预训练向量。

- **GloVe** — Stanford的共现矩阵分解方法。50d、100d、200d、300d检查点。良好通用覆盖。课程04专门覆盖GloVe。
- **fastText** — Facebook的Word2Vec扩展，嵌入字符n-gram。通过组合子词处理词外词。课程04。
- **Google News上的预训练Word2Vec** — 300d，300万词词表，2013年发布。至今每天被下载。

### Word2Vec在2026年何时仍然赢

- 轻量级领域特定检索。在笔记本上一小时训练医学摘要，获得通用模型无法捕获的专用向量。
- 类比式特征工程。`gender_vector = mean(man - woman pairs)`。从其他词中减去它获得性别中性轴。仍在公平性研究中使用。
- 可解释性。100d足够小，可以通过PCA或t-SNE绘图并实际看到聚类形成。
- 任何必须在无GPU设备上运行推理的地方。Word2Vec查找就是单行获取。

### Word2Vec在哪里失败

多义词墙。`bank` 有一个向量。`river bank` 和 `financial bank` 共享它。`table`（电子表格vs家具）共享它。下游分类器无法从向量区分词义。

上下文嵌入（ELMo、BERT、之后每个Transformer）通过根据周围上下文为每次出现的词产生不同向量解决了这个问题。这就是从Word2Vec到BERT的跳跃：从静态到上下文。Phase 7覆盖Transformer部分。

词外问题是另一个失败。Word2Vec从未见过 `Zoomer-approved` 如果它不在训练数据中。没有后备。fastText用子词组合修复这个（课程04）。

## 交付它

将结果保存为 `outputs/skill-embedding-probe.md`。

## 练习

1. **简单。** 在微型语料（20句关于猫和狗的句子）上运行训练循环。200个epoch后，验证 `nearest(vocab, W, W[vocab["cat"]])` 在前3中返回 `dog`。如果不是，增加epoch或词表。
2. **中等。** 添加高频词子采样。频率高于 `10^-5` 的词按与其频率成比例的概率从训练对中丢弃。测量对罕见词相似度的影响。
3. **困难。** 在20 Newsgroups语料上训练模型。计算两个偏差轴：`he - she` 和 `doctor - nurse`。将职业词投影到两个轴上。报告哪些职业有最大偏差差距。这是公平性研究人员使用的那种探测。

## 关键术语

| 术语       | 通俗说法       | 实际含义                                         |
| ---------- | -------------- | ------------------------------------------------ |
| 词嵌入     | 词作为向量     | 从上下文学习的密集、低维（通常100-300）表示。    |
| Skip-gram  | Word2Vec技巧   | 从中心词预测上下文词。比CBOW慢，对罕见词更好。   |
| 负采样     | 训练捷径       | 用对 `k` 个随机词的二分类替代整个词表的softmax。 |
| 静态嵌入   | 每词一向量     | 无论上下文相同向量。多义词失败。                 |
| 上下文嵌入 | 上下文敏感向量 | 基于周围词每次出现不同向量。Transformer产生的。  |
| OOV        | 词外           | 训练中未见过的词。Word2Vec无法为这些产生向量。   |

## 延伸阅读

- [Mikolov et al. (2013). Distributed Representations of Words and Phrases and their Compositionality](https://arxiv.org/abs/1310.4546) — 负采样论文。简短可读。
- [Rong, X. (2014). word2vec Parameter Learning Explained](https://arxiv.org/abs/1411.2738) — 最清晰的梯度推导。
- [gensim Word2Vec教程](https://radimrehurek.com/gensim/models/word2vec.html) — 实际有效的生产训练设置。
