# SVG CSS 样式化 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 样式优先级

SVG 元素的样式可通过多种方式声明,优先级从低到高:
1. 元素属性的默认值
2. 外部 CSS 样式表
3. `<style>` 内部样式
4. 元素的 `style` 属性(inline style)
5. `!important` 声明

**样式优先级示例**
```html
<!-- 外部 CSS -->
<link rel="stylesheet" href="svg.css" />

<svg viewBox="0 0 200 100">
  <style>
    .box {
      fill: #4f5bd5;
    } /* 内部样式 */
  </style>
  <rect class="box" width="100" height="50" fill="#d63031" />
  <!-- 元素 fill 属性优先于 class,但低于 style 属性 -->
  <rect class="box" style="fill: #00b894" width="100" height="50" />
  <!-- style 属性优先级最高 -->
</svg>
```

> SVG 的表现属性(如 `fill="..."`)优先级**低于** CSS 规则,这是与 HTML 不同的地方。

---

## 三种样式声明方式

### 表现属性

**直接写在元素上的属性**
```html
<rect x="10" y="10" width="80" height="50" fill="#4f5bd5" stroke="#000" stroke-width="2" />
```

### 内部 style 标签

**SVG 内部 style 标签**
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

### 外部 CSS

**外部 CSS 样式表**
```html
<!-- svg.css -->
.rect-primary { fill: #4f5bd5; }
.rect-danger { fill: #d63031; }
```

```html
<link rel="stylesheet" href="svg.css" />
<svg viewBox="0 0 200 100">
  <rect class="rect-primary" width="100" height="50" />
</svg>
```

> 外部 CSS 仅在内联 SVG 或 `<object>` 嵌入时生效;`<img>` 引用的 SVG 无法被外部 CSS 样式化。

---

## CSS 可控制的 SVG 属性

| 类别         | 属性                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| 填充         | `fill`、`fill-opacity`、`fill-rule`                                                                                      |
| 描边         | `stroke`、`stroke-width`、`stroke-opacity`、`stroke-linecap`、`stroke-linejoin`、`stroke-dasharray`、`stroke-dashoffset` |
| 几何(部分) | `cx`、`cy`、`r`、`x`、`y`、`width`、`height`                                                                             |
| 文本         | `font-family`、`font-size`、`font-weight`、`text-anchor`、`letter-spacing`                                               |
| 视觉         | `opacity`、`visibility`、`display`、`filter`、`clip-path`、`mask`                                                        |
| 变换         | `transform`、`transform-origin`、`transform-box`                                                                         |
| 其他         | `color`、`cursor`、`pointer-events`                                                                                      |

### CSS 控制示例

**CSS 样式化 SVG 图标**
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

---

## CSS 变量

**CSS 自定义属性主题化**
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

### CSS 变量穿透 use

**CSS 变量穿透 shadow DOM**
```html
<symbol id="card" viewBox="0 0 100 50">
  <rect width="100" height="50" fill="var(--card-bg)" />
  <text x="50" y="30" text-anchor="middle" fill="var(--card-text)">CARD</text>
</symbol>

<svg width="100" height="50">
  <use href="#card" style="--card-bg: #4f5bd5; --card-text: #fff" />
</svg>
```

---

## 伪类与状态

**CSS 伪类交互**
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

### pointer-events

**pointer-events 控制事件响应**
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
| `none`           | 不响应事件(穿透)      |
| `all`(默认)    | 响应所有事件            |
| `fill`           | 仅填充区域响应          |
| `stroke`         | 仅描边区域响应          |
| `visiblePainted` | 可见且填充/描边区域响应 |

---

## 媒体查询

**SVG 内部响应式样式**
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

### prefers-reduced-motion

**prefers-reduced-motion 禁用动画**
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

尊重用户系统偏好,禁用动画。

---

## transition 过渡

**CSS transition 过渡**
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

可过渡的属性:颜色、opacity、transform、几何属性(部分)。

---

## 主题切换

**data-theme 主题切换**
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

---

## 嵌入方式对 CSS 的影响

| 嵌入方式       | 外部 CSS | 内部 style | 表现属性 |
| -------------- | -------- | ---------- | -------- |
| inline SVG     | 支持     | 支持       | 支持     |
| `<object>`     | 不支持   | 支持       | 支持     |
| `<img>`        | 不支持   | 支持       | 支持     |
| CSS background | 不支持   | 支持       | 支持     |

> 仅 inline SVG 可被外部 CSS 完全控制,其他方式需要 SVG 文件内部自带样式。

---

## 综合示例:响应式数据条

**响应式数据条**
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
