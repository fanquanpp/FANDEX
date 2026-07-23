# SVG 裁剪与蒙版 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## clipPath 裁剪路径

**clipPath 硬裁剪区域**
`<clipPath id="<id>" [clipPathUnits="<坐标系>"]><裁剪形状></clipPath>`
```html
<svg viewBox="0 0 200 200">
  <defs>
    <clipPath id="circle-clip">
      <circle cx="100" cy="100" r="80" />
    </clipPath>
  </defs>
  <rect width="200" height="200" fill="#4f5bd5" clip-path="url(#circle-clip)" />
  <image href="photo.jpg" x="0" y="0" width="200" height="200" clip-path="url(#circle-clip)" />
</svg>
```

### clipPathUnits 坐标系

| 值                       | 说明                          |
| ------------------------ | ----------------------------- |
| `userSpaceOnUse`(默认) | 使用 SVG 用户坐标系           |
| `objectBoundingBox`      | 相对于应用元素的边界框(0-1) |

**objectBoundingBox 相对坐标系**
```html
<clipPath id="half" clipPathUnits="objectBoundingBox">
  <rect x="0" y="0" width="0.5" height="1" />
</clipPath>
<rect width="100" height="100" clip-path="url(#half)" />
<circle cx="50" cy="50" r="30" clip-path="url(#half)" />
```

### 文字裁剪

**text 作为裁剪形状**
```html
<svg viewBox="0 0 400 100">
  <defs>
    <clipPath id="text-mask">
      <text x="200" y="70" text-anchor="middle" font-size="80" font-weight="bold">FANDEX</text>
    </clipPath>
  </defs>
  <rect width="400" height="100" fill="url(#rainbow)" clip-path="url(#text-mask)" />
</svg>
```

### 多形状裁剪

**clipPath 包含多个形状**
```html
<clipPath id="holes">
  <circle cx="50" cy="50" r="30" />
  <circle cx="150" cy="50" r="30" />
  <circle cx="250" cy="50" r="30" />
</clipPath>
<rect width="300" height="100" fill="#4f5bd5" clip-path="url(#holes)" />
```

### clip-path 应用属性

**clip-path 引用裁剪路径**
`clip-path="url(#<clipPath-id>)"`
```html
<rect width="200" height="200" fill="#4f5bd5" clip-path="url(#circle-clip)" />
```

---

## mask 蒙版

**mask 软蒙版**
`<mask id="<id>" [maskUnits="<区域坐标系>"] [maskContentUnits="<内容坐标系>"] [mask-type="<类型>"] [x="<x>"] [y="<y>"] [width="<w>"] [height="<h>"]><蒙版内容></mask>`
```html
<svg viewBox="0 0 200 200">
  <defs>
    <mask id="fade">
      <linearGradient id="fade-grad" x1="0%" x2="100%">
        <stop offset="0%" stop-color="#fff" />
        <stop offset="100%" stop-color="#000" />
      </linearGradient>
      <rect width="200" height="200" fill="url(#fade-grad)" />
    </mask>
  </defs>
  <rect width="200" height="200" fill="#4f5bd5" mask="url(#fade)" />
</svg>
```

### 蒙版颜色规则

| 蒙版颜色     | 效果     |
| ------------ | -------- |
| `#fff`(白) | 完全显示 |
| `#000`(黑) | 完全隐藏 |
| `#888`(灰) | 半透明   |
| 渐变白->黑  | 渐隐     |

### maskUnits / maskContentUnits

| 属性               | 说明                                       |
| ------------------ | ------------------------------------------ |
| `maskUnits`        | mask 区域坐标系(默认 objectBoundingBox)  |
| `maskContentUnits` | 蒙版内容坐标系(默认 userSpaceOnUse)      |

**userSpaceOnUse 区域显式声明**
```html
<mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
  <rect width="200" height="200" fill="#fff" />
</mask>
```

### mask-type 蒙版类型

**mask-type 指定蒙版计算方式**
`mask-type="<luminance | alpha>"`
```html
<mask id="alpha-mask" mask-type="alpha">
  <rect fill="rgba(255,255,255,0.5)" />
</mask>

<mask id="luma-mask" mask-type="luminance">
  <rect fill="#fff" />
</mask>
```

| 值                  | 说明                      |
| ------------------- | ------------------------- |
| `luminance`(默认) | 根据亮度计算透明度        |
| `alpha`             | 根据 alpha 通道计算透明度 |

### mask 应用属性

**mask 引用蒙版**
`mask="url(#<mask-id>)"`
```html
<rect width="200" height="200" fill="#4f5bd5" mask="url(#fade)" />
```

---

## clipPath 与 mask 对比

| 维度     | clipPath               | mask                     |
| -------- | ---------------------- | ------------------------ |
| 边缘     | 硬边(无过渡)         | 软边(可渐变)           |
| 计算依据 | 几何形状               | 像素亮度/alpha           |
| 半透明   | 不支持                 | 支持                     |
| 典型场景 | 头像圆形裁剪、文字镂空 | 渐隐、淡入淡出、复杂透明 |

---

## 圆形头像裁剪

**clipPath 圆形头像**
```html
<svg viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <clipPath id="avatar">
      <circle cx="50" cy="50" r="48" />
    </clipPath>
  </defs>
  <image href="avatar.jpg" x="0" y="0" width="100" height="100" clip-path="url(#avatar)" />
  <circle cx="50" cy="50" r="48" fill="none" stroke="#4f5bd5" stroke-width="2" />
</svg>
```

---

## 渐隐遮罩

