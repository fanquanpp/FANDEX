---
title: Transfusion：自回归文本+扩散图像统一Transformer
description: 理解Transfusion如何在单一Transformer中同时运行NTP和扩散两种损失
module: multimodal
difficulty: advanced
tags:
  - Transfusion
  - 双损失训练
  - 流匹配
  - MMDiT
  - 连续表示
related:
  - 'multimodal/Qwen-VL家族与动态FPS'
  - 'multimodal/Show-o离散扩散统一模型'
  - 'multimodal/Vision-Transformer与Patch-Token原语'
prerequisites:
  - multimodal/多模态Agent与计算机使用
---

# Transfusion：一个Transformer中的自回归文本 + 扩散图像

> Chameleon和Emu3将一切押在离散token上。它们可行，但量化瓶颈可见——图像质量在连续空间扩散模型之下见顶。Transfusion (Meta, Zhou等人, 2024年8月)采取相反的赌注：保持图像连续，完全放弃VQ-VAE，用两个损失训练一个Transformer。文本token获得下一token预测。图像patch获得流匹配/扩散损失。两个目标优化相同权重。Stable Diffusion 3(MMDiT)的底层架构是近亲。本课程阅读Transfusion论点，构建一个toy双损失训练器，并追踪让一个Transformer做两件事的注意力掩码。

**类型:** 构建
**语言:** Python (stdlib, MNIST规模toy上的双损失训练器)
**前置知识:** Phase 12 · 11 (Chameleon), Phase 8 (生成式AI)
**时间:** ~180分钟

## 学习目标

- 连接一个在相同骨干上运行两个损失（文本token上的NTP，图像patch上的扩散MSE）的Transformer。
- 解释为什么图像patch上的双向注意力加文本token上的因果注意力是正确的掩码选择。
- 比较Transfusion风格（连续图像，扩散损失）与Chameleon风格（离散图像，NTP）在计算、质量和代码复杂性上。
- 说出MMDiT的贡献：每个块中模态特定权重，残差流处的联合注意力。

## 问题

离散vs连续图像token的辩论比LLM更古老。连续表示（原始像素、VAE潜变量）保留细节。离散token（VQ索引）适合Transformer的原生词表但在量化步骤丢失细节。

Chameleon / Emu3走离散：一个损失，一个架构，但图像保真度受分词器质量限制。

扩散模型走连续：卓越的图像质量，但与LLM是独立模型，复杂噪声调度工程，与文本生成无干净整合。

Transfusion问：我们能兼得吗？保持图像连续，仍然训练一个模型，使用两个损失缝合到一个梯度步骤。

## 概念

### 双损失架构

单一仅解码器Transformer处理包含以下内容的序列：

- 文本token（离散，来自BPE词表）。
- 图像patch（连续，16x16像素块通过线性嵌入投影到隐藏维度——与ViT编码器输入相同）。
- `<image>`和`</image>`标签标记连续patch所在位置。

前向传播运行一次。损失按token选择两个头之一：

- 对于文本token：词表logits头上的标准交叉熵。
- 对于图像patch：连续patch上的扩散损失——预测添加到每个patch的噪声。

梯度流经共享Transformer体。两个损失同时改进共享权重。

### 注意力掩码：因果文本 + 双向图像

文本token必须是因果的——你不能让文本token关注未来文本，否则teacher forcing会崩溃。然而图像patch代表一个快照；它们应该在相同图像块内双向关注彼此。

掩码：

```
M[i, j] = 1 如果：
  (i是文本且j是文本且j <= i)   # 文本因果
  或(i是图像且j是图像且same_image_block(i, j))   # 图像内双向
  或(i是文本且j是图像且j < i_image_end)   # 文本关注先前图像
  或(i是图像且j是文本且j < i_image_start)   # 图像关注先前文本
```

在训练和推理时实现为块三角掩码。

### Transformer内的扩散损失

扩散损失是标准的：给图像patch添加噪声，让模型预测噪声（或等效地，干净patch）。Transfusion版本使用流匹配——预测从噪声到干净的速度场。

训练期间：

1. 对每个图像patch x0，采样随机时间步t。
2. 采样噪声ε，计算xt = (1-t) _ x0 + t _ ε（流匹配的线性插值）。
3. Transformer预测v_theta(xt, t)；损失 = MSE(v_theta(xt, t), ε - x0)。
4. 与来自相同序列的文本NTP损失一起反向传播。

推理时，生成是：

- 文本token：标准自回归采样。
- 图像patch：以先前文本token为条件的扩散采样循环（典型10-30步）。

### MMDiT：Stable Diffusion 3的变体

Stable Diffusion 3 (Esser等人, 2024年3月)在Transfusion同期发布了MMDiT（多模态扩散Transformer）。架构是兄弟。

