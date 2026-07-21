---
title: 正则化
description: 正则化防止神经网络过拟合，从Dropout到权重衰减的多种策略
module: 'ai-engineering'
difficulty: intermediate
tags:
  - 正则化
  - Dropout
  - 权重衰减
  - 早停
  - 数据增强
related:
  - 'ai-engineering/语音助手流水线'
  - 'ai-engineering/张量运算'
  - 'ai-engineering/支持向量机'
  - 'ai-engineering/终端与Shell'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 正则化

> 正则化防止神经网络过拟合，从Dropout到权重衰减的多种策略。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 3 第1-6课
**时间:** ~60 分钟

## 学习目标

- 从零实现Dropout并解释为什么它相当于隐式集成
- 比较L1、L2正则化和Dropout的效果
- 实现早停并选择合适的耐心值
- 理解数据增强作为正则化的隐式形式

## 问题

神经网络有大量参数，容易记忆训练数据。一个100-50-10的网络有5,560个参数。如果训练集只有100个样本，网络可以完美记忆每个样本但不泛化。

正则化约束模型，使其学习简单、泛化的模式而非记忆噪声。

## 概念

### L2正则化（权重衰减）

在损失函数中添加权重平方和的惩罚：

```
Loss_total = Loss_data + lambda * sum(w^2)
```

效果：权重趋向较小的值，模型更平滑。lambda控制正则化强度。

在优化器中的实现：

- SGD：w = w - lr _ (gradient + lambda _ w) = (1 - lr*lambda) * w - lr \* gradient
- 这就是"权重衰减"——每步将权重缩小一点

### L1正则化

```
Loss_total = Loss_data + lambda * sum(|w|)
```

效果：产生稀疏权重（部分权重精确为零）。自动特征选择。

### Dropout

训练时随机将一部分神经元的输出置零：

```
训练：h = activation(Wx + b); mask = random(0,1) > p; h = h * mask / (1-p)
测试：h = activation(Wx + b)  # 不dropout，但输出已缩放
```

为什么有效：

1. **隐式集成**：每次训练不同的子网络，相当于训练2^n个网络的集成
2. **减少共适应**：神经元不能依赖特定其他神经元，必须独立有用
3. **类似Bagging**：不同子网络做出不同错误，平均时抵消

Dropout率p通常0.2-0.5。全连接层用更多，卷积层用更少或不使用。

### 早停

在验证误差开始上升时停止训练：

1. 每个epoch后计算验证误差
2. 如果验证误差连续patience个epoch没有改善，停止
3. 使用验证误差最低时的模型参数

patience通常5-20。太小可能过早停止，太大会浪费计算。

### 数据增强

通过变换训练数据创建新样本：

图像：翻转、旋转、裁剪、颜色抖动、随机擦除
文本：同义词替换、随机删除、回译
表格：SMOTE、添加噪声

数据增强是最有效的正则化形式之一，因为它增加了训练数据的多样性。

### 批归一化

虽然主要用于加速训练，批归一化也有轻微正则化效果：

- 每个小批量的均值和方差引入噪声
- 类似Dropout的随机性
- 通常不作为主要正则化手段

## 动手构建

