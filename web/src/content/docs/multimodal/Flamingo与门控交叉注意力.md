---
title: Flamingo与门控交叉注意力
description: 理解Flamingo如何通过门控交叉注意力实现少样本多模态推理
module: multimodal
difficulty: advanced
tags:
  - Flamingo
  - 门控交叉注意力
  - 'Perceiver Resampler'
  - 少样本学习
  - 交错输入
related:
  - multimodal/ColPali视觉原生文档RAG
  - multimodal/Emu3下一token预测生成
  - multimodal/InternVL3原生多模态预训练
  - 'multimodal/Janus-Pro解耦编码器'
prerequisites:
  - multimodal/多模态Agent与计算机使用
---

# Flamingo与门控交叉注意力用于少样本VLM

> DeepMind的Flamingo (2022)在其他任何人之前做了两件事。它展示了单一模型可以处理任意交错的图像、视频和文本序列。它展示了VLM可以上下文内学习——给出一个包含三个示例(图像, 标题)对的少样本prompt，模型无需任何梯度步骤就能为新图像生成标题。机制是：门控交叉注意力层，插入冻结LLM的现有层之间，带有可学习的tanh门，初始化为零以保持LLM在初始化时的文本能力。本课程讲解Flamingo的Perceiver resampler和门控交叉注意力架构——Gemini交错输入和Idefics2视觉token的先驱。

**类型:** 学习
**语言:** Python (stdlib, 门控交叉注意力 + Perceiver resampler demo)
**前置知识:** Phase 12 · 03 (BLIP-2 Q-Former)
**时间:** ~120分钟

## 学习目标

- 解释门控交叉注意力如何通过tanh(gate) = 0在初始化时保持冻结LLM的文本能力。
- 梳理Perceiver resampler：N个图像patch → K个固定"潜在"查询通过交叉注意力。
- 描述Flamingo如何使用尊重图像位置的因果掩码处理交错图像-文本序列。
- 复现少样本多模态prompt结构（3个图像-标题示例然后一个查询图像）。

## 问题

BLIP-2将32个视觉token喂入冻结LLM的输入层。适用于每prompt一张图像。但如果你想喂入*多张*与文本交错的图像，如"这是图像A，描述它；这是图像B，描述它；现在这是图像C，描述它"？LLM的自注意力需要在单个流中处理图像token和文本token，哪些位置可以关注哪些图像的问题变得棘手。

Flamingo的答案：完全不改变LLM的输入流。在现有LLM块之间插入额外的交叉注意力层。文本token仍然像往常一样流经LLM的因果自注意力。每隔几个LLM块，文本token还通过新的门控层交叉关注图像特征。门（初始化为零）意味着在步骤零新层是无操作——模型行为完全像预训练LLM。随着训练进行，门打开，视觉信息开始流动。

Flamingo回答的第二个问题：你如何处理每个prompt可变数量的图像（0、1或多）？Perceiver resampler——一个小的交叉注意力模块，无论你有多少patch都产生固定数量的视觉潜在token。LLM交叉注意力层无论prompt中有多少图像都看到相同的形状。

## 概念

### 冻结LLM

Flamingo从冻结的Chinchilla 70B LLM开始。所有70B权重不变。现有文本自注意力和FFN正常运行。

### Perceiver resampler

对于prompt中的每张图像，ViT产生N个patch token。Perceiver resampler有K个固定可学习潜在向量（Flamingo使用K=64）。每个resampler块是两个子步骤：

1. 交叉注意力：K个潜在向量关注N个patch token（Q来自潜在向量，K/V来自patch）。
2. 潜在向量内的自注意力 + FFN。

6个resampler块后，输出是K=64个dim 1024的视觉token，无论ViT产生了多少patch。224x224图像（196个patch）和480x480图像（900个patch）都输出为64个resampler token。

对于视频，resampler按时间应用：每帧的patch产生64个潜在向量，时间位置编码让模型区分t=0和t=N。完整视频变为T \* 64个视觉token。

