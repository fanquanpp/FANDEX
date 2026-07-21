---
title: 时间序列
description: 时间序列分析处理随时间变化的数据，捕捉趋势、季节性和自相关
module: 'machine-learning'
difficulty: intermediate
tags:
  - 时间序列
  - 趋势
  - 季节性
  - ARIMA
  - 预测
related:
  - 'machine-learning/朴素贝叶斯'
  - 'machine-learning/什么是机器学习'
  - 'machine-learning/特征工程与选择'
  - 'machine-learning/特征选择进阶'
prerequisites:
  - 'machine-learning/机器学习概述'
---

# 时间序列

> 时间序列分析处理随时间变化的数据，捕捉趋势、季节性和自相关。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 2 第1-14课
**时间:** ~60 分钟

## 学习目标

- 分解时间序列为趋势、季节性和残差分量
- 从零实现移动平均、指数平滑和简单AR模型
- 理解平稳性概念并执行ADF检验
- 使用正确的时序交叉验证避免数据泄漏

## 问题

你想预测下个月的销售额。数据是按月记录的过去5年销售额。标准ML假设样本独立，但时间序列数据点之间有依赖关系：今天的值依赖昨天的值。忽略时间顺序会丢失关键信息。

时间序列分析明确建模这种时间依赖性。

## 概念

### 时间序列分量

任何时间序列可以分解为：

```
y(t) = 趋势 + 季节性 + 残差
```

**趋势**：长期上升或下降方向。人口增长、技术进步。

**季节性**：固定周期的重复模式。每年圣诞季销售高峰。

**残差**：去除趋势和季节性后的随机波动。

### 平稳性

平稳时间序列的统计性质（均值、方差、自相关）不随时间变化。大多数时间序列模型假设平稳性。

非平稳序列可通过差分变平稳：y'(t) = y(t) - y(t-1)。

ADF检验（Augmented Dickey-Fuller）检验平稳性。p值<0.05拒绝非平稳假设。

### 自相关

自相关衡量序列与自身滞后版本的相关性。ACF图显示不同滞后期的自相关系数。

- ACF缓慢衰减：非平稳
- ACF快速截断：平稳
- ACF在滞后k处显著：k阶自相关

### 移动平均

简单移动平均(SMA)：最近k个值的平均。平滑噪声，揭示趋势。

指数移动平均(EMA)：给最近值更大权重：EMA(t) = alpha _ y(t) + (1-alpha) _ EMA(t-1)。

### ARIMA模型

ARIMA(p, d, q)：

- p：自回归阶数（用过去p个值预测）
- d：差分次数（使序列平稳）
- q：移动平均阶数（用过去q个误差预测）

AR(p)：y(t) = c + a1*y(t-1) + ... + ap*y(t-p) + noise
MA(q)：y(t) = c + e(t) + b1*e(t-1) + ... + bq*e(t-q)

### 时序交叉验证

标准k折交叉验证打乱数据，破坏时间顺序。时序交叉验证（前滚验证）保持顺序：

1. 在[0:t]上训练，预测t+1
2. 在[0:t+1]上训练，预测t+2
3. 重复

## 动手构建

