---
order: 30
tags:
  - css
difficulty: intermediate
title: 'CSS3 选择器系统'
module: css
category: 'CSS Basics'
description: 基础选择器、组合选择器、伪类伪元素与优先级。
author: Anonymous
related:
  - css/概述与基本语法
  - css/盒模型详解
  - css/传统布局技术
  - css/Flexbox弹性布局
prerequisites: []
---

## 1. 基础选择器

基础选择器是 CSS 中最基本的选择器类型，用于选择 HTML 元素。

### 1.1 通配符选择器

通配符选择器 (`*`) 匹配文档中的所有元素：

```css
 /* 匹配所有元素 */
 *
  margin: 0;
  padding: 0;
  box-sizing: border-box;
 }
 /* 匹配特定元素内的所有元素 */
 .container * {
  color: #333;
 }
```

**使用场景**：

- 重置默认样式
- 对特定容器内的所有元素应用通用样式
  **注意**：通配符选择器的性能较低，应谨慎使用。

### 1.2 标签选择器

标签选择器匹配指定类型的 HTML 元素：

```css
/* 匹配所有 <p> 元素 */
p {
  font-size: 16px;
  line-height: 1.5;
}
/* 匹配所有 <div> 元素 */
div {
  margin-bottom: 20px;
}
/* 匹配所有 <h1> 到 <h6> 元素 */
h1,
h2,
h3,
h4,
h5,
h6 {
  font-weight: bold;
  color: #333;
}
```

**使用场景**：

- 对特定类型的元素应用通用样式
- 重置或覆盖浏览器默认样式

### 1.3 类选择器

类选择器 (`.*`) 匹配具有指定类名的元素：

```css
/* 匹配所有带有 .container 类的元素 */
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}
/* 匹配所有带有 .button 类的元素 */
.button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
/* 匹配同时带有 .button 和 .primary 类的元素 */
.button.primary {
  background-color: #3498db;
  color: white;
}
```

**使用场景**：

- 对多个不同类型的元素应用相同的样式
- 为元素添加特定的样式类

### 1.4 ID 选择器

ID 选择器 (`#*`) 匹配具有指定 ID 的元素：

```css
/* 匹配 ID 为 header 的元素 */
#header {
  background-color: #f8f9fa;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
/* 匹配 ID 为 main-content 的元素 */
#main-content {
  padding: 30px;
  background-color: white;
}
```

**使用场景**：

- 选择页面中唯一的元素
- 为特定元素应用独特的样式
  **注意**：ID 选择器的权重较高，应谨慎使用，避免过度使用导致样式难以覆盖。

### 1.5 属性选择器

属性选择器匹配具有指定属性或属性值的元素：

```css
/* 匹配具有 href 属性的元素 */
[a] {
  color: #3498db;
  text-decoration: none;
}
/* 匹配 href 属性值为 "https://example.com" 的元素 */
[a='https://example.com'] {
  font-weight: bold;
}
/* 匹配 href 属性值以 "https" 开头的元素 */
[a^='https'] {
  color: #27ae60;
}
/* 匹配 href 属性值以 ".com" 结尾的元素 */
[a$='.com'] {
  font-style: italic;
}
/* 匹配 href 属性值包含 "example" 的元素 */
[a*='example'] {
  text-decoration: underline;
}
/* 匹配 class 属性值包含 "button" 的元素 */
[class~='button'] {
  padding: 10px;
}
/* 匹配 lang 属性值为 "en" 或以 "en-" 开头的元素 */
[lang|='en'] {
  font-family: Arial, sans-serif;
}
```

**使用场景**：

- 为具有特定属性的元素应用样式
- 为具有特定属性值的元素应用样式
- 表单元素的样式化

## 2. 组合选择器

组合选择器用于选择具有特定关系的元素。

### 2.1 后代选择器

后代选择器 (` `) 匹配指定元素的所有后代元素：

```css
/* 匹配 .container 内的所有 <p> 元素 */
.container p {
  margin-bottom: 10px;
}
/* 匹配 .nav 内的所有 <a> 元素 */
.nav a {
  color: #333;
  text-decoration: none;
}
/* 多层后代选择 */
.header .nav .menu-item {
  display: inline-block;
  margin-right: 20px;
}
```

