---
title: 特征工程与选择
description: 特征工程将原始数据转化为模型可用的信号，好的特征胜过好的算法
module: 'machine-learning'
difficulty: intermediate
tags:
  - 特征工程
  - 特征选择
  - 数据预处理
  - 编码
  - 缩放
related:
  - 'machine-learning/什么是机器学习'
  - 'machine-learning/时间序列'
  - 'machine-learning/特征选择进阶'
  - 'machine-learning/无监督学习'
prerequisites:
  - 'machine-learning/机器学习概述'
---

# 特征工程与选择

> 特征工程将原始数据转化为模型可用的信号。好的特征胜过好的算法。

**类型:** 学习
**语言:** Python
**前置条件:** Phase 2 第1-7课
**时间:** ~60 分钟

## 学习目标

- 对分类变量应用正确的编码策略（one-hot、标签编码、目标编码）
- 对数值特征应用缩放和变换（标准化、归一化、对数变换）
- 从原始数据构建有信息量的特征（日期时间提取、文本统计、交互特征）
- 使用过滤法、包装法和嵌入法进行特征选择

## 问题

你有一个原始数据集：日期列、地址列、自由文本评论列、混合尺度的数值列。大多数ML算法只接受干净的数值矩阵。你如何将这个混乱的原始数据转化为模型可以有效学习的特征？

特征工程是ML项目中最具影响力的步骤。一个简单模型配上精心设计的特征，通常胜过复杂模型配上原始特征。这就是为什么数据科学家花80%的时间在数据准备上。

## 概念

### 数值特征处理

**标准化（Z-score）**：减去均值，除以标准差。结果：均值=0，标准差=1。最适合假设正态分布的算法（线性回归、逻辑回归、SVM、KNN、PCA）。

**归一化（Min-Max）**：缩放到[0, 1]范围。最适合神经网络和不假设分布的算法。

**鲁棒缩放**：减去中位数，除以四分位距(IQR)。对异常值不敏感。

**对数变换**：对右偏分布取log。将指数增长变为线性增长。适用于收入、价格、计数。

**分箱**：将连续值分成离散区间。年龄 -> [0-18, 19-35, 36-55, 56+]。帮助线性模型捕捉非线性关系。

### 分类特征处理

**标签编码**：将每个类别映射到整数。{红, 绿, 蓝} -> {0, 1, 2}。简单但暗示了不存在的顺序关系。仅适用于有序类别（低, 中, 高）。

**One-Hot编码**：为每个类别创建二进制列。{红, 绿, 蓝} -> [1,0,0], [0,1,0], [0,0,1]。最常用。不暗示顺序。但高基数特征会产生很多列。

**目标编码**：用该类别的目标均值替换类别值。{A:0.7, B:0.3, C:0.9}。对高基数特征有效。有过拟合风险——需要正则化（如加入噪声或使用交叉验证均值）。

### 文本特征

**词袋模型(Bag of Words)**：计算每个词出现的次数。简单但忽略词序。

**TF-IDF**：词频-逆文档频率。突出在文档中频繁但在语料库中稀少的词。

**N-gram**：连续N个词的组合。捕捉局部词序。

**文本统计**：字符数、词数、平均词长、感叹号数、大写词比例。快速且对某些任务有效。

### 日期时间特征

从时间戳中提取：年、月、日、星期几、小时、是否周末、是否节假日、距某事件天数、季度、是否月初/月末。

### 交互特征

两个特征的组合：面积 \* 房间数 = 总可用空间。价格 / 面积 = 单价。这些捕获单个特征不包含的信息。

### 特征选择

**过滤法**：根据统计检验独立评估每个特征。相关系数、卡方检验、互信息。快速但不考虑特征交互。

**包装法**：使用模型评估特征子集。递归特征消除(RFE)、前向选择。慢但考虑特征交互。

**嵌入法**：模型在训练时自动选择特征。L1正则化（Lasso将不重要特征权重置零）、树模型的特征重要性。

## 动手构建

