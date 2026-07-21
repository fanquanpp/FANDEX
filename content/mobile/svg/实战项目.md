# SVG 实战项目 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 环形进度条语法

**stroke-dasharray 控制进度**
`<circle r="<半径>" stroke-dasharray="<周长>" stroke-dashoffset="<偏移>" transform="rotate(-90 <cx> <cy>)">`
```html
<svg viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="progress-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f5bd5" />
      <stop offset="100%" stop-color="#00b894" />
    </linearGradient>
  </defs>

  <!-- 背景圆 -->
  <circle cx="100" cy="100" r="80" fill="none" stroke="#e0e0e0" stroke-width="12" />

  <!-- 进度圆:rotate(-90) 让起点在 12 点钟方向 -->
  <circle
    id="progress-circle"
    cx="100"
    cy="100"
    r="80"
    fill="none"
    stroke="url(#progress-grad)"
    stroke-width="12"
    stroke-linecap="round"
    stroke-dasharray="502"
    stroke-dashoffset="502"
    transform="rotate(-90 100 100)"
  />

  <text x="100" y="100" text-anchor="middle" dominant-baseline="middle" font-size="36" font-weight="bold" fill="#333">0%</text>
</svg>

<script>
  const circle = document.getElementById('progress-circle');
  const circumference = 2 * Math.PI * 80; // 约 502

  function setProgress(percent) {
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
  }
</script>
```

### 进度条相关属性表

| 属性 | 说明 | 示例 |
| --- | --- | --- |
| `stroke-dasharray` | 虚线长度(设为周长) | `502` |
| `stroke-dashoffset` | 偏移量(控制进度) | `0~502` |
| `stroke-linecap` | 线段端点样式 | `round` |
| `transform` | 旋转起点到 12 点 | `rotate(-90 cx cy)` |

---

## 渐变描边语法

**url() 引用渐变**
`<element stroke="url(#<gradient-id>)">`
```html
<defs>
  <linearGradient id="bar-grad" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="#5b6ee8" />
    <stop offset="100%" stop-color="#4f5bd5" />
  </linearGradient>
</defs>

<rect x="10" y="20" width="80" height="200" fill="url(#bar-grad)" rx="4" />
```

---

## 阴影滤镜语法

**feDropShadow 投影**
`<filter id="<id>"><feDropShadow dx="..." dy="..." stdDeviation="..." flood-opacity="..." /></filter>`
```html
<defs>
  <filter id="bar-shadow">
    <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.1" />
  </filter>
</defs>

<rect x="10" y="20" width="80" height="200" fill="#4f5bd5" filter="url(#bar-shadow)" />
```

---

## 图表轴线语法

**坐标轴绘制**
`<line x1="..." y1="..." x2="..." y2="..." stroke="..." />`
```html
<!-- Y 轴 -->
<line class="axis" x1="60" y1="40" x2="60" y2="320" stroke="#ccc" />
<!-- X 轴 -->
<line class="axis" x1="60" y1="320" x2="560" y2="320" stroke="#ccc" />

<!-- 网格线 -->
<g stroke="#f0f0f0" stroke-dasharray="4 4">
  <line x1="60" y1="80" x2="560" y2="80" />
  <line x1="60" y1="160" x2="560" y2="160" />
  <line x1="60" y1="240" x2="560" y2="240" />
</g>

<!-- Y 轴标签 -->
<g class="label" text-anchor="end" font-size="12" fill="#666">
  <text x="55" y="324">0</text>
  <text x="55" y="244">75</text>
  <text x="55" y="164">150</text>
</g>
```

---

## JS 动态创建 SVG 元素

**createElementNS 创建**
`document.createElementNS("<svg-ns>", "<tag>")`
```javascript
const svgNS = 'http://www.w3.org/2000/svg';
const bar = document.createElementNS(svgNS, 'rect');
bar.setAttribute('x', 100);
bar.setAttribute('y', 50);
bar.setAttribute('width', 80);
bar.setAttribute('height', 200);
bar.setAttribute('fill', 'url(#bar-grad)');
bar.setAttribute('rx', 4);
svg.appendChild(bar);
```

### 常用元素创建 API

