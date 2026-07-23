---
order: 11
title: 行列式基本性质
module: 'linear-algebra'
category: 'comp-sci'
difficulty: beginner
description: 行列式的7条基本性质：转置不变性、行（列）交换变号、行（列）公因子提取、行（列）可加性、行（列）成比例则为零、行（列）倍加不变、乘法公式。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'linear-algebra/行列式定义与几何意义'
  - 'linear-algebra/行列式按行列展开'
  - 'linear-algebra/行列式计算方法'
prerequisites: []
---

## 1. 性质概述

行列式具有以下七条基本性质，它们是计算和化简行列式的基础。设 $A$ 为 $n$ 阶方阵，$|A|$ 或 $\det(A)$ 表示其行列式。

## 2. 性质一：转置不变性

$$|A^T| = |A|$$

行列式转置后值不变。这意味着行列式对行成立的性质对列也同样成立。

**证明思路**：设 $A = (a_{ij})$，$A^T = (a_{ji})$，则：

$$|A^T| = \sum (-1)^{\tau(p_1 p_2 \cdots p_n)} a_{p_1 1} a_{p_2 2} \cdots a_{p_n n} = |A|$$

**推论**：凡是对行成立的性质，对列也成立。

## 3. 性质二：行（列）交换变号

交换行列式的任意两行（列），行列式变号。

$$\xrightarrow{r_i \leftrightarrow r_j} |A'| = -|A|$$

**证明思路**：交换两行相当于对排列做一次对换，排列的奇偶性改变，故每一项的符号都改变，总和变号。

**推论**：若行列式有两行（列）完全相同，则行列式为零。

> 证明：设第 $i$ 行与第 $j$ 行相同，交换这两行得 $|A'| = -|A|$，但交换后行列式不变 $|A'| = |A|$，故 $|A| = -|A|$，即 $|A| = 0$。

## 4. 性质三：行（列）公因子提取

行列式某行（列）的公因子可以提到行列式外面。

$$\begin{vmatrix} a_{11} & a_{12} & \cdots & a_{1n} \\ \vdots & \vdots & & \vdots \\ ka_{i1} & ka_{i2} & \cdots & ka_{in} \\ \vdots & \vdots & & \vdots \\ a_{n1} & a_{n2} & \cdots & a_{nn} \end{vmatrix} = k \begin{vmatrix} a_{11} & a_{12} & \cdots & a_{1n} \\ \vdots & \vdots & & \vdots \\ a_{i1} & a_{i2} & \cdots & a_{in} \\ \vdots & \vdots & & \vdots \\ a_{n1} & a_{n2} & \cdots & a_{nn} \end{vmatrix}$$

**注意**：$|kA| = k^n|A|$（不是 $k|A|$），因为每行都有公因子 $k$，共 $n$ 行。

**示例**：

$$\begin{vmatrix} 2 & 4 \\ 6 & 8 \end{vmatrix} = 2 \begin{vmatrix} 1 & 2 \\ 6 & 8 \end{vmatrix} = 2 \times 2 \begin{vmatrix} 1 & 2 \\ 3 & 4 \end{vmatrix} = 4 \times (4-6) = -8$$

验证：$2 \times 8 - 4 \times 6 = 16 - 24 = -8$

## 5. 性质四：行（列）成比例则为零

若行列式有两行（列）成比例，则行列式为零。

$$\text{若第 } i \text{ 行} = k \times \text{第 } j \text{ 行，则 } |A| = 0$$

**证明**：由性质三，将第 $i$ 行的公因子 $k$ 提出后，第 $i$ 行与第 $j$ 行相同，由性质二的推论知行列式为零。

**特例**：若行列式有一行（列）全为零，则行列式为零（$k = 0$ 的情形）。

## 6. 性质五：行（列）可加性（拆行/列）

若行列式的某行（列）可以拆成两个元素之和，则行列式可拆成两个行列式之和。

