---
title: 生产扩展队列与检查点
description: '将多 Agent 系统扩展到数千个并发运行需要持久执行。LangGraph 的运行时在每个超步后写入检查点，以 thread_id 为键（默认 Postgres）；工作者崩溃释放租约，另一个工作者恢复。Agent 可以无限期睡眠等待人工输入。MegaAgent (arXiv:2408.0995...'
module: agent
related:
  - agent/群体优化PSO与ACO
  - agent/审查Agent
  - agent/生产运行时
  - agent/生成式Agent与涌现模拟
prerequisites:
  - agent/概述与架构
---

# 生产扩展 — 队列、检查点、持久性

> 将多 Agent 系统扩展到数千个并发运行需要**持久执行**。LangGraph 的运行时在每个超步后写入检查点，以 `thread_id` 为键（默认 Postgres）；工作者崩溃释放租约，另一个工作者恢复。Agent 可以无限期睡眠等待人工输入。**MegaAgent** (arXiv:2408.09955) 运行了每 Agent 生产者-消费者队列，带三种状态 (Idle / Processing / Response) 和两层协调（组内聊天 + 组间管理聊天）。**Fiber/async** 在 LLM 流式传输中击败每任务一线程：线程 99% 的时间空闲等待 token，fiber 在 I/O 上协作让出。反面观点：Ashpreet Bedi 的 "Scaling Agentic Software" 主张 **FastAPI + Postgres + 没有别的**直到负载证明否则——简单架构比预期走得更远。本课程构建持久检查点日志、带状态转换的每 Agent 工作队列、async vs thread 演示，并落地务实的"从简单开始"规则。

**类型：** 学习 + 构建
**语言：** Python (stdlib, `asyncio`, `sqlite3`)
**前置条件：** Phase 16 · 09 (并行群体网络), Phase 16 · 13 (共享记忆)
**时间：** ~75 分钟

## 问题

原型多 Agent 系统在一台笔记本上用内存事件循环中的三个 Agent 工作。你迁移到生产：

- Agent 有时运行数小时（长时间研究、人工在环等待）。
- 工作者进程崩溃。重启丢失状态。
- 峰值负载是平均的 10 倍；你需要水平扩展。
- 用户按 Agent 运行付费；你需要恰好一次语义来计费。

内存事件循环不做这些。你需要一个底层持久执行层。2026 年规范选项是：

1. 带检查点的工作流引擎 (Temporal, LangGraph runtime)。
2. 带状态存储的消息队列 (Postgres + SQS/RabbitMQ)。
3. Actor 模型框架 (MegaAgent 的每 Agent 生产者-消费者)。
4. 手工 FastAPI + Postgres (Bedi 的论点)。

本课程构建每种的小型版本。

## 概念

### 持久执行，模式

持久执行引擎在每个"步骤"（超步，LangGraph 的术语）后持久化完整程序状态。崩溃时：

```
worker crashes mid-step
  -> lease timeout
  -> another worker picks up the thread_id
  -> resumes from last checkpoint
  -> no duplicate side effects
```

这需要：

- **可序列化状态。** 所有 Agent 状态必须可持久化。带有活动数据库连接的函数闭包无法存活。
- **确定性恢复。** 给定相同状态和相同输入，Agent 产生相同动作（或对 LLM 调用延迟到外部确定性预言机）。
- **幂等副作用。** 外部调用（工具调用、支付）必须幂等或使用去重键。

LangGraph 在每个超步后写入检查点；Temporal 在每个活动后写入；Restate 使用事件溯源日志。三者实现相同模式。

### LangGraph 的运行时

每个 Agent 有一个 `thread_id`；状态是类型化字典；每个超步写入检查点表的一行。恢复时，运行时从最后一个检查点重放，不是从头开始。Agent 可以 `interrupt()` 等待人工输入；运行时持久化并释放工作者。当输入到达时，任何工作者可以恢复。

这是 2026 年 4 月的参考生产设计。

### MegaAgent 的每 Agent 队列

arXiv:2408.09955 描述了一个规模实验：一个集群中数千个并发 Agent。架构：

```
agent i:
  state ∈ {Idle, Processing, Response}
  in_queue   <- 发送给 Agent i 的消息
  out_queue  -> 回复 + 副作用

coordinators:
  intra-group chat  (同组 Agent)
  inter-group admin chat  (高层路由)
```

两层协调让组内对话密集进行，而组间保持稀疏——用于在数千 Agent 中保持成本线性的模式。

### Async vs 每任务一线程

LLM 调用是 I/O 密集型的。等待下一个 token 的线程 99% 的时间是空闲的。线程每个花费约 1MB RAM；10,000 个并发调用就是 10GB 仅用于栈。

Fiber (Python `asyncio`, Go goroutine, Rust `tokio`) 在 I/O 上协作让出。相同的 10,000 个调用舒适地适应一个进程。在 LLM Agent 规模下，async 不是优化——它是架构。

例外：CPU 密集型后处理（嵌入、tokenizer 技巧）仍然需要线程或进程。将 I/O 层与 CPU 层分离。

### Bedi 的反面观点

"Scaling Agentic Software" (Ashpreet Bedi, 2026) 论证大多数团队在测量负载之前就过度工程了。务实的默认：

- FastAPI + Postgres。
- 每个 Agent 运行是一行；状态用乐观并发原位更新。
- 通过 `pg_notify` 或简单 Celery worker 的后台作业。
- 应用代码中的重试策略。

对于可管理任务上约 100 个并发 Agent 运行以下的负载，这通常就是你需要的。在测量到失败时升级。

