# SVG 渐变与图案 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 线性渐变 linearGradient

**linearGradient 线性渐变**
`<linearGradient id="<标识>" x1="<起点x>" y1="<起点y>" x2="<终点x>" y2="<终点y>" [gradientUnits="<坐标系>"] [spreadMethod="<超出范围>"]> <stop ... /> ... </linearGradient>`
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

### linearGradient 关键属性

| 属性                | 说明                                       | 默认值            |
| ------------------- | ------------------------------------------ | ----------------- |
| `x1, y1`            | 起点坐标                                   | 0%                |
| `x2, y2`            | 终点坐标                                   | 100%              |
| `gradientUnits`     | 坐标系:objectBoundingBox / userSpaceOnUse | objectBoundingBox |
| `gradientTransform` | 渐变变换矩阵                               | 无                |
| `spreadMethod`      | 超出范围行为:pad / reflect / repeat       | pad               |

### 方向控制

**水平渐变**
`<linearGradient id="<id>" x1="0%" x2="100%"> ... </linearGradient>`
```html
<linearGradient id="h" x1="0%" x2="100%">
  <stop offset="0%" stop-color="#4f5bd5" />
  <stop offset="100%" stop-color="#00b894" />
</linearGradient>
```

**垂直渐变**
`<linearGradient id="<id>" x1="0%" y1="0%" x2="0%" y2="100%"> ... </linearGradient>`
```html
<linearGradient id="v" x1="0%" y1="0%" x2="0%" y2="100%">
  <stop offset="0%" stop-color="#4f5bd5" />
  <stop offset="100%" stop-color="#00b894" />
</linearGradient>
```

**对角线渐变**
`<linearGradient id="<id>" x1="0%" y1="0%" x2="100%" y2="100%"> ... </linearGradient>`
```html
<linearGradient id="d" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" stop-color="#4f5bd5" />
  <stop offset="100%" stop-color="#00b894" />
</linearGradient>
```

### stop 颜色停止点

**stop 颜色停止点**
`<stop offset="<0%-100%>" stop-color="<颜色>" [stop-opacity="<0-1>"] />`
```html
<linearGradient id="multi">
  <stop offset="0%" stop-color="#4f5bd5" stop-opacity="1" />
  <stop offset="50%" stop-color="#00b894" stop-opacity="0.5" />
  <stop offset="100%" stop-color="#f9a825" stop-opacity="0" />
</linearGradient>
```

- `offset`:0% ~ 100% 位置
- `stop-color`:该位置颜色
- `stop-opacity`:该位置透明度

### spreadMethod 超出范围

**pad 端点色填充(默认)**
`spreadMethod="pad"`
```html
<linearGradient id="pad" x1="20%" x2="80%" spreadMethod="pad">
  <stop offset="0%" stop-color="#4f5bd5" />
  <stop offset="100%" stop-color="#00b894" />
</linearGradient>
```

**reflect 镜像反射**
`spreadMethod="reflect"`
```html
<linearGradient id="reflect" x1="20%" x2="80%" spreadMethod="reflect">
  <stop offset="0%" stop-color="#4f5bd5" />
  <stop offset="100%" stop-color="#00b894" />
</linearGradient>
```

**repeat 重复平铺**
`spreadMethod="repeat"`
```html
<linearGradient id="repeat" x1="20%" x2="80%" spreadMethod="repeat">
  <stop offset="0%" stop-color="#4f5bd5" />
  <stop offset="100%" stop-color="#00b894" />
</linearGradient>
```

---

## 径向渐变 radialGradient

**radialGradient 径向渐变**
`<radialGradient id="<标识>" cx="<圆心x>" cy="<圆心y>" r="<半径>" [fx="<焦点x>"] [fy="<焦点y>"] [gradientUnits="<坐标系>"] [spreadMethod="<超出范围>"]> <stop ... /> ... </radialGradient>`
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

### radialGradient 关键属性

