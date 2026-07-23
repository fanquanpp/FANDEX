---
title: 概率与分布
description: PMF/PDF、常见分布、期望值、中心极限定理、对数概率、softmax、交叉熵
module: 'ai-engineering'
difficulty: intermediate
tags:
  - 概率
  - 分布
  - 期望值
  - 中心极限定理
  - softmax
  - 交叉熵
  - 贝叶斯
related:
  - 'ai-engineering/复数'
  - 'ai-engineering/傅里叶变换'
  - 'ai-engineering/感知机'
  - 'ai-engineering/个人AI导师自适应多模态与记忆'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 概率与分布

> 概率是量化不确定性的语言。机器学习就是从不确定性中做决策。

**类型：** 构建
**语言：** Python
**前置条件：** 阶段 1，第 01-04 课
**预计时间：** ~90 分钟

## 学习目标

- 区分离散 PMF 和连续 PDF，计算概率和期望值
- 识别常见分布（均匀、正态、伯努利、二项、泊松、指数）及其参数
- 应用中心极限定理解释为什么正态分布无处不在
- 在 AI 语境中实现对数概率、softmax 和交叉熵

## 问题所在

模型输出概率。分类器说"80% 是猫，20% 是狗"。语言模型预测下一个 token 的概率分布。生成模型从学习到的分布中采样。如果你不理解概率，你就无法理解模型在做什么、为什么使用交叉熵损失，或如何评估不确定性。

## 核心概念

### PMF 和 PDF

**概率质量函数（PMF）**：离散随机变量的概率。每个值有一个概率，所有概率之和为 1。

```python
# 公平骰子的 PMF
outcomes = [1, 2, 3, 4, 5, 6]
pmf = {x: 1/6 for x in outcomes}
print(f"P(3) = {pmf[3]}")  # 0.1667
print(f"总和 = {sum(pmf.values())}")  # 1.0
```

**概率密度函数（PDF）**：连续随机变量的概率密度。单点概率为零，区间概率是 PDF 的积分。

```python
from scipy import stats

# 标准正态分布的 PDF
x = 0.0
pdf_val = stats.norm.pdf(x, loc=0, scale=1)
print(f"PDF(0) = {pdf_val:.4f}")  # 0.3989

# P(-1 < X < 1) = CDF(1) - CDF(-1)
prob = stats.norm.cdf(1) - stats.norm.cdf(-1)
print(f"P(-1 < X < 1) = {prob:.4f}")  # 0.6827
```

### 期望值

期望值是随机变量的"长期平均值"。

```python
# 离散：E[X] = sum(x * P(x))
E_X = sum(x * p for x, p in pmf.items())
print(f"骰子的期望值 = {E_X}")  # 3.5

# 连续：E[X] = integral(x * f(x) dx)
# 标准正态的期望值 = 0
```

### 常见分布

| 分布      | 参数        | 适用于             | AI 中的例子            |
| --------- | ----------- | ------------------ | ---------------------- |
| 均匀      | a, b        | 等概率             | 随机初始化，超参数搜索 |
| 正态      | mu, sigma   | 对称，钟形         | 权重初始化，噪声模型   |
| 伯努利    | p           | 二元结果           | 二分类，Dropout        |
| 二项      | n, p        | n 次试验的成功次数 | A/B 测试               |
| 泊松      | lambda      | 稀有事件计数       | 事件建模               |
| 指数      | lambda      | 事件间隔时间       | 等待时间               |
| Beta      | alpha, beta | [0,1] 上的概率     | 贝叶斯先验             |
| Dirichlet | alpha       | 概率分布上的分布   | 主题模型               |

```python
import numpy as np

# 正态分布采样
samples = np.random.normal(loc=0, scale=1, size=10000)
print(f"均值: {samples.mean():.3f}, 标准差: {samples.std():.3f}")

# 伯努利分布
p = 0.7
flips = np.random.binomial(n=1, p=p, size=1000)
print(f"正面比例: {flips.mean():.3f}")
```

### 中心极限定理

无论原始分布是什么，大量独立同分布随机变量的均值近似服从正态分布。

```python
# 从均匀分布采样，计算样本均值
uniform_samples = np.random.uniform(0, 1, size=(10000, 100))
means = uniform_samples.mean(axis=1)

print(f"原始分布: 均匀(0,1)")
print(f"样本均值分布: 均值={means.mean():.3f}, 标准差={means.std():.3f}")
print(f"理论标准差: {1/np.sqrt(12*100):.3f}")
```

这就是为什么正态分布在统计学和机器学习中无处不在。

### 对数概率

在 AI 中，我们几乎总是使用对数概率而不是原始概率。原因：

1. **数值稳定性**：很多小概率相乘会下溢。对数将乘法变成加法。
2. **计算方便**：加法比乘法快。
3. **优化友好**：对数是单调函数，最大化概率等价于最大化对数概率。

```python
p = 0.01
log_p = np.log(p)
print(f"P = {p}, log P = {log_p:.4f}")

# 联合概率
p1, p2, p3 = 0.1, 0.05, 0.02
joint = p1 * p2 * p3  # 0.0001，容易下溢
log_joint = np.log(p1) + np.log(p2) + np.log(p3)  # -9.21，数值稳定
```

### Softmax

Softmax 将任意实数向量转换为概率分布。

```python
def softmax(logits):
    """数值稳定的 softmax"""
    shifted = logits - np.max(logits)
    exp_vals = np.exp(shifted)
    return exp_vals / np.sum(exp_vals)

logits = np.array([2.0, 1.0, 0.1])
probs = softmax(logits)
print(f"概率: {probs}")  # [0.659, 0.242, 0.099]
print(f"总和: {probs.sum():.6f}")  # 1.0
```

### 交叉熵

交叉熵衡量两个概率分布之间的差异。它是分类问题的标准损失函数。

```python
def cross_entropy(p_true, p_pred):
    """交叉熵损失"""
    eps = 1e-10
    return -np.sum(p_true * np.log(p_pred + eps))

# 真实分布：类别 0
p_true = np.array([1, 0, 0])

# 好的预测
p_good = np.array([0.9, 0.05, 0.05])
# 差的预测
p_bad = np.array([0.3, 0.4, 0.3])

print(f"好预测的交叉熵: {cross_entropy(p_true, p_good):.4f}")  # 0.105
print(f"差预测的交叉熵: {cross_entropy(p_true, p_bad):.4f}")   # 1.204
```

## 实际应用

| 概念         | AI 中的位置            |
| ------------ | ---------------------- |
| Softmax      | 分类输出层，注意力权重 |
| 交叉熵       | 分类损失函数           |
| 对数概率     | 语言模型训练，VAE      |
| 正态分布     | 权重初始化，变分推断   |
| 伯努利       | 二分类，Dropout        |
| 中心极限定理 | 统计检验，置信区间     |

## 练习

1. 从指数分布采样 10000 个值，验证样本均值接近理论期望 1/lambda
2. 实现数值不稳定的 softmax（不减最大值），对大 logit 值测试，观察 NaN
3. 对 3 类分类问题，计算随机猜测的交叉熵
4. 从 Beta 分布采样，观察 alpha 和 beta 参数如何影响分布形状
