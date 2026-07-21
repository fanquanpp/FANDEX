---
title: 'Vision Transformer与Patch-Token原语'
description: '深入理解ViT的Patch-Token流水线，从图像到序列token的完整转换过程'
module: multimodal
difficulty: intermediate
tags:
  - 'Vision Transformer'
  - 'Patch Token'
  - 位置编码
  - DINOv2
  - SigLIP
related:
  - 'multimodal/Show-o离散扩散统一模型'
  - multimodal/Transfusion双损失统一模型
prerequisites:
  - multimodal/多模态Agent与计算机使用
---

# Vision Transformer与Patch-Token原语

> 在任何多模态工作之前，图像必须变成Transformer可以处理的token序列。2020年的ViT论文用16x16像素patch、线性投影和位置嵌入回答了这个问题。五年后，2026年的每个前沿模型（2576px原生分辨率的Claude Opus 4.7、Gemini 3.1 Pro、Qwen3.5-Omni）仍然以此方式开始——编码器从ViT变为DINOv2再到SigLIP 2，添加了register token，位置编码方案变为2D-RoPE，但原语保持不变。本课程从头到尾阅读patch-token流水线，并用stdlib Python构建它，使Phase 12的其余部分对"视觉token"有具体的心理模型。

**类型:** 学习
**语言:** Python (stdlib, patch tokenizer + 几何计算器)
**前置知识:** Phase 7 (Transformers), Phase 4 (Computer Vision)
**时间:** ~120分钟

## 学习目标

- 将HxWx3图像转换为带有正确位置编码的patch token序列。
- 计算给定(patch size, 分辨率, 隐藏维度, 深度)的ViT的序列长度、参数量和FLOPs。
- 说出将ViT从2020年研究带到2026年生产的三个升级：自监督预训练(DINO / MAE)、register token和原生分辨率打包。
- 为下游任务在CLS pooling、mean pooling和register token之间做出选择。

## 问题

Transformer操作向量序列。文本已经是序列（字节或token）。图像是具有三个颜色通道的像素2D网格——不是序列。如果展平每个像素，一张224x224 RGB图像变成150,528个token，在该长度下的自注意力是不可行的（序列长度的二次方）。

2020年前的方法将CNN特征提取器螺栓固定在前端：ResNet产生7x7的2048维向量特征图，将这49个token喂给Transformer。这可行但继承了CNN的偏置（平移等变性、局部感受野），并失去了Transformer对规模的需求。

Dosovitskiy等人(2020)提出了直白的问题：如果我们跳过CNN会怎样？将图像分割为固定大小的patch（比如16x16像素），线性投影每个patch为向量，添加位置嵌入，将序列喂给vanilla Transformer。当时这是异端——没有卷积的视觉。在足够的数据下（JFT-300M，然后LAION），它在ImageNet上击败了ResNet并持续改进。

到2026年，ViT原语是无可争议的基础。每个开源VLM的视觉塔都是某种后代（DINOv2、SigLIP 2、CLIP、EVA、InternViT）。问题不再是"我们应该使用patch吗？"而是"什么patch大小、什么分辨率调度、什么预训练目标、什么位置编码。"

## 概念

### Patch作为token

给定形状为`(H, W, 3)`的图像`x`和patch大小`P`，将图像切割为`(H/P) x (W/P)`个不重叠patch的网格。每个patch是`P x P x 3`的像素立方体。将每个立方体展平为`3 P^2`向量。应用形状为`(3 P^2, D)`的共享线性投影`W_E`，将每个patch映射到模型的隐藏维度`D`。

对于ViT-B/16规范配置：

- 分辨率224，patch大小16 → 网格14x14 → 196个patch token。
- 每个patch是`16 x 16 x 3 = 768`个像素值，投影到`D = 768`。
- 添加一个可学习的`[CLS]` token → 序列长度197。

patch投影在数学上等同于核大小为`P`、步幅为`P`、`D`个输出通道的2D卷积。这就是生产代码实际实现的方式——`nn.Conv2d(3, D, kernel_size=P, stride=P)`。"线性投影"框架是概念性的；卷积核框架是高效的。

### 位置嵌入

