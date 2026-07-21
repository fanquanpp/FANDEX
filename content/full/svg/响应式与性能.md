---
order: 160
title: 'SVG 响应式与性能'
module: svg
category: 'SVG Performance'
difficulty: advanced
description: '响应式适配、性能瓶颈、优化策略、懒加载与压缩。'
author: fanquanpp
updated: '2026-07-18'
related:
  - svg/CSS样式化
  - svg/JavaScript交互
  - svg/滤镜详解
prerequisites:
  - svg/坐标系与viewBox
---

## 1. 响应式 SVG

### 1.1 仅声明 viewBox

让 SVG 自适应容器尺寸的标准做法：

```html
<svg viewBox="0 0 400 300" class="responsive">
  <!-- 内容 -->
</svg>
```

```css
.responsive {
  width: 100%;
  height: auto;
  display: block;
}
```

> 不指定 width/height，仅声明 viewBox，让外层 CSS 控制实际尺寸。SVG 会按宽高比自动缩放。

### 1.2 preserveAspectRatio 适配

```html
<!-- 完整显示，留白 -->
<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
  <!-- 4:3 内容在 16:9 容器中会上下留白 -->
</svg>

<!-- 填满容器，可能裁剪 -->
<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
  <!-- 4:3 内容在 16:9 容器中左右被裁 -->
</svg>
```

### 1.3 CSS aspect-ratio

```css
.chart {
  width: 100%;
  aspect-ratio: 4 / 3;
}
```

```html
<svg class="chart" viewBox="0 0 400 300">...</svg>
```

确保容器保持宽高比，避免 SVG 高度坍塌。

## 2. 流式 SVG

不同屏幕显示不同内容：

```html
<svg viewBox="0 0 400 200">
  <style>
    .mobile-only {
      display: none;
    }
    .desktop-only {
      display: block;
    }

    @media (max-width: 600px) {
      .mobile-only {
        display: block;
      }
      .desktop-only {
        display: none;
      }
    }
  </style>
  <g class="mobile-only">
    <!-- 移动端简化版 -->
    <text x="200" y="100" text-anchor="middle" font-size="20">简化视图</text>
  </g>
  <g class="desktop-only">
    <!-- 桌面端完整版 -->
    <text x="200" y="50" text-anchor="middle" font-size="32">完整视图</text>
    <text x="200" y="100" text-anchor="middle" font-size="16">更多细节</text>
  </g>
</svg>
```

## 3. CSS Container Queries

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

根据容器宽度（而非视口）响应式显示。

## 4. 性能瓶颈分析

### 4.1 SVG 渲染性能特征

| 因素         | 影响                                 |
| ------------ | ------------------------------------ |
| DOM 节点数量 | 节点多 → 重排重绘开销大              |
| 复杂路径     | 长路径 → 解析与渲染慢                |
| 滤镜         | feGaussianBlur 等 → CPU/GPU 开销大   |
| 蒙版与裁剪   | 软蒙版 → 像素级计算                  |
| 文本渲染     | 大量 `<text>` → 排版开销             |
| 透明度与混合 | opacity、mix-blend-mode → 合成层开销 |

### 4.2 节点数量阈值

| 节点数      | 性能                  |
| ----------- | --------------------- |
| < 100       | 流畅                  |
| 100 - 1000  | 静态可用，动画需优化  |
| 1000 - 5000 | 明显卡顿              |
| > 5000      | 考虑改用 Canvas/WebGL |

## 5. 优化策略

### 5.1 减少节点

```html
<!-- 冗余：多个单独的 line -->
<g stroke="#333">
  <line x1="10" y1="10" x2="100" y2="10" />
  <line x1="10" y1="20" x2="100" y2="20" />
  <line x1="10" y1="30" x2="100" y2="30" />
</g>

<!-- 优化：合并为一个 path -->
<path d="M 10 10 L 100 10 M 10 20 L 100 20 M 10 30 L 100 30" stroke="#333" />
```

### 5.2 复用 symbol

```html
<defs>
  <symbol id="dot" viewBox="0 0 10 10">
    <circle cx="5" cy="5" r="4" />
  </symbol>
</defs>
<use href="#dot" x="0" y="0" />
<use href="#dot" x="20" y="0" />
<!-- 1000 个 use 比直接画 1000 个 circle 内存占用小 -->
```

### 5.3 简化路径

```html
<!-- 原始路径 -->
<path d="M 10.123456 10.234567 L 50.345678 10.456789 ..." />

<!-- SVGO 优化后 -->
<path d="M10 10L50 10..." />
```

使用 SVGO 工具自动优化：

```bash
npm install -g svgo
svgo input.svg -o output.svg --precision=2
```

### 5.4 避免复杂滤镜

```html
<!-- 慢：模糊大区域 -->
<filter id="blur">
  <feGaussianBlur stdDeviation="10" />
</filter>
<rect width="1920" height="1080" filter="url(#blur)" />

<!-- 快：模糊小区域再缩放 -->
<filter id="blur-small" x="0" y="0" width="200" height="200">
  <feGaussianBlur stdDeviation="10" />
</filter>
```

### 5.5 transform 替代几何属性

```javascript
// 慢：修改 x 触发重排
rect.setAttribute('x', 100);

// 快：修改 transform 使用合成层
rect.style.transform = 'translateX(100px)';
```