| API | 用途 |
| --- | --- |
| `createElementNS(svgNS, 'rect')` | 创建矩形 |
| `createElementNS(svgNS, 'circle')` | 创建圆形 |
| `createElementNS(svgNS, 'line')` | 创建线段 |
| `createElementNS(svgNS, 'text')` | 创建文本 |
| `createElementNS(svgNS, 'path')` | 创建路径 |
| `createElementNS(svgNS, 'g')` | 创建分组 |
| `setAttribute(name, value)` | 设置属性 |
| `getAttribute(name)` | 读取属性 |
| `appendChild(el)` | 追加子元素 |

---

## requestAnimationFrame 动画

**JS 动画循环**
`requestAnimationFrame(<callback>)`
```javascript
const duration = 2000;
const target = 75;
const start = performance.now();
let current = 0;

function animate(now) {
  const elapsed = now - start;
  const t = Math.min(elapsed / duration, 1);
  // ease-out cubic 缓动
  const eased = 1 - Math.pow(1 - t, 3);
  current = Math.round(eased * target);
  setProgress(current);
  if (t < 1) requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
```

---

## CSS transition 动画

**transition 延迟入场**
`<selector> { transition: all <dur> <easing>; transition-delay: <delay>; }`
```css
.bar {
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  transition-delay: 0.1s;
}
.value {
  opacity: 0;
  transition: opacity 0.4s;
  transition-delay: 0.5s;
}
```

```javascript
// 触发动画
requestAnimationFrame(() => {
  bar.setAttribute('height', barHeight);
  value.style.opacity = '1';
});
```

---

## path 动画语法

**animate 动画 d 属性**
`<path d="..."><animate attributeName="d" values="..." dur="..." repeatCount="indefinite" /></path>`
```html
<path d="M 100 95 Q 200 105 300 95" fill="none" stroke="url(#logo-grad)" stroke-width="2" stroke-linecap="round">
  <animate
    attributeName="d"
    values="M 100 95 Q 200 105 300 95; M 100 95 Q 200 85 300 95; M 100 95 Q 200 105 300 95"
    dur="3s"
    repeatCount="indefinite"
  />
</path>
```

---

## stop-color 动画

**渐变色 stop 颜色变化**
`<stop offset="..." stop-color="..."><animate attributeName="stop-color" values="..." dur="..." repeatCount="indefinite" /></stop>`
```html
<defs>
  <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#4f5bd5">
      <animate
        attributeName="stop-color"
        values="#4f5bd5;#00b894;#4f5bd5"
        dur="6s"
        repeatCount="indefinite"
      />
    </stop>
    <stop offset="100%" stop-color="#00b894">
      <animate
        attributeName="stop-color"
        values="#00b894;#4f5bd5;#00b894"
        dur="6s"
        repeatCount="indefinite"
      />
    </stop>
  </linearGradient>
</defs>
```

---

## tspan 文本拆分动画

**tspan 逐字符动画**
`<text><tspan class="letter">F</tspan><tspan class="letter">A</tspan>...</text>`
```html
<style>
  .logo-text {
    font-family: 'Inter', sans-serif;
    font-size: 48px;
    font-weight: bold;
    fill: url(#logo-grad);
  }
  .logo-letter {
    transform-origin: center;
    transform-box: fill-box;
  }
  .logo-letter:nth-child(1) { animation: bounce 2s ease-in-out infinite; }
  .logo-letter:nth-child(2) { animation: bounce 2s ease-in-out infinite 0.1s; }
  .logo-letter:nth-child(3) { animation: bounce 2s ease-in-out infinite 0.2s; }
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
</style>

<text x="200" y="75" text-anchor="middle" class="logo-text">
  <tspan class="logo-letter">F</tspan>
  <tspan class="logo-letter">A</tspan>
  <tspan class="logo-letter">N</tspan>
  <tspan class="logo-letter">D</tspan>
  <tspan class="logo-letter">E</tspan>
  <tspan class="logo-letter">X</tspan>
</text>
```

### tspan 属性表

| 属性 | 说明 | 示例 |
| --- | --- | --- |
| `x` | 绝对 x 坐标 | `100` |
| `y` | 绝对 y 坐标 | `75` |
| `dx` | 相对 x 偏移 | `5` |
| `dy` | 相对 y 偏移 | `0` |
| `rotate` | 旋转角度 | `0` |
| `textLength` | 文本长度 | `200` |

---

## radialGradient 节点语法

