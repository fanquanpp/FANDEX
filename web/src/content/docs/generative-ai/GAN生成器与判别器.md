---
title: 'GAN -- 生成器与判别器'
description: 对抗训练的核心机制，从Goodfellow的minimax博弈到StyleGAN的演进
module: 'generative-ai'
difficulty: intermediate
tags:
  - GAN
  - 对抗训练
  - 生成器
  - 判别器
  - 模式坍缩
related:
  - 'generative-ai/自编码器与VAE'
  - 'generative-ai/ControlNet与LoRA条件化'
  - 'generative-ai/StyleGAN'
prerequisites:
  - 'generative-ai/3D生成'
---

# GAN -- 生成器与判别器

> Goodfellow 2014 年的技巧是完全跳过密度。两个网络。一个制造假样本。一个识别它们。它们对抗直到假样本与真样本无法区分。这不应该有效。它经常不有效。当它有效时，样本在窄域上仍然是文献中最清晰的。

**类型:** 构建
**语言:** Python
**前置知识:** Phase 3 · 02 (反向传播), Phase 3 · 08 (优化器), Phase 8 · 02 (VAE)
**时间:** ~75 分钟

## 问题

VAE 产生模糊的样本，因为它们的 MSE 解码器损失对*均值*图像是贝叶斯最优的——而许多合理数字的均值是一个模糊的数字。你想要一个奖励*合理性*的损失，而不是与任何目标的像素级接近度。合理性没有闭式表达。你必须学习它。

Goodfellow 的想法：训练一个分类器 `D(x)` 区分真实图像和假图像。训练一个生成器 `G(z)` 来欺骗 `D`。`G` 的损失信号是 `D` 当前认为什么看起来像真实的东西。随着 `G` 改进，这个信号不断更新，追逐一个移动目标。如果两个网络都收敛，`G` 就学会了数据分布，而无需写下 `log p(x)`。

这就是对抗训练。数学上是一个 minimax 博弈：

```
min_G max_D  E_real[log D(x)] + E_fake[log(1 - D(G(z)))]
```

2026 年 GAN 不再是最先进的生成器（扩散和流匹配夺走了这个桂冠）。但 StyleGAN 2/3 仍然是有史以来最清晰的人脸模型，GAN 判别器被用作扩散训练中的*感知损失*，对抗训练驱动快速 1 步蒸馏（SDXL-Turbo, SD3-Turbo, LCM），让你能够部署实时扩散。

## 核心概念

**生成器 `G(z)`。** 将噪声向量 `z ~ N(0, I)` 映射到样本 `x̂`。解码器形状的网络（密集层或转置卷积）。

**判别器 `D(x)`。** 将样本映射到标量概率（或分数）。真实 → 1，假 → 0。

**损失。** 两个交替更新：

- **训练 `D`：** `loss_D = -[ log D(x) + log(1 - D(G(z))) ]`。真实=1、假=0 的二元交叉熵。
- **训练 `G`：** `loss_G = -log D(G(z))`。这是 Goodfellow 使用的*非饱和*形式（原始 `log(1 - D(G(z)))` 在 `D` 有信心时饱和并杀死梯度）。

**训练循环。** 一步 `D`，一步 `G`。重复。

**为什么有效。** 如果 `G` 完美匹配 `p_data`，那么 `D` 无法做得比随机更好，到处输出 0.5；`G` 不再获得梯度。均衡。

**为什么失败。** 模式坍缩（`G` 找到一个 `D` 无法分类的模式并永远生产它），梯度消失（`D` 学得太快，`log D` 饱和），训练不稳定（学习率、批大小，任何东西）。

## 使 GAN 有效的变体

