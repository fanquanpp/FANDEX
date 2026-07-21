---
title: 图像生成GAN
description: GAN是两个网络——生成器和判别器——在对抗博弈中训练。生成器学习从噪声生成逼真图像。
module: 'computer-vision'
difficulty: advanced
tags:
  - GAN
  - 生成对抗网络
  - 图像生成
  - 判别器
  - 生成器
related:
  - 'computer-vision/图像检索'
  - 'computer-vision/图像生成Diffusion'
  - 'computer-vision/语义分割UNet'
  - 'computer-vision/自监督视觉'
prerequisites:
  - 'computer-vision/3D高斯泼溅'
---

# 图像生成GAN

> GAN是两个网络——生成器和判别器——在对抗博弈中训练。生成器学习从噪声生成逼真图像。

**类型:** 构建
**语言:** Python
**前置知识:** Phase 3 (深度学习核心), Phase 4 Lesson 03 (CNN)
**时间:** 约90分钟

## 学习目标

- 解释GAN的对抗训练框架：生成器和判别器的极小极大博弈
- 实现DCGAN架构（深度卷积GAN）并在小数据集上训练
- 诊断常见的GAN训练问题：模式崩溃、训练不稳定、判别器压倒生成器
- 理解从DCGAN到StyleGAN的演进以及每个版本的关键创新

## 问题所在

分类、检测和分割分析现有图像。生成创建新图像。应用范围从数据增强到艺术创作、图像编辑、超分辨率和域适应。

GAN（Generative Adversarial Networks，Goodfellow et al., 2014）是第一个产生视觉逼真图像的生成模型。核心思想优雅：生成器从随机噪声创建假图像，判别器尝试区分真假，两者交替训练，生成器逐渐学会产生判别器无法区分的图像。

GAN的主要替代方案——扩散模型——现在在图像质量上占主导，但GAN仍然在实时生成（单次前向传播vs数百步迭代）和特定应用（超分辨率、图像到图像翻译）中重要。

## 核心概念

### 对抗博弈

```mermaid
flowchart LR
    Z["随机噪声 z"] --> G["生成器 G"]
    G -> FAKE["假图像"]
    REAL["真实图像"] --> D["判别器 D"]
    FAKE --> D
    D --> OUT["真/假?"]

    G -.->|"希望 D 输出 '真'"| D
    D -.->|"希望正确分类"| OUT

    style Z fill:#dbeafe,stroke:#2563eb
    style G fill:#dcfce7,stroke:#16a34a
    style D fill:#fecaca,stroke:#dc2626
```

极小极大目标：

```
min_G max_D V(D, G) = E[log D(x)] + E[log(1 - D(G(z)))]

判别器 D: 最大化正确分类真假的能力
生成器 G: 最小化 D 正确识别假图像的能力
```

在纳什均衡处，D对所有输入输出0.5，G产生与真实数据不可区分的样本。

### DCGAN架构指南

DCGAN（Radford et al., 2015）确立了稳定GAN训练的架构规则：

| 规则                       | 原因                             |
| -------------------------- | -------------------------------- |
| 用步幅卷积替换池化         | 让网络学习自己的下采样           |
| 生成器用转置卷积           | 可学习的上采样                   |
| 两个网络都用批归一化       | 稳定训练（不在G输出层和D输入层） |
| 生成器用ReLU（输出用Tanh） | 避免稀疏梯度                     |
| 判别器用LeakyReLU          | 允许负值梯度流                   |

### 模式崩溃

GAN最臭名昭著的失败模式：生成器学会产生少数几种输出，判别器无法区分，训练停滞。

```
真实数据分布:     狗, 猫, 鸟, 鱼, 马, ...
模式崩溃后:       狗, 狗, 狗, 狗, 狗, ...

判别器: "看起来像真实数据" (因为狗确实在数据集中)
生成器: "太好了，继续生成狗"
```

修复方法：WGAN（Wasserstein GAN）用Earth Mover距离替换JS散度，梯度惩罚（WGAN-GP）稳定训练，谱归一化约束判别器Lipschitz常数，小批量判别让判别器看到多样性。

### 训练技巧

GAN训练以脆弱著称。稳定训练的实用技巧：

1. **判别器训练更多** — 每训练生成器1步，训练判别器5步（早期DCGAN）或1步（现代实践）
2. **标签平滑** — 真实标签用0.9而非1.0，防止过度自信
3. **噪声标签** — 偶尔翻转真假标签
4. **学习率** — 生成器和判别器使用不同学习率
5. **谱归一化** — 约束判别器的Lipschitz常数，最有效的单技巧

### 从DCGAN到StyleGAN

| 架构            | 年份 | 关键创新                   |
| --------------- | ---- | -------------------------- |
| DCGAN           | 2015 | 卷积GAN架构指南            |
| WGAN-GP         | 2017 | Wasserstein距离 + 梯度惩罚 |
| Progressive GAN | 2017 | 逐步增长分辨率             |
| StyleGAN        | 2019 | 风格注入，映射网络         |
| StyleGAN2       | 2020 | 去除伪影，路径长度正则化   |
| StyleGAN3       | 2021 | 等变生成，消除纹理粘附     |
| GigaGAN         | 2023 | 扩展到十亿参数             |

