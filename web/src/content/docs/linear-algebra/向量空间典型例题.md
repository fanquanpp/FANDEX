---
order: 45
title: 向量空间典型例题
module: 'linear-algebra'
category: 'comp-sci'
difficulty: intermediate
description: 向量空间相关典型例题集锦，涵盖线性相关性判定、秩的计算、正交化、基与维数等题型。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'linear-algebra/内积与正交性'
  - 'linear-algebra/施密特正交化'
  - 'linear-algebra/特征值与特征向量计算'
  - 'linear-algebra/特征值性质'
prerequisites:
  - 'linear-algebra/行列式定义与几何意义'
---

## 1. 线性相关性

### 例1

设 $\boldsymbol{\alpha}_1, \boldsymbol{\alpha}_2, \boldsymbol{\alpha}_3$ 线性无关，判断 $k$ 为何值时，$\boldsymbol{\alpha}_2 - \boldsymbol{\alpha}_1$，$k\boldsymbol{\alpha}_3 - \boldsymbol{\alpha}_2$，$\boldsymbol{\alpha}_1 - \boldsymbol{\alpha}_3$ 线性相关。

**解**：设 $x_1(\boldsymbol{\alpha}_2 - \boldsymbol{\alpha}_1) + x_2(k\boldsymbol{\alpha}_3 - \boldsymbol{\alpha}_2) + x_3(\boldsymbol{\alpha}_1 - \boldsymbol{\alpha}_3) = 0$

整理：$(-x_1 + x_3)\boldsymbol{\alpha}_1 + (x_1 - x_2)\boldsymbol{\alpha}_2 + (kx_2 - x_3)\boldsymbol{\alpha}_3 = 0$

由 $\boldsymbol{\alpha}_1, \boldsymbol{\alpha}_2, \boldsymbol{\alpha}_3$ 线性无关：

$$\begin{cases} -x_1 + x_3 = 0 \\ x_1 - x_2 = 0 \\ kx_2 - x_3 = 0 \end{cases}$$

系数行列式 $\begin{vmatrix} -1 & 0 & 1 \\ 1 & -1 & 0 \\ 0 & k & -1 \end{vmatrix} = 1 - k$

当 $k = 1$ 时，行列式为零，有非零解，线性相关。

### 例2

设 $A$ 为 $n$ 阶方阵，$\boldsymbol{\alpha}$ 为 $n$ 维非零列向量，$\boldsymbol{\alpha}, A\boldsymbol{\alpha}, A^2\boldsymbol{\alpha}$ 线性无关，$A^3\boldsymbol{\alpha} = 3A\boldsymbol{\alpha} - 2A^2\boldsymbol{\alpha}$，求 $|A + I|$。

**解**：由 $A^3\boldsymbol{\alpha} = 3A\boldsymbol{\alpha} - 2A^2\boldsymbol{\alpha}$，即 $(A^3 + 2A^2 - 3A)\boldsymbol{\alpha} = 0$，$A(A^2 + 2A - 3I)\boldsymbol{\alpha} = 0$，$A(A + 3I)(A - I)\boldsymbol{\alpha} = 0$。

在基 $\boldsymbol{\alpha}, A\boldsymbol{\alpha}, A^2\boldsymbol{\alpha}$ 下，$A$ 的表示矩阵为：

$$B = \begin{pmatrix} 0 & 0 & 0 \\ 1 & 0 & 3 \\ 0 & 1 & -2 \end{pmatrix}$$

$|A + I| = |B + I| = \begin{vmatrix} 1 & 0 & 0 \\ 1 & 1 & 3 \\ 0 & 1 & -1 \end{vmatrix} = -1 - 3 = -4$

## 2. 向量组的秩

### 例3

