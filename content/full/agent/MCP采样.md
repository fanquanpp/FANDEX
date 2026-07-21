---
title: 'MCP采样 — 服务器请求的LLM补全与Agent循环'
description: 掌握sampling机制使服务器能通过客户端LLM进行推理，实现无需API密钥的服务器端Agent循环
module: agent
difficulty: advanced
tags:
  - MCP采样
  - sampling
  - Agent循环
  - modelPreferences
related:
  - agent/MCP安全工具投毒
  - agent/MCP安全OAuth2.1
  - agent/MCP传输
  - agent/MCP根目录与诱导
prerequisites:
  - agent/概述与架构
---

# MCP采样 — 服务器请求的LLM补全与Agent循环

> 大多数MCP服务器是哑执行器：接受参数，运行代码，返回内容。Sampling让服务器翻转方向：它请求客户端的LLM做决策。这使得服务器托管的Agent循环无需服务器拥有任何模型凭证。SEP-1577，合并于2025-11-25，在sampling请求中添加了工具，使循环可以包含更深的推理。漂移风险提示：SEP-1577工具-in-sampling形状在2026年Q1之前是实验性的，SDK API仍在稳定中。

**类型：** 构建
**语言：** Python（标准库，sampling线束）
**前置条件：** Phase 13 · 07（MCP服务器），Phase 13 · 10（资源和提示）
**时间：** ~75分钟

## 学习目标

- 解释 `sampling/createMessage` 解决什么（无服务器端API密钥的服务器托管循环）。
- 实现一个请求客户端在多轮提示上采样并返回补全的服务器。
- 使用 `modelPreferences`（成本/速度/智能优先级）指导客户端模型选择。
- 构建一个 `summarize_repo` 工具，通过sampling内部迭代而不是硬编码行为。

## 问题所在

一个有用的代码摘要MCP服务器需要：遍历文件树，选择要读取的文件，综合摘要，并返回。LLM推理在哪里发生？

选项A：服务器调用自己的LLM。需要API密钥，服务器端计费，每用户昂贵。

选项B：服务器返回原始内容；客户端的Agent做推理。有效但将服务器逻辑移入客户端提示，这很脆弱。

选项C：服务器通过 `sampling/createMessage` 请求客户端的LLM。服务器保留算法（读取哪些文件，做多少轮），客户端保留计费和模型选择。服务器完全没有凭证。

Sampling是选项C。它是受信任服务器可以在不作为完整LLM宿主的情况下托管Agent循环的机制。

## 核心概念

### `sampling/createMessage` 请求

服务器发送：

```json
{
  "jsonrpc": "2.0",
  "id": 42,
  "method": "sampling/createMessage",
  "params": {
    "messages": [{ "role": "user", "content": { "type": "text", "text": "..." } }],
    "systemPrompt": "...",
    "includeContext": "none",
    "modelPreferences": {
      "costPriority": 0.3,
      "speedPriority": 0.2,
      "intelligencePriority": 0.5,
      "hints": [{ "name": "claude-3-5-sonnet" }]
    },
    "maxTokens": 1024
  }
}
```

客户端运行其LLM，返回：

```json
{
  "jsonrpc": "2.0",
  "id": 42,
  "result": {
    "role": "assistant",
    "content": { "type": "text", "text": "..." },
    "model": "claude-3-5-sonnet-20251022",
    "stopReason": "endTurn"
  }
}
```

### `modelPreferences`

三个浮点数总和为1.0：

- `costPriority`：偏好更便宜的模型。
- `speedPriority`：偏好更快的模型。
- `intelligencePriority`：偏好更强大的模型。

加上 `hints`：服务器偏好的命名模型。客户端可能或可能不遵守提示；客户端的用户配置始终优先。

### `includeContext`

三个值：

- `"none"` — 仅服务器提供的消息。默认。
- `"thisServer"` — 包含此服务器会话的先前消息。
- `"allServers"` — 包含所有会话上下文。

`includeContext` 在2025-11-25起被软弃用，因为它泄漏跨服务器上下文，这是安全问题。偏好 `"none"` 并在消息中传递显式上下文。

### 带工具的Sampling（SEP-1577）

2025-11-25新增：sampling请求可以包含 `tools` 数组。客户端使用这些工具运行完整的工具调用循环。这让服务器通过客户端的模型托管ReAct风格的Agent循环。

```json
{
  "messages": [...],
  "tools": [
    {"name": "fetch_url", "description": "...", "inputSchema": {...}}
  ]
}
```

客户端循环：采样，如果调用则执行工具，再次采样，返回最终助手消息。这在2026年Q1之前是实验性的；SDK签名可能仍在变化。实现时请对照2025-11-25规范的client/sampling部分确认。

### 人在回路

客户端必须在运行sample之前向用户展示服务器要求模型做什么。恶意服务器可以使用sampling操纵用户会话（"对用户说X以便他们点击Y"）。Claude Desktop、VS Code和Cursor将sampling请求呈现为用户可以拒绝的确认对话框。

