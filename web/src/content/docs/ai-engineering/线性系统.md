---
title: 线性系统
description: '高斯消元、LU/QR/Cholesky 分解、最小二乘、正规方程、条件数、共轭梯度'
module: 'ai-engineering'
difficulty: intermediate
tags:
  - 线性系统
  - 高斯消元
  - LU分解
  - QR分解
  - Cholesky
  - 最小二乘
  - 条件数
related:
  - 'ai-engineering/线性代数直觉'
  - 'ai-engineering/线性回归'
  - 'ai-engineering/宪法安全线束与红队靶场'
  - 'ai-engineering/向量与矩阵运算'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 线性系统

> 求解 Ax = b 是科学计算的核心。每个训练步骤都在求解一个线性系统。

**类型：** 构建
**语言：** Python
**前置条件：** 阶段 1，第 01-02 课
**预计时间：** ~90 分钟

## 学习目标

- 从零实现高斯消元法求解线性系统
- 实现 LU、QR 和 Cholesky 分解
- 使用正规方程和 QR 分解求解最小二乘问题
- 计算条件数并解释其对数值精度的影响

## 问题所在

线性回归求解 `X^T X w = X^T y`。牛顿法求解 `H delta = -g`。PCA 求解特征值问题。每个优化算法的每一步都涉及求解线性系统。如果你不理解这些方法，你就无法选择正确的求解器或诊断收敛问题。

## 核心概念

### 高斯消元

最直接的线性系统求解方法：将矩阵化为上三角形式，然后回代。

```python
import numpy as np

def gaussian_elimination(A, b):
    """高斯消元法求解 Ax = b"""
    n = len(b)
    A = A.astype(float).copy()
    b = b.astype(float).copy()

    # 前向消元
    for col in range(n):
        # 部分主元选取
        max_row = col + np.argmax(np.abs(A[col:, col]))
        A[[col, max_row]] = A[[max_row, col]]
        b[[col, max_row]] = b[[max_row, col]]

        for row in range(col + 1, n):
            factor = A[row, col] / A[col, col]
            A[row, col:] -= factor * A[col, col:]
            b[row] -= factor * b[col]

    # 回代
    x = np.zeros(n)
    for i in range(n - 1, -1, -1):
        x[i] = (b[i] - A[i, i+1:] @ x[i+1:]) / A[i, i]

    return x

A = np.array([[2, 1, -1],
              [-3, -1, 2],
              [-2, 1, 2]])
b = np.array([8, -11, -3])

x = gaussian_elimination(A, b)
print(f"解: {x}")
print(f"验证: {A @ x}")
```

### LU 分解

将矩阵分解为下三角和上三角矩阵的乘积：A = LU。

```python
def lu_decomposition(A):
    """LU 分解（无主元选取）"""
    n = A.shape[0]
    L = np.eye(n)
    U = A.astype(float).copy()

    for col in range(n):
        for row in range(col + 1, n):
            L[row, col] = U[row, col] / U[col, col]
            U[row, col:] -= L[row, col] * U[col, col:]

    return L, U

A = np.array([[2, 1, 1],
              [4, 3, 3],
              [8, 7, 9]], dtype=float)

L, U = lu_decomposition(A)
print(f"L:\n{L}")
print(f"U:\n{U}")
print(f"验证: {np.allclose(L @ U, A)}")
```

LU 分解的优势：分解一次，对不同的 b 可以快速求解（前代 + 回代）。

### QR 分解

将矩阵分解为正交矩阵和上三角矩阵的乘积：A = QR。

