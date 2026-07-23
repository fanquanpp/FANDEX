---
title: CLIP与对比视觉语言预训练
description: 从InfoNCE到Sigmoid损失，深入理解CLIP和SigLIP的对比学习机制
module: multimodal
difficulty: intermediate
tags:
  - CLIP
  - SigLIP
  - 对比学习
  - InfoNCE
  - 零样本分类
related:
  - 'multimodal/BLIP-2与Q-Former桥接'
  - multimodal/Chameleon与早期融合
  - multimodal/ColPali视觉原生文档RAG
  - multimodal/Emu3下一token预测生成
prerequisites:
  - multimodal/多模态Agent与计算机使用
---

# CLIP与对比视觉语言预训练

> OpenAI的CLIP (2021)证明了一个足够大的单一想法可以驱动未来五年：仅使用嘈杂的网络图像-标题对和对比损失，将图像编码器和文本编码器对齐到同一向量空间。零监督标签。4亿对。产生的嵌入空间可以做零样本分类、图像-文本检索，并插入每个2026年VLM作为其视觉塔。SigLIP 2 (2025)用sigmoid替换了softmax，以更低成本超越了CLIP。本课程从InfoNCE到sigmoid成对损失的数学推导，并用stdlib Python构建训练步骤。

**类型:** 构建
**语言:** Python (stdlib, InfoNCE + sigmoid损失实现)
**前置知识:** Phase 12 · 01 (ViT patches), Phase 7 (Transformers)
**时间:** ~180分钟

## 学习目标

- 从互信息推导InfoNCE损失并实现数值稳定的向量化版本。
- 解释为什么sigmoid成对损失(SigLIP)可以扩展到batch 32768+而无需softmax所需的all-gather开销。
- 通过构建文本模板(`a photo of a {class}`)并取余弦相似度的argmax来运行零样本ImageNet分类。
- 说出CLIP / SigLIP预训练给你的四个杠杆：batch大小、温度、prompt模板、数据质量。

## 问题

CLIP之前的视觉是监督式的。收集标注数据集（ImageNet：120万图像，1000类），训练CNN，发布。标签昂贵，标签偏向标注者能达成一致的内容，标签不能在没有微调的情况下迁移到新任务。

图像-标题网络有超过十亿对松散标注的对可供免费使用。一张金毛猎犬的照片带有alt文本"my dog Max in the park"携带了监督信号——文本描述了图像。问题是：你能把它变成有用的训练吗？

CLIP的答案：将图像-标题对视为匹配任务。给定一批N张图像和N个标题，学习将每张图像与其自己的标题匹配，对抗N-1个干扰项。监督是"这两个东西属于一起；这N-1个不属于。"没有类标签。没有人工标注。只有对比损失。

产生的嵌入空间做的比CLIP训练的更多。ImageNet零样本有效是因为"a photo of a cat"嵌入到从未被显式标记为猫的图片附近。这是催生每个2026年VLM的赌注。

## 概念

### 双编码器

CLIP有两个塔：

- 图像编码器`f`：ViT或ResNet，每张图像输出D维向量。
- 文本编码器`g`：小型Transformer，每个标题输出D维向量。

两个塔将其输出归一化为单位长度。相似度为`cos(f(x), g(y)) = f(x)^T g(y)`，因为两者都是单位范数。

对于一批N个(图像, 标题)对，构建形状为`(N, N)`的相似度矩阵`S`：

```
S[i, j] = cos(f(x_i), g(y_j)) / tau
```

其中`tau`是可学习的温度（CLIP初始化为0.07；在log空间中学习）。

### InfoNCE损失

CLIP在行和列上使用对称交叉熵：

```
loss_i2t = CE(S, labels=identity)     # 每张图像的正样本是其自己的标题
loss_t2i = CE(S^T, labels=identity)   # 每个标题的正样本是其自己的图像
loss = (loss_i2t + loss_t2i) / 2
```

