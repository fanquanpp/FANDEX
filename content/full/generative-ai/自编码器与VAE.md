---
title: 自编码器与VAE
description: 从普通自编码器到变分自编码器，理解重参数化技巧与ELBO损失
module: 'generative-ai'
difficulty: intermediate
tags:
  - 自编码器
  - VAE
  - ELBO
  - 重参数化
  - 潜变量
related:
  - 'generative-ai/图像修复扩展与编辑'
  - 'generative-ai/音频生成'
  - 'generative-ai/ControlNet与LoRA条件化'
  - 'generative-ai/GAN生成器与判别器'
prerequisites:
  - 'generative-ai/3D生成'
---

# 自编码器与变分自编码器 (VAE)

> 普通自编码器压缩然后重建。它记忆。它不生成。加一个技巧——强制编码看起来像高斯分布——你就得到了一个采样器。那个单一技巧，`z = μ + σ·ε` 的重参数化，就是为什么你在 2026 年使用的每个潜扩散和流匹配图像模型在输入端都有一个 VAE。

**类型:** 构建
**语言:** Python
**前置知识:** Phase 3 · 02 (反向传播), Phase 3 · 07 (CNN), Phase 8 · 01 (分类)
**时间:** ~75 分钟

## 问题

将 784 像素的 MNIST 数字压缩为 16 个数字的编码，然后重建。普通自编码器在重建 MSE 上会拿满分，但编码空间是一团糟。在编码空间中随机取一点，解码它，你得到噪声。它没有采样器。它是一个穿了外衣的压缩模型。

你真正想要的是：(a) 编码空间是一个干净的、可以采样的平滑分布——比如各向同性高斯 `N(0, I)`，(b) 解码任何样本都能产生一个合理的数字，(c) 编码器和解码器仍然压缩良好。三个目标，一个架构，一个损失。

Kingma 2013 年的 VAE 通过训练编码器输出一个*分布* `q(z|x) = N(μ(x), σ(x)²)`，通过 KL 惩罚将该分布拉向先验 `N(0, I)`，然后在解码前从 `q(z|x)` 中采样 `z` 来解决这个问题。推理时，丢弃编码器，采样 `z ~ N(0, I)`，解码。KL 惩罚就是强制编码空间结构化的力量。

2026 年 VAE 很少单独部署——它们在原始图像质量上已被扩散超越——但它们是每个潜扩散模型（SD 1/2/XL/3, Flux, AudioCraft）的首选编码器。学习 VAE，你就学习了你使用的每个图像管线中不可见的第一层。

## 核心概念

**自编码器。** `z = encoder(x)`，`x̂ = decoder(z)`，损失 = `||x - x̂||²`。编码空间无结构。

**VAE 编码器。** 输出两个向量：`μ(x)` 和 `log σ²(x)`。它们定义了 `q(z|x) = N(μ, diag(σ²))`。

**重参数化技巧。** 从 `q(z|x)` 采样不可微。将采样重写为 `z = μ + σ·ε`，其中 `ε ~ N(0, I)`。现在 `z` 是 `(μ, σ)` 的确定性函数加上非参数噪声——梯度可以通过 `μ` 和 `σ` 流动。

**损失。** 证据下界 (ELBO)，两项：

```
loss = reconstruction + β · KL[q(z|x) || N(0, I)]
     = ||x - x̂||²  + β · Σ_i ( σ_i² + μ_i² - log σ_i² - 1 ) / 2
```

重建将 `x̂` 推向 `x`。KL 将 `q(z|x)` 推向先验。它们相互权衡。小 β (<1) = 更清晰的样本，编码空间不够高斯。大 β (>1) = 更干净的编码空间，更模糊的样本。β-VAE (Higgins 2017) 使这个旋钮出名并开启了解耦研究。

**采样。** 推理时：采样 `z ~ N(0, I)`，前向通过解码器。一次前向传播——没有像扩散那样的迭代采样。

## 动手构建

`code/main.py` 实现了一个不使用 numpy 或 torch 的微型 VAE。输入是从 2 分量 8 维高斯混合中采样的 8 维合成数据。编码器和解码器是单隐藏层 MLP。我们实现了 tanh 激活、前向传播、损失和手写反向传播。不是生产级——是教学级。

