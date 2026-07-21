---
order: 62
title: 正定二次型
module: 'linear-algebra'
category: 'comp-sci'
difficulty: advanced
description: 正定二次型与正定矩阵的定义，正定的判定条件（顺序主子式、特征值、合同），正定矩阵的性质。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'linear-algebra/二次型的标准形'
  - 'linear-algebra/二次型的规范形'
  - 'linear-algebra/二次型典型例题'
  - 'linear-algebra/LU分解'
prerequisites:
  - 'linear-algebra/行列式定义与几何意义'
---

## 1. 正定二次型的定义

### 1.1 定义

设 $f(\boldsymbol{x}) = \boldsymbol{x}^TA\boldsymbol{x}$ 为实二次型，若对任意 $\boldsymbol{x} \neq \mathbf{0}$，都有 $f(\boldsymbol{x}) > 0$，则称 $f$ 为**正定二次型**，$A$ 为**正定矩阵**。

### 1.2 其他类型的定义

| 类型   | 条件                                                                                            | 矩阵       |
| ------ | ----------------------------------------------------------------------------------------------- | ---------- |
| 正定   | $\boldsymbol{x} \neq 0 \Rightarrow f(\boldsymbol{x}) > 0$                                       | 正定矩阵   |
| 负定   | $\boldsymbol{x} \neq 0 \Rightarrow f(\boldsymbol{x}) < 0$                                       | 负定矩阵   |
| 半正定 | $f(\boldsymbol{x}) \geq 0$                                                                      | 半正定矩阵 |
| 半负定 | $f(\boldsymbol{x}) \leq 0$                                                                      | 半负定矩阵 |
| 不定   | 存在 $\boldsymbol{x}_1, \boldsymbol{x}_2$ 使 $f(\boldsymbol{x}_1) > 0, f(\boldsymbol{x}_2) < 0$ | 不定矩阵   |

### 1.3 负定与正定的关系

$A$ 负定 $\iff$ $-A$ 正定

## 2. 正定的判定条件

### 2.1 特征值判别法

$A$ 正定 $\iff$ $A$ 的所有特征值都为正数。

**证明**：$A$ 正交对角化为 $A = Q\Lambda Q^T$，$\boldsymbol{x}^TA\boldsymbol{x} = \boldsymbol{y}^T\Lambda\boldsymbol{y} = \lambda_1y_1^2 + \cdots + \lambda_ny_n^2 > 0$（$\boldsymbol{y} \neq 0$）$\iff$ 所有 $\lambda_i > 0$。

### 2.2 顺序主子式判别法（Sylvester 准则）

$A$ 正定 $\iff$ $A$ 的所有顺序主子式都为正。

$$\Delta_1 = a_{11} > 0, \quad \Delta_2 = \begin{vmatrix} a_{11} & a_{12} \\ a_{21} & a_{22} \end{vmatrix} > 0, \quad \ldots, \quad \Delta_n = |A| > 0$$

**示例**：判断 $A = \begin{pmatrix} 2 & -1 \\ -1 & 2 \end{pmatrix}$ 是否正定。

$\Delta_1 = 2 > 0$，$\Delta_2 = 4 - 1 = 3 > 0$，故 $A$ 正定。

### 2.3 合同判别法

$A$ 正定 $\iff$ $A$ 合同于单位矩阵 $I$

即存在可逆矩阵 $C$，使得 $C^TAC = I$。

### 2.4 惯性指数判别法

$A$ 正定 $\iff$ 正惯性指数 $p = n$（$A$ 为 $n$ 阶）

### 2.5 Cholesky 分解判别法

$A$ 正定 $\iff$ $A$ 可以分解为 $A = LL^T$（$L$ 为可逆下三角矩阵）

### 2.6 判定方法总结

| 判定方法     | 条件                   |
| ------------ | ---------------------- |
| 特征值法     | 所有特征值 $> 0$       |
| 顺序主子式法 | 所有 $\Delta_k > 0$    |
| 合同法       | 合同于 $I$             |
| 惯性指数法   | $p = n$                |
| Cholesky 法  | $A = LL^T$（$L$ 可逆） |

## 3. 正定矩阵的性质

### 3.1 基本性质

1. 正定矩阵一定是对称矩阵
2. 正定矩阵一定可逆（$|A| > 0$）
3. 正定矩阵的主对角线元素都为正（$a_{ii} > 0$）
4. 正定矩阵的行列式为正