**径向渐变节点**
`<radialGradient id="..."><stop offset="..." stop-color="..." /></radialGradient>`
```html
<defs>
  <radialGradient id="node-grad">
    <stop offset="0%" stop-color="#4f5bd5" />
    <stop offset="100%" stop-color="#3a47b8" />
  </radialGradient>
</defs>

<circle cx="200" cy="200" r="8" fill="url(#node-grad)" />
```

---

## pattern 网格背景

**pattern 平铺图案**
`<pattern id="..." width="..." height="..." patternUnits="userSpaceOnUse">...</pattern>`
```html
<defs>
  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f0f0f0" stroke-width="1" />
  </pattern>
</defs>

<rect width="800" height="600" fill="url(#grid)" />
```

### pattern 属性表

| 属性 | 说明 | 默认值 |
| --- | --- | --- |
| `width` | 单元格宽度 | - |
| `height` | 单元格高度 | - |
| `patternUnits` | 单位坐标系 | `objectBoundingBox` |
| `patternContentUnits` | 内容单位 | `userSpaceOnUse` |
| `patternTransform` | 变换 | `none` |
| `x` | x 偏移 | `0` |
| `y` | y 偏移 | `0` |

---

## 脉冲动画语法

**节点脉冲环**
`<circle class="pulse-ring" r="..."><animate attributeName="r" values="..." dur="..." repeatCount="indefinite" /></circle>`
```html
<g class="node-group" transform="translate(200, 200)">
  <!-- 脉冲环 -->
  <circle class="pulse-ring" r="15" fill="none" stroke="#4f5bd5" stroke-width="2">
    <animate attributeName="r" values="15;25;15" dur="2s" repeatCount="indefinite" />
    <animate attributeName="opacity" values="1;0;1" dur="2s" repeatCount="indefinite" />
  </circle>
  <!-- 节点圆 -->
  <circle r="8" fill="url(#node-grad)" filter="url(#node-glow)" />
  <!-- 标签 -->
  <text y="-15" text-anchor="middle" font-size="12" fill="#333">北京</text>
</g>
```

---

## begin 延迟动画

**begin 延迟启动**
`<animate attributeName="..." values="..." dur="..." begin="<delay>" repeatCount="indefinite" />`
```html
<!-- 第二个节点延迟 0.5s 启动 -->
<animate attributeName="r" values="15;25;15" dur="2s" begin="0.5s" repeatCount="indefinite" />

<!-- 第三个节点延迟 1s 启动 -->
<animate attributeName="r" values="15;25;15" dur="2s" begin="1s" repeatCount="indefinite" />
```

### begin 事件触发表

| 触发方式 | 语法 | 说明 |
| --- | --- | --- |
| 时间 | `2s` | 2 秒后启动 |
| 点击 | `click` | 元素点击时启动 |
| 鼠标进入 | `mouseover` | 鼠标进入时启动 |
| 元素结束 | `elemId.end` | 指定动画结束时启动 |
| 元素开始 | `elemId.begin` | 指定动画开始时启动 |
| 事件+时间 | `click+2s` | 点击后延迟 2s 启动 |

---

## 连接线语法

**节点间连线**
`<line x1="..." y1="..." x2="..." y2="..." stroke="..." stroke-width="..." opacity="..." />`
```html
<g class="connections">
  <line x1="200" y1="200" x2="400" y2="300" stroke="#4f5bd5" stroke-width="1.5" opacity="0.4" />
  <line x1="400" y1="300" x2="600" y2="200" stroke="#4f5bd5" stroke-width="1.5" opacity="0.4" />
</g>
```

---

## hover 交互语法

**CSS hover 缩放**
`<selector>:hover { transform: scale(<factor>); }`
```css
.node {
  cursor: pointer;
  transition: transform 0.2s;
  transform-origin: center;
  transform-box: fill-box;
}
.node:hover {
  transform: scale(1.3);
}
```

```html
<circle class="node" r="8" fill="url(#node-grad)" />
```

---

## 折线图语法

**polyline 折线**
`<polyline points="<x1>,<y1> <x2>,<y2> ..." fill="none" stroke="..." stroke-width="..." />`
```html
<svg viewBox="0 0 600 400">
  <polyline
    points="50,300 100,250 150,280 200,200 250,220 300,150 350,180 400,120"
    fill="none"
    stroke="#4f5bd5"
    stroke-width="3"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>
```

