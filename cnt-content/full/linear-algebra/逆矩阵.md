---
order: 21
title: 逆矩阵
module: 'linear-algebra'
category: 'comp-sci'
difficulty: intermediate
description: 逆矩阵的定义、性质与判定，伴随矩阵法求逆，逆矩阵的运算性质，矩阵方程的求解。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'linear-algebra/行列式典型例题'
  - 'linear-algebra/矩阵运算'
  - 'linear-algebra/初等变换与初等矩阵'
  - 'linear-algebra/矩阵的秩'
prerequisites: []
---

## 1. 逆矩阵的定义

### 1.1 定义

设 $A$ 为 $n$ 阶方阵，若存在 $n$ 阶方阵 $B$，使得：

$$AB = BA = I$$

则称 $A$ **可逆**，$B$ 为 $A$ 的**逆矩阵**，记作 $B = A^{-1}$。

### 1.2 逆矩阵的唯一性

若 $A$ 可逆，则其逆矩阵唯一。

**证明**：设 $B_1$ 和 $B_2$ 都是 $A$ 的逆矩阵，则：

$$B_1 = B_1 I = B_1(AB_2) = (B_1A)B_2 = IB_2 = B_2$$

### 1.3 可逆的等价条件

以下条件等价：

1. $A$ 可逆
2. $|A| \neq 0$（$A$ 非奇异）
3. $A$ 的秩 $r(A) = n$（$A$ 满秩）
4. $Ax = 0$ 只有零解
5. $Ax = b$ 对任意 $b$ 有唯一解
6. $A$ 的行（列）向量线性无关
7. $A$ 可以表示为有限个初等矩阵的乘积
8. $A$ 的特征值全不为零

## 2. 伴随矩阵

### 2.1 定义

设 $A = (a_{ij})_{n \times n}$，$A_{ij}$ 为 $a_{ij}$ 的代数余子式，则 $A$ 的**伴随矩阵**为：

$$A^* = \begin{pmatrix} A_{11} & A_{21} & \cdots & A_{n1} \\ A_{12} & A_{22} & \cdots & A_{n2} \\ \vdots & \vdots & \ddots & \vdots \\ A_{1n} & A_{2n} & \cdots & A_{nn} \end{pmatrix}$$

**注意**：伴随矩阵是代数余子式矩阵的**转置**，即 $(A^*)_{ij} = A_{ji}$。

### 2.2 基本关系

$$AA^* = A^*A = |A|I$$

**证明**：由行列式展开定理和代数余子式性质：

$$(AA^*)_{ij} = \sum_{k=1}^{n} a_{ik}A_{jk} = \begin{cases} |A|, & i = j \\ 0, & i \neq j \end{cases} = |A|\delta_{ij}$$

## 3. 伴随矩阵法求逆

### 3.1 公式

当 $|A| \neq 0$ 时：

$$A^{-1} = \frac{1}{|A|}A^*$$

### 3.2 求逆步骤

1. 计算 $|A|$，验证 $|A| \neq 0$
2. 求所有 $A_{ij}$（共 $n^2$ 个代数余子式）
3. 构造伴随矩阵 $A^*$
4. $A^{-1} = \dfrac{1}{|A|}A^*$

### 3.3 二阶矩阵求逆公式

设 $A = \begin{pmatrix} a & b \\ c & d \end{pmatrix}$，$|A| = ad - bc \neq 0$，则：

$$A^{-1} = \frac{1}{ad - bc}\begin{pmatrix} d & -b \\ -c & a \end{pmatrix}$$

**口诀**：主对角线交换，副对角线变号，除以行列式。

**示例**：求 $A = \begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}$ 的逆矩阵。

$$|A| = 4 - 6 = -2$$

$$A^{-1} = \frac{1}{-2}\begin{pmatrix} 4 & -2 \\ -3 & 1 \end{pmatrix} = \begin{pmatrix} -2 & 1 \\ 3/2 & -1/2 \end{pmatrix}$$

### 3.4 三阶矩阵求逆示例

