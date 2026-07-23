---
title: 文档与图表理解
description: 理解文档AI的三代演进：OCR管道、无OCR模型和VLM原生方案
module: multimodal
difficulty: intermediate
tags:
  - 文档理解
  - OCR
  - Donut
  - Nougat
  - LayoutLM
  - PaliGemma
related:
  - 'multimodal/任意分辨率与Patch-n-Pack'
  - multimodal/视频语言模型与时间定位
  - multimodal/音频语言模型从Whisper到AF3
  - multimodal/长视频百万Token理解
prerequisites:
  - multimodal/多模态Agent与计算机使用
---

# 文档与图表理解

> 文档不是照片。PDF、科学论文、发票或手写表单有布局、表格、图表、脚注、页眉和纯图像理解无法捕获的语义结构。VLM前的栈是管道：Tesseract OCR + LayoutLMv3 + 表格提取启发式。VLM浪潮用无OCR模型——Donut (2022)、Nougat (2023)、DocLLM (2023)——替换了它，直接发出结构化标记。到2026年前沿就是"将页面图像以2576px原生分辨率喂给Claude Opus 4.7"，结构化标记输出免费获得。本课程阅读文档AI的三代弧线。

**类型:** 构建
**语言:** Python (stdlib, 布局感知文档解析器骨架)
**前置知识:** Phase 12 · 05 (LLaVA), Phase 5 (NLP)
**时间:** ~180分钟

## 学习目标

- 解释文档AI的三个时代：OCR管道、无OCR、VLM原生。
- 描述LayoutLMv3的三个输入流：文本、布局(bbox)、图像patch，带统一掩码。
- 比较Donut(无OCR，图像→标记)、Nougat(科学论文→LaTeX)、DocLLM(布局感知生成式)、PaliGemma 2(VLM原生)。
- 为新任务(发票、科学论文、手写表单、中文收据)选择文档模型。

## 问题

"理解这个PDF"看似简单实则困难。信息存在于：

- 文本内容(90%的信号)。
- 布局(页眉、脚注、侧边栏、双栏格式)。
- 表格(行、列、合并单元格)。
- 图表和示意图。
- 手写标注。
- 字体和排版(标题vs正文)。

原始OCR转储文本但丢失其余。关心发票的系统需要知道"Total: $1,245"来自右下角，而非脚注。

## 概念

### 时代1 — OCR管道(2021年前)

经典栈：

1. PDF → 每页图像。
2. Tesseract(或商业OCR)提取带每词边界框的文本。
3. 布局分析器识别块(页眉、表格、段落)。
4. 表格结构识别器解析表格。
5. 领域规则 + 正则提取字段。

适用于清晰印刷文本。在手写、倾斜扫描、复杂表格、非英语脚本上失败。每种失败模式需要自定义异常路径。

### TrOCR (2021)

TrOCR (Li等人, arXiv:2109.10282)用训练在合成+真实文本图像上的Transformer编码器-解码器替换了Tesseract的经典CNN-CTC。在手写和多语言文本上干净获胜。仍然是管道(检测器然后TrOCR然后布局)，但OCR步骤大幅改善。

### 时代2 — 无OCR(2022-2023)

首批无OCR模型说：完全跳过检测，直接将图像像素映射到结构化输出。

Donut (Kim等人, arXiv:2111.15664)：

- 编码器-解码器Transformer，编码器是Swin-B。
- 输出是表单理解的JSON、摘要的markdown或任何任务特定schema。
- 无OCR、无布局、无检测。

Nougat (Blecher等人, arXiv:2308.13418)：

- 专门在科学论文上训练。
- 输出是LaTeX / markdown。
- 处理公式、多栏布局、图表。
- 每个arXiv解析器调用的模型。

这些是专家，不是通才。Donut在科学论文上失败；Nougat在发票上失败。

### LayoutLMv3 (2022)

不同路线。LayoutLMv3 (Huang等人, arXiv:2204.08387)保留OCR但添加布局理解：

- 三个输入流：OCR文本token、每token 2D边界框、图像patch。
- 跨所有三种模态的掩码训练目标(掩码文本、掩码patch、掩码布局)。
- 下游：分类、实体提取、表格QA。

LayoutLMv3是基于OCR文档理解的巅峰。在表单和发票上强。需要上游OCR。标准化文档基准上最佳VLM前准确率。

### DocLLM (2023)

DocLLM (Wang等人, arXiv:2401.00908)是LayoutLM的生成式兄弟。基于布局token条件生成自由形式答案。更适合文档QA；仍依赖OCR输入。

### 时代3 — VLM原生(2024+)

2024年VLM变得足够好以完全替换管道。将完整页面图像以高分辨率喂给VLM，提问，获得答案。

