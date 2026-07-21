---
title: 向量与矩阵运算
description: '从零实现 Vector 和 Matrix 类，支持元素级运算、矩阵乘法、广播机制，理解形状约定和内存布局'
module: 'ai-engineering'
difficulty: intermediate
tags:
  - 向量
  - 矩阵
  - 矩阵乘法
  - 广播
  - NumPy
  - 运算重载
related:
  - 'ai-engineering/线性系统'
  - 'ai-engineering/宪法安全线束与红队靶场'
  - 'ai-engineering/信息论'
  - 'ai-engineering/学习率调度'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 向量与矩阵运算

> 如果你能从零构建矩阵乘法，你就永远不会被形状错误困扰。

**类型：** 构建
**语言：** Python
**前置条件：** 阶段 1，第 01 课（线性代数直觉）
**预计时间：** ~90 分钟

## 学习目标

- 从零实现 `Vector` 和 `Matrix` 类，支持元素级运算和矩阵乘法
- 区分元素级运算和矩阵乘法，理解何时使用哪种
- 实现广播机制，使不同形状的数组无需复制数据即可运算
- 应用形状约定（行优先、列优先、批量维度）避免深度学习中的形状错误

## 问题所在

你写 `A @ B`，PyTorch 返回一个结果。但它是正确的结果吗？你怎么知道？如果你从未从零构建过矩阵乘法，你就无法调试形状错误、理解为什么广播有时会产生错误答案，或优化慢速操作。

本课程从零构建核心数据结构。到最后，你将理解每个操作在底层做了什么。

## 核心概念

### 元素级运算 vs 矩阵乘法

两种根本不同的运算：

```python
# 元素级：逐个位置运算
C[i][j] = A[i][j] + B[i][j]

# 矩阵乘法：点积组合
C[i][j] = sum(A[i][k] * B[k][j] for k in range(K))
```

元素级运算要求形状相同（或可广播）。矩阵乘法要求内维匹配：`(M, K) @ (K, N) = (M, N)`。

### 形状约定

深度学习使用一致的形状约定：

| 数据     | 形状           | 含义                   |
| -------- | -------------- | ---------------------- |
| 向量     | `(D,)`         | D 维向量               |
| 批量向量 | `(B, D)`       | B 个 D 维向量          |
| 矩阵     | `(M, N)`       | M 行 N 列              |
| 批量矩阵 | `(B, M, N)`    | B 个 MxN 矩阵          |
| 图像     | `(B, C, H, W)` | B 张 C 通道 HxW 图像   |
| 序列     | `(B, T, D)`    | B 个长度 T 的 D 维序列 |

### 广播

广播让不同形状的数组一起运算，无需复制数据。

规则：

1. 从最右边的维度开始比较形状
2. 维度匹配，或者其中一个为 1
3. 为 1 的维度被"拉伸"以匹配另一个

```python
# (3, 1) + (1, 3) = (3, 3)
A = np.array([[1], [2], [3]])    # shape (3, 1)
B = np.array([[10, 20, 30]])     # shape (1, 3)
C = A + B                        # shape (3, 3)
# [[11, 21, 31],
#  [12, 22, 32],
#  [13, 23, 33]]
```

## 动手构建

### Vector 类

```python
class Vector:
    def __init__(self, data):
        self.data = list(data)
        self.size = len(self.data)

    def __add__(self, other):
        if self.size != other.size:
            raise ValueError(f"形状不匹配: {self.size} vs {other.size}")
        return Vector([a + b for a, b in zip(self.data, other.data)])

    def __mul__(self, other):
        if isinstance(other, Vector):
            return sum(a * b for a, b in zip(self.data, other.data))
        return Vector([a * other for a in self.data])

    def __rmul__(self, scalar):
        return self.__mul__(scalar)

    def norm(self):
        return sum(a ** 2 for a in self.data) ** 0.5

    def __repr__(self):
        return f"Vector({self.data})"
```

### Matrix 类

```python
class Matrix:
    def __init__(self, data):
        self.data = [list(row) for row in data]
        self.rows = len(self.data)
        self.cols = len(self.data[0])

    def __add__(self, other):
        if self.rows != other.rows or self.cols != other.cols:
            raise ValueError("形状不匹配")
        return Matrix([
            [self.data[i][j] + other.data[i][j]
             for j in range(self.cols)]
            for i in range(self.rows)
        ])

    def __matmul__(self, other):
        if self.cols != other.rows:
            raise ValueError(
                f"内维不匹配: {self.cols} vs {other.rows}"
            )
        result = [
            [sum(self.data[i][k] * other.data[k][j]
                 for k in range(self.cols))
             for j in range(other.cols)]
            for i in range(self.rows)
        ]
        return Matrix(result)

    def T(self):
        return Matrix([
            [self.data[i][j] for i in range(self.rows)]
            for j in range(self.cols)
        ])

    def __repr__(self):
        rows_str = ",\n ".join(str(row) for row in self.data)
        return f"Matrix([{rows_str}])"
```

### 验证

```python
A = Matrix([[1, 2], [3, 4]])
B = Matrix([[5, 6], [7, 8]])

C = A @ B
print(C)
# Matrix([[19, 22],
#         [43, 50]])

# 与 NumPy 对比验证
import numpy as np
A_np = np.array([[1, 2], [3, 4]])
B_np = np.array([[5, 6], [7, 8]])
C_np = A_np @ B_np
print(C_np)
# [[19 22]
#  [43 50]]
```

## 实际应用

| 运算       | AI 中的位置          |
| ---------- | -------------------- |
| 元素级加法 | 残差连接，偏置加法   |
| 元素级乘法 | 注意力掩码，门控机制 |
| 矩阵乘法   | 线性层，注意力 QKV   |
| 广播       | 偏置加到批次，归一化 |
| 转置       | 注意力计算，梯度传播 |

## 练习

1. 扩展 `Matrix` 类，支持标量乘法和元素级乘法（Hadamard 积）
2. 实现广播加法：将形状 `(3,)` 的向量加到形状 `(2, 3)` 的矩阵的每一行
3. 用你自己的 `Matrix` 类计算 `A @ B @ C`，与 NumPy 的结果对比
4. 创建一个形状为 `(4, 3)` 的矩阵和形状为 `(3, 2)` 的矩阵，手动追踪矩阵乘法中每个输出元素的计算
