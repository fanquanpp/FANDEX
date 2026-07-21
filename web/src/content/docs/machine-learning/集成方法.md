---
title: 集成方法
description: 集成方法组合多个弱学习器创建强学习器，三个臭皮匠顶个诸葛亮
module: 'machine-learning'
difficulty: intermediate
tags:
  - 集成学习
  - Bagging
  - Boosting
  - 随机森林
  - AdaBoost
  - 梯度提升
related:
  - 'machine-learning/多智能体强化学习'
  - 'machine-learning/仿真到现实迁移'
  - 'machine-learning/奖励建模与RLHF'
  - 'machine-learning/决策树与随机森林'
prerequisites:
  - 'machine-learning/机器学习概述'
---

# 集成方法

> 集成方法组合多个弱学习器创建强学习器。三个臭皮匠顶个诸葛亮。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 2 第1-10课
**时间:** ~90 分钟

## 学习目标

- 解释为什么组合多个模型通常比单个模型更好
- 从零实现Bagging、AdaBoost和梯度提升
- 比较Bagging和Boosting的优缺点
- 理解为什么多样性是集成成功的关键

## 问题

单个决策树容易过拟合。单个逻辑回归可能欠拟合。如果你训练多个不同的模型，让它们投票呢？如果每个模型犯不同的错误，多数投票会抵消个别错误。这就是集成的核心思想。

## 概念

### 为什么集成有效

集成减少误差通过两种机制：

1. **减少方差**：Bagging训练多个独立模型，平均预测。独立错误抵消。
2. **减少偏差**：Boosting序列训练模型，每个新模型修正前一个的错误。

关键条件：模型必须做出不同的错误。如果所有模型犯同样的错误，集成不会改善。

### Bagging（Bootstrap Aggregating）

1. 从训练数据中有放回抽取bootstrap样本
2. 在每个样本上训练一个基学习器
3. 平均预测（回归）或多数投票（分类）

随机森林是Bagging + 随机特征子集的特例。

### Boosting

Boosting序列训练弱学习器，每个关注前一个犯错的样本。

**AdaBoost**：

1. 初始化所有样本权重相等
2. 训练弱学习器（通常是浅决策树）
3. 计算加权错误率
4. 增加错误分类样本的权重
5. 重复，最终预测是加权投票

**梯度提升**：

1. 初始化预测为均值
2. 计算残差（预测与实际的差距）
3. 训练弱学习器拟合残差
4. 更新预测 = 旧预测 + learning_rate \* 新树预测
5. 重复

### Stacking

训练多个不同类型的基模型，然后用另一个模型（元学习器）组合它们的预测。比简单投票更灵活，但更容易过拟合。

## 动手构建