```python
def qr_decomposition(A):
    """QR 分解（Gram-Schmidt 方法）"""
    m, n = A.shape
    Q = np.zeros((m, n))
    R = np.zeros((n, n))

    for j in range(n):
        v = A[:, j].copy()

        for i in range(j):
            R[i, j] = Q[:, i] @ A[:, j]
            v -= R[i, j] * Q[:, i]

        R[j, j] = np.linalg.norm(v)
        Q[:, j] = v / R[j, j]

    return Q, R

A = np.array([[1, 1],
              [1, 2],
              [1, 3]], dtype=float)

Q, R = qr_decomposition(A)
print(f"Q:\n{Q}")
print(f"R:\n{R}")
print(f"验证: {np.allclose(Q @ R, A)}")
```

### Cholesky 分解

对称正定矩阵的专用分解：A = L L^T。比 LU 快两倍。

```python
def cholesky(A):
    """Cholesky 分解"""
    n = A.shape[0]
    L = np.zeros((n, n))

    for i in range(n):
        for j in range(i + 1):
            if i == j:
                L[i, j] = np.sqrt(A[i, i] - np.sum(L[i, :j] ** 2))
            else:
                L[i, j] = (A[i, j] - np.sum(L[i, :j] * L[j, :j])) / L[j, j]

    return L

# 对称正定矩阵
A = np.array([[4, 2],
              [2, 3]], dtype=float)

L = cholesky(A)
print(f"L:\n{L}")
print(f"验证: {np.allclose(L @ L.T, A)}")
```

### 最小二乘

当系统无精确解时，找到使残差最小的解。

```python
def least_squares_normal_eq(X, y):
    """正规方程法求解最小二乘"""
    return np.linalg.solve(X.T @ X, X.T @ y)

def least_squares_qr(X, y):
    """QR 分解法求解最小二乘（更数值稳定）"""
    Q, R = np.linalg.qr(X)
    return np.linalg.solve(R, Q.T @ y)

# 示例：线性回归
X = np.array([[1, 1],
              [1, 2],
              [1, 3],
              [1, 4]], dtype=float)
y = np.array([2, 3, 5, 4], dtype=float)

w_normal = least_squares_normal_eq(X, y)
w_qr = least_squares_qr(X, y)

print(f"正规方程解: {w_normal}")
print(f"QR 分解解: {w_qr}")
```

### 条件数

条件数衡量线性系统对输入扰动的敏感度。

```python
def condition_number(A):
    """计算条件数"""
    return np.linalg.cond(A)

# 良好条件
A_good = np.eye(3)
print(f"良好条件数: {condition_number(A_good):.2f}")  # 1.0

# 病态矩阵
A_ill = np.array([[1, 1],
                   [1, 1.0001]])
print(f"病态条件数: {condition_number(A_ill):.2f}")  # 很大
```

条件数越大，数值误差越大。条件数 > 10^15 的矩阵实际上不可解。

## 方法比较

| 方法     | 适用于           | 复杂度                   | 数值稳定性         |
| -------- | ---------------- | ------------------------ | ------------------ |
| 高斯消元 | 一般方阵         | O(n^3)                   | 中（需要主元选取） |
| LU 分解  | 多次求解同一 A   | O(n^3) 分解，O(n^2) 求解 | 中                 |
| QR 分解  | 最小二乘，特征值 | O(mn^2)                  | 高                 |
| Cholesky | 对称正定         | O(n^3/3)                 | 高                 |
| 共轭梯度 | 大型稀疏系统     | O(kn)                    | 好                 |

## 实际应用

| 方法     | AI 中的位置          |
| -------- | -------------------- |
| LU 分解  | 稀疏线性系统求解     |
| QR 分解  | 最小二乘，回归       |
| Cholesky | 高斯过程，协方差矩阵 |
| 条件数   | 诊断数值问题         |
| 最小二乘 | 线性回归，参数估计   |

## 练习

1. 实现高斯消元，对 5x5 随机矩阵测试，验证解的正确性
2. 比较 LU 分解和 Cholesky 分解在对称正定矩阵上的速度
3. 创建一个病态矩阵，观察条件数和解的精度关系
4. 用 QR 分解法求解超定系统，与正规方程法对比精度
