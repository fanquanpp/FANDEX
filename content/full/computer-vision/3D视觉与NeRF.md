---
title: 3D视觉与NeRF
description: NeRF用MLP将场景表示为连续的5D辐射场，通过体渲染从任意视角合成照片级真实图像。
module: 'computer-vision'
difficulty: advanced
tags:
  - NeRF
  - 3D视觉
  - 体渲染
  - 辐射场
  - 神经渲染
related:
  - 'computer-vision/3D高斯泼溅'
  - 'computer-vision/单目深度估计'
  - 'computer-vision/多目标跟踪'
prerequisites:
  - 'computer-vision/3D高斯泼溅'
---

# 3D视觉与NeRF

> NeRF用MLP将场景表示为连续的5D辐射场，通过体渲染从任意视角合成照片级真实图像。

**类型:** 学习+构建
**语言:** Python
**前置知识:** Phase 3 (深度学习核心), Phase 4 Lesson 01 (图像基础)
**时间:** 约75分钟

## 学习目标

- 解释NeRF的核心思想：5D辐射场（3D位置+2D视角方向）映射到颜色和密度
- 实现简化的NeRF：位置编码、MLP、体渲染
- 理解NeRF的局限性（训练慢、需要已知相机位姿）和3D Gaussian Splatting如何解决
- 使用nerfstudio进行3D重建

## 问题所在

3D视觉的核心问题：从2D图像恢复3D场景。传统方法（立体视觉、SfM、MVS）产生稀疏点云或网格，缺少细节和视图依赖效果（反射、透明）。

NeRF（Neural Radiance Fields，Mildenhall et al., 2020）用完全不同的方法：不重建显式几何，而是训练一个MLP将5D坐标（3D位置+2D视角方向）映射到颜色和密度。通过体渲染从任意视角合成图像，训练信号是2D图像。结果：照片级真实的新视角合成，包括反射、透明和视图依赖效果。

代价：训练一个场景需要数小时到数天，渲染需要秒级。3D Gaussian Splatting（下一课）在2023年解决了这个问题，但NeRF的核心思想——连续辐射场+体渲染——仍然是3D视觉的基础概念。

## 核心概念

### 5D辐射场

NeRF将场景表示为函数：

```
F: (x, y, z, theta, phi) -> (r, g, b, sigma)

(x, y, z): 3D空间位置
(theta, phi): 视角方向（球坐标）
(r, g, b): 该位置该方向的辐射颜色
sigma: 该位置的体积密度（不透明度）
```

sigma只依赖位置，不依赖视角——一个点要么有物质要么没有。颜色依赖视角——同一位置从不同方向看可能不同（反射、高光）。

### 体渲染

从辐射场渲染像素：从相机发出一条射线，沿射线采样点，累积颜色和密度：

```
C(r) = integral_{t_n}^{t_f} T(t) * sigma(t) * c(t) dt

T(t) = exp(-integral_{t_n}^{t} sigma(s) ds)  # 累积透射率
```

离散近似：

```
C(r) = sum_{i=1}^{N} T_i * alpha_i * c_i

T_i = prod_{j=1}^{i-1} (1 - alpha_j)  # 前面所有点的透射率
alpha_i = 1 - exp(-sigma_i * delta_i)  # 当前点的不透明度
```

这个积分正是alpha合成——与NeRF无关的图形学标准技术。NeRF的贡献是让这个渲染过程可微，使得从2D图像反向传播到3D场。

### 位置编码

MLP难以学习高频信号。NeRF使用位置编码将低维坐标映射到高维：

```
gamma(p) = [sin(2^0 * pi * p), cos(2^0 * pi * p), sin(2^1 * pi * p), cos(2^1 * pi * p), ...]
```

将3D位置编码到高维空间，使MLP能表示高频几何细节。没有位置编码，NeRF产生模糊的结果。

### 分层采样

NeRF使用两个MLP：粗网络和细网络。

1. 粗网络在射线上均匀采样，产生粗略的颜色和密度
2. 根据粗网络输出，在重要区域（高密度）采样更多点
3. 细网络在重新采样的点上评估

这使采样集中在有内容的区域，而非空空间。

### NeRF vs 3D Gaussian Splatting

| 属性     | NeRF            | 3DGS             |
| -------- | --------------- | ---------------- |
| 表示     | 隐式（MLP权重） | 显式（高斯点云） |
| 训练时间 | 小时级          | 分钟级           |
| 渲染速度 | 秒级            | 100+ fps         |
| 可编辑性 | 不可编辑        | 直接编辑         |
| 质量     | 照片级          | 照片级           |
| 存储     | MLP权重（小）   | 数百万高斯（中） |

3DGS在几乎所有实际方面优于NeRF，但NeRF的概念框架（连续辐射场+可微体渲染）是3DGS的理论基础。

