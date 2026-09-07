---
order: 170
title: SVG 图标与可访问性
module: 'svg'
category: 前端技术
difficulty: intermediate
description: 图标系统设计、aria 属性、屏幕阅读器支持与无障碍最佳实践。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'svg/012-SVGSymbolReuse'
  - 'svg/014-SVGCSSStyling'
  - 'svg/016-SVGResponsivePerformance'
prerequisites:
  - 'svg/012-SVGSymbolReuse'
---

## 1. 为什么用 SVG 图标

| 维度     | SVG 图标     | 字体图标（如 Font Awesome） | PNG 图标 |
| -------- | ------------ | --------------------------- | -------- |
| 缩放     | 无损         | 无损                        | 锯齿     |
| 颜色     | CSS 控制     | CSS 控制（有限）            | 固定     |
| 可访问性 | 原生支持     | 一般                        | 需 alt   |
| 文件体积 | 小（单图标） | 中（整包）                  | 大       |
| 动画     | 支持         | 有限                        | 不支持   |
| 语义化   | DOM 节点     | 字符                        | 图片     |

SVG 是现代 Web 图标的首选方案。

## 2. 图标设计原则

### 2.1 统一画布

所有图标使用相同 viewBox（通常 24×24）：

```html
<symbol id="icon-home" viewBox="0 0 24 24">...</symbol>
<symbol id="icon-search" viewBox="0 0 24 24">...</symbol>
```

### 2.2 描边一致

```html
<symbol id="icon-home" viewBox="0 0 24 24">
  <path
    d="..."
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</symbol>
```

统一描边宽度、端点、拐角，保持视觉一致性。

### 2.3 使用 currentColor

```html
<!-- 错误：硬编码颜色 -->
<symbol id="icon-home">
  <path fill="#4f5bd5" />
</symbol>

<!-- 正确：使用 currentColor -->
<symbol id="icon-home">
  <path fill="currentColor" />
</symbol>
```

`currentColor` 让图标颜色继承父元素 `color`，实现主题化。

### 2.4 对齐像素网格

```html
<!-- 模糊：坐标落在 .5 -->
<path d="M 0.5 0.5 L 10.5 0.5" />

<!-- 清晰：整数坐标 -->
<path d="M 0 0 L 10 0" />
```

1px 描边的图标需对齐像素网格，避免抗锯齿模糊。

## 3. 图标系统实现

### 3.1 Sprite 模式

```html
<!-- icons.svg 隐藏文件 -->
<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
  <symbol id="icon-home" viewBox="0 0 24 24">
    <path
      d="M3 12 L12 3 L21 12 M5 10 V21 H19 V10"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </symbol>
  <symbol id="icon-search" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2" />
    <line
      x1="16"
      y1="16"
      x2="21"
      y2="21"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    />
  </symbol>
  <symbol id="icon-user" viewBox="0 0 24 24">
    <circle cx="12" cy="8" r="4" fill="currentColor" />
    <path
      d="M4 20 C4 16 8 14 12 14 C16 14 20 16 20 20"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    />
  </symbol>
</svg>
```

### 3.2 使用图标

```html
<svg class="icon" aria-hidden="true">
  <use href="#icon-home" />
</svg>
```

```css
.icon {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}
```

### 3.3 尺寸变体

```css
.icon-sm {
  width: 16px;
  height: 16px;
}
.icon-md {
  width: 24px;
  height: 24px;
}
.icon-lg {
  width: 32px;
  height: 32px;
}
.icon-xl {
  width: 48px;
  height: 48px;
}
```

```html
<svg class="icon icon-sm"><use href="#icon-home" /></svg>
<svg class="icon icon-lg"><use href="#icon-home" /></svg>
```

### 3.4 颜色变体

```css
.icon-primary {
  color: #4f5bd5;
}
.icon-success {
  color: #00b894;
}
.icon-danger {
  color: #d63031;
}
.icon-warning {
  color: #f9a825;
}
```

```html
<button class="btn">
  <svg class="icon icon-danger"><use href="#icon-delete" /></svg>
  删除
</button>
```

