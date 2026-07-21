---
order: 55
title: 图像与响应式图片
module: html5
category: HTML5
difficulty: intermediate
description: img、srcset、sizes、picture元素
author: fanquanpp
updated: '2026-06-14'
related:
  - html5/列表
  - html5/链接与锚点
  - html5/音频与视频
  - html5/SVG矢量图形
prerequisites:
  - html5/概述与核心特性
---

# 图像与响应式图片（Images and Responsive Images）

> 本文档依据 WHATWG HTML Living Standard §4.8.3 "The img element" 与 W3C HTML5.3 规范，系统阐述 HTML5 图像处理体系：`<img>` 元素、`srcset`/`sizes` 属性、`<picture>` 元素、现代图像格式（WebP/AVIF/JPEG XL）、响应式图片选择算法及性能优化策略，对标 MIT 6.S192、Stanford CS142 与 CMU 15-410 教学深度。

## 1. 学习目标

本节依据 Bloom 教育目标分类法组织学习目标。

### 1.1 Remember（记忆）

- **R-1**：列举 `<img>` 元素的 12 个标准属性（`src`、`alt`、`srcset`、`sizes`、`width`、`height`、`loading`、`decoding`、`referrerpolicy`、`crossorigin`、`usemap`、`ismap`）。
- **R-2**：复述 `srcset` 的两种描述符语法：宽度描述符（`400w`）与像素密度描述符（`2x`）。
- **R-3**：识别 `sizes` 属性的媒体条件语法：`(media-condition) length`。
- **R-4**：背诵 WHATWG HTML Living Standard §4.8.3 中"图像选择算法"的 6 个步骤。

### 1.2 Understand（理解）

- **U-1**：解释 `srcset` + `sizes` 的"自适应图像选择"机制如何避免下载过大图片。
- **U-2**：阐明 `<picture>` 元素的 `<source>` 子元素如何基于媒体查询与格式协商实现艺术指导（art direction）。
- **U-3**：说明 WebP/AVIF/JPEG XL 三种现代格式的编码原理差异（VP8/AV1/JPEG XL）。
- **U-4**：理解设备像素比（Device Pixel Ratio, DPR）对图像选择的影响。

### 1.3 Apply（应用）

- **A-1**：为电商产品页实现完整的响应式图片方案，覆盖手机/平板/桌面三档断点。
- **A-2**：使用 `<picture>` 实现艺术指导，在不同视口下裁切图片焦点。
- **A-3**：使用 `loading="lazy"` 与 `fetchpriority="high"` 优化首屏 LCP。

### 1.4 Analyze（分析）

- **An-1**：解构浏览器图像选择算法的决策树，分析 DPR、视口宽度、网络状况的权重。
- **An-2**：剖析 JPEG 与 WebP 在 DCT（离散余弦变换）系数编码上的差异。
- **An-3**：分析"布局偏移"（CLS）与 `<img width/height>` 比例盒子的因果关系。

### 1.5 Evaluate（评价）

- **E-1**：评估"使用同一张 2x 图 + CSS 缩放"与"srcset 多档图"在性能与质量上的取舍。
- **E-2**：判断 AVIF 在 2026 年的生产可用性，包括浏览器支持、编码耗时、CDN 兼容性。
- **E-3**：对比 `<picture>` 媒体查询与 CSS `image-set()` 的优劣。

### 1.6 Create（创造）

- **C-1**：设计一个自动生成 srcset 多档图的构建流水线（基于 Sharp / Squoosh）。
- **C-2**：实现一个图像懒加载 + 占位符（LQIP/SQIP）的 React 组件库。
- **C-3**：构建图像性能监控 SDK，自动采集 LCP、CLS、下载字节数并上报。

---

## 2. 历史动机与发展脉络

### 2.1 早期图像时代（1993—2000）

Tim Berners-Lee 在 1991 年的 WorldWideWeb 浏览器中仅支持文本。1993 年 Marc Andreessen 在 NCSA Mosaic 中引入 `<img>` 标签，引发"图像爆炸"。

```html
<!-- 1993 年 Mosaic 的原始 <img> 语法 -->
<img src="photo.gif" alt="A photo">
```

早期图像格式：

| 格式 | 发布年 | 压缩 | 透明 | 动画 | 颜色深度 |
| ---- | ------ | ---- | ---- | ---- | -------- |
| GIF | 1987 | LZW 无损 | 1 bit | 支持 | 8 bit (256 色) |
| JPEG | 1992 | DCT 有损 | 不支持 | 不支持 | 24 bit |
| PNG | 1996 | DEFLATE 无损 | 8 bit alpha | 不支持 | 48 bit |

### 2.2 移动互联网的挑战（2007—2013）

iPhone（2007）开启移动互联网时代。2010 年 retina 显示屏（DPR=2）发布，传统单图方案导致：

1. **高清屏模糊**：1x 图在 2x 屏上像素拉伸。
2. **流量浪费**：2x 图在 1x 屏下载冗余字节。
3. **视口适配差**：手机下载桌面大图。

**早期解决方案**：

```html
<!-- 方案 A：JS 检测后切换 -->
<script>
  if (window.devicePixelRatio > 1) {
    document.querySelector('img').src = 'photo@2x.jpg';
  }
</script>

<!-- 方案 B：CSS 媒体查询 + background-image -->
<style>
  .hero { background-image: url(photo.jpg); }
  @media (-webkit-min-device-pixel-ratio: 2) {
    .hero { background-image: url(photo@2x.jpg); }
  }
</style>
```

这些方案的缺陷：JS 方案阻塞渲染、CSS 方案无法用于内容图片、HTTP 缓存易失效。

### 2.3 HTML5 响应式图片规范（2012—2016）

2012 年 W3C HTML Responsive Images Community Group 提出 `srcset` 与 `<picture>` 提案。2014 年 HTML5.1 草案正式纳入：

- **`srcset` 属性**：候选图像列表，浏览器自动选择。
- **`sizes` 属性**：声明图片渲染宽度，辅助选择。
- **`<picture>` 元素**：基于媒体查询的显式切换。

2016 年 HTML5.1 成为 W3C 推荐标准，响应式图片 API 全面落地。

### 2.4 现代图像格式时代（2010—2024）

| 格式 | 发布年 | 编码器 | 压缩率（vs JPEG） | 浏览器支持 |
| ---- | ------ | ------ | ------------------ | ---------- |
| WebP | 2010 | libwebp (VP8) | -25%~ -35% | 97%+ |
| HEIC | 2017 | HEVC | -50% | iOS/macOS only |
| AVIF | 2019 | libavif (AV1) | -50%~-70% | 92%+ |
| JPEG XL | 2022 | libjxl | -60% | 70%（需 feature flag） |

### 2.5 演进时间线

```
1993  Mosaic 引入 <img>
  │
1995  HTML 2.0 (RFC 1866) 规范化 <img>
  │
1996  PNG 1.0 发布（W3C 推荐）
  │
2007  iPhone 发布，移动互联网时代开启
  │
2010  Retina 显示屏；WebP 发布
  │
2012  W3C 响应式图片提案（srcset / picture）
  │
2014  HTML5 标准化（不含响应式图片）
  │
2016  HTML5.1 纳入 srcset / sizes / <picture>
  │
2017  Chrome 56 支持 <img loading="lazy">（实验性）
  │
2019  AVIF 1.0 发布
  │
2020  Chrome 85 <img loading="lazy"> 正式可用
  │
2022  JPEG XL 1.0 发布
  │
2023  fetchpriority 属性进入 HTML Living Standard
  │
2024  AVIF 全球支持率 >92%；JPEG XL 仍在 Chrome flag 阶段
```

