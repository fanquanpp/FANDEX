---
order: 42
title: 协方差
module: 'probability-statistics'
category: 'comp-sci'
difficulty: intermediate
description: 协方差的定义、性质、计算方法与协方差矩阵。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'probability-statistics/数学期望'
  - 'probability-statistics/方差与标准差'
  - 'probability-statistics/相关系数'
  - 'probability-statistics/矩与协方差矩阵'
prerequisites:
  - 'probability-statistics/样本空间与事件'
---

## 1. 协方差的定义

### 1.1 定义

设 $X$ 和 $Y$ 是两个随机变量，若 $E[X - E(X)][Y - E(Y)]$ 存在，则称

$$\text{Cov}(X, Y) = E[X - E(X)][Y - E(Y)]$$

为 $X$ 与 $Y$ 的**协方差**。

### 1.2 协方差的计算公式

$$\text{Cov}(X, Y) = E(XY) - E(X)E(Y)$$

**证明**：

$$\text{Cov}(X, Y) = E[X - E(X)][Y - E(Y)] = E[XY - XE(Y) - YE(X) + E(X)E(Y)]$$

$$= E(XY) - E(X)E(Y) - E(Y)E(X) + E(X)E(Y) = E(XY) - E(X)E(Y)$$

### 1.3 协方差的直观意义

协方差衡量了两个随机变量的**线性相关程度**：

- $\text{Cov}(X, Y) > 0$：$X$ 与 $Y$ 正相关（$X$ 增大时 $Y$ 倾向于增大）
- $\text{Cov}(X, Y) < 0$：$X$ 与 $Y$ 负相关（$X$ 增大时 $Y$ 倾向于减小）
- $\text{Cov}(X, Y) = 0$：$X$ 与 $Y$ 不相关（无线性关系）

## 2. 协方差的性质

### 2.1 基本性质

1. **对称性**：$\text{Cov}(X, Y) = \text{Cov}(Y, X)$

2. **自身协方差**：$\text{Cov}(X, X) = D(X)$

3. **常数**：$\text{Cov}(X, C) = 0$（$C$ 为常数）

4. **线性性**：

$$\text{Cov}(aX, bY) = ab \cdot \text{Cov}(X, Y)$$

$$\text{Cov}(X_1 + X_2, Y) = \text{Cov}(X_1, Y) + \text{Cov}(X_2, Y)$$

5. **更一般的双线性性**：

$$\text{Cov}\left(\sum_{i=1}^m a_i X_i, \sum_{j=1}^n b_j Y_j\right) = \sum_{i=1}^m \sum_{j=1}^n a_i b_j \text{Cov}(X_i, Y_j)$$

6. **方差与协方差的关系**：

$$D(X \pm Y) = D(X) + D(Y) \pm 2\text{Cov}(X, Y)$$

$$D\left(\sum_{i=1}^n X_i\right) = \sum_{i=1}^n D(X_i) + 2\sum_{i < j} \text{Cov}(X_i, X_j)$$

7. **独立性推论**：若 $X$ 与 $Y$ 独立，则 $\text{Cov}(X, Y) = 0$

   > 注意：反之不成立，$\text{Cov}(X, Y) = 0$ 不能推出 $X$ 与 $Y$ 独立。

### 2.2 协方差的界

$$|\text{Cov}(X, Y)| \leq \sqrt{D(X) \cdot D(Y)}$$

这由柯西-施瓦茨不等式直接得到。

## 3. 协方差的计算

### 3.1 离散型

$$\text{Cov}(X, Y) = \sum_{i=1}^{\infty} \sum_{j=1}^{\infty} [x_i - E(X)][y_j - E(Y)] p_{ij}$$

或

$$\text{Cov}(X, Y) = \sum_{i=1}^{\infty} \sum_{j=1}^{\infty} x_i y_j p_{ij} - E(X)E(Y)$$

### 3.2 连续型

$$\text{Cov}(X, Y) = \int_{-\infty}^{+\infty} \int_{-\infty}^{+\infty} [x - E(X)][y - E(Y)] f(x, y) \, dx \, dy$$

或

$$\text{Cov}(X, Y) = \int_{-\infty}^{+\infty} \int_{-\infty}^{+\infty} xy f(x, y) \, dx \, dy - E(X)E(Y)$$

### 3.3 计算示例

**例题**：设 $(X, Y)$ 的联合密度为

$$f(x, y) = \begin{cases} 2, & 0 < y < x < 1 \\ 0, & \text{其他} \end{cases}$$

求 $\text{Cov}(X, Y)$。

**解**：

$$E(X) = \int_0^1 \int_0^x 2x \, dy \, dx = \int_0^1 2x^2 \, dx = \frac{2}{3}$$

$$E(Y) = \int_0^1 \int_y^1 2y \, dx \, dy = \int_0^1 2y(1-y) \, dy = \frac{1}{3}$$

$$E(XY) = \int_0^1 \int_0^x 2xy \, dy \, dx = \int_0^1 2x \cdot \frac{x^2}{2} \, dx = \int_0^1 x^3 \, dx = \frac{1}{4}$$

$$\text{Cov}(X, Y) = E(XY) - E(X)E(Y) = \frac{1}{4} - \frac{2}{3} \times \frac{1}{3} = \frac{1}{4} - \frac{2}{9} = \frac{1}{36}$$

## 4. 不相关与独立

### 4.1 不相关的定义

若 $\text{Cov}(X, Y) = 0$，即 $E(XY) = E(X)E(Y)$，则称 $X$ 与 $Y$ **不相关**。

### 4.2 不相关与独立的关系

- 独立 $\Rightarrow$ 不相关
- 不相关 $\not\Rightarrow$ 独立

### 4.3 不相关但非独立的例子

设 $X \sim U(-1, 1)$，$Y = X^2$，则

$$E(X) = 0, \quad E(XY) = E(X^3) = 0$$

$$\text{Cov}(X, Y) = E(XY) - E(X)E(Y) = 0 - 0 = 0$$

$X$ 与 $Y$ 不相关，但 $Y = X^2$，显然 $X$ 与 $Y$ 不独立。

### 4.4 特殊情况：二维正态分布

对于 $(X, Y) \sim N(\mu_1, \mu_2, \sigma_1^2, \sigma_2^2, \rho)$：

$$X \text{ 与 } Y \text{ 不相关} \iff X \text{ 与 } Y \text{ 独立} \iff \rho = 0$$

这是二维正态分布的特殊性质，一般分布不具备。

## 5. 协方差的应用

### 5.1 投资组合风险

$$D(wX + (1-w)Y) = w^2 D(X) + (1-w)^2 D(Y) + 2w(1-w)\text{Cov}(X, Y)$$

当 $\text{Cov}(X, Y) < 0$ 时，可以通过分散投资降低风险。

### 5.2 回归分析

协方差是回归分析的基础，最小二乘回归系数为

$$\beta = \frac{\text{Cov}(X, Y)}{D(X)}$$
