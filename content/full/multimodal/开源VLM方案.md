---
title: 开源VLM方案：什么真正重要
description: '从MM1、Idefics2、Cambrian-1等消融实验中提炼VLM设计的关键决策'
module: multimodal
difficulty: intermediate
tags:
  - VLM方案
  - 消融实验
  - 编码器选择
  - 数据质量
  - MM1
related:
  - multimodal/多模态RAG与跨模态检索
  - multimodal/具身VLA机器人模型
  - 'multimodal/全能模型Thinker-Talker架构'
  - 'multimodal/任意分辨率与Patch-n-Pack'
prerequisites:
  - multimodal/多模态Agent与计算机使用
---

# 开源VLM方案：什么真正重要

> 2024-2026年开源VLM文献是一片消融表的森林。Apple的MM1测试了图像编码器、连接器和数据混合的13种组合。Allen AI的Molmo证明详细的人工标题击败GPT-4V蒸馏。Cambrian-1运行了20+编码器比较。Idefics2形式化了五轴设计空间。Prismatic VLMs在受控基准上比较了27种训练方案。在所有噪音中，一小部分结果在各论文间成立：图像编码器比连接器架构更重要，数据混合比两者都重要，详细的人工标题击败蒸馏合成数据。本课程阅读这些表格，这样你就不必亲自读了。

**类型:** 学习 + 实验
**语言:** Python (stdlib, 消融表解析器 + 方案选择器)
**前置知识:** Phase 12 · 05 (LLaVA基线)
**时间:** ~180分钟

## 学习目标

- 说出五轴VLM设计空间：图像编码器、连接器、LLM、数据混合、分辨率调度。
- 阅读MM1 / Idefics2 / Cambrian-1消融表并预测哪个旋钮移动给定基准。
- 为新VLM在给定计算预算和任务组合下选择方案（编码器、连接器、数据、分辨率）。
- 解释为什么详细的人工标题在相同token数量下击败GPT-4V蒸馏。

## 问题

数百个开源VLM存在。"好"和"最先进"之间的大部分差距不是架构。而是数据、分辨率调度和编码器选择。知道模型表现不佳时首先转动哪个旋钮，可以节省500万GPU小时的错误。

2023年浪潮（LLaVA-1.5、InstructBLIP、MiniGPT-4）运行在标题对预训练 + LLaVA-Instruct-150k上。好的基线。在MMMU约35%见顶。

2024年浪潮（MM1、Idefics2、Molmo、Cambrian-1、Prismatic VLMs）运行了穷举消融。结果令人惊讶且实用。

## 概念

### 五轴设计空间

Idefics2 (Laurençon等人, 2024)命名了各轴：

1. 图像编码器。CLIP ViT-L/14、SigLIP SO400m/14、DINOv2 ViT-g/14、InternViT-6B。编码器在patch大小、分辨率和预训练目标上不同。
2. 连接器。MLP（2-4层）、Q-Former（32查询 + 交叉注意力）、Perceiver Resampler（64查询）、C-Abstractor（卷积 + 双线性池化）。
3. 语言模型。Llama-3 8B / 70B、Mistral 7B、Phi-3、Gemma-2、Qwen2.5。LLM大小是主导参数成本。
4. 训练数据。标题对(CC3M, LAION)、交错(OBELICS, MMC4)、指令(LLaVA-Instruct, ShareGPT4V, PixMo, Cauldron)。
5. 分辨率调度。固定224/336/448、AnyRes、原生动态。训练期间递增或恒定。

每个生产VLM在每个轴上做出选择。MMMU分数的大部分方差由轴1、4和5解释——而不是你选了哪个连接器。

### 轴1：编码器 > 连接器

MM1第3.2节显示：从CLIP ViT-L/14换到SigLIP SO400m/14在MMMU上增加了3+分。从MLP换连接器到Perceiver Resampler增加不到1分。Idefics2复现：SigLIP > CLIP，Q-Former ≈ MLP ≈ Perceiver在相同token数量下。

