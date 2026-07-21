---
title: 注意力机制
description: 理解Bahdanau注意力、Luong注意力和自注意力的核心原理
module: nlp
difficulty: intermediate
tags:
  - 注意力机制
  - Bahdanau
  - Luong
  - 自注意力
  - 对齐
related:
  - nlp/长上下文评估
  - nlp/主题建模
  - nlp/子词分词
  - nlp/自然语言推理
prerequisites:
  - 'nlp/词袋模型与TF-IDF'
---

# 注意力机制

> 编码器-解码器瓶颈是NLP中最有教学价值的失败。注意力是修复。自注意力是Transformer。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 5 · 09（Seq2Seq），Phase 3 · 11（PyTorch入门）
**时间:** ~75 分钟

## 问题

课程09的编码器-解码器模型将整个源句子压缩为单个固定大小向量。解码器只看到那个向量。长句子丢失细节。罕见词模糊。重排序（chat noir vs. black cat）必须记忆，不能计算。

注意力通过让解码器在每步查看*所有*编码器隐藏状态来修复这个问题，而不仅仅是最后一个。不是记忆一切，而是在需要时计算你需要的东西。

## 概念

**Bahdanau注意力（加性）。** 在每个解码器步 `t`，计算每个编码器隐藏状态 `h_s` 的对齐分数：`e_{t,s} = v^T tanh(W_1 h_s + W_2 d_t)`。Softmax归一化为权重 `alpha_{t,s}`。上下文向量是编码器状态的加权和：`c_t = sum_s alpha_{t,s} h_s`。解码器使用 `c_t` 和 `d_t` 预测下一个词。

**Luong注意力（乘性/点积）。** 更简单。`e_{t,s} = d_t^T W h_s`。当维度匹配时 `W` 可以是单位矩阵，简化为裸点积。更快，质量相当。Transformer使用缩放点积变体。

**自注意力。** 不用单独的编码器和解码器隐藏状态，序列关注自身。每个位置 `i` 计算与所有其他位置 `j` 的对齐，产生上下文化的表示。这是Transformer块的核心操作。

## 构建它

### 步骤 1：Bahdanau（加性）注意力

```python
import torch
import torch.nn as nn
import torch.nn.functional as F
import math


class BahdanauAttention(nn.Module):
    def __init__(self, enc_dim, dec_dim, attn_dim):
        super().__init__()
        self.W1 = nn.Linear(enc_dim, attn_dim)
        self.W2 = nn.Linear(dec_dim, attn_dim)
        self.V = nn.Linear(attn_dim, 1)

    def forward(self, encoder_outputs, decoder_hidden):
        # encoder_outputs: [batch, src_len, enc_dim]
        # decoder_hidden: [batch, 1, dec_dim]
        score = self.V(torch.tanh(self.W1(encoder_outputs) + self.W2(decoder_hidden)))
        weights = F.softmax(score, dim=1)
        context = (weights * encoder_outputs).sum(dim=1)
        return context, weights.squeeze(2)
```

### 步骤 2：Luong（乘性）注意力

```python
class LuongAttention(nn.Module):
    def __init__(self, enc_dim, dec_dim):
        super().__init__()
        self.W = nn.Linear(dec_dim, enc_dim, bias=False)

    def forward(self, encoder_outputs, decoder_hidden):
        # decoder_hidden: [batch, 1, dec_dim]
        projected = self.W(decoder_hidden)
        scores = torch.bmm(encoder_outputs, projected.transpose(1, 2)).squeeze(2)
        weights = F.softmax(scores, dim=1)
        context = torch.bmm(weights.unsqueeze(1), encoder_outputs).squeeze(1)
        return context, weights
```

### 步骤 3：缩放点积自注意力

```python
class ScaledDotProductAttention(nn.Module):
    def __init__(self, d_model):
        super().__init__()
        self.scale = math.sqrt(d_model)

    def forward(self, Q, K, V, mask=None):
        scores = torch.bmm(Q, K.transpose(1, 2)) / self.scale
        if mask is not None:
            scores = scores.masked_fill(mask == 0, float("-inf"))
        weights = F.softmax(scores, dim=-1)
        return torch.bmm(weights, V), weights
```

