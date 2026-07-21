---
order: 4
title: 不定积分
module: calculus
category: 高等数学
difficulty: intermediate
description: 原函数与不定积分、基本积分公式、换元积分法（第一/二类）、分部积分法、有理函数积分、三角函数积分。
author: fanquanpp
updated: '2026-06-14'
related:
  - calculus/导数与微分
  - calculus/微分中值定理
  - calculus/定积分与应用
  - calculus/多元函数微分
prerequisites: []
---

## 1. 原函数与不定积分

### 1.1 原函数

若 $F'(x) = f(x)$，则称 $F(x)$ 为 $f(x)$ 的一个**原函数**。

**原函数存在定理**：连续函数必有原函数。

**原函数的个数**：若 $F(x)$ 是 $f(x)$ 的一个原函数，则 $F(x) + C$（$C$ 为任意常数）给出了 $f(x)$ 的全部原函数。

### 1.2 不定积分的定义

$$\int f(x)\,dx = F(x) + C$$

其中 $F'(x) = f(x)$，$C$ 为积分常数。

### 1.3 不定积分的性质

$$\left[\int f(x)\,dx\right]' = f(x)$$

$$\int F'(x)\,dx = F(x) + C$$

$$\int[f(x) \pm g(x)]\,dx = \int f(x)\,dx \pm \int g(x)\,dx$$

$$\int kf(x)\,dx = k\int f(x)\,dx \quad (k \neq 0)$$

## 2. 基本积分公式

$$\int x^n\,dx = \frac{x^{n+1}}{n+1} + C \quad (n \neq -1)$$

$$\int \frac{1}{x}\,dx = \ln|x| + C$$

$$\int a^x\,dx = \frac{a^x}{\ln a} + C \quad (a > 0, a \neq 1)$$

$$\int e^x\,dx = e^x + C$$

$$\int \sin x\,dx = -\cos x + C$$

$$\int \cos x\,dx = \sin x + C$$

$$\int \sec^2 x\,dx = \tan x + C$$

$$\int \csc^2 x\,dx = -\cot x + C$$

$$\int \sec x \tan x\,dx = \sec x + C$$

$$\int \csc x \cot x\,dx = -\csc x + C$$

$$\int \frac{1}{\sqrt{1-x^2}}\,dx = \arcsin x + C$$

$$\int \frac{1}{1+x^2}\,dx = \arctan x + C$$

$$\int \frac{1}{\sqrt{a^2-x^2}}\,dx = \arcsin\frac{x}{a} + C$$

$$\int \frac{1}{a^2+x^2}\,dx = \frac{1}{a}\arctan\frac{x}{a} + C$$

$$\int \frac{1}{a^2-x^2}\,dx = \frac{1}{2a}\ln\left|\frac{a+x}{a-x}\right| + C$$

$$\int \frac{1}{x^2-a^2}\,dx = \frac{1}{2a}\ln\left|\frac{x-a}{x+a}\right| + C$$

$$\int \frac{1}{\sqrt{x^2 \pm a^2}}\,dx = \ln|x + \sqrt{x^2 \pm a^2}| + C$$

## 3. 换元积分法

### 3.1 第一类换元法（凑微分法）

设 $\int f(u)\,du = F(u) + C$，$u = \varphi(x)$ 可微，则

$$\int f[\varphi(x)]\varphi'(x)\,dx = F[\varphi(x)] + C$$

**常用凑微分**：

$$\int f(ax+b)\,dx = \frac{1}{a}\int f(ax+b)\,d(ax+b)$$

$$\int xf(x^2)\,dx = \frac{1}{2}\int f(x^2)\,d(x^2)$$

$$\int \frac{f(\ln x)}{x}\,dx = \int f(\ln x)\,d(\ln x)$$

$$\int f(e^x)e^x\,dx = \int f(e^x)\,d(e^x)$$

$$\int f(\sin x)\cos x\,dx = \int f(\sin x)\,d(\sin x)$$

**例**：求 $\int \frac{dx}{x(1+\ln x)}$。

> $$\int \frac{dx}{x(1+\ln x)} = \int \frac{d(\ln x)}{1+\ln x} = \int \frac{d(1+\ln x)}{1+\ln x} = \ln|1+\ln x| + C$$

**例**：求 $\int \frac{dx}{\sqrt{x}(1+x)}$。

> $$\int \frac{dx}{\sqrt{x}(1+x)} = 2\int \frac{d(\sqrt{x})}{1+(\sqrt{x})^2} = 2\arctan\sqrt{x} + C$$

### 3.2 第二类换元法

设 $x = \varphi(t)$ 单调可导且 $\varphi'(t) \neq 0$，则

$$\int f(x)\,dx = \int f[\varphi(t)]\varphi'(t)\,dt$$

**常用代换**：

| 被积函数含         | 代换                 | 利用                      |
| ------------------ | -------------------- | ------------------------- |
| $\sqrt{a^2 - x^2}$ | $x = a\sin t$        | $1 - \sin^2 t = \cos^2 t$ |
| $\sqrt{a^2 + x^2}$ | $x = a\tan t$        | $1 + \tan^2 t = \sec^2 t$ |
| $\sqrt{x^2 - a^2}$ | $x = a\sec t$        | $\sec^2 t - 1 = \tan^2 t$ |
| $\sqrt[n]{ax+b}$   | $t = \sqrt[n]{ax+b}$ | 有理化                    |

**例**：求 $\int \sqrt{a^2 - x^2}\,dx$（$a > 0$）。

