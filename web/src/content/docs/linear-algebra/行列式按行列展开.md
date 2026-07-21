---
order: 12
title: 行列式按行列展开
module: 'linear-algebra'
category: 'comp-sci'
difficulty: intermediate
description: 余子式与代数余子式的定义，行列式按行（列）展开定理，代数余子式的性质，展开定理的应用。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'linear-algebra/行列式定义与几何意义'
  - 'linear-algebra/行列式基本性质'
  - 'linear-algebra/行列式计算方法'
  - 'linear-algebra/克莱姆法则'
prerequisites: []
---

## 1. 余子式与代数余子式

### 1.1 余子式

在 $n$ 阶行列式 $|A|$ 中，划去元素 $a_{ij}$ 所在的第 $i$ 行和第 $j$ 列后，剩下的元素按原顺序构成的 $n-1$ 阶行列式，称为 $a_{ij}$ 的**余子式**，记作 $M_{ij}$。

$$M_{ij} = \begin{vmatrix} a_{11} & \cdots & a_{1,j-1} & a_{1,j+1} & \cdots & a_{1n} \\ \vdots & & \vdots & \vdots & & \vdots \\ a_{i-1,1} & \cdots & a_{i-1,j-1} & a_{i-1,j+1} & \cdots & a_{i-1,n} \\ a_{i+1,1} & \cdots & a_{i+1,j-1} & a_{i+1,j+1} & \cdots & a_{i+1,n} \\ \vdots & & \vdots & \vdots & & \vdots \\ a_{n1} & \cdots & a_{n,j-1} & a_{n,j+1} & \cdots & a_{nn} \end{vmatrix}$$

### 1.2 代数余子式

$a_{ij}$ 的**代数余子式**定义为：

$$A_{ij} = (-1)^{i+j} M_{ij}$$

符号规律：$(-1)^{i+j}$ 的符号可以用"棋盘法则"记忆——从 $(1,1)$ 位置开始，正负交替：

$$\begin{pmatrix} + & - & + & \cdots \\ - & + & - & \cdots \\ + & - & + & \cdots \\ \vdots & \vdots & \vdots & \ddots \end{pmatrix}$$

**示例**：设 $|A| = \begin{vmatrix} 1 & 2 & 3 \\ 4 & 5 & 6 \\ 7 & 8 & 9 \end{vmatrix}$，求 $A_{23}$。

$$M_{23} = \begin{vmatrix} 1 & 2 \\ 7 & 8 \end{vmatrix} = 8 - 14 = -6$$

$$A_{23} = (-1)^{2+3} M_{23} = (-1)^5 \times (-6) = 6$$

## 2. 行列式按行（列）展开定理

### 2.1 展开定理

**定理**：行列式等于它的任意一行（列）的各元素与其对应的代数余子式的乘积之和。

**按第 $i$ 行展开**：

$$|A| = a_{i1}A_{i1} + a_{i2}A_{i2} + \cdots + a_{in}A_{in} = \sum_{j=1}^{n} a_{ij}A_{ij}$$

**按第 $j$ 列展开**：

$$|A| = a_{1j}A_{1j} + a_{2j}A_{2j} + \cdots + a_{nj}A_{nj} = \sum_{i=1}^{n} a_{ij}A_{ij}$$

### 2.2 展开定理的证明思路

以三阶行列式按第一行展开为例：

$$\begin{vmatrix} a_{11} & a_{12} & a_{13} \\ a_{21} & a_{22} & a_{23} \\ a_{31} & a_{32} & a_{33} \end{vmatrix} = a_{11} \begin{vmatrix} a_{22} & a_{23} \\ a_{32} & a_{33} \end{vmatrix} - a_{12} \begin{vmatrix} a_{21} & a_{23} \\ a_{31} & a_{33} \end{vmatrix} + a_{13} \begin{vmatrix} a_{21} & a_{22} \\ a_{31} & a_{32} \end{vmatrix}$$

$$= a_{11}A_{11} + a_{12}A_{12} + a_{13}A_{13}$$

### 2.3 展开定理的意义

展开定理将 $n$ 阶行列式的计算降为 $n-1$ 阶行列式的计算，实现了**降阶**。当某行（列）有较多零元素时，展开特别方便。

## 3. 代数余子式的重要性质

### 3.1 异行（列）代数余子式乘积之和为零

**定理**：行列式某一行（列）的元素与另一行（列）对应元素的代数余子式乘积之和为零。

$$a_{i1}A_{j1} + a_{i2}A_{j2} + \cdots + a_{in}A_{jn} = 0 \quad (i \neq j)$$

$$a_{1i}A_{1j} + a_{2i}A_{2j} + \cdots + a_{ni}A_{nj} = 0 \quad (i \neq j)$$

