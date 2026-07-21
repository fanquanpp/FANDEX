---
title: 条件GAN与Pix2Pix
description: 条件生成对抗网络与图像到图像翻译，从Pix2Pix到CycleGAN
module: 'generative-ai'
difficulty: intermediate
tags:
  - 条件GAN
  - Pix2Pix
  - CycleGAN
  - 图像翻译
  - 'U-Net'
related:
  - 'generative-ai/视觉自回归模型VAR'
  - 'generative-ai/视频生成'
  - 'generative-ai/图像修复扩展与编辑'
  - 'generative-ai/音频生成'
prerequisites:
  - 'generative-ai/3D生成'
---

# 条件 GAN 与 Pix2Pix

> 2014-2017 年的第一个重大突破是控制 GAN 生成什么。附加一个标签、一张图像或一句话。Pix2Pix 做了图像版本，至今在窄域图像到图像任务上仍胜过每个通用文本到图像模型。

**类型:** 构建
**语言:** Python
**前置知识:** Phase 8 · 03 (GAN), Phase 4 · 06 (U-Net), Phase 3 · 07 (CNN)
**时间:** ~75 分钟

## 问题

无条件 GAN 采样任意人脸。对演示有用，在生产中无用。你想要：_将草图映射到照片_、_将地图映射到航拍照片_、_将白天场景映射到夜晚_、_灰度图像着色_。在所有这些中，你给定输入图像 `x`，必须输出具有某种语义对应关系的 `y`。每个 `x` 有多个合理的 `y`。均方误差将它们压成糊状。对抗损失不会，因为"看起来真实"是清晰的。

条件 GAN (Mirza & Osindero, 2014) 将条件 `c` 作为 `G` 和 `D` 的输入添加。Pix2Pix (Isola et al., 2017) 专门化了这一点：条件是完整的输入图像，生成器是 U-Net，判别器是*基于块的*分类器 (PatchGAN)，损失是对抗 + L1。即使在 2026 年，这个配方在窄域图像到图像任务上也优于从头训练的文本到图像模型，因为它在*配对数据*上训练——你恰好拥有所需的信号。

## 核心概念

**条件 G。** `G(x, z) → y`。在 Pix2Pix 中，`z` 是 G 内部的 dropout（无输入噪声——Isola 发现显式噪声被忽略）。

**条件 D。** `D(x, y) → [0, 1]`。输入是*对*（条件，输出）。这是关键区别：D 必须判断 `y` 是否与 `x` 一致，而不仅仅是 `y` 是否看起来真实。

**U-Net 生成器。** 带有跨瓶颈跳跃连接的编码器-解码器。对于输入和输出共享低层结构（边缘、轮廓）的任务至关重要。没有跳跃连接，高频细节会消失。

**PatchGAN 判别器。** D 不输出单个真/假分数，而是输出 `N×N` 网格，每个单元格判断约 70×70 像素的感受野。取平均。这是马尔可夫随机场假设：真实性是局部的。训练更快，参数更少，输出更清晰。

**损失。**

```
loss_G = -log D(x, G(x)) + λ · ||y - G(x)||_1
loss_D = -log D(x, y) - log (1 - D(x, G(x)))
```

L1 项稳定训练并将 G 推向已知目标。L1 比 L2 给出更清晰的边缘（中位数，而非均值）。`λ = 100` 是 Pix2Pix 的默认值。

## CycleGAN -- 当你没有配对数据时

Pix2Pix 需要配对的 `(x, y)` 数据。CycleGAN (Zhu et al., 2017) 以额外损失为代价去掉了这个要求：*循环一致性*损失。两个生成器 `G: X → Y` 和 `F: Y → X`。训练它们使 `F(G(x)) ≈ x` 和 `G(F(y)) ≈ y`。这让你可以在没有配对样本的情况下将马翻译成斑马、夏天翻译成冬天。

2026 年，非配对图像到图像主要通过扩散（ControlNet, IP-Adapter）而非 CycleGAN 完成，但循环一致性思想在几乎每个非配对域适应论文中存活。

## 动手构建

`code/main.py` 在 1-D 数据上实现了一个微型条件 GAN。条件 `c` 是类标签（0 或 1）。任务：为给定类从条件分布中产生样本。

### 步骤 1：将条件附加到 G 和 D 的输入

```python
def G(z, c, params):
    return mlp(concat([z, one_hot(c)]), params)

def D(x, c, params):
    return mlp(concat([x, one_hot(c)]), params)
```

One-hot 编码是最简单的方式。更大的模型使用学习的嵌入、FiLM 调制或交叉注意力。

### 步骤 2：条件训练

```python
for step in range(steps):
    x, c = sample_real_conditional()
    noise = sample_noise()
    update_D(x_real=x, x_fake=G(noise, c), c=c)
    update_G(noise, c)
```

生成器必须匹配*给定条件*下的真实分布，而非边际分布。

### 步骤 3：验证每类输出

```python
for c in [0, 1]:
    samples = [G(noise, c) for noise in batch]
    mean_c = mean(samples)
    assert_near(mean_c, real_mean_for_class_c)
```

## 常见陷阱

