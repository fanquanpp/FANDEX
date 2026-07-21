---
order: 72
title: 区间估计
module: 'probability-statistics'
category: 'comp-sci'
difficulty: intermediate
description: 置信区间的概念、构造方法、单侧置信区间。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'probability-statistics/点估计'
  - 'probability-statistics/估计量的评选标准'
  - 'probability-statistics/正态总体参数的区间估计'
  - 'probability-statistics/参数估计典型例题'
prerequisites:
  - 'probability-statistics/样本空间与事件'
---

## 1. 置信区间的概念

### 1.1 定义

设 $\theta$ 为总体分布的未知参数，$X_1, X_2, \cdots, X_n$ 为样本。若存在统计量 $\underline{\theta} = \underline{\theta}(X_1, \cdots, X_n)$ 和 $\overline{\theta} = \overline{\theta}(X_1, \cdots, X_n)$，使得对给定的 $\alpha \in (0, 1)$，

$$P(\underline{\theta} < \theta < \overline{\theta}) = 1 - \alpha$$

则称随机区间 $(\underline{\theta}, \overline{\theta})$ 为 $\theta$ 的**置信水平**为 $1 - \alpha$ 的**置信区间**，$\underline{\theta}$ 和 $\overline{\theta}$ 分别称为**置信下限**和**置信上限**，$1 - \alpha$ 称为**置信水平**（或**置信度**）。

### 1.2 置信水平的含义

$P(\underline{\theta} < \theta < \overline{\theta}) = 1 - \alpha$ 的含义是：反复抽样多次，每个样本确定一个区间，在这些区间中包含 $\theta$ 真值的比例约为 $1 - \alpha$。

> **注意**：参数 $\theta$ 是固定但未知的常数，区间 $(\underline{\theta}, \overline{\theta})$ 是随机的。

### 1.3 置信水平与精度的关系

- 置信水平 $1 - \alpha$ 越大，区间越宽，精度越低
- 置信水平 $1 - \alpha$ 越小，区间越窄，精度越高
- 在置信水平一定时，增大样本量可以缩小区间宽度

## 2. 置信区间的构造方法

### 2.1 枢轴量法

构造置信区间的基本方法是**枢轴量法**：

1. 找一个包含 $\theta$ 和样本的函数 $G(X_1, \cdots, X_n; \theta)$，其分布已知且不依赖于 $\theta$，称为**枢轴量**
2. 对给定的 $\alpha$，找常数 $a, b$ 使得 $P(a < G < b) = 1 - \alpha$
3. 由 $a < G < b$ 解出 $\underline{\theta} < \theta < \overline{\theta}$

### 2.2 枢轴量的选择

枢轴量通常基于抽样分布：

| 参数       | 条件          | 枢轴量                                   | 分布          |
| ---------- | ------------- | ---------------------------------------- | ------------- |
| $\mu$      | $\sigma$ 已知 | $\dfrac{\bar{X} - \mu}{\sigma/\sqrt{n}}$ | $N(0,1)$      |
| $\mu$      | $\sigma$ 未知 | $\dfrac{\bar{X} - \mu}{S/\sqrt{n}}$      | $t(n-1)$      |
| $\sigma^2$ | $\mu$ 未知    | $\dfrac{(n-1)S^2}{\sigma^2}$             | $\chi^2(n-1)$ |

## 3. 单侧置信区间

### 3.1 定义

若 $P(\theta > \underline{\theta}) = 1 - \alpha$，则 $(\underline{\theta}, +\infty)$ 为 $\theta$ 的**单侧置信区间**，$\underline{\theta}$ 为**单侧置信下限**。

若 $P(\theta < \overline{\theta}) = 1 - \alpha$，则 $(-\infty, \overline{\theta})$ 为 $\theta$ 的**单侧置信区间**，$\overline{\theta}$ 为**单侧置信上限**。

### 3.2 单侧与双侧的关系

双侧置信水平 $1 - \alpha$ 的置信区间对应单侧置信水平 $1 - \alpha/2$。

例如，$\mu$ 的 $95\%$ 双侧置信区间使用 $z_{0.025} = 1.96$，而 $97.5\%$ 单侧置信上限使用 $z_{0.025} = 1.96$。

## 4. 置信区间的评价

### 4.1 精确置信区间

基于精确抽样分布构造的置信区间，其置信水平恰好等于 $1 - \alpha$。

### 4.2 近似置信区间

基于渐近分布（如中心极限定理）构造的置信区间，其置信水平近似等于 $1 - \alpha$。

### 4.3 置信区间的宽度

置信区间的宽度 $\overline{\theta} - \underline{\theta}$ 反映了估计的精度。在置信水平相同的条件下，宽度越小越好。

## 5. 置信区间的常见误解

1. **误解**：$\theta$ 有 $1 - \alpha$ 的概率落在置信区间内

   **正解**：参数 $\theta$ 是常数，不是随机变量。随机的是区间，不是参数

2. **误解**：$95\%$ 置信区间意味着 $\theta$ 落在该区间内的概率是 $0.95$

   **正解**：如果重复抽样 100 次，大约有 95 个区间包含 $\theta$

3. **误解**：置信水平越高越好

   **正解**：置信水平越高，区间越宽，精度越低。需要在置信水平和精度之间权衡
