---
order: 4
title: 函数与基数
module: 'discrete-math'
category: 离散数学
difficulty: intermediate
description: 函数定义与性质、单射/满射/双射、复合与逆函数、可数集与不可数集、Cantor定理、基数比较。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'discrete-math/谓词逻辑'
  - 'discrete-math/集合与关系'
  - 'discrete-math/图论基础'
  - 'discrete-math/图论进阶'
prerequisites: []
---

## 1. 函数定义与性质

### 1.1 函数的定义

设 $A$ 和 $B$ 是非空集合。$A$ 到 $B$ 的**函数**（映射）$f: A \to B$ 是从 $A$ 到 $B$ 的关系，满足：

1. **存在性**：$\forall a \in A, \exists b \in B, (a,b) \in f$
2. **唯一性**：若 $(a,b_1) \in f$ 且 $(a,b_2) \in f$，则 $b_1 = b_2$

即每个 $a \in A$ 恰好对应一个 $b \in B$，记作 $f(a) = b$。

- **定义域**：$\text{dom}(f) = A$
- **值域**：$\text{ran}(f) = \{f(a) \mid a \in A\} \subseteq B$
- **像**：$f(X) = \{f(a) \mid a \in X\}$（$X \subseteq A$）
- **原像**：$f^{-1}(Y) = \{a \in A \mid f(a) \in Y\}$（$Y \subseteq B$）

### 1.2 函数的个数

从 $A$ 到 $B$ 的函数总数：$|B|^{|A|}$

若 $|A| = m$，$|B| = n$，则函数个数为 $n^m$。

## 2. 单射、满射与双射

### 2.1 定义

设 $f: A \to B$：

- **单射（injective）**：$f(a_1) = f(a_2) \Rightarrow a_1 = a_2$，即不同元素映射到不同值
- **满射（surjective）**：$\text{ran}(f) = B$，即 $B$ 中每个元素都有原像
- **双射（bijective）**：既是单射又是满射

### 2.2 判定

| 类型 | 有限集条件         | 逆否表述                                      |
| ---- | ------------------ | --------------------------------------------- |
| 单射 | $\|A\| \leq \|B\|$ | $a_1 \neq a_2 \Rightarrow f(a_1) \neq f(a_2)$ |
| 满射 | $\|A\| \geq \|B\|$ | $\forall b \in B, \exists a \in A, f(a) = b$  |
| 双射 | $\|A\| = \|B\|$    | 一一对应                                      |

### 2.3 计数

设 $|A| = m$，$|B| = n$：

- 单射个数：$P(n, m) = n(n-1)\cdots(n-m+1)$（$m \leq n$）
- 满射个数：$n! \cdot S(m, n)$（$S(m,n)$ 为第二类 Stirling 数，$m \geq n$）
- 双射个数：$n!$（$m = n$）

**例**：$A = \{1,2,3\}$，$B = \{a,b,c\}$，双射个数为 $3! = 6$。

### 2.4 常用函数

- **恒等函数**：$I_A: A \to A$，$I_A(a) = a$
- **常值函数**：$f(a) = c$（$c$ 为固定值）
- **特征函数**：$\chi_S: A \to \{0,1\}$，$\chi_S(a) = \begin{cases} 1 & a \in S \\ 0 & a \notin S \end{cases}$

## 3. 复合与逆函数

### 3.1 复合函数

设 $f: A \to B$，$g: B \to C$，则**复合函数** $g \circ f: A \to C$：

$$(g \circ f)(a) = g(f(a))$$

**性质**：

- 复合满足结合律：$(h \circ g) \circ f = h \circ (g \circ f)$
- 复合不满足交换律：$g \circ f \neq f \circ g$（一般情况）

**保性**：

- $f$, $g$ 单射 $\Rightarrow$ $g \circ f$ 单射
- $f$, $g$ 满射 $\Rightarrow$ $g \circ f$ 满射
- $g \circ f$ 单射 $\Rightarrow$ $f$ 单射
- $g \circ f$ 满射 $\Rightarrow$ $g$ 满射

### 3.2 逆函数

设 $f: A \to B$ 为双射，则**逆函数** $f^{-1}: B \to A$：

$$f^{-1}(b) = a \iff f(a) = b$$

**性质**：

- $f^{-1} \circ f = I_A$
- $f \circ f^{-1} = I_B$
- $(f^{-1})^{-1} = f$
- $(g \circ f)^{-1} = f^{-1} \circ g^{-1}$

**例**：$f: \mathbb{R} \to \mathbb{R}$，$f(x) = 2x + 1$。

> $f$ 是双射。设 $y = 2x + 1$，则 $x = \frac{y-1}{2}$。
> $f^{-1}(y) = \frac{y-1}{2}$。

### 3.3 左逆与右逆

- **左逆**：$g \circ f = I_A$，则 $g$ 是 $f$ 的左逆。$f$ 有左逆 $\iff$ $f$ 是单射。
- **右逆**：$f \circ g = I_B$，则 $g$ 是 $f$ 的右逆。$f$ 有右逆 $\iff$ $f$ 是满射。
- $f$ 有双逆 $\iff$ $f$ 是双射。

