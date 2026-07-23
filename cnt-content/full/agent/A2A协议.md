---
title: 'A2A协议 — Agent间通信'
description: '掌握Google A2A协议的Agent Card、Task生命周期和认证模型，实现跨框架Agent互操作'
module: agent
difficulty: advanced
tags:
  - A2A协议
  - 'Agent Card'
  - Agent间通信
  - Task生命周期
  - 互操作
related:
  - agent/最小Agent工作台
  - agent/作用域契约
  - agent/A2A协议深入
  - agent/Agent工作台为何模型失败
prerequisites:
  - agent/概述与架构
---

# A2A协议 — Agent间通信

> MCP连接Agent到工具。A2A连接Agent到Agent。Google的Agent-to-Agent协议（2025年4月v1.0，2026年3月v0.3-draft更新）标准化了Agent如何发现彼此的能力、委托任务和流式传输结果。如果MCP是"Agent到API"层，A2A就是"Agent到Agent"层。两者共存；两者解决不同问题。本课走过A2A的核心原语 — Agent Card、Task生命周期和认证模型 — 并构建一个最小A2A客户端，委托研究任务给远程Agent。

**类型：** 构建
**语言：** Python（标准库，A2A客户端 + 模拟远程Agent）
**前置条件：** Phase 13 · 06（MCP基础）
**时间：** ~75分钟

## 学习目标

- 解释A2A解决而MCP不解决的问题（Agent间委托 vs Agent到工具调用）。
- 解析Agent Card并识别远程Agent的能力。
- 走过Task生命周期（submitted -> working -> completed/failed/canceled）。
- 构建一个A2A客户端，委托任务给远程Agent并流式传输结果。

## 问题所在

一个研究Agent需要让代码Agent运行实验。使用MCP，研究Agent将代码Agent包装为工具 — 但代码Agent不是工具。它是一个有自己推理循环、自己的工具集和自己状态的自主Agent。将其包装为工具会丢失其自主性。

A2A解决了这个差距。研究Agent委托一个Task给代码Agent。代码Agent独立工作，调用其自己的工具，并流式传输结果。研究Agent观察和协调。

2026年的生产示例：Google内部的A2A部署在Google Cloud中连接旅行规划Agent、酒店预订Agent和支付Agent。每个都是独立的；A2A是协调层。

## 核心概念

### Agent Card

每个A2A Agent在众所周知的URL发布Agent Card（JSON文档）：

```json
{
  "name": "Code Runner",
  "description": "Executes Python code in a sandbox and returns results",
  "url": "https://code-runner.example.com/a2a",
  "capabilities": {
    "streaming": true,
    "pushNotifications": true
  },
  "skills": [
    {
      "name": "run_python",
      "description": "Execute Python code and return stdout/stderr",
      "inputSchema": { "type": "object", "properties": { "code": { "type": "string" } } }
    }
  ],
  "authentication": {
    "schemes": ["bearer"]
  }
}
```

客户端在委托任务之前获取并解析Agent Card。`skills` 数组是Agent可以做的声明 — 类似于MCP的 `tools/list`，但在委托级别而非工具级别。

### Task生命周期

A2A中的核心单位是Task。生命周期：

```
submitted -> working -> completed
                     -> failed
                     -> canceled
                     -> input_required (暂停等待调用者输入)
```

客户端发送 `tasks/send` 创建任务。Agent响应初始状态。如果Agent支持流式传输，客户端可以调用 `tasks/sendSubscribe` 接收增量更新。如果Agent需要更多输入，它转换到 `input_required`，客户端提供它，Agent恢复到 `working`。

### 消息和部件

Task中的通信使用消息和部件：

- **消息。** 来自客户端或Agent。包含一个或多个部件。
- **部件。** 类型化内容：`text`、`file`、`data`。

```json
{
  "role": "agent",
  "parts": [
    { "type": "text", "text": "I ran the code. Here is the output:" },
    { "type": "text", "text": "42\n" }
  ]
}
```

### 流式传输

支持流式传输的Agent可以发送增量更新：部分文本、进度指示器、中间结果。客户端使用 `tasks/sendSubscribe`（SSE或WebSocket）接收它们。

### 推送通知

支持推送通知的Agent可以在任务完成时向客户端注册的webhook发送通知。适用于长时间运行的任务，客户端不想保持连接打开。

