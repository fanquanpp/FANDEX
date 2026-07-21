---
title: 机器学习统计
description: '描述性统计、相关性、假设检验、t 检验、卡方检验、Bootstrap、A/B 测试'
module: 'ai-engineering'
difficulty: intermediate
tags:
  - 统计
  - 假设检验
  - t检验
  - 卡方检验
  - Bootstrap
  - AB测试
  - 相关性
related:
  - 'ai-engineering/个人AI导师自适应多模态与记忆'
  - 'ai-engineering/合规框架'
  - 'ai-engineering/机器学习微积分'
  - 'ai-engineering/激活函数'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 机器学习统计

> 统计学让你区分信号和噪声。没有它，你只是在看数字。

**类型：** 构建
**语言：** Python
**前置条件：** 阶段 1，第 06 课（概率与分布）
**预计时间：** ~90 分钟

## 学习目标

- 计算描述性统计量（均值、中位数、方差、分位数）并解释其含义
- 使用假设检验判断观察到的差异是否显著
- 从零实现 t 检验和卡方检验
- 应用 Bootstrap 方法估计统计量的不确定性
- 设计和评估 A/B 测试

## 问题所在

你的新模型比基线高 2% 准确率。但这 2% 是真实的改进还是随机波动？你需要统计检验来回答。

## 核心概念

### 描述性统计

```python
import numpy as np

data = np.random.randn(1000) * 5 + 10

print(f"均值: {np.mean(data):.2f}")
print(f"中位数: {np.median(data):.2f}")
print(f"标准差: {np.std(data):.2f}")
print(f"方差: {np.var(data):.2f}")
print(f"25%分位: {np.percentile(data, 25):.2f}")
print(f"75%分位: {np.percentile(data, 75):.2f}")
```

### 相关性

```python
def pearson_correlation(x, y):
    """Pearson 相关系数"""
    x_mean = np.mean(x)
    y_mean = np.mean(y)
    numerator = np.sum((x - x_mean) * (y - y_mean))
    denominator = np.sqrt(np.sum((x - x_mean)**2) * np.sum((y - y_mean)**2))
    return numerator / denominator

x = np.random.randn(100)
y = 2 * x + np.random.randn(100) * 0.5
print(f"相关系数: {pearson_correlation(x, y):.4f}")
```

### 假设检验

假设检验判断观察到的效果是否可能由偶然产生。

步骤：

1. 陈述零假设（H0）和备择假设（H1）
2. 选择显著性水平（alpha，通常 0.05）
3. 计算检验统计量
4. 计算 p 值
5. 如果 p < alpha，拒绝 H0

### t 检验

比较两组均值是否有显著差异。

```python
def t_test(group1, group2):
    """独立样本 t 检验"""
    n1, n2 = len(group1), len(group2)
    mean1, mean2 = np.mean(group1), np.mean(group2)
    var1, var2 = np.var(group1, ddof=1), np.var(group2, ddof=1)

    # 合并标准误
    se = np.sqrt(var1/n1 + var2/n2)

    # t 统计量
    t_stat = (mean1 - mean2) / se

    # 自由度（Welch 近似）
    df = (var1/n1 + var2/n2)**2 / ((var1/n1)**2/(n1-1) + (var2/n2)**2/(n2-1))

    # p 值（双侧）
    from scipy import stats
    p_value = 2 * (1 - stats.t.cdf(abs(t_stat), df))

    return t_stat, p_value

# 示例：模型 A vs 模型 B 的准确率
model_a = np.random.normal(0.85, 0.03, 100)
model_b = np.random.normal(0.87, 0.03, 100)

t_stat, p_value = t_test(model_a, model_b)
print(f"t 统计量: {t_stat:.4f}")
print(f"p 值: {p_value:.4f}")
print(f"结论: {'显著' if p_value < 0.05 else '不显著'}")
```

### 卡方检验

检验分类变量之间是否独立。

```python
def chi_squared_test(observed):
    """卡方独立性检验"""
    observed = np.array(observed)
    row_totals = observed.sum(axis=1, keepdims=True)
    col_totals = observed.sum(axis=0, keepdims=True)
    grand_total = observed.sum()

    expected = row_totals * col_totals / grand_total

    chi2 = np.sum((observed - expected) ** 2 / expected)

    df = (observed.shape[0] - 1) * (observed.shape[1] - 1)

    from scipy import stats
    p_value = 1 - stats.chi2.cdf(chi2, df)

    return chi2, p_value

# 示例：模型类型 vs 是否过拟合
observed = [[30, 10],   # 线性模型
             [15, 25]]   # 深度模型

chi2, p = chi_squared_test(observed)
print(f"卡方统计量: {chi2:.4f}")
print(f"p 值: {p:.4f}")
```

### Bootstrap

Bootstrap 通过重复采样估计统计量的分布。

```python
def bootstrap(data, statistic, n_bootstrap=10000):
    """Bootstrap 方法估计统计量的置信区间"""
    stats = []
    for _ in range(n_bootstrap):
        sample = np.random.choice(data, size=len(data), replace=True)
        stats.append(statistic(sample))

    stats = np.array(stats)
    ci_lower = np.percentile(stats, 2.5)
    ci_upper = np.percentile(stats, 97.5)

    return np.mean(stats), (ci_lower, ci_upper)

data = np.random.randn(50) * 5 + 10
mean, (ci_lo, ci_hi) = bootstrap(data, np.mean)
print(f"均值: {mean:.2f}")
print(f"95% 置信区间: [{ci_lo:.2f}, {ci_hi:.2f}]")
```

### A/B 测试

A/B 测试是假设检验在产品决策中的应用。

```python
def ab_test(conversions_a, visitors_a, conversions_b, visitors_b):
    """A/B 测试：比较两个转化率"""
    p_a = conversions_a / visitors_a
    p_b = conversions_b / visitors_b

    p_pool = (conversions_a + conversions_b) / (visitors_a + visitors_b)

    se = np.sqrt(p_pool * (1 - p_pool) * (1/visitors_a + 1/visitors_b))

    z_stat = (p_b - p_a) / se

    from scipy import stats
    p_value = 2 * (1 - stats.norm.cdf(abs(z_stat)))

    return {
        "转化率 A": f"{p_a:.4f}",
        "转化率 B": f"{p_b:.4f}",
        "提升": f"{(p_b - p_a) / p_a:.2%}",
        "z 统计量": f"{z_stat:.4f}",
        "p 值": f"{p_value:.4f}",
        "显著": p_value < 0.05
    }

result = ab_test(150, 1000, 180, 1000)
for k, v in result.items():
    print(f"{k}: {v}")
```

## 实际应用

| 方法       | AI 中的位置              |
| ---------- | ------------------------ |
| 描述性统计 | 数据探索，特征工程       |
| 相关性     | 特征选择，多重共线性检测 |
| t 检验     | 模型比较，超参数效果验证 |
| 卡方检验   | 特征与目标变量的独立性   |
| Bootstrap  | 置信区间，模型性能估计   |
| A/B 测试   | 模型部署决策，在线评估   |

## 练习

1. 对两个不同分布的样本运行 t 检验，然后对同分布样本运行，观察 p 值差异
2. 用 Bootstrap 估计中位数的 95% 置信区间
3. 设计一个 A/B 测试：比较两个推荐算法的点击率，计算所需样本量
4. 计算特征之间的相关矩阵，识别高度相关的特征对
