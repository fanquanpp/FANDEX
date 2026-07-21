---
title: 视频生成
description: 从图像扩散到视频扩散，时空建模与Sora架构的核心原理
module: 'generative-ai'
difficulty: advanced
tags:
  - 视频生成
  - 时空建模
  - Sora
  - DiT
  - 视频扩散
related:
  - 'generative-ai/生成模型评估FID与CLIP分数'
  - 'generative-ai/视觉自回归模型VAR'
  - 'generative-ai/条件GAN与Pix2Pix'
  - 'generative-ai/图像修复扩展与编辑'
prerequisites:
  - 'generative-ai/3D生成'
---

# 视频生成

> 图像扩散在 2022 年解决了照片级真实感问题。视频扩散在 2024 年解决了同样的问题，只是多了一个时间维度。那一个维度改变了所有：内存（帧 × 像素 × 步骤），一致性（对象必须跨帧持续存在），和运动（物理必须看起来正确）。Sora, Veo, Kling, Runway 都运行在相同的配方上——时空 DiT + 流匹配——只是规模不同。

**类型:** 学习
**语言:** Python
**前置知识:** Phase 8 · 07 (潜扩散), Phase 8 · 13 (流匹配)
**时间:** ~60 分钟

## 问题

视频是帧序列。朴素方法：独立生成每帧。结果：闪烁，无时间一致性，对象出现又消失。你需要一个在所有帧上联合操作的模型，使得 (a) 对象跨帧持续存在，(b) 运动遵循物理，(c) 相机运动一致。

挑战是规模。一个 16 帧 512×512 的视频有 16 × 786k ≈ 12.6M 像素。一个 60 秒 1080p 视频有约 1.9B 像素。在像素空间中运行扩散是不可行的。所有生产视频模型都在压缩的时空潜空间中运行。

## 核心概念

**时空潜变量。** 2D VAE 压缩空间维度。视频 VAE 额外压缩时间维度。Sora 的时空 patch tokenizer 将 2 秒 512×512 视频压缩为约 4000 个 token。WAN VAE (Wide-Angle Network) 将 14 帧 480p 压缩为 `60×90×16` 潜变量。

**时空 DiT。** 与图像 DiT 相同的架构，但 patch 现在是 3D（时间 × 高度 × 宽度）。自注意力在所有 patch 上操作，自然混合时间和空间信息。这就是 Sora 的架构：一个在视频 patch token 上运行的 transformer。

**时间注意力。** 替代方案：使用 2D DiT 但在每个块中添加时间注意力层。空间自注意力处理每帧，时间自注意力跨帧混合。更便宜但表达能力较差。

**帧预测 vs 并行生成。** 两种范式：

1. **并行生成。** 一次生成所有帧。Sora, Veo, Kling 使用这种方式。优点：全局一致性。缺点：内存与帧数成线性增长。
2. **自回归帧预测。** 一次生成几帧，以之前的帧为条件。优点：任意长度。缺点：误差累积，长视频漂移。

**流匹配训练。** 大多数 2024-2026 视频模型使用流匹配而非 DDPM，因为 (a) 更直的采样路径意味着更少步数，(b) 更容易条件化初始帧。

## Sora 架构 (推测)

OpenAI 没有发布 Sora 的完整架构，但来自论文和逆向工程的关键事实：

- **时空 patch tokenizer。** 视频被分割为 3D patch（例如 2 帧 × 16×16 像素），每个 patch 变成一个 token。
- **Diffusion Transformer。** 标准 DiT 架构处理 token 序列。文本条件通过交叉注意力注入。
- **流匹配。** 训练使用整流流（直线路径），不是 DDPM。
- **可变分辨率和时长。** patch tokenizer 使模型自然处理不同分辨率和帧数——不需要固定网格。
- **训练数据。** 估计数百万小时的视频，加上文本描述。

## 动手构建

`code/main.py` 实现了一个玩具 1-D "视频"扩散模型，其中"帧"是 1-D 向量序列，时间一致性通过帧间注意力强制执行。

### 步骤 1：时空 patch 嵌入

```python
def embed_spacetime(frames, patch_size):
    tokens = []
    for t, frame in enumerate(frames):
        for i in range(0, len(frame), patch_size):
            patch = frame[i:i+patch_size]
            tokens.append([t, i] + patch)  # time + space + content
    return tokens
```

### 步骤 2：时间注意力

```python
def temporal_attention(tokens, n_frames):
    # Group tokens by spatial position, attend across time
    for spatial_pos in range(n_spatial_positions):
        frame_tokens = [tokens[f * n_spatial + spatial_pos] for f in range(n_frames)]
        attended = self_attention(frame_tokens)
        for f in range(n_frames):
            tokens[f * n_spatial + spatial_pos] = attended[f]
    return tokens
```

