---
title: 'Jamba混合SSM-Transformer'
description: '理解 Jamba 模型如何结合 SSM（状态空间模型）和 Transformer 实现高效长序列处理'
module: llm
difficulty: advanced
tags:
  - Jamba
  - SSM
  - Mamba
  - 'hybrid architecture'
  - 状态空间模型
related:
  - llm/DPO直接偏好优化
  - llm/DualPipe并行
  - llm/LangGraph状态机
  - llm/LLM工程评估
prerequisites:
  - llm/安全护栏
---

# Jamba混合SSM-Transformer

> Transformer 擅长回忆远距离信息，但注意力复杂度是 O(n^2)。Mamba（SSM）是 O(n) 但长程回忆能力弱。Jamba 把两者混合——SSM 层处理高效序列建模，注意力层提供精准回忆。

**类型：** 概念
**前置条件：** Phase 10 Lesson 14（开源模型架构详解）
**预计时间：** ~30 分钟

## 学习目标

- 理解 SSM（状态空间模型）和 Mamba 的核心思想
- 掌握 Jamba 的混合架构设计
- 理解 SSM 和 Transformer 层的互补性

## Mamba/SSM 基础

状态空间模型将序列建模为连续动态系统：

$$h'(t) = Ah(t) + Bx(t)$$
$$y(t) = Ch(t) + Dx(t)$$

Mamba 的关键创新：选择性扫描（selective scan）——让 B、C、Δ 参数依赖输入，实现动态过滤。

```python
class SimplifiedMambaBlock(nn.Module):
    """简化的 Mamba 块"""

    def __init__(self, d_model, d_state=16, d_conv=4):
        super().__init__()
        self.d_state = d_state

        # 输入投影
        self.in_proj = nn.Linear(d_model, d_model * 2)

        # 卷积
        self.conv1d = nn.Conv1d(d_model, d_model, kernel_size=d_conv,
                                padding=d_conv - 1, groups=d_model)

        # SSM 参数（依赖输入）
        self.x_proj = nn.Linear(d_model, d_state * 2 + 1)  # B, C, Δ
        self.A_log = nn.Parameter(torch.log(torch.randn(d_model, d_state)))
        self.D = nn.Parameter(torch.ones(d_model))

        self.out_proj = nn.Linear(d_model, d_model)

    def forward(self, x):
        B, T, D = x.shape

        # 投影和分叉
        xz = self.in_proj(x)
        x_branch, z = xz.chunk(2, dim=-1)

        # 卷积
        x_branch = self.conv1d(x_branch.transpose(1, 2)).transpose(1, 2)[:, :T]
        x_branch = F.silu(x_branch)

        # SSM 参数（输入依赖）
        ssm_params = self.x_proj(x_branch)
        B_param = ssm_params[:, :, :self.d_state]
        C_param = ssm_params[:, :, self.d_state:self.d_state * 2]
        dt = F.softplus(ssm_params[:, :, -1:])

        # 离散化 A
        A = -torch.exp(self.A_log)  # [D, d_state]

        # 选择性扫描（简化实现）
        y = self._selective_scan(x_branch, A, B_param, C_param, dt)

        # 门控
        y = y * F.silu(z)
        return self.out_proj(y)
```

## Jamba 混合架构

Jamba 交替使用 Mamba 层和注意力层：

```
[Mamba] [Mamba] [Mamba] [Attention] [Mamba] [Mamba] [Mamba] [Attention] ...
```

每隔几层插入一个注意力层，提供长程回忆能力，其余层使用 Mamba 保持 O(n) 复杂度。

| 特性       | Jamba           |
| ---------- | --------------- |
| 参数量     | 52B（12B 激活） |
| 层数       | 64              |
| Mamba 层数 | 56              |
| 注意力层数 | 8               |
| 上下文长度 | 256K            |
| 注意力类型 | GQA             |

## 关键术语

| 术语       | 通俗说法     | 实际含义                                      |
| ---------- | ------------ | --------------------------------------------- |
| SSM        | "状态空间"   | State Space Model，将序列建模为连续动态系统   |
| Mamba      | "选择性 SSM" | 输入依赖参数化的状态空间模型，O(n) 复杂度     |
| 选择性扫描 | "动态过滤"   | 根据输入动态调整 SSM 参数，实现选择性信息传递 |

## 延伸阅读

- [Gu & Dao, 2023 -- "Mamba: Linear-Time Sequence Modeling with Selective State Spaces"](https://arxiv.org/abs/2312.00752) -- Mamba 论文
- [Lieber et al., 2024 -- "Jamba: A Hybrid Transformer-Mamba Language Model"](https://arxiv.org/abs/2403.19887) -- Jamba 论文
