---
title: 自精炼与CRITIC
description: 'Self-Refine（Madaan等人，2023）用一个LLM扮演三个角色——生成、反馈、精炼——循环执行。7个任务平均提升20个绝对百分点。CRITIC（Gou等人，2023）通过将验证路由到外部工具来强化反馈步骤。在2026年，这个模式在每个框架中都以"评估器-优化器"（Anthropi...'
module: agent
related:
  - agent/终止开关与金丝雀令牌
  - agent/自动化对齐研究AAR
  - agent/自主编码Agent格局
  - agent/最小Agent工作台
prerequisites:
  - agent/概述与架构
---

# 自精炼与CRITIC：迭代输出改进

> Self-Refine（Madaan等人，2023）用一个LLM扮演三个角色——生成、反馈、精炼——循环执行。7个任务平均提升20个绝对百分点。CRITIC（Gou等人，2023）通过将验证路由到外部工具来强化反馈步骤。在2026年，这个模式在每个框架中都以"评估器-优化器"（Anthropic）或护栏循环（OpenAI Agents SDK）的形式发布。

**类型：** 构建
**语言：** Python (stdlib)
**前置条件：** Phase 14 · 01 (Agent循环), Phase 14 · 03 (Reflexion)
**时间：** ~60分钟

## 学习目标

- 说出Self-Refine的三个提示（generate、feedback、refine）并解释为什么历史对refine提示很重要。
- 解释CRITIC的关键洞察：LLM在没有外部接地的情况下自验证是不可靠的。
- 实现一个带历史和可选外部验证器的stdlib Self-Refine循环。
- 将此模式映射到Anthropic的"评估器-优化器"工作流和OpenAI Agents SDK的输出护栏。

## 问题所在

Agent产生了一个几乎正确的答案。也许一行代码有语法错误。也许摘要太长。也许计划遗漏了边界情况。你想要的是：Agent批评自己的输出，然后修复它。

Self-Refine表明这在单个模型上有效，无需训练数据，无需RL。但有一个陷阱：LLM在硬事实上不擅长自验证。CRITIC命名了修复方案——将验证步骤路由到外部工具（搜索引擎、代码解释器、计算器、测试运行器）。

这两篇论文共同定义了2026年迭代改进的默认做法：生成、验证（可能时外部验证）、精炼、验证器通过时停止。

## 核心概念

### Self-Refine（Madaan等人，NeurIPS 2023）

一个LLM，三个角色：

```
generate(task)            -> output_0
feedback(task, output_0)  -> critique_0
refine(task, output_0, critique_0, history) -> output_1
feedback(task, output_1)  -> critique_1
refine(task, output_1, critique_1, history) -> output_2
...
stop when feedback says "no issues" or budget exhausted.
```

关键细节：`refine`看到完整历史——所有先前的输出和批评——所以它不会重复错误。论文对此进行了消融：去掉历史，质量急剧下降。

标题数据：7个任务（数学、代码、缩写、对话）平均+20绝对改进，包括GPT-4。无训练，无外部工具，单模型。

### CRITIC（Gou等人，arXiv:2305.11738，v4 2024年2月）

Self-Refine的弱点：反馈步骤是LLM给自己评分。对于事实性声明，这是不可靠的（幻觉对产生它的模型来说通常看起来令人信服）。CRITIC将`feedback(task, output)`替换为`verify(task, output, tools)`，其中`tools`包括：

- 用于事实声明的搜索引擎。
- 用于代码正确性的代码解释器。
- 用于算术的计算器。
- 领域特定验证器（单元测试、类型检查器、linter）。

验证器产生一个基于工具结果的结构化批评。精炼器然后以此批评为条件。

标题数据：CRITIC在事实性任务上优于Self-Refine，因为批评是接地的。在没有外部验证器的任务上（创意写作、格式化），CRITIC退化为Self-Refine。

### 停止条件

两种常见形式：

1. **验证器通过。** 外部测试返回成功。有条件时首选（单元测试、类型检查器、护栏断言）。
2. **无反馈发出。** 模型说"输出没问题"。更便宜但不可靠；与最大迭代上限配对。

2026年默认做法：组合它们。"验证器通过或模型说没问题且迭代>=2或迭代>=最大迭代次数时停止。"

### 评估器-优化器（Anthropic，2024）

Anthropic 2024年12月的帖子将此命名为五种工作流模式之一。两个角色：

- 评估器：评分输出并产生批评。
- 优化器：根据批评修订输出。

