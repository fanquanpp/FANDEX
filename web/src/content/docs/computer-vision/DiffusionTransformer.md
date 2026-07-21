---
title: DiffusionTransformer
description: 'U-Net不是扩散的秘密。用Transformer替换它，用直线路径替换噪声调度，你就有了SD3、FLUX和每个2026文本到图像模型。'
module: 'computer-vision'
difficulty: advanced
tags:
  - DiT
  - 整流流
  - MMDiT
  - FLUX
  - AdaLN
related:
  - 'computer-vision/自监督视觉'
  - 'computer-vision/CNN从LeNet到ResNet'
  - 'computer-vision/OCR与文档理解'
  - 'computer-vision/SAM开放词汇分割'
prerequisites:
  - 'computer-vision/3D高斯泼溅'
---

# DiffusionTransformer

> U-Net不是扩散的秘密。用Transformer替换它，用直线路径替换噪声调度，你就有了SD3、FLUX和每个2026文本到图像模型。

**类型:** 学习+构建
**语言:** Python
**前置知识:** Phase 4 Lesson 10 (Diffusion DDPM), Phase 4 Lesson 14 (ViT)
**时间:** 约75分钟

## 学习目标

- 追踪从U-Net DDPM到Diffusion Transformer (DiT)、MMDiT (SD3)和单/双流DiT (FLUX)的演进
- 解释整流流：为什么噪声和数据之间的直线路径让模型在20步而非1000步采样
- 实现微型DiT块和整流流训练循环，各不超过100行
- 按架构、参数量和许可证区分模型变体（SD3、FLUX.1-dev、FLUX.1-schnell、Z-Image、Qwen-Image）

## 问题所在

第10课用U-Net去噪器构建了DDPM。那个配方主导了2020-2023年：U-Net + beta调度 + 噪声预测损失。它产生了Stable Diffusion 1.5和2.1以及DALL-E 2。

2026年每个最先进的文本到图像模型都已经超越了它。Stable Diffusion 3、FLUX、SD4、Z-Image、Qwen-Image、Hunyuan-Image——没有一个使用U-Net。它们使用Diffusion Transformer (DiT)。SD3和FLUX还将DDPM噪声调度替换为整流流，它将噪声到数据的路径拉直，并通过一致性或蒸馏变体实现1-4步推理。

这个转变很重要，因为它是基于扩散的图像生成变得可控、提示准确（SD3/SD4解决了文本渲染）和生产快速的原因。理解DiT + 整流流就是理解2026生成图像栈。

## 核心概念

### 从U-Net到Transformer

- **DiT** (Peebles & Xie, 2023) — 用ViT风格的Transformer替换U-Net，在潜在patch上操作。通过自适应层归一化（AdaLN）条件化。
- **MMDiT** (SD3, Esser et al., 2024) — 文本和图像token有独立权重的两个流，共享联合注意力。
- **FLUX** (Black Forest Labs, 2024) — 前N个块双流如SD3，后面的块拼接并共享权重（单流），在更高深度时更高效。
- **Z-Image** (2025) — 6B参数的高效单流DiT，挑战"规模至上"。

### 整流流一段话介绍

DDPM将前向过程定义为嘈杂的SDE，`x_t`逐渐被破坏。学习的反向是第二个SDE，通过1000个小步求解。

整流流定义了干净数据和纯噪声之间的**直线**插值：

```
x_t = (1 - t) * x_0 + t * epsilon,     t in [0, 1]
```

训练网络预测速度`v_theta(x_t, t) = epsilon - x_0`——从干净数据到噪声的直线方向。采样时，你向后积分这个速度从噪声步向数据。得到的ODE更接近直线，所以需要更少的积分步。

SD3称之为**整流流匹配**。FLUX、Z-Image和大多数2026模型使用相同目标。典型推理：20-30 Euler步（确定性）vs旧DDPM方案的50+ DDIM步。蒸馏/turbo/schnell/LCM变体将其降到1-4步。

