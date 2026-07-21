---
order: 50
tags:
  - css
  - 'css-layout'
difficulty: intermediate
title: 'CSS3 Flexbox 弹性布局'
module: css
category: 'CSS Basics'
description: 'flex 容器与项目属性、对齐方式与常见布局模式。'
author: Anonymous
related:
  - css/选择器系统
  - css/传统布局技术
  - css/伪类与伪元素
  - css/优先级计算
prerequisites:
  - css/概述与基本语法
---

## 1. 核心概念

Flexbox（弹性盒子）是一种一维布局模型，旨在提供一种更高效的方式来布局、对齐和分配容器中项目之间的空间。

### 1.1 Flex Container

Flex Container（弹性容器）是通过设置 `display: flex` 或 `display: inline-flex` 创建的元素。它是所有 Flex Item（弹性项目）的直接父元素。

```css
/* 创建块级弹性容器 */
.container {
  display: flex;
}
/* 创建内联弹性容器 */
.inline-container {
  display: inline-flex;
}
```

### 1.2 Flex Item

Flex Item（弹性项目）是弹性容器的直接子元素。即使是文本节点也会被视为弹性项目。

```html
<div class="container">
  <div class="item">Item 1</div>
  <!-- 弹性项目 -->
  <div class="item">Item 2</div>
  <!-- 弹性项目 -->
  <div class="item">Item 3</div>
  <!-- 弹性项目 -->
</div>
```

### 1.3 主轴与侧轴

- **主轴 (Main Axis)**：弹性项目排列的主要方向，默认为水平方向（从左到右）。
- **侧轴 (Cross Axis)**：与主轴垂直的轴，默认为垂直方向（从上到下）。
  主轴和侧轴的方向由 `flex-direction` 属性决定。

### 1.4 弹性容器的创建

通过设置 `display: flex` 或 `display: inline-flex` 来创建弹性容器。

```css
/* 块级弹性容器 */
.flex-container {
  display: flex;
  /* 其他容器属性 */
}
/* 内联弹性容器 */
.inline-flex-container {
  display: inline-flex;
  /* 其他容器属性 */
}
```

## 2. 容器属性

### 2.1 flex-direction

`flex-direction` 属性定义了弹性容器的主轴方向。

| 值               | 描述                             |
| ---------------- | -------------------------------- |
| `row`            | 主轴为水平方向，从左到右（默认） |
| `row-reverse`    | 主轴为水平方向，从右到左         |
| `column`         | 主轴为垂直方向，从上到下         |
| `column-reverse` | 主轴为垂直方向，从下到上         |

```css
/* 水平方向（默认） */
.container {
  display: flex;
  flex-direction: row;
}
/* 垂直方向 */
.container {
  display: flex;
  flex-direction: column;
}
/* 水平反向 */
.container {
  display: flex;
  flex-direction: row-reverse;
}
/* 垂直反向 */
.container {
  display: flex;
  flex-direction: column-reverse;
}
```

### 2.2 justify-content

`justify-content` 属性定义了弹性项目在主轴上的对齐方式。

| 值              | 描述                             |
| --------------- | -------------------------------- |
| `flex-start`    | 项目对齐到主轴的起始位置（默认） |
| `flex-end`      | 项目对齐到主轴的结束位置         |
| `center`        | 项目在主轴上居中对齐             |
| `space-between` | 项目之间均匀分布，两端对齐       |
| `space-around`  | 项目之间均匀分布，两端有间距     |
| `space-evenly`  | 项目之间和两端都均匀分布         |

```css
/* 主轴起始对齐 */
.container {
  display: flex;
  justify-content: flex-start;
}
/* 主轴居中对齐 */
.container {
  display: flex;
  justify-content: center;
}
/* 项目均匀分布 */
.container {
  display: flex;
  justify-content: space-between;
}
/* 项目均匀分布，两端有间距 */
.container {
  display: flex;
  justify-content: space-around;
}
/* 项目均匀分布，两端和中间间距相等 */
.container {
  display: flex;
  justify-content: space-evenly;
}
```

### 2.3 align-items

`align-items` 属性定义了弹性项目在侧轴上的对齐方式。

