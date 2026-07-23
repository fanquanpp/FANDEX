---
order: 72
title: BEM命名方法论
module: css
category: CSS
difficulty: intermediate
description: BEM命名方法论
author: fanquanpp
updated: '2026-06-14'
related:
  - css/响应式设计
  - css/PostCSS与构建工具
  - css/CSS原子化
  - css/CSS模块化
prerequisites:
  - css/概述与基本语法
---

## 1. BEM 概述

BEM（Block Element Modifier）是一种 CSS 命名方法论，提高样式可维护性。

```
.block__element--modifier
```

- **Block**：独立的页面组件（如 `.card`）
- **Element**：Block 的组成部分（如 `.card__title`）
- **Modifier**：Block 或 Element 的变体（如 `.card--featured`）

## 2. 命名规范

```css
/* Block */
.card {
}

/* Element */
.card__title {
}
.card__body {
}
.card__footer {
}

/* Block Modifier */
.card--featured {
}
.card--dark {
}

/* Element Modifier */
.card__title--large {
}
.card__button--primary {
}
```

## 3. 实战示例

```html
<div class="card card--featured">
  <div class="card__header">
    <h2 class="card__title card__title--large">标题</h2>
  </div>
  <div class="card__body">
    <p class="card__text">内容</p>
  </div>
  <div class="card__footer">
    <button class="card__button card__button--primary">操作</button>
  </div>
</div>
```

```css
.card {
  border-radius: 8px;
  padding: 1rem;
  background: white;
}
.card--featured {
  border: 2px solid gold;
}
.card__title {
  font-size: 1.2rem;
}
.card__title--large {
  font-size: 1.5rem;
}
.card__button {
  padding: 8px 16px;
  border: none;
}
.card__button--primary {
  background: blue;
  color: white;
}
```

## 4. 替代方案

| 方法论 | 命名风格                    | 特点       |
| ------ | --------------------------- | ---------- |
| BEM    | `.block__element--modifier` | 语义清晰   |
| SMACSS | 分类命名                    | 按功能分层 |
| OOCSS  | 结构与皮肤分离              | 复用性高   |
| ITCSS  | 倒三角分层                  | 优先级管理 |
