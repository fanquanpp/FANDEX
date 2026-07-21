---
title: 多模态文档QA视觉优先PDF与表格与图表
description: '2026年文档QA前沿从OCR-then-text转向视觉优先后期交互。ColPali、ColQwen2.5和ColQwen3-omni将每页PDF视为图像，用多向量后期交互嵌入，让查询直接关注patch。在金融10-K、科学论文和手写笔记上大幅超越OCR优先方案。'
module: 'ai-engineering'
difficulty: advanced
tags:
  - 文档QA
  - ColPali
  - 视觉优先
  - 后期交互
  - PDF解析
  - ViDoRe
related:
  - 'ai-engineering/多层网络'
  - 'ai-engineering/多代理软件工程团队'
  - 'ai-engineering/多区域LLM服务与KV缓存局部性'
  - 'ai-engineering/反欺骗与音频水印'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

## 问题

企业坐拥OCR管线会损坏的PDF：带旋转表格的扫描10-K、密集方程式的科学论文、只有作为图像才有意义的图表、手写注释。将这些视为文本优先意味着丢失一半信号。2026年答案是原始页面图像上的后期交互多向量检索。ColPali (Illuin Tech)引入了它；ColQwen2.5-v0.2和ColQwen3-omni推进了准确率。在ViDoRe v3上，视觉优先检索在有意义边际上超越OCR-then-text——差距在图表、表格和手写上扩大。

权衡是存储和延迟。ColQwen嵌入是每页约2048个patch向量，不是单个1024维向量。原始存储膨胀。DocPruner (2026)带来50%剪枝而无可测量准确率损失。

## 核心架构

### 摄取

1. **PDF转图像。** 每页渲染为高分辨率图像。
2. **多向量嵌入。** ColPali/ColQwen将每页编码为patch向量集（约2048个128维向量）。
3. **索引。** MaxSim索引支持高效后期交互检索。

### 检索

1. **查询编码。** 查询文本编码为向量集。
2. **MaxSim搜索。** 计算查询向量与每页patch向量之间的最大相似度求和。
3. **重排序。** 可选交叉编码器重排序。

### 回答生成

检索到的页面图像+查询发送给VLM（Claude、Gemini、Qwen-VL）生成带引用的回答。

## 评估

ViDoRe v3 nDCG@5、端到端QA准确率、服务延迟（2s以下）、与OCR-then-text基线的并排比较。

## 关键术语

| 术语             | 常见说法     | 实际含义                                              |
| ---------------- | ------------ | ----------------------------------------------------- |
| Late interaction | "后期交互"   | 查询和文档在向量级别交互而非单向量                    |
| MaxSim           | "最大相似度" | 后期交互的核心操作：取查询向量与文档patch的最大相似度 |
| Patch vector     | "patch向量"  | 页面图像区域的嵌入向量                                |
| Vision-first     | "视觉优先"   | 直接处理页面图像而非先OCR                             |
| DocPruner        | "文档剪枝"   | 减少50%patch向量而不损失准确率                        |

## 延伸阅读

- ColPali (Illuin Tech) — 视觉优先文档检索
- ColQwen2.5-v0.2 — 改进的视觉检索模型
- ColQwen3-omni — 最新多模态文档检索
- ViDoRe v3 — 文档检索评估基准
