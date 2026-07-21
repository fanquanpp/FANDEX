---
order: 22
title: 初等变换与初等矩阵
module: 'linear-algebra'
category: 'comp-sci'
difficulty: intermediate
description: 初等行变换与初等列变换，三种初等矩阵，初等变换与初等矩阵的关系，矩阵等价标准形，用初等变换求逆矩阵。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'linear-algebra/矩阵运算'
  - 'linear-algebra/逆矩阵'
  - 'linear-algebra/矩阵的秩'
  - 'linear-algebra/分块矩阵'
prerequisites: []
---

## 1. 初等变换

### 1.1 初等行变换

对矩阵施行以下三种变换称为**初等行变换**：

1. **对换变换**：交换第 $i$ 行与第 $j$ 行，记作 $r_i \leftrightarrow r_j$
2. **倍乘变换**：用非零常数 $k$ 乘第 $i$ 行，记作 $kr_i$
3. **倍加变换**：将第 $j$ 行的 $k$ 倍加到第 $i$ 行，记作 $r_i + kr_j$

### 1.2 初等列变换

类似地，对列施行的三种变换称为**初等列变换**：

1. **对换变换**：$c_i \leftrightarrow c_j$
2. **倍乘变换**：$kc_i$
3. **倍加变换**：$c_i + kc_j$

### 1.3 初等变换的可逆性

每种初等变换都是可逆的，其逆变换也是同类型的初等变换：

| 变换                      | 逆变换                    |
| ------------------------- | ------------------------- |
| $r_i \leftrightarrow r_j$ | $r_i \leftrightarrow r_j$ |
| $kr_i$                    | $\frac{1}{k}r_i$          |
| $r_i + kr_j$              | $r_i - kr_j$              |

### 1.4 矩阵的等价

若矩阵 $A$ 经过有限次初等变换变为矩阵 $B$，则称 $A$ 与 $B$ **等价**，记作 $A \cong B$。

等价关系满足：

- **自反性**：$A \cong A$
- **对称性**：$A \cong B \Rightarrow B \cong A$
- **传递性**：$A \cong B, B \cong C \Rightarrow A \cong C$

## 2. 初等矩阵

### 2.1 定义

由单位矩阵经过一次初等变换得到的矩阵称为**初等矩阵**。

### 2.2 三种初等矩阵

**1. 对换初等矩阵** $E(i,j)$：

交换单位矩阵的第 $i$ 行和第 $j$ 行（或第 $i$ 列和第 $j$ 列）。

$$E(1,2) = \begin{pmatrix} 0 & 1 & 0 \\ 1 & 0 & 0 \\ 0 & 0 & 1 \end{pmatrix}$$

**2. 倍乘初等矩阵** $E(i(k))$：

单位矩阵第 $i$ 行（列）乘以非零常数 $k$。

$$E(2(k)) = \begin{pmatrix} 1 & 0 & 0 \\ 0 & k & 0 \\ 0 & 0 & 1 \end{pmatrix}$$

**3. 倍加初等矩阵** $E(i,j(k))$：

单位矩阵第 $j$ 行的 $k$ 倍加到第 $i$ 行（或第 $i$ 列的 $k$ 倍加到第 $j$ 列）。

$$E(1,2(k)) = \begin{pmatrix} 1 & k & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \end{pmatrix}$$

### 2.3 初等矩阵的性质

1. 初等矩阵都是可逆的
2. 初等矩阵的逆矩阵仍为同类型的初等矩阵：
   - $E(i,j)^{-1} = E(i,j)$
   - $E(i(k))^{-1} = E(i(1/k))$
   - $E(i,j(k))^{-1} = E(i,j(-k))$
3. $|E(i,j)| = -1$，$|E(i(k))| = k$，$|E(i,j(k))| = 1$

## 3. 初等变换与初等矩阵的关系

### 3.1 核心定理

**对 $A$ 施行一次初等行变换，相当于在 $A$ 的左边乘以相应的初等矩阵。**

**对 $A$ 施行一次初等列变换，相当于在 $A$ 的右边乘以相应的初等矩阵。**

即：

- $A \xrightarrow{r_i \leftrightarrow r_j} E(i,j)A$
- $A \xrightarrow{kr_i} E(i(k))A$
- $A \xrightarrow{r_i + kr_j} E(i,j(k))A$

- $A \xrightarrow{c_i \leftrightarrow c_j} AE(i,j)$
- $A \xrightarrow{kc_i} AE(i(k))$
- $A \xrightarrow{c_i + kc_j} AE(j,i(k))$

### 3.2 等价表述

