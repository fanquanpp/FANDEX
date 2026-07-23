---
order: 90
title: 无穷级数与常微分方程
module: calculus
category: 高等数学
difficulty: advanced
description: 常数项级数收敛判别法、幂级数收敛半径与展开、傅里叶级数；常微分方程：一阶/可降阶/二阶常系数线性/欧拉方程。
author: fanquanpp
updated: '2026-06-14'
related:
  - calculus/曲线积分与曲面积分
  - calculus/公式速查表
  - calculus/函数与极限典型例题
  - calculus/导数与微分典型例题
prerequisites:
  - calculus/函数与极限
---

## 1. 常数项级数

### 1.1 基本概念

给定数列 $\{u_n\}$，称 $\sum_{n=1}^{\infty} u_n = u_1 + u_2 + \cdots$ 为**常数项级数**。部分和 $S_n = \sum_{k=1}^{n} u_k$，若 $\lim_{n \to \infty} S_n = S$ 存在，则称级数**收敛**，和为 $S$；否则**发散**。

**收敛的必要条件**：若 $\sum u_n$ 收敛，则 $\lim_{n \to \infty} u_n = 0$。注意反之不成立（如调和级数）。

**基本性质**：

- 级数去掉或添加有限项不改变收敛性
- 若 $\sum u_n = S$，则 $\sum ku_n = kS$
- 若 $\sum u_n$、$\sum v_n$ 均收敛，则 $\sum(u_n \pm v_n)$ 收敛且和为对应和之加减

### 1.2 正项级数判别法

当 $u_n \geq 0$ 时，$\sum u_n$ 为正项级数，其部分和序列单调递增，故收敛 $\Leftrightarrow$ 部分和有上界。

**比较判别法**：设 $0 \leq u_n \leq v_n$，若 $\sum v_n$ 收敛则 $\sum u_n$ 收敛；若 $\sum u_n$ 发散则 $\sum v_n$ 发散。

**比较判别法的极限形式**：设 $u_n > 0$，$v_n > 0$，若 $\lim_{n \to \infty} \frac{u_n}{v_n} = l$：

- $0 < l < +\infty$：两级数同敛散
- $l = 0$：$\sum v_n$ 收敛 $\Rightarrow$ $\sum u_n$ 收敛
- $l = +\infty$：$\sum v_n$ 发散 $\Rightarrow$ $\sum u_n$ 发散

**比值判别法（D'Alembert）**：设 $u_n > 0$，若 $\lim_{n \to \infty} \frac{u_{n+1}}{u_n} = \rho$：

- $\rho < 1$：收敛
- $\rho > 1$：发散
- $\rho = 1$：不确定

**根值判别法（Cauchy）**：设 $u_n \geq 0$，若 $\lim_{n \to \infty} \sqrt[n]{u_n} = \rho$：

- $\rho < 1$：收敛
- $\rho > 1$：发散
- $\rho = 1$：不确定

**积分判别法**：设 $f(x)$ 在 $[1, +\infty)$ 上非负单调递减，则 $\sum_{n=1}^{\infty} f(n)$ 与 $\int_1^{+\infty} f(x)\,dx$ 同敛散。

> **判别法选择策略**：含阶乘用比值法，含 $n$ 次幂用根值法，能与 $p$-级数比较时用比较法，通项可积时用积分法。

### 1.3 交错级数与莱布尼茨判别法

**莱布尼茨判别法**：若交错级数 $\sum_{n=1}^{\infty} (-1)^{n-1} u_n$（$u_n > 0$）满足：

1. $u_{n+1} \leq u_n$（单调递减）
2. $\lim_{n \to \infty} u_n = 0$

则级数收敛，且余项 $|r_n| \leq u_{n+1}$。

### 1.4 绝对收敛与条件收敛

- **绝对收敛**：$\sum |u_n|$ 收敛 $\Rightarrow$ $\sum u_n$ 收敛
- **条件收敛**：$\sum u_n$ 收敛但 $\sum |u_n|$ 发散

