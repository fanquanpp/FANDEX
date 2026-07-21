---
title: 3D生成
description: '从NeRF到3D Gaussian Splatting，3D生成模型的核心技术与管线'
module: 'generative-ai'
difficulty: advanced
tags:
  - 3D生成
  - NeRF
  - 'Gaussian Splatting'
  - 3D重建
  - 多视角生成
related:
  - 'generative-ai/扩散模型DDPM从零开始'
  - 'generative-ai/流匹配与整流流'
  - llm/安全护栏
  - python/语法速查
prerequisites: []
---

# 3D 生成

> 2D 图像生成在 2022 年解决了。3D 生成在 2024 年开始可用。差距？3D 需要多视角一致性——从任何角度看，对象必须看起来正确。2026 年最先进的方法不是直接生成 3D，而是生成多视角图像然后用 3D 重建算法将它们融合。

**类型:** 学习
**语言:** Python
**前置知识:** Phase 8 · 07 (潜扩散), Phase 8 · 10 (视频生成)
**时间:** ~60 分钟

## 问题

3D 生成有三种输出格式：(1) 网格 (mesh)——三角形集合，游戏和渲染的标准；(2) 点云——3D 点集，LiDAR 和扫描的标准；(3) 神经场 (NeRF) 或 3D 高斯——连续 3D 表示，视图合成和编辑的标准。

核心挑战是*3D 一致性*。一个 3D 对象必须从任何角度看起来正确。2D 扩散模型只保证单视角质量。你需要一个机制确保多视角一致。

## 核心概念

**NeRF (Neural Radiance Fields)。** Mildenhall et al. (2020)。一个 MLP `f(x, y, z, d) → (RGB, σ)` 将 3D 位置 + 视角方向映射到颜色 + 密度。体渲染沿光线积分产生像素颜色。优点：照片级真实感新视角合成。缺点：渲染慢（每像素数百 MLP 评估），难以编辑。

**3D Gaussian Splatting (3D-GS)。** Kerbl et al. (2023)。用数百万个 3D 高斯（位置、协方差、颜色、不透明度）表示场景。通过可微光栅化渲染。优点：实时渲染（>100 FPS），比 NeRF 快 1000 倍。缺点：内存大（百万高斯），难以编辑。

**Score Distillation Sampling (SDS)。** Poole et al. (2022)。DreamFusion 的核心技巧：使用 2D 扩散模型的梯度优化 3D 表示。从随机视角渲染 3D 场景，用扩散模型计算图像梯度，反向传播到 3D 参数。不需要 3D 训练数据——只需要 2D 扩散模型。

**多视角生成 + 重建。** 2024-2026 年的主导范式：(1) 用多视角条件扩散模型生成一致的多视角图像，(2) 用 3D 重建算法（NeRF 或 3D-GS）从多视角图像重建 3D。比 SDS 更快，更一致。

**前馈 3D 重建。** Large Reconstruction Model (LRM), TripoSR, InstantMesh：单图像 → 3D 网格，一次前向传播。训练在数百万 3D 对象上。质量低于优化方法但速度快 100 倍。

## 3D 生成管线

2026 年典型的 3D 生成管线：

1. **文本/图像 → 多视角图像。** 使用多视角扩散模型（Zero-1-to-3+, SV3D, Instant3D）从文本或单图像生成 4-6 个一致视角。
2. **多视角图像 → 3D 表示。** 使用前馈重建（LRM, TripoSR）或优化重建（NeRF/3D-GS + SDS）。
3. **3D 表示 → 网格。** 从 NeRF/3D-GS 提取网格（Marching Cubes, Poisson 重建）。
4. **纹理映射。** 将多视角图像投影到网格上创建纹理贴图。

## 动手构建

`code/main.py` 实现了一个玩具 3D 生成管线：从 2D 投影重建 3D 点云。

### 步骤 1：3D 到 2D 投影

```python
def project_3d_to_2d(points_3d, camera_angle):
    # Simple rotation + orthographic projection
    cos_a, sin_a = math.cos(camera_angle), math.sin(camera_angle)
    x_2d = points_3d[0] * cos_a + points_3d[2] * sin_a
    y_2d = points_3d[1]
    depth = -points_3d[0] * sin_a + points_3d[2] * cos_a
    return x_2d, y_2d, depth
```

### 步骤 2：多视角重建

```python
def reconstruct_from_views(views, camera_angles):
    # Triangulate 3D points from multiple 2D views
    points_3d = []
    for i in range(len(views[0])):
        # Simple triangulation from two views
        x1, y1 = views[0][i]
        x2, y2 = views[1][i]
        # Back-project to 3D
        z = (x1 * math.sin(camera_angles[1]) - x2 * math.sin(camera_angles[0])) / \
            (math.cos(camera_angles[0]) * math.sin(camera_angles[1]) - math.cos(camera_angles[1]) * math.sin(camera_angles[0]))
        x = (x1 - z * math.sin(camera_angles[0])) / math.cos(camera_angles[0])
        y = y1
        points_3d.append([x, y, z])
    return points_3d
```

