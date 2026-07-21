---
order: 102
title: CSS性能优化详解
module: css
category: 'dev-lang'
difficulty: advanced
description: CSS性能优化深度指南：关键CSS内联、异步加载、选择器优化、渲染性能提升。
author: fanquanpp
updated: '2026-06-14'
related:
  - css/理论知识点
  - css/CSS新特性
  - css/HTML语义化与SEO优化
  - css/响应式图片
prerequisites:
  - css/概述与基本语法
---

## 1. 关键渲染路径与 CSS

### 1.1 CSS 阻塞渲染

CSS 是渲染阻塞资源，浏览器必须下载并解析所有 CSS 后才能绘制页面：

```
HTML 解析 → 发现 CSS → 下载 CSS → 解析 CSS → 构建 CSSOM → 合并渲染树 → 布局 → 绘制
```

CSSOM 构建时间公式：

$$T_{render} = T_{download} + T_{parse} + T_{CSSOM}$$

### 1.2 优化目标

- 减少 CSS 文件体积
- 减少 CSS 阻塞时间
- 优先加载首屏关键 CSS
- 延迟加载非关键 CSS

## 2. 关键 CSS 内联

### 2.1 原理

将首屏可见内容所需的 CSS（Critical CSS）直接内联到 HTML `<head>` 中，消除额外的网络请求。

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      /* 关键 CSS — 首屏渲染所需 */
      body {
        margin: 0;
        font-family: system-ui;
      }
      .header {
        background: #007bff;
        color: white;
        padding: 16px;
      }
      .hero {
        min-height: 60vh;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .hero__title {
        font-size: 48px;
        font-weight: 700;
      }
    </style>
    <!-- 非关键 CSS 异步加载 -->
    <link
      rel="preload"
      href="/styles/non-critical.css"
      as="style"
      onload="this.onload=null;this.rel='stylesheet'"
    />
    <noscript><link rel="stylesheet" href="/styles/non-critical.css" /></noscript>
  </head>
</html>
```

### 2.2 提取关键 CSS 的工具

```bash
# Critical
npx critical src/index.html --base dist/ --inline true

# Penthouse
npx penthouse https://example.com > critical.css

# Critters（Webpack 插件）
# critters-webpack-plugin 自动内联关键 CSS
```

### 2.3 内联大小控制

```
推荐关键 CSS 大小: < 14 KB（TCP 初始拥塞窗口）
超过 14 KB: 需要额外 RTT，反而降低性能
```

## 3. 异步加载 CSS

### 3.1 preload + onload 模式

```html
<link
  rel="preload"
  href="/styles/main.css"
  as="style"
  onload="this.onload=null;this.rel='stylesheet'"
/>
<noscript><link rel="stylesheet" href="/styles/main.css" /></noscript>
```

### 3.2 media 属性条件加载

```html
<!-- 仅在打印时加载 -->
<link rel="stylesheet" href="/styles/print.css" media="print" />

<!-- 仅在宽屏时加载 -->
<link rel="stylesheet" href="/styles/wide.css" media="(min-width: 1024px)" />

<!-- 仅在暗色模式时加载 -->
<link rel="stylesheet" href="/styles/dark.css" media="(prefers-color-scheme: dark)" />
```

### 3.3 使用 loadCSS 库

```html
<script>
  /*! loadCSS rel=preload polyfill. [c]2017 Filament Group, Inc. MIT License */
  (function (w) {
    'use strict';
    if (!w.loadCSS) {
      w.loadCSS = function () {};
    }
    var rp = (loadCSS.relpreload = {});
    rp.support = (function () {
      var ret;
      try {
        ret = w.document.createElement('link').relList.supports('preload');
      } catch (e) {
        ret = !1;
      }
      return function () {
        return ret;
      };
    })();
    rp.bindMediaToggle = function (link) {
      var finalMedia = link.media || 'all';
      link.addEventListener('load', function () {
        link.media = finalMedia;
      });
      link.media = 'only x';
    };
    rp.poly = function () {
      if (rp.support()) {
        return;
      }
      var links = w.document.getElementsByTagName('link');
      for (var i = 0; i < links.length; i++) {
        var link = links[i];
        if (
          link.rel === 'preload' &&
          link.getAttribute('as') === 'style' &&
          !link.getAttribute('data-loadcss')
        ) {
          link.setAttribute('data-loadcss', true);
          rp.bindMediaToggle(link);
        }
      }
    };
    if (!rp.support()) {
      rp.poly();
      var run = w.setInterval(rp.poly, 500);
      w.addEventListener('load', function () {
        rp.poly();
        w.clearInterval(run);
      });
    }
    if (typeof exports !== 'undefined') {
      exports.loadCSS = loadCSS;
    } else {
      w.loadCSS = loadCSS;
    }
  })(typeof global !== 'undefined' ? global : this);
</script>
```

## 4. 选择器性能优化

### 4.1 选择器匹配方向

浏览器从**右到左**匹配选择器：

```css
/* 浏览器先找所有 .title，再检查是否在 .card 内 */
.card .title {
  color: #333;
}

/* 更高效：直接匹配 */
.card-title {
  color: #333;
}
```

### 4.2 选择器效率排序

从高到低：

```
1. ID 选择器        #header
2. 类选择器         .card
3. 标签选择器       div
4. 相邻兄弟选择器   h2 + p
5. 子选择器         ul > li
6. 后代选择器       ul li
7. 通配选择器       *
8. 属性选择器       [type="text"]
9. 伪类/伪元素      :hover, ::before
```

### 4.3 优化建议

```css
/* 避免 */
div ul li a span {
  color: red;
}
*:not(:empty) {
  margin: 0;
}

/* 推荐 */
.nav-link-text {
  color: red;
}
```

## 5. 渲染性能优化

### 5.1 触发重排的属性

修改以下属性会触发重排（Layout），代价最高：

```
width, height, margin, padding, border-width,
top, right, bottom, left, position,
display, float, clear, font-size, line-height,
text-align, white-space, overflow
```

### 5.2 触发重绘的属性

修改以下属性只触发重绘（Paint），代价中等：

```
color, background, border-color, border-style,
outline, visibility, box-shadow, text-decoration
```

### 5.3 仅触发合成的属性

修改以下属性只触发合成（Composite），代价最低：

```
transform, opacity, filter
```

### 5.4 will-change 提示

```css
/* 提前告知浏览器哪些属性会变化 */
.card:hover {
  will-change: transform;
}

/* 动画结束后移除 */
.card {
  transition: transform 0.3s;
}

.card:hover {
  transform: scale(1.05);
}
```

> 不要滥用 `will-change`，过多声明会消耗 GPU 内存。

### 5.5 contain 属性

```css
.sidebar {
  contain: layout style paint;
  /* 或使用简写 */
  contain: strict; /* 等于 size layout style paint */
  contain: content; /* 等于 layout style paint */
}
```

| 值            | 说明                         |
| ------------- | ---------------------------- |
| `layout`      | 元素布局不影响外部           |
| `style`       | 计数器、引用不影响外部       |
| `paint`       | 子元素不会绘制到元素边界之外 |
| `size`        | 元素尺寸不依赖子元素         |
| `inline-size` | 行内方向尺寸不依赖子元素     |

### 5.6 content-visibility

```css
.below-fold-section {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px; /* 预估高度 */
}
```

`content-visibility: auto` 让浏览器跳过屏幕外元素的渲染，直到它们即将进入视口。可显著提升长页面初始渲染速度。

## 6. CSS 体积优化

### 6.1 PurgeCSS 移除未使用样式

```javascript
// postcss.config.js
module.exports = {
  plugins: [
    require('@fullhuman/postcss-purgecss')({
      content: ['./src/**/*.html', './src/**/*.vue', './src/**/*.jsx'],
      defaultExtractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],
      safelist: [/^is-/, /^has-/], // 保留动态类名
    }),
  ],
};
```

### 6.2 压缩 CSS

```bash
# 使用 cssnano
npx postcss styles.css -u cssnano -o styles.min.css
```

### 6.3 减少重复

```css
/* 避免 */
.btn-primary {
  background: #007bff;
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
}
.btn-secondary {
  background: #6c757d;
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
}

/* 推荐：提取公共样式 */
.btn {
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
}
.btn-primary {
  background: #007bff;
}
.btn-secondary {
  background: #6c757d;
}
```
