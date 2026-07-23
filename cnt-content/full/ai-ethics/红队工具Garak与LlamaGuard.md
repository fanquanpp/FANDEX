---
title: 红队工具Garak与LlamaGuard
description: '2026年红队栈三大生产工具：Llama Guard (Meta) — 14类MLCommons危害分类器；Garak (NVIDIA) — 开源LLM漏洞扫描器，含静态/动态/自适应探针；PyRIT (Microsoft) — 多轮红队战役编排器，支持Crescendo和TAP。三者构成生产红队评估的默认配置。'
module: 'ai-ethics'
difficulty: advanced
tags:
  - 'Llama Guard'
  - Garak
  - PyRIT
  - 红队工具
  - MLCommons
  - 安全分类器
related:
  - 'ai-ethics/公平性标准群体个体与反事实'
  - 'ai-ethics/红队测试PAIR与自动化攻击'
  - 'ai-ethics/间接提示注入与生产攻击面'
  - 'ai-ethics/监管框架EU与US与UK与韩国'
prerequisites:
  - 'ai-ethics/谄媚作为RLHF放大器'
---

## 问题定义

第12-15课呈现攻击面。生产部署需要可重复、可扩展的评估。三种工具主导2026年：Llama Guard（防御分类器）、Garak（扫描器）、PyRIT（战役编排器）。每种针对红队生命周期的不同层。

## 核心概念

### Llama Guard (Meta)

Llama Guard 3是基于Llama-3.1-8B的模型，针对MLCommons AILuminate 14类危害微调：

- 暴力犯罪、非暴力犯罪、性相关、CSAM、诽谤
- 专业建议、隐私、知识产权、无差别武器、仇恨
- 自杀/自伤、性内容、选举、代码解释器滥用

支持8种语言。用法：放在LLM之前（输入审核）、LLM之后（输出审核）或两者兼有。两种用途产生不同训练分布——Llama Guard 3以单一模型处理两者。

Llama Guard 3-1B-INT4 (arXiv:2411.17713, 440MB, 移动CPU上约30 tokens/s) 是量化边缘变体。

Llama Guard 4（2025年4月）为12B，原生多模态，从Llama 4 Scout剪枝。用一个分类器替代8B文本和11B视觉前身，可摄入文本+图像。

### Garak (NVIDIA)

开源漏洞扫描器。架构：

- **探针(Probes)。** 幻觉、数据泄露、提示注入、毒性、越狱的攻击生成器。静态（固定提示）、动态（生成提示）、自适应（响应目标输出）。
- **检测器(Detectors)。** 按预期失败模式评分输出——有毒、泄露、越狱。
- **线束(Harnesses)。** 管理探针-检测器对，运行战役，生成报告。

TrustyAI将Garak与Llama-Stack shields（Prompt-Guard-86M输入分类器，Llama-Guard-3-8B输出分类器）集成，用于端到端屏蔽目标评估。基于层的评分(TBSA)替代二元通过/失败——模型可以在同一探针上通过严重性层3但失败于严重性层5。

### PyRIT (Microsoft)

Python Risk Identification Toolkit。多轮红队战役。核心组件：

- **转换器(Converters)。** 变换种子提示——释义、编码、翻译、角色扮演。
- **编排器(Orchestrators)。** 运行战役：Crescendo（升级）、TAP（分支）、RedTeaming（自定义循环）。
- **评分(Scoring)。** LLM-as-judge或classifier-as-judge。

PyRIT是Garak的更重表亲。Garak运行数千个单轮探针；PyRIT运行旨在破坏特定失败模式的深度多轮战役。

### 技术栈

在模型两侧放置Llama Guard。每晚运行Garak进行回归。发布前运行PyRIT进行战役。这是2026年大多数生产部署的默认配置。

### 评估陷阱

- **判断器身份。** 三种工具都可以使用LLM判断器；判断器校准驱动报告的ASR（第12课）。在工具旁指定判断器。
- **探针过时。** Garak探针随着模型修补而老化。自适应探针（PAIR形）比静态探针老化更慢。
- **Llama Guard对良性内容的FPR。** 早期Llama Guard版本过度标记政治和LGBTQ+内容；Llama Guard 3/4校准有所改善但未按部署校准。

## 关键术语

| 术语                        | 常见说法        | 实际含义                                      |
| --------------------------- | --------------- | --------------------------------------------- |
| Llama Guard                 | "分类器"        | 微调Llama-3.1-8B/4-12B安全分类器，14类危害    |
| Garak                       | "扫描器"        | NVIDIA开源漏洞扫描器；探针、检测器、线束      |
| PyRIT                       | "战役工具"      | Microsoft多轮红队编排器；转换器、编排器、评分 |
| Prompt-Guard                | "小分类器"      | Meta的86M提示注入分类器，与Llama Guard配对    |
| TBSA                        | "基于层评分"    | Garak的基于层通过/失败替代二元结果            |
| Converter chain             | "释义+编码+..." | PyRIT组合原语，用于构建多步攻击               |
| MLCommons hazard categories | "14类分类法"    | Llama Guard针对的行业标准分类法               |

## 延伸阅读

- Meta — Llama Guard 3 (in Llama 3 Herd paper, arXiv:2407.21783) — 8B分类器
- Meta — Llama Guard 3-1B-INT4 (arXiv:2411.17713) — 量化移动分类器
- NVIDIA Garak — GitHub — 扫描器仓库和文档
- Microsoft PyRIT — GitHub — 战役工具包
