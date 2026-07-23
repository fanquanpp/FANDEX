---
order: 10
tags:
  - css
difficulty: beginner
title: 'CSS3 概述与基本语法'
module: css
category: 'CSS Basics'
description: 'CSS 发展历程、语法结构与层叠规则。'
author: Anonymous
related:
  - css/盒模型详解
  - css/选择器系统
prerequisites: []
---

## 1. CSS3 概述

CSS (Cascading Style Sheets) 层叠样式表，用于控制网页的视觉呈现。CSS3 是其最新标准，引入了模块化开发、动画、Flexbox/Grid 布局等强大功能，使网页设计更加灵活和丰富。

### 1.1 CSS 的历史与发展

- **CSS1 (1996)**: 第一个正式版本，提供基本的样式控制。
- **CSS2 (1998)**: 增加了定位、浮动、媒体查询等功能。
- **CSS2.1 (2011)**: CSS2 的修订版，修复了一些问题并增加了一些新特性。
- **CSS3 (2012+)**: 采用模块化开发，分批次发布不同模块，包括选择器、颜色、布局、动画等。

### 1.2 CSS3 的核心特性

- **响应式设计**: 媒体查询 (`@media`) 允许根据设备特性应用不同的样式。
- **现代布局**: Flexbox 与 Grid 提供了强大的布局能力，解决了传统布局的痛点。
- **视觉效果**: 圆角 (`border-radius`)、阴影 (`box-shadow`)、渐变 (`gradient`) 等效果。
- **交互动画**: 过渡 (`transition`) 与 关键帧动画 (`animation`) 实现平滑的动画效果。
- **字体控制**: `@font-face` 允许使用自定义字体。
- **颜色增强**: 支持 RGBA、HSL、HSLA 等颜色格式。
- **选择器增强**: 增加了更多高级选择器，如 `:nth-child`、`:not` 等。
- **背景与边框**: 多背景、边框图片、背景大小等特性。
- **文本效果**: 文本阴影、文本溢出处理、文本换行控制等。

### 1.3 CSS3 的模块化结构

CSS3 采用模块化设计，每个模块独立开发和发布：

- **选择器模块**: 定义如何选择 HTML 元素。
- **框模型模块**: 定义元素的盒模型。
- **背景与边框模块**: 定义背景和边框的样式。
- **文本模块**: 定义文本的样式和布局。
- **颜色模块**: 定义颜色的表示方法。
- **布局模块**: 包括 Flexbox 和 Grid 布局。
- **动画模块**: 定义过渡和动画效果。
- **媒体查询模块**: 定义响应式设计的规则。

### 1.4 CSS 的重要性

- **分离内容与表现**: HTML 负责结构，CSS 负责样式，使代码更清晰。
- **提高可维护性**: 集中管理样式，便于修改和维护。
- **增强用户体验**: 丰富的视觉效果和动画提升用户体验。
- **响应式设计**: 适配不同设备和屏幕尺寸。
- **提高开发效率**: 样式可以重用，减少重复代码。

## 2. 基本语法

### 2.1 语法结构

CSS 的基本语法由选择器、属性和值组成：

```css
/* 选择器 { 属性: 值; } */
h1 {
  color: blue;
  font-size: 24px; /* 声明以分号结束 */
}
/* 多个选择器共享同一组样式 */
h1,
h2,
h3 {
  font-family: Arial, sans-serif;
}
/* 嵌套选择器 */
.container {
  width: 100%;
  .header {
    height: 100px;
  }
  .content {
    padding: 20px;
  }
}
```

### 2.2 注释

CSS 中的注释使用 `/* */` 语法：

```css
/* 这是一个单行注释 */
/*
 这是一个
 多行注释
 */
/* 注释可以放在任何位置 */
h1 {
  color: blue; /* 颜色设置 */
  font-size: 24px; /* 字体大小设置 */
}
```

### 2.3 空白与格式化

