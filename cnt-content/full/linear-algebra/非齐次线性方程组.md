---
order: 33
title: 非齐次线性方程组
module: 'linear-algebra'
category: 'comp-sci'
difficulty: intermediate
description: 非齐次线性方程组的解的结构，特解与通解的关系，导出组的概念，非齐次方程组通解的求法。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'linear-algebra/解的存在性判定'
  - 'linear-algebra/齐次线性方程组'
  - 'linear-algebra/解的结构'
  - 'linear-algebra/线性方程组典型例题'
prerequisites:
  - 'linear-algebra/行列式定义与几何意义'
---

## 1. 非齐次线性方程组的基本概念

### 1.1 定义

非齐次线性方程组 $Ax = b$（$b \neq 0$）对应的齐次方程组 $Ax = 0$ 称为**导出组**。

### 1.2 解的性质

1. 若 $\boldsymbol{\eta}_1, \boldsymbol{\eta}_2$ 是 $Ax = b$ 的解，则 $\boldsymbol{\eta}_1 - \boldsymbol{\eta}_2$ 是导出组 $Ax = 0$ 的解
2. 若 $\boldsymbol{\eta}$ 是 $Ax = b$ 的解，$\boldsymbol{\xi}$ 是 $Ax = 0$ 的解，则 $\boldsymbol{\eta} + \boldsymbol{\xi}$ 是 $Ax = b$ 的解
3. $Ax = b$ 的解集不构成向量空间（除非 $b = 0$）

**性质1的证明**：$A(\boldsymbol{\eta}_1 - \boldsymbol{\eta}_2) = A\boldsymbol{\eta}_1 - A\boldsymbol{\eta}_2 = b - b = 0$

**性质2的证明**：$A(\boldsymbol{\eta} + \boldsymbol{\xi}) = A\boldsymbol{\eta} + A\boldsymbol{\xi} = b + 0 = b$

## 2. 解的结构定理

### 2.1 定理内容

设 $Ax = b$ 有解，$\boldsymbol{\eta}^*$ 是 $Ax = b$ 的一个**特解**，$\boldsymbol{\xi}_1, \boldsymbol{\xi}_2, \ldots, \boldsymbol{\xi}_{n-r}$ 是导出组 $Ax = 0$ 的基础解系，则 $Ax = b$ 的**通解**为：

$$x = \boldsymbol{\eta}^* + k_1\boldsymbol{\xi}_1 + k_2\boldsymbol{\xi}_2 + \cdots + k_{n-r}\boldsymbol{\xi}_{n-r}$$

其中 $k_1, k_2, \ldots, k_{n-r}$ 为任意常数。

### 2.2 几何意义

非齐次方程组的解集是导出组解空间的一个**平移**（仿射子空间）。

- 齐次方程组的解集：过原点的子空间
- 非齐次方程组的解集：该子空间平移到特解位置

### 2.3 解的个数

| 情形 | 解的个数 |
| -------------- | ----------- | ------------------------------ |
| $r(A) \neq r(A | b)$ | 无解 |
| $r(A) = r(A    | b) = n$ | 唯一解 |
| $r(A) = r(A    | b) = r < n$ | 无穷多解（$n - r$ 个自由参数） |

## 3. 非齐次方程组通解的求法

### 3.1 步骤

1. 对增广矩阵 $(A|b)$ 施行初等行变换，化为行最简形
2. 判断解的情况（比较 $r(A)$ 和 $r(A|b)$）
3. 若有解，写出同解方程组
4. 确定主变量和自由变量
5. 求出一个特解 $\boldsymbol{\eta}^*$（令自由变量全为零）
6. 求导出组的基础解系 $\boldsymbol{\xi}_1, \ldots, \boldsymbol{\xi}_{n-r}$
7. 通解 $x = \boldsymbol{\eta}^* + k_1\boldsymbol{\xi}_1 + \cdots + k_{n-r}\boldsymbol{\xi}_{n-r}$

### 3.2 示例

求方程组 $\begin{cases} x_1 + x_2 - x_3 + 2x_4 = 3 \\ 2x_1 + x_2 - 3x_3 + 4x_4 = 5 \\ x_1 - x_3 + 2x_4 = 2 \end{cases}$ 的通解。

**步骤1**：化增广矩阵为行最简形

$$(A|b) = \begin{pmatrix} 1 & 1 & -1 & 2 & 3 \\ 2 & 1 & -3 & 4 & 5 \\ 1 & 0 & -1 & 2 & 2 \end{pmatrix}$$

$$\xrightarrow{r_2 - 2r_1, r_3 - r_1} \begin{pmatrix} 1 & 1 & -1 & 2 & 3 \\ 0 & -1 & -1 & 0 & -1 \\ 0 & -1 & 0 & 0 & -1 \end{pmatrix}$$

$$\xrightarrow{r_3 - r_2} \begin{pmatrix} 1 & 1 & -1 & 2 & 3 \\ 0 & -1 & -1 & 0 & -1 \\ 0 & 0 & 1 & 0 & 0 \end{pmatrix}$$

$$\xrightarrow{-r_2} \begin{pmatrix} 1 & 1 & -1 & 2 & 3 \\ 0 & 1 & 1 & 0 & 1 \\ 0 & 0 & 1 & 0 & 0 \end{pmatrix}$$

$$\xrightarrow{r_2 - r_3, r_1 + r_3} \begin{pmatrix} 1 & 1 & 0 & 2 & 3 \\ 0 & 1 & 0 & 0 & 1 \\ 0 & 0 & 1 & 0 & 0 \end{pmatrix}$$

