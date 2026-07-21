---
title: 蒙特卡洛方法
description: 从经验轨迹中估计价值函数，无需环境模型的蒙特卡洛预测与控制
module: 'machine-learning'
difficulty: intermediate
tags:
  - 蒙特卡洛
  - 无模型
  - 经验轨迹
  - 首次访问
  - 探索
related:
  - 'machine-learning/决策树与随机森林'
  - 'machine-learning/逻辑回归与分类'
  - 'machine-learning/模型评估'
  - 'machine-learning/偏差方差与学习曲线'
prerequisites:
  - 'machine-learning/机器学习概述'
---

# 蒙特卡洛方法

> 动态规划需要知道转移函数 P 和奖励函数 R。蒙特卡洛方法不需要。只需运行 episodes，观察回报，取平均。这是最简单的无模型 RL 方法——也是理解所有后续方法的基础。

**类型:** 构建
**语言:** Python
**前置知识:** Phase 9 · 01 (MDP), Phase 9 · 02 (动态规划)
**时间:** ~60 分钟

## 问题

动态规划假设你知道环境的完整模型 `(P, R)`。在大多数实际问题中，你不知道。你知道的是你可以与环境交互：采取动作，观察下一状态和奖励。蒙特卡洛 (MC) 方法直接从这些交互经验中学习。

MC 方法的核心思想：价值函数 = 从该状态开始的回报的期望值。要估计期望值，采样多个回报，取平均。大数定律保证收敛。

## 核心概念

**Episode。** 从初始状态到终止状态的完整轨迹：`s_0, a_0, r_1, s_1, a_1, r_2, ..., s_T`。MC 方法需要 episodes（有限长度），不适用于连续任务（无终止状态）。

**回报 G_t。** 从时间步 t 开始的累积折扣奖励：

```
G_t = r_{t+1} + γ · r_{t+2} + γ² · r_{t+3} + ... + γ^{T-t-1} · r_T
```

**MC 预测。** 估计 V^π(s)：从状态 s 开始的所有回报的平均值。两种变体：

- **首次访问 MC。** 只使用每个 episode 中第一次访问状态 s 的回报。
- **每次访问 MC。** 使用每次访问状态 s 的回报。

两者都收敛到 V^π(s)。首次访问更常用（更简单，方差略低）。

**MC 控制。** 找到最优策略。与 DP 类似的策略迭代框架，但用 MC 估计代替精确计算：

1. 策略评估：用 MC 估计 Q^π(s, a)
2. 策略改进：贪心选择 Q 值最大的动作

**探索问题。** 贪心策略可能永远不访问某些 (s, a) 对，导致 Q 估计不完整。两种解决方案：

- **探索性出发。** 确保每个 episode 从随机 (s, a) 开始。实践中不可行（你不能控制初始状态）。
- **ε-贪心。** 以概率 ε 随机选择动作，以概率 1-ε 选择贪心动作。确保所有动作被无限次尝试。

**ε-贪心策略改进定理。** ε-贪心策略 π_ε 满足：

```
V^{π_ε}(s) ≥ V^π(s)  对所有 s
```

即 ε-贪心改进保证不比原策略差。

## 动手构建

`code/main.py` 在 Blackjack 环境上实现了 MC 预测和控制。

### 步骤 1：生成 Episode

```python
def generate_episode(env, policy):
    episode = []
    state = env.reset()
    while True:
        action = policy(state)
        next_state, reward, done = env.step(action)
        episode.append((state, action, reward))
        if done:
            break
        state = next_state
    return episode
```

### 步骤 2：首次访问 MC 预测

```python
def mc_prediction(env, policy, n_episodes, gamma=1.0):
    returns = {s: [] for s in states}
    V = {s: 0.0 for s in states}
    for _ in range(n_episodes):
        episode = generate_episode(env, policy)
        G = 0
        visited = set()
        for t in reversed(range(len(episode))):
            s, a, r = episode[t]
            G = gamma * G + r
            if s not in visited:
                returns[s].append(G)
                V[s] = sum(returns[s]) / len(returns[s])
                visited.add(s)
    return V
```

### 步骤 3：ε-贪心 MC 控制

```python
def mc_control(env, n_episodes, gamma=1.0, epsilon=0.1):
    Q = {(s, a): 0.0 for s in states for a in actions}
    returns = {(s, a): [] for s in states for a in actions}
    for _ in range(n_episodes):
        policy = make_epsilon_greedy(Q, epsilon)
        episode = generate_episode(env, policy)
        G = 0
        visited = set()
        for t in reversed(range(len(episode))):
            s, a, r = episode[t]
            G = gamma * G + r
            if (s, a) not in visited:
                returns[(s, a)].append(G)
                Q[(s, a)] = sum(returns[(s, a)]) / len(returns[(s, a)])
                visited.add((s, a))
    return Q
```

