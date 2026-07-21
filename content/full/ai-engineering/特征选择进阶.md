---
title: 特征选择进阶
description: 特征选择移除噪声和冗余特征，让模型更快更准更可解释
module: 'ai-engineering'
difficulty: intermediate
tags:
  - 特征选择
  - 过滤法
  - 包装法
  - 嵌入法
  - 降维
related:
  - 'ai-engineering/损失函数'
  - 'ai-engineering/特征工程与选择'
  - 'ai-engineering/投机解码推理服务器'
  - 'ai-engineering/凸优化'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 特征选择进阶

> 特征选择移除噪声和冗余特征，让模型更快更准更可解释。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 2 第1-17课
**时间:** ~60 分钟

## 学习目标

- 实现过滤法特征选择（相关系数、互信息、卡方检验）
- 实现包装法特征选择（递归特征消除、前向选择）
- 使用嵌入法特征选择（L1正则化、树模型重要性）
- 理解何时使用每种方法及其计算复杂度

## 问题

你有1000个特征但只有100个样本。维度灾难：高维空间中，所有点都离得很远，距离度量失效，模型过拟合。你需要找到真正有用的特征，丢弃噪声和冗余。

特征选择不是降维（PCA创建新特征）。特征选择选择原始特征的子集，保持可解释性。

## 概念

### 三大类方法

**过滤法**：独立评估每个特征。快速，不考虑特征交互。

**包装法**：用模型评估特征子集。慢但考虑交互。

**嵌入法**：模型训练时自动选择。速度和质量折中。

### 过滤法

**方差阈值**：移除方差接近零的特征（几乎不变化，无信息量）。

**相关系数**：选择与目标相关性高的特征。移除特征间高度相关的冗余特征。

**互信息**：衡量特征和目标之间的信息共享。捕获非线性关系。

**卡方检验**：检验分类特征和分类目标是否独立。仅适用于非负特征。

### 包装法

**前向选择**：从空集开始，逐步添加使模型性能提升最大的特征。

**后向消除**：从全部特征开始，逐步移除对性能影响最小的特征。

**递归特征消除(RFE)**：训练模型，移除最不重要的特征，重复。需要模型提供特征重要性。

### 嵌入法

**L1正则化(Lasso)**：L1惩罚使不重要特征的权重精确为零。自动特征选择。

**树模型重要性**：决策树和随机森林计算每个特征的不纯度减少量。

**正则化路径**：随正则化强度增加，观察哪些特征最后才被移除。

### 维度灾难

高维空间中：

- 所有点之间的距离趋于相同（距离度量失效）
- 需要指数级更多数据才能覆盖空间
- 过拟合风险急剧增加

经验法则：样本数应至少是特征数的5-10倍。

## 动手构建

