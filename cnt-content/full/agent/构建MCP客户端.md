---
title: '构建MCP客户端 — 发现、调用、会话管理'
description: 构建多服务器MCP客户端，实现进程生成、能力协商、工具列表合并、命名空间冲突处理和路由
module: agent
difficulty: advanced
tags:
  - MCP客户端
  - 多服务器
  - 命名空间
  - 会话管理
related:
  - agent/共享记忆与黑板
  - agent/构建MCP服务器
  - agent/函数调用深入
  - agent/鎬濈淮鏍戜笌LATS
prerequisites:
  - agent/概述与架构
---

# 构建MCP客户端 — 发现、调用、会话管理

> 大多数MCP内容发布服务器教程然后对客户端挥手了事。客户端代码是硬编排所在：进程生成、能力协商、跨多服务器的工具列表合并、sampling回调、重连和命名空间冲突解决。本课构建一个多服务器客户端，将三个不同的MCP服务器提升到一个扁平工具命名空间供模型使用。

**类型：** 构建
**语言：** Python（标准库，多服务器MCP客户端）
**前置条件：** Phase 13 · 07（构建MCP服务器）
**时间：** ~75分钟

## 学习目标

- 将MCP服务器作为子进程生成，完成 `initialize`，并发送 `notifications/initialized`。
- 维护每服务器会话状态（能力、工具列表、最近见到的通知id）。
- 跨多个服务器合并工具列表到一个带冲突处理的命名空间。
- 将工具调用路由到拥有它的服务器并重组响应。

## 问题所在

真正的Agent宿主（Claude Desktop、Cursor、Goose、Gemini CLI）同时加载多个MCP服务器。用户可能同时运行文件系统服务器、Postgres服务器和GitHub服务器。客户端的工作：

1. 生成每个服务器。
2. 独立握手每个。
3. 对每个调用 `tools/list` 并扁平化结果。
4. 当模型发出 `notes_search` 时，在合并命名空间中查找并路由到正确的服务器。
5. 处理来自任何服务器的通知（`tools/list_changed`）而不阻塞。
6. 在传输失败时重连。

手工完成所有这些是区分"玩具"和"可用"的关键。官方SDK包装了这些，但心智模型必须是你自己的。

## 核心概念

### 子进程生成

`subprocess.Popen` 带 `stdin=PIPE, stdout=PIPE, stderr=PIPE`。设置 `bufsize=1` 并使用文本模式进行逐行读取。每个服务器是一个进程；客户端每个服务器持有一个 `Popen` 句柄。

### 每服务器会话状态

每个服务器的 `Session` 对象持有：

- `process` — Popen句柄。
- `capabilities` — 服务器在 `initialize` 声明的。
- `tools` — 最后的 `tools/list` 结果。
- `pending` — 请求id到等待响应的promise/future的映射。

请求本质上是异步的；发送到服务器A的 `tools/call` 在服务器B中途调用时不得阻塞。使用带队列的线程或asyncio。

### 合并命名空间

当客户端看到聚合工具列表时，名称可能冲突。两个服务器可能都暴露 `search`。客户端有三个选项：

1. **按服务器名前缀。** `notes/search`、`files/search`。清晰但丑陋。
2. **静默先来。** 后来的服务器 `search` 覆盖先前的。有风险；隐藏冲突。
3. **冲突拒绝。** 拒绝加载第二个服务器；通知用户。对安全敏感的宿主最安全。

Claude Desktop使用按服务器名前缀。Cursor使用带清晰错误的冲突拒绝。VS Code MCP也采用按服务器名前缀。

### 路由

合并后，调度表映射 `tool_name -> session`。模型按名称发出调用；客户端找到会话并将 `tools/call` 消息写入该服务器的stdin，然后等待响应。

### Sampling回调

如果服务器在 `initialize` 声明了 `sampling` 能力，它可以发送 `sampling/createMessage` 要求客户端运行其LLM。客户端必须：

1. 阻止对该服务器的进一步请求直到sample完成，或者如果其实现支持并发则管道化。
2. 调用其LLM提供商。
3. 将响应发送回服务器。

第11课端到端涵盖sampling。本课为完整性而存根。

### 通知处理

`notifications/tools/list_changed` 意味着重新调用 `tools/list`。`notifications/resources/updated` 意味着如果资源在使用中则重新读取。通知不得产生响应 — 不要尝试确认它们。

