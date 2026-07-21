---
order: 52
title: 矩阵对角化
module: 'linear-algebra'
category: 'comp-sci'
difficulty: intermediate
description: 相似矩阵的定义与性质，矩阵可对角化的条件与判别，对角化的步骤与方法。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'linear-algebra/特征值与特征向量计算'
  - 'linear-algebra/特征值性质'
  - 'linear-algebra/实对称矩阵的对角化'
  - 'linear-algebra/特征值典型例题'
prerequisites:
  - 'linear-algebra/行列式定义与几何意义'
---

## 1. 相似矩阵

### 1.1 定义

设 $A, B$ 为 $n$ 阶方阵，若存在可逆矩阵 $P$，使得：

$$B = P^{-1}AP$$

则称 $A$ 与 $B$ **相似**，记作 $A \sim B$。

### 1.2 相似关系的性质

1. **自反性**：$A \sim A$
2. **对称性**：$A \sim B \Rightarrow B \sim A$
3. **传递性**：$A \sim B, B \sim C \Rightarrow A \sim C$

### 1.3 相似矩阵的共同性质

若 $A \sim B$，则：

1. $|A| = |B|$
2. $\text{tr}(A) = \text{tr}(B)$
3. $r(A) = r(B)$
4. $A$ 和 $B$ 有相同的特征值（含重数）
5. $|A - \lambda I| = |B - \lambda I|$（特征多项式相同）
6. $A$ 可逆 $\iff$ $B$ 可逆
7. $A^k \sim B^k$
8. $f(A) \sim f(B)$（$f$ 为多项式）

### 1.4 相似的必要条件

以上性质都是相似的必要条件，但不是充分条件。两个矩阵有相同的特征值不一定相似。

**反例**：$A = \begin{pmatrix} 1 & 0 \\ 0 & 1 \end{pmatrix}$，$B = \begin{pmatrix} 1 & 1 \\ 0 & 1 \end{pmatrix}$

特征值都是 $1, 1$，但 $A$ 不相似于 $B$（$A = I$ 只与自身相似）。

## 2. 矩阵可对角化的条件

### 2.1 定义

若 $A$ 相似于对角矩阵，即存在可逆矩阵 $P$ 使得 $P^{-1}AP = \Lambda$（对角矩阵），则称 $A$ **可对角化**。

### 2.2 可对角化的等价条件

以下条件等价：

1. $A$ 可对角化
2. $A$ 有 $n$ 个线性无关的特征向量
3. 每个特征值的几何重数等于代数重数

### 2.3 充分条件

1. $A$ 有 $n$ 个互不相同的特征值 $\Rightarrow$ $A$ 可对角化
2. $A$ 为实对称矩阵 $\Rightarrow$ $A$ 可对角化（且可正交对角化）

### 2.4 不可对角化的情形

若某个特征值的几何重数小于代数重数，则 $A$ 不可对角化。

**示例**：$A = \begin{pmatrix} 1 & 1 \\ 0 & 1 \end{pmatrix}$

特征值 $\lambda = 1$（二重），$A - I = \begin{pmatrix} 0 & 1 \\ 0 & 0 \end{pmatrix}$，$r(A - I) = 1$。

几何重数 $= 2 - 1 = 1 < 2 =$ 代数重数，故 $A$ 不可对角化。

## 3. 对角化的步骤

### 3.1 步骤

1. 求出 $A$ 的所有特征值 $\lambda_1, \lambda_2, \ldots, \lambda_n$
2. 对每个特征值 $\lambda_i$，求 $(A - \lambda_i I)\boldsymbol{x} = 0$ 的基础解系
3. 判断是否有 $n$ 个线性无关的特征向量
4. 若有，以这 $n$ 个特征向量为列构造 $P$，则 $P^{-1}AP = \Lambda$

### 3.2 完整示例

将 $A = \begin{pmatrix} 0 & 1 & 0 \\ 0 & 0 & 1 \\ 6 & -11 & 6 \end{pmatrix}$ 对角化。

**步骤1**：特征值 $\lambda_1 = 1$，$\lambda_2 = 2$，$\lambda_3 = 3$。

**步骤2**：

对 $\lambda_1 = 1$：$(A - I)\boldsymbol{x} = 0$

$$\begin{pmatrix} -1 & 1 & 0 \\ 0 & -1 & 1 \\ 6 & -11 & 5 \end{pmatrix} \to \begin{pmatrix} 1 & -1 & 0 \\ 0 & 1 & -1 \\ 0 & -5 & 5 \end{pmatrix} \to \begin{pmatrix} 1 & 0 & -1 \\ 0 & 1 & -1 \\ 0 & 0 & 0 \end{pmatrix}$$

