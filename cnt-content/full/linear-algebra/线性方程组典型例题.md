---
order: 35
title: 线性方程组典型例题
module: 'linear-algebra'
category: 'comp-sci'
difficulty: intermediate
description: 线性方程组求解与证明的典型例题集锦，涵盖解的判定、通解求法、含参数方程组、抽象方程组等题型。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'linear-algebra/非齐次线性方程组'
  - 'linear-algebra/解的结构'
  - 'linear-algebra/线性相关性'
  - 'linear-algebra/基与维数'
prerequisites:
  - 'linear-algebra/行列式定义与几何意义'
---

## 1. 解的判定

### 例1

讨论方程组 $\begin{cases} x_1 + x_2 + x_3 + x_4 = 0 \\ x_2 + 2x_3 + 2x_4 = 1 \\ -x_2 + (a-3)x_3 - 2x_4 = b \\ 3x_1 + 2x_2 + x_3 + ax_4 = -1 \end{cases}$ 的解的情况。

**解**：对增广矩阵做行变换：

$$(A|b) = \begin{pmatrix} 1 & 1 & 1 & 1 & 0 \\ 0 & 1 & 2 & 2 & 1 \\ 0 & -1 & a-3 & -2 & b \\ 3 & 2 & 1 & a & -1 \end{pmatrix} \xrightarrow{r_3+r_2, r_4-3r_1} \begin{pmatrix} 1 & 1 & 1 & 1 & 0 \\ 0 & 1 & 2 & 2 & 1 \\ 0 & 0 & a-1 & 0 & b+1 \\ 0 & -1 & -2 & a-3 & -1 \end{pmatrix}$$

$$\xrightarrow{r_4+r_2} \begin{pmatrix} 1 & 1 & 1 & 1 & 0 \\ 0 & 1 & 2 & 2 & 1 \\ 0 & 0 & a-1 & 0 & b+1 \\ 0 & 0 & 0 & a-1 & 0 \end{pmatrix}$$

**当 $a \neq 1$ 时**：$r(A) = r(A|b) = 4$，唯一解。

**当 $a = 1, b \neq -1$ 时**：$r(A) = 2 \neq r(A|b) = 3$，无解。

**当 $a = 1, b = -1$ 时**：$r(A) = r(A|b) = 2 < 4$，无穷多解。

## 2. 求通解

### 例2

求方程组 $\begin{cases} x_1 - x_2 - x_3 + x_4 = 0 \\ x_1 - x_2 + x_3 - 3x_4 = 1 \\ x_1 - x_2 - 2x_3 + 3x_4 = -\frac{1}{2} \end{cases}$ 的通解。

**解**：

$$(A|b) = \begin{pmatrix} 1 & -1 & -1 & 1 & 0 \\ 1 & -1 & 1 & -3 & 1 \\ 1 & -1 & -2 & 3 & -1/2 \end{pmatrix}$$

$$\xrightarrow{r_2-r_1, r_3-r_1} \begin{pmatrix} 1 & -1 & -1 & 1 & 0 \\ 0 & 0 & 2 & -4 & 1 \\ 0 & 0 & -1 & 2 & -1/2 \end{pmatrix}$$

$$\xrightarrow{r_3+\frac{1}{2}r_2} \begin{pmatrix} 1 & -1 & -1 & 1 & 0 \\ 0 & 0 & 2 & -4 & 1 \\ 0 & 0 & 0 & 0 & 0 \end{pmatrix}$$

$$\xrightarrow{\frac{1}{2}r_2} \begin{pmatrix} 1 & -1 & -1 & 1 & 0 \\ 0 & 0 & 1 & -2 & 1/2 \\ 0 & 0 & 0 & 0 & 0 \end{pmatrix}$$

$$\xrightarrow{r_1+r_2} \begin{pmatrix} 1 & -1 & 0 & -1 & 1/2 \\ 0 & 0 & 1 & -2 & 1/2 \\ 0 & 0 & 0 & 0 & 0 \end{pmatrix}$$

$r(A) = r(A|b) = 2 < 4$，有无穷多解。主变量 $x_1, x_3$，自由变量 $x_2, x_4$。

同解方程组：$\begin{cases} x_1 = x_2 + x_4 + 1/2 \\ x_3 = 2x_4 + 1/2 \end{cases}$

令 $x_2 = x_4 = 0$，特解 $\boldsymbol{\eta}^* = (1/2, 0, 1/2, 0)^T$。