Patch没有固有的顺序——Transformer将它们视为一个包。早期ViT添加了可学习的1D位置嵌入（每个位置一个768维向量，共197个）。可行，但将模型绑定到训练分辨率：推理时如果改变网格，必须插值位置表。

现代视觉骨干使用2D-RoPE（Qwen2-VL的M-RoPE，SigLIP 2的默认值）或分解的2D位置。2D-RoPE基于patch的(行, 列)索引旋转查询和键向量，因此模型从旋转角度推断相对2D位置。无需位置表。模型在推理时处理任意网格大小。

### CLS token、池化输出和register token

图像级表示是什么？三种选择共存：

1. `[CLS]` token。在patch序列前添加一个可学习向量。经过所有Transformer块后，CLS token的隐藏状态就是图像表示。继承自BERT。原始ViT、CLIP使用。
2. Mean pool。对patch token的输出隐藏状态取平均。SigLIP、DINOv2、大多数现代VLM使用。
3. Register token。Darcet等人(2023)观察到，没有显式汇聚token训练的ViT会发展出高范数的"伪影"patch，劫持自注意力。添加4-16个可学习的register token吸收这种负载，改善密集预测质量（分割、深度）。DINOv2和SigLIP 2都附带register。

选择对下游任务很重要。CLS适合分类。对于将patch token喂入LLM的VLM，完全跳过池化——每个patch成为一个LLM输入token。Register在交接前被丢弃（它们是脚手架，不是内容）。

### 预训练：监督、对比、掩码、自蒸馏

2020年的ViT在JFT-300M上用监督分类预训练。很快被取代：

- CLIP (2021)：在4亿对上进行对比图像-文本。课程12.02。
- MAE (2021, He等人)：掩码75%的patch，重建像素。自监督，纯图像上工作。
- DINO (2021) / DINOv2 (2023)：师生自蒸馏，无标签，无标题。2023年DINOv2 ViT-g/14是最强的纯视觉骨干，是"密集特征"用例的默认选择。
- SigLIP / SigLIP 2 (2023, 2025)：使用sigmoid损失的CLIP和原生纵横比的NaFlex。2026年开源VLM（Qwen、Idefics2、LLaVA-OneVision）中的主导视觉塔。

预训练的选择决定了骨干擅长什么：CLIP/SigLIP用于与文本的语义匹配，DINOv2用于密集视觉特征，MAE作为下游微调的起点。

### 缩放定律

ViT缩放(Zhai等人 2022)确立了ViT的质量在模型大小、数据大小和计算方面遵循可预测的定律。在固定计算下：

- 更大的模型 + 更多数据 → 更好的质量。
- Patch大小是序列长度与保真度的杠杆。Patch 14（DINOv2/SigLIP SO400m的典型值）比patch 16每张图像产生更多token；更适合OCR和密集任务，速度更慢。
- 分辨率是另一个大杠杆。从224到384到512几乎总是有帮助，但FLOPs呈二次方增长。

ViT-g/14（1B参数，patch 14，分辨率224 → 256 token）和SigLIP SO400m/14（400M参数，patch 14）是2026年开源VLM的两个主力编码器。

### ViT的参数量

完整计算在`code/main.py`中。对于ViT-B/16 @ 224：

```
patch_embed = 3 * 16 * 16 * 768 + 768  =  591k
cls + pos    = 768 + 197 * 768          =  152k
block        = 4 * 768^2 (QKVO) + 2 * 4 * 768^2 (MLP) + 2 * 2*768 (LN)
             = 12 * 768^2 + 3k          =  7.1M
12 blocks    = 85M
final LN    = 1.5k
total       ≈ 86M
```

在加载检查点之前，用这种方式粗略估算每个ViT。骨干大小设定了任何下游VLM的VRAM下限。

### 2026年生产配置

2026年大多数开源VLM搭载的编码器是SigLIP 2 SO400m/14，原生分辨率(NaFlex)。它具有：

- 400M参数。
- Patch大小14，默认分辨率384 → 每张图像729个patch token。
- Mean pool用于图像级任务；所有729个patch流入LLM用于VQA。
- 4个register token，在LLM交接前丢弃。
- 2D-RoPE，带图像级缩放以支持原生纵横比。

该配置中的每个决策都可以追溯到你可以阅读的论文。

## 实践