$\boldsymbol{x}_1 = (1, 1, 1)^T$

对 $\lambda_2 = 2$：$(A - 2I)\boldsymbol{x} = 0$

$$\begin{pmatrix} -2 & 1 & 0 \\ 0 & -2 & 1 \\ 6 & -11 & 4 \end{pmatrix} \to \begin{pmatrix} 1 & 0 & -1/4 \\ 0 & 1 & -1/2 \\ 0 & 0 & 0 \end{pmatrix}$$

$\boldsymbol{x}_2 = (1, 2, 4)^T$

对 $\lambda_3 = 3$：$(A - 3I)\boldsymbol{x} = 0$

$$\begin{pmatrix} -3 & 1 & 0 \\ 0 & -3 & 1 \\ 6 & -11 & 3 \end{pmatrix} \to \begin{pmatrix} 1 & 0 & -1/9 \\ 0 & 1 & -1/3 \\ 0 & 0 & 0 \end{pmatrix}$$

$\boldsymbol{x}_3 = (1, 3, 9)^T$

**步骤3**：三个特征值互不相同，特征向量线性无关。

**步骤4**：

$$P = \begin{pmatrix} 1 & 1 & 1 \\ 1 & 2 & 3 \\ 1 & 4 & 9 \end{pmatrix}, \quad \Lambda = \begin{pmatrix} 1 & 0 & 0 \\ 0 & 2 & 0 \\ 0 & 0 & 3 \end{pmatrix}$$

$P^{-1}AP = \Lambda$

## 4. 对角化的应用

### 4.1 求矩阵的幂

若 $A = P\Lambda P^{-1}$，则 $A^k = P\Lambda^k P^{-1}$。

**示例**：设 $A = \begin{pmatrix} 2 & 1 \\ 1 & 2 \end{pmatrix}$，求 $A^{10}$。

$A$ 的特征值为 $1, 3$，特征向量 $(1, -1)^T, (1, 1)^T$。

$$P = \begin{pmatrix} 1 & 1 \\ -1 & 1 \end{pmatrix}, \quad \Lambda = \begin{pmatrix} 1 & 0 \\ 0 & 3 \end{pmatrix}$$

$$A^{10} = P\Lambda^{10}P^{-1} = \begin{pmatrix} 1 & 1 \\ -1 & 1 \end{pmatrix}\begin{pmatrix} 1 & 0 \\ 0 & 3^{10} \end{pmatrix}\frac{1}{2}\begin{pmatrix} 1 & -1 \\ 1 & 1 \end{pmatrix}$$

$$= \frac{1}{2}\begin{pmatrix} 1 + 3^{10} & -1 + 3^{10} \\ -1 + 3^{10} & 1 + 3^{10} \end{pmatrix}$$

### 4.2 求矩阵多项式

若 $A = P\Lambda P^{-1}$，则 $f(A) = Pf(\Lambda)P^{-1}$。

### 4.3 解微分方程组

$\dfrac{d\boldsymbol{x}}{dt} = A\boldsymbol{x}$ 的通解为 $\boldsymbol{x}(t) = e^{At}\boldsymbol{x}(0)$。

若 $A = P\Lambda P^{-1}$，则 $e^{At} = Pe^{\Lambda t}P^{-1}$。

## 5. 典型例题

### 例1

设 $A = \begin{pmatrix} 1 & 0 & 0 \\ 0 & 1 & 1 \\ 0 & 0 & 2 \end{pmatrix}$，判断 $A$ 是否可对角化。

**解**：特征值 $\lambda_1 = 1$（二重），$\lambda_2 = 2$。

对 $\lambda_1 = 1$：$A - I = \begin{pmatrix} 0 & 0 & 0 \\ 0 & 0 & 1 \\ 0 & 0 & 1 \end{pmatrix}$，$r(A - I) = 1$，几何重数 $= 3 - 1 = 2 = $ 代数重数。

对 $\lambda_2 = 2$：$A - 2I = \begin{pmatrix} -1 & 0 & 0 \\ 0 & -1 & 1 \\ 0 & 0 & 0 \end{pmatrix}$，$r(A - 2I) = 2$，几何重数 $= 3 - 2 = 1 = $ 代数重数。

$A$ 可对角化。

### 例2

设 $A \sim B$，$A$ 的特征值为 $1, 2, 3$，求 $B^{-1}$ 的特征值。

**解**：$B$ 与 $A$ 有相同的特征值 $1, 2, 3$。$B^{-1}$ 的特征值为 $1, 1/2, 1/3$。
