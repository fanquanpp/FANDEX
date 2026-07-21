---
order: 59
title: 形式语言与自动机
module: 'cs-fundamentals'
category: 'Computer Science'
difficulty: advanced
description: 形式语言与自动机：正则语言、上下文无关文法、下推自动机与图灵机
author: fanquanpp
updated: '2026-06-14'
related:
  - 'cs-fundamentals/分布式系统'
  - 'cs-fundamentals/算法设计与分析'
  - 'cs-fundamentals/信息安全基础'
  - 'cs-fundamentals/编译原理'
prerequisites:
  - 'cs-fundamentals/计算机科学概述'
---

## 1. 形式语言基础

### 1.1 基本概念

- **字母表 $\Sigma$**：有限符号集合，如 $\Sigma = \{0, 1\}$
- **字符串**：字母表中符号的有限序列
- **空串 $\epsilon$**：长度为0的字符串
- **语言 $L$**：$\Sigma^*$ 的子集，即字符串的集合

### 1.2 语言运算

- **并**：$L_1 \cup L_2$
- **连接**：$L_1 \cdot L_2 = \{xy \mid x \in L_1, y \in L_2\}$
- **闭包**：$L^* = \bigcup_{i=0}^{\infty} L^i$
- **正闭包**：$L^+ = \bigcup_{i=1}^{\infty} L^i$

### 1.3 Chomsky 文法层次

| 类型 | 文法 | 自动机 | 产生式形式 |
| ---- | -------------- | -------------- | ----------------------- | ------ | ---- | ----- | --- |
| 0型 | 无限制文法 | 图灵机 | $\alpha \to \beta$ |
| 1型 | 上下文有关文法 | 线性有界自动机 | $\alpha \to \beta,      | \alpha | \leq | \beta | $ |
| 2型 | 上下文无关文法 | 下推自动机 | $A \to \gamma$ |
| 3型 | 正则文法 | 有限自动机 | $A \to aB$ 或 $A \to a$ |

## 2. 有限自动机

### 2.1 确定性有限自动机（DFA）

DFA 是五元组 $M = (Q, \Sigma, \delta, q_0, F)$：

- $Q$：有限状态集
- $\Sigma$：输入字母表
- $\delta: Q \times \Sigma \to Q$：转移函数
- $q_0$：初始状态
- $F \subseteq Q$：接受状态集

**示例**：识别以 "01" 结尾的字符串的 DFA：

```
q0 --0--> q1
q0 --1--> q0
q1 --0--> q1
q1 --1--> q2 (接受)
q2 --0--> q1
q2 --1--> q0
```

### 2.2 非确定性有限自动机（NFA）

NFA 允许：

- 同一状态同一输入有多个转移
- $\epsilon$ 转移（不消耗输入）
- $\delta: Q \times (\Sigma \cup \{\epsilon\}) \to 2^Q$

### 2.3 DFA 与 NFA 等价

**子集构造法**：将 NFA 转换为 DFA。

$$\text{DFA 状态} = \text{NFA 状态集的子集}$$

最坏情况下，$n$ 状态 NFA 可能产生 $2^n$ 状态 DFA。

### 2.4 DFA 最小化

**Hopcroft 算法**：

1. 初始划分：接受状态 / 非接受状态
2. 对每个划分块，检查是否可进一步分割
3. 重复直到不可分割

时间复杂度：$O(n \log n)$

## 3. 正则语言

### 3.1 正则表达式

| 操作 | 语法 | 含义 |
| ---- | --------- | --------------------- | -------------------- |
| 并 | $R_1      | R_2$ | $L(R_1) \cup L(R_2)$ |
| 连接 | $R_1 R_2$ | $L(R_1) \cdot L(R_2)$ |
| 闭包 | $R^*$ | $L(R)^*$ |

**正则表达式 → NFA**：Thompson 构造法。

**DFA → 正则表达式**：状态消除法。

### 3.2 正则语言的性质

**封闭性**：正则语言对并、连接、闭包、补、交、差运算封闭。

**泵引理（Pumping Lemma）**：

若 $L$ 是正则语言，则存在泵长度 $p$，使得 $L$ 中任何长度 $\geq p$ 的字符串 $s$ 可分解为 $s = xyz$，满足：

1. $|xy| \leq p$
2. $|y| > 0$
3. $\forall i \geq 0: xy^iz \in L$

**用途**：证明某语言不是正则语言。

**示例**：$L = \{0^n1^n \mid n \geq 0\}$ 不是正则语言。

### 3.3 Myhill-Nerode 定理

$L$ 是正则语言 $\iff$ $L$ 的等价类数有限。

