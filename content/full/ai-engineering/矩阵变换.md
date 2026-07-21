---
title: 矩阵变换
description: 旋转、缩放、剪切、反射矩阵，特征值与特征向量，特征值分解，对称矩阵的性质
module: 'ai-engineering'
difficulty: intermediate
tags:
  - 矩阵变换
  - 特征值
  - 特征向量
  - 旋转
  - 缩放
  - 特征分解
related:
  - 'ai-engineering/集成方法'
  - 'ai-engineering/降维'
  - 'ai-engineering/决策树与随机森林'
  - 'ai-engineering/开发环境搭建'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 矩阵变换

> 特征向量是矩阵"最理解"的方向。找到它们，你就找到了数据的骨架。

**类型：** 构建
**语言：** Python
**前置条件：** 阶段 1，第 01-02 课
**预计时间：** ~90 分钟

## 学习目标

- 实现 2D 旋转、缩放、剪切和反射变换矩阵并可视化其效果
- 从零计算特征值和特征向量，使用幂迭代法
- 解释特征值分解 `A = P D P^{-1}` 及其对角化的含义
- 描述对称矩阵的特殊性质及其在 PCA 和协方差矩阵中的应用

## 问题所在

当你将一个向量乘以矩阵时，它通常会改变方向和大小。但某些特殊向量只改变大小，不改变方向。这些就是特征向量，它们对应的缩放因子就是特征值。

特征向量揭示了矩阵作用的"骨架"。在 AI 中，它们是以下概念的基础：

- **PCA**：找到最大方差方向（协方差矩阵的特征向量）
- **PageRank**：最大特征值对应的特征向量给出网页排名
- **谱聚类**：图拉普拉斯矩阵的特征向量揭示社区结构
- **协方差矩阵**：特征值告诉你每个方向的方差

## 核心概念

### 基本变换矩阵

2D 空间中的四种基本变换：

**旋转**（逆时针旋转 theta 角）：

```
R(theta) = [[cos(theta), -sin(theta)],
            [sin(theta),  cos(theta)]]
```

**缩放**（x 方向缩放 sx，y 方向缩放 sy）：

```
S(sx, sy) = [[sx, 0 ],
             [0,  sy]]
```

**剪切**：

```
Sh(k) = [[1, k],
         [0, 1]]
```

**反射**（关于 x 轴）：

```
Ref = [[1,  0],
       [0, -1]]
```

### 特征值和特征向量

矩阵 A 的特征向量 v 满足：

```
A v = lambda v
```

其中 lambda 是特征值。v 的方向不变，只是被缩放了 lambda 倍。

```python
import numpy as np

A = np.array([[4, 1],
              [2, 3]])

eigenvalues, eigenvectors = np.linalg.eig(A)

for i, (val, vec) in enumerate(zip(eigenvalues, eigenvectors.T)):
    print(f"特征值 {i}: {val:.2f}, 特征向量: {vec}")
    Av = A @ vec
    print(f"  A @ v = {Av}")
    print(f"  lambda * v = {val * vec}")
```

### 特征值分解

任何可对角化矩阵都可以分解为：

```
A = P D P^{-1}
```

其中 P 的列是特征向量，D 是特征值的对角矩阵。

```python
P = eigenvectors
D = np.diag(eigenvalues)
P_inv = np.linalg.inv(P)

reconstructed = P @ D @ P_inv
print(f"原始矩阵:\n{A}")
print(f"重建矩阵:\n{reconstructed}")
print(f"差异: {np.allclose(A, reconstructed)}")
```

### 对称矩阵的特殊性质

对称矩阵（`A = A^T`）在 AI 中无处不在（协方差矩阵、图拉普拉斯矩阵、Hessian 矩阵）。它们有特殊性质：

1. **特征值都是实数**（没有复数）
2. **特征向量互相正交**（P 是正交矩阵，`P^{-1} = P^T`）
3. **分解简化为** `A = P D P^T`（不需要求逆）

```python
S = np.array([[2, 1],
              [1, 3]])

eigenvalues, eigenvectors = np.linalg.eigh(S)

# 验证正交性
print(f"特征向量正交: {np.allclose(eigenvectors.T @ eigenvectors, np.eye(2))}")
```

## 动手构建

### 幂迭代法求最大特征值

```python
def power_iteration(A, num_iterations=100):
    """使用幂迭代法求最大特征值和对应特征向量"""
    n = A.shape[0]
    v = np.random.randn(n)
    v = v / np.linalg.norm(v)

    for _ in range(num_iterations):
        v_new = A @ v
        eigenvalue = np.dot(v, v_new)
        v = v_new / np.linalg.norm(v_new)

    return eigenvalue, v

A = np.array([[4, 1],
              [2, 3]])

eigenvalue, eigenvector = power_iteration(A)
print(f"最大特征值: {eigenvalue:.4f}")
print(f"对应特征向量: {eigenvector}")

# 与 NumPy 对比
true_eigenvalues = np.linalg.eigvals(A)
print(f"NumPy 特征值: {sorted(true_eigenvalues, reverse=True)}")
```

## 实际应用

| 概念     | AI 中的位置                |
| -------- | -------------------------- |
| 特征向量 | PCA 主成分，图神经网络     |
| 特征值   | 方差解释量，收敛速度       |
| 对称矩阵 | 协方差矩阵，Hessian 矩阵   |
| 谱分解   | 谱聚类，图拉普拉斯矩阵     |
| 幂迭代   | PageRank，大规模特征值计算 |

## 练习

1. 创建旋转矩阵（90度、180度、270度），验证旋转不改变向量长度
2. 对 3x3 对称矩阵执行特征值分解，验证特征向量正交
3. 使用幂迭代法求 5x5 矩阵的最大特征值，与 NumPy 结果对比
4. 创建一个缩放矩阵，解释为什么特征值就是缩放因子
