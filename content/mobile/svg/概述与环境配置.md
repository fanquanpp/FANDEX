# SVG 嵌入方式 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 内联 SVG

**内联嵌入**
`<svg width="<宽>" height="<高>" viewBox="<min-x> <min-y> <w> <h>" xmlns="http://www.w3.org/2000/svg"> ... </svg>`
```html
<!-- 内联在 HTML 中,享有完整的 CSS 与 JavaScript 能力 -->
<svg width="100" height="100" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="40" fill="#4f5bd5" />
</svg>
```

---

## img 标签引用

**img 引用 SVG 文件**
`<img src="<文件路径>" alt="<替代文本>" width="<宽>" height="<高>" />`
```html
<!-- 无法用外部 CSS 样式化内部元素,无法执行内部 JavaScript -->
<img src="logo.svg" alt="Logo" width="200" height="100" />
```

---

## CSS 背景图引用

**CSS 背景图引用 SVG**
`background-image: url('<文件路径>');`
```css
/* 同 img 限制,且无法交互 */
.hero {
  background-image: url('pattern.svg');
  background-size: cover;
}
```

---

## object 标签嵌入

**object 嵌入 SVG**
`<object data="<文件路径>" type="image/svg+xml" width="<宽>" height="<高>"></object>`
```html
<!-- 独立文档上下文,内部脚本与样式独立运行,与主页面通信需 postMessage -->
<object data="diagram.svg" type="image/svg+xml" width="800" height="600"></object>
```

---

## iframe 嵌入

**iframe 嵌入 SVG**
`<iframe src="<文件路径>" width="<宽>" height="<高>"></iframe>`
```html
<iframe src="diagram.svg" width="800" height="600"></iframe>
```

---

## 嵌入方式能力对比

| 能力            | inline | img | CSS 背景 | object |
| --------------- | ------ | --- | -------- | ------ |
| 外部 CSS 样式化 | 是     | 否  | 否       | 否     |
| JavaScript 交互 | 是     | 否  | 否       | 仅内部 |
| 事件绑定        | 是     | 否  | 否       | 仅内部 |
| 可访问性        | 强     | 中  | 弱       | 中     |
| 缓存友好        | 否     | 是  | 是       | 是     |

---

## SVG 与 Canvas 对比

| 维度             | SVG                             | Canvas                     |
| ---------------- | ------------------------------- | -------------------------- |
| **描述方式**     | 矢量(保留模式)                | 位图(立即模式)           |
| **DOM 节点**     | 每个图形都是 DOM 元素           | 单一 canvas 元素           |
| **事件绑定**     | 可直接绑定到子元素              | 需自行做命中检测           |
| **缩放表现**     | 无损缩放                        | 放大后锯齿明显             |
| **性能特征**     | 元素多时性能下降                | 元素数量影响小             |
| **动画**         | SMIL / CSS / DOM 操作           | requestAnimationFrame 重绘 |
| **文本可访问性** | 原生支持                        | 需额外处理                 |
| **适用场景**     | 图标、图表、UI 装饰、数据可视化 | 游戏、图像处理、复杂粒子   |

---

## 第一个 SVG 示例

**完整 SVG 结构**
`<svg width="<宽>" height="<高>" viewBox="<min-x> <min-y> <w> <h>" xmlns="http://www.w3.org/2000/svg"> ... </svg>`
```html
<svg width="240" height="120" viewBox="0 0 240 120" xmlns="http://www.w3.org/2000/svg">
  <!-- 渐变定义 -->
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#4f5bd5" />
      <stop offset="100%" stop-color="#00b894" />
    </linearGradient>
  </defs>
  <!-- 矩形 -->
  <rect x="20" y="20" width="200" height="80" rx="12" fill="url(#grad)" />
  <!-- 文本 -->
  <text x="120" y="65" text-anchor="middle" fill="#fff" font-size="20" font-family="sans-serif">
    Hello SVG
  </text>
</svg>
```