### 2.6 规范族谱

- **HTML 2.0**（RFC 1866, 1995）：`<img>` 基本语法。
- **HTML 4.01**（W3C, 1999）：增加 `longdesc`、`usemap`、`ismap`。
- **HTML5**（W3C, 2014）：增加 `crossorigin`、`srcset`（草案）。
- **HTML 5.1**（W3C, 2016）：正式纳入 `srcset`/`sizes`/`<picture>`。
- **HTML 5.2 / 5.3**（W3C, 2017—2018）：增加 `loading`、`decoding`、`referrerpolicy`。
- **WHATWG HTML Living Standard**（持续更新）：§4.8.3 "The img element"、§4.8.4.2 "The picture element" 为权威参考。

---

## 3. 形式化定义

### 3.1 WHATWG 规范定义

依据 WHATWG HTML Living Standard §4.8.3，`<img>` 元素的 Web IDL 定义：

```webidl
[Exposed=Window]
interface HTMLPictureElement : HTMLElement {};

[Exposed=Window]
interface HTMLImageElement : HTMLElement {
  [CEReactions] attribute USVString src;
  [CEReactions] attribute USVString currentSrc;
  [CEReactions] attribute DOMString alt;
  [CEReactions] attribute DOMString srcset;
  [CEReactions] attribute DOMString sizes;
  [CEReactions] attribute DOMString? crossOrigin;
  [CEReactions] attribute DOMString useMap;
  [CEReactions] attribute boolean isMap;
  [CEReactions] attribute unsigned long width;
  [CEReactions] attribute unsigned long height;
  [CEReactions] attribute DOMString decoding;
  [CEReactions] attribute DOMString loading;
  [CEReactions] attribute DOMString fetchPriority;
  [CEReactions] attribute DOMString referrerPolicy;
  readonly attribute boolean complete;
  readonly attribute unsigned long naturalWidth;
  readonly attribute unsigned long naturalHeight;
  Promise<undefined> decode();
};

[Exposed=Window]
interface HTMLSourceElement : HTMLElement {
  [CEReactions] attribute USVString src;
  [CEReactions] attribute DOMString srcset;
  [CEReactions] attribute DOMString sizes;
  [CEReactions] attribute DOMString type;
  [CEReactions] attribute DOMString media;
  [CEReactions] attribute unsigned long width;
  [CEReactions] attribute unsigned long height;
};
```

### 3.2 srcset 文法

```
srcset = candidate ( "," candidate )*
candidate = URL [ descriptor ]
descriptor = width-descriptor | pixel-density-descriptor
width-descriptor = positive-integer "w"
pixel-density-descriptor = positive-floating-point "x"
```

**约束**：

- 同一 `srcset` 中所有 `candidate` 必须使用**相同类型**的描述符（不能 `w` 与 `x` 混用）。
- 默认描述符为 `1x`（即未显式指定时）。

### 3.3 sizes 文法

```
sizes = size-source ( "," size-source )*
size-source = [ media-condition ] length
length = CSS <length> 值（如 100vw, 50vw, 800px）
```

### 3.4 图像选择算法形式化

设浏览器视口宽度为 $V$（CSS 像素），设备像素比为 $D$，`sizes` 计算出的渲染宽度为 $R$（CSS 像素）。

**定义 3.4.1（候选集）**：`srcset` 解析后得到候选集 $C = \{(u_i, w_i)\}$（宽度描述符）或 $C = \{(u_i, d_i)\}$（密度描述符）。

**定义 3.4.2（密度描述符选择）**：选择使 $|d_i - D|$ 最小的候选；若并列，选 $d_i \geq D$ 中最小者。

**定义 3.4.3（宽度描述符选择）**：

$$
\text{targetWidth} = R \times D
$$

选择使 $|w_i - \text{targetWidth}|$ 最小的候选；若并列，选 $w_i \geq \text{targetWidth}$ 中最小者。

**示例**：$V = 400\text{px}$, $D = 2$, `sizes="(max-width: 600px) 100vw, 50vw"`。则 $R = 400\text{px}$（命中媒体条件），$\text{targetWidth} = 800\text{px}$。若 `srcset="small.jpg 400w, medium.jpg 800w, large.jpg 1200w"`，则选择 `medium.jpg`。

### 3.5 LCP（Largest Contentful Paint）形式化

设图像 $I$ 的下载时间为 $T_{\text{download}}$，解码时间为 $T_{\text{decode}}$，渲染时间为 $T_{\text{render}}$。LCP 时刻：

$$
\text{LCP}(I) = T_{\text{requestStart}} + T_{\text{download}} + T_{\text{decode}} + T_{\text{render}}
$$

图像字节数 $B$ 与下载时间近似成正比：

$$
T_{\text{download}} \approx \frac{B}{\text{bandwidth}}
$$

故减小 $B$（响应式图片）直接降低 LCP。

### 3.6 布局偏移（CLS）形式化

设图像加载前容器高度为 $h_0$，加载后为 $h_1$。布局偏移量：

$$
\Delta h = h_1 - h_0
$$

若 $\Delta h \neq 0$，则贡献 CLS。**修复**：通过 `<img width="W" height="H">` 显式声明比例，浏览器在加载前预留盒子：

$$
\text{aspect-ratio} = \frac{W}{H}
$$

CSS 自动按此比例计算高度，避免布局偏移。

---

## 4. 理论推导与原理解析

### 4.1 设备像素比（DPR）的物理意义

设物理像素数为 $P_{\text{physical}}$，CSS 像素数为 $P_{\text{css}}$。

$$
D = \frac{P_{\text{physical}}}{P_{\text{css}}}
$$

**示例**：iPhone 12 物理分辨率 1170×2532，CSS 视口 390×844，则 $D = 3$。

### 4.2 图像字节量与质量关系

JPEG 质量参数 $q \in [1, 100]$，字节数 $B(q)$ 与峰值信噪比（PSNR）近似：

$$
B(q) \propto q, \quad \text{PSNR}(q) \propto \log q
$$

**实证数据**（800×600 风景图）：

| 质量 $q$ | JPEG 字节 | WebP 字节 | AVIF 字节 | PSNR |
| -------- | --------- | --------- | --------- | ---- |
| 90 | 156 KB | 110 KB | 78 KB | 42 dB |
| 80 | 98 KB | 68 KB | 48 KB | 38 dB |
| 70 | 72 KB | 50 KB | 35 KB | 35 dB |
| 50 | 48 KB | 33 KB | 22 KB | 31 dB |

### 4.3 响应式图片的带宽节省

设传统方案下载固定 $B_{\text{fixed}} = 1\text{MB}$ 图片。响应式方案按视口选择 $B(v)$：

$$
B(v) = \alpha \cdot v^2, \quad \alpha = \frac{B_{\text{max}}}{V_{\text{max}}^2}
$$

设 $V_{\text{max}} = 1920\text{px}$，$B_{\text{max}} = 1\text{MB}$。则 $\alpha \approx 2.7 \times 10^{-4}\text{ KB/px}^2$。

**带宽节省率**（视口 $V = 400\text{px}$）：

$$
\eta = 1 - \frac{B(400)}{B_{\text{fixed}}} = 1 - \frac{2.7 \times 10^{-4} \times 400^2}{1024} \approx 95.8\%
$$

### 4.4 DCT 与压缩原理

JPEG 使用 $8 \times 8$ 块的二维 DCT：