| 值           | 描述                       |
| ------------ | -------------------------- |
| `stretch`    | 项目拉伸以填充容器（默认） |
| `flex-start` | 项目对齐到侧轴的起始位置   |
| `flex-end`   | 项目对齐到侧轴的结束位置   |
| `center`     | 项目在侧轴上居中对齐       |
| `baseline`   | 项目以基线对齐             |

```css
/* 侧轴拉伸对齐（默认） */
.container {
  display: flex;
  align-items: stretch;
}
/* 侧轴起始对齐 */
.container {
  display: flex;
  align-items: flex-start;
}
/* 侧轴居中对齐 */
.container {
  display: flex;
  align-items: center;
}
/* 侧轴结束对齐 */
.container {
  display: flex;
  align-items: flex-end;
}
/* 基线对齐 */
.container {
  display: flex;
  align-items: baseline;
}
```

### 2.4 flex-wrap

`flex-wrap` 属性定义了弹性项目是否换行。

| 值             | 描述                             |
| -------------- | -------------------------------- |
| `nowrap`       | 不换行，项目在同一行（默认）     |
| `wrap`         | 换行，项目在多行显示             |
| `wrap-reverse` | 换行，项目在多行显示，但顺序相反 |

```css
/* 不换行（默认） */
.container {
  display: flex;
  flex-wrap: nowrap;
}
/* 换行 */
.container {
  display: flex;
  flex-wrap: wrap;
}
/* 反向换行 */
.container {
  display: flex;
  flex-wrap: wrap-reverse;
}
```

### 2.5 flex-flow

`flex-flow` 是 `flex-direction` 和 `flex-wrap` 的复合属性。

```css
/* 水平方向，不换行（默认） */
.container {
  display: flex;
  flex-flow: row nowrap;
}
/* 垂直方向，换行 */
.container {
  display: flex;
  flex-flow: column wrap;
}
```

### 2.6 align-content

`align-content` 属性定义了多行弹性项目在侧轴上的对齐方式。仅在 `flex-wrap: wrap` 或 `flex-wrap: wrap-reverse` 时有效。

| 值              | 描述                         |
| --------------- | ---------------------------- |
| `stretch`       | 多行拉伸以填充容器（默认）   |
| `flex-start`    | 多行对齐到侧轴的起始位置     |
| `flex-end`      | 多行对齐到侧轴的结束位置     |
| `center`        | 多行在侧轴上居中对齐         |
| `space-between` | 多行之间均匀分布，两端对齐   |
| `space-around`  | 多行之间均匀分布，两端有间距 |

```css
/* 多行拉伸对齐（默认） */
.container {
  display: flex;
  flex-wrap: wrap;
  align-content: stretch;
}
/* 多行居中对齐 */
.container {
  display: flex;
  flex-wrap: wrap;
  align-content: center;
}
/* 多行均匀分布 */
.container {
  display: flex;
  flex-wrap: wrap;
  align-content: space-between;
}
```

## 3. 项目属性

### 3.1 flex-grow

`flex-grow` 属性定义了弹性项目的放大比例，默认为 0。

```css
/* 项目不放大（默认） */
.item {
  flex-grow: 0;
}
/* 项目放大比例为 1 */
.item {
  flex-grow: 1;
}
/* 不同项目的放大比例 */
.item-1 {
  flex-grow: 1;
}
.item-2 {
  flex-grow: 2;
}
.item-3 {
  flex-grow: 1;
}
```

### 3.2 flex-shrink

`flex-shrink` 属性定义了弹性项目的缩小比例，默认为 1。

```css
/* 项目可以缩小（默认） */
.item {
  flex-shrink: 1;
}
/* 项目不可缩小 */
.item {
  flex-shrink: 0;
}
/* 不同项目的缩小比例 */
.item-1 {
  flex-shrink: 1;
}
.item-2 {
  flex-shrink: 2;
}
.item-3 {
  flex-shrink: 1;
}
```

### 3.3 flex-basis

`flex-basis` 属性定义了弹性项目的初始大小，默认为 `auto`。

```css
/* 初始大小为 auto（默认） */
.item {
  flex-basis: auto;
}
/* 初始大小为 200px */
.item {
  flex-basis: 200px;
}
/* 初始大小为 50% */
.item {
  flex-basis: 50%;
}
```

### 3.4 flex

