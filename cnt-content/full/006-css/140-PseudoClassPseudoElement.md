---
order: 140
title: 伪类与伪元素
module: 'css'
category: 前端技术
difficulty: intermediate
description: :nth-child、:not、:is、::before、::after
author: fanquanpp
updated: '2026-09-13'
related:
  - 'css/210-TraditionalLayoutTech'
  - 'css/240-CSS3FlexboxFlexLayout'
  - 'css/170-PriorityCalculation'
  - 'css/040-StyleSheetImportMethod'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
---

## 前置知识

建议先阅读以下内容再进入本文：

- [CSS3 概述与基本语法](/css/020-CSS3OverviewBasicSyntax)

## 伪元素

**基本写法：::before 前置内容**
`<选择器>::before { content: <内容>; }`
```css
/* 添加前置图标 */
.link::before {
  content: "→ ";
}
```

---

**基本写法：::after 后置内容**
`<选择器>::after { content: <内容>; }`
```css
/* 添加后置内容 */
.required::after {
  content: " *";
  color: red;
}
```

---

**基本写法：::first-letter 首字母**
`<选择器>::first-letter { }`
```css
/* 段落首字母放大 */
p::first-letter {
  font-size: 2em;
  float: left;
}
```

---

**基本写法：::first-line 首行**
`<选择器>::first-line { }`
```css
/* 段落首行样式 */
p::first-line {
  font-weight: bold;
}
```

---

**基本写法：::selection 选中文本**
`::selection { }`
```css
/* 选中文本样式 */
::selection {
  background: #3498db;
  color: white;
}
```

---

**基本写法：::placeholder 占位符**
`input::placeholder { }`
```css
/* 占位符文本样式 */
input::placeholder {
  color: #999;
}
```

---

**基本写法：::marker 列表标记**
`li::marker { }`
```css
/* 列表项标记样式 */
li::marker {
  color: #3498db;
  font-weight: bold;
}
```

---

**基本写法：::file-selector-button 文件按钮**
`input[type=file]::file-selector-button { }`
```css
/* 文件选择按钮样式 */
input[type=file]::file-selector-button {
  background: #3498db;
  color: white;
  border: none;
  padding: 6px 12px;
}
```

---

## 结构伪类

**基本写法：:first-child 第一个子元素**
`<选择器>:first-child { }`
```css
/* 第一个列表项样式 */
li:first-child {
  font-weight: bold;
}
```

---

**基本写法：:last-child 最后一个子元素**
`<选择器>:last-child { }`
```css
/* 最后一个列表项样式 */
li:last-child {
  border-bottom: none;
}
```

---

**基本写法：:only-child 唯一子元素**
`<选择器>:only-child { }`
```css
/* 父元素唯一子元素样式 */
.icon:only-child {
  margin: 0 auto;
}
```

---

**基本写法：:first-of-type 同类型首个**
`<选择器>:first-of-type { }`
```css
/* 第一个段落样式 */
p:first-of-type {
  font-size: 1.2em;
}
```

---

**基本写法：:last-of-type 同类型末个**
`<选择器>:last-of-type { }`
```css
/* 最后一个段落样式 */
p:last-of-type {
  margin-bottom: 0;
}
```

---

**基本写法：:nth-child 第 N 个子元素**
`<选择器>:nth-child(<n>) { }`
```css
/* 第 2 个子元素 */
li:nth-child(2) {
  color: red;
}
```

---

**基本写法：:nth-child 奇偶**
`<选择器>:nth-child(odd | even) { }`
```css
/* 隔行变色 */
tr:nth-child(even) {
  background: #f9f9f9;
}
```

---

**基本写法：:nth-child 公式**
`<选择器>:nth-child(<公式>) { }`
```css
/* 每 3 个元素选第 1 个 */
li:nth-child(3n+1) {
  color: blue;
}
```

---

**基本写法：:nth-last-child 倒数第 N 个**
`<选择器>:nth-last-child(<n>) { }`
```css
/* 倒数第 2 个子元素 */
li:nth-last-child(2) {
  color: green;
}
```

---

**基本写法：:nth-of-type 同类型第 N 个**
`<选择器>:nth-of-type(<n>) { }`
```css
/* 第 2 个段落 */
p:nth-of-type(2) {
  color: red;
}
```

---

**基本写法：:empty 空元素**
`<选择器>:empty { }`
```css
/* 空段落隐藏 */
p:empty {
  display: none;
}
```

