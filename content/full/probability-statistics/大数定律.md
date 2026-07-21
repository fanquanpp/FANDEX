---
order: 51
title: 大数定律
module: 'probability-statistics'
category: 'comp-sci'
difficulty: intermediate
description: 切比雪夫大数定律、伯努利大数定律、辛钦大数定律及其应用。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'probability-statistics/数字特征典型例题'
  - 'probability-statistics/切比雪夫不等式'
  - 'probability-statistics/中心极限定理'
  - 'probability-statistics/大数定律与中心极限定理典型例题'
prerequisites:
  - 'probability-statistics/样本空间与事件'
---

## 1. 大数定律的直观理解

大数定律表明：大量独立重复试验中，事件发生的**频率**稳定于其**概率**，随机变量的**算术平均**稳定于其**期望**。

这是概率论的理论基础，也是统计推断的依据。

## 2. 切比雪夫大数定律

### 2.1 定理

设 $X_1, X_2, \cdots$ 为相互独立的随机变量序列，若 $E(X_i) = \mu_i$，$D(X_i) = \sigma_i^2$ 都存在，且方差一致有界，即存在 $C > 0$ 使得 $\sigma_i^2 \leq C$（$i = 1, 2, \cdots$），则对任意 $\varepsilon > 0$，

$$\lim_{n \to \infty} P\left(\left|\frac{1}{n}\sum_{i=1}^n X_i - \frac{1}{n}\sum_{i=1}^n \mu_i\right| < \varepsilon\right) = 1$$

### 2.2 证明

设 $\bar{X}_n = \dfrac{1}{n}\sum_{i=1}^n X_i$，则

$$E(\bar{X}_n) = \frac{1}{n}\sum_{i=1}^n \mu_i, \quad D(\bar{X}_n) = \frac{1}{n^2}\sum_{i=1}^n \sigma_i^2 \leq \frac{C}{n}$$

由切比雪夫不等式：

$$P(|\bar{X}_n - E(\bar{X}_n)| \geq \varepsilon) \leq \frac{D(\bar{X}_n)}{\varepsilon^2} \leq \frac{C}{n\varepsilon^2} \to 0 \quad (n \to \infty)$$

### 2.3 特殊情形

若 $X_1, X_2, \cdots$ 独立同分布，$E(X_i) = \mu$，$D(X_i) = \sigma^2$，则

$$\lim_{n \to \infty} P\left(\left|\frac{1}{n}\sum_{i=1}^n X_i - \mu\right| < \varepsilon\right) = 1$$

即 $\bar{X}_n \xrightarrow{P} \mu$。

## 3. 伯努利大数定律

### 3.1 定理

设 $n_A$ 为 $n$ 次独立试验中事件 $A$ 发生的次数，$p$ 为每次试验中 $A$ 发生的概率，则对任意 $\varepsilon > 0$，

$$\lim_{n \to \infty} P\left(\left|\frac{n_A}{n} - p\right| < \varepsilon\right) = 1$$

### 3.2 证明

设 $X_i$ 为第 $i$ 次试验中 $A$ 是否发生的指示变量，则 $n_A = \sum_{i=1}^n X_i$，$X_i \sim B(1, p)$。

由切比雪夫大数定律（独立同分布情形）即得。

### 3.3 意义

伯努利大数定律表明：**频率稳定于概率**。这是用频率估计概率的理论依据。

## 4. 辛钦大数定律

### 4.1 定理

设 $X_1, X_2, \cdots$ 为独立同分布的随机变量序列，若 $E(X_i) = \mu$ 存在，则对任意 $\varepsilon > 0$，

$$\lim_{n \to \infty} P\left(\left|\frac{1}{n}\sum_{i=1}^n X_i - \mu\right| < \varepsilon\right) = 1$$

### 4.2 与切比雪夫大数定律的区别

- 切比雪夫大数定律要求方差存在且一致有界
- 辛钦大数定律只要求期望存在，不要求方差存在
- 辛钦大数定律要求独立同分布

### 4.3 辛钦大数定律的证明思路

利用特征函数的方法：设 $X_i$ 的特征函数为 $\varphi(t)$，则 $\bar{X}_n$ 的特征函数为

$$\varphi_{\bar{X}_n}(t) = \left[\varphi\left(\frac{t}{n}\right)\right]^n$$

由于 $\varphi(t) = 1 + i\mu t + o(t)$（$t \to 0$），故

$$\varphi_{\bar{X}_n}(t) = \left[1 + \frac{i\mu t}{n} + o\left(\frac{1}{n}\right)\right]^n \to e^{i\mu t}$$

而 $e^{i\mu t}$ 是常数 $\mu$ 的特征函数，由特征函数的连续性定理，$\bar{X}_n \xrightarrow{P} \mu$。

## 5. 收敛性的概念

### 5.1 依概率收敛

设 $X_1, X_2, \cdots$ 为随机变量序列，$X$ 为随机变量，若对任意 $\varepsilon > 0$，

$$\lim_{n \to \infty} P(|X_n - X| < \varepsilon) = 1$$

则称 $X_n$ **依概率收敛**于 $X$，记作 $X_n \xrightarrow{P} X$。

### 5.2 几乎必然收敛

若 $P\left(\lim_{n \to \infty} X_n = X\right) = 1$，则称 $X_n$ **几乎必然收敛**于 $X$，记作 $X_n \xrightarrow{a.s.} X$。

### 5.3 收敛的关系

几乎必然收敛 $\Rightarrow$ 依概率收敛，反之不成立。

大数定律中的收敛是**依概率收敛**（弱大数定律）或**几乎必然收敛**（强大数定律）。

## 6. 大数定律的应用

### 6.1 蒙特卡洛方法

设 $E(g(X)) = I$，由辛钦大数定律：

$$\frac{1}{n}\sum_{i=1}^n g(X_i) \xrightarrow{P} I$$

其中 $X_1, X_2, \cdots$ 独立同分布。这就是蒙特卡洛积分的原理。

### 6.2 经验分布函数

设 $F_n(x) = \dfrac{1}{n}\sum_{i=1}^n I(X_i \leq x)$ 为经验分布函数，由伯努利大数定律：

$$F_n(x) \xrightarrow{P} F(x)$$

### 6.3 统计推断的基础

大数定律保证了样本均值是总体均值的一致估计，这是参数估计的理论基础。
