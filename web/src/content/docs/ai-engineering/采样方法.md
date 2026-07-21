---
title: 采样方法
description: '逆 CDF 采样、拒绝采样、重要性采样、MCMC、温度/top-k/top-p 采样、重参数化技巧、Gumbel-Softmax'
module: 'ai-engineering'
difficulty: advanced
tags:
  - 采样
  - MCMC
  - 拒绝采样
  - 重要性采样
  - 温度采样
  - 重参数化
  - 'Gumbel-Softmax'
related:
  - 'ai-engineering/编辑器配置'
  - 'ai-engineering/不平衡数据处理'
  - 'ai-engineering/超参数调优'
  - 'ai-engineering/代码库RAG与跨仓库语义搜索'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 采样方法

> 采样是从概率分布中生成实例的艺术。它是生成模型和贝叶斯推断的基础。

**类型：** 构建
**语言：** Python
**前置条件：** 阶段 1，第 06 课（概率与分布）
**预计时间：** ~90 分钟

## 学习目标

- 使用逆 CDF 方法从任意分布采样
- 实现拒绝采样和重要性采样
- 构建 Metropolis-Hastings MCMC 采样器
- 实现温度采样、top-k 和 top-p 采样用于文本生成
- 解释重参数化技巧和 Gumbel-Softmax 在训练中的作用

## 问题所在

你训练了一个语言模型。它输出下一个 token 的概率分布。你如何从中采样？总是选最高概率的 token（贪心）产生无聊重复的文本。均匀随机选产生胡言乱语。你需要一种控制随机性的方法。

更广泛地说，许多 AI 任务需要从分布中采样：生成模型产生新数据，贝叶斯方法估计后验，强化学习探索动作空间。

## 核心概念

### 逆 CDF 采样

如果知道分布的 CDF（累积分布函数）及其逆函数，可以从均匀分布采样然后变换。

```python
import numpy as np

def inverse_cdf_sample(inv_cdf, n=1):
    """逆 CDF 采样"""
    u = np.random.uniform(0, 1, n)
    return inv_cdf(u)

# 指数分布：CDF^{-1}(u) = -ln(1-u) / lambda
def exp_inv_cdf(u, lam=1.0):
    return -np.log(1 - u) / lam

samples = inverse_cdf_sample(lambda u: exp_inv_cdf(u, 2.0), 10000)
print(f"样本均值: {samples.mean():.3f}, 理论均值: {1/2.0:.3f}")
```

### 拒绝采样

当逆 CDF 不可用时，用另一个容易采样的分布作为提议分布。

```python
def rejection_sampling(target_pdf, proposal_pdf, proposal_sample, M, n=1000):
    """拒绝采样"""
    samples = []
    while len(samples) < n:
        x = proposal_sample()
        u = np.random.uniform(0, 1)
        if u < target_pdf(x) / (M * proposal_pdf(x)):
            samples.append(x)
    return np.array(samples)

# 示例：从截断正态分布采样
from scipy import stats

target = lambda x: stats.norm.pdf(x, 0, 1) if 0 < x < 3 else 0
proposal = lambda x: stats.uniform.pdf(x, 0, 3)
proposal_sample = lambda: np.random.uniform(0, 3)
M = 2.5

samples = rejection_sampling(target, proposal, proposal_sample, M, 5000)
print(f"样本均值: {samples.mean():.3f}")
```

### 重要性采样

不直接采样，而是从提议分布采样，用权重修正。

```python
def importance_sampling(target_pdf, proposal_pdf, proposal_sample, f, n=10000):
    """重要性采样估计 E_target[f(X)]"""
    samples = np.array([proposal_sample() for _ in range(n)])
    weights = np.array([target_pdf(x) / proposal_pdf(x) for x in samples])

    # 归一化权重
    weights = weights / weights.sum()

    return np.sum(weights * f(samples))
```

### MCMC（Metropolis-Hastings）

MCMC 构造一个马尔可夫链，其平稳分布就是目标分布。

