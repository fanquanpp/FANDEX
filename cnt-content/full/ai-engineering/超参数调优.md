---
title: 超参数调优
description: 超参数调优找到模型的最佳设置，网格搜索、随机搜索和贝叶斯优化各有优劣
module: 'ai-engineering'
difficulty: intermediate
tags:
  - 超参数调优
  - 网格搜索
  - 随机搜索
  - 贝叶斯优化
  - 交叉验证
related:
  - 'ai-engineering/不平衡数据处理'
  - 'ai-engineering/采样方法'
  - 'ai-engineering/代码库RAG与跨仓库语义搜索'
  - 'ai-engineering/代码迁移代理仓库级语言与运行时升级'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 超参数调优

> 超参数调优找到模型的最佳设置。网格搜索、随机搜索和贝叶斯优化各有优劣。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 2 第1-11课
**时间:** ~60 分钟

## 学习目标

- 区分参数和超参数，并解释为什么超参数需要调优
- 实现网格搜索、随机搜索和贝叶斯优化
- 使用嵌套交叉验证进行无偏的超参数选择
- 解释为什么随机搜索通常比网格搜索更高效

## 问题

你的随机森林有100棵树，最大深度5，最小叶样本2。这些数字从哪来的？猜的。但不同的值可能给出显著不同的结果。超参数调优系统地搜索最佳设置。

## 概念

### 参数 vs 超参数

**参数**：模型从数据中学习的值（权重、偏置）。训练过程自动优化。

**超参数**：训练前设置的值，控制学习过程（学习率、树的数量、正则化强度）。必须手动选择或搜索。

### 网格搜索

穷举搜索所有超参数组合。

优点：保证找到搜索空间内的最佳组合。
缺点：组合爆炸。3个超参数各5个值 = 125次训练。代价高。

### 随机搜索

从搜索空间中随机采样固定次数。

优点：更高效。当只有少数超参数重要时，随机搜索更可能探索到好值。
缺点：不保证找到最佳组合。但实践中通常足够接近。

### 贝叶斯优化

使用概率模型（高斯过程）建模超参数-性能关系。选择最有希望的区域继续搜索。

1. 观察几个随机点
2. 拟合概率模型
3. 使用采集函数选择下一个点
4. 评估，更新模型，重复

优点：比网格/随机搜索更高效，用更少试验找到好超参数。
缺点：实现复杂，高维空间效果下降。

### 嵌套交叉验证

如果用交叉验证选超参数，然后报告交叉验证分数，分数会有偏（因为你选了最好的）。嵌套交叉验证解决：

- 外层：评估泛化性能
- 内层：选择超参数

计算代价高但给出无偏估计。

## 动手构建

