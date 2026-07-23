---
order: 75
title: 关键渲染路径优化
module: css
category: CSS
difficulty: advanced
description: 关键CSS内联、异步加载
author: fanquanpp
updated: '2026-06-14'
related:
  - css/CSS原子化
  - css/CSS模块化
  - css/CSS原生嵌套
  - css/Canvas绘图
prerequisites:
  - css/概述与基本语法
---

## 1. 关键渲染路径

浏览器渲染流程：DOM → CSSOM → Render Tree → Layout → Paint → Composite

CSS 是渲染阻塞资源，必须优化加载策略。

## 2. 关键 CSS 内联

将首屏关键 CSS 内联到 `<head>` 中，消除渲染阻塞：

```html
<head>
  <style>
    /* 首屏关键 CSS */
    .hero {
      height: 100vh;
      background: #333;
      color: white;
    }
    .nav {
      position: fixed;
      top: 0;
      width: 100%;
    }
  </style>
</head>
```

## 3. 非关键 CSS 异步加载

```html
<!-- 方式1：preload + onload -->
<link rel="preload" href="styles.css" as="style" onload="this.rel='stylesheet'" />

<!-- 方式2：media 切换 -->
<link rel="stylesheet" href="styles.css" media="print" onload="this.media='all'" />

<!-- 方式3：noscript 回退 -->
<noscript><link rel="stylesheet" href="styles.css" /></noscript>
```

## 4. CSS 性能优化清单

| 优化项           | 说明                     |
| ---------------- | ------------------------ |
| 关键 CSS 内联    | 首屏 CSS 内联到 `<head>` |
| 非关键 CSS 异步  | 延迟加载非首屏样式       |
| 压缩 CSS         | 移除空格、注释、冗余     |
| 减少选择器复杂度 | 避免深层嵌套             |
| 避免使用 @import | 串行加载影响性能         |
| 使用 contain     | 限制渲染范围             |
| 使用 will-change | 提示浏览器优化           |
| 减少重排重绘     | 批量 DOM 操作            |

## 5. CSS contain 属性

```css
.widget {
  contain: layout style paint;
  /* 或简写 */
  contain: strict; /* size layout style paint */
  contain: content; /* layout style paint */
}
```

## 6. 性能测量

```bash
# Lighthouse
npx lighthouse https://example.com --view

# Chrome DevTools
# Performance → 录制 → 分析渲染时间
# Coverage → 查看 CSS 使用率
```
