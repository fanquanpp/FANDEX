---
title: 策略梯度与REINFORCE
description: 直接优化策略的梯度方法，REINFORCE算法与基线方差缩减
module: 'machine-learning'
difficulty: advanced
tags:
  - 策略梯度
  - REINFORCE
  - 策略优化
  - 基线
  - 方差缩减
related:
  - 'machine-learning/Scikit-learn实战'
  - 'machine-learning/不平衡数据处理'
  - 'machine-learning/超参数调优'
  - 'machine-learning/动态规划'
prerequisites:
  - 'machine-learning/机器学习概述'
---

# 策略梯度与 REINFORCE

> DQN 学习动作价值函数然后选择最优动作。策略梯度跳过中间步骤——直接参数化策略 `π_θ(a|s)` 并优化它。更简单，更通用（处理连续动作），但方差更高。REINFORCE 是最简单的策略梯度算法，也是理解 PPO 的基础。

**类型:** 构建
**语言:** Python
**前置知识:** Phase 9 · 04 (Q 学习), Phase 3 · 02 (反向传播)
**时间:** ~75 分钟

## 问题

基于价值的方法（Q 学习, DQN）有三个限制：

1. **连续动作空间。** Q 学习需要 `max_{a} Q(s, a)`，在连续动作空间上不可行（无限个动作）。
2. **随机策略。** Q 学习的贪心策略是确定性的。某些问题需要随机策略（石头剪刀布，部分可观察环境）。
3. **策略表示。** Q 学习的策略隐含在 Q 函数中，不能直接表示复杂策略。

策略梯度方法直接参数化策略 `π_θ(a|s)` 并找到使期望回报最大化的参数 θ。

## 核心概念

**策略梯度定理。** 目标函数 `J(θ) = E_{τ~π_θ}[Σ γ^t r_t]` 对 θ 的梯度：

```
∇_θ J(θ) = E_{τ~π_θ}[ Σ_t ∇_θ log π_θ(a_t|s_t) · G_t ]
```

直觉：增加高回报动作的概率，减少低回报动作的概率。`log π_θ(a_t|s_t)` 是策略的对数概率，`G_t` 是回报（权重）。

**REINFORCE 算法。** Williams (1992)。策略梯度的蒙特卡洛估计：

1. 用当前策略生成完整 episode
2. 计算每个时间步的回报 G_t
3. 更新参数：`θ ← θ + α · Σ_t ∇_θ log π_θ(a_t|s_t) · G_t`

```python
def reinforce_update(episode, policy, optimizer, gamma):
    returns = compute_returns(episode, gamma)
    loss = 0
    for (s, a, r), G in zip(episode, returns):
        log_prob = policy.log_prob(s, a)
        loss -= log_prob * G  # gradient ascent = negative loss
    optimizer.step(loss)
```

**基线方差缩减。** REINFORCE 的高方差问题：回报 G_t 的方差可能很大。解决方案：减去一个基线 b(s)：

```
∇_θ J(θ) = E[ Σ_t ∇_θ log π_θ(a_t|s_t) · (G_t - b(s_t)) ]
```

基线不改变梯度的期望（只要 b 不依赖 a），但减少方差。最优基线是 `b(s) = V^π(s)`（价值函数）。

**优势函数。** `A^π(s, a) = Q^π(s, a) - V^π(s)`。测量动作 a 比平均好多少。策略梯度用优势代替回报：

```
∇_θ J(θ) = E[ Σ_t ∇_θ log π_θ(a_t|s_t) · A^π(s_t, a_t) ]
```

## 动手构建

`code/main.py` 在 CartPole 环境上实现了 REINFORCE。

### 步骤 1：策略网络

```python
class PolicyNetwork:
    def __init__(self, state_dim, n_actions, hidden_dim=64):
        self.W1 = np.random.randn(state_dim, hidden_dim) * 0.01
        self.b1 = np.zeros(hidden_dim)
        self.W2 = np.random.randn(hidden_dim, n_actions) * 0.01
        self.b2 = np.zeros(n_actions)

    def forward(self, x):
        h = np.maximum(0, x @ self.W1 + self.b1)
        logits = h @ self.W2 + self.b2
        probs = softmax(logits)
        return probs

    def log_prob(self, x, a):
        probs = self.forward(x)
        return np.log(probs[a] + 1e-8)
```

### 步骤 2：计算回报

```python
def compute_returns(rewards, gamma):
    returns = []
    G = 0
    for r in reversed(rewards):
        G = r + gamma * G
        returns.insert(0, G)
    return returns
```

### 步骤 3：REINFORCE 更新

```python
def reinforce_update(policy, episode, gamma, lr):
    states, actions, rewards = zip(*episode)
    returns = compute_returns(rewards, gamma)

    # Normalize returns (reduces variance)
    returns = (returns - np.mean(returns)) / (np.std(returns) + 1e-8)

    for s, a, G in zip(states, actions, returns):
        log_p = policy.log_prob(s, a)
        # Gradient ascent: θ += α * ∇log π(a|s) * G
        gradient = compute_gradient(policy, s, a)
        update_params(policy, gradient, lr * G)
```

