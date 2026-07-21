---
title: GloVe、FastText与子词嵌入
description: 理解GloVe共现矩阵分解、FastText子词嵌入和BPE子词分词
module: nlp
difficulty: intermediate
tags:
  - GloVe
  - FastText
  - BPE
  - 子词嵌入
  - 共现矩阵
related:
  - nlp/子词分词
  - nlp/自然语言推理
  - nlp/LLM评估框架
prerequisites:
  - 'nlp/词袋模型与TF-IDF'
---

# GloVe、FastText与子词嵌入

> Word2Vec为每个词训练一个嵌入。GloVe分解了共现矩阵。FastText嵌入词的碎片。BPE桥接到Transformer。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 5 · 03（从零构建Word2Vec）
**时间:** ~45 分钟

## 问题

Word2Vec留下了两个开放问题。

首先，有一条并行的研究路线直接分解共现矩阵（LSA、HAL），而不是做在线skip-gram更新。Word2Vec的迭代方法从根本上更好吗，还是差异只是两种方法处理计数方式的假象？**GloVe**回答了这个问题：精心选择损失的矩阵分解匹配或超越Word2Vec，且训练成本更低。

其次，两种方法都没有为从未见过的词提供方案。`Zoomer-approved`、`dogecoin`、上周创造的任何专有名词、罕见词根的每种屈折形式。**FastText**通过嵌入字符n-gram修复了这个问题：一个词是其部分之和，包括语素，所以即使是词外词也能得到合理的向量。

第三，Transformer到来后，问题再次转变。词级词表上限约一百万条目；真实语言比这更开放。**字节对编码 (BPE)** 及其亲属通过学习覆盖一切的高频子词单元词表解决了这个问题。每个现代LLM的每个现代分词器都是子词分词器。

本课程遍历三者，然后解释何时选择哪个。

## 概念

**GloVe（全局向量）。** 构建词-词共现矩阵 `X`，其中 `X[i][j]` 是词 `j` 在词 `i` 上下文中出现的频率。训练向量使得 `v_i · v_j + b_i + b_j ≈ log(X[i][j])`。对损失加权使频繁对不占主导。完成。

**FastText。** 一个词是其字符n-gram之和加上词本身。`where` 变为 `<wh, whe, her, ere, re>, <where>`。词向量是这些组件向量之和。像Word2Vec一样训练。好处：未见词（`whereupon`）从已知n-gram组合。

**BPE（字节对编码）。** 从单个字节（或字符）的词表开始。计算语料库中每个相邻对的出现次数。将最频繁的对合并为新token。重复 `k` 次迭代。结果：`k + 256` 个token的词表，其中频繁序列（`ing`、`tion`、`the`）是单个token，罕见词被分解为熟悉的片段。每个句子都能被分词为某种东西。

## 构建它

### GloVe：分解共现矩阵

```python
import numpy as np
from collections import Counter


def build_cooccurrence(docs, window=5):
    pair_counts = Counter()
    vocab = {}
    for doc in docs:
        for token in doc:
            if token not in vocab:
                vocab[token] = len(vocab)
    for doc in docs:
        indexed = [vocab[t] for t in doc]
        for i, center in enumerate(indexed):
            for j in range(max(0, i - window), min(len(indexed), i + window + 1)):
                if i != j:
                    distance = abs(i - j)
                    pair_counts[(center, indexed[j])] += 1.0 / distance
    return vocab, pair_counts


def glove_train(vocab, pair_counts, dim=16, epochs=100, lr=0.05, x_max=100, alpha=0.75, seed=0):
    n = len(vocab)
    rng = np.random.default_rng(seed)
    W = rng.normal(0, 0.1, size=(n, dim))
    W_tilde = rng.normal(0, 0.1, size=(n, dim))
    b = np.zeros(n)
    b_tilde = np.zeros(n)

    for epoch in range(epochs):
        for (i, j), x_ij in pair_counts.items():
            weight = (x_ij / x_max) ** alpha if x_ij < x_max else 1.0
            diff = W[i] @ W_tilde[j] + b[i] + b_tilde[j] - np.log(x_ij)
            coef = weight * diff

            grad_W_i = coef * W_tilde[j]
            grad_W_tilde_j = coef * W[i]
            W[i] -= lr * grad_W_i
            W_tilde[j] -= lr * grad_W_tilde_j
            b[i] -= lr * coef
            b_tilde[j] -= lr * coef

    return W + W_tilde
```

