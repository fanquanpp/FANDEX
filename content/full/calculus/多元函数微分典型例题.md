---
order: 96
title: 多元函数微分典型例题
module: calculus
category: 'comp-sci'
difficulty: intermediate
description: 多元函数微分15道典型例题：偏导数、全微分、链式法则、方向导数、极值与条件极值等核心题型。
author: fanquanpp
updated: '2026-06-14'
related:
  - calculus/不定积分典型例题
  - calculus/定积分与应用典型例题
  - calculus/重积分典型例题
  - calculus/曲线积分与曲面积分典型例题
prerequisites:
  - calculus/函数与极限
---

## 1. 偏导数计算

**例1**：设 $z = e^{xy}\sin(x+y)$，求 $\frac{\partial z}{\partial x}$ 和 $\frac{\partial z}{\partial y}$。

**解**：

$$\frac{\partial z}{\partial x} = ye^{xy}\sin(x+y) + e^{xy}\cos(x+y) = e^{xy}[y\sin(x+y) + \cos(x+y)]$$

$$\frac{\partial z}{\partial y} = xe^{xy}\sin(x+y) + e^{xy}\cos(x+y) = e^{xy}[x\sin(x+y) + \cos(x+y)]$$

---

**例2**：设 $z = f(x^2 - y^2, e^{xy})$，其中 $f$ 具有二阶连续偏导数，求 $\frac{\partial^2 z}{\partial x^2}$。

**解**：设 $u = x^2 - y^2$，$v = e^{xy}$

$$\frac{\partial z}{\partial x} = 2x f_u + ye^{xy} f_v$$

$$\frac{\partial^2 z}{\partial x^2} = 2f_u + 2x(2xf_{uu} + ye^{xy}f_{uv}) + ye^{xy} \cdot y \cdot f_v + ye^{xy}(2xf_{vu} + ye^{xy}f_{vv})$$

$$= 2f_u + y^2 e^{xy} f_v + 4x^2 f_{uu} + 4xye^{xy}f_{uv} + y^2 e^{2xy}f_{vv}$$

## 2. 全微分

**例3**：求 $z = \arctan\frac{y}{x}$ 的全微分。

**解**：

$$\frac{\partial z}{\partial x} = \frac{1}{1+\frac{y^2}{x^2}} \cdot \left(-\frac{y}{x^2}\right) = \frac{-y}{x^2+y^2}$$

$$\frac{\partial z}{\partial y} = \frac{1}{1+\frac{y^2}{x^2}} \cdot \frac{1}{x} = \frac{x}{x^2+y^2}$$

$$dz = \frac{-y\,dx + x\,dy}{x^2+y^2}$$

---

**例4**：设 $z = f\left(\frac{y}{x}\right)$，验证 $x\frac{\partial z}{\partial x} + y\frac{\partial z}{\partial y} = 0$。

**解**：设 $u = \frac{y}{x}$

$$\frac{\partial z}{\partial x} = f'(u) \cdot \left(-\frac{y}{x^2}\right) = -\frac{y}{x^2}f'$$

$$\frac{\partial z}{\partial y} = f'(u) \cdot \frac{1}{x} = \frac{1}{x}f'$$

$$x\frac{\partial z}{\partial x} + y\frac{\partial z}{\partial y} = -\frac{y}{x}f' + \frac{y}{x}f' = 0$$

## 3. 隐函数求导

**例5**：设 $F(x,y,z) = x^2 + y^2 + z^2 - 4z = 0$，求 $\frac{\partial z}{\partial x}$ 和 $\frac{\partial^2 z}{\partial x^2}$。

**解**：

$$\frac{\partial z}{\partial x} = -\frac{F_x}{F_z} = -\frac{2x}{2z-4} = \frac{x}{2-z}$$

$$\frac{\partial^2 z}{\partial x^2} = \frac{(2-z) - x \cdot (-\frac{\partial z}{\partial x})}{(2-z)^2} = \frac{(2-z) + \frac{x^2}{2-z}}{(2-z)^2} = \frac{(2-z)^2 + x^2}{(2-z)^3}$$

