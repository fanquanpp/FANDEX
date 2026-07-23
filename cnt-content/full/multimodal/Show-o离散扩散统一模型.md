---
title: 'Show-o与离散扩散统一模型'
description: '理解Show-o如何用掩码离散扩散实现并行图像生成'
module: multimodal
difficulty: advanced
tags:
  - 'Show-o'
  - 掩码离散扩散
  - MaskGIT
  - 并行解码
  - 图像修复
related:
  - multimodal/MIO任意到任意流式模型
  - 'multimodal/Qwen-VL家族与动态FPS'
  - multimodal/Transfusion双损失统一模型
  - 'multimodal/Vision-Transformer与Patch-Token原语'
prerequisites:
  - multimodal/多模态Agent与计算机使用
---

# Show-o与离散扩散统一模型

> Transfusion混合连续和离散表示。Show-o (Xie等人, 2024年8月)走另一条路：文本token使用因果下一token预测，图像token使用MaskGIT精神的掩码离散扩散。两者都坐在一个带混合注意力掩码的Transformer中。结果在一个骨干上统一了VQA、文本到图像、图像修复和混合模态生成，每种模态一个分词器，一个损失公式（下一token扩展到掩码预测）。本课程讲解Show-o设计——为什么掩码离散扩散是并行的、少步图像生成器——并与Transfusion和Emu3对比。

**类型:** 学习
**语言:** Python (stdlib, 掩码离散扩散采样器)
**前置知识:** Phase 12 · 13 (Transfusion)
**时间:** ~120分钟

## 学习目标

- 解释掩码离散扩散：均匀掩码token然后让Transformer恢复它们的调度。
- 比较并行图像解码(Show-o, MaskGIT)与自回归图像解码(Chameleon, Emu3)在速度和质量上。
- 说出Show-o在一个检查点中处理的三个任务：T2I、VQA、图像修复。
- 选择掩码调度（余弦、线性、截断）并推理其对样本质量的影响。

## 问题

Transfusion的双损失训练可行但动态更棘手——连续扩散损失与离散NTP损失生活在不同数值尺度上。平衡损失权重是超参数搜索。架构有效但复杂。

Show-o的答案：保持两种模态都是离散的（像Chameleon），但通过掩码离散扩散而非顺序地并行生成图像。训练目标变成单一掩码token预测，自然推广下一token预测。

## 概念

### 掩码离散扩散(MaskGIT)

原始Chang等人(2022)的MaskGIT技巧很优雅。从完全掩码的图像开始（每个token是特殊的`<MASK>` ID）。在每步，并行预测所有掩码token，然后保留top-K最自信的预测并重新掩码其余的。约8-16次迭代后，所有token填满。每步取消掩码多少token的调度是调优过的——余弦调度效果很好。

训练很简单：从[0, 1]均匀采样掩码比例，应用到图像的VQ token上，训练Transformer恢复被掩码的。正是BERT为文本做的，扩展到图像生成。

### Show-o：一个Transformer，混合掩码

Show-o将MaskGIT放入因果语言模型Transformer中。注意力掩码是：

- 文本token：因果（标准LLM）。
- 图像token：图像块内全双向（这样掩码token在预测时可以看到其他每个图像token）。
- 文本到图像：文本关注先前图像，图像关注先前文本。

训练在以下之间交替：

1. 文本序列上的标准NTP。
2. T2I样本：文本 → 带掩码图像token的图像，掩码token预测损失。
3. VQA样本：图像 → 带掩码文本token的文本（实际上就是NTP）。

统一损失是`<MASK>` token上的交叉熵，覆盖了文本NTP（只有最后一个token是"掩码的"）和图像掩码扩散（随机子集被掩码）。

### 并行采样

Show-o在约16步而非约1000步（每token自回归）或约20步（扩散）中生成图像。每步，并行预测所有掩码token；提交top-K自信的；重复。

比较：

- Chameleon / Emu3（token自回归）：N_tokens次前向传播，通常每张图像1024-4096次。
- Transfusion（连续扩散）：约20步，每步一次完整Transformer前向传播。
- Show-o（掩码离散扩散）：约16步，每步一次完整Transformer前向传播。

Show-o在相似规模模型上比Chameleon更快，步数大致匹配Transfusion，但每步成本更低（离散词表logits vs连续MSE损失）。

### 一个检查点中的任务

Show-o在推理时支持四个任务，通过prompt格式选择：

