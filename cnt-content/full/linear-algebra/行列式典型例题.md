---
order: 15
title: 行列式典型例题
module: 'linear-algebra'
category: 'comp-sci'
difficulty: intermediate
description: 行列式计算与证明的典型例题集锦，涵盖化上三角、范德蒙德、递推法、加边法、抽象行列式等题型。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'linear-algebra/行列式计算方法'
  - 'linear-algebra/克莱姆法则'
  - 'linear-algebra/矩阵运算'
  - 'linear-algebra/逆矩阵'
prerequisites: []
---

## 1. 化上三角法

### 例1

计算 $\begin{vmatrix} 1 & 1 & 1 & 1 \\ 1 & 2 & 3 & 4 \\ 1 & 4 & 9 & 16 \\ 1 & 8 & 27 & 64 \end{vmatrix}$

**解**：这是范德蒙德行列式，$x_1 = 1, x_2 = 2, x_3 = 3, x_4 = 4$。

$$D = \prod_{1 \leq j < i \leq 4}(x_i - x_j) = (2-1)(3-1)(4-1)(3-2)(4-2)(4-3) = 1 \times 2 \times 3 \times 1 \times 2 \times 1 = 12$$

### 例2

计算 $\begin{vmatrix} 3 & 1 & 1 & 1 \\ 1 & 3 & 1 & 1 \\ 1 & 1 & 3 & 1 \\ 1 & 1 & 1 & 3 \end{vmatrix}$

**解**：各行之和为 $6$，将第 2、3、4 列加到第 1 列：

$$D = \begin{vmatrix} 6 & 1 & 1 & 1 \\ 6 & 3 & 1 & 1 \\ 6 & 1 & 3 & 1 \\ 6 & 1 & 1 & 3 \end{vmatrix} = 6 \begin{vmatrix} 1 & 1 & 1 & 1 \\ 1 & 3 & 1 & 1 \\ 1 & 1 & 3 & 1 \\ 1 & 1 & 1 & 3 \end{vmatrix}$$

各行减第一行：

$$= 6 \begin{vmatrix} 1 & 1 & 1 & 1 \\ 0 & 2 & 0 & 0 \\ 0 & 0 & 2 & 0 \\ 0 & 0 & 0 & 2 \end{vmatrix} = 6 \times 1 \times 2 \times 2 \times 2 = 48$$

## 2. 递推法

### 例3

计算 $D_n = \begin{vmatrix} 2 & 1 & 0 & \cdots & 0 & 0 \\ 1 & 2 & 1 & \cdots & 0 & 0 \\ 0 & 1 & 2 & \cdots & 0 & 0 \\ \vdots & \vdots & \vdots & \ddots & \vdots & \vdots \\ 0 & 0 & 0 & \cdots & 2 & 1 \\ 0 & 0 & 0 & \cdots & 1 & 2 \end{vmatrix}$

**解**：按第一行展开：

$$D_n = 2D_{n-1} - 1 \cdot \begin{vmatrix} 1 & 1 & 0 & \cdots & 0 \\ 0 & 2 & 1 & \cdots & 0 \\ \vdots & \vdots & \vdots & \ddots & \vdots \\ 0 & 0 & 0 & \cdots & 2 \end{vmatrix} = 2D_{n-1} - D_{n-2}$$

即 $D_n - 2D_{n-1} + D_{n-2} = 0$，特征方程 $t^2 - 2t + 1 = 0$，$(t-1)^2 = 0$。

通解 $D_n = (C_1 + C_2 n) \cdot 1^n = C_1 + C_2 n$。

由 $D_1 = 2$，$D_2 = \begin{vmatrix} 2 & 1 \\ 1 & 2 \end{vmatrix} = 3$，得 $C_1 + C_2 = 2$，$C_1 + 2C_2 = 3$，解得 $C_1 = C_2 = 1$。

故 $D_n = n + 1$。

### 例4

计算 $D_n = \begin{vmatrix} a & b & b & \cdots & b \\ b & a & b & \cdots & b \\ b & b & a & \cdots & b \\ \vdots & \vdots & \vdots & \ddots & \vdots \\ b & b & b & \cdots & a \end{vmatrix}$

**解**：各行加到第一行，提取公因子 $a + (n-1)b$：

$$D_n = [a + (n-1)b] \begin{vmatrix} 1 & 1 & 1 & \cdots & 1 \\ b & a & b & \cdots & b \\ b & b & a & \cdots & b \\ \vdots & \vdots & \vdots & \ddots & \vdots \\ b & b & b & \cdots & a \end{vmatrix}$$

各行减第一行的 $b$ 倍：

