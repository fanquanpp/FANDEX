---
title: 自注意力从零实现
description: '注意力是一个查找表,每个词询问"谁对我重要?"——并学习答案'
module: 'deep-learning'
difficulty: intermediate
tags:
  - 自注意力
  - 注意力机制
  - QKV
  - softmax
  - Transformer
related:
  - 'deep-learning/正则化'
  - 'deep-learning/注意力变体'
  - 'deep-learning/BERT掩码语言建模'
  - 'deep-learning/GPT因果语言建模'
prerequisites:
  - 'deep-learning/深度学习概述'
---

# 自注意力从零实现

> 注意力是一个查找表,每个词询问"谁对我重要?"——并学习答案。

**类型:** 构建
**语言:** Python
**前置知识:** 阶段3(深度学习核心), 阶段5第10课(序列到序列)
**预计时间:** ~90分钟

## 学习目标

- 仅使用NumPy从零实现缩放点积自注意力,包括query/key/value投影和softmax加权求和
- 构建多头注意力层,拆分头、并行计算注意力并拼接结果
- 追踪注意力矩阵如何捕获token关系,解释为什么除以sqrt(d_k)可以防止softmax饱和
- 应用因果掩码将双向注意力转换为自回归(解码器风格)注意力

## 问题所在

RNN一次处理一个token的序列。当你到达第50个token时,来自第1个token的信息已经被压缩通过了50个压缩步骤。长程依赖被压缩成固定大小的隐藏状态——这是LSTM门控永远无法完全解决的瓶颈。

2014年的Bahdanau注意力论文展示了解决方案:让解码器回看每个编码器位置,并决定哪些对当前步骤重要。但它仍然附加在RNN上。2017年的"Attention Is All You Need"论文提出了一个更尖锐的问题:如果注意力是*唯一*的机制会怎样?没有循环。没有卷积。只有注意力。

自注意力让序列中的每个位置在单个并行步骤中关注每个其他位置。这就是使transformer快速、可扩展和占主导地位的原因。

## 核心概念

### 数据库查找类比

将注意力视为软数据库查找:

```
传统数据库:
  查询: "法国首都"  -->  精确匹配  -->  "巴黎"

注意力:
  查询: "法国首都"  -->  与所有key的相似度  -->  所有value的加权混合
```

每个token生成三个向量:

- **Query (Q)**: "我在寻找什么?"
- **Key (K)**: "我包含什么?"
- **Value (V)**: "如果被选中,我提供什么信息?"

查询与所有key的点积产生注意力分数。高分意味着"这个key匹配我的查询"。这些分数对value进行加权。输出是value的加权和。

### Q, K, V 计算

每个token嵌入通过三个学习到的权重矩阵进行投影:

```
输入嵌入(n个token的序列,每个d维):

  X = [x1, x2, x3, ..., xn]       形状: (n, d)

三个权重矩阵:

  Wq  形状: (d, dk)
  Wk  形状: (d, dk)
  Wv  形状: (d, dv)

投影:

  Q = X @ Wq    形状: (n, dk)      每个token的查询
  K = X @ Wk    形状: (n, dk)      每个token的键
  V = X @ Wv    形状: (n, dv)      每个token的值
```

直观地,对于一个token:

```
             Wq
  x_i ------[*]------> q_i    "我在寻找什么?"
       |
       |     Wk
       +----[*]------> k_i    "我包含什么?"
       |
       |     Wv
       +----[*]------> v_i    "我提供什么?"
```

### 注意力矩阵

一旦你有了所有token的Q, K, V,注意力分数形成一个矩阵:

```
分数 = Q @ K^T    形状: (n, n)

              k1    k2    k3    k4    k5
        +-----+-----+-----+-----+-----+
   q1   | 2.1 | 0.3 | 0.1 | 0.8 | 0.2 |   <- q1对每个key的关注程度
        +-----+-----+-----+-----+-----+
   q2   | 0.4 | 1.9 | 0.7 | 0.1 | 0.3 |
        +-----+-----+-----+-----+-----+
   q3   | 0.2 | 0.6 | 2.3 | 0.5 | 0.1 |
        +-----+-----+-----+-----+-----+
   q4   | 0.9 | 0.1 | 0.4 | 1.7 | 0.6 |
        +-----+-----+-----+-----+-----+
   q5   | 0.1 | 0.3 | 0.2 | 0.5 | 2.0 |
        +-----+-----+-----+-----+-----+

每行: 一个token对整个序列的注意力
```

