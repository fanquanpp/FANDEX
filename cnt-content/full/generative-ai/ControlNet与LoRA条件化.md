---
title: ControlNet与LoRA条件化
description: ControlNet的零卷积结构与LoRA的低秩适应，精细控制预训练扩散模型
module: 'generative-ai'
difficulty: advanced
tags:
  - ControlNet
  - LoRA
  - 条件化
  - 微调
  - 零卷积
related:
  - 'generative-ai/音频生成'
  - 'generative-ai/自编码器与VAE'
  - 'generative-ai/GAN生成器与判别器'
  - 'generative-ai/StyleGAN'
prerequisites:
  - 'generative-ai/3D生成'
---

# ControlNet 与 LoRA 条件化

> 你有一个预训练的扩散模型。你需要它做新事情——遵循深度图、从参考图像复制风格、或学习一个新对象——而不破坏它已经知道的东西。ControlNet 从外部添加控制。LoRA 从内部编辑权重。两者都是 2026 年扩散工具箱中部署最多的组件。

**类型:** 构建
**语言:** Python
**前置知识:** Phase 8 · 07 (潜扩散), Phase 3 · 02 (反向传播)
**时间:** ~75 分钟

## 问题

Stable Diffusion 1.5 知道如何从文本生成图像。但你想要：

- **空间控制。** "这个人站在这里，手在那里。"文本提示无法精确指定姿态、深度或边缘。
- **风格适应。** "像我的草图一样画，不是照片级真实感。"你需要模型学习一个新风格，而不是从头训练。
- **身份保持。** "用这个人的脸。"LoRA 可以用 5-20 张图像将身份烘焙到模型中。

从头训练一个 860M 参数模型需要 6000 GPU 小时。ControlNet 和 LoRA 都以不到 1% 的训练成本解决这个问题——它们冻结预训练权重并学习小的附加参数。

## ControlNet

Zhang et al. (2023) 的想法：复制 U-Net 编码器（下采样半部分）。将控制信号（深度图、姿态图、涂鸦）输入到副本中。用*零卷积*（1×1 卷积，权重和偏置初始化为零）将副本的每个块连接到原始 U-Net 的对应块。

为什么零初始化？在训练开始时，ControlNet 的贡献恰好为零——原始 U-Net 不受影响。梯度从原始 U-Net 的损失流过零卷积，逐渐打开它们。这避免了灾难性遗忘并使训练稳定。

**推理。** ControlNet 副本与原始 U-Net 并行运行。每个块将 ControlNet 特征添加到 U-Net 的跳跃连接。开销：每个采样步骤约 +30% FLOPs。质量：对空间控制有巨大差异。

**控制类型。** Canny 边缘、深度图、法线图、姿态 (OpenPose)、分割图、涂鸦、Hed 边缘、MLSD 线条——每种都是 ControlNet 的一个独立训练副本。所有都使用相同的架构，不同的条件输入。

## LoRA

Hu et al. (2021) 的想法：不微调完整的权重矩阵 `W ∈ R^{d_out × d_in}`，而是分解 `ΔW = A · B`，其中 `A ∈ R^{d_out × r}`，`B ∈ R^{r × d_in}`，`r << min(d_out, d_in)`。只训练 `A` 和 `B`。推理时，`W' = W + α · A · B`。

对于扩散模型，LoRA 通常应用于 U-Net（或 DiT）的交叉注意力层。典型 `r = 4-64`，`α = r`（归一化）。一个 LoRA 添加约 1-50M 参数，而 U-Net 有 860M。训练时间：5-20 张图像约 5-30 分钟。

**关键属性：** LoRA 是可组合的。你可以在推理时加载多个 LoRA 并线性组合它们的输出：`W' = W + α₁·A₁·B₁ + α₂·A₂·B₂`。这使得"风格 LoRA + 身份 LoRA + 背景 LoRA"成为可能。

## 动手构建

`code/main.py` 在 1-D 扩散模型上实现了玩具 ControlNet 和 LoRA，以展示每种方法的机制。

### 步骤 1：ControlNet 零卷积

```python
def zero_conv(x, W, b):
    # W and b initialized to zero
    return matmul(W, x) + b
```

在训练开始时，`zero_conv` 输出零。原始网络不受影响。梯度流过，逐渐学习非零权重。

### 步骤 2：带 ControlNet 的前向传播

```python
def forward_with_control(x_t, t, control_signal, base_model, cn_model):
    # Base U-Net forward
    h = base_encoder(x_t, t)
    # ControlNet parallel branch
    h_ctrl = cn_encoder(control_signal, t)
    # Add via zero convolutions
    h = add(h, zero_conv(h_ctrl, ...))
    # Continue with base decoder
    return base_decoder(h, t)
```

### 步骤 3：LoRA 前向传播

```python
def lora_forward(x, W, A, B, alpha):
    # Original path
    h_orig = matmul(W, x)
    # LoRA path
    h_lora = matmul(B, x)   # d_in -> r
    h_lora = matmul(A, h_lora)  # r -> d_out
    return h_orig + (alpha / r) * h_lora
```

### 步骤 4：组合多个 LoRA

```python
def multi_lora_forward(x, W, loras, alpha):
    h = matmul(W, x)
    for A, B, a in loras:
        h += (a / A.shape[1]) * matmul(A, matmul(B, x))
    return h
```

## 常见陷阱

