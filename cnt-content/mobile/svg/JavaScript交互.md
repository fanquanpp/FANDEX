# SVG JavaScript 交互 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## SVG DOM 操作

**SVG DOM 与 HTML DOM 一致**
```javascript
const rect = document.querySelector('rect');
rect.setAttribute('fill', '#d63031');
rect.style.opacity = '0.5';
rect.addEventListener('click', () => console.log('clicked'));
```

### SVG DOM 与 HTML DOM 差异

| 维度       | HTML                        | SVG                                                                  |
| ---------- | --------------------------- | -------------------------------------------------------------------- |
| 尺寸       | `element.style.width`       | `element.setAttribute('width', ...)`                                 |
| 颜色       | `element.style.color`       | `element.setAttribute('fill', ...)` 或 CSS                           |
| 类名       | `element.className = '...'` | `element.classList.add('...')`(SVG className 是 SVGAnimatedString) |
| 自定义属性 | `data-*`                    | 同 HTML,可用 dataset                                              |

### className 注意

**SVG className 是 SVGAnimatedString**
```javascript
// 错误:SVG 元素 className 是 SVGAnimatedString
rect.className = 'active'; // 无效

// 正确
rect.classList.add('active');
rect.classList.remove('inactive');
rect.setAttribute('class', 'active');
```

---

## 属性读写

### setAttribute / getAttribute

**SVG 属性读写**
```javascript
const circle = document.querySelector('circle');
circle.setAttribute('cx', 100);
circle.setAttribute('cy', 50);
circle.setAttribute('r', 30);

const r = parseFloat(circle.getAttribute('r'));
console.log(r); // 30
```

### 命名空间属性

**setAttributeNS 设置命名空间属性**
```javascript
const use = document.querySelector('use');
use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#icon');
// 现代浏览器推荐
use.setAttribute('href', '#icon');
```

### style 属性

**style 属性设置样式**
```javascript
rect.style.fill = '#4f5bd5';
rect.style.strokeWidth = '2px';
rect.style.opacity = '0.8';
```

---

## 动态创建元素

**createElementNS 创建 SVG 元素**
```javascript
const svgNS = 'http://www.w3.org/2000/svg';

const rect = document.createElementNS(svgNS, 'rect');
rect.setAttribute('x', 10);
rect.setAttribute('y', 10);
rect.setAttribute('width', 100);
rect.setAttribute('height', 50);
rect.setAttribute('fill', '#4f5bd5');

document.querySelector('svg').appendChild(rect);
```

SVG 元素必须用 `createElementNS` 创建,指定 SVG 命名空间。

### 封装创建函数

**createSVG 工具函数**
```javascript
function createSVG(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  return el;
}

const circle = createSVG('circle', { cx: 50, cy: 50, r: 30, fill: '#00b894' });
svg.appendChild(circle);
```

### 批量生成数据条

**数据驱动批量生成**
```javascript
const data = [
  { label: 'Q1', value: 120 },
  { label: 'Q2', value: 165 },
  { label: 'Q3', value: 210 },
  { label: 'Q4', value: 180 },
];

const svg = document.querySelector('svg');
const max = Math.max(...data.map((d) => d.value));
const barWidth = 40;
const gap = 20;

data.forEach((d, i) => {
  const h = (d.value / max) * 150;
  const x = 40 + i * (barWidth + gap);
  const y = 180 - h;

  const bar = createSVG('rect', {
    x,
    y,
    width: barWidth,
    height: h,
    fill: '#4f5bd5',
  });
  svg.appendChild(bar);

  const label = createSVG('text', {
    x: x + barWidth / 2,
    y: 195,
    'text-anchor': 'middle',
    'font-size': 12,
  });
  label.textContent = d.label;
  svg.appendChild(label);
});
```

---

## 事件处理

**SVG 事件绑定**
```javascript
const btn = document.querySelector('.btn-rect');
btn.addEventListener('click', (e) => {
  console.log('点击坐标:', e.clientX, e.clientY);
});

btn.addEventListener('mouseenter', () => {
  btn.setAttribute('fill', '#6b78ea');
});
btn.addEventListener('mouseleave', () => {
  btn.setAttribute('fill', '#4f5bd5');
});
```

