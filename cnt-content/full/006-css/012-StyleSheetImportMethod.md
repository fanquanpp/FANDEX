---
order: 120
title: 样式表引入方式
module: 'css'
category: 前端技术
difficulty: beginner
description: 内联、嵌入、外部、导入
author: fanquanpp
updated: '2026-09-08'
related:
  - 'css/024-PseudoClassPseudoElement'
  - 'css/010-PriorityCalculation'
  - 'css/014-MarginCollapse'
  - 'css/015-PositionDetailed'
prerequisites:
  - 'css/002-CSS3OverviewBasicSyntax'
---

## 0. 直觉：样式“怎么端上桌”

CSS 有四种“上桌方式”：直接塞进标签（内联）、写在页面里（嵌入）、放在独立文件（外部）、在 CSS 里再引 CSS（@import）。

记住一句口诀：能用外部就用外部，能不用 `@import` 就不用 `@import`。内联只在调试或动态注入时用。


## 1. 四种引入方式

### 内联样式

```html
<p style="color: red;">内联样式</p>
```

优先级最高、无法复用、不推荐。

**讲解：** 样式写在 `style` 属性里，只能作用于当前元素，且无法被选择器覆盖（除非 `!important`），适合临时调试。

### 嵌入样式

```html
<style>
  p {
    color: blue;
  }
</style>
```

仅当前页面有效、无法缓存。

**讲解：** `<style>` 写在 `<head>` 中，页面内所有元素可用；单页项目方便，多页面无法复用。

### 外部样式表

```html
<link rel="stylesheet" href="styles.css" />
```

可复用、可缓存、**推荐方式**。

**讲解：** `<link>` 引入独立样式文件，浏览器会缓存它，多个页面共享；生产环境的标准做法。

### @import 导入

```css
@import url('reset.css');
```

串行加载（性能差）、避免在顶层使用。

**讲解：** `@import` 在 CSS 解析时才发起请求，会阻塞渲染；现代打包工具（Vite/Webpack）会自动合并 CSS，无需手写。

## 2. 对比

| 方式    | 复用性 | 缓存 | 性能 | 推荐度     |
| ------- | ------ | ---- | ---- | ---------- |
| 内联    | 无     | 无   | 差   | 低         |
| 嵌入    | 单页   | 无   | 中   | 中         |
| 外部    | 多页   | 有   | 好   | 极高       |
| @import | 多页   | 有   | 差   | 中         |

## 3. 关键 CSS 内联

```html
<head>
  <style>
    .hero {
      height: 100vh;
    }
  </style>
  <link rel="preload" href="styles.css" as="style" onload="this.rel='stylesheet'" />
</head>
```

**讲解：** 首屏关键样式（如 `.hero`）内联到 `<head>` 立即生效；非关键样式用 `preload` + `onload` 异步加载，兼顾首屏速度与缓存。

## 4. 动手试试

1. 用四种方式分别给 `p` 设置不同颜色，刷新观察优先级；
2. 新建 `styles.css` 并用 `<link>` 引入，确认浏览器 Network 面板出现该文件请求；
3. 把 `<link>` 改成 `@import` 放在样式文件顶部，对比加载顺序（Network 瀑布图）；
4. 进阶挑战：用 `preload` + `onload` 异步加载非关键样式。

## 5. 核心知识点

> 一句话记住引入方式：外部 `<link>` 是标准，内联只调试，`@import` 会阻塞，关键样式可内联。

- 内联：优先级最高，无法复用；
- 嵌入：单页可用，无法跨页；
- 外部：可复用、可缓存，生产首选；
- `@import`：串行阻塞，避免使用；
- 首屏关键 CSS 可内联，其余用 `<link>` 或异步加载。

## 6. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 大量内联样式 | 无法复用、维护困难 | 抽取为类与外部文件 |
| 顶层 `@import` | 阻塞首屏渲染 | 用 `<link>` 或构建工具合并 |
| 样式文件过多 | 请求数膨胀 | 按页面/组件拆分并合并 |
| 关键样式外链 | 首屏等待 | 关键样式内联 |

## 7. 扩展学习

- 优先级：`css/010-PriorityCalculation`；
- 性能：`css/061-CriticalRenderPathOptimization`；
- 工程化：`css/057-PostCSS` 与构建工具的样式处理。
