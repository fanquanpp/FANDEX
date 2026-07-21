---
order: 50
title: 特征值与特征向量计算
module: 'linear-algebra'
category: 'comp-sci'
difficulty: intermediate
description: 特征值与特征向量的定义，特征方程与特征多项式，特征值与特征向量的计算步骤与方法。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'linear-algebra/施密特正交化'
  - 'linear-algebra/向量空间典型例题'
  - 'linear-algebra/特征值性质'
  - 'linear-algebra/矩阵对角化'
prerequisites:
  - 'linear-algebra/行列式定义与几何意义'
---

## 1. 特征值与特征向量的定义

### 1.1 定义

设 $A$ 是 $n$ 阶方阵，若存在数 $\lambda$ 和非零向量 $\boldsymbol{x}$，使得：

$$A\boldsymbol{x} = \lambda\boldsymbol{x}$$

则称 $\lambda$ 为 $A$ 的**特征值**，$\boldsymbol{x}$ 为 $A$ 的属于特征值 $\lambda$ 的**特征向量**。

### 1.2 等价表述

$$A\boldsymbol{x} = \lambda\boldsymbol{x} \iff (A - \lambda I)\boldsymbol{x} = \mathbf{0}$$

$\boldsymbol{x} \neq \mathbf{0}$ 是 $(A - \lambda I)\boldsymbol{x} = \mathbf{0}$ 的非零解，故：

$$|A - \lambda I| = 0$$

### 1.3 特征空间

属于特征值 $\lambda$ 的所有特征向量加上零向量构成的集合称为 $\lambda$ 的**特征空间**：

$$V_\lambda = \{\boldsymbol{x} \mid A\boldsymbol{x} = \lambda\boldsymbol{x}\} = N(A - \lambda I)$$

特征空间的维数称为 $\lambda$ 的**几何重数**，即 $\dim(V_\lambda) = n - r(A - \lambda I)$。

## 2. 特征方程与特征多项式

### 2.1 特征方程

$$|A - \lambda I| = 0$$

称为 $A$ 的**特征方程**。

### 2.2 特征多项式

$$f(\lambda) = |A - \lambda I|$$

称为 $A$ 的**特征多项式**，它是关于 $\lambda$ 的 $n$ 次多项式。

$$f(\lambda) = (-1)^n\lambda^n + (-1)^{n-1}(\text{tr}A)\lambda^{n-1} + \cdots + |A|$$

### 2.3 特征多项式的展开

对于 $n$ 阶矩阵 $A$：

$$f(\lambda) = |\lambda I - A| = \lambda^n - (\text{tr}A)\lambda^{n-1} + \cdots + (-1)^n|A|$$

其中：

- $\lambda^{n-1}$ 的系数为 $-\text{tr}(A) = -(a_{11} + a_{22} + \cdots + a_{nn})$
- 常数项为 $(-1)^n|A|$

## 3. 特征值与特征向量的计算步骤

### 3.1 计算步骤

1. 计算特征多项式 $f(\lambda) = |A - \lambda I|$
2. 解特征方程 $|A - \lambda I| = 0$，求出所有特征值 $\lambda_1, \lambda_2, \ldots, \lambda_n$
3. 对每个特征值 $\lambda_i$，解齐次方程组 $(A - \lambda_i I)\boldsymbol{x} = \mathbf{0}$，求出基础解系，即为属于 $\lambda_i$ 的线性无关的特征向量

### 3.2 示例

求 $A = \begin{pmatrix} 2 & 1 \\ 1 & 2 \end{pmatrix}$ 的特征值与特征向量。

**步骤1**：特征多项式

$$|A - \lambda I| = \begin{vmatrix} 2-\lambda & 1 \\ 1 & 2-\lambda \end{vmatrix} = (2-\lambda)^2 - 1 = \lambda^2 - 4\lambda + 3 = (\lambda-1)(\lambda-3)$$

**步骤2**：特征值为 $\lambda_1 = 1$，$\lambda_2 = 3$。

**步骤3**：

