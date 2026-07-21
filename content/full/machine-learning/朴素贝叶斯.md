---
title: 朴素贝叶斯
description: '朴素贝叶斯用条件概率和"朴素"独立性假设实现快速分类'
module: 'machine-learning'
difficulty: beginner
tags:
  - 朴素贝叶斯
  - 贝叶斯定理
  - 概率分类
  - 文本分类
related:
  - 'machine-learning/模型评估'
  - 'machine-learning/偏差方差与学习曲线'
  - 'machine-learning/什么是机器学习'
  - 'machine-learning/时间序列'
prerequisites:
  - 'machine-learning/机器学习概述'
---

# 朴素贝叶斯

> 朴素贝叶斯用条件概率和"朴素"独立性假设实现快速分类。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 2 第1课，Phase 1 (概率)
**时间:** ~60 分钟

## 学习目标

- 从贝叶斯定理推导朴素贝叶斯分类器
- 从零实现高斯朴素贝叶斯和多项式朴素贝叶斯
- 解释"朴素"独立性假设为何在实践中有效
- 在文本分类任务上应用朴素贝叶斯

## 问题

你想分类邮件为垃圾邮件或非垃圾邮件。你观察到垃圾邮件中"免费"出现频率很高。贝叶斯定理让你从特征概率推断类别概率。朴素贝叶斯假设所有特征条件独立——这几乎从不成立——但出奇地有效。

## 概念

### 贝叶斯定理

```
P(类别|特征) = P(特征|类别) * P(类别) / P(特征)
```

- P(类别|特征)：后验概率——看到特征后类别是多少
- P(特征|类别)：似然——该类别下特征出现的概率
- P(类别)：先验概率——类别的基础概率
- P(特征)：证据——归一化常数

### 朴素独立性假设

对于多个特征，计算P(x1, x2, ..., xn | 类别)需要知道特征的联合分布，这需要大量数据。

朴素假设：给定类别，特征之间相互独立：

```
P(x1, x2, ..., xn | 类别) = P(x1|类别) * P(x2|类别) * ... * P(xn|类别)
```

这几乎从不成立（词"免费"和"中奖"显然相关）。但分类只需要正确排序后验概率，不需要精确值。所以即使概率估计偏差很大，分类结果仍然正确。

### 三种朴素贝叶斯

**高斯朴素贝叶斯**：假设连续特征服从高斯分布。P(xi|类别)用均值和方差计算。

**多项式朴素贝叶斯**：假设特征是计数（词频）。P(xi|类别)用多项式分布。适合文本分类。

**伯努利朴素贝叶斯**：假设特征是二值的（词是否出现）。适合短文本。

### 拉普拉斯平滑

如果测试时遇到训练时没见过的特征值，P(xi|类别)=0，整个乘积变为0。拉普拉斯平滑解决：

```
P(xi|类别) = (count(xi, 类别) + alpha) / (count(类别) + alpha * n_features)
```

alpha=1是最常用的拉普拉斯平滑。

## 动手构建

