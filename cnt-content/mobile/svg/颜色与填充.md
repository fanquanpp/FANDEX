# SVG 颜色与填充 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## fill 填充

**fill 填充属性**
`fill="<颜色值 | url(#id) | currentColor | transparent>"`
```html
<svg viewBox="0 0 300 100">
  <rect x="10" y="10" width="60" height="60" fill="#4f5bd5" />
  <rect x="80" y="10" width="60" height="60" fill="rgb(0,184,148)" />
  <rect x="150" y="10" width="60" height="60" fill="rgba(214,48,49,0.5)" />
  <rect x="220" y="10" width="60" height="60" fill="url(#grad)" />
</svg>
```

### fill 支持的值

| 类型         | 示例                         |
| ------------ | ---------------------------- |
| 关键字       | `red`、`blue`、`transparent` |
| 十六进制     | `#4f5bd5`、`#fff`            |
| RGB          | `rgb(79,91,213)`             |
| RGBA         | `rgba(79,91,213,0.5)`        |
| HSL          | `hsl(233, 62%, 57%)`         |
| URL 引用     | `url(#gradient)`             |
| currentColor | 引用当前 `color` 属性        |

### fill-opacity 填充透明度

**fill-opacity 独立控制填充透明度**
`fill-opacity="<0-1>"`
```html
<circle cx="50" cy="50" r="30" fill="#4f5bd5" fill-opacity="0.5" />
<!-- 等价于 rgba(79,91,213,0.5),但 fill-opacity 可独立控制 -->
```

`fill-opacity` 与 `rgba()` 区别:fill-opacity 不影响 stroke 透明度,可单独控制填充层。

---

## stroke 描边

**stroke 描边基础属性**
```html
<rect
  x="10"
  y="10"
  width="80"
  height="60"
  fill="none"
  stroke="#4f5bd5"
  stroke-width="3"
  stroke-opacity="0.8"
/>
```

### stroke 属性列表

| 属性                | 说明                            |
| ------------------- | ------------------------------- |
| `stroke`            | 描边颜色                        |
| `stroke-width`      | 描边宽度                        |
| `stroke-opacity`    | 描边透明度                      |
| `stroke-linecap`    | 端点形状:butt / round / square |
| `stroke-linejoin`   | 拐角:miter / round / bevel     |
| `stroke-miterlimit` | 尖角最大长度比(默认 4)        |
| `stroke-dasharray`  | 虚线模式                        |
| `stroke-dashoffset` | 虚线起始偏移                    |

### stroke-miterlimit 尖角限制

**stroke-miterlimit 尖角最大长度比**
`stroke-miterlimit="<比值>"`
```html
<polyline
  points="10,90 50,10 90,90"
  stroke="#000"
  stroke-width="10"
  fill="none"
  stroke-linejoin="miter"
  stroke-miterlimit="2"
/>
<!-- 当尖角过尖(夹角小于某阈值),自动转为 bevel -->
```

默认 4,当 miter 长度超过 stroke-width 的 4 倍时自动斜切。

---

## opacity 透明度

### 元素级 opacity

**opacity 元素整体透明度**
`opacity="<0-1>"`
```html
<g opacity="0.5">
  <rect width="100" height="100" fill="#4f5bd5" />
  <circle cx="80" cy="80" r="30" fill="#d63031" />
</g>
<!-- 整组透明度 0.5,子元素互相叠加 -->
```

### opacity 与 fill-opacity 区别

```html
<!-- opacity 影响整体(含子元素叠加) -->
<g opacity="0.5">
  <rect fill="#4f5bd5" />
</g>

<!-- fill-opacity 仅影响填充层,stroke 不受影响 -->
<rect fill="#4f5bd5" fill-opacity="0.5" stroke="#000" />
```

---

## currentColor 主题色

**currentColor 引用当前 color 属性**
`fill="currentColor"` / `stroke="currentColor"`
```html
<svg viewBox="0 0 100 100" style="color: #4f5bd5">
  <circle cx="50" cy="50" r="40" fill="currentColor" />
</svg>
```

```css
.icon-primary {
  color: #4f5bd5;
}
.icon-danger {
  color: #d63031;
}
.icon-success {
  color: #00b894;
}
```

```html
<svg class="icon-danger" viewBox="0 0 24 24">
  <path d="M12 2 L22 20 L2 20 Z" fill="currentColor" />
  <text x="12" y="18" text-anchor="middle" fill="#fff" font-size="14">!</text>
</svg>
```

> `currentColor` 是 SVG 图标系统主题化的核心,让同一图标可在不同上下文中显示不同颜色。

---

## paint-order 绘制顺序

**paint-order 绘制顺序**
`paint-order="<fill | stroke | markers> ..."`
```html
<text font-size="40" stroke="#fff" stroke-width="6" fill="#4f5bd5" paint-order="stroke fill">
  描边在下
</text>
```

| 值                    | 效果                                     |
| --------------------- | ---------------------------------------- |
| `fill stroke`         | 先填充后描边(默认,描边在上)           |
| `stroke fill`         | 先描边后填充(填充在上,描边不遮挡文字) |
| `fill stroke markers` | 完整顺序                                 |

