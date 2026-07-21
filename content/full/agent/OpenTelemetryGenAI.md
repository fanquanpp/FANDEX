---
title: 'OpenTelemetry GenAI — Agent可观测性语义约定'
description: '掌握OpenTelemetry GenAI语义约定，实现LLM调用的分布式追踪、token计量和成本归因'
module: agent
difficulty: intermediate
tags:
  - OpenTelemetry
  - 可观测性
  - 分布式追踪
  - token计量
  - 成本归因
related:
  - agent/OpenAI准备性与DeepMind前沿安全框架
  - 'agent/OpenTelemetry-GenAI语义约定'
  - agent/Reflexion语言强化学习
  - agent/ReWOO与计划执行
prerequisites:
  - agent/概述与架构
---

# OpenTelemetry GenAI — Agent可观测性语义约定

> 没有可观测性的Agent是黑盒。OpenTelemetry的GenAI语义约定（v1.33.0+，2025年9月稳定）标准化了LLM调用的追踪、token计量和成本归因。本课实现追踪线束，为每个工具调用和LLM补全发出span，并将token计数连接到成本归因管道。

**类型：** 构建
**语言：** Python（标准库，OTLP JSON发射器）
**前置条件：** Phase 13 · 01（工具接口）
**时间：** ~45分钟

## 学习目标

- 命名四个GenAI语义约定span类型：`gen_ai.client`、`gen_ai.tool`、`gen_ai.agent`、`gen_ai.system`。
- 为每个LLM补全和工具调用发出span，带有正确的属性。
- 计算每次调用的token成本并归因给用户/会话。
- 区分追踪（分布式因果）和指标（聚合计数器）。

## 问题所在

生产Agent失败的方式需要调试：错误工具被调用、token预算超支、延迟峰值、循环行为。没有结构化遥测，你只有日志 — 非结构化的、难以查询、无法跨服务关联。

OpenTelemetry的GenAI语义约定定义了标准属性和span类型，使每个LLM提供商和Agent框架发出相同形状的遥测。Jaeger、Zipkin、Datadog、Honeycomb、Grafana Tempo和New Relic都原生摄取这些span。

## 核心概念

### 四个Span类型

1. **`gen_ai.client`。** 单个LLM补全调用。属性：`gen_ai.request.model`、`gen_ai.response.finish_reasons`、`gen_ai.usage.input_tokens`、`gen_ai.usage.output_tokens`。
2. **`gen_ai.tool`。** 单个工具调用。属性：`gen_ai.tool.name`、`gen_ai.tool.type`、`gen_ai.tool.call.id`。
3. **`gen_ai.agent`。** 完整Agent运行。属性：`gen_ai.agent.id`、`gen_ai.agent.name`。
4. **`gen_ai.system`。** 提供商或框架。属性：`gen_ai.system`（`openai`、`anthropic`、`gemini`、`custom`）。

### Span层次

```
gen_ai.agent (root)
  -> gen_ai.client (LLM call 1)
    -> gen_ai.tool (tool call 1)
  -> gen_ai.client (LLM call 2)
    -> gen_ai.tool (tool call 2)
  -> gen_ai.client (LLM call 3, final answer)
```

每个span携带 `trace_id` 和 `span_id`。父子关系通过 `parent_span_id` 链接。这让你在Jaeger或Honeycomb中看到完整的因果链。

### 关键属性

| 属性                             | 描述                                            |
| -------------------------------- | ----------------------------------------------- |
| `gen_ai.system`                  | 提供商标识符（`openai`、`anthropic`、`gemini`） |
| `gen_ai.request.model`           | 请求的模型名称                                  |
| `gen_ai.request.max_tokens`      | 最大token请求                                   |
| `gen_ai.request.temperature`     | 温度参数                                        |
| `gen_ai.response.finish_reasons` | 模型为何停止                                    |
| `gen_ai.response.model`          | 实际使用的模型                                  |
| `gen_ai.usage.input_tokens`      | 输入token计数                                   |
| `gen_ai.usage.output_tokens`     | 输出token计数                                   |
| `gen_ai.tool.name`               | 工具名称                                        |
| `gen_ai.tool.type`               | `function`                                      |
| `gen_ai.tool.call.id`            | 工具调用id                                      |
| `gen_ai.agent.id`                | Agent实例标识符                                 |
| `gen_ai.agent.name`              | Agent人类可读名称                               |

