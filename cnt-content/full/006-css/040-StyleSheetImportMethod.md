---
order: 40
title: 样式表引入方式
module: 'css'
category: 前端技术
difficulty: beginner
description: 内联、嵌入、外部、导入
author: fanquanpp
updated: '2026-09-12'
related:
  - 'css/140-PseudoClassPseudoElement'
  - 'css/170-PriorityCalculation'
  - 'css/060-MarginCollapse'
  - 'css/220-PositionDetailed'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
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

## 5. 动手实践：遮码自检

先只读任务与提示，遮住第 1、3 节的示例代码自己写，再对照参考实现。

**任务一**：用「外部文件 + 嵌入 + 内联」三种方式给同一个 `<p>` 写互相矛盾的颜色，并预测最终颜色与原因；再把外部文件里的颜色改写成 `@import` 引入的第二个文件，预测 Network 面板里两个请求的先后。

**任务二**：写一个首屏优化模板——`<head>` 里同时做到：首屏 hero 区样式立即可用、全站样式走缓存、非关键样式不阻塞首屏渲染。

**提示**：任务一考「层叠 + 引入方式」的合流：内联赢嵌入、嵌入赢外部（同优先级看源顺序与优先级），而 `@import` 的两个请求是串行的——第二个文件要等第一个文件下载解析完才发起；任务二是第 3 节「关键 CSS 内联」的默写，注意 `preload` 之后要把 `rel` 换回 `stylesheet`。

**参考实现**（先自己写完再看）：

```html
<!-- 任务一 -->
<head>
  <link rel="stylesheet" href="styles.css" />
  <style>
    p { color: blue; } /* 嵌入赢过外部文件中的同优先级规则 */
  </style>
</head>
<body>
  <p style="color: red;">内联赢过一切普通声明</p>
</body>
```

```css
/* styles.css 内部：改用 @import 引入第二个文件（串行，不推荐但要看懂瀑布图） */
@import url('more.css');
```

```html
<!-- 任务二 -->
<head>
  <style>
    .hero { height: 100vh; } /* 关键样式：内联立即生效 */
  </style>
  <link rel="preload" href="styles.css" as="style" onload="this.rel='stylesheet'" />
</head>
```

验收点：任务一最终颜色是红（内联），删掉内联后是蓝（嵌入在后）；Network 瀑布图里 `more.css` 的请求起点明显晚于 `styles.css` 完成解析——这就是「`@import` 串行阻塞」的可视化证据；任务二里漏写 `onload` 里的 `rel` 切换的话，`styles.css` 永远不会以样式表身份生效。

## 6. 核心知识点

> 一句话记住引入方式：外部 `<link>` 是标准，内联只调试，`@import` 会阻塞，关键样式可内联。

- 内联：优先级最高，无法复用；
- 嵌入：单页可用，无法跨页；
- 外部：可复用、可缓存，生产首选；
- `@import`：串行阻塞，避免使用；
- 首屏关键 CSS 可内联，其余用 `<link>` 或异步加载。

## 7. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 大量内联样式 | 无法复用、维护困难 | 抽取为类与外部文件 |
| 顶层 `@import` | 阻塞首屏渲染 | 用 `<link>` 或构建工具合并 |
| 样式文件过多 | 请求数膨胀 | 按页面/组件拆分并合并 |
| 关键样式外链 | 首屏等待 | 关键样式内联 |

## 8. 扩展学习

- 优先级：`css/170-PriorityCalculation`；
- 性能：`css/550-CriticalRenderPathOptimization`；
- 工程化：`css/590-PostCSS` 与构建工具的样式处理。
