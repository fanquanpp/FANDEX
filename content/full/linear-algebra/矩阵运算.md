---
order: 20
title: 矩阵运算
module: 'linear-algebra'
category: 'comp-sci'
difficulty: beginner
description: 矩阵的加法、减法、乘法运算，矩阵的转置，方阵的幂，矩阵运算的性质与法则。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'linear-algebra/克莱姆法则'
  - 'linear-algebra/行列式典型例题'
  - 'linear-algebra/逆矩阵'
  - 'linear-algebra/初等变换与初等矩阵'
prerequisites: []
---

## 1. 矩阵的基本概念

### 1.1 矩阵的定义

由 $m \times n$ 个数 $a_{ij}$ 排成的 $m$ 行 $n$ 列的数表称为 $m \times n$ **矩阵**，记作：

$$A = \begin{pmatrix} a_{11} & a_{12} & \cdots & a_{1n} \\ a_{21} & a_{22} & \cdots & a_{2n} \\ \vdots & \vdots & \ddots & \vdots \\ a_{m1} & a_{m2} & \cdots & a_{mn} \end{pmatrix} = (a_{ij})_{m \times n}$$

### 1.2 特殊矩阵

- **零矩阵**：所有元素为零的矩阵，记作 $O$
- **单位矩阵**：主对角线为1，其余为0的方阵，记作 $I$ 或 $E$
- **对角矩阵**：非主对角线元素全为零的方阵，记作 $\text{diag}(d_1, d_2, \ldots, d_n)$
- **数量矩阵**：$kI$（$k$ 为常数）
- **三角矩阵**：上三角矩阵、下三角矩阵

## 2. 矩阵的加法

### 2.1 定义

设 $A = (a_{ij})_{m \times n}$，$B = (b_{ij})_{m \times n}$，则：

$$A + B = (a_{ij} + b_{ij})_{m \times n}$$

**注意**：只有同型矩阵（行数和列数分别相同）才能相加。

### 2.2 运算律

1. **交换律**：$A + B = B + A$
2. **结合律**：$(A + B) + C = A + (B + C)$
3. **零矩阵**：$A + O = A$
4. **负矩阵**：$A + (-A) = O$，其中 $-A = (-a_{ij})$

## 3. 矩阵的数乘

### 3.1 定义

设 $A = (a_{ij})_{m \times n}$，$k$ 为常数，则：

$$kA = (ka_{ij})_{m \times n}$$

### 3.2 运算律

1. $k(A + B) = kA + kB$
2. $(k + l)A = kA + lA$
3. $(kl)A = k(lA)$
4. $1 \cdot A = A$

## 4. 矩阵的乘法

### 4.1 定义

设 $A = (a_{ij})_{m \times s}$，$B = (b_{ij})_{s \times n}$，则乘积 $AB = (c_{ij})_{m \times n}$，其中：

$$c_{ij} = \sum_{k=1}^{s} a_{ik}b_{kj} = a_{i1}b_{1j} + a_{i2}b_{2j} + \cdots + a_{is}b_{sj}$$

**关键**：$A$ 的列数必须等于 $B$ 的行数才能相乘。

### 4.2 运算律

1. **结合律**：$(AB)C = A(BC)$
2. **分配律**：$A(B + C) = AB + AC$，$(A + B)C = AC + BC$
3. **数乘结合**：$k(AB) = (kA)B = A(kB)$
4. **单位矩阵**：$AI = IA = A$

### 4.3 矩阵乘法不满足的运算律

**1. 交换律一般不成立**：$AB \neq BA$（一般情况下）

- $AB$ 有意义时 $BA$ 未必有意义
- 即使 $AB$ 和 $BA$ 都有意义，它们也未必同型
- 即使同型，$AB$ 和 $BA$ 也未必相等

**2. 消去律不成立**：

- $AB = AC$ 且 $A \neq O$，不能推出 $B = C$
- $AB = O$，不能推出 $A = O$ 或 $B = O$

**示例**：设 $A = \begin{pmatrix} 1 & 1 \\ 1 & 1 \end{pmatrix}$，$B = \begin{pmatrix} 1 & -1 \\ -1 & 1 \end{pmatrix}$，则 $AB = O$，但 $A \neq O$，$B \neq O$。

### 4.4 乘法示例

设 $A = \begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}$，$B = \begin{pmatrix} 5 & 6 \\ 7 & 8 \end{pmatrix}$，则：

$$AB = \begin{pmatrix} 1 \times 5 + 2 \times 7 & 1 \times 6 + 2 \times 8 \\ 3 \times 5 + 4 \times 7 & 3 \times 6 + 4 \times 8 \end{pmatrix} = \begin{pmatrix} 19 & 22 \\ 43 & 50 \end{pmatrix}$$

