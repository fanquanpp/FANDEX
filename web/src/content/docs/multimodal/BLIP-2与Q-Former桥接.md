---
title: '从CLIP到BLIP-2：Q-Former模态桥接'
description: '理解Q-Former如何作为可训练瓶颈连接冻结视觉编码器和冻结LLM'
module: multimodal
difficulty: intermediate
tags:
  - 'BLIP-2'
  - 'Q-Former'
  - 跨注意力
  - 模态桥接
  - VLM
related:
  - multimodal/音频语言模型从Whisper到AF3
  - multimodal/长视频百万Token理解
  - multimodal/Chameleon与早期融合
  - multimodal/CLIP与对比预训练
prerequisites:
  - multimodal/多模态Agent与计算机使用
---

# 从CLIP到BLIP-2 — Q-Former作为模态桥接

> CLIP对齐了图像和文本但无法生成标题、回答问题或进行对话。BLIP-2 (Salesforce, 2023)用一个小的可训练桥接解决了这个问题：32个可学习查询向量通过交叉注意力关注冻结ViT的特征，然后直接插入冻结LLM的输入流。188M参数的桥接连接了11B LLM和ViT-g/14。到2026年每个基于适配器的VLM——MiniGPT-4、InstructBLIP、LLaVA的表亲——都是其后代。本课程阅读Q-Former的架构，解释其两阶段训练，并构建一个将视觉token喂入冻结文本解码器的toy版本。

**类型:** 构建
**语言:** Python (stdlib, 交叉注意力 + 可学习查询demo)
**前置知识:** Phase 12 · 02 (CLIP), Phase 7 (Transformers)
**时间:** ~180分钟

## 学习目标

- 解释为什么冻结视觉编码器和冻结LLM之间的可训练瓶颈在成本和稳定性上优于端到端微调。
- 实现一个交叉注意力块，其中固定数量的可学习查询关注外部图像特征。
- 梳理BLIP-2的两阶段预训练：表示(ITC + ITM + ITG)然后生成(冻结解码器的LM损失)。
- 比较Q-Former与LLaVA使用的更简单MLP投影器，并论证每种选择何时更优。

## 问题

你有一个冻结的ViT，每张图像产生256个dim 1408的patch token。你有一个冻结的7B LLM，期望dim 4096的token嵌入。显而易见的桥接——从1408到4096的线性层——可行，但将所有256个patch token喂入LLM的上下文每张图像消耗256个额外token。在32张图像的batch上，仅视觉模态就消耗8192个token。

BLIP-2的问题：你能否将256 token的图像表示压缩到更少的token（比如32个），同时保留足够的信息让LLM生成标题、回答问题和推理图像？你能否在不触碰冻结骨干的情况下训练这个桥接，使训练成本仅为桥接的参数？

答案：Q-Former。32个可学习的"查询"向量交叉关注ViT的patch token，产生32 token的视觉摘要供LLM消费。总共188M参数。在接触LLM之前用对比、匹配和生成目标训练。

## 概念

### 可学习查询

Q-Former的核心技巧：不让LLM的文本token关注图像patch，而是引入一组新的32个可学习查询向量`Q`，让*它们*关注图像patch。查询是模型的参数——它们在训练期间学习，相同的32个查询用于每张图像。

交叉注意力后，每个查询持有图像的压缩摘要——"描述主要对象"、"描述背景"、"计算对象数量"等。查询并不真正在语义标签上特化；它们学习任何使下游损失下降的编码。

### 架构

Q-Former是一个小型Transformer（12层，约100M参数），有两条路径：

1. 查询路径：32个查询向量流经自注意力（彼此之间），然后对冻结ViT的patch token进行交叉注意力，然后FFN。
2. 文本路径：类似BERT的文本编码器与查询路径共享自注意力和FFN权重。文本路径禁用交叉注意力。

训练时两条路径都运行。查询和文本通过共享自注意力交互，这意味着查询可以在需要文本的任务上条件化(ITM, ITG)。推理时用于VLM交接，只有查询流过，产生32个视觉token。

