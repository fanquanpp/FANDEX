---
order: 130
title: SVG CSS 样式化
module: 'svg'
category: 前端技术
difficulty: intermediate
description: 内联样式、style 标签、外部 CSS、CSS 变量、伪类与媒体查询。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'svg/070-SVGColorFill'
  - 'svg/120-SVGSymbolReuse'
  - 'svg/140-SVGAnimationBasics'
prerequisites:
  - 'svg/070-SVGColorFill'
---

---

> 前置知识：颜色与填充属性（《SVG 颜色与填充》，007-SVGColorFill）、CSS 选择器与变量基础。
>
> 学习目标：掌握"表现属性 < CSS 规则 < inline style"这条 SVG 特有的级联规则；知道哪些 SVG 属性能被 CSS 控制（含 SVG 2 几何属性）；会用 CSS 变量、伪类、媒体查询给 SVG 做状态与主题；理解四种嵌入方式对 CSS 的影响。

## 1. 样式优先级

SVG 元素样式的来源与 HTML 一致，都走 CSS 级联（cascade）规则。完整优先序从低到高：

1. 浏览器默认样式
2. **表现属性**（presentation attributes，如 `fill="..."`）：参与级联但特殊性（specificity）为 0，任何作者 CSS 规则都能覆盖它——这是 SVG 与 HTML 最大的差异点
3. 作者 CSS：外部样式表与 `<style>` 内部样式同属作者来源，**没有天然的谁高谁低**，按特殊性、再按文档顺序决胜
4. 元素的 `style` 属性（inline style）
5. `!important` 声明（作者 !important 会压过普通 inline style）

```html
<svg viewBox="0 0 200 100">
  <style>
    .box {
      fill: #4f5bd5;
    } /* 内部样式 */
  </style>
  <!-- fill 表现属性被 .box 规则覆盖，实际显示 #4f5bd5 -->
  <rect class="box" width="100" height="50" fill="#d63031" />
  <!-- style 属性(inline)又压过 .box，显示 #00b894 -->
  <rect class="box" style="fill: #00b894" width="100" height="50" />
</svg>
```

> **注意**：表现属性的优先级**低于任何 CSS 规则**，这是与 HTML 不同的地方。调试"颜色改不动"的问题时，先检查是不是有 CSS 规则压过了 SVG 属性。

## 2. 三种样式声明方式

### 2.1 表现属性

直接写在元素上的属性：

```html
<rect x="10" y="10" width="80" height="50" fill="#4f5bd5" stroke="#000" stroke-width="2" />
```

优势：简单直观；劣势：无法响应状态变化，难以复用。

### 2.2 内部 style 标签

```html
<svg viewBox="0 0 200 100">
  <style>
    .primary {
      fill: #4f5bd5;
      stroke: #fff;
      stroke-width: 2;
    }
    .danger {
      fill: #d63031;
    }
    text {
      font-family: sans-serif;
    }
  </style>
  <rect class="primary" x="10" y="10" width="80" height="50" />
  <rect class="danger" x="110" y="10" width="80" height="50" />
</svg>
```

### 2.3 外部 CSS

```html
<!-- svg.css -->
.rect-primary { fill: #4f5bd5; } .rect-danger { fill: #d63031; }
```

```html
<link rel="stylesheet" href="svg.css" />
<svg viewBox="0 0 200 100">
  <rect class="rect-primary" width="100" height="50" />
</svg>
```

> 外部 CSS 仅在内联 SVG 或 `<object>` 嵌入时生效；`<img>` 引用的 SVG 无法被外部 CSS 样式化。

## 3. CSS 可控制的 SVG 属性

| 类别         | 属性                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| 填充         | `fill`、`fill-opacity`、`fill-rule`                                                                                      |
| 描边         | `stroke`、`stroke-width`、`stroke-opacity`、`stroke-linecap`、`stroke-linejoin`、`stroke-dasharray`、`stroke-dashoffset` |
| 几何（部分） | `cx`、`cy`、`r`、`x`、`y`、`width`、`height`（SVG 2 几何属性，现代浏览器支持；`d` 的 CSS 化目前仅 Chromium）             |
| 文本         | `font-family`、`font-size`、`font-weight`、`text-anchor`、`letter-spacing`                                               |
| 视觉         | `opacity`、`visibility`、`display`、`filter`、`clip-path`、`mask`                                                        |
| 变换         | `transform`、`transform-origin`、`transform-box`                                                                         |
| 其他         | `color`、`cursor`、`pointer-events`                                                                                      |

### 3.1 示例

