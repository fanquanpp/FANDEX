---
order: 64
title: 函数
module: css
category: CSS
difficulty: intermediate
description: calc、min、max、clamp
author: fanquanpp
updated: '2026-06-14'
related:
  - css/容器查询
  - css/移动端适配
  - css/CSS变量与自定义属性
  - css/特性查询
prerequisites:
  - css/概述与基本语法
---

## 1. calc() 函数

```css
.element {
  width: calc(100% - 60px);
}
.element {
  height: calc(50vh - 2rem);
}
.element {
  font-size: calc(16px + 0.5vw);
}
```

规则：可以混合不同单位；运算符前后必须有空格；可以嵌套。

## 2. min() 函数

```css
.element {
  width: min(50vw, 400px);
} /* 取较小值 */
```

## 3. max() 函数

```css
.element {
  width: max(50vw, 300px);
} /* 取较大值 */
```

## 4. clamp() 函数

```css
h1 {
  font-size: clamp(1.5rem, 5vw, 3rem);
}
```

等价于：

```css
h1 {
  font-size: 1.5rem;
  font-size: max(1.5rem, min(5vw, 3rem));
}
```

## 5. 其他 CSS 函数

```css
.element {
  width: var(--width, 100%); /* 自定义属性 */
  transform: translateX(50px); /* 变换 */
  filter: blur(5px); /* 滤镜 */
  color: color-mix(in srgb, red 50%, blue); /* 颜色混合 */
}
```
