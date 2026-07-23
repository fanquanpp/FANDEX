# SVG 文档结构 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## svg 根元素

**svg 根元素签名**
`<svg width="<宽>" height="<高>" viewBox="<min-x> <min-y> <w> <h>" xmlns="http://www.w3.org/2000/svg" [xmlns:xlink="http://www.w3.org/1999/xlink"] [preserveAspectRatio="<align> <meetOrSlice>"]> ... </svg>`
```html
<svg
  width="400"
  height="300"
  viewBox="0 0 400 300"
  xmlns="http://www.w3.org/2000/svg"
  xmlns:xlink="http://www.w3.org/1999/xlink"
>
  <!-- 内容 -->
</svg>
```

### svg 关键属性

| 属性                  | 作用       | 说明                                                 |
| --------------------- | ---------- | ---------------------------------------------------- |
| `width` / `height`    | 视口尺寸   | 可用像素或百分比;内联 SVG 省略时默认 100% × 100%   |
| `viewBox`             | 内部坐标系 | `min-x min-y width height`,决定图形映射到视口的方式 |
| `xmlns`               | 命名空间   | 独立 .svg 文件必需;内联在 HTML 中可省略           |
| `preserveAspectRatio` | 宽高比策略 | 控制 viewBox 如何适配视口                            |
| `role` / `aria-label` | 可访问性   | 为屏幕阅读器提供语义                                 |

---

## 内联与独立文件

**内联 SVG(HTML)**
`<svg viewBox="<min-x> <min-y> <w> <h>"> ... </svg>`
```html
<!-- 内联:HTML 解析器宽容,可省略 xmlns -->
<svg viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="40" />
</svg>
```

**独立 .svg 文件**
`<?xml version="1.0" encoding="UTF-8"?>` + `<svg xmlns="http://www.w3.org/2000/svg" viewBox="<min-x> <min-y> <w> <h>"> ... </svg>`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="40" />
</svg>
```

---

## g 分组元素

**g 分组**
`<g [fill="<填充色>"] [stroke="<描边色>"] [stroke-width="<描边宽度>"] [transform="<变换>"]> ... </g>`
```html
<svg viewBox="0 0 200 100">
  <g fill="#4f5bd5" stroke="#fff" stroke-width="2">
    <circle cx="50" cy="50" r="30" />
    <rect x="90" y="20" width="60" height="60" rx="8" />
  </g>
</svg>
```

---

## defs 定义元素

**defs 可复用资源定义**
`<defs> ... </defs>`
```html
<svg viewBox="0 0 200 100">
  <defs>
    <linearGradient id="brand" x1="0%" x2="100%">
      <stop offset="0%" stop-color="#4f5bd5" />
      <stop offset="100%" stop-color="#00b894" />
    </linearGradient>
  </defs>
  <rect width="200" height="100" fill="url(#brand)" />
</svg>
```

---

## symbol 符号元素

**symbol 自带 viewBox 的可复用符号**
`<symbol id="<标识>" viewBox="<min-x> <min-y> <w> <h>"> ... </symbol>`
```html
<svg>
  <symbol id="icon-close" viewBox="0 0 24 24">
    <path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" stroke-width="2" />
  </symbol>
  <use href="#icon-close" x="0" y="0" width="24" height="24" />
</svg>
```

---

## use 引用元素

**use 实例化引用**
`<use href="<#id 或 文件路径#id>" [x="<x>"] [y="<y>"] [width="<宽>"] [height="<高>"] [fill="<填充色>"] />`
```html
<use href="#icon-close" x="100" y="50" width="32" height="32" fill="#d63031" />
```

**跨文件引用**
`<use href="<文件路径#id>" width="<宽>" height="<高>" />`
```html
<use href="icons.svg#icon-close" width="24" height="24" />
```

---

## title 与 desc

**可访问性标题与描述**
`<title id="<标识>"><标题></title>` + `<desc id="<标识>"><描述></desc>`
```html
<svg viewBox="0 0 200 100" role="img" aria-labelledby="t d">
  <title id="t">2024 年度销售额</title>
  <desc id="d">柱状图展示四个季度的销售额对比</desc>
  <!-- 图形 -->
