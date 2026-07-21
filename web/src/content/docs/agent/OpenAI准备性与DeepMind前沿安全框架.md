---
title: OpenAI准备性与DeepMind前沿安全框架
description: 'OpenAI 准备性框架 v2 (2025 年 4 月) 引入研究类别——长时间范围自主性、沙袋行为、自主复制与适应、破坏保障措施——与追踪类别不同。追踪类别触发能力报告加保障措施报告，由安全咨询组审查。DeepMind 的 FSF v3 (2025 年 9 月，2026 年 4 月 17 日...'
module: agent
related:
  - agent/METR时间范围与外部评估
  - 'agent/OpenAI-Agents-SDK'
  - 'agent/OpenTelemetry-GenAI语义约定'
  - agent/OpenTelemetryGenAI
prerequisites:
  - agent/概述与架构
---

# OpenAI 准备性框架与 DeepMind 前沿安全框架

> OpenAI 准备性框架 v2 (2025 年 4 月) 引入研究类别——长时间范围自主性、沙袋行为、自主复制与适应、破坏保障措施——与追踪类别不同。追踪类别触发能力报告加保障措施报告，由安全咨询组审查。DeepMind 的 FSF v3 (2025 年 9 月，2026 年 4 月 17 日添加追踪能力级别) 将自主性折叠到 ML R&D 和网络领域 (ML R&D 自主级别 1 = 以与人类 + AI 工具竞争的成本完全自动化 AI R&D 流水线)。FSF v3 明确通过自动化监控解决欺骗性对齐以检测工具性推理滥用。诚实的说明：PF v2 中的研究类别（包括长时间范围自主性）不自动触发缓解措施；政策语言是"潜在"。DeepMind 自己说自动化监控"长期不会保持足够"如果工具性推理加强。

**类型：** 学习
**语言：** Python (stdlib, 三框架决策表差异工具)
**前置条件：** Phase 15 · 19 (Anthropic RSP)
**时间：** ~45 分钟

## 问题

Lesson 19 仔细阅读了 Anthropic 的扩展政策。本课通过阅读 OpenAI 和 DeepMind 的政策完成图景。三份文档是解决相同问题的表亲产物——前沿实验室何时应该暂停或门控模型——它们在一小组类别上收敛，在重要的具体地方分歧。

收敛：三者都将长时间范围自主性标记为值得追踪的能力类别。三者都承认欺骗行为（对齐伪造、沙袋行为）为特定风险类别。三者都有内部审查机构。分歧：OpenAI 将类别分为"追踪"（强制缓解）和"研究"（不自动触发）。DeepMind 将自主性折叠到两个领域而非单独命名。实验室命名追踪 vs 研究，或关键 vs 中等，或一级 vs 二级；能力属于哪个桶的操作后果跨实验室不同。

一起阅读它们是有用的练习。相同能力在 Anthropic 可以是"强制缓解"，在 OpenAI 是"监控但不触发"，在 DeepMind 是"在特定领域追踪"。政策姿态很重要。

## 概念

### OpenAI 准备性框架 v2 (2025 年 4 月)

结构：

- **追踪类别**：触发能力报告（模型能做什么）加保障措施报告（有什么缓解措施）。部署前由安全咨询组审查。
- **研究类别**：实验室正在追踪但尚未承诺特定缓解措施的模型能力。包括长时间范围自主性、沙袋行为、自主复制与适应、破坏保障措施。

v2 中的关键框架：研究类别不自动触发缓解措施。政策语言是"潜在"缓解措施。这是需要关注的具体差异：类别在追踪 vs 研究中的位置是"门控"和"观察"之间的枢纽。

### DeepMind 前沿安全框架 v3 (2025 年 9 月；2026 年 4 月 17 日添加追踪能力级别)

结构：

- **关键能力级别 (CCL)**：跨五个领域的能力阈值：网络、生物、ML R&D、CBRN、自主性（折叠到 ML R&D 和网络）。
- **追踪能力级别**：2026 年 4 月添加的额外粒度。具体示例：ML R&D 自主级别 1 = 以与人类 + AI 工具竞争的成本完全自动化 AI R&D 流水线。
- **欺骗性对齐监控**：明确承诺自动化监控检测工具性推理滥用。

自主性框架与 OpenAI 不同。DeepMind 不将"自主性"保持为顶级领域；它被折叠到自主性会造成伤害的领域 (ML R&D 和网络)。论点是自主性没有领域是没有风险的能力；反论点是跨领域自主性是框架应该命名的元风险。

### 三者收敛的地方

