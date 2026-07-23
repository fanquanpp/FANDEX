---
order: 30
title: 联合分布
module: 'probability-statistics'
category: 'comp-sci'
difficulty: intermediate
description: 二维随机变量的概念、联合分布函数、联合分布律与联合概率密度。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'probability-statistics/随机变量函数的分布'
  - 'probability-statistics/随机变量典型例题'
  - 'probability-statistics/边缘分布'
  - 'probability-statistics/条件分布'
prerequisites: []
---

## 1. 二维随机变量

### 1.1 定义

设 $E$ 是一个随机试验，$\Omega$ 为其样本空间，$X = X(\omega)$ 和 $Y = Y(\omega)$ 是定义在 $\Omega$ 上的两个随机变量，则称 $(X, Y)$ 为**二维随机变量**（或**二维随机向量**）。

### 1.2 二维随机变量的分类

- **二维离散型**：$X$ 和 $Y$ 都取有限个或可列个值
- **二维连续型**：存在非负函数 $f(x, y)$ 使得 $F(x, y) = \iint f(u, v) \, du \, dv$
- **混合型**：一个离散一个连续

## 2. 联合分布函数

### 2.1 定义

设 $(X, Y)$ 是二维随机变量，对任意实数 $x, y$，二元函数

$$F(x, y) = P(X \leq x, Y \leq y)$$

称为 $(X, Y)$ 的**联合分布函数**。

### 2.2 几何意义

$F(x, y)$ 表示随机点 $(X, Y)$ 落在以 $(x, y)$ 为右上顶点的无穷矩形区域内的概率。

### 2.3 联合分布函数的性质

1. **单调性**：$F(x, y)$ 关于 $x$ 和 $y$ 分别单调不减

2. **有界性**：$0 \leq F(x, y) \leq 1$

3. **边界值**：

$$F(-\infty, y) = 0, \quad F(x, -\infty) = 0, \quad F(-\infty, -\infty) = 0, \quad F(+\infty, +\infty) = 1$$

4. **右连续**：$F(x, y)$ 关于 $x$ 和 $y$ 分别右连续

5. **非负性**：对任意 $x_1 < x_2, y_1 < y_2$，

$$P(x_1 < X \leq x_2, y_1 < Y \leq y_2) = F(x_2, y_2) - F(x_1, y_2) - F(x_2, y_1) + F(x_1, y_1) \geq 0$$

### 2.4 由联合分布函数计算概率

$$P(x_1 < X \leq x_2, y_1 < Y \leq y_2) = F(x_2, y_2) - F(x_1, y_2) - F(x_2, y_1) + F(x_1, y_1)$$

## 3. 二维离散型随机变量

### 3.1 联合分布律

设 $(X, Y)$ 的所有可能取值为 $(x_i, y_j)$（$i, j = 1, 2, \cdots$），则

$$P(X = x_i, Y = y_j) = p_{ij}, \quad i, j = 1, 2, \cdots$$

称为 $(X, Y)$ 的**联合分布律**。

### 3.2 联合分布律的性质

1. $p_{ij} \geq 0$
2. $\displaystyle\sum_{i=1}^{\infty}\sum_{j=1}^{\infty} p_{ij} = 1$

### 3.3 联合分布律与联合分布函数的关系

$$F(x, y) = \sum_{x_i \leq x} \sum_{y_j \leq y} p_{ij}$$

### 3.4 示例

**例题**：袋中有 2 个红球和 3 个白球，从中不放回地取两次，每次取一个。设 $X$ 为第一次取到的红球数，$Y$ 为第二次取到的红球数，求 $(X, Y)$ 的联合分布律。

**解**：

$$P(X = 0, Y = 0) = \frac{3}{5} \times \frac{2}{4} = \frac{3}{10}$$

$$P(X = 0, Y = 1) = \frac{3}{5} \times \frac{2}{4} = \frac{3}{10}$$

$$P(X = 1, Y = 0) = \frac{2}{5} \times \frac{3}{4} = \frac{3}{10}$$

$$P(X = 1, Y = 1) = \frac{2}{5} \times \frac{1}{4} = \frac{1}{10}$$