**使用场景**：

- 为特定容器内的元素应用样式
- 实现嵌套样式

### 2.2 子代选择器

子代选择器 (`>`) 匹配指定元素的直接子元素：

```css
/* 匹配 .container 的直接子元素 <div> */
.container > div {
  padding: 20px;
  border: 1px solid #ddd;
}
/* 匹配 .nav 的直接子元素 <ul> */
.nav > ul {
  list-style: none;
  padding: 0;
}
/* 匹配 .menu 的直接子元素 <li> */
.menu > li {
  display: inline-block;
}
```

**使用场景**：

- 为元素的直接子元素应用样式
- 避免样式影响深层嵌套的元素

### 2.3 相邻兄弟选择器

相邻兄弟选择器 (`+`) 匹配紧跟在指定元素后的第一个兄弟元素：

```css
/* 匹配紧跟在 <h1> 后的第一个 <p> 元素 */
h1 + p {
  font-size: 18px;
  color: #666;
}
/* 匹配紧跟在 .button 后的第一个 .message 元素 */
.button + .message {
  margin-top: 10px;
  padding: 10px;
  background-color: #f0f0f0;
}
```

**使用场景**：

- 为特定元素后的第一个兄弟元素应用样式
- 创建元素间的特定间距或样式关系

### 2.4 通用兄弟选择器

通用兄弟选择器 (`~`) 匹配指定元素后的所有兄弟元素：

```css
/* 匹配 <h1> 后的所有 <p> 元素 */
h1 ~ p {
  margin-left: 20px;
}
/* 匹配 .active 后的所有 .item 元素 */
.active ~ .item {
  opacity: 0.7;
}
```

**使用场景**：

- 为特定元素后的所有兄弟元素应用样式
- 创建元素组的样式关系

## 3. 伪类选择器

伪类选择器用于选择处于特定状态或位置的元素。

### 3.1 状态伪类

状态伪类匹配元素的特定状态：

```css
/* 链接未访问状态 */
a:link {
  color: #3498db;
}
/* 链接已访问状态 */
a:visited {
  color: #9b59b6;
}
/* 鼠标悬停状态 */
a:hover {
  color: #e74c3c;
  text-decoration: underline;
}
/* 元素激活状态 */
a:active {
  color: #c0392b;
}
/* 元素获得焦点状态 */
input:focus {
  outline: 2px solid #3498db;
  border-color: #3498db;
}
/* 元素禁用状态 */
button:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}
/* 元素启用状态 */
button:enabled {
  background-color: #3498db;
  cursor: pointer;
}
/* 元素checked状态 */
input:checked {
  accent-color: #3498db;
}
```

**使用场景**：

- 为链接的不同状态应用样式
- 为表单元素的不同状态应用样式
- 为元素的交互状态应用样式

### 3.2 结构伪类

结构伪类匹配元素在文档结构中的特定位置：

```css
 /* 匹配第一个子元素 */
 .container > :first-child {
  margin-top: 0;
 }
 /* 匹配最后一个子元素 */
 .container > :last-child {
  margin-bottom: 0;
 }
 /* 匹配第 n 个子元素 */
 .list > li:nth-child(2) {
  background-color: #f0f0f0;
 }
 /* 匹配偶数位置的子元素 */
 .list > li:nth-child(even) {
  background-color: #f9f9f9;
 }
 /* 匹配奇数位置的子元素 */
 .list > li:nth-child(odd) {
  background-color: #ffffff;
 }
 /* 匹配 3 的倍数位置的子元素 */
 .list > li:nth-child(3n) {
  border-bottom: 2px solid #ddd;
 }
 /* 匹配倒数第 n 个子元素 */
 .list > li:nth-last-child(2) {
  font-weight: bold;
 }
 /* 匹配第一个特定类型的子元素 */
 .container > p:first-of-type {
  font-size: 18px;
 }
 /* 匹配最后一个特定类型的子元素 */
 .container > p:last-of-type {
  margin-bottom: 0;
 }
 /* 匹配第 n 个特定类型的子元素 */
 .container > p:nth-of-type(2) {
  color: #666;
 }
 /* 匹配唯一的子元素 */
 .container > :only-child {
  width: 100%;
 }
 /* 匹配唯一的特定类型的子元素 */
 .container > p:only-of-type {
  font-style: italic;
 }
 /* 匹配空元素 */
 .element:empty {
  display: none;
 }
 /* 匹配根元素 */
 :
  --primary-color: #3498db;
  --secondary-color: #2ecc71;
 }
 /* 排除特定元素 */
 .list > li:not(.special) {
  color: #666;
 }
 /* 排除多个元素 */
 .container > *:not(p):not(div) {
  margin: 10px 0;
 }
```

