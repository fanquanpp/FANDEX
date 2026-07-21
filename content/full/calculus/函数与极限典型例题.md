---
order: 91
title: 函数与极限典型例题
module: calculus
category: 'comp-sci'
difficulty: intermediate
description: 函数与极限15道典型例题：极限计算、等价无穷小、连续性判断等核心题型详解。
author: fanquanpp
updated: '2026-06-14'
related:
  - calculus/公式速查表
  - calculus/无穷级数与常微分方程
  - calculus/导数与微分典型例题
  - calculus/微分中值定理典型例题
prerequisites:
  - calculus/函数与极限
---

## 1. 利用等价无穷小求极限

**例1**：求 $\lim_{x \to 0} \frac{e^x - 1 - x}{x^2}$

**解**：利用泰勒展开 $e^x = 1 + x + \frac{x^2}{2} + o(x^2)$

$$\lim_{x \to 0} \frac{e^x - 1 - x}{x^2} = \lim_{x \to 0} \frac{\frac{x^2}{2} + o(x^2)}{x^2} = \frac{1}{2}$$

---

**例2**：求 $\lim_{x \to 0} \frac{\tan x - \sin x}{x^3}$

**解**：

$$\tan x - \sin x = \sin x\left(\frac{1}{\cos x} - 1\right) = \sin x \cdot \frac{1 - \cos x}{\cos x}$$

当 $x \to 0$ 时：$\sin x \sim x$，$1 - \cos x \sim \frac{x^2}{2}$，$\cos x \to 1$

$$\lim_{x \to 0} \frac{\tan x - \sin x}{x^3} = \lim_{x \to 0} \frac{x \cdot \frac{x^2}{2}}{x^3 \cdot 1} = \frac{1}{2}$$

## 2. 洛必达法则应用

**例3**：求 $\lim_{x \to 0} \frac{x - \sin x}{x^3}$

**解**：$\frac{0}{0}$ 型，使用洛必达法则：

$$\lim_{x \to 0} \frac{x - \sin x}{x^3} = \lim_{x \to 0} \frac{1 - \cos x}{3x^2} = \lim_{x \to 0} \frac{\sin x}{6x} = \frac{1}{6}$$

---

**例4**：求 $\lim_{x \to +\infty} \frac{x^n}{e^x}$（$n$ 为正整数）

**解**：连续使用洛必达法则 $n$ 次：

$$\lim_{x \to +\infty} \frac{x^n}{e^x} = \lim_{x \to +\infty} \frac{nx^{n-1}}{e^x} = \cdots = \lim_{x \to +\infty} \frac{n!}{e^x} = 0$$

**结论**：指数函数增长远快于幂函数。

## 3. 两个重要极限

**例5**：求 $\lim_{x \to 0} \frac{\sin 5x}{\tan 3x}$

**解**：

$$\lim_{x \to 0} \frac{\sin 5x}{\tan 3x} = \lim_{x \to 0} \frac{\sin 5x}{5x} \cdot \frac{3x}{\sin 3x} \cdot \frac{5x}{3x} \cdot \frac{\cos 3x}{1} = 1 \cdot 1 \cdot \frac{5}{3} \cdot 1 = \frac{5}{3}$$

---

**例6**：求 $\lim_{x \to \infty} \left(\frac{x+1}{x-1}\right)^x$

**解**：

$$\left(\frac{x+1}{x-1}\right)^x = \left(1 + \frac{2}{x-1}\right)^x = \left[\left(1 + \frac{2}{x-1}\right)^{\frac{x-1}{2}}\right]^{\frac{2x}{x-1}}$$

当 $x \to \infty$ 时，$\frac{2x}{x-1} \to 2$，所以：

$$\lim_{x \to \infty} \left(\frac{x+1}{x-1}\right)^x = e^2$$

## 4. 夹逼准则

**例7**：求 $\lim_{n \to \infty} \left(\frac{1}{\sqrt{n^2+1}} + \frac{1}{\sqrt{n^2+2}} + \cdots + \frac{1}{\sqrt{n^2+n}}\right)$

**解**：设 $S_n = \sum_{k=1}^{n} \frac{1}{\sqrt{n^2+k}}$

$$\frac{n}{\sqrt{n^2+n}} \leq S_n \leq \frac{n}{\sqrt{n^2+1}}$$

$$\lim_{n \to \infty} \frac{n}{\sqrt{n^2+n}} = \lim_{n \to \infty} \frac{1}{\sqrt{1+\frac{1}{n}}} = 1$$

$$\lim_{n \to \infty} \frac{n}{\sqrt{n^2+1}} = \lim_{n \to \infty} \frac{1}{\sqrt{1+\frac{1}{n^2}}} = 1$$

由夹逼准则：$\lim_{n \to \infty} S_n = 1$

## 5. 函数连续性

**例8**：讨论 $f(x) = \begin{cases} x^2 \sin\frac{1}{x} & x \neq 0 \\ 0 & x = 0 \end{cases}$ 在 $x=0$ 处的连续性与可导性。

**解**：

**连续性**：$\lim_{x \to 0} x^2 \sin\frac{1}{x} = 0 = f(0)$（因为 $|x^2 \sin\frac{1}{x}| \leq x^2 \to 0$），故连续。

**可导性**：

$$f'(0) = \lim_{x \to 0} \frac{f(x) - f(0)}{x-0} = \lim_{x \to 0} \frac{x^2 \sin\frac{1}{x}}{x} = \lim_{x \to 0} x \sin\frac{1}{x} = 0$$

