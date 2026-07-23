---
order: 65
title: Python与机器学习
module: python
category: Python
difficulty: intermediate
description: 'scikit-learn与ML基础'
author: fanquanpp
updated: '2026-06-14'
related:
  - python/Python与Redis
  - python/Python与GraphQL
  - python/Python与深度学习
  - python/Python与NLP
prerequisites:
  - python/语法速查
---

## 什么是机器学习

机器学习是人工智能的一个分支，它让计算机从数据中自动学习规律，而不需要人为编写规则。比如，你想让计算机识别垃圾邮件，不需要手动列出所有垃圾邮件的特征，而是给它大量已标记的邮件数据，让它自己找出区分垃圾邮件和正常邮件的模式。

Python 是机器学习领域最主流的语言，拥有 scikit-learn、TensorFlow、PyTorch 等强大的库。其中 scikit-learn 是最基础的机器学习库，适合入门和大多数传统机器学习任务。

## 基础概念

### 监督学习

监督学习是最常见的机器学习类型。你有标注好的训练数据（每个样本都有正确答案），模型从这些数据中学习输入和输出之间的关系。监督学习分为两类：

- 分类（Classification）：预测离散的类别。比如判断邮件是否为垃圾邮件、识别图片中的动物种类
- 回归（Regression）：预测连续的数值。比如预测房价、预测明天的气温

### 无监督学习

无监督学习处理的是没有标注的数据，模型需要自己发现数据中的结构。常见的任务有：

- 聚类（Clustering）：把相似的数据点分到一组。比如对客户进行分群
- 降维（Dimensionality Reduction）：把高维数据压缩到低维，方便可视化和加速训练

### 训练集与测试集

训练模型时，需要把数据分成训练集和测试集。训练集用来训练模型，测试集用来评估模型在未见数据上的表现。如果用全部数据训练，再在同一批数据上测试，模型可能只是"死记硬背"，遇到新数据就表现很差（过拟合）。

### 特征工程

特征是模型的输入。特征工程是指从原始数据中提取、选择、转换出对模型有用的特征。好的特征往往比复杂的模型更重要。

## 快速上手

### 安装 scikit-learn

```bash
# 安装 scikit-learn 和数据处理库
pip install scikit-learn numpy pandas matplotlib
```

### 第一个分类模型

```python
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

# 加载鸢尾花数据集（经典的入门数据集）
iris = load_iris()
X = iris.data    # 特征：花萼长度、花萼宽度、花瓣长度、花瓣宽度
y = iris.target  # 标签：三种不同的鸢尾花

# 划分训练集和测试集（80% 训练，20% 测试）
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# 创建随机森林分类器
clf = RandomForestClassifier(n_estimators=100, random_state=42)

# 训练模型
clf.fit(X_train, y_train)

# 在测试集上预测
y_pred = clf.predict(X_test)

# 计算准确率
accuracy = accuracy_score(y_test, y_pred)
print(f"模型准确率: {accuracy:.2%}")

# 用模型预测新数据
new_flower = [[5.1, 3.5, 1.4, 0.2]]
prediction = clf.predict(new_flower)
print(f"预测类别: {iris.target_names[prediction[0]]}")
```

### 第一个回归模型

```python
from sklearn.datasets import load_diabetes
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error

# 加载糖尿病数据集
diabetes = load_diabetes()
X = diabetes.data
y = diabetes.target

# 划分数据集
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# 创建线性回归模型
model = LinearRegression()

# 训练模型
model.fit(X_train, y_train)

# 预测
y_pred = model.predict(X_test)

# 评估：均方误差
mse = mean_squared_error(y_test, y_pred)
print(f"均方误差: {mse:.2f}")

# 查看模型系数
print(f"截距: {model.intercept_:.2f}")
print(f"系数: {model.coef_}")
```

## 详细用法

### 数据预处理

原始数据通常需要预处理才能用于训练：

```python
from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder
from sklearn.impute import SimpleImputer
import numpy as np

# 示例数据
data = np.array([[1, 100], [2, 200], [3, 300], [4, np.nan]])

# 处理缺失值：用均值填充
imputer = SimpleImputer(strategy='mean')
data_filled = imputer.fit_transform(data)
print(f"填充缺失值后:\n{data_filled}")

# 标准化：让每个特征的均值为 0，标准差为 1
scaler = StandardScaler()
data_scaled = scaler.fit_transform(data_filled)
print(f"标准化后:\n{data_scaled}")

# 归一化：把数据缩放到 0-1 范围
minmax_scaler = MinMaxScaler()
data_normalized = minmax_scaler.fit_transform(data_filled)
print(f"归一化后:\n{data_normalized}")

# 标签编码：把文本标签转成数字
labels = ['猫', '狗', '鸟', '猫', '狗']
encoder = LabelEncoder()
encoded_labels = encoder.fit_transform(labels)
print(f"编码后: {encoded_labels}")  # [0, 1, 2, 0, 1]
print(f"反向解码: {encoder.inverse_transform([0, 1, 2])}")  # ['猫', '狗', '鸟']
```

