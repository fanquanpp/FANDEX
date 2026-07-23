---
order: 34
title: 解的结构
module: 'linear-algebra'
category: 'comp-sci'
difficulty: intermediate
description: 线性方程组解的结构理论，通解、特解与基础解系的关系，解空间的维数与结构，解集的几何描述。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'linear-algebra/齐次线性方程组'
  - 'linear-algebra/非齐次线性方程组'
  - 'linear-algebra/线性方程组典型例题'
  - 'linear-algebra/线性相关性'
prerequisites:
  - 'linear-algebra/行列式定义与几何意义'
---

## 1. 解的结构总览

### 1.1 齐次方程组的解结构

$Ax = 0$ 的解集 $S_0$ 构成向量空间（零空间），其结构为：

$$S_0 = \{k_1\boldsymbol{\xi}_1 + k_2\boldsymbol{\xi}_2 + \cdots + k_t\boldsymbol{\xi}_t \mid k_i \in \mathbb{R}\}$$

其中 $\boldsymbol{\xi}_1, \ldots, \boldsymbol{\xi}_t$ 是基础解系，$t = n - r(A)$。

### 1.2 非齐次方程组的解结构

$Ax = b$ 的解集 $S$ 是仿射子空间：

$$S = \boldsymbol{\eta}^* + S_0 = \{\boldsymbol{\eta}^* + \boldsymbol{\xi} \mid \boldsymbol{\xi} \in S_0\}$$

其中 $\boldsymbol{\eta}^*$ 是 $Ax = b$ 的特解，$S_0$ 是导出组 $Ax = 0$ 的解空间。

## 2. 通解、特解与基础解系的关系

### 2.1 核心关系图

```
Ax = b 的通解 = 特解 + 导出组的通解
     x    =  η*  +  k₁ξ₁ + k₂ξ₂ + ... + kₜξₜ
```

### 2.2 各部分的作用

| 概念                                                      | 作用                 | 唯一性               |
| --------------------------------------------------------- | -------------------- | -------------------- |
| 特解 $\boldsymbol{\eta}^*$                                | 确定解集的"位置"     | 不唯一，任意特解均可 |
| 基础解系 $\boldsymbol{\xi}_1, \ldots, \boldsymbol{\xi}_t$ | 确定解集的"形状"     | 不唯一，但等价       |
| 自由参数 $k_1, \ldots, k_t$                               | 参数化解集中的每个解 | 依赖于基础解系的选取 |

### 2.3 特解的选取对通解的影响

设 $\boldsymbol{\eta}_1^*$ 和 $\boldsymbol{\eta}_2^*$ 是 $Ax = b$ 的两个不同特解，则：

$$\boldsymbol{\eta}_2^* = \boldsymbol{\eta}_1^* + \boldsymbol{\xi}_0$$

其中 $\boldsymbol{\xi}_0 \in S_0$。两个通解表达式等价：

$$\boldsymbol{\eta}_2^* + \sum k_i\boldsymbol{\xi}_i = \boldsymbol{\eta}_1^* + \boldsymbol{\xi}_0 + \sum k_i\boldsymbol{\xi}_i$$

由于 $\boldsymbol{\xi}_0$ 可由基础解系表示，故两个通解描述的是同一个解集。

## 3. 解空间的维数

### 3.1 维数公式

$$\dim(S_0) = n - r(A)$$

### 3.2 秩-零度定理

$$r(A) + \dim(N(A)) = n$$

这是线性代数中最基本的维数关系之一。

### 3.3 推广

对于 $m \times n$ 矩阵 $A$：

$$\dim(\text{Row}(A)) + \dim(N(A)) = n$$

$$\dim(\text{Col}(A)) + \dim(N(A^T)) = m$$

## 4. 解集的几何描述

### 4.1 齐次方程组

$Ax = 0$ 的解集是 $\mathbb{R}^n$ 中过原点的 $t$ 维子空间（$t = n - r(A)$）。

- $t = 0$：解集为单点 $\{0\}$
- $t = 1$：解集为过原点的直线
- $t = 2$：解集为过原点的平面
- $t = n$：解集为整个 $\mathbb{R}^n$（$A = O$ 时）

### 4.2 非齐次方程组

$Ax = b$ 的解集是 $\mathbb{R}^n$ 中的 $t$ 维仿射子空间（平移后的子空间）。

- $t = 0$：解集为单点（唯一解）
- $t = 1$：解集为不过原点的直线
- $t = 2$：解集为不过原点的平面

### 4.3 示例