**使用场景**：

- 为列表的奇偶项应用不同样式
- 为特定位置的元素应用样式
- 排除特定元素
- 为根元素定义全局变量

### 3.3 表单伪类

表单伪类匹配表单元素的特定状态：

```css
/* 匹配必填表单元素 */
input:required {
  border: 1px solid #e74c3c;
}
/* 匹配可选表单元素 */
input:optional {
  border: 1px solid #bdc3c7;
}
/* 匹配有效的表单元素 */
input:valid {
  border: 1px solid #27ae60;
}
/* 匹配无效的表单元素 */
input:invalid {
  border: 1px solid #e74c3c;
}
/* 匹配输入范围的最小值 */
input[type='range']:min {
  background-color: #e74c3c;
}
/* 匹配输入范围的最大值 */
input[type='range']:max {
  background-color: #27ae60;
}
/* 匹配输入范围的中间值 */
input[type='range']:in-range {
  background-color: #3498db;
}
/* 匹配输入范围的超出值 */
input[type='range']:out-of-range {
  background-color: #e74c3c;
}
/* 匹配只读表单元素 */
input:read-only {
  background-color: #f5f5f5;
  cursor: not-allowed;
}
/* 匹配可读写表单元素 */
input:read-write {
  background-color: white;
}
```

**使用场景**：

- 为表单元素的不同状态应用样式
- 提供视觉反馈，指示表单元素的有效性

### 3.4 其他伪类

```css
 /* 匹配当前激活的元素 */
 :
  background-color: #f0f8ff;
  padding: 10px;
  border-radius: 4px;
 }
 /* 匹配语言为英语的元素 */
 :
  font-family: Arial, sans-serif;
 }
 /* 匹配语言为中文的元素 */
 :
  font-family: "SimSun", serif;
 }
 /* 匹配包含指定文本的元素 */
 :
  background-color: yellow;
 }
 /* 匹配具有指定父元素的元素 */
 .parent > .child:has(> .grandchild) {
  border: 1px solid #ddd;
 }
```

**使用场景**：

- 为当前激活的锚点目标应用样式
- 为不同语言的元素应用不同样式
- 为包含特定文本的元素应用样式
- 为具有特定子元素的元素应用样式

## 4. 伪元素选择器

伪元素选择器用于选择元素的特定部分。

### 4.1 `::before` 和 `::after`

`::before` 和 `::after` 用于在元素内容前后插入装饰性内容：

```css
/* 在元素前插入内容 */
.button::before {
  content: '→';
  margin-right: 5px;
}
/* 在元素后插入内容 */
.button::after {
  content: '←';
  margin-left: 5px;
}
/* 使用伪元素创建清除浮动 */
.clearfix::after {
  content: '';
  display: table;
  clear: both;
}
/* 使用伪元素创建箭头 */
.arrow::after {
  content: '';
  border-width: 10px;
  border-style: solid;
  border-color: transparent transparent transparent #333;
  position: absolute;
  right: -20px;
  top: 50%;
  transform: translateY(-50%);
}
/* 使用伪元素创建自定义列表标记 */
.custom-list li::before {
  content: '•';
  color: #3498db;
  font-size: 18px;
  margin-right: 10px;
}
```

**使用场景**：

- 添加装饰性内容
- 创建自定义图标和箭头
- 清除浮动
- 创建自定义列表标记

### 4.2 `::first-letter` 和 `::first-line`

