---
order: 20
tags:
  - 'data-analysis'
difficulty: intermediate
title: 'NumPy 数组操作、线性代数与随机数'
module: 'data-analysis'
category: 'Data Science / NumPy'
description: 'NumPy 核心用法：多维数组操作、广播机制、线性代数运算与随机数生成'
author: fanquanpp
related:
  - 'data-analysis/数据分析概述'
  - 'data-analysis/Pandas-DataFrameSeries-数据清洗-合并重塑'
  - 'data-analysis/Matplotlib-折线图-柱状图-散点图与子图'
prerequisites: []
---

## 1. NumPy 简介

### 1.1 为什么需要 NumPy

Python 原生列表虽然灵活，但在数值计算场景下存在三个根本性缺陷：

1. **性能低下**：列表存储的是对象引用，每个元素需要额外的类型信息和引用开销
2. **缺乏向量化**：对列表元素做运算需要显式循环，无法利用 CPU 的 SIMD 指令
3. **无广播机制**：不同形状的数据无法直接运算
   NumPy 的 `ndarray` 通过以下设计解决了这些问题：

- 连续内存布局，无引用开销
- 固定数据类型（dtype），支持 CPU 向量化指令
- 广播机制，自动处理不同形状的数组运算
  > **为什么理解这些底层差异很重要？** 因为它决定了你何时应该用 NumPy、何时用 Python 列表。对于数值密集型运算，NumPy 可以比原生 Python 快 10-100 倍；但对于少量元素的异构数据操作，Python 列表反而更灵活。

### 1.2 NumPy 在生态中的位置

NumPy 是 Python 科学计算生态的基石。Pandas 的 Series/DataFrame 底层基于 NumPy 数组，Matplotlib 的数值处理依赖 NumPy，SciPy 的算法以 NumPy 数组为输入输出。理解 NumPy 是使用这些上层库的前提。

> 跨模块参考：[Python 基础](python/overview) 中的列表、元组概念是理解 NumPy 数组的基础。

```python
 import numpy as np
 print(np.__version__)
```

## **输出说明**：打印当前安装的 NumPy 版本号，确认环境可用。

## 2. ndarray 创建与属性

### 2.1 核心属性

`ndarray` 是 NumPy 的核心数据结构，每个数组有以下关键属性：

| 属性       | 含义               | 示例                         |
| ---------- | ------------------ | ---------------------------- |
| `ndim`     | 维度数（轴数）     | 2D 数组的 ndim 为 2          |
| `shape`    | 各维度大小（元组） | (3, 4) 表示 3 行 4 列        |
| `size`     | 元素总数           | shape 为 (3,4) 时 size 为 12 |
| `dtype`    | 元素数据类型       | float64, int32, bool 等      |
| `itemsize` | 每个元素的字节数   | float64 为 8 字节            |
| `nbytes`   | 数组总字节数       | size \* itemsize             |

### 2.2 从已有数据创建

```python
 import numpy as np
 arr1 = np.array([1, 2, 3, 4])
 print(f"1D: shape={arr1.shape}, dtype={arr1.dtype}")
 arr2 = np.array([[1, 2, 3], [4, 5, 6]])
 print(f"2D: shape={arr2.shape}, dtype={arr2.dtype}")
 arr3 = np.array([1, 2, 3], dtype=np.float64)
 print(f"指定dtype: {arr3.dtype}")
 arr4 = np.array([1.1, 2.9, 3.5], dtype=np.int32)
 print(f"浮点转整数(截断): {arr4}")
```

**输出说明**：

- `arr1` 是一维数组，shape 为 (4,)，dtype 自动推断为 int64
- `arr2` 是二维数组，shape 为 (2, 3)
- `arr3` 显式指定 float64 类型
- `arr4` 从浮点数创建整数数组时，小数部分被截断（不是四舍五入）

### 2.3 内置创建函数

