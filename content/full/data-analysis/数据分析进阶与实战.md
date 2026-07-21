---
order: 90
title: 数据分析进阶与实战
module: 'data-analysis'
category: 'Data Science / Advanced'
difficulty: advanced
description: 时间序列分析、机器学习入门、数据清洗实战、大数据分析、数据仓库与商业智能。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'data-analysis/数据清洗-缺失值-异常值与数据类型转换'
  - 'data-analysis/实战案例-电商用户行为分析'
  - 'data-analysis/数据分析全流程'
  - 'data-analysis/数据清洗详解'
prerequisites:
  - 'data-analysis/数据分析概述'
---

## 1. 时间序列分析

### 1.1 时间序列的组成

时间序列 $Y_t$ 通常分解为三个组成部分：

$$Y_t = T_t + S_t + R_t \quad \text{（加法模型）}$$
$$Y_t = T_t \times S_t \times R_t \quad \text{（乘法模型）}$$

其中 $T_t$ 为趋势（Trend），$S_t$ 为季节性（Seasonality），$R_t$ 为残差（Residual）。

**平稳性检验**：ARIMA 建模要求序列平稳。常用 ADF 检验（Augmented Dickey-Fuller）：

- $H_0$：序列存在单位根（非平稳）
- $H_1$：序列不存在单位根（平稳）
- 若 $p < 0.05$，拒绝 $H_0$，认为序列平稳

**差分平稳化**：对非平稳序列做 $d$ 阶差分，$\Delta^d Y_t$，使序列达到平稳。

### 1.2 ARIMA 模型

ARIMA$(p, d, q)$ 由三部分组成：

- **AR$(p)$**（自回归）：$Y_t = c + \phi_1 Y_{t-1} + \cdots + \phi_p Y_{t-p} + \varepsilon_t$
- **$d$ 阶差分**：将非平稳序列差分至平稳
- **MA$(q)$**（滑动平均）：$Y_t = c + \varepsilon_t + \theta_1 \varepsilon_{t-1} + \cdots + \theta_q \varepsilon_{t-q}$

**参数选择**：通过 ACF（自相关函数）和 PACF（偏自相关函数）图确定 $p$、$q$：

| 模型    | ACF        | PACF       |
| ------- | ---------- | ---------- |
| AR$(p)$ | 拖尾       | $p$ 阶截尾 |
| MA$(q)$ | $q$ 阶截尾 | 拖尾       |
| ARMA    | 拖尾       | 拖尾       |

```python
import pandas as pd
import numpy as np
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.stattools import adfuller
import matplotlib.pyplot as plt

# 生成模拟时间序列
np.random.seed(42)
dates = pd.date_range('2020-01-01', periods=200, freq='D')
trend = np.linspace(10, 50, 200)
seasonal = 5 * np.sin(2 * np.pi * np.arange(200) / 7)
noise = np.random.normal(0, 2, 200)
ts = pd.Series(trend + seasonal + noise, index=dates, name='value')

# ADF 检验
result = adfuller(ts)
print(f'ADF 统计量: {result[0]:.4f}')
print(f'p-value: {result[1]:.4f}')

# 一阶差分后检验
ts_diff = ts.diff().dropna()
result_diff = adfuller(ts_diff)
print(f'差分后 ADF 统计量: {result_diff[0]:.4f}, p-value: {result_diff[1]:.4f}')

# 拟合 ARIMA 模型
model = ARIMA(ts, order=(2, 1, 2))
fitted = model.fit()
print(fitted.summary())

# 预测未来 30 天
forecast = fitted.forecast(steps=30)
fig, ax = plt.subplots(figsize=(12, 5))
ts.plot(ax=ax, label='历史数据')
forecast.plot(ax=ax, label='预测', color='red')
ax.set_title('ARIMA 预测')
ax.legend()
plt.tight_layout()
plt.savefig('arima_forecast.png', dpi=150)
plt.show()
```

### 1.3 Prophet 模型

Prophet 是 Facebook 开源的时间序列预测工具，自动处理趋势变化点、季节性和节假日效应：

$$y(t) = g(t) + s(t) + h(t) + \epsilon_t$$

其中 $g(t)$ 为趋势（分段线性或逻辑增长），$s(t)$ 为季节性（傅里叶级数），$h(t)$ 为节假日效应。

