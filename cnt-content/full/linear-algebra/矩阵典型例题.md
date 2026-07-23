---
order: 25
title: 矩阵典型例题
module: 'linear-algebra'
category: 'comp-sci'
difficulty: intermediate
description: 矩阵运算、逆矩阵、秩、分块矩阵等典型例题集锦，涵盖计算题与证明题。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'linear-algebra/矩阵的秩'
  - 'linear-algebra/分块矩阵'
  - 'linear-algebra/高斯消元法'
  - 'linear-algebra/解的存在性判定'
prerequisites: []
---

## 1. 矩阵运算

### 例1

设 $A = \begin{pmatrix} 1 & 1 \\ 0 & 1 \end{pmatrix}$，求 $A^n$。

**解**：$A = I + B$，其中 $B = \begin{pmatrix} 0 & 1 \\ 0 & 0 \end{pmatrix}$，$B^2 = O$。

$$A^n = (I + B)^n = I + nB = \begin{pmatrix} 1 & n \\ 0 & 1 \end{pmatrix}$$

### 例2

设 $A = \begin{pmatrix} 1 & 0 & 1 \\ 0 & 2 & 0 \\ 1 & 0 & 1 \end{pmatrix}$，求 $A^n - 2A^{n-1}$（$n \geq 2$）。

**解**：$A^2 = \begin{pmatrix} 2 & 0 & 2 \\ 0 & 4 & 0 \\ 2 & 0 & 2 \end{pmatrix} = 2A$

故 $A^n = A^{n-2} \cdot A^2 = A^{n-2} \cdot 2A = 2A^{n-1}$。

$$A^n - 2A^{n-1} = O$$

### 例3

设 $\boldsymbol{\alpha} = (1, 2, 3)^T$，$\beta = (1, 1, 1)^T$，$A = \boldsymbol{\alpha}\boldsymbol{\beta}^T$，求 $A^n$。

**解**：$A = \boldsymbol{\alpha}\boldsymbol{\beta}^T = \begin{pmatrix} 1 & 1 & 1 \\ 2 & 2 & 2 \\ 3 & 3 & 3 \end{pmatrix}$

$A^2 = \boldsymbol{\alpha}\boldsymbol{\beta}^T \boldsymbol{\alpha}\boldsymbol{\beta}^T = \boldsymbol{\alpha}(\boldsymbol{\beta}^T\boldsymbol{\alpha})\boldsymbol{\beta}^T$

$\boldsymbol{\beta}^T\boldsymbol{\alpha} = 1 + 2 + 3 = 6$

$A^2 = 6\boldsymbol{\alpha}\boldsymbol{\beta}^T = 6A$

$A^n = 6^{n-1}A$

## 2. 逆矩阵

### 例4

设 $A^3 = 2I$，证明 $A^2 - A + I$ 可逆，并求其逆。

**解**：设 $B = A^2 - A + I$，需找 $C$ 使得 $BC = I$。

由 $A^3 = 2I$，得 $A^3 - I = I$，即 $(A - I)(A^2 + A + I) = I$。

又 $A^3 - 8I = -6I$，即 $(A - 2I)(A^2 + 2A + 4I) = -6I$。

尝试：$B \cdot (A + 2I) = (A^2 - A + I)(A + 2I) = A^3 + 2A^2 - A^2 - 2A + A + 2I = A^3 + A^2 - A + 2I$

$= 2I + A^2 - A + 2I = A^2 - A + 4I$

不等于 $I$。换一种方式：

$B(A + 2I) = A^3 + A^2 - A + 2I = 2I + A^2 - A + 2I = A^2 - A + 4I$

再试：$B \cdot \dfrac{A+2I}{3}$... 不行。

直接用 $A^3 = 2I$：$A^3 - I = I$，$(A-I)(A^2+A+I) = I$。

而 $B = A^2 - A + I$，$A^2 + A + I = B + 2A$。

$(A-I)(B + 2A) = I$

$AB + 2A^2 - B - 2A = I$

$B(A - I) = I - 2A^2 + 2A = I - 2(A^2 - A)$

这条路复杂。换思路：

$A^3 = 2I$，所以 $A^3 + I = 3I$，$(A+I)(A^2 - A + I) = 3I$。

故 $B^{-1} = \dfrac{A + I}{3}$。

### 例5

设 $A, B$ 为 $n$ 阶方阵，$A + B = AB$，证明 $A - I$ 可逆。

**解**：$A + B = AB$，即 $AB - A - B = O$，$AB - A - B + I = I$，$(A - I)(B - I) = I$。

故 $A - I$ 可逆，$(A - I)^{-1} = B - I$。

## 3. 矩阵的秩

### 例6

设 $A$ 为 $n$ 阶方阵，$A^2 = A$，证明 $r(A) + r(I - A) = n$。

**证明**：

由 $A^2 = A$ 得 $A(I - A) = O$，故 $r(A) + r(I - A) \leq n$。

又 $A + (I - A) = I$，故 $n = r(I) \leq r(A) + r(I - A)$。

因此 $r(A) + r(I - A) = n$。

### 例7

设 $A$ 为 $m \times n$ 矩阵，$B$ 为 $n \times s$ 矩阵，$AB = O$，证明 $r(A) + r(B) \leq n$。

**证明**：$B$ 的每一列都是 $Ax = 0$ 的解，$B$ 的列空间是 $A$ 的零空间的子空间。

$r(B) \leq \dim(N(A)) = n - r(A)$

故 $r(A) + r(B) \leq n$。

### 例8