```python
 import numpy as np
 zeros = np.zeros((3, 4))
 print(f"zeros: shape={zeros.shape}, dtype={zeros.dtype}")
 ones = np.ones((2, 3), dtype=np.int32)
 print(f"ones: {ones}")
 empty = np.empty((2, 2))
 print(f"empty: 未初始化的随机值，shape={empty.shape}")
 full = np.full((2, 3), fill_value=7.0)
 print(f"full: \n{full}")
 eye = np.eye(3)
 print(f"eye(3): 单位矩阵\n{eye}")
 arange = np.arange(0, 10, 2)
 print(f"arange(0,10,2): {arange}")
 linspace = np.linspace(0, 1, 5)
 print(f"linspace(0,1,5): {linspace}")
 logspace = np.logspace(1, 3, 3)
 print(f"logspace(1,3,3): {logspace}")
```

**输出说明**：

- `np.zeros` 创建全零数组，默认 dtype 为 float64
- `np.ones` 创建全一数组，可指定 dtype
- `np.empty` 创建未初始化数组，值取决于内存中的残留数据，速度比 zeros 快
- `np.full` 用指定值填充数组
- `np.eye` 创建单位矩阵（对角线为 1）
- `np.arange` 类似 Python 的 range，但返回数组，步长可以是浮点数
- `np.linspace` 在指定区间内均匀生成 N 个点，包含端点
- `np.logspace` 在对数尺度上均匀生成点
  > **为什么 `np.linspace` 比 `np.arange` 更适合绘图？** `arange` 的步长可能因浮点精度导致端点不精确，而 `linspace` 直接指定点数，保证包含两个端点，在生成绘图坐标轴时更可靠。

### 2.4 随机数创建

```python
 import numpy as np
 rng = np.random.default_rng(seed=42)
 uniform = rng.uniform(0, 1, size=(2, 3))
 print(f"均匀分布:\n{uniform}")
 normal = rng.normal(loc=0, scale=1, size=(2, 3))
 print(f"正态分布:\n{normal}")
 integers = rng.integers(0, 10, size=5)
 print(f"随机整数: {integers}")
 choice = rng.choice(['a', 'b', 'c'], size=5)
 print(f"随机选择: {choice}")
```

## **输出说明**：使用 `default_rng` 新 API 创建随机数生成器，设置 seed 确保可复现。`uniform` 生成 [0,1) 均匀分布，`normal` 生成指定均值和标准差的正态分布，`integers` 生成指定范围的随机整数，`choice` 从给定列表中随机选择。

## 3. 索引与切片

### 3.1 基本索引

```python
 import numpy as np
 arr = np.arange(12).reshape(3, 4)
 print(f"原数组:\n{arr}")
 print(f"arr[0]: {arr[0]}")
 print(f"arr[1, 2]: {arr[1, 2]}")
 print(f"arr[-1, -1]: {arr[-1, -1]}")
```

**输出说明**：二维数组的索引方式为 `arr[row, col]`，支持负数索引。`arr[0]` 返回第一行（一维数组），`arr[1, 2]` 返回第 2 行第 3 列的元素。

### 3.2 切片

```python
 import numpy as np
 arr = np.arange(12).reshape(3, 4)
 print(f"前两行:\n{arr[:2]}")
 print(f"所有行，第2-3列:\n{arr[:, 1:3]}")
 print(f"每隔一行:\n{arr[::2]}")
 print(f"逆序行:\n{arr[::-1]}")
```

**输出说明**：切片语法 `start:stop:step` 适用于每个维度。`arr[:2]` 取前 2 行，`arr[:, 1:3]` 取所有行的第 2、3 列，`arr[::2]` 每隔一行取一行，`arr[::-1]` 行逆序。

> **关键概念：切片返回视图（View）而非拷贝（Copy）**。这意味着修改切片会影响原数组。这是 NumPy 为了避免大数据复制而做的设计选择。如果需要独立副本，必须显式调用 `.copy()`。

