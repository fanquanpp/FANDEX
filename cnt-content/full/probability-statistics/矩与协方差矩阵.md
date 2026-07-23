---
order: 44
title: 矩与协方差矩阵
module: 'probability-statistics'
category: 'comp-sci'
difficulty: advanced
description: 原点矩、中心矩、协方差矩阵的定义与性质、多元正态分布。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'probability-statistics/协方差'
  - 'probability-statistics/相关系数'
  - 'probability-statistics/数字特征典型例题'
  - 'probability-statistics/切比雪夫不等式'
prerequisites:
  - 'probability-statistics/样本空间与事件'
---

## 1. 矩的概念

### 1.1 原点矩

设 $X$ 为随机变量，$k$ 为正整数，若 $E(X^k)$ 存在，则称

$$\mu_k = E(X^k)$$

为 $X$ 的 **$k$ 阶原点矩**。

特别地，一阶原点矩 $\mu_1 = E(X)$ 即为数学期望。

### 1.2 中心矩

设 $X$ 为随机变量，$k$ 为正整数，若 $E[X - E(X)]^k$ 存在，则称

$$\nu_k = E[X - E(X)]^k$$

为 $X$ 的 **$k$ 阶中心矩**。

特别地：

- 一阶中心矩 $\nu_1 = 0$
- 二阶中心矩 $\nu_2 = D(X)$（方差）

### 1.3 原点矩与中心矩的关系

由二项展开：

$$\nu_k = E[X - E(X)]^k = \sum_{j=0}^{k} \binom{k}{j} (-1)^{k-j} \mu_j \mu_1^{k-j}$$

常用关系：

$$\nu_2 = \mu_2 - \mu_1^2 = E(X^2) - [E(X)]^2 = D(X)$$

$$\nu_3 = \mu_3 - 3\mu_2\mu_1 + 2\mu_1^3$$

$$\nu_4 = \mu_4 - 4\mu_3\mu_1 + 6\mu_2\mu_1^2 - 3\mu_1^4$$

### 1.4 混合矩

设 $X, Y$ 为随机变量，$k, l$ 为非负整数，若 $E(X^k Y^l)$ 存在，则称

$$\mu_{k,l} = E(X^k Y^l)$$

为 $X$ 与 $Y$ 的 **$k + l$ 阶混合原点矩**。

类似地，**混合中心矩**为

$$\nu_{k,l} = E[X - E(X)]^k [Y - E(Y)]^l$$

特别地，$\nu_{1,1} = \text{Cov}(X, Y)$。

## 2. 偏度与峰度

### 2.1 偏度

$$\gamma_1 = \frac{\nu_3}{\nu_2^{3/2}} = \frac{E[X - E(X)]^3}{[D(X)]^{3/2}}$$

偏度衡量分布的**不对称性**：

- $\gamma_1 > 0$：右偏（正偏），分布右侧尾部较长
- $\gamma_1 < 0$：左偏（负偏），分布左侧尾部较长
- $\gamma_1 = 0$：对称分布

正态分布的偏度为 0。

### 2.2 峰度

$$\gamma_2 = \frac{\nu_4}{\nu_2^2} - 3 = \frac{E[X - E(X)]^4}{[D(X)]^2} - 3$$

峰度衡量分布的**尖峰程度**（相对于正态分布）：

- $\gamma_2 > 0$：尖峰分布（比正态分布更尖）
- $\gamma_2 < 0$：平坦分布（比正态分布更平）
- $\gamma_2 = 0$：与正态分布相同

正态分布的峰度为 0（因为 $\dfrac{\nu_4}{\nu_2^2} = 3$）。

## 3. 协方差矩阵

### 3.1 定义

设 $n$ 维随机变量 $\mathbf{X} = (X_1, X_2, \cdots, X_n)^T$，令

$$c_{ij} = \text{Cov}(X_i, X_j) = E[X_i - E(X_i)][X_j - E(X_j)], \quad i, j = 1, 2, \cdots, n$$

则矩阵

$$\mathbf{C} = (c_{ij})_{n \times n} = \begin{pmatrix} c_{11} & c_{12} & \cdots & c_{1n} \\ c_{21} & c_{22} & \cdots & c_{2n} \\ \vdots & \vdots & \ddots & \vdots \\ c_{n1} & c_{n2} & \cdots & c_{nn} \end{pmatrix}$$

