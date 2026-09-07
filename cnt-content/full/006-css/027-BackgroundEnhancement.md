---
order: 270
title: 背景增强
module: 'css'
category: 前端技术
difficulty: intermediate
description: 深入解析 CSS Backgrounds Module Level 3/4 多背景、background-size、background-clip、background-origin、background-attachment 的规范、绘制算法与工程实践
author: fanquanpp
updated: '2026-08-30'
related:
  - 'css/025-Gradient'
  - 'css/026-Shadow'
  - 'css/023-CSS3GridGridLayout'
  - 'css/029-CSSAnimationTransition'
  - 'css/017-StackingContext'
prerequisites:
  - 'css/002-CSS3OverviewBasicSyntax'
  - 'css/017-StackingContext'
---

> 0基础速通：读第 0 节直觉与第 1 节核心必读即可；第 6 章深入理解（选读），附录 D 属性速查随用随查。

# 背景增强（Backgrounds & Borders Enhancement）

> 本文以 W3C [CSS Backgrounds and Borders Module Level 3](https://www.w3.org/TR/css-backgrounds-3/) 与 [CSS Backgrounds Module Level 4](https://www.w3.org/TR/css-backgrounds-4/) 规范为基础，系统阐释 CSS 背景系统的层级模型（Layer Model）、`background-image` 多层叠加、`background-size` 缩放算法、`background-clip` 绘制区域、`background-origin` 定位上下文、`background-attachment` 滚动行为的几何与渲染机制，并对接 Bootstrap、Tailwind CSS、Material Design 等主流框架的实践范式。内容涵盖从 CSS 1（1996）到 CSS Backgrounds Level 4（2024）的演进，提供生产级代码示例与工程化解决方案。

---

## 0. 直觉：背景是元素的“画布”

背景就是元素背后的画布，可以填充颜色（`background-color`）、贴图片（`background-image`）、控制平铺与位置（`repeat`/`position`）、叠加多层背景，还能用渐变、混合模式与滤镜做视觉增强。

先记一个最小模型：`background: color image position / size repeat` 的简写顺序。单独用 `background-color` 是最基础也最常用的写法。

## 1. 核心必读：代码示例
### 1.1 基础示例：多背景叠加

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>多背景叠加示例</title>
<style>
  /* 多背景叠加：渐变 + 图像 + 噪声纹理 */
  .hero {
    width: 100%;
    height: 400px;
    background:
      /* 第一层：噪声纹理（最上层） */
      url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><filter id="n"><feTurbulence baseFrequency="0.9"/></filter><rect width="100%" height="100%" filter="url(%23n)" opacity="0.3"/></svg>'),
      /* 第二层：渐变蒙版 */
      linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 100%),
      /* 第三层：背景图像（最底层） */
      url('https://example.com/hero.jpg');
    background-size: auto, cover, cover;
    background-repeat: repeat, no-repeat, no-repeat;
    background-position: center, center, center;
    background-attachment: scroll, scroll, scroll;
    color: white;
    display: flex;
    align-items: flex-end;
    padding: 40px;
    box-sizing: border-box;
  }
</style>
</head>
<body>
  <section class="hero">
    <h1>多背景叠加：噪声 + 蒙版 + 图像</h1>
  </section>
</body>
</html>
```

### 1.2 `background-size: cover` 与 `contain` 对比

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>background-size 对比</title>
<style>
  .container {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    padding: 20px;
    max-width: 800px;
    margin: 0 auto;
  }

  .box {
    width: 100%;
    height: 200px;
    border: 2px solid #333;
    background-image: url('https://example.com/landscape.jpg');
    background-repeat: no-repeat;
    background-position: center;
  }

  .cover {
    background-size: cover;  /* 等比缩放覆盖容器 */
  }

  .contain {
    background-size: contain;  /* 等比缩放完整显示 */
  }

  .length {
    background-size: 300px 150px;  /* 指定尺寸 */
  }

  .percent {
    background-size: 100% 100%;  /* 拉伸填满 */
  }

  .label {
    text-align: center;
    font-family: monospace;
    margin-top: 8px;
    color: #555;
  }
</style>
</head>
<body>
  <div class="container">
    <div>
      <div class="box cover"></div>
      <div class="label">cover</div>
    </div>
    <div>
      <div class="box contain"></div>
      <div class="label">contain</div>
    </div>
    <div>
      <div class="box length"></div>
      <div class="label">300px 150px</div>
    </div>
    <div>
      <div class="box percent"></div>
      <div class="label">100% 100%</div>
    </div>
  </div>
</body>
</html>
```