### 步骤 1：编码器前向

```python
def encode(x, enc):
    h = tanh(add(matmul(enc["W1"], x), enc["b1"]))
    mu = add(matmul(enc["W_mu"], h), enc["b_mu"])
    log_sigma2 = add(matmul(enc["W_sig"], h), enc["b_sig"])
    return mu, log_sigma2
```

使用 `log σ²` 而不是 `σ`，使网络输出不受约束（σ 的 softplus 是一个陷阱——梯度在 σ ≈ 0 时消失）。

### 步骤 2：重参数化并解码

```python
def reparameterize(mu, log_sigma2, rng):
    eps = [rng.gauss(0, 1) for _ in mu]
    sigma = [math.exp(0.5 * lv) for lv in log_sigma2]
    return [m + s * e for m, s, e in zip(mu, sigma, eps)]

def decode(z, dec):
    h = tanh(add(matmul(dec["W1"], z), dec["b1"]))
    return add(matmul(dec["W_out"], h), dec["b_out"])
```

### 步骤 3：ELBO

```python
def elbo(x, x_hat, mu, log_sigma2, beta=1.0):
    recon = sum((a - b) ** 2 for a, b in zip(x, x_hat))
    kl = 0.5 * sum(math.exp(lv) + m * m - lv - 1 for m, lv in zip(mu, log_sigma2))
    return recon + beta * kl, recon, kl
```

精确闭式 KL，因为两个分布都是高斯的。不要数值积分。2026 年人们仍然在代码中使用蒙特卡洛 KL 估计——这慢了 3 倍且毫无理由。

### 步骤 4：生成

```python
def sample(dec, z_dim, rng):
    z = [rng.gauss(0, 1) for _ in range(z_dim)]
    return decode(z, dec)
```

这就是生成模型。五行代码。

## 常见陷阱

- **后验坍缩。** KL 项将 `q(z|x) → N(0, I)` 推得如此猛烈，以至于 `z` 不携带关于 `x` 的信息。修复：β 退火（从 β=0 开始，逐渐增加到 1），free bits，或跳过不活跃维度的 KL。
- **模糊样本。** 高斯解码器似然意味着 MSE 重建，这对 L2 是贝叶斯最优的（均值）——一组合理数字的均值是一个模糊的数字。修复：离散解码器 (VQ-VAE, NVAE)，或仅将 VAE 用作编码器并在潜变量上叠加扩散（这就是 Stable Diffusion 的做法）。
- **β 太大，太早。** 参见后验坍缩。从 β≈0.01 开始并逐渐增加。
- **潜变量维度太小。** 16 维适用于 MNIST，256 维适用于 ImageNet 256²，2048 维适用于 ImageNet 1024²。Stable Diffusion 的 VAE 将 512×512×3 压缩为 64×64×4（空间面积下采样 32 倍，通道 32 倍）。

## 实际应用

2026 年的 VAE 技术栈：

| 场景                                | 选择                                               |
| ----------------------------------- | -------------------------------------------------- |
| 扩散的图像潜变量编码器              | Stable Diffusion VAE (`sd-vae-ft-ema`) 或 Flux VAE |
| 音频潜变量编码器                    | Encodec (Meta), SoundStream, 或 DAC (Descript)     |
| 视频潜变量                          | Sora 的时空 patch, Latte VAE, WAN VAE              |
| 解耦表示学习                        | β-VAE, FactorVAE, TCVAE                            |
| 离散潜变量（用于 transformer 建模） | VQ-VAE, RVQ (ResidualVQ)                           |
| 用于生成的连续潜变量                | 普通 VAE，然后在该潜空间中条件化流/扩散模型        |

潜扩散模型是一个 VAE，在编码器和解码器之间生活着一个扩散模型。VAE 做粗压缩，扩散模型做重活。视频（VAE + 视频-扩散 DiT）和音频（Encodec + MusicGen transformer）也是同样的模式。

## 交付物

保存 `outputs/skill-vae-trainer.md`。