### 认证

A2A v1.0支持Bearer token和API密钥。v0.3-draft添加了OAuth 2.0和mTLS。认证模型比MCP的OAuth 2.1配置更简单，因为A2A Agent通常是服务器到服务器的，不是用户面向的。

### A2A vs MCP — 何时使用哪个

| 方面     | MCP                  | A2A                           |
| -------- | -------------------- | ----------------------------- |
| 连接     | Agent到工具          | Agent到Agent                  |
| 发现     | `tools/list`         | Agent Card                    |
| 调用     | `tools/call`         | `tasks/send`                  |
| 自主性   | 无（工具是哑执行器） | 完整（Agent有自己的推理循环） |
| 状态     | 无状态（请求-响应）  | 有状态（Task生命周期）        |
| 流式传输 | 通过传输SSE          | 通过 `tasks/sendSubscribe`    |
| 认证     | OAuth 2.1 + PKCE     | Bearer / API密钥 / OAuth 2.0  |

使用MCP当Agent需要调用工具（数据库、API、文件系统）。使用A2A当一个Agent需要委托工作给另一个自主Agent。

### 组合

生产系统两者都用。一个协调Agent使用A2A委托子任务给专业Agent。每个专业Agent使用MCP调用其自己的工具。A2A是编排层；MCP是集成层。

### A2A v0.3-draft变更（2026年3月）

- 添加了 `tasks/resubscribe` 用于在断开后重新附加到流式任务。
- 扩展了Agent Card，带有 `securitySchemes` 用于细粒度认证。
- 添加了 `tasks/get` 用于获取任务详情而不订阅。
- 改进了 `input_required` 流程，带有结构化输入模式。

## 实践

`code/main.py` 实现了一个最小A2A客户端和一个模拟远程Agent。客户端：

1. 获取Agent Card。
2. 用 `tasks/send` 发送研究任务。
3. 通过 `tasks/sendSubscribe` 流式传输结果。
4. 处理 `input_required` 状态（Agent请求澄清）。

模拟Agent运行一个假研究循环：搜索、阅读、综合。无真实LLM — 只是预编程响应，展示协议形状。

## 交付

本课产生 `outputs/skill-a2a-delegation-designer.md`。给定一个多Agent工作流，该技能识别哪些交互应该是A2A（Agent间）vs MCP（Agent到工具），并设计Agent Card和Task流。

## 练习

1. 运行 `code/main.py`。追踪Task从 `submitted` 到 `working` 到 `completed` 的生命周期。

2. 添加一个 `input_required` 场景：Agent请求"哪个数据库？"，客户端用"Postgres"响应，Agent恢复。

3. 实现推送通知：Agent在完成时向客户端注册的webhook发送POST。

4. 设计一个三Agent系统：协调器、研究器、编写器。草拟每个的Agent Card和A2A交互序列。

5. 阅读A2A v0.3-draft规范。识别v1.0中不存在的一个新能力并解释它启用了什么。

## 关键术语

| 术语                  | 人们怎么说         | 实际含义                      |
| --------------------- | ------------------ | ----------------------------- |
| A2A                   | "Agent到Agent协议" | Google的Agent间通信协议       |
| Agent Card            | "能力文档"         | 发布Agent技能和认证的JSON文档 |
| Task                  | "委托的工作单位"   | A2A中的核心状态单位           |
| `tasks/send`          | "委托方法"         | 客户端创建新Task              |
| `tasks/sendSubscribe` | "流式委托"         | 带增量更新的委托              |
| `input_required`      | "Agent暂停"        | Agent请求更多输入             |
| Part                  | "类型化内容块"     | 消息中的text/file/data        |
| Push notification     | "完成webhook"      | Agent在完成时通知客户端       |
| Skill                 | "Agent级工具"      | Agent Card中声明的能力        |
| Streaming             | "增量结果"         | Agent随工作进展发送部分结果   |

## 延伸阅读

- [Google — A2A protocol](https://github.com/google/A2A) — 官方规范和参考实现
- [Google — A2A documentation](https://google.github.io/A2A/) — 协议指南和示例
- [Google Cloud — A2A in production](https://cloud.google.com/blog/ai-machine-learning/a2a-protocol-production/) — Google内部部署故事
- [A2A v0.3-draft specification](https://github.com/google/A2A/tree/main/specification) — 最新规范草案
