---
order: 200
title: 浮动与清除
module: 'css'
category: 前端技术
difficulty: beginner
description: CSS 浮动与清除的完整原理：float/clear 属性、BFC 与 flow-root、clearfix 演进与现代布局替代方案。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'css/060-MarginCollapse'
  - 'css/220-PositionDetailed'
  - 'css/230-StackingContext'
  - 'css/260-Gradient'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
---



# CSS 浮动与清除：原理、实践与现代替代

> 本文档对标 CSS 权威规范（CSS2.1 §9.5 Floats、CSS Display Module Level 3）与 MDN 教学文档，
> 从视觉格式化模型出发，完整讲解浮动（float）与清除（clear）的底层原理、历史演进与工程实践。

---

## 0. 直觉：让图片“漂”在文字里

报纸杂志里，图片嵌在文字中间、文字沿图片边缘环绕——`float` 最初就是为这个场景设计的：让元素向左或向右“漂”，后续文字绕着它排。

现代布局（Flexbox/Grid）已经取代了“用浮动拼整页”的做法，但文字环绕依然是 `float` 的独有能力。学这一节，重点记住三件事：怎么漂、漂了之后高度塌陷怎么修、什么时候别用。

## 1. 历史动机与发展脉络

浮动诞生于 CSS1（1996 年），最初的设计动机是模拟报纸排版中的**图文混排**：
让图片向左或向右"漂浮"，让文字沿着图片边缘自然环绕。

| 时期 | 事件 | 意义 |
| --- | --- | --- |
| 1996 | CSS1 引入 `float` | 首次在 Web 上实现图文混排 |
| 1998 | CSS2 引入 `clear` 与定位体系 | 补全浮动清除机制 |
| 2000 年代 | "浮动布局"时代 | 开发者用 float 拼装整页布局（两栏、三栏） |
| 2009-2012 | Flexbox 与 Grid 规范启动 | 提供以文档流为中心的一维/二维布局方案 |
| 2017 | Grid 主流浏览器支持 | 浮动退出整页布局主流场景 |
| 2020s | `display: flow-root` 广泛支持 | 提供语义化的 BFC 创建方式，替代 hack |

历史上的关键教训：**浮动是被"借"来搭建整页布局的**，它本身并不具备网格系统的
对齐与轨道能力，因此 2010 年代后逐渐被 Flexbox 与 Grid 取代；但文字环绕这一
原生能力至今仍没有更好的替代品。

---

## 2. 形式化定义

### 2.1 float 属性

按 CSS2.1 §9.5 定义，浮动框（floating box）是一个向左或向右移动的框，
其外边界（outer edge）被移动到当前行的起点或终点，或移动到另一个浮动框的
外边界旁。浮动元素：

- 从普通流（normal flow）中**取出**，不参与父容器的高度计算；
- 仍参与文本流（text flow），后续行内内容沿其边界环绕；
- 其顶端（top）不得超过浮动元素之前生成的任何块框的顶端；
- 同一方向连续浮动的框依次水平排列，空间不足时换行。

### 2.2 取值语法

```text
float: left | right | none | inline-start | inline-end
clear: none | left | right | both | inline-start | inline-end
```

| 属性 | 取值 | 效果 |
| --- | --- | --- |
| `float: left` | 靠左浮动 | 元素靠父容器左边缘排列 |
| `float: right` | 靠右浮动 | 元素靠父容器右边缘排列 |
| `float: none` | 默认 | 元素按普通流排列 |
| `float: inline-start` | 逻辑属性 | 在 LTR 中等于 left，在 RTL 中等于 right |
| `float: inline-end` | 逻辑属性 | 在 LTR 中等于 right，在 RTL 中等于 left |
| `clear: left` | 清除左浮动 | 元素移到其上方所有左浮动框之下 |
| `clear: right` | 清除右浮动 | 元素移到其上方所有右浮动框之下 |
| `clear: both` | 清除两侧 | 元素移到其上方所有浮动框之下 |

### 2.3 逻辑属性与物理属性

CSS Logical Properties 模块为 `float`/`clear` 增加了 `inline-start`/`inline-end`
两个逻辑值，它们随书写模式（writing-mode）与方向（direction）自动翻转，
适合国际化（i18n）场景。

---

## 3. 理论推导与原理解析

### 3.1 视觉格式化模型中的位置

普通流中的块级元素按"包含块、块级盒、行内盒"层层嵌套。浮动把元素从
**块级格式化上下文**中取出，放入一个"浮动带"（float band）：

1. 浮动元素生成浮动框，沿包含块的左/右边距放置；
2. 后续块级盒忽略浮动占用的横向空间（所以会"顶上来"）；
3. 后续行内内容（文本、行内元素）在剩余空间中排布，形成环绕效果；
4. 若浮动高度超过其父容器内容区，父容器不感知其高度，于是高度塌陷。

