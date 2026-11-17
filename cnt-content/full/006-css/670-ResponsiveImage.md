---
order: 720
title: 响应式图片
module: 'css'
category: 前端技术
difficulty: intermediate
description: HTML响应式图片详解：srcset、sizes、picture元素与艺术指导策略。
author: fanquanpp
updated: '2026-11-16'
related:
  - 'css/540-CSSPerformanceOptimizationDetailed'
  - 'css/660-HTMLSemanticSEO'
  - 'css/680-CSSProjectExampleResponsiveHomepage'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
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

## 动手试试

1. 用 `srcset` + `sizes` 做响应式图片，用 Network 面板验证不同设备加载的图片；
2. 用 `<picture>` 实现“手机竖图、桌面横图”；
3. 给首屏图加 `preload`，其余加 `lazy`；
4. 进阶挑战：用 `object-fit: cover` 统一缩略图比例。

## 核心知识点

> 一句话记住响应式图片：`srcset` 给候选、`sizes` 说宽度、`picture` 换场景、`lazy` 延迟加载、`alt` 不能少。

- `srcset`：候选图 + `w`/`x` 描述符；
- `sizes`：声明显示宽度，浏览器择优；
- `<picture>` + `<source media>`：按条件换图；
- 格式：AVIF/WebP 体积更小；
- `loading="lazy"` 非首屏；
- 始终提供 `alt`。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 全部 lazy | 首屏变慢 | 首屏 eager |
| 无 sizes | 浏览器猜错 | 显式声明 |
| 格式单一 | 流量浪费 | 多格式 source |
| 缺 alt | 无障碍损失 | 描述性 alt |

## 扩展学习

- 完整教程：`html5/140-ImagesAndResponsiveImages`；
- 对象适配：`css/320-CSSObjectFit`；
- 性能：`javascript/510-CoreWebVitalsAndPerformanceMetrics`。

## 动手实践：遮码自检

先只读任务与提示，遮住第 2-5 节的示例代码自己写，再对照参考实现。

**任务一**：写一张「全站头图」——三档宽度候选（480/1024/1920）、显示宽度随布局变化（最大 1200px、小屏占满）、AVIF 优先 WebP 兜底、非首屏延迟加载、alt 必备。

**任务二**：口答选型——（a）图标想按 DPR 给两倍图，srcset 用 `w` 还是 `x` 描述符；（b）窄屏要裁成竖构图、宽屏用横构图，srcset 做得到吗、该用什么；（c）`loading="lazy"` 用在首屏大图上会发生什么。

**提示**：任务一是「srcset + sizes + picture + lazy」四件套的组合默写（第 2-5 节）；任务二的分界是「同一张图的缩放档位交给 srcset，构图不同的图交给 picture」（第 4 节），`x` 描述符按像素密度、`w` 描述符按宽度档位。

**参考实现**（先自己写完再看）：

```html
<!-- 任务一 -->
<picture>
  <source type="image/avif" srcset="hero-480.avif 480w, hero-1024.avif 1024w, hero-1920.avif 1920w" sizes="(max-width: 600px) 100vw, 1200px" />
  <source type="image/webp" srcset="hero-480.webp 480w, hero-1024.webp 1024w, hero-1920.webp 1920w" sizes="(max-width: 600px) 100vw, 1200px" />
  <img src="hero-1024.jpg" alt="2026 秋季 CSS 体系课封面" loading="lazy" width="1024" height="576" />
</picture>

<!-- 任务二 -->
<!-- (a) x 描述符：hero.jpg 1x, hero@2x.jpg 2x —— DPR 场景无需 sizes -->
<!-- (b) 做不到：srcset 只换「同一张图的缩放档位」，构图变化是不同的图，
        交给 <picture> 的 <source media> -->
<!-- (c) 首屏图 lazy 会让浏览器延后加载 LCP 元素，最大内容绘制时间被拉长——
        首屏图用 eager（默认）+ 必要时 fetchpriority="high" -->
```

验收点：任务一里漏掉 `sizes` 时浏览器按 `srcset` 默认（视口宽度）猜下载档位，桌面端常会过量下载 1920 档；`source` 的 `type` 换成浏览器不支持的格式时自动落到下一个 `source`——兜底链的终点是 `img` 的 `src`。
