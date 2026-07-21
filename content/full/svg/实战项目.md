---
order: 180
title: 'SVG 实战项目'
module: svg
category: 'SVG Projects'
difficulty: advanced
description: '综合运用：仪表盘、环形进度、动画 Logo、数据可视化。'
author: fanquanpp
updated: '2026-07-18'
related:
  - svg/动画基础
  - svg/JavaScript交互
  - svg/响应式与性能
prerequisites:
  - svg/动画基础
  - svg/JavaScript交互
  - svg/图标与可访问性
---

## 1. 项目一：环形进度条

结合 path、stroke-dasharray、动画的综合应用。

```html
<svg viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="progress-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f5bd5" />
      <stop offset="100%" stop-color="#00b894" />
    </linearGradient>
    <filter id="progress-glow">
      <feGaussianBlur stdDeviation="3" result="b" />
      <feMerge>
        <feMergeNode in="b" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- 背景圆 -->
  <circle cx="100" cy="100" r="80" fill="none" stroke="#e0e0e0" stroke-width="12" />

  <!-- 进度圆 -->
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
    filter="url(#progress-glow)"
  />

  <!-- 中心文本 -->
  <text
    id="progress-text"
    x="100"
    y="100"
    text-anchor="middle"
    dominant-baseline="middle"
    font-size="36"
    font-weight="bold"
    fill="#333"
  >
    0%
  </text>
  <text x="100" y="130" text-anchor="middle" font-size="12" fill="#999">已完成</text>
</svg>

<script>
  const circle = document.getElementById('progress-circle');
  const text = document.getElementById('progress-text');
  const circumference = 2 * Math.PI * 80; // 约 502

  function setProgress(percent) {
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
    text.textContent = percent + '%';
  }

  // 动画到 75%
  let current = 0;
  const target = 75;
  const duration = 2000;
  const start = performance.now();

  function animate(now) {
    const elapsed = now - start;
    const t = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
    current = Math.round(eased * target);
    setProgress(current);
    if (t < 1) requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
</script>
```

**要点**：

- 圆周长 = 2πr = 502
- `stroke-dasharray` 设为周长，`stroke-dashoffset` 控制进度
- `rotate(-90 100 100)` 从 12 点钟方向开始
- `ease-out cubic` 缓动让进度增长自然减速

## 2. 项目二：动态数据图表

完整柱状图，含坐标轴、数据标签、交互悬停。

