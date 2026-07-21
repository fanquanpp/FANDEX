---
order: 35
title: 多维随机变量典型例题
module: 'probability-statistics'
category: 'comp-sci'
difficulty: intermediate
description: 多维随机变量部分的典型例题精选，涵盖联合分布、边缘分布、条件分布、独立性、和的分布与极值分布。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'probability-statistics/随机变量的独立性'
  - 'probability-statistics/和的分布与极值分布'
  - 'probability-statistics/数学期望'
  - 'probability-statistics/方差与标准差'
prerequisites:
  - 'probability-statistics/样本空间与事件'
---

## 1. 联合分布与边缘分布

### 例题1

设 $(X, Y)$ 的联合密度为

$$f(x, y) = \begin{cases} e^{-y}, & 0 < x < y < +\infty \\ 0, & \text{其他} \end{cases}$$

求边缘密度 $f_X(x)$ 和 $f_Y(y)$。

**解**：

$$f_X(x) = \int_x^{+\infty} e^{-y} \, dy = e^{-x}, \quad x > 0$$

$$f_Y(y) = \int_0^y e^{-y} \, dx = ye^{-y}, \quad y > 0$$

### 例题2

设 $(X, Y)$ 的联合密度为

$$f(x, y) = \begin{cases} 8xy, & 0 < x < y < 1 \\ 0, & \text{其他} \end{cases}$$

求 $P(X + Y > 1)$。

**解**：

$$P(X + Y > 1) = \int_{1/2}^1 \int_{1-x}^1 8xy \, dy \, dx + \int_0^{1/2} \int_{1-x}^1 8xy \, dy \, dx$$

实际上，$X + Y > 1$ 在三角形 $0 < x < y < 1$ 中的区域为：

$$P(X + Y > 1) = \int_{1/2}^1 \int_{1-y}^y 8xy \, dx \, dy = \int_{1/2}^1 8y \cdot \frac{y^2 - (1-y)^2}{2} \, dy$$

$$= \int_{1/2}^1 4y(2y - 1) \, dy = \int_{1/2}^1 (8y^2 - 4y) \, dy = \left[\frac{8y^3}{3} - 2y^2\right]_{1/2}^1 = \frac{8}{3} - 2 - \frac{1}{3} + \frac{1}{2} = \frac{5}{6}$$

## 2. 条件分布

### 例题3

设 $(X, Y)$ 的联合密度为

$$f(x, y) = \begin{cases} 1, & 0 < x < 1, 0 < y < 1 \\ 0, & \text{其他} \end{cases}$$

求条件密度 $f_{X \mid Y}(x \mid y)$ 和 $E(X \mid Y = y)$。

**解**：$f_Y(y) = 1$（$0 < y < 1$），故

$$f_{X \mid Y}(x \mid y) = \frac{f(x, y)}{f_Y(y)} = 1, \quad 0 < x < 1$$

即在 $Y = y$ 条件下，$X \sim U(0, 1)$，$E(X \mid Y = y) = \dfrac{1}{2}$。

### 例题4

设 $(X, Y)$ 的联合密度为

$$f(x, y) = \begin{cases} 2e^{-2y}, & 0 < x < 1, y > 0 \\ 0, & \text{其他} \end{cases}$$

求 $P(X > 0.5 \mid Y = 1)$。

**解**：

$$f_Y(y) = \int_0^1 2e^{-2y} \, dx = 2e^{-2y}, \quad y > 0$$

$$f_{X \mid Y}(x \mid y) = \frac{f(x, y)}{f_Y(y)} = 1, \quad 0 < x < 1$$

$$P(X > 0.5 \mid Y = 1) = \int_{0.5}^1 1 \, dx = 0.5$$

## 3. 独立性判定

### 例题5

设 $(X, Y)$ 的联合密度为

$$f(x, y) = \begin{cases} \dfrac{3}{2}x, & 0 < x < 1, -x < y < x \\ 0, & \text{其他} \end{cases}$$

判断 $X$ 与 $Y$ 是否独立。