- **ControlNet 条件缩放。** ControlNet 输出在添加到 U-Net 之前乘以 `controlnet_conditioning_scale`（默认 1.0）。太高 = 图像过度拟合控制信号，看起来不自然。太低 = 控制被忽略。通常 0.5-1.5 是安全范围。
- **LoRA 过拟合。** `r` 太大或训练步数太多 = LoRA 记住训练图像，泛化差。从 `r=4` 开始，200-500 步。
- **LoRA 学习率。** 标准是 `1e-4` 到 `2e-4`。更高 = 更快收敛但更多伪影。更低 = 更安全但需要更多步数。
- **混合不兼容的 LoRA。** 不同基础模型的 LoRA（SD 1.5 vs SDXL vs Flux）不能混合——它们编辑不同的权重。
- **ControlNet + CFG 交互。** 高 CFG 尺度 + 高 ControlNet 尺度 = 过饱和图像。先调低 CFG，再调高 ControlNet。
- **多 ControlNet 冲突。** 同时使用深度 + 姿态 ControlNet 时，它们可能冲突。使用 `controlnet_conditioning_scale` 平衡它们。

## 实际应用

| 场景         | 方法                              |
| ------------ | --------------------------------- |
| 精确姿态控制 | OpenPose ControlNet               |
| 深度图到图像 | Depth ControlNet                  |
| 线稿上色     | Canny/HED ControlNet              |
| 风格迁移     | 风格 LoRA (r=16-32)               |
| 角色一致性   | 身份 LoRA (r=32-64, 10-20 张图像) |
| 产品设计     | 边缘 ControlNet + 风格 LoRA       |
| 建筑可视化   | 法线 ControlNet + 材质 LoRA       |
| 多概念组合   | 多个 LoRA + ControlNet            |

## 交付物

保存 `outputs/skill-control-lora.md`。技能接收任务描述 + 可用训练数据，输出：方法选择（ControlNet vs LoRA vs 两者）、ControlNet 类型、LoRA 秩和训练参数、以及推理组合策略。

## 练习

1. **简单。** 运行 `code/main.py`，观察零卷积权重从零增长。记录 100、500、1000 步后零卷积输出的范数。
2. **中等。** 在玩具模型上训练一个 `r=4` 和 `r=16` 的 LoRA。比较重建质量和泛化（在未见过的输入上测试）。
3. **困难。** 用 diffusers 加载 SDXL + Depth ControlNet。生成同一提示在有和没有深度控制下的图像。测量 CLIP 分数差异。

## 关键术语

| 术语            | 人们怎么说       | 实际含义                                           |
| --------------- | ---------------- | -------------------------------------------------- |
| ControlNet      | "那个加控制的"   | U-Net 编码器的副本，通过零卷积连接，输入控制信号。 |
| 零卷积          | "零初始化的 1×1" | 权重和偏置从零开始；逐渐学习贡献。                 |
| LoRA            | "低秩适应"       | `ΔW = A·B`，只训练小矩阵 A 和 B。                  |
| 秩 r            | "LoRA 大小"      | A 和 B 的内维度；更高 = 更强但更可能过拟合。       |
| α               | "缩放因子"       | LoRA 贡献乘以 `α/r`；控制强度。                    |
| 可组合 LoRA     | "LoRA 混合"      | 多个 LoRA 线性组合：`W + Σ αᵢ·Aᵢ·Bᵢ`。             |
| ControlNet 缩放 | "条件强度"       | ControlNet 输出乘以这个因子；0 = 忽略，1 = 默认。  |

## 生产笔记：ControlNet 和 LoRA 的推理成本

ControlNet 在每个采样步骤增加约 30% 的 FLOPs（它运行一个并行的编码器副本）。LoRA 在推理时增加可忽略的 FLOPs（只是矩阵加法），但增加少量内存用于存储 A 和 B 矩阵。

对于生产部署：

- **ControlNet 是运行时成本。** 每个步骤 +30% 意味着 50 步管线变成 50 × 1.3 = 65 等效步。如果延迟是硬约束，考虑蒸馏模型 + ControlNet vs 完整模型 + ControlNet。
- **LoRA 是存储成本。** 每个 LoRA 约 5-50 MB。100 个 LoRA = 0.5-5 GB 额外存储。推理时，热切换 LoRA 需要重新加载 A/B 矩阵（毫秒级），不需要重新加载基础模型。
- **多 LoRA 推理。** 加载 N 个 LoRA 意味着 N 次矩阵乘法 + 求和。对于 `r=16` 和 N=3，额外计算可忽略。对于 `r=64` 和 N=10，开始变得显著。

## 延伸阅读

- [Zhang, Rao, Agrawala (2023). Adding Conditional Control to Text-to-Image Diffusion Models](https://arxiv.org/abs/2302.05543) — ControlNet。
- [Hu et al. (2021). LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685) — LoRA。
- [Ryu (2023). Low-Rank Adaptation for Fast Text-to-Image Diffusion Fine-Tuning](https://github.com/cloneofsimo/lora) — Simo Ryu 的扩散 LoRA 实现。
- [Shah et al. (2023). IP-Adapter: Text Compatible Image Prompt Adapter for Diffusion Models](https://arxiv.org/abs/2308.06721) — IP-Adapter，图像条件化的替代方案。
- [Mou et al. (2024). T2I-Adapter: Learning Adapters to Dig out More Controllable Ability for Diffusion Models](https://arxiv.org/abs/2302.05543) — T2I-Adapter，ControlNet 的轻量替代。
- [Kohya-SS sd-scripts](https://github.com/kohya-ss/sd-scripts) — LoRA 训练的事实标准工具。