```python
 import numpy as np
 arr = np.arange(6)
 slice_arr = arr[2:5]
 slice_arr[0] = 999
 print(f"原数组被修改: {arr}")
 arr2 = np.arange(6)
 copy_arr = arr2[2:5].copy()
 copy_arr[0] = 999
 print(f"原数组未被修改: {arr2}")
```

**输出说明**：第一个示例中，修改 `slice_arr` 后原数组 `arr` 也被修改，因为切片是视图。第二个示例使用 `.copy()` 创建独立副本，修改不影响原数组。

### 3.3 布尔索引

```python
 import numpy as np
 arr = np.array([12, 5, 18, 3, 25, 8, 15])
 mask = arr > 10
 print(f"布尔掩码: {mask}")
 print(f"大于10的元素: {arr[mask]}")
 arr[arr > 10] = 0
 print(f"将大于10的元素置零: {arr}")
```

**输出说明**：布尔索引通过条件表达式生成布尔数组作为掩码，`arr[mask]` 返回满足条件的元素。布尔索引返回的是拷贝，不是视图。

### 3.4 花式索引（Fancy Indexing）

```python
 import numpy as np
 arr = np.arange(10, 20)
 indices = [0, 3, 5, 7]
 print(f"指定位置: {arr[indices]}")
 arr2d = np.arange(12).reshape(3, 4)
 rows = [0, 1, 2]
 cols = [1, 3, 0]
 print(f"对角选取: {arr2d[rows, cols]}")
 print(f"选取特定行:\n{arr2d[0, 2](0, 2)}")
```

**输出说明**：花式索引使用整数数组作为索引。`arr2d[rows, cols]` 同时指定行和列的索引，选取 (0,1)、(1,3)、(2,0) 三个位置的元素。花式索引返回拷贝，不是视图。

> **视图 vs 拷贝速查**：
>
> - 基本切片 -> 视图
> - 布尔索引 -> 拷贝
> - 花式索引 -> 拷贝
> - `.copy()` -> 显式拷贝

---

## 4. 数组形状操作

### 4.1 reshape 与 flatten

```python
 import numpy as np
 arr = np.arange(12)
 reshaped = arr.reshape(3, 4)
 print(f"reshape(3,4):\n{reshaped}")
 auto_reshaped = arr.reshape(3, -1)
 print(f"reshape(3,-1) 自动推断:\n{auto_reshaped}")
 flattened = reshaped.flatten()
 print(f"flatten: {flattened}")
 raveled = reshaped.ravel()
 print(f"ravel: {raveled}")
```

**输出说明**：

- `reshape` 改变数组形状，返回视图（如果可能），元素总数不变
- `-1` 表示自动推断该维度大小
- `flatten` 返回一维拷贝，修改不影响原数组
- `ravel` 返回一维视图（如果可能），修改可能影响原数组
  > **为什么 reshape 返回视图而 flatten 返回拷贝？** reshape 只改变数组的"视图"（步长和形状元数据），不移动数据，因此效率高。flatten 保证返回拷贝，更安全但更耗内存。在内存敏感场景下优先使用 ravel。

### 4.2 转置与轴交换

```python
 import numpy as np
 arr = np.arange(12).reshape(3, 4)
 print(f"原数组 shape: {arr.shape}")
 print(f"转置 shape: {arr.T.shape}")
 arr3d = np.arange(24).reshape(2, 3, 4)
 print(f"3D原数组 shape: {arr3d.shape}")
 print(f"swapaxes(0,2) shape: {arr3d.swapaxes(0, 2).shape}")
 print(f"transpose(2,0,1) shape: {arr3d.transpose(2, 0, 1).shape}")
```

**输出说明**：

- `.T` 是转置的简写，等价于 `transpose()`
- `swapaxes(i, j)` 交换两个轴
- `transpose(*axes)` 按指定顺序重排所有轴
- 转置操作返回视图，不复制数据

### 4.3 数组拼接与分裂

