---
order: 13
title: 行列式计算方法
module: 'linear-algebra'
category: 'comp-sci'
difficulty: intermediate
description: 行列式常用计算方法：化上三角法、范德蒙德行列式、拉普拉斯展开、递推法、数学归纳法、加边法、特征值法等。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'linear-algebra/行列式基本性质'
  - 'linear-algebra/行列式按行列展开'
  - 'linear-algebra/克莱姆法则'
  - 'linear-algebra/行列式典型例题'
prerequisites: []
---

## 1. 化上三角法

### 1.1 方法原理

利用行列式的性质六（行倍加不变），将行列式化为上三角行列式，然后取主对角线元素之积。

$$\begin{vmatrix} a_{11} & a_{12} & \cdots & a_{1n} \\ a_{21} & a_{22} & \cdots & a_{2n} \\ \vdots & \vdots & \ddots & \vdots \\ a_{n1} & a_{n2} & \cdots & a_{nn} \end{vmatrix} \xrightarrow{\text{行变换}} \begin{vmatrix} b_{11} & b_{12} & \cdots & b_{1n} \\ 0 & b_{22} & \cdots & b_{2n} \\ \vdots & \vdots & \ddots & \vdots \\ 0 & 0 & \cdots & b_{nn} \end{vmatrix} = b_{11}b_{22} \cdots b_{nn}$$

### 1.2 计算步骤

1. 若 $a_{11} = 0$，交换行（列）使 $a_{11} \neq 0$（注意变号）
2. 用第一行消去下方元素：$r_i - \frac{a_{i1}}{a_{11}} r_1$
3. 对右下角的 $(n-1)$ 阶子式重复上述过程
4. 最终化为上三角，取对角线之积

**示例**：计算 $\begin{vmatrix} 1 & 2 & 3 \\ 2 & 5 & 7 \\ 3 & 7 & 12 \end{vmatrix}$

$$\xrightarrow{r_2 - 2r_1, r_3 - 3r_1} \begin{vmatrix} 1 & 2 & 3 \\ 0 & 1 & 1 \\ 0 & 1 & 3 \end{vmatrix} \xrightarrow{r_3 - r_2} \begin{vmatrix} 1 & 2 & 3 \\ 0 & 1 & 1 \\ 0 & 0 & 2 \end{vmatrix} = 1 \times 1 \times 2 = 2$$

## 2. 范德蒙德行列式

### 2.1 定义

$n$ 阶**范德蒙德行列式**（Vandermonde determinant）为：

$$V_n = \begin{vmatrix} 1 & 1 & \cdots & 1 \\ x_1 & x_2 & \cdots & x_n \\ x_1^2 & x_2^2 & \cdots & x_n^2 \\ \vdots & \vdots & \ddots & \vdots \\ x_1^{n-1} & x_2^{n-1} & \cdots & x_n^{n-1} \end{vmatrix} = \prod_{1 \leq j < i \leq n}(x_i - x_j)$$

### 2.2 展开形式

$$V_n = (x_2 - x_1)(x_3 - x_1) \cdots (x_n - x_1)(x_3 - x_2)(x_4 - x_2) \cdots (x_n - x_2) \cdots (x_n - x_{n-1})$$

共有 $\dfrac{n(n-1)}{2}$ 个因子。

### 2.3 证明思路

从最后一行开始，每行减去上一行的 $x_1$ 倍：

$$V_n = \begin{vmatrix} 1 & 1 & \cdots & 1 \\ 0 & x_2 - x_1 & \cdots & x_n - x_1 \\ 0 & x_2(x_2-x_1) & \cdots & x_n(x_n-x_1) \\ \vdots & \vdots & \ddots & \vdots \\ 0 & x_2^{n-2}(x_2-x_1) & \cdots & x_n^{n-2}(x_n-x_1) \end{vmatrix}$$

按第一列展开，再提取各列公因子：

$$V_n = \prod_{i=2}^{n}(x_i - x_1) \cdot V_{n-1}(x_2, \ldots, x_n)$$

递推即得。

### 2.4 应用

**示例**：计算 $\begin{vmatrix} 1 & 1 & 1 & 1 \\ 1 & 2 & 3 & 4 \\ 1 & 4 & 9 & 16 \\ 1 & 8 & 27 & 64 \end{vmatrix}$

这是 $x_1 = 1, x_2 = 2, x_3 = 3, x_4 = 4$ 的范德蒙德行列式：

$$V_4 = (2-1)(3-1)(4-1)(3-2)(4-2)(4-3) = 1 \times 2 \times 3 \times 1 \times 2 \times 1 = 12$$

## 3. 拉普拉斯展开

### 3.1 定义

拉普拉斯展开是按行（列）展开定理的推广，允许同时按多行（列）展开。

**定理**：在 $n$ 阶行列式 $|A|$ 中，任意取定 $k$ 行（列）（$1 \leq k < n$），由这 $k$ 行（列）元素所组成的一切 $k$ 阶子式与它们的代数余子式的乘积之和等于 $|A|$。

$$|A| = \sum_{1 \leq j_1 < j_2 < \cdots < j_k \leq n} M_{j_1 j_2 \cdots j_k} \cdot A_{j_1 j_2 \cdots j_k}$$

其中 $M_{j_1 j_2 \cdots j_k}$ 是由取定的 $k$ 行和第 $j_1, j_2, \ldots, j_k$ 列交叉元素组成的 $k$ 阶子式，$A_{j_1 j_2 \cdots j_k}$ 是其代数余子式。

### 3.2 应用场景

当行列式中某些行（列）含有较多零元素，或具有分块结构时，拉普拉斯展开特别有效。

