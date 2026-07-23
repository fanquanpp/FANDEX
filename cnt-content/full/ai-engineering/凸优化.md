---
title: 凸优化
description: '凸集与凸函数、Hessian 判断凸性、牛顿法、拉格朗日乘子、KKT 条件、对偶性、正则化与约束优化'
module: 'ai-engineering'
difficulty: advanced
tags:
  - 凸优化
  - 凸函数
  - 牛顿法
  - 拉格朗日乘子
  - KKT条件
  - 对偶
  - 正则化
related:
  - 'ai-engineering/特征选择进阶'
  - 'ai-engineering/投机解码推理服务器'
  - 'ai-engineering/图论'
  - 'ai-engineering/推理平台经济学'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 凸优化

> 凸优化是唯一一类我们可以保证找到全局最优解的优化问题。理解它，你就知道什么时候可以放心，什么时候需要小心。

**类型：** 构建
**语言：** Python
**前置条件：** 阶段 1，第 04 和 08 课
**预计时间：** ~90 分钟

## 学习目标

- 判断函数是否为凸函数（使用 Hessian 和定义）
- 实现牛顿法并理解其二次收敛性
- 使用拉格朗日乘子求解等式约束优化
- 陈述 KKT 条件并应用于不等式约束问题
- 解释正则化作为约束优化的对偶形式

## 问题所在

深度学习的损失函数几乎总是非凸的。那为什么要学凸优化？因为：

1. 很多子问题是凸的（线性回归、SVM、逻辑回归）
2. 凸优化提供了理论保证——当你有凸问题时，你知道全局最优可达
3. 非凸优化的很多启发式方法（如 SGD）源自凸优化的理论
4. 正则化可以从约束优化的角度理解

## 核心概念

### 凸集

集合中任意两点的连线仍在集合内。

```python
import numpy as np

def is_convex_set(points, test_pairs=100):
    """测试点集是否为凸集（近似）"""
    for _ in range(test_pairs):
        i, j = np.random.choice(len(points), 2, replace=False)
        alpha = np.random.uniform(0, 1)
        midpoint = alpha * points[i] + (1 - alpha) * points[j]
        # 检查中点是否在集合中（简化版本）
    return True
```

### 凸函数

函数图像上任意两点的连线在函数图像之上。

判断方法：Hessian 矩阵半正定（所有特征值 >= 0）。

```python
def is_convex_function(f, hessian_fn, point, h=1e-5):
    """通过 Hessian 判断函数在给定点是否为凸"""
    H = hessian_fn(f, point, h)
    eigenvalues = np.linalg.eigvals(H)
    return np.all(eigenvalues >= -1e-8)

# f(x) = x^2 是凸的（Hessian = 2 > 0）
# f(x) = x^3 是非凸的（Hessian = 6x，x<0 时为负）
```

### 牛顿法

使用二阶信息（Hessian）实现更快的收敛。

```python
def newton_method(f, grad_f, hessian_f, x0, tol=1e-8, max_iter=100):
    """牛顿法优化"""
    x = x0.copy()

    for i in range(max_iter):
        g = grad_f(x)
        H = hessian_f(x)

        # 牛顿步：delta = -H^{-1} g
        delta = np.linalg.solve(H, -g)
        x = x + delta

        if np.linalg.norm(delta) < tol:
            print(f"收敛于 {i+1} 步")
            break

    return x

# 示例：最小化 f(x) = x^2 + y^2
def f(x): return x[0]**2 + x[1]**2
def grad_f(x): return np.array([2*x[0], 2*x[1]])
def hessian_f(x): return np.array([[2, 0], [0, 2]])

x_opt = newton_method(f, grad_f, hessian_f, np.array([5.0, 5.0]))
print(f"最优解: {x_opt}")
```

牛顿法在凸函数上二次收敛（每步有效数字翻倍），但每步需要计算和求逆 Hessian。

### 拉格朗日乘子

求解等式约束优化：min f(x) s.t. g(x) = 0