### 步骤 4：带基线的 REINFORCE

```python
def reinforce_with_baseline(policy, value_fn, episode, gamma, lr_policy, lr_value):
    states, actions, rewards = zip(*episode)
    returns = compute_returns(rewards, gamma)

    for s, a, G in zip(states, actions, returns):
        # Advantage = return - baseline
        baseline = value_fn.predict(s)
        advantage = G - baseline

        # Policy update
        log_p = policy.log_prob(s, a)
        gradient = compute_gradient(policy, s, a)
        update_params(policy, gradient, lr_policy * advantage)

        # Value function update
        value_fn.update(s, G, lr_value)
```

## 常见陷阱

- **高方差。** REINFORCE 的方差与 episode 长度成正比。修复：基线（价值函数），回报归一化。
- **样本效率低。** 每个 episode 只产生一次梯度更新。修复：并行环境，或使用 actor-critic（第 07 课）。
- **学习率敏感。** 太大 = 策略崩溃，太小 = 学习慢。修复：从 1e-3 开始，使用 Adam。
- **策略崩溃。** 策略变得确定性（某个动作概率接近 1），停止探索。修复：熵正则化（惩罚低熵策略）。
- **回报归一化过度。** 归一化整个 batch 的回报可能消除有用的信号。修复：运行均值/标准差归一化。
- **没有梯度裁剪。** 策略梯度可能很大。修复：裁剪梯度范数。

## 实际应用

| 场景               | 策略梯度适用性            |
| ------------------ | ------------------------- |
| 连续动作空间       | 非常适合                  |
| 随机策略需求       | 非常适合                  |
| 离散动作，简单环境 | 可以但 DQN 更高效         |
| 大规模问题         | 需要改进（PPO, 第 08 课） |
| 多智能体           | 基础，需要扩展            |

## 交付物

保存 `outputs/skill-policy-gradient.md`。技能接收环境描述 + 动作空间类型，输出：是否使用策略梯度 vs 基于价值、基线选择、学习率调度和方差缩减策略。

## 练习

1. **简单。** 运行 `code/main.py`，比较有和没有回报归一化的 REINFORCE 学习曲线。归一化是否减少方差？
2. **中等。** 实现带价值函数基线的 REINFORCE。比较与无基线版本的方差和收敛速度。
3. **困难。** 实现熵正则化：在损失中添加 `β · Σ_a π(a|s) log π(a|s)` 项（熵的负数）。比较不同 β 值的探索行为。

## 关键术语

| 术语        | 人们怎么说         | 实际含义                                       |
| ----------- | ------------------ | ---------------------------------------------- |
| 策略梯度    | "直接优化策略"     | 直接参数化并优化策略函数。                     |
| REINFORCE   | "蒙特卡洛策略梯度" | 用完整 episode 的回报估计策略梯度。            |
| 基线 b(s)   | "方差缩减"         | 从回报中减去的函数，减少方差不改变期望。       |
| 优势 A(s,a) | "比平均好多少"     | `Q(s,a) - V(s)`，动作相对于平均的好坏。        |
| 对数概率    | "log π"            | 策略梯度的核心：`∇ log π` 指向增加概率的方向。 |
| 熵正则化    | "保持探索"         | 惩罚低熵策略，防止过早收敛到确定性策略。       |

## 生产笔记：策略梯度的样本效率问题

REINFORCE 的最大生产问题是样本效率。每个 episode 产生一次梯度更新，而 DQN 的经验回放允许每个转移被多次使用。实际后果：

- **REINFORCE：** 1M 步环境交互 → 1M 步梯度信息（如果用整个 episode）。
- **DQN：** 1M 步环境交互 → 可回放 10M+ 步梯度信息。

这就是为什么生产系统几乎从不使用纯 REINFORCE。它们使用：

1. **Actor-Critic (A2C/A3C)。** 用学习到的价值函数替代蒙特卡洛回报，减少方差，允许单步更新。
2. **PPO。** 限制策略更新幅度，允许多次 epoch 重用数据。
3. **经验回放 + 策略梯度。** SAC, TD3 结合两种方法的优势。

## 延伸阅读

- [Sutton & Barto (2018). Reinforcement Learning: An Introduction](http://incompleteideas.net/book/the-book.html) — 第 13 章。
- [Williams (1992). Simple statistical gradient-following algorithms for connectionist reinforcement learning](https://link.springer.com/article/10.1007/BF00992696) — REINFORCE。
- [Sutton et al. (2000). Policy Gradient Methods for Reinforcement Learning with Function Approximation](https://papers.nips.cc/paper/1713-policy-gradient-methods-for-reinforcement-learning-with-function-approximation) — 策略梯度定理。
- [Greensmith, Bartlett, Baxter (2004). Variance Reduction Techniques for Gradient Estimates in Reinforcement Learning](https://jmlr.org/papers/v5/greensmith04a.html) — 方差缩减。
