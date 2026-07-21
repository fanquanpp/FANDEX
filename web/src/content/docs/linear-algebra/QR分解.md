---
order: 71
title: QR分解
module: 'linear-algebra'
category: 'comp-sci'
difficulty: advanced
description: 'QR分解的定义与存在性，Gram-Schmidt方法，Householder变换方法，Givens旋转方法，QR分解的应用。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'linear-algebra/二次型典型例题'
  - 'linear-algebra/LU分解'
  - 'linear-algebra/奇异值分解SVD'
  - 'linear-algebra/矩阵分解应用'
prerequisites:
  - 'linear-algebra/行列式定义与几何意义'
---

## 1. QR分解的定义

### 1.1 定义

设 $A$ 为 $m \times n$ 矩阵（$m \geq n$），若 $A$ 可以分解为：

$$A = QR$$

其中 $Q$ 为 $m \times n$ 矩阵，其列向量构成标准正交组（$Q^TQ = I_n$），$R$ 为 $n \times n$ 上三角矩阵，则称为 $A$ 的 **QR 分解**（瘦型 QR 分解）。

完全型 QR 分解：$A = QRP$，其中 $Q$ 为 $m \times m$ 正交矩阵，$R$ 为 $m \times n$ 上梯形矩阵。

### 1.2 存在条件

**定理**：若 $A$ 的列向量线性无关（$r(A) = n$），则 $A$ 的 QR 分解存在。

### 1.3 唯一性

当 $R$ 的对角线元素为正时，QR 分解唯一。

## 2. Gram-Schmidt 方法

### 2.1 方法

对 $A$ 的列向量 $\boldsymbol{a}_1, \boldsymbol{a}_2, \ldots, \boldsymbol{a}_n$ 进行施密特正交化：

$$\boldsymbol{q}_1 = \frac{\boldsymbol{a}_1}{\|\boldsymbol{a}_1\|}$$

$$\tilde{\boldsymbol{q}}_k = \boldsymbol{a}_k - \sum_{j=1}^{k-1}(\boldsymbol{a}_k, \boldsymbol{q}_j)\boldsymbol{q}_j, \quad \boldsymbol{q}_k = \frac{\tilde{\boldsymbol{q}}_k}{\|\tilde{\boldsymbol{q}}_k\|}$$

则 $Q = (\boldsymbol{q}_1, \boldsymbol{q}_2, \ldots, \boldsymbol{q}_n)$，$R = Q^TA$。

$R$ 的元素：$r_{ij} = \boldsymbol{q}_i^T\boldsymbol{a}_j$（$i \leq j$），$r_{ij} = 0$（$i > j$）。

### 2.2 示例

对 $A = \begin{pmatrix} 1 & 1 \\ 1 & 2 \\ 1 & 3 \end{pmatrix}$ 进行 QR 分解。

$\boldsymbol{a}_1 = (1, 1, 1)^T$，$\boldsymbol{a}_2 = (1, 2, 3)^T$

$\boldsymbol{q}_1 = \frac{1}{\sqrt{3}}(1, 1, 1)^T$

$\tilde{\boldsymbol{q}}_2 = (1, 2, 3)^T - \frac{6}{3}(1, 1, 1)^T = (-1, 0, 1)^T$

$\boldsymbol{q}_2 = \frac{1}{\sqrt{2}}(-1, 0, 1)^T$

$$Q = \begin{pmatrix} 1/\sqrt{3} & -1/\sqrt{2} \\ 1/\sqrt{3} & 0 \\ 1/\sqrt{3} & 1/\sqrt{2} \end{pmatrix}$$

$$R = Q^TA = \begin{pmatrix} \sqrt{3} & 2\sqrt{3} \\ 0 & \sqrt{2} \end{pmatrix}$$

### 2.3 Gram-Schmidt 方法的数值问题

经典 Gram-Schmidt 方法在数值计算中可能不稳定（舍入误差累积）。改进的 Gram-Schmidt 方法（MGS）更稳定。

