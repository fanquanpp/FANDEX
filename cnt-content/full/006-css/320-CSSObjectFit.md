---
order: 320
title: 对象适配
module: 'css'
category: 前端技术
difficulty: beginner
description: 用「相框与照片」的心智模型讲透 object-fit 五个取值与 object-position 的裁剪逻辑，覆盖头像网格、横幅与视频封面的标准写法，以及与 aspect-ratio 的配合。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'html5/140-ImagesAndResponsiveImages'
  - 'css/050-CSS3BoxModelDetailed'
  - 'css/290-BackgroundEnhancement'
  - 'css/670-ResponsiveImage'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
---

## 前置知识

- [盒模型详解](/css/050-CSS3BoxModelDetailed)：知道 content box 与元素尺寸的关系；
- 图片元素的基本用法：[图片与响应式图片](/html5/140-ImagesAndResponsiveImages)。

## 学习目标

- 用「相框与照片」模型解释替换元素为什么需要 `object-fit`，以及五个取值各自的取舍；
- 会用 `object-position` 控制「裁掉哪边」，解决「头像裁掉人脸」这类最高频的抱怨；
- 掌握「固定尺寸容器 + cover + aspect-ratio 占位」这套图片列表标准组合，并能说出它的布局副作用与解法。

预计 30 到 45 分钟。

## 概念引入：相框是 CSS 的，照片是内容的

先建立一个反直觉的事实：`<img>` 是**替换元素**（replaced element）——标签本身只是一个「相框」，真实内容（那张位图）由外部资源提供。相框的尺寸你可以用 CSS 指定，照片的固有尺寸（如 4000x3000）你管不着。两者不一致时，浏览器必须做决定，默认决定是 `fill`：把照片硬拉到相框尺寸——4:3 的照片塞进 1:1 的框，人被压扁。

`object-fit` 回答的问题就是：**内容在相框里怎么摆**。心智模型一句话：

> 把 img 想成相框、位图想成照片；object-fit 定摆法（拉伸/完整/裁剪），object-position 定裁剪时保留哪一角。

注意它只对**有「内容」的替换元素**生效：`img`、`video`、`canvas` 等；对 `<div>` 这类普通盒子无意义——div 的背景图要走 `background-size`（见[背景增强](/css/290-BackgroundEnhancement)），那是另一套平行 API，概念相同、对象不同。

## 五个取值的取舍

```css
.demo {
  width: 400px;
  height: 300px;
}
.demo.fill   { object-fit: fill; }         /* 默认：拉伸到相框，可能变形 */
.demo.contain{ object-fit: contain; }       /* 等比缩到完整放下，多余处留白 */
.demo.cover  { object-fit: cover; }         /* 等比放大到铺满，超出部分裁掉 */
.demo.none   { object-fit: none; }          /* 原始尺寸摆放，超出裁掉，不缩放 */
.demo.down   { object-fit: scale-down; }    /* none 与 contain 中取「更小」的结果 */
```

记忆主线：`fill` 保相框牺牲照片（变形）；`contain` 保照片牺牲相框（留白）；`cover` 折中——照片完整等比、相框完整铺满，代价是**裁剪**。前两者是「视觉优先」和「信息完整优先」，`cover` 则是几乎所有图片列表的默认选择，因为留白和变形都比「裁一点」更难看。

`none` 与 `scale-down` 使用频率低：`none` 用于「图片本来就刚好是相框尺寸、不信任外部布局」的场景；`scale-down` 是「图小就按原样、图大才等比缩」的保险值，常用于用户上传内容预览。

## object-position：裁剪的刀从哪下

`cover` 默认居中裁剪，人像照片的脸常在上方三分之一处，居中一裁就没——`object-position` 指定保留的锚点：

```css
.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  object-position: 50% 20%;  /* 横向居中、纵向偏上：保住头部 */
}
```

取值语法与 `background-position` 完全一致：一两个关键词（`top`、`center`）或百分比、长度。它同样作用于 `contain` 的留白位置与 `none` 的摆放位置。

## 标准组合：图片网格的完整写法

真实项目里单用 `object-fit` 会踩一个布局坑：**图片加载前没有高度**，网格先塌后跳（CLS）。标准组合是固定长宽比 + 占位：

```html
<figure class="thumb">
  <img src="photo.jpg" alt="缩略图" width="800" height="600" loading="lazy">
</figure>
```

