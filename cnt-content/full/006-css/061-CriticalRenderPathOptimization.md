---
order: 610
title: 关键渲染路径优化
module: 'css'
category: 前端技术
difficulty: advanced
description: 关键CSS内联、异步加载
author: fanquanpp
updated: '2026-08-30'
related:
  - 'css/059-CSSAtomic'
  - 'css/042-CSSNativeNesting'
  - 'css/062-CSSCanvasDrawing'
prerequisites:
  - 'css/002-CSS3OverviewBasicSyntax'
---

> 前置依赖：先读 063 理论知识点与 html5/036 关键渲染路径。

## 1. 关键渲染路径

浏览器渲染流程：DOM → CSSOM → Render Tree → Layout → Paint → Composite

CSS 是渲染阻塞资源，必须优化加载策略。

## 2. 关键 CSS 内联

将首屏关键 CSS 内联到 `<head>` 中，消除渲染阻塞：

```html
<head>
  <style>
    /* 首屏关键 CSS */
    .hero {
      height: 100vh;
      background: #333;
      color: white;
    }
    .nav {
      position: fixed;
      top: 0;
      width: 100%;
    }
  </style>
</head>
```

## 3. 非关键 CSS 异步加载

```html
<!-- 方式1：preload + onload -->
<link rel="preload" href="styles.css" as="style" onload="this.rel='stylesheet'" />

<!-- 方式2：media 切换 -->
<link rel="stylesheet" href="styles.css" media="print" onload="this.media='all'" />

<!-- 方式3：noscript 回退 -->
<noscript><link rel="stylesheet" href="styles.css" /></noscript>
```

## 4. CSS 性能优化清单

| 优化项           | 说明                     |
| ---------------- | ------------------------ |
| 关键 CSS 内联    | 首屏 CSS 内联到 `<head>` |
| 非关键 CSS 异步  | 延迟加载非首屏样式       |
| 压缩 CSS         | 移除空格、注释、冗余     |
| 减少选择器复杂度 | 避免深层嵌套             |
| 避免使用 @import | 串行加载影响性能         |
| 使用 contain     | 限制渲染范围             |
| 使用 will-change | 提示浏览器优化           |
| 减少重排重绘     | 批量 DOM 操作            |

## 5. CSS contain 属性

```css
.widget {
  contain: layout style paint;
  /* 或简写 */
  contain: strict; /* size layout style paint */
  contain: content; /* layout style paint */
}
```

## 6. 性能测量

```bash
# Lighthouse
npx lighthouse https://example.com --view

# Chrome DevTools
# Performance → 录制 → 分析渲染时间
# Coverage → 查看 CSS 使用率
```

## 动手试试

1. 用 Performance 面板录制页面加载，找出阻塞解析的脚本；
2. 把业务脚本改成 `defer`，对比首屏时间；
3. 将首屏关键 CSS 内联，观察 LCP 变化；
4. 进阶挑战：用 `preload` 预加载字体并对比。

## 核心知识点

> 一句话记住渲染路径：HTML 建 DOM、CSS 建 CSSOM、合成渲染树再布局绘制；CSS 阻塞渲染、脚本阻塞解析、图片不阻塞解析。

- 五步：解析 HTML → 构建 CSSOM → 渲染树 → 布局 → 绘制；
- CSS 是渲染阻塞资源，应内联关键样式；
- 普通 `<script>` 阻塞解析，用 `defer`/`async`；
- `preload` 关键资源，`prefetch` 未来资源；
- LCP/CLS 是验证指标。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 脚本阻塞 | 首屏白屏 | defer/async |
| CSS 外链过多 | 渲染延迟 | 关键内联 + 异步加载 |
| 滥用 preload | 带宽挤占 | 只 preload 首屏资源 |
| 大图无尺寸 | CLS | 设置宽高 |

## 扩展学习

- 渲染路径：`html5/038-CriticalRenderingPathAndResourceLoading`；
- 性能：`css/043-CSSPerformanceOptimizationDetailed`；
- 指标：`javascript/051-CoreWebVitalsAndPerformanceMetrics`。
