---
title: Anthropic工作流模式
description: Schluntz和Zhang（Anthropic，2024年12月）区分了工作流（预定义路径）和Agent（动态工具使用）。五种工作流模式覆盖了大多数情况。从直接API调用开始。只在步骤无法预测时才添加Agent。
module: agent
related:
  - 'agent/AI-Scientist-v2自主研究'
  - agent/AlphaEvolve进化编码
  - agent/AnthropicRSP
  - 'agent/AutoGen-Actor模型与Agent框架'
prerequisites:
  - agent/概述与架构
---

# Anthropic工作流模式：简单胜于复杂

> Schluntz和Zhang（Anthropic，2024年12月）区分了工作流（预定义路径）和Agent（动态工具使用）。五种工作流模式覆盖了大多数情况。从直接API调用开始。只在步骤无法预测时才添加Agent。

**类型：** 学习 + 构建
**语言：** Python (stdlib)
**前置条件：** Phase 14 · 01 (Agent循环)
**时间：** ~60分钟

## 学习目标

- 说出Anthropic的五种工作流模式：提示链、路由、并行化、编排器-工作者、评估器-优化器。
- 解释Agent与工作流的区别以及各自的工程成本。
- 识别何时选择工作流而非Agent（反之亦然）。
- 在stdlib中针对脚本LLM实现所有五种模式。

## 问题所在

团队为只需要单次函数调用的问题选择了多Agent框架。成本是真实的：框架添加了遮蔽提示、隐藏控制流、引入过早复杂性的层。Schluntz和Zhang 2024年12月的帖子是被引用最多的行业反弹：从简单开始，只在复杂性证明其成本时才添加。

## 核心概念

### 工作流 vs Agent

- **工作流。** 通过预定义代码路径编排的LLM和工具。工程师拥有图。
- **Agent。** LLM动态指导自己的工具并采取自己的步骤。模型拥有图。

两者都有其位置。工作流更便宜、更快、更容易调试。Agent解锁开放式问题但使失败模式更难推理。

### 增强LLM

所有五种模式的基础：一个LLM连接三种能力——搜索（检索）、工具（动作）、记忆（持久化）。任何API调用都可以使用这些。

### 五种模式

1. **提示链。** 调用1的输出是调用2的输入。当任务有清晰的线性分解时使用。步骤之间可选程序化门。

2. **路由。** 分类器LLM选择调用哪个下游LLM或工具。当类别不同的输入需要不同处理时使用（一级支持 vs 退款 vs Bug vs 销售）。

3. **并行化。** 同时运行N个LLM调用，聚合结果。两种形式：分段（不同块）和投票（相同提示，N次运行，多数/综合）。

4. **编排器-工作者。** 编排器LLM动态决定运行哪些工作者（也是LLM）并综合它们的输出。类似于Agent循环但编排器不会无限循环。

5. **评估器-优化器。** 一个LLM提出答案，另一个LLM评估它。迭代直到评估器通过。这是Self-Refine（第05课）的泛化。

### 工作流胜过Agent的地方

- **可预测任务。** 如果你能枚举步骤，你应该枚举。
- **成本约束任务。** 工作流有有界的步骤数；Agent可能螺旋。
- **合规约束任务。** 审计员想读图，而不是从轨迹推断。

### Agent胜过工作流的地方

- **开放式研究。** 当下一步取决于上一步返回了什么。
- **变长任务。** 几分钟到几小时的工作，步骤数未知。
- **新领域。** 当你还不知道正确的工作流——先探索，后编纂。

### 上下文工程伴侣

"Effective context engineering for AI agents"（Anthropic 2025）形式化了相邻学科：200k窗口是预算，不是容器。包含什么、何时压缩、何时让上下文增长。

## 构建它

`code/main.py`针对`ScriptedLLM`实现所有五种工作流模式：

- `prompt_chain(input, steps)` — 顺序。
- `route(input, classifier, handlers)` — 分类 + 分发。
- `parallel_vote(prompt, n, aggregator)` — N次运行，聚合。
- `orchestrator_workers(task, workers)` — 编排器选择工作者。
- `evaluator_optimizer(task, proposer, evaluator, max_iter)` — 循环直到通过。

运行：

```
python3 code/main.py
```

每种模式打印其跟踪。每种模式的代码行数约10-15行；框架的成本以千计。

## 使用它

- 大多数任务使用直接API调用。
- 仅当模式真正需要持久状态（LangGraph）、Actor模型并发（AutoGen v0.4）或角色模板（CrewAI）时才使用框架。
- 当你想要Claude Code线束形状而不重建它时，使用Claude Agent SDK。

## 发布它

`outputs/skill-workflow-picker.md`为给定任务描述选择正确的模式，包括决策理由和在工作流不够时重构为Agent的路径。

## 练习

1. 用置信度阈值实现路由。低于阈值 -> 升级给人类。一级支持用例的阈值在哪里？
2. 给`parallel_vote`添加超时。当一个调用挂起时会发生什么？你如何用缺失投票聚合？
3. 将`evaluator_optimizer`变成bandit：跨迭代保留top-2输出，这样晚期的好结果不会被晚期的坏结果覆盖。
4. 将提示链与路由组合：路由器选择三条链之一。测量token成本与单一大提示替代方案的对比。
5. 选择你的一个生产功能。画工作流图。计算步骤。Agent在这里真的更好吗？

## 关键术语

| 术语          | 人们常说的        | 实际含义                              |
| ------------- | ----------------- | ------------------------------------- |
| 工作流        | "预定义流程"      | 工程师拥有的LLM和工具调用图           |
| Agent         | "自主AI"          | 模型拥有的图；动态工具指导            |
| 增强LLM       | "带工具的LLM"     | LLM + 搜索 + 工具 + 记忆；原子单元    |
| 提示链        | "顺序调用"        | 调用N的输出是调用N+1的输入            |
| 路由          | "分类器分发"      | 选择哪个链/模型处理输入               |
| 并行化        | "扇出"            | N个并发调用；按分段或投票聚合         |
| 编排器-工作者 | "分发Agent"       | 编排器LLM动态选择专家LLM              |
| 评估器-优化器 | "提议者 + 评判者" | 迭代直到评估器通过；Self-Refine的泛化 |

## 延伸阅读

- [Anthropic, Building Effective Agents (2024年12月)](https://www.anthropic.com/research/building-effective-agents) — 五种工作流模式
- [Anthropic, Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — 伴侣学科
- [LangGraph概述](https://docs.langchain.com/oss/python/langgraph/overview) — 有状态图何时证明其成本
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/) — 编排器-工作者模式的产品化
