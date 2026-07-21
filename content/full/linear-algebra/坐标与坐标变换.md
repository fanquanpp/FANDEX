---
order: 42
title: 坐标与坐标变换
module: 'linear-algebra'
category: 'comp-sci'
difficulty: intermediate
description: 向量在基下的坐标，基变换与过渡矩阵，坐标变换公式，不同基下坐标的关系。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'linear-algebra/线性相关性'
  - 'linear-algebra/基与维数'
  - 'linear-algebra/内积与正交性'
  - 'linear-algebra/施密特正交化'
prerequisites:
  - 'linear-algebra/行列式定义与几何意义'
---

## 1. 向量的坐标

### 1.1 坐标的定义

设 $\boldsymbol{\varepsilon}_1, \boldsymbol{\varepsilon}_2, \ldots, \boldsymbol{\varepsilon}_n$ 是 $n$ 维向量空间 $V$ 的一组基，对于任意 $\boldsymbol{\alpha} \in V$，存在唯一的一组数 $x_1, x_2, \ldots, x_n$，使得：

$$\boldsymbol{\alpha} = x_1\boldsymbol{\varepsilon}_1 + x_2\boldsymbol{\varepsilon}_2 + \cdots + x_n\boldsymbol{\varepsilon}_n$$

称 $(x_1, x_2, \ldots, x_n)^T$ 为 $\boldsymbol{\alpha}$ 在基 $\boldsymbol{\varepsilon}_1, \ldots, \boldsymbol{\varepsilon}_n$ 下的**坐标**。

### 1.2 坐标的唯一性

坐标由基和向量唯一确定。同一向量在不同基下有不同的坐标。

### 1.3 自然基下的坐标

在自然基 $\boldsymbol{e}_1 = (1,0,\ldots,0)^T, \ldots, \boldsymbol{e}_n = (0,\ldots,0,1)^T$ 下，向量 $\boldsymbol{\alpha} = (a_1, a_2, \ldots, a_n)^T$ 的坐标就是 $(a_1, a_2, \ldots, a_n)^T$ 本身。

### 1.4 坐标的求法

设基矩阵 $E = (\boldsymbol{\varepsilon}_1, \boldsymbol{\varepsilon}_2, \ldots, \boldsymbol{\varepsilon}_n)$，则：

$$\boldsymbol{\alpha} = Ex \quad \Rightarrow \quad x = E^{-1}\boldsymbol{\alpha}$$

**示例**：设 $\boldsymbol{\varepsilon}_1 = (1, 1)^T$，$\boldsymbol{\varepsilon}_2 = (1, -1)^T$，求 $\boldsymbol{\alpha} = (3, 1)^T$ 在此基下的坐标。

$$E = \begin{pmatrix} 1 & 1 \\ 1 & -1 \end{pmatrix}, \quad E^{-1} = \frac{1}{-2}\begin{pmatrix} -1 & -1 \\ -1 & 1 \end{pmatrix} = \begin{pmatrix} 1/2 & 1/2 \\ 1/2 & -1/2 \end{pmatrix}$$

$$x = E^{-1}\boldsymbol{\alpha} = \begin{pmatrix} 1/2 & 1/2 \\ 1/2 & -1/2 \end{pmatrix}\begin{pmatrix} 3 \\ 1 \end{pmatrix} = \begin{pmatrix} 2 \\ 1 \end{pmatrix}$$

## 2. 基变换

### 2.1 过渡矩阵

设 $\boldsymbol{\varepsilon}_1, \ldots, \boldsymbol{\varepsilon}_n$（旧基）和 $\boldsymbol{\eta}_1, \ldots, \boldsymbol{\eta}_n$（新基）是 $V$ 的两组基，新基的每个向量可用旧基线性表示：

$$\begin{cases} \boldsymbol{\eta}_1 = p_{11}\boldsymbol{\varepsilon}_1 + p_{21}\boldsymbol{\varepsilon}_2 + \cdots + p_{n1}\boldsymbol{\varepsilon}_n \\ \boldsymbol{\eta}_2 = p_{12}\boldsymbol{\varepsilon}_1 + p_{22}\boldsymbol{\varepsilon}_2 + \cdots + p_{n2}\boldsymbol{\varepsilon}_n \\ \cdots \\ \boldsymbol{\eta}_n = p_{1n}\boldsymbol{\varepsilon}_1 + p_{2n}\boldsymbol{\varepsilon}_2 + \cdots + p_{nn}\boldsymbol{\varepsilon}_n \end{cases}$$

矩阵形式：

$$(\boldsymbol{\eta}_1, \boldsymbol{\eta}_2, \ldots, \boldsymbol{\eta}_n) = (\boldsymbol{\varepsilon}_1, \boldsymbol{\varepsilon}_2, \ldots, \boldsymbol{\varepsilon}_n)P$$

$P = (p_{ij})_{n \times n}$ 称为由旧基到新基的**过渡矩阵**。

### 2.2 过渡矩阵的性质

1. 过渡矩阵 $P$ 一定**可逆**
2. $P^{-1}$ 是由新基到旧基的过渡矩阵
3. $|P| \neq 0$

### 2.3 过渡矩阵的求法

设旧基矩阵为 $E = (\boldsymbol{\varepsilon}_1, \ldots, \boldsymbol{\varepsilon}_n)$，新基矩阵为 $F = (\boldsymbol{\eta}_1, \ldots, \boldsymbol{\eta}_n)$，则：

$$F = EP \quad \Rightarrow \quad P = E^{-1}F$$

