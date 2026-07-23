---
title: 'AutoGen-Actor模型与Agent框架'
description: 'AutoGen v0.4（Microsoft Research，2025年1月）围绕Actor模型重新设计了Agent编排。异步消息交换、事件驱动Agent、故障隔离、天然并发。该框架目前处于维护模式，Microsoft Agent Framework（2025年10月公开预览）成为继任者。'
module: agent
related:
  - agent/Anthropic工作流模式
  - agent/AnthropicRSP
  - 'agent/CAIS-CAISI与社会规模风险'
  - 'agent/Claude-Agent-SDK'
prerequisites:
  - agent/概述与架构
---

# AutoGen v0.4：Actor模型与Agent框架

> AutoGen v0.4（Microsoft Research，2025年1月）围绕Actor模型重新设计了Agent编排。异步消息交换、事件驱动Agent、故障隔离、天然并发。该框架目前处于维护模式，Microsoft Agent Framework（2025年10月公开预览）成为继任者。

**类型：** 学习 + 构建
**语言：** Python (stdlib)
**前置条件：** Phase 14 · 01 (Agent循环), Phase 14 · 12 (工作流模式)
**时间：** ~75分钟

## 学习目标

- 描述Actor模型：Agent作为Actor，消息作为唯一IPC，每个Actor故障隔离。
- 说出AutoGen v0.4的三个API层——Core、AgentChat、Extensions——以及各自的用途。
- 解释为什么将消息投递与处理解耦能提供故障隔离和天然并发。
- 在Python中实现一个stdlib Actor运行时并将双Agent代码审查流程移植到其上。

## 问题所在

大多数Agent框架是同步的：一个Agent产生，一个Agent消费，在调用栈中。失败使栈崩溃。并发是后加的。分布式需要重写。

AutoGen v0.4的答案：Actor模型。每个Agent是一个带私有收件箱的Actor。消息是唯一的交互方式。运行时将投递与处理解耦。故障隔离到一个Actor。并发是原生的。分布式只是不同的传输。

## 核心概念

### Actor

一个Actor有：

- 一个私有状态（从不从外部直接触碰）。
- 一个收件箱（消息队列）。
- 一个处理器：`receive(message) -> effects`，其中effects可以是"回复"、"发送给其他Actor"、"生成新Actor"、"更新状态"、"停止自身"。

两个Actor不能共享内存。它们只能发送消息。

### AutoGen v0.4中的三个API层

1. **Core。** 低层Actor框架。`AgentRuntime`、`Agent`、`Message`、`Topic`。异步消息交换，事件驱动。
2. **AgentChat。** 任务驱动高层API（替代v0.2的ConversableAgent）。`AssistantAgent`、`UserProxyAgent`、`RoundRobinGroupChat`、`SelectorGroupChat`。
3. **Extensions。** 集成 — OpenAI、Anthropic、Azure、工具、记忆。

### 为什么解耦重要

在v0.2模型中，调用`agent_a.chat(agent_b)`同步阻塞agent_a直到agent_b返回。在v0.4中，`send(agent_b, msg)`将消息放入agent_b的收件箱并返回。运行时稍后投递。三个后果：

- **故障隔离。** Agent B崩溃不会使Agent A崩溃——运行时在B的处理器中捕获失败并决定做什么（日志、重试、死信）。
- **天然并发。** 多条消息同时在飞行中；Actor并发处理其收件箱。
- **分布式就绪。** 收件箱 + 传输是相同的抽象，无论Actor在进程内还是另一台主机上。

### 拓扑

- **RoundRobinGroupChat。** Agent按固定轮换轮流。
- **SelectorGroupChat。** 选择器Agent根据对话上下文选择谁下一步。
- **Magentic-One。** 用于Web浏览、代码执行、文件处理的参考多Agent团队。构建在AgentChat上。

### 可观测性

内置OpenTelemetry支持。每条消息发出一个span；工具调用携带`gen_ai.*`属性，符合2026年OTel GenAI语义约定（第23课）。

### 状态：维护模式

2026年初：AutoGen v0.7.x对研究和原型设计稳定。Microsoft已将活跃开发转移到Microsoft Agent Framework（2025年10月1日公开预览；1.0 GA目标2026年Q1末）。AutoGen模式可以干净地前向移植——Actor模型是持久的想法。

## 构建它

`code/main.py`实现一个stdlib Actor运行时：

- `Message` — 带有`sender`、`recipient`、`topic`、`body`的类型化载荷。
- `Actor` — 带有`receive(message, runtime)`的抽象类。
- `Runtime` — 带共享队列、投递、故障隔离的事件循环。
- 双Actor演示：`ReviewerAgent`审查代码，`ChecklistAgent`运行检查清单；它们交换消息直到达成共识。

运行：

```
python3 code/main.py
```

跟踪显示消息投递、一个Actor中的模拟失败不会使另一个崩溃，以及收敛到共享裁决。

## 使用它

- **AutoGen v0.4/v0.7**（维护）— 对研究、原型设计、多Agent模式稳定。
- **Microsoft Agent Framework**（公开预览）— 前向路径；相同Actor模型想法在刷新的API中。
- **LangGraph群体拓扑**（第13课）— 通过共享工具交接的类似模式。
- **自定义Actor运行时** — 当你需要特定传输（NATS、RabbitMQ、gRPC）时。

## 发布它

`outputs/skill-actor-runtime.md`为给定多Agent任务生成最小Actor运行时加团队模板（RoundRobin或Selector）。

## 练习

1. 添加死信队列：当处理器抛出异常时，将失败消息停放以供人工检查。在你的玩具中DLQ多久被命中？
2. 实现`SelectorGroupChat`：一个选择器Actor根据对话状态选择谁处理下一条消息。
3. 添加分布式传输：将进程内队列替换为JSON-over-HTTP服务器，使Actor可以在单独的进程中运行。
4. 为每条消息连接OTel span（或无操作替代）。按第23课发出`gen_ai.agent.name`、`gen_ai.operation.name`。
5. 阅读AutoGen v0.4的架构帖子。将你的玩具移植到真实的`autogen_core` API。你跳过了什么在生产中重要的东西？

## 关键术语

| 术语                | 人们常说的       | 实际含义                               |
| ------------------- | ---------------- | -------------------------------------- |
| Actor               | "Agent"          | 私有状态 + 收件箱 + 处理器；无共享内存 |
| 消息                | "事件"           | 类型化载荷；Actor交互的唯一方式        |
| 收件箱              | "邮箱"           | 每Actor的待处理消息队列                |
| 运行时              | "Agent宿主"      | 路由消息和隔离故障的事件循环           |
| Topic               | "频道"           | Actor之间的命名发布-订阅路由           |
| 故障隔离            | "让它崩溃"       | 一个Actor失败不会使其他崩溃            |
| RoundRobinGroupChat | "固定轮换团队"   | Agent按顺序轮流                        |
| SelectorGroupChat   | "上下文路由团队" | 选择器选择谁下一步                     |
| Magentic-One        | "参考团队"       | Web + 代码 + 文件的多Agent小队         |

## 延伸阅读

- [AutoGen v0.4, Microsoft Research](https://www.microsoft.com/en-us/research/articles/autogen-v0-4-reimagining-the-foundation-of-agentic-ai-for-scale-extensibility-and-robustness/) — 重新设计帖子
- [LangGraph概述](https://docs.langchain.com/oss/python/langgraph/overview) — 图形状替代
- [OpenTelemetry GenAI语义约定](https://opentelemetry.io/docs/specs/semconv/gen-ai/) — AutoGen默认发出的span