设 $\boldsymbol{\alpha}_1 = (1, 2, -1)^T$，$\boldsymbol{\alpha}_2 = (2, 4, \lambda)^T$，$\boldsymbol{\alpha}_3 = (1, \lambda, 1)^T$，求 $\boldsymbol{\alpha}_1, \boldsymbol{\alpha}_2, \boldsymbol{\alpha}_3$ 的秩。

**解**：

$$A = \begin{pmatrix} 1 & 2 & 1 \\ 2 & 4 & \lambda \\ -1 & \lambda & 1 \end{pmatrix}$$

$$\xrightarrow{r_2-2r_1, r_3+r_1} \begin{pmatrix} 1 & 2 & 1 \\ 0 & 0 & \lambda-2 \\ 0 & \lambda+2 & 2 \end{pmatrix}$$

**当 $\lambda \neq 2$ 且 $\lambda \neq -2$ 时**：$r(A) = 3$

**当 $\lambda = 2$ 时**：$\begin{pmatrix} 1 & 2 & 1 \\ 0 & 0 & 0 \\ 0 & 4 & 2 \end{pmatrix}$，$r(A) = 2$

**当 $\lambda = -2$ 时**：$\begin{pmatrix} 1 & 2 & 1 \\ 0 & 0 & -4 \\ 0 & 0 & 2 \end{pmatrix}$，$r(A) = 2$

### 例4

设 $r(A) = r$，$A\boldsymbol{\alpha}_1 = A\boldsymbol{\alpha}_2 = A\boldsymbol{\alpha}_3 = \boldsymbol{b}$（$\boldsymbol{\alpha}_1, \boldsymbol{\alpha}_2, \boldsymbol{\alpha}_3$ 互不相同），求 $r(\boldsymbol{\alpha}_1 - \boldsymbol{\alpha}_2, \boldsymbol{\alpha}_1 - \boldsymbol{\alpha}_3)$。

**解**：$A(\boldsymbol{\alpha}_1 - \boldsymbol{\alpha}_2) = 0$，$A(\boldsymbol{\alpha}_1 - \boldsymbol{\alpha}_3) = 0$。

$\boldsymbol{\alpha}_1 - \boldsymbol{\alpha}_2$ 和 $\boldsymbol{\alpha}_1 - \boldsymbol{\alpha}_3$ 都是 $Ax = 0$ 的解，且 $\boldsymbol{\alpha}_1 - \boldsymbol{\alpha}_2 \neq 0$。

若 $\boldsymbol{\alpha}_1 - \boldsymbol{\alpha}_2$ 与 $\boldsymbol{\alpha}_1 - \boldsymbol{\alpha}_3$ 线性相关，则 $\boldsymbol{\alpha}_1 - \boldsymbol{\alpha}_3 = k(\boldsymbol{\alpha}_1 - \boldsymbol{\alpha}_2)$，即 $(1-k)\boldsymbol{\alpha}_1 + k\boldsymbol{\alpha}_2 - \boldsymbol{\alpha}_3 = 0$。这取决于具体条件。

一般地，$r(\boldsymbol{\alpha}_1 - \boldsymbol{\alpha}_2, \boldsymbol{\alpha}_1 - \boldsymbol{\alpha}_3) \leq 2$，且至少为 $1$。

## 3. 正交化

### 例5

对 $\boldsymbol{\alpha}_1 = (1, 1, 1)^T$，$\boldsymbol{\alpha}_2 = (1, 0, 1)^T$，$\boldsymbol{\alpha}_3 = (0, 1, 1)^T$ 进行施密特正交化。

**解**：

$\boldsymbol{\beta}_1 = \boldsymbol{\alpha}_1 = (1, 1, 1)^T$

$\boldsymbol{\beta}_2 = \boldsymbol{\alpha}_2 - \frac{(\boldsymbol{\alpha}_2, \boldsymbol{\beta}_1)}{(\boldsymbol{\beta}_1, \boldsymbol{\beta}_1)}\boldsymbol{\beta}_1 = (1, 0, 1)^T - \frac{2}{3}(1, 1, 1)^T = \left(\frac{1}{3}, -\frac{2}{3}, \frac{1}{3}\right)^T$

