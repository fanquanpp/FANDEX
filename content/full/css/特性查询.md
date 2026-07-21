---
order: 65
title: 特性查询
module: css
category: CSS
difficulty: intermediate
description: '@supports'
author: fanquanpp
updated: '2026-06-14'
related:
  - css/函数
  - css/CSS变量与自定义属性
  - css/层叠层
  - css/逻辑属性
prerequisites:
  - css/概述与基本语法
---

## 1. @supports 语法

```css
@supports (display: grid) {
  .container {
    display: grid;
  }
}

@supports not (display: grid) {
  .container {
    display: flex;
  }
}
```

### 逻辑操作符

```css
@supports (display: grid) and (gap: 1rem) {
}
@supports (display: flex) or (display: grid) {
}
@supports not (display: grid) {
}
```

## 2. 常用检测

```css
@supports (backdrop-filter: blur(10px)) {
  .glass {
    backdrop-filter: blur(10px);
  }
}
@supports (aspect-ratio: 1/1) {
  .square {
    aspect-ratio: 1/1;
  }
}
@supports (selector(:has(*))) {
  .card:has(.badge) {
    border-color: gold;
  }
}
```

## 3. JavaScript 检测

```javascript
if (CSS.supports('display', 'grid')) {
  /* 使用 Grid */
}
if (CSS.supports('(display: grid) and (gap: 1rem)')) {
  /* 使用 Grid + gap */
}
```

## 4. 渐进增强策略

```css
/* 基础样式 */
.container {
  display: flex;
  flex-wrap: wrap;
}
.item {
  width: 50%;
}

/* 增强样式 */
@supports (display: grid) {
  .container {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .item {
    width: auto;
  }
}
```
