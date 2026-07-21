---
title: '构建MCP服务器 — Python + TypeScript SDK'
description: 从零构建完整的MCP服务器，实现tools、resources、prompts三个原语，掌握调度循环和注解机制
module: agent
difficulty: intermediate
tags:
  - MCP服务器
  - FastMCP
  - stdio
  - 'JSON-RPC'
related:
  - agent/共识与拜占庭容错
  - agent/共享记忆与黑板
  - agent/构建MCP客户端
  - agent/函数调用深入
prerequisites:
  - agent/概述与架构
---

# 构建MCP服务器 — Python + TypeScript SDK

> 大多数MCP教程只展示stdio的hello-world。真正的服务器暴露工具加资源加提示，处理能力协商，发出结构化错误，并在SDK之间工作相同。本课端到端构建一个笔记服务器：标准库stdio传输、JSON-RPC调度、三个服务器原语，以及一个纯函数风格，在你升级时可以直接放入Python SDK的FastMCP或TypeScript SDK。

**类型：** 构建
**语言：** Python（标准库，stdio MCP服务器）
**前置条件：** Phase 13 · 06（MCP基础）
**时间：** ~75分钟

## 学习目标

- 实现 `initialize`、`tools/list`、`tools/call`、`resources/list`、`resources/read`、`prompts/list` 和 `prompts/get` 方法。
- 编写从stdin读取JSON-RPC消息并向stdout写入响应的调度循环。
- 按照JSON-RPC 2.0规范和MCP的附加码发出结构化错误响应。
- 将标准库实现升级到FastMCP（Python SDK）或TypeScript SDK，无需重写工具逻辑。

## 问题所在

在你使用远程传输（Phase 13 · 09）或认证层（Phase 13 · 16）之前，你需要一个干净的本地服务器。本地意味着stdio：服务器由客户端作为子进程生成，消息通过stdin/stdout换行分隔流动。

2025-11-25规范规定stdio消息编码为带有显式 `\n` 分隔符的JSON对象。这里没有SSE；SSE是旧的远程模式，正在2026年中期被移除（Atlassian的Rovo MCP服务器于2026年6月30日弃用它；Keboola于2026年4月1日）。对于stdio，每行一个JSON对象就是整个线路格式。

笔记服务器是一个好的形状，因为它练习了所有三个服务器原语。工具做修改（`notes_create`）。资源暴露数据（`notes://{id}`）。提示发布模板（`review_note`）。本课的形状可泛化到任何领域。

## 核心概念

### 调度循环

```
loop:
  line = stdin.readline()
  msg = json.loads(line)
  if has id:
    handle request -> write response
  else:
    handle notification -> no response
```

三条规则：

- 不要向stdout打印任何不是JSON-RPC信封的东西。调试日志到stderr。
- 每个请求必须匹配带有相同 `id` 的响应。
- 通知不得被响应。

### 实现 `initialize`

```python
def initialize(params):
    return {
        "protocolVersion": "2025-11-25",
        "capabilities": {
            "tools": {"listChanged": True},
            "resources": {"listChanged": True, "subscribe": False},
            "prompts": {"listChanged": False},
        },
        "serverInfo": {"name": "notes", "version": "1.0.0"},
    }
```

只声明你支持的。客户端依赖能力集来门控功能。

### 实现 `tools/list` 和 `tools/call`

`tools/list` 返回 `{tools: [...]}`，每个条目有 `name`、`description`、`inputSchema`。`tools/call` 接受 `{name, arguments}` 并返回 `{content: [blocks], isError: bool}`。

内容块是类型化的。最常见的：

```json
{"type": "text", "text": "Found 2 notes"}
{"type": "resource", "resource": {"uri": "notes://14", "text": "..."}}
{"type": "image", "data": "<base64>", "mimeType": "image/png"}
```

工具错误有两种形状。协议级错误（未知方法、错误参数）是JSON-RPC错误。工具级错误（有效调用但工具失败）返回为 `{content: [...], isError: true}`。这让模型在其上下文中看到失败。

### 实现资源

资源按设计是只读的。`resources/list` 返回清单；`resources/read` 返回内容。URI可以是 `file://...`、`http://...` 或自定义方案如 `notes://`。

当你将数据作为资源而不是工具暴露时：

- 模型不"调用"它；客户端可以在用户请求时将其注入上下文。
- 订阅让服务器在资源变化时推送更新（Phase 13 · 10）。
- Phase 13 · 14用 `ui://` 交互式资源扩展了这一点。

### 实现提示