- LLaVA-NeXT 336瓦片AnyRes适用于小文档。
- Qwen2.5-VL动态分辨率原生处理2048+像素。
- Claude Opus 4.7支持2576px文档。
- PaliGemma 2 (2025年4月)专门为文档+手写训练。

VLM原生与OCR管道的差距快速缩小。到2026年，VLM原生在以下方面获胜：

- 场景文本(手写+印刷，混合脚本)。
- 带合并单元格的复杂表格。
- 嵌入文本的数学公式。
- 带文本标注的图表。

OCR管道仍在以下方面获胜：

- 每页延迟重要的大规模纯扫描工作负载。
- 管道可靠性(确定性失败vs VLM幻觉)。
- 要求可审计OCR输出的监管环境。

### Claude 4.7 / GPT-5前沿

在2576像素原生输入下，前沿VLM以接近人类准确率做文档理解。2026年初基准数字：

- DocVQA：Claude 4.7约95.1，PaliGemma 2约88.4，Nougat约77.3，管道LayoutLMv3约83。
- ChartQA：Claude 4.7约92.2，GPT-4V约78。
- VisualMRC：Claude 4.7约94。

封闭模型差距主要是分辨率和基座LLM规模。7B开放模型落后几分但正在追赶。

### 数学公式和LaTeX输出

科学论文需要公式的精确LaTeX输出。Nougat在此上训练。带LaTeX目标训练的VLM(Qwen2.5-VL-Math, Nougat衍生品)产生可用LaTeX。没有显式LaTeX训练，VLM产生可读但不精确的转录。

2026年科学论文管道：在PDF上链式调用Nougat，然后在困难页面上用VLM。

### 手写

仍然是最难的子任务。混合印刷+手写(医生笔记、填写表单)是OCR管道在成本上仍然击败VLM的地方。纯手写VLM正在改进(Claude 4.7, PaliGemma 2)。

### 2026年方案

新文档AI项目：

- 大规模纯印刷发票：LayoutLMv3 + 规则，成本高效。
- 混合文档(科学+手写+表单)：VLM原生(PaliGemma 2或Qwen2.5-VL)。
- 完整arXiv摄入：Nougat用于数学，VLM用于图表。
- 监管：OCR管道 + VLM验证器交叉检查。

## 实践

`code/main.py`：

- toy布局感知分词器：给定(文本, bbox)对，产生LayoutLMv3风格输入。
- Donut风格任务schema生成器：表单的JSON模板。
- OCR管道、Donut、Nougat和VLM原生每页token预算比较。

## 输出

本课程产生`outputs/skill-document-ai-stack-picker.md`。给定文档AI项目(领域、规模、质量、监管)，在OCR管道、无OCR专家和VLM原生之间选择。

## 练习

1. 你的项目每天1000万发票。哪种栈在不损失准确率的情况下最小化每页成本？

2. 为什么LayoutLMv3在表单QA上优于纯CLIP-VLM但在场景文本上表现不佳？bbox流放弃了什么？

3. Nougat生成LaTeX。提出一个VLM原生输出在LaTeX保真度上击败Nougat的测试用例，以及Nougat获胜的用例。

4. 阅读PaliGemma 2论文(Google, 2024)。相比PaliGemma 1提升文档准确率的关键训练数据添加是什么？

5. 设计监管安全混合方案：OCR管道为主，VLM为辅交叉检查。你如何解决不一致？

## 关键术语

| 术语     | 常见说法        | 实际含义                                              |
| -------- | --------------- | ----------------------------------------------------- |
| OCR管道  | "Tesseract风格" | 分阶段栈：检测→OCR→布局→规则；确定性但脆弱            |
| 无OCR    | "Donut风格"     | 跳过显式OCR的图像到输出Transformer；单一模型          |
| 布局感知 | "LayoutLM"      | 输入包含每token bbox坐标；跨模态统一掩码              |
| VLM原生  | "前沿VLM"       | 直接将页面图像喂给Claude/GPT/Qwen VLM高分辨率；无管道 |
| DocVQA   | "文档基准"      | 文档VQA标准；最常引用的分数                           |
| 标记输出 | "LaTeX / MD"    | 结构化输出格式而非自由文本；启用下游自动化            |

## 延伸阅读

- [Li等人 — TrOCR (arXiv:2109.10282)](https://arxiv.org/abs/2109.10282)
- [Blecher等人 — Nougat (arXiv:2308.13418)](https://arxiv.org/abs/2308.13418)
- [Huang等人 — LayoutLMv3 (arXiv:2204.08387)](https://arxiv.org/abs/2204.08387)
- [Kim等人 — Donut (arXiv:2111.15664)](https://arxiv.org/abs/2111.15664)
- [Wang等人 — DocLLM (arXiv:2401.00908)](https://arxiv.org/abs/2401.00908)
