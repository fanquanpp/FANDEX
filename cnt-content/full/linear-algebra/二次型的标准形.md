---
order: 60
title: 二次型的标准形
module: 'linear-algebra'
category: 'comp-sci'
difficulty: intermediate
description: 二次型的定义与矩阵表示，配方法化标准形，正交变换法化标准形，合同变换与合同对角化。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'linear-algebra/实对称矩阵的对角化'
  - 'linear-algebra/特征值典型例题'
  - 'linear-algebra/二次型的规范形'
  - 'linear-algebra/正定二次型'
prerequisites:
  - 'linear-algebra/行列式定义与几何意义'
---

## 1. 二次型的定义

### 1.1 定义

含 $n$ 个变量 $x_1, x_2, \ldots, x_n$ 的**二次齐次多项式**：

$$f(x_1, x_2, \ldots, x_n) = \sum_{i=1}^{n}\sum_{j=1}^{n} a_{ij}x_ix_j \quad (a_{ij} = a_{ji})$$

称为 $n$ 元**二次型**。

### 1.2 矩阵表示

令 $A = (a_{ij})_{n \times n}$（$A$ 为实对称矩阵），$\boldsymbol{x} = (x_1, x_2, \ldots, x_n)^T$，则：

$$f(\boldsymbol{x}) = \boldsymbol{x}^T A \boldsymbol{x}$$

$A$ 称为二次型 $f$ 的**矩阵**，$A$ 的秩称为二次型的**秩**。

### 1.3 示例

将 $f(x_1, x_2, x_3) = x_1^2 + 2x_1x_2 + 4x_1x_3 + 3x_2^2 + 2x_2x_3 + 7x_3^2$ 写成矩阵形式。

$$A = \begin{pmatrix} 1 & 1 & 2 \\ 1 & 3 & 1 \\ 2 & 1 & 7 \end{pmatrix}$$

$$f = \boldsymbol{x}^T A \boldsymbol{x} = (x_1, x_2, x_3)\begin{pmatrix} 1 & 1 & 2 \\ 1 & 3 & 1 \\ 2 & 1 & 7 \end{pmatrix}\begin{pmatrix} x_1 \\ x_2 \\ x_3 \end{pmatrix}$$

**注意**：$a_{ij}$ 是 $x_ix_j$ 系数的一半（$i \neq j$ 时）。

## 2. 合同变换

### 2.1 合同的定义

设 $A, B$ 为 $n$ 阶实对称矩阵，若存在可逆矩阵 $C$，使得：

$$B = C^TAC$$

则称 $A$ 与 $B$ **合同**。

### 2.2 合同的性质

1. 自反性：$A$ 与 $A$ 合同
2. 对称性：$A$ 与 $B$ 合同 $\Rightarrow$ $B$ 与 $A$ 合同
3. 传递性：$A$ 与 $B$ 合同，$B$ 与 $C$ 合同 $\Rightarrow$ $A$ 与 $C$ 合同

### 2.3 合同与相似的关系

- 相似 $\Rightarrow$ 合同（$P^{-1} = P^T$ 时，即正交相似）
- 合同 $\not\Rightarrow$ 相似
- 正交相似 = 相似 + 合同

### 2.4 惯性定理

两个实对称矩阵合同 $\iff$ 它们有相同的正惯性指数和负惯性指数。

## 3. 配方法化标准形

### 3.1 标准形

二次型的**标准形**是只含平方项的形式：

$$f = d_1y_1^2 + d_2y_2^2 + \cdots + d_ny_n^2$$

### 3.2 配方法步骤

1. 若含 $x_i^2$ 项，将含 $x_i$ 的所有项集中，配方
2. 若不含 $x_i^2$ 项但含 $x_ix_j$ 项，先做变量替换产生平方项
3. 重复直到所有交叉项消除

### 3.3 示例

将 $f = x_1^2 + 2x_1x_2 + 2x_1x_3 + 2x_2^2 + 4x_2x_3 + x_3^2$ 化为标准形。

**配方**：

$f = (x_1 + x_2 + x_3)^2 + x_2^2 + 2x_2x_3$

$= (x_1 + x_2 + x_3)^2 + (x_2 + x_3)^2 - x_3^2$

令 $\begin{cases} y_1 = x_1 + x_2 + x_3 \\ y_2 = x_2 + x_3 \\ y_3 = x_3 \end{cases}$

标准形：$f = y_1^2 + y_2^2 - y_3^2$

### 3.4 无平方项的情形

将 $f = 2x_1x_2 + 2x_1x_3 - 6x_2x_3$ 化为标准形。

先做替换：$x_1 = y_1 + y_2$，$x_2 = y_1 - y_2$，$x_3 = y_3$

$f = 2(y_1 + y_2)(y_1 - y_2) + 2(y_1 + y_2)y_3 - 6(y_1 - y_2)y_3$

$= 2y_1^2 - 2y_2^2 - 4y_1y_3 + 8y_2y_3$

$= 2(y_1 - y_3)^2 - 2y_3^2 - 2y_2^2 + 8y_2y_3$

$= 2(y_1 - y_3)^2 - 2(y_2 - 2y_3)^2 + 6y_3^2$

## 4. 正交变换法化标准形

### 4.1 方法原理

对实对称矩阵 $A$，存在正交矩阵 $Q$ 使得 $Q^TAQ = \Lambda$。

令 $\boldsymbol{x} = Q\boldsymbol{y}$（正交变换），则：

$$f = \boldsymbol{x}^TA\boldsymbol{x} = (Q\boldsymbol{y})^TA(Q\boldsymbol{y}) = \boldsymbol{y}^TQ^TAQ\boldsymbol{y} = \boldsymbol{y}^T\Lambda\boldsymbol{y} = \lambda_1y_1^2 + \lambda_2y_2^2 + \cdots + \lambda_ny_n^2$$

### 4.2 步骤

1. 写出二次型的矩阵 $A$
2. 求 $A$ 的特征值和特征向量
3. 将特征向量正交化、单位化，构造正交矩阵 $Q$
4. 令 $\boldsymbol{x} = Q\boldsymbol{y}$，标准形为 $\lambda_1y_1^2 + \cdots + \lambda_ny_n^2$

### 4.3 示例

将 $f = 2x_1^2 + 2x_2^2 + 2x_3^2 + 2x_1x_2 + 2x_1x_3 + 2x_2x_3$ 用正交变换化为标准形。

$$A = \begin{pmatrix} 2 & 1 & 1 \\ 1 & 2 & 1 \\ 1 & 1 & 2 \end{pmatrix}$$

特征值：$\lambda_1 = 4$，$\lambda_2 = \lambda_3 = 1$

正交对角化后：

$$f = 4y_1^2 + y_2^2 + y_3^2$$

### 4.4 正交变换的特点

- 正交变换保持向量的长度和角度不变
- 正交变换是刚体运动（旋转或反射）
- 标准形中的系数就是特征值

## 5. 两种方法的比较

| 方法       | 标准形系数     | 变换矩阵     | 保持几何性质   |
| ---------- | -------------- | ------------ | -------------- |
| 配方法     | 不一定是特征值 | 可逆矩阵 $C$ | 不保持         |
| 正交变换法 | 特征值         | 正交矩阵 $Q$ | 保持长度和角度 |
