---
order: 104
title: 响应式图片
module: css
category: 'dev-lang'
difficulty: intermediate
description: HTML响应式图片详解：srcset、sizes、picture元素与艺术指导策略。
author: fanquanpp
updated: '2026-06-14'
related:
  - css/CSS性能优化详解
  - css/HTML语义化与SEO优化
  - 'css/项目示例-响应式个人主页'
prerequisites:
  - css/概述与基本语法
---

## 1. 响应式图片问题

### 1.1 核心挑战

- **分辨率适配**：1x/2x/3x 屏幕需要不同分辨率图片
- **视口适配**：不同视口宽度需要不同尺寸图片
- **艺术指导**：不同屏幕可能需要不同裁切/构图
- **格式适配**：WebP/AVIF 等现代格式需要降级方案

### 1.2 带宽浪费

```
移动端加载 2000px 宽的图片:
  - 下载 500KB 数据
  - 浏览器缩放到 375px 显示
  - 浪费 ~400KB 带宽

使用响应式图片:
  - 下载 375px 宽的图片
  - 仅需 ~50KB 数据
  - 节省 90% 带宽
```

## 2. srcset 属性

### 2.1 分辨率描述符

```html
<img src="photo.jpg" srcset="photo-1x.jpg 1x, photo-2x.jpg 2x, photo-3x.jpg 3x" alt="描述" />
```

浏览器根据设备像素比（DPR）选择最合适的图片：

| 设备          | DPR | 选择的图片     |
| ------------- | --- | -------------- |
| 普通显示器    | 1x  | `photo-1x.jpg` |
| Retina 显示器 | 2x  | `photo-2x.jpg` |
| 高端手机      | 3x  | `photo-3x.jpg` |

### 2.2 宽度描述符

```html
<img
  src="photo-800.jpg"
  srcset="photo-400.jpg 400w, photo-800.jpg 800w, photo-1200.jpg 1200w, photo-1600.jpg 1600w"
  alt="描述"
/>
```

`400w` 表示图片实际宽度为 400 像素。浏览器根据视口宽度和 DPR 计算需要的图片尺寸。

## 3. sizes 属性

### 3.1 基本用法

`sizes` 告诉浏览器图片在页面中的显示尺寸，帮助浏览器在解析 HTML 阶段就选择合适的图片：

```html
<img
  src="photo-800.jpg"
  srcset="photo-400.jpg 400w, photo-800.jpg 800w, photo-1200.jpg 1200w"
  sizes="(max-width: 600px) 100vw,
            (max-width: 1200px) 50vw,
            33vw"
  alt="描述"
/>
```

解析逻辑：

- 视口 ≤ 600px：图片占 100% 视口宽度
- 视口 601-1200px：图片占 50% 视口宽度
- 视口 > 1200px：图片占 33% 视口宽度

### 3.2 sizes 计算示例

```
视口宽度: 900px
sizes 匹配: 50vw → 图片显示宽度 = 450px
DPR: 2x
需要图片宽度: 450 × 2 = 900px
选择: photo-800.jpg（最接近且不小于 900px 的选项）
```

### 3.3 常见 sizes 模式

```html
<!-- 全宽图片 -->
sizes="100vw"

<!-- 两列布局 -->
sizes="(max-width: 768px) 100vw, 50vw"

<!-- 三列网格 -->
sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"

<!-- 侧边栏 + 主内容 -->
sizes="(max-width: 768px) 100vw, calc(100vw - 300px)"
```

## 4. picture 元素

### 4.1 艺术指导

```html
<picture>
  <!-- 宽屏：横向构图 -->
  <source media="(min-width: 1024px)" srcset="photo-wide-1x.jpg 1x, photo-wide-2x.jpg 2x" />
  <!-- 平板：方形构图 -->
  <source media="(min-width: 640px)" srcset="photo-square-1x.jpg 1x, photo-square-2x.jpg 2x" />
  <!-- 手机：竖向构图 + 裁切 -->
  <img
    src="photo-portrait.jpg"
    srcset="photo-portrait-1x.jpg 1x, photo-portrait-2x.jpg 2x"
    alt="描述"
  />
</picture>
```