```html
<svg viewBox="0 0 600 400" class="chart" role="img" aria-labelledby="chart-title chart-desc">
  <title id="chart-title">2024 季度销售额</title>
  <desc id="chart-desc">柱状图展示 Q1 至 Q4 销售额，单位：万元</desc>

  <defs>
    <linearGradient id="bar-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#5b6ee8" />
      <stop offset="100%" stop-color="#4f5bd5" />
    </linearGradient>
    <filter id="bar-shadow">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.1" />
    </filter>
  </defs>

  <style>
    .bar {
      transition: opacity 0.2s;
      cursor: pointer;
    }
    .bar:hover {
      opacity: 0.8;
    }
    .label {
      font-family: sans-serif;
      font-size: 12px;
      fill: #666;
    }
    .value {
      font-family: sans-serif;
      font-size: 13px;
      fill: #333;
      font-weight: bold;
    }
    .axis {
      stroke: #ccc;
    }
  </style>

  <!-- Y 轴 -->
  <line class="axis" x1="60" y1="40" x2="60" y2="320" />
  <!-- X 轴 -->
  <line class="axis" x1="60" y1="320" x2="560" y2="320" />

  <!-- 网格线 -->
  <g stroke="#f0f0f0" stroke-dasharray="4 4">
    <line x1="60" y1="80" x2="560" y2="80" />
    <line x1="60" y1="160" x2="560" y2="160" />
    <line x1="60" y1="240" x2="560" y2="240" />
  </g>

  <!-- Y 轴标签 -->
  <g class="label" text-anchor="end">
    <text x="55" y="324">0</text>
    <text x="55" y="244">75</text>
    <text x="55" y="164">150</text>
    <text x="55" y="84">225</text>
  </g>

  <!-- 柱子由 JS 动态生成 -->
  <g id="bars"></g>
</svg>

<script>
  const data = [
    { label: 'Q1', value: 120 },
    { label: 'Q2', value: 165 },
    { label: 'Q3', value: 210 },
    { label: 'Q4', value: 180 },
  ];

  const svgNS = 'http://www.w3.org/2000/svg';
  const barsGroup = document.getElementById('bars');
  const maxValue = 250;
  const chartHeight = 280;
  const barWidth = 80;
  const gap = 40;
  const startX = 100;

  data.forEach((d, i) => {
    const barHeight = (d.value / maxValue) * chartHeight;
    const x = startX + i * (barWidth + gap);
    const y = 320 - barHeight;

    // 柱子
    const bar = document.createElementNS(svgNS, 'rect');
    bar.setAttribute('class', 'bar');
    bar.setAttribute('x', x);
    bar.setAttribute('y', y);
    bar.setAttribute('width', barWidth);
    bar.setAttribute('height', barHeight);
    bar.setAttribute('fill', 'url(#bar-grad)');
    bar.setAttribute('filter', 'url(#bar-shadow)');
    bar.setAttribute('rx', 4);

    // 初始高度 0，动画展开
    bar.setAttribute('height', 0);
    bar.setAttribute('y', 320);
    bar.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
    bar.style.transitionDelay = i * 0.1 + 's';

    barsGroup.appendChild(bar);

    // 触发动画
    requestAnimationFrame(() => {
      bar.setAttribute('height', barHeight);
      bar.setAttribute('y', y);
    });

    // X 轴标签
    const label = document.createElementNS(svgNS, 'text');
    label.setAttribute('class', 'label');
    label.setAttribute('x', x + barWidth / 2);
    label.setAttribute('y', 340);
    label.setAttribute('text-anchor', 'middle');
    label.textContent = d.label;
    barsGroup.appendChild(label);

    // 数值标签
    const value = document.createElementNS(svgNS, 'text');
    value.setAttribute('class', 'value');
    value.setAttribute('x', x + barWidth / 2);
    value.setAttribute('y', y - 8);
    value.setAttribute('text-anchor', 'middle');
    value.textContent = d.value;
    value.style.opacity = '0';
    value.style.transition = 'opacity 0.4s';
    value.style.transitionDelay = i * 0.1 + 0.4 + 's';
    barsGroup.appendChild(value);

    requestAnimationFrame(() => {
      value.style.opacity = '1';
    });

    // 交互
    bar.addEventListener('click', () => {
      alert(`${d.label}: ${d.value} 万元`);
    });
  });
</script>
```

## 3. 项目三：动画 Logo

结合渐变、路径动画、变换。

```html
<svg viewBox="0 0 400 120" width="400" height="120">
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
    <filter id="logo-glow">
      <feGaussianBlur stdDeviation="2" result="b" />
      <feMerge>
        <feMergeNode in="b" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <style>
    .logo-text {
      font-family: 'Inter', sans-serif;
      font-size: 48px;
      font-weight: bold;
      fill: url(#logo-grad);
      filter: url(#logo-glow);
    }
    .logo-letter {
      transform-origin: center;
      transform-box: fill-box;
    }
    .logo-letter:nth-child(1) {
      animation: bounce 2s ease-in-out infinite;
    }
    .logo-letter:nth-child(2) {
      animation: bounce 2s ease-in-out infinite 0.1s;
    }
    .logo-letter:nth-child(3) {
      animation: bounce 2s ease-in-out infinite 0.2s;
    }
    .logo-letter:nth-child(4) {
      animation: bounce 2s ease-in-out infinite 0.3s;
    }
    .logo-letter:nth-child(5) {
      animation: bounce 2s ease-in-out infinite 0.4s;
    }
    .logo-letter:nth-child(6) {
      animation: bounce 2s ease-in-out infinite 0.5s;
    }
    @keyframes bounce {
      0%,
      100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-8px);
      }
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

  <!-- 装饰下划线 -->
  <path
    d="M 100 95 Q 200 105 300 95"
    fill="none"
    stroke="url(#logo-grad)"
    stroke-width="2"
    stroke-linecap="round"
  >
    <animate
      attributeName="d"
      values="M 100 95 Q 200 105 300 95; M 100 95 Q 200 85 300 95; M 100 95 Q 200 105 300 95"
      dur="3s"
      repeatCount="indefinite"
    />
  </path>
</svg>
```

## 4. 项目四：交互式地图

简化版中国地图节点示意。

