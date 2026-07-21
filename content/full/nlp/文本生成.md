---
title: Transformer前的文本生成
description: '理解n-gram、RNN语言模型和束搜索的文本生成基础'
module: nlp
difficulty: intermediate
tags:
  - 文本生成
  - 'n-gram'
  - 语言模型
  - 束搜索
  - 温度采样
related:
  - nlp/实体链接
  - nlp/文本处理
  - nlp/文本摘要
  - nlp/文本CNN与RNN
prerequisites:
  - 'nlp/词袋模型与TF-IDF'
---

# Transformer前的文本生成

> 在Transformer之前，文本生成是n-gram计数和RNN。两者都有效。两者都有特定的失败模式，解释了为什么Transformer赢了。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 5 · 03（Word2Vec），Phase 5 · 08（文本CNN + RNN）
**时间:** ~75 分钟

## 问题

给定"The cat sat on the"，预测下一个词。语言建模将这个问题泛化到任意上下文：给定前缀，预测词表上的分布。文本生成是重复采样：采样一个token，附加到上下文，重复。

本课程覆盖Transformer前的两种方法：n-gram语言模型和RNN语言模型。两者都教授仍然适用于LLM的采样策略（温度、top-k、top-p、束搜索）。

## 概念

**n-gram语言模型。** `P(w_t | w_{t-n+1}...w_{t-1})` 从计数估计：`count(n-gram) / count((n-1)-gram)`。简单、快速、可解释。在n > 5时因数据稀疏而失败。回退和插值平滑有帮助但不修复根本问题。

**RNN语言模型。** 维护压缩所有先前token的隐藏状态。`P(w_t | h_{t-1})` 其中 `h_t = f(W x_t + U h_{t-1})`。理论上无限上下文。实践中梯度消失将有效上下文限制在约100个token。

**采样策略。** 从预测分布中采样下一个token的方式控制输出质量。

- **贪心。** 每步选最高概率token。确定性但重复。
- **温度。** 在softmax前除以logits。`T < 1` 使分布更尖锐（更确定性）。`T > 1` 使其更平坦（更多样）。`T = 0` 等于贪心。
- **Top-k。** 只从概率最高的k个token中采样。防止低概率token。
- **Top-p（核采样）。** 从累积概率达到p的最小token集中采样。比top-k更自适应。
- **束搜索。** 保持前k个部分序列存活。选择总概率最高的完整序列。

## 构建它

### 步骤 1：二元组语言模型

```python
from collections import Counter, defaultdict
import math


class BigramLM:
    def __init__(self, alpha=1.0):
        self.alpha = alpha
        self.bigram_counts = Counter()
        self.unigram_counts = Counter()
        self.vocab = set()

    def train(self, sentences):
        for sent in sentences:
            tokens = ["<s>"] + sent + ["</s>"]
            for i in range(len(tokens) - 1):
                self.bigram_counts[(tokens[i], tokens[i + 1])] += 1
                self.unigram_counts[tokens[i]] += 1
                self.vocab.add(tokens[i])
            self.unigram_counts[tokens[-1]] += 1
            self.vocab.add(tokens[-1])

    def prob(self, word, context):
        bigram = (context, word)
        numerator = self.bigram_counts[bigram] + self.alpha
        denominator = self.unigram_counts[context] + self.alpha * len(self.vocab)
        return numerator / denominator

    def generate(self, max_len=50):
        tokens = ["<s>"]
        for _ in range(max_len):
            probs = [(w, self.prob(w, tokens[-1])) for w in self.vocab]
            total = sum(p for _, p in probs)
            probs = [(w, p / total) for w, p in probs]
            import random
            next_word = random.choices([w for w, _ in probs], weights=[p for _, p in probs])[0]
            if next_word == "</s>":
                break
            tokens.append(next_word)
        return tokens[1:]
```

### 步骤 2：带温度和top-p的RNN语言模型

```python
import torch
import torch.nn as nn
import torch.nn.functional as F


class RNNLM(nn.Module):
    def __init__(self, vocab_size, embed_dim, hidden_dim):
        super().__init__()
        self.embed = nn.Embedding(vocab_size, embed_dim)
        self.lstm = nn.LSTM(embed_dim, hidden_dim, batch_first=True)
        self.fc = nn.Linear(hidden_dim, vocab_size)

    def forward(self, x, hidden=None):
        e = self.embed(x)
        out, hidden = self.lstm(e, hidden)
        logits = self.fc(out)
        return logits, hidden


def sample_with_temperature(logits, temperature=1.0, top_p=0.9):
    logits = logits / max(temperature, 1e-8)
    probs = F.softmax(logits, dim=-1)
    sorted_probs, sorted_indices = torch.sort(probs, descending=True)
    cumulative_probs = torch.cumsum(sorted_probs, dim=-1)
    sorted_indices_to_remove = cumulative_probs - sorted_probs > top_p
    sorted_probs[sorted_indices_to_remove] = 0
    sorted_probs = sorted_probs / sorted_probs.sum()
    next_token = torch.multinomial(sorted_probs, 1)
    return sorted_indices.gather(-1, next_token)
```

### 步骤 3：困惑度评估

```python
def perplexity(model, data, tokenizer):
    model.eval()
    total_log_prob = 0.0
    total_tokens = 0
    with torch.no_grad():
        for sentence in data:
            tokens = tokenizer.encode(sentence)
            input_ids = torch.tensor([tokens[:-1]])
            target_ids = torch.tensor([tokens[1:]])
            logits, _ = model(input_ids)
            log_probs = F.log_softmax(logits, dim=-1)
            for i, target in enumerate(target_ids[0]):
                total_log_prob += log_probs[0, i, target].item()
                total_tokens += 1
    return math.exp(-total_log_prob / total_tokens)
```

困惑度 = `exp(-平均对数概率)`。越低越好。GPT-2在Penn Treebank上约18.3。好的二元组模型约140。

## 使用它

| 场景            | 选择                      |
| --------------- | ------------------------- |
| 快速原型，无GPU | 二元组/三元组LM           |
| 中等质量，流式  | LSTM LM                   |
| 生产质量        | Transformer LM（Phase 7） |
| 创意写作        | 高温度 + top-p            |
| 事实生成        | 低温度 + 束搜索           |

## 交付它

将结果保存为 `outputs/prompt-generation-designer.md`。

## 练习

1. **简单。** 在小型语料上训练二元组LM。生成10个句子。定性评估流畅性。
2. **中等。** 在相同语料上训练LSTM LM。比较困惑度。比较生成质量。
3. **困难。** 实现束搜索解码。与贪心和核采样比较。测量多样性与质量的权衡。

## 关键术语

| 术语   | 通俗说法     | 实际含义                                      |
| ------ | ------------ | --------------------------------------------- |
| n-gram | n词序列      | 连续n个token。n-gram LM从计数估计P(next)。    |
| 困惑度 | 模型困惑程度 | `exp(-平均对数概率)`。越低 = 模型越不惊讶。   |
| 温度   | 采样随机性   | Softmax前的logits除数。<1更确定性，>1更多样。 |
| Top-p  | 核采样       | 从累积概率达到p的最小token集中采样。          |
| 束搜索 | 保持k个假设  | 每步保持前k个部分序列存活。                   |

## 延伸阅读

- [Jurafsky and Martin — N-gram Language Models](https://web.stanford.edu/~jurafsky/slp3/3.pdf) — 经典教科书处理。
- [Holtzman et al. (2020). The Curious Case of Neural Text Degeneration](https://arxiv.org/abs/1904.09751) — 核采样论文。
