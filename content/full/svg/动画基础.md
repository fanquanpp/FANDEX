---
order: 130
title: 'SVG 动画基础'
module: svg
category: 'SVG Animation'
difficulty: advanced
description: 'SMIL animate、animateTransform、animateMotion 与 CSS 动画对比。'
author: fanquanpp
updated: '2026-07-18'
related:
  - svg/变换transform
  - svg/路径path详解
  - svg/CSS样式化
prerequisites:
  - svg/变换transform
---

## 1. SVG 动画方案对比

| 方案           | 说明                                          | 优势                    | 劣势                           |
| -------------- | --------------------------------------------- | ----------------------- | ------------------------------ |
| **SMIL**       | `<animate>`、`<animateTransform>` 等 SVG 原生 | 无需 JS、声明式、跨文档 | Chrome 曾废弃后恢复；IE 不支持 |
| **CSS**        | `@keyframes` + `transform`                    | 浏览器优化好、生态成熟  | 仅限 CSS 可控属性              |
| **JavaScript** | requestAnimationFrame + DOM 操作              | 灵活、可做复杂逻辑      | 性能消耗大、需手动优化         |

## 2. SMIL animate

`<animate>` 在指定时间内变化某个属性值。

```html
<svg viewBox="0 0 200 100">
  <rect x="10" y="40" width="40" height="20" fill="#4f5bd5">
    <animate attributeName="x" from="10" to="150" dur="2s" repeatCount="indefinite" />
  </rect>
</svg>
```

### 2.1 关键属性

| 属性            | 说明                                            |
| --------------- | ----------------------------------------------- |
| `attributeName` | 要变化的属性名                                  |
| `from / to`     | 起始/结束值                                     |
| `values`        | 关键帧值列表（分号分隔）                        |
| `dur`           | 持续时间（如 `2s`、`500ms`）                    |
| `repeatCount`   | 重复次数（数字或 `indefinite`）                 |
| `begin`         | 开始时间（如 `1s`、`click`）                    |
| `end`           | 结束条件                                        |
| `fill`          | 动画结束行为：`freeze` 保留终值 / `remove` 还原 |
| `calcMode`      | 插值模式：linear / paced / spline / discrete    |

### 2.2 values 关键帧

```html
<circle cx="50" cy="50" r="20" fill="#4f5bd5">
  <animate
    attributeName="cx"
    values="50;150;100;50"
    keyTimes="0;0.5;0.8;1"
    dur="4s"
    repeatCount="indefinite"
  />
</circle>
```

- `values`：关键帧值
- `keyTimes`：对应时间点（0-1，必须从 0 开始到 1 结束）

### 2.3 calcMode 插值模式

| 值               | 说明                            |
| ---------------- | ------------------------------- |
| `linear`（默认） | 线性插值                        |
| `paced`          | 按距离等分（适合路径）          |
| `spline`         | 贝塞尔曲线（配合 `keySplines`） |
| `discrete`       | 离散切换（无过渡）              |

```html
<animate
  attributeName="cx"
  values="50;150;50"
  keyTimes="0;0.5;1"
  keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
  calcMode="spline"
  dur="2s"
  repeatCount="indefinite"
/>
```

`keySplines` 类似 CSS `cubic-bezier`，控制每段时间的缓动曲线。

## 3. animateTransform

`<animateTransform>` 专用于 `transform` 属性动画。

```html
<rect x="-25" y="-25" width="50" height="50" fill="#4f5bd5">
  <animateTransform
    attributeName="transform"
    type="rotate"
    from="0 0 0"
    to="360 0 0"
    dur="4s"
    repeatCount="indefinite"
  />
</rect>
```

### 3.1 type 类型

| 值                | 说明                               |
| ----------------- | ---------------------------------- |
| `translate`       | 平移                               |
| `rotate`          | 旋转（需指定中心 `from="0 cx cy"`) |
| `scale`           | 缩放                               |
| `skewX` / `skewY` | 倾斜                               |

### 3.2 多变换叠加

