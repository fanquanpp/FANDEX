---
order: 12
title: 几何概型
module: 'probability-statistics'
category: 'comp-sci'
difficulty: beginner
description: 几何概率的定义与计算、几何概型的典型问题、与古典概型的区别。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'probability-statistics/样本空间与事件'
  - 'probability-statistics/古典概型'
  - 'probability-statistics/条件概率'
  - 'probability-statistics/贝叶斯公式'
prerequisites: []
---

## 1. 几何概型的定义

### 1.1 从古典概型到几何概型

古典概型要求样本空间有限且等可能，但当样本空间为无限集（如区间、区域）时，古典概型不再适用。几何概型将"等可能"的概念推广到连续情形。

### 1.2 几何概型的条件

若随机试验满足：

1. **无限性**：样本空间 $\Omega$ 是一个可度量的几何区域（线段、平面区域、空间区域等）
2. **等可能性**：试验结果落在 $\Omega$ 中任一可度量的子区域 $A$ 内的概率只与 $A$ 的度量（长度、面积、体积等）成正比，而与 $A$ 的形状和位置无关

则称此试验为**几何概型**。

### 1.3 几何概率的计算

设 $\Omega$ 为可度量的几何区域，$A$ 为 $\Omega$ 的可度量子区域，则事件 $A$ 的概率为：

$$P(A) = \frac{A \text{ 的度量}}{\Omega \text{ 的度量}}$$

具体地：

- 一维情形（线段）：$P(A) = \dfrac{L(A)}{L(\Omega)}$
- 二维情形（平面区域）：$P(A) = \dfrac{S(A)}{S(\Omega)}$
- 三维情形（空间区域）：$P(A) = \dfrac{V(A)}{V(\Omega)}$

其中 $L$、$S$、$V$ 分别表示长度、面积和体积。

## 2. 几何概型的典型问题

### 2.1 会面问题

**问题**：甲乙两人约定在 8:00—9:00 之间在某地会面，先到者等候另一人 15 分钟后即离去。求两人能会面的概率。

**解**：设甲到达时刻为 $x$（分钟），乙到达时刻为 $y$（分钟），则

$$\Omega = \{(x, y) \mid 0 \leq x \leq 60, 0 \leq y \leq 60\}$$

两人能会面的条件为 $|x - y| \leq 15$，即

$$A = \{(x, y) \mid |x - y| \leq 15, 0 \leq x \leq 60, 0 \leq y \leq 60\}$$

$$S(\Omega) = 60 \times 60 = 3600$$

$$S(A) = 3600 - 2 \times \frac{1}{2} \times 45 \times 45 = 3600 - 2025 = 1575$$

$$P(A) = \frac{1575}{3600} = \frac{7}{16}$$

### 2.2 蒲丰投针问题

**问题**：平面上画有等距平行线，线距为 $a$，向平面任意投掷一枚长为 $l$（$l < a$）的针，求针与平行线相交的概率。

**解**：设针的中点到最近平行线的距离为 $x$，针与平行线的夹角为 $\theta$，则

$$\Omega = \{(x, \theta) \mid 0 \leq x \leq \frac{a}{2}, 0 \leq \theta \leq \pi\}$$

针与平行线相交的条件为 $x \leq \dfrac{l}{2}\sin\theta$，即

$$A = \left\{(x, \theta) \mid x \leq \frac{l}{2}\sin\theta, 0 \leq \theta \leq \pi, 0 \leq x \leq \frac{a}{2}\right\}$$

$$S(\Omega) = \frac{a}{2} \cdot \pi = \frac{a\pi}{2}$$

$$S(A) = \int_0^{\pi} \frac{l}{2}\sin\theta \, d\theta = \frac{l}{2}[-\cos\theta]_0^{\pi} = \frac{l}{2} \cdot 2 = l$$

$$P(A) = \frac{l}{\frac{a\pi}{2}} = \frac{2l}{a\pi}$$

由此可以估计 $\pi$ 的值：$\pi \approx \dfrac{2l}{a \cdot P(A)}$，这是蒙特卡洛方法的早期应用。

### 2.3 线段截取问题

**问题**：将长度为 $a$ 的线段任意折成三段，求此三段能构成三角形的概率。

**解**：设三段长度分别为 $x, y, z$，则 $x + y + z = a$，且 $x > 0, y > 0, z > 0$。

构成三角形的条件为：

$$x + y > z, \quad y + z > x, \quad z + x > y$$

由于 $x + y + z = a$，上述条件等价于：

$$x < \frac{a}{2}, \quad y < \frac{a}{2}, \quad z < \frac{a}{2}$$

样本空间为三维空间中的正三角形区域，面积为 $\dfrac{\sqrt{3}}{4}a^2$。

有利区域为正三角形内部去掉三个角上的小三角形，面积为 $\dfrac{\sqrt{3}}{4}a^2 - 3 \times \dfrac{\sqrt{3}}{4}\left(\dfrac{a}{2}\right)^2 = \dfrac{\sqrt{3}}{4}a^2 \cdot \dfrac{1}{4}$。

$$P = \frac{1}{4}$$

### 2.4 随机取点问题

**问题**：在区间 $(0, 1)$ 中随机取两个数，求两数之和小于 $\dfrac{6}{5}$ 的概率。

**解**：设两数为 $x, y$，则

$$\Omega = \{(x, y) \mid 0 < x < 1, 0 < y < 1\}$$

$$A = \left\{(x, y) \mid x + y < \frac{6}{5}, 0 < x < 1, 0 < y < 1\right\}$$

$$S(\Omega) = 1$$

$$S(A) = 1 - \frac{1}{2} \times \frac{4}{5} \times \frac{4}{5} = 1 - \frac{8}{25} = \frac{17}{25}$$

$$P(A) = \frac{17}{25}$$

## 3. 几何概型的性质

### 3.1 概率的基本性质

几何概率同样满足概率的公理化定义：

1. **非负性**：$P(A) \geq 0$
2. **规范性**：$P(\Omega) = 1$
3. **可列可加性**：若 $A_1, A_2, \cdots$ 两两互斥，则 $P\left(\bigcup_{i=1}^{\infty} A_i\right) = \sum_{i=1}^{\infty} P(A_i)$

### 3.2 零概率事件不一定是不可能事件

在几何概型中，单点集的概率为零，但单点集并非不可能事件。例如，在 $(0,1)$ 上随机取一点，取到 $0.5$ 的概率为 0，但取到 $0.5$ 是可能的。

$$P(\{x_0\}) = \frac{L(\{x_0\})}{L((0,1))} = \frac{0}{1} = 0$$

但 $\{x_0\} \neq \varnothing$。

### 3.3 贝特朗悖论

几何概型中"等可能"的选取方式不唯一，不同的等可能假设可能导致不同的概率结果。

**贝特朗悖论**：在单位圆内随机取一条弦，求弦长超过 $\sqrt{3}$ 的概率。

- **方法一**（随机端点）：$P = \dfrac{1}{3}$
- **方法二**（随机半径上的点）：$P = \dfrac{1}{2}$
- **方法三**（随机中点）：$P = \dfrac{1}{4}$

三种方法都合理，但结果不同，说明"随机"的定义需要明确。
