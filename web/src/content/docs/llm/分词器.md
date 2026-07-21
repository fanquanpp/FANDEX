---
title: 分词器
description: '深入理解 LLM 分词器的工作原理，包括 BPE、WordPiece 和 Unigram 算法，以及特殊 token 的处理'
module: llm
difficulty: intermediate
tags:
  - tokenizer
  - BPE
  - WordPiece
  - Unigram
  - LLM
related:
  - llm/差分注意力V2
  - llm/多Token预测
  - llm/高级RAG
  - llm/构建分词器
prerequisites:
  - llm/安全护栏
---

# 分词器

> 分词器是 LLM 的入口。你输入的每一段文本都先经过分词器，被切割成 token 序列，然后才能被模型处理。理解分词器就是理解模型的边界——它能处理什么、不能处理什么、为什么有时候一个简单的单词会被拆成三四个 token。

**类型：** 构建
**语言：** Python
**前置条件：** Phase 10 导论
**预计时间：** ~60 分钟

## 学习目标

- 理解为什么 LLM 需要分词，以及不同分词策略的权衡
- 实现 BPE（Byte Pair Encoding）算法，理解其合并规则
- 理解 WordPiece 和 Unigram 分词器的区别
- 分析特殊 token（`<|endoftext|>`、`<|pad|>` 等）的作用和处理方式
- 评估分词器对模型性能的影响，包括多语言处理和 OOV 问题

## 为什么需要分词

LLM 不直接处理文本。它们处理数字——具体来说，是 token ID 序列。分词器就是文本和数字之间的桥梁。

三种基本策略：

| 策略   | 粒度     | 词表大小         | OOV 风险 | 示例                                |
| ------ | -------- | ---------------- | -------- | ----------------------------------- |
| 字符级 | 字符     | 小（~256）       | 无       | "hello" → ['h', 'e', 'l', 'l', 'o'] |
| 词级   | 完整词   | 大（100K+）      | 高       | "hello" → ['hello']                 |
| 子词级 | 子词单元 | 中等（32K-128K） | 低       | "unhappiness" → ['un', 'happiness'] |

子词分词是当前 LLM 的标准方案。它平衡了词表大小和表达能力：常见词保持完整，罕见词被拆成有意义的片段。

## BPE（Byte Pair Encoding）

BPE 是最广泛使用的子词分词算法。GPT 系列、LLaMA、Mistral 都使用 BPE 的变体。

### 算法原理

1. 从字符级词表开始
2. 统计所有相邻 token 对的出现频率
3. 合并频率最高的 token 对，加入词表
4. 重复步骤 2-3，直到词表达到目标大小

```python
from collections import Counter

def train_bpe(text, vocab_size=256, num_merges=100):
    """训练 BPE 分词器"""
    # 初始化：将文本拆分为字符序列
    tokens = list(text)
    vocab = set(tokens)

    merges = {}  # 记录合并规则

    for i in range(num_merges):
        if len(vocab) >= vocab_size:
            break

        # 统计相邻 token 对的频率
        pairs = Counter()
        for j in range(len(tokens) - 1):
            pairs[(tokens[j], tokens[j + 1])] += 1

        if not pairs:
            break

        # 找到频率最高的对
        best_pair = pairs.most_common(1)[0][0]

        # 创建新 token
        new_token = best_pair[0] + best_pair[1]
        vocab.add(new_token)
        merges[best_pair] = new_token

        # 在 token 序列中执行合并
        new_tokens = []
        j = 0
        while j < len(tokens):
            if (j < len(tokens) - 1 and
                tokens[j] == best_pair[0] and
                tokens[j + 1] == best_pair[1]):
                new_tokens.append(new_token)
                j += 2
            else:
                new_tokens.append(tokens[j])
                j += 1
        tokens = new_tokens

    return vocab, merges


def tokenize_with_bpe(text, merges):
    """使用训练好的 BPE 规则进行分词"""
    tokens = list(text)

    for (a, b), merged in merges.items():
        new_tokens = []
        j = 0
        while j < len(tokens):
            if (j < len(tokens) - 1 and
                tokens[j] == a and
                tokens[j + 1] == b):
                new_tokens.append(merged)
                j += 2
            else:
                new_tokens.append(tokens[j])
                j += 1
        tokens = new_tokens

    return tokens
```

### Byte-level BPE

现代 LLM 使用 byte-level BPE，它以 UTF-8 字节而非 Unicode 字符作为初始词表。这意味着：

