---
title: 'Qwen-VL家族与动态FPS视频'
description: '理解Qwen-VL家族的M-RoPE、动态FPS采样和结构化Agent输出'
module: multimodal
difficulty: advanced
tags:
  - 'Qwen-VL'
  - 'M-RoPE'
  - 动态FPS
  - 视频理解
  - Agent输出
related:
  - multimodal/LLaVA与视觉指令微调
  - multimodal/MIO任意到任意流式模型
  - 'multimodal/Show-o离散扩散统一模型'
  - multimodal/Transfusion双损失统一模型
prerequisites:
  - multimodal/多模态Agent与计算机使用
---

# Qwen-VL家族与动态FPS视频

> Qwen-VL家族——Qwen-VL (2023)、Qwen2-VL (2024)、Qwen2.5-VL (2025)、Qwen3-VL (2025)——是2026年最有影响力的开源视觉语言模型谱系。每一代做了一个决定性的架构赌注，开源生态系统在十二个月内复制：通过M-RoPE的原生动态分辨率、带绝对时间对齐的动态FPS采样、ViT中的窗口注意力，以及结构化agent输出格式。到Qwen3-VL，方案已稳定：2D-RoPE-ViT编码器带原生纵横比输入，MLP投影器到大型Qwen3语言基座，训练阶段强调OCR、定位和agent行为为一等目标。本课程按时间顺序阅读家族，让你理解为什么每个旋钮在它所在的位置。