称为 $\mathbf{X}$ 的**协方差矩阵**。

### 3.2 协方差矩阵的表示

$$\mathbf{C} = E[(\mathbf{X} - \boldsymbol{\mu})(\mathbf{X} - \boldsymbol{\mu})^T]$$

其中 $\boldsymbol{\mu} = E(\mathbf{X}) = (E(X_1), E(X_2), \cdots, E(X_n))^T$。

### 3.3 协方差矩阵的性质

1. **对称性**：$\mathbf{C}^T = \mathbf{C}$（因为 $c_{ij} = c_{ji}$）

2. **半正定性**：对任意 $n$ 维向量 $\mathbf{a}$，

$$\mathbf{a}^T \mathbf{C} \mathbf{a} \geq 0$$

**证明**：

$$\mathbf{a}^T \mathbf{C} \mathbf{a} = \mathbf{a}^T E[(\mathbf{X} - \boldsymbol{\mu})(\mathbf{X} - \boldsymbol{\mu})^T] \mathbf{a} = E[\mathbf{a}^T(\mathbf{X} - \boldsymbol{\mu})(\mathbf{X} - \boldsymbol{\mu})^T \mathbf{a}] = E[(\mathbf{a}^T(\mathbf{X} - \boldsymbol{\mu}))^2] \geq 0$$

3. **对角线元素**：$c_{ii} = D(X_i)$

4. **线性变换**：若 $\mathbf{Y} = \mathbf{A}\mathbf{X} + \mathbf{b}$，则

$$\mathbf{C}_Y = \mathbf{A}\mathbf{C}_X \mathbf{A}^T$$

## 4. 相关矩阵

### 4.1 定义

$$\mathbf{R} = (\rho_{ij})_{n \times n}$$

其中 $\rho_{ij} = \dfrac{c_{ij}}{\sqrt{c_{ii} c_{jj}}}$ 为 $X_i$ 与 $X_j$ 的相关系数。

### 4.2 与协方差矩阵的关系

$$\mathbf{R} = \mathbf{D}^{-1/2} \mathbf{C} \mathbf{D}^{-1/2}$$

其中 $\mathbf{D} = \text{diag}(c_{11}, c_{22}, \cdots, c_{nn})$。

## 5. 多元正态分布

### 5.1 定义

设 $\mathbf{X} = (X_1, X_2, \cdots, X_n)^T$ 服从 $n$ 维正态分布，$\mathbf{X} \sim N_n(\boldsymbol{\mu}, \boldsymbol{\Sigma})$，其密度函数为

$$f(\mathbf{x}) = \frac{1}{(2\pi)^{n/2} |\boldsymbol{\Sigma}|^{1/2}} \exp\left\{-\frac{1}{2}(\mathbf{x} - \boldsymbol{\mu})^T \boldsymbol{\Sigma}^{-1} (\mathbf{x} - \boldsymbol{\mu})\right\}$$

其中 $\boldsymbol{\mu}$ 为均值向量，$\boldsymbol{\Sigma}$ 为协方差矩阵（正定）。

### 5.2 多元正态分布的性质

1. **边缘分布**：$\mathbf{X}$ 的任意子向量的边缘分布仍为正态分布

2. **线性变换**：若 $\mathbf{Y} = \mathbf{A}\mathbf{X} + \mathbf{b}$，则 $\mathbf{Y} \sim N(\mathbf{A}\boldsymbol{\mu} + \mathbf{b}, \mathbf{A}\boldsymbol{\Sigma}\mathbf{A}^T)$

3. **独立与不相关等价**：$X_i$ 与 $X_j$ 独立 $\iff$ $\text{Cov}(X_i, X_j) = 0$

4. **条件分布**：给定部分分量的条件下，其余分量的条件分布仍为正态分布

### 5.3 二元正态分布

$$\boldsymbol{\mu} = \begin{pmatrix} \mu_1 \\ \mu_2 \end{pmatrix}, \quad \boldsymbol{\Sigma} = \begin{pmatrix} \sigma_1^2 & \rho\sigma_1\sigma_2 \\ \rho\sigma_1\sigma_2 & \sigma_2^2 \end{pmatrix}$$

$$|\boldsymbol{\Sigma}| = \sigma_1^2\sigma_2^2(1 - \rho^2)$$
