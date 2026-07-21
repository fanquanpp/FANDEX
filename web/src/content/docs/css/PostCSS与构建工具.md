---
order: 71
title: PostCSS
module: css
category: CSS
difficulty: intermediate
description: PostCSS（autoprefixer、cssnano）
author: fanquanpp
updated: '2026-06-14'
related:
  - css/Less与Stylus
  - css/响应式设计
  - css/BEM命名方法论
  - css/CSS原子化
prerequisites:
  - css/概述与基本语法
---

## 1. PostCSS 概述

PostCSS 是一个用 JavaScript 插件转换 CSS 的工具，本身不提供任何功能，通过插件实现。

```javascript
// postcss.config.js
module.exports = {
  plugins: [require('autoprefixer'), require('cssnano')({ preset: 'default' })],
};
```

## 2. 常用插件

### 2.1 autoprefixer

自动添加浏览器前缀：

```css
/* 输入 */
.container {
  display: flex;
}

/* 输出 */
.container {
  display: -webkit-box;
  display: -ms-flexbox;
  display: flex;
}
```

```json
// package.json → browserslist
"browserslist": ["last 2 versions", "> 1%", "not dead"]
```

### 2.2 cssnano

CSS 压缩优化：

```css
/* 输入 */
.container {
  margin: 0px;
  color: #ff0000;
}

/* 输出 */
.container {
  margin: 0;
  color: red;
}
```

### 2.3 postcss-preset-env

使用未来 CSS 特性：

```css
/* 输入 */
@custom-media --md (min-width: 768px);
@media (--md) {
  .container {
    width: 750px;
  }
}

/* 输出 */
@media (min-width: 768px) {
  .container {
    width: 750px;
  }
}
```

### 2.4 postcss-nesting

CSS 原生嵌套：

```css
.card {
  padding: 1rem;
  & .title {
    font-size: 1.5rem;
  }
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}
```

## 3. 与构建工具集成

```bash
# Vite
npm install -D postcss autoprefixer

# Webpack
npm install -D postcss-loader autoprefixer
```

## 4. 自定义插件

```javascript
module.exports = (opts = {}) => {
  return {
    postcssPlugin: 'postcss-my-plugin',
    Declaration(decl) {
      if (decl.prop === 'color' && decl.value === 'primary') {
        decl.value = opts.primary || '#3498db';
      }
    },
  };
};
```
