---
title: 审核系统OpenAI与Perspective与LlamaGuard
description: '生产审核系统操作化第12-16课的安全策略。OpenAI Moderation API：基于GPT-4o的13类别分类器，支持文本+图像；Llama Guard 3/4：14类MLCommons危害，8种语言(v3)，多模态(v4)；Perspective API：前LLM时代毒性评分基线。三层审核模式：输入审核、输出审核、自定义审核。Azure Content Moderator 2027年2月退役。'
module: 'ai-ethics'
difficulty: advanced
tags:
  - 审核系统
  - 'OpenAI Moderation'
  - 'Llama Guard'
  - 'Perspective API'
  - 三层审核
  - 内容安全
related:
  - 'ai-ethics/前沿安全框架RSP与PF与FSF'
  - 'ai-ethics/前沿模型的上下文内策划'
  - 'ai-ethics/数据溯源与训练数据治理'
  - 'ai-ethics/双用风险网络与生物与化学与核'
prerequisites:
  - 'ai-ethics/谄媚作为RLHF放大器'
---

## 问题定义

第12-16课描述攻击和防御工具。第29课覆盖在用户接触产品的表面操作化防御的已部署审核系统。三层模式是2026年默认配置。

## 核心概念

### OpenAI Moderation API

`omni-moderation-latest` (2024)。基于GPT-4o构建。一次调用分类文本+图像。对大多数开发者免费。

类别（响应模式中的13个布尔值）：

- 骚扰、骚扰/威胁
- 仇恨、仇恨/威胁
- 自伤、自伤/意图、自伤/指导
- 性内容、性内容/未成年人
- 暴力、暴力/血腥
- 违法、违法/暴力

多模态支持适用于`violence`、`self-harm`和`sexual`但不包括`sexual/minors`；其余仅文本。

在多语言测试集上比前代审核端点好42%。按类别评分；应用设置阈值。

### Llama Guard 3/4

第16课已覆盖。14类MLCommons危害（组织方式与OpenAI的13个响应模式布尔值不同）。支持8种语言(v3)。Llama Guard 4（2025年4月）原生多模态，12B。

OpenAI和Llama Guard分类法有重叠但不同。OpenAI有"illicit"作为宽泛类别；Llama Guard分别有"violent crimes"和"non-violent crimes"。部署根据其政策分类法适配选择。

### Perspective API (Google Jigsaw)

前LLM时代（2020年前）的毒性评分系统。类别：TOXICITY、SEVERE_TOXICITY、INSULT、PROFANITY、THREAT、IDENTITY_ATTACK。单维度主分数(TOXICITY)带子维度变体。

广泛用作内容审核研究基线，因为API稳定、有文档、有多年校准数据。对于现代LLM相关用例，Llama Guard或OpenAI Moderation通常更合适。

### 三层模式

1. **输入审核。** 在生成前分类用户提示。如标记则拒绝。延迟：一次分类器调用。
2. **输出审核。** 在交付前分类模型输出。如标记则替换为拒绝。延迟：生成后一次分类器调用。
3. **自定义审核。** 领域特定规则（正则、允许列表、业务策略）。在输入或输出时运行。

三层按设计顺序执行：输入审核必须在生成前完成，输出审核在生成后运行。层内可并行——在同一文本上同时运行多个分类器（如OpenAI Moderation + Llama Guard + Perspective）隐藏每分类器延迟。

### 失败模式

- **仅输入。** 不捕获输出幻觉（第12-14课编码攻击绕过输入分类器）。
- **仅输出。** 允许任何输入到达模型；增加成本；向攻击者暴露内部推理。
- **仅自定义。** 跨类别不鲁棒；正则脆弱。

分层是默认。双重保险。

### Azure退役

Azure Content Moderator：2024年2月弃用，2027年2月退役。由Azure AI Content Safety替代，后者基于LLM并与Azure OpenAI集成。

## 关键术语

| 术语               | 常见说法                 | 实际含义                                         |
| ------------------ | ------------------------ | ------------------------------------------------ |
| OpenAI Moderation  | "omni-moderation-latest" | 基于GPT-4o的13类别(文本)分类器，部分多模态支持   |
| Perspective API    | "Google Jigsaw毒性"      | 前LLM时代毒性评分基线                            |
| Llama Guard        | "MLCommons 14类别"       | Meta危害分类器(v3: 8B文本, 8语言; v4: 12B多模态) |
| Input moderation   | "预生成过滤器"           | 模型调用前的用户提示分类器                       |
| Output moderation  | "后生成过滤器"           | 交付前的模型输出分类器                           |
| Custom moderation  | "领域规则"               | 部署特定规则(正则、允许列表、策略)               |
| Layered moderation | "三层全部"               | 标准生产部署模式                                 |

## 延伸阅读

- OpenAI Moderation API docs — omni-moderation端点
- Meta PurpleLlama + Llama Guard — Llama Guard仓库
- Google Jigsaw Perspective API — 毒性评分
- Azure AI Content Safety — Azure替代
