# SVG 坐标系与 viewBox 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 视口 viewport

**视口定义**
`<svg width="<宽>" height="<高>"> ... </svg>`
```html
<svg width="400" height="300">
  <!-- 视口为 400×300 像素 -->
</svg>
```

---

## viewBox 视图框

**viewBox 内部坐标系**
`viewBox="<min-x> <min-y> <width> <height>"`
```html
<svg width="400" height="300" viewBox="0 0 200 150">
  <!-- 内部坐标 200×150,缩放到视口 400×300,等比放大 2 倍 -->
  <rect x="0" y="0" width="100" height="75" fill="#4f5bd5" />
</svg>
```

### viewBox 核心价值

| 价值           | 说明                                    |
| -------------- | --------------------------------------- |
| **响应式适配** | 视口变化时图形按比例缩放,无需重写坐标  |
| **坐标归一化** | 可用 0-100 或 0-1 等任意范围描述图形    |
| **局部裁剪**   | 通过调整 min-x/min-y 可显示图形局部     |
| **独立于尺寸** | 同一 SVG 可用作 16px 图标或 1920px 横幅 |

---

## 坐标系方向

**SVG 坐标系原点左上角,X 向右 Y 向下**
```
(0,0) ──────→ X+
  │
  │
  ↓
  Y+
```
```html
<svg viewBox="0 0 100 100">
  <!-- 圆心 (50,50):在画布正中央 -->
  <circle cx="50" cy="50" r="40" fill="#4f5bd5" />
  <!-- (0,0) 在左上角 -->
  <rect x="0" y="0" width="20" height="20" fill="#d63031" />
</svg>
```

---

## preserveAspectRatio 宽高比策略

**preserveAspectRatio 语法**
`preserveAspectRatio="<align> <meetOrSlice>"`

### 对齐方式 align

| 值         | 含义             |
| ---------- | ---------------- |
| `xMinYMin` | 左上对齐         |
| `xMidYMid` | 居中对齐(默认) |
| `xMaxYMax` | 右下对齐         |
| `xMinYMid` | 左中对齐         |
| `xMidYMin` | 上中对齐         |

### 适配模式 meetOrSlice

| 值      | 行为                           |
| ------- | ------------------------------ |
| `meet`  | 完整显示 viewBox,留白(默认) |
| `slice` | 填满视口,可能裁剪           |
| `none`  | 拉伸变形,不保持比例         |

### 示例对比

**meet 完整显示**
`preserveAspectRatio="xMidYMid meet"`
```html
<!-- viewBox 4:3,视口 1:1 -->
<svg width="100" height="100" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
  <rect width="400" height="300" fill="#4f5bd5" />
</svg>
<!-- meet:矩形等比缩小居中,上下留白 -->
```

**slice 填满裁剪**
`preserveAspectRatio="xMidYMid slice"`
```html
<svg width="100" height="100" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
  <rect width="400" height="300" fill="#00b894" />
</svg>
<!-- slice:矩形等比放大填满,左右被裁 -->
```

**none 拉伸变形**
`preserveAspectRatio="none"`
```html
<svg width="100" height="100" viewBox="0 0 400 300" preserveAspectRatio="none">
  <rect width="400" height="300" fill="#d63031" />
</svg>
<!-- none:拉伸为正方形,变形 -->
```

---

## 响应式图标

**响应式图标 SVG**
`<svg viewBox="0 0 24 24" class="<类名>"> ... </svg>`
```html
<svg viewBox="0 0 24 24" class="icon">
  <path d="M12 2 L22 22 L2 22 Z" fill="currentColor" />
</svg>
```
```css
.icon {
  width: 24px;
  height: 24px;
}
.icon-lg {
  width: 48px;
  height: 48px;
}
```

---

## 负坐标与偏移

**负坐标 viewBox**
`viewBox="<-min-x> <-min-y> <width> <height>"`
```html
<svg viewBox="-50 -50 100 100" width="100" height="100">
  <!-- 坐标系 -50 到 50,原点 (0,0) 居中 -->
  <circle cx="0" cy="0" r="40" fill="#4f5bd5" />
  <line x1="-50" y1="0" x2="50" y2="0" stroke="#333" />
  <line x1="0" y1="-50" x2="0" y2="50" stroke="#333" />
</svg>
```

---

## 局部放大

**缩小 viewBox 实现局部放大**
```html
<svg viewBox="0 0 400 300" width="400" height="300">
  <!-- 完整图 -->
</svg>

<svg viewBox="100 75 100 75" width="400" height="300">
  <!-- 放大显示原图中央 100×75 区域 -->
</svg>
```

---

## 嵌套 svg 子坐标系

**嵌套 svg 建立子坐标系**
`<svg x="<x>" y="<y>" width="<宽>" height="<高>" viewBox="<min-x> <min-y> <w> <h>"> ... </svg>`
```html
<svg viewBox="0 0 400 200" width="400" height="200">
  <svg x="0" y="0" width="200" height="200" viewBox="0 0 100 100">
    <!-- 左侧子坐标系 100×100 映射到 200×200 -->
    <circle cx="50" cy="50" r="40" fill="#4f5bd5" />
  </svg>
  <svg x="200" y="0" width="200" height="200" viewBox="0 0 50 50">
    <!-- 右侧子坐标系 50×50 映射到 200×200,放大 4 倍 -->
    <circle cx="25" cy="25" r="20" fill="#00b894" />
  </svg>
</svg>
```

---

## 坐标系与 transform

**transform 在坐标系层面应用变换**
`<g transform="<变换函数>"> ... </g>`
```html
<svg viewBox="0 0 200 200">
  <g transform="translate(100, 100) rotate(45)">
    <!-- 此组以 (100,100) 为原点,旋转 45° -->
    <rect x="-25" y="-25" width="50" height="50" fill="#d63031" />
  </g>
</svg>
```

变换的顺序**不可交换**:`translate(100,0) rotate(45)` 与 `rotate(45) translate(100,0)` 结果不同。

---

## 常见陷阱语法

**viewBox 与视口比例不一致留白**
```html
<!-- viewBox 4:3 视口 16:9,默认 meet 会留白 -->
<svg width="640" height="360" viewBox="0 0 400 300">
  <rect width="400" height="300" fill="#4f5bd5" />
</svg>
```

**小数坐标导致抗锯齿模糊**
```html
<!-- 模糊:1px 描边落在 .5 坐标 -->
<line x1="0" y1="10.5" x2="100" y2="10.5" stroke="#000" />

<!-- 清晰:整数坐标 + 0.5 偏移技巧 -->
<line x1="0" y1="10" x2="100" y2="10" stroke="#000" />
```

**忘记设置 viewBox 导致图标无法缩放**
```html
<!-- 错误:仅有 width/height,CSS 缩放后变形 -->
<svg width="24" height="24">
  <circle cx="12" cy="12" r="10" />
</svg>

<!-- 正确:声明 viewBox,由 CSS 控制尺寸 -->
<svg viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="10" />
</svg>
```

---

## viewBox 调试

**调试用边框观察 viewBox**
`<svg viewBox="<min-x> <min-y> <w> <h>" width="<宽>" height="<高>" style="border:1px solid #ccc"> ... </svg>`
```html
<svg viewBox="0 0 100 100" width="200" height="200" style="border:1px solid #ccc">
  <rect x="10" y="10" width="80" height="80" fill="#4f5bd5" />
  <circle cx="50" cy="50" r="40" fill="none" stroke="#d63031" stroke-width="2" />
</svg>
```
