---
title: LLM可观测性与评估仪表板
description: 'Langfuse开源核心、Arize Phoenix发布2026 GenAI semconv映射、Helicone和Braintrust加倍每用户成本归因、Traceloop的OpenLLMetry成为事实SDK插桩。生产形态：ClickHouse存储traces、Postgres元数据、Next.js UI、eval作业(DeepEval/RAGAS/LLM-judge)在采样traces上运行。自托管构建，从至少四个SDK家族摄取，五分钟内捕获注入回归。'
module: 'ai-engineering'
difficulty: advanced
tags:
  - 可观测性
  - OpenTelemetry
  - Langfuse
  - Phoenix
  - 成本归因
  - 漂移检测
related:
  - 'ai-engineering/LLM-FinOps单位经济学'
  - 'ai-engineering/LLM功能AB测试'
  - 'ai-engineering/LLM可观测性栈选择'
  - 'ai-engineering/LLM生产混沌工程'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

## 问题

2026年运行生产流量的每个AI团队都在模型旁保持可观测性平面。成本归因、幻觉检测、漂移监控、越狱信号、SLO仪表板、PII泄露告警。开源参考——Langfuse、Phoenix、OpenLLMetry——收敛于OpenTelemetry GenAI语义约定作为摄取模式。

你将构建一个自托管仪表板，从至少四个SDK家族摄取，在采样traces上运行小规模eval作业集，检测漂移并告警。测量标准：给定一个故意注入的回归（一个开始产生PII的提示），仪表板在五分钟内捕获并触发告警。

## 核心架构

### 摄取

OpenTelemetry GenAI语义约定。一个SDK插桩OpenAI、Anthropic、Google、LangChain、LlamaIndex和vLLM，发出兼容spans。

### 存储

ClickHouse用于traces（高吞吐写入），Postgres用于元数据（查询灵活）。

### 评估

DeepEval、RAGAS、LLM-judge在采样traces上运行。检测幻觉、漂移、PII泄露。

### 告警

基于规则的告警（PII检测、成本超限）+ 统计漂移检测（分布偏移）。

## 关键术语

| 术语             | 常见说法      | 实际含义                         |
| ---------------- | ------------- | -------------------------------- |
| OpenLLMetry      | "LLM插桩SDK"  | Traceloop的OpenTelemetry LLM插桩 |
| Semconv          | "语义约定"    | OpenTelemetry GenAI语义约定      |
| Cost attribution | "成本归因"    | 按用户/团队/端点分配LLM成本      |
| Drift detection  | "漂移检测"    | 检测模型输出分布的统计偏移       |
| PII leak alert   | "PII泄露告警" | 检测模型输出中的个人身份信息     |

## 延伸阅读

- Langfuse — 开源LLM可观测性
- Arize Phoenix — GenAI可观测性
- OpenLLMetry (Traceloop) — LLM SDK插桩
