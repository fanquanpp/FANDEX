# SVG 基本图形 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 矩形 rect

**矩形**
`<rect x="<左上x>" y="<左上y>" width="<宽>" height="<高>" [rx="<水平圆角>"] [ry="<垂直圆角>"] [fill="<填充色>"] [stroke="<描边色>"] [stroke-width="<描边宽度>"] />`
```html
<svg viewBox="0 0 300 150">
  <rect x="10" y="10" width="80" height="60" fill="#4f5bd5" />
  <rect x="110" y="10" width="80" height="60" rx="12" ry="12" fill="#00b894" />
  <rect x="210" y="10" width="80" height="60" rx="30" ry="10" fill="#d63031" />
</svg>
```

### rect 属性

| 属性               | 说明              | 默认值 |
| ------------------ | ----------------- | ------ |
| `x` / `y`          | 左上角坐标        | 0      |
| `width` / `height` | 宽高(必需)      | -      |
| `rx` / `ry`        | 水平/垂直圆角半径 | 0      |
| `fill`             | 填充色            | black  |
| `stroke`           | 描边色            | none   |
| `stroke-width`     | 描边宽度          | 1      |

> 当只设置 `rx` 时,`ry` 默认等于 `rx`,形成等圆角。

### 单侧圆角矩形(用 path 实现)
```html
<!-- 仅上方圆角 -->
<path d="M 10 30 Q 10 10 30 10 L 70 10 Q 90 10 90 30 L 90 70 L 10 70 Z" fill="#4f5bd5" />
```

---

## 圆形 circle

**圆形**
`<circle cx="<圆心x>" cy="<圆心y>" r="<半径>" [fill="<填充色>"] [stroke="<描边色>"] [stroke-width="<描边宽度>"] />`
```html
<svg viewBox="0 0 200 100">
  <circle cx="50" cy="50" r="40" fill="#4f5bd5" />
  <circle cx="150" cy="50" r="40" fill="none" stroke="#d63031" stroke-width="3" />
</svg>
```

### circle 属性

| 属性              | 说明         |
| ----------------- | ------------ |
| `cx` / `cy`       | 圆心坐标     |
| `r`               | 半径(必需) |
| `fill` / `stroke` | 填充与描边   |

### 描边居中特性
SVG 描边以路径为中心,**向两侧各扩展 stroke-width/2**。半径 40、描边 4 的圆,实际占据 84×84 区域。
```html
<circle cx="50" cy="50" r="40" stroke="#000" stroke-width="4" fill="none" />
<!-- 实际边界:cx-r-strokeWidth/2 到 cx+r+strokeWidth/2,即 8 到 92 -->
```

---

## 椭圆 ellipse

**椭圆**
`<ellipse cx="<圆心x>" cy="<圆心y>" rx="<水平半径>" ry="<垂直半径>" [fill="<填充色>"] [stroke="<描边色>"] />`
```html
<svg viewBox="0 0 200 100">
  <ellipse cx="100" cy="50" rx="80" ry="30" fill="#4f5bd5" />
</svg>
```

### ellipse 属性

| 属性        | 说明          |
| ----------- | ------------- |
| `cx` / `cy` | 圆心          |
| `rx` / `ry` | 水平/垂直半径 |

> 当 `rx === ry` 时,椭圆等价于圆形。

---

## 直线 line

**直线**
`<line x1="<起点x>" y1="<起点y>" x2="<终点x>" y2="<终点y>" stroke="<描边色>" [stroke-width="<描边宽度>"] [stroke-linecap="<端点形状>"] [stroke-dasharray="<虚线模式>"] />`
```html
<svg viewBox="0 0 200 100">
  <line x1="10" y1="10" x2="190" y2="90" stroke="#333" stroke-width="2" />
  <line x1="10" y1="50" x2="190" y2="50" stroke="#d63031" stroke-width="4" stroke-dasharray="8 4" />
</svg>
```

### line 属性

| 属性               | 说明                            |
| ------------------ | ------------------------------- |
| `x1` / `y1`        | 起点                            |
| `x2` / `y2`        | 终点                            |
| `stroke`           | 描边色(必需,否则不可见)      |
| `stroke-width`     | 描边宽度                        |
| `stroke-linecap`   | 端点形状:butt / round / square |
| `stroke-dasharray` | 虚线模式                        |

> `<line>` 默认无 fill,必须设置 stroke 才可见。

---

## 折线 polyline

**折线(不闭合)**
`<polyline points="<x1,y1 x2,y2 x3,y3 ...>" [fill="<填充色>"] stroke="<描边色>" [stroke-width="<描边宽度>"] />`
```html
<svg viewBox="0 0 200 100">
  <polyline
    points="10,90 50,10 90,90 130,10 170,90"
    fill="none"
    stroke="#4f5bd5"
    stroke-width="2"
  />
</svg>
```

### points 语法
```
points="x1,y1 x2,y2 x3,y3 ..."
```
也可用空格分隔:
```
points="10 90 50 10 90 90 130 10 170 90"
```

### fill 陷阱
```html
<!-- 错误:默认 fill=black,会填充封闭区域 -->
<polyline points="10,90 50,10 90,90" />

<!-- 正确:折线需显式设置 fill="none" -->
<polyline points="10,90 50,10 90,90" fill="none" stroke="#000" />
```

---

## 多边形 polygon

