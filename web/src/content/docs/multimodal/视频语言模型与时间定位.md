---
title: 视频语言模型：时间Token与定位
description: 理解视频VLM的时间编码方案、帧采样策略和时间定位输出格式
module: multimodal
difficulty: intermediate
tags:
  - 视频VLM
  - 时间定位
  - TMRoPE
  - 帧采样
  - 'Video-LLaMA'
related:
  - 'multimodal/全能模型Thinker-Talker架构'
  - 'multimodal/任意分辨率与Patch-n-Pack'
  - multimodal/文档与图表理解
  - multimodal/音频语言模型从Whisper到AF3
prerequisites:
  - multimodal/多模态Agent与计算机使用
---

# 视频语言模型：时间Token与定位

> 视频不是一堆照片的堆叠。5秒片段有因果顺序、动作动词和图像模型无法表示的事件时间。Video-LLaMA (Zhang等人, 2023年6月)发布了首个带音频-视觉接地的开放视频LLM。VideoChat和Video-LLaVA扩展了该模式。到2025年Qwen2.5-VL的TMRoPE弥合了与前沿专有模型的差距。每个系统以不同方式解决时间token——每片段Q-Former、每帧拼接池化、每token TMRoPE。本课程阅读这些模式，构建均匀vs动态帧采样器，并在时间定位任务上评估。

**类型:** 构建
**语言:** Python (stdlib, 帧采样器 + 时间定位评估器)
**前置知识:** Phase 12 · 08 (LLaVA-OneVision)
**时间:** ~180分钟

## 学习目标

- 解释为什么时间位置编码独立于视觉编码器改变视频VLM性能。
- 比较均匀、动态FPS和事件驱动帧采样在每秒token数vs定位准确率上的差异。
- 描述每片段Q-Former(Video-LLaMA) vs 每帧池化(Video-LLaVA) vs 每token M-RoPE(Qwen2.5-VL)设计。
- 说出四个视频基准：VideoMME、TempCompass、EgoSchema、Video-MMMU。

## 问题

1分钟30 FPS视频是1800帧。在每帧196个视觉token(ViT-B在224)下，那是352k token——超过任何2024年LLM上下文。

三种缩减策略：

1. 子采样帧(1-8 FPS取决于内容)。
2. 激进池化每帧的patch token(3x3或4x4双线性池化)。
3. 通过Q-Former压缩，取16帧片段输出64个token。

每个权衡不同。子采样丢失时间细节。池化丢失空间细节。Q-Former两者都丢一点但节省token。

时间位置编码是另一个轴：模型如何知道帧5在帧6之前？选项包括简单1D时间RoPE(Video-LLaMA)、学习时间嵌入(Video-LLaVA)和TMRoPE(Qwen2.5-VL，完整3D)。

## 概念

### Video-LLaMA：每片段Q-Former + 音频分支

Video-LLaMA (2023)是首个开放视频LLM。架构：

- 2 FPS下16帧片段(8秒)。
- 每帧ViT特征 → 对所有16帧交叉关注的Video Q-Former → 32个学习查询 → LLM。
- 并行音频分支：波形 → ImageBind音频编码器 → Audio Q-Former → 32个查询 → LLM。

优势：音频-视觉联合推理。劣势：固定片段长度，无任意时间定位。

### VideoChat和Video-LLaVA

VideoChat保留了Video-LLaMA的想法但去掉了音频并简化。Video-LLaVA (Lin等人, 2023)在图像和视频帧上训练单一视觉编码器("投影前对齐")，给出统一表示。两者都是冻结CLIP编码器 + MLP + LLM。

两者都不处理长视频。都是8-16帧系统。

### Qwen2.5-VL和TMRoPE

Qwen2.5-VL引入了TMRoPE——时间-模态旋转位置嵌入。每个patch token携带(t, h, w)位置，其中t是实际时间戳(非帧索引)。

与简单时间嵌入的关键区别：

- 绝对时间，非索引。模型看到"在4.2秒"而非"在第15帧"。
- 每token旋转，非每片段。每个视觉token按其时间戳独立旋转。
- 兼容动态FPS。如果这里以2 FPS采样那里以4 FPS，TMRoPE原生处理不均匀间距。

TMRoPE启用"猫在几秒跳？"查询。模型可以输出"在4.2秒"。Video-LLaMA只能说"片段早期"。

### 帧采样策略

均匀：在时长内均匀采样N帧。简单，丢失运动峰值。

