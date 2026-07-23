---
title: 心智理论与涌现协调
description: 'Li 等人 (arXiv:2310.10701) 显示合作文本游戏中的 LLM Agent 展现了涌现高阶心智理论 (ToM)——推理另一个 Agent 对第三个 Agent 信念的信念——但由于上下文管理和幻觉在长期规划上失败。Riedl (arXiv:2510.05174) 测量了群体中的...'
module: agent
related:
  - agent/宪法AI与价值观对齐
  - agent/协商与讨价还价
  - agent/心智社会与辩论
  - agent/验证门
prerequisites:
  - agent/概述与架构
---

# 心智理论与涌现协调

> Li 等人 (arXiv:2310.10701) 显示合作文本游戏中的 LLM Agent 展现了**涌现高阶心智理论** (ToM)——推理另一个 Agent 对第三个 Agent 信念的信念——但由于上下文管理和幻觉在长期规划上失败。Riedl (arXiv:2510.05174) 测量了群体中的高阶协同，发现**只有** ToM 提示条件产生身份关联分化和目标导向互补性；较低容量 LLM 只显示虚假涌现。也就是说，协调涌现是提示条件性和模型依赖性的，不是免费的。本课程实现最小 ToM 感知 Agent，在有和没有 ToM 提示的情况下运行合作任务，并按 Riedl 2025 协议测量协调增量。

**类型：** 学习 + 构建
**语言：** Python (stdlib)
**前置条件：** Phase 16 · 07 (心智社会与辩论), Phase 16 · 17 (生成式Agent)
**时间：** ~75 分钟

## 问题

多 Agent 协调通常看起来很神奇：Agent 分工、互相预判、避免冗余。通常这种"涌现"是提示工程的产物——有人告诉 Agent "协调。"移除提示，移除协调。

Riedl 2025 的发现更严格：在受控条件下，协调只在 Agent 被提示推理**其他 Agent 的心智** (ToM) 时才涌现。没有 ToM 提示，即使是强模型也显示不经受统计控制的协调模式。这对生产很重要：团队发布"多 Agent 协调"功能，这些功能是提示依赖且脆弱的。

本课程将 ToM 视为特定能力（推理关于信念的信念），构建最小 ToM 感知 Agent，并测量真正的协调与提示装饰的区别。

## 概念

### ToM 意味着什么

发展心理学：3 岁孩子认为任何人的内心世界与自己匹配。5 岁孩子理解他人有不同信念。7 岁孩子推理关于信念的信念（"她认为我认为球在杯子下面"）。这些是零阶、一阶和二阶 ToM。

对于 LLM Agent，ToM 阶映射到：

- **零阶：** 没有他人模型。Agent 只根据自己的观察行动。
- **一阶：** Agent 有每个其他 Agent 信念的模型。"Alice 相信 X。"
- **二阶：** Agent 建模递归信念。"Alice 相信 Bob 相信 X。"

Li 等人 2023 发现一阶和二阶 ToM 在合作游戏中的 LLM Agent 中涌现，但在长期和不可靠通信中退化。

### Sally-Anne 测试，简述

1985 年错误信念测试：Sally 把弹珠放在篮子 A 中，离开。Anne 把它移到篮子 B。Sally 回来时会找哪里？有一阶 ToM 的孩子说篮子 A（Sally 的信念与现实不同）。没有的说篮子 B。

GPT-4 时代的 LLM 在直接提出时通过 Sally-Anne 风格测试。当叙事很长、场景变化多次、或问题间接表述时失败。这就是 2026 年生产 LLM 中 ToM 的实际状态。

### Riedl 的协调测量

Riedl (arXiv:2510.05174) 构建了群体规模测试：N 个 Agent、合作目标、可变提示条件。测量：

1. **身份关联分化。** Agent 随时间发展稳定的角色区分吗？
2. **目标导向互补性。** Agent 的行动互补（不同子任务）还是重复？
3. **高阶协同。** 群体是否实现了任何子集都无法实现的统计度量。

结果：只在 ToM 提示条件下，所有三个指标产生高于基线的信号。没有 ToM 提示，中等容量模型的指标徘徊在机会附近。大模型在没有显式 ToM 提示的情况下显示一些协调，但效果比显式提示小。

### 协调幻觉

没有统计控制，演示中的"涌现协调"通常反映：

- 烘焙协调的提示工程（说"一起工作"的系统提示）。
- 观察者偏差（我们看到我们期望的模式）。
- 成功运行的事后选择。

营销"涌现协调"而没有可测量信号的生产系统应该被视为营销。先测量再声称。

### 最小 ToM 感知 Agent

结构：

```
agent state:
  own_beliefs:    {Agent 相信的事实}
  other_models:   {other_agent_id -> {Agent 归因于他们的信念}}
  actions_last_N: [其他人行动的历史]

observation update:
  - 从直接观察更新 own_beliefs
  - 从他们的行动 + 先前信念更新 other_models[agent_id]

action selection:
  - 枚举候选行动
  - 对于每个，预测每个其他 Agent 在其建模信念下下一步会做什么
  - 选择在这些预测下最大化联合结果的行动
```

`other_models` 属性是 ToM 状态。一阶 ToM 只保持一层。二阶添加 `other_models[i][other_models_of_j]` — 我认为 Agent i 认为 Agent j 相信什么。

### 为什么长期有害

Li 等人记录：上下文限制导致 Agent 忘记哪个信念属于谁。幻觉向其他 Agent 模型添加虚假信念。两者都产生"我以为他以为 X"的错误，随时间复合。

