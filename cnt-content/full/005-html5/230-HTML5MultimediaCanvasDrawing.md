---
order: 230
title: HTML5 多媒体导览
module: 'html5'
category: 前端技术
difficulty: beginner
description: 音视频、SVG 与 Canvas 三条绘图/媒体路线的总览导引。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'html5/200-AudioVideo'
  - 'html5/210-SVG'
  - 'html5/235-Canvas2DDrawing'
  - 'html5/220-EmbeddedContent'
prerequisites:
  - 'html5/020-HTML5OverviewCoreFeature'
---

## 知识点地图

- **知识类别**：HTML5 多媒体能力总览——网页里"放声音、放视频、画图形"的三条路线。
- **解决什么问题**：初学者面对 audio/video、SVG、Canvas 三组 API 时容易混成一团；本篇只负责建立"三选一"的全局地图，细节都在分篇。
- **什么时候用到**：开始多媒体学习前先读一遍做路线规划；做选型决策时回来查对比表。

## 1. 你在网页上见过它们

- 在 B 站看视频，用的是 `<video>` 标签；
- 在音乐网站听歌，用的是 `<audio>` 标签；
- 网页上的小图标（搜索、购物车），多数是 SVG；
- "你画我猜"在线白板、数据大屏动图，多半是 Canvas。

HTML 不只是"写文字和链接"，它原生具备媒体播放与绘图能力，不需要 Flash 这类插件。

## 2. 三条路线与分工

| 路线 | 核心元素/API | 一句话定位 | 详解篇 |
| --- | --- | --- | --- |
| 音视频 | `<audio>`/`<video>` + `<source>`/`<track>` | 播放现成的媒体文件 | [200-AudioVideo](/html5/200-AudioVideo) |
| SVG | `<svg>` + 形状/路径元素 | 矢量图形：缩放不糊、每个图形是元素 | [210-SVG](/html5/210-SVG) |
| Canvas | `<canvas>` + 2D 上下文 | 位图画布：逐帧重绘、像素级操作 | [235-Canvas2DDrawing](/html5/235-Canvas2DDrawing) |

## 3. 快速选型

**问自己三个问题：**

1. 内容是不是现成的媒体文件（mp3/mp4）？→ 音视频路线（200）；
2. 图形数量少、需要交互或任意缩放（图标、图表、示意图）？→ SVG（210）；
3. 图形数量大、逐帧动画、要像素级处理（游戏、可视化、滤镜）？→ Canvas（235）。

**典型组合：** 图标用 SVG、主视觉动画用 Canvas、讲解视频用 `<video>`，三者共存于同一页面互不冲突。

## 4. 共同的工程要点

- 媒体文件注意格式兼容：视频 MP4 + WebM 双 `<source>` 是基本盘；
- 绘图注意高 DPI：Canvas 用 `devicePixelRatio` 缩放，SVG 天然矢量无此问题；
- 注意可访问性：视频配字幕（`<track>`），Canvas 内容需要替代文本，SVG 图形加 `title`；
- 按需加载：非首屏媒体延迟加载，动画页面不可见时暂停。

## 5. 动手试试（选路线热身）

1. 找一个公开 MP4 地址，用 `<video controls>` 播放（对应 200）；
2. 用 `<svg>` 画一个圆和一行字，试着用 CSS 改颜色（对应 210）;
3. 用 `<canvas>` 画一个矩形并用 rAF 让它动起来（对应 235）。

## 6. 扩展学习

- 播放控制与字幕：[200-AudioVideo](/html5/200-AudioVideo)；
- 矢量绘图与图标实战：[210-SVG](/html5/210-SVG)；
- 位图绘图与动画循环：[235-Canvas2DDrawing](/html5/235-Canvas2DDrawing)；
- 外部内容嵌入（iframe/object）：[220-EmbeddedContent](/html5/220-EmbeddedContent)。
