---
order: 62
title: 三大分布
module: 'probability-statistics'
category: 'comp-sci'
difficulty: advanced
description: χ²分布、t分布、F分布的定义、性质及其在统计推断中的核心地位。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'probability-statistics/随机样本'
  - 'probability-statistics/统计量'
  - 'probability-statistics/正态总体的抽样分布'
  - 'probability-statistics/抽样分布典型例题'
prerequisites:
  - 'probability-statistics/样本空间与事件'
---

## 1. χ² 分布

### 1.1 定义

设 $X_1, X_2, \cdots, X_n$ 独立同分布，$X_i \sim N(0, 1)$，则

$$\chi^2 = X_1^2 + X_2^2 + \cdots + X_n^2$$

服从自由度为 $n$ 的 **$\chi^2$ 分布**，记作 $\chi^2 \sim \chi^2(n)$。

### 1.2 密度函数

$$f(x) = \begin{cases} \dfrac{1}{2^{n/2}\Gamma(n/2)} x^{n/2 - 1} e^{-x/2}, & x > 0 \\ 0, & x \leq 0 \end{cases}$$

$\chi^2(n)$ 分布实际上是 $\Gamma\left(\dfrac{n}{2}, \dfrac{1}{2}\right)$ 分布。

### 1.3 性质

1. **期望与方差**：$E(\chi^2) = n$，$D(\chi^2) = 2n$

2. **可加性**：若 $\chi_1^2 \sim \chi^2(n_1)$，$\chi_2^2 \sim \chi^2(n_2)$，且独立，则

$$\chi_1^2 + \chi_2^2 \sim \chi^2(n_1 + n_2)$$

3. **与正态分布的关系**：$\chi^2(n)$ 是 $n$ 个独立标准正态变量平方和的分布

4. **渐近正态性**：当 $n$ 充分大时，$\chi^2(n)$ 近似 $N(n, 2n)$

5. **与样本方差的关系**：设 $X_1, \cdots, X_n \sim N(\mu, \sigma^2)$，则

$$\frac{(n-1)S^2}{\sigma^2} \sim \chi^2(n-1)$$

且 $\bar{X}$ 与 $S^2$ 独立。

### 1.4 上侧分位数

$\chi^2_\alpha(n)$ 满足 $P(\chi^2(n) > \chi^2_\alpha(n)) = \alpha$。

## 2. t 分布

### 2.1 定义

设 $X \sim N(0, 1)$，$Y \sim \chi^2(n)$，且 $X$ 与 $Y$ 独立，则

$$T = \frac{X}{\sqrt{Y/n}}$$

服从自由度为 $n$ 的 **$t$ 分布**（**学生分布**），记作 $T \sim t(n)$。

### 2.2 密度函数

$$f(x) = \frac{\Gamma\left(\frac{n+1}{2}\right)}{\sqrt{n\pi}\,\Gamma\left(\frac{n}{2}\right)}\left(1 + \frac{x^2}{n}\right)^{-(n+1)/2}, \quad -\infty < x < +\infty$$

### 2.3 性质

1. **对称性**：$t$ 分布关于 $x = 0$ 对称

2. **期望与方差**：
   - 当 $n > 1$ 时，$E(T) = 0$
   - 当 $n > 2$ 时，$D(T) = \dfrac{n}{n-2}$

3. **与标准正态的关系**：当 $n \to \infty$ 时，$t(n) \to N(0, 1)$

   当 $n \geq 30$ 时，$t$ 分布与标准正态分布很接近。

4. **与样本均值的关系**：设 $X_1, \cdots, X_n \sim N(\mu, \sigma^2)$，则

$$T = \frac{\bar{X} - \mu}{S/\sqrt{n}} \sim t(n-1)$$

5. **尾部比正态分布厚**：$t$ 分布的峰度大于 0（尖峰厚尾），自由度越小越明显

### 2.4 上侧分位数

$t_\alpha(n)$ 满足 $P(t(n) > t_\alpha(n)) = \alpha$。

由对称性：$t_{1-\alpha}(n) = -t_\alpha(n)$。

## 3. F 分布

### 3.1 定义

设 $U \sim \chi^2(n_1)$，$V \sim \chi^2(n_2)$，且 $U$ 与 $V$ 独立，则

$$F = \frac{U/n_1}{V/n_2}$$

服从自由度为 $(n_1, n_2)$ 的 **$F$ 分布**，记作 $F \sim F(n_1, n_2)$。

### 3.2 密度函数

$$f(x) = \begin{cases} \dfrac{\Gamma\left(\frac{n_1+n_2}{2}\right)}{\Gamma\left(\frac{n_1}{2}\right)\Gamma\left(\frac{n_2}{2}\right)} \left(\frac{n_1}{n_2}\right)^{n_1/2} x^{n_1/2 - 1} \left(1 + \frac{n_1}{n_2}x\right)^{-(n_1+n_2)/2}, & x > 0 \\ 0, & x \leq 0 \end{cases}$$

### 3.3 性质

1. **期望与方差**：
   - 当 $n_2 > 2$ 时，$E(F) = \dfrac{n_2}{n_2 - 2}$
   - 当 $n_2 > 4$ 时，$D(F) = \dfrac{2n_2^2(n_1 + n_2 - 2)}{n_1(n_2 - 2)^2(n_2 - 4)}$

2. **倒数关系**：若 $F \sim F(n_1, n_2)$，则 $\dfrac{1}{F} \sim F(n_2, n_1)$

3. **与 $t$ 分布的关系**：若 $T \sim t(n)$，则 $T^2 \sim F(1, n)$

4. **与样本方差比的关系**：设 $X_1, \cdots, X_{n_1} \sim N(\mu_1, \sigma_1^2)$，$Y_1, \cdots, Y_{n_2} \sim N(\mu_2, \sigma_2^2)$，两样本独立，则

$$F = \frac{S_1^2/\sigma_1^2}{S_2^2/\sigma_2^2} \sim F(n_1 - 1, n_2 - 1)$$

### 3.4 上侧分位数

$F_\alpha(n_1, n_2)$ 满足 $P(F(n_1, n_2) > F_\alpha(n_1, n_2)) = \alpha$。

由倒数关系：

$$F_{1-\alpha}(n_1, n_2) = \frac{1}{F_\alpha(n_2, n_1)}$$

## 4. 三大分布的关系

### 4.1 生成关系

$$N(0,1) \xrightarrow{\text{平方和}} \chi^2(n) \xrightarrow{\text{比值}} t(n) \text{ 和 } F(n_1, n_2)$$

具体地：

- $n$ 个 $N(0,1)$ 的平方和 $\to \chi^2(n)$
- $\dfrac{N(0,1)}{\sqrt{\chi^2(n)/n}} \to t(n)$
- $\dfrac{\chi^2(n_1)/n_1}{\chi^2(n_2)/n_2} \to F(n_1, n_2)$
- $t^2(n) = F(1, n)$

### 4.2 在统计推断中的角色

| 分布     | 主要用途                              |
| -------- | ------------------------------------- |
| $\chi^2$ | 方差的区间估计与检验、拟合优度检验    |
| $t$      | 均值的区间估计与检验（$\sigma$ 未知） |
| $F$      | 两方差比的检验、方差分析              |