`flex` 是 `flex-grow`、`flex-shrink` 和 `flex-basis` 的复合属性。

```css
/* 默认值：0 1 auto */
.item {
  flex: 0 1 auto;
}
/* 推荐使用：等比分配空间 */
.item {
  flex: 1;
}
/* 不缩小，初始大小为 200px */
.item {
  flex: 0 0 200px;
}
/* 放大比例为 2，缩小比例为 1，初始大小为 100px */
.item {
  flex: 2 1 100px;
}
```

### 3.5 align-self

`align-self` 属性定义了单个弹性项目在侧轴上的对齐方式，覆盖容器的 `align-items` 属性。

| 值           | 描述                                  |
| ------------ | ------------------------------------- |
| `auto`       | 继承容器的 `align-items` 属性（默认） |
| `stretch`    | 项目拉伸以填充容器                    |
| `flex-start` | 项目对齐到侧轴的起始位置              |
| `flex-end`   | 项目对齐到侧轴的结束位置              |
| `center`     | 项目在侧轴上居中对齐                  |
| `baseline`   | 项目以基线对齐                        |

```css
/* 继承容器的 align-items 属性（默认） */
.item {
  align-self: auto;
}
/* 单个项目在侧轴上居中对齐 */
.item {
  align-self: center;
}
/* 单个项目在侧轴上起始对齐 */
.item {
  align-self: flex-start;
}
/* 单个项目在侧轴上结束对齐 */
.item {
  align-self: flex-end;
}
```

### 3.6 order

`order` 属性定义了弹性项目的排列顺序，默认为 0。值越小，排列越靠前。

```css
/* 默认顺序 */
.item {
  order: 0;
}
/* 不同项目的顺序 */
.item-1 {
  order: 3;
}
.item-2 {
  order: 1;
}
.item-3 {
  order: 2;
}
```

## 4. 常见应用场景

### 4.1 垂直水平居中

```css
/* 垂直水平居中 */
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
}
.item {
  width: 100px;
  height: 100px;
  background-color: #3498db;
}
```

### 4.2 等高布局

```css
/* 等高布局 */
.container {
  display: flex;
}
.item {
  flex: 1;
  padding: 20px;
  border: 1px solid #ddd;
  margin: 10px;
}
```

### 4.3 导航菜单

```css
/* 导航菜单 */
.nav {
  display: flex;
  justify-content: space-between;
  background-color: #333;
  padding: 10px;
}
.nav__logo {
  color: white;
  font-size: 20px;
  font-weight: bold;
}
.nav__menu {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
}
.nav__item {
  margin-left: 20px;
}
.nav__link {
  color: white;
  text-decoration: none;
  padding: 5px 10px;
  transition: color 0.3s ease;
}
.nav__link:hover {
  color: #3498db;
}
```

### 4.4 卡片布局

```css
/* 卡片布局 */
.card-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  padding: 20px;
}
.card {
  flex: 1 1 300px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
}
.card__title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
}
.card__content {
  color: #666;
  line-height: 1.5;
}
```

### 4.5 响应式布局

```css
/* 响应式布局 */
.container {
  display: flex;
  flex-wrap: wrap;
}
.item {
  flex: 1 1 200px;
  margin: 10px;
  padding: 20px;
  background-color: #f0f0f0;
  border-radius: 4px;
}
@media (max-width: 768px) {
  .item {
    flex: 1 1 100%;
  }
}
```

### 4.6 表单布局

```css
/* 表单布局 */
.form {
  display: flex;
  flex-direction: column;
  gap: 15px;
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
}
.form__group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.form__label {
  font-weight: bold;
  color: #333;
}
.form__input {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}
.form__button {
  padding: 10px 20px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}
.form__button:hover {
  background-color: #2980b9;
}
```

### 4.7 网格系统

```css
/* 网格系统 */
.grid {
  display: flex;
  flex-wrap: wrap;
  margin: -10px;
}
.grid__item {
  flex: 1 1 25%;
  padding: 10px;
  box-sizing: border-box;
}
.grid__content {
  background-color: #f0f0f0;
  padding: 20px;
  border-radius: 4px;
  height: 100%;
}
@media (max-width: 992px) {
  .grid__item {
    flex: 1 1 33.333%;
  }
}
@media (max-width: 768px) {
  .grid__item {
    flex: 1 1 50%;
  }
}
@media (max-width: 480px) {
  .grid__item {
    flex: 1 1 100%;
  }
}
```

