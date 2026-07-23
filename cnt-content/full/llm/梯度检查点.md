---
title: 梯度检查点
description: 理解梯度检查点技术，通过重计算代替存储激活值来减少训练内存
module: llm
difficulty: intermediate
tags:
  - 'gradient checkpointing'
  - 内存优化
  - 训练优化
  - 激活重计算
related:
  - llm/生产应用
  - llm/数据流水线
  - llm/提示工程
  - llm/提示缓存
prerequisites:
  - llm/安全护栏
---

# 梯度检查点

> 训练 70B 模型时，激活值占用 60% 以上的 GPU 内存。梯度检查点用时间换空间——不存储中间激活值，反向传播时重新计算。内存减少 70%，训练速度降低 25%。

**类型：** 构建
**语言：** Python
**前置条件：** Phase 10 Lesson 05（扩展与分布式训练）
**预计时间：** ~30 分钟

## 学习目标

- 理解梯度检查点的核心思想：用重计算换内存
- 掌握 PyTorch 中梯度检查点的使用
- 理解检查点策略的选择：全部检查点 vs 选择性检查点

## 核心思想

标准训练：前向传播时保存所有中间激活值，反向传播时直接使用。

梯度检查点：前向传播时只保存部分"检查点"的激活值，反向传播时从最近的检查点重新计算。

```
标准: 保存 [A1, A2, A3, A4, A5, A6] → 反向传播直接使用
检查点: 保存 [A1,       A4,       ] → 反向传播时重计算 A2,A3 和 A5,A6
```

## 内存分析

| 策略         | 激活内存   | 计算量  | 速度   |
| ------------ | ---------- | ------- | ------ |
| 无检查点     | O(n)       | 1x      | 1x     |
| 全部检查点   | O(sqrt(n)) | 2x      | ~0.75x |
| 选择性检查点 | O(n/k)     | 1 + 1/k | ~0.85x |

## PyTorch 使用

```python
from torch.utils.checkpoint import checkpoint


class TransformerBlockWithCheckpoint(nn.Module):
    """带梯度检查点的 Transformer 块"""

    def __init__(self, d_model, n_heads, use_checkpoint=True):
        super().__init__()
        self.use_checkpoint = use_checkpoint
        self.ln1 = nn.LayerNorm(d_model)
        self.attn = CausalSelfAttention(d_model, n_heads)
        self.ln2 = nn.LayerNorm(d_model)
        self.ff = FeedForward(d_model)

    def forward(self, x):
        if self.use_checkpoint and self.training:
            # 使用梯度检查点
            return checkpoint(self._forward, x, use_reentrant=False)
        else:
            return self._forward(x)

    def _forward(self, x):
        x = x + self.attn(self.ln1(x))
        x = x + self.ff(self.ln2(x))
        return x


# 全局启用梯度检查点
from transformers import AutoModelForCausalLM

model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-2-7b-hf",
    gradient_checkpointing=True,  # 启用梯度检查点
)
```

## 选择性检查点

不是所有层都值得检查点。注意力层的激活值大但重计算便宜，FFN 层则相反。

```python
def selective_checkpoint_policy(module_name):
    """选择性检查点策略"""
    # 只检查点注意力层（激活值大，重计算便宜）
    if 'attn' in module_name:
        return True
    # FFN 层不检查点（重计算贵，激活值相对小）
    return False
```

## 关键术语

| 术语         | 通俗说法     | 实际含义                                                 |
| ------------ | ------------ | -------------------------------------------------------- |
| 梯度检查点   | "存档点"     | 前向传播时只保存部分中间结果，反向传播时从检查点重新计算 |
| 激活重计算   | "重新算一遍" | 反向传播时重新执行前向传播以获取需要的激活值             |
| 选择性检查点 | "挑着存"     | 只对内存收益大、重计算代价小的层使用检查点               |

## 延伸阅读

- [Chen et al., 2016 -- "Training Deep Nets with Sublinear Memory Cost"](https://arxiv.org/abs/1604.06174) -- 梯度检查点原始论文
- [PyTorch Gradient Checkpointing 文档](https://pytorch.org/docs/stable/checkpoint.html) -- PyTorch 官方文档
