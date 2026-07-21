---
title: 线性代数直觉
description: '向量、矩阵、点积、线性独立、秩、投影、Gram-Schmidt 正交化的直觉理解与 Python 实现'
module: 'ai-engineering'
difficulty: intermediate
tags:
  - 线性代数
  - 向量
  - 矩阵
  - 点积
  - 秩
  - 投影
  - 'Gram-Schmidt'
related:
  - 'ai-engineering/无服务器LLM冷启动缓解'
  - 'ai-engineering/无监督学习'
  - 'ai-engineering/线性回归'
  - 'ai-engineering/线性系统'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 线性代数直觉

> 线性代数不是关于数字的。它是关于空间的。理解了空间，数字自然就位。

**类型：** 构建
**语言：** Python
**前置条件：** 无
**预计时间：** ~90 分钟

## 学习目标

- 将向量解释为空间中的方向和缩放，而不仅仅是数字列表
- 计算点积并解释它如何衡量对齐程度和投影
- 使用行列式和秩判断线性系统是否有解
- 从零实现 Gram-Schmidt 正交化，理解正交基为何重要

## 问题所在

你在 PyTorch 中写 `torch.matmul(A, B)`，得到一个结果。但它是正确的结果吗？你怎么知道？如果你不知道矩阵乘法在几何上做了什么，你就无法调试形状错误、理解为什么模型学不到东西，或设计新的架构。

线性代数是 AI 中所有计算的底层语言。每个模型都是矩阵运算。每个训练步骤都是求解线性系统。每个 embedding 都是一个向量空间。如果你只把矩阵当作数字表格，你就是在盲目操作。

## 核心概念

### 向量：方向 + 大小

向量不仅仅是一列数字。它是一条从原点出发、有方向和长度的箭头。

```python
import numpy as np

v = np.array([3, 4])
print(f"方向: {np.arctan2(v[1], v[0]) * 180 / np.pi:.1f} 度")
print(f"大小（长度）: {np.linalg.norm(v):.2f}")
```

方向告诉我们它指向哪里。大小告诉我们它有多长。两个向量可以方向相同但大小不同（同方向，不同速度），或大小相同但方向不同（同速度，不同方向）。

### 点积：对齐的度量

点积是 AI 中最重要的运算。它衡量两个向量对齐的程度。

```python
a = np.array([1, 0])
b = np.array([0, 1])

print(f"垂直: {np.dot(a, b)}")  # 0

c = np.array([1, 0])
d = np.array([1, 0])

print(f"平行: {np.dot(c, d)}")  # 1

e = np.array([1, 0])
f = np.array([-1, 0])

print(f"反向: {np.dot(e, f)}")  # -1
```

点积的三种情况：

| 点积 | 含义                 | 几何 |
| ---- | -------------------- | ---- |
| 正   | 向量大致指向同一方向 | 锐角 |
| 零   | 向量互相垂直         | 直角 |
| 负   | 向量大致指向相反方向 | 钝角 |

点积的公式：

```
a . b = |a| * |b| * cos(theta)
```

其中 `theta` 是 a 和 b 之间的夹角。这意味着：

- 当向量对齐（theta = 0）时，点积最大
- 当向量垂直（theta = 90）时，点积为零
- 当向量反向（theta = 180）时，点积最小（最大负值）

在 AI 中，点积无处不在：

- **注意力机制**：Query 和 Key 的点积决定关注什么
- **相似度**：Embedding 之间的点积衡量它们有多相似
- **线性层**：`y = Wx + b` 是输入与权重行的点积

### 投影：向另一个向量的影子

投影是一个向量在另一个向量方向上的"影子"。它使用点积来计算。

```python
def project(a, b):
    """将向量 a 投影到向量 b 上"""
    return (np.dot(a, b) / np.dot(b, b)) * b

v = np.array([3, 4])
axis = np.array([1, 0])

proj = project(v, axis)
print(f"v 在 x 轴上的投影: {proj}")  # [3, 0]
```

投影将向量分解为分量。在 AI 中，这是降维（PCA）和信号分离的原理。

### 矩阵：线性变换

矩阵将一个向量变换为另一个向量。每一列都是变换后的基向量。

