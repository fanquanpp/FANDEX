---
order: 550
title: Sass
module: 'css'
category: 前端技术
difficulty: intermediate
description: Sass（变量、嵌套、混合、继承、运算、模块化）
author: fanquanpp
updated: '2026-08-30'
related:
  - 'css/037-LogicalProperty'
  - 'css/039-ScrollSnap'
  - 'css/056-LessStylus'
  - 'css/034-ResponsiveDesign'
prerequisites:
  - 'css/002-CSS3OverviewBasicSyntax'
---


## 1. Sass 概述

Sass 是最流行的 CSS 预处理器，提供变量、嵌套、混合、继承等特性。

### 语法：SCSS（大括号）vs Sass（缩进）

```scss
// SCSS 语法（推荐）
$primary: #3498db;

.btn {
  background: $primary;
  &:hover {
    opacity: 0.8;
  }
}
```

## 2. 变量

```scss
$font-stack: 'Helvetica Neue', sans-serif;
$primary: #3498db;
$spacing: 1rem;

body {
  font-family: $font-stack;
  color: $primary;
}
```

## 3. 嵌套

```scss
.nav {
  ul {
    list-style: none;
  }
  li {
    display: inline-block;
  }
  a {
    text-decoration: none;
    &:hover {
      color: blue;
    } /* & 引用父选择器 */
  }
}
```

## 4. 混合（Mixin）

```scss
@mixin flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

@mixin respond-to($breakpoint) {
  @if $breakpoint == md {
    @media (min-width: 768px) {
      @content;
    }
  }
  @if $breakpoint == lg {
    @media (min-width: 1024px) {
      @content;
    }
  }
}

.container {
  @include flex-center;
}
.sidebar {
  @include respond-to(md) {
    width: 25%;
  }
}
```

## 5. 继承（Extend）

```scss
%button-base {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-primary {
  @extend %button-base;
  background: blue;
}
.btn-secondary {
  @extend %button-base;
  background: gray;
}
```

## 6. 运算与函数

```scss
$base: 16px;
h1 {
  font-size: $base * 2;
}
h2 {
  font-size: $base * 1.5;
}

@function rem($px) {
  @return ($px / 16) * 1rem;
}
h1 {
  font-size: rem(32);
}
```

## 7. 模块化

```scss
// _variables.scss
$primary: #3498db;

// _mixins.scss
@mixin flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

// main.scss
@use 'variables' as *;
@use 'mixins' as *;
```

## 动手试试

1. 用 Sass 变量重构一组重复颜色；
2. 用嵌套语法整理一个卡片组件的样式；
3. 用 `@mixin` + `@include` 封装“圆角卡片”；
4. 进阶挑战：用 `@each` 循环生成间距工具类。

## 核心知识点

> 一句话记住 Sass：变量存值、嵌套分组、mixin 复用、函数计算，编译时生成 CSS；现代 CSS 变量与原生嵌套可部分替代。

- 变量：`$primary: #3498db`（编译时替换）；
- 嵌套：选择器层级书写，`&` 引用父选择器；
- `@mixin`/`@include`：样式片段复用；
- `@extend`：选择器继承（慎用）；
- 控制指令：`@if`/`@each`/`@for`；
- 与现代 CSS 的区别：Sass 是编译期，CSS 变量是运行期。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 嵌套过深 | 生成选择器冗长 | 嵌套 ≤ 3 层 |
| @extend 滥用 | 选择器膨胀 | 优先 mixin |
| 变量与 CSS 变量混用 | 语义不清 | 明确编译期/运行期 |
| 依赖构建 | 调试需 sourcemap | 开启 sourcemap |

## 扩展学习

- 对比 Less：`css/055-LessStylus`；
- 构建：`css/056-PostCSS`、`vite/005-CSSPreprocessors`；
- 架构：`css/043-CSSArchitectureMethodology`。
