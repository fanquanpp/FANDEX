---
title: 对齐研究生态MATS与Redwood与Apollo
description: '2026年非实验室对齐研究层五大组织：MATS — 527+研究员、180+论文、h-index 47的人才管道；Redwood Research — AI控制议程发起者，与UK AISI合作控制安全案例；Apollo Research — 前沿实验室预部署策划评估；METR — 基于任务的能力评估和框架综合；Eleos AI — 模型福利预部署评估。多组织结构是对齐研究的质量控制。'
module: 'ai-ethics'
difficulty: advanced
tags:
  - MATS
  - 'Redwood Research'
  - 'Apollo Research'
  - METR
  - 'Eleos AI'
  - 对齐生态
related:
  - 'ai-ethics/谄媚作为RLHF放大器'
  - 'ai-ethics/对齐伪装'
  - 'ai-ethics/多样本越狱'
  - 'ai-ethics/公平性标准群体个体与反事实'
prerequisites:
  - 'ai-ethics/谄媚作为RLHF放大器'
---

## 问题定义

前沿实验室（第18课）内部产生安全评估并发布选定结果。实验室外的生态系统是评估被验证、新失败模式首先被发现、人才被训练的地方。理解生态系统有助于解释哪些研究发现被谁信任。

## 核心概念

### MATS (ML Alignment & Theory Scholars)

2021年底启动。研究导师制项目；学者与高级研究员在特定对齐问题上花费10-12周。

规模(2026)：

- 自成立以来527+研究员。
- 180+篇论文发表。
- 10K+引用。
- h-index 47。
- 2024年夏季：90名学者+40名导师；注册为501(c)(3)。

职业结果：约80%的2025年前校友从事安全/安全工作。200+人在Anthropic、DeepMind、OpenAI、UK AISI、RAND、Redwood、METR、Apollo。

### Redwood Research

应用对齐实验室。由Buck Shlegeris创立。引入AI控制议程（第10课）。与UK AISI合作控制安全案例。为DeepMind和Anthropic提供评估设计咨询。

经典论文：Greenblatt, Shlegeris等人"AI Control" (arXiv:2312.06942, ICML 2024)；Alignment Faking (Greenblatt, Denison, Wright等人, arXiv:2412.14093, 与Anthropic联合)。

风格：特定威胁模型、最坏情况对手、可压力测试的具体协议。

### Apollo Research

前沿实验室预部署策划评估。撰写In-Context Scheming（第8课, arXiv:2412.04984）。2025年OpenAI反策划训练合作伙伴。产出Towards Safety Cases for AI Scheming (2024)。

风格：欺骗可涌现的代理设置评估；三支柱分解（不对齐、目标导向性、情境意识）。

### METR (Model Evaluation and Threat Research)

基于任务的能力评估。自主任务完成时间范围研究。"Common Elements of Frontier AI Safety Policies" (metr.org/common-elements, 2025)比较实验室框架。

与Apollo合作AI策划安全案例草图。

风格：长范围任务评估、实证能力测量、框架综合。

### Eleos AI Research

模型福利预部署评估。执行了Claude Opus 4福利评估，记录在系统卡5.3节。为第19课福利相关声明提供外部方法论检查。

### 流程

MATS训练研究员。毕业生去Anthropic、DeepMind、OpenAI（实验室安全团队）或Redwood、Apollo、METR、Eleos（外部评估）。外部评估者与实验室和UK AISI/CAISI合作。出版物回馈生态系统给MATS下一届。

### 为什么这一层重要

单一来源评估不可靠：实验室评估自身模型有结构性利益冲突。外部评估者可以提出和验证实验室可能低报的失败模式。2024年Sleeper Agents论文（第7课）是Anthropic + Redwood；Alignment Faking是Anthropic + Redwood；In-Context Scheming是Apollo；Anti-Scheming是Apollo + OpenAI。多组织结构是质量控制。

## 关键术语

| 术语                | 常见说法         | 实际含义                                                   |
| ------------------- | ---------------- | ---------------------------------------------------------- |
| MATS                | "导师制项目"     | ML Alignment & Theory Scholars；2021年以来527+研究员       |
| Redwood Research    | "控制实验室"     | 应用对齐；AI Control作者；UK AISI合作伙伴                  |
| Apollo Research     | "策划评估"       | 前沿实验室预部署策划评估                                   |
| METR                | "任务范围评估"   | 基于任务的能力评估；框架综合                               |
| Eleos AI            | "福利实验室"     | 模型福利预部署评估                                         |
| Talent pipeline     | "MATS -> 实验室" | MATS毕业生流向Anthropic、DM、OpenAI、Redwood、Apollo、METR |
| External evaluation | "非实验室检查"   | 非模型生产者进行的评估；增加可信度                         |

## 延伸阅读

- MATS (ML Alignment & Theory Scholars) — 导师制项目
- Redwood Research — AI Control论文
- Apollo Research — 策划评估
- METR — Common Elements of Frontier AI Safety Policies — 框架比较
- Eleos AI Research — 模型福利方法论
