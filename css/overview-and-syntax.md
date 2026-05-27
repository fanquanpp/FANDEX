# CSS3 概述与基本语法 (CSS3 Overview & Syntax)
 False
 False> @Version: v3.5.0
 False
 False> @Author: Anonymous
 False> @Category: CSS Basics
 False> @Description: CSS3 的核心特性、引入方式、基本语法结构及优先级。 | CSS3 core features, inclusion methods, syntax, and specificity.
 False
 False---
 False
 False## 目录
 False
 False1. [目录](#目录)
 False1. [CSS3 概述](#css3-概述)
 False1. [基本语法](#基本语法)
 False1. [引入方式](#引入方式)
 False1. [优先级规则](#优先级规则)
 False1. [CSS 单位](#css-单位)
 False1. [CSS 变量](#css-变量)
 False1. [CSS 函数](#css-函数)
 False1. [浏览器兼容性](#浏览器兼容性)
 False1. [最佳实践](#最佳实践)
 False1. [总结](#总结)
 False
 False---
 False
 False## 1. 目录
 False
 False- [1. CSS3 概述](#1-css3-概述)
 False - [1.1 CSS 的历史与发展](#11-css-的历史与发展)
 False - [1.2 CSS3 的核心特性](#12-css3-的核心特性)
 False - [1.3 CSS3 的模块化结构](#13-css3-的模块化结构)
 False - [1.4 CSS 的重要性](#14-css-的重要性)
 False- [2. 基本语法](#2-基本语法)
 False - [2.1 语法结构](#21-语法结构)
 False - [2.2 注释](#22-注释)
 False - [2.3 空白与格式化](#23-空白与格式化)
 False - [2.4 大小写敏感性](#24-大小写敏感性)
 False- [3. 引入方式](#3-引入方式)
 False - [3.1 行内样式 (Inline)](#31-行内样式-inline)
 False - [3.2 内部样式 (Internal)](#32-内部样式-internal)
 False - [3.3 外部样式 (External)](#33-外部样式-external)
 False - [3.4 导入式 (@import)](#34-导入式-import)
 False - [3.5 引入方式对比](#35-引入方式对比)
 False- [4. 优先级规则](#4-优先级规则)
 False - [4.1 权重计算](#41-权重计算)
 False - [4.2 优先级顺序](#42-优先级顺序)
 False - [4.3 优先级计算示例](#43-优先级计算示例)
 False - [4.4 特殊情况](#44-特殊情况)
 False- [5. CSS 单位](#5- css-单位)
 False - [5.1 绝对单位](#51-绝对单位)
 False - [5.2 相对单位](#52-相对单位)
 False - [5.3 单位使用场景](#53-单位使用场景)
 False- [6. CSS 变量](#6- css-变量)
 False - [6.1 变量定义与使用](#61-变量定义与使用)
 False - [6.2 变量作用域](#62-变量作用域)
 False - [6.3 变量使用示例](#63-变量使用示例)
 False- [7. CSS 函数](#7- css-函数)
 False - [7.1 颜色函数](#71-颜色函数)
 False - [7.2 数学函数](#72-数学函数)
 False - [7.3 其他常用函数](#73-其他常用函数)
 False- [8. 浏览器兼容性](#8-浏览器兼容性)
 False - [8.1 浏览器前缀](#81-浏览器前缀)
 False - [8.2 兼容性检测](#82-兼容性检测)
 False - [8.3 兼容性最佳实践](#83-兼容性最佳实践)
 False- [9. 最佳实践](#9-最佳实践)
 False - [9.1 代码组织](#91-代码组织)
 False - [9.2 性能优化](#92-性能优化)
 False - [9.3 可维护性](#93-可维护性)
 False- [10. 总结](#10-总结)
 False
 False## 1. CSS3 概述
 False
 FalseCSS (Cascading Style Sheets) 层叠样式表，用于控制网页的视觉呈现。CSS3 是其最新标准，引入了模块化开发、动画、Flexbox/Grid 布局等强大功能，使网页设计更加灵活和丰富。
 False
 False### 1.1 CSS 的历史与发展
 False
 False- **CSS1 (1996)**: 第一个正式版本，提供基本的样式控制。
 False- **CSS2 (1998)**: 增加了定位、浮动、媒体查询等功能。
 False- **CSS2.1 (2011)**: CSS2 的修订版，修复了一些问题并增加了一些新特性。
 False- **CSS3 (2012+)**: 采用模块化开发，分批次发布不同模块，包括选择器、颜色、布局、动画等。
 False
 False### 1.2 CSS3 的核心特性
 False
 False- **响应式设计**: 媒体查询 (`@media`) 允许根据设备特性应用不同的样式。
 False- **现代布局**: Flexbox 与 Grid 提供了强大的布局能力，解决了传统布局的痛点。
 False- **视觉效果**: 圆角 (`border-radius`)、阴影 (`box-shadow`)、渐变 (`gradient`) 等效果。
 False- **交互动画**: 过渡 (`transition`) 与 关键帧动画 (`animation`) 实现平滑的动画效果。
 False- **字体控制**: `@font-face` 允许使用自定义字体。
 False- **颜色增强**: 支持 RGBA、HSL、HSLA 等颜色格式。
 False- **选择器增强**: 增加了更多高级选择器，如 `:nth-child`、`:not` 等。
 False- **背景与边框**: 多背景、边框图片、背景大小等特性。
 False- **文本效果**: 文本阴影、文本溢出处理、文本换行控制等。
 False
 False### 1.3 CSS3 的模块化结构
 False
 FalseCSS3 采用模块化设计，每个模块独立开发和发布：
 False
 False- **选择器模块**: 定义如何选择 HTML 元素。
 False- **框模型模块**: 定义元素的盒模型。
 False- **背景与边框模块**: 定义背景和边框的样式。
 False- **文本模块**: 定义文本的样式和布局。
 False- **颜色模块**: 定义颜色的表示方法。
 False- **布局模块**: 包括 Flexbox 和 Grid 布局。
 False- **动画模块**: 定义过渡和动画效果。
 False- **媒体查询模块**: 定义响应式设计的规则。
 False
 False### 1.4 CSS 的重要性
 False
 False- **分离内容与表现**: HTML 负责结构，CSS 负责样式，使代码更清晰。
 False- **提高可维护性**: 集中管理样式，便于修改和维护。
 False- **增强用户体验**: 丰富的视觉效果和动画提升用户体验。
 False- **响应式设计**: 适配不同设备和屏幕尺寸。
 False- **提高开发效率**: 样式可以重用，减少重复代码。
 False
 False## 2. 基本语法
 False
 False### 2.1 语法结构
 False
 FalseCSS 的基本语法由选择器、属性和值组成：
 False
```css
 True/* 选择器 { 属性: 值; } */
 Trueh1 {
 True color: blue;
 True font-size: 24px; /* 声明以分号结束 */
 True}
 True
 True/* 多个选择器共享同一组样式 */
 Trueh1, h2, h3 {
 True font-family: Arial, sans-serif;
 True}
 True
 True/* 嵌套选择器 */
 True.container {
 True width: 100%;
 True 
 True .header {
 True height: 100px;
 True }
 True 
 True .content {
 True padding: 20px;
 True }
 True}
 True```

 False### 2.2 注释
 False
 FalseCSS 中的注释使用 `/* */` 语法：
 False
```css
 True/* 这是一个单行注释 */
 True
 True/*
 True这是一个
 True多行注释
 True*/
 True
 True/* 注释可以放在任何位置 */
 Trueh1 {
 True color: blue; /* 颜色设置 */
 True font-size: 24px; /* 字体大小设置 */
 True}
 True```

 False### 2.3 空白与格式化
 False
 FalseCSS 忽略多余的空白，因此可以使用空白来提高代码可读性：
 False
```css
 True/* 良好的格式化 */
 Truebody {
 True font-family: Arial, sans-serif;
 True font-size: 16px;
 True line-height: 1.5;
 True color: #333;
 True}
 True
 True/* 压缩格式（用于生产环境） */
 Truebody{font-family:Arial,sans-serif;font-size:16px;line-height:1.5;color:#333;}
 True```

 False### 2.4 大小写敏感性
 False
 FalseCSS 对选择器和属性名不区分大小写，但对属性值区分大小写（特别是字体名称和URL）：
 False
```css
 True/* 以下两种写法效果相同 */
 TrueH1 {
 True COLOR: BLUE;
 True}
 True
 Trueh1 {
 True color: blue;
 True}
 True
 True/* 但以下写法效果不同 */
 True.font {
 True font-family: "Times New Roman", serif; /* 正确 */
 True font-family: "times new roman", serif; /* 可能不生效 */
 True}
 True```

 False## 3. 引入方式
 False
 False### 3.1 行内样式 (Inline)
 False
 False直接在 HTML 元素的 `style` 属性中定义样式：
 False
```html
 True<div style="color: red; font-size: 18px;">行内样式示例</div>
 True```

 False**优点**：
 False
 False- 优先级最高，可覆盖其他样式
 False- 适用于单个元素的特殊样式
 False
 False**缺点**：
 False
 False- 难以维护，样式与结构混合
 False- 不能重用
 False- 增加 HTML 文件大小
 False
 False### 3.2 内部样式 (Internal)
 False
 False在 HTML 文档的 `<head>` 标签中使用 `<style>` 标签定义样式：
 False
```html
 True<!DOCTYPE html>
 True<html>
 True<head>
 True <style>
 True body {
 True font-family: Arial, sans-serif;
 True background-color: #f0f0f0;
 True }
 True h1 {
 True color: blue;
 True }
 True </style>
 True</head>
 True<body>
 True <h1>内部样式示例</h1>
 True</body>
 True</html>
 True```

 False**优点**：
 False
 False- 样式与结构分离
 False- 适用于单个页面的样式
 False- 无需额外的 HTTP 请求
 False
 False**缺点**：
 False
 False- 样式不能在多个页面间重用
 False- 增加 HTML 文件大小
 False
 False### 3.3 外部样式 (External)
 False
 False在单独的 CSS 文件中定义样式，然后通过 `<link>` 标签引入：
 False
 False**style.css**：
 False
```css
 Truebody {
 True font-family: Arial, sans-serif;
 True background-color: #f0f0f0;
 True}
 True
 Trueh1 {
 True color: blue;
 True}
 True```

 False**HTML**：
 False
```html
 True<!DOCTYPE html>
 True<html>
 True<head>
 True <link rel="stylesheet" href="style.css">
 True</head>
 True<body>
 True <h1>外部样式示例</h1>
 True</body>
 True</html>
 True```

 False**优点**：
 False
 False- 样式与结构完全分离
 False- 样式可以在多个页面间重用
 False- 浏览器可以缓存 CSS 文件，提高加载速度
 False- 便于维护和管理
 False
 False**缺点**：
 False
 False- 需要额外的 HTTP 请求
 False
 False### 3.4 导入式 (@import)
 False
 False在 CSS 文件中使用 `@import` 规则引入其他 CSS 文件：
 False
 False**main.css**：
 False
```css
 True@import url("reset.css");
 True@import url("layout.css");
 True
 Truebody {
 True font-family: Arial, sans-serif;
 True}
 True```

 False**优点**：
 False
 False- 可以将样式模块化，便于管理
 False
 False**缺点**：
 False
 False- 会增加 HTTP 请求
 False- 可能导致页面加载延迟（因为 @import 是在 CSS 解析时才加载）
 False- 不建议在生产环境中使用
 False
 False### 3.5 引入方式对比
 False
 False| 引入方式 | 优先级 | 优点 | 缺点 | 适用场景 |
 False|---------|--------|------|------|----------|
 False| 行内样式 | 最高 | 优先级高，适用于特殊样式 | 难以维护，不能重用 | 单个元素的特殊样式 |
 False| 内部样式 | 中 | 样式与结构分离，无需额外请求 | 不能跨页面重用 | 单个页面的样式 |
 False| 外部样式 | 中 | 完全分离，可重用，可缓存 | 需要额外请求 | 多个页面的共用样式 |
 False| 导入式 | 中 | 样式模块化 | 增加请求，可能延迟 | 开发环境中的样式组织 |
 False
 False## 4. 优先级规则
 False
 FalseCSS 遵循“就近原则”和“权重计算”来确定样式的优先级。
 False
 False### 4.1 权重计算
 False
 FalseCSS 选择器的权重由四部分组成，按从高到低的顺序计算：
 False
 False1. **!important**：最高优先级，覆盖所有其他规则
 False2. **行内样式**：权重为 1000
 False3. **ID 选择器**：权重为 100
 False4. **类选择器、伪类选择器、属性选择器**：权重为 10
 False5. **元素选择器、伪元素选择器**：权重为 1
 False6. **通配符选择器 (*)、后代选择器 (空格)、相邻兄弟选择器 (+)**：权重为 0
 False
 False### 4.2 优先级顺序
 False
 False1. **!important** 声明
 False2. 行内样式
 False3. ID 选择器
 False4. 类选择器、伪类选择器、属性选择器
 False5. 元素选择器、伪元素选择器
 False6. 继承的样式
 False7. 浏览器默认样式
 False
 False### 4.3 优先级计算示例
 False
```css
 True/* 权重：1 (元素选择器) */
 Truediv {
 True color: blue;
 True}
 True
 True/* 权重：10 (类选择器) */
 True.container {
 True color: red;
 True}
 True
 True/* 权重：100 (ID 选择器) */
 True#main {
 True color: green;
 True}
 True
 True/* 权重：101 (ID 选择器 + 元素选择器) */
 True#main div {
 True color: purple;
 True}
 True
 True/* 权重：20 (两个类选择器) */
 True.container .box {
 True color: orange;
 True}
 True
 True/* 行内样式：权重 1000 */
 True/* <div style="color: black;"> */
 True
 True/* !important：最高优先级 */
 Truediv {
 True color: yellow !important;
 True}
 True```

 False### 4.4 特殊情况
 False
 False- **继承的样式**：继承的样式优先级最低，即使是低权重的选择器也能覆盖继承的样式。
 False- **就近原则**：当权重相同时，后定义的样式会覆盖先定义的样式。
 False- **!important 的使用**：应尽量避免使用 `!important`，因为它会破坏样式的层叠性，使调试变得困难。
 False
 False## 5. CSS 单位
 False
 False### 5.1 绝对单位
 False
 False绝对单位是固定的，不会随其他因素变化：
 False
 False- **px** (像素)：最常用的单位，适合固定尺寸的元素。
 False- **pt** (点)：主要用于印刷，1pt = 1/72 英寸。
 False- **pc** (派卡)：1pc = 12pt。
 False- **in** (英寸)：1in = 2.54cm。
 False- **cm** (厘米)：实际长度单位。
 False- **mm** (毫米)：实际长度单位。
 False
 False### 5.2 相对单位
 False
 False相对单位是相对于其他值计算的：
 False
 False- **em**：相对于当前元素的字体大小。如果当前元素没有设置字体大小，则继承父元素的字体大小。
 False- **rem**：相对于根元素 (`<html>`) 的字体大小，推荐使用。
 False- **vw/vh**：相对于视口宽度/高度的 1%。
 False- **vmin/vmax**：相对于视口宽度和高度中较小/较大值的 1%。
 False- **%**：相对于父元素的相应属性值。
 False- **ch**：相对于数字 "0" 的宽度。
 False- **ex**：相对于字母 "x" 的高度。
 False
 False### 5.3 单位使用场景
 False
 False| 单位 | 适用场景 | 示例 |
 False|------|----------|------|
 False| px | 固定尺寸的元素，如边框、按钮大小 | `border: 1px solid #ccc;` |
 False| em | 相对于当前元素字体大小的间距和尺寸 | `padding: 0.5em;` |
 False| rem | 响应式字体大小，便于整体调整 | `font-size: 1.2rem;` |
 False| vw/vh | 响应式布局，相对于视口大小 | `width: 50vw; height: 50vh;` |
 False| % | 相对于父元素的尺寸，如宽度、高度 | `width: 100%;` |
 False| vmin/vmax | 响应式设计，确保元素在不同屏幕比例下的显示 | `font-size: 5vmin;` |
 False
 False## 6. CSS 变量
 False
 FalseCSS 变量（也称为自定义属性）允许你定义可重用的值，提高代码的可维护性。
 False
 False### 6.1 变量定义与使用
 False
 False使用 `--` 前缀定义变量，使用 `var()` 函数使用变量：
 False
```css
 True/* 定义变量 */
 True:root {
 True --primary-color: #3498db;
 True --secondary-color: #2ecc71;
 True --font-size: 16px;
 True --spacing: 1rem;
 True}
 True
 True/* 使用变量 */
 Truebody {
 True font-size: var(--font-size);
 True color: var(--primary-color);
 True}
 True
 True.button {
 True background-color: var(--primary-color);
 True padding: var(--spacing);
 True}
 True
 True.button:hover {
 True background-color: var(--secondary-color);
 True}
 True```

 False### 6.2 变量作用域
 False
 False- **全局作用域**：在 `:root` 选择器中定义的变量，可在整个文档中使用。
 False- **局部作用域**：在特定选择器中定义的变量，只在该选择器及其后代中使用。
 False
```css
 True/* 全局变量 */
 True:root {
 True --color: blue;
 True}
 True
 True/* 局部变量 */
 True.container {
 True --color: red;
 True color: var(--color); /* 红色 */
 True}
 True
 True.box {
 True color: var(--color); /* 继承容器的红色 */
 True}
 True
 True.footer {
 True color: var(--color); /* 全局的蓝色 */
 True}
 True```

 False### 6.3 变量使用示例
 False
```css
 True/* 主题变量 */
 True:root {
 True /* 浅色主题 */
 True --bg-color: #ffffff;
 True --text-color: #333333;
 True --primary-color: #3498db;
 True 
 True /* 间距 */
 True --spacing-xs: 0.25rem;
 True --spacing-sm: 0.5rem;
 True --spacing-md: 1rem;
 True --spacing-lg: 1.5rem;
 True --spacing-xl: 2rem;
 True 
 True /* 圆角 */
 True --border-radius-sm: 4px;
 True --border-radius-md: 8px;
 True --border-radius-lg: 12px;
 True 
 True /* 阴影 */
 True --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1);
 True --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.1);
 True --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.1);
 True}
 True
 True/* 深色主题 */
 True@media (prefers-color-scheme: dark) {
 True :root {
 True --bg-color: #121212;
 True --text-color: #e0e0e0;
 True --primary-color: #64b5f6;
 True }
 True}
 True
 True/* 使用变量 */
 Truebody {
 True background-color: var(--bg-color);
 True color: var(--text-color);
 True margin: 0;
 True padding: var(--spacing-md);
 True font-family: Arial, sans-serif;
 True}
 True
 True.card {
 True background-color: var(--bg-color);
 True border-radius: var(--border-radius-md);
 True box-shadow: var(--shadow-md);
 True padding: var(--spacing-md);
 True margin-bottom: var(--spacing-md);
 True}
 True
 True.button {
 True background-color: var(--primary-color);
 True color: white;
 True border: none;
 True border-radius: var(--border-radius-sm);
 True padding: var(--spacing-sm) var(--spacing-md);
 True cursor: pointer;
 True transition: background-color 0.3s ease;
 True}
 True
 True.button:hover {
 True background-color: darken(var(--primary-color), 10%);
 True}
 True```

 False## 7. CSS 函数
 False
 FalseCSS 提供了多种函数，用于计算值、处理颜色等。
 False
 False### 7.1 颜色函数
 False
 False- **rgb()/rgba()**：使用红、绿、蓝和透明度值定义颜色。
 False- **hsl()/hsla()**：使用色相、饱和度、亮度和透明度值定义颜色。
 False- **color()**：使用指定颜色空间的颜色。
 False- **darken()/lighten()**：使颜色变暗或变亮。
 False- **saturate()/desaturate()**：增加或减少颜色的饱和度。
 False- **opacity()**：设置颜色的透明度。
 False
```css
 True/* rgb() 示例 */
 True.color1 {
 True color: rgb(255, 0, 0); /* 红色 */
 True}
 True
 True/* rgba() 示例 */
 True.color2 {
 True color: rgba(255, 0, 0, 0.5); /* 半透明红色 */
 True}
 True
 True/* hsl() 示例 */
 True.color3 {
 True color: hsl(120, 100%, 50%); /* 绿色 */
 True}
 True
 True/* hsla() 示例 */
 True.color4 {
 True color: hsla(120, 100%, 50%, 0.5); /* 半透明绿色 */
 True}
 True```

 False### 7.2 数学函数
 False
 False- **calc()**：执行计算，可混合不同单位。
 False- **clamp()**：将值限制在一个范围内。
 False- **min()**：返回多个值中的最小值。
 False- **max()**：返回多个值中的最大值。
 False
```css
 True/* calc() 示例 */
 True.container {
 True width: calc(100% - 20px); /* 宽度为父元素宽度减去 20px */
 True height: calc(100vh - 100px); /* 高度为视口高度减去 100px */
 True font-size: calc(16px + 0.5vw); /* 字体大小随视口宽度变化 */
 True}
 True
 True/* clamp() 示例 */
 True.text {
 True font-size: clamp(16px, 2vw, 24px); /* 字体大小在 16px 到 24px 之间，随视口宽度变化 */
 True}
 True
 True/* min() 示例 */
 True.box {
 True width: min(500px, 100%); /* 宽度为 500px 和 100% 中的较小值 */
 True}
 True
 True/* max() 示例 */
 True.header {
 True height: max(100px, 10vh); /* 高度为 100px 和 10vh 中的较大值 */
 True}
 True```

 False### 7.3 其他常用函数
 False
 False- **url()**：引用资源的 URL。
 False- **linear-gradient()/radial-gradient()**：创建线性或径向渐变。
 False- **repeat()**：重复值，用于 Grid 布局。
 False- **var()**：使用 CSS 变量。
 False- **attr()**：获取元素的属性值。
 False
```css
 True/* url() 示例 */
 True.background {
 True background-image: url("image.jpg");
 True}
 True
 True/* linear-gradient() 示例 */
 True.gradient {
 True background: linear-gradient(to right, red, blue);
 True}
 True
 True/* radial-gradient() 示例 */
 True.radial-gradient {
 True background: radial-gradient(circle, red, blue);
 True}
 True
 True/* repeat() 示例 */
 True.grid {
 True display: grid;
 True grid-template-columns: repeat(3, 1fr); /* 创建 3 个等宽列 */
 True}
 True
 True/* attr() 示例 */
 True[data-tooltip]::after {
 True content: attr(data-tooltip);
 True position: absolute;
 True bottom: 100%;
 True left: 50%;
 True transform: translateX(-50%);
 True background: #333;
 True color: white;
 True padding: 5px;
 True border-radius: 4px;
 True white-space: nowrap;
 True opacity: 0;
 True transition: opacity 0.3s;
 True}
 True
 True[data-tooltip]:hover::after {
 True opacity: 1;
 True}
 True```

 False## 8. 浏览器兼容性
 False
 False### 8.1 浏览器前缀
 False
 False为了支持不同浏览器的实验性特性，需要使用浏览器前缀：
 False
```css
 True/* 带浏览器前缀的 CSS */
 True.box {
 True /* Chrome, Safari, Opera */
 True -webkit-border-radius: 8px;
 True /* Firefox */
 True -moz-border-radius: 8px;
 True /* 标准语法 */
 True border-radius: 8px;
 True 
 True /* Chrome, Safari, Opera */
 True -webkit-box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
 True /* Firefox */
 True -moz-box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
 True /* 标准语法 */
 True box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
 True 
 True /* Chrome, Safari, Opera */
 True -webkit-transition: all 0.3s ease;
 True /* Firefox */
 True -moz-transition: all 0.3s ease;
 True /* 标准语法 */
 True transition: all 0.3s ease;
 True}
 True```

 False### 8.2 兼容性检测
 False
 False使用 `@supports` 规则检测浏览器是否支持特定特性：
 False
```css
 True/* 检测是否支持 Grid 布局 */
 True@supports (display: grid) {
 True .grid {
 True display: grid;
 True grid-template-columns: repeat(3, 1fr);
 True }
 True}
 True
 True/* 检测是否支持 Flexbox */
 True@supports (display: flex) {
 True .flex {
 True display: flex;
 True justify-content: center;
 True align-items: center;
 True }
 True}
 True
 True/* 降级方案 */
 True.grid {
 True /* 传统布局作为降级方案 */
 True display: block;
 True}
 True
 True@supports (display: grid) {
 True .grid {
 True display: grid;
 True grid-template-columns: repeat(3, 1fr);
 True }
 True}
 True```

 False### 8.3 兼容性最佳实践
 False
 False- **使用 Autoprefixer**：自动添加浏览器前缀。
 False- **渐进增强**：先实现基本功能，再添加高级特性。
 False- **优雅降级**：为不支持高级特性的浏览器提供替代方案。
 False- **使用 CSS Reset 或 Normalize.css**：统一不同浏览器的默认样式。
 False- **测试**：在不同浏览器中测试你的样式。
 False
 False## 9. 最佳实践
 False
 False### 9.1 代码组织
 False
 False- **使用模块化 CSS**：将样式按功能或组件分类。
 False- **使用命名约定**：如 BEM (Block, Element, Modifier) 命名规范。
 False- **使用注释**：为复杂样式添加注释。
 False- **保持代码整洁**：使用一致的缩进和格式。
 False
 False### 9.2 性能优化
 False
 False- **减少 CSS 文件大小**：使用压缩工具。
 False- **减少选择器复杂度**：使用简单的选择器。
 False- **避免使用 @import**：使用 `<link>` 标签代替。
 False- **使用 CSS 变量**：减少重复代码。
 False- **避免过度使用 !important**：保持样式的层叠性。
 False
 False### 9.3 可维护性
 False
 False- **使用语义化的类名**：类名应反映元素的用途。
 False- **避免内联样式**：使用外部或内部样式。
 False- **使用 CSS 预处理器**：如 Sass、Less 等，提供变量、嵌套、混合等功能。
 False- **定期清理**：移除未使用的样式。
 False- **文档化**：为样式添加文档说明。
 False
 False## 10. 总结
 False
 FalseCSS3 是现代网页设计的重要组成部分，提供了丰富的特性和功能：
 False
 False- **核心特性**：响应式设计、现代布局、视觉效果、交互动画等。
 False- **语法结构**：选择器、属性、值的基本结构，以及注释、空白等语法规则。
 False- **引入方式**：行内样式、内部样式、外部样式、导入式，各有优缺点。
 False- **优先级规则**：基于权重计算和就近原则，决定样式的应用顺序。
 False- **CSS 单位**：绝对单位和相对单位，适用于不同的场景。
 False- **CSS 变量**：可重用的值，提高代码的可维护性。
 False- **CSS 函数**：用于计算值、处理颜色等。
 False- **浏览器兼容性**：使用浏览器前缀和特性检测，确保在不同浏览器中的一致性。
 False- **最佳实践**：代码组织、性能优化、可维护性等方面的建议。
 False
 False通过掌握 CSS3 的这些特性和最佳实践，开发者可以创建美观、响应式、高性能的网页设计。
 False
 False---
 False
 False### 更新日志 (Changelog)
 False
 False- 2026-04-05: 整合 CSS 基础语法与优先级规则。
 False- 2026-04-06: 扩写详细内容，增加 CSS3 的历史与发展、模块化结构、CSS 变量、CSS 函数、浏览器兼容性、最佳实践等章节。

## 延伸阅读

- [[html5/overview-and-semantics|HTML5]]
 False