---
title: 长时间运行Agent持久执行
description: '生产长时间范围 Agent 不在 while True 中运行。每个 LLM 调用成为带检查点、重试和重放的活动。Temporal 的 OpenAI Agents SDK 集成于 2026 年 3 月 GA。Claude Code Routines (Anthropic) 运行调度的 Clau...'
module: agent
related:
  - agent/运行时反馈循环
  - agent/长时间范围Agent
  - agent/真实仓库工作台
  - agent/指令作为可执行约束
prerequisites:
  - agent/概述与架构
---

# 长时间运行后台 Agent：持久执行

> 生产长时间范围 Agent 不在 `while True` 中运行。每个 LLM 调用成为带检查点、重试和重放的活动。Temporal 的 OpenAI Agents SDK 集成于 2026 年 3 月 GA。Claude Code Routines (Anthropic) 运行调度的 Claude Code 调用而无需持久本地进程。会话在人工输入时暂停、在部署中存活、从以 `thread_id` 为键的最新检查点恢复。在新人体工学背后是一个旧模式——工作流编排——带一个新输入：LLM 调用作为必须在恢复时确定性重放的非确定性活动。

**类型：** 学习
**语言：** Python (stdlib, 最小持久执行状态机)
**前置条件：** Phase 15 · 10 (权限模式), Phase 15 · 01 (长时间范围Agent)
**时间：** ~60 分钟

## 问题

考虑一个运行四小时的 Agent。它调用三个工具、两次提示用户、进行四十次 LLM 调用。中途，运行它的主机重启。会发生什么？

- 在朴素 `while True` 循环中：一切丢失。运行从头重启。三个工具调用（有真实副作用）再次执行。用户再次被提示已批准的事情。四十次 LLM 调用重新计费。
- 有持久执行：运行从最近检查点恢复。已完成的活动不重新执行；其结果从持久日志重放。用户不重新批准已批准的事情。已进行的 LLM 调用不重新计费。

这是工作流引擎十年来发布的相同模式 (Temporal, Cadence, Uber 的 Cherami)。新的是 LLM 调用现在是一种活动——非确定性、昂贵、有副作用——它们干净地适配此模式。

课程主题：长时间范围可靠性衰减（METR 观察到"35 分钟退化"——成功率随范围大致二次方下降）。持久执行使运行比可靠性概况支持的更长，如果设计正确这是安全失败的新方式，如果设计错误则是不安全的方式。

## 概念

### 活动、工作流和重放

- **工作流**：确定性编排代码。定义活动序列、分支、等待。必须确定性，以便可以从事件日志重放而不会出现意外分歧。
- **活动**：非确定性、可能失败的工作单元。LLM 调用、工具调用、文件写入、HTTP 请求。每个活动记录其输入和（一旦完成）其输出。
- **事件日志**：持久后端存储。每个活动开始、完成、失败、重试，以及每个工作流决策都被记录。
- **重放**：恢复时，工作流代码从头重新运行；每个已完成的活动返回其记录结果而不重新执行。只有未完成的活动才实际运行。

这与 React 对虚拟 DOM 重新渲染，或 Git 从提交重建工作树形状相同。编排器中的确定性是使持久性便宜的原因。

### 为什么 LLM 调用适配模式

LLM 调用是：

- 非确定性（temperature > 0；即使 temperature 0 跨模型版本漂移）。
- 昂贵（金钱和延迟）。
- 可能失败（速率限制、超时）。
- 有副作用（如果它们调用工具）。

这正是活动概况。将每个 LLM 调用包装为活动给你带指数退避的重试、跨重启的检查点和用于调试的可重放追踪。

### 以 `thread_id` 为键的检查点

LangGraph、Microsoft Agent Framework、Cloudflare Durable Objects 和 Claude Code Routines 都收敛到相同的 API 形状：`thread_id`（或等价物）标识会话；每个状态转换持久化到后端（PostgreSQL 默认，SQLite 用于开发，Redis 用于缓存）；恢复读取最新检查点。

后端选择重要：

- **PostgreSQL**：持久、可查询、在部署中存活。LangGraph 默认。
- **SQLite**：仅本地开发；跨主机丢失数据。
- **Redis**：快但短暂，除非配置 AOF/快照。
- **Cloudflare Durable Objects**：透明分布式；以唯一键为范围；存活数小时到数周。

