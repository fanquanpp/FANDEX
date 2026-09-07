---
order: 570
title: PostCSS
module: 'css'
category: 前端技术
difficulty: intermediate
description: PostCSS（autoprefixer、cssnano）
author: fanquanpp
updated: '2026-08-30'
related:
  - 'css/056-LessStylus'
  - 'css/034-ResponsiveDesign'
  - 'css/058-BEMNamingMethodology'
  - 'css/059-CSSAtomic'
prerequisites:
  - 'css/002-CSS3OverviewBasicSyntax'
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

## 动手试试

1. 在 Vite 项目中启用 PostCSS，用 autoprefixer 自动加前缀；
2. 安装 postcss-preset-env，体验未来语法编译；
3. 用 postcss-nested 写原生嵌套语法；
4. 进阶挑战：写一个自定义 PostCSS 插件（如 px 转 rem）。

## 核心知识点

> 一句话记住 PostCSS：用 JS 插件处理 CSS 的“管道”，autoprefixer 加前缀、preset-env 编译未来语法、插件生态自由扩展。

- PostCSS 不是预处理器，而是插件化处理管道；
- autoprefixer：自动添加浏览器前缀；
- postcss-preset-env：按目标浏览器编译新语法；
- 与 Sass/Less 可共存，负责“收尾加工”；
- Vite/Webpack 均内置支持。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 插件顺序错误 | 处理结果异常 | 按文档顺序配置 |
| 滥用自定义插件 | 维护成本高 | 先查生态已有插件 |
| 忘记 browserslist | 前缀目标不明 | 统一配置 browserslist |

## 扩展学习

- 构建：`vite/005-CSSPreprocessors`；
- 预处理器：`css/054-Sass`；
- 工程化：`css/043-CSSArchitectureMethodology`。