### 事件委托

**事件委托模式**
```javascript
svg.addEventListener('click', (e) => {
  if (e.target.matches('.bar')) {
    const value = e.target.dataset.value;
    console.log('点击了数据条:', value);
  }
});
```

### 拖拽实现

**鼠标拖拽**
```javascript
let isDragging = false;
let offset = { x: 0, y: 0 };

const circle = document.querySelector('circle');

circle.addEventListener('mousedown', (e) => {
  isDragging = true;
  const cx = parseFloat(circle.getAttribute('cx'));
  const cy = parseFloat(circle.getAttribute('cy'));
  offset.x = e.clientX - cx;
  offset.y = e.clientY - cy;
});

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  circle.setAttribute('cx', e.clientX - offset.x);
  circle.setAttribute('cy', e.clientY - offset.y);
});

document.addEventListener('mouseup', () => {
  isDragging = false;
});
```

---

## 路径长度计算

**getTotalLength / getPointAtLength**
```javascript
const path = document.querySelector('path');
const length = path.getTotalLength();
console.log('路径总长:', length);

// 获取路径上某点的坐标
const point = path.getPointAtLength(length / 2);
console.log('中点坐标:', point.x, point.y);

// 用于绘制动画
path.style.strokeDasharray = length;
path.style.strokeDashoffset = length;
path.getBoundingClientRect(); // 触发重排
path.style.transition = 'stroke-dashoffset 2s';
path.style.strokeDashoffset = 0;
```

### 路径 API

| 方法                  | 说明                  |
| --------------------- | --------------------- |
| `getTotalLength()`    | 获取路径总长度        |
| `getPointAtLength(d)` | 获取路径上指定距离的点 |
| `getBBox()`           | 获取元素边界框        |
| `getCTM()`            | 当前变换矩阵          |
| `getScreenCTM()`      | 屏幕坐标变换矩阵      |

---

## 数据驱动更新

### 简单数据绑定

**updateChart 更新数据**
```javascript
function updateChart(data) {
  const bars = document.querySelectorAll('.bar');
  const max = Math.max(...data);

  bars.forEach((bar, i) => {
    const h = (data[i] / max) * 150;
    bar.setAttribute('height', h);
    bar.setAttribute('y', 180 - h);
  });
}

updateChart([100, 150, 200, 180]);
```

### enter/update/exit 模式

**D3 风格数据绑定**
```javascript
function renderBars(data) {
  const svg = document.querySelector('svg');
  const existing = Array.from(svg.querySelectorAll('.bar'));
  const barWidth = 40;
  const gap = 20;

  // update:更新现有元素
  existing.forEach((bar, i) => {
    if (i < data.length) {
      const h = (data[i] / Math.max(...data)) * 150;
      bar.setAttribute('height', h);
      bar.setAttribute('y', 180 - h);
    } else {
      // exit:移除多余元素
      bar.remove();
    }
  });

  // enter:添加新元素
  for (let i = existing.length; i < data.length; i++) {
    const h = (data[i] / Math.max(...data)) * 150;
    const bar = createSVG('rect', {
      class: 'bar',
      x: 40 + i * (barWidth + gap),
      y: 180 - h,
      width: barWidth,
      height: h,
      fill: '#4f5bd5',
    });
    svg.appendChild(bar);
  }
}
```

---

## SVG 与 Canvas 互转

### SVG 转 Canvas

**XMLSerializer 转 Canvas**
```javascript
const svg = document.querySelector('svg');
const svgString = new XMLSerializer().serializeToString(svg);
const blob = new Blob([svgString], { type: 'image/svg+xml' });
const url = URL.createObjectURL(blob);

const img = new Image();
img.onload = () => {
  const canvas = document.createElement('canvas');
  canvas.width = svg.clientWidth;
  canvas.height = svg.clientHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);

  // 导出为 PNG
  canvas.toBlob((blob) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'chart.png';
    link.click();
  });
};
img.src = url;
```

### SVG 转 Data URL

