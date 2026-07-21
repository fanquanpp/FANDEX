---
order: 40
title: 数学期望
module: 'probability-statistics'
category: 'comp-sci'
difficulty: intermediate
description: 数学期望的定义、性质、随机变量函数的期望、条件期望。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'probability-statistics/和的分布与极值分布'
  - 'probability-statistics/多维随机变量典型例题'
  - 'probability-statistics/方差与标准差'
  - 'probability-statistics/协方差'
prerequisites:
  - 'probability-statistics/样本空间与事件'
---

## 1. 数学期望的定义

### 1.1 离散型随机变量的期望

设离散型随机变量 $X$ 的分布律为 $P(X = x_k) = p_k$（$k = 1, 2, \cdots$），若级数 $\sum_{k=1}^{\infty} |x_k| p_k$ 收敛，则称

$$E(X) = \sum_{k=1}^{\infty} x_k p_k$$

为 $X$ 的**数学期望**（简称**期望**或**均值**）。

> **注意**：要求级数绝对收敛。若 $\sum |x_k| p_k = +\infty$，则称 $X$ 的期望不存在。

### 1.2 连续型随机变量的期望

设连续型随机变量 $X$ 的密度函数为 $f(x)$，若积分 $\int_{-\infty}^{+\infty} |x| f(x) \, dx$ 收敛，则称

$$E(X) = \int_{-\infty}^{+\infty} x f(x) \, dx$$

为 $X$ 的**数学期望**。

### 1.3 期望的直观意义

数学期望是随机变量取值的"加权平均"，权重为各取值的概率。它反映了随机变量取值的**中心位置**。

## 2. 随机变量函数的期望

### 2.1 一维随机变量函数的期望

**离散型**：设 $Y = g(X)$，则

$$E(Y) = E[g(X)] = \sum_{k=1}^{\infty} g(x_k) p_k$$

**连续型**：设 $Y = g(X)$，则

$$E(Y) = E[g(X)] = \int_{-\infty}^{+\infty} g(x) f(x) \, dx$$

> **重要**：不需要先求 $Y$ 的分布，可以直接用 $X$ 的分布计算 $E[g(X)]$。

### 2.2 二维随机变量函数的期望

**离散型**：

$$E[g(X, Y)] = \sum_{i=1}^{\infty} \sum_{j=1}^{\infty} g(x_i, y_j) p_{ij}$$

**连续型**：

$$E[g(X, Y)] = \int_{-\infty}^{+\infty} \int_{-\infty}^{+\infty} g(x, y) f(x, y) \, dx \, dy$$

## 3. 数学期望的性质

### 3.1 基本性质

1. **常数性质**：$E(C) = C$（$C$ 为常数）

2. **线性性质**：$E(aX + b) = aE(X) + b$

3. **可加性**：$E(X + Y) = E(X) + E(Y)$（无论 $X, Y$ 是否独立）

4. **乘法性质**：若 $X$ 与 $Y$ 独立，则 $E(XY) = E(X) \cdot E(Y)$

   > 注意：反之不成立，即 $E(XY) = E(X)E(Y)$ 不能推出 $X$ 与 $Y$ 独立。

5. **推广**：$E\left(\sum_{i=1}^n a_i X_i\right) = \sum_{i=1}^n a_i E(X_i)$

### 3.2 性质的应用

**例题**：设 $X \sim B(n, p)$，利用性质求 $E(X)$。

**解**：$X$ 可表示为 $n$ 个独立 0-1 变量之和：$X = X_1 + X_2 + \cdots + X_n$，其中 $X_i \sim B(1, p)$，$E(X_i) = p$。

$$E(X) = E(X_1) + E(X_2) + \cdots + E(X_n) = np$$

## 4. 常用分布的期望

| 分布                  | 期望                 |
| --------------------- | -------------------- |
| $B(1, p)$             | $p$                  |
| $B(n, p)$             | $np$                 |
| $P(\lambda)$          | $\lambda$            |
| $G(p)$                | $\dfrac{1}{p}$       |
| $U(a, b)$             | $\dfrac{a+b}{2}$     |
| $\text{Exp}(\lambda)$ | $\dfrac{1}{\lambda}$ |
| $N(\mu, \sigma^2)$    | $\mu$                |

## 5. 条件期望

### 5.1 定义

**离散型**：在 $Y = y_j$ 条件下 $X$ 的条件期望为

$$E(X \mid Y = y_j) = \sum_{i=1}^{\infty} x_i P(X = x_i \mid Y = y_j)$$

**连续型**：在 $Y = y$ 条件下 $X$ 的条件期望为

$$E(X \mid Y = y) = \int_{-\infty}^{+\infty} x f_{X \mid Y}(x \mid y) \, dx$$

### 5.2 全期望公式

$$E(X) = E[E(X \mid Y)]$$

即

$$E(X) = \begin{cases} \sum_{j} E(X \mid Y = y_j) P(Y = y_j), & \text{离散型} \\ \int_{-\infty}^{+\infty} E(X \mid Y = y) f_Y(y) \, dy, & \text{连续型} \end{cases}$$

### 5.3 全期望公式的应用

**例题**：某商店每天的顾客数 $N \sim P(50)$，每位顾客的消费金额 $X_i \sim \text{Exp}(0.01)$（独立同分布），且 $N$ 与 $\{X_i\}$ 独立。求商店每天的总营业额期望。

**解**：设总营业额 $S = \sum_{i=1}^N X_i$。

$$E(S) = E[E(S \mid N)] = E[N \cdot E(X_1)] = E(N) \cdot E(X_1) = 50 \times 100 = 5000$$

## 6. 期望不存在的例子

### 6.1 柯西分布

设 $X$ 的密度为 $f(x) = \dfrac{1}{\pi(1 + x^2)}$，则

$$E(|X|) = \int_{-\infty}^{+\infty} \frac{|x|}{\pi(1+x^2)} \, dx = \frac{2}{\pi} \int_0^{+\infty} \frac{x}{1+x^2} \, dx = +\infty$$

故柯西分布的期望不存在。

### 6.2 期望存在但高阶矩不存在

设 $X$ 的密度为 $f(x) = \dfrac{2}{x^3}$（$x > 1$），则

$$E(X) = \int_1^{+\infty} x \cdot \frac{2}{x^3} \, dx = 2\int_1^{+\infty} \frac{1}{x^2} \, dx = 2$$

但 $E(X^2) = \int_1^{+\infty} x^2 \cdot \frac{2}{x^3} \, dx = 2\int_1^{+\infty} \frac{1}{x} \, dx = +\infty$，二阶矩不存在。