## 4. 可访问性基础

### 4.1 装饰性图标

纯装饰图标应隐藏于屏幕阅读器：

```html
<svg class="icon" aria-hidden="true">
  <use href="#icon-decorative" />
</svg>
```

`aria-hidden="true"` 让屏幕阅读器跳过此元素。

### 4.2 语义图标

传递信息的图标需提供替代文本：

```html
<svg class="icon" role="img" aria-label="搜索">
  <use href="#icon-search" />
</svg>

<!-- 或使用 title -->
<svg class="icon" role="img" aria-labelledby="search-title">
  <title id="search-title">搜索</title>
  <use href="#icon-search" />
</svg>
```

### 4.3 交互图标

可点击的图标需有合适语义：

```html
<button class="icon-btn" aria-label="关闭">
  <svg class="icon" aria-hidden="true">
    <use href="#icon-close" />
  </svg>
</button>
```

`aria-label` 在按钮上，SVG 本身 `aria-hidden`，避免重复朗读。

## 5. role 属性

| role 值        | 用途                           |
| -------------- | ------------------------------ |
| `img`          | 图像（需 aria-label 或 title） |
| `button`       | 按钮（通常外层用 `<button>`）  |
| `presentation` | 仅为展示，无语义               |
| `none`         | 等价于 presentation            |

```html
<!-- 图表作为整体图像 -->
<svg role="img" aria-labelledby="chart-title chart-desc">
  <title id="chart-title">2024 季度销售额</title>
  <desc id="chart-desc">柱状图展示 Q1-Q4 销售额，Q3 最高 210 万</desc>
  <!-- 图表内容 -->
</svg>
```

## 6. focus 与键盘导航

可交互的 SVG 元素需支持键盘操作：

```html
<svg class="icon-btn" role="button" tabindex="0" aria-label="菜单" id="menu-btn">
  <use href="#icon-menu" />
</svg>

<script>
  const btn = document.getElementById('menu-btn');
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleMenu();
    }
  });
  btn.addEventListener('click', toggleMenu);
</script>
```

### 6.1 focus 样式

```css
.icon-btn:focus-visible {
  outline: 2px solid #4f5bd5;
  outline-offset: 4px;
  border-radius: 4px;
}
```

`:focus-visible` 仅在键盘聚焦时显示，鼠标点击不显示。

## 7. prefers-reduced-motion

```css
.animated-icon {
  animation: spin 2s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .animated-icon {
    animation: none;
  }
}
```

尊重用户的系统偏好，禁用动画。

## 8. 颜色对比度

图标颜色需满足 WCAG 对比度要求：

| 文本类型        | 最小对比度（WCAG AA） |
| --------------- | --------------------- |
| 正常文本        | 4.5:1                 |
| 大文本（18pt+） | 3:1                   |
| 图标与图形      | 3:1                   |

```css
/* 检查对比度 */
.icon-primary {
  color: #4f5bd5; /* 对比度 4.8:1（白底） */
}

/* 错误：对比度不足 */
.icon-low-contrast {
  color: #ccc; /* 对比度 1.6:1 */
}
```

## 9. 图标按钮组件

```html
<button class="btn-icon btn-icon-danger" aria-label="删除项目">
  <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
    <path
      d="M3 6 H21 M8 6 V4 H16 V6 M6 6 L7 20 H17 L18 6"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</button>

<style>
  .btn-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
    transition: background 0.2s;
  }
  .btn-icon:hover {
    background: rgba(0, 0, 0, 0.05);
  }
  .btn-icon:focus-visible {
    outline: 2px solid #4f5bd5;
    outline-offset: 2px;
  }
  .btn-icon-danger {
    color: #d63031;
  }
  .btn-icon-danger:hover {
    background: rgba(214, 48, 49, 0.1);
  }
  .icon {
    width: 20px;
    height: 20px;
  }
</style>
```

## 10. 动态图标

### 10.1 加载状态

