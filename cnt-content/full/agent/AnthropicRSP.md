---
title: 'Anthropic RSP v3.0 — 负责任扩展政策'
description: '深入解读RSP v3.0的两层缓解机制、AI R&D-4阈值、前沿安全路线图，以及SaferAI降级评分的原因'
module: agent
difficulty: advanced
tags:
  - RSP
  - 扩展政策
  - 'AI R&D-4'
  - 暂停承诺
  - SaferAI
related:
  - agent/AlphaEvolve进化编码
  - agent/Anthropic工作流模式
  - 'agent/AutoGen-Actor模型与Agent框架'
  - 'agent/CAIS-CAISI与社会规模风险'
prerequisites:
  - agent/概述与架构
---

# Anthropic RSP v3.0 — 负责任扩展政策

> RSP v3.0于2026年2月24日生效，取代2023年政策。两层缓解：Anthropic将单方面做什么 vs 被框架为行业范围建议的内容（包括RAND SL-4安全标准）。添加前沿安全路线图和风险报告作为常设文档而非一次性交付物。放弃2023年暂停承诺。引入AI R&D-4阈值：一旦跨越，Anthropic必须发布识别错位风险和缓解措施的肯定案例。Claude Opus 4.6未跨越它。Anthropic在v3.0公告中声明"自信地排除这一点正变得困难。"SaferAI对2023年RSP评分为2.2；他们将v3.0降级到1.9，将Anthropic与OpenAI和DeepMind一起置于"弱"RSP类别。定性阈值取代了2023年定量承诺；移除暂停条款是最尖锐的倒退。

**类型：** 学习
**语言：** Python（标准库，RSP阈值决策引擎）
**前置条件：** Phase 15 · 06（AAR），Phase 15 · 07（RSI）
**时间：** ~45分钟

## 问题所在

前沿实验室发布的扩展政策部分是技术文档，部分是治理文档，部分是给监管者的信号。RSP v3.0是当前Anthropic文档。仔细阅读它重要的原因不是因为遵守它是约束性的（它不是），而是因为框架塑造了实验室如何构想灾难性风险以及如何向公众传达权衡。

v3.0与v2.0的差异是有用的单位。添加了什么：前沿安全路线图、风险报告、AI R&D-4阈值。移除了什么：2023年暂停承诺。重构了什么：分为Anthropic单边和行业建议的两层缓解时间表。外部审查 — SaferAI — 将分数从2.2（v2）降级到1.9（v3.0）。这就是扩展政策如何在看起来更精致的同时变得不那么严格。

## 核心概念

### 两层缓解时间表

- **Anthropic单边行动**：Anthropic无论其他实验室做什么都会做的事情。超过阈值时训练停止、特定安全措施、特定部署门。
- **行业范围建议**：Anthropic认为行业应该集体做的事情。包括RAND SL-4安全标准。这些不是Anthropic方面的承诺；它们是政策倡导。

两层结构不在v2中。这意味着读者需要查看每个承诺在哪一列。在"行业范围建议"列中的安全措施不是Anthropic的承诺；它是Anthropic的希望。

### AI R&D-4阈值

这是RSP v3.0命名为重要下一阈值的能力水平。具体来说：能够以竞争成本自动化AI研究实质部分的模型。一旦Anthropic认为模型跨越它，他们必须在继续扩展之前发布识别错位风险和缓解措施的肯定案例。

Claude Opus 4.6根据v3.0公告未跨越它。文档补充："自信地排除这一点正变得困难。"这种措辞很重要；它承认阈值足够近以至于是一个活跃关注点，不是推测性限制。

第6课（自动对齐研究）和第7课（递归自我改进）直接馈入此阈值。自动对齐研究者跨越研究质量门槛是AI R&D-4阈值正在接近的证据。

### 前沿安全路线图和风险报告

v3.0将两种工件类型提升为常设文档：

- **前沿安全路线图**：前瞻性文档，描述计划的安全工作、能力预期和缓解研究。
- **风险报告**：发布后特定模型的后瞻性文档，描述观察到的能力和残余风险。

两者都是公开的。两者都按声明的节奏更新。实用性在于：读者可以追踪Anthropic在路线图中说他们将做的与他们在风险报告中报告的相比如何。

### 移除暂停条款