- **条件被忽略。** G 学会了边缘化，D 从不惩罚因为条件信号弱。修复：更积极地条件化 D（早期层，不仅仅是后期），使用投影判别器 (Miyato & Koyama 2018)。
- **L1 权重太低。** G 漂移到任意看起来真实的输出，而非忠实的输出。Pix2Pix 风格任务从 λ≈100 开始。
- **L1 权重太高。** G 产生模糊输出，因为 L1 仍然是 L_p 范数。训练稳定后逐渐降低。
- **D 中的真值泄漏。** 将 `(x, y)` 拼接为 D 输入，而不仅仅是 `y`。没有这个 D 无法检查一致性。
- **每类模式坍缩。** 每个类可以独立坍缩。运行类条件多样性检查。

## 实际应用

2026 年图像到图像任务的状态：

| 任务                        | 最佳方法                                             |
| --------------------------- | ---------------------------------------------------- |
| 草图 → 照片，同域，配对数据 | Pix2Pix / Pix2PixHD（仍然快，仍然清晰）              |
| 草图 → 照片，非配对         | 带涂鸦条件模型的 ControlNet                          |
| 语义分割 → 照片             | SPADE / GauGAN2 或 SD + ControlNet-Seg               |
| 风格迁移                    | 带 IP-Adapter 或 LoRA 的扩散；GAN 方法是遗留的       |
| 深度 → 照片                 | Stable Diffusion 上的 ControlNet-Depth               |
| 超分辨率                    | Real-ESRGAN (GAN), ESRGAN-Plus, 或 SD-Upscale (扩散) |
| 着色                        | ColTran, 基于扩散的着色器, 或 Pix2Pix-color          |
| 白天 → 夜晚，季节，天气     | CycleGAN 或基于 ControlNet                           |

当你 (a) 有数千个配对样本，(b) 任务窄且可重复，(c) 需要快速推理时，Pix2Pix 仍然是正确的工具。在通用开放域任务上，扩散获胜。

## 交付物

保存 `outputs/skill-img2img-chooser.md`。技能接收任务描述、数据可用性（配对 vs 非配对，N 个样本）和延迟/质量预算，输出：方法（Pix2Pix, CycleGAN, ControlNet 变体, SDXL + IP-Adapter）、训练数据需求、推理成本和评估协议（LPIPS, FID, 任务特定）。

## 练习

1. **简单。** 修改 `code/main.py` 添加第三个类。确认 G 仍然将每个类的噪声映射到正确的模式。
2. **中等。** 在 1-D 设置中用感知风格损失替换 L1（例如，一个小型冻结 D 作为特征提取器）。它会改变条件分布的清晰度吗？
3. **困难。** 在 1-D 设置中勾勒 CycleGAN：两个分布，两个生成器，循环损失。展示它可以在没有配对数据的情况下学习在它们之间映射。

## 关键术语

| 术语     | 人们怎么说                  | 实际含义                                        |
| -------- | --------------------------- | ----------------------------------------------- |
| 条件 GAN | "带标签的 GAN"              | G(z, c), D(x, c)。两个网络都看到条件。          |
| Pix2Pix  | "图像到图像 GAN"            | 带 U-Net G 和 PatchGAN D + L1 损失的配对 cGAN。 |
| U-Net    | "带跳跃连接的编码器-解码器" | 对称卷积网络；跳跃连接保留高频。                |
| PatchGAN | "局部真实性分类器"          | D 输出每块分数而非全局分数。                    |
| CycleGAN | "非配对图像翻译"            | 两个 G + 循环一致性损失；无需配对数据。         |
| SPADE    | "GauGAN"                    | 用语义图归一化中间激活；分割到图像。            |
| FiLM     | "特征级线性调制"            | 来自条件的每特征仿射变换；廉价条件化。          |

## 生产笔记：Pix2Pix 作为延迟约束基线

当你有配对数据和一个窄任务（草图 → 渲染，语义图 → 照片，白天 → 夜晚）时，Pix2Pix 的一次性推理在延迟上比扩散快一个数量级。生产比较通常是：

| 路径                     | 步骤  | 512² 单 L4 上的典型延迟 |
| ------------------------ | ----- | ----------------------- |
| Pix2Pix (U-Net forward)  | 1     | ~30 ms                  |
| SD-Inpaint 或 SD-Img2Img | 20    | ~1.2 s                  |
| SDXL-Turbo Img2Img       | 1-4   | ~0.15-0.35 s            |
| ControlNet + SDXL base   | 20-30 | ~3-5 s                  |

Pix2Pix 在静态批次的吞吐量上获胜（每个请求是相同的 FLOPs）。扩散在质量和泛化上获胜。现代做法通常是为窄任务部署 Pix2Pix 风格的蒸馏模型，为尾部输入提供扩散回退。

## 延伸阅读

- [Mirza & Osindero (2014). Conditional Generative Adversarial Nets](https://arxiv.org/abs/1411.1784) — cGAN 论文。
- [Isola et al. (2017). Image-to-Image Translation with Conditional Adversarial Networks](https://arxiv.org/abs/1611.07004) — Pix2Pix。
- [Zhu et al. (2017). Unpaired Image-to-Image Translation using Cycle-Consistent Adversarial Networks](https://arxiv.org/abs/1703.10593) — CycleGAN。
- [Wang et al. (2018). High-Resolution Image Synthesis with Conditional GANs](https://arxiv.org/abs/1711.11585) — Pix2PixHD。
- [Park et al. (2019). Semantic Image Synthesis with Spatially-Adaptive Normalization](https://arxiv.org/abs/1903.07291) — SPADE / GauGAN。
- [Miyato & Koyama (2018). cGANs with Projection Discriminator](https://arxiv.org/abs/1802.05637) — 投影 D。
