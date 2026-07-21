---
title: Chameleon与早期融合Token统一模型
description: '理解VQ-VAE图像分词器和共享词表的早期融合多模态架构'
module: multimodal
difficulty: advanced
tags:
  - Chameleon
  - 早期融合
  - 'VQ-VAE'
  - 共享词表
  - 混合模态生成
related:
  - multimodal/长视频百万Token理解
  - 'multimodal/BLIP-2与Q-Former桥接'
  - multimodal/CLIP与对比预训练
  - multimodal/ColPali视觉原生文档RAG
prerequisites:
  - multimodal/多模态Agent与计算机使用
---

# Chameleon与早期融合Token统一多模态模型

> 目前为止我们看到的每个VLM都将图像和文本分开。视觉token来自视觉编码器，流入投影器，然后在LLM内部与文本相遇。视觉和文本词表从不重叠。Chameleon (Meta, 2024年5月)问：如果它们重叠呢？训练一个VQ-VAE将图像转换为来自共享词表的离散token序列。每个多模态文档现在是一个序列——文本token和图像token交错，单一自回归损失。副作用：模型可以生成混合模态输出——在单次推理调用中交替文本和图像token。本课程阅读早期融合论点并端到端构建一个toy版本。

**类型:** 构建
**语言:** Python (stdlib, VQ-VAE分词器 + 交错解码器)
**前置知识:** Phase 12 · 05, Phase 8 (生成式AI)
**时间:** ~180分钟

## 学习目标

- 解释为什么共享词表 + 单一损失改变了模型能做什么。
- 描述VQ-VAE如何将图像分词为与Transformer下一token目标兼容的离散序列。
- 说出Chameleon的训练稳定性技巧：QK-Norm、dropout放置、LayerNorm排序。
- 比较Chameleon vs BLIP-2的Q-Former方法，描述何时各是正确选择。

## 问题

适配器VLM（LLaVA、BLIP-2、Qwen-VL）将文本和图像视为两种不同的东西。文本token经过`embed(text_token)`；图像经过`visual_encoder(image) → projector → ... pseudo_tokens`。模型有两条在中间合并的输入路径。

三个后果：

1. LLM只能消费图像，不能发出图像。输出仅限文本。
2. 混合模态文档（段落和图像交替，如文章中）很别扭——你要么在模型外解析多模态输入，要么链接生成。
3. 分布不匹配。视觉token和文本token居住在隐藏空间的不同区域，产生微妙的对齐问题。

Chameleon拒绝前提：图像只是共享词表中的离散token序列。在交错文档上训练模型，一个损失，一个自回归解码器，你免费解锁混合模态生成。

## 概念

### VQ-VAE作为图像分词器

分词器是向量量化变分自编码器。架构：

- 编码器：CNN + ViT将图像映射到空间特征图，比如32x32的dim 256特征。
- 码本：学习的K个向量词汇表（Chameleon使用8192），也是dim 256。
- 量化：对每个空间特征，通过L2距离查找最近码本条目。用整数索引替换连续特征。
- 解码器：CNN将量化特征还原为像素。

训练：VAE重建损失 + 承诺损失 + 码本损失。码本索引形成图像的离散字母表。

对于Chameleon：一张图像变为32\*32 = 1024个token，从8192的词表中抽取。与文本token（来自LLM的BPE词表，比如32000）拼接。最终词表：40192。Transformer看到一个序列，一个损失。

### 共享词表

Chameleon的词表结合了文本token、图像token和模态分隔符。每个token有单一ID。输入嵌入层将每个ID映射到D维隐藏向量。输出投影将隐藏映射回词表logits。Softmax选择下一个token，无论什么模态。

分隔符很重要：`<image>`和`</image>`标签包围图像token序列。生成时，如果模型发出`<image>`，下游软件知道接下来的1024个token是VQ索引，发送到解码器进行像素渲染。

### 混合模态生成

推理是共享词表中的下一token预测。示例prompt："画一只猫并描述它。"Chameleon发出：

```
<image> 4821 1029 2891 ... (1024个图像token) </image>
The cat is orange, sitting on a windowsill...
```

模型自主选择顺序——它可能先产生图像再文本，先文本再图像，或交错。相同解码器，相同损失。

与生成仅限文本的适配器VLM比较。Chameleon重新打开了模型输出模态的问题。

### 训练稳定性 — QK-Norm、dropout、LayerNorm排序

早期融合训练在大规模时不稳定。Chameleon论文记录了三个技巧：

- QK-Norm。在注意力内部点积之前对查询和键投影应用LayerNorm。防止深度处的logit幅度爆炸。多个2024年后大型模型使用。
- Dropout放置。在每个残差加法后dropout，不仅在注意力和MLP后。当图像token的梯度可能主导时需要更多正则化。
- LayerNorm排序。残差分支上的Pre-LN（标准），加上最后一个块跳跃连接上的额外LN。稳定最终层梯度流。