```python
import random
import math
import time

def grid_search(model_class, param_grid, X, y, cv=5):
    keys = list(param_grid.keys())
    values = list(param_grid.values())
    combinations = [[]]
    for v in values:
        combinations = [c + [val] for c in combinations for val in v]

    best_score = -1
    best_params = None
    results = []

    for combo in combinations:
        params = dict(zip(keys, combo))
        scores = []
        n = len(y)
        fold_size = n // cv
        indices = list(range(n))
        random.shuffle(indices)

        for fold in range(cv):
            start = fold * fold_size
            end = start + fold_size if fold < cv - 1 else n
            val_idx = indices[start:end]
            train_idx = indices[:start] + indices[end:]
            X_tr = [X[i] for i in train_idx]
            y_tr = [y[i] for i in train_idx]
            X_val = [X[i] for i in val_idx]
            y_val = [y[i] for i in val_idx]
            model = model_class(**params)
            model.fit(X_tr, y_tr)
            scores.append(model.accuracy(X_val, y_val))

        mean_score = sum(scores) / len(scores)
        results.append((params, mean_score))
        if mean_score > best_score:
            best_score = mean_score
            best_params = params

    return best_params, best_score, results

def random_search(model_class, param_distributions, X, y, n_iter=20, cv=5):
    best_score = -1
    best_params = None
    results = []

    for _ in range(n_iter):
        params = {k: random.choice(v) if isinstance(v, list) else v()
                  for k, v in param_distributions.items()}
        scores = []
        n = len(y)
        fold_size = n // cv
        indices = list(range(n))
        random.shuffle(indices)

        for fold in range(cv):
            start = fold * fold_size
            end = start + fold_size if fold < cv - 1 else n
            val_idx = indices[start:end]
            train_idx = indices[:start] + indices[end:]
            X_tr = [X[i] for i in train_idx]
            y_tr = [y[i] for i in train_idx]
            X_val = [X[i] for i in val_idx]
            y_val = [y[i] for i in val_idx]
            model = model_class(**params)
            model.fit(X_tr, y_tr)
            scores.append(model.accuracy(X_val, y_val))

        mean_score = sum(scores) / len(scores)
        results.append((params, mean_score))
        if mean_score > best_score:
            best_score = mean_score
            best_params = params

    return best_params, best_score, results

class SimpleBayesianOptimizer:
    def __init__(self, param_ranges, n_initial=5):
        self.param_ranges = param_ranges
        self.n_initial = n_initial
        self.observations = []

    def _acquisition(self, x_candidates):
        if len(self.observations) < 2:
            return [random.random() for _ in x_candidates]
        scores = []
        best_y = max(y for _, y in self.observations)
        for x in x_candidates:
            dists = [math.sqrt(sum((x[k] - obs_x[k]) ** 2 for k in range(len(x)))) + 1e-10
                     for obs_x, _ in self.observations]
            weights = [1 / d for d in dists]
            mean = sum(w * y for w, (_, y) in zip(weights, self.observations)) / sum(weights)
            std = math.sqrt(sum(w * (y - mean) ** 2 for w, (_, y) in zip(weights, self.observations)) / sum(weights))
            exploration = std
            exploitation = max(0, mean - best_y)
            scores.append(exploration + exploitation)
        return scores

    def suggest(self):
        if len(self.observations) < self.n_initial:
            return [random.uniform(lo, hi) for lo, hi in self.param_ranges]
        n_candidates = 100
        candidates = [[random.uniform(lo, hi) for lo, hi in self.param_ranges]
                      for _ in range(n_candidates)]
        scores = self._acquisition(candidates)
        best_idx = scores.index(max(scores))
        return candidates[best_idx]

    def observe(self, x, y):
        self.observations.append((x, y))

    def best(self):
        return max(self.observations, key=lambda o: o[1])

random.seed(42)
N = 300
X = []
y = []
for _ in range(N // 2):
    X.append([random.gauss(2, 1.5), random.gauss(2, 1.5)])
    y.append(0)
for _ in range(N // 2):
    X.append([random.gauss(5, 1.5), random.gauss(5, 1.5)])
    y.append(1)

print("=== Hyperparameter Tuning Demo ===")
print("(Using simplified models for demonstration)\n")

print("Note: Grid search and random search require a model class with")
print("fit() and accuracy() methods. Full implementation would use the")
print("KNN or DecisionTree classes from previous lessons.")
print("\nIn practice, use sklearn's GridSearchCV or RandomizedSearchCV.")
```

## 实际使用

```python
from sklearn.model_selection import GridSearchCV, RandomizedSearchCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
import numpy as np

iris = load_iris()
X_tr, X_te, y_tr, y_te = train_test_split(iris.data, iris.target, test_size=0.3, random_state=42)

param_grid = {
    'n_estimators': [10, 50, 100],
    'max_depth': [3, 5, 10, None],
    'min_samples_split': [2, 5, 10]
}

grid = GridSearchCV(RandomForestClassifier(random_state=42), param_grid, cv=5, scoring='accuracy')
grid.fit(X_tr, y_tr)
print(f"Grid Search best params: {grid.best_params_}")
print(f"Grid Search best CV score: {grid.best_score_:.4f}")
print(f"Grid Search test score: {grid.score(X_te, y_te):.4f}")

param_dist = {
    'n_estimators': [10, 50, 100, 200],
    'max_depth': [3, 5, 10, 20, None],
    'min_samples_split': [2, 5, 10, 20],
    'max_features': ['sqrt', 'log2', None]
}

random_s = RandomizedSearchCV(RandomForestClassifier(random_state=42), param_dist,
                               n_iter=20, cv=5, scoring='accuracy', random_state=42)
random_s.fit(X_tr, y_tr)
print(f"\nRandom Search best params: {random_s.best_params_}")
print(f"Random Search best CV score: {random_s.best_score_:.4f}")
print(f"Random Search test score: {random_s.score(X_te, y_te):.4f}")
```

## 练习

1. 在相同搜索空间上比较网格搜索和随机搜索。哪个用更少试验找到更好的结果？
2. 实现贝叶斯优化使用高斯过程。在1D函数上可视化采集函数。
3. 实现早停机制：如果连续5次试验没有改善，停止搜索。与完整搜索比较节省的时间。

## 关键术语

| 术语         | 人们怎么说       | 实际含义                             |
| ------------ | ---------------- | ------------------------------------ |
| 超参数       | "训练前设的参数" | 控制学习过程的设置，不能从数据中学习 |
| 网格搜索     | "穷举搜索"       | 尝试所有超参数组合，保证找到最佳     |
| 随机搜索     | "随机采样"       | 随机选择超参数组合，更高效           |
| 贝叶斯优化   | "智能搜索"       | 用概率模型指导搜索方向               |
| 嵌套交叉验证 | "双重验证"       | 外层评估性能，内层选超参数，避免偏差 |