---

**基本写法：:root 根元素**
`:root { }`
```css
/* 定义全局 CSS 变量 */
:root {
  --primary: #3498db;
}
```

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
## 链接与交互伪类

**基本写法：:link 未访问链接**
`a:link { }`
```css
/* 未访问链接样式 */
a:link {
  color: blue;
}
```

---

**基本写法：:visited 已访问链接**
`a:visited { }`
```css
/* 已访问链接样式 */
a:visited {
  color: purple;
}
```

---

**基本写法：:hover 悬停**
`<选择器>:hover { }`
```css
/* 鼠标悬停样式 */
.button:hover {
  background: #2980b9;
}
```

---

**基本写法：:active 激活**
`<选择器>:active { }`
```css
/* 鼠标按下样式 */
.button:active {
  transform: scale(0.95);
}
```

---

**基本写法：:focus 获得焦点**
`<选择器>:focus { }`
```css
/* 获得焦点样式 */
input:focus {
  border-color: #3498db;
  outline: none;
}
```

---

**基本写法：:focus-visible 键盘焦点**
`<选择器>:focus-visible { }`
```css
/* 仅键盘聚焦时显示焦点框 */
input:focus-visible {
  outline: 2px solid #3498db;
}
```

---

**基本写法：:focus-within 子元素聚焦**
`<选择器>:focus-within { }`
```css
/* 子元素获得焦点时父元素样式 */
.form:focus-within {
  border-color: #3498db;
}
```

---

## 表单伪类

**基本写法：:checked 选中状态**
`input:checked { }`
```css
/* 复选框选中样式 */
input:checked + label {
  color: #27ae60;
}
```

---

**基本写法：:disabled 禁用**
`input:disabled { }`
```css
/* 禁用输入框样式 */
input:disabled {
  background: #f0f0f0;
  cursor: not-allowed;
}
```

---

**基本写法：:enabled 可用**
`input:enabled { }`
```css
/* 可用输入框样式 */
input:enabled {
  background: white;
}
```

---

**基本写法：:required 必填**
`input:required { }`
```css
/* 必填字段样式 */
input:required {
  border-left: 3px solid #e74c3c;
}
```

---

**基本写法：:valid 有效**
`input:valid { }`
```css
/* 校验通过样式 */
input:valid {
  border-color: #27ae60;
}
```

---

**基本写法：:invalid 无效**
`input:invalid { }`
```css
/* 校验失败样式 */
input:invalid {
  border-color: #e74c3c;
}
```

---

**基本写法：:placeholder-shown 占位显示**
`input:placeholder-shown { }`
```css
/* 输入框为空显示占位符时 */
input:placeholder-shown {
  background: #fafafa;
}
```

---

**基本写法：:read-only 只读**
`input:read-only { }`
```css
/* 只读输入框样式 */
input:read-only {
  background: #f5f5f5;
}
```

---

## 否定与匹配伪类

**基本写法：:not 否定**
`<选择器>:not(<排除选择器>) { }`
```css
/* 非特殊按钮的样式 */
.button:not(.special) {
  background: gray;
}
```

---

**基本写法：:not 多条件否定**
`<选择器>:not(<选择器1>, <选择器2>) { }`
```css
/* 排除多个选择器 */
input:not(:disabled, [type="hidden"]) {
  border: 1px solid #ccc;
}
```

---

**基本写法：:is 匹配任一**
`<选择器>:is(<选择器1>, <选择器2>) { }`
```css
/* 匹配多个标题级别 */
:is(h1, h2, h3) {
  color: #333;
}
```

---

**基本写法：:where 匹配任一（零优先级）**
`<选择器>:where(<选择器1>, <选择器2>) { }`
```css
/* 零优先级匹配便于覆盖 */
:where(.card) .title {
  font-size: 1.2em;
}
```

---

## 状态伪类

**基本写法：:target 目标锚点**
`<选择器>:target { }`
```css
/* 锚点目标高亮 */
.section:target {
  background: #fffacd;
}
```

---

**基本写法：:default 默认选项**
`input:default { }`
```css
/* 默认选中的单选按钮 */
input:default {
  box-shadow: 0 0 0 2px #3498db;
}
```

---

**基本写法：:indeterminate 不确定状态**
`input:indeterminate { }`
```css
/* 不确定状态复选框 */
input:indeterminate {
  background: gray;
}
```

---

