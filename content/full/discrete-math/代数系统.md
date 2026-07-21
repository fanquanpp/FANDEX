---
order: 7
title: 代数系统
module: 'discrete-math'
category: 离散数学
difficulty: advanced
description: 代数运算与性质、半群与群、子群与陪集、Lagrange定理、环与域、同态与同构。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'discrete-math/图论基础'
  - 'discrete-math/图论进阶'
  - 'discrete-math/组合数学'
prerequisites: []
---

## 1. 代数运算与性质

### 1.1 代数运算

设 $S$ 是非空集合。映射 $f: S^n \to S$ 称为 $S$ 上的 **$n$ 元运算**。

最常用的是**二元运算** $*: S \times S \to S$，记作 $a * b$。

### 1.2 运算的性质

**封闭性**：$\forall a, b \in S, a * b \in S$

**交换律**：$a * b = b * a$

**结合律**：$(a * b) * c = a * (b * c)$

**分配律**（两个运算间）：$a * (b \circ c) = (a * b) \circ (a * c)$（左分配）

**吸收律**：$a * (a \circ b) = a$

**幂等律**：$a * a = a$

### 1.3 特殊元素

**单位元（幺元）**：$e * a = a * e = a$（$\forall a \in S$）

> 若存在，则唯一。证明：设 $e_1, e_2$ 都是单位元，$e_1 = e_1 * e_2 = e_2$。

**零元**：$\theta * a = a * \theta = \theta$（$\forall a \in S$）

**逆元**：若 $a * b = b * a = e$，则 $b$ 是 $a$ 的逆元，记作 $a^{-1}$。

> 在有单位元且满足结合律的系统中，逆元若存在则唯一。

**例**：$(\mathbb{Z}, +)$ 的单位元为 $0$，$a$ 的逆元为 $-a$，无零元。

**例**：$(\mathbb{Z}, \times)$ 的单位元为 $1$，零元为 $0$，只有 $\pm 1$ 有逆元。

## 2. 半群与群

### 2.1 半群

**半群**：$(S, *)$ 满足封闭性和结合律。

**独异点（含幺半群）**：有单位元的半群。

**例**：

- $(\mathbb{N}, +)$：半群，不是独异点（无单位元——若 $\mathbb{N}$ 含0则为独异点）
- $(\mathbb{Z}, +)$：独异点（单位元0）
- 字符串集合在连接运算下：独异点（单位元为空串）

### 2.2 群

**群** $(G, *)$ 满足：

1. 封闭性
2. 结合律
3. 有单位元
4. 每个元素有逆元

**Abel 群（交换群）**：满足交换律的群。

**群的性质**：

- 消去律：$a * b = a * c \Rightarrow b = c$
- 方程有解：$a * x = b$ 有唯一解 $x = a^{-1} * b$
- $(a^{-1})^{-1} = a$
- $(a * b)^{-1} = b^{-1} * a^{-1}$

**例**：

- $(\mathbb{Z}, +)$：Abel 群
- $(\mathbb{Q}^*, \times)$：Abel 群（$\mathbb{Q}^* = \mathbb{Q} \setminus \{0\}$）
- $n$ 阶可逆矩阵在乘法下：群（非 Abel）
- $(\mathbb{Z}_n, +_n)$：Abel 群（模 $n$ 加法）

### 2.3 群的阶

- **群的阶** $|G|$：群中元素个数
- **元素的阶**：使 $a^n = e$ 的最小正整数 $n$，记作 $o(a)$

**例**：$\mathbb{Z}_6 = \{0,1,2,3,4,5\}$ 在模6加法下：

- $o(0) = 1$，$o(1) = 6$，$o(2) = 3$，$o(3) = 2$，$o(4) = 3$，$o(5) = 6$

### 2.4 置换群

**$n$ 元置换**：$\{1, 2, \ldots, n\}$ 到自身的双射。

所有 $n$ 元置换在复合运算下构成**对称群** $S_n$，$|S_n| = n!$。

**轮换表示**：$(1\,3\,5)$ 表示 $1 \to 3 \to 5 \to 1$。

**对换**：长度为2的轮换，如 $(1\,3)$。

**定理**：每个置换可分解为不相交轮换的复合，也可分解为对换的复合。

### 2.5 循环群

若群 $G$ 中存在元素 $a$ 使得 $G = \{a^n \mid n \in \mathbb{Z}\}$，则 $G$ 为**循环群**，$a$ 为**生成元**。

**定理**：

- 无限循环群同构于 $(\mathbb{Z}, +)$
- $n$ 阶循环群同构于 $(\mathbb{Z}_n, +_n)$
- $n$ 阶循环群的生成元个数为 $\varphi(n)$（Euler 函数）

## 3. 子群与陪集

### 3.1 子群

设 $(G, *)$ 是群，$H \subseteq G$。若 $(H, *)$ 也是群，则 $H$ 是 $G$ 的**子群**，记作 $H \leq G$。

**判定**：$H \leq G \iff \forall a, b \in H, a * b^{-1} \in H$

**例**：

- $\{e\}$ 和 $G$ 是 $G$ 的平凡子群
- $n\mathbb{Z} = \{nk \mid k \in \mathbb{Z}\}$ 是 $(\mathbb{Z}, +)$ 的子群

### 3.2 陪集