```python
 import numpy as np
 a = np.array([[1, 2], [3, 4]])
 b = np.array([5, 6](5, 6))
 vstack = np.vstack([a, b])
 print(f"vstack 垂直拼接:\n{vstack}")
 hstack = np.hstack([a, b.T])
 print(f"hstack 水平拼接:\n{hstack}")
 c = np.array([7, 8])
 concat_axis0 = np.concatenate([a, c.reshape(1, 2)], axis=0)
 print(f"concatenate axis=0:\n{concat_axis0}")
 stack = np.stack([a, a], axis=0)
 print(f"stack axis=0 shape: {stack.shape}")
 arr = np.arange(12).reshape(3, 4)
 split = np.hsplit(arr, 2)
 print(f"hsplit 分成2部分: [shape={s.shape} for s in split]")
```

**输出说明**：

- `vstack` 垂直拼接（沿 axis=0），要求列数相同
- `hstack` 水平拼接（沿 axis=1），要求行数相同
- `concatenate` 是最通用的拼接函数，通过 axis 指定拼接方向
- `stack` 创建新维度进行拼接，与 concatenate 不同
- `hsplit`/`vsplit` 按指定方式分裂数组

---

## 5. 广播机制

### 5.1 广播规则

广播是 NumPy 处理不同形状数组运算的机制。规则如下：

1. 如果两个数组的维度数不同，较小维度数组的形状在左侧补 1
2. 如果两个数组在某个维度上的大小不同，大小为 1 的维度会被扩展
3. 如果两个数组在某个维度上大小不同且都不为 1，则报错
   > **为什么需要广播？** 广播避免了显式复制数据，既节省内存又简化代码。没有广播，你需要手动将标量扩展为与数组相同大小的数组，或使用循环逐元素运算。

### 5.2 广播示例

```python
 import numpy as np
 a = np.array([[1], [2], [3]])
 b = np.array([10, 20, 30])
 print(f"a shape: {a.shape}, b shape: {b.shape}")
 result = a + b
 print(f"a + b:\n{result}")
 print(f"result shape: {result.shape}")
```

**输出说明**：a 的 shape 为 (3, 1)，b 的 shape 为 (3,)。广播过程：

1. b 补齐维度 -> (1, 3)
2. a 沿 axis=1 扩展 -> (3, 3)
3. b 沿 axis=0 扩展 -> (3, 3)
4. 两个 (3, 3) 数组逐元素相加

### 5.3 常见广播场景

```python
 import numpy as np
 arr = np.arange(12).reshape(3, 4)
 print(f"原数组:\n{arr}")
 row_mean = arr.mean(axis=0)
 print(f"每列均值: {row_mean}")
 centered = arr - row_mean
 print(f"去均值后:\n{centered}")
 print(f"去均值后列均值: {centered.mean(axis=0)}")
 col_max = arr.max(axis=1, keepdims=True)
 print(f"每行最大值(keepdims): {col_max.T}")
 normalized = arr / col_max
 print(f"按行归一化:\n{normalized}")
```

**输出说明**：

- `arr.mean(axis=0)` 返回 shape 为 (4,) 的列均值，与 (3,4) 数组运算时自动广播
- `keepdims=` 保持维度，使结果 shape 为 (3,1) 而非 (3,)，便于后续广播运算
- 数据去均值是统计分析和机器学习中最常见的预处理步骤

### 5.4 广播失败的情况

```python
 import numpy as np
 a = np.ones((3, 4))
 b = np.ones((2, 4))
 try:
  result = a + b
 except ValueError as e:
  print(f"广播失败: {e}")
 a = np.ones((3, 1))
 b = np.ones((1, 4))
 result = a + b
 print(f"可广播: (3,1) + (1,4) -> {result.shape}")
```

## **输出说明**：shape (3,4) 和 (2,4) 在 axis=0 上大小不同且都不为 1，无法广播。而 (3,1) 和 (1,4) 可以广播为 (3,4)。

## 6. 通用函数（ufunc）

