---
title: 'Constitutional AI与RLAIF'
description: '理解Constitutional AI的自批评修订机制和2026年Claude宪法更新'
module: 'ai-ethics'
difficulty: intermediate
tags:
  - 'Constitutional AI'
  - RLAIF
  - 自批评
  - 宪法
  - Claude宪法
  - AI反馈
related:
  - 'ai-ethics/AI控制与颠覆下安全'
  - 'ai-ethics/ASCII艺术与视觉越狱'
  - 'ai-ethics/EchoLeak与AI的CVE时代'
  - 'ai-ethics/LLM的差分隐私'
prerequisites:
  - 'ai-ethics/谄媚作为RLHF放大器'
---

# Constitutional AI与RLAIF

> Bai等人(arXiv:2212.08073, 2022)问：如果我们用读取原则列表的AI替换人类标注者会怎样？Constitutional AI有两个阶段——在宪法下的自批评和修订，然后从AI反馈的RL。该技术创造了RLAIF一词并在Claude 1后训练管道中发布。2026年1月21日Anthropic发布了重写的Claude宪法：解释性推理优于规定性规则，四层优先级层次，以及首个主要实验室对模型道德地位不确定性的正式承认。在CC0 1.0下发布。

**类型:** 学习
**语言:** Python (stdlib, toy自批评和修订循环)
**前置知识:** Phase 18 · 01 (InstructGPT), Phase 18 · 02 (奖励黑客)
**时间:** ~60分钟

## 学习目标

- 描述Constitutional AI两阶段：自批评修订 + RLAIF。
- 解释2026年Claude宪法更新：解释性推理、四层优先级、道德地位不确定性。
- 比较RLHF(人类反馈)和RLAIF(AI反馈)在可扩展性和偏差上。
- 说出RLAIF的局限：AI反馈可能继承训练偏差。

## 问题

RLHF需要大量人类标注者。昂贵、慢、不可扩展。Constitutional AI问：AI可以替代人类标注者吗？答案是可以，但AI反馈继承AI的训练偏差。

## 概念

### 两阶段

1. **自批评和修订**：模型生成响应，根据宪法原则批评自己，然后修订。重复多次。

2. **RLAIF**：从AI反馈训练奖励模型(AI评估响应是否符合宪法)，然后PPO优化。

### 2026年Claude宪法

- 解释性推理优于规定性规则。
- 四层优先级层次(安全 > 有用性 > 诚实性 > 其他)。
- 首个主要实验室正式承认对模型道德地位的不确定性。
- CC0 1.0许可发布。

### RLAIF vs RLHF

|          | RLHF     | RLAIF      |
| -------- | -------- | ---------- |
| 标注者   | 人类     | AI         |
| 成本     | 高       | 低         |
| 速度     | 慢       | 快         |
| 偏差     | 人类偏差 | AI训练偏差 |
| 可扩展性 | 受限     | 高         |

### 局限

AI反馈继承训练偏差。如果AI在有害数据上训练，它的"宪法判断"可能偏斜。需要人类监督验证AI反馈质量。

## 实践

`code/main.py`模拟自批评和修订循环带toy宪法。

## 输出

本课程产生`outputs/skill-constitutional-ai-designer.md`。给定产品，设计宪法原则和CAI管道。

## 练习

1. 写出5条宪法原则用于聊天机器人。
2. 自批评和修订如何工作？画出循环。
3. RLAIF的AI反馈偏差从哪来？如何缓解？
4. 阅读Claude宪法(CC0)。描述四层优先级。
5. 比较CAI和标准RLHF在成本和质量上。

## 关键术语

| 术语              | 常见说法     | 实际含义                       |
| ----------------- | ------------ | ------------------------------ |
| Constitutional AI | "宪法AI"     | AI在宪法原则下自批评修订+RLAIF |
| RLAIF             | "AI反馈RL"   | 从AI反馈训练奖励模型           |
| 自批评修订        | "AI自我纠正" | 模型批评并修订自己的输出       |
| 宪法              | "原则列表"   | AI评估响应时遵循的原则集       |

## 延伸阅读

- [Bai等人 — Constitutional AI (arXiv:2212.08073)](https://arxiv.org/abs/2212.08073)
- [Anthropic Claude Constitution (CC0)](https://www.anthropic.com/constitution)
