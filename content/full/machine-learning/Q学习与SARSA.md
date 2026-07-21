---
title: Q学习与SARSA
description: 时序差分学习与无模型控制，Q学习的离轨策略与SARSA的在轨策略
module: 'machine-learning'
difficulty: intermediate
tags:
  - Q学习
  - SARSA
  - 时序差分
  - 离轨
  - 在轨
  - 无模型控制
related:
  - 'machine-learning/ML流水线'
  - 'machine-learning/PPO近端策略优化'
  - 'machine-learning/RL在游戏中的应用'
prerequisites:
  - 'machine-learning/机器学习概述'
---

# Q 学习与 SARSA

> 蒙特卡洛等到 episode 结束才学习。时序差分 (TD) 每步都学习。Q 学习更进一步：它从最优行为学习，即使自己不是最优的。这个"离轨"技巧使 Q 学习成为 2015 年前最流行的 RL 算法——也是理解 DQN 的基础。

**类型:** 构建
**语言:** Python
**前置知识:** Phase 9 · 02 (动态规划), Phase 9 · 03 (蒙特卡洛)
**时间:** ~60 分钟

## 问题

MC 方法需要完整 episodes 才能更新价值估计。两个问题：(1) 长 episodes 意味着学习慢，(2) 某些任务没有终止状态（连续控制）。时序差分 (TD) 方法结合了 MC 的采样思想和 DP 的自举（bootstrapping）思想——用估计更新估计。

## 核心概念

**TD 预测。** 在每一步更新 V 估计：

```
V(s_t) ← V(s_t) + α · [r_{t+1} + γ · V(s_{t+1}) - V(s_t)]
```

TD 目标 `r_{t+1} + γ · V(s_{t+1})` 是对回报的估计（自举）。与 MC 的区别：MC 用实际回报 G_t，TD 用估计的回报。

**TD 误差。**

```
δ_t = r_{t+1} + γ · V(s_{t+1}) - V(s_t)
```

TD 误差衡量当前估计与一步引导估计之间的差异。

**SARSA（在轨 TD 控制）。** 更新 Q 函数：

```
Q(s_t, a_t) ← Q(s_t, a_t) + α · [r_{t+1} + γ · Q(s_{t+1}, a_{t+1}) - Q(s_t, a_t)]
```

名字来自五元组 `(S_t, A_t, R_{t+1}, S_{t+1}, A_{t+1})`。关键：`a_{t+1}` 是由*当前策略*选择的动作。SARSA 是在轨的——它学习和执行的是同一策略。

**Q 学习（离轨 TD 控制）。** 更新 Q 函数：

```
Q(s_t, a_t) ← Q(s_t, a_t) + α · [r_{t+1} + γ · max_{a'} Q(s_{t+1}, a') - Q(s_t, a_t)]
```

关键区别：Q 学习使用 `max_{a'} Q(s_{t+1}, a')` 而不是 `Q(s_{t+1}, a_{t+1})`。它直接学习最优 Q 函数，不管实际执行什么策略。这是离轨的——学习一个策略，执行另一个。

**SARSA vs Q 学习。** 经典例子：悬崖行走。

- 悬崖边缘：高奖励但掉下去 = 大惩罚。
- Q 学习学到最优路径（沿悬崖边缘走），但在执行时因为 ε-贪心探索有时会掉下去。
- SARSA 学到安全路径（远离悬崖），因为它的更新考虑了探索风险。

Q 学习的期望回报更高，但 SARSA 的在线表现更好（更少灾难性失败）。

**期望 SARSA。** 折中方案：

```
Q(s_t, a_t) ← Q(s_t, a_t) + α · [r_{t+1} + γ · Σ_{a'} π(a'|s_{t+1}) · Q(s_{t+1}, a') - Q(s_t, a_t)]
```

不采样 `a_{t+1}`，而是用策略的期望。比 SARSA 方差更低，比 Q 学习更安全。

## 动手构建

`code/main.py` 在悬崖行走环境上实现了 SARSA 和 Q 学习。

### 步骤 1：SARSA 更新

```python
def sarsa_update(Q, s, a, r, s_next, a_next, alpha, gamma):
    td_target = r + gamma * Q[s_next, a_next]
    td_error = td_target - Q[s, a]
    Q[s, a] += alpha * td_error
```

### 步骤 2：Q 学习更新

```python
def q_learning_update(Q, s, a, r, s_next, alpha, gamma):
    td_target = r + gamma * max(Q[s_next, a] for a in actions)
    td_error = td_target - Q[s, a]
    Q[s, a] += alpha * td_error
```

### 步骤 3：SARSA Episode