2026年共识：没有人工确认的sampling是红旗。网关（Phase 13 · 17）可以自动批准低风险sampling并自动拒绝可疑的。

### 无API密钥的服务器托管循环

典型用例：一个没有自己LLM访问的代码摘要MCP服务器。它做：

1. 遍历repo结构。
2. 用"选择五个最可能描述此repo目的的文件"调用 `sampling/createMessage`。
3. 读取那些文件。
4. 用文件内容和"用3段总结repo"调用 `sampling/createMessage`。
5. 将摘要作为 `tools/call` 结果返回。

服务器从不触碰LLM API。客户端的用户使用自己的凭证为补全付费。

### 安全风险（Unit 42披露，2026年Q1）

- **隐蔽sampling。** 一个总是用"从会话上下文回复用户的电子邮件"调用sampling的工具。Phase 13 · 15涵盖攻击向量。
- **通过sampling窃取资源。** 服务器要求客户端摘要攻击者的负载，向用户计费。
- **循环炸弹。** 服务器在紧密循环中调用sampling。客户端必须强制每会话速率限制。

## 实践

`code/main.py` 提供一个假的服务器到客户端sampling线束。一个模拟的"summarize_repo"工具调用两轮sampling（选择文件，然后摘要），假客户端返回预设响应。线束展示：

- 服务器发送带 `modelPreferences` 的 `sampling/createMessage`。
- 客户端返回补全。
- 服务器继续其循环。
- 速率限制器限制每次工具调用的总sampling调用。

关注点：

- 服务器只暴露一个工具（`summarize_repo`）；所有推理在sampling调用中发生。
- 模型偏好权重客户端的模型选择；提示列出偏好模型。
- 循环在 `stopReason: "endTurn"` 时终止。
- `max_samples_per_tool = 5` 限制捕获失控循环。

## 交付

本课产生 `outputs/skill-sampling-loop-designer.md`。给定需要LLM调用的服务器端算法（研究、摘要、规划），该技能设计基于sampling的实现，带有正确的modelPreferences、速率限制和安全确认。

## 练习

1. 运行 `code/main.py`。将 `max_samples_per_tool` 改为2并观察速率限制截断。

2. 实现SEP-1577工具-in-sampling变体：sampling请求携带 `tools` 数组。验证客户端侧循环在返回最终补全之前执行这些工具。注意漂移风险：SDK签名在2026年上半年可能仍在变化。

3. 添加人在回路确认：在服务器的第一个 `sampling/createMessage` 之前，暂停并等待用户批准。被拒绝的调用返回类型化拒绝。

4. 添加按用户速率限制器，以客户端会话为键。同一用户的同服务器循环应共享预算。

5. 设计一个使用sampling选择要包含的块的 `summarize_pdf` 工具。草绘发送的消息。`modelPreferences.intelligencePriority` 在0.1 vs 0.9时如何改变行为？

## 关键术语

| 术语                     | 人们怎么说              | 实际含义                                     |
| ------------------------ | ----------------------- | -------------------------------------------- |
| Sampling                 | "服务器到客户端LLM调用" | 服务器请求客户端模型做补全                   |
| `sampling/createMessage` | "方法"                  | sampling请求的JSON-RPC方法                   |
| `modelPreferences`       | "模型优先级"            | 成本/速度/智能权重加名称提示                 |
| `includeContext`         | "跨会话泄漏"            | 软弃用的上下文包含模式                       |
| SEP-1577                 | "sampling中的工具"      | 允许sampling中的工具用于服务器托管ReAct      |
| Human-in-the-loop        | "用户确认"              | 客户端在运行前向用户展示sampling请求         |
| Loop bomb                | "失控sampling"          | 服务器端无限sampling循环；客户端必须速率限制 |
| Covert sampling          | "隐藏推理"              | 恶意服务器在sampling提示中隐藏意图           |
| Resource theft           | "使用用户的LLM预算"     | 服务器强制客户端在不想要的sampling上花费     |
| `stopReason`             | "生成为何停止"          | `endTurn`、`stopSequence` 或 `maxTokens`     |

## 延伸阅读

- [MCP — Concepts: Sampling](https://modelcontextprotocol.io/docs/concepts/sampling) — sampling的高级概述
- [MCP — Client sampling spec 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/client/sampling) — 权威 `sampling/createMessage` 形状
- [MCP — GitHub SEP-1577](https://github.com/modelcontextprotocol/modelcontextprotocol) — sampling中工具的规范演进提案（实验性）
- [Unit 42 — MCP attack vectors](https://unit42.paloaltonetworks.com/model-context-protocol-attack-vectors/) — 隐蔽sampling和资源窃取模式
- [Speakeasy — MCP sampling core concept](https://www.speakeasy.com/mcp/core-concepts/sampling) — 带客户端代码示例的演练
