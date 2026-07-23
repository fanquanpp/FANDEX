---
order: 101
title: CSS新特性
module: css
category: 'dev-lang'
difficulty: advanced
description: 'CSS现代新特性详解：@container容器查询、@layer层叠层、逻辑属性、:has()选择器。'
author: fanquanpp
updated: '2026-06-14'
related:
  - css/CSS架构方法论
  - css/理论知识点
  - css/CSS性能优化详解
  - css/HTML语义化与SEO优化
prerequisites:
  - css/概述与基本语法
---

## 1. @container 容器查询

### 1.1 基本概念

容器查询允许根据**父容器尺寸**而非视口尺寸应用样式，实现真正的组件级响应式。

```css
/* 定义容器 */
.card-container {
  container-type: inline-size;
  container-name: card;
}

/* 根据容器宽度应用样式 */
@container card (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 200px 1fr;
  }
}

@container card (min-width: 200px) and (max-width: 399px) {
  .card {
    display: flex;
    flex-direction: column;
  }
}
```

### 1.2 container-type 类型

| 类型          | 说明                       |
| ------------- | -------------------------- |
| `inline-size` | 仅查询行内方向尺寸（宽度） |
| `size`        | 查询行内和块方向尺寸       |
| `normal`      | 默认值，不作为查询容器     |

### 1.3 容器查询单位

| 单位    | 含义              |
| ------- | ----------------- |
| `cqw`   | 容器宽度的 1%     |
| `cqh`   | 容器高度的 1%     |
| `cqi`   | 容器行内尺寸的 1% |
| `cqb`   | 容器块尺寸的 1%   |
| `cqmin` | 容器较小尺寸的 1% |
| `cqmax` | 容器较大尺寸的 1% |

```css
.card-title {
  font-size: clamp(14px, 3cqi, 24px);
}
```

### 1.4 样式查询

```css
/* 查询自定义属性值 */
.card-container {
  --theme: dark;
}

@container style(--theme: dark) {
  .card {
    background: #1a1a2e;
    color: #e0e0e0;
  }
}

@container style(--theme: light) {
  .card {
    background: #ffffff;
    color: #333333;
  }
}
```

## 2. @layer 层叠层

### 2.1 基本概念

`@layer` 允许显式控制样式的层叠优先级，解决第三方库样式覆盖问题。

```css
/* 声明层（顺序决定优先级，后声明的优先级更高） */
@layer reset, base, components, utilities;

/* 各层定义 */
@layer reset {
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
  }
}

@layer base {
  body {
    font-family: system-ui;
    line-height: 1.6;
  }
  a {
    color: #007bff;
  }
}

@layer components {
  .btn {
    padding: 8px 16px;
    border-radius: 4px;
  }
  .card {
    border: 1px solid #ddd;
    border-radius: 8px;
  }
}

@layer utilities {
  .text-center {
    text-align: center;
  }
  .mt-4 {
    margin-top: 16px;
  }
}
```

### 2.2 层叠优先级

```
无层样式 > utilities > components > base > reset

优先级从低到高：
  @layer reset        ← 最低
  @layer base
  @layer components
  @layer utilities
  无层样式（unlayered） ← 最高
```

### 2.3 嵌套层

```css
@layer framework {
  @layer base {
    /* framework.base */
  }
  @layer components {
    /* framework.components */
  }
}

/* 等效写法 */
@layer framework.base {
  /* ... */
}
@layer framework.components {
  /* ... */
}
```

### 2.4 第三方样式管理

```css
@layer reset, third-party, custom;

@import url('bootstrap.css') layer(third-party);

@layer custom {
  .btn {
    /* 自定义覆盖 */
  }
}
```

## 3. 逻辑属性

### 3.1 物理属性 vs 逻辑属性

| 物理属性           | 逻辑属性               | 说明         |
| ------------------ | ---------------------- | ------------ |
| `margin-left`      | `margin-inline-start`  | 行内起始边距 |
| `margin-right`     | `margin-inline-end`    | 行内结束边距 |
| `margin-top`       | `margin-block-start`   | 块起始边距   |
| `margin-bottom`    | `margin-block-end`     | 块结束边距   |
| `padding-left`     | `padding-inline-start` | 行内起始内距 |
| `width`            | `inline-size`          | 行内尺寸     |
| `height`           | `block-size`           | 块尺寸       |
| `border-left`      | `border-inline-start`  | 行内起始边框 |
| `text-align: left` | `text-align: start`    | 起始对齐     |
| `float: left`      | `float: inline-start`  | 起始浮动     |