### 两阶段训练

BLIP-2分两个阶段预训练：

阶段1：表示学习（无LLM）。三个损失：

- ITC（图像-文本对比）：池化查询token和文本CLS token之间的CLIP风格对比。
- ITM（图像-文本匹配）：二分类器——这个图像-文本对是否匹配？硬负样本挖掘。
- ITG（图像条件文本生成）：文本上的因果LM头，以查询为条件。强制查询编码文本可生成的内容。

只有Q-Former训练。ViT冻结。不涉及LLM。

阶段2：生成学习。附加冻结LLM（OPT-2.7B或Flan-T5-XL等）。通过小型线性层将32个查询输出投影到LLM的嵌入维度。将它们前置到文本prompt。仅在线性投影和Q-Former上训练连接prompt + 图像 + 标题序列的LM损失。

阶段2之后，Q-Former + 投影就是完整的视觉适配器。推理时：图像 → ViT → Q-Former → 线性投影 → 前置到文本 → 冻结LLM产生输出。

### 参数经济学

BLIP-2与ViT-g/14（1.1B，冻结）+ OPT-6.7B（6.7B，冻结）+ Q-Former（188M，训练）= 总共8B，训练188M。Q-Former单独占完整堆栈参数的约2.4%。训练成本反映了这一点：少量A100上几天 vs 端到端几周。

质量：BLIP-2在零样本VQA上匹配或击败Flamingo-80B，同时小50倍。桥接有效。

### InstructBLIP和指令感知Q-Former

InstructBLIP (2023)用额外输入扩展了Q-Former：指令文本本身。在交叉注意力时，查询现在可以访问图像patch和指令。查询可以按指令特化（"计算汽车数量"、"描述情绪"），而不是学习单一固定摘要。在留出任务上的基准提升。

### MiniGPT-4和仅投影器方法

MiniGPT-4保留了Q-Former但仅训练输出线性投影，同时冻结其他一切。便宜，但代价是质量——查询是BLIP-2的，不是你的。适合快速迭代，不是最佳架构。

### 为什么LLaVA选择了更简单

LLaVA (2023, 课程12.05)用普通2层MLP替换了Q-Former，将每个ViT patch token投影到LLM空间——24x24网格每张图像576个token，全部喂给LLM。压缩更差但让LLM关注原始patch。当时有争议；到2023年底它占主导地位，因为视觉指令数据(LLaVA-Instruct-150k)证明MLP可以被训练以保留足够信号。权衡：LLaVA的上下文填满更快，但它自然扩展到多图像和视频。

到2026年领域分化：Q-Former在token预算重要时存活（长视频、多图像）；MLP投影器在每token原始质量是优先级时占主导。

### 门控交叉注意力：Flamingo，先驱

Flamingo（课程12.04）早于BLIP-2，使用了相同的交叉注意力想法但在每个冻结LLM层，而不是作为单一桥接。BLIP-2表明你可以仅压缩到输入层仍然有效。Gemini和Idefics结合两者：交错输入token加可选门控交叉注意力用于上下文内少样本。

### 2026年后代

- Q-Former：BLIP-2、InstructBLIP、MiniGPT-4，以及大多数视频-语言模型（因为token预算原因）。
- Perceiver resampler：Flamingo的变体（课程12.04）；Idefics家族、Eagle、OmniMAE。
- MLP投影器：LLaVA、LLaVA-NeXT、LLaVA-OneVision、Cambrian-1。
- Attention pool：VILA、PaliGemma。

四种都有效。决定性问题是你受限于token预算还是每token质量。

## 实践

`code/main.py`构建了一个stdlib Q-Former风格的交叉注意力：

1. 模拟256个图像patch token（dim 128）。
2. 实例化32个可学习查询（dim 128）。
3. 运行缩放点积交叉注意力（Q来自查询，K/V来自patch）。
4. 通过线性层投影到LLM维度(512)。
5. 输出32个LLM就绪的视觉token。

