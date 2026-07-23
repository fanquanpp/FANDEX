---
title: '生产运行时 — 队列、事件、定时'
description: 掌握六种生产运行时形状，理解持久执行的重要性，以及可观测性作为承重组件的必要性
module: agent
difficulty: intermediate
tags:
  - 生产运行时
  - 队列
  - 事件驱动
  - 持久执行
  - 定时任务
related:
  - agent/审查Agent
  - agent/生产扩展队列与检查点
  - agent/生成式Agent与涌现模拟
  - agent/失败模式MAST与群体思维
prerequisites:
  - agent/概述与架构
---

# 生产运行时 — 队列、事件、定时

> 生产Agent运行在六种运行时形状上：请求-响应、流式、持久执行、基于队列的后台、事件驱动和定时。在选择框架之前选择形状。可观测性在每个形状上都是承重的。

**类型：** 学习
**语言：** Python（标准库）
**前置条件：** Phase 14 · 13（LangGraph），Phase 14 · 22（语音）
**时间：** ~60分钟

## 学习目标

- 命名六种生产运行时形状并将每种匹配到框架/产品模式。
- 解释为什么持久执行（LangGraph）对长时任务重要。
- 描述事件驱动运行时以及Claude Managed Agents何时适合。
- 解释多步Agent的可观测性作为承重组件的主张。

## 问题所在

生产Agent以Jupyter笔记本无法展现的方式失败：第37步的网络超时、用户在语音通话中途挂断、定时任务在机器重启时死亡、后台工作者内存不足。运行时形状决定了哪些故障是可存活的。

## 核心概念

### 请求-响应

- 同步HTTP。用户等待完成。
- 仅适用于短任务（<30秒）。
- 技术栈：Agno（Python + FastAPI）、Mastra（TypeScript + Express/Hono/Fastify/Koa）。
- 可观测性：标准HTTP访问日志 + OTel span。

### 流式

- SSE或WebSocket用于渐进输出。
- LiveKit将其扩展到WebRTC用于语音/视频（第22课）。
- 技术栈：任何支持流式的框架 + 处理SSE/WS的前端。
- 可观测性：每块计时、首token延迟、尾延迟。

### 持久执行

- 每步后状态检查点；失败时自动恢复。
- AutoGen v0.4 actor模型将故障隔离到一个Agent（第14课）。
- LangGraph的核心差异化特性（第13课）。
- 当步骤数未知且恢复成本高时必不可少。

### 基于队列/后台

- 作业进入队列，工作者取走，结果通过webhook或pub/sub流回。
- 对长时Agent必不可少（每个任务数十到数百步，根据Anthropic的计算机使用公告）。
- 技术栈：Celery（Python）、BullMQ（Node）、SQS + Lambda（AWS）、自定义。
- 可观测性：队列深度、每作业延迟分布、DLQ大小。

### 事件驱动

- Agent订阅触发器：新邮件、PR打开、定时触发。
- Claude Managed Agents开箱即用覆盖此场景（第17课）。
- CrewAI Flows（第15课）结构化事件驱动确定性工作流。
- 可观测性：触发源、事件到开始延迟、Agent延迟。

### 定时

- Cron形状的Agent定期运行。
- 与持久执行结合，使失败的夜间运行在下一个tick恢复。
- 技术栈：Kubernetes CronJob + 持久框架；托管（Render cron、Vercel cron）。

### 2026年部署模式

- **CrewAI Flows**用于事件驱动生产。
- **Agno**无状态FastAPI用于Python微服务。
- **Mastra**服务器适配器（Express、Hono、Fastify、Koa）用于嵌入。
- **Pipecat Cloud / LiveKit Cloud**用于托管语音（第22课）。
- **Claude Managed Agents**用于托管长时异步。

### 可观测性是承重的

没有OpenTelemetry GenAI span（第23课）加上Langfuse/Phoenix/Opik后端（第24课），你无法调试在第40步失败的多步Agent。这对生产不是可选的。这是"我们快速调试"和"我们用更多日志从头重放"之间的区别。

### 生产运行时失败的地方

- **错误形状选择。** 为5分钟任务选择请求-响应。用户挂断；工作者堆积；重试叠加。
- **无DLQ。** 队列工作者没有死信。失败的作业消失。
- **不透明的后台工作。** 后台Agent运行没有追踪导出。故障不可见直到用户报告。
- **跳过持久状态。** 任何超过30秒且你无法承受重启的运行需要持久执行。

## 构建

`code/main.py`是一个标准库多形状演示：

- 请求-响应端点（普通函数）。
- 流式处理器（生成器）。
- 带DLQ的基于队列的工作者。
- 事件触发注册表。
- Cron形状调度器。

运行：

```
python3 code/main.py
```

输出：五条追踪，显示每种形状在相同任务上的行为。相同的Agent逻辑，不同的外壳。持久执行（第六种形状）有意在第13课用LangGraph检查点覆盖。

## 使用

- **请求-响应**用于聊天风格UX。
- **流式**用于渐进响应。
- **持久**用于长时任务。
- **队列**用于批处理/异步/长时间运行。
- **事件**用于Agent反应性。
- **定时**用于内务处理（记忆整合、评估、成本报告）。

## 交付

`outputs/skill-runtime-shape.md`为任务选择运行时形状并连接可观测性需求。

## 练习

1. 将你的第01课ReAct循环移植到你技术栈中的所有六种形状。哪种形状适合哪个产品表面？
2. 为基于队列的演示添加DLQ。模拟10%作业失败；显示DLQ大小。
3. 编写一个定时触发的评估Agent，每晚对当天前20条追踪运行。
4. 实现带背压的流式：如果客户端慢，暂停Agent。这与轮次预算如何交互？
5. 阅读Claude Managed Agents文档。何时你会将自托管的长时Agent迁移到托管？

## 关键术语

| 术语                  | 人们怎么说   | 实际含义                             |
| --------------------- | ------------ | ------------------------------------ |
| 请求-响应             | "同步"       | 用户等待；仅短任务                   |
| 流式                  | "SSE / WS"   | 渐进输出；更好UX；每块延迟可观测     |
| 持久执行              | "从失败恢复" | 检查点状态；从最后一步重启           |
| 基于队列              | "后台作业"   | 生产者/工作者池/DLQ                  |
| 事件驱动              | "基于触发"   | Agent对外部事件做出反应              |
| DLQ                   | "死信队列"   | 失败作业的停车场                     |
| Claude Managed Agents | "托管线束"   | Anthropic托管的长时异步，带缓存+压缩 |

## 延伸阅读

- [LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview) — 持久执行详情
- [Claude Managed Agents overview](https://platform.claude.com/docs/en/managed-agents/overview) — 托管长时异步
- [Anthropic, Introducing computer use](https://www.anthropic.com/news/3-5-models-and-computer-use) — "每个任务数十到数百步"
- [AutoGen v0.4 (Microsoft Research)](https://www.microsoft.com/en-us/research/articles/autogen-v0-4-reimagining-the-foundation-of-agentic-ai-for-scale-extensibility-and-robustness/) — actor模型故障隔离
