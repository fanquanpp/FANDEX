---
title: Emu3：下一token预测用于图像和视频生成
description: 理解Emu3如何仅用下一token预测在图像生成上击败扩散模型
module: multimodal
difficulty: advanced
tags:
  - Emu3
  - 下一token预测
  - VQ分词器
  - 视频生成
  - 统一模型
related:
  - multimodal/CLIP与对比预训练
  - multimodal/ColPali视觉原生文档RAG
  - multimodal/Flamingo与门控交叉注意力
  - multimodal/InternVL3原生多模态预训练
prerequisites:
  - multimodal/多模态Agent与计算机使用
---

# Emu3：下一token预测用于图像和视频生成

> BAAI的Emu3 (Wang等人, 2024年9月)是本应终结扩散vs自回归辩论的2024年结果。单一Llama风格仅解码器Transformer，仅用下一token预测目标训练，跨越文本 + VQ图像token + 3D VQ视频token的统一词表，在图像生成上击败SDXL，在感知上击败LLaVA-1.6。无CLIP损失。无扩散调度。推理时使用classifier-free guidance提升质量，但核心训练目标是带teacher forcing的下一token预测。发表在Nature上。本课程阅读Emu3论点——为什么更好的分词器加规模就是你所需要的一切——并与扩散方法对比。

**类型:** 学习
**语言:** Python (stdlib, 3D视频分词器数学 + 自回归采样器骨架)
**前置知识:** Phase 12 · 11 (Chameleon)
**时间:** ~120分钟

## 学习目标

- 解释为什么Emu3的单一损失下一token目标有效，尽管长期假设图像质量需要扩散。
- 描述3D视频分词器：时空VQ码本是什么样的，为什么patch跨越时间。
- 比较Emu3 vs Stable Diffusion XL在(训练计算、推理成本、质量上限)上。
- 说出同一Emu3模型扮演的三个角色：Emu3-Gen(图像生成)、Emu3-Chat(感知)、Emu3-Stage2(视频生成)。

## 问题

到2024年的传统智慧：图像生成需要扩散。论点是：离散图像token丢失太多信息无法重建细节，自回归采样在数千token间累积误差。Stable Diffusion、DALL-E 3、Imagen、Midjourney都使用某种形式的扩散。Chameleon（课程12.11）在小规模上部分反驳了这一点，但未在质量上匹配SDXL。

Emu3正面攻击论点。主张：更好的视觉分词器 + 足够规模 + 下一token损失 = 在同样做感知的模型中击败扩散的图像生成。

该赌注在发表时有争议。两年后，开源统一生成家族（Emu3、Show-o、Janus-Pro、Transfusion）是研究的默认路径；生产前沿模型似乎使用某种变体。

## 概念

### Emu3分词器

关键成分是视觉分词器。Emu3训练了一个自定义IBQ类分词器（逆瓶颈量化器，SBER-MoVQGAN家族），每token 8x8分辨率缩减。512x512图像变为64x64 = 4096 token，码本大小32768。

这比Chameleon的512x512图像1024 token K=8192更大，但每token更便宜（更小码本查找，更简单编解码器）。关键指标：重建PSNR在30.5 dB，与Stable Diffusion连续潜空间32 dB竞争。

对于视频：3D VQ分词器将时空patch(4x4x4像素)编码为一个整数。8 FPS的4秒片段有32帧；在256x256下4x空间和4x时间缩减，token数为(256/4) _ (256/4) _ (32/4) = 64 _ 64 _ 8 = 32,768 token。

分词器质量是上限。Emu3的贡献部分是"我们训练了一个非常好的分词器"。

### 单一损失训练

Emu3使用一个目标：在文本token、2D图像token和3D视频token的共享词表上的下一token预测。训练期间权重乘以模态特定因子以平衡贡献，但损失函数相同。

在以下混合上训练：

- 图像生成：`<text caption> <image> image_tokens </image>`
- 图像感知：`<image> image_tokens </image> <question> text_tokens`
- 视频生成：`<text caption> <video> video_tokens </video>`
- 视频感知：类似。
- 纯文本：标准NTP。

模型从数据分布学习何时发出图像token vs文本token。生成从模型在`<image>`标签后预测图像token中涌现。

### Classifier-free guidance和温度

自回归图像生成在推理时使用classifier-free guidance(CFG)变得更好。Emu3使用它：生成两次，一次用完整标题，一次用空标题，用引导权重（典型3.0-7.0）混合logits。这与扩散使用的CFG技巧相同，借用到自回归设置。

温度很重要：太高，伪影；太低，模式崩溃。Emu3推荐温度1.0用于感知，0.8用于图像生成。

### 三个角色，一个模型

Emu3作为三个功能不同的API发布，但一个底层权重集：