### 人工输入作为一等状态

先提议后提交 (Lesson 15) 需要持久的"等待人工"状态。工作流暂停，外部队列持有待处理请求，批准从该点精确恢复。没有持久性这是尽力而为；有了它，隔夜批准到达，工作流在早上继续。

### 35 分钟退化

METR 观察到每个测量的 Agent 类别在约 35 分钟连续操作后显示可靠性衰减。任务持续时间翻倍大致使失败率翻四倍。持久执行不修复此问题；它让你运行比可靠性概况支持的更长。安全模式是将持久性与重入时需要新 HITL 的检查点结合，以及限制总计算而不论挂钟时间的预算终止开关 (Lesson 13)。

### 持久执行何时是错误答案

- 运行短于几分钟且无人工输入。开销 > 收益。
- 严格只读信息检索。
- 正确性需要在单个上下文窗口内端到端的任务（某些推理任务；某些一次性生成）。

## 使用它

`code/main.py` 在 stdlib Python 中实现最小持久执行引擎。它支持：

- `@activity` 装饰器，将输入和输出记录到 JSON 事件日志。
- 排序活动的工作流函数。
- `run_or_replay(workflow, event_log)` 函数，重放已完成活动而不重新执行。

驱动器模拟三活动工作流，中途崩溃，显示 (a) 朴素重试重新执行一切 vs (b) 重放仅运行缺失活动。

## 发布它

`outputs/skill-durable-execution-review.md` 审查提议的长时间运行 Agent 部署的正确持久执行形状：活动、确定性、检查点后端、人工输入状态和重入时 HITL 策略。

## 练习

1. 运行 `code/main.py`。观察朴素重试和重放之间的活动执行计数差异。更改崩溃点并显示重放计数相应变化。

2. 将玩具引擎转换为显式使用 `thread_id`。模拟两个共享引擎的并发会话，确认它们的事件日志不冲突。

3. 取玩具引擎中的一个活动。引入非确定性（工作流决策内的挂钟时间戳）。演示重放时的分歧。解释真实引擎如何处理此问题（副作用注册、`Workflow.now()` API）。

4. 阅读 LangChain "Runtime behind production deep agents" 帖子。列出运行时持久化的每个状态，命名每个覆盖的失败模式。

5. 为 6 小时自主编码任务设计检查点策略。你在哪里检查点？崩溃后恢复看起来如何？什么需要新 HITL？

## 关键术语

| 术语        | 人们怎么说     | 实际含义                                         |
| ----------- | -------------- | ------------------------------------------------ |
| 工作流      | "Agent 的脚本" | 确定性编排代码；可从事件日志重放                 |
| 活动        | "一个步骤"     | 非确定性单元（LLM 调用、工具调用）；前后记录     |
| 事件日志    | "后端存储"     | 每个状态转换的持久记录                           |
| 重放        | "恢复"         | 重新运行工作流；已完成活动返回记录结果不重新执行 |
| 检查点      | "保存点"       | 以 thread_id 为键的持久状态；恢复时最新胜出      |
| thread_id   | "会话键"       | 范围化持久状态的标识符                           |
| 35 分钟退化 | "可靠性衰减"   | METR：成功率随范围约二次方下降                   |
| 非确定性    | "重放时漂移"   | 挂钟、随机、LLM 输出；必须注册为副作用           |

## 延伸阅读

- [Anthropic — Claude Code Agent SDK: agent loop](https://code.claude.com/docs/en/agent-sdk/agent-loop) — 预算、轮次和恢复语义
- [Microsoft — Agent Framework: human-in-the-loop and checkpointing](https://learn.microsoft.com/en-us/agent-framework/workflows/human-in-the-loop) — RequestInfoEvent 形状
- [LangChain — The Runtime Behind Production Deep Agents](https://www.langchain.com/conceptual-guides/runtime-behind-production-deep-agents) — 具体运行时要求
- [OpenAI Agents SDK + Temporal integration](https://trigger.dev) — LLM 调用的活动形状
- [Anthropic — Measuring agent autonomy in practice](https://www.anthropic.com/research/measuring-agent-autonomy) — 35 分钟退化参考