**类型:** 学习
**语言:** Python (stdlib, M-RoPE编码器 + 动态FPS采样器)
**前置知识:** Phase 12 · 06 (patch-n'-pack)
**时间:** ~120分钟

## 学习目标

- 计算M-RoPE的三轴旋转（时间、高度、宽度）并解释为什么三个都需要。
- 为视频选择动态FPS采样策略，并推理每秒token vs 事件检测准确率。
- 按顺序说出四个Qwen-VL代际升级以及每个启用了什么。
- 连接Qwen2.5-VL风格的JSON agent输出格式并从VLM响应中解析结构化工具调用。

## 问题

Qwen-VL于2023年8月发布，作为对LLaVA-1.5和BLIP-2的直接回应。Qwen团队瞄准的差距有三方面：分辨率、视频和结构化输出。

分辨率：LLaVA-1.5在336x336运行。适合照片，对中文发票或密集电子表格截图无用。Qwen-VL的第一个创新是448x448和定位边界框输出，让模型能指向事物。

视频：Video-LLaMA堆叠每帧编码器并喂给LLM。对短片段有效，对多分钟视频无效，其中时间轴是信号。Qwen团队想要一个理解时间的单一编码器。

结构化输出：LLaVA发出自由格式文本。Agent需要JSON。Qwen-VL在显式JSON输出格式上训练，包括边界框坐标作为文本。

每个Qwen-VL代际扩展这三个轴之一。

## 概念

### Qwen-VL (2023年8月)

第一代：OpenCLIP ViT-bigG/14作为编码器（2.5B参数），LLama兼容Q-Former（256查询1步），Qwen-7B基座。贡献：

- 448x448分辨率（当时开源VLM的SOTA）。
- 定位：在带显式坐标token输出的图像-文本对上训练。"猫在<box>(112, 204), (280, 344)</box>"。
- 从一开始的中英双语训练。

当时基准：在英语上与GPT-4V竞争，在中文上主导。定位监督是真正的头条。

### Qwen2-VL (2024年9月) — M-RoPE和原生分辨率

Qwen2-VL用原生动态分辨率ViT编码器替换了固定分辨率 + Q-Former堆栈。关键变化：

- 原生动态分辨率。ViT接受任何能被28整除的HxW（patch 14带2x空间合并）。1120x672的图像（40x24合并patch）产生960个视觉token。无调整大小，无平铺，无缩略图。
- M-RoPE（多模态RoPE）。每个token携带3D位置(t, h, w)而非1D。图像t=0，视频t = frame_index。RoPE按轴频率旋转查询/键向量。无位置嵌入表。
- MLP投影器。放弃Q-Former；在合并patch token上使用2层MLP。
- 动态FPS视频。视频默认以1-2 FPS采样，但模型接受任意帧数。

结果：Qwen2-VL-7B在多个多模态基准上匹配GPT-4o，在DocVQA上击败它(94.5 vs 88.4)。架构变化是决定性举措。

### Qwen2.5-VL (2025年2月) — 动态FPS + 绝对时间

Qwen2.5-VL的重大转变是视频。动态FPS不仅是"需要时采样更多帧"。论文形式化了：

- 绝对时间token。不是位置索引（帧0, 1, 2...），使用实际时间戳。"在0:04，猫跳了。"模型看到`<time>0.04</time>` token与帧token交错。
- 动态FPS。慢镜头以1 FPS采样，动作以4+ FPS。用户或训练者选择；M-RoPE适应。
- ViT中的窗口注意力。空间注意力在块内局部窗口化以提高吞吐量；每隔几层添加全局注意力。
- 显式JSON输出格式。在工具调用数据上训练：`{"tool": "click", "coords": [380, 220]}`。开箱即用的agent就绪。
- MRoPE-v2缩放。位置随最大输入大小缩放，使10分钟视频不会用完频率范围。

基准：Qwen2.5-VL-72B在大多数视频基准上击败GPT-4o，在文档上匹配Gemini 2.0，并设定GUI定位的开源SOTA（ScreenSpot：84%准确率 vs GPT-4o的38%）。

### Qwen3-VL (2025年11月)

Qwen3-VL是增量升级，巩固而非重新发明：更大LLM骨干(Qwen3-72B)，扩展训练数据，改进OCR，通过Qwen3"思考模式"更强推理。ViT和M-RoPE保持。论文关注数据和训练改进而非架构。

谱系要点：到2025年Qwen-VL架构已稳定。后续代际缩放计算和数据，而非原语。

### M-RoPE数学

经典RoPE使用配对坐标按位置`m`旋转维度`d`的查询`q`：

```
q_rot[2i]   = q[2i]   * cos(m * theta_i) - q[2i+1] * sin(m * theta_i)
q_rot[2i+1] = q[2i]   * sin(m * theta_i) + q[2i+1] * cos(m * theta_i)
theta_i     = 10000^(-2i/d)
```

M-RoPE将隐藏维度分为三个频段。假设`d = 96`。分配32维给时间，32给高度，32给宽度。每个频段按自己的轴位置旋转。(t=5, h=10, w=20)处的patch获得旋转`R_t(5)`、`R_h(10)`、`R_w(20)`应用于其三个频段。

文本token使用`t = text_index, h = 0, w = 0`（或归一化选择），保持兼容性。视频帧使用`t = frame_time, h = row, w = col`。单图像使用`t = 0`。

好处：一个位置编码处理文本、图像和视频，无需分支代码或不同位置表。

### 动态FPS采样逻辑

给定时长`T`秒的视频和目标token预算`B`：

1. 计算你能承受的最大FPS：`fps_max = B / (T * tokens_per_frame)`。
2. 从`{1, 2, 4, 8}`中选择满足`fps <= fps_max`的目标FPS。
3. 如果运动强度高（光流启发式或显式用户请求），选择更高FPS。如果运动强度低，选择更低。
4. 以所选FPS均匀采样；在帧之间插入`<time>t</time>` token。

Qwen2.5-VL隐式训练此逻辑；推理时用户通过`fps`参数控制。60秒动作序列以4 FPS每帧81 token = 19440 token，在32k上下文中可管理。

### 结构化Agent输出

Qwen2.5-VL的agent训练明确针对结构化工具调用：

```
{
  "tool": "mouse_click",
  "coords": [1024, 512],
  "button": "left",
  "modifier": null
}
```

解析是确定性的：对模型输出进行JSON.parse。与需要正则和歧义处理的自由格式"click at (1024, 512)"相比。这种转变是Qwen2.5-VL的ScreenSpot分数从Qwen2-VL的55%跳到84%的原因。

## 实践

`code/main.py`实现了：

- 混合文本、图像patch和视频帧的打包序列的M-RoPE位置计算。
- 动态FPS采样器：给定(时长, 预算, 运动级别)，选择FPS并输出帧时间戳。
- 处理带坐标字段工具调用响应的toy Qwen2.5-VL JSON输出解析器。

运行它，然后感受在5分钟视频上将固定FPS换为动态FPS的差异。

## 输出

本课程产生`outputs/skill-qwen-vl-pipeline-designer.md`。给定视频任务（监控、agent、动作识别、无障碍），它输出Qwen2.5-VL配置（帧预算、FPS策略、窗口注意力标志、agent输出模式）和延迟估算。每当你为视频产品部署Qwen-VL家族模型时使用。

## 练习

1. 计算patch在(t=3, h=5, w=7)处的M-RoPE旋转，隐藏维度48（每频段16，基础theta 10000）。展示每个频段前三对的旋转角度。

2. 10分钟安防摄像头录像以1 FPS产生多少帧？在384分辨率3x池化下，总共多少token？Qwen2.5-VL的默认32k上下文能处理吗？

3. 为30秒网球拉锯战 vs 30秒食谱演示 vs 30秒UI agent录制选择FPS。用动态FPS逻辑论证每个。

4. Qwen2.5-VL完全放弃了Q-Former。为什么简单MLP在2025年可行但在2023年不行？（提示：数据规模和编码器质量。）

5. 将三个Qwen2.5-VL JSON工具调用输出解析为Python字典。格式错误的JSON会失败什么，Qwen cookbook推荐的恢复策略是什么？

## 关键术语

| 术语                    | 常见说法      | 实际含义                                                     |
| ----------------------- | ------------- | ------------------------------------------------------------ |
| M-RoPE                  | "多模态RoPE"  | 隐藏维度中带时间、高度和宽度频段的3D旋转位置嵌入             |
| 动态FPS                 | "智能采样"    | 基于运动、时长和token预算按视频选择的帧采样率                |
| 绝对时间token           | "时间戳token" | 在序列中交错的`<time>t</time>`，使模型看到实际秒数而非帧索引 |
| 窗口注意力              | "局部注意力"  | 为速度限制在小窗口内的空间自注意力；周期性添加全局注意力     |
| 结构化Agent输出         | "JSON模式"    | 教VLM发出带坐标和工具名的可解析JSON的训练数据监督            |
| min_pixels / max_pixels | "分辨率边界"  | Qwen2.5-VL每请求控制，限制总像素数从而限制token数            |
| 定位                    | "指向它"      | 将边界框坐标作为文本token输出；自Qwen-VL v1起使用            |

## 延伸阅读

- [Bai等人 — Qwen-VL (arXiv:2308.12966)](https://arxiv.org/abs/2308.12966)
- [Wang等人 — Qwen2-VL (arXiv:2409.12191)](https://arxiv.org/abs/2409.12191)
- [Qwen Team — Qwen2.5-VL Technical Report (arXiv:2502.13923)](https://arxiv.org/abs/2502.13923)
- [Qwen Team — Qwen3-VL (arXiv:2511.21631)](https://arxiv.org/abs/2511.21631)
- [Zhu等人 — InternVL3 (arXiv:2504.10479)](https://arxiv.org/abs/2504.10479)
