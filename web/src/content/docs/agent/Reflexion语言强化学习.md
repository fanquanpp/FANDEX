---
title: Reflexion语言强化学习
description: '基于梯度的RL需要数千次试验和GPU集群来修复一个失败模式。Reflexion（Shinn等人，NeurIPS 2023）用自然语言做到这一点：每次失败的试验后，Agent写一段反思，存储在情景记忆中，并在下一次试验中以此记忆为条件。这是Letta的睡眠时间计算、Claude Code的CLA...'
module: agent
related:
  - 'agent/OpenTelemetry-GenAI语义约定'
  - agent/OpenTelemetryGenAI
  - agent/ReWOO与计划执行
  - agent/STaR自教推理
prerequisites:
  - agent/概述与架构
---

# Reflexion：语言强化学习

> 基于梯度的RL需要数千次试验和GPU集群来修复一个失败模式。Reflexion（Shinn等人，NeurIPS 2023）用自然语言做到这一点：每次失败的试验后，Agent写一段反思，存储在情景记忆中，并在下一次试验中以此记忆为条件。这是Letta的睡眠时间计算、Claude Code的CLAUDE.md学习和pro-workflow的learn-rule背后的模式。

**类型：** 构建
**语言：** Python (stdlib)
**前置条件：** Phase 14 · 01 (Agent循环), Phase 14 · 02 (ReWOO)
**时间：** ~60分钟

## 学习目标

- 说出Reflexion的三个组件（Actor、Evaluator、Self-Reflector）以及情景记忆的作用。
- 实现一个stdlib Reflexion循环，包含二元评估器、反思缓冲区和全新重试。
- 在给定任务下，在标量、启发式和自评估反馈源之间做出选择。
- 解释为什么语言强化能捕获基于梯度的RL需要数千次试验才能修复的错误。

## 问题所在

Agent在任务上失败了。在标准RL中，你会运行数千次更多试验，计算梯度，更新权重。昂贵、缓慢，而且大多数生产Agent没有为每次失败准备训练预算。

Reflexion（Shinn等人，arXiv:2303.11366）问了一个不同的问题：如果Agent只是思考一下为什么失败，然后带着那个思考再试一次呢？没有权重更新。没有梯度。只是试验之间存储的自然语言。

结果：在ALFWorld上它击败了ReAct和其他非微调基线。在HotpotQA上它改进了ReAct。在代码生成（HumanEval/MBPP）上它设定了当时的SOTA。所有这些都不需要一次梯度步骤。

## 核心概念

### 三个组件

```
Actor         : generates a trajectory (ReAct-style loop)
Evaluator     : scores the trajectory — binary, heuristic, or self-eval
Self-Reflector: writes a natural-language reflection on the failure
```

加上一个数据结构：

```
Episodic memory: list of prior reflections, prepended to the next trial's prompt
```

一次试验运行Actor。Evaluator评分。如果分数低，Self-Reflector产生一段反思（"我选错了工具，因为我把问题误读为询问X而实际上是Y"）。反思进入情景记忆。下一次试验重新开始但能看到反思。

### 三种评估器类型

1. **标量** — 外部二元信号。ALFWorld成功或失败。HumanEval测试通过或失败。最简单，信号最强。
2. **启发式** — 预定义的失败特征。"如果Agent连续产生相同的动作两次，标记为卡住。""如果轨迹超过50步，标记为低效。"
3. **自评估** — LLM对自己的轨迹评分。在没有真实答案时需要。信号较弱；与工具接地验证配合使用效果好（第05课 — CRITIC）。

2026年的默认做法是混合使用：有标量时用标量，没有时用自评估，启发式作为安全护栏。

### 为什么这能泛化

Reflexion与其说是一个新算法，不如说是一个命名模式。几乎每个生产"自愈"Agent都运行某种变体：

- Letta的睡眠时间计算（第08课）：一个独立的Agent反思过去的对话并写入记忆块。
- Claude Code的`CLAUDE.md`/"保存记忆"模式：反思被捕获为学习，前置到未来会话。
- pro-workflow的`/learn-rule`命令：纠正被捕获为显式规则。
- LangGraph的反思节点：一个评分输出并在需要时路由到精炼的节点。

所有这些都源自同一个洞察：自然语言是足够丰富的媒介，可以在运行之间传递"我从失败中学到了什么"。

### 何时有效何时无效

Reflexion在以下情况有效：

