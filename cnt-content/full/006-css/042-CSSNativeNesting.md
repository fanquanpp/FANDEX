---
order: 420
title: CSS 原生嵌套
module: 'css'
category: 前端技术
difficulty: intermediate
description: CSS原生嵌套
author: fanquanpp
updated: '2026-08-30'
related:
  - 'css/061-CriticalRenderPathOptimization'
  - 'css/062-CSSCanvasDrawing'
  - 'css/063-CSSInJS'
prerequisites:
  - 'css/002-CSS3OverviewBasicSyntax'
---


## 1. CSS 原生嵌套概述

CSS 原生嵌套（CSS Nesting）允许在选择器内部嵌套子选择器，无需预处理器。

```css
.card {
  padding: 1rem;
  background: white;

  & .title {
    font-size: 1.5rem;
    font-weight: bold;
  }

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  @media (min-width: 768px) {
    padding: 2rem;
  }
}
```

## 2. 嵌套规则

### 2.1 & 符号

`&` 代表父选择器：

```css
.btn {
  background: blue;

  &:hover {
    background: darkblue;
  }
  &:active {
    transform: scale(0.98);
  }
  &--primary {
    background: green;
  }
  &__icon {
    margin-right: 8px;
  }
}
```

### 2.2 隐式嵌套

不带 `&` 的嵌套会自动在前面添加父选择器：

```css
.card {
  .title {
    font-size: 1.5rem;
  }
  /* 等价于 .card .title */
}
```

### 2.3 嵌套 @规则

```css
.container {
  width: 100%;

  @media (min-width: 768px) {
    width: 750px;
  }
  @media (min-width: 1024px) {
    width: 960px;
  }
  @supports (backdrop-filter: blur(10px)) {
    backdrop-filter: blur(10px);
  }
}
```

## 3. 与预处理器嵌套的区别

| 特性       | CSS 原生嵌套           | Sass/Less      |
| ---------- | ---------------------- | -------------- |
| 运行时     | 浏览器原生             | 需编译         |
| & 用法     | 必须（隐式时自动添加） | 可选           |
| 嵌套深度   | 无限制                 | 无限制         |
| @规则嵌套  |                        |                |
| 浏览器支持 | 2023+                  | 全部（编译后） |

## 4. 最佳实践

- 嵌套深度不超过 3 层
- 优先使用 `&` 显式引用
- 善用 @规则嵌套简化媒体查询

## 动手试试

1. 用原生嵌套重写一个卡片组件的样式；
2. 用 `&` 写 hover 与伪元素；
3. 对比原生嵌套与 Sass 嵌套的语法差异；
4. 进阶挑战：嵌套媒体查询。

## 核心知识点

> 一句话记住原生嵌套：选择器写在父选择器内部，`&` 引用父级；现代浏览器直接支持，无需编译。

- 嵌套规则：子选择器继承父选择器；
- `&` 引用父选择器（hover、伪元素、修饰符）；
- 支持嵌套媒体查询；
- 与 Sass 嵌套语法基本一致；
- 浏览器支持：Chrome 120+、Firefox 117+、Safari 17.2+。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 嵌套过深 | 选择器膨胀 | 控制在 3 层内 |
| 依赖编译 | 老浏览器不支持 | 用构建工具转译或确认目标 |
| 与 Sass 混用 | 语义混乱 | 统一写法 |

## 扩展学习

- Sass：`css/054-Sass`；
- 新特性：`css/064-CSSNewFeatures`；
- 选择器：`css/007-CSS3SelectorSystem`。
