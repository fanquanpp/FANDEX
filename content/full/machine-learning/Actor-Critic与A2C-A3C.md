---
title: 'Actor-Critic与A2C/A3C'
description: '结合策略梯度与价值函数的Actor-Critic架构，A2C与A3C的同步与异步训练'
module: 'machine-learning'
difficulty: advanced
tags:
  - 'Actor-Critic'
  - A2C
  - A3C
  - 优势函数
  - 异步训练
related:
  - 'machine-learning/异常检测'
  - 'machine-learning/支持向量机'
  - 'machine-learning/DQN深度Q网络'
  - 'machine-learning/KNN与距离度量'
prerequisites:
  - 'machine-learning/机器学习概述'
---

# Actor-Critic 与 A2C/A3C

> REINFORCE 用完整回报 G_t 作为策略梯度的权重——高方差，慢学习。Actor-Critic 用学习到的价值函数 V(s) 替代 G_t 作为基线，用 TD 误差替代回报。方差降低 10 倍，学习快 10 倍。A2C 并行化，A3C 异步并行化。这是 PPO 的直接前身。

**类型:** 构建
**语言:** Python
**前置知识:** Phase 9 · 05 (DQN), Phase 9 · 06 (策略梯度)
**时间:** ~75 分钟

## 问题

REINFORCE 的两个问题：(1) 高方差——回报 G_t 的方差随 episode 长度指数增长，(2) 必须等 episode 结束才能更新——不能在线学习。

Actor-Critic 方法解决两个问题：

1. **Critic 降低方差。** 用学习到的 V(s) 作为基线，优势 `A(s,a) = G_t - V(s_t)` 或 TD 误差 `δ_t = r + γV(s_{t+1}) - V(s_t)` 替代原始回报。
2. **TD 学习允许在线更新。** 不需要完整 episode，每步都可以更新。

## 核心概念

**Actor。** 策略网络 `π_θ(a|s)`，输出动作概率。目标是最大化期望回报。

**Critic。** 价值网络 `V_φ(s)`，输出状态价值估计。目标是最小化 TD 误差。

**优势估计。** 三种方式：

1. **蒙特卡洛优势。** `A(s_t, a_t) = G_t - V(s_t)`。低偏差，高方差。
2. **TD(0) 优势。** `A(s_t, a_t) = r_{t+1} + γV(s_{t+1}) - V(s_t)`。高偏差，低方差。
3. **GAE (广义优势估计)。** Schulman (2016)。在偏差和方差之间插值：

```
δ_t = r_{t+1} + γV(s_{t+1}) - V(s_t)
A^{GAE(λ)}_t = Σ_{l=0}^{∞} (γλ)^l · δ_{t+l}
```

λ=0 → TD(0) 优势（高偏差，低方差）。λ=1 → 蒙特卡洛优势（低偏差，高方差）。标准选择：λ=0.95。

**Actor 损失。**

```
L_actor = -E[log π_θ(a|s) · A(s, a)]
```

**Critic 损失。**

```
L_critic = E[(V_φ(s) - V_target)²]
```

**总损失。**

```
L = L_actor + c_1 · L_critic - c_2 · H(π_θ)
```

其中 `H(π_θ)` 是策略熵（鼓励探索），`c_1 ≈ 0.5`，`c_2 ≈ 0.01`。

**A2C (Advantage Actor-Critic)。** 同步并行：N 个 worker 同时收集经验，汇总梯度，同步更新。简单，稳定，与 A3C 性能相当。

**A3C (Asynchronous Advantage Actor-Critic)。** Mnih et al. (2016)。N 个 worker 异步收集经验和更新全局网络。不需要经验回放（多样性来自多个 worker）。2016 年的突破，但 A2C 在实践中更简单且同样有效。

**A2C vs A3C。**

| 方面       | A2C                     | A3C              |
| ---------- | ----------------------- | ---------------- |
| 更新方式   | 同步（等待所有 worker） | 异步（随时更新） |
| GPU 利用率 | 更高（更大批次）        | 更低（小批次）   |
| 实现复杂度 | 更简单                  | 更复杂           |
| 性能       | ≈ A3C                   | ≈ A2C            |
| 推荐       | 2026 年标准             | 历史意义         |

## 动手构建

`code/main.py` 在 CartPole 上实现了 A2C。

### 步骤 1：Actor-Critic 网络

```python
class ActorCritic:
    def __init__(self, state_dim, n_actions, hidden_dim=64):
        # Shared backbone
        self.W1 = np.random.randn(state_dim, hidden_dim) * 0.01
        self.b1 = np.zeros(hidden_dim)
        # Actor head
        self.W_actor = np.random.randn(hidden_dim, n_actions) * 0.01
        self.b_actor = np.zeros(n_actions)
        # Critic head
        self.W_critic = np.random.randn(hidden_dim, 1) * 0.01
        self.b_critic = np.zeros(1)

    def forward(self, x):
        h = np.maximum(0, x @ self.W1 + self.b1)
        logits = h @ self.W_actor + self.b_actor
        probs = softmax(logits)
        value = h @ self.W_critic + self.b_critic
        return probs, value
```

### 步骤 2：优势计算 (GAE)

```python
def compute_gae(rewards, values, gamma, lam):
    advantages = []
    gae = 0
    for t in reversed(range(len(rewards))):
        if t == len(rewards) - 1:
            next_value = 0
        else:
            next_value = values[t + 1]
        delta = rewards[t] + gamma * next_value - values[t]
        gae = delta + gamma * lam * gae
        advantages.insert(0, gae)
    return advantages
```

### 步骤 3：A2C 更新