> 设 $x = a\sin t$，$dx = a\cos t\,dt$：
> $$\int a\cos t \cdot a\cos t\,dt = a^2\int \cos^2 t\,dt = a^2\int \frac{1+\cos 2t}{2}\,dt = \frac{a^2}{2}\left(t + \frac{\sin 2t}{2}\right) + C$$
> 回代 $t = \arcsin\frac{x}{a}$，$\sin 2t = 2\sin t\cos t = \frac{2x\sqrt{a^2-x^2}}{a^2}$：
> $$= \frac{a^2}{2}\arcsin\frac{x}{a} + \frac{x\sqrt{a^2-x^2}}{2} + C$$

## 4. 分部积分法

### 4.1 公式

$$\int u\,dv = uv - \int v\,du$$

### 4.2 选 $u$ 的优先顺序（LIATE 法则）

1. **L** — 对数函数：$\ln x$，$\log_a x$
2. **I** — 反三角函数：$\arcsin x$，$\arctan x$
3. **A** — 代数函数：$x^n$，多项式
4. **T** — 三角函数：$\sin x$，$\cos x$
5. **E** — 指数函数：$e^x$，$a^x$

排在前面的选作 $u$，排在后面的与 $dx$ 凑成 $dv$。

**例**：求 $\int x e^x\,dx$。

> 设 $u = x$，$dv = e^x\,dx$，则 $du = dx$，$v = e^x$。
> $$\int x e^x\,dx = xe^x - \int e^x\,dx = xe^x - e^x + C = e^x(x-1) + C$$

**例**：求 $\int x^2 \sin x\,dx$。

> 设 $u = x^2$，$dv = \sin x\,dx$，则 $du = 2x\,dx$，$v = -\cos x$。
> $$\int x^2 \sin x\,dx = -x^2\cos x + 2\int x\cos x\,dx$$
> 再分部：$u = x$，$dv = \cos x\,dx$，$du = dx$，$v = \sin x$。
> $$= -x^2\cos x + 2(x\sin x - \int \sin x\,dx) = -x^2\cos x + 2x\sin x + 2\cos x + C$$

**例**（递推型）：求 $I_n = \int e^x \sin x\,dx$。

> 设 $u = \sin x$，$dv = e^x\,dx$，则 $du = \cos x\,dx$，$v = e^x$。
> $I = e^x\sin x - \int e^x\cos x\,dx$
> 再分部：$u = \cos x$，$dv = e^x\,dx$，$du = -\sin x\,dx$，$v = e^x$。
> $I = e^x\sin x - (e^x\cos x + \int e^x\sin x\,dx) = e^x\sin x - e^x\cos x - I$
> $2I = e^x(\sin x - \cos x)$，$I = \frac{e^x(\sin x - \cos x)}{2} + C$

## 5. 有理函数积分

### 5.1 部分分式分解

设 $\frac{P(x)}{Q(x)}$ 为有理函数（$P$, $Q$ 为多项式），先做多项式除法化为真分式，再对分母因式分解后拆分。

**分解规则**：

| 分母因式               | 对应部分分式                                                           |
| ---------------------- | ---------------------------------------------------------------------- |
| $(x-a)$                | $\frac{A}{x-a}$                                                        |
| $(x-a)^k$              | $\frac{A_1}{x-a} + \frac{A_2}{(x-a)^2} + \cdots + \frac{A_k}{(x-a)^k}$ |
| $(x^2+px+q)$（不可约） | $\frac{Ax+B}{x^2+px+q}$                                                |
| $(x^2+px+q)^k$         | $\frac{A_1x+B_1}{x^2+px+q} + \cdots + \frac{A_kx+B_k}{(x^2+px+q)^k}$   |

**例**：求 $\int \frac{dx}{x^2 - 5x + 6}$。

> $\frac{1}{x^2-5x+6} = \frac{1}{(x-2)(x-3)} = \frac{A}{x-2} + \frac{B}{x-3}$
> $1 = A(x-3) + B(x-2)$，令 $x=2$：$A=-1$；令 $x=3$：$B=1$。
> $$\int \frac{dx}{x^2-5x+6} = -\int\frac{dx}{x-2} + \int\frac{dx}{x-3} = -\ln|x-2| + \ln|x-3| + C = \ln\left|\frac{x-3}{x-2}\right| + C$$

## 6. 三角函数积分

### 6.1 $\int \sin^m x \cos^n x\,dx$

- $m$ 为奇数：设 $u = \cos x$，提出 $\sin x\,dx = -du$
- $n$ 为奇数：设 $u = \sin x$，提出 $\cos x\,dx = du$
- $m$, $n$ 均为偶数：用半角公式降幂

**例**：求 $\int \sin^3 x\,dx$。

> $\int \sin^3 x\,dx = \int \sin^2 x \cdot \sin x\,dx = -\int(1-\cos^2 x)\,d(\cos x) = -\cos x + \frac{\cos^3 x}{3} + C$

### 6.2 万能代换

对 $\int R(\sin x, \cos x)\,dx$，设 $t = \tan\frac{x}{2}$，则

$$\sin x = \frac{2t}{1+t^2}, \quad \cos x = \frac{1-t^2}{1+t^2}, \quad dx = \frac{2}{1+t^2}\,dt$$

**例**：求 $\int \frac{dx}{1+\sin x}$。

> 设 $t = \tan\frac{x}{2}$：
> $$\int \frac{\frac{2\,dt}{1+t^2}}{1+\frac{2t}{1+t^2}} = \int \frac{2\,dt}{(1+t)^2} = -\frac{2}{1+t} + C = -\frac{2}{1+\tan\frac{x}{2}} + C$$