### 6.1 数学运算

```python
 import numpy as np
 x = np.array([0, np.pi/6, np.pi/4, np.pi/3, np.pi/2])
 print(f"sin: {np.sin(x)}")
 print(f"cos: {np.cos(x)}")
 print(f"tan: {np.tan(x)}")
 arr = np.array([1, 2, 3, 4, 5])
 print(f"exp: {np.exp(arr)}")
 print(f"log: {np.log(arr)}")
 print(f"log2: {np.log2(arr)}")
 print(f"log10: {np.log10(arr)}")
 print(f"sqrt: {np.sqrt(arr)}")
```

**输出说明**：NumPy 的三角函数、指数、对数等数学函数都是 ufunc，对数组逐元素运算并返回新数组。`np.log` 是自然对数，`np.log2` 和 `np.log10` 分别是以 2 和 10 为底的对数。

### 6.2 比较运算

```python
 import numpy as np
 a = np.array([1, 5, 3, 8, 2])
 b = np.array([2, 4, 3, 6, 5])
 print(f"a > b: {np.greater(a, b)}")
 print(f"a == b: {np.equal(a, b)}")
 print(f"a >= b: {np.greater_equal(a, b)}")
 print(f"any(a > b): {np.any(a > b)}")
 print(f"all(a > b): {np.all(a > b)}")
```

**输出说明**：比较 ufunc 返回布尔数组。`np.any` 检查是否有任一元素为 True，`np.all` 检查是否所有元素为 True。

### 6.3 out 参数与 where 条件

```python
 import numpy as np
 x = np.array([1, 2, 3, 4, 5])
 result = np.empty_like(x)
 np.multiply(x, 10, out=result)
 print(f"out参数: {result}")
 arr = np.array([-3, -1, 0, 2, 5])
 result = np.where(arr > 0, arr, 0)
 print(f"where条件(正数保留，其余置零): {result}")
 result2 = np.where(arr > 0, 'positive', 'non-positive')
 print(f"where条件(字符串): {result2}")
```

**输出说明**：

- `out` 参数指定输出数组，避免创建临时数组，节省内存
- `np.where(condition, x, y)` 是三元表达式的向量化版本，满足条件取 x，否则取 y

---

## 7. 聚合与统计运算

### 7.1 基本聚合函数

```python
 import numpy as np
 arr = np.random.default_rng(42).normal(loc=50, scale=10, size=(4, 5))
 print(f"数组:\n{arr}")
 print(f"总和: {arr.sum()}")
 print(f"均值: {arr.mean()}")
 print(f"标准差: {arr.std()}")
 print(f"方差: {arr.var()}")
 print(f"最小值: {arr.min()}")
 print(f"最大值: {arr.max()}")
 print(f"中位数: {np.median(arr)}")
```

**输出说明**：聚合函数对整个数组的所有元素进行计算，返回标量值。

### 7.2 沿指定轴聚合

```python
 import numpy as np
 arr = np.random.default_rng(42).normal(loc=50, scale=10, size=(4, 5))
 print(f"每列均值 (axis=0): {arr.mean(axis=0)}")
 print(f"每行均值 (axis=1): {arr.mean(axis=1)}")
 print(f"每列最小值: {arr.min(axis=0)}")
 print(f"每行最大值: {arr.max(axis=1)}")
 print(f"累计和 (axis=1):\n{arr.cumsum(axis=1)}")
```

**输出说明**：

- `axis=0` 沿行方向聚合（对每列操作），结果维度减少一个
- `axis=1` 沿列方向聚合（对每行操作）
- `cumsum` 返回与原数组相同形状的累计和数组
  > **为什么 axis 参数容易混淆？** 关键理解：axis 指定的是"被消除的维度"。axis=0 消除行维度，即对每列做聚合；axis=1 消除列维度，即对每行做聚合。

### 7.3 argmin/argmax 与百分位数