这就是InfoNCE。CE中的softmax强制每张图像比批次中每个其他标题更匹配其标题。"负样本"是所有其他批次项。更大的batch = 更多负样本 = 更强信号。CLIP在batch 32k训练；规模很重要。

### 温度

`tau`控制softmax的锐度。低tau → 尖锐分布，硬负样本挖掘效应。高tau → 柔和，所有样本都有贡献。CLIP学习log(1/tau)，裁剪以防止崩溃。SigLIP 2固定初始tau并使用可学习偏置。

### 为什么sigmoid扩展更好(SigLIP)

Softmax需要整个相似度矩阵同步。在分布式训练中，你必须将每个嵌入all-gather到每个副本，然后做softmax。这在通信方面是世界大小的二次方。

SigLIP用逐元素sigmoid替换softmax：对于每对`(i, j)`，损失是"这些是匹配对吗？"的二分类。正类标签是对角线，其他都是负的。损失是：

```
L = -1/N sum over (i, j) [ y_ij log sigmoid(S[i,j]) + (1-y_ij) log sigmoid(-S[i,j]) ]
```

`y_ij = 1`如果`i == j`，否则为0。每对的损失是独立的。不需要all-gather。每个GPU计算其本地块并求和。SigLIP 2可以廉价地扩展到batch 32k-512k，而CLIP需要按比例更多的通信。

### 零样本分类

给定N个类名，为每个类构建文本模板：

```
"a photo of a {class}"
```

用文本编码器嵌入每个模板。用图像编码器嵌入你的图像。Argmax余弦相似度 = 预测类别。无需在目标类上训练。

Prompt模板很重要。CLIP原始论文每个类使用80个模板（普通、艺术、照片、绘画等）并平均嵌入。+3 ImageNet点。现代用法通常选择一两个模板。

### 线性探测和微调

零样本是基线。线性探测（在冻结的CLIP特征之上训练一个线性层用于目标类）在域内任务上击败零样本。完全微调在线内域上击败线性探测，但可能损害零样本迁移。三种机制，三种权衡。

### SigLIP 2：NaFlex和密集特征

SigLIP 2 (2025)添加了：

- NaFlex：单一模型处理可变纵横比和分辨率。
- 更好的密集特征用于分割和深度估计，目标是作为VLM中的冻结骨干。
- 多语言：在100+语言上训练，而CLIP仅英语。
- 1B参数规模，而CLIP最高400M。

在2026年开源VLM中，SigLIP 2 SO400m/14是默认视觉塔。CLIP仍然是纯图像-文本检索的默认选择，其中特定的LAION-2B训练分布与你的查询模式匹配。

### ALIGN、BASIC、OpenCLIP、EVA-CLIP

ALIGN (Google, 2021)：与CLIP相同想法，18亿对规模，90%嘈杂。证明了嘈杂数据可以扩展。OpenCLIP (LAION)：在LAION-400M / 2B上的CLIP开放复现，多种规模，首选开源检查点。EVA-CLIP：从掩码图像建模初始化；VLM的强骨干。BASIC：Google的CLIP+ALIGN混合。都是同一家族，不同的数据和调优。

### 零样本上限

CLIP类模型在ImageNet零样本上上限约76%（CLIP-G、OpenCLIP-G）。超越需要更大的数据（SigLIP 2达到80%+）或架构变化（监督头、更多参数）。基准正在饱和；真正的价值是下游VLM消费的嵌入空间。

## 实践

`code/main.py`实现了：

1. 一个toy双编码器（基于哈希的图像特征，文本字符特征），这样你可以在没有numpy的情况下看到InfoNCE的形状。
2. 纯Python中的InfoNCE损失（通过log-sum-exp实现数值稳定性）。
3. Sigmoid成对损失用于比较。
4. 零样本分类例程：计算与一组文本prompt的余弦相似度，argmax用于预测。

