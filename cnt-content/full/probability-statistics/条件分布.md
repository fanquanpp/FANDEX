---
order: 32
title: 条件分布
module: 'probability-statistics'
category: 'comp-sci'
difficulty: intermediate
description: 条件分布律、条件概率密度的定义与计算、条件分布的应用。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'probability-statistics/联合分布'
  - 'probability-statistics/边缘分布'
  - 'probability-statistics/随机变量的独立性'
  - 'probability-statistics/和的分布与极值分布'
prerequisites:
  - 'probability-statistics/样本空间与事件'
---

## 1. 离散型随机变量的条件分布

### 1.1 条件分布律

设 $(X, Y)$ 是二维离散型随机变量，联合分布律为 $P(X = x_i, Y = y_j) = p_{ij}$，边缘分布律为 $p_{i\cdot}$ 和 $p_{\cdot j}$。

若 $P(Y = y_j) > 0$，则在 $Y = y_j$ 条件下 $X$ 的**条件分布律**为

$$P(X = x_i \mid Y = y_j) = \frac{P(X = x_i, Y = y_j)}{P(Y = y_j)} = \frac{p_{ij}}{p_{\cdot j}}, \quad i = 1, 2, \cdots$$

类似地，若 $P(X = x_i) > 0$，则在 $X = x_i$ 条件下 $Y$ 的**条件分布律**为

$$P(Y = y_j \mid X = x_i) = \frac{p_{ij}}{p_{i\cdot}}, \quad j = 1, 2, \cdots$$

### 1.2 条件分布律的性质

1. **非负性**：$P(X = x_i \mid Y = y_j) \geq 0$
2. **规范性**：$\displaystyle\sum_{i=1}^{\infty} P(X = x_i \mid Y = y_j) = 1$

### 1.3 示例

设 $(X, Y)$ 的联合分布律为：

| $X \backslash Y$ |        0        |        1        |
| :--------------: | :-------------: | :-------------: |
|        0         | $\dfrac{1}{10}$ | $\dfrac{3}{10}$ |
|        1         | $\dfrac{3}{10}$ | $\dfrac{3}{10}$ |

求 $X = 0$ 条件下 $Y$ 的条件分布律。

**解**：$P(X = 0) = \dfrac{1}{10} + \dfrac{3}{10} = \dfrac{2}{5}$

$$P(Y = 0 \mid X = 0) = \frac{P(X = 0, Y = 0)}{P(X = 0)} = \frac{1/10}{2/5} = \frac{1}{4}$$

$$P(Y = 1 \mid X = 0) = \frac{P(X = 0, Y = 1)}{P(X = 0)} = \frac{3/10}{2/5} = \frac{3}{4}$$

## 2. 连续型随机变量的条件分布

### 2.1 条件概率密度

设 $(X, Y)$ 是二维连续型随机变量，联合密度为 $f(x, y)$，边缘密度为 $f_X(x)$ 和 $f_Y(y)$。

若 $f_Y(y) > 0$，则在 $Y = y$ 条件下 $X$ 的**条件概率密度**为

$$f_{X \mid Y}(x \mid y) = \frac{f(x, y)}{f_Y(y)}$$

类似地，若 $f_X(x) > 0$，则在 $X = x$ 条件下 $Y$ 的**条件概率密度**为

$$f_{Y \mid X}(y \mid x) = \frac{f(x, y)}{f_X(x)}$$

### 2.2 条件分布函数

在 $Y = y$ 条件下 $X$ 的**条件分布函数**为

$$F_{X \mid Y}(x \mid y) = \int_{-\infty}^{x} f_{X \mid Y}(u \mid y) \, du = \frac{\int_{-\infty}^{x} f(u, y) \, du}{f_Y(y)}$$

### 2.3 条件概率密度的性质

1. **非负性**：$f_{X \mid Y}(x \mid y) \geq 0$
2. **规范性**：$\displaystyle\int_{-\infty}^{+\infty} f_{X \mid Y}(x \mid y) \, dx = 1$
3. **乘法公式**：$f(x, y) = f_X(x) \cdot f_{Y \mid X}(y \mid x) = f_Y(y) \cdot f_{X \mid Y}(x \mid y)$

### 2.4 示例

**例题**：设 $(X, Y)$ 的联合密度为

$$f(x, y) = \begin{cases} 3x, & 0 < x < 1, 0 < y < x \\ 0, & \text{其他} \end{cases}$$

求条件概率密度 $f_{Y \mid X}(y \mid x)$ 和 $f_{X \mid Y}(x \mid y)$。

**解**：

$$f_X(x) = \int_0^x 3x \, dy = 3x^2, \quad 0 < x < 1$$

$$f_Y(y) = \int_y^1 3x \, dx = \frac{3(1 - y^2)}{2}, \quad 0 < y < 1$$

$$f_{Y \mid X}(y \mid x) = \frac{f(x, y)}{f_X(x)} = \frac{3x}{3x^2} = \frac{1}{x}, \quad 0 < y < x$$

即在 $X = x$ 条件下，$Y \sim U(0, x)$。

$$f_{X \mid Y}(x \mid y) = \frac{f(x, y)}{f_Y(y)} = \frac{3x}{\frac{3(1 - y^2)}{2}} = \frac{2x}{1 - y^2}, \quad y < x < 1$$

## 3. 条件分布与独立性

### 3.1 独立性的等价条件

$X$ 与 $Y$ 独立等价于条件分布等于无条件分布：

- 离散型：$P(X = x_i \mid Y = y_j) = P(X = x_i)$ 对所有 $i, j$ 成立
- 连续型：$f_{X \mid Y}(x \mid y) = f_X(x)$ 对所有 $x, y$ 成立

### 3.2 条件分布的信息量

条件分布 $f_{X \mid Y}(x \mid y)$ 与边缘分布 $f_X(x)$ 的差异反映了 $Y$ 对 $X$ 的影响程度。两者越接近，说明 $Y$ 对 $X$ 的影响越小。

## 4. 条件分布的应用

### 4.1 贝叶斯推断

条件分布是贝叶斯推断的核心：

$$f_{X \mid Y}(x \mid y) = \frac{f_Y(y \mid x) f_X(x)}{f_Y(y)} \propto f_Y(y \mid x) f_X(x)$$

即**后验 $\propto$ 似然 $\times$ 先验**。

### 4.2 条件期望

条件分布可以定义条件期望：

$$E(X \mid Y = y) = \int_{-\infty}^{+\infty} x f_{X \mid Y}(x \mid y) \, dx$$

这是回归分析的理论基础。

### 4.3 全概率公式的密度形式

$$f_X(x) = \int_{-\infty}^{+\infty} f_{X \mid Y}(x \mid y) f_Y(y) \, dy$$

这是全概率公式在连续型情形的推广。
