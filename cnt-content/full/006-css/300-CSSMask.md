---
order: 320
title: CSS 遮罩
module: 'css'
category: 前端技术
difficulty: intermediate
description: mask 系列属性用透明通道裁剪元素显示区域，实现渐变淡出、形状镂空等效果。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'css/290-BackgroundEnhancement'
  - 'css/120-CSSFunctions'
  - 'css/310-CSSFilters'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
  - 'css/290-BackgroundEnhancement'
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

**讲解：** 渐变遮罩是最常用写法：黑色区域完全显示，向透明渐变处逐步隐藏，实现“图片到底部淡出”。兼容性现状：标准写法（不带前缀）自 Chrome 120（2023-12）起已全主流可用，`-webkit-mask-image` 前缀行是给更旧环境的低成本兜底，成对书写即可。

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
- 兼容性：标准写法已全主流可用（Chrome 120 起），`-webkit-` 前缀留作旧环境兜底；
- `clip-path` 是硬裁剪，`mask` 支持软过渡；
- 两者都不改变元素布局占位；
- 结合渐变函数使用最频繁，见 `css/260-Gradient`。

## 7. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 忘记写 -webkit- 前缀 | 部分浏览器整段失效 | 前缀与标准写法成对书写 |
| 遮罩图未设置 repeat/size | 默认平铺导致效果异常 | 显式设置 `mask-size` 与 `mask-repeat` |
| 需要硬裁剪却用 mask | 性能与语义不匹配 | 几何裁剪用 `clip-path` |
| 遮罩区域需要可点击 | mask 后事件区域仍为原始盒子 | 用 `clip-path` 或调整交互区域 |

## 8. 扩展学习

- 背景体系：`css/290-BackgroundEnhancement`；
- 渐变：`css/260-Gradient`；
- 滤镜组合：`css/310-CSSFilters`；
- 函数与图像处理：`css/120-CSSFunctions`。

## 9. 动手实践：遮码自检

先只读任务与提示，遮住第 1-4 节的示例代码自己写，再对照参考实现。

**任务一**：实现「长文预览卡」——卡片高 240px 固定，文字超出部分向下渐隐消失（保留占位、不换行裁切痕迹），并保证遮罩不挡卡片内的按钮点击。

**任务二**：用一张星形 SVG 做「印章徽标」——底色元素被裁成星形显示；回答 mask 与 clip-path 在「半透明边缘」与「点击命中区域」上的两点差异。

**提示**：任务一的遮罩方向是 `to bottom`，色标在「完整显示」与「完全隐藏」之间拉开距离（第 1、4 节）；任务二考 mask 的图像化裁剪（第 2 节）与第 3 节的分工表——mask 软裁剪但命中区域不变，clip-path 硬裁剪且命中区域跟着变小。

**参考实现**（先自己写完再看）：

```css
/* 任务一 */
.preview {
  height: 240px;
  overflow: hidden;
  mask-image: linear-gradient(to bottom, black 60%, transparent 95%);
}

/* 命中区域仍是原始盒子：按钮只要在盒子内就能点，
   即使它正处在渐隐区（视觉变淡）——这是 mask 与 clip-path 的分界 */

/* 任务二 */
.stamp {
  width: 160px;
  height: 160px;
  background: #4f5bd5;
  mask-image: url("star.svg");
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
}

/* 两点差异：
   (1) mask 用灰度/透明通道做软过渡（边缘可半透明），clip-path 是几何硬边；
   (2) clip-path 裁剪后指针事件区域随之缩小，mask 不改变命中区域 */
```

验收点：任务一里把 `mask-image` 换成 `clip-path: inset(0 0 60% 0)` 会把下半段直接切掉且按钮点不到——两个工具的边界一目了然；任务二若忘写 `mask-size: contain`，星形会按原始尺寸平铺出满屏星点。
