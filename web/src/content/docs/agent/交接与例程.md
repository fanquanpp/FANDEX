---
title: 交接与例程
description: 'OpenAI 的 Swarm (2024 年 10 月) 将多 Agent 编排提炼为两个原语：例程（指令 + 工具作为系统提示）和交接（返回另一个 Agent 的工具）。没有状态机，没有分支 DSL——LLM 通过调用正确的交接工具来路由。OpenAI Agents SDK (2025 年 ...'
module: agent
related:
  - agent/监督者模式
  - agent/检查点与回滚
  - agent/角色专业化
  - agent/结构化输出
prerequisites:
  - agent/概述与架构
---

# 交接与例程 — 无状态编排

> OpenAI 的 Swarm (2024 年 10 月) 将多 Agent 编排提炼为两个原语：**例程**（指令 + 工具作为系统提示）和**交接**（返回另一个 Agent 的工具）。没有状态机，没有分支 DSL——LLM 通过调用正确的交接工具来路由。OpenAI Agents SDK (2025 年 3 月) 是生产继任者。Swarm 本身仍然是最干净的概念参考——其整个源码只有几百行。该模式之所以病毒式传播，是因为 API 表面大致是"agent = prompt + tools; handoff = function returning agent"。限制：无状态，所以记忆是调用者的问题。

**类型：** 学习 + 构建
**语言：** Python (stdlib)
**前置条件：** Phase 16 · 04 (原语模型)
**时间：** ~60 分钟

## 问题

每个多 Agent 框架都想让你学习它的 DSL：LangGraph 的节点和边、CrewAI 的团队和任务、AutoGen 的 GroupChat 和管理器。DSL 是真正的抽象，但它们让事情感觉比需要的更重。

Swarm 推向相反方向：使用模型已有的工具调用能力。交接变成工具调用。编排者是当前持有对话的 Agent。状态机隐含在 Agent 的系统提示中。

## 概念

### 两个原语

**例程。** 定义 Agent 角色和可用工具的系统提示。把它想象成一个范围化的指令集："你是分诊 Agent；如果用户问退款，交接给退款 Agent。"

**交接。** Agent 可以调用的返回新 Agent 对象的工具。Swarm 运行时检测 Agent 返回值并为下一轮切换活跃 Agent。

这就是整个抽象。

```
def transfer_to_refunds():
    return refund_agent  # Swarm 看到 Agent 返回 → 切换活跃 Agent

triage_agent = Agent(
    name="triage",
    instructions="Route the user to the right specialist.",
    functions=[transfer_to_refunds, transfer_to_sales, transfer_to_support],
)
```

分诊 Agent 的系统提示使其根据用户消息选择正确的交接。LLM 的工具调用做路由。

### 为什么它病毒式传播

- **小 API。** 两个概念要学。
- **使用模型已做的事。** 工具调用在各提供商中已经是生产级的。
- **没有状态机负担。** 你不描述图；Agent 的提示描述它们交接给谁。

### 无状态的权衡

Swarm 在运行之间显式无状态。框架在运行期间保持消息历史，但不持久化任何东西。记忆、连续性、长时间运行的任务——都是调用者的问题。

在生产中 (OpenAI Agents SDK, 2025 年 3 月) 这是主要改变之一：SDK 添加了内置会话管理、护栏和追踪，同时保留了交接原语。

### Swarm/交接何时适合

- **分诊模式。** 前线 Agent 将用户路由到专家。
- **基于技能的交接。** "如果任务需要代码，调用编码者；如果需要研究，调用研究员。"
- **短且有界的对话。** 客户支持、FAQ 到工单、简单工作流。

### Swarm 何时困难

- **带共享记忆的长会话。** 交接将对话状态重置为新 Agent 的提示加历史。没有调用者管理的记忆，Agent 之间就没有持久状态。
- **并行执行。** 交接是一次一个——活跃 Agent 切换。并行性需要调用者编排多个 Swarm 运行。
- **审计和重放。** 无状态运行难以精确重放；LLM 的交接选择不是确定性的。

### OpenAI Agents SDK (2025 年 3 月)

生产继任者添加：

- **会话状态。** 跨运行持久化线程。
- **护栏。** 输入/输出验证钩子。
- **追踪。** 每个工具调用和交接都被记录。
- **交接过滤器。** 控制交接时转移什么上下文。

