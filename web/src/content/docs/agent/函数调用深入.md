---
title: '函数调用深入 — OpenAI、Anthropic、Gemini'
description: 对比三大前沿提供商的函数调用格式差异，构建统一翻译器实现跨提供商移植
module: agent
difficulty: intermediate
tags:
  - 函数调用
  - OpenAI
  - Anthropic
  - Gemini
  - 提供商移植
related:
  - agent/构建MCP服务器
  - agent/构建MCP客户端
  - agent/鎬濈淮鏍戜笌LATS
  - agent/混合记忆向量图与KV
prerequisites:
  - agent/概述与架构
---

# 函数调用深入 — OpenAI、Anthropic、Gemini

> 三大前沿提供商在2024年趋同于相同的工具调用循环，然后在其他一切上分道扬镳。OpenAI使用 `tools` 和 `tool_calls`。Anthropic使用 `tool_use` 和 `tool_result` 块。Gemini使用 `functionDeclarations` 和唯一id关联。本课并排对比三者，使在一个提供商上发布的代码在移植时不会中断。

**类型：** 构建
**语言：** Python（标准库，模式翻译器）
**前置条件：** Phase 13 · 01（工具接口）
**时间：** ~75分钟

## 学习目标

- 陈述OpenAI、Anthropic和Gemini函数调用负载之间的三个形状差异（声明、调用、结果）。
- 将一个工具声明翻译为所有三个提供商格式，并预测严格模式约束的不同之处。
- 在每个提供商中使用 `tool_choice` 来强制、禁止或自动选择工具调用。
- 了解每个提供商的硬限制（工具数量、模式深度、参数长度）以及违反限制时的错误签名。

## 问题所在

函数调用请求的形状因提供商而异。2026年生产栈的三个具体示例：

**OpenAI Chat Completions / Responses API。** 你传递 `tools: [{type: "function", function: {name, description, parameters, strict}}]`。模型的响应包含 `choices[0].message.tool_calls: [{id, type: "function", function: {name, arguments}}]`，其中 `arguments` 是你必须解析的JSON字符串。严格模式（`strict: true`）通过约束解码强制模式合规。

**Anthropic Messages API。** 你传递 `tools: [{name, description, input_schema}]`。响应以 `content: [{type: "text"}, {type: "tool_use", id, name, input}]` 形式返回。`input` 已经解析（一个对象，不是字符串）。你用包含 `{type: "tool_result", tool_use_id, content}` 块的新 `user` 消息回复。

**Google Gemini API。** 你传递 `tools: [{functionDeclarations: [{name, description, parameters}]}]`（嵌套在 `functionDeclarations` 下）。响应以 `candidates[0].content.parts: [{functionCall: {name, args, id}}]` 形式到达，其中 `id` 在Gemini 3及以上版本中用于并行调用关联。你用 `{functionResponse: {name, id, response}}` 回复。

相同的循环。不同的字段名称、不同的嵌套、不同的字符串与对象约定、不同的关联机制。在OpenAI上编写天气Agent的团队需要两天移植到Anthropic，又需要一天移植到Gemini，仅用于管道工作。

本课构建一个翻译器，将三种格式统一为一个规范工具声明，并在边缘路由。Phase 13 · 17将相同模式泛化为LLM网关。

## 核心概念

### 共同结构

每个提供商需要五样东西：

1. **工具列表。** 每个工具的名称、描述和输入模式。
2. **工具选择。** 强制特定工具、禁止工具或让模型决定。
3. **调用发出。** 命名工具和参数的结构化输出。
4. **调用id。** 将响应与正确的调用关联（并行时重要）。
5. **结果注入。** 将结果与调用关联的消息或块。

### 逐字段形状差异

