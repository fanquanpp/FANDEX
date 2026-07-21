---
title: 异常检测
description: 异常检测在数据中找到不寻常的模式，从欺诈检测到设备故障预警
module: 'ai-engineering'
difficulty: intermediate
tags:
  - 异常检测
  - 离群点
  - 孤立森林
  - 统计方法
  - 欺诈检测
related:
  - 'ai-engineering/信息论'
  - 'ai-engineering/学习率调度'
  - 'ai-engineering/音乐生成'
  - 'ai-engineering/音频分类'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 异常检测

> 异常检测在数据中找到不寻常的模式，从欺诈检测到设备故障预警。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 2 第1-15课
**时间:** ~60 分钟

## 学习目标

- 使用统计方法（Z-score、IQR）检测异常
- 从零实现孤立森林算法
- 理解监督异常检测和无监督异常检测的区别
- 选择合适的异常检测方法并设置阈值

## 问题

你运营一个支付系统。99.9%的交易是正常的，0.1%是欺诈。你不能标记每笔交易让人工审核——太多了。你需要自动识别最可疑的交易。

异常检测识别显著偏离正常行为的数据点。应用包括欺诈检测、入侵检测、设备故障预警、医疗诊断。

## 概念

### 什么是异常

**点异常**：单个数据点不正常。一笔100万美元的转账。

**上下文异常**：在特定上下文中不正常。夏天30度正常，冬天30度异常。

**集体异常**：单个点正常，但组合异常。一系列小额转账到不同账户。

### 统计方法

**Z-score方法**：计算每个点到均值的标准化距离。|Z| > 3的点可能是异常。

**IQR方法**：Q1 - 1.5*IQR以下或Q3 + 1.5*IQR以上的点是异常。

**假设检验**：假设数据服从某种分布，检验每个点是否符合。

### 基于距离的方法

**KNN距离**：计算每个点到其k个最近邻的平均距离。距离大的点可能是异常。

**局部离群因子(LOF)**：比较点的局部密度与其邻居的局部密度。密度显著低于邻居的点异常。

### 孤立森林

孤立森林的核心思想：异常点少且不同，因此更容易被"孤立"。

1. 随机选择一个特征
2. 随机选择该特征的一个分割值
3. 分割数据为两组
4. 递归重复，直到每个点被孤立

异常点平均需要更少的分割就被孤立（路径更短）。正常点需要更多分割。

### 阈值选择

异常检测的阈值决定多少比例被标记为异常。

- 太严格：漏掉真实异常（高假负率）
- 太宽松：太多误报（高假正率）

根据业务成本调整：漏掉一个欺诈交易损失多少？标记一个正常交易损失多少？

## 动手构建

