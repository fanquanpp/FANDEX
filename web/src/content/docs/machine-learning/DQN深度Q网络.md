---
title: DQN深度Q网络
description: Q学习与深度神经网络的结合，经验回放与目标网络的核心机制
module: 'machine-learning'
difficulty: advanced
tags:
  - DQN
  - 深度Q网络
  - 经验回放
  - 目标网络
  - 深度强化学习
related:
  - 'machine-learning/支持向量机'
  - 'machine-learning/Actor-Critic与A2C-A3C'
  - 'machine-learning/KNN与距离度量'
  - 'machine-learning/MDP状态动作与奖励'
prerequisites:
  - 'machine-learning/机器学习概述'
---

# DQN 深度 Q 网络

> 表格 Q 学习在 10 个状态上工作。Atari 有 10^160 个状态。Mnih et al. (2015) 用一个 CNN 替换 Q 表，加上两个技巧——经验回放和目标网络——在 49 个 Atari 游戏上达到人类水平。深度 RL 就此开始。

**类型:** 构建
**语言:** Python
**前置知识:** Phase 9 · 04 (Q 学习), Phase 3 · 07 (CNN)
**时间:** ~75 分钟

## 问题

表格 Q 学习为每个 (状态, 动作) 对维护一个 Q 值。当状态空间很大（Atari 像素）或连续（机器人关节角度）时，Q 表不可行。解决方案：用函数近似器（神经网络）表示 Q 函数。

但直接将 Q 学习与神经网络结合会失败。三个原因：

