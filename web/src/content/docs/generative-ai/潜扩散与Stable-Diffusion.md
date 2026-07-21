---
title: '潜扩散与Stable Diffusion'
description: '从像素空间到潜空间的扩散，Stable Diffusion的两阶段架构与文本条件化'
module: 'generative-ai'
difficulty: advanced
tags:
  - 潜扩散
  - 'Stable Diffusion'
  - DiT
  - CFG
  - 文本条件化
related:
  - 'generative-ai/扩散模型DDPM从零开始'
  - 'generative-ai/流匹配与整流流'
  - 'generative-ai/生成模型分类与历史'
  - 'generative-ai/生成模型评估FID与CLIP分数'
prerequisites:
  - 'generative-ai/3D生成'
---

# 潜扩散与 Stable Diffusion

> 在 512×512 图像上做像素空间扩散是计算犯罪。Rombach et al. (2022) 注意到你不需要所有 786k 维度来生成图像——你需要足够捕获语义结构，以及一个单独的解码器处理其余部分。在 VAE 的潜空间内运行扩散。那一个想法就是 Stable Diffusion。

**类型:** 构建
**语言:** Python
**前置知识:** Phase 8 · 02 (VAE), Phase 8 · 06 (DDPM), Phase 7 · 09 (ViT)
**时间:** ~75 分钟

## 问题

512² 的像素空间扩散意味着 U-Net 在形状 `[B, 3, 512, 512]` 的张量上运行。每个采样步骤对 500M 参数的 U-Net 约 100 GFLOPS。50 步是每张图像 5 TFLOPS。在十亿张图像上训练，计算账单是荒谬的。

这些 FLOP 的大部分用于将感知上不重要的细节推过网络——有损 VAE 可以压缩掉的高频纹理。Rombach 的想法：训练一次 VAE（_第一阶段_），冻结它，完全在 4 通道 64×64 潜空间（_第二阶段_）中运行扩散。相同的 U-Net。1/16 的像素。约 64 倍更少的 FLOP，质量相当。

这就是 Stable Diffusion 的配方。SD 1.x / 2.x 使用 860M U-Net 处理 `64×64×4` 潜变量，SDXL 使用 2.6B U-Net 处理 `128×128×4`，SD3 将 U-Net 替换为带流匹配的 Diffusion Transformer (DiT)。Flux.1-dev (Black Forest Labs, 2024) 部署了 12B 参数的 DiT-MMDiT。所有都运行在相同的两阶段基础设施上。

## 核心概念

**两个阶段，分别训练。**

1. **阶段 1 — VAE。** 编码器 `E(x) → z`，解码器 `D(z) → x`。目标压缩：每个空间轴 8× 下采样 + 调整通道使总潜变量大小约为像素数的 1/16。损失 = 重建 (L1 + LPIPS 感知) + KL（小权重，这样 `z` 不会被强制太像高斯，因为我们不需要从 `z` 精确采样）。通常用对抗损失训练，使解码图像清晰。

2. **阶段 2 — 在 `z` 上扩散。** 将 `z = E(x_real)` 视为数据。训练 U-Net（或 DiT）去噪 `z_t`。推理时：通过扩散采样 `z_0`，然后 `x = D(z_0)`。

**文本条件化。** 两个额外组件。一个冻结的文本编码器（SD 1.x 用 CLIP-L，SD 2/XL 用 CLIP-L+OpenCLIP-G，SD3 和 Flux 用 T5-XXL）。一个交叉注意力注入：每个 U-Net 块取 `[Q = 图像特征, K = V = 文本 token]` 并混合它们。token 是文本影响图像的唯一方式。

**损失函数与第 06 课相同。** 相同的 DDPM / 流匹配噪声 MSE。你只是换了数据域。

## 架构变体

| 模型           | 年份 | 骨干               | 潜变量形状 | 文本编码器               | 参数量      |
| -------------- | ---- | ------------------ | ---------- | ------------------------ | ----------- |
| SD 1.5         | 2022 | U-Net              | 64×64×4    | CLIP-L (77 tokens)       | 860M        |
| SD 2.1         | 2022 | U-Net              | 64×64×4    | OpenCLIP-H               | 865M        |
| SDXL           | 2023 | U-Net + refiner    | 128×128×4  | CLIP-L + OpenCLIP-G      | 2.6B + 6.6B |
| SDXL-Turbo     | 2023 | 蒸馏               | 128×128×4  | 同上                     | 1-4 步采样  |
| SD3            | 2024 | MMDiT (多模态 DiT) | 128×128×16 | T5-XXL + CLIP-L + CLIP-G | 2B / 8B     |
| Flux.1-dev     | 2024 | MMDiT              | 128×128×16 | T5-XXL + CLIP-L          | 12B         |
| Flux.1-schnell | 2024 | MMDiT 蒸馏         | 128×128×16 | T5-XXL + CLIP-L          | 12B, 1-4 步 |

