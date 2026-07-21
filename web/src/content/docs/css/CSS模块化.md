---
order: 74
title: 'CSS-Modules'
module: css
category: CSS
difficulty: intermediate
description: 'CSS Modules'
author: fanquanpp
updated: '2026-06-14'
related:
  - css/BEM命名方法论
  - css/CSS原子化
  - css/关键渲染路径优化
  - css/CSS原生嵌套
prerequisites:
  - css/概述与基本语法
---

## 1. CSS Modules 概述

CSS Modules 自动为每个类名生成唯一哈希，实现样式隔离，避免命名冲突。

```css
/* Button.module.css */
.btn {
  padding: 8px 16px;
  border-radius: 4px;
}
.primary {
  background: blue;
  color: white;
}
```

```javascript
import styles from './Button.module.css';

function Button() {
  return <button className={`${styles.btn} ${styles.primary}`}>Click</button>;
}
// 渲染为：<button class="Button_btn_x9y8z Button_primary_a1b2c">Click</button>
```

## 2. 命名约定

```css
/* 推荐：camelCase */
.primaryButton {
}

/* 也可以：kebab-case */
.primary-button {
}
```

```javascript
// camelCase 引用
styles.primaryButton;

// kebab-case 引用
styles['primary-button'];
```

## 3. 组合（composes）

```css
.base {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
}

.primary {
  composes: base;
  background: blue;
  color: white;
}
```

## 4. 与框架集成

### React

```javascript
import styles from './Component.module.css';
<div className={styles.container}></div>;
```

### Vue

```html
<style module>
  .container {
    padding: 1rem;
  }
</style>

<template>
  <div :class="$style.container"></div>
</template>
```

## 5. TypeScript 支持

```typescript
// declare module '*.module.css' {
//   const classes: { readonly [key: string]: string };
//   export default classes;
// }
```

## 6. 对比其他方案

| 方案        | 隔离方式   | 运行时 | 优点     |
| ----------- | ---------- | ------ | -------- |
| CSS Modules | 哈希类名   |        | 零运行时 |
| CSS-in-JS   | 运行时生成 |        | 动态样式 |
| Shadow DOM  | DOM 隔离   |        | 完全隔离 |
| BEM         | 命名约定   |        | 简单     |
