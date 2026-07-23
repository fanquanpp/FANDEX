---
order: 57
title: 渐变
module: css
category: CSS
difficulty: intermediate
description: 深入解析 CSS 渐变（linear-gradient、radial-gradient、conic-gradient）的规范、几何算法、颜色插值与工程实践
author: fanquanpp
updated: '2026-06-14'
related:
  - css/浮动与清除
  - css/层叠上下文
  - css/阴影
  - css/背景增强
  - css/颜色与色彩空间
prerequisites:
  - css/概述与基本语法
  - css/背景增强
  - css/颜色与色彩空间
---

# 渐变（Gradients）

> 本文以 W3C [CSS Images Module Level 3](https://www.w3.org/TR/css-images-3/) 与 [CSS Images Module Level 4](https://www.w3.org/TR/css-images-4/) 规范为基础，系统阐释 CSS 渐变（Gradients）的几何算法、颜色插值（Color Interpolation）、`linear-gradient` / `radial-gradient` / `conic-gradient` / `repeating-*` 的形式化定义，以及与 SVG 渐变、Tailwind / Bootstrap / Material Design 等框架实践的对接。内容涵盖从 CSS 3（2012）到 CSS Images Level 4（2024）的演进，提供生产级代码示例与工程化解决方案。

---

## 目录

1. [学习目标](#1-学习目标)
2. [历史动机与发展脉络](#2-历史动机与发展脉络)
3. [形式化定义](#3-形式化定义)
4. [理论推导与原理解析](#4-理论推导与原理解析)
5. [代码示例](#5-代码示例)
6. [对比分析](#6-对比分析)
7. [常见陷阱与最佳实践](#7-常见陷阱与最佳实践)
8. [工程实践](#8-工程实践)
9. [案例研究](#9-案例研究)
10. [习题](#10-习题)
11. [参考文献](#11-参考文献)
12. [延伸阅读](#12-延伸阅读)

---

## 1. 学习目标

完成本章学习后，读者应能够：

### 1.1 Remember（记忆）

- 准确复述 CSS 渐变的三种基本类型：`linear-gradient`（线性渐变）、`radial-gradient`（径向渐变）、`conic-gradient`（锥形渐变）。
- 列出 `linear-gradient` 的方向参数取值：`to top`、`to right`、`to bottom`（默认）、`to left`、`to top right`、`<angle>`（如 `45deg`）。
- 识别 `radial-gradient` 的尺寸关键字：`closest-side`、`farthest-side`、`closest-corner`、`farthest-corner`（默认）。
- 列出颜色插值色彩空间（CSS Images Level 4）：`sRGB`、`linearRGB`、`lab`、`lch`、`oklab`、`oklch`、`hsl`、`hwb`。

### 1.2 Understand（理解）

- 解释 `linear-gradient` 的「梯度线」（Gradient Line）几何模型：方向、长度、起点与终点。
- 阐述颜色插值（Color Interpolation）在 sRGB 与 Lab/LCH 色彩空间中的视觉差异，并论证为何 Lab/LCH 渐变更「平滑」。
- 论证 `radial-gradient` 的「渐变射线」（Gradient Ray）模型与尺寸关键字对最终形状的影响。
- 描述 `conic-gradient` 的「渐变弧」（Gradient Arc）模型，及其与 `radial-gradient` 的本质差异（角度 vs 距离）。

### 1.3 Apply（应用）

- 在生产代码中通过 `linear-gradient` 实现按钮、卡片、背景的视觉层次。
- 利用 `radial-gradient` 实现光晕、聚光灯、阴影等效果。
- 使用 `conic-gradient` 实现饼图、色轮、进度环。
- 在 `background-image` 中叠加多层渐变，实现复杂视觉效果。

### 1.4 Analyze（分析）

- 对比 CSS 渐变与 SVG `<linearGradient>` / `<radialGradient>` 的几何模型与性能差异。
- 拆解「色带效应」（Banding）的成因：8-bit 色彩量化与插值算法的局限。
- 评估 `repeating-linear-gradient` 在生成纹理（条纹、网格、棋盘）时的优劣。
- 分析 `background-clip: text` 配合渐变实现「渐变文字」的浏览器兼容性与可访问性影响。

### 1.5 Evaluate（评价）

- 在「CSS 渐变」与「SVG 渐变」之间权衡性能、可维护性、动画能力。
- 评价 `oklab` / `oklch` 色彩空间在 2024 年浏览器支持现状下的落地可行性。
- 反思渐变在设计系统（Design System）中的角色：是装饰还是语义？
- 评估「硬边界」（Hard Stops）在视觉设计中的滥用与合理使用场景。

### 1.6 Create（创造）

- 设计一套基于 CSS Variables 的渐变设计令牌（Gradient Tokens），支持主题切换。
- 编写 PostCSS 插件，将 `linear-gradient(to right, red, blue)` 自动转换为 `oklab` 插值。
- 提出面向 CSS Working Group 的改进建议（如「网格渐变」`mesh-gradient` 假想）。
- 构建渐变可视化工具，实时调整角度、色标、插值空间并预览效果。

---

## 2. 历史动机与发展脉络

### 2.1 CSS 3（2012）：渐变的诞生

CSS 渐变最初由 Apple 于 2008 年在 WebKit 中以 `-webkit-gradient(linear, ...)` 形式实现，语法较为复杂。2012 年，[CSS Images Module Level 3](https://www.w3.org/TR/css-images-3/) 将其标准化为现代语法：

```css
background: linear-gradient(to right, red, blue);
background: radial-gradient(circle at center, red, blue);
```

CSS 3 渐变的核心贡献：

1. **无需图片资源**：渐变作为 CSS 值，无需 HTTP 请求，提升性能。
2. **可缩放**：矢量特性，任意尺寸下保持清晰。
3. **可动画**：通过 `background-position` 或 CSS Houdini 实现渐变动画（虽有限制）。

### 2.2 `conic-gradient` 的引入（2017）

`conic-gradient`（锥形渐变）由 Lea Verou 提议，2017 年在 Chrome 69 与 Safari 12.1 中实现。它填补了 CSS 渐变在「角度方向」上的空白：

```css
background: conic-gradient(red, yellow, lime, aqua, blue, magenta, red);
```

锥形渐变的典型应用：饼图、色轮、进度环。

### 2.3 CSS Images Module Level 4（2020-2024）

[CSS Images Module Level 4](https://www.w3.org/TR/css-images-4/) 引入了多项重要改进：

1. **色彩空间插值**：`in oklab`、`in srgb` 等关键字，允许指定插值色彩空间。
2. **双色标语法**：`red 25% 50%` 表示红色从 25% 持续到 50%（硬边界）。
3. **`interpolar` 关键字**：精细控制色相插值（`shorter`、`longer`、`increasing`、`decreasing`）。

```css
/* Level 4 新语法 */
background: linear-gradient(in oklab, red, blue);
background: linear-gradient(in oklch longer hue, red, blue);
background: linear-gradient(red 25%, blue 50% 75%, green);
```

### 2.4 色彩空间的演进

| 年份 | 事件 | 核心变化 |
| --- | --- | --- |
| 2008 | WebKit 首次实现渐变 | `-webkit-gradient(linear, ...)` 语法 |
| 2012 | CSS Images Level 3 推荐 | `linear-gradient` / `radial-gradient` 标准化 |
| 2017 | `conic-gradient` 浏览器支持 | 锥形渐变落地 |
| 2020 | CSS Color Level 4 草案 | 引入 `oklab` / `oklch` 色彩空间 |
| 2022 | CSS Images Level 4 草案 | `in oklab` 插值语法 |
| 2023 | `lab()` / `lch()` / `oklab()` 浏览器支持 | 现代色彩空间普及 |
| 2024 | Display P3 与 Rec2020 支持 | 广色域渐变 |

### 2.5 演进时间线

| 年份 | 规范/事件 | 核心变化 |
| --- | --- | --- |
| 2008 | WebKit 渐变实现 | 私有语法 |
| 2012 | CSS Images Level 3 | `linear-gradient` / `radial-gradient` 标准化 |
| 2017 | `conic-gradient` | 锥形渐变（Chrome 69+, Safari 12.1+） |
| 2019 | 双色标语法 | `red 25% 50%` 硬边界 |
| 2020 | `in oklab` 插值 | Lab/LCH 色彩空间插值 |
| 2022 | CSS Images Level 4 草案 | 完整的插值控制语法 |
| 2023 | `color-mix()` 函数 | 渐变色标动态混合 |
| 2024 | Display P3 渐变 | 广色域支持 |

---

## 3. 形式化定义

### 3.1 规范条款

依据 [CSS Images Module Level 3 §4](https://www.w3.org/TR/css-images-3/#gradients)：

> A gradient is an image that smoothly transitions from one color to another. CSS defines three types of gradients: linear, radial, and conic.

以及 [CSS Images Module Level 4 §4.1](https://www.w3.org/TR/css-images-4/#linear-gradients)：

> If the first argument to a linear gradient is the keyword `in`, the next keyword specifies the color space used for interpolation.

### 3.2 核心术语

| 术语 | 英文 | 定义 |
| --- | --- | --- |
| 渐变 | Gradient | 平滑过渡的图像 |
| 梯度线 | Gradient Line | 线性渐变的方向轴 |
| 渐变射线 | Gradient Ray | 径向渐变的中心射线 |
| 渐变弧 | Gradient Arc | 锥形渐变的角度弧 |
| 色标 | Color Stop | 渐变中的颜色锚点 |
| 色标位置 | Color Stop Position | 色标在渐变中的位置（百分比或长度） |
| 插值 | Interpolation | 两色标之间的颜色过渡 |
| 硬边界 | Hard Stop | 两色标位置相同，形成清晰边界 |
| 色带效应 | Banding | 渐变中的颜色断层 |

### 3.3 `linear-gradient` 语法

```
linear-gradient() = 
  linear-gradient(
    [ [ <angle> | to <side-or-corner> ] || in <color-space> [ longer | shorter | increasing | decreasing ] hue? ]?,
    <color-stop-list>
  )

<side-or-corner> = [left | right] || [top | bottom]
<color-stop-list> = <color-stop>#{2,}
<color-stop> = <color> <length-percentage>?{1,2}
```

### 3.4 `radial-gradient` 语法

```
radial-gradient() = 
  radial-gradient(
    [ [ <ending-shape> || <size> ] [ at <position> ]? ]?,
    <color-stop-list>
  )

<ending-shape> = circle | ellipse
<size> = 
  closest-side | farthest-side | 
  closest-corner | farthest-corner |
  <length> | <length-percentage>{2}
```

### 3.5 `conic-gradient` 语法

```
conic-gradient() = 
  conic-gradient(
    [ [ from <angle> ]? [ at <position> ]? ] || in <color-space>,
    <color-stop-list>
  )
```

### 3.6 形式化定义：梯度线

设 `linear-gradient` 的方向为 $\theta$（从上至下为 $0°$，顺时针增加），容器尺寸为 $w \times h$。梯度线的长度 $L$ 定义为：

$$
L = |w \sin\theta| + |h \cos\theta|
$$

梯度线的起点与终点位于容器的对角线上，方向由 $\theta$ 决定。色标 $c_i$ 在位置 $p_i \in [0, 1]$ 处，颜色由线性插值得到：

$$
\text{Color}(p) = \text{Interpolate}(c_i, c_{i+1}, \frac{p - p_i}{p_{i+1} - p_i})
$$

其中 $p_i \le p \le p_{i+1}$。

### 3.7 形式化定义：径向渐变

设径向渐变的中心为 $(x_0, y_0)$，形状为 `circle` 或 `ellipse`，尺寸由关键字决定：

- `closest-side`：到最近边的距离。
- `farthest-side`：到最远边的距离。
- `closest-corner`：到最近角的距离。
- `farthest-corner`（默认）：到最远角的距离。

对于 `circle` 形状，渐变半径 $r$ 定义为：

$$
r_{\text{closest-side}} = \min(x_0, w - x_0, y_0, h - y_0)
$$

$$
r_{\text{farthest-corner}} = \max\left(\sqrt{x_0^2 + y_0^2}, \sqrt{(w-x_0)^2 + y_0^2}, \ldots\right)
$$

### 3.8 形式化定义：锥形渐变

锥形渐变的颜色由角度 $\phi$ 决定（从 12 点方向开始，顺时针）：

$$
\text{Color}(\phi) = \text{Interpolate}(c_i, c_{i+1}, \frac{\phi - \phi_i}{\phi_{i+1} - \phi_i})
$$

其中 $\phi \in [0°, 360°]$。若首尾色标颜色不同，渐变在 $360°$ 处形成「接缝」。

### 3.9 颜色插值

CSS Images Level 4 支持的色彩空间：

| 色彩空间 | 语法 | 特性 |
| --- | --- | --- |
| `srgb` | `in srgb` | 默认，sRGB 线性插值 |
| `linearRGB` | `in linearRGB` | 线性 RGB 空间，物理准确 |
| `lab` | `in lab` | CIE Lab 空间，感知均匀 |
| `lch` | `in lch` | CIE LCH 空间，色相旋转 |
| `oklab` | `in oklab` | Oklab 空间（2020），改进 Lab |
| `oklch` | `in oklch` | OkLCH 空间，现代首选 |
| `hsl` | `in hsl` | HSL 空间，色相插值 |
| `hwb` | `in hwb` | HWB 空间 |
| `xyz` | `in xyz` | CIE XYZ 空间 |

色相插值方式（仅 `lch`、`oklch`、`hsl`、`hwb`）：

- `shorter hue`（默认）：取较短弧。
- `longer hue`：取较长弧。
- `increasing hue`：递增方向。
- `decreasing hue`：递减方向。

### 3.10 色标位置规则

色标位置的规范化规则：

1. 若首色标未指定位置，默认为 `0%`。
2. 若末色标未指定位置，默认为 `100%`。
3. 若中间色标位置小于前一个，自动调整为前一个的位置。
4. 双色标语法 `red 25% 50%` 等价于 `red 25%, red 50%`，形成硬边界。

形式化地，设色标序列为 $\{(c_i, p_i)\}_{i=1}^{n}$，规范化函数：

$$
p_i' = \max(p_i, p_{i-1}') \quad \text{for } i \ge 2
$$

---

## 4. 理论推导与原理解析

### 4.1 梯度线的几何推导

给定容器尺寸 $w \times h$ 与方向角 $\theta$（从上至下为 $0°$，顺时针），梯度线的方向向量为：

$$
\vec{d} = (\sin\theta, \cos\theta)
$$

梯度线垂直于方向向量的「梯度线长度」$L$ 通过容器的对角线投影得到：

$$
L = |w \sin\theta| + |h \cos\theta|
$$

**证明**：设梯度线方向为 $\vec{d} = (\sin\theta, \cos\theta)$，其垂直方向为 $\vec{n} = (-\cos\theta, \sin\theta)$。容器的四个角在 $\vec{n}$ 方向上的投影差即为梯度线长度：

$$
L = \max_{\text{corners}} \vec{c} \cdot \vec{n} - \min_{\text{corners}} \vec{c} \cdot \vec{n}
$$

展开后得到 $L = |w \sin\theta| + |h \cos\theta|$。

### 4.2 颜色插值的数学模型

给定两色标 $c_1 = (r_1, g_1, b_1)$ 与 $c_2 = (r_2, g_2, b_2)$，插值参数 $t \in [0, 1]$。

**sRGB 线性插值**（默认）：

$$
c(t) = (1-t) c_1 + t c_2
$$

**linearRGB 插值**：

先进行 gamma 解码（sRGB → linear），插值后再编码（linear → sRGB）：

$$
c_{\text{linear}}(t) = (1-t) \cdot \text{srgbToLinear}(c_1) + t \cdot \text{srgbToLinear}(c_2)
$$

$$
c(t) = \text{linearToSrgb}(c_{\text{linear}}(t))
$$

**Oklab 插值**：

转换到 Oklab 空间，插值，再转换回 sRGB：

$$
c_{\text{oklab}}(t) = (1-t) \cdot \text{srgbToOklab}(c_1) + t \cdot \text{srgbToOklab}(c_2)
$$

$$
c(t) = \text{oklabToSrgb}(c_{\text{oklab}}(t))
$$

Oklab 空间的优势在于**感知均匀性**：相同数值差对应相同感知色差，因此渐变更平滑。

### 4.3 色相插值的歧义

在 HSL / LCH / OkLCH 空间中，色相是角度，两色相之间存在两种插值路径：

- **较短弧**（`shorter`，默认）：取角度差 $< 180°$ 的方向。
- **较长弧**（`longer`）：取角度差 $> 180°$ 的方向。

设两色相为 $h_1$ 与 $h_2$（角度，$[0°, 360°)$），较短弧的角度差：

$$
\Delta h_{\text{short}} = \begin{cases}
h_2 - h_1, & \text{if } |h_2 - h_1| \le 180° \\
h_2 - h_1 - 360°, & \text{if } h_2 - h_1 > 180° \\
h_2 - h_1 + 360°, & \text{if } h_2 - h_1 < -180°
\end{cases}
$$

例如，从红色（$0°$）到蓝色（$240°$）：

- 较短弧：$240° - 0° = 240° > 180°$，取 $240° - 360° = -120°$，即逆时针 $120°$，经过品红。
- 较长弧：$240°$，顺时针 $240°$，经过黄、绿、青。

### 4.4 色带效应（Banding）的成因

色带效应是渐变中颜色断层现象，成因包括：

1. **8-bit 量化**：每个通道仅 256 级，长渐变中相邻像素色差小于 1 级时无法区分。
2. **sRGB 非线性**：sRGB 空间的线性插值在感知上不均匀，暗部细节丢失。
3. **显示器精度**：8-bit 显示器无法呈现更细的色差。

**缓解方案**：

1. **使用 `oklab` 插值**：感知均匀，减少暗部断层。
2. **添加微噪声**：通过 SVG 噪声或 `background-image` 叠加细小纹理，打破色带。
3. **使用更高位深**：10-bit / 12-bit 显示器与 HDR 内容。

```css
/* 方案 1：oklab 插值 */
background: linear-gradient(in oklab, #000, #fff);

/* 方案 2：叠加噪声 */
background: 
  url('noise.svg'),
  linear-gradient(to right, #000, #fff);
```

### 4.5 硬边界的几何特性

硬边界（Hard Stop）是两色标位置相同的情况，形成清晰的颜色分界：

```css
background: linear-gradient(to right, red 50%, blue 50%);
```

数学上，硬边界处的颜色不连续：

$$
\lim_{p \to 50\%^-} \text{Color}(p) = \text{red}, \quad \lim_{p \to 50\%^+} \text{Color}(p) = \text{blue}
$$

硬边界常用于：

- 条纹纹理（配合 `repeating-linear-gradient`）。
- 分块布局（如双栏分色）。
- 进度条（已完成 vs 未完成）。

### 4.6 `repeating-linear-gradient` 的周期性

`repeating-linear-gradient` 将色标位置模 $L$（梯度线长度），形成周期性渐变：

```css
background: repeating-linear-gradient(
  45deg,
  #fff 0px,
  #fff 10px,
  #000 10px,
  #000 20px
);
```

数学上，周期 $T = 20\text{px}$，颜色函数：

$$
\text{Color}(p) = \text{Color}_{\text{base}}(p \mod T)
$$

其中 $\text{Color}_{\text{base}}$ 是基础渐变（$[0, T]$ 范围内）。

### 4.7 `conic-gradient` 的接缝问题

`conic-gradient` 在 $0°$ 与 $360°$ 处可能形成「接缝」：

```css
background: conic-gradient(red, yellow, lime, aqua, blue, magenta, red);
```

若首尾色标颜色相同（如上例的 `red`），接缝不可见。若不同，则形成硬边界。

**解决方案**：

1. 首尾使用相同颜色。
2. 使用 `from <angle>` 调整起始角度，将接缝隐藏在不可见区域。
3. 通过 `mask` 遮挡接缝。

### 4.8 渐变与可访问性

渐变对可访问性的影响：

1. **对比度**：渐变背景上的文字对比度随位置变化，需确保所有位置满足 WCAG AA 标准（4.5:1）。
2. **色盲友好**：避免仅依赖色相差异传递信息，应配合明度或图案。
3. **`prefers-contrast`**：用户偏好高对比度时，应简化或移除渐变。

```css
@media (prefers-contrast: more) {
  .button {
    background: solid-color;  /* 移除渐变 */
  }
}
```

---

## 5. 代码示例

### 5.1 基础示例：线性渐变

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>线性渐变基础示例</title>
<style>
  .gradient-basic {
    width: 300px;
    height: 100px;
    /* 从左到右，红到蓝 */
    background: linear-gradient(to right, red, blue);
    margin: 10px 0;
  }

  .gradient-angle {
    width: 300px;
    height: 100px;
    /* 45deg 角度 */
    background: linear-gradient(45deg, #667eea, #764ba2);
    margin: 10px 0;
  }

  .gradient-multi-stop {
    width: 300px;
    height: 100px;
    /* 多色标 */
    background: linear-gradient(to right, red 0%, yellow 50%, blue 100%);
    margin: 10px 0;
  }

  .gradient-hard-stop {
    width: 300px;
    height: 100px;
    /* 硬边界 */
    background: linear-gradient(to right, red 50%, blue 50%);
    margin: 10px 0;
  }

  .gradient-hard-stop-v2 {
    width: 300px;
    height: 100px;
    /* Level 4 双色标语法 */
    background: linear-gradient(to right, red 25% 50%, blue 50% 75%);
    margin: 10px 0;
  }
</style>
</head>
<body>
  <div class="gradient-basic"></div>
  <div class="gradient-angle"></div>
  <div class="gradient-multi-stop"></div>
  <div class="gradient-hard-stop"></div>
  <div class="gradient-hard-stop-v2"></div>
</body>
</html>
```

### 5.2 重复线性渐变：条纹纹理

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>重复线性渐变：条纹纹理</title>
<style>
  .stripes-diagonal {
    width: 300px;
    height: 200px;
    /* 45deg 对角条纹 */
    background: repeating-linear-gradient(
      45deg,
      #fff 0px,
      #fff 10px,
      #000 10px,
      #000 20px
    );
  }

  .stripes-vertical {
    width: 300px;
    height: 200px;
    /* 垂直条纹 */
    background: repeating-linear-gradient(
      to right,
      #667eea 0px,
      #667eea 20px,
      #764ba2 20px,
      #764ba2 40px
    );
  }

  .checkerboard {
    width: 300px;
    height: 300px;
    /* 棋盘格：两层渐变叠加 */
    background:
      repeating-linear-gradient(0deg, transparent 0, transparent 40px, #000 40px, #000 80px),
      repeating-linear-gradient(90deg, transparent 0, transparent 40px, #000 40px, #000 80px);
    background-color: #fff;
  }
</style>
</head>
<body>
  <div class="stripes-diagonal"></div>
  <div class="stripes-vertical"></div>
  <div class="checkerboard"></div>
</body>
</html>
```

### 5.3 径向渐变：光晕效果

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>径向渐变：光晕效果</title>
<style>
  .halo {
    width: 300px;
    height: 300px;
    /* 圆形径向渐变，从中心透明到边缘不透明 */
    background: radial-gradient(
      circle at center,
      transparent 0%,
      transparent 30%,
      rgba(102, 126, 234, 0.5) 60%,
      rgba(118, 75, 162, 0.8) 100%
    );
  }

  .spotlight {
    width: 300px;
    height: 300px;
    /* 椭圆径向渐变，模拟聚光灯 */
    background: radial-gradient(
      ellipse 80% 50% at 50% 50%,
      rgba(255, 255, 255, 0.9) 0%,
      rgba(255, 255, 255, 0.3) 40%,
      transparent 70%
    );
    background-color: #1a1a2e;
  }

  .vignette {
    width: 300px;
    height: 200px;
    /* 暗角效果 */
    background: radial-gradient(
      circle at center,
      transparent 50%,
      rgba(0, 0, 0, 0.8) 100%
    );
    background-color: #4a90e2;
  }
</style>
</head>
<body>
  <div class="halo"></div>
  <div class="spotlight"></div>
  <div class="vignette"></div>
</body>
</html>
```

### 5.4 径向渐变尺寸关键字

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>径向渐变尺寸关键字对比</title>
<style>
  .box {
    width: 200px;
    height: 150px;
    display: inline-block;
    margin: 5px;
    border: 1px solid #ccc;
  }

  .closest-side {
    background: radial-gradient(circle closest-side at 30% 40%, red, blue);
  }

  .farthest-side {
    background: radial-gradient(circle farthest-side at 30% 40%, red, blue);
  }

  .closest-corner {
    background: radial-gradient(circle closest-corner at 30% 40%, red, blue);
  }

  .farthest-corner {
    background: radial-gradient(circle farthest-corner at 30% 40%, red, blue);
  }
</style>
</head>
<body>
  <div class="box closest-side">closest-side</div>
  <div class="box farthest-side">farthest-side</div>
  <div class="box closest-corner">closest-corner</div>
  <div class="box farthest-corner">farthest-corner（默认）</div>
</body>
</html>
```

### 5.5 锥形渐变：饼图与色轮

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>锥形渐变：饼图与色轮</title>
<style>
  .pie-chart {
    width: 200px;
    height: 200px;
    border-radius: 50%;
    /* 饼图：30% 红，30% 黄，40% 绿 */
    background: conic-gradient(
      red 0% 30%,
      yellow 30% 60%,
      green 60% 100%
    );
  }

  .color-wheel {
    width: 200px;
    height: 200px;
    border-radius: 50%;
    /* 色轮：红→黄→绿→青→蓝→品红→红 */
    background: conic-gradient(
      red,
      yellow,
      lime,
      aqua,
      blue,
      magenta,
      red
    );
  }

  .progress-ring {
    width: 200px;
    height: 200px;
    border-radius: 50%;
    /* 进度环：75% 完成 */
    background: conic-gradient(
      #4caf50 0% 75%,
      #e0e0e0 75% 100%
    );
    position: relative;
  }

  /* 中心镂空 */
  .progress-ring::before {
    content: '';
    position: absolute;
    top: 20px;
    left: 20px;
    right: 20px;
    bottom: 20px;
    background: white;
    border-radius: 50%;
  }

  .progress-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 24px;
    font-weight: bold;
    z-index: 1;
  }
</style>
</head>
<body>
  <div class="pie-chart"></div>
  <div class="color-wheel"></div>
  <div class="progress-ring">
    <span class="progress-text">75%</span>
  </div>
</body>
</html>
```

### 5.6 渐变文字

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>渐变文字效果</title>
<style>
  .gradient-text {
    font-size: 48px;
    font-weight: bold;
    background: linear-gradient(to right, #667eea, #764ba2);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;  /* 兜底 */
  }

  .gradient-text-rainbow {
    font-size: 36px;
    font-weight: bold;
    background: linear-gradient(
      to right,
      #ff0080,
      #ff8c00,
      #ffd700,
      #00ff00,
      #00bfff,
      #8a2be2
    );
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
  }

  /* 可访问性：高对比度模式下移除渐变 */
  @media (prefers-contrast: more) {
    .gradient-text,
    .gradient-text-rainbow {
      -webkit-text-fill-color: initial;
      color: #667eea;
      background: none;
    }
  }
</style>
</head>
<body>
  <h1 class="gradient-text">渐变文字示例</h1>
  <h2 class="gradient-text-rainbow">彩虹渐变文字</h2>
</body>
</html>
```

### 5.7 渐变边框

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>渐变边框效果</title>
<style>
  .gradient-border {
    padding: 20px;
    border: 2px solid transparent;
    /* 双背景：内层白色 + 外层渐变 */
    background:
      linear-gradient(white, white) padding-box,
      linear-gradient(to right, #667eea, #764ba2) border-box;
    border-radius: 8px;
  }

  .gradient-border-rounded {
    padding: 20px;
    border: 3px solid transparent;
    border-radius: 50%;
    background:
      linear-gradient(white, white) padding-box,
      conic-gradient(from 0deg, #ff0080, #ff8c00, #ffd700, #00ff00, #00bfff, #8a2be2, #ff0080) border-box;
  }

  .gradient-border-thick {
    padding: 20px;
    border: 10px solid transparent;
    background:
      linear-gradient(white, white) padding-box,
      linear-gradient(135deg, #667eea, #764ba2, #f093fb) border-box;
    border-radius: 12px;
  }
</style>
</head>
<body>
  <div class="gradient-border">渐变边框（细）</div>
  <div class="gradient-border-rounded">圆形渐变边框</div>
  <div class="gradient-border-thick">渐变边框（粗）</div>
</body>
</html>
```

### 5.8 Oklab 插值对比

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>Oklab vs sRGB 插值对比</title>
<style>
  .box {
    width: 100%;
    height: 80px;
    margin: 10px 0;
  }

  /* 默认 sRGB 插值 */
  .srgb-gradient {
    background: linear-gradient(to right, red, blue);
  }

  /* Oklab 插值（更平滑） */
  .oklab-gradient {
    background: linear-gradient(in oklab, red, blue);
  }

  /* LCH 较短色相 */
  .lch-short {
    background: linear-gradient(in oklch shorter hue, red, blue);
  }

  /* LCH 较长色相 */
  .lch-long {
    background: linear-gradient(in oklch longer hue, red, blue);
  }

  /* 暗部对比：sRGB 易出现色带 */
  .srgb-dark {
    background: linear-gradient(to right, #000, #333);
  }

  .oklab-dark {
    background: linear-gradient(in oklab, #000, #333);
  }

  label {
    display: block;
    font-family: monospace;
    margin-top: 20px;
    font-weight: bold;
  }
</style>
</head>
<body>
  <label>sRGB: linear-gradient(to right, red, blue)</label>
  <div class="box srgb-gradient"></div>

  <label>Oklab: linear-gradient(in oklab, red, blue)</label>
  <div class="box oklab-gradient"></div>

  <label>Oklch shorter hue: red → blue（经过品红）</label>
  <div class="box lch-short"></div>

  <label>Oklch longer hue: red → blue（经过黄绿青）</label>
  <div class="box lch-long"></div>

  <label>sRGB 暗部（易出现色带）</label>
  <div class="box srgb-dark"></div>

  <label>Oklab 暗部（更平滑）</label>
  <div class="box oklab-dark"></div>
</body>
</html>
```

### 5.9 多层渐变叠加

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>多层渐变叠加</title>
<style>
  .complex-background {
    width: 400px;
    height: 300px;
    /* 三层渐变叠加：
     * 1. 顶层：径向光晕
     * 2. 中层：对角条纹
     * 3. 底层：线性渐变
     */
    background:
      radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.3), transparent 50%),
      repeating-linear-gradient(
        45deg,
        transparent 0px,
        transparent 20px,
        rgba(255, 255, 255, 0.1) 20px,
        rgba(255, 255, 255, 0.1) 40px
      ),
      linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .mesh-gradient {
    width: 400px;
    height: 300px;
    /* 模拟网格渐变（mesh gradient）：
     * 多个径向渐变叠加，模拟平滑过渡
     */
    background:
      radial-gradient(at 0% 0%, #ff0080 0%, transparent 50%),
      radial-gradient(at 100% 0%, #ff8c00 0%, transparent 50%),
      radial-gradient(at 0% 100%, #00bfff 0%, transparent 50%),
      radial-gradient(at 100% 100%, #8a2be2 0%, transparent 50%),
      #1a1a2e;
  }
</style>
</head>
<body>
  <div class="complex-background"></div>
  <div class="mesh-gradient"></div>
</body>
</html>
```

### 5.10 企业级：可主题化渐变系统

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>企业级可主题化渐变系统</title>
<style>
  :root {
    /* 渐变设计令牌 */
    --gradient-primary: linear-gradient(135deg, #667eea, #764ba2);
    --gradient-success: linear-gradient(135deg, #4caf50, #81c784);
    --gradient-danger: linear-gradient(135deg, #f44336, #e57373);
    --gradient-warning: linear-gradient(135deg, #ff9800, #ffb74d);
    --gradient-info: linear-gradient(135deg, #2196f3, #64b5f6);

    /* 渐变方向令牌 */
    --gradient-direction: 135deg;
  }

  /* 深色主题 */
  [data-theme="dark"] {
    --gradient-primary: linear-gradient(135deg, #4c51bf, #553c9a);
    --gradient-success: linear-gradient(135deg, #38a169, #48bb78);
    --gradient-danger: linear-gradient(135deg, #e53e3e, #fc8181);
  }

  .btn {
    padding: 12px 24px;
    border: none;
    border-radius: 6px;
    color: white;
    font-size: 14px;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .btn-primary { background: var(--gradient-primary); }
  .btn-success { background: var(--gradient-success); }
  .btn-danger { background: var(--gradient-danger); }
  .btn-warning { background: var(--gradient-warning); }
  .btn-info { background: var(--gradient-info); }

  /* 动态渐变：通过 CSS 变量组合 */
  .btn-dynamic {
    background: linear-gradient(
      var(--gradient-direction),
      var(--color-start, #667eea),
      var(--color-end, #764ba2)
    );
  }

  .card {
    padding: 24px;
    border-radius: 12px;
    background: var(--gradient-primary);
    color: white;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
</style>
</head>
<body>
  <div style="display: flex; gap: 12px; flex-wrap: wrap;">
    <button class="btn btn-primary">主按钮</button>
    <button class="btn btn-success">成功</button>
    <button class="btn btn-danger">危险</button>
    <button class="btn btn-warning">警告</button>
    <button class="btn btn-info">信息</button>
  </div>

  <div style="margin-top: 24px;">
    <div class="card">
      <h3>渐变卡片</h3>
      <p>使用设计令牌管理的渐变背景</p>
    </div>
  </div>

  <button class="btn btn-dynamic" 
    style="--color-start: #ff0080; --color-end: #ff8c00; --gradient-direction: to right;">
    动态渐变按钮
  </button>
</body>
</html>
```

### 5.11 渐变动画

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>渐变动画</title>
<style>
  /* 方案 1：通过 background-position 动画 */
  .animated-gradient {
    width: 400px;
    height: 100px;
    background: linear-gradient(
      90deg,
      #667eea,
      #764ba2,
      #f093fb,
      #667eea
    );
    background-size: 300% 100%;
    animation: gradient-shift 3s ease infinite;
  }

  @keyframes gradient-shift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  /* 方案 2：通过 @property 动画色标（CSS Houdini） */
  @property --gradient-color-1 {
    syntax: '<color>';
    initial-value: #667eea;
    inherits: false;
  }

  @property --gradient-color-2 {
    syntax: '<color>';
    initial-value: #764ba2;
    inherits: false;
  }

  .houdini-gradient {
    width: 400px;
    height: 100px;
    background: linear-gradient(
      to right,
      var(--gradient-color-1),
      var(--gradient-color-2)
    );
    animation: color-shift 4s ease infinite alternate;
  }

  @keyframes color-shift {
    0% {
      --gradient-color-1: #667eea;
      --gradient-color-2: #764ba2;
    }
    100% {
      --gradient-color-1: #f093fb;
      --gradient-color-2: #f5576c;
    }
  }

  /* 尊重用户运动偏好 */
  @media (prefers-reduced-motion: reduce) {
    .animated-gradient,
    .houdini-gradient {
      animation: none;
    }
  }
</style>
</head>
<body>
  <div class="animated-gradient"></div>
  <div class="houdini-gradient"></div>
</body>
</html>
```

### 5.12 渐变可视化工具

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>渐变可视化工具</title>
<style>
  body {
    font-family: system-ui, sans-serif;
    max-width: 800px;
    margin: 2rem auto;
    padding: 0 1rem;
  }
  .preview {
    width: 100%;
    height: 200px;
    border-radius: 8px;
    border: 1px solid #dee2e6;
    margin: 1rem 0;
  }
  .controls {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
  }
  label {
    display: block;
    font-size: 0.875rem;
    color: #6c757d;
    margin-bottom: 0.25rem;
  }
  input, select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-family: monospace;
  }
  .output {
    padding: 1rem;
    background: #212529;
    color: #f8f9fa;
    border-radius: 4px;
    font-family: monospace;
    word-break: break-all;
  }
</style>
</head>
<body>
  <h1>渐变可视化工具</h1>
  <div class="preview" id="preview"></div>
  <div class="controls">
    <div>
      <label>渐变类型</label>
      <select id="type">
        <option value="linear">linear-gradient</option>
        <option value="radial">radial-gradient</option>
        <option value="conic">conic-gradient</option>
      </select>
    </div>
    <div>
      <label>角度 / 位置</label>
      <input id="angle" value="45deg">
    </div>
    <div>
      <label>起始颜色</label>
      <input id="color1" value="#667eea">
    </div>
    <div>
      <label>结束颜色</label>
      <input id="color2" value="#764ba2">
    </div>
    <div>
      <label>插值色彩空间</label>
      <select id="interp">
        <option value="">默认 sRGB</option>
        <option value="in oklab">in oklab</option>
        <option value="in oklch">in oklch</option>
        <option value="in lab">in lab</option>
        <option value="in lch">in lch</option>
      </select>
    </div>
  </div>
  <div class="output" id="output">linear-gradient(45deg, #667eea, #764ba2)</div>

  <script>
    function updateGradient() {
      const type = document.getElementById('type').value;
      const angle = document.getElementById('angle').value;
      const color1 = document.getElementById('color1').value;
      const color2 = document.getElementById('color2').value;
      const interp = document.getElementById('interp').value;

      let gradient;
      if (type === 'linear') {
        gradient = `linear-gradient(${interp ? interp + ', ' : ''}${angle}, ${color1}, ${color2})`;
      } else if (type === 'radial') {
        gradient = `radial-gradient(${interp ? interp + ', ' : ''}circle at ${angle}, ${color1}, ${color2})`;
      } else {
        gradient = `conic-gradient(${interp ? interp + ', ' : ''}from ${angle} at 50% 50%, ${color1}, ${color2})`;
      }

      document.getElementById('preview').style.background = gradient;
      document.getElementById('output').textContent = gradient;
    }

    document.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('input', updateGradient);
    });
    updateGradient();
  </script>
</body>
</html>
```

---

## 6. 对比分析

### 6.1 CSS 渐变 vs SVG 渐变

| 维度 | CSS 渐变 | SVG 渐变 |
| --- | --- | --- |
| **语法** | CSS 属性 `background` | XML `<linearGradient>` / `<radialGradient>` |
| **应用方式** | 直接 `background: linear-gradient(...)` | 通过 `fill="url(#grad)"` 引用 |
| **动画** | 有限（`background-position` 或 Houdini） | 支持 SMIL 与 CSS 动画 |
| **性能** | 浏览器优化，GPU 加速 | 需解析 XML，性能略低 |
| **可维护性** | 简洁，内联于 CSS | 需在 SVG 中定义，引用复杂 |
| **可访问性** | 同 CSS | 同 SVG，支持 ARIA |
| **适用场景** | 背景纹理、按钮、卡片 | 复杂矢量图形、图表 |

### 6.2 主流框架的渐变实践

| 框架 | 渐变工具类 | 自定义方式 |
| --- | --- | --- |
| **Bootstrap 5** | `bg-gradient` 修饰类 | 通过 Sass 变量 `$gradient` |
| **Tailwind CSS v3.4** | `bg-gradient-to-r from-blue-500 to-purple-500` | 通过 `tailwind.config.js` 扩展 |
| **Material Design 3** | 主题色梯度 | 通过 `mdc-theme-*` 变量 |
| **Ant Design 5** | `linear-gradient` 内联 | 通过 `ConfigProvider` 主题 |
| **GitHub Primer** | `color-gradient-*` 工具类 | 通过设计令牌 |

### 6.3 Tailwind vs Bootstrap 的渐变哲学

**Tailwind CSS**：

```html
<!-- 原子工具类组合 -->
<button class="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
  按钮
</button>
```

- 优势：灵活，可在 HTML 中快速调整。
- 劣势：类名冗长，复用性弱。

**Bootstrap 5**：

```html
<!-- 预定义渐变类 -->
<button class="btn btn-primary bg-gradient">
  按钮
</button>
```

- 优势：简洁，语义清晰。
- 劣势：自定义渐变需修改 Sass 源码。

### 6.4 色彩空间插值对比

| 色彩空间 | 视觉效果 | 适用场景 | 浏览器支持 |
| --- | --- | --- | --- |
| **sRGB**（默认） | 暗部易出现色带 | 简单渐变、兼容性优先 | 全部 |
| **linearRGB** | 物理准确，略亮 | 物理仿真、光照效果 | Chrome 99+, Safari 16.2+ |
| **Lab** | 感知均匀，平滑 | 设计师审美、品牌色 | Chrome 111+, Safari 16.2+ |
| **LCH** | 色相旋转可控 | 色轮、彩虹渐变 | Chrome 111+, Safari 16.2+ |
| **Oklab** | 改进 Lab，更准确 | 现代首选 | Chrome 111+, Safari 16.2+ |
| **OkLCH** | 色相可控 + 感知均匀 | 现代设计系统首选 | Chrome 111+, Safari 16.2+ |
| **HSL** | 色相直接插值 | 简单色相过渡 | Chrome 99+, Safari 16.2+ |
| **HWB** | 色相 + 白黑分量 | 柔和过渡 | 实验性 |

### 6.5 渐变类型对比

| 渐变类型 | 几何模型 | 典型应用 | 浏览器支持 |
| --- | --- | --- | --- |
| `linear-gradient` | 梯度线 | 背景、按钮、卡片 | 全部 |
| `radial-gradient` | 渐变射线 | 光晕、聚光灯、阴影 | 全部 |
| `conic-gradient` | 渐变弧 | 饼图、色轮、进度环 | Chrome 69+, Safari 12.1+, Firefox 83+ |
| `repeating-linear-gradient` | 周期性梯度线 | 条纹纹理 | 全部 |
| `repeating-radial-gradient` | 周期性渐变射线 | 同心圆纹理 | 全部 |
| `repeating-conic-gradient` | 周期性渐变弧 | 放射状纹理 | Chrome 69+, Safari 12.1+ |

---

## 7. 常见陷阱与最佳实践

### 7.1 陷阱 1：色带效应

**问题**：长渐变中出现颜色断层。

```css
/* 反例：sRGB 暗部渐变易出现色带 */
background: linear-gradient(to bottom, #000, #333);
```

**最佳实践**：使用 `oklab` 插值或叠加噪声。

```css
/* 正例：oklab 插值 */
background: linear-gradient(in oklab, #000, #333);

/* 或叠加噪声 */
background:
  url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><filter id="n"><feTurbulence baseFrequency="0.9"/></filter><rect width="100" height="100" filter="url(%23n)" opacity="0.05"/></svg>'),
  linear-gradient(to bottom, #000, #333);
```

### 7.2 陷阱 2：硬边界滥用

**问题**：硬边界（Hard Stop）形成生硬分界，视觉突兀。

```css
/* 反例：硬边界用于装饰 */
background: linear-gradient(to right, red 50%, blue 50%);
```

**最佳实践**：硬边界仅用于纹理或明确分块，装饰性渐变应平滑过渡。

### 7.3 陷阱 3：`background-clip: text` 兼容性

**问题**：`background-clip: text` 在旧浏览器不支持。

```css
/* 反例：未提供兜底 */
.gradient-text {
  background: linear-gradient(to right, red, blue);
  -webkit-background-clip: text;
  color: transparent;  /* 旧浏览器显示透明文字 */
}
```

**最佳实践**：使用 `-webkit-text-fill-color` 并保留 `color` 兜底。

```css
/* 正例：保留兜底 */
.gradient-text {
  color: #667eea;  /* 兜底色 */
  background: linear-gradient(to right, #667eea, #764ba2);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

### 7.4 陷阱 4：渐变方向歧义

**问题**：`to top right` 与 `45deg` 的渐变方向不同。

```css
/* to top right：从左下到右上 */
background: linear-gradient(to top right, red, blue);

/* 45deg：从下到上偏右 45° */
background: linear-gradient(45deg, red, blue);
```

**最佳实践**：理解规范定义，`to <corner>` 是「指向角落」，`<angle>` 是「梯度线方向」。

### 7.5 陷阱 5：径向渐变尺寸歧义

**问题**：未指定尺寸关键字时，`farthest-corner` 是默认值，可能不符合预期。

```css
/* 默认 farthest-corner */
background: radial-gradient(circle at 30% 40%, red, blue);

/* 显式 closest-side */
background: radial-gradient(circle closest-side at 30% 40%, red, blue);
```

**最佳实践**：显式指定尺寸关键字，避免歧义。

### 7.6 陷阱 6：`conic-gradient` 接缝

**问题**：`conic-gradient` 首尾色标不同时形成接缝。

```css
/* 反例：接缝明显 */
background: conic-gradient(red, yellow, lime, aqua, blue);
```

**最佳实践**：首尾使用相同颜色，或使用 `from <angle>` 调整起始位置。

```css
/* 正例：首尾相同 */
background: conic-gradient(red, yellow, lime, aqua, blue, magenta, red);
```

### 7.7 陷阱 7：渐变动画性能

**问题**：通过 `background-position` 动画渐变可能触发重绘，性能差。

```css
/* 反例：性能差 */
background: linear-gradient(90deg, red, blue);
background-size: 200% 100%;
animation: shift 3s infinite;

@keyframes shift {
  to { background-position: 100% 0; }
}
```

**最佳实践**：使用 `transform` 或 `opacity` 动画，或使用 CSS Houdini `@property`。

```css
/* 正例：Houdini @property */
@property --color1 {
  syntax: '<color>';
  initial-value: red;
  inherits: false;
}

background: linear-gradient(90deg, var(--color1), blue);
animation: color 3s infinite;

@keyframes color {
  to { --color1: green; }
}
```

### 7.8 陷阱 8：可访问性忽视

**问题**：渐变背景上文字对比度不足。

```css
/* 反例：对比度不足 */
.text-on-gradient {
  background: linear-gradient(to right, #667eea, #764ba2);
  color: white;  /* 部分位置对比度 < 4.5:1 */
}
```

**最佳实践**：使用对比度检查工具，确保所有位置满足 WCAG AA 标准。

```css
/* 正例：增加背景色或调整渐变 */
.text-on-gradient {
  background: 
    linear-gradient(to right, rgba(102, 126, 234, 0.9), rgba(118, 75, 162, 0.9)),
    #1a1a2e;  /* 深色背景兜底 */
  color: white;
}
```

---

## 8. 工程实践

### 8.1 渐变设计令牌

```css
/* design-tokens.css - 渐变设计令牌 */
:root {
  /* 主品牌渐变 */
  --gradient-brand: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --gradient-brand-reverse: linear-gradient(135deg, #764ba2 0%, #667eea 100%);

  /* 语义渐变 */
  --gradient-success: linear-gradient(135deg, #4caf50, #81c784);
  --gradient-warning: linear-gradient(135deg, #ff9800, #ffb74d);
  --gradient-danger: linear-gradient(135deg, #f44336, #e57373);
  --gradient-info: linear-gradient(135deg, #2196f3, #64b5f6);

  /* 中性渐变 */
  --gradient-neutral: linear-gradient(135deg, #f5f7fa, #c3cfe2);
  --gradient-neutral-dark: linear-gradient(135deg, #2c3e50, #4ca1af);

  /* 装饰性渐变 */
  --gradient-aurora: linear-gradient(
    135deg,
    #667eea 0%,
    #764ba2 25%,
    #f093fb 50%,
    #f5576c 75%,
    #4facfe 100%
  );

  /* 渐变方向 */
  --direction-horizontal: to right;
  --direction-vertical: to bottom;
  --direction-diagonal: 135deg;
  --direction-diagonal-reverse: -45deg;
}
```

### 8.2 PostCSS 渐变增强

```javascript
// postcss.config.js - PostCSS 渐变增强
module.exports = {
  plugins: [
    require('autoprefixer')({
      overrideBrowserslist: ['> 1%', 'last 2 versions'],
    }),
    // 添加 -webkit- 前缀（background-clip: text）
    require('postcss-preset-env')({
      stage: 2,
      features: {
        'is-pseudo-class': true,
      },
    }),
  ],
};
```

### 8.3 SCSS 渐变 Mixin

```scss
// _gradients.scss - SCSS 渐变 Mixin 集合

// 线性渐变
@mixin linear-gradient($direction, $colors...) {
  background: linear-gradient($direction, $colors);
}

// 径向渐变
@mixin radial-gradient($shape, $position, $colors...) {
  background: radial-gradient($shape at $position, $colors);
}

// 渐变文字
@mixin gradient-text($gradient) {
  background: $gradient;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

// 渐变边框
@mixin gradient-border($gradient, $border-width: 2px, $radius: 0) {
  border: $border-width solid transparent;
  border-radius: $radius;
  background:
    linear-gradient(white, white) padding-box,
    $gradient border-box;
}

// 使用示例
.button {
  @include linear-gradient(135deg, #667eea, #764ba2);
}

.title {
  @include gradient-text(linear-gradient(to right, #667eea, #764ba2));
}

.card {
  @include gradient-border(
    linear-gradient(135deg, #667eea, #764ba2),
    2px,
    8px
  );
}
```

### 8.4 Tailwind 自定义渐变

```javascript
// tailwind.config.js - 自定义渐变
module.exports = {
  theme: {
    extend: {
      // 自定义渐变颜色
      colors: {
        brand: {
          start: '#667eea',
          end: '#764ba2',
        },
      },
      // 自定义渐变方向
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #667eea, #764ba2)',
        'gradient-aurora': 'linear-gradient(135deg, #667eea, #764ba2, #f093fb, #f5576c)',
        'gradient-mesh': `
          radial-gradient(at 0% 0%, rgba(255, 0, 128, 0.5), transparent 50%),
          radial-gradient(at 100% 0%, rgba(255, 140, 0, 0.5), transparent 50%),
          radial-gradient(at 100% 100%, rgba(138, 43, 226, 0.5), transparent 50%),
          radial-gradient(at 0% 100%, rgba(0, 191, 255, 0.5), transparent 50%)
        `,
      },
      // 自定义动画
      keyframes: {
        'gradient-shift': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
      },
      animation: {
        'gradient-shift': 'gradient-shift 3s ease infinite',
      },
    },
  },
};
```

```html
<!-- 使用自定义渐变 -->
<div class="bg-gradient-brand">品牌渐变</div>
<div class="bg-gradient-aurora bg-[length:300%_100%] animate-gradient-shift">
  动态极光渐变
</div>
<div class="bg-gradient-mesh">网格渐变</div>
```

### 8.5 React 渐变组件

```tsx
// GradientBackground.tsx - React 渐变组件
import React from 'react';

interface GradientBackgroundProps {
  type?: 'linear' | 'radial' | 'conic';
  angle?: string;
  colors: string[];
  colorSpace?: 'srgb' | 'oklab' | 'oklch' | 'lab' | 'lch';
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function GradientBackground({
  type = 'linear',
  angle = '135deg',
  colors,
  colorSpace,
  children,
  className,
  style,
}: GradientBackgroundProps) {
  const colorList = colors.join(', ');
  const interp = colorSpace ? `in ${colorSpace}, ` : '';

  let background: string;
  if (type === 'linear') {
    background = `linear-gradient(${interp}${angle}, ${colorList})`;
  } else if (type === 'radial') {
    background = `radial-gradient(${interp}circle at center, ${colorList})`;
  } else {
    background = `conic-gradient(${interp}from ${angle} at 50% 50%, ${colorList})`;
  }

  return (
    <div
      className={className}
      style={{ background, ...style }}
    >
      {children}
    </div>
  );
}

// 使用示例
<GradientBackground
  type="linear"
  angle="135deg"
  colors={['#667eea', '#764ba2']}
  colorSpace="oklab"
  className="min-h-screen flex items-center justify-center"
>
  <h1 className="text-white text-4xl">Hello Gradient</h1>
</GradientBackground>
```

### 8.6 渐变性能优化

```css
/* 性能优化技巧 */

/* 1. 使用 will-change 提示浏览器 */
.animated-gradient {
  background: linear-gradient(90deg, red, blue);
  background-size: 200% 100%;
  animation: shift 3s infinite;
  will-change: background-position;  /* 提示浏览器优化 */
}

/* 2. 避免大尺寸渐变 */
/* 反例：全屏渐变重绘成本高 */
body {
  background: linear-gradient(to bottom, #000, #fff);
  background-attachment: fixed;  /* 固定背景，但移动端性能差 */
}

/* 正例：使用 ::before 伪元素 */
body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to bottom, #000, #fff);
  z-index: -1;
}

/* 3. 静态渐变避免动画 */
.gradient-static {
  background: linear-gradient(135deg, #667eea, #764ba2);
  /* 不要对 background 属性本身做动画 */
}

/* 4. 使用 transform 代替 background-position */
.gradient-card {
  position: relative;
  overflow: hidden;
}
.gradient-card::before {
  content: '';
  position: absolute;
  inset: -50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  transition: transform 0.3s;
}
.gradient-card:hover::before {
  transform: rotate(180deg);
}
```

### 8.7 渐变调试工具

```javascript
// 渐变调试工具：解析并可视化色标
function parseGradient(gradientStr) {
  // 简化的渐变解析（生产环境推荐使用 postcss-value-parser）
  const typeMatch = gradientStr.match(/(linear|radial|conic)-gradient/);
  const type = typeMatch ? typeMatch[1] : 'linear';

  // 提取参数
  const innerMatch = gradientStr.match(/gradient\(([^)]+)\)/);
  if (!innerMatch) return null;

  const parts = innerMatch[1].split(',').map(s => s.trim());

  // 解析色标
  const stops = parts
    .filter(p => p.includes('#') || p.includes('rgb') || p.includes('hsl'))
    .map(p => {
      const [color, position] = p.split(/\s+/);
      return { color, position: position || null };
    });

  return { type, stops };
}

// 使用示例
const grad = parseGradient('linear-gradient(to right, red 0%, blue 100%)');
console.log(grad);
// { type: 'linear', stops: [{color: 'red', position: '0%'}, {color: 'blue', position: '100%'}] }
```

### 8.8 Playwright 视觉回归测试

```javascript
// gradient.spec.js - Playwright 视觉回归测试
const { test, expect } = require('@playwright/test');

test.describe('渐变视觉回归测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('线性渐变正确渲染', async ({ page }) => {
    const element = page.locator('.gradient-linear');
    await expect(element).toHaveCSS('background-image', /linear-gradient/);
  });

  test('渐变文字可见', async ({ page }) => {
    const element = page.locator('.gradient-text');
    // 验证 background-clip
    await expect(element).toHaveCSS('-webkit-background-clip', 'text');
    await expect(element).toHaveCSS('-webkit-text-fill-color', 'transparent');
  });

  test('渐变动画运行', async ({ page }) => {
    const element = page.locator('.animated-gradient');
    // 等待动画运行
    await page.waitForTimeout(100);
    // 验证 animation 属性
    await expect(element).toHaveCSS('animation-name', 'gradient-shift');
  });

  test('OkLab 插值正确应用', async ({ page }) => {
    const element = page.locator('.oklab-gradient');
    const bgImage = await element.evaluate(el =>
      window.getComputedStyle(el).backgroundImage
    );
    expect(bgImage).toContain('oklab');
  });
});
```

---

## 9. 案例研究

### 9.1 Bootstrap 5 的渐变实践

Bootstrap 5 提供 `bg-gradient` 修饰类，将纯色背景转为渐变：

```css
/* Bootstrap 5 源码 */
.bg-gradient {
  background-image: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.15),
    rgba(255, 255, 255, 0)
  );
}

/* 配合 .bg-primary 使用 */
.bg-primary.bg-gradient {
  background-image: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.15),
    rgba(255, 255, 255, 0)
  ), var(--bs-primary);
}
```

**使用方式**：

```html
<div class="bg-primary bg-gradient">渐变背景</div>
```

**特点**：渐变效果较微妙（顶部高光），适合按钮与卡片。

### 9.2 Tailwind CSS v3.4 的渐变实践

Tailwind 提供原子化的渐变工具类：

```html
<!-- 从左到右，蓝到紫 -->
<div class="bg-gradient-to-r from-blue-500 to-purple-500">
  渐变背景
</div>

<!-- 三色渐变 -->
<div class="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500">
  三色渐变
</div>

<!-- 角度渐变 -->
<div class="bg-gradient-to-br from-pink-500 to-orange-500">
  对角渐变
</div>
```

**特点**：原子类组合，灵活度高，适合快速原型。

### 9.3 Material Design 3 的渐变实践

Material Design 3 强调「色彩角色」，渐变用于状态变化：

```css
/* M3 渐变实践 */
.mdc-button--filled {
  background: var(--md-sys-color-primary);
  /* 微妙的高光渐变 */
  background-image: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.1) 0%,
    transparent 100%
  );
}

/* 悬停状态：渐变变深 */
.mdc-button--filled:hover {
  background-image: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.1) 0%,
    rgba(0, 0, 0, 0.05) 100%
  );
}
```

### 9.4 GitHub Primer 的渐变实践

```css
/* Primer 渐变实践 */
.btn-primary {
  background-image: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.15) 0%,
    rgba(255, 255, 255, 0) 100%
  ), #2da44e;
}

/* 渐变边框 */
.gradient-border {
  border: 1px solid transparent;
  background:
    linear-gradient(white, white) padding-box,
    linear-gradient(135deg, #667eea, #764ba2) border-box;
}
```

### 9.5 Stripe 的渐变美学

Stripe 官网以渐变背景闻名，其核心技术是多层径向渐变叠加：

```css
/* Stripe 风格的网格渐变 */
.hero {
  background:
    radial-gradient(at 20% 30%, rgba(102, 126, 234, 0.5), transparent 50%),
    radial-gradient(at 80% 20%, rgba(118, 75, 162, 0.5), transparent 50%),
    radial-gradient(at 50% 80%, rgba(240, 147, 251, 0.5), transparent 50%),
    #0a0a1a;
}
```

### 9.6 生产事故：渐变导致的 CLS

**场景**：某电商首页使用大尺寸渐变背景，导致 Cumulative Layout Shift（CLS）评分恶化。

**根因**：

1. 渐变通过 `background-attachment: fixed` 实现，移动端滚动时重绘成本高。
2. 渐变叠加在图片上，图片加载完成后渐变位置偏移。
3. 渐变动画导致持续重绘。

**解决方案**：

1. 移除 `background-attachment: fixed`，改用 `position: fixed` 伪元素。
2. 为图片容器预留固定尺寸（`aspect-ratio`）。
3. 静态渐变替代动画渐变，或使用 `will-change` 提示。

```css
/* 修复后 */
body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to bottom, #667eea, #764ba2);
  z-index: -1;
}

.image-container {
  aspect-ratio: 16 / 9;  /* 预留尺寸 */
}
```

---

## 10. 习题

### 10.1 选择题

**题目 1**：以下哪个渐变方向与 `linear-gradient(to top right, red, blue)` 等价？

A. `linear-gradient(45deg, red, blue)`
B. `linear-gradient(135deg, red, blue)`
C. `linear-gradient(-45deg, red, blue)`
D. `linear-gradient(225deg, red, blue)`

<details>
<summary>答案与解析</summary>

**答案**：B

**解析**：`to top right` 表示梯度线指向右上角，方向角为 315°（从上至下为 0°，顺时针）。但 CSS 规范中，`to top right` 的角度计算为 `atan2(width, height)`，对于正方形容器约为 315°。而 `135deg` 是从下到上偏右的方向。

注意：`to <corner>` 的角度取决于容器长宽比，并非固定 45°。对于正方形容器，`to top right` 约等于 `315deg`（或 `-45deg`）。但题目选项中 `135deg` 是从左下到右上的方向，与 `to top right` 一致（梯度线方向相反，但视觉效果相同）。

</details>

**题目 2**：`radial-gradient(circle closest-side at 30% 40%, red, blue)` 中，渐变半径取决于？

A. 容器宽度
B. 容器高度
C. 中心到最近边的距离
D. 中心到最近角的距离

<details>
<summary>答案与解析</summary>

**答案**：C

**解析**：`closest-side` 关键字表示渐变半径为中心到最近边的距离。具体计算：`min(x_0, w - x_0, y_0, h - y_0)`。

</details>

**题目 3**：以下哪种插值方式能产生最平滑的暗部渐变？

A. `in srgb`
B. `in hsl`
C. `in oklab`
D. `in hwb`

<details>
<summary>答案与解析</summary>

**答案**：C

**解析**：`oklab` 是感知均匀的色彩空间，相同数值差对应相同感知色差，因此在暗部能产生更平滑的渐变，减少色带效应。`srgb` 在暗部易出现色带，`hsl` / `hwb` 主要用于色相过渡。

</details>

**题目 4**：`conic-gradient(red 0% 30%, yellow 30% 60%, green 60% 100%)` 实现的是？

A. 三色平滑渐变
B. 三色硬边界饼图
C. 三色径向渐变
D. 三色线性渐变

<details>
<summary>答案与解析</summary>

**答案**：B

**解析**：色标位置相同（如 `30%` 出现在前一个色标的结束和后一个色标的开始）形成硬边界。`conic-gradient` 的硬边界用于饼图、分块进度环等。

</details>

**题目 5**：以下哪种方式可以实现「渐变文字」效果？

A. `color: linear-gradient(red, blue)`
B. `text-fill-color: linear-gradient(red, blue)`
C. `background-clip: text` + `background: linear-gradient(red, blue)`
D. `text-gradient: linear-gradient(red, blue)`

<details>
<summary>答案与解析</summary>

**答案**：C

**解析**：CSS 没有直接的「渐变文字」属性，需通过 `background` 设置渐变 + `background-clip: text` 裁剪到文字区域 + `-webkit-text-fill-color: transparent` 透明填充实现。

</details>

### 10.2 填空题

**题目 1**：`linear-gradient` 的默认方向是 ________。

<details>
<summary>答案与解析</summary>

**答案**：`to bottom`（从上到下）

**解析**：未指定方向时，`linear-gradient` 默认从上到下，即 `to bottom`，对应角度 `180deg`。

</details>

**题目 2**：`repeating-linear-gradient` 的周期由 ________ 决定。

<details>
<summary>答案与解析</summary>

**答案**：最后一个色标的位置

**解析**：`repeating-linear-gradient` 将色标位置模「最后一个色标位置」，形成周期性渐变。例如 `repeating-linear-gradient(45deg, red 0px, blue 20px)` 的周期为 20px。

</details>

**题目 3**：CSS Images Level 4 中，`in oklch longer hue` 表示 ________。

<details>
<summary>答案与解析</summary>

**答案**：在 OkLCH 色彩空间中，色相取较长弧插值

**解析**：`longer hue` 关键字指定色相插值取较长弧（>180°），适用于需要经过完整色相轮的渐变。

</details>

**题目 4**：`background-clip: text` 需要配合 ________ 属性使文字颜色透明，以显示背景渐变。

<details>
<summary>答案与解析</summary>

**答案**：`-webkit-text-fill-color: transparent`（或 `color: transparent`）

**解析**：`background-clip: text` 将背景裁剪到文字区域，但文字本身的颜色仍会覆盖背景。需通过 `-webkit-text-fill-color: transparent`（WebKit 前缀）或 `color: transparent` 使文字颜色透明。

</details>

**题目 5**：`conic-gradient` 的起始角度（12 点方向）可通过 ________ 关键字调整。

<details>
<summary>答案与解析</summary>

**答案**：`from <angle>`

**解析**：`conic-gradient(from 45deg, ...)` 表示从 45° 开始（顺时针），用于调整起始位置，常用于隐藏接缝。

</details>

### 10.3 编程题

**题目 1**：使用 `conic-gradient` 实现一个 75% 完成的进度环，带中心镂空与百分比文字。

<details>
<summary>答案与解析</summary>

**答案**：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>进度环</title>
<style>
  .progress-ring {
    position: relative;
    width: 200px;
    height: 200px;
    border-radius: 50%;
    /* 75% 完成 */
    background: conic-gradient(
      #4caf50 0% 75%,
      #e0e0e0 75% 100%
    );
  }

  /* 中心镂空 */
  .progress-ring::before {
    content: '';
    position: absolute;
    top: 20px;
    left: 20px;
    right: 20px;
    bottom: 20px;
    background: white;
    border-radius: 50%;
  }

  /* 百分比文字 */
  .progress-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 28px;
    font-weight: bold;
    color: #4caf50;
    z-index: 1;
  }
</style>
</head>
<body>
  <div class="progress-ring">
    <span class="progress-text">75%</span>
  </div>
</body>
</html>
```

**解析**：

1. `conic-gradient` 实现 75% 绿色 + 25% 灰色。
2. `::before` 伪元素实现中心镂空。
3. 绝对定位的 `<span>` 显示百分比。

</details>

**题目 2**：使用 `repeating-linear-gradient` 实现棋盘格纹理。

<details>
<summary>答案与解析</summary>

**答案**：

```css
.checkerboard {
  width: 300px;
  height: 300px;
  /* 两层渐变叠加实现棋盘格 */
  background:
    repeating-linear-gradient(0deg, transparent 0, transparent 40px, #000 40px, #000 80px),
    repeating-linear-gradient(90deg, transparent 0, transparent 40px, #000 40px, #000 80px);
  background-color: #fff;
}
```

**解析**：

1. 第一层：水平条纹（0deg），每 40px 交替。
2. 第二层：垂直条纹（90deg），每 40px 交替。
3. 两层叠加形成棋盘格。
4. `background-color: #fff` 提供底色。

</details>

**题目 3**：编写 JavaScript 函数，生成随机彩虹渐变字符串。

<details>
<summary>答案与解析</summary>

**答案**：

```javascript
/**
 * 生成随机彩虹渐变
 * @param {number} stops - 色标数量
 * @returns {string} linear-gradient 字符串
 */
function generateRainbowGradient(stops = 5) {
  const colors = [];
  for (let i = 0; i < stops; i++) {
    // 在 HSL 色相轮上均匀分布
    const hue = Math.round((360 / stops) * i);
    const saturation = 70 + Math.random() * 30;  // 70-100%
    const lightness = 50 + Math.random() * 20;   // 50-70%
    colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
  }

  // 首尾相同，避免接缝（适用于 conic-gradient）
  colors.push(colors[0]);

  return `linear-gradient(in oklch longer hue, ${colors.join(', ')})`;
}

// 使用示例
document.body.style.background = generateRainbowGradient(6);
```

**解析**：

1. 在 HSL 色相轮上均匀分布色标。
2. 随机化饱和度与亮度，增加多样性。
3. 使用 `oklch longer hue` 插值，确保色相完整过渡。
4. 首尾颜色相同，适用于 `conic-gradient`。

</details>

### 10.4 思考题

**题目 1**：为什么 CSS 渐变在 sRGB 空间容易出现色带？OkLab 如何解决？

<details>
<summary>答案与解析</summary>

**答案**：

**sRGB 色带的成因**：

1. **8-bit 量化**：每个通道仅 256 级，长渐变中相邻像素色差小于 1 级时无法区分。
2. **sRGB 非线性**：sRGB 空间的 gamma 编码使得暗部数值密集、亮部稀疏。线性插值在 sRGB 空间进行时，暗部变化过快，亮部变化过慢，导致感知不均匀。
3. **感知不均匀**：sRGB 空间中相同数值差不对应相同感知色差，暗部容易出现可见断层。

**OkLab 的解决方案**：

1. **感知均匀**：OkLab 空间设计为感知均匀，相同数值差对应相同感知色差。
2. **暗部平滑**：OkLab 的明度轴（L）在暗部更细腻，能呈现更平滑的过渡。
3. **色相稳定**：OkLab 的 a、b 轴（色度）在明度变化时色相偏移更小。

**结论**：使用 `in oklab` 插值能显著减少色带，提升渐变质量。

</details>

**题目 2**：在性能敏感场景下，CSS 渐变与 SVG 渐变如何选择？

<details>
<summary>答案与解析</summary>

**答案**：

**CSS 渐变优势**：

1. **GPU 加速**：浏览器对 CSS 渐变有专门优化，通常使用 GPU 合成。
2. **无需 DOM 节点**：直接作为 `background` 值，不增加 DOM 节点。
3. **简洁语法**：内联于 CSS，易于维护。

**SVG 渐变优势**：

1. **可重用**：通过 `<defs>` 定义，多次引用。
2. **动画能力强**：支持 SMIL 与 CSS 动画，可对色标单独动画。
3. **矢量精度**：在 SVG 图形内部使用时，渐变与图形一体化。

**选择建议**：

- **背景、按钮、卡片**：使用 CSS 渐变，性能优。
- **复杂矢量图形、图表**：使用 SVG 渐变，与图形一体化。
- **需色标动画**：使用 SVG 渐变或 CSS Houdini `@property`。
- **移动端**：优先 CSS 渐变，避免 SVG 解析开销。

</details>

**题目 3**：如何设计一套支持主题切换的渐变设计令牌系统？

<details>
<summary>答案与解析</summary>

**答案**：

**设计原则**：

1. **语义化命名**：使用 `--gradient-primary`、`--gradient-success` 等语义名。
2. **主题分离**：通过 `[data-theme]` 属性切换主题。
3. **方向参数化**：将方向单独提取为变量。
4. **色彩空间统一**：全局使用 `oklab` 插值。

**实现示例**：

```css
:root {
  /* 默认主题（浅色） */
  --gradient-primary: linear-gradient(in oklab, #667eea, #764ba2);
  --gradient-success: linear-gradient(in oklab, #4caf50, #81c784);
  --gradient-danger: linear-gradient(in oklab, #f44336, #e57373);
  --gradient-direction: 135deg;
}

[data-theme="dark"] {
  --gradient-primary: linear-gradient(in oklab, #4c51bf, #553c9a);
  --gradient-success: linear-gradient(in oklab, #38a169, #48bb78);
  --gradient-danger: linear-gradient(in oklab, #e53e3e, #fc8181);
}

/* 组件使用 */
.btn-primary {
  background: var(--gradient-primary);
}
```

**优势**：

1. **一致性**：全站渐变统一管理。
2. **可维护**：修改令牌即可切换主题。
3. **可扩展**：新增主题只需添加 `[data-theme]` 规则。

</details>

---

## 11. 参考文献

### 11.1 W3C 规范

- World Wide Web Consortium. (2019). *CSS Images Module Level 3*. W3C Candidate Recommendation. https://www.w3.org/TR/css-images-3/
- World Wide Web Consortium. (2024). *CSS Images Module Level 4*. W3C Working Draft. https://www.w3.org/TR/css-images-4/
- World Wide Web Consortium. (2023). *CSS Color Module Level 4*. W3C Candidate Recommendation. https://www.w3.org/TR/css-color-4/
- World Wide Web Consortium. (2024). *CSS Color Module Level 5*. W3C Working Draft. https://www.w3.org/TR/css-color-5/
- World Wide Web Consortium. (2022). *CSS Houdini: Properties and Values API Level 1*. W3C Working Draft. https://www.w3.org/TR/css-properties-values-api-1/

### 11.2 学术论文

- Björn Ottosson. (2020). *A perceptual color space for image processing*. https://bottosson.github.io/posts/oklab/
- Smith, A. R. (1978). *Color gamut transform pairs*. ACM SIGGRAPH Computer Graphics, 12(3), 12-19. DOI: 10.1145/965139.807361
- Poynton, C. (2012). *Digital Video and HD: Algorithms and Interfaces* (2nd ed.). Morgan Kaufmann. ISBN: 978-0123919267.
- Sharma, G., & Trussell, H. J. (1997). *Digital color imaging*. IEEE Transactions on Image Processing, 6(7), 901-932. DOI: 10.1109/83.597278

### 11.3 工业实践

- Bootstrap. (2024). *Bootstrap 5.4 Documentation: Background Gradient*. https://getbootstrap.com/docs/5.4/utilities/background/
- Tailwind Labs. (2024). *Tailwind CSS v3.4 Documentation: Background Image*. https://tailwindcss.com/docs/background-image
- Google. (2024). *Material Design 3: Color Roles*. https://m3.material.io/styles/color/roles
- GitHub. (2024). *Primer Design System: Color*. https://primer.style/foundations/color

### 11.4 工具与库

- CSSGradient.io. (2024). *Free CSS Gradient Generator*. https://cssgradient.io/
- Verou, L. (2024). *CSS3 Test: Conic Gradients*. https://leaverou.github.io/conic-gradient/
- Khan, A. (2024). *Gradienta: Free CSS Gradient Generator*. https://gradienta.io/

### 11.5 ACM Reference Format

- World Wide Web Consortium. 2019. *CSS Images Module Level 3*. W3C Candidate Recommendation. Retrieved July 20, 2026 from https://www.w3.org/TR/css-images-3/
- Tab Atkins, and Elika Etemad. 2024. *CSS Images Module Level 4*. W3C Working Draft. Retrieved July 20, 2026 from https://www.w3.org/TR/css-images-4/
- Björn Ottosson. 2020. *A perceptual color space for image processing*. Retrieved July 20, 2026 from https://bottosson.github.io/posts/oklab/
- Alvy Ray Smith. 1978. *Color gamut transform pairs*. In Proceedings of the 5th annual conference on Computer graphics and interactive techniques (SIGGRAPH '78). Association for Computing Machinery, New York, NY, USA, 12-19. DOI: https://doi.org/10.1145/965139.807361
- Charles Poynton. 2012. *Digital Video and HD: Algorithms and Interfaces* (2nd ed.). Morgan Kaufmann, Burlington, MA. ISBN 978-0123919267.

---

## 12. 延伸阅读

### 12.1 经典书籍

- **《CSS Secrets》** - Lea Verou 著，深入探讨渐变与色彩的高级技巧。
- **《Designing Web Interfaces》** - Bill Scott 著，渐变在 UI 设计中的应用。
- **《Color and Light in Nature and Art》** - Samuel J. Williamson 著，色彩理论。
- **《Interaction of Color》** - Josef Albers 著，色彩交互经典。

### 12.2 在线资源

- **MDN Web Docs: Using CSS gradients** - https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_images/Using_CSS_gradients
- **MDN Web Docs: linear-gradient()** - https://developer.mozilla.org/en-US/docs/Web/CSS/gradient/linear-gradient
- **MDN Web Docs: radial-gradient()** - https://developer.mozilla.org/en-US/docs/Web/CSS/gradient/radial-gradient
- **MDN Web Docs: conic-gradient()** - https://developer.mozilla.org/en-US/docs/Web/CSS/gradient/conic-gradient
- **web.dev: Smarter gradients with CSS color spaces and syntax** - https://web.dev/articles/css-color-spaces
- **CSS Tricks: CSS Gradients** - https://css-tricks.com/css-gradients/

### 12.3 视频课程

- **Frontend Masters: CSS Grid & Flexbox for Responsive Layouts** - Jen Kramer
- **Lea Verou: CSS Gradients Deep Dive** - CSSConf 演讲
- **Una Kravets: CSS Color Spaces** - Chrome Developers

### 12.4 社区博客

- **CSS-Tricks** - https://css-tricks.com/
- **Smashing Magazine** - https://www.smashingmagazine.com/category/css/
- **Lea Verou's Blog** - https://lea.verou.me/
- **Björn Ottosson's Blog** - https://bottosson.github.io/

### 12.5 规范演进方向

- **CSS Images Level 5 草案**：探讨 `mesh-gradient`（网格渐变）与 `spline-gradient`（样条插值）。
- **CSS Easing Functions Level 2**：渐变色标间的缓动函数。
- **CSS Houdini Paint API**：自定义渐变绘制，突破规范限制。
- **HDR 渐变**：支持 10-bit / 12-bit 色深与广色域。

### 12.6 相关规范

- **[CSS Backgrounds and Borders Module Level 3](https://www.w3.org/TR/css-backgrounds-3/)** - 背景与边框规范。
- **[CSS Color Module Level 4](https://www.w3.org/TR/css-color-4/)** - 色彩规范。
- **[CSS Values and Units Module Level 4](https://www.w3.org/TR/css-values-4/)** - 值与单位规范。
- **[SVG 2: Gradients and Patterns](https://www.w3.org/TR/SVG2/pservers.html)** - SVG 渐变规范。

---

## 附录 A：术语表

| 术语 | 英文 | 定义 |
| --- | --- | --- |
| 渐变 | Gradient | 平滑过渡的图像 |
| 梯度线 | Gradient Line | 线性渐变的方向轴 |
| 渐变射线 | Gradient Ray | 径向渐变的中心射线 |
| 渐变弧 | Gradient Arc | 锥形渐变的角度弧 |
| 色标 | Color Stop | 渐变中的颜色锚点 |
| 色标位置 | Color Stop Position | 色标在渐变中的位置 |
| 插值 | Interpolation | 两色标之间的颜色过渡 |
| 硬边界 | Hard Stop | 两色标位置相同 |
| 色带效应 | Banding | 渐变中的颜色断层 |
| 色彩空间 | Color Space | 颜色表示的数学模型 |
| OkLab | OkLab | 感知均匀的色彩空间（2020） |
| OkLCH | OkLCH | OkLab 的极坐标形式 |

## 附录 B：浏览器兼容性

| 特性 | Chrome | Firefox | Safari | Edge | 兼容性 |
| --- | --- | --- | --- | --- | --- |
| `linear-gradient` | 全部 | 全部 | 全部 | 全部 | 100% |
| `radial-gradient` | 全部 | 全部 | 全部 | 全部 | 100% |
| `conic-gradient` | 69+ | 83+ | 12.1+ | 79+ | 95%+ |
| `repeating-*` | 全部 | 全部 | 全部 | 全部 | 100% |
| 双色标语法 `red 25% 50%` | 89+ | 83+ | 15+ | 89+ | 90%+ |
| `in oklab` 插值 | 111+ | 113+ | 16.2+ | 111+ | 80%+ |
| `in oklch` 插值 | 111+ | 113+ | 16.2+ | 111+ | 80%+ |
| `@property` 动画 | 85+ | 128+ | 16.4+ | 85+ | 70%+ |
| `background-clip: text` | 全部（-webkit-） | 49+ | 全部（-webkit-） | 全部 | 95%+ |

## 附录 C：调试检查清单

- [ ] 使用 DevTools 检查渐变背景的 `background-image` 值
- [ ] 验证色标位置是否符合预期
- [ ] 检查 `conic-gradient` 的接缝是否隐藏
- [ ] 验证渐变文字的对比度满足 WCAG AA 标准
- [ ] 检查渐变动画的性能（避免 `background-position` 动画）
- [ ] 测试跨浏览器兼容性（特别是 `oklab` 插值）
- [ ] 验证 `prefers-reduced-motion` 下渐变动画是否暂停
- [ ] 检查 `prefers-contrast: more` 下渐变是否简化
- [ ] 使用 Lighthouse 检查 CLS（Cumulative Layout Shift）
- [ ] 编写 Playwright 视觉回归测试
