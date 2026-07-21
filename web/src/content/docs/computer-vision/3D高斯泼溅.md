---
title: 3D高斯泼溅
description: 场景是数百万3D高斯的点云。每个高斯有位置、方向、缩放、不透明度和依赖视角的颜色。光栅化它们，反向传播通过光栅化，完成。
module: 'computer-vision'
difficulty: advanced
tags:
  - 3D高斯泼溅
  - 3DGS
  - 光栅化
  - 球谐函数
  - 神经渲染
related:
  - 'computer-vision/3D视觉与NeRF'
  - 'computer-vision/单目深度估计'
  - python/语法速查
  - algorithm/算法分析基础与学习路线
prerequisites: []
---

# 3D高斯泼溅

> 场景是数百万3D高斯的点云。每个高斯有位置、方向、缩放、不透明度和依赖视角的颜色。光栅化它们，反向传播通过光栅化，完成。

**类型:** 构建
**语言:** Python
**前置知识:** Phase 4 Lesson 13 (3D视觉与NeRF), Phase 4 Lesson 10 (Diffusion基础可选)
**时间:** 约90分钟

## 学习目标

- 解释为什么3D高斯泼溅在2026年取代NeRF成为照片级真实3D重建的生产默认
- 陈述每个高斯的六个参数（位置、旋转四元数、缩放、不透明度、球谐颜色、可选特征）以及每个贡献多少浮点数
- 从零实现2D高斯泼溅光栅化器，使用alpha合成，然后展示3D情况如何投影到相同循环
- 使用nerfstudio、gsplat或SuperSplat从20-50张照片重建场景

## 问题所在

NeRF将场景存储为MLP的权重。每个渲染像素是沿射线的数百次MLP查询。训练需要数小时，渲染需要数秒，权重不可编辑——如果你想移动场景中的椅子，必须重新训练。

3D高斯泼溅（Kerbl, Kopanas, Leimkühler, Drettakis, SIGGRAPH 2023）取代了这一切。场景是显式的3D高斯集合。渲染是100+ fps的GPU光栅化。训练需要几分钟。编辑是直接的：平移一部分高斯就移动了椅子。到2026年，Khronos集团已经批准了高斯泼溅的glTF扩展，OpenUSD 26.03发布了高斯泼溅模式，Zillow和Apartments.com用它们渲染房地产，大多数3D重建的新研究论文都是核心3DGS思想的变体。

心智模型很简单，数学有足够多的移动部分，大多数介绍从光栅化开始而跳过投影和球谐函数。本课构建整个东西——先2D版本，然后3D扩展。

## 核心概念

### 高斯携带什么

一个3D高斯是空间中的参数化斑点，具有以下属性：

```
position         mu         (3,)    世界坐标中心
rotation         q          (4,)    编码方向的单位四元数
scale            s          (3,)    每轴对数缩放（渲染时指数化）
opacity          alpha      (1,)    sigmoid后不透明度 [0, 1]
SH coefficients  c_lm       (3 * (L+1)^2,)   依赖视角的颜色
```

旋转+缩放构建3x3协方差：`Sigma = R S S^T R^T`。这就是高斯在3D中的形状。球谐函数让颜色随视角方向变化——高光、微妙光泽、依赖视角的发光——无需存储每视角纹理。SH度3每颜色通道16个系数，仅颜色每个高斯就有48个浮点数。

场景通常有1-5百万个高斯。每个存储约60个浮点数（3 + 4 + 3 + 1 + 48 + 杂项）。5百万高斯场景为240 MB——远小于等效的带逐点纹理的点云，比高分辨率重新渲染的NeRF MLP权重小一个数量级。

### 光栅化，不是射线行进

```mermaid
flowchart LR
    SCENE["数百万3D高斯<br/>(位置, 旋转, 缩放,<br/>不透明度, SH颜色)"] --> PROJ["投影到2D<br/>(相机外参 + 内参)"]
    PROJ --> TILES["分配到瓦片<br/>(16x16屏幕空间)"]
    TILES --> SORT["深度排序<br/>每瓦片"]
    SORT --> ALPHA["Alpha合成<br/>从前到后"]
    ALPHA --> PIX["像素颜色"]

    style SCENE fill:#dbeafe,stroke:#2563eb
    style ALPHA fill:#fef3c7,stroke:#d97706
    style PIX fill:#dcfce7,stroke:#16a34a
```

五步，全部GPU友好。没有每像素MLP查询。单张RTX 3080 Ti以147 fps渲染6百万泼溅。

