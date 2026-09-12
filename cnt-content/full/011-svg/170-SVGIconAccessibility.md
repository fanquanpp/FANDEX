---
order: 170
title: SVG 图标与可访问性
module: 'svg'
category: 前端技术
difficulty: intermediate
description: 图标系统设计、aria 属性、屏幕阅读器支持与无障碍最佳实践。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'svg/120-SVGSymbolReuse'
  - 'svg/130-SVGCSSStyling'
  - 'svg/160-SVGResponsivePerformance'
prerequisites:
  - 'svg/120-SVGSymbolReuse'
---
## 前置知识

建议先阅读以下内容再进入本文：

- [SVG 符号与复用](/svg/120-SVGSymbolReuse)

---

> 前置知识：symbol / use 复用机制（《SVG 符号与复用》，012-SVGSymbolReuse）与 CSS 变量穿透（《SVG CSS 样式化》，014-SVGCSSStyling）。
>
> 学习目标：能按"装饰 / 语义 / 交互"三类给图标配齐无障碍属性（aria-hidden、role、aria-label、title/desc）；掌握 currentColor 主题化与像素网格对齐两条图标设计铁律；会搭一套从源文件到 sprite 的图标工程链路。

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
<!-- 1:1 渲染时锐利:1px 描边落在半像素坐标(与像素边界重合) -->
<path d="M 0.5 0.5 L 10.5 0.5" stroke-width="1" />

<!-- 2px 及以上描边、填充形状边缘:用整数坐标 -->
<path d="M 0 0 L 10 0" stroke-width="2" />
```

细描边图标需关注像素网格:1px 描边在 1:1 渲染下落在半像素坐标最锐利,填充边缘则优先整数坐标(原理见《SVG 坐标系统与 viewBox》的抗锯齿一节)。图标常以 16/24/32 等多种尺寸渲染,最终以目标尺寸的实际显示效果为准。

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

### 5.1 title 与 desc：SVG 内建的无障碍描述

`<title>` 提供简短名称、`<desc>` 提供长描述，两者是 SVG 规范原生的可访问性机制；配合 `aria-labelledby` / `aria-describedby` 引用其 id 后，各屏幕阅读器朗读行为更一致（仅裸放 `<title>` 时，部分浏览器会把它渲染成悬停提示，朗读支持参差）。

```html
<svg viewBox="0 0 100 100" role="img" aria-labelledby="icon-t icon-d">
  <title id="icon-t">警告</title>
  <desc id="icon-d">黄色三角形带感叹号，表示警告状态</desc>
  <polygon points="50,10 90,90 10,90" fill="#f9a825" />
  <text x="50" y="70" text-anchor="middle" font-size="40" fill="#fff">!</text>
</svg>
```

| 元素      | 用途           | 配合属性            |
| --------- | -------------- | ------------------- |
| `<title>` | 简短可访问名称 | `id` + `aria-labelledby` |
| `<desc>`  | 详细描述       | `id` + `aria-describedby` |

### 5.2 常用 ARIA 属性速查

| 属性               | 说明             | 取值               |
| ------------------ | ---------------- | ------------------ |
| `aria-hidden`      | 对辅助技术隐藏   | `true` / `false`   |
| `aria-label`       | 可访问名称       | 任意字符串         |
| `aria-labelledby`  | 引用 id 作为名称 | `id [id2 ...]`     |
| `aria-describedby` | 引用 id 作为描述 | `id [id2 ...]`     |
| `aria-pressed`     | 按钮按下状态     | `true`/`false`/`mixed` |
| `aria-expanded`    | 展开/折叠状态    | `true` / `false`   |
| `aria-disabled`    | 禁用状态         | `true` / `false`   |

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

## 小结

初学者要点：

- 图标无障碍只需先回答一个问题：**这个图标传达信息吗？** 不传达就 `aria-hidden="true"`；传达就给可访问名称；可点击就把 `aria-label` 放在 `<button>` 上、图标本身隐藏。
- 换色靠 `currentColor`，换尺寸靠 CSS 尺寸类，两者都不需要为每个变体重画图标。
- 对比度底线：图形类 3:1（WCAG 1.4.11），正文文本 4.5:1；浅色 `#ccc` 图标在白底上大概率不达标。

进阶注意：

- `<title>` / `<desc>` 是规范原生机制，但务必配 `aria-labelledby` / `aria-describedby` 使用，跨阅读器行为才稳定；装饰图标不要加 title，否则会被朗读。
- 原生 `<button>` 能白拿键盘焦点、Enter/Space 触发与 role 语义；自造 `role="button" tabindex="0"` 的 svg 是退路而不是首选。
- 尊重 `prefers-reduced-motion`，加载动画一类的持续旋转图标在减弱动态模式下应停转（改为静态图形或文案提示）。

