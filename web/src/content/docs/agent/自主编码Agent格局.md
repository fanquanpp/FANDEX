---
title: 自主编码Agent格局
description: 'SWE-bench Verified 在不到三年内从 4% 升至 80.9%。相同的 Claude Sonnet 4.5 在 SWE-agent v1 上得分 43.2%，在 Cline autonomous 上得分 59.8%——模型周围的脚手架现在与模型本身一样重要。OpenHands（前...'
module: agent
related:
  - agent/自动化对齐研究AAR
  - agent/自精炼与CRITIC
  - agent/最小Agent工作台
  - agent/作用域契约
prerequisites:
  - agent/概述与架构
---

# 自主编码 Agent 格局 (2026)

> SWE-bench Verified 在不到三年内从 4% 升至 80.9%。相同的 Claude Sonnet 4.5 在 SWE-agent v1 上得分 43.2%，在 Cline autonomous 上得分 59.8%——模型周围的脚手架现在与模型本身一样重要。OpenHands（前身为 OpenDevin）是最活跃的 MIT 许可平台，其 CodeAct 循环直接在沙箱中执行 Python 动作而非 JSON 工具调用。头条数字隐藏了一个方法论问题：500 个 SWE-bench Verified 任务中有 161 个只需要 1-2 行更改，而 SWE-bench Pro（10+ 行任务）对相同前沿模型仅 23-59%。

**类型：** 学习
**语言：** Python (stdlib, CodeAct vs JSON 工具调用比较)
**前置条件：** Phase 14 · 07 (工具使用), Phase 15 · 01 (长时间范围Agent)
**时间：** ~45 分钟

## 问题

"哪个编码 Agent 最好"是错误的问题。正确的问题是：在匹配我工作的任务分布上，使用我将在生产中运行的脚手架，我获得什么端到端可靠性？

2022 到 2026 年间，该领域学到脚手架——检索层、规划器、沙箱、编辑-验证循环、反馈格式——是承重的。Claude Sonnet 4.5 在 SWE-agent v1 上 SWE-bench Verified 得分 43.2%；相同模型在 Cline 的自主脚手架内得分 59.8%。16.6 个绝对百分点差异，相同权重。基础模型是组件；循环是产品。

伴随问题是基准饱和隐藏了回归。SWE-bench Verified 接近饱和，简单任务尾部（500 个任务中 161 个需要 ≤2 行）拉高了最高分。真实世界质量最好在 SWE-bench Pro（10+ 行更改）等分布上测量，相同领先者仍只有 23-59%。

## 概念

### SWE-bench，一段话概括

SWE-bench (Jimenez 等人) 取真实 GitHub issue 及其 ground-truth 补丁，要求 Agent 产生使测试套件通过的补丁。SWE-bench Verified (OpenAI, 2024) 是人工策划的 500 任务子集，移除了模糊和损坏的任务。SWE-bench Pro 是更难的继任者——需要 10+ 行更改的任务，当前前沿 Agent 仅 23-59%。

### 2022 → 2026 曲线实际显示什么

- **2022**：原始 SWE-bench 上研究模型约 4%。
- **2024**：GPT-4 + Devin 风格脚手架约 14%；SWE-agent 约 12%。
- **2025**：Aider 和 SWE-agent 中的 Claude 3.5/3.7 Sonnet 推进到 40-55% 范围。
- **2026**：Claude Sonnet 4.5 和前沿竞争者在 SWE-bench Verified 上 70-80%+。Epoch AI 排行榜实时追踪。

斜率来自三个复合来源：更好的基础模型、更好的脚手架（CodeAct、反思、验证器循环）和更好的基准（Verified 移除噪声）。

### CodeAct vs JSON 工具调用

OpenHands (All-Hands-AI, arXiv:2407.16741, 前身为 OpenDevin) 做了特定的架构押注：模型发出 Python 代码，Jupyter 风格内核在沙箱中运行，而非模型发出 JSON 工具调用由宿主解码执行。Agent 可以在一个动作内循环文件、链式工具和捕获自己的异常。

权衡：

- **JSON 工具调用**：每个动作是一轮；易于审计；组合性有限；默认安全因为每个调用经过显式验证器。
- **CodeAct**：一个动作可以是整个程序；组合性强；需要加固的沙箱（OpenHands 使用 Docker 隔离）；失败模式包括沙箱运行时允许的任何事。

两种架构都在生产中。CodeAct 在开放平台（OpenHands, smolagents）中占主导。JSON 工具调用在托管服务（Anthropic Managed Agents, OpenAI Assistants）中仍占主导，提供商控制执行器。

### 2026 年格局中的脚手架