## 5. 响应式设计

### 5.1 媒体查询与 Flexbox

Flexbox 与媒体查询结合使用，可以创建响应式布局。

```css
/* 基础布局 */
.container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}
.item {
  flex: 1 1 300px;
}
/* 响应式调整 */
@media (max-width: 992px) {
  .item {
    flex: 1 1 250px;
  }
}
@media (max-width: 768px) {
  .item {
    flex: 1 1 100%;
  }
}
@media (max-width: 480px) {
  .container {
    flex-direction: column;
  }
  .item {
    flex: 1 1 auto;
  }
}
```

### 5.2 响应式导航示例

```css
/* 响应式导航 */
.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #333;
  padding: 10px 20px;
}
.nav__logo {
  color: white;
  font-size: 20px;
  font-weight: bold;
}
.nav__menu {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
}
.nav__item {
  margin-left: 20px;
}
.nav__link {
  color: white;
  text-decoration: none;
  padding: 5px 10px;
  transition: color 0.3s ease;
}
.nav__link:hover {
  color: #3498db;
}
/* 移动端菜单按钮 */
.nav__toggle {
  display: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
}
/* 响应式调整 */
@media (max-width: 768px) {
  .nav__toggle {
    display: block;
  }
  .nav__menu {
    position: absolute;
    top: 60px;
    left: 0;
    width: 100%;
    background-color: #333;
    flex-direction: column;
    align-items: center;
    padding: 20px 0;
    display: none;
  }
  .nav__menu.active {
    display: flex;
  }
  .nav__item {
    margin: 10px 0;
  }
}
```

## 6. 性能优化

### 6.1 减少重排

- **避免频繁修改布局属性**：尽量一次性修改多个属性，减少浏览器重排次数。
- **使用 transform 代替 top/left**：transform 不会触发重排，性能更好。
- **使用 will-change**：提前告知浏览器元素可能发生变化，优化渲染。

```css
/* 优化前 */
.item {
  position: relative;
  left: 0;
  transition: left 0.3s ease;
}
.item:hover {
  left: 10px;
}
/* 优化后 */
.item {
  will-change: transform;
  transition: transform 0.3s ease;
}
.item:hover {
  transform: translateX(10px);
}
```

### 6.2 合理使用属性

- **优先使用 flex 复合属性**：`flex: 1` 比单独设置 `flex-grow`, `flex-shrink`, `flex-basis` 更简洁。
- **避免过度嵌套**：减少 flex 容器的嵌套层级，提高渲染性能。
- **合理设置 flex-basis**：使用百分比或固定值，避免使用 `auto` 导致的计算开销。

## 7. 浏览器兼容性

### 7.1 支持情况

Flexbox 在现代浏览器中得到了广泛支持，但在一些旧版本浏览器中可能需要使用前缀。

| 浏览器  | 支持情况       |
| ------- | -------------- |
| Chrome  | 29+            |
| Firefox | 28+            |
| Safari  | 9+             |
| Edge    | 12+            |
| IE      | 10+ (部分支持) |

### 7.2 前缀使用

在一些旧版本浏览器中，需要使用厂商前缀。

```css
/* 带前缀的 Flexbox */
.container {
  display: -webkit-flex; /* Safari */
  display: flex;
  -webkit-flex-direction: row; /* Safari */
  flex-direction: row;
  -webkit-justify-content: center; /* Safari */
  justify-content: center;
  -webkit-align-items: center; /* Safari */
  align-items: center;
}
.item {
  -webkit-flex: 1; /* Safari */
  flex: 1;
}
```

## 8. 最佳实践

### 8.1 代码组织

- **按功能组织**：将相关的样式放在一起。
- **使用注释**：为不同的部分添加注释。
- **模块化**：将样式按模块分离。

### 8.2 命名规范

推荐使用 BEM (Block, Element, Modifier) 命名规范：

```css
/* Block */
.nav {
  display: flex;
  /* 导航样式 */
}
/* Element */
.nav__menu {
  display: flex;
  /* 菜单样式 */
}
/* Modifier */
.nav--responsive {
  /* 响应式导航样式 */
}
```