一个常见客户端bug：在 `tools/call` 上阻塞读取循环而通知在流中等待。使用后台读取线程将每条消息推入队列；主线程出队并调度。

### 重连

传输可能失败：服务器崩溃、OS杀死进程、stdio管道断裂。客户端在stdout上检测EOF并将会话视为死亡。选项：

- 静默重启服务器并重新握手。对纯只读服务器可以。
- 向用户显示失败。对有用户可见会话的有状态服务器可以。

Phase 13 · 09涵盖Streamable HTTP重连语义；stdio更简单。

### 保活和会话id

Streamable HTTP使用 `Mcp-Session-Id` 头。stdio没有会话id — 进程身份就是会话。保活ping是可选的；stdio管道在不活动下不会断裂。

## 实践

`code/main.py` 生成三个模拟MCP服务器作为子进程，握手每个，合并它们的工具列表，并将工具调用路由到正确的服务器。"服务器"实际上是运行玩具响应器的其他Python进程（无真实LLM）。运行它以看到：

- 三次初始化，每次有自己的能力集。
- 三个 `tools/list` 结果合并为7工具命名空间。
- 基于工具名称的路由决策。
- 通过命名空间前缀防止的冲突。

关注点：

- `Session` 数据类干净地持有每服务器状态。
- 后台读取线程将stdout上的每一行出队而不阻塞主线程。
- 调度表是简单的 `dict[str, Session]`。
- 冲突处理是显式的：当两个服务器声明相同名称时，后来的用前缀重命名。

## 交付

本课产生 `outputs/skill-mcp-client-harness.md`。给定MCP服务器的声明式列表（名称、命令、参数），该技能生成一个线束，生成它们、合并工具列表，并提供带冲突解决的路由函数。

## 练习

1. 运行 `code/main.py` 并观察服务器生成日志。用SIGTERM杀死一个模拟服务器进程，观察客户端如何检测EOF并将该会话标记为死亡。

2. 实现命名空间前缀。当两个服务器暴露 `search` 时，将第二个重命名为 `<server>/search`。更新调度表并验证工具调用正确路由。

3. 为服务器重启添加连接池式退避：连续失败的指数退避，上限30秒，三次失败后向用户发出通知。

4. 草绘一个支持100个并发MCP服务器的客户端。什么数据结构替换简单的调度字典？（提示：用于前缀命名空间的trie，加上每服务器工具计数指标。）

5. 将客户端移植到官方MCP Python SDK。SDK包装了 `stdio_client` 和 `ClientSession`。代码应从约200行缩减到约40行，同时保留多服务器路由。

## 关键术语

| 术语                      | 人们怎么说           | 实际含义                                         |
| ------------------------- | -------------------- | ------------------------------------------------ |
| MCP client                | "Agent宿主"          | 生成服务器并编排工具调用的进程                   |
| Session                   | "每服务器状态"       | 能力、工具列表和待处理请求簿记                   |
| Merged namespace          | "一个工具列表"       | 跨所有活动服务器的扁平工具名称集                 |
| Namespace collision       | "两个服务器同一工具" | 客户端必须前缀、拒绝或先来处理重复               |
| Routing                   | "谁得到这个调用？"   | 从工具名到拥有服务器的调度                       |
| Background reader         | "非阻塞stdout"       | 将服务器stdout排入队列的线程或任务               |
| Sampling callback         | "LLM即服务"          | 服务器 `sampling/createMessage` 的客户端处理程序 |
| `notifications/*_changed` | "原语变更"           | 客户端必须重新发现或重新读取的信号               |
| Reconnection policy       | "服务器死亡时"       | 传输失败时的重启语义                             |
| Stdio session             | "进程=会话"          | 无会话id；子进程生命周期是会话                   |

## 延伸阅读

- [Model Context Protocol — Client spec](https://modelcontextprotocol.io/specification/2025-11-25/client) — 权威客户端行为
- [MCP — Quickstart client guide](https://modelcontextprotocol.io/quickstart/client) — 使用Python SDK的hello-world客户端教程
- [MCP Python SDK — client module](https://github.com/modelcontextprotocol/python-sdk) — 参考 `ClientSession` 和 `stdio_client`
- [MCP TypeScript SDK — Client](https://github.com/modelcontextprotocol/typescript-sdk) — TS平行实现
- [VS Code — MCP in extensions](https://code.visualstudio.com/api/extension-guides/ai/mcp) — VS Code如何在单个编辑器宿主中多路复用多个MCP服务器