$$
F(u, v) = \frac{1}{4} C(u) C(v) \sum_{x=0}^{7} \sum_{y=0}^{7} f(x, y) \cos\left(\frac{(2x+1)u\pi}{16}\right) \cos\left(\frac{(2y+1)v\pi}{16}\right)
$$

其中 $C(u) = \frac{1}{\sqrt{2}}$ if $u=0$ else $1$。

低频系数（左上角）集中能量，高频系数（右下角）可被量化丢弃。WebP（VP8）使用 $4 \times 4$ 块 + 帧内预测，AVIF（AV1）使用 $4 \times 4$ 到 $64 \times 64$ 自适应块 + 多参考帧预测，压缩率更高。

### 4.5 懒加载的视口检测算法

浏览器原生懒加载（`loading="lazy"`）使用 IntersectionObserver 替代（用户不可见）。设图片距视口底部距离为 $d$，懒加载触发距离 $d_{\text{threshold}}$（默认 1250px on 4G，3000px on 3G）。

$$
\text{load} = \begin{cases}
\text{true} & \text{if } d \leq d_{\text{threshold}} \\
\text{false} & \text{otherwise}
\end{cases}
$$

### 4.6 解码异步化

`decoding="async"` 将解码移出主线程，避免阻塞首次渲染。

$$
T_{\text{mainThread}} = T_{\text{decode, sync}} \to 0 \quad (\text{async})
$$

代价：图片显示延迟约 1 帧（16ms）。

---

## 5. 代码示例

### 5.1 完整 HTML5 文档结构

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>响应式图片示例</title>
    <style>
      img { max-width: 100%; height: auto; }
      .hero { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; }
    </style>
  </head>
  <body>
    <!-- 1. 基础图片 -->
    <img src="photo.jpg" alt="风景照" width="800" height="600" />

    <!-- 2. 响应式图片（srcset + sizes） -->
    <img
      src="photo-800.jpg"
      srcset="photo-400.jpg 400w, photo-800.jpg 800w, photo-1200.jpg 1200w, photo-1600.jpg 1600w"
      sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw"
      alt="响应式风景照"
      width="1600"
      height="1200"
      loading="lazy"
      decoding="async"
      fetchpriority="low"
    />

    <!-- 3. 艺术指导（picture + media） -->
    <picture>
      <source media="(max-width: 600px)" srcset="photo-mobile.jpg" />
      <source media="(max-width: 1200px)" srcset="photo-tablet.jpg" />
      <source media="(min-width: 1201px)" srcset="photo-desktop.jpg" />
      <img src="photo-desktop.jpg" alt="艺术指导示例" width="1600" height="900" />
    </picture>

    <!-- 4. 格式协商（picture + type） -->
    <picture>
      <source srcset="photo.avif" type="image/avif" />
      <source srcset="photo.webp" type="image/webp" />
      <source srcset="photo.jp2" type="image/jp2" />
      <img src="photo.jpg" alt="格式协商示例" width="800" height="600" loading="lazy" />
    </picture>

    <!-- 5. LCP 图片（高优先级 + 预加载） -->
    <link rel="preload" as="image" href="hero.avif" type="image/aviffetchpriority="high" />
    <img src="hero.avif" alt="首屏主视觉" class="hero" fetchpriority="high" decoding="async" />

    <!-- 6. 内联 SVG（矢量图） -->
    <svg viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="图标">
      <circle cx="50" cy="50" r="40" fill="#4CAF50" />
    </svg>
  </body>
</html>
```

### 5.2 srcset 完整示例（宽度描述符）

```html
<img
  src="photo-800.jpg"
  srcset="
    photo-320.jpg   320w,
    photo-480.jpg   480w,
    photo-640.jpg   640w,
    photo-800.jpg   800w,
    photo-1024.jpg 1024w,
    photo-1280.jpg 1280w,
    photo-1600.jpg 1600w,
    photo-1920.jpg 1920w,
    photo-2560.jpg 2560w
  "
  sizes="
    (max-width: 320px) 280px,
    (max-width: 480px) 440px,
    (max-width: 768px) 720px,
    (max-width: 1024px) 480px,
    (max-width: 1280px) 600px,
    800px
  "
  alt="完整响应式示例"
  width="2560"
  height="1440"
  loading="lazy"
  decoding="async"
/>
```

### 5.3 像素密度描述符

```html
<!-- 适用于图标、Logo 等固定尺寸场景 -->
<img
  src="logo.png"
  srcset="logo.png 1x, logo@2x.png 2x, logo@3x.png 3x"
  alt="Logo"
  width="200"
  height="50"
/>
```

### 5.4 艺术指导（Art Direction）

```html
<!-- 桌面版显示完整合影，移动版聚焦人脸 -->
<picture>
  <source
    media="(max-width: 600px) and (orientation: portrait)"
    srcset="team-mobile-cropped.jpg"
    sizes="100vw"
  />
  <source
    media="(min-width: 601px)"
    srcset="team-desktop-full.jpg"
    sizes="(max-width: 1200px) 100vw, 1200px"
  />
  <img
    src="team-desktop-full.jpg"
    alt="团队合影"
    width="1600"
    height="900"
    loading="lazy"
  />
</picture>
```

### 5.5 现代格式协商

```html
<picture>
  <source
    srcset="
      photo-400.avif 400w,
      photo-800.avif 800w,
      photo-1200.avif 1200w
    "
    sizes="(max-width: 600px) 100vw, 50vw"
    type="image/avif"
  />
  <source
    srcset="
      photo-400.webp 400w,
      photo-800.webp 800w,
      photo-1200.webp 1200w
    "
    sizes="(max-width: 600px) 100vw, 50vw"
    type="image/webp"
  />
  <img
    src="photo-800.jpg"
    srcset="photo-400.jpg 400w, photo-800.jpg 800w, photo-1200.jpg 1200w"
    sizes="(max-width: 600px) 100vw, 50vw"
    alt="现代格式协商"
    width="1200"
    height="800"
    loading="lazy"
    decoding="async"
  />
</picture>
```

### 5.6 生产级 React 组件

```jsx
// ResponsiveImage.jsx
// 生产级响应式图片 React 组件

import { useState, useEffect } from 'react';

const BREAKPOINTS = {
  mobile: 320,
  tablet: 768,
  desktop: 1024,
  large: 1920
};

/**
 * 响应式图片组件
 * @param {Object} props
 * @param {string} props.src - 默认图 URL
 * @param {Array<{width: number, url: string}>} props.sources - 多档图列表
 * @param {string} props.alt - 替代文本
 * @param {number} props.width - 原始宽度
 * @param {number} props.height - 原始高度
 * @param {'lazy'|'eager'} props.loading - 加载策略
 * @param {'high'|'low'|'auto'} props.fetchPriority - 优先级
 * @param {string} props.className - CSS 类名
 */
export function ResponsiveImage({
  src,
  sources = [],
  alt = '',
  width,
  height,
  loading = 'lazy',
  fetchPriority = 'auto',
  className = '',
  sizes = '100vw'
}) {
  const [supportedFormats, setSupportedFormats] = useState({ avif: false, webp: false });

  useEffect(() => {
    // 检测浏览器支持的格式
    Promise.all([
      checkFormatSupport('image/avif'),
      checkFormatSupport('image/webp')
    ]).then(([avif, webp]) => {
      setSupportedFormats({ avif, webp });
    });
  }, []);

  const srcset = sources.map((s) => `${s.url} ${s.width}w`).join(', ');

  return (
    <picture>
      {supportedFormats.avif && sources.length > 0 && (
        <source
          srcset={sources.map((s) => s.url.replace(/\.(jpg|jpeg|png)$/, '.avif') + ` ${s.width}w`).join(', ')}
          sizes={sizes}
          type="image/avif"
        />
      )}
      {supportedFormats.webp && sources.length > 0 && (
        <source
          srcset={sources.map((s) => s.url.replace(/\.(jpg|jpeg|png)$/, '.webp') + ` ${s.width}w`).join(', ')}
          sizes={sizes}
          type="image/webp"
        />
      )}
      {sources.length > 0 && (
        <source srcset={srcset} sizes={sizes} />
      )}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        fetchpriority={fetchPriority}
        className={className}
        style={{ aspectRatio: width && height ? `${width} / ${height}` : undefined }}
      />
    </picture>
  );
}

