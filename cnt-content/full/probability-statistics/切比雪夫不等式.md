---
order: 50
title: 切比雪夫不等式
module: 'probability-statistics'
category: 'comp-sci'
difficulty: intermediate
description: 切比雪夫不等式的表述、证明、应用与推广。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'probability-statistics/矩与协方差矩阵'
  - 'probability-statistics/数字特征典型例题'
  - 'probability-statistics/大数定律'
  - 'probability-statistics/中心极限定理'
prerequisites:
  - 'probability-statistics/样本空间与事件'
---

## 1. 切比雪夫不等式

### 1.1 定理表述

设随机变量 $X$ 的期望 $E(X) = \mu$ 和方差 $D(X) = \sigma^2$ 都存在，则对任意 $\varepsilon > 0$，有

$$P(|X - \mu| \geq \varepsilon) \leq \frac{\sigma^2}{\varepsilon^2}$$

等价形式：

$$P(|X - \mu| < \varepsilon) \geq 1 - \frac{\sigma^2}{\varepsilon^2}$$

### 1.2 证明

**连续型情形**：

$$P(|X - \mu| \geq \varepsilon) = \int_{|x - \mu| \geq \varepsilon} f(x) \, dx$$

由于在积分区域上 $\dfrac{(x - \mu)^2}{\varepsilon^2} \geq 1$，故

$$\leq \int_{|x - \mu| \geq \varepsilon} \frac{(x - \mu)^2}{\varepsilon^2} f(x) \, dx \leq \frac{1}{\varepsilon^2} \int_{-\infty}^{+\infty} (x - \mu)^2 f(x) \, dx = \frac{\sigma^2}{\varepsilon^2}$$

**离散型情形**类似。

### 1.3 切比雪夫不等式的意义

1. **不需要知道分布**：只需知道期望和方差即可估计概率
2. **普适性**：适用于任何分布
3. **保守性**：给出的上界通常较宽松，实际概率可能远小于上界

## 2. 切比雪夫不等式的应用

### 2.1 估计概率

**例题**：设 $E(X) = 3$，$D(X) = 2$，估计 $P(|X - 3| \geq 4)$。

**解**：

$$P(|X - 3| \geq 4) \leq \frac{2}{16} = \frac{1}{8} = 0.125$$

### 2.2 确定样本量

**例题**：设 $X_1, X_2, \cdots, X_n$ 独立同分布，$E(X_i) = \mu$，$D(X_i) = \sigma^2$，要使 $P(|\bar{X} - \mu| < 0.5) \geq 0.95$，$n$ 至少为多少？

**解**：$E(\bar{X}) = \mu$，$D(\bar{X}) = \dfrac{\sigma^2}{n}$。

$$P(|\bar{X} - \mu| < 0.5) \geq 1 - \frac{\sigma^2/n}{0.25} = 1 - \frac{4\sigma^2}{n}$$

要求 $1 - \dfrac{4\sigma^2}{n} \geq 0.95$，即 $\dfrac{4\sigma^2}{n} \leq 0.05$，$n \geq 80\sigma^2$。

### 2.3 证明估计的相合性

设 $\hat{\theta}_n$ 是参数 $\theta$ 的估计量，若 $E(\hat{\theta}_n) = \theta$ 且 $D(\hat{\theta}_n) \to 0$（$n \to \infty$），则由切比雪夫不等式：

$$P(|\hat{\theta}_n - \theta| \geq \varepsilon) \leq \frac{D(\hat{\theta}_n)}{\varepsilon^2} \to 0$$

即 $\hat{\theta}_n$ 是 $\theta$ 的相合估计。

## 3. 切比雪夫不等式的推广

### 3.1 马尔可夫不等式

设 $X$ 是非负随机变量，$E(X)$ 存在，则对任意 $\varepsilon > 0$，

$$P(X \geq \varepsilon) \leq \frac{E(X)}{\varepsilon}$$

切比雪夫不等式是马尔可夫不等式的推论（令 $X = (Y - E(Y))^2$）。

### 3.2 单边切比雪夫不等式

设 $E(X) = \mu$，$D(X) = \sigma^2$，则对任意 $a > 0$，

$$P(X - \mu \geq a) \leq \frac{\sigma^2}{\sigma^2 + a^2}$$

### 3.3 多维切比雪夫不等式

设 $\mathbf{X}$ 为 $n$ 维随机向量，$E(\mathbf{X}) = \boldsymbol{\mu}$，协方差矩阵为 $\boldsymbol{\Sigma}$，则对任意 $\varepsilon > 0$，

$$P\left((\mathbf{X} - \boldsymbol{\mu})^T \boldsymbol{\Sigma}^{-1} (\mathbf{X} - \boldsymbol{\mu}) \geq \varepsilon\right) \leq \frac{n}{\varepsilon}$$

## 4. 切比雪夫不等式的局限性

### 4.1 保守性

切比雪夫不等式给出的上界通常远大于实际概率。

**例题**：设 $X \sim N(0, 1)$，比较 $P(|X| \geq 2)$ 的实际值与切比雪夫上界。

**解**：

实际值：$P(|X| \geq 2) = 2(1 - \Phi(2)) \approx 2 \times 0.0228 = 0.0456$

切比雪夫上界：$P(|X| \geq 2) \leq \dfrac{1}{4} = 0.25$

上界比实际值大约 5.5 倍。

### 4.2 改进方向

- 当分布已知时，直接计算概率更精确
- 中心极限定理给出更好的渐近估计
- 对于特定分布族，有更精确的不等式
