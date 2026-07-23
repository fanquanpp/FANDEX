---
title: '生成模型 -- 分类与历史'
description: 五大生成模型家族的分类体系与演进历史，理解每个家族的权衡取舍
module: 'generative-ai'
difficulty: intermediate
tags:
  - 生成模型
  - GAN
  - VAE
  - 扩散模型
  - 流匹配
  - 自回归
related:
  - 'generative-ai/流匹配与整流流'
  - 'generative-ai/潜扩散与Stable-Diffusion'
  - 'generative-ai/生成模型评估FID与CLIP分数'
  - 'generative-ai/视觉自回归模型VAR'
prerequisites:
  - 'generative-ai/3D生成'
---

# 生成模型 -- 分类与历史

> 每一个图像模型、文本模型、视频模型和3D模型都归属于五个类别之一。选错类别，你将与数学搏斗数周。选对类别，该领域过去十二年的进展将在你脑中清晰排列。

**类型:** 学习
**语言:** Python
**前置知识:** Phase 2 (ML 基础), Phase 3 (深度学习核心), Phase 7 · 14 (Transformers)
**时间:** ~45 分钟

## 问题

生成模型只做一件事：给定从某个未知分布 `p_data(x)` 中采样的训练样本，输出看起来来自同一分布的新样本。人脸、句子、MIDI 文件、蛋白质结构——如果你眯起眼睛看，都是同一个问题。

困难在于 `p_data` 生活在一个数百万维的空间中（一张 512x512 的 RGB 图像约 786k 维），样本只占据该空间中一个薄流形，而你可能只有 1000 万个样本。暴力估计密度是不可能的。每个生成模型都是一种妥协，用一个稍容易的问题替换一个困难问题。

过去十二年中，五个家族存活了下来。了解每个家族做了什么妥协，就能理解它为什么在某些任务上获胜而在其他任务上崩溃。

## 核心概念

**1. 显式密度，可计算的。** 将 `log p(x)` 写成可以实际求值的求和式。自回归模型 (PixelCNN, WaveNet, GPT) 将 `p(x) = ∏ p(x_i | x_<i)` 因式分解。归一化流 (RealNVP, Glow) 将 `p(x)` 构建为简单基分布的可逆变换。优点：精确似然，训练损失清晰。缺点：自回归推理是顺序的（长序列慢），流需要可逆架构（架构受限）。

**2. 显式密度，近似的。** 从下方界定 `log p(x)`（ELBO）并优化该界限。VAE (Kingma 2013) 使用编码器-解码器加变分后验。扩散模型 (DDPM, Ho 2020) 训练一个去噪器，隐式优化加权的 ELBO。扩散是 2026 年图像、视频和 3D 的主导骨干。

**3. 隐式密度。** 完全跳过密度；学习一个生成器 `G(z)` 产生样本，以及一个判别器 `D(x)` 区分真假。GAN (Goodfellow 2014)。推理快（一次前向传播），但训练以不稳定著称。StyleGAN 1/2/3 即使在 2026 年仍是固定域照片级真实感（人脸、卧室）的最先进水平。

**4. 基于分数/连续时间。** 直接学习对数密度的梯度 `∇_x log p(x)`（分数）。Song & Ermon (2019) 证明了分数匹配将扩散推广到 SDE。流匹配 (Lipman 2023) 是 2024-2026 年的热点：无需模拟训练，更直的路径，比 DDPM 快 4-10 倍的采样。Stable Diffusion 3、Flux、AudioCraft 2 都使用流匹配。

**5. 基于离散码元的自回归。** 用 VQ-VAE 或残差量化器将高维数据压缩为离散 token 的短序列，然后用 Transformer 建模 token 序列。Parti、MuseNet、AudioLM、VALL-E、Sora 的 patch tokenizer 都使用这种方式。这是第一类加一个学习到的 tokenizer。

## 简史