技能接收：数据集概况 + 潜变量维度目标 + 下游用途（重建、采样或潜扩散输入），并输出：架构选择（plain/β/VQ/RVQ）、β 调度、潜变量维度、解码器似然（高斯 vs 类别）、以及评估计划（重建 MSE、每维 KL、`q(z|x)` 与 `N(0, I)` 之间的 Fréchet 距离）。

## 练习

1. **简单。** 将 `code/main.py` 中的 `β` 改为 `0.01`、`0.1`、`1.0`、`5.0`。记录最终重建 MSE 和 KL。哪个 β 对你的合成数据是帕累托最优的？
2. **中等。** 将高斯解码器似然替换为伯努利似然（交叉熵损失）。在二值化的相同合成数据上比较样本质量。
3. **困难。** 将 `code/main.py` 扩展为迷你 VQ-VAE：用 K=32 条目的码本中最近邻查找替换连续 `z`。比较重建 MSE 并报告使用了多少码本条目（码本坍缩是真实的）。

## 关键术语

| 术语     | 人们怎么说    | 实际含义                                                            |
| -------- | ------------- | ------------------------------------------------------------------- |
| 自编码器 | 编码-解码网络 | `x → z → x̂`，学习 MSE。不是生成式的。                               |
| VAE      | 带采样器的 AE | 编码器输出分布，KL 惩罚塑造编码空间。                               |
| ELBO     | 证据下界      | `log p(x) ≥ recon - KL[q(z\|x) \|\| p(z)]`；当 `q = p(z\|x)` 时紧。 |
| 重参数化 | `z = μ + σ·ε` | 将随机节点重写为确定性 + 纯噪声。使反向传播通过采样成为可能。       |
| 先验     | `p(z)`        | 潜变量的目标分布，通常为 `N(0, I)`。                                |
| 后验坍缩 | "KL 项赢了"   | 编码器忽略 `x`，输出先验；解码器必须凭空生成。                      |
| β-VAE    | 可调 KL 权重  | `loss = recon + β·KL`。更高 β = 更解耦但更模糊。                    |
| VQ-VAE   | 离散潜变量    | 用最近码本向量替换连续 `z`；使 transformer 建模成为可能。           |

## 生产笔记：VAE 是扩散服务器中最热的路径

在 Stable Diffusion / Flux / SD3 管线中，VAE 每个请求被调用两次——一次编码（如果做 img2img / inpainting），一次解码。在 1024² 时，解码器通道通常是整个管线中最大的激活内存峰值，因为它将 `128×128×16` 的潜变量上采样回 `1024×1024×3`。两个实际后果：

- **切片或分块解码。** `diffusers` 暴露了 `pipe.vae.enable_slicing()` 和 `pipe.vae.enable_tiling()`。分块以微小的接缝伪影换取 `O(tile²)` 内存而非 `O(H·W)`。在消费级 GPU 上处理 1024²+ 时必不可少。
- **bf16 解码器，fp32 精度用于最终调整大小。** SD 1.x VAE 以 fp32 发布，在 1024²+ 转换为 fp16 时*静默产生 NaN*。SDXL 发布了 `madebyollin/sdxl-vae-fp16-fix`——始终优先使用 fp16-fix 变体或使用 bf16。

## 延伸阅读

- [Kingma & Welling (2013). Auto-Encoding Variational Bayes](https://arxiv.org/abs/1312.6114) — VAE 论文。
- [Higgins et al. (2017). β-VAE: Learning Basic Visual Concepts with a Constrained Variational Framework](https://openreview.net/forum?id=Sy2fzU9gl) — 解耦 β-VAE。
- [van den Oord et al. (2017). Neural Discrete Representation Learning](https://arxiv.org/abs/1711.00937) — VQ-VAE。
- [Vahdat & Kautz (2021). NVAE: A Deep Hierarchical Variational Autoencoder](https://arxiv.org/abs/2007.03898) — 最先进的图像 VAE。
- [Rombach et al. (2022). High-Resolution Image Synthesis with Latent Diffusion Models](https://arxiv.org/abs/2112.10752) — Stable Diffusion；VAE 作为编码器。
- [Défossez et al. (2022). High Fidelity Neural Audio Compression](https://arxiv.org/abs/2210.13438) — Encodec，音频 VAE 标准。
