---
title: 构建分词器
description: '从零构建一个完整的 BPE 分词器，包括训练、编码、解码和特殊 token 处理'
module: llm
difficulty: intermediate
tags:
  - tokenizer
  - BPE
  - 'byte-level'
  - 编码
  - 解码
related:
  - llm/分词器
  - llm/高级RAG
  - llm/构建完整LLM流水线
  - llm/函数调用
prerequisites:
  - llm/安全护栏
---

# 构建分词器

> 理解分词器的最好方式是从零构建一个。你将实现完整的 byte-level BPE 算法，包括训练、编码和解码。完成后，你会理解为什么 GPT-4 把 "hello" 编码为 `[15339]` 而不是 `[31373, 995]`。

**类型：** 构建
**语言：** Python
**前置条件：** Phase 10 Lesson 01（分词器）
**预计时间：** ~90 分钟

## 学习目标

- 从零实现 byte-level BPE 分词器的完整训练流程
- 实现高效的编码和解码算法
- 处理特殊 token 的注册和使用
- 理解预分词（pre-tokenization）的作用和实现
- 构建一个可以保存和加载的完整分词器

## 架构概览

一个完整的分词器由以下组件构成：

```
输入文本
  ↓
预分词（Pre-tokenization）  ← 按空格/标点拆分
  ↓
BPE 编码                    ← 对每个预分词片段应用合并规则
  ↓
Token ID 映射               ← 将 token 字符串映射为整数 ID
  ↓
输出：Token ID 序列
```

解码是逆过程：Token ID → Token 字符串 → 合并还原 → 原始文本。

## Step 1: 基础数据结构

```python
import json
import re
from collections import Counter
from functools import lru_cache


class Tokenizer:
    """Byte-level BPE 分词器"""

    def __init__(self):
        # 基础词表：256 个字节值
        self.vocab = {i: bytes([i]) for i in range(256)}
        self.merges = {}        # (token_a, token_b) -> merged_token
        self.merge_ranks = {}   # merge -> rank (用于编码时的优先级)
        self.special_tokens = {}  # token_string -> token_id
        self.pattern = re.compile(r"""'s|'t|'re|'ve|'m|'ll|'d| ?\w+| ?\d+| ?[^\s\w\d]+|\s+(?!\S)|\s+""")

    @property
    def vocab_size(self):
        return len(self.vocab) + len(self.special_tokens)
```

## Step 2: 训练 BPE

训练过程：从字节级词表开始，迭代合并最高频的相邻 token 对。

```python
def train(self, text, vocab_size=1024, verbose=False):
    """在文本上训练 BPE 合并规则"""
    # 预分词：将文本拆分为词级片段
    words = re.findall(self.pattern, text)
    word_counts = Counter(words)

    # 将每个词转换为字节元组，统计频率
    word_bytes = {
        tuple(word.encode('utf-8')): count
        for word, count in word_counts.items()
    }

    num_merges = vocab_size - 256  # 减去基础字节词表

    for i in range(num_merges):
        # 统计所有相邻 token 对的频率
        pair_counts = Counter()
        for word, count in word_bytes.items():
            for j in range(len(word) - 1):
                pair_counts[(word[j], word[j + 1])] += count

        if not pair_counts:
            break

        # 找到频率最高的对
        best_pair = pair_counts.most_common(1)[0][0]

        # 创建合并后的新 token
        new_token_id = 256 + i
        self.merges[best_pair] = new_token_id
        self.merge_ranks[best_pair] = i
        self.vocab[new_token_id] = self.vocab[best_pair[0]] + self.vocab[best_pair[1]]

        # 在所有词中执行合并
        new_word_bytes = {}
        for word, count in word_bytes.items():
            new_word = self._merge_pair(word, best_pair, new_token_id)
            new_word_bytes[new_word] = new_word_bytes.get(new_word, 0) + count
        word_bytes = new_word_bytes

        if verbose and (i + 1) % 100 == 0:
            token_str = self.vocab[new_token_id].decode('utf-8', errors='replace')
            print(f"Merge {i + 1}/{num_merges}: {best_pair} -> {new_token_id} ('{token_str}')")

    return self


def _merge_pair(self, word, pair, new_id):
    """在 token 序列中合并指定的 token 对"""
    new_word = []
    i = 0
    while i < len(word):
        if (i < len(word) - 1 and word[i] == pair[0] and word[i + 1] == pair[1]):
            new_word.append(new_id)
            i += 2
        else:
            new_word.append(word[i])
            i += 1
    return tuple(new_word)
```

