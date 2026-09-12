---
order: 100
title: SVG 滤镜详解
module: 'svg'
category: 前端技术
difficulty: advanced
description: filter、feGaussianBlur、feDropShadow、feColorMatrix、滤镜组合与光照。
author: fanquanpp
updated: '2026-09-13'
related:
  - 'svg/080-SVGGradientPattern'
  - 'svg/110-SVGClipMask'
  - 'svg/070-SVGColorFill'
prerequisites:
  - 'svg/080-SVGGradientPattern'
---

## 前置知识

建议先阅读以下内容再进入本文：

- [SVG 渐变与图案](/svg/080-SVGGradientPattern)

---

> 前置知识：渐变与 `<defs>` 复用（《SVG 渐变与图案》，008-SVGGradientPattern）、蒙版与裁剪的概念（《SVG 裁剪与蒙版》，011-SVGClipMask）。
>
> 学习目标：理解滤镜是"像素级后处理管线"：一串基元从 SourceGraphic 出发、用 in/result 串成有向图；掌握最常用的几个基元（模糊、阴影、颜色矩阵、合成、湍流）；会排查"效果被裁掉"与"滤镜太卡"两大高频问题。

## 1. filter 基础

`<filter>` 在 `<defs>` 中定义，通过 `filter="url(#id)"` 应用到元素。

```html
<svg viewBox="0 0 200 100">
  <defs>
    <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" />
    </filter>
  </defs>
  <rect x="20" y="20" width="160" height="60" fill="#4f5bd5" filter="url(#blur)" />
</svg>
```

### 1.1 filter 区域属性

| 属性             | 说明           | 默认值            |
| ---------------- | -------------- | ----------------- |
| `x, y`           | 滤镜区域左上角 | -10%              |
| `width, height`  | 滤镜区域尺寸   | 120%              |
| `filterUnits`    | 区域坐标系     | objectBoundingBox |
| `primitiveUnits` | 滤镜基元坐标   | userSpaceOnUse    |

> 模糊、阴影等效果会超出元素边界，需扩大 filter 区域否则被裁剪。

## 2. feGaussianBlur 高斯模糊

```html
<filter id="blur5">
  <feGaussianBlur stdDeviation="5" />
</filter>
<filter id="blur-xy">
  <feGaussianBlur stdDeviation="5 2" />
  <!-- X 方向模糊 5，Y 方向模糊 2 -->
</filter>
```

| 参数           | 说明                     |
| -------------- | ------------------------ |
| `stdDeviation` | 模糊半径，可分别指定 X Y |

## 3. feDropShadow 阴影

```html
<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
  <feDropShadow dx="4" dy="4" stdDeviation="3" flood-color="#000" flood-opacity="0.3" />
</filter>
```

| 参数            | 说明       | 默认值 |
| --------------- | ---------- | ------ |
| `dx, dy`        | 阴影偏移   | 2      |
| `stdDeviation`  | 模糊半径   | 2      |
| `flood-color`   | 阴影颜色   | #000   |
| `flood-opacity` | 阴影透明度 | 1      |

### 3.1 内阴影模拟

SVG 无原生 inner-shadow，经典配方是"偏移模糊的 alpha 从原图中抠出，再上色叠回"：

```html
<filter id="inner-shadow">
  <!-- 1. 复制一份图形的 alpha 通道并偏移、模糊 -->
  <feOffset dx="0" dy="3" in="SourceAlpha" />
  <feGaussianBlur stdDeviation="3" result="offset-blur" />
  <!-- 2. 用原图"减去"偏移模糊影，得到只在内侧的阴影形状 -->
  <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
  <!-- 3. 上色并裁剪进阴影形状 -->
  <feFlood flood-color="#000" flood-opacity="0.6" result="color" />
  <feComposite operator="in" in="color" in2="inverse" result="shadow" />
  <!-- 4. 阴影叠回原图之上 -->
  <feComposite operator="over" in="shadow" in2="SourceGraphic" />
</filter>
```

