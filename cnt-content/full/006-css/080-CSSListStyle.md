---
order: 90
title: 列表样式
module: 'css'
category: 前端技术
difficulty: beginner
description: list-style 系列属性控制有序/无序列表的标记样式，是列表排版的必修课。
author: fanquanpp
updated: '2026-10-11'
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

## 6. 动手实践：遮码自检

先只读任务与提示，遮住第 1 节的示例代码自己写，再对照参考实现。

**任务一**：写一个横向导航——`<ul class="nav">` 里有三个 `<li><a>`，要求：无标记、标记不占布局、链接横向排开（本篇只考列表部分，横向排列用 `display: inline-block` 即可）。

**任务二**：给一个「文件清单」`<ul>` 用图片标记（`check.svg`），并回答：标记颜色想改成红色，`list-style-image` 做得到吗？写出更好的方案。

**提示**：任务一考「去掉标记但不换标签」——语义要保留（第 1.1 节讲解），`list-style: none` 一行即可；任务二的「红色标记」考的是 `list-style-image` 不会继承文字颜色这个限制，替代方案是 `::marker` 的 `color` + `content`（第 1.1 节末句与第 5 节扩展）。

**参考实现**（先自己写完再看）：

```css
/* 任务一 */
.nav {
  list-style: none; /* 类型/位置/图片一并清掉，导航的标准起点 */
  padding-left: 0;  /* 去点之后别忘了把默认缩进也收掉 */
}

.nav li {
  display: inline-block;
  margin-right: 16px;
}

/* 任务二 */
ul.files {
  list-style-image: url("check.svg");
  list-style-type: disc; /* 图片加载失败时的兜底标记 */
}

/* 红色标记的正路：list-style-image 不吃 color，
   ::marker 伪元素把标记当成可着色的内容 */
ul.done li::marker {
  color: red;
  content: "→ ";
}
```

验收点：任务一如果只写 `list-style: none` 不清 `padding-left`，列表会有默认 40px 缩进，「横向导航」会歪；任务二里把 `check.svg` 路径写错后应看到 disc 兜底圆点而不是空白——这正是「image + type 双保险」的意义。