| $X \backslash Y$ |        0        |        1        |
| :--------------: | :-------------: | :-------------: |
|        0         | $\dfrac{3}{10}$ | $\dfrac{3}{10}$ |
|        1         | $\dfrac{3}{10}$ | $\dfrac{1}{10}$ |

## 4. 二维连续型随机变量

### 4.1 联合概率密度

设 $(X, Y)$ 的联合分布函数为 $F(x, y)$，若存在非负可积函数 $f(x, y)$，使得

$$F(x, y) = \int_{-\infty}^{y} \int_{-\infty}^{x} f(u, v) \, du \, dv$$

则称 $(X, Y)$ 为**二维连续型随机变量**，$f(x, y)$ 为**联合概率密度函数**。

### 4.2 联合概率密度的性质

1. **非负性**：$f(x, y) \geq 0$

2. **规范性**：$\displaystyle\int_{-\infty}^{+\infty}\int_{-\infty}^{+\infty} f(x, y) \, dx \, dy = 1$

3. **概率计算**：$P((X, Y) \in D) = \iint_D f(x, y) \, dx \, dy$

4. **在连续点处**：$\dfrac{\partial^2 F}{\partial x \partial y} = f(x, y)$

### 4.3 示例

**例题**：设 $(X, Y)$ 的联合密度为

$$f(x, y) = \begin{cases} 6xy^2, & 0 < x < 1, 0 < y < 1 \\ 0, & \text{其他} \end{cases}$$

验证规范性并求 $P(X + Y \leq 1)$。

**解**：

$$\int_0^1 \int_0^1 6xy^2 \, dx \, dy = 6 \int_0^1 x \, dx \cdot \int_0^1 y^2 \, dy = 6 \times \frac{1}{2} \times \frac{1}{3} = 1 \quad \checkmark$$

$$P(X + Y \leq 1) = \int_0^1 \int_0^{1-x} 6xy^2 \, dy \, dx = \int_0^1 6x \cdot \frac{(1-x)^3}{3} \, dx = 2\int_0^1 x(1-x)^3 \, dx$$

$$= 2 \cdot B(2, 4) = 2 \cdot \frac{\Gamma(2)\Gamma(4)}{\Gamma(6)} = 2 \cdot \frac{1! \cdot 3!}{5!} = 2 \cdot \frac{6}{120} = \frac{1}{10}$$

## 5. 常见二维分布

### 5.1 二维均匀分布

设 $D$ 为平面上的有界区域，面积为 $S_D$，若 $(X, Y)$ 的联合密度为

$$f(x, y) = \begin{cases} \dfrac{1}{S_D}, & (x, y) \in D \\ 0, & \text{其他} \end{cases}$$

则称 $(X, Y)$ 在区域 $D$ 上服从**均匀分布**。

### 5.2 二维正态分布

若 $(X, Y)$ 的联合密度为

$$f(x, y) = \frac{1}{2\pi\sigma_1\sigma_2\sqrt{1-\rho^2}} \exp\left\{-\frac{1}{2(1-\rho^2)}\left[\frac{(x-\mu_1)^2}{\sigma_1^2} - \frac{2\rho(x-\mu_1)(y-\mu_2)}{\sigma_1\sigma_2} + \frac{(y-\mu_2)^2}{\sigma_2^2}\right]\right\}$$

则称 $(X, Y)$ 服从参数为 $\mu_1, \mu_2, \sigma_1^2, \sigma_2^2, \rho$ 的**二维正态分布**，记作 $(X, Y) \sim N(\mu_1, \mu_2, \sigma_1^2, \sigma_2^2, \rho)$。

其中 $\rho$ 为 $X$ 与 $Y$ 的相关系数，$|\rho| < 1$。

**重要性质**：

1. $X \sim N(\mu_1, \sigma_1^2)$，$Y \sim N(\mu_2, \sigma_2^2)$
2. $X$ 与 $Y$ 独立 $\iff$ $\rho = 0$
3. $(X, Y)$ 的任意线性组合仍为正态分布