- Emu3-Gen。图像生成。输入文本，输出图像token。
- Emu3-Chat。VQA和标题生成。输入图像(token)，输出文本。
- Emu3-Stage2。视频生成和视频VQA。输入文本或视频，输出文本或视频。

无任务特定头。只是不同的prompt模板。相同检查点。

### 基准

来自Emu3论文(2024年9月)：

- 图像生成：在MJHQ-30K FID上击败SDXL(5.4 vs 5.6)，GenEval总体(0.54 vs 0.55——统计平局)，Deep-Eval综合持平。
- 图像感知：在VQAv2上击败LLaVA-1.6(75.1 vs 72.4)，在MMMU上大致匹配。
- 视频生成：4秒片段质量在FVD上与Sora时代公开基准模型竞争。

数字并非总是获胜——Emu3在这里换一分在那里换一分——但"下一token预测就是你所需要的一切"的主张跨模态可辩护。

### 计算成本

Emu3在约3000亿多模态token上用7B参数模型训练。GPU小时大致与Llama-2-7B预训练相当（A100级硅上2k-4k GPU年）。Stable Diffusion 3等扩散模型在类似预算上训练，但需要独立文本编码器和更复杂流水线。

推理时，Emu3每张图像比SDXL慢：4096图像token在30 tok/s下每张512x512图像约2分钟，vs SDXL的2-5秒。投机解码和KV缓存优化缩小差距但未关闭。自回归图像生成计算密集；这是持续存在的权衡。

### 为什么重要

Emu3的深层贡献是概念性的。如果下一token预测在图像生成上扩展到匹配扩散，统一模型路径（一个损失、一个骨干、任意模态）是可行的。未来模型不需要独立文本编码器、独立扩散调度器、独立VAE。一个Transformer，每种模态一个分词器，扩展。

Show-o、Janus-Pro和InternVL-U都建立在此论点上或挑战它。中国实验室(BAAI, DeepSeek)在2025年比美国实验室更积极地在此方向发表。

## 实践

`code/main.py`构建两个toy组件：

- 2D vs 3D VQ分词器计数计算器：给定(分辨率, patch, 片段长度, FPS)，计算图像vs视频的token数。
- 带classifier-free guidance和温度的自回归图像token采样器。

CFG实现匹配Emu3的方案——用引导权重混合条件和无条件logits。

## 输出

本课程产生`outputs/skill-token-gen-cost-analyzer.md`。给定生成产品规格（图像或视频、目标分辨率、质量层级、延迟预算），它计算token数、推理成本，并选择Emu3家族vs扩散。

## 练习

1. Emu3在8x8缩减下每512x512图像产生4096 token。计算1024x1024和2048x2048的等效值。推理延迟会发生什么？

2. 阅读Emu3第3.3节关于视频分词器。描述3D VQ patch形状以及为什么是4x4x4而非8x8x1。

3. Classifier-free guidance权重5.0 vs 3.0：什么视觉效果？在`code/main.py`中追踪数学。

4. 计算Emu3-7B在300B token上的训练FLOPs并与Stable Diffusion 3比较。哪个训练更昂贵？

5. Emu3在FID上击败SDXL但在VQAv2上未击败专业VLM。解释为什么统一损失方法在不同基准上显示不同优势vs专家。

## 关键术语

| 术语                     | 常见说法       | 实际含义                                                            |
| ------------------------ | -------------- | ------------------------------------------------------------------- |
| 下一token预测            | "NTP"          | 标准自回归损失：给定token[0..i]预测token[i+1]；分词后适用于每种模态 |
| IBQ分词器                | "逆瓶颈量化器" | 一类VQ-VAE，具有更大码本(32768+)和比Chameleon更好的重建             |
| 3D VQ                    | "时空量化器"   | 由(时间, 行, 列)索引的码本；一个token覆盖4x4x4像素立方体            |
| Classifier-free guidance | "CFG"          | 用权重gamma混合条件和无条件logits；推理时提升图像质量               |
| 统一词表                 | "共享token"    | 文本 + 图像 + 视频都从相同整数空间抽取；模型预测下一个模态          |
| MJHQ-30K                 | "图像生成基准" | Midjourney质量的30k prompt基准；Emu3在此报告FID                     |

## 延伸阅读

- [Wang等人 — Emu3: Next-Token Prediction is All You Need (arXiv:2409.18869)](https://arxiv.org/abs/2409.18869)
- [Sun等人 — Emu: Generative Pretraining in Multimodality (arXiv:2307.05222)](https://arxiv.org/abs/2307.05222)
- [Liu等人 — LWM (arXiv:2402.08268)](https://arxiv.org/abs/2402.08268)
- [Yu等人 — MAGVIT-v2 (arXiv:2310.05737)](https://arxiv.org/abs/2310.05737)
- [Tian等人 — VAR (arXiv:2404.02905)](https://arxiv.org/abs/2404.02905)
