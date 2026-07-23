---
title: 'AI网关 — LiteLLM、Portkey、Kong AI Gateway、Bifrost'
description: 比较2026年四大AI网关的定位、性能和适用场景
module: 'ai-engineering'
difficulty: beginner
tags:
  - AI网关
  - LiteLLM
  - Portkey
  - 'Kong AI Gateway'
  - Bifrost
  - 路由
  - 回退
related:
  - 'ai-engineering/自主研究代理AI-Scientist级'
  - 'ai-engineering/AI的SRE事件响应'
  - 'ai-engineering/API与密钥'
  - 'ai-engineering/DevOps故障排查代理Kubernetes'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# AI网关 — LiteLLM、Portkey、Kong AI Gateway、Bifrost

> 网关位于你的应用和模型提供商之间。核心功能是提供商路由、回退、重试、速率限制、密钥引用、可观测性、护栏。2026年市场分化：**LiteLLM**是MIT OSS，100+提供商，OpenAI兼容，但在约2000 RPS附近崩溃(8GB内存，发布基准中级联失败)；最适合Python，<500 RPS，开发/原型。**Portkey**定位控制面(护栏、PII编辑、越狱检测、审计追踪)，2026年3月Apache 2.0开源，20-40 ms延迟开销，$49/月生产层级。**Kong AI Gateway**构建在Kong Gateway上——Kong自己在相同12 CPU上的基准：比Portkey快228%，比LiteLLM快859%；$100/模型/月定价(Plus层最多5个)；如果你已在Kong上则企业适配。**Bifrost**(Maxim AI)——自动重试带可配置退避，OpenAI 429时回退到Anthropic。**Cloudflare / Vercel AI Gateways**——托管，零运维，基本重试。数据驻留驱动自托管决策；Portkey和Kong位于中间带OSS + 可选托管。

**类型:** 学习
**语言:** Python (stdlib, toy网关路由模拟器)
**前置知识:** Phase 17 · 01 (托管LLM平台), Phase 17 · 16 (模型路由)
**时间:** ~60分钟

## 学习目标

- 比较四个AI网关在许可、性能、定位和适用场景上。
- 解释LiteLLM的约2000 RPS限制和Kong的859%速度优势。
- 为给定规模和需求选择网关。
- 描述常见生产模式：网关 + 评估平台由OpenTelemetry粘合。

## 问题

你的应用调用多个LLM提供商(OpenAI, Anthropic, Google, 开源)。你需要统一API、回退、重试、速率限制和可观测性。网关是答案。

## 概念

### 网关比较

| 网关    | 许可       | 性能            | 最佳场景               |
| ------- | ---------- | --------------- | ---------------------- |
| LiteLLM | MIT        | 约2000 RPS上限  | Python, <500 RPS, 开发 |
| Portkey | Apache 2.0 | 20-40ms开销     | 护栏, PII编辑, 审计    |
| Kong AI | Kong许可   | 859%快于LiteLLM | 企业, 已在Kong上       |
| Bifrost | 专有       | 中等            | 自动重试+回退          |

### LiteLLM

MIT OSS，100+提供商，OpenAI兼容API。Python原生。约2000 RPS时崩溃(8GB内存，级联失败)。最适合开发和低流量生产。

### Portkey

控制面定位：护栏、PII编辑、越狱检测、审计追踪。2026年3月Apache 2.0开源。20-40ms延迟开销。$49/月生产层级。

### Kong AI Gateway

构建在Kong Gateway上。Kong基准：比Portkey快228%，比LiteLLM快859%。$100/模型/月。企业适配如果已在Kong生态。

### Bifrost

自动重试带可配置退避。OpenAI 429时回退到Anthropic。简单但有效。

### 数据驻留

数据驻留要求驱动自托管决策。Portkey和Kong提供OSS + 可选托管。Cloudflare和Vercel是纯托管。

## 实践

`code/main.py`模拟网关路由带回退和重试。

## 输出

本课程产生`outputs/skill-ai-gateway-picker.md`。给定规模、提供商和需求，选择网关。

## 练习

1. 你的产品需要<10ms网关开销和5个模型。选择哪个网关？
2. LiteLLM在约2000 RPS崩溃。什么具体失败模式？
3. 设计网关策略：3个提供商，需要PII编辑和审计追踪。
4. 比较Portkey和Kong在1000 RPS下的成本。
5. 阅读LiteLLM文档。列出支持的提供商数量和回退配置。

## 关键术语

| 术语     | 常见说法   | 实际含义                         |
| -------- | ---------- | -------------------------------- |
| AI网关   | "LLM代理"  | 应用和模型提供商之间的代理层     |
| 回退     | "故障转移" | 主提供商失败时切换到备用         |
| 速率限制 | "请求节流" | 限制每秒/分钟请求数              |
| 护栏     | "安全过滤" | 输入/输出过滤(PII编辑, 越狱检测) |

## 延伸阅读

- [LiteLLM GitHub](https://github.com/BerriAI/litellm)
- [Portkey Documentation](https://portkey.ai/docs)
- [Kong AI Gateway](https://konghq.com/products/kong-ai-gateway)