1. **相关样本。** Q 学习的每步更新使用连续的 (s, a, r, s') 转移。连续转移高度相关，违反 SGD 的独立同分布假设。
2. **移动目标。** Q 学习的 TD 目标 `r + γ · max Q(s', a')` 依赖 Q 网络本身。更新 Q 网络改变目标，导致不稳定。
3. **灾难性遗忘。** 新经验覆盖旧经验。网络"忘记"早期学到的策略。

DQN 用三个技巧解决这些问题。

## 核心概念

**深度 Q 网络。** 一个 CNN（或 MLP）接收状态（Atari 帧堆叠），输出每个动作的 Q 值。`Q_θ(s, a)` = 网络在动作 a 输出端的值。

**经验回放。** 将每个转移 `(s, a, r, s', done)` 存入回放缓冲区。训练时从缓冲区随机采样小批量。打破时间相关性，使样本更接近独立同分布。

```python
replay_buffer = []
# Store transition
replay_buffer.append((s, a, r, s_next, done))
# Sample random batch
batch = random.sample(replay_buffer, batch_size)
```

**目标网络。** 维护两个 Q 网络：在线网络 `Q_θ` 和目标网络 `Q_θ'`。TD 目标用目标网络计算：

```
y = r + γ · max_{a'} Q_θ'(s', a')
```

目标网络参数定期（每 C 步）从在线网络复制：`θ' ← θ`。或者使用软更新：`θ' ← τ · θ + (1-τ) · θ'`，τ ≈ 0.005。

**损失函数。** 在线网络的 MSE 损失：

```
L(θ) = E[(y - Q_θ(s, a))²]
```

其中 `y = r + γ · max_{a'} Q_θ'(s', a')`（如果 done，`y = r`）。

**ε-贪心探索。** 与表格 Q 学习相同，但 ε 通常从 1.0 线性衰减到 0.01（前 100k 步）。

**帧预处理（Atari 特定）。** 灰度化 → 缩放到 84×84 → 堆叠最近 4 帧 → 归一化到 [0, 1]。这给网络运动信息（球的方向、速度）。

## DQN 变体

| 变体             | 年份 | 改进                                           |
| ---------------- | ---- | ---------------------------------------------- |
| DQN              | 2015 | 经验回放 + 目标网络                            |
| 双 DQN           | 2016 | 用在线网络选动作，目标网络评估，减少最大化偏差 |
| Dueling DQN      | 2016 | 分离 V(s) 和 A(s,a) 流，更好的值估计           |
| 优先经验回放     | 2016 | 按 TD 误差优先采样                             |
| 分布式 DQN (C51) | 2017 | 学习回报分布而非期望                           |
| Rainbow          | 2017 | 所有改进组合                                   |
| R2D2             | 2019 | 分布式训练 + LSTM + 优先回放                   |
| IQN              | 2018 | 隐式分位网络，更灵活的分布                     |
| Agent57          | 2020 | 在所有 57 个 Atari 游戏上超人类                |

## 动手构建

`code/main.py` 实现了一个简化版 DQN，使用 MLP 在 CartPole 环境上训练。

### 步骤 1：Q 网络

```python
class QNetwork:
    def __init__(self, state_dim, n_actions, hidden_dim=128):
        self.W1 = np.random.randn(state_dim, hidden_dim) * 0.01
        self.b1 = np.zeros(hidden_dim)
        self.W2 = np.random.randn(hidden_dim, n_actions) * 0.01
        self.b2 = np.zeros(n_actions)

    def forward(self, x):
        h = np.maximum(0, x @ self.W1 + self.b1)  # ReLU
        return h @ self.W2 + self.b2
```

### 步骤 2：经验回放

```python
class ReplayBuffer:
    def __init__(self, capacity=10000):
        self.buffer = []
        self.capacity = capacity

    def push(self, transition):
        if len(self.buffer) >= self.capacity:
            self.buffer.pop(0)
        self.buffer.append(transition)

    def sample(self, batch_size):
        return random.sample(self.buffer, batch_size)
```

### 步骤 3：DQN 更新

```python
def dqn_update(online_net, target_net, batch, gamma, lr):
    for s, a, r, s_next, done in batch:
        # TD target using target network
        if done:
            y = r
        else:
            y = r + gamma * np.max(target_net.forward(s_next))
        # Predicted Q value using online network
        q_values = online_net.forward(s)
        td_error = y - q_values[a]
        # Gradient step (simplified)
        q_values[a] += lr * td_error
```

### 步骤 4：训练循环

```python
def train_dqn(env, n_episodes=500):
    online_net = QNetwork(state_dim, n_actions)
    target_net = QNetwork(state_dim, n_actions)
    buffer = ReplayBuffer()
    epsilon = 1.0

    for episode in range(n_episodes):
        s = env.reset()
        while True:
            a = epsilon_greedy(online_net, s, epsilon)
            s_next, r, done = env.step(a)
            buffer.push((s, a, r, s_next, done))

            if len(buffer) >= batch_size:
                batch = buffer.sample(batch_size)
                dqn_update(online_net, target_net, batch, gamma, lr)

            s = s_next
            if done:
                break

        # Decay epsilon
        epsilon = max(0.01, epsilon - 0.001)

        # Update target network every C episodes
        if episode % target_update_freq == 0:
            target_net = copy(online_net)
```

## 常见陷阱

- **目标网络更新太频繁。** 每步更新目标网络 = 没有目标网络的效果。修复：每 1000-10000 步更新一次。
- **回放缓冲区太小。** 缓冲区太小 = 样本多样性不足。修复：至少 100k 转移。
- **回放缓冲区太大。** 缓冲区太大 = 旧经验太多，策略已改变。修复：50k-1M 通常足够。
- **学习率太大。** DQN 对学习率敏感。修复：从 1e-4 开始，使用 Adam 或 RMSProp。
- **奖励裁剪。** Atari 中奖励被裁剪到 [-1, 1] 以稳定训练。不裁剪 = 高方差梯度。
- **帧堆叠不够。** 单帧没有运动信息。修复：堆叠 4 帧。
- **没有梯度裁剪。** 梯度可能爆炸。修复：裁剪梯度范数到 10。

## 实际应用

| 场景               | DQN 适用性            |
| ------------------ | --------------------- |
| 离散动作，高维状态 | 非常适合              |
| 连续动作           | 不适合（用 DDPG/SAC） |
| Atari 游戏         | 经典应用              |
| 棋类游戏           | 适合（配合 MCTS）     |
| 推荐系统           | 适合（离散候选）      |
| 机器人控制         | 不适合（连续动作）    |

## 交付物

保存 `outputs/skill-dqn-trainer.md`。技能接收环境描述 + 计算预算，输出：网络架构、回放缓冲区大小、目标网络更新频率、ε 调度和训练超参数。

## 练习

1. **简单。** 运行 `code/main.py`，比较有和没有目标网络的训练稳定性。目标网络更新频率如何影响稳定性？
2. **中等。** 实现双 DQN：用在线网络选择动作 `a* = argmax Q_online(s', a)`，用目标网络评估 `Q_target(s', a*)`。比较与标准 DQN 的 Q 值偏差。
3. **困难。** 实现优先经验回放：按 TD 误差的绝对值优先采样。比较与均匀采样的样本效率。

## 关键术语

| 术语        | 人们怎么说    | 实际含义                                  |
| ----------- | ------------- | ----------------------------------------- |
| DQN         | "深度 Q 网络" | Q 学习 + 神经网络 + 经验回放 + 目标网络。 |
| 经验回放    | "回放缓冲区"  | 存储转移，随机采样训练，打破相关性。      |
| 目标网络    | "慢网络"      | 独立的 Q 网络，定期更新，稳定训练。       |
| 双 DQN      | "去偏差"      | 在线选动作，目标评估，减少最大化偏差。    |
| Dueling DQN | "分离流"      | 分离 V(s) 和 A(s,a)，更好的值估计。       |
| 优先回放    | "按需采样"    | 按 TD 误差优先采样重要转移。              |

## 生产笔记：DQN 的经验回放是 RL 的 KV-Cache

经验回放缓冲区是 DQN 训练中最昂贵的存储组件。一个 1M 转移的缓冲区，每个转移 4 个 84×84×4 帧堆叠 = 约 113 GB 原始数据。生产 DQN 训练使用：

- **帧压缩。** 只存储唯一帧的引用，用索引重建堆叠。内存降低约 4 倍。
- **优先回放的数据结构。** 分段树 (segment tree) 实现 O(log N) 采样和优先级更新。
- **分布式回放。** R2D2 使用分布式 actor 收集经验，中心 learner 从共享缓冲区采样。

推理时，DQN 是一个简单的前向传播：`Q(s) → [Q(s,a_1), ..., Q(s,a_n)]`。选择 argmax。延迟 = 一次 CNN 前向传播，与标准分类相同。

## 延伸阅读

- [Mnih et al. (2015). Human-level control through deep reinforcement learning](https://www.nature.com/articles/nature14236) — DQN 论文。
- [van Hasselt, Guez, Silver (2016). Deep Reinforcement Learning with Double Q-learning](https://arxiv.org/abs/1509.06461) — 双 DQN。
- [Wang et al. (2016). Dueling Network Architectures for Deep Reinforcement Learning](https://arxiv.org/abs/1511.06581) — Dueling DQN。
- [Schaul et al. (2016). Prioritized Experience Replay](https://arxiv.org/abs/1511.05952) — 优先回放。
- [Hessel et al. (2018). Rainbow: Combining Improvements in Deep Reinforcement Learning](https://arxiv.org/abs/1710.02298) — Rainbow。
