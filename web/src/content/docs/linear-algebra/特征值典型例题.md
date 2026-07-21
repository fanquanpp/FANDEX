---
order: 54
title: 特征值典型例题
module: 'linear-algebra'
category: 'comp-sci'
difficulty: intermediate
description: 特征值与特征向量典型例题集锦，涵盖计算题、对角化判定、正交对角化、抽象矩阵特征值等题型。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'linear-algebra/矩阵对角化'
  - 'linear-algebra/实对称矩阵的对角化'
  - 'linear-algebra/二次型的标准形'
  - 'linear-algebra/二次型的规范形'
prerequisites:
  - 'linear-algebra/行列式定义与几何意义'
---

## 1. 特征值计算

### 例1

求 $A = \begin{pmatrix} 3 & -1 \\ -1 & 3 \end{pmatrix}$ 的特征值与特征向量。

**解**：

$$|A - \lambda I| = (3-\lambda)^2 - 1 = \lambda^2 - 6\lambda + 8 = (\lambda-2)(\lambda-4)$$

$\lambda_1 = 2$：$(A - 2I)\boldsymbol{x} = 0$，$\begin{pmatrix} 1 & -1 \\ -1 & 1 \end{pmatrix}\boldsymbol{x} = 0$，$\boldsymbol{x}_1 = (1, 1)^T$

$\lambda_2 = 4$：$(A - 4I)\boldsymbol{x} = 0$，$\begin{pmatrix} -1 & -1 \\ -1 & -1 \end{pmatrix}\boldsymbol{x} = 0$，$\boldsymbol{x}_2 = (1, -1)^T$

### 例2

求 $A = \begin{pmatrix} 1 & 2 & 2 \\ 2 & 1 & 2 \\ 2 & 2 & 1 \end{pmatrix}$ 的特征值与特征向量。

**解**：

$$|A - \lambda I| = \begin{vmatrix} 1-\lambda & 2 & 2 \\ 2 & 1-\lambda & 2 \\ 2 & 2 & 1-\lambda \end{vmatrix} = (5-\lambda)(-1-\lambda)^2$$

$\lambda_1 = 5$，$\lambda_2 = -1$（二重）

$\lambda_1 = 5$：$\boldsymbol{x}_1 = (1, 1, 1)^T$

$\lambda_2 = -1$：$(A + I)\boldsymbol{x} = 0$，$2x_1 + 2x_2 + 2x_3 = 0$，即 $x_1 + x_2 + x_3 = 0$

$\boldsymbol{x}_2 = (-1, 1, 0)^T$，$\boldsymbol{x}_3 = (-1, 0, 1)^T$

## 2. 抽象矩阵的特征值

### 例3

设 $A$ 为三阶方阵，特征值为 $1, -1, 2$，求 $|A^2 + A - 2I|$。

**解**：$A^2 + A - 2I$ 的特征值为 $\lambda^2 + \lambda - 2$：

$\lambda = 1$：$1 + 1 - 2 = 0$

$\lambda = -1$：$1 - 1 - 2 = -2$

$\lambda = 2$：$4 + 2 - 2 = 4$

$|A^2 + A - 2I| = 0 \times (-2) \times 4 = 0$

### 例4

设 $A$ 为三阶方阵，$|A| = 2$，$A$ 的特征值为 $1, 2, 1$，求 $|A^* - 3A^{-1} + 2I|$。

**解**：$A^*$ 的特征值为 $|A|/\lambda$：$2, 1, 2$。

$A^{-1}$ 的特征值为 $1/\lambda$：$1, 1/2, 1$。

$A^* - 3A^{-1} + 2I$ 的特征值为 $|A|/\lambda - 3/\lambda + 2$：

$\lambda = 1$：$2 - 3 + 2 = 1$

$\lambda = 2$：$1 - 3/2 + 2 = 3/2$

$\lambda = 1$：$2 - 3 + 2 = 1$

$|A^* - 3A^{-1} + 2I| = 1 \times 3/2 \times 1 = 3/2$

### 例5

设 $A^2 = A$（幂等矩阵），$r(A) = r$，求 $A$ 的特征值。

**解**：设 $A\boldsymbol{x} = \lambda\boldsymbol{x}$，则 $A^2\boldsymbol{x} = \lambda^2\boldsymbol{x}$。

由 $A^2 = A$：$\lambda^2 = \lambda$，$\lambda(\lambda - 1) = 0$，$\lambda = 0$ 或 $\lambda = 1$。

$\text{tr}(A) = \lambda_1 + \cdots + \lambda_n = $ 特征值 $1$ 的个数 $= r(A) = r$。

故 $A$ 有 $r$ 个特征值 $1$ 和 $n - r$ 个特征值 $0$。

## 3. 对角化判定

### 例6

判断 $A = \begin{pmatrix} 1 & 1 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 2 \end{pmatrix}$ 是否可对角化。

**解**：特征值 $\lambda_1 = 1$（二重），$\lambda_2 = 2$。

$\lambda_1 = 1$：$A - I = \begin{pmatrix} 0 & 1 & 0 \\ 0 & 0 & 0 \\ 0 & 0 & 1 \end{pmatrix}$，$r(A - I) = 2$，几何重数 $= 3 - 2 = 1 < 2$。

$A$ 不可对角化。

### 例7

设 $A = \begin{pmatrix} a & 0 & 0 \\ 0 & b & 1 \\ 0 & 0 & b \end{pmatrix}$，讨论 $A$ 可对角化的条件。