$\boldsymbol{\beta}_3 = \boldsymbol{\alpha}_3 - \frac{(\boldsymbol{\alpha}_3, \boldsymbol{\beta}_1)}{(\boldsymbol{\beta}_1, \boldsymbol{\beta}_1)}\boldsymbol{\beta}_1 - \frac{(\boldsymbol{\alpha}_3, \boldsymbol{\beta}_2)}{(\boldsymbol{\beta}_2, \boldsymbol{\beta}_2)}\boldsymbol{\beta}_2$

$(\boldsymbol{\alpha}_3, \boldsymbol{\beta}_1) = 2$，$(\boldsymbol{\alpha}_3, \boldsymbol{\beta}_2) = -\frac{2}{3} + \frac{1}{3} = -\frac{1}{3}$

$(\boldsymbol{\beta}_2, \boldsymbol{\beta}_2) = \frac{1}{9} + \frac{4}{9} + \frac{1}{9} = \frac{2}{3}$

$\boldsymbol{\beta}_3 = (0, 1, 1)^T - \frac{2}{3}(1, 1, 1)^T - \frac{-1/3}{2/3}\left(\frac{1}{3}, -\frac{2}{3}, \frac{1}{3}\right)^T$

$= (0, 1, 1)^T - \left(\frac{2}{3}, \frac{2}{3}, \frac{2}{3}\right)^T + \left(\frac{1}{6}, -\frac{1}{3}, \frac{1}{6}\right)^T = \left(-\frac{1}{2}, 0, \frac{1}{2}\right)^T$

单位化：

$\boldsymbol{e}_1 = \frac{1}{\sqrt{3}}(1, 1, 1)^T$，$\boldsymbol{e}_2 = \frac{1}{\sqrt{6}}(1, -2, 1)^T$，$\boldsymbol{e}_3 = \frac{1}{\sqrt{2}}(-1, 0, 1)^T$

## 4. 基与维数

### 例6

求矩阵 $A = \begin{pmatrix} 1 & 2 & 3 & 4 \\ 2 & 4 & 6 & 8 \\ 1 & 1 & 1 & 1 \end{pmatrix}$ 的零空间 $N(A)$ 的基和维数。

**解**：

$$A \to \begin{pmatrix} 1 & 2 & 3 & 4 \\ 0 & 0 & 0 & 0 \\ 0 & -1 & -2 & -3 \end{pmatrix} \to \begin{pmatrix} 1 & 0 & -1 & -2 \\ 0 & 1 & 2 & 3 \\ 0 & 0 & 0 & 0 \end{pmatrix}$$

$r(A) = 2$，$\dim(N(A)) = 4 - 2 = 2$。

同解方程组：$\begin{cases} x_1 = x_3 + 2x_4 \\ x_2 = -2x_3 - 3x_4 \end{cases}$

基础解系：$\boldsymbol{\xi}_1 = (1, -2, 1, 0)^T$，$\boldsymbol{\xi}_2 = (2, -3, 0, 1)^T$

### 例7

设 $V = \{(x_1, x_2, x_3)^T \mid x_1 + x_2 + x_3 = 0\}$，求 $V$ 的基和维数。

**解**：$V$ 是 $Ax = 0$ 的解空间，其中 $A = (1, 1, 1)$。

$r(A) = 1$，$\dim(V) = 3 - 1 = 2$。

基础解系：$\boldsymbol{\xi}_1 = (-1, 1, 0)^T$，$\boldsymbol{\xi}_2 = (-1, 0, 1)^T$

### 例8

证明 $\mathbb{R}^n$ 中任意 $n$ 个线性无关的向量构成 $\mathbb{R}^n$ 的一组基。