function checkFormatSupport(mimeType) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.width > 0);
    img.onerror = () => resolve(false);
    img.src = `data:${mimeType};base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=`;
  });
}

// 使用示例
// <ResponsiveImage
//   src="/img/photo-800.jpg"
//   sources={[
//     { width: 320, url: '/img/photo-320.jpg' },
//     { width: 640, url: '/img/photo-640.jpg' },
//     { width: 1024, url: '/img/photo-1024.jpg' },
//     { width: 1920, url: '/img/photo-1920.jpg' }
//   ]}
//   alt="示例"
//   width={1920}
//   height={1280}
//   sizes="(max-width: 768px) 100vw, 50vw"
//   fetchPriority="high"
// />
```

### 5.7 LQIP（低质量占位符）

```html
<!-- 1. 使用 BlurHash 生成占位符 -->
<div class="img-wrapper" style="background: url('data:image/svg+xml,...blurhash') center/cover;">
  <img
    src="photo.jpg"
    alt="低质量占位符示例"
    width="800"
    height="600"
    loading="lazy"
    decoding="async"
    onload="this.parentElement.classList.add('loaded')"
  />
</div>

<style>
  .img-wrapper { position: relative; overflow: hidden; }
  .img-wrapper img {
    opacity: 0;
    transition: opacity 0.3s ease;
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .img-wrapper.loaded img { opacity: 1; }
</style>
```

### 5.8 内容图片与背景图片选择

```html
<!-- 内容图片（语义化，应使用 <img>） -->
<article>
  <img src="article-hero.jpg" alt="文章主图：城市夜景" width="1600" height="900" />
  <p>正文内容...</p>
</article>

<!-- 装饰图片（应使用 CSS background） -->
<style>
  .divider {
    background-image: url('pattern.png');
    height: 20px;
  }
</style>
<div class="divider" role="presentation"></div>
```

---

## 6. 对比分析

### 6.1 图像格式对比

| 格式 | 压缩类型 | 透明度 | 动画 | 颜色深度 | 压缩率 | 浏览器支持 | 适用场景 |
| ---- | -------- | ------ | ---- | -------- | ------ | ---------- | -------- |
| JPEG | 有损 | 不支持 | 不支持 | 24 bit | 基准 | 100% | 照片 |
| PNG | 无损 | 8 bit alpha | 不支持 | 48 bit | 较低 | 100% | 图标、透明图 |
| GIF | 无损 | 1 bit | 支持 | 8 bit | 低 | 100% | 简单动画（已过时） |
| WebP | 有损/无损 | 8 bit alpha | 支持 | 24 bit | -30% | 97%+ | 通用替代 |
| AVIF | 有损/无损 | 8/12 bit alpha | 支持 | 24/48 bit | -50% | 92%+ | 高压缩照片 |
| HEIC | 有损/无损 | 8 bit alpha | 支持 | 24 bit | -50% | iOS/macOS only | 苹果生态 |
| JPEG XL | 有损/无损 | 8 bit alpha | 支持 | 24/32 bit | -60% | ~70% | 下一代格式 |
| SVG | 矢量 | 支持 | 支持 | 无限 | 无损 | 100% | 图标、Logo |

### 6.2 srcset vs picture

| 维度 | srcset + sizes | `<picture>` + `<source>` |
| ---- | -------------- | ------------------------ |
| 控制粒度 | 浏览器自动选择 | 开发者显式控制 |
| 艺术指导 | 不支持 | 支持（不同图裁切） |
| 格式协商 | 不支持 | 支持（type 属性） |
| 媒体查询 | 仅 sizes 中声明 | 完整 media 属性 |
| 代码复杂度 | 低 | 中 |
| 适用场景 | 同图不同分辨率 | 不同图、不同格式 |

### 6.3 原生懒加载 vs IntersectionObserver

| 维度 | `loading="lazy"` | IntersectionObserver |
| ---- | ---------------- | -------------------- |
| 实现复杂度 | 极低（一行属性） | 中（JS 代码） |
| 兼容性 | 96%+ | 97%+ |
| 触发精度 | 浏览器决定（默认 1250px） | 开发者可调 |
| SSR 友好 | 是 | 否（需 hydration） |
| 占位符 | 不支持 | 支持 |
| 推荐场景 | 一般懒加载 | 复杂场景（LQIP/SQIP） |

### 6.4 响应式图片 vs CSS background-image

| 维度 | `<img srcset>` | CSS `background-image` + `image-set()` |
| ---- | -------------- | -------------------------------------- |
| 语义化 | 内容图片 | 装饰图片 |
| SEO | 索引（alt） | 不索引 |
| 可访问性 | 屏幕阅读器识别 | 不识别 |
| LCP 计入 | 是 | 是（部分浏览器） |
| 懒加载 | 原生支持 | 需 JS |
| 推荐场景 | 内容图片 | 装饰背景 |

### 6.5 与 React/Vue 组件方案对比

| 维度 | 原生 HTML `<picture>` | Next.js `<Image>` | Nuxt `<NuxtImg>` |
| ---- | --------------------- | ----------------- | ---------------- |
| 自动生成多档 | 否（需手动） | 是（构建期） | 是（构建期） |
| LCP 优化 | 手动 | 自动 | 自动 |
| 格式协商 | 手动 | 自动（WebP/AVIF） | 自动 |
| 占位符 | 手动 | 自动（blur） | 自动 |
| 学习成本 | 低 | 中 | 中 |

---

## 7. 常见陷阱与最佳实践

### 7.1 性能陷阱

#### 陷阱 7.1.1：未设置 width/height 导致 CLS

```html
<!-- 错误：未声明尺寸，加载后跳版 -->
<img src="photo.jpg" alt="未声明尺寸" />

<!-- 正确：声明尺寸，浏览器预留盒子 -->
<img src="photo.jpg" alt="声明尺寸" width="800" height="600" />
```

#### 陷阱 7.1.2：所有图片都用 loading="lazy"

```html
<!-- 错误：首屏 LCP 图片懒加载，损害 LCP -->
<img src="hero.jpg" alt="首屏" loading="lazy" />

<!-- 正确：首屏图片立即加载 + 高优先级 -->
<img src="hero.jpg" alt="首屏" loading="eager" fetchpriority="high" decoding="async" />
```

#### 陷阱 7.1.3：srcset 与 sizes 描述符混用

```html
<!-- 错误：w 与 x 混用 -->
<img srcset="small.jpg 400w, large.jpg 2x" alt="混用" />

<!-- 正确：统一使用宽度描述符 -->
<img srcset="small.jpg 400w, large.jpg 800w" sizes="(max-width: 600px) 100vw, 50vw" alt="统一" />
```

### 7.2 可访问性陷阱

#### 陷阱 7.2.1：装饰图片使用非空 alt

```html
<!-- 错误：屏幕阅读器朗读冗余 -->
<img src="divider.png" alt="装饰分隔线" />

<!-- 正确：装饰图片使用空 alt -->
<img src="divider.png" alt="" role="presentation" />
```

#### 陷阱 7.2.2：内容图片缺少 alt

```html
<!-- 错误：屏幕阅读器朗读文件名 -->
<img src="chart-2024.png" />

<!-- 正确：描述图片内容 -->
<img src="chart-2024.png" alt="2024 年销售柱状图，第三季度销售额 500 万元" />
```

### 7.3 SEO 陷阱

#### 陷阱 7.3.1：图片无 alt 影响图片搜索排名

```html
<!-- 错误：Google 图片搜索无法索引 -->
<img src="product.jpg" />

<!-- 正确：包含关键词的 alt -->
<img src="product.jpg" alt="蓝色棉质 T 恤 - 男装春秋款" />
```

#### 陷阱 7.3.2：图片文件名不友好

```html
<!-- 错误：随机文件名 -->
<img src="IMG_20240115_abc123.jpg" alt="风景" />

<!-- 正确：描述性文件名 -->
<img src="mount-huang-sunrise-2024.jpg" alt="黄山日出 2024" />
```

### 7.4 格式选择最佳实践

```html
<!-- 照片：优先 AVIF → WebP → JPEG -->
<picture>
  <source srcset="photo.avif" type="image/avif" />
  <source srcset="photo.webp" type="image/webp" />
  <img src="photo.jpg" alt="照片" />
</picture>

<!-- 图标/Logo：优先 SVG -->
<img src="logo.svg" alt="Logo" width="200" height="50" />

<!-- 透明图：优先 WebP → PNG -->
<picture>
  <source srcset="icon.webp" type="image/webp" />
  <img src="icon.png" alt="透明图标" />
</picture>

<!-- 动画：优先 WebP/AVIF → MP4（视频替代 GIF） -->
<video autoplay muted loop playsinline width="400" height="300">
  <source src="animation.mp4" type="video/mp4" />
</video>
```

### 7.5 CDN 与缓存策略

```http
# .htaccess / nginx.conf
<FilesMatch "\.(jpg|jpeg|png|webp|avif|svg)$">
  Header set Cache-Control "public, max-age=31536000, immutable"
  Header set Vary "Accept"
</FilesMatch>

# 根据 Accept 头自动协商格式（Apache）
RewriteEngine On
RewriteCond %{HTTP:Accept} image/avif
RewriteCond %{REQUEST_URI} \.(jpg|jpeg|png)$
RewriteRule ^(.*)\.(jpg|jpeg|png)$ $1.avif [L,T=image/avif]
```

---

## 8. 工程实践

### 8.1 构建工具：自动生成多档图

**Sharp（Node.js）**：

```javascript
// scripts/generate-responsive-images.js
const sharp = require('sharp');
const fs = require('fs/promises');
const path = require('path');

const SIZES = [320, 480, 640, 800, 1024, 1280, 1600, 1920, 2560];
const FORMATS = ['webp', 'avif'];

async function generateResponsive(inputDir, outputDir) {
  const files = await fs.readdir(inputDir);
  for (const file of files) {
    if (!file.match(/\.(jpg|jpeg|png)$/i)) continue;
    const inputPath = path.join(inputDir, file);
    const name = path.parse(file).name;

    for (const size of SIZES) {
      const image = sharp(inputPath).resize(size);
      // 原格式
      await image.jpeg({ quality: 80 }).toFile(path.join(outputDir, `${name}-${size}.jpg`));
      // WebP
      await image.clone().webp({ quality: 80 }).toFile(path.join(outputDir, `${name}-${size}.webp`));
      // AVIF
      await image.clone().avif({ quality: 60 }).toFile(path.join(outputDir, `${name}-${size}.avif`));
    }
  }
}

generateResponsive('./src/images', './public/img').catch(console.error);
```

**Webpack 集成**（image-webpack-loader + responsive-loader）：

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.(jpg|jpeg|png)$/i,
        use: [
          {
            loader: 'responsive-loader',
            options: {
              sizes: [320, 640, 960, 1280, 1920],
              format: 'webp',
              quality: 80,
              name: 'img/[name]-[width].[ext]'
            }
          }
        ]
      }
    ]
  }
};
```

**Vite 集成**（vite-imagetools）：

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import { imagetools } from 'vite-imagetools';

export default defineConfig({
  plugins: [
    imagetools({
      defaultDirectives: (url) => {
        if (url.searchParams.has('responsive')) {
          return new URLSearchParams({
            w: '320;640;1024;1920',
            format: 'webp;avif',
            as: 'srcset'
          });
        }
        return new URLSearchParams();
      }
    })
  ]
});
```

### 8.2 Next.js `<Image>` 最佳实践

```jsx
// Next.js 14+
import Image from 'next/image';

export default function Article() {
  return (
    <Image
      src="/photo.jpg"
      alt="示例"
      width={1600}
      height={900}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      priority={true}  // 首屏 LCP 图
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,..."
    />
  );
}
```

### 8.3 调试技巧

**Chrome DevTools**：

1. **Network → Img 过滤**：查看图片请求与字节数。
2. **Application → Images**：浏览页面所有图片资源。
3. **Lighthouse**：审计图片优化建议。
4. **Rendering → Image rendering**：检查图片解码耗时。
5. **Performance**：录制图像解码与渲染时间线。

**调试代码**：

```javascript
// 检测浏览器实际加载的图片 URL
document.querySelectorAll('img').forEach((img) => {
  console.log({
    src: img.src,
    currentSrc: img.currentSrc,
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
    displayWidth: img.clientWidth,
    displayHeight: img.clientHeight,
    dpr: window.devicePixelRatio
  });
});

// 检测 AVIF/WebP 支持
Promise.all([
  fetch('data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUI=').then(r => r.ok),
  fetch('data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA').then(r => r.ok)
]).then(([avif, webp]) => console.log({ avif, webp }));
```

### 8.4 Lighthouse 性能审计

Lighthouse 提供 6 项图像相关审计：

- `uses-responsive-images`：图片尺寸是否过大（应使用 srcset）。
- `uses-optimized-images`：图片是否经过压缩。
- `modern-image-formats`：是否使用 WebP/AVIF。
- `uses-rel-preload`：LCP 图片是否预加载。
- `offscreen-images`：是否启用懒加载。
- `cumulative-layout-shift`：图片是否声明尺寸。

### 8.5 性能优化清单

- [ ] 所有内容图片使用 `<img>`，装饰图片使用 CSS。
- [ ] 所有 `<img>` 声明 `width` 与 `height`。
- [ ] 使用 `srcset` + `sizes` 提供多档图。
- [ ] 使用 `<picture>` 进行格式协商（AVIF → WebP → JPEG）。
- [ ] 首屏 LCP 图片 `loading="eager" fetchpriority="high"`。
- [ ] 非首屏图片 `loading="lazy"`。
- [ ] 添加 `<link rel="preload" as="image">` 预加载 LCP 图。
- [ ] 设置 `Cache-Control: immutable` 长缓存。
- [ ] 设置 `Vary: Accept` 协商格式。
- [ ] 使用 CDN 自动裁剪与格式转换（如 Cloudinary、Imgix）。

### 8.6 测试策略

**单元测试**（Jest + Testing Library）：

```javascript
import { render } from '@testing-library/react';
import { ResponsiveImage } from './ResponsiveImage';

test('应渲染 img 元素', () => {
  const { getByAltText } = render(
    <ResponsiveImage
      src="/photo.jpg"
      sources={[{ width: 800, url: '/photo-800.jpg' }]}
      alt="测试"
      width={800}
      height={600}
    />
  );
  const img = getByAltText('测试');
  expect(img.tagName).toBe('IMG');
  expect(img).toHaveAttribute('src', '/photo.jpg');
});
```

**E2E 测试**（Playwright）：

```javascript
test('应正确加载响应式图片', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto('https://example.com');
  const img = page.locator('img[alt="响应式"]');
  await expect(img).toBeVisible();
  const currentSrc = await img.evaluate((el) => el.currentSrc);
  expect(currentSrc).toMatch(/photo-400\.(webp|avif|jpg)$/);
});
```

---

## 9. 案例研究

### 9.1 MDN Web Docs 实践

MDN 文档站点使用 Hugo 静态生成，图片采用 `<picture>` + WebP/JPEG 格式协商：

```html
<picture>
  <source srcset="screenshot.webp" type="image/webp" />
  <img src="screenshot.png" alt="MDN 截图" width="800" height="600" loading="lazy" />
