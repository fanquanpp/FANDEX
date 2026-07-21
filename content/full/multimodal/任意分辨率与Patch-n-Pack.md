---
title: '任意分辨率视觉：Patch-n-Pack与NaFlex'
description: '理解如何处理可变分辨率图像，从NaViT打包到AnyRes平铺和M-RoPE'
module: multimodal
difficulty: intermediate
tags:
  - NaViT
  - 'Patch-n-Pack'
  - AnyRes
  - NaFlex
  - 'M-RoPE'
  - 分辨率
related:
  - multimodal/开源VLM方案
  - 'multimodal/全能模型Thinker-Talker架构'
  - multimodal/视频语言模型与时间定位
  - multimodal/文档与图表理解
prerequisites:
  - multimodal/多模态Agent与计算机使用
---

# 任意分辨率视觉：Patch-n'-Pack和NaFlex

> 真实图像不是224x224的正方形。收据是9:16，图表是16:9，医学扫描可能是4096x4096，手机截图是9:19.5。2024年前VLM的答案——将所有内容调整为固定正方形——丢弃了使OCR、文档理解和高分辨率场景解析工作的信号。NaViT (Google, 2023)表明你可以用块对角掩码将可变分辨率的patch打包到单个Transformer batch中。Qwen2-VL的M-RoPE (2024)完全放弃了绝对位置表。LLaVA-NeXT的AnyRes将高分辨率图像平铺为基图+子图。SigLIP 2的NaFlex变体(2025)现在是希望单一检查点服务每种纵横比的开源VLM的默认编码器。本课程端到端实现patch-n'-pack。

**类型:** 构建
**语言:** Python (stdlib, patch打包器 + 块对角掩码)
**前置知识:** Phase 12 · 01 (ViT patches), Phase 12 · 05 (LLaVA)
**时间:** ~120分钟

## 学习目标

- 将一批可变分辨率图像的patch打包到一个序列中，并构建块对角注意力掩码。
- 为给定任务在AnyRes平铺(LLaVA-NeXT)、NaFlex(SigLIP 2)和M-RoPE(Qwen2-VL)之间做出选择。
- 计算OCR、图表和摄影在不调整大小的情况下的token预算。
- 说出正方形调整大小的三种失败模式：挤压文本、裁剪内容、padding浪费token。

## 问题

Transformer期望一个序列。Batch是相同长度序列的堆叠。如果你的图像是224x224，每次得到196个patch token，不需要padding，工作完成。在224上训练，在224上推理，再也不用考虑分辨率。

世界不配合。文档是纵向的（8.5x11英寸，约2:3）。图表截图是横向的（16:9）。收据又高又窄（1:3）。医学影像以2048x2048或更大尺寸发布。移动设备截图是1170x2532（0.46:1）。

2024年前的三种选择及各自失败原因：

1. 调整为固定正方形（224x224或336x336）。挤压扭曲了文本和面部。缩小破坏了图表标签和OCR内容。LLaVA-1.5之前的标准做法。
2. 裁剪为固定纵横比。你丢弃了大部分图像，选择裁剪位置本身就是一个视觉问题。
3. 填充到最长边。修复了失真但在纵向图像上浪费50%+的token用于padding。所有这些pad token上的二次注意力成本。

2024-2025年的答案：让Transformer以图像的原生分辨率吃patch，并想办法将异构batch打包到一个序列中而不浪费计算。

## 概念

### NaViT和patch-n'-pack

NaViT (Dehghani等人, 2023)是表明这在规模上有效的论文。想法是机械的：

1. 对于batch中的每张图像，以选定的patch大小（比如14）计算其原生patch网格。
2. 将每张图像的patch展平为其自己的可变长度序列。
3. 将所有图像的patch拼接为一个长序列用于batch。
4. 构建块对角注意力掩码，使图像A的patch只关注图像A内部。
5. 携带每patch位置信息（2D RoPE或分数位置嵌入）。

三张图像的batch，336x336（576 token）、224x224（256 token）和448x336（768 token），变成一个1600 token的序列，带有1600x1600的块对角掩码。无padding。无浪费计算。Transformer处理任意纵横比。

