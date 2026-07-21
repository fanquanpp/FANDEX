---
order: 52
title: 中心极限定理
module: 'probability-statistics'
category: 'comp-sci'
difficulty: advanced
description: '列维-林德伯格中心极限定理、棣莫弗-拉普拉斯中心极限定理及其应用。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'probability-statistics/切比雪夫不等式'
  - 'probability-statistics/大数定律'
  - 'probability-statistics/大数定律与中心极限定理典型例题'
  - 'probability-statistics/随机样本'
prerequisites:
  - 'probability-statistics/样本空间与事件'
---

## 1. 中心极限定理的直观理解

中心极限定理表明：大量独立同分布的随机变量之和（或均值）的分布近似服从正态分布，无论单个随机变量服从什么分布。

这是正态分布在概率论中具有特殊地位的根本原因。

## 2. 列维-林德伯格中心极限定理

### 2.1 定理

设 $X_1, X_2, \cdots$ 为独立同分布的随机变量序列，$E(X_i) = \mu$，$D(X_i) = \sigma^2 > 0$，则对任意实数 $x$，

$$\lim_{n \to \infty} P\left(\frac{\sum_{i=1}^n X_i - n\mu}{\sigma\sqrt{n}} \leq x\right) = \Phi(x) = \frac{1}{\sqrt{2\pi}} \int_{-\infty}^{x} e^{-t^2/2} \, dt$$

即 $\dfrac{\sum_{i=1}^n X_i - n\mu}{\sigma\sqrt{n}} \xrightarrow{d} N(0, 1)$。

### 2.2 等价表述

$$\frac{\bar{X}_n - \mu}{\sigma/\sqrt{n}} \xrightarrow{d} N(0, 1)$$

即当 $n$ 充分大时，

$$\bar{X}_n \overset{\text{近似}}{\sim} N\left(\mu, \frac{\sigma^2}{n}\right)$$

$$\sum_{i=1}^n X_i \overset{\text{近似}}{\sim} N(n\mu, n\sigma^2)$$

### 2.3 证明思路

利用特征函数：

设 $X_i$ 的特征函数为 $\varphi(t)$，则标准化变量 $Y_i = \dfrac{X_i - \mu}{\sigma}$ 的特征函数为

$$\varphi_Y(t) = e^{-i\mu t/\sigma} \varphi(t/\sigma)$$

$S_n = \dfrac{\sum_{i=1}^n X_i - n\mu}{\sigma\sqrt{n}}$ 的特征函数为

$$\varphi_{S_n}(t) = \left[\varphi_Y\left(\frac{t}{\sqrt{n}}\right)\right]^n$$

由 $\varphi_Y(t) = 1 - \dfrac{t^2}{2} + o(t^2)$，得

$$\varphi_{S_n}(t) = \left[1 - \frac{t^2}{2n} + o\left(\frac{1}{n}\right)\right]^n \to e^{-t^2/2}$$

而 $e^{-t^2/2}$ 正是 $N(0,1)$ 的特征函数。

## 3. 棣莫弗-拉普拉斯中心极限定理

### 3.1 定理

设 $X \sim B(n, p)$，则对任意实数 $x$，

$$\lim_{n \to \infty} P\left(\frac{X - np}{\sqrt{np(1-p)}} \leq x\right) = \Phi(x)$$

### 3.2 与列维-林德伯格定理的关系

设 $X = \sum_{i=1}^n X_i$，$X_i \sim B(1, p)$ 独立同分布，$E(X_i) = p$，$D(X_i) = p(1-p)$，由列维-林德伯格定理即得。

### 3.3 应用条件

当 $n$ 较大时（一般 $np > 5$ 且 $n(1-p) > 5$），可用正态近似。

### 3.4 连续性修正

由于二项分布是离散的，正态分布是连续的，近似时需要**连续性修正**：

$$P(X = k) \approx \Phi\left(\frac{k + 0.5 - np}{\sqrt{np(1-p)}}\right) - \Phi\left(\frac{k - 0.5 - np}{\sqrt{np(1-p)}}\right)$$

$$P(X \leq k) \approx \Phi\left(\frac{k + 0.5 - np}{\sqrt{np(1-p)}}\right)$$

$$P(X \geq k) \approx 1 - \Phi\left(\frac{k - 0.5 - np}{\sqrt{np(1-p)}}\right)$$

## 4. 中心极限定理的应用

### 4.1 近似计算概率

**例题**：某车间有 200 台独立工作的机床，每台机床开工的概率为 0.6，开工时耗电 1 千瓦。问供电所至少要供应多少千瓦的电力，才能以 99.9% 的概率保证不会因供电不足而影响生产？

**解**：设 $X$ 为同时开工的机床数，$X \sim B(200, 0.6)$。

$E(X) = 120$，$D(X) = 48$。

设供电 $k$ 千瓦，要求 $P(X \leq k) \geq 0.999$。

由中心极限定理：

$$P(X \leq k) \approx \Phi\left(\frac{k - 120}{\sqrt{48}}\right) \geq 0.999$$

$$\frac{k - 120}{\sqrt{48}} \geq 3.09$$

$$k \geq 120 + 3.09\sqrt{48} \approx 120 + 21.4 = 141.4$$

取 $k = 142$ 千瓦。

### 4.2 样本均值的分布

**例题**：设总体 $X$ 的均值 $\mu = 50$，方差 $\sigma^2 = 25$，从中抽取容量为 100 的样本，求 $P(49 < \bar{X} < 51)$。

**解**：由中心极限定理，$\bar{X}$ 近似服从 $N(50, 0.25)$。

$$P(49 < \bar{X} < 51) = \Phi\left(\frac{51 - 50}{0.5}\right) - \Phi\left(\frac{49 - 50}{0.5}\right) = \Phi(2) - \Phi(-2) = 2\Phi(2) - 1 = 0.9544$$

### 4.3 误差估计

**例题**：测量某物理量，每次测量的误差服从 $(-1, 1)$ 上的均匀分布。求 100 次测量的算术平均值与真值之差的绝对值小于 0.1 的概率。

**解**：设 $X_i$ 为第 $i$ 次测量的误差，$X_i \sim U(-1, 1)$。

$E(X_i) = 0$，$D(X_i) = \dfrac{1}{3}$。

$$P\left(|\bar{X}| < 0.1\right) = P\left(\frac{|\bar{X}|}{\sqrt{1/300}} < \frac{0.1}{\sqrt{1/300}}\right) \approx 2\Phi(\sqrt{3}) - 1 = 2\Phi(1.732) - 1 \approx 2 \times 0.9582 - 1 = 0.9164$$

## 5. 中心极限定理的推广

### 5.1 李雅普诺夫中心极限定理

设 $X_1, X_2, \cdots$ 为相互独立的随机变量序列，若存在 $\delta > 0$，使得

$$\lim_{n \to \infty} \frac{1}{B_n^{2+\delta}} \sum_{i=1}^n E|X_i - \mu_i|^{2+\delta} = 0$$

其中 $B_n^2 = \sum_{i=1}^n \sigma_i^2$，则

$$\frac{\sum_{i=1}^n X_i - \sum_{i=1}^n \mu_i}{B_n} \xrightarrow{d} N(0, 1)$$

### 5.2 不同分布的中心极限定理

中心极限定理不要求同分布，只要独立且满足某些条件（如李雅普诺夫条件或林德伯格条件），和的分布仍然近似正态。
