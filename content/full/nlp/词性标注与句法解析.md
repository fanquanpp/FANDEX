---
title: 词性标注与句法解析
description: 理解词性标注、依存解析和HMM/CRF/Viterbi算法
module: nlp
difficulty: beginner
tags:
  - 词性标注
  - 依存解析
  - HMM
  - Viterbi
  - 'Penn Treebank'
related:
  - 'nlp/词袋模型与TF-IDF'
  - nlp/词嵌入Word2Vec
  - nlp/对话状态跟踪
  - nlp/多语言NLP
prerequisites:
  - 'nlp/词袋模型与TF-IDF'
---

# 词性标注与句法解析

> 语法曾一度不流行。然后每个LLM流水线都需要验证结构化提取，它又回来了。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 5 · 01（文本处理），Phase 2 · 14（朴素贝叶斯）
**时间:** ~45 分钟

## 问题

课程01承诺词形还原需要词性标签。不知道 `running` 是动词，词形还原器无法将其归约为 `run`。不知道 `better` 是形容词，无法归约为 `good`。

那个承诺隐藏了整个子领域。词性标注分配语法类别。句法解析恢复句子的树结构：哪个词修饰哪个，哪个动词支配哪个论元。经典NLP花了二十年完善两者。然后深度学习将它们折叠为预训练Transformer上的token分类任务，研究社区继续前进。

应用社区没有。每个结构化提取流水线仍在底层使用POS和依存树。LLM生成的JSON根据语法约束验证。问答系统使用依存解析分解查询。机器翻译质量评估器检查解析树的对齐。

值得了解。本课程介绍标签集、基线，以及你停止从零实现并调用spaCy的那个点。

## 概念

**词性标注**为每个token标记语法类别。**Penn Treebank (PTB)** 标签集是英语默认。36个标签，区分随意读者觉得繁琐的：`NN` 单数名词、`NNS` 复数名词、`NNP` 专有名词单数、`VBD` 动词过去式、`VBZ` 动词第三人称单数现在时等。**Universal Dependencies (UD)** 标签集更粗（17个标签）且语言无关；成为跨语言工作的默认。

```
The/DET cats/NOUN were/AUX running/VERB at/ADP 3pm/NOUN ./PUNCT
```

**句法解析**产生树。两种主要风格：

- **成分解析。** 名词短语、动词短语、介词短语互相嵌套。输出是非终结类别（NP、VP、PP）的树，词作为叶子。
- **依存解析。** 每个词有一个支配词，标记语法关系。输出是每条边为 (head, dependent, relation) 三元组的树。

依存解析在2010年代获胜，因为它跨语言泛化更干净，特别是自由语序语言。

```
running is ROOT
cats is nsubj of running
were is aux of running
at is prep of running
3pm is pobj of at
```

## 构建它

### 步骤 1：最频繁标签基线

最笨但有效的POS标注器。对每个词，预测它在训练中最常有的标签。

```python
from collections import Counter, defaultdict


def train_mft(train_examples):
    word_tag_counts = defaultdict(Counter)
    all_tags = Counter()
    for tokens, tags in train_examples:
        for token, tag in zip(tokens, tags):
            word_tag_counts[token.lower()][tag] += 1
            all_tags[tag] += 1
    word_best = {w: c.most_common(1)[0][0] for w, c in word_tag_counts.items()}
    default_tag = all_tags.most_common(1)[0][0]
    return word_best, default_tag


def predict_mft(tokens, word_best, default_tag):
    return [word_best.get(t.lower(), default_tag) for t in tokens]
```

在Brown语料上，这个基线达到约85%准确率。不好，但没有严肃模型应该低于这个底线。

### 步骤 2：二元HMM标注器

建模序列的联合概率：

```
P(tags, words) = prod P(tag_i | tag_{i-1}) * P(word_i | tag_i)
```

