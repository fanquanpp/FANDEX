---
title: 视觉Transformer
description: '图像是patch的网格,句子是token的网格,同一个transformer可以处理两者'
module: 'deep-learning'
difficulty: intermediate
tags:
  - ViT
  - 视觉Transformer
  - 图像分类
  - DINOv2
  - patch
related:
  - 'deep-learning/迷你框架'
  - 'deep-learning/权重初始化'
  - 'deep-learning/损失函数'
  - 'deep-learning/缩放定律'
prerequisites:
  - 'deep-learning/深度学习概述'
---

# 视觉Transformer (ViT)

> 图像是patch的网格。句子是token的网格。同一个transformer可以处理两者。

**类型:** 构建
**语言:** Python
**前置知识:** 阶段7 · 05(完整Transformer), 阶段4 · 03(CNN), 阶段4 · 14(视觉Transformer入门)
**预计时间:** ~45分钟

## 问题所在

2020年之前,计算机视觉意味着卷积。ImageNet、COCO和检测基准上的每个SOTA都使用CNN骨干。Transformer是用于语言的。

Dosovitskiy et al. (2020)——"An Image is Worth 16x16 Words"——表明你可以完全放弃卷积。将图像切成固定大小的patch,线性投影每个patch到嵌入中,将序列送入普通transformer编码器。在足够规模下(ImageNet-21k预训练或更大),ViT匹配或击败基于ResNet的模型。

ViT是2026年更广泛模式的开始:一种架构,多种模态。Whisper将音频token化。ViT将图像token化。机器人的动作token。视频的像素token。Transformer不在乎——给它一个序列,它就学习。

到2026年,ViT及其后代(DeiT, Swin, DINOv2, ViT-22B, SAM 3)占据了视觉的大部分。CNN仍在边缘设备和延迟敏感任务上获胜。其他一切在栈中都有ViT。

## 核心概念

### 步骤1 — 分块

将 `H × W × C` 图像拆分为 `N × (P·P·C)` 的扁平patch序列。典型设置: `224 × 224` 图像, `16 × 16` patch → 196个768值的patch。

```
image (224, 224, 3) → 14 × 14 的 16x16x3 patch 网格 → 196 个长度768的向量
```

Patch大小是杠杆。更小的patch = 更多token,更好分辨率,二次注意力成本。更大的patch = 更粗糙,更便宜。

### 步骤2 — 线性嵌入

单个学习矩阵将每个扁平patch投影到 `d_model`。等价于核大小为 `P`、步幅为 `P` 的卷积。在PyTorch中,这字面意思就是 `nn.Conv2d(C, d_model, kernel_size=P, stride=P)` — 2行实现。

### 步骤3 — 预置 `[CLS]` token,添加位置嵌入

- 预置可学习的 `[CLS]` token。其最终隐藏状态是用于分类的图像表示。
- 添加可学习的位置嵌入(ViT原始)或正弦2D(后来的变体)。
- 2024+年,RoPE扩展到2D用于位置,有时不需要显式嵌入。

### 步骤4 — 标准transformer编码器

堆叠L个 `LayerNorm → Self-Attention → + → LayerNorm → MLP → +` 块。与BERT相同。没有视觉特定的层。这是论文的教学要点。

### 步骤5 — 头

对于分类:取 `[CLS]` 隐藏状态 → 线性 → softmax。对于DINOv2或SAM,丢弃 `[CLS]`,直接使用patch嵌入。

### 重要的变体

| 模型    | 年份 | 变化                                    |
| ------- | ---- | --------------------------------------- |
| ViT     | 2020 | 原始。固定patch大小,完整全局注意力。    |
| DeiT    | 2021 | 蒸馏;仅在ImageNet-1k上可训练。          |
| Swin    | 2021 | 层级式带移位窗口。固定次二次成本。      |
| DINOv2  | 2023 | 自监督(无标签)。最佳通用视觉特征。      |
| ViT-22B | 2023 | 22B参数;缩放定律适用。                  |
| SigLIP  | 2023 | ViT + 语言对,sigmoid对比损失。          |
| SAM 3   | 2025 | 分割一切;ViT-Large + 可提示掩码解码器。 |

### 为什么花了一段时间

ViT需要*大量*数据才能匹配CNN,因为它没有CNN的归纳偏置(平移不变性、局部性)。没有>1亿标注图像或强自监督预训练,CNN在匹配计算下仍然赢。DeiT在2021年用蒸馏技巧修复了这个问题;DINOv2在2023年用自监督永久修复了它。

## 动手构建

参见 `code/main.py`。纯标准库分块 + 线性嵌入 + 健全性检查。没有训练——任何现实规模的ViT需要PyTorch和数小时GPU时间。

### 步骤1:假图像

