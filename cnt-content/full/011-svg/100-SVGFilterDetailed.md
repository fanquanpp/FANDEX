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

## 知识点地图

- **知识类别**：SVG 滤镜（`<filter>` 与 fe 系列基元），像素级后处理，对应 MDN「Filters」指南主题。
- **解决什么问题**：填充、渐变、描边都是「按几何上色」，而阴影、模糊、发光、做旧、扫描线这类效果是「对已渲染像素再加工」——没有滤镜就只能用多层形状模拟，层数一多不可维护。滤镜是 SVG 里唯一能以「处理管线」思维写视觉效果的机制。
- **什么时候用到**：阴影与发光（按钮、卡片、霓虹）；氛围与质感（噪点、纸张纹理、玻璃磨砂）；图像调色（单色化、对比度、夜景蓝调）；动效中的变形（displacement 波纹）。
- **本篇主线（滤镜链心智模型）**：把 `<filter>` 想象成一条流水线——`SourceGraphic`（原图）从入口进来，每个 fe 基元吃进 `in` 指定的上游产物、吐出可用 `result` 命名的半成品，最后一个基元的输出就是整个滤镜的结果。写滤镜 = 设计流水线的工位顺序；看不懂别人的滤镜 = 顺着 in/result 把有向图走一遍。第 14 节组合实战与本文「工程场景」节的两条滤镜链都按这个模型逐工位讲解。
- **本篇不讲**：CSS filter 属性的速记语法（drop-shadow() 等，与 SVG 滤镜同源但只暴露少数效果）、canvas 的像素操作、着色器（引擎侧的对应物见 044-godot 的着色器篇）。

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

## 工程场景：两条真实滤镜链与性能分级

### 场景一：骨架屏 shimmer（扫光占位）

真实背景：内容站首屏在数据到达前渲染骨架占位块，要求占位块上有一道缓慢扫过的斜向高光。滤镜链的职责是把一块纯灰矩形加工成「会流动的金属感」：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 100">
  <defs>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#e9ecef" />
      <stop offset="0.5" stop-color="#f8f9fa" />
      <stop offset="1" stop-color="#e9ecef" />
    </linearGradient>
    <clipPath id="skeleton-clip">
      <rect x="20" y="30" width="260" height="36" rx="8" />
    </clipPath>
    <filter id="shimmer" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="soft" />
      <feColorMatrix in="soft" type="saturate" values="0" result="gray" />
      <feComposite in="gray" in2="SourceGraphic" operator="in" />
    </filter>
  </defs>

  <!-- 骨架底块：滤镜只负责柔化质感 -->
  <rect x="20" y="30" width="260" height="36" rx="8" fill="url(#sheen)"
        filter="url(#shimmer)" />

  <!-- 扫光条：clipPath 限制在骨架块内，SMIL 位移驱动循环 -->
  <g clip-path="url(#skeleton-clip)">
    <rect x="-60" y="30" width="46" height="36" fill="#ffffff" opacity="0.75"
          transform="skewX(-20)">
      <animateTransform attributeName="transform" type="translate"
                        from="-60 0" to="360 0" dur="1.8s"
                        repeatCount="indefinite" additive="sum" />
    </rect>
  </g>
</svg>
```

逐工位走一遍滤镜链（对应知识点地图的流水线模型）：

- 工位 1 `feGaussianBlur in="SourceGraphic" result="soft"`：把原始矩形柔化，扫光边缘不生硬。`in` 缺省时自动取上一个基元的输出，**首基元缺省取 SourceGraphic**——省略 `in` 是可行写法，但显式写出更利于他人顺着链读；
- 工位 2 `feColorMatrix in="soft" type="saturate" values="0" result="gray"`：饱和度归零，防止渐变色带进杂色，输出纯灰阶柔光；
- 工位 3 `feComposite in="gray" in2="SourceGraphic" operator="in"`：用原图形状当蒙版，把柔光「装回」圆角矩形轮廓内——没有这一步，模糊会溢出圆角边界成毛边。**工位顺序换成先灰后模糊**视觉几乎一样，但先灰再模糊计算量相同、可读性更顺；**删掉工位 3** 则圆角外出现光晕污染，这是骨架屏「脏边」的常见来源；
- 动画驱动：真正的扫光是 `animateTransform` 平移一道白色斜条（或 SMIL/animate 现代替代：CSS 里对 rect 的 transform 加 keyframes），滤镜只负责质感。**滤镜动画（改 stdDeviation）每帧重算整条链，CSS/SMIL 位移动画只是移动已渲染结果**——性能差一个量级，扫光位移务必放在滤镜外层；
- 工程提示：整页几十个骨架块共用同一 `<defs>` 里的 filter 定义，滤镜本身零重复成本；但每个应用元素独立计算滤镜，占位块多于 20 个时改用「预渲染的半透明 PNG 占位图」更省（呼应 15.1 的性能注意）。

### 场景二：夜景蓝图效果（照片单色化 + 纸纹）

真实背景：智慧园区大屏要把实景照片处理成「工程蓝图」风格（单色蓝调 + 高对比 + 纸张噪纹）作为背景层，照片由运营上传、内容不可预知，只能运行时处理：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200">
  <defs>
    <filter id="blueprint" x="0" y="0" width="100%" height="100%">
      <feColorMatrix in="SourceGraphic" type="matrix"
        values="0.2 0.4 0.6 0 0
                0.2 0.4 0.6 0 0
                0.6 0.8 1.2 0 0
                0   0   0   1 0" result="mono" />
      <feComponentTransfer in="mono" result="contrast">
        <feFuncR type="gamma" exponent="1.8" amplitude="1.2" />
        <feFuncG type="gamma" exponent="1.8" amplitude="1.2" />
        <feFuncB type="gamma" exponent="1.8" amplitude="1.2" />
      </feComponentTransfer>
      <feTurbulence type="fractalNoise" baseFrequency="0.9"
                    numOctaves="2" result="paper" />
      <feComposite in="contrast" in2="paper" operator="arithmetic"
                   k1="0" k2="1" k3="0.12" k4="0" />
    </filter>
  </defs>
  <image href="/photos/campus.jpg" width="320" height="200"
         preserveAspectRatio="xMidYMid slice" filter="url(#blueprint)" />
</svg>
```

