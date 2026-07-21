---
title: '视觉自回归模型 -- VAR'
description: 从光栅扫描到多尺度生成，视觉自回归模型VAR的原理与架构
module: 'generative-ai'
difficulty: advanced
tags:
  - 自回归
  - VAR
  - 多尺度生成
  - 图像tokenizer
  - 视觉生成
related:
  - 'generative-ai/生成模型分类与历史'
  - 'generative-ai/生成模型评估FID与CLIP分数'
  - 'generative-ai/视频生成'
  - 'generative-ai/条件GAN与Pix2Pix'
prerequisites:
  - 'generative-ai/3D生成'
---

# 视觉自回归模型 -- VAR

> GPT 从左到右生成文本。为什么不从左上到右下生成图像？因为像素级自回归太慢（786k 步），且空间局部性差。Tian et al. (2024) 的 VAR 改变了范式：不是逐像素，而是逐尺度。先生成低分辨率 token，再生成高分辨率 token。每个尺度是一个自回归步骤。1024² 图像只需要约 10 个尺度。

**类型:** 学习
**语言:** Python
**前置知识:** Phase 8 · 01 (分类), Phase 7 · 09 (Transformer), Phase 8 · 02 (VAE)
**时间:** ~45 分钟

## 问题

自回归图像生成有两个历史问题：

1. **序列太长。** 512² 图像有 262k 像素。逐像素自回归需要 262k 步。即使每步 1ms，也需要 262 秒。不可行。
2. **光栅扫描顺序不自然。** 从左上到右下扫描像素忽略了图像的空间结构——相邻像素有强相关性，但光栅扫描在行边界处打破这种相关性。

VAR (Visual AutoRegressive modeling) 解决了两个问题：(1) 用多尺度 tokenizer 将图像压缩为约 10 个尺度的 token，每个尺度有少量 token；(2) 每个尺度以所有先前尺度为条件自回归生成，捕获从粗到细的依赖关系。

## 核心概念

**多尺度 VQ tokenizer。** 标准图像 VQ-VAE 将图像编码为单一尺度的 2D token 网格。VAR 的 tokenizer 编码为多尺度表示：尺度 1 是 1×1 token（全局结构），尺度 2 是 2×2 token，尺度 3 是 4×4，...，尺度 K 是 `2^(K-1) × 2^(K-1)` token。

每个尺度的 token 来自残差量化：尺度 k 的 token 捕获尺度 k-1 未捕获的细节。

**自回归生成。** 不是从左到右，而是从粗到细：

```
尺度 1: 生成 1×1 token (全局颜色/结构)
尺度 2: 以尺度 1 为条件，生成 2×2 token
尺度 3: 以尺度 1-2 为条件，生成 4×4 token
...
尺度 K: 以尺度 1-(K-1) 为条件，生成 2^(K-1) × 2^(K-1) token
```

每个尺度内的 token 可以并行生成（它们共享相同的条件），所以总步数 = K ≈ 10，不是 262k。

**Transformer 架构。** 每个尺度的 token 通过共享 Transformer 处理。条件化通过将先前尺度的 token 作为前缀注入。注意力掩码确保每个尺度只看到之前的尺度。

**与 GPT 风格 AR 的区别。** GPT 是 1D 顺序（左到右）。VAR 是 2D 多尺度（粗到细）。GPT 每步生成 1 个 token。VAR 每步生成一个尺度的所有 token（并行）。

## VAR vs 扩散

| 方面     | VAR              | 扩散              |
| -------- | ---------------- | ----------------- |
| 生成方式 | 自回归 (粗到细)  | 去噪 (噪声到数据) |
| 步数     | ~10 (尺度数)     | 4-50 (采样步数)   |
| 每步计算 | 随尺度增大       | 恒定              |
| 条件化   | 之前尺度         | 噪声级别          |
| 全局结构 | 先生成           | 最后出现          |
| 训练目标 | 交叉熵 (分类)    | MSE (回归)        |
| 可扩展性 | Transformer 缩放 | U-Net 或 DiT 缩放 |

VAR 在 ImageNet 256² 上达到了与扩散相当的质量（FID ≈ 1.7），但推理更快（约 10 步 vs 约 20 步 DDIM），且全局结构更一致（因为先生成）。

## 动手构建

`code/main.py` 在 1-D 数据上实现了玩具多尺度自回归生成。

### 步骤 1：多尺度编码

```python
def multiscale_encode(data, n_scales):
    scales = []
    current = data
    for k in range(n_scales):
        # Downsample by factor 2
        coarse = current[::2]
        # Residual = detail not captured by coarse
        residual = [current[i] - coarse[i // 2] for i in range(len(current))]
        scales.append(residual)
        current = coarse
    scales.append(current)  # final coarsest level
    return scales[::-1]  # coarsest first
```

### 步骤 2：自回归生成