```python
from prophet import Prophet

# Prophet 要求列为 ds（日期）和 y（值）
df = ts.reset_index()
df.columns = ['ds', 'y']

model = Prophet(
    yearly_seasonality=True,
    weekly_seasonality=True,
    daily_seasonality=False,
    changepoint_prior_scale=0.05  # 趋势灵活度
)
model.fit(df)

# 预测未来 30 天
future = model.make_future_dataframe(periods=30)
forecast = model.predict(future)

# 可视化
fig1 = model.plot(forecast)
fig2 = model.plot_components(forecast)
plt.savefig('prophet_components.png', dpi=150)
plt.show()
```

## 2. 机器学习入门（scikit-learn）

### 2.1 scikit-learn 工作流

```
数据准备 → 特征工程 → 模型选择 → 训练 → 评估 → 调参
```

核心 API 统一：`fit()` → `predict()` / `transform()`。

### 2.2 分类

```python
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix

# 加载数据
iris = load_iris()
X, y = iris.data, iris.target
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# 训练随机森林
clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(X_train, y_train)

# 评估
y_pred = clf.predict(X_test)
print(classification_report(y_test, y_pred, target_names=iris.target_names))

# 交叉验证
scores = cross_val_score(clf, X, y, cv=5, scoring='accuracy')
print(f'5折交叉验证准确率: {scores.mean():.4f} ± {scores.std():.4f}')

# 特征重要性
importances = pd.Series(clf.feature_importances_, index=iris.feature_names)
print(importances.sort_values(ascending=False))
```

### 2.3 回归

```python
from sklearn.datasets import fetch_california_housing
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_squared_error, r2_score

housing = fetch_california_housing()
X, y = housing.data, housing.target
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Pipeline: 标准化 + Ridge 回归
pipe = Pipeline([
    ('scaler', StandardScaler()),
    ('ridge', Ridge(alpha=1.0))
])
pipe.fit(X_train, y_train)
y_pred = pipe.predict(X_test)

print(f'RMSE: {np.sqrt(mean_squared_error(y_test, y_pred)):.4f}')
print(f'R²: {r2_score(y_test, y_pred):.4f}')
```

### 2.4 聚类

```python
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

# 肘部法则确定 K
inertias = []
sil_scores = []
K_range = range(2, 11)
for k in K_range:
    km = KMeans(n_clusters=k, random_state=42, n_init=10)
    km.fit(X)
    inertias.append(km.inertia_)
    sil_scores.append(silhouette_score(X, km.labels_))

# 选择最优 K
best_k = K_range[np.argmax(sil_scores)]
print(f'最优聚类数 K = {best_k}')

# 最终聚类
km_final = KMeans(n_clusters=best_k, random_state=42, n_init=10)
labels = km_final.fit_predict(X)
```

### 2.5 特征工程

```python
from sklearn.preprocessing import (
    StandardScaler, MinMaxScaler, LabelEncoder, OneHotEncoder
)
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer

# 数值特征：标准化 + 缺失值填充
# 类别特征：独热编码
numeric_features = ['age', 'income', 'score']
categorical_features = ['city', 'category']

preprocessor = ColumnTransformer([
    ('num', Pipeline([
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ]), numeric_features),
    ('cat', Pipeline([
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('encoder', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
    ]), categorical_features)
])

# 与模型组合
from sklearn.ensemble import GradientBoostingClassifier
full_pipe = Pipeline([
    ('preprocess', preprocessor),
    ('model', GradientBoostingClassifier(random_state=42))
])
```

## 3. 数据清洗实战

### 3.1 缺失值处理

```python
import pandas as pd
import numpy as np

df = pd.DataFrame({
    'age': [25, np.nan, 35, 40, np.nan, 28],
    'income': [5000, 6000, np.nan, 8000, 7000, np.nan],
    'city': ['北京', '上海', np.nan, '北京', '广州', '上海'],
    'score': [85, 90, 78, np.nan, 88, 92]
})

# 1. 查看缺失情况
print(df.isnull().sum())
print(f'缺失比例:\n{df.isnull().mean()}')

# 2. 数值列：中位数填充
df['age'] = df['age'].fillna(df['age'].median())
df['income'] = df['income'].fillna(df['income'].median())

# 3. 类别列：众数填充
df['city'] = df['city'].fillna(df['city'].mode()[0])

# 4. 分组填充（更精细）
# df['score'] = df.groupby('city')['score'].transform(
#     lambda x: x.fillna(x.mean())
# )
```

### 3.2 异常值检测与处理