| 年份 | 创新                 | 修复                                                      |
| ---- | -------------------- | --------------------------------------------------------- |
| 2015 | DCGAN                | Conv/deconv, batch norm, LeakyReLU — 第一个稳定架构。     |
| 2017 | WGAN, WGAN-GP        | 用 Wasserstein 距离 + 梯度惩罚替换 BCE。修复梯度消失。    |
| 2017 | 谱归一化             | Lipschitz 约束判别器。2026 年判别器仍在使用。             |
| 2018 | Progressive GAN      | 先训练低分辨率，再添加层。首个百万像素结果。              |
| 2019 | StyleGAN / StyleGAN2 | 映射网络 + 自适应实例归一化。固定域照片级真实感的最先进。 |
| 2021 | StyleGAN3            | 无混叠，平移等变 — 2026 年仍是人脸金标准。                |
| 2022 | StyleGAN-XL          | 条件化，类别感知，更大规模。                              |
| 2024 | R3GAN                | 用更强正则化重新品牌化；无需技巧即可在 1024² 上工作。     |

## 动手构建

`code/main.py` 在 1-D 数据上训练一个微型 GAN：两个高斯的混合。生成器和判别器是单隐藏层 MLP。我们手写实现前向、反向和 minimax 循环。目标是看到两种关键失效模式（模式坍缩 + 梯度消失）实时发生。

### 步骤 1：非饱和损失

原始 Goodfellow 损失 `log(1 - D(G(z)))` 在 D 以高置信度将 G 的假样本分类为假时趋近 0。此时 G 的梯度基本为零——G 无法改进。非饱和形式 `-log D(G(z))` 有相反的渐近行为：当 D 有信心时它爆炸，给 G 一个强信号。

```python
def g_loss(d_fake):
    # maximize log D(G(z))  <=>  minimize -log D(G(z))
    return -sum(math.log(max(p, 1e-8)) for p in d_fake) / len(d_fake)
```

### 步骤 2：每个生成器步骤一个判别器步骤

```python
for step in range(steps):
    # train D
    real_batch = sample_real(batch_size)
    fake_batch = [G(z) for z in sample_noise(batch_size)]
    update_D(real_batch, fake_batch)

    # train G
    fake_batch = [G(z) for z in sample_noise(batch_size)]  # fresh fakes
    update_G(fake_batch)
```

G 使用新的假样本，否则梯度是过时的。

### 步骤 3：监控模式坍缩

```python
if step % 200 == 0:
    samples = [G(z) for z in sample_noise(500)]
    mode_a = sum(1 for s in samples if s < 0)
    mode_b = 500 - mode_a
    if min(mode_a, mode_b) < 50:
        print("  [!] mode collapse: one mode is starved")
```

典型症状：两个真实模式之一不再被生成。判别器停止纠正它，因为它从未被看到作为假样本。

## 常见陷阱

- **判别器太强。** 将 D 的学习率降低 2-5 倍，或添加实例/层噪声。如果 D 达到 >95% 准确率，G 就死了。
- **生成器记忆了一个模式。** 在 D 输入中添加噪声，使用小批量判别器层，或切换到 WGAN-GP。
- **Batch norm 泄露统计量。** 真实批次 + 假批次流过同一个 BN 层会混合它们的统计量。使用实例归一化或谱归一化代替。
- **Inception 分数博弈。** FID 和 IS 在低样本数时噪声大。评估时使用 ≥10k 样本。
- **一次性采样对条件任务是个谎言。** 你仍然需要 CFG 尺度、截断技巧和重采样才能获得可用输出。

## 实际应用

2026 年的 GAN 技术栈：

| 场景                       | 选择                                                           |
| -------------------------- | -------------------------------------------------------------- |
| 照片级真实感人脸，固定姿态 | StyleGAN3（最清晰，最小）                                      |
| 动漫 / 风格化人脸          | StyleGAN-XL 或 Stable Diffusion LoRA                           |
| 图像到图像翻译             | Pix2Pix / CycleGAN (Phase 8 · 04) 或 ControlNet (Phase 8 · 08) |
| 快速 1 步文本到图像        | 扩散的对抗蒸馏 (SDXL-Turbo, SD3-Turbo)                         |
| 扩散训练器内部的感知损失   | 图像裁剪上的小型 GAN 判别器                                    |
| 任何多模态、开放式的任务   | 不要 — 使用扩散或流匹配                                        |

GAN 清晰但狭窄。一旦你的领域开放——照片、任意文本提示、视频——切换到扩散。对抗技巧作为组件（感知损失、蒸馏）存活，而不是独立生成器。