StyleGAN的关键洞察：不直接将噪声输入生成器，而是通过映射网络将噪声转换为风格向量，通过AdaIN（自适应实例归一化）注入每一层。这解耦了高级属性（姿态、身份）和低级细节（颜色、纹理）。

## 构建它

### 步骤1：生成器

```python
import torch
import torch.nn as nn

class Generator(nn.Module):
    def __init__(self, latent_dim=128, base_channels=64):
        super().__init__()
        self.latent_dim = latent_dim
        ngf = base_channels

        self.net = nn.Sequential(
            # 输入: (latent_dim, 1, 1) -> 输出: (ngf*8, 4, 4)
            nn.ConvTranspose2d(latent_dim, ngf * 8, 4, 1, 0, bias=False),
            nn.BatchNorm2d(ngf * 8),
            nn.ReLU(True),
            # (ngf*8, 4, 4) -> (ngf*4, 8, 8)
            nn.ConvTranspose2d(ngf * 8, ngf * 4, 4, 2, 1, bias=False),
            nn.BatchNorm2d(ngf * 4),
            nn.ReLU(True),
            # (ngf*4, 8, 8) -> (ngf*2, 16, 16)
            nn.ConvTranspose2d(ngf * 4, ngf * 2, 4, 2, 1, bias=False),
            nn.BatchNorm2d(ngf * 2),
            nn.ReLU(True),
            # (ngf*2, 16, 16) -> (ngf, 32, 32)
            nn.ConvTranspose2d(ngf * 2, ngf, 4, 2, 1, bias=False),
            nn.BatchNorm2d(ngf),
            nn.ReLU(True),
            # (ngf, 32, 32) -> (3, 64, 64)
            nn.ConvTranspose2d(ngf, 3, 4, 2, 1, bias=False),
            nn.Tanh(),
        )

    def forward(self, z):
        return self.net(z.view(-1, self.latent_dim, 1, 1))
```

五层转置卷积从1x1到64x64。每层空间分辨率翻倍，通道数减半。Tanh输出范围[-1, 1]。

### 步骤2：判别器

```python
class Discriminator(nn.Module):
    def __init__(self, base_channels=64):
        super().__init__()
        ndf = base_channels

        self.net = nn.Sequential(
            # (3, 64, 64) -> (ndf, 32, 32)
            nn.Conv2d(3, ndf, 4, 2, 1, bias=False),
            nn.LeakyReLU(0.2, inplace=True),
            # (ndf, 32, 32) -> (ndf*2, 16, 16)
            nn.Conv2d(ndf, ndf * 2, 4, 2, 1, bias=False),
            nn.BatchNorm2d(ndf * 2),
            nn.LeakyReLU(0.2, inplace=True),
            # (ndf*2, 16, 16) -> (ndf*4, 8, 8)
            nn.Conv2d(ndf * 2, ndf * 4, 4, 2, 1, bias=False),
            nn.BatchNorm2d(ndf * 4),
            nn.LeakyReLU(0.2, inplace=True),
            # (ndf*4, 8, 8) -> (ndf*8, 4, 4)
            nn.Conv2d(ndf * 4, ndf * 8, 4, 2, 1, bias=False),
            nn.BatchNorm2d(ndf * 8),
            nn.LeakyReLU(0.2, inplace=True),
            # (ndf*8, 4, 4) -> (1, 1, 1)
            nn.Conv2d(ndf * 8, 1, 4, 1, 0, bias=False),
        )

    def forward(self, x):
        return self.net(x).view(-1)
```

生成器的镜像：五层步幅卷积从64x64到1x1。LeakyReLU允许负值梯度流。无sigmoid——损失函数处理它。

### 步骤3：GAN损失

```python
def gan_loss_discriminator(real_pred, fake_pred, loss_type="hinge"):
    """判别器损失"""
    if loss_type == "hinge":
        real_loss = F.relu(1.0 - real_pred).mean()
        fake_loss = F.relu(1.0 + fake_pred).mean()
        return real_loss + fake_loss
    elif loss_type == "vanilla":
        real_loss = F.binary_cross_entropy_with_logits(real_pred, torch.ones_like(real_pred))
        fake_loss = F.binary_cross_entropy_with_logits(fake_pred, torch.zeros_like(fake_pred))
        return real_loss + fake_loss

def gan_loss_generator(fake_pred, loss_type="hinge"):
    """生成器损失"""
    if loss_type == "hinge":
        return -fake_pred.mean()
    elif loss_type == "vanilla":
        return F.binary_cross_entropy_with_logits(fake_pred, torch.ones_like(fake_pred))
```

Hinge损失比vanilla GAN损失更稳定，是现代GAN的标准选择。

### 步骤4：训练循环

