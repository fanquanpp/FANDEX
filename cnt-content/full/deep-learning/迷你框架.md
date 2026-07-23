---
title: 迷你框架
description: 构建一个迷你深度学习框架，整合前向传播、反向传播、优化器和训练循环
module: 'deep-learning'
difficulty: advanced
tags:
  - 深度学习框架
  - 自动微分
  - 训练循环
  - 模块化
related:
  - 'deep-learning/混合专家模型'
  - 'deep-learning/激活函数'
  - 'deep-learning/权重初始化'
  - 'deep-learning/视觉Transformer'
prerequisites:
  - 'deep-learning/深度学习概述'
---

# 迷你框架

> 构建一个迷你深度学习框架，整合前向传播、反向传播、优化器和训练循环。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 3 第1-9课
**时间:** ~120 分钟

## 学习目标

- 设计模块化的神经网络框架，支持组合不同层
- 实现自动微分引擎追踪计算图
- 构建完整的训练循环，包括验证和早停
- 理解PyTorch等框架的核心设计思想

## 问题

前面每节课都从头实现网络。每次都要重写前向传播、反向传播、梯度更新。这既低效又容易出错。真正的深度学习框架（PyTorch、TensorFlow）提供模块化组件，你只需组合它们。

这节课构建一个迷你框架，演示这些框架的核心设计。

## 概念

### 框架设计原则

**模块化**：每层是一个独立模块，有forward和backward方法。
**组合**：模型由多个模块顺序组合。
**自动微分**：框架自动追踪计算图并计算梯度。
**优化器解耦**：优化器独立于模型，可以替换。

### 核心组件

```
Layer: forward(x) -> output, backward(grad) -> param_grads
Model: 顺序组合多个Layer
Loss: forward(pred, target) -> loss, backward() -> grad
Optimizer: step(params, grads)
Trainer: 整合训练循环
```

## 动手构建

