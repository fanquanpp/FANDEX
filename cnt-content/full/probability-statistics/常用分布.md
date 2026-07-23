---
order: 23
title: 常用分布
module: 'probability-statistics'
category: 'comp-sci'
difficulty: intermediate
description: 六大常用分布详解：二项分布、泊松分布、均匀分布、指数分布、正态分布、几何分布的完整梳理。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'probability-statistics/连续型随机变量'
  - 'probability-statistics/分布函数'
  - 'probability-statistics/随机变量函数的分布'
  - 'probability-statistics/随机变量典型例题'
prerequisites: []
---

## 1. 六大常用分布总览

| 分布     | 记号                  | 分布律/密度函数                                                | 期望                 | 方差                   |
| -------- | --------------------- | -------------------------------------------------------------- | -------------------- | ---------------------- |
| 二项分布 | $B(n, p)$             | $\dbinom{n}{k}p^k(1-p)^{n-k}$                                  | $np$                 | $np(1-p)$              |
| 泊松分布 | $P(\lambda)$          | $\dfrac{\lambda^k e^{-\lambda}}{k!}$                           | $\lambda$            | $\lambda$              |
| 几何分布 | $G(p)$                | $(1-p)^{k-1}p$                                                 | $\dfrac{1}{p}$       | $\dfrac{1-p}{p^2}$     |
| 均匀分布 | $U(a,b)$              | $\dfrac{1}{b-a}$                                               | $\dfrac{a+b}{2}$     | $\dfrac{(b-a)^2}{12}$  |
| 指数分布 | $\text{Exp}(\lambda)$ | $\lambda e^{-\lambda x}$                                       | $\dfrac{1}{\lambda}$ | $\dfrac{1}{\lambda^2}$ |
| 正态分布 | $N(\mu, \sigma^2)$    | $\dfrac{1}{\sqrt{2\pi}\sigma}e^{-\frac{(x-\mu)^2}{2\sigma^2}}$ | $\mu$                | $\sigma^2$             |

## 2. 二项分布 $B(n, p)$

### 2.1 完整定义

$$P(X = k) = \binom{n}{k} p^k (1-p)^{n-k}, \quad k = 0, 1, 2, \cdots, n$$

### 2.2 矩母函数

$$M_X(t) = (pe^t + 1 - p)^n$$

### 2.3 特征函数

$$\varphi_X(t) = (pe^{it} + 1 - p)^n$$

### 2.4 与其他分布的关系

- 当 $n = 1$ 时，退化为 0-1 分布
- 当 $n \to \infty, p \to 0, np = \lambda$ 时，近似为泊松分布
- 当 $n$ 较大时，由中心极限定理，近似为正态分布 $N(np, np(1-p))$

### 2.5 典型应用

产品质量抽检、考试通过率、临床试验成功率等。

## 3. 泊松分布 $P(\lambda)$

### 3.1 完整定义

$$P(X = k) = \frac{\lambda^k e^{-\lambda}}{k!}, \quad k = 0, 1, 2, \cdots$$

### 3.2 矩母函数

$$M_X(t) = e^{\lambda(e^t - 1)}$$

### 3.3 特征函数

$$\varphi_X(t) = e^{\lambda(e^{it} - 1)}$$

### 3.4 与其他分布的关系

- 泊松分布可由二项分布取极限得到
- 泊松过程中时间间隔服从指数分布
- 当 $\lambda$ 较大时，近似为正态分布 $N(\lambda, \lambda)$

### 3.5 泊松过程

设 $\{N(t), t \geq 0\}$ 为计数过程，若满足：

1. $N(0) = 0$
2. 独立增量
3. 对任意 $s, t > 0$，$N(t+s) - N(s) \sim P(\lambda t)$

则称 $\{N(t)\}$ 为参数 $\lambda$ 的泊松过程。

## 4. 几何分布 $G(p)$

### 4.1 完整定义

$$P(X = k) = (1-p)^{k-1} p, \quad k = 1, 2, 3, \cdots$$

### 4.2 期望与方差的推导

$$E(X) = \sum_{k=1}^{\infty} k(1-p)^{k-1}p = p \cdot \frac{1}{p^2} = \frac{1}{p}$$

$$E(X^2) = \frac{2-p}{p^2}, \quad D(X) = E(X^2) - [E(X)]^2 = \frac{1-p}{p^2}$$

### 4.3 无记忆性

$$P(X > m + n \mid X > m) = P(X > n)$$