| 方面     | OpenAI                                              | Anthropic                              | Gemini                                                  |
| -------- | --------------------------------------------------- | -------------------------------------- | ------------------------------------------------------- |
| 声明信封 | `{type: "function", function: {...}}`               | `{name, description, input_schema}`    | `{functionDeclarations: [{...}]}`                       |
| 模式字段 | `parameters`                                        | `input_schema`                         | `parameters`                                            |
| 响应容器 | assistant消息上的 `tool_calls[]`                    | 类型为 `tool_use` 的 `content[]`       | 类型为 `functionCall` 的 `parts[]`                      |
| 参数类型 | 字符串化JSON                                        | 解析后的对象                           | 解析后的对象                                            |
| Id格式   | `call_...`（OpenAI生成）                            | `toolu_...`（Anthropic）               | UUID（Gemini 3+）                                       |
| 结果块   | 角色 `tool`，`tool_call_id`                         | `user` 带 `tool_result`，`tool_use_id` | `functionResponse` 带匹配 `id`                          |
| 强制工具 | `tool_choice: {type: "function", function: {name}}` | `tool_choice: {type: "tool", name}`    | `tool_config: {function_calling_config: {mode: "ANY"}}` |
| 禁止工具 | `tool_choice: "none"`                               | `tool_choice: {type: "none"}`          | `mode: "NONE"`                                          |
| 严格模式 | `strict: true`                                      | 模式即模式（始终强制）                 | 请求级 `responseSchema`                                 |

### 你会实际碰到的限制

- **OpenAI。** 每个请求128个工具。模式深度5。参数字符串 <= 8192字节。严格模式要求无 `$ref`，无重叠的 `oneOf`/`anyOf`/`allOf`，每个属性列在 `required` 中。
- **Anthropic。** 每个请求64个工具。模式深度实际上无限制但实际限制为10。无严格模式标志；模式是契约，模型倾向于遵守。
- **Gemini。** 每个请求64个函数。模式类型是OpenAPI 3.0子集（与JSON Schema 2020-12略有分歧）。并行调用自Gemini 3起有唯一id。

### `tool_choice` 行为

每个人都支持的三种模式，命名不同。

- **Auto。** 模型选择工具或文本。默认。
- **Required / Any。** 模型必须调用至少一个工具。
- **None。** 模型不得调用工具。

加上每个提供商独有的一种模式：

- **OpenAI。** 按名称强制特定工具。
- **Anthropic。** 按名称强制特定工具；`disable_parallel_tool_use` 标志区分单次与多次。
- **Gemini。** `mode: "VALIDATED"` 将每个响应通过模式验证器路由，无论模型意图。

### 并行调用

OpenAI的 `parallel_tool_calls: true`（默认）在一个assistant消息中发出多个调用。你运行所有调用并用包含每个 `tool_call_id` 一个条目的批量工具角色消息回复。Anthropic历史上做单次调用；`disable_parallel_tool_use: false`（Claude 3.5起默认）启用多次。Gemini 2允许并行调用但不给稳定id；Gemini 3添加UUID，使乱序响应干净地关联。

### 流式传输

三个提供商都支持流式工具调用。线路格式不同：

- **OpenAI。** `tool_calls[i].function.arguments` 的增量块逐步到达。你累积直到 `finish_reason: "tool_calls"`。
- **Anthropic。** block-start / block-delta / block-stop 事件。`input_json_delta` 块携带部分参数。
- **Gemini。** `streamFunctionCallArguments`（Gemini 3新增）发出带有 `functionCallId` 的块，使多个并行调用可以交错。

Phase 13 · 03深入并行 + 流式重组。本课侧重于声明和单次调用形状。

### 错误与修复

无效参数错误看起来也不同。

- **OpenAI（非严格）。** 模型返回 `arguments: "{bad json}"`，你的JSON解析失败，你注入错误消息并重新调用。
- **OpenAI（严格）。** 验证在解码期间发生；无效JSON不可能出现，但 `refusal` 可以出现。
- **Anthropic。** `input` 可能包含意外字段；模式是建议性的。服务器端验证。
- **Gemini。** OpenAPI 3.0怪癖：对象字段上的 `enum` 被静默忽略；自行验证。

### 翻译器模式

你代码中的规范工具声明看起来像这样（你选择形状）：

```python
Tool(
    name="get_weather",
    description="Use when ...",
    input_schema={"type": "object", "properties": {...}, "required": [...]},
    strict=True,
)
```

三个小函数将其翻译为三个提供商形状。`code/main.py` 中的线束正是这样做的，然后通过每个提供商的响应形状往返一个假工具调用。不需要网络 — 本课教授形状，不是HTTP。

