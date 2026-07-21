---
title: '多Agent强化学习MADDPG-QMIX-MAPPO'
description: '多 Agent 协调的强化学习遗产，在 2026 年仍然指导 LLM Agent 系统。MADDPG (Lowe 等人, NeurIPS 2017, arXiv:1706.02275) 引入了集中训练分散执行 (CTDE)：每个评论家在训练期间看到所有 Agent 的状态和动作；测试时只有局部...'
module: agent
related:
  - agent/LLM路由层
  - agent/MARL寮哄寲瀛︿範
  - agent/MCP安全工具投毒
  - agent/MCP安全OAuth2.1
prerequisites:
  - agent/概述与架构
---

# MARL — MADDPG, QMIX, MAPPO

> 多 Agent 协调的强化学习遗产，在 2026 年仍然指导 LLM Agent 系统。**MADDPG** (Lowe 等人, NeurIPS 2017, arXiv:1706.02275) 引入了集中训练分散执行 (CTDE)：每个评论家在训练期间看到所有 Agent 的状态和动作；测试时只有局部 Actor 运行。适用于合作、竞争和混合设置。**QMIX** (Rashid 等人, ICML 2018, arXiv:1803.11485) 是带单调混合网络的值分解；每 Agent 的 Q 组合成联合 Q，使 `argmax` 干净地分布——在 StarCraft 多 Agent 挑战赛 (SMAC) 上占主导。**MAPPO** (Yu 等人, NeurIPS 2022, arXiv:2103.01955) 是带集中值函数的 PPO；在粒子世界、SMAC、Google Research Football、Hanabi 上"惊人地有效"，只需最少调优。这些是训练必须分散行动的 Agent 团队策略的基础。MAPPO 是 **2026 年合作 MARL 的默认基线**。本课程从一个小型网格世界玩具构建每种算法，在接触 LLM Agent 训练之前将三个想法植入肌肉记忆。

**类型：** 学习
**语言：** Python (stdlib, 小型无 NumPy 实现)
**前置条件：** Phase 09 (强化学习), Phase 16 · 09 (并行群体网络)
**时间：** ~90 分钟

## 问题

LLM Agent 系统越来越多地训练 Agent 间协调策略：何时推迟、何时行动、调用哪个同伴。告诉你如何训练此类策略的文献是多 Agent 强化学习 (MARL)，它早于 LLM 浪潮，有一小组主导算法。

没有模式词汇阅读 MARL 论文是痛苦的。集中训练分散执行 (CTDE)、值分解和集中评论家不是流行语——它们是对特定问题的具体回答：

- 独立 RL（每个 Agent 单独学习）从每个 Agent 的视角是非平稳的。糟糕。
- 集中 RL（一个 Agent 控制所有）不可扩展且违反执行约束。
- CTDE 兼得两者：用全局信息训练，用局部策略部署。

## 概念

### 论文使用的三种环境

- **粒子世界 (多 Agent 粒子环境)。** 带合作/竞争任务的简单 2D 物理。MADDPG 的原始测试床。
- **StarCraft 多 Agent 挑战赛 (SMAC)。** 合作微操、部分观察。QMIX 的测试床。离散动作、连续状态。
- **Google Research Football, Hanabi, MPE。** MAPPO 基线。

不同环境有不同的动作/观察类型。算法相应选择。

### MADDPG (2017) — CTDE 模式

每个 Agent `i` 有一个 Actor `mu_i(o_i)`，将其自身观察映射到动作。每个 Agent 还有一个评论家 `Q_i(x, a_1, ..., a_n)`，在训练期间看到所有观察和所有动作。Actor 通过对评论家评估的策略梯度更新。

```
actor update:    grad_theta_i J = E[grad_theta mu_i(o_i) * grad_a_i Q_i(x, a_1..n) at a_i=mu_i(o_i)]
critic update:   TD on Q_i(x, a_1..n) given next-state joint estimate
```

为什么 CTDE：在训练时，我们知道每个人的动作；我们用它来减少每个评论家的方差。在部署时，每个 Agent 只看到 `o_i` 并调用 `mu_i(o_i)`。

失败模式：评论家随 N 个 Agent 增长（输入包括所有动作）。没有近似无法扩展到约 10 个 Agent 以上。

### QMIX (2018) — 值分解

