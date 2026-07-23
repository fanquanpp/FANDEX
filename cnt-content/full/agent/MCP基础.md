---
title: 'MCP基础 — 原语、生命周期、JSON-RPC基础'
description: '掌握MCP的六个原语、三阶段生命周期和JSON-RPC 2.0线路格式，理解能力协商机制'
module: agent
difficulty: intermediate
tags:
  - MCP
  - 原语
  - 生命周期
  - 'JSON-RPC'
  - 能力协商
related:
  - agent/MCP传输
  - agent/MCP根目录与诱导
  - agent/MCP生产认证
  - agent/MCP网关与注册表
prerequisites:
  - agent/概述与架构
---

# MCP基础 — 原语、生命周期、JSON-RPC基础

> MCP之前的每个集成都是一次性的。Model Context Protocol，最初由Anthropic于2024年11月发布，现在由Linux基金会的Agentic AI Foundation管理，标准化了发现和调用，使任何客户端都能与任何服务器通信。2025-11-25规范命名了六个原语（三个服务器端、三个客户端端）、一个三阶段生命周期和一个JSON-RPC 2.0线路格式。学会这些，Phase 13的MCP章节其余部分就变成阅读了。

**类型：** 学习
**语言：** Python（标准库，JSON-RPC解析器）
**前置条件：** Phase 13 · 01至05（工具接口和函数调用）
**时间：** ~45分钟

## 学习目标

- 命名所有六个MCP原语（服务器端的tools、resources、prompts；客户端端的roots、sampling、elicitation）并各给一个用例。
- 走过三阶段生命周期（initialize、operation、shutdown）并说明每个阶段谁发送什么消息。
- 解析和发出JSON-RPC 2.0请求、响应和通知信封。
- 解释 `initialize` 处的能力协商是什么以及没有它会出什么问题。

## 问题所在

MCP之前，每个使用工具的Agent都有自己的协议。Cursor有一个MCP形状但不兼容的工具系统。Claude Desktop发布了不同的一个。VS Code的Copilot扩展有第三个。构建"Postgres查询"工具的团队将同一工具写了三次，每个宿主的API各一次。复用它需要复制代码。

结果是一次性集成的寒武纪大爆发和生态系统速度的上限。

MCP通过标准化线路格式来修复这个问题。一个MCP服务器在每个MCP客户端中工作：Claude Desktop、ChatGPT、Cursor、VS Code、Gemini、Goose、Zed、Windsurf，到2026年4月有300+客户端。1.1亿月SDK下载。10,000+公共服务器。Linux基金会在2025年12月新的Agentic AI Foundation下接管了管理工作。

本阶段使用的规范版本是 **2025-11-25**。它添加了异步Tasks（SEP-1686）、URL模式elicitation（SEP-1036）、带工具的sampling（SEP-1577）、增量作用域同意（SEP-835）和OAuth 2.1资源指示器语义。Phase 13 · 09至16涵盖这些扩展。本课止于基础。

## 核心概念

### 三个服务器原语

1. **Tools。** 可调用动作。与Phase 13 · 01相同的四步循环。
2. **Resources。** 暴露的数据。通过URI寻址的只读内容：`file:///path`、`db://query/...`、自定义方案。
3. **Prompts。** 可重用模板。宿主UI中的斜杠命令；服务器提供模板，客户端填充参数。

### 三个客户端原语

4. **Roots。** 服务器被允许触碰的URI集合。客户端声明；服务器遵守。
5. **Sampling。** 服务器请求客户端的模型执行补全。使服务器托管的Agent循环无需服务器端API密钥。
6. **Elicitation。** 服务器在飞行中向客户端用户请求结构化输入。表单或URL（SEP-1036）。

MCP中的每个能力都属于这六个之一。Phase 13 · 10至14深入涵盖每一个。

### 线路格式：JSON-RPC 2.0

每条消息是一个带有这些字段的JSON对象：

- 请求：`{jsonrpc: "2.0", id, method, params}`。
- 响应：`{jsonrpc: "2.0", id, result | error}`。
- 通知：`{jsonrpc: "2.0", method, params}` — 无 `id`，不期望响应。

基础规范有约15个方法，按原语分组。重要的有：

- `initialize` / `initialized`（握手）
- `tools/list`、`tools/call`
- `resources/list`、`resources/read`、`resources/subscribe`
- `prompts/list`、`prompts/get`
- `sampling/createMessage`（服务器到客户端）
- `notifications/tools/list_changed`、`notifications/resources/updated`、`notifications/progress`

### 三阶段生命周期

**阶段1：initialize。**

客户端发送带有其 `capabilities` 和 `clientInfo` 的 `initialize`。服务器用其自己的 `capabilities`、`serverInfo` 和它说的规范版本响应。客户端在消化响应后发送 `notifications/initialized`。从这里开始，任何一方都可以根据协商的能力发送请求。

**阶段2：operation。**

双向。客户端调用 `tools/list` 发现，然后 `tools/call` 调用。如果服务器声明了该能力，可以发送 `sampling/createMessage`。当其工具集变化时服务器可以发送 `notifications/tools/list_changed`。当用户更改根范围时客户端可以发送 `notifications/roots/list_changed`。

**阶段3：shutdown。**

任何一方关闭传输。MCP中没有结构化关闭方法；传输（stdio或Streamable HTTP，Phase 13 · 09）携带连接结束信号。

### 能力协商

`initialize` 握手中的 `capabilities` 是契约。服务器示例：

```json
{
  "tools": { "listChanged": true },
  "resources": { "subscribe": true, "listChanged": true },
  "prompts": { "listChanged": true }
}
```

