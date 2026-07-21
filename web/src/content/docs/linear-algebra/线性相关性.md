---
order: 40
title: 线性相关性
module: 'linear-algebra'
category: 'comp-sci'
difficulty: intermediate
description: 线性组合与线性表示，线性相关与线性无关的定义、判定与性质，向量组的等价。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'linear-algebra/解的结构'
  - 'linear-algebra/线性方程组典型例题'
  - 'linear-algebra/基与维数'
  - 'linear-algebra/坐标与坐标变换'
prerequisites:
  - 'linear-algebra/行列式定义与几何意义'
---

## 1. 线性组合与线性表示

### 1.1 线性组合

设 $\boldsymbol{\alpha}_1, \boldsymbol{\alpha}_2, \ldots, \boldsymbol{\alpha}_s$ 是一组向量，$k_1, k_2, \ldots, k_s$ 是一组数，则

$$k_1\boldsymbol{\alpha}_1 + k_2\boldsymbol{\alpha}_2 + \cdots + k_s\boldsymbol{\alpha}_s$$

称为 $\boldsymbol{\alpha}_1, \boldsymbol{\alpha}_2, \ldots, \boldsymbol{\alpha}_s$ 的一个**线性组合**。

### 1.2 线性表示

若向量 $\boldsymbol{\beta}$ 可以表示为 $\boldsymbol{\alpha}_1, \boldsymbol{\alpha}_2, \ldots, \boldsymbol{\alpha}_s$ 的线性组合：

$$\boldsymbol{\beta} = k_1\boldsymbol{\alpha}_1 + k_2\boldsymbol{\alpha}_2 + \cdots + k_s\boldsymbol{\alpha}_s$$

则称 $\boldsymbol{\beta}$ 可由 $\boldsymbol{\alpha}_1, \boldsymbol{\alpha}_2, \ldots, \boldsymbol{\alpha}_s$ **线性表示**。

### 1.3 线性表示的判定

$\boldsymbol{\beta}$ 可由 $\boldsymbol{\alpha}_1, \ldots, \boldsymbol{\alpha}_s$ 线性表示 $\iff$ 方程组 $x_1\boldsymbol{\alpha}_1 + \cdots + x_s\boldsymbol{\alpha}_s = \boldsymbol{\beta}$ 有解 $\iff r(\boldsymbol{\alpha}_1, \ldots, \boldsymbol{\alpha}_s) = r(\boldsymbol{\alpha}_1, \ldots, \boldsymbol{\alpha}_s, \boldsymbol{\beta})$

### 1.4 线性表示的性质

1. 零向量可由任何向量组线性表示（取所有系数为零）
2. 向量组中每个向量可由该向量组线性表示
3. 若 $\boldsymbol{\alpha}$ 可由 $\boldsymbol{\beta}_1, \ldots, \boldsymbol{\beta}_t$ 线性表示，而每个 $\boldsymbol{\beta}_i$ 可由 $\boldsymbol{\gamma}_1, \ldots, \boldsymbol{\gamma}_r$ 线性表示，则 $\boldsymbol{\alpha}$ 可由 $\boldsymbol{\gamma}_1, \ldots, \boldsymbol{\gamma}_r$ 线性表示（传递性）

## 2. 线性相关与线性无关

### 2.1 定义

设 $\boldsymbol{\alpha}_1, \boldsymbol{\alpha}_2, \ldots, \boldsymbol{\alpha}_s$ 是一组向量，若存在**不全为零**的数 $k_1, k_2, \ldots, k_s$，使得：

$$k_1\boldsymbol{\alpha}_1 + k_2\boldsymbol{\alpha}_2 + \cdots + k_s\boldsymbol{\alpha}_s = \mathbf{0}$$

则称 $\boldsymbol{\alpha}_1, \boldsymbol{\alpha}_2, \ldots, \boldsymbol{\alpha}_s$ **线性相关**。

否则，若上式仅在 $k_1 = k_2 = \cdots = k_s = 0$ 时成立，则称 $\boldsymbol{\alpha}_1, \boldsymbol{\alpha}_2, \ldots, \boldsymbol{\alpha}_s$ **线性无关**。

### 2.2 等价定义

**线性相关**：向量组中至少有一个向量可由其余向量线性表示。

**线性无关**：向量组中没有任何一个向量可由其余向量线性表示。

### 2.3 判定方法

**方法一：定义法**

设 $k_1\boldsymbol{\alpha}_1 + k_2\boldsymbol{\alpha}_2 + \cdots + k_s\boldsymbol{\alpha}_s = 0$，判断是否只有零解。

**方法二：行列式法**（向量个数等于维数时）

设 $\boldsymbol{\alpha}_1, \ldots, \boldsymbol{\alpha}_n$ 为 $n$ 个 $n$ 维向量，构造矩阵 $A = (\boldsymbol{\alpha}_1, \ldots, \boldsymbol{\alpha}_n)$：

- $|A| \neq 0$：线性无关
- $|A| = 0$：线性相关

**方法三：秩法**

构造矩阵 $A = (\boldsymbol{\alpha}_1, \ldots, \boldsymbol{\alpha}_s)$：

- $r(A) = s$：线性无关
- $r(A) < s$：线性相关

### 2.4 特殊情形

1. **单个向量**：$\boldsymbol{\alpha}$ 线性相关 $\iff \boldsymbol{\alpha} = \mathbf{0}$
2. **两个向量**：$\boldsymbol{\alpha}_1, \boldsymbol{\alpha}_2$ 线性相关 $\iff \boldsymbol{\alpha}_1, \boldsymbol{\alpha}_2$ 成比例
3. **含零向量的向量组**：一定线性相关
4. **向量个数大于维数**：$s > n$ 时，$n$ 维向量组一定线性相关