仅合作。全局奖励是每 Agent Q 值单调函数的和：

```
Q_tot(tau, a) = f(Q_1(tau_1, a_1), ..., Q_n(tau_n, a_n)),   df/dQ_i >= 0
```

单调性保证 `argmax_a Q_tot` 可以通过每个 Agent 独立选择 `argmax_{a_i} Q_i` 来计算。这正是你需要的**分散执行属性**。在训练时，混合网络从每 Agent Q 产生 `Q_tot`。

为什么 QMIX 在 SMAC 上赢：合作 StarCraft 微操有同质 Agent、局部观察、全局奖励——值分解的完美匹配。

失败模式：单调性约束是限制性的；某些任务的奖励结构不是单调可分解的（一个 Agent 为团队牺牲）。扩展 (QTRAN, QPLEX) 放松了这一点。

### MAPPO (2022) — 被忽视的默认

多 Agent PPO：带集中值函数的 PPO。每个 Agent 有自己的策略；所有 Agent 共享（或有每 Agent）看到完整状态的值函数。Yu 等人 2022 在五个基准上将 MAPPO 与 MADDPG、QMIX 及其扩展进行基准测试，发现：

- MAPPO 在粒子世界、SMAC、Google Research Football、Hanabi、MPE 上匹配或击败离策略 MARL 方法。
- 需要最少的超参数调优。
- 训练稳定；跨种子可复现。

社区低估了在策略 MARL 直到这篇论文。2026 年，MAPPO 是合作 MARL 的默认基线；任何新方法必须击败它。

### 为什么 LLM Agent 工程师应该关心

三个直接用途：

1. **路由器训练。** 元 Agent 选择哪个子 Agent 处理任务。这是一个有 N 个分散子 Agent 和一个集中路由器的 MARL 问题。MAPPO 适合。
2. **角色涌现。** 在生成式 Agent 模拟中，训练 Agent 随时间采用互补角色是伪装的 MARL 问题。QMIX 风格的值分解通过构造强制互补性。
3. **多 Agent 工具使用。** 当 Agent 共享工具并竞争预算时，通过 CTDE 训练它们产生尊重资源约束的可部署局部策略。

实际注意事项：2026 年，大多数生产 LLM Agent 系统提示其策略而不是训练。MARL 在你有 (a) 大量交互数据、(b) 清晰的奖励信号、(c) 愿意投资训练基础设施时才介入。

### CTDE 作为超越 RL 的设计模式

即使没有训练，CTDE 也是有用的架构模式：

- 在*设计*期间，假设完整团队可见性。
- 在*运行时*，强制分散执行：每个 Agent 只看到 `o_i`。

该模式强制你保持每 Agent 状态显式，并提前考虑部分可观察性。许多生产多 Agent 系统静默假设到处都有共享状态——CTDE 纪律防止了这一点。

### 非平稳性问题

当多个 Agent 同时学习时，每个 Agent 的环境（包括其他 Agent 的策略）是非平稳的。经典单 Agent RL 证明失效。本课程的 MARL 算法都解决了这个问题：

- MADDPG：全局评论家看到所有动作，所以其值估计是平稳的。
- QMIX：值分解将学习移到联合 Q 空间，其中最优性是明确定义的。
- MAPPO：集中值函数抑制了来自其他 Agent 策略变化的方差。

在 LLM Agent 系统中，非平稳性表现为"我的 Agent 上个月还能工作，现在上游那个 Agent 变了，我的就出问题了。"用 CTDE 训练 MARL 是原则性修复；提示级修复更快但不那么持久。

### 本课程不涵盖的内容

训练实际网络是 Phase 09 的话题。本课程构建脚本化策略版本，演示 CTDE、值分解和集中值模式，无需梯度更新。目标是在你拿起完整的 MARL 库 (PyMARL, MARLlib, RLlib multi-agent) 之前内化模式。

## 构建它

`code/main.py` 在微型 2 Agent 合作网格世界上实现三种模式演示：

- 环境：4x4 网格上的 2 个 Agent，一个奖励颗粒。任何 Agent 到达颗粒则奖励 = 1；任务完成。
- `IndependentAgents` — 每个 Agent 将其他 Agent 视为环境。基线。
- `MADDPGStyle` — 集中评论家计算联合值；Actor 策略从中更新。脚本化策略改进。
- `QMIXStyle` — 带单调混合器的值分解。
- `MAPPOStyle` — 集中值函数；策略对共享基线更新。

