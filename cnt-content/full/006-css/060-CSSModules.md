---
order: 600
title: CSS Modules
module: 'css'
category: 前端技术
difficulty: intermediate
description: CSS Modules
author: fanquanpp
updated: '2026-08-30'
related:
  - 'css/058-BEMNamingMethodology'
  - 'css/059-CSSAtomic'
  - 'css/061-CriticalRenderPathOptimization'
  - 'css/042-CSSNativeNesting'
prerequisites:
  - 'css/002-CSS3OverviewBasicSyntax'
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

## 动手试试

1. 在 Vite 项目里创建 `Button.module.css`，验证类名被哈希；
2. 在组件里用 `styles.button` 引用局部类；
3. 用 `:global()` 转义全局样式；
4. 进阶挑战：组合 `composes` 复用样式。

## 核心知识点

> 一句话记住 CSS Modules：构建时给类名加哈希实现局部作用域，组件样式不泄漏，类名引用靠对象映射。

- 文件命名 `*.module.css`，类名构建时哈希；
- 组件通过 `import styles from './x.module.css'` 引用；
- `:global()` 声明全局样式；
- `composes` 组合其它类；
- 解决命名冲突，配合组件开发。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 误用全局类 | 样式泄漏 | 明确 :global 边界 |
| 动态类名 | 映射失效 | 用 styles 对象拼接 |
| 与 Tailwind 混用 | 构建复杂 | 项目统一方案 |

## 扩展学习

- Vite：`vite/005-CSSPreprocessors`；
- 原子化：`css/059-CSSAtomic`；
- 架构：`css/044-CSSArchitectureMethodology`。
