---
order: 69
title: Sass
module: css
category: CSS
difficulty: intermediate
description: Sass（变量、嵌套、混合、继承、运算、模块化）
author: fanquanpp
updated: '2026-06-14'
related:
  - css/逻辑属性
  - css/滚动捕捉
  - css/Less与Stylus
  - css/响应式设计
prerequisites:
  - css/概述与基本语法
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