```python
import random
import math

def variance_threshold(X, threshold=0.01):
    n = len(X)
    d = len(X[0])
    selected = []
    for j in range(d):
        mean = sum(X[i][j] for i in range(n)) / n
        var = sum((X[i][j] - mean) ** 2 for i in range(n)) / n
        if var > threshold:
            selected.append(j)
    return selected

def correlation_with_target(X, y, threshold=0.1):
    n = len(y)
    y_mean = sum(y) / n
    y_std = (sum((yi - y_mean) ** 2 for yi in y) / n) ** 0.5
    selected = []
    for j in range(len(X[0])):
        x_mean = sum(X[i][j] for i in range(n)) / n
        x_std = (sum((X[i][j] - x_mean) ** 2 for i in range(n)) / n) ** 0.5
        if x_std == 0 or y_std == 0:
            continue
        cov = sum((X[i][j] - x_mean) * (y[i] - y_mean) for i in range(n)) / n
        corr = cov / (x_std * y_std)
        if abs(corr) >= threshold:
            selected.append((j, corr))
    return selected

def mutual_information(X_col, y, n_bins=10):
    x_min, x_max = min(X_col), max(X_col)
    if x_max == x_min:
        return 0
    bin_width = (x_max - x_min) / n_bins
    n = len(y)
    y_classes = set(y)
    mi = 0
    for b in range(n_bins):
        x_in_bin = [i for i in range(n) if x_min + b * bin_width <= X_col[i] < x_min + (b + 1) * bin_width]
        if not x_in_bin:
            continue
        p_x = len(x_in_bin) / n
        for c in y_classes:
            y_in_bin = [i for i in x_in_bin if y[i] == c]
            if not y_in_bin:
                continue
            p_xy = len(y_in_bin) / n
            p_y = sum(1 for yi in y if yi == c) / n
            mi += p_xy * math.log(p_xy / (p_x * p_y) + 1e-10)
    return mi

def forward_selection(X, y, model_class, max_features=None, **model_kwargs):
    n_features = len(X[0])
    if max_features is None:
        max_features = n_features
    selected = []
    remaining = list(range(n_features))
    best_scores = []

    for step in range(max_features):
        best_score = -1
        best_feat = None
        for feat in remaining:
            current = selected + [feat]
            X_sub = [[X[i][j] for j in current] for i in range(len(X))]
            n = len(y)
            split = int(0.8 * n)
            X_tr, X_val = X_sub[:split], X_sub[split:]
            y_tr, y_val = y[:split], y[split:]
            model = model_class(**model_kwargs)
            model.fit(X_tr, y_tr)
            score = model.accuracy(X_val, y_val)
            if score > best_score:
                best_score = score
                best_feat = feat

        selected.append(best_feat)
        remaining.remove(best_feat)
        best_scores.append(best_score)
        print(f"  Step {step+1}: Added feature {best_feat}, accuracy={best_score:.4f}")

        if len(best_scores) > 3 and best_scores[-1] <= best_scores[-2]:
            print(f"  No improvement. Stopping.")
            break

    return selected, best_scores

def recursive_feature_elimination(X, y, n_to_select, model_class, **model_kwargs):
    remaining = list(range(len(X[0])))
    eliminated = []

    while len(remaining) > n_to_select:
        X_sub = [[X[i][j] for j in remaining] for i in range(len(X))]
        model = model_class(**model_kwargs)
        model.fit(X_sub, y)

        importances = []
        for j in range(len(remaining)):
            perm_X = [row[:] for row in X_sub]
            random.shuffle([row[j] for row in perm_X])
            orig_acc = model.accuracy(X_sub, y)
            perm_acc = model.accuracy(perm_X, y)
            importances.append(orig_acc - perm_acc)

        worst_idx = importances.index(min(importances))
        eliminated.append(remaining[worst_idx])
        remaining.pop(worst_idx)

    return remaining, eliminated

random.seed(42)
N = 200
n_features = 10
X = []
y = []
for _ in range(N // 2):
    row = [random.gauss(0, 1) for _ in range(n_features)]
    row[0] += 2
    row[1] += 2
    X.append(row)
    y.append(0)
for _ in range(N // 2):
    row = [random.gauss(0, 1) for _ in range(n_features)]
    row[0] -= 2
    row[1] -= 2
    X.append(row)
    y.append(1)

print("=== Feature Selection ===")
print(f"Dataset: {N} samples, {n_features} features (only features 0,1 are informative)")

print("\n1. Variance Threshold:")
selected_var = variance_threshold(X, threshold=0.5)
print(f"  Selected features: {selected_var}")

print("\n2. Correlation with Target:")
selected_corr = correlation_with_target(X, y, threshold=0.3)
for feat, corr in sorted(selected_corr, key=lambda x: -abs(x[1])):
    print(f"  Feature {feat}: correlation={corr:.4f}")

print("\n3. Mutual Information:")
mi_scores = []
for j in range(n_features):
    col = [X[i][j] for i in range(N)]
    mi = mutual_information(col, y)
    mi_scores.append((j, mi))
for feat, mi in sorted(mi_scores, key=lambda x: -x[1])[:5]:
    print(f"  Feature {feat}: MI={mi:.4f}")
```

## 实际使用

```python
from sklearn.feature_selection import SelectKBest, f_classif, mutual_info_classif, RFE
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import load_iris
import numpy as np

iris = load_iris()
X, y = iris.data, iris.target

selector = SelectKBest(f_classif, k=2)
X_new = selector.fit_transform(X, y)
print(f"SelectKBest (f_classif) selected: {selector.get_support()}")
print(f"Scores: {selector.scores_.round(2)}")

rfe = RFE(LogisticRegression(max_iter=5000), n_features_to_select=2)
X_rfe = rfe.fit_transform(X, y)
print(f"\nRFE selected: {rfe.get_support()}")
print(f"Ranking: {rfe.ranking_}")

rf = RandomForestClassifier(n_estimators=100, random_state=42)
rf.fit(X, y)
print(f"\nRandom Forest importances: {rf.feature_importances_.round(4)}")
```

## 练习

1. 生成50个特征的数据集，只有5个与目标相关。比较过滤法、包装法和嵌入法找到正确5个特征的能力。
2. 实现稳定性选择：运行特征选择100次（不同数据子集），选择被选中超过70%次数的特征。
3. 比较特征选择vs PCA降维：哪个在相同维度下给出更好的模型性能？哪个更可解释？

## 关键术语

| 术语         | 人们怎么说       | 实际含义                       |
| ------------ | ---------------- | ------------------------------ |
| 过滤法       | "独立筛选"       | 不依赖模型，独立评估每个特征   |
| 包装法       | "用模型选"       | 用模型评估特征子集的性能       |
| 嵌入法       | "训练时选"       | 模型训练过程中自动选择特征     |
| 递归特征消除 | "逐步淘汰"       | 反复训练模型移除最不重要的特征 |
| 互信息       | "信息共享量"     | 衡量两个变量之间的统计依赖程度 |
| 维度灾难     | "高维空间太稀疏" | 高维空间中需要指数级更多数据   |
