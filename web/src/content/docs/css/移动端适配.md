---
order: 63
title: 移动端适配
module: css
category: CSS
difficulty: intermediate
description: rem、vw、vh、clamp
author: fanquanpp
updated: '2026-06-14'
related:
  - css/媒体查询
  - css/容器查询
  - css/函数
  - css/CSS变量与自定义属性
prerequisites:
  - css/概述与基本语法
---

## 1. 适配单位

| 单位   | 参照物         | 特点     |
| ------ | -------------- | -------- |
| `rem`  | 根元素字体大小 | 全局缩放 |
| `em`   | 父元素字体大小 | 局部缩放 |
| `vw`   | 视口宽度 1%    | 响应视口 |
| `vh`   | 视口高度 1%    | 响应视口 |
| `vmin` | 视口较小边 1%  | 适配短边 |

## 2. rem 适配

```css
html {
  font-size: 62.5%;
} /* 1rem = 10px */
body {
  font-size: 1.6rem;
} /* 16px */
```

## 3. vw 适配

```css
/* 设计稿 375px，元素 100px → 100/375*100 = 26.67vw */
.element {
  width: 26.67vw;
}
```

## 4. clamp() 函数

```css
h1 {
  font-size: clamp(1.5rem, 5vw, 3rem);
}
.container {
  width: clamp(300px, 80vw, 1200px);
}
```

$$
\text{font-size} = \text{clamp}(\text{min}, \text{preferred}, \text{max})
$$

## 5. 安全区域与1px边框

```css
.header {
  padding-top: env(safe-area-inset-top);
}
.border-1px::after {
  content: '';
  position: absolute;
  bottom: 0;
  width: 100%;
  height: 1px;
  background: #ccc;
  transform: scaleY(0.5);
}
```

## 6. dvh 单位

```css
.full-screen {
  height: 100dvh;
} /* 动态视口高度，解决移动端 vh 问题 */
```