## 4. feColorMatrix 颜色矩阵

`<feColorMatrix>` 通过 4×5 矩阵变换 RGBA 通道，实现调色、灰度、反相等效果。

### 4.1 矩阵语法

```html
<filter id="grayscale">
  <feColorMatrix
    type="matrix"
    values="0.3 0.59 0.11 0 0
            0.3 0.59 0.11 0 0
            0.3 0.59 0.11 0 0
            0   0    0    1 0"
  />
</filter>
```

每个像素的 RGBA 按矩阵相乘：`R' = 0.3R + 0.59G + 0.11B + 0A + 0`，得到灰度。

### 4.2 预设类型 type

| 值                 | 说明                               |
| ------------------ | ---------------------------------- |
| `matrix`           | 自定义矩阵                         |
| `saturate`         | 饱和度（0=灰度，1=原色，2=高饱和） |
| `hueRotate`        | 色相旋转（度）                     |
| `luminanceToAlpha` | 亮度转透明度                       |

```html
<filter id="saturate">
  <feColorMatrix type="saturate" values="2" />
</filter>

<filter id="hue-rotate">
  <feColorMatrix type="hueRotate" values="90" />
</filter>
```

## 5. feComponentTransfer 通道映射

对每个颜色通道独立应用函数（亮度、对比度）。

```html
<filter id="brightness">
  <feComponentTransfer>
    <feFuncR type="linear" slope="1.5" intercept="0" />
    <feFuncG type="linear" slope="1.5" intercept="0" />
    <feFuncB type="linear" slope="1.5" intercept="0" />
  </feComponentTransfer>
</filter>
```

| 函数              | 说明                            |
| ----------------- | ------------------------------- |
| `feFuncR/G/B/A`   | 通道函数                        |
| `type="linear"`   | 线性：`y = slope*x + intercept` |
| `type="table"`    | 表格查找                        |
| `type="discrete"` | 阶梯量化                        |
| `type="gamma"`    | 伽马校正                        |

## 6. feMerge 合成

`<feMerge>` 将多个滤镜结果叠加合成。

```html
<filter id="glow">
  <feGaussianBlur stdDeviation="4" result="blur" />
  <feMerge>
    <feMergeNode in="blur" />
    <feMergeNode in="blur" />
    <feMergeNode in="SourceGraphic" />
  </feMerge>
</filter>
```

**原理**：模糊结果叠加两次产生更强光晕，最后叠加原图，形成发光效果。

## 7. 滤镜基元 result/in

每个滤镜基元可用 `result` 命名输出，后续基元用 `in` 引用。

```html
<filter id="emboss">
  <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur" />
  <feSpecularLighting
    in="blur"
    surfaceScale="3"
    specularConstant="1"
    specularExponent="20"
    lighting-color="#fff"
    result="spec"
  >
    <fePointLight x="-50" y="-50" z="200" />
  </feSpecularLighting>
  <feComposite in="spec" in2="SourceAlpha" operator="in" result="specMasked" />
  <feComposite
    in="SourceGraphic"
    in2="specMasked"
    operator="arithmetic"
    k1="0"
    k2="1"
    k3="1"
    k4="0"
  />
</filter>
```

| 输入              | 含义                              |
| ----------------- | --------------------------------- |
| `SourceGraphic`   | 原始彩色图形                      |
| `SourceAlpha`     | 原始图形的 alpha 通道（黑白蒙版） |
| `FillPaint` / `StrokePaint` | 填充/描边所用 paint（浏览器支持差，极少用） |
| 自定义 result     | 命名的中间结果                    |

省略 `in` 时：第一个基元默认 `SourceGraphic`，后续基元默认取**前一个基元**的结果。

> 历史注意：SVG 1.1 还定义过 `BackgroundImage` / `BackgroundAlpha`（配 `enable-background` 使用），SVG 2 已将其移除且浏览器从未完整实现，不要再使用。

## 8. feOffset 偏移