```python
import random
import math

def generate_time_series(n=200, trend=0.05, seasonality=5, noise=1.0):
    y = []
    for t in range(n):
        trend_val = trend * t
        season_val = seasonality * math.sin(2 * math.pi * t / 12)
        noise_val = random.gauss(0, noise)
        y.append(trend_val + season_val + noise_val)
    return y

def simple_moving_average(y, window=5):
    result = []
    for i in range(len(y)):
        if i < window - 1:
            result.append(sum(y[:i+1]) / (i+1))
        else:
            result.append(sum(y[i-window+1:i+1]) / window)
    return result

def exponential_moving_average(y, alpha=0.3):
    result = [y[0]]
    for i in range(1, len(y)):
        result.append(alpha * y[i] + (1 - alpha) * result[-1])
    return result

def decompose(y, period=12):
    n = len(y)
    trend = simple_moving_average(y, window=period)
    seasonal = []
    for p in range(period):
        indices = [i for i in range(p, n, period)]
        seasonal.append(sum(y[i] - trend[i] for i in indices) / len(indices))
    seasonal_mean = sum(seasonal) / len(seasonal)
    seasonal = [s - seasonal_mean for s in seasonal]
    seasonal_full = [seasonal[i % period] for i in range(n)]
    residual = [y[i] - trend[i] - seasonal_full[i] for i in range(n)]
    return trend, seasonal_full, residual

def autocorrelation(y, max_lag=20):
    n = len(y)
    y_mean = sum(y) / n
    y_var = sum((yi - y_mean) ** 2 for yi in y) / n
    acf = []
    for lag in range(max_lag + 1):
        if y_var == 0:
            acf.append(0)
        else:
            cov = sum((y[i] - y_mean) * (y[i + lag] - y_mean) for i in range(n - lag)) / n
            acf.append(cov / y_var)
    return acf

def difference(y, d=1):
    for _ in range(d):
        y = [y[i] - y[i-1] for i in range(1, len(y))]
    return y

class SimpleAR:
    def __init__(self, p=1):
        self.p = p
        self.coeffs = None
        self.intercept = 0

    def fit(self, y):
        n = len(y)
        X = []
        targets = []
        for i in range(self.p, n):
            X.append([y[i - j - 1] for j in range(self.p)])
            targets.append(y[i])

        n_samples = len(X)
        X_mat = [row + [1] for row in X]
        n_feat = self.p + 1
        XtX = [[sum(X_mat[k][i] * X_mat[k][j] for k in range(n_samples))
                for j in range(n_feat)] for i in range(n_feat)]
        Xty = [sum(X_mat[k][i] * targets[k] for k in range(n_samples)) for i in range(n_feat)]
        self.coeffs = self._solve(XtX, Xty)
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

    def predict_next(self, y, steps=1):
        y = list(y)
        predictions = []
        for _ in range(steps):
            features = [y[-(j + 1)] for j in range(self.p)] + [1]
            pred = sum(c * f for c, f in zip(self.coeffs, features))
            predictions.append(pred)
            y.append(pred)
        return predictions

random.seed(42)
ts = generate_time_series(n=200, trend=0.05, seasonality=5, noise=1.0)

print("=== Time Series Analysis ===")
print(f"Series length: {len(ts)}")
print(f"First 10 values: {[round(v, 2) for v in ts[:10]]}")

trend, seasonal, residual = decompose(ts, period=12)
print(f"\nDecomposition (first 12 values):")
print(f"  Trend:    {[round(v, 2) for v in trend[:12]]}")
print(f"  Seasonal: {[round(v, 2) for v in seasonal[:12]]}")
print(f"  Residual: {[round(v, 2) for v in residual[:12]]}")

acf = autocorrelation(ts, max_lag=12)
print(f"\nAutocorrelation (lags 0-12):")
for lag, val in enumerate(acf):
    print(f"  Lag {lag:2d}: {val:.4f}")

ts_diff = difference(ts, d=1)
acf_diff = autocorrelation(ts_diff, max_lag=12)
print(f"\nDifferenced ACF (lags 0-12):")
for lag, val in enumerate(acf_diff[:6]):
    print(f"  Lag {lag:2d}: {val:.4f}")

ar = SimpleAR(p=3)
ar.fit(ts[:180])
preds = ar.predict_next(ts[:180], steps=20)
actual = ts[180:]
mae = sum(abs(p - a) for p, a in zip(preds, actual)) / len(actual)
print(f"\nAR(3) forecast MAE: {mae:.4f}")
print(f"First 5 predictions: {[round(p, 2) for p in preds[:5]]}")
print(f"First 5 actuals:     {[round(a, 2) for a in actual[:5]]}")
```

## 实际使用

```python
from statsmodels.tsa.seasonal import seasonal_decompose
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.stattools import adfuller
import numpy as np

np.random.seed(42)
t = np.arange(200)
ts_np = 0.05 * t + 5 * np.sin(2 * np.pi * t / 12) + np.random.randn(200)

result = adfuller(ts_np)
print(f"ADF Statistic: {result[0]:.4f}")
print(f"p-value: {result[1]:.4f}")
print(f"Stationary: {'Yes' if result[1] < 0.05 else 'No'}")

model = ARIMA(ts_np[:180], order=(3, 1, 1))
fitted = model.fit()
forecast = fitted.forecast(steps=20)
mae = np.mean(np.abs(forecast - ts_np[180:]))
print(f"\nARIMA(3,1,1) forecast MAE: {mae:.4f}")
```

## 练习

1. 生成具有不同趋势和季节性参数的时间序列。展示差分如何使它们平稳。
2. 实现时序交叉验证（前滚验证）。比较AR模型在不同预测步长上的误差。
3. 比较简单移动平均、指数平滑和AR模型在真实时间序列数据上的预测性能。

## 关键术语

| 术语   | 人们怎么说           | 实际含义                                 |
| ------ | -------------------- | ---------------------------------------- |
| 趋势   | "长期方向"           | 时间序列的长期上升或下降模式             |
| 季节性 | "周期性重复"         | 固定周期的重复模式                       |
| 平稳性 | "统计性质不变"       | 均值和方差不随时间变化                   |
| 自相关 | "自己跟自己的相关"   | 序列与自身滞后版本的相关性               |
| ARIMA  | "自回归积分移动平均" | 结合自回归、差分和移动平均的时间序列模型 |
| 差分   | "取相邻差"           | y(t) - y(t-1)，使非平稳序列变平稳        |