### AdaLN条件化

DiT通过**自适应层归一化**在时间步和类别/文本上条件化：从条件向量预测`scale`和`shift`，在LayerNorm之后应用。

```
cond -> MLP -> (scale, shift, gate)
norm(x) * (1 + scale) + shift, then residual add * gate
```

### 模型格局2026

| 模型                       | 大小 | 架构             | 许可证        |
| -------------------------- | ---- | ---------------- | ------------- |
| Stable Diffusion 3 Medium  | 2B   | MMDiT            | SAI Community |
| Stable Diffusion 3.5 Large | 8B   | MMDiT            | SAI Community |
| FLUX.1-dev                 | 12B  | 双+单流DiT       | 非商业        |
| FLUX.1-schnell             | 12B  | 相同，蒸馏       | Apache 2.0    |
| Z-Image                    | 6B   | S3-DiT           | 宽松          |
| Qwen-Image                 | ~20B | DiT + Qwen文本塔 | Apache 2.0    |

## 构建它

### 步骤1：带AdaLN的DiT块

```python
import torch
import torch.nn as nn

class AdaLNZero(nn.Module):
    def __init__(self, dim, cond_dim):
        super().__init__()
        self.norm = nn.LayerNorm(dim, elementwise_affine=False)
        self.mlp = nn.Linear(cond_dim, dim * 3)
        nn.init.zeros_(self.mlp.weight)
        nn.init.zeros_(self.mlp.bias)

    def forward(self, x, cond):
        scale, shift, gate = self.mlp(cond).chunk(3, dim=-1)
        h = self.norm(x) * (1 + scale.unsqueeze(1)) + shift.unsqueeze(1)
        return h, gate.unsqueeze(1)

class DiTBlock(nn.Module):
    def __init__(self, dim=192, heads=3, mlp_ratio=4, cond_dim=192):
        super().__init__()
        self.adaln1 = AdaLNZero(dim, cond_dim)
        self.attn = nn.MultiheadAttention(dim, heads, batch_first=True)
        self.adaln2 = AdaLNZero(dim, cond_dim)
        self.mlp = nn.Sequential(
            nn.Linear(dim, dim * mlp_ratio), nn.GELU(), nn.Linear(dim * mlp_ratio, dim),
        )

    def forward(self, x, cond):
        h, gate1 = self.adaln1(x, cond)
        a, _ = self.attn(h, h, h, need_weights=False)
        x = x + gate1 * a
        h, gate2 = self.adaln2(x, cond)
        x = x + gate2 * self.mlp(h)
        return x
```

### 步骤2：微型DiT

```python
def timestep_embedding(t, dim):
    import math
    half = dim // 2
    freqs = torch.exp(-math.log(10000) * torch.arange(half, device=t.device) / half)
    args = t[:, None].float() * freqs[None]
    return torch.cat([args.sin(), args.cos()], dim=-1)

class TinyDiT(nn.Module):
    def __init__(self, image_size=16, patch_size=2, in_channels=3, dim=96, depth=4, heads=3):
        super().__init__()
        self.patch_size = patch_size
        self.num_patches = (image_size // patch_size) ** 2
        self.patch = nn.Conv2d(in_channels, dim, kernel_size=patch_size, stride=patch_size)
        self.pos = nn.Parameter(torch.zeros(1, self.num_patches, dim))
        self.time_mlp = nn.Sequential(nn.Linear(dim, dim * 2), nn.SiLU(), nn.Linear(dim * 2, dim))
        self.blocks = nn.ModuleList([DiTBlock(dim, heads, cond_dim=dim) for _ in range(depth)])
        self.norm_out = nn.LayerNorm(dim, elementwise_affine=False)
        self.head = nn.Linear(dim, patch_size * patch_size * in_channels)

    def forward(self, x, t):
        n = x.size(0)
        x = self.patch(x).flatten(2).transpose(1, 2) + self.pos
        t_emb = self.time_mlp(timestep_embedding(t, self.pos.size(-1)))
        for blk in self.blocks:
            x = blk(x, t_emb)
        x = self.norm_out(x)
        x = self.head(x)
        return x.view(n, self.num_patches, self.patch_size, self.patch_size, -1).permute(0, 4, 1, 2, 3)
```