## 现代 CSS 伪类（2024+）

**基本写法：:has 父级选择**
`<选择器>:has(<子选择器>) { }`
```css
/* 包含图片的卡片样式 */
.card:has(img) {
  padding: 0;
}
```

---

**基本写法：:has 否定形式**
`<选择器>:not(:has(<子选择器>)) { }`
```css
/* 不包含错误的表单 */
.form:not(:has(.error)) {
  border-color: #27ae60;
}
```

---

**基本写法：:has 多条件**
`<选择器>:has(<选择器1>, <选择器2>) { }`
```css
/* 包含图片或视频的容器 */
.container:has(img, video) {
  aspect-ratio: 16 / 9;
}
```

---

**基本写法：:defined 自定义元素已定义**
`<选择器>:defined { }`
```css
/* 自定义元素定义后显示 */
custom-element:not(:defined) {
  display: none;
}
```

---

**基本写法：:modal 模态框**
`<选择器>:modal { }`
```css
/* 原生模态框样式 */
dialog:modal {
  border: none;
  border-radius: 8px;
}
```

---

**基本写法：:fullscreen 全屏**
`<选择器>:fullscreen { }`
```css
/* 全屏元素样式 */
.video:fullscreen {
  width: 100vw;
  height: 100vh;
}
```

---

**基本写法：:picture-in-picture 画中画**
`<选择器>:picture-in-picture { }`
```css
/* 画中画视频样式 */
video:picture-in-picture {
  border: 2px solid #3498db;
}
```

---

**基本写法：:playing 播放中**
`<选择器>:playing { }`
```css
/* 视频播放时样式 */
video:playing {
  filter: brightness(1.1);
}
```

---

## @scope 作用域（2024+）

**基本写法：@scope 限定作用域**
`@scope (<选择器>) { <规则> }`
```css
/* 限定样式作用范围 */
@scope (.card) {
  .title {
    color: red;
  }
}
```

---

**基本写法：@scope 范围限定**
`@scope (<起>) to (<止>) { }`
```css
/* 限定到 .start 到 .end 之间 */
@scope (.start) to (.end) {
  p {
    color: blue;
  }
}
```
## 交互状态伪类

**基本写法：hover 悬停**
`<选择器>:hover { <样式> }`
```css
/* 鼠标悬停状态 */
.button:hover {
  background-color: #0056b3;
}
```

---

**基本写法：focus 聚焦**
`<选择器>:focus { <样式> }`
```css
/* 元素获得焦点 */
input:focus {
  border-color: #007bff;
}
```

---

**基本写法：focus-visible 键盘聚焦**
`<选择器>:focus-visible { <样式> }`
```css
/* 仅键盘聚焦时显示 */
button:focus-visible {
  outline: 2px solid #007bff;
}
```

---

**基本写法：focus-within 子元素聚焦**
`<选择器>:focus-within { <样式> }`
```css
/* 子元素获得焦点时 */
.form:focus-within {
  border-color: #007bff;
}
```

---

**基本写法：active 激活**
`<选择器>:active { <样式> }`
```css
/* 元素被激活（点击） */
.button:active {
  transform: scale(0.95);
}
```

---

**基本写法：visited 已访问**
`<选择器>:visited { <样式> }`
```css
/* 链接已访问状态 */
a:visited {
  color: purple;
}
```

---

**基本写法：link 未访问**
`<选择器>:link { <样式> }`
```css
/* 链接未访问状态 */
a:link {
  color: blue;
}
```

---

## 表单状态伪类

**基本写法：checked 选中**
`<选择器>:checked { <样式> }`
```css
/* 复选框或单选框选中 */
input:checked {
  accent-color: #007bff;
}
```

---

**基本写法：disabled 禁用**
`<选择器>:disabled { <样式> }`
```css
/* 表单元素禁用 */
input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}
```

---

**基本写法：enabled 可用**
`<选择器>:enabled { <样式> }`
```css
/* 表单元素可用 */
input:enabled {
  background-color: white;
}
```

---

**基本写法：required 必填**
`<选择器>:required { <样式> }`
```css
/* 必填字段 */
input:required {
  border-color: red;
}
```

---

**基本写法：optional 可选**
`<选择器>:optional { <样式> }`
```css
/* 可选字段 */
input:optional {
  border-color: #ccc;
}
```

---

**基本写法：valid 有效**
`<选择器>:valid { <样式> }`
```css
/* 表单验证通过 */
input:valid {
  border-color: green;
}
```