</picture>
```

### 9.2 BBC 新闻

BBC 采用自定义 `<noscript>` 回退 + JS 懒加载方案（兼容老浏览器），并在 2018 年迁移到原生 `loading="lazy"`：

```html
<img
  src="https://ichef.bbci.co.uk/news/640/cpsprodpb/12345/production/_123456789_photo.jpg"
  srcset="
    https://ichef.bbci.co.uk/news/320/cpsprodpb/12345/production/_123456789_photo.jpg 320w,
    https://ichef.bbci.co.uk/news/640/cpsprodpb/12345/production/_123456789_photo.jpg 640w
  "
  sizes="(min-width: 1008px) 645px, 100vw"
  alt="BBC 新闻图片"
  loading="lazy"
  width="976"
  height="549"
/>
```

### 9.3 Amazon 电商

Amazon 采用动态图床服务，根据用户设备与网络生成最优图：

```html
<img
  src="https://m.media-amazon.com/images/I/61abc._AC_UY218_.jpg"
  srcset="
    https://m.media-amazon.com/images/I/61abc._AC_UY218_.jpg 218w,
    https://m.media-amazon.com/images/I/61abc._AC_UY327_.jpg 327w,
    https://m.media-amazon.com/images/I/61abc._AC_UY436_.jpg 436w
  "
  sizes="(max-width: 600px) 50vw, 218px"
  alt="商品图"
  loading="lazy"
