---
order: 53
title: 大数定律与中心极限定理典型例题
module: 'probability-statistics'
category: 'comp-sci'
difficulty: intermediate
description: 大数定律与中心极限定理部分的典型例题精选。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'probability-statistics/大数定律'
  - 'probability-statistics/中心极限定理'
  - 'probability-statistics/随机样本'
  - 'probability-statistics/统计量'
prerequisites:
  - 'probability-statistics/样本空间与事件'
---

## 1. 切比雪夫不等式

### 例题1

设 $E(X) = 1$，$D(X) = 0.04$，利用切比雪夫不等式估计 $P(0.6 < X < 1.4)$。

**解**：

$$P(0.6 < X < 1.4) = P(|X - 1| < 0.4) \geq 1 - \frac{0.04}{0.16} = 1 - 0.25 = 0.75$$

### 例题2

设 $X_1, X_2, \cdots, X_{100}$ 独立同分布，$E(X_i) = 5$，$D(X_i) = 1$，利用切比雪夫不等式估计 $P(4.7 < \bar{X} < 5.3)$。

**解**：$E(\bar{X}) = 5$，$D(\bar{X}) = 0.01$。

$$P(4.7 < \bar{X} < 5.3) = P(|\bar{X} - 5| < 0.3) \geq 1 - \frac{0.01}{0.09} = \frac{8}{9} \approx 0.889$$

### 例题3

设 $X \sim P(5)$，利用切比雪夫不等式估计 $P(X \geq 10)$。

**解**：$E(X) = 5$，$D(X) = 5$。

$$P(X \geq 10) = P(X - 5 \geq 5) \leq P(|X - 5| \geq 5) \leq \frac{5}{25} = 0.2$$

## 2. 大数定律

### 例题4

设 $X_1, X_2, \cdots$ 独立同分布，$E(X_i) = \mu$，$D(X_i) = \sigma^2$，证明 $\dfrac{1}{n}\sum_{i=1}^n X_i^2 \xrightarrow{P} \mu^2 + \sigma^2$。

**证明**：设 $Y_i = X_i^2$，则 $Y_1, Y_2, \cdots$ 独立同分布。

$$E(Y_i) = E(X_i^2) = D(X_i) + [E(X_i)]^2 = \sigma^2 + \mu^2$$

由辛钦大数定律：

$$\frac{1}{n}\sum_{i=1}^n Y_i = \frac{1}{n}\sum_{i=1}^n X_i^2 \xrightarrow{P} \sigma^2 + \mu^2$$

### 例题5

设 $X_1, X_2, \cdots$ 独立同分布，$X_i \sim U(0, 1)$，证明 $\dfrac{1}{n}\sum_{i=1}^n X_i(1 - X_i) \xrightarrow{P} \dfrac{1}{6}$。

**证明**：设 $Y_i = X_i(1 - X_i)$，则

$$E(Y_i) = E(X_i) - E(X_i^2) = \frac{1}{2} - \frac{1}{3} = \frac{1}{6}$$

由辛钦大数定律，$\dfrac{1}{n}\sum_{i=1}^n Y_i \xrightarrow{P} \dfrac{1}{6}$。

### 例题6

某事件 $A$ 在每次试验中发生的概率为 $p$，独立重复试验 $n$ 次，用频率 $\dfrac{n_A}{n}$ 估计 $p$。要使 $P\left(\left|\dfrac{n_A}{n} - p\right| < 0.01\right) \geq 0.95$，$n$ 至少为多少？

**解**：$E\left(\dfrac{n_A}{n}\right) = p$，$D\left(\dfrac{n_A}{n}\right) = \dfrac{p(1-p)}{n}$。

由切比雪夫不等式：

$$P\left(\left|\frac{n_A}{n} - p\right| < 0.01\right) \geq 1 - \frac{p(1-p)}{n \times 0.0001}$$

$p(1-p) \leq \dfrac{1}{4}$（$p = 0.5$ 时取最大值），故

$$1 - \frac{1}{4n \times 0.0001} \geq 0.95 \implies n \geq \frac{1}{4 \times 0.0001 \times 0.05} = 50000$$

## 3. 中心极限定理

### 例题7

某厂生产的产品次品率为 0.03，从中任取 1000 件，求次品数在 20 到 40 之间的概率。

**解**：设 $X$ 为次品数，$X \sim B(1000, 0.03)$。

$E(X) = 30$，$D(X) = 29.1$。

$$P(20 \leq X \leq 40) \approx \Phi\left(\frac{40 - 30}{\sqrt{29.1}}\right) - \Phi\left(\frac{20 - 30}{\sqrt{29.1}}\right)$$

$$= \Phi(1.854) - \Phi(-1.854) = 2\Phi(1.854) - 1 \approx 2 \times 0.9682 - 1 = 0.9364$$

### 例题8

设 $X_1, X_2, \cdots, X_{50}$ 独立同分布，$X_i \sim \text{Exp}(2)$，求 $P\left(\sum_{i=1}^{50} X_i > 30\right)$。