**path 折线**
`<path d="M <x1> <y1> L <x2> <y2> L <x3> <y3> ..." />`
```html
<path
  d="M 50 300 L 100 250 L 150 280 L 200 200 L 250 220 L 300 150"
  fill="none"
  stroke="#00b894"
  stroke-width="2"
/>
```

### polyline / path 折线属性表

| 属性 | 说明 | 示例 |
| --- | --- | --- |
| `points` | 点坐标列表(polyline) | `50,300 100,250` |
| `d` | 路径数据(path) | `M 50 300 L 100 250` |
| `fill` | 填充(折线用 none) | `none` |
| `stroke` | 描边颜色 | `#4f5bd5` |
| `stroke-width` | 描边宽度 | `3` |

---

## 区域填充语法

**path 填充区域**
`<path d="M <start> L <points> L <end> Z" fill="url(#<grad>)" opacity="..." />`
```html
<defs>
  <linearGradient id="area-grad" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="#4f5bd5" stop-opacity="0.4" />
    <stop offset="100%" stop-color="#4f5bd5" stop-opacity="0" />
  </linearGradient>
</defs>

<!-- 折线下方填充区域 -->
<path
  d="M 50 300 L 100 250 L 150 280 L 200 200 L 250 220 L 300 150 L 300 350 L 50 350 Z"
  fill="url(#area-grad)"
/>
```

---

## 数据点语法

**数据点圆**
`<circle cx="<x>" cy="<y>" r="<radius>" fill="..." />`
```html
<g class="points">
  <circle cx="50" cy="300" r="4" fill="#4f5bd5" />
  <circle cx="100" cy="250" r="4" fill="#4f5bd5" />
  <circle cx="150" cy="280" r="4" fill="#4f5bd5" />
  <circle cx="200" cy="200" r="4" fill="#4f5bd5" />
</g>
```

---

## 饼图 path 语法

**A 弧线绘制扇形**
`<path d="M <cx> <cy> L <x1> <y1> A <r> <r> 0 <large-arc> 1 <x2> <y2> Z" fill="..." />`
```html
<svg viewBox="0 0 200 200">
  <!-- 扇形 1:0° → 90°(large-arc=0) -->
  <path
    d="M 100 100 L 100 0 A 100 100 0 0 1 200 100 Z"
    fill="#4f5bd5"
  />
  <!-- 扇形 2:90° → 180°(large-arc=0) -->
  <path
    d="M 100 100 L 200 100 A 100 100 0 0 1 100 200 Z"
    fill="#00b894"
  />
  <!-- 扇形 3:180° → 270° -->
  <path
    d="M 100 100 L 100 200 A 100 100 0 0 1 0 100 Z"
    fill="#f9a825"
  />
  <!-- 扇形 4:270° → 360° -->
  <path
    d="M 100 100 L 0 100 A 100 100 0 0 1 100 0 Z"
    fill="#d63031"
  />
</svg>
```

### A 弧线命令参数表

| 参数 | 说明 | 示例 |
| --- | --- | --- |
| `rx` | x 轴半径 | `100` |
| `ry` | y 轴半径 | `100` |
| `x-axis-rotation` | x 轴旋转角度 | `0` |
| `large-arc-flag` | 大弧标志(0 小弧 / 1 大弧) | `0` |
| `sweep-flag` | 扫描方向(0 逆时针 / 1 顺时针) | `1` |
| `x` | 终点 x | `200` |
| `y` | 终点 y | `100` |

---

## 饼图圆环语法

**stroke-dasharray 绘制圆环段**
`<circle r="<r>" stroke="..." stroke-dasharray="<segment> <remaining>" stroke-dashoffset="<offset>" />`
```html
<svg viewBox="0 0 200 200">
  <!-- 圆环半径 80,周长 ≈ 502 -->
  <!-- 第一段 25%:dasharray=125.5 376.5,offset=0 -->
  <circle cx="100" cy="100" r="80" fill="none"
    stroke="#4f5bd5" stroke-width="30"
    stroke-dasharray="125.5 376.5"
    stroke-dashoffset="0"
    transform="rotate(-90 100 100)" />
  <!-- 第二段 25%:offset=-125.5 -->
  <circle cx="100" cy="100" r="80" fill="none"
    stroke="#00b894" stroke-width="30"
    stroke-dasharray="125.5 376.5"
    stroke-dashoffset="-125.5"
    transform="rotate(-90 100 100)" />
  <!-- 第三段 25%:offset=-251 -->
  <circle cx="100" cy="100" r="80" fill="none"
    stroke="#f9a825" stroke-width="30"
    stroke-dasharray="125.5 376.5"
    stroke-dashoffset="-251"
    transform="rotate(-90 100 100)" />
  <!-- 第四段 25%:offset=-376.5 -->
  <circle cx="100" cy="100" r="80" fill="none"
    stroke="#d63031" stroke-width="30"
    stroke-dasharray="125.5 376.5"
    stroke-dashoffset="-376.5"
    transform="rotate(-90 100 100)" />
</svg>
```