### 门控交叉注意力

在冻结LLM的每M层之间（Flamingo使用M=4），插入新的门控交叉注意力块：

```
x_after_llm_block = llm_block(x_before)
cross = cross_attn(x_after, resampler_output)
gated = tanh(alpha) * cross + x_after
x_before_next_block = gated
```

- `alpha`是初始化为零的可学习标量。
- `tanh(0) = 0`，所以初始化时门控分支贡献为零。
- 随着`alpha`偏离零，交叉注意力贡献平滑增长。
- 残差连接意味着即使完全打开的门也不会覆盖LLM的文本表示；它只是在上面添加视觉信息。

这是Flamingo中最重要的设计选择：视觉条件是加性的、门控的、初始化时为零。步骤0的Flamingo在纯文本输入上是完美的Chinchilla 70B。

### 交错输入的掩码交叉注意力

在像"<图像A> 标题A <图像B> 标题B <图像C> ?"这样的prompt中，每个文本token只应看到序列中在它之前的图像。交叉注意力掩码强制：位置`t`的文本token只关注图像索引`i < i_t`的图像resampler token，其中`i_t`是位置`t`之前最近的图像。"只看到最后的前置图像"或"看到所有前置图像"都是有效选择；Flamingo选择了前者。

### 上下文内少样本学习

Flamingo prompt看起来像：

```
<image1> A photo of a cat. <image2> A photo of a dog. <image3> A photo of a
```

模型看到补全模式并输出"bird"（或image3显示的任何内容）。无需梯度步骤。冻结LLM的上下文内学习能力通过门控交叉注意力传递——这是论文的重点和为什么它重要。

### 训练数据

Flamingo在三个数据集上训练：

1. MultiModal MassiveWeb (M3W)：4300万个带有交错图像和文本的网页，重建阅读顺序。
2. 图像-文本对(ALIGN + LTIP)：44亿对。
3. 视频-文本对(VTP)：2700万个短视频片段。

OBELICS (2023)是交错网络语料库的开放复现，Idefics、Idefics2和大多数开放"Flamingo类"模型在其上训练。

### OpenFlamingo和Otter

OpenFlamingo (2023)是开放复现。架构相同（Perceiver resampler + 冻结LLaMA或MPT上的门控交叉注意力）。3B、4B、9B检查点。由于较小的基座LLM和较少数据，质量落后于Flamingo。

Otter (2023)在OpenFlamingo基础上使用MIMIC-IT（多模态指令数据集）进行指令微调，展示门控交叉注意力也适用于指令遵循。

### 后代

- Idefics / Idefics2 / Idefics3：Hugging Face的门控交叉注意力谱系，逐步简化（Idefics2放弃了resampler，转而使用带自适应池化的直接patch token）。
- Flamingo到Chameleon过渡：到2024年许多团队转向早期融合（课程12.11）；Flamingo风格门控交叉注意力在需要骨干冻结的生产中仍然存在。
- Gemini的交错输入：概念上继承了Flamingo的交错格式灵活性，尽管确切机制是专有的。

### 与BLIP-2的比较

|                | BLIP-2             | Flamingo                   |
| -------------- | ------------------ | -------------------------- |
| 视觉桥接       | 输入层一次Q-Former | 每M层门控交叉注意力        |
| 视觉token      | 每张图像32个       | 每张图像每交叉注意力层64个 |
| 冻结LLM        | 是                 | 是                         |
| 少样本上下文内 | 弱                 | 强——论文的核心             |
| 交错输入       | 无原生支持         | 是，设计目标               |
| 训练数据       | 1.3亿对            | 13亿对 + 4300万交错页面    |
| 参数量         | 训练188M           | 训练约10B（交叉注意力层）  |
| 计算           | 8块A100上数天      | 数千块TPUv4上数周          |

预算有限的单图像VQA选BLIP-2。交错、少样本或多图像推理选Flamingo/Idefics2。