## 构建它

### 步骤1：位置编码

```python
import torch
import torch.nn as nn
import math

class PositionalEncoding(nn.Module):
    def __init__(self, num_frequencies=10):
        super().__init__()
        self.num_frequencies = num_frequencies

    def forward(self, x):
        freqs = 2.0 ** torch.arange(self.num_frequencies, device=x.device) * math.pi
        x_scaled = x[..., None] * freqs
        return torch.cat([x_scaled.sin(), x_scaled.cos()], dim=-1).flatten(-2)
```

3D位置编码到60维（10频率 _ 2(sin/cos) _ 3坐标）。视角方向编码到24维。

### 步骤2：NeRF MLP

```python
class NeRFMLP(nn.Module):
    def __init__(self, pos_dim=60, dir_dim=24, hidden=256):
        super().__init__()
        # 位置分支
        self.pos_net = nn.Sequential(
            nn.Linear(pos_dim, hidden), nn.ReLU(),
            nn.Linear(hidden, hidden), nn.ReLU(),
            nn.Linear(hidden, hidden), nn.ReLU(),
            nn.Linear(hidden, hidden), nn.ReLU(),
        )
        # 密度+特征
        self.density_net = nn.Linear(hidden, 1)
        self.feature_net = nn.Linear(hidden, hidden)
        # 颜色分支（依赖视角方向）
        self.color_net = nn.Sequential(
            nn.Linear(hidden + dir_dim, hidden // 2), nn.ReLU(),
            nn.Linear(hidden // 2, 3), nn.Sigmoid(),
        )

    def forward(self, pos_enc, dir_enc):
        h = self.pos_net(pos_enc)
        sigma = F.softplus(self.density_net(h))
        feature = self.feature_net(h)
        color = self.color_net(torch.cat([feature, dir_enc], dim=-1))
        return color, sigma.squeeze(-1)
```

sigma使用softplus确保非负。颜色使用sigmoid确保[0,1]范围。

### 步骤3：体渲染

```python
def volume_render(rgb, sigma, depths, delta):
    """体渲染单条射线。
    rgb: (N_samples, 3)
    sigma: (N_samples,)
    depths: (N_samples,) 沿射线的深度
    delta: (N_samples,) 相邻采样点间距
    """
    alpha = 1.0 - torch.exp(-sigma * delta)
    T = torch.cumprod(1.0 - alpha + 1e-10, dim=0)
    T = torch.cat([torch.ones(1, device=alpha.device), T[:-1]])

    weights = T * alpha
    color = (weights[..., None] * rgb).sum(dim=0)
    depth = (weights * depths).sum(dim=0)
    return color, depth, weights
```

## 使用它

使用nerfstudio进行3D重建：

```bash
pip install nerfstudio
ns-download-data example
ns-train nerfacto --data path/to/images
```

nerfacto是nerfstudio的默认NeRF变体，结合了多种改进（Instant-NGP哈希编码、提案网络等），训练时间从小时级降到分钟级。

## 发布它

本课产出：

- `outputs/prompt-3d-recon-picker.md` — 一个提示，根据场景类型、输入照片数和输出需求选择3D重建方法。
- `outputs/skill-nerf-camera-setup.md` — 一个技能，规划NeRF/3DGS捕获的相机路径和拍摄策略。

## 练习

1. **(简单)** 在合成场景（单个球体）上训练简化NeRF。可视化新视角渲染结果。
2. **(中等)** 添加分层采样：先均匀采样，再根据粗网络输出重新采样。比较渲染质量。
3. **(困难)** 用Instant-NGP哈希编码替换位置编码，比较训练速度和渲染质量。

## 关键术语

| 术语        | 人们怎么说       | 实际含义                                  |
| ----------- | ---------------- | ----------------------------------------- |
| 辐射场      | "5D函数"         | 将3D位置+2D视角方向映射到颜色+密度的函数  |
| 体渲染      | "射线积分"       | 沿射线累积颜色和密度来渲染像素            |
| 位置编码    | "高频映射"       | 将低维坐标映射到高维，使MLP能学习高频细节 |
| 累积透射率  | "T值"            | 光线到达当前点前未被遮挡的概率            |
| 分层采样    | "重要区域多采样" | 在高密度区域采样更多点，提高渲染效率      |
| Instant-NGP | "快速NeRF"       | 使用多分辨率哈希编码加速NeRF训练1000倍    |

## 延伸阅读

- [NeRF (Mildenhall et al., 2020)](https://arxiv.org/abs/2003.08934) — 原始论文
- [Instant-NGP (Muller et al., 2022)](https://arxiv.org/abs/2201.05989) — 实时NeRF训练
- [nerfstudio](https://docs.nerf.studio/) — 生产NeRF工具包
