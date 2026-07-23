---
title: 优化器
description: 优化器决定模型如何更新参数，从SGD到Adam的演进让训练更快更稳定
module: 'deep-learning'
difficulty: intermediate
tags:
  - 优化器
  - SGD
  - Adam
  - 动量
  - 学习率
related:
  - 'deep-learning/学习率调度'
  - 'deep-learning/音频Transformer与Whisper'
  - 'deep-learning/正则化'
  - 'deep-learning/注意力变体'
prerequisites:
  - 'deep-learning/深度学习概述'
---

# 优化器

> 优化器决定模型如何更新参数。从SGD到Adam的演进让训练更快更稳定。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 3 第1-5课
**时间:** ~90 分钟

## 学习目标

- 从零实现SGD、Momentum、RMSProp和Adam优化器
- 解释动量如何加速收敛并帮助逃离局部最小值
- 理解Adam中自适应学习率的工作原理
- 比较不同优化器在不同损失曲面上的行为

## 问题

梯度下降告诉你方向，但步长怎么选？学习率太大则振荡，太小则慢。损失曲面可能很复杂：狭长山谷、鞍点、平坦区域。不同的优化器用不同的策略来导航这些地形。

## 概念

### 随机梯度下降(SGD)

最基本的优化器。每次用一个小批量计算梯度并更新：

```
w = w - lr * gradient
```

问题：在狭长山谷中振荡，在平坦区域缓慢，在鞍点停滞。

### 动量(Momentum)

像球滚下山，积累动量：

```
v = beta * v + gradient
w = w - lr * v
```

- beta通常0.9
- 在一致方向上加速
- 在振荡方向上减速
- 帮助逃离浅的局部最小值

Nesterov动量：先"看前方"再计算梯度，更精确。

### RMSProp

自适应学习率。对每个参数根据历史梯度大小调整步长：

```
cache = decay * cache + (1 - decay) * gradient^2
w = w - lr * gradient / (sqrt(cache) + epsilon)
```

- 梯度大的参数：步长缩小
- 梯度小的参数：步长放大
- 适合非平稳目标（梯度变化大）

### Adam

结合Momentum和RMSProp：

```
m = beta1 * m + (1 - beta1) * gradient    # 一阶矩（动量）
v = beta2 * v + (1 - beta2) * gradient^2  # 二阶矩（自适应学习率）
m_hat = m / (1 - beta1^t)                 # 偏差修正
v_hat = v / (1 - beta2^t)                 # 偏差修正
w = w - lr * m_hat / (sqrt(v_hat) + epsilon)
```

默认：beta1=0.9, beta2=0.999, epsilon=1e-8

偏差修正：初始时m和v接近零，除以(1-beta^t)放大修正。

Adam是大多数深度学习任务的默认选择。

### 优化器选择指南

| 优化器       | 优点           | 缺点             | 适用场景        |
| ------------ | -------------- | ---------------- | --------------- |
| SGD          | 简单、泛化好   | 需要精心调学习率 | 追求最佳泛化    |
| SGD+Momentum | 比SGD快        | 仍需调学习率     | 计算机视觉      |
| RMSProp      | 自适应学习率   | 可能不收敛       | RNN、非平稳目标 |
| Adam         | 快速收敛、鲁棒 | 可能泛化稍差     | 默认选择、NLP   |

## 动手构建