趋势：用 DiT（潜变量 patch 上的 transformer）替换 U-Net，扩展文本编码器（T5 在提示遵循上优于 CLIP），增加潜变量通道（4 → 16 给出更多细节余量）。

## 动手构建

`code/main.py` 在第 06 课的 DDPM 之上堆叠了一个玩具 1-D "VAE"（恒等编码器 + 解码器，用于演示；真正的 VAE 是卷积网络），并添加了带无分类器引导的类条件化。它展示了相同的扩散损失无论你在原始 1-D 值还是编码值上运行都有效——这是关键洞察。

### 步骤 1：编码器/解码器

```python
def encode(x):    return x * 0.5          # 玩具"压缩"到更小尺度
def decode(z):    return z * 2.0
```

真正的 VAE 有训练好的权重。为了教学，这个线性映射足以展示扩散在 `z` 上运行而不关心原始数据空间。

### 步骤 2：在 `z` 空间中扩散

与第 06 课相同的 DDPM。网络看到的数据是 `z = E(x)`。采样 `z_0` 后，用 `D(z_0)` 解码。

### 步骤 3：无分类器引导

训练时 10% 丢弃类标签（替换为空 token）。推理时，计算 `ε_cond` 和 `ε_uncond`，然后：

```python
eps_cfg = (1 + w) * eps_cond - w * eps_uncond
```

`w = 0` = 无引导（完全多样性），`w = 3` = 默认，`w = 7+` = 饱和 / 过度清晰。

### 步骤 4：文本条件化（概念，非代码）

用冻结文本编码器输出替换类标签。通过交叉注意力将文本嵌入送入 U-Net：

```python
h = h + CrossAttention(Q=h, K=text_embed, V=text_embed)
```

这是类条件扩散模型和 Stable Diffusion 之间唯一实质性的区别。

## 常见陷阱

- **VAE 尺度不匹配。** SD 1.x VAE 有一个缩放常数（`scaling_factor ≈ 0.18215`）在编码后应用。忘记这个会使 U-Net 在方差严重错误的潜变量上训练。每个检查点都附带一个。
- **文本编码器静默错误。** SD3 需要 T5-XXL 且 >=128 tokens，回退到仅 CLIP 是有损的。始终检查 `use_t5=True`，否则提示保真度会暴跌。
- **混合潜空间。** SDXL, SD3, Flux 都使用不同的 VAE。在 SDXL 潜变量上训练的 LoRA 不能在 SD3 上工作。Hugging Face diffusers 0.30+ 拒绝加载不匹配的检查点。
- **CFG 太高。** `w > 10` 产生饱和、油腻的图像，以多样性为代价过度拟合提示。甜蜜点是 `w = 3-7`。
- **负提示泄漏。** 空负提示变为空 token；填充的负提示变为 `ε_uncond`。它们不一样；一些管线静默默认为空。

## 实际应用

2026 年的生产栈：

| 目标                         | 推荐骨干                                          |
| ---------------------------- | ------------------------------------------------- |
| 窄域，配对数据，从头训练模型 | SDXL 微调 (LoRA / full) — 最快出货                |
| 开放域文本到图像，开放权重   | Flux.1-dev (12B, Apache / 非商业) 或 SD3.5-Large  |
| 最快推理，开放权重           | Flux.1-schnell (1-4 步, Apache) 或 SDXL-Lightning |
| 最佳提示遵循，托管           | GPT-Image / DALL-E 3, Midjourney v7, Imagen 4     |
| 编辑工作流                   | Flux.1-Kontext (2024.12) — 原生接受图像 + 文本    |
| 研究，基线                   | SD 1.5 — 古老但研究充分                           |

## 交付物

保存 `outputs/skill-sd-prompter.md`。技能接收文本提示 + 目标风格，输出：模型 + 检查点、CFG 尺度、采样器、负提示、分辨率、可选 ControlNet/IP-Adapter 组合和每步 QA 检查清单。