CSS 忽略多余的空白，因此可以使用空白来提高代码可读性：

```css
/* 良好的格式化 */
body {
  font-family: Arial, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  color: #333;
}
/* 压缩格式（用于生产环境） */
body {
  font-family: Arial, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  color: #333;
}
```

### 2.4 大小写敏感性

CSS 对选择器和属性名不区分大小写，但对属性值区分大小写（特别是字体名称和URL）：

```css
/* 以下两种写法效果相同 */
H1 {
  color: BLUE;
}
h1 {
  color: blue;
}
/* 但以下写法效果不同 */
.font {
  font-family: 'Times New Roman', serif; /* 正确 */
  font-family: 'times new roman', serif; /* 可能不生效 */
}
```

## 3. 引入方式

### 3.1 行内样式 (Inline)

直接在 HTML 元素的 `style` 属性中定义样式：

```html
<div style="color: red; font-size: 18px;">行内样式示例</div>
```

**优点**：

- 优先级最高，可覆盖其他样式
- 适用于单个元素的特殊样式
  **缺点**：
- 难以维护，样式与结构混合
- 不能重用
- 增加 HTML 文件大小

### 3.2 内部样式 (Internal)

在 HTML 文档的 `<head>` 标签中使用 `<style>` 标签定义样式：

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f0f0f0;
      }
      h1 {
        color: blue;
      }
    </style>
  </head>
  <body>
    <h1>内部样式示例</h1>
  </body>
</html>
```

**优点**：

- 样式与结构分离
- 适用于单个页面的样式
- 无需额外的 HTTP 请求
  **缺点**：
- 样式不能在多个页面间重用
- 增加 HTML 文件大小

### 3.3 外部样式 (External)

在单独的 CSS 文件中定义样式，然后通过 `<link>` 标签引入：
**style.css**：

```css
body {
  font-family: Arial, sans-serif;
  background-color: #f0f0f0;
}
h1 {
  color: blue;
}
```

**HTML**：

```html
<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <h1>外部样式示例</h1>
  </body>
