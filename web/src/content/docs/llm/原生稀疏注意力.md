---
title: 原生稀疏注意力
description: '理解 Native Sparse Attention，通过混合注意力模式实现长序列高效推理'
module: llm
difficulty: advanced
tags:
  - 'sparse attention'
  - NSA
  - 长序列
  - 稀疏注意力
related:
  - llm/异步Hogwild推理
  - 'llm/预训练Mini-GPT'
  - llm/指令微调SFT
  - llm/Agent框架权衡
prerequisites:
  - llm/安全护栏
---

# 原生稀疏注意力

> 标准注意力的计算复杂度是 O(n^2)。处理 128K token 的序列需要 16B 次注意力计算。原生稀疏注意力（NSA）通过混合局部、块级和全局注意力模式，将复杂度降到接近 O(n)。

**类型：** 概念
**前置条件：** Phase 10 Lesson 12（推理优化）
**预计时间：** ~30 分钟

## 学习目标

- 理解 NSA 的三种注意力模式
- 掌握稀疏注意力的硬件友好实现
- 理解 NSA 与滑动窗口注意力的区别

## 三种注意力模式

NSA 将注意力分解为三个互补的组件：

1. **Token-level 局部注意力**：每个 token 关注附近的窗口（如 512 token）
2. **Block-level 块注意力**：将序列分块，每块取一个代表 token
3. **Global 全局注意力**：选择少量重要 token 作为全局锚点

```
序列: [t1, t2, ..., t128K]

局部: 每个 token 关注前后 512 个 token
块级: 每 64 个 token 取 1 个代表 → 2K 个代表 token
全局: 选择 128 个重要 token 作为锚点

总注意力: 512 + 2K + 128 ≈ 2.6K（vs 128K 全注意力）
```

```python
class NativeSparseAttention(nn.Module):
    """简化的原生稀疏注意力"""

    def __init__(self, d_model, n_heads, window_size=512,
                 block_size=64, n_anchors=128):
        super().__init__()
        self.n_heads = n_heads
        self.d_head = d_model // n_heads
        self.window_size = window_size
        self.block_size = block_size
        self.n_anchors = n_anchors

        self.qkv = nn.Linear(d_model, 3 * d_model)
        self.proj = nn.Linear(d_model, d_model)

    def forward(self, x):
        B, T, C = x.shape
        q, k, v = self.qkv(x).chunk(3, dim=-1)

        q = q.view(B, T, self.n_heads, self.d_head).transpose(1, 2)
        k = k.view(B, T, self.n_heads, self.d_head).transpose(1, 2)
        v = v.view(B, T, self.n_heads, self.d_head).transpose(1, 2)

        # 1. 局部注意力（滑动窗口）
        local_attn = self._local_attention(q, k, v)

        # 2. 块级注意力
        block_attn = self._block_attention(q, k, v)

        # 3. 全局锚点注意力
        global_attn = self._global_attention(q, k, v)

        # 合并三种注意力
        output = local_attn + block_attn + global_attn
        output = output.transpose(1, 2).contiguous().view(B, T, C)
        return self.proj(output)

    def _local_attention(self, q, k, v):
        """局部滑动窗口注意力"""
        # 使用 Flash Attention 的滑动窗口模式
        # 实际实现使用 flash_attn_with_kvcache
        pass

    def _block_attention(self, q, k, v):
        """块级注意力：每 block_size 个 token 取一个代表"""
        B, H, T, D = q.shape
        # 取每块的第一个 token 作为代表
        block_indices = torch.arange(0, T, self.block_size, device=q.device)
        k_blocks = k[:, :, block_indices]
        v_blocks = v[:, :, block_indices]

        attn = torch.softmax(q @ k_blocks.transpose(-2, -1) / (D ** 0.5), dim=-1)
        return attn @ v_blocks

    def _global_attention(self, q, k, v):
        """全局锚点注意力"""
        # 选择重要 token（简化：均匀采样）
        B, H, T, D = q.shape
        anchor_indices = torch.linspace(0, T - 1, self.n_anchors, dtype=torch.long, device=q.device)
        k_anchors = k[:, :, anchor_indices]
        v_anchors = v[:, :, anchor_indices]

        attn = torch.softmax(q @ k_anchors.transpose(-2, -1) / (D ** 0.5), dim=-1)
        return attn @ v_anchors
```

## 关键术语

| 术语       | 通俗说法     | 实际含义                                    |
| ---------- | ------------ | ------------------------------------------- |
| 稀疏注意力 | "选择性关注" | 每个 token 只关注部分而非全部其他 token     |
| 滑动窗口   | "局部视野"   | 每个 token 只关注固定窗口内的 token         |
| 块级注意力 | "摘要关注"   | 将序列分块，每块取代表 token 进行注意力计算 |

## 延伸阅读

- [DeepSeek-AI, 2025 -- "Native Sparse Attention: Hardware-Aligned and Natively Trainable Sparse Attention"](https://arxiv.org/abs/2502.11089) -- NSA 论文
