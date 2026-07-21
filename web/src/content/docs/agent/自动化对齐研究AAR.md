---
title: 自动化对齐研究AAR
description: 'Anthropic 在独立沙箱中运行了并行的 Claude Opus 4.6 自主对齐研究员团队，通过共享论坛协调，其日志存储在任何沙箱之外（因此 Agent 不能删除自己的记录）。在弱到强训练问题上，AAR 超越了人类研究员。Anthropic 自己的总结指出，规定性工作流经常约束 AAR ...'
module: agent
related:
  - agent/指令作为可执行约束
  - agent/终止开关与金丝雀令牌
  - agent/自精炼与CRITIC
  - agent/自主编码Agent格局
prerequisites:
  - agent/概述与架构
---

# 自动化对齐研究 (Anthropic AAR)

> Anthropic 在独立沙箱中运行了并行的 Claude Opus 4.6 自主对齐研究员团队，通过共享论坛协调，其日志存储在任何沙箱之外（因此 Agent 不能删除自己的记录）。在弱到强训练问题上，AAR 超越了人类研究员。Anthropic 自己的总结指出，规定性工作流经常约束 AAR 灵活性并降低性能。自动化对齐研究是压缩时间线的压缩步骤，压缩到 RSP 旨在检测的确切不对齐风险。

**类型：** 学习
**语言：** Python (stdlib, 并行研究论坛模拟器)
**前置条件：** Phase 15 · 05 (AI Scientist v2), Phase 15 · 04 (DGM)
**时间：** ~60 分钟

## 问题

对齐研究在人类研究员时间上很昂贵。可扩展监督、奖励规范或弱到强训练等问题需要每次迭代数周的实验。随着前沿能力推进，对齐工作负载增长快于合格研究员供应。

自动化对齐研究 (AAR) 问：能力超越对齐的相同前沿模型能否贡献于缩小差距？Anthropic 2026 年关于 AAR 运行的弱到强训练研究 (alignment.anthropic.com/2026/automated-w2s-researcher/) 是此类部署系统的首批公开结果之一。

结果真正积极：AAR 在研究问题上超越了人类基线。结果也集中了本阶段发展的每个关注。如果对齐研究可以自动化，那么损害保障措施的部分也可以。RSP 的 AI R&D 能力阈值就是带着这个循环写的。

## 概念

### 架构（如公开描述）

- **并行 Agent。** 多个 Claude Opus 4.6 实例作为 AAR 运行，每个在独立沙箱中。沙箱限制文件系统、网络和进程面。
- **共享论坛。** 发现发布到共享论坛，其存储后端位于每个沙箱之外。Agent 可以读取论坛；Agent 不能从自己的沙箱内删除或编辑论坛记录。
- **任务分配。** 人工设计的任务队列将对齐问题分配给 AAR。AAR 提议分解、运行实验、撰写发现。
- **弱到强训练焦点。** 发表的研究针对弱到强训练——使用较弱监督模型训练更强学生模型。AAR 在此任务上超越了人类研究员。

### 为什么沙箱外日志重要

日志完整性属性是受控实验和可能被妥协实验之间的区别。如果 AAR 可以编辑自己的日志，它们可以掩盖失败或可疑实验。Anthropic 直接标记了这一点：该属性是信任研究输出的必要条件，且验证起来非平凡。

基础设施术语中的类似物是只追加日志，写穿透到外部存储（例如 S3 对象锁、不可变 Datadog 日志）。Agent 没有修改过去记录的凭证。这与 2026 年企业安全团队用于抗勒索软件审计追踪的模式相同。

### 规定性工作流权衡

Anthropic 的报告指出，规定性工作流经常约束 AAR 灵活性并降低性能。换句话说：如果人工设计者逐步编写研究计划，AAR 的表现比给予高层目标和自由分解时更差。这与跨 Agent 研究的结果一致 (LangGraph, Microsoft 的 Agent Framework)——过度指定的脚手架伤害有能力的 Agent。

安全含义微妙。改善 AAR 性能的灵活性也是允许未批准分解、新颖工具使用和目标漂移的灵活性。权衡是设计空间决策：多少灵活性购买足够超越人类的能力，而不给 Agent 离分布泛化目标的空间？

### 压缩风险

