---
order: 98
title: 曲线积分与曲面积分典型例题
module: calculus
category: 'comp-sci'
difficulty: intermediate
description: 曲线积分与曲面积分15道典型例题：第一/二类曲线积分、格林公式、高斯公式、斯托克斯公式等核心题型。
author: fanquanpp
updated: '2026-06-14'
related:
  - calculus/多元函数微分典型例题
  - calculus/重积分典型例题
  - calculus/无穷级数与常微分方程典型例题
prerequisites:
  - calculus/函数与极限
---

## 1. 第一类曲线积分

**例1**：求 $\int_L (x^2+y^2) ds$，其中 $L$ 为圆周 $x^2+y^2 = R^2$。

**解**：参数方程 $x = R\cos t$，$y = R\sin t$，$ds = R\, dt$

$$\int_L (x^2+y^2) ds = \int_0^{2\pi} R^2 \cdot R\, dt = 2\pi R^3$$

---

**例2**：求 $\int_L \sqrt{x^2+y^2} ds$，其中 $L$ 为圆周 $x^2+y^2 = 2x$。

**解**：极坐标 $r = 2\cos\theta$，$\theta \in [-\pi/2, \pi/2]$

$ds = \sqrt{r^2+r'^2}\, d\theta = \sqrt{4\cos^2\theta + 4\sin^2\theta}\, d\theta = 2\, d\theta$

$$\int_L r \cdot ds = \int_{-\pi/2}^{\pi/2} 2\cos\theta \cdot 2\, d\theta = 4[\sin\theta]_{-\pi/2}^{\pi/2} = 8$$

## 2. 第二类曲线积分

**例3**：求 $\int_L (x+y) dx + (x-y) dy$，其中 $L$ 为从 $(1,0)$ 到 $(0,1)$ 的直线段。

**解**：参数方程 $x = 1-t$，$y = t$，$t \in [0,1]$

$dx = -dt$，$dy = dt$

$$\int_0^1 [(1-t+t)(-dt) + (1-t-t) dt] = \int_0^1 [-1+1-2t] dt = \int_0^1 (-2t)\, dt = -1$$

---

**例4**：求 $\oint_L (x^2+y^2) dx + (x^2-y^2) dy$，其中 $L$ 为以 $(0,0)$、$(1,1)$、$(0,2)$ 为顶点的三角形正向边界。

**解**：利用格林公式，$P = x^2+y^2$，$Q = x^2-y^2$

$$\frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y} = 2x - 2y$$

$$\oint_L = \iint_D (2x-2y) dxdy$$

三角形区域：$0 \leq x \leq 1$，$x \leq y \leq 2-x$

$$\int_0^1 dx \int_x^{2-x} (2x-2y)\, dy = \int_0^1 [2x(2-2x) - (2-x)^2 + x^2]\, dx = \int_0^1 (-4x+4x^2)\, dx = -\frac{2}{3}$$

## 3. 格林公式

**例5**：求 $\oint_L \frac{-y\, dx + x\, dy}{x^2+y^2}$，其中 $L$ 为不含原点的简单闭曲线正向。

**解**：$P = \frac{-y}{x^2+y^2}$，$Q = \frac{x}{x^2+y^2}$

$$\frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y} = \frac{y^2-x^2}{(x^2+y^2)^2} - \frac{y^2-x^2}{(x^2+y^2)^2} = 0$$

当 $L$ 不包围原点时，由格林公式：$\oint_L = 0$

当 $L$ 包围原点时，在 $L$ 内作小圆 $l: x^2+y^2 = \varepsilon^2$，在环形区域用格林公式：

$$\oint_L - \oint_l = 0 \Rightarrow \oint_L = \oint_l = \int_0^{2\pi} \frac{\varepsilon^2}{\varepsilon^2}\, dt = 2\pi$$

---

**例6**：计算星形线 $x = a\cos^3 t$，$y = a\sin^3 t$ 所围区域的面积。

**解**：

$$A = \frac{1}{2}\oint_L x\, dy - y\, dx = \frac{1}{2}\int_0^{2\pi} [a\cos^3 t \cdot 3a\sin^2 t\cos t - a\sin^3 t \cdot (-3a\cos^2 t\sin t)]\, dt$$

