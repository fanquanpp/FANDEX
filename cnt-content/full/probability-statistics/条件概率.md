---
order: 13
title: 条件概率
module: 'probability-statistics'
category: 'comp-sci'
difficulty: intermediate
description: 条件概率的定义与性质、乘法公式、条件概率的应用。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'probability-statistics/古典概型'
  - 'probability-statistics/几何概型'
  - 'probability-statistics/贝叶斯公式'
  - 'probability-statistics/事件的独立性'
prerequisites: []
---

## 1. 条件概率的定义

### 1.1 条件概率的直观理解

在实际问题中，除了要知道事件 $A$ 发生的概率 $P(A)$，往往还需要知道在"事件 $B$ 已经发生"的条件下，事件 $A$ 发生的概率，这就是**条件概率**，记作 $P(A \mid B)$。

### 1.2 条件概率的严格定义

设 $A, B$ 是两个事件，且 $P(B) > 0$，则称

$$P(A \mid B) = \frac{P(AB)}{P(B)}$$

为在事件 $B$ 发生的条件下事件 $A$ 发生的**条件概率**。

类似地，若 $P(A) > 0$，则

$$P(B \mid A) = \frac{P(AB)}{P(A)}$$

### 1.3 条件概率与无条件概率的关系

条件概率 $P(A \mid B)$ 与无条件概率 $P(A)$ 的关系有三种可能：

- $P(A \mid B) > P(A)$：事件 $B$ 的发生促进了事件 $A$ 的发生
- $P(A \mid B) = P(A)$：事件 $B$ 的发生不影响事件 $A$ 的发生（即 $A$ 与 $B$ 独立）
- $P(A \mid B) < P(A)$：事件 $B$ 的发生抑制了事件 $A$ 的发生

## 2. 条件概率的性质

### 2.1 概率空间的性质

对于固定的 $B$（$P(B) > 0$），条件概率 $P(\cdot \mid B)$ 满足概率的所有性质：

1. **非负性**：$P(A \mid B) \geq 0$
2. **规范性**：$P(\Omega \mid B) = 1$
3. **可列可加性**：若 $A_1, A_2, \cdots$ 两两互斥，则

$$P\left(\bigcup_{i=1}^{\infty} A_i \biggm| B\right) = \sum_{i=1}^{\infty} P(A_i \mid B)$$

### 2.2 常用性质

1. $P(\bar{A} \mid B) = 1 - P(A \mid B)$

2. $P(A_1 \cup A_2 \mid B) = P(A_1 \mid B) + P(A_2 \mid B) - P(A_1 A_2 \mid B)$

3. 若 $A_1 \subseteq A_2$，则 $P(A_1 \mid B) \leq P(A_2 \mid B)$

4. $P(A\bar{B} \mid B) = 0$（在 $B$ 发生的条件下，$\bar{B}$ 不可能发生）

### 2.3 条件概率的链式法则

$$P(A \mid B) = \frac{P(AB)}{P(B)}, \quad P(B \mid A) = \frac{P(AB)}{P(A)}$$

由此可得：

$$P(AB) = P(A) \cdot P(B \mid A) = P(B) \cdot P(A \mid B)$$

## 3. 乘法公式

### 3.1 两个事件的乘法公式

$$P(AB) = P(A) \cdot P(B \mid A) = P(B) \cdot P(A \mid B)$$

### 3.2 多个事件的乘法公式

设 $A_1, A_2, \cdots, A_n$ 为 $n$ 个事件，且 $P(A_1 A_2 \cdots A_{n-1}) > 0$，则

$$P(A_1 A_2 \cdots A_n) = P(A_1) \cdot P(A_2 \mid A_1) \cdot P(A_3 \mid A_1 A_2) \cdots P(A_n \mid A_1 A_2 \cdots A_{n-1})$$

**证明思路**：由条件概率定义逐步展开即可。

### 3.3 乘法公式的应用

**例题**：袋中有 5 个白球和 3 个黑球，不放回地依次取 3 个球，求取出的 3 个球都是白球的概率。

**解**：设 $A_i$ 表示第 $i$ 次取到白球（$i = 1, 2, 3$），则

$$P(A_1) = \frac{5}{8}, \quad P(A_2 \mid A_1) = \frac{4}{7}, \quad P(A_3 \mid A_1 A_2) = \frac{3}{6} = \frac{1}{2}$$

$$P(A_1 A_2 A_3) = P(A_1) \cdot P(A_2 \mid A_1) \cdot P(A_3 \mid A_1 A_2) = \frac{5}{8} \times \frac{4}{7} \times \frac{1}{2} = \frac{5}{28}$$

## 4. 条件概率的计算方法

### 4.1 定义法

直接利用条件概率的定义计算：

$$P(A \mid B) = \frac{P(AB)}{P(B)}$$

适用于已知 $P(AB)$ 和 $P(B)$ 的情况。

### 4.2 缩小样本空间法

在 $B$ 发生的条件下，样本空间从 $\Omega$ 缩小为 $B$，在缩小的样本空间 $B$ 中计算 $A$ 的概率。

**例题**：掷两颗骰子，已知两颗骰子点数之和为 7，求其中一颗为 3 的概率。

**解**：两颗骰子点数之和为 7 的情况有：$(1,6), (2,5), (3,4), (4,3), (5,2), (6,1)$，共 6 种。

其中一颗为 3 的情况有：$(3,4), (4,3)$，共 2 种。

$$P(\text{一颗为3} \mid \text{和为7}) = \frac{2}{6} = \frac{1}{3}$$

### 4.3 利用概率公式

利用乘法公式、全概率公式等间接计算条件概率。

## 5. 条件概率的重要应用

### 5.1 逐步缩小范围

在复杂问题中，通过逐步添加条件来缩小问题范围，每一步使用条件概率。

### 5.2 序贯决策

在序贯决策问题中，每一步决策都依赖于前几步的结果，条件概率提供了自然的分析工具。

### 5.3 信息更新

条件概率反映了获得新信息后对概率的更新，这是贝叶斯统计的核心思想。

## 6. 常见错误与注意事项

1. **混淆 $P(AB)$ 与 $P(A \mid B)$**：$P(AB)$ 是 $A$ 和 $B$ 同时发生的概率，$P(A \mid B)$ 是在 $B$ 发生条件下 $A$ 发生的概率

2. **忽略条件概率的约束**：$P(A \mid B)$ 要求 $P(B) > 0$

3. **错误地认为 $P(A \mid B) + P(A \mid \bar{B}) = 1$**：实际上这两个条件概率一般不满足此等式

4. **注意区分**：
   - $P(A \mid B)$：$B$ 发生条件下 $A$ 发生的概率
   - $P(B \mid A)$：$A$ 发生条件下 $B$ 发生的概率
   - 这两者一般不相等