### 1.3 `background-clip` 区域对比

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>background-clip 区域对比</title>
<style>
  .clip-demo {
    width: 200px;
    height: 100px;
    padding: 20px;
    border: 10px dashed rgba(102, 126, 234, 0.5);
    margin: 20px;
    background-image: linear-gradient(45deg, #667eea, #764ba2);
    background-repeat: no-repeat;
    display: inline-block;
    box-sizing: border-box;
    color: white;
    font-family: monospace;
  }

  .clip-border {
    background-clip: border-box;  /* 默认：包含 border */
  }

  .clip-padding {
    background-clip: padding-box;  /* 不含 border */
  }

  .clip-content {
    background-clip: content-box;  /* 仅 content 区域 */
  }
</style>
</head>
<body>
  <div class="clip-demo clip-border">border-box</div>
  <div class="clip-demo clip-padding">padding-box</div>
  <div class="clip-demo clip-content">content-box</div>
</body>
</html>
```

### 1.4 `background-origin` 区域对比

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>background-origin 区域对比</title>
<style>
  .origin-demo {
    width: 200px;
    height: 100px;
    padding: 20px;
    border: 10px solid rgba(0,0,0,0.1);
    margin: 20px;
    background-image: url('https://example.com/icon.png');
    background-repeat: no-repeat;
    background-position: 0% 0%;
    background-size: 50px 50px;
    display: inline-block;
    box-sizing: border-box;
    font-family: monospace;
  }

  .origin-border {
    background-origin: border-box;  /* 从 border 起点定位 */
  }

  .origin-padding {
    background-origin: padding-box;  /* 从 padding 起点定位 */
  }

  .origin-content {
    background-origin: content-box;  /* 从 content 起点定位 */
  }
</style>
</head>
<body>
  <div class="origin-demo origin-border">border-box</div>
  <div class="origin-demo origin-padding">padding-box</div>
  <div class="origin-demo origin-content">content-box</div>
</body>
</html>
```

### 1.5 渐变文字效果

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>渐变文字效果</title>
<style>
  .gradient-text {
    font-size: 64px;
    font-weight: 900;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;  /* 回退方案 */
    text-align: center;
    padding: 40px;
  }

  /* 多色渐变文字 */
  .rainbow-text {
    font-size: 48px;
    font-weight: 700;
    background: linear-gradient(
      to right,
      #ff0000, #ff7f00, #ffff00,
      #00ff00, #0000ff, #4b0082, #9400d3
    );
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
    text-align: center;
  }

  /* 带动画的渐变文字 */
  .animated-gradient-text {
    font-size: 56px;
    font-weight: 800;
    background: linear-gradient(
      90deg,
      #667eea, #764ba2, #f093fb, #667eea
    );
    background-size: 300% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
    animation: gradient-shift 3s linear infinite;
  }

  @keyframes gradient-shift {
    0% { background-position: 0% 50%; }
    100% { background-position: 300% 50%; }
  }
</style>
</head>
<body>
  <h1 class="gradient-text">渐变文字效果</h1>
  <h2 class="rainbow-text">彩虹文字</h2>
  <h2 class="animated-gradient-text">动态渐变</h2>
</body>
</html>
```

### 1.6 `background-attachment` 滚动行为

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>background-attachment 滚动行为</title>
<style>
  body {
    margin: 0;
    font-family: system-ui, sans-serif;
  }

  /* fixed：背景固定，产生视差效果 */
  .parallax {
    height: 100vh;
    background-image: url('https://example.com/mountain.jpg');
    background-size: cover;
    background-position: center;
    background-attachment: fixed;  /* 视差效果 */
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 48px;
  }

  .content {
    height: 100vh;
    padding: 40px;
    background: white;
  }

  /* local：背景随内容滚动 */
  .scrollable-box {
    width: 300px;
    height: 200px;
    overflow-y: auto;
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><text x="10" y="30" font-size="14">WATERMARK</text></svg>');
    background-attachment: local;  /* 随内容滚动 */
    padding: 20px;
    border: 2px solid #667eea;
  }
</style>
</head>
<body>
  <section class="parallax">
    <h1>视差滚动</h1>
  </section>

  <section class="content">
    <h2>背景固定效果</h2>
    <p>滚动页面观察上方视差效果。</p>

    <h3>local 滚动行为：</h3>
    <div class="scrollable-box">
      <p>滚动此容器，水印跟随滚动。</p>
      <p>内容行 1</p>
      <p>内容行 2</p>
      <p>内容行 3</p>
      <p>内容行 4</p>
      <p>内容行 5</p>
      <p>内容行 6</p>
      <p>内容行 7</p>
      <p>内容行 8</p>
      <p>内容行 9</p>
      <p>内容行 10</p>
    </div>
  </section>

  <section class="parallax">
    <h1>第二屏视差</h1>
  </section>
</body>
</html>
```

### 1.7 多背景复合效果（卡片设计）

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>多背景复合卡片</title>
<style>
  .premium-card {
    width: 320px;
    height: 200px;
    border-radius: 12px;
    padding: 24px;
    box-sizing: border-box;
    color: white;
    font-family: system-ui, sans-serif;
    position: relative;
    overflow: hidden;
    /* 多背景复合：光晕 + 渐变 + 纹理 */
    background:
      /* 顶层：光晕效果 */
      radial-gradient(circle at 80% 20%, rgba(255,255,255,0.3), transparent 40%),
      /* 中层：主渐变 */
      linear-gradient(135deg, #667eea 0%, #764ba2 100%),
      /* 底层：噪声纹理 */
      url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><filter id="n"><feTurbulence baseFrequency="0.7" numOctaves="2"/></filter><rect width="100%" height="100%" filter="url(%23n)" opacity="0.1"/></svg>');
    background-size: cover, cover, 200px 200px;
    background-position: center, center, center;
    background-repeat: no-repeat, no-repeat, repeat;
    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
  }

  .premium-card h3 {
    margin: 0 0 8px;
    font-size: 20px;
    font-weight: 700;
  }

  .premium-card p {
    margin: 0;
    font-size: 14px;
    opacity: 0.9;
  }
</style>
</head>
<body>
  <div class="premium-card">
    <h3>Premium 会员卡</h3>
    <p>多背景叠加实现高级感</p>
  </div>
</body>
</html>
```

### 1.8 `background-position` 四值语法

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>background-position 四值语法</title>
<style>
  .pos-demo {
    width: 300px;
    height: 200px;
    border: 2px solid #667eea;
    background-image: url('https://example.com/icon.png');
    background-repeat: no-repeat;
    background-size: 50px 50px;
    margin: 10px 0;
  }

  /* 关键字定位 */
  .pos-tl { background-position: top left; }
  .pos-tr { background-position: top right; }
  .pos-center { background-position: center center; }

  /* 百分比定位 */
  .pos-25-75 { background-position: 25% 75%; }

  /* 长度定位 */
  .pos-10px-20px { background-position: 10px 20px; }

  /* 四值语法：从右 10px，从下 20px */
  .pos-four-value { background-position: right 10px bottom 20px; }

  .label {
    font-family: monospace;
    color: #555;
    margin-bottom: 4px;
  }
</style>
</head>
<body>
  <div class="label">top left</div>
  <div class="pos-demo pos-tl"></div>

  <div class="label">right 10px bottom 20px</div>
  <div class="pos-demo pos-four-value"></div>

  <div class="label">25% 75%</div>
  <div class="pos-demo pos-25-75"></div>
</body>
</html>
```

### 1.9 `background-repeat` 模式对比

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>background-repeat 模式对比</title>
<style>
  .repeat-demo {
    width: 300px;
    height: 100px;
    border: 2px solid #333;
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="15" fill="#667eea"/></svg>');
    margin: 10px 0;
  }

  .repeat { background-repeat: repeat; }      /* 默认平铺 */
  .repeat-x { background-repeat: repeat-x; }  /* 水平平铺 */
  .repeat-y { background-repeat: repeat-y; }  /* 垂直平铺 */
  .no-repeat { background-repeat: no-repeat; }
  .space { background-repeat: space; }        /* 均匀分布留白 */
  .round { background-repeat: round; }        /* 缩放填满 */

  .label {
    font-family: monospace;
    margin-bottom: 4px;
  }
</style>
</head>
<body>
  <div class="label">repeat</div>
  <div class="repeat-demo repeat"></div>

  <div class="label">repeat-x</div>
  <div class="repeat-demo repeat-x"></div>

  <div class="label">space</div>
  <div class="repeat-demo space"></div>

  <div class="label">round</div>
  <div class="repeat-demo round"></div>
</body>
</html>
```

### 1.10 企业级：响应式 Hero 区背景系统

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>企业级响应式 Hero 背景系统</title>
<style>
  :root {
    --hero-bg-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --hero-bg-overlay: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.7) 100%);
    --hero-text-color: white;
    --hero-overlay-opacity: 0.8;
  }

  [data-theme="dark"] {
    --hero-bg-primary: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    --hero-bg-overlay: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.9) 100%);
    --hero-text-color: #f0f0f0;
  }

  .hero {
    width: 100%;
    min-height: 500px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--hero-text-color);
    text-align: center;
    padding: 60px 20px;
    box-sizing: border-box;
    position: relative;
    overflow: hidden;
    /* 多背景：渐变蒙版 + 主渐变 + 噪声 */
    background:
      var(--hero-bg-overlay),
      var(--hero-bg-primary),
      url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><filter id="n"><feTurbulence baseFrequency="0.9"/></filter><rect width="100%" height="100%" filter="url(%23n)" opacity="0.05"/></svg>');
    background-size: cover, cover, 200px 200px;
    background-position: center;
    background-repeat: no-repeat, no-repeat, repeat;
  }

  /* 响应式背景图 */
  @media (min-width: 768px) {
    .hero {
      background-image:
        var(--hero-bg-overlay),
        url('https://example.com/hero-desktop.jpg'),
        var(--hero-bg-primary);
      background-size: cover, cover, cover;
    }
  }

  @media (max-width: 767px) {
    .hero {
      background-image:
        var(--hero-bg-overlay),
        url('https://example.com/hero-mobile.jpg'),
        var(--hero-bg-primary);
      background-size: cover, cover, cover;
      min-height: 300px;
    }
  }

  /* 高 DPI 屏幕 */
  @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    .hero {
      background-image:
        var(--hero-bg-overlay),
        url('https://example.com/hero@2x.jpg'),
        var(--hero-bg-primary);
    }
  }

  .hero-content {
    position: relative;
    z-index: 1;
    max-width: 800px;
  }

  .hero h1 {
    font-size: clamp(32px, 5vw, 56px);
    margin: 0 0 20px;
    font-weight: 800;
  }

  .hero p {
    font-size: clamp(16px, 2vw, 20px);
    margin: 0 0 30px;
    opacity: 0.95;
  }

  .hero .cta {
    display: inline-block;
    padding: 14px 32px;
    background: white;
    color: #667eea;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    transition: transform 0.2s;
  }

  .hero .cta:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.2);
  }
</style>
</head>
<body>
  <section class="hero">
    <div class="hero-content">
      <h1>构建下一代 Web 体验</h1>
      <p>多背景叠加、响应式适配、高 DPI 优化，一站式解决方案</p>
      <a href="#" class="cta">立即开始</a>
    </div>
  </section>
</body>
</html>
```

### 1.11 企业级：设计令牌驱动的背景系统

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>设计令牌驱动的背景系统</title>
<style>
  :root {
    /* 背景设计令牌 */
    --bg-image-overlay: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
    --bg-image-card: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
    --bg-size-pattern: 20px 20px;
    --bg-position-default: center;
    --bg-clip-default: border-box;
    --bg-origin-default: padding-box;

    /* 语义化令牌 */
    --bg-surface: var(--bg-image-card);
    --bg-surface-elevated: linear-gradient(135deg, #ffffff 0%, #f0f4ff 100%);
    --bg-surface-subtle: var(--bg-image-overlay);
  }

  [data-theme="dark"] {
    --bg-image-card: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    --bg-image-overlay: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
    --bg-surface-elevated: linear-gradient(135deg, #1e2a4a 0%, #16213e 100%);
  }

  .card {
    background: var(--bg-surface);
    background-clip: var(--bg-clip-default);
    background-origin: var(--bg-origin-default);
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    margin: 16px;
    max-width: 400px;
  }

  .card-elevated {
    background: var(--bg-surface-elevated);
  }

  .card-subtle {
    background: var(--bg-surface-subtle);
  }

  /* 工具类 */
  .bg-cover {
    background-size: cover !important;
  }

  .bg-contain {
    background-size: contain !important;
  }

  .bg-fixed {
    background-attachment: fixed !important;
  }

  .bg-clip-text {
    -webkit-background-clip: text !important;
    background-clip: text !important;
    -webkit-text-fill-color: transparent;
    color: transparent;
  }
</style>
</head>
<body>
  <div class="card">
    <h3>默认卡片</h3>
    <p>使用 --bg-surface 令牌</p>
  </div>

  <div class="card card-elevated">
    <h3>悬浮卡片</h3>
    <p>使用 --bg-surface-elevated 令牌</p>
  </div>

  <div class="card card-subtle">
    <h3>微妙卡片</h3>
    <p>使用 --bg-surface-subtle 令牌</p>
  </div>
</body>
</html>
```

### 1.12 调试工具：背景可视化检查器

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>背景可视化检查器</title>
<style>
  .inspector {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 20px;
    padding: 20px;
    font-family: system-ui, sans-serif;
  }

  .preview {
    width: 100%;
    height: 400px;
    border: 2px dashed #ccc;
    background-image: url('https://example.com/sample.jpg');
    background-repeat: no-repeat;
    background-position: center;
    background-size: cover;
    background-clip: border-box;
    background-origin: padding-box;
    background-attachment: scroll;
  }

  .controls {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .control-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .control-group label {
    font-size: 12px;
    color: #555;
    font-family: monospace;
  }

  .control-group select,
  .control-group input {
    padding: 6px;
    font-size: 13px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  .output {
    background: #f5f5f5;
    padding: 12px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 12px;
    white-space: pre-wrap;
    color: #333;
  }
</style>
</head>
<body>
  <div class="inspector">
    <div class="preview" id="preview"></div>
    <div class="controls">
      <div class="control-group">
        <label>background-size</label>
        <select id="size">
          <option value="cover">cover</option>
          <option value="contain">contain</option>
          <option value="auto">auto</option>
          <option value="100% 100%">100% 100%</option>
          <option value="200px 200px">200px 200px</option>
        </select>
      </div>
      <div class="control-group">
        <label>background-clip</label>
        <select id="clip">
          <option value="border-box">border-box</option>
          <option value="padding-box">padding-box</option>
          <option value="content-box">content-box</option>
        </select>
      </div>
      <div class="control-group">
        <label>background-origin</label>
        <select id="origin">
          <option value="padding-box">padding-box</option>
          <option value="border-box">border-box</option>
          <option value="content-box">content-box</option>
        </select>
      </div>
      <div class="control-group">
        <label>background-repeat</label>
        <select id="repeat">
          <option value="no-repeat">no-repeat</option>
          <option value="repeat">repeat</option>
          <option value="space">space</option>
          <option value="round">round</option>
        </select>
      </div>
      <div class="output" id="output"></div>
    </div>
  </div>

  <script>
    const preview = document.getElementById('preview');
    const output = document.getElementById('output');

    function updatePreview() {
      const size = document.getElementById('size').value;
      const clip = document.getElementById('clip').value;
      const origin = document.getElementById('origin').value;
      const repeat = document.getElementById('repeat').value;

      preview.style.backgroundSize = size;
      preview.style.backgroundClip = clip;
      preview.style.backgroundOrigin = origin;
      preview.style.backgroundRepeat = repeat;

      output.textContent = `background:
  url('sample.jpg')
  ${repeat}
  center / ${size}
  ${origin}
  ${clip};`;
    }

    document.querySelectorAll('select').forEach(sel => {
      sel.addEventListener('change', updatePreview);
    });

    updatePreview();
  </script>
</body>
</html>
```

---

## 2. 对比分析
### 2.1 `background-image` 与 `<img>` 标签对比

| 维度 | `background-image` | `<img>` 标签 |
| --- | --- | --- |
| 语义 | 装饰性图像 | 内容性图像 |
| 可访问性 | 屏幕阅读器忽略 | 有 `alt` 文本 |
| SEO | 不被搜索引擎索引 | 被索引 |
| 缩放控制 | `background-size` | `object-fit` |
| 多层叠加 | 支持多背景 | 不支持 |
| 动画 | `background-position` 动画 | `transform` 动画 |
| 性能 | 延迟加载（取决于浏览器） | 可懒加载 |
| 响应式 | `image-set()`、媒体查询 | `srcset`、`<picture>` |
| 适用场景 | 装饰、纹理、渐变 | 内容图像、产品图 |

### 2.2 `background-clip` 与 `background-origin` 对比

| 属性 | 控制内容 | 默认值 | 取值范围 | 典型用途 |
| --- | --- | --- | --- | --- |
| `background-clip` | 绘制区域 | `border-box` | `border-box` \| `padding-box` \| `content-box` \| `text` | 控制背景绘制到哪个边界 |
| `background-origin` | 定位起点 | `padding-box` | `border-box` \| `padding-box` \| `content-box` | 控制百分比/位置计算的起点 |

关键差异：`background-clip` 决定「画到哪里」，`background-origin` 决定「从哪里开始算」。

### 2.3 `background-size` 与 `object-fit` 对比

| 维度 | `background-size` | `object-fit` |
| --- | --- | --- |
| 适用元素 | 任意元素 | `<img>`、`<video>` 等替换元素 |
| `cover` | 覆盖容器，可能裁剪 | 同 |
| `contain` | 完整显示，可能留白 | 同 |
| 长度/百分比 | 支持 | 不支持（用 `object-position`） |
| 多层 | 支持 | 不支持 |
| 配合属性 | `background-position` | `object-position` |

### 2.4 多背景与伪元素叠加对比

| 维度 | 多背景 | 伪元素 `::before`/`::after` |
| --- | --- | --- |
| 语法 | 单条 `background` 声明 | 需要额外 CSS 规则 |
| 层数限制 | 无硬性限制（性能限制） | 每元素 2 个伪元素 |
| 独立控制 | 每层独立 `background-*` | 每个伪元素独立 |
| 动画 | `background-position` 动画 | `transform`、`opacity` 动画 |
| 性能 | 合成层共享 | 独立合成层 |
| 语义 | 装饰性 | 可承载语义 |
| 适用场景 | 多层渐变、纹理 | 复杂叠加、需要独立动画 |

### 2.5 主流框架背景实践对比

| 框架 | 多背景策略 | `background-size` | `background-clip` | 工具类 |
| --- | --- | --- | --- | --- |
| Bootstrap 5 | 渐变工具类 `.bg-gradient` | 不直接提供 | 不直接提供 | `.bg-primary`、`.bg-gradient` |
| Tailwind CSS v3.4 | `bg-[url(...)]`、`bg-gradient-to-*` | `bg-cover`、`bg-contain` | `bg-clip-text`、`bg-clip-border` | `bg-cover`、`bg-contain`、`bg-clip-text` |
| Material Design 3 | 主题色 + 渐变 | 不直接提供 | 不直接提供 | 主题变量 |
| GitHub Primer | `.color-bg-*`、渐变工具 | 不直接提供 | 不直接提供 | `.bg-gradient-*` |
| Ant Design 5 | 主题色 | 不直接提供 | 不直接提供 | 主题变量 |

### 2.6 Tailwind 与 Bootstrap 背景哲学对比

**Tailwind CSS v3.4**：原子化工具类，灵活组合。

```html
<div class="bg-gradient-to-r from-purple-500 to-pink-500 bg-cover bg-center bg-clip-text text-transparent">
  渐变文字
</div>
```

**Bootstrap 5**：预设组件样式，开箱即用。

```html
<div class="bg-primary bg-gradient p-4">
  Bootstrap 渐变背景
</div>
```

Tailwind 的优势在于灵活组合，Bootstrap 的优势在于快速原型。现代项目多倾向 Tailwind。

### 2.7 预处理器对比

| 预处理器 | 多背景 Mixin | `background-size` 支持 | `background-clip: text` 支持 |
| --- | --- | --- | --- |
| SCSS | `@mixin multi-bg($layers...)` | 内置函数 | 需手动前缀 |
| Less | `.multi-bg(@layers...)` | 内置函数 | 需手动前缀 |
| Stylus | `multi-bg($layers...)` | 内置函数 | 需手动前缀 |

```scss
// SCSS Mixin 示例
@mixin gradient-text($gradient) {
  background: $gradient;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

.title {
  @include gradient-text(linear-gradient(to right, #667eea, #764ba2));
}
```

---

## 3. 常见陷阱与最佳实践
### 3.1 陷阱 1：`background-clip: text` 忘记回退

**错误代码**：

```css
.gradient-text {
  background: linear-gradient(to right, red, blue);
  background-clip: text;
  color: transparent;  /* 若浏览器不支持，文字完全不可见 */
}
```

**问题**：旧浏览器不支持 `background-clip: text`，但 `color: transparent` 生效，导致文字消失。

**正确做法**：

```css
.gradient-text {
  background: linear-gradient(to right, red, blue);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: #667eea;  /* 回退颜色：不支持时显示此色 */
}

@supports (background-clip: text) or (-webkit-background-clip: text) {
  .gradient-text {
    color: transparent;  /* 仅在支持时设为透明 */
  }
}
```

### 3.2 陷阱 2：多背景层数过多导致性能问题

**错误代码**：

```css
.complex-bg {
  background:
    url('layer1.png'),
    url('layer2.png'),
    url('layer3.png'),
    url('layer4.png'),
    url('layer5.png'),
    url('layer6.png'),
    url('layer7.png'),
    url('layer8.png');
  /* 8 层背景，移动端可能掉帧 */
}
```

**最佳实践**：层数控制在 4 层以内，超出部分用伪元素或 SVG 合并：

```css
.complex-bg {
  position: relative;
  background:
    url('layer1.png'),
    url('layer2.png');
}

.complex-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    url('layer3.png'),
    url('layer4.png');
}
```

### 3.3 陷阱 3：`background-attachment: fixed` 在移动端失效

**问题**：iOS Safari 出于性能考虑，禁用 `fixed` 的视口绑定，将其降级为 `scroll`。

**解决方案**：使用 JavaScript 实现视差，或使用 `position: sticky` 替代：

```css
/* 方案 1：使用 sticky 模拟视差 */
.parallax-container {
  height: 100vh;
  overflow-x: hidden;
  overflow-y: auto;
  perspective: 1px;
}

.parallax-bg {
  position: sticky;
  top: 0;
  height: 100vh;
  background-image: url('background.jpg');
  background-size: cover;
  transform: translateZ(-1px) scale(2);
  z-index: -1;
}
```

### 3.4 陷阱 4：`background-size: 100% 100%` 拉伸变形

**错误代码**：

```css
.hero {
  background-image: url('photo.jpg');
  background-size: 100% 100%;  /* 拉伸，破坏宽高比 */
}
```

**问题**：强制拉伸图像以填满容器，导致变形。

**正确做法**：

```css
.hero {
  background-image: url('photo.jpg');
  background-size: cover;  /* 保持宽高比，可能裁剪 */
  /* 或 */
  background-size: contain;  /* 保持宽高比，可能留白 */
}
```

### 3.5 陷阱 5：`background-origin` 与 `background-clip` 混淆

**误区**：误认为两者作用相同。

**澄清**：

- `background-origin: content-box`：背景的 `0% 0%` 定位点在 content-box 左上角。
- `background-clip: content-box`：背景绘制范围限制在 content-box 内。

两者独立设置，可组合出不同效果：

```css
/* 图像从 border 开始定位，但只绘制到 padding */
.box {
  background-origin: border-box;
  background-clip: padding-box;
  border: 10px solid transparent;
}
```

### 3.6 陷阱 6：`background` 简写覆盖独立属性

**错误代码**：

```css
.card {
  background-size: cover;  /* 先设置 */
  background: url('image.jpg') no-repeat center;  /* 简写覆盖，background-size 重置为 auto */
}
```

**问题**：`background` 简写会重置所有未指定的子属性为默认值。

**正确做法**：

```css
.card {
  background: url('image.jpg') no-repeat center / cover;  /* 在简写中指定 */
}
/* 或 */
.card {
  background-image: url('image.jpg');
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;  /* 独立设置，不使用简写 */
}
```

### 3.7 陷阱 7：高 DPI 背景图加载性能

**问题**：为 Retina 屏幕加载 2x、3x 图像，移动端流量消耗大。

**解决方案**：使用 `image-set()` 或 `<picture>` 元素：

```css
.hero {
  background-image: image-set(
    url('hero@1x.jpg') 1x,
    url('hero@2x.jpg') 2x,
    url('hero@3x.jpg') 3x
  );
}
```

### 3.8 陷阱 8：背景与可访问性

**问题**：背景图上的文字对比度不足，影响阅读。

**解决方案**：使用 WCAG 对比度检查器，确保对比度 ≥ 4.5:1（AA 标准）：

```css
.hero {
  background-image: url('background.jpg');
  /* 添加渐变蒙版增强对比度 */
  background-image:
    linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7)),
    url('background.jpg');
  color: white;  /* 配合深色蒙版，对比度达标 */
}
```

### 3.9 最佳实践清单

1. **优先使用渐变而非图像**：渐变无需 HTTP 请求，性能更优。
2. **使用 `background-size: cover` 适配响应式**：避免固定尺寸。
3. **多背景层数控制在 4 层以内**：性能考虑。
4. **`background-clip: text` 必须有回退**：使用 `@supports` 检测。
5. **移动端避免 `background-attachment: fixed`**：使用替代方案。
6. **高 DPI 使用 `image-set()`**：按需加载。
7. **检查对比度**：WCAG AA 标准 4.5:1。
8. **设计令牌化**：将背景属性抽象为 CSS Variables。
9. **Stylelint 校验**：禁止 `background-size: 100% 100%` 等反模式。
10. **性能预算**：背景图总大小控制在 200KB 以内。

---

## 4. 工程实践
### 4.1 背景设计令牌系统

```css
:root {
  /* 背景图像令牌 */
  --bg-image-hero: url('/images/hero.jpg');
  --bg-image-pattern: url('/images/pattern.svg');

  /* 渐变令牌 */
  --bg-gradient-primary: linear-gradient(135deg, #667eea, #764ba2);
  --bg-gradient-secondary: linear-gradient(135deg, #f093fb, #f5576c);
  --bg-gradient-accent: linear-gradient(135deg, #4facfe, #00f2fe);

  /* 背景尺寸令牌 */
  --bg-size-cover: cover;
  --bg-size-contain: contain;
  --bg-size-pattern: 20px 20px;

  /* 背景位置令牌 */
  --bg-position-center: center;
  --bg-position-top: top;
  --bg-position-bottom: bottom;

  /* 背景重复令牌 */
  --bg-repeat-none: no-repeat;
  --bg-repeat-pattern: repeat;

  /* 背景裁剪令牌 */
  --bg-clip-default: border-box;
  --bg-clip-text: text;

  /* 语义化背景 */
  --bg-surface-base: var(--bg-gradient-primary);
  --bg-surface-elevated: var(--bg-gradient-secondary);
  --bg-surface-overlay: var(--bg-gradient-accent);
}
```

### 4.2 PostCSS 自动前缀与优化

```javascript
// postcss.config.js
module.exports = {
  plugins: [
    require('autoprefixer')({
      overrideBrowserslist: ['> 1%', 'last 2 versions', 'not dead'],
      grid: true,
    }),
    require('postcss-bg-image')({
      // 自动为 background-image 添加 image-set() 支持
      retina: true,
    }),
    require('cssnano')({
      preset: 'advanced',
    }),
  ],
};
```

### 4.3 SCSS Mixin 库

```scss
// _backgrounds.scss

/// 渐变文字 Mixin
/// @param {String} $gradient - 渐变值
@mixin gradient-text($gradient) {
  background: $gradient;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;

  // 回退
  @supports not ((background-clip: text) or (-webkit-background-clip: text)) {
    background: none;
    color: #667eea;
  }
}

/// 多背景叠加 Mixin
/// @param {List} $layers - 背景层列表
@mixin multi-background($layers) {
  background: $layers;

  // 自动设置 background-size
  $sizes: ();
  @each $layer in $layers {
    $sizes: append($sizes, cover);
  }
  background-size: $sizes;
  background-repeat: no-repeat;
  background-position: center;
}

/// 响应式背景图 Mixin
/// @param {String} $base-path - 图像基础路径
/// @param {String} $extension - 图像扩展名
@mixin responsive-bg($base-path, $extension: 'jpg') {
  background-image: url('#{$base-path}.#{$extension}');

  @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    background-image: url('#{$base-path}@2x.#{$extension}');
  }

  @media (-webkit-min-device-pixel-ratio: 3), (min-resolution: 288dpi) {
    background-image: url('#{$base-path}@3x.#{$extension}');
  }
}

/// 视差背景 Mixin（移动端兼容）
@mixin parallax-bg($image) {
  background-image: url($image);
  background-size: cover;
  background-position: center;

  // 桌面端使用 fixed
  @media (min-width: 768px) {
    background-attachment: fixed;
  }

  // 移动端使用 sticky 替代
  @media (max-width: 767px) {
    background-attachment: scroll;
  }
}
```

### 4.4 Tailwind CSS 自定义配置

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      backgroundImage: {
        'hero-pattern': "url('/images/hero-pattern.svg')",
        'gradient-primary': 'linear-gradient(135deg, #667eea, #764ba2)',
        'gradient-secondary': 'linear-gradient(135deg, #f093fb, #f5576c)',
      },
      backgroundSize: {
        'auto': 'auto',
        'cover': 'cover',
        'contain': 'contain',
        '50%': '50%',
        '100': '100px',
      },
      backgroundPosition: {
        'center': 'center',
        'top': 'top',
        'bottom': 'bottom',
        'right-10': 'right 10px',
      },
      backgroundClip: {
        'text': 'text',
      },
    },
  },
  plugins: [
    // 自定义插件：背景工具类
    function({ addUtilities, theme }) {
      addUtilities({
        '.bg-parallax': {
          backgroundImage: 'var(--bg-parallax)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          '@screen md': {
            backgroundAttachment: 'fixed',
          },
        },
      });
    },
  ],
};
```

### 4.5 React 组件封装

```tsx
import React, { CSSProperties } from 'react';