论文和 2024-2026 后续中记录的缓解：

- **提示中的显式 ToM 状态。** 结构化格式：`{agent_id: belief_list}`。强制检索保留身份-信念绑定。
- **更短的推理链。** 每轮更少的 ToM 更新减少复合幻觉。
- **外部 ToM 存储。** 在 LLM 上下文外维护模型；每轮只注入相关部分。

### ToM 在生产中何处失败

- **对抗性设置。** 具有良好 ToM 的 Agent 更容易被操纵（你可以建模它们对你的建模，然后利用）。
- **异构团队。** 当模型不同时，对一个对手有效的 ToM 模型不泛化。
- **依赖真实答案的任务。** ToM 关于信念；如果正确性取决于事实，ToM 可能是干扰。

### 你实际可以测量的协调

团队协调是真实的而非提示装饰的三个实用信号：

1. **随时间的互补性。** 在多轮任务中，Agent 的行动覆盖不相交的子任务吗？
2. **预判。** Agent A 在 T+1 轮的行动是否依赖于对 B 在 T+2 轮行动的预测且预测正确？
3. **纠正。** 当 A 在 T 轮误读 B 的信念时，A 是否在 T+2 轮前纠正？

这些在记录的多 Agent 系统中是可测量的。它们是"协调"叙事的实质性版本。

## 构建它

`code/main.py` 实现：

- `ToMAgent` — 追踪自己的信念和每其他 Agent 的信念模型。
- 合作任务：三个 Agent 必须从三个盒子中收集三个令牌；每个盒子可以持有一个令牌。Agent 不能通信；它们从彼此的行动推断意图。
- 两种配置：`zeroth_order`（无 ToM）和 `first_order`（带一层信念模型的 ToM）。
- 200 次随机试验的测量：完成率、重复率（两个 Agent 瞄准同一个盒子）、平均完成轮次。

运行：

```
python3 code/main.py
```

预期输出：零阶 Agent 以约 35% 的比率重复努力，在 10 轮中完成约 60% 的试验。一阶 ToM Agent 以约 5% 重复，完成约 95%。增量是可测量的协调效应。

## 使用它

`outputs/skill-tom-auditor.md` 是一个技能，审计多 Agent 系统声称的"涌现协调。"检查提示装饰、对控制的统计显著性和测量的互补性。

## 发布它

协调声称检查清单：

- **控制条件。** 你的系统没有协调提示的版本。测量两者。
- **统计测试。** 系统和控制之间的差异在你的指标上是否在 `p < 0.05` 显著？
- **互补性度量。** 随时间的行动不相交性，不仅是最终成功。
- **失败案例日志。** 当 Agent 协调失败时，ToM 状态看起来如何？
- **模型容量披露。** 如果效果在较小模型上消失，说出来。

## 练习

1. 运行 `code/main.py`。确认一阶 ToM 将重复率降低约 7 倍。当你扩展到 5 个 Agent 和 5 个盒子时差距持续吗？
2. 实现二阶 ToM（Agent A 建模 B 对 C 的想法）。它比一阶改善吗？在什么任务上？
3. 向 ToM 状态注入**幻觉**：每轮随机翻转一个信念。这如何降低一阶性能？
4. 阅读 Li 等人 (arXiv:2310.10701)。复现"长期退化"发现：当轮次从 10 增长到 30 时，你的一阶 ToM 性能如何变化？
5. 阅读 Riedl 2025 (arXiv:2510.05174)。在你的模拟日志上实现高阶协同统计。没有 ToM 提示条件时效果存在吗？

## 关键术语

| 术语            | 人们怎么说         | 实际含义                                                |
| --------------- | ------------------ | ------------------------------------------------------- |
| 心智理论        | "理解他人的心智"   | 建模另一个 Agent 信念的能力。按阶分级 (0, 1, 2+)。      |
| Sally-Anne 测试 | "错误信念测试"     | 1985 年发展心理学；LLM 通过简单版本，在复杂版本上失败。 |
| 一阶 ToM        | "A 相信 X"         | 建模另一个对事实的信念。                                |
| 二阶 ToM        | "A 相信 B 相信 X"  | 递归建模更深一层。                                      |
| 身份关联分化    | "随时间稳定的角色" | Riedl 的指标：角色持续，不是随机的。                    |
| 目标导向互补性  | "不相交行动"       | Agent 瞄准不同子任务，不是同一个。                      |
| 高阶协同        | "群体超过任何子集" | Riedl 的真正协调统计度量。                              |
| 协调幻觉        | "看起来协调"       | 提示装饰的协调外观，没有可测量信号。                    |

## 延伸阅读

- [Li et al. — Theory of Mind for Multi-Agent Collaboration via Large Language Models](https://arxiv.org/abs/2310.10701) — 合作游戏中的涌现 ToM；长期失败模式
- [Riedl — Emergent Coordination in Multi-Agent Language Models](https://arxiv.org/abs/2510.05174) — 群体规模测量；ToM 提示是承重条件
- [Premack & Woodruff — Does the chimpanzee have a theory of mind?](https://www.cambridge.org/core/journals/behavioral-and-brain-sciences/article/does-the-chimpanzee-have-a-theory-of-mind/1E96B02CD9850E69AF20F81FA7EB3595) — 1978 年 ToM 概念的起源
- [Baron-Cohen, Leslie, Frith — Does the autistic child have a theory of mind?](https://www.cambridge.org/core/journals/behavioral-and-brain-sciences/article/does-the-autistic-child-have-a-theory-of-mind/) — Sally-Anne 论文 (1985)