MMDiT的关键区别：

- 每块模态特定权重。每个Transformer块有文本token vs图像patch的独立Q、K、V和MLP权重。注意力是联合的（跨模态）；其他一切都是模态特定的。
- Rectified flow训练。一种特定流匹配变体，已知采样方式且数学比DDPM更简单。
- 规模。MMDiT是SD3的骨干（2B和8B参数变体）。Transfusion论文扩展到7B。

两者收敛于相同核心思想：一个Transformer在文本上运行NTP，在连续图像表示上运行扩散。

### 为什么这击败Chameleon风格

连续扩散vs离散NTP在图像生成上的质量差距是可测量的。Transfusion论文报告：

- 在7B参数下，在FID上击败同规模Chameleon风格模型3-5分。
- 无需分词器训练——图像编码器更简单（线性投影到隐藏维度，与ViT输入层相同）。
- 推理可以并行化图像patch去噪，不像自回归图像token。

缺点：Transfusion是双损失模型，使训练动态更棘手。损失权重需要调优。NTP和扩散之间的调度不匹配可能导致一个头主导。

### 下游发展

Janus-Pro（课程12.15）通过解耦视觉编码器用于理解和生成——SigLIP用于一个，VQ用于另一个——同时共享Transformer体来改进Transfusion的想法。Show-o（课程12.14）将扩散替换为离散扩散（掩码预测）。统一生成家族在Transfusion后快速分化。

2026年发出图像的生产VLM——Gemini 3 Pro、GPT-5、Claude Opus 4.7的图像生成路径——几乎肯定使用该家族的某种后代。细节是专有的。

## 实践

`code/main.py`在微型MNIST类问题上构建toy Transfusion：

- 文本标题是描述数字(0-9)的短整数序列。
- 图像是4x4字节网格。
- 一对共享权重线性投影作为Transformer替代；文本上NTP损失，噪声patch上MSE损失。
- 训练循环交替两个损失，注意力掩码是显式的。
- 生成在一次前向传播中产生文本标题和4x4图像。

Transformer是toy的。双损失管道、注意力掩码构建和推理循环才是真正的产物。

## 输出

本课程产生`outputs/skill-two-loss-trainer-designer.md`。给定新的多模态训练任务（文本+图像、文本+音频、文本+视频），它设计双损失调度（损失权重、掩码形状、共享vs模态特定块）并标记实现风险。

## 练习

1. Transfusion风格模型训练70%文本token和30%图像patch。图像扩散损失在量级上约为文本NTP损失的10倍。什么损失权重平衡它们？

2. 为序列`[T, T, <image>, P, P, P, P, </image>, T]`实现块三角掩码。标记每个条目0或1。

3. MMDiT有模态特定QKV权重。这比Transfusion的完全共享Transformer增加了多少参数开销？在7B参数下，值得吗？

4. 生成：给定文本prompt，模型运行NTP 50个token，然后遇到`<image>`，然后在256个patch上运行扩散20个去噪步。总共多少次前向传播？

5. 阅读SD3论文第3节。描述rectified flow以及为什么它比DDPM在更少推理步骤中收敛。

## 关键术语

| 术语         | 常见说法            | 实际含义                                                                     |
| ------------ | ------------------- | ---------------------------------------------------------------------------- |
| 双损失训练   | "NTP + 扩散"        | 单一Transformer在相同梯度步骤中优化文本token上的交叉熵和连续图像patch上的MSE |
| 流匹配       | "Rectified flow"    | 预测从噪声到干净数据的速度场的扩散变体；数学比DDPM更简单                     |
| MMDiT        | "多模态DiT"         | Stable Diffusion 3的架构：联合注意力，模态特定MLP和归一化                    |
| 块三角掩码   | "因果文本+双向图像" | 文本间因果但图像区域内双向的注意力掩码                                       |
| 连续图像表示 | "无VQ"              | 图像patch作为实值向量，而非整数码本索引                                      |
| 速度预测     | "v参数化"           | 网络输出是噪声和数据之间的速度场，而非噪声本身                               |

## 延伸阅读

- [Zhou等人 — Transfusion (arXiv:2408.11039)](https://arxiv.org/abs/2408.11039)
- [Esser等人 — Stable Diffusion 3 / MMDiT (arXiv:2403.03206)](https://arxiv.org/abs/2403.03206)
- [Peebles & Xie — DiT (arXiv:2212.09748)](https://arxiv.org/abs/2212.09748)
- [Zhao等人 — MonoFormer (arXiv:2409.16280)](https://arxiv.org/abs/2409.16280)
- [Xie等人 — Show-o (arXiv:2408.12528)](https://arxiv.org/abs/2408.12528)
