---
title: 'LLM路由层 — 模型选择、回退、成本优化'
description: 构建LLM路由层，实现基于任务的路由、回退链、成本感知选择和A/B测试
module: agent
difficulty: intermediate
tags:
  - LLM路由
  - 模型选择
  - 回退链
  - 成本优化
  - AB测试
related:
  - agent/LangGraph状态图与持久执行
  - agent/LlamaGuard
  - agent/MARL寮哄寲瀛︿範
  - agent/MARL强化学习
prerequisites:
  - agent/概述与架构
---

# LLM路由层 — 模型选择、回退、成本优化

> 每个请求都调用最贵的模型是浪费。每个请求都调用最便宜的模型是脆弱的。路由层根据任务特征选择正确的模型，在提供商中断时回退，并跟踪成本。本课构建一个最小路由器，实现基于规则的路由、回退链和成本归因。

**类型：** 构建
**语言：** Python（标准库，路由引擎）
**前置条件：** Phase 13 · 02（函数调用深入），Phase 13 · 20（OpenTelemetry）
**时间：** ~75分钟

## 学习目标

- 实现基于任务的路由：简单任务用便宜模型，复杂任务用强大模型。
- 构建回退链：主提供商失败时，尝试次选。
- 计算每次调用的成本并按用户/会话归因。
- 设计A/B测试：10%流量到新模型，测量质量差异。

## 问题所在

2026年的生产Agent系统使用多个LLM提供商和模型。原因：

- **成本。** GPT-4o比GPT-4o-mini贵10倍。不是每个任务都需要GPT-4o。
- **延迟。** 小模型更快。聊天响应需要<500ms；后台研究可以等待5秒。
- **韧性。** 提供商中断。OpenAI在2024年12月有40分钟中断。回退到Anthropic保持系统运行。
- **能力。** 一些模型擅长代码，其他擅长推理，其他擅长多模态。

路由层是做出这些选择的组件。它坐在Agent逻辑和提供商API之间，暴露一个统一的接口。

## 核心概念

### 基于规则的路由

最简单的路由：按任务类型分类并映射到模型。

```python
ROUTE_TABLE = {
    "simple_qa": "gpt-4o-mini",
    "code_generation": "claude-3.5-sonnet",
    "complex_reasoning": "gpt-4o",
    "summarization": "gemini-2.0-flash",
}
```

分类可以基于：工具名称、提示长度、用户偏好、会话上下文。

### 基于特征的路由

更高级：提取提示特征并路由。

- **Token计数。** 短提示用快模型；长上下文用大上下文模型。
- **工具存在。** 需要工具的提示路由到擅长函数调用的模型。
- **语言。** 非英语提示路由到多语言模型。
- **结构化输出。** 需要严格JSON的路由到支持严格模式的模型。

### 回退链

```python
FALLBACK_CHAINS = {
    "primary": ["openai:gpt-4o", "anthropic:claude-3.5-sonnet", "gemini:gemini-2.0-flash"],
    "fast": ["openai:gpt-4o-mini", "gemini:gemini-2.0-flash-lite"],
}
```

当主提供商失败（超时、速率限制、5xx）时，路由器尝试链中的下一个。每次尝试记录为追踪span（Phase 13 · 20）。

### 成本感知路由

每次调用有美元成本。路由器跟踪：

```python
call_cost = (input_tokens * input_price / 1000) + (output_tokens * output_price / 1000)
```

策略：

- **预算限制。** 每用户每日最大$10。超限路由到最便宜模型。
- **成本-质量权衡。** 如果质量差异<5%，选择更便宜的模型。
- **会话预算。** 每会话$2。前3次调用用强模型；之后降级。

### A/B测试

路由10%流量到新模型并比较：

- 任务完成率
- 平均token使用
- 延迟P50/P95
- 用户满意度（如果可测量）

使用一致的哈希（用户id % 10）使同一用户始终看到同一变体。

### 路由器作为MCP网关

Phase 13 · 17的MCP网关可以包含路由。网关暴露单个MCP端点；内部它路由到不同的LLM提供商。客户端不知道哪个模型执行了请求。

### 提供商抽象

路由器为每个提供商适配器定义统一接口：

```python
class LLMProvider:
    async def complete(self, messages, tools, model) -> LLMResponse: ...
    async def stream(self, messages, tools, model) -> AsyncIterator[LLMChunk]: ...
```

每个适配器（OpenAI、Anthropic、Gemini）实现此接口。Phase 13 · 02的翻译器映射响应形状。

### 缓存

相同提示 + 工具 + 模型的相同请求返回相同结果。缓存键是提示和工具的哈希。命中节省完整LLM调用成本。语义缓存（嵌入相似性）更宽松但更强大 — Phase 17涵盖这一点。

## 实践

`code/main.py` 实现一个最小路由引擎，带有：

- 基于规则的路由表。
- 带有模拟提供商失败的回退链。
- 每次调用的成本计算和归因。
- 使用一致哈希的A/B测试。

模拟提供商返回预设响应，带有可配置的延迟和失败率。

## 交付

本课产生 `outputs/skill-llm-router-designer.md`。给定一个多模型部署，该技能设计路由表、回退链、成本预算和A/B测试计划。

## 练习

1. 运行 `code/main.py`。观察路由决策和回退行为。

2. 添加一个基于token计数的路由规则：超过2000 token的提示路由到大上下文模型。

3. 实现会话预算：前3次调用用强模型，之后降级。跟踪每会话累计成本。

4. 设计一个A/B测试，比较代码生成任务上的两个模型。定义指标和统计显著性阈值。

5. 添加语义缓存：嵌入提示，检查相似性阈值，返回缓存结果如果>0.95相似。注意：这需要嵌入模型；模拟它。

## 关键术语

| 术语                  | 人们怎么说       | 实际含义                        |
| --------------------- | ---------------- | ------------------------------- |
| Router                | "模型选择器"     | 根据任务特征选择LLM的组件       |
| Fallback chain        | "提供商顺序"     | 主提供商失败时尝试的有序列表    |
| Cost attribution      | "谁花了什么"     | 按用户/会话的LLM成本分组        |
| A/B test              | "模型实验"       | 分割流量比较模型质量            |
| Route table           | "任务到模型映射" | 任务类型到首选模型的字典        |
| Feature-based routing | "提示特征路由"   | 基于token计数、工具、语言的路由 |
| Budget limit          | "成本上限"       | 每用户/会话最大LLM支出          |
| Provider adapter      | "统一API"        | 每个LLM提供商的通用接口         |
| Semantic cache        | "相似性缓存"     | 基于嵌入相似性的缓存命中        |
| Consistent hash       | "粘性路由"       | 同一用户始终路由到同一变体      |

## 延伸阅读

- [LiteLLM — Unified LLM API](https://github.com/BerriAI/litellm) — 开源路由和回退库
- [Portkey — AI gateway](https://portkey.ai/) — 带路由和缓存的商业LLM网关
- [OpenRouter — Model routing](https://openrouter.ai/) — 多提供商路由服务
- [Martian — Model router](https://withmartian.com/) — 基于学习的路由
- [AWS — Model routing best practices](https://docs.aws.amazon.com/bedrock/latest/userguide/model-routing.html) — 企业路由模式
