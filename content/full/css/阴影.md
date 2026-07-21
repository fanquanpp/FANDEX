---
order: 58
title: 阴影
module: css
category: CSS
difficulty: beginner
description: 'box-shadow、text-shadow'
author: fanquanpp
updated: '2026-06-14'
related:
  - css/层叠上下文
  - css/渐变
  - css/背景增强
  - css/Grid网格布局
prerequisites:
  - css/概述与基本语法
---

## 1. box-shadow

```css
box-shadow: offset-x offset-y blur-radius spread-radius color inset;
```

```css
.box {
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3);
}
.box {
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}
.box {
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.07),
    0 2px 4px rgba(0, 0, 0, 0.07),
    0 4px 8px rgba(0, 0, 0, 0.07);
}
```

## 2. text-shadow

```css
.text {
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}
.neon {
  text-shadow:
    0 0 7px #fff,
    0 0 42px #0fa,
    0 0 82px #0fa;
}
```

## 3. 实战效果

```css
.card {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  transition: box-shadow 0.3s;
}
.card:hover {
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
}

.elevation-1 {
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.12),
    0 1px 2px rgba(0, 0, 0, 0.24);
}
.elevation-2 {
  box-shadow:
    0 3px 6px rgba(0, 0, 0, 0.16),
    0 3px 6px rgba(0, 0, 0, 0.23);
}
```

## 4. drop-shadow 滤镜

```css
.icon {
  filter: drop-shadow(2px 4px 6px rgba(0, 0, 0, 0.3));
}
```

box-shadow 沿盒子形状，drop-shadow 沿元素实际轮廓（适合 PNG 图标）。