### 3.2 运算性质

1. $A$ 正定，$k > 0$，则 $kA$ 正定
2. $A, B$ 正定，则 $A + B$ 正定
3. $A$ 正定，则 $A^{-1}$ 正定
4. $A$ 正定，则 $A^k$ 正定（$k$ 为正整数）
5. $A$ 正定，$C$ 可逆，则 $C^TAC$ 正定

### 3.3 注意

- $A, B$ 正定，$AB$ 未必正定（$AB$ 未必对称）
- $A, B$ 正定且 $AB = BA$，则 $AB$ 正定

### 3.4 与内积的关系

$A$ 正定 $\iff$ $(\boldsymbol{x}, \boldsymbol{y})_A = \boldsymbol{x}^TA\boldsymbol{y}$ 定义了 $\mathbb{R}^n$ 上的内积。

## 4. 半正定矩阵

### 4.1 判定条件

$A$ 半正定 $\iff$ 以下任一条件成立：

1. 所有特征值 $\geq 0$
2. 正惯性指数 $p = r(A)$（无负惯性指数）
3. 存在矩阵 $B$ 使得 $A = B^TB$

### 4.2 半正定与正定的关系

$A$ 正定 $\iff$ $A$ 半正定且 $|A| \neq 0$

## 5. 典型例题

### 例1

判断 $f = 5x_1^2 + x_2^2 + 5x_3^2 + 4x_1x_2 - 8x_1x_3 - 4x_2x_3$ 的正定性。

**解**：

$$A = \begin{pmatrix} 5 & 2 & -4 \\ 2 & 1 & -2 \\ -4 & -2 & 5 \end{pmatrix}$$

$\Delta_1 = 5 > 0$

$\Delta_2 = 5 - 4 = 1 > 0$

$\Delta_3 = |A| = 5(5-4) - 2(10-8) + (-4)(-4+4) = 5 - 4 + 0 = 1 > 0$

所有顺序主子式为正，$A$ 正定。

### 例2

设 $A$ 为 $n$ 阶正定矩阵，$B$ 为 $n$ 阶实对称矩阵，证明：存在可逆矩阵 $P$，使得 $P^TAP = I$ 且 $P^TBP = \Lambda$（对角矩阵）。

**证明**：$A$ 正定，存在可逆矩阵 $C$ 使得 $C^TAC = I$。

令 $B_1 = C^TBC$，$B_1$ 仍为实对称矩阵，可正交对角化：$Q^TB_1Q = \Lambda$。

取 $P = CQ$，则：

$P^TAP = Q^TC^TACQ = Q^TIQ = I$

$P^TBP = Q^TC^TBCQ = Q^TB_1Q = \Lambda$

### 例3

设 $A$ 为 $m \times n$ 矩阵（$m \geq n$），$r(A) = n$，证明 $A^TA$ 正定。

**证明**：$A^TA$ 为 $n$ 阶实对称矩阵。

对任意 $\boldsymbol{x} \neq 0$：$\boldsymbol{x}^T(A^TA)\boldsymbol{x} = (A\boldsymbol{x})^T(A\boldsymbol{x}) = \|A\boldsymbol{x}\|^2 \geq 0$

由 $r(A) = n$，$A\boldsymbol{x} = 0$ 只有零解，故 $\boldsymbol{x} \neq 0$ 时 $A\boldsymbol{x} \neq 0$，$\|A\boldsymbol{x}\|^2 > 0$。

$A^TA$ 正定。

### 例4

设 $A$ 为 $n$ 阶正定矩阵，证明 $A + A^{-1} \geq 2I$（即 $A + A^{-1} - 2I$ 半正定）。

**证明**：$A$ 正定，存在正交矩阵 $Q$ 使得 $Q^TAQ = \text{diag}(\lambda_1, \ldots, \lambda_n)$，$\lambda_i > 0$。

$Q^T(A + A^{-1} - 2I)Q = \text{diag}(\lambda_1 + 1/\lambda_1 - 2, \ldots, \lambda_n + 1/\lambda_n - 2)$

由 AM-GM 不等式：$\lambda_i + 1/\lambda_i \geq 2$（$\lambda_i > 0$），等号在 $\lambda_i = 1$ 时成立。

故每个对角元素 $\geq 0$，$A + A^{-1} - 2I$ 半正定。