两个值得命名的要点。加权函数 `f(x) = (x/x_max)^alpha` 降权非常频繁的对（如 `(the, and)`）使它们不主导损失。最终嵌入是 `W`（中心）和 `W_tilde`（上下文）表之和。求和是已发表的技巧，往往优于只用一个。

### FastText：子词感知嵌入

```python
def char_ngrams(word, n_min=3, n_max=6):
    wrapped = f"<{word}>"
    grams = {wrapped}
    for n in range(n_min, n_max + 1):
        for i in range(len(wrapped) - n + 1):
            grams.add(wrapped[i:i + n])
    return grams
```

```python
>>> char_ngrams("where")
{'<where>', '<wh', 'whe', 'her', 'ere', 're>', '<whe', 'wher', 'here', 'ere>', '<wher', 'where', 'here>'}
```

每个词由其n-gram集合表示（通常3到6个字符）。词嵌入是其n-gram嵌入之和。对于skip-gram训练，在Word2Vec使用单个向量的地方插入这个。

```python
def fasttext_vector(word, ngram_table):
    grams = char_ngrams(word)
    vecs = [ngram_table[g] for g in grams if g in ngram_table]
    if not vecs:
        return None
    return np.sum(vecs, axis=0)
```

对于未见词，只要其某些n-gram已知，你仍然能得到向量。`whereupon` 与 `where` 共享 `<wh`、`her`、`ere` 和 `<where`，所以两者在空间中靠近。

### BPE：学习子词词表

```python
def learn_bpe(corpus, k_merges):
    vocab = Counter()
    for word, freq in corpus.items():
        tokens = tuple(word) + ("</w>",)
        vocab[tokens] = freq

    merges = []
    for _ in range(k_merges):
        pair_freq = Counter()
        for tokens, freq in vocab.items():
            for a, b in zip(tokens, tokens[1:]):
                pair_freq[(a, b)] += freq
        if not pair_freq:
            break
        best = pair_freq.most_common(1)[0][0]
        merges.append(best)

        new_vocab = Counter()
        for tokens, freq in vocab.items():
            new_tokens = []
            i = 0
            while i < len(tokens):
                if i + 1 < len(tokens) and (tokens[i], tokens[i + 1]) == best:
                    new_tokens.append(tokens[i] + tokens[i + 1])
                    i += 2
                else:
                    new_tokens.append(tokens[i])
                    i += 1
            new_vocab[tuple(new_tokens)] = freq
        vocab = new_vocab
    return merges


def apply_bpe(word, merges):
    tokens = list(word) + ["</w>"]
    for a, b in merges:
        new_tokens = []
        i = 0
        while i < len(tokens):
            if i + 1 < len(tokens) and tokens[i] == a and tokens[i + 1] == b:
                new_tokens.append(a + b)
                i += 2
            else:
                new_tokens.append(tokens[i])
                i += 1
        tokens = new_tokens
    return tokens
```

```python
>>> corpus = Counter({"low": 5, "lower": 2, "newest": 6, "widest": 3})
>>> merges = learn_bpe(corpus, k_merges=10)
>>> apply_bpe("lowest", merges)
['low', 'est</w>']
```

第一次迭代合并最常见的相邻对。足够迭代后，频繁子串（`low`、`est`、`tion`）成为单个token，罕见词干净地分解。

