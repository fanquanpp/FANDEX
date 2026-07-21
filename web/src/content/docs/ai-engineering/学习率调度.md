---
title: 学习率调度
description: 学习率调度让训练先快后慢，在快速收敛和精细调优之间找到平衡
module: 'ai-engineering'
difficulty: intermediate
tags:
  - 学习率调度
  - 余弦退火
  - 预热
  - 步长衰减
  - 学习率查找
related:
  - 'ai-engineering/向量与矩阵运算'
  - 'ai-engineering/信息论'
  - 'ai-engineering/异常检测'
  - 'ai-engineering/音乐生成'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 学习率调度

> 学习率调度让训练先快后慢，在快速收敛和精细调优之间找到平衡。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 3 第1-8课
**时间:** ~45 分钟

## 学习目标

- 实现步长衰减、指数衰减、余弦退火和预热调度
- 使用学习率查找器确定初始学习率
- 解释为什么预热对大模型训练至关重要
- 比较不同调度策略的训练曲线

## 问题

学习率太大：训练振荡甚至发散。学习率太小：收敛太慢。理想情况：开始时用大学习率快速接近最优，然后逐渐减小精细调优。

学习率调度自动调整学习率，无需手动干预。

## 概念

### 常用调度策略

**步长衰减**：每step_size个epoch，学习率乘以gamma。

```
lr = initial_lr * gamma^(epoch // step_size)
```

**指数衰减**：每个epoch学习率乘以gamma。

```
lr = initial_lr * gamma^epoch
```

**余弦退火**：学习率沿余弦曲线从初始值衰减到最小值。

```
lr = min_lr + 0.5 * (max_lr - min_lr) * (1 + cos(pi * t / T))
```

**预热(Warmup)**：开始时线性增加学习率，然后按其他策略衰减。

```
if t < warmup_steps:
    lr = initial_lr * t / warmup_steps
else:
    lr = schedule(t - warmup_steps)
```

**周期性学习率**：学习率在范围内周期性变化（三角策略、带热重启的余弦退火）。

### 学习率查找器

Leslie Smith提出的方法：从很小的学习率开始，每个小批量指数增大，记录损失。绘制损失vs学习率，选择损失下降最快的学习率。

### 为什么预热有效

大模型开始时权重随机，梯度方向不可靠。大学习率会导致参数更新过大，训练不稳定。预热让模型先用小学习率稳定，再逐步增大。

Transformer训练几乎总是使用预热。

### 1Cycle策略

一个训练周期：

1. 预热：lr从低到高
2. 退火：lr从高到低（甚至低于初始值）
3. 最后几个epoch用极小学习率精调

## 动手构建

```python
import math

class StepLR:
    def __init__(self, initial_lr, step_size, gamma=0.1):
        self.initial_lr = initial_lr
        self.step_size = step_size
        self.gamma = gamma
    def get_lr(self, epoch):
        return self.initial_lr * (self.gamma ** (epoch // self.step_size))

class ExponentialLR:
    def __init__(self, initial_lr, gamma=0.95):
        self.initial_lr = initial_lr
        self.gamma = gamma
    def get_lr(self, epoch):
        return self.initial_lr * (self.gamma ** epoch)

class CosineAnnealingLR:
    def __init__(self, initial_lr, min_lr, T_max):
        self.initial_lr = initial_lr
        self.min_lr = min_lr
        self.T_max = T_max
    def get_lr(self, epoch):
        return self.min_lr + 0.5 * (self.initial_lr - self.min_lr) * (1 + math.cos(math.pi * epoch / self.T_max))

class WarmupCosineLR:
    def __init__(self, initial_lr, min_lr, T_max, warmup_epochs):
        self.initial_lr = initial_lr
        self.min_lr = min_lr
        self.T_max = T_max
        self.warmup_epochs = warmup_epochs
    def get_lr(self, epoch):
        if epoch < self.warmup_epochs:
            return self.initial_lr * epoch / self.warmup_epochs
        adjusted_epoch = epoch - self.warmup_epochs
        adjusted_T = self.T_max - self.warmup_epochs
        return self.min_lr + 0.5 * (self.initial_lr - self.min_lr) * (1 + math.cos(math.pi * adjusted_epoch / adjusted_T))

class OneCycleLR:
    def __init__(self, max_lr, min_lr, total_epochs, warmup_fraction=0.3):
        self.max_lr = max_lr
        self.min_lr = min_lr
        self.total_epochs = total_epochs
        self.warmup_epochs = int(total_epochs * warmup_fraction)
    def get_lr(self, epoch):
        if epoch < self.warmup_epochs:
            return self.min_lr + (self.max_lr - self.min_lr) * epoch / self.warmup_epochs
        else:
            progress = (epoch - self.warmup_epochs) / (self.total_epochs - self.warmup_epochs)
            return self.min_lr + (self.max_lr - self.min_lr) * 0.5 * (1 + math.cos(math.pi * progress))

print("=== Learning Rate Schedules ===")
total_epochs = 100

schedules = {
    'Step (decay 0.1 every 30)': StepLR(0.1, 30, 0.1),
    'Exponential (0.95)': ExponentialLR(0.1, 0.95),
    'Cosine Annealing': CosineAnnealingLR(0.1, 0.001, total_epochs),
    'Warmup+Cosine': WarmupCosineLR(0.1, 0.001, total_epochs, 10),
    '1Cycle': OneCycleLR(0.1, 0.001, total_epochs, 0.3),
}

for name, schedule in schedules.items():
    print(f"\n{name}:")
    for epoch in [0, 10, 20, 30, 50, 70, 90, 99]:
        lr = schedule.get_lr(epoch)
        print(f"  Epoch {epoch:3d}: lr={lr:.6f}")
```

## 实际使用

```python
import torch
from torch.optim.lr_scheduler import StepLR, CosineAnnealingLR, OneCycleLR

model = torch.nn.Linear(10, 2)
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

scheduler = CosineAnnealingLR(optimizer, T_max=100, eta_min=1e-6)

for epoch in range(100):
    optimizer.step()
    scheduler.step()
```

## 练习

1. 在相同任务上比较固定学习率和余弦退火。展示调度策略的收敛优势。
2. 实现学习率查找器：从1e-7开始，每个批量乘以1.1，记录损失。绘制损失vs学习率曲线。
3. 实现带热重启的余弦退火（SGDR）：周期性重启学习率。展示它如何帮助逃离局部最小值。

## 关键术语

| 术语       | 人们怎么说   | 实际含义                         |
| ---------- | ------------ | -------------------------------- |
| 学习率调度 | "动态调步长" | 训练过程中自动调整学习率的策略   |
| 余弦退火   | "余弦衰减"   | 学习率沿余弦曲线从高到低         |
| 预热       | "先慢后快"   | 开始时线性增加学习率，稳定训练   |
| 1Cycle     | "一个周期"   | 先增后减的学习率策略             |
| 学习率查找 | "找最佳lr"   | 通过扫描学习率范围找到最佳初始值 |