绝对收敛级数具有可交换性（任意重排后和不变），条件收敛级数不具有此性质（Riemann 重排定理）。

## 2. 幂级数

### 2.1 收敛半径与收敛域

形如 $\sum_{n=0}^{\infty} a_n x^n$ 的级数称为幂级数。若

$$R = \lim_{n \to \infty} \left|\frac{a_n}{a_{n+1}}\right| \quad \text{或} \quad R = \lim_{n \to \infty} \frac{1}{\sqrt[n]{|a_n|}}$$

存在，则 $R$ 为**收敛半径**。级数在 $|x| < R$ 时绝对收敛，$|x| > R$ 时发散，$x = \pm R$ 处需单独判断。

**收敛域**：开区间 $(-R, R)$ 加上端点收敛情况的并集。

> 对于 $\sum a_n (x - x_0)^n$，收敛区间为 $(x_0 - R, x_0 + R)$。

### 2.2 幂级数的性质

**逐项求导**：在收敛区间内，

$$\left(\sum_{n=0}^{\infty} a_n x^n\right)' = \sum_{n=1}^{\infty} n a_n x^{n-1}$$

**逐项积分**：在收敛区间内，

$$\int_0^x \left(\sum_{n=0}^{\infty} a_n t^n\right) dt = \sum_{n=0}^{\infty} \frac{a_n}{n+1} x^{n+1}$$

逐项求导和积分后收敛半径不变，但端点收敛性可能改变。

### 2.3 函数的幂级数展开

**Taylor 级数**：若 $f(x)$ 在 $x_0$ 处无穷可微，则

$$f(x) = \sum_{n=0}^{\infty} \frac{f^{(n)}(x_0)}{n!}(x - x_0)^n$$

**常用展开式**（$x_0 = 0$，即 Maclaurin 级数）：

$$e^x = \sum_{n=0}^{\infty} \frac{x^n}{n!}, \quad x \in (-\infty, +\infty)$$

$$\sin x = \sum_{n=0}^{\infty} \frac{(-1)^n}{(2n+1)!} x^{2n+1}, \quad x \in (-\infty, +\infty)$$

$$\cos x = \sum_{n=0}^{\infty} \frac{(-1)^n}{(2n)!} x^{2n}, \quad x \in (-\infty, +\infty)$$

$$\ln(1+x) = \sum_{n=1}^{\infty} \frac{(-1)^{n-1}}{n} x^n, \quad x \in (-1, 1]$$

$$(1+x)^{\alpha} = \sum_{n=0}^{\infty} \binom{\alpha}{n} x^n, \quad x \in (-1, 1)$$

$$\frac{1}{1-x} = \sum_{n=0}^{\infty} x^n, \quad x \in (-1, 1)$$

**间接展开法**：利用已知展开式通过变量代换、逐项求导、逐项积分等得到新展开式，避免直接计算高阶导数。

### 2.4 幂级数求和

利用已知的和函数（如 $\sum x^n = \frac{1}{1-x}$），通过逐项求导或积分求未知级数的和。

**典型方法**：设 $S(x) = \sum a_n x^n$，对 $S(x)$ 求导或积分化为已知和函数，再逆运算得到 $S(x)$。

## 3. 傅里叶级数

### 3.1 Dirichlet 收敛定理

设 $f(x)$ 以 $2\pi$ 为周期，若满足 **Dirichlet 条件**：

1. 在一个周期内连续或只有有限个第一类间断点
2. 在一个周期内只有有限个极值点

则 $f(x)$ 的傅里叶级数收敛，且在连续点 $x$ 处收敛于 $f(x)$，在间断点 $x$ 处收敛于 $\frac{f(x^-) + f(x^+)}{2}$。

### 3.2 傅里叶系数

以 $2\pi$ 为周期的函数 $f(x)$ 的傅里叶系数：

$$a_0 = \frac{1}{\pi}\int_{-\pi}^{\pi} f(x)\,dx$$