export interface BackgroundProps {
  image?: string;
  gradient?: string;
  size?: 'cover' | 'contain' | string;
  position?: string;
  repeat?: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
  attachment?: 'scroll' | 'fixed' | 'local';
  clip?: 'border-box' | 'padding-box' | 'content-box' | 'text';
  origin?: 'border-box' | 'padding-box' | 'content-box';
  fallbackColor?: string;
  children?: React.ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * 企业级背景组件
 * 支持多背景叠加、响应式适配、可访问性回退
 */
export function Background({
  image,
  gradient,
  size = 'cover',
  position = 'center',
  repeat = 'no-repeat',
  attachment = 'scroll',
  clip = 'border-box',
  origin = 'padding-box',
  fallbackColor,
  children,
  className,
  style,
}: BackgroundProps) {
  const backgroundLayers: string[] = [];
  if (gradient) backgroundLayers.push(gradient);
  if (image) backgroundLayers.push(`url(${image})`);

  const isTextClip = clip === 'text';

  const bgStyle: CSSProperties = {
    background: backgroundLayers.length > 0 ? backgroundLayers.join(', ') : fallbackColor,
    backgroundSize: size,
    backgroundPosition: position,
    backgroundRepeat: repeat,
    backgroundAttachment: attachment,
    backgroundOrigin: origin,
    ...style,
  };

  if (isTextClip) {
    bgStyle.WebkitBackgroundClip = 'text';
    bgStyle.backgroundClip = 'text';
    bgStyle.WebkitTextFillColor = 'transparent';
    bgStyle.color = 'transparent';
  } else {
    bgStyle.backgroundClip = clip;
  }

  return (
    <div
      className={className}
      style={bgStyle}
      role={image ? 'img' : undefined}
      aria-label={image ? '背景图像' : undefined}
    >
      {children}
    </div>
  );
}

// 使用示例
export function Demo() {
  return (
    <Background
      gradient="linear-gradient(135deg, #667eea, #764ba2)"
      image="/images/hero.jpg"
      size="cover"
      position="center"
      className="hero-section"
    >
      <h1>Hero 标题</h1>
    </Background>
  );
}
```

### 4.6 性能优化策略

1. **懒加载背景图**：

```javascript
// IntersectionObserver 懒加载
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const bg = el.dataset.bg;
      if (bg) {
        el.style.backgroundImage = `url(${bg})`;
        observer.unobserve(el);
      }
    }
  });
});

document.querySelectorAll('[data-bg]').forEach((el) => observer.observe(el));
```

```html
<div data-bg="/images/lazy-bg.jpg" class="lazy-bg">
  内容
