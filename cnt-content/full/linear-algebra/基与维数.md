---
order: 41
title: 基与维数
module: 'linear-algebra'
category: 'comp-sci'
difficulty: intermediate
description: 极大线性无关组的概念与求法，向量组的秩，向量空间的基与维数，基变换与坐标变换。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'linear-algebra/线性方程组典型例题'
  - 'linear-algebra/线性相关性'
  - 'linear-algebra/坐标与坐标变换'
  - 'linear-algebra/内积与正交性'
prerequisites:
  - 'linear-algebra/行列式定义与几何意义'
---

## 1. 极大线性无关组

### 1.1 定义

设 $S$ 是向量组 $\boldsymbol{\alpha}_1, \boldsymbol{\alpha}_2, \ldots, \boldsymbol{\alpha}_s$ 的一个部分组，若满足：

1. $S$ 线性无关
2. $S$ 中添加原向量组的任何一个向量后都线性相关

则称 $S$ 为向量组 $\boldsymbol{\alpha}_1, \boldsymbol{\alpha}_2, \ldots, \boldsymbol{\alpha}_s$ 的一个**极大线性无关组**。

### 1.2 等价定义

极大线性无关组是向量组中满足以下条件的部分组：

1. 线性无关
2. 原向量组中每个向量都可由它线性表示

即极大线性无关组与原向量组等价。

### 1.3 性质

1. 极大线性无关组不唯一，但所含向量个数唯一
2. 任意两个极大线性无关组等价
3. 线性无关向量组的极大线性无关组就是它本身

### 1.4 求法

**初等行变换法**：

1. 将向量按列排成矩阵 $A = (\boldsymbol{\alpha}_1, \boldsymbol{\alpha}_2, \ldots, \boldsymbol{\alpha}_s)$
2. 对 $A$ 施行初等行变换，化为行阶梯形
3. 行阶梯形中主元所在的列对应的原向量构成极大线性无关组

**示例**：求 $\boldsymbol{\alpha}_1 = (1, 2, 3)^T$，$\boldsymbol{\alpha}_2 = (2, 4, 6)^T$，$\boldsymbol{\alpha}_3 = (1, 1, 1)^T$，$\boldsymbol{\alpha}_4 = (0, 1, 2)^T$ 的极大线性无关组。

$$A = \begin{pmatrix} 1 & 2 & 1 & 0 \\ 2 & 4 & 1 & 1 \\ 3 & 6 & 1 & 2 \end{pmatrix} \xrightarrow{r_2-2r_1, r_3-3r_1} \begin{pmatrix} 1 & 2 & 1 & 0 \\ 0 & 0 & -1 & 1 \\ 0 & 0 & -2 & 2 \end{pmatrix}$$

$$\xrightarrow{r_3-2r_2} \begin{pmatrix} 1 & 2 & 1 & 0 \\ 0 & 0 & -1 & 1 \\ 0 & 0 & 0 & 0 \end{pmatrix}$$

主元在第1、3列，故 $\boldsymbol{\alpha}_1, \boldsymbol{\alpha}_3$ 是一个极大线性无关组。

## 2. 向量组的秩

### 2.1 定义

向量组的**秩**等于其极大线性无关组所含向量的个数。

### 2.2 矩阵的秩与向量组的秩

矩阵 $A$ 的秩 = $A$ 的行向量组的秩 = $A$ 的列向量组的秩

### 2.3 性质

1. $r(\boldsymbol{\alpha}_1, \ldots, \boldsymbol{\alpha}_s) \leq \min(s, n)$（$n$ 为向量维数）
2. $r(\boldsymbol{\alpha}_1, \ldots, \boldsymbol{\alpha}_s) = s \iff \boldsymbol{\alpha}_1, \ldots, \boldsymbol{\alpha}_s$ 线性无关
3. 若向量组 (I) 可由 (II) 线性表示，则 $r(\text{I}) \leq r(\text{II})$
4. 等价的向量组秩相同

### 2.4 秩与线性表示

设 $\boldsymbol{\beta}$ 可由 $\boldsymbol{\alpha}_1, \ldots, \boldsymbol{\alpha}_s$ 线性表示，则：

$$r(\boldsymbol{\alpha}_1, \ldots, \boldsymbol{\alpha}_s, \boldsymbol{\beta}) = r(\boldsymbol{\alpha}_1, \ldots, \boldsymbol{\alpha}_s)$$

反之亦然。

## 3. 向量空间的基与维数

### 3.1 向量空间的定义

设 $V$ 是 $\mathbb{R}^n$ 的非空子集，若满足：

1. 对加法封闭：$\boldsymbol{\alpha}, \boldsymbol{\beta} \in V \Rightarrow \boldsymbol{\alpha} + \boldsymbol{\beta} \in V$
2. 对数乘封闭：$\boldsymbol{\alpha} \in V, k \in \mathbb{R} \Rightarrow k\boldsymbol{\alpha} \in V$

则称 $V$ 为**向量空间**（$\mathbb{R}^n$ 的子空间）。