## Step 3: 编码

编码过程：将文本转换为 token ID 序列。

```python
def encode(self, text):
    """将文本编码为 token ID 序列"""
    # 先处理特殊 token
    if self.special_tokens:
        # 按长度降序排列，优先匹配更长的特殊 token
        sorted_special = sorted(self.special_tokens.keys(), key=len, reverse=True)
        special_pattern = '(' + '|'.join(re.escape(t) for t in sorted_special) + ')'
        parts = re.split(special_pattern, text)
    else:
        parts = [text]

    token_ids = []
    for part in parts:
        if part in self.special_tokens:
            token_ids.append(self.special_tokens[part])
            continue

        # 预分词
        words = re.findall(self.pattern, part)

        for word in words:
            # 转换为字节
            word_bytes = tuple(word.encode('utf-8'))

            # 应用 BPE 合并规则
            word_tokens = self._bpe_encode(word_bytes)

            # 映射到 token ID
            for token in word_tokens:
                if isinstance(token, int):
                    token_ids.append(token)
                else:
                    # 单字节 token
                    token_ids.append(token)

    return token_ids


def _bpe_encode(self, word_bytes):
    """对单个词的字节序列应用 BPE 合并"""
    tokens = list(word_bytes)

    while len(tokens) >= 2:
        # 找到优先级最高（rank 最低）的合并对
        best_pair = None
        best_rank = float('inf')

        for i in range(len(tokens) - 1):
            pair = (tokens[i], tokens[i + 1])
            rank = self.merge_ranks.get(pair)
            if rank is not None and rank < best_rank:
                best_rank = rank
                best_pair = pair

        if best_pair is None:
            break

        # 执行合并
        new_id = self.merges[best_pair]
        new_tokens = []
        i = 0
        while i < len(tokens):
            if (i < len(tokens) - 1 and tokens[i] == best_pair[0] and tokens[i + 1] == best_pair[1]):
                new_tokens.append(new_id)
                i += 2
            else:
                new_tokens.append(tokens[i])
                i += 1
        tokens = new_tokens

    return tokens
```

## Step 4: 解码

解码过程：将 token ID 序列转换回文本。

```python
def decode(self, token_ids):
    """将 token ID 序列解码为文本"""
    byte_chunks = []

    for token_id in token_ids:
        if token_id in self.special_tokens:
            # 特殊 token 直接输出其字符串
            inv_special = {v: k for k, v in self.special_tokens.items()}
            byte_chunks.append(inv_special[token_id].encode('utf-8'))
        elif token_id in self.vocab:
            byte_chunks.append(self.vocab[token_id])
        else:
            raise ValueError(f"Unknown token ID: {token_id}")

    # 拼接所有字节并解码为 UTF-8
    raw_bytes = b''.join(byte_chunks)
    return raw_bytes.decode('utf-8', errors='replace')
```

## Step 5: 特殊 Token

```python
def add_special_token(self, token_string):
    """添加特殊 token"""
    if token_string in self.special_tokens:
        return self.special_tokens[token_string]

    new_id = self.vocab_size
    self.special_tokens[token_string] = new_id
    self.vocab[new_id] = token_string.encode('utf-8')
    return new_id
```

## Step 6: 保存和加载

```python
def save(self, path):
    """保存分词器到文件"""
    data = {
        'merges': {f"{k[0]},{k[1]}": v for k, v in self.merges.items()},
        'vocab': {k: list(v) for k, v in self.vocab.items()},
        'special_tokens': self.special_tokens,
    }
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


@classmethod
def load(cls, path):
    """从文件加载分词器"""
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    tokenizer = cls()
    tokenizer.merges = {
        (int(k.split(',')[0]), int(k.split(',')[1])): v
        for k, v in data['merges'].items()
    }
    tokenizer.merge_ranks = {k: i for i, k in enumerate(tokenizer.merges.keys())}
    tokenizer.vocab = {int(k): bytes(v) for k, v in data['vocab'].items()}
    tokenizer.special_tokens = data.get('special_tokens', {})

    return tokenizer
```