运行它并观察损失曲线。绝对数字是toy的；形状与真实CLIP训练器发出的匹配。

## 输出

本课程产生`outputs/skill-clip-zero-shot.md`。给定一组图像（通过路径）和目标类列表，它使用CLIP模板构建文本prompt，用声明的检查点（例如`openai/clip-vit-large-patch14`）嵌入两侧，并返回top-1 / top-5预测及相似度分数。该技能拒绝就prompt列表中未包含的类别做出声明。

## 练习

1. 手动实现4对batch的InfoNCE。构建4x4相似度矩阵，运行softmax，提取对角线，计算交叉熵。用你的Python实现验证此手动计算。

2. SigLIP在温度之外使用偏置参数`b`：`S'[i,j] = S[i,j]/tau + b`。当batch有大的类不平衡（每行负样本远多于正样本）时，`b`起什么作用？阅读SigLIP第3节(arXiv:2303.15343)。

3. 为猫vs狗构建零样本分类器。尝试两种prompt模板：`a photo of a {class}`和`a picture of a {class}`。在100张测试图像上测量准确率。模板集成是否击败单一模板？

4. 计算在512 GPU上batch 32k的softmaxInfoNCE vs sigmoid成对的通信成本。哪个按O(N)缩放，哪个按O(N^2)？引用SigLIP第4节。

5. 阅读OpenCLIP缩放定律论文(arXiv:2212.07143, Cherti等人)。从图表复现他们关于数据缩放的结论：在固定模型大小下，ImageNet零样本准确率与训练数据大小之间的对数线性关系是什么？

## 关键术语

| 术语        | 常见说法           | 实际含义                                                               |
| ----------- | ------------------ | ---------------------------------------------------------------------- |
| InfoNCE     | "对比损失"         | 批次相似度矩阵上的交叉熵；每个项的正样本是其配对项，负样本是其他所有项 |
| Sigmoid损失 | "SigLIP损失"       | 逐对二分类交叉熵；无softmax，无all-gather，分布式训练中扩展廉价        |
| 温度        | "tau"              | softmax/sigmoid前缩放logits的标量；控制分布的锐度                      |
| 零样本      | "无微调分类"       | 使用文本prompt构建类嵌入并通过余弦相似度分类；无需在目标类上训练       |
| Prompt模板  | "a photo of a ..." | 类名周围的文本脚手架；影响零样本准确率1-5个点                          |
| 双编码器    | "双塔"             | 一个图像编码器 + 一个文本编码器，在共享D维空间中输出                   |
| 硬负样本    | "困难干扰项"       | 与正样本足够相似的负样本，模型必须努力分离它们                         |
| 线性探测    | "冻结+一层"        | 仅在冻结特征之上训练线性分类器；衡量特征质量                           |
| NaFlex      | "原生灵活分辨率"   | SigLIP 2在不调整大小的情况下以任何纵横比和分辨率摄取图像的能力         |
| 温度缩放    | "log参数化tau"     | CLIP参数化`log(1/tau)`使梯度行为正常；裁剪以防止崩溃到接近零的tau      |

## 延伸阅读

- [Radford等人 — Learning Transferable Visual Models From Natural Language Supervision (arXiv:2103.00020)](https://arxiv.org/abs/2103.00020) — CLIP论文。
- [Zhai等人 — Sigmoid Loss for Language Image Pre-Training (arXiv:2303.15343)](https://arxiv.org/abs/2303.15343) — SigLIP。
- [Tschannen等人 — SigLIP 2 (arXiv:2502.14786)](https://arxiv.org/abs/2502.14786) — 多语言 + NaFlex。
- [Jia等人 — ALIGN (arXiv:2102.05918)](https://arxiv.org/abs/2102.05918) — 嘈杂网络数据的扩展。
- [Cherti等人 — Reproducible scaling laws for contrastive language-image learning (arXiv:2212.07143)](https://arxiv.org/abs/2212.07143) — OpenCLIP缩放定律。
