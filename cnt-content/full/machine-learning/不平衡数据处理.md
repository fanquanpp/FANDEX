---
title: 不平衡数据处理
description: 不平衡数据中少数类才是重点，重采样和代价敏感学习让模型关注少数类
module: 'machine-learning'
difficulty: intermediate
tags:
  - 不平衡数据
  - 过采样
  - 欠采样
  - SMOTE
  - 代价敏感学习
related:
  - 'machine-learning/强化学习基础'
  - 'machine-learning/Scikit-learn实战'
  - 'machine-learning/策略梯度与REINFORCE'
  - 'machine-learning/超参数调优'
prerequisites:
  - 'machine-learning/机器学习概述'
---

# 不平衡数据处理

> 不平衡数据中少数类才是重点，重采样和代价敏感学习让模型关注少数类。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 2 第1-16课
**时间:** ~60 分钟

## 学习目标

- 解释为什么准确率在不平衡数据上是误导性指标
- 实现过采样、欠采样和SMOTE
- 使用类别权重实现代价敏感学习
- 选择合适的不平衡数据处理策略

## 问题

你构建了一个欺诈检测模型，准确率99.5%。听起来很好？但数据中99.5%是正常交易。模型只需要总是预测"正常"就能达到99.5%。它没检测到任何欺诈。

不平衡数据是ML中最常见的现实挑战。欺诈检测、疾病诊断、缺陷检测——少数类才是重点，但也是最稀有的。

## 概念

### 为什么准确率不够

| 模型         | 准确率 | 检测到的欺诈 |
| ------------ | ------ | ------------ |
| 总是预测正常 | 99.5%  | 0/500        |
| 好的模型     | 98.0%  | 400/500      |

好的模型准确率更低，但实际更有用。使用精确率、召回率、F1、AUC代替。

### 重采样方法

**随机过采样**：复制少数类样本直到平衡。简单但可能过拟合（重复样本）。

**随机欠采样**：删除多数类样本直到平衡。简单但丢失信息。

**SMOTE**（合成少数类过采样技术）：在少数类样本之间插值创建新样本。

SMOTE算法：

1. 对每个少数类样本，找到k个最近邻
2. 随机选择一个邻居
3. 在样本和邻居之间的连线上随机取一点
4. 该点是新合成的样本

### 代价敏感学习

不改变数据，改变损失函数。给少数类更高权重：

```
Loss = w_minority * loss_minority + w_majority * loss_majority
```

权重通常设为类别比例的倒数：w_c = n_total / (n_classes \* n_c)。

### 阈值调整

不使用默认0.5阈值，降低阈值使更多样本被预测为少数类。根据精确率-召回率曲线选择最佳阈值。

### 集成方法

**EasyEnsemble**：欠采样多个多数类子集，每个子集训练一个分类器，集成投票。

**BalanceCascade**：逐步移除被正确分类的多数类样本，聚焦难分类样本。

## 动手构建