```css
.icon {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.icon-primary {
  color: #4f5bd5;
}
.icon-danger {
  color: #d63031;
}
.icon-lg {
  width: 48px;
  height: 48px;
}
```

```html
<svg class="icon icon-primary icon-lg" viewBox="0 0 24 24">
  <path d="M3 12 L12 3 L21 12 M5 10 V21 H19 V10" />
</svg>
```

## 4. CSS 变量

SVG 完全支持 CSS 自定义属性，实现主题化。

```html
<style>
  :root {
    --brand-primary: #4f5bd5;
    --brand-secondary: #00b894;
    --brand-danger: #d63031;
  }
  .logo {
    fill: var(--brand-primary);
  }
  .accent {
    fill: var(--brand-secondary);
  }

  .dark-theme {
    --brand-primary: #8b92e8;
    --brand-secondary: #4cd9b0;
  }
</style>

<svg viewBox="0 0 200 100">
  <rect class="logo" width="100" height="50" />
  <rect class="accent" y="50" width="100" height="50" />
</svg>
```

切换父元素的 class 即可联动所有 SVG 颜色。

### 4.1 在 use 中穿透

CSS 变量可穿透 `<use>` 的 shadow DOM：

```html
<symbol id="card" viewBox="0 0 100 50">
  <rect width="100" height="50" fill="var(--card-bg)" />
  <text x="50" y="30" text-anchor="middle" fill="var(--card-text)">CARD</text>
</symbol>

<svg width="100" height="50">
  <use href="#card" style="--card-bg: #4f5bd5; --card-text: #fff" />
</svg>
```

## 5. 伪类与状态

SVG 元素支持 CSS 伪类，实现交互效果。

```css
.btn-rect {
  fill: #4f5bd5;
  transition: fill 0.2s;
  cursor: pointer;
}
.btn-rect:hover {
  fill: #6b78ea;
}
.btn-rect:active {
  fill: #3a47b8;
}
.btn-rect:focus-visible {
  outline: 2px solid #4f5bd5;
  outline-offset: 4px;
}
```

```html
<svg viewBox="0 0 200 80">
  <rect class="btn-rect" x="20" y="20" width="160" height="40" rx="20" tabindex="0" />
  <text x="100" y="44" text-anchor="middle" fill="#fff" pointer-events="none">按钮</text>
</svg>
```

### 5.1 pointer-events

```css
.label {
  pointer-events: none;
} /* 让点击穿透到下层 */
.btn {
  pointer-events: all;
} /* 显式响应事件 */
```

| 值               | 说明                    |
| ---------------- | ----------------------- |
| `visiblePainted` | **默认值**：可见且被填充/描边的区域响应事件 |
| `all`            | 无论是否可见、是否上色都响应 |
| `none`           | 不响应事件（穿透）      |
| `fill`           | 仅填充区域响应（不论可见性） |
| `stroke`         | 仅描边区域响应（不论可见性） |

> 完整取值还有 `visibleFill` / `visibleStroke` / `visible` / `painted` 等，都是"可见性 × 上色区域"两个维度的组合。

## 6. 媒体查询

SVG 内部支持响应式样式。

```html
<svg viewBox="0 0 400 200">
  <style>
    .title {
      font-size: 32px;
    }
    .subtitle {
      display: block;
    }

    @media (max-width: 600px) {
      .title {
        font-size: 20px;
      }
      .subtitle {
        display: none;
      }
    }

    @media (prefers-color-scheme: dark) {
      .bg {
        fill: #1a1a1a;
      }
      .text {
        fill: #fff;
      }
    }
  </style>
  <rect class="bg" width="400" height="200" fill="#fff" />
  <text class="title text" x="200" y="80" text-anchor="middle">主标题</text>
  <text class="subtitle text" x="200" y="120" text-anchor="middle">副标题</text>
</svg>
```

### 6.1 prefers-reduced-motion

```css
.animated {
  animation: spin 2s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .animated {
    animation: none;
  }
}
```

尊重用户系统偏好，禁用动画。

> **视口归属提醒**：SVG 内部的媒体查询以"该 SVG 自己的视口"为基准——内联在 HTML 里时就是浏览器视口；但通过 `<img>` / `<object>` / CSS background 引用时，基准是这张图被分配到的尺寸。同一个文件，两种嵌入方式可能命中不同的媒体查询分支。

## 7. transition 过渡

```css
rect {
  fill: #4f5bd5;
  transition:
    fill 0.3s ease,
    transform 0.3s ease;
}
rect:hover {
  fill: #00b894;
  transform: scale(1.1);
  transform-origin: center;
  transform-box: fill-box;
}
```