```html
<svg class="icon icon-spin" viewBox="0 0 24 24" aria-label="加载中" role="img">
  <path
    d="M12 2 A10 10 0 0 1 22 12"
    fill="none"
    stroke="currentColor"
    stroke-width="3"
    stroke-linecap="round"
  />
</svg>

<style>
  .icon-spin {
    animation: spin 1s linear infinite;
    transform-origin: center;
    transform-box: fill-box;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
```

### 10.2 状态切换

```html
<button class="btn-toggle" aria-pressed="false" id="like-btn">
  <svg class="icon" viewBox="0 0 24 24">
    <path
      class="heart-outline"
      d="M12 21 L4 13 C2 11 2 8 4 6 C6 4 9 4 12 7 C15 4 18 4 20 6 C22 8 22 11 20 13 Z"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    />
    <path
      class="heart-fill"
      d="M12 21 L4 13 C2 11 2 8 4 6 C6 4 9 4 12 7 C15 4 18 4 20 6 C22 8 22 11 20 13 Z"
      fill="currentColor"
    />
  </svg>
</button>

<style>
  .btn-toggle .heart-fill {
    display: none;
  }
  .btn-toggle[aria-pressed='true'] .heart-outline {
    display: none;
  }
  .btn-toggle[aria-pressed='true'] .heart-fill {
    display: block;
  }
  .btn-toggle[aria-pressed='true'] {
    color: #d63031;
  }
</style>

<script>
  const btn = document.getElementById('like-btn');
  btn.addEventListener('click', () => {
    const pressed = btn.getAttribute('aria-pressed') === 'true';
    btn.setAttribute('aria-pressed', !pressed);
  });
</script>
```

`aria-pressed` 表示按钮按下状态，配合 CSS 切换图标。

## 11. 图标命名规范

```
icon-{category}-{name}
```

| 命名                  | 含义          |
| --------------------- | ------------- |
| `icon-action-home`    | 操作类 - 首页 |
| `icon-action-search`  | 操作类 - 搜索 |
| `icon-media-play`     | 媒体类 - 播放 |
| `icon-media-pause`    | 媒体类 - 暂停 |
| `icon-status-success` | 状态类 - 成功 |
| `icon-status-error`   | 状态类 - 错误 |
| `icon-nav-menu`       | 导航类 - 菜单 |
| `icon-nav-close`      | 导航类 - 关闭 |

## 12. 图标集管理

### 12.1 目录结构

```
src/
  assets/
    icons/
      action/
        home.svg
        search.svg
      media/
        play.svg
        pause.svg
      status/
        success.svg
        error.svg
  sprite/
    icons.svg       # 构建生成的 sprite
    icons.ts        # TypeScript 声明
```

### 12.2 构建脚本

```javascript
// scripts/build-icons.js
const fs = require('fs');
const path = require('path');
const { optimize } = require('svgo');

const iconsDir = path.join(__dirname, '../src/assets/icons');
const outputPath = path.join(__dirname, '../src/sprite/icons.svg');

function buildSprite() {
  const symbols = [];
  function walk(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (item.endsWith('.svg')) {
        const name = path.basename(item, '.svg');
        const content = fs.readFileSync(fullPath, 'utf8');
        const optimized = optimize(content, {
          plugins: [{ name: 'preset-default' }, { name: 'removeDimensions' }],
        }).data;
        // 提取内容并转为 symbol
        const inner = optimized.replace(/<svg[^>]*>|<\/svg>/g, '');
        symbols.push(`<symbol id="icon-${name}" viewBox="0 0 24 24">${inner}</symbol>`);
      }
    }
  }
  walk(iconsDir);
  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${symbols.join('')}</svg>`;
  fs.writeFileSync(outputPath, sprite);
  console.log(`Built ${symbols.length} icons`);
}

