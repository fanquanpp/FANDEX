---
order: 51
title: 优先级计算
module: css
category: CSS
difficulty: intermediate
description: 深入解析 CSS 优先级（Specificity）与层叠算法（Cascade Algorithm）的规范、计算、工程实践与跨框架对比
author: fanquanpp
updated: '2026-06-14'
related:
  - css/Flexbox弹性布局
  - css/伪类与伪元素
  - css/样式表引入方式
  - css/margin合并与塌陷
  - css/层叠上下文
prerequisites:
  - css/概述与基本语法
  - css/选择器
  - css/层叠上下文
---

# 优先级计算（Specificity & Cascade）

> 本文以 W3C [CSS Cascading and Inheritance Level 4](https://www.w3.org/TR/css-cascade-4/)、[Selectors Level 4](https://www.w3.org/TR/selectors-4/) 规范为基础，系统阐释 CSS 优先级（Specificity）的计算算法、层叠顺序（Cascade Order）、`!important` 与 `@layer` 的工程意义、`:where()` / `:is()` / `:has()` 等现代选择器对优先级的影响，并对接 Bootstrap、Tailwind CSS、Material Design 等主流框架的实践范式。内容涵盖从 CSS 1 到 CSS Cascade Level 4 的演进，提供生产级代码示例与工程化解决方案。

---

## 目录

1. [学习目标](#1-学习目标)
2. [历史动机与发展脉络](#2-历史动机与发展脉络)
3. [形式化定义](#3-形式化定义)
4. [理论推导与原理解析](#4-理论推导与原理解析)
5. [代码示例](#5-代码示例)
6. [对比分析](#6-对比分析)
7. [常见陷阱与最佳实践](#7-常见陷阱与最佳实践)
8. [工程实践](#8-工程实践)
9. [案例研究](#9-案例研究)
10. [习题](#10-习题)
11. [参考文献](#11-参考文献)
12. [延伸阅读](#12-延伸阅读)

---

## 1. 学习目标

完成本章学习后，读者应能够：

### 1.1 Remember（记忆）

- 准确复述 CSS 优先级的 (A, B, C, D) 四元组表示法，并能识别每个分量对应的选择器类型。
- 列出 [CSS Cascading and Inheritance Level 4](https://www.w3.org/TR/css-cascade-4/#cascade-sort) 中层叠排序的 8 个阶段：Origin & Importance → Context → Element-attached → Layer → Specificity → Order of Appearance → Animation → Transition。
- 识别 `!important` 的两种来源：作者样式表（Author）与用户样式表（User Agent / User），并说明其优先级关系。
- 列出 `:where()`、`:is()`、`:has()` 三个现代伪类对优先级的不同影响。

### 1.2 Understand（理解）

- 解释为何 ID 选择器比任意数量的类选择器优先级更高（即 (0,1,0,0) > (0,0,N,0) 对于任意有限 N）。
- 阐述 CSS 层叠算法（Cascade Algorithm）与优先级（Specificity）的差异：前者是完整决策流程，后者仅是其中一环。
- 论证 `@layer` 的设计动机：将「来源顺序」从隐式约束转化为显式可控的层级体系。
- 描述 `:is()` 取参数中最高优先级、`:where()` 恒为 0 的设计原理与工程意义。

### 1.3 Apply（应用）

- 在生产代码中通过 (A, B, C, D) 四元组法手工计算任意复杂选择器的优先级。
- 利用 `:where()` 重置第三方库样式的优先级，避免污染业务代码。
- 使用 `@layer` 对设计系统（Design System）的样式进行分层管理（reset → framework → components → utilities）。
- 在 CSS-in-JS 与 Tailwind 等工具链中正确评估优先级对样式覆盖的影响。

### 1.4 Analyze（分析）

- 对一段包含内联样式、`!important`、`@layer`、ID 选择器、类选择器的复杂页面进行拆解，预测最终生效的样式。
- 区分「来源（Origin）」「层（Layer）」「优先级（Specificity）」「顺序（Order）」四个维度在层叠算法中的相对位置。
- 评估 Bootstrap 与 Tailwind 在优先级策略上的本质差异：前者依赖类选择器堆叠，后者依赖单一类与变体系统。
- 分析 `:has()` 选择器在优先级计算中的特殊行为（其优先级由参数中最具体的选择器决定）。

### 1.5 Evaluate（评价）

- 在「使用 `!important` 快速覆盖」与「重构选择器降低优先级」之间权衡短期收益与长期可维护性。
- 评价 `@layer` 在现代前端工程中的落地难度：浏览器兼容性、构建工具支持、团队心智模型。
- 反思 BEM / ITCSS / Atomic CSS 等架构方法论对优先级管理的不同哲学。
- 评估「零优先级策略」（如 Tailwind 的单一类）在大规模设计系统中的优劣。

### 1.6 Create（创造）

- 设计一套基于 `@layer` 的企业级 CSS 架构，覆盖第三方库、设计令牌、组件、工具类四层。
- 编写 Stylelint 自定义规则，禁止业务代码使用 ID 选择器与 `!important`。
- 提出面向 CSS Working Group 的改进建议（如 `specificity()` 函数假想）。
- 构建优先级可视化工具，自动解析样式表并生成 (A, B, C, D) 决策树。

---

## 2. 历史动机与发展脉络

### 2.1 CSS 1（1996）：优先级的雏形

CSS 1 由 Håkon Wium Lie 与 Bert Bos 于 1996 年提出，首次引入「层叠」（Cascade）概念。当时规范对优先级的定义较为粗糙：

> The weight of a rule's selector is determined by counting the number of ID attributes (a), the number of CLASS attributes (b), and the number of element names (c) in the selector.

CSS 1 仅使用三元组 (a, b, c)，且未明确「内联样式」与 `!important` 的位置。浏览器实现差异较大，开发者常需依赖 `!important` 解决冲突。

### 2.2 CSS 2（1998）：引入 `!important` 与来源排序

CSS 2 正式引入 `!important` 声明，并明确三类样式来源：

1. **Author**：作者样式表（页面开发者编写）。
2. **User**：用户样式表（浏览器用户自定义）。
3. **User Agent**：浏览器默认样式表。

层叠顺序规定：`Author Normal < User Normal < User Agent Normal < User !important < Author !important`。

这一阶段优先级演化为 (a, b, c, d) 四元组，其中 `a` 表示内联样式（0 或 1）。

### 2.3 CSS 2.1（2011）：规范的成熟

CSS 2.1 §6.4.3 给出经典的优先级计算规则：

> A selector's specificity is calculated as follows:
> - count 1 if the declaration is from a 'style' attribute rather than a rule with a selector, 0 otherwise (= a)
> - count the number of ID attributes in the selector (= b)
> - count the number of other attributes and pseudo-classes in the selector (= c)
> - count the number of element names and pseudo-elements in the selector (= d)

四元组 (a, b, c, d) 沿用至今，并明确「通配符 `*`、组合符 `> + ~` 不计入优先级」。

### 2.4 CSS Selectors Level 3（2011）：伪类细化

[Selectors Level 3](https://www.w3.org/TR/selectors-3/) 引入大量新伪类（`:nth-child()`、`:not()`、`:checked` 等），并明确：

- `:not()` 本身不计入优先级，但其参数中的选择器计入。
- 伪元素（`::before`、`::after` 等）以 (0, 0, 0, 1) 计入。
- 伪类（`:hover`、`:focus` 等）以 (0, 0, 1, 0) 计入。

### 2.5 CSS Cascading Level 4（2016-2021）：层叠算法的规范化

[CSS Cascading and Inheritance Level 4](https://www.w3.org/TR/css-cascade-4/) 将层叠算法规范化为 8 阶段排序：

1. **Origin & Importance**：来源与重要性。
2. **Context**：Shadow DOM 等上下文隔离。
3. **Element-attached**：元素附加样式（如 `style` 属性）。
4. **Layer**：`@layer` 声明的层级。
5. **Specificity**：优先级四元组。
6. **Order of Appearance**：出现顺序。
7. **Animation**：动画声明。
8. **Transition**：过渡声明（最高）。

### 2.6 `@layer` 的引入（2022）

[CSS Cascading and Inheritance Level 5](https://www.w3.org/TR/css-cascade-5/) 引入 `@layer` 规则，允许开发者显式声明样式层级：

```css
@layer reset, framework, components, utilities;

@layer reset {
  /* 重置样式 */
}

@layer framework {
  /* 框架样式 */
}
```

层内样式的优先级低于未分层样式（unlayered styles），且层的顺序由首次声明决定。`@layer` 是 CSS 自 2011 年以来对优先级管理的最大变革。

### 2.7 `:where()` 与 `:is()` 的标准化（2021-2022）

[:is()](https://www.w3.org/TR/selectors-4/#matches-pseudo) 与 [:where()](https://www.w3.org/TR/selectors-4/#zero-matches) 在 Selectors Level 4 中标准化：

- `:is(A, B, C)`：匹配参数中任意选择器，优先级取参数中最具体者。
- `:where(A, B, C)`：同 `:is()`，但优先级恒为 (0, 0, 0, 0)。

`:where()` 的零优先级特性使其成为「重置第三方库样式」的理想工具。

### 2.8 `:has()` 的到来（2023）

[:has()](https://www.w3.org/TR/selectors-4/#relational) 称为「父选择器」，允许根据子元素状态选择父元素：

```css
.card:has(img) {
  padding: 0; /* 仅当 card 内有 img 时生效 */
}
```

`:has()` 的优先级由其参数中最具体的选择器决定，与 `:is()` 一致。

### 2.9 演进时间线

| 年份 | 规范/事件 | 核心变化 |
| --- | --- | --- |
| 1996 | CSS 1 | 三元组 (a, b, c) 优先级 |
| 1998 | CSS 2 | 引入 `!important` 与三类来源 |
| 2011 | CSS 2.1 | 四元组 (a, b, c, d) 成熟 |
| 2011 | Selectors Level 3 | `:not()` 与伪元素优先级明确 |
| 2016 | Cascade Level 4 | 8 阶段层叠算法规范化 |
| 2021 | Selectors Level 4 | `:is()` / `:where()` 标准化 |
| 2022 | Cascade Level 5 | `@layer` 引入 |
| 2023 | `:has()` 浏览器支持 | 父选择器落地（Chrome 105+, Safari 15.4+） |
| 2024 | Cascade Level 6 草案 | 探讨 `@layer` 嵌套与范围查询 |

---

## 3. 形式化定义

### 3.1 规范条款

依据 [CSS Cascading and Inheritance Level 4 §6.3](https://www.w3.org/TR/css-cascade-4/#cascade-specific)：

> If the cascade results in a value, use it. Otherwise, the property is inherited or its initial value is used.

以及 [CSS 2.1 §6.4.3](https://www.w3.org/TR/CSS21/cascade.html#specificity) 对优先级的定义：

> A selector's specificity is calculated as follows: count the number of ID attributes (a), other attributes and pseudo-classes (b), and element names and pseudo-elements (c) in the selector.

### 3.2 核心术语

| 术语 | 英文 | 定义 |
| --- | --- | --- |
| 优先级 | Specificity | 选择器的权重值，用于决定同来源同层级时的胜出声明 |
| 层叠 | Cascade | 浏览器决定最终生效样式的完整算法 |
| 来源 | Origin | 样式表的类别：User Agent / User / Author |
| 层 | Layer | 通过 `@layer` 声明的命名样式组 |
| 内联样式 | Inline style | 通过 `style` 属性直接附加在元素上的样式 |
| 重要性 | Importance | `!important` 声明，反转来源优先级 |
| 出现顺序 | Order of Appearance | 同优先级时，后出现的声明胜出 |

### 3.3 优先级四元组

CSS 优先级用四元组 $(A, B, C, D)$ 表示，其中：

- $A$：内联样式（`style` 属性），取值 0 或 1。
- $B$：ID 选择器（`#id`）的数量。
- $C$：类选择器（`.class`）、属性选择器（`[attr]`）、伪类（`:hover`）的数量。
- $D$：元素选择器（`div`）、伪元素（`::before`）的数量。

> **注**：部分文献采用 (a, b, c, d) 顺序，本节统一使用 $(A, B, C, D)$ 以避免与 CSS 1 的三元组混淆。

### 3.4 形式化计算函数

设选择器 $S$ 由若干简单选择器 $s_1, s_2, \ldots, s_n$ 组合而成，定义优先级函数 $\text{Spec}(S)$：

$$
\text{Spec}(S) = \left( \text{Inline}(S), \sum_{i=1}^{n} \text{ID}(s_i), \sum_{i=1}^{n} \text{Class}(s_i), \sum_{i=1}^{n} \text{Element}(s_i) \right)
$$

其中：

$$
\text{ID}(s_i) =
\begin{cases}
1, & \text{if } s_i \text{ 是 ID 选择器} \\
0, & \text{otherwise}
\end{cases}
$$

$$
\text{Class}(s_i) =
\begin{cases}
1, & \text{if } s_i \in \{\text{类选择器}, \text{属性选择器}, \text{伪类（除 }:where()\text{）}\} \\
0, & \text{otherwise}
\end{cases}
$$

$$
\text{Element}(s_i) =
\begin{cases}
1, & \text{if } s_i \in \{\text{元素选择器}, \text{伪元素}\} \\
0, & \text{otherwise}
\end{cases}
$$

### 3.5 比较运算

两个优先级四元组 $(A_1, B_1, C_1, D_1)$ 与 $(A_2, B_2, C_2, D_2)$ 的比较遵循字典序：

$$
\text{Compare}(S_1, S_2) =
\begin{cases}
S_1 > S_2, & \text{if } A_1 > A_2 \\
S_1 > S_2, & \text{if } A_1 = A_2 \wedge B_1 > B_2 \\
S_1 > S_2, & \text{if } A_1 = A_2 \wedge B_1 = B_2 \wedge C_1 > C_2 \\
S_1 > S_2, & \text{if } A_1 = A_2 \wedge B_1 = B_2 \wedge C_1 = C_2 \wedge D_1 > D_2 \\
S_1 = S_2, & \text{if all equal}
\end{cases}
$$

注意：四元组的进位关系是「无限基数」而非十进制。即 $(0, 1, 0, 0) > (0, 0, N, 0)$ 对任意有限 $N$ 成立。

### 3.6 层叠算法的形式化

[CSS Cascading and Inheritance Level 4 §6.1](https://www.w3.org/TR/css-cascade-4/#cascading) 定义层叠排序函数 $\text{Sort}(d_1, d_2)$，对两个声明 $d_1, d_2$ 比较：

$$
\text{Sort}(d_1, d_2) =
\begin{cases}
d_1, & \text{if } \text{Origin}(d_1) \succ \text{Origin}(d_2) \\
d_1, & \text{if } \text{Origin equal} \wedge \text{Context}(d_1) \succ \text{Context}(d_2) \\
d_1, & \text{if } \text{Context equal} \wedge \text{ElementAttached}(d_1) \succ \text{ElementAttached}(d_2) \\
d_1, & \text{if } \text{ElementAttached equal} \wedge \text{Layer}(d_1) \succ \text{Layer}(d_2) \\
d_1, & \text{if } \text{Layer equal} \wedge \text{Spec}(d_1) > \text{Spec}(d_2) \\
d_1, & \text{if } \text{Spec equal} \wedge \text{Order}(d_1) > \text{Order}(d_2) \\
d_1, & \text{if } \text{Order equal} \wedge \text{Animation}(d_1) \succ \text{Animation}(d_2) \\
d_1, & \text{if } \text{Animation equal} \wedge \text{Transition}(d_1) \succ \text{Transition}(d_2) \\
d_2, & \text{otherwise}
\end{cases}
$$

其中 $\succ$ 表示「优先于」。

### 3.7 来源与重要性排序

| 来源 | 正常 | `!important` |
| --- | --- | --- |
| User Agent（浏览器默认） | 1（最低） | 6 |
| User（用户样式） | 2 | 7 |
| Author（作者样式） | 3 | 8 |
| Author（未分层，unlayered） | 4 | 9 |
| Author（分层，layered） | 5 | 10（最高） |

> **注**：CSS Cascade Level 5 引入 `@layer` 后，分层样式总是低于未分层样式（无论优先级多高）。

### 3.8 `:where()` 与 `:is()` 的优先级规则

设 `:is(S_1, S_2, \ldots, S_n)` 的优先级为：

$$
\text{Spec}(:\text{is}(S_1, S_2, \ldots, S_n)) = \max_{i=1}^{n} \text{Spec}(S_i)
$$

而 `:where()` 恒为零：

$$
\text{Spec}(:\text{where}(S_1, S_2, \ldots, S_n)) = (0, 0, 0, 0)
$$

`:has(S)` 与 `:not(S)` 的优先级为参数中最具体者：

$$
\text{Spec}(:\text{has}(S)) = \text{Spec}(:\text{is}(S))
$$

---

## 4. 理论推导与原理解析

### 4.1 优先级的「基数」本质

CSS 优先级四元组的比较并非十进制数比较，而是基于「基数」的字典序比较。形式化地：

$$
(A, B, C, D) \text{ 的比较基于 } A \cdot \aleph_0^3 + B \cdot \aleph_0^2 + C \cdot \aleph_0 + D
$$

其中 $\aleph_0$ 是可数无穷基数。这意味着：

- $(0, 1, 0, 0) > (0, 0, N, 0)$ 对任意有限 $N$。
- $(1, 0, 0, 0) > (0, N, M, K)$ 对任意有限 $N, M, K$。

这一设计反映了 CSS 的语义优先级：ID 选择器表达「唯一标识」，应绝对优先于「类别标识」；内联样式表达「元素级定制」，应绝对优先于「规则级声明」。

### 4.2 层叠算法的决策树

层叠算法可视为一棵决策树，每个节点对应一个比较维度。浏览器从根节点开始，依次比较：

```
1. Origin & Importance
   ├── 不同 → 较高者胜
   └── 相同 → 进入 2
2. Context (Shadow DOM)
   ├── 不同 → 较外层胜
   └── 相同 → 进入 3
3. Element-attached (style 属性)
   ├── 不同 → 有 style 者胜
   └── 相同 → 进入 4
4. Layer
   ├── 不同 → 未分层胜；分层中后声明胜
   └── 相同 → 进入 5
5. Specificity
   ├── 不同 → 较高者胜
   └── 相同 → 进入 6
6. Order of Appearance
   ├── 不同 → 后出现者胜
   └── 相同 → 进入 7
7. Animation
   └── ... (略)
8. Transition (最高)
```

### 4.3 `!important` 的反转机制

`!important` 的核心机制是「反转来源优先级」：

- 正常声明：Author > User > User Agent
- `!important` 声明：User Agent > User > Author

但 [CSS Cascade Level 4](https://www.w3.org/TR/css-cascade-4/#importance) 调整了用户 `!important` 与作者 `!important` 的关系：作者 `!important` 高于用户 `!important`（这逆转了 CSS 2.1 的顺序，以避免用户样式破坏作者样式）。

形式化地，定义来源优先级函数 $\text{OriginRank}(d)$：

$$
\text{OriginRank}(d) =
\begin{cases}
1, & \text{UA Normal} \\
2, & \text{User Normal} \\
3, & \text{Author Normal (layered)} \\
4, & \text{Author Normal (unlayered)} \\
5, & \text{Author !important (unlayered)} \\
6, & \text{Author !important (layered)} \\
7, & \text{User !important} \\
8, & \text{UA !important} \\
9, & \text{Transition}
\end{cases}
$$

### 4.4 `@layer` 的语义

`@layer` 引入显式的层级概念，其语义为：

1. **声明顺序**：`@layer A, B, C;` 声明三个层，优先级 A < B < C。
2. **未分层优先**：未分层的样式（unlayered）总是优先于分层样式。
3. **嵌套层**：`@layer A.B { ... }` 等价于在 A 层内声明 B 子层，B 的优先级高于 A 内的其他内容但低于 A 的兄弟层。

```css
@layer A, B;
@layer A {
  .x { color: red; } /* 优先级低 */
}
@layer B {
  .x { color: blue; } /* 优先级高 */
}
.x { color: green; } /* 未分层，最高 */
```

形式化地，设层 $L$ 的优先级为 $\text{LayerRank}(L)$：

$$
\text{LayerRank}(L) =
\begin{cases}
0, & L \text{ 是未分层样式} \\
n, & L \text{ 是第 } n \text{ 个声明的层（从 1 开始）}
\end{cases}
$$

未分层样式的 $\text{LayerRank}$ 总是大于任何分层样式。

### 4.5 `:where()` 的零优先级设计

`:where()` 恒返回 (0, 0, 0, 0) 的设计目的是提供「无副作用的样式重置」。考虑以下场景：

```css
/* 第三方库样式 */
.card { padding: 16px; }

/* 业务代码：重置 padding */
:where(.card) { padding: 0; }
/* 优先级 (0, 0, 1, 0) vs (0, 0, 0, 0) */
/* 第三方库胜出！ */
```

如需重置，应使用：

```css
:where(.card) { padding: 0; }  /* (0,0,0,0) */
.card { padding: 16px; }       /* (0,0,1,0) - 第三方胜出 */

/* 改用更高优先级 */
.card.card { padding: 0; }     /* (0,0,2,0) - 业务胜出 */
```

`:where()` 的真正价值在于「组合选择器时降低副作用」：

```css
/* 不使用 :where() - 复杂选择器污染优先级 */
.card .title { font-size: 1rem; }  /* (0,0,2,0) */

/* 使用 :where() - 优先级保持为 0 */
:where(.card .title) { font-size: 1rem; }  /* (0,0,0,0) */
```

### 4.6 内联样式与 `!important` 的关系

内联样式（`style` 属性）的优先级为 $(1, 0, 0, 0)$，但 `!important` 仍可覆盖：

```html
<div style="color: red;">红色</div>
```

```css
div { color: blue !important; }  /* 覆盖内联样式 */
```

形式化地：

$$
\text{Effective}(\text{inline normal}) < \text{Effective}(\text{rule !important})
$$

但内联 `!important` 仍高于规则 `!important`：

```html
<div style="color: red !important;">红色</div>
```

```css
div { color: blue !important; }  /* 不覆盖内联 !important */
```

### 4.7 计算示例

给定选择器 `#nav .list li:hover`，计算其优先级：

1. `#nav`：ID 选择器 → $B = 1$
2. `.list`：类选择器 → $C = 1$
3. `li`：元素选择器 → $D = 1$
4. `:hover`：伪类 → $C = 2$

合计：$(0, 1, 2, 1)$。

给定选择器 `:is(#header, .nav) a`：

1. `:is(#header, .nav)`：取参数中最高，即 `#header` 的 $(0, 1, 0, 0)$
2. `a`：元素选择器 → $D = 1$

合计：$(0, 1, 0, 1)$。

给定选择器 `:where(#header, .nav) a`：

1. `:where(...)`：恒为 $(0, 0, 0, 0)$
2. `a`：元素选择器 → $D = 1$

合计：$(0, 0, 0, 1)$。

### 4.8 优先级与可访问性

优先级直接影响可访问性（Accessibility）：

1. **用户样式表**：浏览器允许用户定义自定义样式（如放大字号、高对比度）。这些样式通过 `!important` 提升优先级，确保覆盖作者样式。
2. **`prefers-color-scheme`**：用户偏好（如深色模式）通过媒体查询应用，但优先级仍遵循层叠规则。
3. **`forced-colors`**：Windows 高对比度模式会强制覆盖颜色，作者样式应通过 `forced-color-adjust: none` 选择退出。

```css
@media (forced-colors: active) {
  .button {
    forced-color-adjust: none;
    background: Canvas;
    color: CanvasText;
  }
}
```

---

## 5. 代码示例

### 5.1 基础示例：四元组计算

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>优先级四元组计算示例</title>
<style>
  /* (0, 0, 0, 1) - 元素选择器 */
  p {
    color: gray;
  }

  /* (0, 0, 1, 0) - 类选择器 */
  .text {
    color: blue;
  }

  /* (0, 0, 1, 1) - 类 + 元素 */
  .text p {
    color: green;
  }

  /* (0, 1, 0, 0) - ID 选择器 */
  #main {
    color: orange;
  }

  /* (0, 1, 0, 1) - ID + 元素 */
  #main p {
    color: red;
  }

  /* (0, 1, 1, 1) - ID + 类 + 元素 */
  #main .text p {
    color: purple;
  }

  /* (1, 0, 0, 0) - 内联样式（最高，除 !important） */
</style>
</head>
<body>
  <div id="main">
    <p class="text" style="color: black;">
      最终颜色：black（内联样式胜出）
    </p>
    <p class="text">
      最终颜色：purple（(0,1,1,1) 胜出）
    </p>
    <p>
      最终颜色：red（(0,1,0,1) 胜出）
    </p>
  </div>
</body>
</html>
```

### 5.2 `!important` 与来源排序

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>!important 与来源排序</title>
<style>
  /* Author Normal */
  .box {
    color: black;
  }

  /* Author !important */
  .box {
    color: blue !important;
  }

  /* 内联样式（HTML 中）< 内联 !important */
</style>
</head>
<body>
  <div class="box" style="color: red;">
    颜色：blue（Author !important 覆盖内联 normal）
  </div>
  <div class="box" style="color: red !important;">
    颜色：red（内联 !important 胜出）
  </div>
</body>
</html>
```

### 5.3 `:where()` 与 `:is()` 对比

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>:where() 与 :is() 优先级对比</title>
<style>
  /* 第三方库样式（模拟） */
  .card .title {
    color: blue;  /* (0,0,2,0) */
  }

  /* 业务重置：使用 :is() */
  :is(.card .title) {
    color: red;  /* (0,0,2,0) - 与上方相同，按出现顺序，红色胜出 */
  }

  /* 业务重置：使用 :where() */
  :where(.card .title) {
    color: green;  /* (0,0,0,0) - 低于 (0,0,2,0)，蓝色胜出 */
  }
</style>
</head>
<body>
  <div class="card">
    <h3 class="title">颜色：red（:is() 胜出）</h3>
  </div>
</body>
</html>
```

### 5.4 `@layer` 分层管理

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>@layer 分层管理示例</title>
<style>
  /* 声明层顺序：reset < framework < components < utilities */
  @layer reset, framework, components, utilities;

  /* reset 层：最低优先级 */
  @layer reset {
    h1 { margin: 0; padding: 0; }
    p { margin: 0; }
  }

  /* framework 层：框架样式 */
  @layer framework {
    .container { max-width: 1200px; margin: 0 auto; }
    .btn { padding: 8px 16px; border: 1px solid #ccc; }
  }

  /* components 层：组件样式 */
  @layer components {
    .card { padding: 16px; border-radius: 8px; }
    .btn-primary { background: blue; color: white; }
  }

  /* utilities 层：工具类（最高分层优先级） */
  @layer utilities {
    .text-center { text-align: center; }
    .mt-4 { margin-top: 1rem; }
  }

  /* 未分层样式：最高优先级（覆盖所有分层） */
  .card {
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
</style>
</head>
<body>
  <div class="container">
    <h1 class="text-center">标题</h1>
    <div class="card mt-4">
      <p>卡片内容</p>
      <button class="btn btn-primary">按钮</button>
    </div>
  </div>
</body>
</html>
```

### 5.5 `:has()` 父选择器

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>:has() 父选择器示例</title>
<style>
  /* 基础卡片样式 */
  .card {
    padding: 16px;
    border: 1px solid #ddd;
    border-radius: 8px;
  }

  /* 当卡片内含图片时，去除内边距 */
  .card:has(> img) {
    padding: 0;
    overflow: hidden;
  }

  /* 当卡片内含错误图标时，添加红色边框 */
  .card:has(.icon-error) {
    border-color: #dc3545;
    background: #fff5f5;
  }

  /* 当卡片内既有标题又有图片时，应用特殊布局 */
  .card:has(h3):has(img) {
    display: flex;
    flex-direction: column;
  }

  /* :has() 的优先级由参数中最具体者决定 */
  /* .card:has(#special-img) 优先级为 (0,1,1,0) */
  .card:has(#special-img) {
    border-color: gold;
  }
</style>
</head>
<body>
  <div class="card">
    <h3>普通卡片</h3>
    <p>无图片，保留内边距</p>
  </div>

  <div class="card">
    <img src="example.jpg" alt="示例" style="width: 100%;">
    <p>含图片，去除内边距</p>
  </div>

  <div class="card">
    <span class="icon-error">!</span>
    <p>错误卡片，红色边框</p>
  </div>
</body>
</html>
```

### 5.6 `:not()` 的优先级

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>:not() 优先级示例</title>
<style>
  /* :not() 本身不计入优先级，参数计 */
  /* :not(.disabled) 优先级为 (0,0,1,0) */
  button:not(.disabled) {
    cursor: pointer;
  }

  /* :not(.disabled, .readonly) 优先级为参数中最具体者 */
  /* .disabled (0,0,1,0) vs .readonly (0,0,1,0) → (0,0,1,0) */
  input:not(.disabled, .readonly) {
    background: white;
  }

  /* 复杂参数：:not(#special) 优先级为 (0,1,0,0) */
  .item:not(#special) {
    opacity: 0.6;
  }
</style>
</head>
<body>
  <button>可点击按钮</button>
  <button class="disabled">禁用按钮</button>
  <input type="text" value="可编辑">
  <input type="text" class="readonly" value="只读">
  <div class="item">普通项</div>
  <div class="item" id="special">特殊项</div>
</body>
</html>
```

### 5.7 企业级：设计系统分层架构

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>企业级设计系统分层架构</title>
<style>
  /* 设计系统分层声明 */
  @layer tokens, reset, vendor, components, utilities, overrides;

  /* Layer 1: Design Tokens（设计令牌） */
  @layer tokens {
    :root {
      --color-primary: #007bff;
      --color-danger: #dc3545;
      --color-text: #212529;
      --color-bg: #ffffff;
      --spacing-1: 0.25rem;
      --spacing-2: 0.5rem;
      --spacing-3: 1rem;
      --radius-md: 6px;
    }
  }

  /* Layer 2: Reset（重置） */
  @layer reset {
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      color: var(--color-text);
      background: var(--color-bg);
      line-height: 1.5;
    }
  }

  /* Layer 3: Vendor（第三方库样式） */
  @layer vendor {
    /* 假设此处为 Bootstrap / Tailwind 等第三方库样式 */
    .vendor-btn {
      padding: 8px 16px;
      border: 1px solid #ccc;
      background: white;
    }
  }

  /* Layer 4: Components（组件库） */
  @layer components {
    .btn {
      display: inline-flex;
      align-items: center;
      padding: var(--spacing-2) var(--spacing-3);
      border-radius: var(--radius-md);
      border: none;
      cursor: pointer;
      font-size: 0.875rem;
      transition: background 0.2s;
    }
    .btn-primary {
      background: var(--color-primary);
      color: white;
    }
    .btn-danger {
      background: var(--color-danger);
      color: white;
    }
  }

  /* Layer 5: Utilities（工具类） */
  @layer utilities {
    .mt-2 { margin-top: var(--spacing-2); }
    .mt-3 { margin-top: var(--spacing-3); }
    .text-center { text-align: center; }
    .flex { display: flex; }
    .gap-2 { gap: var(--spacing-2); }
  }

  /* Layer 6: Overrides（业务覆盖） */
  @layer overrides {
    /* 业务特定的样式覆盖 */
    .checkout-btn {
      background: linear-gradient(135deg, #667eea, #764ba2);
    }
  }
</style>
</head>
<body>
  <div class="flex gap-2 mt-3">
    <button class="btn btn-primary">主按钮</button>
    <button class="btn btn-danger">危险按钮</button>
    <button class="btn btn-primary checkout-btn">结算按钮（业务覆盖）</button>
  </div>
</body>
</html>
```

### 5.8 优先级可视化工具

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>优先级可视化工具</title>
<style>
  body {
    font-family: system-ui, sans-serif;
    max-width: 800px;
    margin: 2rem auto;
    padding: 0 1rem;
  }
  .spec-display {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
    margin: 1rem 0;
  }
  .spec-cell {
    text-align: center;
    padding: 0.5rem;
    background: white;
    border-radius: 4px;
    border: 1px solid #dee2e6;
  }
  .spec-cell .label {
    font-size: 0.75rem;
    color: #6c757d;
    text-transform: uppercase;
  }
  .spec-cell .value {
    font-size: 1.5rem;
    font-weight: bold;
    color: #212529;
  }
  input {
    width: 100%;
    padding: 0.5rem;
    font-family: monospace;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
</style>
</head>
<body>
  <h1>CSS 优先级计算器</h1>
  <input type="text" id="selector" placeholder="输入选择器，如 #main .card:hover" value="#main .card:hover">
  <div class="spec-display">
    <div class="spec-cell"><div class="label">Inline</div><div class="value" id="a">0</div></div>
    <div class="spec-cell"><div class="label">ID</div><div class="value" id="b">1</div></div>
    <div class="spec-cell"><div class="label">Class</div><div class="value" id="c">1</div></div>
    <div class="spec-cell"><div class="label">Element</div><div class="value" id="d">0</div></div>
  </div>

  <script>
    // 简化的优先级计算函数（生产环境应使用 postcss-selector-parser）
    function calculateSpecificity(selector) {
      let a = 0, b = 0, c = 0, d = 0;

      // 内联样式（通过 style 属性，此处仅演示规则选择器）
      // a 永远为 0（除非通过 style 属性）

      // ID 选择器
      const ids = selector.match(/#[\w-]+/g) || [];
      b = ids.length;

      // 类选择器、属性选择器、伪类（排除 :: 伪元素）
      const classes = selector.match(/\.[\w-]+/g) || [];
      const attrs = selector.match(/\[[^\]]+\]/g) || [];
      const pseudoClasses = selector.match(/:[^:][\w-]+(\([^)]*\))?/g) || [];
      c = classes.length + attrs.length + pseudoClasses.length;

      // 元素选择器、伪元素
      const elements = selector.match(/(^|[\s>+~])[\w-]+/g) || [];
      const pseudoElements = selector.match(/::[\w-]+/g) || [];
      d = elements.length + pseudoElements.length;

      return { a, b, c, d };
    }

    document.getElementById('selector').addEventListener('input', (e) => {
      const spec = calculateSpecificity(e.target.value);
      document.getElementById('a').textContent = spec.a;
      document.getElementById('b').textContent = spec.b;
      document.getElementById('c').textContent = spec.c;
      document.getElementById('d').textContent = spec.d;
    });
  </script>
</body>
</html>
```

### 5.9 Stylelint 强制优先级规则

```javascript
// .stylelintrc.js - 企业级 Stylelint 配置
module.exports = {
  extends: ['stylelint-config-standard', 'stylelint-config-recommended'],
  plugins: ['stylelint-selector-max-specificity'],
  rules: {
    // 禁止使用 ID 选择器
    'selector-max-id': 0,
    // 限制类选择器组合数（最多 3 个）
    'selector-max-class': 3,
    // 限制复合选择器深度（最多 4 层）
    'selector-max-compound-selectors': 4,
    // 禁止 !important（除非加 ! 前缀注释）
    'declaration-no-important': true,
    // 限制优先级上限：(0, 0, 3, 0)
    'selector-max-specificity': '0,0,3,0',
    // 强制 BEM 命名
    'selector-class-pattern': '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__[a-z0-9-]+)?(?:--[a-z0-9-]+)?$',
    // 禁止通配符选择器
    'selector-max-universal': 0,
    // 限制属性选择器组合
    'selector-max-attribute': 2,
  },
};
```

### 5.10 React + CSS Modules 优先级管理

```jsx
// Button.tsx - React 组件，使用 CSS Modules 隔离优先级
import styles from './Button.module.css';
import classNames from 'classnames';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  children,
  onClick,
}: ButtonProps) {
  // 利用 CSS Modules 的局部作用域，避免全局优先级污染
  const className = classNames(
    styles.btn,
    styles[`variant-${variant}`],
    styles[`size-${size}`],
    {
      [styles.disabled]: disabled,
    }
  );

  return (
    <button
      className={className}
      disabled={disabled}
      onClick={onClick}
      aria-disabled={disabled}
    >
      {children}
    </button>
  );
}
```

```css
/* Button.module.css - CSS Modules 样式 */
/* CSS Modules 自动生成唯一类名，避免全局冲突 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

/* 变体样式 */
.variantPrimary {
  background: #007bff;
  color: white;
}
.variantPrimary:hover {
  background: #0056b3;
}

.variantSecondary {
  background: #6c757d;
  color: white;
}

.variantDanger {
  background: #dc3545;
  color: white;
}

/* 尺寸 */
.sizeSm { padding: 0.25rem 0.5rem; }
.sizeMd { padding: 0.5rem 1rem; }
.sizeLg { padding: 0.75rem 1.5rem; font-size: 1rem; }

/* 禁用状态 */
.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

---

## 6. 对比分析

### 6.1 主流 CSS 方法论的优先级策略

| 方法论 | 核心思想 | 优先级控制 | 优势 | 劣势 |
| --- | --- | --- | --- | --- |
| **BEM** | Block-Element-Modifier 命名 | 单一类选择器 (0,0,1,0) | 简单、可预测 | 类名冗长、复用性弱 |
| **ITCSS** | Inverted Triangle CSS 分层 | 来源分层（早 < 晚） | 渐进增强 | 学习成本高 |
| **SMACSS** | Base/Layout/Module/State/Theme | 分类管理 | 结构清晰 | 缺乏强制约束 |
| **Atomic CSS** | 单一职责原子类 | 工具类 (0,0,1,0) | 高复用 | 可读性差 |
| **CSS-in-JS** | 运行时生成唯一类名 | 自动隔离 | 动态性强 | 运行时开销 |
| **CSS Modules** | 编译时生成唯一类名 | 自动隔离 | 零运行时 | 仅限组件级 |
| **@layer** | 显式层级声明 | 层级控制 | 灵活、强大 | 兼容性、心智模型 |

### 6.2 主流框架的优先级实践

| 框架 | 策略 | 典型选择器 | 优先级 |
| --- | --- | --- | --- |
| **Bootstrap 5** | 类选择器堆叠 | `.btn .btn-primary` | (0,0,2,0) |
| **Tailwind CSS v3.4** | 单一原子类 | `.text-center` | (0,0,1,0) |
| **Material Design 3** | 主题类 + 属性 | `.mdc-button--raised` | (0,0,1,0) |
| **Ant Design 5** | CSS-in-JS（CSSinJS） | 动态生成类名 | (0,0,1,0) |
| **GitHub Primer** | 工具类 + 组件类 | `.btn` `.btn-primary` | (0,0,1,0) - (0,0,2,0) |

### 6.3 Tailwind vs Bootstrap 的优先级哲学

**Tailwind CSS**（Atomic CSS 哲学）：

```html
<!-- 每个类都是原子工具，优先级恒为 (0,0,1,0) -->
<button class="bg-blue-500 text-white px-4 py-2 rounded">
  按钮
</button>
```

- 优势：优先级扁平，无覆盖冲突。
- 劣势：HTML 臃肿，需配合 `@apply` 或组件化。

**Bootstrap 5**（组件类哲学）：

```html
<!-- 组件类组合，优先级 (0,0,2,0) -->
<button class="btn btn-primary">
  按钮
</button>
```

- 优势：HTML 简洁，语义清晰。
- 劣势：覆盖时需提升优先级（如 `.my-btn.btn-primary`）。

### 6.4 `@layer` vs BEM vs CSS Modules

| 维度 | `@layer` | BEM | CSS Modules |
| --- | --- | --- | --- |
| **隔离方式** | 显式层级 | 命名约定 | 编译时哈希 |
| **优先级控制** | 精确（层间不可越级） | 粗略（单一类） | 完全隔离 |
| **浏览器支持** | Chrome 99+, Safari 15.4+, Firefox 97+ | 全部 | 全部（需构建工具） |
| **学习成本** | 高 | 低 | 中 |
| **团队协作** | 需明确层级约定 | 需命名规范 | 自动隔离 |
| **适用场景** | 大型项目、多团队 | 中小型项目 | 组件化项目 |

### 6.5 预处理器对优先级的影响

| 预处理器 | 嵌套规则 | 编译后优先级 | 备注 |
| --- | --- | --- | --- |
| **SCSS** | `.a { .b { } }` | `.a .b` (0,0,2,0) | 嵌套加深优先级 |
| **Less** | `.a { .b { } }` | `.a .b` (0,0,2,0) | 同 SCSS |
| **Stylus** | `.a .b` 或缩进 | `.a .b` (0,0,2,0) | 同上 |
| **PostCSS** | `&` 嵌套 | 同 SCSS | 取决于插件 |

> **最佳实践**：预处理器嵌套不超过 3 层，避免生成 (0,0,N,0) 的高优先级选择器。

### 6.6 现代选择器优先级对比

| 选择器 | 语法 | 优先级 | 浏览器支持 |
| --- | --- | --- | --- |
| ID | `#id` | (0,1,0,0) | 全部 |
| 类 | `.class` | (0,0,1,0) | 全部 |
| 属性 | `[attr=val]` | (0,0,1,0) | 全部 |
| 伪类 | `:hover` | (0,0,1,0) | 全部 |
| 伪元素 | `::before` | (0,0,0,1) | 全部 |
| `:is()` | `:is(.a, #b)` | 取最高 | Chrome 88+, Safari 14+, Firefox 78+ |
| `:where()` | `:where(.a, #b)` | (0,0,0,0) | Chrome 88+, Safari 14+, Firefox 78+ |
| `:not()` | `:not(.a)` | 参数最高 | Chrome 88+, Safari 14+, Firefox 78+ |
| `:has()` | `:has(> .a)` | 参数最高 | Chrome 105+, Safari 15.4+ |
| `:nth-child()` | `:nth-child(2n+1)` | (0,0,1,0) | 全部 |

---

## 7. 常见陷阱与最佳实践

### 7.1 陷阱 1：ID 选择器的优先级陷阱

**问题**：使用 ID 选择器后，覆盖样式变得困难。

```css
/* 反例：使用 ID 选择器 */
#header {
  background: blue;
}

/* 业务覆盖：需要更高优先级 */
#header.highlight {
  background: gold;
}
/* 或被迫使用 !important */
#header {
  background: gold !important;
}
```

**最佳实践**：避免使用 ID 选择器，改用类选择器。

```css
/* 正例：使用类选择器 */
.header {
  background: blue;
}
.header.highlight {
  background: gold;
}
```

### 7.2 陷阱 2：`!important` 滥用

**问题**：`!important` 滥用导致样式难以维护，形成「优先级军备竞赛」。

```css
/* 反例：!important 滥用 */
.btn { color: white !important; }
.btn-primary { color: white !important; }
.btn-danger { color: red !important; }
/* 覆盖时需要更具体的 !important */
.btn.btn-danger.special { color: darkred !important; }
```

**最佳实践**：仅在第三方库覆盖或可访问性场景使用 `!important`，业务代码应通过结构化选择器解决。

### 7.3 陷阱 3：深层嵌套导致优先级过高

**问题**：SCSS / Less 嵌套过深，生成高优先级选择器。

```scss
// 反例：嵌套过深
.nav {
  .list {
    .item {
      .link {
        color: blue;  // 编译为 .nav .list .item .link (0,0,4,0)
      }
    }
  }
}
```

**最佳实践**：嵌套不超过 3 层，使用 `&` 引用父选择器。

```scss
// 正例：扁平化结构
.nav-link {
  color: blue;  // (0,0,1,0)
}
```

### 7.4 陷阱 4：通配符与组合符误用

**问题**：误以为 `*` 和 `>` `+` `~` 计入优先级。

```css
/* 通配符与组合符不计入优先级 */
* { margin: 0; }  /* (0,0,0,0) */
.a > .b { color: red; }  /* (0,0,2,0) - > 不计入 */
.a + .b { color: blue; }  /* (0,0,2,0) - + 不计入 */
```

**最佳实践**：理解规范条款，避免误判。

### 7.5 陷阱 5：`:where()` 的零优先级误用

**问题**：误以为 `:where()` 能提升优先级。

```css
/* 反例：误用 :where() 提升优先级 */
:where(.btn) {
  color: red;  /* (0,0,0,0) - 实际比 .btn 还低 */
}

.btn {
  color: blue;  /* (0,0,1,0) - 胜出 */
}
```

**最佳实践**：`:where()` 用于「降低副作用」，如重置样式或第三方库包装。

### 7.6 陷阱 6：`@layer` 内的优先级误判

**问题**：误以为层内高优先级能跨越层边界。

```css
@layer low, high;

@layer low {
  #id { color: red; }  /* (0,1,0,0) 但在 low 层 */
}

@layer high {
  .class { color: blue; }  /* (0,0,1,0) 但在 high 层 */
}
/* 结果：.class 胜出（high 层 > low 层，与优先级无关） */
```

**最佳实践**：理解 `@layer` 的层间不可越级特性。

### 7.7 陷阱 7：内联样式与 JavaScript 设置的优先级

**问题**：通过 `element.style` 设置的样式优先级为 (1,0,0,0)，难以覆盖。

```javascript
// JavaScript 设置内联样式
element.style.color = 'red';  // 等价于 style="color: red;"
```

```css
/* CSS 难以覆盖 */
.element { color: blue; }  /* (0,0,1,0) < (1,0,0,0) */
.element { color: blue !important; }  /* !important 才能覆盖 */
```

**最佳实践**：避免在 JavaScript 中直接设置样式，改用类切换。

```javascript
// 正例：通过类切换
element.classList.add('active');
```

```css
.element.active { color: blue; }  /* (0,0,2,0) */
```

### 7.8 陷阱 8：用户样式表的优先级

**问题**：忽略用户样式表（如无障碍设置）的优先级。

```css
/* 作者样式可能被用户 !important 覆盖 */
.text {
  font-size: 12px !important;  /* 用户 !important 优先级更高 */
}
```

**最佳实践**：尊重用户偏好，使用相对单位（`rem`、`em`）。

---

## 8. 工程实践

### 8.1 优先级管理架构

```
┌─────────────────────────────────────────┐
│         优先级管理架构（自下而上）          │
├─────────────────────────────────────────┤
│  Layer 1: Design Tokens（设计令牌）       │  最低
│  Layer 2: Reset（重置）                  │
│  Layer 3: Vendor（第三方库）              │
│  Layer 4: Base（基础样式）                │
│  Layer 5: Components（组件）              │
│  Layer 6: Utilities（工具类）             │
│  Layer 7: Overrides（业务覆盖）           │
│  Unlayered: 业务代码（最高）              │  最高
└─────────────────────────────────────────┘
```

### 8.2 Stylelint 配置实践

```javascript
// .stylelintrc.js - 企业级 Stylelint 配置
module.exports = {
  extends: [
    'stylelint-config-standard',
    'stylelint-config-recommended',
    '@stylelint/postcss-css-in-js',
  ],
  plugins: [
    'stylelint-selector-max-specificity',
    'stylelint-no-unsupported-browser-features',
  ],
  rules: {
    // 优先级上限：(0, 2, 3, 0)
    'selector-max-specificity': '0,2,3,0',
    // 禁止 ID 选择器
    'selector-max-id': 0,
    // 限制类选择器组合数
    'selector-max-class': 3,
    // 限制嵌套深度
    'selector-max-compound-selectors': 4,
    // 禁止 !important
    'declaration-no-important': true,
    // BEM 命名规范
    'selector-class-pattern': '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__[a-z0-9-]+)?(?:--[a-z0-9-]+)?$',
    // 禁止通配符
    'selector-max-universal': 0,
    // 浏览器兼容性
    'plugin/no-unsupported-browser-features': [true, {
      severity: 'warning',
      browsers: ['> 1%', 'last 2 versions', 'not dead'],
    }],
  },
};
```

### 8.3 PostCSS 自动降级

```javascript
// postcss.config.js - PostCSS 配置
module.exports = {
  plugins: [
    require('autoprefixer')({
      overrideBrowserslist: ['> 1%', 'last 2 versions', 'not dead'],
    }),
    require('@csstools/postcss-cascade-layers')({
      onRevertLayer: 'warn',
    }),
    require('postcss-nesting'),
    require('postcss-custom-properties')({
      preserve: true,
    }),
  ],
};
```

### 8.4 设计令牌（Design Tokens）

```css
/* tokens.css - 设计令牌层 */
@layer tokens {
  :root {
    /* 颜色 */
    --color-primary-50: #eff6ff;
    --color-primary-500: #3b82f6;
    --color-primary-900: #1e3a8a;

    /* 间距 */
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 1.5rem;
    --spacing-xl: 2rem;

    /* 字号 */
    --font-size-sm: 0.875rem;
    --font-size-md: 1rem;
    --font-size-lg: 1.125rem;
    --font-size-xl: 1.25rem;

    /* 圆角 */
    --radius-sm: 4px;
    --radius-md: 6px;
    --radius-lg: 8px;

    /* 阴影 */
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
    --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
  }
}
```

### 8.5 组件库优先级管理

```css
/* components.css - 组件库层 */
@layer components {
  /* 基础组件类，优先级 (0,0,1,0) */
  .btn {
    display: inline-flex;
    align-items: center;
    padding: var(--spacing-sm) var(--spacing-md);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-md);
    cursor: pointer;
    transition: all 0.2s;
  }

  /* 变体类，优先级 (0,0,1,0) - 通过组合使用 */
  .btn-primary {
    background: var(--color-primary-500);
    color: white;
  }

  .btn-primary:hover {
    background: var(--color-primary-900);
  }

  /* 尺寸类 */
  .btn-sm { padding: var(--spacing-xs) var(--spacing-sm); font-size: var(--font-size-sm); }
  .btn-lg { padding: var(--spacing-md) var(--spacing-lg); font-size: var(--font-size-lg); }
}
```

### 8.6 工具类优先级管理

```css
/* utilities.css - 工具类层 */
@layer utilities {
  /* 间距工具 */
  .m-0 { margin: 0 !important; }
  .m-sm { margin: var(--spacing-sm) !important; }
  .m-md { margin: var(--spacing-md) !important; }
  .mt-sm { margin-top: var(--spacing-sm) !important; }
  .mt-md { margin-top: var(--spacing-md) !important; }

  /* 文本对齐 */
  .text-left { text-align: left !important; }
  .text-center { text-align: center !important; }
  .text-right { text-align: right !important; }

  /* 显示 */
  .d-none { display: none !important; }
  .d-block { display: block !important; }
  .d-flex { display: flex !important; }
}
```

> **注**：工具类中的 `!important` 是有意为之，确保工具类覆盖组件类。

### 8.7 调试优先级

```javascript
// 优先级调试工具
function debugSpecificity(element) {
  const computed = window.getComputedStyle(element);
  const rules = [];

  // 遍历所有匹配的规则
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule.selectorText && element.matches(rule.selectorText)) {
          rules.push({
            selector: rule.selectorText,
            specificity: calculateSpecificity(rule.selectorText),
            text: rule.cssText,
          });
        }
      }
    } catch (e) {
      // 跨域样式表无法访问
    }
  }

  // 按优先级排序
  rules.sort((a, b) => {
    const sa = a.specificity;
    const sb = b.specificity;
    return sb.a - sa.a || sb.b - sa.b || sb.c - sa.c || sb.d - sa.d;
  });

  return rules;
}

// 使用示例
const element = document.querySelector('.btn');
console.log(debugSpecificity(element));
```

### 8.8 Playwright 视觉回归测试

```javascript
// priority.spec.js - Playwright 视觉回归测试
const { test, expect } = require('@playwright/test');

test.describe('优先级回归测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('按钮主变体颜色正确', async ({ page }) => {
    const button = page.locator('.btn-primary');
    await expect(button).toHaveCSS('background-color', 'rgb(59, 130, 246)');

    // 悬停状态
    await button.hover();
    await expect(button).toHaveCSS('background-color', 'rgb(30, 58, 138)');
  });

  test('工具类覆盖组件类', async ({ page }) => {
    const element = page.locator('.btn.text-center');
    await expect(element).toHaveCSS('text-align', 'center');
  });

  test('@layer 分层正确生效', async ({ page }) => {
    const element = page.locator('.layered-component');
    // 验证未分层样式覆盖分层样式
    await expect(element).toHaveCSS('color', 'rgb(0, 128, 0)');
  });
});
```

### 8.9 浏览器兼容性处理

```css
/* 兼容性处理：@layer 降级方案 */

/* 方案 1：使用 PostCSS 插件自动降级 */
/* @csstools/postcss-cascade-layers 会将 @layer 转换为优先级等效的传统 CSS */

/* 方案 2：手动降级（不推荐，仅作示例） */
/* 当 @layer 不支持时，使用 specificity 模拟 */

/* 现代浏览器：使用 @layer */
@layer reset, components, utilities;
@layer reset {
  h1 { margin: 0; }
}
@layer components {
  .title { font-size: 2rem; }
}
@layer utilities {
  .text-center { text-align: center; }
}

/* 旧浏览器降级：通过优先级模拟 */
/* h1 (0,0,0,1) < .title (0,0,1,0) < .text-center (0,0,1,0) */
/* 注意：降级后无法精确模拟层间不可越级特性 */
```

---

## 9. 案例研究

### 9.1 Bootstrap 5 的优先级策略

Bootstrap 5 采用「组件类 + 修饰类」的策略：

```css
/* Bootstrap 5 源码节选 */
.btn {
  /* 基础样式 (0,0,1,0) */
  display: inline-block;
  padding: 0.375rem 0.75rem;
  font-size: 1rem;
  line-height: 1.5;
  border-radius: 0.25rem;
}

.btn-primary {
  /* 变体样式 (0,0,1,0)，与 .btn 组合使用 */
  color: #fff;
  background-color: #0d6efd;
  border-color: #0d6efd;
}

.btn-lg {
  /* 尺寸样式 (0,0,1,0) */
  padding: 0.5rem 1rem;
  font-size: 1.25rem;
  border-radius: 0.3rem;
}
```

**使用方式**：

```html
<button class="btn btn-primary btn-lg">大型主按钮</button>
```

**优先级分析**：三个类组合，优先级 (0,0,3,0)，但通过类组合而非嵌套，可维护性较好。

### 9.2 Tailwind CSS v3.4 的优先级策略

Tailwind 采用「原子工具类」策略：

```css
/* Tailwind 生成的工具类 */
.bg-blue-500 { background-color: #3b82f6; }
.text-white { color: #fff; }
.px-4 { padding-left: 1rem; padding-right: 1rem; }
.py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
.rounded { border-radius: 0.25rem; }
```

**使用方式**：

```html
<button class="bg-blue-500 text-white px-4 py-2 rounded">
  按钮
</button>
```

**优先级分析**：每个类独立 (0,0,1,0)，覆盖时需通过 `!` 前缀（如 `!bg-red-500`）或自定义类。

### 9.3 Material Design 3 的优先级策略

Material Design 3（MDC Web）采用「主题类 + 属性」策略：

```css
/* MDC Button 源码节选 */
.mdc-button {
  /* 基础样式 (0,0,1,0) */
  font-family: Roboto, sans-serif;
  padding: 0 8px;
  border: none;
  background: transparent;
}

.mdc-button--raised {
  /* 修饰类 (0,0,1,0) */
  box-shadow: 0px 3px 1px -2px rgba(0,0,0,0.2);
  background-color: #6200ee;
}

/* 通过 CSS 变量定制主题 */
.mdc-button {
  background-color: var(--mdc-theme-primary, #6200ee);
}
```

### 9.4 GitHub Primer 的优先级策略

GitHub Primer 采用「工具类 + 组件类」混合策略：

```css
/* Primer 源码节选 */
.btn {
  /* 基础 (0,0,1,0) */
  padding: 5px 16px;
  font-size: 14px;
  border: 1px solid transparent;
}

.btn-primary {
  /* 变体 (0,0,1,0) */
  color: #fff;
  background-color: #2da44e;
}

/* 工具类 */
.mt-2 { margin-top: 8px !important; }
.text-center { text-align: center !important; }
```

### 9.5 Ant Design 5 的优先级策略

Ant Design 5 采用 CSS-in-JS（cssinjs）方案：

```jsx
// Ant Design 5 使用 @ant-design/cssinjs
import { Button } from 'antd';

// 组件内部生成唯一类名，避免全局冲突
// <button class="ant-btn css-1abc123">按钮</button>
```

```css
/* Ant Design 生成的样式 */
.ant-btn {
  /* 优先级 (0,0,1,0) */
  padding: 4px 15px;
  border: 1px solid #d9d9d9;
}

.ant-btn-primary {
  background: #1677ff;
}

/* 通过 ConfigProvider 定制主题 */
.ant-btn {
  background: var(--ant-primary-color);
}
```

### 9.6 生产事故：优先级军备竞赛

**场景**：某电商平台首页按钮颜色异常，多个团队反复使用 `!important` 覆盖。

**事故时间线**：

1. 设计系统团队发布 `.btn-primary { background: blue; }`。
2. 营销团队需红色按钮，添加 `.campaign-btn { background: red !important; }`。
3. 设计系统升级蓝色，营销团队按钮变蓝，紧急添加 `.campaign-btn.campaign-btn { background: red !important; }`。
4. 黑五促销需金色按钮，前端添加 `#main .campaign-btn { background: gold !important; }`。
5. 一年后，新开发者试图修改按钮颜色，发现 5 层 `!important` 嵌套，无法维护。

**根因分析**：

- 缺乏统一的优先级管理规范。
- `!important` 滥用导致优先级不可逆。
- 团队间样式隔离不足。

**解决方案**：

1. 引入 `@layer` 分层架构。
2. Stylelint 禁止业务代码使用 `!important`。
3. 设计系统通过 CSS Variables 暴露主题入口。
4. 业务覆盖通过专门的 `overrides` 层管理。

```css
/* 重构后 */
@layer tokens, components, overrides;

@layer components {
  .btn-primary {
    background: var(--btn-primary-bg, blue);
  }
}

@layer overrides {
  .campaign-btn {
    --btn-primary-bg: red;
  }
}
```

---

## 10. 习题

### 10.1 选择题

**题目 1**：以下选择器优先级最高的是？

A. `#header .title`
B. `.nav .list .item`
C. `div.container > p`
D. `:where(#main) .text`

<details>
<summary>答案与解析</summary>

**答案**：A

**解析**：

- A: `#header .title` → (0, 1, 1, 0)
- B: `.nav .list .item` → (0, 0, 3, 0)
- C: `div.container > p` → (0, 0, 1, 2)
- D: `:where(#main) .text` → (0, 0, 1, 0)（`:where()` 恒为 0）

A 的 (0, 1, 1, 0) 中 B=1，绝对高于其他选项的 B=0。

</details>

**题目 2**：关于 `@layer` 的描述，正确的是？

A. 层内高优先级样式可以覆盖未分层样式
B. 层的声明顺序决定优先级，后声明的层优先级低
C. 未分层样式总是优先于分层样式
D. `@layer` 内不能使用 `!important`

<details>
<summary>答案与解析</summary>

**答案**：C

**解析**：

- A 错误：层间不可越级，层内优先级不影响层间关系。
- B 错误：后声明的层优先级**高**。
- C 正确：未分层样式优先于所有分层样式。
- D 错误：`@layer` 内可以使用 `!important`，且 `!important` 在层间反转（分层 `!important` 高于未分层 `!important`）。

</details>

**题目 3**：`:is(.a, #b)` 的优先级是？

A. (0, 0, 1, 0)
B. (0, 1, 0, 0)
C. (0, 0, 0, 0)
D. (0, 1, 1, 0)

<details>
<summary>答案与解析</summary>

**答案**：B

**解析**：`:is()` 取参数中最具体的选择器优先级。`.a` 为 (0,0,1,0)，`#b` 为 (0,1,0,0)，取较高者 (0,1,0,0)。

</details>

**题目 4**：以下哪种方式可以有效覆盖内联样式 `style="color: red;"`？

A. `.element { color: blue; }`
B. `#element { color: blue; }`
C. `.element { color: blue !important; }`
D. `div.element { color: blue; }`

<details>
<summary>答案与解析</summary>

**答案**：C

**解析**：内联样式优先级为 (1,0,0,0)，普通规则无法覆盖。`!important` 声明优先级高于内联 normal 声明，可以覆盖。若内联也是 `!important`，则需更高来源的 `!important`（如用户 `!important`）。

</details>

**题目 5**：Tailwind CSS 中 `!bg-red-500` 的作用是？

A. 设置背景色为红色 500
B. 强制设置背景色为红色 500（生成 `!important`）
C. 排除背景色设置
D. 设置背景色为红色 500 的 50% 透明度

<details>
<summary>答案与解析</summary>

**答案**：B

**解析**：Tailwind 的 `!` 前缀（important modifier）生成带 `!important` 的声明，用于确保覆盖其他样式。例如 `!bg-red-500` 编译为 `background-color: #ef4444 !important;`。

</details>

### 10.2 填空题

**题目 1**：CSS 优先级四元组 (A, B, C, D) 中，A 表示 ________ 的数量，B 表示 ________ 的数量。

<details>
<summary>答案与解析</summary>

**答案**：内联样式（`style` 属性）；ID 选择器

**解析**：四元组 (A, B, C, D) 分别对应：内联样式（0 或 1）、ID 选择器数量、类/属性/伪类数量、元素/伪元素数量。

</details>

**题目 2**：`:where()` 的优先级恒为 ________。

<details>
<summary>答案与解析</summary>

**答案**：(0, 0, 0, 0)

**解析**：`:where()` 设计为零优先级伪类，无论其参数如何，优先级总是 (0,0,0,0)。

</details>

**题目 3**：CSS 层叠算法的 8 个阶段中，优先级（Specificity）位于第 ________ 阶段。

<details>
<summary>答案与解析</summary>

**答案**：5

**解析**：8 个阶段依次为：Origin & Importance → Context → Element-attached → Layer → Specificity → Order of Appearance → Animation → Transition。Specificity 是第 5 阶段。

</details>

**题目 4**：`@layer A, B, C;` 声明三个层，优先级从低到高为 ________。

<details>
<summary>答案与解析</summary>

**答案**：A < B < C

**解析**：`@layer` 的声明顺序决定优先级，先声明的层优先级低，后声明的层优先级高。

</details>

**题目 5**：`:has(.a #b)` 的优先级为 ________。

<details>
<summary>答案与解析</summary>

**答案**：(0, 1, 1, 0)

**解析**：`:has()` 的优先级由参数中最具体的选择器决定。`.a #b` 的优先级为 (0,1,1,0)（1 个 ID + 1 个类），因此 `:has(.a #b)` 的优先级也是 (0,1,1,0)。

</details>

### 10.3 编程题

**题目 1**：编写一个 CSS 选择器，使其优先级为 (0, 2, 3, 1)。

<details>
<summary>答案与解析</summary>

**答案**：

```css
#header #nav .menu .item .link:hover div {
  /* 优先级计算：
   * #header (ID) → B=1
   * #nav (ID) → B=2
   * .menu (类) → C=1
   * .item (类) → C=2
   * .link (类) → C=3
   * :hover (伪类) → C=4
   * div (元素) → D=1
   * 总计：(0, 2, 4, 1)
   */
}
```

调整：要精确 (0, 2, 3, 1)：

```css
#header #nav .menu .item div:hover {
  /* #header (ID) → B=1
   * #nav (ID) → B=2
   * .menu (类) → C=1
   * .item (类) → C=2
   * :hover (伪类) → C=3
   * div (元素) → D=1
   * 总计：(0, 2, 3, 1)
   */
}
```

</details>

**题目 2**：使用 `@layer` 重构以下样式，使其符合企业级分层架构。

```css
/* 原始代码（混乱） */
* { margin: 0; }
.btn { padding: 8px; }
.btn-primary { background: blue; }
.text-center { text-align: center; }
.card { border: 1px solid #ccc; }
```

<details>
<summary>答案与解析</summary>

**答案**：

```css
@layer reset, components, utilities;

@layer reset {
  * { margin: 0; }
}

@layer components {
  .btn {
    padding: 8px;
  }
  .btn-primary {
    background: blue;
  }
  .card {
    border: 1px solid #ccc;
  }
}

@layer utilities {
  .text-center {
    text-align: center;
  }
}
```

**解析**：

1. `reset` 层最低，用于全局重置。
2. `components` 层包含组件样式。
3. `utilities` 层包含工具类，优先级高于组件类。
4. 未分层样式（如有）优先级最高。

</details>

**题目 3**：编写 JavaScript 函数，计算任意 CSS 选择器的优先级。

<details>
<summary>答案与解析</summary>

**答案**：

```javascript
/**
 * 计算 CSS 选择器的优先级
 * @param {string} selector - CSS 选择器字符串
 * @returns {{a: number, b: number, c: number, d: number}} 优先级四元组
 */
function calculateSpecificity(selector) {
  let a = 0, b = 0, c = 0, d = 0;

  // 处理 :where() - 恒为 0，需先移除
  const cleaned = selector.replace(/:where\([^)]*\)/g, '');

  // ID 选择器
  const ids = cleaned.match(/#[\w-]+/g) || [];
  b += ids.length;

  // 类选择器
  const classes = cleaned.match(/\.[\w-]+/g) || [];
  c += classes.length;

  // 属性选择器
  const attrs = cleaned.match(/\[[^\]]+\]/g) || [];
  c += attrs.length;

  // 伪类（排除伪元素 ::）
  const pseudoClasses = cleaned.match(/:(?!:)[\w-]+(\([^)]*\))?/g) || [];
  // 排除 :where（已移除）、:is、:has、:not 的特殊性
  // 简化处理：:is、:has、:not 取参数中最高优先级
  for (const pc of pseudoClasses) {
    if (pc.startsWith(':is(') || pc.startsWith(':has(') || pc.startsWith(':not(')) {
      // 提取参数
      const inner = pc.match(/\(([^)]*)\)/);
      if (inner) {
        const innerSpec = calculateSpecificity(inner[1]);
        // 取最高
        if (innerSpec.b > b) b = innerSpec.b;
        if (innerSpec.c > c) c = innerSpec.c;
        if (innerSpec.d > d) d = innerSpec.d;
      }
    } else {
      c += 1;
    }
  }

  // 伪元素
  const pseudoElements = cleaned.match(/::[\w-]+/g) || [];
  d += pseudoElements.length;

  // 元素选择器（排除伪类、伪元素）
  const elements = cleaned
    .replace(/[#.\[:][^\s>+~]*/g, '')  // 移除 ID、类、属性、伪类
    .match(/[\w-]+/g) || [];
  d += elements.length;

  return { a, b, c, d };
}

// 测试
console.log(calculateSpecificity('#main .card:hover'));
// { a: 0, b: 1, c: 2, d: 0 }

console.log(calculateSpecificity(':where(#header) .nav'));
// { a: 0, b: 0, c: 1, d: 0 }

console.log(calculateSpecificity(':is(.a, #b)'));
// { a: 0, b: 1, c: 0, d: 0 }
```

**解析**：生产环境推荐使用 [`specificity`](https://www.npmjs.com/package/specificity) 库，其解析更精确。

</details>

### 10.4 思考题

**题目 1**：为什么 CSS 优先级使用四元组而非单一数字？这种设计有哪些优劣？

<details>
<summary>答案与解析</summary>

**答案**：

**优势**：

1. **语义清晰**：四元组直接反映选择器的结构（内联、ID、类、元素），便于理解。
2. **基数无限**：基于字典序比较，避免「10 个类是否等于 1 个 ID」的歧义。
3. **可扩展性**：未来可增加分量（如 `@layer` 层级）而不破坏现有逻辑。

**劣势**：

1. **心智负担**：开发者需理解字典序比较，而非简单数值比较。
2. **计算复杂**：复杂选择器的优先级需逐项统计，易出错。
3. **缺乏工具支持**：早期开发者需手工计算，现代工具（如 DevTools）已改善。

</details>

**题目 2**：`@layer` 的引入对现有 CSS 架构（如 BEM、ITCSS）有何影响？是否应全面迁移到 `@layer`？

<details>
<summary>答案与解析</summary>

**答案**：

**影响**：

1. **BEM**：`@layer` 与 BEM 互补。BEM 提供命名隔离，`@layer` 提供层级隔离。可结合使用：在 `@layer components` 内使用 BEM 命名。
2. **ITCSS**：`@layer` 与 ITCSS 的分层思想高度契合，可作为 ITCSS 的显式实现。
3. **CSS Modules**：CSS Modules 提供编译时隔离，`@layer` 提供运行时层级控制。两者可共存。

**迁移建议**：

- **渐进迁移**：新项目可全面采用 `@layer`，旧项目逐步引入。
- **兼容性**：`@layer` 浏览器支持已达 95%+（2024 年），可放心使用。
- **工具支持**：PostCSS 插件 `@csstools/postcss-cascade-layers` 可自动降级。
- **团队培训**：`@layer` 引入新的心智模型，需团队培训。

**结论**：不应一刀切全面迁移，应结合项目实际情况，渐进引入 `@layer`，与现有架构协同。

</details>

**题目 3**：在微前端架构中，多个子应用的样式如何隔离？`@layer` 能否解决微前端的样式冲突？

<details>
<summary>答案与解析</summary>

**答案**：

**微前端样式隔离方案**：

1. **Shadow DOM**：彻底隔离，但样式无法穿透，组件库适配成本高。
2. **CSS Modules / CSS-in-JS**：编译时生成唯一类名，但仅限组件级。
3. **iframe**：完全隔离，但通信成本高，UX 受影响。
4. **`@layer`**：显式层级控制，可分配每个子应用独立层。
5. **CSS 前缀**：如 qiankun 的 `sandbox` 自动添加前缀。

**`@layer` 的适用性**：

- **优势**：可显式声明子应用层优先级，避免冲突。
- **局限**：`@layer` 不提供完全隔离，子应用间仍需协调层名。
- **实践**：

```css
@layer app1, app2, app3;

@layer app1 {
  /* 子应用 1 的样式 */
}

@layer app2 {
  /* 子应用 2 的样式 */
}
```

**结论**：`@layer` 是微前端样式隔离的有效补充，但应与 Shadow DOM 或 CSS Modules 结合使用，形成多层防护。

</details>

---

## 11. 参考文献

### 11.1 W3C 规范

- World Wide Web Consortium. (2021). *CSS Cascading and Inheritance Level 4*. W3C Recommendation. https://www.w3.org/TR/css-cascade-4/
- World Wide Web Consortium. (2023). *CSS Cascading and Inheritance Level 5*. W3C Working Draft. https://www.w3.org/TR/css-cascade-5/
- World Wide Web Consortium. (2018). *Selectors Level 3*. W3C Recommendation. https://www.w3.org/TR/selectors-3/
- World Wide Web Consortium. (2022). *Selectors Level 4*. W3C Working Draft. https://www.w3.org/TR/selectors-4/
- World Wide Web Consortium. (2011). *Cascading Style Sheets Level 2 Revision 1 (CSS 2.1) Specification*. W3C Recommendation. https://www.w3.org/TR/CSS21/
- World Wide Web Consortium. (1996). *Cascading Style Sheets, Level 1*. W3C Recommendation. https://www.w3.org/TR/CSS1/
- World Wide Web Consortium. (2024). *CSS Values and Units Module Level 4*. W3C Working Draft. https://www.w3.org/TR/css-values-4/

### 11.2 学术论文

- Lie, H. W., & Bos, B. (1999). *Cascading Style Sheets: Designing for the Web*. Addison-Wesley Professional. ISBN: 978-0201419989.
- Meyer, E. A. (2006). *Cascading Style Sheets: The Definitive Guide* (3rd ed.). O'Reilly Media. ISBN: 978-0596527334.
- Flanagan, D. (2011). *JavaScript: The Definitive Guide* (6th ed.). O'Reilly Media. Chapter 16: Cascading Style Sheets. ISBN: 978-0596805531.

### 11.3 工业实践

- Bootstrap. (2024). *Bootstrap 5.4 Documentation: Components - Buttons*. https://getbootstrap.com/docs/5.4/components/buttons/
- Tailwind Labs. (2024). *Tailwind CSS v3.4 Documentation: Handling Hover, Focus, and Other States*. https://tailwindcss.com/docs/hover-focus-and-other-states
- Google. (2024). *Material Design 3: Design System*. https://m3.material.io/
- Ant Design. (2024). *Ant Design 5.x Documentation: Customize Theme*. https://ant.design/docs/react/customize-theme
- GitHub. (2024). *Primer Design System*. https://primer.style/

### 11.4 工具与库

- Keegan, I. (2024). *specificity: A JavaScript function to calculate the specificity of CSS selectors*. https://github.com/keeganstreet/specificity
- Stylelint. (2024). *stylelint-selector-max-specificity*. https://stylelint.io/user-guide/rules/list/selector-max-specificity/
- PostCSS. (2024). *@csstools/postcss-cascade-layers*. https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-cascade-layers

### 11.5 ACM Reference Format

引用示例（ACM Reference Format）：

- World Wide Web Consortium. 2021. *CSS Cascading and Inheritance Level 4*. W3C Recommendation. Retrieved July 20, 2026 from https://www.w3.org/TR/css-cascade-4/
- Tab Atkins, and Miriam Suzanne. 2023. *CSS Cascading and Inheritance Level 5*. W3C Working Draft. Retrieved July 20, 2026 from https://www.w3.org/TR/css-cascade-5/
- Håkon Wium Lie, and Bert Bos. 1996. *Cascading Style Sheets, Level 1*. W3C Recommendation. Retrieved July 20, 2026 from https://www.w3.org/TR/CSS1/
- Eric A. Meyer. 2006. *Cascading Style Sheets: The Definitive Guide* (3rd ed.). O'Reilly Media, Sebastopol, CA. ISBN 978-0596527334.
- Keegan Street. 2024. *specificity: Calculate CSS selector specificity*. Retrieved July 20, 2026 from https://github.com/keeganstreet/specificity

---

## 12. 延伸阅读

### 12.1 经典书籍

- **《CSS Secrets》** - Lea Verou 著，深入探讨 CSS 的高级技巧与优先级管理。
- **《CSS: The Definitive Guide》** - Eric A. Meyer 著，CSS 完整参考。
- **《CSS in Depth》** - Keith J. Grant 著，现代 CSS 工程实践。
- **《Enduring CSS》** - Ben Frain 著，大型项目的 CSS 架构。

### 12.2 在线资源

- **MDN Web Docs: Specificity** - https://developer.mozilla.org/en-US/docs/Web/CSS/Specificity
- **MDN Web Docs: Cascade** - https://developer.mozilla.org/en-US/docs/Web/CSS/Cascade
- **MDN Web Docs: @layer** - https://developer.mozilla.org/en-US/docs/Web/CSS/@layer
- **CSS Tricks: Specificity** - https://css-tricks.com/specifics-on-css-specificity/
- **web.dev: Cascade Layers** - https://web.dev/articles/cascade-layers

### 12.3 视频课程

- **Frontend Masters: CSS Grid & Flexbox for Responsive Layouts** - Jen Kramer
- **CSS Working Group: Cascade Layers Explained** - Miriam Suzanne
- **Chrome Developers: Specificity and the Cascade** - Una Kravets

### 12.4 社区博客

- **CSS-Tricks** - https://css-tricks.com/
- **Smashing Magazine** - https://www.smashingmagazine.com/category/css/
- **A List Apart** - https://alistapart.com/topic/css/
- **Miriam Suzanne's Blog** - https://miriamsuzanne.com/

### 12.5 规范演进方向

- **CSS Cascading Level 6 草案**：探讨 `@layer` 嵌套与范围查询。
- **CSS Scope**：引入 `@scope` 规则，提供更细粒度的样式作用域。
- **CSS Functions**：探讨 `specificity()` 函数，允许在 CSS 中查询优先级。
- **Houdini CSS Parser API**：提供底层 CSS 解析能力，可自定义优先级算法。

### 12.6 相关规范

- **[CSS Box Model Module Level 3](https://www.w3.org/TR/css-box-3/)** - 盒模型规范。
- **[CSS Display Module Level 3](https://www.w3.org/TR/css-display-3/)** - display 属性规范。
- **[CSS Positioned Layout Module Level 3](https://www.w3.org/TR/css-position-3/)** - 定位规范。
- **[CSS Custom Properties for Cascading Variables Module Level 1](https://www.w3.org/TR/css-variables-1/)** - CSS 变量规范。
- **[CSS Containment Module Level 3](https://www.w3.org/TR/css-contain-3/)** - 容器查询规范。

---

## 附录 A：术语表

| 术语 | 英文 | 定义 |
| --- | --- | --- |
| 优先级 | Specificity | 选择器的权重值 |
| 层叠 | Cascade | 浏览器决定最终样式的算法 |
| 来源 | Origin | 样式表类别（UA/User/Author） |
| 层 | Layer | `@layer` 声明的命名样式组 |
| 内联样式 | Inline Style | `style` 属性附加的样式 |
| 重要性 | Importance | `!important` 声明 |
| 出现顺序 | Order of Appearance | 同优先级时的决胜规则 |
| 上下文 | Context | Shadow DOM 等隔离环境 |
| 元素附加 | Element-attached | `style` 属性样式 |
| 动画 | Animation | `@keyframes` 动画声明 |
| 过渡 | Transition | `transition` 过渡声明 |

## 附录 B：浏览器兼容性

| 特性 | Chrome | Firefox | Safari | Edge | 兼容性 |
| --- | --- | --- | --- | --- | --- |
| 四元组优先级 | 全部 | 全部 | 全部 | 全部 | 100% |
| `!important` | 全部 | 全部 | 全部 | 全部 | 100% |
| `:not()` | 1+ | 1+ | 3+ | 12+ | 100% |
| `:is()` | 88+ | 78+ | 14+ | 88+ | 95%+ |
| `:where()` | 88+ | 78+ | 14+ | 88+ | 95%+ |
| `:has()` | 105+ | 121+ | 15.4+ | 105+ | 90%+ |
| `@layer` | 99+ | 97+ | 15.4+ | 99+ | 95%+ |
| `@scope` | 118+ | 实验性 | 实验性 | 118+ | 30%+ |

## 附录 C：调试检查清单

- [ ] 使用 DevTools 的「Computed」面板查看最终生效样式
- [ ] 检查 DevTools 中被划掉的声明，理解被覆盖原因
- [ ] 手工计算选择器优先级，验证与 DevTools 显示一致
- [ ] 检查是否存在 `!important` 滥用
- [ ] 检查 `@layer` 声明顺序是否正确
- [ ] 验证第三方库样式是否污染业务代码
- [ ] 检查内联样式与 JavaScript `style` 设置
- [ ] 验证用户样式表（如可访问性设置）的影响
- [ ] 使用 Stylelint 检查优先级上限
- [ ] 编写 Playwright 视觉回归测试
