---
order: 73
title: 正态总体参数的区间估计
module: 'probability-statistics'
category: 'comp-sci'
difficulty: advanced
description: 正态总体均值、方差、比例的区间估计，单总体与双总体情形。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'probability-statistics/估计量的评选标准'
  - 'probability-statistics/区间估计'
  - 'probability-statistics/参数估计典型例题'
  - 'probability-statistics/假设检验基本概念'
prerequisites:
  - 'probability-statistics/样本空间与事件'
---

## 1. 单正态总体均值的区间估计

设 $X_1, X_2, \cdots, X_n \sim N(\mu, \sigma^2)$，置信水平 $1 - \alpha$。

### 1.1 σ 已知

枢轴量：$Z = \dfrac{\bar{X} - \mu}{\sigma/\sqrt{n}} \sim N(0, 1)$

$$P\left(-z_{\alpha/2} < \frac{\bar{X} - \mu}{\sigma/\sqrt{n}} < z_{\alpha/2}\right) = 1 - \alpha$$

$\mu$ 的置信区间：

$$\left(\bar{X} - z_{\alpha/2}\frac{\sigma}{\sqrt{n}}, \quad \bar{X} + z_{\alpha/2}\frac{\sigma}{\sqrt{n}}\right)$$

区间宽度：$2z_{\alpha/2}\dfrac{\sigma}{\sqrt{n}}$

### 1.2 σ 未知

枢轴量：$T = \dfrac{\bar{X} - \mu}{S/\sqrt{n}} \sim t(n-1)$

$\mu$ 的置信区间：

$$\left(\bar{X} - t_{\alpha/2}(n-1)\frac{S}{\sqrt{n}}, \quad \bar{X} + t_{\alpha/2}(n-1)\frac{S}{\sqrt{n}}\right)$$

### 1.3 示例

**例题**：从某批零件中抽取 9 件，测得长度（mm）为：21.1, 21.3, 21.4, 21.5, 21.3, 21.7, 21.4, 21.3, 21.6。设零件长度服从正态分布，求总体均值 $\mu$ 的 $95\%$ 置信区间。

**解**：$n = 9$，$\bar{x} = 21.4$，$s = 0.187$。

$\sigma$ 未知，用 $t$ 分布。$t_{0.025}(8) = 2.306$。

$$\left(21.4 - 2.306 \times \frac{0.187}{3}, \quad 21.4 + 2.306 \times \frac{0.187}{3}\right) = (21.256, 21.544)$$

## 2. 单正态总体方差的区间估计

### 2.1 枢轴量

$$\chi^2 = \frac{(n-1)S^2}{\sigma^2} \sim \chi^2(n-1)$$

### 2.2 置信区间

$$P\left(\chi^2_{1-\alpha/2}(n-1) < \frac{(n-1)S^2}{\sigma^2} < \chi^2_{\alpha/2}(n-1)\right) = 1 - \alpha$$

$\sigma^2$ 的置信区间：

$$\left(\frac{(n-1)S^2}{\chi^2_{\alpha/2}(n-1)}, \quad \frac{(n-1)S^2}{\chi^2_{1-\alpha/2}(n-1)}\right)$$

$\sigma$ 的置信区间：

$$\left(\sqrt{\frac{(n-1)S^2}{\chi^2_{\alpha/2}(n-1)}}, \quad \sqrt{\frac{(n-1)S^2}{\chi^2_{1-\alpha/2}(n-1)}}\right)$$

### 2.3 示例

**例题**：设 $n = 16$，$s^2 = 4$，求 $\sigma^2$ 的 $95\%$ 置信区间。

**解**：$\chi^2_{0.025}(15) = 27.488$，$\chi^2_{0.975}(15) = 6.262$。

$$\left(\frac{15 \times 4}{27.488}, \quad \frac{15 \times 4}{6.262}\right) = (2.183, 9.583)$$

## 3. 双正态总体均值差的区间估计

设 $X_1, \cdots, X_{n_1} \sim N(\mu_1, \sigma_1^2)$，$Y_1, \cdots, Y_{n_2} \sim N(\mu_2, \sigma_2^2)$，两样本独立。

### 3.1 σ₁² 和 σ₂² 已知

$$\left((\bar{X} - \bar{Y}) - z_{\alpha/2}\sqrt{\frac{\sigma_1^2}{n_1} + \frac{\sigma_2^2}{n_2}}, \quad (\bar{X} - \bar{Y}) + z_{\alpha/2}\sqrt{\frac{\sigma_1^2}{n_1} + \frac{\sigma_2^2}{n_2}}\right)$$