两个表：转移概率（给定前一个标签的标签），发射概率（给定标签的词）。两者从带Laplace平滑的计数估计。用Viterbi解码（标签格上的动态规划）。

```python
import math


def train_hmm(train_examples, alpha=0.01):
    transitions = defaultdict(Counter)
    emissions = defaultdict(Counter)
    tags = set()
    vocab = set()

    for tokens, ts in train_examples:
        prev = "<BOS>"
        for token, tag in zip(tokens, ts):
            transitions[prev][tag] += 1
            emissions[tag][token.lower()] += 1
            tags.add(tag)
            vocab.add(token.lower())
            prev = tag
        transitions[prev]["<EOS>"] += 1

    return transitions, emissions, tags, vocab


def log_prob(table, given, key, smooth_denom, alpha):
    return math.log((table[given].get(key, 0) + alpha) / smooth_denom)


def viterbi(tokens, transitions, emissions, tags, vocab, alpha=0.01):
    tags_list = list(tags)
    n = len(tokens)
    V = [[0.0] * len(tags_list) for _ in range(n)]
    back = [[0] * len(tags_list) for _ in range(n)]

    for j, tag in enumerate(tags_list):
        em_denom = sum(emissions[tag].values()) + alpha * (len(vocab) + 1)
        tr_denom = sum(transitions["<BOS>"].values()) + alpha * (len(tags_list) + 1)
        tr = log_prob(transitions, "<BOS>", tag, tr_denom, alpha)
        em = log_prob(emissions, tag, tokens[0].lower(), em_denom, alpha)
        V[0][j] = tr + em
        back[0][j] = 0

    for i in range(1, n):
        for j, tag in enumerate(tags_list):
            em_denom = sum(emissions[tag].values()) + alpha * (len(vocab) + 1)
            em = log_prob(emissions, tag, tokens[i].lower(), em_denom, alpha)
            best_prev = 0
            best_score = -1e30
            for k, prev_tag in enumerate(tags_list):
                tr_denom = sum(transitions[prev_tag].values()) + alpha * (len(tags_list) + 1)
                tr = log_prob(transitions, prev_tag, tag, tr_denom, alpha)
                score = V[i - 1][k] + tr + em
                if score > best_score:
                    best_score = score
                    best_prev = k
            V[i][j] = best_score
            back[i][j] = best_prev

    last_best = max(range(len(tags_list)), key=lambda j: V[n - 1][j])
    path = [last_best]
    for i in range(n - 1, 0, -1):
        path.append(back[i][path[-1]])
    return [tags_list[j] for j in reversed(path)]
```

Brown上的二元HMM达到约93%准确率。从85%到93%的跳跃主要来自转移概率 — 模型学到 `DET NOUN` 常见而 `NOUN DET` 罕见。

### 步骤 3：为什么现代标注器超越这个

转移+发射概率是局部的。它们不能捕获 `saw` 在"I bought a saw"中是名词但在"I saw the movie"中是动词。带任意特征（后缀、词形、前后词、词本身）的CRF达到约97%。BiLSTM-CRF或Transformer达到约98%+。

这个任务的天花板由标注者分歧设定。人类标注者在Penn Treebank上约97%时间一致。超过98%的模型可能过拟合测试集。

### 步骤 4：依存解析概要

从零实现完整依存解析超出范围；经典教科书处理在Jurafsky和Martin中。两个值得了解的经典家族：

- **基于转移的**解析器（arc-eager、arc-standard）像移进-归约解析器：读取token，移进到栈，应用创建弧的归约动作。贪心解码快。经典实现是MaltParser。现代神经版本：Chen和Manning的基于转移的解析器。
- **基于图的**解析器（Eisner算法、Dozat-Manning双仿射）为每个可能的head-dependent边评分并选择最大生成树。更慢但更准确。

大多数应用工作，调用spaCy：

