---
order: 70
title: LU分解
module: 'linear-algebra'
category: 'comp-sci'
difficulty: advanced
description: LU分解的定义与条件，Doolittle分解与Crout分解，LU分解的计算步骤与应用。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'linear-algebra/正定二次型'
  - 'linear-algebra/二次型典型例题'
  - 'linear-algebra/QR分解'
  - 'linear-algebra/奇异值分解SVD'
prerequisites:
  - 'linear-algebra/行列式定义与几何意义'
---

## 1. LU分解的定义

### 1.1 定义

设 $A$ 为 $n$ 阶方阵，若 $A$ 可以分解为：

$$A = LU$$

其中 $L$ 为下三角矩阵，$U$ 为上三角矩阵，则称为 $A$ 的 **LU 分解**。

### 1.2 存在条件

**定理**：若 $A$ 的所有顺序主子式都不为零（$\Delta_k \neq 0$，$k = 1, 2, \ldots, n-1$），则 $A$ 的 LU 分解存在且唯一（在指定 $L$ 或 $U$ 的对角线元素时）。

### 1.3 PLU 分解

对于一般的矩阵，可能需要行交换才能进行 LU 分解：

$$PA = LU$$

其中 $P$ 为置换矩阵。这称为 **PLU 分解**，对任何可逆矩阵都存在。

## 2. Doolittle 分解

### 2.1 定义

在 Doolittle 分解中，$L$ 为**单位下三角矩阵**（主对角线为1），$U$ 为上三角矩阵：

$$A = LU = \begin{pmatrix} 1 & 0 & \cdots & 0 \\ l_{21} & 1 & \cdots & 0 \\ \vdots & \vdots & \ddots & \vdots \\ l_{n1} & l_{n2} & \cdots & 1 \end{pmatrix}\begin{pmatrix} u_{11} & u_{12} & \cdots & u_{1n} \\ 0 & u_{22} & \cdots & u_{2n} \\ \vdots & \vdots & \ddots & \vdots \\ 0 & 0 & \cdots & u_{nn} \end{pmatrix}$$

### 2.2 计算公式

**第一行**：$u_{1j} = a_{1j}$（$j = 1, 2, \ldots, n$）

**第一列**：$l_{i1} = a_{i1}/u_{11}$（$i = 2, 3, \ldots, n$）

**一般地**（$k = 2, 3, \ldots, n$）：

$$u_{kj} = a_{kj} - \sum_{s=1}^{k-1} l_{ks}u_{sj} \quad (j = k, k+1, \ldots, n)$$

$$l_{ik} = \frac{1}{u_{kk}}\left(a_{ik} - \sum_{s=1}^{k-1} l_{is}u_{sk}\right) \quad (i = k+1, k+2, \ldots, n)$$

### 2.3 完整示例

对 $A = \begin{pmatrix} 2 & 1 & 1 \\ 4 & 3 & 3 \\ 8 & 7 & 9 \end{pmatrix}$ 进行 Doolittle 分解。

**步骤1**：$u_{11} = 2$，$u_{12} = 1$，$u_{13} = 1$

$l_{21} = 4/2 = 2$，$l_{31} = 8/2 = 4$

**步骤2**：$u_{22} = 3 - 2 \times 1 = 1$，$u_{23} = 3 - 2 \times 1 = 1$

$l_{32} = (7 - 4 \times 1)/1 = 3$

**步骤3**：$u_{33} = 9 - 4 \times 1 - 3 \times 1 = 2$

$$L = \begin{pmatrix} 1 & 0 & 0 \\ 2 & 1 & 0 \\ 4 & 3 & 1 \end{pmatrix}, \quad U = \begin{pmatrix} 2 & 1 & 1 \\ 0 & 1 & 1 \\ 0 & 0 & 2 \end{pmatrix}$$

验证：$LU = \begin{pmatrix} 2 & 1 & 1 \\ 4 & 3 & 3 \\ 8 & 7 & 9 \end{pmatrix} = A$