### 步骤 4：增量更新（更高效）

```python
def mc_control_incremental(env, n_episodes, gamma=1.0, epsilon=0.1):
    Q = {(s, a): 0.0 for s in states for a in actions}
    N = {(s, a): 0 for s in states for a in actions}
    for _ in range(n_episodes):
        policy = make_epsilon_greedy(Q, epsilon)
        episode = generate_episode(env, policy)
        G = 0
        visited = set()
        for t in reversed(range(len(episode))):
            s, a, r = episode[t]
            G = gamma * G + r
            if (s, a) not in visited:
                N[(s, a)] += 1
                Q[(s, a)] += (G - Q[(s, a)]) / N[(s, a)]
                visited.add((s, a))
    return Q
```

## 常见陷阱

- **高方差。** MC 估计的方差与 episode 长度成正比（回报是多个随机变量的乘积）。长 episodes = 高方差。修复：更多 episodes，或使用 TD 方法（下一课）。
- **需要完整 episodes。** MC 不能在 episode 结束前更新。对于长 episodes，学习慢。修复：TD 方法。
- **探索不足。** ε 太小 = 某些 (s, a) 很少被访问，Q 估计不准。ε 太大 = 策略太随机。修复：ε 衰减（从 1.0 开始，逐渐减小到 0.01）。
- **非平稳问题。** 如果环境随时间变化，MC 的平均估计适应慢。修复：使用运行平均或固定窗口。
- **离轨评估。** 用行为策略收集数据但评估目标策略需要重要性采样比，方差极高。

## 实际应用

| 场景                      | MC 适用性         |
| ------------------------- | ----------------- |
| 棋类游戏（完整 episodes） | 适合              |
| Blackjack                 | 经典应用          |
| 连续控制（无终止）        | 不适合（用 TD）   |
| 策略评估（已知 episodes） | 适合              |
| 高方差环境                | 需要大量 episodes |

## 交付物

保存 `outputs/skill-mc-learner.md`。技能接收环境描述 + episode 特征，输出：MC 变体选择（首次/每次访问）、ε 调度、episodes 数量估计和预期方差。

## 练习

1. **简单。** 运行 `code/main.py`，比较首次访问和每次访问 MC 预测的收敛速度和方差。
2. **中等。** 实现 ε 衰减：从 ε=1.0 开始，每 1000 episodes 减半。比较与固定 ε=0.1 的最终策略质量。
3. **困难。** 实现离轨 MC 控制：用随机策略收集 episodes，用重要性采样评估贪心策略。比较高方差问题。

## 关键术语

| 术语        | 人们怎么说   | 实际含义                            |
| ----------- | ------------ | ----------------------------------- |
| Episode     | "一局游戏"   | 从初始到终止的完整轨迹。            |
| 回报 G      | "总奖励"     | 从某时间步开始的累积折扣奖励。      |
| 首次访问 MC | "只看第一次" | 每个 episode 只用第一次访问的回报。 |
| ε-贪心      | "偶尔随机"   | 以 ε 概率随机探索，1-ε 概率贪心。   |
| 探索性出发  | "随机开始"   | 每个 episode 从随机状态-动作开始。  |
| 重要性采样  | "离轨修正"   | 用行为策略数据评估目标策略。        |

## 生产笔记：MC 方法在 AlphaGo 中的角色

AlphaGo/Zero 的核心是蒙特卡洛树搜索 (MCTS)——一种 MC 方法。MCTS 不是从完整 episodes 学习，而是在当前状态构建搜索树，用 MC 模拟评估每个动作。关键洞察：MC 模拟的方差可以通过神经网络（价值网络）降低，而不是通过更多模拟。

生产中的 MCTS：

- **AlphaZero。** 每步 800 次模拟，约 0.4 秒。
- **MuZero。** 学习模型而非使用已知规则，MCTS 在学习的模型上运行。
- **LLM 推理。** 2024-2026 年的趋势是用 MCTS 增强 LLM 推理（Tree of Thought, Reasoning via Planning）。

## 延伸阅读

- [Sutton & Barto (2018). Reinforcement Learning: An Introduction](http://incompleteideas.net/book/the-book.html) — 第 5 章。
- [Silver et al. (2016). Mastering the game of Go with deep neural networks and tree search](https://www.nature.com/articles/nature16961) — AlphaGo。
- [Browne et al. (2012). A Survey of Monte Carlo Tree Search Methods](https://ieeexplore.ieee.org/document/6145622) — MCTS 综述。
