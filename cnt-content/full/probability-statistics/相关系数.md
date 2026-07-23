---
order: 43
title: 相关系数
module: 'probability-statistics'
category: 'comp-sci'
difficulty: intermediate
description: 相关系数的定义、性质、判定与意义，相关系数与独立性的关系。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'probability-statistics/方差与标准差'
  - 'probability-statistics/协方差'
  - 'probability-statistics/矩与协方差矩阵'
  - 'probability-statistics/数字特征典型例题'
prerequisites:
  - 'probability-statistics/样本空间与事件'
---

## 1. 相关系数的定义

### 1.1 定义

设 $X$ 和 $Y$ 是两个随机变量，且 $D(X) > 0$，$D(Y) > 0$，则称

$$\rho_{XY} = \frac{\text{Cov}(X, Y)}{\sqrt{D(X)} \cdot \sqrt{D(Y)}} = \frac{E[X - E(X)][Y - E(Y)]}{\sqrt{D(X)} \cdot \sqrt{D(Y)}}$$

为 $X$ 与 $Y$ 的**相关系数**（或**皮尔逊相关系数**）。

### 1.2 标准化变量的协方差

$$\rho_{XY} = \text{Cov}\left(X^*, Y^*\right)$$

其中 $X^* = \dfrac{X - E(X)}{\sqrt{D(X)}}$，$Y^* = \dfrac{Y - E(Y)}{\sqrt{D(Y)}}$ 为标准化变量。

相关系数就是标准化变量的协方差。

## 2. 相关系数的性质

### 2.1 基本性质

1. **有界性**：$|\rho_{XY}| \leq 1$

2. **对称性**：$\rho_{XY} = \rho_{YX}$

3. **线性变换不变性**：$\rho_{aX+b, cY+d} = \text{sgn}(ac) \cdot \rho_{XY}$

   特别地，$\rho_{aX, aY} = \rho_{XY}$（$a > 0$）

4. **$|\rho| = 1$ 的条件**：$|\rho_{XY}| = 1 \iff$ 存在常数 $a, b$（$a \neq 0$），使得 $P(Y = aX + b) = 1$
   - $\rho = 1$：$a > 0$（完全正相关）
   - $\rho = -1$：$a < 0$（完全负相关）

5. **$\rho = 0$ 的条件**：$\rho_{XY} = 0 \iff \text{Cov}(X, Y) = 0 \iff E(XY) = E(X)E(Y)$

### 2.2 有界性的证明

由柯西-施瓦茨不等式：

$$[E(XY)]^2 \leq E(X^2) \cdot E(Y^2)$$

令 $U = X - E(X)$，$V = Y - E(Y)$，则

$$[\text{Cov}(X, Y)]^2 = [E(UV)]^2 \leq E(U^2) \cdot E(V^2) = D(X) \cdot D(Y)$$

$$\rho_{XY}^2 = \frac{[\text{Cov}(X, Y)]^2}{D(X) \cdot D(Y)} \leq 1$$

### 2.3 $|\rho| = 1$ 的证明

$|\rho_{XY}| = 1 \iff [E(UV)]^2 = E(U^2) E(V^2) \iff$ 存在常数 $a$，使得 $P(V = aU) = 1$

即 $P(Y - E(Y) = a[X - E(X)]) = 1$，亦即 $P(Y = aX + b) = 1$，其中 $b = E(Y) - aE(X)$。

## 3. 相关系数的意义

### 3.1 线性相关程度

相关系数衡量的是两个随机变量之间的**线性相关程度**：

| $\rho$ 的范围   | 含义                 |
| --------------- | -------------------- |
| $\rho = 1$      | 完全正线性相关       |
| $0 < \rho < 1$  | 正线性相关           |
| $\rho = 0$      | 不相关（无线性关系） |
| $-1 < \rho < 0$ | 负线性相关           |
| $\rho = -1$     | 完全负线性相关       |

### 3.2 相关系数与因果关系

**重要**：相关不等于因果。$\rho \neq 0$ 只说明 $X$ 与 $Y$ 存在线性关系，不能说明因果关系。

### 3.3 相关系数的局限

1. 只衡量线性关系，不反映非线性关系
2. 对异常值敏感
3. $\rho = 0$ 不意味着 $X$ 与 $Y$ 没有关系，只是没有线性关系

## 4. 相关系数与独立性

### 4.1 关系

- 独立 $\Rightarrow$ 不相关（$\rho = 0$）
- 不相关 $\not\Rightarrow$ 独立
- 二维正态：不相关 $\iff$ 独立

### 4.2 不相关但不独立的例子

**例1**：设 $\Theta \sim U(0, 2\pi)$，$X = \cos\Theta$，$Y = \sin\Theta$。

$$E(X) = E(\cos\Theta) = 0, \quad E(Y) = E(\sin\Theta) = 0$$

$$E(XY) = E(\cos\Theta \sin\Theta) = \frac{1}{2}E(\sin 2\Theta) = 0$$

$$\text{Cov}(X, Y) = 0, \quad \rho = 0$$

但 $X^2 + Y^2 = 1$，$X$ 与 $Y$ 显然不独立。

**例2**：设 $X \sim N(0, 1)$，$Y = X^2$。

$$E(XY) = E(X^3) = 0 = E(X)E(Y) = 0$$

$\rho = 0$，但 $Y$ 完全由 $X$ 决定。

## 5. 相关系数的计算

### 5.1 计算步骤

1. 计算 $E(X)$，$E(Y)$
2. 计算 $E(XY)$
3. 计算 $\text{Cov}(X, Y) = E(XY) - E(X)E(Y)$
4. 计算 $D(X)$，$D(Y)$
5. 计算 $\rho_{XY} = \dfrac{\text{Cov}(X, Y)}{\sqrt{D(X)D(Y)}}$

### 5.2 示例

**例题**：设 $(X, Y)$ 的联合分布律为：

| $X \backslash Y$ |       0        |       1        |
| :--------------: | :------------: | :------------: |
|        0         | $\dfrac{1}{4}$ | $\dfrac{1}{4}$ |
|        1         | $\dfrac{1}{4}$ | $\dfrac{1}{4}$ |

求 $\rho_{XY}$。

**解**：

$E(X) = \dfrac{1}{2}$，$E(Y) = \dfrac{1}{2}$

$E(XY) = 0 \times 0 \times \dfrac{1}{4} + 0 \times 1 \times \dfrac{1}{4} + 1 \times 0 \times \dfrac{1}{4} + 1 \times 1 \times \dfrac{1}{4} = \dfrac{1}{4}$

$\text{Cov}(X, Y) = \dfrac{1}{4} - \dfrac{1}{2} \times \dfrac{1}{2} = 0$

$\rho_{XY} = 0$

$X$ 与 $Y$ 不相关。实际上可以验证 $X$ 与 $Y$ 独立。

## 6. 其他相关系数

### 6.1 秩相关系数（斯皮尔曼）

对数据的秩（排名）计算相关系数，适用于非线性单调关系。

### 6.2 肯德尔秩相关系数

基于一致对和不一致对的数量，适用于序数数据。

### 6.3 点双列相关

用于一个连续变量和一个二分类变量之间的相关。