对 $\lambda_1 = 1$：$(A - I)\boldsymbol{x} = 0$

$$\begin{pmatrix} 1 & 1 \\ 1 & 1 \end{pmatrix}\boldsymbol{x} = 0 \Rightarrow x_1 + x_2 = 0$$

特征向量 $\boldsymbol{x}_1 = (1, -1)^T$（或其非零倍数）。

对 $\lambda_2 = 3$：$(A - 3I)\boldsymbol{x} = 0$

$$\begin{pmatrix} -1 & 1 \\ 1 & -1 \end{pmatrix}\boldsymbol{x} = 0 \Rightarrow x_1 - x_2 = 0$$

特征向量 $\boldsymbol{x}_2 = (1, 1)^T$（或其非零倍数）。

### 3.3 三阶矩阵示例

求 $A = \begin{pmatrix} 0 & 1 & 0 \\ 0 & 0 & 1 \\ 6 & -11 & 6 \end{pmatrix}$ 的特征值。

$$|A - \lambda I| = \begin{vmatrix} -\lambda & 1 & 0 \\ 0 & -\lambda & 1 \\ 6 & -11 & 6-\lambda \end{vmatrix} = -\lambda[\lambda(\lambda-6) + 11] + 1 \cdot (0 - 6)$$

$$= -\lambda^3 + 6\lambda^2 - 11\lambda + 6 = -(\lambda - 1)(\lambda - 2)(\lambda - 3)$$

特征值为 $\lambda_1 = 1$，$\lambda_2 = 2$，$\lambda_3 = 3$。

## 4. 代数重数与几何重数

### 4.1 代数重数

特征值 $\lambda_i$ 作为特征方程根的重数称为 $\lambda_i$ 的**代数重数** $m_a(\lambda_i)$。

### 4.2 几何重数

$\lambda_i$ 的特征空间的维数称为 $\lambda_i$ 的**几何重数** $m_g(\lambda_i)$：

$$m_g(\lambda_i) = n - r(A - \lambda_i I)$$

### 4.3 关系

$$1 \leq m_g(\lambda_i) \leq m_a(\lambda_i)$$

几何重数不超过代数重数。

**示例**：$A = \begin{pmatrix} 1 & 1 \\ 0 & 1 \end{pmatrix}$

特征值 $\lambda = 1$（二重根），代数重数为 $2$。

$A - I = \begin{pmatrix} 0 & 1 \\ 0 & 0 \end{pmatrix}$，$r(A - I) = 1$，几何重数 $= 2 - 1 = 1$。

## 5. 特征向量的性质

### 5.1 基本性质

1. 特征向量是非零向量
2. 若 $\boldsymbol{x}$ 是属于 $\lambda$ 的特征向量，则 $k\boldsymbol{x}$（$k \neq 0$）也是属于 $\lambda$ 的特征向量
3. 属于同一特征值的特征向量的线性组合（非零）仍是该特征值的特征向量
4. 属于不同特征值的特征向量线性无关

### 5.2 不同特征值的特征向量

**定理**：设 $\lambda_1, \lambda_2, \ldots, \lambda_s$ 是 $A$ 的互不相同的特征值，$\boldsymbol{x}_i$ 是属于 $\lambda_i$ 的特征向量，则 $\boldsymbol{x}_1, \boldsymbol{x}_2, \ldots, \boldsymbol{x}_s$ 线性无关。

**推广**：属于不同特征值的各组线性无关的特征向量合在一起仍线性无关。

## 6. 特殊矩阵的特征值

### 6.1 三角矩阵

上（下）三角矩阵的特征值就是主对角线上的元素。

### 6.2 对角矩阵

对角矩阵 $\text{diag}(d_1, d_2, \ldots, d_n)$ 的特征值就是 $d_1, d_2, \ldots, d_n$。

### 6.3 幂零矩阵

若 $A^k = O$（$k \geq 1$），则 $A$ 的特征值全为零。

### 6.4 正交矩阵

正交矩阵的特征值 $\lambda$ 满足 $|\lambda| = 1$。
