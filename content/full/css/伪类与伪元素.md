---
order: 50
title: 伪类与伪元素
module: css
category: CSS
difficulty: intermediate
description: ':nth-child、:not、:is、::before、::after'
author: fanquanpp
updated: '2026-06-14'
related:
  - css/传统布局技术
  - css/Flexbox弹性布局
  - css/优先级计算
  - css/样式表引入方式
prerequisites:
  - css/概述与基本语法
---

## 1. 伪类概述

伪类用于匹配元素的特定状态。

| 类别     | 示例                           | 说明     |
| -------- | ------------------------------ | -------- |
| 交互状态 | `:hover`, `:focus`, `:active`  | 用户交互 |
| 位置     | `:first-child`, `:nth-child()` | DOM 位置 |
| 输入状态 | `:checked`, `:disabled`        | 表单状态 |
| 否定     | `:not()`                       | 排除匹配 |
| 匹配     | `:is()`, `:where()`, `:has()`  | 复杂匹配 |

## 2. :nth-child()

```css
li:nth-child(3) {
  color: red;
} /* 第 3 个 */
tr:nth-child(odd) {
  background: #f0f0f0;
} /* 奇数 */
li:nth-child(3n + 1) {
  color: blue;
} /* 每 3 个选第 1 个 */
li:nth-child(-n + 3) {
  font-weight: bold;
} /* 前 3 个 */
```

**An+B 语法**：`2n+1` = odd，`2n` = even，`-n+3` = 前3个

### nth-child vs nth-of-type

```html
<div>
  <h1>标题</h1>
  <!-- h1:first-of-type -->
  <p>段落1</p>
  <!-- p:nth-of-type(1) -->
  <p>段落2</p>
  <!-- p:nth-of-type(2) -->
</div>
```

## 3. 否定与匹配伪类

```css
li:not(:last-child) {
  border-bottom: 1px solid #ccc;
}
:is(h1, h2, h3):hover {
  color: blue;
}
:where(h1, h2, h3) {
  margin: 0;
} /* 优先级为 0 */
a:has(> img) {
  border: none;
}
```

## 4. 交互伪类

```css
a:hover {
  color: blue;
}
input:focus-visible {
  box-shadow: 0 0 0 3px rgba(0, 0, 255, 0.3);
}
input:focus-within {
  border-color: blue;
}
button:active {
  transform: scale(0.98);
}
```

## 5. 伪元素

```css
.quote::before {
  content: '\201C';
  font-size: 2em;
}
.clearfix::after {
  content: '';
  display: table;
  clear: both;
}
p::first-line {
  font-weight: bold;
}
p::first-letter {
  font-size: 3em;
  float: left;
}
::selection {
  background: #ff6b6b;
  color: white;
}
input::placeholder {
  color: #999;
}
```