---

## 折线图入场动画

**stroke-dasharray 绘制动画**
`<polyline stroke-dasharray="<length>" stroke-dashoffset="<length>"><animate attributeName="stroke-dashoffset" from="..." to="0" dur="..." fill="freeze" /></polyline>`
```html
<polyline
  points="50,300 100,250 150,280 200,200 250,220 300,150"
  fill="none"
  stroke="#4f5bd5"
  stroke-width="3"
  stroke-dasharray="600"
  stroke-dashoffset="600"
>
  <animate
    attributeName="stroke-dashoffset"
    from="600"
    to="0"
    dur="2s"
    fill="freeze"
  />
</polyline>
```

---

## 柱状图入场动画

**rect 高度动画**
`<rect><animate attributeName="height" from="0" to="..." dur="..." fill="freeze" /><animate attributeName="y" from="..." to="..." dur="..." fill="freeze" /></rect>`
```html
<rect x="100" y="320" width="80" height="0" fill="url(#bar-grad)" rx="4">
  <animate attributeName="height" from="0" to="200" dur="0.8s" fill="freeze" />
  <animate attributeName="y" from="320" to="120" dur="0.8s" fill="freeze" />
</rect>
```

---

## transform 平移语法

**transform translate 平移**
`<g transform="translate(<x>, <y>)">...</g>`
```html
<g transform="translate(200, 200)">
  <circle r="8" fill="url(#node-grad)" />
  <text y="-15" text-anchor="middle">节点</text>
</g>

<g transform="translate(400, 300)">
  <circle r="8" fill="url(#node-grad)" />
  <text y="-15" text-anchor="middle">节点 2</text>
</g>
```

---

## rotate 旋转语法

**transform rotate 旋转**
`<element transform="rotate(<angle> [<cx> <cy>])">`
```html
<!-- 旋转进度条起点 -->
<circle
  cx="100" cy="100" r="80"
  transform="rotate(-90 100 100)"
  stroke-dasharray="502"
  stroke-dashoffset="502"
/>
```

---

## scale 缩放语法

**transform scale 缩放**
`<element transform="scale(<sx> [<sy>])">`
```html
<g transform="scale(1.5)">
  <circle cx="100" cy="100" r="50" fill="#4f5bd5" />
</g>
```

---

## 综合滤镜链语法

**feGaussianBlur + feMerge 发光**
`<filter id="..."><feGaussianBlur stdDeviation="..." result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>`
```html
<defs>
  <filter id="glow">
    <feGaussianBlur stdDeviation="3" result="b" />
    <feMerge>
      <feMergeNode in="b" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
</defs>

<circle cx="100" cy="100" r="50" fill="#4f5bd5" filter="url(#glow)" />
```

---

## 事件处理语法

**addEventListener 绑定**
`element.addEventListener('<event>', <callback>)`
```javascript
const bar = document.querySelector('.bar');
bar.addEventListener('click', (e) => {
  console.log('点击柱子');
});

bar.addEventListener('mouseenter', (e) => {
  bar.style.opacity = '0.8';
});

bar.addEventListener('mouseleave', (e) => {
  bar.style.opacity = '1';
});
```

### 常用事件表

| 事件 | 触发时机 |
| --- | --- |
| `click` | 点击 |
| `mouseenter` | 鼠标进入 |
| `mouseleave` | 鼠标离开 |
| `mouseover` | 鼠标移过 |
| `mouseout` | 鼠标移出 |
| `keydown` | 键盘按下 |
| `focus` | 获得焦点 |
| `blur` | 失去焦点 |

---

## DocumentFragment 批量插入