```python
# 2x2 矩阵将 2D 向量变换为 2D 向量
A = np.array([[2, 0],
              [0, 3]])

v = np.array([1, 1])
result = A @ v  # [2, 3]
```

这个矩阵将 x 分量拉伸 2 倍，y 分量拉伸 3 倍。矩阵的列 `[2, 0]` 和 `[0, 3]` 是变换后的基向量。

### 线性独立和秩

如果一组向量中没有任何一个可以表示为其他向量的组合，那么这组向量就是线性独立的。

```python
v1 = np.array([1, 0])
v2 = np.array([0, 1])
# 线性独立：无法用 v1 表示 v2，反之亦然

v3 = np.array([2, 0])
# v3 = 2 * v1，所以 {v1, v3} 线性相关
```

矩阵的秩是线性独立的列（或行）的数量。它告诉你矩阵实际包含多少维信息。

```python
A = np.array([[1, 2, 3],
              [4, 5, 6],
              [7, 8, 9]])

print(f"秩: {np.linalg.matrix_rank(A)}")  # 2（不是 3！）
```

这个矩阵看起来有 3 列，但第三列是前两列的线性组合。秩为 2 意味着信息只跨越 2 维。

**为什么在 AI 中重要：** 低秩矩阵出现在模型压缩（LoRA 使用低秩更新）、推荐系统（用户-物品矩阵是低秩的）和 PCA（找到捕获最多方差的低秩子空间）中。

### 行列式：变换的缩放因子

行列式衡量矩阵对空间拉伸或压缩的程度。

```python
A = np.array([[2, 0],
              [0, 3]])

print(f"行列式: {np.linalg.det(A)}")  # 6.0
```

行列式为 6 意味着矩阵将面积放大了 6 倍。关键情况：

| 行列式 | 含义                               |
| ------ | ---------------------------------- |
| 正     | 方向保持（空间不翻转）             |
| 负     | 方向反转（空间翻转）               |
| 零     | 矩阵将空间压缩到更低维度（不可逆） |

行列式为零意味着矩阵丢失了信息。你无法反转它。在 AI 中，这意味着系统没有唯一解。

## 动手构建

### Gram-Schmidt 正交化

Gram-Schmidt 取一组向量并产生一组正交（互相垂直）向量，跨越相同的空间。

```python
def gram_schmidt(vectors):
    """从一组向量创建正交基"""
    basis = []
    for v in vectors:
        w = v.copy()
        for b in basis:
            w = w - project(v, b)
        if np.linalg.norm(w) > 1e-10:
            w = w / np.linalg.norm(w)
            basis.append(w)
    return basis

vectors = [
    np.array([1.0, 1.0, 0.0]),
    np.array([1.0, 0.0, 1.0]),
    np.array([0.0, 1.0, 1.0]),
]

orthogonal = gram_schmidt(vectors)
for i, b in enumerate(orthogonal):
    print(f"基向量 {i}: {b}")

# 验证正交性
for i in range(len(orthogonal)):
    for j in range(i + 1, len(orthogonal)):
        dot = np.dot(orthogonal[i], orthogonal[j])
        print(f"  e{i} . e{j} = {dot:.6f}")
```

正交基很重要，因为：

- 坐标是独立的（改变一个不影响其他）
- 投影很简单（只需点积，无需求逆）
- 数值更稳定（没有冗余信息）

## 实际应用

| 概念   | AI 中的位置                            |
| ------ | -------------------------------------- |
| 点积   | 注意力分数，相似度搜索，线性层         |
| 投影   | PCA，嵌入空间，降维                    |
| 秩     | LoRA（低秩适应），矩阵补全，模型压缩   |
| 正交性 | QR 分解，正交初始化，Gram-Schmidt      |
| 行列式 | 变换的雅可比行列式，归一化流，体积变化 |

## 练习

1. 创建两个 3D 向量，计算它们的点积，验证它等于 `|a||b|cos(theta)`
2. 实现投影函数，将向量投影到非轴方向上
3. 创建一个秩为 2 的 3x3 矩阵，验证 `np.linalg.matrix_rank` 返回 2
4. 对 4 个随机 3D 向量运行 Gram-Schmidt，验证输出向量两两正交
