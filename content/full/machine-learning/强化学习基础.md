---
order: 22
title: 强化学习基础
module: 'machine-learning'
category: data
difficulty: advanced
description: 'MDP框架、Q-Learning、DQN、Policy Gradient算法原理与实现。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'machine-learning/模型评估与选择'
  - 'machine-learning/特征工程详解'
  - 'machine-learning/Scikit-learn实战'
  - 'machine-learning/不平衡数据处理'
prerequisites: []
---

## 1. 马尔可夫决策过程（MDP）

### 1.1 MDP定义

MDP 是强化学习的数学框架，定义为五元组 $(S, A, P, R, \gamma)$：

| 要素 | 符号 | 说明 |
| :------- | :----------------- | :----------------- | ------------ |
| 状态空间 | $S$ | 所有可能状态的集合 |
| 动作空间 | $A$ | 所有可能动作的集合 |
| 转移概率 | $P(s'              | s,a)$ | 状态转移概率 |
| 奖励函数 | $R(s,a,s')$ | 即时奖励 |
| 折扣因子 | $\gamma \in [0,1)$ | 未来奖励的衰减系数 |

**马尔可夫性质**：

$$P(s_{t+1}|s_t, a_t, s_{t-1}, a_{t-1}, \ldots) = P(s_{t+1}|s_t, a_t)$$

未来只依赖当前状态和动作，与历史无关。

### 1.2 值函数

**状态值函数** $V^\pi(s)$：从状态 $s$ 出发，遵循策略 $\pi$ 的期望回报：

$$V^\pi(s) = \mathbb{E}_\pi\left[\sum_{t=0}^{\infty} \gamma^t r_t \bigg| s_0 = s\right]$$

**动作值函数** $Q^\pi(s,a)$：从状态 $s$ 执行动作 $a$ 后，遵循策略 $\pi$ 的期望回报：

$$Q^\pi(s,a) = \mathbb{E}_\pi\left[\sum_{t=0}^{\infty} \gamma^t r_t \bigg| s_0 = s, a_0 = a\right]$$

### 1.3 Bellman方程

**Bellman期望方程**：

$$V^\pi(s) = \sum_a \pi(a|s) \sum_{s'} P(s'|s,a)\left[R(s,a,s') + \gamma V^\pi(s')\right]$$

$$Q^\pi(s,a) = \sum_{s'} P(s'|s,a)\left[R(s,a,s') + \gamma \sum_{a'} \pi(a'|s') Q^\pi(s',a')\right]$$

**Bellman最优方程**：

$$V^*(s) = \max_a \sum_{s'} P(s'|s,a)\left[R(s,a,s') + \gamma V^*(s')\right]$$

$$Q^*(s,a) = \sum_{s'} P(s'|s,a)\left[R(s,a,s') + \gamma \max_{a'} Q^*(s',a')\right]$$

## 2. Q-Learning

### 2.1 算法原理

Q-Learning 是一种**无模型**的**离策略**算法，直接学习最优Q值函数：

$$Q(s_t, a_t) \leftarrow Q(s_t, a_t) + \alpha \left[r_t + \gamma \max_{a'} Q(s_{t+1}, a') - Q(s_t, a_t)\right]$$

### 2.2 探索与利用

**ε-贪心策略**：

$$a_t = \begin{cases} \text{random action} & \text{with probability } \epsilon \\ \arg\max_a Q(s_t, a) & \text{with probability } 1-\epsilon \end{cases}$$

- $\epsilon$ 从1.0逐渐衰减到0.01
- 保证探索的同时逐步转向利用

### 2.3 Q-Learning算法流程

```
初始化 Q(s,a) = 0 (所有s,a)
对于每轮episode:
    初始化状态 s
    重复:
        用ε-贪心从Q选择动作 a
        执行a，观察 r, s'
        Q(s,a) ← Q(s,a) + α[r + γ max_a' Q(s',a') - Q(s,a)]
        s ← s'
    直到终止状态
```

## 3. DQN

### 3.1 深度Q网络

当状态空间过大或连续时，用**神经网络**近似Q函数：

$$Q(s, a; \theta) \approx Q^*(s, a)$$

### 3.2 关键技术

**经验回放（Experience Replay）**：

```
1. 将交互经验 (s, a, r, s') 存入回放缓冲区
2. 训练时从缓冲区随机采样小批量
3. 打破样本间的时间相关性
```

**目标网络（Target Network）**：

$$L(\theta) = \mathbb{E}\left[\left(r + \gamma \max_{a'} Q(s', a'; \theta^-) - Q(s, a; \theta)\right)^2\right]$$

- $\theta$ 为在线网络参数（频繁更新）
- $\theta^-$ 为目标网络参数（定期从 $\theta$ 复制）
- 避免目标值与当前值过度耦合

### 3.3 DQN变体

| 变体               | 改进                   | 说明             |
| :----------------- | :--------------------- | :--------------- |
| Double DQN         | 解耦选择和评估         | 减少Q值过估计    |
| Dueling DQN        | 分离状态值和优势函数   | 更好学习状态价值 |
| Prioritized Replay | 优先采样TD误差大的经验 | 加速学习         |
| Rainbow            | 集成多种改进           | 综合最优         |

**Double DQN**：

$$y = r + \gamma Q\left(s', \arg\max_{a'} Q(s', a'; \theta); \theta^-\right)$$

**Dueling DQN**：

$$Q(s, a; \theta) = V(s; \theta_V) + A(s, a; \theta_A) - \frac{1}{|A|}\sum_{a'} A(s, a'; \theta_A)$$

## 4. Policy Gradient

### 4.1 策略梯度定理

直接参数化策略 $\pi_\theta(a|s)$，通过梯度上升最大化期望回报：

$$\nabla_\theta J(\theta) = \mathbb{E}_{\pi_\theta}\left[\nabla_\theta \log \pi_\theta(a|s) \cdot G_t\right]$$

其中 $G_t = \sum_{k=0}^{\infty} \gamma^k r_{t+k}$ 为累积回报。

### 4.2 REINFORCE算法

```
初始化策略参数 θ
对于每轮episode:
    用π_θ采样完整轨迹 (s_0, a_0, r_0, s_1, ...)
    对于每个时间步 t:
        计算回报 G_t = Σ γ^k r_{t+k}
        θ ← θ + α ∇_θ log π_θ(a_t|s_t) · G_t
```

**方差缩减**：

- **基线**：$G_t - b(s_t)$ 代替 $G_t$，$b(s_t)$ 通常取 $V(s_t)$
- **优势函数**：$A(s_t, a_t) = Q(s_t, a_t) - V(s_t)$

### 4.3 Actor-Critic

同时学习策略（Actor）和值函数（Critic）：

$$\nabla_\theta J(\theta) \approx \nabla_\theta \log \pi_\theta(a_t|s_t) \cdot A(s_t, a_t)$$

| 组件   | 学习目标          | 输出         |
| :----- | :---------------- | :----------- |
| Actor  | 策略 $\pi_\theta$ | 动作概率     |
| Critic | 值函数 $V_\phi$   | 状态价值估计 |

**优势估计**：

$$A(s_t, a_t) = r_t + \gamma V(s_{t+1}) - V(s_t)$$

**GAE（Generalized Advantage Estimation）**：

$$\hat{A}_t^{GAE} = \sum_{l=0}^{\infty} (\gamma\lambda)^l \delta_{t+l}$$

其中 $\delta_t = r_t + \gamma V(s_{t+1}) - V(s_t)$。

### 4.4 PPO

Proximal Policy Optimization 是目前最常用的策略梯度算法：

**裁剪目标**：

$$L^{CLIP}(\theta) = \mathbb{E}\left[\min\left(r_t(\theta)\hat{A}_t, \text{clip}(r_t(\theta), 1-\epsilon, 1+\epsilon)\hat{A}_t\right)\right]$$

其中 $r_t(\theta) = \frac{\pi_\theta(a_t|s_t)}{\pi_{\theta_{old}}(a_t|s_t)}$ 为重要性采样比。

- 限制策略更新幅度，避免过大更新导致性能崩溃
- 实现简单，训练稳定
- 是 RLHF 中训练 LLM 的核心算法