```python
import random
import math

class Layer:
    def __init__(self):
        self.params = {}
        self.grads = {}

    def forward(self, x):
        raise NotImplementedError

    def backward(self, grad):
        raise NotImplementedError

class Linear(Layer):
    def __init__(self, in_features, out_features):
        super().__init__()
        std = math.sqrt(2.0 / in_features)
        self.params['W'] = [[random.gauss(0, std) for _ in range(in_features)] for _ in range(out_features)]
        self.params['b'] = [0.0] * out_features
        self.grads['W'] = None
        self.grads['b'] = None
        self._input = None

    def forward(self, x):
        self._input = x
        W, b = self.params['W'], self.params['b']
        return [sum(W[j][k] * x[k] for k in range(len(x))) + b[j] for j in range(len(b))]

    def backward(self, grad):
        x = self._input
        W = self.params['W']
        self.grads['W'] = [[grad[j] * x[k] for k in range(len(x))] for j in range(len(grad))]
        self.grads['b'] = grad[:]
        input_grad = [sum(W[j][k] * grad[j] for j in range(len(grad))) for k in range(len(x))]
        return input_grad

class ReLU(Layer):
    def __init__(self):
        super().__init__()
        self._input = None

    def forward(self, x):
        self._input = x
        return [max(0, xi) for xi in x]

    def backward(self, grad):
        return [gi * (1.0 if xi > 0 else 0.0) for gi, xi in zip(grad, self._input)]

class Sigmoid(Layer):
    def __init__(self):
        super().__init__()
        self._output = None

    def forward(self, x):
        self._output = [1.0 / (1.0 + math.exp(-max(-500, min(500, xi)))) for xi in x]
        return self._output

    def backward(self, grad):
        return [gi * oi * (1 - oi) for gi, oi in zip(grad, self._output)]

class Sequential:
    def __init__(self, *layers):
        self.layers = layers

    def forward(self, x):
        for layer in self.layers:
            x = layer.forward(x)
        return x

    def backward(self, grad):
        for layer in reversed(self.layers):
            grad = layer.backward(grad)
        return grad

    def get_params(self):
        params = []
        for layer in self.layers:
            for key in layer.params:
                params.append((layer, key, layer.params[key]))
        return params

class MSELoss:
    def forward(self, pred, target):
        self._pred = pred
        self._target = target
        return sum((p - t) ** 2 for p, t in zip(pred, target)) / len(pred)

    def backward(self):
        n = len(self._pred)
        return [2 * (p - t) / n for p, t in zip(self._pred, self._target)]

class CrossEntropyLoss:
    def forward(self, pred, target):
        self._pred = [max(min(p, 1 - 1e-15), 1e-15) for p in pred]
        self._target = target
        loss = 0
        for p, t in zip(self._pred, self._target):
            loss -= t * math.log(p) + (1 - t) * math.log(1 - p)
        return loss / len(pred)

    def backward(self):
        return [(p - t) / len(p) for p, t in zip([self._pred], [self._target])][0]

class SGD:
    def __init__(self, lr=0.01):
        self.lr = lr
    def step(self, model):
        for layer, key, param in model.get_params():
            grad = layer.grads[key]
            for i in range(len(param)):
                if isinstance(param[i], list):
                    for j in range(len(param[i])):
                        param[i][j] -= self.lr * grad[i][j]
                else:
                    param[i] -= self.lr * grad[i]

class Adam:
    def __init__(self, lr=0.001, beta1=0.9, beta2=0.999, eps=1e-8):
        self.lr = lr
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.m = {}
        self.v = {}
        self.t = 0

    def step(self, model):
        self.t += 1
        for idx, (layer, key, param) in enumerate(model.get_params()):
            grad = layer.grads[key]
            if idx not in self.m:
                self.m[idx] = [[0.0] * len(row) if isinstance(row, list) else 0.0 for row in param]
                self.v[idx] = [[0.0] * len(row) if isinstance(row, list) else 0.0 for row in param]
            for i in range(len(param)):
                if isinstance(param[i], list):
                    for j in range(len(param[i])):
                        self.m[idx][i][j] = self.beta1 * self.m[idx][i][j] + (1 - self.beta1) * grad[i][j]
                        self.v[idx][i][j] = self.beta2 * self.v[idx][i][j] + (1 - self.beta2) * grad[i][j] ** 2
                        m_hat = self.m[idx][i][j] / (1 - self.beta1 ** self.t)
                        v_hat = self.v[idx][i][j] / (1 - self.beta2 ** self.t)
                        param[i][j] -= self.lr * m_hat / (math.sqrt(v_hat) + self.eps)

class Trainer:
    def __init__(self, model, loss_fn, optimizer, epochs=100, print_every=10):
        self.model = model
        self.loss_fn = loss_fn
        self.optimizer = optimizer
        self.epochs = epochs
        self.print_every = print_every

    def fit(self, X, y):
        for epoch in range(self.epochs):
            total_loss = 0
            for xi, yi in zip(X, y):
                pred = self.model.forward(xi)
                loss = self.loss_fn.forward(pred, yi)
                total_loss += loss
                grad = self.loss_fn.backward()
                self.model.backward(grad)
                self.optimizer.step(self.model)
            if epoch % self.print_every == 0:
                avg_loss = total_loss / len(X)
                print(f"  Epoch {epoch:4d} | Loss: {avg_loss:.4f}")
        return self

random.seed(42)
N = 200
X = [[random.gauss(0, 1), random.gauss(0, 1)] for _ in range(N)]
y = [[1.0] if x[0] + x[1] > 0 else [0.0] for x in X]

print("=== Mini Framework Demo ===")
model = Sequential(Linear(2, 16), ReLU(), Linear(16, 8), ReLU(), Linear(8, 1), Sigmoid())
loss_fn = CrossEntropyLoss()
optimizer = Adam(lr=0.01)
trainer = Trainer(model, loss_fn, optimizer, epochs=100, print_every=20)
trainer.fit(X, y)

correct = sum(1 for xi, yi in zip(X, y) if (model.forward(xi)[0] > 0.5) == (yi[0] > 0.5))
print(f"\nAccuracy: {correct / len(y):.4f}")
```

## 练习

1. 添加Dropout层和BatchNorm层到框架中。在训练和推理模式下切换行为。
2. 实现save/load功能：将模型参数序列化为JSON文件。
3. 添加小批量训练支持。比较批量大小1、32和128的收敛速度。

## 关键术语

| 术语       | 人们怎么说   | 实际含义                                     |
| ---------- | ------------ | -------------------------------------------- |
| 模块化     | "积木式组合" | 每层是独立模块，可以自由组合                 |
| 自动微分   | "自动算梯度" | 框架自动追踪计算图并计算梯度                 |
| 训练循环   | "训练主流程" | 前向传播、计算损失、反向传播、更新参数的循环 |
| Sequential | "顺序模型"   | 层按顺序堆叠的模型                           |