**SVG 转 base64 Data URL**
```javascript
const svgString = new XMLSerializer().serializeToString(svg);
const dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
```

---

## requestAnimationFrame 动画

**requestAnimationFrame 循环动画**
```javascript
const circle = document.querySelector('circle');
let t = 0;

function animate() {
  t += 0.02;
  const x = 100 + 50 * Math.cos(t);
  const y = 50 + 30 * Math.sin(t);
  circle.setAttribute('cx', x);
  circle.setAttribute('cy', y);
  requestAnimationFrame(animate);
}
animate();
```

### 缓动函数

**easings 缓动函数库**
```javascript
const easings = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
};

function animate(duration, easing, callback) {
  const start = performance.now();
  function frame(now) {
    const elapsed = now - start;
    const t = Math.min(elapsed / duration, 1);
    callback(easing(t), t);
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

animate(1000, easings.easeOutQuad, (value) => {
  circle.setAttribute('cx', 50 + value * 150);
});
```

---

## Web Animations API

**element.animate 关键帧动画**
```javascript
// 关键帧动画
const animation = rect.animate(
  [{ transform: 'translateX(0)' }, { transform: 'translateX(200px)' }],
  {
    duration: 1000,
    fill: 'forwards',
    easing: 'ease-out',
  }
);

// 控制动画
animation.pause();
animation.play();
animation.reverse();
animation.cancel();

// 监听结束
animation.onfinish = () => console.log('动画结束');
```

### WAAPI 方法

| 方法                  | 说明         |
| --------------------- | ------------ |
| `animate(keyframes, options)` | 开始动画  |
| `pause()`             | 暂停         |
| `play()`              | 播放         |
| `reverse()`           | 反向播放     |
| `cancel()`            | 取消         |
| `onfinish`            | 结束回调     |

---

## 综合示例:可交互柱状图

**动态生成可交互柱状图**
```html
<svg viewBox="0 0 400 200" class="chart">
  <line x1="40" y1="180" x2="380" y2="180" stroke="#333" />
</svg>

<script>
  const data = [
    { label: 'Q1', value: 120 },
    { label: 'Q2', value: 165 },
    { label: 'Q3', value: 210 },
    { label: 'Q4', value: 180 },
  ];

  const svg = document.querySelector('.chart');
  const max = Math.max(...data.map((d) => d.value));
  const barWidth = 60;
  const gap = 20;

  data.forEach((d, i) => {
    const h = (d.value / max) * 140;
    const x = 60 + i * (barWidth + gap);
    const y = 180 - h;

    const bar = createSVG('rect', {
      x,
      y,
      width: barWidth,
      height: h,
      fill: '#4f5bd5',
      'data-value': d.value,
    });
    bar.style.transition = 'fill 0.2s';
    bar.style.cursor = 'pointer';
    bar.addEventListener('mouseenter', () => bar.setAttribute('fill', '#6b78ea'));
    bar.addEventListener('mouseleave', () => bar.setAttribute('fill', '#4f5bd5'));
    bar.addEventListener('click', () => alert(`${d.label}: ${d.value}`));
    svg.appendChild(bar);

    const label = createSVG('text', {
      x: x + barWidth / 2,
      y: 195,
      'text-anchor': 'middle',
      'font-size': 12,
    });
    label.textContent = d.label;
    svg.appendChild(label);

    const value = createSVG('text', {
      x: x + barWidth / 2,
      y: y - 5,
      'text-anchor': 'middle',
      'font-size': 12,
      fill: '#666',
    });
    value.textContent = d.value;
    svg.appendChild(value);
  });

  function createSVG(tag, attrs = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  }
</script>
```

---

## 调试 API

**getBBox / getCTM 调试**
```javascript
// 控制台快速检查 SVG
console.log(svg.getBBox()); // 元素边界框
console.log(svg.getCTM()); // 当前变换矩阵
console.log(svg.getScreenCTM()); // 屏幕坐标变换矩阵

// 监听所有 SVG 事件
document.querySelectorAll('svg *').forEach((el) => {
  el.addEventListener('click', (e) => console.log(e.target.tagName, e));
});
```
