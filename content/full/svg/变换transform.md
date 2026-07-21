---
order: 90
title: 'SVG 变换 transform'
module: svg
category: 'SVG Transform'
difficulty: intermediate
description: 'translate、rotate、scale、skew、matrix 与 transform-origin 变换组合。'
author: fanquanpp
updated: '2026-07-18'
related:
  - svg/坐标系与viewBox
  - svg/渐变与图案
  - svg/动画基础
prerequisites:
  - svg/坐标系与viewBox
---

## 1. transform 属性

`transform` 对元素或分组应用几何变换，**不影响后续元素的坐标系**（除非在 `<g>` 上）。

```html
<svg viewBox="0 0 200 200">
  <rect x="50" y="50" width="50" height="50" fill="#4f5bd5" />
  <rect x="50" y="50" width="50" height="50" fill="#d63031" transform="translate(60, 0)" />
</svg>
```

## 2. 基本变换函数

### 2.1 translate 平移

```html
<rect transform="translate(50, 30)" />
<!-- 或单轴 -->
<rect transform="translate(50, 0)" />
```

| 参数 | 说明                         |
| ---- | ---------------------------- |
| `tx` | X 方向偏移                   |
| `ty` | Y 方向偏移（可省略，默认 0） |

### 2.2 rotate 旋转

```html
<rect transform="rotate(45)" />
<!-- 围绕指定点旋转 -->
<rect transform="rotate(45 100 100)" />
```

| 参数     | 说明                         |
| -------- | ---------------------------- |
| `angle`  | 旋转角度（度）               |
| `cx, cy` | 旋转中心（可省略，默认 0,0） |

> 单参数 `rotate(45)` 围绕原点 (0,0) 旋转，通常不是想要的效果。**常用 `rotate(angle cx cy)` 围绕元素中心旋转**。

### 2.3 scale 缩放

```html
<rect transform="scale(1.5)" />
<!-- 双轴独立 -->
<rect transform="scale(1.5, 0.5)" />
```

| 参数 | 说明                                |
| ---- | ----------------------------------- |
| `sx` | X 方向缩放比                        |
| `sy` | Y 方向缩放比（可省略，默认等于 sx） |

> scale 会同时缩放 stroke-width。若需保持描边不变，使用 `vector-effect="non-scaling-stroke"`。

### 2.4 skew 倾斜

```html
<rect transform="skewX(30)" /> <rect transform="skewY(15)" />
```

| 函数           | 说明        |
| -------------- | ----------- |
| `skewX(angle)` | 沿 X 轴倾斜 |
| `skewY(angle)` | 沐 Y 轴倾斜 |

## 3. matrix 矩阵

所有变换本质都是 2D 仿射矩阵：`matrix(a, b, c, d, e, f)`。

```
| a c e |
| b d f |
| 0 0 1 |
```

变换公式：

- `x' = a*x + c*y + e`
- `y' = b*x + d*y + f`

### 3.1 各变换对应的矩阵

| 变换                | matrix 参数                        |
| ------------------- | ---------------------------------- |
| `translate(tx, ty)` | `matrix(1 0 0 1 tx ty)`            |
| `rotate(θ)`         | `matrix(cosθ sinθ -sinθ cosθ 0 0)` |
| `scale(s)`          | `matrix(s 0 0 s 0 0)`              |
| `skewX(θ)`          | `matrix(1 0 tanθ 1 0 0)`           |

### 3.2 示例

```html
<rect transform="matrix(1 0 0 1 50 30)" />
<!-- 等价于 translate(50, 30) -->

<rect transform="matrix(0.707 0.707 -0.707 0.707 0 0)" />
<!-- 等价于 rotate(45) -->
```

## 4. 变换组合

多个变换用空格分隔，**从右到左**应用（类似 CSS transform）。

```html
<!-- 先 translate 再 rotate（视觉上） -->
<rect transform="translate(100, 100) rotate(45)" />

<!-- 先 rotate 再 translate -->
<rect transform="rotate(45) translate(100, 0)" />
```

### 4.1 顺序影响结果

```html
<svg viewBox="0 0 200 200">
  <!-- 原始矩形 -->
  <rect x="0" y="0" width="50" height="50" fill="#4f5bd5" />

  <!-- 先平移到 (100,100) 再绕原点旋转 45°：矩形被甩到远处 -->
  <rect
    x="0"
    y="0"
    width="50"
    height="50"
    fill="#d63031"
    transform="rotate(45) translate(100,100)"
  />

  <!-- 先绕原点旋转 45° 再平移到 (100,100)：矩形在 (100,100) 处旋转 -->
  <rect
    x="0"
    y="0"
    width="50"
    height="50"
    fill="#00b894"
    transform="translate(100,100) rotate(45)"
  />
</svg>
```

> **建议**：旋转用 `rotate(angle cx cy)` 形式，避免顺序歧义。

## 5. transform-origin

SVG 2 引入 `transform-origin`，类似 CSS 的同名属性。

```html
<rect
  x="50"
  y="50"
  width="50"
  height="50"
  transform="rotate(45)"
  transform-origin="75px 75px"
  style="transform-box: fill-box"
/>
```

### 5.1 transform-box

