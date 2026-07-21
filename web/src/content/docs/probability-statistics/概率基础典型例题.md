---
order: 16
title: 概率基础典型例题
module: 'probability-statistics'
category: 'comp-sci'
difficulty: intermediate
description: 概率基础部分的典型例题精选，涵盖样本空间、古典概型、几何概型、条件概率、贝叶斯公式、独立性等核心知识点。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'probability-statistics/贝叶斯公式'
  - 'probability-statistics/事件的独立性'
  - 'probability-statistics/离散型随机变量'
  - 'probability-statistics/连续型随机变量'
prerequisites: []
---

## 1. 样本空间与事件

### 例题1

设 $A, B, C$ 为三个事件，用 $A, B, C$ 的运算关系表示下列事件：

（1）$A$ 发生，$B$ 与 $C$ 不发生：$A\bar{B}\bar{C}$

（2）$A$ 与 $B$ 都发生，$C$ 不发生：$AB\bar{C}$

（3）$A, B, C$ 中至少有一个发生：$A \cup B \cup C$

（4）$A, B, C$ 都发生：$ABC$

（5）$A, B, C$ 都不发生：$\bar{A}\bar{B}\bar{C}$

（6）$A, B, C$ 中不多于一个发生：$\bar{A}\bar{B}\bar{C} \cup A\bar{B}\bar{C} \cup \bar{A}B\bar{C} \cup \bar{A}\bar{B}C$

（7）$A, B, C$ 中恰有两个发生：$AB\bar{C} \cup A\bar{B}C \cup \bar{A}BC$

（8）$A, B, C$ 中至少有两个发生：$AB \cup AC \cup BC$

### 例题2

证明：$A \cup B = A \cup (B - A) = A \cup B\bar{A}$，且 $A$ 与 $B\bar{A}$ 互斥。

**证明**：

首先，$A \cup B = A \cup (B - AB) = A \cup B\bar{A}$（因为 $B - AB = B\bar{A}$）。

其次，$A \cap B\bar{A} = AB\bar{A} = A\bar{A}B = \varnothing$，故 $A$ 与 $B\bar{A}$ 互斥。

## 2. 古典概型

### 例题3

从 5 双不同的鞋中任取 4 只，求下列事件的概率：

（1）4 只鞋中至少有两只配成一双；

（2）4 只鞋恰好配成两双。

**解**：样本空间总数为 $\dbinom{10}{4} = 210$。

（1）设 $A$ 为"至少有两只配对"，考虑对立事件 $\bar{A}$："4 只鞋都不配对"。

从 5 双中选 4 双：$\dbinom{5}{4} = 5$；从每双中选 1 只：$2^4 = 16$。

$$P(\bar{A}) = \frac{5 \times 16}{210} = \frac{80}{210} = \frac{8}{21}$$

$$P(A) = 1 - \frac{8}{21} = \frac{13}{21}$$

（2）恰好配成两双：从 5 双中选 2 双，$\dbinom{5}{2} = 10$。

$$P = \frac{10}{210} = \frac{1}{21}$$

### 例题4

从 $1, 2, \cdots, n$ 中任取两个数，求这两个数之和为偶数的概率。

**解**：两数之和为偶数，当且仅当两数同为奇数或同为偶数。

设 $n$ 中有 $k$ 个奇数和 $n - k$ 个偶数：

- 当 $n$ 为偶数时，$k = \dfrac{n}{2}$，$P = \dfrac{\binom{n/2}{2} + \binom{n/2}{2}}{\binom{n}{2}} = \dfrac{2 \cdot \frac{n/2(n/2-1)}{2}}{\frac{n(n-1)}{2}} = \dfrac{n-2}{2(n-1)}$

- 当 $n$ 为奇数时，$k = \dfrac{n+1}{2}$，$P = \dfrac{\binom{(n+1)/2}{2} + \binom{(n-1)/2}{2}}{\binom{n}{2}} = \dfrac{n-1}{2n}$

## 3. 几何概型