故 $f(x)$ 在 $x=0$ 处可导，$f'(0) = 0$。

---

**例9**：设 $f(x) = \begin{cases} \frac{\sin 2x}{x} & x < 0 \\ a & x = 0 \\ x^2 + b & x > 0 \end{cases}$，求 $a, b$ 使 $f(x)$ 在 $x=0$ 连续。

**解**：

$$\lim_{x \to 0^-} f(x) = \lim_{x \to 0^-} \frac{\sin 2x}{x} = 2$$

$$\lim_{x \to 0^+} f(x) = \lim_{x \to 0^+} (x^2 + b) = b$$

连续要求 $\lim_{x \to 0^-} f(x) = \lim_{x \to 0^+} f(x) = f(0)$，即 $b = a = 2$。

## 6. 间断点分类

**例10**：求 $f(x) = \frac{x^2 - 1}{x^2 - 3x + 2}$ 的间断点并分类。

**解**：分母 $x^2 - 3x + 2 = (x-1)(x-2) = 0$，得 $x=1$ 或 $x=2$。

在 $x=1$ 处：

$$\lim_{x \to 1} \frac{x^2-1}{(x-1)(x-2)} = \lim_{x \to 1} \frac{(x+1)}{(x-2)} = \frac{2}{-1} = -2$$

极限存在但不等于函数值（函数无定义），故 $x=1$ 为**可去间断点**。

在 $x=2$ 处：

$$\lim_{x \to 2} \frac{x^2-1}{(x-1)(x-2)} = \lim_{x \to 2} \frac{x+1}{x-2}$$

左极限 $-\infty$，右极限 $+\infty$，故 $x=2$ 为**无穷间断点**。

## 7. 综合题型

**例11**：已知 $\lim_{x \to 0} \frac{\sin 6x + xf(x)}{x^3} = 0$，求 $\lim_{x \to 0} \frac{6 + f(x)}{x^2}$。

**解**：由条件 $\lim_{x \to 0} \frac{\sin 6x + xf(x)}{x^3} = 0$

$$\sin 6x = 6x - \frac{(6x)^3}{6} + o(x^3) = 6x - 36x^3 + o(x^3)$$

$$\frac{\sin 6x + xf(x)}{x^3} = \frac{6x - 36x^3 + xf(x) + o(x^3)}{x^3} = \frac{6 + f(x)}{x^2} - 36 + o(1)$$

由极限为 0：$\lim_{x \to 0} \frac{6+f(x)}{x^2} = 36$

---

**例12**：设 $\lim_{x \to \infty} \left(\frac{x^2+1}{x+1} - ax - b\right) = 0$，求 $a, b$。

**解**：

$$\frac{x^2+1}{x+1} - ax - b = \frac{x^2+1 - (ax+b)(x+1)}{x+1} = \frac{(1-a)x^2 - (a+b)x + (1-b)}{x+1}$$

极限为 0，要求分子最高次不超过分母，故：

$1 - a = 0 \Rightarrow a = 1$

$a + b = 0 \Rightarrow b = -1$

验证：$\frac{0 \cdot x^2 - 0 \cdot x + 2}{x+1} \to 0$

---

**例13**：求 $\lim_{x \to 0} \left(\frac{1+\tan x}{1+\sin x}\right)^{\frac{1}{\sin x}}$

**解**：取对数：

$$\lim_{x \to 0} \frac{\ln(1+\tan x) - \ln(1+\sin x)}{\sin x}$$

$$= \lim_{x \to 0} \frac{\ln(1+\tan x)}{\sin x} - \lim_{x \to 0} \frac{\ln(1+\sin x)}{\sin x}$$

$$= \lim_{x \to 0} \frac{\tan x}{\sin x} - 1 = \lim_{x \to 0} \frac{1}{\cos x} - 1 = 0$$

故原极限 $= e^0 = 1$。

---

**例14**：证明：$\lim_{n \to \infty} \sqrt[n]{n} = 1$

**证明**：令 $\sqrt[n]{n} = 1 + h_n$（$h_n > 0$），则：

$$n = (1+h_n)^n \geq \binom{n}{2}h_n^2 = \frac{n(n-1)}{2}h_n^2$$

$$h_n^2 \leq \frac{2}{n-1} \Rightarrow h_n \leq \sqrt{\frac{2}{n-1}} \to 0$$

故 $\lim_{n \to \infty} \sqrt[n]{n} = 1$。

---

**例15**：设 $x_1 = \sqrt{2}$，$x_{n+1} = \sqrt{2 + x_n}$，证明 $\{x_n\}$ 收敛并求极限。

**解**：

**单调性**：$x_1 = \sqrt{2}$，$x_2 = \sqrt{2+\sqrt{2}} > \sqrt{2} = x_1$。设 $x_n < x_{n+1}$，则 $x_{n+1} = \sqrt{2+x_n} < \sqrt{2+x_{n+1}} = x_{n+2}$，故单调递增。

**有界性**：$x_1 = \sqrt{2} < 2$。设 $x_n < 2$，则 $x_{n+1} = \sqrt{2+x_n} < \sqrt{4} = 2$，故有上界 2。

由单调有界原理，$\{x_n\}$ 收敛。设 $\lim_{n \to \infty} x_n = L$，则：

$$L = \sqrt{2+L} \Rightarrow L^2 = 2+L \Rightarrow L^2 - L - 2 = 0 \Rightarrow L = 2$$

（舍去 $L = -1$，因为 $x_n > 0$）