服务器声明它可以发出 `tools/list_changed` 通知并支持 `resources/subscribe`。客户端通过声明自己的来同意：

```json
{
  "roots": { "listChanged": true },
  "sampling": {},
  "elicitation": {}
}
```

如果客户端不声明 `sampling`，服务器不得调用 `sampling/createMessage`。对称地：如果服务器不声明 `resources.subscribe`，客户端不得尝试订阅。

这就是防止生态系统漂移的机制。不支持sampling的客户端仍然是有效的MCP客户端；不调用 `sampling` 的服务器仍然是有效的MCP服务器。它们只是不一起使用该功能。

### 结构化内容和错误形状

`tools/call` 返回类型化块的 `content` 数组：`text`、`image`、`resource`。Phase 13 · 14将MCP Apps（`ui://` 交互式UI）添加到该列表。

错误使用JSON-RPC错误码。规范定义的附加项：`-32002` "Resource not found"、`-32603` "Internal error"，加上MCP特定错误数据作为 `error.data`。

### 客户端能力 vs 工具调用细节

一个常见混淆：`capabilities.tools` 是客户端是否支持工具列表变更通知。客户端是否会调用特定工具是运行时选择，由其模型驱动，不是能力标志。能力标志是规范级契约。模型的选择是正交的。

### 为什么是JSON-RPC而不是REST？

JSON-RPC 2.0（2010）是一个轻量级双向协议。REST是客户端发起的。MCP需要服务器发起的消息（sampling、通知），因此具有对称请求/响应形状的JSON-RPC是自然选择。JSON-RPC还在stdio和WebSocket/Streamable HTTP上干净地组合，无需重新发明HTTP的请求形状。

## 实践

`code/main.py` 提供最小的JSON-RPC 2.0解析器和发射器，然后手动走过 `initialize` → `tools/list` → `tools/call` → `shutdown` 序列，打印每条消息。无真实传输；只是消息形状。与延伸阅读中的规范链接比较以验证每个信封。

关注点：

- `initialize` 双向声明能力；响应有 `serverInfo` 和 `protocolVersion: "2025-11-25"`。
- `tools/list` 返回 `tools` 数组；每个条目有 `name`、`description`、`inputSchema`。
- `tools/call` 使用 `params.name` 和 `params.arguments`。
- 响应 `content` 是 `{type, text}` 块的数组。

## 交付

本课产生 `outputs/skill-mcp-handshake-tracer.md`。给定MCP客户端-服务器交互的pcap式转录，该技能用哪个原语、哪个生命周期阶段和它依赖哪个能力来注释每条消息。

## 练习

1. 运行 `code/main.py`。识别能力协商发生的行，并描述如果服务器不声明 `tools.listChanged` 会改变什么。

2. 扩展解析器以处理 `notifications/progress`。消息形状：`{method: "notifications/progress", params: {progressToken, progress, total}}`。在长时间运行的 `tools/call` 进行中发出它，并确认客户端处理程序会显示进度条。

3. 从头到尾阅读MCP 2025-11-25规范 — 整个文档大约80页。识别大多数服务器不需要的一个能力标志。提示：它与资源订阅有关。

4. 在纸上草绘假设"cron job"功能属于哪个原语。（提示：服务器希望客户端在计划时间调用它。六个原语今天都不适合。）MCP的2026年路线图有此草案SEP。

5. 从GitHub上的开放MCP服务器解析一个会话日志。计算请求 vs 响应 vs 通知消息。计算生命周期 vs 操作的流量比例。

## 关键术语

| 术语                      | 人们怎么说               | 实际含义                                                                |
| ------------------------- | ------------------------ | ----------------------------------------------------------------------- |
| MCP                       | "Model Context Protocol" | 模型到工具发现和调用的开放协议                                          |
| Server primitive          | "服务器暴露什么"         | tools（动作）、resources（数据）、prompts（模板）                       |
| Client primitive          | "客户端让服务器使用什么" | roots（范围）、sampling（LLM回调）、elicitation（用户输入）             |
| JSON-RPC 2.0              | "线路格式"               | 对称请求/响应/通知信封                                                  |
| `initialize` handshake    | "能力协商"               | 第一对消息；服务器和客户端声明支持的功能                                |
| `tools/list`              | "发现"                   | 客户端向服务器询问其当前工具集                                          |
| `tools/call`              | "调用"                   | 客户端要求服务器用参数执行工具                                          |
| `notifications/*_changed` | "变更事件"               | 服务器告诉客户端其原语列表已变化                                        |
| Content block             | "类型化结果"             | 工具结果中的 `{type: "text" \| "image" \| "resource" \| "ui_resource"}` |
| SEP                       | "规范演进提案"           | 命名草案提案（例如SEP-1686用于异步Tasks）                               |

## 延伸阅读

- [Model Context Protocol — Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25) — 权威规范文档
- [Model Context Protocol — Architecture concepts](https://modelcontextprotocol.io/docs/concepts/architecture) — 六原语心智模型
- [Anthropic — Introducing the Model Context Protocol](https://www.anthropic.com/news/model-context-protocol) — 2024年11月发布文章
- [MCP blog — First MCP anniversary](https://blog.modelcontextprotocol.io/posts/2025-11-25-first-mcp-anniversary/) — 一年回顾和2025-11-25规范变更
- [WorkOS — MCP 2025-11-25 spec update](https://workos.com/blog/mcp-2025-11-25-spec-update) — SEP-1686、1036、1577、835和1724的摘要