规则：当你遇到简单架构无法解决的具体问题时采用持久执行框架。过早采用在不产生回报的仪式上浪费时间。

### 恰好一次语义

对于付费 Agent 运行，你需要"恰好一次有效"（至少一次交付 + 幂等消费者）。工程手段：

- **每次运行的去重键。** 在每个副作用调用中包含它。
- **发件箱模式。** 副作用先写入表，然后单独进程执行。两步都幂等。
- **补偿事务。** 当副作用成功但其跟踪写入失败时，安排补偿。

这些是数据库工程模式，不是 LLM 特定的。LLM 税只是 LLM 调用慢；其他一切都是标准分布式系统。

### 彩虹部署

Anthropic 的多 Agent 研究系统使用"彩虹部署"：多个版本的 Agent 运行时并发运行，这样长时间运行的 Agent 不必在每次代码部署时被杀死。金丝雀新版本在一部分流量上；当旧版本的 Agent 完成时退役。

这是长时间运行有状态系统的标准；2026 年的适应是 Agent 可以存活数小时，所以部署周期必须适应。

### 规范生产检查清单

- 持久状态（检查点、快照或发件箱 + 可重放日志）。
- 幂等副作用。
- LLM 调用的异步 I/O 层。
- 带去重的至少一次交付。
- 有状态工作负载的彩虹/金丝雀部署。
- 可观测性：每 Agent 追踪、超步审计、重试计数器。

## 构建它

`code/main.py` 实现：

- `CheckpointStore` — SQLite 支持的检查点日志，带 thread-id 键。每个超步追加一行。
- `run_with_checkpoint(agent, thread_id)` — 模拟运行中途崩溃；第二个工作者从最后一个检查点恢复。
- `AgentQueue` — 带 Idle / Processing / Response 状态机的每 Agent 小型工作队列。
- `demo_async_vs_threads()` — 通过 asyncio 和线程运行 500 个并发模拟"LLM 调用"；报告挂钟时间和峰值内存（近似）。

运行：

```
python3 code/main.py
```

预期输出：模拟崩溃后检查点恢复成功；async 版本在 < 1s 内处理 500 个并发调用；线程版本花费数秒且每个并发单元使用数量级更多的内存。

## 使用它

`outputs/skill-scaling-advisor.md` 就持久执行选择提供建议：FastAPI + Postgres、LangGraph runtime、Temporal 或自定义。按负载、状态保留需求和部署频率校准。

## 发布它

规范生产强化：

- **从简单开始 (Bedi 规则)。** FastAPI + Postgres 直到测量到失败。
- **优化前先仪器化一切。** 每运行延迟直方图、每步时间、重试计数、失败分类。
- **副作用的发件箱模式。** 特别是支付和外部 API 调用。
- **彩虹部署。** 部署期间永远不要杀死运行中的 Agent 运行。
- **在遇到特定问题时采用持久执行引擎 (Temporal / LangGraph / Restate)**：数小时的人工在环等待、跨区域协调、复杂的重试/补偿策略。
- **I/O 层用 async。** 线程只用于 CPU 密集型后处理。

## 练习

1. 运行 `code/main.py`。确认检查点恢复工作；测量 async vs thread 并发差异。
2. 实现**发件箱**表：每个工具调用先写入发件箱，然后单独的 goroutine/task 执行。通过运行工具调用两次验证幂等性。
3. 模拟**彩虹部署**：两个并发运行时版本；将新 thread_id 的一半路由到每个；确认旧版本上的运行中线程不被中断。
4. 阅读 LangGraph 的运行时文档（链接如下）。识别运行时中复制到手工 FastAPI + Postgres 版本需要最长时间的功能。这是采用的理由，还是可以推迟？
5. 阅读 MegaAgent (arXiv:2408.09955) 第 3 节。两层协调（组内 + 组间管理聊天）是显式的。勾勒你如何将此映射到带两个队列族的消息队列。

## 关键术语

| 术语         | 人们怎么说         | 实际含义                                       |
| ------------ | ------------------ | ---------------------------------------------- |
| 持久执行     | "持久化程序状态"   | 引擎在每个超步后写入状态；崩溃恢复是确定性的。 |
| 超步         | "事务边界"         | 检查点之间的工作单元。LangGraph 术语。         |
| thread_id    | "Agent 运行标识符" | 绑定检查点和恢复逻辑的键。                     |
| 幂等性       | "安全重试"         | 重复副作用产生与一次尝试相同的结果。           |
| 发件箱模式   | "解耦副作用"       | 将意图写入表；单独的执行器执行并标记完成。     |
| 至少一次交付 | "可能有重复"       | 消息队列语义；去重键使消费者有效一次。         |
| 彩虹部署     | "重叠版本"         | 长时间运行工作负载期间多个运行时版本并发。     |
| Async fiber  | "协作让出"         | 用户模式并发；相对线程对 I/O 密集负载便宜。    |
| 检查点       | "状态快照"         | 超步边界处的序列化状态；恢复的键。             |

## 延伸阅读

- [LangChain — The runtime behind production deep agents](https://www.langchain.com/conceptual-guides/runtime-behind-production-deep-agents) — LangGraph 运行时设计
- [MegaAgent](https://arxiv.org/abs/2408.09955) — 每 Agent 生产者-消费者队列；数千并发 Agent 的两层协调
- [Matrix](https://arxiv.org/abs/2511.21686) — 以消息队列为协调基质的去中心化框架
- [Temporal docs](https://docs.temporal.io/) — 持久执行的参考工作流引擎
- [Anthropic — Multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) — 包括彩虹部署的生产经验
