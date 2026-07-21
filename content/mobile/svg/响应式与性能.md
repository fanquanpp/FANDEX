# SVG 响应式与性能 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 响应式 SVG 基础

**仅声明 viewBox 自适应**
`<svg viewBox="<min-x> <min-y> <width> <height>" [class]="<类名>">`
```html
<!-- 不指定 width/height,仅声明 viewBox,由外层 CSS 控制实际尺寸 -->
<svg viewBox="0 0 400 300" class="responsive">
  <!-- SVG 内容按宽高比自动缩放 -->
</svg>
```

```css
.responsive {
  width: 100%;
  height: auto;
  display: block;
}
```

---

## preserveAspectRatio 适配

**完整显示留白**
`<svg viewBox="..." preserveAspectRatio="xMidYMid meet">`
```html
<!-- 4:3 内容在 16:9 容器中上下留白,完整显示 -->
<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
  <!-- 内容 -->
</svg>
```

**填满容器裁剪**
`<svg viewBox="..." preserveAspectRatio="xMidYMid slice">`
```html
<!-- 4:3 内容在 16:9 容器中左右被裁,填满容器 -->
<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
  <!-- 内容 -->
</svg>
```

### preserveAspectRatio 取值表

| 对齐方式 | 说明 |
| --- | --- |
| `xMinYMin` | 左上对齐 |
| `xMidYMin` | 顶部居中对齐 |
| `xMaxYMin` | 右上对齐 |
| `xMinYMid` | 左侧居中对齐 |
| `xMidYMid` | 居中对齐(默认) |
| `xMaxYMid` | 右侧居中对齐 |
| `xMinYMax` | 左下对齐 |
| `xMidYMax` | 底部居中对齐 |
| `xMaxYMax` | 右下对齐 |
| `meet` | 完整显示,留白 |
| `slice` | 填满容器,裁剪 |
| `none` | 拉伸变形,不保比例 |

---

## CSS aspect-ratio 控制宽高比

**容器宽高比**
`<selector> { aspect-ratio: <width> / <height>; }`
```css
.chart {
  width: 100%;
  aspect-ratio: 4 / 3;
}
```

```html
<svg class="chart" viewBox="0 0 400 300">...</svg>
```

---

## 流式 SVG 媒体查询

**视口响应式显示**
`@media (max-width: <breakpoint>) { <selector> { display: <value>; } }`
```html
<svg viewBox="0 0 400 200">
  <style>
    .mobile-only { display: none; }
    .desktop-only { display: block; }

    @media (max-width: 600px) {
      .mobile-only { display: block; }
      .desktop-only { display: none; }
    }
  </style>
  <g class="mobile-only">
    <text x="200" y="100" text-anchor="middle" font-size="20">简化视图</text>
  </g>
  <g class="desktop-only">
    <text x="200" y="50" text-anchor="middle" font-size="32">完整视图</text>
    <text x="200" y="100" text-anchor="middle" font-size="16">更多细节</text>
  </g>
</svg>
```

---

## CSS Container Queries

**容器查询声明**
`<container-selector> { container-type: inline-size; }`
```css
.chart-container {
  container-type: inline-size;
}

@container (max-width: 400px) {
  .chart .detailed {
    display: none;
  }
}
```

```html
<div class="chart-container">
  <svg class="chart" viewBox="0 0 400 300">
    <g class="detailed">...</g>
  </svg>
</div>
```

---

## 响应式属性综合

**svg 元素响应式属性**
`<svg viewBox="..." preserveAspectRatio="..." width="..." height="...">`
```html
<svg
  viewBox="0 0 100 100"
  preserveAspectRatio="xMidYMid meet"
  width="100%"
  height="100%"
  class="responsive-svg"
>
  <circle cx="50" cy="50" r="40" fill="#4f5bd5" />
</svg>
```

### svg 响应式属性表