导出组：$\begin{cases} x_1 = x_2 + x_4 \\ x_3 = 2x_4 \end{cases}$

令 $(x_2, x_4) = (1, 0)$：$\boldsymbol{\xi}_1 = (1, 1, 0, 0)^T$

令 $(x_2, x_4) = (0, 1)$：$\boldsymbol{\xi}_2 = (1, 0, 2, 1)^T$

通解：$x = (1/2, 0, 1/2, 0)^T + k_1(1, 1, 0, 0)^T + k_2(1, 0, 2, 1)^T$

## 3. 含参数方程组

### 例3

当 $\lambda$ 为何值时，方程组 $\begin{cases} (1+\lambda)x_1 + x_2 + x_3 = 0 \\ x_1 + (1+\lambda)x_2 + x_3 = 3 \\ x_1 + x_2 + (1+\lambda)x_3 = \lambda \end{cases}$ 有唯一解、无解、无穷多解？

**解**：

$$|A| = \begin{vmatrix} 1+\lambda & 1 & 1 \\ 1 & 1+\lambda & 1 \\ 1 & 1 & 1+\lambda \end{vmatrix} = (\lambda+3)\lambda^2$$

**当 $\lambda \neq 0$ 且 $\lambda \neq -3$ 时**：$|A| \neq 0$，唯一解。

**当 $\lambda = 0$ 时**：

$$(A|b) = \begin{pmatrix} 1 & 1 & 1 & 0 \\ 1 & 1 & 1 & 3 \\ 1 & 1 & 1 & 0 \end{pmatrix} \to \begin{pmatrix} 1 & 1 & 1 & 0 \\ 0 & 0 & 0 & 3 \\ 0 & 0 & 0 & 0 \end{pmatrix}$$

$r(A) = 1 \neq r(A|b) = 2$，无解。

**当 $\lambda = -3$ 时**：

$$(A|b) = \begin{pmatrix} -2 & 1 & 1 & 0 \\ 1 & -2 & 1 & 3 \\ 1 & 1 & -2 & -3 \end{pmatrix} \to \begin{pmatrix} 1 & -2 & 1 & 3 \\ 0 & -3 & 3 & 6 \\ 0 & 0 & 0 & 0 \end{pmatrix}$$

$r(A) = r(A|b) = 2 < 3$，无穷多解。

## 4. 抽象方程组

### 例4

设 $A$ 为 $n$ 阶方阵，$|A| = 0$，$A_{11} \neq 0$，求 $Ax = 0$ 的通解。

**解**：$|A| = 0$ 且 $A_{11} \neq 0$，故 $r(A) = n - 1$。

由 $AA^* = |A|I = O$，$A^*$ 的每一列都是 $Ax = 0$ 的解。

$A^*$ 的第一列为 $(A_{11}, A_{21}, \ldots, A_{n1})^T$，因 $A_{11} \neq 0$，此解非零。

$r(A) = n - 1$，基础解系含 $1$ 个向量。

通解：$x = k(A_{11}, A_{21}, \ldots, A_{n1})^T$（$k$ 为任意常数）。

### 例5

设 $A$ 为 $m \times n$ 矩阵，$r(A) = r$，$\boldsymbol{\eta}^*$ 是 $Ax = b$ 的特解，$\boldsymbol{\xi}_1, \ldots, \boldsymbol{\xi}_{n-r}$ 是 $Ax = 0$ 的基础解系，证明 $\boldsymbol{\eta}^*, \boldsymbol{\eta}^* + \boldsymbol{\xi}_1, \ldots, \boldsymbol{\eta}^* + \boldsymbol{\xi}_{n-r}$ 线性无关。

**证明**：设 $k_0\boldsymbol{\eta}^* + k_1(\boldsymbol{\eta}^* + \boldsymbol{\xi}_1) + \cdots + k_{n-r}(\boldsymbol{\eta}^* + \boldsymbol{\xi}_{n-r}) = 0$

$(k_0 + k_1 + \cdots + k_{n-r})\boldsymbol{\eta}^* + k_1\boldsymbol{\xi}_1 + \cdots + k_{n-r}\boldsymbol{\xi}_{n-r} = 0$

两边乘以 $A$：$(k_0 + k_1 + \cdots + k_{n-r})b = 0$

因 $b \neq 0$，故 $k_0 + k_1 + \cdots + k_{n-r} = 0$。

代入得 $k_1\boldsymbol{\xi}_1 + \cdots + k_{n-r}\boldsymbol{\xi}_{n-r} = 0$。

