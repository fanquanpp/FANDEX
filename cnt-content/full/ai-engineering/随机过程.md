---
title: 随机过程
description: '随机游走、马尔可夫链、布朗运动、Langevin 动力学、MCMC、扩散模型'
module: 'ai-engineering'
difficulty: advanced
tags:
  - 随机过程
  - 马尔可夫链
  - 布朗运动
  - Langevin动力学
  - MCMC
  - 扩散模型
related:
  - 'ai-engineering/数值稳定性'
  - 'ai-engineering/说话人识别与验证'
  - 'ai-engineering/损失函数'
  - 'ai-engineering/特征工程与选择'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 随机过程

> 随机过程是随时间演化的随机性。扩散模型——当前最强大的生成模型——就是随机过程。

**类型：** 构建
**语言：** Python
**前置条件：** 阶段 1，第 06 和 16 课
**预计时间：** ~90 分钟

## 学习目标

- 模拟随机游走和布朗运动
- 构建和分析马尔可夫链，计算平稳分布
- 实现 Langevin 动力学用于采样
- 解释扩散模型如何使用随机过程生成图像

## 问题所在

扩散模型（DALL-E, Stable Diffusion, Midjourney）是当前最强大的图像生成模型。它们的核心是一个随机过程：逐步向图像添加噪声（前向过程），然后学习逐步去除噪声（反向过程）。

如果你不理解随机过程，你就无法理解扩散模型为什么有效。

## 核心概念

### 随机游走

最简单的随机过程：每步随机选择方向。

```python
import numpy as np

def random_walk(n_steps, dim=1):
    """随机游走"""
    steps = np.random.choice([-1, 1], size=(n_steps, dim))
    path = np.cumsum(steps, axis=0)
    return path

# 1D 随机游走
path = random_walk(1000)
print(f"最终位置: {path[-1, 0]}")
print(f"最大偏移: {np.max(np.abs(path))}")

# 多次随机游走的统计
final_positions = [random_walk(1000)[-1, 0] for _ in range(10000)]
print(f"最终位置均值: {np.mean(final_positions):.2f}")  # 接近 0
print(f"最终位置标准差: {np.std(final_positions):.2f}")  # 接近 sqrt(1000)
```

### 布朗运动

布朗运动是连续时间的随机游走。它是扩散过程的数学模型。

```python
def brownian_motion(T, dt, dim=1):
    """布朗运动"""
    n_steps = int(T / dt)
    dW = np.random.normal(0, np.sqrt(dt), size=(n_steps, dim))
    W = np.cumsum(dW, axis=0)
    W = np.vstack([np.zeros(dim), W])  # 从 0 开始
    return W

T = 1.0
dt = 0.001
path = brownian_motion(T, dt)
print(f"布朗运动最终位置: {path[-1, 0]:.4f}")
print(f"理论标准差: {np.sqrt(T):.4f}")
```

### 马尔可夫链

马尔可夫链是"无记忆"的随机过程：下一状态只依赖当前状态。

```python
def markov_chain(transition_matrix, initial_state, n_steps):
    """马尔可夫链模拟"""
    n_states = transition_matrix.shape[0]
    states = [initial_state]

    for _ in range(n_steps):
        current = states[-1]
        next_state = np.random.choice(n_states, p=transition_matrix[current])
        states.append(next_state)

    return states

# 天气模型：晴天、阴天、雨天
P = np.array([
    [0.7, 0.2, 0.1],  # 晴天转移概率
    [0.3, 0.4, 0.3],  # 阴天转移概率
    [0.2, 0.3, 0.5],  # 雨天转移概率
])

weather = markov_chain(P, 0, 1000)
print(f"晴天比例: {weather.count(0)/len(weather):.3f}")
print(f"阴天比例: {weather.count(1)/len(weather):.3f}")
print(f"雨天比例: {weather.count(2)/len(weather):.3f}")
```

### 平稳分布

马尔可夫链运行足够长时间后，状态分布趋于稳定。