```python
import random
import math

class GaussianNaiveBayes:
    def __init__(self):
        self.classes = None
        self.means = {}
        self.vars = {}
        self.priors = {}

    def fit(self, X, y):
        from collections import Counter
        self.classes = list(set(y))
        counts = Counter(y)
        n = len(y)
        for c in self.classes:
            self.priors[c] = counts[c] / n
            X_c = [X[i] for i in range(len(y)) if y[i] == c]
            n_features = len(X[0])
            self.means[c] = [sum(X_c[i][j] for i in range(len(X_c))) / len(X_c) for j in range(n_features)]
            self.vars[c] = [sum((X_c[i][j] - self.means[c][j]) ** 2 for i in range(len(X_c))) / len(X_c)
                           for j in range(n_features)]
        return self

    def _gaussian_prob(self, x, mean, var):
        if var < 1e-10:
            return 1.0 if abs(x - mean) < 1e-10 else 1e-10
        return (1.0 / math.sqrt(2 * math.pi * var)) * math.exp(-(x - mean) ** 2 / (2 * var))

    def predict_proba(self, X):
        results = []
        for x in X:
            posteriors = {}
            for c in self.classes:
                log_prob = math.log(self.priors[c])
                for j in range(len(x)):
                    prob = self._gaussian_prob(x[j], self.means[c][j], self.vars[c][j])
                    log_prob += math.log(max(prob, 1e-300))
                posteriors[c] = log_prob
            total = sum(math.exp(p - max(posteriors.values())) for p in posteriors.values())
            probs = {c: math.exp(posteriors[c] - max(posteriors.values())) / total for c in self.classes}
            results.append(probs)
        return results

    def predict(self, X):
        probas = self.predict_proba(X)
        return [max(p, key=p.get) for p in probas]

    def accuracy(self, X, y):
        preds = self.predict(X)
        return sum(p == t for p, t in zip(preds, y)) / len(y)


class MultinomialNaiveBayes:
    def __init__(self, alpha=1.0):
        self.alpha = alpha
        self.classes = None
        self.feature_counts = {}
        self.class_counts = {}
        self.priors = {}

    def fit(self, X, y):
        from collections import Counter
        self.classes = list(set(y))
        counts = Counter(y)
        n = len(y)
        n_features = len(X[0])

        for c in self.classes:
            self.priors[c] = counts[c] / n
            self.class_counts[c] = counts[c]
            self.feature_counts[c] = [0] * n_features
            for i in range(len(y)):
                if y[i] == c:
                    for j in range(n_features):
                        self.feature_counts[c][j] += X[i][j]
        return self

    def predict(self, X):
        results = []
        for x in X:
            best_class = None
            best_log_prob = float('-inf')
            for c in self.classes:
                log_prob = math.log(self.priors[c])
                total = sum(self.feature_counts[c]) + self.alpha * len(x)
                for j in range(len(x)):
                    prob = (self.feature_counts[c][j] + self.alpha) / total
                    log_prob += x[j] * math.log(max(prob, 1e-300))
                if log_prob > best_log_prob:
                    best_log_prob = log_prob
                    best_class = c
            results.append(best_class)
        return results

    def accuracy(self, X, y):
        preds = self.predict(X)
        return sum(p == t for p, t in zip(preds, y)) / len(y)


random.seed(42)
N = 300
X = []
y = []
for _ in range(N // 3):
    X.append([random.gauss(0, 1), random.gauss(0, 1)])
    y.append(0)
for _ in range(N // 3):
    X.append([random.gauss(3, 1), random.gauss(0, 1)])
    y.append(1)
for _ in range(N // 3):
    X.append([random.gauss(1.5, 1), random.gauss(3, 1)])
    y.append(2)

split = int(0.8 * N)
X_train, X_test = X[:split], X[split:]
y_train, y_test = y[:split], y[split:]

print("=== Gaussian Naive Bayes ===")
gnb = GaussianNaiveBayes()
gnb.fit(X_train, y_train)
print(f"Train accuracy: {gnb.accuracy(X_train, y_train):.4f}")
print(f"Test accuracy:  {gnb.accuracy(X_test, y_test):.4f}")

print("\n=== Multinomial Naive Bayes (Text Classification) ===")
docs = [
    ([3, 0, 1, 0, 2], 1), ([2, 1, 0, 0, 1], 1), ([0, 0, 0, 3, 2], 0),
    ([1, 0, 2, 1, 0], 1), ([0, 2, 0, 4, 1], 0), ([0, 1, 0, 2, 3], 0),
    ([4, 0, 1, 0, 0], 1), ([0, 3, 0, 2, 1], 0), ([2, 0, 3, 0, 1], 1),
    ([0, 2, 0, 3, 2], 0),
]
X_text = [d[0] for d in docs]
y_text = [d[1] for d in docs]

mnb = MultinomialNaiveBayes(alpha=1.0)
mnb.fit(X_text, y_text)
print(f"Training accuracy: {mnb.accuracy(X_text, y_text):.4f}")
test_doc = [[1, 0, 2, 0, 0]]
print(f"Test doc {test_doc[0]} -> predicted: {mnb.predict(test_doc)[0]} (likely class 1=spam)")
```

## 实际使用

```python
from sklearn.naive_bayes import GaussianNB, MultinomialNB
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

iris = load_iris()
X_tr, X_te, y_tr, y_te = train_test_split(iris.data, iris.target, test_size=0.3, random_state=42)

gnb = GaussianNB()
gnb.fit(X_tr, y_tr)
print(f"Gaussian NB accuracy: {accuracy_score(y_te, gnb.predict(X_te)):.4f}")
```

## 练习

1. 在垃圾邮件分类数据集上比较多项式朴素贝叶斯和伯努利朴素贝叶斯。哪种更适合？
2. 实现伯努利朴素贝叶斯（特征为二值）。在二值化后的数据集上测试。
3. 朴素贝叶斯的独立性假设何时会严重失败？构造一个特征高度相关的数据集，展示朴素贝叶斯vs逻辑回归的差异。

## 关键术语

| 术语 | 人们怎么说 | 实际含义 |
| ------------ | -------------- | ------------------------------------ | --------------- | ----- |
| 贝叶斯定理 | "反转概率" | 从P(特征 | 类别)计算P(类别 | 特征) |
| 朴素假设 | "假装特征独立" | 给定类别时假设特征相互独立，简化计算 |
| 拉普拉斯平滑 | "加一平滑" | 给所有计数加alpha避免零概率 |
| 先验概率 | "基础概率" | 不看特征时类别的概率 |
| 后验概率 | "更新后概率" | 看到特征后类别的概率 |
