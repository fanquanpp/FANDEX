---
title: 损失函数
description: 损失函数衡量预测与真实值的差距，选择正确的损失函数是训练成功的关键
module: 'deep-learning'
difficulty: intermediate
tags:
  - 损失函数
  - MSE
  - 交叉熵
  - KL散度
  - 对比损失
related:
  - 'deep-learning/权重初始化'
  - 'deep-learning/视觉Transformer'
  - 'deep-learning/缩放定律'
  - 'deep-learning/推测解码'
prerequisites:
  - 'deep-learning/深度学习概述'
---

# 损失函数

> 损失函数衡量预测与真实值的差距。选择正确的损失函数是训练成功的关键。

**类型:** 学习
**语言:** Python
**前置条件:** Phase 3 第1-4课
**时间:** ~60 分钟

## 学习目标

- 推导MSE、交叉熵、Huber损失的梯度和性质
- 解释为什么交叉熵比MSE更适合分类
- 实现正则化损失（L1、L2）并理解其效果
- 为不同任务选择合适的损失函数

## 问题

损失函数告诉模型"你错了多少"。它将模型的预测和真实标签转化为一个数字。训练就是最小化这个数字。选择错误的损失函数，模型优化错误的目标。

## 概念

### 回归损失

**均方误差(MSE)**：L = (1/n) \* sum((y_pred - y_true)^2)

- 对大误差惩罚严重（平方放大）
- 对异常值敏感
- 梯度：dL/dy_pred = 2 \* (y_pred - y_true) / n

**平均绝对误差(MAE)**：L = (1/n) \* sum(|y_pred - y_true|)

- 对异常值更鲁棒
- 在零点不可微
- 梯度恒定，可能导致收敛振荡

**Huber损失**：小误差用平方，大误差用绝对值

- delta以下：L = 0.5 \* (y_pred - y_true)^2
- delta以上：L = delta _ |y_pred - y_true| - 0.5 _ delta^2
- 结合MSE的平滑性和MAE的鲁棒性

### 分类损失

**二元交叉熵**：L = -[y * log(p) + (1-y) * log(1-p)]

- 与sigmoid配合使用
- 梯度简洁：dL/dz = p - y
- 对自信的错误预测惩罚严重

**分类交叉熵**：L = -sum(y_k \* log(p_k))

- 与softmax配合使用
- y_k是one-hot编码

**为什么交叉熵优于MSE用于分类**：

1. MSE+sigmoid产生非凸代价曲面（多个局部最小值）
2. 交叉熵+sigmoid产生凸代价曲面（单一全局最小值）
3. 交叉熵梯度与误差成正比，MSE梯度在sigmoid饱和时消失

### 正则化损失

**L2正则化(Ridge)**：L_reg = lambda \* sum(w^2)

- 惩罚大权重
- 梯度：dL*reg/dw = 2 * lambda \_ w

**L1正则化(Lasso)**：L_reg = lambda \* sum(|w|)

- 产生稀疏解（部分权重精确为零）
- 梯度：dL_reg/dw = lambda \* sign(w)

### 特殊损失

**Focal Loss**：修改交叉熵，降低易分类样本的权重

- L = -alpha _ (1-p)^gamma _ log(p)
- gamma=2时，分类好的样本(p>0.9)损失降低100倍
- 适合类别极度不平衡的检测任务

**对比损失**：使相似样本接近，不相似样本远离

- L = max(0, margin - d(anchor, positive) + d(anchor, negative))

**KL散度**：衡量两个分布的差异

- KL(P||Q) = sum(P \* log(P/Q))
- 非对称：KL(P||Q) != KL(Q||P)

## 动手构建