```python
def sarsa_episode(env, Q, alpha, gamma, epsilon):
    s = env.reset()
    a = epsilon_greedy(Q, s, epsilon)
    total_reward = 0
    while True:
        s_next, r, done = env.step(a)
        a_next = epsilon_greedy(Q, s_next, epsilon)
        sarsa_update(Q, s, a, r, s_next, a_next, alpha, gamma)
        s, a = s_next, a_next
        total_reward += r
        if done:
            break
    return total_reward
```

### 步骤 4：Q 学习 Episode

```python
def q_learning_episode(env, Q, alpha, gamma, epsilon):
    s = env.reset()
    total_reward = 0
    while True:
        a = epsilon_greedy(Q, s, epsilon)
        s_next, r, done = env.step(a)
        q_learning_update(Q, s, a, r, s_next, alpha, gamma)
        s = s_next
        total_reward += r
        if done:
            break
    return total_reward
```

## 常见陷阱

- **学习率 α 太大。** Q 值震荡不收敛。修复：α 衰减或使用自适应学习率。
- **学习率 α 太小。** 学习太慢。修复：从 α=0.1 开始，根据收敛调整。
- **ε 不衰减。** 固定 ε=0.1 意味着策略永远有 10% 随机性。修复：ε 衰减到 0.01。
- **Q 学习的"最大化偏差"。** Q 学习的 max 操作导致正偏差（过高估计 Q 值）。修复：双 Q 学习（两个 Q 表，交叉更新）。
- **SARSA 的保守性。** SARSA 在高风险环境中更安全，但在低风险环境中可能过于保守。
- **表格方法的限制。** Q 表只能处理离散状态和动作。连续空间需要函数近似（DQN，第 05 课）。

## 实际应用

| 场景                    | 推荐方法            |
| ----------------------- | ------------------- |
| 离散状态/动作，安全重要 | SARSA               |
| 离散状态/动作，性能重要 | Q 学习              |
| 离散状态/动作，方差问题 | 期望 SARSA          |
| 连续状态，离散动作      | DQN (第 05 课)      |
| 连续状态/动作           | 策略梯度 (第 06 课) |

## 交付物

保存 `outputs/skill-td-controller.md`。技能接收环境描述 + 安全/性能权衡，输出：算法选择（SARSA/Q 学习/期望 SARSA）、超参数（α, γ, ε）和衰减调度。

## 练习

1. **简单。** 运行 `code/main.py`，在悬崖行走上比较 SARSA 和 Q 学习的学习曲线。Q 学习是否学到更优但更危险的路径？
2. **中等。** 实现双 Q 学习：维护两个 Q 表 Q1 和 Q2，每次随机选一个更新，用另一个选动作。比较与标准 Q 学习的偏差。
3. **困难。** 实现期望 SARSA，在 ε=0.1 和 ε=0.5 下比较与 SARSA 和 Q 学习的表现。哪个 ε 下期望 SARSA 最接近 Q 学习？

## 关键术语

| 术语       | 人们怎么说 | 实际含义                       |
| ---------- | ---------- | ------------------------------ |
| TD 学习    | "自举学习" | 用估计更新估计，每步学习。     |
| SARSA      | "在轨 TD"  | 用当前策略的下一个动作更新。   |
| Q 学习     | "离轨 TD"  | 用最优动作更新，不管实际策略。 |
| 在轨       | "学做一致" | 学习的策略 = 执行的策略。      |
| 离轨       | "学做分离" | 学习的策略 ≠ 执行的策略。      |
| TD 误差 δ  | "预测误差" | 当前估计与一步引导估计的差异。 |
| 最大化偏差 | "过高估计" | max 操作导致 Q 值正偏差。      |

## 生产笔记：Q 学习的遗产

Q 学习 (Watkins, 1989) 是深度 RL 时代之前最成功的 RL 算法。它的核心思想——离轨学习最优 Q 函数——直接延续到 DQN (Mnih et al., 2015)，后者开启了深度 RL 革命。

2026 年 Q 学习的直接后裔仍在使用：

- **DQN。** Q 学习 + 神经网络 + 经验回放 + 目标网络。
- **双 DQN。** 解决最大化偏差。
- **分布式 Q 学习 (C51, QR-DQN)。** 学习回报分布而非期望。
- **Rainbow。** DQN 的所有改进组合。

Q 学习的离轨特性使它特别适合从固定数据集学习（离线 RL），这是 2024-2026 年的热门方向。

## 延伸阅读

- [Sutton & Barto (2018). Reinforcement Learning: An Introduction](http://incompleteideas.net/book/the-book.html) — 第 6 章。
- [Watkins & Dayan (1992). Q-learning](https://link.springer.com/article/10.1007/BF00992698) — Q 学习论文。
- [van Hasselt (2010). Double Q-learning](https://papers.nips.cc/paper/3964-double-q-learning) — 双 Q 学习。
- [van Seijen et al. (2009). A theoretical and empirical analysis of Expected Sarsa](https://ieeexplore.ieee.org/document/4927358) — 期望 SARSA。
