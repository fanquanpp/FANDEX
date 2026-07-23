---
title: ML流水线
description: ML流水线将预处理、训练和预测串联成可复现、可部署的自动化流程
module: 'machine-learning'
difficulty: intermediate
tags:
  - ML流水线
  - Pipeline
  - 数据预处理
  - 自动化
  - 部署
related:
  - 'machine-learning/KNN与距离度量'
  - 'machine-learning/MDP状态动作与奖励'
  - 'machine-learning/PPO近端策略优化'
  - 'machine-learning/Q学习与SARSA'
prerequisites:
  - 'machine-learning/机器学习概述'
---

# ML流水线

> ML流水线将预处理、训练和预测串联成可复现、可部署的自动化流程。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 2 第1-12课
**时间:** ~60 分钟

## 学习目标

- 构建端到端ML流水线，从原始数据到预测
- 使用sklearn Pipeline防止数据泄漏
- 实现自定义transformer集成到流水线中
- 保存和加载训练好的流水线用于部署

## 问题

你训练了一个模型，准确率90%。你把代码交给工程师部署。他们说："你的训练代码用了标准化，但部署代码忘了。预测全错了。"

ML流水线解决这个问题。它将所有步骤——预处理、特征工程、模型训练——打包成一个对象。训练时和预测时使用完全相同的变换。没有遗漏步骤，没有数据泄漏。

## 概念

### 为什么需要流水线

没有流水线：

1. 训练时：标准化 -> 编码 -> 训练
2. 部署时：编码 -> 训练（忘了标准化！）

有流水线：

1. 训练时：Pipeline(标准化, 编码, 训练).fit(X, y)
2. 部署时：pipeline.predict(X_new)（所有步骤自动执行）

### 数据泄漏

最常见的错误：在全量数据上做预处理，然后划分训练/测试集。测试集信息泄漏到了训练过程中。

正确做法：在流水线内做预处理。fit只在训练数据上，transform应用到训练和测试数据。

### sklearn Pipeline

```python
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression

pipe = Pipeline([
    ('scaler', StandardScaler()),
    ('model', LogisticRegression())
])

pipe.fit(X_train, y_train)
pipe.predict(X_test)
```

### ColumnTransformer

不同列需要不同预处理：数值列标准化，分类列one-hot编码。

```python
from sklearn.compose import ColumnTransformer

preprocessor = ColumnTransformer([
    ('num', StandardScaler(), numeric_features),
    ('cat', OneHotEncoder(), categorical_features)
])
```

### 自定义Transformer

```python
from sklearn.base import BaseEstimator, TransformerMixin

class LogTransformer(BaseEstimator, TransformerMixin):
    def fit(self, X, y=None):
        return self
    def transform(self, X):
        return np.log1p(X)
```

### 模型持久化

```python
import joblib
joblib.dump(pipeline, 'model.pkl')
loaded = joblib.load('model.pkl')
loaded.predict(X_new)
```

## 动手构建

```python
import random
import math
import json

class SimplePipeline:
    def __init__(self, steps):
        self.steps = steps
        self.fitted = False

    def fit(self, X, y=None):
        X_current = X
        for name, transformer in self.steps[:-1]:
            X_current = transformer.fit_transform(X_current, y)
        name, model = self.steps[-1]
        model.fit(X_current, y)
        self.fitted = True
        return self

    def predict(self, X):
        X_current = X
        for name, transformer in self.steps[:-1]:
            X_current = transformer.transform(X_current)
        name, model = self.steps[-1]
        return model.predict(X_current)

    def save(self, filepath):
        data = {'steps': [(name, obj.to_dict() if hasattr(obj, 'to_dict') else None)
                          for name, obj in self.steps]}
        with open(filepath, 'w') as f:
            json.dump(data, f)

class StandardScaler:
    def __init__(self):
        self.means = None
        self.stds = None

    def fit(self, X, y=None):
        n = len(X)
        d = len(X[0])
        self.means = [sum(X[i][j] for i in range(n)) / n for j in range(d)]
        self.stds = []
        for j in range(d):
            var = sum((X[i][j] - self.means[j]) ** 2 for i in range(n)) / n
            self.stds.append(var ** 0.5 if var > 0 else 1)
        return self

    def transform(self, X):
        return [[(X[i][j] - self.means[j]) / self.stds[j] for j in range(len(X[0]))]
                for i in range(len(X))]

    def fit_transform(self, X, y=None):
        self.fit(X, y)
        return self.transform(X)

class OneHotEncoder:
    def __init__(self):
        self.categories = None

    def fit(self, X, y=None):
        self.categories = sorted(set(X))
        return self

    def transform(self, X):
        return [[1 if x == cat else 0 for cat in self.categories] for x in X]

    def fit_transform(self, X, y=None):
        self.fit(X, y)
        return self.transform(X)

random.seed(42)
N = 200
X_num = [[random.gauss(50, 15), random.gauss(30, 10)] for _ in range(N)]
y = [1 if x[0] > 55 and x[1] > 35 else 0 for x in X_num]

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X_num)

split = int(0.8 * N)
X_train, X_test = X_scaled[:split], X_scaled[split:]
y_train, y_test = y[:split], y[split:]

print("=== ML Pipeline Demo ===")
print(f"Train size: {len(X_train)}, Test size: {len(X_test)}")
print(f"Class balance: {sum(y_train)}/{len(y_train)} positive")

print("\nKey principle: fit() only on training data, transform() on both")
print("This prevents data leakage from test to train")
```

## 实际使用

```python
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.datasets import fetch_openml
import numpy as np

from sklearn.datasets import load_iris
iris = load_iris()
X, y = iris.data, iris.target
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3, random_state=42)

pipe = Pipeline([
    ('scaler', StandardScaler()),
    ('model', LogisticRegression(max_iter=5000))
])

pipe.fit(X_tr, y_tr)
print(f"Pipeline test accuracy: {pipe.score(X_te, y_te):.4f}")

scores = cross_val_score(pipe, X, y, cv=5)
print(f"CV accuracy: {scores.mean():.4f} (+/- {scores.std():.4f})")

import joblib
joblib.dump(pipe, 'iris_pipeline.pkl')
loaded_pipe = joblib.load('iris_pipeline.pkl')
print(f"Loaded pipeline accuracy: {loaded_pipe.score(X_te, y_te):.4f}")
```

## 练习

1. 构建包含ColumnTransformer的流水线：数值列标准化，分类列one-hot编码。在混合类型数据集上测试。
2. 实现自定义Transformer：LogTransformer（对数变换）、OutlierRemover（移除异常值）。集成到流水线中。
3. 比较有流水线保护vs无流水线保护（全量数据预处理后划分）的交叉验证分数。展示数据泄漏如何导致过高估计。

## 关键术语

| 术语              | 人们怎么说     | 实际含义                                   |
| ----------------- | -------------- | ------------------------------------------ |
| 流水线            | "自动化流程"   | 将预处理和模型训练串联成单一对象           |
| 数据泄漏          | "偷看测试数据" | 训练时使用了测试集信息，导致过于乐观的评估 |
| ColumnTransformer | "列分组处理"   | 对不同列应用不同预处理                     |
| 模型持久化        | "保存模型"     | 将训练好的模型保存到磁盘，部署时加载       |
| 自定义Transformer | "自己写的变换" | 实现fit/transform接口的用户定义预处理步骤  |