交接原语存活；生产人体工学围绕它添加。

### Swarm vs GroupChat

两者都使用 LLM 驱动的路由，但在**谁选择下一个**上不同：

- GroupChat：选择器（函数或 LLM）从外部选择下一个发言者。
- Swarm：当前 Agent 通过调用交接工具选择其继任者。

Swarm 是"Agent 决定下一步"；GroupChat 是"管理者决定下一步"。Swarm 的决策在活跃 Agent 的工具调用中；GroupChat 的在 `GroupChatManager` 中。

## 构建它

`code/main.py` 从头实现 Swarm：Agent 数据类、交接机制（工具返回 Agent）和检测 Agent 切换的运行循环。

演示：分诊 Agent 路由到退款、销售或支持专家。每个专家有自己的工具。运行循环打印每次交接。

运行：

```
python3 code/main.py
```

## 使用它

`outputs/skill-handoff-designer.md` 为给定任务设计交接拓扑：哪些 Agent 存在、它们可以调用哪些交接、什么上下文转移。

## 发布它

检查清单：

- **交接日志。** 每次交接写入一个追踪事件，包含 from-Agent、to-Agent、上下文快照。
- **上下文转移规则。** 决定交接时转移什么：完整历史（昂贵）、最近 N 条消息或摘要。
- **交接护栏。** 交接到具有不同工具权限的专家必须经过认证——否则提示注入可以强制不需要的交接。
- **循环检测。** 两个 Agent 来回交接是常见失败；用简单的最近 K 环检查检测。
- **回退 Agent。** 如果交接目标不存在，回退到安全默认值。

## 练习

1. 运行 `code/main.py`，分诊到退款 Agent。确认第二轮的活跃 Agent 是退款。
2. 添加循环检测规则：如果相同的两个 Agent 连续交接 3 次，强制退出。设计回退方案。
3. 阅读 OpenAI Agents SDK 文档关于交接过滤器。实现"交接时摘要"版本：传出 Agent 在传入 Agent 接管前将上下文压缩为要点摘要。
4. 比较 Swarm 交接与 GroupChatManager 选择器。哪种模式使提示注入更糟，为什么？
5. 阅读 Swarm cookbook (https://developers.openai.com/cookbook/examples/orchestrating_agents)。识别 Swarm 做出的一个显式设计决策，OpenAI Agents SDK 改变或保留了。

## 关键术语

| 术语              | 人们怎么说           | 实际含义                                                         |
| ----------------- | -------------------- | ---------------------------------------------------------------- |
| 例程              | "Agent 提示"         | 系统提示 + 工具列表。定义角色和可用交接。                        |
| 交接              | "转移到另一个 Agent" | 活跃 Agent 可以调用的返回新 Agent 的工具。运行时切换活跃 Agent。 |
| 无状态            | "运行之间无记忆"     | Swarm 不持久化任何东西；记忆是调用者的责任。                     |
| 活跃 Agent        | "现在谁在说话"       | 当前持有对话的 Agent。交接改变这个。                             |
| 上下文转移        | "交接时转移什么"     | 传入 Agent 看到什么历史的策略：完整、最近 N 条或摘要。           |
| 交接循环          | "Agent 乒乓"         | 两个 Agent 持续来回交接的失败模式。                              |
| OpenAI Agents SDK | "生产版 Swarm"       | 2025 年 3 月继任者；在交接原语之上添加会话、护栏、追踪。         |
| 交接过滤器        | "转移时的门控"       | SDK 功能，在交接边界检查和修改上下文。                           |

## 延伸阅读

- [OpenAI cookbook — Orchestrating Agents: Routines and Handoffs](https://developers.openai.com/cookbook/examples/orchestrating_agents) — 参考阐述
- [OpenAI Swarm repo](https://github.com/openai/swarm) — 原始实现，保留为概念参考
- [OpenAI Agents SDK docs](https://openai.github.io/openai-agents-python/) — 带会话和追踪的生产继任者
- [Anthropic handoff-in-Claude notes](https://docs.anthropic.com/en/docs/claude-code) — Claude Code 子 Agent 如何通过 `Task` 使用类似交接的模式
