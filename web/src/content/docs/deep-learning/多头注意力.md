---
title: 多头注意力
description: '一个注意力头一次学习一种关系,八个头学习八种,头是免费的,多用一些'
module: 'deep-learning'
difficulty: intermediate
tags:
  - 多头注意力
  - 注意力机制
  - GQA
  - MQA
  - MLA
  - Transformer
related:
  - 'deep-learning/调试神经网络'
  - 'deep-learning/多层网络'
  - 'deep-learning/反向传播'
  - 'deep-learning/感知机'
prerequisites:
  - 'deep-learning/深度学习概述'
---

# 多头注意力

> 一个注意力头一次学习一种关系。八个头学习八种。头是免费的。多用一些。

**类型:** 构建
**语言:** Python
**前置知识:** 阶段7 · 02(自注意力从零实现)
**预计时间:** ~75分钟

## 问题所在

单个自注意力头计算一个注意力矩阵。该矩阵捕获一种关系——通常是使训练信号上的损失最小化的那种。如果你的数据中主谓一致、共指、长程语篇和句法分块纠缠在一起,单个头会将它们模糊成单个softmax分布,丢失一半信号。

2017年Vaswani论文的修复方案:并行运行多个注意力函数,每个都有自己的Q, K, V投影,并拼接输出。每个头在维度为 `d_model / n_heads` 的更小子空间中操作。总参数量保持不变。表达能力上升。

多头注意力是2026年每个transformer的默认配置。唯一的争论是*多少*个头以及key和value是否共享投影(Grouped-Query Attention, Multi-Query Attention, Multi-head Latent Attention)。

## 核心概念

**拆分。** 取形状为 `(N, d_model)` 的 `X`。投影到Q, K, V,每个形状为 `(N, d_model)`。重塑为 `(N, n_heads, d_head)`,其中 `d_head = d_model / n_heads`。转置为 `(n_heads, N, d_head)`。

**并行注意。** 在每个头内运行缩放点积注意力。每个头产生 `(N, d_head)`。头在嵌入的不同子空间上操作,在注意力计算本身期间互不通信。

**拼接并投影。** 将头堆叠回 `(N, d_model)` 并乘以形状为 `(d_model, d_model)` 的学习输出矩阵 `W_o`。`W_o` 是头可以混合的地方。

**为什么有效。** 每个头可以专业化,而不必与其他头竞争表示预算。2019-2024年的探测研究显示了不同的头角色:位置头、关注前一个token的头、复制头、命名实体头、归纳头(这是上下文学习的基础)。

**2026年的变体谱系:**

| 变体          | Q头数 | K/V头数    | 使用者                                  |
| ------------- | ----- | ---------- | --------------------------------------- |
| 多头(MHA)     | N     | N          | GPT-2, BERT, T5                         |
| 多查询(MQA)   | N     | 1          | PaLM, Falcon                            |
| 分组查询(GQA) | N     | G (如N/8)  | Llama 2 70B, Llama 3+, Qwen 2+, Mistral |
| 多头潜在(MLA) | N     | 压缩为低秩 | DeepSeek-V2, V3                         |

GQA是现代默认选择,因为它将KV缓存内存减少了 `N/G` 倍,同时几乎保持完整质量。MLA走得更远,将K/V压缩到潜在空间,然后在计算时投影回来——花费FLOPs,节省更多内存。

## 动手构建

### 步骤1:从已有的单头注意力拆分头

取第02课的 `SelfAttention`,用拆分/拼接对包装它。参见 `code/main.py` 的numpy实现;逻辑如下:

```python
def split_heads(X, n_heads):
    n, d = X.shape
    d_head = d // n_heads
    return X.reshape(n, n_heads, d_head).transpose(1, 0, 2)  # (heads, n, d_head)

def combine_heads(H):
    h, n, d_head = H.shape
    return H.transpose(1, 0, 2).reshape(n, h * d_head)
```

一次重塑和一次转置。没有循环。这正是PyTorch在 `nn.MultiheadAttention` 下所做的。

### 步骤2:每个头运行缩放点积注意力

每个头获得自己的Q, K, V切片。注意力变成批量矩阵乘法:

```python
def mha_forward(X, W_q, W_k, W_v, W_o, n_heads):
    Q = X @ W_q
    K = X @ W_k
    V = X @ W_v
    Qh = split_heads(Q, n_heads)         # (heads, n, d_head)
    Kh = split_heads(K, n_heads)
    Vh = split_heads(V, n_heads)
    scores = Qh @ Kh.transpose(0, 2, 1) / np.sqrt(Qh.shape[-1])
    weights = softmax(scores, axis=-1)
    out = weights @ Vh                    # (heads, n, d_head)
    concat = combine_heads(out)
    return concat @ W_o, weights
```

在真实硬件上,`Qh @ Kh.transpose(...)` 是一次 `bmm`。GPU看到一个形状为 `(heads, N, d_head) × (heads, d_head, N) -> (heads, N, N)` 的批量矩阵乘法。增加头是免费的。

### 步骤3:分组查询注意力变体

