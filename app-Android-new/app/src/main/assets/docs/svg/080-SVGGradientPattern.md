---
order: 80
title: SVG 渐变与图案
module: 'svg'
category: 前端技术
difficulty: intermediate
description: linearGradient、radialGradient、pattern 平铺与复杂纹理。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'svg/070-SVGColorFill'
  - 'svg/100-SVGFilterDetailed'
  - 'svg/090-SVGTransform'
prerequisites:
  - 'svg/070-SVGColorFill'
---

---

> 前置知识：fill / stroke 取值规则（《SVG 颜色与填充》，007-SVGColorFill）、`<defs>` 定义机制（《SVG 基础语法与文档结构》，002-SVGBasicSyntaxDocStructure）。
>
> 学习目标：会用 linearGradient / radialGradient 描述方向、焦点与色标；分清 gradientUnits 的 objectBoundingBox 与 userSpaceOnUse 两种坐标系何时用哪个；能用 pattern 平铺点阵、网格与斜纹；避开"渐变元素零尺寸边界框"等经典陷阱。

## 1. 线性渐变 linearGradient

`<linearGradient>` 沿直线方向过渡颜色。

```html
<svg viewBox="0 0 300 100">
  <defs>
    <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#4f5bd5" />
      <stop offset="50%" stop-color="#00b894" />
      <stop offset="100%" stop-color="#f9a825" />
    </linearGradient>
  </defs>
  <rect width="300" height="100" fill="url(#lg)" />
</svg>
```

### 1.1 关键属性

| 属性                | 说明                                       | 默认值            |
| ------------------- | ------------------------------------------ | ----------------- |
| `x1, y1`            | 起点坐标                                   | 0%                |
| `x2, y2`            | 终点坐标                                   | 100%              |
| `gradientUnits`     | 坐标系：objectBoundingBox / userSpaceOnUse | objectBoundingBox |
| `gradientTransform` | 渐变变换矩阵                               | 无                |
| `spreadMethod`      | 超出范围行为：pad / reflect / repeat       | pad               |

### 1.2 方向控制

```html
<!-- 水平渐变 -->
<linearGradient id="h" x1="0%" x2="100%">
  <stop offset="0%" stop-color="#4f5bd5" />
  <stop offset="100%" stop-color="#00b894" />
</linearGradient>

<!-- 垂直渐变 -->
<linearGradient id="v" x1="0%" y1="0%" x2="0%" y2="100%">
  <stop offset="0%" stop-color="#4f5bd5" />
  <stop offset="100%" stop-color="#00b894" />
</linearGradient>

<!-- 对角线渐变 -->
<linearGradient id="d" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" stop-color="#4f5bd5" />
  <stop offset="100%" stop-color="#00b894" />
</linearGradient>
```

### 1.3 stop 颜色停止点

```html
<linearGradient id="multi">
  <stop offset="0%" stop-color="#4f5bd5" stop-opacity="1" />
  <stop offset="50%" stop-color="#00b894" stop-opacity="0.5" />
  <stop offset="100%" stop-color="#f9a825" stop-opacity="0" />
</linearGradient>
```

- `offset`：0% ~ 100% 位置
- `stop-color`：该位置颜色
- `stop-opacity`：该位置透明度

### 1.4 spreadMethod 超出范围

渐变向量（x1,y1 → x2,y2）只覆盖一条带状区域，`spreadMethod` 决定带外怎么补：

```html
<!-- pad：超出部分用端点色填充（默认） -->
<linearGradient id="pad" x1="20%" x2="80%" spreadMethod="pad">
  <stop offset="0%" stop-color="#4f5bd5" />
  <stop offset="100%" stop-color="#00b894" />
</linearGradient>

<!-- reflect：镜像反射 -->
<linearGradient id="reflect" x1="20%" x2="80%" spreadMethod="reflect">
  <stop offset="0%" stop-color="#4f5bd5" />
  <stop offset="100%" stop-color="#00b894" />
</linearGradient>

<!-- repeat：重复平铺 -->
<linearGradient id="repeat" x1="20%" x2="80%" spreadMethod="repeat">
  <stop offset="0%" stop-color="#4f5bd5" />
  <stop offset="100%" stop-color="#00b894" />
</linearGradient>
```

### 1.5 gradientTransform 渐变变换

`gradientTransform` 对整个渐变坐标系做仿射变换，适合做"斜切渐变"而不改动元素：

```html
<!-- 水平渐变整体旋转 30°，形成斜向过渡 -->
<linearGradient id="tilt" x1="0%" y1="0%" x2="100%" y2="0%" gradientTransform="rotate(30)">
  <stop offset="0%" stop-color="#4f5bd5" />
  <stop offset="100%" stop-color="#00b894" />
</linearGradient>
```

> objectBoundingBox 坐标系下，若目标元素是"零高度的水平线"或"零宽度的竖线"，边界框退化为零面积，默认渐变会失效——这是 `fill="url(#lg)"` 在 `<line>` 上不生效的常见原因，此时应改用 `gradientUnits="userSpaceOnUse"`。

