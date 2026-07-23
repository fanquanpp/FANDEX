---
order: 90
title: 公式速查表
module: calculus
category: 'comp-sci'
difficulty: intermediate
description: 高等数学全部核心公式速查：极限、导数、积分、级数、微分方程等公式汇总。
author: fanquanpp
updated: '2026-06-14'
related:
  - calculus/重积分
  - calculus/曲线积分与曲面积分
  - calculus/无穷级数与常微分方程
  - calculus/函数与极限典型例题
prerequisites:
  - calculus/函数与极限
---

## 1. 极限公式

### 1.1 基本极限

$$\lim_{x \to 0} \frac{\sin x}{x} = 1$$

$$\lim_{x \to \infty} \left(1 + \frac{1}{x}\right)^x = e$$

$$\lim_{x \to 0} \frac{e^x - 1}{x} = 1$$

$$\lim_{x \to 0} \frac{\ln(1+x)}{x} = 1$$

$$\lim_{x \to 0} \frac{(1+x)^a - 1}{x} = a$$

### 1.2 等价无穷小（$x \to 0$）

| 原式            | 等价            |
| --------------- | --------------- |
| $\sin x$        | $x$             |
| $\tan x$        | $x$             |
| $\arcsin x$     | $x$             |
| $\arctan x$     | $x$             |
| $1 - \cos x$    | $\frac{x^2}{2}$ |
| $e^x - 1$       | $x$             |
| $\ln(1+x)$      | $x$             |
| $(1+x)^a - 1$   | $ax$            |
| $x - \sin x$    | $\frac{x^3}{6}$ |
| $\tan x - x$    | $\frac{x^3}{3}$ |
| $x - \ln(1+x)$  | $\frac{x^2}{2}$ |
| $x - \arctan x$ | $\frac{x^3}{3}$ |

### 1.3 极限运算法则

若 $\lim f(x) = A$，$\lim g(x) = B$，则：

$$\lim[f(x) \pm g(x)] = A \pm B$$

$$\lim[f(x) \cdot g(x)] = A \cdot B$$

$$\lim \frac{f(x)}{g(x)} = \frac{A}{B} \quad (B \neq 0)$$

### 1.4 洛必达法则

对于 $\frac{0}{0}$ 或 $\frac{\infty}{\infty}$ 型未定式：

$$\lim \frac{f(x)}{g(x)} = \lim \frac{f'(x)}{g'(x)}$$

（若右端极限存在或为无穷大）

## 2. 导数与微分公式

### 2.1 基本求导公式

| 函数 $f(x)$         | 导数 $f'(x)$              |
| ------------------- | ------------------------- |
| $c$（常数）         | $0$                       |
| $x^n$               | $nx^{n-1}$                |
| $a^x$               | $a^x \ln a$               |
| $e^x$               | $e^x$                     |
| $\log_a x$          | $\frac{1}{x \ln a}$       |
| $\ln x$             | $\frac{1}{x}$             |
| $\sin x$            | $\cos x$                  |
| $\cos x$            | $-\sin x$                 |
| $\tan x$            | $\sec^2 x$                |
| $\cot x$            | $-\csc^2 x$               |
| $\sec x$            | $\sec x \tan x$           |
| $\csc x$            | $-\csc x \cot x$          |
| $\arcsin x$         | $\frac{1}{\sqrt{1-x^2}}$  |
| $\arccos x$         | $-\frac{1}{\sqrt{1-x^2}}$ |
| $\arctan x$         | $\frac{1}{1+x^2}$         |
| $\text{arccot}\, x$ | $-\frac{1}{1+x^2}$        |

### 2.2 求导法则

**四则运算**：

$$(u \pm v)' = u' \pm v'$$

$$(uv)' = u'v + uv'$$

$$\left(\frac{u}{v}\right)' = \frac{u'v - uv'}{v^2}$$

**链式法则**：

$$[f(g(x))]' = f'(g(x)) \cdot g'(x)$$

**反函数求导**：

$$[f^{-1}]'(y) = \frac{1}{f'(x)}$$

**参数方程求导**：

$$\frac{dy}{dx} = \frac{dy/dt}{dx/dt}$$

**隐函数求导**：

$$F(x,y) = 0 \Rightarrow \frac{dy}{dx} = -\frac{F_x}{F_y}$$

**对数求导法**：

