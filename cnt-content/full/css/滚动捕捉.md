---
order: 68
title: 滚动捕捉
module: css
category: CSS
difficulty: intermediate
description: 'scroll-snap'
author: fanquanpp
updated: '2026-06-14'
related:
  - css/层叠层
  - css/逻辑属性
  - css/Sass预处理器
  - css/Less与Stylus
prerequisites:
  - css/概述与基本语法
---

## 1. scroll-snap 概述

CSS 滚动捕捉允许创建类似轮播图的滚动效果，滚动停止时自动对齐到指定位置。

## 2. 容器属性

```css
.scroll-container {
  scroll-snap-type: x mandatory; /* 方向 + 严格度 */
  overflow-x: auto;
}
```

### scroll-snap-type

| 方向   | 说明     |
| ------ | -------- |
| `x`    | 水平捕捉 |
| `y`    | 垂直捕捉 |
| `both` | 双向捕捉 |

| 严格度      | 说明               |
| ----------- | ------------------ |
| `mandatory` | 必须捕捉（强对齐） |
| `proximity` | 接近时捕捉（默认） |

## 3. 子元素属性

```css
.scroll-item {
  scroll-snap-align: start; /* 对齐方式 */
  scroll-snap-stop: always; /* 停止行为 */
}
```

### scroll-snap-align

| 值       | 说明         |
| -------- | ------------ |
| `start`  | 对齐容器起始 |
| `center` | 对齐容器中心 |
| `end`    | 对齐容器结束 |

### scroll-snap-stop

| 值       | 说明             |
| -------- | ---------------- |
| `normal` | 可以跳过（默认） |
| `always` | 必须停止         |

## 4. 实战：轮播图

```css
.carousel {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding: 0 20px;
}

.carousel-item {
  flex: 0 0 100%;
  scroll-snap-align: center;
}
```

## 5. 实战：全屏滚动

```css
.fullpage {
  height: 100vh;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
}

.fullpage-section {
  height: 100vh;
  scroll-snap-align: start;
}
```

## 6. scroll-margin 和 scroll-padding

```css
/* 捕捉偏移 */
.snap-item {
  scroll-margin: 80px;
} /* 元素偏移 */
.container {
  scroll-padding: 80px;
} /* 容器偏移 */
```
