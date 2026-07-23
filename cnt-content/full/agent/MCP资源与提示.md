---
title: 'MCP资源与提示 — 超越工具的上下文暴露'
description: 掌握工具、资源、提示三种原语的选择决策，实现资源订阅和提示模板
module: agent
difficulty: intermediate
tags:
  - MCP资源
  - MCP提示
  - 原语选择
  - 资源订阅
related:
  - agent/MCP异步任务
  - agent/MCP应用
  - agent/METR时间范围与外部评估
  - 'agent/OpenAI-Agents-SDK'
prerequisites:
  - agent/概述与架构
---

# MCP资源与提示 — 超越工具的上下文暴露

> 工具获得MCP 90%的关注。其他两个服务器原语解决不同的问题。资源暴露数据供读取；提示暴露可重用模板作为斜杠命令。许多服务器应该使用资源而不是将读取包装在工具中，使用提示而不是在客户端提示中硬编码工作流。本课命名决策规则并走过 `resources/*` 和 `prompts/*` 消息。

**类型：** 构建
**语言：** Python（标准库，资源 + 提示处理程序）
**前置条件：** Phase 13 · 07（MCP服务器）
**时间：** ~45分钟

## 学习目标

- 在给定领域下决定将能力暴露为工具、资源还是提示。
- 实现 `resources/list`、`resources/read`、`resources/subscribe` 并处理 `notifications/resources/updated`。
- 实现带参数模板的 `prompts/list` 和 `prompts/get`。
- 识别宿主何时将提示呈现为斜杠命令 vs 自动注入的上下文。

## 问题所在

一个朴素的笔记应用MCP服务器将所有东西暴露为工具：`notes_read`、`notes_list`、`notes_search`。这将每次数据访问包装在模型驱动的工具调用中。后果：

- 模型必须决定是否为每个可能受益于上下文的查询调用 `notes_read`。
- 只读内容无法被订阅或流式传输到宿主的侧面板。
- 客户端UI（Claude Desktop的资源附件面板、Cursor的"Include file"选择器）无法暴露数据。

正确的分割：将数据暴露为资源，将修改或计算动作暴露为工具，将可重用的多步工作流暴露为提示。每个原语有其UX展示和访问模式。

## 核心概念

### 工具 vs 资源 vs 提示 — 决策规则

| 能力                               | 原语     |
| ---------------------------------- | -------- |
| 用户想搜索、过滤或转换数据         | tool     |
| 用户想让宿主将此数据作为上下文包含 | resource |
| 用户想要一个可以重跑的模板化工作流 | prompt   |

指导原则：如果模型在每个相关查询上都会受益于调用它，它是工具。如果用户会受益于将其附加到对话中，它是资源。如果整个多步工作流是用户想要重用的单位，它是提示。

### 资源

`resources/list` 返回 `{resources: [{uri, name, mimeType, description?}]}`。`resources/read` 接受 `{uri}` 并返回 `{contents: [{uri, mimeType, text | blob}]}`。

URI可以是任何可寻址的东西：

- `file:///Users/alice/notes/mcp.md`
- `postgres://my-db/query/SELECT ...`
- `notes://note-14`（自定义方案）
- `memory://session-2026-04-22/recent`（服务器特定）

`contents[]` 同时支持文本和二进制。二进制使用 `blob` 作为base64编码字符串加上 `mimeType`。

### 资源订阅

在能力中声明 `{resources: {subscribe: true}}`。客户端调用 `resources/subscribe {uri}`。服务器在资源变化时发送 `notifications/resources/updated {uri}`。客户端重新读取。

用例：一个笔记服务器的资源是磁盘上的文件；文件观察器触发更新通知；Claude Desktop在外部编辑时重新拉取文件到上下文。

### 资源模板（2025-11-25新增）

`resourceTemplates` 让你暴露参数化URI模式：`notes://{id}`，`id` 作为补全目标。客户端可以在资源选择器中自动补全id。

### 提示

`prompts/list` 返回 `{prompts: [{name, description, arguments?}]}`。`prompts/get` 接受 `{name, arguments}` 并返回 `{description, messages: [{role, content}]}`。

提示是一个模板，填充为宿主馈送给其模型的消息列表。例如，一个 `code_review` 提示接受 `file_path` 参数并返回三消息序列：系统消息、带文件体的用户消息和带推理模板的助手启动。

### 宿主和提示

Claude Desktop、VS Code和Cursor在聊天UI中将提示暴露为斜杠命令。用户输入 `/code_review` 并从表单中选择参数。服务器的提示是"用户快捷方式"和"发送给模型的完整提示"之间的契约。

并非每个客户端都支持提示 — 检查能力协商。声明了提示能力但客户端不支持提示的服务器只是不会看到斜杠命令。