Cambrian-1的"Cambrian Vision Encoders Match-Up"(Tong等人, 2024)在以视觉为中心的基准(CV-Bench)上运行了20+编码器。排行榜顶部是DINOv2和SigLIP的混合；CLIP在中游；ImageBind和ViT-MAE较低。从CLIP ViT-L到DINOv2 ViT-g/14在CV-Bench上差距约5-7分。

2026年开源VLM的默认编码器是SigLIP 2 SO400m/14用于语义 + 密集特征，有时与DINOv2 ViT-g/14特征拼接（Cambrian的"Spatial Vision Aggregator"这样做）。

### 轴2：连接器设计无关紧要

MM1、Idefics2、Prismatic和MM-Interleaved都得出相同结论：在固定视觉token数量下，连接器架构几乎无关紧要。2层MLP在mean-pooled patch上在相同token预算下与32查询Q-Former性能差距在1分以内。

重要的是token数量。更多视觉token = 更多LLM计算 = 更好性能，到某点后收益递减。每张图像64 token对OCR来说太少。576-1024 token是大多数开源VLM的甜蜜点。2048+仅对文档和图表有帮助。

Q-Former vs MLP是成本问题，不是质量问题：Q-Former将token限制在32-64，无论图像分辨率如何；MLP发出所有patch token。对于高分辨率输入，Q-Former节省LLM上下文；对于低分辨率，差异是噪声。

### 轴3：LLM大小设定上限

将LLM从7B翻倍到13B在每个VLM论文中可靠地在MMMU上增加2-4分。在70B时你饱和大多数基准。VLM的多模态推理上限是LLM的文本推理上限——视觉编码器只能喂给它，不能替它推理。

这就是为什么Qwen2.5-VL-72B和Claude Opus 4.7在MMMU-Pro和ScreenSpot-Pro上碾压：语言大脑巨大。7B VLM无法通过巧妙的连接器设计替代70B VLM。

### 轴4：数据——详细人工标题击败蒸馏

Molmo + PixMo (Deitke等人, 2024)是每个人都应该读的2024年结果。Allen AI让人工标注者用1-3分钟的密集语音转文本描述图像，产生712K密集标注图像。训练数据中没有任何GPT-4V蒸馏。

Molmo-72B在11个基准中的11个上击败Llama-3.2-90B-Vision。差距不是架构——而是标题质量。详细人工标题每张图像包含5-10倍更多信息，且在GPT-4V蒸馏幻觉时保持事实基础。

ShareGPT4V (Chen等人, 2023)和Cauldron (Idefics2)遵循相同策略，混合人工 + GPT-4V标题。趋势很明确：对于2026年前沿，标题密度 > 标题数量 > 蒸馏便利性。

### 轴5：分辨率及其调度

Idefics2的消融：384 → 448增加1-2分。448 → 980带图像分割(AnyRes)在OCR基准上再增加3-5分。固定分辨率训练在中等准确率处见顶；分辨率递增（从224开始，以448或原生结束）训练更快且最终更高。

Cambrian-1运行了分辨率vs token权衡：在固定计算下，你可以在更低分辨率下有更多token或在更高分辨率下有更少token。更高分辨率在OCR上获胜；更低分辨率更多token在通用场景理解上获胜。

2026年生产方案：阶段1在384固定训练，阶段2以动态分辨率最高到1280用于OCR密集任务。

### Prismatic受控比较

Prismatic VLMs (Karamcheti等人, 2024)是控制了所有轴的论文。相同13B LLM、相同指令数据、相同评估——一次只变一个轴。结果：

- 每图像视觉token数量解释约60%方差。
- 编码器选择解释约20%。
- 连接器架构解释约5%。
- 其他所有（数据混合、调度器、学习率）占剩余约15%。

这是粗略分解，但它是文献中"我应该先消融什么"最干净的答案。

### 2026年选择器

鉴于证据，2026年新项目的默认开源VLM方案：