由 $\boldsymbol{\xi}_1, \ldots, \boldsymbol{\xi}_{n-r}$ 线性无关，$k_1 = \cdots = k_{n-r} = 0$，进而 $k_0 = 0$。

### 例6

设 $A$ 为 $n$ 阶方阵，$\boldsymbol{\alpha}$ 为 $n$ 维非零列向量，$A\boldsymbol{\alpha} = \boldsymbol{\alpha}$，证明 $r(A - I) \leq n - 1$。

**证明**：$A\boldsymbol{\alpha} = \boldsymbol{\alpha}$，即 $(A - I)\boldsymbol{\alpha} = 0$。

$\boldsymbol{\alpha} \neq 0$ 是 $Ax = 0$ 的非零解（其中 $A$ 替换为 $A - I$），故 $|A - I| = 0$，$r(A - I) \leq n - 1$。

## 5. 综合题

### 例7

设 $A = \begin{pmatrix} 1 & 1 & 1 \\ a & b & c \\ a^2 & b^2 & c^2 \end{pmatrix}$，$a, b, c$ 互不相同，求 $Ax = 0$ 的通解。

**解**：$|A|$ 是范德蒙德行列式：

$$|A| = (b-a)(c-a)(c-b) \neq 0$$

故 $r(A) = 3$，$Ax = 0$ 只有零解 $x = 0$。

### 例8

设 $A$ 为 $m \times n$ 矩阵，$B$ 为 $n \times s$ 矩阵，$AB = O$，证明 $B$ 的列向量都是 $Ax = 0$ 的解。

**证明**：设 $B = (\boldsymbol{b}_1, \boldsymbol{b}_2, \ldots, \boldsymbol{b}_s)$，则 $AB = (A\boldsymbol{b}_1, A\boldsymbol{b}_2, \ldots, A\boldsymbol{b}_s) = O$。

故 $A\boldsymbol{b}_j = 0$（$j = 1, 2, \ldots, s$），即 $B$ 的每个列向量都是 $Ax = 0$ 的解。

### 例9

设 $A$ 为 $3$ 阶方阵，$r(A) = 2$，$\boldsymbol{\eta}_1 = (1, 2, 3)^T$，$\boldsymbol{\eta}_2 = (2, 3, 4)^T$ 是 $Ax = b$ 的解，求 $Ax = b$ 的通解。

**解**：$r(A) = 2$，$n = 3$，基础解系含 $1$ 个向量。

$\boldsymbol{\xi} = \boldsymbol{\eta}_2 - \boldsymbol{\eta}_1 = (1, 1, 1)^T$ 是 $Ax = 0$ 的非零解，构成基础解系。

通解：$x = (1, 2, 3)^T + k(1, 1, 1)^T$（$k$ 为任意常数）。

### 例10

设 $A$ 为 $4 \times 3$ 矩阵，$r(A) = 2$，$\boldsymbol{\eta}_1, \boldsymbol{\eta}_2, \boldsymbol{\eta}_3$ 是 $Ax = b$ 的解，$\boldsymbol{\eta}_1 + 2\boldsymbol{\eta}_2 - 3\boldsymbol{\eta}_3 = 0$，求 $Ax = b$ 的通解。

**解**：$r(A) = 2$，$n = 3$，基础解系含 $3 - 2 = 1$ 个向量。

$\boldsymbol{\eta}_2 - \boldsymbol{\eta}_1$ 和 $\boldsymbol{\eta}_3 - \boldsymbol{\eta}_1$ 都是 $Ax = 0$ 的解。

由 $\boldsymbol{\eta}_1 + 2\boldsymbol{\eta}_2 - 3\boldsymbol{\eta}_3 = 0$，得 $\boldsymbol{\eta}_1 = 3\boldsymbol{\eta}_3 - 2\boldsymbol{\eta}_2$。

$\boldsymbol{\eta}_2 - \boldsymbol{\eta}_1 = \boldsymbol{\eta}_2 - 3\boldsymbol{\eta}_3 + 2\boldsymbol{\eta}_2 = 3\boldsymbol{\eta}_2 - 3\boldsymbol{\eta}_3 = -3(\boldsymbol{\eta}_3 - \boldsymbol{\eta}_2)$

只需取 $\boldsymbol{\xi} = \boldsymbol{\eta}_2 - \boldsymbol{\eta}_1$（若非零）。

通解：$x = \boldsymbol{\eta}_1 + k(\boldsymbol{\eta}_2 - \boldsymbol{\eta}_1)$（$k$ 为任意常数）。
