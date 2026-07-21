---
order: 57
title: 下标与上标
module: markdown
category: 'Markdown Basics'
difficulty: intermediate
description: Markdown中实现下标与上标的多种方式：HTML标签、LaTeX公式与扩展语法。
author: fanquanpp
updated: '2026-06-14'
related:
  - markdown/自动链接
  - markdown/Emoji表情
  - markdown/LaTeX数学公式
  - markdown/Mermaid图表
prerequisites:
  - markdown/语法指南
---

## 1. 下标与上标概述

### 1.1 为什么需要上下标

下标和上标在科学、数学和技术文档中广泛使用：

| 类型     | 用途             | 示例           |
| :------- | :--------------- | :------------- |
| **上标** | 指数、序数、单位 | $x^2$、1st、m² |
| **下标** | 化学式、变量编号 | H₂O、$a_n$     |

### 1.2 Markdown 标准的局限

原始 Markdown 和 CommonMark **没有**原生的上下标语法，需要借助以下方式实现：

1. HTML 标签
2. LaTeX 数学公式
3. 扩展语法（平台特定）

## 2. HTML 标签方式

### 2.1 基本语法

```markdown
<!-- 上标 -->

x<sup>2</sup> + y<sup>2</sup> = z<sup>2</sup>

<!-- 下标 -->

H<sub>2</sub>O 是水的化学式
```

渲染结果：

- x<sup>2</sup> + y<sup>2</sup> = z<sup>2</sup>
- H<sub>2</sub>O 是水的化学式

### 2.2 常见用例

```markdown
<!-- 数学 -->

E = mc<sup>2</sup>

<!-- 化学 -->

2H<sub>2</sub> + O<sub>2</sub> → 2H<sub>2</sub>O

<!-- 单位 -->

面积 = 100 m<sup>2</sup>
体积 = 50 cm<sup>3</sup>

<!-- 序数 -->

1<sup>st</sup>, 2<sup>nd</sup>, 3<sup>rd</sup>

<!-- 注释标记 -->

这段话有注释<sup>[1]</sup>

<!-- 商标 -->

Brand™ 和 Company<sup>®</sup>
```

### 2.3 优缺点

| 方面     | 说明                                        |
| :------- | :------------------------------------------ |
| **优点** | 通用性最好，所有 Markdown 渲染器都支持 HTML |
| **缺点** | 语法冗长，影响 Markdown 的可读性            |
| **适用** | 需要最大兼容性的场景                        |

## 3. LaTeX 数学公式方式

### 3.1 行内公式

使用 `$...$` 包裹 LaTeX 数学公式：

```markdown
行内公式：$x^2 + y^2 = z^2$

化学式：$H_2O$

数列：$a_n = a_1 \cdot r^{n-1}$
```

### 3.2 块级公式

使用 `$$...$$` 包裹独立显示的公式：

```markdown
$$
E = mc^2
$$

$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$
```

### 3.3 上标语法

LaTeX 使用 `^` 表示上标：

```markdown
$x^2$ → $x^2$
$x^{10}$ → $x^{10}$（多位上标需花括号）
$x^{n+1}$ → $x^{n+1}$（表达式上标）
$x^{y^z}$ → $x^{y^z}$（嵌套上标）
```

### 3.4 下标语法

LaTeX 使用 `_` 表示下标：

```markdown
$a_n$ → $a_n$
$a_{10}$ → $a_{10}$（多位下标需花括号）
$a_{i,j}$ → $a_{i,j}$（多个下标）
$x_{max}$ → $x_{max}$
```

### 3.5 同时使用上下标

```markdown
$x_1^2$ → $x_1^2$
$a_n^{(k)}$ → $a_n^{(k)}$
$\sum_{i=1}^{n}$ → $\sum_{i=1}^{n}$
```

### 3.6 化学公式

```markdown
$H_2O$ → $H_2O$
$CO_2$ → $CO_2$
$Ca(OH)_2$ → $Ca(OH)_2$
$Fe_2O_3$ → $Fe_2O_3$
$CH_3COOH$ → $CH_3COOH$
```

## 4. 扩展语法

### 4.1 Pandoc 扩展

Pandoc 支持使用 `~` 和 `^` 表示下标和上标：

```markdown
H~~2~~O 是水

2^10^ = 1024
```

### 4.2 Obsidian 扩展

Obsidian 支持类似的语法：

```markdown
H~~2~~O
X^2^
```

### 4.3 扩展语法对比

| 平台           | 下标     | 上标     | 说明       |
| :------------- | :------- | :------- | :--------- |
| **Pandoc**     | `~text~` | `^text^` | 需启用扩展 |
| **Obsidian**   | `~text~` | `^text^` | 原生支持   |
| **Typora**     | `~text~` | `^text^` | 原生支持   |
| **CommonMark** |          |          | 不支持     |
| **GFM**        |          |          | 不支持     |

## 5. 方案选择建议

### 5.1 按场景选择

| 场景              | 推荐方案      | 理由               |
| :---------------- | :------------ | :----------------- |
| **简单上下标**    | HTML 标签     | 兼容性最好         |
| **数学公式**      | LaTeX         | 专业排版           |
| **化学公式**      | LaTeX 或 HTML | LaTeX 更灵活       |
| **学术论文**      | LaTeX         | 行业标准           |
| **技术文档**      | HTML 或 LaTeX | 视平台而定         |
| **GitHub README** | HTML          | GFM 不支持扩展语法 |

### 5.2 注意事项

- LaTeX 公式需要渲染器支持（KaTeX/MathJax）
- HTML 标签在代码块中不会被解析
- 扩展语法在跨平台时可能不兼容
- 建议在项目中统一使用一种方式
