# SVG 矢量图形 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## SVG 基础

**svg 元素**
`<svg [width] [height] [viewBox="<min-x> <min-y> <width> <height>"] [xmlns="http://www.w3.org/2000/svg"]>...</svg>`
```html
<!-- 基础 SVG -->
<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="80" fill="blue" />
</svg>

<!-- 内联 SVG(HTML 中可直接使用) -->
<svg width="100" height="100">
  <rect width="100" height="100" fill="red" />
</svg>
```

---

## viewBox 坐标系统

**viewBox 详解**
`viewBox="<min-x> <min-y> <width> <height>"`
```html
<!-- 200x150 内部坐标,显示为 400x300 -->
<svg width="400" height="300" viewBox="0 0 200 150">
  <rect x="0" y="0" width="100" height="75" fill="blue" />
</svg>
```

**preserveAspectRatio 属性**
`preserveAspectRatio="[alignment] [meet|slice|none]"`
```html
<svg width="400" height="300" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid meet">
  <rect width="200" height="150" fill="green" />
</svg>
```

| preserveAspectRatio 值 | 说明                   |
| ---------------------- | ---------------------- |
| `xMidYMid meet`        | 居中,完整显示(默认)   |
| `xMidYMid slice`       | 居中,裁剪填充          |
| `xMinYMin meet`        | 左上对齐,完整显示      |
| `none`                 | 不保持比例,拉伸填充    |

---

## 基本形状

**矩形 rect**
`<rect x="<X>" y="<Y>" width="<宽>" height="<高>" [rx="<圆角X>"] [ry="<圆角Y>"] [fill] [stroke] [stroke-width] />`
```html
<rect x="10" y="10" width="100" height="60" rx="10" ry="10" fill="blue" stroke="black" stroke-width="2" />
```

**圆形 circle**
`<circle cx="<圆心X>" cy="<圆心Y>" r="<半径>" [fill] [stroke] />`
```html
<circle cx="200" cy="80" r="50" fill="red" />
```

**椭圆 ellipse**
`<ellipse cx="<圆心X>" cy="<圆心Y>" rx="<X半径>" ry="<Y半径>" [fill] [stroke] />`
```html
<ellipse cx="320" cy="80" rx="60" ry="30" fill="green" />
```

**直线 line**
`<line x1="<起点X>" y1="<起点Y>" x2="<终点X>" y2="<终点Y>" stroke="<颜色>" [stroke-width] />`
```html
<line x1="10" y1="150" x2="390" y2="150" stroke="black" stroke-width="2" />
```

**折线 polyline**
`<polyline points="<x1>,<y1> <x2>,<y2> ..." [fill] [stroke] />`
```html
<polyline points="10,180 50,160 90,200 130,170" fill="none" stroke="purple" stroke-width="2" />
```

**多边形 polygon**
`<polygon points="<x1>,<y1> <x2>,<y2> ..." [fill] [stroke] />`
```html
<polygon points="200,180 240,220 160,220" fill="orange" stroke="black" />
```

---

## 路径 path

**path 元素**
`<path d="<路径命令>" [fill] [stroke] [stroke-width] />`
```html
<!-- 三角形 -->
<path d="M 100 100 L 200 100 L 150 50 Z" fill="yellow" stroke="black" />

<!-- 心形 -->
<path d="M 100 200 C 50 100, 0 200, 100 300 C 200 200, 150 100, 100 200 Z" fill="red" />
```

**路径命令**

| 命令 | 说明           | 示例                  |
| ---- | -------------- | --------------------- |
| `M`  | 移动到(绝对)   | `M 10 10`             |
| `m`  | 移动到(相对)   | `m 10 10`             |
| `L`  | 直线到(绝对)   | `L 100 100`           |
| `l`  | 直线到(相对)   | `l 10 10`             |
| `H`  | 水平线到       | `H 100`               |
| `V`  | 垂直线到       | `V 100`               |
| `C`  | 三次贝塞尔     | `C 20,20 40,20 50,10` |
| `S`  | 平滑三次贝塞尔 | `S 40,20 50,10`       |
| `Q`  | 二次贝塞尔     | `Q 50,0 100,50`       |
| `T`  | 平滑二次贝塞尔 | `T 100,50`            |
| `A`  | 弧线           | `A 25,25 0 0,1 50,25` |
| `Z`  | 闭合路径       | `Z`                   |

> 小写字母为相对坐标,大写字母为绝对坐标。

**A 弧线参数**
`A rx ry x-axis-rotation large-arc-flag sweep-flag x y`
```html
<!-- 半圆弧 -->
<path d="M 50 100 A 50 50 0 0 1 150 100" stroke="red" fill="none" />
```

---

## 文本