| 属性 | 说明 | 示例 |
| --- | --- | --- |
| `viewBox` | 视口坐标系 | `0 0 400 300` |
| `preserveAspectRatio` | 宽高比保持策略 | `xMidYMid meet` |
| `width` | 宽度(CSS 可覆盖) | `100%` / `auto` |
| `height` | 高度(CSS 可覆盖) | `100%` / `auto` |
| `class` | CSS 类名 | `responsive` |

---

## CSS 响应式尺寸变体

**断点尺寸控制**
`@media (max-width: <bp>) { .icon { width: <size>; height: <size>; } }`
```css
.responsive-icon {
  width: 32px;
  height: 32px;
}

@media (max-width: 768px) {
  .responsive-icon {
    width: 24px;
    height: 24px;
  }
}

@media (max-width: 480px) {
  .responsive-icon {
    width: 16px;
    height: 16px;
  }
}
```

```html
<svg class="responsive-icon" viewBox="0 0 24 24">
  <use href="#icon-menu" />
</svg>
```

---

## 嵌入式响应式图片

**img 标签响应式 SVG**
`<img src="<file>.svg" alt="..." width="..." height="..." />`
```html
<img
  src="diagram.svg"
  alt="响应式图表"
  width="100%"
  height="auto"
  loading="lazy"
/>
```

```css
img.responsive-svg {
  width: 100%;
  height: auto;
  max-width: 800px;
}
```

---

## 响应式 viewBox 多版本

**多 viewBox 适配**
`<svg viewBox="<mobile-box>" class="svg-mobile"> / <svg viewBox="<desktop-box>" class="svg-desktop">`
```html
<!-- 移动端简化版 viewBox -->
<svg viewBox="0 0 200 200" class="svg-mobile">
  <circle cx="100" cy="100" r="50" />
</svg>

<!-- 桌面端扩展版 viewBox -->
<svg viewBox="0 0 800 400" class="svg-desktop">
  <circle cx="100" cy="200" r="50" />
  <circle cx="400" cy="200" r="50" />
  <circle cx="700" cy="200" r="50" />
</svg>
```

```css
.svg-mobile { display: none; }
.svg-desktop { display: block; }

@media (max-width: 768px) {
  .svg-mobile { display: block; }
  .svg-desktop { display: none; }
}
```

---

## 响应式字体单位

**SVG 内 em 单位**
`<text font-size="<em>em" ...>`
```html
<svg viewBox="0 0 400 200">
  <text x="200" y="100" text-anchor="middle" font-size="2em">
    响应式文本
  </text>
</svg>
```

```css
svg {
  font-size: 16px;
}
@media (max-width: 600px) {
  svg {
    font-size: 12px;
  }
}
```

---

## 响应式 transform 缩放

**CSS transform 自适应**
`<selector> { transform: scale(<factor>); transform-origin: <origin>; }`
```css
.logo-svg {
  transform-origin: center;
  transform-box: fill-box;
}

@media (max-width: 600px) {
  .logo-svg {
    transform: scale(0.7);
  }
}
```

```html
<svg class="logo-svg" viewBox="0 0 400 120">
  <text x="200" y="75" text-anchor="middle" font-size="48">LOGO</text>
</svg>
```

---

## 响应式 stroke-width

**non-scaling-stroke 属性**
`<element stroke-width="<value>" vector-effect="non-scaling-stroke" />`
```html
<svg viewBox="0 0 100 100" width="100%" height="100%">
  <!-- 描边宽度不随 SVG 缩放而变化 -->
  <rect
    x="10"
    y="10"
    width="80"
    height="80"
    fill="none"
    stroke="#333"
    stroke-width="2"
    vector-effect="non-scaling-stroke"
  />
</svg>
```

### vector-effect 取值表

| 值 | 说明 |
| --- | --- |
| `non-scaling-stroke` | 描边宽度保持不变,不随缩放 |
| `non-rotating-stroke` | 描边方向不随变换旋转 |
| `none` | 默认行为,随变换缩放 |