### 投影步骤

世界位置`mu`、3D协方差`Sigma`的3D高斯投影到屏幕位置`mu'`、2D协方差`Sigma'`的2D高斯：

```
mu' = project(mu)
Sigma' = J W Sigma W^T J^T          (2 x 2)

W = 观察变换（相机旋转+平移）
J = mu'处透视投影的雅可比
```

2D高斯的足迹是椭圆，其轴是`Sigma'`的特征向量。椭圆内的每个像素接收高斯的贡献，权重为`exp(-0.5 * (p - mu')^T Sigma'^-1 (p - mu'))`。

### Alpha合成规则

对于一个像素，覆盖它的高斯按从后到前排序（或等价地从前到后使用反转公式）。颜色使用自1980年代以来每个半透明光栅化器相同的方程合成：

```
C_pixel = sum_i alpha_i * T_i * c_i

T_i = prod_{j < i} (1 - alpha_j)       到i的透射率
alpha_i = opacity_i * exp(-0.5 * d^T Sigma'^-1 d)   局部贡献
c_i = eval_SH(SH_i, view_direction)    依赖视角的颜色
```

这与NeRF的体渲染是**相同的方程**，只是在显式稀疏高斯集上而非沿射线的密集样本上。这个等式就是为什么渲染质量匹配NeRF——两者都在积分相同的辐射场方程。

### 为什么这是可微的

每一步——投影、瓦片分配、alpha合成、SH评估——对高斯参数都是可微的。给定真实图像，计算渲染像素损失，反向传播通过光栅化器，通过梯度下降更新所有`(mu, q, s, alpha, c_lm)`。约30,000次迭代后，高斯找到正确的位置、缩放和颜色。

### 密集化和剪枝

固定的高斯集合无法覆盖复杂场景。训练包括两个自适应机制：

- **克隆**一个梯度幅度高但缩放小的高斯到其当前位置——重建需要更多细节。
- **分裂**一个大缩放的高斯为两个较小的，当其梯度高时——一个大高斯太光滑无法拟合区域。
- **剪枝**不透明度降到阈值以下的高斯——它们没有贡献。

密集化每N次迭代运行。场景通常从约100k初始高斯（从SfM点播种）增长到训练结束时的1-5M。

### 球谐函数一段话介绍

依赖视角的颜色是单位球上的函数`c(direction)`。球谐函数是球的傅里叶基。在度`L`截断，每通道得到`(L+1)^2`个基函数。对新视角评估颜色是学习到的SH系数与在视角方向上评估的基的点积。度0 = 一个系数 = 常数颜色。度3 = 16个系数 = 足以捕获Lambertian着色、高光和轻微反射。

## 构建它

### 步骤1：2D高斯

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

def eval_2d_gaussian(means, covs, points):
    G = means.size(0)
    H, W, _ = points.shape
    flat = points.view(-1, 2)
    inv = torch.linalg.inv(covs)
    diff = flat[None, :, :] - means[:, None, :]
    d = torch.einsum("gpi,gij,gpj->gp", diff, inv, diff)
    density = torch.exp(-0.5 * d)
    return density.view(G, H, W)
```

### 步骤2：2D泼溅光栅化器

```python
def rasterise_2d(means, covs, colours, opacities, depths, image_size):
    H, W = image_size
    yy, xx = torch.meshgrid(
        torch.arange(H, dtype=torch.float32, device=means.device),
        torch.arange(W, dtype=torch.float32, device=means.device),
        indexing="ij",
    )
    points = torch.stack([xx, yy], dim=-1)

    densities = eval_2d_gaussian(means, covs, points)
    alphas = opacities[:, None, None] * densities
    alphas = alphas.clamp(0.0, 0.99)

    order = torch.argsort(depths)
    alphas = alphas[order]
    colours_sorted = colours[order]

    T = torch.ones(H, W, device=means.device)
    out = torch.zeros(H, W, 3, device=means.device)
    for i in range(means.size(0)):
        a = alphas[i]
        out += (T * a)[..., None] * colours_sorted[i][None, None, :]
        T = T * (1.0 - a)
    return out
```

### 步骤3：可训练的2D泼溅场景

```python
import math