```html
<g>
  <animateTransform
    attributeName="transform"
    type="translate"
    values="0 0; 100 0; 0 0"
    dur="4s"
    repeatCount="indefinite"
    additive="sum"
  />
  <animateTransform
    attributeName="transform"
    type="rotate"
    values="0; 360"
    dur="2s"
    repeatCount="indefinite"
    additive="sum"
  />
  <rect x="-20" y="-20" width="40" height="40" fill="#4f5bd5" />
</g>
```

`additive="sum"` 让多个 animateTransform 共同作用。

## 4. animateMotion 路径动画

`<animateMotion>` 让元素沿指定路径运动。

```html
<svg viewBox="0 0 300 200">
  <path id="motion-path" d="M 20 100 Q 150 20 280 100" fill="none" stroke="#ccc" />
  <circle r="10" fill="#4f5bd5">
    <animateMotion dur="3s" repeatCount="indefinite">
      <mpath href="#motion-path" />
    </animateMotion>
  </circle>
</svg>
```

### 4.1 path 属性内联

```html
<circle r="8" fill="#d63031">
  <animateMotion path="M 0 0 L 100 0 L 100 100 L 0 100 Z" dur="4s" repeatCount="indefinite" />
</circle>
```

### 4.2 rotate 自动朝向

```html
<g>
  <polygon points="0,-10 15,0 0,10" fill="#4f5bd5" />
  <animateMotion dur="4s" repeatCount="indefinite" rotate="auto">
    <mpath href="#motion-path" />
  </animateMotion>
</g>
```

| `rotate` 值    | 说明                 |
| -------------- | -------------------- |
| `auto`         | 元素方向跟随路径切线 |
| `auto-reverse` | 反向朝向             |
| `0`（默认）    | 不旋转               |

### 4.3 keyPoints 速度控制

```html
<animateMotion
  dur="4s"
  repeatCount="indefinite"
  keyPoints="0;0.5;1"
  keyTimes="0;0.5;1"
  calcMode="linear"
>
  <mpath href="#motion-path" />
</animateMotion>
```

`keyPoints` 控制路径位置进度（0-1），可做"快进慢出"等效果。

## 5. set 元素

`<set>` 是 `<animate>` 的简化版，用于瞬间设置属性值。

```html
<rect width="100" height="100" fill="#4f5bd5">
  <set attributeName="fill" to="#d63031" begin="2s" />
</rect>
<!-- 2 秒后突然变红 -->
```

## 6. begin 事件触发

`begin` 不仅支持时间，还支持事件触发。

```html
<svg viewBox="0 0 200 100">
  <rect id="btn" x="50" y="30" width="100" height="40" rx="8" fill="#4f5bd5" />
  <text x="100" y="55" text-anchor="middle" fill="#fff">点击</text>

  <circle cx="100" cy="50" r="0" fill="#d63031">
    <animate attributeName="r" from="0" to="80" begin="btn.click" dur="0.5s" fill="remove" />
  </circle>
</svg>
```

`begin="btn.click"` 表示 btn 被点击时触发动画。

### 6.1 支持的事件

| 事件                   | 触发时机            |
| ---------------------- | ------------------- |
| `click`                | 点击                |
| `mouseover`            | 鼠标悬停            |
| `mouseout`             | 鼠标移出            |
| `focusin` / `focusout` | 获取/失去焦点       |
| `begin` / `end`        | 其他动画的开始/结束 |
| `repeat`               | 动画重复            |

### 6.2 动画链式触发

```html
<rect>
  <animate id="a1" attributeName="x" from="0" to="100" dur="1s" begin="0s" fill="freeze" />
  <animate attributeName="y" from="0" to="100" dur="1s" begin="a1.end" fill="freeze" />
</rect>
```

第二个动画在第一个动画结束时启动。

## 7. CSS 动画

CSS 动画同样适用于 SVG，但需注意属性差异。

```html
<style>
  .spinner {
    transform-origin: center;
    transform-box: fill-box;
    animation: spin 2s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .pulse {
    animation: pulse 2s ease-in-out infinite;
  }
  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.2);
    }
  }
</style>

<svg viewBox="0 0 100 100">
  <circle class="spinner" cx="50" cy="50" r="20" fill="#4f5bd5" />
  <circle class="pulse" cx="50" cy="50" r="10" fill="#d63031" />
</svg>
```

### 7.1 transform-box 必要性

