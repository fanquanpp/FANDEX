---
title: ColPali与视觉原生文档RAG
description: 理解ColPali如何跳过OCR直接嵌入页面图像实现视觉原生检索
module: multimodal
difficulty: intermediate
tags:
  - ColPali
  - 视觉RAG
  - ColBERT
  - MaxSim
  - 文档检索
  - PaliGemma
related:
  - multimodal/Chameleon与早期融合
  - multimodal/CLIP与对比预训练
  - multimodal/Emu3下一token预测生成
  - multimodal/Flamingo与门控交叉注意力
prerequisites:
  - multimodal/多模态Agent与计算机使用
---

# ColPali与视觉原生文档RAG

> 传统RAG将PDF解析为文本，分割为块，嵌入块，存储向量。每步丢失信号：OCR丢弃图表数据，分块破坏表格行，文本嵌入忽略图表。ColPali (Faysse等人, 2024年7月)问了更简单的问题：为什么要提取文本？通过PaliGemma直接嵌入页面图像，使用ColBERT风格的后期交互进行检索，保留文档携带的所有布局、图表、字体和格式信号。发布基准：在视觉丰富文档上端到端准确率比文本RAG高20-40%。ColQwen2、ColSmol和VisRAG扩展了该模式。本课程阅读视觉原生RAG论点并构建一个微型ColPali类索引器。

**类型:** 构建
**语言:** Python (stdlib, 多向量索引器 + MaxSim评分器)
**前置知识:** Phase 11 (LLM工程 — RAG基础), Phase 12 · 05 (LLaVA)
**时间:** ~180分钟

## 学习目标

- 解释双编码器检索(每文档一个向量)和后期交互检索(每文档多个向量)的区别。
- 描述ColBERT的MaxSim操作以及ColPali如何将其从文本token泛化到图像patch。
- 构建微型ColPali类索引器：页面 → patch嵌入 → 查询词嵌入上的MaxSim → top-k页面。
- 比较ColPali + Qwen2.5-VL生成器 vs 文本RAG + GPT-4在发票/财务报告用例上的表现。

## 问题

PDF上的文本RAG丢弃了文档的大部分信息。财务报告的Q3收入增长通常在图表中；医学报告的发现带标注图像；法律合同的签名块是布局事实，不是文本事实。

文本RAG管道：

1. PDF → 通过OCR / pdftotext提取文本。
2. 文本 → 300-500 token块。
3. 块 → 双编码器嵌入(一个向量)。
4. 用户查询 → 嵌入 → 余弦相似度 → top-k块。
5. 块 + 查询 → LLM。

五个有损步骤。图表未捕获。表格跨块断裂。多栏布局展平。图表标注消失。

ColPali的修复：跳过OCR，直接嵌入页面图像。使用ColBERT风格后期交互进行检索，这样模型可以在查询时关注细粒度patch。

## 概念

### ColBERT (2020)

ColBERT (Khattab & Zaharia, arXiv:2004.12832)是文本检索方法。不是每文档一个向量，而是每token一个向量。查询时：

- 查询token获得自己的嵌入(N_q个向量)。
- 文档token获得嵌入(N_d个向量，通常缓存)。
- 分数 = 查询token上对文档token余弦相似度最大值的求和：Sum_i max_j cos(q_i, d_j)。

这就是MaxSim操作。每个查询token"挑选"其最佳匹配文档token。最终分数是总和。

优点：强回忆率，处理词级语义。缺点：每文档N_d个向量，存储昂贵。

### ColPali

ColPali (Faysse等人, arXiv:2407.01449)将ColBERT模式应用于图像。

- 每页由PaliGemma(ViT + 语言)编码为patch嵌入：每页N_p个向量。
- 每个用户查询(文本)编码为查询token嵌入：N_q个向量。
- 分数 = Sum_i max_j cos(q_i, p_j)，即查询文本token和页面图像patch上的MaxSim。
- 按总分检索top-k页面。

文档摄入时：用PaliGemma嵌入每页，存储所有patch嵌入。查询时：嵌入查询token，对所有存储的页面嵌入计算MaxSim，返回top-k页面。

优点：在视觉丰富文档上端到端比文本RAG好20-40%。每个patch向量捕获局部布局和内容。

缺点：每页N_p个patch x 4字节浮点 x D维向量 = 存储增长快。通过PQ / OPQ量化缓解。

### ColQwen2和ColSmol

ColQwen2 (illuin-tech, 2024-2025)将PaliGemma换为Qwen2-VL。更好的基座编码器，更好的检索。

ColSmol是用于本地/边缘使用的更小规模变体。约1B参数的ColSmol检索器可在消费级GPU上运行。