### 步骤 3：条件化首帧

```python
def condition_on_first_frame(z_t, first_frame, tau):
    # Replace first frame's latent with noised version of real first frame
    z_t[0] = noise_to_step(first_frame, tau)
    return z_t
```

## 常见陷阱

- **时间闪烁。** 帧间不一致导致闪烁。修复：更强的时间注意力，更大的时间感受野，时间损失项。
- **对象漂移。** 对象在帧间变形或消失。修复：跨帧对象追踪约束，或自回归条件化。
- **运动不自然。** 物理不正确的运动。修复：在更多样化的运动数据上训练，或添加运动损失。
- **内存爆炸。** 长视频超出 GPU 内存。修复：分块处理，梯度检查点，或帧并行训练。
- **长视频退化。** 自回归模型在长序列上漂移。修复：定期重新条件化关键帧，或使用滑动窗口。
- **文本-视频不对齐。** 模型忽略提示的某些部分。修复：更强文本条件化（T5-XXL），时间文本注意力。

## 实际应用

2026 年视频生成技术栈：

| 模型          | 提供方      | 分辨率 | 时长 | 步骤   |
| ------------- | ----------- | ------ | ---- | ------ |
| Sora          | OpenAI      | 1080p  | 60s  | 流匹配 |
| Veo 2         | Google      | 1080p  | 60s+ | 流匹配 |
| Kling 1.5     | Kuaishou    | 1080p  | 10s  | 扩散   |
| Runway Gen-3  | Runway      | 1080p  | 10s  | 扩散   |
| CogVideoX     | Zhipu       | 720p   | 6s   | DiT    |
| Open-Sora 1.2 | HPC-AI Tech | 512p   | 16s  | DiT    |
| HunyuanVideo  | Tencent     | 720p   | 5s   | DiT    |

## 交付物

保存 `outputs/skill-video-generator.md`。技能接收视频生成需求（分辨率、时长、风格、条件化），输出：模型选择、推理配置、内存预算和后处理步骤。

## 练习

1. **简单。** 运行 `code/main.py`，观察有和没有时间注意力的帧间一致性差异。测量相邻帧之间的 L2 距离。
2. **中等。** 实现首帧条件化：给定真实第一帧，生成后续帧。比较条件化 vs 非条件化生成的时间一致性。
3. **困难。** 实现简单的自回归视频生成：一次生成 4 帧，以之前的 4 帧为条件。测量 16 帧序列上的误差累积。

## 关键术语

| 术语            | 人们怎么说       | 实际含义                                                   |
| --------------- | ---------------- | ---------------------------------------------------------- |
| 时空 DiT        | "3D DiT"         | 在 3D patch（时间 × 空间）上操作的 Diffusion Transformer。 |
| 时间注意力      | "帧间注意力"     | 跨帧自注意力，确保时间一致性。                             |
| 时空 VAE        | "视频编码器"     | 同时压缩空间和时间维度的 VAE。                             |
| Patch tokenizer | "视频 tokenizer" | 将视频分割为 3D patch 并嵌入为 token。                     |
| 帧预测          | "自回归视频"     | 一次生成几帧，以之前的帧为条件。                           |
| 流匹配          | "直线采样"       | 训练直线路径的采样轨迹，比 DDPM 更少步数。                 |

## 生产笔记：视频推理的内存墙

视频推理的内存需求是图像的帧数倍。一个 16 帧 512² 视频在 SDXL 潜空间中需要 `16 × 128 × 128 × 4 = 16M` 潜变量元素。DiT 的自注意力在所有 token 上操作——O(N²) 内存，其中 N = 帧数 × 空间 token 数。

实际后果：

- **分块注意力。** 将 token 分成空间-时间块，在块内做注意力，块间用线性注意力。将 O(N²) 减少到 O(N × K)。
- **梯度检查点。** 训练时不在内存中保存中间激活，而是重新计算。内存减少 3-4 倍，训练时间增加 20-30%。
- **帧并行推理。** 将帧分配到多个 GPU。每个 GPU 处理一部分帧，通过 all-to-all 通信交换时间注意力结果。

## 延伸阅读

- [Brooks et al. (2024). Video Generation Models as World Simulators (Sora)](https://openai.com/research/video-generation-models-as-world-simulators) — Sora 技术报告。
- [Ho et al. (2022). Video Diffusion Models](https://arxiv.org/abs/2204.03458) — 视频扩散基础。
- [Blattmann et al. (2023). Stable Video Diffusion](https://arxiv.org/abs/2311.15127) — SVD。
- [Yang et al. (2024). CogVideoX](https://arxiv.org/abs/2408.06072) — 开源视频 DiT。
- [Kong et al. (2024). HunyuanVideo](https://arxiv.org/abs/2412.03603) — 腾讯的视频模型。