```python
import random
import math

def z_score_anomalies(data, threshold=3.0):
    n = len(data)
    mean = sum(data) / n
    std = (sum((x - mean) ** 2 for x in data) / n) ** 0.5
    if std == 0:
        return []
    anomalies = []
    for i, x in enumerate(data):
        z = abs((x - mean) / std)
        if z > threshold:
            anomalies.append((i, x, z))
    return anomalies

def iqr_anomalies(data, factor=1.5):
    sorted_data = sorted(data)
    n = len(sorted_data)
    q1 = sorted_data[n // 4]
    q3 = sorted_data[3 * n // 4]
    iqr = q3 - q1
    lower = q1 - factor * iqr
    upper = q3 + factor * iqr
    anomalies = []
    for i, x in enumerate(data):
        if x < lower or x > upper:
            anomalies.append((i, x))
    return anomalies

class IsolationTree:
    def __init__(self, max_depth=10):
        self.max_depth = max_depth
        self.tree = None

    def fit(self, X, depth=0):
        n = len(X)
        if depth >= self.max_depth or n <= 1:
            self.tree = {'type': 'leaf', 'size': n}
            return self

        n_features = len(X[0])
        feature = random.randint(0, n_features - 1)
        values = [x[feature] for x in X]
        min_val, max_val = min(values), max(values)

        if min_val == max_val:
            self.tree = {'type': 'leaf', 'size': n}
            return self

        threshold = random.uniform(min_val, max_val)
        left = [x for x in X if x[feature] <= threshold]
        right = [x for x in X if x[feature] > threshold]

        self.tree = {
            'type': 'node',
            'feature': feature,
            'threshold': threshold,
            'left': IsolationTree(self.max_depth),
            'right': IsolationTree(self.max_depth)
        }
        self.tree['left'].fit(left, depth + 1)
        self.tree['right'].fit(right, depth + 1)
        return self

    def path_length(self, x):
        return self._path_length(x, self.tree, 0)

    def _path_length(self, x, node, depth):
        if node['type'] == 'leaf':
            return depth + self._c(node['size'])
        if x[node['feature']] <= node['threshold']:
            return self._path_length(x, node['left'].tree, depth + 1)
        else:
            return self._path_length(x, node['right'].tree, depth + 1)

    def _c(self, n):
        if n <= 1:
            return 0
        return 2 * (math.log(n - 1) + 0.5772) - 2 * (n - 1) / n


class IsolationForest:
    def __init__(self, n_trees=100, max_depth=10):
        self.n_trees = n_trees
        self.max_depth = max_depth
        self.trees = []
        self.n_samples = None

    def fit(self, X):
        self.n_samples = len(X)
        self.trees = []
        for _ in range(self.n_trees):
            n = len(X)
            sample_size = min(256, n)
            indices = random.sample(range(n), sample_size)
            sample = [X[i] for i in indices]
            tree = IsolationTree(self.max_depth)
            tree.fit(sample)
            self.trees.append(tree)
        return self

    def anomaly_score(self, x):
        avg_path = sum(tree.path_length(x) for tree in self.trees) / self.n_trees
        c_n = 2 * (math.log(self.n_samples - 1) + 0.5772) - 2 * (self.n_samples - 1) / self.n_samples
        return 2 ** (-avg_path / c_n)

    def predict(self, X, threshold=0.6):
        return [(i, self.anomaly_score(x)) for i, x in enumerate(X) if self.anomaly_score(x) > threshold]


random.seed(42)
N = 200
X_normal = [[random.gauss(0, 1), random.gauss(0, 1)] for _ in range(N)]
X_anomalies = [[random.gauss(8, 1), random.gauss(8, 1)] for _ in range(10)]
X_all = X_normal + X_anomalies
labels = [0] * N + [1] * 10

print("=== Anomaly Detection ===")

print("\n1. Z-Score Method (on first feature):")
feature_0 = [x[0] for x in X_all]
anomalies_z = z_score_anomalies(feature_0, threshold=2.5)
print(f"  Found {len(anomalies_z)} anomalies")
for idx, val, z in anomalies_z[:5]:
    print(f"    Index {idx}: value={val:.2f}, z-score={z:.2f}")

print("\n2. IQR Method (on first feature):")
anomalies_iqr = iqr_anomalies(feature_0)
print(f"  Found {len(anomalies_iqr)} anomalies")

print("\n3. Isolation Forest:")
iso_forest = IsolationForest(n_trees=50, max_depth=10)
iso_forest.fit(X_normal)
anomalies_iso = iso_forest.predict(X_all, threshold=0.6)
print(f"  Found {len(anomalies_iso)} anomalies")
true_anomalies = set(range(N, N + 10))
detected = set(idx for idx, score in anomalies_iso)
tp = len(true_anomalies & detected)
print(f"  True positives: {tp}/{len(true_anomalies)}")
```

## 实际使用

```python
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor
import numpy as np

np.random.seed(42)
X_normal = np.random.randn(200, 2)
X_outliers = np.random.uniform(low=6, high=8, size=(10, 2))
X = np.vstack([X_normal, X_outliers])

iso = IsolationForest(contamination=0.05, random_state=42)
iso.fit(X)
preds = iso.predict(X)
print(f"Isolation Forest: {sum(preds == -1)} anomalies detected")

lof = LocalOutlierFactor(contamination=0.05)
preds_lof = lof.fit_predict(X)
print(f"LOF: {sum(preds_lof == -1)} anomalies detected")
```

## 练习

1. 比较Z-score、IQR和孤立森林在包含不同类型异常的数据集上的表现。
2. 实现LOF（局部离群因子）算法。与孤立森林比较。
3. 在信用卡欺诈数据集上测试。调整阈值使假正率不超过1%。计算召回率。

## 关键术语

| 术语     | 人们怎么说   | 实际含义                           |
| -------- | ------------ | ---------------------------------- |
| 异常检测 | "找异常"     | 识别显著偏离正常模式的数据点       |
| 孤立森林 | "随机切割"   | 通过随机分割孤立异常点的算法       |
| Z-score  | "标准化距离" | 数据点到均值的标准差数             |
| IQR      | "四分位距"   | Q3-Q1，衡量数据分散程度            |
| LOF      | "局部密度"   | 比较点与其邻居的局部密度来检测异常 |
