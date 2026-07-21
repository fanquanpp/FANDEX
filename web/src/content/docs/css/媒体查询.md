---
order: 61
title: 媒体查询
module: css
category: CSS
difficulty: intermediate
description: '@media'
author: fanquanpp
updated: '2026-06-14'
related:
  - css/动画与过渡
  - css/边框圆角
  - css/容器查询
  - css/移动端适配
prerequisites:
  - css/概述与基本语法
---

## 1. @media 语法

```css
@media screen and (min-width: 768px) {
  /* 样式 */
}
```

### 媒体类型：`all`（默认）、`screen`、`print`、`speech`

### 逻辑操作符：`and`、逗号（or）、`not`、`only`

## 2. 常用媒体特性

```css
@media (min-width: 768px) {
} /* 视口宽度 */
@media (orientation: portrait) {
} /* 竖屏 */
@media (prefers-color-scheme: dark) {
} /* 深色模式 */
@media (prefers-reduced-motion: reduce) {
} /* 减少动画 */
@media (hover: hover) {
} /* 支持悬停 */
@media (pointer: fine) {
} /* 精确指针 */
```

## 3. 响应式断点

```css
.container {
  padding: 1rem;
}
@media (min-width: 576px) {
  .container {
    padding: 1.5rem;
  }
}
@media (min-width: 768px) {
  .container {
    padding: 2rem;
  }
}
@media (min-width: 992px) {
  .container {
    max-width: 960px;
    margin: 0 auto;
  }
}
```

## 4. 深色模式

```css
:root {
  --bg: #fff;
  --text: #333;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1a1a1a;
    --text: #e0e0e0;
  }
}
```

## 5. JavaScript 检测

```javascript
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  console.log('深色模式:', e.matches);
});
```