```html
<svg viewBox="0 0 800 600" class="map" role="img" aria-labelledby="map-title">
  <title id="map-title">节点分布图</title>

  <defs>
    <radialGradient id="node-grad">
      <stop offset="0%" stop-color="#4f5bd5" />
      <stop offset="100%" stop-color="#3a47b8" />
    </radialGradient>
    <filter id="node-glow">
      <feGaussianBlur stdDeviation="4" result="b" />
      <feMerge>
        <feMergeNode in="b" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f0f0f0" stroke-width="1" />
    </pattern>
  </defs>

  <style>
    .node {
      cursor: pointer;
      transition: transform 0.2s;
      transform-origin: center;
      transform-box: fill-box;
    }
    .node:hover {
      transform: scale(1.3);
    }
    .label {
      font-family: sans-serif;
      font-size: 12px;
      fill: #333;
      pointer-events: none;
    }
    .connection {
      stroke: #4f5bd5;
      stroke-width: 1.5;
      opacity: 0.4;
    }
    .pulse-ring {
      fill: none;
      stroke: #4f5bd5;
      stroke-width: 2;
    }
  </style>

  <!-- 背景网格 -->
  <rect width="800" height="600" fill="url(#grid)" />

  <!-- 连接线 -->
  <g class="connections">
    <line class="connection" x1="200" y1="200" x2="400" y2="300" />
    <line class="connection" x1="400" y1="300" x2="600" y2="200" />
    <line class="connection" x1="400" y1="300" x2="500" y2="450" />
    <line class="connection" x1="200" y1="200" x2="300" y2="450" />
  </g>

  <!-- 节点 -->
  <g class="nodes">
    <g class="node-group" transform="translate(200, 200)">
      <circle class="pulse-ring" r="15">
        <animate attributeName="r" values="15;25;15" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0;1" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle class="node" r="8" fill="url(#node-grad)" filter="url(#node-glow)" />
      <text class="label" y="-15" text-anchor="middle">北京</text>
    </g>

    <g class="node-group" transform="translate(400, 300)">
      <circle class="pulse-ring" r="15">
        <animate
          attributeName="r"
          values="15;25;15"
          dur="2s"
          begin="0.5s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="1;0;1"
          dur="2s"
          begin="0.5s"
          repeatCount="indefinite"
        />
      </circle>
      <circle class="node" r="8" fill="url(#node-grad)" filter="url(#node-glow)" />
      <text class="label" y="-15" text-anchor="middle">武汉</text>
    </g>

    <g class="node-group" transform="translate(600, 200)">
      <circle class="pulse-ring" r="15">
        <animate attributeName="r" values="15;25;15" dur="2s" begin="1s" repeatCount="indefinite" />
        <animate
          attributeName="opacity"
          values="1;0;1"
          dur="2s"
          begin="1s"
          repeatCount="indefinite"
        />
      </circle>
      <circle class="node" r="8" fill="url(#node-grad)" filter="url(#node-glow)" />
      <text class="label" y="-15" text-anchor="middle">上海</text>
    </g>

    <g class="node-group" transform="translate(300, 450)">
      <circle class="pulse-ring" r="15">
        <animate
          attributeName="r"
          values="15;25;15"
          dur="2s"
          begin="1.5s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="1;0;1"
          dur="2s"
          begin="1.5s"
          repeatCount="indefinite"
        />
      </circle>
      <circle class="node" r="8" fill="url(#node-grad)" filter="url(#node-glow)" />
      <text class="label" y="-15" text-anchor="middle">成都</text>
    </g>

    <g class="node-group" transform="translate(500, 450)">
      <circle class="pulse-ring" r="15">
        <animate attributeName="r" values="15;25;15" dur="2s" begin="2s" repeatCount="indefinite" />
        <animate
          attributeName="opacity"
          values="1;0;1"
          dur="2s"
          begin="2s"
          repeatCount="indefinite"
        />
      </circle>
      <circle class="node" r="8" fill="url(#node-grad)" filter="url(#node-glow)" />
      <text class="label" y="-15" text-anchor="middle">广州</text>
    </g>
  </g>

  <script>
    document.querySelectorAll('.node').forEach((node) => {
      node.addEventListener('click', (e) => {
        const group = e.target.closest('.node-group');
        const label = group.querySelector('.label').textContent;
        alert(`选中：${label}`);
      });
    });
  </script>
</svg>
```

## 5. 项目五：加载动画集

常用加载动画合集。