$$BA = \begin{pmatrix} 5 \times 1 + 6 \times 3 & 5 \times 2 + 6 \times 4 \\ 7 \times 1 + 8 \times 3 & 7 \times 2 + 8 \times 4 \end{pmatrix} = \begin{pmatrix} 23 & 34 \\ 31 & 46 \end{pmatrix}$$

可见 $AB \neq BA$。

## 5. 矩阵的转置

### 5.1 定义

设 $A = (a_{ij})_{m \times n}$，则 $A$ 的**转置** $A^T = (a_{ji})_{n \times m}$，即将 $A$ 的行与列互换。

$$A = \begin{pmatrix} a_{11} & a_{12} \\ a_{21} & a_{22} \\ a_{31} & a_{32} \end{pmatrix} \Rightarrow A^T = \begin{pmatrix} a_{11} & a_{21} & a_{31} \\ a_{12} & a_{22} & a_{32} \end{pmatrix}$$

### 5.2 运算律

1. $(A^T)^T = A$
2. $(A + B)^T = A^T + B^T$
3. $(kA)^T = kA^T$
4. $(AB)^T = B^T A^T$（**注意顺序反转**）

### 5.3 特殊矩阵

- **对称矩阵**：$A^T = A$，即 $a_{ij} = a_{ji}$
- **反对称矩阵**：$A^T = -A$，即 $a_{ij} = -a_{ji}$（主对角线元素为零）

**性质**：

- 任意方阵 $A$ 可表示为对称部分与反对称部分之和：$A = \dfrac{A + A^T}{2} + \dfrac{A - A^T}{2}$
- $AA^T$ 和 $A^TA$ 都是对称矩阵

## 6. 方阵的幂

### 6.1 定义

设 $A$ 为 $n$ 阶方阵，$k$ 为正整数，则：

$$A^k = \underbrace{A \cdot A \cdots A}_{k \text{ 个}}$$

规定 $A^0 = I$。

### 6.2 运算律

1. $A^k \cdot A^l = A^{k+l}$
2. $(A^k)^l = A^{kl}$

**注意**：$(AB)^k \neq A^k B^k$（一般情况下），因为矩阵乘法不满足交换律。

### 6.3 方阵幂的计算技巧

**方法一：对角化法**

若 $A = P\Lambda P^{-1}$，则 $A^k = P\Lambda^k P^{-1}$。

**方法二：递推法**

找出 $A^k$ 的递推关系。

**方法三：二项式展开**

若 $A = B + C$ 且 $BC = CB$，则：

$$A^k = (B+C)^k = \sum_{i=0}^{k} \binom{k}{i} B^{k-i}C^i$$

**示例**：设 $A = \begin{pmatrix} 1 & 1 \\ 0 & 1 \end{pmatrix}$，求 $A^n$。

$$A = I + B, \quad B = \begin{pmatrix} 0 & 1 \\ 0 & 0 \end{pmatrix}, \quad B^2 = O$$

$$A^n = (I + B)^n = I + nB = \begin{pmatrix} 1 & n \\ 0 & 1 \end{pmatrix}$$

### 6.4 方阵多项式

设 $f(x) = a_mx^m + a_{m-1}x^{m-1} + \cdots + a_1x + a_0$，则方阵 $A$ 的多项式为：

$$f(A) = a_mA^m + a_{m-1}A^{m-1} + \cdots + a_1A + a_0I$$

**性质**：若 $A\boldsymbol{\alpha} = \lambda\boldsymbol{\alpha}$，则 $f(A)\boldsymbol{\alpha} = f(\lambda)\boldsymbol{\alpha}$。

## 7. 矩阵的迹

### 7.1 定义

$n$ 阶方阵 $A = (a_{ij})$ 的**迹**（trace）定义为主对角线元素之和：

$$\text{tr}(A) = \sum_{i=1}^{n} a_{ii}$$

### 7.2 性质

1. $\text{tr}(A + B) = \text{tr}(A) + \text{tr}(B)$
2. $\text{tr}(kA) = k \cdot \text{tr}(A)$
3. $\text{tr}(A^T) = \text{tr}(A)$
4. $\text{tr}(AB) = \text{tr}(BA)$（$A$ 为 $m \times n$，$B$ 为 $n \times m$）
5. $\text{tr}(A) = \lambda_1 + \lambda_2 + \cdots + \lambda_n$（$\lambda_i$ 为 $A$ 的特征值）
