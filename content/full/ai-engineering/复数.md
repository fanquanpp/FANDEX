---
title: 复数
description: '复数运算、欧拉公式、极坐标形式、从单位复数根推导 DFT、RoPE 位置编码的联系'
module: 'ai-engineering'
difficulty: advanced
tags:
  - 复数
  - 欧拉公式
  - 极坐标
  - DFT
  - 傅里叶
  - RoPE
related:
  - 'ai-engineering/范数与距离'
  - 'ai-engineering/分离预填充与解码'
  - 'ai-engineering/傅里叶变换'
  - 'ai-engineering/概率与分布'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 复数

> 复数不是"虚构"的。它们是旋转和振动的自然语言——而 Transformer 的位置编码正是旋转。

**类型：** 构建
**语言：** Python
**前置条件：** 阶段 1，第 01-02 课
**预计时间：** ~60 分钟

## 学习目标

- 执行复数算术运算（加法、乘法、共轭、模）
- 使用欧拉公式在笛卡尔形式和极坐标形式之间转换
- 从单位复数根推导离散傅里叶变换（DFT）
- 解释 RoPE（旋转位置编码）如何利用复数乘法编码位置信息

## 问题所在

复数在 AI 中通常被忽略，但它们出现在两个关键位置：

1. **傅里叶变换**：信号处理、频域分析和位置编码的理论基础
2. **RoPE 位置编码**：Transformer 中使用复数旋转编码 token 位置

如果你不理解复数，你就无法理解这些方法为什么有效。

## 核心概念

### 复数基础

复数 z = a + bi，其中 a 是实部，b 是虚部，i^2 = -1。

```python
import numpy as np

z1 = 3 + 4j
z2 = 1 + 2j

print(f"加法: {z1 + z2}")       # 4+6j
print(f"乘法: {z1 * z2}")       # -5+10j
print(f"共轭: {np.conj(z1)}")   # 3-4j
print(f"模: {abs(z1):.2f}")     # 5.00
print(f"幅角: {np.angle(z1):.4f} rad = {np.degrees(np.angle(z1)):.1f} 度")
```

### 欧拉公式

```
e^(i*theta) = cos(theta) + i*sin(theta)
```

这是数学中最美的公式。它连接了指数函数和三角函数。

```python
theta = np.pi / 4  # 45 度
z = np.exp(1j * theta)
print(f"e^(i*pi/4) = {z:.4f}")
print(f"cos(pi/4) = {np.cos(theta):.4f}")
print(f"sin(pi/4) = {np.sin(theta):.4f}")
```

当 theta = pi 时，得到欧拉恒等式：e^(i\*pi) + 1 = 0。

### 极坐标形式

任何复数可以写成 z = r * e^(i*theta)，其中 r = |z|，theta = arg(z)。

```python
def to_polar(z):
    """复数转极坐标"""
    return abs(z), np.angle(z)

def from_polar(r, theta):
    """极坐标转复数"""
    return r * np.exp(1j * theta)

z = 3 + 4j
r, theta = to_polar(z)
print(f"极坐标: r={r:.2f}, theta={theta:.4f} rad")
print(f"还原: {from_polar(r, theta):.4f}")
```

极坐标下，复数乘法就是模相乘、幅角相加。这就是旋转。

### 单位复数根

n 次单位根是满足 z^n = 1 的复数：

```
omega_n = e^(2*pi*i/n)
```

```python
def nth_roots_of_unity(n):
    """n 次单位复数根"""
    k = np.arange(n)
    return np.exp(2j * np.pi * k / n)

roots = nth_roots_of_unity(8)
print("8 次单位根:")
for i, root in enumerate(roots):
    print(f"  omega^{i} = {root:.4f}")
```

单位根的关键性质：

- 均匀分布在单位圆上
- omega_n^k = omega_n^(k mod n)
- sum(omega_n^k, k=0..n-1) = 0

### 从单位根推导 DFT

DFT 将信号从时域变换到频域。它就是信号与单位根的乘积。

```python
def dft(x):
    """离散傅里叶变换"""
    n = len(x)
    k = np.arange(n)
    omega = np.exp(-2j * np.pi * k / n)  # 注意负号
    # X[k] = sum(x[n] * omega^(n*k))
    return np.array([np.sum(x * omega ** (n * k_i)) for k_i in range(n)])

# 示例信号
t = np.linspace(0, 1, 8)
signal = np.sin(2 * np.pi * 2 * t)  # 2 Hz 正弦波

X = dft(signal)
print(f"DFT 幅度谱: {np.abs(X)}")
```

### RoPE：旋转位置编码

RoPE 使用复数旋转编码 Transformer 中的位置信息。

核心思想：将位置 m 的 embedding 乘以 e^(i*m*theta)，即旋转 m\*theta 角度。

```python
def rope_encoding(x, positions, theta_base=10000):
    """
    RoPE 位置编码
    x: (seq_len, dim) embedding
    positions: (seq_len,) 位置索引
    """
    seq_len, dim = x.shape
    half_dim = dim // 2

    # 频率 theta_i = theta_base^(-2i/d)
    freqs = 1.0 / (theta_base ** (2 * np.arange(half_dim) / dim))

    # 角度 = position * frequency
    angles = positions[:, None] * freqs[None, :]

    # 复数旋转
    cos_angles = np.cos(angles)
    sin_angles = np.sin(angles)

    # 将 x 分成两半，应用旋转
    x1, x2 = x[:, :half_dim], x[:, half_dim:]
    x_rotated = np.concatenate([
        x1 * cos_angles - x2 * sin_angles,
        x1 * sin_angles + x2 * cos_angles
    ], axis=-1)

    return x_rotated

# 示例
x = np.random.randn(4, 8)  # 4 个 token，8 维
positions = np.arange(4)
x_rope = rope_encoding(x, positions)
print(f"原始: {x.shape}")
print(f"RoPE 编码后: {x_rope.shape}")
```

RoPE 的关键性质：两个位置的内积只取决于它们的相对距离，不是绝对位置。这使得模型可以外推到更长的序列。

## 实际应用

| 概念     | AI 中的位置          |
| -------- | -------------------- |
| 复数乘法 | RoPE 位置编码        |
| 欧拉公式 | 傅里叶变换，信号处理 |
| 单位根   | DFT/FFT              |
| 极坐标   | 相位分析，信号调制   |

## 练习

1. 计算 (1+i)^8，验证它等于 16i
2. 用极坐标形式计算两个复数的乘积，验证模相乘、幅角相加
3. 对简单信号（如方波）运行 DFT，观察频谱
4. 实现 RoPE 编码，验证相对位置内积性质