**多边形(自动闭合)**
`<polygon points="<x1,y1 x2,y2 ...>" [fill="<填充色>"] [stroke="<描边色>"] [stroke-width="<描边宽度>"] />`
```html
<svg viewBox="0 0 200 100">
  <polygon points="100,10 190,90 10,90" fill="#4f5bd5" />
  <polygon points="100,10 140,50 100,90 60,50" fill="#00b894" stroke="#fff" stroke-width="2" />
</svg>
```

### 常见多边形 points 示例

| 形状   | points 示例(以中心为参考)                                              |
| ------ | ------------------------------------------------------------------------ |
| 三角形 | `100,10 190,90 10,90`                                                    |
| 菱形   | `100,10 140,50 100,90 60,50`                                             |
| 五角星 | `100,10 120,70 180,70 130,105 150,165 100,130 50,165 70,105 20,70 80,70` |
| 六边形 | `100,10 170,50 170,110 100,150 30,110 30,50`                             |

---

## 描边属性

### stroke-linecap 端点

**stroke-linecap 端点形状**
`stroke-linecap="<butt | round | square>"`
```html
<line x1="10" y1="20" x2="100" y2="20" stroke="#000" stroke-width="10" stroke-linecap="butt" />
<line x1="10" y1="40" x2="100" y2="40" stroke="#000" stroke-width="10" stroke-linecap="round" />
<line x1="10" y1="60" x2="100" y2="60" stroke="#000" stroke-width="10" stroke-linecap="square" />
```

| 值       | 效果                            |
| -------- | ------------------------------- |
| `butt`   | 平直端点(默认)                |
| `round`  | 半圆端点                        |
| `square` | 方形延伸(多出 stroke-width/2) |

### stroke-linejoin 拐角

**stroke-linejoin 拐角形状**
`stroke-linejoin="<miter | round | bevel>"`
```html
<polyline
  points="10,90 50,10 90,90"
  stroke="#000"
  stroke-width="10"
  fill="none"
  stroke-linejoin="miter"
/>
<polyline
  points="110,90 150,10 190,90"
  stroke="#000"
  stroke-width="10"
  fill="none"
  stroke-linejoin="round"
/>
<polyline
  points="10,140 50,60 90,140"
  stroke="#000"
  stroke-width="10"
  fill="none"
  stroke-linejoin="bevel"
/>
```

| 值      | 效果                                        |
| ------- | ------------------------------------------- |
| `miter` | 尖角(默认,可用 `stroke-miterlimit` 限制) |
| `round` | 圆角                                        |
| `bevel` | 斜切                                        |

### stroke-dasharray 虚线

**stroke-dasharray 虚线模式**
`stroke-dasharray="<实线长度 空白长度 ...>"`
```html
<!-- 实线 -->
<line x1="10" y1="10" x2="190" y2="10" stroke="#000" />

<!-- 等长虚线:8px 实线 + 4px 空白 -->
<line x1="10" y1="30" x2="190" y2="30" stroke="#000" stroke-dasharray="8 4" />

<!-- 点线:1px 实线 + 4px 空白 -->
<line x1="10" y1="50" x2="190" y2="50" stroke="#000" stroke-dasharray="1 4" />

<!-- 复合虚线:10px + 4px + 2px + 4px -->
<line x1="10" y1="70" x2="190" y2="70" stroke="#000" stroke-dasharray="10 4 2 4" />
```

### stroke-dashoffset 起始偏移

**stroke-dashoffset 虚线起始位置**
`stroke-dashoffset="<偏移量>"`
```html
<line x1="10" y1="90" x2="190" y2="90" stroke="#000" stroke-dasharray="180" stroke-dashoffset="0" />
<!-- dashoffset 从 180 → 0 动画可模拟"绘制"效果 -->
```

---

## 基本图形对比

| 元素         | 必需属性      | 是否闭合 | 是否可填充             |
| ------------ | ------------- | -------- | ---------------------- |
| `<rect>`     | width, height | 是       | 是                     |
| `<circle>`   | r             | 是       | 是                     |
| `<ellipse>`  | rx, ry        | 是       | 是                     |
| `<line>`     | x1,y1,x2,y2   | 否       | 否(无 fill)          |
| `<polyline>` | points        | 否       | 是(但通常 fill=none) |
| `<polygon>`  | points        | 是       | 是                     |

---

## 综合示例:仪表盘

**进度环图形**
```html
<svg viewBox="0 0 200 200" width="200" height="200">
  <!-- 背景圆 -->
  <circle cx="100" cy="100" r="90" fill="none" stroke="#e0e0e0" stroke-width="12" />
  <!-- 进度弧(70%) -->
  <circle
    cx="100"
    cy="100"
    r="90"
    fill="none"
    stroke="#4f5bd5"
    stroke-width="12"
    stroke-dasharray="396 565"
    stroke-dashoffset="-141"
    transform="rotate(-90 100 100)"
    stroke-linecap="round"
  />
  <!-- 中心文本 -->
  <text x="100" y="105" text-anchor="middle" font-size="36" fill="#333">70%</text>
</svg>
```

参数说明:
- 圆周长 ≈ 2π × 90 ≈ 565
- 70% 弧长 ≈ 396
- dasharray "396 565":画 396 留 565
- rotate(-90 100 100):从 12 点钟方向开始
- stroke-linecap="round":端点圆滑
