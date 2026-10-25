---
order: 210
title: LaTeX 数学公式
module: 'markdown'
category: 工具链
difficulty: intermediate
description: Markdown中LaTeX数学公式的完整语法：行内公式、块级公式与KaTeX兼容性。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'markdown/140-Emoji'
  - 'markdown/160-SubscriptSuperscript'
  - 'markdown/220-Mermaid'
  - 'markdown/280-EditorFeature'
prerequisites:
  - 'markdown/010-SyntaxGuide'
---

> **Layer 2 专业层标注**：数学公式按需学习，非技术写作场景可跳过。

## 1. 数学公式概述

### 1.1 Markdown 中的数学公式

Markdown 通过嵌入 LaTeX 数学模式语法来渲染数学公式，主流渲染引擎为 **KaTeX**（快速）和 **MathJax**（功能全）。

| 引擎        | 速度 | 兼容性     | 特点                     |
| :---------- | :--- | :--------- | :----------------------- |
| **KaTeX**   | 极快 | 部分 LaTeX | 渲染速度快，适合大量公式 |
| **MathJax** | 较慢 | 完整 LaTeX | 功能最全，支持所有宏     |

### 1.2 行内与块级

```markdown
行内公式：质能方程 $E = mc^2$ 是物理学最著名的公式之一。

块级公式：

$$
E = mc^2
$$
```

## 2. 基础语法

### 2.1 上标与下标

```markdown
$x^2$ → $x^2$
$x^{10}$ → $x^{10}$
$a_n$ → $a_n$
$a_{ij}$ → $a_{ij}$
$x_1^2$ → $x_1^2$
```

### 2.2 分数

```markdown
$\frac{a}{b}$ → $\frac{a}{b}$
$\dfrac{a}{b}$ → $\dfrac{a}{b}$（大分数）
$a/b$ → $a/b$（行内分数）
$\cfrac{1}{1+\cfrac{1}{1+\cfrac{1}{1}}}$ → 连分数
```

### 2.3 根号

```markdown
$\sqrt{2}$ → $\sqrt{2}$
$\sqrt[3]{8}$ → $\sqrt[3]{8}$
$\sqrt[n]{a}$ → $\sqrt[n]{a}$
```

### 2.4 希腊字母

| 小写       | 语法       | 大写      | 语法      |
| :--------- | :--------- | :-------- | :-------- |
| $\alpha$   | `\alpha`   | $A$       | `A`       |
| $\beta$    | `\beta`    | $B$       | `B`       |
| $\gamma$   | `\gamma`   | $\Gamma$  | `\Gamma`  |
| $\delta$   | `\delta`   | $\Delta$  | `\Delta`  |
| $\epsilon$ | `\epsilon` | $E$       | `E`       |
| $\theta$   | `\theta`   | $\Theta$  | `\Theta`  |
| $\lambda$  | `\lambda`  | $\Lambda$ | `\Lambda` |
| $\mu$      | `\mu`      | $M$       | `M`       |
| $\pi$      | `\pi`      | $\Pi$     | `\Pi`     |
| $\sigma$   | `\sigma`   | $\Sigma$  | `\Sigma`  |
| $\omega$   | `\omega`   | $\Omega$  | `\Omega`  |
| $\phi$     | `\phi`     | $\Phi$    | `\Phi`    |

## 3. 运算符与关系

### 3.1 求和与积分

```markdown
$\sum_{i=1}^{n} i$ → $\sum_{i=1}^{n} i$
$\prod_{i=1}^{n} i$ → $\prod_{i=1}^{n} i$
$\int_{0}^{\infty} f(x) dx$ → $\int_{0}^{\infty} f(x) dx$
$\iint_{D} f(x,y) dA$ → $\iint_{D} f(x,y) dA$
$\oint_{C} F \cdot dr$ → $\oint_{C} F \cdot dr$
```

### 3.2 极限与导数

```markdown
$\lim_{x \to \infty} f(x)$ → $\lim_{x \to \infty} f(x)$
$\frac{dy}{dx}$ → $\frac{dy}{dx}$
$\frac{\partial f}{\partial x}$ → $\frac{\partial f}{\partial x}$
$\nabla f$ → $\nabla f$
```

### 3.3 关系运算符

| 符号        | 语法        | 含义     |
| :---------- | :---------- | :------- |
| $\leq$      | `\leq`      | 小于等于 |
| $\geq$      | `\geq`      | 大于等于 |
| $\neq$      | `\neq`      | 不等于   |
| $\approx$   | `\approx`   | 约等于   |
| $\equiv$    | `\equiv`    | 恒等于   |
| $\in$       | `\in`       | 属于     |
| $\subset$   | `\subset`   | 真子集   |
| $\subseteq$ | `\subseteq` | 子集     |
| $\forall$   | `\forall`   | 任意     |
| $\exists$   | `\exists`   | 存在     |

