---
title: 模型评估
description: 模型评估告诉你模型是否真正有效，而不仅仅是看起来有效
module: 'machine-learning'
difficulty: intermediate
tags:
  - 模型评估
  - 交叉验证
  - 混淆矩阵
  - ROC
  - AUC
related:
  - 'machine-learning/逻辑回归与分类'
  - 'machine-learning/蒙特卡洛方法'
  - 'machine-learning/偏差方差与学习曲线'
  - 'machine-learning/朴素贝叶斯'
prerequisites:
  - 'machine-learning/机器学习概述'
---

# 模型评估

> 模型评估告诉你模型是否真正有效，而不仅仅是看起来有效。

**类型:** 学习
**语言:** Python
**前置条件:** Phase 2 第1-8课
**时间:** ~60 分钟

## 学习目标

- 实现并解释分类指标：准确率、精确率、召回率、F1、ROC-AUC
- 实现并解释回归指标：MSE、RMSE、MAE、R^2
- 实现k折交叉验证并解释为什么单次训练/测试划分不够
- 识别并避免常见评估陷阱：数据泄漏、测试集过拟合

## 问题

你训练了一个模型，在训练数据上达到95%准确率。它好吗？不一定。如果数据集95%是类别A，总是预测A的模型也达到95%。如果模型记住了训练数据，在新数据上可能只有60%。

模型评估回答核心问题：这个模型在未见过的数据上表现如何？没有可靠的评估，你无法知道模型是否学到了有用的东西还是只是在记忆。

## 概念

### 分类指标

**准确率**：正确预测的比例。简单但在不平衡数据上误导。

**混淆矩阵**：2x2表格分解所有预测类型：

|        | 预测正 | 预测负 |
| ------ | ------ | ------ |
| 实际正 | TP     | FN     |
| 实际负 | FP     | TN     |

**精确率** = TP / (TP + FP) —— 预测为正的有多少真正为正？

**召回率** = TP / (TP + FN) —— 真正为正的有多少被找到？

**F1** = 2 _ P _ R / (P + R) —— 精确率和召回率的调和平均。

**ROC曲线**：绘制不同阈值下的真正例率 vs 假正例率。

**AUC**：ROC曲线下面积。0.5=随机，1.0=完美。与类别比例和阈值无关。

### 回归指标

**MSE** = (1/n) \* sum((y_pred - y_true)^2) —— 惩罚大误差

**RMSE** = sqrt(MSE) —— 与y同单位，更易解释

**MAE** = (1/n) \* sum(|y_pred - y_true|) —— 对异常值更鲁棒

**R^2** = 1 - SS_res / SS_tot —— 解释的方差比例

### 交叉验证

单次训练/测试划分的结果取决于随机划分。交叉验证给出更可靠的估计。

**k折交叉验证**：将数据分成k份，每次用k-1份训练，1份验证，重复k次，平均结果。

**分层k折**：每折中类别比例与完整数据集相同。对不平衡数据重要。

**留一交叉验证(LOOCV)**：k=n的极端情况。每个样本单独作为验证集。计算代价高但数据利用最大化。

### 评估陷阱

**数据泄漏**：测试数据的信息在训练时被使用。常见来源：

- 预处理（缩放、编码）在划分前用全量数据
- 特征中包含未来信息（用明天价格预测今天）
- 重复样本同时出现在训练和测试集

**测试集过拟合**：反复在测试集上评估并据此调整模型。测试集变成第二个训练集。

**类别不平衡**：95%负样本的数据集，准确率不是好指标。使用精确率/召回率/F1/AUC。

## 动手构建