```html
<filter id="offset">
  <feOffset dx="10" dy="10" in="SourceAlpha" />
  <feFlood flood-color="#000" flood-opacity="0.3" />
  <feComposite operator="in" in2="SourceAlpha" />
  <feMerge>
    <feMergeNode />
    <feMergeNode in="SourceGraphic" />
  </feMerge>
</filter>
```

等价于 feDropShadow 的手动实现。

## 9. feFlood 纯色填充

```html
<filter id="red-overlay">
  <feFlood flood-color="#d63031" flood-opacity="0.5" />
  <feComposite operator="in" in2="SourceGraphic" />
</filter>
```

将图形填充为指定颜色，配合 feComposite 可制作色彩滤镜。

## 10. feSpecularLighting 光照

```html
<filter id="metallic">
  <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
  <feSpecularLighting
    in="blur"
    surfaceScale="5"
    specularConstant="1"
    specularExponent="20"
    lighting-color="#fff"
    result="spec"
  >
    <feDistantLight azimuth="135" elevation="45" />
  </feSpecularLighting>
  <feComposite in="spec" in2="SourceAlpha" operator="in" />
  <feComposite in="SourceGraphic" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
</filter>
```

| 光源               | 说明                           |
| ------------------ | ------------------------------ |
| `<feDistantLight>` | 平行光，参数 azimuth/elevation |
| `<fePointLight>`   | 点光源，参数 x/y/z             |
| `<feSpotLight>`    | 聚光灯                         |

## 11. feTurbulence 噪声

生成柏林噪声，常用于纹理、烟雾、水波。

```html
<filter id="texture">
  <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="3" />
  <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.2 0" />
  <feComposite operator="in" in2="SourceGraphic" />
</filter>
```

| 参数            | 说明                          |
| --------------- | ----------------------------- |
| `type`          | `fractalNoise` / `turbulence` |
| `baseFrequency` | 频率（越大颗粒越细）          |
| `numOctaves`    | 倍频数（细节层次）            |
| `seed`          | 随机种子                      |
| `stitchTiles`   | 平铺缝合                      |

## 12. feDisplacementMap 位移映射

根据另一张图的像素值扭曲当前图。

```html
<filter id="ripple">
  <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="2" result="noise" />
  <feDisplacementMap
    in="SourceGraphic"
    in2="noise"
    scale="20"
    xChannelSelector="R"
    yChannelSelector="G"
  />
</filter>
```

`scale=20` 表示根据噪声 R/G 通道值最大位移 20 像素。

## 13. feComposite 像素合成

`<feComposite>` 是滤镜链里的"胶水"：把两个输入按指定运算合成。前文阴影、发光示例中它反复出场。

```html
<feComposite in="输入1" in2="输入2" operator="over" k1="0" k2="1" k3="1" k4="0" result="out" />
```

| operator 值  | 说明                                        |
| ------------ | ------------------------------------------- |
| `over`       | 默认，in 叠在 in2 之上                      |
| `in`         | 取交集：in 中落在 in2 不透明区域内的部分    |
| `out`        | 反交集：in 中落在 in2 透明区域内的部分      |
| `atop`       | in 只显示在 in2 之上，in2 其余部分保留      |
| `xor`        | 异或：只保留两者互不重叠的部分              |
| `arithmetic` | 像素级线性组合 `k1·i1·i2 + k2·i1 + k3·i2 + k4` |

`arithmetic` 最常用的是 `k2=1, k3=1` 的"相加叠加"（前文光照示例用它把高光叠回原图）。

## 14. 滤镜组合实战

### 14.1 霓虹发光

