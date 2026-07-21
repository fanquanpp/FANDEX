---
title: 机器学习微积分
description: '导数、偏导数、梯度、链式法则、Hessian 矩阵、Taylor 级数、积分在机器学习中的应用'
module: 'ai-engineering'
difficulty: intermediate
tags:
  - 微积分
  - 导数
  - 梯度
  - 链式法则
  - Hessian
  - Taylor级数
  - 积分
related:
  - 'ai-engineering/合规框架'
  - 'ai-engineering/机器学习统计'
  - 'ai-engineering/激活函数'
  - 'ai-engineering/集成方法'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 机器学习微积分

> 梯度下降是微积分最成功的应用。理解导数，你就理解了学习。

**类型：** 构建
**语言：** Python
**前置条件：** 阶段 1，第 01-02 课
**预计时间：** ~90 分钟

## 学习目标

- 计算导数和偏导数，解释它们作为瞬时变化率的含义
- 计算梯度向量并解释其方向指向最快上升方向
- 应用链式法则计算复合函数的导数
- 使用 Hessian 矩阵判断临界点是极小值、极大值还是鞍点

## 问题所在

机器学习就是优化：找到使损失函数最小的参数。优化需要知道函数在每个方向上变化的快慢。这就是导数。

如果你不理解导数，你就无法理解：

- 为什么学习率太大训练会发散
- 为什么梯度指向最速上升方向
- 为什么 Adam 优化器比 SGD 快
- 为什么某些损失函数有多个局部极小值

## 核心概念

### 导数：瞬时变化率

导数衡量函数在某一点的瞬时变化率。

```python
def numerical_derivative(f, x, h=1e-5):
    """数值导数（中心差分）"""
    return (f(x + h) - f(x - h)) / (2 * h)

def f(x):
    return x ** 2

print(f"f'(3) = {numerical_derivative(f, 3):.4f}")  # 接近 6.0
```

对于 `f(x) = x^2`，解析导数是 `f'(x) = 2x`。在 x=3 处，导数是 6。

### 偏导数：多变量函数的导数

当函数有多个变量时，偏导数是固定其他变量、对一个变量求导。

```python
def f(x, y):
    return x ** 2 + 3 * y ** 2

# 对 x 的偏导数
df_dx = numerical_derivative(lambda x: f(x, 2.0), 1.0)
# 对 y 的偏导数
df_dy = numerical_derivative(lambda y: f(1.0, y), 2.0)

print(f"df/dx = {df_dx:.4f}")  # 接近 2.0
print(f"df/dy = {df_dy:.4f}")  # 接近 12.0
```

### 梯度：最速上升方向

梯度是所有偏导数组成的向量。它指向函数增长最快的方向。

```python
def gradient(f, point, h=1e-5):
    """计算函数在某点的梯度"""
    grad = []
    for i in range(len(point)):
        def fi(x):
            p = list(point)
            p[i] = x
            return f(*p)
        grad.append(numerical_derivative(fi, point[i], h))
    return np.array(grad)

def loss(w1, w2):
    return w1 ** 2 + 3 * w2 ** 2

point = np.array([1.0, 2.0])
grad = gradient(loss, point)
print(f"梯度: {grad}")  # [2.0, 12.0]
```

梯度下降：沿梯度反方向移动，函数值减小最快。

```python
def gradient_descent(f, start, lr=0.1, steps=50):
    """简单的梯度下降"""
    point = np.array(start, dtype=float)
    path = [point.copy()]

    for _ in range(steps):
        grad = gradient(f, point)
        point = point - lr * grad
        path.append(point.copy())

    return np.array(path)

path = gradient_descent(loss, [5.0, 5.0])
print(f"起点: {path[0]}")
print(f"终点: {path[-1]}")
print(f"终点损失: {loss(*path[-1]):.6f}")
```

### 链式法则

链式法则用于计算复合函数的导数。这是反向传播的数学基础。

如果 `z = f(g(x))`，则：

```
dz/dx = dz/dg * dg/dx
```

```python
def chain_rule_example(x):
    """z = sin(x^2)，求 dz/dx"""
    # 前向传播
    u = x ** 2       # 内层函数
    z = np.sin(u)    # 外层函数

    # 反向传播（链式法则）
    dz_du = np.cos(u)    # 外层导数
    du_dx = 2 * x        # 内层导数
    dz_dx = dz_du * du_dx  # 链式法则

    return z, dz_dx

x = 1.5
z, grad = chain_rule_example(x)
numerical = numerical_derivative(lambda x: np.sin(x ** 2), x)
print(f"解析: {grad:.6f}, 数值: {numerical:.6f}")
```

### Hessian 矩阵

Hessian 是二阶偏导数矩阵。它告诉你曲率信息。

```python
def hessian(f, point, h=1e-5):
    """计算 Hessian 矩阵"""
    n = len(point)
    H = np.zeros((n, n))
    f0 = f(*point)

    for i in range(n):
        for j in range(n):
            def fij(*args):
                return f(*args)

            pp = list(point)
            pp[i] += h
            pp[j] += h
            fpp = f(*pp)

            pm = list(point)
            pm[i] += h
            pm[j] -= h
            fpm = f(*pm)

            mp = list(point)
            mp[i] -= h
            mp[j] += h
            fmp = f(*mp)

            mm = list(point)
            mm[i] -= h
            mm[j] -= h
            fmm = f(*mm)

            H[i][j] = (fpp - fpm - fmp + fmm) / (4 * h ** 2)

    return H

H = hessian(loss, [1.0, 2.0])
print(f"Hessian:\n{H}")
eigenvalues = np.linalg.eigvals(H)
print(f"特征值: {eigenvalues}")
```

Hessian 特征值的含义：

| 特征值   | 含义                 |
| -------- | -------------------- |
| 全正     | 局部极小值（碗形）   |
| 全负     | 局部极大值（倒碗形） |
| 有正有负 | 鞍点                 |

### Taylor 级数

Taylor 级数用多项式近似函数：

```
f(x) ≈ f(a) + f'(a)(x-a) + f''(a)(x-a)^2/2 + ...
```

一阶近似（线性近似）是梯度下降的基础。二阶近似是牛顿法的基础。

## 实际应用

| 概念        | AI 中的位置            |
| ----------- | ---------------------- |
| 导数        | 梯度计算，反向传播     |
| 梯度        | 梯度下降，优化         |
| 链式法则    | 反向传播，自动微分     |
| Hessian     | 牛顿法，二阶优化       |
| Taylor 级数 | 优化算法设计，近似推理 |
| 积分        | 概率归一化，贝叶斯推断 |

## 练习

1. 对 `f(x) = x^3 - 2x` 计算数值导数，与解析导数 `3x^2 - 2` 对比
2. 对 `f(x, y) = x^2*y + y^3` 计算梯度，验证偏导数
3. 实现链式法则计算 `f(x) = exp(sin(x^2))` 的导数
4. 计算 `f(x, y) = x^4 + y^4 - 2x^2` 的 Hessian，判断原点是极小值、极大值还是鞍点