RSP v3.0 (Lesson 19) 引入了 AI R&D 能力阈值：以与人类 + AI 工具竞争的成本完全自动化 AI R&D 流水线的能力。DeepMind 的 FSF v3 包含类似的 ML R&D 自主级别。两个框架都将此阈值视为升级控制的触发器。

AAR 距阈值一步之遥：它自动化了流水线的一部分（特定、范围明确任务上的对齐研究）但不是端到端能力开发循环。时间线问题是差距关闭多快。

压缩时间线是复利失败关注。如果对齐研究和能力研究以相似速率复利，不对齐风险面至少与能力一样快增长。如果能力复利更快（历史趋势），差距扩大。这是 AAR 作为有条件好处的论证：每个额外对齐结果缩小差距，当且仅当研究过程可信。

### AAR 不替代什么

人类研究员设置任务队列、审查结果、持有宪法权威。AAR 加速流水线中间，不是两端。Anthropic 发表的输出包括 AAR 贡献和人类研究员关于发布什么、撤回什么、精炼什么的判断。

这匹配 Lesson 15 的先提议后提交模式应用于研究本身：AAR 提议；人类提交。

## 构建它

`code/main.py` 模拟多 AAR 研究论坛。三个独立"研究 Agent"并行运行，将发现发布到只追加论坛，可选篡改尝试。

观察：

- 沙箱外日志如何捕获日志篡改尝试。
- 带自由分解的任务分配如何在更难问题上超越固定工作流。
- 单个被妥协的 AAR 如何在日志不可篡改检测时污染论坛信号。

## 使用它

`outputs/skill-aar-deployment-review.md` 是自动化对齐研究流水线的部署前审查。

## 练习

1. 运行 `code/main.py`。比较"固定工作流" vs "自由分解"设置。自由分解总是赢吗，还是有固定工作流有竞争力的问题类别？

2. 修改模拟器使一个 Agent 尝试日志篡改。确认只追加日志检测到它。写一段描述日志中检测签名的确切外观。

3. 阅读 Anthropic 的弱到强 AAR 报告。识别 AAR 超越人类研究员的具体子任务。什么使它适合自动化？

4. 设计平衡 AAR 灵活性（更好结果）与规定性工作流约束（更容易审计）的任务队列分配策略。描述你如何 A/B 测试两者。

5. 阅读 RSP v3.0 的 AI R&D-4 阈值。用一段描述你认为什么会跨越它而 AAR 目前没有。

## 关键术语

| 术语         | 人们怎么说                 | 实际含义                                    |
| ------------ | -------------------------- | ------------------------------------------- |
| AAR          | "自动化对齐研究员"         | 在对齐问题上自主运行的 Claude Opus 4.6 实例 |
| 弱到强训练   | "用较弱监督训练更强模型"   | AAR 超越人类的经典可扩展监督基准            |
| 共享论坛     | "Agent 发布发现的地方"     | 只追加，沙箱外存储                          |
| 沙箱外日志   | "Agent 不能编辑自己的记录" | 篡改可见的写穿透到外部存储                  |
| 规定性工作流 | "人工设计者的逐步计划"     | 约束 AAR；经常降低性能 vs 自由分解          |
| 自由分解     | "Agent 决定如何拆分任务"   | 更有能力，更难审计                          |
| AI R&D 阈值  | "RSP/FSF 能力级别"         | 以竞争成本完全自动化 R&D 流水线             |
| 压缩时间线   | "对齐 vs 能力竞赛"         | 如果能力复利快于对齐，不对齐风险增长        |

## 延伸阅读

- [Anthropic — Automated Weak-to-Strong Researcher](https://alignment.anthropic.com/2026/automated-w2s-researcher/) — 主要来源
- [Anthropic Responsible Scaling Policy v3.0](https://anthropic.com/responsible-scaling-policy/rsp-v3-0) — AI R&D 阈值框架
- [Anthropic — Measuring AI agent autonomy](https://www.anthropic.com/research/measuring-agent-autonomy) — 更广的 Agent 自主性框架
- [DeepMind Frontier Safety Framework v3](https://deepmind.google/blog/strengthening-our-frontier-safety-framework/) — 与 RSP 平行的 ML R&D 自主级别
- [Burns et al. (2023). Weak-to-Strong Generalization (OpenAI)](https://openai.com/index/weak-to-strong-generalization/) — AAR 攻击的底层问题