$\begin{cases} x + y + z = 1 \end{cases}$

$r(A) = 1$，$n = 3$，$\dim(S_0) = 2$。

解集是 $\mathbb{R}^3$ 中不过原点的平面 $x + y + z = 1$。

特解：$(1, 0, 0)^T$，基础解系：$(-1, 1, 0)^T$，$(-1, 0, 1)^T$。

## 5. 解的结构与矩阵分解

### 5.1 与 SVD 的关系

设 $A = U\Sigma V^T$ 为 $A$ 的奇异值分解，则：

- $N(A) = \text{span}\{v_{r+1}, \ldots, v_n\}$（$V$ 的后 $n-r$ 列）
- $\text{Col}(A) = \text{span}\{u_1, \ldots, u_r\}$（$U$ 的前 $r$ 列）

### 5.2 与特征值的关系

若 $A$ 可对角化为 $A = P\Lambda P^{-1}$，则：

- $N(A)$ 由对应零特征值的特征向量张成
- $Ax = b$ 的解可通过对角化后求解

## 6. 解的稳定性

### 6.1 条件数

矩阵 $A$ 的**条件数**定义为：

$$\kappa(A) = \|A\| \cdot \|A^{-1}\|$$

条件数衡量了 $Ax = b$ 的解对 $b$ 的扰动的敏感程度。

- $\kappa(A) \approx 1$：良态问题，解稳定
- $\kappa(A) \gg 1$：病态问题，解不稳定

### 6.2 扰动分析

若 $b$ 有扰动 $\delta b$，则解的扰动 $\delta x$ 满足：

$$\frac{\|\delta x\|}{\|x\|} \leq \kappa(A) \cdot \frac{\|\delta b\|}{\|b\|}$$

## 7. 典型例题

### 例1

设 $A$ 为 $3 \times 4$ 矩阵，$\boldsymbol{\eta}_1 = (1, 0, 1, 0)^T$，$\boldsymbol{\eta}_2 = (0, 1, 0, 1)^T$ 是 $Ax = 0$ 的基础解系，$\boldsymbol{\eta}^* = (1, 1, 1, 1)^T$ 是 $Ax = b$ 的特解，求 $Ax = b$ 的通解。

**解**：通解 $x = \boldsymbol{\eta}^* + k_1\boldsymbol{\eta}_1 + k_2\boldsymbol{\eta}_2$

$$x = \begin{pmatrix} 1 \\ 1 \\ 1 \\ 1 \end{pmatrix} + k_1\begin{pmatrix} 1 \\ 0 \\ 1 \\ 0 \end{pmatrix} + k_2\begin{pmatrix} 0 \\ 1 \\ 0 \\ 1 \end{pmatrix} = \begin{pmatrix} 1 + k_1 \\ 1 + k_2 \\ 1 + k_1 \\ 1 + k_2 \end{pmatrix}$$

### 例2

设 $A$ 为 $m \times n$ 矩阵，$r(A) = r$，证明 $Ax = b$ 的任意 $n - r + 1$ 个解线性相关。

**证明**：设 $\boldsymbol{\eta}_0$ 为特解，$\boldsymbol{\eta}_i = \boldsymbol{\eta}_0 + \boldsymbol{\xi}_i$（$i = 1, \ldots, n-r$），其中 $\boldsymbol{\xi}_i$ 是基础解系。

考虑 $n - r + 1$ 个解 $\boldsymbol{\eta}_0, \boldsymbol{\eta}_1, \ldots, \boldsymbol{\eta}_{n-r}$：

$$k_0\boldsymbol{\eta}_0 + k_1\boldsymbol{\eta}_1 + \cdots + k_{n-r}\boldsymbol{\eta}_{n-r} = 0$$

$$(k_0 + k_1 + \cdots + k_{n-r})\boldsymbol{\eta}_0 + k_1\boldsymbol{\xi}_1 + \cdots + k_{n-r}\boldsymbol{\xi}_{n-r} = 0$$

取 $k_0 = 1, k_1 = k_2 = \cdots = k_{n-r} = -\dfrac{1}{n-r}$，则 $k_0 + \sum k_i = 0$，且 $\sum k_i\boldsymbol{\xi}_i$ 是 $Ax = 0$ 的解。

但需要更仔细的分析。实际上，$n - r + 1$ 个解向量 $\boldsymbol{\eta}_0, \boldsymbol{\eta}_1, \ldots, \boldsymbol{\eta}_{n-r}$ 在 $n$ 维空间中，它们位于一个 $n - r$ 维仿射子空间上，故必线性相关。