$A$ 可逆 $\iff$ $A$ 可以表示为有限个初等矩阵的乘积。

**证明**：

- $\Rightarrow$：$A$ 可逆，则 $A$ 可经初等行变换化为 $I$，即存在初等矩阵 $P_1, P_2, \ldots, P_s$ 使得 $P_s \cdots P_2 P_1 A = I$，故 $A = P_1^{-1} P_2^{-1} \cdots P_s^{-1}$，每个 $P_i^{-1}$ 也是初等矩阵。
- $\Leftarrow$：初等矩阵可逆，可逆矩阵的乘积仍可逆。

## 4. 矩阵的等价标准形

### 4.1 定理

任意 $m \times n$ 矩阵 $A$ 都可以经过初等变换化为等价标准形：

$$\begin{pmatrix} I_r & O \\ O & O \end{pmatrix}$$

其中 $r = r(A)$ 为矩阵 $A$ 的秩。

### 4.2 等价标准形的唯一性

等价标准形由 $r(A)$ 唯一确定。两个矩阵等价当且仅当它们有相同的等价标准形，即它们有相同的秩。

$$A \cong B \iff r(A) = r(B)$$（同型矩阵）

## 5. 用初等变换求逆矩阵

### 5.1 方法

设 $A$ 为 $n$ 阶可逆矩阵，构造 $n \times 2n$ 矩阵 $(A | I)$，对其施行初等行变换：

$$(A | I) \xrightarrow{\text{初等行变换}} (I | A^{-1})$$

### 5.2 原理

设 $P_s \cdots P_1 A = I$，则 $A^{-1} = P_s \cdots P_1$。

对 $(A | I)$ 施行同样的行变换：

$$P_s \cdots P_1 (A | I) = (P_s \cdots P_1 A | P_s \cdots P_1) = (I | A^{-1})$$

### 5.3 示例

求 $A = \begin{pmatrix} 1 & 2 & 3 \\ 2 & 2 & 1 \\ 3 & 4 & 3 \end{pmatrix}$ 的逆矩阵。

$$(A | I) = \begin{pmatrix} 1 & 2 & 3 & 1 & 0 & 0 \\ 2 & 2 & 1 & 0 & 1 & 0 \\ 3 & 4 & 3 & 0 & 0 & 1 \end{pmatrix}$$

$$\xrightarrow{r_2 - 2r_1, r_3 - 3r_1} \begin{pmatrix} 1 & 2 & 3 & 1 & 0 & 0 \\ 0 & -2 & -5 & -2 & 1 & 0 \\ 0 & -2 & -6 & -3 & 0 & 1 \end{pmatrix}$$

$$\xrightarrow{r_3 - r_2} \begin{pmatrix} 1 & 2 & 3 & 1 & 0 & 0 \\ 0 & -2 & -5 & -2 & 1 & 0 \\ 0 & 0 & -1 & -1 & -1 & 1 \end{pmatrix}$$

$$\xrightarrow{r_2 - 5r_3, r_1 + 3r_3} \begin{pmatrix} 1 & 2 & 0 & -2 & -3 & 3 \\ 0 & -2 & 0 & 3 & 6 & -5 \\ 0 & 0 & -1 & -1 & -1 & 1 \end{pmatrix}$$

$$\xrightarrow{r_1 + r_2} \begin{pmatrix} 1 & 0 & 0 & 1 & 3 & -2 \\ 0 & -2 & 0 & 3 & 6 & -5 \\ 0 & 0 & -1 & -1 & -1 & 1 \end{pmatrix}$$

$$\xrightarrow{-\frac{1}{2}r_2, -r_3} \begin{pmatrix} 1 & 0 & 0 & 1 & 3 & -2 \\ 0 & 1 & 0 & -3/2 & -3 & 5/2 \\ 0 & 0 & 1 & 1 & 1 & -1 \end{pmatrix}$$

$$A^{-1} = \begin{pmatrix} 1 & 3 & -2 \\ -3/2 & -3 & 5/2 \\ 1 & 1 & -1 \end{pmatrix}$$

## 6. 初等变换的其他应用

### 6.1 求矩阵的秩

将矩阵化为行阶梯形，非零行的行数即为秩。

### 6.2 解线性方程组

对增广矩阵施行初等行变换，化为行最简形。

### 6.3 求解矩阵方程

对于 $AX = B$：

$$(A | B) \xrightarrow{\text{行变换}} (I | A^{-1}B)$$

### 6.4 判断向量组的线性相关性

将向量按列排成矩阵，化为行阶梯形，根据秩判断。