buildSprite();
```

## 13. 实战：完整的图标按钮系统

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      .icon {
        width: 24px;
        height: 24px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
      }
      .btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border: 1px solid #ddd;
        border-radius: 8px;
        background: #fff;
        color: #333;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }
      .btn:hover {
        background: #f5f5f5;
        border-color: #ccc;
      }
      .btn:focus-visible {
        outline: 2px solid #4f5bd5;
        outline-offset: 2px;
      }
      .btn-primary {
        background: #4f5bd5;
        border-color: #4f5bd5;
        color: #fff;
      }
      .btn-primary:hover {
        background: #3a47b8;
      }
      .btn-danger {
        color: #d63031;
        border-color: #d63031;
      }
      .btn-danger:hover {
        background: #fbe9e7;
      }
      .btn-icon-only {
        padding: 8px;
      }
    </style>
  </head>
  <body>
    <svg style="display:none">
      <symbol id="icon-plus" viewBox="0 0 24 24">
        <path d="M12 5 V19 M5 12 H19" stroke-linecap="round" />
      </symbol>
      <symbol id="icon-trash" viewBox="0 0 24 24">
        <path
          d="M3 6 H21 M8 6 V4 H16 V6 M6 6 L7 20 H17 L18 6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </symbol>
      <symbol id="icon-check" viewBox="0 0 24 24">
        <path d="M5 12 L10 17 L19 8" stroke-linecap="round" stroke-linejoin="round" />
      </symbol>
    </svg>

    <button class="btn btn-primary">
      <svg class="icon" aria-hidden="true"><use href="#icon-plus" /></svg>
      新建项目
    </button>

    <button class="btn btn-danger btn-icon-only" aria-label="删除">
      <svg class="icon" aria-hidden="true"><use href="#icon-trash" /></svg>
    </button>

    <button class="btn" aria-pressed="false" id="check-btn">
      <svg class="icon" aria-hidden="true"><use href="#icon-check" /></svg>
      标记完成
    </button>

    <script>
      document.getElementById('check-btn').addEventListener('click', function () {
        const pressed = this.getAttribute('aria-pressed') === 'true';
        this.setAttribute('aria-pressed', !pressed);
      });
    </script>
  </body>
</html>
```

下一篇以综合项目串联所有知识点。
## 图标定义

**symbol 定义图标**
`<symbol id="<icon-id>" viewBox="0 0 24 24">...</symbol>`
```html
<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
  <!-- 统一 24x24 画布,所有图标共用 viewBox -->
  <symbol id="icon-home" viewBox="0 0 24 24">
    <path
      d="M3 12 L12 3 L21 12 M5 10 V21 H19 V10"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </symbol>
  <symbol id="icon-search" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2" />
    <line
      x1="16"
      y1="16"
      x2="21"
      y2="21"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    />
  </symbol>
  <symbol id="icon-user" viewBox="0 0 24 24">
    <circle cx="12" cy="8" r="4" fill="currentColor" />
    <path
      d="M4 20 C4 16 8 14 12 14 C16 14 20 16 20 20"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    />
  </symbol>
</svg>
```

### symbol 元素属性表

| 属性 | 说明 | 示例 |
| --- | --- | --- |
| `id` | 唯一标识符(被 use 引用) | `icon-home` |
| `viewBox` | 视口坐标系 | `0 0 24 24` |
| `width` | 宽度(通常省略,由 use 控制) | `24` |
| `height` | 高度(通常省略,由 use 控制) | `24` |
| `fill` | 默认填充 | `none` |
| `stroke` | 默认描边 | `currentColor` |

---

## 图标使用

**use 引用图标**
`<svg class="<类>" aria-hidden="true"><use href="#<icon-id>" /></svg>`
```html
<svg class="icon" aria-hidden="true">
  <use href="#icon-home" />
</svg>
```

```css
.icon {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}
```

### use 元素属性表

| 属性 | 说明 | 示例 |
| --- | --- | --- |
| `href` | 引用 symbol 的 id | `#icon-home` |
| `x` | x 坐标偏移 | `0` |
| `y` | y 坐标偏移 | `0` |
| `width` | 宽度(覆盖 symbol) | `24` |
| `height` | 高度(覆盖 symbol) | `24` |

---

## 尺寸变体