$$\begin{vmatrix} a_{11} & a_{12} & \cdots & a_{1n} \\ \vdots & \vdots & & \vdots \\ b_{i1} + c_{i1} & b_{i2} + c_{i2} & \cdots & b_{in} + c_{in} \\ \vdots & \vdots & & \vdots \\ a_{n1} & a_{n2} & \cdots & a_{nn} \end{vmatrix} = \begin{vmatrix} a_{11} & a_{12} & \cdots & a_{1n} \\ \vdots & \vdots & & \vdots \\ b_{i1} & b_{i2} & \cdots & b_{in} \\ \vdots & \vdots & & \vdots \\ a_{n1} & a_{n2} & \cdots & a_{nn} \end{vmatrix} + \begin{vmatrix} a_{11} & a_{12} & \cdots & a_{1n} \\ \vdots & \vdots & & \vdots \\ c_{i1} & c_{i2} & \cdots & c_{in} \\ \vdots & \vdots & & \vdots \\ a_{n1} & a_{n2} & \cdots & a_{nn} \end{vmatrix}$$

**注意**：只能拆一行（列），其余行（列）保持不变。

**示例**：

$$\begin{vmatrix} 1+2 & 3+4 \\ 5 & 6 \end{vmatrix} = \begin{vmatrix} 1 & 3 \\ 5 & 6 \end{vmatrix} + \begin{vmatrix} 2 & 4 \\ 5 & 6 \end{vmatrix} = (6-15) + (12-20) = -9 + (-8) = -17$$

验证：$\begin{vmatrix} 3 & 7 \\ 5 & 6 \end{vmatrix} = 18 - 35 = -17$

## 7. 性质六：行（列）倍加不变

将行列式某行（列）的 $k$ 倍加到另一行（列）上，行列式值不变。

$$\xrightarrow{r_i + kr_j} |A'| = |A|$$

**证明**：利用性质五拆行，再利用性质四消去成比例的行。

$$\begin{vmatrix} \vdots \\ a_{i1} + ka_{j1} & \cdots & a_{in} + ka_{jn} \\ \vdots \\ a_{j1} & \cdots & a_{jn} \\ \vdots \end{vmatrix} = \begin{vmatrix} \vdots \\ a_{i1} & \cdots & a_{in} \\ \vdots \\ a_{j1} & \cdots & a_{jn} \\ \vdots \end{vmatrix} + \begin{vmatrix} \vdots \\ ka_{j1} & \cdots & ka_{jn} \\ \vdots \\ a_{j1} & \cdots & a_{jn} \\ \vdots \end{vmatrix}$$

第二个行列式中第 $i$ 行是第 $j$ 行的 $k$ 倍，故为零。

**这是化简行列式最常用的性质**，通过倍加变换可以将行列式化为上三角形式。

## 8. 性质七：乘法公式

$$|AB| = |A| \cdot |B|$$

**注意**：一般地，$|A + B| \neq |A| + |B|$。

**推论**：

1. $|A^k| = |A|^k$
2. $|A^{-1}| = |A|^{-1}$（当 $A$ 可逆时）
3. $|A^*| = |A|^{n-1}$（$A^*$ 为 $A$ 的伴随矩阵）

## 9. 性质的综合应用

### 9.1 利用性质化简行列式

**示例**：计算 $\begin{vmatrix} 1 & 2 & 3 \\ 4 & 5 & 6 \\ 7 & 8 & 9 \end{vmatrix}$

$$\xrightarrow{r_2 - 4r_1, r_3 - 7r_1} \begin{vmatrix} 1 & 2 & 3 \\ 0 & -3 & -6 \\ 0 & -6 & -12 \end{vmatrix} = \begin{vmatrix} 1 & 2 & 3 \\ 0 & -3 & -6 \\ 0 & 0 & 0 \end{vmatrix} = 0$$

（第二行 $-2$ 倍加到第三行，第三行全为零）

### 9.2 利用性质证明行列式为零

**常见情形**：

1. 两行（列）相同 → 性质二推论
2. 两行（列）成比例 → 性质四
3. 某行（列）全为零 → 性质三（$k=0$）
4. 可化为上述情形 → 性质六

### 9.3 抽象行列式的计算

**示例**：设 $A$ 为三阶方阵，$|A| = 2$，求 $|2A^{-1} - 3A^*|$。

由 $A^* = |A|A^{-1} = 2A^{-1}$，故：

$$2A^{-1} - 3A^* = 2A^{-1} - 3 \times 2A^{-1} = 2A^{-1} - 6A^{-1} = -4A^{-1}$$

$$|2A^{-1} - 3A^*| = |-4A^{-1}| = (-4)^3 |A^{-1}| = -64 \times \frac{1}{|A|} = -64 \times \frac{1}{2} = -32$$