class Splats2D(nn.Module):
    def __init__(self, num_splats=128, image_size=64, seed=0):
        super().__init__()
        g = torch.Generator().manual_seed(seed)
        H, W = image_size, image_size
        self.means = nn.Parameter(torch.rand(num_splats, 2, generator=g) * torch.tensor([W, H]))
        self.log_scale = nn.Parameter(torch.ones(num_splats, 2) * math.log(2.0))
        self.rot = nn.Parameter(torch.zeros(num_splats))
        self.colour_logits = nn.Parameter(torch.randn(num_splats, 3, generator=g) * 0.5)
        self.opacity_logit = nn.Parameter(torch.zeros(num_splats))
        self.depth = nn.Parameter(torch.rand(num_splats, generator=g))

    def covs(self):
        s = torch.exp(self.log_scale)
        c, si = torch.cos(self.rot), torch.sin(self.rot)
        R = torch.stack([torch.stack([c, -si], dim=-1), torch.stack([si, c], dim=-1)], dim=-2)
        S = torch.diag_embed(s ** 2)
        return R @ S @ R.transpose(-1, -2)

    def forward(self, image_size):
        covs = self.covs()
        colours = torch.sigmoid(self.colour_logits)
        opacities = torch.sigmoid(self.opacity_logit)
        return rasterise_2d(self.means, covs, colours, opacities, self.depth, image_size)
```

### 步骤4：拟合2D高斯到目标图像

```python
import numpy as np

def make_target(size=64):
    yy, xx = np.meshgrid(np.arange(size), np.arange(size), indexing="ij")
    img = np.zeros((size, size, 3), dtype=np.float32)
    mask = (xx - 20) ** 2 + (yy - 20) ** 2 < 10 ** 2
    img[mask] = [1.0, 0.2, 0.2]
    mask = (np.abs(xx - 45) < 8) & (np.abs(yy - 40) < 8)
    img[mask] = [0.2, 0.3, 1.0]
    return torch.from_numpy(img)

target = make_target(64)
model = Splats2D(num_splats=64, image_size=64)
opt = torch.optim.Adam(model.parameters(), lr=0.05)

for step in range(200):
    pred = model((64, 64))
    loss = F.mse_loss(pred, target)
    opt.zero_grad(); loss.backward(); opt.step()
    if step % 40 == 0:
        print(f"step {step:3d}  mse {loss.item():.4f}")
```

200步内64个高斯沉淀到两个形状中。这就是整个思想——显式几何原语上的梯度下降。

## 使用它

使用gsplat或nerfstudio进行真实3DGS：

```bash
pip install nerfstudio gsplat
ns-train splatfacto --data path/to/data
```

## 发布它

本课产出：

- `outputs/prompt-3dgs-capture-planner.md` — 一个提示，规划给定场景类型的捕获会话。
- `outputs/skill-3dgs-export-router.md` — 一个技能，根据下游查看器或引擎选择正确的导出格式。

## 练习

1. **(简单)** 在不同合成图像上运行2D泼溅训练器。改变`num_splats`为[16, 64, 256]并绘制MSE vs步数。
2. **(中等)** 扩展2D光栅化器以支持通过度2谐波依赖标量"视角角度"的每高斯RGB颜色。
3. **(困难)** 克隆nerfstudio并在20张照片捕获的场景上训练splatfacto。导出到glTF并在查看器中打开。

## 关键术语

| 术语      | 人们怎么说       | 实际含义                                                             |
| --------- | ---------------- | -------------------------------------------------------------------- |
| 3DGS      | "高斯泼溅"       | 数百万3D高斯的显式场景表示，每个有位置、旋转、缩放、不透明度、SH颜色 |
| 协方差    | "高斯的形状"     | `Sigma = R S S^T R^T`；一个高斯的方向和各向异性缩放                  |
| Alpha合成 | "从后到前混合"   | 与NeRF体渲染相同的方程，现在在显式稀疏集上                           |
| 密集化    | "克隆和分裂"     | 在重建不足的地方自适应添加新高斯                                     |
| 剪枝      | "删除低不透明度" | 移除训练中坍缩到接近零不透明度的高斯                                 |
| 球谐函数  | "依赖视角的颜色" | 球上的傅里叶基；将颜色存储为视角方向的函数                           |

## 延伸阅读

- [3D Gaussian Splatting (Kerbl et al., SIGGRAPH 2023)](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/) — 原始论文
- [gsplat (Meta/nerfstudio)](https://github.com/nerfstudio-project/gsplat) — 生产质量CUDA光栅化器
- [nerfstudio Splatfacto](https://docs.nerf.studio/nerfology/methods/splat.html) — 参考训练配方