## 实践

`code/main.py`演示了：

1. 36个假patch token上的Perceiver resampler，8个可学习潜在向量（纯Python交叉注意力）。
2. 门控交叉注意力步骤，`alpha = 0` → 输出等于输入（LLM不变），然后`alpha = 2.0` → 视觉贡献混入。
3. 交错掩码构建器，为"(图像1) (文本1) (图像2) (文本2)"序列产生2D注意力掩码。

## 输出

本课程产生`outputs/skill-gated-bridge-diagnostic.md`。给定开源VLM的配置（resampler Y/N、交叉注意力频率、门方案），它识别Flamingo谱系元素并解释冻结策略。用于调试为什么微调降低了文本性能（答案：门开得太快）。

## 练习

1. 计算Flamingo-9B的视觉参数量：9B LLM + 1.4B门控交叉注意力层 + 64M resampler。训练参数占总参数的比例是多少？

2. 在PyTorch中实现门控残差`y = tanh(alpha) * cross + x`。实验证明`alpha=0`时，`y==x`在初始化时精确成立。

3. 阅读OpenFlamingo第3.2节(arXiv:2308.01390)关于当每个prompt有不同图像数量时如何处理batch中的多图像。描述填充策略。

4. 为什么Flamingo的交叉注意力掩码让文本token只关注*最近的*前置图像而非所有前置图像？阅读Flamingo论文第2.4节并解释权衡。

5. 上下文内少样本：为新Flamingo变体构建4个"图像 → 主要对象颜色"示例的prompt。描述当你将示例数从0变到8时的预期准确率模式。

## 关键术语

| 术语                | 常见说法             | 实际含义                                                  |
| ------------------- | -------------------- | --------------------------------------------------------- |
| Perceiver resampler | "固定潜在交叉注意力" | 从可变数量输入patch产生K个固定token的模块                 |
| 门控交叉注意力      | "Tanh门控桥接"       | 残差层`y = tanh(alpha)*cross + x`，可学习alpha，初始化为0 |
| 交错输入            | "混合序列"           | 图像和文本按阅读顺序自由混合的prompt格式                  |
| 冻结LLM             | "无LLM梯度"          | 文本LLM的权重不更新；仅resampler + 交叉注意力层训练       |
| 少样本              | "上下文内示例"       | 在prompt中给出几个(图像, 答案)对；模型无需微调即可泛化    |
| OBELICS             | "交错网络语料库"     | 1.41亿个按阅读顺序排列图像和文本的网页开放数据集          |
| Chinchilla          | "70B冻结基座"        | Flamingo的冻结文本LLM，来自DeepMind的Chinchilla论文       |
| 门调度              | "alpha如何移动"      | 训练期间交叉注意力门打开的速率                            |
| 交叉注意力频率      | "每M层"              | 门控交叉注意力块插入的频率；Flamingo使用M=4               |
| OpenFlamingo        | "开放复现"           | MosaicML/LAION在3-9B的开放检查点；架构与Flamingo相同      |

## 延伸阅读

- [Alayrac等人 — Flamingo (arXiv:2204.14198)](https://arxiv.org/abs/2204.14198) — 原始论文。
- [Awadalla等人 — OpenFlamingo (arXiv:2308.01390)](https://arxiv.org/abs/2308.01390) — 开放复现。
- [Laurencon等人 — OBELICS (arXiv:2306.16527)](https://arxiv.org/abs/2306.16527) — 交错网络语料库。
- [Jaegle等人 — Perceiver IO (arXiv:2107.14795)](https://arxiv.org/abs/2107.14795) — 通用Perceiver架构。
- [Li等人 — Otter (arXiv:2305.03726)](https://arxiv.org/abs/2305.03726) — 指令微调的Flamingo后代。
- [Laurencon等人 — Idefics2 (arXiv:2405.02246)](https://arxiv.org/abs/2405.02246) — Flamingo方法的现代简化。
