---
order: 66
title: 层叠层
module: css
category: CSS
difficulty: advanced
description: '@layer'
author: fanquanpp
updated: '2026-06-14'
related:
  - css/CSS变量与自定义属性
  - css/特性查询
  - css/逻辑属性
  - css/滚动捕捉
prerequisites:
  - css/概述与基本语法
---

## 1. @layer 概述

CSS 层叠层（Cascade Layers）允许开发者将 CSS 规则分组到不同的层中，控制层叠优先级。

```css
@layer reset, base, components, utilities;

@layer reset {
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
}

@layer base {
  body {
    font-family: sans-serif;
    line-height: 1.6;
  }
}

@layer components {
  .card {
    border-radius: 8px;
    padding: 1rem;
  }
}

@layer utilities {
  .hidden {
    display: none;
  }
}
```

## 2. 层优先级

**后声明的层优先级更高**：reset < base < components < utilities

**未分层的规则优先级最高**（高于所有层）。

## 3. 嵌套层

```css
@layer framework {
  @layer base {
    .btn {
      padding: 8px;
    }
  }
  @layer theme {
    .btn {
      color: blue;
    }
  }
}

/* 引用嵌套层 */
@layer framework.theme {
  .btn {
    color: red;
  }
}
```

## 4. @import 与 @layer

```css
@import url('reset.css') layer(reset);
@import url('base.css') layer(base);
```

## 5. 最佳实践

- 使用 `@layer` 声明层顺序
- 第三方样式放在低优先级层
- 自定义样式放在高优先级层
- 工具类放在最高优先级层