2023年RSP包含明确的暂停承诺：如果模型跨越特定能力阈值，训练将暂停直到缓解措施到位。v3.0用更软的表述替换明确暂停（发布肯定案例，如果缓解措施充足则继续）。SaferAI和其他分析师直接指出这是新文档中最强的倒退。

变更的政策论据：2023年的定量阈值在2026年能力基准下变得不可达，因为基准本身被重新缩放。反论据：扩展政策中的暂停条款是承诺装置；移除它移除了政策的可信度。

### SaferAI的降级

SaferAI是评级RSP风格文档的独立组织。他们的公开评级：2023年Anthropic RSP得分2.2（在4.0是当前最佳RSP、1.0是名义的量表上）。v3.0得分1.9。这将Anthropic从"中等"移到"弱"，与OpenAI和DeepMind一起加入弱类别。

SaferAI的降级因素：

- 定性阈值取代定量阈值。
- 暂停承诺移除。
- AI R&D-4阈值缓解被描述为"肯定案例"而非特定措施。
- 审查机制依赖Anthropic的安全咨询组，独立监督有限。

### 本课不是什么

这不是合规课。RSP v3.0不是法规；没有什么强制Anthropic遵循它。本课是以它应得的特异性和怀疑态度阅读文档。扩展政策是前沿实验室发出的关于灾难性风险姿态的主要公共信号。好好阅读它们是任何工作依赖前沿能力的人的实用技能。

## 实践

`code/main.py`实现一个小型决策引擎，镜像RSP阈值评估形状：给定候选模型和一组能力测量，返回AI R&D-4阈值是否被跨越、所需的肯定案例章节，以及部署是否可以继续。它有意简单；重点是使文档的逻辑明确。

## 交付

`outputs/skill-scaling-policy-review.md`对照v3.0参考审查扩展政策（Anthropic、OpenAI、DeepMind或内部的）：两层结构、阈值、暂停承诺、独立审查。

## 练习

1. 运行 `code/main.py`。输入三个不同能力水平的合成模型。确认阈值评估器按预期行为并产生正确的肯定案例模板。
2. 完整阅读RSP v3.0（32页）。识别每个位于"行业范围建议"层的承诺。其中哪些在v2中会是"Anthropic单边"？
3. 阅读SaferAI的RSP评分方法论。通过将他们的评分标准应用于文档来重现他们对v3.0的1.9分数。哪个评分标准行驱动了最多的降级？
4. 2023年暂停承诺被移除。提出一个替代承诺，在承认2026年基准重新缩放问题的同时保留政策的可信度。
5. 将RSP v3.0与OpenAI准备框架v2（第20课）比较。选择v3.0更强的一个领域。选择准备框架更强的一个领域。

## 关键术语

| 术语           | 人们怎么说            | 实际含义                                |
| -------------- | --------------------- | --------------------------------------- |
| RSP            | "Anthropic的扩展政策" | 负责任扩展政策；v3.0于2026年2月24日生效 |
| AI R&D-4       | "研究自动化阈值"      | 以竞争成本自动化实质AI研究的能力        |
| 肯定案例       | "安全理由"            | 风险已识别且缓解措施充足的发布论证      |
| 前沿安全路线图 | "前瞻计划"            | 计划安全工作和预期能力的常设文档        |
| 风险报告       | "模型后瞻"            | 发布后观察到的能力和残余风险的常设文档  |
| 两层缓解       | "单边vs行业"          | Anthropic承诺vs行业建议，分离           |
| 暂停承诺       | "2023年条款"          | 暂停训练的明确承诺；在v3.0中移除        |
| SaferAI评级    | "独立RSP评分"         | 第三方评分标准；v3.0得分1.9（v2为2.2）  |

## 延伸阅读

- [Anthropic — Responsible Scaling Policy v3.0](https://anthropic.com/responsible-scaling-policy/rsp-v3-0)
- [Anthropic — RSP v3.0 announcement](https://www.anthropic.com/news/responsible-scaling-policy-v3)
- [Anthropic — Frontier Safety Roadmap](https://www.anthropic.com/research/frontier-safety)
- [Anthropic — Risk Report: Claude Opus 4.6](https://www.anthropic.com/research/risk-report-claude-opus-4-6)
- [Anthropic — Measuring agent autonomy in practice](https://www.anthropic.com/research/measuring-agent-autonomy)