```python
def lagrangian_example():
    """
    最小化 f(x,y) = x^2 + y^2
    约束：x + y = 1
    """
    # 拉格朗日函数：L = x^2 + y^2 + lambda(x + y - 1)
    # KKT 条件：
    # dL/dx = 2x + lambda = 0
    # dL/dy = 2y + lambda = 0
    # dL/dlambda = x + y - 1 = 0

    # 解：x = y = 1/2, lambda = -1
    x_opt = 0.5
    y_opt = 0.5
    lambda_opt = -1

    print(f"最优解: x={x_opt}, y={y_opt}")
    print(f"拉格朗日乘子: lambda={lambda_opt}")
    print(f"约束满足: x+y={x_opt+y_opt}")

lagrangian_example()
```

### KKT 条件

KKT 条件是拉格朗日乘子在不等式约束上的推广。

对于问题：min f(x) s.t. g_i(x) <= 0, h_j(x) = 0

KKT 条件：

1. **平稳性**：梯度 f + sum(lambda*i * 梯度 g*i) + sum(mu_j * 梯度 h_j) = 0
2. **原始可行性**：g_i(x) <= 0, h_j(x) = 0
3. **对偶可行性**：lambda_i >= 0
4. **互补松弛性**：lambda_i \* g_i(x) = 0

```python
def kkt_example():
    """
    最小化 f(x) = x^2
    约束：x >= 1（即 g(x) = 1 - x <= 0）
    """
    # KKT 条件：
    # 2x - lambda = 0
    # 1 - x <= 0
    # lambda >= 0
    # lambda(1 - x) = 0

    # 解：x = 1, lambda = 2
    x_opt = 1.0
    lambda_opt = 2.0

    print(f"最优解: x={x_opt}")
    print(f"拉格朗日乘子: lambda={lambda_opt}")
    print(f"约束活跃: {x_opt == 1.0}")

kkt_example()
```

### 对偶性

每个优化问题都有对偶问题。对偶问题总是凸的，提供原问题最优值的下界。

```python
def dual_example():
    """
    原问题：min x^2 s.t. x >= 1
    对偶函数：g(lambda) = inf_x {x^2 + lambda(1-x)} = lambda - lambda^2/4
    对偶问题：max g(lambda) s.t. lambda >= 0
    """
    # 对偶最优：lambda = 2, g(2) = 1
    # 原问题最优：x = 1, f(1) = 1
    # 强对偶成立：原问题最优 = 对偶最优

    lambda_opt = 2.0
    dual_opt = lambda_opt - lambda_opt**2 / 4
    primal_opt = 1.0

    print(f"原问题最优: {primal_opt}")
    print(f"对偶最优: {dual_opt}")
    print(f"强对偶: {primal_opt == dual_opt}")

dual_example()
```

### 正则化与约束优化

L2 正则化等价于约束优化：

```
min ||w||^2 + (1/lambda) * loss(w)
等价于
min loss(w) s.t. ||w||^2 <= C
```

L1 正则化等价于：

```
min ||w||_1 + (1/lambda) * loss(w)
等价于
min loss(w) s.t. ||w||_1 <= C
```

## 实际应用

| 概念         | AI 中的位置                           |
| ------------ | ------------------------------------- |
| 凸性         | 线性回归、SVM、逻辑回归的全局最优保证 |
| 牛顿法       | 二阶优化，拟牛顿法（L-BFGS）          |
| 拉格朗日乘子 | SVM 对偶问题，约束学习                |
| KKT 条件     | 优化算法收敛判据                      |
| 对偶性       | SVM 核技巧，对偶学习                  |
| 正则化       | L1/L2 正则化，权重衰减                |

## 练习

1. 验证 f(x,y) = x^2 + y^2 是凸函数，f(x,y) = x^3 + y^2 不是
2. 用牛顿法最小化 Rosenbrock 函数，观察收敛速度
3. 用拉格朗日乘子求解：最小化 x^2 + y^2，约束 2x + y = 3
4. 证明 L2 正则化和约束优化的等价性