几何分布是唯一具有无记忆性的取正整数值的离散分布。

### 4.4 变体

有时几何分布定义为首次成功前的失败次数：

$$P(Y = k) = (1-p)^k p, \quad k = 0, 1, 2, \cdots$$

此时 $Y = X - 1$，$E(Y) = \dfrac{1-p}{p}$。

## 5. 均匀分布 $U(a, b)$

### 5.1 完整定义

$$f(x) = \begin{cases} \dfrac{1}{b-a}, & a \leq x \leq b \\ 0, & \text{其他} \end{cases}$$

### 5.2 矩母函数

$$M_X(t) = \frac{e^{tb} - e^{ta}}{t(b-a)}, \quad t \neq 0$$

### 5.3 高阶矩

$$E(X^n) = \frac{b^{n+1} - a^{n+1}}{(n+1)(b-a)}$$

### 5.4 标准均匀分布

$U(0,1)$ 称为标准均匀分布，是随机数生成的基础。

## 6. 指数分布 $\text{Exp}(\lambda)$

### 6.1 完整定义

$$f(x) = \begin{cases} \lambda e^{-\lambda x}, & x > 0 \\ 0, & x \leq 0 \end{cases}$$

### 6.2 矩母函数

$$M_X(t) = \frac{\lambda}{\lambda - t}, \quad t < \lambda$$

### 6.3 高阶矩

$$E(X^n) = \frac{n!}{\lambda^n}$$

### 6.4 无记忆性

$$P(X > s + t \mid X > s) = P(X > t)$$

### 6.5 与其他分布的关系

- 指数分布是伽马分布 $\Gamma(1, \lambda)$ 的特例
- $n$ 个独立同分布 $\text{Exp}(\lambda)$ 之和服从 $\Gamma(n, \lambda)$
- 指数分布与泊松过程密切相关

### 6.6 失效率函数

$$h(x) = \frac{f(x)}{1 - F(x)} = \frac{\lambda e^{-\lambda x}}{e^{-\lambda x}} = \lambda$$

指数分布的失效率为常数，说明"旧的和新的一样"（无老化效应）。

## 7. 正态分布 $N(\mu, \sigma^2)$

### 7.1 完整定义

$$f(x) = \frac{1}{\sqrt{2\pi}\sigma} e^{-\frac{(x-\mu)^2}{2\sigma^2}}, \quad -\infty < x < +\infty$$

### 7.2 矩母函数

$$M_X(t) = e^{\mu t + \frac{\sigma^2 t^2}{2}}$$

### 7.3 特征函数

$$\varphi_X(t) = e^{i\mu t - \frac{\sigma^2 t^2}{2}}$$

### 7.4 中心矩

对于 $X \sim N(\mu, \sigma^2)$：

- 奇数阶中心矩为零：$E[(X - \mu)^{2k-1}] = 0$
- 偶数阶中心矩：$E[(X - \mu)^{2k}] = (2k-1)!! \cdot \sigma^{2k}$

其中 $(2k-1)!! = 1 \cdot 3 \cdot 5 \cdots (2k-1)$。

### 7.5 标准正态分布表

常用值：

| $x$   | $\Phi(x)$ |
| ----- | --------- |
| 0.0   | 0.5000    |
| 1.0   | 0.8413    |
| 1.645 | 0.9500    |
| 1.96  | 0.9750    |
| 2.0   | 0.9772    |
| 2.576 | 0.9950    |
| 3.0   | 0.9987    |

### 7.6 正态分布的重要性

1. **中心极限定理**：大量独立随机因素综合作用的结果近似正态
2. **统计推断**：许多统计方法基于正态假设
3. **误差分析**：测量误差通常服从正态分布
4. **自然现象**：大量自然现象近似正态

## 8. 分布之间的关系图

$$\text{伯努利试验} \xrightarrow{n \text{ 次独立重复}} B(n, p) \xrightarrow{n \to \infty, np \to \lambda} P(\lambda) \xrightarrow{\lambda \to \infty} N(\lambda, \lambda)$$

$$B(n, p) \xrightarrow{n \to \infty} N(np, np(1-p))$$

$$\text{泊松过程} \longrightarrow P(\lambda t) \quad \text{与} \quad \text{Exp}(\lambda)$$

$$\text{Exp}(\lambda) \xrightarrow{n \text{ 个之和}} \Gamma(n, \lambda)$$

$$U(0,1) \xrightarrow{F^{-1}} \text{任意分布}$$