### 步骤 3：SDS 损失（概念）

```python
def sds_loss(rendered_image, diffusion_model, t, text_embedding):
    # Add noise to rendered image
    x_t = add_noise(rendered_image, t)
    # Predict noise with diffusion model conditioned on text
    eps_hat = diffusion_model(x_t, t, text_embedding)
    # SDS gradient: move rendered image toward diffusion model's expectation
    grad = (eps_hat - noise) * (1 / (1 - alpha_bar_t))
    return grad
```

## 常见陷阱

- **Janus 问题。** 多面问题——生成的 3D 对象从背面看也有正面特征。修复：多视角条件化，背面惩罚。
- **SDS 过平滑。** SDS 损失产生过度平滑的结果。修复：增加引导尺度，使用多视角 SDS，或切换到多视角生成 + 重建。
- **纹理模糊。** 从 NeRF/3D-GS 提取的纹理通常模糊。修复：纹理超分辨率，或直接从多视角图像烘焙纹理。
- **尺度不一致。** 生成的 3D 对象尺度不一致。修复：归一化到单位球，或使用参考尺度。
- **拓扑错误。** 重建的网格有非流形边、自交叉。修复：后处理（网格修复），或使用隐式表示。

## 实际应用

| 任务           | 推荐方法                         |
| -------------- | -------------------------------- |
| 文本到 3D 对象 | Tripo3D / Meshy / Luma Gen-3D    |
| 单图像到 3D    | TripoSR / InstantMesh / CRM      |
| 多视角到 3D    | 3D-GS 优化 / LRM                 |
| 室内场景重建   | 3D-GS + 多视角输入               |
| 3D 编辑        | GaussianEditor / GaussCtrl       |
| 3D 动画        | 3D-GS + 骨骼绑定 / Deformable GS |

## 交付物

保存 `outputs/skill-3d-generator.md`。技能接收 3D 生成需求（输出格式、质量、速度），输出：管线选择、模型配置和后处理步骤。

## 练习

1. **简单。** 运行 `code/main.py`，从 2 个视角重建 3D 点云。添加第 3 个视角，观察重建质量改善。
2. **中等。** 实现 SDS 优化循环：从随机 3D 高斯开始，用 2D 扩散模型梯度优化。观察 3D 形状如何收敛。
3. **困难。** 用 Gradio 设置 TripoSR 推理：上传图像 → 生成 3D 网格 → 交互式 3D 预览。评估生成质量。

## 关键术语

| 术语       | 人们怎么说     | 实际含义                           |
| ---------- | -------------- | ---------------------------------- |
| NeRF       | "神经辐射场"   | MLP 表示 3D 场景，体渲染产生图像。 |
| 3D-GS      | "3D 高斯"      | 数百万 3D 高斯，可微光栅化渲染。   |
| SDS        | "分数蒸馏"     | 用 2D 扩散模型梯度优化 3D 表示。   |
| 多视角生成 | "多角度图像"   | 生成一致的多视角图像用于 3D 重建。 |
| LRM        | "大型重建模型" | 单图像 → 3D 网格的前馈模型。       |
| Janus 问题 | "多面问题"     | 生成的 3D 对象背面也有正面特征。   |

## 生产笔记：3D 生成的计算成本

3D 生成是计算最密集的生成任务之一：

| 方法                   | 典型时间 (A100) | 质量 |
| ---------------------- | --------------- | ---- |
| SDS 优化 (DreamFusion) | 5-30 分钟       | 中等 |
| 多视角 + 3D-GS 优化    | 1-5 分钟        | 高   |
| 前馈 (TripoSR)         | 1-10 秒         | 中等 |
| 混合 (前馈 + 精修)     | 30-60 秒        | 高   |

生产部署通常使用前馈模型作为初始结果，然后可选地用优化精修。实时应用（游戏、AR）需要前馈模型；离线应用（电影、建筑）可以使用优化。

## 延伸阅读

- [Mildenhall et al. (2020). NeRF: Representing Scenes as Neural Radiance Fields for View Synthesis](https://arxiv.org/abs/2003.08934) — NeRF。
- [Kerbl et al. (2023). 3D Gaussian Splatting for Real-Time Radiance Field Rendering](https://arxiv.org/abs/2308.04079) — 3D-GS。
- [Poole et al. (2022). DreamFusion: Text-to-3D using 2D Diffusion](https://arxiv.org/abs/2209.14988) — SDS。
- [Hong et al. (2023). LRM: Large Reconstruction Model for Single Image to 3D](https://arxiv.org/abs/2311.04400) — LRM。
- [Tang et al. (2024). TripoSR: Fast 3D Object Reconstruction from a Single Image](https://arxiv.org/abs/2403.02151) — TripoSR。