**示例**：计算 $\begin{vmatrix} 1 & 2 & 0 & 0 \\ 3 & 4 & 0 & 0 \\ 0 & 0 & 5 & 6 \\ 0 & 0 & 7 & 8 \end{vmatrix}$

按前两行进行拉普拉斯展开，非零子式只有 $M_{12,12}$：

$$= \begin{vmatrix} 1 & 2 \\ 3 & 4 \end{vmatrix} \cdot \begin{vmatrix} 5 & 6 \\ 7 & 8 \end{vmatrix} = (4-6)(40-42) = (-2)(-2) = 4$$

一般地，分块对角行列式：

$$\begin{vmatrix} A & O \\ O & B \end{vmatrix} = |A| \cdot |B|$$

## 4. 递推法

### 4.1 方法原理

对具有规律性结构的行列式，通过展开建立递推关系，然后求解递推关系。

### 4.2 典型示例

**箭形行列式**：

$$D_n = \begin{vmatrix} a_1 & b_2 & b_3 & \cdots & b_n \\ c_2 & a_2 & 0 & \cdots & 0 \\ c_3 & 0 & a_3 & \cdots & 0 \\ \vdots & \vdots & \vdots & \ddots & \vdots \\ c_n & 0 & 0 & \cdots & a_n \end{vmatrix}$$

**解法**：各列提取 $a_i$ 后（$i \geq 2$），将各列的适当倍数加到第一列，消去 $c_i$：

$$D_n = \prod_{i=2}^{n} a_i \cdot \left(a_1 - \sum_{i=2}^{n} \frac{b_i c_i}{a_i}\right)$$

## 5. 加边法（升阶法）

### 5.1 方法原理

在原行列式基础上添加一行一列，使新行列式更容易计算，且新行列式等于原行列式。

$$D_n = \begin{vmatrix} 1 & * & * & \cdots & * \\ 0 & & & & \\ 0 & & D_n & & \\ \vdots & & & & \\ 0 & & & & \end{vmatrix}$$

### 5.2 典型示例

计算 $D_n = \begin{vmatrix} 1+a_1 & 1 & \cdots & 1 \\ 1 & 1+a_2 & \cdots & 1 \\ \vdots & \vdots & \ddots & \vdots \\ 1 & 1 & \cdots & 1+a_n \end{vmatrix}$（$a_i \neq 0$）

**解法**：加边

$$D_n = \begin{vmatrix} 1 & 1 & 1 & \cdots & 1 \\ 0 & 1+a_1 & 1 & \cdots & 1 \\ 0 & 1 & 1+a_2 & \cdots & 1 \\ \vdots & \vdots & \vdots & \ddots & \vdots \\ 0 & 1 & 1 & \cdots & 1+a_n \end{vmatrix}$$

第一行乘 $(-1)$ 加到各行：

$$= \begin{vmatrix} 1 & 1 & 1 & \cdots & 1 \\ -1 & a_1 & 0 & \cdots & 0 \\ -1 & 0 & a_2 & \cdots & 0 \\ \vdots & \vdots & \vdots & \ddots & \vdots \\ -1 & 0 & 0 & \cdots & a_n \end{vmatrix}$$

各列除以 $a_i$ 后，将各列加到第一列：

$$= \prod_{i=1}^{n} a_i \cdot \begin{vmatrix} 1 + \sum_{i=1}^{n}\frac{1}{a_i} & \frac{1}{a_1} & \cdots & \frac{1}{a_n} \\ 0 & 1 & \cdots & 0 \\ \vdots & \vdots & \ddots & \vdots \\ 0 & 0 & \cdots & 1 \end{vmatrix}$$

$$= \prod_{i=1}^{n} a_i \cdot \left(1 + \sum_{i=1}^{n}\frac{1}{a_i}\right)$$

## 6. 数学归纳法

### 6.1 方法步骤

1. 通过低阶情形猜测行列式的值
2. 用数学归纳法证明

**示例**：证明 $D_n = \begin{vmatrix} a & -1 & 0 & \cdots & 0 \\ 0 & a & -1 & \cdots & 0 \\ 0 & 0 & a & \cdots & 0 \\ \vdots & \vdots & \vdots & \ddots & \vdots \\ 0 & 0 & 0 & \cdots & a \end{vmatrix}_{n \times n} = a^n$

这是上三角行列式，显然 $D_n = a^n$。

## 7. 特征值法

### 7.1 方法原理

若 $A$ 的特征值为 $\lambda_1, \lambda_2, \ldots, \lambda_n$，则 $|A| = \lambda_1 \lambda_2 \cdots \lambda_n$。

### 7.2 应用

对于某些特殊矩阵，求特征值比直接计算行列式更方便。

**示例**：计算 $|A|$，其中 $A = \begin{pmatrix} 2 & 1 & 1 \\ 1 & 2 & 1 \\ 1 & 1 & 2 \end{pmatrix}$

$A$ 的特征多项式：$|\lambda I - A| = (\lambda-1)^2(\lambda-4)$

特征值为 $\lambda_1 = \lambda_2 = 1$，$\lambda_3 = 4$，故 $|A| = 1 \times 1 \times 4 = 4$。

## 8. 计算方法选择指南

| 行列式特征       | 推荐方法                   |
| ---------------- | -------------------------- |
| 数字行列式       | 化上三角法                 |
| 含参数行列式     | 化上三角法或展开法         |
| 有较多零元素     | 按零多的行（列）展开       |
| 分块结构         | 拉普拉斯展开               |
| 规律性结构       | 递推法或归纳法             |
| $x_i^{j-1}$ 形式 | 范德蒙德行列式             |
| 行（列）和相等   | 各行（列）加到同一行（列） |
| 抽象矩阵         | 特征值法或性质推导         |