没有这些技巧，34B参数Chameleon训练在多个检查点处发散。有了它们，它收敛。训练方案与架构一样是贡献的一部分。

### 分词器的重建上限

VQ-VAE是有损的。在8192码本条目和512x512图像1024 token下，重建PSNR上限约26-28 dB。这足以生成可识别的图像，但明显差于连续空间扩散（Stable Diffusion 3达到32+ dB）。

分词器是瓶颈。更好的分词器（MAGVIT-v2、IBQ、SBER-MoVQGAN）提升上限。Emu3（课程12.12）仅通过更好的分词器就实现了SDXL质量生成。

### Chameleon vs BLIP-2 / LLaVA

Chameleon（早期融合，共享词表）：

- 一个损失，一个解码器。
- 生成混合模态输出。
- 分词器是质量上限。
- 昂贵：推理路径上每个生成图像需要VQ-VAE解码器。

BLIP-2 / LLaVA（晚期融合，独立塔）：

- 视觉输入，仅文本输出。
- 重用预训练LLM。
- 理解无分词器瓶颈。
- 便宜：单次前向传播。

按任务选择。如果需要图像生成，Chameleon家族。如果只需要理解，适配器VLM更简单且重用更多预训练计算。

### Fuyu和AnyGPT

Fuyu (Adept, 2023)是相关方法：完全跳过独立视觉编码器，将原始图像patch通过LLM的输入投影喂入，就像它们是token一样，无分词器。比Chameleon更简单，失去了共享词表输出生成。

AnyGPT (Zhan等人, 2024)将Chameleon扩展到四种模态：文本、图像、语音、音乐。每种使用相同VQ-VAE技巧，共享Transformer。任意到任意生成。课程12.16更详细地涵盖。

## 实践

`code/main.py`构建了一个toy端到端早期融合模型：

- 一个微型VQ-VAE风格量化器，将8x8 patch映射到码本索引(K=16)。
- 共享词表：(文本id 0..31) + (图像id 32..47) + (分隔符 48, 49)。
- 一个toy自回归解码器（二元表），在合成标题 + 图像token序列上训练。
- 给定prompt发出交替文本 + 图像token的采样循环。

代码故意保持Transformer微型（二元组），这样你可以端到端追踪信号流。

## 输出

本课程产生`outputs/skill-tokenizer-vs-adapter-picker.md`。给定产品规格（仅理解 vs 理解+生成、所需图像质量、成本预算），它选择Chameleon家族（早期融合）或LLaVA家族（晚期融合）并用量化经验法则论证。

## 练习

1. Chameleon使用K=8192码本条目和512x512图像1024 token。估算与24位RGB图像的压缩比。是有损的吗？多损？

2. 4K图像(3840x2160)在相同VQ-VAE密度下产生多少图像token？Chameleon风格模型能在一次推理调用中生成4K图像吗？什么先崩溃——上下文、分词器质量还是KV缓存？

3. 用纯Python实现QK-Norm。给定64维查询和键，展示LayerNorm前后的点积。为什么在深度处幅度控制很重要？

4. 阅读Chameleon第2.3节关于训练稳定性。描述论文在没有QK-Norm的34B处观察到的确切失败模式。"范数爆炸"签名是什么？

5. 扩展toy解码器以在给定纯文本prompt时发出混合模态响应。测量在训练数据分布60%文本优先 / 40%图像优先下模型选择图像优先vs文本优先的频率。

## 关键术语

| 术语         | 常见说法        | 实际含义                                                    |
| ------------ | --------------- | ----------------------------------------------------------- |
| 早期融合     | "统一token"     | 图像从第一步就转换为共享Transformer词表的离散token          |
| VQ-VAE       | "图像分词器"    | CNN + ViT + 码本，将图像映射为Transformer可以预测的整数索引 |
| 共享词表     | "一个字典"      | 覆盖文本 + 图像 + 模态分隔符的单一token ID空间              |
| QK-Norm      | "注意力稳定器"  | 在查询和键点积前应用LayerNorm，防止范数爆炸                 |
| 混合模态生成 | "文本+图像输出" | 推理时在单次传递中自主产生交错文本和图像token               |
| 码本大小     | "K条目"         | VQ-VAE可以量化到的离散向量数量；权衡压缩与保真度            |
| 分词器上限   | "重建限制"      | 解码VQ token可达到的最佳PSNR；限制模型的图像质量            |

## 延伸阅读

- [Chameleon Team — Chameleon: Mixed-Modal Early-Fusion Foundation Models (arXiv:2405.09818)](https://arxiv.org/abs/2405.09818)
- [Aghajanyan等人 — CM3 (arXiv:2201.07520)](https://arxiv.org/abs/2201.07520)
- [Yu等人 — CM3Leon (arXiv:2309.02591)](https://arxiv.org/abs/2309.02591)
- [Zhan等人 — AnyGPT (arXiv:2402.12226)](https://arxiv.org/abs/2402.12226)
- [Adept — Fuyu-8B blog (adept.ai)](https://www.adept.ai/blog/fuyu-8b)
