---
order: 51
title: 特征值性质
module: 'linear-algebra'
category: 'comp-sci'
difficulty: intermediate
description: 特征值的基本性质，迹与特征值的关系，行列式与特征值的关系，矩阵运算的特征值。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'linear-algebra/向量空间典型例题'
  - 'linear-algebra/特征值与特征向量计算'
  - 'linear-algebra/矩阵对角化'
  - 'linear-algebra/实对称矩阵的对角化'
prerequisites:
  - 'linear-algebra/行列式定义与几何意义'
---

## 1. 特征值的基本性质

### 1.1 迹与特征值

$$\text{tr}(A) = \lambda_1 + \lambda_2 + \cdots + \lambda_n$$

矩阵的迹等于所有特征值之和。

### 1.2 行列式与特征值

$$|A| = \lambda_1 \lambda_2 \cdots \lambda_n$$

矩阵的行列式等于所有特征值之积。

### 1.3 可逆性与特征值

$A$ 可逆 $\iff$ $A$ 的特征值全不为零。

### 1.4 特征值的个数

$n$ 阶方阵在复数域上恰好有 $n$ 个特征值（计入代数重数）。

## 2. 矩阵运算的特征值

### 2.1 基本运算

设 $A$ 的特征值为 $\lambda$，对应的特征向量为 $\boldsymbol{x}$（$A\boldsymbol{x} = \lambda\boldsymbol{x}$），则：

| 矩阵 | 特征值 | 特征向量 |
| ---------- | -------------- | -------------------------------- | ----------- | --------------------------------------- |
| $kA$ | $k\lambda$ | $\boldsymbol{x}$ |
| $A + kI$ | $\lambda + k$ | $\boldsymbol{x}$ |
| $A^k$ | $\lambda^k$ | $\boldsymbol{x}$ |
| $A^{-1}$ | $\lambda^{-1}$ | $\boldsymbol{x}$（$A$ 可逆时） |
| $A^*$ | $\dfrac{       | A                                | }{\lambda}$ | $\boldsymbol{x}$（$\lambda \neq 0$ 时） |
| $f(A)$ | $f(\lambda)$ | $\boldsymbol{x}$（$f$ 为多项式） |
| $A^T$ | $\lambda$ | 不一定是 $\boldsymbol{x}$ |
| $P^{-1}AP$ | $\lambda$ | $P^{-1}\boldsymbol{x}$ |

### 2.2 证明

**$A^k$**：$A\boldsymbol{x} = \lambda\boldsymbol{x}$，$A^2\boldsymbol{x} = A(\lambda\boldsymbol{x}) = \lambda^2\boldsymbol{x}$，归纳得 $A^k\boldsymbol{x} = \lambda^k\boldsymbol{x}$。

**$A^{-1}$**：$A\boldsymbol{x} = \lambda\boldsymbol{x}$，$\boldsymbol{x} = \lambda A^{-1}\boldsymbol{x}$，$A^{-1}\boldsymbol{x} = \lambda^{-1}\boldsymbol{x}$。

**$A^*$**：$A^* = |A|A^{-1}$，$A^*\boldsymbol{x} = |A|A^{-1}\boldsymbol{x} = \dfrac{|A|}{\lambda}\boldsymbol{x}$。

**$f(A)$**：$f(A)\boldsymbol{x} = (a_mA^m + \cdots + a_1A + a_0I)\boldsymbol{x} = (a_m\lambda^m + \cdots + a_1\lambda + a_0)\boldsymbol{x} = f(\lambda)\boldsymbol{x}$。

### 2.3 注意事项

1. $A + B$ 的特征值一般不是 $A$ 的特征值加 $B$ 的特征值
2. $AB$ 的特征值一般不是 $A$ 的特征值乘 $B$ 的特征值
3. $A^T$ 与 $A$ 有相同的特征值（但特征向量一般不同）

## 3. 特征值的估计

### 3.1 Gershgorin 圆盘定理

$A = (a_{ij})_{n \times n}$ 的每个特征值至少位于以下 $n$ 个圆盘之一中：

$$D_i = \{z \in \mathbb{C} \mid |z - a_{ii}| \leq R_i\}$$

其中 $R_i = \sum_{j \neq i} |a_{ij}|$ 是第 $i$ 行非对角线元素的绝对值之和。

### 3.2 特征值的界

对于实对称矩阵 $A$：