所有数学用纯Python（向量上的嵌套循环）。Toy但形状正确。打印注意力权重矩阵，这样你可以看到每个查询从哪些patch拉取。

## 输出

本课程产生`outputs/skill-modality-bridge-picker.md`。给定目标VLM配置（视觉编码器token数、LLM上下文预算、部署约束、质量目标），它推荐Q-Former vs MLP vs Perceiver resampler并附简短理由和每种桥接的参数量估算。

## 练习

1. 在PyTorch中实现交叉注意力块。验证32个查询和256个键/值时，注意力权重矩阵是32 x 256，softmax后每行和为1。

2. 在BLIP-2阶段1中，Q-Former同时运行三个损失：ITC、ITM、ITG。用伪代码写出每个的前向签名。哪个需要文本编码器路径激活？

3. 比较参数量：Q-Former（12层，768隐藏）vs 2层MLP投影器（1408 → 4096，两层）。在什么LLM规模下188M Q-Former的成本在训练效率上回本？

4. 阅读BLIP-2论文第3.2节(arXiv:2301.12597)关于Q-Former如何初始化。解释为什么从BERT-base初始化（而非随机）加速收敛。

5. 对于10分钟视频以1 FPS采样到60帧，计算每帧token成本：(Q-Former → 32 tokens/帧) vs (MLP投影器 → 576 tokens/帧)。哪个适合128k token的LLM上下文窗口？

## 关键术语

| 术语                | 常见说法                 | 实际含义                                                                |
| ------------------- | ------------------------ | ----------------------------------------------------------------------- |
| Q-Former            | "查询Transformer"        | 带有32个可学习查询向量的小型Transformer，交叉关注冻结ViT特征            |
| 可学习查询          | "视觉的软prompt"         | 作为交叉注意力查询侧的固定参数集；按模型学习，跨所有输入共享            |
| 交叉注意力          | "Q来自这里，K/V来自那里" | 查询、键和值来自不同来源的注意力；查询如何从ViT patch拉取               |
| ITC                 | "图像-文本对比"          | 应用于Q-Former池化查询vs文本CLS的CLIP风格损失                           |
| ITM                 | "图像-文本匹配"          | 硬负样本挖掘对上的二分类器；强制查询辨别细粒度不匹配                    |
| ITG                 | "图像条件文本生成"       | 以查询为条件生成文本的因果LM损失；强制查询编码文本可解码内容            |
| 两阶段预训练        | "先表示后生成"           | 阶段1单独训练Q-Former(ITC/ITM/ITG)；阶段2附加冻结LLM仅训练投影+Q-Former |
| 冻结骨干            | "不微调"                 | 视觉编码器和LLM权重固定；仅桥接训练                                     |
| 投影头              | "线性到LLM维度"          | 将Q-Former输出映射到LLM嵌入维度的最终线性层                             |
| Perceiver resampler | "Flamingo的版本"         | 类似的可学习查询交叉注意力，Flamingo在每层使用而非作为单一桥接          |

## 延伸阅读

- [Li等人 — BLIP-2 (arXiv:2301.12597)](https://arxiv.org/abs/2301.12597) — 核心论文。
- [Li等人 — BLIP (arXiv:2201.12086)](https://arxiv.org/abs/2201.12086) — 带有ITC/ITM/ITG三重的前身。
- [Li等人 — ALBEF (arXiv:2107.07651)](https://arxiv.org/abs/2107.07651) — "先对齐后融合" — 阶段1训练的概念祖先。
- [Dai等人 — InstructBLIP (arXiv:2305.06500)](https://arxiv.org/abs/2305.06500) — 指令感知Q-Former。
- [Zhu等人 — MiniGPT-4 (arXiv:2304.10592)](https://arxiv.org/abs/2304.10592) — 仅投影器方法。
- [Jaegle等人 — Perceiver IO (arXiv:2107.14795)](https://arxiv.org/abs/2107.14795) — 可学习查询交叉注意力的通用架构。
