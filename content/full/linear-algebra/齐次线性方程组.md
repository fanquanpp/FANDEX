---
order: 32
title: 齐次线性方程组
module: 'linear-algebra'
category: 'comp-sci'
difficulty: intermediate
description: 齐次线性方程组的性质，基础解系的概念与求法，解空间的维数定理，齐次方程组的通解。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'linear-algebra/高斯消元法'
  - 'linear-algebra/解的存在性判定'
  - 'linear-algebra/非齐次线性方程组'
  - 'linear-algebra/解的结构'
prerequisites:
  - 'linear-algebra/行列式定义与几何意义'
---

## 1. 齐次线性方程组的基本性质

### 1.1 定义

齐次线性方程组的形式为 $Ax = 0$，即：

$$\begin{cases} a_{11}x_1 + a_{12}x_2 + \cdots + a_{1n}x_n = 0 \\ a_{21}x_1 + a_{22}x_2 + \cdots + a_{2n}x_n = 0 \\ \cdots \\ a_{m1}x_1 + a_{m2}x_2 + \cdots + a_{mn}x_n = 0 \end{cases}$$

### 1.2 基本性质

1. **零解**：$x = 0$ 一定是齐次方程组的解
2. **解的线性组合**：若 $x_1, x_2$ 是 $Ax = 0$ 的解，则 $k_1x_1 + k_2x_2$ 也是解（$k_1, k_2$ 为任意常数）
3. **解集构成向量空间**：$Ax = 0$ 的全体解构成 $\mathbb{R}^n$ 的一个子空间，称为**解空间**或**零空间** $N(A)$

### 1.3 非零解的存在条件

$$Ax = 0 \text{ 有非零解} \iff r(A) < n$$

特别地，当 $m < n$ 时，$Ax = 0$ 一定有非零解。

## 2. 基础解系

### 2.1 定义

齐次方程组 $Ax = 0$ 的解向量 $\boldsymbol{\xi}_1, \boldsymbol{\xi}_2, \ldots, \boldsymbol{\xi}_t$ 称为**基础解系**，若：

1. $\boldsymbol{\xi}_1, \boldsymbol{\xi}_2, \ldots, \boldsymbol{\xi}_t$ 线性无关
2. $Ax = 0$ 的任意解都可以由 $\boldsymbol{\xi}_1, \boldsymbol{\xi}_2, \ldots, \boldsymbol{\xi}_t$ 线性表示

基础解系就是解空间的一组**基**。

### 2.2 基础解系所含向量的个数

$$t = n - r(A)$$

即基础解系所含向量的个数等于未知量的个数减去系数矩阵的秩。

### 2.3 维数定理

$$\dim(N(A)) = n - r(A)$$

解空间的维数等于自由变量的个数。

## 3. 基础解系的求法

### 3.1 步骤

1. 将系数矩阵 $A$ 化为行最简形
2. 确定主变量（主元对应的未知量）和自由变量（非主元对应的未知量）
3. 令自由变量依次取 $(1,0,\ldots,0)^T$，$(0,1,\ldots,0)^T$，...，$(0,0,\ldots,1)^T$
4. 回代求出主变量的值，得到基础解系

### 3.2 示例

求 $Ax = 0$ 的基础解系，其中 $A = \begin{pmatrix} 1 & 2 & 3 & 1 \\ 2 & 4 & 6 & 2 \\ 1 & 2 & 1 & 1 \end{pmatrix}$

**步骤1**：化行最简形

$$A \xrightarrow{r_2 - 2r_1, r_3 - r_1} \begin{pmatrix} 1 & 2 & 3 & 1 \\ 0 & 0 & 0 & 0 \\ 0 & 0 & -2 & 0 \end{pmatrix} \xrightarrow{r_2 \leftrightarrow r_3} \begin{pmatrix} 1 & 2 & 3 & 1 \\ 0 & 0 & -2 & 0 \\ 0 & 0 & 0 & 0 \end{pmatrix}$$

$$\xrightarrow{-\frac{1}{2}r_2} \begin{pmatrix} 1 & 2 & 3 & 1 \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 0 \end{pmatrix} \xrightarrow{r_1 - 3r_2} \begin{pmatrix} 1 & 2 & 0 & 1 \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 0 \end{pmatrix}$$