### 3.2 高度塌陷的成因

```html
<div class="wrapper">
  <div class="child"></div>
</div>
```

```css
.wrapper { border: 1px solid #333; }
.child { float: left; width: 200px; height: 100px; }
```

`.wrapper` 的高度由普通流内容决定，而 `.child` 已脱离普通流，因此 wrapper
的高度为 0（仅边框可见），这就是"高度塌陷"。

### 3.3 BFC 如何解决塌陷

BFC（块格式化上下文）是一块独立渲染区域，其特性之一：**BFC 会包含其内部所有
浮动元素**。因此，只要让父容器形成 BFC，它就会把浮动的子元素"算进"自己的高度。
创建 BFC 的常见方式：

| 方式 | 写法 | 副作用 |
| --- | --- | --- |
| overflow 非 visible | `overflow: hidden` | 可能裁剪溢出内容 |
| display: flow-root | `display: flow-root` | 无副作用，语义清晰 |
| display: inline-block | `display: inline-block` | 引入行内盒特性 |
| float 自身 | `float: left` | 父容器自己也浮动了 |
| position: absolute/fixed | `position: absolute` | 脱离文档流 |

### 3.4 clearfix 的历史 hack

在 `flow-root` 出现前，社区使用 `clearfix` 伪元素方案：

```css
.clearfix::after {
  content: '';
  display: block;
  clear: both;
}
```

原理：在父容器末尾插入一个空的块级伪元素，并对其设置 `clear: both`，
迫使父容器把该伪元素放在所有浮动元素之下，从而撑开高度。

---

## 4. 代码示例

### 4.1 基础浮动与文字环绕

```html
<article>
  <img src="cover.jpg" alt="封面" class="cover">
  <p>这段文字会沿着图片的右侧轮廓环绕排列，形成杂志式排版效果。</p>
  <p>第二段继续环绕，直到图片底部结束，后续内容恢复整行排列。</p>
</article>
```

```css
.cover {
  float: left;
  width: 240px;
  margin-right: 1.5rem;
  border-radius: 8px;
}
```

**讲解：** `float: left` 让图片靠左，`margin-right` 留出文字间距；文字沿图片右侧环绕，是杂志式排版的经典写法。

### 4.2 右浮动与 clear

```html
<div class="quote">引用块</div>
<p>普通段落</p>
```

```css
.quote {
  float: right;
  width: 40%;
  margin-left: 1rem;
}
p {
  clear: both; /* 强制段落移动到浮动块之下 */
}
```

**讲解：** `float: right` 让引用块靠右；`clear: both` 让后续元素不再环绕，从浮动块下方重新开始排列。

### 4.3 三种塌陷修复方案

```css
/* 方式一：clearfix（历史方案） */
.clearfix::after {
  content: '';
  display: block;
  clear: both;
}

/* 方式二：overflow（有裁剪风险） */
.overflow-fix {
  overflow: hidden;
}

/* 方式三：flow-root（现代推荐） */
.flow-root-fix {
  display: flow-root;
}
```

**讲解：** 三种修复：clearfix 伪元素（历史标准）、`overflow: hidden`（可能裁剪内容）、`display: flow-root`（现代推荐，无副作用）。

### 4.4 现代两栏布局对照

```css
/* float 方案（旧） */
.float-layout::after {
  content: '';
  display: block;
  clear: both;
}
.float-layout .sidebar {
  float: left;
  width: 25%;
}
.float-layout .main {
  float: right;
  width: 73%;
}

/* flex 方案（推荐） */
.flex-layout {
  display: flex;
  gap: 2%;
}
.flex-layout .sidebar {
  flex: 0 0 25%;
}
.flex-layout .main {
  flex: 1;
}
```

**讲解：** 两栏布局中，float 方案需要手动清浮动与计算宽度；Flexbox 用 `flex: 0 0 25%` + `flex: 1` 自动分配剩余空间，代码更短、行为更可预测。

---

## 5. 对比分析

| 维度 | float | Flexbox | Grid |
| --- | --- | --- | --- |
| 文档流参与度 | 脱离普通流 | 保持一维流 | 保持二维流 |
| 高度塌陷 | 常见 | 不会 | 不会 |
| 对齐能力 | 弱 | 主轴/交叉轴强 | 行列轨道强 |
| 响应式 | 需媒体查询手改 | 自动换行（wrap） | 自动填充（auto-fill） |
| 文字环绕 | 原生支持 | 不支持 | 不支持 |
| 代码可维护性 | 低（需 hack） | 高 | 高 |
| 浏览器兼容 | 全兼容 | 现代浏览器 | 现代浏览器 |
| 适用场景 | 图文混排、旧项目维护 | 导航、组件内一维布局 | 整页复杂二维布局 |

---

## 6. 常见陷阱与最佳实践

