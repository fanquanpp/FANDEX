---
order: 55
title: 浮动与清除
module: css
category: CSS
difficulty: beginner
description: float、clear
author: fanquanpp
updated: '2026-06-14'
related:
  - css/margin合并与塌陷
  - css/定位详解
  - css/层叠上下文
  - css/渐变
prerequisites:
  - css/概述与基本语法
---

## 1. float 属性

```css
img {
  float: left;
  margin-right: 1rem;
}
```

| 值      | 说明           |
| ------- | -------------- |
| `left`  | 左浮动         |
| `right` | 右浮动         |
| `none`  | 不浮动（默认） |

浮动特性：脱离文档流但不脱离文本流；尽量靠左/右排列。

## 2. 清除浮动

### 父元素高度塌陷问题

```css
/* 方式1：clearfix */
.clearfix::after {
  content: '';
  display: block;
  clear: both;
}

/* 方式2：BFC */
.container {
  overflow: hidden;
}

/* 方式3：flow-root（推荐） */
.container {
  display: flow-root;
}
```

## 3. 现代替代方案

```css
/*  旧方式 */
.sidebar {
  float: left;
  width: 25%;
}

/*  新方式 */
.layout {
  display: flex;
}
.sidebar {
  width: 25%;
}
```

浮动仍适用于：文字环绕图片。
