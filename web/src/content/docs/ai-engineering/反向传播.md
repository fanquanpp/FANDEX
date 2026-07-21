---
title: 反向传播
description: 反向传播是训练神经网络的核心算法，通过链式法则高效计算梯度
module: 'ai-engineering'
difficulty: intermediate
tags:
  - 反向传播
  - 链式法则
  - 梯度
  - 计算图
  - 自动微分
related:
  - 'ai-engineering/多区域LLM服务与KV缓存局部性'
  - 'ai-engineering/反欺骗与音频水印'
  - 'ai-engineering/范数与距离'
  - 'ai-engineering/分离预填充与解码'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 反向传播

> 反向传播是训练神经网络的核心算法，通过链式法则高效计算梯度。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 3 第1-2课
**时间:** ~90 分钟

## 学习目标

- 使用链式法则手动推导简单网络的梯度
- 从零实现反向传播算法
- 构建计算图并实现自动微分
- 解释为什么反向传播比数值梯度高效

## 问题

多层网络有很多参数。一个3层网络(784-128-64-10)有超过100,000个参数。如何高效计算每个参数的梯度？

数值梯度：对每个参数加一个小量，重新计算损失。需要N次前向传播（N=参数数）。太慢。

反向传播：一次前向传播，一次反向传播，计算所有梯度。利用链式法则复用中间结果。

## 概念

### 链式法则

如果 y = f(g(x))，则 dy/dx = dy/dg \* dg/dx。

对于多层网络：

```
z1 = W1 * x + b1
h1 = activation(z1)
z2 = W2 * h1 + b2
h2 = activation(z2)
loss = L(h2, y)
```

dL/dW2 = dL/dh2 _ dh2/dz2 _ dz2/dW2
dL/dW1 = dL/dh2 _ dh2/dz2 _ dz2/dh1 _ dh1/dz1 _ dz1/dW1

反向传播从输出层开始，逐层向后传播梯度。

### 计算图

将计算表示为有向无环图(DAG)。每个节点是一个操作，边是数据流。

前向传播：从输入到输出，计算每个节点的值。
反向传播：从输出到输入，计算每个节点的梯度。

### 自动微分 vs 数值微分 vs 符号微分

**数值微分**：(f(x+h) - f(x)) / h。简单但慢且不精确。

**符号微分**：操作数学表达式。精确但可能产生表达式膨胀。

**自动微分**：追踪计算图，应用链式法则。精确且高效。反向传播就是反向模式自动微分。

### 梯度检查

用数值梯度验证反向传播实现的正确性：

```
numerical_grad = (loss(w + h) - loss(w - h)) / (2 * h)
```

如果 |analytical_grad - numerical_grad| / max(|analytical|, |numerical|) < 1e-5，实现正确。

## 动手构建

