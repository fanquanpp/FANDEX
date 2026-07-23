---
order: 94
title: 不定积分典型例题
module: calculus
category: 'comp-sci'
difficulty: intermediate
description: 不定积分15道典型例题：凑微分、换元积分、分部积分、有理函数积分等核心题型。
author: fanquanpp
updated: '2026-06-14'
related:
  - calculus/导数与微分典型例题
  - calculus/微分中值定理典型例题
  - calculus/定积分与应用典型例题
  - calculus/多元函数微分典型例题
prerequisites:
  - calculus/函数与极限
---

## 1. 凑微分法

**例1**：求 $\int \frac{dx}{x(1+\ln x)}$

**解**：

$$\int \frac{dx}{x(1+\ln x)} = \int \frac{d(\ln x)}{1+\ln x} = \int \frac{d(1+\ln x)}{1+\ln x} = \ln|1+\ln x| + C$$

---

**例2**：求 $\int \frac{dx}{\sqrt{x}(1+x)}$

**解**：

$$\int \frac{dx}{\sqrt{x}(1+x)} = 2\int \frac{d(\sqrt{x})}{1+(\sqrt{x})^2} = 2\arctan\sqrt{x} + C$$

---

**例3**：求 $\int \frac{\cos x}{\sin x + \cos x} dx$

**解**：

$$\int \frac{\cos x}{\sin x + \cos x} dx = \frac{1}{2}\int \frac{(\cos x + \sin x) + (\cos x - \sin x)}{\sin x + \cos x} dx$$

$$= \frac{1}{2}\int dx + \frac{1}{2}\int \frac{d(\sin x + \cos x)}{\sin x + \cos x} = \frac{x}{2} + \frac{1}{2}\ln|\sin x + \cos x| + C$$

## 2. 第二换元法

**例4**：求 $\int \frac{dx}{(1+x^2)^2}$

**解**：令 $x = \tan t$，$dx = \sec^2 t\, dt$

$$\int \frac{\sec^2 t\, dt}{\sec^4 t} = \int \cos^2 t\, dt = \frac{1}{2}\int (1+\cos 2t)\, dt = \frac{t}{2} + \frac{\sin 2t}{4} + C$$

回代：$t = \arctan x$

$$= \frac{1}{2}\arctan x + \frac{x}{2(1+x^2)} + C$$

---

**例5**：求 $\int \sqrt{a^2 - x^2}\, dx$（$a > 0$）

**解**：令 $x = a\sin t$，$dx = a\cos t\, dt$

$$\int a\cos t \cdot a\cos t\, dt = a^2\int \cos^2 t\, dt = \frac{a^2}{2}\left(t + \frac{\sin 2t}{2}\right) + C$$

$$= \frac{a^2}{2}\arcsin\frac{x}{a} + \frac{x}{2}\sqrt{a^2-x^2} + C$$

## 3. 分部积分法

**例6**：求 $\int x e^x dx$

**解**：设 $u = x$，$dv = e^x dx$

$$\int x e^x dx = x e^x - \int e^x dx = x e^x - e^x + C = (x-1)e^x + C$$

---

**例7**：求 $\int e^x \sin x\, dx$

**解**：设 $u = \sin x$，$dv = e^x dx$

$$I = e^x \sin x - \int e^x \cos x\, dx = e^x \sin x - e^x \cos x - \int e^x \sin x\, dx$$

$$I = e^x \sin x - e^x \cos x - I$$

$$2I = e^x(\sin x - \cos x)$$

$$I = \frac{e^x(\sin x - \cos x)}{2} + C$$

---

**例8**：求 $\int \ln x\, dx$

**解**：设 $u = \ln x$，$dv = dx$

$$\int \ln x\, dx = x\ln x - \int x \cdot \frac{1}{x}\, dx = x\ln x - x + C$$

---

**例9**：建立递推公式求 $I_n = \int \frac{dx}{(x^2+a^2)^n}$

**解**：

$$I_n = \frac{x}{(x^2+a^2)^n} + 2n\int \frac{x^2}{(x^2+a^2)^{n+1}} dx$$

$$= \frac{x}{(x^2+a^2)^n} + 2n\int \frac{x^2+a^2-a^2}{(x^2+a^2)^{n+1}} dx$$