```python
import math

def mse_loss(y_pred, y_true):
    return sum((p - t) ** 2 for p, t in zip(y_pred, y_true)) / len(y_pred)

def mse_grad(y_pred, y_true):
    return [2 * (p - t) / len(y_pred) for p, t in zip(y_pred, y_true)]

def mae_loss(y_pred, y_true):
    return sum(abs(p - t) for p, t in zip(y_pred, y_true)) / len(y_pred)

def huber_loss(y_pred, y_true, delta=1.0):
    total = 0
    for p, t in zip(y_pred, y_true):
        error = abs(p - t)
        if error <= delta:
            total += 0.5 * (p - t) ** 2
        else:
            total += delta * error - 0.5 * delta ** 2
    return total / len(y_pred)

def binary_cross_entropy(y_pred, y_true):
    total = 0
    for p, t in zip(y_pred, y_true):
        p = max(1e-15, min(1 - 1e-15, p))
        total -= t * math.log(p) + (1 - t) * math.log(1 - p)
    return total / len(y_pred)

def categorical_cross_entropy(y_pred, y_true):
    total = 0
    for p, t in zip(y_pred, y_true):
        p = max(p, 1e-15)
        total -= t * math.log(p)
    return total

def l2_regularization(weights, lambda_reg):
    return lambda_reg * sum(w ** 2 for layer in weights for row in layer for w in row)

def l1_regularization(weights, lambda_reg):
    return lambda_reg * sum(abs(w) for layer in weights for row in layer for w in row)

def focal_loss(y_pred, y_true, gamma=2.0, alpha=0.25):
    total = 0
    for p, t in zip(y_pred, y_true):
        p = max(1e-15, min(1 - 1e-15, p))
        if t == 1:
            total -= alpha * (1 - p) ** gamma * math.log(p)
        else:
            total -= (1 - alpha) * p ** gamma * math.log(1 - p)
    return total / len(y_pred)

def kl_divergence(p, q):
    total = 0
    for pi, qi in zip(p, q):
        if pi > 0:
            qi = max(qi, 1e-15)
            total += pi * math.log(pi / qi)
    return total

print("=== Loss Functions Demo ===")

y_pred_reg = [2.1, 3.8, 5.2, 7.1, 8.9]
y_true_reg = [2.0, 4.0, 5.0, 7.0, 9.0]

print("\nRegression Losses:")
print(f"  MSE:  {mse_loss(y_pred_reg, y_true_reg):.4f}")
print(f"  MAE:  {mae_loss(y_pred_reg, y_true_reg):.4f}")
print(f"  Huber: {huber_loss(y_pred_reg, y_true_reg, delta=1.0):.4f}")

y_pred_cls = [0.9, 0.1, 0.8, 0.3]
y_true_cls = [1.0, 0.0, 1.0, 0.0]

print("\nClassification Losses:")
print(f"  Binary Cross-Entropy: {binary_cross_entropy(y_pred_cls, y_true_cls):.4f}")
print(f"  Focal Loss (gamma=2): {focal_loss(y_pred_cls, y_true_cls, gamma=2.0):.4f}")

print("\nMSE vs Cross-Entropy with sigmoid saturation:")
for z in [-5, -2, 0, 2, 5]:
    sigmoid_z = 1 / (1 + math.exp(-z))
    mse_grad_val = 2 * (sigmoid_z - 1) * sigmoid_z * (1 - sigmoid_z)
    ce_grad_val = sigmoid_z - 1
    print(f"  z={z:>3}: sigmoid={sigmoid_z:.4f}, MSE_grad={mse_grad_val:.4f}, CE_grad={ce_grad_val:.4f}")

print("\nKL Divergence:")
p = [0.4, 0.3, 0.2, 0.1]
q = [0.25, 0.25, 0.25, 0.25]
print(f"  KL(P||Q) = {kl_divergence(p, q):.4f}")
print(f"  KL(Q||P) = {kl_divergence(q, p):.4f}")
print(f"  KL is asymmetric!")
```

## 练习

1. 在分类任务上比较MSE和交叉熵的训练曲线。展示MSE收敛更慢且可能卡在局部最小值。
2. 实现Label Smoothing交叉熵：将硬标签0/1替换为epsilon/(K-1)和1-epsilon+epsilon/(K-1)。展示它如何改善泛化。
3. 在异常值数据上比较MSE、MAE和Huber损失。Huber如何平衡两者？

## 关键术语

| 术语       | 人们怎么说   | 实际含义                                 |
| ---------- | ------------ | ---------------------------------------- |
| 损失函数   | "衡量错误"   | 将预测与真实值的差距量化为单个数字       |
| 交叉熵     | "概率距离"   | 衡量预测概率分布与真实分布的差异         |
| Huber损失  | "平滑MAE"    | 小误差用平方，大误差用线性，结合两者优点 |
| 正则化     | "惩罚复杂度" | 在损失中添加权重惩罚，防止过拟合         |
| Focal Loss | "聚焦难样本" | 降低易分类样本的损失权重，关注难样本     |