```python
def a2c_update(model, trajectories, gamma, lam, lr, c1=0.5, c2=0.01):
    for states, actions, rewards in trajectories:
        probs, values = model.forward_batch(states)
        advantages = compute_gae(rewards, values, gamma, lam)
        returns = [a + v for a, v in zip(advantages, values)]

        # Actor loss
        actor_loss = 0
        for s, a, adv in zip(states, actions, advantages):
            log_p = np.log(probs[s][a] + 1e-8)
            actor_loss -= log_p * adv

        # Critic loss
        critic_loss = sum((v - r) ** 2 for v, r in zip(values, returns))

        # Entropy bonus
        entropy = -sum(p * np.log(p + 1e-8) for p in probs)

        # Total loss
        loss = actor_loss + c1 * critic_loss - c2 * entropy
        update_params(model, loss, lr)
```

### 步骤 4：并行收集

```python
def collect_trajectories(envs, model, n_steps):
    trajectories = [[] for _ in envs]
    for _ in range(n_steps):
        for i, env in enumerate(envs):
            s = env.current_state
            probs, _ = model.forward(s)
            a = sample_from(probs)
            s_next, r, done = env.step(a)
            trajectories[i].append((s, a, r))
            if done:
                env.reset()
    return trajectories
```

## 常见陷阱

- **共享网络不稳定。** Actor 和 Critic 共享底层可能导致冲突梯度。修复：使用单独网络，或降低 Critic 损失权重。
- **GAE λ 太大。** λ=1 接近蒙特卡洛，高方差。修复：λ=0.95 是标准。
- **熵系数太小。** 策略过早变确定性。修复：c2=0.01 是起点，可能需要更大。
- **Critic 欠拟合。** 价值函数不够准确，优势估计有偏。修复：更多 Critic 更新步数，更大网络。
- **Critic 过拟合。** 价值函数记忆训练数据，泛化差。修复：正则化，或限制 Critic 更新步数。
- **N 步收集太长。** 长轨迹增加方差和计算。修复：N=5-128 是标准范围。

## 实际应用

| 场景           | 推荐方法       |
| -------------- | -------------- |
| 简单连续控制   | A2C            |
| 复杂连续控制   | PPO / SAC      |
| 大规模并行训练 | A2C (GPU)      |
| 单机训练       | A2C            |
| 需要稳定训练   | PPO (第 08 课) |

## 交付物

保存 `outputs/skill-actor-critic.md`。技能接收环境描述 + 计算资源，输出：网络架构（共享 vs 分离）、GAE λ、worker 数量和训练超参数。

## 练习

1. **简单。** 运行 `code/main.py`，比较 REINFORCE 和 A2C 的学习曲线。A2C 是否更快收敛？
2. **中等。** 测试不同 GAE λ 值 (0, 0.5, 0.95, 1.0)。哪个 λ 给出最佳偏差-方差权衡？
3. **困难。** 实现异步 A3C：多个 worker 独立收集经验并异步更新全局网络。比较与同步 A2C 的样本效率。

## 关键术语

| 术语        | 人们怎么说          | 实际含义                                    |
| ----------- | ------------------- | ------------------------------------------- |
| Actor       | "策略网络"          | 输出动作概率的网络。                        |
| Critic      | "价值网络"          | 输出状态价值估计的网络。                    |
| 优势 A(s,a) | "比平均好多少"      | Q(s,a) - V(s)，策略梯度的权重。             |
| GAE         | "广义优势估计"      | 在 TD 和 MC 优势之间插值，λ 控制偏差-方差。 |
| A2C         | "同步 Actor-Critic" | 多 worker 同步收集，同步更新。              |
| A3C         | "异步 Actor-Critic" | 多 worker 异步收集和更新。                  |
| 熵正则化    | "保持探索"          | 在损失中添加策略熵，防止过早确定性。        |

## 生产笔记：Actor-Critic 是 2026 年 RL 的默认架构

几乎所有 2026 年的生产 RL 系统都使用 Actor-Critic 变体：

- **PPO。** Actor-Critic + 裁剪目标。ChatGPT 的 RLHF 训练使用 PPO。
- **SAC。** Actor-Critic + 熵正则化 + 双 Q 网络。连续控制的标准。
- **TD3。** Actor-Critic + 双 Q + 延迟更新。确定性策略的 SAC 替代。
- **IMPALA。** 分布式 Actor-Critic。DeepMind 的大规模 RL 框架。

Actor-Critic 的核心优势是 Critic 降低方差，使训练稳定到足以在生产中工作。纯策略梯度 (REINFORCE) 太不稳定，纯价值方法 (DQN) 不能处理连续动作。Actor-Critic 兼得两者之长。

## 延伸阅读

- [Sutton & Barto (2018). Reinforcement Learning: An Introduction](http://incompleteideas.net/book/the-book.html) — 第 13 章。
- [Mnih et al. (2016). Asynchronous Methods for Deep Reinforcement Learning](https://arxiv.org/abs/1602.01783) — A3C。
- [Schulman et al. (2016). High-Dimensional Continuous Control Using Generalized Advantage Estimation](https://arxiv.org/abs/1506.02438) — GAE。
- [Babaeizadeh et al. (2017). Reinforcement Learning through Asynchronous Advantage Actor-Critic on a GPU](https://arxiv.org/abs/1611.06256) — GA3C, GPU 上的 A3C。
- [Espeholt et al. (2018). IMPALA: Scalable Distributed Deep-RL with Importance Weighted Actor-Learner Architectures](https://arxiv.org/abs/1802.01561) — IMPALA。