观察一个查询逐个扫过key:每行对每个token评分,softmax将分数转换为权重,上下文向量是value的加权混合。

### 为什么要缩放?

点积随维度dk增长。如果dk = 64,点积可能在几十的范围内,将softmax推入梯度消失的区域。修复方法:除以sqrt(dk)。

```
缩放分数 = (Q @ K^T) / sqrt(dk)
```

这使值保持在softmax产生有用梯度的范围内。

### Softmax将分数转换为权重

Softmax将原始分数转换为每行的概率分布:

```
q1的原始分数:   [2.1, 0.3, 0.1, 0.8, 0.2]
                            |
                         softmax
                            |
注意力权重:   [0.52, 0.09, 0.07, 0.14, 0.08]   (总和约1.0)
```

现在每个token都有一组权重,表示对每个其他token的关注程度。

### Value的加权和

每个token的最终输出是所有value向量的加权和:

```
output_i = sum( attention_weight[i][j] * v_j  for all j )

对于token 1:
  output_1 = 0.52 * v1 + 0.09 * v2 + 0.07 * v3 + 0.14 * v4 + 0.08 * v5
```

### 完整流水线

```mermaid
flowchart LR
  X["X (输入)"] --> Q["Q = X · Wq"]
  X --> K["K = X · Wk"]
  X --> V["V = X · Wv"]
  Q --> S["Q · Kᵀ / √dk"]
  K --> S
  S --> SM["softmax"]
  SM --> WS["加权和"]
  V --> WS
  WS --> O["输出"]
```

一行公式:

```
Attention(Q, K, V) = softmax( Q @ K^T / sqrt(dk) ) @ V
```

## 动手构建

### 步骤1:从零实现Softmax

Softmax将原始logits转换为概率。减去最大值以保持数值稳定性。

```python
import numpy as np

def softmax(x):
    shifted = x - np.max(x, axis=-1, keepdims=True)
    exp_x = np.exp(shifted)
    return exp_x / np.sum(exp_x, axis=-1, keepdims=True)

logits = np.array([2.0, 1.0, 0.1])
print(f"logits:  {logits}")
print(f"softmax: {softmax(logits)}")
print(f"sum:     {softmax(logits).sum():.4f}")
```

### 步骤2:缩放点积注意力

核心函数。接收Q, K, V矩阵,返回注意力输出和权重矩阵。

```python
def scaled_dot_product_attention(Q, K, V):
    dk = Q.shape[-1]
    scores = Q @ K.T / np.sqrt(dk)
    weights = softmax(scores)
    output = weights @ V
    return output, weights
```

### 步骤3:带学习投影的自注意力类

一个完整的自注意力模块,具有Wq, Wk, Wv权重矩阵,使用类Xavier缩放初始化。

```python
class SelfAttention:
    def __init__(self, d_model, dk, dv, seed=42):
        rng = np.random.default_rng(seed)
        scale = np.sqrt(2.0 / (d_model + dk))
        self.Wq = rng.normal(0, scale, (d_model, dk))
        self.Wk = rng.normal(0, scale, (d_model, dk))
        scale_v = np.sqrt(2.0 / (d_model + dv))
        self.Wv = rng.normal(0, scale_v, (d_model, dv))
        self.dk = dk

    def forward(self, X):
        Q = X @ self.Wq
        K = X @ self.Wk
        V = X @ self.Wv
        output, weights = scaled_dot_product_attention(Q, K, V)
        return output, weights
```

### 步骤4:在句子上运行

为一个句子创建假嵌入并观察注意力权重。