## Step 7: 完整演示

```python
def demo():
    # 训练语料
    corpus = """
    The quick brown fox jumps over the lazy dog.
    Machine learning is a subset of artificial intelligence.
    Deep learning uses neural networks with many layers.
    Natural language processing enables computers to understand text.
    Tokenization is the first step in any NLP pipeline.
    """ * 10

    # 训练分词器
    tokenizer = Tokenizer()
    tokenizer.train(corpus, vocab_size=512, verbose=True)

    # 添加特殊 token
    tokenizer.add_special_token("<|endoftext|>")
    tokenizer.add_special_token("<|pad|>")

    # 编码
    text = "Machine learning is amazing!"
    token_ids = tokenizer.encode(text)
    print(f"Text: {text}")
    print(f"Token IDs: {token_ids}")

    # 解码
    decoded = tokenizer.decode(token_ids)
    print(f"Decoded: {decoded}")
    print(f"Roundtrip correct: {text == decoded}")

    # 特殊 token 测试
    text_with_special = "Hello<|endoftext|>World"
    ids = tokenizer.encode(text_with_special)
    print(f"\nText with special: {text_with_special}")
    print(f"Token IDs: {ids}")
    print(f"Decoded: {tokenizer.decode(ids)}")

    # 词表大小
    print(f"\nVocab size: {tokenizer.vocab_size}")


if __name__ == "__main__":
    demo()
```

## 预分词的重要性

预分词决定了 BPE 合并的边界。没有预分词，BPE 可能跨词合并，产生不理想的 token。

常见的预分词策略：

| 模型   | 预分词策略                | 效果             |
| ------ | ------------------------- | ---------------- |
| GPT-2  | 基于 GPT-2 正则的词级拆分 | 词内合并，不跨词 |
| BERT   | 基于空格和标点的词级拆分  | 简单但有效       |
| LLaMA  | SentencePiece 默认分词    | 支持多语言       |
| Claude | 自定义正则 + 空格保留     | 精细控制         |

GPT-2 的预分词正则表达式是经过精心设计的：

```python
GPT2_PATTERN = r"""'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+"""
```

这个正则确保：

- 英文缩写（`'s`, `'t` 等）作为独立 token
- 前导空格与后续词绑定
- 数字序列保持完整
- 标点符号独立

## 关键术语

| 术语           | 通俗说法   | 实际含义                                                       |
| -------------- | ---------- | -------------------------------------------------------------- |
| 预分词         | "粗分词"   | 在 BPE 合并之前，将文本按空格/标点拆分为词级片段，限制合并边界 |
| Byte-level BPE | "字节分词" | 以 UTF-8 字节为初始词表的 BPE，保证任何输入都可编码            |
| 合并规则       | "合并表"   | BPE 训练过程中学到的 token 对合并顺序，编码时按优先级应用      |
| 特殊 Token     | "控制标记" | 不参与分词合并的特殊标记，用于标记文本结构                     |
| Token ID       | "编号"     | 词表中每个 token 对应的唯一整数，是模型实际处理的输入          |

## 延伸阅读

- [OpenAI GPT-2 Encoder](https://github.com/openai/gpt-2/blob/master/src/encoder.py) -- GPT-2 byte-level BPE 的原始实现
- [Hugging Face Tokenizers](https://github.com/huggingface/tokenizers) -- Rust 实现的高性能分词器库
- [Andrej Karpathy -- minBPE](https://github.com/karpathy/minbpe) -- 最小化 BPE 实现，教学用途
- [Mielke et al., 2021 -- "Between Words and Characters: A Brief History of Open-Vocabulary Modeling and Tokenization in NLP"](https://arxiv.org/abs/2112.10508) -- NLP 分词方法的全面综述