$$= \frac{3a^2}{2}\int_0^{2\pi} \sin^2 t\cos^2 t\, dt = \frac{3a^2}{2} \cdot \frac{\pi}{2} \cdot \frac{1}{2} = \frac{3\pi a^2}{8}$$

## 4. 路径无关与原函数

**例7**：验证 $\int_L (2xy-y^4+3) dx + (x^2-4xy^3) dy$ 与路径无关，并求 $A(1,0)$ 到 $B(2,1)$ 的积分值。

**解**：$P = 2xy-y^4+3$，$Q = x^2-4xy^3$

$\frac{\partial P}{\partial y} = 2x-4y^3 = \frac{\partial Q}{\partial x}$，全平面上成立，故与路径无关。

求原函数 $u$：$u_x = 2xy-y^4+3$，$u = x^2y-xy^4+3x+\varphi(y)$

$u_y = x^2-4xy^3+\varphi'(y) = x^2-4xy^3$，$\varphi'(y) = 0$，$\varphi(y) = C$

$u = x^2y - xy^4 + 3x$

$$\int_{(1,0)}^{(2,1)} = u(2,1) - u(1,0) = (4-2+6) - 3 = 5$$

## 5. 第一类曲面积分

**例8**：求 $\iint_\Sigma (x^2+y^2) dS$，其中 $\Sigma$ 为锥面 $z = \sqrt{x^2+y^2}$（$0 \leq z \leq 1$）。

**解**：$z_x = \frac{x}{\sqrt{x^2+y^2}}$，$z_y = \frac{y}{\sqrt{x^2+y^2}}$

$\sqrt{1+z_x^2+z_y^2} = \sqrt{2}$

$$\iint_\Sigma (x^2+y^2)\sqrt{2}\, dxdy = \sqrt{2}\int_0^{2\pi} d\theta \int_0^1 r^2 \cdot r\, dr = \sqrt{2} \cdot 2\pi \cdot \frac{1}{4} = \frac{\sqrt{2}\pi}{2}$$

## 6. 第二类曲面积分与高斯公式

**例9**：求 $\oiint_\Sigma x\, dydz + y\, dzdx + z\, dxdy$，其中 $\Sigma$ 为球面 $x^2+y^2+z^2 = R^2$ 外侧。

**解**：由高斯公式：

$$\oiint_\Sigma = \iiint_\Omega (1+1+1) dV = 3 \cdot \frac{4\pi R^3}{3} = 4\pi R^3$$

---

**例10**：求 $\iint_\Sigma (x^2\cos\alpha + y^2\cos\beta + z^2\cos\gamma) dS$，其中 $\Sigma$ 为锥面 $x^2+y^2=z^2$（$0 \leq z \leq h$）的下侧，$\cos\alpha, \cos\beta, \cos\gamma$ 为外法线方向余弦。

**解**：补上顶面 $\Sigma_1: z = h, x^2+y^2 \leq h^2$（上侧），用高斯公式：

$$\iint_{\Sigma+\Sigma_1} = \iiint_\Omega 2(x+y+z) dV$$

由对称性 $\iiint x\, dV = \iiint y\, dV = 0$

$$\iiint 2z\, dV = 2\int_0^h z \cdot \pi z^2\, dz = 2\pi \cdot \frac{h^4}{4} = \frac{\pi h^4}{2}$$

$$\iint_{\Sigma_1} = \iint_{x^2+y^2 \leq h^2} h^2\, dxdy = \pi h^4$$

$$\iint_\Sigma = \frac{\pi h^4}{2} - \pi h^4 = -\frac{\pi h^4}{2}$$

## 7. 斯托克斯公式

**例11**：求 $\oint_\Gamma y\, dx + z\, dy + x\, dz$，其中 $\Gamma$ 为圆周 $x^2+y^2+z^2 = a^2$，$x+y+z=0$，从 $x$ 轴正向看逆时针。

**解**：取 $\Sigma$ 为平面 $x+y+z=0$ 上被 $\Gamma$ 所围部分，法向量 $\mathbf{n} = \frac{1}{\sqrt{3}}(1,1,1)$

由斯托克斯公式：

$$\oint_\Gamma = \iint_\Sigma \begin{vmatrix} \frac{1}{\sqrt{3}} & \frac{1}{\sqrt{3}} & \frac{1}{\sqrt{3}} \\ \frac{\partial}{\partial x} & \frac{\partial}{\partial y} & \frac{\partial}{\partial z} \\ y & z & x \end{vmatrix} dS$$