提示是带有命名参数的模板。宿主将它们作为斜杠命令呈现。一个 `review_note` 提示可能接受一个 `note_id` 参数，并产生一个客户端馈送给其模型的多消息提示模板。

### stdio传输细节

- 换行分隔的JSON。无长度前缀帧。
- 不要缓冲。每次写入后 `sys.stdout.flush()`。
- 客户端控制生命周期。当stdin关闭（EOF）时，干净退出。
- 不要静默处理SIGPIPE；记录并退出。

### 注解

每个工具可以携带描述安全属性的 `annotations`：

- `readOnlyHint: true` — 纯读取，安全重试。
- `destructiveHint: true` — 不可逆副作用；客户端应确认。
- `idempotentHint: true` — 相同输入产生相同输出。
- `openWorldHint: true` — 与外部系统交互。

客户端使用这些来决定UX（确认对话框、状态指示器）和路由（Phase 13 · 17）。

### 升级路径

`code/main.py` 中的标准库服务器大约180行。FastMCP（Python）将相同逻辑折叠为装饰器风格：

```python
from fastmcp import FastMCP
app = FastMCP("notes")

@app.tool()
def notes_search(query: str, limit: int = 10) -> list[dict]:
    ...
```

TypeScript SDK有等效形状。当你准备好时，升级路径是即插即用的；概念（能力、调度、内容块）是相同的。

## 实践

`code/main.py` 是一个通过stdio的完整笔记MCP服务器，仅使用标准库。它处理 `initialize`、三个工具（`notes_list`、`notes_search`、`notes_create`）的 `tools/list` 和 `tools/call`、每个笔记的 `resources/list` 和 `resources/read`，以及一个 `review_note` 提示。你可以通过管道JSON-RPC消息来驱动它：

```
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | python main.py
```

关注点：

- 调度器是按方法名键控的 `dict[str, Callable]`。
- 每个工具执行器返回内容块列表，不是裸字符串。
- 执行器抛出异常时设置 `isError: true`。

## 交付

本课产生 `outputs/skill-mcp-server-scaffolder.md`。给定一个领域（笔记、工单、文件、数据库），该技能搭建一个带有正确工具/资源/提示分割和SDK升级路径的MCP服务器。

## 练习

1. 运行 `code/main.py` 并用手工构建的JSON-RPC消息驱动它。执行 `notes_create`，然后 `resources/read` 检索新笔记。

2. 添加一个 `notes_delete` 工具，带有 `annotations: {destructiveHint: true}`。验证客户端会显示确认对话框（这需要真实宿主；Claude Desktop可以）。

3. 实现 `resources/subscribe`，使服务器在笔记被修改时推送 `notifications/resources/updated`。添加保活任务。

4. 将服务器移植到FastMCP。Python文件应缩减到80行以下。线路行为必须相同；用相同的JSON-RPC测试线束验证。

5. 阅读规范的 `server/tools` 部分，识别本课服务器未实现的一个工具定义字段。（提示：有几个；选一个并添加它。）

## 关键术语

| 术语                   | 人们怎么说       | 实际含义                                            |
| ---------------------- | ---------------- | --------------------------------------------------- |
| MCP server             | "暴露工具的东西" | 通过stdio或HTTP说MCP JSON-RPC的进程                 |
| stdio transport        | "子进程模型"     | 服务器由客户端生成；通过stdin/stdout通信            |
| Dispatcher             | "方法路由器"     | JSON-RPC方法名到处理函数的映射                      |
| Content block          | "工具结果块"     | 工具响应 `content` 数组中的类型化元素               |
| `isError`              | "工具级失败"     | 信号工具失败；与JSON-RPC错误区分                    |
| Annotations            | "安全提示"       | readOnly / destructive / idempotent / openWorld标志 |
| FastMCP                | "Python SDK"     | MCP协议之上的装饰器风格高级框架                     |
| Resource URI           | "可寻址数据"     | `file://`、`db://` 或标识资源的自定义方案           |
| Prompt template        | "斜杠命令简述"   | 服务器提供的带有宿主UI参数槽的模板                  |
| Capability declaration | "功能开关"       | 在 `initialize` 中声明的按原语标志                  |

## 延伸阅读

- [Model Context Protocol — Python SDK](https://github.com/modelcontextprotocol/python-sdk) — 参考Python实现
- [Model Context Protocol — TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) — 平行TS实现
- [FastMCP — server framework](https://gofastmcp.com/) — MCP服务器的装饰器风格Python API
- [MCP — Quickstart server guide](https://modelcontextprotocol.io/quickstart/server) — 使用任一SDK的端到端教程
- [MCP — Server tools spec](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) — tools/\* 消息的完整参考