`::first-letter` 和 `::first-line` 用于选择元素的首字母和首行：

```css
/* 选择首字母 */
.article p::first-letter {
  font-size: 2em;
  font-weight: bold;
  color: #3498db;
  float: left;
  margin-right: 10px;
}
/* 选择首行 */
.article p::first-line {
  font-weight: bold;
  color: #2c3e50;
}
```

**使用场景**：

- 创建首字母大写效果
- 为段落首行应用特殊样式

### 4.3 `::selection`

`::selection` 用于选择用户选中的文本：

```css
 /* 为选中的文本应用样式 */
 :
  background-color: #3498db;
  color: white;
 }
 /* 为特定元素内选中的文本应用样式 */
 .article ::selection {
  background-color: #2ecc71;
  color: white;
 }
```

**使用场景**：

- 为用户选中的文本提供视觉反馈
- 增强用户体验

### 4.4 `::placeholder`

`::placeholder` 用于选择表单元素的占位符文本：

```css
/* 为占位符文本应用样式 */
input::placeholder {
  color: #95a5a6;
  font-style: italic;
}
/* 为特定类型的输入框占位符应用样式 */
input[type='email']::placeholder {
  color: #e74c3c;
}
```

**使用场景**：

- 为表单占位符文本应用样式
- 提高表单的可读性

### 4.5 其他伪元素

```css
/* 选择进度条的填充部分 */
progress::progress-bar {
  background-color: #3498db;
}
/* 选择进度条的轨道部分 */
progress::progress-value {
  background-color: #2ecc71;
}
/* 选择滑动条的拇指 */
input[type='range']::thumb {
  background-color: #3498db;
  border: none;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  cursor: pointer;
}
/* 选择滑动条的轨道 */
input[type='range']::track {
  background-color: #bdc3c7;
  height: 4px;
  border-radius: 2px;
}
```

**使用场景**：

- 为表单控件的特定部分应用样式
- 创建自定义表单控件

## 5. 选择器优先级

选择器优先级决定了多个样式规则应用时的顺序。

### 5.1 优先级计算规则

选择器的优先级由以下因素决定，按从高到低的顺序：

1. **!important** 声明（最高优先级）
2. 行内样式（权重：1000）
3. ID 选择器（权重：100）
4. 类选择器、伪类选择器、属性选择器（权重：10）
5. 元素选择器、伪元素选择器（权重：1）
6. 通配符选择器、后代选择器、相邻兄弟选择器（权重：0）

### 5.2 优先级示例

```css
/* 权重：1 (元素选择器) */
div {
  color: blue;
}
/* 权重：10 (类选择器) */
.container {
  color: red;
}
/* 权重：100 (ID 选择器) */
#main {
  color: green;
}
/* 权重：101 (ID 选择器 + 元素选择器) */
#main div {
  color: purple;
}
/* 权重：20 (两个类选择器) */
.container .box {
  color: orange;
}
/* 行内样式：权重 1000 */
/* <div style="color: black;"> */
/* !important：最高优先级 */
div {
  color: yellow !important;
}
```

**使用场景**：

- 理解样式覆盖的规则
- 避免样式冲突
- 合理组织样式代码

## 6. 选择器性能

选择器的性能影响页面的渲染速度，应注意优化。

### 6.1 性能影响因素

- **选择器复杂度**：复杂的选择器需要更多的计算时间
- **选择器特异性**：更具体的选择器性能更好
- **选择器匹配顺序**：CSS 选择器从右到左匹配

### 6.2 性能优化建议

```css
 /* 不良实践：复杂的后代选择器 */
 .header .nav .menu .menu-item .link {
  color: #333;
 }
 /* 良好实践：简单的类选择器 */
 .menu-link {
  color: #333;
 }
 /* 不良实践：使用通配符选择器 */
 *
  margin: 0;
  padding: 0;
 }
 /* 良好实践：针对性选择 */
 body, html, div, p, h1, h2, h3, h4, h5, h6, ul, ol, li {
  margin: 0;
  padding: 0;
 }
 /* 不良实践：使用属性选择器进行复杂匹配 */
 input[type="text"][class~="form-control"] {
  border: 1px solid #ddd;
 }
 /* 良好实践：使用类选择器 */
 .form-control {
  border: 1px solid #ddd;
 }
```