```python
# IQR 方法
def detect_outliers_iqr(series, factor=1.5):
    Q1, Q3 = series.quantile([0.25, 0.75])
    IQR = Q3 - Q1
    lower = Q1 - factor * IQR
    upper = Q3 + factor * IQR
    return (series < lower) | (series > upper)

outlier_mask = detect_outliers_iqr(df['income'])
print(f'异常值数量: {outlier_mask.sum()}')

# 处理方式一：截断（Winsorize）
df['income_clipped'] = df['income'].clip(
    lower=df['income'].quantile(0.01),
    upper=df['income'].quantile(0.99)
)

# 处理方式二：Z-Score 方法
from scipy import stats
z_scores = np.abs(stats.zscore(df['income'].dropna()))
outliers_z = z_scores > 3
```

### 3.3 重复值处理

```python
# 检测完全重复行
print(f'重复行数: {df.duplicated().sum()}')

# 基于关键列检测
print(f'基于关键列重复: {df.duplicated(subset=["age", "city"]).sum()}')

# 去重（保留最后一条）
df_dedup = df.drop_duplicates(subset=["age", "city"], keep='last')
```

### 3.4 特征编码

```python
# Label Encoding（有序类别）
from sklearn.preprocessing import LabelEncoder
le = LabelEncoder()
df['city_encoded'] = le.fit_transform(df['city'])

# One-Hot Encoding（无序类别）
df_encoded = pd.get_dummies(df, columns=['city'], drop_first=True)

# 目标编码（Target Encoding，高基数类别）
target_mean = df.groupby('city')['score'].mean()
df['city_target_enc'] = df['city'].map(target_mean)

# 频率编码
freq = df['city'].value_counts(normalize=True)
df['city_freq_enc'] = df['city'].map(freq)
```

## 4. 大数据分析

### 4.1 PySpark 基础

```python
from pyspark.sql import SparkSession
from pyspark.sql import functions as F

# 创建 Spark 会话
spark = SparkSession.builder \
    .appName('FANDEX-BigData') \
    .master('local[*]') \
    .getOrCreate()

# 读取数据
df = spark.read.csv('large_dataset.csv', header=True, inferSchema=True)
df.printSchema()
df.show(5)

# 基本操作
df.filter(F.col('amount') > 1000) \
  .groupBy('category') \
  .agg(
      F.count('*').alias('cnt'),
      F.mean('amount').alias('avg_amount'),
      F.sum('amount').alias('total_amount')
  ) \
  .orderBy(F.desc('total_amount')) \
  .show()

# SQL 查询
df.createOrReplaceTempView('transactions')
result = spark.sql("""
    SELECT category, COUNT(*) as cnt, AVG(amount) as avg_amt
    FROM transactions
    WHERE amount > 1000
    GROUP BY category
    ORDER BY avg_amt DESC
""")
result.show()

spark.stop()
```

### 4.2 Dask 并行计算

```python
import dask.dataframe as dd

# 读取大型 CSV（延迟加载，不立即加载到内存）
ddf = dd.read_csv('data/chunk_*.csv')

# 操作与 pandas 类似，但延迟执行
result = ddf[ddf['amount'] > 1000] \
    .groupby('category')['amount'] \
    .mean()

# compute() 触发实际计算
print(result.compute())

# 与 pandas 互转
pdf = ddf.compute()          # Dask → pandas（需内存足够）
ddf2 = dd.from_pandas(pdf, npartitions=4)  # pandas → Dask
```

### 4.3 Polars 高性能数据处理

```python
import polars as pl

# 读取数据
df = pl.read_csv('dataset.csv')

# 惰性 API（推荐，可优化查询计划）
lf = pl.scan_csv('dataset.csv')
result = lf.filter(pl.col('amount') > 1000) \
    .groupby('category') \
    .agg([
        pl.count().alias('cnt'),
        pl.col('amount').mean().alias('avg_amount'),
        pl.col('amount').sum().alias('total_amount')
    ]) \
    .sort('total_amount', descending=True) \
    .collect()  # 触发执行

print(result)

# 与 pandas 性能对比
# Polars 在多线程、零拷贝、惰性求值方面显著优于 pandas
```

## 5. 数据仓库

### 5.1 ETL 流程

ETL（Extract-Transform-Load）是数据仓库建设的核心流程：

| 阶段      | 任务               | 工具                 |
| --------- | ------------------ | -------------------- |
| Extract   | 从源系统抽取数据   | API/数据库连接器/CDC |
| Transform | 清洗、转换、聚合   | SQL/Python/dbt       |
| Load      | 加载到目标数据仓库 | 批量加载/流式写入    |