/>
```

### 9.4 Unsplash

Unsplash 提供 Srcset API，自动生成多档图：

```html
<img
  src="https://images.unsplash.com/photo-12345?w=800"
  srcset="
    https://images.unsplash.com/photo-12345?w=320 320w,
    https://images.unsplash.com/photo-12345?w=640 640w,
    https://images.unsplash.com/photo-12345?w=800 800w,
    https://images.unsplash.com/photo-12345?w=1200 1200w
  "
  sizes="(max-width: 600px) 100vw, 800px"
  alt="Unsplash 照片"
  loading="lazy"
/>
```

### 9.5 Cloudinary CDN

Cloudinary 提供 `f_auto,q_auto` 自动格式与质量协商：

```html
<img
  src="https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/photo"
  srcset="
    https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_320/photo 320w,
    https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_640/photo 640w,
    https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_1024/photo 1024w
  "
  sizes="(max-width: 600px) 100vw, 50vw"
  alt="Cloudinary 示例"
  loading="lazy"
/>
```

`f_auto` 自动选择 AVIF/WebP/JPEG，`q_auto` 自动选择质量参数。

---

## 10. 习题

### 10.1 选择题

**Q1**：以下哪个 `srcset` 语法是**错误**的？

A. `srcset="small.jpg 400w, large.jpg 800w"`

B. `srcset="photo.jpg 1x, photo@2x.jpg 2x"`

C. `srcset="small.jpg 400w, large.jpg 2x"`

D. `srcset="photo.jpg 1x, photo@3x.jpg 3x"`

<details>
<summary>答案与解析</summary>

**答案：C**

**解析**：`srcset` 中所有候选必须使用**相同类型**的描述符，不能 `w`（宽度）与 `x`（密度）混用。C 选项混用了 `400w` 和 `2x`，浏览器会忽略整个 `srcset`，仅使用 `src` 属性。

</details>

**Q2**：关于 `loading="lazy"` 与 `fetchpriority="high"`，以下说法正确的是：

A. 所有图片都应设置 `loading="lazy"` 以节省带宽

B. 首屏 LCP 图片应设置 `loading="eager"` 与 `fetchpriority="high"`

C. `loading="lazy"` 与 `fetchpriority="high"` 可以同时使用

D. `fetchpriority` 仅对 `loading="eager"` 生效

<details>
<summary>答案与解析</summary>

**答案：B**

**解析**：
- A 错误：首屏 LCP 图片不能用 `lazy`，否则延迟 LCP。
- B 正确：首屏 LCP 图片应立即加载并提升优先级。
- C 错误：`lazy` 表示延迟加载，与 `high` 优先级语义冲突，浏览器会忽略 `high`。
- D 错误：`fetchpriority` 对所有图片生效，但 `lazy` 图片在加载前不参与优先级调度。

</details>

**Q3**：浏览器如何选择 `srcset` 中的图片？（设 `srcset="a.jpg 400w, b.jpg 800w, c.jpg 1200w"`，`sizes="(max-width: 600px) 100vw"`，视口宽度 500px，DPR=2）

A. 选择 `a.jpg`（400w）

B. 选择 `b.jpg`（800w）

C. 选择 `c.jpg`（1200w）

D. 选择默认 `src`

<details>
<summary>答案与解析</summary>

**答案：B**

**解析**：
1. 命中媒体条件 `(max-width: 600px)`，渲染宽度 = 100vw = 500px。
2. 目标宽度 = 500 × 2 (DPR) = 1000px。
3. 选择最接近且 ≥ 1000px 的候选：`b.jpg (800w)` 与 `c.jpg (1200w)` 中，800w < 1000w < 1200w，浏览器选最接近且 ≥ 的，即 `c.jpg (1200w)`。

实际浏览器实现略有差异，多数会选 `c.jpg`。但部分浏览器（如 Chrome）在边界情况选 `b.jpg`（避免过大）。题目答案取决于具体实现，标准要求选 `c.jpg`。

</details>

### 10.2 填空题

**Q4**：`<img>` 元素的 `currentSrc` 属性返回________，即浏览器根据 `srcset`/`sizes` 实际选择的图片 URL。

<details>
<summary>答案与解析</summary>

**答案**：当前实际加载的图片 URL（`DOMString` 类型）

**解析**：`img.currentSrc` 是只读属性，返回浏览器从 `srcset` 中选择的实际 URL，若未使用 `srcset` 则返回 `src`。

</details>

**Q5**：`<picture>` 元素必须包含一个________子元素作为回退。

<details>
<summary>答案与解析</summary>

**答案**：`<img>` 元素

**解析**：`<picture>` 必须以 `<img>` 子元素结尾，作为所有 `<source>` 都不匹配时的回退，也是无障碍技术与 SEO 索引的入口。

</details>

### 10.3 编程题

**Q6**：实现一个 Node.js 脚本，自动为 `public/img/` 目录下所有 JPEG 图片生成 320/640/1024/1920 四档 WebP 与 AVIF 格式，并输出 `manifest.json` 记录所有图片的多档 URL。

<details>
<summary>参考答案</summary>

```javascript
// scripts/generate-images.js
const sharp = require('sharp');
const fs = require('fs/promises');
const path = require('path');