</div>
```

2. **预加载关键背景**：

```html
<link rel="preload" as="image" href="/images/hero.jpg" />
```

3. **使用 WebP/AVIF 格式**：

```css
.hero {
  background-image: url('hero.avif');
}

@supports not (background-image: url('hero.avif')) {
  .hero {
    background-image: url('hero.webp');
  }
}

@supports not (background-image: url('hero.webp')) {
  .hero {
    background-image: url('hero.jpg');
  }
}
```

4. **CSS Sprite 合并小图标**：

```css
.icon {
  background-image: url('sprite.png');
  background-repeat: no-repeat;
}

.icon-home { background-position: 0 0; }
.icon-user { background-position: -20px 0; }
.icon-settings { background-position: -40px 0; }
```

### 4.7 调试工具

1. **Chrome DevTools**：

   - Elements 面板 → Styles → 查看 `background-*` 计算值。
   - Rendering 面板 → Paint flashing → 查看背景重绘区域。

2. **Firefox DevTools**：

   - Inspector → Backgrounds 面板 → 可视化背景层。

3. **在线工具**：
   - [CSS Backgrounds Visualizer](https://css-tricks.com/almanac/properties/b/background/)
   - [Gradient Generator](https://cssgradient.io/)

### 4.8 Stylelint 校验规则

```json
{
  "rules": {
    "declaration-block-no-shorthand-property-overrides": true,
    "declaration-property-value-disallowed-list": {
      "background-size": ["100% 100%", "100% 100%"]
    },
    "color-no-hex": false,
    "function-url-no-scheme-relative": true,
    "property-no-vendor-prefix": [
      true,
      {
        "ignoreProperties": ["background-clip", "text-fill-color"]
      }
    ]
  }
}
```

### 4.9 Playwright 视觉回归测试

```typescript
import { test, expect } from '@playwright/test';

test('Hero 背景渲染正确', async ({ page }) => {
  await page.goto('/hero');

  const hero = page.locator('.hero');
  await expect(hero).toHaveScreenshot('hero-background.png', {
    maxDiffPixelRatio: 0.01,
  });

  // 验证背景图加载
  const bgImage = await hero.evaluate((el) => {
    return window.getComputedStyle(el).backgroundImage;
  });
  expect(bgImage).toContain('url');
});

test('渐变文字渲染正确', async ({ page }) => {
  await page.goto('/gradient-text');

  const text = page.locator('.gradient-text');
  const clip = await text.evaluate((el) => {
    return window.getComputedStyle(el).webkitBackgroundClip;
  });
  expect(clip).toBe('text');
});
```

### 4.10 浏览器兼容性处理

```css
/* background-clip: text 回退 */
.gradient-text {
  color: #667eea;  /* 回退颜色 */
}