$$a_n = \frac{1}{\pi}\int_{-\pi}^{\pi} f(x)\cos nx\,dx, \quad n = 1, 2, \ldots$$

$$b_n = \frac{1}{\pi}\int_{-\pi}^{\pi} f(x)\sin nx\,dx, \quad n = 1, 2, \ldots$$

傅里叶级数为：

$$f(x) \sim \frac{a_0}{2} + \sum_{n=1}^{\infty}(a_n \cos nx + b_n \sin nx)$$

### 3.3 周期延拓与奇偶延拓

**周期延拓**：对定义在 $[0, \pi]$ 或 $[-\pi, \pi]$ 上的非周期函数，将其延拓为 $2\pi$ 周期函数后展开。

**偶延拓（余弦级数）**：将 $f(x)$ 延拓为偶函数，则 $b_n = 0$，

$$f(x) \sim \frac{a_0}{2} + \sum_{n=1}^{\infty} a_n \cos nx$$

**奇延拓（正弦级数）**：将 $f(x)$ 延拓为奇函数，则 $a_n = 0$，

$$f(x) \sim \sum_{n=1}^{\infty} b_n \sin nx$$

### 3.4 任意周期的傅里叶级数

设 $f(x)$ 以 $2l$ 为周期，令 $x = \frac{l}{\pi}t$ 化为 $2\pi$ 周期：

$$a_n = \frac{1}{l}\int_{-l}^{l} f(x)\cos\frac{n\pi x}{l}\,dx$$

$$b_n = \frac{1}{l}\int_{-l}^{l} f(x)\sin\frac{n\pi x}{l}\,dx$$

$$f(x) \sim \frac{a_0}{2} + \sum_{n=1}^{\infty}\left(a_n \cos\frac{n\pi x}{l} + b_n \sin\frac{n\pi x}{l}\right)$$

## 4. 常微分方程：一阶方程

### 4.1 可分离变量方程

形如 $\frac{dy}{dx} = f(x)g(y)$ 的方程，分离变量后积分：

$$\int \frac{dy}{g(y)} = \int f(x)\,dx + C$$

**例**：$\frac{dy}{dx} = \frac{x}{y}$，分离得 $y\,dy = x\,dx$，积分得 $\frac{y^2}{2} = \frac{x^2}{2} + C$，即 $y^2 - x^2 = C$。

### 4.2 齐次方程

形如 $\frac{dy}{dx} = \varphi\left(\frac{y}{x}\right)$ 的方程，令 $u = \frac{y}{x}$，则 $y = ux$，$\frac{dy}{dx} = u + x\frac{du}{dx}$，代入得：

$$u + x\frac{du}{dx} = \varphi(u) \implies \frac{du}{\varphi(u) - u} = \frac{dx}{x}$$

化为可分离变量方程求解。

### 4.3 一阶线性方程

形如 $\frac{dy}{dx} + P(x)y = Q(x)$ 的方程。

**常数变易法**：先解齐次方程 $\frac{dy}{dx} + P(x)y = 0$，得 $y = Ce^{-\int P(x)\,dx}$，再将 $C$ 换为 $u(x)$ 代入原方程确定 $u(x)$。

**通解公式**：

$$y = e^{-\int P(x)\,dx}\left[\int Q(x)e^{\int P(x)\,dx}\,dx + C\right]$$

### 4.4 Bernoulli 方程

形如 $\frac{dy}{dx} + P(x)y = Q(x)y^n$（$n \neq 0, 1$）的方程。

令 $z = y^{1-n}$，则 $\frac{dz}{dx} = (1-n)y^{-n}\frac{dy}{dx}$，代入化为一阶线性方程：

$$\frac{dz}{dx} + (1-n)P(x)z = (1-n)Q(x)$$

## 5. 可降阶的二阶方程

### 5.1 $y'' = f(x)$ 型

直接积分两次：$y' = \int f(x)\,dx + C_1$，$y = \int y'\,dx + C_2$。

