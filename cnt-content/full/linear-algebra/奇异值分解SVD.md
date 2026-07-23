---
order: 72
title: 奇异值分解SVD
module: 'linear-algebra'
category: 'comp-sci'
difficulty: advanced
description: SVD定理的表述与证明，奇异值的计算方法，SVD的几何意义，SVD在数据压缩和降维中的应用。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'linear-algebra/LU分解'
  - 'linear-algebra/QR分解'
  - 'linear-algebra/矩阵分解应用'
prerequisites:
  - 'linear-algebra/行列式定义与几何意义'
---

## 1. SVD 定理

### 1.1 定理表述

设 $A$ 为 $m \times n$ 实矩阵，$r = r(A)$，则存在正交矩阵 $U$（$m \times m$）和正交矩阵 $V$（$n \times n$），使得：

$$A = U\Sigma V^T$$

其中 $\Sigma = \begin{pmatrix} D & O \\ O & O \end{pmatrix}$，$D = \text{diag}(\sigma_1, \sigma_2, \ldots, \sigma_r)$，$\sigma_1 \geq \sigma_2 \geq \cdots \geq \sigma_r > 0$。

$\sigma_1, \sigma_2, \ldots, \sigma_r$ 称为 $A$ 的**奇异值**。

### 1.2 瘦型 SVD

$$A = U_r \Sigma_r V_r^T$$

其中 $U_r$ 为 $m \times r$，$\Sigma_r$ 为 $r \times r$，$V_r$ 为 $n \times r$。

### 1.3 证明思路

1. $A^TA$ 为 $n$ 阶实对称半正定矩阵，可正交对角化：$A^TA = V\Lambda^2 V^T$
2. 设 $\Lambda = \text{diag}(\sigma_1, \ldots, \sigma_r, 0, \ldots, 0)$，$\sigma_i > 0$
3. 令 $U_r = AV_r\Sigma_r^{-1}$，可验证 $U_r^TU_r = I_r$
4. 扩充 $U_r$ 为正交矩阵 $U$，即得 $A = U\Sigma V^T$

## 2. 奇异值的计算

### 2.1 计算步骤

1. 计算 $A^TA$（$n \times n$ 实对称半正定矩阵）
2. 求 $A^TA$ 的特征值 $\lambda_1 \geq \lambda_2 \geq \cdots \geq \lambda_n \geq 0$
3. 奇异值 $\sigma_i = \sqrt{\lambda_i}$（$i = 1, 2, \ldots, r$）
4. 求 $A^TA$ 的属于 $\lambda_i$ 的标准正交特征向量 $\boldsymbol{v}_i$，构成 $V$
5. 计算 $\boldsymbol{u}_i = \dfrac{A\boldsymbol{v}_i}{\sigma_i}$（$i = 1, \ldots, r$），扩充为正交矩阵 $U$

### 2.2 也可以用 $AA^T$

$AA^T$ 的非零特征值与 $A^TA$ 的非零特征值相同，对应的特征向量构成 $U$ 的前 $r$ 列。

### 2.3 完整示例

求 $A = \begin{pmatrix} 1 & 1 \\ 0 & 1 \\ 1 & 0 \end{pmatrix}$ 的 SVD。

**步骤1**：

$$A^TA = \begin{pmatrix} 2 & 1 \\ 1 & 2 \end{pmatrix}$$

**步骤2**：$|A^TA - \lambda I| = (2-\lambda)^2 - 1 = (\lambda-1)(\lambda-3)$

$\lambda_1 = 3$，$\lambda_2 = 1$

$\sigma_1 = \sqrt{3}$，$\sigma_2 = 1$

**步骤3**：$A^TA$ 的特征向量

$\lambda_1 = 3$：$\boldsymbol{v}_1 = \frac{1}{\sqrt{2}}(1, 1)^T$

$\lambda_2 = 1$：$\boldsymbol{v}_2 = \frac{1}{\sqrt{2}}(1, -1)^T$

$$V = \frac{1}{\sqrt{2}}\begin{pmatrix} 1 & 1 \\ 1 & -1 \end{pmatrix}$$

**步骤4**：

$\boldsymbol{u}_1 = \frac{A\boldsymbol{v}_1}{\sigma_1} = \frac{1}{\sqrt{3}} \cdot \frac{1}{\sqrt{2}}\begin{pmatrix} 2 \\ 1 \\ 1 \end{pmatrix} = \frac{1}{\sqrt{6}}\begin{pmatrix} 2 \\ 1 \\ 1 \end{pmatrix}$

