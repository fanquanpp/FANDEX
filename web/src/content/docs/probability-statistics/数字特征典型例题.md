---
order: 45
title: 数字特征典型例题
module: 'probability-statistics'
category: 'comp-sci'
difficulty: intermediate
description: 数字特征部分的典型例题精选，涵盖期望、方差、协方差、相关系数等核心知识点。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'probability-statistics/相关系数'
  - 'probability-statistics/矩与协方差矩阵'
  - 'probability-statistics/切比雪夫不等式'
  - 'probability-statistics/大数定律'
prerequisites:
  - 'probability-statistics/样本空间与事件'
---

## 1. 数学期望

### 例题1

设 $X$ 的密度函数为 $f(x) = \dfrac{1}{2}e^{-|x|}$，求 $E(X)$ 和 $E(X^2)$。

**解**：

$$E(X) = \int_{-\infty}^{+\infty} x \cdot \frac{1}{2}e^{-|x|} \, dx = 0$$（奇函数在对称区间上积分）

$$E(X^2) = \int_{-\infty}^{+\infty} x^2 \cdot \frac{1}{2}e^{-|x|} \, dx = \int_0^{+\infty} x^2 e^{-x} \, dx = \Gamma(3) = 2$$

### 例题2

设 $X \sim U(0, 1)$，求 $E(X^n)$。

**解**：

$$E(X^n) = \int_0^1 x^n \, dx = \frac{1}{n+1}$$

### 例题3

某人有 $n$ 把钥匙，其中只有一把能开门。他随机取一把试开，不能开门则除去，求试开次数 $X$ 的期望。

**解**：$X$ 的分布律为 $P(X = k) = \dfrac{1}{n}$（$k = 1, 2, \cdots, n$）。

$$E(X) = \sum_{k=1}^n k \cdot \frac{1}{n} = \frac{n+1}{2}$$

## 2. 方差

### 例题4

设 $X$ 的密度为 $f(x) = \begin{cases} 3x^2, & 0 < x < 1 \\ 0, & \text{其他} \end{cases}$，求 $D(X)$。

**解**：

$$E(X) = \int_0^1 x \cdot 3x^2 \, dx = \frac{3}{4}$$

$$E(X^2) = \int_0^1 x^2 \cdot 3x^2 \, dx = \frac{3}{5}$$

$$D(X) = E(X^2) - [E(X)]^2 = \frac{3}{5} - \frac{9}{16} = \frac{48 - 45}{80} = \frac{3}{80}$$

### 例题5

设 $X \sim B(10, 0.4)$，求 $E(3X + 2)$ 和 $D(3X + 2)$。

**解**：

$$E(X) = 10 \times 0.4 = 4, \quad D(X) = 10 \times 0.4 \times 0.6 = 2.4$$

$$E(3X + 2) = 3E(X) + 2 = 14$$

$$D(3X + 2) = 9D(X) = 21.6$$

### 例题6

设随机变量 $X$ 的期望 $E(X) = 10$，$D(X) = 4$，求 $E[(X+1)^2]$。

**解**：

$$E[(X+1)^2] = E[X^2 + 2X + 1] = E(X^2) + 2E(X) + 1$$

$$= [D(X) + E(X)^2] + 2E(X) + 1 = (4 + 100) + 20 + 1 = 125$$

## 3. 协方差与相关系数

### 例题7

设 $(X, Y)$ 的联合密度为

$$f(x, y) = \begin{cases} 1, & 0 < x < 1, 0 < y < 1 \\ 0, & \text{其他} \end{cases}$$

求 $\text{Cov}(X, Y)$ 和 $\rho_{XY}$。

**解**：$X$ 与 $Y$ 独立（非零区域为矩形，联合密度可分解），故 $\text{Cov}(X, Y) = 0$，$\rho_{XY} = 0$。

### 例题8

设 $(X, Y)$ 的联合密度为

$$f(x, y) = \begin{cases} 2, & 0 < y < x < 1 \\ 0, & \text{其他} \end{cases}$$

求 $\text{Cov}(X, Y)$ 和 $\rho_{XY}$。

**解**：

$$E(X) = \frac{2}{3}, \quad E(Y) = \frac{1}{3}, \quad E(XY) = \frac{1}{4}$$

$$\text{Cov}(X, Y) = \frac{1}{4} - \frac{2}{9} = \frac{1}{36}$$