### 5.2 $y'' = f(x, y')$ 型（不显含 $y$）

令 $p = y'$，则 $y'' = p'$，方程降为一阶方程 $p' = f(x, p)$，解出 $p$ 后再积分得 $y$。

### 5.3 $y'' = f(y, y')$ 型（不显含 $x$）

令 $p = y'$，则 $y'' = \frac{dp}{dx} = \frac{dp}{dy}\cdot\frac{dy}{dx} = p\frac{dp}{dy}$，方程降为 $p\frac{dp}{dy} = f(y, p)$，解出 $p = p(y)$ 后再分离变量求 $y$。

## 6. 二阶常系数线性微分方程

### 6.1 齐次方程 $y'' + py' + qy = 0$

特征方程 $r^2 + pr + q = 0$，设根为 $r_1, r_2$：

| 根的情况                                   | 通解                                                  |
| ------------------------------------------ | ----------------------------------------------------- |
| $r_1 \neq r_2$（实根）                     | $y = C_1 e^{r_1 x} + C_2 e^{r_2 x}$                   |
| $r_1 = r_2$（重根）                        | $y = (C_1 + C_2 x)e^{r_1 x}$                          |
| $r_{1,2} = \alpha \pm \beta i$（共轭复根） | $y = e^{\alpha x}(C_1 \cos\beta x + C_2 \sin\beta x)$ |

### 6.2 非齐次方程 $y'' + py' + qy = f(x)$

通解 = 齐次通解 + 非齐次特解。特解用**待定系数法**：

**$f(x) = P_m(x)e^{\lambda x}$ 型**：

设特解 $y^* = x^k Q_m(x)e^{\lambda x}$，其中 $k$ 为 $\lambda$ 是特征方程根的重数（0/1/2），$Q_m(x)$ 为 $m$ 次多项式。

**$f(x) = e^{\lambda x}[P_l(x)\cos\omega x + P_n(x)\sin\omega x]$ 型**：

设特解 $y^* = x^k e^{\lambda x}[R_m^{(1)}(x)\cos\omega x + R_m^{(2)}(x)\sin\omega x]$，其中 $m = \max(l, n)$，$k$ 为 $\lambda + i\omega$ 是特征方程根的重数（0 或 1）。

## 7. 欧拉方程

形如 $x^n y^{(n)} + a_1 x^{n-1} y^{(n-1)} + \cdots + a_{n-1}xy' + a_n y = f(x)$ 的方程称为**欧拉方程**。

**变量代换**：令 $x = e^t$（即 $t = \ln x$），则：

$$x\frac{dy}{dx} = \frac{dy}{dt}, \quad x^2\frac{d^2y}{dx^2} = \frac{d^2y}{dt^2} - \frac{dy}{dt}$$

更一般地，引入算子 $D = \frac{d}{dt}$，有 $x^k \frac{d^k y}{dx^k} = D(D-1)(D-2)\cdots(D-k+1)y$。

代入后化为常系数线性方程求解，再代回 $x = e^t$。

**二阶欧拉方程** $x^2 y'' + axy' + by = f(x)$：

令 $x = e^t$，化为 $\frac{d^2y}{dt^2} + (a-1)\frac{dy}{dt} + by = f(e^t)$，用常系数方法求解。

## 8. 综合例题与 Python 辅助计算

### 8.1 幂级数求和示例

求 $\sum_{n=1}^{\infty} \frac{n}{2^n}$ 的和。

设 $S(x) = \sum_{n=1}^{\infty} n x^n$，则 $S(x) = x\sum_{n=1}^{\infty} n x^{n-1} = x \cdot \frac{d}{dx}\left(\sum_{n=0}^{\infty} x^n\right) = x \cdot \frac{d}{dx}\frac{1}{1-x} = \frac{x}{(1-x)^2}$

代入 $x = \frac{1}{2}$：$S = \frac{1/2}{(1/2)^2} = 2$。