设 $A$ 为 $n$ 阶方阵（$n \geq 2$），$A^* \neq O$，若 $Ax = 0$ 有非零解，求 $r(A^*)$。

**解**：$Ax = 0$ 有非零解 $\Rightarrow |A| = 0 \Rightarrow r(A) \leq n-1$。

$A^* \neq O \Rightarrow$ 存在 $n-1$ 阶非零子式 $\Rightarrow r(A) \geq n-1$。

故 $r(A) = n-1$，由伴随矩阵秩的公式，$r(A^*) = 1$。

## 4. 伴随矩阵

### 例9

设 $A$ 为三阶可逆矩阵，$|A| = 3$，求 $|2(A^*)^{-1}|$。

**解**：$(A^*)^{-1} = \dfrac{A}{|A|} = \dfrac{A}{3}$

$$|2(A^*)^{-1}| = \left|\frac{2A}{3}\right| = \left(\frac{2}{3}\right)^3 |A| = \frac{8}{27} \times 3 = \frac{8}{9}$$

### 例10

设 $A$ 为 $n$ 阶方阵，$|A| = a \neq 0$，求 $|(A^*)^*|$。

**解**：$|A^*| = |A|^{n-1} = a^{n-1}$

$(A^*)^* = |A^*|(A^*)^{-1} = a^{n-1} \cdot \frac{A}{|A|} = a^{n-2}A$

$|(A^*)^*| = a^{(n-2)n} \cdot |A| = a^{n^2 - 2n + 1} = a^{(n-1)^2}$

## 5. 矩阵方程

### 例11

设 $A = \begin{pmatrix} 1 & 0 & 1 \\ 0 & 2 & 0 \\ -1 & 0 & 1 \end{pmatrix}$，$AX + I = A^2 + X$，求 $X$。

**解**：$AX - X = A^2 - I$，$(A - I)X = (A - I)(A + I)$

$A - I = \begin{pmatrix} 0 & 0 & 1 \\ 0 & 1 & 0 \\ -1 & 0 & 0 \end{pmatrix}$，$|A - I| = 0 + 0 + 0 = 0$（$A-I$ 不可逆）

但 $A - I$ 不可逆，不能直接消去。需验证 $A^2 - I$ 的列是否在 $A - I$ 的列空间中。

$$A^2 = \begin{pmatrix} 0 & 0 & 2 \\ 0 & 4 & 0 \\ -2 & 0 & 0 \end{pmatrix}$$

$$A^2 - I = \begin{pmatrix} -1 & 0 & 2 \\ 0 & 3 & 0 \\ -2 & 0 & -1 \end{pmatrix}$$

$A - I$ 的秩为 2，需要具体求解方程组。实际上，$X = A + I$ 是一个解：

$(A-I)(A+I) = A^2 - I$

### 例12

设 $A = \begin{pmatrix} 1 & 1 \\ 0 & 1 \end{pmatrix}$，$B = \begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}$，解 $AXB = C$，其中 $C = \begin{pmatrix} 5 & 6 \\ 7 & 8 \end{pmatrix}$。

**解**：$X = A^{-1}CB^{-1}$

$$A^{-1} = \begin{pmatrix} 1 & -1 \\ 0 & 1 \end{pmatrix}$$

$$B^{-1} = \frac{1}{-2}\begin{pmatrix} 4 & -2 \\ -3 & 1 \end{pmatrix} = \begin{pmatrix} -2 & 1 \\ 3/2 & -1/2 \end{pmatrix}$$

$$A^{-1}C = \begin{pmatrix} 1 & -1 \\ 0 & 1 \end{pmatrix}\begin{pmatrix} 5 & 6 \\ 7 & 8 \end{pmatrix} = \begin{pmatrix} -2 & -2 \\ 7 & 8 \end{pmatrix}$$

$$X = \begin{pmatrix} -2 & -2 \\ 7 & 8 \end{pmatrix}\begin{pmatrix} -2 & 1 \\ 3/2 & -1/2 \end{pmatrix} = \begin{pmatrix} 1 & -1 \\ -2 & 3 \end{pmatrix}$$

## 6. 综合证明题

### 例13

设 $A$ 为 $n$ 阶实对称矩阵，$A^2 = O$，证明 $A = O$。

**证明**：$A^2 = O \Rightarrow A^TA = O$（因为 $A^T = A$）

$(A^TA)_{jj} = \sum_{i=1}^{n} a_{ij}^2 = 0$

故 $a_{ij} = 0$ 对所有 $i, j$ 成立，即 $A = O$。

### 例14

设 $A$ 为 $n$ 阶方阵，$A^2 - 2A - 3I = O$，证明 $r(A + I) + r(A - 3I) = n$。

**证明**：$(A + I)(A - 3I) = A^2 - 2A - 3I = O$

故 $r(A + I) + r(A - 3I) \leq n$。

又 $(A + I) - (A - 3I) = 4I$，故 $n = r(4I) \leq r(A + I) + r(A - 3I)$。

因此 $r(A + I) + r(A - 3I) = n$。

### 例15

设 $A, B, C$ 为 $n$ 阶方阵，$ABC = O$，证明 $r(A) + r(B) + r(C) \leq 2n$。

**证明**：由 $ABC = O$，得 $r(AB) + r(C) \leq n$（因为 $C$ 的列在 $AB$ 的零空间中）。

又 $r(AB) \geq r(A) + r(B) - n$（Sylvester 不等式）。

故 $r(A) + r(B) - n + r(C) \leq n$，即 $r(A) + r(B) + r(C) \leq 2n$。
