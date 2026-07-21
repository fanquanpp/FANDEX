---
order: 95
title: 定积分与应用典型例题
module: calculus
category: 'comp-sci'
difficulty: intermediate
description: 定积分与应用15道典型例题：定积分计算、变限积分、反常积分、几何与物理应用等核心题型。
author: fanquanpp
updated: '2026-06-14'
related:
  - calculus/微分中值定理典型例题
  - calculus/不定积分典型例题
  - calculus/多元函数微分典型例题
  - calculus/重积分典型例题
prerequisites:
  - calculus/函数与极限
---

## 1. 定积分基本计算

**例1**：求 $\int_0^{\pi/2} \frac{\sin x}{\sin x + \cos x} dx$

**解**：利用公式 $\int_0^{\pi/2} f(\sin x) dx = \int_0^{\pi/2} f(\cos x) dx$

设 $I = \int_0^{\pi/2} \frac{\sin x}{\sin x + \cos x} dx$，$J = \int_0^{\pi/2} \frac{\cos x}{\sin x + \cos x} dx$

由对称性 $I = J$，又 $I + J = \int_0^{\pi/2} dx = \frac{\pi}{2}$

故 $I = \frac{\pi}{4}$

---

**例2**：求 $\int_0^1 \frac{\ln(1+x)}{1+x^2} dx$

**解**：令 $x = \tan t$，$dx = \sec^2 t\, dt$

$$\int_0^{\pi/4} \frac{\ln(1+\tan t)}{1+\tan^2 t} \cdot \sec^2 t\, dt = \int_0^{\pi/4} \ln(1+\tan t)\, dt$$

利用 $1+\tan t = \frac{\sin t + \cos t}{\cos t} = \frac{\sqrt{2}\cos(\frac{\pi}{4}-t)}{\cos t}$

$$\int_0^{\pi/4} \ln\frac{\sqrt{2}\cos(\frac{\pi}{4}-t)}{\cos t}\, dt = \frac{\pi}{4}\ln\sqrt{2} + \int_0^{\pi/4}\ln\cos\left(\frac{\pi}{4}-t\right)dt - \int_0^{\pi/4}\ln\cos t\, dt$$

后两项相等（变量替换 $u = \frac{\pi}{4}-t$），故：

$$\int_0^1 \frac{\ln(1+x)}{1+x^2} dx = \frac{\pi}{8}\ln 2$$

## 2. 变限积分求导

**例3**：求 $\frac{d}{dx}\int_0^x (x-t)f(t)\, dt$

**解**：

$$\int_0^x (x-t)f(t)\, dt = x\int_0^x f(t)\, dt - \int_0^x tf(t)\, dt$$

$$\frac{d}{dx} = \int_0^x f(t)\, dt + xf(x) - xf(x) = \int_0^x f(t)\, dt$$

---

**例4**：求 $\frac{d}{dx}\int_{x^2}^{e^x} \sin t^2\, dt$

**解**：设 $F(u) = \int_0^u \sin t^2\, dt$

$$\frac{d}{dx}\int_{x^2}^{e^x} \sin t^2\, dt = F'(e^x) \cdot e^x - F'(x^2) \cdot 2x = e^x \sin(e^{2x}) - 2x\sin(x^4)$$

## 3. 定积分的对称性

**例5**：求 $\int_{-1}^{1} \frac{x^3 \cos x}{1+x^4} dx$

**解**：被积函数 $f(x) = \frac{x^3 \cos x}{1+x^4}$ 是奇函数（$f(-x) = -f(x)$），积分区间关于原点对称。

$$\int_{-1}^{1} \frac{x^3 \cos x}{1+x^4} dx = 0$$

---

**例6**：求 $\int_{-\pi/2}^{\pi/2} (x^3 + \sin^2 x)\cos^2 x\, dx$

**解**：$x^3\cos^2 x$ 是奇函数，积分为 0。

$$\int_{-\pi/2}^{\pi/2} \sin^2 x \cos^2 x\, dx = 2\int_0^{\pi/2} \frac{\sin^2 2x}{4}\, dx = \frac{1}{2}\int_0^{\pi/2} \frac{1-\cos 4x}{2}\, dx = \frac{\pi}{8}$$

## 4. 华里士公式

**例7**：求 $\int_0^{\pi/2} \sin^4 x \cos^2 x\, dx$

**解**：

$$\int_0^{\pi/2} \sin^4 x \cos^2 x\, dx = \int_0^{\pi/2} \sin^4 x(1-\sin^2 x)\, dx = I_4 - I_6$$