## 交付物

保存 `outputs/skill-gan-debugger.md`。技能接收一个失败的 GAN 运行（损失曲线、样本网格、数据集大小），输出可能原因的排序列表、一行修复和重跑协议。

## 练习

1. **简单。** 使用默认设置运行 `code/main.py`。然后设置 `D_LR = 5 * G_LR` 重新运行。G 的损失多快坍缩为常数？
2. **中等。** 用 WGAN 损失替换 Goodfellow BCE 损失：`loss_D = E[D(fake)] - E[D(real)]`，`loss_G = -E[D(fake)]`，并将 D 的权重裁剪到 `[-0.01, 0.01]`。训练更稳定吗？比较挂钟收敛时间。
3. **困难。** 将 1-D 示例扩展到 2-D 数据（环上 8 个高斯混合）。跟踪生成器在步骤 1k、5k、10k 时捕获了 8 个模式中的多少个。实现小批量判别并重新测量。

## 关键术语

| 术语       | 人们怎么说         | 实际含义                                               |
| ---------- | ------------------ | ------------------------------------------------------ |
| 生成器     | "G"                | 噪声到样本网络，`G: z → x̂`。                           |
| 判别器     | "D"                | 分类器 `D: x → [0, 1]`，真 vs 假。                     |
| Minimax    | "博弈"             | 联合目标的 `min_G max_D`。                             |
| 非饱和损失 | "修复"             | 对 G 使用 `-log D(G(z))` 而非 `log(1 - D(G(z)))`。     |
| 模式坍缩   | "G 记住了一个东西" | 尽管数据多样，生成器产生少数不同输出。                 |
| WGAN       | "Wasserstein"      | 用 Earth-Mover 距离 + 梯度惩罚替换 BCE；更平滑的梯度。 |
| 谱归一化   | "Lipschitz 技巧"   | 约束 D 的权重范数以限制其斜率；稳定训练。              |
| StyleGAN   | "那个有效的"       | 映射网络 + AdaIN；人脸领域的最佳，2026 年仍然如此。    |

## 生产笔记：一次性推理是 GAN 的持久优势

GAN 不再在开放域生成的样本质量上获胜，但仍在推理成本上获胜。用生产推理文献的术语来说，GAN 具有：

- **无 prefill，无 decode 阶段。** 单个 `G(z)` 前向传播。TTFT ≈ 总延迟。
- **无 KV-cache 压力。** 唯一的状态是权重。批大小受激活内存限制，不受缓存限制。
- **简单的连续批处理。** 由于每个请求消耗相同的固定 FLOPs，服务器目标占用率下的静态批次通常是最优的。无需进行中调度器。

这就是为什么 GAN 蒸馏（SDXL-Turbo, SD3-Turbo, ADD, LCM）是 2026 年快速文本到图像的主导技术：它将 20-50 步扩散管线坍缩为 1-4 次 GAN 风格的前向传播，同时保持扩散基的分布。对抗损失作为训练时旋钮存活，将慢生成器变为快生成器。

## 延伸阅读

- [Goodfellow et al. (2014). Generative Adversarial Nets](https://arxiv.org/abs/1406.2661) — 原始 GAN 论文。
- [Radford et al. (2015). Unsupervised Representation Learning with DCGAN](https://arxiv.org/abs/1511.06434) — 第一个稳定架构。
- [Arjovsky, Chintala, Bottou (2017). Wasserstein GAN](https://arxiv.org/abs/1701.07875) — WGAN。
- [Miyato et al. (2018). Spectral Normalization for GANs](https://arxiv.org/abs/1802.05957) — SN。
- [Karras et al. (2020). Analyzing and Improving the Image Quality of StyleGAN](https://arxiv.org/abs/1912.04958) — StyleGAN2。
- [Karras et al. (2021). Alias-Free Generative Adversarial Networks](https://arxiv.org/abs/2106.12423) — StyleGAN3。
- [Sauer et al. (2023). Adversarial Diffusion Distillation](https://arxiv.org/abs/2311.17042) — SDXL-Turbo。