```python
import random
import math

class SGD:
    def __init__(self, lr=0.01):
        self.lr = lr
    def step(self, params, grads):
        for i in range(len(params)):
            for j in range(len(params[i])):
                params[i][j] -= self.lr * grads[i][j]

class SGDMomentum:
    def __init__(self, lr=0.01, momentum=0.9):
        self.lr = lr
        self.momentum = momentum
        self.velocity = None
    def step(self, params, grads):
        if self.velocity is None:
            self.velocity = [[0.0] * len(row) for row in params]
        for i in range(len(params)):
            for j in range(len(params[i])):
                self.velocity[i][j] = self.momentum * self.velocity[i][j] + grads[i][j]
                params[i][j] -= self.lr * self.velocity[i][j]

class RMSProp:
    def __init__(self, lr=0.01, decay=0.99, epsilon=1e-8):
        self.lr = lr
        self.decay = decay
        self.epsilon = epsilon
        self.cache = None
    def step(self, params, grads):
        if self.cache is None:
            self.cache = [[0.0] * len(row) for row in params]
        for i in range(len(params)):
            for j in range(len(params[i])):
                self.cache[i][j] = self.decay * self.cache[i][j] + (1 - self.decay) * grads[i][j] ** 2
                params[i][j] -= self.lr * grads[i][j] / (math.sqrt(self.cache[i][j]) + self.epsilon)

class Adam:
    def __init__(self, lr=0.001, beta1=0.9, beta2=0.999, epsilon=1e-8):
        self.lr = lr
        self.beta1 = beta1
        self.beta2 = beta2
        self.epsilon = epsilon
        self.m = None
        self.v = None
        self.t = 0
    def step(self, params, grads):
        if self.m is None:
            self.m = [[0.0] * len(row) for row in params]
            self.v = [[0.0] * len(row) for row in params]
        self.t += 1
        for i in range(len(params)):
            for j in range(len(params[i])):
                self.m[i][j] = self.beta1 * self.m[i][j] + (1 - self.beta1) * grads[i][j]
                self.v[i][j] = self.beta2 * self.v[i][j] + (1 - self.beta2) * grads[i][j] ** 2
                m_hat = self.m[i][j] / (1 - self.beta1 ** self.t)
                v_hat = self.v[i][j] / (1 - self.beta2 ** self.t)
                params[i][j] -= self.lr * m_hat / (math.sqrt(v_hat) + self.epsilon)

def rosenbrock(x, y):
    return (1 - x) ** 2 + 100 * (y - x ** 2) ** 2

def rosenbrock_grad(x, y):
    dx = -2 * (1 - x) - 400 * x * (y - x ** 2)
    dy = 200 * (y - x ** 2)
    return dx, dy

print("=== Optimizer Comparison on Rosenbrock Function ===")
print("Target: minimum at (1, 1), starting from (-1, 2)\n")

optimizers = {
    'SGD (lr=0.001)': SGD(lr=0.001),
    'SGD+Momentum (lr=0.001)': SGDMomentum(lr=0.001, momentum=0.9),
    'Adam (lr=0.01)': Adam(lr=0.01),
}

for name, optimizer in optimizers.items():
    x, y = -1.0, 2.0
    for step in range(1000):
        dx, dy = rosenbrock_grad(x, y)
        params = [[x, y]]
        grads = [[dx, dy]]
        optimizer.step(params, grads)
        x, y = params[0]
    loss = rosenbrock(x, y)
    print(f"{name}: final ({x:.4f}, {y:.4f}), loss={loss:.6f}")
```

## 实际使用

```python
import torch
import torch.optim as optim

model = torch.nn.Linear(10, 2)

sgd = optim.SGD(model.parameters(), lr=0.01, momentum=0.9)
adam = optim.Adam(model.parameters(), lr=0.001)
rmsprop = optim.RMSprop(model.parameters(), lr=0.01)

print("PyTorch optimizers ready for use")
```

## 练习

1. 在Rosenbrock函数上比较SGD、Momentum和Adam的轨迹。哪个最快到达最小值？
2. 实现AdamW（Adam with decoupled weight decay）。解释为什么解耦权重衰减比L2正则化更好。
3. 实现Lookahead优化器：慢权重每k步与快权重同步。展示它如何改善Adam的泛化。

## 关键术语

| 术语         | 人们怎么说       | 实际含义                                 |
| ------------ | ---------------- | ---------------------------------------- |
| SGD          | "随机梯度下降"   | 用小批量梯度更新参数的基本方法           |
| 动量         | "惯性"           | 累积历史梯度方向，加速一致方向、减缓振荡 |
| 自适应学习率 | "每参数不同步长" | 根据梯度历史自动调整每个参数的学习率     |
| Adam         | "默认优化器"     | 结合动量和自适应学习率的优化器           |
| 偏差修正     | "初始修正"       | 修正初始时矩估计偏向零的问题             |