```python
 import numpy as np
 arr = np.array([23, 45, 12, 67, 34, 89, 56])
 print(f"最小值索引: {arr.argmin()}")
 print(f"最大值索引: {arr.argmax()}")
 print(f"25%分位数: {np.percentile(arr, 25)}")
 print(f"75%分位数: {np.percentile(arr, 75)}")
 print(f"IQR: {np.percentile(arr, 75) - np.percentile(arr, 25)}")
```

## **输出说明**：`argmin`/`argmax` 返回最值的索引位置（而非值），在需要定位极值时非常有用。`percentile` 计算指定百分位的值，IQR（四分位距）是异常值检测的基础。

## 8. 线性代数

### 8.1 矩阵乘法

```python
 import numpy as np
 A = np.array([[1, 2], [3, 4]])
 B = np.array([[5, 6], [7, 8]])
 dot_product = np.dot(A, B)
 print(f"np.dot:\n{dot_product}")
 matmul = A @ B
 print(f"@ 运算符:\n{matmul}")
 element_wise = A * B
 print(f"逐元素乘法:\n{element_wise}")
```

**输出说明**：

- `np.dot` 和 `@` 运算符执行矩阵乘法（线性代数中的点积）
- `*` 是逐元素乘法（Hadamard 积），不是矩阵乘法
- 混淆这两种运算是初学者最常见的错误

### 8.2 矩阵分解与求解

```python
 import numpy as np
 A = np.array([[3, 1], [1, 2]])
 b = np.array([9, 8])
 x = np.linalg.solve(A, b)
 print(f"线性方程组解: {x}")
 print(f"验证 Ax=b: {A @ x}")
 det = np.linalg.det(A)
 print(f"行列式: {det:.4f}")
 inv_A = np.linalg.inv(A)
 print(f"逆矩阵:\n{inv_A}")
 print(f"验证 A*A^-1=I:\n{A @ inv_A}")
 eigenvalues, eigenvectors = np.linalg.eig(A)
 print(f"特征值: {eigenvalues}")
 print(f"特征向量:\n{eigenvectors}")
```

**输出说明**：

- `np.linalg.solve(A, b)` 求解 Ax=b，比先求逆再乘更稳定高效
- `np.linalg.det` 计算行列式，行列式为 0 的矩阵不可逆
- `np.linalg.inv` 求逆矩阵，数值上不如 solve 稳定
- `np.linalg.eig` 返回特征值和特征向量，特征向量按列排列

### 8.3 SVD 分解

```python
 import numpy as np
 A = np.array([[1, 2, 3], [4, 5, 6]])
 U, s, Vt = np.linalg.svd(A, full_matrices=False)
 print(f"U shape: {U.shape}")
 print(f"s (奇异值): {s}")
 print(f"Vt shape: {Vt.shape}")
 reconstructed = U @ np.diag(s) @ Vt
 print(f"重构误差: {np.allclose(A, reconstructed)}")
```

**输出说明**：SVD（奇异值分解）将矩阵分解为 U _ diag(s) _ Vt。`full_matrices=False` 返回精简分解。SVD 在降维（PCA）、推荐系统、图像压缩等领域有广泛应用。

> **为什么 SVD 比特征值分解更通用？** 特征值分解只适用于方阵，而 SVD 适用于任意形状的矩阵。且 SVD 总是数值稳定的，而特征值分解在某些情况下可能不稳定。

---

## 9. 随机数生成

### 9.1 新旧 API 对比

NumPy 1.17+ 推荐使用 `default_rng` 新 API，取代旧的 `np.random` 全局函数：

| 旧 API                      | 新 API                            | 说明                  |
| --------------------------- | --------------------------------- | --------------------- |
| `np.random.seed(42)`        | `rng = np.random.default_rng(42)` | 新 API 创建独立生成器 |
| `np.random.rand(3,4)`       | `rng.random((3,4))`               | [0,1) 均匀分布        |
| `np.random.randn(3,4)`      | `rng.standard_normal((3,4))`      | 标准正态分布          |
| `np.random.randint(0,10,5)` | `rng.integers(0,10,5)`            | 随机整数              |