**图标尺寸 CSS**
`.<size-class> { width: <px>; height: <px>; }`
```css
.icon-sm { width: 16px; height: 16px; }
.icon-md { width: 24px; height: 24px; }
.icon-lg { width: 32px; height: 32px; }
.icon-xl { width: 48px; height: 48px; }
```

```html
<svg class="icon icon-sm"><use href="#icon-home" /></svg>
<svg class="icon icon-md"><use href="#icon-home" /></svg>
<svg class="icon icon-lg"><use href="#icon-home" /></svg>
<svg class="icon icon-xl"><use href="#icon-home" /></svg>
```

---

## 颜色变体 currentColor

**currentColor 主题化**
`<element fill="currentColor" [stroke]="currentColor" />`
```html
<!-- 使用 currentColor,颜色继承父元素 color -->
<symbol id="icon-home" viewBox="0 0 24 24">
  <path fill="currentColor" stroke="currentColor" />
</symbol>
```

```css
.icon-primary { color: #4f5bd5; }
.icon-success { color: #00b894; }
.icon-danger { color: #d63031; }
.icon-warning { color: #f9a825; }
```

```html
<button class="btn">
  <svg class="icon icon-danger"><use href="#icon-delete" /></svg>
  删除
</button>
```

---

## 描边一致性

**统一描边属性**
`<path stroke-width="<width>" stroke-linecap="<cap>" stroke-linejoin="<join>" />`
```html
<symbol id="icon-edit" viewBox="0 0 24 24">
  <path
    d="M3 17.25 V21 H6.75 L17.81 9.94 L14.06 6.19 L3 17.25 Z"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</symbol>
```

### 描边属性表

| 属性 | 说明 | 可选值 |
| --- | --- | --- |
| `stroke-width` | 描边宽度 | `2`(像素,统一) |
| `stroke-linecap` | 线段端点样式 | `butt` / `round` / `square` |
| `stroke-linejoin` | 拐角连接样式 | `miter` / `round` / `bevel` |

---

## 像素网格对齐

**整数坐标对齐**
`<path d="M <int> <int> L <int> <int>" />`
```html
<!-- 清晰:整数坐标 -->
<path d="M 0 0 L 10 0" stroke-width="1" />

<!-- 模糊:坐标落在 .5(抗锯齿) -->
<path d="M 0.5 0.5 L 10.5 0.5" stroke-width="1" />
```

---

## 装饰性图标 aria-hidden

**纯装饰图标隐藏**
`<svg aria-hidden="true">...</svg>`
```html
<svg class="icon" aria-hidden="true">
  <use href="#icon-decorative" />
</svg>
```

`aria-hidden="true"` 让屏幕阅读器跳过此元素,适用于纯装饰图标。

---

## 语义图标 aria-label

**带替代文本的图标**
`<svg role="img" aria-label="<文本>">...</svg>`
```html
<svg class="icon" role="img" aria-label="搜索">
  <use href="#icon-search" />
</svg>
```

**title 子元素提供标签**
`<svg role="img" aria-labelledby="<title-id>"><title id="...">...</title>...</svg>`
```html
<svg class="icon" role="img" aria-labelledby="search-title">
  <title id="search-title">搜索</title>
  <use href="#icon-search" />
</svg>
```

---

## 交互图标按钮

**可点击图标按钮**
`<button aria-label="<文本>"><svg aria-hidden="true">...</svg></button>`
```html
<button class="icon-btn" aria-label="关闭">
  <svg class="icon" aria-hidden="true">
    <use href="#icon-close" />
  </svg>
</button>
```

`aria-label` 放在外层 button 上,SVG 本身 `aria-hidden`,避免重复朗读。

---

## role 属性

**SVG role 语义**
`<svg role="<role-value>" aria-labelledby="<id1> [<id2>]">`
```html
<svg role="img" aria-labelledby="chart-title chart-desc">
  <title id="chart-title">2024 季度销售额</title>
  <desc id="chart-desc">柱状图展示 Q1-Q4 销售额,Q3 最高 210 万</desc>
  <!-- 图表内容 -->
</svg>
```

