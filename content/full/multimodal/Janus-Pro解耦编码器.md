---
title: 'Janus-Pro：解耦编码器统一多模态模型'
description: '理解Janus-Pro如何通过解耦视觉编码器同时优化理解和生成'
module: multimodal
difficulty: advanced
tags:
  - 'Janus-Pro'
  - 解耦编码器
  - 统一模型
  - SigLIP
  - VQ分词器
related:
  - multimodal/Flamingo与门控交叉注意力
  - multimodal/InternVL3原生多模态预训练
  - 'multimodal/LLaVA-OneVision统一模型'
  - multimodal/LLaVA与视觉指令微调
prerequisites:
  - multimodal/多模态Agent与计算机使用
---

# Janus-Pro：解耦编码器用于统一多模态模型

> 统一多模态模型有一个不可避免的张力。理解想要语义特征——SigLIP或DINOv2输出向量富含概念级信息。生成想要重建友好代码——VQ token可以组合回清晰像素。两个目标在单一编码器中不兼容。Janus (DeepSeek, 2024年10月)和Janus-Pro (DeepSeek, 2025年1月)论证修复方法是停止尝试：解耦两个编码器。在任务间共享Transformer体，但将理解路由通过SigLIP，生成路由通过VQ分词器。在7B下，Janus-Pro在GenEval上击败DALL-E 3，同时在MMMU上匹配LLaVA。本课程阅读为什么两个编码器在一个失败的地方有效。

**类型:** 构建
**语言:** Python (stdlib, 双编码器路由 + 共享体信号)
**前置知识:** Phase 12 · 13 (Transfusion), Phase 12 · 14 (Show-o)
**时间:** ~120分钟

## 学习目标

- 解释为什么单一共享编码器损害理解或生成质量。
- 描述Janus-Pro的路由：理解在输入侧使用SigLIP特征，生成在输入和输出两侧使用VQ token。
- 追踪使Janus-Pro在Janus失败处成功的数据混合缩放。
- 比较解耦(Janus-Pro)、耦合连续(Transfusion)和耦合离散(Show-o)架构。

## 问题

统一模型在理解和生成间共享Transformer体。之前的尝试(Chameleon、Show-o、Transfusion)都在两个方向使用一个视觉分词器。分词器是妥协：

- 为重建优化（生成）：VQ-VAE捕获细粒度像素细节，但产生语义一致性弱的token。
- 为语义优化（理解）：SigLIP嵌入将"猫"图像分组到"猫"token附近，但不允许良好重建。

Show-o和Transfusion在一个方向上为此付出可见的质量税。Janus-Pro问：当任务有不同需求时，为什么要求一个分词器？

## 概念

### 解耦视觉编码

Janus-Pro的架构分离两个编码器：

- 理解路径。输入图像 → SigLIP-SO400m → 2层MLP → Transformer体。
- 生成路径。输入图像（如果以现有图像为条件）→ VQ分词器 → token ID → Transformer体。
- 输出生成。Transformer预测的图像token → VQ解码器 → 像素。

Transformer体是共享的。体上游和下游的一切都是任务特定的。

输入通过prompt格式消歧：`<understand>`标签路由通过SigLIP；`<generate>`路由通过VQ。或路由从任务隐式确定。

### 为什么这有效

理解损失获得SigLIP特征，CLIP风格预训练已为语义相似性调优。模型的感知基准比Show-o / Transfusion改善，因为输入特征对任务更好。

生成损失获得VQ token，分词器已为重建调优。图像质量比Show-o改善，因为VQ代码干净地组合回像素。

共享Transformer体看到两种输入分布（SigLIP和VQ）并学会与两者工作。主张：足够数据 + 足够参数，体吸收切换。

### 数据缩放 — Janus vs Janus-Pro

Janus（原始，arXiv 2410.13848）引入了解耦但在小规模（1.3B参数，有限数据）。Janus-Pro (arXiv 2501.17811)缩放：

- 7B参数（vs 1.3B）。
- 阶段1（对齐）9000万图像-文本对，从7200万增加。
- 阶段2（统一）7200万，从2600万增加。
- 阶段3添加20万图像生成指令样本。

结果：Janus-Pro-7B在MMMU上匹配LLaVA(60.3 vs 约58)，在GenEval上击败DALL-E 3(0.80 vs 0.67)。一个开源模型，在统一谱系两侧都有竞争力。

### JanusFlow — rectified flow变体