</html>
```

**优点**：

- 样式与结构完全分离
- 样式可以在多个页面间重用
- 浏览器可以缓存 CSS 文件，提高加载速度
- 便于维护和管理
  **缺点**：
- 需要额外的 HTTP 请求

### 3.4 导入式 (@import)

在 CSS 文件中使用 `@import` 规则引入其他 CSS 文件：
**main.css**：

```css
@import url('reset.css');
@import url('layout.css');
body {
  font-family: Arial, sans-serif;
}
```

**优点**：

- 可以将样式模块化，便于管理
  **缺点**：
- 会增加 HTTP 请求
- 可能导致页面加载延迟（因为 @import 是在 CSS 解析时才加载）
- 不建议在生产环境中使用

### 3.5 引入方式对比

| 引入方式 | 优先级 | 优点                         | 缺点               | 适用场景             |
| -------- | ------ | ---------------------------- | ------------------ | -------------------- |
| 行内样式 | 最高   | 优先级高，适用于特殊样式     | 难以维护，不能重用 | 单个元素的特殊样式   |
| 内部样式 | 中     | 样式与结构分离，无需额外请求 | 不能跨页面重用     | 单个页面的样式       |
| 外部样式 | 中     | 完全分离，可重用，可缓存     | 需要额外请求       | 多个页面的共用样式   |
| 导入式   | 中     | 样式模块化                   | 增加请求，可能延迟 | 开发环境中的样式组织 |

## 4. 优先级规则

CSS 遵循“就近原则”和“权重计算”来确定样式的优先级。

### 4.1 权重计算

CSS 选择器的权重由四部分组成，按从高到低的顺序计算：

1. **!important**：最高优先级，覆盖所有其他规则
2. **行内样式**：权重为 1000
3. **ID 选择器**：权重为 100
4. **类选择器、伪类选择器、属性选择器**：权重为 10
5. **元素选择器、伪元素选择器**：权重为 1
6. **通配符选择器 (\*)、后代选择器 (空格)、相邻兄弟选择器 (+)**：权重为 0

### 4.2 优先级顺序

1. **!important** 声明
2. 行内样式
3. ID 选择器
4. 类选择器、伪类选择器、属性选择器
5. 元素选择器、伪元素选择器
6. 继承的样式
7. 浏览器默认样式

### 4.3 优先级计算示例

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

### 4.4 特殊情况

- **继承的样式**：继承的样式优先级最低，即使是低权重的选择器也能覆盖继承的样式。
- **就近原则**：当权重相同时，后定义的样式会覆盖先定义的样式。
- **!important 的使用**：应尽量避免使用 `!important`，因为它会破坏样式的层叠性，使调试变得困难。

## 5. CSS 单位

### 5.1 绝对单位

绝对单位是固定的，不会随其他因素变化：

- **px** (像素)：最常用的单位，适合固定尺寸的元素。
- **pt** (点)：主要用于印刷，1pt = 1/72 英寸。
- **pc** (派卡)：1pc = 12pt。
- **in** (英寸)：1in = 2.54cm。
- **cm** (厘米)：实际长度单位。
- **mm** (毫米)：实际长度单位。

### 5.2 相对单位

相对单位是相对于其他值计算的：

- **em**：相对于当前元素的字体大小。如果当前元素没有设置字体大小，则继承父元素的字体大小。
- **rem**：相对于根元素 (`<html>`) 的字体大小，推荐使用。
- **vw/vh**：相对于视口宽度/高度的 1%。
- **vmin/vmax**：相对于视口宽度和高度中较小/较大值的 1%。
- **%**：相对于父元素的相应属性值。
- **ch**：相对于数字 "0" 的宽度。
- **ex**：相对于字母 "x" 的高度。

### 5.3 单位使用场景

| 单位      | 适用场景                                   | 示例                         |
| --------- | ------------------------------------------ | ---------------------------- |
| px        | 固定尺寸的元素，如边框、按钮大小           | `border: 1px solid #ccc;`    |
| em        | 相对于当前元素字体大小的间距和尺寸         | `padding: 0.5em;`            |
| rem       | 响应式字体大小，便于整体调整               | `font-size: 1.2rem;`         |
| vw/vh     | 响应式布局，相对于视口大小                 | `width: 50vw; height: 50vh;` |
| %         | 相对于父元素的尺寸，如宽度、高度           | `width: 100%;`               |
| vmin/vmax | 响应式设计，确保元素在不同屏幕比例下的显示 | `font-size: 5vmin;`          |

## 6. CSS 变量

CSS 变量（也称为自定义属性）允许你定义可重用的值，提高代码的可维护性。

### 6.1 变量定义与使用

使用 `--` 前缀定义变量，使用 `var()` 函数使用变量：

```css
 /* 定义变量 */
 :
  --primary-color: #3498db;
  --secondary-color: #2ecc71;
  --font-size: 16px;
  --spacing: 1rem;
 }
 /* 使用变量 */
 body {
  font-size: var(--font-size);
  color: var(--primary-color);
 }
 .button {
  background-color: var(--primary-color);
  padding: var(--spacing);
 }
 .button:hover {
  background-color: var(--secondary-color);
 }
```

### 6.2 变量作用域

- **全局作用域**：在 `:root` 选择器中定义的变量，可在整个文档中使用。
- **局部作用域**：在特定选择器中定义的变量，只在该选择器及其后代中使用。

```css
 /* 全局变量 */
 :
  --color: blue;
 }
 /* 局部变量 */
 .container {
  --color: red;
  color: var(--color); /* 红色 */
 }
 .box {
  color: var(--color); /* 继承容器的红色 */
 }
 .footer {
  color: var(--color); /* 全局的蓝色 */
 }
```

### 6.3 变量使用示例

