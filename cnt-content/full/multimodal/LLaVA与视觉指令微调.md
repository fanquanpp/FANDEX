---
title: LLaVA与视觉指令微调
description: '理解LLaVA如何用简单MLP投影器和GPT-4生成指令数据实现VLM'
module: multimodal
difficulty: intermediate
tags:
  - LLaVA
  - 视觉指令微调
  - MLP投影器
  - 'GPT-4数据生成'
  - VLM
related:
  - 'multimodal/Janus-Pro解耦编码器'
  - 'multimodal/LLaVA-OneVision统一模型'
  - multimodal/MIO任意到任意流式模型
  - 'multimodal/Qwen-VL家族与动态FPS'
prerequisites:
  - multimodal/多模态Agent与计算机使用
---

# LLaVA与视觉指令微调

> LLaVA (2023年4月)是地球上被复制最多的多模态架构。它用2层MLP替换了BLIP-2的Q-Former，用朴素的token拼接替换了Flamingo的门控交叉注意力，并在从纯文本标题由GPT-4生成的158k视觉指令轮次上训练。2023年到2026年间任何构建VLM的从业者都构建了某种LLaVA变体。LLaVA-1.5添加了AnyRes。LLaVA-NeXT提升了分辨率。LLaVA-OneVision在一个方案中统一了图像、多图像和视频。本课程阅读方案、实现投影器，并解释为什么"更简单的赢了"。

**类型:** 构建
**语言:** Python (stdlib, 投影器 + 指令模板构建器)
**前置知识:** Phase 12 · 02 (CLIP), Phase 11 (LLM Engineering — 指令微调)
**时间:** ~180分钟

## 学习目标

- 构建将ViT patch嵌入(dim 1024)映射到LLM嵌入维度(dim 4096)的2层MLP投影器。
- 梳理LLaVA两阶段方案：(1) 在558k标题对上进行投影器对齐，(2) 在158k GPT-4生成的轮次上进行视觉指令微调。
- 构建带有图像token占位符、系统prompt和用户/助手轮次的LLaVA格式prompt。
- 解释为什么社区从Q-Former转向MLP，尽管Q-Former在token预算上更优。

## 问题

BLIP-2的Q-Former（课程12.03）将图像压缩为32个token。干净、高效、基准测试好。但它有两个问题。

首先，Q-Former是可训练的，但其损失不是最终任务。阶段1训练ITC+ITM+ITG。阶段2训练LM损失。查询学习一些中间表示，LLM然后必须解码。信息在瓶颈中丢失。

其次，Q-Former占用188M参数，在LLaVA的2023年规模下你必须与目标LLM共同设计它。更换LLM，重新训练Q-Former。更换视觉编码器，重新训练。每个组合都是单独的R&D项目。

LLaVA的答案简单得令人尴尬：取ViT的576个patch token，每个通过2层MLP（`1024 → 4096 → 4096`），将所有576个倾倒到LLM的输入序列中。没有瓶颈。没有在奇怪目标上的阶段1预训练。只在直接LM损失上训练MLP。

数据从哪里来？LLaVA的第二个洞察：使用GPT-4（纯文本）生成指令数据。将COCO标题和边界框数据喂给GPT-4，要求它产生对话、描述和复杂推理问题。158k指令-响应轮次免费获得。无需人工标注。

结果：一个在8块A100上运行一天的VLM，在MMMU上击败Flamingo，并发布了社区可以扩展的开源检查点。到2023年底它已经催生了50+个分支。

## 概念

### 架构

LLaVA-1.5 13B：

- 视觉编码器：CLIP ViT-L/14 @ 336（阶段1冻结，阶段2可选解冻）。
- 投影器：2层MLP带GELU激活，`1024 → 4096 → 4096`。
- LLM：Vicuna-13B（后来Llama-3.1-8B）。

图像 + 文本prompt的前向传播：

```
img -> ViT -> 576个dim 1024的patch
patches -> MLP -> 576个dim 4096的token
prompt: system + "<image>"占位符 + 用户问题
用576个投影token替换<image> token
将完整序列喂给LLM
解码响应
```

