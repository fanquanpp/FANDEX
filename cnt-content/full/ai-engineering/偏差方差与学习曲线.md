---
title: 偏差方差与学习曲线
description: 偏差方差分解解释了为什么模型会犯错，学习曲线告诉你如何修复
module: 'ai-engineering'
difficulty: intermediate
tags:
  - 偏差方差
  - 学习曲线
  - 过拟合
  - 欠拟合
  - 模型诊断
related:
  - 'ai-engineering/模型评估'
  - 'ai-engineering/批量API经济学'
  - 'ai-engineering/频谱图与Mel特征'
  - 'ai-engineering/朴素贝叶斯'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 偏差方差与学习曲线

> 偏差方差分解解释了为什么模型会犯错。学习曲线告诉你如何修复。

**类型:** 学习
**语言:** Python
**前置条件:** Phase 2 第1-9课
**时间:** ~60 分钟

## 学习目标

- 解释偏差-方差权衡，并计算偏差^2、方差和不可约误差
- 绘制学习曲线并诊断模型是过拟合还是欠拟合
- 根据学习曲线形状决定是否需要更多数据、更复杂模型或更好的特征
- 理解双重下降现象及其对现代深度学习的意义

## 问题

你的模型在测试数据上表现不好。为什么？两种可能：模型太简单（欠拟合）或太复杂（过拟合）。但你怎么知道是哪种？更重要的是，你应该收集更多数据、使用更复杂的模型，还是改进特征？

偏差-方差分解将测试误差分解为三个部分：偏差（系统性错误）、方差（对数据的敏感性）和噪声（不可减少的）。学习曲线可视化训练误差和验证误差如何随训练数据量变化，告诉你哪种修复方法有效。

## 概念

### 偏差-方差分解

期望测试误差可以分解为：

```
E[测试误差] = 偏差^2 + 方差 + 不可约噪声
```

**偏差^2**：模型平均预测与真实值之间的差距。高偏差=欠拟合。模型对数据做了过强的假设。

**方差**：模型预测对不同训练集的敏感度。高方差=过拟合。模型对训练数据的特定噪声太敏感。

**不可约噪声**：数据本身的随机性。无法消除。

### 偏差-方差权衡

| 模型复杂度 | 偏差 | 方差 | 总误差       |
| ---------- | ---- | ---- | ------------ |
| 太简单     | 高   | 低   | 高（欠拟合） |
| 适中       | 中   | 中   | 低（最佳）   |
| 太复杂     | 低   | 高   | 高（过拟合） |

增加模型复杂度减少偏差但增加方差。减少复杂度增加偏差但减少方差。目标是找到最佳平衡点。

### 学习曲线

学习曲线绘制训练误差和验证误差vs训练样本数。

**欠拟合曲线**：训练误差和验证误差都很高，且差距小。增加数据帮助不大。需要更复杂的模型或更好的特征。

**过拟合曲线**：训练误差低，验证误差高，差距大。增加数据有帮助（曲线会合）。也可以降低模型复杂度。

**良好拟合曲线**：训练误差和验证误差都低，差距小。模型已经学到了数据的真实模式。

### 诊断决策表

| 症状                   | 诊断     | 修复方法                         |
| ---------------------- | -------- | -------------------------------- |
| 训练误差高，验证误差高 | 欠拟合   | 更复杂模型、更多特征、减少正则化 |
| 训练误差低，验证误差高 | 过拟合   | 更多数据、正则化、更简单模型     |
| 两者都低，差距小       | 良好拟合 | 模型已优化                       |
| 两者都高，差距大       | 数据问题 | 检查数据质量、特征工程           |

### 双重下降

传统偏差-方差曲线假设U形：复杂度增加时误差先降后升。但现代深度学习展示了"双重下降"：当模型参数数接近训练样本数时，误差飙升（插值阈值），然后随着参数继续增加，误差再次下降。

这意味着更大的模型有时确实更好，即使它们可以完美记忆训练数据。正则化（隐式或显式）使过参数化模型选择简单的拟合。

## 动手构建