**性能优化技巧**：

- 尽量使用简单的选择器
- 避免过度使用后代选择器
- 避免使用通配符选择器
- 合理使用类选择器
- 避免使用复杂的属性选择器

## 7. 最佳实践

### 7.1 命名规范

推荐使用 BEM (Block, Element, Modifier) 命名规范：

```css
/* Block */
.button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
/* Element */
.button__icon {
  margin-right: 8px;
  font-size: 16px;
}
/* Modifier */
.button--primary {
  background-color: #3498db;
  color: white;
}
.button--secondary {
  background-color: #95a5a6;
  color: white;
}
.button--large {
  padding: 12px 24px;
  font-size: 16px;
}
.button--small {
  padding: 8px 16px;
  font-size: 14px;
}
```

**BEM 命名规则**：

- Block：独立的、可重用的组件
- Element：Block 的一部分，不能独立存在
- Modifier：修改 Block 或 Element 的样式

### 7.2 代码组织

- **按功能组织**：将相关的样式放在一起
- **使用注释**：为不同的部分添加注释
- **模块化**：将样式按模块分离

```css
 /* 重置样式 */
 *
  margin: 0;
  padding: 0;
  box-sizing: border-box;
 }
 /* 全局变量 */
 :
  --primary-color: #3498db;
  --secondary-color: #2ecc71;
  --text-color: #333;
  --background-color: #f8f9fa;
 }
 /* 布局样式 */
 .container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
 }
 /* 组件样式 */
 .button {
  /* 按钮样式 */
 }
 .card {
  /* 卡片样式 */
 }
 /* 响应式样式 */
 @media (max-width: 768px) {
  .container {
  padding: 0 10px;
  }
  .button {
  padding: 8px 16px;
  }
 }
```

### 7.3 可读性

- **缩进**：使用一致的缩进
- **空格**：在选择器和大括号之间添加空格
- **换行**：每个属性占一行
- **注释**：为复杂的样式添加注释

```css
/* 良好的可读性 */
.header {
  background-color: #f8f9fa;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.header__logo {
  font-size: 24px;
  font-weight: bold;
  color: var(--primary-color);
}
.header__nav {
  display: flex;
  gap: 20px;
}
/* 不良的可读性 */
.header {
  background-color: #f8f9fa;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.header__logo {
  font-size: 24px;
  font-weight: bold;
  color: var(--primary-color);
}
.header__nav {
  display: flex;
  gap: 20px;
}
```

## 8. 实际应用示例

### 8.1 示例 1：导航菜单

```html
<nav class="nav">
  <ul class="nav__list">
    <li class="nav__item"><a href="#" class="nav__link">首页</a></li>
    <li class="nav__item"><a href="#" class="nav__link">关于我们</a></li>
    <li class="nav__item"><a href="#" class="nav__link">产品</a></li>
    <li class="nav__item"><a href="#" class="nav__link">联系我们</a></li>
  </ul>
</nav>
```

```css
.nav {
  background-color: #333;
  padding: 10px 0;
}
.nav__list {
  list-style: none;
  display: flex;
  justify-content: center;
  gap: 20px;
}
.nav__item {
  position: relative;
}
.nav__link {
  color: white;
  text-decoration: none;
  padding: 10px 15px;
  display: block;
  transition: color 0.3s ease;
}
.nav__link:hover {
  color: #3498db;
}
/* 为第一个和最后一个链接添加特殊样式 */
.nav__item:first-child .nav__link {
  font-weight: bold;
}
.nav__item:last-child .nav__link {
  background-color: #3498db;
  border-radius: 4px;
}
/* 为激活的链接添加样式 */
.nav__link.active {
  color: #3498db;
  border-bottom: 2px solid #3498db;
}
```

### 8.2 示例 2：表单样式

