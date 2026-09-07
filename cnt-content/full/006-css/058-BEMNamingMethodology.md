---
order: 580
title: BEM 命名方法论
module: 'css'
category: 前端技术
difficulty: intermediate
description: BEM命名方法论
author: fanquanpp
updated: '2026-08-30'
related:
  - 'css/034-ResponsiveDesign'
  - 'css/057-PostCSS'
  - 'css/059-CSSAtomic'
prerequisites:
  - 'css/002-CSS3OverviewBasicSyntax'
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

## 动手试试

1. 把一个“卡片”组件按 BEM 命名：`.card`、`.card__title`、`.card--featured`；
2. 把导航改写成 BEM 结构；
3. 检查你的项目中是否还有“标签+类”混合命名；
4. 进阶挑战：对比 BEM 与 CSS Modules 的隔离方案。

## 核心知识点

> 一句话记住 BEM：Block 独立块、Element 双下划线、Modifier 双连字符；命名即文档，层级扁平化。

- Block：独立组件（`.card`）；
- Element：块的组成部分（`.card__title`）；
- Modifier：状态或变体（`.card--active`）；
- 好处：无嵌套、优先级稳定、可读性好；
- 缺点：类名长，需配合工具（如短横线命名）。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 嵌套过深 | 类名冗长 | Element 不嵌套 Element |
| 混用命名风格 | 维护混乱 | 全库统一 BEM |
| 用标签选择器 | 与 BEM 冲突 | 只用类选择器 |

## 扩展学习

- 架构：`css/043-CSSArchitectureMethodology`；
- 模块化：`css/059-CSSModules`；
- 原子化：`css/058-CSSAtomic`。