```python
sentence = ["The", "cat", "sat", "on", "the", "mat"]
n_tokens = len(sentence)
d_model = 8
dk = 4
dv = 4

rng = np.random.default_rng(42)
X = rng.normal(0, 1, (n_tokens, d_model))

attn = SelfAttention(d_model, dk, dv, seed=42)
output, weights = attn.forward(X)

print("注意力权重 (每行: 该token看向哪里):\n")
print(f"{'':>6}", end="")
for token in sentence:
    print(f"{token:>6}", end="")
print()

for i, token in enumerate(sentence):
    print(f"{token:>6}", end="")
    for j in range(n_tokens):
        w = weights[i][j]
        print(f"{w:6.3f}", end="")
    print()
```

### 步骤5:用ASCII热力图可视化注意力

将注意力权重映射为字符以快速可视化。

```python
def ascii_heatmap(weights, tokens, chars=" ░▒▓█"):
    n = len(tokens)
    print(f"\n{'':>6}", end="")
    for t in tokens:
        print(f"{t:>6}", end="")
    print()

    for i in range(n):
        print(f"{tokens[i]:>6}", end="")
        for j in range(n):
            level = int(weights[i][j] * (len(chars) - 1) / weights.max())
            level = min(level, len(chars) - 1)
            print(f"{'  ' + chars[level] + '   '}", end="")
        print()

ascii_heatmap(weights, sentence)
```

## 实际应用

PyTorch的 `nn.MultiheadAttention` 做的正是我们构建的东西,加上多头拆分和输出投影:

```python
import torch
import torch.nn as nn

d_model = 8
n_heads = 2
seq_len = 6

mha = nn.MultiheadAttention(embed_dim=d_model, num_heads=n_heads, batch_first=True)

X_torch = torch.randn(1, seq_len, d_model)

output, attn_weights = mha(X_torch, X_torch, X_torch)

print(f"输入形状:            {X_torch.shape}")
print(f"输出形状:           {output.shape}")
print(f"注意力权重形状: {attn_weights.shape}")
print(f"\n注意力权重 (头平均):")
print(attn_weights[0].detach().numpy().round(3))
```

关键区别:多头注意力并行运行多个注意力函数,每个都有自己的Q, K, V投影,大小为dk = d_model / n_heads,然后拼接结果。这让模型可以同时关注不同类型的关系。

## 交付成果

本课产出:

- `outputs/prompt-attention-explainer.md` - 通过数据库查找类比解释注意力的提示词

## 练习

1. 修改 `scaled_dot_product_attention` 以接受可选的掩码矩阵,在softmax之前将某些位置设为负无穷(这就是因果/解码器掩码的工作方式)
2. 从零实现多头注意力:将Q, K, V拆分为 `n_heads` 块,在每个上运行注意力,拼接,并通过最终权重矩阵Wo投影
3. 取两个相同长度的不同句子,通过同一个SelfAttention实例,比较它们的注意力模式。什么变了?什么没变?

## 关键术语

| 术语           | 人们怎么说          | 实际含义                                                      |
| -------------- | ------------------- | ------------------------------------------------------------- |
| Query (Q)      | "问题向量"          | 输入的学习投影,表示该token在寻找什么信息                      |
| Key (K)        | "标签向量"          | 学习投影,表示该token包含什么信息,与查询匹配                   |
| Value (V)      | "内容向量"          | 学习投影,携带根据注意力分数聚合的实际信息                     |
| 缩放点积注意力 | "注意力公式"        | softmax(QK^T / sqrt(dk)) @ V - 缩放防止高维度下softmax饱和    |
| 自注意力       | "token看自己和其他" | Q, K, V都来自同一序列的注意力,让每个位置关注每个其他位置      |
| 注意力权重     | "多少关注"          | 由缩放点积的softmax产生的位置上的概率分布                     |
| 多头注意力     | "并行注意力"        | 使用不同投影运行多个注意力函数,然后拼接结果以获得更丰富的表示 |

## 延伸阅读

- [Attention Is All You Need (Vaswani et al., 2017)](https://arxiv.org/abs/1706.03762) - 原始transformer论文
- [The Illustrated Transformer (Jay Alammar)](https://jalammar.github.io/illustrated-transformer/) - 最佳完整架构可视化讲解
- [The Annotated Transformer (Harvard NLP)](https://nlp.seas.harvard.edu/annotated-transformer/) - 逐行PyTorch实现与解释
