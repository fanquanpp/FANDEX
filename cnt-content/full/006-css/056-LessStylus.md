---
order: 560
title: Less 与 Stylus
module: 'css'
category: 前端技术
difficulty: intermediate
description: Less与Stylus
author: fanquanpp
updated: '2026-08-30'
related:
  - 'css/039-ScrollSnap'
  - 'css/055-Sass'
  - 'css/034-ResponsiveDesign'
  - 'css/057-PostCSS'
prerequisites:
  - 'css/002-CSS3OverviewBasicSyntax'
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

## 动手试试

1. 用 Less 变量与嵌套重写一段样式；
2. 用 Less 的 `@import` 拆分模块；
3. 对比 Sass 与 Less 的 mixin 语法差异；
4. 进阶挑战：在 Vite 中分别配置 Sass/Less 并比较构建结果。

## 核心知识点

> 一句话记住 Less/Stylus：同为预处理器，Less 语法贴近 CSS、mixin 用类选择器，Stylus 极简可省略符号；工程上 Sass 生态更主流。

- Less：`@变量`、嵌套、mixin 用类名 + `()`；
- Stylus：无花括号/分号可选，语法自由；
- 都编译为 CSS，都有变量、嵌套、混合；
- Less 与 CSS 兼容性最好；
- 现代项目常用 Sass，Less 仍见于老项目。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 语法太自由 | 团队风格不一 | 统一 lint 与风格 |
| 混用预处理器 | 构建混乱 | 项目统一一种 |
| 忽视 CSS 原生能力 | 重复造轮子 | 优先 CSS 变量/嵌套 |

## 扩展学习

- Sass：`css/054-Sass`；
- PostCSS：`css/056-PostCSS`；
- 构建：`vite/005-CSSPreprocessors`。