### 4.2 格式降级

```html
<picture>
  <source type="image/avif" srcset="photo.avif" />
  <source type="image/webp" srcset="photo.webp" />
  <img src="photo.jpg" alt="描述" />
</picture>
```

浏览器按 `<source>` 顺序检查，选择第一个支持的格式。

### 4.3 格式 + 尺寸组合

```html
<picture>
  <source
    type="image/avif"
    srcset="photo-400.avif 400w, photo-800.avif 800w, photo-1200.avif 1200w"
    sizes="(max-width: 768px) 100vw, 50vw"
  />
  <source
    type="image/webp"
    srcset="photo-400.webp 400w, photo-800.webp 800w, photo-1200.webp 1200w"
    sizes="(max-width: 768px) 100vw, 50vw"
  />
  <img
    src="photo-800.jpg"
    srcset="photo-400.jpg 400w, photo-800.jpg 800w, photo-1200.jpg 1200w"
    sizes="(max-width: 768px) 100vw, 50vw"
    alt="描述"
  />
</picture>
```

## 5. 图片优化策略

### 5.1 尺寸断点设计

```
常见断点:
  320px  → 小手机
  640px  → 大手机
  768px  → 平板竖屏
  1024px → 平板横屏 / 小笔记本
  1280px → 桌面
  1920px → 大屏

图片宽度建议:
  320w, 640w, 960w, 1280w, 1920w
```

### 5.2 懒加载

```html
<img
  src="photo.jpg"
  srcset="photo-400.jpg 400w, photo-800.jpg 800w"
  sizes="100vw"
  loading="lazy"
  decoding="async"
  alt="描述"
/>
```

| 属性                   | 说明                          |
| ---------------------- | ----------------------------- |
| `loading="lazy"`       | 视口外图片延迟加载            |
| `decoding="async"`     | 异步解码，不阻塞渲染          |
| `fetchpriority="high"` | 高优先级加载（首屏 LCP 图片） |

### 5.3 首屏图片优化

```html
<!-- LCP 图片：预加载 + 高优先级 -->
<link
  rel="preload"
  as="image"
  href="hero-800.webp"
  imagesrcset="hero-400.webp 400w, hero-800.webp 800w, hero-1200.webp 1200w"
  imagesizes="100vw"
  fetchpriority="high"
/>

<img
  src="hero-800.webp"
  srcset="hero-400.webp 400w, hero-800.webp 800w, hero-1200.webp 1200w"
  sizes="100vw"
  fetchpriority="high"
  alt="Hero 图片"
/>
```

### 5.4 防止布局偏移（CLS）

```html
<!-- 方式一：设置宽高属性 -->
<img src="photo.jpg" width="800" height="600" alt="描述" />

<!-- 方式二：CSS aspect-ratio -->
<img src="photo.jpg" style="aspect-ratio: 4/3; width: 100%;" alt="描述" />
```

## 6. 工具与自动化

### 5.1 图片生成

```bash
# 使用 sharp 生成多尺寸图片
npx sharp-cli -i photo.jpg -o photo-400.jpg resize 400
npx sharp-cli -i photo.jpg -o photo-800.jpg resize 800
npx sharp-cli -i photo.jpg -o photo-1200.jpg resize 1200

# 批量转换格式
npx sharp-cli -i "*.jpg" -o "./output/" format webp
```

### 5.2 构建工具集成

```javascript
// Vite + vite-plugin-imagetools
import { defineConfig } from 'vite';
import imagetools from 'vite-imagetools';

export default defineConfig({
  plugins: [imagetools()],
});
```

使用：

```html
<img
  src="/photo.jpg?format=webp&width=400;800;1200"
  srcset="/photo.jpg?width=400 400w, /photo.jpg?width=800 800w, /photo.jpg?width=1200 1200w"
  sizes="100vw"
  alt="描述"
/>
```
