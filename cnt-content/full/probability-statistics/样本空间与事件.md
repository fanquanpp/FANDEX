---
order: 10
title: 样本空间与事件
module: 'probability-statistics'
category: 'comp-sci'
difficulty: beginner
description: 随机试验、样本空间、事件及其运算关系，概率论的基本概念与公理化体系。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'probability-statistics/古典概型'
  - 'probability-statistics/几何概型'
prerequisites: []
---

## 1. 随机试验

### 1.1 随机现象与随机试验

在自然界和人类社会中，存在两类现象：

- **确定性现象**：在一定条件下必然发生或必然不发生的现象。例如，在标准大气压下，水加热到 $100^\circ\text{C}$ 必然沸腾。
- **随机现象**：在一定条件下可能出现不同结果的现象。例如，抛一枚硬币，可能出现正面也可能出现反面。

为了研究随机现象的统计规律性，需要对随机现象进行大量重复观察，每次观察称为一次**随机试验**，简称**试验**，记作 $E$。

### 1.2 随机试验的特征

随机试验具有以下三个特征：

1. **可重复性**：可以在相同的条件下重复进行
2. **多值性**：每次试验的可能结果不止一个，且能事先明确所有可能结果
3. **随机性**：进行一次试验之前不能确定哪一个结果会出现

**典型示例**：

| 试验  | 描述                               | 可能结果              |
| ----- | ---------------------------------- | --------------------- |
| $E_1$ | 抛一枚硬币                         | 正面、反面            |
| $E_2$ | 掷一颗骰子                         | 1, 2, 3, 4, 5, 6      |
| $E_3$ | 从一批产品中任取一件               | 合格品、不合格品      |
| $E_4$ | 记录某电话交换台一分钟内的呼叫次数 | 0, 1, 2, $\cdots$     |
| $E_5$ | 测量某零件的长度                   | $[a, b]$ 中的任意实数 |

## 2. 样本空间

### 2.1 样本空间的定义

随机试验 $E$ 的所有可能结果组成的集合称为 $E$ 的**样本空间**，记作 $\Omega$ 或 $S$。

样本空间中的每个元素，即试验的每个可能结果，称为**样本点**，记作 $\omega$。

$$\Omega = \{\omega_1, \omega_2, \cdots\}$$

### 2.2 样本空间的分类

**离散样本空间**：样本点为有限个或可列无限个。

- 有限样本空间：$\Omega = \{\omega_1, \omega_2, \cdots, \omega_n\}$
- 可列无限样本空间：$\Omega = \{\omega_1, \omega_2, \cdots, \omega_n, \cdots\}$

**连续样本空间**：样本点为不可列无限个，通常对应某个区间或区域。

$$\Omega = [a, b] \quad \text{或} \quad \Omega = \mathbb{R}$$

**示例**：

- 试验 $E_1$（抛硬币）：$\Omega_1 = \{H, T\}$（$H$ 表示正面，$T$ 表示反面）
- 试验 $E_2$（掷骰子）：$\Omega_2 = \{1, 2, 3, 4, 5, 6\}$
- 试验 $E_4$（电话呼叫次数）：$\Omega_4 = \{0, 1, 2, \cdots\}$
- 试验 $E_5$（零件长度）：$\Omega_5 = [a, b]$

## 3. 随机事件

### 3.1 事件的定义

随机试验 $E$ 的样本空间 $\Omega$ 的子集称为 $E$ 的**随机事件**，简称**事件**，通常用大写字母 $A, B, C, \cdots$ 表示。

当试验结果 $\omega \in A$ 时，称**事件 $A$ 发生**；当 $\omega \notin A$ 时，称**事件 $A$ 不发生**。

### 3.2 基本事件与复合事件

- **基本事件（样本点）**：由一个样本点组成的单点集 $\{\omega\}$
- **复合事件**：由多个样本点组成的事件

### 3.3 特殊事件

- **必然事件**：$\Omega$ 本身，每次试验必然发生
- **不可能事件**：空集 $\varnothing$，每次试验都不可能发生

> **注意**：必然事件和不可能事件实际上已失去了"随机性"，但为了方便，仍将它们作为随机事件的极端情形处理。

## 4. 事件间的关系

### 4.1 包含关系

若 $A$ 发生必然导致 $B$ 发生，即 $A$ 中的每个样本点都属于 $B$，则称**事件 $B$ 包含事件 $A$**，或**事件 $A$ 包含于事件 $B$**，记作 $A \subseteq B$。

$$A \subseteq B \iff \text{若 } \omega \in A \text{，则 } \omega \in B$$

若 $A \subseteq B$ 且 $B \subseteq A$，则 $A = B$。

### 4.2 互不相容（互斥）

若 $A$ 与 $B$ 不能同时发生，即 $A \cap B = \varnothing$，则称**事件 $A$ 与 $B$ 互不相容**（或**互斥**）。

若 $n$ 个事件 $A_1, A_2, \cdots, A_n$ 中任意两个都互不相容，即 $A_i \cap A_j = \varnothing$（$i \neq j$），则称这 $n$ 个事件**两两互不相容**。

### 4.3 对立事件（逆事件）

对于事件 $A$，由所有不属于 $A$ 的样本点组成的事件称为 $A$ 的**对立事件**（或**逆事件**），记作 $\bar{A}$ 或 $A^c$。

