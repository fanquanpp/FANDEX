---
title: LLM生产混沌工程
description: 理解2026年LLM混沌工程的四平面架构和LLM特定实验
module: 'ai-engineering'
difficulty: intermediate
tags:
  - 混沌工程
  - SLI与SLO
  - 错误预算
  - 游戏日
  - KV缓存驱逐风暴
related:
  - 'ai-engineering/LLM可观测性与评估仪表板'
  - 'ai-engineering/LLM可观测性栈选择'
  - 'ai-engineering/MCP服务器与注册中心与治理'
  - 'ai-engineering/ML流水线'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# LLM生产混沌工程

> 2026年LLM混沌工程是独立学科。生产运行实验前的前置条件：定义SLI/SLO、追踪+指标+日志可观测性、自动回滚、runbook、on-call。架构有四平面：控制(实验调度器)、目标(服务、基础设施、数据存储)、安全(护栏+中止+流量过滤器)、可观测性(指标+追踪+日志)、反馈(到SLO调整)。护栏是强制的：燃烧率警报在每日错误预算燃烧>2x预期时暂停实验；抑制窗口+追踪ID关联去重警报噪声。节奏：每周小金丝雀+SLO审查；每月游戏日+事后分析；每季度跨团队弹性审计+依赖映射。LLM特定实验：内存过载、网络故障、提供商停机、畸形prompt、KV缓存驱逐风暴。工具：Harness Chaos Engineering(LLM派生推荐、爆炸半径缩小、MCP工具集成)；LitmusChaos(CNCF)；Chaos Mesh(CNCF Kubernetes原生)。

**类型:** 学习
**语言:** Python (stdlib, toy混沌实验运行器)
**前置知识:** Phase 17 · 23 (AI SRE), Phase 17 · 13 (可观测性)
**时间:** ~60分钟

## 学习目标

- 画出四平面混沌架构：控制、目标、安全、可观测性。
- 说出LLM特定混沌实验：内存过载、提供商停机、畸形prompt、KV驱逐风暴。
- 描述护栏：燃烧率警报、抑制窗口、追踪ID关联。
- 设计混沌实验节奏：每周/每月/每季度。

## 问题

混沌工程主动注入故障以发现系统弱点。对LLM服务，故障模式是独特的：GPU内存过载、提供商API停机、畸形prompt触发异常、KV缓存驱逐风暴。你需要LLM特定的实验。

## 概念

### 四平面架构

1. 控制：实验调度器。定义什么故障、何时、多久。
2. 目标：服务、基础设施、数据存储。故障注入点。
3. 安全：护栏+中止+流量过滤器。防止实验造成真实损害。
4. 可观测性：指标+追踪+日志。测量影响。

### 护栏

- 燃烧率警报：每日错误预算燃烧>2x预期时暂停实验。
- 抑制窗口：防止同一事件重复警报。
- 追踪ID关联：去重警报噪声。

### LLM特定实验

- 内存过载：填满GPU KV缓存，观察驱逐和恢复。
- 网络故障：断开提供商API连接，观察回退和重试。
- 提供商停机：模拟429/500响应，观察降级。
- 畸形prompt：发送超长/空/二进制prompt，观察错误处理。
- KV缓存驱逐风暴：触发大规模缓存失效，观察重新预填充风暴。

### 节奏

- 每周：小金丝雀+SLO审查。
- 每月：游戏日+事后分析。
- 每季度：跨团队弹性审计+依赖映射。

## 实践

`code/main.py`模拟混沌实验运行器带护栏检查。

## 输出

本课程产生`outputs/skill-chaos-experiment-designer.md`。给定系统，设计混沌实验计划。

## 练习

1. 设计KV缓存驱逐风暴实验：注入条件、测量指标、中止条件。
2. 为什么燃烧率>2x时暂停实验？什么阈值太保守？太激进？
3. 设计每月游戏日：3个实验，2小时窗口。
4. 阅读Chaos Mesh文档。描述Kubernetes原生故障注入。
5. 畸形prompt实验：列出5种畸形输入和预期系统行为。

## 关键术语

| 术语       | 常见说法              | 实际含义                           |
| ---------- | --------------------- | ---------------------------------- |
| 四平面架构 | "控制/目标/安全/观测" | 混沌工程的四个操作平面             |
| 燃烧率     | "错误预算消耗速度"    | 错误预算消耗速率；>2x暂停实验      |
| 游戏日     | "每月故障演练"        | 定期故障注入演练                   |
| KV驱逐风暴 | "缓存失效级联"        | 大规模KV缓存失效触发重新预填充风暴 |

## 延伸阅读

- [Chaos Mesh GitHub](https://github.com/chaos-mesh/chaos-mesh)
- [LitmusChaos GitHub](https://github.com/litmuschaos/litmus)
- [Harness Chaos Engineering](https://www.harness.io/products/chaos-engineering)
