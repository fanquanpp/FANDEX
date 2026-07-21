---
order: 3
title: 集合与关系
module: 'discrete-math'
category: 离散数学
difficulty: beginner
description: 集合运算、幂集、笛卡尔积、二元关系、等价关系与划分、偏序关系与Hasse图、闭包运算。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'discrete-math/命题逻辑'
  - 'discrete-math/谓词逻辑'
  - 'discrete-math/函数与基数'
  - 'discrete-math/图论基础'
prerequisites: []
---

## 1. 集合运算

### 1.1 基本概念

**集合**是具有某种特定性质的事物的总体。用大写字母 $A, B, C, \ldots$ 表示集合，小写字母 $a, b, c, \ldots$ 表示元素。

$a \in A$：$a$ 属于 $A$；$a \notin A$：$a$ 不属于 $A$。

### 1.2 集合的表示

- **列举法**：$A = \{1, 2, 3\}$
- **描述法**：$B = \{x \mid x > 0\}$

### 1.3 集合间的关系

- $A \subseteq B$（$A$ 是 $B$ 的子集）：$\forall x(x \in A \to x \in B)$
- $A = B$：$A \subseteq B \land B \subseteq A$
- $A \subset B$（$A$ 是 $B$ 的真子集）：$A \subseteq B \land A \neq B$

### 1.4 集合运算

**并**：$A \cup B = \{x \mid x \in A \lor x \in B\}$

**交**：$A \cap B = \{x \mid x \in A \land x \in B\}$

**差**：$A - B = \{x \mid x \in A \land x \notin B\}$

**补**：$\bar{A} = U - A$（$U$ 为全集）

**对称差**：$A \oplus B = (A - B) \cup (B - A) = (A \cup B) - (A \cap B)$

### 1.5 运算律

**交换律**：$A \cup B = B \cup A$，$A \cap B = B \cap A$

**结合律**：$(A \cup B) \cup C = A \cup (B \cup C)$

**分配律**：$A \cap (B \cup C) = (A \cap B) \cup (A \cap C)$

**德摩根律**：$\overline{A \cup B} = \bar{A} \cap \bar{B}$，$\overline{A \cap B} = \bar{A} \cup \bar{B}$

**吸收律**：$A \cup (A \cap B) = A$，$A \cap (A \cup B) = A$

**补律**：$A \cup \bar{A} = U$，$A \cap \bar{A} = \emptyset$

## 2. 幂集与笛卡尔积

### 2.1 幂集

集合 $A$ 的**幂集**是 $A$ 的所有子集的集合：

$$\mathcal{P}(A) = \{X \mid X \subseteq A\}$$

若 $|A| = n$，则 $|\mathcal{P}(A)| = 2^n$。

**例**：$A = \{1, 2\}$，$\mathcal{P}(A) = \{\emptyset, \{1\}, \{2\}, \{1,2\}\}$，$|\mathcal{P}(A)| = 4$。

### 2.2 笛卡尔积

$$A \times B = \{(a, b) \mid a \in A, b \in B\}$$

**性质**：

- $|A \times B| = |A| \cdot |B|$
- 笛卡尔积不满足交换律：$A \times B \neq B \times A$（一般情况）
- $A \times (B \cup C) = (A \times B) \cup (A \times C)$
- $A \times (B \cap C) = (A \times B) \cap (A \times C)$

## 3. 二元关系

### 3.1 定义

$A \times B$ 的任意子集 $R$ 称为从 $A$ 到 $B$ 的**二元关系**。当 $A = B$ 时，$R$ 称为 $A$ 上的二元关系。

若 $(a, b) \in R$，记作 $aRb$。

**特殊关系**：

- **空关系**：$\emptyset$
- **全关系**：$A \times A$
- **恒等关系**：$I_A = \{(a,a) \mid a \in A\}$

### 3.2 关系的表示

- **集合表示**：$R = \{(1,2), (2,3), (1,3)\}$
- **关系矩阵**：$M_R = (m_{ij})$，$m_{ij} = 1$ 若 $(a_i, b_j) \in R$，否则为 $0$
- **关系图**：用有向图表示

### 3.3 关系的性质

设 $R$ 是 $A$ 上的关系：

| 性质     | 定义                            | 矩阵特征         | 图特征           |
| -------- | ------------------------------- | ---------------- | ---------------- |
| 自反性   | $\forall a, aRa$                | 主对角线全1      | 每点有环         |
| 反自反性 | $\forall a, \neg(aRa)$          | 主对角线全0      | 每点无环         |
| 对称性   | $aRb \Rightarrow bRa$           | 对称矩阵         | 边双向           |
| 反对称性 | $aRb \land bRa \Rightarrow a=b$ | —                | 无双向边（除环） |
| 传递性   | $aRb \land bRc \Rightarrow aRc$ | $M_R^2 \leq M_R$ | 有捷径           |

**例**：$A = \{1,2,3\}$，$R = \{(1,1),(2,2),(3,3),(1,2),(2,1)\}$。

> 自反：是（每点有环）
> 对称：是（$(1,2)$ 和 $(2,1)$ 都在）
> 传递：是（检查所有路径）
> 反对称：否（$1R2$ 且 $2R1$ 但 $1 \neq 2$）