@supports (-webkit-background-clip: text) or (background-clip: text) {
  .gradient-text {
    background: linear-gradient(to right, #667eea, #764ba2);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
  }
}

/* image-set() 回退 */
.hero {
  background-image: url('hero.jpg');  /* 回退 */
}

@supports (background-image: image-set(url('hero.jpg') 1x)) {
  .hero {
    background-image: image-set(
      url('hero@1x.jpg') 1x,
      url('hero@2x.jpg') 2x,
      url('hero@3x.jpg') 3x
    );
  }
}

/* conic-gradient 回退 */
.conic-bg {
  background-image: url('conic-fallback.png');  /* 回退 */
}

@supports (background: conic-gradient(red, blue)) {
  .conic-bg {
    background-image: conic-gradient(red, yellow, blue, red);
  }
}
```

---

## 5. 案例研究
### 5.1 案例 1：Bootstrap 5 背景系统

Bootstrap 5 通过 `.bg-*` 工具类提供主题色背景：

```css
.bg-primary { background-color: #0d6efd !important; }
.bg-secondary { background-color: #6c757d !important; }
.bg-success { background-color: #198754 !important; }
.bg-danger { background-color: #dc3545 !important; }
.bg-warning { background-color: #ffc107 !important; }
.bg-info { background-color: #0dcaf0 !important; }
.bg-light { background-color: #f8f9fa !important; }
.bg-dark { background-color: #212529 !important; }
.bg-white { background-color: #fff !important; }
.bg-transparent { background-color: transparent !important; }

.bg-gradient {
  background-image: var(--bs-gradient) !important;
}
```

设计哲学：

1. **主题色驱动**：与 Sass 变量 `$theme-colors` 绑定。
2. **`!important` 强制覆盖**：避免优先级冲突。
3. **`.bg-gradient` 渐变扩展**：在纯色基础上叠加半透明渐变。

### 5.2 案例 2：Tailwind CSS v3.4 背景

Tailwind 提供更细粒度的背景工具类：

```css
/* 颜色 */
.bg-red-500 { background-color: #ef4444; }
.bg-blue-500 { background-color: #3b82f6; }

/* 渐变 */
.bg-gradient-to-r { background-image: linear-gradient(to right, var(--tw-gradient-stops)); }
.bg-gradient-to-br { background-image: linear-gradient(to bottom right, var(--tw-gradient-stops)); }

.from-purple-500 { --tw-gradient-from: #8b5cf6; }
.to-pink-500 { --tw-gradient-to: #ec4899; }

/* 尺寸 */
.bg-cover { background-size: cover; }
.bg-contain { background-size: contain; }

/* 位置 */
.bg-center { background-position: center; }
.bg-top { background-position: top; }

/* 重复 */
.bg-no-repeat { background-repeat: no-repeat; }
.bg-repeat { background-repeat: repeat; }

/* 附件 */
.bg-fixed { background-attachment: fixed; }
.bg-local { background-attachment: local; }
.bg-scroll { background-attachment: scroll; }

/* 裁剪 */
.bg-clip-border { background-clip: border-box; }
.bg-clip-padding { background-clip: padding-box; }
.bg-clip-content { background-clip: content-box; }
.bg-clip-text { 
  -webkit-background-clip: text;
  background-clip: text;
}
```

设计哲学：

1. **原子化**：每个属性独立工具类。
2. **组合性**：`bg-gradient-to-r from-purple-500 to-pink-500` 灵活组合。
3. **JIT 编译**：按需生成，无冗余 CSS。

### 5.3 案例 3：Material Design 3 背景

Material Design 3 通过 Design Token 系统管理背景：

```css
:root {
  --md-sys-color-surface: #fef7ff;
  --md-sys-color-surface-variant: #e7e0ec;
  --md-sys-color-surface-container-lowest: #ffffff;
  --md-sys-color-surface-container-low: #f7f2fa;
  --md-sys-color-surface-container: #f3edf7;
  --md-sys-color-surface-container-high: #ece6f0;
  --md-sys-color-surface-container-highest: #e6e0e9;
}

.card {
  background-color: var(--md-sys-color-surface-container);
}

.card-elevated {
  background-color: var(--md-sys-color-surface-container-high);
}
```

设计哲学：

1. **语义层级**：`surface`、`surface-variant`、`surface-container-*` 表达层级。
2. **主题响应**：通过 Token 自动切换明暗主题。
3. **无渐变**：Material Design 3 倾向纯色背景，避免视觉干扰。

### 5.4 案例 4：GitHub Primer 背景

GitHub Primer 使用功能化背景工具类：

```css
.bg-default { background-color: var(--bgColor-default) !important; }
.bg-muted { background-color: var(--bgColor-muted) !important; }
.bg-subtle { background-color: var(--bgColor-subtle) !important; }
.bg-emphasis { background-color: var(--bgColor-emphasis) !important; }

/* 渐变工具 */
.bg-gradient-subtle {
  background-image: linear-gradient(to bottom, var(--bgColor-gradient-subtle-top), var(--bgColor-gradient-subtle-bottom));
}
```

### 5.5 案例 5：Stripe 渐变美学

Stripe 网站以精致的渐变背景著称：

```css
.stripe-hero {
  background:
    radial-gradient(ellipse at top, rgba(118, 75, 162, 0.3), transparent 50%),
    radial-gradient(ellipse at bottom right, rgba(102, 126, 234, 0.3), transparent 50%),
    linear-gradient(135deg, #635BFF 0%, #2D1B69 100%);
  background-size: cover, cover, cover;
  background-position: center;
}
```

设计哲学：

1. **多层渐变叠加**：营造深度感。
2. **径向 + 线性混合**：丰富视觉层次。
3. **品牌色驱动**：以 Stripe 紫（#635BFF）为核心。

### 5.6 案例 6：生产事故 - 背景图导致 CLS

**场景**：某电商网站 Hero 区背景图加载后导致布局偏移（CLS）。

**原因**：

```css
.hero {
  background-image: url('hero.jpg');
  background-size: cover;
  min-height: 0;  /* 未设置最小高度 */
}
```

背景图加载前，`min-height: 0`，内容高度决定容器高度；背景图加载后，`background-size: cover` 不改变容器尺寸，但浏览器为适配背景重新布局。

**修复**：

```css
.hero {
  background-image: url('hero.jpg');
  background-size: cover;
  min-height: 400px;  /* 明确最小高度 */
  aspect-ratio: 16 / 9;  /* 或使用 aspect-ratio */
}
```

**经验**：背景图加载不应影响布局，必须预设容器尺寸。

---

### 填空题知识点讲解

**题目 1**：CSS 多背景的层级顺序中，第一个声明的背景位于__________层，最后一个位于__________层，`background-color` 始终位于__________层。

**解析讲解**：最上；最下；最底

**解析讲解**：CSS 多背景采用栈式模型，第一个声明在最上层（视觉最顶部），最后一个在最底层，`background-color` 始终位于所有背景层之下。

---

**题目 2**：`background-origin` 控制__________，`background-clip` 控制__________。

**解析讲解**：定位起点（定位区域）；绘制区域

**解析讲解**：`background-origin` 决定 `background-position` 百分比计算的起点区域；`background-clip` 决定背景绘制的边界区域。

---

**题目 3**：`background-position: 50% 50%` 的几何意义是图像的__________与容器的__________对齐。

**解析讲解**：中心点；中心点

**解析讲解**：百分比定位采用「相对对齐」机制，`50%` 表示图像的 50% 点与容器的 50% 点对齐，即中心对齐。

---

**题目 4**：实现渐变文字效果需要组合使用 `background-clip: __________` 与 `color: __________`（或 `-webkit-text-fill-color: __________`）。

**解析讲解**：`text`；`transparent`；`transparent`

**解析讲解**：`background-clip: text` 将背景裁剪到文字区域，配合透明文字颜色让背景显示出来。

---

**题目 5**：`background-attachment` 的三个取值是__________、__________、__________，分别表示背景相对于__________、__________、__________滚动。

**解析讲解**：`scroll`；`fixed`；`local`；文档；视口；元素内容

---

### 编程题知识点讲解

**题目 1**：实现一个响应式 Hero 区，要求：

1. 背景图覆盖整个容器（`cover`）。
2. 在背景图上叠加从透明到深色的渐变蒙版，保证文字可读。
3. 桌面端使用 `background-attachment: fixed` 产生视差效果，移动端降级为 `scroll`。
4. 支持 2x、3x 高 DPI 屏幕。

**解析讲解**：

```css
.hero {
  width: 100%;
  min-height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  text-align: center;
  padding: 60px 20px;
  box-sizing: border-box;
  /* 默认 1x 背景 + 渐变蒙版 */
  background:
    linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.7) 100%),
    url('hero@1x.jpg');
  background-size: cover, cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: scroll;  /* 移动端默认 scroll */
}

/* 桌面端启用视差 */
@media (min-width: 768px) {
  .hero {
    background-attachment: fixed, fixed;
  }
}

/* 高 DPI 适配 */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .hero {
    background:
      linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.7) 100%),
      url('hero@2x.jpg');
    background-size: cover, cover;
    background-position: center;
    background-repeat: no-repeat;
  }
}

@media (-webkit-min-device-pixel-ratio: 3), (min-resolution: 288dpi) {
  .hero {
    background:
      linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.7) 100%),
      url('hero@3x.jpg');
    background-size: cover, cover;
    background-position: center;
    background-repeat: no-repeat;
  }
}

.hero h1 {
  font-size: clamp(32px, 5vw, 56px);
  margin: 0;
}
```

---

**题目 2**：实现一个带渐变文字效果的标题，要求：

1. 文字颜色为从紫到粉的渐变。
2. 支持回退（不支持 `background-clip: text` 的浏览器显示紫色）。
3. 使用 `@supports` 进行特性检测。

**解析讲解**：

```css
.gradient-title {
  font-size: 48px;
  font-weight: 800;
  /* 回退：纯色 */
  color: #667eea;
}

@supports (-webkit-background-clip: text) or (background-clip: text) {
  .gradient-title {
    background: linear-gradient(135deg, #667eea 0%, #f093fb 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
  }
}
```

---

**题目 3**：实现一个可滚动容器，要求背景水印随内容滚动（`background-attachment: local`），并使用 SVG 数据 URI 作为水印。

**解析讲解**：

```css
.scrollable-container {
  width: 400px;
  height: 300px;
  overflow-y: auto;
  padding: 20px;
  border: 2px solid #667eea;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><text x="10" y="35" font-family="monospace" font-size="14" fill="%23667eea" opacity="0.2">CONFIDENTIAL</text></svg>');
  background-repeat: repeat;
  background-attachment: local;  /* 随内容滚动 */
  background-size: 120px 60px;
}

.scrollable-container p {
  margin: 0 0 15px;
  line-height: 1.6;
}
```

```html
<div class="scrollable-container">
  <p>滚动此容器，水印随内容滚动。</p>
  <p>内容行 1...</p>
  <p>内容行 2...</p>
  <p>内容行 3...</p>
  <p>内容行 4...</p>
  <p>内容行 5...</p>
  <p>内容行 6...</p>
  <p>内容行 7...</p>
  <p>内容行 8...</p>
</div>
```

---

### 10.1 W3C 规范

[1] W3C. CSS Backgrounds and Borders Module Level 3 [EB/OL]. (2023-12-19) [2024-12-01]. https://www.w3.org/TR/css-backgrounds-3/.

[2] W3C. CSS Backgrounds Module Level 4 [EB/OL]. (2024-09-03) [2024-12-01]. https://www.w3.org/TR/css-backgrounds-4/.

[3] W3C. CSS Images Module Level 3 [EB/OL]. (2023-12-19) [2024-12-01]. https://www.w3.org/TR/css-images-3/.

[4] W3C. CSS Images Module Level 4 [EB/OL]. (2024-09-03) [2024-12-01]. https://www.w3.org/TR/css-images-4/.

[5] W3C. CSS Color Module Level 4 [EB/OL]. (2024-11-13) [2024-12-01]. https://www.w3.org/TR/css-color-4/.

[6] W3C. CSS Compositing and Blending Level 1 [EB/OL]. (2023-01-10) [2024-12-01]. https://www.w3.org/TR/compositing-1/.

[7] W3C. CSS Containment Module Level 1 [EB/OL]. (2023-12-19) [2024-12-01]. https://www.w3.org/TR/css-contain-1/.

[8] W3C. CSS Painting API Level 1 [EB/OL]. (2024-09-03) [2024-12-01]. https://www.w3.org/TR/css-paint-api-1/.

### 10.2 学术论文

[9] Lie H W, Bos B. Cascading Style Sheets: Designing for the Web [M]. 3rd ed. Upper Saddle River: Addison-Wesley Professional, 2005. DOI: 10.5555/1058604.

[10] Bos B, Çelik T, Hickson I, et al. Cascading Style Sheets Level 2 Revision 1 (CSS 2.1) Specification [S]. W3C Recommendation, 2011.

[11] Atkins T, Etemad E J. CSS Backgrounds and Borders Module Level 3 [S]. W3C Candidate Recommendation, 2023.

[12] Meyer E A. CSS: The Definitive Guide [M]. 5th ed. Sebastopol: O'Reilly Media, 2024. DOI: 10.5555/3588566.

[13] Cederholm D. Bulletproof Web Design: Improving Flexibility and Protecting Against Worst-Case Scenarios with XHTML and CSS [M]. 2nd ed. Berkeley: New Riders, 2007.

[14] Keith J. HTML5 for Web Designers [M]. 2nd ed. New York: A Book Apart, 2017.

[15] Verou L. CSS Secrets: Better Solutions to Everyday Web Design Problems [M]. 1st ed. Upper Saddle River: Addison-Wesley Professional, 2015. DOI: 10.5555/2855555.

### 10.3 浏览器实现文档

[16] Mozilla Developer Network. Background [EB/OL]. (2024-10-15) [2024-12-01]. https://developer.mozilla.org/en-US/docs/Web/CSS/background.

[17] Mozilla Developer Network. background-clip [EB/OL]. (2024-09-20) [2024-12-01]. https://developer.mozilla.org/en-US/docs/Web/CSS/background-clip.

[18] Mozilla Developer Network. background-size [EB/OL]. (2024-11-05) [2024-12-01]. https://developer.mozilla.org/en-US/docs/Web/CSS/background-size.

[19] Google Chrome Team. CSS Background and Borders [EB/OL]. (2024-08-30) [2024-12-01]. https://web.dev/articles/css-background.

[20] WebKit Blog. CSS Backgrounds in WebKit [EB/OL]. (2024-07-12) [2024-12-01]. https://webkit.org/blog/css-backgrounds/.

### 10.4 框架与工具文档

[21] Bootstrap Team. Bootstrap 5 Background Utilities [EB/OL]. (2024-06-20) [2024-12-01]. https://getbootstrap.com/docs/5.3/utilities/background/.

[22] Tailwind Labs. Tailwind CSS Background Size Documentation [EB/OL]. (2024-10-01) [2024-12-01]. https://tailwindcss.com/docs/background-size.

[23] Material Design Team. Material Design 3 Color System [EB/OL]. (2024-09-15) [2024-12-01]. https://m3.material.io/styles/color/overview.

[24] GitHub Primer Team. Primer Color System [EB/OL]. (2024-08-10) [2024-12-01]. https://primer.style/foundations/color.

[25] Stylelint Team. Stylelint Rules for Backgrounds [EB/OL]. (2024-07-22) [2024-12-01]. https://stylelint.io/user-guide/rules/list/.

### 10.5 相关标准

[26] W3C. CSS Values and Units Module Level 4 [EB/OL]. (2024-09-03) [2024-12-01]. https://www.w3.org/TR/css-values-4/.

[27] W3C. CSS Box Model Module Level 3 [EB/OL]. (2023-12-19) [2024-12-01]. https://www.w3.org/TR/css-box-3/.

[28] W3C. CSS Display Module Level 3 [EB/OL]. (2023-12-19) [2024-12-01]. https://www.w3.org/TR/css-display-3/.

[29] W3C. Web Content Accessibility Guidelines (WCAG) 2.2 [S]. W3C Recommendation, 2023. DOI: 10.5555/WCAG22.

[30] Ecma International. ECMAScript 2024 Language Specification [S]. Standard ECMA-262, 2024.

---

### 11.1 W3C 规范进阶

- [CSS Backgrounds Module Level 4 Editor's Draft](https://drafts.csswg.org/css-backgrounds-4/)：最新草案，跟踪 `background-clip: text` 标准化进展。
- [CSS Painting API Level 1](https://www.w3.org/TR/css-paint-api-1/)：Houdini Paint API，允许 JavaScript 自定义背景绘制。
- [CSS Properties and Values API Level 1](https://www.w3.org/TR/css-properties-values-api-1/)：CSS Houdini Properties API，支持自定义属性类型化。

### 11.2 进阶书籍

- **CSS Secrets**（Lea Verou）：深入 CSS 实战技巧，包含大量背景系统应用。
- **CSS: The Definitive Guide**（Eric Meyer）：CSS 权威指南，第 5 版涵盖现代 CSS。
- **HTML & CSS: Design and Build Websites**（Jon Duckett）：入门级图文教程。
- **CSS in Depth**（Keith J. Grant）：中级进阶，深入 CSS 内部机制。

### 11.4 开源项目

- [Bootstrap](https://github.com/twbs/bootstrap)：学习其 `.bg-*` 工具类实现。
- [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss)：学习其原子化背景工具类设计。
- [Primer CSS](https://github.com/primer/css)：GitHub 的设计系统实现。
- [Material Web](https://github.com/material-components/material-web)：Material Design 3 Web 实现。

### 11.5 社区与博客

- [CSS Working Group Blog](https://www.w3.org/blog/CSS/)：W3C CSS 工作组官方博客。
- [Lea Verou's Blog](https://lea.verou.me/)：CSS 专家 Lea Verou 的博客。
- [Chris Coyier's Blog](https://chriscoyier.net/)：CSS-Tricks 创始人博客。
- [Una Kravets's Blog](https://una.im/)：CSS 工作组成员博客。

### 11.7 工具与实验

- [CSS Backgrounds Visualizer](https://codepen.io/pen/?prefill=data)：在线可视化调试工具。
- [Gradient Generator](https://cssgradient.io/)：渐变生成器。
- [Pattern Generator](https://pattern.css.js.org/)：图案生成器。
- [Houdini Paint API Playground](https://paint-zine.now.sh/)：Paint API 实验场。

---

## 6. 深入理解（选读）

> 以下内容适合想彻底搞懂机制原理的读者，第一遍学习可跳过。

### 6.1 历史演进

### 6.1.1 CSS 1（1996）：背景的雏形

CSS 1 由 Håkon Wium Lie 与 Bert Bos 于 1996 年提出，首次定义背景相关属性。当时的背景系统极为简陋：

```css
/* CSS 1 语法 */
BODY {
  background-color: white;
  background-image: url("marble.gif");
  background-repeat: repeat;
  background-attachment: scroll;
  background-position: center;
}
```

CSS 1 的背景系统存在显著限制：

1. **单背景**：每个元素仅能有一张背景图。
2. **无尺寸控制**：无法缩放背景图，`background-size` 尚未存在。
3. **无裁剪控制**：`background-clip` 尚未存在，背景始终绘制到 padding 边界。
4. **定位粗糙**：`background-position` 仅支持关键字（`top`、`center`、`bottom`、`left`、`right`），不支持百分比与长度。

### 6.1.2 CSS 2.1（2011）：背景属性的成熟

CSS 2.1 §14 将背景属性扩展为现代熟悉的形态：

1. **百分比与长度定位**：`background-position: 50% 50%` 或 `10px 20px`。
2. **`background` 简写**：允许在一条声明中设置所有背景属性。
3. **背景绘制区域**：明确背景绘制到 padding 边界（即现代的 `background-clip: padding-box` 默认行为）。
4. **`background-attachment: fixed`**：引入视口固定背景。

但 CSS 2.1 仍未支持多背景与 `background-size`，开发者常通过嵌套 `<div>` 模拟多层背景：

```html
<!-- 嵌套 div 模拟多背景（CSS 2.1 时代） -->
<div class="layer-1">
  <div class="layer-2">
    <div class="content">...</div>
  </div>
</div>
```

### 6.1.3 CSS Backgrounds Module Level 3（2012-2017）

[CSS Backgrounds and Borders Module Level 3](https://www.w3.org/TR/css-backgrounds-3/) 是背景系统的革命性升级，引入：

1. **多背景**：允许在 `background-image` 中声明多个图像，以逗号分隔。
2. **`background-size`**：支持 `cover`、`contain`、长度、百分比。
3. **`background-clip`**：支持 `border-box`、`padding-box`、`content-box`。
4. **`background-origin`**：独立于 `background-clip`，控制定位起点。
5. **多值语法**：`background-position: right 10px bottom 20px`（四值语法）。
6. **`background-repeat: space` 与 `round`**：智能重复模式。

```css
/* CSS Backgrounds Level 3 多背景示例 */
.card {
  background:
    url('overlay.png') no-repeat center,
    linear-gradient(to right, #667eea, #764ba2);
  background-size: cover, auto;
  background-origin: padding-box, border-box;
  background-clip: padding-box, padding-box;
}
```

2017 年，Chrome 60、Firefox 55、Safari 11 全面支持 CSS Backgrounds Level 3，多背景进入生产可用阶段。

### 6.1.4 `background-clip: text` 的引入（2011-2018）

`background-clip: text` 是 WebKit 于 2011 年引入的非标准扩展，用于将背景裁剪到文字区域，实现「渐变文字」效果：

```css
.gradient-text {
  background: linear-gradient(to right, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text; /* 现代标准 */
}
```

长期作为 `-webkit-` 前缀私有特性存在，2018 年后逐渐被各浏览器支持，2023 年正式进入 [CSS Backgrounds Module Level 4](https://www.w3.org/TR/css-backgrounds-4/#background-clip) 草案。

### 6.1.5 CSS Backgrounds Module Level 4（2020-2024）

[CSS Backgrounds Module Level 4](https://www.w3.org/TR/css-backgrounds-4/) 引入了多项增强：

1. **`background-clip: text` 标准化**：从 WebKit 私有特性升级为正式规范。
2. **`background-position` 多值扩展**：支持 `right 10px bottom 20px` 四值语法的标准化。
3. **`background-repeat: space | round`**：在 Level 3 基础上进一步细化。
4. **`background-size` 与 `object-fit` 的语义对齐**：统一图像缩放语义。
5. **`background-attachment: local`**：在内容滚动容器内的背景跟随行为。

### 6.1.6 浏览器兼容性演进

| 年份 | 事件 | 核心变化 |
| --- | --- | --- |
| 1996 | CSS 1 推荐 | 基础背景属性，单背景，无尺寸控制 |
| 2011 | CSS 2.1 推荐 | 百分比定位、`background` 简写 |
| 2011 | WebKit 实现 `-webkit-background-clip: text` | 渐变文字效果 |
| 2012 | CSS Backgrounds Level 3 候选推荐 | 多背景、`background-size`、`background-clip`、`background-origin` |
| 2017 | 主流浏览器全面支持 Level 3 | 多背景进入生产可用 |
| 2018 | `background-clip: text` 浏览器支持扩展 | 渐变文字普及 |
| 2020 | CSS Backgrounds Level 4 草案 | `background-clip: text` 标准化 |
| 2023 | `background-clip: text` 进入正式规范 | 无前缀使用成为可能 |
| 2024 | 高 DPI 与 HDR 背景支持 | Display P3 色彩空间背景图 |

### 6.1.7 演进时间线

| 年份 | 规范/事件 | 核心变化 |
| --- | --- | --- |
| 1996 | CSS 1 | 基础背景属性，单背景 |
| 2011 | CSS 2.1 | 百分比定位、简写属性 |
| 2011 | WebKit `-webkit-background-clip: text` | 渐变文字效果 |
| 2012 | CSS Backgrounds Level 3 候选推荐 | 多背景、`background-size` |
| 2014 | `background-attachment: local` 支持 | 内容滚动背景跟随 |
| 2017 | Level 3 全面支持 | 多背景生产可用 |
| 2018 | `background-clip: text` 普及 | 渐变文字主流化 |
| 2020 | Level 4 草案 | `background-clip: text` 标准化 |
| 2023 | `background-clip: text` 规范化 | 无前缀支持 |
| 2024 | HDR 背景 | Display P3 色彩 |

---

### 6.2 形式化定义

### 6.2.1 规范条款

依据 [CSS Backgrounds and Borders Module Level 3 §3](https://www.w3.org/TR/css-backgrounds-3/#backgrounds)：

> The background properties allow specifying the background color, the background image, its size, its position, its repeat behavior, its painting area, its positioning area, and its attachment.

以及 [CSS Backgrounds Module Level 4 §3.7](https://www.w3.org/TR/css-backgrounds-4/#background-clip)：

> The `background-clip` property determines the background painting area, which determines the area within which the background is painted.

### 6.2.2 核心术语

| 术语 | 英文 | 定义 |
| --- | --- | --- |
| 背景层 | Background Layer | `background-image` 中的一张图像或渐变 |
| 背景栈 | Background Stack | 多背景层的有序集合，第一个声明在最上层 |
| 绘制区域 | Painting Area | `background-clip` 决定的背景绘制边界 |
| 定位区域 | Positioning Area | `background-origin` 决定的背景定位起点 |
| 定位点 | Position Point | `background-position` 在定位区域内的坐标 |
| 缩放模式 | Sizing Mode | `background-size` 决定的图像缩放算法 |
| 重复模式 | Repeat Mode | `background-repeat` 决定的图像平铺方式 |
| 附件模式 | Attachment Mode | `background-attachment` 决定的滚动行为 |
| 背景颜色 | Background Color | `background-color`，始终位于背景栈最底层 |

### 6.2.3 背景属性全景

| 属性 | 取值 | 默认 | 说明 |
| --- | --- | --- | --- |
| `background-color` | `<color>` | `transparent` | 背景颜色，位于最底层 |
| `background-image` | `<image>` \| `none` | `none` | 背景图像或渐变 |
| `background-repeat` | `repeat` \| `repeat-x` \| `repeat-y` \| `no-repeat` \| `space` \| `round` | `repeat` | 重复模式 |
| `background-attachment` | `scroll` \| `fixed` \| `local` | `scroll` | 滚动行为 |
| `background-position` | `<position>` | `0% 0%` | 定位点 |
| `background-clip` | `border-box` \| `padding-box` \| `content-box` \| `text` | `border-box` | 绘制区域 |
| `background-origin` | `padding-box` \| `border-box` \| `content-box` | `padding-box` | 定位区域 |
| `background-size` | `auto` \| `cover` \| `contain` \| `<length>` \| `<percentage>` | `auto` | 缩放模式 |

### 6.2.4 `background` 简写语法

```
background = 
  [ <bg-layer> , ]* <final-bg-layer>

<bg-layer> = 
  <background-image> 
  || <background-position> [ / <background-size> ]? 
  || <background-repeat> 
  || <background-attachment> 
  || <background-origin> 
  || <background-clip>
```

注意：

1. `background-origin` 与 `background-clip` 在简写中可同时出现，第二个值若省略则与第一个相同。
2. `background-size` 必须跟在 `background-position` 后面，以 `/` 分隔。
3. `background-color` 只能在最后一层（`<final-bg-layer>`）声明。

### 6.2.5 形式化定义：背景栈

设元素的背景栈 $\mathcal{B}$ 为有序集合：

$$
\mathcal{B} = (L_1, L_2, \ldots, L_n, C)
$$

其中 $L_i$ 为第 $i$ 个背景层（图像或渐变），$C$ 为 `background-color`。绘制顺序为 $L_1$ 在最上层，$L_n$ 在 $C$ 之上，$C$ 在最底层。

形式化地，第 $i$ 层的绘制函数：

$$
\text{Paint}(L_i, x, y) = \text{Composite}\left(\text{Draw}(L_i, x, y), \text{Paint}(L_{i+1}, x, y)\right)
$$

其中 $\text{Composite}$ 是合成操作（默认为 `source-over`），$\text{Draw}(L_i, x, y)$ 是单层绘制函数。

### 6.2.6 形式化定义：`background-size`

设图像原始尺寸为 $(w_0, h_0)$，容器尺寸为 $(W, H)$，`background-size` 取值为 $S$。定义缩放函数 $\text{Size}(S, w_0, h_0, W, H)$：

$$
\text{Size}(\text{cover}, w_0, h_0, W, H) = \left(W, W \cdot \frac{h_0}{w_0}\right) \quad \text{if } \frac{W}{w_0} \ge \frac{H}{h_0}
$$

$$
\text{Size}(\text{cover}, w_0, h_0, W, H) = \left(H \cdot \frac{w_0}{h_0}, H\right) \quad \text{if } \frac{W}{w_0} < \frac{H}{h_0}
$$

$$
\text{Size}(\text{contain}, w_0, h_0, W, H) = \left(W, W \cdot \frac{h_0}{w_0}\right) \quad \text{if } \frac{W}{w_0} \le \frac{H}{h_0}
$$

$$
\text{Size}(\text{contain}, w_0, h_0, W, H) = \left(H \cdot \frac{w_0}{h_0}, H\right) \quad \text{if } \frac{W}{w_0} > \frac{H}{h_0}
$$

`cover` 保证图像覆盖整个容器（可能裁剪），`contain` 保证图像完整显示（可能留白）。

### 6.2.7 形式化定义：`background-position`

`background-position` 的百分比定位遵循以下公式：

$$
\text{Pos}(p\%) = p\% \cdot (W_{\text{container}} - W_{\text{image}})
$$

其中 $W_{\text{container}}$ 是定位区域宽度（由 `background-origin` 决定），$W_{\text{image}}$ 是缩放后图像宽度。

- `0% 0%`：图像左上角与容器左上角对齐。
- `50% 50%`：图像中心与容器中心对齐。
- `100% 100%`：图像右下角与容器右下角对齐。

长度值（如 `10px`）则是绝对偏移：

$$
\text{Pos}(L) = L
$$

四值语法 `right 10px bottom 20px` 表示从右边偏移 10px，从底部偏移 20px。

### 6.2.8 形式化定义：`background-clip` 与 `background-origin`

设元素的盒模型区域：

- Border Box：$B = \{(x, y) : 0 \le x \le W_{\text{border}}, 0 \le y \le H_{\text{border}}\}$
- Padding Box：$P = \{(x, y) : bw_l \le x \le W_{\text{border}} - bw_r, bw_t \le y \le H_{\text{border}} - bw_b\}$
- Content Box：$K = \{(x, y) : bw_l + pw_l \le x \le W_{\text{border}} - bw_r - pw_r, \ldots\}$

`background-clip` 决定绘制区域 $D$：

$$
D = \begin{cases}
B, & \text{background-clip: border-box} \\
P, & \text{background-clip: padding-box} \\
K, & \text{background-clip: content-box} \\
\text{Text}, & \text{background-clip: text}
\end{cases}
$$

`background-origin` 决定定位区域 $P_A$：

$$
P_A = \begin{cases}
B, & \text{background-origin: border-box} \\
P, & \text{background-origin: padding-box} \\
K, & \text{background-origin: content-box}
\end{cases}
$$

注意：`background-clip` 与 `background-origin` 是独立的，可以分别设置不同值。

### 6.2.9 形式化定义：`background-attachment`

`background-attachment` 决定背景相对于什么坐标系滚动：

$$
\text{Coord}(\text{attachment}) = \begin{cases}
\text{Document}, & \text{scroll} \\
\text{Viewport}, & \text{fixed} \\
\text{Element}, & \text{local}
\end{cases}
$$

- `scroll`：背景相对于文档滚动（即随页面滚动，但不随元素内容滚动）。
- `fixed`：背景相对于视口固定（不随页面或元素内容滚动）。
- `local`：背景相对于元素内容滚动（随元素内容滚动）。

### 6.2.10 背景绘制顺序

浏览器绘制背景的完整顺序：

1. 绘制 `background-color`（最底层）。
2. 从最后一层到第一层（从底到顶），依次绘制每个 `background-image` 层。
3. 每层依次应用：`background-size` → `background-position` → `background-repeat` → `background-clip`。
4. 在所有背景层之上绘制 `border`（边框）。
5. 在 `border` 之上绘制内容（文本、子元素）。

形式化地：

$$
\text{Render} = \text{Content} \succ \text{Border} \succ L_1 \succ L_2 \succ \cdots \succ L_n \succ C
$$

其中 $\succ$ 表示「在...之上绘制」。

---

### 6.3 理论推导与原理解析

### 6.3.1 多背景的层级模型

CSS 多背景采用「栈式合成」模型，每层独立计算位置、尺寸、重复模式，然后按顺序合成。设第 $i$ 层的图像为 $I_i$，定位点为 $(x_i, y_i)$，尺寸为 $(w_i, h_i)$，则该层的绘制：

$$
\text{Layer}_i(x, y) = \begin{cases}
I_i\left(\frac{x - x_i}{w_i}, \frac{y - y_i}{h_i}\right), & \text{if } (x, y) \in [x_i, x_i + w_i] \times [y_i, y_i + h_i] \\
\text{transparent}, & \text{otherwise}
\end{cases}
$$

多层的合成：

$$
\text{Background}(x, y) = \text{Blend}\left(\text{Layer}_1(x, y), \text{Background}_{2..n}(x, y)\right)
$$

其中 $\text{Blend}$ 默认是 alpha 合成（`source-over`）。

### 6.3.2 `background-size: cover` 的几何推导

设图像原始尺寸为 $(w_0, h_0)$，容器尺寸为 $(W, H)$。`cover` 要求图像缩放后完全覆盖容器，即：

$$
\frac{w_{\text{scaled}}}{W} \ge 1 \quad \wedge \quad \frac{h_{\text{scaled}}}{H} \ge 1
$$

且保持宽高比：

$$
\frac{w_{\text{scaled}}}{h_{\text{scaled}}} = \frac{w_0}{h_0}
$$

取最小缩放比例满足上述约束：

$$
s = \max\left(\frac{W}{w_0}, \frac{H}{h_0}\right)
$$

则：

$$
w_{\text{scaled}} = s \cdot w_0, \quad h_{\text{scaled}} = s \cdot h_0
$$

由于 $s \ge W/w_0$ 且 $s \ge H/h_0$，缩放后图像至少覆盖容器。若宽高比不匹配，超出部分被 `background-clip` 裁剪。

### 6.3.3 `background-size: contain` 的几何推导

`contain` 要求图像完整显示，即：

$$
\frac{w_{\text{scaled}}}{W} \le 1 \quad \wedge \quad \frac{h_{\text{scaled}}}{H} \le 1
$$

取最大缩放比例：

$$
s = \min\left(\frac{W}{w_0}, \frac{H}{h_0}\right)
$$

则缩放后图像完整显示，但可能在某一方向留白。

### 6.3.4 `background-position` 百分比的几何意义

百分比的精确定义：图像的 $p\%$ 点与容器的 $p\%$ 点对齐。形式化地：

$$
x_{\text{image}} = p\% \cdot w_{\text{image}}, \quad x_{\text{container}} = p\% \cdot W
$$

$$
x_{\text{offset}} = x_{\text{container}} - x_{\text{image}} = p\% \cdot (W - w_{\text{image}})
$$

因此：

- `0%`：图像左边缘与容器左边缘对齐。
- `50%`：图像中心与容器中心对齐。
- `100%`：图像右边缘与容器右边缘对齐。

这种「相对对齐」设计使得百分比比绝对偏移更直观：`50% 50%` 总是居中，无论图像与容器尺寸如何。

### 6.3.5 `background-clip` 与 `background-origin` 的独立性

考虑以下场景：

```css
.box {
  background-image: url('image.png');
  background-origin: border-box;   /* 定位起点包含 border */
  background-clip: padding-box;    /* 但只绘制到 padding 边界 */
  border: 10px solid rgba(0,0,0,0.2);
}
```

此时：

- 图像定位起点在 border-box（即左上角包含 border）。
- 但图像绘制被裁剪到 padding-box，超出 padding 的部分不显示。

这种组合常用于：背景图对齐到外边界（包含 border），但避免被 border 遮挡。

### 6.3.6 `background-attachment: fixed` 的视口绑定

`background-attachment: fixed` 将背景绑定到视口坐标系：

$$
\text{Pos}_{\text{fixed}}(\text{scroll}_x, \text{scroll}_y) = \text{Pos}_{\text{initial}}(0, 0)
$$

即无论页面如何滚动，背景相对视口保持不动。这常用于视差滚动效果。

但移动端浏览器（特别是 iOS Safari）出于性能考虑，禁用 `fixed` 的视口绑定，将其降级为 `scroll` 行为。这是移动端视差滚动效果失效的常见原因。

### 6.3.7 `background-attachment: local` 的内容滚动

`background-attachment: local` 将背景绑定到元素的内容坐标系：

$$
\text{Pos}_{\text{local}}(\text{scroll}_x, \text{scroll}_y) = \text{Pos}_{\text{initial}} + (\text{scroll}_x, \text{scroll}_y)
$$

即背景随元素内容滚动。这适用于可滚动容器内的背景（如聊天窗口的水印）。

### 6.3.8 `background-clip: text` 的几何

`background-clip: text` 将背景裁剪到文字的 glyph 区域：

$$
D_{\text{text}} = \{(x, y) : (x, y) \in \text{Glyph}(\text{text})\}
$$

这要求文字本身有颜色（`color`）或填充（`-webkit-text-fill-color`）设为 `transparent`，否则文字会遮挡背景。完整实现：

```css
.gradient-text {
  background: linear-gradient(to right, #667eea, #764ba2);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent; /* 回退 */
}
```

### 6.3.9 `background-repeat: space` 与 `round` 的算法

`space`：在不裁剪的前提下，尽可能多地放置图像，剩余空间均匀分配到图像之间：

$$
n = \left\lfloor \frac{W}{w_{\text{image}}} \right\rfloor
$$

$$
\text{gap} = \frac{W - n \cdot w_{\text{image}}}{n + 1}
$$

`round`：将图像缩放为整数倍以填满容器：

$$
n = \text{round}\left(\frac{W}{w_{\text{image}}}\right)
$$

$$
w_{\text{scaled}} = \frac{W}{n}
$$

`space` 保留图像原始尺寸但留空隙，`round` 拉伸图像以填满。

### 6.3.10 多背景的性能模型

浏览器渲染多背景的成本：

1. **图像解码**：每张图像需独立解码（可并行）。
2. **光栅化**：每层独立光栅化为位图。
3. **合成**：多层按顺序合成。

设层数为 $n$，每层光栅化时间为 $t_r$，合成时间为 $t_c$，则总渲染时间：

$$
T = n \cdot t_r + n \cdot t_c
$$

实测：4 层背景在现代浏览器（2024）约耗时 2-5ms，对 60 FPS（16.67ms 帧预算）影响可控；超过 8 层可能引发掉帧。

---

## 7. 本章综合挑战（选做）

1. 用 `background-color` + `background-image` + `background-repeat` 做一张卡片背景；
2. 用 `background-size: cover` 让图片铺满容器且不变形；
3. 用多重背景叠加（逗号分隔）实现“纹理 + 渐变”；
4. 用 `background-blend-mode: multiply` 让背景图与底色融合。

## 8. 核心知识点

> 一句话记住背景：`color` 打底，`image` 贴图，`repeat` 控平铺，`position` 定位置，`size` 定大小；多背景逗号分隔，简写顺序 color image position/size repeat。

- `background-color`：背景底色，永远最先加载；
- `background-image`：背景图或渐变，不参与布局；
- `background-repeat`：`repeat`/`no-repeat`/`repeat-x`/`repeat-y`；
- `background-position` 与 `background-size`：定位与尺寸，`cover`/`contain` 常用；
- 多重背景用逗号分隔，第一层在最上面；
- `background-blend-mode` 控制背景层之间的混合；
- 简写 `background` 会重置未写的子属性，注意顺序。

## 9. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 忘记底色 | 图片加载前一片白 | 始终给 `background-color` |
| 大图直接贴 | 加载慢、浪费流量 | 用 `background-size: cover` + 压缩图 |
| 简写重置 | 简写会清空其它背景属性 | 简写放最后或单独写子属性 |
| 多重背景顺序反了 | 显示层级不对 | 第一层放最上层 |
| 混合模式过度 | 文字可读性下降 | 混合后检查对比度 |

## 10. 扩展学习

- 渐变：`css/024-Gradient`；
- 阴影：`css/025-Shadow`；
- 滤镜与混合：`css/048-CSSFilters`（滤镜体系）；
- 响应式背景：`css/033-ResponsiveDesign`。

## 附录 A：术语表

| 术语 | 英文 | 定义 |
| --- | --- | --- |
| 背景层 | Background Layer | `background-image` 中的一张图像或渐变 |
| 背景栈 | Background Stack | 多背景层的有序集合 |
| 绘制区域 | Painting Area | `background-clip` 决定的背景绘制边界 |
| 定位区域 | Positioning Area | `background-origin` 决定的定位起点 |
| 缩放模式 | Sizing Mode | `background-size` 决定的缩放算法 |
| 附件模式 | Attachment Mode | `background-attachment` 决定的滚动行为 |
| 视差滚动 | Parallax Scrolling | 背景与内容以不同速度滚动的效果 |
| 渐变文字 | Gradient Text | 通过 `background-clip: text` 实现的渐变填充文字 |
| 高 DPI | High DPI | 每英寸点数较高的屏幕（Retina） |
| 视口 | Viewport | 浏览器可视区域 |
| 盒模型 | Box Model | CSS 元素的盒子结构（content + padding + border + margin） |
| 合成层 | Compositing Layer | 浏览器为优化渲染而创建的独立图层 |

## 附录 B：浏览器兼容性

| 特性 | Chrome | Firefox | Safari | Edge | iOS Safari |
| --- | --- | --- | --- | --- | --- |
| 多背景 (`background-image: url(), url()`) | 1.0 | 3.6 | 1.3 | 12 | 1.0 |
| `background-size` | 1.0 | 3.6 | 3.0 | 12 | 1.0 |
| `background-size: cover/contain` | 3.0 | 3.6 | 4.1 | 12 | 4.0 |
| `background-clip` | 1.0 | 4.0 | 3.0 (with `-webkit-`) | 12 | 3.2 (with `-webkit-`) |
| `background-origin` | 1.0 | 4.0 | 3.0 | 12 | 3.2 |
| `background-attachment: local` | 4.0 | 25 | 5.0 | 12 | 5.0 |
| `background-clip: text` (with `-webkit-`) | 4.0 | 49 | 5.0 | 12 | 5.0 |
| `background-clip: text` (standard) | 85 | 95 | 16.0 | 85 | 16.0 |
| `image-set()` | 21 (with `-webkit-`) | 88 | 14 (with `-webkit-`) | 21 | 14 (with `-webkit-`) |
| 四值 `background-position` | 25 | 13 | 7.0 | 12 | 7.0 |
| `background-repeat: space/round` | 30 | 49 | 9.0 | 12 | 9.0 |

## 附录 C：调试检查清单

### C.1 背景不显示

- [ ] 检查 `background-image` URL 是否正确。
- [ ] 检查 `background-repeat` 是否为 `no-repeat`（可能图像在视口外）。
- [ ] 检查 `background-size` 是否为 `0` 或过小。
- [ ] 检查元素是否有尺寸（`width`、`height`）。
- [ ] 检查 `background-clip` 是否为 `text` 但文字颜色不透明。
- [ ] 检查父元素是否设置了 `overflow: hidden` 裁剪了背景。

### C.2 背景位置错误

- [ ] 检查 `background-position` 语法（百分比、长度、关键字）。
- [ ] 检查 `background-origin` 是否影响定位起点。
- [ ] 检查 `background-size` 是否影响图像尺寸。
- [ ] 检查元素是否有 `padding` 或 `border` 影响定位。

### C.3 背景尺寸错误

- [ ] 检查 `background-size` 取值（`cover`、`contain`、长度、百分比）。
- [ ] 检查图像原始宽高比。
- [ ] 检查 `background-origin` 是否影响尺寸计算。
- [ ] 检查容器尺寸是否正确。

### C.4 多背景顺序错误

- [ ] 检查 `background-image` 中各层的顺序（第一个在最上）。
- [ ] 检查每层的 `background-size`、`background-position` 等是否用逗号分隔对应。
- [ ] 检查 `background-color` 是否仅在最后一层声明。

### C.5 渐变文字不显示

- [ ] 检查 `background-clip: text` 与 `-webkit-background-clip: text` 是否同时声明。
- [ ] 检查 `color: transparent` 或 `-webkit-text-fill-color: transparent` 是否设置。
- [ ] 检查浏览器是否支持（使用 `@supports` 检测）。
- [ ] 检查是否有 `@supports` 回退方案。

### C.6 性能问题

- [ ] 检查背景层数（建议 ≤ 4 层）。
- [ ] 检查背景图大小（建议 ≤ 200KB）。
- [ ] 检查是否使用了懒加载。
- [ ] 检查 `background-attachment: fixed` 是否在移动端使用（建议替换）。
- [ ] 检查是否使用了 WebP/AVIF 格式。

### C.7 可访问性检查

- [ ] 检查背景上文字的对比度（WCAG AA 4.5:1）。
- [ ] 检查 `background-clip: text` 是否有回退。
- [ ] 检查高对比度模式下的回退（`@media (forced-colors: active)`）。
- [ ] 检查打印样式（`@media print`）。
- [ ] 检查屏幕阅读器是否能正确读取文字内容。

---

> **结语**：CSS 背景系统是 Web 视觉设计的基础设施。从 CSS 1 的单背景到 CSS Backgrounds Level 4 的 `background-clip: text` 标准化，背景系统经历了近 30 年的演进。理解其层级模型、绘制算法、定位机制与性能特性，是构建高质量 Web 体验的关键。在实践中，应遵循「设计令牌化、响应式优先、可访问性保障、性能预算」四大原则，将 CSS 背景系统作为设计系统的核心组成部分。
## 附录 D：背景属性速查

### D.1 background-color 背景颜色

**基本写法：纯色背景**
`background-color: <颜色>;`
```css
/* 设置纯色背景 */
.box {
  background-color: #007bff;
}
```

---

**基本写法：透明背景**
`background-color: transparent;`
```css
/* 设置透明背景 */
.box {
  background-color: transparent;
}
```

---

**基本写法：rgba 半透明**
`background-color: rgba(<红>, <绿>, <蓝>, <透明度>);`
```css
/* 设置半透明背景 */
.overlay {
  background-color: rgba(0, 0, 0, 0.5);
}
```

---

**基本写法：hsl 颜色**
`background-color: hsl(<色相>, <饱和度>, <亮度>);`
```css
/* 使用 HSL 设置背景 */
.box {
  background-color: hsl(210, 100%, 50%);
}
```

---

## background-image 背景图片

**基本写法：url 背景图片**
`background-image: url("<路径>");`
```css
/* 设置背景图片 */
.hero {
  background-image: url("hero.jpg");
}
```

---

**基本写法：渐变背景**
`background-image: linear-gradient(<方向>, <颜色1>, <颜色2>);`
```css
/* 设置渐变背景 */
.header {
  background-image: linear-gradient(135deg, #007bff, #0056b3);
}
```

---

**单行写法：多重背景**
`background-image: <背景1>, <背景2>;`
```css
/* 单行设置多重背景 */
.box {
  background-image: url("overlay.png"), linear-gradient(135deg, #007bff, #0056b3);
}
```

---

**换行写法：多重背景**
`background-image: <背景1>, <背景2>, <背景3>;`
```css
/* 换行设置多重背景 */
.box {
  background-image:
    url("top-layer.png"),
    url("middle-layer.png"),
    linear-gradient(135deg, #007bff, #0056b3);
}
```

---

## background-repeat 重复

**基本写法：no-repeat 不重复**
`background-repeat: no-repeat;`
```css
/* 背景图片不重复 */
.hero {
  background-repeat: no-repeat;
}
```

---

**基本写法：repeat 重复**
`background-repeat: repeat;`
```css
/* 背景图片重复 */
.pattern {
  background-repeat: repeat;
}
```

---

**基本写法：repeat-x 水平重复**
`background-repeat: repeat-x;`
```css
/* 水平方向重复 */
.strip {
  background-repeat: repeat-x;
}
```

---

**基本写法：repeat-y 垂直重复**
`background-repeat: repeat-y;`
```css
/* 垂直方向重复 */
.strip {
  background-repeat: repeat-y;
}
```

---

**基本写法：round 适应重复**
`background-repeat: round;`
```css
/* 图片缩放适应重复 */
.pattern {
  background-repeat: round;
}
```

---

**基本写法：space 间隔重复**
`background-repeat: space;`
```css
/* 图片不裁剪间隔重复 */
.pattern {
  background-repeat: space;
}
```

---

## background-size 尺寸

**基本写法：cover 覆盖**
`background-size: cover;`
```css
/* 背景图片覆盖整个容器 */
.hero {
  background-size: cover;
}
```

---

**基本写法：contain 包含**
`background-size: contain;`
```css
/* 背景图片完整显示 */
.logo {
  background-size: contain;
}
```

---

**基本写法：固定尺寸**
`background-size: <宽度> <高度>;`
```css
/* 设置固定尺寸 */
.box {
  background-size: 100px 100px;
}
```

---

**基本写法：百分比尺寸**
`background-size: <百分比>;`
```css
/* 设置百分比尺寸 */
.box {
  background-size: 50% 50%;
}
```

---

## background-position 位置

**基本写法：关键字定位**
`background-position: <水平> <垂直>;`
```css
/* 使用关键字定位 */
.hero {
  background-position: center center;
}
```

---

**基本写法：百分比定位**
`background-position: <水平> <垂直>;`
```css
/* 使用百分比定位 */
.hero {
  background-position: 50% 50%;
}
```

---

**基本写法：像素定位**
`background-position: <x> <y>;`
```css
/* 使用像素定位 */
.sprite {
  background-position: -20px -40px;
}
```

---

**基本写法：top left 左上**
`background-position: top left;`
```css
/* 左上角定位 */
.box {
  background-position: top left;
}
```

---

**基本写法：center 居中**
`background-position: center;`
```css
/* 居中定位 */
.box {
  background-position: center;
}
```

---

## background-attachment 附件

**基本写法：scroll 滚动**
`background-attachment: scroll;`
```css
/* 背景随页面滚动 */
.box {
  background-attachment: scroll;
}
```

---

**基本写法：fixed 固定**
`background-attachment: fixed;`
```css
/* 背景固定不滚动 */
.hero {
  background-attachment: fixed;
}
```

---

**基本写法：local 局部滚动**
`background-attachment: local;`
```css
/* 背景随元素内容滚动 */
.scroll-box {
  background-attachment: local;
}
```

---

## background-origin 起点

**基本写法：padding-box 内边距起点**
`background-origin: padding-box;`
```css
/* 背景从 padding 区域开始 */
.box {
  background-origin: padding-box;
}
```

---

**基本写法：border-box 边框起点**
`background-origin: border-box;`
```css
/* 背景从 border 区域开始 */
.box {
  background-origin: border-box;
}
```

---

**基本写法：content-box 内容起点**
`background-origin: content-box;`
```css
/* 背景从 content 区域开始 */
.box {
  background-origin: content-box;
}
```

---

## background-clip 裁剪

**基本写法：border-box 边框裁剪**
`background-clip: border-box;`
```css
/* 背景裁剪到边框区域 */
.box {
  background-clip: border-box;
}
```

---

**基本写法：padding-box 内边距裁剪**
`background-clip: padding-box;`
```css
/* 背景裁剪到内边距区域 */
.box {
  background-clip: padding-box;
}
```

---

**基本写法：content-box 内容裁剪**
`background-clip: content-box;`
```css
/* 背景裁剪到内容区域 */
.box {
  background-clip: content-box;
}
```

---

**基本写法：text 文字裁剪**
`background-clip: text;`
```css
/* 背景裁剪为文字形状 */
.gradient-text {
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}
```

---

## background 简写

**基本写法：background 简写**
`background: <颜色> url("<路径>") <重复> <位置>/<尺寸> <附件>;`
```css
/* 同时设置多个背景属性 */
.hero {
  background: #007bff url("hero.jpg") no-repeat center/cover fixed;
}
```

---

**单行写法：多重背景简写**
`background: <背景1>, <背景2>;`
```css
/* 单行设置多重背景 */
.box {
  background: url("top.png") no-repeat top left, url("bottom.png") no-repeat bottom right;
}
```

---

**换行写法：多重背景简写**
`background: <背景1>, <背景2>, <背景3>;`
```css
/* 换行设置多重背景 */
.box {
  background:
    url("top.png") no-repeat top left,
    url("middle.png") no-repeat center,
    url("bottom.png") no-repeat bottom right;
}
```

---

## 多重背景

**基本写法：多重背景图片**
`background-image: url("<图片1>"), url("<图片2>");`
```css
/* 多重背景图片叠加 */
.box {
  background-image: url("overlay.png"), url("base.jpg");
}
```

---

**基本写法：多重背景位置**
`background-position: <位置1>, <位置2>;`
```css
/* 分别设置多重背景位置 */
.box {
  background-position: top left, bottom right;
}
```

---

**基本写法：多重背景尺寸**
`background-size: <尺寸1>, <尺寸2>;`
```css
/* 分别设置多重背景尺寸 */
.box {
  background-size: 50% 50%, cover;
}
```

---

**基本写法：多重背景重复**
`background-repeat: <重复1>, <重复2>;`
```css
/* 分别设置多重背景重复方式 */
.box {
  background-repeat: no-repeat, repeat;
}
```

---

## background-blend-mode 混合

**基本写法：multiply 正片叠底**
`background-blend-mode: multiply;`
```css
/* 背景混合模式 */
.box {
  background-image: url("texture.png"), linear-gradient(red, blue);
  background-blend-mode: multiply;
}
```

---

**基本写法：screen 滤色**
`background-blend-mode: screen;`
```css
/* 滤色混合模式 */
.box {
  background-blend-mode: screen;
}
```

---

**基本写法：overlay 叠加**
`background-blend-mode: overlay;`
```css
/* 叠加混合模式 */
.box {
  background-blend-mode: overlay;
}
```

---

**基本写法：mix-blend-mode 元素混合**
`mix-blend-mode: <模式>;`
```css
/* 元素与背景混合 */
.text {
  mix-blend-mode: difference;
}
```

---

**讲解：**

- `background-blend-mode` 混合“背景图层之间”（图片与渐变、多张背景图之间）；
- `mix-blend-mode` 混合“元素与其下层内容”（文字与背景图叠加产生差异效果）；
- 常用模式：`multiply` 正片叠底（纹理压暗）、`screen` 滤色（提亮）、`difference` 差异（反相）；
- 混合模式只影响视觉，不改变元素本身；大面积混合有性能开销。


## 背景渐变

**基本写法：线性渐变**
`background: linear-gradient(<方向>, <颜色1>, <颜色2>);`
```css
/* 线性渐变背景 */
.header {
  background: linear-gradient(135deg, #007bff, #0056b3);
}
```

---

**基本写法：多色线性渐变**
`background: linear-gradient(<方向>, <颜色1>, <颜色2>, <颜色3>);`
```css
/* 多色线性渐变 */
.rainbow {
  background: linear-gradient(90deg, red, yellow, green);
}
```

---

**基本写法：径向渐变**
`background: radial-gradient(<形状>, <颜色1>, <颜色2>);`
```css
/* 径向渐变背景 */
.radial {
  background: radial-gradient(circle, #007bff, #0056b3);
}
```

---

**基本写法：圆锥渐变**
`background: conic-gradient(<颜色1>, <颜色2>, <颜色1>);`
```css
/* 圆锥渐变背景 */
.conic {
  background: conic-gradient(red, yellow, green, red);
}
```

---

**基本写法：重复线性渐变**
`background: repeating-linear-gradient(<方向>, <颜色1>, <颜色2> <宽度>);`
```css
/* 重复线性渐变 */
.stripes {
  background: repeating-linear-gradient(45deg, #007bff, #007bff 10px, #0056b3 10px, #0056b3 20px);
}
```

---

## 背景遮罩

**基本写法：mask 遮罩图片**
`mask-image: url("<遮罩>");`
```css
/* 使用图片作为遮罩 */
.box {
  mask-image: url("mask.png");
  -webkit-mask-image: url("mask.png");
}
```

---

**基本写法：mask 渐变遮罩**
`mask-image: linear-gradient(<方向>, <颜色1>, <颜色2>);`
```css
/* 使用渐变作为遮罩 */
.fade {
  mask-image: linear-gradient(to bottom, black, transparent);
  -webkit-mask-image: linear-gradient(to bottom, black, transparent);
}
```

---

**基本写法：mask-size 遮罩尺寸**
`mask-size: cover;`
```css
/* 遮罩尺寸覆盖 */
.box {
  mask-size: cover;
  -webkit-mask-size: cover;
}
```

---

**基本写法：mask-repeat 遮罩重复**
`mask-repeat: no-repeat;`
```css
/* 遮罩不重复 */
.box {
  mask-repeat: no-repeat;
  -webkit-mask-repeat: no-repeat;
}
```

---

## 背景滤镜

**基本写法：backdrop-filter 模糊**
`backdrop-filter: blur(<值>);`
```css
/* 背景模糊效果 */
.glass {
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
```

---

**基本写法：backdrop-filter 亮度**
`backdrop-filter: brightness(<值>);`
```css
/* 背景亮度调整 */
.glass {
  backdrop-filter: brightness(1.2);
}
```

---

**基本写法：backdrop-filter 饱和度**
`backdrop-filter: saturate(<值>);`
```css
/* 背景饱和度调整 */
.glass {
  backdrop-filter: saturate(1.5);
}
```

---

**单行写法：多重 backdrop-filter**
`backdrop-filter: <滤镜1> <滤镜2>;`
```css
/* 单行组合多个背景滤镜 */
.glass {
  backdrop-filter: blur(10px) brightness(1.1) saturate(1.2);
}
```

---

**换行写法：多重 backdrop-filter**
`backdrop-filter: <滤镜1> <滤镜2> <滤镜3>;`
```css
/* 换行组合多个背景滤镜 */
.glass {
  backdrop-filter:
    blur(10px)
    brightness(1.1)
    saturate(1.2);
}
```

---

## CSS 背景新特性

**基本写法：background-clip 多值裁剪**
`background-clip: border-box|padding-box|content-box|text;`
```css
/* 控制背景绘制范围 */
.box {
  /* 背景延伸到边框外缘 */
  background-clip: border-box;
}
.text-gradient {
  /* 背景被裁剪为文字形状 */
  background: linear-gradient(90deg, #007bff, #00d4ff);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}
```

---

**基本写法：多重背景与 mix-blend-mode**
`background-image: <层1>, <层2>; mix-blend-mode: <模式>;`
```css
/* 多重背景叠加混合模式 */
.hero {
  background-image:
    linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)),
    url("hero.jpg");
  background-size: cover;
}
.overlay {
  mix-blend-mode: multiply;
  background: linear-gradient(red, blue);
}
```

---

**基本写法：backdrop-filter 背景滤镜**
`backdrop-filter: <滤镜函数>;`
```css
/* 毛玻璃效果:对元素背后内容应用滤镜 */
.glass {
  background-color: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.3);
}
```

---

**基本写法：scroll-driven animations view-timeline**
`animation-timeline: view();`
```css
/* 滚动驱动动画:元素进出视口触发 */
@keyframes reveal {
  from { opacity: 0; transform: translateY(50px); }
  to { opacity: 1; transform: translateY(0); }
}
.card {
  animation: reveal linear;
  animation-timeline: view();
  animation-range: entry 0% cover 30%;
}
```