`code/main.py`是一个patch tokenizer和几何计算器。它接收(图像H, W, patch P, 隐藏D, 深度L)并报告：

- Patching后的网格形状和序列长度。
- 合成8x8像素toy图像的token序列（遍历展平+投影路径）。
- 按patch embed、position embed、transformer block和head细分的参数量。
- 目标分辨率下每次前向传播的FLOPs。
- ViT-B/16 @ 224、ViT-L/14 @ 336、DINOv2 ViT-g/14 @ 224、SigLIP SO400m/14 @ 384的比较表。

运行它。将参数量与已发布数字匹配。调整patch大小和分辨率以感受token数量的代价。

## 输出

本课程产生`outputs/skill-patch-geometry-reader.md`。给定ViT配置(patch大小、分辨率、隐藏维度、深度)，它产生token数量、参数量和VRAM估算及理由。每当为VLM选择视觉骨干时使用此技能——它防止"token爆炸导致LLM上下文填满"的意外。

## 练习

1. 计算Qwen2.5-VL在原生1280x720输入、patch大小14时的patch-token序列长度。与仅CLS表示相比如何？

2. 1080p帧(1920x1080)在patch 14下产生多少token？30 FPS下5分钟视频，总共多少视觉token？哪种节省最多：pooling、帧采样还是token合并？

3. 用纯Python实现patch token的mean pooling。验证DINOv2输出的196个token的mean-pool与模型`forward`返回的池化嵌入匹配。

4. 阅读"Vision Transformers Need Registers"第3节(arXiv:2309.16588)。用两句话描述register吸收的伪影以及为什么它对下游密集预测很重要。

5. 修改`code/main.py`以支持patch-n'-pack：给定不同分辨率的图像列表，产生单个打包序列和块对角注意力掩码。在到达课程12.06时验证。

## 关键术语

| 术语               | 常见说法         | 实际含义                                                                 |
| ------------------ | ---------------- | ------------------------------------------------------------------------ |
| Patch              | "16x16像素方块"  | 输入图像的固定大小不重叠区域；成为一个token                              |
| Patch embedding    | "线性投影"       | 共享学习矩阵（或stride=P的Conv2d），将展平的patch像素映射到D维向量       |
| CLS token          | "Class token"    | 前置的可学习向量，其最终隐藏状态代表整个图像；2026年可选                 |
| Register token     | "Sink token"     | 额外的可学习token，吸收ViT在预训练期间产生的高范数注意力伪影             |
| Position embedding | "位置信息"       | 使序列顺序感知的逐位置向量或旋转；2D-RoPE是现代默认值                    |
| Grid               | "Patch网格"      | 给定分辨率和patch大小的(H/P) x (W/P) 2D patch数组                        |
| NaFlex             | "原生灵活分辨率" | SigLIP 2特性：单一模型服务多种纵横比和分辨率，无需重新训练               |
| Backbone           | "视觉塔"         | 预训练的图像编码器，其patch-token输出喂给VLM中的LLM                      |
| Pooling            | "图像级摘要"     | 将patch token转为一个向量的策略：CLS、mean、attention pool或基于register |
| Patch 14 vs 16     | "更细vs更粗网格" | Patch 14每张图像产生更多token，OCR保真度更好，更慢；Patch 16是经典默认值 |

## 延伸阅读

- [Dosovitskiy等人 — An Image is Worth 16x16 Words (arXiv:2010.11929)](https://arxiv.org/abs/2010.11929) — 原始ViT。
- [He等人 — Masked Autoencoders Are Scalable Vision Learners (arXiv:2111.06377)](https://arxiv.org/abs/2111.06377) — MAE，自监督预训练。
- [Oquab等人 — DINOv2 (arXiv:2304.07193)](https://arxiv.org/abs/2304.07193) — 大规模自蒸馏，无标签。
- [Darcet等人 — Vision Transformers Need Registers (arXiv:2309.16588)](https://arxiv.org/abs/2309.16588) — register token和伪影分析。
- [Tschannen等人 — SigLIP 2 (arXiv:2502.14786)](https://arxiv.org/abs/2502.14786) — 2026年默认视觉塔。
- [Zhai等人 — Scaling Vision Transformers (arXiv:2106.04560)](https://arxiv.org/abs/2106.04560) — 经验缩放定律。