## 3. 线性相关性的重要性质

### 3.1 部分组与整体组

1. 若部分组线性相关，则整体组线性相关
2. 若整体组线性无关，则任何部分组线性无关

**逆否命题**不成立：整体组线性相关，部分组未必线性相关。

### 3.2 扩充与缩短

1. 线性无关的向量组添加分量后仍线性无关（"无关组加维仍无关"）
2. 线性相关的向量组减少分量后仍线性相关（"相关组减维仍相关"）

### 3.3 向量个数与维数的关系

- $n$ 维向量组中，任意 $n + 1$ 个向量必线性相关
- $n$ 个 $n$ 维向量线性无关 $\iff$ 它们构成的行列式不为零

### 3.4 替换定理

若 $\boldsymbol{\alpha}_1, \ldots, \boldsymbol{\alpha}_s$ 线性无关，且可由 $\boldsymbol{\beta}_1, \ldots, \boldsymbol{\beta}_t$ 线性表示，则 $s \leq t$。

**推论**：两个等价的线性无关向量组所含向量个数相同。

## 4. 向量组的等价

### 4.1 定义

若向量组 (I) 中每个向量都可由向量组 (II) 线性表示，则称 (I) 可由 (II) 线性表示。

若 (I) 和 (II) 可以互相线性表示，则称 (I) 与 (II) **等价**。

### 4.2 性质

1. 自反性：(I) 与 (I) 等价
2. 对称性：(I) 与 (II) 等价 $\Rightarrow$ (II) 与 (I) 等价
3. 传递性：(I) 与 (II) 等价，(II) 与 (III) 等价 $\Rightarrow$ (I) 与 (III) 等价

### 4.3 等价与秩

等价的向量组秩相同，但秩相同的向量组未必等价。

### 4.4 矩阵的行等价

两个矩阵行等价（可经初等行变换互化）$\iff$ 它们的行向量组等价。

## 5. 典型例题

### 例1

判断 $\boldsymbol{\alpha}_1 = (1, 2, 3)^T$，$\boldsymbol{\alpha}_2 = (2, 4, 6)^T$，$\boldsymbol{\alpha}_3 = (1, 1, 1)^T$ 的线性相关性。

**解**：$\boldsymbol{\alpha}_2 = 2\boldsymbol{\alpha}_1$，故 $\boldsymbol{\alpha}_1, \boldsymbol{\alpha}_2$ 线性相关，从而 $\boldsymbol{\alpha}_1, \boldsymbol{\alpha}_2, \boldsymbol{\alpha}_3$ 线性相关。

### 例2

设 $\boldsymbol{\alpha}_1, \boldsymbol{\alpha}_2, \boldsymbol{\alpha}_3$ 线性无关，$\boldsymbol{\beta}_1 = \boldsymbol{\alpha}_1 + \boldsymbol{\alpha}_2$，$\boldsymbol{\beta}_2 = \boldsymbol{\alpha}_2 + \boldsymbol{\alpha}_3$，$\boldsymbol{\beta}_3 = \boldsymbol{\alpha}_3 + \boldsymbol{\alpha}_1$，判断 $\boldsymbol{\beta}_1, \boldsymbol{\beta}_2, \boldsymbol{\beta}_3$ 的线性相关性。

**解**：设 $k_1\boldsymbol{\beta}_1 + k_2\boldsymbol{\beta}_2 + k_3\boldsymbol{\beta}_3 = 0$：

$$(k_1 + k_3)\boldsymbol{\alpha}_1 + (k_1 + k_2)\boldsymbol{\alpha}_2 + (k_2 + k_3)\boldsymbol{\alpha}_3 = 0$$

由 $\boldsymbol{\alpha}_1, \boldsymbol{\alpha}_2, \boldsymbol{\alpha}_3$ 线性无关：

$$\begin{cases} k_1 + k_3 = 0 \\ k_1 + k_2 = 0 \\ k_2 + k_3 = 0 \end{cases}$$

系数行列式 $\begin{vmatrix} 1 & 0 & 1 \\ 1 & 1 & 0 \\ 0 & 1 & 1 \end{vmatrix} = 2 \neq 0$，只有零解 $k_1 = k_2 = k_3 = 0$。

故 $\boldsymbol{\beta}_1, \boldsymbol{\beta}_2, \boldsymbol{\beta}_3$ 线性无关。

### 例3

设 $\boldsymbol{\alpha}_1, \boldsymbol{\alpha}_2, \boldsymbol{\alpha}_3$ 线性无关，$\boldsymbol{\beta}_1 = \boldsymbol{\alpha}_1 - \boldsymbol{\alpha}_2$，$\boldsymbol{\beta}_2 = \boldsymbol{\alpha}_2 - \boldsymbol{\alpha}_3$，$\boldsymbol{\beta}_3 = \boldsymbol{\alpha}_3 - \boldsymbol{\alpha}_1$，判断 $\boldsymbol{\beta}_1, \boldsymbol{\beta}_2, \boldsymbol{\beta}_3$ 的线性相关性。

**解**：$\boldsymbol{\beta}_1 + \boldsymbol{\beta}_2 + \boldsymbol{\beta}_3 = (\boldsymbol{\alpha}_1 - \boldsymbol{\alpha}_2) + (\boldsymbol{\alpha}_2 - \boldsymbol{\alpha}_3) + (\boldsymbol{\alpha}_3 - \boldsymbol{\alpha}_1) = 0$

存在不全为零的系数 $(1, 1, 1)$，故 $\boldsymbol{\beta}_1, \boldsymbol{\beta}_2, \boldsymbol{\beta}_3$ 线性相关。