- 有明确的失败信号（测试失败、工具错误、错误答案）。
- 任务类别可复现（可以再次提出相同类型的问题）。
- 反思有改进轨迹的空间（足够的动作预算）。

Reflexion在以下情况无帮助：

- Agent已经在第一次尝试时成功。
- 失败是外部的（网络断开、工具损坏）——对"网络断了"的反思对未来的运行没有帮助。
- 反思变成迷信——存储关于一次性不稳定运行的叙述。

2026年陷阱：记忆腐烂。反思积累；有些过时或错误；随着情景缓冲区增长，重新运行变慢。缓解措施：定期压缩（第06课）、反思的TTL，或独立的睡眠时间清理Agent（Letta）。

## 构建它

`code/main.py`在玩具谜题上实现Reflexion：产生一个3元素列表，其总和等于目标值。Actor发出候选列表；Evaluator检查总和；Self-Reflector写一行关于出了什么问题的诊断。反思进入情景记忆供下一次试验使用。

组件：

- `Actor` — 一个脚本策略，在看到反思时改进。
- `Evaluator.binary()` — 对目标总和的通过/失败。
- `SelfReflector` — 生成一行失败诊断。
- `EpisodicMemory` — 一个带TTL语义的有界列表。

运行：

```
python3 code/main.py
```

跟踪显示三次试验。试验1失败，存储反思，试验2看到反思并改进但仍失败，试验3成功。与基线运行（无反思）比较——它停留在试验1的答案上。

## 使用它

LangGraph将反思作为节点模式提供。Claude Code的`/memory`命令和pro-workflow的`/learn-rule`将情景缓冲区外化为markdown文件。Letta的睡眠时间计算在空闲时运行Self-Reflector，使主Agent保持延迟约束。OpenAI Agents SDK不直接提供Reflexion；你用自定义Guardrail构建，该Guardrail按分数拒绝轨迹，以及一个跨运行存活的记忆`Session`。

## 发布它

`outputs/skill-reflexion-buffer.md`创建并维护一个带有反思捕获、TTL和去重的情景缓冲区。给定任务类别和失败，它发出一段真正帮助下一次试验的反思（而不是泛泛的"要更小心"）。

## 练习

1. 从二元评估器切换到返回距离度量（离目标多远）的标量评估器。收敛更快吗？
2. 给反思添加10次试验的TTL。更旧的反思在那之后是有害还是有益？
3. 实现启发式评估器：如果相同动作重复则标记试验为卡住。这与Self-Reflector如何交互？
4. 用忽略反思的对抗性Actor运行Reflexion。强制Actor注意到反思的最小反思提示工程是什么？
5. 阅读Reflexion论文第4节关于AlfWorld。概念性地复现130%成功率改进：与普通ReAct的关键差异是什么？

## 关键术语

| 术语         | 人们常说的                | 实际含义                                                   |
| ------------ | ------------------------- | ---------------------------------------------------------- |
| Reflexion    | "自我纠正"                | Shinn等人2023 — Actor、Evaluator、Self-Reflector加情景记忆 |
| 语言强化     | "无梯度学习"              | 自然语言反思前置到下一次试验的提示                         |
| 情景记忆     | "每任务反思"              | 一个任务类别的先前反思的有界缓冲区                         |
| 标量评估器   | "二元成功信号"            | 来自真实答案的通过/失败或数值分数                          |
| 启发式评估器 | "基于模式的检测器"        | 预定义的失败特征（如卡住循环、步骤过多）                   |
| 自评估器     | "LLM作为自身轨迹的评判者" | 无真实答案时的低信号回退——与工具接地验证配对               |
| 记忆腐烂     | "过时的反思"              | 情景缓冲区充满过时条目；用压缩/TTL修复                     |
| 睡眠时间反思 | "异步自我反思"            | 在热路径外运行Self-Reflector使主Agent保持快速              |

## 延伸阅读

- [Shinn等人, Reflexion: Language Agents with Verbal Reinforcement Learning (arXiv:2303.11366)](https://arxiv.org/abs/2303.11366) — 经典论文
- [Letta, Sleep-time Compute](https://www.letta.com/blog/sleep-time-compute) — 生产中的异步反思
- [Anthropic, Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — 管理情景缓冲区作为上下文的一部分
- [LangGraph概述](https://docs.langchain.com/oss/python/langgraph/overview) — 反思节点模式