### VisRAG

VisRAG (Yu等人, arXiv:2410.10594)是不同变体：不是patch上的MaxSim，而是用VLM将每页池化为单一向量然后双编码器检索。更快索引+更小存储，更弱回忆率。

质量vs成本权衡：ColPali为质量，VisRAG为规模。

### M3DocRAG

M3DocRAG (Cho等人, arXiv:2411.04952)将多模态检索扩展到多页多文档推理。跨文档检索页面，为VLM组合多页上下文。

### ViDoRe — 基准

ColPali的配套基准。视觉文档检索评估。任务包括财务报告、科学论文、行政文档、医疗记录、手册。指标：nDCG@5。

ColPali-v1在ViDoRe上得分约80% nDCG@5；相同文档上文本RAG得分约50-60%。

### 端到端RAG管道

视觉原生RAG：

1. 摄入：PDF → 页面图像 → PaliGemma编码 → 存储所有patch嵌入。
2. 查询：用户文本 → 查询token嵌入 → 对所有索引页面的MaxSim → top-k页面。
3. 生成：top-k页面图像 + 查询 → VLM(Qwen2.5-VL或Claude) → 答案。

全程无OCR。图表、图表、字体、布局全部流入答案。

### 存储数学

50页财务报告，每页729个patch，128维嵌入：

- ColPali：50 _ 729 _ 128 \* 4字节 = 约18 MB原始，PQ后约4 MB。
- 文本RAG：50块 _ 768维 _ 4字节 = 约150 kB。

ColPali每文档存储约多30倍。大规模下，OPQ / PQ将其降至约5-10倍，通常可接受。

### 文本RAG何时仍然获胜

- 无布局信号的纯文本文档(wiki文章、聊天日志)。文本RAG更简单且存储更便宜。
- 存储主导成本的数百万页档案。
- 要求可提取OCR文本伴随检索的严格监管要求。

2026年其他一切——财务报告、科学论文、法律合同、医疗记录、UX文档——视觉原生RAG获胜。

## 实践

`code/main.py`：

- toy patch编码器：将"页面"(特征向量小网格)映射为patch嵌入数组。
- MaxSim评分器：计算查询token嵌入集和页面patch集之间的ColBERT风格分数。
- 索引5个toy页面，运行3个查询，返回带分数的top-k。

## 输出

本课程产生`outputs/skill-vision-rag-designer.md`。给定文档RAG项目，选择ColPali / ColQwen2 / VisRAG / 文本RAG并确定存储规模。

## 练习

1. 200页年度报告，每页729个patch，128维嵌入，4字节浮点。计算原始存储和PQ压缩(8x)后存储。

2. MaxSim是Sum_i max_j cos(q_i, p_j)。这个和捕获了简单平均相似度不能捕获的什么？

3. ColPali将页面索引为patch集。如果我们改为在词级索引(如ColBERT)会怎样变化？权衡？

4. 为100万页语料库设计端到端管道，每查询延迟预算500ms。选择ColQwen2 / VisRAG并论证。

5. 阅读M3DocRAG (arXiv:2411.04952)。描述多页注意力模式以及它如何不同于单页ColPali检索。

## 关键术语

| 术语      | 常见说法        | 实际含义                                              |
| --------- | --------------- | ----------------------------------------------------- |
| 后期交互  | "ColBERT风格"   | 使用每token或每patch嵌入 + MaxSim的检索，非单文档向量 |
| MaxSim    | "Patch上取最大" | 对每个查询token选最高相似度文档token；跨查询求和      |
| 双编码器  | "单向量"        | 每文档一个向量；更快但丢失粒度                        |
| 多向量    | "每文档多向量"  | 每文档/页面存储N_p个向量；存储成本增长但回忆率改善    |
| Patch嵌入 | "页面特征"      | VLM编码器每图像patch一个向量，每页缓存                |
| ViDoRe    | "视觉文档基准"  | ColPali的视觉文档检索基准套件                         |
| PQ量化    | "乘积量化"      | 在缩小存储约8倍的同时维持向量相似度的压缩             |

## 延伸阅读

- [Faysse等人 — ColPali (arXiv:2407.01449)](https://arxiv.org/abs/2407.01449)
- [Khattab & Zaharia — ColBERT (arXiv:2004.12832)](https://arxiv.org/abs/2004.12832)
- [Yu等人 — VisRAG (arXiv:2410.10594)](https://arxiv.org/abs/2410.10594)
- [Cho等人 — M3DocRAG (arXiv:2411.04952)](https://arxiv.org/abs/2411.04952)
- [illuin-tech/colpali GitHub](https://github.com/illuin-tech/colpali)
