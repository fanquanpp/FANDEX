---
title: 多Token预测
description: '理解多 Token 预测（Multi-Token Prediction），让模型一次预测多个 token 提升训练效率'
module: llm
difficulty: advanced
tags:
  - 'multi-token prediction'
  - MTP
  - 训练效率
  - 并行预测
related:
  - llm/安全护栏
  - llm/差分注意力V2
  - llm/分词器
  - llm/高级RAG
prerequisites:
  - llm/安全护栏
---

# 多Token预测

> 标准语言模型一次只预测一个 token。多 Token 预测（MTP）让模型同时预测未来 n 个 token——训练信号更密集，推理时可用于推测解码。

**类型：** 概念
**前置条件：** Phase 10 Lesson 04（预训练 Mini-GPT）
**预计时间：** ~30 分钟

## 学习目标

- 理解 MTP 的训练目标和架构
- 掌握 MTP 与标准 next-token 预测的区别
- 理解 MTP 在训练和推理两阶段的收益

## 核心思想

标准训练：给定 $x_1, ..., x_t$，预测 $x_{t+1}$

MTP 训练：给定 $x_1, ..., x_t$，同时预测 $x_{t+1}, x_{t+2}, ..., x_{t+n}$

```python
class MultiTokenPredictor(nn.Module):
    """多 Token 预测头"""

    def __init__(self, d_model, vocab_size, n_future=4):
        super().__init__()
        self.n_future = n_future

        # 每个未来位置一个独立的输出头
        self.heads = nn.ModuleList([
            nn.Linear(d_model, vocab_size, bias=False)
            for _ in range(n_future)
        ])

        # 共享的 Transformer 层（可选）
        self.shared_layers = nn.ModuleList([
            nn.TransformerEncoderLayer(d_model, nhead=8, batch_first=True)
            for _ in range(n_future - 1)
        ])

    def forward(self, hidden_states, targets=None):
        """
        hidden_states: [B, T, D] 主干模型的输出
        targets: [B, T, n_future] 未来 n 个 token 的目标
        """
        logits_list = []
        loss = 0

        # 第 1 个预测：直接从隐藏状态预测
        logits_list.append(self.heads[0](hidden_states))

        # 第 2 到 n 个预测：通过额外的 Transformer 层
        current_hidden = hidden_states
        for i in range(1, self.n_future):
            current_hidden = self.shared_layers[i - 1](current_hidden)
            logits_list.append(self.heads[i](current_hidden))

        if targets is not None:
            for i, logits in enumerate(logits_list):
                # 移位对齐
                shift_logits = logits[:, :-i-1, :].contiguous()
                shift_targets = targets[:, i+1:, 0].contiguous()
                loss += F.cross_entropy(
                    shift_logits.view(-1, logits.size(-1)),
                    shift_targets.view(-1),
                )
            loss /= self.n_future

        return logits_list, loss
```

## MTP 的收益

**训练阶段：**

- 更密集的训练信号（每个位置产生 n 个梯度而非 1 个）
- 迫使模型学习更长范围的依赖
- 实验表明 MTP 训练的模型在下游任务上表现更好

**推理阶段：**

- MTP 头可作为推测解码的 draft 模型
- 无需额外的 draft 模型，零额外参数开销
- DeepSeek-V3 使用 MTP 实现了 1.8x 推理加速

## 关键术语

| 术语         | 通俗说法       | 实际含义                                       |
| ------------ | -------------- | ---------------------------------------------- |
| MTP          | "一次猜多个词" | Multi-Token Prediction，同时预测未来多个 token |
| 训练信号密度 | "每步学到更多" | 每个训练步骤产生的梯度信息量                   |

## 延伸阅读

- [Gloeckle et al., 2024 -- "Better & Faster Large Language Models via Multi-token Prediction"](https://arxiv.org/abs/2404.19737) -- Meta 的 MTP 论文
- [DeepSeek-AI, 2024 -- "DeepSeek-V3 Technical Report"](https://arxiv.org/abs/2412.19437) -- DeepSeek-V3 中 MTP 的应用
