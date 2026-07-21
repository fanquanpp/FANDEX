---
title: 'OpenAI Agents SDK：交接、护栏、追踪'
description: 'OpenAI Agents SDK是构建在Responses API上的轻量级多Agent框架。五个原语：Agent、Handoff、Guardrail、Session、Tracing。交接是名为transfer_to_<agent>的工具。护栏在输入或输出时触发。追踪默认开启。'
module: agent
related:
  - agent/MCP资源与提示
  - agent/METR时间范围与外部评估
  - agent/OpenAI准备性与DeepMind前沿安全框架
  - 'agent/OpenTelemetry-GenAI语义约定'
prerequisites:
  - agent/概述与架构
---

﻿---
title: OpenAI-Agents-SDK
description: "OpenAI Agents SDK是构建在Responses API上的轻量级多Agent框架。五个原语：Agent、Handoff、Guardrail、Session、Tracing。交接是名为transfer*to*<agent>的工具。护栏在输入或输出时触发。追踪默认开启。"
module: agent

---

# OpenAI Agents SDK：交接、护栏、追踪

> OpenAI Agents SDK是构建在Responses API上的轻量级多Agent框架。五个原语：Agent、Handoff、Guardrail、Session、Tracing。交接是名为`transfer_to_<agent>`的工具。护栏在输入或输出时触发。追踪默认开启。

**类型：** 学习 + 构建
**语言：** Python (stdlib)
**前置条件：** Phase 14 · 01 (Agent循环), Phase 14 · 06 (工具使用)
**时间：** ~75分钟

## 学习目标

- 说出OpenAI Agents SDK的五个原语。
- 解释交接：为什么它们被建模为工具，模型看到的名称形状，以及上下文如何转移。
- 区分输入护栏、输出护栏和工具护栏；解释`run_in_parallel` vs 阻塞模式。
- 实现一个带交接 + 护栏 + span风格追踪的stdlib运行时。

## 问题所在

无法干净委托的Agent最终将所有东西塞进一个提示。没有护栏的Agent发布PII、违反策略的输出或永远循环。OpenAI的SDK编纂了使多Agent工作可管理的三个原语。

## 核心概念

### 五个原语

1. **Agent。** LLM + 指令 + 工具 + 交接。
2. **Handoff。** 委托给另一个Agent。对模型表示为名为`transfer_to_<agent_name>`的工具。
3. **Guardrail。** 对输入（仅第一个Agent）、输出（仅最后一个Agent）或工具调用（每函数工具）的验证。
4. **Session。** 跨轮次的自动对话历史。
5. **Tracing。** LLM生成、工具调用、交接、护栏的内置span。

### 交接作为工具

模型在其工具列表中看到`transfer_to_billing_agent`。调用它通知运行时：

1. 复制对话上下文（或通过`nest_handoff_history` beta折叠）。
2. 用目标Agent的指令初始化它。
3. 用目标Agent继续运行。

这是监督者模式（第13课 / 第28课）的产品化。

### 护栏

三种风格：

- **输入护栏。** 在第一个Agent的输入上运行。在任何LLM调用前拒绝不安全或超出范围的请求。
- **输出护栏。** 在最后一个Agent的输出上运行。捕获PII泄露、策略违规、格式错误的响应。
- **工具护栏。** 每函数工具运行。验证参数、检查权限、审计执行。

模式：

- **并行**（默认）。护栏LLM与主LLM同时运行。更低的尾部延迟。如果触发，主LLM的工作被丢弃（token浪费）。
- **阻塞**（`run_in_parallel=False`）。护栏LLM先运行。如果触发，主调用不浪费token。

触发线抛出`InputGuardrailTripwireTriggered` / `OutputGuardrailTripwireTriggered`。

### 追踪

默认开启。每个LLM生成、工具调用、交接和护栏发出一个span。`OPENAI_AGENTS_DISABLE_TRACING=1`退出。`add_trace_processor(processor)`将span扇出到你自己的后端，与OpenAI的并行。

### 会话

`Session`在后端（SQLite、Redis、自定义）中存储对话历史。`Runner.run(agent, input, session=session)`自动加载和追加。

### 这个模式哪里会出错

- **交接漂移。** Agent A交接给Agent B，Agent B又交接回Agent A。添加跳数计数器。
- **护栏绕过。** 工具护栏只在函数工具上触发；内置工具（文件读取器、Web获取）需要单独的策略。
- **过度追踪。** span中的敏感内容。与OTel GenAI内容捕获规则（第23课）配对——外部存储，按ID引用。

## 构建它

`code/main.py`在stdlib中实现SDK形状：

- `Agent`、`FunctionTool`、`Handoff`（作为带转移语义的函数工具）。
- `Runner`带输入/输出/工具护栏、交接分发和跳数计数器。
- 一个简单的span发射器显示跟踪形状。
- 一个分诊Agent，根据用户查询交接给账单或支持；一个输入护栏触发。

运行：

```
python3 code/main.py
```

跟踪显示两次成功交接、一次输入护栏触发和一个镜像真实SDK发出的span树。

## 使用它

- **OpenAI Agents SDK**用于OpenAI优先产品。
- **Claude Agent SDK**（第17课）用于Claude优先产品。
- **LangGraph**（第13课）当你想要显式状态和持久恢复时。
- **自定义**当你需要精确控制（语音、多提供商、联邦部署）时。

## 发布它

`outputs/skill-agents-sdk-scaffold.md`脚手架一个Agents SDK应用，带分诊Agent、交接、输入/输出/工具护栏、会话存储和追踪处理器。

## 练习

1. 添加交接跳数计数器：N次转移后拒绝。跟踪行为。
2. 实现`nest_handoff_history`作为选项——在转移前将先前消息折叠为一个摘要。
3. 编写一个阻塞输出护栏。比较会触发它的提示与通过的提示的延迟。
4. 将`add_trace_processor`连接到JSON日志器。它每个span发出什么形状？
5. 阅读SDK文档。将你的stdlib玩具移植到`openai-agents-python`。你建模错了什么？

## 关键术语

| 术语      | 人们常说的   | 实际含义                                |
| --------- | ------------ | --------------------------------------- |
| Agent     | "LLM + 指令" | SDK中的Agent类型；拥有工具和交接        |
| Handoff   | "转移"       | 模型调用的委托给另一个Agent的工具       |
| Guardrail | "策略检查"   | 对输入/输出/工具调用的验证              |
| 触发线    | "护栏触发"   | 护栏拒绝时抛出的异常                    |
| Session   | "历史存储"   | 运行之间持久化的对话记忆                |
| Tracing   | "Span"       | LLM + 工具 + 交接 + 护栏的内置可观测性  |
| 阻塞护栏  | "顺序检查"   | 护栏先运行；触发时不浪费token           |
| 并行护栏  | "并发检查"   | 护栏同时运行；更低延迟，触发时浪费token |

## 延伸阅读

- [OpenAI Agents SDK文档](https://openai.github.io/openai-agents-python/) — 原语、交接、护栏、追踪
- [Claude Agent SDK概述](https://platform.claude.com/docs/en/agent-sdk/overview) — Claude风格的对应物
- [Anthropic, Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) — 何时使用交接
- [OpenTelemetry GenAI语义约定](https://opentelemetry.io/docs/specs/semconv/gen-ai/) — Agents SDK span映射到的标准
