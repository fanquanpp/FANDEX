---
order: 470
title: CSS 计数器
module: 'css'
category: 前端技术
difficulty: intermediate
description: counter-reset、counter-increment 与 counter()/counters()，用 CSS 实现自动编号。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'css/024-PseudoClassPseudoElement'
  - 'css/018-CSSListStyle'
prerequisites:
  - 'css/008-CSS3SelectorSystem'
  - 'css/002-CSS3OverviewBasicSyntax'
---

## 0. 直觉：让浏览器替你“数数”

写文档时手动编号“第 1 章、第 2 章……”，插入一章后全部要改——CSS 计数器就是“自动计数牌”：定义一个计数器，每遇到一个元素就加 1，再把这个数显示出来。

三个关键词：`counter-reset`（初始化）、`counter-increment`（递增）、`counter()`（读出数值）。它和 `<ol>` 的自动编号原理相同，但可以显示在标题、列表项甚至任意元素上。

## 1. 核心用法

### 1.1 自动章节编号

```css
.doc {
  counter-reset: chapter; /* 初始化计数器 */
}
.doc h2::before {
  counter-increment: chapter; /* 每个 h2 加 1 */
  content: "第 " counter(chapter) " 章：";
}
```

```html
<div class="doc">
  <h2>起步</h2>  <!-- 第 1 章：起步 -->
  <h2>进阶</h2>  <!-- 第 2 章：进阶 -->
</div>
```

**讲解：**

- `counter-reset: chapter` 在容器上把计数器归零；
- `counter-increment` 递增，`counter(chapter)` 读出当前值；
- 编号由 CSS 生成，增删章节无需改 HTML。

### 1.2 嵌套编号：counters()

```css
.doc {
  counter-reset: section;
}
.doc h2 {
  counter-reset: subsection;
}
.doc h2::before {
  counter-increment: section;
  content: counter(section) ". ";
}
.doc h3::before {
  counter-increment: subsection;
  content: counter(section) "." counter(subsection) " ";
}
```

```html
<div class="doc">
  <h2>HTML</h2>
  <h3>标签</h3>   <!-- 1.1 标签 -->
  <h3>属性</h3>   <!-- 1.2 属性 -->
  <h2>CSS</h2>
  <h3>选择器</h3> <!-- 2.1 选择器 -->
</div>
```

**讲解：** 每层标题都有自己“归零 + 递增”的计数器；`counters(name, ".")` 还能一次性输出多层编号（如 `1.2.3`），适合多级列表。

### 1.3 列表计数

```css
ol {
  counter-reset: item;
  list-style: none;
}
ol li::before {
  counter-increment: item;
  content: counter(item, upper-roman) ". "; /* 用罗马数字格式 */
}
```

**讲解：** 把 `<ol>` 的原生编号隐藏（`list-style: none`），用 `::before` + 计数器自定义编号格式，实现“中文序号”“带括号序号”等效果。

### 1.4 计数器格式

```css
content: counter(item);                 /* 1, 2, 3 */
content: counter(item, upper-roman);    /* I, II, III */
content: counter(item, lower-alpha);    /* a, b, c */
content: counters(item, "-");           /* 1-1, 1-2 */
```

**讲解：** `counter()` 的第二个参数是编号样式，与 `list-style-type` 的取值一致；`counters(name, 连接符)` 用于嵌套层级。

## 2. 动手试试

1. 给一篇“三步教程”的 `h2` 加自动章节编号；
2. 实现“1.1 / 1.2”式的二级编号；
3. 把 `<ol>` 改成 `① ② ③` 样式（用计数器 + `::before`）；
4. 进阶挑战：用 `counters()` 实现多级目录编号。

提示：第 3 步除了 `counter(item)`，编号格式还可以用 `cjk-ideographic`（一、二、三）。骨架参考：

```css
ol {
  counter-reset: item;
  list-style: none;
}
ol li::before {
  counter-increment: item;
  content: counter(item) ". "; /* 先跑通数字版，再换其它格式 */
}
```

## 3. 核心知识点

> 一句话记住计数器：`counter-reset` 归零，`counter-increment` 加一，`counter()` 显示；嵌套用 `counters()`，格式参数同列表样式。

- 三步曲：reset（初始化）、increment（递增）、counter()（输出）；
- `counter()` 第二参数控制编号格式（罗马、字母等）；
- `counters(name, sep)` 输出多层编号；
- 常与 `::before` + `content` 配合显示；
- 编号由 CSS 生成，内容与样式分离；
- 适合章节、图注、自定义列表编号。

## 4. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 忘记 reset | 编号从上一个容器继续 | 每个作用域容器 reset |
| 计数元素非兄弟 | 编号混乱 | 确保 increment 与 reset 作用域匹配 |
| 用 JS 手写编号 | 增删后不同步 | 交给 CSS 计数器 |
| 与 `list-style` 混用 | 出现双编号 | 先 `list-style: none` |
| 依赖 `content` 做文本内容 | 读屏可能重复播报 | 纯装饰编号无碍，正文内容仍放 HTML |

## 5. 扩展学习

- 伪元素：`css/024-PseudoClassPseudoElement`（`::before`/`content`）；
- 列表样式：`css/018-CSSListStyle`；
- 选择器：`css/008-CSS3SelectorSystem`；
- 内容生成：`css/054-Function` 中 `counter()` 函数。