### 8.3 常见问题与解决方案

#### 问题 1：Flex 项目溢出容器

**解决方案**：使用 `flex-wrap: wrap` 或设置合理的 `flex-basis`。

#### 问题 2：IE 浏览器兼容性

**解决方案**：使用厂商前缀，避免使用一些高级特性。

#### 问题 3：垂直居中对齐问题

**解决方案**：使用 `align-items: center` 或 `align-self: center`。

#### 问题 4：Flex 项目大小不一致

**解决方案**：使用 `flex: 1` 或设置相同的 `flex-basis`。

## 9. 实际应用示例

### 9.1 示例 1：网站头部布局

```html
<header class="header">
  <div class="header__logo">Logo</div>
  <nav class="header__nav">
    <ul class="nav__menu">
      <li class="nav__item"><a href="#" class="nav__link">首页</a></li>
      <li class="nav__item"><a href="#" class="nav__link">关于我们</a></li>
      <li class="nav__item"><a href="#" class="nav__link">产品</a></li>
      <li class="nav__item"><a href="#" class="nav__link">联系我们</a></li>
    </ul>
  </nav>
  <div class="header__actions">
    <button class="button">登录</button>
    <button class="button button--primary">注册</button>
  </div>
</header>
```

```css
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background-color: #f8f9fa;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.header__logo {
  font-size: 24px;
  font-weight: bold;
  color: #3498db;
}
.nav__menu {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
}
.nav__item {
  margin-left: 20px;
}
.nav__link {
  color: #333;
  text-decoration: none;
  padding: 5px 10px;
  transition: color 0.3s ease;
}
.nav__link:hover {
  color: #3498db;
}
.header__actions {
  display: flex;
  gap: 10px;
}
.button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
  transition: all 0.3s ease;
}
.button--primary {
  background-color: #3498db;
  color: white;
  border-color: #3498db;
}
.button:hover {
  opacity: 0.9;
}
@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  .nav__menu {
    flex-direction: column;
    width: 100%;
  }
  .nav__item {
    margin: 5px 0;
  }
  .header__actions {
    width: 100%;
    justify-content: space-between;
  }
}
```

### 9.2 示例 2：产品卡片网格

```html
<div class="products">
  <div class="product-card">
    <div class="product-card__image">
      <img src="product1.jpg" alt="Product 1" />
    </div>
    <div class="product-card__content">
      <h3 class="product-card__title">产品 1</h3>
      <p class="product-card__description">这是产品 1 的描述</p>
      <div class="product-card__footer">
        <span class="product-card__price">¥100</span>
        <button class="product-card__button">加入购物车</button>
      </div>
    </div>
  </div>
  <div class="product-card">
    <div class="product-card__image">
      <img src="product2.jpg" alt="Product 2" />
    </div>
    <div class="product-card__content">
      <h3 class="product-card__title">产品 2</h3>
      <p class="product-card__description">这是产品 2 的描述</p>
      <div class="product-card__footer">
        <span class="product-card__price">¥200</span>
        <button class="product-card__button">加入购物车</button>
      </div>
    </div>
  </div>
  <div class="product-card">
    <div class="product-card__image">
      <img src="product3.jpg" alt="Product 3" />
    </div>
    <div class="product-card__content">
      <h3 class="product-card__title">产品 3</h3>
      <p class="product-card__description">这是产品 3 的描述</p>
      <div class="product-card__footer">
        <span class="product-card__price">¥300</span>
        <button class="product-card__button">加入购物车</button>
      </div>
    </div>
  </div>
  <div class="product-card">
    <div class="product-card__image">
      <img src="product4.jpg" alt="Product 4" />
    </div>
    <div class="product-card__content">
      <h3 class="product-card__title">产品 4</h3>
      <p class="product-card__description">这是产品 4 的描述</p>
      <div class="product-card__footer">
        <span class="product-card__price">¥400</span>
        <button class="product-card__button">加入购物车</button>
      </div>
    </div>
  </div>
</div>
```