```python
import random
import math

class Tensor:
    def __init__(self, data, requires_grad=False):
        self.data = data
        self.requires_grad = requires_grad
        self.grad = None
        self._backward = lambda: None
        self._prev = set()

    def zero_grad(self):
        self.grad = None

def sigmoid(z):
    z = max(-500, min(500, z))
    return 1.0 / (1.0 + math.exp(-z))

class NeuralNetwork:
    def __init__(self, layer_sizes, learning_rate=0.1):
        self.layer_sizes = layer_sizes
        self.lr = learning_rate
        self.weights = []
        self.biases = []
        random.seed(42)
        for i in range(len(layer_sizes) - 1):
            fan_in = layer_sizes[i]
            fan_out = layer_sizes[i + 1]
            w = [[random.gauss(0, math.sqrt(2.0 / fan_in))
                  for _ in range(fan_in)] for _ in range(fan_out)]
            b = [0.0] * fan_out
            self.weights.append(w)
            self.biases.append(b)

    def forward(self, x):
        self.activations = [x]
        self.z_values = []
        current = x
        for i in range(len(self.weights)):
            z = [sum(self.weights[i][j][k] * current[k] for k in range(len(current))) + self.biases[i][j]
                 for j in range(len(self.weights[i]))]
            self.z_values.append(z)
            current = [sigmoid(zi) for zi in z]
            self.activations.append(current)
        return current

    def backward(self, y):
        n_layers = len(self.weights)
        batch_size = 1

        output = self.activations[-1]
        delta = [(output[j] - y[j]) * output[j] * (1 - output[j])
                 for j in range(len(y))]

        self.weight_grads = [None] * n_layers
        self.bias_grads = [None] * n_layers

        self.weight_grads[-1] = [
            [delta[j] * self.activations[-2][k] for k in range(len(self.activations[-2]))]
            for j in range(len(delta))
        ]
        self.bias_grads[-1] = delta[:]

        for i in range(n_layers - 2, -1, -1):
            new_delta = [0.0] * len(self.weights[i])
            for j in range(len(self.weights[i])):
                error = sum(self.weights[i + 1][k][j] * delta[k]
                           for k in range(len(delta)))
                new_delta[j] = error * self.activations[i + 1][j] * (1 - self.activations[i + 1][j])

            delta = new_delta
            self.weight_grads[i] = [
                [delta[j] * self.activations[i][k] for k in range(len(self.activations[i]))]
                for j in range(len(delta))
            ]
            self.bias_grads[i] = delta[:]

    def update(self):
        for i in range(len(self.weights)):
            for j in range(len(self.weights[i])):
                for k in range(len(self.weights[i][j])):
                    self.weights[i][j][k] -= self.lr * self.weight_grads[i][j][k]
                self.biases[i][j] -= self.lr * self.bias_grads[i][j]

    def fit(self, X, y, epochs=1000, print_every=200):
        for epoch in range(epochs):
            total_loss = 0
            for xi, yi in zip(X, y):
                output = self.forward(xi)
                loss = -sum(yi[j] * math.log(max(output[j], 1e-15)) +
                           (1 - yi[j]) * math.log(max(1 - output[j], 1e-15))
                           for j in range(len(yi)))
                total_loss += loss
                self.backward(yi)
                self.update()

            if epoch % print_every == 0:
                print(f"  Epoch {epoch:4d} | Loss: {total_loss / len(X):.4f}")
        return self

    def predict(self, x):
        output = self.forward(x)
        return output.index(max(output)) if len(output) > 1 else (1 if output[0] >= 0.5 else 0)

    def accuracy(self, X, y):
        correct = 0
        for xi, yi in zip(X, y):
            pred = self.predict(xi)
            actual = yi.index(max(yi)) if len(yi) > 1 else (1 if yi[0] > 0.5 else 0)
            if pred == actual:
                correct += 1
        return correct / len(y)

    def gradient_check(self, x, y, epsilon=1e-5):
        self.forward(x)
        self.backward(y)
        max_diff = 0
        for i in range(len(self.weights)):
            for j in range(len(self.weights[i])):
                for k in range(len(self.weights[i][j])):
                    orig = self.weights[i][j][k]
                    self.weights[i][j][k] = orig + epsilon
                    out_plus = self.forward(x)
                    loss_plus = -sum(yi * math.log(max(o, 1e-15)) + (1 - yi) * math.log(max(1 - o, 1e-15))
                                    for yi, o in zip(y, out_plus))
                    self.weights[i][j][k] = orig - epsilon
                    out_minus = self.forward(x)
                    loss_minus = -sum(yi * math.log(max(o, 1e-15)) + (1 - yi) * math.log(max(1 - o, 1e-15))
                                     for yi, o in zip(y, out_minus))
                    self.weights[i][j][k] = orig
                    numerical = (loss_plus - loss_minus) / (2 * epsilon)
                    analytical = self.weight_grads[i][j][k]
                    diff = abs(numerical - analytical) / max(abs(numerical), abs(analytical), 1e-10)
                    max_diff = max(max_diff, diff)
        return max_diff

random.seed(42)
X_xor = [[0, 0], [0, 1], [1, 0], [1, 1]]
y_xor = [[0], [1], [1], [0]]

print("=== Backpropagation Demo ===")
nn = NeuralNetwork([2, 4, 1], learning_rate=1.0)
nn.fit(X_xor, y_xor, epochs=2000, print_every=500)

print(f"\nXOR Results:")
for xi, yi in zip(X_xor, y_xor):
    output = nn.forward(xi)
    print(f"  {xi} -> {output[0]:.4f} (target {yi[0]})")

print(f"\nGradient Check:")
max_diff = nn.gradient_check(X_xor[0], y_xor[0])
print(f"  Max relative difference: {max_diff:.2e}")
print(f"  Gradient check: {'PASSED' if max_diff < 1e-4 else 'FAILED'}")
```

## 练习

1. 手动计算一个2层网络(2-2-1)在单个样本上的所有梯度。与代码输出比较。
2. 实现小批量梯度下降。比较批量大小1、10、50的收敛速度。
3. 实现简单的自动微分框架：支持加法、乘法和sigmoid操作。用它构建并训练一个网络。

## 关键术语

| 术语     | 人们怎么说   | 实际含义                                 |
| -------- | ------------ | ---------------------------------------- |
| 反向传播 | "反向算梯度" | 使用链式法则从输出层向输入层逐层计算梯度 |
| 链式法则 | "梯度传递"   | 复合函数的导数等于各层导数的乘积         |
| 计算图   | "运算流程图" | 将计算表示为有向无环图，便于自动微分     |
| 自动微分 | "自动算导数" | 计算机自动应用链式法则计算精确梯度       |
| 梯度检查 | "验证梯度"   | 用数值梯度验证解析梯度的正确性           |
