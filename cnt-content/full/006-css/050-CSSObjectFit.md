---
order: 500
title: 对象适配
module: 'css'
category: 前端技术
difficulty: beginner
description: object-fit 与 object-position 控制 img/video 等内容在盒子内的适配方式。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'html5/020-ImageResponsiveImage'
  - 'css/004-CSS3BoxModelDetailed'
prerequisites:
  - 'css/002-CSS3OverviewBasicSyntax'
---

## 0. 直觉：图片放进“固定相框”怎么摆

你有一个 400x300 的相框，图片却是 800x600——直接塞进去会怎样？`object-fit` 决定答案：拉伸填满、等比缩放完整显示、还是裁剪铺满。

它作用于 `<img>`、`<video>` 等“替换元素”的内容，与背景的 `background-size: cover/contain` 思路相同，但作用于内容本身。

## 1. 核心取值

```css
.cover {
  width: 400px;
  height: 300px;
  object-fit: cover;      /* 等比缩放并裁剪铺满（推荐） */
}
.contain {
  object-fit: contain;    /* 等比缩放完整显示，留白 */
}
.fill {
  object-fit: fill;       /* 拉伸填满，可能变形（默认） */
}
.none {
  object-fit: none;       /* 原尺寸，超出裁剪 */
}
.scale-down {
  object-fit: scale-down; /* 取 none 与 contain 中较小的结果 */
}
```

**讲解：**

- `cover`：等比缩放直到铺满盒子，多余部分裁剪，适合缩略图与头像；
- `contain`：完整显示，可能上下/左右留白，适合展示完整图片；
- `fill`：强制拉伸填满，会变形，是默认值；
- `none`：按原始尺寸显示；
- `scale-down`：自动选择 `none` 或 `contain` 中更小的那个。

## 2. object-position：内容位置

```css
.avatar {
  width: 80px;
  height: 80px;
  object-fit: cover;
  object-position: top;      /* 裁剪时保留顶部 */
  /* object-position: 50% 50% 默认居中 */
}
```

**讲解：** 配合 `cover` 使用，决定裁剪时保留哪部分：人像保留 `top` 或 `center top`，全景图用 `center`。取值与 `background-position` 一致（关键词或百分比）。

## 3. 完整示例

```html
<style>
  .thumb {
    width: 200px;
    height: 150px;
    object-fit: cover;
    object-position: center;
    border-radius: 8px;
  }
</style>
<img class="thumb" src="photo.jpg" alt="缩略图" />
```

**讲解：** 这是图片列表的标准写法：固定尺寸 + `cover` 裁剪 + 圆角，任何比例的图片都能整齐展示，且无需修改图片文件。

## 4. 动手试试

1. 用同一张图片分别设置 `fill`/`contain`/`cover`/`none`，观察差异；
2. 做一个头像：80x80 圆形（`border-radius: 50%`）+ `cover`；
3. 用 `object-position: top` 让横幅图裁剪时保留人物头部；
4. 进阶挑战：给 `<video>` 也用 `object-fit: cover` 做视频封面。

## 5. 核心知识点

> 一句话记住对象适配：`cover` 裁剪铺满、`contain` 完整留白、`fill` 拉伸变形；`object-position` 定裁剪位置，头像列表首选 `cover`。

- `object-fit` 作用于 img/video 等替换元素；
- `cover` 等比裁剪铺满，`contain` 等比完整显示；
- `fill` 是默认值，会变形；
- `object-position` 配合 `cover` 控制保留区域；
- 固定尺寸容器 + `cover` 是图片列表的标准方案；
- 与 `background-size` 概念相同，但作用于内容。

## 6. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 图片变形 | 使用了默认 `fill` | 用 `cover` 或 `contain` |
| 头像裁掉人脸 | 默认居中裁剪 | `object-position: top` 保留头部 |
| 忘记设置宽高 | object-fit 无效果 | 容器必须给定尺寸 |
| 大图直接加载 | 浪费流量 | 配合响应式图片 `srcset` |
| 视频变形 | video 默认拉伸 | `object-fit: cover` |

## 7. 扩展学习

- 响应式图片：`html5/020-ImageResponsiveImage`；
- 盒模型：`css/004-CSS3BoxModelDetailed`；
- 背景适配：`css/027-BackgroundEnhancement`（background-size 对比）；
- 圆角头像：`css/052-BorderRadius`。