真正的GPT / BERT / T5分词器学习30k-100k次合并。结果：任何文本都被分词为有界长度的已知ID序列，永远没有OOV。

## 使用它

实践中，你很少自己训练这些。你加载预训练检查点。

```python
import fasttext.util
fasttext.util.download_model("en", if_exists="ignore")
ft = fasttext.load_model("cc.en.300.bin")
print(ft.get_word_vector("whereupon").shape)
print(ft.get_word_vector("zoomerapproved").shape)
```

Transformer时代的BPE风格子词分词：

```python
from transformers import AutoTokenizer

tok = AutoTokenizer.from_pretrained("gpt2")
print(tok.tokenize("unbelievably tokenized"))
```

```
['un', 'bel', 'iev', 'ably', 'Ġtoken', 'ized']
```

`Ġ` 前缀标记词边界（GPT-2约定）。每个现代分词器都是BPE变体、WordPiece (BERT) 或 SentencePiece (T5, LLaMA)。

### 何时选择哪个

| 场景                                                 | 选择                                   |
| ---------------------------------------------------- | -------------------------------------- |
| 预训练通用词向量，无需OOV容忍                        | GloVe 300d                             |
| 预训练通用词向量，必须处理拼写错误/新词/形态丰富语言 | FastText                               |
| 任何进入Transformer的任务（训练或推理）              | 模型自带的分词器。永远不要替换。       |
| 从零训练自己的语言模型                               | 先在语料上训练BPE或SentencePiece分词器 |
| 线性模型的生产文本分类                               | 仍然用TF-IDF。课程02。                 |

## 交付它

将结果保存为 `outputs/skill-embeddings-picker.md`。

## 练习

1. **简单。** 运行 `char_ngrams("playing")` 和 `char_ngrams("played")`。计算两个n-gram集合的Jaccard重叠。你应该看到大量共享片段（`pla`、`lay`、`play`），这就是为什么FastText在形态变体间迁移良好。
2. **中等。** 扩展 `learn_bpe` 以跟踪词表增长。绘制每个语料字符的token数作为合并次数的函数。你应该看到开始时快速压缩，在约2-3字符/token附近渐近。
3. **困难。** 在莎士比亚全集上训练1k合并的BPE。比较常见词与罕见专有名词的分词。测量前后的每词平均token数。写下让你惊讶的地方。

## 关键术语

| 术语      | 通俗说法        | 实际含义                                                              |
| --------- | --------------- | --------------------------------------------------------------------- |
| 共现矩阵  | 词-词频率表     | `X[i][j]` = 词 `j` 在词 `i` 窗口中出现的频率。                        |
| 子词      | 词的片段        | 字符n-gram (FastText) 或学习到的token (BPE/WordPiece/SentencePiece)。 |
| BPE       | 字节对编码      | 迭代合并最频繁的相邻对直到词表达到目标大小。                          |
| OOV       | 词外            | 模型从未见过的词。Word2Vec/GloVe失败。FastText和BPE处理它。           |
| 字节级BPE | 原始字节上的BPE | GPT-2的方案。词表从256个字节开始，所以永远没有OOV。                   |

## 延伸阅读

- [Pennington, Socher, Manning (2014). GloVe: Global Vectors for Word Representation](https://nlp.stanford.edu/pubs/glove.pdf) — GloVe论文，七页，仍然是损失的最佳推导。
- [Bojanowski et al. (2017). Enriching Word Vectors with Subword Information](https://arxiv.org/abs/1607.04606) — FastText。
- [Sennrich, Haddow, Birch (2016). Neural Machine Translation of Rare Words with Subword Units](https://arxiv.org/abs/1508.07909) — 将BPE引入现代NLP的论文。
- [Hugging Face分词器摘要](https://huggingface.co/docs/transformers/tokenizer_summary) — BPE、WordPiece和SentencePiece在实践中如何不同。