**linearGradient + mask 上下渐隐**
```html
<svg viewBox="0 0 400 200">
  <defs>
    <linearGradient id="vignette" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#000" />
      <stop offset="50%" stop-color="#fff" />
      <stop offset="100%" stop-color="#000" />
    </linearGradient>
    <mask id="band">
      <rect width="400" height="200" fill="url(#vignette)" />
    </mask>
  </defs>
  <rect width="400" height="200" fill="#4f5bd5" mask="url(#band)" />
</svg>
```

---

## 文字渐变蒙版

**mask 实现文字渐变**
```html
<svg viewBox="0 0 400 100">
  <defs>
    <linearGradient id="rainbow" x1="0%" x2="100%">
      <stop offset="0%" stop-color="#d63031" />
      <stop offset="25%" stop-color="#f9a825" />
      <stop offset="50%" stop-color="#00b894" />
      <stop offset="75%" stop-color="#4f5bd5" />
      <stop offset="100%" stop-color="#8854d0" />
    </linearGradient>
    <mask id="text">
      <rect width="400" height="100" fill="#000" />
      <text
        x="200"
        y="70"
        text-anchor="middle"
        font-size="60"
        font-weight="bold"
        fill="#fff"
        font-family="sans-serif"
      >
        FANDEX
      </text>
    </mask>
  </defs>
  <rect width="400" height="100" fill="url(#rainbow)" mask="url(#text)" />
</svg>
```

蒙版规则:
- mask 黑色背景 = 隐藏
- 白色文字 = 显示
- 渐变 rect 通过 mask 只显示文字形状

---

## 反射倒影

**mask + scale 实现倒影**
```html
<svg viewBox="0 0 200 200">
  <defs>
    <linearGradient id="reflect-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#fff" stop-opacity="0" />
    </linearGradient>
    <mask id="reflect">
      <rect y="100" width="200" height="100" fill="url(#reflect-grad)" />
    </mask>
  </defs>
  <rect x="50" y="20" width="100" height="80" fill="#4f5bd5" />
  <g transform="translate(0, 200) scale(1, -1)" mask="url(#reflect)" opacity="0.6">
    <rect x="50" y="20" width="100" height="80" fill="#4f5bd5" />
  </g>
</svg>
```

变换说明:
- `scale(1, -1)` 垂直翻转
- mask 渐变让倒影从顶部半透明到底部全透明

---

## clipPath 动画

**animate 裁剪形状属性**
```html
<svg viewBox="0 0 200 200">
  <defs>
    <clipPath id="reveal">
      <rect x="0" y="0" width="0" height="200">
        <animate attributeName="width" from="0" to="200" dur="2s" fill="freeze" />
      </rect>
    </clipPath>
  </defs>
  <rect width="200" height="200" fill="#4f5bd5" clip-path="url(#reveal)" />
</svg>
```

通过动画 clipPath 内 rect 的 width 实现"从左到右揭开"效果。

---

## mask 动画

**animateTransform 扫光蒙版**
```html
<svg viewBox="0 0 400 100">
  <defs>
    <linearGradient id="sweep" x1="0%" x2="100%">
      <stop offset="0%" stop-color="#000" />
      <stop offset="40%" stop-color="#000" />
      <stop offset="50%" stop-color="#fff" />
      <stop offset="60%" stop-color="#000" />
      <stop offset="100%" stop-color="#000" />
    </linearGradient>
    <mask id="sweep-mask">
      <rect width="400" height="100" fill="url(#sweep)">
        <animateTransform
          attributeName="transform"
          type="translate"
          from="-200 0"
          to="400 0"
          dur="3s"
          repeatCount="indefinite"
        />
      </rect>
    </mask>
  </defs>
  <text
    x="200"
    y="65"
    text-anchor="middle"
    font-size="40"
    font-weight="bold"
    fill="#4f5bd5"
    mask="url(#sweep-mask)"
  >
    FANDEX
  </text>
</svg>
```

通过 mask 内元素的 animateTransform 实现"光带扫过文字"效果。

---

## 多重裁剪

**clipPath 与 mask 同时应用**
```html
<svg viewBox="0 0 200 200">
  <defs>
    <clipPath id="circle">
      <circle cx="100" cy="100" r="80" />
    </clipPath>
    <linearGradient id="fade" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fff" />
      <stop offset="100%" stop-color="#000" />
    </linearGradient>
    <mask id="bottom-fade">
      <rect width="200" height="200" fill="url(#fade)" />
    </mask>
  </defs>
  <image
    href="photo.jpg"
    width="200"
    height="200"
    clip-path="url(#circle)"
    mask="url(#bottom-fade)"
  />
</svg>
```

clipPath 先裁剪(限定为圆形区域),mask 再蒙版(底部渐隐)。

---

## 综合示例:粒子头像

**clipPath + radialGradient mask 组合**
```html
<svg viewBox="0 0 200 200">
  <defs>
    <clipPath id="avatar">
      <circle cx="100" cy="100" r="80" />
    </clipPath>
    <radialGradient id="ring-grad" cx="50%" cy="50%" r="50%">
      <stop offset="80%" stop-color="#000" stop-opacity="0" />
      <stop offset="100%" stop-color="#4f5bd5" stop-opacity="1" />
    </radialGradient>
    <mask id="ring">
      <rect width="200" height="200" fill="url(#ring-grad)" />
    </mask>
  </defs>
  <image href="avatar.jpg" x="20" y="20" width="160" height="160" clip-path="url(#avatar)" />
  <circle cx="100" cy="100" r="90" fill="#4f5bd5" mask="url(#ring)" />
</svg>
```