### 5.6 will-change 提示

```css
.animated-element {
  will-change: transform, opacity;
}
```

让浏览器提前为元素创建独立图层。

## 6. 懒加载

### 6.1 IntersectionObserver

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      observer.unobserve(img);
    }
  });
});

document.querySelectorAll('img[data-src]').forEach((img) => {
  observer.observe(img);
});
```

```html
<img data-src="large-diagram.svg" alt="图表" width="800" height="600" />
```

### 6.2 内联关键 SVG

首屏关键 SVG 内联，避免额外请求：

```html
<!-- 内联首屏 Logo -->
<svg viewBox="0 0 100 40" class="logo">
  <path d="..." fill="currentColor" />
</svg>

<!-- 懒加载非关键 SVG -->
<img data-src="diagram.svg" alt="图表" loading="lazy" />
```

## 7. 压缩与优化

### 7.1 SVGO 优化

```bash
# 单文件
svgo input.svg -o output.svg

# 批量
svgo -f input-dir -o output-dir

# 配置文件 .svgo.config.js
module.exports = {
  plugins: [
    { name: 'preset-default' },
    { name: 'removeDimensions', active: true },  // 移除 width/height
    { name: 'sortAttrs', active: true }
  ]
};
```

### 7.2 常用优化项

| 优化             | 说明                   |
| ---------------- | ---------------------- |
| 移除注释         | 减小体积               |
| 移除编辑器元数据 | 如 Inkscape 命名空间   |
| 合并路径         | 多 path 合并为单 path  |
| 简化坐标         | 降低精度到 2 位小数    |
| 移除默认值       | 如 fill="black" 可省略 |
| 转换为相对路径   | 文件更小               |

### 7.3 Gzip / Brotli 压缩

服务器配置 SVG 压缩（文本格式压缩率高）：

```nginx
# nginx.conf
gzip on;
gzip_types image/svg+xml;
```

通常可压缩 70%-90%。

## 8. 缓存策略

### 8.1 外部 SVG 文件缓存

```nginx
location ~* \.svg$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}
```

### 8.2 文件名哈希

```html
<!-- 构建工具生成 -->
<img src="logo.a3b7c9.svg" alt="Logo" />
```

文件内容变化时哈希变化，浏览器自动重新下载。

## 9. 渲染优化

### 9.1 避免重排

```javascript
// 慢：逐个修改属性
elements.forEach((el) => {
  el.setAttribute('x', newX);
  el.setAttribute('y', newY);
});

// 快：批量修改
svg.style.display = 'none';
elements.forEach((el) => {
  el.setAttribute('x', newX);
  el.setAttribute('y', newY);
});
svg.style.display = 'block';
```

### 9.2 使用 DocumentFragment

```javascript
const fragment = document.createDocumentFragment();
for (let i = 0; i < 1000; i++) {
  const dot = createSVG('circle', { cx: i, cy: 50, r: 2 });
  fragment.appendChild(dot);
}
svg.appendChild(fragment); // 一次性插入
```

### 9.3 CSS containment

```css
.chart {
  contain: layout style paint;
}
```

隔离元素布局、样式、绘制，避免影响外部。

## 10. 实战：大数据点散点图

```html
<svg viewBox="0 0 800 400" class="scatter">
  <defs>
    <symbol id="point" viewBox="-1 -1 2 2">
      <circle r="1" fill="#4f5bd5" />
    </symbol>
  </defs>
</svg>

<script>
  const svg = document.querySelector('.scatter');
  const data = [];
  for (let i = 0; i < 2000; i++) {
    data.push({
      x: Math.random() * 800,
      y: Math.random() * 400,
    });
  }

  // 批量插入，减少 reflow
  const fragment = document.createDocumentFragment();
  data.forEach((d) => {
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#point');
    use.setAttribute('x', d.x - 1);
    use.setAttribute('y', d.y - 1);
    use.setAttribute('width', 6);
    use.setAttribute('height', 6);
    fragment.appendChild(use);
  });
  svg.appendChild(fragment);
</script>
```

**优化点**：

- symbol 复用避免重复定义 circle
- DocumentFragment 批量插入
- 限制节点数（> 5000 考虑 Canvas）

## 11. 监测与分析

### 11.1 Chrome DevTools

- **Performance** 面板：录制动画，分析帧率与瓶颈
- **Layers** 面板：查看合成层，确认 GPU 加速
- **Rendering** 面板：开启 Paint flashing 高亮重绘区域

### 11.2 关键指标

| 指标     | 目标    |
| -------- | ------- |
| FPS      | ≥ 55    |
| 首次渲染 | < 100ms |
| 单帧渲染 | < 16ms  |
| 内存占用 | < 50MB  |

## 12. 何时改用 Canvas

| 场景                     | 推荐          |
| ------------------------ | ------------- |
| 数据点 < 1000            | SVG           |
| 数据点 1000-5000，无动画 | SVG（优化后） |
| 数据点 > 5000            | Canvas        |
| 实时粒子系统             | Canvas/WebGL  |
| 复杂图像处理             | Canvas        |
| 需要交互与可访问性       | SVG           |

下一篇介绍 SVG 图标系统与可访问性。