## 4. 矩阵与数组

### 4.1 矩阵

```markdown
$$
\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
$$
```

$$
\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
$$

### 4.2 方括号矩阵

```markdown
$$
\begin{bmatrix}
1 & 2 & 3 \\
4 & 5 & 6 \\
7 & 8 & 9
\end{bmatrix}
$$
```

### 4.3 行列式

```markdown
$$
\begin{vmatrix}
a & b \\
c & d
\end{vmatrix} = ad - bc
$$
```

### 4.4 增广矩阵

```markdown
$$
\left[
\begin{array}{cc|c}
1 & 2 & 3 \\
4 & 5 & 6
\end{array}
\right]
$$
```

## 5. 方程组与分段函数

### 5.1 方程组

```markdown
$$
\begin{cases}
x + y = 5 \\
2x - y = 1
\end{cases}
$$
```

### 5.2 分段函数

```markdown
$$
f(x) = \begin{cases}
x^2 & \text{if } x \geq 0 \\
-x^2 & \text{if } x < 0
\end{cases}
$$
```

## 6. 格式控制

### 6.1 字体

```markdown
$\mathbf{A}$ → $\mathbf{A}$（粗体）
$\mathbb{R}$ → $\mathbb{R}$（黑板粗体）
$\mathcal{L}$ → $\mathcal{L}$（花体）
$\mathsf{A}$ → $\mathsf{A}$（无衬线）
$\mathtt{A}$ → $\mathtt{A}$（打字机）
$\text{文本}$ → $\text{文本}$（正体文本）
```

### 6.2 空格

```markdown
$a\!b$ → $a\!b$（负空格）
$ab$ → $ab$（无空格）
$a\,b$ → $a\,b$（薄空格）
$a\;b$ → $a\;b$（中等空格）
$a\quad b$ → $a\quad b$（1em 空格）
$a\qquad b$→ $a\qquad b$（2em 空格）
```

### 6.3 颜色

```markdown
$\textcolor{red}{红色文字}$ → $\textcolor{red}{红色文字}$
$\textcolor{blue}{蓝色文字}$ → $\textcolor{blue}{蓝色文字}$
```

## 7. 常见公式示例

### 7.1 欧拉公式

$$
e^{i\pi} + 1 = 0
$$

### 7.2 高斯积分

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

### 7.3 傅里叶变换

$$
\hat{f}(\xi) = \int_{-\infty}^{\infty} f(x) e^{-2\pi i x \xi} dx
$$

### 7.4 贝叶斯定理

$$
P(A|B) = \frac{P(B|A) \cdot P(A)}{P(B)}
$$

## 8. KaTeX 兼容性

### 8.1 KaTeX 不支持的语法

| 语法                | 说明       | 替代方案          |
| :------------------ | :--------- | :---------------- |
| `\begin{align}`     | 多行对齐   | `\begin{aligned}` |
| `\label{}`          | 交叉引用   | 手动编号          |
| `\ref{}`            | 引用标签   | 手动引用          |
| `\newcommand`       | 自定义命令 | 部分支持          |
| 某些 `\text{}` 嵌套 | 复杂文本   | 简化结构          |

### 8.2 调试技巧

- 公式不渲染时，检查语法是否正确
- 使用 [KaTeX Demo](https://katex.org/) 在线测试
- 确认 `$` 和 `$$` 前后有空行或空格
- 特殊字符需要转义：`\{`、`\}`、`\_`

## 9. 平台支持与实战提示

数学公式是平台扩展功能，GitHub 自 2022 年 5 月起支持（行内 `$...$` 与块级 `$$...$$`，渲染引擎为 MathJax）；GitLab、Obsidian（需插件）、Typora、Hugo（需配置渲染管线）等各有差异。

```markdown
行内公式：$E = mc^2$

$$
\int_0^1 x^2 \, dx = rac{1}{3}
$$
```

实战提示：

1. **美元金额与公式定界符冲突**：`价格 $5，折扣 $10` 中两个 `$` 之间的内容可能被误解析为公式（GitHub 上数字紧跟 `$` 时更容易触发）。金额场景转义为 `\$` 或写 "USD"。
2. **公式内不能有空格包裹歧义**：GitHub 要求行内定界符 `$` 紧贴公式内容（`$ x^2 $` 不渲染），并遵守"开定界符后非空格、闭定界符前非空格"的规则。
3. **公式放在代码块或行内代码里不会渲染**：想展示公式源码本身，用反引号包裹。
4. **跨平台文档**：公式在纯文本环境（RSS、终端）只会显示 `$...$` 源码，关键结论不要只写在公式里。