| 值         | 含义                          |
| ---------- | ----------------------------- |
| `view-box` | 以 SVG viewBox 为参考（默认） |
| `fill-box` | 以元素边界框为参考            |

```html
<style>
  .spin {
    transform-box: fill-box;
    transform-origin: center;
    animation: spin 2s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
<rect class="spin" x="50" y="50" width="100" height="100" fill="#4f5bd5" />
```

> `transform-box: fill-box` + `transform-origin: center` 是 SVG 元素围绕自身中心旋转的标准模式。

## 6. CSS transform 与 SVG transform

CSS transform 也可作用于 SVG 元素，但需注意坐标系差异。

### 6.1 CSS 方式

```css
.logo {
  transform: rotate(45deg);
  transform-origin: 50% 50%;
  transform-box: fill-box;
}
```

```html
<svg viewBox="0 0 200 200">
  <rect class="logo" x="50" y="50" width="100" height="100" fill="#4f5bd5" />
</svg>
```

### 6.2 两者区别

| 维度       | SVG transform 属性        | CSS transform                        |
| ---------- | ------------------------- | ------------------------------------ |
| 语法       | `rotate(45 100 100)`      | `rotate(45deg)` + `transform-origin` |
| 单位       | 无单位（默认度/像素）     | 需 `deg`、`px`                       |
| 动画       | SMIL `<animateTransform>` | CSS `@keyframes`                     |
| 性能       | 略优（直接矩阵）          | 现代浏览器已优化                     |
| 浏览器支持 | 全部                      | SVG 2 后完整支持                     |

## 7. animateTransform 变换动画

SMIL 提供 `<animateTransform>` 专门用于变换动画。

```html
<svg viewBox="0 0 200 200">
  <rect x="75" y="75" width="50" height="50" fill="#4f5bd5">
    <animateTransform
      attributeName="transform"
      type="rotate"
      from="0 100 100"
      to="360 100 100"
      dur="4s"
      repeatCount="indefinite"
    />
  </rect>
</svg>
```

### 7.1 多变换叠加 additive

```html
<g>
  <animateTransform
    attributeName="transform"
    type="translate"
    values="0 0; 100 0; 0 0"
    dur="4s"
    repeatCount="indefinite"
  />
  <animateTransform
    attributeName="transform"
    type="rotate"
    values="0; 360"
    dur="2s"
    repeatCount="indefinite"
    additive="sum"
  />
  <rect x="-25" y="-25" width="50" height="50" fill="#4f5bd5" />
</g>
```

`additive="sum"` 让多个 animateTransform 叠加，否则后一个会覆盖前一个。

## 8. 嵌套变换

`<g>` 上的 transform 会作用于所有子元素，形成坐标系嵌套。

```html
<svg viewBox="0 0 400 200">
  <g transform="translate(100, 100)">
    <!-- 子坐标系原点平移到 (100,100) -->
    <g transform="rotate(45)">
      <!-- 再旋转 45° -->
      <rect x="-25" y="-25" width="50" height="50" fill="#4f5bd5" />
    </g>
    <circle cx="0" cy="0" r="5" fill="#d63031" />
  </g>
</svg>
```

> 嵌套变换矩阵会相乘，最终变换是父子变换的复合。

## 9. 实战：地球绕太阳

```html
<svg viewBox="0 0 400 400">
  <!-- 太阳 -->
  <circle cx="200" cy="200" r="40" fill="#f9a825" />
  <!-- 地球轨道 -->
  <circle cx="200" cy="200" r="120" fill="none" stroke="#ccc" stroke-dasharray="4 4" />
  <!-- 地球绕太阳公转 -->
  <g>
    <animateTransform
      attributeName="transform"
      type="rotate"
      from="0 200 200"
      to="360 200 200"
      dur="8s"
      repeatCount="indefinite"
    />
    <!-- 地球自转 -->
    <g transform="translate(320, 200)">
      <circle cx="0" cy="0" r="15" fill="#4f5bd5">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0"
          to="360"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
    </g>
  </g>
</svg>
```

**结构**：

- 外层 `<g>` 绕太阳中心旋转 → 实现公转
- 内层 `<g>` translate 到轨道位置 → 地球位置
- 地球 circle 自身 animateTransform → 自转

## 10. 常见陷阱

### 10.1 rotate 默认绕原点

```html
<!-- 错误：矩形被甩到画布外 -->
<rect x="50" y="50" width="100" height="100" transform="rotate(45)" />

<!-- 正确：围绕矩形中心旋转 -->
<rect x="50" y="50" width="100" height="100" transform="rotate(45 100 100)" />
```

### 10.2 scale 缩放描边

```html
<!-- 描边被放大到 6px -->
<rect stroke-width="2" transform="scale(3)" />

<!-- 保持描边不变 -->
<rect stroke-width="2" transform="scale(3)" vector-effect="non-scaling-stroke" />
```

### 10.3 transform 与 viewBox 重复缩放

```html
<!-- viewBox 已缩放 2 倍，transform scale(2) 会再缩 2 倍 -->
<svg viewBox="0 0 100 100" width="200" height="200">
  <rect width="50" height="50" transform="scale(2)" />
  <!-- 实际显示 200×200 -->
</svg>
```

下一篇介绍滤镜，构建阴影、模糊、光照等高级视觉效果。