```html
<filter id="neon" x="-50%" y="-50%" width="200%" height="200%">
  <feGaussianBlur stdDeviation="4" result="blur1" />
  <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2" />
  <feColorMatrix
    in="blur1"
    type="matrix"
    values="0 0 0 0 0.3
                         0 0 0 0 0.4
                         0 0 0 0 1
                         0 0 0 1.5 0"
    result="glow1"
  />
  <feColorMatrix
    in="blur2"
    type="matrix"
    values="0 0 0 0 0.3
                         0 0 0 0 0.4
                         0 0 0 0 1
                         0 0 0 0.8 0"
    result="glow2"
  />
  <feMerge>
    <feMergeNode in="glow2" />
    <feMergeNode in="glow1" />
    <feMergeNode in="SourceGraphic" />
  </feMerge>
</filter>
```

### 14.2 玻璃磨砂

```html
<filter id="frosted-glass">
  <feGaussianBlur stdDeviation="5" />
  <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.8 0.1" />
</filter>
```

## 15. 性能与兼容

### 15.1 性能注意

| 问题              | 解决方案                                       |
| ----------------- | ---------------------------------------------- |
| 滤镜区域过大      | 缩小 filter 的 width/height 到刚好覆盖效果范围 |
| 嵌套滤镜          | 避免在 filter 内再调用 filter                  |
| 大量元素应用滤镜  | 优先考虑预渲染为位图                           |
| 复杂 feTurbulence | numOctaves ≤ 3                                 |

### 15.2 浏览器兼容

- 现代浏览器全面支持 SVG 滤镜；`feDropShadow` 属于较新的 Filter Effects 模块基元，旧版 IE 不支持，需要兼容极老环境时用 feOffset + feFlood + feComposite 手动组合（见第 8 节）。
- 滤镜、渐变、蒙版等**文档内部效果**在 `<img>` 引用的 SVG 中照常工作；图片上下文禁用的是脚本与外部资源引用，别把这两类问题混为一谈。

## 16. 实战：玻璃质感卡片

```html
<svg viewBox="0 0 400 200">
  <defs>
    <linearGradient id="bg" x1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f5bd5" />
      <stop offset="100%" stop-color="#00b894" />
    </linearGradient>
    <filter id="card-shadow">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000" flood-opacity="0.2" />
    </filter>
    <filter id="card-glow">
      <feGaussianBlur stdDeviation="2" result="b" />
      <feMerge>
        <feMergeNode in="b" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  <!-- 背景 -->
  <rect width="400" height="200" fill="url(#bg)" />
  <!-- 玻璃卡片 -->
  <rect
    x="60"
    y="40"
    width="280"
    height="120"
    rx="16"
    fill="#fff"
    fill-opacity="0.15"
    filter="url(#card-shadow)"
  />
  <text
    x="200"
    y="100"
    text-anchor="middle"
    font-size="24"
    fill="#fff"
    font-weight="bold"
    filter="url(#card-glow)"
  >
    Glass Card
  </text>
</svg>
```

## 小结

初学者要点：

- 滤镜的最小闭环：`<defs>` 里写 `<filter id="f">`，元素挂 `filter="url(#f)"`，链里至少一个基元；不加 `in` 时默认处理原图。
- 90% 的效果由五个基元组合：`feGaussianBlur`（模糊）、`feDropShadow`（阴影）、`feColorMatrix`（调色）、`feComposite`（合成）、`feMerge`（叠层）。
- "效果边缘被切成直线"是 filter 默认区域（元素外扩 10%）不够大，扩大 x/y/width/height 即可。

进阶注意：

- 滤镜是逐像素运算，成本与 filter 区域面积成正比；模糊阴影类效果务必把区域收窄到刚好覆盖，或缩小模糊源再缩放。
- `result` / `in` 构成的是有向无环图而非严格线性链，善于命名中间结果能让复杂滤镜可读可调。
- feTurbulence 的结果与 seed 绑定，跨浏览器渲染细节可能有差异；对视觉一致性要求高的纹理，考虑预渲染位图。
- CSS `filter` 属性（blur/drop-shadow 等便捷函数）与 SVG 滤镜可以互转（`filter: url(#f)` 也能写在 CSS 里），轻量效果优先用 CSS 函数，复杂链才上 SVG。