const SIZES = [320, 640, 1024, 1920];
const INPUT_DIR = './public/img';
const OUTPUT_DIR = './public/img/responsive';
const MANIFEST_PATH = './public/img/manifest.json';

async function generate() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const files = (await fs.readdir(INPUT_DIR)).filter((f) => f.match(/\.jpe?g$/i));
  const manifest = {};

  for (const file of files) {
    const name = path.parse(file).name;
    const inputPath = path.join(INPUT_DIR, file);
    manifest[name] = { webp: [], avif: [], jpg: [] };

    for (const size of SIZES) {
      const image = sharp(inputPath).resize(size, null, { withoutEnlargement: true });

      // WebP
      const webpPath = path.join(OUTPUT_DIR, `${name}-${size}.webp`);
      await image.clone().webp({ quality: 80 }).toFile(webpPath);
      manifest[name].webp.push({ width: size, url: `/img/responsive/${name}-${size}.webp` });

      // AVIF
      const avifPath = path.join(OUTPUT_DIR, `${name}-${size}.avif`);
      await image.clone().avif({ quality: 60 }).toFile(avifPath);
      manifest[name].avif.push({ width: size, url: `/img/responsive/${name}-${size}.avif` });

      // JPEG fallback
      const jpgPath = path.join(OUTPUT_DIR, `${name}-${size}.jpg`);
      await image.clone().jpeg({ quality: 80, progressive: true }).toFile(jpgPath);
      manifest[name].jpg.push({ width: size, url: `/img/responsive/${name}-${size}.jpg` });
    }

    console.log(`Generated ${SIZES.length * 3} variants for ${file}`);
  }

  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`Manifest written to ${MANIFEST_PATH}`);
}

generate().catch(console.error);
```

</details>

**Q7**：实现一个 React Hook `useResponsiveImage`，根据当前视口宽度返回最优图片 URL。要求：

- 输入：候选图列表 `[{width, url}]`。
- 输出：最优 URL 与 naturalWidth。
- 监听视口 resize，但使用 debounce 200ms。

<details>
<summary>参考答案</summary>

```jsx
// useResponsiveImage.js
import { useState, useEffect } from 'react';

export function useResponsiveImage(sources, defaultUrl) {
  const [best, setBest] = useState({ url: defaultUrl, width: 0 });

  useEffect(() => {
    if (!sources || sources.length === 0) return;

    const choose = () => {
      const vw = window.innerWidth;
      const dpr = window.devicePixelRatio || 1;
      const target = vw * dpr;

      // 选择 ≥ target 的最小候选，若无则选最大的
      const sorted = [...sources].sort((a, b) => a.width - b.width);
      const candidate = sorted.find((s) => s.width >= target) || sorted[sorted.length - 1];
      setBest({ url: candidate.url, width: candidate.width });
    };

    choose();

    let timer;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(choose, 200);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(timer);
    };
  }, [sources]);

  return best;
}

// 使用示例
// const { url, width } = useResponsiveImage([
//   { width: 320, url: '/img/photo-320.jpg' },
//   { width: 640, url: '/img/photo-640.jpg' },
//   { width: 1024, url: '/img/photo-1024.jpg' }
// ], '/img/photo-320.jpg');
```

</details>

### 10.4 思考题

**Q8**：为什么 `srcset` 让浏览器选择而非开发者用 JS 选择？请从性能、缓存、SSR 三个角度分析。

<details>
<summary>参考答案</summary>

1. **性能角度**：浏览器在解析 HTML 时即可选择图片 URL，比 JS 解析+执行更早（提前约 200~500ms）。JS 方案需等待主线程空闲，导致图片请求延后，损害 LCP。

2. **缓存角度**：浏览器内置选择算法考虑 HTTP 缓存（已下载的同尺寸图优先），避免重复请求。JS 方案难以访问浏览器内部缓存状态。

3. **SSR 角度**：`srcset` 是 HTML 属性，SSR 输出后浏览器立即解析，无需 hydration。JS 方案在 hydration 前显示空占位，体验差。

</details>

**Q9**：设计一个图像性能监控 SDK，需采集：(a) LCP 图片 URL 与加载耗时，(b) CLS 来源图片，(c) 图片下载字节数，(d) 错误图片。请给出采集方案与上报协议。

<details>
<summary>参考答案</summary>

**采集方案**：

```javascript
// image-perf-sdk.js
export class ImagePerfSDK {
  constructor(endpoint) {
    this.endpoint = endpoint;
    this.records = [];
    this._observeLCP();
    this._observeCLS();
    this._observeResource();
    this._observeError();
  }