```python
def generate(model, n_scales, rng):
    # Scale 1: generate coarsest token
    tokens = [model.generate_coarse(rng)]
    for k in range(1, n_scales):
        # Condition on all previous scales
        condition = combine_scales(tokens)
        # Generate next scale (parallel within scale)
        next_tokens = model.generate_scale(k, condition, rng)
        tokens.append(next_tokens)
    return decode_scales(tokens)
```

### 步骤 3：解码

```python
def multiscale_decode(scales):
    current = scales[0]  # coarsest
    for k in range(1, len(scales)):
        # Upsample current and add residual
        upsampled = []
        for v in current:
            upsampled.extend([v, v])  # simple repeat upsampling
        residual = scales[k]
        current = [u + r for u, r in zip(upsampled, residual)]
    return current
```

## 常见陷阱

- **尺度间不一致。** 如果尺度 k 的 token 不与尺度 k-1 对齐，解码时出现伪影。修复：严格的条件化，确保每个尺度看到所有先前尺度。
- **残差累积误差。** 每个尺度的残差误差在解码时累积。修复：端到端训练 tokenizer + 生成器。
- **并行生成质量。** 尺度内并行生成假设 token 独立（给定条件）。如果条件不足，质量下降。修复：尺度内使用双向注意力。
- **Tokenizer 质量。** 多尺度 tokenizer 的重建质量直接影响生成质量。如果 tokenizer 丢失信息，生成器无法恢复。
- **类别条件化。** VAR 在类别条件 ImageNet 上表现好，但文本条件化更困难（更复杂的条件信号）。

## 实际应用

| 场景             | VAR 适用性                            |
| ---------------- | ------------------------------------- |
| 类别条件图像生成 | 非常适合（ImageNet 基准）             |
| 文本到图像       | 有潜力但尚未成熟（2026 年扩散仍主导） |
| 图像编辑         | 困难（自回归不易修改中间步骤）        |
| 视频生成         | 未探索（时空多尺度 AR 是开放问题）    |
| 快速推理         | 优势（约 10 步 vs 扩散 20+ 步）       |

## 交付物

保存 `outputs/skill-var-generator.md`。技能接收图像生成需求，输出：是否使用 VAR vs 扩散、尺度数、tokenizer 配置和推理步骤。

## 练习

1. **简单。** 运行 `code/main.py`，观察多尺度生成的从粗到细过程。比较 3 个尺度 vs 6 个尺度的质量。
2. **中等。** 实现尺度内双向注意力：每个尺度的 token 可以互相看到（但只能看到之前尺度的 token）。比较与独立生成的质量。
3. **困难。** 将玩具 tokenizer 替换为真正的多尺度 VQ-VAE（在 MNIST 上训练）。比较 VQ tokenizer vs 残差 tokenizer 的重建质量。

## 关键术语

| 术语             | 人们怎么说     | 实际含义                         |
| ---------------- | -------------- | -------------------------------- |
| VAR              | "视觉自回归"   | 多尺度自回归图像生成。           |
| 多尺度 tokenizer | "金字塔 VQ"    | 将图像编码为多个分辨率的 token。 |
| 粗到细           | "从全局到局部" | 先生成低分辨率，再生成高分辨率。 |
| 残差量化         | "残差 VQ"      | 每个尺度捕获前一个尺度的残差。   |
| 尺度内并行       | "并行 token"   | 同一尺度内的 token 并行生成。    |
| 尺度间自回归     | "顺序尺度"     | 每个尺度以所有先前尺度为条件。   |

## 生产笔记：VAR 的推理优势

VAR 的推理成本模型与扩散不同：

- **扩散：** `总成本 = 步数 × 每步成本`，每步成本恒定。
- **VAR：** `总成本 = Σ(尺度 k 的 token 数 × 每个成本)`，token 数随尺度指数增长。

对于 512² 图像，10 个尺度：

- 尺度 1：1 token
- 尺度 2：4 token
- 尺度 3：16 token
- ...
- 尺度 10：262k token

约 87% 的计算在最后两个尺度。这意味着 VAR 的总 FLOPs 与扩散相似，但延迟可能更低，因为早期尺度（全局结构）几乎免费。

生产部署时，可以"早停"——如果全局结构不满意，在早期尺度就重新生成，不需要等到最后。

## 延伸阅读

- [Tian et al. (2024). Visual Autoregressive Modeling: Scalable Image Generation via Next-Scale Prediction](https://arxiv.org/abs/2404.02905) — VAR。
- [van den Oord et al. (2016). PixelRNN](https://arxiv.org/abs/1601.06759) — 像素级 AR。
- [van den Oord et al. (2017). Neural Discrete Representation Learning](https://arxiv.org/abs/1711.00937) — VQ-VAE。
- [Lee et al. (2022). Autoregressive Image Generation using Residual Quantization](https://arxiv.org/abs/2203.01932) — RQ-VAE + AR。
- [Chang et al. (2022). MaskGIT: Masked Generative Image Transformer](https://arxiv.org/abs/2202.04200) — 掩码 AR 替代方案。