图像占用LLM上下文的576个token。在2048上下文中，为文本留下1472个token。在32k上下文中，这是舍入误差。

### 阶段1：投影器对齐

冻结ViT。冻结LLM。仅训练2层MLP。数据集：558k图像-标题对(LAION-CC-SBU)。损失：以投影图像token为条件的标题上的语言建模。

在batch 128下一个epoch几小时完成。投影器学习将ViT空间映射到LLM空间。无任务特定监督。

### 阶段2：视觉指令微调

解冻投影器（仍可训练）。解冻LLM（通常完全解冻，有时LoRA）。在158k视觉指令轮次上训练。

指令数据是诀窍。Liu等人通过以下方式生成：

1. 取一张COCO图像。
2. 提取文本描述（5个人工标题 + 边界框列表）。
3. 用三种prompt模板发送给GPT-4：
   - 对话："生成关于此图像的用户和助手之间的来回对话。"
   - 详细描述："给出图像的丰富、详细描述。"
   - 复杂推理："提出一个需要对图像进行推理的问题，然后回答它。"
4. 将GPT-4的输出解析为(指令, 响应)对。

这些都不直接接触图像——仅文本描述。GPT-4幻觉出合理的图像内容。有些噪声，但有效：158k轮次足以解锁对话。

### 为什么社区复制了这个

- 无需调整阶段1特定损失。全程LM损失。
- 投影器几小时训练完，不是几天。
- LLM可以更换（LLaVA-Llama2、LLaVA-Mistral、LLaVA-Llama3），只需重新训练投影器。
- 视觉指令数据流水线使用GPT-4，为新领域重新生成很便宜。

### LLaVA-1.5和LLaVA-NeXT

LLaVA-1.5 (2023年10月)添加了：

- 学术任务数据(VQA、OKVQA、RefCOCO)混入指令微调。
- 更好的系统prompt。
- 2048 → 32k上下文。

LLaVA-NeXT (2024年1月)添加了：

- AnyRes：将高分辨率图像分割为2x2或1x3网格的336x336裁剪，加上一个全局低分辨率缩略图。每个裁剪变为576个token；每张图像总共约2880个视觉token。OCR和图表任务大幅提升。
- 更好的指令数据混合，使用ShareGPT4V（高质量GPT-4V标题）。
- 更强的基座LLM（Mistral-7B、Yi-34B）。

### LLaVA-OneVision

课程12.08深入介绍OneVision。简短版本：相同投影器，但使用覆盖单图像、多图像和视频的课程训练，在一个模型中共享视觉token预算。

### 与Q-Former的比较

|                   | Q-Former (BLIP-2) | MLP (LLaVA)                 |
| ----------------- | ----------------- | --------------------------- |
| 每张图像视觉token | 32                | 576（基础）或2880（AnyRes） |
| 可训练参数        | 188M + LM         | 40M + LM                    |
| 阶段1损失         | ITC+ITM+ITG       | 仅LM                        |
| LLM即插即用       | 需要重新训练      | 最小重新训练即可更换        |
| 多图像            | 别扭              | 自然（拼接）                |
| 视频              | 别扭              | 自然（逐帧拼接）            |
| Token预算         | 小                | 大                          |

MLP在简单性和token灵活性上获胜。Q-Former在token预算上获胜。到2023年底token预算不再是约束（LLM上下文增长到32k-128k+），简单性占主导。

### Prompt格式

```
A chat between a curious human and an artificial intelligence assistant. The assistant gives helpful, detailed, and polite answers to the human's questions. USER: <image> Describe this image in detail. ASSISTANT: The image shows ...
```

`<image>`是占位符token。在token化之前，它被替换为576个视觉token（或AnyRes的2880个）。Tokenizer看到比它训练时略长的序列，但LLM处理新输入是因为阶段1教会了它这样做。

### 参数经济

LLaVA-1.5-7B分解：

- CLIP ViT-L/14 @ 336：303M（阶段1冻结，阶段2通常解冻）。
- 投影器(2x linear)：约22M可训练。
- Llama-7B：7B。
- 总计：7.3B参数。阶段2可训练：完整7B + 22M投影器。

