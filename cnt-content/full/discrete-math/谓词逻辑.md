---
order: 2
title: 谓词逻辑
module: 'discrete-math'
category: 离散数学
difficulty: intermediate
description: 量词、谓词公式、等值演算、前束范式、推理理论、一阶逻辑形式化。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'discrete-math/命题逻辑'
  - 'discrete-math/集合与关系'
  - 'discrete-math/函数与基数'
prerequisites: []
---

## 1. 量词与谓词

### 1.1 谓词

**谓词**表示个体的性质或个体间的关系。

- 一元谓词 $P(x)$：$x$ 具有性质 $P$
- 二元谓词 $P(x, y)$：$x$ 和 $y$ 具有关系 $P$
- $n$ 元谓词 $P(x_1, x_2, \ldots, x_n)$

**论域（个体域）**：个体变元的取值范围。

### 1.2 量词

**全称量词** $\forall$：$\forall x\,P(x)$ 表示"对所有 $x$，$P(x)$ 成立"。

**存在量词** $\exists$：$\exists x\,P(x)$ 表示"存在 $x$，使得 $P(x)$ 成立"。

### 1.3 量词与联结词的关系

在有限论域 $D = \{a_1, a_2, \ldots, a_n\}$ 上：

$$\forall x\,P(x) \Leftrightarrow P(a_1) \land P(a_2) \land \cdots \land P(a_n)$$

$$\exists x\,P(x) \Leftrightarrow P(a_1) \lor P(a_2) \lor \cdots \lor P(a_n)$$

### 1.4 量词的否定

$$\neg\forall x\,P(x) \Leftrightarrow \exists x\,\neg P(x)$$

$$\neg\exists x\,P(x) \Leftrightarrow \forall x\,\neg P(x)$$

**例**：$\neg\forall x(P(x) \to Q(x)) \Leftrightarrow \exists x\,\neg(P(x) \to Q(x)) \Leftrightarrow \exists x(P(x) \land \neg Q(x))$

## 2. 谓词公式

### 2.1 项与公式

**项**的递归定义：

1. 个体常量和个体变元是项
2. 若 $f$ 是 $n$ 元函数符号，$t_1, \ldots, t_n$ 是项，则 $f(t_1, \ldots, t_n)$ 是项

**原子公式**：$P(t_1, \ldots, t_n)$，其中 $P$ 是谓词符号，$t_i$ 是项。

**合式公式**：由原子公式通过联结词和量词递归构造。

### 2.2 自由变元与约束变元

- **约束变元**：出现在量词作用范围内的变元，如 $\forall x\,P(x)$ 中的 $x$
- **自由变元**：不受量词约束的变元，如 $P(x) \land \forall y\,Q(y)$ 中的 $x$

**闭公式**：不含自由变元的公式。

### 2.3 量词的辖域

$\forall x\,P(x) \land Q(x)$ 中 $\forall x$ 的辖域仅为 $P(x)$，$Q(x)$ 中的 $x$ 是自由的。

### 2.4 约束变元换名

可将约束变元换名为不出现在公式中的其他变元：

$$\forall x\,P(x, y) \Leftrightarrow \forall z\,P(z, y)$$

## 3. 等值演算

### 3.1 基本等值式

**量词德摩根律**：

$$\neg\forall x\,A \Leftrightarrow \exists x\,\neg A, \quad \neg\exists x\,A \Leftrightarrow \forall x\,\neg A$$

**量词分配律**：

$$\forall x(A \land B) \Leftrightarrow \forall x\,A \land \forall x\,B$$

$$\exists x(A \lor B) \Leftrightarrow \exists x\,A \lor \exists x\,B$$

**注意**：$\forall x(A \lor B) \not\Leftrightarrow \forall x\,A \lor \forall x\,B$，$\exists x(A \land B) \not\Leftrightarrow \exists x\,A \land \exists x\,B$

**量词与蕴含**：

$$\forall x\,A \to B \Leftrightarrow \exists x(A \to B) \quad (x \text{ 不在 } B \text{ 中自由出现})$$

$$\exists x\,A \to B \Leftrightarrow \forall x(A \to B) \quad (x \text{ 不在 } B \text{ 中自由出现})$$

$$A \to \forall x\,B \Leftrightarrow \forall x(A \to B) \quad (x \text{ 不在 } A \text{ 中自由出现})$$

$$A \to \exists x\,B \Leftrightarrow \exists x(A \to B) \quad (x \text{ 不在 } A \text{ 中自由出现})$$

### 3.2 量词的顺序

$$\forall x\,\forall y\,P(x,y) \Leftrightarrow \forall y\,\forall x\,P(x,y)$$

$$\exists x\,\exists y\,P(x,y) \Leftrightarrow \exists y\,\exists x\,P(x,y)$$

**不同量词不可交换**：$\forall x\,\exists y\,P(x,y) \not\Leftrightarrow \exists y\,\forall x\,P(x,y)$