- 词表基础大小固定为 256（所有可能的字节值）
- 任何文本都可以被编码，不会出现 OOV
- 多语言文本被统一处理

GPT-2 的分词器就是 byte-level BPE 的实现。它的词表大小为 50,257（256 个基础字节 + 50,000 个合并规则 + 1 个特殊 token）。

## WordPiece

WordPiece 被 BERT 及其衍生模型使用。与 BPE 的关键区别在于合并策略：

- **BPE**：选择频率最高的相邻对
- **WordPiece**：选择能最大增加语言模型似然的相邻对

实际实现中，WordPiece 使用一个近似指标：选择 `score = pair_freq / (freq_a * freq_b)` 最高的对。这倾向于合并那些各自频率不高但经常一起出现的 token。

```python
def train_wordpiece(text, vocab_size=30000, num_merges=100):
    """训练 WordPiece 分词器"""
    tokens = list(text)
    vocab = set(tokens)
    word_freqs = Counter(tokens)

    merges = {}

    for i in range(num_merges):
        if len(vocab) >= vocab_size:
            break

        pairs = Counter()
        pair_word_freqs = Counter()

        for j in range(len(tokens) - 1):
            pair = (tokens[j], tokens[j + 1])
            pairs[pair] += 1

        if not pairs:
            break

        # WordPiece 评分：pair_freq / (freq_a * freq_b)
        best_pair = max(pairs, key=lambda p: pairs[p] / (word_freqs[p[0]] * word_freqs[p[1]] + 1e-10))

        new_token = best_pair[0] + best_pair[1]
        vocab.add(new_token)
        merges[best_pair] = new_token

        # 更新词频
        word_freqs[new_token] = pairs[best_pair]

        # 执行合并
        new_tokens = []
        j = 0
        while j < len(tokens):
            if (j < len(tokens) - 1 and
                tokens[j] == best_pair[0] and
                tokens[j + 1] == best_pair[1]):
                new_tokens.append(new_token)
                j += 2
            else:
                new_tokens.append(tokens[j])
                j += 1
        tokens = new_tokens

    return vocab, merges
```

WordPiece 的一个显著特征是使用 `##` 前缀标记子词的续接部分。例如 "unhappiness" 可能被分为 `["un", "##happiness"]`。

## Unigram

Unigram 分词器被 SentencePiece 和 T5 使用。与 BPE/WordPiece 自底向上（从字符逐步合并）不同，Unigram 是自顶向下的：

1. 从一个巨大的候选词表开始（如所有子串）
2. 计算每个 token 的概率
3. 移除对整体似然贡献最小的 token
4. 重复直到词表达到目标大小

Unigram 的优势在于它为每个输入提供多种分词方案，并选择概率最高的那个。这使得分词是概率性的而非确定性的。

```python
import math

def unigram_tokenize(text, vocab_with_probs):
    """使用 Unigram 模型进行分词（Viterbi 算法）"""
    n = len(text)
    # dp[i] = 到位置 i 为止的最佳分词方案的对数概率
    dp = [-float('inf')] * (n + 1)
    dp[0] = 0.0
    best_path = [None] * (n + 1)

    for i in range(1, n + 1):
        for token, prob in vocab_with_probs.items():
            token_len = len(token)
            if i >= token_len and text[i - token_len:i] == token:
                score = dp[i - token_len] + math.log(prob)
                if score > dp[i]:
                    dp[i] = score
                    best_path[i] = (i - token_len, token)

    # 回溯获取分词结果
    tokens = []
    pos = n
    while pos > 0:
        prev_pos, token = best_path[pos]
        tokens.append(token)
        pos = prev_pos

    return list(reversed(tokens))
```

## 特殊 Token

LLM 分词器包含多个特殊 token，用于标记文本结构：

| Token             | 用途                 | 使用模型            |
| ----------------- | -------------------- | ------------------- |
| `<\|endoftext\|>` | 文档边界 / 序列结束  | GPT-2, GPT-3, GPT-4 |
| `<\|pad\|>`       | 填充短序列到相同长度 | 通用                |
| `<s>`             | 序列开始             | LLaMA, Mistral      |
| `</s>`            | 序列结束             | LLaMA, Mistral      |
| `[CLS]`           | 分类 token           | BERT                |
| `[SEP]`           | 句子分隔             | BERT                |
| `[MASK]`          | 掩码语言模型         | BERT                |
| `<\|im_start\|>`  | 指令开始             | ChatML 格式         |
| `<\|im_end\|>`    | 指令结束             | ChatML 格式         |

