---
title: 前沿安全框架RSP与PF与FSF
description: '三大实验室框架定义2026年前沿能力行业治理：Anthropic RSP v3.0的ASL分层(ASL-1到ASL-5+)；OpenAI PF v2的五项追踪标准；DeepMind FSF v3.0的关键能力级别含新增有害操纵CCL。三者均含竞争者调整条款。安全案例三支柱：监控、不可读性、无能力。'
module: 'ai-ethics'
difficulty: advanced
tags:
  - RSP
  - 'Preparedness Framework'
  - FSF
  - ASL
  - 安全案例
  - 竞争者调整
related:
  - 'ai-ethics/模型卡与系统卡与数据集卡'
  - 'ai-ethics/偏见与代表性伤害'
  - 'ai-ethics/前沿模型的上下文内策划'
  - 'ai-ethics/审核系统OpenAI与Perspective与LlamaGuard'
prerequisites:
  - 'ai-ethics/谄媚作为RLHF放大器'
---

## 问题定义

第7-17课确立了欺骗是可能的、双用能力存在、评估有局限。拥有前沿能力模型的实验室需要内部治理结构来：

- 定义何时需要新保障的阈值。
- 定义扩展前所需的评估。
- 描述安全案例的样子。
- 处理竞赛动态问题（如果竞争者不带保障就发布，你怎么办？）。

三个2025-2026年框架是最新水平——不完美、在演进，且跨实验室足够对齐，使得治理问题现在是框架是否充分，而非框架是否存在。

## 核心概念

### Anthropic Responsible Scaling Policy v3.0 (2026年2月)

ASL结构：

- ASL-1：非前沿模型（弱于前沿基线）。
- ASL-2：当前前沿基线；以常规保障部署。
- ASL-3：灾难性误用风险显著更高；CBRN相关能力。2025年5月激活。
- ASL-4：AI R&D-2越过阈值；能自动化入门级AI研究的模型。
- ASL-5+：高级AI R&D；显著加速有效扩展的模型。

v3.0新增：

- 前沿安全路线图（以编辑形式公开）。
- 风险报告（季度，部分外部审查）。
- AI R&D分解为AI R&D-2和AI R&D-4。
- 一旦越过AI R&D-4，需要肯定性安全案例，识别模型追求不对齐目标带来的不对齐风险。

### OpenAI Preparedness Framework v2 (2025年4月15日)

追踪能力的五项标准：

- **合理(Plausible)。** 存在合理的威胁模型。
- **可测量(Measurable)。** 可进行实证评估。
- **严重(Severe)。** 伤害大。
- **全新(Net-new)。** 不是已有风险的放大。
- **即时或不可补救(Instantaneous-or-irremediable)。** 伤害快速发生或无法撤销。

满足全部五项的能力被追踪。其他不被追踪。

PF v2其他结构：

- 将能力报告（模型能做什么）与保障报告（存在什么控制）分离。
- 安全咨询小组审查。
- 领导层批准；董事会安全与安全委员会监督。
- "调整条款"：如果另一实验室不带可比保障就发布，OpenAI可降低要求。

### DeepMind Frontier Safety Framework v3.0 (2025年9月)

按领域的关键能力级别(CCL)：

- 生物武器提升
- 网络提升
- ML R&D加速
- 有害操纵（v3.0新增）：可能在高风险情境中实质性改变信念/行为的模型。

v2.0（2025年2月）添加了欺骗性对齐部分和ML R&D CCL的更高安全级别。

### 跨实验室对齐

- Anthropic "Capability Thresholds"。
- DeepMind "Critical Capability Levels"。
- OpenAI "High Capability thresholds"。

无行业标准术语。结构上对齐：三层前沿能力，带已发布评估标准。三者均含竞争者调整条款（2025年起）。

### 安全案例

安全案例是在最坏情况假设下论证部署可接受安全的书面论证。标准结构针对三支柱：

- **监控(Monitoring)。** 如果发生不良行为，我们能检测到吗？
- **不可读性(Illegibility)。** 模型是否缺乏执行造成伤害的连贯计划的能力？
- **无能力(Incapability)。** 模型是否缺乏造成所讨论伤害的能力？

不同安全案例针对不同支柱。对于ASL-3 CBRN案例，无能力（通过遗忘）是主要目标。对于欺骗性对齐，监控和不可读性是目标。对于网络提升，三者都相关。

### 竞赛动态问题

竞争者调整条款有争议。批评者认为它们制造了逐底竞争：如果三个实验室都在竞争者背叛时降低要求，均衡向背叛移动。辩护者认为替代方案（单边保障）在背叛实验室安全意识较低时产生更差结果。

UK AISI、US CAISI和EU AI Office（第24课）是外部治理对应方。实验室框架是自愿的；监管框架正在形成。

## 关键术语

| 术语              | 常见说法          | 实际含义                                            |
| ----------------- | ----------------- | --------------------------------------------------- |
| RSP               | "Anthropic框架"   | Responsible Scaling Policy；ASL分层；v3.0 2026年2月 |
| PF                | "OpenAI框架"      | Preparedness Framework；五项标准；v2 2025年4月      |
| FSF               | "DeepMind框架"    | Frontier Safety Framework；CCL；v3.0 2025年9月      |
| ASL-3             | "生物安全3级类比" | Anthropic CBRN相关能力层级；2025年5月激活           |
| CCL               | "关键能力级别"    | DeepMind的阈值构造；按领域                          |
| Safety case       | "形式论证"        | 在最坏情况U下论证部署可接受安全的书面论证           |
| Adjustment clause | "竞争者背叛容许"  | 如果竞争者不带可比保障就发布时降低要求的框架条款    |

## 延伸阅读

- Anthropic — Responsible Scaling Policy v3.0 (February 2026) — ASL分层、路线图、AI R&D分解
- OpenAI — Updating the Preparedness Framework (April 15, 2025) — 五项标准、调整条款
- DeepMind — Strengthening our Frontier Safety Framework (September 2025) — CCL v3.0，有害操纵
- METR — Common Elements of Frontier AI Safety Policies (2025) — 跨实验室比较
