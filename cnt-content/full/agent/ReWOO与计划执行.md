---
title: ReWOO与计划执行
description: 'ReAct在一个流中交替思考和行动。ReWOO将它们分离：先做一个完整计划，然后执行。Token消耗减少5倍，HotpotQA准确率提升4%，而且你可以将规划器蒸馏到7B模型中。Plan-and-Execute将其泛化；Plan-and-Act将其扩展到Web导航。'
module: agent
related:
  - agent/OpenTelemetryGenAI
  - agent/Reflexion语言强化学习
  - agent/STaR自教推理
prerequisites:
  - agent/概述与架构
---

# ReWOO与计划执行：解耦规划

> ReAct在一个流中交替思考和行动。ReWOO将它们分离：先做一个完整计划，然后执行。Token消耗减少5倍，HotpotQA准确率提升4%，而且你可以将规划器蒸馏到7B模型中。Plan-and-Execute将其泛化；Plan-and-Act将其扩展到Web导航。

**类型：** 构建
**语言：** Python (stdlib)
**前置条件：** Phase 14 · 01 (Agent循环)
**时间：** ~60分钟

## 学习目标

- 解释为什么ReWOO的Planner/Worker/Solver拆分比ReAct的交替循环更节省token且更鲁棒。
- 实现一个计划DAG、一个依赖排序的执行器和一个组合Worker输出的Solver——全部使用stdlib。
- 使用2026年"五种工作流模式"框架（Anthropic），决定任务应该以计划-执行模式还是交替ReAct模式运行。
- 识别何时需要Plan-and-Act的合成计划数据用于长时间范围的Web或移动任务。

## 问题所在

ReAct的交替思考-行动-观察循环简单灵活，但每次工具调用都必须携带完整的先前上下文——包括每一个之前的思考。Token使用量随深度呈二次增长。更糟的是：当工具在循环中途失败时，模型必须从错误观察中重新推导整个计划。

ReWOO（Xu等人，arXiv:2305.18323，2023年5月）注意到了这一点并做了一个赌注：预先规划整个事情，并行获取证据，最后组合答案。一次LLM调用规划，N次工具调用获取证据（可并行），一次LLM调用求解。权衡是更少的灵活性（计划是静态的）换取更好的token效率和更清晰的失败模式。

## 核心概念

### 三个角色

```
Planner:  user_question -> [plan_dag]
Workers:  [plan_dag]     -> [evidence]        (tool calls, possibly parallel)
Solver:   user_question, plan_dag, evidence -> final_answer
```

Planner产生一个DAG。每个节点命名一个工具、其参数以及它依赖的先前节点（如`#E1`、`#E2`的引用）。Worker按拓扑顺序执行节点。Solver将所有内容组合在一起。

### 为什么减少5倍token

ReAct的提示长度随步骤数线性增长。在第10步时，提示包含思考1加行动1加观察1加思考2加行动2加观察2，依此类推。每个中间步骤还冗余地包含原始提示。

ReWOO支付一次Planner提示（大）、N个小Worker提示（每个只是工具调用，无链）和一次Solver提示。在HotpotQA上，论文测量到约5倍更少的token，同时准确率绝对提升4%。

### 为什么更鲁棒

如果Worker 3在ReAct中失败，循环必须在中途从错误中推理出来。在ReWOO中，Worker 3返回一个错误字符串；Solver在原始计划的上下文中看到它并可以优雅降级。失败定位是按节点的，不是按步骤的。

### 规划器蒸馏

论文的第二个结果：因为Planner不看到观察，你可以在175B教师的Planner输出上微调7B模型。小模型处理规划；大模型在推理时不需要。这现在是标准做法——许多2026年生产Agent使用小规划器和大执行器，反之亦然。

### Plan-and-Execute（LangChain，2023）

LangChain团队2023年8月的帖子将ReWOO泛化为一个模式名称：Plan-and-Execute。预先规划器发出步骤列表，执行器运行每个步骤，可选的重新规划器可以在观察结果后修订。这比ReWOO更接近ReAct（重新规划器将观察带回规划），但保留了token节省。

### Plan-and-Act（Erdogan等人，arXiv:2503.09572，ICML 2025）

Plan-and-Act将模式扩展到长时间范围的Web和移动Agent。关键贡献是合成计划数据：一个标注轨迹生成器产生训练数据，其中计划是显式的。用于微调规划器模型，使其在WebArena类任务上能持续工作超过30-50步，而单个ReAct轨迹会失去连贯性。

