---
order: 70
title: Less与Stylus
module: css
category: CSS
difficulty: intermediate
description: Less与Stylus
author: fanquanpp
updated: '2026-06-14'
related:
  - css/滚动捕捉
  - css/Sass预处理器
  - css/响应式设计
  - css/PostCSS与构建工具
prerequisites:
  - css/概述与基本语法
---

## 1. Less

Less 是一种 CSS 预处理器，语法接近 CSS，学习成本低。

### 1.1 变量

```less
@primary: #3498db;
@spacing: 1rem;

body {
  color: @primary;
  padding: @spacing;
}
```

### 1.2 混合

```less
.flex-center() {
  display: flex;
  justify-content: center;
  align-items: center;
}

.container {
  .flex-center();
}
```

### 1.3 嵌套与运算

```less
.nav {
  a {
    color: @primary;
    &:hover {
      opacity: 0.8;
    }
  }
}

@base: 16px;
h1 {
  font-size: @base * 2;
}
```

## 2. Stylus

Stylus 提供更灵活的语法，大括号和分号均可省略。

### 2.1 变量

```stylus
primary = #3498db
spacing = 1rem

body
  color primary
  padding spacing
```

### 2.2 混合

```stylus
flex-center()
  display flex
  justify-content center
  align-items center

.container
  flex-center()
```

### 2.3 函数

```stylus
rem(px)
  (px / 16) * 1rem

h1
  font-size rem(32)
```

## 3. 对比

| 特性 | Sass            | Less        | Stylus     |
| ---- | --------------- | ----------- | ---------- |
| 语法 | SCSS/Sass       | 类 CSS      | 灵活       |
| 变量 | `$`             | `@`         | 自定义     |
| 混合 | @mixin/@include | .class()    | function() |
| 继承 | @extend         | :extend()   | @extend    |
| 条件 | @if/@else       | when guards | if/else    |
| 循环 | @for/@each      | 循环需递归  | for/in     |
| 社区 | 最大            | 较大        | 较小       |