```python
# 简易 ETL 示例
import pandas as pd
from sqlalchemy import create_engine

# Extract: 从多个源读取
orders = pd.read_csv('orders.csv')
users = pd.read_csv('users.csv')
products = pd.read_csv('products.csv')

# Transform: 清洗与关联
orders['order_date'] = pd.to_datetime(orders['order_date'])
orders['amount'] = orders['quantity'] * orders['unit_price']

# 关联用户和产品信息
enriched = orders.merge(users, on='user_id', how='left') \
                 .merge(products, on='product_id', how='left')

# 聚合：按月统计
monthly = enriched.groupby(enriched['order_date'].dt.to_period('M')).agg(
    total_revenue=('amount', 'sum'),
    order_count=('order_id', 'nunique'),
    avg_order_value=('amount', 'mean')
).reset_index()

# Load: 写入数据仓库
engine = create_engine('postgresql://user:pass@warehouse:5432/analytics')
monthly.to_sql('monthly_summary', engine, if_exists='replace', index=False)
```

### 5.2 OLAP 与维度建模

**OLAP**（联机分析处理）支持多维数据分析，核心操作：

- **上卷（Roll-up）**：沿维度层次聚合（日→月→年）
- **下钻（Drill-down）**：沿维度层次细化（年→月→日）
- **切片（Slice）**：固定某维度值
- **切块（Dice）**：选定多维子集

**星型模型**：事实表（Fact）居中，周围连接维度表（Dimension）：

```
         ┌──────────┐
         │ 时间维度 │
         └────┬─────┘
              │
┌──────────┐  │  ┌──────────┐
│ 产品维度 ├──事实表──┤ 地域维度 │
└──────────┘  │  └──────────┘
              │
         ┌────┴─────┐
         │ 客户维度 │
         └──────────┘
```

**雪花模型**：维度表进一步规范化，拆分为子维度表。

### 5.3 dbt 数据转换

```sql
-- models/monthly_revenue.sql
{{ config(materialized='table') }}

SELECT
    DATE_TRUNC('month', order_date) AS month,
    COUNT(DISTINCT order_id) AS order_count,
    SUM(amount) AS total_revenue,
    AVG(amount) AS avg_order_value
FROM {{ ref('stg_orders') }}
GROUP BY 1
ORDER BY 1
```

## 6. 商业智能（BI）

### 6.1 Dashboard 设计原则

| 原则     | 说明                           |
| -------- | ------------------------------ |
| 信息层次 | 核心指标 → 趋势分析 → 明细数据 |
| 视觉编码 | 用颜色/大小/位置映射数据维度   |
| 交互设计 | 筛选/下钻/联动，让用户自主探索 |
| 告警机制 | 关键指标异常时自动通知         |

### 6.2 Python Dashboard（Streamlit）

```python
import streamlit as st
import pandas as pd
import plotly.express as px

st.set_page_config(page_title='销售分析 Dashboard', layout='wide')

# 数据加载（缓存）
@st.cache_data
def load_data():
    return pd.read_csv('sales.csv', parse_dates=['order_date'])

df = load_data()

# 侧边栏筛选
st.sidebar.header('筛选条件')
date_range = st.sidebar.date_input('日期范围')
category = st.sidebar.multiselect('产品类别', df['category'].unique())

# 筛选数据
mask = (df['order_date'].dt.date >= date_range[0]) & \
       (df['order_date'].dt.date <= date_range[1])
if category:
    mask &= df['category'].isin(category)
filtered = df[mask]

# 核心指标卡片
col1, col2, col3 = st.columns(3)
col1.metric('总营收', f'¥{filtered["amount"].sum():,.0f}')
col2.metric('订单数', f'{filtered["order_id"].nunique():,}')
col3.metric('客单价', f'¥{filtered["amount"].mean():,.0f}')

# 趋势图
st.subheader('营收趋势')
daily = filtered.groupby('order_date')['amount'].sum().reset_index()
fig = px.line(daily, x='order_date', y='amount', title='日营收趋势')
st.plotly_chart(fig, use_container_width=True)

# 类别分布
st.subheader('类别分布')
cat_data = filtered.groupby('category')['amount'].sum().reset_index()
fig2 = px.pie(cat_data, values='amount', names='category')
st.plotly_chart(fig2, use_container_width=True)
```

### 6.3 Tableau / Power BI 集成

**Tableau 集成方式**：

1. **直接连接**：Tableau Desktop 连接数据库（PostgreSQL/MySQL/BigQuery）
2. **Hyper 数据提取**：使用 Tableau Hyper API 将 Pandas DataFrame 导出为 `.hyper` 文件

