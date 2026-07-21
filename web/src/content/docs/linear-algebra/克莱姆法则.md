---
order: 14
title: 克莱姆法则
module: 'linear-algebra'
category: 'comp-sci'
difficulty: intermediate
description: Cramer法则的表述与证明，用行列式求解线性方程组的方法，克莱姆法则的适用条件与局限性。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'linear-algebra/行列式按行列展开'
  - 'linear-algebra/行列式计算方法'
  - 'linear-algebra/行列式典型例题'
  - 'linear-algebra/矩阵运算'
prerequisites: []
---

## 1. 克莱姆法则的表述

### 1.1 定理内容

设含有 $n$ 个未知量 $n$ 个方程的线性方程组：

$$\begin{cases} a_{11}x_1 + a_{12}x_2 + \cdots + a_{1n}x_n = b_1 \\ a_{21}x_1 + a_{22}x_2 + \cdots + a_{2n}x_n = b_2 \\ \cdots \\ a_{n1}x_1 + a_{n2}x_2 + \cdots + a_{nn}x_n = b_n \end{cases}$$

记系数行列式为：

$$D = \begin{vmatrix} a_{11} & a_{12} & \cdots & a_{1n} \\ a_{21} & a_{22} & \cdots & a_{2n} \\ \vdots & \vdots & \ddots & \vdots \\ a_{n1} & a_{n2} & \cdots & a_{nn} \end{vmatrix}$$

若 $D \neq 0$，则方程组有唯一解：

$$x_j = \frac{D_j}{D}, \quad j = 1, 2, \ldots, n$$

其中 $D_j$ 是将 $D$ 中第 $j$ 列替换为常数列 $(b_1, b_2, \ldots, b_n)^T$ 后得到的行列式：

$$D_j = \begin{vmatrix} a_{11} & \cdots & a_{1,j-1} & b_1 & a_{1,j+1} & \cdots & a_{1n} \\ a_{21} & \cdots & a_{2,j-1} & b_2 & a_{2,j+1} & \cdots & a_{2n} \\ \vdots & & \vdots & \vdots & \vdots & & \vdots \\ a_{n1} & \cdots & a_{n,j-1} & b_n & a_{n,j+1} & \cdots & a_{nn} \end{vmatrix}$$

### 1.2 矩阵形式

方程组可写为 $Ax = b$，其中 $A = (a_{ij})_{n \times n}$，$x = (x_1, \ldots, x_n)^T$，$b = (b_1, \ldots, b_n)^T$。

当 $|A| \neq 0$ 时，$x = A^{-1}b$，克莱姆法则给出了 $x_j$ 的显式表达式。

## 2. 克莱姆法则的证明

### 2.1 存在性

将 $x_j = \dfrac{D_j}{D}$ 代入第 $i$ 个方程：

$$\sum_{j=1}^{n} a_{ij} \frac{D_j}{D} = \frac{1}{D} \sum_{j=1}^{n} a_{ij} D_j$$

由行列式展开定理，$D_j$ 按第 $j$ 列展开：

$$D_j = b_1 A_{1j} + b_2 A_{2j} + \cdots + b_n A_{nj} = \sum_{k=1}^{n} b_k A_{kj}$$

因此：

$$\sum_{j=1}^{n} a_{ij} D_j = \sum_{j=1}^{n} a_{ij} \sum_{k=1}^{n} b_k A_{kj} = \sum_{k=1}^{n} b_k \sum_{j=1}^{n} a_{ij} A_{kj}$$

由代数余子式的性质：

$$\sum_{j=1}^{n} a_{ij} A_{kj} = \begin{cases} D, & i = k \\ 0, & i \neq k \end{cases}$$

故：

$$\sum_{j=1}^{n} a_{ij} D_j = b_i \cdot D$$

所以 $\dfrac{1}{D} \sum_{j=1}^{n} a_{ij} D_j = b_i$，验证了解的正确性。

### 2.2 唯一性

设 $x_1^*, x_2^*, \ldots, x_n^*$ 也是方程组的解，则：

$$\sum_{j=1}^{n} a_{ij} x_j^* = b_i, \quad i = 1, 2, \ldots, n$$