由华里士公式：$I_4 = \frac{3}{4} \cdot \frac{1}{2} \cdot \frac{\pi}{2} = \frac{3\pi}{16}$，$I_6 = \frac{5}{6} \cdot \frac{3}{4} \cdot \frac{1}{2} \cdot \frac{\pi}{2} = \frac{5\pi}{32}$

$$\int_0^{\pi/2} \sin^4 x \cos^2 x\, dx = \frac{3\pi}{16} - \frac{5\pi}{32} = \frac{\pi}{32}$$

## 5. 反常积分

**例8**：判断 $\int_0^{+\infty} \frac{x}{(1+x^2)^2} dx$ 的收敛性并求值。

**解**：

$$\int_0^{+\infty} \frac{x}{(1+x^2)^2} dx = \frac{1}{2}\int_0^{+\infty} \frac{d(1+x^2)}{(1+x^2)^2} = \frac{1}{2}\left[-\frac{1}{1+x^2}\right]_0^{+\infty} = \frac{1}{2}(0-(-1)) = \frac{1}{2}$$

---

**例9**：求 $\int_0^1 \ln x\, dx$

**解**：

$$\int_0^1 \ln x\, dx = \lim_{\varepsilon \to 0^+} \int_\varepsilon^1 \ln x\, dx = \lim_{\varepsilon \to 0^+} [x\ln x - x]_\varepsilon^1$$

$$= \lim_{\varepsilon \to 0^+} (-1 - \varepsilon\ln\varepsilon + \varepsilon) = -1$$

（因为 $\lim_{\varepsilon \to 0^+} \varepsilon\ln\varepsilon = 0$）

## 6. 定积分证明题

**例10**：证明：$\int_0^a f(x) dx = \int_0^a f(a-x) dx$

**证明**：令 $t = a - x$：

$$\int_0^a f(a-x) dx = -\int_a^0 f(t) dt = \int_0^a f(t) dt = \int_0^a f(x) dx$$

---

**例11**：设 $f(x)$ 在 $[0,1]$ 连续，证明：$\int_0^1 f(x) dx = \int_0^1 f(1-x) dx$，并利用此证明 $\int_0^{\pi/2} \frac{\sin x}{\sin x + \cos x} dx = \frac{\pi}{4}$。

**证明**：令 $t = 1-x$ 即得。

$$I = \int_0^{\pi/2} \frac{\sin x}{\sin x + \cos x} dx$$

$$I = \int_0^{\pi/2} \frac{\sin(\frac{\pi}{2}-x)}{\sin(\frac{\pi}{2}-x)+\cos(\frac{\pi}{2}-x)} dx = \int_0^{\pi/2} \frac{\cos x}{\cos x + \sin x} dx$$

$$2I = \int_0^{\pi/2} dx = \frac{\pi}{2} \Rightarrow I = \frac{\pi}{4}$$

## 7. 几何应用

**例12**：求由 $y = x^2$ 和 $y = 2x$ 所围图形的面积。

**解**：联立 $x^2 = 2x$ 得交点 $x = 0$ 和 $x = 2$。

$$A = \int_0^2 (2x - x^2) dx = \left[x^2 - \frac{x^3}{3}\right]_0^2 = 4 - \frac{8}{3} = \frac{4}{3}$$

---

**例13**：求 $y = \sqrt{x}$ 绕 $x$ 轴旋转（$0 \leq x \leq 4$）所得旋转体体积。

**解**：

$$V = \pi \int_0^4 (\sqrt{x})^2 dx = \pi \int_0^4 x\, dx = \pi \cdot \frac{x^2}{2}\Big|_0^4 = 8\pi$$

## 8. 物理应用

**例14**：一弹簧的力 $F(x) = kx$（$k > 0$），将弹簧从自然长度拉伸 $a$ 到 $2a$，求所做的功。

**解**：

$$W = \int_a^{2a} kx\, dx = \frac{k}{2}[x^2]_a^{2a} = \frac{k}{2}(4a^2 - a^2) = \frac{3ka^2}{2}$$

---

**例15**：求半圆 $x^2 + y^2 \leq R^2$（$y \geq 0$）绕 $x$ 轴旋转所得球的表面积。

**解**：$y = \sqrt{R^2 - x^2}$，$y' = \frac{-x}{\sqrt{R^2-x^2}}$

$$S = 2\pi \int_{-R}^{R} y\sqrt{1+y'^2}\, dx = 2\pi \int_{-R}^{R} \sqrt{R^2-x^2} \cdot \frac{R}{\sqrt{R^2-x^2}}\, dx = 2\pi \int_{-R}^{R} R\, dx = 4\pi R^2$$
