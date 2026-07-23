---
order: 23
title: 'Scikit-learn实战'
module: 'machine-learning'
category: data
difficulty: intermediate
description: 'Scikit-learn Pipeline、模型选择、超参调优与最佳实践。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'machine-learning/特征工程详解'
  - 'machine-learning/强化学习基础'
  - 'machine-learning/不平衡数据处理'
  - 'machine-learning/策略梯度与REINFORCE'
prerequisites: []
---

## 1. Scikit-learn核心API

### 1.1 统一接口

Scikit-learn 所有估计器遵循统一接口：

| 方法               | 说明       |
| :----------------- | :--------- |
| `fit(X, y)`        | 训练模型   |
| `predict(X)`       | 预测       |
| `transform(X)`     | 数据转换   |
| `fit_transform(X)` | 训练并转换 |
| `score(X, y)`      | 评估       |

### 1.2 估计器类型

| 类型   | 基类               | 示例                           |
| :----- | :----------------- | :----------------------------- |
| 分类器 | `ClassifierMixin`  | SVC, RandomForestClassifier    |
| 回归器 | `RegressorMixin`   | LinearRegression, XGBRegressor |
| 转换器 | `TransformerMixin` | StandardScaler, PCA            |
| 聚类器 | `ClusterMixin`     | KMeans, DBSCAN                 |

## 2. Pipeline管道

### 2.1 Pipeline构建

```python
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression

pipe = Pipeline([
    ('imputer', SimpleImputer(strategy='median')),
    ('scaler', StandardScaler()),
    ('classifier', LogisticRegression())
])

pipe.fit(X_train, y_train)
y_pred = pipe.predict(X_test)
```

### 2.2 ColumnTransformer

对不同列应用不同预处理：

```python
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler

numeric_features = ['age', 'income', 'score']
categorical_features = ['city', 'category']

preprocessor = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), numeric_features),
        ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
    ])

pipe = Pipeline([
    ('preprocessor', preprocessor),
    ('classifier', LogisticRegression())
])
```

### 2.3 FeatureUnion

并行应用多个转换器并合并结果：

```python
from sklearn.pipeline import FeatureUnion
from sklearn.decomposition import PCA
from sklearn.kernel_approximation import RBFSampler

combined = FeatureUnion([
    ('pca', PCA(n_components=10)),
    ('rbf', RBFSampler(n_components=50))
])
```

### 2.4 自定义转换器

```python
from sklearn.base import BaseEstimator, TransformerMixin

class DateFeatureExtractor(BaseEstimator, TransformerMixin):
    def __init__(self, date_col='date'):
        self.date_col = date_col

    def fit(self, X, y=None):
        return self

    def transform(self, X):
        X = X.copy()
        dt = pd.to_datetime(X[self.date_col])
        X['year'] = dt.dt.year
        X['month'] = dt.dt.month
        X['day_of_week'] = dt.dt.dayofweek
        X['hour'] = dt.dt.hour
        return X.drop(columns=[self.date_col])
```

## 3. 模型选择

### 3.1 交叉验证评估

```python
from sklearn.model_selection import cross_val_score, cross_validate

# 单指标
scores = cross_val_score(pipe, X, y, cv=5, scoring='accuracy')

# 多指标
cv_results = cross_validate(pipe, X, y, cv=5,
    scoring=['accuracy', 'f1_macro', 'roc_auc'],
    return_train_score=True)
```

### 3.2 学习曲线

```python
from sklearn.model_selection import learning_curve

train_sizes, train_scores, val_scores = learning_curve(
    estimator, X, y,
    train_sizes=np.linspace(0.1, 1.0, 10),
    cv=5, scoring='accuracy'
)

train_mean = train_scores.mean(axis=1)
val_mean = val_scores.mean(axis=1)
```

**诊断**：

- 训练和验证曲线都低且接近 → 高偏差（欠拟合）
- 训练曲线高、验证曲线低 → 高方差（过拟合）