**改进的 Gram-Schmidt**：在每一步中，立即用已正交化的向量消去后续向量中的分量。

## 3. Householder 变换方法

### 3.1 Householder 变换

**Householder 矩阵**（初等反射矩阵）定义为：

$$H = I - 2\frac{\boldsymbol{v}\boldsymbol{v}^T}{\boldsymbol{v}^T\boldsymbol{v}}$$

其中 $\boldsymbol{v}$ 为非零向量。

### 3.2 性质

1. $H$ 是对称矩阵：$H^T = H$
2. $H$ 是正交矩阵：$H^TH = I$
3. $H$ 是对合的：$H^2 = I$
4. $|H| = -1$
5. 几何意义：$H\boldsymbol{x}$ 是 $\boldsymbol{x}$ 关于超平面 $\boldsymbol{v}^T\boldsymbol{x} = 0$ 的反射

### 3.3 构造 Householder 变换

给定向量 $\boldsymbol{x}$，要使 $H\boldsymbol{x} = \alpha\boldsymbol{e}_1$：

$$\boldsymbol{v} = \boldsymbol{x} - \alpha\boldsymbol{e}_1$$

其中 $\alpha = -\text{sign}(x_1)\|\boldsymbol{x}\|$（选择符号以避免相消）。

### 3.4 QR 分解的 Householder 方法

**步骤**：

1. 构造 $H_1$ 使 $H_1 A$ 的第一列除第一个元素外全为零
2. 对 $H_1 A$ 的右下子矩阵重复上述过程
3. 最终 $H_{n-1} \cdots H_2 H_1 A = R$（上三角）
4. $Q = H_1 H_2 \cdots H_{n-1}$

### 3.5 示例

对 $A = \begin{pmatrix} 1 & 1 \\ 1 & 2 \\ 1 & 3 \end{pmatrix}$ 用 Householder 方法进行 QR 分解。

第一列 $\boldsymbol{a}_1 = (1, 1, 1)^T$，$\|\boldsymbol{a}_1\| = \sqrt{3}$

$\boldsymbol{v} = (1, 1, 1)^T - (-\sqrt{3}, 0, 0)^T = (1 + \sqrt{3}, 1, 1)^T$

$H_1 = I - 2\frac{\boldsymbol{v}\boldsymbol{v}^T}{\boldsymbol{v}^T\boldsymbol{v}}$

$H_1 A$ 的第一列变为 $(-\sqrt{3}, 0, 0)^T$，对第二列做相应变换。

## 4. Givens 旋转方法

### 4.1 Givens 旋转

**Givens 旋转矩阵** $G(i, j, \theta)$ 在 $i, j$ 平面上做旋转：

$$G = \begin{pmatrix} 1 & & & & \\ & \cos\theta & & -\sin\theta & \\ & & 1 & & \\ & \sin\theta & & \cos\theta & \\ & & & & 1 \end{pmatrix}$$

### 4.2 特点

- Givens 旋转只改变两个分量
- 适合稀疏矩阵（只消去特定元素）
- 可以并行化

### 4.3 与 Householder 的比较

| 特点     | Householder    | Givens   |
| -------- | -------------- | -------- |
| 每步消去 | 一列中多个元素 | 一个元素 |
| 计算量   | 较少           | 较多     |
| 稀疏矩阵 | 不够高效       | 高效     |
| 并行性   | 较差           | 较好     |

## 5. QR 分解的应用

### 5.1 解最小二乘问题

$\min\|Ax - b\|^2$：$A = QR$，$x = R^{-1}Q^Tb$

### 5.2 QR 算法求特征值

迭代格式：$A_k = Q_kR_k$，$A_{k+1} = R_kQ_k$

$A_k$ 收敛于上三角矩阵（Schur 形），对角线元素为特征值。

### 5.3 解线性方程组

$Ax = b$：$QRx = b$，$Rx = Q^Tb$

### 5.4 矩阵的列空间

$Q$ 的前 $r$ 列构成 $A$ 的列空间的标准正交基。
