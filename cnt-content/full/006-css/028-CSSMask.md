---
order: 280
title: CSS 遮罩
module: 'css'
category: 前端技术
difficulty: intermediate
description: mask 系列属性用透明通道裁剪元素显示区域，实现渐变淡出、形状镂空等效果。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'css/027-BackgroundEnhancement'
  - 'css/054-Function'
  - 'css/049-CSSFilters'
prerequisites:
  - 'css/002-CSS3OverviewBasicSyntax'
  - 'css/027-BackgroundEnhancement'
---

## 0. 直觉：遮罩是“用一张图的透明度决定显示哪里”

`background` 决定元素画什么，`mask` 决定元素哪些部分能露出来。遮罩图是黑色/白色/透明通道：完全不透明区域显示，透明区域隐藏，中间灰度产生半透明过渡。最常用的效果是“图片底部渐隐”与“形状镂空”。

## 1. mask-image 与 mask-size

```css
.fade-bottom {
  -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent);
  mask-image: linear-gradient(to bottom, black 60%, transparent);
}
```

**讲解：** 渐变遮罩是最常用写法：黑色区域完全显示，向透明渐变处逐步隐藏，实现“图片到底部淡出”。注意兼容性：许多浏览器仍需要 `-webkit-mask-image` 前缀。

## 2. 用图片做遮罩

```css
.stamp {
  width: 200px;
  height: 200px;
  background: #4f5bd5;
  -webkit-mask-image: url("stamp.svg");
  mask-image: url("stamp.svg");
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
}
```

**讲解：** SVG 遮罩适合“任意形状容器”：元素真实尺寸不变，只是显示区域被裁剪成图形。`mask-size`/`mask-repeat`/`mask-position` 的取值与 `background-size` 完全一致。

## 3. 与 clip-path 的分工

```css
.clip {
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);  /* 菱形裁剪 */
}
```

**讲解：** `clip-path` 用几何形状“硬裁剪”，没有半透明过渡，且裁剪后不参与事件命中（指针事件区域也变小）；`mask` 用图像通道“软裁剪”，支持渐变与半透明，适合“淡出、毛玻璃边缘、贴图质感”。两者都会保留元素的布局占位。

## 4. 完整示例：卡片底部渐隐

```html
<style>
  .card {
    height: 240px;
    background: url("photo.jpg") center/cover;
    -webkit-mask-image: linear-gradient(to bottom, black 55%, transparent 95%);
    mask-image: linear-gradient(to bottom, black 55%, transparent 95%);
  }
</style>
<div class="card"></div>
```

**讲解：** 这是图文卡片“内容渐隐到底部”的标准写法，配合 `mask-mode` 可指定按亮度还是透明度裁剪，进阶可查阅 MDN。

## 5. 动手试试

1. 用线性渐变遮罩实现图片底部淡出；
2. 用 SVG 圆形/星形图片做头像遮罩，对比 `border-radius` 的效果差异；
3. 同一元素叠加 `mask` 与 `clip-path`，观察两者先后作用的视觉效果；
4. 进阶挑战：用 `mask-composite` 做“圆环镂空”效果。

## 6. 核心知识点

> 一句话记住遮罩：mask 用图像的透明/灰度通道决定显示区域，支持渐变软过渡；clip-path 用几何硬裁剪。

- `mask-image` 接受渐变或图片，黑色显示、透明隐藏；
- `mask-size`/`mask-repeat`/`mask-position` 与背景对应属性一致；
- 兼容性：多数浏览器需要 `-webkit-` 前缀；
- `clip-path` 是硬裁剪，`mask` 支持软过渡；
- 两者都不改变元素布局占位；
- 结合渐变函数使用最频繁，见 `css/025-Gradient`。

## 7. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 忘记写 -webkit- 前缀 | 部分浏览器整段失效 | 前缀与标准写法成对书写 |
| 遮罩图未设置 repeat/size | 默认平铺导致效果异常 | 显式设置 `mask-size` 与 `mask-repeat` |
| 需要硬裁剪却用 mask | 性能与语义不匹配 | 几何裁剪用 `clip-path` |
| 遮罩区域需要可点击 | mask 后事件区域仍为原始盒子 | 用 `clip-path` 或调整交互区域 |

## 8. 扩展学习

- 背景体系：`css/027-BackgroundEnhancement`；
- 渐变：`css/025-Gradient`；
- 滤镜组合：`css/049-CSSFilters`；
- 函数与图像处理：`css/054-Function`。