```python
import random
import math
from collections import Counter

class DecisionStump:
    def __init__(self):
        self.feature = None
        self.threshold = None
        self.left_value = None
        self.right_value = None

    def fit(self, X, y, sample_weights=None):
        if sample_weights is None:
            sample_weights = [1.0] * len(y)
        best_error = float('inf')
        n_features = len(X[0])
        for f in range(n_features):
            values = sorted(set(row[f] for row in X))
            for i in range(len(values) - 1):
                threshold = (values[i] + values[i + 1]) / 2
                left_idx = [j for j in range(len(y)) if X[j][f] <= threshold]
                right_idx = [j for j in range(len(y)) if X[j][f] > threshold]
                if not left_idx or not right_idx:
                    continue
                left_counts = Counter(y[j] for j in left_idx)
                right_counts = Counter(y[j] for j in right_idx)
                left_pred = left_counts.most_common(1)[0][0]
                right_pred = right_counts.most_common(1)[0][0]
                error = sum(sample_weights[j] for j in range(len(y))
                           if (y[j] != left_pred and X[j][f] <= threshold) or
                              (y[j] != right_pred and X[j][f] > threshold))
                if error < best_error:
                    best_error = error
                    self.feature = f
                    self.threshold = threshold
                    self.left_value = left_pred
                    self.right_value = right_pred
        return self

    def predict(self, X):
        return [self.left_value if x[self.feature] <= self.threshold else self.right_value for x in X]


class BaggingClassifier:
    def __init__(self, n_estimators=10, max_depth=3):
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.models = []

    def fit(self, X, y):
        self.models = []
        n = len(y)
        for _ in range(self.n_estimators):
            indices = [random.randint(0, n - 1) for _ in range(n)]
            X_boot = [X[i] for i in indices]
            y_boot = [y[i] for i in indices]
            from collections import Counter
            stump = DecisionStump()
            stump.fit(X_boot, y_boot)
            self.models.append(stump)
        return self

    def predict(self, X):
        all_preds = [model.predict(X) for model in self.models]
        result = []
        for i in range(len(X)):
            votes = [all_preds[j][i] for j in range(len(self.models))]
            result.append(Counter(votes).most_common(1)[0][0])
        return result

    def accuracy(self, X, y):
        preds = self.predict(X)
        return sum(p == t for p, t in zip(preds, y)) / len(y)


class AdaBoost:
    def __init__(self, n_estimators=50):
        self.n_estimators = n_estimators
        self.models = []
        self.alphas = []

    def fit(self, X, y):
        n = len(y)
        y_ada = [1 if label == 1 else -1 for label in y]
        weights = [1.0 / n] * n

        for t in range(self.n_estimators):
            stump = DecisionStump()
            stump.fit(X, y_ada, weights)
            preds = stump.predict(X)
            error = sum(weights[i] for i in range(n) if preds[i] != y_ada[i])
            error = max(error, 1e-10)
            if error >= 0.5:
                break
            alpha = 0.5 * math.log((1 - error) / error)
            for i in range(n):
                if preds[i] != y_ada[i]:
                    weights[i] *= math.exp(alpha)
                else:
                    weights[i] *= math.exp(-alpha)
            total = sum(weights)
            weights = [w / total for w in weights]
            self.models.append(stump)
            self.alphas.append(alpha)
        return self

    def predict(self, X):
        n = len(X)
        scores = [0.0] * n
        for model, alpha in zip(self.models, self.alphas):
            preds = model.predict(X)
            for i in range(n):
                scores[i] += alpha * preds[i]
        return [1 if s > 0 else 0 for s in scores]

    def accuracy(self, X, y):
        preds = self.predict(X)
        return sum(p == t for p, t in zip(preds, y)) / len(y)


class GradientBoosting:
    def __init__(self, n_estimators=50, learning_rate=0.1, max_depth=3):
        self.n_estimators = n_estimators
        self.learning_rate = learning_rate
        self.max_depth = max_depth
        self.models = []
        self.initial_prediction = None

    def fit(self, X, y):
        self.initial_prediction = sum(y) / len(y)
        current_preds = [self.initial_prediction] * len(y)

        for t in range(self.n_estimators):
            residuals = [y[i] - current_preds[i] for i in range(len(y))]
            stump = DecisionStump()
            stump.fit_regression(X, residuals)
            tree_preds = stump.predict(X)
            for i in range(len(y)):
                current_preds[i] += self.learning_rate * tree_preds[i]
            self.models.append(stump)
        return self

    def predict(self, X):
        preds = [self.initial_prediction] * len(X)
        for model in self.models:
            tree_preds = model.predict(X)
            for i in range(len(X)):
                preds[i] += self.learning_rate * tree_preds[i]
        return [1 if p > 0.5 else 0 for p in preds]

    def accuracy(self, X, y):
        preds = self.predict(X)
        return sum(p == t for p, t in zip(preds, y)) / len(y)


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

split = int(0.8 * N)
X_train, X_test = X[:split], X[split:]
y_train, y_test = y[:split], y[split:]

print("=== Single Decision Stump ===")
stump = DecisionStump()
stump.fit(X_train, y_train)
preds = stump.predict(X_test)
print(f"Test accuracy: {sum(p == t for p, t in zip(preds, y_test)) / len(y_test):.4f}")

print("\n=== Bagging (10 stumps) ===")
bag = BaggingClassifier(n_estimators=10)
bag.fit(X_train, y_train)
print(f"Test accuracy: {bag.accuracy(X_test, y_test):.4f}")

print("\n=== AdaBoost (30 stumps) ===")
ada = AdaBoost(n_estimators=30)
ada.fit(X_train, y_train)
print(f"Test accuracy: {ada.accuracy(X_test, y_test):.4f}")
```

## 实际使用

```python
from sklearn.ensemble import BaggingClassifier, AdaBoostClassifier, GradientBoostingClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.datasets import make_moons
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import numpy as np

X, y = make_moons(n_samples=500, noise=0.3, random_state=42)
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3, random_state=42)

dt = DecisionTreeClassifier(max_depth=3)
dt.fit(X_tr, y_tr)
print(f"Single tree: {accuracy_score(y_te, dt.predict(X_te)):.4f}")

bag = BaggingClassifier(n_estimators=50, random_state=42)
bag.fit(X_tr, y_tr)
print(f"Bagging:     {accuracy_score(y_te, bag.predict(X_te)):.4f}")

ada = AdaBoostClassifier(n_estimators=50, random_state=42)
ada.fit(X_tr, y_tr)
print(f"AdaBoost:    {accuracy_score(y_te, ada.predict(X_te)):.4f}")

gb = GradientBoostingClassifier(n_estimators=100, learning_rate=0.1, max_depth=3, random_state=42)
gb.fit(X_tr, y_tr)
print(f"Grad Boost:  {accuracy_score(y_te, gb.predict(X_te)):.4f}")
```

## 练习

1. 比较Bagging中基学习器数量：5、10、50、100、200。绘制测试准确率vs数量。什么时候收益递减？
2. 实现梯度提升回归（拟合残差而不是分类错误）。在回归数据集上测试。
3. 实现Stacking：训练逻辑回归、决策树和KNN，然后用逻辑回归作为元学习器组合它们的预测。与单个模型比较。

## 关键术语

| 术语     | 人们怎么说     | 实际含义                                     |
| -------- | -------------- | -------------------------------------------- |
| 集成方法 | "多个模型投票" | 组合多个模型的预测以提高性能                 |
| Bagging  | "并行训练"     | 有放回抽样并行训练多个模型，平均预测减少方差 |
| Boosting | "序列纠错"     | 序列训练模型，每个修正前一个的错误，减少偏差 |
| AdaBoost | "加权投票"     | 增加错误分类样本权重的Boosting方法           |
| 梯度提升 | "拟合残差"     | 每棵新树拟合当前预测残差的Boosting方法       |
| Stacking | "模型叠罗汉"   | 用元学习器组合多个不同类型基模型的预测       |
