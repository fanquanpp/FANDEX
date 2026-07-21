---
title: '多Agent原语模型 — 四维设计空间'
description: 掌握Agent、Handoff、共享状态、编排器四个原语，将所有2026年多Agent框架映射到同一坐标系
module: agent
difficulty: intermediate
tags:
  - 多Agent原语
  - Handoff
  - 共享状态
  - 编排器
  - 框架映射
related:
  - agent/多会话交接
  - agent/多Agent辩论与协作
  - agent/工具接口
  - agent/工具生态项目
prerequisites:
  - agent/概述与架构
---

# 多Agent原语模型 — 四维设计空间

> 2026年发布的每个多Agent框架 — AutoGen、LangGraph、CrewAI、OpenAI Agents SDK、Microsoft Agent Framework — 都是四维设计空间中的一个点。四个原语，不多不少：Agent、Handoff、共享状态、编排器。本课从零构建它们，在所有四个上运行玩具系统，然后将每个主要框架映射到相同坐标轴，使你能在一段话内读懂任何新发布。

**类型：** 学习
**语言：** Python（标准库）
**前置条件：** Phase 14（Agent工程），Phase 16 · 01（为何多Agent）
**时间：** ~60分钟

## 问题所在

每六个月就有一个新的多Agent框架发布。2023年的AutoGen。2024年的CrewAI。2024年的LangGraph和OpenAI Swarm。2025年4月的Google ADK。2026年2月的Microsoft Agent Framework RC。每个新闻稿都声称是"正确的抽象"。

如果你试图逐一学习它们，你会精疲力竭。API看起来不同。文档对"Agent"是什么意见不一。一个框架称其共享记忆为"黑板"，另一个称其为"消息池"，第三个称其为"StateGraph"。你开始怀疑这个领域只是在空转。

它不是。在营销之下，四个原语是稳定的。学一次，每段话读懂每个新框架。

## 核心概念

### 四个原语

1. **Agent** — 一个系统提示加一个工具列表。无状态；每次运行从其系统提示和当前消息历史开始。
2. **Handoff** — 从一个Agent到另一个的结构化控制转移。机械上，一个返回新Agent的工具调用或遵循条件的图边。
3. **共享状态** — 多个Agent可以读取（有时写入）的任何数据结构。消息池、黑板、键值存储、向量记忆。
4. **编排器** — 决定谁接下来说话的人。选项：显式图（确定性）、LLM说话者选择器（软性）、上一个说话者的handoff调用（OpenAI Swarm），或队列上的调度器（群集架构）。

这就是整个设计空间。每个框架为每个轴选择默认值；其余的是表面语法。

### 每个2026年框架如何映射

| 框架                      | Agent                          | Handoff                             | 共享状态             | 编排器                  |
| ------------------------- | ------------------------------ | ----------------------------------- | -------------------- | ----------------------- |
| OpenAI Swarm / Agents SDK | `Agent(instructions, tools)`   | 工具返回Agent                       | 调用者的问题         | LLM的下一个handoff调用  |
| AutoGen v0.4 / AG2        | `ConversableAgent`             | GroupChat上的说话者选择器           | 消息池               | 选择器函数（LLM或轮询） |
| CrewAI                    | `Agent(role, goal, backstory)` | `Process.Sequential / Hierarchical` | 任务输出链           | 管理器LLM或静态顺序     |
| LangGraph                 | 节点函数                       | 图边 + 条件                         | `StateGraph` reducer | 图，确定性              |
| Microsoft Agent Framework | agent + 编排模式               | 模式特定                            | 线程 / 上下文        | 模式特定                |
| Google ADK                | agent + A2A card               | A2A task                            | A2A artifacts        | 宿主决定                |

表面差异看起来巨大。底层：相同的四个旋钮。

### 为什么这很重要

一旦你看到原语，框架比较变成了一个简短的检查清单：

- 编排器信任LLM路由（Swarm）还是在代码中固定路由（LangGraph）？
- 共享状态是完整历史（GroupChat）还是投影的（StateGraph reducer）？
- Agent可以修改彼此的提示（CrewAI manager）还是只能移交（Swarm）？

这三个问题回答了80%的哪个框架适合给定问题。你停止购买"最好的多Agent框架"，开始为你真正关心的轴设计。

### 无状态洞察

除了共享状态之外，每个原语都是无状态的。Agent是（prompt, tools）的函数。Handoff是函数调用。编排器是调度器。**系统中唯一有状态的东西是共享状态。** 那就是所有有趣bug生活的地方：记忆投毒（第15课）、消息排序、版本控制、写入争用。

隐藏共享状态的框架（Swarm）将问题推给调用者。集中它的框架（LangGraph checkpoint、AutoGen pool）使其可检查，但将协调成本转移到共享状态实现上。

### 单个原语的解剖

#### Agent

```
Agent = (system_prompt, tools, model, optional_name)
```

无记忆。无状态。具有相同系统提示和工具的两个Agent是可互换的。看起来像每Agent状态的一切实际上在共享状态或handoff协议中。

#### Handoff

```
Handoff = (from_agent, to_agent, reason, payload)
```

三种实现占主导：