**步骤2**：$r(A) = 2$，主变量为 $x_1, x_3$，自由变量为 $x_2, x_4$。

**步骤3**：基础解系含 $4 - 2 = 2$ 个向量。

令 $(x_2, x_4) = (1, 0)$：$x_3 = 0$，$x_1 = -2$，得 $\boldsymbol{\xi}_1 = (-2, 1, 0, 0)^T$

令 $(x_2, x_4) = (0, 1)$：$x_3 = 0$，$x_1 = -1$，得 $\boldsymbol{\xi}_2 = (-1, 0, 0, 1)^T$

**步骤4**：基础解系为 $\boldsymbol{\xi}_1 = (-2, 1, 0, 0)^T$，$\boldsymbol{\xi}_2 = (-1, 0, 0, 1)^T$。

### 3.3 通解

$$x = k_1\boldsymbol{\xi}_1 + k_2\boldsymbol{\xi}_2 \quad (k_1, k_2 \text{ 为任意常数})$$

## 4. 基础解系的性质

### 4.1 唯一性

基础解系不唯一，但任意两个基础解系所含向量个数相同，且它们等价（可以互相线性表示）。

### 4.2 判定基础解系的方法

设 $\boldsymbol{\xi}_1, \boldsymbol{\xi}_2, \ldots, \boldsymbol{\xi}_t$ 都是 $Ax = 0$ 的解，则它们构成基础解系当且仅当：

1. 它们线性无关
2. $t = n - r(A)$

**注意**：条件2可以用"它们线性无关"替代"它们线性无关且 $t = n - r(A)$"——只要验证线性无关且个数正确即可。

### 4.3 基础解系的线性变换

若 $\boldsymbol{\xi}_1, \ldots, \boldsymbol{\xi}_t$ 是基础解系，$C$ 为 $t$ 阶可逆矩阵，则 $(\boldsymbol{\xi}_1, \ldots, \boldsymbol{\xi}_t)C$ 的列向量也是基础解系。

## 5. 解空间的结构

### 5.1 解空间的维数

$$\dim(N(A)) = n - r(A)$$

### 5.2 解空间与列空间的关系

$$\mathbb{R}^n = \text{Row}(A) \oplus N(A)$$

行空间与零空间互为正交补（在标准内积下）。

### 5.3 解空间的基变换

设 $B_1 = \{\boldsymbol{\xi}_1, \ldots, \boldsymbol{\xi}_t\}$ 和 $B_2 = \{\boldsymbol{\eta}_1, \ldots, \boldsymbol{\eta}_t\}$ 是两组基础解系，则存在可逆矩阵 $P$ 使得：

$$(\boldsymbol{\eta}_1, \ldots, \boldsymbol{\eta}_t) = (\boldsymbol{\xi}_1, \ldots, \boldsymbol{\xi}_t)P$$

## 6. 典型例题

### 例1

设 $A$ 为 $m \times n$ 矩阵，$r(A) = r$，证明 $Ax = 0$ 的基础解系含 $n - r$ 个向量。

**证明**：将 $A$ 化为行最简形，有 $r$ 个主元，$n - r$ 个自由变量。每个自由变量对应一个解向量，共 $n - r$ 个，它们线性无关且任意解可由它们表示。

### 例2

设 $A$ 为 $n$ 阶方阵，$|A| = 0$，$A_{11} \neq 0$（$A_{11}$ 为 $a_{11}$ 的代数余子式），求 $Ax = 0$ 的通解。

**解**：$|A| = 0$ 且 $A_{11} \neq 0$，故 $r(A) = n - 1$，基础解系含 $1$ 个向量。

由 $AA^* = |A|I = O$，$A^*$ 的第一列 $(A_{11}, A_{21}, \ldots, A_{n1})^T$ 是 $Ax = 0$ 的解。

又 $A_{11} \neq 0$，故该解非零，可作为基础解系。

通解：$x = k(A_{11}, A_{21}, \ldots, A_{n1})^T$（$k$ 为任意常数）。

### 例3

设 $A$ 为 $n$ 阶方阵，$A^2 = A$，$r(A) = r$，求 $Ax = 0$ 的基础解系所含向量的个数。

**解**：$Ax = 0$ 的基础解系含 $n - r(A) = n - r$ 个向量。