### 3.2 σ₁² = σ₂² = σ² 未知

$$\left((\bar{X} - \bar{Y}) - t_{\alpha/2}(n_1+n_2-2)S_w\sqrt{\frac{1}{n_1}+\frac{1}{n_2}}, \quad (\bar{X} - \bar{Y}) + t_{\alpha/2}(n_1+n_2-2)S_w\sqrt{\frac{1}{n_1}+\frac{1}{n_2}}\right)$$

其中 $S_w^2 = \dfrac{(n_1-1)S_1^2 + (n_2-1)S_2^2}{n_1 + n_2 - 2}$。

### 3.3 σ₁² ≠ σ₂² 且未知（近似）

当 $n_1, n_2$ 较大时，可用

$$\left((\bar{X} - \bar{Y}) - z_{\alpha/2}\sqrt{\frac{S_1^2}{n_1} + \frac{S_2^2}{n_2}}, \quad (\bar{X} - \bar{Y}) + z_{\alpha/2}\sqrt{\frac{S_1^2}{n_1} + \frac{S_2^2}{n_2}}\right)$$

## 4. 双正态总体方差比的区间估计

### 4.1 枢轴量

$$F = \frac{S_1^2/\sigma_1^2}{S_2^2/\sigma_2^2} \sim F(n_1-1, n_2-1)$$

### 4.2 置信区间

$$\left(\frac{S_1^2}{S_2^2} \cdot \frac{1}{F_{\alpha/2}(n_1-1, n_2-1)}, \quad \frac{S_1^2}{S_2^2} \cdot F_{\alpha/2}(n_2-1, n_1-1)\right)$$

## 5. 非正态总体参数的区间估计

### 5.1 大样本方法

当 $n$ 较大时，由中心极限定理：

$$\frac{\bar{X} - \mu}{S/\sqrt{n}} \overset{\text{近似}}{\sim} N(0, 1)$$

$\mu$ 的近似置信区间：

$$\left(\bar{X} - z_{\alpha/2}\frac{S}{\sqrt{n}}, \quad \bar{X} + z_{\alpha/2}\frac{S}{\sqrt{n}}\right)$$

### 5.2 比例的区间估计

设 $X \sim B(n, p)$，$\hat{p} = X/n$，当 $n$ 较大时：

$$\frac{\hat{p} - p}{\sqrt{\hat{p}(1-\hat{p})/n}} \overset{\text{近似}}{\sim} N(0, 1)$$

$p$ 的近似置信区间：

$$\left(\hat{p} - z_{\alpha/2}\sqrt{\frac{\hat{p}(1-\hat{p})}{n}}, \quad \hat{p} + z_{\alpha/2}\sqrt{\frac{\hat{p}(1-\hat{p})}{n}}\right)$$

## 6. 区间估计汇总表

| 参数                    | 条件                           | 枢轴量   | 置信区间                                                                                   |
| ----------------------- | ------------------------------ | -------- | ------------------------------------------------------------------------------------------ |
| $\mu$                   | $\sigma$ 已知                  | $Z$      | $\bar{X} \pm z_{\alpha/2}\dfrac{\sigma}{\sqrt{n}}$                                         |
| $\mu$                   | $\sigma$ 未知                  | $T$      | $\bar{X} \pm t_{\alpha/2}(n-1)\dfrac{S}{\sqrt{n}}$                                         |
| $\sigma^2$              | —                              | $\chi^2$ | $\left(\dfrac{(n-1)S^2}{\chi^2_{\alpha/2}}, \dfrac{(n-1)S^2}{\chi^2_{1-\alpha/2}}\right)$  |
| $\mu_1 - \mu_2$         | $\sigma_1^2, \sigma_2^2$ 已知  | $Z$      | $(\bar{X}-\bar{Y}) \pm z_{\alpha/2}\sqrt{\dfrac{\sigma_1^2}{n_1}+\dfrac{\sigma_2^2}{n_2}}$ |
| $\mu_1 - \mu_2$         | $\sigma_1^2 = \sigma_2^2$ 未知 | $T$      | $(\bar{X}-\bar{Y}) \pm t_{\alpha/2}S_w\sqrt{\dfrac{1}{n_1}+\dfrac{1}{n_2}}$                |
| $\sigma_1^2/\sigma_2^2$ | —                              | $F$      | $\left(\dfrac{S_1^2/S_2^2}{F_{\alpha/2}}, \dfrac{S_1^2}{S_2^2}F_{\alpha/2}\right)$         |
