---
order: 100
title: CSS架构方法论
module: css
category: 'dev-lang'
difficulty: advanced
description: CSS架构方法论详解：BEM、OOCSS、SMACSS的核心理念、对比分析与实战应用。
author: fanquanpp
updated: '2026-06-14'
related:
  - css/Canvas绘图
  - 'css/CSS-in-JS与高级布局技巧'
  - css/理论知识点
  - css/CSS新特性
prerequisites:
  - css/概述与基本语法
---

## 1. BEM — Block Element Modifier

### 1.1 核心概念

BEM 由 Yandex 提出，通过严格的命名约定消除样式冲突：

| 概念     | 说明                 | 命名格式           |
| -------- | -------------------- | ------------------ |
| Block    | 独立的功能块         | `.block`           |
| Element  | Block 的组成部分     | `.block__element`  |
| Modifier | Block/Element 的变体 | `.block--modifier` |

```html
<!-- Block -->
<div class="card">
  <!-- Element -->
  <div class="card__header">
    <h2 class="card__title">标题</h2>
  </div>
  <div class="card__body">
    <p class="card__text">内容</p>
  </div>
  <!-- Modifier -->
  <button class="card__button card__button--primary">确认</button>
  <button class="card__button card__button--secondary">取消</button>
</div>

<!-- Block Modifier -->
<div class="card card--featured">
  <div class="card__header">
    <h2 class="card__title">精选标题</h2>
  </div>
</div>
```

```css
/* Block */
.card {
  border: 1px solid #ddd;
  border-radius: 8px;
}

/* Element */
.card__header {
  padding: 16px;
  border-bottom: 1px solid #eee;
}
.card__title {
  font-size: 18px;
  font-weight: 600;
}
.card__body {
  padding: 16px;
}
.card__text {
  color: #333;
  line-height: 1.6;
}
.card__button {
  padding: 8px 16px;
  border-radius: 4px;
}

/* Modifier */
.card--featured {
  border-color: gold;
  box-shadow: 0 0 12px rgba(255, 215, 0, 0.3);
}
.card__button--primary {
  background: #007bff;
  color: white;
}
.card__button--secondary {
  background: #6c757d;
  color: white;
}
```

### 1.2 BEM 命名变体

| 风格      | 示例                                    | 使用者     |
| --------- | --------------------------------------- | ---------- |
| 经典      | `.block__element--modifier`             | Yandex     |
| 两连字符  | `.block-element-modifier`               | 简化版     |
| CamelCase | `.blockName__elementName--modifierName` | React 社区 |

### 1.3 BEM 优缺点

**优点**：

- 命名自解释，无需查看 HTML 结构
- 扁平选择器，无特异性战争
- 模块化，Block 可复用

**缺点**：

- 类名冗长
- 嵌套 Block 时命名困难
- 严格规则增加编写成本

## 2. OOCSS — Object-Oriented CSS

### 2.1 核心原则

OOCSS 由 Nicole Sullivan 提出，两大原则：

**原则一：结构与皮肤分离**

```css
/* 结构 */
.btn {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

/* 皮肤 */
.btn-primary {
  background: #007bff;
  color: white;
  border: none;
}
.btn-danger {
  background: #dc3545;
  color: white;
  border: none;
}
.btn-outline {
  background: transparent;
  border: 1px solid #007bff;
  color: #007bff;
}
```

```html
<button class="btn btn-primary">确认</button>
<button class="btn btn-danger">删除</button>
<button class="btn btn-outline">取消</button>
```

**原则二：容器与内容分离**

```css
/* 错误：内容依赖容器 */
.sidebar .title {
  font-size: 14px;
  color: #666;
}

/* 正确：内容独立于容器 */
.title-secondary {
  font-size: 14px;
  color: #666;
}
```

```html
<!-- 同一样式可在不同容器中复用 -->
<div class="sidebar">
  <h3 class="title-secondary">侧边栏标题</h3>
</div>
<div class="footer">
  <h3 class="title-secondary">页脚标题</h3>
</div>
```

### 2.2 OOCSS 实战模式

```css
/* 通用媒体对象 */
.media {
  display: flex;
  align-items: flex-start;
}
.media__figure {
  margin-right: 16px;
}
.media__body {
  flex: 1;
}

/* 皮肤变体 */
.media--reverse {
  flex-direction: row-reverse;
}
.media--reverse .media__figure {
  margin-right: 0;
  margin-left: 16px;
}
```

