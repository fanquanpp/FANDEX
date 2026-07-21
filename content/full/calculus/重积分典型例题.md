---
order: 97
title: 重积分典型例题
module: calculus
category: 'comp-sci'
difficulty: intermediate
description: 重积分15道典型例题：二重积分计算、极坐标变换、三重积分、柱坐标与球坐标等核心题型。
author: fanquanpp
updated: '2026-06-14'
related:
  - calculus/定积分与应用典型例题
  - calculus/多元函数微分典型例题
  - calculus/曲线积分与曲面积分典型例题
  - calculus/无穷级数与常微分方程典型例题
prerequisites:
  - calculus/函数与极限
---

## 1. 二重积分交换积分顺序

**例1**：交换积分顺序 $\int_0^1 dx \int_x^1 f(x,y)\, dy$

**解**：原积分区域 $D: 0 \leq x \leq 1, x \leq y \leq 1$

交换后：$0 \leq y \leq 1, 0 \leq x \leq y$

$$\int_0^1 dx \int_x^1 f(x,y)\, dy = \int_0^1 dy \int_0^y f(x,y)\, dx$$

---

**例2**：交换积分顺序 $\int_0^1 dx \int_0^{x^2} f(x,y)\, dy + \int_1^{\sqrt{2}} dx \int_0^{2-x^2} f(x,y)\, dy$

**解**：区域 $D = D_1 \cup D_2$，其中：

$D_1: 0 \leq x \leq 1, 0 \leq y \leq x^2$

$D_2: 1 \leq x \leq \sqrt{2}, 0 \leq y \leq 2-x^2$

合并后 $D: 0 \leq y \leq 1, \sqrt{y} \leq x \leq \sqrt{2-y}$

$$\int_0^1 dy \int_{\sqrt{y}}^{\sqrt{2-y}} f(x,y)\, dx$$

## 2. 极坐标计算二重积分

**例3**：求 $\iint_D e^{-x^2-y^2} d\sigma$，其中 $D: x^2 + y^2 \leq R^2$

**解**：极坐标变换：

$$\iint_D e^{-r^2} \cdot r\, dr\, d\theta = \int_0^{2\pi} d\theta \int_0^R r e^{-r^2}\, dr = 2\pi \cdot \left[-\frac{1}{2}e^{-r^2}\right]_0^R = \pi(1-e^{-R^2})$$

令 $R \to +\infty$：$\int_0^{+\infty} e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$（概率积分）

---

**例4**：求 $\iint_D \sqrt{x^2+y^2} d\sigma$，其中 $D: x^2 + y^2 \leq 2x$

**解**：$x^2 + y^2 \leq 2x$ 即 $(x-1)^2 + y^2 \leq 1$，极坐标 $r = 2\cos\theta$，$\theta \in [-\pi/2, \pi/2]$

$$\int_{-\pi/2}^{\pi/2} d\theta \int_0^{2\cos\theta} r \cdot r\, dr = \int_{-\pi/2}^{\pi/2} \frac{8\cos^3\theta}{3}\, d\theta = \frac{16}{3}\int_0^{\pi/2}\cos^3\theta\, d\theta = \frac{16}{3} \cdot \frac{2}{3} = \frac{32}{9}$$

## 3. 二重积分对称性

**例5**：求 $\iint_D (x^2 + y^2) d\sigma$，其中 $D: |x| + |y| \leq 1$

**解**：利用对称性，只需计算第一象限部分再乘 4：

$D_1: x + y \leq 1, x \geq 0, y \geq 0$

$$4\int_0^1 dx \int_0^{1-x} (x^2+y^2)\, dy = 4\int_0^1 \left[x^2(1-x) + \frac{(1-x)^3}{3}\right] dx$$

$$= 4\left[\frac{x^3}{3} - \frac{x^4}{4} - \frac{(1-x)^4}{12}\right]_0^1 = 4\left[\frac{1}{3} - \frac{1}{4} + \frac{1}{12}\right] = \frac{2}{3}$$

## 4. 二重积分综合

**例6**：求 $\iint_D |xy| d\sigma$，其中 $D: x^2 + y^2 \leq a^2$

**解**：由对称性：

$$\iint_D |xy| d\sigma = 4\int_0^{\pi/2} d\theta \int_0^a r^2 \cos\theta\sin\theta \cdot r\, dr = 4\int_0^{\pi/2} \frac{\sin 2\theta}{2} d\theta \int_0^a r^3\, dr$$

$$= 4 \cdot \frac{1}{2} \cdot \frac{a^4}{4} = \frac{a^4}{2}$$

---

**例7**：设 $f(x)$ 连续，证明：$\iint_D f(x+y) dxdy = \int_{-1}^{1} f(u) du$，其中 $D: |x|+|y| \leq 1$。

**证明**：令 $u = x+y$，$v = x-y$，Jacobian $\frac{\partial(x,y)}{\partial(u,v)} = \frac{1}{2}$

$D$ 变为 $|u| \leq 1, |v| \leq 1$

$$\iint_D f(x+y) dxdy = \int_{-1}^{1} f(u) du \int_{-1}^{1} \frac{1}{2} dv = \int_{-1}^{1} f(u) du$$