**text 元素**
`<text x="<X>" y="<Y>" [font-size] [font-family] [fill] [text-anchor] [dominant-baseline]>[文本]</text>`
```html
<text x="20" y="50" font-size="24" font-family="Arial" fill="black"
      text-anchor="start" dominant-baseline="alphabetic">
  Hello SVG
</text>
```

| text-anchor 值 | 对齐方式   |
| -------------- | ---------- |
| `start`        | 左对齐     |
| `middle`       | 居中       |
| `end`          | 右对齐     |

**tspan 子文本**
```html
<text x="10" y="50">
  <tspan font-weight="bold">Hello</tspan>
  <tspan fill="red">World</tspan>
</text>
```

**textPath 沿路径排版**
```html
<defs>
  <path id="curve" d="M 50 150 Q 200 50, 350 150" />
</defs>
<text font-size="20" fill="blue">
  <textPath href="#curve">沿曲线排列的文字</textPath>
</text>
```

---

## 渐变与滤镜

**线性渐变**
```html
<defs>
  <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="red" />
    <stop offset="50%" stop-color="yellow" />
    <stop offset="100%" stop-color="blue" />
  </linearGradient>
</defs>
<rect x="50" y="50" width="100" height="80" fill="url(#lg)" />
```

**径向渐变**
```html
<defs>
  <radialGradient id="rg" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="white" />
    <stop offset="100%" stop-color="black" />
  </radialGradient>
</defs>
<circle cx="100" cy="100" r="80" fill="url(#rg)" />
```

**滤镜**
```html
<defs>
  <!-- 高斯模糊 -->
  <filter id="blur">
    <feGaussianBlur stdDeviation="5" />
  </filter>

  <!-- 阴影 -->
  <filter id="shadow">
    <feDropShadow dx="4" dy="4" stdDeviation="3" flood-color="black" flood-opacity="0.5" />
  </filter>
</defs>

<rect x="50" y="50" width="100" height="80" fill="blue" filter="url(#shadow)" />
```

---

## g 分组与 use 引用

**g 分组**
`<g [transform] [fill] [stroke] [opacity]>...</g>`
```html
<g transform="translate(50, 50)" fill="red" stroke="black">
  <rect width="50" height="50" />
  <circle cx="80" cy="25" r="25" />
</g>
```

**defs 与 use**
```html
<defs>
  <symbol id="icon" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
  </symbol>
</defs>

<!-- 多次引用 -->
<use href="#icon" x="0" y="0" width="50" height="50" />
<use href="#icon" x="60" y="0" width="50" height="50" fill="red" />
```

---

## SVG 属性参考

**通用样式属性**

| 属性             | 作用              | 示例                  |
| ---------------- | ----------------- | --------------------- |
| `fill`           | 填充颜色          | `fill="red"`          |
| `fill-opacity`   | 填充透明度        | `fill-opacity="0.5"`  |
| `stroke`         | 描边颜色          | `stroke="black"`      |
| `stroke-width`   | 描边宽度          | `stroke-width="2"`    |
| `stroke-opacity` | 描边透明度        | `stroke-opacity="0.8"`|
| `stroke-linecap` | 线帽 butt/round/square | `stroke-linecap="round"` |
| `stroke-linejoin`| 连接 miter/round/bevel | `stroke-linejoin="round"` |
| `stroke-dasharray` | 虚线           | `stroke-dasharray="5,5"` |
| `opacity`        | 整体透明度        | `opacity="0.8"`       |
| `transform`      | 变换              | `transform="rotate(45)"` |

**transform 变换**
```html
<!-- translate/scale/rotate/skew -->
<g transform="translate(50,50) rotate(45) scale(1.5)">
  <rect width="100" height="100" />
</g>
```

---

## SVG 动画

**SMIL 动画(SVG 原生)**
```html
<rect x="0" y="0" width="50" height="50" fill="red">
  <animate attributeName="x" from="0" to="200" dur="2s" repeatCount="indefinite" />
</rect>

<circle cx="50" cy="50" r="20" fill="blue">
  <animate attributeName="r" values="20;40;20" dur="2s" repeatCount="indefinite" />
</circle>
```

**CSS 动画**
```html
<style>
  .box {
    animation: move 2s infinite alternate;
  }
  @keyframes move {
    from { transform: translateX(0); }
    to { transform: translateX(100px); }
  }
</style>

<svg>
  <rect class="box" width="50" height="50" fill="red" />
</svg>
```

---

## SVG 在 HTML 中的使用

**直接内联**
```html
<svg width="50" height="50">
  <circle cx="25" cy="25" r="20" fill="red" />
</svg>
```

**img 引用**
```html
<img src="icon.svg" alt="图标" width="50" height="50" />
```

**CSS 背景**
```css
.icon {
  background: url('icon.svg') no-repeat center;
  width: 50px;
  height: 50px;
}
```

**object 引用**
```html
<object data="icon.svg" type="image/svg+xml" width="50" height="50"></object>
```
