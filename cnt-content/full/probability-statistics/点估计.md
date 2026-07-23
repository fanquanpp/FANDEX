---
order: 70
title: 点估计
module: 'probability-statistics'
category: 'comp-sci'
difficulty: intermediate
description: 矩估计法、极大似然估计法的原理与计算、点估计的评价标准。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'probability-statistics/正态总体的抽样分布'
  - 'probability-statistics/抽样分布典型例题'
  - 'probability-statistics/估计量的评选标准'
  - 'probability-statistics/区间估计'
prerequisites:
  - 'probability-statistics/样本空间与事件'
---

## 1. 点估计的概念

### 1.1 定义

设总体 $X$ 的分布函数 $F(x; \theta)$ 中含有未知参数 $\theta$（可以是向量），$X_1, X_2, \cdots, X_n$ 为样本，构造统计量 $\hat{\theta} = \hat{\theta}(X_1, X_2, \cdots, X_n)$ 来估计 $\theta$，称 $\hat{\theta}$ 为 $\theta$ 的**点估计量**（或**估计量**）。

将样本观测值代入后得到的值 $\hat{\theta}(x_1, x_2, \cdots, x_n)$ 称为**估计值**。

### 1.2 点估计的基本问题

1. 如何构造估计量？（方法问题）
2. 如何评价估计量的好坏？（准则问题）

## 2. 矩估计法

### 2.1 基本思想

由大数定律，样本矩依概率收敛于总体矩。因此，用样本矩代替总体矩来估计未知参数。

### 2.2 矩估计的步骤

设总体 $X$ 有 $k$ 个未知参数 $\theta_1, \theta_2, \cdots, \theta_k$：

1. 求出总体 $X$ 的前 $k$ 阶原点矩 $\mu_1, \mu_2, \cdots, \mu_k$（用 $\theta_1, \cdots, \theta_k$ 表示）
2. 令样本矩等于总体矩：

$$A_j = \mu_j(\theta_1, \theta_2, \cdots, \theta_k), \quad j = 1, 2, \cdots, k$$

3. 解方程组得到 $\hat{\theta}_1, \hat{\theta}_2, \cdots, \hat{\theta}_k$

### 2.3 矩估计的示例

**例题1**：设 $X \sim U(a, b)$，$a, b$ 未知，求 $a, b$ 的矩估计。

**解**：

$$\mu_1 = E(X) = \frac{a + b}{2}, \quad \mu_2 = E(X^2) = \frac{a^2 + ab + b^2}{3}$$

$$A_1 = \bar{X}, \quad A_2 = \frac{1}{n}\sum_{i=1}^n X_i^2$$

由 $\mu_1 = A_1$ 和 $\mu_2 = A_2$：

$$\frac{a + b}{2} = \bar{X}, \quad \frac{(b-a)^2}{12} = \frac{1}{n}\sum X_i^2 - \bar{X}^2 = \frac{n-1}{n}S^2$$

解得：

$$\hat{a} = \bar{X} - \sqrt{3 \cdot \frac{n-1}{n}S^2}, \quad \hat{b} = \bar{X} + \sqrt{3 \cdot \frac{n-1}{n}S^2}$$

**例题2**：设 $X \sim B(N, p)$，$N$ 已知，$p$ 未知，求 $p$ 的矩估计。

**解**：$E(X) = Np = \bar{X}$，故 $\hat{p} = \dfrac{\bar{X}}{N}$。

## 3. 极大似然估计法

### 3.1 基本思想

选择使样本观测值出现概率最大的参数值作为估计值。

### 3.2 似然函数

设总体 $X$ 的密度函数（或分布律）为 $f(x; \theta)$，$\theta \in \Theta$，则样本 $X_1, \cdots, X_n$ 的**似然函数**为

$$L(\theta) = L(x_1, x_2, \cdots, x_n; \theta) = \prod_{i=1}^n f(x_i; \theta)$$

### 3.3 极大似然估计

若存在 $\hat{\theta} = \hat{\theta}(x_1, \cdots, x_n)$ 使得

$$L(\hat{\theta}) = \max_{\theta \in \Theta} L(\theta)$$

则称 $\hat{\theta}$ 为 $\theta$ 的**极大似然估计**（MLE）。

### 3.4 对数似然函数

由于 $\ln L$ 是 $L$ 的单调递增函数，$\ln L$ 和 $L$ 在同一点取最大值，故通常对**对数似然函数**求极值：

$$\ln L(\theta) = \sum_{i=1}^n \ln f(x_i; \theta)$$

### 3.5 求极大似然估计的步骤

1. 写出似然函数 $L(\theta)$
2. 取对数 $\ln L(\theta)$
3. 对 $\theta$ 求偏导，令其为零（似然方程）
4. 解似然方程得 $\hat{\theta}$

### 3.6 极大似然估计的示例

**例题3**：设 $X \sim N(\mu, \sigma^2)$，$\mu, \sigma^2$ 均未知，求 $\mu$ 和 $\sigma^2$ 的 MLE。

**解**：

$$L(\mu, \sigma^2) = \prod_{i=1}^n \frac{1}{\sqrt{2\pi}\sigma} e^{-\frac{(x_i - \mu)^2}{2\sigma^2}} = (2\pi)^{-n/2} (\sigma^2)^{-n/2} e^{-\frac{1}{2\sigma^2}\sum(x_i - \mu)^2}$$

$$\ln L = -\frac{n}{2}\ln(2\pi) - \frac{n}{2}\ln\sigma^2 - \frac{1}{2\sigma^2}\sum(x_i - \mu)^2$$

$$\frac{\partial \ln L}{\partial \mu} = \frac{1}{\sigma^2}\sum(x_i - \mu) = 0 \implies \hat{\mu} = \bar{x}$$

$$\frac{\partial \ln L}{\partial \sigma^2} = -\frac{n}{2\sigma^2} + \frac{1}{2\sigma^4}\sum(x_i - \mu)^2 = 0 \implies \hat{\sigma}^2 = \frac{1}{n}\sum(x_i - \bar{x})^2$$

注意：$\hat{\sigma}^2 = \dfrac{n-1}{n}S^2$，不是无偏的。

**例题4**：设 $X \sim U(0, \theta)$，$\theta$ 未知，求 $\theta$ 的 MLE。

**解**：

$$L(\theta) = \begin{cases} \dfrac{1}{\theta^n}, & 0 < x_i < \theta, i = 1, \cdots, n \\ 0, & \text{其他} \end{cases}$$

$L(\theta)$ 在 $\theta > x_{(n)}$ 时为 $\dfrac{1}{\theta^n}$，是 $\theta$ 的递减函数，故 $\theta$ 越小 $L$ 越大。

但 $\theta$ 必须 $\geq x_{(n)}$，故 $\hat{\theta} = x_{(n)} = \max(x_1, \cdots, x_n)$。

### 3.7 极大似然估计的性质

1. **不变性**：若 $\hat{\theta}$ 是 $\theta$ 的 MLE，$g$ 是连续函数，则 $g(\hat{\theta})$ 是 $g(\theta)$ 的 MLE

2. **渐近正态性**：在一定正则条件下，$\hat{\theta}$ 渐近服从 $N\left(\theta, \dfrac{1}{nI(\theta)}\right)$，其中 $I(\theta)$ 为 Fisher 信息量

3. **相合性**：在一定条件下，$\hat{\theta}$ 是 $\theta$ 的相合估计