动态FPS：基于运动强度自适应采样。光流或帧差分选择高运动段进行更密集采样。Qwen2.5-VL在此上训练。

事件驱动：运行轻量检测器，在动作发生处采样更多。VideoAgent使用。

关键帧 + 上下文：在镜头边界 + 几个相邻帧采样。用于电影内容。

### 每帧池化

1 FPS和每帧576 token下，5分钟片段是172,800 token。Qwen2.5-VL-72B的128k上下文可以但昂贵。

3x3双线性池化减少到每帧64 token → 5分钟19,200 token。大多数任务的甜蜜点。

更激进池化(6x6 → 每帧16 token)用于空间细节不太重要的agent工作流。

### 四个视频基准

- VideoMME：综合视频理解，短+中+长。
- TempCompass：细粒度时间推理，"之前"/"之后"问题。
- EgoSchema：长时距第一人称视频。
- Video-MMMU：多模态多学科视频问题。

完整视频VLM评估命中全部四个。它们压力测试不同轴——TempCompass全是关于排序，EgoSchema是3分钟以上推理，VideoMME跨越时长。

### 定位输出格式

时间定位的输出格式：

- 自由文本："猫在4秒左右跳了。"容易解析但不精确。
- 结构化JSON：`{"event": "jump", "start": 4.1, "end": 4.3}`。Qwen2.5-VL训练此格式。
- 基于Token：与答案交错的特殊`<time>4.1</time>` token。Qwen2.5-VL的内部格式。

基于Token对下游使用最准确。Qwen2.5-VL的JSON输出格式直接解析。

### 2026年最佳实践

2026年视频VLM：

- 编码器：带M-RoPE或TMRoPE的SigLIP 2(Qwen2.5-VL)。
- 帧采样：动态FPS(1-4取决于运动)带最大帧上限。
- 每帧池化：3x3双线性。
- 输出：带时间+事件字段的结构化JSON。
- 基准：VideoMME + TempCompass用于通用；EgoSchema用于长时距。

## 实践

`code/main.py`包括：

- 均匀和动态FPS帧采样器。
- toy时间定位评估器：给定时间T的"真实"事件和模型输出，在容差内评分准确率。
- Video-LLaMA(16帧，Q-Former)、Video-LLaVA(8帧，MLP)、Qwen2.5-VL(动态FPS + TMRoPE)的比较。

## 输出

本课程产生`outputs/skill-video-vlm-frame-planner.md`。给定视频任务(监控、动作识别、时间定位、摘要)，它选择帧采样器、池化因子、输出格式和预期准确率层级。

## 练习

1. 对于3分钟烹饪演示，选择均匀vs动态FPS。用token数量论证。

2. TMRoPE具体添加了什么简单时间嵌入表做不到的？

3. 为VLM可以学习发出的时间定位写一个JSON schema。包括错误情况。

4. 阅读Video-LLaVA第3节关于"投影前对齐"。为什么这比训练独立图像和视频编码器更好？

5. 给定VideoMME排行榜，2026年顶级开放模型和顶级专有模型之间的差距是多少？该差距有多少归因于时间编码vs基座LLM规模？

## 关键术语

| 术语           | 常见说法          | 实际含义                                 |
| -------------- | ----------------- | ---------------------------------------- |
| 时间定位       | "时间定位答案"    | VLM为事件发生时间输出特定时间戳范围      |
| TMRoPE         | "时间-多模态RoPE" | 带绝对时间戳的3D旋转位置，Qwen2.5-VL使用 |
| 动态FPS        | "运动感知采样"    | 在高运动段采样更多帧，静态段更少         |
| 帧池化         | "每帧空间压缩"    | 在LLM前用双线性插值减少每帧patch         |
| Video Q-Former | "片段压缩器"      | 将N帧映射到K个学习查询的交叉注意力瓶颈   |
| VideoMME       | "视频基准"        | 综合短/中/长视频基准，2500+样本          |

## 延伸阅读

- [Zhang等人 — Video-LLaMA (arXiv:2306.02858)](https://arxiv.org/abs/2306.02858)
- [Li等人 — VideoChat (arXiv:2305.06355)](https://arxiv.org/abs/2305.06355)
- [Lin等人 — Video-LLaVA (arXiv:2311.10122)](https://arxiv.org/abs/2311.10122)
- [Qwen Team — Qwen2.5-VL (arXiv:2502.13923)](https://arxiv.org/abs/2502.13923)
- [Lin等人 — VILA-1.5 (arXiv:2312.07533)](https://arxiv.org/abs/2312.07533)