$$\bar{A} = \Omega - A = \{\omega \mid \omega \in \Omega, \omega \notin A\}$$

**对立事件与互斥事件的区别**：

- 互斥：$A \cap B = \varnothing$，但 $A \cup B$ 不一定是 $\Omega$
- 对立：$A \cap \bar{A} = \varnothing$ 且 $A \cup \bar{A} = \Omega$

对立一定互斥，互斥不一定对立。

## 5. 事件的运算

### 5.1 并（和）运算

事件 $A$ 与 $B$ 中至少有一个发生的事件，称为 $A$ 与 $B$ 的**并事件**（**和事件**），记作 $A \cup B$。

$$A \cup B = \{\omega \mid \omega \in A \text{ 或 } \omega \in B\}$$

推广到 $n$ 个事件：

$$\bigcup_{i=1}^{n} A_i = A_1 \cup A_2 \cup \cdots \cup A_n$$

### 5.2 交（积）运算

事件 $A$ 与 $B$ 同时发生的事件，称为 $A$ 与 $B$ 的**交事件**（**积事件**），记作 $A \cap B$ 或 $AB$。

$$A \cap B = \{\omega \mid \omega \in A \text{ 且 } \omega \in B\}$$

推广到 $n$ 个事件：

$$\bigcap_{i=1}^{n} A_i = A_1 \cap A_2 \cap \cdots \cap A_n$$

### 5.3 差运算

事件 $A$ 发生而 $B$ 不发生的事件，称为 $A$ 与 $B$ 的**差事件**，记作 $A - B$ 或 $A \setminus B$。

$$A - B = \{\omega \mid \omega \in A \text{ 且 } \omega \notin B\} = A\bar{B}$$

### 5.4 运算性质

事件的运算满足以下规律：

**交换律**：

$$A \cup B = B \cup A, \quad A \cap B = B \cap A$$

**结合律**：

$$(A \cup B) \cup C = A \cup (B \cup C), \quad (A \cap B) \cap C = A \cap (B \cap C)$$

**分配律**：

$$A \cup (B \cap C) = (A \cup B) \cap (A \cup C)$$

$$A \cap (B \cup C) = (A \cap B) \cup (A \cap C)$$

**德摩根律（De Morgan's Laws）**：

$$\overline{A \cup B} = \bar{A} \cap \bar{B}, \quad \overline{A \cap B} = \bar{A} \cup \bar{B}$$

推广形式：

$$\overline{\bigcup_{i=1}^{n} A_i} = \bigcap_{i=1}^{n} \bar{A}_i, \quad \overline{\bigcap_{i=1}^{n} A_i} = \bigcup_{i=1}^{n} \bar{A}_i$$

### 5.5 常用等式

$$A - B = A\bar{B}$$

$$A \cup B = A + B\bar{A} = A + B - AB$$

$$A \cup B \cup C = A + B + C - AB - AC - BC + ABC$$

## 6. 事件域与概率公理

### 6.1 事件域（σ-代数）

设 $\Omega$ 为样本空间，$\mathcal{F}$ 为 $\Omega$ 的某些子集组成的集合族，若满足：

1. $\Omega \in \mathcal{F}$
2. 若 $A \in \mathcal{F}$，则 $\bar{A} \in \mathcal{F}$（对补运算封闭）
3. 若 $A_1, A_2, \cdots \in \mathcal{F}$，则 $\bigcup_{i=1}^{\infty} A_i \in \mathcal{F}$（对可列并运算封闭）

则称 $\mathcal{F}$ 为 $\Omega$ 上的一个**σ-代数**（**事件域**），$(\Omega, \mathcal{F})$ 称为**可测空间**。

### 6.2 概率的公理化定义

设 $(\Omega, \mathcal{F})$ 为可测空间，若定义在 $\mathcal{F}$ 上的实值函数 $P$ 满足：

**公理1（非负性）**：对任意 $A \in \mathcal{F}$，$P(A) \geq 0$

**公理2（规范性）**：$P(\Omega) = 1$

**公理3（可列可加性）**：若 $A_1, A_2, \cdots$ 两两互不相容，则

$$P\left(\bigcup_{i=1}^{\infty} A_i\right) = \sum_{i=1}^{\infty} P(A_i)$$

则称 $P$ 为 $(\Omega, \mathcal{F})$ 上的**概率**，$(\Omega, \mathcal{F}, P)$ 称为**概率空间**。

### 6.3 概率的基本性质

由概率公理可以推出以下重要性质：

1. **不可能事件的概率**：$P(\varnothing) = 0$

2. **有限可加性**：若 $A_1, A_2, \cdots, A_n$ 两两互斥，则

$$P\left(\bigcup_{i=1}^{n} A_i\right) = \sum_{i=1}^{n} P(A_i)$$

3. **对立事件的概率**：$P(\bar{A}) = 1 - P(A)$

4. **包含关系的概率**：若 $A \subseteq B$，则 $P(A) \leq P(B)$

5. **概率的加法公式**：

$$P(A \cup B) = P(A) + P(B) - P(AB)$$

推广到三个事件：

$$P(A \cup B \cup C) = P(A) + P(B) + P(C) - P(AB) - P(AC) - P(BC) + P(ABC)$$

6. **概率的减法公式**：

$$P(A - B) = P(A) - P(AB)$$

若 $B \subseteq A$，则 $P(A - B) = P(A) - P(B)$
