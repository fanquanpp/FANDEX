---
order: 34
title: 和的分布与极值分布
module: 'probability-statistics'
category: 'comp-sci'
difficulty: advanced
description: 随机变量和的分布（卷积公式）、最大值与最小值分布、商的分布。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'probability-statistics/条件分布'
  - 'probability-statistics/随机变量的独立性'
  - 'probability-statistics/多维随机变量典型例题'
  - 'probability-statistics/数学期望'
prerequisites:
  - 'probability-statistics/样本空间与事件'
---

## 1. 随机变量和的分布

### 1.1 离散型情形

设 $X$ 和 $Y$ 为独立离散型随机变量，分布律分别为 $P(X = x_i)$ 和 $P(Y = y_j)$，则 $Z = X + Y$ 的分布律为

$$P(Z = z_k) = \sum_{x_i + y_j = z_k} P(X = x_i) P(Y = y_j) = \sum_i P(X = x_i) P(Y = z_k - x_i)$$

### 1.2 连续型情形——卷积公式

设 $X$ 和 $Y$ 为独立连续型随机变量，密度函数分别为 $f_X(x)$ 和 $f_Y(y)$，则 $Z = X + Y$ 的密度函数为

$$f_Z(z) = \int_{-\infty}^{+\infty} f_X(x) f_Y(z - x) \, dx = \int_{-\infty}^{+\infty} f_X(z - y) f_Y(y) \, dy$$

这称为**卷积公式**，记作 $f_Z = f_X * f_Y$。

### 1.3 卷积公式的推导

$$F_Z(z) = P(X + Y \leq z) = \iint_{x + y \leq z} f_X(x) f_Y(y) \, dx \, dy = \int_{-\infty}^{+\infty} f_X(x) \left[\int_{-\infty}^{z-x} f_Y(y) \, dy\right] dx$$

$$= \int_{-\infty}^{+\infty} f_X(x) F_Y(z - x) \, dx$$

$$f_Z(z) = \frac{d}{dz} F_Z(z) = \int_{-\infty}^{+\infty} f_X(x) f_Y(z - x) \, dx$$

### 1.4 卷积公式的应用

**例题**：设 $X \sim N(\mu_1, \sigma_1^2)$，$Y \sim N(\mu_2, \sigma_2^2)$，且 $X$ 与 $Y$ 独立，求 $Z = X + Y$ 的分布。

**解**：利用卷积公式可以证明 $Z \sim N(\mu_1 + \mu_2, \sigma_1^2 + \sigma_2^2)$。

更一般地，若 $X_1, X_2, \cdots, X_n$ 相互独立，$X_i \sim N(\mu_i, \sigma_i^2)$，则

$$\sum_{i=1}^n a_i X_i \sim N\left(\sum_{i=1}^n a_i \mu_i, \sum_{i=1}^n a_i^2 \sigma_i^2\right)$$

**例题**：设 $X \sim \text{Exp}(\lambda_1)$，$Y \sim \text{Exp}(\lambda_2)$，且 $X$ 与 $Y$ 独立（$\lambda_1 \neq \lambda_2$），求 $Z = X + Y$ 的密度。

**解**：

$$f_Z(z) = \int_0^z \lambda_1 e^{-\lambda_1 x} \cdot \lambda_2 e^{-\lambda_2(z-x)} \, dx = \lambda_1 \lambda_2 e^{-\lambda_2 z} \int_0^z e^{(\lambda_2 - \lambda_1)x} \, dx$$

$$= \lambda_1 \lambda_2 e^{-\lambda_2 z} \cdot \frac{e^{(\lambda_2 - \lambda_1)z} - 1}{\lambda_2 - \lambda_1} = \frac{\lambda_1 \lambda_2}{\lambda_2 - \lambda_1}(e^{-\lambda_1 z} - e^{-\lambda_2 z}), \quad z > 0$$

当 $\lambda_1 = \lambda_2 = \lambda$ 时，$Z \sim \Gamma(2, \lambda)$。

## 2. 随机变量差的分布

设 $X$ 和 $Y$ 独立，$Z = X - Y$，则

$$f_Z(z) = \int_{-\infty}^{+\infty} f_X(x) f_Y(x - z) \, dx = \int_{-\infty}^{+\infty} f_X(y + z) f_Y(y) \, dy$$

## 3. 随机变量商的分布

### 3.1 商的密度公式

设 $X$ 和 $Y$ 为独立连续型随机变量，$Z = \dfrac{X}{Y}$，则

$$f_Z(z) = \int_{-\infty}^{+\infty} |y| f_X(zy) f_Y(y) \, dy$$

### 3.2 推导

$$F_Z(z) = P\left(\frac{X}{Y} \leq z\right) = \iint_{x/y \leq z} f_X(x) f_Y(y) \, dx \, dy$$

$$= \int_0^{+\infty} F_X(zy) f_Y(y) \, dy + \int_{-\infty}^0 [1 - F_X(zy)] f_Y(y) \, dy$$

对 $z$ 求导即得商的密度公式。

## 4. 最大值分布

### 4.1 公式

设 $X_1, X_2, \cdots, X_n$ 相互独立，分布函数分别为 $F_1, F_2, \cdots, F_n$，则 $M = \max(X_1, X_2, \cdots, X_n)$ 的分布函数为

$$F_M(x) = P(M \leq x) = P(X_1 \leq x, X_2 \leq x, \cdots, X_n \leq x) = \prod_{i=1}^n F_i(x)$$

若 $X_1, X_2, \cdots, X_n$ 独立同分布，分布函数为 $F(x)$，则

$$F_M(x) = [F(x)]^n$$

### 4.2 密度函数

若 $X_1, X_2, \cdots, X_n$ 独立同分布，密度为 $f(x)$，则

$$f_M(x) = n[F(x)]^{n-1} f(x)$$

## 5. 最小值分布

### 5.1 公式

设 $X_1, X_2, \cdots, X_n$ 相互独立，分布函数分别为 $F_1, F_2, \cdots, F_n$，则 $N = \min(X_1, X_2, \cdots, X_n)$ 的分布函数为

$$F_N(x) = 1 - P(N > x) = 1 - \prod_{i=1}^n P(X_i > x) = 1 - \prod_{i=1}^n [1 - F_i(x)]$$

若 $X_1, X_2, \cdots, X_n$ 独立同分布，分布函数为 $F(x)$，则

$$F_N(x) = 1 - [1 - F(x)]^n$$

### 5.2 密度函数

若 $X_1, X_2, \cdots, X_n$ 独立同分布，密度为 $f(x)$，则

$$f_N(x) = n[1 - F(x)]^{n-1} f(x)$$

## 6. 极值分布的应用

### 6.1 系统可靠性

**串联系统**：$n$ 个元件串联，系统寿命 $T = \min(T_1, T_2, \cdots, T_n)$

**并联系统**：$n$ 个元件并联，系统寿命 $T = \max(T_1, T_2, \cdots, T_n)$

### 6.2 指数分布的极值

设 $X_1, X_2, \cdots, X_n$ 独立同分布，$X_i \sim \text{Exp}(\lambda)$，则

$$F_{\min}(x) = 1 - e^{-n\lambda x}, \quad x > 0$$

即 $\min(X_1, \cdots, X_n) \sim \text{Exp}(n\lambda)$。

### 6.3 均匀分布的极值

设 $X_1, X_2, \cdots, X_n$ 独立同分布，$X_i \sim U(0, 1)$，则

$$f_{\max}(x) = nx^{n-1}, \quad 0 < x < 1$$

$$f_{\min}(x) = n(1-x)^{n-1}, \quad 0 < x < 1$$