$$E(X^2) = \int_0^1 \int_0^x 2x^2 \, dy \, dx = \frac{1}{2}, \quad D(X) = \frac{1}{2} - \frac{4}{9} = \frac{1}{18}$$

$$E(Y^2) = \int_0^1 \int_y^1 2y^2 \, dx \, dy = \frac{1}{6}, \quad D(Y) = \frac{1}{6} - \frac{1}{9} = \frac{1}{18}$$

$$\rho_{XY} = \frac{1/36}{\sqrt{1/18 \times 1/18}} = \frac{1/36}{1/18} = \frac{1}{2}$$

### 例题9

设 $X$ 与 $Y$ 的相关系数 $\rho = 0.5$，$D(X) = D(Y) = 1$，求 $D(X - Y)$。

**解**：

$$D(X - Y) = D(X) + D(Y) - 2\text{Cov}(X, Y) = 1 + 1 - 2 \times 0.5 = 1$$

### 例题10

设 $X \sim N(0, 1)$，$Y = X^2$，求 $\text{Cov}(X, Y)$。

**解**：

$$E(X) = 0, \quad E(Y) = E(X^2) = 1$$

$$E(XY) = E(X^3) = 0$$（正态分布的奇数阶矩为零）

$$\text{Cov}(X, Y) = 0 - 0 = 0$$

$X$ 与 $Y$ 不相关，但 $Y = X^2$，显然不独立。

## 4. 综合题

### 例题11

设 $X_1, X_2, \cdots, X_n$ 独立同分布，$E(X_i) = \mu$，$D(X_i) = \sigma^2$，设 $\bar{X} = \dfrac{1}{n}\sum_{i=1}^n X_i$，求 $E(\bar{X})$ 和 $D(\bar{X})$。

**解**：

$$E(\bar{X}) = \frac{1}{n} \sum_{i=1}^n E(X_i) = \mu$$

$$D(\bar{X}) = \frac{1}{n^2} \sum_{i=1}^n D(X_i) = \frac{\sigma^2}{n}$$

### 例题12

设 $X_1, X_2, \cdots, X_n$ 独立同分布，$E(X_i) = \mu$，$D(X_i) = \sigma^2$，求 $E\left[\sum_{i=1}^n (X_i - \bar{X})^2\right]$。

**解**：

$$\sum_{i=1}^n (X_i - \bar{X})^2 = \sum_{i=1}^n X_i^2 - n\bar{X}^2$$

$$E\left[\sum_{i=1}^n X_i^2\right] = n(\mu^2 + \sigma^2)$$

$$E[n\bar{X}^2] = n[D(\bar{X}) + E(\bar{X})^2] = n\left(\frac{\sigma^2}{n} + \mu^2\right) = \sigma^2 + n\mu^2$$

$$E\left[\sum_{i=1}^n (X_i - \bar{X})^2\right] = n(\mu^2 + \sigma^2) - \sigma^2 - n\mu^2 = (n-1)\sigma^2$$

### 例题13

设 $X$ 与 $Y$ 独立，$X \sim N(1, 4)$，$Y \sim N(2, 9)$，求 $E(2X - 3Y + 1)$ 和 $D(2X - 3Y + 1)$。

**解**：

$$E(2X - 3Y + 1) = 2 \times 1 - 3 \times 2 + 1 = -3$$

$$D(2X - 3Y + 1) = 4 \times 4 + 9 \times 9 = 16 + 81 = 97$$

### 例题14

设 $X \sim U(0, 2\pi)$，求 $E(\sin X)$ 和 $E(\cos X)$。

**解**：

$$E(\sin X) = \frac{1}{2\pi}\int_0^{2\pi} \sin x \, dx = 0$$

$$E(\cos X) = \frac{1}{2\pi}\int_0^{2\pi} \cos x \, dx = 0$$

### 例题15

设 $X_1, X_2, \cdots, X_{100}$ 独立同分布，$X_i \sim B(1, 0.6)$，利用切比雪夫不等式估计 $P\left(\sum_{i=1}^{100} X_i \geq 70\right)$。

**解**：设 $S = \sum_{i=1}^{100} X_i$，$E(S) = 60$，$D(S) = 24$。

$$P(S \geq 70) = P(S - 60 \geq 10) \leq P(|S - 60| \geq 10) \leq \frac{D(S)}{10^2} = \frac{24}{100} = 0.24$$
