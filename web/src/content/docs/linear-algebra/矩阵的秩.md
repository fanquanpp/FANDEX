---
order: 23
title: 矩阵的秩
module: 'linear-algebra'
category: 'comp-sci'
difficulty: intermediate
description: 矩阵秩的定义（子式定义与行阶梯形定义），秩的求法，秩的重要性质，秩与线性方程组的关系。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'linear-algebra/逆矩阵'
  - 'linear-algebra/初等变换与初等矩阵'
  - 'linear-algebra/分块矩阵'
  - 'linear-algebra/矩阵典型例题'
prerequisites: []
---

## 1. 矩阵秩的定义

### 1.1 子式定义

在 $m \times n$ 矩阵 $A$ 中，任取 $k$ 行 $k$ 列（$k \leq \min(m,n)$），位于这些行列交叉处的 $k^2$ 个元素按原顺序组成的 $k$ 阶行列式，称为 $A$ 的一个 **$k$ 阶子式**。

矩阵 $A$ 的**秩** $r(A)$ 定义为 $A$ 中非零子式的最高阶数。

即：$r(A) = r$ 意味着：

- $A$ 中存在一个 $r$ 阶非零子式
- $A$ 中所有 $r+1$ 阶子式（如果存在）都为零

### 1.2 行阶梯形定义

矩阵 $A$ 的秩等于其行阶梯形中非零行的行数。

### 1.3 行秩与列秩

- **行秩**：矩阵行向量组的极大线性无关组所含向量的个数
- **列秩**：矩阵列向量组的极大线性无关组所含向量的个数

**定理**：行秩 = 列秩 = 矩阵的秩。

## 2. 矩阵秩的求法

### 2.1 初等变换法

将矩阵 $A$ 用初等行变换化为行阶梯形，非零行的行数即为 $r(A)$。

**示例**：求 $A = \begin{pmatrix} 1 & 2 & 3 & 4 \\ 2 & 4 & 6 & 8 \\ 1 & 1 & 1 & 1 \end{pmatrix}$ 的秩。

$$A \xrightarrow{r_2 - 2r_1, r_3 - r_1} \begin{pmatrix} 1 & 2 & 3 & 4 \\ 0 & 0 & 0 & 0 \\ 0 & -1 & -2 & -3 \end{pmatrix} \xrightarrow{r_2 \leftrightarrow r_3} \begin{pmatrix} 1 & 2 & 3 & 4 \\ 0 & -1 & -2 & -3 \\ 0 & 0 & 0 & 0 \end{pmatrix}$$

非零行有 2 行，故 $r(A) = 2$。

### 2.2 子式法

从高阶到低阶寻找非零子式。若所有 $r+1$ 阶子式为零，但存在 $r$ 阶非零子式，则秩为 $r$。

此方法适用于低阶矩阵或特殊结构的矩阵。

## 3. 矩阵秩的重要性质

### 3.1 基本性质

1. $0 \leq r(A) \leq \min(m, n)$
2. $r(A) = r(A^T)$
3. $r(A) = r(A^TA) = r(AA^T)$
4. $r(kA) = r(A)$（$k \neq 0$）
5. $A$ 可逆 $\iff r(A) = n$（$A$ 为 $n$ 阶方阵）

### 3.2 秩与初等变换

初等变换不改变矩阵的秩。

### 3.3 秩与矩阵乘法

1. $r(AB) \leq \min(r(A), r(B))$
2. 若 $A$ 可逆，则 $r(AB) = r(B)$，$r(BA) = r(B)$
3. **Sylvester 不等式**：$r(A) + r(B) - n \leq r(AB)$（$A$ 为 $m \times n$，$B$ 为 $n \times p$）

### 3.4 秩与矩阵和

1. $r(A + B) \leq r(A) + r(B)$
2. $r(A + B) \geq |r(A) - r(B)|$

### 3.5 秩与零空间

设 $A$ 为 $m \times n$ 矩阵，则：

$$r(A) + \text{dim}(N(A)) = n$$

其中 $N(A) = \{x \mid Ax = 0\}$ 为 $A$ 的零空间（解空间）。

### 3.6 伴随矩阵的秩

设 $A$ 为 $n$ 阶方阵（$n \geq 2$），则：

$$r(A^*) = \begin{cases} n, & r(A) = n \\ 1, & r(A) = n-1 \\ 0, & r(A) < n-1 \end{cases}$$

**证明**：

- 当 $r(A) = n$ 时，$|A| \neq 0$，$|A^*| = |A|^{n-1} \neq 0$，故 $r(A^*) = n$
- 当 $r(A) = n-1$ 时，$|A| = 0$ 且存在 $n-1$ 阶非零子式，故 $A^* \neq O$；又 $AA^* = |A|I = O$，故 $r(A^*) \leq n - r(A) = 1$，所以 $r(A^*) = 1$
- 当 $r(A) < n-1$ 时，所有 $n-1$ 阶子式为零，故 $A^* = O$，$r(A^*) = 0$

## 4. 秩的应用

### 4.1 判断线性方程组解的情况

对于 $Ax = b$（$A$ 为 $m \times n$ 矩阵）：

| 条件 | 解的情况 |
| ----------- | -------- | -------- |
| $r(A) = r(A | b) = n$ | 唯一解 |
| $r(A) = r(A | b) < n$ | 无穷多解 |
| $r(A) < r(A | b)$ | 无解 |

### 4.2 判断矩阵的可逆性

$A$ 可逆 $\iff r(A) = n$

### 4.3 判断向量组的线性相关性

设 $\boldsymbol{\alpha}_1, \boldsymbol{\alpha}_2, \ldots, \boldsymbol{\alpha}_s$ 为 $n$ 维向量，构造矩阵 $A = (\boldsymbol{\alpha}_1, \boldsymbol{\alpha}_2, \ldots, \boldsymbol{\alpha}_s)$：

- $r(A) = s$：线性无关
- $r(A) < s$：线性相关

### 4.4 矩阵方程 $AB = O$ 的秩关系

若 $AB = O$，则 $r(A) + r(B) \leq n$（$A$ 为 $m \times n$，$B$ 为 $n \times p$）。

**推论**：若 $A$ 为 $m \times n$ 矩阵且 $r(A) = n$，$AB = O$，则 $B = O$。

## 5. 典型例题

### 例1

设 $A$ 为 $4 \times 3$ 矩阵，$r(A) = 2$，$B = \begin{pmatrix} 1 & 0 & 0 \\ 0 & 2 & 0 \\ 0 & 0 & 3 \end{pmatrix}$，求 $r(AB)$。

**解**：$B$ 为可逆矩阵，故 $r(AB) = r(A) = 2$。

### 例2

设 $A$ 为 $n$ 阶方阵，$A^2 = A$，证明 $r(A) + r(I - A) = n$。

**证明**：由 $A^2 = A$ 得 $A(I - A) = O$，故 $r(A) + r(I - A) \leq n$。

又 $A + (I - A) = I$，故 $n = r(I) \leq r(A) + r(I - A)$。

因此 $r(A) + r(I - A) = n$。

### 例3

设 $A$ 为 $m \times n$ 矩阵，$B$ 为 $n \times m$ 矩阵，$AB = O$，证明 $r(A) + r(B) \leq n$。

**证明**：$AB = O$ 意味着 $B$ 的列向量都是 $Ax = 0$ 的解，即 $B$ 的列空间包含在 $A$ 的零空间中。

$\text{dim}(\text{col}(B)) \leq \text{dim}(N(A)) = n - r(A)$

即 $r(B) \leq n - r(A)$，故 $r(A) + r(B) \leq n$。
