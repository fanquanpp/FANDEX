---
order: 140
title: LaTeX 数学公式
module: 'markdown'
category: 工具链
difficulty: intermediate
description: Markdown中LaTeX数学公式的完整语法：行内公式、块级公式与KaTeX兼容性。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'markdown/012-Emoji'
  - 'markdown/013-SubscriptSuperscript'
  - 'markdown/015-Mermaid'
  - 'markdown/016-EditorFeature'
prerequisites:
  - 'markdown/001-SyntaxGuide'
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
## 行内公式

**单行写法：使用单个 $ 包裹行内公式**
`$<公式>$`
```markdown
质能方程 $E = mc^2$ 是物理学最著名的公式之一。
```

---

## 块级公式

**换行写法：使用双 $$ 包裹块级公式**
`$$\n<公式>\n$$`
```markdown
$$
E = mc^2
$$
```

---

## 上标与下标

**单行写法：上标使用 ^ 符号**
`$<底>^<指数>$`
```markdown
$x^2$
```

**单行写法：多字符上标使用花括号**
`$<底>^{<指数>}$`
```markdown
$x^{10}$
```

**单行写法：下标使用 _ 符号**
`$<底>_<下标>$`
```markdown
$a_n$
```

**单行写法：多字符下标使用花括号**
`$<底>_{<下标>}$`
```markdown
$a_{ij}$
```

**单行写法：上下标组合**
`$<底>_<下标>^<指数>$`
```markdown
$x_1^2$
```

---

## 分数

**单行写法：基本分数**
`$\frac{<分子>}{<分母>}$`
```markdown
$\frac{a}{b}$
```

**单行写法：大分数**
`$\dfrac{<分子>}{<分母>}$`
```markdown
$\dfrac{a}{b}$
```

**单行写法：连分数**
`$\cfrac{<分子>}{<分母>}$`
```markdown
$\cfrac{1}{1+\cfrac{1}{1+\cfrac{1}{1}}}$
```

---

## 根号

**单行写法：平方根**
`$\sqrt{<表达式>}$`
```markdown
$\sqrt{2}$
```

**单行写法：n 次方根**
`$\sqrt[<n>]{<表达式>}$`
```markdown
$\sqrt[3]{8}$
```

---

## 希腊字母

**单行写法：小写希腊字母 alpha**
`$\alpha$`
```markdown
$\alpha$
```

**单行写法：小写希腊字母 beta**
`$\beta$`
```markdown
$\beta$
```

**单行写法：小写希腊字母 gamma**
`$\gamma$`
```markdown
$\gamma$
```

**单行写法：小写希腊字母 delta**
`$\delta$`
```markdown
$\delta$
```

**单行写法：小写希腊字母 theta**
`$\theta$`
```markdown
$\theta$
```

**单行写法：小写希腊字母 lambda**
`$\lambda$`
```markdown
$\lambda$
```

**单行写法：小写希腊字母 pi**
`$\pi$`
```markdown
$\pi$
```

**单行写法：小写希腊字母 sigma**
`$\sigma$`
```markdown
$\sigma$
```

**单行写法：小写希腊字母 omega**
`$\omega$`
```markdown
$\omega$
```

**单行写法：大写希腊字母 Gamma**
`$\Gamma$`
```markdown
$\Gamma$
```

**单行写法：大写希腊字母 Delta**
`$\Delta$`
```markdown
$\Delta$
```

**单行写法：大写希腊字母 Sigma**
`$\Sigma$`
```markdown
$\Sigma$
```

**单行写法：大写希腊字母 Omega**
`$\Omega$`
```markdown
$\Omega$
```

---

## 求和与积分

**单行写法：求和**
`$\sum_{<下界>}^{<上界>} <表达式>$`
```markdown
$\sum_{i=1}^{n} i$
```

**单行写法：乘积**
`$\prod_{<下界>}^{<上界>} <表达式>$`
```markdown
$\prod_{i=1}^{n} i$
```

**单行写法：定积分**
`$\int_{<下界>}^{<上界>} <表达式> d<变量>$`
```markdown
$\int_{0}^{\infty} f(x) dx$
```

**单行写法：二重积分**
`$\iint_{<区域>} <表达式> d<变量>$`
```markdown
$\iint_{D} f(x,y) dA$
```

**单行写法：环路积分**
`$\oint_{<路径>} <表达式>$`
```markdown
$\oint_{C} F \cdot dr$
```