$$= \iint_\Sigma \frac{1}{\sqrt{3}}(-1-1-1)\, dS = -\sqrt{3} \cdot \pi a^2 = -\sqrt{3}\pi a^2$$

## 8. 综合题型

**例12**：求 $\oint_L \frac{x\, dy - y\, dx}{4x^2+y^2}$，其中 $L$ 为以 $(1,0)$ 为圆心、$R > 1$ 为半径的圆周逆时针方向。

**解**：$P = \frac{-y}{4x^2+y^2}$，$Q = \frac{x}{4x^2+y^2}$

$\frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y} = \frac{y^2-4x^2}{(4x^2+y^2)^2} - \frac{y^2-4x^2}{(4x^2+y^2)^2} = 0$

原点在 $L$ 内，作椭圆 $l: 4x^2+y^2 = \varepsilon^2$，即 $x = \frac{\varepsilon}{2}\cos t$，$y = \varepsilon\sin t$

$$\oint_L = \oint_l = \int_0^{2\pi} \frac{\frac{\varepsilon}{2}\cos t \cdot \varepsilon\cos t + \varepsilon\sin t \cdot \frac{\varepsilon}{2}\sin t}{\varepsilon^2}\, dt = \int_0^{2\pi} \frac{1}{2}\, dt = \pi$$

---

**例13**：证明：$\oint_L \cos(\mathbf{n}, \mathbf{x})\, ds = 0$，其中 $L$ 为光滑闭曲线，$\mathbf{n}$ 为外法线。

**证明**：$\cos(\mathbf{n}, \mathbf{x}) = \frac{dy}{ds}$（外法线方向）

$$\oint_L \cos(\mathbf{n}, \mathbf{x})\, ds = \oint_L dy = 0$$

---

**例14**：求 $\iint_\Sigma \frac{dS}{z}$，其中 $\Sigma$ 为球面 $x^2+y^2+z^2 = R^2$ 被锥面 $z = \sqrt{x^2+y^2}$ 截出的顶部。

**解**：$z = \sqrt{R^2-x^2-y^2}$，$\sqrt{1+z_x^2+z_y^2} = \frac{R}{z}$

$$\iint_\Sigma \frac{R}{z^2}\, dxdy = R\int_0^{2\pi} d\theta \int_0^{R/\sqrt{2}} \frac{r}{R^2-r^2}\, dr = 2\pi R \left[-\frac{1}{2}\ln(R^2-r^2)\right]_0^{R/\sqrt{2}} = \pi R\ln 2$$

---

**例15**：设 $\Sigma$ 为简单闭曲面，$\mathbf{n}$ 为外法线单位向量，$\mathbf{r} = (x,y,z)$，证明：$\oiint_\Sigma \frac{\cos(\mathbf{r}, \mathbf{n})}{r^2}\, dS = \begin{cases} 4\pi & \text{原点在 }\Sigma\text{内} \\ 0 & \text{原点不在}\Sigma\text{内} \end{cases}$

**证明**：$\cos(\mathbf{r}, \mathbf{n}) = \frac{\mathbf{r} \cdot \mathbf{n}}{r}$

$$\oiint_\Sigma \frac{\mathbf{r} \cdot \mathbf{n}}{r^3}\, dS = \oiint_\Sigma \frac{x\, dydz + y\, dzdx + z\, dxdy}{r^3}$$

当原点不在 $\Sigma$ 内时，$\frac{\partial}{\partial x}\frac{x}{r^3} + \frac{\partial}{\partial y}\frac{y}{r^3} + \frac{\partial}{\partial z}\frac{z}{r^3} = 0$（$r \neq 0$），由高斯公式积分 $= 0$。

当原点在 $\Sigma$ 内时，作小球面 $S_\varepsilon$，在 $\Sigma$ 和 $S_\varepsilon$ 之间用高斯公式：

$$\oiint_\Sigma - \oiint_{S_\varepsilon} = 0 \Rightarrow \oiint_\Sigma = \oiint_{S_\varepsilon} = \int_0^{2\pi}\int_0^\pi \frac{\varepsilon^2\sin\varphi}{\varepsilon^2}\, d\varphi\, d\theta = 4\pi$$