- **函数返回** — 工具返回下一个Agent。这是OpenAI Swarm模式。Agent在其工具模式中携带路由。
- **图边** — LangGraph。边是声明式的。LLM产生一个值；条件选择下一个节点。
- **说话者选择** — AutoGen GroupChat。选择器函数（有时本身是LLM调用）读取池并选择谁接下来说话。

#### 共享状态

```
SharedState = { messages: [], artifacts: {}, context: {} }
```

至少，一个消息列表。通常更多：结构化工件（CrewAI Task输出）、类型化上下文（LangGraph reducer）、外部记忆（MCP、向量DB）。

两种拓扑：**完整池**（每个Agent看到每条消息）和**投影的**（Agent看到角色范围视图）。完整池简单但扩展性差。投影池可扩展但需要前置模式设计。

#### 编排器

```
Orchestrator = ({state, last_speaker}) -> next_agent
```

四种风格：

- **静态** — 图在构建时固定（LangGraph确定性、CrewAI Sequential）。
- **LLM选择** — LLM读取池并选择下一个说话者（AutoGen、CrewAI Hierarchical）。
- **Handoff驱动** — 当前Agent通过调用handoff工具决定（Swarm）。
- **队列驱动** — 工作者从共享队列拉取；无显式下一个说话者（群集架构、Matrix）。

### 框架之间什么变化

一旦原语固定，剩余的设计决策是：

- **记忆策略** — 短暂vs持久检查点（LangGraph checkpointer）。
- **安全边界** — 谁可以批准handoff（人在回路）。
- **成本核算** — 每Agent token预算。
- **可观测性** — 追踪handoff、持久化状态以供重放。

所有都可以在原语之上实现。没有一个是新原语。

## 实践

`code/main.py`用约150行标准库Python实现四个原语。无真实LLM — 每个Agent是脚本化策略，使焦点保持在协调结构上。

文件导出：

- `Agent` — 名称、系统提示、工具、策略函数的数据类。
- `Handoff` — 返回新Agent的函数。
- `SharedState` — 线程安全的消息池。
- `Orchestrator` — 三个变体：`StaticOrchestrator`、`HandoffOrchestrator`、`LLMSelectorOrchestrator`（模拟）。

演示通过所有三种编排器类型运行相同的三Agent管道（研究 -> 写作 -> 审查），并在最后打印消息池。你可以看到输出仅在*谁选择下一个*方面不同；Agent和共享状态在运行间相同。

## 交付

`outputs/skill-primitive-mapper.md`是一个技能，读取任何多Agent代码库或框架文档并返回四原语映射。在新框架发布上运行它，在深入阅读文档之前获得一段话的理解。

## 练习

1. 用不同的Agent策略运行 `code/main.py` 三次。观察编排器选择如何改变哪些Agent运行。
2. 实现第四种编排器类型：队列驱动的，Agent轮询共享状态获取工作。什么死锁可能发生，你如何检测它？
3. 取LangGraph快速入门并重写为四个原语。LangGraph的哪些抽象1:1映射，哪些是便利包装器？
4. 阅读OpenAI Swarm cookbook。识别四个原语中Swarm使哪个最符合人体工程学，以及它将哪个推给调用者。
5. 找到本表中完全隐藏共享状态的一个框架。解释当Agent需要跨handoff协调而不重新阅读历史时什么会出问题。

## 关键术语

| 术语       | 人们怎么说      | 实际含义                                                                      |
| ---------- | --------------- | ----------------------------------------------------------------------------- |
| Agent      | "带工具的LLM"   | 一个`(system_prompt, tools, model)`三元组。无状态。                           |
| Handoff    | "控制转移"      | 命名下一个Agent和可选负载的结构化调用。三种实现：函数返回、图边、说话者选择。 |
| 共享状态   | "记忆"/"上下文" | 多Agent系统中唯一有状态的部分。消息池或黑板。                                 |
| 编排器     | "协调者"        | 决定谁接下来运行的任何人。静态图、LLM选择器、handoff驱动或队列驱动。          |
| 原语       | "抽象"          | 每个框架参数化的四个轴之一。不是框架特性。                                    |
| 消息池     | "共享聊天历史"  | 完整历史共享状态。容易推理，扩展性差。                                        |
| 投影状态   | "范围视图"      | 共享状态的角色特定视图。可扩展，需要模式设计。                                |
| 说话者选择 | "谁接下来说话"  | 编排器模式，函数（通常是LLM）从组中选择下一个Agent。                          |

## 延伸阅读

- [OpenAI cookbook: Orchestrating Agents — Routines and Handoffs](https://developers.openai.com/cookbook/examples/orchestrating_agents) — handoff驱动编排的最清晰表述
- [AutoGen stable docs](https://microsoft.github.io/autogen/stable/) — GroupChat + 说话者选择是LLM选择编排的参考
- [LangGraph workflows and agents](https://docs.langchain.com/oss/python/langgraph/workflows-agents) — 图边编排和基于reducer的共享状态
- [CrewAI introduction](https://docs.crewai.com/en/introduction) — role-goal-backstory Agent、Sequential / Hierarchical流程
- [AG2 (community AutoGen continuation)](https://github.com/ag2ai/ag2) — Microsoft将v0.4移入维护后的活跃AutoGen v0.2线