### 特征选择

不是所有特征都对模型有用，选择重要的特征可以提高模型性能和训练速度：

```python
from sklearn.datasets import load_iris
from sklearn.feature_selection import SelectKBest, f_classif

iris = load_iris()
X, y = iris.data, iris.target

# 选择对分类最有用的 2 个特征
selector = SelectKBest(score_func=f_classif, k=2)
X_selected = selector.fit_transform(X, y)

# 查看哪些特征被选中
selected_mask = selector.get_support()
feature_names = iris.feature_names
print(f"选中的特征: {[feature_names[i] for i, selected in enumerate(selected_mask) if selected]}")
print(f"特征得分: {selector.scores_}")
```

### 交叉验证

交叉验证是更可靠的模型评估方法，它把数据分成多份，轮流用每一份做测试集：

```python
from sklearn.datasets import load_iris
from sklearn.model_selection import cross_val_score
from sklearn.ensemble import RandomForestClassifier

iris = load_iris()
X, y = iris.data, iris.target

# 5 折交叉验证
clf = RandomForestClassifier(n_estimators=100, random_state=42)
scores = cross_val_score(clf, X, y, cv=5)

print(f"每折准确率: {scores}")
print(f"平均准确率: {scores.mean():.2%}")
print(f"标准差: {scores.std():.2%}")
```

### 网格搜索调参

不同的模型参数会显著影响模型表现，网格搜索可以自动尝试多种参数组合：

```python
from sklearn.datasets import load_iris
from sklearn.model_selection import GridSearchCV
from sklearn.ensemble import RandomForestClassifier

iris = load_iris()
X, y = iris.data, iris.target

# 定义要搜索的参数组合
param_grid = {
    'n_estimators': [50, 100, 200],
    'max_depth': [None, 5, 10],
    'min_samples_split': [2, 5, 10],
}

# 创建网格搜索
grid_search = GridSearchCV(
    RandomForestClassifier(random_state=42),
    param_grid,
    cv=5,           # 5 折交叉验证
    scoring='accuracy',
    n_jobs=-1       # 使用所有 CPU 核心
)

# 执行搜索
grid_search.fit(X, y)

# 输出最佳参数和得分
print(f"最佳参数: {grid_search.best_params_}")
print(f"最佳准确率: {grid_search.best_score_:.2%}")

# 用最佳模型进行预测
best_model = grid_search.best_estimator_
prediction = best_model.predict([[5.1, 3.5, 1.4, 0.2]])
print(f"预测结果: {iris.target_names[prediction[0]]}")
```

### 常用分类算法对比

```python
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier

iris = load_iris()
X_train, X_test, y_train, y_test = train_test_split(
    iris.data, iris.target, test_size=0.2, random_state=42
)

# 定义多个分类器
classifiers = {
    "逻辑回归": LogisticRegression(max_iter=200),
    "决策树": DecisionTreeClassifier(),
    "随机森林": RandomForestClassifier(n_estimators=100),
    "支持向量机": SVC(),
    "K近邻": KNeighborsClassifier(),
}

# 训练并评估每个分类器
for name, clf in classifiers.items():
    clf.fit(X_train, y_train)
    y_pred = clf.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"{name}: 准确率 {accuracy:.2%}")
```

### 聚类（无监督学习）

```python
from sklearn.datasets import make_blobs
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

# 生成模拟数据（3 个簇）
X, _ = make_blobs(n_samples=300, centers=3, random_state=42)

# 使用 K-Means 聚类
kmeans = KMeans(n_clusters=3, random_state=42)
labels = kmeans.fit_predict(X)

# 查看聚类中心
print(f"聚类中心:\n{kmeans.cluster_centers_}")

# 评估聚类质量（轮廓系数，越接近 1 越好）
score = silhouette_score(X, labels)
print(f"轮廓系数: {score:.2f}")

# 预测新数据点属于哪个簇
new_point = [[0, 0]]
cluster = kmeans.predict(new_point)
print(f"新数据点属于簇: {cluster[0]}")
```

### 保存和加载模型

训练好的模型可以保存到磁盘，下次直接加载使用，不需要重新训练：

```python
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import load_iris

# 训练模型
iris = load_iris()
clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(iris.data, iris.target)

# 保存模型到文件
joblib.dump(clf, 'model.pkl')

# 从文件加载模型
loaded_model = joblib.load('model.pkl')

# 使用加载的模型进行预测
prediction = loaded_model.predict([[5.1, 3.5, 1.4, 0.2]])
print(f"预测结果: {iris.target_names[prediction[0]]}")
```

## 常见场景

### 文本分类