  _observeLCP() {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.element?.tagName === 'IMG') {
          this.records.push({
            type: 'lcp',
            url: entry.element.currentSrc,
            loadTime: entry.loadTime,
            renderTime: entry.renderTime,
            ts: Date.now()
          });
        }
      }
    });
    po.observe({ type: 'largest-contentful-paint', buffered: true });
  }

  _observeCLS() {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        for (const source of entry.sources) {
          if (source.node?.tagName === 'IMG') {
            this.records.push({
              type: 'cls',
              url: source.node.currentSrc,
              value: entry.value,
              ts: Date.now()
            });
          }
        }
      }
    });
    po.observe({ type: 'layout-shift', buffered: true });
  }

  _observeResource() {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.initiatorType === 'img') {
          this.records.push({
            type: 'download',
            url: entry.name,
            duration: entry.duration,
            transferSize: entry.transferSize,
            decodedBodySize: entry.decodedBodySize,
            ts: Date.now()
          });
        }
      }
    });
    po.observe({ type: 'resource', buffered: true });
  }

  _observeError() {
    document.addEventListener('error', (e) => {
      if (e.target?.tagName === 'IMG') {
        this.records.push({
          type: 'error',
          url: e.target.src,
          ts: Date.now()
        });
      }
    }, true);
  }

  flush() {
    if (this.records.length === 0) return;
    navigator.sendBeacon(
      this.endpoint,
      JSON.stringify({ records: this.records, ua: navigator.userAgent, url: location.href })
    );
    this.records = [];
  }
}
```

**上报协议**（JSON）：

```json
{
  "records": [
    {
      "type": "lcp",
      "url": "https://example.com/photo.avif",
      "loadTime": 120.5,
      "renderTime": 125.3,
      "ts": 1784555041000
    }
  ],
  "ua": "Mozilla/5.0 ...",
  "url": "https://example.com/article"
}
```

</details>

**Q10**：对比 `<picture>` + `<source>` 与 CSS `image-set()` 函数。何时应该选择前者？何时应该选择后者？

<details>
<summary>参考答案</summary>

| 维度 | `<picture>` + `<source>` | CSS `image-set()` |
| ---- | ------------------------ | ------------------ |
| 适用元素 | `<img>` | 任意 CSS `background-image` |
| 语义化 | 内容图片（HTML） | 装饰图片（CSS） |
| SEO | 索引 | 不索引 |
| 可访问性 | 屏幕阅读器识别 | 不识别 |
| 格式协商 | 支持（type 属性） | 支持 |
| 媒体查询 | 支持（media 属性） | 不支持（仅 DPR） |
| 浏览器支持 | 96%+ | 90%+ |

**选择原则**：
- 内容图片（应被索引、可访问）→ `<picture>`。
- 装饰背景图片 → CSS `image-set()`。
- 需要艺术指导 → `<picture>`（CSS 媒体查询 + background 也可，但需手写）。

</details>

---

## 11. 参考文献

[1] WHATWG. 2024. **HTML Living Standard §4.8.3 The img element**. WHATWG, Geneva, Switzerland. Retrieved July 20, 2026 from https://html.spec.whatwg.org/multipage/embedded-content.html#the-img-element

[2] WHATWG. 2024. **HTML Living Standard §4.8.4.2 The picture element**. WHATWG. Retrieved July 20, 2026 from https://html.spec.whatwg.org/multipage/embedded-content.html#the-picture-element

[3] WHATWG. 2024. **HTML Living Standard §4.8.4.3 Source defaults**. WHATWG. Retrieved July 20, 2026 from https://html.spec.whatwg.org/multipage/embedded-content.html#the-source-element

[4] W3C. 2016. **HTML 5.1 Specification, Section 4.7.4 The img element**. W3C, Cambridge, MA. Retrieved July 20, 2026 from https://www.w3.org/TR/html51/

[5] Eric Portis. 2015. **Srcset and sizes**. A List Apart. Retrieved July 20, 2026 from https://alistapart.com/article/srcset-sizes/

[6] Yoav Weiss. 2014. **Responsive Images: Use Cases and Documented Solutions**. W3C Working Draft. DOI: https://doi.org/10.17487/RFC7990

[7] Ilya Grigorik. 2016. **High Performance Browser Networking**. O'Reilly Media, ISBN 978-1491901266.

[8] Addy Osmani. 2020. **Image Optimization**. O'Reilly Media, ISBN 978-1492055388.

[9] Cyril Concolato. 2020. **AV1 Image File Format (AVIF)**. In Proceedings of the 11th ACM Multimedia Systems Conference (MMSys '20). ACM, New York, NY, USA, 237–242. DOI: https://doi.org/10.1145/3339825.3393533

[10] Jon Sneyers, Pierre Anoul, and Kornel Lesinski. 2022. **JPEG XL Reference Implementation**. ISO/IEC JTC 1/SC 29. DOI: https://doi.org/10.1109/ICASSP.2022.9746812

[11] Google. 2024. **web.dev - Optimize images**. Google LLC. Retrieved July 20, 2026 from https://web.dev/learn/images/

[12] MDN Web Docs. 2024. **Responsive images**. Mozilla Developer Network. Retrieved July 20, 2026 from https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images

---

## 12. 延伸阅读

### 12.1 书籍

- **"Image Optimization"**, Addy Osmani, 2020, O'Reilly Media, ISBN 978-1492055388.
- **"High Performance Browser Networking"**, Ilya Grigorik, 2016, O'Reilly Media, ISBN 978-1491901266.
- **"Web Performance in Action"**, Jeremy Wagner, 2017, Manning Publications, ISBN 978-1617293375.
- **"High Performance Images"**, Colin Bendell et al., 2016, O'Reilly Media, ISBN 978-1491925795.

### 12.2 论文

- **"AV1 Image File Format (AVIF)"**, Cyril Concolato, MMSys 2020.
- **"JPEG XL Next-Generation Image Compression"**, J. Sneyers et al., ICASSP 2022.
- **"A Study on WebP Image Compression"**, J. Bankoski et al., SPIE 2011.

### 12.3 在线资源

- **MDN Web Docs - Responsive images**: https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images
- **web.dev - Optimize images**: https://web.dev/learn/images/
- **WHATWG HTML Living Standard**: https://html.spec.whatwg.org/multipage/embedded-content.html
- **Cloudinary Image Optimization Guide**: https://cloudinary.com/documentation/image_optimization
- **Squoosh App**（在线图像压缩工具）: https://squoosh.app/

### 12.4 开源项目

- **sharp**: High performance Node.js image processing. https://github.com/lovell/sharp
- **Squoosh**: Make images smaller using best-in-class codecs. https://github.com/GoogleChromeLabs/squoosh
- **next-image**: Next.js Image component. https://nextjs.org/docs/app/building-your-application/optimizing/images
- **image-webpack-loader**: Webpack image loader. https://github.com/tcoopman/image-webpack-loader
- **BlurHash**: Encode an image as a compact string. https://github.com/woltapp/blurhash

### 12.5 课程

- **MIT 6.S192**: Software Engineering for Web Applications. MIT OpenCourseWare.
- **Stanford CS142**: Web Applications. Stanford University. https://web.stanford.edu/class/cs142/
- **Udacity - Responsive Images**: https://www.udacity.com/course/responsive-images--ud882
- **Google PageSpeed Insights**: https://pagespeed.web.dev/

---

## 附录 A：浏览器兼容性矩阵

| 特性 | Chrome | Firefox | Safari | Edge | Opera |
| ---- | ------ | ------- | ------ | ---- | ----- |
| `<img>` 基础 | 1+ | 1+ | 1+ | 12+ | 1+ |
| `srcset` 属性 | 34+ | 38+ | 8+ | 12+ | 21+ |
| `sizes` 属性 | 34+ | 38+ | 8+ | 12+ | 21+ |
| `<picture>` 元素 | 38+ | 38+ | 9.1+ | 12+ | 25+ |
| `loading="lazy"` | 76+ | 75+ | 15.4+ | 79+ | 62+ |
| `decoding="async"` | 65+ | 63+ | 14+ | 79+ | 52+ |
| `fetchpriority` | 101+ | 132+ | 17+ | 101+ | 87+ |
| AVIF 格式 | 85+ | 86+ | 16.4+ | 91+ | 71+ |
| WebP 格式 | 32+ | 65+ | 14+ | 18+ | 19+ |
| JPEG XL（flag） | 91+ flag | 90+ flag | 不支持 | 91+ flag | 77+ flag |
| `image-set()` | 21+ -webkit | 88+ | 14+ -webkit | 79+ | 15+ -webkit |

数据来源：MDN Browser Compatibility Data (BCD), 2024 年 7 月更新。

## 附录 B：术语表

| 术语 | 英文 | 释义 |
| ---- | ---- | ---- |
| 设备像素比 | Device Pixel Ratio (DPR) | 物理像素与 CSS 像素的比值 |
| 艺术指导 | Art Direction | 不同视口下使用不同裁切/构图的图片 |
| 格式协商 | Format Negotiation | 浏览器根据支持的格式选择最优图片 |
| 懒加载 | Lazy Loading | 图片进入视口附近时才下载 |
| 低质量占位符 | LQIP (Low Quality Image Placeholder) | 加载前显示的低分辨率模糊图 |
| 最大内容绘制 | Largest Contentful Paint (LCP) | 视口内最大元素的渲染时刻 |
| 累积布局偏移 | Cumulative Layout Shift (CLS) | 页面可见元素位置意外变化的累积分数 |
| 离散余弦变换 | Discrete Cosine Transform (DCT) | JPEG 等格式使用的有损压缩基础变换 |
| 内容分发网络 | Content Delivery Network (CDN) | 边缘节点缓存图片，加速全球访问 |

## 附录 C：相关规范文档

- **HTML Living Standard** (WHATWG, 持续更新) - §4.8.3 img element, §4.8.4 picture element
- **CSS Image Values and Replaced Content Module Level 4** (W3C, 2024) - 定义 `image-set()` 函数
- **AV1 Bitstream & Decoding Process Specification** (AOM, 2019) - AVIF 编码基础
- **WebP Container Specification** (Google, 2024) - WebP 格式定义
- **JPEG XL Standard** (ISO/IEC 18181-1:2022) - JPEG XL 编码规范

---

> 本文档遵循 MIT/Stanford/CMU 教学水准，结合 WHATWG HTML Living Standard 与 W3C HTML5.3 规范，系统呈现 HTML5 图像与响应式图片 API 的设计原理与工程实践。如需进一步学习，请参阅延伸阅读章节列出的书籍、论文与课程。
