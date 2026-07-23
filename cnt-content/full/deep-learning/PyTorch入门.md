---
title: PyTorch入门
description: PyTorch是深度学习的工业标准框架，动态计算图让调试和实验更直观
module: 'deep-learning'
difficulty: beginner
tags:
  - PyTorch
  - 张量
  - 自动微分
  - GPU
  - 训练循环
related:
  - 'deep-learning/JAX入门'
  - 'deep-learning/KV缓存与Flash注意力'
  - 'deep-learning/T5与BART编码器解码器'
prerequisites:
  - 'deep-learning/深度学习概述'
---

# PyTorch入门

> PyTorch是深度学习的工业标准框架，动态计算图让调试和实验更直观。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 3 第1-10课
**时间:** ~90 分钟

## 学习目标

- 使用PyTorch张量进行数值计算，理解其与NumPy的关系
- 利用autograd自动计算梯度
- 构建nn.Module模型并实现完整训练循环
- 将模型迁移到GPU加速训练

## 问题

从零实现一切有助于理解，但生产需要高效框架。PyTorch提供：

- GPU加速的张量运算
- 自动微分
- 预构建的层、损失函数和优化器
- 数据加载工具

## 概念

### 张量(Tensor)

PyTorch张量类似NumPy数组，但可以：

- 在GPU上运行
- 自动计算梯度
- 与深度学习模型无缝集成

```python
import torch

x = torch.tensor([1.0, 2.0, 3.0])
x = torch.randn(3, 4)  # 3x4随机矩阵
x = torch.zeros(2, 3)
x = torch.from_numpy(numpy_array)  # 从NumPy转换
```

### 自动微分(autograd)

设置requires_grad=True，PyTorch自动追踪所有操作并在反向传播时计算梯度。

```python
x = torch.tensor([2.0], requires_grad=True)
y = x ** 2 + 3 * x + 1
y.backward()
print(x.grad)  # dy/dx = 2x + 3 = 7
```

### nn.Module

所有模型的基类。定义网络结构和前向传播。

```python
import torch.nn as nn

class Net(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc1 = nn.Linear(784, 128)
        self.fc2 = nn.Linear(128, 10)

    def forward(self, x):
        x = torch.relu(self.fc1(x))
        x = self.fc2(x)
        return x
```

### 训练循环模板

```python
for epoch in range(num_epochs):
    for batch_x, batch_y in dataloader:
        optimizer.zero_grad()
        output = model(batch_x)
        loss = loss_fn(output, batch_y)
        loss.backward()
        optimizer.step()
```

### GPU加速

```python
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model = model.to(device)
x = x.to(device)
```

## 动手构建

```python
# 以下代码需要安装PyTorch
# pip install torch

import torch
import torch.nn as nn
import torch.optim as optim

print("=== PyTorch Basics ===")

# 张量操作
x = torch.randn(3, 4)
print(f"Tensor shape: {x.shape}")
print(f"Tensor dtype: {x.dtype}")

# 自动微分
x = torch.tensor([2.0], requires_grad=True)
y = x ** 2 + 3 * x + 1
y.backward()
print(f"\nAutograd: dy/dx at x=2: {x.grad.item()} (expected: 7)")

# 构建模型
class SimpleNet(nn.Module):
    def __init__(self, input_dim, hidden_dim, output_dim):
        super().__init__()
        self.fc1 = nn.Linear(input_dim, hidden_dim)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(hidden_dim, output_dim)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        x = self.relu(self.fc1(x))
        x = self.sigmoid(self.fc2(x))
        return x

model = SimpleNet(2, 16, 1)
print(f"\nModel:\n{model}")

# 生成数据
torch.manual_seed(42)
N = 500
X = torch.randn(N, 2)
y = (X[:, 0] + X[:, 1] > 0).float().unsqueeze(1)

split = int(0.8 * N)
X_train, X_test = X[:split], X[split:]
y_train, y_test = y[:split], y[split:]

# 训练
criterion = nn.BCELoss()
optimizer = optim.Adam(model.parameters(), lr=0.01)

print("\n=== Training ===")
for epoch in range(100):
    optimizer.zero_grad()
    output = model(X_train)
    loss = criterion(output, y_train)
    loss.backward()
    optimizer.step()

    if epoch % 20 == 0:
        with torch.no_grad():
            predictions = (model(X_test) > 0.5).float()
            accuracy = (predictions == y_test).float().mean()
        print(f"  Epoch {epoch:3d} | Loss: {loss.item():.4f} | Test Acc: {accuracy.item():.4f}")

# 最终评估
with torch.no_grad():
    predictions = (model(X_test) > 0.5).float()
    accuracy = (predictions == y_test).float().mean()
print(f"\nFinal Test Accuracy: {accuracy.item():.4f}")

# 保存和加载模型
torch.save(model.state_dict(), 'simple_model.pt')
loaded_model = SimpleNet(2, 16, 1)
loaded_model.load_dict(model.state_dict())
print("Model saved and loaded successfully")

# GPU检查
print(f"\nCUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
```

## 练习

1. 用PyTorch实现一个3层MLP在MNIST数据集上训练。达到95%以上准确率。
2. 实现自定义Dataset和DataLoader，从CSV文件加载数据。
3. 比较CPU和GPU训练速度。在什么数据量下GPU加速明显？

## 关键术语

| 术语       | 人们怎么说   | 实际含义                                 |
| ---------- | ------------ | ---------------------------------------- |
| 张量       | "多维数组"   | PyTorch的核心数据结构，支持GPU和自动微分 |
| autograd   | "自动求导"   | PyTorch自动追踪计算并计算梯度            |
| nn.Module  | "模型基类"   | 所有神经网络模块的基类                   |
| DataLoader | "数据加载器" | 批量加载和预处理数据的工具               |
| CUDA       | "GPU计算"    | NVIDIA GPU加速计算平台                   |