JanusFlow (arXiv 2411.07975)将VQ生成路径替换为rectified-flow生成路径（连续）。分割变为SigLIP用于理解 + rectified-flow用于生成。质量上限进一步提升。架构保持解耦编码器共享体。

### 共享体的工作

Transformer体处理统一序列但有两种输入分布。它的工作是：

- 对于理解：消费SigLIP特征 + 文本token → 自回归发出文本。
- 对于生成：消费文本token +（可选图像VQ token）→ 自回归发出图像VQ token。

体没有每块模态特定权重。它是你期望在Qwen或Llama内部找到的文本风格Transformer，加上两个输入适配器。

有趣的是，这意味着Janus-Pro的体可以从预训练LLM初始化。Janus-Pro确实从DeepSeek-MoE-7B初始化。这个选择很重要：LLM贡献了纯从零训练的统一模型难以达到的推理能力。

### 与InternVL-U比较

InternVL-U（课程12.10）是2026年跟进。它结合了：

- 原生多模态预训练(InternVL3骨干)。
- 解耦编码器路由(SigLIP输入，VQ + 扩散头输出)。
- 统一理解 + 生成 + 编辑。

InternVL-U将Janus-Pro的架构选择纳入更大框架。解耦编码器思想现在是大规模统一模型的默认。

### 局限性

解耦编码器增加了架构复杂性。两个分词器要训练，两条输入路径要维护，两套失败模式。对于不需要生成的产品，Janus-Pro过度工程化——选择LLaVA家族理解模型。

对于不需要理解的产品，Janus-Pro过度资格——选择Stable Diffusion 3 / Flux模型。

对于两者都需要的产品，Janus-Pro现在是参考开源架构。

## 实践

`code/main.py`模拟Janus-Pro路由：

- 两个mock编码器：SigLIP类（产生256维语义向量）和VQ类（产生整数代码）。
- 基于任务标签选择编码器的prompt路由器。
- 共享体（替代），无论哪个编码器产生token都处理token序列。
- 从阶段1（对齐）到阶段3（指令微调）的加权采样调度切换。

打印3个示例的路由路径：图像QA、T2I、图像编辑。

## 输出

本课程产生`outputs/skill-decoupled-encoder-picker.md`。给定想要前沿质量统一生成+理解的产品，它选择Janus-Pro、JanusFlow或InternVL-U，并给出具体数据规模推荐。

## 练习

1. Janus-Pro-7B在GenEval上击败DALL-E 3。解释为什么7B开源模型可以在生成上匹配前沿专有模型但在理解上不能。

2. 实现路由函数：给定prompt文本，分类为`understand`或`generate`。你如何处理像"描述然后画出来"这样模糊的prompt？

3. JanusFlow用rectified flow替换VQ路径。Transformer体现在输出什么，损失中什么改变了？

4. 提出Janus-Pro架构可以通过再加一个解耦编码器处理的第四个任务。示例：图像分割(DINO风格)、深度(MiDaS风格)。

5. 阅读Janus-Pro第4.2节关于数据缩放。哪个数据阶段对T2I质量增益vs Janus贡献最大？

## 关键术语

| 术语           | 常见说法             | 实际含义                                                  |
| -------------- | -------------------- | --------------------------------------------------------- |
| 解耦编码       | "两个视觉编码器"     | 每个方向独立分词器或编码器：语义用于理解，重建用于生成    |
| 共享体         | "一个Transformer"    | 单一Transformer处理任一编码器输出；无模态特定权重         |
| SigLIP用于理解 | "语义特征"           | CLIP家族视觉塔提供丰富概念特征但重建差                    |
| VQ用于生成     | "重建代码"           | 干净解码回像素的向量量化token                             |
| JanusFlow      | "Rectified-flow变体" | 用连续流匹配生成头替代VQ的Janus-Pro                       |
| 路由标签       | "任务标签"           | 选择输入编码器的prompt标记(`<understand>` / `<generate>`) |

## 延伸阅读

- [Wu等人 — Janus (arXiv:2410.13848)](https://arxiv.org/abs/2410.13848)
- [Chen等人 — Janus-Pro (arXiv:2501.17811)](https://arxiv.org/abs/2501.17811)
- [Ma等人 — JanusFlow (arXiv:2411.07975)](https://arxiv.org/abs/2411.07975)
- [InternVL-U (arXiv:2603.09877)](https://arxiv.org/abs/2603.09877)
- [Dong等人 — DreamLLM (arXiv:2309.11499)](https://arxiv.org/abs/2309.11499)