> **为什么推荐新 API？** 旧 API 使用全局状态，在多线程或并行计算中可能导致随机数序列不可预测。新 API 的生成器是独立对象，状态隔离，更适合科学计算的可复现性要求。

### 9.2 常见分布

```python
 import numpy as np
 rng = np.random.default_rng(seed=42)
 uniform = rng.uniform(low=0, high=10, size=5)
 print(f"均匀分布 U(0,10): {uniform}")
 normal = rng.normal(loc=0, scale=1, size=5)
 print(f"正态分布 N(0,1): {normal}")
 poisson = rng.poisson(lam=3, size=5)
 print(f"泊松分布 Pois(3): {poisson}")
 binomial = rng.binomial(n=10, p=0.5, size=5)
 print(f"二项分布 B(10,0.5): {binomial}")
 exponential = rng.exponential(scale=2, size=5)
 print(f"指数分布 Exp(2): {exponential}")
 chi2 = rng.chisquare(df=5, size=5)
 print(f"卡方分布 chi2(5): {chi2}")
```

**输出说明**：各分布的参数含义：

- `uniform(low, high)`：[low, high) 区间均匀分布
- `normal(loc, scale)`：均值 loc，标准差 scale 的正态分布
- `poisson(lam)`：期望 lam 的泊松分布
- `binomial(n, p)`：n 次试验，每次成功概率 p 的二项分布
- `exponential(scale)`：scale 为均值的指数分布
- `chisquare(df)`：自由度 df 的卡方分布

### 9.3 随机抽样与洗牌

```python
 import numpy as np
 rng = np.random.default_rng(seed=42)
 arr = np.arange(10)
 rng.shuffle(arr)
 print(f"洗牌后: {arr}")
 sample = rng.choice(arr, size=5, replace=False)
 print(f"无放回抽样: {sample}")
 sample_replace = rng.choice(arr, size=8, replace=True)
 print(f"有放回抽样: {sample_replace}")
 weighted = rng.choice(['A', 'B', 'C'], size=10, p=[0.5, 0.3, 0.2])
 print(f"加权抽样: {weighted}")
```

**输出说明**：

- `shuffle` 原地打乱数组顺序
- `choice` 从数组中抽样，`replace=False` 为无放回，`replace=` 为有放回
- `p` 参数指定各元素的抽样概率，概率之和必须为 1

---

## 10. 性能优化技巧

### 10.1 向量化替代循环

```python
 import numpy as np
 rng = np.random.default_rng(42)
 data = rng.random(1_000_000)
 def loop_sum(arr):
  total = 0.0
  for x in arr:
  total += x
  return total
 loop_result = loop_sum(data)
 vectorized_result = data.sum()
 print(f"循环结果: {loop_result:.6f}")
 print(f"向量化结果: {vectorized_result:.6f}")
```

**输出说明**：两种方法结果相同，但向量化版本 `data.sum()` 比循环版本快数十倍。原因是 NumPy 的聚合函数底层使用 C 实现的向量化代码，避免了 Python 循环的解释器开销。

### 10.2 预分配数组

```python
 import numpy as np
 n = 10000
 result_append = []
 for i in range(n):
  result_append.append(i ** 2)
 result_append = np.array(result_append)
 result_prealloc = np.empty(n)
 for i in range(n):
  result_prealloc[i] = i ** 2
 result_vectorized = np.arange(n) ** 2
 print(f"三种方法结果一致: {np.allclose(result_append, result_vectorized)}")
```

**输出说明**：预分配数组比动态 append 更高效，因为避免了反复的内存分配。但最佳方案始终是向量化操作。

### 10.3 np.where 替代条件判断