```html
<svg viewBox="0 0 300 100" width="300" height="100">
  <style>
    .spinner-1 {
      animation: spin 1.5s linear infinite;
      transform-origin: center;
      transform-box: fill-box;
    }
    .spinner-2 circle:nth-child(1) {
      animation: fade 1.2s ease-in-out infinite;
    }
    .spinner-2 circle:nth-child(2) {
      animation: fade 1.2s ease-in-out infinite 0.2s;
    }
    .spinner-2 circle:nth-child(3) {
      animation: fade 1.2s ease-in-out infinite 0.4s;
    }
    .spinner-3 {
      animation: bounce 1s ease-in-out infinite;
      transform-origin: center;
      transform-box: fill-box;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    @keyframes fade {
      0%,
      100% {
        opacity: 0.3;
      }
      50% {
        opacity: 1;
      }
    }
    @keyframes bounce {
      0%,
      100% {
        transform: scaleY(1);
      }
      50% {
        transform: scaleY(0.5);
      }
    }
  </style>

  <!-- 旋转环 -->
  <g transform="translate(50, 50)">
    <g class="spinner-1">
      <circle
        r="20"
        fill="none"
        stroke="#4f5bd5"
        stroke-width="3"
        stroke-dasharray="30 95"
        stroke-linecap="round"
      />
    </g>
  </g>

  <!-- 三点跳动 -->
  <g class="spinner-2" transform="translate(150, 50)">
    <circle cx="-15" r="6" fill="#4f5bd5" />
    <circle cx="0" r="6" fill="#4f5bd5" />
    <circle cx="15" r="6" fill="#4f5bd5" />
  </g>

  <!-- 脉冲条 -->
  <g transform="translate(250, 50)">
    <rect x="-15" y="-20" width="6" height="40" rx="3" fill="#4f5bd5" class="spinner-3" />
    <rect
      x="-3"
      y="-20"
      width="6"
      height="40"
      rx="3"
      fill="#4f5bd5"
      class="spinner-3"
      style="animation-delay: 0.2s"
    />
    <rect
      x="9"
      y="-20"
      width="6"
      height="40"
      rx="3"
      fill="#4f5bd5"
      class="spinner-3"
      style="animation-delay: 0.4s"
    />
  </g>
</svg>
```

## 6. 项目六：折线图

```html
<svg viewBox="0 0 600 300" class="line-chart" role="img" aria-labelledby="line-title">
  <title id="line-title">月度趋势图</title>

  <defs>
    <linearGradient id="area-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#4f5bd5" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#4f5bd5" stop-opacity="0" />
    </linearGradient>
  </defs>

  <style>
    .grid-line {
      stroke: #f0f0f0;
    }
    .axis-line {
      stroke: #ccc;
    }
    .label {
      font-family: sans-serif;
      font-size: 11px;
      fill: #666;
    }
    .data-point {
      fill: #fff;
      stroke: #4f5bd5;
      stroke-width: 2;
      cursor: pointer;
      transition: r 0.2s;
    }
    .data-point:hover {
      r: 6;
    }
  </style>

  <!-- 网格 -->
  <g class="grid-line">
    <line x1="60" y1="50" x2="560" y2="50" />
    <line x1="60" y1="120" x2="560" y2="120" />
    <line x1="60" y1="190" x2="560" y2="190" />
  </g>

  <!-- 坐标轴 -->
  <line class="axis-line" x1="60" y1="260" x2="560" y2="260" />
  <line class="axis-line" x1="60" y1="20" x2="60" y2="260" />

  <!-- Y 轴标签 -->
  <g class="label" text-anchor="end">
    <text x="55" y="264">0</text>
    <text x="55" y="194">30</text>
    <text x="55" y="124">60</text>
    <text x="55" y="54">90</text>
  </g>

  <!-- 数据 -->
  <!-- 月份 -->
  <g class="label" text-anchor="middle">
    <text x="100" y="280">1月</text>
    <text x="180" y="280">2月</text>
    <text x="260" y="280">3月</text>
    <text x="340" y="280">4月</text>
    <text x="420" y="280">5月</text>
    <text x="500" y="280">6月</text>
  </g>

  <!-- 折线 -->
  <path
    d="M 100 200 L 180 160 L 260 180 L 340 100 L 420 80 L 500 60"
    fill="none"
    stroke="#4f5bd5"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-dasharray="800"
    stroke-dashoffset="800"
    id="line-path"
  >
    <animate attributeName="stroke-dashoffset" from="800" to="0" dur="2s" fill="freeze" />
  </path>

  <!-- 面积 -->
  <path
    d="M 100 200 L 180 160 L 260 180 L 340 100 L 420 80 L 500 60 L 500 260 L 100 260 Z"
    fill="url(#area-grad)"
    opacity="0"
  >
    <animate attributeName="opacity" from="0" to="1" dur="1s" begin="1.5s" fill="freeze" />
  </path>

  <!-- 数据点 -->
  <g id="data-points">
    <circle class="data-point" cx="100" cy="200" r="4" />
    <circle class="data-point" cx="180" cy="160" r="4" />
    <circle class="data-point" cx="260" cy="180" r="4" />
    <circle class="data-point" cx="340" cy="100" r="4" />
    <circle class="data-point" cx="420" cy="80" r="4" />
    <circle class="data-point" cx="500" cy="60" r="4" />
  </g>
</svg>

<script>
  const values = [25, 35, 30, 65, 75, 85];
  const points = document.querySelectorAll('.data-point');
  points.forEach((p, i) => {
    p.setAttribute('data-value', values[i] + '万');
    p.style.opacity = '0';
    p.style.transition = 'opacity 0.3s';
    setTimeout(
      () => {
        p.style.opacity = '1';
      },
      2000 + i * 100
    );
    p.addEventListener('click', () => {
      alert(`数值：${values[i]}万`);
    });
  });
</script>
```

