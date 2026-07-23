---
title: 子词分词
description: 理解BPE、WordPiece、Unigram和SentencePiece四种子词分词算法
module: nlp
difficulty: intermediate
tags:
  - 子词分词
  - BPE
  - WordPiece
  - Unigram
  - SentencePiece
related:
  - nlp/主题建模
  - nlp/注意力机制
  - nlp/自然语言推理
  - nlp/GloVe与子词嵌入
prerequisites:
  - 'nlp/词袋模型与TF-IDF'
---

# 子词分词 — BPE、WordPiece、Unigram、SentencePiece

> 词分词器在未见词上崩溃。字符分词器爆炸序列长度。子词分词器折中。每个现代LLM都构建在其中一个之上。

**类型:** 学习
**语言:** Python
**前置条件:** Phase 5 · 01（文本处理），Phase 5 · 04（GloVe / FastText / 子词）
**时间:** ~60 分钟

## 问题

你的词表有50,000个词。用户输入"untokenizable"。你的分词器返回 `[UNK]`。模型现在对该词没有信号。更糟的是：语料库中第90百分位的文档有40个罕见词，意味着每个文档丢失40位信息。

子词分词解决了这个问题。常见词保持单个token。罕见词分解为有意义的片段：`untokenizable` → `un`、`token`、`izable`。训练数据覆盖一切，因为任何字符串最终都是字节序列。

2026年每个前沿LLM都构建在三种算法（BPE、Unigram、WordPiece）之一上，包装在三种库（tiktoken、SentencePiece、HF Tokenizers）之一中。不选一个就无法发布语言模型。

## 概念

**BPE（字节对编码）。** 从字符级词表开始。计算每个相邻对的出现次数。将最频繁的对合并为新token。重复直到达到目标词表大小。主导算法：GPT-2/3/4、Llama、Gemma、Qwen2、Mistral。

**字节级BPE。** 相同算法但在原始字节（256个基础token）上而非Unicode字符上。保证零 `[UNK]` token — 任何字节序列都可编码。GPT-2使用50,257个token（256字节 + 50,000次合并 + 1个特殊token）。

**Unigram。** 从巨大词表开始。为每个token分配unigram概率。迭代剪枝移除后对语料库对数似然增加最少的token。推理时是概率性的：可以采样不同的分词结果（通过子词正则化用于数据增强）。T5、mBART、ALBERT、XLNet、Gemma使用。

**WordPiece。** 合并最大化训练语料库似然的词对而非原始频率。BERT、DistilBERT、ELECTRA使用。

**SentencePiece vs tiktoken。** SentencePiece是直接在原始Unicode文本上*训练*词表（BPE或Unigram）的库，将空格编码为 `▁`。tiktoken是OpenAI针对预构建词表的快速*编码器*；它不训练。

经验法则：

- **训练新词表：** SentencePiece（多语言，无预分词）或HF Tokenizers。
- **针对GPT词表的快速推理：** tiktoken（cl100k_base、o200k_base）。
- **两者兼顾：** HF Tokenizers — 一个库，训练 + 服务。

## 构建它

### 步骤 1：从零构建BPE

```python
from collections import Counter


def train_bpe(corpus, num_merges):
    vocab = {tuple(word) + ("</w>",): count for word, count in corpus.items()}
    merges = []
    for _ in range(num_merges):
        pairs = Counter()
        for symbols, freq in vocab.items():
            for a, b in zip(symbols, symbols[1:]):
                pairs[(a, b)] += freq
        if not pairs:
            break
        best = pairs.most_common(1)[0][0]
        merges.append(best)
        new_vocab = {}
        for symbols, freq in vocab.items():
            new_symbols = []
            i = 0
            while i < len(symbols):
                if i + 1 < len(symbols) and symbols[i] == best[0] and symbols[i + 1] == best[1]:
                    new_symbols.append(best[0] + best[1])
                    i += 2
                else:
                    new_symbols.append(symbols[i])
                    i += 1
            new_vocab[tuple(new_symbols)] = freq
        vocab = new_vocab
    return merges
```

三个事实。`</w>` 标记词尾，所以"low"（后缀）和"lower"（前缀）保持不同。频率加权使高频对早期胜出。合并列表有序 — 推理按训练顺序应用合并。

### 步骤 2：用学到的合并编码

```python
def encode_bpe(word, merges):
    symbols = list(word) + ["</w>"]
    for a, b in merges:
        i = 0
        while i < len(symbols) - 1:
            if symbols[i] == a and symbols[i + 1] == b:
                symbols = symbols[:i] + [a + b] + symbols[i + 2:]
            else:
                i += 1
    return symbols
```

朴素O(n·|merges|)。生产实现（tiktoken、HF Tokenizers）使用带优先队列的合并排名查找，近线性时间运行。