**批量插入优化**
`const fragment = document.createDocumentFragment(); ... svg.appendChild(fragment);`
```javascript
const svgNS = 'http://www.w3.org/2000/svg';
const fragment = document.createDocumentFragment();

for (let i = 0; i < 100; i++) {
  const circle = document.createElementNS(svgNS, 'circle');
  circle.setAttribute('cx', Math.random() * 400);
  circle.setAttribute('cy', Math.random() * 300);
  circle.setAttribute('r', 3);
  circle.setAttribute('fill', '#4f5bd5');
  fragment.appendChild(circle);
}

svg.appendChild(fragment); // 一次性插入,减少重排
```

---

## 数据驱动渲染

**数据 → SVG**
`data.forEach(d => { const el = createElementNS(...); el.setAttribute(...); svg.appendChild(el); })`
```javascript
const data = [
  { label: 'Q1', value: 120 },
  { label: 'Q2', value: 165 },
  { label: 'Q3', value: 210 },
  { label: 'Q4', value: 180 },
];

const svgNS = 'http://www.w3.org/2000/svg';
const maxValue = 250;
const chartHeight = 280;

data.forEach((d, i) => {
  const barHeight = (d.value / maxValue) * chartHeight;
  const bar = document.createElementNS(svgNS, 'rect');
  bar.setAttribute('x', 100 + i * 120);
  bar.setAttribute('y', 320 - barHeight);
  bar.setAttribute('width', 80);
  bar.setAttribute('height', barHeight);
  bar.setAttribute('fill', 'url(#bar-grad)');
  svg.appendChild(bar);
});
```

---

## 图例语法

**图例项**
`<g class="legend"><rect /><text>...</text></g>`
```html
<g class="legend" transform="translate(450, 50)">
  <rect x="0" y="0" width="12" height="12" fill="#4f5bd5" />
  <text x="20" y="10" font-size="12" fill="#333">销售额</text>

  <rect x="0" y="20" width="12" height="12" fill="#00b894" />
  <text x="20" y="30" font-size="12" fill="#333">利润</text>

  <rect x="0" y="40" width="12" height="12" fill="#f9a825" />
  <text x="20" y="50" font-size="12" fill="#333">成本</text>
</g>
```

---

## 标题与描述语法

**图表 title 与 desc**
`<svg><title>...</title><desc>...</desc>...</svg>`
```html
<svg viewBox="0 0 600 400" role="img" aria-labelledby="chart-title chart-desc">
  <title id="chart-title">2024 季度销售额</title>
  <desc id="chart-desc">柱状图展示 Q1 至 Q4 销售额,单位:万元</desc>
  <!-- 图表内容 -->
</svg>
```

---

## path 命令综合参考

**M/L/H/V 直线**
`<path d="M <x> <y> L <x> <y> H <x> V <y>" />`
```html
<path d="M 10 10 L 50 10 H 90 V 50 L 50 50 Z" fill="none" stroke="#333" />
```

**C/S/Q/T/Bézier 曲线**
`<path d="M <x> <y> C <cx1> <cy1> <cx2> <cy2> <x> <y> S <cx2> <cy2> <x> <y> Q <cx> <cy> <x> <y> T <x> <y>" />`
```html
<!-- 三次贝塞尔 -->
<path d="M 10 50 C 30 10, 70 10, 90 50" fill="none" stroke="#333" />
<!-- 二次贝塞尔 -->
<path d="M 10 50 Q 50 10, 90 50" fill="none" stroke="#333" />
```

**A 弧线**
`<path d="M <x1> <y1> A <rx> <ry> <rotation> <large-arc> <sweep> <x2> <y2>" />`
```html
<path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#333" />
```

### path 命令总表

| 命令 | 含义 | 参数 |
| --- | --- | --- |
| `M` | 移动到(绝对) | `x y` |
| `m` | 移动到(相对) | `x y` |
| `L` | 直线到(绝对) | `x y` |
| `l` | 直线到(相对) | `x y` |
| `H` | 水平线到 | `x` |
| `V` | 垂直线到 | `y` |
| `C` | 三次贝塞尔 | `cx1 cy1 cx2 cy2 x y` |
| `S` | 平滑三次贝塞尔 | `cx2 cy2 x y` |
| `Q` | 二次贝塞尔 | `cx cy x y` |
| `T` | 平滑二次贝塞尔 | `x y` |
| `A` | 弧线 | `rx ry rot large-arc sweep x y` |
| `Z` / `z` | 闭合路径 | (无参数) |
