---
title: 张量运算
description: 'Tensor 类实现、步幅与 reshape、广播机制、einsum 表达式、用 einsum 实现注意力机制'
module: 'ai-engineering'
difficulty: intermediate
tags:
  - 张量
  - 步幅
  - reshape
  - 广播
  - einsum
  - 注意力机制
related:
  - 'ai-engineering/语音识别ASR'
  - 'ai-engineering/语音助手流水线'
  - 'ai-engineering/正则化'
  - 'ai-engineering/支持向量机'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 张量运算

> 张量是数据与深度学习之间的通用语言。每张图片、每个句子、每个梯度都通过张量流动。

**类型：** 构建
**语言：** Python
**前置条件：** 阶段 1，第 01-02 课
**预计时间：** ~90 分钟

## 学习目标

- 从零实现张量类，支持 shape、strides、reshape、transpose 和元素级运算
- 应用广播规则对不同形状的张量进行运算，无需复制数据
- 编写 einsum 表达式实现点积、矩阵乘法、外积和批量运算
- 追踪多头注意力中每一步的精确张量形状

## 问题所在

你构建了一个 Transformer。前向传播看起来很干净。运行后得到：`RuntimeError: mat1 and mat2 shapes cannot be multiplied (32x768 and 512x768)`。你盯着形状看，尝试转置，又报 `Expected 4D input (got 3D input)`。你加了 unsqueeze，其他地方又出错了。

形状错误是深度学习代码中最常见的 Bug。它们在概念上不难——每个操作都有形状契约——但它们快速累积。一个 Transformer 有几十个 reshape、transpose 和 broadcast 链在一起。一个错误的轴，错误就会级联。更糟的是，有些形状错误根本不抛异常，它们沿着错误的维度广播或在错误的轴上求和，默默产生垃圾。

## 核心概念

### 什么是张量

张量是多维数字数组，具有统一的数据类型。维度的数量是**秩**（或**阶**）。每个维度是一个**轴**。**形状**是列出每个轴大小的元组。

```
标量: rank 0, shape ()
向量: rank 1, shape (3,)
矩阵: rank 2, shape (2, 3)
3D 张量: rank 3, shape (2, 2, 2)
4D 张量: rank 4, shape (B, C, H, W)
```

总元素数 = 所有维度大小的乘积。形状 `(2, 3, 4)` 包含 `2 * 3 * 4 = 24` 个元素。

### 深度学习中的张量形状

| 数据   | 形状           | 含义                    |
| ------ | -------------- | ----------------------- |
| 图像   | `(B, C, H, W)` | B 张 C 通道 HxW 图像    |
| 序列   | `(B, T, D)`    | B 个长度 T 的 D 维序列  |
| 注意力 | `(B, H, T, D)` | B 批 H 头 T 位置 D 维度 |
| 权重   | `(out, in)`    | 线性层权重              |

### 步幅（Strides）

步幅定义了在每个轴上移动一步需要跳过多少个元素。

```python
import numpy as np

A = np.arange(12).reshape(3, 4)
print(f"形状: {A.shape}")
print(f"步幅: {A.strides}")

# 转置不复制数据，只改变步幅
B = A.T
print(f"转置形状: {B.shape}")
print(f"转置步幅: {B.strides}")
```

### Reshape

Reshape 改变形状但不改变数据。只要元素总数不变，就可以 reshape。

```python
A = np.arange(12)
print(f"原始: {A.shape}")          # (12,)
print(f"Reshape (3,4): {A.reshape(3,4).shape}")
print(f"Reshape (2,6): {A.reshape(2,6).shape}")
print(f"Reshape (2,2,3): {A.reshape(2,2,3).shape}")
```

### 广播规则

1. 从最右边的维度开始比较形状
2. 维度匹配，或者其中一个为 1
3. 为 1 的维度被"拉伸"以匹配

```python
# (3, 1) + (1, 3) = (3, 3)
A = np.ones((3, 1))
B = np.ones((1, 3))
C = A + B
print(f"广播结果: {C.shape}")  # (3, 3)
```

### Einsum

Einsum 使用爱因斯坦求和约定，用简洁的表达式表示张量运算。

```python
# 矩阵乘法：C[i,j] = sum_k A[i,k] * B[k,j]
C = np.einsum('ik,kj->ij', A, B)

# 点积：c = sum_i a[i] * b[i]
c = np.einsum('i,i->', a, b)

# 外积：C[i,j] = a[i] * b[j]
C = np.einsum('i,j->ij', a, b)

# 批量矩阵乘法：C[b,i,j] = sum_k A[b,i,k] * B[b,k,j]
C = np.einsum('bik,bkj->bij', A, B)

# 转置：B[i,j] = A[j,i]
B = np.einsum('ji->ij', A)

# 对角线：d[i] = A[i,i]
d = np.einsum('ii->i', A)

# 迹：tr = sum_i A[i,i]
tr = np.einsum('ii->', A)
```

### 用 Einsum 实现注意力机制

```python
def attention(Q, K, V):
    """
    Q: (batch, heads, seq_len, head_dim)
    K: (batch, heads, seq_len, head_dim)
    V: (batch, heads, seq_len, head_dim)
    """
    d_k = Q.shape[-1]

    # 注意力分数: (batch, heads, seq_len, seq_len)
    scores = np.einsum('bhid,bhjd->bhij', Q, K) / np.sqrt(d_k)

    # Softmax
    weights = np.exp(scores - scores.max(axis=-1, keepdims=True))
    weights = weights / weights.sum(axis=-1, keepdims=True)

    # 加权求和: (batch, heads, seq_len, head_dim)
    output = np.einsum('bhij,bhjd->bhid', weights, V)

    return output
```

## 实际应用

| 运算      | AI 中的位置              |
| --------- | ------------------------ |
| Reshape   | 展平层，注意力 reshape   |
| Transpose | 注意力计算，卷积格式转换 |
| 广播      | 偏置加法，掩码应用       |
| Einsum    | 注意力，自定义操作       |
| 步幅      | 理解内存布局，性能优化   |

## 练习

1. 创建 4D 张量 `(2, 3, 4, 5)`，计算总元素数，验证 reshape 后总数不变
2. 用 einsum 实现批量矩阵乘法，与 `np.matmul` 结果对比
3. 手动追踪注意力机制中每一步的形状：输入 `(2, 4, 8)`，4 头，head_dim=2
4. 实现广播加法：将形状 `(3,)` 的偏置加到形状 `(2, 3)` 的矩阵上
