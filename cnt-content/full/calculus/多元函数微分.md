---
order: 6
title: 多元函数微分
module: calculus
category: 高等数学
difficulty: advanced
description: 空间解析几何、多元函数极限与连续、偏导数、全微分、方向导数与梯度、多元复合函数求导、隐函数定理、极值与条件极值。
author: fanquanpp
updated: '2026-06-14'
related:
  - calculus/不定积分
  - calculus/定积分与应用
  - calculus/重积分
  - calculus/曲线积分与曲面积分
prerequisites: []
---

## 1. 空间解析几何基础

### 1.1 空间直角坐标系

在空间中建立右手直角坐标系 $Oxyz$，点 $P$ 的坐标为 $(x, y, z)$。

两点间距离：$|P_1P_2| = \sqrt{(x_2-x_1)^2 + (y_2-y_1)^2 + (z_2-z_1)^2}$

### 1.2 向量运算

**数量积（点积）**：$\vec{a} \cdot \vec{b} = |a||b|\cos\theta = a_xb_x + a_yb_y + a_zb_z$

**向量积（叉积）**：$\vec{a} \times \vec{b} = \begin{vmatrix} \vec{i} & \vec{j} & \vec{k} \\ a_x & a_y & a_z \\ b_x & b_y & b_z \end{vmatrix}$

$|\vec{a} \times \vec{b}| = |a||b|\sin\theta$，方向由右手定则确定。

**混合积**：$[\vec{a}\,\vec{b}\,\vec{c}] = (\vec{a} \times \vec{b}) \cdot \vec{c} = \begin{vmatrix} a_x & a_y & a_z \\ b_x & b_y & b_z \\ c_x & c_y & c_z \end{vmatrix}$

### 1.3 平面与直线

**平面方程**：

- 一般式：$Ax + By + Cz + D = 0$，法向量 $\vec{n} = (A, B, C)$
- 点法式：$A(x-x_0) + B(y-y_0) + C(z-z_0) = 0$

**直线方程**：

- 一般式：两平面的交线
- 对称式：$\frac{x-x_0}{m} = \frac{y-y_0}{n} = \frac{z-z_0}{p}$，方向向量 $\vec{s} = (m, n, p)$
- 参数式：$x = x_0 + mt$，$y = y_0 + nt$，$z = z_0 + pt$

### 1.4 常见曲面

- 球面：$(x-a)^2 + (y-b)^2 + (z-c)^2 = R^2$
- 椭球面：$\frac{x^2}{a^2} + \frac{y^2}{b^2} + \frac{z^2}{c^2} = 1$
- 椭圆抛物面：$z = \frac{x^2}{a^2} + \frac{y^2}{b^2}$
- 双曲抛物面（马鞍面）：$z = \frac{x^2}{a^2} - \frac{y^2}{b^2}$
- 单叶双曲面：$\frac{x^2}{a^2} + \frac{y^2}{b^2} - \frac{z^2}{c^2} = 1$
- 双叶双曲面：$\frac{x^2}{a^2} + \frac{y^2}{b^2} - \frac{z^2}{c^2} = -1$

## 2. 多元函数的极限与连续

### 2.1 多元函数的概念

设 $D \subseteq \mathbb{R}^n$，映射 $f: D \to \mathbb{R}$ 称为 $n$ 元函数，记作 $z = f(x_1, x_2, \ldots, x_n)$。

### 2.2 二重极限

设 $f(x,y)$ 在 $P_0(x_0, y_0)$ 的某去心邻域有定义。若对于任意 $\varepsilon > 0$，存在 $\delta > 0$，使得当 $0 < \sqrt{(x-x_0)^2 + (y-y_0)^2} < \delta$ 时，$|f(x,y) - A| < \varepsilon$，则

$$\lim_{(x,y) \to (x_0,y_0)} f(x,y) = A$$

**注意**：二重极限存在要求 $(x,y)$ 以**任何方式**趋于 $(x_0,y_0)$ 时极限相同。

**例**：证明 $\lim_{(x,y) \to (0,0)} \frac{xy}{x^2+y^2}$ 不存在。

> 沿 $y = kx$ 趋于 $(0,0)$：$\lim_{x \to 0} \frac{kx^2}{x^2+k^2x^2} = \frac{k}{1+k^2}$，结果依赖于 $k$，故极限不存在。

### 2.3 连续

若 $\lim_{(x,y) \to (x_0,y_0)} f(x,y) = f(x_0,y_0)$，则 $f$ 在 $(x_0,y_0)$ 连续。

**性质**：多元连续函数的和、差、积、商（分母不为零）仍连续；连续函数的复合函数仍连续。

## 3. 偏导数

### 3.1 偏导数的定义

$$f_x(x_0, y_0) = \lim_{\Delta x \to 0} \frac{f(x_0+\Delta x, y_0) - f(x_0, y_0)}{\Delta x}$$