```python
def stationary_distribution(transition_matrix):
    """计算平稳分布"""
    eigenvalues, eigenvectors = np.linalg.eig(transition_matrix.T)

    # 找特征值 1 对应的特征向量
    idx = np.argmin(np.abs(eigenvalues - 1.0))
    pi = eigenvectors[:, idx].real
    pi = pi / pi.sum()  # 归一化

    return pi

pi = stationary_distribution(P)
print(f"平稳分布: {pi}")
```

### Langevin 动力学

Langevin 动力学使用梯度信息引导随机游走，从概率分布中采样。

```python
def langevin_dynamics(score_fn, x0, step_size=0.01, n_steps=1000):
    """
    Langevin 动力学采样
    score_fn: 分数函数（对数密度的梯度）
    """
    x = x0.copy()
    path = [x.copy()]

    for _ in range(n_steps):
        gradient = score_fn(x)
        noise = np.random.randn(*x.shape) * np.sqrt(2 * step_size)
        x = x + step_size * gradient + noise
        path.append(x.copy())

    return np.array(path)

# 示例：从双峰分布采样
def score_bimodal(x):
    """双峰分布的分数函数"""
    mu1, mu2 = -3, 3
    sigma = 1.0

    p1 = np.exp(-0.5 * ((x - mu1) / sigma) ** 2)
    p2 = np.exp(-0.5 * ((x - mu2) / sigma) ** 2)

    score1 = -(x - mu1) / sigma ** 2
    score2 = -(x - mu2) / sigma ** 2

    w1 = p1 / (p1 + p2 + 1e-10)
    w2 = p2 / (p1 + p2 + 1e-10)

    return w1 * score1 + w2 * score2

samples = langevin_dynamics(score_bimodal, np.array([0.0]), step_size=0.01, n_steps=5000)
print(f"采样均值: {samples[-500:].mean():.2f}")
```

### 扩散模型

扩散模型是当前最强大的生成模型。它由两个随机过程组成：

**前向过程**：逐步向数据添加高斯噪声

```python
def forward_diffusion(x0, n_steps=1000, beta_start=1e-4, beta_end=0.02):
    """前向扩散过程"""
    betas = np.linspace(beta_start, beta_end, n_steps)
    alphas = 1 - betas
    alpha_bars = np.cumprod(alphas)

    path = [x0.copy()]
    x = x0.copy()

    for t in range(n_steps):
        noise = np.random.randn(*x.shape)
        x = np.sqrt(alphas[t]) * x + np.sqrt(betas[t]) * noise
        path.append(x.copy())

    return np.array(path), alpha_bars
```

**反向过程**：学习逐步去除噪声

```python
def reverse_diffusion_step(x_t, predicted_noise, beta, alpha, alpha_bar, t):
    """单步反向扩散"""
    # 从 x_t 预测 x_{t-1}
    x0_pred = (x_t - np.sqrt(1 - alpha_bar) * predicted_noise) / np.sqrt(alpha_bar)

    # 计算均值
    mu = (1 / np.sqrt(alpha)) * (x_t - (beta / np.sqrt(1 - alpha_bar)) * predicted_noise)

    # 添加噪声（t > 0 时）
    if t > 0:
        sigma = np.sqrt(beta)
        noise = np.random.randn(*x_t.shape)
        x_prev = mu + sigma * noise
    else:
        x_prev = mu

    return x_prev
```

扩散模型的关键洞察：

- 前向过程将任何数据分布变成标准高斯分布
- 反向过程学习从噪声恢复数据
- 训练目标是预测每一步添加的噪声

## 实际应用

| 概念            | AI 中的位置        |
| --------------- | ------------------ |
| 随机游走        | 图嵌入（Node2Vec） |
| 马尔可夫链      | MCMC 采样，HMM     |
| 布朗运动        | 扩散模型理论       |
| Langevin 动力学 | 基于分数的生成模型 |
| 扩散模型        | 图像生成，音频生成 |

## 练习

1. 模拟 1000 步随机游走，验证最终位置的标准差约等于 sqrt(n)
2. 构建一个马尔可夫链，计算其平稳分布，验证模拟结果趋近理论值
3. 实现 Langevin 动力学，从高斯混合分布采样
4. 实现简单的前向扩散过程，观察图像如何逐步变成纯噪声