两边乘以 $A_{ik}$ 并对 $i$ 求和：

$$\sum_{i=1}^{n} A_{ik} \sum_{j=1}^{n} a_{ij} x_j^* = \sum_{i=1}^{n} b_i A_{ik} = D_k$$

左边：

$$\sum_{j=1}^{n} x_j^* \sum_{i=1}^{n} a_{ij} A_{ik} = x_k^* \cdot D$$

故 $x_k^* = \dfrac{D_k}{D}$，解唯一。

## 3. 齐次线性方程组的情形

### 3.1 推论

对于齐次线性方程组 $Ax = 0$：

- 若 $|A| \neq 0$，则方程组只有零解 $x = 0$
- 若方程组有非零解，则 $|A| = 0$

### 3.2 逆否命题

$$|A| = 0 \iff \text{齐次方程组有非零解}$$

这是判断齐次方程组是否有非零解的重要方法。

## 4. 克莱姆法则的应用

### 4.1 求解线性方程组

**示例**：解方程组 $\begin{cases} 2x_1 + x_2 = 5 \\ x_1 + 3x_2 = 10 \end{cases}$

$$D = \begin{vmatrix} 2 & 1 \\ 1 & 3 \end{vmatrix} = 5, \quad D_1 = \begin{vmatrix} 5 & 1 \\ 10 & 3 \end{vmatrix} = 5, \quad D_2 = \begin{vmatrix} 2 & 5 \\ 1 & 10 \end{vmatrix} = 15$$

$$x_1 = \frac{5}{5} = 1, \quad x_2 = \frac{15}{5} = 3$$

### 4.2 判断解的存在性与唯一性

**示例**：判断方程组 $\begin{cases} x_1 + x_2 + x_3 = 1 \\ 2x_1 + 3x_2 + x_3 = 2 \\ x_1 - x_2 + 3x_3 = 0 \end{cases}$ 是否有唯一解。

$$D = \begin{vmatrix} 1 & 1 & 1 \\ 2 & 3 & 1 \\ 1 & -1 & 3 \end{vmatrix} = \begin{vmatrix} 1 & 1 & 1 \\ 0 & 1 & -1 \\ 0 & -2 & 2 \end{vmatrix} = \begin{vmatrix} 1 & 1 & 1 \\ 0 & 1 & -1 \\ 0 & 0 & 0 \end{vmatrix} = 0$$

$D = 0$，克莱姆法则不适用，方程组无唯一解。

### 4.3 含参数的方程组

**示例**：当 $\lambda$ 为何值时，方程组 $\begin{cases} \lambda x_1 + x_2 + x_3 = 0 \\ x_1 + \lambda x_2 + x_3 = 0 \\ x_1 + x_2 + \lambda x_3 = 0 \end{cases}$ 有非零解？

齐次方程组有非零解的充要条件是 $D = 0$：

$$D = \begin{vmatrix} \lambda & 1 & 1 \\ 1 & \lambda & 1 \\ 1 & 1 & \lambda \end{vmatrix} = (\lambda - 1)^2(\lambda + 2) = 0$$

故 $\lambda = 1$ 或 $\lambda = -2$ 时方程组有非零解。

## 5. 克莱姆法则的局限性

### 5.1 计算量问题

克莱姆法则需要计算 $n+1$ 个 $n$ 阶行列式，计算量为 $O(n \cdot n!)$，对于大规模方程组效率极低。实际计算中，高斯消元法（$O(n^3)$）更为高效。

### 5.2 适用范围

- 仅适用于**方程个数等于未知量个数**的方程组
- 要求系数行列式 $D \neq 0$
- 对于 $D = 0$ 或方程个数与未知量个数不等的情况，克莱姆法则无法直接应用

### 5.3 理论价值

尽管实际计算中较少使用，克莱姆法则具有重要的理论价值：

1. 给出了解的**显式表达式**，便于理论分析
2. 揭示了解与系数和常数项之间的关系
3. 证明了当 $|A| \neq 0$ 时解的存在性与唯一性
4. 在参数分析、灵敏度分析中有应用
