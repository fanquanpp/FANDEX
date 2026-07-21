---
order: 63
title: 正态总体的抽样分布
module: 'probability-statistics'
category: 'comp-sci'
difficulty: advanced
description: 单正态总体和双正态总体的抽样分布定理，统计推断的理论基础。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'probability-statistics/统计量'
  - 'probability-statistics/三大分布'
  - 'probability-statistics/抽样分布典型例题'
  - 'probability-statistics/点估计'
prerequisites:
  - 'probability-statistics/样本空间与事件'
---

## 1. 单正态总体的抽样分布

### 1.1 基本设定

设 $X_1, X_2, \cdots, X_n$ 为来自正态总体 $N(\mu, \sigma^2)$ 的简单随机样本，$\bar{X}$ 为样本均值，$S^2$ 为样本方差。

### 1.2 样本均值的分布

$$\bar{X} \sim N\left(\mu, \frac{\sigma^2}{n}\right)$$

标准化：

$$\frac{\bar{X} - \mu}{\sigma/\sqrt{n}} \sim N(0, 1)$$

### 1.3 样本方差的分布

$$\frac{(n-1)S^2}{\sigma^2} \sim \chi^2(n-1)$$

### 1.4 样本均值与样本方差的独立性

**定理**：$\bar{X}$ 与 $S^2$ 相互独立。

这是正态总体特有的重要性质，非正态总体一般不具备。

### 1.5 t 统计量的分布

$$\frac{\bar{X} - \mu}{S/\sqrt{n}} \sim t(n-1)$$

**推导**：

$$\frac{\bar{X} - \mu}{\sigma/\sqrt{n}} \sim N(0, 1), \quad \frac{(n-1)S^2}{\sigma^2} \sim \chi^2(n-1)$$

由 $\bar{X}$ 与 $S^2$ 独立：

$$T = \frac{\frac{\bar{X} - \mu}{\sigma/\sqrt{n}}}{\sqrt{\frac{(n-1)S^2}{\sigma^2} / (n-1)}} = \frac{\bar{X} - \mu}{S/\sqrt{n}} \sim t(n-1)$$

### 1.6 单正态总体抽样分布汇总

| 统计量                                   | 分布          | 条件          |
| ---------------------------------------- | ------------- | ------------- |
| $\dfrac{\bar{X} - \mu}{\sigma/\sqrt{n}}$ | $N(0, 1)$     | $\sigma$ 已知 |
| $\dfrac{(n-1)S^2}{\sigma^2}$             | $\chi^2(n-1)$ | —             |
| $\dfrac{\bar{X} - \mu}{S/\sqrt{n}}$      | $t(n-1)$      | $\sigma$ 未知 |

## 2. 双正态总体的抽样分布

### 2.1 基本设定

设 $X_1, X_2, \cdots, X_{n_1}$ 为来自 $N(\mu_1, \sigma_1^2)$ 的样本，$Y_1, Y_2, \cdots, Y_{n_2}$ 为来自 $N(\mu_2, \sigma_2^2)$ 的样本，两样本独立。

### 2.2 均值差的分布

**$\sigma_1^2, \sigma_2^2$ 已知**：

$$\frac{(\bar{X} - \bar{Y}) - (\mu_1 - \mu_2)}{\sqrt{\frac{\sigma_1^2}{n_1} + \frac{\sigma_2^2}{n_2}}} \sim N(0, 1)$$

**$\sigma_1^2 = \sigma_2^2 = \sigma^2$ 未知**：

$$\frac{(\bar{X} - \bar{Y}) - (\mu_1 - \mu_2)}{S_w\sqrt{\frac{1}{n_1} + \frac{1}{n_2}}} \sim t(n_1 + n_2 - 2)$$

其中

$$S_w^2 = \frac{(n_1 - 1)S_1^2 + (n_2 - 1)S_2^2}{n_1 + n_2 - 2}$$

为**联合方差**（**合并方差**）。

### 2.3 方差比的分布

$$\frac{S_1^2/\sigma_1^2}{S_2^2/\sigma_2^2} \sim F(n_1 - 1, n_2 - 1)$$

特别地，当 $\sigma_1^2 = \sigma_2^2$ 时：

$$\frac{S_1^2}{S_2^2} \sim F(n_1 - 1, n_2 - 1)$$

### 2.4 双正态总体抽样分布汇总

| 统计量                                                                          | 分布             | 条件                          |
| ------------------------------------------------------------------------------- | ---------------- | ----------------------------- |
| $\dfrac{(\bar{X}-\bar{Y})-(\mu_1-\mu_2)}{\sqrt{\sigma_1^2/n_1+\sigma_2^2/n_2}}$ | $N(0,1)$         | $\sigma_1^2, \sigma_2^2$ 已知 |
| $\dfrac{(\bar{X}-\bar{Y})-(\mu_1-\mu_2)}{S_w\sqrt{1/n_1+1/n_2}}$                | $t(n_1+n_2-2)$   | $\sigma_1^2=\sigma_2^2$ 未知  |
| $\dfrac{S_1^2/S_2^2}{\sigma_1^2/\sigma_2^2}$                                    | $F(n_1-1,n_2-1)$ | —                             |

## 3. 抽样分布的应用

### 3.1 参数估计

抽样分布是构造置信区间的基础：

- $\sigma$ 已知时，用 $Z$ 统计量构造均值的置信区间
- $\sigma$ 未知时，用 $t$ 统计量构造均值的置信区间
- 用 $\chi^2$ 统计量构造方差的置信区间
- 用 $F$ 统计量构造方差比的置信区间

### 3.2 假设检验

抽样分布是确定拒绝域的基础：

- $Z$ 检验：$\sigma$ 已知时的均值检验
- $t$ 检验：$\sigma$ 未知时的均值检验
- $\chi^2$ 检验：方差检验
- $F$ 检验：方差齐性检验

### 3.3 示例

**例题**：设 $X_1, \cdots, X_{16}$ 为来自 $N(\mu, 4)$ 的样本，求 $P(|\bar{X} - \mu| < 0.5)$。

**解**：$\bar{X} \sim N(\mu, 1/4)$，$\dfrac{\bar{X} - \mu}{1/2} \sim N(0, 1)$。

$$P(|\bar{X} - \mu| < 0.5) = P\left(\left|\frac{\bar{X} - \mu}{0.5}\right| < 1\right) = 2\Phi(1) - 1 = 0.6826$$

**例题**：设 $X_1, \cdots, X_{10}$ 为来自 $N(0, \sigma^2)$ 的样本，求 $E(S^2)$ 和 $D(S^2)$。

**解**：$\dfrac{9S^2}{\sigma^2} \sim \chi^2(9)$。

$$E\left(\frac{9S^2}{\sigma^2}\right) = 9 \implies E(S^2) = \sigma^2$$

$$D\left(\frac{9S^2}{\sigma^2}\right) = 18 \implies D(S^2) = \frac{18\sigma^4}{81} = \frac{2\sigma^4}{9}$$
