---
order: 340
title: CSS 滤镜
module: 'css'
category: 前端技术
difficulty: intermediate
description: filter 的 10 个滤镜函数：模糊、亮度、对比度、色相旋转等，实现图片与组件的视觉处理。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'css/270-Shadow'
  - 'css/290-BackgroundEnhancement'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
---

## 0. 直觉：给元素加“滤镜”

滤镜是给元素加的一层“后期处理”：照片应用里的模糊、黑白、饱和度调节，在 CSS 里就是 `filter` 属性的几个函数。

```css
img {
  filter: grayscale(100%); /* 一键变黑白 */
}
```

`filter` 只影响视觉显示，不修改原图数据；可叠加多个函数，如 `filter: brightness(1.2) contrast(1.1)`。

## 1. 核心函数

### 1.1 常用函数一览

```css
.blur {
  filter: blur(4px);              /* 高斯模糊 */
}
.bright {
  filter: brightness(1.2);        /* 亮度，1 为原始值 */
}
.contrast {
  filter: contrast(1.5);          /* 对比度 */
}
.gray {
  filter: grayscale(100%);        /* 黑白 */
}
.sepia {
  filter: sepia(0.8);             /* 复古棕 */
}
.hue {
  filter: hue-rotate(90deg);      /* 色相旋转 */
}
.saturate {
  filter: saturate(200%);         /* 饱和度 */
}
.invert {
  filter: invert(100%);           /* 反色 */
}
.opacity {
  filter: opacity(50%);           /* 透明度（与 opacity 属性等价） */
}
.shadow {
  filter: drop-shadow(2px 4px 6px rgba(0, 0, 0, 0.4)); /* 跟随形状的投影 */
}
```

**讲解：**

- 十个函数：`blur`/`brightness`/`contrast`/`grayscale`/`sepia`/`hue-rotate`/`saturate`/`invert`/`opacity`/`drop-shadow`；
- 大部分函数接受百分比或 0-1 数值（`100%` 等价于 `1`）；
- `drop-shadow` 与 `box-shadow` 的区别：它跟随元素的实际形状（含透明区域），适合 PNG 图标；
- 多个函数用空格叠加，按顺序生效。

### 1.2 组合应用

```css
.dark-theme-img {
  filter: brightness(0.8) contrast(1.1) saturate(1.2);
}
.placeholder {
  filter: blur(8px) grayscale(50%);
  transition: filter 0.3s; /* 滤镜可以过渡 */
}
.placeholder:hover {
  filter: none;
}
```

**讲解：** 滤镜支持 `transition` 动画（如模糊占位图加载完成后渐变为清晰）；组合顺序会影响结果，例如先 `grayscale` 再 `sepia` 得到棕调、反过来先 `sepia` 再 `grayscale` 得到灰色——每一步的输入取决于上一步的输出。

## 2. 动手试试

1. 给一张图片依次尝试 10 个滤镜函数，观察各自效果；
2. 做“悬停变清晰”：图片默认模糊，hover 时 `filter: none` 并加过渡；
3. 用 `grayscale` + `hover` 还原实现“黑白转彩色”；
4. 进阶挑战：给不规则 PNG 图标加 `drop-shadow`，对比 `box-shadow` 的差异。

## 3. 核心知识点

> 一句话记住滤镜：`filter` 是视觉后期，`blur` 模糊、`grayscale` 黑白、`drop-shadow` 形状投影；可叠加、可过渡，不影响原图。

- 十个函数：blur、brightness、contrast、grayscale、sepia、hue-rotate、saturate、invert、opacity、drop-shadow；
- 多个函数空格叠加，顺序影响结果；
- `drop-shadow` 跟随形状，`box-shadow` 跟随盒子；
- 滤镜支持 transition 动画；
- 大面积滤镜有性能开销，动画时注意合成层；
- `filter` 会创建新的包含块（影响 `fixed` 定位），注意副作用。

## 4. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 大面积模糊 | 重绘开销大 | 缩小模糊区域或降低模糊半径 |
| 忘记 hover 还原 | 交互后样式残留 | 用 `filter: none` + transition |
| `box-shadow` 当形状投影 | PNG 图标出现方框阴影 | 用 `drop-shadow` |
| 滤镜动画频繁 | 掉帧 | 用 `will-change: filter` 或减少层级 |
| 忽略包含块副作用 | fixed 子元素定位异常 | 滤镜元素内避免依赖视口定位 |

## 5. 扩展学习

- 阴影：`css/270-Shadow`；
- 背景混合：`css/290-BackgroundEnhancement`（background-blend-mode）；
- 性能：`css/540-CSSPerformanceOptimizationDetailed`；
- 动画：`css/330-CSSAnimationTransition` 中滤镜过渡。

## 6. 动手实践：遮码自检

先只读任务与提示，遮住第 1 节的示例代码自己写，再对照参考实现。

**任务一**：实现「图片加载占位」——图片未加载时模糊 8px 且半灰度，hover 或加载完成后恢复清晰，全程平滑过渡；再给一个透明 PNG 图标加「贴形状」的投影。

**任务二**：回答两问——（a）`filter: grayscale(1) sepia(1)` 与 `filter: sepia(1) grayscale(1)` 为什么一张棕一张灰；（b）为什么在带 `filter` 的父元素里写 `position: fixed` 的子元素会「不再贴视口」。

**提示**：任务一用 `transition: filter` 与 `filter: none`（第 1.2 节），投影选 drop-shadow（第 1.1 节讲解）；任务二(a)考滤镜链的顺序语义（第 1.2 节组合应用）——sepia 会给任何输入染上棕调，grayscale 会把任何输入抹成灰，想清楚每一步的输入是什么；(b)对应核心知识点最后一条——filter 创建新包含块，与 transform 劫持 fixed 是同一原理（第 220 篇 3.4 节）。

**参考实现**（先自己写完再看）：

```css
/* 任务一 */
.photo {
  filter: blur(8px) grayscale(60%);
  transition: filter 0.4s ease;
}

.photo.loaded,
.photo:hover {
  filter: none; /* 全部滤镜复位，过渡到清晰 */
}

.icon {
  filter: drop-shadow(0 4px 6px rgb(0 0 0 / 0.3)); /* 沿轮廓，不是盒子 */
}

/* 任务二 */
/* (a) 滤镜按书写顺序逐个作用，每一步的输入是上一步的输出：
       grayscale(1) sepia(1)：先抹成灰，sepia 再给灰图统一染上棕调 → 棕色；
       sepia(1) grayscale(1)：先染成棕，最后的 grayscale 把颜色信息抹掉 → 灰色 */
/* (b) filter 使元素创建新的包含块——fixed 子元素的「视口参照」
       被改写成这个带滤镜的祖先，滚动时跟着祖先跑；
       修复：把 fixed 元素挪出带 filter 的子树 */
```

验收点：任务一里若把过渡写在 `:hover { filter: none }` 而基态没有 `transition`，hover 变化会是瞬间跳变；任务二复现时给父元素临时加 `filter: blur(0)` 就能让 fixed 子元素脱离视口——这是调试层叠与定位事故的常用探针。