NaViT还引入了训练期间的分数patch丢弃——在整个batch中随机丢弃50%的patch——既正则化又加速训练。SigLIP 2继承了这一点。

### AnyRes (LLaVA-NeXT)

LLaVA-NeXT的AnyRes是务实的替代方案。给定高分辨率图像和固定编码器（336的CLIP或SigLIP），平铺图像：

1. 从预定义集合中选择网格布局——(1x1)、(1x2)、(2x1)、(1x3)、(3x1)、(2x2)等——最匹配图像的纵横比。
2. 将完整图像平铺到网格中；每个瓦片变为336x336裁剪。
3. 同时生成缩略图：整张图像调整为336x336作为全局上下文token。
4. 通过冻结的336编码器编码每个瓦片。拼接瓦片token + 缩略图token。

672x672图像在2x2网格加缩略图：4 \* 576 + 576 = 2880个视觉token。昂贵但有效——LLM既看到局部细节又看到全局上下文。

当编码器冻结且仅支持一种分辨率时，AnyRes是首选路线。它对大图像的token数量爆炸（1344x1344图像在4x4网格下是9216 + 576 ≈ 9800 token，填满大部分8k LLM上下文）。

### M-RoPE (Qwen2-VL)

Qwen2-VL引入了多模态旋转位置嵌入。不是NaViT的分数位置或AnyRes的瓦片加缩略图，每个patch携带3D位置（时间、高度、宽度）。查询/键旋转处理任意H、W和时间长度。

M-RoPE原生支持动态分辨率，无需重新训练。推理时你喂入任何HxW图像，patch嵌入器产生H/14 x W/14个token，每个token获得其(t=0, r=row, c=col)位置，RoPE以正确频率旋转注意力，完成。Qwen2.5-VL和Qwen3-VL继续这一点。InternVL3的V2PE是相同想法，每种模态有可变编码。

与AnyRes不同，M-RoPE是O(H x W / P^2)个token在原生分辨率——没有乘法瓦片开销。与NaViT不同，它仍然期望每次前向传播一张图像。跨分辨率批处理仍需要在上面加patch-n'-pack。

### NaFlex (SigLIP 2)

NaFlex是SigLIP 2检查点的原生灵活模式。单一模型在推理时服务多种序列长度（256、729、1024 token）。内部在训练期间使用NaViT风格的patch-n'-pack和每个patch的绝对分数位置。卖点：一个检查点，在推理时根据任务选择token预算。

对于语义任务（分类、检索），256 token。对于OCR或图表理解，1024 token。无需重新训练。

### 打包掩码

块对角掩码是大多数实现绊倒的地方。对于覆盖图像`i=0..B-1`、长度为`n_i`的打包序列，总长度`N_total`，形状为`(N_total, N_total)`的掩码`M`：如果两个索引落在同一图像的块中则为1，否则为0。你可以从累积长度列表构建它：

```
offsets = [0, n_0, n_0+n_1, ..., N_total]
M[i, j] = 1 iff 存在b使得offsets[b] <= i < offsets[b+1] 且 offsets[b] <= j < offsets[b+1]
```

这在PyTorch中用`torch.block_diag`或显式gather一行代码。FlashAttention的可变长度路径（`cu_seqlens`）完全跳过掩码，使用累积长度张量直接在序列内关注——比典型batch的密集掩码快约10倍。

### Token预算

按任务选择策略：

- OCR / 文档：1024-4096 token。SigLIP 2 NaFlex在1024，或AnyRes 3x3 + 缩略图。
- 图表和UI：729-1024 token在384-448原生。Qwen2.5-VL动态分辨率带max像素上限。
- 自然照片：256-576 token就够了。下游LLM看到足够信息。为内容密度高的地方付费。
- 视频：空间池化后每帧64-128 token，2-8 FPS。课程12.17涵盖此内容。

2026年生产规则：选择每任务max像素上限，以原生纵横比编码到该上限，打包batch，跳过padding。Qwen2.5-VL暴露`min_pixels`和`max_pixels`正是为此旋钮。