逐工位走一遍：

- 工位 1 feColorMatrix 自定义矩阵：R/G/B 三行取不同权重把彩色压成蓝调（蓝通道权重 1.2 最亮、红 0.2 最暗），第四列全 0 保持透明度。**换成 `type="saturate" values="0"`** 得到的是中性灰度而非蓝调——灰度再靠 feComponentTransfer 上色也行，但矩阵一步到位少一个工位；
- 工位 2 feComponentTransfer gamma 曲线：exponent 1.8 压暗中间调、amplitude 1.2 提亮亮部，合成「高对比」蓝图感。只调 exponent 会整体发黑，amplitude 把曲线重新拉回亮度区间，两个参数是成对的；
- 工位 3 feTurbulence：生成高频噪声当「纸张纹理」。numOctaves=2 足够纸纹，调到 4 以上只是烧性能（15.1 的规则）；baseFrequency 0.9 是细颗粒，调到 0.05 会变成云雾；
- 工位 4 feComposite arithmetic：`k3=0.12` 把 12% 的噪声叠进照片。**算式是 `k1*i1*i2 + k2*i1 + k3*i2 + k4`**，k2=1 保留原图全部、k3 加噪——想「减纸纹做旧」把 k3 换成 k1（乘法混合变暗）即可体验另一种质感；
- 性能分级实例：这条链在 320x200 的图上单帧成本可忽略；同样代码套在 1920x1080 全屏背景上，每次窗口 resize 都重算（滤镜结果不缓存于交互中），低端设备会掉帧。全屏用法应预渲染为位图或降低 filter 区域分辨率。

### 性能成本分级（写滤镜前先对价）

| 等级 | 基元/组合 | 典型成本 | 使用建议 |
| --- | --- | --- | --- |
| 低 | feOffset、feFlood、feMerge、feColorMatrix（预设） | 一次像素搬运/矩阵乘 | 页面可大量使用 |
| 中 | feGaussianBlur（小 stdDeviation）、feDropShadow、feComponentTransfer | 模糊核与像素面积成正比 | 限制应用元素数量，控制模糊半径 |
| 高 | feGaussianBlur（大半径）、feSpecularLighting、feComposite arithmetic | 随面积与参数陡增 | 仅用于焦点元素或预渲染 |
| 极高 | feTurbulence（多 octaves）、feDisplacementMap、动态参数动画 | 每帧全量重算 | 静态用后预渲染；动画改到滤镜外层 |

判读口径：成本随「滤镜区域面积 x 基元复杂度 x 是否逐帧变化」三项相乘。任何一项趋于零都值得追求——缩小 filter 区域（1.1 节）、降 octaves、把动画移出滤镜。

## 动手实践

任务一（热身）：把场景一 shimmer 滤镜链的工位 3 `feComposite operator="in"` 改为 `operator="out"`，预测并观察圆角矩形会发生什么，再用一句话总结 in 与 out 的语义。

任务二（进阶）：给场景二蓝图滤镜加第四个工位 `feDropShadow`（偏移 0、模糊 4），让照片像「贴在图纸上的照片」。写出它应插入的位置并说明理由。

任务三（挑战）：只允许改滤镜参数，把场景二的蓝图风格调成「老照片褐色调」（sepia：棕黄主调、低对比、强纸纹）。给出矩阵与 gamma 的参数方向，不必精确。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

任务一：`operator="in"` 是「柔光装进原图形状」（交集保留 in）；`"out"` 是「只留 in 中不在 in2 的部分」——柔光出现在矩形**外圈**、矩形本体消失，整块变成一团方形光晕。一句话：in 是「装进模子」，out 是「模子以外」。

任务二：放在 feComponentTransfer 之后、feTurbulence 之前：

```svg
<feDropShadow in="contrast" dx="0" dy="3" stdDeviation="4"
              flood-color="#001a4d" flood-opacity="0.6" result="shadowed" />
```

理由：阴影应作用于「调色后的照片」而不是最终叠了纸纹的整体——纸纹是全画面均匀材质，给材质投影会让噪声也带阴影，视觉上像玻璃脏了；最后一基元的输出必须改接 feComposite 的 in（原 `in="contrast"` 改 `in="shadowed"`）。

任务三：参数方向——矩阵改棕黄主调：R 行 `0.7 0.5 0.2 0 0.05`、G 行 `0.4 0.35 0.15 0 0.02`、B 行 `0.15 0.12 0.08 0 0`（红绿权重高、蓝权重低）；gamma 降对比：exponent 约 0.8（提中间调）、amplitude 约 0.9；纸纹加强：numOctaves 提到 3、feComposite 的 k3 提到 0.25。验收标准：画面整体偏棕黄、暗部不死黑、颗粒肉眼可见。

</details>

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

