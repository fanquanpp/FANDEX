---
title: LangGraph状态图与持久执行
description: LangGraph是2026年低层有状态编排的参考。Agent是状态机；节点是函数；边是转换；状态是不可变的并在每步后检查点。从任何失败处精确恢复。
module: agent
related:
  - 'agent/FIPA-ACL遗产'
  - agent/HTN规划与进化搜索
  - agent/LlamaGuard
  - agent/LLM路由层
prerequisites:
  - agent/概述与架构
---

# LangGraph：状态图与持久执行

> LangGraph是2026年低层有状态编排的参考。Agent是状态机；节点是函数；边是转换；状态是不可变的并在每步后检查点。从任何失败处精确恢复。

**类型：** 学习 + 构建
**语言：** Python (stdlib)
**前置条件：** Phase 14 · 01 (Agent循环), Phase 14 · 12 (工作流模式)
**时间：** ~75分钟

## 学习目标

- 描述LangGraph的核心模型：带不可变状态、函数节点、条件边和步后检查点的状态机。
- 说出文档强调的四种能力：持久执行、流式传输、人机协作、全面记忆。
- 解释LangGraph支持的三种编排拓扑：监督者、点对点（群体）、层次（嵌套子图）。
- 实现一个带不可变状态、条件边和检查点/恢复循环的stdlib状态图。

## 问题所在

Agent和工作流共享一个问题：当一个40步运行在第38步失败时，你想从第38步恢复，而不是从头开始。二等状态模型让运维围绕假设全新运行的库来hack重试。

LangGraph的设计答案：状态是一等类型化对象，变异是显式的，检查点在每个节点后持久化。恢复是一个`load_state(session_id)`调用。

## 核心概念

### 图

图由以下定义：

- **状态类型。** 一个类型化字典（或Pydantic模型），每个节点读取和变异。
- **节点。** 纯函数`(state) -> state_update`。返回后更新合并到状态。
- **边。** 节点之间的条件或直接转换。
- **入口和出口。** `START`和`END`哨兵节点标记边界。

示例：一个带`classify`、`refund`、`bug`、`sales`、`done`节点的Agent——路由工作流作为图。

### 持久执行

每个节点返回后，运行时序列化状态并写入检查点器（SQLite、Postgres、Redis、自定义）。在第N步失败时，运行时可以`resume(session_id)`并从第N+1步以精确状态继续。

LangGraph文档明确强调了这很重要的生产用户：Klarna、Uber、J.P. Morgan。声明不是图的形状；而是图的形状加检查点使恢复变得廉价。

### 流式传输

每个节点可以产生部分输出。图向调用者流式传输每节点增量事件，使UI随图运行而更新。

### 人机协作

在节点之间检查和修改状态。实现：在关键节点前暂停，向人类展示状态，接受修改，恢复。检查点器使这变得容易，因为状态已经序列化。

### 记忆

短期（一次运行内——状态中的对话历史）和长期（跨运行——通过检查点器加独立长期存储持久化）。LangGraph通过工具与外部记忆系统集成（Mem0、自定义）。

### 三种拓扑

1. **监督者。** 中心路由LLM分发给专家子Agent。`langgraph-supervisor`中的`create_supervisor()`（尽管LangChain团队在2026年建议直接通过工具调用做以获得更多上下文控制）。
2. **群体 / 点对点。** Agent通过共享工具面直接交接。无中心路由器。
3. **层次。** 监督者管理子监督者，实现为嵌套子图。

### 这个模式哪里会出错

- **检查点太小。** 只检查点对话轮次会留下工具状态和记忆写入不可恢复。必须序列化完整状态。
- **非确定性节点。** 恢复假设节点输入产生相同的状态更新。随机种子、挂钟时间、外部API必须被捕获。
- **过度使用条件边。** 每条边都是条件的图是无法推理的状态机。偏好带偶尔分支的线性链。

## 构建它

`code/main.py`实现一个stdlib有状态图：

- `State` — 带有`messages`、`step`、`route`、`output`、`human_approval`的类型化字典。
- `Node` — 接受状态并返回更新字典的可调用对象。
- `StateGraph` — 节点 + 边 + 条件边 + 运行 + 恢复。
- `SQLiteCheckpointer`（内存中假实现）— 每个节点后序列化状态；`load(session_id)`恢复。
- 演示图：classify -> 分支(refund / bug / sales) -> 人工门 -> 发送。

运行：

```
python3 code/main.py
```

跟踪显示第一次运行在人工门处失败，持久化，然后恢复产生最终输出。

## 使用它

- **LangGraph** — 参考，生产就绪。使用`create_react_agent`、`create_supervisor`或构建自己的图。
- **AutoGen v0.4**（第14课）— 高并发场景的Actor模型替代。
- **Claude Agent SDK**（第17课）— 带内置会话存储的托管线束。
- **自定义** — 当你需要精确控制状态形状或检查点器后端时。

## 发布它

`outputs/skill-state-graph.md`在任何目标运行时中生成带检查点和恢复连接的LangGraph形状状态图。

## 练习

1. 从`classify`添加条件边到`end`，当分类置信度低于阈值时。在人工手动设置`route`后恢复运行。
2. 将SQLite式假实现替换为真实SQLite检查点器。测量每步序列化开销。
3. 实现并行边：两个节点并发运行，通过自定义reducer合并。不可变状态在这里买了什么？
4. 阅读`langgraph-supervisor`参考。将玩具移植到`create_supervisor`。比较跟踪形状。
5. 添加流式传输：每个节点在运行时产生部分状态。打印到达的增量。

## 关键术语

| 术语     | 人们常说的        | 实际含义                            |
| -------- | ----------------- | ----------------------------------- |
| 状态图   | "Agent作为状态机" | 类型化状态 + 节点 + 边 + reducer    |
| 检查点器 | "持久化后端"      | 每个节点后序列化状态；启用恢复      |
| Reducer  | "状态合并器"      | 将当前状态与节点更新组合的函数      |
| 条件边   | "分支"            | 由状态函数选择的边                  |
| 子图     | "嵌套图"          | 作为另一个图内节点使用的图          |
| 持久执行 | "从失败恢复"      | 以精确状态在最后成功节点重启        |
| 监督者   | "路由LLM"         | 专家子Agent的中心分发器             |
| 群体     | "P2P Agent"       | Agent通过共享工具交接；无中心路由器 |

## 延伸阅读

- [LangGraph概述](https://docs.langchain.com/oss/python/langgraph/overview) — 参考文档
- [langgraph-supervisor参考](https://reference.langchain.com/python/langgraph/supervisor/) — 监督者模式API
- [AutoGen v0.4, Microsoft Research](https://www.microsoft.com/en-us/research/articles/autogen-v0-4-reimagining-the-foundation-of-agentic-ai-for-scale-extensibility-and-robustness/) — Actor模型替代
- [Claude Agent SDK概述](https://platform.claude.com/docs/en/agent-sdk/overview) — 会话存储和子Agent
