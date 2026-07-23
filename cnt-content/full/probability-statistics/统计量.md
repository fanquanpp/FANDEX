---
order: 61
title: 统计量
module: 'probability-statistics'
category: 'comp-sci'
difficulty: intermediate
description: 统计量的定义、样本均值、样本方差、样本矩及常用统计量。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'probability-statistics/大数定律与中心极限定理典型例题'
  - 'probability-statistics/随机样本'
  - 'probability-statistics/三大分布'
  - 'probability-statistics/正态总体的抽样分布'
prerequisites:
  - 'probability-statistics/样本空间与事件'
---

## 1. 统计量的定义

### 1.1 定义

设 $X_1, X_2, \cdots, X_n$ 为来自总体 $X$ 的样本，$g(X_1, X_2, \cdots, X_n)$ 是一个 $n$ 元函数，若 $g$ 中不包含任何未知参数，则称 $g(X_1, X_2, \cdots, X_n)$ 为一个**统计量**。

### 1.2 统计量的特点

1. 统计量是样本的函数，不含未知参数
2. 统计量是随机变量
3. 统计量的分布称为**抽样分布**

### 1.3 为什么要求不含未知参数

统计量是用于推断未知参数的，如果统计量本身含有未知参数，就无法从样本数据中计算出统计量的值，也就无法进行推断。

## 2. 样本均值

### 2.1 定义

$$\bar{X} = \frac{1}{n}\sum_{i=1}^n X_i$$

称为**样本均值**。

### 2.2 样本均值的性质

设 $E(X) = \mu$，$D(X) = \sigma^2$，则：

1. $E(\bar{X}) = \mu$（无偏性）

2. $D(\bar{X}) = \dfrac{\sigma^2}{n}$

3. 由中心极限定理，当 $n$ 较大时，$\bar{X}$ 近似服从 $N\left(\mu, \dfrac{\sigma^2}{n}\right)$

4. 若总体 $X \sim N(\mu, \sigma^2)$，则 $\bar{X} \sim N\left(\mu, \dfrac{\sigma^2}{n}\right)$（精确分布）

### 2.3 样本均值的计算

**未分组数据**：$\bar{x} = \dfrac{1}{n}\sum_{i=1}^n x_i$

**分组数据**：$\bar{x} = \dfrac{\sum_{j=1}^k f_j x_j}{\sum_{j=1}^k f_j}$

其中 $f_j$ 为第 $j$ 组的频数，$x_j$ 为第 $j$ 组的组中值。

## 3. 样本方差

### 3.1 定义

$$S^2 = \frac{1}{n-1}\sum_{i=1}^n (X_i - \bar{X})^2$$

称为**样本方差**（无偏版本）。

$$S = \sqrt{S^2} = \sqrt{\frac{1}{n-1}\sum_{i=1}^n (X_i - \bar{X})^2}$$

称为**样本标准差**。

### 3.2 为什么除以 $n-1$ 而不是 $n$

$$E(S^2) = E\left[\frac{1}{n-1}\sum_{i=1}^n (X_i - \bar{X})^2\right] = \sigma^2$$

除以 $n-1$ 使得 $S^2$ 是 $\sigma^2$ 的**无偏估计**。

若除以 $n$，则 $E\left[\dfrac{1}{n}\sum_{i=1}^n (X_i - \bar{X})^2\right] = \dfrac{n-1}{n}\sigma^2 < \sigma^2$，是有偏的。

### 3.3 样本方差的计算公式

$$S^2 = \frac{1}{n-1}\left(\sum_{i=1}^n X_i^2 - n\bar{X}^2\right) = \frac{n\sum X_i^2 - (\sum X_i)^2}{n(n-1)}$$

### 3.4 样本方差的性质

设 $E(X) = \mu$，$D(X) = \sigma^2$，则：

1. $E(S^2) = \sigma^2$（无偏性）

2. 当总体 $X \sim N(\mu, \sigma^2)$ 时，$\dfrac{(n-1)S^2}{\sigma^2} \sim \chi^2(n-1)$

3. $\bar{X}$ 与 $S^2$ 独立（正态总体时）

## 4. 样本矩

### 4.1 样本 $k$ 阶原点矩

$$A_k = \frac{1}{n}\sum_{i=1}^n X_i^k, \quad k = 1, 2, \cdots$$

特别地，$A_1 = \bar{X}$。

### 4.2 样本 $k$ 阶中心矩

$$B_k = \frac{1}{n}\sum_{i=1}^n (X_i - \bar{X})^k, \quad k = 2, 3, \cdots$$

注意：$B_2 = \dfrac{n-1}{n}S^2$。

### 4.3 样本矩与总体矩的关系

由大数定律，当 $n \to \infty$ 时：

$$A_k \xrightarrow{P} E(X^k) = \mu_k$$

$$B_k \xrightarrow{P} E[X - E(X)]^k = \nu_k$$

## 5. 其他常用统计量

### 5.1 样本极差

$$R = X_{(n)} - X_{(1)} = \max(X_i) - \min(X_i)$$

### 5.2 样本中位数

$$M_e = \begin{cases} X_{\left(\frac{n+1}{2}\right)}, & n \text{ 为奇数} \\ \frac{1}{2}\left[X_{\left(\frac{n}{2}\right)} + X_{\left(\frac{n}{2}+1\right)}\right], & n \text{ 为偶数} \end{cases}$$

### 5.3 样本 $p$ 分位数

$$m_p = \begin{cases} X_{([np]+1)}, & np \text{ 不是整数} \\ \frac{1}{2}(X_{(np)} + X_{(np+1)}), & np \text{ 是整数} \end{cases}$$

### 5.4 变异系数

$$CV = \frac{S}{\bar{X}}$$

### 5.5 偏度与峰度

**样本偏度**：

$$g_1 = \frac{B_3}{B_2^{3/2}}$$

**样本峰度**：

$$g_2 = \frac{B_4}{B_2^2} - 3$$

## 6. 次序统计量

### 6.1 定义

设 $X_1, X_2, \cdots, X_n$ 为样本，将其按从小到大排列为

$$X_{(1)} \leq X_{(2)} \leq \cdots \leq X_{(n)}$$

则 $X_{(k)}$ 称为第 $k$ 个**次序统计量**。

### 6.2 次序统计量的分布

设总体 $X$ 的分布函数为 $F(x)$，密度函数为 $f(x)$，则

$$f_{X_{(k)}}(x) = \frac{n!}{(k-1)!(n-k)!}[F(x)]^{k-1}[1-F(x)]^{n-k}f(x)$$

特别地：

$$f_{X_{(1)}}(x) = n[1-F(x)]^{n-1}f(x)$$

$$f_{X_{(n)}}(x) = n[F(x)]^{n-1}f(x)$$
