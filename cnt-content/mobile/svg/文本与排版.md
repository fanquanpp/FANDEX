# SVG 文本与排版 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## text 文本元素

**text 基础文本**
`<text x="<基线x>" y="<基线y>" [font-family="<字体族>"] [font-size="<字号>"] [font-weight="<字重>"] [font-style="<样式>"] [fill="<颜色>"] [text-anchor="<水平对齐>"] [dominant-baseline="<垂直对齐>"] [letter-spacing="<字距>"] [text-decoration="<装饰>"]><文本内容></text>`
```html
<svg viewBox="0 0 300 100">
  <text x="20" y="50" font-size="24" fill="#4f5bd5">Hello SVG</text>
</svg>
```

### text 关键属性

| 属性                | 说明         | 默认值     |
| ------------------- | ------------ | ---------- |
| `x` / `y`           | 基线起点坐标 | 0          |
| `font-family`       | 字体族       | sans-serif |
| `font-size`         | 字号         | medium     |
| `font-weight`       | 字重         | normal     |
| `font-style`        | 字体样式     | normal     |
| `fill`              | 文字颜色     | black      |
| `text-anchor`       | 水平对齐     | start      |
| `dominant-baseline` | 垂直对齐     | alphabetic |
| `letter-spacing`    | 字距         | normal     |
| `text-decoration`   | 下划线等     | none       |

### y 是基线而非顶部

**y 坐标对应基线**
```html
<svg viewBox="0 0 300 100">
  <line x1="0" y1="50" x2="300" y2="50" stroke="#ccc" />
  <text x="20" y="50" font-size="24" fill="#4f5bd5">基线在 y=50</text>
</svg>
```

文字的基线对齐 y=50,字符主体在基线之上,下伸部分(如 g、y)在基线之下。

---

## text-anchor 水平对齐

**text-anchor 水平对齐**
`text-anchor="<start | middle | end>"`
```html
<svg viewBox="0 0 300 150">
  <line x1="150" y1="0" x2="150" y2="150" stroke="#ccc" />
  <text x="150" y="40" text-anchor="start" font-size="20">start</text>
  <text x="150" y="80" text-anchor="middle" font-size="20">middle</text>
  <text x="150" y="120" text-anchor="end" font-size="20">end</text>
</svg>
```

| 值       | 对齐方式       |
| -------- | -------------- |
| `start`  | 左对齐(默认) |
| `middle` | 居中           |
| `end`    | 右对齐         |

---

## dominant-baseline 垂直对齐

**dominant-baseline 垂直对齐**
`dominant-baseline="<alphabetic | middle | hanging | text-top | text-bottom | central>"`
```html
<svg viewBox="0 0 300 150">
  <line x1="0" y1="75" x2="300" y2="75" stroke="#ccc" />
  <text x="50" y="75" dominant-baseline="alphabetic" font-size="16">alphabetic</text>
  <text x="150" y="75" dominant-baseline="middle" font-size="16">middle</text>
  <text x="250" y="75" dominant-baseline="hanging" font-size="16">hanging</text>
</svg>
```

| 值            | 含义                       |
| ------------- | -------------------------- |
| `alphabetic`  | 字母基线(默认)           |
| `middle`      | 字符垂直中线               |
| `hanging`     | 顶部悬挂线(适合天城文等) |
| `text-top`    | 文本顶部                   |
| `text-bottom` | 文本底部                   |
| `central`     | 几何中心                   |

---

## tspan 子文本

**tspan 局部样式**
`<tspan [fill="<颜色>"] [font-weight="<字重>"] [dx="<相对x偏移>"] [dy="<相对y偏移>"] [x="<绝对x>"] [y="<绝对y>"]><内容></tspan>`
```html
<svg viewBox="0 0 300 60">
  <text x="20" y="40" font-size="24">
    <tspan fill="#4f5bd5">蓝色</tspan>
    <tspan fill="#d63031">红色</tspan>
    <tspan font-weight="bold" fill="#00b894">绿色粗体</tspan>
  </text>
</svg>
```

### 相对位置

**tspan 相对位置与换行**
```html
<text x="20" y="40" font-size="20">
  <tspan>FANDEX</tspan>
  <tspan dx="10" dy="0" fill="#4f5bd5">-Web</tspan>
  <tspan x="20" dy="30">换行到第二行</tspan>
</text>
```

- `dx` / `dy`:相对前一字符的偏移
- `x` / `y`:绝对坐标(用于强制换行)

### 字距控制

**letter-spacing 字距**
`letter-spacing="<长度>"`
```html
<text x="20" y="40" font-size="20" letter-spacing="4">字距加宽</text>
<text x="20" y="80" font-size="20" letter-spacing="-1">字距收紧</text>
```

---

## textPath 沿路径排版

**textPath 沿路径排列文字**
`<textPath href="<#路径id>" [startOffset="<起始位置>"]><文本></textPath>`
```html
<svg viewBox="0 0 300 200">
  <defs>
    <path id="curve" d="M 20 100 Q 150 20 280 100" />
  </defs>
  <use href="#curve" fill="none" stroke="#ccc" />
  <text font-size="18" fill="#4f5bd5">
    <textPath href="#curve" startOffset="0">沿曲线排列的 SVG 文字示例</textPath>
  </text>
</svg>
```