$$f_y(x_0, y_0) = \lim_{\Delta y \to 0} \frac{f(x_0, y_0+\Delta y) - f(x_0, y_0)}{\Delta y}$$

**注意**：偏导数存在不一定连续（与一元函数不同）。

### 3.2 高阶偏导数

$$f_{xx} = \frac{\partial^2 f}{\partial x^2}, \quad f_{xy} = \frac{\partial^2 f}{\partial x \partial y}, \quad f_{yx} = \frac{\partial^2 f}{\partial y \partial x}, \quad f_{yy} = \frac{\partial^2 f}{\partial y^2}$$

**定理**：若 $f_{xy}$ 和 $f_{yx}$ 在点 $(x_0, y_0)$ 处连续，则 $f_{xy} = f_{yx}$（混合偏导数与求导顺序无关）。

**例**：设 $z = x^3 y^2 - 3xy^3 + 2x - 1$，求各二阶偏导数。

> $z_x = 3x^2 y^2 - 3y^3 + 2$，$z_y = 2x^3 y - 9xy^2$
> $z_{xx} = 6xy^2$，$z_{xy} = 6x^2 y - 9y^2$，$z_{yx} = 6x^2 y - 9y^2$，$z_{yy} = 2x^3 - 18xy$

## 4. 全微分

### 4.1 定义

若 $\Delta z = f(x_0+\Delta x, y_0+\Delta y) - f(x_0, y_0) = A\Delta x + B\Delta y + o(\rho)$，其中 $\rho = \sqrt{(\Delta x)^2 + (\Delta y)^2}$，则称 $f$ 在 $(x_0,y_0)$ 可微，$dz = A\Delta x + B\Delta y$。

**定理**：若 $f$ 在 $(x_0,y_0)$ 可微，则 $A = f_x(x_0,y_0)$，$B = f_y(x_0,y_0)$，即

$$dz = f_x\,dx + f_y\,dy$$

### 4.2 可微的充分条件

若 $f_x$ 和 $f_y$ 在 $(x_0,y_0)$ 处连续，则 $f$ 在 $(x_0,y_0)$ 可微。

### 4.3 关系总结

$$\text{偏导数连续} \Rightarrow \text{可微} \Rightarrow \begin{cases} \text{连续} \\ \text{偏导数存在} \end{cases}$$

以上逆命题均不成立。

### 4.4 全微分在近似计算中的应用

$$f(x_0+\Delta x, y_0+\Delta y) \approx f(x_0,y_0) + f_x(x_0,y_0)\Delta x + f_y(x_0,y_0)\Delta y$$

## 5. 方向导数与梯度

### 5.1 方向导数

设 $\vec{l}$ 为从 $P_0$ 出发的射线方向，$\vec{e_l} = (\cos\alpha, \cos\beta)$，则方向导数

$$\frac{\partial f}{\partial l}\bigg|_{P_0} = \lim_{t \to 0^+} \frac{f(P_0 + t\vec{e_l}) - f(P_0)}{t}$$

**定理**：若 $f$ 在 $P_0$ 可微，则

$$\frac{\partial f}{\partial l}\bigg|_{P_0} = f_x \cos\alpha + f_y \cos\beta$$

### 5.2 梯度

$$\text{grad}\,f = \nabla f = (f_x, f_y)$$

**重要关系**：

$$\frac{\partial f}{\partial l} = \nabla f \cdot \vec{e_l} = |\nabla f|\cos\theta$$

其中 $\theta$ 为梯度与方向 $\vec{l}$ 的夹角。

**结论**：

- 梯度方向是函数增长最快的方向，方向导数等于 $|\nabla f|$
- 梯度的反方向是函数下降最快的方向
- 与梯度垂直的方向上方向导数为零

## 6. 多元复合函数求导

### 6.1 链式法则

设 $z = f(u, v)$，$u = \varphi(x, y)$，$v = \psi(x, y)$，则

$$\frac{\partial z}{\partial x} = \frac{\partial z}{\partial u}\frac{\partial u}{\partial x} + \frac{\partial z}{\partial v}\frac{\partial v}{\partial x}$$

$$\frac{\partial z}{\partial y} = \frac{\partial z}{\partial u}\frac{\partial u}{\partial y} + \frac{\partial z}{\partial v}\frac{\partial v}{\partial y}$$

**全微分形式不变性**：$dz = \frac{\partial z}{\partial u}du + \frac{\partial z}{\partial v}dv = \frac{\partial z}{\partial x}dx + \frac{\partial z}{\partial y}dy$

**例**：设 $z = e^u \sin v$，$u = xy$，$v = x + y$，求 $\frac{\partial z}{\partial x}$。

> $$\frac{\partial z}{\partial x} = e^u \sin v \cdot y + e^u \cos v \cdot 1 = e^{xy}[y\sin(x+y) + \cos(x+y)]$$

