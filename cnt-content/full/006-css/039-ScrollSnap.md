---
order: 390
title: 滚动捕捉
module: 'css'
category: 前端技术
difficulty: intermediate
description: scroll-snap
author: fanquanpp
updated: '2026-08-30'
related:
  - 'css/040-CascadeLayer'
  - 'css/037-LogicalProperty'
  - 'css/055-Sass'
  - 'css/056-LessStylus'
prerequisites:
  - 'css/002-CSS3OverviewBasicSyntax'
---


## 1. scroll-snap 概述

CSS 滚动捕捉允许创建类似轮播图的滚动效果，滚动停止时自动对齐到指定位置。

## 2. 容器属性

```css
.scroll-container {
  scroll-snap-type: x mandatory; /* 方向 + 严格度 */
  overflow-x: auto;
}
```

### scroll-snap-type

| 方向   | 说明     |
| ------ | -------- |
| `x`    | 水平捕捉 |
| `y`    | 垂直捕捉 |
| `both` | 双向捕捉 |

| 严格度      | 说明               |
| ----------- | ------------------ |
| `mandatory` | 必须捕捉（强对齐） |
| `proximity` | 接近时捕捉（默认） |

## 3. 子元素属性

```css
.scroll-item {
  scroll-snap-align: start; /* 对齐方式 */
  scroll-snap-stop: always; /* 停止行为 */
}
```

### scroll-snap-align

| 值       | 说明         |
| -------- | ------------ |
| `start`  | 对齐容器起始 |
| `center` | 对齐容器中心 |
| `end`    | 对齐容器结束 |

### scroll-snap-stop

| 值       | 说明             |
| -------- | ---------------- |
| `normal` | 可以跳过（默认） |
| `always` | 必须停止         |

## 4. 实战：轮播图

```css
.carousel {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding: 0 20px;
}

.carousel-item {
  flex: 0 0 100%;
  scroll-snap-align: center;
}
```

## 5. 实战：全屏滚动

```css
.fullpage {
  height: 100vh;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
}

.fullpage-section {
  height: 100vh;
  scroll-snap-align: start;
}
```

## 6. scroll-margin 和 scroll-padding

```css
/* 捕捉偏移 */
.snap-item {
  scroll-margin: 80px;
} /* 元素偏移 */
.container {
  scroll-padding: 80px;
} /* 容器偏移 */
```

## 7. scroll-behavior：平滑滚动

```css
html {
  scroll-behavior: smooth;   /* 锚点跳转与 JS scrollTo 变成平滑滚动 */
}
```

**讲解：** `scroll-behavior` 控制“编程式滚动”的动效：`auto` 直接跳转（默认），`smooth` 平滑过渡。它作用于 `a[href="#锚点"]` 跳转、`scrollTo()` 等操作，不影响用户手动拖动滚动条。配合滚动捕捉使用时，平滑滚动会让吸附过程更自然。

```css
/* 尊重系统“减少动态效果”设置 */
@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
}
```

**讲解：** 平滑滚动会让部分用户不适，生产环境建议在 `prefers-reduced-motion` 下关闭，详见 `css/045-AccessibleStyling`。

## 动手试试

1. 做一个横向滚动的图片轮播，`scroll-snap-type: x mandatory` 实现吸附；
2. 用 `scroll-snap-align: center` 让每张图居中停靠；
3. 给容器加 `scroll-padding` 适配固定导航；
4. 进阶挑战：纵向滚动的“整屏翻页”效果。

## 核心知识点

> 一句话记住滚动捕捉：容器 `scroll-snap-type` 定吸附轴，子项 `scroll-snap-align` 定停靠点，`scroll-padding` 避让固定元素。

- `scroll-snap-type: x mandatory`（强制）或 `proximity`（就近）；
- `scroll-snap-align: start/center/end`；
- `scroll-padding` 为吸顶导航留空间；
- `scroll-margin` 作用于子项；
- 适合轮播、图库、分页式滚动。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| mandatory 过强 | 内容读不到 | 长内容用 proximity |
| 子项未撑满 | 吸附不生效 | 子项宽度=容器宽度 |
| 忽略 scroll-padding | 停靠被遮挡 | 加 scroll-padding |
| 与触摸滚动冲突 | 手势异常 | 测试各浏览器行为 |

## 扩展学习

- 滚动行为：`scroll-behavior: smooth`；
- 性能：`css/042-CSSPerformanceOptimizationDetailed`；
- 移动端：`css/052-MobileAdaptation`。