阶段2训练成本：8xA100上约20小时。这是关键数字——一天，一个节点，可复现。这就是LLaVA传播的原因。

## 实践

`code/main.py`实现了：

1. 2层MLP投影器（toy规模的dim 16 → 32 → 32）纯Python实现。
2. Prompt构建流水线：系统prompt + `<image>`替换为N个投影token + 用户轮次 + 助手生成占位符。
3. 576 token视觉块在LLM上下文中的可视化（2k / 32k / 128k上下文消耗百分比）。

## 输出

本课程产生`outputs/skill-llava-vibes-eval.md`。给定LLaVA家族检查点，它运行10 prompt的vibes-eval套件（3个标题、3个VQA、2个推理、2个拒绝）并报告人类可读的记分卡。不是基准；是确认投影器和LLM连接良好的冒烟测试。

## 练习

1. 计算`1024 → 4096 → 4096`的2层MLP投影器的可训练参数量。带GELU和bias时，它占LLaVA-13B的多少比例？

2. 为"拒绝"案例构建LLaVA prompt——图像包含私人个体。写出预期的助手响应。为什么LLaVA应该零样本拒绝，需要什么训练数据来强化拒绝？

3. 阅读LLaVA-NeXT博客的AnyRes部分。计算1344x672图像在AnyRes下的视觉token数量。与336x336下基础576 token比较。

4. LLaVA阶段1投影器用标题上的LM损失训练。如果跳过阶段1直接进入阶段2（视觉指令微调）会怎样？引用Prismatic VLMs消融(arXiv:2402.07865)的答案。

5. LLaVA-Instruct-150k使用GPT-4和COCO标题生成指令。对于新领域（医学X光、卫星图像），描述生成领域指令的四步数据流水线。每步可能出什么问题？

## 关键术语

| 术语           | 常见说法        | 实际含义                                              |
| -------------- | --------------- | ----------------------------------------------------- |
| 投影器         | "MLP桥接"       | 带GELU的2层MLP，将ViT维度映射到LLM维度                |
| 图像token      | "<image>占位符" | 推理前被N个投影视觉token替换的prompt标记              |
| 视觉指令微调   | "LLaVA阶段2"    | 在GPT-4生成的(图像, 指令, 响应)三元组上训练           |
| 阶段1对齐      | "投影器预训练"  | 冻结ViT和LLM，用标题上的LM损失训练投影器              |
| AnyRes         | "多裁剪平铺"    | 将高分辨率图像分割为瓦片网格并拼接每个瓦片的视觉token |
| LLaVA-Instruct | "GPT-4生成"     | 从COCO标题 + GPT-4合成的158k指令-响应对               |
| 视觉编码器冻结 | "骨干锁定"      | CLIP权重在阶段1不更新，有时在阶段2也不更新            |
| ShareGPT4V     | "更好的标题"    | GPT-4V生成的100万密集标题，用于更高质量对齐           |
| VQA            | "视觉问答"      | 回答关于图像的自由形式问题的任务                      |
| Prismatic VLMs | "设计空间论文"  | Karamcheti 2024系统测试投影器和数据选择的消融         |

## 延伸阅读

- [Liu等人 — Visual Instruction Tuning (arXiv:2304.08485)](https://arxiv.org/abs/2304.08485) — LLaVA论文。
- [Liu等人 — Improved Baselines with Visual Instruction Tuning (arXiv:2310.03744)](https://arxiv.org/abs/2310.03744) — LLaVA-1.5。
- [Chen等人 — ShareGPT4V (arXiv:2311.12793)](https://arxiv.org/abs/2311.12793) — 密集标题数据集。
- [Karamcheti等人 — Prismatic VLMs (arXiv:2402.07865)](https://arxiv.org/abs/2402.07865) — 设计空间消融。
- [Li等人 — LLaVA-OneVision (arXiv:2408.03326)](https://arxiv.org/abs/2408.03326) — 统一单图像、多图像、视频。