```python
def metropolis_hastings(target_pdf, proposal, x0, n=10000):
    """Metropolis-Hastings MCMC"""
    samples = [x0]
    x = x0

    for _ in range(n):
        x_new = proposal(x)
        acceptance = min(1, target_pdf(x_new) / max(target_pdf(x), 1e-300))

        if np.random.uniform() < acceptance:
            x = x_new

        samples.append(x)

    return np.array(samples)

# 示例：从双峰分布采样
def bimodal_pdf(x):
    return 0.3 * stats.norm.pdf(x, -2, 1) + 0.7 * stats.norm.pdf(x, 3, 1)

proposal = lambda x: x + np.random.randn() * 0.5

samples = metropolis_hastings(bimodal_pdf, proposal, 0.0, 20000)
# 丢弃 burn-in
samples = samples[5000:]
print(f"样本均值: {samples.mean():.3f}")
```

### 温度采样

温度参数控制采样分布的"尖锐程度"。

```python
def temperature_sampling(logits, temperature=1.0):
    """温度采样"""
    scaled = logits / temperature
    probs = np.exp(scaled - np.max(scaled))
    probs = probs / probs.sum()
    return np.random.choice(len(probs), p=probs)

logits = np.array([2.0, 1.0, 0.5, 0.1])

print("低温 (T=0.5) - 更确定:")
for _ in range(5):
    print(f"  采样: {temperature_sampling(logits, 0.5)}")

print("高温 (T=2.0) - 更随机:")
for _ in range(5):
    print(f"  采样: {temperature_sampling(logits, 2.0)}")
```

### Top-k 和 Top-p 采样

```python
def top_k_sampling(logits, k=5):
    """Top-k 采样：只从概率最高的 k 个 token 中采样"""
    top_k_indices = np.argsort(logits)[-k:]
    top_k_logits = logits[top_k_indices]
    probs = np.exp(top_k_logits - np.max(top_k_logits))
    probs = probs / probs.sum()
    return top_k_indices[np.random.choice(k, p=probs)]

def top_p_sampling(logits, p=0.9):
    """Top-p（核）采样：从累积概率达到 p 的最小 token 集合中采样"""
    sorted_indices = np.argsort(logits)[::-1]
    sorted_logits = logits[sorted_indices]
    probs = np.exp(sorted_logits - np.max(sorted_logits))
    probs = probs / probs.sum()
    cumulative = np.cumsum(probs)

    cutoff = np.searchsorted(cumulative, p) + 1
    filtered_probs = probs[:cutoff]
    filtered_probs = filtered_probs / filtered_probs.sum()

    return sorted_indices[np.random.choice(cutoff, p=filtered_probs)]
```

### 重参数化技巧

使通过随机采样的梯度传播成为可能。

```python
# 不使用重参数化：梯度无法通过采样操作传播
# z = sample_from(N(mu, sigma))  # 不可微

# 使用重参数化：将随机性移到输入
# z = mu + sigma * epsilon, epsilon ~ N(0, 1)
# 梯度可以流过 mu 和 sigma

def reparameterize(mu, log_var):
    """重参数化技巧"""
    epsilon = np.random.randn(*mu.shape)
    sigma = np.exp(0.5 * log_var)
    return mu + sigma * epsilon
```

### Gumbel-Softmax

使离散采样的梯度传播成为可能。

```python
def gumbel_softmax(logits, temperature=1.0):
    """Gumbel-Softmax：可微的离散采样"""
    gumbel = -np.log(-np.log(np.random.uniform(0, 1, logits.shape) + 1e-20) + 1e-20)
    y = (logits + gumbel) / temperature
    y = np.exp(y - np.max(y))
    y = y / y.sum()
    return y
```

## 实际应用

| 方法           | AI 中的位置          |
| -------------- | -------------------- |
| 逆 CDF         | 数据增强，分布变换   |
| 拒绝采样       | 贝叶斯推断，稀有事件 |
| 重要性采样     | 策略评估，方差缩减   |
| MCMC           | 贝叶斯后验采样       |
| 温度采样       | 文本生成控制         |
| Top-k/p        | 语言模型解码         |
| 重参数化       | VAE 训练             |
| Gumbel-Softmax | 离散 VAE，结构化预测 |

## 练习

1. 用逆 CDF 方法从 Rayleigh 分布采样，验证样本分布
2. 实现 Metropolis-Hastings，从 2D 高斯分布采样，绘制样本轨迹
3. 比较温度 0.5、1.0、2.0 下的采样结果，观察随机性变化
4. 实现重参数化技巧，验证梯度可以流过采样操作