**解**：$E(X_i) = 0.5$，$D(X_i) = 0.25$。

$E\left(\sum X_i\right) = 25$，$D\left(\sum X_i\right) = 12.5$。

$$P\left(\sum_{i=1}^{50} X_i > 30\right) \approx 1 - \Phi\left(\frac{30 - 25}{\sqrt{12.5}}\right) = 1 - \Phi(1.414) \approx 1 - 0.9214 = 0.0786$$

### 例题9

设 $X_1, X_2, \cdots, X_{36}$ 独立同分布，$X_i \sim U(0, 10)$，求 $P(\bar{X} > 5.5)$。

**解**：$E(X_i) = 5$，$D(X_i) = \dfrac{100}{12} = \dfrac{25}{3}$。

$E(\bar{X}) = 5$，$D(\bar{X}) = \dfrac{25}{108}$。

$$P(\bar{X} > 5.5) \approx 1 - \Phi\left(\frac{5.5 - 5}{\sqrt{25/108}}\right) = 1 - \Phi(1.039) \approx 1 - 0.8506 = 0.1494$$

### 例题10

某保险公司有 10000 人投保，每人每年交保费 12 元，每人出险概率为 0.006，出险时赔付 1000 元。求保险公司亏本的概率。

**解**：设 $X$ 为出险人数，$X \sim B(10000, 0.006)$。

保险公司收入 = $10000 \times 12 = 120000$ 元。

赔付 = $1000X$ 元。

亏本条件：$1000X > 120000$，即 $X > 120$。

$E(X) = 60$，$D(X) = 59.64$。

$$P(X > 120) \approx 1 - \Phi\left(\frac{120 - 60}{\sqrt{59.64}}\right) = 1 - \Phi(7.77) \approx 0$$

保险公司几乎不可能亏本。

### 例题11

设 $X_1, X_2, \cdots, X_n$ 独立同分布，$E(X_i) = 0$，$D(X_i) = 1$，求 $n$ 使得 $P\left(\left|\sum_{i=1}^n X_i\right| < 10\right) \geq 0.9$。

**解**：由中心极限定理，$\sum_{i=1}^n X_i$ 近似服从 $N(0, n)$。

$$P\left(\left|\sum_{i=1}^n X_i\right| < 10\right) = P\left(\frac{|\sum X_i|}{\sqrt{n}} < \frac{10}{\sqrt{n}}\right) \approx 2\Phi\left(\frac{10}{\sqrt{n}}\right) - 1 \geq 0.9$$

$$\Phi\left(\frac{10}{\sqrt{n}}\right) \geq 0.95 \implies \frac{10}{\sqrt{n}} \geq 1.645 \implies n \leq 36.9$$

取 $n \leq 36$。

### 例题12

设 $X_i$ 表示第 $i$ 个产品的重量（克），$E(X_i) = 50$，$D(X_i) = 25$。一箱装 100 个产品，求一箱产品重量超过 5025 克的概率。

**解**：$S = \sum_{i=1}^{100} X_i$，$E(S) = 5000$，$D(S) = 2500$。

$$P(S > 5025) \approx 1 - \Phi\left(\frac{5025 - 5000}{50}\right) = 1 - \Phi(0.5) = 1 - 0.6915 = 0.3085$$

### 例题13

证明：若 $X_n \xrightarrow{P} X$，$Y_n \xrightarrow{P} Y$，则 $X_n + Y_n \xrightarrow{P} X + Y$。

**证明**：对任意 $\varepsilon > 0$，

$$P(|(X_n + Y_n) - (X + Y)| \geq \varepsilon) \leq P(|X_n - X| \geq \varepsilon/2) + P(|Y_n - Y| \geq \varepsilon/2) \to 0$$

### 例题14

设 $X_1, X_2, \cdots$ 独立同分布，$E(X_i) = 3$，$D(X_i) = 4$，求 $P(2.8 < \bar{X}_{100} < 3.2)$ 的近似值。

**解**：$E(\bar{X}) = 3$，$D(\bar{X}) = 0.04$，$\sigma_{\bar{X}} = 0.2$。

$$P(2.8 < \bar{X} < 3.2) \approx \Phi(1) - \Phi(-1) = 2\Phi(1) - 1 = 2 \times 0.8413 - 1 = 0.6826$$

### 例题15

设 $X_1, X_2, \cdots$ 独立同分布，$X_i \sim U(-1, 1)$，求 $P\left(\sum_{i=1}^{48} X_i > 4\right)$ 的近似值。

**解**：$E(X_i) = 0$，$D(X_i) = \dfrac{1}{3}$。

$E\left(\sum X_i\right) = 0$，$D\left(\sum X_i\right) = 16$。

$$P\left(\sum_{i=1}^{48} X_i > 4\right) \approx 1 - \Phi\left(\frac{4}{4}\right) = 1 - \Phi(1) = 0.1587$$