---

**基本写法：invalid 无效**
`<选择器>:invalid { <样式> }`
```css
/* 表单验证失败 */
input:invalid {
  border-color: red;
}
```

---

**基本写法：in-range 范围内**
`<选择器>:in-range { <样式> }`
```css
/* 数值在指定范围内 */
input:in-range {
  border-color: green;
}
```

---

**基本写法：out-of-range 范围外**
`<选择器>:out-of-range { <样式> }`
```css
/* 数值超出指定范围 */
input:out-of-range {
  border-color: red;
}
```

---

**基本写法：read-only 只读**
`<选择器>:read-only { <样式> }`
```css
/* 只读字段 */
input:read-only {
  background-color: #f5f5f5;
}
```

---

**基本写法：read-write 可读写**
`<选择器>:read-write { <样式> }`
```css
/* 可读写字段 */
input:read-write {
  background-color: white;
}
```

---

**基本写法：placeholder-shown 占位符显示**
`<选择器>:placeholder-shown { <样式> }`
```css
/* 显示占位符时 */
input:placeholder-shown {
  border-color: #ccc;
}
```

---

**基本写法：default 默认选中**
`<选择器>:default { <样式> }`
```css
/* 默认选中的表单元素 */
input:default {
  box-shadow: 0 0 2px blue;
}
```

---

## 目标伪类

**基本写法：target 锚点目标**
`<选择器>:target { <样式> }`
```css
/* 当前锚点指向的元素 */
#section:target {
  background-color: #ffffcc;
}
```

---

## 语言伪类

**基本写法：lang 语言匹配**
`<选择器>:lang(<语言>) { <样式> }`
```css
/* 匹配指定语言 */
p:lang(zh) {
  font-family: "Microsoft YaHei", sans-serif;
}
```

---

## 否定伪类

**基本写法：not 否定**
`<选择器>:not(<排除选择器>) { <样式> }`
```css
/* 排除指定选择器 */
input:not([disabled]) {
  border: 1px solid #ccc;
}
```

---

**基本写法：not 多重否定**
`<选择器>:not(<选择器1>):not(<选择器2>) { <样式> }`
```css
/* 多重否定 */
input:not([disabled]):not([type="hidden"]) {
  border: 1px solid #ccc;
}
```

---

## 匹配伪类

**基本写法：is 匹配任一**
`:is(<选择器1>, <选择器2>) { <样式> }`
```css
/* 匹配多个选择器 */
:is(h1, h2, h3) {
  font-family: sans-serif;
}
```

---

**基本写法：where 匹配任一**
`:where(<选择器1>, <选择器2>) { <样式> }`
```css
/* 匹配多个选择器（零特异性） */
:where(.card, .panel) {
  padding: 1rem;
}
```

---

**基本写法：has 父选择器**
`<选择器>:has(<子选择器>) { <样式> }`
```css
/* 选中包含指定子元素的父元素 */
div:has(img) {
  padding: 10px;
}
```

---

**基本写法：has 否定**
`<选择器>:not(:has(<子选择器>)) { <样式> }`
```css
/* 不包含指定子元素 */
div:not(:has(img)) {
  background: #f5f5f5;
}
```
## 伪元素内容生成

**基本写法：content 字符串**
`content: "<文本>";`
```css
/* 生成文本内容 */
.label::before {
  content: "标签: ";
}
```

---

**基本写法：content attr 属性**
`content: attr(<属性名>);`
```css
/* 生成元素属性值 */
a::after {
  content: " (" attr(href) ")";
}
```

---

**基本写法：content 空字符串**
`content: "";`
```css
/* 生成空内容用于布局 */
.clearfix::after {
  content: "";
  display: block;
  clear: both;
}
```

---

**基本写法：content url 图片**
`content: url("<图片路径>");`
```css
/* 生成图片内容 */
.icon::before {
  content: url("icon.png");
}
```

---

**基本写法：content 计数器**
`content: counter(<计数器名>);`
```css
/* 显示计数器值 */
li::before {
  content: counter(item) ". ";
}
```

---

## 计数器

**基本写法：counter-reset 重置计数器**
`counter-reset: <计数器名> <初始值>;`
```css
/* 重置计数器 */
ol {
  counter-reset: section;
}
```

---

**基本写法：counter-increment 递增计数器**
`counter-increment: <计数器名> <步长>;`
```css
/* 计数器递增 */
li {
  counter-increment: section;
}
```