```css
 /* 主题变量 */
 :
  /* 浅色主题 */
  --bg-color: #ffffff;
  --text-color: #333333;
  --primary-color: #3498db;
  /* 间距 */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  /* 圆角 */
  --border-radius-sm: 4px;
  --border-radius-md: 8px;
  --border-radius-lg: 12px;
  /* 阴影 */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.1);
 }
 /* 深色主题 */
 @media (prefers-color-scheme: dark) {
  :root {
  --bg-color: #121212;
  --text-color: #e0e0e0;
  --primary-color: #64b5f6;
  }
 }
 /* 使用变量 */
 body {
  background-color: var(--bg-color);
  color: var(--text-color);
  margin: 0;
  padding: var(--spacing-md);
  font-family: Arial, sans-serif;
 }
 .card {
  background-color: var(--bg-color);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
 }
 .button {
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--border-radius-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: pointer;
  transition: background-color 0.3s ease;
 }
 .button:hover {
  background-color: darken(var(--primary-color), 10%);
 }
```

## 7. CSS 函数

CSS 提供了多种函数，用于计算值、处理颜色等。

### 7.1 颜色函数

- **rgb()/rgba()**：使用红、绿、蓝和透明度值定义颜色。
- **hsl()/hsla()**：使用色相、饱和度、亮度和透明度值定义颜色。
- **color()**：使用指定颜色空间的颜色。
- **darken()/lighten()**：使颜色变暗或变亮。
- **saturate()/desaturate()**：增加或减少颜色的饱和度。
- **opacity()**：设置颜色的透明度。

```css
/* rgb() 示例 */
.color1 {
  color: rgb(255, 0, 0); /* 红色 */
}
/* rgba() 示例 */
.color2 {
  color: rgba(255, 0, 0, 0.5); /* 半透明红色 */
}
/* hsl() 示例 */
.color3 {
  color: hsl(120, 100%, 50%); /* 绿色 */
}
/* hsla() 示例 */
.color4 {
  color: hsla(120, 100%, 50%, 0.5); /* 半透明绿色 */
}
```

### 7.2 数学函数

- **calc()**：执行计算，可混合不同单位。
- **clamp()**：将值限制在一个范围内。
- **min()**：返回多个值中的最小值。
- **max()**：返回多个值中的最大值。

```css
/* calc() 示例 */
.container {
  width: calc(100% - 20px); /* 宽度为父元素宽度减去 20px */
  height: calc(100vh - 100px); /* 高度为视口高度减去 100px */
  font-size: calc(16px + 0.5vw); /* 字体大小随视口宽度变化 */
}
/* clamp() 示例 */
.text {
  font-size: clamp(16px, 2vw, 24px); /* 字体大小在 16px 到 24px 之间，随视口宽度变化 */
}
/* min() 示例 */
.box {
  width: min(500px, 100%); /* 宽度为 500px 和 100% 中的较小值 */
}
/* max() 示例 */
.header {
  height: max(100px, 10vh); /* 高度为 100px 和 10vh 中的较大值 */
}
```

### 7.3 其他常用函数

- **url()**：引用资源的 URL。
- **linear-gradient()/radial-gradient()**：创建线性或径向渐变。
- **repeat()**：重复值，用于 Grid 布局。
- **var()**：使用 CSS 变量。
- **attr()**：获取元素的属性值。

```css
/* url() 示例 */
.background {
  background-image: url('image.jpg');
}
/* linear-gradient() 示例 */
.gradient {
  background: linear-gradient(to right, red, blue);
}
/* radial-gradient() 示例 */
.radial-gradient {
  background: radial-gradient(circle, red, blue);
}
/* repeat() 示例 */
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* 创建 3 个等宽列 */
}
/* attr() 示例 */
[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: white;
  padding: 5px;
  border-radius: 4px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.3s;
}
[data-tooltip]:hover::after {
  opacity: 1;
}
```

## 8. 浏览器兼容性

### 8.1 浏览器前缀