## 2. 径向渐变 radialGradient

`<radialGradient>` 从中心向外辐射。

```html
<svg viewBox="0 0 200 200">
  <defs>
    <radialGradient id="rg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fff" />
      <stop offset="100%" stop-color="#4f5bd5" />
    </radialGradient>
  </defs>
  <circle cx="100" cy="100" r="100" fill="url(#rg)" />
</svg>
```

### 2.1 关键属性

| 属性            | 说明             | 默认值            |
| --------------- | ---------------- | ----------------- |
| `cx, cy`        | 圆心             | 50%               |
| `r`             | 半径             | 50%               |
| `fx, fy`        | 焦点（颜色起点） | 等于 cx, cy       |
| `gradientUnits` | 坐标系           | objectBoundingBox |
| `spreadMethod`  | 超出范围         | pad               |

### 2.2 焦点偏移

```html
<radialGradient id="spotlight" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
  <stop offset="0%" stop-color="#fff" stop-opacity="0.8" />
  <stop offset="100%" stop-color="#4f5bd5" stop-opacity="0" />
</radialGradient>
<!-- 聚光灯效果：焦点偏左上 -->
```

## 3. gradientUnits 坐标系

### 3.1 objectBoundingBox（默认）

渐变坐标相对于应用元素的边界框，0% 到 100% 对应元素 0 到 1。

```html
<linearGradient id="bb" x1="0%" x2="100%" gradientUnits="objectBoundingBox">
  <stop offset="0%" stop-color="#4f5bd5" />
  <stop offset="100%" stop-color="#00b894" />
</linearGradient>
<!-- 不同尺寸的 rect 都会从左到右渐变 -->
<rect x="0" y="0" width="100" height="50" fill="url(#bb)" />
<rect x="0" y="60" width="200" height="80" fill="url(#bb)" />
```

### 3.2 userSpaceOnUse

渐变坐标使用 SVG 用户坐标系，与具体元素无关。

```html
<linearGradient id="us" x1="0" y1="0" x2="300" y2="0" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="#4f5bd5" />
  <stop offset="150" stop-color="#00b894" />
  <stop offset="300" stop-color="#f9a825" />
</linearGradient>
<!-- 渐变固定在 0-300 范围，多个元素共享同一渐变带 -->
<rect x="0" y="0" width="150" height="50" fill="url(#us)" />
<rect x="150" y="0" width="150" height="50" fill="url(#us)" />
```

> 多个元素需要"拼接同一渐变"时使用 userSpaceOnUse。

## 4. 图案 pattern

`<pattern>` 定义可平铺的图案，类似 CSS background-repeat。

```html
<svg viewBox="0 0 200 200">
  <defs>
    <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
      <circle cx="10" cy="10" r="3" fill="#4f5bd5" />
    </pattern>
  </defs>
  <rect width="200" height="200" fill="url(#dots)" />
</svg>
```

### 4.1 关键属性

| 属性                  | 说明                                       | 默认值           |
| --------------------- | ------------------------------------------ | ---------------- |
| `x, y`                | 图案起始偏移                               | 0                |
| `width, height`       | 单个图案单元尺寸                           | 0（0 时不渲染）  |
| `patternUnits`        | 图案单元坐标系（x/y/width/height 的基准）  | objectBoundingBox |
| `patternContentUnits` | 图案内容的坐标系                           | userSpaceOnUse   |
| `patternTransform`    | 图案变换                                   | 无               |

> 两个 Units 属性方向相反，是 pattern 最容易混淆的点：`patternUnits` 管"瓦片怎么摆"（x/y/width/height 的基准），`patternContentUnits` 管"瓦片里画的内容怎么解析"。实践中最常用的组合是 `patternUnits="userSpaceOnUse"` + 内容保持默认——这样瓦片尺寸与内容坐标都在用户坐标系里，直观好算。

### 4.2 网格图案

```html
<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#4f5bd5" stroke-width="0.5" />
</pattern>
<rect width="400" height="300" fill="url(#grid)" />
```

### 4.3 斜纹图案

```html
<pattern
  id="stripes"
  width="10"
  height="10"
  patternUnits="userSpaceOnUse"
  patternTransform="rotate(45)"
>
  <rect width="5" height="10" fill="#4f5bd5" />
  <rect x="5" width="5" height="10" fill="#00b894" />
</pattern>
```

### 4.4 复杂图案：十字纹

```html
<pattern id="cross" width="30" height="30" patternUnits="userSpaceOnUse">
  <path d="M 15 0 L 15 30 M 0 15 L 30 15" stroke="#4f5bd5" stroke-width="1" />
</pattern>
<rect width="300" height="200" fill="url(#cross)" />
```

## 5. 图案与渐变组合

图案内可使用渐变填充，实现复杂纹理。

