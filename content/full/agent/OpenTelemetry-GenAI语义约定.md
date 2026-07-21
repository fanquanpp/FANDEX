---
title: 'OpenTelemetry-GenAI语义约定'
description: 'OpenTelemetry的GenAI SIG（2024年4月启动）定义了Agent遥测的标准Schema。Span名称、属性和内容捕获规则跨供应商趋同，使Agent追踪在Datadog、Grafana、Jaeger和Honeycomb中含义相同。'
module: agent
related:
  - 'agent/OpenAI-Agents-SDK'
  - agent/OpenAI准备性与DeepMind前沿安全框架
  - agent/OpenTelemetryGenAI
  - agent/Reflexion语言强化学习
prerequisites:
  - agent/概述与架构
---

# OpenTelemetry GenAI语义约定

> OpenTelemetry的GenAI SIG（2024年4月启动）定义了Agent遥测的标准Schema。Span名称、属性和内容捕获规则跨供应商趋同，使Agent追踪在Datadog、Grafana、Jaeger和Honeycomb中含义相同。

**类型：** 学习 + 构建
**语言：** Python (stdlib)
**前置条件：** Phase 14 · 13 (LangGraph), Phase 14 · 24 (可观测性平台)
**时间：** ~60分钟

## 学习目标

- 说出GenAI span类别：model/client、agent、tool。
- 区分`invoke_agent` CLIENT vs INTERNAL span以及各自何时适用。
- 列出顶层GenAI属性：provider name、request model、data-source ID。
- 解释内容捕获契约：选择加入、`OTEL_SEMCONV_STABILITY_OPT_IN`、外部引用推荐。

## 问题所在

每个供应商发明自己的span名称。运维团队最终构建每框架仪表板。OpenTelemetry的GenAI SIG通过定义整个生态系统目标的一个标准来修复这个问题。

## 核心概念

### Span类别

1. **模型/客户端span。** 覆盖原始LLM调用。由提供商SDK（Anthropic、OpenAI、Bedrock）和框架模型适配器发出。
2. **Agent span。** `create_agent`（Agent构造时）和`invoke_agent`（运行时）。
3. **工具span。** 每次工具调用一个；通过父子关系连接到Agent span。

### Agent span命名

- Span名称：`invoke_agent {gen_ai.agent.name}`（如果命名）；回退到`invoke_agent`。
- Span种类：
  - **CLIENT** — 用于远程Agent服务（OpenAI Assistants API、Bedrock Agents）。
  - **INTERNAL** — 用于进程内Agent框架（LangChain、CrewAI、本地ReAct）。

### 关键属性

- `gen_ai.provider.name` — `anthropic`、`openai`、`aws.bedrock`、`google.vertex`。
- `gen_ai.request.model` — 模型ID。
- `gen_ai.response.model` — 解析的模型（可能因路由与请求不同）。
- `gen_ai.agent.name` — Agent标识符。
- `gen_ai.operation.name` — `chat`、`completion`、`invoke_agent`、`tool_call`。
- `gen_ai.data_source.id` — 用于RAG：查询了哪个语料库或存储。

存在Anthropic、Azure AI Inference、AWS Bedrock、OpenAI的技术特定约定。

### 内容捕获

默认规则：仪器默认不应捕获输入/输出。捕获通过以下选择加入：

- `gen_ai.system_instructions`
- `gen_ai.input.messages`
- `gen_ai.output.messages`

推荐的生产模式：将内容存储在外部（S3、你的日志存储），在span上记录引用（指针ID，而非散文）。这是第27课内容投毒防御连接到可观测性的方式。

### 稳定性

截至2026年3月，大多数约定是实验性的。选择加入稳定预览：

```
OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental
```

Datadog v1.37+原生将GenAI属性映射到其LLM Observability Schema。其他后端（Grafana、Honeycomb、Jaeger）支持原始属性。

### 这个模式哪里会出错

- **在span中捕获完整提示。** PII、秘密、客户数据在运维可读的追踪中。外部存储。
- **无`gen_ai.provider.name`。** 当归属缺失时多提供商仪表板会破坏。
- **无父链接的span。** 孤立的工具span。总是传播上下文。
- **不设置稳定性选择加入。** 你的属性可能在后端升级时被重命名。

## 构建它

`code/main.py`实现一个匹配GenAI约定的stdlib span发射器：

- 带GenAI属性Schema的`Span`。
- 带有`start_span`、嵌套上下文的`Tracer`。
- 一个脚本Agent运行发出：`create_agent`、`invoke_agent`（INTERNAL）、每工具span、LLM调用的`chat` span。
- 一个内容捕获模式，将提示存储在外部并在span上记录ID。

运行：

```
python3 code/main.py
```

输出：一个带所有必需GenAI属性的span树，以及一个显示选择加入内容引用的"外部存储"。

## 使用它

- **Datadog LLM Observability**（v1.37+）原生映射属性。
- **Langfuse / Phoenix / Opik**（第24课）— 自动仪器化生态系统。
- **Jaeger / Honeycomb / Grafana Tempo** — 原始OTel追踪；从GenAI属性构建仪表板。
- **自托管** — 运行带GenAI处理器的OTel Collector。

## 发布它

`outputs/skill-otel-genai.md`将OTel GenAI span连接到现有Agent，带内容捕获默认值和外部引用存储。

## 练习

1. 用`invoke_agent`（INTERNAL）+ 每工具span仪器化你的第01课ReAct循环。发送到Jaeger实例。
2. 在"仅引用"模式下添加内容捕获：提示到SQLite，span属性只携带行ID。
3. 阅读`gen_ai.data_source.id`的规范。将其连接到你的第09课Mem0搜索。
4. 设置`OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`并验证你的属性没有被收集器重命名。
5. 构建仪表板："哪些工具错误与哪些模型相关"仅从GenAI属性。

## 关键术语

| 术语                  | 人们常说的              | 实际含义                                         |
| --------------------- | ----------------------- | ------------------------------------------------ |
| GenAI SIG             | "OpenTelemetry GenAI组" | 定义Schema的OTel工作组                           |
| invoke_agent          | "Agent span"            | 代表Agent运行的span名称                          |
| CLIENT span           | "远程调用"              | 对远程Agent服务调用的span                        |
| INTERNAL span         | "进程内"                | 进程内Agent运行的span                            |
| gen_ai.provider.name  | "提供商"                | anthropic / openai / aws.bedrock / google.vertex |
| gen_ai.data_source.id | "RAG源"                 | 检索命中了哪个语料库/存储                        |
| 内容捕获              | "提示日志"              | 选择加入的消息捕获；生产中外部存储               |
| 稳定性选择加入        | "预览模式"              | 固定实验性约定的环境变量                         |

## 延伸阅读

- [OpenTelemetry GenAI语义约定](https://opentelemetry.io/docs/specs/semconv/gen-ai/) — 规范
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/) — 默认GenAI span
- [AutoGen v0.4 (Microsoft Research)](https://www.microsoft.com/en-us/research/articles/autogen-v0-4-reimagining-the-foundation-of-agentic-ai-for-scale-extensibility-and-robustness/) — 内置OTel span
- [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview) — W3C追踪上下文传播