### role 取值表

| role 值 | 用途 |
| --- | --- |
| `img` | 图像(需 aria-label 或 title) |
| `button` | 按钮(通常外层用 `<button>`) |
| `presentation` | 仅为展示,无语义 |
| `none` | 等价于 presentation |
| `graphics-document` | 图形文档(SVG 2) |
| `graphics-symbol` | 图形符号(SVG 2) |

---

## desc 元素描述

**desc 长描述**
`<svg><title>...</title><desc>...</desc>...</svg>`
```html
<svg viewBox="0 0 200 200" role="img" aria-labelledby="t d">
  <title id="t">销售趋势图</title>
  <desc id="d">折线图显示 2024 年 1-12 月销售额变化</desc>
  <polyline points="20,150 50,120 80,140 110,90 140,110 170,70" />
</svg>
```

---

## tabindex 与键盘导航

**可聚焦 SVG**
`<svg role="button" tabindex="0" aria-label="<文本>" id="<id>">`
```html
<svg class="icon-btn" role="button" tabindex="0" aria-label="菜单" id="menu-btn">
  <use href="#icon-menu" />
</svg>

<script>
  const btn = document.getElementById('menu-btn');
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleMenu();
    }
  });
  btn.addEventListener('click', toggleMenu);
</script>
```

---

## focus 可见样式

**focus-visible 样式**
`<selector>:focus-visible { outline: <style> <color> <width>; outline-offset: <px>; }`
```css
.icon-btn:focus-visible {
  outline: 2px solid #4f5bd5;
  outline-offset: 4px;
  border-radius: 4px;
}
```

`:focus-visible` 仅在键盘聚焦时显示轮廓,鼠标点击不显示。

---

## prefers-reduced-motion

**禁用动画媒体查询**
`@media (prefers-reduced-motion: reduce) { <selector> { animation: none; } }`
```css
.animated-icon {
  animation: spin 2s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .animated-icon {
    animation: none;
  }
}
```

---

## aria-pressed 状态切换

**按钮按下状态**
`<button aria-pressed="<bool>" id="<id>">...</button>`
```html
<button class="btn-toggle" aria-pressed="false" id="like-btn">
  <svg class="icon" viewBox="0 0 24 24">
    <path
      class="heart-outline"
      d="M12 21 L4 13 C2 11 2 8 4 6 C6 4 9 4 12 7 C15 4 18 4 20 6 C22 8 22 11 20 13 Z"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    />
    <path
      class="heart-fill"
      d="M12 21 L4 13 C2 11 2 8 4 6 C6 4 9 4 12 7 C15 4 18 4 20 6 C22 8 22 11 20 13 Z"
      fill="currentColor"
    />
  </svg>
</button>

<style>
  .btn-toggle .heart-fill { display: none; }
  .btn-toggle[aria-pressed='true'] .heart-outline { display: none; }
  .btn-toggle[aria-pressed='true'] .heart-fill { display: block; }
  .btn-toggle[aria-pressed='true'] { color: #d63031; }
</style>

<script>
  const btn = document.getElementById('like-btn');
  btn.addEventListener('click', () => {
    const pressed = btn.getAttribute('aria-pressed') === 'true';
    btn.setAttribute('aria-pressed', !pressed);
  });
</script>
```

### aria 状态属性表

| 属性 | 说明 | 取值 |
| --- | --- | --- |
| `aria-pressed` | 按钮按下状态 | `true` / `false` / `mixed` |
| `aria-expanded` | 展开/折叠状态 | `true` / `false` |
| `aria-hidden` | 对辅助技术隐藏 | `true` / `false` |
| `aria-label` | 可访问名称 | 任意字符串 |
| `aria-labelledby` | 引用 ID 作为名称 | `id [id2 ...]` |
| `aria-describedby` | 引用 ID 作为描述 | `id [id2 ...]` |
| `aria-disabled` | 禁用状态 | `true` / `false` |

---

## 加载动画图标