### "列表变更"通知

资源和提示都在集合变化时发出 `notifications/list_changed`。刚导入20个新笔记的笔记服务器发出 `notifications/resources/list_changed`；客户端重新调用 `resources/list` 来获取新增。

### 内容类型约定

文本：`mimeType: "text/plain"`、`text/markdown`、`application/json`。
二进制：`image/png`、`application/pdf`，加上 `blob` 字段。
MCP Apps（第14课）：`text/html;profile=mcp-app` 在 `ui://` URI中。

### 动态资源

资源URI不必对应静态文件。`notes://recent` 可以在每次读取时返回最新五个笔记。`db://query/users/active` 可以执行参数化查询。服务器可以自由动态计算内容。

规则：如果客户端可以按URI缓存，URI必须稳定。如果计算是一次性的，URI应包含时间戳或nonce，使客户端缓存不会过期。

### 订阅 vs 轮询

支持订阅的客户端通过 `notifications/resources/updated` 获得服务器推送。不支持订阅的客户端或宿主通过重新读取来轮询。两者都符合规范。服务器的能力声明告诉客户端它支持哪种。

订阅的成本：服务器上的每会话状态（谁订阅了什么）。保持订阅集有界；断开连接的客户端应超时。

### 提示 vs 系统提示

MCP中的提示不是系统提示。宿主的系统提示（其自己的操作指令）和MCP提示（用户调用的服务器提供模板）并存。行为良好的客户端永远不让服务器提示覆盖其自己的系统提示；它分层叠加。

## 实践

`code/main.py` 用以下内容扩展第07课的笔记服务器：

- 每笔记资源（`notes://note-1` 等），带 `resources/subscribe` 支持。
- 一个 `review_note` 提示，渲染为三消息模板。
- 文件观察器模拟，在笔记被修改时发出 `notifications/resources/updated`。
- 一个 `notes://recent` 动态资源，始终返回最新五个笔记。

运行演示以查看完整流程。

## 交付

本课产生 `outputs/skill-primitive-splitter.md`。给定一个提议的MCP服务器，该技能将每个能力分类为工具/资源/提示并附理由。

## 练习

1. 运行 `code/main.py`。观察初始资源列表，然后触发笔记编辑并验证 `notifications/resources/updated` 事件触发。

2. 添加 `resources/list_changed` 发射器：当创建新笔记时，发送通知让客户端重新发现。

3. 为GitHub MCP服务器设计三个提示：`summarize_pr`、`triage_issue`、`release_notes`。每个带参数模式。提示体应无需进一步编辑即可运行。

4. 取第07课服务器中的现有工具，分类它应保持为工具还是拆分为资源加工具对。用一句话论证。

5. 阅读规范的 `server/resources` 和 `server/prompts` 部分。识别 `resources/read` 中一个很少填充但规范支持的字段。提示：查看资源内容上的 `_meta`。

## 关键术语

| 术语                              | 人们怎么说     | 实际含义                                           |
| --------------------------------- | -------------- | -------------------------------------------------- |
| Resource                          | "暴露的数据"   | 宿主可以读取的URI可寻址内容                        |
| Resource URI                      | "数据指针"     | 方案前缀标识符（`file://`、`notes://`等）          |
| `resources/subscribe`             | "监视变更"     | 客户端选择加入的特定URI服务器推送更新              |
| `notifications/resources/updated` | "资源变更"     | 向客户端信号订阅的资源有新内容                     |
| Resource template                 | "参数化URI"    | 带有宿主选择器补全提示的URI模式                    |
| Prompt                            | "斜杠命令模板" | 带参数槽的命名多消息模板                           |
| Prompt arguments                  | "模板输入"     | 宿主在渲染前收集的类型化参数                       |
| `prompts/get`                     | "渲染模板"     | 服务器返回填充的消息列表                           |
| Content block                     | "类型化块"     | `{type: text \| image \| resource \| ui_resource}` |
| Slash-command UX                  | "用户快捷方式" | 宿主将提示呈现为以 `/` 开头的命令                  |

## 延伸阅读

- [MCP — Concepts: Resources](https://modelcontextprotocol.io/docs/concepts/resources) — 资源URI、订阅和模板
- [MCP — Concepts: Prompts](https://modelcontextprotocol.io/docs/concepts/prompts) — 提示模板和斜杠命令集成
- [MCP — Server resources spec 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/server/resources) — 完整的 `resources/*` 消息参考
- [MCP — Server prompts spec 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts) — 完整的 `prompts/*` 消息参考
- [MCP — Protocol info site: resources](https://modelcontextprotocol.info/docs/concepts/resources/) — 扩展官方文档的社区指南