**解**：特征值 $\lambda_1 = a$，$\lambda_2 = b$（二重）。

$\lambda_2 = b$：$A - bI = \begin{pmatrix} a-b & 0 & 0 \\ 0 & 0 & 1 \\ 0 & 0 & 0 \end{pmatrix}$

当 $a \neq b$ 时：$r(A - bI) = 2$，几何重数 $= 1 < 2$，不可对角化。

当 $a = b$ 时：$A - bI = \begin{pmatrix} 0 & 0 & 0 \\ 0 & 0 & 1 \\ 0 & 0 & 0 \end{pmatrix}$，$r(A - bI) = 1$，几何重数 $= 2 = $ 代数重数，可对角化。

## 4. 正交对角化

### 例8

将 $A = \begin{pmatrix} 1 & -2 \\ -2 & 1 \end{pmatrix}$ 正交对角化。

**解**：

$$|A - \lambda I| = (1-\lambda)^2 - 4 = (\lambda-3)(\lambda+1)$$

$\lambda_1 = 3$，$\lambda_2 = -1$

$\lambda_1 = 3$：$\boldsymbol{x}_1 = (1, -1)^T$，单位化 $\boldsymbol{q}_1 = \frac{1}{\sqrt{2}}(1, -1)^T$

$\lambda_2 = -1$：$\boldsymbol{x}_2 = (1, 1)^T$，单位化 $\boldsymbol{q}_2 = \frac{1}{\sqrt{2}}(1, 1)^T$

$$Q = \frac{1}{\sqrt{2}}\begin{pmatrix} 1 & 1 \\ -1 & 1 \end{pmatrix}, \quad \Lambda = \begin{pmatrix} 3 & 0 \\ 0 & -1 \end{pmatrix}$$

## 5. 综合题

### 例9

设 $A$ 为三阶实对称矩阵，$r(A) = 2$，$A^2 + 2A = O$，求 $A$ 的特征值及 $|A + I|$。

**解**：设 $\lambda$ 为 $A$ 的特征值，$\lambda^2 + 2\lambda = 0$，$\lambda = 0$ 或 $\lambda = -2$。

$A$ 为实对称矩阵，可对角化。$r(A) = 2$，故特征值 $0$ 的个数为 $3 - 2 = 1$，特征值 $-2$ 的个数为 $2$。

$A$ 的特征值为 $0, -2, -2$。

$|A + I| = 1 \times (-1) \times (-1) = 1$。

### 例10

设 $A$ 为 $n$ 阶实对称矩阵，$A^2 = I$，$r(A + I) = r$，求 $|A - 2I|$。

**解**：$\lambda^2 = 1$，$\lambda = \pm 1$。

$A + I$ 的特征值为 $\lambda + 1$：$2$（对应 $\lambda = 1$）和 $0$（对应 $\lambda = -1$）。

$r(A + I) = $ 特征值 $2$ 的个数 $= r$。

故 $A$ 有 $r$ 个特征值 $1$ 和 $n - r$ 个特征值 $-1$。

$A - 2I$ 的特征值为 $1 - 2 = -1$（$r$ 个）和 $-1 - 2 = -3$（$n - r$ 个）。

$|A - 2I| = (-1)^r \cdot (-3)^{n-r}$

### 例11

设 $A$ 为 $n$ 阶方阵，$\boldsymbol{\alpha}, \boldsymbol{\beta}$ 为 $n$ 维非零列向量，$A = \boldsymbol{\alpha}\boldsymbol{\beta}^T$，$\boldsymbol{\beta}^T\boldsymbol{\alpha} = k$，求 $A$ 的特征值与特征向量。

**解**：$A\boldsymbol{\alpha} = \boldsymbol{\alpha}\boldsymbol{\beta}^T\boldsymbol{\alpha} = k\boldsymbol{\alpha}$

$\lambda = k$ 是特征值，$\boldsymbol{\alpha}$ 是对应的特征向量。

$A\boldsymbol{x} = \boldsymbol{\alpha}(\boldsymbol{\beta}^T\boldsymbol{x}) = 0$ 当 $\boldsymbol{\beta}^T\boldsymbol{x} = 0$ 时。

$r(A) = 1$（$\boldsymbol{\alpha} \neq 0$），$0$ 的代数重数为 $n - 1$。

$A$ 的特征值为 $k$（单根）和 $0$（$n-1$ 重）。

当 $k \neq 0$ 时，$A$ 可对角化（几何重数 $= n - r(A) = n - 1 = $ 代数重数）。

### 例12

设 $A$ 为 $n$ 阶正交矩阵，证明：若 $|A| = 1$ 且 $n$ 为奇数，则 $1$ 是 $A$ 的特征值；若 $|A| = -1$，则 $-1$ 是 $A$ 的特征值。

**证明**：

**$|A| = 1$，$n$ 为奇数**：

$|A - I| = |A - AA^T| = |A(I - A^T)| = |A| \cdot |I - A^T| = |(I - A)^T| = |I - A| = -|A - I|$

（$|I - A| = |-(A - I)| = (-1)^n|A - I| = -|A - I|$，$n$ 为奇数）

故 $2|A - I| = 0$，$|A - I| = 0$，$1$ 是特征值。

**$|A| = -1$**：

$|A + I| = |A + AA^T| = |A(I + A^T)| = |A| \cdot |I + A^T| = -|I + A| = -|A + I|$

故 $2|A + I| = 0$，$|A + I| = 0$，$-1$ 是特征值。