**解**：非零区域 $\{(x, y) : 0 < x < 1, -x < y < x\}$ 不是矩形，故 $X$ 与 $Y$ 不独立。

验证：

$$f_X(x) = \int_{-x}^x \frac{3}{2}x \, dy = 3x^2, \quad 0 < x < 1$$

$$f_Y(y) = \int_{|y|}^1 \frac{3}{2}x \, dx = \frac{3}{4}(1 - y^2), \quad -1 < y < 1$$

$$f_X(x) f_Y(y) = 3x^2 \cdot \frac{3}{4}(1 - y^2) = \frac{9x^2(1 - y^2)}{4} \neq \frac{3}{2}x$$

### 例题6

设 $(X, Y)$ 的联合分布律为：

| $X \backslash Y$ |       -1       |       0        |       1        |
| :--------------: | :------------: | :------------: | :------------: |
|        -1        | $\dfrac{1}{8}$ | $\dfrac{1}{8}$ | $\dfrac{1}{8}$ |
|        0         | $\dfrac{1}{8}$ |      $0$       | $\dfrac{1}{8}$ |
|        1         | $\dfrac{1}{8}$ | $\dfrac{1}{8}$ | $\dfrac{1}{8}$ |

判断 $X$ 与 $Y$ 是否独立。

**解**：$P(X = 0) = \dfrac{1}{4}$，$P(Y = 0) = \dfrac{1}{4}$，但 $P(X = 0, Y = 0) = 0 \neq \dfrac{1}{16}$，故不独立。

## 4. 和的分布

### 例题7

设 $X \sim U(0, 1)$，$Y \sim U(0, 1)$，且 $X$ 与 $Y$ 独立，求 $Z = X + Y$ 的密度。

**解**：

$$f_Z(z) = \int_{-\infty}^{+\infty} f_X(x) f_Y(z - x) \, dx$$

当 $0 < z < 1$ 时：$f_Z(z) = \displaystyle\int_0^z 1 \cdot 1 \, dx = z$

当 $1 \leq z < 2$ 时：$f_Z(z) = \displaystyle\int_{z-1}^1 1 \cdot 1 \, dx = 2 - z$

$$f_Z(z) = \begin{cases} z, & 0 < z < 1 \\ 2 - z, & 1 \leq z < 2 \\ 0, & \text{其他} \end{cases}$$

### 例题8

设 $X \sim P(\lambda_1)$，$Y \sim P(\lambda_2)$，且 $X$ 与 $Y$ 独立，证明 $Z = X + Y \sim P(\lambda_1 + \lambda_2)$。

**证明**：

$$P(Z = k) = \sum_{i=0}^{k} P(X = i) P(Y = k - i) = \sum_{i=0}^{k} \frac{\lambda_1^i e^{-\lambda_1}}{i!} \cdot \frac{\lambda_2^{k-i} e^{-\lambda_2}}{(k-i)!}$$

$$= \frac{e^{-(\lambda_1 + \lambda_2)}}{k!} \sum_{i=0}^{k} \frac{k!}{i!(k-i)!} \lambda_1^i \lambda_2^{k-i} = \frac{(\lambda_1 + \lambda_2)^k e^{-(\lambda_1 + \lambda_2)}}{k!}$$

故 $Z \sim P(\lambda_1 + \lambda_2)$。

## 5. 极值分布

### 例题9

设系统由 5 个独立工作的元件并联而成，每个元件的寿命 $T_i \sim \text{Exp}(0.1)$（单位：小时），求系统寿命超过 20 小时的概率。

**解**：并联系统寿命 $T = \max(T_1, T_2, \cdots, T_5)$。

$$P(T > 20) = 1 - P(T \leq 20) = 1 - [P(T_1 \leq 20)]^5 = 1 - (1 - e^{-2})^5$$

$$= 1 - (1 - 0.1353)^5 = 1 - 0.8647^5 \approx 1 - 0.4833 = 0.5167$$

### 例题10

