---
title: 可扩展监督与弱到强泛化
description: 'Burns等人2023年提出超对齐问题的代理：用弱模型产生的标签微调强模型。可扩展监督和W2SG互补：前者增加监督者有效能力，后者确保强模型从缺陷监督中正确泛化。Debate Helps W2SG (2025)将两者结合。'
module: 'ai-ethics'
difficulty: advanced
tags:
  - 可扩展监督
  - 弱到强泛化
  - PGR
  - 辩论机制
  - 递归奖励建模
related:
  - 'ai-ethics/监管框架EU与US与UK与韩国'
  - 'ai-ethics/奖励黑客与Goodhart定律'
  - 'ai-ethics/模型福利研究'
  - 'ai-ethics/模型卡与系统卡与数据集卡'
prerequisites:
  - 'ai-ethics/谄媚作为RLHF放大器'
---

## 问题定义

Phase 18中到目前为止的每个对齐技术都假设监督者能评估模型的行为。当模型是超人的时候，监督者是薄弱环节。超对齐问题：较弱的监督者能否可靠地产生更强的、对齐的模型？

Burns等人将其简化为操作化实证设置：用弱监督强，测量强模型的能力在弱监督下保留了多少。这不是超对齐的解决方案——它是让我们衡量进展的代理。

## 核心概念

### W2SG：Burns等人设置

- 弱模型：GPT-2级别。
- 强模型：GPT-4级别。
- 目标：强GPT-4在任务上的上限。

过程：

1. 获取弱模型在任务上的零样本预测。
2. 在弱标签数据上微调强模型。
3. 测量强微调模型的准确率。

基线：弱模型自身准确率，强模型在金标签上的监督上限。

差距指标：Performance Gap Recovered (PGR) = (微调 - 弱) / (上限 - 弱)。PGR为1.0表示弱监督完全关闭差距；PGR为0表示弱监督没有帮助。

### Burns等人实证发现

在NLP、国际象棋谜题和奖励建模任务中，PGR一致为正：强模型超越了弱监督者的错误进行泛化。任务特定PGR从约20%到约80%不等。强模型从缺陷标签中"理解"了预期任务，用其预训练先验填补。

Burns等人指出的局限性：

- 这里的弱到强差距是能力差距，不是对齐差距。弱模型是对齐的；真正的超人模型可能由人类对齐，但能力差距大得多。
- 强模型的泛化可能更多关于任务先验而非恢复地面真值意图。
- 引出强模型的潜在知识才是真正的问题；PGR测量的是特定操作化。

### 可扩展监督：三种机制

- **辩论（Irving等人2018）。** U的两个实例论证相反方；弱判断者决定。假设：找到令人信服的真实答案比找到令人信服的虚假答案更容易。2024-2025年最新工作（Khan等人，Michael等人）表明辩论有时有帮助有时没有，是否有帮助取决于任务结构。
- **递归奖励建模（Leike等人2018）。** U帮助人类训练U+1的奖励模型。监督者的有效能力随模型增长。
- **任务分解（Christiano, Shlegeris, Amodei 2018）。** 将困难任务分解为人类可以检查的子任务，递归进行。假设可分解性。

每种机制都假设了关于任务结构或中间组件对齐的某些东西。

### 为什么可扩展监督和W2SG互补

可扩展监督增加监督者的有效信号质量。
W2SG从监督者能提供的任何缺陷信号中关闭差距。

Lang等人 — Debate Helps Weak-to-Strong Generalization (arXiv:2501.13124) 将两者结合：辩论协议提供更好的弱标签，强模型在这些标签上训练。报告了NLP任务上的PGR增益。

### 组织戏剧

OpenAI的超对齐团队在2024年5月Jan Leike离开前往Anthropic后解散。该议程（可扩展监督、W2SG、自动化对齐研究）在Anthropic和学术实验室继续——MATS（第28课）、Redwood（第10课）、Apollo（第8课）、METR（第28课）。组织结构变了；研究问题没有。

## 关键术语

| 术语               | 常见说法         | 实际含义                                              |
| ------------------ | ---------------- | ----------------------------------------------------- |
| Scalable oversight | "让监督者更强"   | 增加监督者评估更强模型能力的机制                      |
| W2SG               | "弱监督强"       | 在弱标签上微调强模型并测量恢复的能力                  |
| PGR                | "性能差距恢复"   | (微调 - 弱) / (上限 - 弱)；1.0 = 完全关闭，0 = 无帮助 |
| Debate             | "两个U实例辩论"  | 弱判断者在两个U辩护者之间选择的可扩展监督机制         |
| RRM                | "递归奖励建模"   | U帮助训练U+1的奖励模型；监督者能力跟踪U               |
| Task decomposition | "人类检查子任务" | 将困难任务分解为人类可验证的子任务，递归进行          |
| Superalignment     | "对齐超人AI"     | 关心对齐人类无法直接评估的模型的研究议程              |

## 延伸阅读

- Burns et al. — Weak-to-Strong Generalization (OpenAI 2023) — W2SG论文
- Irving, Christiano, Amodei — AI safety via debate (arXiv:1805.00899) — 辩论机制
- Leike et al. — Scalable agent alignment via reward modeling (arXiv:1811.07871) — 递归奖励建模
- Khan et al. — Debating with More Persuasive LLMs Leads to More Truthful Answers (arXiv:2402.06782) — 2024年辩论实证研究
- Lang et al. — Debate Helps Weak-to-Strong Generalization (arXiv:2501.13124) — 2025年辩论+W2SG结合
