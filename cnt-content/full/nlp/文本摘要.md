---
title: 文本摘要
description: 理解抽取式摘要、生成式摘要和ROUGE评估指标
module: nlp
difficulty: intermediate
tags:
  - 文本摘要
  - ROUGE
  - BART
  - 抽取式
  - 生成式
related:
  - nlp/文本处理
  - nlp/文本生成
  - nlp/文本CNN与RNN
  - nlp/问答系统
prerequisites:
  - 'nlp/词袋模型与TF-IDF'
---

# 文本摘要

> 抽取式选择句子。生成式写新句子。ROUGE衡量重叠。生产系统两者都用。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 5 · 09（Seq2Seq），Phase 5 · 10（注意力机制）
**时间:** ~75 分钟

## 问题

一篇5000字的文章。用户需要200字。两种方法：

- **抽取式摘要。** 从原文中选择最重要的句子。快速、安全（从不产生幻觉），但笨拙。
- **生成式（抽象式）摘要。** 写新句子捕获关键信息。流畅、简洁，但可能产生幻觉。

生产系统两者都用：抽取式作为快速基线或安全后备，生成式用于高质量输出。

## 概念

**ROUGE（面向召回的摘要评估替补）。** 衡量摘要与参考之间的n-gram重叠。三个变体：

- **ROUGE-1。** 单词重叠。精度、召回、F1。
- **ROUGE-2。** 二元组重叠。捕获一些流畅性。
- **ROUGE-L。** 最长公共子序列。捕获词序。

ROUGE是语料级指标。对比较系统有用，对单个摘要不可靠。高ROUGE不保证好摘要；低ROUGE不保证坏摘要。

**抽取式方法。** TextRank（基于图的句子排序）、基于特征的分类（句子位置、词频、标题词）、神经模型（BERTScore + 句子选择）。

**生成式方法。** BART、T5、PEGASUS、GPT。编码器-解码器Transformer在大规模摘要数据上训练。PEGASUS在摘要上特别强，因为它的预训练目标（间隙句子生成）直接模拟了摘要。

## 构建它

### 步骤 1：ROUGE评分

```python
from collections import Counter


def lcs_length(x, y):
    m, n = len(x), len(y)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if x[i - 1] == y[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]


def rouge_n(hypothesis, references, n=1):
    hyp_ngrams = Counter(tuple(hypothesis[i:i + n]) for i in range(len(hypothesis) - n + 1))
    overlap = 0
    for ref in references:
        ref_ngrams = Counter(tuple(ref[i:i + n]) for i in range(len(ref) - n + 1))
        overlap += sum((hyp_ngrams & ref_ngrams).values())
    precision = overlap / sum(hyp_ngrams.values()) if hyp_ngrams else 0
    recall = overlap / sum(sum(Counter(tuple(ref[i:i + n]) for i in range(len(ref) - n + 1)).values()) for ref in references) if references else 0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0
    return {"precision": precision, "recall": recall, "f1": f1}


def rouge_l(hypothesis, references):
    lcs = sum(lcs_length(hypothesis, ref) for ref in references)
    precision = lcs / len(hypothesis) if hypothesis else 0
    recall = lcs / sum(len(ref) for ref in references) if references else 0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0
    return {"precision": precision, "recall": recall, "f1": f1}
```

### 步骤 2：TextRank抽取式摘要

```python
import math


def sentence_similarity(s1, s2):
    words1, words2 = set(s1.lower().split()), set(s2.lower().split())
    overlap = words1 & words2
    if not overlap:
        return 0.0
    return len(overlap) / (math.log(len(words1)) + math.log(len(words2)) + 1e-10)


def textrank(sentences, top_k=3, damping=0.85, iterations=50):
    n = len(sentences)
    scores = [1.0 / n] * n
    sim_matrix = [[sentence_similarity(sentences[i], sentences[j]) for j in range(n)] for i in range(n)]
    for _ in range(iterations):
        new_scores = [0.0] * n
        for i in range(n):
            rank_sum = sum(sim_matrix[j][i] * scores[j] for j in range(n) if j != i)
            new_scores[i] = (1 - damping) / n + damping * rank_sum
        norm = sum(new_scores)
        scores = [s / norm for s in new_scores] if norm else new_scores
    ranked = sorted(range(n), key=lambda i: -scores[i])
    return [sentences[i] for i in sorted(ranked[:top_k])]
```

### 步骤 3：使用BART生成式摘要

```python
from transformers import pipeline

summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
article = "..."  # 你的长文本
summary = summarizer(article, max_length=130, min_length=30, do_sample=False)
print(summary[0]["summary_text"])
```

BART-large-CNN在CNN/DailyMail数据集上训练。对新闻文章效果好。对其他领域，微调或使用PEGASUS。

## 使用它

| 场景             | 选择                             |
| ---------------- | -------------------------------- |
| 快速、安全的摘要 | TextRank或基于特征的抽取式       |
| 高质量新闻摘要   | BART-large-CNN                   |
| 学术/科学摘要    | 专利数据上微调的PEGASUS          |
| 长文档摘要       | 分块 + 摘要 + 合并（map-reduce） |
| 对话摘要         | BART或T5，在对话数据上微调       |

## 交付它

将结果保存为 `outputs/prompt-summarizer-picker.md`。

## 练习

1. **简单。** 在10篇文章上计算ROUGE-1和ROUGE-L。验证抽取式摘要的ROUGE-L通常高于生成式（它重用原文句子）。
2. **中等。** 在领域特定数据集上微调BART摘要器。与基础模型比较ROUGE。记录领域适应提升最大的地方。
3. **困难。** 构建map-reduce摘要流水线：分块长文档，独立摘要每块，摘要摘要。在长文档上与端到端摘要比较ROUGE和延迟。

## 关键术语

| 术语     | 通俗说法 | 实际含义                                     |
| -------- | -------- | -------------------------------------------- |
| ROUGE    | 摘要分数 | 摘要与参考之间的n-gram重叠指标。             |
| 抽取式   | 选择句子 | 从原文中选择句子作为摘要。                   |
| 生成式   | 写新句子 | 生成原文中没有的新句子。                     |
| TextRank | 图排序   | 基于图算法的句子重要性排序。                 |
| BART     | 摘要模型 | 在摘要数据上训练的编码器-解码器Transformer。 |

## 延伸阅读

- [Lin (2004). ROUGE: A Package for Automatic Evaluation of Summaries](https://aclanthology.org/W04-1013/) — ROUGE论文。
- [Lewis et al. (2019). BART: Denoising Sequence-to-Sequence Pre-training](https://arxiv.org/abs/1910.13461) — BART。
- [Zhang et al. (2020). PEGASUS: Pre-training with Extracted Gap-sentences for Abstractive Summarization](https://arxiv.org/abs/1912.08777) — PEGASUS。
