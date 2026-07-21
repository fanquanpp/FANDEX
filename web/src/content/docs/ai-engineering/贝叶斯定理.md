---
title: 贝叶斯定理
description: '贝叶斯定理、朴素贝叶斯分类器、MLE 与 MAP、共轭先验、A/B 测试'
module: 'ai-engineering'
difficulty: intermediate
tags:
  - 贝叶斯
  - 先验
  - 后验
  - MLE
  - MAP
  - 朴素贝叶斯
  - 共轭先验
related:
  - 'ai-engineering/Scikit-learn实战'
  - 'ai-engineering/安全密钥与审计'
  - 'ai-engineering/边缘推理平台'
  - 'ai-engineering/编辑器配置'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 贝叶斯定理

> 贝叶斯定理是更新信念的数学。看到证据后，你应该相信什么？

**类型：** 构建
**语言：** Python
**前置条件：** 阶段 1，第 06 课（概率与分布）
**预计时间：** ~90 分钟

## 学习目标

- 应用贝叶斯定理计算后验概率，解释先验、似然和后验的关系
- 从零实现朴素贝叶斯分类器
- 区分最大似然估计（MLE）和最大后验估计（MAP）
- 使用共轭先验简化贝叶斯更新

## 问题所在

医生说检测呈阳性。检测准确率 99%。你实际患病的概率是多少？大多数人会说 99%。但答案取决于疾病的流行率（先验概率）。如果疾病很罕见（0.1%），阳性结果的真实概率只有约 9%。

这就是贝叶斯定理：用新证据更新先验信念。在 AI 中，它用于：

- **垃圾邮件过滤**：朴素贝叶斯分类器
- **推荐系统**：从用户行为更新偏好
- **A/B 测试**：从数据更新转化率估计
- **模型不确定性**：贝叶斯神经网络

## 核心概念

### 贝叶斯定理

```
P(H|E) = P(E|H) * P(H) / P(E)
```

- `P(H)`：先验——看到证据前的信念
- `P(E|H)`：似然——假设为真时观察到证据的概率
- `P(H|E)`：后验——看到证据后的信念
- `P(E)`：证据——归一化常数

```python
def bayes(prior, likelihood, evidence):
    """贝叶斯定理"""
    return (likelihood * prior) / evidence

# 医学检测例子
prevalence = 0.001        # 先验：P(病)
sensitivity = 0.99        # 似然：P(阳性|病)
false_positive = 0.05     # P(阳性|无病)

# P(阳性) = P(阳性|病)*P(病) + P(阳性|无病)*P(无病)
p_positive = sensitivity * prevalence + false_positive * (1 - prevalence)

# P(病|阳性)
posterior = bayes(prevalence, sensitivity, p_positive)
print(f"P(病|阳性) = {posterior:.4f}")  # 约 0.019
```

### 朴素贝叶斯分类器

朴素贝叶斯假设特征之间条件独立。虽然这个假设几乎总是错的，但分类器在实践中效果出奇地好。

```python
class NaiveBayes:
    def __init__(self):
        self.class_priors = {}
        self.feature_probs = {}

    def fit(self, X, y):
        classes = set(y)
        n = len(y)

        for c in classes:
            self.class_priors[c] = sum(1 for yi in y if yi == c) / n
            X_c = [xi for xi, yi in zip(X, y) if yi == c]
            self.feature_probs[c] = [
                (sum(x[j] for x in X_c) / len(X_c))
                for j in range(len(X[0]))
            ]

    def predict(self, x):
        scores = {}
        for c in self.class_priors:
            log_prob = np.log(self.class_priors[c])
            for j, xj in enumerate(x):
                p = self.feature_probs[c][j]
                log_prob += xj * np.log(p + 1e-10) + (1 - xj) * np.log(1 - p + 1e-10)
            scores[c] = log_prob
        return max(scores, key=scores.get)
```

### MLE vs MAP

**最大似然估计（MLE）**：找到使数据概率最大的参数。

```
theta_MLE = argmax P(data|theta)
```

**最大后验估计（MAP）**：找到使后验概率最大的参数。

```
theta_MAP = argmax P(theta|data) = argmax P(data|theta) * P(theta)
```

MAP = MLE + 先验。先验起正则化作用。

```python
# 抛硬币：7 次正面，3 次反面
heads, tails = 7, 3

# MLE
p_mle = heads / (heads + tails)
print(f"MLE: p = {p_mle:.2f}")  # 0.70

# MAP（Beta(2,2) 先验）
alpha_prior, beta_prior = 2, 2
p_map = (heads + alpha_prior - 1) / (heads + tails + alpha_prior + beta_prior - 2)
print(f"MAP: p = {p_map:.2f}")  # 0.67
```

### 共轭先验

共轭先验使得后验分布与先验分布属于同一族，简化计算。

| 似然             | 共轭先验  | 后验      |
| ---------------- | --------- | --------- |
| 伯努利           | Beta      | Beta      |
| 二项             | Beta      | Beta      |
| 泊松             | Gamma     | Gamma     |
| 正态（已知方差） | 正态      | 正态      |
| 多项             | Dirichlet | Dirichlet |

## 实际应用

| 概念       | AI 中的位置            |
| ---------- | ---------------------- |
| 贝叶斯定理 | 垃圾邮件过滤，医学诊断 |
| 朴素贝叶斯 | 文本分类，情感分析     |
| MLE        | 参数估计，模型训练     |
| MAP        | 正则化，贝叶斯深度学习 |
| 共轭先验   | 变分推断，在线学习     |

## 练习

1. 用不同的先验概率重新计算医学检测例子，观察先验对后验的影响
2. 实现朴素贝叶斯分类器对文本进行垃圾邮件分类
3. 比较抛硬币的 MLE 和 MAP 估计，观察先验强度如何影响结果
4. 使用 Beta-Binomial 共轭先验进行在线更新：先看到 3 次正面，再看到 2 次正面，追踪后验的变化