---

**例6**：设 $z = z(x,y)$ 由方程 $z^3 - 3xyz = 1$ 确定，求 $dz$。

**解**：令 $F = z^3 - 3xyz - 1 = 0$

$$\frac{\partial z}{\partial x} = -\frac{F_x}{F_z} = -\frac{-3yz}{3z^2-3xy} = \frac{yz}{z^2-xy}$$

$$\frac{\partial z}{\partial y} = -\frac{F_y}{F_z} = -\frac{-3xz}{3z^2-3xy} = \frac{xz}{z^2-xy}$$

$$dz = \frac{z}{z^2-xy}(y\,dx + x\,dy)$$

## 4. 方向导数与梯度

**例7**：求 $f(x,y) = x^2 + y^2$ 在点 $(1,1)$ 沿方向 $\mathbf{l} = (3,4)$ 的方向导数。

**解**：$\nabla f = (2x, 2y)$，在 $(1,1)$ 处 $\nabla f = (2, 2)$

$\mathbf{l}$ 的单位向量：$\mathbf{l}^0 = \left(\frac{3}{5}, \frac{4}{5}\right)$

$$\frac{\partial f}{\partial l} = \nabla f \cdot \mathbf{l}^0 = 2 \cdot \frac{3}{5} + 2 \cdot \frac{4}{5} = \frac{14}{5}$$

---

**例8**：求 $f(x,y,z) = xyz$ 在点 $(1,2,3)$ 处的梯度及梯度的模。

**解**：

$$\nabla f = (yz, xz, xy) = (6, 3, 2)$$

$$|\nabla f| = \sqrt{36+9+4} = 7$$

## 5. 无条件极值

**例9**：求 $f(x,y) = x^3 + y^3 - 3xy$ 的极值。

**解**：

$$f_x = 3x^2 - 3y = 0, \quad f_y = 3y^2 - 3x = 0$$

由 $x^2 = y$ 和 $y^2 = x$ 得驻点 $(0,0)$ 和 $(1,1)$。

$A = f_{xx} = 6x$，$B = f_{xy} = -3$，$C = f_{yy} = 6y$

在 $(0,0)$：$A = 0$，$B = -3$，$C = 0$，$\Delta = AC - B^2 = -9 < 0$，鞍点。

在 $(1,1)$：$A = 6$，$B = -3$，$C = 6$，$\Delta = 36 - 9 = 27 > 0$，$A > 0$，极小值 $f(1,1) = -1$。

## 6. 条件极值（拉格朗日乘数法）

**例10**：求 $f(x,y) = xy$ 在条件 $x + y = 1$ 下的极值。

**解**：令 $L = xy + \lambda(1-x-y)$

$$L_x = y - \lambda = 0, \quad L_y = x - \lambda = 0, \quad L_\lambda = 1-x-y = 0$$

由前两式 $x = y$，代入第三式 $x = y = \frac{1}{2}$

极大值 $f\left(\frac{1}{2}, \frac{1}{2}\right) = \frac{1}{4}$

---

**例11**：求内接于椭球面 $\frac{x^2}{a^2} + \frac{y^2}{b^2} + \frac{z^2}{c^2} = 1$ 的长方体的最大体积。

**解**：设长方体在第一卦限的顶点为 $(x,y,z)$，体积 $V = 8xyz$。

令 $L = 8xyz + \lambda\left(1 - \frac{x^2}{a^2} - \frac{y^2}{b^2} - \frac{z^2}{c^2}\right)$

$$L_x = 8yz - \frac{2\lambda x}{a^2} = 0 \Rightarrow \lambda = \frac{4a^2 yz}{x}$$

同理 $\lambda = \frac{4b^2 xz}{y} = \frac{4c^2 xy}{z}$