生产团队将此翻译器包装在 `AbstractToolset`（Pydantic AI）、`UniversalToolNode`（LangGraph）或 `BaseTool`（LlamaIndex）中。Phase 13 · 17发布一个网关，在任何三个提供商前面暴露OpenAI形状的API。

## 实践

`code/main.py` 定义一个规范的 `Tool` 数据类和三个翻译器，它们发出OpenAI、Anthropic和Gemini声明JSON。然后它将每个形状的手工提供商响应解析为相同的规范调用对象，演示语义在表面下是相同的。运行它并并排对比三个声明。

关注点：

- 三个声明块仅在信封和字段名称上不同。
- 三个响应块在调用所在位置不同（顶级 `tool_calls`、`content[]` 块、`parts[]` 条目）。
- 一个 `canonical_call()` 函数从所有三个响应形状中提取 `{id, name, args}`。

## 交付

本课产生 `outputs/skill-provider-portability-audit.md`。给定一个针对某个提供商的函数调用集成，该技能生成可移植性审计：它依赖哪些提供商限制，哪些字段需要重命名，以及移植到每个其他提供商时什么会中断。

## 练习

1. 运行 `code/main.py` 并验证三个提供商声明JSON都序列化相同的底层 `Tool` 对象。修改规范工具以添加枚举参数，并确认只有Gemini翻译器需要处理OpenAPI怪癖。

2. 为每个提供商添加一个 `ListToolsResponse` 解析器，提取模型在 `list_tools` 或发现调用后返回的工具列表。OpenAI原生没有这个；注意这种不对称。

3. 实现 `tool_choice` 转换：将规范 `ToolChoice(mode="force", tool_name="x")` 映射为所有三个提供商形状。然后映射 `mode="any"` 和 `mode="none"`。查看本课的差异表。

4. 选择三个提供商之一，从头到尾阅读其函数调用指南。找到其模式规范中其他两个不支持的一个字段。候选：OpenAI `strict`、Anthropic `disable_parallel_tool_use`、Gemini `function_calling_config.allowed_function_names`。

5. 编写一个测试向量：一个参数违反声明模式的工具调用。通过每个提供商的验证器运行它（第01课中的标准库版本可作为代理）并记录哪些错误触发。记录你会在生产中使用哪个提供商来获得严格性。

## 关键术语

| 术语                | 人们怎么说            | 实际含义                                 |
| ------------------- | --------------------- | ---------------------------------------- |
| Function calling    | "工具使用"            | 用于结构化工具调用发出的提供商级API      |
| Tool declaration    | "工具规范"            | 名称 + 描述 + JSON Schema输入负载        |
| `tool_choice`       | "强制/禁止"           | Auto / required / none / 特定名称模式    |
| Strict mode         | "模式强制"            | OpenAI标志，通过约束解码强制模式合规     |
| `tool_use` block    | "Anthropic的调用形状" | 带有id、name、input的内联内容块          |
| `functionCall` part | "Gemini的调用形状"    | 包含name、args和id的 `parts[]` 条目      |
| Arguments-as-string | "字符串化JSON"        | OpenAI将参数作为JSON字符串返回，不是对象 |
| Parallel tool calls | "一轮扇出"            | 一个assistant消息中的多个工具调用        |
| Refusal             | "模型拒绝"            | 严格模式专用的拒绝块，替代调用           |
| OpenAPI 3.0 subset  | "Gemini模式怪癖"      | Gemini使用与JSON Schema略有不同的方言    |

## 延伸阅读

- [OpenAI — Function calling guide](https://platform.openai.com/docs/guides/function-calling) — 包括严格模式和并行调用的权威参考
- [Anthropic — Tool use overview](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview) — `tool_use` 和 `tool_result` 块语义
- [Google — Gemini function calling](https://ai.google.dev/gemini-api/docs/function-calling) — 并行调用、唯一id和OpenAPI子集
- [Vertex AI — Function calling reference](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/function-calling) — Gemini的企业表面
- [OpenAI — Structured outputs](https://platform.openai.com/docs/guides/structured-outputs) — 严格模式模式强制详情