```python
 import numpy as np
 arr = np.random.default_rng(42).standard_normal(100000)
 result_loop = np.empty_like(arr)
 for i in range(len(arr)):
  if arr[i] > 0:
  result_loop[i] = arr[i]
  else:
  result_loop[i] = 0
 result_where = np.where(arr > 0, arr, 0)
 print(f"结果一致: {np.allclose(result_loop, result_where)}")
```

**输出说明**：`np.where` 是条件判断的向量化替代，避免了逐元素的 Python 循环，性能提升显著。

### 10.4 内存布局

```python
 import numpy as np
 arr_c = np.zeros((1000, 1000), order='C')
 arr_f = np.zeros((1000, 1000), order='F')
 print(f"C order (行优先): 连续访问一行的元素更快")
 print(f"F order (列优先): 连续访问一列的元素更快")
 print(f"arr_c flags:\n{arr_c.flags}")
```

**输出说明**：

- C order（行优先）：同一行的元素在内存中连续存储，按行遍历更快
- Fortran order（列优先）：同一列的元素在内存中连续存储，按列遍历更快
- 选择与访问模式匹配的内存布局可以显著提升缓存命中率

---

## 11. 速查表

### 11.1 数组创建

| 函数            | 说明            | 示例                 |
| --------------- | --------------- | -------------------- |
| `np.array()`    | 从列表/元组创建 | `np.array([1,2,3])`  |
| `np.zeros()`    | 全零数组        | `np.zeros((3,4))`    |
| `np.ones()`     | 全一数组        | `np.ones((2,3))`     |
| `np.empty()`    | 未初始化数组    | `np.empty((2,2))`    |
| `np.full()`     | 指定值填充      | `np.full((2,3), 7)`  |
| `np.eye()`      | 单位矩阵        | `np.eye(3)`          |
| `np.arange()`   | 等差序列        | `np.arange(0,10,2)`  |
| `np.linspace()` | 等间距点        | `np.linspace(0,1,5)` |
| `np.logspace()` | 对数间距点      | `np.logspace(1,3,3)` |

### 11.2 索引与切片

| 操作     | 语法                   | 返回   |
| -------- | ---------------------- | ------ |
| 基本索引 | `arr[0, 1]`            | 标量   |
| 切片     | `arr[:2, 1:3]`         | 视图   |
| 布尔索引 | `arr[arr > 0]`         | 拷贝   |
| 花式索引 | `arr[[0,2], [1,3]]`    | 拷贝   |
| 条件替换 | `np.where(cond, x, y)` | 新数组 |

### 11.3 形状操作

| 函数                            | 说明          | 返回       |
| ------------------------------- | ------------- | ---------- |
| `reshape()`                     | 改变形状      | 视图       |
| `ravel()`                       | 展平为一维    | 视图(可能) |
| `flatten()`                     | 展平为一维    | 拷贝       |
| `.T`                            | 转置          | 视图       |
| `concatenate()`                 | 拼接          | 新数组     |
| `vstack()`/`hstack()`           | 垂直/水平拼接 | 新数组     |
| `split()`/`hsplit()`/`vsplit()` | 分裂          | 列表       |

### 11.4 线性代数

| 函数                     | 说明          |
| ------------------------ | ------------- |
| `np.dot(A, B)` / `A @ B` | 矩阵乘法      |
| `np.linalg.det(A)`       | 行列式        |
| `np.linalg.inv(A)`       | 逆矩阵        |
| `np.linalg.solve(A, b)`  | 解线性方程组  |
| `np.linalg.eig(A)`       | 特征值分解    |
| `np.linalg.svd(A)`       | 奇异值分解    |
| `np.linalg.norm(A)`      | 矩阵/向量范数 |

---

## 12. 延伸阅读

- NumPy 官方文档：https://numpy.org/doc/stable/
- From Python to NumPy (Nicolas Rougier)：https://www.labri.fr/perso/nrougier/from-python-to-numpy/
- Linear Algebra and Its Applications (Gilbert Strang)
- 100 NumPy Exercises：https://github.com/rougier/numpy-100