一个24 × 24 RGB图像,表示为 `(R, G, B)` 元组的行列表。我们使用6×6 patch → 16个patch,每个108维嵌入向量。

### 步骤2:分块

```python
def patchify(image, P):
    H = len(image)
    W = len(image[0])
    patches = []
    for i in range(0, H, P):
        for j in range(0, W, P):
            patch = []
            for di in range(P):
                for dj in range(P):
                    patch.extend(image[i + di][j + dj])
            patches.append(patch)
    return patches
```

光栅顺序:跨网格的行优先。每个ViT都使用此顺序。

### 步骤3:线性嵌入

将每个扁平patch乘以随机 `(patch_flat_size, d_model)` 矩阵。验证预置 `[CLS]` 后输出形状为 `(N_patches + 1, d_model)`。

### 步骤4:计算真实ViT的参数量

打印ViT-Base的参数量: 12层, 12头, d=768, patch=16。与ResNet-50(~25M)比较。ViT-Base约86M。ViT-Large约307M。ViT-Huge约632M。

## 实际应用

```python
from transformers import ViTImageProcessor, ViTModel
import torch
from PIL import Image

processor = ViTImageProcessor.from_pretrained("google/vit-base-patch16-224-in21k")
model = ViTModel.from_pretrained("google/vit-base-patch16-224-in21k")

img = Image.open("cat.jpg")
inputs = processor(img, return_tensors="pt")
out = model(**inputs).last_hidden_state   # (1, 197, 768): [CLS] + 196 patches
cls_emb = out[:, 0]                       # 图像表示
```

**DINOv2嵌入是2026年图像特征的默认选择。** 冻结骨干,训练微型头。适用于分类、检索、检测、字幕。Meta的DINOv2检查点在每个非文本视觉任务上优于CLIP。

**Patch大小选择。** 小模型使用16×16(ViT-B/16)。密集预测(分割)使用8×8或14×14(SAM, DINOv2)。非常大的模型使用14×14。

## 交付成果

参见 `outputs/skill-vit-configurator.md`。该技能根据数据集大小、分辨率和计算预算为新视觉任务选择ViT变体和patch大小。

## 练习

1. **简单。** 运行 `code/main.py`。验证patch数量等于 `(H/P) * (W/P)`,扁平patch维度等于 `P*P*C`。
2. **中等。** 实现2D正弦位置嵌入——每个patch的 `row` 和 `col` 的两个独立正弦编码,拼接。将它们喂入微型PyTorch ViT,在CIFAR-10上与可学习位置嵌入比较准确率。
3. **困难。** 构建3层ViT(PyTorch),在1,000张MNIST图像上用4×4 patch训练。测量测试准确率。现在在同一1,000张图像上添加DINOv2预训练(简化:只训练编码器从掩码patch预测patch嵌入)。准确率是否提高?

## 关键术语

| 术语           | 人们怎么说               | 实际含义                                                       |
| -------------- | ------------------------ | -------------------------------------------------------------- |
| Patch          | "视觉transformer的token" | 图像 `P × P × C` 区域的像素值扁平向量。                        |
| 分块           | "切割 + 扁平化"          | 将图像切成不重叠的patch,每个扁平化为向量。                     |
| `[CLS]` token  | "图像摘要"               | 预置的可学习token;其最终嵌入是图像表示。                       |
| 归纳偏置       | "模型假设什么"           | ViT比CNN有更少的先验;需要更多数据来弥补差距。                  |
| DINOv2         | "自监督ViT"              | 使用图像增强 + 动量教师无标签训练。2026年最佳通用图像特征。    |
| SigLIP         | "CLIP的继任者"           | 用sigmoid对比损失训练的ViT + 文本编码器;在匹配计算上优于CLIP。 |
| Swin           | "窗口ViT"                | 带局部注意力 + 移位窗口的层级ViT;次二次。                      |
| Register token | "2023技巧"               | 几个额外可学习token吸收注意力汇聚;改善DINOv2特征。             |

## 延伸阅读

- [Dosovitskiy et al. (2020). An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale](https://arxiv.org/abs/2010.11929) — ViT论文。
- [Touvron et al. (2021). Training data-efficient image transformers & distillation through attention](https://arxiv.org/abs/2012.12877) — DeiT。
- [Liu et al. (2021). Swin Transformer: Hierarchical Vision Transformer using Shifted Windows](https://arxiv.org/abs/2103.14030) — Swin。
- [Oquab et al. (2023). DINOv2: Learning Robust Visual Features without Supervision](https://arxiv.org/abs/2304.07193) — DINOv2。
- [Darcet et al. (2023). Vision Transformers Need Registers](https://arxiv.org/abs/2309.16588) — DINOv2的register-token修复。
