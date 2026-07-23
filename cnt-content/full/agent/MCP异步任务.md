---
title: 'MCP异步任务 — 即时调用、稍后获取'
description: '掌握SEP-1686异步任务原语，实现长时间运行工具的异步执行、状态轮询和崩溃恢复'
module: agent
difficulty: advanced
tags:
  - MCP异步任务
  - 'SEP-1686'
  - 任务生命周期
  - 崩溃恢复
related:
  - agent/MCP生产认证
  - agent/MCP网关与注册表
  - agent/MCP应用
  - agent/MCP资源与提示
prerequisites:
  - agent/概述与架构
---

# MCP异步任务 — 即时调用、稍后获取

> 真正的Agent工作需要几分钟到几小时：CI运行、深度研究综合、批量导出。同步工具调用断开连接、超时或阻塞UI。SEP-1686，合并于2025-11-25，添加了Tasks原语：任何请求都可以增强为任务，结果可以稍后获取或通过状态通知流式传输。漂移风险提示：Tasks在2026年上半年之前是实验性的；SDK表面仍在围绕规范设计。

**类型：** 构建
**语言：** Python（标准库，异步任务状态机）
**前置条件：** Phase 13 · 07（MCP服务器），Phase 13 · 09（传输）
**时间：** ~75分钟

## 学习目标

- 识别何时将工具从同步提升为任务增强（>30秒的服务器端工作）。
- 走过任务生命周期：`working` -> `input_required` -> `completed` / `failed` / `cancelled`。
- 持久化任务状态，使崩溃不会丢失进行中的工作。
- 正确轮询 `tasks/status` 和获取 `tasks/result`。

## 问题所在

一个 `generate_report` 工具运行多分钟提取管道。同步模型下的选项：

1. 保持连接打开三分钟。远程传输断开它；客户端超时；UI冻结。
2. 立即返回占位符；要求客户端轮询自定义端点。破坏MCP统一性。
3. 即发即忘；无结果。

都不好。SEP-1686添加了第四个：任务增强。任何请求（通常是 `tools/call`）可以标记为任务。服务器立即返回任务id。客户端轮询 `tasks/status` 并在完成时获取 `tasks/result`。服务器端状态在重启后存活。

## 核心概念

### 任务增强