| 脚手架                | 许可     | 执行模型                   | 显著属性                        |
| --------------------- | -------- | -------------------------- | ------------------------------- |
| OpenHands (OpenDevin) | MIT      | Docker 中的 CodeAct        | 最活跃的开放平台；事件流可重放  |
| SWE-agent             | MIT      | Agent-计算机接口 (ACI)     | 首个端到端 SWE-bench 脚手架     |
| Aider                 | Apache-2 | 本地仓库中的 edit-via-diff | 最小脚手架，强回归稳定性        |
| Cline                 | Apache-2 | 带工具策略的 VS Code Agent | Sonnet 4.5 上最高分的开放脚手架 |
| Devin (Cognition)     | 专有     | 托管 VM + 规划器           | 首个"AI 软件工程师"产品类别     |
| Claude Code           | 专有     | 权限模式 + 例程            | Lesson 10 详细覆盖 Agent 循环   |

### 为什么脚手架占主导

编码运行是长时间范围轨迹 (Lesson 1)。可靠性跨步骤复合。脚手架买入分数的三个地方：

1. **检索**：找到正确的文件来读取是沉默的瓶颈。SWE-agent 的 ACI、OpenHands 的文件索引和 Aider 的 repo-map 都攻击这一点。
2. **验证器循环**：运行测试、读取堆栈跟踪和重试是 SWE-bench 上 10+ 点的增量。
3. **失败遏制**：错误时回滚的沙箱防止复合损害。相同模型有和没有验证器循环看起来像两个不同的产品。

### 基准饱和和真实分布

OpenHands 作者和 Epoch AI 都标记 SWE-bench Verified 有简单尾部：500 个任务中 161 个只需 1-2 行更改。高分部分由这个尾部驱动。SWE-bench Pro 限制为 10+ 行更改，即使前沿系统也返回 23-59% 范围的分数。你的生产分布几乎肯定更接近 Pro 而非 Verified。

选择 Agent 的含义：运行你自己 bug 积压的 Pro 样子集。重要的分数是代表你发布内容的任务上的分数。

## 使用它

`code/main.py` 在固定迷你任务分布上比较两个玩具 Agent 脚手架：

1. **JSON 工具调用**脚手架，每轮一个动作。
2. **CodeAct** 脚手架，每个动作可以发出小型 Python 代码片段。

两者都使用存根"模型"（确定性规则），因此比较将脚手架与模型质量隔离。输出显示 CodeAct 脚手架在更少轮次中解决更多任务，代价是更大的每动作爆炸半径。

## 发布它

`outputs/skill-scaffold-audit.md` 帮助你在采用前审计提议的编码 Agent 脚手架：检索质量、验证器存在、沙箱隔离和基准到分布适配。

## 练习

1. 运行 `code/main.py`。每个脚手架在相同任务集上需要多少轮？每个的每动作爆炸半径是多少？

2. 阅读 OpenHands 论文 (arXiv:2407.16741)。论文论证 CodeAct 在复杂任务上击败 JSON 工具调用。识别论文承认的一个失败模式，写一句话说明该模式何时在生产中占主导。

3. 从你的 bug 积压中选择一个需要跨两个文件 10+ 行更改的任务。估计前沿模型在 (a) JSON 工具调用和 (b) CodeAct 下的端到端成功概率。论证差距。

4. SWE-bench Verified 有 161 个单文件、1-2 行任务。构建排除它们的分数。排行榜如何洗牌？

5. 阅读"Introducing SWE-bench Verified" (OpenAI)。解释用于移除模糊任务的具体方法论，命名策划会遗漏的一个类别。

## 关键术语

| 术语               | 人们怎么说         | 实际含义                                             |
| ------------------ | ------------------ | ---------------------------------------------------- |
| SWE-bench          | "编码基准"         | 带 ground-truth 补丁和测试套件的真实 GitHub issue    |
| SWE-bench Verified | "清理子集"         | 500 个人工策划任务，存在简单尾部                     |
| SWE-bench Pro      | "更难子集"         | 10+ 行更改；前沿仅 23-59%                            |
| CodeAct            | "代码即动作"       | Agent 发出 Python；Jupyter 风格内核在沙箱中执行      |
| JSON 工具调用      | "函数调用"         | 每个动作是执行前验证的结构化 JSON 有效载荷           |
| 脚手架             | "Agent 框架"       | 基础模型周围的检索 + 规划器 + 执行器 + 验证器循环    |
| ACI                | "SWE-agent 的格式" | 为 LLM 人体工程学设计的命令集，不是人类 Shell        |
| 验证器循环         | "测试和重试"       | 运行测试、读取输出、修订补丁；最大的非模型可靠性增益 |

## 延伸阅读

- [Jimenez et al. — SWE-bench](https://www.swebench.com/) — 原始基准和方法论
- [OpenAI — Introducing SWE-bench Verified](https://openai.com/index/introducing-swe-bench-verified/) — 策划子集如何构建
- [Wang et al. — OpenHands](https://arxiv.org/abs/2407.16741) — CodeAct 架构和事件流设计
- [Epoch AI — SWE-bench leaderboard](https://epoch.ai/benchmarks) — 实时追踪分数