```python
# 使用 tableauhyperapi 导出
from tableauhyperapi import HyperProcess, Connection, TableDefinition, SqlType, Inserter
import pandas as pd

df = pd.read_csv('analytics_result.csv')

with HyperProcess(telemetry='sent') as hp:
    with Connection(endpoint=hp.endpoint, database='output.hyper', create_mode='create') as conn:
        # 定义表结构并写入
        table_def = TableDefinition(
            table_name='Extract',
            columns=[
                TableDefinition.Column(name, SqlType.text())
                for name in df.columns
            ]
        )
        conn.catalog.create_table(table_def)
        with Inserter(conn, table_def) as inserter:
            for row in df.itertuples(index=False):
                inserter.add_row(row)
            inserter.execute()
```

**Power BI 集成方式**：

1. **DirectQuery**：实时查询数据库
2. **Python 视觉对象**：Power BI 内嵌 Python 脚本生成图表
3. **数据流**：使用 Power Query 的 Python 转换

```python
# Power BI Python 视觉对象示例
import matplotlib.pyplot as plt

dataset  # Power BI 自动注入的数据集
fig, ax = plt.subplots(figsize=(8, 5))
dataset.groupby('category')['revenue'].sum().plot.bar(ax=ax)
ax.set_title('类别营收')
ax.set_ylabel('营收')
plt.tight_layout()
plt.show()
```

## 7. 综合实战：端到端分析项目

### 7.1 项目流程

```
业务问题 → 数据采集 → ETL → 探索性分析 → 建模 → 可视化 → 决策建议
```

### 7.2 完整示例：销售预测与异常检测

```python
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest, GradientBoostingRegressor
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_absolute_error

# ---- 1. 数据加载与清洗 ----
df = pd.read_csv('sales.csv', parse_dates=['date'])
df = df.sort_values('date').set_index('date')

# 缺失值处理
df['sales'] = df['sales'].interpolate(method='time')

# ---- 2. 特征工程 ----
df['dayofweek'] = df.index.dayofweek
df['month'] = df.index.month
df['lag_7'] = df['sales'].shift(7)
df['lag_30'] = df['sales'].shift(30)
df['rolling_7'] = df['sales'].rolling(7).mean()
df = df.dropna()

# ---- 3. 异常检测 ----
iso = IsolationForest(contamination=0.02, random_state=42)
df['is_anomaly'] = iso.fit_predict(df[['sales']]) == -1
print(f'检测到异常天数: {df["is_anomaly"].sum()}')

# ---- 4. 销售预测 ----
features = ['dayofweek', 'month', 'lag_7', 'lag_30', 'rolling_7']
X, y = df[features], df['sales']

tscv = TimeSeriesSplit(n_splits=5)
mae_scores = []
for train_idx, test_idx in tscv.split(X):
    model = GradientBoostingRegressor(
        n_estimators=200, max_depth=5, random_state=42
    )
    model.fit(X.iloc[train_idx], y.iloc[train_idx])
    pred = model.predict(X.iloc[test_idx])
    mae_scores.append(mean_absolute_error(y.iloc[test_idx], pred))

print(f'时序交叉验证 MAE: {np.mean(mae_scores):.2f} ± {np.std(mae_scores):.2f}')

# ---- 5. 输出预测 ----
final_model = GradientBoostingRegressor(
    n_estimators=200, max_depth=5, random_state=42
)
final_model.fit(X, y)
df['predicted'] = final_model.predict(X)
df[['sales', 'predicted']].tail(30).plot(figsize=(12, 5), title='销售预测')
plt.savefig('sales_forecast.png', dpi=150)
plt.show()
```

## 8. 知识脉络与要点总结

| 主题     | 核心工具/方法                  | 关键要点                   |
| -------- | ------------------------------ | -------------------------- |
| 时间序列 | ARIMA / Prophet                | 平稳性检验、ACF/PACF 定阶  |
| 分类     | RandomForest / XGBoost         | 交叉验证、特征重要性       |
| 回归     | Ridge / GBR                    | Pipeline 标准化、正则化    |
| 聚类     | KMeans                         | 肘部法则、轮廓系数         |
| 特征工程 | Scaler / Encoder               | ColumnTransformer 统一流程 |
| 数据清洗 | Pandas                         | 缺失值/异常值/重复值/编码  |
| 大数据   | PySpark / Dask / Polars        | 延迟执行、分区并行         |
| 数据仓库 | ETL / OLAP / dbt               | 星型模型、维度建模         |
| 商业智能 | Streamlit / Tableau / Power BI | Dashboard 设计、交互可视化 |