```python
import random
import math

def generate_data(n, noise=0.5):
    X = [random.uniform(-3, 3) for _ in range(n)]
    y = [math.sin(x) + random.gauss(0, noise) for x in X]
    return X, y

class PolyRegression:
    def __init__(self, degree=1):
        self.degree = degree
        self.weights = None
        self.bias = 0

    def _make_features(self, X):
        return [[x ** d for d in range(1, self.degree + 1)] for x in X]

    def fit(self, X, y):
        features = self._make_features(X)
        n = len(y)
        d = self.degree
        X_mat = [[features[i][j] for j in range(d)] + [1] for i in range(n)]
        Xt = [[X_mat[j][i] for j in range(n)] for i in range(d + 1)]
        XtX = [[sum(Xt[i][k] * X_mat[k][j] for k in range(n))
                for j in range(d + 1)] for i in range(d + 1)]
        Xty = [sum(Xt[i][k] * y[k] for k in range(n)) for i in range(d + 1)]
        self.weights = self._solve(XtX, Xty)
        return self

    def _solve(self, A, b):
        n = len(b)
        for i in range(n):
            max_row = max(range(i, n), key=lambda r: abs(A[r][i]))
            A[i], A[max_row] = A[max_row], A[i]
            b[i], b[max_row] = b[max_row], b[i]
            if abs(A[i][i]) < 1e-10:
                continue
            for j in range(i + 1, n):
                factor = A[j][i] / A[i][i]
                for k in range(i, n):
                    A[j][k] -= factor * A[i][k]
                b[j] -= factor * b[i]
        x = [0] * n
        for i in range(n - 1, -1, -1):
            if abs(A[i][i]) < 1e-10:
                continue
            x[i] = (b[i] - sum(A[i][j] * x[j] for j in range(i + 1, n))) / A[i][i]
        return x

    def predict(self, X):
        features = self._make_features(X)
        return [sum(self.weights[j] * features[i][j] for j in range(self.degree)) + self.weights[-1]
                for i in range(len(X))]

    def mse(self, X, y):
        preds = self.predict(X)
        return sum((p - t) ** 2 for p, t in zip(preds, y)) / len(y)


random.seed(42)

print("=== Bias-Variance Demo ===")
print("\nPolynomial degree vs Error (100 samples, 50 repetitions):")
print(f"{'Degree':>8} {'Bias^2':>10} {'Variance':>10} {'Total':>10}")

for degree in [1, 3, 5, 9, 15]:
    predictions = [[] for _ in range(200)]
    true_values = [math.sin(x * 6 / 200 - 3) for x in range(200)]
    test_X = [x * 6 / 200 - 3 for x in range(200)]

    for _ in range(30):
        X_train, y_train = generate_data(50, noise=0.5)
        model = PolyRegression(degree=degree)
        model.fit(X_train, y_train)
        preds = model.predict(test_X)
        for i in range(200):
            predictions[i].append(preds[i])

    bias_sq = sum((sum(predictions[i]) / len(predictions[i]) - true_values[i]) ** 2 for i in range(200)) / 200
    variance = sum(
        sum((p - sum(predictions[i]) / len(predictions[i])) ** 2 for p in predictions[i]) / len(predictions[i])
        for i in range(200)
    ) / 200
    total = bias_sq + variance
    print(f"{degree:>8} {bias_sq:>10.4f} {variance:>10.4f} {total:>10.4f}")


print("\n=== Learning Curves ===")
X_full, y_full = generate_data(200, noise=0.5)

for degree in [1, 5, 15]:
    train_sizes = [10, 20, 40, 80, 160]
    train_errors = []
    val_errors = []
    for size in train_sizes:
        X_train = X_full[:size]
        y_train = y_full[:size]
        X_val = X_full[160:]
        y_val = y_full[160:]
        model = PolyRegression(degree=degree)
        model.fit(X_train, y_train)
        train_errors.append(model.mse(X_train, y_train))
        val_errors.append(model.mse(X_val, y_val))

    print(f"\nDegree {degree}:")
    print(f"  {'Size':>6} {'Train MSE':>12} {'Val MSE':>12} {'Gap':>12}")
    for i, size in enumerate(train_sizes):
        gap = val_errors[i] - train_errors[i]
        print(f"  {size:>6} {train_errors[i]:>12.4f} {val_errors[i]:>12.4f} {gap:>12.4f}")
```

## 练习

1. 对5个不同随机种子重复偏差-方差实验。展示方差估计本身有方差。
2. 在真实数据集上绘制学习曲线。识别模型是过拟合还是欠拟合，并建议修复方法。
3. 实现双重下降实验：在固定数据集上从度数1到30拟合多项式回归。绘制测试误差vs度数。你能观察到双重下降吗？

## 关键术语

| 术语       | 人们怎么说     | 实际含义                                      |
| ---------- | -------------- | --------------------------------------------- |
| 偏差       | "系统性错误"   | 模型平均预测与真实值之间的差距，高偏差=欠拟合 |
| 方差       | "不稳定性"     | 模型对不同训练集的敏感度，高方差=过拟合       |
| 学习曲线   | "误差vs数据量" | 训练和验证误差随训练样本数变化的图            |
| 双重下降   | "误差两次下降" | 过参数化模型误差先升后降的现象                |
| 不可约误差 | "噪声底线"     | 数据本身固有的随机性，任何模型都无法消除      |