$$\lambda_{\min} \leq \frac{\boldsymbol{x}^TA\boldsymbol{x}}{\boldsymbol{x}^T\boldsymbol{x}} \leq \lambda_{\max}$$

（Rayleigh 商）

## 4. 特征多项式的性质

### 4.1 Cayley-Hamilton 定理

设 $A$ 的特征多项式为 $f(\lambda) = |\lambda I - A|$，则：

$$f(A) = O$$

**应用**：可以用低次幂表示高次幂。

**示例**：设 $A^3 - 2A^2 + A - I = O$，求 $A^4$。

$A^3 = 2A^2 - A + I$

$A^4 = 2A^3 - A^2 + A = 2(2A^2 - A + I) - A^2 + A = 3A^2 - A + 2I$

### 4.2 特征多项式的系数

$$f(\lambda) = \lambda^n - c_1\lambda^{n-1} + c_2\lambda^{n-2} - \cdots + (-1)^n c_n$$

其中：

- $c_1 = \text{tr}(A) = \lambda_1 + \cdots + \lambda_n$
- $c_2 = \sum_{i<j} \lambda_i\lambda_j$（所有二阶主子式之和）
- $c_n = |A| = \lambda_1\lambda_2\cdots\lambda_n$

## 5. 典型例题

### 例1

设 $A$ 为三阶方阵，特征值为 $1, 2, 3$，求 $|A^* + 3A^{-1} - 2I|$。

**解**：$A^*$ 的特征值为 $\dfrac{|A|}{\lambda}$：$6/1 = 6$，$6/2 = 3$，$6/3 = 2$。

$A^{-1}$ 的特征值为 $1/\lambda$：$1$，$1/2$，$1/3$。

$A^* + 3A^{-1} - 2I$ 的特征值为：

$6 + 3 \times 1 - 2 = 7$，$3 + 3 \times 1/2 - 2 = 5/2$，$2 + 3 \times 1/3 - 2 = 1$

$|A^* + 3A^{-1} - 2I| = 7 \times 5/2 \times 1 = 35/2$

### 例2

设 $A$ 为 $n$ 阶方阵，$|A| \neq 0$，$\lambda$ 是 $A$ 的特征值，证明 $\lambda^{-1}|A|^2$ 是 $A^*$ 的特征值。

**证明**：$A^* = |A|A^{-1}$，$A^*$ 的特征值为 $\dfrac{|A|}{\lambda}$。

$(A^*)^2$ 的特征值为 $\left(\dfrac{|A|}{\lambda}\right)^2 = \dfrac{|A|^2}{\lambda^2}$。

但题目说的是 $A^*$ 的特征值，即 $\dfrac{|A|}{\lambda}$，而非 $(A^*)^2$。

若题目为 $|A|\lambda^{-1}$ 是 $A^*$ 的特征值，则正确。

### 例3

设 $A$ 为 $n$ 阶实矩阵，$A^TA = I$，$|A| < 0$，求 $A$ 的一个特征值。

**解**：$A^TA = I$，$A$ 为正交矩阵，$|A| = \pm 1$。

由 $|A| < 0$，$|A| = -1$。

$|A| = \lambda_1\lambda_2\cdots\lambda_n = -1$。

又 $|\lambda_i| = 1$（正交矩阵的特征值模为1），且实矩阵的复特征值成共轭对出现，其积为正。

故至少有一个实特征值为 $-1$。

### 例4

设 $A$ 为 $n$ 阶方阵，$\boldsymbol{\alpha}$ 为 $n$ 维非零列向量，$A\boldsymbol{\alpha} = 2\boldsymbol{\alpha}$，$A^2\boldsymbol{\alpha} = 4\boldsymbol{\alpha}$，判断 $A$ 是否可对角化。

**解**：$A\boldsymbol{\alpha} = 2\boldsymbol{\alpha}$，$\boldsymbol{\alpha}$ 是属于 $\lambda = 2$ 的特征向量。

$A^2\boldsymbol{\alpha} = 4\boldsymbol{\alpha} = 2^2\boldsymbol{\alpha}$，这与 $A\boldsymbol{\alpha} = 2\boldsymbol{\alpha}$ 一致（$A^2\boldsymbol{\alpha} = A(2\boldsymbol{\alpha}) = 2A\boldsymbol{\alpha} = 4\boldsymbol{\alpha}$）。

仅凭这些信息无法判断 $A$ 是否可对角化，需要更多条件。