得 $\frac{x^2}{a^2} = \frac{y^2}{b^2} = \frac{z^2}{c^2}$，代入约束条件得 $x = \frac{a}{\sqrt{3}}$，$y = \frac{b}{\sqrt{3}}$，$z = \frac{c}{\sqrt{3}}$

$$V_{\max} = 8 \cdot \frac{a}{\sqrt{3}} \cdot \frac{b}{\sqrt{3}} \cdot \frac{c}{\sqrt{3}} = \frac{8abc}{3\sqrt{3}}$$

## 7. 综合题型

**例12**：证明：$f(x,y) = \sqrt{x^2+y^2}$ 在 $(0,0)$ 处连续但偏导数不存在。

**证明**：连续性：$\lim_{(x,y)\to(0,0)} \sqrt{x^2+y^2} = 0 = f(0,0)$

偏导数：$f_x(0,0) = \lim_{x \to 0} \frac{f(x,0)-f(0,0)}{x} = \lim_{x \to 0} \frac{|x|}{x}$

右极限 $= 1$，左极限 $= -1$，极限不存在。同理 $f_y(0,0)$ 也不存在。

---

**例13**：设 $u = f(x,y,z)$ 有二阶连续偏导数，令 $x = r\sin\varphi\cos\theta$，$y = r\sin\varphi\sin\theta$，$z = r\cos\varphi$，证明：

$$\frac{\partial^2 u}{\partial x^2} + \frac{\partial^2 u}{\partial y^2} + \frac{\partial^2 u}{\partial z^2} = \frac{\partial^2 u}{\partial r^2} + \frac{2}{r}\frac{\partial u}{\partial r} + \frac{1}{r^2}\frac{\partial^2 u}{\partial \varphi^2} + \frac{\cos\varphi}{r^2\sin\varphi}\frac{\partial u}{\partial \varphi} + \frac{1}{r^2\sin^2\varphi}\frac{\partial^2 u}{\partial \theta^2}$$

（此即拉普拉斯算子在球坐标下的表达式，证明略，通过链式法则逐项计算即可。）

---

**例14**：求函数 $f(x,y) = 2x^2 + y^2 - 2xy$ 在闭区域 $D: x^2 + y^2 \leq 4$ 上的最大值和最小值。

**解**：

**内部**：$f_x = 4x - 2y = 0$，$f_y = 2y - 2x = 0$，得驻点 $(0,0)$，$f(0,0) = 0$

**边界**：$x = 2\cos t$，$y = 2\sin t$

$$f = 8\cos^2 t + 4\sin^2 t - 8\sin t\cos t = 4 + 4\cos 2t - 4\sin 2t$$

$$= 4 + 4\sqrt{2}\cos(2t + \frac{\pi}{4})$$

最大值 $= 4 + 4\sqrt{2}$，最小值 $= 4 - 4\sqrt{2}$

全局最小值 $= \min(0, 4-4\sqrt{2}) = 4 - 4\sqrt{2}$

全局最大值 $= 4 + 4\sqrt{2}$

---

**例15**：设 $f(x,y)$ 在点 $(x_0, y_0)$ 处可微，证明：$f$ 在该点沿任意方向的方向导数都存在。

**证明**：由可微定义：

$$f(x_0+h, y_0+k) - f(x_0, y_0) = f_x(x_0,y_0)h + f_y(x_0,y_0)k + o(\sqrt{h^2+k^2})$$

沿方向 $\mathbf{l} = (\cos\alpha, \cos\beta)$，取 $h = t\cos\alpha$，$k = t\cos\beta$：

$$\frac{f(x_0+t\cos\alpha, y_0+t\cos\beta) - f(x_0,y_0)}{t} = f_x\cos\alpha + f_y\cos\beta + \frac{o(|t|)}{t}$$

$$\lim_{t \to 0} = f_x\cos\alpha + f_y\cos\beta$$

方向导数存在且等于 $\nabla f \cdot \mathbf{l}^0$。
