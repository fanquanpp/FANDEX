---
order: 60
tags:
  - 'css'
  - 'css-layout'
  - 'devops'
difficulty: 'intermediate'
title: 'CSS3 Grid 网格布局'
module: 'css'
category: 'CSS Basics'
description: '网格容器与项目属性、区域命名与响应式网格。'
author: 'Anonymous'
---

## 目录

1. [目录](#目录)
1. [核心概念](#核心概念)
1. [容器属性](#容器属性)
1. [项目属性](#项目属性)
1. [Grid vs Flexbox](#grid-vs-flexbox)
1. [响应式设计](#响应式设计)
1. [性能优化](#性能优化)
1. [浏览器兼容性](#浏览器兼容性)
1. [最佳实践](#最佳实践)
1. [实际应用示例](#实际应用示例)
1. [总结](#总结)

---

## 1. 目录

- [1. 核心概念](#1-核心概念)
- [1.1 Grid Container](#11-grid-container)
- [1.2 Grid Track](#12-grid-track)
- [1.3 Grid Cell](#13-grid-cell)
- [1.4 Grid Area](#14-grid-area)
- [1.5 Grid Line](#15-grid-line)
- [1.6 Grid Gap](#16-grid-gap)
- [2. 容器属性](#2-容器属性)
- [2.1 display](#21-display)
- [2.2 grid-template-columns](#22-grid-template-columns)
- [2.3 grid-template-rows](#23-grid-template-rows)
- [2.4 grid-template-areas](#24-grid-template-areas)
- [2.5 grid-template](#25-grid-template)
- [2.6 gap](#26-gap)
- [2.7 row-gap](#27-row-gap)
- [2.8 column-gap](#28-column-gap)
- [2.9 justify-items](#29-justify-items)
- [2.10 align-items](#210-align-items)
- [2.11 place-items](#211-place-items)
- [2.12 justify-content](#212-justify-content)
- [2.13 align-content](#213-align-content)
- [2.14 place-content](#214-place-content)
- [2.15 grid-auto-columns](#215-grid-auto-columns)
- [2.16 grid-auto-rows](#216-grid-auto-rows)
- [2.17 grid-auto-flow](#217-grid-auto-flow)
- [2.18 grid](#218-grid)
- [3. 项目属性](#3-项目属性)
- [3.1 grid-column-start](#31-grid-column-start)
- [3.2 grid-column-end](#32-grid-column-end)
- [3.3 grid-column](#33-grid-column)
- [3.4 grid-row-start](#34-grid-row-start)
- [3.5 grid-row-end](#35-grid-row-end)
- [3.6 grid-row](#36-grid-row)
- [3.7 grid-area](#37-grid-area)
- [3.8 justify-self](#38-justify-self)
- [3.9 align-self](#39-align-self)
- [3.10 place-self](#310-place-self)
- [4. Grid vs Flexbox](#4-grid-vs-flexbox)
- [4.1 适用场景对比](#41-适用场景对比)
- [4.2 组合使用](#42-组合使用)
- [5. 响应式设计](#5-响应式设计)
- [5.1 媒体查询与 Grid](#51-媒体查询与-grid)
- [5.2 响应式网格示例](#52-响应式网格示例)
- [6. 性能优化](#6-性能优化)
- [6.1 减少重排](#61-减少重排)
- [6.2 合理使用属性](#62-合理使用属性)
- [7. 浏览器兼容性](#7-浏览器兼容性)
- [7.1 支持情况](#71-支持情况)
- [7.2 前缀使用](#72-前缀使用)
- [8. 最佳实践](#8-最佳实践)
- [8.1 代码组织](#81-代码组织)
- [8.2 命名规范](#82-命名规范)
- [8.3 常见问题与解决方案](#83-常见问题与解决方案)
- [9. 实际应用示例](#9-实际应用示例)
- [10. 总结](#10-总结)

## 1. 核心概念

Grid 布局是一种二维布局系统，能够同时处理行和列，为网页布局提供了更灵活、更强大的方式。

### 1.1 Grid Container

Grid Container（网格容器）是通过设置 `display: grid` 或 `display: inline-grid` 创建的元素。它是所有 Grid Item（网格项目）的直接父元素。

```css
 /* 创建块级网格容器 */
 .container {
  display: grid;
 True}
 /* 创建内联网格容器 */
 .inline-container {
  display: inline-grid;
 True}
```

### 1.2 Grid Track

Grid Track（网格轨道）是网格中的行或列。

```css
 /* 定义三列网格轨道 */
 .container {
  display: grid;
  grid-template-columns: 100px 200px 100px;
 True}
 /* 定义两行网格轨道 */
 .container {
  display: grid;
  grid-template-rows: 50px 100px;
 True}
```

### 1.3 Grid Cell

Grid Cell（网格单元格）是网格中最小的单位，由相邻的两条行线和两条列线围成的区域。

### 1.4 Grid Area

Grid Area（网格区域）是由多个网格单元格组成的矩形区域。

```css
 /* 定义网格区域 */
 .container {
  display: grid;
  grid-template-areas:
  "header header header"
  "sidebar main main"
  "footer footer footer";
 True}
 .header {
  grid-area: header;
 True}
 .sidebar {
  grid-area: sidebar;
 True}
 .main {
  grid-area: main;
 True}
 .footer {
  grid-area: footer;
 True}
```

### 1.5 Grid Line

Grid Line（网格线）是网格中划分行和列的线，包括水平网格线（行线）和垂直网格线（列线）。

### 1.6 Grid Gap

Grid Gap（网格间距）是网格轨道之间的空间。

```css
 /* 设置网格间距 */
 .container {
  display: grid;
  gap: 20px;
 True}
```

## 2. 容器属性

### 2.1 display

`display` 属性用于创建网格容器。
| 值 | 描述 |
|----|------|
| `grid` | 创建块级网格容器 |
| `inline-grid` | 创建内联网格容器 |

```css
 /* 块级网格容器 */
 .container {
  display: grid;
 True}
 /* 内联网格容器 */
 .container {
  display: inline-grid;
 True}
```

### 2.2 grid-template-columns

`grid-template-columns` 属性定义网格的列轨道。

```css
 /* 使用固定值 */
 .container {
  display: grid;
  grid-template-columns: 100px 200px 100px;
 True}
 /* 使用百分比 */
 .container {
  display: grid;
  grid-template-columns: 25% 50% 25%;
 True}
 /* 使用分数单位 */
 .container {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
 True}
 /* 使用混合单位 */
 .container {
  display: grid;
  grid-template-columns: 100px 1fr 2fr;
 True}
 /* 使用重复函数 */
 .container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
 True}
 /* 使用自动填充 */
 .container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
 True}
 /* 使用自动适应 */
 .container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
 True}
```

### 2.3 grid-template-rows

`grid-template-rows` 属性定义网格的行轨道。

```css
 /* 使用固定值 */
 .container {
  display: grid;
  grid-template-rows: 50px 100px 50px;
 True}
 /* 使用百分比 */
 .container {
  display: grid;
  grid-template-rows: 20% 60% 20%;
 True}
 /* 使用分数单位 */
 .container {
  display: grid;
  grid-template-rows: 1fr 2fr 1fr;
 True}
 /* 使用混合单位 */
 .container {
  display: grid;
  grid-template-rows: 50px 1fr 50px;
 True}
 /* 使用重复函数 */
 .container {
  display: grid;
  grid-template-rows: repeat(3, 1fr);
 True}
```

### 2.4 grid-template-areas

`grid-template-areas` 属性定义命名的网格区域。

```css
 /* 定义网格区域 */
 .container {
  display: grid;
  grid-template-areas:
  "header header header"
  "sidebar main main"
  "footer footer footer";
  grid-template-columns: 200px 1fr 1fr;
  grid-template-rows: 60px 1fr 60px;
 True}
 .header {
  grid-area: header;
  background-color: #3498db;
  color: white;
  padding: 20px;
 True}
 .sidebar {
  grid-area: sidebar;
  background-color: #f0f0f0;
  padding: 20px;
 True}
 .main {
  grid-area: main;
  background-color: white;
  padding: 20px;
 True}
 .footer {
  grid-area: footer;
  background-color: #333;
  color: white;
  padding: 20px;
 True}
```

### 2.5 grid-template

`grid-template` 是 `grid-template-columns`、`grid-template-rows` 和 `grid-template-areas` 的复合属性。

```css
 /* 复合属性 */
 .container {
  display: grid;
  grid-template:
  "header header header" 60px
  "sidebar main main" 1fr
  "footer footer footer" 60px
  / 200px 1fr 1fr;
 True}
```

### 2.6 gap

`gap` 是 `row-gap` 和 `column-gap` 的复合属性，定义网格轨道之间的间距。

```css
 /* 设置行和列间距 */
 .container {
  display: grid;
  gap: 20px;
 True}
 /* 设置不同的行和列间距 */
 .container {
  display: grid;
  gap: 10px 20px;
 True}
```

### 2.7 row-gap

`row-gap` 属性定义网格行之间的间距。

```css
 /* 设置行间距 */
 .container {
  display: grid;
  row-gap: 20px;
 True}
```

### 2.8 column-gap

`column-gap` 属性定义网格列之间的间距。

```css
 /* 设置列间距 */
 .container {
  display: grid;
  column-gap: 20px;
 True}
```

### 2.9 justify-items

`justify-items` 属性定义网格项目在列轴上的对齐方式。
| 值 | 描述 |
|----|------|
| `stretch` | 项目拉伸以填充单元格（默认） |
| `start` | 项目对齐到单元格的起始边缘 |
| `end` | 项目对齐到单元格的结束边缘 |
| `center` | 项目在单元格中居中对齐 |

```css
 /* 项目在列轴上居中对齐 */
 .container {
  display: grid;
  justify-items: center;
 True}
```

### 2.10 align-items

`align-items` 属性定义网格项目在行轴上的对齐方式。
| 值 | 描述 |
|----|------|
| `stretch` | 项目拉伸以填充单元格（默认） |
| `start` | 项目对齐到单元格的起始边缘 |
| `end` | 项目对齐到单元格的结束边缘 |
| `center` | 项目在单元格中居中对齐 |
| `baseline` | 项目以基线对齐 |

```css
 /* 项目在行轴上居中对齐 */
 .container {
  display: grid;
  align-items: center;
 True}
```

### 2.11 place-items

`place-items` 是 `align-items` 和 `justify-items` 的复合属性。

```css
 /* 项目在单元格中居中对齐 */
 .container {
  display: grid;
  place-items: center;
 True}
 /* 不同的行轴和列轴对齐方式 */
 .container {
  display: grid;
  place-items: start end;
 True}
```

### 2.12 justify-content

`justify-content` 属性定义网格容器在列轴上的对齐方式。
| 值 | 描述 |
|----|------|
| `stretch` | 网格拉伸以填充容器（默认） |
| `start` | 网格对齐到容器的起始边缘 |
| `end` | 网格对齐到容器的结束边缘 |
| `center` | 网格在容器中居中对齐 |
| `space-between` | 网格之间均匀分布，两端对齐 |
| `space-around` | 网格之间均匀分布，两端有间距 |
| `space-evenly` | 网格之间和两端都均匀分布 |

```css
 /* 网格在列轴上居中对齐 */
 .container {
  display: grid;
  justify-content: center;
 True}
```

### 2.13 align-content

`align-content` 属性定义网格容器在行轴上的对齐方式。
| 值 | 描述 |
|----|------|
| `stretch` | 网格拉伸以填充容器（默认） |
| `start` | 网格对齐到容器的起始边缘 |
| `end` | 网格对齐到容器的结束边缘 |
| `center` | 网格在容器中居中对齐 |
| `space-between` | 网格之间均匀分布，两端对齐 |
| `space-around` | 网格之间均匀分布，两端有间距 |
| `space-evenly` | 网格之间和两端都均匀分布 |

```css
 /* 网格在行轴上居中对齐 */
 .container {
  display: grid;
  align-content: center;
 True}
```

### 2.14 place-content

`place-content` 是 `align-content` 和 `justify-content` 的复合属性。

```css
 /* 网格在容器中居中对齐 */
 .container {
  display: grid;
  place-content: center;
 True}
 /* 不同的行轴和列轴对齐方式 */
 .container {
  display: grid;
  place-content: start end;
 True}
```

### 2.15 grid-auto-columns

`grid-auto-columns` 属性定义自动生成的列轨道的大小。

```css
 /* 自动生成的列轨道大小 */
 .container {
  display: grid;
  grid-auto-columns: 100px;
 True}
```

### 2.16 grid-auto-rows

`grid-auto-rows` 属性定义自动生成的行轨道的大小。

```css
 /* 自动生成的行轨道大小 */
 .container {
  display: grid;
  grid-auto-rows: 100px;
 True}
```

### 2.17 grid-auto-flow

`grid-auto-flow` 属性定义自动放置项目的方式。
| 值 | 描述 |
|----|------|
| `row` | 按行填充（默认） |
| `column` | 按列填充 |
| `dense` | 尝试填充空白区域 |

```css
 /* 按列填充 */
 .container {
  display: grid;
  grid-auto-flow: column;
 True}
 /* 按行填充并尝试填充空白区域 */
 .container {
  display: grid;
  grid-auto-flow: row dense;
 True}
```

### 2.18 grid

`grid` 是 `grid-template-rows`、`grid-template-columns`、`grid-template-areas`、`grid-auto-rows`、`grid-auto-columns` 和 `grid-auto-flow` 的复合属性。

```css
 /* 复合属性 */
 .container {
  display: grid;
  grid:
  "header header" 60px
  "sidebar main" 1fr
  "footer footer" 60px
  / 200px 1fr;
 True}
```

## 3. 项目属性

### 3.1 grid-column-start

`grid-column-start` 属性定义网格项目的起始列线。

```css
 /* 项目从第 1 列线开始 */
 .item {
  grid-column-start: 1;
 True}
 /* 使用命名的列线 */
 .container {
  display: grid;
  grid-template-columns: [col1-start] 1fr [col2-start] 1fr [col3-start] 1fr [col3-end];
 True}
 .item {
  grid-column-start: col2-start;
 True}
```

### 3.2 grid-column-end

`grid-column-end` 属性定义网格项目的结束列线。

```css
 /* 项目到第 3 列线结束 */
 .item {
  grid-column-end: 3;
 True}
 /* 使用命名的列线 */
 .item {
  grid-column-end: col3-end;
 True}
 /* 跨越 2 列 */
 .item {
  grid-column-end: span 2;
 True}
```

### 3.3 grid-column

`grid-column` 是 `grid-column-start` 和 `grid-column-end` 的复合属性。

```css
 /* 从第 1 列线到第 3 列线 */
 .item {
  grid-column: 1 / 3;
 True}
 /* 从第 2 列线开始，跨越 2 列 */
 .item {
  grid-column: 2 / span 2;
 True}
 /* 使用命名的列线 */
 .item {
  grid-column: col1-start / col3-end;
 True}
```

### 3.4 grid-row-start

`grid-row-start` 属性定义网格项目的起始行线。

```css
 /* 项目从第 1 行线开始 */
 .item {
  grid-row-start: 1;
 True}
 /* 使用命名的行线 */
 .container {
  display: grid;
  grid-template-rows: [row1-start] 1fr [row2-start] 1fr [row3-start] 1fr [row3-end];
 True}
 .item {
  grid-row-start: row2-start;
 True}
```

### 3.5 grid-row-end

`grid-row-end` 属性定义网格项目的结束行线。

```css
 /* 项目到第 3 行线结束 */
 .item {
  grid-row-end: 3;
 True}
 /* 使用命名的行线 */
 .item {
  grid-row-end: row3-end;
 True}
 /* 跨越 2 行 */
 .item {
  grid-row-end: span 2;
 True}
```

### 3.6 grid-row

`grid-row` 是 `grid-row-start` 和 `grid-row-end` 的复合属性。

```css
 /* 从第 1 行线到第 3 行线 */
 .item {
  grid-row: 1 / 3;
 True}
 /* 从第 2 行线开始，跨越 2 行 */
 .item {
  grid-row: 2 / span 2;
 True}
 /* 使用命名的行线 */
 .item {
  grid-row: row1-start / row3-end;
 True}
```

### 3.7 grid-area

`grid-area` 属性定义网格项目的区域，可以是命名的区域或行/列的起始和结束线。

```css
 /* 使用命名的区域 */
 .item {
  grid-area: header;
 True}
 /* 使用行/列的起始和结束线 */
 .item {
  grid-area: 1 / 1 / 3 / 4;
 True}
```

### 3.8 justify-self

`justify-self` 属性定义单个网格项目在列轴上的对齐方式，覆盖容器的 `justify-items` 属性。
| 值 | 描述 |
|----|------|
| `auto` | 继承容器的 `justify-items` 属性（默认） |
| `stretch` | 项目拉伸以填充单元格 |
| `start` | 项目对齐到单元格的起始边缘 |
| `end` | 项目对齐到单元格的结束边缘 |
| `center` | 项目在单元格中居中对齐 |

```css
 /* 单个项目在列轴上居中对齐 */
 .item {
  justify-self: center;
 True}
```

### 3.9 align-self

`align-self` 属性定义单个网格项目在行轴上的对齐方式，覆盖容器的 `align-items` 属性。
| 值 | 描述 |
|----|------|
| `auto` | 继承容器的 `align-items` 属性（默认） |
| `stretch` | 项目拉伸以填充单元格 |
| `start` | 项目对齐到单元格的起始边缘 |
| `end` | 项目对齐到单元格的结束边缘 |
| `center` | 项目在单元格中居中对齐 |
| `baseline` | 项目以基线对齐 |

```css
 /* 单个项目在行轴上居中对齐 */
 .item {
  align-self: center;
 True}
```

### 3.10 place-self

`place-self` 是 `align-self` 和 `justify-self` 的复合属性。

```css
 /* 单个项目在单元格中居中对齐 */
 .item {
  place-self: center;
 True}
 /* 不同的行轴和列轴对齐方式 */
 .item {
  place-self: start end;
 True}
```

## 4. Grid vs Flexbox

### 4.1 适用场景对比

| 特性       | Flexbox                                        | Grid                                               |
| ---------- | ---------------------------------------------- | -------------------------------------------------- |
| 维度       | 一维（行或列）                                 | 二维（行和列）                                     |
| 适用场景   | 内容驱动的小部件、线性排列、导航菜单、卡片布局 | 整体页面布局、复杂的重叠设计、网格系统、响应式布局 |
| 主要优势   | 简单易用、适合处理动态内容、良好的对齐能力     | 强大的二维布局能力、直观的区域定义、更好的控制     |
| 浏览器支持 | 广泛支持，包括旧版本浏览器                     | 现代浏览器支持良好，旧版本浏览器支持有限           |

### 4.2 组合使用

Flexbox 和 Grid 可以组合使用，发挥各自的优势。

```css
 /* 使用 Grid 布局整体页面结构 */
 .page {
  display: grid;
  grid-template-areas:
  "header header"
  "sidebar main"
  "footer footer";
  grid-template-columns: 200px 1fr;
  grid-template-rows: 60px 1fr 60px;
  height: 100vh;
 True}
 /* 使用 Flexbox 布局导航菜单 */
 .nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
 True}
 /* 使用 Flexbox 布局卡片容器 */
 .card-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  padding: 20px;
 True}
 .card {
  flex: 1 1 200px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
 True}
```

## 5. 响应式设计

### 5.1 媒体查询与 Grid

Grid 与媒体查询结合使用，可以创建响应式布局。

```css
 /* 基础布局 */
 .container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
 True}
 /* 响应式调整 */
 @media (max-width: 1200px) {
  .container {
  grid-template-columns: repeat(3, 1fr);
  }
 True}
 @media (max-width: 992px) {
  .container {
  grid-template-columns: repeat(2, 1fr);
  }
 True}
 @media (max-width: 768px) {
  .container {
  grid-template-columns: 1fr;
  }
 True}
```

### 5.2 响应式网格示例

```html
<div class="grid-container">
  <div class="grid-item">Item 1</div>
  <div class="grid-item">Item 2</div>
  <div class="grid-item">Item 3</div>
  <div class="grid-item">Item 4</div>
  <div class="grid-item">Item 5</div>
  <div class="grid-item">Item 6</div>
  <div class="grid-item">Item 7</div>
  <div class="grid-item">Item 8</div>
</div>
```

```css
 .grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  padding: 20px;
 True}
 .grid-item {
  background-color: #f0f0f0;
  padding: 20px;
  border-radius: 4px;
  text-align: center;
 True}
 @media (max-width: 768px) {
  .grid-container {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
  padding: 15px;
  }
 True}
 @media (max-width: 480px) {
  .grid-container {
  grid-template-columns: 1fr;
  gap: 10px;
  padding: 10px;
  }
 True}
```

## 6. 性能优化

### 6.1 减少重排

- **避免频繁修改布局属性**：尽量一次性修改多个属性，减少浏览器重排次数。
- **使用 transform 代替 top/left**：transform 不会触发重排，性能更好。
- **使用 will-change**：提前告知浏览器元素可能发生变化，优化渲染。

### 6.2 合理使用属性

- **优先使用简写属性**：如 `grid`、`place-items` 等，减少代码量。
- **避免过度嵌套**：减少网格容器的嵌套层级，提高渲染性能。
- **合理设置网格大小**：使用 `fr` 单位和 `minmax()` 函数，避免不必要的计算。

## 7. 浏览器兼容性

### 7.1 支持情况

Grid 在现代浏览器中得到了广泛支持，但在一些旧版本浏览器中可能需要使用前缀。
| 浏览器 | 支持情况 |
|--------|----------|
| Chrome | 57+ |
| Firefox | 52+ |
| Safari | 10.1+ |
| Edge | 16+ |
| IE | 不支持 |

### 7.2 前缀使用

在一些旧版本浏览器中，需要使用厂商前缀。

```css
 /* 带前缀的 Grid */
 .container {
  display: -ms-grid; /* IE */
  display: grid;
  -ms-grid-columns: 1fr 2fr 1fr;
  grid-template-columns: 1fr 2fr 1fr;
  -ms-grid-rows: 50px 1fr 50px;
  grid-template-rows: 50px 1fr 50px;
 True}
 .item {
  -ms-grid-column: 1;
  -ms-grid-column-span: 3;
  grid-column: 1 / 4;
 True}
```

## 8. 最佳实践

### 8.1 代码组织

- **按功能组织**：将相关的样式放在一起。
- **使用注释**：为不同的部分添加注释。
- **模块化**：将样式按模块分离。

### 8.2 命名规范

推荐使用 BEM (Block, Element, Modifier) 命名规范：

```css
 /* Block */
 .grid {
  display: grid;
  /* 网格样式 */
 True}
 /* Element */
 .grid__item {
  /* 网格项目样式 */
 True}
 /* Modifier */
 .grid--responsive {
  /* 响应式网格样式 */
 True}
```

### 8.3 常见问题与解决方案

#### 问题 1：网格项目溢出容器

**解决方案**：使用 `minmax()` 函数和 `auto-fill`/`auto-fit` 来创建响应式网格。

#### 问题 2：IE 浏览器兼容性

**解决方案**：使用厂商前缀，或提供 Flexbox 作为降级方案。

#### 问题 3：网格项目大小不一致

**解决方案**：使用 `fr` 单位或固定值来确保项目大小一致。

#### 问题 4：网格区域命名冲突

**解决方案**：使用清晰、唯一的区域名称，避免冲突。

## 9. 实际应用示例

### 9.1 示例 1：网站布局

```html
<div class="page">
  <header class="header">Header</header>
  <aside class="sidebar">Sidebar</aside>
  <main class="main">Main Content</main>
  <footer class="footer">Footer</footer>
</div>
```

```css
 .page {
  display: grid;
  grid-template-areas:
  "header header header"
  "sidebar main main"
  "footer footer footer";
  grid-template-columns: 200px 1fr 1fr;
  grid-template-rows: 60px 1fr 60px;
  height: 100vh;
  gap: 10px;
  padding: 10px;
  box-sizing: border-box;
 True}
 .header {
  grid-area: header;
  background-color: #3498db;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
 True}
 .sidebar {
  grid-area: sidebar;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
 True}
 .main {
  grid-area: main;
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #ddd;
  border-radius: 4px;
 True}
 .footer {
  grid-area: footer;
  background-color: #333;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
 True}
 @media (max-width: 768px) {
  .page {
  grid-template-areas:
  "header"
  "main"
  "sidebar"
  "footer";
  grid-template-columns: 1fr;
  grid-template-rows: 60px 1fr 200px 60px;
  }
 True}
```

### 9.2 示例 2：卡片网格

```html
<div class="card-grid">
  <div class="card">
    <h3 class="card__title">Card 1</h3>
    <p class="card__content">This is card 1 content</p>
  </div>
  <div class="card">
    <h3 class="card__title">Card 2</h3>
    <p class="card__content">This is card 2 content</p>
  </div>
  <div class="card">
    <h3 class="card__title">Card 3</h3>
    <p class="card__content">This is card 3 content</p>
  </div>
  <div class="card">
    <h3 class="card__title">Card 4</h3>
    <p class="card__content">This is card 4 content</p>
  </div>
  <div class="card">
    <h3 class="card__title">Card 5</h3>
    <p class="card__content">This is card 5 content</p>
  </div>
  <div class="card">
    <h3 class="card__title">Card 6</h3>
    <p class="card__content">This is card 6 content</p>
  </div>
</div>
```

```css
 .card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  padding: 20px;
 True}
 .card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
 True}
 .card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
 True}
 .card__title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
  color: #333;
 True}
 .card__content {
  color: #666;
  line-height: 1.5;
 True}
 @media (max-width: 768px) {
  .card-grid {
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
  padding: 15px;
  }
 True}
 @media (max-width: 480px) {
  .card-grid {
  grid-template-columns: 1fr;
  gap: 10px;
  padding: 10px;
  }
 True}
```

### 9.3 示例 3：仪表盘布局

```html
<div class="dashboard">
  <div class="dashboard__widget dashboard__widget--large">
    <h3>销售统计</h3>
    <p>本月销售额: ¥100,000</p>
  </div>
  <div class="dashboard__widget">
    <h3>用户数量</h3>
    <p>活跃用户: 1,200</p>
  </div>
  <div class="dashboard__widget">
    <h3>订单数量</h3>
    <p>今日订单: 50</p>
  </div>
  <div class="dashboard__widget dashboard__widget--large">
    <h3>热门产品</h3>
    <ul>
      <li>产品 1</li>
      <li>产品 2</li>
      <li>产品 3</li>
    </ul>
  </div>
  <div class="dashboard__widget">
    <h3>转化率</h3>
    <p>转化率: 15%</p>
  </div>
  <div class="dashboard__widget">
    <h3>客单价</h3>
    <p>客单价: ¥200</p>
  </div>
</div>
```

```css
 .dashboard {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 200px);
  gap: 20px;
  padding: 20px;
 True}
 .dashboard__widget {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
 True}
 .dashboard__widget--large {
  grid-column: span 2;
 True}
 .dashboard__widget h3 {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 10px;
  color: #333;
 True}
 .dashboard__widget p {
  font-size: 24px;
  font-weight: bold;
  color: #3498db;
 True}
 .dashboard__widget ul {
  list-style: none;
  margin: 0;
  padding: 0;
 True}
 .dashboard__widget li {
  padding: 5px 0;
  border-bottom: 1px solid #f0f0f0;
 True}
 @media (max-width: 992px) {
  .dashboard {
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(3, 200px);
  }
  .dashboard__widget--large {
  grid-column: span 2;
  }
 True}
 @media (max-width: 768px) {
  .dashboard {
  grid-template-columns: 1fr;
  grid-template-rows: repeat(6, 150px);
  }
  .dashboard__widget--large {
  grid-column: span 1;
  }
 True}
```

## 10. 总结

Grid 布局是一种强大的二维布局系统，具有以下优势：

- **二维布局**：同时处理行和列，提供更灵活的布局能力。
- **直观的区域定义**：通过 `grid-template-areas` 可以直观地定义布局结构。
- **强大的空间分配**：使用 `fr` 单位和 `minmax()` 函数，可以智能分配空间。
- **响应式设计**：结合媒体查询，可以创建适应不同屏幕尺寸的布局。
- **良好的浏览器支持**：在现代浏览器中得到广泛支持。
  Grid 布局的核心概念包括：
- **网格容器**：通过 `display: grid` 创建。
- **网格轨道**：行或列。
- **网格单元格**：最小的单位。
- **网格区域**：由多个单元格组成的矩形区域。
- **网格线**：划分行和列的线。
- **网格间距**：轨道之间的空间。
  通过掌握 Grid 布局，开发者可以更加灵活地控制页面布局，创建复杂、美观的网页设计。Grid 布局不仅简化了布局代码，还提高了开发效率，是现代前端开发中不可或缺的布局工具。

---

### 更新日志 (Changelog)

- 2026-04-05: 深入细化 Grid 二维布局逻辑。
- 2026-04-06: 扩写详细内容，增加响应式设计、性能优化、浏览器兼容性、实际应用示例等章节。
