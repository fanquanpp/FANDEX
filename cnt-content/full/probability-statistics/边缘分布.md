---
order: 31
title: 边缘分布
module: 'probability-statistics'
category: 'comp-sci'
difficulty: intermediate
description: 边缘分布函数、边缘分布律、边缘概率密度的定义与计算。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'probability-statistics/随机变量典型例题'
  - 'probability-statistics/联合分布'
  - 'probability-statistics/条件分布'
  - 'probability-statistics/随机变量的独立性'
prerequisites:
  - 'probability-statistics/样本空间与事件'
---

## 1. 边缘分布函数

### 1.1 定义

设 $(X, Y)$ 的联合分布函数为 $F(x, y)$，则

$$F_X(x) = P(X \leq x) = P(X \leq x, Y < +\infty) = F(x, +\infty) = \lim_{y \to +\infty} F(x, y)$$

$$F_Y(y) = P(Y \leq y) = P(X < +\infty, Y \leq y) = F(+\infty, y) = \lim_{x \to +\infty} F(x, y)$$

分别称为 $(X, Y)$ 关于 $X$ 和关于 $Y$ 的**边缘分布函数**。

### 1.2 边缘分布与联合分布的关系

- 联合分布 $\Rightarrow$ 边缘分布（唯一确定）
- 边缘分布 $\not\Rightarrow$ 联合分布（不唯一确定）

不同的联合分布可以有相同的边缘分布。

## 2. 离散型随机变量的边缘分布

### 2.1 边缘分布律

设 $(X, Y)$ 的联合分布律为 $P(X = x_i, Y = y_j) = p_{ij}$，则

$$P(X = x_i) = \sum_{j=1}^{\infty} p_{ij} = p_{i\cdot}, \quad i = 1, 2, \cdots$$

$$P(Y = y_j) = \sum_{i=1}^{\infty} p_{ij} = p_{\cdot j}, \quad j = 1, 2, \cdots$$

分别称为关于 $X$ 和关于 $Y$ 的**边缘分布律**。

### 2.2 计算方法

在联合分布律表中：

- $X$ 的边缘分布律：将每行求和，写在表的右边
- $Y$ 的边缘分布律：将每列求和，写在表的下边

### 2.3 示例

设 $(X, Y)$ 的联合分布律为：

| $X \backslash Y$ |       1        |       2        |        3        |  $p_{i\cdot}$  |
| :--------------: | :------------: | :------------: | :-------------: | :------------: |
|        1         | $\dfrac{1}{6}$ | $\dfrac{1}{9}$ | $\dfrac{1}{18}$ | $\dfrac{1}{3}$ |
|        2         | $\dfrac{1}{3}$ | $\dfrac{2}{9}$ | $\dfrac{1}{9}$  | $\dfrac{2}{3}$ |
|  $p_{\cdot j}$   | $\dfrac{1}{2}$ | $\dfrac{1}{3}$ | $\dfrac{1}{6}$  |       1        |

$X$ 的边缘分布律：

| $X$ | 1              | 2              |
| --- | -------------- | -------------- |
| $P$ | $\dfrac{1}{3}$ | $\dfrac{2}{3}$ |

$Y$ 的边缘分布律：

| $Y$ | 1              | 2              | 3              |
| --- | -------------- | -------------- | -------------- |
| $P$ | $\dfrac{1}{2}$ | $\dfrac{1}{3}$ | $\dfrac{1}{6}$ |

## 3. 连续型随机变量的边缘分布

### 3.1 边缘概率密度

设 $(X, Y)$ 的联合概率密度为 $f(x, y)$，则

$$f_X(x) = \int_{-\infty}^{+\infty} f(x, y) \, dy$$

$$f_Y(y) = \int_{-\infty}^{+\infty} f(x, y) \, dx$$

分别称为关于 $X$ 和关于 $Y$ 的**边缘概率密度**。

### 3.2 计算要点

1. 确定联合密度 $f(x, y)$ 的非零区域
2. 对 $y$ 积分求 $f_X(x)$ 时，注意 $y$ 的积分范围可能依赖于 $x$
3. 对 $x$ 积分求 $f_Y(y)$ 时，注意 $x$ 的积分范围可能依赖于 $y$

### 3.3 示例

**例题**：设 $(X, Y)$ 的联合密度为

$$f(x, y) = \begin{cases} 2, & 0 < x < y < 1 \\ 0, & \text{其他} \end{cases}$$

求边缘概率密度 $f_X(x)$ 和 $f_Y(y)$。

**解**：

$$f_X(x) = \int_{-\infty}^{+\infty} f(x, y) \, dy = \int_x^1 2 \, dy = 2(1 - x), \quad 0 < x < 1$$

$$f_Y(y) = \int_{-\infty}^{+\infty} f(x, y) \, dx = \int_0^y 2 \, dx = 2y, \quad 0 < y < 1$$

### 3.4 二维正态分布的边缘分布

设 $(X, Y) \sim N(\mu_1, \mu_2, \sigma_1^2, \sigma_2^2, \rho)$，则

$$X \sim N(\mu_1, \sigma_1^2), \quad Y \sim N(\mu_2, \sigma_2^2)$$

边缘分布与参数 $\rho$ 无关，说明不同的联合分布（不同的 $\rho$）可以有相同的边缘分布。

## 4. 边缘分布与联合分布的关系

### 4.1 联合分布确定边缘分布

由联合分布可以唯一确定边缘分布，这是显然的。

### 4.2 边缘分布不能确定联合分布

**反例**：设 $(X, Y)$ 的联合密度为

$$f_1(x, y) = \begin{cases} 4xy, & 0 < x < 1, 0 < y < 1 \\ 0, & \text{其他} \end{cases}$$

$$f_2(x, y) = \begin{cases} 8xy, & 0 < x < y < 1 \\ 0, & \text{其他} \end{cases}$$

可以验证两者关于 $X$ 的边缘密度不同，但如果构造更精巧的例子，可以使得两个不同的联合分布具有相同的边缘分布。

### 4.3 独立时的特殊情况

当 $X$ 与 $Y$ 独立时，联合分布由边缘分布唯一确定：

$$f(x, y) = f_X(x) \cdot f_Y(y)$$

$$P(X = x_i, Y = y_j) = P(X = x_i) \cdot P(Y = y_j)$$
