# LaTeX 数学公式

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

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