### 例题5

在区间 $(0, 1)$ 中随机取两个数 $x$ 和 $y$，求 $xy < \dfrac{1}{4}$ 的概率。

**解**：$\Omega = \{(x, y) \mid 0 < x < 1, 0 < y < 1\}$，$S(\Omega) = 1$。

事件 $A = \left\{(x, y) \mid xy < \dfrac{1}{4}, 0 < x < 1, 0 < y < 1\right\}$。

$$S(A) = \int_0^1 \min\left(1, \frac{1}{4x}\right) dx = \int_0^{1/4} 1 \, dx + \int_{1/4}^1 \frac{1}{4x} dx = \frac{1}{4} + \frac{1}{4}[\ln x]_{1/4}^1 = \frac{1}{4} + \frac{1}{4}\ln 4$$

$$P(A) = \frac{1}{4} + \frac{1}{4}\ln 4 = \frac{1 + \ln 4}{4} \approx 0.597$$

### 例题6

甲乙两船都要在同一个泊位停靠，甲船停靠时间为 1 小时，乙船停靠时间为 2 小时。设两船在一昼夜内到达的时刻是等可能的，求两船都不需要等待的概率。

**解**：设甲船到达时刻为 $x$，乙船到达时刻为 $y$，$0 \leq x, y \leq 24$。

两船不需要等待的条件：$y \geq x + 1$ 或 $x \geq y + 2$。

$$S(\Omega) = 24^2 = 576$$

$$S(A) = \frac{1}{2}(23)^2 + \frac{1}{2}(22)^2 = \frac{529 + 484}{2} = \frac{1013}{2}$$

$$P(A) = \frac{1013/2}{576} = \frac{1013}{1152} \approx 0.879$$

## 4. 条件概率与乘法公式

### 例题7

袋中有 3 个红球和 2 个白球，每次取一个球，取后不放回，求第三次才取到白球的概率。

**解**：设 $A_i$ 为第 $i$ 次取到红球，$B$ 为第三次取到白球。

$$P(B) = P(A_1 A_2 \bar{A}_3) = P(A_1) \cdot P(A_2 \mid A_1) \cdot P(\bar{A}_3 \mid A_1 A_2) = \frac{3}{5} \times \frac{2}{4} \times \frac{2}{3} = \frac{1}{5}$$

### 例题8

已知 $P(A) = \dfrac{1}{4}$，$P(B \mid A) = \dfrac{1}{3}$，$P(A \mid B) = \dfrac{1}{2}$，求 $P(A \cup B)$。

**解**：

$$P(AB) = P(A) \cdot P(B \mid A) = \frac{1}{4} \times \frac{1}{3} = \frac{1}{12}$$

$$P(B) = \frac{P(AB)}{P(A \mid B)} = \frac{1/12}{1/2} = \frac{1}{6}$$

$$P(A \cup B) = P(A) + P(B) - P(AB) = \frac{1}{4} + \frac{1}{6} - \frac{1}{12} = \frac{3 + 2 - 1}{12} = \frac{1}{3}$$

## 5. 全概率公式与贝叶斯公式

### 例题9

有三箱同型号产品，分别装有 10 件、15 件、20 件，其中一等品分别为 7 件、10 件、14 件。现从三箱中随机取一箱，再从该箱中随机取一件，求取到一等品的概率。

**解**：设 $B_i$ 为取到第 $i$ 箱（$i = 1, 2, 3$），$A$ 为取到一等品。

$$P(A) = \sum_{i=1}^{3} P(B_i) P(A \mid B_i) = \frac{1}{3} \times \frac{7}{10} + \frac{1}{3} \times \frac{10}{15} + \frac{1}{3} \times \frac{14}{20} = \frac{1}{3}\left(\frac{7}{10} + \frac{2}{3} + \frac{7}{10}\right) = \frac{1}{3} \times \frac{61}{30} = \frac{61}{90}$$

### 例题10