等价关系：$x \equiv_L y \iff \forall z: xz \in L \Leftrightarrow yz \in L$

## 4. 上下文无关文法（CFG）

### 4.1 CFG 定义

四元组 $G = (V, \Sigma, R, S)$：

- $V$：非终结符集合
- $\Sigma$：终结符集合
- $R$：产生式规则 $A \to \alpha$
- $S$：起始符号

**示例**：匹配括号的语言 $\{(^n)^n \mid n \geq 0\}$：

$$S \to (S) \mid \epsilon$$

### 4.2 推导与语法树

**最左推导**：每次替换最左边的非终结符。

**最右推导**：每次替换最右边的非终结符。

**歧义性**：如果一个字符串有多棵不同的语法树，则文法是歧义的。

**示例**：算术表达式文法：

$$E \to E + E \mid E \times E \mid (E) \mid \text{id}$$

字符串 `id + id × id` 有两棵语法树（歧义）。

消除歧义：引入优先级和结合性。

$$E \to E + T \mid T, \quad T \to T \times F \mid F, \quad F \to (E) \mid \text{id}$$

### 4.3 Chomsky 范式（CNF）

每个产生式形如 $A \to BC$ 或 $A \to a$。

任何 CFG 都可转换为 CNF。

### 4.4 CYK 算法

判断字符串 $w$ 是否属于 CNF 文法的语言：

$$T[i][j] = \{A \mid A \to BC, B \in T[i][k], C \in T[k+1][j]\}$$

时间复杂度：$O(n^3 |G|)$

## 5. 下推自动机（PDA）

### 5.1 PDA 定义

七元组 $M = (Q, \Sigma, \Gamma, \delta, q_0, Z_0, F)$：

- $\Gamma$：栈字母表
- $\delta: Q \times (\Sigma \cup \{\epsilon\}) \times (\Gamma \cup \{\epsilon\}) \to 2^{Q \times (\Gamma \cup \{\epsilon\})}$
- $Z_0$：初始栈符号

### 5.2 PDA 与 CFG 等价

**CFG → PDA**：对每个非终结符，猜测产生式并匹配终结符。

**PDA → CFG**：将 PDA 的状态对编码为 CFG 的非终结符。

### 5.3 确定性 PDA（DPDA）

DPDA 对每个输入和栈顶最多有一个转移。

DPDA 识别的语言是 CFL 的真子集，称为**确定性上下文无关语言（DCFL）**。

## 6. 上下文无关语言的性质

### 6.1 CFL 泵引理

若 $L$ 是 CFL，则存在泵长度 $p$，使得 $L$ 中任何长度 $\geq p$ 的字符串 $s$ 可分解为 $s = uvxyz$，满足：

1. $|vxy| \leq p$
2. $|vy| > 0$
3. $\forall i \geq 0: uv^ixy^iz \in L$

**示例**：$L = \{a^nb^nc^n \mid n \geq 0\}$ 不是 CFL。

### 6.2 CFL 的封闭性

| 运算         | 封闭性     |
| ------------ | ---------- |
| 并           | 封闭       |
| 连接         | 封闭       |
| 闭包         | 封闭       |
| 交           | **不封闭** |
| 补           | **不封闭** |
| 与正则语言交 | 封闭       |

## 7. 图灵机

### 7.1 图灵机定义

七元组 $M = (Q, \Sigma, \Gamma, \delta, q_0, q_{accept}, q_{reject})$：

- $\Gamma \supset \Sigma$：带字母表，包含空白符 $\sqcup$
- $\delta: Q \times \Gamma \to Q \times \Gamma \times \{L, R\}$

### 7.2 图灵机的变体

| 变体       | 与标准TM等价 |
| ---------- | ------------ |
| 多带TM     | 是           |
| 非确定性TM | 是           |
| 枚举器     | 是           |
| 多维带TM   | 是           |

### 7.3 不可判定性

**停机问题**：给定程序 $P$ 和输入 $I$，$P(I)$ 是否停机？

**证明**（对角化论证）：

假设存在判定器 $H(P, I)$，构造：

$$D(P) = \begin{cases} \text{loop} & \text{if } H(P, P) = \text{halts} \\ \text{halt} & \text{if } H(P, P) = \text{loops} \end{cases}$$

$D(D)$ 产生矛盾。

### 7.4 可判定性层次

| 语言类         | 可判定性                         |
| -------------- | -------------------------------- |
| 正则语言       | 成员问题可判定                   |
| CFL            | 成员问题可判定，等价问题不可判定 |
| 递归语言       | 成员问题可判定                   |
| 递归可枚举语言 | 成员问题半可判定                 |