### 3.4 关系的运算

**逆关系**：$R^{-1} = \{(b,a) \mid (a,b) \in R\}$

**复合关系**：$R \circ S = \{(a,c) \mid \exists b, (a,b) \in S \land (b,c) \in R\}$

**注意**：$R \circ S$ 中 $S$ 先作用，$R$ 后作用。

**矩阵运算**：$M_{R \circ S} = M_S \cdot M_R$（布尔矩阵乘法）

**幂运算**：$R^n = R^{n-1} \circ R$，$R^0 = I_A$

## 4. 等价关系与划分

### 4.1 等价关系

若 $R$ 满足自反性、对称性和传递性，则 $R$ 为**等价关系**。

**等价类**：$[a]_R = \{x \in A \mid xRa\}$

**性质**：

- $aRb \iff [a] = [b]$
- $[a] \cap [b] = \emptyset$ 或 $[a] = [b]$
- $\bigcup_{a \in A} [a] = A$

### 4.2 划分

集合 $A$ 的**划分**是 $A$ 的非空子集族 $\pi = \{A_1, A_2, \ldots, A_k\}$，满足：

1. $A_i \neq \emptyset$
2. $A_i \cap A_j = \emptyset$（$i \neq j$）
3. $\bigcup A_i = A$

**定理**：$A$ 上的等价关系与 $A$ 的划分一一对应。

**例**：$A = \{1,2,3,4,5\}$，$R = \{(a,b) \mid a \equiv b \pmod{2}\}$。

> 等价类：$[1] = \{1,3,5\}$，$[2] = \{2,4\}$
> 划分：$\{\{1,3,5\}, \{2,4\}\}$

### 4.3 商集

$A$ 关于等价关系 $R$ 的**商集**：$A/R = \{[a]_R \mid a \in A\}$

## 5. 偏序关系与 Hasse 图

### 5.1 偏序关系

若 $R$ 满足自反性、反对称性和传递性，则 $R$ 为**偏序关系**，记作 $\leq$。$(A, \leq)$ 称为**偏序集**。

**全序（线序）**：偏序集中任意两个元素都可比较。

### 5.2 特殊元素

设 $(A, \leq)$ 为偏序集，$S \subseteq A$：

- **极大元**：$a \in S$，不存在 $b \in S$ 使 $a < b$
- **极小元**：$a \in S$，不存在 $b \in S$ 使 $b < a$
- **最大元**：$a \in S$，$\forall b \in S, b \leq a$（若存在则唯一）
- **最小元**：$a \in S$，$\forall b \in S, a \leq b$（若存在则唯一）
- **上界**：$u \in A$，$\forall b \in S, b \leq u$
- **下界**：$l \in A$，$\forall b \in S, l \leq b$
- **最小上界（上确界）**：$\sup S$，上界中的最小元
- **最大下界（下确界）**：$\inf S$，下界中的最大元

### 5.3 Hasse 图

绘制规则：

1. 省去自环（自反性）
2. 省去由传递性可推出的边
3. 若 $a < b$，则 $b$ 画在 $a$ 上方

**例**：$A = \{1,2,3,6\}$，偏序关系为整除关系 $|$。

> Hasse 图：
>
> ```
>     6
>    / \
>   2   3
>    \ /
>     1
> ```
>
> 极大元：6（也是最大元）
> 极小元：1（也是最小元）

### 5.4 格

若偏序集中任意两个元素都有上确界和下确界，则称为**格**。

- $a \vee b = \sup\{a,b\}$（并运算）
- $a \wedge b = \inf\{a,b\}$（交运算）

## 6. 闭包运算

### 6.1 定义

关系 $R$ 的**闭包**是包含 $R$ 且具有某种性质的最小关系。

- **自反闭包**：$r(R) = R \cup I_A$
- **对称闭包**：$s(R) = R \cup R^{-1}$
- **传递闭包**：$t(R) = \bigcup_{i=1}^{\infty} R^i = R \cup R^2 \cup R^3 \cup \cdots$

### 6.2 传递闭包的计算

**有限集上**：若 $|A| = n$，则 $t(R) = \bigcup_{i=1}^{n} R^i$

**Warshall 算法**（求传递闭包的关系矩阵）：

```
W = M_R（关系矩阵的副本）
for k = 1 to n:
    for i = 1 to n:
        for j = 1 to n:
            W[i][j] = W[i][j] OR (W[i][k] AND W[k][j])
```

时间复杂度 $O(n^3)$。

**例**：$A = \{1,2,3\}$，$R = \{(1,2),(2,3)\}$，求 $t(R)$。

> $R^2 = \{(1,3)\}$，$R^3 = \emptyset$
> $t(R) = R \cup R^2 \cup R^3 = \{(1,2),(2,3),(1,3)\}$

### 6.3 闭包的性质

$$rs(R) = sr(R)$$

$$rt(R) = tr(R)$$

$$st(R) \subseteq ts(R)$$

其中 $rs(R)$ 表示先求自反闭包再求对称闭包。
