---
title: 开源模型架构详解
description: '深入分析主流开源 LLM 的架构设计，包括 LLaMA、Mistral、Mixtral 和 Qwen'
module: llm
difficulty: intermediate
tags:
  - architecture
  - LLaMA
  - Mistral
  - Mixtral
  - MoE
  - 模型架构
related:
  - llm/缓存与成本
  - llm/结构化输出
  - llm/扩展与分布式训练
  - llm/量化
prerequisites:
  - llm/安全护栏
---

# 开源模型架构详解

> 每个 LLM 的架构选择都有原因。LLaMA 为什么用 RoPE？Mistral 为什么用滑动窗口注意力？Mixtral 的 MoE 是怎么工作的？理解这些设计决策，你才能选择合适的模型。

**类型：** 概念
**前置条件：** Phase 10 Lesson 04（预训练 Mini-GPT）
**预计时间：** ~60 分钟

## 学习目标

- 理解主流开源 LLM 的架构差异
- 掌握关键架构组件：RoPE、GQA、SwiGLU、滑动窗口注意力
- 理解 MoE（混合专家）架构的工作原理
- 能够根据任务需求选择合适的模型

## 架构对比

| 特性     | GPT 系列  | LLaMA 2 | Mistral        | Mixtral        | Qwen2   |
| -------- | --------- | ------- | -------------- | -------------- | ------- |
| 位置编码 | 学习式    | RoPE    | RoPE           | RoPE           | RoPE    |
| 注意力   | MHA       | GQA     | GQA + 滑动窗口 | GQA + 滑动窗口 | GQA     |
| 激活函数 | GeLU      | SwiGLU  | SwiGLU         | SwiGLU         | SwiGLU  |
| 归一化   | LayerNorm | RMSNorm | RMSNorm        | RMSNorm        | RMSNorm |
| 偏置项   | 有        | 无      | 无             | 无             | 无      |
| MoE      | 否        | 否      | 否             | 是（8 选 2）   | 否      |
| 词表大小 | 100K+     | 32K     | 32K            | 32K            | 152K    |

## RoPE（旋转位置编码）

RoPE 通过旋转矩阵将位置信息注入注意力计算：

$$q_m = R_{\theta,m} \cdot W_q \cdot x_m$$

$$k_n = R_{\theta,n} \cdot W_k \cdot x_n$$

$$q_m^T k_n = x_m^T W_q^T R_{\theta,n-m} W_k x_n$$

RoPE 的优势：注意力分数只依赖相对位置 $n - m$，天然支持外推。

```python
def precompute_rope_freqs(dim, max_seq_len=4096, base=10000):
    """预计算 RoPE 频率"""
    freqs = 1.0 / (base ** (torch.arange(0, dim, 2).float() / dim))
    t = torch.arange(max_seq_len)
    freqs = torch.outer(t, freqs)
    return torch.cos(freqs), torch.sin(freqs)


def apply_rope(x, cos, sin):
    """应用 RoPE"""
    d = x.shape[-1] // 2
    x1, x2 = x[..., :d], x[..., d:]
    rotated = torch.cat([-x2, x1], dim=-1)
    return x * cos + rotated * sin
```

## GQA（分组查询注意力）

GQA 在 MHA（多头注意力）和 MQA（多查询注意力）之间取折衷：

| 类型 | Q 头数 | K/V 头数 | 内存 | 质量     |
| ---- | ------ | -------- | ---- | -------- |
| MHA  | 32     | 32       | 高   | 最好     |
| GQA  | 32     | 8        | 中   | 接近 MHA |
| MQA  | 32     | 1        | 低   | 略差     |

GQA 让多组 Q 头共享同一组 K/V 头，减少 KV Cache 大小而不显著损失质量。

## SwiGLU 激活函数

SwiGLU 是 GLU（门控线性单元）和 Swish 激活的组合：

$$\text{SwiGLU}(x) = (\text{Swish}(xW_g) \odot xW_1) W_2$$

```python
class SwiGLU(nn.Module):
    def __init__(self, d_model, d_ff=None):
        super().__init__()
        d_ff = d_ff or int(8 * d_model / 3)  # LLaMA 风格
        d_ff = ((d_ff + 63) // 64) * 64  # 对齐到 64

        self.w1 = nn.Linear(d_model, d_ff, bias=False)
        self.w2 = nn.Linear(d_ff, d_model, bias=False)
        self.w3 = nn.Linear(d_model, d_ff, bias=False)

    def forward(self, x):
        return self.w2(F.silu(self.w1(x)) * self.w3(x))
```

## MoE（混合专家）

Mixtral 使用稀疏 MoE：每个 token 只激活 8 个专家中的 2 个。

```python
class MoELayer(nn.Module):
    """简化的 MoE 层"""

    def __init__(self, d_model, d_ff, n_experts=8, top_k=2):
        super().__init__()
        self.n_experts = n_experts
        self.top_k = top_k

        # 路由器
        self.gate = nn.Linear(d_model, n_experts, bias=False)

        # 专家（每个是一个 FFN）
        self.experts = nn.ModuleList([
            nn.Sequential(
                nn.Linear(d_model, d_ff, bias=False),
                nn.SiLU(),
                nn.Linear(d_ff, d_model, bias=False),
            )
            for _ in range(n_experts)
        ])

    def forward(self, x):
        # 计算路由权重
        gate_logits = self.gate(x)
        weights, indices = torch.topk(gate_logits, self.top_k, dim=-1)
        weights = F.softmax(weights, dim=-1)

        # 稀疏计算
        output = torch.zeros_like(x)
        for k in range(self.top_k):
            expert_idx = indices[:, :, k]
            expert_weight = weights[:, :, k:k+1]

            for e in range(self.n_experts):
                mask = (expert_idx == e)
                if mask.any():
                    expert_input = x[mask]
                    expert_output = self.experts[e](expert_input)
                    output[mask] += expert_output * expert_weight[mask]

        return output
```

## 关键术语

| 术语           | 通俗说法       | 实际含义                                            |
| -------------- | -------------- | --------------------------------------------------- |
| RoPE           | "旋转位置编码" | Rotary Position Embedding，通过旋转矩阵编码相对位置 |
| GQA            | "分组注意力"   | Grouped-Query Attention，多组 Q 头共享 K/V 头       |
| SwiGLU         | "门控激活"     | Swish-Gated Linear Unit，LLaMA 系列使用的激活函数   |
| MoE            | "混合专家"     | Mixture of Experts，稀疏激活的专家路由架构          |
| 滑动窗口注意力 | "局部注意力"   | 每个位置只关注固定窗口内的位置，降低长序列计算量    |

## 延伸阅读

- [Touvron et al., 2023 -- "LLaMA: Open and Efficient Foundation Language Models"](https://arxiv.org/abs/2302.13971) -- LLaMA 论文
- [Jiang et al., 2023 -- "Mistral 7B"](https://arxiv.org/abs/2310.06825) -- Mistral 论文
- [Jiang et al., 2024 -- "Mixtral of Experts"](https://arxiv.org/abs/2401.04088) -- Mixtral MoE 论文
- [Su et al., 2021 -- "RoFormer: Enhanced Transformer with Rotary Position Embedding"](https://arxiv.org/abs/2104.09864) -- RoPE 原始论文