$$= [a + (n-1)b] \begin{vmatrix} 1 & 1 & 1 & \cdots & 1 \\ 0 & a-b & 0 & \cdots & 0 \\ 0 & 0 & a-b & \cdots & 0 \\ \vdots & \vdots & \vdots & \ddots & \vdots \\ 0 & 0 & 0 & \cdots & a-b \end{vmatrix}$$

$$= [a + (n-1)b](a-b)^{n-1}$$

## 3. 加边法

### 例5

计算 $D_n = \begin{vmatrix} 1+a_1 & 1 & \cdots & 1 \\ 1 & 1+a_2 & \cdots & 1 \\ \vdots & \vdots & \ddots & \vdots \\ 1 & 1 & \cdots & 1+a_n \end{vmatrix}$（$a_i \neq 0$）

**解**：加边升阶：

$$D_n = \begin{vmatrix} 1 & 1 & 1 & \cdots & 1 \\ 0 & 1+a_1 & 1 & \cdots & 1 \\ 0 & 1 & 1+a_2 & \cdots & 1 \\ \vdots & \vdots & \vdots & \ddots & \vdots \\ 0 & 1 & 1 & \cdots & 1+a_n \end{vmatrix}$$

第一行乘 $(-1)$ 加到各行：

$$= \begin{vmatrix} 1 & 1 & 1 & \cdots & 1 \\ -1 & a_1 & 0 & \cdots & 0 \\ -1 & 0 & a_2 & \cdots & 0 \\ \vdots & \vdots & \vdots & \ddots & \vdots \\ -1 & 0 & 0 & \cdots & a_n \end{vmatrix}$$

第 $j+1$ 列乘 $\dfrac{1}{a_j}$ 加到第一列（$j = 1, 2, \ldots, n$）：

$$= \begin{vmatrix} 1 + \sum_{j=1}^{n}\frac{1}{a_j} & 1 & 1 & \cdots & 1 \\ 0 & a_1 & 0 & \cdots & 0 \\ 0 & 0 & a_2 & \cdots & 0 \\ \vdots & \vdots & \vdots & \ddots & \vdots \\ 0 & 0 & 0 & \cdots & a_n \end{vmatrix} = \left(1 + \sum_{j=1}^{n}\frac{1}{a_j}\right) \prod_{i=1}^{n} a_i$$

## 4. 拆行（列）法

### 例6

计算 $\begin{vmatrix} 1+a & b & c \\ b & 1+b & c \\ a & b & 1+c \end{vmatrix}$

**解**：将第一列拆为 $(1,0,0)^T + (a,b,a)^T$：

$$D = \begin{vmatrix} 1 & b & c \\ 0 & 1+b & c \\ 0 & b & 1+c \end{vmatrix} + \begin{vmatrix} a & b & c \\ b & 1+b & c \\ a & b & 1+c \end{vmatrix}$$

$$= [(1+b)(1+c) - bc] + a\begin{vmatrix} 1 & b & c \\ 0 & 1 & 0 \\ 0 & 0 & 1 \end{vmatrix} = (1+b+c) + a = 1 + a + b + c$$

## 5. 抽象行列式

### 例7

设 $A$ 为三阶方阵，$|A| = \dfrac{1}{2}$，求 $|(3A)^{-1} - 2A^*|$。

**解**：

$A^* = |A|A^{-1} = \dfrac{1}{2}A^{-1}$

$(3A)^{-1} = \dfrac{1}{3}A^{-1}$

$$(3A)^{-1} - 2A^* = \frac{1}{3}A^{-1} - 2 \cdot \frac{1}{2}A^{-1} = \frac{1}{3}A^{-1} - A^{-1} = -\frac{2}{3}A^{-1}$$

$$|(3A)^{-1} - 2A^*| = \left|-\frac{2}{3}A^{-1}\right| = \left(-\frac{2}{3}\right)^3 |A^{-1}| = -\frac{8}{27} \cdot \frac{1}{|A|} = -\frac{8}{27} \cdot 2 = -\frac{16}{27}$$

### 例8

设 $A, B$ 均为 $n$ 阶方阵，$|A| = 2$，$|B| = -3$，求 $|2AB^{-1}A^2|$。

**解**：

$$|2AB^{-1}A^2| = 2^n |A| \cdot |B^{-1}| \cdot |A|^2 = 2^n \cdot 2 \cdot \frac{1}{-3} \cdot 4 = -\frac{2^{n+3}}{3}$$

### 例9