### 3.3 验证曲线

```python
from sklearn.model_selection import validation_curve

param_range = [1, 5, 10, 50, 100]
train_scores, val_scores = validation_curve(
    RandomForestClassifier(), X, y,
    param_name='n_estimators',
    param_range=param_range, cv=5
)
```

## 4. 超参数调优

### 4.1 网格搜索

```python
from sklearn.model_selection import GridSearchCV

param_grid = {
    'classifier__C': [0.01, 0.1, 1, 10],
    'classifier__penalty': ['l1', 'l2'],
    'preprocessor__num__with_mean': [True, False]
}

grid_search = GridSearchCV(pipe, param_grid, cv=5,
    scoring='f1_macro', n_jobs=-1, verbose=1)
grid_search.fit(X_train, y_train)

print(f"最佳参数: {grid_search.best_params_}")
print(f"最佳分数: {grid_search.best_score_}")
```

### 4.2 随机搜索

```python
from sklearn.model_selection import RandomizedSearchCV
from scipy.stats import loguniform, randint

param_distributions = {
    'classifier__C': loguniform(1e-3, 1e3),
    'classifier__max_iter': randint(100, 1000),
    'classifier__solver': ['saga', 'lbfgs']
}

random_search = RandomizedSearchCV(
    pipe, param_distributions, n_iter=50, cv=5,
    scoring='f1_macro', n_jobs=-1, random_state=42
)
random_search.fit(X_train, y_train)
```

### 4.3 Halving搜索

```python
from sklearn.experimental import enable_halving_search_cv
from sklearn.model_selection import HalvingGridSearchCV

halving_search = HalvingGridSearchCV(
    pipe, param_grid, cv=5,
    factor=3,  # 每轮淘汰2/3候选
    scoring='f1_macro', n_jobs=-1
)
```

### 4.4 调优策略对比

| 方法                | 搜索空间  | 效率 | 适用场景   |
| :------------------ | :-------- | :--- | :--------- |
| GridSearchCV        | 离散、小  | 低   | 参数少     |
| RandomizedSearchCV  | 连续+离散 | 中   | 参数多     |
| HalvingGridSearchCV | 离散      | 高   | 大搜索空间 |
| Optuna              | 连续+离散 | 最高 | 生产环境   |

## 5. 最佳实践

### 5.1 数据泄露防范

```python
#  错误：先标准化再划分
X_scaled = StandardScaler().fit_transform(X)
X_train, X_test = train_test_split(X_scaled)

#  正确：Pipeline确保只在训练集上fit
pipe = Pipeline([('scaler', StandardScaler()), ('model', LogisticRegression())])
pipe.fit(X_train, y_train)
```

### 5.2 模型持久化

```python
import joblib

# 保存
joblib.dump(pipe, 'model_pipeline.pkl')

# 加载
loaded_pipe = joblib.load('model_pipeline.pkl')
y_pred = loaded_pipe.predict(X_new)
```

### 5.3 完整工作流模板

```python
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report

# 1. 数据划分
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42)

# 2. 构建Pipeline
pipe = Pipeline([
    ('imputer', SimpleImputer(strategy='median')),
    ('scaler', StandardScaler()),
    ('clf', RandomForestClassifier(random_state=42))
])

# 3. 超参调优
param_dist = {
    'clf__n_estimators': randint(100, 500),
    'clf__max_depth': randint(5, 30),
    'clf__min_samples_split': randint(2, 20)
}
search = RandomizedSearchCV(pipe, param_dist, n_iter=50,
    cv=5, scoring='f1_macro', n_jobs=-1, random_state=42)
search.fit(X_train, y_train)

# 4. 评估
y_pred = search.best_estimator_.predict(X_test)
print(classification_report(y_test, y_pred))

# 5. 保存
joblib.dump(search.best_estimator_, 'best_model.pkl')
```