```css
.thumb {
  aspect-ratio: 4 / 3;       /* 相框比例恒定，加载前后不跳动 */
  overflow: hidden;          /* cover 裁剪本就在框内，这里兜住圆角 */
  border-radius: 8px;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

三层配合：`aspect-ratio` 给相框定形（加载前也不塌）、HTML 的 `width`/`height` 属性让浏览器在图片到达前就算出比例、`object-fit: cover` 负责内容摆位。`loading="lazy"` 负责流量，与适配无关但同一张清单要一起写。

视频同理：`<video>` 预览封面套同样的组合，避免源视频比例与播放器比例不一致导致的黑边或拉伸。

## 常见坑与调试实录

**坑 1：写了 object-fit 却「没效果」。** 九成是因为 img 没有明确的相框尺寸——只设 `width: 100%`（高度自适应内容）时，相框比例恰好等于照片比例，`fill` 都不会变形，`cover` 自然无事可做。先确认相框有独立于内容的尺寸（height 或 aspect-ratio）。

**坑 2：在 `<div>` 上写 object-fit。** 无效属性。div 的图走 `background-size: cover` + `background-position`，两套 API 不要张冠李戴。

**坑 3：contain 的留白处露出底色。** 留白区域是透明的，露出的是 img 元素背景。需要「留白也是白色」时给 img 自身设 `background-color`，而不是让整个版面穿帮。

**坑 4：以为 object-fit 能解决性能。** 它只是显示层的裁剪，浏览器仍然下载全尺寸原图。流量优化靠 `srcset`/`sizes` 与压缩（[响应式图片](/css/670-ResponsiveImage)），两者是互补不是替代。

## 与之前和之后的知识的关系

- 之前：[盒模型详解](/css/050-CSS3BoxModelDetailed) 决定相框尺寸怎么算；[圆角](/css/280-BorderRadius) 与头像组合出圆形裁剪；
- 并行：[背景增强](/css/290-BackgroundEnhancement) 是同一思想在 background 上的平行 API；[响应式图片](/css/670-ResponsiveImage) 解决「下载哪张图」，本篇解决「显示时怎么摆」；
- 之后：图片网格与画廊项目（[项目实战](/css/680-CSSProjectExampleResponsiveHomepage)）里这套组合是基本单元。

## 自我检查

- 能对 `fill/contain/cover/none/scale-down` 各用一句话说出「牺牲了什么」；
- 知道 `object-fit` 只作用于替换元素，div 背景图走 background-size；
- 能说出图片网格防 CLS 的三层配合各负责什么。

## 小练习

### 练习 1：五值对照（预测题）

任务：找一张 4:3 的照片，放入 1:1 的相框（300x300），依次设五个 object-fit。每个都先写下预测（照片会变形吗？留白在哪？裁哪边？），再逐一验证。

提示：`none` 不缩放，4:3 的原尺寸图放进 1:1 框会怎样？

参考现象（先预测再看）：`fill` 变形；`contain` 左右留白；`cover` 上下裁掉；`none` 超出右侧与底部裁掉；`scale-down` 图若原尺寸小于相框则完整按原样显示。

### 练习 2：裁掉人脸的修复（修 Bug 题）

任务：下面的头像代码把用户头顶裁掉了。给出最小修改并解释为什么默认居中会这样：

```css
.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
}
```

提示：想想构图重心在照片的哪个位置。

参考实现：

```css
.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  object-position: 50% 20%;  /* 纵向锚点上移，保留头部 */
}
```

默认 `object-position` 是 `50% 50%`（正中裁剪），而人像的重心通常在上方，所以居中裁会把头顶裁掉。

### 练习 3：不跳动的画廊（挑战题）

任务：实现一个三列图片网格：任意比例的图片整齐展示为 1:1 缩略格；图片加载前后网格高度不变；hover 时图片放大 1.05 但不溢出格子。写出完整 HTML + CSS。

提示：三件套——aspect-ratio 定格、object-fit 摆内容、overflow + transform 控制放大边界。

参考实现：

```html
<ul class="gallery">
  <li><img src="a.jpg" width="1200" height="800" alt="图 A"></li>
  <li><img src="b.jpg" width="800" height="1200" alt="图 B"></li>
  <li><img src="c.jpg" width="1000" height="1000" alt="图 C"></li>
</ul>
```

```css
.gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  list-style: none;
  padding: 0;
}
.gallery li {
  aspect-ratio: 1;          /* 相框比例恒定，加载前不塌 */
  overflow: hidden;
  border-radius: 8px;
}
.gallery img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}
.gallery li:hover img {
  transform: scale(1.05);   /* 溢出部分被 li 的 overflow 裁住 */
}
```

## 下一步

- [背景增强](/css/290-BackgroundEnhancement)：background-size/position 的平行世界与适用差异；
- [响应式图片](/css/670-ResponsiveImage)：srcset 与 sizes，流量侧的另一半；
- [圆角](/css/280-BorderRadius)：与 object-fit 组合出圆形、胶囊形头像。