---

## 极限与导数

**单行写法：极限**
`$\lim_{<变量> \to <值>} <表达式>$`
```markdown
$\lim_{x \to \infty} f(x)$
```

**单行写法：导数**
`$\frac{d<因变量>}{d<自变量>}$`
```markdown
$\frac{dy}{dx}$
```

**单行写法：偏导数**
`$\frac{\partial <函数>}{\partial <变量>}$`
```markdown
$\frac{\partial f}{\partial x}$
```

**单行写法：梯度**
`$\nabla <函数>$`
```markdown
$\nabla f$
```

---

## 关系运算符

**单行写法：小于等于**
`$\leq$`
```markdown
$\leq$
```

**单行写法：大于等于**
`$\geq$`
```markdown
$\geq$
```

**单行写法：不等于**
`$\neq$`
```markdown
$\neq$
```

**单行写法：约等于**
`$\approx$`
```markdown
$\approx$
```

**单行写法：恒等于**
`$\equiv$`
```markdown
$\equiv$
```

**单行写法：属于**
`$\in$`
```markdown
$\in$
```

**单行写法：子集**
`$\subseteq$`
```markdown
$\subseteq$
```

**单行写法：任意**
`$\forall$`
```markdown
$\forall$
```

**单行写法：存在**
`$\exists$`
```markdown
$\exists$
```

---

## 矩阵

**换行写法：圆括号矩阵**
`\begin{pmatrix} ... \end{pmatrix}`
```markdown
$$
\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
$$
```

**换行写法：方括号矩阵**
`\begin{bmatrix} ... \end{bmatrix}`
```markdown
$$
\begin{bmatrix}
1 & 2 & 3 \\
4 & 5 & 6 \\
7 & 8 & 9
\end{bmatrix}
$$
```

**换行写法：行列式**
`\begin{vmatrix} ... \end{vmatrix}`
```markdown
$$
\begin{vmatrix}
a & b \\
c & d
\end{vmatrix} = ad - bc
$$
```

**换行写法：增广矩阵**
`\left[\begin{array}{cc|c} ... \end{array}\right]`
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

---

## 方程组与分段函数

**换行写法：方程组**
`\begin{cases} ... \end{cases}`
```markdown
$$
\begin{cases}
x + y = 5 \\
2x - y = 1
\end{cases}
$$
```

**换行写法：分段函数**
`f(x) = \begin{cases} ... \end{cases}`
```markdown
$$
f(x) = \begin{cases}
x^2 & \text{if } x \geq 0 \\
-x^2 & \text{if } x < 0
\end{cases}
$$
```

---

## 字体控制

**单行写法：粗体**
`$\mathbf{<文本>}$`
```markdown
$\mathbf{A}$
```

**单行写法：黑板粗体**
`$\mathbb{<文本>}$`
```markdown
$\mathbb{R}$
```

**单行写法：花体**
`$\mathcal{<文本>}$`
```markdown
$\mathcal{L}$
```

**单行写法：正体文本**
`$\text{<文本>}$`
```markdown
$\text{if } x \geq 0$
```

---

## 空格控制

**单行写法：负空格**
`$\<命令>$`
```markdown
$a\!b$
```

**单行写法：薄空格**
`$a\,b$`
```markdown
$a\,b$
```

**单行写法：中等空格**
`$a\;b$`
```markdown
$a\;b$
```

**单行写法：1em 空格**
`$a\quad b$`
```markdown
$a\quad b$
```

**单行写法：2em 空格**
`$a\qquad b$`
```markdown
$a\qquad b$
```

---

## 颜色

**单行写法：红色文字**
`$\textcolor{red}{<文本>}$`
```markdown
$\textcolor{red}{红色文字}$
```

**单行写法：蓝色文字**
`$\textcolor{blue}{<文本>}$`
```markdown
$\textcolor{blue}{蓝色文字}$
```

---

## 常见公式示例

**换行写法：欧拉公式**
`$$\n<公式>\n$$`
```markdown
$$
e^{i\pi} + 1 = 0
$$
```

**换行写法：高斯积分**
`$$\n<公式>\n$$`
```markdown
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$
```

**换行写法：贝叶斯定理**
`$$\n<公式>\n$$`
```markdown
$$
P(A|B) = \frac{P(B|A) \cdot P(A)}{P(B)}
$$
```