**例**：$\forall x\,\exists y\,(x + y = 0)$ 为真（对每个 $x$，取 $y = -x$），但 $\exists y\,\forall x\,(x + y = 0)$ 为假（不存在一个 $y$ 对所有 $x$ 满足 $x + y = 0$）。

## 4. 前束范式

### 4.1 定义

**前束范式**：所有量词都在公式最前面的等值形式，形如

$$Q_1 x_1\,Q_2 x_2 \cdots Q_n x_n\,B$$

其中 $Q_i \in \{\forall, \exists\}$，$B$ 为不含量词的公式（称为**母式**）。

### 4.2 求前束范式的步骤

1. 消去 $\to$ 和 $\leftrightarrow$
2. 将 $\neg$ 内移至原子公式前
3. 约束变元换名（使不同量词使用不同变元名）
4. 将量词前移

**例**：求 $\neg\forall x\,P(x) \to \exists x\,Q(x)$ 的前束范式。

> 1. $\neg\forall x\,P(x) \to \exists x\,Q(x) \Leftrightarrow \neg\neg\forall x\,P(x) \lor \exists x\,Q(x) \Leftrightarrow \forall x\,P(x) \lor \exists x\,Q(x)$
> 2. 换名：$\forall x\,P(x) \lor \exists y\,Q(y)$
> 3. 量词前移：$\forall x\exists y\,(P(x) \lor Q(y))$

### 4.3 Skolem 范式

将前束范式中的存在量词用 Skolem 函数消去：

- $\exists x$ 前面有 $\forall y_1, \ldots, \forall y_k$：用 $f(y_1, \ldots, y_k)$ 替换 $x$
- $\exists x$ 前面无全称量词：用常量 $c$ 替换 $x$

**例**：$\forall x\exists y\,(P(x,y))$ 的 Skolem 化：用 $f(x)$ 替换 $y$，得 $\forall x\,P(x, f(x))$。

## 5. 推理理论

### 5.1 推理规则

**全称量词消去（UI）**：$\forall x\,A(x) \vdash A(c)$（$c$ 为论域中任意个体）

**全称量词引入（UG）**：$A(c)$（$c$ 为任意个体）$\vdash \forall x\,A(x)$

**存在量词消去（EI）**：$\exists x\,A(x) \vdash A(c)$（$c$ 为特定个体，不能是已有常量）

**存在量词引入（EG）**：$A(c) \vdash \exists x\,A(x)$

### 5.2 推理注意事项

- EI 必须在 UI 之前使用
- EI 引入的常量不能在其他前提中出现
- UG 要求变元是任意的

**例**：前提 $\forall x(P(x) \to Q(x))$，$\exists x\,P(x)$。结论 $\exists x\,Q(x)$。

> 1. $\exists x\,P(x)$（前提）
> 2. $P(a)$（EI，1）
> 3. $\forall x(P(x) \to Q(x))$（前提）
> 4. $P(a) \to Q(a)$（UI，3）
> 5. $Q(a)$（MP，2, 4）
> 6. $\exists x\,Q(x)$（EG，5）

## 6. 一阶逻辑形式化

### 6.1 形式化步骤

1. 确定论域
2. 定义谓词
3. 将自然语言翻译为谓词公式

**例**：将"所有实数都大于或等于某个整数"形式化。

> 论域：实数集 $\mathbb{R}$
> 谓词：$G(x,y)$ 表示 $x \geq y$，$Z(x)$ 表示 $x$ 是整数
> $$\forall x\,\exists y\,(Z(y) \land G(x,y))$$

**例**：将"存在唯一的 $x$ 使得 $P(x)$ 成立"形式化。

> $$\exists x\left(P(x) \land \forall y(P(y) \to y = x)\right)$$
> 也可记为 $\exists! x\,P(x)$。

### 6.2 常见形式化模式

| 自然语言              | 形式化                            |
| --------------------- | --------------------------------- |
| 所有 $A$ 都是 $B$     | $\forall x(A(x) \to B(x))$        |
| 有些 $A$ 是 $B$       | $\exists x(A(x) \land B(x))$      |
| 没有 $A$ 是 $B$       | $\forall x(A(x) \to \neg B(x))$   |
| 并非所有 $A$ 都是 $B$ | $\exists x(A(x) \land \neg B(x))$ |

**注意**："所有 $A$ 都是 $B$" 形式化为 $\forall x(A(x) \to B(x))$，而非 $\forall x(A(x) \land B(x))$。后者要求论域中所有元素都是 $A$ 且都是 $B$。

### 6.3 嵌套量词的理解

$$\forall x\,\exists y\,L(x,y)$$

"每个人都爱某个人"——对每个人，都存在一个人被他爱。

$$\exists y\,\forall x\,L(x,y)$$

"有一个人被所有人爱"——存在一个人，所有人都爱他。

两者的逻辑强度不同，后者更强。