设 $\boldsymbol{\alpha}_1, \boldsymbol{\alpha}_2, \boldsymbol{\alpha}_3$ 为三维列向量，$|A| = |\boldsymbol{\alpha}_1, \boldsymbol{\alpha}_2, \boldsymbol{\alpha}_3| = 2$，求 $|\boldsymbol{\alpha}_1 + \boldsymbol{\alpha}_2, \boldsymbol{\alpha}_2 + \boldsymbol{\alpha}_3, \boldsymbol{\alpha}_3 + \boldsymbol{\alpha}_1|$。

**解**：

$$\begin{pmatrix} \boldsymbol{\alpha}_1 + \boldsymbol{\alpha}_2 & \boldsymbol{\alpha}_2 + \boldsymbol{\alpha}_3 & \boldsymbol{\alpha}_3 + \boldsymbol{\alpha}_1 \end{pmatrix} = \begin{pmatrix} \boldsymbol{\alpha}_1 & \boldsymbol{\alpha}_2 & \boldsymbol{\alpha}_3 \end{pmatrix} \begin{pmatrix} 1 & 0 & 1 \\ 1 & 1 & 0 \\ 0 & 1 & 1 \end{pmatrix}$$

$$\begin{vmatrix} 1 & 0 & 1 \\ 1 & 1 & 0 \\ 0 & 1 & 1 \end{vmatrix} = 1 + 1 = 2$$

故 $|\boldsymbol{\alpha}_1 + \boldsymbol{\alpha}_2, \boldsymbol{\alpha}_2 + \boldsymbol{\alpha}_3, \boldsymbol{\alpha}_3 + \boldsymbol{\alpha}_1| = |A| \cdot 2 = 2 \times 2 = 4$。

## 6. 证明题

### 例10

证明：奇数阶反对称行列式为零。

**证明**：设 $A$ 为 $n$ 阶反对称矩阵（$n$ 为奇数），则 $A^T = -A$。

$$|A| = |A^T| = |-A| = (-1)^n |A| = -|A|$$

故 $2|A| = 0$，即 $|A| = 0$。

### 例11

设 $A$ 为 $n$ 阶正交矩阵（$A^TA = I$），证明 $|A| = \pm 1$。

**证明**：$|A^TA| = |I| = 1$，又 $|A^TA| = |A^T| \cdot |A| = |A|^2$，故 $|A|^2 = 1$，$|A| = \pm 1$。

### 例12

设 $A$ 为 $n$ 阶实矩阵，$AA^T = I$，$|A| < 0$，证明 $|A + I| = 0$。

**证明**：

$$|A + I| = |A + AA^T| = |A(I + A^T)| = |A| \cdot |I + A^T|$$

又 $|I + A^T| = |(I + A)^T| = |I + A| = |A + I|$，故：

$$|A + I| = |A| \cdot |A + I|$$

因为 $|A| < 0 \neq 1$，所以 $|A + I| = 0$。

## 7. 代数余子式相关

### 例13

设 $D = \begin{vmatrix} 3 & 1 & -1 & 2 \\ -5 & 1 & 3 & -4 \\ 2 & 0 & 1 & -1 \\ 1 & -5 & 3 & -3 \end{vmatrix}$，求 $A_{31} + A_{32} + A_{33} + A_{34}$。

**解**：$A_{31} + A_{32} + A_{33} + A_{34}$ 相当于将第三行替换为 $(1,1,1,1)$ 后的行列式：

$$\begin{vmatrix} 3 & 1 & -1 & 2 \\ -5 & 1 & 3 & -4 \\ 1 & 1 & 1 & 1 \\ 1 & -5 & 3 & -3 \end{vmatrix}$$

按第三行展开，计算得 $A_{31} + A_{32} + A_{33} + A_{34} = 24$。

### 例14

设三阶行列式 $D = \begin{vmatrix} 1 & 2 & 3 \\ 4 & 5 & 6 \\ 7 & 8 & 9 \end{vmatrix}$，求 $M_{12} + M_{22} + M_{32}$。

**解**：$M_{12} = -A_{12}$，$M_{22} = A_{22}$，$M_{32} = -A_{32}$。

$$M_{12} + M_{22} + M_{32} = -A_{12} + A_{22} - A_{32}$$

这等于将第二列替换为 $(0, -1, 0)^T$ 后的行列式取负：

$$= -\begin{vmatrix} 1 & 0 & 3 \\ 4 & -1 & 6 \\ 7 & 0 & 9 \end{vmatrix} = -[(-1)(9-21)] = -12$$

### 例15

设 $A$ 为 $n$ 阶方阵，$|A| = a \neq 0$，求 $|A^*|$。

**解**：由 $A^*A = |A|I$，两边取行列式：

$$|A^*| \cdot |A| = |A|^n$$

故 $|A^*| = |A|^{n-1} = a^{n-1}$。