## 4. 可数集与不可数集

### 4.1 集合的等势

若存在双射 $f: A \to B$，则称 $A$ 与 $B$ **等势**，记作 $|A| = |B|$ 或 $A \sim B$。

等势是等价关系。

### 4.2 可数集

- **可数集**：与自然数集 $\mathbb{N}$ 等势的集合（即可以列举的无限集）
- **至多可数集**：有限集或可数集
- **不可数集**：不是至多可数的无限集

**可数集的例子**：

- $\mathbb{N} = \{0, 1, 2, \ldots\}$
- $\mathbb{Z} = \{\ldots, -2, -1, 0, 1, 2, \ldots\}$（按 $0, 1, -1, 2, -2, \ldots$ 排列）
- $\mathbb{Q}$（有理数集）：可用对角线法列举

**证明 $\mathbb{Q}$ 可数**：

> 将正有理数排列为：
> $$\begin{array}{ccccc} 1/1 & 1/2 & 1/3 & 1/4 & \cdots \\ 2/1 & 2/2 & 2/3 & 2/4 & \cdots \\ 3/1 & 3/2 & 3/3 & 3/4 & \cdots \\ \vdots & \vdots & \vdots & \vdots & \ddots \end{array}$$
> 沿对角线列举（跳过重复值）即可。

### 4.3 不可数集

**定理（Cantor）**：$(0,1)$ 是不可数集。

> **对角线论证法**：
> 假设 $(0,1)$ 可数，设其元素为 $a_1, a_2, a_3, \ldots$，其中
> $a_1 = 0.d_{11}d_{12}d_{13}\cdots$
> $a_2 = 0.d_{21}d_{22}d_{23}\cdots$
> $a_3 = 0.d_{31}d_{32}d_{33}\cdots$
> $\vdots$
> 构造 $b = 0.b_1 b_2 b_3\cdots$，其中 $b_i \neq d_{ii}$（且 $b_i \neq 0, 9$）。
> 则 $b \in (0,1)$ 但 $b \neq a_i$ 对所有 $i$，矛盾！

**推论**：$\mathbb{R}$ 是不可数集。

## 5. Cantor 定理

### 5.1 定理

对任意集合 $A$，$|A| < |\mathcal{P}(A)|$，即 $A$ 与其幂集不等势。

> **证明**：
>
> - $|A| \leq |\mathcal{P}(A)|$：映射 $a \mapsto \{a\}$ 是单射。
> - $|A| \neq |\mathcal{P}(A)|$：反证，设 $f: A \to \mathcal{P}(A)$ 为双射。
>   令 $B = \{a \in A \mid a \notin f(a)\}$，则 $B \subseteq A$，即 $B \in \mathcal{P}(A)$。
>   由 $f$ 为满射，存在 $b \in A$ 使 $f(b) = B$。
>   若 $b \in B$，则由 $B$ 的定义 $b \notin f(b) = B$，矛盾。
>   若 $b \notin B$，则由 $B$ 的定义 $b \in f(b) = B$，矛盾。

### 5.2 推论

不存在"最大的"无限集。无限基数有无穷多个层级：

$$|\mathbb{N}| < |\mathcal{P}(\mathbb{N})| < |\mathcal{P}(\mathcal{P}(\mathbb{N}))| < \cdots$$

## 6. 基数比较

### 6.1 基数

**基数**是集合"大小"的度量，用 $|A|$ 或 $\overline{\overline{A}}$ 表示。

- 有限集的基数为其元素个数
- $\aleph_0$（aleph-null）：$|\mathbb{N}|$，可数集的基数
- $\mathfrak{c}$（连续统）：$|\mathbb{R}|$，连续统的基数

### 6.2 基数比较

$$|A| \leq |B| \iff \text{存在单射 } f: A \to B$$

$$|A| = |B| \iff \text{存在双射 } f: A \to B$$

**Cantor-Bernstein 定理**：若 $|A| \leq |B|$ 且 $|B| \leq |A|$，则 $|A| = |B|$。

即：若存在单射 $f: A \to B$ 和单射 $g: B \to A$，则存在双射 $h: A \to B$。

**应用**：证明 $|(0,1)| = |\mathbb{R}|$。

> $f: (0,1) \to \mathbb{R}$，$f(x) = \tan(\pi x - \pi/2)$ 是双射。

### 6.3 基数运算

$$|A| + |B| = |A \cup B| \quad (A \cap B = \emptyset)$$

$$|A| \cdot |B| = |A \times B|$$

$$|A|^{|B|} = |A^B| = |\{f \mid f: B \to A\}|$$

**重要等式**：

$$\aleph_0 + \aleph_0 = \aleph_0$$

$$\aleph_0 \cdot \aleph_0 = \aleph_0$$

$$2^{\aleph_0} = \mathfrak{c}$$

### 6.4 连续统假设

**连续统假设（CH）**：不存在基数 $\kappa$ 使得 $\aleph_0 < \kappa < 2^{\aleph_0}$。

Gödel（1940）和 Cohen（1963）证明：CH 在 ZFC 公理系统中既不可证也不可否证，即 CH 独立于 ZFC。