---

**基本写法：counter 显示计数器**
`content: counter(<计数器名>);`
```css
/* 显示计数器值 */
li::before {
  content: "第 " counter(section) " 章: ";
}
```

---

**基本写法：counter 自定义样式**
`content: counter(<计数器名>, <样式>);`
```css
/* 计数器使用中文数字 */
li::before {
  content: counter(section, cjk-ideographic) "、";
}
```

---

**基本写法：counters 嵌套计数器**
`content: counters(<计数器名>, "<分隔符>");`
```css
/* 嵌套计数器 */
li::before {
  content: counters(section, ".") " ";
}
```

---

## 伪元素动画

**基本写法：伪元素过渡**
`<选择器>::before { transition: <属性> <时长>; }`
```css
/* 伪元素过渡动画 */
.button::before {
  transition: transform 0.3s;
}
.button:hover::before {
  transform: scaleX(1);
}
```

---

**基本写法：伪元素动画**
`<选择器>::after { animation: <名称> <时长>; }`
```css
/* 伪元素动画 */
.loader::after {
  animation: spin 1s linear infinite;
}
```

---

## 伪元素布局

**基本写法：clearfix 清除浮动**
`.clearfix::after { content: ""; display: table; clear: both; }`
```css
/* 清除浮动 */
.clearfix::after {
  content: "";
  display: table;
  clear: both;
}
```

---

**基本写法：tooltip 工具提示**
`<选择器>::after { content: attr(data-tooltip); <样式> }`
```css
/* 使用伪元素创建工具提示 */
[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  background: black;
  color: white;
  padding: 4px 8px;
  opacity: 0;
  transition: opacity 0.3s;
}
[data-tooltip]:hover::after {
  opacity: 1;
}
```

---

**基本写法：下划线动画**
`<选择器>::after { content: ""; <样式> }`
```css
/* 悬停下划线动画 */
.link::after {
  content: "";
  display: block;
  width: 0;
  height: 2px;
  background: currentColor;
  transition: width 0.3s;
}
.link:hover::after {
  width: 100%;
}
```

## 本章综合挑战（选做）

1. 用 `:nth-child(odd)` 给表格做隔行变色；
2. 用 `::before` 给必填项加红色星号；
3. 用 `:focus-visible` 给键盘焦点加可见描边；
4. 用 `:has()` 实现“含图片的卡片显示大图”；
5. 用计数器自动生成“第 1 节/第 2 节”标题编号。

## 核心知识点

> 一句话记住伪类/伪元素：单冒号看状态（hover、nth-child），双冒号造内容（before、after）；`:not` 排除、`:is` 合并、`:has` 找父。

- 伪类匹配状态与位置：`:hover`、`:focus`、`:active`、`:nth-child`、`:checked`；
- 伪元素生成内容：`::before`/`::after` 必须有 `content`；
- `:nth-child(An+B)` 的语法：`odd`/`even`/`-n+3`；
- `:nth-of-type` 与 `:nth-child` 的区别是“同类型 vs 所有兄弟”；
- `:is()` 合并选择器，`:where()` 合并且优先级为 0，`:has()` 反向匹配父元素；
- 现代增强：`:user-invalid`、`:focus-visible`、`@scope`、计数器。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 伪元素忘记 `content` | 不显示 | 至少写 `content: ''` |
| `:nth-child` 与 `:nth-of-type` 混用 | 选中元素不符合预期 | 按“所有兄弟/同类型”区分 |
| 用 `:hover` 做移动端交互 | 触屏无悬停 | 用 `:focus`/媒体查询 |
| 大量 `:has()` 嵌套 | 匹配性能下降 | 简化选择器或改用类 |
| 移除 `:focus` 样式 | 键盘用户迷失 | 保留 `:focus-visible` 样式 |
| `:where` 优先级困惑 | 覆盖失败 | 记住它优先级为 0 |

## 扩展学习

- 选择器总览：`css/130-CSS3SelectorSystem`；
- 优先级计算：`css/170-PriorityCalculation`；
- 表单状态：`css/360-MediaQuery` 之外的 `:user-invalid` 等交互增强；
- 嵌套与作用域：`css/720-CSSNestingInPractice`、`css/710-ScopeAtRule`；
- 伪元素布局：`css/680-CSSProjectExampleResponsiveHomepage` 中的实际应用。