$$= \frac{x}{(x^2+a^2)^n} + 2nI_n - 2na^2 I_{n+1}$$

$$I_{n+1} = \frac{x}{2na^2(x^2+a^2)^n} + \frac{2n-1}{2na^2}I_n$$

## 4. 有理函数积分

**例10**：求 $\int \frac{x+3}{x^2-5x+6} dx$

**解**：部分分式分解：

$$\frac{x+3}{(x-2)(x-3)} = \frac{A}{x-2} + \frac{B}{x-3}$$

$x+3 = A(x-3) + B(x-2)$

令 $x=2$：$5 = -A$，$A = -5$

令 $x=3$：$6 = B$，$B = 6$

$$\int \frac{x+3}{x^2-5x+6} dx = -5\int \frac{dx}{x-2} + 6\int \frac{dx}{x-3} = -5\ln|x-2| + 6\ln|x-3| + C$$

---

**例11**：求 $\int \frac{dx}{x^3+1}$

**解**：$x^3 + 1 = (x+1)(x^2-x+1)$

$$\frac{1}{x^3+1} = \frac{A}{x+1} + \frac{Bx+C}{x^2-x+1}$$

$1 = A(x^2-x+1) + (Bx+C)(x+1)$

令 $x=-1$：$1 = 3A$，$A = \frac{1}{3}$

比较 $x^2$ 系数：$0 = A + B$，$B = -\frac{1}{3}$

比较常数项：$1 = A + C$，$C = \frac{2}{3}$

$$\int \frac{dx}{x^3+1} = \frac{1}{3}\ln|x+1| - \frac{1}{3}\int \frac{x-2}{x^2-x+1} dx$$

$$= \frac{1}{3}\ln|x+1| - \frac{1}{6}\ln(x^2-x+1) + \frac{1}{\sqrt{3}}\arctan\frac{2x-1}{\sqrt{3}} + C$$

## 5. 三角函数积分

**例12**：求 $\int \sin^3 x\, dx$

**解**：

$$\int \sin^3 x\, dx = \int \sin x(1-\cos^2 x)\, dx = -\int (1-\cos^2 x)\, d(\cos x)$$

$$= -\cos x + \frac{\cos^3 x}{3} + C$$

---

**例13**：求 $\int \sin^2 x \cos^2 x\, dx$

**解**：

$$\int \sin^2 x \cos^2 x\, dx = \frac{1}{4}\int \sin^2 2x\, dx = \frac{1}{4}\int \frac{1-\cos 4x}{2}\, dx = \frac{x}{8} - \frac{\sin 4x}{32} + C$$

## 6. 综合题型

**例14**：求 $\int \frac{dx}{x\sqrt{x^2-1}}$（$x > 1$）

**解法一**：令 $x = \sec t$，$dx = \sec t \tan t\, dt$

$$\int \frac{\sec t \tan t}{\sec t \cdot \tan t}\, dt = \int dt = t + C = \text{arcsec}\, x + C$$

**解法二**：令 $t = \sqrt{x^2-1}$

$$\int \frac{dx}{x\sqrt{x^2-1}} = \int \frac{1}{x^2} \cdot \frac{x\, dx}{\sqrt{x^2-1}} = \int \frac{dt}{1+t^2} = \arctan\sqrt{x^2-1} + C$$

---

**例15**：求 $\int \max(1, x^2) dx$

**解**：

$$\max(1, x^2) = \begin{cases} x^2 & |x| \geq 1 \\ 1 & |x| < 1 \end{cases}$$

当 $x < -1$：$\int x^2 dx = \frac{x^3}{3} + C_1$

当 $-1 \leq x < 1$：$\int 1\, dx = x + C_2$

当 $x \geq 1$：$\int x^2 dx = \frac{x^3}{3} + C_3$

由连续性：在 $x=-1$ 处 $\frac{-1}{3} + C_1 = -1 + C_2$

在 $x=1$ 处 $1 + C_2 = \frac{1}{3} + C_3$

取 $C_2 = 0$，则 $C_1 = -\frac{2}{3}$，$C_3 = \frac{2}{3}$

$$\int \max(1, x^2) dx = \begin{cases} \frac{x^3}{3} - \frac{2}{3} & x < -1 \\ x & -1 \leq x < 1 \\ \frac{x^3}{3} + \frac{2}{3} & x \geq 1 \end{cases}$$
