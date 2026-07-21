---
title: RL在游戏中的应用
description: 从Atari到星际争霸，强化学习在游戏AI中的里程碑与核心技术
module: 'machine-learning'
difficulty: intermediate
tags:
  - 游戏AI
  - Atari
  - AlphaGo
  - AlphaStar
  - 自博弈
  - MCTS
related:
  - 'machine-learning/PPO近端策略优化'
  - 'machine-learning/Q学习与SARSA'
prerequisites:
  - 'machine-learning/机器学习概述'
---

# RL 在游戏中的应用

> 游戏是 RL 的试验场。Atari 证明深度 RL 有效。AlphaGo 证明 RL 超越人类。AlphaStar 证明 RL 处理复杂多智能体环境。OpenAI Five 证明 RL 可以大规模训练。每个里程碑都推动了 RL 技术的边界，也产生了可迁移到现实世界的算法和工程实践。

**类型:** 学习
**语言:** Python
**前置知识:** Phase 9 · 05 (DQN), Phase 9 · 08 (PPO), Phase 9 · 10 (多智能体)
**时间:** ~45 分钟

## 问题

游戏是 RL 研究的理想环境：(1) 明确的奖励（分数/胜负），(2) 无限廉价数据（仿真），(3) 清晰的评估指标（Elo 分数），(4) 渐进的难度。从简单到复杂的游戏序列推动了 RL 的每个重大突破。

## 里程碑

**Atari (DQN, 2015)。** Mnih et al.。49 个 Atari 2600 游戏，原始像素输入，单算法。首次证明深度 RL 在多样化任务上工作。关键创新：经验回放 + 目标网络。

**AlphaGo (2016)。** Silver et al.。围棋，10^170 状态空间。击败世界冠军李世石。关键创新：MCTS + 策略/价值网络 + 自博弈。

**AlphaGo Zero (2017)。** 从零自博弈，无人类数据。更简洁的算法，更强的结果。关键创新：纯自博弈 + MCTS + 策略迭代。

**AlphaZero (2018)。** 统一算法，围棋、国际象棋、将棋三冠。关键创新：通用 MCTS + 自博弈框架。

**OpenAI Five (2018)。** Dota 2，5v5，部分可观察，长时决策（约 20,000 步/局）。关键创新：大规模 PPO + 自博弈 + LSTM。

**AlphaStar (2019)。** 星际争霸 II，实时策略，多智能体，部分可观察。关键创新：自博弈 + 多智能体联盟 + 教师-学生。

**OpenAI Five (2019)。** 击败 Dota 2 世界冠军队。关键创新：大规模分布式训练。

**AlphaFold 2 (2020)。** 蛋白质结构预测，不是游戏但使用类似技术（注意力 + 迭代精修）。CASP14 冠军。

**Gran Turismo Sophy (2022)。** 赛车游戏，击败世界冠军。关键创新：分布式 PPO + 域随机化。

**AlphaDev (2023)。** 发现更快的排序算法，将排序视为游戏。关键创新：RL 用于算法发现。

## 核心技术

**蒙特卡洛树搜索 (MCTS)。** AlphaGo/Zero 的核心。在当前状态构建搜索树：

1. **选择。** 用 UCB 公式选择最有潜力的节点。
2. **扩展。** 展开选中的节点，添加子节点。
3. **模拟。** 从新节点快速模拟到终止。
4. **回传。** 将结果沿路径回传更新节点值。

MCTS 的强度与模拟次数成正比。AlphaZero 使用 800 次模拟/步。

**自博弈。** 智能体与自己过去版本对弈。关键细节：

- **策略池。** 保存过去版本，随机选择对手。防止循环。
- **虚构自博弈。** 对手策略是所有过去策略的混合。
- **人口训练。** 维护策略种群，每个策略与种群内其他策略对弈（AlphaStar）。

**大规模分布式训练。** 游戏突破背后的工程：