## 7. 项目七：饼图

```html
<svg viewBox="0 0 400 400" width="400" height="400">
  <defs>
    <filter id="pie-shadow">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.15" />
    </filter>
  </defs>

  <style>
    .slice {
      cursor: pointer;
      transition: transform 0.2s;
      transform-origin: center;
      transform-box: fill-box;
    }
    .slice:hover {
      transform: scale(1.05);
    }
    .label {
      font-family: sans-serif;
      font-size: 14px;
      fill: #fff;
      font-weight: bold;
    }
  </style>

  <g id="pie" transform="translate(200, 200)" filter="url(#pie-shadow)">
    <!-- 由 JS 生成 -->
  </g>
</svg>

<script>
  const data = [
    { label: '产品 A', value: 35, color: '#4f5bd5' },
    { label: '产品 B', value: 25, color: '#00b894' },
    { label: '产品 C', value: 20, color: '#f9a825' },
    { label: '产品 D', value: 15, color: '#d63031' },
    { label: '其他', value: 5, color: '#8854d0' },
  ];

  const svgNS = 'http://www.w3.org/2000/svg';
  const pie = document.getElementById('pie');
  const radius = 120;
  const total = data.reduce((sum, d) => sum + d.value, 0);

  let cumAngle = -90; // 从 12 点钟方向开始

  data.forEach((d, i) => {
    const angle = (d.value / total) * 360;
    const startAngle = cumAngle;
    const endAngle = cumAngle + angle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = radius * Math.cos(startRad);
    const y1 = radius * Math.sin(startRad);
    const x2 = radius * Math.cos(endRad);
    const y2 = radius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('class', 'slice');
    path.setAttribute(
      'd',
      `M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
    );
    path.setAttribute('fill', d.color);
    path.setAttribute('data-label', d.label);
    path.setAttribute('data-value', d.value);

    path.addEventListener('click', () => {
      alert(`${d.label}: ${d.value}%`);
    });

    pie.appendChild(path);

    // 标签
    const midAngle = (startAngle + endAngle) / 2;
    const midRad = (midAngle * Math.PI) / 180;
    const labelX = radius * 0.6 * Math.cos(midRad);
    const labelY = radius * 0.6 * Math.sin(midRad);

    const label = document.createElementNS(svgNS, 'text');
    label.setAttribute('class', 'label');
    label.setAttribute('x', labelX);
    label.setAttribute('y', labelY);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('dominant-baseline', 'middle');
    label.textContent = d.value + '%';
    pie.appendChild(label);

    cumAngle = endAngle;
  });
</script>
```

## 8. 总结

| 知识点           | 应用项目                   |
| ---------------- | -------------------------- |
| 坐标系与 viewBox | 所有项目                   |
| path 与弧线      | 饼图、环形进度             |
| 渐变与图案       | Logo、图表装饰             |
| 变换             | 节点定位、悬停缩放         |
| 滤镜             | 阴影、发光                 |
| 动画             | 进度条、加载动画、路径绘制 |
| CSS 样式化       | 主题色、悬停状态           |
| JavaScript       | 数据驱动、交互响应         |
| 可访问性         | title/desc、aria-label     |
| 性能             | 节点复用、批量插入         |

## 9. 扩展资源

- **MDN SVG 教程**：https://developer.mozilla.org/zh-CN/docs/Web/SVG/Tutorial
- **SVG 规范**：https://www.w3.org/TR/SVG2/
- **SVGO 优化工具**：https://github.com/svg/svgo
- **D3.js**：https://d3js.org/ - 数据驱动文档，基于 SVG
- **Snap.svg**：http://snapsvg.io/ - 现代 SVG 操作库
- **Figma**：可视化设计工具，支持 SVG 导出

至此，SVG 模块从基础到实战的完整教程结束。建议按顺序学习，并在每个章节后动手实践示例代码。
