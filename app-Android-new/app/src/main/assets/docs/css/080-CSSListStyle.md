---
order: 80
title: 列表样式
module: 'css'
category: 前端技术
difficulty: beginner
description: list-style 系列属性控制有序/无序列表的标记样式，是列表排版的必修课。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'css/140-PseudoClassPseudoElement'
  - 'css/130-CSS3SelectorSystem'
prerequisites:
  - 'html5/120-List'
  - 'css/020-CSS3OverviewBasicSyntax'
---

## 0. 直觉：列表前面的“小圆点”是可以换的

`<ul>` 默认显示实心圆点，`<ol>` 默认显示数字——这些标记由 CSS 的 `list-style` 系列属性控制。它们决定三件事：用什么形状（`list-style-type`）、放在哪里（`list-style-position`）、是否用图片（`list-style-image`）。

导航栏最常见的需求就是“去掉小圆点”：`list-style: none`。这一节学完，列表标记随你定制。

## 1. 核心属性

### 1.1 list-style-type：标记形状

```css
ul {
  list-style-type: disc;    /* 实心圆（默认） */
}
ul.circle {
  list-style-type: circle;  /* 空心圆 */
}
ul.square {
  list-style-type: square;  /* 实心方块 */
}
ol {
  list-style-type: decimal;      /* 1, 2, 3（默认） */
}
ol.alpha {
  list-style-type: lower-alpha;  /* a, b, c */
}
ol.roman {
  list-style-type: lower-roman;  /* i, ii, iii */
}
ul.none {
  list-style-type: none;         /* 无标记 */
}
```

**讲解：**

- 无序列表的值：`disc`/`circle`/`square`/`none`；
- 有序列表的值：`decimal`/`lower-alpha`/`upper-alpha`/`lower-roman`/`upper-roman`；
- `none` 只是去掉标记，不改变列表语义，读屏仍会播报“列表共 N 项”；
- 标记外观也可以用 `::marker` 伪元素进一步定制（颜色、字体、内容）。

### 1.2 list-style-position：标记位置

```css
ul.outside {
  list-style-position: outside; /* 标记在内容盒外（默认，缩进） */
}
ul.inside {
  list-style-position: inside;  /* 标记进入内容盒，与首行文字同行 */
}
```

**讲解：** `outside` 时标记悬在内容左侧，多行文本自动对齐；`inside` 时标记成为首行的一部分，适合空间紧凑的场景。

### 1.3 list-style-image：图片标记

```css
ul {
  list-style-image: url("check.svg");
}
```

**讲解：** 用图片代替标记，适合自定义图标；图片加载失败时无标记，建议同时设置 `list-style-type` 作为兜底。现代项目更推荐 `::marker` 或 `::before` + `content` 实现图标。

### 1.4 简写与重置

```css
ul {
  list-style: none;              /* 最常用：去掉标记 */
  list-style: square inside;     /* 类型 + 位置 */
  list-style: url("x.svg") outside;
}
```

**讲解：** 简写顺序是 `type position image`，未写的部分重置为默认值；`list-style: none` 是导航、卡片列表的标准起点。

## 2. 动手试试

1. 给一个 `<ul>` 依次设置 `disc`/`circle`/`square`/`none`，刷新观察变化；
2. 给 `<ol>` 设置 `lower-roman`，再对比 `outside` 与 `inside` 的缩进差异；
3. 做导航菜单：`list-style: none` + 横向排列；
4. 进阶挑战：用 `::marker` 把标记改成红色箭头（`content: "→"`）。

## 3. 核心知识点

> 一句话记住列表样式：`type` 定形状，`position` 定内外，`image` 用图片；`list-style: none` 去标记，导航必备。

- `list-style-type`：`disc`/`circle`/`square`（无序），`decimal`/`roman`/`alpha`（有序）；
- `list-style-position`：`outside`（默认）与 `inside`；
- `list-style-image`：图片标记，建议留 type 兜底；
- `list-style` 简写会重置未写子属性；
- `::marker` 可精细定制标记样式；
- `none` 不删除语义，读屏仍识别列表。

## 4. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 用 `::before` 模拟标记 | 语义丢失，读屏不识别列表 | 保留 `<ul>` + `list-style` 或 `::marker` |
| 图片标记无兜底 | 加载失败后无标记 | 同时设置 `list-style-type` |
| 忘记重置简写 | 意外清掉其它样式 | 简写放最后，注意覆盖范围 |
| 只做视觉去点 | 列表语义仍在 | 用 `none` 即可，不必换 `div` |
| 数字编号被手写 | 增删条目后错乱 | 用 `<ol>` 自动编号 |

## 5. 扩展学习

- 列表结构：`html5/120-List`；
- `::marker`：`css/140-PseudoClassPseudoElement`；
- 选择器：`css/130-CSS3SelectorSystem`；
- 导航实战：`css/680-CSSProjectExampleResponsiveHomepage`。