| 系统         | 并行 worker | 训练时间 | 硬件                 |
| ------------ | ----------- | -------- | -------------------- |
| AlphaGo Zero | ~5000 TPU   | 40 天    | 5000 TPU v3          |
| OpenAI Five  | ~128000 CPU | 10 个月  | 256 GPU + 128000 CPU |
| AlphaStar    | ~12000 CPU  | 44 天    | 384 TPU              |
| GT Sophy     | ~1000 PS5   | 10 天    | 2100 GPU             |

**课程学习。** 从简单任务开始，逐步增加难度：

- AlphaStar：从简单 AI 开始，逐步增加对手强度。
- OpenAI Five：从 1v1 开始，逐步到 5v5。
- GT Sophy：从低速开始，逐步增加速度。

## 动手构建

`code/main.py` 实现了一个简化的 MCTS 用于井字棋。

### 步骤 1：MCTS 节点

```python
class MCTSNode:
    def __init__(self, state, parent=None, action=None):
        self.state = state
        self.parent = parent
        self.action = action
        self.children = []
        self.visits = 0
        self.value = 0.0

    def ucb(self, c=1.414):
        if self.visits == 0:
            return float('inf')
        exploit = self.value / self.visits
        explore = c * math.sqrt(math.log(self.parent.visits) / self.visits)
        return exploit + explore
```

### 步骤 2：MCTS 搜索

```python
def mcts_search(root_state, policy_fn, n_simulations=1000):
    root = MCTSNode(root_state)

    for _ in range(n_simulations):
        node = root
        # Selection: traverse tree using UCB
        while node.children and not node.state.is_terminal():
            node = max(node.children, key=lambda c: c.ucb())

        # Expansion: add new child
        if not node.state.is_terminal():
            action = policy_fn(node.state)
            new_state = node.state.step(action)
            child = MCTSNode(new_state, parent=node, action=action)
            node.children.append(child)
            node = child

        # Simulation: random rollout
        result = rollout(node.state)

        # Backpropagation
        while node is not None:
            node.visits += 1
            node.value += result
            node = node.parent

    # Return most visited action
    return max(root.children, key=lambda c: c.visits).action
```

### 步骤 3：AlphaZero 风格 MCTS

```python
def alphazero_search(root_state, policy_value_net, n_simulations=800):
    root = MCTSNode(root_state)

    for _ in range(n_simulations):
        node = root
        # Selection
        while node.children and not node.state.is_terminal():
            node = max(node.children, key=lambda c: c.ucb())

        # Evaluation: use neural network instead of rollout
        if not node.state.is_terminal():
            policy, value = policy_value_net.predict(node.state)
            # Expand all legal actions
            for action in node.state.legal_actions():
                child = MCTSNode(node.state.step(action), parent=node, action=action)
                child.prior = policy[action]
                node.children.append(child)
        else:
            value = node.state.reward()

        # Backpropagation
        while node is not None:
            node.visits += 1
            node.value += value
            value = -value  # flip for opponent
            node = node.parent

    # Return action proportional to visit counts
    visits = {c.action: c.visits for c in root.children}
    total = sum(visits.values())
    probs = {a: v / total for a, v in visits.items()}
    return probs
```

## 常见陷阱

- **MCTS 计算成本。** 每步 800 次模拟 = 800 次神经网络前向传播。实时性差。修复：更小网络，更少模拟，或批处理模拟。
- **自博弈循环。** 策略可能在石头-剪刀-布式循环。修复：策略池，虚构自博弈。
- **奖励稀疏。** 只有胜负奖励导致学习困难。修复：奖励塑造，课程学习。
- **部分可观察性。** 智能体看不到完整状态。修复：LSTM/Transformer 编码历史观察。
- **长时信用分配。** 20,000 步的 Dota 2 对局，早期决策影响后期结果。修复：TD(λ), GAE, 或分层策略。
- **过拟合对手。** 策略只对特定对手有效，泛化差。修复：多样化对手池。