> 描边文字推荐 `stroke fill`,避免粗描边遮挡文字内部。

---

## vector-effect 矢量效果

### 默认行为:描边随缩放

```html
<svg viewBox="0 0 100 100" width="200" height="200">
  <rect x="10" y="10" width="80" height="80" fill="none" stroke="#000" stroke-width="2" />
  <!-- viewBox 100×100 缩放到 200×200,描边实际显示 4px -->
</svg>
```

### non-scaling-stroke 描边不缩放

**vector-effect="non-scaling-stroke"**
`vector-effect="non-scaling-stroke"`
```html
<svg viewBox="0 0 100 100" width="200" height="200">
  <rect
    x="10"
    y="10"
    width="80"
    height="80"
    fill="none"
    stroke="#000"
    stroke-width="2"
    vector-effect="non-scaling-stroke"
  />
  <!-- 描边始终保持 2px,不受 viewBox 缩放影响 -->
</svg>
```

### 应用场景

| 场景           | 说明                         |
| -------------- | ---------------------------- |
| **地图边界**   | 地图缩放时边界线粗细保持一致 |
| **图表网格线** | 数据图缩放时网格线宽不变     |
| **响应式图标** | 图标在不同尺寸下描边视觉一致 |
| **技术绘图**   | 工程图描边宽度有严格规范     |

---

## fill-rule 填充规则

**fill-rule 复杂路径填充规则**
`fill-rule="<nonzero | evenodd>"`
```html
<!-- 五角星中心镂空 -->
<path
  d="M 100 10 L 120 70 L 180 70 L 130 105 L 150 165 L 100 130 L 50 165 L 70 105 L 20 70 L 80 70 Z"
  fill="#d63031"
  fill-rule="evenodd"
/>
```

---

## 颜色函数

### hex 与 rgb

**RGB 颜色函数**
```html
<rect fill="#4f5bd5" />
<rect fill="rgb(79 91 213)" />
<rect fill="rgb(79 91 213 / 0.5)" />
```

### hsl 色相旋转

**HSL 颜色函数**
```html
<rect fill="hsl(233 62% 57%)" />
<rect fill="hsl(233 62% 57% / 0.5)" />
```

### color-mix 混色

**color-mix 混色函数(现代浏览器)**
`color-mix(in <色彩空间>, <颜色1> <百分比>, <颜色2>)`
```html
<rect fill="color-mix(in srgb, #4f5bd5 50%, white)" />
<!-- 50% 蓝色与白色混合 -->
```

---

## CSS 变量集成

**SVG 使用 CSS 自定义属性**
`fill="var(--<变量名>)"`
```html
<style>
  :root {
    --brand: #4f5bd5;
    --danger: #d63031;
  }
  .dark-theme {
    --brand: #8b92e8;
    --danger: #ff6b6b;
  }
</style>

<svg viewBox="0 0 100 100">
  <rect width="100" height="50" fill="var(--brand)" />
  <rect y="50" width="100" height="50" fill="var(--danger)" />
</svg>
```

切换父元素 class 即可联动 SVG 颜色变化。

---

## 描边动画

### stroke-dasharray 绘制动画

**stroke-dasharray + animate 实现绘制动画**
```html
<svg viewBox="0 0 200 100">
  <path
    d="M 10 50 Q 100 10 190 50"
    fill="none"
    stroke="#4f5bd5"
    stroke-width="3"
    stroke-dasharray="200"
    stroke-dashoffset="200"
  >
    <animate attributeName="stroke-dashoffset" from="200" to="0" dur="2s" fill="freeze" />
  </path>
</svg>
```

原理:dasharray 等于路径总长,dashoffset 从全长到 0,模拟"画线"效果。

### 流动虚线

**CSS 流动虚线动画**
```css
@keyframes dash-flow {
  to {
    stroke-dashoffset: -24;
  }
}
.flow {
  stroke-dasharray: 8 4;
  animation: dash-flow 1s linear infinite;
}
```

```html
<line x1="10" y1="50" x2="190" y2="50" stroke="#4f5bd5" stroke-width="3" class="flow" />
```

形成"蚂蚁线"效果,常用于表示数据流或加载中状态。

---

## 综合示例:渐变描边按钮

**渐变描边按钮**
```html
<svg viewBox="0 0 200 60">
  <defs>
    <linearGradient id="btn-grad" x1="0%" x2="100%">
      <stop offset="0%" stop-color="#4f5bd5" />
      <stop offset="100%" stop-color="#00b894" />
    </linearGradient>
  </defs>
  <rect
    x="2"
    y="2"
    width="196"
    height="56"
    rx="28"
    fill="none"
    stroke="url(#btn-grad)"
    stroke-width="2"
    vector-effect="non-scaling-stroke"
  />
  <text x="100" y="35" text-anchor="middle" font-size="18" fill="url(#btn-grad)" font-weight="bold">
    立即开始
  </text>
</svg>
```