## 3. Crout 分解

### 3.1 定义

在 Crout 分解中，$L$ 为下三角矩阵，$U$ 为**单位上三角矩阵**（主对角线为1）：

$$A = LU = \begin{pmatrix} l_{11} & 0 & \cdots & 0 \\ l_{21} & l_{22} & \cdots & 0 \\ \vdots & \vdots & \ddots & \vdots \\ l_{n1} & l_{n2} & \cdots & l_{nn} \end{pmatrix}\begin{pmatrix} 1 & u_{12} & \cdots & u_{1n} \\ 0 & 1 & \cdots & u_{2n} \\ \vdots & \vdots & \ddots & \vdots \\ 0 & 0 & \cdots & 1 \end{pmatrix}$$

### 3.2 计算公式

**第一列**：$l_{i1} = a_{i1}$（$i = 1, 2, \ldots, n$）

**第一行**：$u_{1j} = a_{1j}/l_{11}$（$j = 2, 3, \ldots, n$）

**一般地**：

$$l_{ik} = a_{ik} - \sum_{s=1}^{k-1} l_{is}u_{sk} \quad (i = k, k+1, \ldots, n)$$

$$u_{kj} = \frac{1}{l_{kk}}\left(a_{kj} - \sum_{s=1}^{k-1} l_{ks}u_{sj}\right) \quad (j = k+1, k+2, \ldots, n)$$

## 4. LDU 分解

### 4.1 定义

将 $A$ 分解为 $A = LDU$，其中 $L$ 为单位下三角矩阵，$D$ 为对角矩阵，$U$ 为单位上三角矩阵。

### 4.2 与 LU 分解的关系

若 $A = LU$（Doolittle 分解），则 $A = LDU'$，其中 $D = \text{diag}(u_{11}, u_{22}, \ldots, u_{nn})$，$U' = D^{-1}U$。

## 5. LU 分解的应用

### 5.1 解线性方程组

$Ax = b$，$A = LU$：

1. 解 $Ly = b$（前代，$O(n^2)$）
2. 解 $Ux = y$（回代，$O(n^2)$）

分解本身需要 $O(n^3)$，但一旦分解完成，对不同的 $b$ 只需 $O(n^2)$。

### 5.2 求行列式

$|A| = |L| \cdot |U| = u_{11}u_{22}\cdots u_{nn}$（Doolittle 分解中 $|L| = 1$）

### 5.3 求逆矩阵

$A^{-1} = U^{-1}L^{-1}$，分别解 $n$ 个三角形方程组。

## 6. Cholesky 分解

### 6.1 定义

若 $A$ 为正定矩阵，则 $A$ 可分解为：

$$A = LL^T$$

其中 $L$ 为下三角矩阵（对角线元素为正）。这称为 **Cholesky 分解**。

### 6.2 计算公式

$$l_{kk} = \sqrt{a_{kk} - \sum_{s=1}^{k-1} l_{ks}^2}$$

$$l_{ik} = \frac{1}{l_{kk}}\left(a_{ik} - \sum_{s=1}^{k-1} l_{is}l_{ks}\right) \quad (i = k+1, \ldots, n)$$

### 6.3 示例

对 $A = \begin{pmatrix} 4 & 2 \\ 2 & 5 \end{pmatrix}$ 进行 Cholesky 分解。

$l_{11} = 2$，$l_{21} = 2/2 = 1$，$l_{22} = \sqrt{5 - 1} = 2$

$$L = \begin{pmatrix} 2 & 0 \\ 1 & 2 \end{pmatrix}, \quad L^T = \begin{pmatrix} 2 & 1 \\ 0 & 2 \end{pmatrix}$$

验证：$LL^T = \begin{pmatrix} 4 & 2 \\ 2 & 5 \end{pmatrix}$

### 6.4 Cholesky 分解的优势

- 计算量约为 LU 分解的一半
- 数值稳定性好
- 只需存储 $L$，节省存储空间
- 正定性的数值验证
