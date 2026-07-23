---
title: 'Claude Agent SDK：子Agent与会话存储'
description: 'Claude Agent SDK是Claude Code线束的库形式。内置工具、子Agent用于上下文隔离、钩子、W3C追踪传播、会话存储对等。Claude Managed Agents是长时间运行异步工作的托管替代。'
module: agent
related:
  - 'agent/AutoGen-Actor模型与Agent框架'
  - 'agent/CAIS-CAISI与社会规模风险'
  - 'agent/Claude-Code权限模式'
  - agent/CrewAI角色团队与流程
prerequisites:
  - agent/概述与架构
---

﻿---
title: Claude-Agent-SDK
description: "Claude Agent SDK是Claude Code线束的库形式。内置工具、子Agent用于上下文隔离、钩子、W3C追踪传播、会话存储对等。Claude Managed Agents是长时间运行异步工作的托管替代。"
module: agent

---

# Claude Agent SDK：子Agent与会话存储

> Claude Agent SDK是Claude Code线束的库形式。内置工具、子Agent用于上下文隔离、钩子、W3C追踪传播、会话存储对等。Claude Managed Agents是长时间运行异步工作的托管替代。

**类型：** 学习 + 构建
**语言：** Python (stdlib)
**前置条件：** Phase 14 · 01 (Agent循环), Phase 14 · 10 (技能库)
**时间：** ~75分钟

## 学习目标

- 解释Anthropic Client SDK（原始API）和Claude Agent SDK（线束形状）的区别。
- 描述子Agent——并行化和上下文隔离——以及何时使用它们。
- 说出Python SDK的会话存储面（`append`、`load`、`list_sessions`、`delete`、`list_subkeys`）和`--session-mirror`的作用。
- 实现一个带内置工具、隔离上下文的子Agent生成、生命周期钩子和会话存储的stdlib线束。

## 问题所在

原始LLM API给你一次往返。生产Agent需要工具执行、MCP服务器、生命周期钩子、子Agent生成、会话持久化、追踪传播。Claude Agent SDK将这个形状作为库发布——Claude Code使用的相同线束，暴露给自定义Agent。

## 核心概念

### Client SDK vs Agent SDK

- **Client SDK (`anthropic`)。** 原始Messages API。你拥有循环、工具、状态。
- **Agent SDK (`claude-agent-sdk`)。** 内置工具执行、MCP连接、钩子、子Agent生成、会话存储。Claude Code循环作为库。

### 内置工具

SDK开箱提供10+工具：文件读/写、shell、grep、glob、web fetch等。自定义工具通过标准工具Schema接口注册。

### 子Agent

Anthropic文档的两个目的：

1. **并行化。** 并发运行独立工作。"为这20个模块找到测试文件"是20个并行子Agent任务。
2. **上下文隔离。** 子Agent使用自己的上下文窗口；只有结果返回给编排器。编排器的预算被保留。

Python SDK最近添加：`list_subagents()`、`get_subagent_messages()`用于读取子Agent记录。

### 会话存储

与TypeScript的协议对等：

- `append(session_id, message)` — 添加一轮。
- `load(session_id)` — 恢复对话。
- `list_sessions()` — 枚举。
- `delete(session_id)` — 级联到子Agent会话。
- `list_subkeys(session_id)` — 列出子Agent键。

`--session-mirror`（CLI标志）在流式传输时将记录镜像到外部文件，用于调试。

### 钩子

你可以注册的生命周期钩子：

- `PreToolUse`、`PostToolUse` — 门控或审计工具调用。
- `SessionStart`、`SessionEnd` — 设置和拆卸。
- `UserPromptSubmit` — 在模型看到用户输入前对其采取行动。
- `PreCompact` — 在上下文压缩前运行。
- `Stop` — Agent退出时清理。
- `Notification` — 旁路通道警报。

钩子是pro-workflow和类似系统添加横切行为的方式。

### W3C追踪上下文

调用者上活跃的OTel span通过W3C追踪上下文头传播到CLI子进程。整个多进程追踪在你的后端中显示为一个追踪。

### Claude Managed Agents

托管替代（beta头`managed-agents-2026-04-01`）。长时间运行异步工作，内置提示缓存，内置压缩。用控制权换取托管基础设施。

### 这个模式哪里会出错

- **子Agent过度生成。** 为100个小任务生成100个子Agent。开销占主导。改为批量处理。
- **钩子蔓延。** 每个团队添加钩子；启动时间膨胀。每季度审查钩子。
- **会话膨胀。** 会话积累；大小增长。使用`list_sessions` + 过期策略。

## 构建它

`code/main.py`在stdlib中实现SDK形状：

- `Tool`、`ToolRegistry`带内置`read_file`、`write_file`、`list_dir`。
- `Subagent` — 私有上下文，隔离运行，结果返回。
- `SessionStore` — append、load、list、delete、list_subkeys。
- `Hooks` — `pre_tool_use`、`post_tool_use`、`session_start`、`session_end`。
- 演示：主Agent并行生成3个子Agent（每个隔离），聚合结果，持久化会话。

运行：

```
python3 code/main.py
```

跟踪显示子Agent上下文隔离（编排器上下文大小保持有界）、钩子执行和会话持久化。

## 使用它

- **Claude Agent SDK**用于想要Claude Code线束形状的Claude优先产品。
- **Claude Managed Agents**用于托管长时间运行异步工作。
- **OpenAI Agents SDK**（第16课）用于OpenAI优先的对应物。
- **LangGraph + 自定义工具**如果你想要图形状的状态机。

## 发布它

`outputs/skill-claude-agent-scaffold.md`脚手架一个Claude Agent SDK应用，带子Agent、钩子、会话存储、MCP服务器附加和W3C追踪传播。

## 练习

1. 添加一个子Agent生成器，将20个任务批量为5个并行子Agent组。测量编排器上下文大小与每任务一个的对比。
2. 实现一个`PreToolUse`钩子，限制`write_file`调用速率（每会话每分钟5次）。跟踪行为。
3. 连接`list_subkeys`渲染子Agent树。深度嵌套看起来什么样？
4. 将玩具移植到真实的`claude-agent-sdk` Python包。工具注册有什么变化？
5. 阅读Claude Managed Agents文档。你何时会从自托管切换到托管？

## 关键术语

| 术语               | 人们常说的          | 实际含义                                     |
| ------------------ | ------------------- | -------------------------------------------- |
| Agent SDK          | "Claude Code作为库" | 线束形状：工具、MCP、钩子、子Agent、会话存储 |
| 子Agent            | "子Agent"           | 分离上下文，自有预算；结果向上冒泡           |
| 会话存储           | "对话DB"            | 持久化、加载、列出、删除带子Agent级联的轮次  |
| 钩子               | "生命周期回调"      | 工具前后、会话、提示提交、压缩、停止         |
| W3C追踪上下文      | "跨进程追踪"        | 父span传播到CLI子进程                        |
| Managed Agents     | "托管线束"          | Anthropic托管的长时间运行异步工作            |
| `--session-mirror` | "记录镜像"          | 在流式传输时将会话轮次写入外部文件           |
| MCP服务器          | "工具面"            | 附加到Agent的外部工具/资源源                 |

## 延伸阅读

- [Claude Agent SDK概述](https://platform.claude.com/docs/en/agent-sdk/overview) — Claude Code的库形式
- [Anthropic, Building agents with the Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk) — 生产模式
- [Claude Managed Agents概述](https://platform.claude.com/docs/en/managed-agents/overview) — 托管替代
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/) — 对应物