设 $A = \begin{pmatrix} 1 & 2 & 3 \\ 0 & 1 & 4 \\ 5 & 6 & 0 \end{pmatrix}$

$|A| = 1(0-24) - 2(0-20) + 3(0-5) = -24 + 40 - 15 = 1$

计算各代数余子式后构造 $A^*$，则 $A^{-1} = A^*$。

## 4. 逆矩阵的运算性质

### 4.1 基本性质

1. $(A^{-1})^{-1} = A$
2. $(A^T)^{-1} = (A^{-1})^T$
3. $(kA)^{-1} = \dfrac{1}{k}A^{-1}$（$k \neq 0$）
4. $(AB)^{-1} = B^{-1}A^{-1}$（**注意顺序反转**）
5. $(A^k)^{-1} = (A^{-1})^k = A^{-k}$
6. $|A^{-1}| = |A|^{-1} = \dfrac{1}{|A|}$

### 4.2 性质4的推广

$$(A_1 A_2 \cdots A_k)^{-1} = A_k^{-1} \cdots A_2^{-1} A_1^{-1}$$

### 4.3 伴随矩阵的性质

1. $|A^*| = |A|^{n-1}$
2. $(A^*)^{-1} = \dfrac{A}{|A|}$（$|A| \neq 0$）
3. $(A^*)^T = (A^T)^*$
4. $(AB)^* = B^*A^*$
5. $(kA)^* = k^{n-1}A^*$
6. $(A^*)^* = |A|^{n-2}A$（$n \geq 2$）

## 5. 矩阵方程的求解

### 5.1 基本类型

**类型一**：$AX = B$（$A$ 可逆）

$$X = A^{-1}B$$

**类型二**：$XA = B$（$A$ 可逆）

$$X = BA^{-1}$$

**类型三**：$AXB = C$（$A, B$ 可逆）

$$X = A^{-1}CB^{-1}$$

### 5.2 求解方法

**方法一**：逆矩阵法——直接用公式计算

**方法二**：初等变换法——对增广矩阵做行变换

对于 $AX = B$：$(A | B) \xrightarrow{\text{行变换}} (I | A^{-1}B)$

对于 $XA = B$：$\begin{pmatrix} A \\ B \end{pmatrix} \xrightarrow{\text{列变换}} \begin{pmatrix} I \\ BA^{-1} \end{pmatrix}$

### 5.3 示例

设 $A = \begin{pmatrix} 1 & 2 \\ 3 & 5 \end{pmatrix}$，$B = \begin{pmatrix} 1 & 0 \\ 0 & 2 \end{pmatrix}$，解矩阵方程 $AX = B$。

$|A| = 5 - 6 = -1$

$$A^{-1} = \frac{1}{-1}\begin{pmatrix} 5 & -2 \\ -3 & 1 \end{pmatrix} = \begin{pmatrix} -5 & 2 \\ 3 & -1 \end{pmatrix}$$

$$X = A^{-1}B = \begin{pmatrix} -5 & 2 \\ 3 & -1 \end{pmatrix}\begin{pmatrix} 1 & 0 \\ 0 & 2 \end{pmatrix} = \begin{pmatrix} -5 & 4 \\ 3 & -2 \end{pmatrix}$$

## 6. 逆矩阵的应用

### 6.1 解线性方程组

$Ax = b$，当 $A$ 可逆时，$x = A^{-1}b$。

### 6.2 判断矩阵可逆性

**示例**：设 $A$ 为 $n$ 阶方阵，$A^2 - 3A + 2I = O$，证明 $A$ 可逆并求 $A^{-1}$。

由 $A^2 - 3A + 2I = O$ 得 $A(A - 3I) = -2I$，即 $A \cdot \dfrac{3I - A}{2} = I$。

故 $A$ 可逆，且 $A^{-1} = \dfrac{3I - A}{2}$。

### 6.3 证明矩阵可逆的常用方法

1. 证明 $|A| \neq 0$
2. 找到矩阵 $B$ 使得 $AB = I$（或 $BA = I$）
3. 利用 $A$ 满足的多项式方程
4. 证明 $A$ 是初等矩阵的乘积