`1/sqrt(d_k)` 缩放防止大维度下softmax梯度消失。这是Vaswani等（2017）的"缩放"部分。

### 步骤 4：多头注意力

```python
class MultiHeadAttention(nn.Module):
    def __init__(self, d_model, n_heads):
        super().__init__()
        assert d_model % n_heads == 0
        self.d_k = d_model // n_heads
        self.n_heads = n_heads
        self.W_q = nn.Linear(d_model, d_model)
        self.W_k = nn.Linear(d_model, d_model)
        self.W_v = nn.Linear(d_model, d_model)
        self.W_o = nn.Linear(d_model, d_model)
        self.attn = ScaledDotProductAttention(self.d_k)

    def forward(self, Q, K, V, mask=None):
        B = Q.size(0)
        Q = self.W_q(Q).view(B, -1, self.n_heads, self.d_k).transpose(1, 2)
        K = self.W_k(K).view(B, -1, self.n_heads, self.d_k).transpose(1, 2)
        V = self.W_v(V).view(B, -1, self.n_heads, self.d_k).transpose(1, 2)
        out, weights = self.attn(Q, K, V, mask)
        out = out.transpose(1, 2).contiguous().view(B, -1, self.n_heads * self.d_k)
        return self.W_o(out), weights
```

每个头学习不同的注意力模式。一个可能关注语法依赖，另一个语义相似性，另一个位置邻近性。拼接后线性投影混合它们。

## 使用它

注意力现在是每个序列模型的默认。不是可选附加。

- **Transformer编码器-解码器。** 编码器自注意力 + 解码器自注意力 + 编码器-解码器交叉注意力。
- **仅编码器（BERT）。** 双向自注意力。每个token看到整个序列。
- **仅解码器（GPT）。** 带因果掩码的自注意力。每个token只看到过去的token。
- **交叉注意力（Whisper、Stable Diffusion）。** 一个序列关注另一个。文本条件化图像。音频条件化文本。

### 注意力权重告诉你什么

注意力权重是可解释性工具，不是可靠的事实。高权重意味着"模型在这里看了很多"，不意味着"这个token对决策最重要"。但它们仍然有用：

- 翻译对齐可视化。
- 调试模型是否关注正确上下文。
- 检测检索增强生成是否实际使用了检索到的段落。

## 交付它

将结果保存为 `outputs/prompt-attention-picker.md`。

## 练习

1. **简单。** 在课程09的seq2seq模型中用Bahdanau注意力替换固定上下文向量。在复制任务上训练。验证长序列准确率恢复。
2. **中等。** 实现多头注意力。在玩具翻译任务上训练。可视化不同头的注意力模式。写下一个头学到什么 vs 另一个的假设。
3. **困难。** 构建一个仅编码器分类器：嵌入 + 2层自注意力 + CLS token池化 + 线性头。在SST-2上与课程08的BiLSTM分类器比较。

## 关键术语

| 术语       | 通俗说法     | 实际含义                                     |
| ---------- | ------------ | -------------------------------------------- |
| 对齐分数   | 相关性分数   | 解码器位置和编码器位置之间的原始注意力分数。 |
| 注意力权重 | 概率分布     | 对齐分数上的Softmax。总和为1。               |
| 上下文向量 | 加权和       | 编码器隐藏状态的注意力加权平均值。           |
| 自注意力   | 序列关注自身 | 每个位置计算与所有其他位置的对齐。           |
| 多头       | 多个注意力   | 并行运行n个注意力操作，拼接，投影。          |
| 缩放点积   | Luong + 缩放 | `QK^T / sqrt(d_k)`。防止大维度下梯度消失。   |

## 延伸阅读

- [Bahdanau, Cho, Bengio (2014). Neural Machine Translation by Jointly Learning to Align and Translate](https://arxiv.org/abs/1409.0473) — 注意力论文。
- [Luong, Pham, Manning (2015). Effective Approaches to Attention-based Neural Machine Translation](https://arxiv.org/abs/1508.04025) — 乘性注意力。
- [Vaswani et al. (2017). Attention Is All You Need](https://arxiv.org/abs/1706.03762) — Transformer论文。自注意力 + 多头。
- [The Annotated Transformer](https://nlp.seas.harvard.edu/annotated-transformer/) — 逐行代码讲解。