为了支持不同浏览器的实验性特性，需要使用浏览器前缀：

```css
/* 带浏览器前缀的 CSS */
.box {
  /* Chrome, Safari, Opera */
  -webkit-border-radius: 8px;
  /* Firefox */
  -moz-border-radius: 8px;
  /* 标准语法 */
  border-radius: 8px;
  /* Chrome, Safari, Opera */
  -webkit-box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  /* Firefox */
  -moz-box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  /* 标准语法 */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  /* Chrome, Safari, Opera */
  -webkit-transition: all 0.3s ease;
  /* Firefox */
  -moz-transition: all 0.3s ease;
  /* 标准语法 */
  transition: all 0.3s ease;
}
```

### 8.2 兼容性检测

使用 `@supports` 规则检测浏览器是否支持特定特性：

```css
/* 检测是否支持 Grid 布局 */
@supports (display: grid) {
  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
  }
}
/* 检测是否支持 Flexbox */
@supports (display: flex) {
  .flex {
    display: flex;
    justify-content: center;
    align-items: center;
  }
}
/* 降级方案 */
.grid {
  /* 传统布局作为降级方案 */
  display: block;
}
@supports (display: grid) {
  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### 8.3 兼容性最佳实践

- **使用 Autoprefixer**：自动添加浏览器前缀。
- **渐进增强**：先实现基本功能，再添加高级特性。
- **优雅降级**：为不支持高级特性的浏览器提供替代方案。
- **使用 CSS Reset 或 Normalize.css**：统一不同浏览器的默认样式。
- **测试**：在不同浏览器中测试你的样式。

## 9. 最佳实践

### 9.1 代码组织

- **使用模块化 CSS**：将样式按功能或组件分类。
- **使用命名约定**：如 BEM (Block, Element, Modifier) 命名规范。
- **使用注释**：为复杂样式添加注释。
- **保持代码整洁**：使用一致的缩进和格式。

### 9.2 性能优化

- **减少 CSS 文件大小**：使用压缩工具。
- **减少选择器复杂度**：使用简单的选择器。
- **避免使用 @import**：使用 `<link>` 标签代替。
- **使用 CSS 变量**：减少重复代码。
- **避免过度使用 !important**：保持样式的层叠性。

### 9.3 可维护性

- **使用语义化的类名**：类名应反映元素的用途。
- **避免内联样式**：使用外部或内部样式。
- **使用 CSS 预处理器**：如 Sass、Less 等，提供变量、嵌套、混合等功能。
- **定期清理**：移除未使用的样式。
- **文档化**：为样式添加文档说明。

## 10. 总结

CSS3 是现代网页设计的重要组成部分，提供了丰富的特性和功能：

- **核心特性**：响应式设计、现代布局、视觉效果、交互动画等。
- **语法结构**：选择器、属性、值的基本结构，以及注释、空白等语法规则。
- **引入方式**：行内样式、内部样式、外部样式、导入式，各有优缺点。
- **优先级规则**：基于权重计算和就近原则，决定样式的应用顺序。
- **CSS 单位**：绝对单位和相对单位，适用于不同的场景。
- **CSS 变量**：可重用的值，提高代码的可维护性。
- **CSS 函数**：用于计算值、处理颜色等。
- **浏览器兼容性**：使用浏览器前缀和特性检测，确保在不同浏览器中的一致性。
- **最佳实践**：代码组织、性能优化、可维护性等方面的建议。
  通过掌握 CSS3 的这些特性和最佳实践，开发者可以创建美观、响应式、高性能的网页设计。

---

### 更新日志 (Changelog)

- 2026-04-05: 整合 CSS 基础语法与优先级规则。
- 2026-04-06: 扩写详细内容，增加 CSS3 的历史与发展、模块化结构、CSS 变量、CSS 函数、浏览器兼容性、最佳实践等章节。

## 延伸阅读

- [HTML5](html5/overview-and-semantics)
