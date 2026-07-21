---
title: 差分注意力V2
description: 理解差分注意力机制，通过减去注意力噪声提升模型性能
module: llm
difficulty: advanced
tags:
  - 'differential attention'
  - 注意力机制
  - 差分注意力
related:
  - llm/安全护栏
  - llm/多Token预测
  - llm/分词器
prerequisites:
  - llm/安全护栏
---

# 差分注意力V2

> 标准注意力将 softmax 应用于 QK^T，但 softmax 会给不相关的 token 分配非零注意力。差分注意力通过两个 softmax 的差来消除这种噪声——就像差分放大器消除共模噪声一样。

**类型：** 概念
**前置条件：** Phase 10 Lesson 04（预训练 Mini-GPT）
**预计时间：** ~30 分钟

## 学习目标

- 理解标准注意力的噪声问题
- 掌握差分注意力的数学公式
- 理解差分注意力的实现和训练技巧

## 核心思想

标准注意力：

$$\text{Attn}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d}}\right) V$$

差分注意力：

$$\text{DiffAttn}(Q, K, V) = \left(\text{softmax}\left(\frac{Q_1 K_1^T}{\sqrt{d}}\right) - \lambda \cdot \text{softmax}\left(\frac{Q_2 K_2^T}{\sqrt{d}}\right)\right) V$$

其中 $\lambda$ 是可学习的标量参数。第一个 softmax 捕获信号，第二个 softmax 捕获噪声，两者相减得到更干净的注意力分布。

```python
class DifferentialAttention(nn.Module):
    """差分注意力"""

    def __init__(self, d_model, n_heads, dropout=0.1):
        super().__init__()
        self.n_heads = n_heads
        self.d_head = d_model // n_heads

        # QKV 投影（2x，分别用于两个 softmax）
        self.qkv = nn.Linear(d_model, 6 * d_model)
        self.proj = nn.Linear(d_model, d_model)

        # 可学习的 lambda
        self.lambda_init = 0.8
        self.lambda_q1 = nn.Parameter(torch.randn(n_heads, self.d_head) * 0.1)
        self.lambda_k1 = nn.Parameter(torch.randn(n_heads, self.d_head) * 0.1)
        self.lambda_q2 = nn.Parameter(torch.randn(n_heads, self.d_head) * 0.1)
        self.lambda_k2 = nn.Parameter(torch.randn(n_heads, self.d_head) * 0.1)

        self.dropout = nn.Dropout(dropout)

    def forward(self, x, mask=None):
        B, T, C = x.shape
        qkv = self.qkv(x)
        q1, k1, q2, k2, v1, v2 = qkv.chunk(6, dim=-1)

        # 重塑为多头
        q1 = q1.view(B, T, self.n_heads, self.d_head).transpose(1, 2)
        k1 = k1.view(B, T, self.n_heads, self.d_head).transpose(1, 2)
        q2 = q2.view(B, T, self.n_heads, self.d_head).transpose(1, 2)
        k2 = k2.view(B, T, self.n_heads, self.d_head).transpose(1, 2)
        v = v1.view(B, T, self.n_heads, self.d_head * 2).transpose(1, 2)

        # 两个 softmax
        attn1 = torch.softmax(q1 @ k1.transpose(-2, -1) / (self.d_head ** 0.5), dim=-1)
        attn2 = torch.softmax(q2 @ k2.transpose(-2, -1) / (self.d_head ** 0.5), dim=-1)

        # 计算 lambda
        lam = torch.exp(
            self.lambda_q1 @ self.lambda_k1.T -
            self.lambda_q2 @ self.lambda_k2.T
        ).mean()

        # 差分注意力
        attn = attn1 - lam * attn2
        attn = self.dropout(attn)

        out = attn @ v
        out = out.transpose(1, 2).contiguous().view(B, T, C)
        return self.proj(out)
```

## 关键术语

| 术语       | 通俗说法     | 实际含义                                     |
| ---------- | ------------ | -------------------------------------------- |
| 差分注意力 | "减法注意力" | 通过两个 softmax 的差消除注意力噪声          |
| 注意力噪声 | "无关关注"   | softmax 给不相关 token 分配的非零注意力权重  |
| Lambda     | "噪声权重"   | 控制第二个 softmax（噪声项）权重的可学习参数 |

## 延伸阅读

- [Ye et al., 2024 -- "Differential Transformer"](https://arxiv.org/abs/2410.05258) -- 差分注意力原始论文