```html
<form class="form">
  <div class="form__group">
    <label for="name" class="form__label">姓名</label>
    <input type="text" id="name" class="form__input" required />
  </div>
  <div class="form__group">
    <label for="email" class="form__label">邮箱</label>
    <input type="email" id="email" class="form__input" required />
  </div>
  <div class="form__group">
    <label for="message" class="form__label">留言</label>
    <textarea id="message" class="form__textarea" required></textarea>
  </div>
  <button type="submit" class="form__button">提交</button>
</form>
```

```css
.form {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
}
.form__group {
  margin-bottom: 20px;
}
.form__label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #333;
}
.form__input,
.form__textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  transition: border-color 0.3s ease;
}
.form__input:focus,
.form__textarea:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}
.form__input:required,
.form__textarea:required {
  border-left: 3px solid #e74c3c;
}
.form__input:valid,
.form__textarea:valid {
  border-left: 3px solid #27ae60;
}
.form__button {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}
.form__button:hover {
  background-color: #2980b9;
}
.form__button:active {
  background-color: #1f618d;
}
```

### 8.3 示例 3：卡片布局

```html
<div class="card-container">
  <div class="card">
    <div class="card__image">
      <img src="image1.jpg" alt="Card Image" />
    </div>
    <div class="card__content">
      <h3 class="card__title">卡片标题 1</h3>
      <p class="card__text">这是卡片内容，描述卡片的详细信息。</p>
      <a href="#" class="card__link">查看详情</a>
    </div>
  </div>
  <div class="card">
    <div class="card__image">
      <img src="image2.jpg" alt="Card Image" />
    </div>
    <div class="card__content">
      <h3 class="card__title">卡片标题 2</h3>
      <p class="card__text">这是卡片内容，描述卡片的详细信息。</p>
      <a href="#" class="card__link">查看详情</a>
    </div>
  </div>
  <div class="card">
    <div class="card__image">
      <img src="image3.jpg" alt="Card Image" />
    </div>
    <div class="card__content">
      <h3 class="card__title">卡片标题 3</h3>
      <p class="card__text">这是卡片内容，描述卡片的详细信息。</p>
      <a href="#" class="card__link">查看详情</a>
    </div>
  </div>
</div>
```

```css
.card-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  padding: 20px;
}
.card {
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}
.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
}
.card__image {
  height: 200px;
  overflow: hidden;
}
.card__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}
.card:hover .card__image img {
  transform: scale(1.05);
}
.card__content {
  padding: 20px;
}
.card__title {
  margin-bottom: 10px;
  font-size: 20px;
  color: #333;
}
.card__text {
  margin-bottom: 15px;
  color: #666;
  line-height: 1.5;
}
.card__link {
  display: inline-block;
  color: #3498db;
  text-decoration: none;
  font-weight: bold;
  transition: color 0.3s ease;
}
.card__link:hover {
  color: #2980b9;
  text-decoration: underline;
}
/* 为第一个卡片添加特殊样式 */
.card:first-child {
  border: 2px solid #3498db;
}
/* 为最后一个卡片添加特殊样式 */
.card:last-child {
  background-color: #f8f9fa;
}
```

## 9. 总结

CSS 选择器系统是 CSS 的核心组成部分，提供了强大的元素选择能力：

- **基础选择器**：通配符、标签、类、ID 和属性选择器，用于选择基本元素。
- **组合选择器**：后代、子代、相邻兄弟和通用兄弟选择器，用于选择具有特定关系的元素。
- **伪类选择器**：状态、结构、表单等伪类，用于选择处于特定状态或位置的元素。
- **伪元素选择器**：`::before`、`::after`、`::first-letter` 等，用于选择元素的特定部分。
- **选择器优先级**：基于权重计算，决定样式的应用顺序。
- **选择器性能**：合理使用选择器，优化页面渲染速度。
- **最佳实践**：使用 BEM 命名规范，组织代码结构，提高可读性。
  通过掌握 CSS 选择器系统，开发者可以更加灵活地控制页面样式，创建美观、响应式的网页设计。选择器的合理使用不仅可以提高代码的可维护性，还可以优化页面的性能。

---

### 更新日志 (Changelog)

- 2026-04-05: 细化选择器分类与 BEM 命名规范。
- 2026-04-06: 扩写详细内容，增加选择器优先级、性能优化、实际应用示例等章节。