**证明思路**：$a_{i1}A_{j1} + a_{i2}A_{j2} + \cdots + a_{in}A_{jn}$ 相当于将行列式第 $j$ 行替换为第 $i$ 行后按第 $j$ 行展开，此时行列式有两行相同，值为零。

### 3.2 综合公式

$$\sum_{k=1}^{n} a_{ik}A_{jk} = \begin{cases} |A|, & i = j \\ 0, & i \neq j \end{cases}$$

$$\sum_{k=1}^{n} a_{ki}A_{kj} = \begin{cases} |A|, & i = j \\ 0, & i \neq j \end{cases}$$

用克罗内克符号（Kronecker delta）表示：

$$\sum_{k=1}^{n} a_{ik}A_{jk} = |A| \cdot \delta_{ij}$$

## 4. 展开定理的应用

### 4.1 选择零元素多的行（列）展开

**示例**：计算 $\begin{vmatrix} 3 & 0 & 0 & 0 \\ 2 & 1 & 0 & 0 \\ 1 & 2 & 2 & 0 \\ 4 & 3 & 1 & 3 \end{vmatrix}$

按第一行展开：

$$= 3 \times \begin{vmatrix} 1 & 0 & 0 \\ 2 & 2 & 0 \\ 3 & 1 & 3 \end{vmatrix} = 3 \times 1 \times \begin{vmatrix} 2 & 0 \\ 1 & 3 \end{vmatrix} = 3 \times 1 \times 6 = 18$$

### 4.2 先化简再展开

**示例**：计算 $\begin{vmatrix} 1 & 2 & 3 \\ 1 & 3 & 5 \\ 2 & 5 & 8 \end{vmatrix}$

$$\xrightarrow{r_2 - r_1, r_3 - 2r_1} \begin{vmatrix} 1 & 2 & 3 \\ 0 & 1 & 2 \\ 0 & 1 & 2 \end{vmatrix} = 0$$

（第2行与第3行相同）

### 4.3 利用代数余子式求和

**示例**：设 $|A| = \begin{vmatrix} 1 & 2 & 3 \\ 4 & 5 & 6 \\ 7 & 8 & 9 \end{vmatrix}$，求 $A_{11} + A_{12} + A_{13}$。

由展开定理：$1 \cdot A_{11} + 2 \cdot A_{12} + 3 \cdot A_{13} = |A|$

但我们需要的是 $A_{11} + A_{12} + A_{13}$，这相当于将第一行替换为 $(1,1,1)$ 后的行列式：

$$A_{11} + A_{12} + A_{13} = \begin{vmatrix} 1 & 1 & 1 \\ 4 & 5 & 6 \\ 7 & 8 & 9 \end{vmatrix} = \begin{vmatrix} 1 & 1 & 1 \\ 0 & 1 & 2 \\ 0 & 1 & 2 \end{vmatrix} = 0$$

### 4.4 求代数余子式的线性组合

**关键技巧**：$k_1 A_{i1} + k_2 A_{i2} + \cdots + k_n A_{in}$ 等于将第 $i$ 行替换为 $(k_1, k_2, \ldots, k_n)$ 后的行列式。

**示例**：设 $D = \begin{vmatrix} 2 & 1 & 3 \\ 1 & 2 & 1 \\ 3 & 1 & 2 \end{vmatrix}$，求 $2A_{21} + A_{22} + 3A_{23}$。

这等于将第二行替换为 $(2, 1, 3)$ 后的行列式：

$$\begin{vmatrix} 2 & 1 & 3 \\ 2 & 1 & 3 \\ 3 & 1 & 2 \end{vmatrix} = 0$$

（第1行与第2行相同）

## 5. 递推法与展开定理

对于具有递推结构的行列式，展开定理可以建立递推关系。

**示例**：计算 $n$ 阶行列式 $D_n = \begin{vmatrix} a & b & 0 & \cdots & 0 & 0 \\ c & a & b & \cdots & 0 & 0 \\ 0 & c & a & \cdots & 0 & 0 \\ \vdots & \vdots & \vdots & \ddots & \vdots & \vdots \\ 0 & 0 & 0 & \cdots & a & b \\ 0 & 0 & 0 & \cdots & c & a \end{vmatrix}$（三对角行列式）

按第一行展开：

$$D_n = a \cdot D_{n-1} - b \cdot c \cdot D_{n-2}$$

这是一个二阶线性递推关系，特征方程为 $t^2 - at + bc = 0$。

当 $a^2 - 4bc > 0$ 时，设特征根为 $t_1, t_2$，则 $D_n = C_1 t_1^n + C_2 t_2^n$。

当 $a^2 = 4bc$ 时，$D_n = (C_1 + C_2 n) t^n$，其中 $t = a/2$。