```python
import random
import math

def confusion_matrix(y_true, y_pred):
    tp = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 1)
    tn = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 0)
    fp = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 1)
    fn = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 0)
    return tp, tn, fp, fn

def accuracy(y_true, y_pred):
    return sum(t == p for t, p in zip(y_true, y_pred)) / len(y_true)

def precision(y_true, y_pred):
    tp, tn, fp, fn = confusion_matrix(y_true, y_pred)
    return tp / (tp + fp) if (tp + fp) > 0 else 0

def recall(y_true, y_pred):
    tp, tn, fp, fn = confusion_matrix(y_true, y_pred)
    return tp / (tp + fn) if (tp + fn) > 0 else 0

def f1_score(y_true, y_pred):
    p = precision(y_true, y_pred)
    r = recall(y_true, y_pred)
    return 2 * p * r / (p + r) if (p + r) > 0 else 0

def roc_auc(y_true, y_scores):
    pairs = sorted(zip(y_scores, y_true), key=lambda x: -x[0])
    tpr_list, fpr_list = [0], [0]
    tp, fp = 0, 0
    pos = sum(y_true)
    neg = len(y_true) - pos
    for score, label in pairs:
        if label == 1:
            tp += 1
        else:
            fp += 1
        tpr_list.append(tp / pos if pos > 0 else 0)
        fpr_list.append(fp / neg if neg > 0 else 0)
    auc = 0
    for i in range(1, len(tpr_list)):
        auc += (fpr_list[i] - fpr_list[i-1]) * (tpr_list[i] + tpr_list[i-1]) / 2
    return auc

def mse(y_true, y_pred):
    return sum((t - p) ** 2 for t, p in zip(y_true, y_pred)) / len(y_true)

def rmse(y_true, y_pred):
    return math.sqrt(mse(y_true, y_pred))

def mae(y_true, y_pred):
    return sum(abs(t - p) for t, p in zip(y_true, y_pred)) / len(y_true)

def r_squared(y_true, y_pred):
    y_mean = sum(y_true) / len(y_true)
    ss_res = sum((t - p) ** 2 for t, p in zip(y_true, y_pred))
    ss_tot = sum((t - y_mean) ** 2 for t in y_true)
    return 1 - ss_res / ss_tot if ss_tot > 0 else 0

def kfold_cv(X, y, model_class, k=5, **model_kwargs):
    n = len(y)
    indices = list(range(n))
    random.shuffle(indices)
    fold_size = n // k
    scores = []
    for fold in range(k):
        start = fold * fold_size
        end = start + fold_size if fold < k - 1 else n
        val_idx = indices[start:end]
        train_idx = indices[:start] + indices[end:]
        X_train = [X[i] for i in train_idx]
        y_train = [y[i] for i in train_idx]
        X_val = [X[i] for i in val_idx]
        y_val = [y[i] for i in val_idx]
        model = model_class(**model_kwargs)
        model.fit(X_train, y_train)
        score = model.accuracy(X_val, y_val)
        scores.append(score)
    return scores

random.seed(42)
N = 500
X = []
y = []
for _ in range(N // 2):
    X.append([random.gauss(2, 1), random.gauss(2, 1)])
    y.append(0)
for _ in range(N // 2):
    X.append([random.gauss(5, 1), random.gauss(5, 1)])
    y.append(1)

y_pred = [1 if x[0] + x[1] > 6 else 0 for x in X]
y_scores = [(x[0] + x[1] - 6) / 4 for x in X]

print("=== Classification Metrics ===")
tp, tn, fp, fn = confusion_matrix(y, y_pred)
print(f"Confusion Matrix: TP={tp}, TN={tn}, FP={fp}, FN={fn}")
print(f"Accuracy:  {accuracy(y, y_pred):.4f}")
print(f"Precision: {precision(y, y_pred):.4f}")
print(f"Recall:    {recall(y, y_pred):.4f}")
print(f"F1 Score:  {f1_score(y, y_pred):.4f}")
print(f"ROC-AUC:   {roc_auc(y, y_scores):.4f}")

y_true_reg = [random.gauss(50, 10) for _ in range(100)]
y_pred_reg = [yt + random.gauss(0, 3) for yt in y_true_reg]

print("\n=== Regression Metrics ===")
print(f"MSE:  {mse(y_true_reg, y_pred_reg):.4f}")
print(f"RMSE: {rmse(y_true_reg, y_pred_reg):.4f}")
print(f"MAE:  {mae(y_true_reg, y_pred_reg):.4f}")
print(f"R^2:  {r_squared(y_true_reg, y_pred_reg):.4f}")
```

## 实际使用

```python
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.metrics import (accuracy_score, precision_score, recall_score,
                             f1_score, roc_auc_score, classification_report,
                             mean_squared_error, r2_score)
from sklearn.linear_model import LogisticRegression
from sklearn.datasets import load_breast_cancer
from sklearn.preprocessing import StandardScaler
import numpy as np

data = load_breast_cancer()
X, y = data.data, data.target
X = StandardScaler().fit_transform(X)

model = LogisticRegression(max_iter=5000)
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
scores = cross_val_score(model, X, y, cv=cv, scoring='accuracy')
print(f"CV Accuracy: {scores.mean():.4f} (+/- {scores.std():.4f})")

from sklearn.model_selection import train_test_split
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
model.fit(X_tr, y_tr)
y_pred = model.predict(X_te)
y_prob = model.predict_proba(X_te)[:, 1]

print(f"\nTest Accuracy:  {accuracy_score(y_te, y_pred):.4f}")
print(f"Test Precision: {precision_score(y_te, y_pred):.4f}")
print(f"Test Recall:    {recall_score(y_te, y_pred):.4f}")
print(f"Test F1:        {f1_score(y_te, y_pred):.4f}")
print(f"Test AUC:       {roc_auc_score(y_te, y_prob):.4f}")
```

## 练习

1. 创建一个95%类别0、5%类别1的数据集。训练逻辑回归。准确率很高但召回率很低。解释为什么，并展示如何用类别权重或重采样改善。
2. 从零实现分层k折交叉验证。与普通k折比较，展示在不平衡数据上的差异。
3. 从零绘制ROC曲线。计算AUC。展示不同阈值如何沿曲线移动。

## 关键术语

| 术语     | 人们怎么说         | 实际含义                          |
| -------- | ------------------ | --------------------------------- |
| 混淆矩阵 | "预测vs实际表"     | 展示TP、TN、FP、FN计数的表格      |
| ROC曲线  | "权衡曲线"         | 不同阈值下真正例率vs假正例率的图  |
| AUC      | "曲线下面积"       | ROC曲线下面积，衡量分类器整体质量 |
| 交叉验证 | "多折验证"         | 将数据分成多份，轮流做训练和验证  |
| 数据泄漏 | "偷看答案"         | 训练时使用了不应有的测试信息      |
| F1分数   | "精确率召回率平衡" | 精确率和召回率的调和平均          |