```python
import spacy

nlp = spacy.load("en_core_web_sm")
doc = nlp("The cats were running at 3pm.")
for token in doc:
    print(f"{token.text:10s} tag={token.tag_:5s} pos={token.pos_:6s} dep={token.dep_:10s} head={token.head.text}")
```

```
The        tag=DT    pos=DET    dep=det        head=cats
cats       tag=NNS   pos=NOUN   dep=nsubj      head=running
were       tag=VBD   pos=AUX    dep=aux        head=running
running    tag=VBG   pos=VERB   dep=ROOT       head=running
at         tag=IN    pos=ADP    dep=prep       head=running
3pm        tag=NN    pos=NOUN   dep=pobj       head=at
.          tag=.     pos=PUNCT  dep=punct      head=running
```

从下往上读 `dep` 列，句子的语法结构自然呈现。

## 使用它

每个生产NLP库都作为标准流水线的一部分提供POS和依存解析器。

- **spaCy**（`en_core_web_sm` / `md` / `lg` / `trf`）。快速、准确、与分词+NER+词形还原集成。`token.tag_` (Penn)、`token.pos_` (UD)、`token.dep_` (依存关系)。
- **Stanford NLP (stanza)**。Stanford CoreNLP的继任者。60+语言上SOTA。
- **trankit**。基于Transformer，良好UD准确率。
- **NLTK**。`pos_tag`。可用，慢，较旧。教学用。

### 2026年这仍然重要的地方

- **词形还原。** 课程01需要POS才能正确词形还原。始终。
- **LLM输出的结构化提取验证。** 验证生成的句子尊重语法约束（如主谓一致、必要修饰语）。
- **方面级情感。** 依存解析告诉你哪个形容词修饰哪个名词。
- **查询理解。** "movies directed by Wes Anderson starring Bill Murray" 通过解析分解为结构化约束。
- **跨语言迁移。** UD标签和依存关系是语言无关的，支持新语言的零样本结构化分析。
- **低计算流水线。** 如果你不能部署Transformer，POS + 依存解析 + 地名词典能让你走很远。

## 交付它

将结果保存为 `outputs/skill-grammar-pipeline.md`。

## 练习

1. **简单。** 在小型标注语料（如NLTK的Brown子集）上使用最频繁标签基线，测量保留句子的准确率。验证约85%结果。
2. **中等。** 训练上面的二元HMM并报告每标签精确率/召回率。HMM最混淆哪些标签？
3. **困难。** 使用spaCy的依存解析从1000句样本中提取主-谓-宾三元组。在50个手工标注三元组上评估。记录提取失败的地方（通常是被动语态、并列和省略主语）。

## 关键术语

| 术语                   | 通俗说法     | 实际含义                               |
| ---------------------- | ------------ | -------------------------------------- |
| POS标签                | 词的类型     | 语法类别。PTB有36个；UD有17个。        |
| Penn Treebank          | 标准标签集   | 英语特定。细粒度动词时态和名词数。     |
| Universal Dependencies | 多语言标签集 | 比PTB更粗；语言中立；跨语言工作默认。  |
| 依存解析               | 句子树       | 每个词有一个支配词，每条边有语法关系。 |
| Viterbi                | 动态规划     | 给定发射和转移找到最高概率标签序列。   |

## 延伸阅读

- [Jurafsky and Martin — Speech and Language Processing, 第8和18章](https://web.stanford.edu/~jurafsky/slp3/) — POS和解析的经典教科书处理。
- [Universal Dependencies项目](https://universaldependencies.org/) — 每个多语言解析器使用的跨语言标签集和树库集合。
- [spaCy语言特征指南](https://spacy.io/usage/linguistic-features) — `Token` 上暴露的每个属性的实用参考。
- [Chen and Manning (2014). A Fast and Accurate Dependency Parser using Neural Networks](https://nlp.stanford.edu/pubs/emnlp2014-depparser.pdf) — 将神经解析器带入主流的论文。
