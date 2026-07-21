---
title: 推测解码EAGLE3
description: '理解 EAGLE3 推测解码算法，通过特征级预测实现高效推理加速'
module: llm
difficulty: advanced
tags:
  - 'speculative decoding'
  - EAGLE
  - 推理加速
  - 推测解码
related:
  - llm/提示缓存
  - llm/推测解码
  - llm/推理优化
  - llm/微调与LoRA
prerequisites:
  - llm/安全护栏
---

# 推测解码EAGLE3

> 标准推测解码用小模型猜测大模型的输出。EAGLE3 更进一步——它不猜 token，而是猜特征（feature），然后用大模型的 LM head 一次性验证多个 token。速度提升 3-5x，质量零损失。

**类型：** 概念
**前置条件：** Phase 10 Lesson 12（推理优化）
**预计时间：** ~45 分钟

## 学习目标

- 理解 EAGLE3 的核心创新：特征级推测而非 token 级推测
- 理解为什么特征级推测比 token 级推测更准确
- 分析 EAGLE3 的架构和训练方法
- 理解推测解码的接受率与加速比的关系

## 传统推测解码 vs EAGLE3

**传统方法：** 小模型生成候选 token → 大模型逐个验证

**EAGLE3：** 轻量级 draft 模型预测特征 → 大模型 LM head 批量验证

```
传统推测解码:
  Draft: [t1, t2, t3, t4, t5]  ← token 级预测
  Verify: 大模型逐个验证每个 token

EAGLE3:
  Draft: [f1, f2, f3, f4, f5]  ← 特征级预测
  Verify: 大模型 LM head 一次验证所有特征对应的 token
```

## 为什么特征级更好

Token 级推测的问题：小模型的输出分布与大模型不同，导致接受率低。

特征级推测的优势：

- 特征空间比 token 空间更连续，更容易预测
- 大模型的 LM head 将特征映射为 token 概率，保证输出分布一致
- 多个特征可以并行通过 LM head，验证效率更高

## EAGLE3 架构

EAGLE3 的 draft 模型由以下组件构成：

1. **特征提取器**：从大模型的顶层隐藏状态提取特征
2. **自回归特征预测器**：基于历史特征预测下一个特征
3. **条件信息融合**：将当前上下文信息融入特征预测

```python
class EAGLEDraftModel(nn.Module):
    """简化的 EAGLE draft 模型"""

    def __init__(self, d_model, n_heads=8, n_layers=2):
        super().__init__()
        # 特征投影
        self.feature_proj = nn.Linear(d_model, d_model)

        # 轻量级 Transformer（仅 2 层）
        self.layers = nn.ModuleList([
            nn.TransformerEncoderLayer(
                d_model=d_model,
                nhead=n_heads,
                dim_feedforward=d_model * 2,
                batch_first=True,
            )
            for _ in range(n_layers)
        ])

        self.ln_f = nn.LayerNorm(d_model)

    def forward(self, features):
        """
        features: 大模型的历史特征序列
        返回: 预测的下一个特征
        """
        x = self.feature_proj(features)

        for layer in self.layers:
            x = layer(x)

        x = self.ln_f(x)
        return x  # 预测的特征，将通过大模型的 LM head 映射为 token
```

## 加速比分析

推测解码的加速比取决于：

$$\text{Speedup} = \frac{\text{平均接受长度} + 1}{1 + \text{draft 开销}}$$

| 方法         | 平均接受长度 | Draft 开销 | 加速比 |
| ------------ | ------------ | ---------- | ------ |
| 自回归       | 1            | 0          | 1.0x   |
| 传统推测解码 | 2-3          | 0.3        | 2-2.5x |
| EAGLE3       | 4-6          | 0.2        | 3-5x   |

## 关键术语

| 术语       | 通俗说法       | 实际含义                            |
| ---------- | -------------- | ----------------------------------- |
| 特征级推测 | "猜特征不猜词" | 预测大模型的隐藏状态特征而非 token  |
| 接受率     | "猜对的比例"   | 大模型验证时接受 draft token 的比例 |
| Draft 模型 | "草稿模型"     | 生成候选 token/特征的轻量级模型     |
| LM Head    | "输出头"       | 将隐藏状态映射为 token 概率的线性层 |

## 延伸阅读

- [Li et al., 2024 -- "EAGLE: Speculative Sampling Requires Rethinking Feature Uncertainty"](https://arxiv.org/abs/2401.15077) -- EAGLE 论文
- [Leviathan et al., 2023 -- "Fast Inference from Transformers via Speculative Decoding"](https://arxiv.org/abs/2211.17192) -- 推测解码原始论文