- 文本生成：标准自回归文本输出。
- VQA：图像输入，文本输出。
- T2I：文本输入，通过掩码离散扩散输出图像。
- 图像修复：某些token被掩码的图像，填入。

图像修复能力从掩码预测训练中免费获得。掩码VQ token网格的一个区域，喂入其余部分加文本prompt，预测掩码token。

### 掩码调度

每步取消掩码多少token的调度塑造质量。Show-o推荐余弦：

```
mask_ratio(t) = cos(pi * t / (2 * T))   # t = 0..T
```

步骤0，所有token掩码（比例1.0）。步骤T，无掩码。余弦将质量集中在预测信息量最大的中程比例上。线性调度也有效但更快见顶。

### Show-o2

Show-o2（2025年跟进，arXiv 2506.15564）缩放Show-o：更大LLM基座，更好分词器，改进掩码调度。相同架构模式。

### Show-o的位置

在2026年分类法中：

- 离散token + NTP：Chameleon、Emu3。简单但推理慢。
- 离散token + 掩码扩散：Show-o、MaskGIT、LlamaGen、Muse。并行采样，仍受分词器有损限制。
- 连续 + 扩散：Transfusion、MMDiT、DiT。最高质量，更复杂训练。
- 连续 + VLM中流匹配：JanusFlow、InternVL-U。最新。

按任务选择：当你想在一个开源模型中以合理速度获得T2I + 修复 + VQA时选Show-o；当质量至关重要且你能负担双损失管道时选Transfusion。

## 实践

`code/main.py`模拟Show-o采样：

- 16个VQ token的toy网格。
- 一个mock"Transformer"，基于prompt和当前未掩码token预测logits。
- 8步余弦调度的并行掩码采样。
- 打印中间状态（掩码模式演化）和最终token。

运行它，观察掩码逐步消散。

## 输出

本课程产生`outputs/skill-unified-gen-model-picker.md`。给定需要理解(VQA, 标题生成)和生成(T2I, 修复)且受开源权重约束的产品，在Show-o家族、Transfusion/MMDiT家族和Emu3/Chameleon家族之间选择，并给出具体权衡。

## 练习

1. 掩码离散扩散在约16步中采样。为什么不是1步？如果在步骤0取消掩码一切会怎样？

2. 图像修复在掩码扩散中免费。提出一个Show-o修复击败专业模型的产品用例（真实或假设）。

3. 余弦调度vs线性调度：追踪T=8时每步取消掩码的token数。哪个更平衡？

4. 512x512 Show-o图像是1024 token。在词表K=16384下，模型发出1024 * log2(16384) = 14,336位(约1.75 KiB)数据。Stable Diffusion输出512*512\*24位 = 6,291,456位(约768 KiB)原始像素。压缩比是多少，它买了什么质量？

5. 阅读LlamaGen(arXiv:2406.06525)。LlamaGen的类条件自回归图像模型与Show-o的掩码方法有何不同？

## 关键术语

| 术语         | 常见说法        | 实际含义                                                      |
| ------------ | --------------- | ------------------------------------------------------------- |
| 掩码离散扩散 | "MaskGIT风格"   | 训练预测掩码token；推理时迭代取消掩码最自信的预测             |
| 余弦调度     | "取消掩码调度"  | 推理步骤中掩码比例的衰减；将置信增长集中在中程                |
| 并行解码     | "所有token一次" | 每步在一次前向传播中预测完整掩码token序列，然后提交top-K      |
| 混合注意力   | "因果+双向"     | 文本token间因果、图像块内双向的掩码                           |
| 图像修复     | "填入生成"      | 以某些token被掩码的图像为条件，预测缺失的；从训练目标免费获得 |
| 提交率       | "每步Top-K"     | 每次迭代声明"完成"的token数；控制推理vs质量权衡               |

## 延伸阅读

- [Xie等人 — Show-o (arXiv:2408.12528)](https://arxiv.org/abs/2408.12528)
- [Show-o2 (arXiv:2506.15564)](https://arxiv.org/abs/2506.15564)
- [Chang等人 — MaskGIT (arXiv:2202.04200)](https://arxiv.org/abs/2202.04200)
- [Sun等人 — LlamaGen (arXiv:2406.06525)](https://arxiv.org/abs/2406.06525)
- [Chang等人 — Muse (arXiv:2301.00704)](https://arxiv.org/abs/2301.00704)
