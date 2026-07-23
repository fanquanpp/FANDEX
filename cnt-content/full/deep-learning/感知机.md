---
title: 感知机
description: 感知机是最简单的神经网络，一个神经元学会画一条线分割两类数据
module: 'deep-learning'
difficulty: beginner
tags:
  - 感知机
  - 神经元
  - 线性分类
  - 神经网络基础
related:
  - 'deep-learning/多头注意力'
  - 'deep-learning/反向传播'
  - 'deep-learning/构建Transformer项目'
  - 'deep-learning/混合专家模型'
prerequisites:
  - 'deep-learning/深度学习概述'
---

# 感知机

> 感知机是最简单的神经网络：一个神经元学会画一条线分割两类数据。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 1 (线性代数、微积分)，Phase 2 第1-3课
**时间:** ~60 分钟

## 学习目标

- 从零实现感知机学习算法，并解释其几何直觉
- 证明感知机收敛定理在线性可分数据上的保证
- 解释为什么感知机不能解决XOR问题，以及多层网络如何解决
- 将感知机与现代神经元（sigmoid、ReLU）比较

## 问题

1957年，Frank Rosenblatt发明了感知机。它是一个数学模型，模仿单个神经元：接收输入，加权求和，产生输出。它可以学习画一条线来分隔两类点。

感知机是所有神经网络的构建块。理解它，你就理解了深度学习的基础。

## 概念

### 感知机模型

```
output = step(w1*x1 + w2*x2 + ... + wn*xn + b)
```

- x1, x2, ..., xn：输入特征
- w1, w2, ..., wn：权重（可学习）
- b：偏置（可学习）
- step：阶跃函数（输入>=0输出1，否则输出0）

向量形式：output = step(w^T \* x + b)

### 感知机学习规则

感知机使用简单的误差修正规则：

```
如果真实标签=1但预测=0：w = w + x, b = b + 1
如果真实标签=0但预测=1：w = w - x, b = b - 1
如果预测正确：不变
```

直觉：当预测错误时，朝正确方向移动决策边界。

### 收敛定理

如果数据线性可分，感知机学习算法保证在有限步内收敛。但如果数据不是线性可分，算法永远不收敛，权重会振荡。

### XOR问题

感知机只能画直线。XOR（异或）需要弯曲的决策边界：

| x1  | x2  | XOR |
| --- | --- | --- |
| 0   | 0   | 0   |
| 0   | 1   | 1   |
| 1   | 0   | 1   |
| 1   | 1   | 0   |

没有一条直线能分开(0,1)和(1,0)与(0,0)和(1,1)。这导致了1969年的"AI寒冬"，Minsky和Papert证明了单层感知机的局限性。

解决方案：多层感知机（下一课）。

### 从感知机到现代神经元

感知机使用阶跃函数，不可微。现代神经元使用可微激活函数：

- Sigmoid：平滑的S曲线，输出概率
- ReLU：max(0, x)，简单高效
- Tanh：输出范围[-1, 1]

可微性允许使用梯度下降训练多层网络。

## 动手构建

```python
import random
import math

class Perceptron:
    def __init__(self, n_features, learning_rate=0.1):
        self.weights = [0.0] * n_features
        self.bias = 0.0
        self.lr = learning_rate

    def step(self, x):
        return 1 if x >= 0 else 0

    def predict(self, x):
        z = sum(w * xi for w, xi in zip(self.weights, x)) + self.bias
        return self.step(z)

    def fit(self, X, y, epochs=100):
        for epoch in range(epochs):
            errors = 0
            for xi, yi in zip(X, y):
                pred = self.predict(xi)
                error = yi - pred
                if error != 0:
                    errors += 1
                    for j in range(len(self.weights)):
                        self.weights[j] += self.lr * error * xi[j]
                    self.bias += self.lr * error
            if errors == 0:
                print(f"  Converged at epoch {epoch}")
                break
            if epoch % 20 == 0:
                print(f"  Epoch {epoch}: {errors} errors")
        return self

    def accuracy(self, X, y):
        correct = sum(1 for xi, yi in zip(X, y) if self.predict(xi) == yi)
        return correct / len(y)

random.seed(42)
N = 100
X = []
y = []
for _ in range(N // 2):
    X.append([random.gauss(2, 0.5), random.gauss(2, 0.5)])
    y.append(0)
for _ in range(N // 2):
    X.append([random.gauss(5, 0.5), random.gauss(5, 0.5)])
    y.append(1)

print("=== Perceptron on Linearly Separable Data ===")
p = Perceptron(n_features=2, learning_rate=0.1)
p.fit(X, y, epochs=100)
print(f"Accuracy: {p.accuracy(X, y):.4f}")
print(f"Weights: {p.weights}, Bias: {p.bias}")

print("\n=== Perceptron on XOR (will fail) ===")
X_xor = [[0, 0], [0, 1], [1, 0], [1, 1]]
y_xor = [0, 1, 1, 0]
p_xor = Perceptron(n_features=2, learning_rate=0.1)
p_xor.fit(X_xor, y_xor, epochs=100)
print(f"XOR Accuracy: {p_xor.accuracy(X_xor, y_xor):.4f}")
print("Perceptron cannot solve XOR - needs multilayer network")
```

## 实际使用

```python
from sklearn.linear_model import Perceptron as SklearnPerceptron
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
import numpy as np

X, y = make_classification(n_samples=200, n_features=2, n_redundant=0,
                           n_clusters_per_class=1, random_state=42)
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3)

perc = SklearnPerceptron(max_iter=100, random_state=42)
perc.fit(X_tr, y_tr)
print(f"sklearn Perceptron accuracy: {perc.score(X_te, y_te):.4f}")
```

## 练习

1. 在不同学习率(0.001, 0.01, 0.1, 1.0)下训练感知机。哪个收敛最快？学习率太大会怎样？
2. 生成几乎线性可分的数据（两个类别略有重叠）。感知机收敛吗？为什么不？
3. 用两个感知机构造XOR解：一个检测OR，一个检测NAND，组合结果。画出决策边界。

## 关键术语

| 术语     | 人们怎么说   | 实际含义                                 |
| -------- | ------------ | ---------------------------------------- |
| 感知机   | "单神经元"   | 最简单的神经网络，线性分类器加阶跃函数   |
| 阶跃函数 | "0或1"       | 输入>=0输出1，否则输出0                  |
| 收敛     | "学好了"     | 权重不再变化，所有训练样本正确分类       |
| 线性可分 | "能画线分开" | 存在一条直线（超平面）能完全分开两个类别 |
| XOR问题  | "异或难题"   | 单层感知机无法解决的非线性可分问题       |