## 实际应用

| 游戏     | 方法         | 关键创新        |
| -------- | ------------ | --------------- |
| Atari    | DQN          | 深度 RL 基础    |
| 围棋     | AlphaGo Zero | MCTS + 自博弈   |
| 国际象棋 | AlphaZero    | 通用框架        |
| Dota 2   | OpenAI Five  | 大规模 PPO      |
| 星际争霸 | AlphaStar    | 多智能体联盟    |
| 赛车     | GT Sophy     | 域随机化        |
| 麻将     | Suphx        | 部分可观察 RL   |
| 排序算法 | AlphaDev     | RL 用于算法发现 |

## 交付物

保存 `outputs/skill-game-ai.md`。技能接收游戏描述 + 计算预算，输出：算法选择、训练方法（自博弈 vs 课程学习）、网络架构和评估协议。

## 练习

1. **简单。** 运行 `code/main.py`，在井字棋上测试 MCTS。增加模拟次数是否提高胜率？
2. **中等。** 实现自博弈训练：用 MCTS 训练策略网络，然后用策略网络指导 MCTS。迭代几轮，观察策略是否改进。
3. **困难。** 将 MCTS 扩展到四子棋（Connect-4）。实现 AlphaZero 风格的 MCTS + 策略-价值网络。训练 1000 轮自博弈，评估策略强度。

## 关键术语

| 术语       | 人们怎么说       | 实际含义                         |
| ---------- | ---------------- | -------------------------------- |
| MCTS       | "蒙特卡洛树搜索" | 在当前状态构建搜索树，评估动作。 |
| 自博弈     | "自己打自己"     | 智能体与过去版本对弈。           |
| UCB        | "置信上界"       | 平衡探索和利用的选择公式。       |
| 策略池     | "对手库"         | 保存过去策略版本，防止循环。     |
| 课程学习   | "从简到难"       | 逐步增加任务难度。               |
| 虚构自博弈 | "平均对手"       | 对手是所有过去策略的混合。       |

## 生产笔记：游戏 AI 的工程规模

游戏 AI 突破的背后是巨大的工程投入：

- **AlphaZero。** 5000 TPU v3，40 天训练，约 $2500 万计算成本。
- **OpenAI Five。** 256 GPU + 128000 CPU，10 个月训练，估计 $5000 万。
- **AlphaStar。** 384 TPU，44 天，约 $1000 万。

这些成本在 2026 年已经大幅降低。等效训练现在可以用更少的硬件完成（算法改进 + 硬件进步）。但大规模 RL 训练仍然是计算密集型的，需要：

- **分布式框架。** Ray, RLlib, Acme, TorchRL。
- **高效通信。** 参数服务器 vs 全归约，梯度压缩。
- **容错。** Worker 故障恢复，检查点保存。

## 延伸阅读

- [Mnih et al. (2015). Human-level control through deep reinforcement learning](https://www.nature.com/articles/nature14236) — DQN/Atari。
- [Silver et al. (2017). Mastering the game of Go without human knowledge](https://www.nature.com/articles/nature24270) — AlphaGo Zero。
- [Silver et al. (2018). A general reinforcement learning algorithm that masters chess, shogi, and Go through self-play](https://www.science.org/doi/10.1126/science.aar6404) — AlphaZero。
- [Vinyals et al. (2019). Grandmaster level in StarCraft II using multi-agent reinforcement learning](https://www.nature.com/articles/s41586-019-1724-z) — AlphaStar。
- [Berner et al. (2019). Dota 2 with Large Scale Deep Reinforcement Learning](https://arxiv.org/abs/1912.06680) — OpenAI Five。
- [Wurman et al. (2022). Outracing champion Gran Turismo drivers with deep reinforcement learning](https://www.nature.com/articles/s41586-021-04357-7) — GT Sophy。
