---
order: 8
title: 曲线积分与曲面积分
module: calculus
category: 高等数学
difficulty: advanced
description: 第一/二类曲线积分、Green公式、第一/二类曲面积分、Gauss公式、Stokes公式、场论初步。
author: fanquanpp
updated: '2026-06-14'
related:
  - calculus/多元函数微分
  - calculus/重积分
  - calculus/公式速查表
  - calculus/无穷级数与常微分方程
prerequisites: []
---

## 1. 第一类曲线积分（对弧长的曲线积分）

### 1.1 定义

设 $L$ 为 $xOy$ 面上的光滑曲线弧，$f(x,y)$ 在 $L$ 上有界，则

$$\int_L f(x,y)\,ds = \lim_{\lambda \to 0} \sum_{i=1}^n f(\xi_i, \eta_i)\Delta s_i$$

### 1.2 计算

**参数方程** $x = x(t)$，$y = y(t)$（$\alpha \leq t \leq \beta$）：

$$\int_L f(x,y)\,ds = \int_\alpha^\beta f[x(t), y(t)]\sqrt{[x'(t)]^2 + [y'(t)]^2}\,dt$$

**直角坐标** $y = y(x)$（$a \leq x \leq b$）：

$$\int_L f(x,y)\,ds = \int_a^b f[x, y(x)]\sqrt{1 + [y'(x)]^2}\,dx$$

**极坐标** $r = r(\theta)$（$\alpha \leq \theta \leq \beta$）：

$$\int_L f(x,y)\,ds = \int_\alpha^\beta f[r(\theta)\cos\theta, r(\theta)\sin\theta]\sqrt{r^2 + [r'(\theta)]^2}\,d\theta$$

**注意**：第一类曲线积分的积分下限必须小于上限。

**例**：计算 $\int_L (x^2+y^2)\,ds$，$L$ 为 $x^2+y^2 = R^2$。

> 参数方程：$x = R\cos t$，$y = R\sin t$（$0 \leq t \leq 2\pi$），$ds = R\,dt$。
> $$\int_0^{2\pi} R^2 \cdot R\,dt = 2\pi R^3$$

### 1.3 空间曲线

$$\int_\Gamma f(x,y,z)\,ds = \int_\alpha^\beta f[x(t),y(t),z(t)]\sqrt{[x'(t)]^2+[y'(t)]^2+[z'(t)]^2}\,dt$$

## 2. 第二类曲线积分（对坐标的曲线积分）

### 2.1 定义

$$\int_L P\,dx + Q\,dy = \lim_{\lambda \to 0} \sum_{i=1}^n [P(\xi_i,\eta_i)\Delta x_i + Q(\xi_i,\eta_i)\Delta y_i]$$

### 2.2 计算

**参数方程** $x = x(t)$，$y = y(t)$，$L$ 从 $t = \alpha$ 到 $t = \beta$：

$$\int_L P\,dx + Q\,dy = \int_\alpha^\beta \{P[x(t),y(t)]x'(t) + Q[x(t),y(t)]y'(t)\}\,dt$$

**注意**：第二类曲线积分的下限对应起点，上限对应终点。

**例**：计算 $\int_L y\,dx - x\,dy$，$L$ 为 $x = R\cos t$，$y = R\sin t$ 从 $t=0$ 到 $t=\pi/2$。

> $$\int_0^{\pi/2} [R\sin t \cdot (-R\sin t) - R\cos t \cdot R\cos t]\,dt = -R^2\int_0^{\pi/2} dt = -\frac{\pi R^2}{2}$$

### 2.3 两类曲线积分的关系

$$\int_L P\,dx + Q\,dy = \int_L (P\cos\alpha + Q\cos\beta)\,ds$$

其中 $(\cos\alpha, \cos\beta)$ 为 $L$ 在点 $(x,y)$ 处的单位切向量。

### 2.4 空间第二类曲线积分

$$\int_\Gamma P\,dx + Q\,dy + R\,dz = \int_\alpha^\beta [Px'(t) + Qy'(t) + Rz'(t)]\,dt$$

## 3. Green 公式

### 3.1 定理

设 $D$ 为由分段光滑闭曲线 $L$ 围成的有界闭区域，$P(x,y)$ 和 $Q(x,y)$ 在 $D$ 上具有一阶连续偏导数，则

$$\oint_L P\,dx + Q\,dy = \iint_D \left(\frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y}\right)dxdy$$

其中 $L$ 取**正向**（逆时针方向）。

### 3.2 应用

**求面积**：

$$A = \frac{1}{2}\oint_L x\,dy - y\,dx$$

**例**：计算 $\oint_L (x+y^2)\,dx + (y+x^2)\,dy$，$L$ 为 $x^2+y^2=2x$ 逆时针。

> $\frac{\partial Q}{\partial x} = 2x$，$\frac{\partial P}{\partial y} = 2y$。
> $$\oint_L = \iint_D (2x-2y)\,dxdy$$
> 由对称性，$\iint_D 2y\,dxdy = 0$。
> $\iint_D 2x\,dxdy = 2\int_{-\pi/2}^{\pi/2} d\theta\int_0^{2\cos\theta} r\cos\theta \cdot r\,dr = 2\pi$。

### 3.3 平面曲线积分与路径无关的条件

设 $P$, $Q$ 在单连通区域 $D$ 上具有一阶连续偏导数，以下条件等价：

1. $\int_L P\,dx + Q\,dy$ 在 $D$ 内与路径无关
2. $\oint_C P\,dx + Q\,dy = 0$，$C$ 为 $D$ 内任意闭曲线
3. $\frac{\partial P}{\partial y} = \frac{\partial Q}{\partial x}$ 在 $D$ 内处处成立
4. $P\,dx + Q\,dy$ 为某函数 $u(x,y)$ 的全微分，即 $du = P\,dx + Q\,dy$

**求原函数**：

$$u(x,y) = \int_{(x_0,y_0)}^{(x,y)} P\,dx + Q\,dy$$

**例**：验证 $(2xy+y^3)\,dx + (x^2+3xy^2)\,dy$ 是某函数的全微分并求之。

> $\frac{\partial P}{\partial y} = 2x + 3y^2$，$\frac{\partial Q}{\partial x} = 2x + 3y^2$，相等。
> $u = \int_0^x 0\,dx + \int_0^y (x^2+3xy^2)\,dy = x^2 y + xy^3$

## 4. 第一类曲面积分

### 4.1 定义

$$\iint_\Sigma f(x,y,z)\,dS = \lim_{\lambda \to 0} \sum_{i=1}^n f(\xi_i,\eta_i,\zeta_i)\Delta S_i$$

### 4.2 计算

设 $\Sigma: z = z(x,y)$，$(x,y) \in D_{xy}$，则

$$\iint_\Sigma f(x,y,z)\,dS = \iint_{D_{xy}} f[x,y,z(x,y)]\sqrt{1+z_x^2+z_y^2}\,dxdy$$

类似地，可投影到 $yOz$ 或 $xOz$ 面。

**例**：计算 $\iint_\Sigma (x^2+y^2)\,dS$，$\Sigma: z = \sqrt{x^2+y^2}$（$0 \leq z \leq 1$）。

> $z_x = \frac{x}{\sqrt{x^2+y^2}}$，$z_y = \frac{y}{\sqrt{x^2+y^2}}$，$\sqrt{1+z_x^2+z_y^2} = \sqrt{2}$。
> $$\iint_{x^2+y^2 \leq 1} (x^2+y^2)\sqrt{2}\,dxdy = \sqrt{2}\int_0^{2\pi} d\theta\int_0^1 r^2 \cdot r\,dr = \sqrt{2} \cdot 2\pi \cdot \frac{1}{4} = \frac{\sqrt{2}\pi}{2}$$

## 5. 第二类曲面积分

### 5.1 定义

$$\iint_\Sigma P\,dydz + Q\,dzdx + R\dxdy$$

表示向量场 $\vec{F} = (P,Q,R)$ 穿过曲面 $\Sigma$ 指定侧的**通量**。

### 5.2 计算

设 $\Sigma: z = z(x,y)$，$(x,y) \in D_{xy}$，取上侧：

$$\iint_\Sigma R\dxdy = \pm\iint_{D_{xy}} R[x,y,z(x,y)]\,dxdy$$

上侧取 $+$，下侧取 $-$。

**合一投影法**：设 $\Sigma: z = z(x,y)$，取上侧，则

$$\iint_\Sigma P\,dydz + Q\,dzdx + R\dxdy = \iint_{D_{xy}} \left[-Pz_x - Qz_y + R\right]dxdy$$

**例**：计算 $\iint_\Sigma x\,dydz + y\,dzdx + z\dxdy$，$\Sigma: x^2+y^2+z^2 = R^2$ 上半球面取上侧。

> $\Sigma: z = \sqrt{R^2-x^2-y^2}$，$z_x = \frac{-x}{z}$，$z_y = \frac{-y}{z}$。
> $$\iint_{D_{xy}} \left[\frac{x^2}{z} + \frac{y^2}{z} + z\right]dxdy = \iint_{D_{xy}} \frac{R^2}{z}\,dxdy = R^2\int_0^{2\pi} d\theta\int_0^R \frac{r\,dr}{\sqrt{R^2-r^2}} = 2\pi R^3$$

## 6. Gauss 公式

### 6.1 定理

设空间闭区域 $\Omega$ 由分片光滑闭曲面 $\Sigma$ 围成，$P$, $Q$, $R$ 在 $\Omega$ 上有一阶连续偏导数，则

$$\oiint_\Sigma P\,dydz + Q\,dzdx + R\dxdy = \iiint_\Omega \left(\frac{\partial P}{\partial x} + \frac{\partial Q}{\partial y} + \frac{\partial R}{\partial z}\right)dV$$

其中 $\Sigma$ 取**外侧**。

### 6.2 散度

$$\text{div}\,\vec{F} = \frac{\partial P}{\partial x} + \frac{\partial Q}{\partial y} + \frac{\partial R}{\partial z}$$

Gauss 公式可写为：$\oiint_\Sigma \vec{F} \cdot d\vec{S} = \iiint_\Omega \text{div}\,\vec{F}\,dV$

**例**：计算 $\oiint_\Sigma x\,dydz + y\,dzdx + z\dxdy$，$\Sigma: x^2+y^2+z^2 = R^2$ 取外侧。

> $\text{div}\,\vec{F} = 1 + 1 + 1 = 3$。
> $$\oiint_\Sigma = 3\iiint_\Omega dV = 3 \cdot \frac{4\pi R^3}{3} = 4\pi R^3$$

## 7. Stokes 公式

### 7.1 定理

设 $\Sigma$ 为光滑曲面，其边界曲线 $\Gamma$ 为分段光滑闭曲线，则

$$\oint_\Gamma P\,dx + Q\,dy + R\,dz = \iint_\Sigma \left(\frac{\partial R}{\partial y} - \frac{\partial Q}{\partial z}\right)dydz + \left(\frac{\partial P}{\partial z} - \frac{\partial R}{\partial x}\right)dzdx + \left(\frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y}\right)dxdy$$

方向关系：$\Gamma$ 的正向与 $\Sigma$ 的侧符合右手定则。

### 7.2 旋度

$$\text{rot}\,\vec{F} = \nabla \times \vec{F} = \begin{vmatrix} \vec{i} & \vec{j} & \vec{k} \\ \frac{\partial}{\partial x} & \frac{\partial}{\partial y} & \frac{\partial}{\partial z} \\ P & Q & R \end{vmatrix}$$

Stokes 公式：$\oint_\Gamma \vec{F} \cdot d\vec{r} = \iint_\Sigma \text{rot}\,\vec{F} \cdot d\vec{S}$

**例**：计算 $\oint_\Gamma y\,dx + z\,dy + x\,dz$，$\Gamma$ 为 $x^2+y^2+z^2 = R^2$ 与 $x+y+z=0$ 的交线，从 $x$ 轴正向看逆时针。

> $\text{rot}\,\vec{F} = (-1, -1, -1)$，取 $\Sigma$ 为平面 $x+y+z=0$ 被 $\Gamma$ 所围部分，法向量 $\vec{n} = \frac{1}{\sqrt{3}}(1,1,1)$。
> $$\oint_\Gamma = \iint_\Sigma (-1,-1,-1) \cdot \frac{1}{\sqrt{3}}(1,1,1)\,dS = -\sqrt{3}\iint_\Sigma dS = -\sqrt{3} \cdot \pi R^2$$

## 8. 场论初步

### 8.1 数量场与向量场

- **数量场**：空间区域中每点对应一个数量，如温度场 $T(x,y,z)$
- **向量场**：空间区域中每点对应一个向量，如速度场 $\vec{v}(x,y,z)$

### 8.2 梯度、散度、旋度

| 运算                         | 对象   | 结果   | 公式              |
| ---------------------------- | ------ | ------ | ----------------- |
| 梯度 $\nabla f$              | 数量场 | 向量场 | $(f_x, f_y, f_z)$ |
| 散度 $\nabla \cdot \vec{F}$  | 向量场 | 数量场 | $P_x + Q_y + R_z$ |
| 旋度 $\nabla \times \vec{F}$ | 向量场 | 向量场 | 见上方公式        |

### 8.3 保守场

若 $\vec{F} = \nabla f$（即 $\vec{F}$ 是某数量场的梯度），则 $\vec{F}$ 为**保守场**。

**等价条件**（单连通区域内）：

1. $\text{rot}\,\vec{F} = \vec{0}$（无旋场）
2. $\oint_\Gamma \vec{F} \cdot d\vec{r} = 0$（任意闭曲线）
3. $\int_L \vec{F} \cdot d\vec{r}$ 与路径无关
4. $\vec{F}$ 为保守场

### 8.4 算子运算

$$\nabla \cdot (\nabla f) = \Delta f = \frac{\partial^2 f}{\partial x^2} + \frac{\partial^2 f}{\partial y^2} + \frac{\partial^2 f}{\partial z^2}$$

$\Delta$ 为 **Laplace 算子**，$\Delta f = 0$ 的解称为**调和函数**。

$$\nabla \times (\nabla f) = \vec{0}$$

$$\nabla \cdot (\nabla \times \vec{F}) = 0$$