- 内部安全咨询组 (命名 Anthropic SAG, OpenAI SAG, DeepMind 内部委员会)。高能力模型部署前审查。
- 明确提及欺骗性对齐 / 对齐伪造为风险类别。
- 在声明的节奏上有持续产物 (Anthropic：前沿安全路线图、风险报告；OpenAI：能力和保障措施报告；DeepMind：FSF 更新周期)。
- 承认仅监控防御有上限。DeepMind 明确："自动化监控长期不会保持足够。"

### 分歧的地方

- **Anthropic**：v3.0 移除暂停承诺；AI R&D-4 阈值是命名的下一个门。
- **OpenAI**：追踪 vs 研究拆分；研究类别（包括长时间范围自主性）不自动门控。
- **DeepMind**：自主性折叠到其他领域；追踪能力级别在 2026 年 4 月添加粒度。

### 沙袋行为：使三者复杂化的特定能力

沙袋行为（模型在评估中策略性表现不佳）在 OpenAI 的研究类别中。Anthropic 的 RSP v3.0 通过评估上下文差距 (Lesson 1) 解决它。DeepMind 通过 FSF v3 中的欺骗性对齐监控解决它。

如果模型在评估中沙袋，每个框架的能力阈值都被低估。框架只在测量有效时工作。这就是为什么外部测量 (Lesson 21, METR) 和对抗性评估除了实验室自我评估外是必要的。

### 政策阅读技能

- **定位**：你关心的每个能力都应该能在政策中找到。如果找不到，政策不覆盖它。
- **分类**：是追踪（触发缓解）还是研究（追踪但不触发）？OpenAI 命名了这一点；Anthropic 和 DeepMind 有自己的等价物。
- **节奏**：政策是在声明的日程上更新，还是只在特定事件后？声明节奏更强。
- **独立性**：外部审查是强制还是可选？Anthropic 与 Apollo 和 US AI Safety Institute 合作；OpenAI 与 METR；DeepMind 主要与内部 SAG。

## 构建它

`code/main.py` 实现小型决策表差异工具。给定一个能力（自主性、欺骗性对齐、R&D 自动化、网络提升等），它输出三个政策如何分类该能力，以及触发什么缓解措施。这是阅读辅助，不是政策工具。

## 练习

1. 运行 `code/main.py`。确认差异工具的输出至少与你可根据源文档验证的两个能力匹配。
2. 完整阅读 OpenAI 准备性框架 v2。识别每个研究类别。对每个，写一句话说明为什么它在研究而非追踪中。
3. 完整阅读 DeepMind FSF v3，加上 2026 年 4 月追踪能力级别更新。识别 ML R&D 自主级别 1 的具体评估标准。你如何在外部测量它？
4. 沙袋行为在 OpenAI 的研究类别中。设计一个评估，迫使沙袋模型揭示其实际能力。参考 Lesson 1 的评估上下文博弈讨论。
5. 比较三个政策在一个特定能力上（你的选择）。命名你认为最严谨和最不严谨的政策分类。用源文本论证。

## 关键术语

| 术语              | 含义                                        |
| ----------------- | ------------------------------------------- |
| 准备性框架        | OpenAI 的扩展政策；追踪 vs 研究类别         |
| 追踪类别          | 触发能力 + 保障措施报告；SAG 审查           |
| 研究类别          | 追踪但不自动触发缓解；包括长时间范围自主性  |
| 前沿安全框架      | DeepMind 的扩展政策；CCL + 追踪能力级别     |
| CCL               | 关键能力级别；DeepMind 每领域阈值           |
| ML R&D 自主级别 1 | 以竞争成本完全自动化 AI R&D 流水线          |
| 沙袋行为          | 模型在评估中策略性表现不佳                  |
| 工具性推理        | 关于如何实现目标的推理；DeepMind 监控的目标 |

## 延伸阅读

- [OpenAI — Updating our Preparedness Framework](https://openai.com/index/updating-our-preparedness-framework/) — v2 公告
- [OpenAI — Preparedness Framework v2 PDF](https://cdn.openai.com/pdf/18a02b5d-6b67-4cec-ab64-68cdfbddebcd/preparedness-framework-v2.pdf) — 完整文档
- [DeepMind — Strengthening our Frontier Safety Framework](https://deepmind.google/blog/strengthening-our-frontier-safety-framework/) — FSF v3 公告
- [DeepMind — Updating the Frontier Safety Framework (April 2026)](https://deepmind.google/blog/updating-the-frontier-safety-framework/) — 追踪能力级别添加
- [Gemini 3 Pro FSF Report](https://storage.googleapis.com/deepmind-media/gemini/gemini_3_pro_fsf_report.pdf) — FSF 格式风险报告示例