### 步骤3：整流流训练

```python
import torch.nn.functional as F

def rectified_flow_train_step(model, x0, optimizer, device):
    model.train()
    x0 = x0.to(device)
    n = x0.size(0)
    t = torch.rand(n, device=device)
    epsilon = torch.randn_like(x0)
    x_t = (1 - t[:, None, None, None]) * x0 + t[:, None, None, None] * epsilon
    target_velocity = epsilon - x0
    pred_velocity = model(x_t, t)
    loss = F.mse_loss(pred_velocity, target_velocity)
    optimizer.zero_grad(); loss.backward(); optimizer.step()
    return loss.item()
```

### 步骤4：Euler采样器

```python
@torch.no_grad()
def rectified_flow_sample(model, shape, steps=20, device="cpu"):
    model.eval()
    x = torch.randn(shape, device=device)
    dt = 1.0 / steps
    t = torch.ones(shape[0], device=device)
    for _ in range(steps):
        v = model(x, t)
        x = x - dt * v
        t = t - dt
    return x
```

20步。在训练好的模型上，这产生与1000步DDPM相当的样本。

## 使用它

使用FLUX / SD3：

```python
from diffusers import FluxPipeline
import torch

pipe = FluxPipeline.from_pretrained("black-forest-labs/FLUX.1-schnell", torch_dtype=torch.bfloat16).to("cuda")
out = pipe(prompt="a golden retriever surfing a tsunami", guidance_scale=0.0, num_inference_steps=4).images[0]
```

## 发布它

本课产出：

- `outputs/prompt-dit-model-picker.md` — 根据质量、延迟和许可证约束选择SD3/FLUX/Z-Image。
- `outputs/skill-rectified-flow-trainer.md` — 编写带AdaLN DiT和Euler采样的完整整流流训练循环。

## 练习

1. **(简单)** 在合成blob数据集上训练TinyDiT 500步。比较10、20和50 Euler步的样本。
2. **(中等)** 通过拼接学习的类别嵌入到时间嵌入来添加文本条件化。用类别0、5和9采样并验证颜色匹配。
3. **(困难)** 计算整流流和DDPM版本在相同数据上训练相同步数的生成样本之间的Frechet距离（FID代理）。报告哪个收敛更快。

## 关键术语

| 术语              | 人们怎么说        | 实际含义                                                        |
| ----------------- | ----------------- | --------------------------------------------------------------- |
| DiT               | "扩散Transformer" | 替换U-Net作为扩散去噪器的Transformer；在patch化的潜在空间上操作 |
| AdaLN             | "自适应层归一化"  | 通过学习的scale、shift、gate在LayerNorm后进行时间步/文本条件化  |
| MMDiT             | "多模态DiT (SD3)" | 文本和图像token有独立权重流，共享联合自注意力                   |
| 整流流            | "直线噪声到数据"  | 数据和噪声之间的线性插值；网络预测速度；推理需要更少ODE步       |
| 速度目标          | "epsilon - x_0"   | 整流流中的回归目标；从干净数据指向噪声                          |
| Schnell/turbo/LCM | "1-4步蒸馏"       | 从全质量模型蒸馏的小步变体；生产实时                            |

## 延伸阅读

- [DiT (Peebles & Xie, 2023)](https://arxiv.org/abs/2212.09748) — DiT论文
- [SD3 (Esser et al., 2024)](https://arxiv.org/abs/2403.03206) — MMDiT和大规模整流流
- [FLUX.1 model card](https://huggingface.co/black-forest-labs/FLUX.1-dev) — 双+单流细节