### 3.2 简写属性

```css
/* 物理简写 */
margin: 10px 20px; /* top/bottom left/right */

/* 逻辑简写 */
margin-block: 10px; /* block-start block-end */
margin-inline: 20px; /* inline-start inline-end */
margin: 10px 20px; /* 仍然有效，但方向固定 */

/* 完整逻辑简写 */
margin-block-start: 10px;
margin-block-end: 10px;
margin-inline-start: 20px;
margin-inline-end: 20px;
```

### 3.3 RTL 支持

```css
/* 使用逻辑属性自动适配 RTL */
.element {
  margin-inline-start: 16px; /* LTR: margin-left; RTL: margin-right */
  padding-inline-end: 8px; /* LTR: padding-right; RTL: padding-left */
  text-align: start; /* LTR: left; RTL: right */
}
```

```html
<!-- LTR -->
<div dir="ltr" class="element">内容</div>

<!-- RTL -->
<div dir="rtl" class="element">محتوى</div>
```

### 3.4 逻辑属性与定位

```css
.positioned {
  position: absolute;
  inset-block-start: 0; /* top in LTR */
  inset-inline-start: 0; /* left in LTR */
  inset: 0; /* 所有方向（物理简写，但已支持逻辑） */
}
```

## 4. :has() 选择器

### 4.1 基本用法

`:has()` 被称为"CSS 的父选择器"，允许根据子元素状态选择父元素。

```css
/* 包含 img 的 a 标签 */
a:has(img) {
  display: block;
  border: 1px solid #ddd;
}

/* 包含 .error 的表单 */
form:has(.error) {
  border-color: red;
}

/* 有焦点的输入框的标签 */
label:has(+ input:focus) {
  color: #007bff;
  font-weight: 600;
}
```

### 4.2 表单状态样式

```css
/* 必填字段标记 */
input:required + label::after {
  content: ' *';
  color: red;
}

/* 有无效输入的表单组 */
.form-group:has(input:invalid) {
  --border-color: #dc3545;
}

/* 全部填写完成的表单 */
form:has(input:valid):not(:has(input:invalid)) button[type='submit'] {
  opacity: 1;
  pointer-events: auto;
}
```

### 4.3 卡片变体

```css
/* 有图片的卡片 */
.card:has(img) {
  grid-template-rows: 200px 1fr;
}

/* 无图片的卡片 */
.card:not(:has(img)) {
  grid-template-rows: auto;
  padding: 24px;
}
```

### 4.4 主题切换

```css
/* 根据选中的主题单选按钮应用样式 */
body:has(#theme-dark:checked) {
  background: #1a1a2e;
  color: #e0e0e0;
}

body:has(#theme-light:checked) {
  background: #ffffff;
  color: #333333;
}
```

### 4.5 性能考虑

`:has()` 的性能特征：

- 浏览器对 `:has()` 做了优化，不会遍历整个 DOM
- 避免在大型列表上使用复杂的 `:has()` 组合
- 推荐用于结构性选择，而非高频动态样式

## 5. 其他现代特性

### 5.1 :is() 和 :where()

```css
/* :is() — 优先级取参数中最高的 */
:is(h1, h2, h3):hover {
  color: #007bff;
}

/* :where() — 优先级始终为 0 */
:where(.btn, .link) {
  cursor: pointer;
}
```

### 5.2 :not() 增强

```css
/* 排除多个选择器 */
input:not([type='hidden'], [type='submit']) {
  border: 1px solid #ccc;
}
```

### 5.3 accent-color

```css
input[type='checkbox'],
input[type='radio'],
input[type='range'],
progress {
  accent-color: #007bff;
}
```

### 5.4 color-mix()

```css
.button {
  background: color-mix(in srgb, #007bff 80%, white);
  border-color: color-mix(in srgb, #007bff, black 20%);
}
```