SVG 元素默认 `transform-origin` 以 viewBox 原点为参考。设置 `transform-box: fill-box` 让 transform-origin 以元素边界框为参考。

```css
.spinner {
  transform-origin: center;
  transform-box: fill-box;
}
```

### 7.2 CSS 动画可控制的属性

| 类别                 | 示例                               |
| -------------------- | ---------------------------------- |
| 几何属性（部分支持） | `cx`、`cy`、`r`、`width`、`height` |
| 颜色属性             | `fill`、`stroke`、`stop-color`     |
| 透明度               | `opacity`、`fill-opacity`          |
| 变换                 | `transform`                        |
| 滤镜                 | `filter`                           |

> 现代浏览器支持 CSS 动画 SVG 几何属性，但兼容性需验证。

## 8. JavaScript 动画

```javascript
const circle = document.querySelector('circle');
let start = null;

function animate(timestamp) {
  if (!start) start = timestamp;
  const progress = ((timestamp - start) / 2000) % 1;
  circle.setAttribute('cx', 50 + progress * 100);
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
```

### 8.1 Web Animations API

```javascript
const rect = document.querySelector('rect');
rect.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(200px)' }], {
  duration: 2000,
  iterations: Infinity,
  easing: 'ease-in-out',
});
```

WAAPI 性能接近 CSS 动画，且更灵活。

## 9. 性能优化

### 9.1 优先级

1. **CSS transform/opacity**（GPU 加速）
2. **SMIL**（声明式，浏览器优化）
3. **JavaScript + requestAnimationFrame**（最灵活但开销大）

### 9.2 will-change 提示

```css
.animated-element {
  will-change: transform;
}
```

提示浏览器将元素提升为独立图层，避免重绘整个 SVG。

### 9.3 避免布局抖动

```javascript
// 错误：每次读取 offsetWidth 触发布局
function animate() {
  const x = element.offsetWidth;
  element.style.transform = `translateX(${x + 1}px)`;
  requestAnimationFrame(animate);
}

// 正确：用变量缓存
let x = 0;
function animate() {
  x += 1;
  element.style.transform = `translateX(${x}px)`;
  requestAnimationFrame(animate);
}
```

## 10. 实战：加载动画

```html
<svg viewBox="0 0 100 100" width="100" height="100">
  <g class="spinner">
    <circle cx="50" cy="50" r="40" fill="none" stroke="#e0e0e0" stroke-width="6" />
    <circle
      cx="50"
      cy="50"
      r="40"
      fill="none"
      stroke="#4f5bd5"
      stroke-width="6"
      stroke-linecap="round"
      stroke-dasharray="60 200"
    />
  </g>
  <style>
    .spinner {
      transform-origin: center;
      transform-box: fill-box;
      animation: spin 1.2s linear infinite;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  </style>
</svg>
```

**原理**：dasharray "60 200" 让圆只显示 60 长度的弧，整体旋转形成加载圈。

## 11. 实战：路径绘制动画

```html
<svg viewBox="0 0 200 100">
  <path
    d="M 10 50 Q 100 10 190 50"
    fill="none"
    stroke="#4f5bd5"
    stroke-width="3"
    stroke-dasharray="220"
    stroke-dashoffset="220"
  >
    <animate attributeName="stroke-dashoffset" from="220" to="0" dur="2s" fill="freeze" />
  </path>
</svg>
```

**步骤**：

1. `getTotalLength()` 获取路径长度（约 220）
2. `stroke-dasharray` 设为路径总长
3. `stroke-dashoffset` 从总长到 0，模拟"画线"

## 12. 浏览器兼容

| 特性                 | Chrome | Firefox | Safari | Edge |
| -------------------- | ------ | ------- | ------ | ---- |
| SMIL                 | ✓      | ✓       | ✓      | ✓    |
| CSS transform on SVG | ✓      | ✓       | ✓      | ✓    |
| CSS 动画几何属性     | ✓ 90+  | ✓       | ✓      | ✓    |
| WAAPI on SVG         | ✓      | ✓       | ✓      | ✓    |

> SMIL 曾被 Chrome 计划废弃，但因社区反馈已恢复并稳定支持。

下一篇介绍 CSS 样式化 SVG 的完整方案。