```css
.products {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  padding: 20px;
}
.product-card {
  flex: 1 1 250px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}
.product-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
}
.product-card__image {
  height: 200px;
  overflow: hidden;
}
.product-card__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}
.product-card:hover .product-card__image img {
  transform: scale(1.05);
}
.product-card__content {
  padding: 20px;
}
.product-card__title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
  color: #333;
}
.product-card__description {
  color: #666;
  line-height: 1.5;
  margin-bottom: 15px;
}
.product-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.product-card__price {
  font-size: 20px;
  font-weight: bold;
  color: #e74c3c;
}
.product-card__button {
  padding: 8px 16px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}
.product-card__button:hover {
  background-color: #2980b9;
}
@media (max-width: 768px) {
  .product-card {
    flex: 1 1 100%;
  }
}
```

### 9.3 示例 3：页脚布局

```html
<footer class="footer">
  <div class="footer__container">
    <div class="footer__section">
      <h3 class="footer__title">关于我们</h3>
      <p class="footer__text">这是关于我们的描述，介绍公司的历史、使命和愿景。</p>
    </div>
    <div class="footer__section">
      <h3 class="footer__title">快速链接</h3>
      <ul class="footer__links">
        <li><a href="#" class="footer__link">首页</a></li>
        <li><a href="#" class="footer__link">关于我们</a></li>
        <li><a href="#" class="footer__link">产品</a></li>
        <li><a href="#" class="footer__link">联系我们</a></li>
      </ul>
    </div>
    <div class="footer__section">
      <h3 class="footer__title">联系我们</h3>
      <ul class="footer__contact">
        <li>电话：123-456-7890</li>
        <li>邮箱：info@example.com</li>
        <li>地址：北京市朝阳区</li>
      </ul>
    </div>
  </div>
  <div class="footer__bottom">
    <p class="footer__copyright">2026 公司名称. 保留所有权利.</p>
  </div>
</footer>
```

```css
.footer {
  background-color: #333;
  color: white;
  padding: 40px 20px;
}
.footer__container {
  display: flex;
  flex-wrap: wrap;
  gap: 40px;
  max-width: 1200px;
  margin: 0 auto;
}
.footer__section {
  flex: 1 1 250px;
}
.footer__title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 20px;
  color: #3498db;
}
.footer__text {
  line-height: 1.5;
  margin-bottom: 20px;
}
.footer__links {
  list-style: none;
  margin: 0;
  padding: 0;
}
.footer__links li {
  margin-bottom: 10px;
}
.footer__link {
  color: white;
  text-decoration: none;
  transition: color 0.3s ease;
}
.footer__link:hover {
  color: #3498db;
}
.footer__contact {
  list-style: none;
  margin: 0;
  padding: 0;
}
.footer__contact li {
  margin-bottom: 10px;
  line-height: 1.5;
}
.footer__bottom {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #555;
  text-align: center;
}
.footer__copyright {
  font-size: 14px;
  color: #999;
}
@media (max-width: 768px) {
  .footer__section {
    flex: 1 1 100%;
  }
}
```

## 10. 总结

Flexbox 是一种强大的一维布局模型，具有以下优势：

- **简单易用**：通过简洁的属性即可实现复杂的布局。
- **灵活响应**：轻松创建响应式布局，适应不同屏幕尺寸。
- **对齐方便**：提供多种对齐方式，解决传统布局的对齐问题。
- **空间分配**：智能分配项目之间的空间，实现均匀分布。
- **等高布局**：默认实现等高效果，无需额外设置。
  Flexbox 的核心概念包括：
- **弹性容器**：通过 `display: flex` 创建。
- **弹性项目**：容器的直接子元素。
- **主轴与侧轴**：控制项目的排列方向。
- **容器属性**：控制整体布局，如 `flex-direction`, `justify-content`, `align-items` 等。
- **项目属性**：控制单个项目的行为，如 `flex-grow`, `flex-shrink`, `flex-basis` 等。
  通过掌握 Flexbox，开发者可以更加灵活地控制页面布局，创建美观、响应式的网页设计。Flexbox 不仅简化了布局代码，还提高了开发效率，是现代前端开发中不可或缺的布局工具。

---

### 更新日志 (Changelog)

- 2026-04-05: 体系化整合 Flexbox 布局属性与实战技巧。
- 2026-04-06: 扩写详细内容，增加响应式设计、性能优化、浏览器兼容性、实际应用示例等章节。