某地区肝癌发病率为 0.0004，现有一种化验方法，患肝癌者化验结果为阳性的概率为 0.95，非肝癌者化验结果为阴性的概率为 0.90。若某人化验结果为阳性，求其确患肝癌的概率。

**解**：设 $D$ 为"患肝癌"，$+$ 为"化验阳性"。

$$P(D \mid +) = \frac{P(D) P(+ \mid D)}{P(D) P(+ \mid D) + P(\bar{D}) P(+ \mid \bar{D})} = \frac{0.0004 \times 0.95}{0.0004 \times 0.95 + 0.9996 \times 0.10}$$

$$= \frac{0.00038}{0.00038 + 0.09996} = \frac{0.00038}{0.10034} \approx 0.00379$$

即使化验为阳性，患肝癌的概率也仅约 0.38%，说明低患病率下单次检验的阳性预测值很低。

## 6. 事件的独立性

### 例题11

设 $P(A) = 0.4$，$P(A \cup B) = 0.7$，在下列两种情况下求 $P(B)$：

（1）$A$ 与 $B$ 互斥；

（2）$A$ 与 $B$ 独立。

**解**：

（1）$A$ 与 $B$ 互斥：$P(A \cup B) = P(A) + P(B)$

$$P(B) = 0.7 - 0.4 = 0.3$$

（2）$A$ 与 $B$ 独立：$P(A \cup B) = P(A) + P(B) - P(A)P(B)$

$$0.7 = 0.4 + P(B) - 0.4P(B) = 0.4 + 0.6P(B)$$

$$P(B) = \frac{0.3}{0.6} = 0.5$$

### 例题12

三人独立地去破译一份密码，他们能译出的概率分别为 $\dfrac{1}{5}, \dfrac{1}{3}, \dfrac{1}{4}$，问密码被译出的概率是多少？

**解**：

$$P(\text{被译出}) = 1 - P(\text{都未译出}) = 1 - \left(1 - \frac{1}{5}\right)\left(1 - \frac{1}{3}\right)\left(1 - \frac{1}{4}\right) = 1 - \frac{4}{5} \times \frac{2}{3} \times \frac{3}{4} = 1 - \frac{2}{5} = \frac{3}{5}$$

## 7. 综合题

### 例题13

某工厂有甲、乙、丙三台机器生产螺丝钉，产量分别占总产量的 25%、35%、40%，各台机器的次品率分别为 5%、4%、2%。现从全部产品中任取一件，发现是次品，求它是甲机器生产的概率。

**解**：

$$P(\text{甲} \mid \text{次品}) = \frac{0.25 \times 0.05}{0.25 \times 0.05 + 0.35 \times 0.04 + 0.40 \times 0.02} = \frac{0.0125}{0.0125 + 0.014 + 0.008} = \frac{0.0125}{0.0345} = \frac{25}{69}$$

### 例题14

甲袋中有 2 个白球和 3 个黑球，乙袋中有 4 个白球和 1 个黑球。从甲袋中任取一球放入乙袋，再从乙袋中任取一球，求取到白球的概率。

**解**：设 $A$ 为"从甲袋取到白球"，$B$ 为"从乙袋取到白球"。

$$P(B) = P(A) P(B \mid A) + P(\bar{A}) P(B \mid \bar{A})$$

$$= \frac{2}{5} \times \frac{5}{6} + \frac{3}{5} \times \frac{4}{6} = \frac{10}{30} + \frac{12}{30} = \frac{22}{30} = \frac{11}{15}$$

### 例题15

证明：若 $P(A \mid B) > P(A)$，则 $P(B \mid A) > P(B)$。

**证明**：由 $P(A \mid B) > P(A)$ 得

$$\frac{P(AB)}{P(B)} > P(A) \implies P(AB) > P(A)P(B)$$

因此

$$P(B \mid A) = \frac{P(AB)}{P(A)} > \frac{P(A)P(B)}{P(A)} = P(B)$$

这说明"正相关性"是对称的：$A$ 促进 $B$ 等价于 $B$ 促进 $A$。
