---
title: 优化方法
description: 梯度下降、SGD、动量、Adam、学习率调度、凸优化与非凸优化
module: 'ai-engineering'
difficulty: intermediate
tags:
  - 优化
  - 梯度下降
  - SGD
  - 动量
  - Adam
  - 学习率
  - 凸优化
related:
  - 'ai-engineering/音频语言模型'
  - 'ai-engineering/影子流量与金丝雀发布'
  - 'ai-engineering/优化器'
  - 'ai-engineering/语音活动检测'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 优化方法

> 训练模型就是优化。选择正确的优化器，决定了收敛的速度和稳定性。

**类型：** 构建
**语言：** Python
**前置条件：** 阶段 1，第 04-05 课
**预计时间：** ~90 分钟

## 学习目标

- 从零实现梯度下降、SGD、动量 SGD 和 Adam 优化器
- 解释每种优化器的工作原理及其相对于前一种的改进
- 实现学习率调度策略（步进衰减、余弦退火、预热）
- 区分凸优化和非凸优化，理解为什么深度学习优化困难

## 问题所在

你选择了学习率 0.01。训练发散了。你选择 0.0001。训练太慢。你选择 0.001。训练卡在局部极小值。优化器选择和学习率调整是实际训练中最关键的决策。

## 核心概念

### 梯度下降

最简单的优化器：沿梯度反方向走一步。

```python
def gradient_descent(f, grad_f, x0, lr=0.01, steps=1000):
    x = x0.copy()
    path = [x.copy()]

    for _ in range(steps):
        g = grad_f(x)
        x = x - lr * g
        path.append(x.copy())

    return np.array(path)
```

问题：学习率敏感，在峡谷中震荡，在平坦区域慢。

### 随机梯度下降（SGD）

使用小批量数据估计梯度，而不是全部数据。

```python
def sgd(grad_fn, x0, lr=0.01, batch_size=32, steps=1000):
    x = x0.copy()

    for _ in range(steps):
        g = grad_fn(x, batch_size=batch_size)
        x = x - lr * g

    return x
```

优点：每次更新更快，噪声有助于逃离局部极小值。
缺点：高方差，收敛路径震荡。

### 动量 SGD

累积过去的梯度方向，减少震荡。

```python
def sgd_momentum(grad_fn, x0, lr=0.01, momentum=0.9, steps=1000):
    x = x0.copy()
    v = np.zeros_like(x)

    for _ in range(steps):
        g = grad_fn(x)
        v = momentum * v + g
        x = x - lr * v

    return x
```

动量就像一个球滚下山坡：它积累了速度，在一致的方向上加速，在方向变化时减速。

### Adam

Adam 结合了动量和自适应学习率。每个参数有自己的学习率，基于过去梯度的统计量。

```python
def adam(grad_fn, x0, lr=0.001, beta1=0.9, beta2=0.999, eps=1e-8, steps=1000):
    x = x0.copy()
    m = np.zeros_like(x)  # 一阶矩（均值）
    v = np.zeros_like(x)  # 二阶矩（方差）

    for t in range(1, steps + 1):
        g = grad_fn(x)

        m = beta1 * m + (1 - beta1) * g
        v = beta2 * v + (1 - beta2) * g ** 2

        m_hat = m / (1 - beta1 ** t)  # 偏差修正
        v_hat = v / (1 - beta2 ** t)

        x = x - lr * m_hat / (np.sqrt(v_hat) + eps)

    return x
```

Adam 的关键思想：

- **一阶矩 m**：梯度的指数移动平均（方向）
- **二阶矩 v**：梯度平方的指数移动平均（自适应学习率）
- **偏差修正**：补偿初始零值的影响

### 学习率调度

```python
def step_decay(lr, epoch, drop=0.5, every=30):
    return lr * (drop ** (epoch // every))

def cosine_annealing(lr, epoch, total_epochs):
    return lr * 0.5 * (1 + np.cos(np.pi * epoch / total_epochs))

def warmup_cosine(lr, epoch, warmup_epochs, total_epochs):
    if epoch < warmup_epochs:
        return lr * epoch / warmup_epochs
    return lr * 0.5 * (1 + np.cos(np.pi * (epoch - warmup_epochs) / (total_epochs - warmup_epochs)))
```

### 凸 vs 非凸

**凸函数**：任何局部极小值都是全局极小值。梯度下降保证收敛。

**非凸函数**：有多个局部极小值和鞍点。深度学习的损失函数几乎总是非凸的。

```python
# 凸函数：f(x) = x^2
# 非凸函数：f(x) = x^4 - 3x^2 + 2
```

深度学习中的挑战：

- **局部极小值**：梯度为零但不是最优解
- **鞍点**：某些方向是极小值，其他方向是极大值
- **平坦区域**：梯度接近零，学习停滞
- **悬崖**：梯度突然变大，参数跳很远

## 实际应用

| 优化器         | 适用于                     | 默认学习率     |
| -------------- | -------------------------- | -------------- |
| SGD + 动量     | CV 模型，最终精度很重要    | 0.1 + 动量 0.9 |
| Adam           | NLP，Transformer，快速原型 | 0.001          |
| AdamW          | 带 weight decay 的大模型   | 0.001          |
| SGD + 余弦调度 | 训练后期的精度提升         | 0.1            |

## 练习

1. 在 Rosenbrock 函数上比较梯度下降、动量 SGD 和 Adam 的收敛速度
2. 实现学习率预热 + 余弦退火调度，绘制学习率曲线
3. 在非凸函数上运行 SGD，观察不同初始点是否收敛到不同局部极小值
4. 修改 Adam 实现，添加 weight decay（AdamW）