$\boldsymbol{u}_2 = \frac{A\boldsymbol{v}_2}{\sigma_2} = \frac{1}{\sqrt{2}} \cdot \frac{1}{\sqrt{2}}\begin{pmatrix} 0 \\ -1 \\ 1 \end{pmatrix} = \frac{1}{2}\begin{pmatrix} 0 \\ -1 \\ 1 \end{pmatrix}$

扩充 $\boldsymbol{u}_3$ 使 $U$ 为正交矩阵：$\boldsymbol{u}_3 = \frac{1}{\sqrt{3}}(1, -1, -1)^T$

$$U = \begin{pmatrix} \frac{2}{\sqrt{6}} & 0 & \frac{1}{\sqrt{3}} \\ \frac{1}{\sqrt{6}} & -\frac{1}{2} & -\frac{1}{\sqrt{3}} \\ \frac{1}{\sqrt{6}} & \frac{1}{2} & -\frac{1}{\sqrt{3}} \end{pmatrix}$$

$$\Sigma = \begin{pmatrix} \sqrt{3} & 0 \\ 0 & 1 \\ 0 & 0 \end{pmatrix}$$

## 3. SVD 的几何意义

### 3.1 线性变换的分解

$A = U\Sigma V^T$ 表示线性变换 $A$ 可分解为：

1. **旋转/反射** $V^T$：在输入空间中旋转
2. **伸缩** $\Sigma$：沿坐标轴方向伸缩（奇异值为伸缩因子）
3. **旋转/反射** $U$：在输出空间中旋转

### 3.2 像的几何描述

$A$ 将单位球 $\{\boldsymbol{x} \mid \|\boldsymbol{x}\| = 1\}$ 映射为椭球面，椭球的半轴长度为奇异值 $\sigma_1, \sigma_2, \ldots, \sigma_r$。

### 3.3 低秩近似

**Eckart-Young 定理**：在 Frobenius 范数（或谱范数）下，$A$ 的最佳 $k$ 秩近似为：

$$A_k = \sum_{i=1}^{k} \sigma_i \boldsymbol{u}_i \boldsymbol{v}_i^T$$

近似误差：$\|A - A_k\|_F = \sqrt{\sigma_{k+1}^2 + \cdots + \sigma_r^2}$

## 4. SVD 的重要性质

### 4.1 奇异值的性质

1. $\sigma_{\max}(A) = \|A\|_2$（谱范数）
2. $\sigma_{\min}(A) = \min_{\boldsymbol{x} \neq 0}\frac{\|A\boldsymbol{x}\|}{\|\boldsymbol{x}\|}$（$A$ 列满秩时）
3. $\kappa(A) = \frac{\sigma_{\max}}{\sigma_{\min}}$（条件数）
4. $\|A\|_F^2 = \sigma_1^2 + \sigma_2^2 + \cdots + \sigma_r^2$
5. $|A| = \sigma_1\sigma_2\cdots\sigma_n$（$A$ 为方阵时）

### 4.2 与特征值的关系

- $A^TA$ 的特征值为 $\sigma_1^2, \sigma_2^2, \ldots, \sigma_r^2, 0, \ldots, 0$
- $AA^T$ 的特征值为 $\sigma_1^2, \sigma_2^2, \ldots, \sigma_r^2, 0, \ldots, 0$
- 若 $A$ 为实对称矩阵，奇异值等于特征值的绝对值

### 4.3 子空间关系

- $V$ 的前 $r$ 列：$\text{Row}(A)$ 的标准正交基
- $V$ 的后 $n-r$ 列：$N(A)$ 的标准正交基
- $U$ 的前 $r$ 列：$\text{Col}(A)$ 的标准正交基
- $U$ 的后 $m-r$ 列：$N(A^T)$ 的标准正交基

## 5. SVD 的应用

### 5.1 矩阵的伪逆

$$A^+ = V\Sigma^+ U^T$$

其中 $\Sigma^+ = \text{diag}(1/\sigma_1, \ldots, 1/\sigma_r, 0, \ldots, 0)$。

### 5.2 最小二乘解

$\min\|Ax - b\|$ 的最小范数解为 $x = A^+b$。

### 5.3 矩阵的低秩近似

截断 SVD：$A_k = U_k\Sigma_k V_k^T$，用于数据压缩。

### 5.4 图像压缩

将图像矩阵做 SVD，保留前 $k$ 个奇异值，实现有损压缩。压缩比约为 $\dfrac{mn}{k(m+n+1)}$。

### 5.5 降噪

信号中的噪声通常对应较小的奇异值，截断小奇异值可以实现降噪。
