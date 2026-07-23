---
title: 激活函数
description: 激活函数引入非线性，决定了神经元如何将输入转化为输出
module: 'deep-learning'
difficulty: beginner
tags:
  - 激活函数
  - ReLU
  - sigmoid
  - tanh
  - 梯度消失
related:
  - 'deep-learning/构建Transformer项目'
  - 'deep-learning/混合专家模型'
  - 'deep-learning/迷你框架'
  - 'deep-learning/权重初始化'
prerequisites:
  - 'deep-learning/深度学习概述'
---

# 激活函数

> 激活函数引入非线性，决定了神经元如何将输入转化为输出。

**类型:** 学习
**语言:** Python
**前置条件:** Phase 3 第1-3课
**时间:** ~60 分钟

## 学习目标

- 比较Sigmoid、Tanh、ReLU、Leaky ReLU、GELU的数学性质和梯度行为
- 解释梯度消失问题以及ReLU如何缓解它
- 为不同场景选择合适的激活函数
- 理解为什么隐藏层和输出层可能需要不同的激活函数

## 问题

没有激活函数，多层网络只是线性变换的组合，等价于单层。激活函数引入非线性，让网络能学习复杂模式。但选择错误的激活函数会导致训练失败。

## 概念

### 常用激活函数

**Sigmoid**：sigma(x) = 1 / (1 + e^(-x))

- 输出范围：(0, 1)
- 优点：输出可解释为概率
- 缺点：梯度消失（|x|大时梯度接近0）、输出非零中心、计算exp慢

**Tanh**：tanh(x) = (e^x - e^(-x)) / (e^x + e^(-x))

- 输出范围：(-1, 1)
- 优点：零中心、比sigmoid梯度更强
- 缺点：仍然有梯度消失问题

**ReLU**：f(x) = max(0, x)

- 输出范围：[0, +inf)
- 优点：计算简单、正区间梯度恒为1（缓解梯度消失）、稀疏激活
- 缺点：神经元死亡（负区间梯度为0，永远不更新）

**Leaky ReLU**：f(x) = max(alpha\*x, x)，alpha通常0.01

- 优点：解决神经元死亡问题
- 缺点：alpha需要手动选择

**GELU**：x \* Phi(x)，Phi是标准正态CDF

- 优点：平滑、在Transformer中表现好
- 缺点：计算比ReLU复杂

### 梯度消失问题

Sigmoid的导数：sigma'(x) = sigma(x) \* (1 - sigma(x))。最大值0.25（在x=0时）。

多层网络中，梯度通过链式法则相乘。10层sigmoid网络，梯度最多0.25^10 = 10^(-6)，几乎为零。前面的层几乎不更新。

ReLU的导数：正区间恒为1。梯度不会在传播中衰减。这是深度学习在2012年后取得突破的关键。

### 梯度爆炸问题

如果权重初始化不当，梯度可能在反向传播中指数增长。解决方案：梯度裁剪、合适的权重初始化。

### 输出层激活函数

输出层的选择取决于任务：

| 任务   | 激活函数 | 原因         |
| ------ | -------- | ------------ |
| 二分类 | Sigmoid  | 输出概率     |
| 多分类 | Softmax  | 输出概率分布 |
| 回归   | 无/恒等  | 输出任意值   |

### 经验法则

- 隐藏层默认使用ReLU
- 如果ReLU导致太多神经元死亡，用Leaky ReLU
- Transformer中常用GELU
- 输出层根据任务选择
- Sigmoid和Tanh主要用于特定场景（LSTM门控、二分类输出）

## 动手构建

```python
import math

def sigmoid(x):
    x = max(-500, min(500, x))
    return 1.0 / (1.0 + math.exp(-x))

def sigmoid_grad(x):
    s = sigmoid(x)
    return s * (1 - s)

def tanh(x):
    x = max(-500, min(500, x))
    return (math.exp(x) - math.exp(-x)) / (math.exp(x) + math.exp(-x))

def tanh_grad(x):
    t = tanh(x)
    return 1 - t * t

def relu(x):
    return max(0, x)

def relu_grad(x):
    return 1.0 if x > 0 else 0.0

def leaky_relu(x, alpha=0.01):
    return x if x > 0 else alpha * x

def leaky_relu_grad(x, alpha=0.01):
    return 1.0 if x > 0 else alpha

def gelu(x):
    return 0.5 * x * (1 + math.tanh(math.sqrt(2 / math.pi) * (x + 0.044715 * x ** 3)))

def gelu_grad(x):
    cdf = 0.5 * (1 + math.tanh(math.sqrt(2 / math.pi) * (x + 0.044715 * x ** 3)))
    pdf = math.exp(-0.5 * x * x) / math.sqrt(2 * math.pi)
    return cdf + x * pdf

print("=== Activation Functions Comparison ===")
print(f"{'x':>6} {'Sigmoid':>10} {'Tanh':>10} {'ReLU':>10} {'LeakyReLU':>10} {'GELU':>10}")
for x in [-5, -2, -1, -0.5, 0, 0.5, 1, 2, 5]:
    print(f"{x:>6.1f} {sigmoid(x):>10.4f} {tanh(x):>10.4f} {relu(x):>10.4f} {leaky_relu(x):>10.4f} {gelu(x):>10.4f}")

print(f"\n{'x':>6} {'Sig_grad':>10} {'Tanh_grad':>10} {'ReLU_grad':>10} {'LR_grad':>10} {'GELU_grad':>10}")
for x in [-5, -2, -1, -0.5, 0, 0.5, 1, 2, 5]:
    print(f"{x:>6.1f} {sigmoid_grad(x):>10.4f} {tanh_grad(x):>10.4f} {relu_grad(x):>10.4f} {leaky_relu_grad(x):>10.4f} {gelu_grad(x):>10.4f}")

print("\n=== Vanishing Gradient Demo ===")
print("Gradient after 10 layers (chain rule multiplication):")
for x in [1.0, 2.0, 5.0]:
    sig_product = sigmoid_grad(x) ** 10
    tanh_product = tanh_grad(x) ** 10
    relu_product = 1.0 ** 10
    print(f"  x={x}: Sigmoid grad^10={sig_product:.2e}, Tanh grad^10={tanh_product:.2e}, ReLU grad^10={relu_product:.2e}")
```

## 练习

1. 实现Swish激活函数：f(x) = x \* sigmoid(x)。比较与ReLU的训练收敛速度。
2. 在5层网络上比较Sigmoid、Tanh和ReLU。绘制每层梯度大小vs训练步数。
3. 实现PReLU（参数化Leaky ReLU），alpha作为可学习参数。展示它如何自动适应。

## 关键术语

| 术语       | 人们怎么说       | 实际含义                                   |
| ---------- | ---------------- | ------------------------------------------ |
| 激活函数   | "非线性变换"     | 引入非线性，使网络能学习复杂模式           |
| 梯度消失   | "梯度越来越小"   | 反向传播中梯度指数衰减，前面的层几乎不更新 |
| 神经元死亡 | "ReLU永久关闭"   | ReLU在负区间梯度为0，神经元永远不更新      |
| 稀疏激活   | "大部分输出为零" | ReLU使约一半神经元输出为零，提高效率       |
| 零中心     | "正负对称"       | 输出以0为中心，有利于梯度流动              |
