---
order: 57
title: SVG
module: html5
category: HTML5
difficulty: intermediate
description: 基本形状、viewBox、路径、文本、滤镜
author: fanquanpp
updated: '2026-06-14'
related:
  - html5/图像与响应式图片
  - html5/音频与视频
  - html5/嵌入式内容
  - html5/progress与meter
  - svg/概述与环境配置
  - svg/坐标系与viewBox
prerequisites:
  - html5/概述与核心特性
---

## 1. SVG 基础

```html
<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="80" fill="blue" />
</svg>
```

## 2. viewBox 详解

`viewBox="min-x min-y width height"` 定义 SVG 的内部坐标系统：

```html
<svg width="400" height="300" viewBox="0 0 200 150">
  <rect x="0" y="0" width="100" height="75" fill="blue" />
</svg>
```

| preserveAspectRatio 值 | 说明                   |
| ---------------------- | ---------------------- |
| `xMidYMid meet`        | 居中，完整显示（默认） |
| `xMidYMid slice`       | 居中，裁剪填充         |
| `none`                 | 不保持比例             |

## 3. 基本形状

```html
<svg width="400" height="300">
  <rect x="10" y="10" width="100" height="60" rx="10" fill="blue" />
  <circle cx="200" cy="80" r="50" fill="red" />
  <ellipse cx="320" cy="80" rx="60" ry="30" fill="green" />
  <line x1="10" y1="150" x2="390" y2="150" stroke="black" />
  <polyline points="10,180 50,160 90,200" fill="none" stroke="purple" />
  <polygon points="200,180 240,220 160,220" fill="orange" />
</svg>
```

## 4. 路径 path

| 命令 | 说明       | 示例                  |
| ---- | ---------- | --------------------- |
| `M`  | 移动到     | `M 10 10`             |
| `L`  | 直线到     | `L 100 100`           |
| `C`  | 三次贝塞尔 | `C 20,20 40,20 50,10` |
| `Q`  | 二次贝塞尔 | `Q 50,0 100,50`       |
| `A`  | 弧线       | `A 25,25 0 0,1 50,25` |
| `Z`  | 闭合路径   | `Z`                   |

> 小写字母为相对坐标，大写字母为绝对坐标。

## 5. 文本

```html
<svg>
  <text x="20" y="50" font-size="24" fill="black">Hello SVG</text>
  <defs><path id="curve" d="M 50 150 Q 200 50, 350 150" /></defs>
  <text font-size="20"><textPath href="#curve">沿曲线排列的文字</textPath></text>
</svg>
```

## 6. 滤镜与渐变

```html
<svg>
  <defs>
    <filter id="blur"><feGaussianBlur stdDeviation="5" /></filter>
    <filter id="shadow"><feDropShadow dx="4" dy="4" stdDeviation="3" /></filter>
    <linearGradient id="lg" x1="0%" x2="100%">
      <stop offset="0%" stop-color="red" />
      <stop offset="100%" stop-color="blue" />
    </linearGradient>
  </defs>
  <rect x="50" y="50" width="100" height="80" fill="url(#lg)" filter="url(#shadow)" />
</svg>
```