设 $X_1, X_2, \cdots, X_n$ 独立同分布，$X_i \sim U(0, 1)$，求 $M = \max(X_1, \cdots, X_n)$ 和 $N = \min(X_1, \cdots, X_n)$ 的密度函数。

**解**：

$$F_M(x) = x^n, \quad f_M(x) = nx^{n-1}, \quad 0 < x < 1$$

$$F_N(x) = 1 - (1-x)^n, \quad f_N(x) = n(1-x)^{n-1}, \quad 0 < x < 1$$

## 6. 综合题

### 例题11

设 $(X, Y)$ 的联合密度为

$$f(x, y) = \begin{cases} 2, & 0 < y < x < 1 \\ 0, & \text{其他} \end{cases}$$

求 $Z = X - Y$ 的密度函数。

**解**：$Z$ 的取值范围为 $(0, 1)$。

$$F_Z(z) = P(X - Y \leq z) = \iint_{x - y \leq z} f(x, y) \, dx \, dy$$

当 $0 < z < 1$ 时：

$$P(X - Y > z) = \int_z^1 \int_0^{x-z} 2 \, dy \, dx = \int_z^1 2(x-z) \, dx = (1-z)^2$$

$$F_Z(z) = 1 - (1-z)^2$$

$$f_Z(z) = 2(1-z), \quad 0 < z < 1$$

### 例题12

设 $X$ 与 $Y$ 独立，$X \sim \text{Exp}(1)$，$Y \sim \text{Exp}(1)$，求 $Z = \dfrac{X}{X + Y}$ 的分布。

**解**：令 $U = X + Y$，$V = \dfrac{X}{X + Y}$，则 $X = UV$，$Y = U(1-V)$。

Jacobian 行列式为 $|J| = u$。

联合密度：

$$f_{U,V}(u, v) = f_X(uv) f_Y(u(1-v)) \cdot u = e^{-uv} \cdot e^{-u(1-v)} \cdot u = ue^{-u}, \quad u > 0, 0 < v < 1$$

$$f_V(v) = \int_0^{+\infty} ue^{-u} \, du = 1, \quad 0 < v < 1$$

故 $Z \sim U(0, 1)$。

### 例题13

设 $(X, Y)$ 服从区域 $D = \{(x, y) : x^2 + y^2 \leq 1\}$ 上的均匀分布，判断 $X$ 与 $Y$ 是否独立。

**解**：

$$f(x, y) = \begin{cases} \dfrac{1}{\pi}, & x^2 + y^2 \leq 1 \\ 0, & \text{其他} \end{cases}$$

$$f_X(x) = \int_{-\sqrt{1-x^2}}^{\sqrt{1-x^2}} \frac{1}{\pi} \, dy = \frac{2\sqrt{1-x^2}}{\pi}, \quad -1 < x < 1$$

同理 $f_Y(y) = \dfrac{2\sqrt{1-y^2}}{\pi}$。

$$f_X(x) f_Y(y) = \frac{4\sqrt{(1-x^2)(1-y^2)}}{\pi^2} \neq \frac{1}{\pi}$$

故 $X$ 与 $Y$ 不独立。

### 例题14

设 $X_1, X_2, \cdots, X_n$ 独立同分布，$X_i \sim N(0, 1)$，求 $Y = \sum_{i=1}^n X_i^2$ 的分布。

**解**：每个 $X_i^2 \sim \chi^2(1)$，由 $\chi^2$ 分布的可加性：

$$Y = \sum_{i=1}^n X_i^2 \sim \chi^2(n)$$

### 例题15

设 $X \sim N(0, 1)$，$Y \sim N(0, 1)$，且 $X$ 与 $Y$ 独立，求 $Z = \dfrac{X}{\sqrt{Y^2}}$ 的分布。

**解**：$Y^2 \sim \chi^2(1)$，故 $Z = \dfrac{X}{\sqrt{Y^2/1}} = \dfrac{X}{|Y|}$。

由 $t$ 分布的定义，$\dfrac{X}{\sqrt{Y^2/1}} \sim t(1)$，即 $Z \sim t(1)$（柯西分布）。