## 7. 隐函数定理

### 7.1 一个方程的情形

设 $F(x, y) = 0$ 确定了 $y = y(x)$，若 $F_y \neq 0$，则

$$\frac{dy}{dx} = -\frac{F_x}{F_y}$$

设 $F(x, y, z) = 0$ 确定了 $z = z(x, y)$，若 $F_z \neq 0$，则

$$\frac{\partial z}{\partial x} = -\frac{F_x}{F_z}, \quad \frac{\partial z}{\partial y} = -\frac{F_y}{F_z}$$

**例**：设 $x^2 + y^2 + z^2 - 4z = 0$，求 $\frac{\partial z}{\partial x}$。

> $F = x^2 + y^2 + z^2 - 4z$，$F_x = 2x$，$F_z = 2z - 4$。
> $$\frac{\partial z}{\partial x} = -\frac{2x}{2z-4} = \frac{x}{2-z}$$

### 7.2 方程组的情形

设 $\begin{cases} F(x, y, u, v) = 0 \\ G(x, y, u, v) = 0 \end{cases}$ 确定了 $u = u(x,y)$，$v = v(x,y)$，则

$$\frac{\partial u}{\partial x} = -\frac{\begin{vmatrix} F_x & F_v \\ G_x & G_v \end{vmatrix}}{\begin{vmatrix} F_u & F_v \\ G_u & G_v \end{vmatrix}}, \quad \frac{\partial v}{\partial x} = -\frac{\begin{vmatrix} F_u & F_x \\ G_u & G_x \end{vmatrix}}{\begin{vmatrix} F_u & F_v \\ G_u & G_v \end{vmatrix}}$$

其中分母 $J = \begin{vmatrix} F_u & F_v \\ G_u & G_v \end{vmatrix} \neq 0$ 为 **Jacobian 行列式**。

## 8. 极值与条件极值

### 8.1 无条件极值

**必要条件**：若 $f(x,y)$ 在 $(x_0,y_0)$ 有极值且偏导数存在，则 $f_x(x_0,y_0) = 0$，$f_y(x_0,y_0) = 0$。

**充分条件**：设 $f_x = f_y = 0$ 在 $(x_0,y_0)$ 成立，记 $A = f_{xx}$，$B = f_{xy}$，$C = f_{yy}$，$\Delta = AC - B^2$：

- $\Delta > 0$ 且 $A < 0$：极大值
- $\Delta > 0$ 且 $A > 0$：极小值
- $\Delta < 0$：不是极值（鞍点）
- $\Delta = 0$：无法判定

**例**：求 $f(x,y) = x^3 - y^3 + 3x^2 + 3y^2 - 9x$ 的极值。

> $f_x = 3x^2 + 6x - 9 = 3(x-1)(x+3) = 0$，$f_y = -3y^2 + 6y = -3y(y-2) = 0$
> 驻点：$(1,0)$，$(1,2)$，$(-3,0)$，$(-3,2)$
> $A = 6x+6$，$B = 0$，$C = -6y+6$，$\Delta = (6x+6)(-6y+6)$
>
> - $(1,0)$：$A=12>0$，$C=6$，$\Delta=72>0$，极小值 $f=-5$
> - $(1,2)$：$A=12$，$C=-6$，$\Delta=-72<0$，非极值
> - $(-3,0)$：$A=-12$，$C=6$，$\Delta=-72<0$，非极值
> - $(-3,2)$：$A=-12<0$，$C=-6$，$\Delta=72>0$，极大值 $f=31$

### 8.2 条件极值（Lagrange 乘数法）

求 $f(x,y)$ 在约束 $\varphi(x,y) = 0$ 下的极值，构造 Lagrange 函数：

$$L(x,y,\lambda) = f(x,y) + \lambda\varphi(x,y)$$

解方程组：

$$\begin{cases} L_x = f_x + \lambda\varphi_x = 0 \\ L_y = f_y + \lambda\varphi_y = 0 \\ L_\lambda = \varphi(x,y) = 0 \end{cases}$$

**例**：求 $f(x,y) = xy$ 在 $x + y = 1$ 下的极值。

> $L = xy + \lambda(x+y-1)$
> $L_x = y + \lambda = 0$，$L_y = x + \lambda = 0$，$x + y = 1$
> 解得 $x = y = \frac{1}{2}$，$\lambda = -\frac{1}{2}$。极大值 $f = \frac{1}{4}$。

### 8.3 多个约束的 Lagrange 乘数法

求 $f(x,y,z)$ 在约束 $\varphi_1 = 0$，$\varphi_2 = 0$ 下的极值：

$$L = f + \lambda_1\varphi_1 + \lambda_2\varphi_2$$

解 $L_x = 0$，$L_y = 0$，$L_z = 0$，$\varphi_1 = 0$，$\varphi_2 = 0$。
