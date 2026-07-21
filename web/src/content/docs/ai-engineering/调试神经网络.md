---
title: 调试神经网络
description: 调试神经网络是系统化的过程，从数据到模型到训练循环逐一排查问题
module: 'ai-engineering'
difficulty: advanced
tags:
  - 调试
  - 梯度检查
  - 过拟合诊断
  - 训练技巧
  - 常见错误
related:
  - 'ai-engineering/代码库RAG与跨仓库语义搜索'
  - 'ai-engineering/代码迁移代理仓库级语言与运行时升级'
  - 'ai-engineering/调试与性能分析'
  - 'ai-engineering/端到端微调管线从数据到SFT到DPO到服务'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 调试神经网络

> 调试神经网络是系统化的过程，从数据到模型到训练循环逐一排查问题。

**类型:** 学习
**语言:** Python
**前置条件:** Phase 3 第1-12课
**时间:** ~60 分钟

## 学习目标

- 按系统化顺序调试神经网络：数据 -> 模型 -> 损失 -> 优化 -> 训练循环
- 实现梯度检查验证反向传播正确性
- 诊断训练不收敛的常见原因
- 掌握让模型先在小数据上过拟合的调试策略

## 问题

神经网络不收敛。损失不下降。准确率不变。为什么？可能的原因有几十个：数据问题、初始化问题、学习率问题、梯度问题、实现bug。你需要系统化地排查。

## 概念

### 调试检查清单

按以下顺序检查，从最常见到最不常见：

1. **数据**：标签是否正确？特征是否标准化？类别是否平衡？
2. **模型**：前向传播是否正确？输出形状是否对？
3. **损失**：损失函数是否匹配任务？初始损失是否合理？
4. **梯度**：梯度是否为零/NaN/爆炸？梯度检查是否通过？
5. **优化器**：学习率是否合适？优化器是否正确更新参数？
6. **训练循环**：是否忘记zero_grad？是否在eval模式下训练？

### 第一步：先过拟合小数据

在调试任何问题之前，先让模型在少量数据（如10个样本）上过拟合。如果连小数据都过拟合不了，模型或训练代码有根本性问题。

过拟合小数据的检查：

- 训练损失应该接近0
- 训练准确率应该接近100%
- 如果不能，模型容量不够或有bug

### 常见问题及解决方案

**损失不下降**：

- 学习率太小或太大
- 梯度消失（检查各层梯度范数）
- 数据标签错误
- 损失函数与任务不匹配

**损失下降但验证不改善**：

- 过拟合（加正则化、Dropout、数据增强）
- 训练/验证数据分布不同
- 数据泄漏

**梯度为NaN**：

- 学习率太大
- 除以零（加epsilon）
- log(0)（加小常数）
- 梯度爆炸（梯度裁剪）

**训练很慢**：

- 学习率太小
- 模型太大
- 数据加载是瓶颈
- 没有使用GPU

### 梯度检查

用数值梯度验证解析梯度：

```python
def gradient_check(model, x, y, epsilon=1e-5):
    for param_name, param in model.named_parameters():
        analytical_grad = param.grad
        numerical_grad = torch.zeros_like(param)
        for i in range(param.numel()):
            flat = param.view(-1)
            original = flat[i].item()
            flat[i] = original + epsilon
            loss_plus = loss_fn(model(x), y)
            flat[i] = original - epsilon
            loss_minus = loss_fn(model(x), y)
            flat[i] = original
            numerical_grad.view(-1)[i] = (loss_plus - loss_minus) / (2 * epsilon)
        diff = (analytical_grad - numerical_grad).norm() / max(analytical_grad.norm(), numerical_grad.norm(), 1e-8)
        if diff > 1e-4:
            print(f"  {param_name}: gradient check FAILED (diff={diff:.2e})")
```

### 监控指标

训练时监控：

- 训练损失（应该稳定下降）
- 验证损失（应该下降，然后可能上升=过拟合）
- 训练准确率（应该上升）
- 验证准确率（应该上升）
- 梯度范数（应该稳定，不应为0或爆炸）
- 参数范数（不应增长到无穷）
- 学习率（确认调度正确）

### 常见实现错误

1. **忘记optimizer.zero_grad()**：梯度累积而非替换
2. **训练时用model.eval()**：Dropout和BatchNorm行为错误
3. **验证时用model.train()**：Dropout仍然激活
4. **损失函数输入形状错误**：BCELoss vs BCEWithLogitsLoss
5. **softmax+交叉熵重复**：使用CrossEntropyLoss（已含softmax）
6. **数据未标准化**：特征尺度差异大
7. **标签从0开始**：PyTorch要求标签从0开始

## 动手构建