- 编码器：SigLIP 2 SO400m/14在原生分辨率带NaFlex，如果需要分割/定位则与DINOv2 ViT-g/14拼接。
- 连接器：patch token上的2层MLP。除非受token约束，否则跳过Q-Former。
- LLM：Qwen2.5 / Llama-3.1 / Gemma 2，7B为成本，70B为质量，按目标延迟选择。
- 数据：PixMo + ShareGPT4V + Cauldron，补充任务特定指令数据。
- 分辨率：动态（最小256，最大1280像素每长边）。
- 调度：阶段1对齐（仅投影器），阶段2完全微调，阶段3任务特定微调。

这些默认值每一个都可以追溯到本课程末尾引用的论文中测量的消融。

## 实践

`code/main.py`是消融表解析器和方案选择器。它编码了MM1和Idefics2消融表（精简版），让你查询：

- "给定预算X和任务Y，什么方案获胜？"
- "如果我在7B Llama上将SigLIP换成CLIP，预期MMMU变化是多少？"
- "我应该先消融哪个轴以获得80%置信度答案？"

输出是带预期基准变化的排序方案列表和"先消融"建议。

## 输出

本课程产生`outputs/skill-vlm-recipe-picker.md`。给定目标任务组合、计算预算和延迟目标，它输出完整方案（编码器、连接器、LLM、数据混合、分辨率调度），并引用证明每个选择合理的消融。阻止工程师每次新VLM项目开始时重新发明Idefics2消融表。

## 练习

1. 阅读MM1第3.2节。对于固定2B LLM在5000万图像预算下，哪个编码器获胜？在13B LLM下答案会翻转吗？为什么？

2. Cambrian-1发现拼接DINOv2 + SigLIP在以视觉为中心的基准上优于单独使用任一编码器，但在MMMU上不增加信号。预测哪些基准会增益，哪些保持持平。

3. 你的目标是在2B LLM上的移动UI agent。选择编码器、连接器、分辨率和数据混合。用具体消融表论证每个选择。

4. Molmo发布4B和72B模型。4B与封闭7B VLM竞争；72B在11/11基准上击败Llama-3.2-90B-Vision。这告诉你关于LLM大小平台假说的什么？

5. 设计一个消融表以在7B VLM上隔离数据混合质量与编码器质量。最少需要多少训练运行？提出四个轴设置。

## 关键术语

| 术语                | 常见说法           | 实际含义                                                                  |
| ------------------- | ------------------ | ------------------------------------------------------------------------- |
| 消融                | "转一个旋钮"       | 训练多个仅在恰好一个设计空间轴上不同的运行，其他一切保持恒定              |
| 连接器              | "桥接"/"投影器"    | 将视觉编码器输出映射到LLM token空间的可训练模块(MLP, Q-Former, Perceiver) |
| 详细人工标题        | "密集标题"         | 多句人工撰写描述（通常80-300 token），比网络alt文本更丰富                 |
| 蒸馏                | "GPT-4V标题"       | 由更强专有VLM生成的训练数据；方便但容易继承幻觉                           |
| AnyRes / 动态分辨率 | "高分辨率路径"     | 通过平铺或M-RoPE喂入大于编码器原生分辨率的图像的策略                      |
| 分辨率递增          | "课程"             | 从低分辨率开始并递增的训练调度，加速对齐学习                              |
| 以视觉为中心基准    | "CV-Bench / BLINK" | 强调细粒度视觉感知而非语言密集推理的评估                                  |
| PixMo               | "Molmo的数据"      | Allen AI的712K密集标注图像数据集；人工语音转录为密集标题                  |

## 延伸阅读

- [McKinzie等人 — MM1 (arXiv:2403.09611)](https://arxiv.org/abs/2403.09611)
- [Laurençon等人 — Idefics2 / What matters building VLMs (arXiv:2405.02246)](https://arxiv.org/abs/2405.02246)
- [Deitke等人 — Molmo and PixMo (arXiv:2409.17146)](https://arxiv.org/abs/2409.17146)
- [Tong等人 — Cambrian-1 (arXiv:2406.16860)](https://arxiv.org/abs/2406.16860)
- [Karamcheti等人 — Prismatic VLMs (arXiv:2402.07865)](https://arxiv.org/abs/2402.07865)