**证明**：设 $\boldsymbol{\alpha}_1, \ldots, \boldsymbol{\alpha}_n$ 线性无关，对任意 $\boldsymbol{\beta} \in \mathbb{R}^n$，$\boldsymbol{\alpha}_1, \ldots, \boldsymbol{\alpha}_n, \boldsymbol{\beta}$ 是 $n+1$ 个 $n$ 维向量，必线性相关。

故存在不全为零的 $k_1, \ldots, k_n, k_{n+1}$ 使得 $k_1\boldsymbol{\alpha}_1 + \cdots + k_n\boldsymbol{\alpha}_n + k_{n+1}\boldsymbol{\beta} = 0$。

若 $k_{n+1} = 0$，则 $k_1\boldsymbol{\alpha}_1 + \cdots + k_n\boldsymbol{\alpha}_n = 0$，由线性无关得 $k_1 = \cdots = k_n = 0$，矛盾。

故 $k_{n+1} \neq 0$，$\boldsymbol{\beta}$ 可由 $\boldsymbol{\alpha}_1, \ldots, \boldsymbol{\alpha}_n$ 线性表示。

## 5. 正交矩阵

### 例9

设 $A$ 为 $n$ 阶正交矩阵，$|A| = 1$，$n$ 为奇数，证明 $|A - I| = 0$。

**证明**：

$|A - I| = |A - AA^T| = |A(I - A^T)| = |A| \cdot |I - A^T| = |I - A^T|$

$= |(I - A)^T| = |I - A| = |-(A - I)| = (-1)^n|A - I| = -|A - I|$

（$n$ 为奇数时 $(-1)^n = -1$）

故 $2|A - I| = 0$，$|A - I| = 0$。

### 例10

设 $A$ 为三阶正交矩阵，$|A| = 1$，$\boldsymbol{\alpha} = (1, 0, 0)^T$，$A\boldsymbol{\alpha} = (0, 1, 0)^T$，求 $A$。

**解**：$A$ 的第一列为 $(0, 1, 0)^T$。

设 $A = \begin{pmatrix} 0 & a & d \\ 1 & b & e \\ 0 & c & f \end{pmatrix}$

由 $A^TA = I$：第一列与第二列正交：$b = 0$；第二列与第三列正交：$ad + be + cf = ad + cf = 0$；第二列单位：$a^2 + c^2 = 1$；第三列单位：$d^2 + e^2 + f^2 = 1$。

由 $|A| = 1$：$|A| = -a f + c d = 1$（展开第一列）

第一行单位：$a^2 + d^2 = 1$，第三行单位：$c^2 + f^2 = 1$。

结合 $a^2 + c^2 = 1$ 和 $a^2 + d^2 = 1$，得 $c^2 = d^2$。

设 $a = \cos\theta$，$c = \sin\theta$，则 $d = \pm\sin\theta$，$f = \mp\cos\theta$。

由 $-af + cd = \cos\theta \cdot \cos\theta + \sin\theta \cdot \sin\theta = 1$（取 $d = -\sin\theta, f = \cos\theta$ 时）

或 $-\cos\theta \cdot (-\cos\theta) + \sin\theta \cdot \sin\theta = \cos^2\theta + \sin^2\theta = 1$（取 $d = \sin\theta, f = -\cos\theta$ 时）

还需满足 $ad + cf = 0$：$\cos\theta \cdot d + \sin\theta \cdot f = 0$。

取 $d = -\sin\theta, f = \cos\theta$：$-\cos\theta\sin\theta + \sin\theta\cos\theta = 0$

$e$ 由第三列单位确定：$\sin^2\theta + e^2 + \cos^2\theta = 1$，$e = 0$。

$$A = \begin{pmatrix} 0 & \cos\theta & -\sin\theta \\ 1 & 0 & 0 \\ 0 & \sin\theta & \cos\theta \end{pmatrix}$$

其中 $\theta$ 为任意角度。