可过渡的属性：颜色、opacity、transform、几何属性（部分）。

## 8. 主题切换实战

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      :root {
        --bg: #fff;
        --text: #333;
        --card-bg: #f5f5f5;
        --brand: #4f5bd5;
      }
      [data-theme='dark'] {
        --bg: #1a1a1a;
        --text: #eee;
        --card-bg: #2a2a2a;
        --brand: #8b92e8;
      }
      body {
        background: var(--bg);
        color: var(--text);
        transition:
          background 0.3s,
          color 0.3s;
      }
      .chart-bar {
        fill: var(--brand);
        transition: fill 0.3s;
      }
    </style>
  </head>
  <body data-theme="light">
    <svg viewBox="0 0 400 200">
      <rect class="chart-bar" x="20" y="50" width="40" height="150" />
      <rect class="chart-bar" x="80" y="80" width="40" height="120" />
      <rect class="chart-bar" x="140" y="20" width="40" height="180" />
    </svg>
    <button
      onclick="document.body.dataset.theme = document.body.dataset.theme === 'light' ? 'dark' : 'light'"
    >
      切换主题
    </button>
  </body>
</html>
```

切换 `data-theme` 即可联动 SVG 与全局样式。

## 9. 嵌入方式对 CSS 的影响

| 嵌入方式       | 外部 CSS | 内部 style | 表现属性 |
| -------------- | -------- | ---------- | -------- |
| inline SVG     | √        | √          | √        |
| `<object>`     | ×        | √          | √        |
| `<img>`        | ×        | √          | √        |
| CSS background | ×        | √          | √        |

> 仅 inline SVG 可被外部 CSS 完全控制，其他方式需要 SVG 文件内部自带样式。独立 `.svg` 文件想引用外部样式表，可在文件开头写处理指令 `<?xml-stylesheet href="svg.css" type="text/css"?>`，独立打开或 `<object>` 加载时生效；`<img>` 与 CSS background 属于"SVG 作为图片"的安全模式，浏览器禁止其加载任何外部资源，该指令不会生效。

## 10. 实战：响应式数据条

```html
<svg viewBox="0 0 400 200" class="chart">
  <style>
    .bar {
      fill: var(--bar-color, #4f5bd5);
      transition:
        fill 0.3s,
        height 0.5s;
    }
    .bar:hover {
      fill: var(--bar-hover, #00b894);
    }

    @media (prefers-color-scheme: dark) {
      .axis {
        stroke: #666;
      }
      .label {
        fill: #ccc;
      }
    }
    .axis {
      stroke: #333;
    }
    .label {
      fill: #666;
      font-size: 12px;
    }
  </style>

  <line class="axis" x1="40" y1="180" x2="380" y2="180" />
  <rect class="bar" x="60" y="50" width="40" height="130" />
  <text class="label" x="80" y="195" text-anchor="middle">Q1</text>

  <rect class="bar" x="120" y="80" width="40" height="100" />
  <text class="label" x="140" y="195" text-anchor="middle">Q2</text>

  <rect class="bar" x="180" y="20" width="40" height="160" />
  <text class="label" x="200" y="195" text-anchor="middle">Q3</text>
</svg>
```

## 11. 调试技巧

Chrome 开发者工具中：

- Elements 面板可直接编辑 SVG 属性
- Computed 标签可查看最终计算的 fill/stroke 值
- Animations 面板可调试 SVG 动画

```css
/* 调试时高亮所有 path */
path {
  stroke: red !important;
  stroke-width: 1 !important;
}
```

## 小结

初学者要点：

- 记住一条铁律：**表现属性的优先级低于任何 CSS 规则**。CSS 里随手一条 `rect { fill: red }` 就能覆盖所有 `fill="blue"`，排查样式不生效时先看这里。
- inline（内联）SVG 才能被页面 CSS 控制；`<img>` / CSS background 是"封存的图片"，只能依赖文件内部的 `<style>`。
- 换色的两条通道：`currentColor` 跟随文字颜色，`var(--x)` 显式传变量；`<use>` 的影子树同样只认这两条通道。

进阶注意：

- 外部样式表与 `<style>` 没有固定高下，按特殊性 + 文档顺序决胜；`!important` 的作者规则会压过 inline style。
- SVG 内部媒体查询的基准视口随嵌入方式变化（页面视口 vs 图片自身尺寸），响应式 SVG 在 `<img>` 场景下的行为要单独验证。
- `pointer-events` 默认值是 `visiblePainted`；`fill="none"` 的透明区域默认收不到点击，做可点击热区时要么给形状上色，要么叠一层 `pointer-events: all` 的透明命中区。