## 实践

`code/main.py`为具有整数像素坐标的异构图像batch实现patch-n'-pack。它：

- 接收(H, W)图像尺寸列表。
- 在patch大小14下计算每张图像的patch序列长度。
- 将它们打包为总长度`sum(n_i)`的一个序列。
- 构建块对角注意力掩码（密集的，为清晰起见）。
- 比较打包成本vs正方形调整大小和AnyRes平铺。
- 打印混合batch（收据、图表、截图、照片）的token预算表。

运行它。输出的数字就是为什么每个2026年开源VLM使用patch-n'-pack的原因。

## 输出

本课程产生`outputs/skill-resolution-budget-planner.md`。给定混合纵横比工作负载（OCR、图表、照片、视频帧）和总token预算，它选择正确策略（NaFlex、AnyRes、M-RoPE或固定正方形）并输出每请求配置。当你为产品规划VLM规模时使用此技能——它防止杀死延迟预算的静默10x token爆炸。

## 练习

1. 收据是600x1500（1:2.5）。在patch大小14下，原生分辨率有多少token？正方形调整到336后有多少？哪个在实践中损失更多OCR准确率？

2. 为四张长度为256、576、729、1024的图像batch构建块对角掩码。验证注意力矩阵是2585x2585，恰好有`256^2 + 576^2 + 729^2 + 1024^2`个非零条目。

3. 对于1792x896图像在patch 14下，比较：(a) 正方形调整到336然后编码，(b) AnyRes 2x1 + 缩略图，(c) M-RoPE原生。哪个使用最少token？哪个保留最多细节？

4. 实现分数patch丢弃：给定打包序列，均匀随机丢弃50%的token，并相应更新块对角掩码。测量掩码稀疏度变化。

5. 阅读Qwen2-VL论文第3.2节(arXiv:2409.12191)。用两句话描述`min_pixels`和`max_pixels`控制什么以及为什么两个边界都很重要。

## 关键术语

| 术语                    | 常见说法             | 实际含义                                                                   |
| ----------------------- | -------------------- | -------------------------------------------------------------------------- |
| Patch-n'-pack           | "NaViT风格打包"      | 将不同图像的可变长度patch序列拼接到一个batch维度                           |
| 块对角掩码              | "打包掩码"           | 将每张图像的patch限制为只关注自身的注意力掩码，不关注包中的邻居            |
| AnyRes                  | "LLaVA-NeXT平铺"     | 将高分辨率图像分割为固定大小瓦片网格加全局缩略图；用固定编码器编码每个瓦片 |
| NaFlex                  | "SigLIP 2原生灵活"   | 单一SigLIP 2检查点在推理时服务256/729/1024 token预算，无需重新训练         |
| M-RoPE                  | "多模态RoPE"         | 3D旋转位置编码（时间、行、列），无需位置表即可处理任意H、W、T              |
| cu_seqlens              | "FlashAttention打包" | FlashAttention varlen路径使用的累积长度张量，替代密集块对角掩码            |
| min_pixels / max_pixels | "分辨率边界"         | Qwen2.5-VL每请求旋钮，限制非常小或非常大输入的token数量                    |
| 视觉token预算           | "每张图像多少token"  | 每张图像发出的patch token粗略计数；设定LLM的prompt预算和注意力成本         |

## 延伸阅读

- [Dehghani等人 — Patch n' Pack: NaViT (arXiv:2307.06304)](https://arxiv.org/abs/2307.06304)
- [Wang等人 — Qwen2-VL (arXiv:2409.12191)](https://arxiv.org/abs/2409.12191)
- [Laurençon等人 — What matters when building vision-language models? (Idefics2, arXiv:2405.02246)](https://arxiv.org/abs/2405.02246)
- [Tschannen等人 — SigLIP 2 (arXiv:2502.14786)](https://arxiv.org/abs/2502.14786)
- [Qwen Team — Qwen2.5-VL Technical Report (arXiv:2502.13923)](https://arxiv.org/abs/2502.13923)