```python
import random
import math

def sigmoid(x):
    x = max(-500, min(500, x))
    return 1.0 / (1.0 + math.exp(-x))

class DropoutLayer:
    def __init__(self, drop_rate=0.5):
        self.drop_rate = drop_rate
        self.mask = None
        self.training = True

    def forward(self, x):
        if self.training:
            self.mask = [random.random() > self.drop_rate for _ in range(len(x))]
            scale = 1.0 / (1.0 - self.drop_rate)
            return [xi * m * scale for xi, m in zip(x, self.mask)]
        else:
            return x

    def backward(self, grad):
        if self.training:
            scale = 1.0 / (1.0 - self.drop_rate)
            return [gi * m * scale for gi, m in zip(grad, self.mask)]
        else:
            return grad

class RegularizedMLP:
    def __init__(self, layer_sizes, lr=0.01, l2_lambda=0.001, dropout_rate=0.3):
        self.lr = lr
        self.l2_lambda = l2_lambda
        self.dropout_rate = dropout_rate
        self.weights = []
        self.biases = []
        self.dropouts = []
        random.seed(42)
        for i in range(len(layer_sizes) - 1):
            fan_in = layer_sizes[i]
            w = [[random.gauss(0, math.sqrt(2.0 / fan_in)) for _ in range(fan_in)]
                 for _ in range(layer_sizes[i + 1])]
            b = [0.0] * layer_sizes[i + 1]
            self.weights.append(w)
            self.biases.append(b)
            if i < len(layer_sizes) - 2:
                self.dropouts.append(DropoutLayer(dropout_rate))

    def forward(self, x, training=True):
        for d in self.dropouts:
            d.training = training
        self.activations = [x]
        self.z_values = []
        current = x
        for i in range(len(self.weights)):
            z = [sum(self.weights[i][j][k] * current[k] for k in range(len(current))) + self.biases[i][j]
                 for j in range(len(self.weights[i]))]
            self.z_values.append(z)
            current = [sigmoid(zi) for zi in z]
            if i < len(self.dropouts):
                current = self.dropouts[i].forward(current)
            self.activations.append(current)
        return current

    def train_step(self, x, y):
        output = self.forward(x, training=True)
        loss = -sum(yi * math.log(max(oi, 1e-15)) + (1 - yi) * math.log(max(1 - oi, 1e-15))
                    for yi, oi in zip(y, output))
        l2_loss = self.l2_lambda * sum(w ** 2 for layer in self.weights for row in layer for w in row)
        loss += l2_loss

        delta = [(output[j] - y[j]) * output[j] * (1 - output[j]) for j in range(len(y))]
        for i in range(len(self.weights) - 1, -1, -1):
            for j in range(len(self.weights[i])):
                for k in range(len(self.weights[i][j])):
                    grad = delta[j] * self.activations[i][k] + 2 * self.l2_lambda * self.weights[i][j][k]
                    self.weights[i][j][k] -= self.lr * grad
                self.biases[i][j] -= self.lr * delta[j]
            if i > 0:
                new_delta = [0.0] * len(self.weights[i - 1])
                for j in range(len(self.weights[i - 1])):
                    error = sum(self.weights[i][k][j] * delta[k] for k in range(len(delta)))
                    h = self.activations[i][j]
                    new_delta[j] = error * h * (1 - h)
                if i - 1 < len(self.dropouts):
                    new_delta = self.dropouts[i - 1].backward(new_delta)
                delta = new_delta
        return loss

random.seed(42)
N = 200
X = [[random.gauss(0, 1), random.gauss(0, 1)] for _ in range(N)]
y = [[1 if x[0] + x[1] > 0 else 0] for x in X]

split = int(0.8 * N)
X_train, X_val = X[:split], X[split:]
y_train, y_val = y[:split], y[split:]

print("=== Regularization Demo ===")
print("\nTraining with L2 + Dropout:")

mlp = RegularizedMLP([2, 32, 16, 1], lr=0.1, l2_lambda=0.001, dropout_rate=0.3)
best_val_loss = float('inf')
patience = 20
no_improve = 0

for epoch in range(200):
    train_loss = 0
    for xi, yi in zip(X_train, y_train):
        train_loss += mlp.train_step(xi, yi)
    train_loss /= len(X_train)

    val_loss = 0
    for xi, yi in zip(X_val, y_val):
        output = mlp.forward(xi, training=False)
        val_loss += -sum(yi[j] * math.log(max(output[j], 1e-15)) + (1 - yi[j]) * math.log(max(1 - output[j], 1e-15))
                        for j in range(len(yi)))
    val_loss /= len(X_val)

    if val_loss < best_val_loss:
        best_val_loss = val_loss
        no_improve = 0
    else:
        no_improve += 1

    if epoch % 50 == 0:
        print(f"  Epoch {epoch}: train_loss={train_loss:.4f}, val_loss={val_loss:.4f}")

    if no_improve >= patience:
        print(f"  Early stopping at epoch {epoch}")
        break
```

## 练习

1. 在相同数据上比较：无正则化、仅L2、仅Dropout、L2+Dropout。哪个组合泛化最好？
2. 实现不同Dropout率(0.1, 0.3, 0.5, 0.7)的实验。太高或太低的Dropout率有什么问题？
3. 实现标签平滑（Label Smoothing）作为正则化方法。展示它如何改善模型校准。

## 关键术语

| 术语     | 人们怎么说     | 实际含义                             |
| -------- | -------------- | ------------------------------------ |
| 正则化   | "防止过拟合"   | 约束模型使其学习简单泛化的模式       |
| Dropout  | "随机关神经元" | 训练时随机置零部分神经元，防止共适应 |
| 权重衰减 | "缩小权重"     | 每步将权重缩小一点，等价于L2正则化   |
| 早停     | "见好就收"     | 验证误差不再改善时停止训练           |
| 数据增强 | "变出新数据"   | 通过变换原始数据创建新训练样本       |