### 8.2 傅里叶级数 Python 计算

```python
import numpy as np
import matplotlib.pyplot as plt

# 方波信号的傅里叶级数逼近
def square_wave_fourier(x, N):
    """N 阶傅里叶级数逼近方波"""
    result = np.zeros_like(x)
    for k in range(1, N + 1):
        n = 2 * k - 1  # 仅奇数项
        result += (4 / (n * np.pi)) * np.sin(n * x)
    return result

x = np.linspace(-2 * np.pi, 2 * np.pi, 1000)
y_exact = np.sign(np.sin(x))  # 方波

fig, axes = plt.subplots(2, 2, figsize=(12, 8))
for ax, N in zip(axes.flat, [1, 5, 21, 101]):
    y_approx = square_wave_fourier(x, N)
    ax.plot(x, y_exact, 'k--', alpha=0.5, label='方波')
    ax.plot(x, y_approx, 'b-', label=f'N={N}阶')
    ax.set_title(f'傅里叶级数逼近 (N={N})')
    ax.legend()
    ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig('fourier_approx.png', dpi=150)
plt.show()
```

### 8.3 常微分方程数值解

```python
from scipy.integrate import solve_ivp
import numpy as np
import matplotlib.pyplot as plt

# 二阶常系数线性方程: y'' + 2y' + 5y = 0
# 令 y1 = y, y2 = y', 则 y1' = y2, y2' = -2y2 - 5y1
def ode_system(t, Y):
    y1, y2 = Y
    return [y2, -2 * y2 - 5 * y1]

# 特征方程 r^2 + 2r + 5 = 0, r = -1 ± 2i
# 解析解: y = e^{-t}(C1*cos(2t) + C2*sin(2t))

sol = solve_ivp(ode_system, [0, 10], [1, 0], dense_output=True)
t = np.linspace(0, 10, 500)
y_numerical = sol.sol(t)[0]
y_analytical = np.exp(-t) * np.cos(2 * t)  # C1=1, C2=0

plt.figure(figsize=(10, 5))
plt.plot(t, y_numerical, 'b-', label='数值解')
plt.plot(t, y_analytical, 'r--', label='解析解')
plt.xlabel('t')
plt.ylabel('y')
plt.title("y'' + 2y' + 5y = 0 的解")
plt.legend()
plt.grid(True, alpha=0.3)
plt.savefig('ode_solution.png', dpi=150)
plt.show()
```

### 8.4 欧拉方程求解示例

```python
from sympy import symbols, Function, dsolve, Eq

x = symbols('x')
y = Function('y')

# 欧拉方程: x^2*y'' + xy' - y = x^2
ode = Eq(x**2 * y(x).diff(x, 2) + x * y(x).diff(x) - y(x), x**2)
sol = dsolve(ode, y(x))
print("欧拉方程的解:", sol)
# 输出: y(x) = C1*x + C2/x + x**2/3
```

## 9. 知识脉络与要点总结

| 主题 | 核心方法 | 关键公式/定理 |
| ------------- | --------------------------- | ----------------------------- | ----------- | --- |
| 正项级数 | 比较法/比值法/根值法/积分法 | 极限形式比较、D'Alembert 判别 |
| 交错级数 | 莱布尼茨判别法 | 单调递减 + 趋于零 |
| 绝对/条件收敛 | 绝对收敛级数可重排 | Riemann 重排定理 |
| 幂级数 | 收敛半径/间接展开 | $R = \lim                     | a*n/a*{n+1} | $ |
| 傅里叶级数 | 系数公式/奇偶延拓 | Dirichlet 收敛定理 |
| 一阶 ODE | 分离变量/齐次代换/常数变易 | 线性方程通解公式 |
| 可降阶二阶 | $p=y'$ 代换 | 视缺失变量选代换 |
| 二阶常系数 | 特征方程/待定系数法 | 根的三种情况 |
| 欧拉方程 | $x = e^t$ 代换 | 化为常系数方程 |