</svg>
```

---

## metadata 元数据

**metadata 元信息**
`<metadata> ... </metadata>`
```html
<metadata>
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:creator>fanquanpp</dc:creator>
      <dc:date>2026-07-18</dc:date>
    </rdf:Description>
  </rdf:RDF>
</metadata>
```

---

## 元素嵌套规则

### 容器元素
可包含其他图形元素的容器:`<svg>`、`<g>`、`<defs>`、`<symbol>`、`<a>`、`<mask>`、`<pattern>`、`<marker>`。

### 图形元素
只能作为叶子节点或包含动画元素:`<rect>`、`<circle>`、`<ellipse>`、`<line>`、`<polyline>`、`<polygon>`、`<path>`、`<text>`、`<image>`、`<use>`。

---

## 嵌套 svg

**嵌套 svg 建立子坐标系**
`<svg x="<x>" y="<y>" width="<宽>" height="<高>" viewBox="<min-x> <min-y> <w> <h>"> ... </svg>`
```html
<svg viewBox="0 0 400 200">
  <svg x="0" y="0" width="200" height="200" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="40" fill="#4f5bd5" />
  </svg>
  <svg x="200" y="0" width="200" height="200" viewBox="0 0 100 100">
    <rect x="10" y="10" width="80" height="80" fill="#00b894" />
  </svg>
</svg>
```

---

## switch 特性检测

**switch 兼容降级**
`<switch> ... </switch>`
```html
<switch>
  <text requiredFeatures="http://www.w3.org/TR/SVG11/feature#Extensibility"> 高级特性可用 </text>
  <text>降级文本</text>
</switch>
```

---

## 属性继承规则

### 可继承属性

| 类别 | 属性                                                                    |
| ---- | ----------------------------------------------------------------------- |
| 颜色 | `color`、`fill`、`stroke`、`stop-color`                                 |
| 描边 | `stroke-width`、`stroke-linecap`、`stroke-linejoin`、`stroke-dasharray` |
| 文本 | `font-family`、`font-size`、`font-weight`、`text-anchor`、`direction`   |
| 其他 | `opacity`、`visibility`、`cursor`、`letter-spacing`                     |

### 不可继承属性
`x`、`y`、`cx`、`cy`、`r`、`width`、`height`、`transform`、`filter`、`clip-path`、`mask` 等几何与变换属性不可继承。

---

## currentColor 关键字

**currentColor 引用当前 color 属性**
`fill="currentColor"` / `stroke="currentColor"`
```html
<g color="#d63031">
  <rect width="100" height="100" fill="currentColor" />
  <circle cx="150" cy="50" r="40" stroke="currentColor" fill="none" />
</g>
```

---

## 完整文档示例

**完整 SVG 文档结构**
```html
<?xml version="1.0" encoding="UTF-8"?>
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 300 150"
  role="img"
  aria-labelledby="title desc"
>
  <title id="title">品牌 Logo</title>
  <desc id="desc">由矩形与圆形组合而成的简化 Logo</desc>

  <defs>
    <linearGradient id="brand-grad" x1="0%" x2="100%">
      <stop offset="0%" stop-color="#4f5bd5" />
      <stop offset="100%" stop-color="#00b894" />
    </linearGradient>
    <symbol id="dot" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="8" fill="#fff" />
    </symbol>
  </defs>

  <g fill="url(#brand-grad)">
    <rect x="10" y="30" width="200" height="90" rx="12" />
  </g>

  <use href="#dot" x="180" y="55" width="30" height="30" />
  <text x="110" y="80" text-anchor="middle" fill="#fff" font-size="28" font-family="sans-serif">
    FANDEX
  </text>
</svg>
```