```html
<svg viewBox="0 0 300 200">
  <defs>
    <linearGradient id="tile-grad" x1="0%" x2="100%">
      <stop offset="0%" stop-color="#4f5bd5" />
      <stop offset="100%" stop-color="#00b894" />
    </linearGradient>
    <pattern id="gradient-dots" width="40" height="40" patternUnits="userSpaceOnUse">
      <circle cx="20" cy="20" r="12" fill="url(#tile-grad)" />
    </pattern>
  </defs>
  <rect width="300" height="200" fill="url(#gradient-dots)" />
</svg>
```

## 6. 渐变文字

```html
<svg viewBox="0 0 400 100">
  <defs>
    <linearGradient id="text-grad" x1="0%" x2="100%">
      <stop offset="0%" stop-color="#4f5bd5" />
      <stop offset="50%" stop-color="#00b894" />
      <stop offset="100%" stop-color="#f9a825" />
    </linearGradient>
  </defs>
  <text
    x="200"
    y="60"
    text-anchor="middle"
    font-size="48"
    font-weight="bold"
    fill="url(#text-grad)"
  >
    FANDEX
  </text>
</svg>
```

## 7. 渐变描边

```html
<svg viewBox="0 0 200 100">
  <defs>
    <linearGradient id="stroke-grad" x1="0%" x2="100%">
      <stop offset="0%" stop-color="#4f5bd5" />
      <stop offset="100%" stop-color="#00b894" />
    </linearGradient>
  </defs>
  <rect
    x="10"
    y="10"
    width="180"
    height="80"
    rx="12"
    fill="none"
    stroke="url(#stroke-grad)"
    stroke-width="4"
  />
</svg>
```

## 8. 渐变动画

```html
<svg viewBox="0 0 400 100">
  <defs>
    <linearGradient id="animated-grad" x1="0%" x2="100%">
      <stop offset="0%" stop-color="#4f5bd5">
        <animate
          attributeName="stop-color"
          values="#4f5bd5;#00b894;#4f5bd5"
          dur="4s"
          repeatCount="indefinite"
        />
      </stop>
      <stop offset="100%" stop-color="#00b894">
        <animate
          attributeName="stop-color"
          values="#00b894;#4f5bd5;#00b894"
          dur="4s"
          repeatCount="indefinite"
        />
      </stop>
    </linearGradient>
  </defs>
  <rect width="400" height="100" fill="url(#animated-grad)" />
</svg>
```

## 9. 实战：圆形按钮渐变

```html
<svg viewBox="0 0 200 80" width="200" height="80">
  <defs>
    <linearGradient id="btn-primary" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#5b6ee8" />
      <stop offset="100%" stop-color="#4f5bd5" />
    </linearGradient>
    <filter id="btn-shadow">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#4f5bd5" flood-opacity="0.3" />
    </filter>
  </defs>
  <rect
    x="10"
    y="10"
    width="180"
    height="60"
    rx="30"
    fill="url(#btn-primary)"
    filter="url(#btn-shadow)"
  />
  <text
    x="100"
    y="42"
    text-anchor="middle"
    dominant-baseline="middle"
    font-size="20"
    fill="#fff"
    font-weight="bold"
  >
    立即开始
  </text>
</svg>
```

## 10. 性能注意

| 优化点                     | 说明                                                         |
| -------------------------- | ------------------------------------------------------------ |
| **避免过多 stop**          | 色标越多，渐变光栅化成本越高，5 个以上就要审视必要性         |
| **警惕大面积渐变动画**     | 动画 stop-color / 坐标会触发区域逐帧重绘，小元素上做更划算    |
| **渐变区域匹配元素**       | gradientUnits=objectBoundingBox 时渐变自动适配元素尺寸        |
| **极复杂纹理用位图**       | 数百个图元的 pattern 可改为 PNG/WebP 平铺背景                 |

## 小结

初学者要点：

- 渐变定义在 `<defs>` 里、用 `fill="url(#id)"` 引用，本质和颜色一样是"画"的一部分：既能当 fill，也能当 stroke，还能给文字上色。
- linearGradient 的方向由 x1/y1 → x2/y2 决定（默认左到右）；radialGradient 记住三件套 cx/cy/r，焦点 fx/fy 用来造高光。
- 图案 pattern 的四个例子（点阵、网格、斜纹、十字）覆盖了 90% 的工程需求，改坐标即可复用。

进阶注意：

- objectBoundingBox 在零宽/零高的元素（水平线、竖线）上会让渐变失效，改 `gradientUnits="userSpaceOnUse"` 是标准解法。
- 多元素拼接同一片连续渐变（如跨列的图表背景）必须用 userSpaceOnUse；各元素独立渐变则用默认 objectBoundingBox。
- 渐变 id 是全文档唯一的引用锚点，页面里内联多个 SVG 时注意 id 冲突——两个相同 id 的渐变，`url(#x)` 只会命中先出现的那一个。

