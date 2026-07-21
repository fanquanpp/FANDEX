---
title: 单目深度估计
description: '从单张2D图像估计每个像素到相机的距离。DepthAnything V2和DepthPro是2026年的生产默认。'
module: 'computer-vision'
difficulty: intermediate
tags:
  - 深度估计
  - 单目深度
  - DepthAnything
  - DepthPro
  - 3D重建
related:
  - 'computer-vision/3D高斯泼溅'
  - 'computer-vision/3D视觉与NeRF'
  - 'computer-vision/多目标跟踪'
  - 'computer-vision/关键点与姿态'
prerequisites:
  - 'computer-vision/3D高斯泼溅'
---

# 单目深度估计

> 从单张2D图像估计每个像素到相机的距离。DepthAnything V2和DepthPro是2026年的生产默认。

**类型:** 使用+构建
**语言:** Python
**前置知识:** Phase 4 Lesson 07 (U-Net), Phase 4 Lesson 14 (ViT)
**时间:** 约45分钟

## 学习目标

- 区分度量深度（绝对米数）和相对深度（近/远排序），并说明何时使用哪种
- 解释DepthAnything V2和DepthPro架构：DPT风格ViT编码器+DPT解码器
- 使用预训练深度模型进行3D效果、背景虚化和场景理解
- 评估深度估计：相对深度用SILog，度量深度用AbsRel

## 问题所在

3D视觉需要深度——每个像素到相机的距离。立体相机、LiDAR和ToF传感器直接测量深度，但大多数照片是单目的。从单张2D图像估计深度是欠约束的（无数3D场景投影到相同2D图像），但深度模型通过学习场景先验（天空远、地面近、物体有典型尺寸）产生合理估计。

单目深度估计在2024-2026年快速成熟。DepthAnything V2（2024）和DepthPro（Apple，2024）在零样本设置下产生令人印象深刻的相对深度图。Metric3D V2（2023）和UniDepth（2024）在相机内参已知时估计度量深度。

## 核心概念

### 相对深度 vs 度量深度

- **相对深度** — 预测近/远排序，不保证绝对尺度。适合背景虚化、3D效果、场景理解。
- **度量深度** — 预测绝对距离（米）。需要相机内参或训练时的尺度监督。适合机器人导航、3D重建、AR。

大多数生产应用使用相对深度，因为不需要相机校准。

### DPT架构

Dense Prediction Transformer（Ranftl et al., 2021）是深度估计的标准架构：

1. ViT编码器提取多尺度特征
2. 特征通过投影和上采样组合
3. 最终卷积头产生逐像素深度

DepthAnything V2使用DINOv2 ViT作为编码器，比有监督ViT产生更好的零样本深度。

### 评估指标

- **AbsRel** — 绝对相对误差：`mean(|d_pred - d_gt| / d_gt)`。度量深度标准。
- **SILog** — 尺度不变对数误差：`sqrt(mean((log d_pred - log d_gt)^2) - (mean(log d_pred - log d_gt))^2)`。相对深度标准。
- **delta < 1.25** — 预测在真实值的1.25倍以内的像素比例。越高越好。

### 深度的应用

- **背景虚化** — 用深度图模拟浅景深
- **3D效果** — 从单张图像创建3D视差效果
- **场景理解** — 识别前景/背景、可通行区域
- **3D重建** — 与NeRF/3DGS组合从单张图像创建3D模型
- **机器人** — 导航和避障

## 构建它

### 步骤1：使用DepthAnything V2

```python
from transformers import AutoImageProcessor, AutoModelForDepthEstimation
import torch
from PIL import Image

processor = AutoImageProcessor.from_pretrained("depth-anything/Depth-Anything-V2-Small-hf")
model = AutoModelForDepthEstimation.from_pretrained("depth-anything/Depth-Anything-V2-Small-hf")

image = Image.open("photo.jpg")
inputs = processor(images=image, return_tensors="pt")

with torch.no_grad():
    outputs = model(**inputs)
    predicted_depth = outputs.predicted_depth

depth = processor.post_process_depth(outputs, [image.size[::-1]])[0]["predicted_depth"]
```

### 步骤2：深度到3D效果

```python
import numpy as np

def depth_to_3d_effect(image, depth_map, shift=10):
    """从深度图创建3D视差效果"""
    h, w = depth_map.shape
    depth_norm = (depth_map - depth_map.min()) / (depth_map.max() - depth_map.min() + 1e-6)
    img = np.array(image)
    shifted = np.zeros_like(img)
    for y in range(h):
        for x in range(w):
            dx = int(depth_norm[y, x] * shift)
            new_x = min(x + dx, w - 1)
            shifted[y, new_x] = img[y, x]
    return shifted
```

## 使用它

生产深度模型选择：

- **DepthAnything V2 Small** — 快速，相对深度，移动端
- **DepthAnything V2 Large** — 高质量，相对深度
- **DepthPro** — Apple，高分辨率，相对深度
- **Metric3D V2** — 度量深度，需要相机内参
- **UniDepth V2** — 度量深度，通用

## 发布它

本课产出：

- `outputs/prompt-depth-model-picker.md` — 根据需求选择深度模型。
- `outputs/skill-depth-to-3d.md` — 从深度图创建3D效果和背景虚化。

## 练习

1. **(简单)** 用DepthAnything V2估计10张图像的深度。可视化深度图。
2. **(中等)** 实现背景虚化：用深度图分离前景和背景，对背景应用高斯模糊。
3. **(困难)** 用深度图作为NeRF/3DGS的初始化，从单张图像创建3D模型。

## 关键术语

| 术语       | 人们怎么说     | 实际含义                                               |
| ---------- | -------------- | ------------------------------------------------------ |
| 相对深度   | "近远排序"     | 预测像素的近/远排序，不保证绝对尺度                    |
| 度量深度   | "绝对距离"     | 预测每个像素到相机的绝对距离（米）                     |
| DPT        | "ViT深度"      | Dense Prediction Transformer，ViT编码器+密集预测解码器 |
| AbsRel     | "深度误差"     | 绝对相对误差，度量深度标准评估指标                     |
| 零样本深度 | "无需训练数据" | 在未见过的场景上直接估计深度                           |

## 延伸阅读

- [DepthAnything V2 (Yang et al., 2024)](https://arxiv.org/abs/2406.09414)
- [DepthPro (Apple, 2024)](https://arxiv.org/abs/2410.02073)
- [DPT (Ranftl et al., 2021)](https://arxiv.org/abs/2103.13413)