| 年份 | 模型                                        | 意义                                   |
| ---- | ------------------------------------------- | -------------------------------------- |
| 2013 | VAE (Kingma)                                | 第一个具有可用训练损失的深度生成模型。 |
| 2014 | GAN (Goodfellow)                            | 隐式密度，无需似然——样本惊人地清晰。   |
| 2015 | DRAW, PixelCNN                              | 顺序图像生成。                         |
| 2017 | Glow, RealNVP                               | 可逆流；带深度的精确似然。             |
| 2017 | Progressive GAN                             | 首个百万像素人脸。                     |
| 2019 | StyleGAN / StyleGAN2                        | 照片级真实感人脸至今难以超越。         |
| 2020 | DDPM (Ho)                                   | 扩散变得实用。                         |
| 2021 | CLIP, DALL-E 1, VQGAN                       | 文本到图像走向主流。                   |
| 2022 | Imagen, Stable Diffusion 1, DALL-E 2        | 潜扩散 + 文本条件 = 商品化。           |
| 2022 | ControlNet, LoRA                            | 对预训练扩散模型的精细控制。           |
| 2023 | SDXL, Midjourney v5, 流匹配                 | 规模 + 更好的训练动态。                |
| 2024 | Sora, Stable Diffusion 3, Flux.1            | 视频扩散；流匹配胜出。                 |
| 2025 | Veo 2, Kling 1.5, Runway Gen-3, Nano Banana | 生产级视频。                           |
| 2026 | 一致性 + 整流流                             | 从扩散骨干一步采样。                   |

## 五问分诊法

当一篇新的生成模型论文发布时，在读方法部分之前先回答这五个问题。

1. **建模对象是什么？** 像素、潜变量、离散 token、3D 高斯、网格、波形？
2. **密度是显式还是隐式？** 他们写出了 `log p(x)` 吗？
3. **采样：一次性还是迭代？** 迭代意味着推理更慢；一次性通常意味着对抗性或蒸馏。
4. **条件：无条件、类别、文本、图像、姿态？** 这决定了损失和架构脚手架。
5. **评估：FID、CLIP 分数、IS、人类偏好、任务准确率？** 每种都有已知的失效模式（见第 14 课）。

你将在本阶段的每节课中重新回答这五个问题。到最后，它们将成为条件反射。

## 动手构建

本课的代码是一个轻量级可视化：用三种玩具方法（核密度估计、离散直方图和最近样本"类 GAN"生成器）从样本中拟合 1-D 高斯混合，这样你可以在一屏打印的问题上看到显式密度与隐式密度的区别。

运行 `code/main.py`。它从双模高斯混合中抽取 2000 个样本，然后打印：

```
explicit density (histogram): p(x in [-0.5, 0.5]) ≈ 0.38
approximate density (KDE):     p(x in [-0.5, 0.5]) ≈ 0.41
implicit (nearest-sample gen): 20 new samples printed, no p(x)
```

注意：前两个让你问"这个点有多可能？"第三个不能。这就是*显式与隐式*的区别，在后续每节课中都很重要。

## 实际应用

2026 年，哪个家族，用于哪个任务？

| 任务                   | 最佳家族                                                             | 原因                             |
| ---------------------- | -------------------------------------------------------------------- | -------------------------------- |
| 照片级真实感人脸，窄域 | StyleGAN 2/3                                                         | 仍然最清晰，推理最快。           |
| 通用文本到图像         | 潜扩散 + 流匹配                                                      | SD3, Flux.1, DALL-E 3。          |
| 快速文本到图像         | 整流流 + 蒸馏                                                        | SDXL-Turbo, SD3-Turbo, LCM。     |
| 文本到视频             | 扩散 Transformer + 流匹配                                            | Sora, Veo 2, Kling。             |
| 语音 + 音乐            | 基于 token 的 AR (AudioLM, VALL-E, MusicGen) 或流匹配 (AudioCraft 2) | 离散 token 扩展成本低。          |
| 3D 场景                | Gaussian Splatting 拟合，扩散先验                                    | 3D-GS 用于重建，扩散用于新视角。 |
| 密度估计（无采样）     | 流                                                                   | 唯一具有精确 `log p(x)` 的家族。 |
| 模拟 / 物理            | 流匹配，分数 SDE                                                     | 直线路径，平滑向量场。           |