**旋转加载图标**
`<svg class="<spin-class>" [aria-label]="..." [role]="img">`
```html
<svg class="icon icon-spin" viewBox="0 0 24 24" aria-label="加载中" role="img">
  <path
    d="M12 2 A10 10 0 0 1 22 12"
    fill="none"
    stroke="currentColor"
    stroke-width="3"
    stroke-linecap="round"
  />
</svg>

<style>
  .icon-spin {
    animation: spin 1s linear infinite;
    transform-origin: center;
    transform-box: fill-box;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
```

---

## 图标按钮组件

**完整图标按钮**
`<button class="btn-icon <variant>" aria-label="<文本>"><svg class="icon" aria-hidden="true">...</svg></button>`
```html
<button class="btn-icon btn-icon-danger" aria-label="删除项目">
  <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
    <path
      d="M3 6 H21 M8 6 V4 H16 V6 M6 6 L7 20 H17 L18 6"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</button>

<style>
  .btn-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
    transition: background 0.2s;
  }
  .btn-icon:hover { background: rgba(0, 0, 0, 0.05); }
  .btn-icon:focus-visible {
    outline: 2px solid #4f5bd5;
    outline-offset: 2px;
  }
  .btn-icon-danger { color: #d63031; }
  .btn-icon-danger:hover { background: rgba(214, 48, 49, 0.1); }
  .icon { width: 20px; height: 20px; }
</style>
```

---

## 颜色对比度属性

**主题色对比度**
`<selector> { color: <hex>; }`
```css
/* 对比度 4.8:1(白底),满足 WCAG AA */
.icon-primary { color: #4f5bd5; }

/* 对比度 1.6:1(白底),不满足 WCAG AA */
.icon-low-contrast { color: #ccc; }
```

### WCAG 对比度要求表

| 文本类型 | 最小对比度(WCAG AA) |
| --- | --- |
| 正常文本 | 4.5:1 |
| 大文本(18pt+) | 3:1 |
| 图标与图形 | 3:1 |

---

## 图标 sprite 模式

**SVG sprite 定义**
`<svg xmlns="..." style="display:none"><symbol id="..." viewBox="...">...</symbol>...</svg>`
```html
<!-- 隐藏的 sprite 文件,所有图标集中定义 -->
<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
  <symbol id="icon-home" viewBox="0 0 24 24">
    <path d="..." fill="none" stroke="currentColor" stroke-width="2" />
  </symbol>
  <symbol id="icon-search" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2" />
  </symbol>
</svg>

<!-- 通过 use 引用 -->
<svg class="icon"><use href="#icon-home" /></svg>
```

---

## currentColor 与 CSS 变量穿透

**主题切换**
`<symbol id="..."><path fill="var(--icon-color)" /></symbol>`
```html
<symbol id="icon-themed" viewBox="0 0 24 24">
  <path
    d="M12 2 L15 9 L22 9 L17 14 L19 21 L12 17 L5 21 L7 14 L2 9 L9 9 Z"
    fill="var(--icon-color, currentColor)"
  />
</symbol>
```

```css
:root {
  --icon-color: #4f5bd5;
}
.dark-theme {
  --icon-color: #7c89ff;
}
```

---

## SVG title 与 desc 元素

**结构化描述**
`<svg><title>...</title><desc>...</desc>...</svg>`
```html
<svg viewBox="0 0 100 100" role="img" aria-labelledby="icon-t icon-d">
  <title id="icon-t">警告</title>
  <desc id="icon-d">黄色三角形带感叹号,表示警告状态</desc>
  <polygon points="50,10 90,90 10,90" fill="#f9a825" />
  <text x="50" y="70" text-anchor="middle" font-size="40" fill="#fff">!</text>
</svg>
```

### title 与 desc 属性表

| 元素 | 用途 | 必需属性 |
| --- | --- | --- |
| `<title>` | 简短可访问名称 | `id`(配合 aria-labelledby) |
| `<desc>` | 详细描述 | `id`(配合 aria-describedby) |