1. **忘记清除浮动导致塌陷**：只要父容器内含浮动子元素，就必须修复；
   优先使用 `display: flow-root`，其次 clearfix。
2. **overflow: hidden 裁剪内容**：`overflow: hidden` 形成的 BFC 会隐藏溢出
   的提示框或阴影，使用前确认无裁剪需求。
3. **百分比宽度与 padding 冲突**：浮动元素默认 `box-sizing: content-box`，
   设置 `width: 25%` 后再加 padding 会撑破容器，建议全局 `box-sizing: border-box`。
4. **浮动顺序影响换行**：浮动元素按 DOM 顺序排列，顺序调整可能改变换行位置，
   移动端请优先使用 Flexbox/Grid 的自然换行。
5. **clear 作用对象错误**：`clear` 只清除"其上方"的浮动，放在浮动元素前面无效。
6. **RTL 场景**：使用 `inline-start`/`inline-end` 逻辑值，避免硬编码 left/right。

---

## 7. 工程实践

### 7.1 在构建工具中启用现代属性

使用 PostCSS 的 `autoprefixer` 时，`display: flow-root` 等现代属性会被自动
按浏览器目标（browserslist）处理：

```json
{
  "browserslist": ["last 2 versions", "not dead"]
}
```

### 7.2 组件化封装

```css
/* components/MediaObject.css */
.media {
  display: flow-root;
}
.media__figure {
  float: left;
  margin-right: 1rem;
}
.media__body {
  overflow: hidden; /* 或 min-width: 0，防止文本溢出 */
}
```

### 7.3 代码检查

使用 Stylelint 的 `declaration-property-value-no-unknown` 或
`selector-max-id` 等规则，配合 `stylelint-config-standard` 保证浮动相关
代码风格统一。

---

## 8. 案例研究：杂志式图文混排页面

需求：实现一个博客文章头图、正文环绕、侧栏引语的完整页面。

```html
<main class="article">
  <h1>浮动布局实战</h1>
  <img class="hero" src="hero.jpg" alt="文章头图">
  <p>第一段……文字环绕头图右侧。</p>
  <blockquote class="pull-quote">金句引用</blockquote>
  <p>引语之后的文字继续环绕。</p>
</main>
```

```css
.article {
  display: flow-root; /* 修复 hero 与 pull-quote 造成的塌陷 */
  max-width: 900px;
  margin: 0 auto;
}
.hero {
  float: left;
  width: 45%;
  margin: 0 1.5rem 1rem 0;
}
.pull-quote {
  float: right;
  width: 35%;
  margin: 0 0 1rem 1.5rem;
  border-left: 4px solid #d63031;
  padding-left: 1rem;
}
```

要点：

1. 文章容器用 `display: flow-root` 一次性解决所有浮动子元素的高度塌陷；
2. 左浮动头图与右浮动引语互不冲突（不同方向）；
3. 正文段落无需 `clear`，自然环绕；
4. 移动端可叠加媒体查询，将浮动降级为普通块级排列。

## 9. 本章综合挑战（选做）

1. 用 `float` 做一段“图片左浮 + 文字环绕”的杂志式排版；
2. 用 `display: flow-root` 修复父容器高度塌陷，并对比 `overflow: hidden`；
3. 用 Flexbox 重写同一个两栏布局，比较代码量与可维护性；
4. 在移动端断点把浮动降级为普通排列。

## 10. 核心知识点

> 一句话记住浮动：`float` 让元素靠边、文字环绕；浮动不占高度，父容器要 `flow-root` 修复；整页布局请用 Flexbox/Grid。

- `float: left/right` 取出元素并让行内内容环绕；
- 浮动元素不参与父容器高度计算，导致高度塌陷；
- 修复：clearfix 伪元素、`overflow: hidden`、`display: flow-root`（推荐）；
- `clear: both` 强制后续元素移到浮动块下方；
- 文字环绕是 float 的独有能力；整页布局应使用 Flexbox/Grid；
- 同方向浮动依次排列，空间不足换行。

## 11. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 浮动布局不换行 | 父容器塌陷、错位 | 用 `flow-root` 或改 Flexbox |
| `overflow: hidden` 清浮动 | 裁剪溢出内容 | 优先 `flow-root` |
| 忘记 `clear` | 后续元素继续环绕 | 需要时显式 `clear: both` |
| 用 float 做导航/网格 | 可维护性差 | 用 Flexbox/Grid |
| 图文混排用 flex | 环绕效果无法实现 | 只有 float 支持文字环绕 |

## 12. 扩展学习

- 传统布局：`css/210-TraditionalLayoutTech`；
- 盒模型与 BFC：`css/050-CSS3BoxModelDetailed`、`css/060-MarginCollapse`；
- 现代布局：`css/240-CSS3FlexboxFlexLayout`、`css/250-CSS3GridGridLayout`；
- 响应式图文：`css/370-ResponsiveDesign`。