```html
<div class="media">
  <img class="media__figure" src="avatar.jpg" alt="" />
  <div class="media__body">
    <p>内容</p>
  </div>
</div>
```

### 2.3 OOCSS 优缺点

**优点**：复用性极强，CSS 体积小
**缺点**：HTML 类名多，需设计抽象能力

## 3. SMACSS — Scalable and Modular Architecture for CSS

### 3.1 五大分类

| 分类   | 前缀     | 说明         | 示例                       |
| ------ | -------- | ------------ | -------------------------- |
| Base   | 无       | 元素默认样式 | `body`, `a`                |
| Layout | `l-`     | 页面布局结构 | `l-header`, `l-sidebar`    |
| Module | 无       | 可复用组件   | `.card`, `.nav`            |
| State  | `is-`    | 状态样式     | `.is-active`, `.is-hidden` |
| Theme  | `theme-` | 主题覆盖     | `.theme-dark`              |

### 3.2 Base 规则

```css
/* reset/normalize 层 */
*,
*::before,
*::after {
  box-sizing: border-box;
}
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  line-height: 1.6;
}
a {
  color: #007bff;
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}
```

### 3.3 Layout 规则

```css
.l-page {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 100vh;
}
.l-header {
  grid-column: 1 / -1;
  padding: 16px;
}
.l-sidebar {
  padding: 16px;
  border-right: 1px solid #eee;
}
.l-main {
  padding: 24px;
}
.l-footer {
  grid-column: 1 / -1;
  padding: 16px;
}
```

### 3.4 Module 规则

```css
/* Module 独立于 Layout */
.card {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}
.card__image {
  width: 100%;
  height: 200px;
  object-fit: cover;
}
.card__content {
  padding: 16px;
}
.card__title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px;
}
```

### 3.5 State 规则

```css
/* 状态类覆盖 Module 的默认样式 */
.is-active {
  font-weight: 700;
  color: #007bff;
}
.is-hidden {
  display: none;
}
.is-collapsed {
  height: 0;
  overflow: hidden;
}
.is-loading {
  opacity: 0.5;
  pointer-events: none;
}
.is-disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
```

```html
<nav class="nav">
  <a class="nav__item is-active" href="/">首页</a>
  <a class="nav__item" href="/about">关于</a>
</nav>
```

### 3.6 Theme 规则

```css
/* 默认主题 */
:root {
  --bg-primary: #ffffff;
  --text-primary: #333333;
  --border-color: #dddddd;
}

/* 暗色主题 */
.theme-dark {
  --bg-primary: #1a1a2e;
  --text-primary: #e0e0e0;
  --border-color: #333355;
}
```

## 4. 三种方法论对比

| 维度       | BEM            | OOCSS          | SMACSS         |
| ---------- | -------------- | -------------- | -------------- |
| 核心关注   | 命名约定       | 复用与分离     | 架构分类       |
| 学习曲线   | 低             | 中             | 中             |
| 命名规范   | 严格           | 灵活           | 前缀约定       |
| 特异性控制 | 扁平，低特异性 | 扁平，低特异性 | 分层，低特异性 |
| 适用规模   | 中大型         | 中型           | 大型           |
| 工具支持   | 广泛           | 一般           | 一般           |
| 与框架兼容 | Vue/React 友好 | Tailwind 友好  | 通用           |

## 5. 现代实践

### 5.1 BEM + CSS 变量

```css
.card {
  --card-padding: 16px;
  --card-radius: 8px;
  --card-bg: #fff;

  padding: var(--card-padding);
  border-radius: var(--card-radius);
  background: var(--card-bg);
}

.card--compact {
  --card-padding: 8px;
}

.card--dark {
  --card-bg: #2d2d2d;
}
```

### 5.2 CSS Modules + BEM

```jsx
// React + CSS Modules
import styles from './Card.module.css';

function Card({ variant, children }) {
  return <div className={`${styles.card} ${styles[variant]}`}>{children}</div>;
}
```

### 5.3 混合策略

```
推荐组合:
  架构分层 → SMACSS（Base / Layout / Module / State / Theme）
  组件命名 → BEM（.block__element--modifier）
  复用抽象 → OOCSS（结构与皮肤分离）
  主题系统 → CSS 变量
```