| 属性            | 说明             | 默认值            |
| --------------- | ---------------- | ----------------- |
| `cx, cy`        | 圆心             | 50%               |
| `r`             | 半径             | 50%               |
| `fx, fy`        | 焦点(颜色起点) | 等于 cx, cy       |
| `gradientUnits` | 坐标系           | objectBoundingBox |
| `spreadMethod`  | 超出范围         | pad               |

### 焦点偏移

**焦点偏移聚光灯效果**
`fx="<焦点x>" fy="<焦点y>"`
```html
<radialGradient id="spotlight" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
  <stop offset="0%" stop-color="#fff" stop-opacity="0.8" />
  <stop offset="100%" stop-color="#4f5bd5" stop-opacity="0" />
</radialGradient>
<!-- 聚光灯效果:焦点偏左上 -->
```

---

## gradientUnits 坐标系

### objectBoundingBox(默认)

**渐变坐标相对于元素边界框**
`gradientUnits="objectBoundingBox"`
```html
<linearGradient id="bb" x1="0%" x2="100%" gradientUnits="objectBoundingBox">
  <stop offset="0%" stop-color="#4f5bd5" />
  <stop offset="100%" stop-color="#00b894" />
</linearGradient>
<!-- 不同尺寸的 rect 都会从左到右渐变 -->
<rect x="0" y="0" width="100" height="50" fill="url(#bb)" />
<rect x="0" y="60" width="200" height="80" fill="url(#bb)" />
```

### userSpaceOnUse

**渐变坐标使用 SVG 用户坐标系**
`gradientUnits="userSpaceOnUse"`
```html
<linearGradient id="us" x1="0" y1="0" x2="300" y2="0" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="#4f5bd5" />
  <stop offset="150" stop-color="#00b894" />
  <stop offset="300" stop-color="#f9a825" />
</linearGradient>
<!-- 渐变固定在 0-300 范围,多个元素共享同一渐变带 -->
<rect x="0" y="0" width="150" height="50" fill="url(#us)" />
<rect x="150" y="0" width="150" height="50" fill="url(#us)" />
```

> 多个元素需要"拼接同一渐变"时使用 userSpaceOnUse。

---

## 图案 pattern

**pattern 平铺图案**
`<pattern id="<标识>" x="<偏移x>" y="<偏移y>" width="<单元宽>" height="<单元高>" [patternUnits="<坐标系>"] [patternContentUnits="<内容坐标系>"] [patternTransform="<变换>"]> ... </pattern>`
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

### pattern 关键属性

| 属性                  | 说明                                       |
| --------------------- | ------------------------------------------ |
| `x, y`                | 图案起始偏移                               |
| `width, height`       | 单个图案单元尺寸                           |
| `patternUnits`        | 坐标系:userSpaceOnUse / objectBoundingBox |
| `patternContentUnits` | 图案内容坐标系                             |
| `patternTransform`    | 图案变换                                   |

### 网格图案

**网格 pattern**
```html
<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#4f5bd5" stroke-width="0.5" />
</pattern>
<rect width="400" height="300" fill="url(#grid)" />
```

### 斜纹图案

**斜纹 pattern**
`patternTransform="rotate(<角度>)"`
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

### 十字纹图案

**十字纹 pattern**
```html
<pattern id="cross" width="30" height="30" patternUnits="userSpaceOnUse">
  <path d="M 15 0 L 15 30 M 0 15 L 30 15" stroke="#4f5bd5" stroke-width="1" />
</pattern>
<rect width="300" height="200" fill="url(#cross)" />
```

---

## 图案与渐变组合

**图案内使用渐变填充**
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

---

## 渐变文字

**文字填充渐变**
`fill="url(#<渐变id>)"`
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

---

## 渐变描边

**描边使用渐变**
`stroke="url(#<渐变id>)"`
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

---

## 渐变动画

**stop 颜色动画**
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

---

## 综合示例:渐变按钮

**渐变按钮 + 阴影**
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