$$y = u(x)^{v(x)} \Rightarrow \ln y = v(x)\ln u(x) \Rightarrow \frac{y'}{y} = v'\ln u + v \cdot \frac{u'}{u}$$

### 2.3 高阶导数

**莱布尼茨公式**：

$$(uv)^{(n)} = \sum_{k=0}^{n} \binom{n}{k} u^{(n-k)} v^{(k)}$$

**常用高阶导数**：

$$(x^n)^{(n)} = n!$$

$$(e^x)^{(n)} = e^x$$

$$(\sin x)^{(n)} = \sin\left(x + \frac{n\pi}{2}\right)$$

$$(\cos x)^{(n)} = \cos\left(x + \frac{n\pi}{2}\right)$$

$$(\ln x)^{(n)} = \frac{(-1)^{n-1}(n-1)!}{x^n}$$

### 2.4 微分

$$dy = f'(x)dx$$

**微分形式不变性**：无论 $u$ 是自变量还是中间变量，$dy = f'(u)du$ 均成立。

## 3. 微分中值定理

### 3.1 三大中值定理

**罗尔定理**：若 $f(x)$ 在 $[a,b]$ 连续、$(a,b)$ 可导、$f(a)=f(b)$，则 $\exists \xi \in (a,b)$ 使 $f'(\xi) = 0$。

**拉格朗日中值定理**：

$$f(b) - f(a) = f'(\xi)(b-a), \quad \xi \in (a,b)$$

**柯西中值定理**：

$$\frac{f(b)-f(a)}{g(b)-g(a)} = \frac{f'(\xi)}{g'(\xi)}, \quad \xi \in (a,b)$$

### 3.2 泰勒公式

**带拉格朗日余项**：

$$f(x) = \sum_{k=0}^{n} \frac{f^{(k)}(x_0)}{k!}(x-x_0)^k + \frac{f^{(n+1)}(\xi)}{(n+1)!}(x-x_0)^{n+1}$$

**常用麦克劳林展开**（$x_0 = 0$）：

$$e^x = 1 + x + \frac{x^2}{2!} + \frac{x^3}{3!} + \cdots$$

$$\sin x = x - \frac{x^3}{3!} + \frac{x^5}{5!} - \cdots$$

$$\cos x = 1 - \frac{x^2}{2!} + \frac{x^4}{4!} - \cdots$$

$$\ln(1+x) = x - \frac{x^2}{2} + \frac{x^3}{3} - \cdots \quad (|x| < 1)$$

$$\frac{1}{1-x} = 1 + x + x^2 + x^3 + \cdots \quad (|x| < 1)$$

$$(1+x)^a = 1 + ax + \frac{a(a-1)}{2!}x^2 + \cdots \quad (|x| < 1)$$

## 4. 不定积分公式

### 4.1 基本积分表

$$\int x^n dx = \frac{x^{n+1}}{n+1} + C \quad (n \neq -1)$$

$$\int \frac{1}{x} dx = \ln|x| + C$$

$$\int a^x dx = \frac{a^x}{\ln a} + C$$

$$\int e^x dx = e^x + C$$

$$\int \sin x\, dx = -\cos x + C$$

$$\int \cos x\, dx = \sin x + C$$

$$\int \tan x\, dx = -\ln|\cos x| + C$$

$$\int \cot x\, dx = \ln|\sin x| + C$$

$$\int \sec x\, dx = \ln|\sec x + \tan x| + C$$

$$\int \csc x\, dx = \ln|\csc x - \cot x| + C$$

$$\int \sec^2 x\, dx = \tan x + C$$

$$\int \csc^2 x\, dx = -\cot x + C$$

$$\int \frac{dx}{\sqrt{a^2-x^2}} = \arcsin\frac{x}{a} + C$$

$$\int \frac{dx}{a^2+x^2} = \frac{1}{a}\arctan\frac{x}{a} + C$$

$$\int \frac{dx}{\sqrt{x^2 \pm a^2}} = \ln|x + \sqrt{x^2 \pm a^2}| + C$$

$$\int \frac{dx}{x^2-a^2} = \frac{1}{2a}\ln\left|\frac{x-a}{x+a}\right| + C$$

### 4.2 积分方法

**分部积分**：

$$\int u\, dv = uv - \int v\, du$$

**第一换元（凑微分）**：

$$\int f[\varphi(x)]\varphi'(x)\,dx = \int f(u)\,du \quad (u = \varphi(x))$$

**第二换元**：

$$\int f(x)\,dx = \int f[\psi(t)]\psi'(t)\,dt \quad (x = \psi(t))$$

**有理函数积分**：部分分式分解后逐项积分。

## 5. 定积分公式

### 5.1 牛顿-莱布尼茨公式

$$\int_a^b f(x)\,dx = F(b) - F(a)$$

### 5.2 定积分性质

$$\int_a^b f(x)\,dx = -\int_b^a f(x)\,dx$$

$$\int_a^b [\alpha f(x) + \beta g(x)]\,dx = \alpha\int_a^b f(x)\,dx + \beta\int_a^b g(x)\,dx$$

$$\int_a^b f(x)\,dx = \int_a^c f(x)\,dx + \int_c^b f(x)\,dx$$

**估值定理**：

$$m(b-a) \leq \int_a^b f(x)\,dx \leq M(b-a)$$

### 5.3 华里士公式

$$\int_0^{\pi/2} \sin^n x\,dx = \int_0^{\pi/2} \cos^n x\,dx = \begin{cases} \frac{n-1}{n} \cdot \frac{n-3}{n-2} \cdots \frac{1}{2} \cdot \frac{\pi}{2} & n \text{ 为偶数} \\ \frac{n-1}{n} \cdot \frac{n-3}{n-2} \cdots \frac{2}{3} \cdot 1 & n \text{ 为奇数} \end{cases}$$

### 5.4 反常积分

$$\int_a^{+\infty} f(x)\,dx = \lim_{b \to +\infty} \int_a^b f(x)\,dx$$

**p 积分**：

$$\int_1^{+\infty} \frac{dx}{x^p} \quad \text{收敛当且仅当 } p > 1$$

$$\int_0^1 \frac{dx}{x^p} \quad \text{收敛当且仅当 } p < 1$$

### 5.5 定积分应用

**旋转体体积**：

$$V = \pi \int_a^b [f(x)]^2\,dx$$

**弧长**：

$$s = \int_a^b \sqrt{1 + [f'(x)]^2}\,dx$$

**曲率**：

$$K = \frac{|y''|}{(1+y'^2)^{3/2}}$$

## 6. 多元函数微分

### 6.1 偏导数与全微分

$$dz = \frac{\partial z}{\partial x}dx + \frac{\partial z}{\partial y}dy$$

### 6.2 链式法则

$$\frac{\partial z}{\partial u} = \frac{\partial z}{\partial x}\frac{\partial x}{\partial u} + \frac{\partial z}{\partial y}\frac{\partial y}{\partial u}$$

### 6.3 方向导数与梯度

$$\frac{\partial f}{\partial l} = \nabla f \cdot \mathbf{l}^0 = f_x \cos\alpha + f_y \cos\beta$$

$$\nabla f = \left(\frac{\partial f}{\partial x}, \frac{\partial f}{\partial y}\right)$$

### 6.4 极值判定

**必要条件**：$f_x(x_0,y_0) = 0$，$f_y(x_0,y_0) = 0$

**充分条件**：令 $A = f_{xx}$，$B = f_{xy}$，$C = f_{yy}$，$\Delta = AC - B^2$

- $\Delta > 0$，$A < 0$：极大值
- $\Delta > 0$，$A > 0$：极小值
- $\Delta < 0$：鞍点
- $\Delta = 0$：无法判定

### 6.5 拉格朗日乘数法

$$L(x,y,\lambda) = f(x,y) + \lambda \varphi(x,y)$$

$$\frac{\partial L}{\partial x} = 0, \quad \frac{\partial L}{\partial y} = 0, \quad \frac{\partial L}{\partial \lambda} = 0$$

## 7. 重积分

### 7.1 二重积分

**直角坐标**：

$$\iint_D f(x,y)\,d\sigma = \int_a^b dx \int_{\varphi_1(x)}^{\varphi_2(x)} f(x,y)\,dy$$

**极坐标**：

$$\iint_D f(x,y)\,d\sigma = \int_\alpha^\beta d\theta \int_{r_1(\theta)}^{r_2(\theta)} f(r\cos\theta, r\sin\theta) \cdot r\,dr$$

### 7.2 三重积分

**柱坐标**：

$$\iiint_\Omega f\,dV = \int_\alpha^\beta d\theta \int_{r_1(\theta)}^{r_2(\theta)} r\,dr \int_{z_1(r,\theta)}^{z_2(r,\theta)} f(r\cos\theta, r\sin\theta, z)\,dz$$

**球坐标**：

$$\iiint_\Omega f\,dV = \int_0^{2\pi} d\theta \int_0^\pi d\varphi \int_0^R f(r\sin\varphi\cos\theta, r\sin\varphi\sin\theta, r\cos\varphi) \cdot r^2\sin\varphi\,dr$$

## 8. 曲线积分与曲面积分

### 8.1 第一类曲线积分

$$\int_L f(x,y)\,ds = \int_\alpha^\beta f[x(t),y(t)]\sqrt{x'^2(t)+y'^2(t)}\,dt$$

### 8.2 第二类曲线积分

$$\int_L P\,dx + Q\,dy = \int_\alpha^\beta [Px'(t) + Qy'(t)]\,dt$$

**格林公式**：

$$\oint_L P\,dx + Q\,dy = \iint_D \left(\frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y}\right) dxdy$$

### 8.3 第一类曲面积分

$$\iint_\Sigma f\,dS = \iint_{D_{xy}} f[x,y,z(x,y)]\sqrt{1+z_x^2+z_y^2}\,dxdy$$

### 8.4 第二类曲面积分

**高斯公式**：

$$\oiint_\Sigma P\,dydz + Q\,dzdx + R\,dxdy = \iiint_\Omega \left(\frac{\partial P}{\partial x} + \frac{\partial Q}{\partial y} + \frac{\partial R}{\partial z}\right) dV$$

**斯托克斯公式**：

$$\oint_\Gamma P\,dx + Q\,dy + R\,dz = \iint_\Sigma \begin{vmatrix} dydz & dzdx & dxdy \\ \frac{\partial}{\partial x} & \frac{\partial}{\partial y} & \frac{\partial}{\partial z} \\ P & Q & R \end{vmatrix}$$

## 9. 无穷级数

### 9.1 常数项级数审敛法

**比值审敛法**：

$$\lim_{n\to\infty} \frac{a_{n+1}}{a_n} = \rho \Rightarrow \begin{cases} \rho < 1 & \text{收敛} \\ \rho > 1 & \text{发散} \\ \rho = 1 & \text{不确定} \end{cases}$$

**根值审敛法**：

$$\lim_{n\to\infty} \sqrt[n]{a_n} = \rho \Rightarrow \text{同上}$$

### 9.2 幂级数

**收敛半径**：

$$R = \lim_{n\to\infty} \left|\frac{a_n}{a_{n+1}}\right|$$

### 9.3 傅里叶级数

$$f(x) = \frac{a_0}{2} + \sum_{n=1}^{\infty}\left(a_n \cos\frac{n\pi x}{l} + b_n \sin\frac{n\pi x}{l}\right)$$

$$a_n = \frac{1}{l}\int_{-l}^{l} f(x)\cos\frac{n\pi x}{l}\,dx, \quad b_n = \frac{1}{l}\int_{-l}^{l} f(x)\sin\frac{n\pi x}{l}\,dx$$

## 10. 常微分方程

### 10.1 一阶微分方程

**可分离变量**：

$$\frac{dy}{dx} = f(x)g(y) \Rightarrow \int \frac{dy}{g(y)} = \int f(x)\,dx$$

**齐次方程**：

$$\frac{dy}{dx} = \varphi\left(\frac{y}{x}\right) \xrightarrow{u=y/x} x\frac{du}{dx} = \varphi(u) - u$$

**一阶线性**：

$$y' + P(x)y = Q(x) \Rightarrow y = e^{-\int P\,dx}\left[\int Q e^{\int P\,dx}\,dx + C\right]$$

### 10.2 二阶常系数线性方程

$$y'' + py' + qy = 0$$

特征方程 $r^2 + pr + q = 0$：

| 判别式       | 特征根                   | 通解                                                  |
| ------------ | ------------------------ | ----------------------------------------------------- |
| $\Delta > 0$ | $r_1 \neq r_2$（实根）   | $y = C_1 e^{r_1 x} + C_2 e^{r_2 x}$                   |
| $\Delta = 0$ | $r_1 = r_2 = r$          | $y = (C_1 + C_2 x)e^{rx}$                             |
| $\Delta < 0$ | $r = \alpha \pm \beta i$ | $y = e^{\alpha x}(C_1 \cos\beta x + C_2 \sin\beta x)$ |