### Token计量和成本归因

每次LLM调用记录input和output token。成本计算：

```
cost = (input_tokens * input_price_per_1k / 1000) + (output_tokens * output_price_per_1k / 1000)
```

价格按提供商和模型发布。归因按 `user.id` 或 `session.id` span属性分组成本。

### 追踪 vs 指标

- **追踪。** 单个请求的因果链。回答"这个特定Agent运行发生了什么？"
- **指标。** 聚合计数器。回答"每小时平均token使用量是多少？"或"工具X的错误率是多少？"

两者都重要。追踪用于调试；指标用于容量规划和警报。

### OTLP导出

OpenTelemetry协议（OTLP）是导出格式。本课使用JSON-over-HTTP变体写入文件。生产使用gRPC或HTTP到收集器（Jaeger、Grafana、Datadog）。

### 采样

高流量Agent系统每秒发出数千span。采样策略：

- **始终采样错误。** 每个失败span都被保留。
- **概率采样成功。** 10%或1%的成功span。
- **基于延迟采样。** 采样超过P99的span。

### 敏感数据

span不得包含用户PII或完整提示/补全文本。使用 `gen_ai.content.completion` 和 `gen_ai.content.prompt` 仅当你有明确用户同意时。默认：仅记录token计数和模型元数据。

## 实践

`code/main.py` 为第01课的四步工具调用循环实现追踪线束。每个LLM调用和工具调用发出一个span，带有正确的GenAI语义约定属性。span以OTLP JSON写入文件。一个简单的成本计算器按会话聚合token使用。

关注点：

- Span层次正确链接：agent span包含client span，client span包含tool span。
- Token计数归因给会话和用户。
- 成本计算使用可配置的每模型定价。

## 交付

本课产生 `outputs/skill-genai-telemetry.md`。给定一个Agent工作流，该技能设计追踪策略：哪些span、哪些属性、采样率和成本归因维度。

## 练习

1. 运行 `code/main.py`。检查OTLP JSON输出。追踪一个完整的Agent运行从根span到叶span。

2. 添加一个指标计数器：按工具名称的 `gen_ai.tool.calls`。在10次模拟运行后打印直方图。

3. 实现基于延迟的采样：仅保留超过100ms的span。计算采样率。

4. 添加 `gen_ai.content.prompt` 和 `gen_ai.content.completion` 属性，但用 `[REDACTED]` 替换任何PII形状字符串。什么正则模式能捕获常见PII？

5. 阅读OpenTelemetry GenAI语义约定规范。识别本课未使用的一个属性。解释何时有用。

## 关键术语

| 术语                 | 人们怎么说      | 实际含义                                     |
| -------------------- | --------------- | -------------------------------------------- |
| Span                 | "一个操作"      | 带有开始时间、结束时间和属性的命名、计时操作 |
| Trace                | "因果链"        | 由span链接的完整请求路径                     |
| `gen_ai.client`      | "LLM调用span"   | 单个LLM补全                                  |
| `gen_ai.tool`        | "工具调用span"  | 单个工具执行                                 |
| `gen_ai.agent`       | "Agent运行span" | 完整Agent执行                                |
| OTLP                 | "导出协议"      | OpenTelemetry协议，用于发送遥测              |
| Token attribution    | "谁花了什么"    | 按用户/会话的token成本分组                   |
| Sampling             | "保留哪些span"  | 减少高流量下的遥测量                         |
| Semantic conventions | "标准属性名"    | OTel为GenAI定义的属性名                      |
| Cost calculator      | "价格x token"   | 每次调用的美元金额                           |

## 延伸阅读

- [OpenTelemetry — GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/) — 权威属性参考
- [OpenTelemetry — Python SDK](https://opentelemetry.io/docs/languages/python/) — Python工具化库
- [Honeycomb — Observability for LLM apps](https://www.honeycomb.io/blog/observability-for-llm-apps) — 实际GenAI追踪
- [Datadog — LLM Observability](https://docs.datadoghq.com/llm_observability/) — 企业GenAI追踪
- [Langfuse — OpenTelemetry integration](https://langfuse.com/docs/opentelemetry) — 开源LLM可观测性