## 5. 三重积分

**例8**：求 $\iiint_\Omega z\, dV$，其中 $\Omega$ 由 $z = x^2+y^2$ 和 $z = 1$ 围成。

**解**：柱坐标，$z$ 从 $r^2$ 到 $1$，$r$ 从 $0$ 到 $1$：

$$\int_0^{2\pi} d\theta \int_0^1 r\, dr \int_{r^2}^1 z\, dz = 2\pi \int_0^1 r \cdot \frac{1-r^4}{2}\, dr = \pi\left[\frac{r^2}{2} - \frac{r^6}{6}\right]_0^1 = \frac{\pi}{3}$$

---

**例9**：求 $\iiint_\Omega (x^2+y^2+z^2) dV$，其中 $\Omega: x^2+y^2+z^2 \leq R^2$

**解**：球坐标：

$$\int_0^{2\pi} d\theta \int_0^\pi d\varphi \int_0^R r^2 \cdot r^2\sin\varphi\, dr = 2\pi \cdot 2 \cdot \frac{R^5}{5} = \frac{4\pi R^5}{5}$$

---

**例10**：求 $\iiint_\Omega z^2\, dV$，其中 $\Omega: x^2+y^2+z^2 \leq R^2$

**解**：由对称性，$\iiint x^2\, dV = \iiint y^2\, dV = \iiint z^2\, dV$

$$\iiint (x^2+y^2+z^2) dV = \frac{4\pi R^5}{5}$$

$$\iiint z^2\, dV = \frac{1}{3} \cdot \frac{4\pi R^5}{5} = \frac{4\pi R^5}{15}$$

## 6. 重积分应用

**例11**：求球面 $x^2+y^2+z^2 = R^2$ 内接正圆柱体的最大体积。

**解**：设圆柱底面半径 $r$，高 $2h$，则 $r^2 + h^2 = R^2$

$$V = \pi r^2 \cdot 2h = 2\pi(R^2-h^2)h$$

令 $\frac{dV}{dh} = 2\pi(R^2 - 3h^2) = 0$，$h = \frac{R}{\sqrt{3}}$

$$V_{\max} = 2\pi \cdot \frac{2R^2}{3} \cdot \frac{R}{\sqrt{3}} = \frac{4\sqrt{3}\pi R^3}{9}$$

---

**例12**：求由 $z = x^2+y^2$ 和 $z = 2-x^2-y^2$ 围成立体的体积。

**解**：联立 $x^2+y^2 = 1$

$$V = \iint_{x^2+y^2 \leq 1} [(2-x^2-y^2) - (x^2+y^2)] d\sigma = \iint (2-2r^2) r\, dr\, d\theta$$

$$= 2\pi \int_0^1 (2r - 2r^3)\, dr = 2\pi\left[r^2 - \frac{r^4}{2}\right]_0^1 = \pi$$

## 7. 变量替换

**例13**：求 $\iint_D \sqrt{1-\frac{x^2}{a^2}-\frac{y^2}{b^2}} d\sigma$，其中 $D: \frac{x^2}{a^2}+\frac{y^2}{b^2} \leq 1$

**解**：广义极坐标 $x = ar\cos\theta$，$y = br\sin\theta$，Jacobian $= abr$

$$\int_0^{2\pi} d\theta \int_0^1 \sqrt{1-r^2} \cdot abr\, dr = 2\pi ab \int_0^1 r\sqrt{1-r^2}\, dr = 2\pi ab \cdot \frac{1}{3} = \frac{2\pi ab}{3}$$

---

**例14**：求 $\iiint_\Omega \sqrt{x^2+y^2} dV$，其中 $\Omega$ 由 $z = \sqrt{x^2+y^2}$ 和 $z = 1$ 围成。

**解**：柱坐标：

$$\int_0^{2\pi} d\theta \int_0^1 r \cdot r\, dr \int_r^1 dz = 2\pi \int_0^1 r^2(1-r)\, dr = 2\pi\left[\frac{r^3}{3} - \frac{r^4}{4}\right]_0^1 = \frac{\pi}{6}$$

---

**例15**：设 $f(x)$ 连续且 $f(x) > 0$，$F(t) = \frac{\iiint_{\Omega_t} f(x^2+y^2+z^2) dV}{\iint_{D_t} f(x^2+y^2) d\sigma}$，其中 $\Omega_t: x^2+y^2+z^2 \leq t^2$，$D_t: x^2+y^2 \leq t^2$。求 $F(t)$。

**解**：

分子（球坐标）：

$$\iiint_{\Omega_t} f(r^2) r^2\sin\varphi\, dr\, d\varphi\, d\theta = 4\pi \int_0^t r^2 f(r^2)\, dr$$

分母（极坐标）：

$$\iint_{D_t} f(r^2) r\, dr\, d\theta = 2\pi \int_0^t r f(r^2)\, dr$$

$$F(t) = \frac{4\pi \int_0^t r^2 f(r^2)\, dr}{2\pi \int_0^t r f(r^2)\, dr} = \frac{2\int_0^t r^2 f(r^2)\, dr}{\int_0^t r f(r^2)\, dr}$$
