---
order: 110
title: 'SVG 裁剪与蒙版'
module: svg
category: 'SVG Effects'
difficulty: advanced
description: 'clipPath 硬裁剪、mask 软蒙版、 luminance 与 alpha 蒙版技巧。'
author: fanquanpp
updated: '2026-07-18'
related:
  - svg/滤镜详解
  - svg/渐变与图案
  - svg/变换transform
prerequisites:
  - svg/滤镜详解
---

## 1. clipPath 裁剪路径

`<clipPath>` 定义硬裁剪区域，区域外的内容完全不显示（无过渡）。

```html
<svg viewBox="0 0 200 200">
  <defs>
    <clipPath id="circle-clip">
      <circle cx="100" cy="100" r="80" />
    </clipPath>
  </defs>
  <!-- 图像只在圆形区域内可见 -->
  <rect width="200" height="200" fill="#4f5bd5" clip-path="url(#circle-clip)" />
  <!-- 矩形被裁成圆形 -->
  <image href="photo.jpg" x="0" y="0" width="200" height="200" clip-path="url(#circle-clip)" />
</svg>
```

### 1.1 clipPathUnits 坐标系

| 值                       | 说明                          |
| ------------------------ | ----------------------------- |
| `userSpaceOnUse`（默认） | 使用 SVG 用户坐标系           |
| `objectBoundingBox`      | 相对于应用元素的边界框（0-1） |

```html
<clipPath id="half" clipPathUnits="objectBoundingBox">
  <rect x="0" y="0" width="0.5" height="1" />
</clipPath>
<!-- 任意元素应用此裁剪，都只显示左半部分 -->
<rect width="100" height="100" clip-path="url(#half)" />
<circle cx="50" cy="50" r="30" clip-path="url(#half)" />
```

### 1.2 文字裁剪

```html
<svg viewBox="0 0 400 100">
  <defs>
    <clipPath id="text-mask">
      <text x="200" y="70" text-anchor="middle" font-size="80" font-weight="bold">FANDEX</text>
    </clipPath>
  </defs>
  <!-- 渐变填充文字（通过裁剪实现） -->
  <rect width="400" height="100" fill="url(#rainbow)" clip-path="url(#text-mask)" />
</svg>
```

### 1.3 多形状裁剪

```html
<clipPath id="holes">
  <circle cx="50" cy="50" r="30" />
  <circle cx="150" cy="50" r="30" />
  <circle cx="250" cy="50" r="30" />
</clipPath>
<rect width="300" height="100" fill="#4f5bd5" clip-path="url(#holes)" />
<!-- 出现三个圆形填充 -->
```

## 2. mask 蒙版

`<mask>` 通过亮度或 alpha 通道实现软蒙版，灰度区域形成半透明效果。

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
  <!-- 左侧不透明，右侧透明，形成渐隐效果 -->
</svg>
```

### 2.1 蒙版颜色规则

| 蒙版颜色     | 效果     |
| ------------ | -------- |
| `#fff`（白） | 完全显示 |
| `#000`（黑） | 完全隐藏 |
| `#888`（灰） | 半透明   |
| 渐变白→黑    | 渐隐     |

### 2.2 maskUnits / maskContentUnits

| 属性               | 说明                                      |
| ------------------ | ----------------------------------------- |
| `maskUnits`        | mask 区域坐标系（默认 objectBoundingBox） |
| `maskContentUnits` | 蒙版内容坐标系（默认 userSpaceOnUse）     |

```html
<mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
  <rect width="200" height="200" fill="#fff" />
</mask>
```

### 2.3 mask-type 蒙版类型

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
| `luminance`（默认） | 根据亮度计算透明度        |
| `alpha`             | 根据 alpha 通道计算透明度 |

## 3. clipPath vs mask 对比

| 维度     | clipPath               | mask                     |
| -------- | ---------------------- | ------------------------ |
| 边缘     | 硬边（无过渡）         | 软边（可渐变）           |
| 计算依据 | 几何形状               | 像素亮度/alpha           |
| 半透明   | 不支持                 | 支持                     |
| 性能     | 较优                   | 较重                     |
| 典型场景 | 头像圆形裁剪、文字镂空 | 渐隐、淡入淡出、复杂透明 |

## 4. 圆形头像

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

## 5. 渐隐遮罩

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
  <!-- 上下渐隐，中间可见 -->
</svg>
```

## 6. 文字渐变蒙版

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

**原理**：

- mask 黑色背景 = 隐藏
- 白色文字 = 显示
- 渐变 rect 通过 mask 只显示文字形状

## 7. 反射倒影

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
  <!-- 原图 -->
  <rect x="50" y="20" width="100" height="80" fill="#4f5bd5" />
  <!-- 倒影 -->
  <g transform="translate(0, 200) scale(1, -1)" mask="url(#reflect)" opacity="0.6">
    <rect x="50" y="20" width="100" height="80" fill="#4f5bd5" />
  </g>
</svg>
```

**原理**：

- `scale(1, -1)` 垂直翻转
- mask 渐变让倒影从顶部半透明到底部全透明

## 8. clipPath 动画

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

形成"从左到右揭开"动画效果。

## 9. mask 动画

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

形成"光带扫过文字"效果，常用于加载或强调动画。

## 10. 多重裁剪

clipPath 与 mask 可同时应用，clipPath 先裁剪，mask 再蒙版。

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
  <!-- 先裁成圆形，再让底部渐隐 -->
</svg>
```

## 11. 实战：粒子头像

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
  <!-- 头像主体 -->
  <image href="avatar.jpg" x="20" y="20" width="160" height="160" clip-path="url(#avatar)" />
  <!-- 外圈光环 -->
  <circle cx="100" cy="100" r="90" fill="#4f5bd5" mask="url(#ring)" />
</svg>
```

## 12. 性能建议

| 优化           | 说明                               |
| -------------- | ---------------------------------- |
| 优先 clipPath  | 硬裁剪性能优于软蒙版               |
| 缩小 mask 区域 | mask x/y/width/height 限制计算范围 |
| 避免大图蒙版   | 高分辨率图像 + mask 会显著拖慢渲染 |
| 缓存复用       | 多个元素复用同一 mask 定义         |

下一篇介绍 symbol/use 的图形复用机制。