## 交付物

保存为 `outputs/skill-model-chooser.md`。

该技能接收任务描述并输出：(1) 使用哪个家族，(2) 三个开源和三个托管选项的排序列表，(3) 你应该注意的可能失效模式，(4) 计算/时间预算。

## 练习

1. **简单。** 对于以下五个产品，识别家族和骨干：ChatGPT 图像、Midjourney v7、Sora、Runway Gen-3、ElevenLabs。证据应来自公开技术报告。
2. **中等。** 你明天要读的论文声称比扩散快 100 倍采样。写下三个问题来检查这种加速在条件化和高分辨率下是否成立。
3. **困难。** 选择一个你关心的领域（如蛋白质结构、CAD、分子、轨迹）。回答该领域当前 SOTA 模型的五问分诊法，并勾勒一个更好的模型会改变什么。

## 关键术语

| 术语     | 人们怎么说             | 实际含义                                           |
| -------- | ---------------------- | -------------------------------------------------- |
| 生成模型 | "它制造新东西"         | 学习 `p_data(x)` 的采样器，可选地暴露 `log p(x)`。 |
| 显式密度 | "你可以计算它"         | 模型提供闭式或可计算的 `log p(x)`。                |
| 隐式密度 | "GAN 风格"             | 只有采样器——无法计算给定点的 `p(x)`。              |
| ELBO     | "证据下界"             | `log p(x)` 的可计算下界；VAE 和扩散优化它。        |
| 分数     | "对数密度梯度"         | `∇_x log p(x)`；扩散和 SDE 模型学习这个场。        |
| 流形假设 | "数据生活在一个曲面上" | 高维数据集中在低维流形上；这就是降维有效的原因。   |
| 自回归   | "预测下一个片段"       | 将联合分布因式分解为条件分布的乘积。               |
| 潜变量   | "压缩编码"             | 解码器可以从中重建输入的低维表示。                 |

## 生产笔记：五个家族，五种推理形态

每个家族映射到不同的推理服务器成本曲线。生产推理文献将 LLM 推理框架为 prefill + decode；同样的分解在这里也适用：

- **自回归（第 1 和第 5 类）。** 顺序 decode 主导延迟；KV-cache、连续批处理和推测性解码都直接适用。
- **VAE / 扩散 / 流匹配（第 2 和第 4 类）。** 在 LLM 意义上没有 decode。成本 = `num_steps × step_cost`，`step_cost` 是全潜变量分辨率的 transformer 或 U-Net 前向传播。生产调节旋钮是步数（DDIM / DPM-Solver / 蒸馏）、批大小和精度（bf16 / fp8 / int4）。
- **GAN（第 3 类）。** 一次前向传播。无调度，无 KV-cache。TTFT ≈ 总延迟。这就是 StyleGAN 在窄域 UX 上仍然获胜的原因。

当你在论文摘要中看到"比扩散更快"时，将其翻译为"更少步数 × 相同步成本"或"相同步数 × 更便宜的步成本"。其他都是营销。

## 延伸阅读

- [Goodfellow et al. (2014). Generative Adversarial Nets](https://arxiv.org/abs/1406.2661) — GAN 论文。
- [Kingma & Welling (2013). Auto-Encoding Variational Bayes](https://arxiv.org/abs/1312.6114) — VAE 论文。
- [Ho, Jain, Abbeel (2020). Denoising Diffusion Probabilistic Models](https://arxiv.org/abs/2006.11239) — DDPM 论文。
- [Song et al. (2021). Score-Based Generative Modeling through SDEs](https://arxiv.org/abs/2011.13456) — 扩散作为 SDE。
- [Lipman et al. (2023). Flow Matching for Generative Modeling](https://arxiv.org/abs/2210.02747) — 流匹配论文。
- [Esser et al. (2024). Scaling Rectified Flow Transformers for High-Resolution Image Synthesis](https://arxiv.org/abs/2403.03206) — Stable Diffusion 3。