$$\xrightarrow{r_1 - r_2} \begin{pmatrix} 1 & 0 & 0 & 2 & 2 \\ 0 & 1 & 0 & 0 & 1 \\ 0 & 0 & 1 & 0 & 0 \end{pmatrix}$$

**步骤2**：$r(A) = r(A|b) = 3 < 4$，有无穷多解。

**步骤3**：同解方程组 $\begin{cases} x_1 + 2x_4 = 2 \\ x_2 = 1 \\ x_3 = 0 \end{cases}$

**步骤4**：主变量 $x_1, x_2, x_3$，自由变量 $x_4$。

**步骤5**：令 $x_4 = 0$，得特解 $\boldsymbol{\eta}^* = (2, 1, 0, 0)^T$。

**步骤6**：导出组 $\begin{cases} x_1 + 2x_4 = 0 \\ x_2 = 0 \\ x_3 = 0 \end{cases}$，令 $x_4 = 1$，得 $\boldsymbol{\xi} = (-2, 0, 0, 1)^T$。

**步骤7**：通解 $x = (2, 1, 0, 0)^T + k(-2, 0, 0, 1)^T$（$k$ 为任意常数）。

## 4. 特解的不同取法

### 4.1 自由变量取零值

最常用的方法：令所有自由变量为零，求出主变量的值，得到特解。

### 4.2 自由变量取其他值

也可以令自由变量取其他值，得到的特解不同，但通解等价。

**示例**：在上例中，令 $x_4 = 1$，得特解 $\boldsymbol{\eta}' = (0, 1, 0, 1)^T$。

通解 $x = (0, 1, 0, 1)^T + k(-2, 0, 0, 1)^T$。

取 $k = -1$：$x = (2, 1, 0, 0)^T$，与前面的特解一致。

## 5. 非齐次方程组与齐次方程组的关系

### 5.1 解集的关系

设 $S$ 为 $Ax = b$ 的解集，$S_0$ 为 $Ax = 0$ 的解集，$\boldsymbol{\eta}^*$ 为 $Ax = b$ 的特解，则：

$$S = \boldsymbol{\eta}^* + S_0 = \{\boldsymbol{\eta}^* + \boldsymbol{\xi} \mid \boldsymbol{\xi} \in S_0\}$$

### 5.2 解的差

$Ax = b$ 的任意两个解之差是 $Ax = 0$ 的解。

### 5.3 解的和

$Ax = b_1$ 的解与 $Ax = b_2$ 的解之和是 $A(x_1 + x_2) = b_1 + b_2$ 的解。

## 6. 典型例题

### 例1

设 $A$ 为 $4 \times 5$ 矩阵，$r(A) = 3$，$\boldsymbol{\eta}_1, \boldsymbol{\eta}_2, \boldsymbol{\eta}_3$ 是 $Ax = b$ 的三个线性无关的解，求 $Ax = b$ 的通解。

**解**：$r(A) = 3$，$n = 5$，基础解系含 $5 - 3 = 2$ 个向量。

$\boldsymbol{\eta}_2 - \boldsymbol{\eta}_1$ 和 $\boldsymbol{\eta}_3 - \boldsymbol{\eta}_1$ 是 $Ax = 0$ 的解。

若 $k_1(\boldsymbol{\eta}_2 - \boldsymbol{\eta}_1) + k_2(\boldsymbol{\eta}_3 - \boldsymbol{\eta}_1) = 0$，则 $-k_1\boldsymbol{\eta}_1 - k_2\boldsymbol{\eta}_1 + k_1\boldsymbol{\eta}_2 + k_2\boldsymbol{\eta}_3 = 0$。

由 $\boldsymbol{\eta}_1, \boldsymbol{\eta}_2, \boldsymbol{\eta}_3$ 线性无关，得 $k_1 = k_2 = 0$。

故 $\boldsymbol{\eta}_2 - \boldsymbol{\eta}_1$ 和 $\boldsymbol{\eta}_3 - \boldsymbol{\eta}_1$ 线性无关，构成基础解系。

通解：$x = \boldsymbol{\eta}_1 + k_1(\boldsymbol{\eta}_2 - \boldsymbol{\eta}_1) + k_2(\boldsymbol{\eta}_3 - \boldsymbol{\eta}_1)$

### 例2

设 $\boldsymbol{\alpha}_1, \boldsymbol{\alpha}_2, \boldsymbol{\alpha}_3$ 是 $Ax = b$ 的解，$\boldsymbol{\beta}_1, \boldsymbol{\beta}_2$ 是 $Ax = 0$ 的基础解系，$k_1, k_2$ 为任意常数，则 $Ax = b$ 的通解是？

**解**：$Ax = b$ 的通解 = 特解 + 导出组的通解。

特解可取 $\boldsymbol{\alpha}_1$（或 $\boldsymbol{\alpha}_2, \boldsymbol{\alpha}_3$），导出组通解为 $k_1\boldsymbol{\beta}_1 + k_2\boldsymbol{\beta}_2$。

通解：$x = \boldsymbol{\alpha}_1 + k_1\boldsymbol{\beta}_1 + k_2\boldsymbol{\beta}_2$。

注意：$\boldsymbol{\alpha}_1 + \boldsymbol{\alpha}_2$ 不是 $Ax = b$ 的解（$A(\boldsymbol{\alpha}_1 + \boldsymbol{\alpha}_2) = 2b \neq b$），$\dfrac{\boldsymbol{\alpha}_1 + \boldsymbol{\alpha}_2}{2}$ 才是特解。
