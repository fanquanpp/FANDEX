---
title: 图像修复、扩展与编辑
description: 扩散模型在图像修复、外绘和编辑任务中的应用，从SDEdit到inpainting管线
module: 'generative-ai'
difficulty: intermediate
tags:
  - 图像修复
  - Inpainting
  - Outpainting
  - SDEdit
  - 图像编辑
related:
  - 'generative-ai/视频生成'
  - 'generative-ai/条件GAN与Pix2Pix'
  - 'generative-ai/音频生成'
  - 'generative-ai/自编码器与VAE'
prerequisites:
  - 'generative-ai/3D生成'
---

# 图像修复、扩展与编辑

> 生成一张全新的图像是扩散模型的入门考试。真正的产品工作几乎总是"取这张现有图像，改变这个特定部分，保持其余不变。"修复、扩展和编辑是扩散模型在生产中最常见的三种模式——也是大多数工程陷阱所在之处。

**类型:** 构建
**语言:** Python
**前置知识:** Phase 8 · 07 (潜扩散), Phase 8 · 08 (ControlNet)
**时间:** ~60 分钟

## 问题

你有一张照片。你想要：(a) 移除一个对象并填充背景（修复），(b) 扩展画布并生成新内容（扩展/外绘），或 (c) 改变特定属性同时保持身份（编辑）。在所有三种情况下，你从一张真实图像开始，而不是纯噪声。扩散模型被设计为从噪声生成。如何桥接？

答案是*部分噪声*。你不需要从 `t=T` 开始（纯噪声），而是从中间时间步 `t = τ` 开始，其中 `τ < T`。`τ` 越大，你改变得越多。`τ` 越小，你保留得越多。这个单一参数——噪声强度——控制编辑保真度与创作自由度之间的权衡。

## 核心概念

**修复 (Inpainting)。** 给定图像 `x`、二值掩码 `m`（1 = 保留，0 = 重绘），和提示。在掩码区域运行扩散，非掩码区域保持不变。实现：在每个采样步骤，用原始图像的噪声版本替换非掩码潜变量。

```
z_t_masked = m · z_t_diffusion + (1 - m) · z_t_original_noised
```

**扩展 (Outpainting)。** 修复的特例，其中掩码覆盖图像边界之外的区域。挑战：边界接缝。修复模型通常在边界附近产生不连续性。修复：在掩码边缘添加渐变过渡带。

**SDEdit (Meng et al., 2021)。** 通用编辑协议：(1) 将输入图像噪声化到步骤 `τ`，(2) 从步骤 `τ` 用新提示采样到步骤 0。`τ` 控制编辑强度。`τ = 0.3` = 轻微风格变化。`τ = 0.7` = 大幅内容变化。`τ = 1.0` = 完全重新生成。

**DDIM 反演。** 对于 SDEdit，你需要将图像噪声化到步骤 `τ`。最简单的方式是使用 DDIM 的确定性前向过程将 `x_0 → x_τ`。这给出"该图像在步骤 τ 会是什么样子"的精确估计。

**基于提示的编辑。** Prompt-to-Prompt (Hertz et al., 2022) 通过在原始和编辑生成之间共享交叉注意力图来编辑图像。将"一只猫坐在垫子上"改为"一只狗坐在垫子上"，交叉注意力图确保只有猫区域改变。

## 动手构建

`code/main.py` 在 1-D 扩散模型上实现了玩具修复和 SDEdit。

### 步骤 1：将图像噪声化到步骤 τ

```python
def noise_to_step(x0, tau, alpha_bars, rng):
    a_bar = alpha_bars[tau]
    eps = rng.gauss(0, 1)
    return math.sqrt(a_bar) * x0 + math.sqrt(1 - a_bar) * eps, eps
```

### 步骤 2：修复采样循环

```python
def inpaint_sample(model, x_original, mask, tau, alpha_bars, T, rng):
    # Noise the original image to step tau
    x_tau, _ = noise_to_step(x_original, tau, alpha_bars, rng)
    x = x_tau
    for t in range(tau, -1, -1):
        # Diffusion step
        eps_hat = model_forward(model, x, t)
        x = denoise_step(x, eps_hat, t, alpha_bars, rng)
        # Replace masked-in regions with original (noised to same level)
        x_orig_t, _ = noise_to_step(x_original, t, alpha_bars, rng)
        x = mask * x_orig_t + (1 - mask) * x
    return x
```

### 步骤 3：SDEdit

```python
def sdedit(model, x_original, tau, alpha_bars, rng):
    x_tau, _ = noise_to_step(x_original, tau, alpha_bars, rng)
    x = x_tau
    for t in range(tau, -1, -1):
        eps_hat = model_forward(model, x, t)
        x = denoise_step(x, eps_hat, t, alpha_bars, rng)
    return x
```

与修复相同但没有掩码——整个图像以强度 `τ` 重新生成。

## 常见陷阱