### 3.2 基的定义

向量空间 $V$ 中的向量组 $\boldsymbol{e}_1, \boldsymbol{e}_2, \ldots, \boldsymbol{e}_r$ 称为 $V$ 的一组**基**，若：

1. $\boldsymbol{e}_1, \boldsymbol{e}_2, \ldots, \boldsymbol{e}_r$ 线性无关
2. $V$ 中每个向量都可由 $\boldsymbol{e}_1, \boldsymbol{e}_2, \ldots, \boldsymbol{e}_r$ 线性表示

### 3.3 维数

向量空间 $V$ 的**维数** $\dim(V)$ 等于其基所含向量的个数。

### 3.4 常见向量空间

| 向量空间                  | 基                                           | 维数       |
| ------------------------- | -------------------------------------------- | ---------- |
| $\mathbb{R}^n$            | $\boldsymbol{e}_1, \ldots, \boldsymbol{e}_n$ | $n$        |
| $N(A)$（零空间）          | 基础解系                                     | $n - r(A)$ |
| $\text{Col}(A)$（列空间） | $A$ 的列向量组的极大无关组                   | $r(A)$     |
| $\{0\}$                   | 无（空集）                                   | $0$        |

### 3.5 生成子空间

由向量 $\boldsymbol{\alpha}_1, \ldots, \boldsymbol{\alpha}_s$ 的所有线性组合构成的集合称为由它们**生成**的子空间：

$$\text{span}(\boldsymbol{\alpha}_1, \ldots, \boldsymbol{\alpha}_s) = \{k_1\boldsymbol{\alpha}_1 + \cdots + k_s\boldsymbol{\alpha}_s \mid k_i \in \mathbb{R}\}$$

$\dim(\text{span}(\boldsymbol{\alpha}_1, \ldots, \boldsymbol{\alpha}_s)) = r(\boldsymbol{\alpha}_1, \ldots, \boldsymbol{\alpha}_s)$

## 4. 基变换与坐标变换

### 4.1 向量的坐标

设 $\boldsymbol{e}_1, \ldots, \boldsymbol{e}_r$ 是向量空间 $V$ 的一组基，$\boldsymbol{\alpha} \in V$，则：

$$\boldsymbol{\alpha} = x_1\boldsymbol{e}_1 + x_2\boldsymbol{e}_2 + \cdots + x_r\boldsymbol{e}_r$$

$(x_1, x_2, \ldots, x_r)^T$ 称为 $\boldsymbol{\alpha}$ 在基 $\boldsymbol{e}_1, \ldots, \boldsymbol{e}_r$ 下的**坐标**。

### 4.2 过渡矩阵

设 $\boldsymbol{e}_1, \ldots, \boldsymbol{e}_n$ 和 $\boldsymbol{f}_1, \ldots, \boldsymbol{f}_n$ 是向量空间 $V$ 的两组基，且：

$$\begin{pmatrix} \boldsymbol{f}_1 & \boldsymbol{f}_2 & \cdots & \boldsymbol{f}_n \end{pmatrix} = \begin{pmatrix} \boldsymbol{e}_1 & \boldsymbol{e}_2 & \cdots & \boldsymbol{e}_n \end{pmatrix} P$$

则 $P$ 称为由基 $\boldsymbol{e}_1, \ldots, \boldsymbol{e}_n$ 到基 $\boldsymbol{f}_1, \ldots, \boldsymbol{f}_n$ 的**过渡矩阵**。

过渡矩阵 $P$ 一定是可逆的。

### 4.3 坐标变换公式

设 $\boldsymbol{\alpha}$ 在旧基下的坐标为 $x$，在新基下的坐标为 $y$，则：

$$x = Py \quad \text{或} \quad y = P^{-1}x$$

### 4.4 示例

设 $\boldsymbol{e}_1 = (1, 0)^T$，$\boldsymbol{e}_2 = (0, 1)^T$，$\boldsymbol{f}_1 = (1, 1)^T$，$\boldsymbol{f}_2 = (1, -1)^T$。

过渡矩阵：$\boldsymbol{f}_1 = \boldsymbol{e}_1 + \boldsymbol{e}_2$，$\boldsymbol{f}_2 = \boldsymbol{e}_1 - \boldsymbol{e}_2$

$$P = \begin{pmatrix} 1 & 1 \\ 1 & -1 \end{pmatrix}$$

$\boldsymbol{\alpha} = (3, 1)^T$ 在旧基下坐标为 $(3, 1)^T$，在新基下坐标为：

$$y = P^{-1}x = \frac{1}{-2}\begin{pmatrix} -1 & -1 \\ -1 & 1 \end{pmatrix}\begin{pmatrix} 3 \\ 1 \end{pmatrix} = \begin{pmatrix} 2 \\ 1 \end{pmatrix}$$

验证：$2\boldsymbol{f}_1 + 1 \cdot \boldsymbol{f}_2 = 2(1,1)^T + (1,-1)^T = (3, 1)^T$