### startOffset 起始位置

**startOffset 控制起始位置**
`startOffset="<0 | 50% | 100%>"`
```html
<textPath href="#curve" startOffset="50%" text-anchor="middle"> 居中显示 </textPath>
```

| 值     | 含义       |
| ------ | ---------- |
| `0`    | 从路径起点 |
| `50%`  | 路径中点   |
| `100%` | 路径终点   |

### 环形文字

**环形文字**
```html
<svg viewBox="0 0 200 200">
  <defs>
    <path id="circle" d="M 100 100 m -75 0 a 75 75 0 1 1 150 0 a 75 75 0 1 1 -150 0" />
  </defs>
  <text font-size="14" fill="#4f5bd5">
    <textPath href="#circle" startOffset="0">围绕圆形排列的文字 · 围绕圆形排列的文字 ·</textPath>
  </text>
</svg>
```

---

## writing-mode 竖排文字

**writing-mode 竖排文字**
`writing-mode="tb"`
```html
<svg viewBox="0 0 200 200">
  <text x="50" y="20" font-size="20" writing-mode="tb">竖排文字</text>
</svg>
```

`writing-mode="tb"`(top-to-bottom)让文字垂直排列,适合中日韩排版。

---

## 字体加载与回退

**@font-face 自定义字体**
```html
<svg viewBox="0 0 400 100">
  <style>
    @font-face {
      font-family: 'CustomFont';
      src: url('font.woff2') format('woff2');
    }
    text {
      font-family: 'CustomFont', 'PingFang SC', 'Microsoft YaHei', sans-serif;
    }
  </style>
  <text x="20" y="60" font-size="32">自定义字体</text>
</svg>
```

> 独立 .svg 文件中 `<style>` 内的 `@font-face` 仅在 `<object>` / `<iframe>` 嵌入时生效;内联 SVG 中可直接使用主页面的字体规则。

---

## 文本描边与填充

**描边文字**
`fill="none" stroke="<颜色>" stroke-width="<宽度>"`
```html
<text x="20" y="40" font-size="32" fill="none" stroke="#4f5bd5" stroke-width="1.5">描边文字</text>
```

**双层:先描边后填充**
`paint-order="stroke fill"`
```html
<text
  x="20"
  y="90"
  font-size="32"
  stroke="#fff"
  stroke-width="6"
  fill="#4f5bd5"
  paint-order="stroke fill"
>
  描边填充
</text>
```

**渐变文字**
`fill="url(#<渐变id>)"`
```html
<defs>
  <linearGradient id="text-grad" x1="0%" x2="100%">
    <stop offset="0%" stop-color="#4f5bd5" />
    <stop offset="100%" stop-color="#00b894" />
  </linearGradient>
</defs>
<text x="20" y="140" font-size="32" fill="url(#text-grad)">渐变文字</text>
```

### paint-order 顺序

| 值                    | 含义                     |
| --------------------- | ------------------------ |
| `fill stroke`         | 先填充后描边(默认)     |
| `stroke fill`         | 先描边后填充(描边在下) |
| `fill stroke markers` | 完整顺序                 |

> `stroke fill` 让描边在填充下方,避免粗描边遮挡文字主体,是描边文字的常用技巧。

---

## 可访问文本

**可访问性文本结构**
```html
<svg viewBox="0 0 300 100" role="img" aria-labelledby="chart-title">
  <title id="chart-title">2024 Q1 销售额柱状图</title>
  <text x="150" y="50" text-anchor="middle" font-size="20" aria-hidden="true">销售额柱状图</text>
</svg>
```

- `<title>`:屏幕阅读器读取的主标题
- `aria-hidden="true"`:装饰性文字避免重复朗读

---

## 综合示例:数据标签图表

**带数据标签的柱状图**
```html
<svg viewBox="0 0 400 200">
  <!-- 坐标轴 -->
  <line x1="40" y1="160" x2="380" y2="160" stroke="#333" />
  <line x1="40" y1="20" x2="40" y2="160" stroke="#333" />
  <!-- 柱子与数据标签 -->
  <g font-family="sans-serif">
    <rect x="80" y="80" width="40" height="80" fill="#4f5bd5" />
    <text x="100" y="70" text-anchor="middle" font-size="14" fill="#333">120</text>
    <text x="100" y="180" text-anchor="middle" font-size="12" fill="#666">Q1</text>

    <rect x="160" y="50" width="40" height="110" fill="#00b894" />
    <text x="180" y="40" text-anchor="middle" font-size="14" fill="#333">165</text>
    <text x="180" y="180" text-anchor="middle" font-size="12" fill="#666">Q2</text>

    <rect x="240" y="20" width="40" height="140" fill="#d63031" />
    <text x="260" y="10" text-anchor="middle" font-size="14" fill="#333">210</text>
    <text x="260" y="180" text-anchor="middle" font-size="12" fill="#666">Q3</text>
  </g>
</svg>
```
