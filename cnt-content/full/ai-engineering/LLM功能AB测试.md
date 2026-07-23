---
title: 'LLM功能A/B测试 — GrowthBook、Statsig与Vibes问题'
description: 理解LLM非确定性A/B测试的挑战和2026年平台选择
module: 'ai-engineering'
difficulty: intermediate
tags:
  - AB测试
  - GrowthBook
  - Statsig
  - 非确定性
  - CUPED
  - 序列测试
related:
  - 'ai-engineering/LLM-API负载测试'
  - 'ai-engineering/LLM-FinOps单位经济学'
  - 'ai-engineering/LLM可观测性与评估仪表板'
  - 'ai-engineering/LLM可观测性栈选择'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# LLM功能A/B测试 — GrowthBook、Statsig与Vibes问题

> 传统A/B测试不是为非确定性LLM构建的。关键区别：评估回答"模型能做这个工作吗？"A/B测试回答"用户在乎吗？"两者都需要；凭感觉发布已经过时。2026年测试什么：prompt工程(措辞)、模型选择(GPT-4 vs GPT-3.5 vs OSS；准确率vs成本vs延迟)、生成参数(温度、top-p)。真实案例：聊天机器人奖励模型变体交付+70%对话长度和+30%留存；Nextdoor AI主题行实验在奖励函数优化后交付+1% CTR；Khan Academy Khanmigo在延迟vs数学准确率轴上迭代。平台分化：**Statsig**(2025年9月被OpenAI以$1.1B收购)——序列测试、CUPED、一体化。**GrowthBook**——开源、仓库原生、贝叶斯+频率派+序列引擎、CUPED、SRM检查、Benjamini-Hochberg + Bonferroni校正。你基于仓库SQL偏好和"被OpenAI收购"是否对你的组织重要来选择。

**类型:** 学习
**语言:** Python (stdlib, toy序列测试模拟器)
**前置知识:** Phase 17 · 13 (可观测性), Phase 17 · 20 (渐进式部署)
**时间:** ~60分钟

## 学习目标

- 区分评估("模型能做吗？")和A/B测试("用户在乎吗？")。
- 说出2026年LLM A/B测试的三个维度：prompt工程、模型选择、生成参数。
- 比较Statsig和GrowthBook在许可、方法和定位上。
- 解释CUPED和序列测试如何减少LLM A/B测试所需样本量。

## 问题

LLM输出是非确定性的。相同prompt不同运行可能产生不同结果。传统A/B测试假设确定性处理。你需要统计方法处理方差。

## 概念

### 评估 vs A/B测试

- 评估：离线基准测试。回答"模型能做这个工作吗？"
- A/B测试：在线用户实验。回答"用户在乎吗？"
- 两者都需要。凭感觉发布已经过时。

### 三个测试维度

1. Prompt工程：措辞变化。
2. 模型选择：GPT-4 vs GPT-3.5 vs OSS。准确率vs成本vs延迟。
3. 生成参数：温度、top-p。

### 统计方法

- CUPED：使用预实验数据减少方差。减少所需样本量约30-50%。
- 序列测试：在数据到达时持续监控。更早停止。
- SRM检查：样本比例不匹配检测。确保随机化正确。

### 平台比较

| 平台       | 许可         | 方法               | 定位     |
| ---------- | ------------ | ------------------ | -------- |
| Statsig    | 专有(OpenAI) | 序列+CUPED         | 一体化   |
| GrowthBook | 开源         | 贝叶斯+频率派+序列 | 仓库原生 |

## 实践

`code/main.py`模拟序列A/B测试带CUPED方差减少。

## 输出

本课程产生`outputs/skill-llm-ab-test-designer.md`。给定功能变更，设计A/B测试。

## 练习

1. 设计A/B测试：比较两个prompt变体在聊天机器人中。指标？运行时长？
2. CUPED如何减少所需样本量？用数学解释。
3. 非确定性如何影响A/B测试统计？需要多少额外样本？
4. 选择Statsig vs GrowthBook：5人团队，10K DAU，SQL仓库。论证。
5. 阅读GrowthBook文档。描述SRM检查和为什么重要。

## 关键术语

| 术语      | 常见说法   | 实际含义                       |
| --------- | ---------- | ------------------------------ |
| CUPED     | "方差减少" | 使用预实验数据减少A/B测试方差  |
| 序列测试  | "持续监控" | 数据到达时持续检查；更早停止   |
| SRM       | "比例检查" | 样本比例不匹配检测；验证随机化 |
| Vibes检查 | "凭感觉"   | 无统计的直觉判断；2026年已过时 |

## 延伸阅读

- [GrowthBook GitHub](https://github.com/growthbook/growthbook)
- [Statsig Documentation](https://docs.statsig.com/)
