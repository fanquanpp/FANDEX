---
title: LLM可观测性栈选择
description: 比较2026年LLM可观测性市场两大类别：开发平台vs网关/遥测工具
module: 'ai-engineering'
difficulty: beginner
tags:
  - 可观测性
  - LangSmith
  - Langfuse
  - Phoenix
  - Helicone
  - OpenTelemetry
related:
  - 'ai-engineering/LLM功能AB测试'
  - 'ai-engineering/LLM可观测性与评估仪表板'
  - 'ai-engineering/LLM生产混沌工程'
  - 'ai-engineering/MCP服务器与注册中心与治理'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# LLM可观测性栈选择

> 2026年可观测性市场分为两类。开发平台(LangSmith, Langfuse, Comet Opik)将监控与评估、prompt管理、会话回放捆绑。网关/遥测工具(Helicone, SigNoz, OpenLLMetry, Phoenix)专注遥测。Langfuse是MIT许可核心，强OSS平衡(50K事件/月免费云)。Phoenix是OpenTelemetry原生，Elastic License 2.0下——漂移/RAG可视化优秀，不是持久生产后端。Arize AX使用零拷贝Iceberg/Parquet集成声称比单体可观测性便宜100x。LangSmith在LangChain/LangGraph上领先，$39/用户/月，仅企业版自托管。Helicone是基于代理的，15-30分钟设置，100K请求/月免费，但agent追踪深度较少。常见生产模式：网关(Helicone/Portkey) + 评估平台(Phoenix/TruLens)由OpenTelemetry粘合。

**类型:** 学习
**语言:** Python (stdlib, toy追踪采样模拟器)
**前置知识:** Phase 17 · 08 (推理指标), Phase 14 (Agent工程)
**时间:** ~60分钟

## 学习目标

- 说出两类可观测性工具(开发平台vs网关/遥测)并将每个供应商映射到类别。
- 比较Langfuse、LangSmith、Phoenix和Helicone在许可、定价和功能上。
- 描述常见生产模式：网关 + 评估平台由OpenTelemetry粘合。
- 为给定团队规模和预算选择可观测性栈。

## 问题

LLM可观测性不只是日志和指标。你需要追踪跨多步agent运行的prompt、评估输出质量、检测漂移并回放会话。传统APM(Datadog, New Relic)不原生理解token、prompt和LLM特定信号。

## 概念

### 两类

**开发平台**：LangSmith、Langfuse、Comet Opik。捆绑监控+评估+prompt管理+会话回放。面向开发者工作流。

**网关/遥测工具**：Helicone、SigNoz、OpenLLMetry、Phoenix。专注遥测收集。面向生产管道。

### 供应商比较

| 工具      | 许可                | 定价            | 最佳场景                |
| --------- | ------------------- | --------------- | ----------------------- |
| Langfuse  | MIT核心             | 50K事件/月免费  | OSS优先，全功能         |
| LangSmith | 专有                | $39/用户/月     | LangChain/LangGraph用户 |
| Phoenix   | Elastic License 2.0 | 免费            | 漂移/RAG可视化          |
| Helicone  | 专有                | 100K请求/月免费 | 快速设置，代理模式      |
| Arize AX  | 专有                | 企业定价        | 大规模，零拷贝          |

### 生产模式

网关(Helicone/Portkey) + 评估平台(Phoenix/TruLens)由OpenTelemetry粘合。网关处理路由和遥测；评估平台处理质量分析。

### OpenTelemetry

OpenTelemetry是开放遥测标准。Phoenix和OpenLLMetry原生使用它。Langfuse和LangSmith有自己的SDK但可以导出到OTel。2026年趋势是OTel标准化。

## 实践

`code/main.py`模拟追踪采样策略和成本估算。

## 输出

本课程产生`outputs/skill-observability-stack-picker.md`。给定团队规模、预算和工作流，选择可观测性栈。

## 练习

1. 比较Langfuse和LangSmith在5人团队、100K请求/月下的成本。
2. 为什么Phoenix不是持久生产后端？它缺少什么？
3. 设计可观测性栈：3个agent，10K请求/天，需要评估和漂移检测。
4. 阅读OpenLLMetry文档。列出它收集的信号并映射到TTFT/TPOT/ITL。
5. 追踪采样：10% vs 100%追踪在1M请求/月下的存储成本差异？

## 关键术语

| 术语          | 常见说法         | 实际含义                           |
| ------------- | ---------------- | ---------------------------------- |
| 开发平台      | "全功能可观测性" | 捆绑监控+评估+prompt管理的平台     |
| 网关/遥测     | "数据管道"       | 专注遥测收集的工具                 |
| OpenTelemetry | "OTel"           | 开放遥测标准；2026年趋势           |
| 追踪采样      | "采样率"         | 只记录部分请求的追踪以降低存储成本 |

## 延伸阅读

- [Langfuse GitHub](https://github.com/langfuse/langfuse)
- [Phoenix Documentation](https://docs.arize.com/phoenix)
- [OpenLLMetry GitHub](https://github.com/traceloop/openllmetry)