```python
import random
import math

def sigmoid(x):
    x = max(-500, min(500, x))
    return 1.0 / (1.0 + math.exp(-x))

class BuggyNetwork:
    """故意包含常见bug的网络，用于练习调试"""

    def __init__(self, sizes):
        self.weights = []
        self.biases = []
        for i in range(len(sizes) - 1):
            # Bug 1: 初始化太大
            w = [[random.gauss(0, 10) for _ in range(sizes[i])] for _ in range(sizes[i+1])]
            b = [0.0] * sizes[i+1]
            self.weights.append(w)
            self.biases.append(b)

    def forward(self, x):
        current = x
        for i in range(len(self.weights)):
            z = [sum(self.weights[i][j][k] * current[k] for k in range(len(current))) + self.biases[i][j]
                 for j in range(len(self.weights[i]))]
            current = [sigmoid(zi) for zi in z]
        return current

class FixedNetwork:
    """修复后的网络"""

    def __init__(self, sizes, lr=0.01):
        self.weights = []
        self.biases = []
        self.lr = lr
        for i in range(len(sizes) - 1):
            # Fix 1: He初始化
            std = math.sqrt(2.0 / sizes[i])
            w = [[random.gauss(0, std) for _ in range(sizes[i])] for _ in range(sizes[i+1])]
            b = [0.0] * sizes[i+1]
            self.weights.append(w)
            self.biases.append(b)

    def forward(self, x):
        current = x
        for i in range(len(self.weights)):
            z = [sum(self.weights[i][j][k] * current[k] for k in range(len(current))) + self.biases[i][j]
                 for j in range(len(self.weights[i]))]
            # Fix 2: 隐藏层用ReLU，输出层用sigmoid
            if i < len(self.weights) - 1:
                current = [max(0, zi) for zi in z]
            else:
                current = [sigmoid(zi) for zi in z]
        return current

    def train_step(self, x, y):
        # 前向传播（保存中间值）
        activations = [x]
        pre_activations = []
        current = x
        for i in range(len(self.weights)):
            z = [sum(self.weights[i][j][k] * current[k] for k in range(len(current))) + self.biases[i][j]
                 for j in range(len(self.weights[i]))]
            pre_activations.append(z)
            if i < len(self.weights) - 1:
                current = [max(0, zi) for zi in z]
            else:
                current = [sigmoid(zi) for zi in z]
            activations.append(current)

        # 反向传播
        output = activations[-1]
        delta = [(output[j] - y[j]) for j in range(len(y))]

        for i in range(len(self.weights) - 1, -1, -1):
            for j in range(len(self.weights[i])):
                for k in range(len(self.weights[i][j])):
                    self.weights[i][j][k] -= self.lr * delta[j] * activations[i][k]
                self.biases[i][j] -= self.lr * delta[j]

            if i > 0:
                new_delta = []
                for j in range(len(self.weights[i-1])):
                    error = sum(self.weights[i][k][j] * delta[k] for k in range(len(delta)))
                    if pre_activations[i-1][j] > 0:
                        new_delta.append(error)
                    else:
                        new_delta.append(0.0)
                delta = new_delta

random.seed(42)
X_small = [[0, 0], [0, 1], [1, 0], [1, 1]]
y_small = [[0], [1], [1], [0]]

print("=== Debugging Neural Networks ===")

print("\nStep 1: Can the model overfit small data?")
print("Testing on 4 XOR samples...")

net = FixedNetwork([2, 8, 1], lr=0.5)
for epoch in range(2000):
    for xi, yi in zip(X_small, y_small):
        net.train_step(xi, yi)

correct = sum(1 for xi, yi in zip(X_small, y_small) if (net.forward(xi)[0] > 0.5) == (yi[0] > 0.5))
print(f"XOR accuracy on 4 samples: {correct}/4")

if correct == 4:
    print("Model can overfit small data. Architecture is OK.")
else:
    print("Model CANNOT overfit small data. There may be a bug.")

print("\nStep 2: Check initial loss")
net2 = FixedNetwork([2, 8, 1], lr=0.5)
initial_loss = 0
for xi, yi in zip(X_small, y_small):
    pred = net2.forward(xi)[0]
    initial_loss -= yi[0] * math.log(max(pred, 1e-15)) + (1 - yi[0]) * math.log(max(1 - pred, 1e-15))
initial_loss /= len(X_small)
expected_random = math.log(2)  # 二分类随机猜测的期望损失
print(f"Initial loss: {initial_loss:.4f} (random baseline: {expected_random:.4f})")
if abs(initial_loss - expected_random) < 0.3:
    print("Initial loss is reasonable.")
else:
    print("Initial loss is off. Check initialization or loss function.")

print("\nStep 3: Monitor gradient norms during training")
print("(In practice, track this across all layers and training steps)")

print("\n=== Common Debugging Checklist ===")
checklist = [
    "1. Data: labels correct? features standardized? classes balanced?",
    "2. Model: forward pass correct? output shape right?",
    "3. Loss: matches task? initial value reasonable?",
    "4. Gradients: not zero/NaN/explosive? gradient check passes?",
    "5. Optimizer: learning rate appropriate? updating correctly?",
    "6. Training loop: zero_grad? eval/train mode correct?",
    "7. Overfit small data first before debugging generalization",
]
for item in checklist:
    print(f"  {item}")
```

## 练习

1. 故意在神经网络中引入一个bug（如忘记zero_grad、错误的损失函数、错误的初始化）。用检查清单找出并修复它。
2. 实现完整的梯度检查工具。对每一层的权重和偏置验证梯度。
3. 构建一个训练监控工具，记录每个epoch的损失、准确率、梯度范数和参数范数。用这些指标诊断训练问题。

## 关键术语

| 术语         | 人们怎么说       | 实际含义                                     |
| ------------ | ---------------- | -------------------------------------------- |
| 过拟合小数据 | "先学简单的"     | 确保模型能在少量数据上完美拟合，验证代码正确 |
| 梯度检查     | "验证梯度对不对" | 用数值梯度验证解析梯度的正确性               |
| 梯度消失     | "梯度没了"       | 反向传播中梯度逐层衰减到接近零               |
| 梯度爆炸     | "梯度太大"       | 反向传播中梯度逐层增长到无穷                 |
| NaN          | "不是数字"       | 数值计算错误导致的无效值                     |