## 练习

1. **简单。** 用引导 `w ∈ {0, 1, 3, 7, 15}` 运行 `code/main.py`。记录每类平均样本。在什么 `w` 下类均值偏离超过真实数据均值？
2. **中等。** 将玩具线性编码器替换为带重建损失的 tanh-MLP 编码器/解码器对。在新潜变量上重新训练扩散。样本质量变化了吗？
3. **困难。** 用 diffusers 设置真正的 Stable Diffusion 推理：加载 `sdxl-base`，运行 30 Euler 步 CFG=7，计时。然后切换到 `sdxl-turbo` 4 步 CFG=0。相同主题，不同质量——描述什么变了以及为什么。

## 关键术语

| 术语         | 人们怎么说              | 实际含义                                               |
| ------------ | ----------------------- | ------------------------------------------------------ |
| 第一阶段     | "VAE"                   | 训练好的编码器/解码器对；将 512² 压缩到 64²。          |
| 第二阶段     | "U-Net"                 | 潜空间上的扩散模型。                                   |
| CFG          | "引导尺度"              | `(1+w)·ε_cond - w·ε_uncond`；调节条件化强度。          |
| 空 token     | "空提示嵌入"            | 用于 `ε_uncond` 的无条件嵌入。                         |
| 交叉注意力   | "文本如何进入"          | 每个 U-Net 块以文本 token 为 K 和 V 进行注意力。       |
| DiT          | "Diffusion Transformer" | 用潜变量 patch 上的 transformer 替换 U-Net；扩展更好。 |
| MMDiT        | "多模态 DiT"            | SD3 的架构：文本和图像流共享注意力。                   |
| VAE 缩放因子 | "魔法数字"              | 将潜变量除以约 5.4 使扩散在单位方差空间中运行。        |

## 生产笔记：在 8GB 消费级 GPU 上运行 Flux-12B

参考 Flux 集成是经典的"我有消费级 GPU，能部署吗？"配方。技巧与生产推理文献列出的应用于扩散 DiT 的三旋钮配方相同：

1. **交错加载。** Flux 有三个从不需要同时存在于 VRAM 中的网络：T5-XXL 文本编码器（fp32 约 10 GB）、CLIP-L（小）、12B MMDiT 和 VAE。先编码提示，*删除*编码器，加载 DiT，去噪，_删除_ DiT，加载 VAE，解码。消费级 8GB GPU 一次只能装一个阶段。
2. **通过 bitsandbytes 的 4-bit 量化。** `BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_compute_dtype=torch.bfloat16)` 应用于 T5 编码器和 DiT。内存降低 8 倍，文本到图像的质量下降微乎其微。
3. **CPU 卸载。** `pipe.enable_model_cpu_offload()` 随每个前向传播推进在 CPU 和 GPU 之间自动交换模块。增加 10-20% 延迟但使管线能够运行。

内存核算：`10 GB T5 / 8 = 1.25 GB` 量化，`12 B params × 0.5 bytes = ~6 GB` 量化 DiT，加上激活。这是 TP=1 推理的极端端——无模型并行，最大量化。生产中你会在 H100 上运行 TP=2 或 TP=4；对于单个开发者笔记本，这就是配方。

## 延伸阅读

- [Rombach et al. (2022). High-Resolution Image Synthesis with Latent Diffusion Models](https://arxiv.org/abs/2112.10752) — Stable Diffusion。
- [Podell et al. (2023). SDXL: Improving Latent Diffusion Models for High-Resolution Image Synthesis](https://arxiv.org/abs/2307.01952) — SDXL。
- [Peebles & Xie (2023). Scalable Diffusion Models with Transformers (DiT)](https://arxiv.org/abs/2212.09748) — DiT。
- [Esser et al. (2024). Scaling Rectified Flow Transformers for High-Resolution Image Synthesis](https://arxiv.org/abs/2403.03206) — SD3, MMDiT。
- [Ho & Salimans (2022). Classifier-Free Diffusion Guidance](https://arxiv.org/abs/2207.12598) — CFG。
- [Labs (2024). Flux.1 — Black Forest Labs announcement](https://blackforestlabs.ai/announcing-black-forest-labs/) — Flux.1 系列。
- [Hugging Face Diffusers docs](https://huggingface.co/docs/diffusers/index) — 上述每个检查点的参考实现。