所有四个运行相同回合并报告平均到达目标步数。CTDE 变体收敛到更短路径。

运行：

```
python3 code/main.py
```

预期输出：独立 Agent 平均约 6 步；CTDE 变体收敛到约 3.5 步（4x4 网格的最优是 3）。模式差异在脚本化策略下也显现。

## 使用它

`outputs/skill-marl-picker.md` 是为给定多 Agent 任务选择 MARL 算法的技能：合作 vs 竞争、同质 vs 异质、动作空间类型、规模、奖励信号。

## 发布它

MARL 在生产中很少见。当你确实使用时：

- **从 MAPPO 开始。** 2022 年的论文确立了这是基线；先复现它节省数周追逐更花哨方法的时间。
- **记录每个 Agent 的观察和动作流。** 没有每 Agent 追踪调试 MARL 是无望的。
- **分离训练代码和执行代码。** CTDE 是一种纪律；让执行路径真的只看到 `o_i`。
- **奖励塑形警告。** MARL 对奖励设计极其敏感。塑形中一个协调 bug，Agent 就学会利用它。运行对抗性测试。
- **对于 LLM Agent**，先考虑提示级策略。只在交互数据 + 奖励信号 + 基础设施都具备时投资 MARL 训练。

## 练习

1. 运行 `code/main.py`。测量独立和 MAPPO 风格 Agent 之间的到达目标步数差距。差距在 6x6 网格上增大还是缩小？
2. 实现竞争变体：两个 Agent，一个颗粒，只有先到达的获得奖励。哪种模式干净地处理竞争？历史上是 MADDPG。
3. 阅读 MADDPG (arXiv:1706.02275) 第 3 节。用你自己的话符号化实现精确的评论家更新规则伪代码。
4. 阅读 MAPPO (arXiv:2103.01955)。为什么作者论证集中值 + PPO 在其基准上击败离策略 MARL？列出三个最强主张。
5. 将 CTDE 作为设计模式应用于假设的 LLM Agent 系统（例如，研究 Agent + 摘要者 + 编码者）。设计时可用但运行时不可用的联合信息是什么？

## 关键术语

| 术语            | 人们怎么说                  | 实际含义                                                   |
| --------------- | --------------------------- | ---------------------------------------------------------- |
| MARL            | "多 Agent RL"               | 多 Agent 系统的强化学习。                                  |
| CTDE            | "集中训练分散执行"          | 用全局信息训练；用局部策略部署。                           |
| MADDPG          | "多 Agent DDPG"             | 带每 Agent 评论家看到所有观察 + 动作的 CTDE。              |
| QMIX            | "值分解"                    | 每 Agent Q 的单调混合。仅合作。                            |
| MAPPO           | "多 Agent PPO"              | 带集中值函数的 PPO。2026 年默认基线。                      |
| 值分解          | "个体 Q 的和"               | 联合 Q 表示为每 Agent Q 的单调函数。                       |
| 非平稳性        | "移动目标"                  | 每个 Agent 的环境随其他 Agent 学习而变化。核心 MARL 问题。 |
| 在策略 / 离策略 | "从当前/回放学习"           | PPO 是在策略 (MAPPO)；DDPG 和 Q-learning 是离策略。        |
| SMAC            | "StarCraft 多 Agent 挑战赛" | 合作微操基准；QMIX 的主场。                                |

## 延伸阅读

- [Lowe et al. — Multi-Agent Actor-Critic for Mixed Cooperative-Competitive Environments](https://arxiv.org/abs/1706.02275) — MADDPG; NeurIPS 2017
- [Rashid et al. — QMIX: Monotonic Value Function Factorisation for Deep Multi-Agent Reinforcement Learning](https://arxiv.org/abs/1803.11485) — QMIX; ICML 2018
- [Yu et al. — The Surprising Effectiveness of PPO in Cooperative Multi-Agent Games](https://arxiv.org/abs/2103.01955) — MAPPO; NeurIPS 2022
- [BAIR blog post on MAPPO](https://bair.berkeley.edu/blog/2021/07/14/mappo/) — MAPPO 结果的可读框架
- [SMAC repository](https://github.com/oxwhirl/smac) — StarCraft 多 Agent 挑战赛