循环直到评估器通过。这就是Anthropic框架中的Self-Refine/CRITIC。Anthropic添加的关键工程细节：评估器和优化器提示应该有实质性不同，这样模型才不会只是橡皮图章。

### OpenAI Agents SDK输出护栏

OpenAI Agents SDK将此模式作为"输出护栏"发布。护栏是在Agent最终输出上运行的验证器。如果护栏触发（抛出`OutputGuardrailTripwireTriggered`），输出被拒绝，Agent可以重试。护栏可以调用工具（CRITIC风格）或是纯函数（Self-Refine风格）。

### 2026年陷阱

- **橡皮图章循环。** 同一模型用相同提示风格做生成和批评会收敛到"看起来不错"。使用结构不同的提示，或用更小的廉价模型做批评。
- **过度精炼。** 每次精炼通过增加延迟和token。预算1-3次通过；之后升级到人工审查。
- **在琐碎任务上使用CRITIC。** 如果没有外部验证器，CRITIC退化为Self-Refine；不要为桩验证器支付延迟。

## 构建它

`code/main.py`在玩具任务上实现Self-Refine和CRITIC：给定主题产生简短要点列表。验证器检查格式（3个要点，每个60字符以下）。CRITIC添加一个外部"事实验证器"，惩罚已知幻觉。

组件：

- `generate` — 脚本生产器。
- `feedback` — LLM风格的自批评。
- `verify_external` — CRITIC风格的接地验证器。
- `refine` — 根据历史重写输出。
- 停止条件 — 验证器通过或最多4次迭代。

运行：

```
python3 code/main.py
```

比较Self-Refine与CRITIC运行。CRITIC捕获了Self-Refine遗漏的事实错误，因为外部验证器有自批评所没有的接地。

## 使用它

Anthropic的评估器-优化器是用Claude友好语言表述的这个模式。OpenAI Agents SDK的输出护栏是CRITIC形状的（护栏可以调用工具）。LangGraph提供的反思节点读起来像Self-Refine。Google的Gemini 2.5 Computer Use添加了一个每步安全评估器，这是CRITIC的变体：每个动作在提交前都被验证。

## 发布它

`outputs/skill-refine-loop.md`根据任务形状、验证器可用性和迭代预算配置评估器-优化器循环。发出生成器、评估器/验证器和优化器的提示，加上停止策略。

## 练习

1. 用max_iterations=1运行玩具。CRITIC仍然有帮助吗？
2. 将外部验证器替换为嘈杂的（随机30%假阳性）。循环会做什么？这是2026年大多数护栏栈的现实。
3. 实现"生成器-批评器使用不同模型"变体：大模型生成，小模型批评。它比同模型更好吗？
4. 阅读CRITIC第3节（arXiv:2305.11738 v4）。说出三种验证工具类别并各给一个例子。
5. 将OpenAI Agents SDK的`output_guardrails`映射到CRITIC的验证器角色。SDK哪里做错了，哪里做对了？

## 关键术语

| 术语          | 人们常说的            | 实际含义                                             |
| ------------- | --------------------- | ---------------------------------------------------- |
| Self-Refine   | "自我修复的LLM"       | 一个模型中的生成->反馈->精炼循环，带历史             |
| CRITIC        | "工具接地验证"        | 用外部验证器替换反馈（搜索、代码、计算、测试）       |
| 评估器-优化器 | "Anthropic工作流模式" | 两个角色——评估器评分，优化器修订——循环至收敛         |
| 输出护栏      | "事后检查"            | OpenAI Agents SDK验证器，在Agent产生输出后运行       |
| 验证步骤      | "批评阶段"            | 承重决策：接地的还是自评的                           |
| 精炼历史      | "模型已经尝试过的"    | 先前输出+批评前置到精炼提示；去掉则质量崩溃          |
| 橡皮图章循环  | "自我一致失败"        | 相同提示的批评返回"看起来不错"；用结构不同的提示修复 |
| 停止条件      | "收敛测试"            | 验证器通过或无反馈且迭代上限；永远不要单条件         |

## 延伸阅读

- [Madaan等人, Self-Refine (arXiv:2303.17651)](https://arxiv.org/abs/2303.17651) — 经典论文
- [Gou等人, CRITIC (arXiv:2305.11738)](https://arxiv.org/abs/2305.11738) — 工具接地验证
- [Anthropic, Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) — 评估器-优化器工作流模式
- [OpenAI Agents SDK文档](https://openai.github.io/openai-agents-python/) — 输出护栏作为CRITIC形状的验证器