特殊 token 的 ID 是固定的，不会参与分词合并。它们在训练数据中被特殊处理，用于标记对话轮次、文档边界和填充位置。

## 分词器对模型的影响

分词器直接影响模型的多个方面：

**序列长度和成本。** 分词效率越高，相同文本产生的 token 越少，推理和训练成本越低。GPT-4 处理中文时，一个汉字通常需要 2-3 个 token，而英文单词平均约 1.3 个 token。这意味着中文的使用成本是英文的 2-3 倍。

**多语言公平性。** 不同语言的分词效率差异巨大：

| 语言     | 每 token 对应字符数 | 相对成本 |
| -------- | ------------------- | -------- |
| 英语     | ~4.0                | 1.0x     |
| 法语     | ~3.5                | 1.1x     |
| 中文     | ~1.5                | 2.7x     |
| 日语     | ~1.5                | 2.7x     |
| 韩语     | ~2.0                | 2.0x     |
| 阿拉伯语 | ~2.5                | 1.6x     |

**代码处理。** 分词器对代码的处理能力直接影响模型在编程任务上的表现。GPT-4 的分词器对常见编程模式（如 `def`、`class`、`import`）有专门的 token，而较老的分词器可能将它们拆成多个子词。

**OOV 和回退。** 当分词器遇到未知字符时，byte-level BPE 会回退到 UTF-8 字节表示。这保证了任何输入都可以被编码，但可能产生很长的 token 序列。

## 实际使用

### 使用 Hugging Face Tokenizers

```python
from transformers import AutoTokenizer

# 加载预训练分词器
tokenizer = AutoTokenizer.from_pretrained("gpt2")

# 编码
text = "Hello, world!"
token_ids = tokenizer.encode(text)
print(f"Token IDs: {token_ids}")
print(f"Tokens: {tokenizer.convert_ids_to_tokens(token_ids)}")

# 解码
decoded = tokenizer.decode(token_ids)
print(f"Decoded: {decoded}")

# 统计 token 数量
num_tokens = len(tokenizer.encode("This is a sample sentence."))
print(f"Token count: {num_tokens}")
```

### 使用 SentencePiece

```python
import sentencepiece as spm

# 训练
spm.SentencePieceTrainer.train(
    input='corpus.txt',
    model_prefix='my_model',
    vocab_size=32000,
    model_type='unigram',  # 或 'bpe'
)

# 加载和使用
sp = spm.SentencePieceProcessor()
sp.load('my_model.model')

tokens = sp.encode_as_pieces("Hello world")
ids = sp.encode_as_ids("Hello world")
```

## 关键术语

| 术语          | 通俗说法    | 实际含义                                                           |
| ------------- | ----------- | ------------------------------------------------------------------ |
| Token         | "词"        | 分词器输出的最小文本单元，可以是完整词、子词或字符                 |
| BPE           | "合并算法"  | Byte Pair Encoding，通过迭代合并高频相邻对构建词表的子词分词算法   |
| WordPiece     | "BERT 分词" | 基于语言模型似然增益选择合并对的子词分词算法，使用 ## 标记续接子词 |
| Unigram       | "概率分词"  | 自顶向下，通过逐步删除低贡献 token 构建词表的概率化分词算法        |
| Vocab         | "词表"      | 分词器能输出的所有 token 的集合，大小通常在 32K-128K 之间          |
| OOV           | "未知词"    | Out-of-Vocabulary，分词器词表中不存在的词                          |
| Special Token | "特殊标记"  | 用于标记文本结构的特殊 token，如序列开始、结束、填充等             |

## 延伸阅读

- [Sennrich et al., 2016 -- "Neural Machine Translation of Rare Words with Subword Units"](https://arxiv.org/abs/1508.07909) -- BPE 应用于 NLP 的原始论文
- [Kudo, 2018 -- "Subword Regularization: Improving Neural Network Translation Models with Multiple Subword Segmentations"](https://arxiv.org/abs/1804.10959) -- Unigram 语言模型分词的原始论文
- [Hugging Face Tokenizers 文档](https://huggingface.co/docs/tokenizers/) -- 高性能分词器库，支持 BPE、WordPiece 和 Unigram
- [SentencePiece 文档](https://github.com/google/sentencepiece) -- Google 的语言无关分词器，被 LLaMA、T5 等模型使用
- [Yoon et al., 2024 -- "Tokenizer Choice Matters: How Tokenization Affects LLM Performance"](https://arxiv.org/abs/2406.11677) -- 分词器选择对 LLM 性能影响的实证研究