请求通过设置 `params._meta.task.required: true`（或 `optional: true`，服务器决定）成为任务。服务器立即响应：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "_meta": {
      "task": {
        "id": "tsk_9f7b...",
        "state": "working",
        "ttl": 900000
      }
    }
  }
}
```

`ttl` 是服务器保留状态的承诺；ttl后任务结果被丢弃。

### 每工具选择加入

工具注解可以声明任务支持：

- `taskSupport: "forbidden"` — 此工具始终同步运行。快速工具安全。
- `taskSupport: "optional"` — 客户端可以请求任务增强。
- `taskSupport: "required"` — 客户端必须使用任务增强。

`generate_report` 工具应为 `required`。`notes_search` 工具应为 `forbidden`。

### 状态

```
working  -> input_required -> working  (通过elicitation循环)
working  -> completed
working  -> failed
working  -> cancelled
```

状态机是只追加的：一旦 `completed`、`failed` 或 `cancelled`，任务就是终态。

### 方法

- `tasks/status {taskId}` — 返回当前状态和进度提示。
- `tasks/result {taskId}` — 阻塞或返回404如果尚未完成。
- `tasks/cancel {taskId}` — 幂等；终态忽略。
- `tasks/list` — 可选；枚举活动和最近完成的任务。

### 流式状态变更

当服务器支持时，客户端可以订阅状态通知：

```
server -> notifications/tasks/updated {taskId, state, progress?}
```

流式而非轮询的客户端获得更好的UX。轮询始终作为最小表面支持。

### 持久状态

规范要求声明任务支持的服务器持久化状态。崩溃不应丢失ttl内已完成的结果。存储从SQLite到Redis到文件系统。第13课线束使用文件系统。

### 取消语义

`tasks/cancel` 是幂等的。如果任务正在执行中，服务器尝试停止（检查执行器协作取消）。如果已经是终态，请求是空操作。

### 崩溃恢复

当服务器进程重启时：

1. 加载所有持久化的任务状态。
2. 将进程死亡的任何 `working` 任务标记为 `failed`，错误为 `CRASH_RECOVERY`。
3. 在其ttl内保留 `completed` / `failed` / `cancelled`。

### 异步任务加sampling

任务本身可以调用 `sampling/createMessage`。这就是长时间运行研究任务的工作方式：服务器的任务线程根据需要采样客户端的模型，而客户端的UI将任务显示为 `working` 并带有定期进度更新。

### 为什么这是实验性的

SEP-1686在2025-11-25发布，但更广泛的路线图列出了三个开放问题：持久订阅原语、子任务（父子任务关系）和结果TTL标准化。预计规范在2026年期间会演进。生产代码应仅将Tasks视为常见情况的稳定方案，并对子任务防范未来的SDK变更。

## 实践

`code/main.py` 实现了一个持久任务存储（文件系统支持）和一个在后台线程中运行的 `generate_report` 工具。客户端调用工具，立即获得任务id，在工作器更新进度时轮询 `tasks/status`，并在完成时获取 `tasks/result`。取消有效；崩溃恢复通过杀死工作线程并重新加载状态来模拟。

关注点：

- 任务状态JSON持久化到 `/tmp/lesson-13-tasks/<id>.json`。
- 工作线程更新 `progress` 字段；轮询显示它推进。
- 客户端取消设置事件；工作线程检查并提前退出。
- "崩溃"时的状态重新加载将进行中的任务标记为 `CRASH_RECOVERY` 失败。

## 交付

本课产生 `outputs/skill-task-store-designer.md`。给定一个长时间运行的工具（研究、构建、导出），该技能设计任务存储（状态形状、ttl、持久性），选择正确的taskSupport标志，并草拟进度通知。

## 练习

1. 运行 `code/main.py`。启动一个 `generate_report` 任务，轮询状态，然后获取结果。

2. 在运行中途添加 `tasks/cancel` 调用。验证工作线程遵守它且状态变为 `cancelled`。

3. 模拟崩溃恢复：杀死工作线程，重启加载器，观察 `CRASH_RECOVERY` 失败模式。

4. 将存储扩展到SQLite。持久性收益相同；查询选项开放（列出会话X的所有任务）。

5. 阅读MCP 2026年路线图文章。识别最可能影响明年SDK API设计的一个Tasks相关开放问题。

## 关键术语

| 术语                          | 人们怎么说           | 实际含义                                       |
| ----------------------------- | -------------------- | ---------------------------------------------- |
| Task                          | "长时间运行工具调用" | 用 `_meta.task` 增强的请求用于异步执行         |
| SEP-1686                      | "Tasks规范"          | 2025-11-25添加Tasks的规范演进提案              |
| `_meta.task`                  | "任务信封"           | 包含id、state、ttl的每请求元数据               |
| taskSupport                   | "工具标志"           | 每工具的 `forbidden` / `optional` / `required` |
| `tasks/status`                | "轮询方法"           | 获取当前状态和可选进度提示                     |
| `tasks/result`                | "获取结果"           | 返回完成的负载或404如果尚未完成                |
| `tasks/cancel`                | "停止它"             | 幂等取消请求                                   |
| ttl                           | "保留预算"           | 服务器承诺保持任务状态的毫秒数                 |
| `notifications/tasks/updated` | "状态推送"           | 服务器发起的状态变更事件                       |
| Durable store                 | "崩溃安全状态"       | 文件系统 / SQLite / Redis持久层                |

## 延伸阅读

- [MCP — GitHub SEP-1686 issue](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1686) — 原始提案和完整讨论
- [WorkOS — MCP async tasks for AI agent workflows](https://workos.com/blog/mcp-async-tasks-ai-agent-workflows) — 带理由的设计演练
- [DeepWiki — MCP task system and async operations](https://deepwiki.com/modelcontextprotocol/modelcontextprotocol/2.7-task-system-and-async-operations) — 机制和状态机
- [FastMCP — Tasks](https://gofastmcp.com/servers/tasks) — SDK级任务实现模式
- [MCP blog — 2026 roadmap](https://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/) — 包括子任务在内的开放问题和2026年优先级