```python
def train_gan(G, D, dataloader, epochs=50, latent_dim=128, device="cpu"):
    opt_G = torch.optim.Adam(G.parameters(), lr=2e-4, betas=(0.0, 0.99))
    opt_D = torch.optim.Adam(D.parameters(), lr=2e-4, betas=(0.0, 0.99))

    for epoch in range(epochs):
        for real_images in dataloader:
            real_images = real_images.to(device)
            batch_size = real_images.size(0)

            # --- 训练判别器 ---
            z = torch.randn(batch_size, latent_dim, device=device)
            fake_images = G(z).detach()

            real_pred = D(real_images)
            fake_pred = D(fake_images)
            d_loss = gan_loss_discriminator(real_pred, fake_pred, "hinge")

            opt_D.zero_grad()
            d_loss.backward()
            opt_D.step()

            # --- 训练生成器 ---
            z = torch.randn(batch_size, latent_dim, device=device)
            fake_images = G(z)
            fake_pred = D(fake_images)
            g_loss = gan_loss_generator(fake_pred, "hinge")

            opt_G.zero_grad()
            g_loss.backward()
            opt_G.step()

        print(f"Epoch {epoch}: D_loss={d_loss.item():.4f}, G_loss={g_loss.item():.4f}")
```

关键细节：`fake_images.detach()`在训练判别器时断开生成器的梯度图。没有它，判别器的反向传播也会更新生成器。

### 步骤5：插值和属性操作

```python
def interpolate(G, z1, z2, steps=10):
    """在两个潜向量之间线性插值"""
    weights = torch.linspace(0, 1, steps, device=z1.device).unsqueeze(1)
    z_interp = z1.unsqueeze(0) * (1 - weights) + z2.unsqueeze(0) * weights
    with torch.no_grad():
        images = G(z_interp)
    return images
```

潜空间插值是GAN最迷人的属性：在两个噪声向量之间线性插值，生成的图像平滑过渡，证明模型学到了有意义的表示。

## 使用它

对于生产GAN，使用StyleGAN2-ADA或StyleGAN3：

```python
# 使用 stylegan3 库
# pip install stylegan3

import numpy as np
import torch
from stylegan3 import dnnlib, legacy

# 加载预训练模型
network_pkl = "stylegan3-r-ffhq-1024x1024.pkl"
with dnnlib.util.open_url(network_pkl) as f:
    G = legacy.load_network_pkl(f)['G_ema'].to(device)

# 生成图像
z = torch.randn([1, G.z_dim], device=device)
c = None  # 无类别标签
img = G(z, c)
```

StyleGAN3解决了"纹理粘附"问题——生成的纹理固定在像素坐标而非物体表面。这对动画和3D应用至关重要。

## 发布它

本课产出：

- `outputs/prompt-gan-troubleshooter.md` — 一个提示，诊断GAN训练问题（模式崩溃、不收敛、伪影）并推荐修复。
- `outputs/skill-gan-training-monitor.md` — 一个技能，跟踪GAN训练指标（D/G损失比、FID、IS）并在训练不稳定时发出警报。

## 练习

1. **(简单)** 在CIFAR-10的一个类别上训练DCGAN 50个epoch。可视化生成的图像和训练损失曲线。
2. **(中等)** 添加谱归一化到判别器。与没有谱归一化的训练比较稳定性和生成质量。
3. **(困难)** 实现WGAN-GP（Wasserstein GAN with Gradient Penalty）。用梯度惩罚替换判别器权重裁剪，比较训练稳定性和生成多样性。

## 关键术语

| 术语         | 人们怎么说       | 实际含义                                                     |
| ------------ | ---------------- | ------------------------------------------------------------ |
| GAN          | "对抗网络"       | 生成器和判别器对抗训练的生成模型                             |
| 生成器       | "造假者"         | 从随机噪声生成假图像的网络                                   |
| 判别器       | "鉴定师"         | 区分真假图像的网络                                           |
| 模式崩溃     | "只会画一种东西" | 生成器只产生少数几种输出，丧失多样性                         |
| 极小极大博弈 | "对抗训练"       | G最小化D的判别能力，D最大化判别能力                          |
| 潜空间       | "噪声空间"       | 生成器输入的随机向量空间；插值产生平滑过渡                   |
| 谱归一化     | "稳定技巧"       | 约束判别器权重矩阵的谱范数，稳定GAN训练                      |
| FID          | "生成质量"       | Frechet Inception Distance；衡量生成图像与真实图像分布的距离 |

## 延伸阅读

- [Generative Adversarial Networks (Goodfellow et al., 2014)](https://arxiv.org/abs/1406.2661) — 原始GAN论文
- [DCGAN (Radford et al., 2015)](https://arxiv.org/abs/1511.06434) — 卷积GAN架构指南
- [WGAN-GP (Gulrajani et al., 2017)](https://arxiv.org/abs/1704.00028) — 梯度惩罚稳定训练
- [StyleGAN3 (Karras et al., 2021)](https://arxiv.org/abs/2106.12423) — 等变生成，消除纹理粘附