### 何时选择哪种模式

| 模式             | 何时使用                                        |
| ---------------- | ----------------------------------------------- |
| ReAct            | 短任务，未知环境，需要响应式异常处理            |
| ReWOO            | 结构化任务，已知工具，对token敏感，证据可并行化 |
| Plan-and-Execute | 类似ReWOO但需要在部分执行后重新规划             |
| Plan-and-Act     | 长时间范围（>30步），Web/移动/计算机使用        |
| Tree of Thoughts | 搜索值得付出代价（第04课）                      |

Anthropic 2024年12月的指导：从最简单的开始。如果任务是一次工具调用加一个摘要，不要构建ReWOO。如果任务是40步的研究任务，不要单独做ReAct。

## 构建它

`code/main.py`实现了一个玩具ReWOO：

- `Planner` — 一个脚本策略，从提示发出计划DAG。
- `Worker` — 通过注册表调度每个节点的工具调用。
- `Solver` — 脚本组合，读取证据并产生最终答案。
- 依赖解析 — 如`#E1`的引用被替换为先前的Worker输出。

演示回答"法国首都的人口是多少，四舍五入到百万？"使用两步计划：(1) 查找首都，(2) 查找人口，然后求解。

运行：

```
python3 code/main.py
```

跟踪首先显示完整计划，然后是Worker结果，然后是Solver组合。将token计数（我们打印粗略字符计数）与ReAct风格的交替运行进行比较——ReWOO在这类结构化任务上获胜。

## 使用它

LangGraph将Plan-and-Execute作为配方提供（`create_react_agent`用于ReAct，自定义图用于plan-execute）。CrewAI的Flow直接编码该模式：你预先定义任务，Flow DAG执行它们。Plan-and-Act的合成数据方法目前主要还在研究阶段；运行时模式（显式计划DAG）通过LangGraph和CrewAI Flow在生产中发布。

## 发布它

`outputs/skill-rewoo-planner.md`从用户请求和工具目录生成ReWOO计划DAG。它在交接给执行器之前验证计划（无环、每个引用已解析、每个工具存在）。

## 练习

1. 对独立的计划节点并行化Worker执行。在6节点DAG（2个并行组）上你能获得什么？
2. 添加一个重新规划器节点，在任何Worker返回错误时触发。使ReWOO变为Plan-and-Execute的最小改动是什么？
3. 用小模型（7B类）替换`Planner`，将`Solver`保留在前沿模型上。比较端到端质量——拆分在哪里失败？
4. 阅读ReWOO论文第4节关于规划器蒸馏。概念性地复现175B -> 7B结果：你需要什么训练数据，如何评分计划质量？
5. 将玩具移植到Plan-and-Act的轨迹形状：计划是序列，不是DAG。哪些权衡发生了变化？

## 关键术语

| 术语             | 人们常说的                 | 实际含义                                                      |
| ---------------- | -------------------------- | ------------------------------------------------------------- |
| ReWOO            | "无观察推理"               | 先规划，然后并行获取证据，然后求解——规划提示中没有观察        |
| Plan-and-Execute | "LangChain的计划-执行模式" | 带有可选重新规划器节点的ReWOO                                 |
| Plan-and-Act     | "扩展的计划-执行"          | 显式规划器/执行器拆分，使用合成计划训练数据用于长时间范围任务 |
| 证据引用         | "#E1, #E2, ..."            | 计划节点占位符，在调度时被替换为先前的Worker输出              |
| 规划器蒸馏       | "小规划器，大执行器"       | 在大教师的规划器轨迹上微调小模型                              |
| Token效率        | "更少的往返"               | 论文中HotpotQA上比ReAct少5倍token                             |
| DAG执行器        | "拓扑调度器"               | 按依赖顺序运行计划节点；每层可并行                            |

## 延伸阅读

- [Xu等人, ReWOO: Decoupling Reasoning from Observations (arXiv:2305.18323)](https://arxiv.org/abs/2305.18323) — 经典论文
- [Erdogan等人, Plan-and-Act (arXiv:2503.09572)](https://arxiv.org/abs/2503.09572) — 带合成计划的扩展规划器-执行器
- [LangGraph Plan-and-Execute教程](https://docs.langchain.com/oss/python/langgraph/overview) — 框架配方
- [Anthropic, Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) — 选择最简单的有效模式