```python
import random
import math
from collections import Counter

def random_oversample(X, y):
    counts = Counter(y)
    min_class = min(counts, key=counts.get)
    max_count = max(counts.values())
    min_indices = [i for i in range(len(y)) if y[i] == min_class]
    X_new = list(X)
    y_new = list(y)
    while Counter(y_new)[min_class] < max_count:
        idx = random.choice(min_indices)
        X_new.append(X[idx])
        y_new.append(y[idx])
    return X_new, y_new

def random_undersample(X, y):
    counts = Counter(y)
    min_count = min(counts.values())
    X_new, y_new = [], []
    for c in counts:
        indices = [i for i in range(len(y)) if y[i] == c]
        selected = random.sample(indices, min_count)
        for i in selected:
            X_new.append(X[i])
            y_new.append(y[i])
    return X_new, y_new

def smote(X, y, k=5):
    counts = Counter(y)
    min_class = min(counts, key=counts.get)
    min_indices = [i for i in range(len(y)) if y[i] == min_class]
    max_count = max(counts.values())
    X_min = [X[i] for i in min_indices]

    X_new = list(X)
    y_new = list(y)

    n_features = len(X[0])
    for _ in range(max_count - counts[min_class]):
        idx = random.randint(0, len(X_min) - 1)
        point = X_min[idx]
        dists = [(sum((point[j] - X_min[m][j]) ** 2 for j in range(n_features)) ** 0.5, m)
                 for m in range(len(X_min)) if m != idx]
        dists.sort()
        neighbors = [m for _, m in dists[:k]]
        neighbor_idx = random.choice(neighbors)
        neighbor = X_min[neighbor_idx]
        alpha = random.random()
        new_point = [point[j] + alpha * (neighbor[j] - point[j]) for j in range(n_features)]
        X_new.append(new_point)
        y_new.append(min_class)

    return X_new, y_new

random.seed(42)
N_majority = 950
N_minority = 50
X = []
y = []
for _ in range(N_majority):
    X.append([random.gauss(0, 1), random.gauss(0, 1)])
    y.append(0)
for _ in range(N_minority):
    X.append([random.gauss(3, 1), random.gauss(3, 1)])
    y.append(1)

print("=== Imbalanced Data Handling ===")
print(f"Original: {Counter(y)}")
print(f"Imbalance ratio: {N_majority/N_minority:.1f}:1")

X_over, y_over = random_oversample(X, y)
print(f"\nAfter oversampling: {Counter(y_over)}")

X_under, y_under = random_undersample(X, y)
print(f"After undersampling: {Counter(y_under)}")

X_smote, y_smote = smote(X, y, k=5)
print(f"After SMOTE: {Counter(y_smote)}")

print("\n=== Class Weights ===")
n_total = len(y)
n_classes = len(set(y))
weights = {}
for c in set(y):
    n_c = Counter(y)[c]
    weights[c] = n_total / (n_classes * n_c)
print(f"Class weights: {weights}")
print(f"Minority weight is {weights[1]/weights[0]:.1f}x the majority weight")
```

## 实际使用

```python
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, f1_score
from sklearn.model_selection import train_test_split
from sklearn.utils import resample
from imblearn.over_sampling import SMOTE
import numpy as np

np.random.seed(42)
X_maj = np.random.randn(950, 2)
X_min = np.random.randn(50, 2) + 3
X = np.vstack([X_maj, X_min])
y = np.array([0] * 950 + [1] * 50)

X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3, random_state=42)

lr_base = LogisticRegression(random_state=42)
lr_base.fit(X_tr, y_tr)
print("Baseline:")
print(classification_report(y_te, lr_base.predict(X_te), digits=3))

lr_weighted = LogisticRegression(class_weight='balanced', random_state=42)
lr_weighted.fit(X_tr, y_tr)
print("\nClass-weighted:")
print(classification_report(y_te, lr_weighted.predict(X_te), digits=3))

sm = SMOTE(random_state=42)
X_tr_sm, y_tr_sm = sm.fit_resample(X_tr, y_tr)
lr_smote = LogisticRegression(random_state=42)
lr_smote.fit(X_tr_sm, y_tr_sm)
print("\nSMOTE:")
print(classification_report(y_te, lr_smote.predict(X_te), digits=3))
```

## 练习

1. 比较过采样、欠采样、SMOTE和类别权重在相同数据集上的F1分数。哪种方法最好？
2. 实现ADASYN（自适应合成采样）：在难分类区域生成更多合成样本。
3. 在极端不平衡数据（99.9% vs 0.1%）上测试。什么方法仍然有效？

## 关键术语

| 术语       | 人们怎么说     | 实际含义                         |
| ---------- | -------------- | -------------------------------- |
| 不平衡数据 | "类别比例悬殊" | 一个类别远多于另一个的数据集     |
| 过采样     | "复制少数类"   | 增加少数类样本使数据平衡         |
| 欠采样     | "删除多数类"   | 减少多数类样本使数据平衡         |
| SMOTE      | "合成少数类"   | 在少数类样本间插值创建新样本     |
| 代价敏感   | "少数类更贵"   | 给少数类更高权重，使模型更关注它 |
