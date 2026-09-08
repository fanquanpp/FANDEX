---
order: 60
title: CSS 简写属性
module: 'css'
category: 前端技术
difficulty: intermediate
description: margin/padding/border/background/font 等简写属性的 1-4 值规则与“重置未写属性”陷阱。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'css/004-CSS3BoxModelDetailed'
  - 'css/027-BackgroundEnhancement'
  - 'css/005-TextAndFontsBasics'
prerequisites:
  - 'css/002-CSS3OverviewBasicSyntax'
  - 'css/004-CSS3BoxModelDetailed'
---

## 0. 直觉：一个属性写四个方向，省代码也藏陷阱

`margin: 10px 20px` 比 `margin-top/right/bottom/left` 四行短得多，这就是简写属性（shorthand）。它把多个子属性合并成一条声明，但代价是：**没写的子属性会被重置为初始值**。理解这条代价，是工程上避免“样式莫名消失”的关键。

## 1. margin/padding 的 1-4 值规则

```css
/* 1 个值：四边相同 */
margin: 10px;

/* 2 个值：上下 | 左右 */
margin: 10px 20px;

/* 3 个值：上 | 左右 | 下 */
margin: 10px 20px 30px;

/* 4 个值：上 | 右 | 下 | 左（顺时针） */
margin: 10px 20px 30px 40px;
```

**讲解：** 记忆口诀“上右下左，顺时针”。`padding` 规则完全相同。`border-width`/`border-style`/`border-radius` 等方向类简写也遵循同一套规则。

## 2. border 简写

```css
.card {
  border: 1px solid #ddd;   /* width style color，顺序任意 */
  border-radius: 8px;
}
```

**讲解：** `border` 一行同时设置宽度、样式、颜色；只写 `border: 1px` 不合法，因为 `border-style` 默认为 `none`（不显示）。`border-radius` 有自己的 1-4 值规则（水平/垂直、四角）。

## 3. background 完整简写

```css
.banner {
  background: #f5f5f5 url("bg.png") no-repeat center / cover;
}
```

**讲解：** `background` 可合并颜色、图片、重复方式、位置、尺寸、附加方式等。注意两点：未写子属性会重置（例如只写 `background: url(...)` 会把颜色清掉）；`background-size` 用 `/` 与位置分隔。多背景分别写时，拆成 `background-image`/`background-color` 更安全。完整体系见 `css/027-BackgroundEnhancement`。

## 4. font 简写

```css
.article {
  font: italic 700 16px/1.7 "PingFang SC", sans-serif;
}
```

**讲解：** `font` 的格式是 `style weight size/line-height family`，其中 `size` 与 `family` 必填，其余可省。**只要写了 `font`，未写部分（如 `font-weight`）就会重置**，因此很少用于整段覆盖，常用于集中设置一组排版属性。

## 5. 其他常用简写

```css
.item {
  /* 动画 */
  animation: spin 2s linear infinite;
  /* 过渡 */
  transition: transform 0.3s ease;
  /* 列表 */
  list-style: none;
  /* 外框 */
  outline: 2px solid #4f5bd5;
  /* 文本装饰 */
  text-decoration: underline wavy red;
}
```

**讲解：** 规则一致：简写覆盖一组相关属性，未写的子属性回到初始值。动画/过渡/列表/外框的细节分别见 `css/029-CSSAnimationTransition`、`css/018-CSSListStyle` 对应文档。

## 6. 简写会重置未指定属性

这是简写最重要的一条陷阱：

```css
.btn {
  background-color: #d63031;
  transition: transform 0.2s ease;
}
.btn:hover {
  background: #e17055;   /* 注意：background 简写把颜色覆盖为 #e17055 是期望，但若写成 background: none，颜色也会被重置 */
}
```

```css
/* 反面案例：只想改背景图，却用简写 */
.card {
  background: #fff;
}
.card.featured {
  background: url("badge.png") no-repeat;  /* #fff 被重置为透明 */
}
```

**讲解：** 修复方式是“用子属性覆盖子属性”：`background-image: url(...)` 只改图片，保留颜色。凡是“只想改其中一项”的场景，都优先写子属性。

## 7. 动手试试

1. 用 1-4 值分别设置 `padding`，在 DevTools 盒模型图确认四边值；
2. 写 `background: url(...)` 覆盖原本有背景色的元素，观察颜色消失，再用 `background-color` 修复；
3. 用 `font` 简写集中设置一段文章排版，再单独改 `font-weight`，观察是否被重置；
4. 进阶挑战：整理一份自己项目里“应拆成子属性”的简写清单。

## 8. 核心知识点

> 一句话记住简写属性：简写省代码，但未写的子属性会被重置；只改一项就用子属性。

- `margin`/`padding` 的 1-4 值按“上右下左”顺时针；
- `border` 合并宽度、样式、颜色，缺样式不显示；
- `background` 可合并全部背景子属性，`size` 用 `/` 分隔；
- `font` 合并 style/weight/size/line-height/family，size 与 family 必填；
- 简写会重置未指定子属性，覆盖场景优先用子属性；
- 同一定义多次简写时，后写会清掉前面简写覆盖的子属性。

## 9. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 简写覆盖整段背景 | 颜色/图片被意外重置 | 单属性覆盖单属性 |
| `font` 简写后单独改字重无效 | 顺序问题或再次被重置 | 把 `font` 放最前，子属性放后面 |
| 记混 3 值与 4 值方向 | 布局间距出错 | 写注释标明方向，或拆成子属性 |
| 多背景用简写 | 可读性差、易错 | 多背景拆开写 `background-image` |

## 10. 扩展学习

- 盒模型与方向属性：`css/004-CSS3BoxModelDetailed`；
- 背景完整体系：`css/027-BackgroundEnhancement`；
- 文本与字体：`css/005-TextAndFontsBasics`；
- 动画与过渡简写：`css/029-CSSAnimationTransition`。
