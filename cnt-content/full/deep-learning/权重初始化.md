---
title: 权重初始化
description: 好的权重初始化让训练从正确的起点开始，避免梯度消失和爆炸
module: 'deep-learning'
difficulty: intermediate
tags:
  - 权重初始化
  - Xavier
  - He
  - 梯度流
  - 方差
related:
  - 'deep-learning/激活函数'
  - 'deep-learning/迷你框架'
  - 'deep-learning/视觉Transformer'
  - 'deep-learning/损失函数'
prerequisites:
  - 'deep-learning/深度学习概述'
---

# 权重初始化

> 好的权重初始化让训练从正确的起点开始，避免梯度消失和爆炸。

**类型:** 学习
**语言:** Python
**前置条件:** Phase 3 第1-7课
**时间:** ~45 分钟

## 学习目标

- 推导Xavier和He初始化的数学原理
- 解释为什么零初始化和过大初始化都会失败
- 实验展示不同初始化对深层网络训练的影响
- 理解残差连接如何缓解初始化敏感性

## 问题

如果所有权重初始化为零，所有神经元输出相同，梯度相同，网络永远学不到不同的特征。如果权重太大，激活值饱和，梯度消失。如果权重太小，信号逐层衰减，也消失。

好的初始化保持信号和梯度在层间流动时不爆炸也不消失。

## 概念

### 为什么初始化很重要

前向传播：信号从输入层传到输出层。如果每层将信号方差改变一个因子，10层后信号可能被放大10^10倍或缩小到10^(-10)。

反向传播：梯度从输出层传到输入层。同样的方差问题。

好的初始化目标：每层输出的方差约等于输入的方差。

### 零初始化的问题

所有权重相同 -> 所有神经元输出相同 -> 所有梯度相同 -> 所有权重更新相同 -> 对称性永远不被打破。

至少需要随机初始化来打破对称性。

### Xavier初始化（Glorot）

适用于Sigmoid和Tanh激活函数。

```
W ~ N(0, 2 / (fan_in + fan_out))
或 W ~ Uniform(-sqrt(6/(fan_in+fan_out)), sqrt(6/(fan_in+fan_out)))
```

推导：假设输入和权重独立，零均值。输出方差 = fan*in * var(W) \_ var(x)。令var(output) = var(x)，得var(W) = 1/fan_in。考虑反向传播，取折中：var(W) = 2/(fan_in + fan_out)。

### He初始化（Kaiming）

适用于ReLU激活函数。

```
W ~ N(0, 2 / fan_in)
```

ReLU将一半值置零，方差减半。补偿：var(W) = 2/fan_in。

### 其他初始化

**正交初始化**：权重矩阵初始化为正交矩阵。保持梯度范数。

**LSUV初始化**：先正交初始化，然后缩放使每层输出方差为1。

**预训练初始化**：用已训练模型的权重初始化（迁移学习）。

### 批归一化减少初始化敏感性

批归一化在每层后重新标准化激活值，减少了对初始化的依赖。但好的初始化仍然加速收敛。

## 动手构建

```python
import random
import math

def sigmoid(x):
    x = max(-500, min(500, x))
    return 1.0 / (1.0 + math.exp(-x))

def relu(x):
    return max(0, x)

def init_zeros(n_out, n_in):
    return [[0.0] * n_in for _ in range(n_out)]

def init_random(n_out, n_in, scale=0.01):
    return [[random.gauss(0, scale) for _ in range(n_in)] for _ in range(n_out)]

def init_xavier(n_out, n_in):
    std = math.sqrt(2.0 / (n_in + n_out))
    return [[random.gauss(0, std) for _ in range(n_in)] for _ in range(n_out)]

def init_he(n_out, n_in):
    std = math.sqrt(2.0 / n_in)
    return [[random.gauss(0, std) for _ in range(n_in)] for _ in range(n_out)]

def forward_pass(X, weights, biases, activation='relu'):
    current = X
    for i, (W, b) in enumerate(zip(weights, biases)):
        next_layer = []
        for j in range(len(W)):
            z = sum(W[j][k] * current[k] for k in range(len(current))) + b[j]
            if activation == 'relu':
                next_layer.append(relu(z))
            else:
                next_layer.append(sigmoid(z))
        current = next_layer
    return current

def measure_activation_stats(X, weights, biases, activation='relu'):
    current = X
    layer_means = []
    layer_stds = []
    for i, (W, b) in enumerate(zip(weights, biases)):
        next_layer = []
        for j in range(len(W)):
            z = sum(W[j][k] * current[k] for k in range(len(current))) + b[j]
            if activation == 'relu':
                next_layer.append(relu(z))
            else:
                next_layer.append(sigmoid(z))
        mean = sum(next_layer) / len(next_layer)
        var = sum((x - mean) ** 2 for x in next_layer) / len(next_layer)
        layer_means.append(mean)
        layer_stds.append(math.sqrt(var) if var > 0 else 0)
        current = next_layer
    return layer_means, layer_stds

random.seed(42)
n_samples = 1000
n_input = 512
X = [[random.gauss(0, 1) for _ in range(n_input)] for _ in range(n_samples)]

layer_sizes = [512, 256, 128, 64, 32, 16]

print("=== Weight Initialization Comparison ===")
print(f"Network: {' -> '.join(str(s) for s in layer_sizes)}")
print(f"Activation: ReLU\n")

for init_name, init_func in [('Zeros', init_zeros), ('Small Random (0.01)', lambda o, i: init_random(o, i, 0.01)),
                               ('Large Random (1.0)', lambda o, i: init_random(o, i, 1.0)),
                               ('Xavier', init_xavier), ('He', init_he)]:
    weights = []
    biases = []
    for i in range(len(layer_sizes) - 1):
        weights.append(init_func(layer_sizes[i + 1], layer_sizes[i]))
        biases.append([0.0] * layer_sizes[i + 1])

    means, stds = measure_activation_stats(X[0], weights, biases, activation='relu')

    print(f"{init_name}:")
    for i, (m, s) in enumerate(zip(means, stds)):
        print(f"  Layer {i+1}: mean={m:.4f}, std={s:.4f}")
    print()
```

## 练习

1. 在10层网络上比较Xavier和He初始化。使用ReLU时哪个更好？为什么？
2. 实现正交初始化。在深层网络上与Xavier/He比较。
3. 展示批归一化如何减少对初始化的敏感性。在相同初始化下，有BN和没有BN的网络训练曲线差异。

## 关键术语

| 术语           | 人们怎么说        | 实际含义                                  |
| -------------- | ----------------- | ----------------------------------------- |
| Xavier初始化   | "Sigmoid初始化"   | 方差=2/(fan_in+fan_out)，适合Sigmoid/Tanh |
| He初始化       | "ReLU初始化"      | 方差=2/fan_in，适合ReLU                   |
| fan_in/fan_out | "输入/输出连接数" | 层的输入和输出神经元数量                  |
| 对称性打破     | "让神经元不同"    | 随机初始化使不同神经元学习不同特征        |
| 信号传播       | "信息流动"        | 前向信号和反向梯度在层间传递              |