设 $H \leq G$，$a \in G$：

- **左陪集**：$aH = \{a * h \mid h \in H\}$
- **右陪集**：$Ha = \{h * a \mid h \in H\}$

**性质**：

- $aH = bH \iff a^{-1} * b \in H$
- 任意两个左陪集要么相等要么不相交
- $|aH| = |H|$（所有陪集大小相同）

### 3.3 Lagrange 定理

设 $H \leq G$，$|G|$ 有限，则

$$|G| = [G:H] \cdot |H|$$

其中 $[G:H]$ 为 $H$ 在 $G$ 中的**指数**（左陪集的个数）。

**推论**：

- 子群的阶整除群的阶
- 元素的阶整除群的阶：$o(a) \mid |G|$
- 素数阶群必为循环群

**例**：$|G| = 6$ 的群的子群阶只能是 1, 2, 3, 6。

## 4. 正规子群与商群

### 4.1 正规子群

若 $\forall a \in G, aH = Ha$，则 $H$ 是 $G$ 的**正规子群**，记作 $H \trianglelefteq G$。

等价条件：$\forall a \in G, aHa^{-1} = H$

**例**：Abel 群的任何子群都是正规子群。

### 4.2 商群

设 $H \trianglelefteq G$，商群 $G/H$ 的元素为 $H$ 的陪集，运算为：

$$(aH)(bH) = (ab)H$$

$|G/H| = [G:H] = |G|/|H|$

**例**：$\mathbb{Z}/n\mathbb{Z} \cong \mathbb{Z}_n$

## 5. 环与域

### 5.1 环

**环** $(R, +, \cdot)$ 满足：

1. $(R, +)$ 是 Abel 群
2. $(R, \cdot)$ 是半群
3. 分配律：$a(b+c) = ab + ac$，$(b+c)a = ba + ca$

**交换环**：乘法满足交换律的环。

**含幺环**：乘法有单位元的环。

**例**：

- $(\mathbb{Z}, +, \times)$：含幺交换环
- $(\mathbb{Z}_n, +_n, \times_n)$：含幺交换环
- $n$ 阶矩阵环 $M_n(\mathbb{R})$：含幺非交换环

### 5.2 整环与域

**零因子**：$a \neq 0, b \neq 0$ 但 $ab = 0$。

**整环**：无零因子的含幺交换环。

**域**：每个非零元素有乘法逆元的整环。

**例**：

- $\mathbb{Z}$ 是整环但不是域（2无逆元）
- $\mathbb{Q}$，$\mathbb{R}$，$\mathbb{C}$ 是域
- $\mathbb{Z}_p$（$p$ 为素数）是有限域（Galois 域 $\text{GF}(p)$）
- $\mathbb{Z}_6$ 不是整环（$2 \times 3 = 0$）

### 5.3 理想

设 $(R, +, \cdot)$ 是环，$I \subseteq R$。若：

1. $(I, +)$ 是 $(R, +)$ 的子群
2. $\forall r \in R, a \in I$：$ra \in I$ 且 $ar \in I$

则 $I$ 是 $R$ 的**理想**。

**商环** $R/I$ 类似商群。

## 6. 同态与同构

### 6.1 群同态

设 $(G_1, *)$ 和 $(G_2, \circ)$ 是群。映射 $\varphi: G_1 \to G_2$ 若满足

$$\varphi(a * b) = \varphi(a) \circ \varphi(b)$$

则 $\varphi$ 为**群同态**。

**核**：$\ker\varphi = \{a \in G_1 \mid \varphi(a) = e_2\}$

**像**：$\text{Im}\,\varphi = \{\varphi(a) \mid a \in G_1\}$

**性质**：

- $\ker\varphi \trianglelefteq G_1$
- $\text{Im}\,\varphi \leq G_2$
- $\varphi$ 是单射 $\iff$ $\ker\varphi = \{e_1\}$

### 6.2 群同构

若同态 $\varphi$ 是双射，则 $\varphi$ 为**同构**，记作 $G_1 \cong G_2$。

**Cayley 定理**：任何 $n$ 阶群同构于 $S_n$ 的某个子群。

### 6.3 同态基本定理

$$G_1/\ker\varphi \cong \text{Im}\,\varphi$$

**例**：$\varphi: \mathbb{Z} \to \mathbb{Z}_n$，$\varphi(k) = k \bmod n$。

> $\ker\varphi = n\mathbb{Z}$，$\text{Im}\,\varphi = \mathbb{Z}_n$。
> $\mathbb{Z}/n\mathbb{Z} \cong \mathbb{Z}_n$。

### 6.4 环同态

设 $(R_1, +_1, \cdot_1)$ 和 $(R_2, +_2, \cdot_2)$ 是环。映射 $\varphi: R_1 \to R_2$ 若满足：

$$\varphi(a +_1 b) = \varphi(a) +_2 \varphi(b)$$

$$\varphi(a \cdot_1 b) = \varphi(a) \cdot_2 \varphi(b)$$

则 $\varphi$ 为**环同态**。

**环同态基本定理**：$R_1/\ker\varphi \cong \text{Im}\,\varphi$

### 6.5 第一同构定理

设 $H \trianglelefteq G$，$K \leq G$，则：

$$HK/K \cong H/(H \cap K)$$