### 步骤 3：实践中的SentencePiece

```python
import sentencepiece as spm

spm.SentencePieceTrainer.train(
    input="corpus.txt",
    model_prefix="my_tokenizer",
    vocab_size=8000,
    model_type="bpe",
    character_coverage=0.9995,
    normalization_rule_name="nmt_nfkc",
)

sp = spm.SentencePieceProcessor(model_file="my_tokenizer.model")
print(sp.encode("untokenizable", out_type=str))
```

注意：无需预分词，空格编码为 `▁`，`character_coverage` 控制罕见字符保留vs映射到 `<unk>` 的激进程度。

### 步骤 4：OpenAI兼容词表的tiktoken

```python
import tiktoken
enc = tiktoken.get_encoding("o200k_base")
print(enc.encode("untokenizable"))
print(len(enc.encode("Hello, world!")))
```

仅编码。快速（Rust后端）。与GPT-4/5分词精确匹配，用于字节计数、成本估算、上下文窗口预算。

## 2026年仍在出现的陷阱

- **分词器漂移。** 在词表A上训练，在词表B上部署。Token ID不同；模型输出垃圾。在CI中检查 `tokenizer.json` 哈希。
- **空格歧义。** BPE "hello" vs " hello" 产生不同token。始终显式指定 `add_special_tokens` 和 `add_prefix_space`。
- **多语言训练不足。** 英语为主的语料库产生的词表将非拉丁文字拆分为5-10倍更多token。日语/阿拉伯语在GPT-3.5上的相同提示成本高5-10倍。o200k_base部分修复了这个问题。
- **Emoji拆分。** 单个emoji可能占5个token。预算上下文时检查emoji处理。

## 使用它

2026年技术栈：

| 情况                               | 选择                                                 |
| ---------------------------------- | ---------------------------------------------------- |
| 从零训练单语言模型                 | HF Tokenizers (BPE)                                  |
| 从零训练多语言模型                 | SentencePiece (Unigram, `character_coverage=0.9995`) |
| 服务OpenAI兼容API                  | tiktoken (`o200k_base` 用于GPT-4+)                   |
| 领域特定词表（代码、数学、蛋白质） | 在领域语料上训练自定义BPE，与基础词表合并            |
| 边缘推理，小模型                   | Unigram（更小词表效果更好）                          |

词表大小是扩展决策，不是常数。粗略启发式：<1B参数32k，1-10B参数50-100k，多语言/前沿200k+。

## 交付它

将结果保存为 `outputs/skill-bpe-vs-wordpiece.md`。

## 练习

1. **简单。** 在微型语料上训练500合并BPE。编码3个保留词。多少产生恰好1个token vs >1个？
2. **中等。** 在100个英语Wikipedia句子上比较 `cl100k_base`、`o200k_base` 和你训练的32k词表SentencePiece BPE的token计数。报告每个的压缩比。
3. **困难。** 用BPE、Unigram和WordPiece在相同语料上训练。在小型情感分类器上使用每个时测量下游准确率。选择差异是否超过1个F1点？

## 关键术语

| 术语          | 通俗说法           | 实际含义                                             |
| ------------- | ------------------ | ---------------------------------------------------- |
| BPE           | 字节对编码         | 贪心合并最频繁字符对直到达到目标词表大小。           |
| 字节级BPE     | 永远没有未知token  | 在原始256字节上的BPE；GPT-2 / Llama使用。            |
| Unigram       | 概率分词器         | 使用对数似然从大候选集剪枝；T5、Gemma使用。          |
| SentencePiece | 处理空格的那个     | 在原始文本上训练BPE/Unigram的库；空格编码为 `▁`。    |
| tiktoken      | 快速的那个         | OpenAI的Rust后端BPE编码器，用于预构建词表。不训练。  |
| 合并列表      | 魔法数字           | `(a, b) → ab` 合并的有序列表；推理按顺序应用。       |
| 字符覆盖      | 多罕见才算太罕见？ | 分词器必须覆盖的训练语料中字符的比例；约0.9995典型。 |

## 延伸阅读

- [Sennrich, Haddow, Birch (2015). Neural Machine Translation of Rare Words with Subword Units](https://arxiv.org/abs/1508.07909) — BPE论文。
- [Kudo (2018). Subword Regularization with Unigram Language Model](https://arxiv.org/abs/1804.10959) — Unigram论文。
- [Kudo, Richardson (2018). SentencePiece](https://arxiv.org/abs/1808.06226) — 库论文。
- [Hugging Face — 分词器摘要](https://huggingface.co/docs/transformers/tokenizer_summary) — 简洁参考。
- [OpenAI tiktoken仓库](https://github.com/openai/tiktoken) — 手册 + 编码列表。