- **接缝伪影。** 掩码边界处的硬过渡产生可见接缝。修复：使用渐变掩码（高斯模糊二值掩码，σ ≈ 10 像素）。
- **颜色不匹配。** 修复区域与非修复区域的亮度/对比度不同。修复：在去噪后应用直方图匹配或颜色校正。
- **τ 太高。** SDEdit 中 `τ > 0.7` 通常丢失原始图像的身份。从 `τ = 0.3` 开始，逐步增加。
- **τ 太低。** `τ < 0.2` 产生几乎不可见的编辑。当编辑不够时增加 `τ`。
- **掩码太紧。** 紧贴对象的掩码留下边缘伪影。扩展掩码 10-20 像素以获得更好的混合。
- **上下文丢失。** 修复模型需要看到周围上下文。如果掩码太大（>50% 的图像），质量下降。对于大区域，分块修复。
- **VAE 接缝。** 在潜空间中修复时，VAE 解码器可能在掩码边界引入伪影，因为 VAE 不是为部分输入设计的。

## 实际应用

| 任务     | 推荐方法                            |
| -------- | ----------------------------------- |
| 对象移除 | SDXL Inpainting + 渐变掩码          |
| 对象替换 | SDXL Inpainting + 提示 + ControlNet |
| 背景替换 | Inpainting + 深度 ControlNet        |
| 画布扩展 | Outpainting + 渐变边界              |
| 风格迁移 | SDEdit (τ ≈ 0.3-0.5)                |
| 属性编辑 | SDEdit 或 Prompt-to-Prompt          |
| 精细编辑 | ControlNet + Inpainting             |
| 全图重绘 | SDEdit (τ ≈ 0.5-0.8)                |

## 交付物

保存 `outputs/skill-image-editor.md`。技能接收编辑任务描述 + 输入图像，输出：方法（inpainting / SDEdit / ControlNet）、掩码策略、τ 值、提示工程和后处理步骤。

## 练习

1. **简单。** 运行 `code/main.py`，测试 τ = 0.2, 0.5, 0.8 的 SDEdit。描述每个 τ 级别保留了多少原始结构。
2. **中等。** 实现渐变掩码：用 σ=5 的高斯模糊模糊二值掩码。比较硬掩码与渐变掩码的修复质量。
3. **困难。** 用 diffusers 设置 SDXL inpainting 管线。创建一个掩码，移除图像中的对象，用新对象替换。报告 CLIP 分数和边界伪影评估。

## 关键术语

| 术语             | 人们怎么说   | 实际含义                                  |
| ---------------- | ------------ | ----------------------------------------- |
| Inpainting       | "图像修复"   | 在掩码区域重新生成内容，保留其余部分。    |
| Outpainting      | "图像扩展"   | 在图像边界之外生成新内容。                |
| SDEdit           | "噪声再生成" | 将图像噪声化到步骤 τ，然后从 τ 重新采样。 |
| τ (噪声强度)     | "编辑强度"   | 控制保留多少原始内容 vs 生成多少新内容。  |
| DDIM 反演        | "前向噪声化" | 确定性地将图像噪声化到特定步骤。          |
| 渐变掩码         | "模糊掩码"   | 掩码边缘的平滑过渡，避免硬接缝。          |
| Prompt-to-Prompt | "注意力编辑" | 通过共享交叉注意力图编辑特定区域。        |

## 生产笔记：修复管线的延迟预算

生产修复管线有三个阶段：(1) 编码输入图像（VAE 编码器），(2) 扩散采样（N 步），(3) 解码输出图像（VAE 解码器）。在 512² 分辨率下使用 SDXL：

| 阶段             | 典型延迟 (L4 GPU) |
| ---------------- | ----------------- |
| VAE 编码         | ~30 ms            |
| 扩散采样 (30 步) | ~2.5 s            |
| VAE 解码         | ~50 ms            |
| 总计             | ~2.6 s            |

对于实时应用（视频修复、交互式编辑），瓶颈始终是扩散采样。选项：

- **更少步数。** 4-8 步使用蒸馏模型（SDXL-Turbo, LCM）。
- **分块处理。** 对于高分辨率，只对掩码区域运行扩散，跳过未遮罩区域。
- **缓存。** 如果用户编辑同一图像的不同区域，VAE 编码只需做一次。

## 延伸阅读

- [Meng et al. (2021). SDEdit: Guided Image Synthesis and Editing with Stochastic Differential Equations](https://arxiv.org/abs/2108.01073) — SDEdit。
- [Hertz et al. (2022). Prompt-to-Prompt Image Editing with Cross Attention Control](https://arxiv.org/abs/2208.01626) — Prompt-to-Prompt。
- [Avrahami, Lutz, Ommer (2022). Blended Diffusion for Text-driven Editing of Natural Images](https://arxiv.org/abs/2206.01379) — 混合扩散。
- [Rombach et al. (2022). High-Resolution Image Synthesis with Latent Diffusion Models](https://arxiv.org/abs/2112.10752) — Stable Diffusion 修复。
- [Xie et al. (2023). SmartBrush: Text and Shape Guided Object Inpainting](https://arxiv.org/abs/2212.05034) — 形状引导修复。