只有key和value投影改变。Q有 `n_heads` 个组;K和V有 `n_kv_heads < n_heads` 个组,并被重复以匹配:

```python
def gqa_project(X, W, n_kv_heads, n_heads):
    kv = split_heads(X @ W, n_kv_heads)       # (kv_heads, n, d_head)
    repeat = n_heads // n_kv_heads
    return np.repeat(kv, repeat, axis=0)      # (n_heads, n, d_head)
```

在推理时这节省内存,因为只有 `n_kv_heads` 份副本存在于KV缓存中,而不是 `n_heads` 份。Llama 3 70B使用64个查询头和8个KV头——8倍缓存缩减。

### 步骤4:探测每个头学到了什么

在短句子上运行4个头的MHA。对于每个头,打印 `(N, N)` 注意力矩阵。你会看到不同的头即使在随机初始化下也挑出不同的结构——这部分是信号,部分是子空间中的旋转对称性。

## 实际应用

在PyTorch中,一行版本:

```python
import torch.nn as nn

mha = nn.MultiheadAttention(embed_dim=512, num_heads=8, batch_first=True)
```

PyTorch 2.5+的GQA:

```python
from torch.nn.functional import scaled_dot_product_attention

# scaled_dot_product_attention 在CUDA上自动调度Flash Attention。
# 对于GQA,传入形状为(B, n_heads, N, d_head)的Q和形状为
# (B, n_kv_heads, N, d_head)的K,V。PyTorch处理重复。
out = scaled_dot_product_attention(q, k, v, is_causal=True, enable_gqa=True)
```

**多少个头?** 2026年生产模型的经验法则:

| 模型大小    | d_model | n_heads | d_head |
| ----------- | ------- | ------- | ------ |
| 小型(~125M) | 768     | 12      | 64     |
| 基础(~350M) | 1024    | 16      | 64     |
| 大型(~1B)   | 2048    | 16      | 128    |
| 前沿(~70B)  | 8192    | 64      | 128    |

`d_head` 几乎总是64或128。它是一个头能"看到"多少的单位。低于32时,头开始与缩放因子 `sqrt(d_head)` 挣扎;超过256时,你失去"多个小专家"的好处。

## 交付成果

参见 `outputs/skill-mha-configurator.md`。该技能根据参数预算、序列长度和部署目标为新transformer推荐头数、KV头数和投影策略。

## 练习

1. **简单。** 从 `code/main.py` 中取MHA,将 `n_heads` 从1改为16,`d_model=64` 固定。在一个合成复制任务上绘制微型单层模型的损失。更多头有帮助、趋于平台还是有害?
2. **中等。** 实现MQA(一个KV头在所有查询头之间共享)。测量相比完整MHA参数量下降多少。计算推理时N=2048的KV缓存大小缩减多少。
3. **困难。** 实现微型版多头潜在注意力:将K,V压缩为秩为 `r` 的潜在向量,将潜在向量存储在KV缓存中,在注意力时解压。在什么 `r` 值下,缓存内存降到完整MHA的1/8以下,同时质量保持在验证ppl的1 bit以内?

## 关键术语

| 术语      | 人们怎么说             | 实际含义                                                                 |
| --------- | ---------------------- | ------------------------------------------------------------------------ |
| 头        | "单个注意力电路"       | 一个维度为 `d_head = d_model / n_heads` 的Q/K/V投影,有自己的注意力矩阵。 |
| d_head    | "头维度"               | 每个头的隐藏宽度;生产中几乎总是64或128。                                 |
| 拆分/合并 | "重塑技巧"             | 围绕注意力的 `(N, d_model) ↔ (n_heads, N, d_head)` 重塑+转置。           |
| W_o       | "输出投影"             | 拼接头后应用的 `(d_model, d_model)` 矩阵;头混合的地方。                  |
| MQA       | "一个KV头"             | 多查询注意力:单个共享K/V投影。最小KV缓存,有一些质量损失。                |
| GQA       | "Llama 2以来的默认"    | 分组查询注意力,`n_kv_heads < n_heads`;重复以匹配Q。                      |
| MLA       | "DeepSeek的技巧"       | 多头潜在注意力:K,V压缩为低秩潜在,在注意力时解压。                        |
| 归纳头    | "上下文学习背后的电路" | 检测先前出现并复制其后内容的一对头。                                     |

## 延伸阅读

- [Vaswani et al. (2017). Attention Is All You Need §3.2.2](https://arxiv.org/abs/1706.03762) — 原始多头规范。
- [Shazeer (2019). Fast Transformer Decoding: One Write-Head is All You Need](https://arxiv.org/abs/1911.02150) — MQA论文。
- [Ainslie et al. (2023). GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints](https://arxiv.org/abs/2305.13245) — 训练后如何将MHA转换为GQA。
- [DeepSeek-AI (2024). DeepSeek-V2 Technical Report](https://arxiv.org/abs/2405.04434) — MLA及其为何在缓存内存上胜过MHA/GQA。
- [Olsson et al. (2022). In-context Learning and Induction Heads](https://transformer-circuits.pub/2022/in-context-learning-and-induction-heads/index.html) — 对头实际功能的机制分析。