```python
import random
import math
from collections import Counter

def z_score_standardize(X):
    n = len(X)
    d = len(X[0])
    means = [sum(X[i][j] for i in range(n)) / n for j in range(d)]
    stds = []
    for j in range(d):
        var = sum((X[i][j] - means[j]) ** 2 for i in range(n)) / n
        stds.append(var ** 0.5 if var > 0 else 1)
    return [[(X[i][j] - means[j]) / stds[j] for j in range(d)] for i in range(n)], means, stds

def min_max_normalize(X):
    n = len(X)
    d = len(X[0])
    mins = [min(X[i][j] for i in range(n)) for j in range(d)]
    maxs = [max(X[i][j] for i in range(n)) for j in range(d)]
    return [[(X[i][j] - mins[j]) / (maxs[j] - mins[j]) if maxs[j] > mins[j] else 0
             for j in range(d)] for i in range(n)]

def log_transform(column):
    return [math.log1p(x) for x in column]

def one_hot_encode(categories):
    unique = sorted(set(categories))
    encoding = {cat: [1 if i == j else 0 for j in range(len(unique))] for i, cat in enumerate(unique)}
    return [encoding[cat] for cat in categories], unique

def label_encode(categories):
    unique = sorted(set(categories))
    mapping = {cat: i for i, cat in enumerate(unique)}
    return [mapping[cat] for cat in categories], mapping

def target_encode(categories, targets):
    cat_targets = {}
    cat_counts = {}
    for cat, target in zip(categories, targets):
        cat_targets[cat] = cat_targets.get(cat, 0) + target
        cat_counts[cat] = cat_counts.get(cat, 0) + 1
    global_mean = sum(targets) / len(targets)
    smoothing = 10
    encoding = {}
    for cat in cat_targets:
        encoding[cat] = (cat_targets[cat] + smoothing * global_mean) / (cat_counts[cat] + smoothing)
    return [encoding[cat] for cat in categories], encoding

def correlation_filter(X, y, threshold=0.1):
    n = len(y)
    y_mean = sum(y) / n
    selected = []
    for j in range(len(X[0])):
        x_mean = sum(X[i][j] for i in range(n)) / n
        cov = sum((X[i][j] - x_mean) * (y[i] - y_mean) for i in range(n)) / n
        x_std = (sum((X[i][j] - x_mean) ** 2 for i in range(n)) / n) ** 0.5
        y_std = (sum((y[i] - y_mean) ** 2 for i in range(n)) / n) ** 0.5
        if x_std > 0 and y_std > 0:
            corr = cov / (x_std * y_std)
            if abs(corr) >= threshold:
                selected.append((j, corr))
    return selected

random.seed(42)
N = 200

cities = random.choices(['北京', '上海', '广州', '深圳', '杭州'], k=N)
prices = [random.gauss(50000, 15000) + {'北京': 20000, '上海': 18000, '广州': 5000, '深圳': 15000, '杭州': 8000}[c]
          for c in cities]
sizes = [random.gauss(80, 30) for _ in range(N)]
ages = [random.randint(0, 40) for _ in range(N)]

print("=== Feature Engineering Demo ===")

print("\n1. One-Hot Encoding (cities):")
one_hot, unique_cities = one_hot_encode(cities[:5])
for i in range(5):
    print(f"  {cities[i]} -> {one_hot[i]}")

print("\n2. Label Encoding (cities):")
labels, mapping = label_encode(cities[:5])
print(f"  Mapping: {mapping}")
for i in range(5):
    print(f"  {cities[i]} -> {labels[i]}")

print("\n3. Target Encoding (cities -> price):")
target_enc, enc_map = target_encode(cities, prices)
for city, enc_val in sorted(enc_map.items()):
    print(f"  {city}: {enc_val:.0f}")

print("\n4. Log Transform (prices):")
log_prices = log_transform(prices)
print(f"  Original: mean={sum(prices)/len(prices):.0f}, skewed")
print(f"  Log:      mean={sum(log_prices)/len(log_prices):.2f}, more symmetric")

print("\n5. Feature Selection (correlation filter):")
X_raw = list(zip(sizes, ages, [random.gauss(0, 1) for _ in range(N)]))
selected = correlation_filter(X_raw, prices, threshold=0.1)
print(f"  Selected features (|corr| >= 0.1):")
for feat_idx, corr in selected:
    print(f"    Feature {feat_idx}: correlation = {corr:.4f}")
```

## 实际使用

```python
from sklearn.preprocessing import StandardScaler, MinMaxScaler, OneHotEncoder, LabelEncoder
from sklearn.feature_selection import SelectKBest, f_regression, mutual_info_regression
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import numpy as np

np.random.seed(42)
n = 200
X_num = np.random.randn(n, 3)
X_cat = np.random.choice(['A', 'B', 'C'], size=(n, 1))
y = 3 * X_num[:, 0] - 2 * X_num[:, 1] + np.random.randn(n) * 0.5

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X_num)
print(f"Scaled mean: {X_scaled.mean(axis=0).round(4)}")
print(f"Scaled std:  {X_scaled.std(axis=0).round(4)}")

selector = SelectKBest(f_regression, k=2)
X_selected = selector.fit_transform(X_num, y)
print(f"\nSelected features: {selector.get_support()}")
print(f"F-scores: {selector.scores_.round(2)}")
print(f"p-values: {selector.pvalues_.round(4)}")
```

## 练习

1. 取一个真实数据集（如Titanic）。识别所有特征类型。应用正确的编码和缩放。展示变换前后的模型性能差异。
2. 实现递归特征消除(RFE)：训练模型，移除最不重要的特征，重复。绘制特征数vs准确率。
3. 比较目标编码和one-hot编码在高基数特征（如邮政编码，100+类别）上的效果。哪个更不容易过拟合？

## 关键术语

| 术语        | 人们怎么说           | 实际含义                                   |
| ----------- | -------------------- | ------------------------------------------ |
| 特征工程    | "让数据更好用"       | 将原始数据转化为模型能更好学习的特征       |
| 标准化      | "Z-score缩放"        | 减均值除标准差，使特征均值为0标准差为1     |
| One-Hot编码 | "每个类别一列"       | 将分类变量转换为二进制列，不暗示顺序       |
| 目标编码    | "用目标均值替换类别" | 用该类别目标变量的均值替换类别值           |
| 特征选择    | "挑最有用的特征"     | 移除不相关或冗余特征，减少过拟合和训练时间 |
| 对数变换    | "压扁长尾"           | 对右偏分布取对数，使其更接近正态分布       |
