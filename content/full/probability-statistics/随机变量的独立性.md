---
order: 33
title: 随机变量的独立性
module: 'probability-statistics'
category: 'comp-sci'
difficulty: intermediate
description: 二维随机变量独立性的定义、判定方法、独立性的性质与应用。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'probability-statistics/边缘分布'
  - 'probability-statistics/条件分布'
  - 'probability-statistics/和的分布与极值分布'
  - 'probability-statistics/多维随机变量典型例题'
prerequisites:
  - 'probability-statistics/样本空间与事件'
---

## 1. 随机变量独立性的定义

### 1.1 定义

设 $(X, Y)$ 是二维随机变量，若对任意实数 $x, y$，都有

$$F(x, y) = F_X(x) \cdot F_Y(y)$$

即

$$P(X \leq x, Y \leq y) = P(X \leq x) \cdot P(Y \leq y)$$

则称随机变量 $X$ 与 $Y$ **相互独立**。

### 1.2 等价定义

**离散型**：$X$ 与 $Y$ 独立 $\iff$ 对所有 $i, j$，

$$P(X = x_i, Y = y_j) = P(X = x_i) \cdot P(Y = y_j)$$

即 $p_{ij} = p_{i\cdot} \cdot p_{\cdot j}$

**连续型**：$X$ 与 $Y$ 独立 $\iff$ 在 $f(x, y)$ 的连续点处，

$$f(x, y) = f_X(x) \cdot f_Y(y)$$

## 2. 独立性的判定方法

### 2.1 定义法

直接验证联合分布等于边缘分布的乘积。

### 2.2 分解法

若联合密度 $f(x, y)$ 可以分解为

$$f(x, y) = g(x) \cdot h(y)$$

其中 $g(x)$ 只与 $x$ 有关，$h(y)$ 只与 $y$ 有关，且 $f(x, y)$ 的非零区域为矩形（即 $x$ 和 $y$ 的取值范围互不依赖），则 $X$ 与 $Y$ 独立。

> **注意**：非零区域必须是矩形区域，否则即使密度可分解，也不独立。

### 2.3 判定步骤

1. 求出联合分布（分布律或密度）
2. 求出边缘分布
3. 检验联合分布是否等于边缘分布的乘积

## 3. 独立性的重要性质

### 3.1 独立变量的函数

若 $X$ 与 $Y$ 独立，则 $g(X)$ 与 $h(Y)$ 也独立，其中 $g$ 和 $h$ 为连续函数。

### 3.2 独立变量的概率

若 $X$ 与 $Y$ 独立，则对任意 Borel 集 $A, B$，

$$P(X \in A, Y \in B) = P(X \in A) \cdot P(Y \in B)$$

### 3.3 独立变量的期望

若 $X$ 与 $Y$ 独立且期望存在，则

$$E(XY) = E(X) \cdot E(Y)$$

### 3.4 独立变量的方差

若 $X$ 与 $Y$ 独立且方差存在，则

$$D(X + Y) = D(X) + D(Y)$$

$$D(X - Y) = D(X) + D(Y)$$

## 4. 独立性判定的典型例题

### 例题1

设 $(X, Y)$ 的联合密度为

$$f(x, y) = \begin{cases} 4xy, & 0 < x < 1, 0 < y < 1 \\ 0, & \text{其他} \end{cases}$$

判断 $X$ 与 $Y$ 是否独立。

**解**：

$$f_X(x) = \int_0^1 4xy \, dy = 2x, \quad 0 < x < 1$$

$$f_Y(y) = \int_0^1 4xy \, dx = 2y, \quad 0 < y < 1$$

$$f_X(x) \cdot f_Y(y) = 4xy = f(x, y) \quad \checkmark$$

且非零区域为矩形，故 $X$ 与 $Y$ 独立。

### 例题2

设 $(X, Y)$ 的联合密度为

$$f(x, y) = \begin{cases} 2, & 0 < x < y < 1 \\ 0, & \text{其他} \end{cases}$$

判断 $X$ 与 $Y$ 是否独立。

**解**：非零区域为三角形 $\{(x, y) : 0 < x < y < 1\}$，不是矩形，故 $X$ 与 $Y$ 不独立。

也可以验证：

$$f_X(x) = 2(1 - x), \quad f_Y(y) = 2y$$

$$f_X(x) \cdot f_Y(y) = 4y(1 - x) \neq 2 = f(x, y)$$

### 例题3

设 $(X, Y) \sim N(\mu_1, \mu_2, \sigma_1^2, \sigma_2^2, \rho)$，证明 $X$ 与 $Y$ 独立 $\iff$ $\rho = 0$。

**证明**：

当 $\rho = 0$ 时，联合密度为

$$f(x, y) = \frac{1}{2\pi\sigma_1\sigma_2} \exp\left\{-\frac{(x-\mu_1)^2}{2\sigma_1^2} - \frac{(y-\mu_2)^2}{2\sigma_2^2}\right\} = f_X(x) \cdot f_Y(y)$$

故 $X$ 与 $Y$ 独立。

当 $X$ 与 $Y$ 独立时，$f(x, y) = f_X(x) \cdot f_Y(y)$，比较联合密度公式可得 $\rho = 0$。

## 5. 多个随机变量的独立性

### 5.1 定义

设 $X_1, X_2, \cdots, X_n$ 是 $n$ 个随机变量，若对任意实数 $x_1, x_2, \cdots, x_n$，有

$$F(x_1, x_2, \cdots, x_n) = F_{X_1}(x_1) \cdot F_{X_2}(x_2) \cdots F_{X_n}(x_n)$$

则称 $X_1, X_2, \cdots, X_n$ **相互独立**。

### 5.2 独立随机变量和的性质

若 $X_1, X_2, \cdots, X_n$ 相互独立，则

1. $D\left(\sum_{i=1}^n X_i\right) = \sum_{i=1}^n D(X_i)$

2. $D\left(\sum_{i=1}^n a_i X_i\right) = \sum_{i=1}^n a_i^2 D(X_i)$

3. 独立正态变量的线性组合仍为正态变量

### 5.3 独立与两两独立

- 相互独立 $\Rightarrow$ 两两独立
- 两两独立 $\not\Rightarrow$ 相互独立

这与事件的独立性类似。