**示例**：设旧基 $\boldsymbol{\varepsilon}_1 = (1, 0)^T$，$\boldsymbol{\varepsilon}_2 = (0, 1)^T$，新基 $\boldsymbol{\eta}_1 = (1, 1)^T$，$\boldsymbol{\eta}_2 = (1, -1)^T$，求过渡矩阵。

$$P = E^{-1}F = I^{-1}\begin{pmatrix} 1 & 1 \\ 1 & -1 \end{pmatrix} = \begin{pmatrix} 1 & 1 \\ 1 & -1 \end{pmatrix}$$

## 3. 坐标变换公式

### 3.1 定理

设 $\boldsymbol{\alpha}$ 在旧基下的坐标为 $x = (x_1, \ldots, x_n)^T$，在新基下的坐标为 $y = (y_1, \ldots, y_n)^T$，过渡矩阵为 $P$，则：

$$x = Py \quad \text{或} \quad y = P^{-1}x$$

### 3.2 推导

$$\boldsymbol{\alpha} = Ex = Fy = (EP)y$$

故 $Ex = EPy$，因 $E$ 可逆，$x = Py$。

### 3.3 注意

过渡矩阵 $P$ 是从旧基到新基的变换，但坐标变换是 $x = Py$（旧坐标 = $P \times$ 新坐标），方向与基变换相反。

**记忆口诀**：基变正向，坐标变逆向。

## 4. 典型例题

### 例1

设 $\boldsymbol{\varepsilon}_1 = (1, 0, 0)^T$，$\boldsymbol{\varepsilon}_2 = (1, 1, 0)^T$，$\boldsymbol{\varepsilon}_3 = (1, 1, 1)^T$，$\boldsymbol{\eta}_1 = (1, 0, 1)^T$，$\boldsymbol{\eta}_2 = (0, 1, 0)^T$，$\boldsymbol{\eta}_3 = (0, 0, 1)^T$，求由 $\boldsymbol{\varepsilon}_1, \boldsymbol{\varepsilon}_2, \boldsymbol{\varepsilon}_3$ 到 $\boldsymbol{\eta}_1, \boldsymbol{\eta}_2, \boldsymbol{\eta}_3$ 的过渡矩阵。

**解**：

$$E = \begin{pmatrix} 1 & 1 & 1 \\ 0 & 1 & 1 \\ 0 & 0 & 1 \end{pmatrix}, \quad F = \begin{pmatrix} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 1 & 0 & 1 \end{pmatrix}$$

$$P = E^{-1}F$$

$$E^{-1} = \begin{pmatrix} 1 & -1 & 0 \\ 0 & 1 & -1 \\ 0 & 0 & 1 \end{pmatrix}$$

$$P = \begin{pmatrix} 1 & -1 & 0 \\ 0 & 1 & -1 \\ 0 & 0 & 1 \end{pmatrix}\begin{pmatrix} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 1 & 0 & 1 \end{pmatrix} = \begin{pmatrix} 1 & -1 & 0 \\ -1 & 1 & -1 \\ 1 & 0 & 1 \end{pmatrix}$$

### 例2

设 $\boldsymbol{\alpha}$ 在基 $\boldsymbol{\varepsilon}_1, \boldsymbol{\varepsilon}_2, \boldsymbol{\varepsilon}_3$ 下的坐标为 $(1, 2, 3)^T$，过渡矩阵 $P = \begin{pmatrix} 1 & 0 & 0 \\ 1 & 1 & 0 \\ 0 & 1 & 1 \end{pmatrix}$，求 $\boldsymbol{\alpha}$ 在新基下的坐标。

**解**：$y = P^{-1}x$

$$P^{-1} = \begin{pmatrix} 1 & 0 & 0 \\ -1 & 1 & 0 \\ 1 & -1 & 1 \end{pmatrix}$$

$$y = \begin{pmatrix} 1 & 0 & 0 \\ -1 & 1 & 0 \\ 1 & -1 & 1 \end{pmatrix}\begin{pmatrix} 1 \\ 2 \\ 3 \end{pmatrix} = \begin{pmatrix} 1 \\ 1 \\ 2 \end{pmatrix}$$

### 例3

设 $\boldsymbol{\alpha}_1 = (1, 0, 1)^T$，$\boldsymbol{\alpha}_2 = (1, 1, 0)^T$，$\boldsymbol{\alpha}_3 = (0, 1, 1)^T$，证明它们是 $\mathbb{R}^3$ 的一组基，并求 $\boldsymbol{\beta} = (2, 3, 4)^T$ 在此基下的坐标。

**解**：

$$|A| = \begin{vmatrix} 1 & 1 & 0 \\ 0 & 1 & 1 \\ 1 & 0 & 1 \end{vmatrix} = 1 + 1 = 2 \neq 0$$

故 $\boldsymbol{\alpha}_1, \boldsymbol{\alpha}_2, \boldsymbol{\alpha}_3$ 线性无关，构成 $\mathbb{R}^3$ 的一组基。

$$x = A^{-1}\boldsymbol{\beta}$$

$$A^{-1} = \frac{1}{2}\begin{pmatrix} 1 & -1 & 1 \\ 1 & 1 & -1 \\ -1 & 1 & 1 \end{pmatrix}$$

$$x = \frac{1}{2}\begin{pmatrix} 1 & -1 & 1 \\ 1 & 1 & -1 \\ -1 & 1 & 1 \end{pmatrix}\begin{pmatrix} 2 \\ 3 \\ 4 \end{pmatrix} = \frac{1}{2}\begin{pmatrix} 3 \\ 1 \\ 5 \end{pmatrix} = \begin{pmatrix} 3/2 \\ 1/2 \\ 5/2 \end{pmatrix}$$