```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# 模拟邮件数据
emails = [
    "恭喜您中奖了，点击领取", "明天开会讨论项目进度",
    "限时优惠，不容错过", "请查看附件中的报告",
    "免费领取优惠券", "项目文档已更新",
]
labels = [1, 0, 1, 0, 1, 0]  # 1=垃圾邮件，0=正常邮件

# 创建管道：文本向量化 + 朴素贝叶斯分类
pipeline = Pipeline([
    ('tfidf', TfidfVectorizer()),       # 将文本转为 TF-IDF 向量
    ('clf', MultinomialNB()),            # 朴素贝叶斯分类器
])

# 训练
pipeline.fit(emails, labels)

# 预测新邮件
new_emails = ["点击领取免费大奖", "请确认明天的会议时间"]
predictions = pipeline.predict(new_emails)

for email, pred in zip(new_emails, predictions):
    label = "垃圾邮件" if pred == 1 else "正常邮件"
    print(f"'{email}' -> {label}")
```

### 房价预测

```python
from sklearn.datasets import fetch_california_housing
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, r2_score

# 加载加州房价数据集
housing = fetch_california_housing()
X_train, X_test, y_train, y_test = train_test_split(
    housing.data, housing.target, test_size=0.2, random_state=42
)

# 使用梯度提升回归
model = GradientBoostingRegressor(
    n_estimators=200,
    max_depth=5,
    learning_rate=0.1,
    random_state=42
)

model.fit(X_train, y_train)
y_pred = model.predict(X_test)

# 评估
mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)
print(f"平均绝对误差: {mae:.4f}")
print(f"R2 得分: {r2:.4f}")

# 特征重要性
for name, importance in zip(housing.feature_names, model.feature_importances_):
    print(f"  {name}: {importance:.4f}")
```

## 注意事项与常见错误

### 数据泄露

数据泄露是指测试集的信息在训练时被模型看到了。最常见的是在划分训练集和测试集之前做了预处理（如标准化）。正确的做法是：先划分数据，然后在训练集上 fit 预处理器，再 transform 训练集和测试集：

```python
# 错误做法：先标准化再划分
# scaler.fit_transform(X)  # 用了全部数据
# X_train, X_test, ...

# 正确做法：先划分再标准化
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
scaler.fit(X_train)                    # 只在训练集上 fit
X_train_scaled = scaler.transform(X_train)
X_test_scaled = scaler.transform(X_test)
```

### 过拟合与欠拟合

- 过拟合：模型在训练集上表现很好，但在测试集上表现差。模型"死记硬背"了训练数据。解决方法：增加数据量、减少模型复杂度、使用正则化
- 欠拟合：模型在训练集和测试集上表现都不好。模型太简单，学不到数据中的规律。解决方法：增加模型复杂度、添加更多特征

### 类别不平衡

当正负样本数量差距很大时（如欺诈检测中正常交易占 99.9%），模型可能倾向于预测多数类。解决方法：

- 使用 class_weight='balanced' 参数
- 使用过采样（SMOTE）或欠采样
- 使用 F1-score 而不是准确率来评估

### 特征缩放

有些算法（如 SVM、KNN、神经网络）对特征的尺度敏感，必须先做标准化或归一化。树模型（决策树、随机森林）不受特征缩放影响。

## 进阶用法

### 使用 Pipeline 防止数据泄露

Pipeline 把多个步骤串联起来，确保 fit 和 transform 的顺序正确：

```python
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score

# 创建管道
pipeline = Pipeline([
    ('scaler', StandardScaler()),                # 标准化
    ('clf', RandomForestClassifier(n_estimators=100)),  # 分类
])

# 交叉验证时，Pipeline 确保每折的标准化只在该折的训练集上 fit
scores = cross_val_score(pipeline, X, y, cv=5)
print(f"交叉验证准确率: {scores.mean():.2%}")
```

### 集成学习

集成学习通过组合多个模型来提升性能：

```python
from sklearn.ensemble import (
    RandomForestClassifier,
    GradientBoostingClassifier,
    VotingClassifier,
)
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC

# 创建多个基模型
rf = RandomForestClassifier(n_estimators=100, random_state=42)
gb = GradientBoostingClassifier(random_state=42)
lr = LogisticRegression(max_iter=200)

# 投票集成：多个模型投票决定最终结果
ensemble = VotingClassifier(
    estimators=[('rf', rf), ('gb', gb), ('lr', lr)],
    voting='soft'  # soft 基于概率投票，hard 基于标签投票
)

ensemble.fit(X_train, y_train)
print(f"集成模型准确率: {ensemble.score(X_test, y_test):.2%}")
```

### 使用 pandas 处理真实数据

```python
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder

# 读取 CSV 数据
df = pd.read_csv('data.csv')

# 查看数据概况
print(df.head())
print(df.info())
print(df.describe())

# 处理缺失值
df = df.dropna()  # 删除缺失行
# 或者 df = df.fillna(df.mean())  # 用均值填充

# 编码分类特征
le = LabelEncoder()
df['category'] = le.fit_transform(df['category'])

# 分离特征和标签
X = df.drop('target', axis=1)
y = df['target']

# 训练模型
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
clf = RandomForestClassifier(n_estimators=100)
clf.fit(X_train, y_train)
print(f"准确率: {clf.score(X_test, y_test):.2%}")
```
