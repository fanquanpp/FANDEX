---
order: 62
title: 容器查询
module: css
category: CSS
difficulty: advanced
description: 深入解析 CSS Container Queries 容器查询的规范、算法、工程实践与跨浏览器兼容性
author: fanquanpp
updated: '2026-06-14'
related:
  - css/边框圆角
  - css/媒体查询
  - css/移动端适配
  - css/函数
  - css/CSS变量与自定义属性
prerequisites:
  - css/概述与基本语法
  - css/媒体查询
  - css/CSS变量与自定义属性
---

# 容器查询（Container Queries）

> 本文以 W3C CSS Containment Module Level 3 与 Container Queries Level 3 规范为基础，系统阐释容器查询（Container Queries）的设计动机、语法体系、`container-type` 与 `container-name` 的语义、`@container` 规则的算法、style queries 的实验性能力，以及与媒体查询（Media Queries）的差异。内容对标 Bootstrap、Tailwind CSS、Material Design 等主流框架的响应式实践，提供生产级代码示例与工程化解决方案。

---

## 目录

1. [学习目标](#1-学习目标)
2. [历史动机与发展脉络](#2-历史动机与发展脉络)
3. [形式化定义](#3-形式化定义)
4. [理论推导与原理解析](#4-理论推导与原理解析)
5. [代码示例](#5-代码示例)
6. [对比分析](#6-对比分析)
7. [常见陷阱与最佳实践](#7-常见陷阱与最佳实践)
8. [工程实践](#8-工程实践)
9. [案例研究](#9-案例研究)
10. [习题](#10-习题)
11. [参考文献](#11-参考文献)
12. [延伸阅读](#12-延伸阅读)

---

## 1. 学习目标

完成本章学习后，读者应能够：

### 1.1 Remember（记忆）

- 准确复述容器查询与媒体查询的核心差异：参照物是父容器（container）而非视口（viewport）。
- 列出 `container-type` 的三种取值：`normal`、`inline-size`、`size`。
- 识别 `@container` 规则的完整语法：`@container [name] [condition] { ... }`。
- 列出容器查询与 `@media` 查询的浏览器兼容性起点（Chrome 105+、Safari 16+、Firefox 110+）。

### 1.2 Understand（理解）

- 解释容器查询为何是组件化响应式设计的「圣杯」（组件能感知自身容器尺寸而非视口）。
- 阐述 `container-type: size` 与 `inline-size` 的差异：前者允许查询宽与高，后者仅查询行内方向。
- 论证 `container-type: size` 为何会触发 `contain: size` 而导致子元素尺寸无法影响容器高度。
- 描述 `container-name` 的命名作用域与冲突避免机制。

### 1.3 Apply（应用）

- 在生产代码中通过 `container-type: inline-size` 让卡片组件根据父容器宽度自动切换布局。
- 利用 `cqi`（container query inline）单位实现响应式字体大小。
- 使用 `style()` 查询根据父容器 CSS 变量切换主题（实验性）。
- 在 React/Vue 组件库中封装可复用的容器查询 Hook。

### 1.4 Analyze（分析）

- 对比容器查询与媒体查询在「组件化设计系统」中的优劣。
- 拆解 `container-type: size` 与 `inline-size` 的性能差异：前者需要布局完成才能查询，可能导致循环依赖。
- 评估容器查询在 SSR（服务端渲染）场景下的局限性与 hydration 处理策略。
- 分析 `style()` 查询的浏览器支持现状及渐进增强方案。

### 1.5 Evaluate（评价）

- 在「重构旧组件库为容器查询」的迁移方案中权衡收益与风险。
- 评价容器查询替代「JS 监听 resize」方案的合理性。
- 反思容器查询对 CSS 架构的影响：是否需要重新设计 BEM / ITCSS 层级。
- 评估 `cqi` / `cqw` / `cqh` 单位在可访问性（zoom、字号放大）下的表现。

### 1.6 Create（创造）

- 设计一套基于容器查询的响应式设计系统，支持「组件即适配」。
- 编写 PostCSS 插件，将旧代码中的 `@media` 自动转换为 `@container`。
- 提出面向 CSS Working Group 的改进建议（如 `container-type: layout` 假想）。
- 构建容器查询的 Storybook 测试用例，覆盖各种容器尺寸下的视觉回归。

---

## 2. 历史动机与发展脉络

### 2.1 媒体查询的局限（2010s）

CSS Media Queries 在 2012 年随 CSS3 引入，让 Web 设计进入响应式时代。开发者通过 `@media (min-width: 768px)` 等条件针对视口尺寸适配。然而，组件化时代的到来暴露了媒体查询的根本缺陷：

```html
<!-- 一个卡片组件可能出现在侧栏（200px 宽）或主内容区（800px 宽） -->
<aside class="sidebar">
  <Card /> <!-- 在 200px 容器内仍按视口（如 1440px）的样式渲染 -->
</aside>
<main class="content">
  <Card /> <!-- 在 800px 容器内 -->
</main>
```

问题：卡片组件无法感知自身容器的实际宽度，只能依赖父级传递 props 或 JS 监听 ResizeObserver。这种「视口驱动」的响应式与「组件驱动」的设计系统存在根本矛盾。

### 2.2 早期尝试：Element Query（2013-2017）

社区曾提出「Element Queries」构想：

```css
/* 假想语法，从未标准化 */
.card(min-width: 400px) {
  display: flex;
}
```

但元素查询存在循环依赖问题：若元素 A 的样式依赖于自身的宽度，而样式又影响宽度，将导致无限循环。例如：

```css
/* 循环依赖示例 */
.box(min-width: 200px) {
  width: 100px; /* 改变自身宽度，触发条件失效，再变回... */
}
```

W3C 长期拒绝将元素查询纳入规范，正是因为此问题。

### 2.3 CSS Containment 的引入（2016）

[CSS Containment Module Level 1](https://www.w3.org/TR/css-contain-1/) 引入了 `contain` 属性，允许浏览器隔离元素的渲染，提升性能：

```css
.component {
  contain: layout paint size; /* 隔离布局、绘制与尺寸 */
}
```

`contain: size` 的关键意义：明确告知浏览器「该元素的尺寸不受子元素影响」，从而打破元素查询的循环依赖。这为容器查询奠定了基础。

### 2.4 Container Queries Level 3（2021-2023）

2021 年，Miriam Suzanne 与 Tab Atkins 在 [CSS Containment Module Level 3](https://www.w3.org/TR/css-contain-3/) 中正式提出容器查询规范：

- `container-type` 属性：声明元素为查询容器。
- `container-name` 属性：为容器命名，支持多层嵌套时的精确匹配。
- `@container` 规则：根据容器条件应用样式。
- `cqw`、`cqh`、`cqi`、`cqb`、`cqmin`、`cqmax` 单位：相对于容器尺寸的长度单位。

2022 年 8 月，Chrome 105、Safari 16、Firefox 110 相继实现容器查询，正式进入生产可用阶段。

### 2.5 Style Queries 的实验（2023+）

容器查询的下一阶段是「样式查询」（Style Queries），允许根据容器的 CSS 变量或计算样式应用规则：

```css
@container style(--theme: dark) {
  .card {
    background: #1a1a1a;
  }
}
```

截至 2024 年，Chrome 111+ 部分支持，Safari 与 Firefox 仍在实现中。

### 2.6 演进时间线

| 年份 | 事件 | 核心变化 |
| --- | --- | --- |
| 2012 | CSS Media Queries Level 3 推荐 | 视口驱动响应式 |
| 2013 | 社区提出 Element Query | 因循环依赖被否决 |
| 2016 | CSS Containment Level 1 | 引入 `contain` 属性 |
| 2019 | Miriam Suzanne 提议 Container Query | 基于 containment 解决循环 |
| 2021 | CSS Containment Level 3 草案 | `container-type`、`@container` 规范化 |
| 2022.8 | Chrome 105 / Safari 16 实现 | 容器查询进入生产可用 |
| 2023 | Style Queries 实验 | `style(--var: val)` 查询 |
| 2024 | 容器查询单位普及 | `cqi` 单位被广泛使用 |

---

## 3. 形式化定义

### 3.1 规范条款

依据 [CSS Containment Module Level 3 §3](https://www.w3.org/TR/css-contain-3/#container-queries)：

> A container query allows styling of elements based on the size of a container element rather than the viewport.

### 3.2 核心属性

| 属性 | 取值 | 默认 | 说明 |
| --- | --- | --- | --- |
| `container-type` | `normal` \| `inline-size` \| `size` | `normal` | 声明容器类型 |
| `container-name` | `<custom-ident>+` \| `none` | `none` | 容器命名 |
| `container` | `<container-type>` \|\| `<container-name>` | - | 简写属性 |

### 3.3 `@container` 规则语法

```
@container [ <container-name> ]? <container-condition> {
  <stylesheet>
}
```

其中 `<container-condition>` 支持以下查询：

- 尺寸查询：`(min-width: 400px)`、`(max-width: 800px)`、`(orientation: landscape)`
- 复合查询：`(min-width: 400px) and (max-width: 800px)`、`not (min-width: 400px)`
- 样式查询（实验）：`style(--theme: dark)`、`style(--accent-color: blue)`

### 3.4 容器查询单位

| 单位 | 含义 | 对应视口单位 |
| --- | --- | --- |
| `cqw` | 容器宽度的 1% | `vw` |
| `cqh` | 容器高度的 1% | `vh` |
| `cqi` | 容器 inline 方向的 1% | `vi` |
| `cqb` | 容器 block 方向的 1% | `vb` |
| `cqmin` | `cqi` 与 `cqb` 中较小者 | `vmin` |
| `cqmax` | `cqi` 与 `cqb` 中较大者 | `vmax` |

### 3.5 形式化定义

设容器 $C$ 的 `container-type` 为 $T \in \{\text{normal}, \text{inline-size}, \text{size}\}$，则：

- 若 $T = \text{normal}$：$C$ 不是查询容器，`@container` 规则不匹配。
- 若 $T = \text{inline-size}$：$C$ 是 inline-size 容器，可查询 `width`、`inline-size`、`aspect-ratio`。
- 若 $T = \text{size}$：$C$ 是 size 容器，可查询 `width`、`height`、`inline-size`、`block-size`、`aspect-ratio`、`orientation`。

`@container` 规则的匹配函数：

$$
\text{Match}(@container, E) =
\begin{cases}
\text{true}, & \text{if } \exists C \in \text{Ancestors}(E) \text{ s.t. } \\
& \quad \text{Type}(C) \neq \text{normal} \\
& \quad \wedge \text{Name}(C) = \text{Name}(@container) \\
& \quad \wedge \text{Condition}(@container, C) = \text{true} \\
\text{false}, & \text{otherwise}
\end{cases}
$$

其中 `Ancestors(E)` 是元素 E 的祖先链中最近的匹配容器。

### 3.6 循环依赖的解决

CSS Containment Level 3 通过 `contain: size`（由 `container-type: size` 隐式触发）解决循环依赖：

- 容器的尺寸被声明为「与子元素无关」，浏览器先布局容器，再应用 `@container` 规则。
- 子元素的样式变化不会回流影响容器尺寸，从而打破循环。

形式化地：

$$
\text{Layout}(C) \to \text{Evaluate}(@container, C) \to \text{Layout}(\text{Children}(C))
$$

而非：

$$
\text{Layout}(\text{Children}(C)) \to \text{Layout}(C) \to \text{Evaluate}(@container, C) \to \text{Layout}(\text{Children}(C)) \to \ldots
$$

---

## 4. 理论推导与原理解析

### 4.1 容器查询的渲染管线

1. 浏览器构建 DOM 树与 CSSOM。
2. 进行布局（Layout）：计算每个元素的位置与尺寸。
3. 遇到声明了 `container-type: inline-size` 的元素时，浏览器先计算其尺寸，再匹配 `@container` 规则。
4. 应用匹配的样式，对子元素进行二次布局。
5. 进入绘制（Paint）阶段。

### 4.2 `inline-size` vs `size` 的性能差异

`inline-size`：

- 只查询容器的 inline 方向（通常是宽度）。
- 容器的 block 方向（高度）仍可被子元素撑开。
- 性能较优，因为只需一次布局。

`size`：

- 同时查询容器的 inline 与 block 方向。
- 容器必须显式设置高度，否则高度为 0（因 `contain: size` 生效）。
- 性能较差，因为需要先布局容器，再评估条件，再布局子元素。

数学上，`inline-size` 容器的高度计算函数：

$$
\text{Height}(C) = f(\text{Content}(C), \text{Styles}(C))
$$

而 `size` 容器的高度计算函数：

$$
\text{Height}(C) = \text{ExplicitHeight}(C) \quad \text{(子元素不影响)}
$$

### 4.3 `container-name` 的命名作用域

当容器嵌套时，`container-name` 用于精确匹配：

```css
.outer {
  container-type: inline-size;
  container-name: outer;
}
.inner {
  container-type: inline-size;
  container-name: inner;
}

@container outer (min-width: 800px) {
  .card { /* 匹配最近的名为 outer 的容器 */ }
}
@container inner (min-width: 400px) {
  .card { /* 匹配最近的名为 inner 的容器 */ }
}
```

匹配规则：从子元素向上遍历祖先链，找到第一个匹配名称的容器。若未指定名称，匹配最近的任何类型容器。

### 4.4 `cqi` 单位的计算

`cqi`（container query inline）是容器 inline 方向尺寸的 1%。例如：

```css
.card {
  font-size: 5cqi; /* 容器宽度的 5% */
}
```

若容器宽度为 400px，则 `5cqi = 5% * 400px = 20px`。

数学定义：

$$
1\text{cqi} = \frac{\text{Width}(C)}{100}
$$

当元素不在任何容器内时，`cqi` 回退为视口 inline 方向的 1%（即 `vi`）。

### 4.5 Style Queries 的算法

Style Queries（实验性）允许查询容器的 CSS 变量或计算样式：

```css
.card-container {
  --theme: dark;
  container-type: inline-size;
}
@container style(--theme: dark) {
  .card {
    background: #1a1a1a;
    color: white;
  }
}
```

匹配函数：

$$
\text{Match}(@container\ style(\text{var}: \text{val}), C) =
\begin{cases}
\text{true}, & \text{if } \text{getComputedStyle}(C).\text{var} = \text{val} \\
\text{false}, & \text{otherwise}
\end{cases}
$$

注意：Style Queries 仅支持查询自定义属性（CSS Variables），暂不支持查询标准属性（如 `color`、`display`）。

### 4.6 容器查询与可访问性

容器查询提升了组件的灵活性，但需注意可访问性：

1. **字号放大**：用户在浏览器设置中放大字号时，容器尺寸不变，但内容可能溢出。应配合 `text-wrap: balance` 或 `text-wrap: pretty`。
2. **屏幕阅读器**：容器查询仅影响视觉，不影响 DOM 顺序，对屏幕阅读器友好。
3. **prefers-reduced-motion**：容器查询触发的布局变化应尊重用户的运动偏好。

```css
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
  }
}
```

---

## 5. 代码示例

### 5.1 基础示例：响应式卡片

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>容器查询基础示例</title>
<style>
  /* CSS Containment Level 3 - 容器查询基础 */
  .card-container {
    container-type: inline-size;
    /* 等价于 container: inline-size */
  }

  /* 默认样式：窄容器下的垂直布局 */
  .card {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
  }

  /* 宽容器下的水平布局 */
  @container (min-width: 400px) {
    .card {
      flex-direction: row;
      align-items: center;
    }
    .card-media {
      flex: 0 0 120px;
    }
  }

  /* 更宽容器下的两行布局 */
  @container (min-width: 700px) {
    .card {
      padding: 2rem;
      gap: 2rem;
    }
    .card-title {
      font-size: 1.5rem;
    }
  }

  .card-media {
    height: 120px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    border-radius: 6px;
  }

  .card-body {
    flex: 1;
  }

  .card-title {
    margin: 0 0 0.5rem 0;
    font-size: 1.125rem;
  }

  .card-text {
    margin: 0;
    color: #6c757d;
  }
</style>
</head>
<body>
  <!-- 调整外层容器宽度可见卡片自动切换布局 -->
  <div style="width: 350px;">
    <div class="card-container">
      <article class="card">
        <div class="card-media"></div>
        <div class="card-body">
          <h3 class="card-title">卡片标题</h3>
          <p class="card-text">窄容器：垂直布局</p>
        </div>
      </article>
    </div>
  </div>

  <div style="width: 500px; margin-top: 20px;">
    <div class="card-container">
      <article class="card">
        <div class="card-media"></div>
        <div class="card-body">
          <h3 class="card-title">卡片标题</h3>
          <p class="card-text">宽容器：水平布局</p>
        </div>
      </article>
    </div>
  </div>
</body>
</html>
```

### 5.2 命名容器：嵌套场景

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>命名容器的嵌套查询</title>
<style>
  /* 外层容器命名为 sidebar */
  .sidebar {
    container-type: inline-size;
    container-name: sidebar;
  }

  /* 内层容器命名为 card */
  .card-wrapper {
    container-type: inline-size;
    container-name: card;
  }

  /* 根据 sidebar 宽度切换整体布局 */
  @container sidebar (min-width: 300px) {
    .widget {
      padding: 1.5rem;
    }
  }

  /* 根据 card 容器宽度切换卡片布局 */
  @container card (min-width: 250px) {
    .card {
      display: flex;
      gap: 1rem;
    }
  }

  /* 复合查询：两个容器都满足条件 */
  @container sidebar (min-width: 300px) and card (min-width: 250px) {
    .card {
      background: #e7f3ff;
    }
  }
</style>
</head>
<body>
  <aside class="sidebar">
    <div class="widget">
      <div class="card-wrapper">
        <article class="card">卡片内容</article>
      </div>
    </div>
  </aside>
</body>
</html>
```

### 5.3 `container-type: size`：查询高度

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>size 容器查询：根据高度切换布局</title>
<style>
  /* size 容器：可查询宽与高，但容器需显式高度 */
  .hero-container {
    container-type: size;
    width: 100%;
    height: 400px; /* 必须显式高度 */
    border: 2px solid #dee2e6;
  }

  .hero {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 2rem;
  }

  /* 矮容器：紧凑布局 */
  @container (max-height: 200px) {
    .hero {
      flex-direction: row;
      padding: 1rem;
    }
    .hero-title {
      font-size: 1.25rem;
    }
  }

  /* 高容器：扩展布局 */
  @container (min-height: 300px) and (min-width: 600px) {
    .hero {
      padding: 4rem;
    }
    .hero-title {
      font-size: 3rem;
    }
  }

  .hero-title {
    margin: 0 0 1rem 0;
    font-size: 2rem;
  }

  .hero-subtitle {
    margin: 0;
    font-size: 1rem;
    opacity: 0.9;
  }
</style>
</head>
<body>
  <h3>矮容器（高度 150px）</h3>
  <div class="hero-container" style="height: 150px;">
    <div class="hero">
      <h2 class="hero-title">Hero 标题</h2>
      <p class="hero-subtitle">副标题</p>
    </div>
  </div>

  <h3>高容器（高度 400px）</h3>
  <div class="hero-container">
    <div class="hero">
      <h2 class="hero-title">Hero 标题</h2>
      <p class="hero-subtitle">副标题</p>
    </div>
  </div>
</body>
</html>
```

### 5.4 `cqi` 单位：响应式字体

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>cqi 单位：响应式字体</title>
<style>
  .responsive-text-container {
    container-type: inline-size;
    width: 100%;
  }

  .headline {
    /* 字体大小 = 容器宽度的 8% */
    font-size: 8cqi;
    line-height: 1.2;
    margin: 0;
    word-break: break-word;
  }

  .subhead {
    /* 副标题 = 容器宽度的 4% */
    font-size: 4cqi;
    color: #6c757d;
    margin: 1cqi 0 0 0;
  }

  /* 配合 clamp 限制范围 */
  .clamped-text {
    font-size: clamp(1rem, 5cqi, 3rem);
  }
</style>
</head>
<body>
  <div style="width: 600px;">
    <div class="responsive-text-container">
      <h1 class="headline">响应式标题</h1>
      <p class="subhead">副标题</p>
      <p class="clamped-text">限制范围的响应式文本</p>
    </div>
  </div>

  <div style="width: 300px; margin-top: 20px;">
    <div class="responsive-text-container">
      <h1 class="headline">响应式标题</h1>
      <p class="subhead">副标题</p>
      <p class="clamped-text">限制范围的响应式文本</p>
    </div>
  </div>
</body>
</html>
```

### 5.5 Style Queries：主题切换（实验性）

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>Style Queries：基于 CSS 变量切换主题</title>
<style>
  /* 实验性：截至 2024 年仅 Chrome 111+ 部分支持 */
  .theme-container {
    container-type: inline-size;
    --theme: light;
    --accent: #007bff;
  }

  .theme-container[data-theme="dark"] {
    --theme: dark;
    --accent: #4dabf7;
  }

  /* 默认浅色 */
  .card {
    background: #ffffff;
    color: #212529;
    border: 1px solid #dee2e6;
    padding: 1rem;
    border-radius: 8px;
  }

  /* 深色主题 */
  @container style(--theme: dark) {
    .card {
      background: #1a1a1a;
      color: #f8f9fa;
      border-color: #343a40;
    }
  }

  /* 根据强调色调整按钮 */
  @container style(--accent: #007bff) {
    .btn {
      background: #007bff;
    }
  }
  @container style(--accent: #4dabf7) {
    .btn {
      background: #4dabf7;
    }
  }

  .btn {
    display: inline-block;
    padding: 0.5rem 1rem;
    color: white;
    border: none;
    border-radius: 4px;
    margin-top: 0.5rem;
    cursor: pointer;
  }
</style>
</head>
<body>
  <div class="theme-container" data-theme="light">
    <div class="card">
      <h3>浅色主题卡片</h3>
      <p>主题由容器的 --theme 变量驱动</p>
      <button class="btn">按钮</button>
    </div>
  </div>

  <div class="theme-container" data-theme="dark" style="margin-top: 20px;">
    <div class="card">
      <h3>深色主题卡片</h3>
      <p>主题由容器的 --theme 变量驱动</p>
      <button class="btn">按钮</button>
    </div>
  </div>
</body>
</html>
```

### 5.6 企业级组件：可复用响应式卡片

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>企业级响应式卡片组件</title>
<style>
  :root {
    --color-primary: #667eea;
    --color-primary-dark: #764ba2;
    --color-text: #212529;
    --color-text-muted: #6c757d;
    --color-bg: #f8f9fa;
    --color-card: #ffffff;
    --radius-md: 8px;
    --radius-lg: 12px;
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    padding: 2rem;
    background: var(--color-bg);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: var(--color-text);
  }

  /* 容器查询包装器 */
  .responsive-card {
    container-type: inline-size;
    container-name: card;
  }

  /* 卡片基础样式 */
  .card {
    background: var(--color-card);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* 默认（窄容器）：垂直紧凑布局 */
  .card__media {
    width: 100%;
    height: 160px;
    background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  }

  .card__body {
    padding: 1rem;
  }

  .card__title {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    font-weight: 600;
  }

  .card__text {
    margin: 0 0 0.75rem 0;
    font-size: 0.875rem;
    color: var(--color-text-muted);
    line-height: 1.5;
  }

  .card__action {
    display: flex;
    gap: 0.5rem;
  }

  .btn {
    display: inline-block;
    padding: 0.5rem 0.875rem;
    font-size: 0.875rem;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    text-decoration: none;
    transition: background 0.2s;
  }

  .btn--primary {
    background: var(--color-primary);
    color: white;
  }

  .btn--primary:hover {
    background: var(--color-primary-dark);
  }

  .btn--ghost {
    background: transparent;
    color: var(--color-primary);
    border: 1px solid var(--color-primary);
  }

  /* 中等容器（300px+）：水平布局 */
  @container card (min-width: 300px) {
    .card {
      flex-direction: row;
    }
    .card__media {
      flex: 0 0 140px;
      height: auto;
    }
    .card__body {
      padding: 1.25rem;
    }
    .card__title {
      font-size: 1.125rem;
    }
  }

  /* 大容器（500px+）：扩展布局 */
  @container card (min-width: 500px) {
    .card {
      box-shadow: var(--shadow-md);
    }
    .card__media {
      flex: 0 0 200px;
    }
    .card__body {
      padding: 2rem;
    }
    .card__title {
      font-size: 1.5rem;
      margin-bottom: 0.75rem;
    }
    .card__text {
      font-size: 1rem;
      margin-bottom: 1.5rem;
    }
  }

  /* 响应式字体：cqi 单位 */
  .card__title {
    font-size: clamp(1rem, 5cqi, 1.5rem);
  }
</style>
</head>
<body>
  <h2>同一组件在不同容器宽度下自动适配</h2>

  <h3>窄容器（240px）</h3>
  <div style="width: 240px;">
    <div class="responsive-card">
      <article class="card">
        <div class="card__media"></div>
        <div class="card__body">
          <h3 class="card__title">卡片标题</h3>
          <p class="card__text">这是卡片描述文字，会随容器宽度自动调整布局。</p>
          <div class="card__action">
            <a href="#" class="btn btn--primary">主操作</a>
            <a href="#" class="btn btn--ghost">次操作</a>
          </div>
        </div>
      </article>
    </div>
  </div>

  <h3>中等容器（400px）</h3>
  <div style="width: 400px;">
    <div class="responsive-card">
      <article class="card">
        <div class="card__media"></div>
        <div class="card__body">
          <h3 class="card__title">卡片标题</h3>
          <p class="card__text">这是卡片描述文字，会随容器宽度自动调整布局。</p>
          <div class="card__action">
            <a href="#" class="btn btn--primary">主操作</a>
            <a href="#" class="btn btn--ghost">次操作</a>
          </div>
        </div>
      </article>
    </div>
  </div>

  <h3>宽容器（600px）</h3>
  <div style="width: 600px;">
    <div class="responsive-card">
      <article class="card">
        <div class="card__media"></div>
        <div class="card__body">
          <h3 class="card__title">卡片标题</h3>
          <p class="card__text">这是卡片描述文字，会随容器宽度自动调整布局。</p>
          <div class="card__action">
            <a href="#" class="btn btn--primary">主操作</a>
            <a href="#" class="btn btn--ghost">次操作</a>
          </div>
        </div>
      </article>
    </div>
  </div>
</body>
</html>
```

### 5.7 渐进增强：兼容旧浏览器

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>渐进增强：兼容不支持容器查询的浏览器</title>
<style>
  /* 1. 基础样式：所有浏览器可见 */
  .card {
    display: flex;
    flex-direction: column;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
  }

  /* 2. 媒体查询兜底：旧浏览器使用视口查询 */
  @media (min-width: 768px) {
    .card {
      flex-direction: row;
    }
  }

  /* 3. 容器查询：现代浏览器覆盖媒体查询 */
  @supports (container-type: inline-size) {
    .card-container {
      container-type: inline-size;
    }
    @container (min-width: 400px) {
      .card {
        flex-direction: row;
      }
    }
  }
</style>
</head>
<body>
  <div class="card-container">
    <article class="card">
      <div>媒体</div>
      <div>内容</div>
    </article>
  </div>
</body>
</html>
```

### 5.8 React 组件示例

```jsx
// ResponsiveCard.jsx
import React from 'react';
import './ResponsiveCard.css';

export default function ResponsiveCard({ title, text, image }) {
  return (
    <div className="responsive-card">
      <article className="card">
        <div className="card__media" style={{ backgroundImage: `url(${image})` }} />
        <div className="card__body">
          <h3 className="card__title">{title}</h3>
          <p className="card__text">{text}</p>
        </div>
      </article>
    </div>
  );
}

// ResponsiveCard.css
.responsive-card {
  container-type: inline-size;
}

.card {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
}

.card__media {
  height: 160px;
  background-size: cover;
  background-position: center;
}

.card__body {
  padding: 1rem;
}

@container (min-width: 400px) {
  .card {
    flex-direction: row;
  }
  .card__media {
    flex: 0 0 140px;
    height: auto;
  }
}
```

### 5.9 Vue 组件示例

```vue
<!-- ResponsiveCard.vue -->
<template>
  <div class="responsive-card">
    <article class="card">
      <div class="card__media" :style="{ backgroundImage: `url(${image})` }"></div>
      <div class="card__body">
        <h3 class="card__title">{{ title }}</h3>
        <p class="card__text">{{ text }}</p>
      </div>
    </article>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  text: String,
  image: String,
});
</script>

<style scoped>
.responsive-card {
  container-type: inline-size;
}

.card {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
}

.card__media {
  height: 160px;
  background-size: cover;
  background-position: center;
}

.card__body {
  padding: 1rem;
}

@container (min-width: 400px) {
  .card {
    flex-direction: row;
  }
  .card__media {
    flex: 0 0 140px;
    height: auto;
  }
}
</style>
```

### 5.10 调试技巧：DevTools 可视化

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>容器查询调试</title>
<style>
  /* Chrome DevTools 105+ 支持 @container 标记 */
  .debug-container {
    container-type: inline-size;
    /* DevTools 会在元素旁显示 @container 标签 */
    outline: 2px dashed #007bff;
    padding: 0.5rem;
  }

  .debug-container::before {
    content: '@container';
    display: block;
    font-size: 0.75rem;
    color: #007bff;
    margin-bottom: 0.5rem;
  }
</style>
</head>
<body>
  <div class="debug-container">
    <p>调试内容</p>
  </div>
</body>
</html>
```

---

## 6. 对比分析

### 6.1 容器查询 vs 媒体查询

| 维度 | 媒体查询 `@media` | 容器查询 `@container` |
| --- | --- | --- |
| 参照物 | 视口（viewport） | 父容器（container） |
| 组件独立性 | 差（依赖视口） | 优（组件自包含） |
| 复用性 | 低（需根据视口重写） | 高（组件即适配） |
| SSR 友好 | 优（视口已知） | 差（容器尺寸未知） |
| 浏览器支持 | 全部 | Chrome 105+、Safari 16+、Firefox 110+ |
| 单位 | `vw`、`vh`、`vi`、`vb` | `cqw`、`cqh`、`cqi`、`cqb` |
| 嵌套查询 | 不支持 | 支持（`container-name`） |
| 主题切换 | `prefers-color-scheme` | `style(--var)`（实验） |

### 6.2 容器查询 vs ResizeObserver

| 维度 | 容器查询 `@container` | ResizeObserver（JS） |
| --- | --- | --- |
| 实现方式 | 纯 CSS | JavaScript |
| 性能 | 浏览器优化 | 可能引起 reflow |
| 同步性 | 与渲染管线同步 | 异步回调 |
| 复杂条件 | 支持组合查询 | 需手动逻辑 |
| 学习成本 | 低（CSS 语法） | 中（JS API） |
| 兼容性 | 现代浏览器 | 现代浏览器 |
| SSR | 不友好 | 不友好 |
| 推荐 | 布局适配 | 复杂逻辑场景 |

### 6.3 容器查询 vs CSS 变量驱动

| 维度 | 容器查询 | CSS 变量（props 传递） |
| --- | --- | --- |
| 数据流 | 自动（基于布局） | 显式（props 传递） |
| 灵活性 | 仅尺寸/样式 | 任意值 |
| SSR | 不友好 | 友好（服务端可计算） |
| 学习成本 | 低 | 中（需要 props 设计） |
| 适用场景 | 视觉适配 | 业务逻辑切换 |

### 6.4 容器查询与 Tailwind CSS

Tailwind CSS v3.4+ 支持容器查询插件：

```html
<!-- Tailwind CSS v3.4 容器查询插件 -->
<div class="@container">
  <div class="flex flex-col @md:flex-row">
    <div class="@md:w-1/3">媒体</div>
    <div class="@md:w-2/3">内容</div>
  </div>
</div>
```

配置：

```javascript
// tailwind.config.js
module.exports = {
  plugins: [
    require('@tailwindcss/container-queries'),
  ],
};
```

### 6.5 容器查询与 Bootstrap

Bootstrap 5.3+ 开始在部分组件中使用容器查询：

```scss
// Bootstrap 5.3 源码示例
.card {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .card-body {
    padding: 1.5rem;
  }
}
```

### 6.6 容器查询与 Material Design

Material Design 3 在组件库 MDC Web 中引入容器查询：

```css
/* Material Design 3 风格 */
.md-card {
  container-type: inline-size;
}

@container (min-width: 360px) {
  .md-card__primary {
    padding: 16px;
  }
}

@container (min-width: 600px) {
  .md-card__primary {
    padding: 24px;
  }
}
```

---

## 7. 常见陷阱与最佳实践

### 7.1 陷阱 1：`container-type: size` 导致高度塌陷

**问题代码**：

```css
.card-container {
  container-type: size;
  /* 未设置高度，导致容器高度为 0 */
}
.card-container .card {
  height: 200px;
}
```

**问题**：`container-type: size` 隐式触发 `contain: size`，使容器高度不再被子元素撑开，导致高度为 0。

**解决方案**：

```css
/* 方案 1：使用 inline-size（推荐） */
.card-container {
  container-type: inline-size;
}

/* 方案 2：显式设置高度 */
.card-container {
  container-type: size;
  height: 400px;
}
```

### 7.2 陷阱 2：忘记声明 `container-type`

**问题代码**：

```css
.card-wrapper {
  /* 忘记写 container-type */
}

@container (min-width: 400px) {
  .card { /* 永不匹配！ */ }
}
```

**解决方案**：

```css
.card-wrapper {
  container-type: inline-size;
  /* 或简写：container: inline-size */
}
```

### 7.3 陷阱 3：SSR 场景下的布局抖动

**问题**：服务端渲染时，容器尺寸未知，`@container` 规则无法预先评估。客户端 hydration 后，容器尺寸变化可能导致布局抖动（CLS）。

**解决方案**：

```html
<!-- 1. 提供默认样式（不依赖容器） -->
<style>
  .card {
    display: flex;
    flex-direction: column;
  }
</style>

<!-- 2. 客户端 hydration 后再应用容器查询 -->
<style>
  @supports (container-type: inline-size) {
    .card-container {
      container-type: inline-size;
    }
    @container (min-width: 400px) {
      .card {
        flex-direction: row;
      }
    }
  }
</style>
```

### 7.4 陷阱 4：`@container` 与 `@media` 混淆

**错误代码**：

```css
/* 错误：@container 中使用视口单位 */
@container (min-width: 100vw) {
  .card { /* 永不匹配！ */ }
}

/* 错误：@media 中使用容器单位 */
@media (min-width: 100cqw) {
  .card { /* 永不匹配！ */ }
}
```

**正确用法**：

```css
/* @container 使用容器尺寸 */
@container (min-width: 400px) {
  .card { /* ... */ }
}

/* @media 使用视口尺寸 */
@media (min-width: 768px) {
  .card { /* ... */ }
}
```

### 7.5 陷阱 5：嵌套容器未命名

**问题代码**：

```css
.outer { container-type: inline-size; }
.inner { container-type: inline-size; }

@container (min-width: 800px) {
  .card { /* 匹配 .inner（最近的），而非 .outer */ }
}
```

**解决方案**：

```css
.outer {
  container-type: inline-size;
  container-name: outer;
}
.inner {
  container-type: inline-size;
  container-name: inner;
}

@container outer (min-width: 800px) {
  .card { /* 精确匹配 .outer */ }
}
```

### 7.6 最佳实践清单

1. **优先使用 `inline-size`**：除非需要查询高度，否则使用 `inline-size` 而非 `size`。
2. **为嵌套容器命名**：使用 `container-name` 避免歧义。
3. **提供默认样式**：在 `@container` 规则外提供基础样式，兼容旧浏览器。
4. **配合 `@supports`**：使用特性查询渐进增强。
5. **使用 `cqi` 单位**：响应式字体优先用 `cqi` 而非 `vw`。
6. **避免 `size` 容器内子元素撑高**：`size` 容器必须显式高度。
7. **SSR 谨慎使用**：容器查询在 SSR 下不友好，需配合 hydration 策略。
8. **测试 CLS**：使用 Lighthouse 检查容器查询导致的布局抖动。
9. **Storybook 测试**：在各种容器尺寸下进行视觉回归。
10. **文档化容器边界**：在组件文档中说明容器查询的断点。

### 7.7 兼容性参考

| 特性 | Chrome | Firefox | Safari | Edge |
| --- | --- | --- | --- | --- |
| `container-type` | 105+ | 110+ | 16+ | 105+ |
| `container-name` | 105+ | 110+ | 16+ | 105+ |
| `@container` 尺寸查询 | 105+ | 110+ | 16+ | 105+ |
| `cqw` / `cqi` 单位 | 105+ | 110+ | 16+ | 105+ |
| `container-name` 命名 | 105+ | 110+ | 16+ | 105+ |
| Style Queries `style()` | 111+（部分） | 不支持 | 不支持 | 111+（部分） |
| Tailwind `@container` 插件 | 需 v3.4+ | 需 v3.4+ | 需 v3.4+ | 需 v3.4+ |

---

## 8. 工程实践

### 8.1 PostCSS 容器查询 polyfill

```javascript
// postcss.config.js
module.exports = {
  plugins: [
    require('postcss-preset-env')({
      stage: 2,
      features: {
        'container-queries': true,
      },
    }),
  ],
};
```

### 8.2 设计令牌：容器断点系统

```css
:root {
  /* 容器断点 */
  --container-sm: 240px;
  --container-md: 400px;
  --container-lg: 600px;
  --container-xl: 800px;
}

.card-container {
  container-type: inline-size;
}

@container (min-width: var(--container-md)) {
  .card {
    /* ... */
  }
}
```

### 8.3 SCSS 工具 mixin

```scss
// _container-queries.scss
@mixin container($name: none) {
  container-type: inline-size;
  @if $name != none {
    container-name: $name;
  }
}

@mixin cq($condition, $name: null) {
  @if $name {
    @container #{$name} #{$condition} {
      @content;
    }
  } @else {
    @container #{$condition} {
      @content;
    }
  }
}

// 使用
.card-wrapper {
  @include container(card);
}

.card {
  display: flex;
  flex-direction: column;

  @include cq('(min-width: 400px)', card) {
    flex-direction: row;
  }
}
```

### 8.4 Tailwind 配置

```javascript
// tailwind.config.js
module.exports = {
  plugins: [
    require('@tailwindcss/container-queries'),
  ],
  theme: {
    extend: {
      containers: {
        sm: '240px',
        md: '400px',
        lg: '600px',
      },
    },
  },
};
```

### 8.5 性能优化

1. **避免 `size` 容器**：除非必须，使用 `inline-size` 减少布局开销。
2. **限制容器数量**：每个 `container-type` 都会创建独立的布局上下文，过多会降低性能。
3. **使用 `contain` 优化**：在不需查询的容器上使用 `contain: layout` 提升性能。
4. **避免深嵌套**：嵌套容器会增加布局复杂度。
5. **CSS Containment**：使用 `contain: layout paint` 隔离组件。

```css
.component {
  contain: layout paint; /* 隔离布局与绘制 */
}
```

### 8.6 调试工具

1. **Chrome DevTools 105+**：在 Elements 面板显示 `@container` 标记。
2. **Firefox DevTools**：盒模型可视化中显示容器边界。
3. **Safari Web Inspector**：CSS 编辑器支持 `@container` 语法高亮。
4. **VS Code 插件**：CSS Language Service 支持 `@container` 智能补全。

### 8.7 自动化测试

```javascript
// container-queries.test.js
const { test, expect } = require('@playwright/test');

test('卡片在窄容器下垂直布局', async ({ page }) => {
  await page.goto('http://localhost:3000/card');
  await page.setViewportSize({ width: 800, height: 600 });

  // 设置容器宽度为 300px
  await page.locator('.card-container').evaluate((el) => {
    el.style.width = '300px';
  });

  const card = await page.locator('.card').first();
  const flexDirection = await card.evaluate(
    (el) => getComputedStyle(el).flexDirection
  );

  expect(flexDirection).toBe('column');
});

test('卡片在宽容器下水平布局', async ({ page }) => {
  await page.goto('http://localhost:3000/card');

  await page.locator('.card-container').evaluate((el) => {
    el.style.width = '500px';
  });

  const card = await page.locator('.card').first();
  const flexDirection = await card.evaluate(
    (el) => getComputedStyle(el).flexDirection
  );

  expect(flexDirection).toBe('row');
});
```

### 8.8 ESLint 规则（CSS-in-JS）

```javascript
// .stylelintrc.js
module.exports = {
  rules: {
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: ['container', 'media', 'supports'],
      },
    ],
    'custom-property-pattern': '^--[a-z][a-z0-9-]*$',
  },
};
```

---

## 9. 案例研究

### 9.1 案例一：Bootstrap 5.3 的容器查询实践

Bootstrap 5.3 在部分组件中引入容器查询，例如卡片组件：

```scss
// bootstrap/scss/_card.scss
.card {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .card-body {
    padding: 1.5rem;
  }
  .card-title {
    font-size: 1.25rem;
  }
}
```

**分析**：
- Bootstrap 5.3 仍以媒体查询为主，容器查询为辅。
- 通过容器查询，卡片组件在不同栅格列中表现一致。

### 9.2 案例二：Tailwind CSS 的 `@container` 插件

Tailwind v3.4 提供 `@tailwindcss/container-queries` 插件：

```html
<div class="@container">
  <div class="flex flex-col @md:flex-row">
    <div class="@md:w-1/3">媒体</div>
    <div class="@md:w-2/3">内容</div>
  </div>
</div>
```

生成的 CSS：

```css
.\@container {
  container-type: inline-size;
}
@\container (min-width: 28rem) {
  .\@md\:flex-row {
    flex-direction: row;
  }
}
```

**分析**：
- 使用 `@` 前缀避免与媒体查询 `md:` 冲突。
- 断点（`@sm`、`@md`、`@lg`）与媒体查询断点一致。

### 9.3 案例三：Material Design 3 的容器查询

Material Design 3 在 MDC Web 中使用容器查询：

```css
/* MDC Card */
.mdc-card {
  container-type: inline-size;
}

@container (min-width: 360px) {
  .mdc-card__primary {
    padding: 16px;
  }
}

@container (min-width: 600px) {
  .mdc-card__primary {
    padding: 24px;
  }
}
```

**分析**：
- 遵循 Material Design 的 8dp 网格。
- 卡片在 Drawer、Modal、Full-screen 三种容器中表现一致。

### 9.4 案例四：GitHub Primer 的容器查询

GitHub Primer 在部分组件中使用容器查询：

```css
.primer-card {
  container-type: inline-size;
}

@container (min-width: 360px) {
  .primer-card__body {
    padding: 16px;
  }
}
```

### 9.5 案例五：Ant Design 的容器查询

Ant Design v5 部分组件支持容器查询：

```css
.ant-card {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .ant-card-body {
    padding: 24px;
  }
}
```

### 9.6 案例六：真实生产实践

**场景**：某新闻网站的文章卡片，可能出现在侧栏（240px）、主内容区（640px）、全屏 Modal（1200px）三种场景。

**传统方案**：

```jsx
// 需要根据父组件传递 variant prop
<Card variant="sidebar" />     // 240px
<Card variant="main" />        // 640px
<Card variant="modal" />       // 1200px
```

**容器查询方案**：

```jsx
// 同一组件，自适应容器
<Card />
```

```css
.card-container {
  container-type: inline-size;
}

@container (min-width: 200px) and (max-width: 400px) {
  .card { /* sidebar 样式 */ }
}
@container (min-width: 400px) and (max-width: 800px) {
  .card { /* main 样式 */ }
}
@container (min-width: 800px) {
  .card { /* modal 样式 */ }
}
```

**收益**：
- 组件复用性大幅提升。
- 无需为每个场景编写不同组件。
- 维护成本降低 60%。

---

## 10. 习题

### 10.1 选择题

**题目 1**：容器查询的核心优势是什么？

A. 比 `@media` 性能更好
B. 组件能感知自身容器尺寸而非视口
C. 替代 JavaScript 的 ResizeObserver
D. 支持所有浏览器

<details>
<summary>答案与解析</summary>

**答案：B**

**解析**：容器查询的核心优势是让组件能感知自身容器的尺寸，从而实现真正的组件级响应式设计。这与媒体查询（基于视口）有本质区别。

- A：容器查询与媒体查询性能相当，并非优势。
- C：容器查询无法完全替代 ResizeObserver（后者支持复杂逻辑）。
- D：旧浏览器不支持（需 polyfill）。

</details>

**题目 2**：`container-type: size` 与 `container-type: inline-size` 的关键差异是？

A. `size` 仅查询宽度，`inline-size` 查询宽高
B. `size` 查询宽高，`inline-size` 仅查询 inline 方向
C. `size` 性能更好
D. 两者完全相同

<details>
<summary>答案与解析</summary>

**答案：B**

**解析**：`container-type: size` 允许查询容器的宽与高，但会触发 `contain: size`，导致容器高度必须显式设置。`inline-size` 仅查询 inline 方向（通常是宽度），容器高度仍可被子元素撑开。

</details>

**题目 3**：以下哪个单位是相对于容器 inline 方向的 1%？

A. `vw`
B. `cqw`
C. `cqi`
D. `cqh`

<details>
<summary>答案与解析</summary>

**答案：C**

**解析**：`cqi`（container query inline）是容器 inline 方向的 1%。`cqw` 是宽度的 1%，`cqh` 是高度的 1%。在水平书写模式下，`cqi` 等价于 `cqw`。

</details>

**题目 4**：以下哪种写法在 `@container` 中是**无效**的？

A. `@container (min-width: 400px)`
B. `@container card (min-width: 400px)`
C. `@container style(--theme: dark)`
D. `@container (min-viewport-width: 400px)`

<details>
<summary>答案与解析</summary>

**答案：D**

**解析**：`@container` 仅支持查询容器自身的尺寸或样式，不支持视口相关条件。`min-viewport-width` 不是有效的容器查询条件。

- A：尺寸查询，有效。
- B：命名容器查询，有效。
- C：样式查询（实验性），有效。

</details>

**题目 5**：以下哪种情况会触发循环依赖问题？

A. `container-type: inline-size` 容器内查询宽度
B. `container-type: size` 容器内查询高度
C. 不声明 `container-type` 的容器
D. 命名容器嵌套

<details>
<summary>答案与解析</summary>

**答案：C**

**解析**：未声明 `container-type` 的容器不会触发 `contain`，若尝试查询其尺寸，子元素样式变化可能回流影响容器尺寸，形成循环。这正是 CSS Containment 通过 `container-type` 解决的问题。

</details>

### 10.2 填空题

**题目 1**：容器查询的规范属于 CSS ________ Module Level 3。

<details>
<summary>答案与解析</summary>

**答案**：Containment

**解析**：容器查询规范归入 [CSS Containment Module Level 3](https://www.w3.org/TR/css-contain-3/)。

</details>

**题目 2**：声明 `container-type: size` 会隐式触发 `contain: ________`。

<details>
<summary>答案与解析</summary>

**答案**：`size`

**解析**：`container-type: size` 隐式触发 `contain: size`，使容器尺寸不受子元素影响，从而打破循环依赖。

</details>

**题目 3**：`cqi` 单位的全称是 ________。

<details>
<summary>答案与解析</summary>

**答案**：container query inline

**解析**：`cqi` 全称为 container query inline，是容器 inline 方向尺寸的 1%。

</details>

**题目 4**：容器查询的命名属性是 ________。

<details>
<summary>答案与解析</summary>

**答案**：`container-name`

**解析**：`container-name` 属性为容器命名，用于在嵌套场景下精确匹配 `@container` 规则。

</details>

**题目 5**：Style Queries 使用 `________()` 函数查询容器的 CSS 变量。

<details>
<summary>答案与解析</summary>

**答案**：`style`

**解析**：Style Queries 使用 `style()` 函数查询容器的 CSS 变量，例如 `@container style(--theme: dark)`。

</details>

### 10.3 编程题

**题目 1**：实现一个响应式导航栏组件，要求：

1. 窄容器（< 400px）：垂直堆叠，菜单折叠为汉堡按钮。
2. 中等容器（400-700px）：水平排列，菜单展开。
3. 宽容器（> 700px）：水平排列，菜单展开并显示搜索框。

<details>
<summary>参考答案</summary>

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>响应式导航栏</title>
<style>
  .nav-container {
    container-type: inline-size;
    container-name: nav;
    background: #1a1a1a;
    padding: 1rem;
  }

  .nav {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .nav__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .nav__brand {
    color: white;
    font-size: 1.25rem;
    font-weight: bold;
  }

  .nav__toggle {
    display: block;
    background: transparent;
    border: none;
    color: white;
    font-size: 1.5rem;
    cursor: pointer;
  }

  .nav__menu {
    display: none;
    flex-direction: column;
    gap: 0.5rem;
  }

  .nav__menu a {
    color: white;
    text-decoration: none;
    padding: 0.5rem;
    border-radius: 4px;
  }

  .nav__menu a:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .nav__search {
    display: none;
  }

  /* 中等容器：水平布局 */
  @container nav (min-width: 400px) {
    .nav {
      flex-direction: row;
      align-items: center;
      gap: 2rem;
    }
    .nav__toggle {
      display: none;
    }
    .nav__menu {
      display: flex;
      flex-direction: row;
      gap: 1rem;
    }
  }

  /* 宽容器：显示搜索框 */
  @container nav (min-width: 700px) {
    .nav__search {
      display: block;
      margin-left: auto;
    }
    .nav__search input {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      border: none;
      background: rgba(255, 255, 255, 0.1);
      color: white;
      width: 200px;
    }
  }
</style>
</head>
<body>
  <div class="nav-container" style="width: 300px;">
    <nav class="nav">
      <div class="nav__header">
        <div class="nav__brand">Brand</div>
        <button class="nav__toggle">☰</button>
      </div>
      <div class="nav__menu">
        <a href="#">首页</a>
        <a href="#">产品</a>
        <a href="#">关于</a>
      </div>
      <div class="nav__search">
        <input type="search" placeholder="搜索...">
      </div>
    </nav>
  </div>

  <div class="nav-container" style="width: 500px; margin-top: 20px;">
    <nav class="nav">
      <div class="nav__header">
        <div class="nav__brand">Brand</div>
        <button class="nav__toggle">☰</button>
      </div>
      <div class="nav__menu">
        <a href="#">首页</a>
        <a href="#">产品</a>
        <a href="#">关于</a>
      </div>
      <div class="nav__search">
        <input type="search" placeholder="搜索...">
      </div>
    </nav>
  </div>

  <div class="nav-container" style="width: 800px; margin-top: 20px;">
    <nav class="nav">
      <div class="nav__header">
        <div class="nav__brand">Brand</div>
        <button class="nav__toggle">☰</button>
      </div>
      <div class="nav__menu">
        <a href="#">首页</a>
        <a href="#">产品</a>
        <a href="#">关于</a>
      </div>
      <div class="nav__search">
        <input type="search" placeholder="搜索...">
      </div>
    </nav>
  </div>
</body>
</html>
```

**评分要点**：
- 使用 `container-type: inline-size`（+10 分）
- 使用 `container-name` 命名（+5 分）
- 三个断点的样式切换（+10 分）
- 默认样式（窄容器）正确（+5 分）

</details>

**题目 2**：修复以下代码中的错误：

```css
.card-container {
  container-type: size;
}
.card-container .card {
  height: 200px;
}
@container (min-height: 300px) {
  .card-container .card {
    height: 400px;
  }
}
```

<details>
<summary>参考答案</summary>

**问题**：`container-type: size` 触发 `contain: size`，但容器未显式设置高度，导致容器高度为 0，`@container (min-height: 300px)` 永不匹配。

**解决方案**：

```css
.card-container {
  container-type: size;
  height: 500px; /* 显式设置高度 */
}
.card-container .card {
  height: 200px;
}
@container (min-height: 300px) {
  .card-container .card {
    height: 400px;
  }
}
```

或者改用 `inline-size`（仅查询宽度）：

```css
.card-container {
  container-type: inline-size;
  /* 高度仍可被子元素撑开 */
}
.card-container .card {
  height: 200px;
}
@container (min-width: 400px) {
  .card-container .card {
    height: 400px;
  }
}
```

</details>

**题目 3**：使用容器查询实现一个响应式图片网格：

1. 窄容器（< 400px）：单列。
2. 中等容器（400-700px）：双列。
3. 宽容器（> 700px）：三列。

<details>
<summary>参考答案</summary>

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>响应式图片网格</title>
<style>
  .grid-container {
    container-type: inline-size;
    container-name: grid;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .grid__item {
    aspect-ratio: 1;
    background: linear-gradient(135deg, #667eea, #764ba2);
    border-radius: 8px;
  }

  @container grid (min-width: 400px) {
    .grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @container grid (min-width: 700px) {
    .grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
</style>
</head>
<body>
  <div class="grid-container" style="width: 300px;">
    <div class="grid">
      <div class="grid__item"></div>
      <div class="grid__item"></div>
      <div class="grid__item"></div>
      <div class="grid__item"></div>
      <div class="grid__item"></div>
      <div class="grid__item"></div>
    </div>
  </div>

  <div class="grid-container" style="width: 500px; margin-top: 20px;">
    <div class="grid">
      <div class="grid__item"></div>
      <div class="grid__item"></div>
      <div class="grid__item"></div>
      <div class="grid__item"></div>
      <div class="grid__item"></div>
      <div class="grid__item"></div>
    </div>
  </div>

  <div class="grid-container" style="width: 800px; margin-top: 20px;">
    <div class="grid">
      <div class="grid__item"></div>
      <div class="grid__item"></div>
      <div class="grid__item"></div>
      <div class="grid__item"></div>
      <div class="grid__item"></div>
      <div class="grid__item"></div>
    </div>
  </div>
</body>
</html>
```

</details>

### 10.4 思考题

**题目 1**：容器查询是否会取代媒体查询？请论证你的观点。

<details>
<summary>参考答案</summary>

**观点**：容器查询不会完全取代媒体查询，两者将共存。

**论据**：
1. **适用场景不同**：媒体查询适用于「页面级」布局（如导航栏、整体布局），容器查询适用于「组件级」布局（如卡片、表格）。
2. **SSR 友好性**：媒体查询在 SSR 下表现更好（视口尺寸已知），容器查询在 SSR 下有局限。
3. **特性查询不同**：媒体查询支持 `prefers-color-scheme`、`prefers-reduced-motion` 等用户偏好查询，容器查询不支持。
4. **未来共存**：媒体查询负责「视口级」响应式，容器查询负责「组件级」响应式，互补而非替代。

**结论**：新项目应优先使用容器查询管理组件级响应式，保留媒体查询用于视口级布局与用户偏好。

</details>

**题目 2**：在 SSR 场景下，如何处理容器查询的布局抖动问题？

<details>
<summary>参考答案</summary>

**问题**：服务端渲染时，容器尺寸未知，`@container` 规则无法预先评估。客户端 hydration 后，容器尺寸变化可能导致布局抖动（CLS）。

**解决方案**：

1. **提供默认样式**：在 `@container` 规则外提供基础样式，确保 SSR 渲染结果可用。
2. **使用 `@supports` 渐进增强**：仅在支持容器查询的浏览器中应用 `@container` 规则。
3. **关键 CSS 内联**：将首屏样式内联到 HTML，减少 CLS。
4. **占位符策略**：为容器设置 `min-height` 占位符，避免 hydration 后高度变化。
5. **客户端检测**：使用 JS 检测容器尺寸，动态添加类名。

```html
<!-- SSR 默认样式 -->
<style>
  .card {
    display: flex;
    flex-direction: column;
    min-height: 200px; /* 占位符 */
  }
</style>

<!-- 客户端容器查询 -->
<style>
  @supports (container-type: inline-size) {
    .card-container {
      container-type: inline-size;
    }
    @container (min-width: 400px) {
      .card {
        flex-direction: row;
      }
    }
  }
</style>
```

</details>

**题目 3**：设计一套基于容器查询的设计系统，要求支持主题切换、响应式字体、可访问性。

<details>
<summary>参考答案</summary>

**设计方案**：

1. **设计令牌层**：
```css
:root {
  /* 容器断点 */
  --container-sm: 240px;
  --container-md: 400px;
  --container-lg: 600px;

  /* 主题 */
  --bg: #ffffff;
  --text: #212529;
}

[data-theme="dark"] {
  --bg: #1a1a1a;
  --text: #f8f9fa;
}
```

2. **容器查询包装器**：
```css
.cq-container {
  container-type: inline-size;
  container-name: cq;
}
```

3. **响应式字体**：
```css
.cq-title {
  font-size: clamp(1rem, 5cqi, 2rem);
  line-height: 1.2;
}
```

4. **响应式布局**：
```css
.cq-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@container cq (min-width: 400px) {
  .cq-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

5. **可访问性**：
```css
@media (prefers-reduced-motion: reduce) {
  .cq-grid {
    transition: none;
  }
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1a1a1a;
    --text: #f8f9fa;
  }
}
```

6. **自动化测试**：
- Storybook 测试各种容器尺寸
- Chromatic 视觉回归
- Playwright CLS 检测

</details>

---

## 11. 参考文献

### 11.1 W3C 规范

[1] Miriam Suzanne and Tab Atkins Jr. 2024. *CSS Containment Module Level 3*. W3C Working Draft. Retrieved from https://www.w3.org/TR/css-contain-3/

[2] Tab Atkins Jr., Elika Etemad, and Florian Rivoal. 2022. *CSS Containment Module Level 1*. W3C Recommendation. Retrieved from https://www.w3.org/TR/css-contain-1/

[3] Miriam Suzanne. 2023. *Container Queries Level 3*. W3C Working Draft. Retrieved from https://drafts.csswg.org/css-contain-3/

[4] Florian Rivoal. 2022. *CSS Conditional Rules Module Level 3*. W3C Candidate Recommendation. Retrieved from https://www.w3.org/TR/css-conditional-3/

### 11.2 学术论文与文章

[5] Suzanne, M. 2021. *Container Queries: A Quick Start Guide*. CSS-Tricks. Retrieved from https://css-tricks.com/container-queries-a-quick-start-guide/

[6] Atkins, T. 2021. *CSS Containment Level 3: Container Queries*. W3C Editor's Draft. Retrieved from https://drafts.csswg.org/css-contain-3/

[7] Verou, L. 2022. *CSS Variables and Container Queries*. Smashing Magazine. Retrieved from https://www.smashingmagazine.com/2022/css-variables-container-queries/

### 11.3 在线资源

[8] MDN Web Contributors. 2024. *CSS Container Queries*. MDN Web Docs. Retrieved from https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries

[9] MDN Web Contributors. 2024. *Using container size and style queries*. MDN Web Docs. Retrieved from https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_size_and_style_queries

[10] Chrome Team. 2022. *Container Queries in Chrome 105*. Chromium Blog. Retrieved from https://blog.chromium.org/2022/08/chrome-105-container-queries.html

[11] WebKit Team. 2022. *Container Queries in Safari 16*. WebKit Blog. Retrieved from https://webkit.org/blog/13188/webkit-features-in-safari-16-0/

### 11.4 框架文档

[12] Tailwind Labs. 2024. *Tailwind CSS Container Queries Plugin*. Retrieved from https://github.com/tailwindlabs/tailwindcss-container-queries

[13] Bootstrap Team. 2024. *Bootstrap 5.3 Container Queries*. Retrieved from https://getbootstrap.com/docs/5.3/layout/css-grid/

[14] Google. 2024. *Material Design 3 Container Queries*. Retrieved from https://m3.material.io/foundations/layout/applying-layout/window-size-classes

### 11.5 引用规范

本文引用遵循 ACM Reference Format：

> Author(s). Year. *Title*. Publisher/Venue. DOI or URL.

示例：
> Suzanne, M. and Atkins, T. Jr. 2024. CSS Containment Module Level 3. W3C Working Draft. Retrieved from https://www.w3.org/TR/css-contain-3/

---

## 12. 延伸阅读

### 12.1 书籍

1. **《CSS in Depth》** — Keith J. Grant 著
   - 第 2 版深入讲解容器查询与现代 CSS。

2. **《CSS Secrets》** — Lea Verou 著
   - CSS 高级技巧，包含布局与响应式。

3. **《Every Layout》** — Heydon Pickering 与 Andy Bell 著
   - 重新思考布局模式，包含容器查询实践。

4. **《Modern CSS》** — Joe Liang 著
   - 现代 CSS 实战指南，覆盖容器查询、CSS 变量等。

### 12.2 论文与文章

1. **Miriam Suzanne. 2021. *Container Queries: The End of Responsive Design as We Know It*. A List Apart.**
   - 容器查询的设计动机与未来。

2. **Una Kravets. 2022. *Container Queries are Actually Coming*. CSS-Tricks.**
   - 容器查询的实战指南。

3. **Bramus. 2022. *Container Queries in Chrome 105*. web.dev.**
   - Chrome 实现细节与性能分析。

### 12.3 在线资源

1. **MDN Web Docs** — https://developer.mozilla.org/
   - 容器查询权威文档。

2. **CSS-Tricks Container Queries Almanac** — https://css-tricks.com/almanac/
   - 容器查询实战文章集。

3. **web.dev Container Queries** — https://web.dev/articles/container-queries
   - Google 出品的容器查询指南。

4. **Can I Use Container Queries** — https://caniuse.com/css-container-queries
   - 浏览器兼容性查询。

5. **Container Queries Playground** — https://labs.containerqueries.com/
   - 在线容器查询实验场。

### 12.4 视频课程

1. **Frontend Masters: CSS Container Queries** — Una Kravets
   - 容器查询深度课程。

2. **Container Queries: From Zero to Hero** — Kevin Powell
   - YouTube 上的容器查询实战教程。

3. **CSS for JavaScript Developers** — Josh W. Comeau
   - 包含容器查询章节。

### 12.5 工具与资源

1. **PostCSS Container Queries** — https://github.com/postcss/postcss-preset-env
   - PostCSS 插件，提供容器查询 polyfill。

2. **@tailwindcss/container-queries** — https://github.com/tailwindlabs/tailwindcss-container-queries
   - Tailwind 容器查询插件。

3. **Storybook** — https://storybook.js.org/
   - 组件开发工具，便于测试容器查询。

4. **Chromatic** — https://www.chromatic.com/
   - 视觉回归测试服务。

5. **Playwright** — https://playwright.dev/
   - 端到端测试框架，支持容器尺寸模拟。

---

## 附录 A：术语表

| 术语 | 英文 | 定义 |
| --- | --- | --- |
| 容器查询 | Container Query | 根据容器尺寸应用样式的 CSS 规则 |
| 容器类型 | container-type | 声明元素为查询容器的属性 |
| 容器名称 | container-name | 为容器命名，支持嵌套查询 |
| 内联尺寸 | inline-size | 容器的行内方向尺寸（通常是宽度） |
| 块尺寸 | block-size | 容器的块方向尺寸（通常是高度） |
| 样式查询 | Style Query | 查询容器 CSS 变量或计算样式的容器查询 |
| `cqw` | container query width | 容器宽度的 1% |
| `cqh` | container query height | 容器高度的 1% |
| `cqi` | container query inline | 容器 inline 方向的 1% |
| `cqb` | container query block | 容器 block 方向的 1% |
| 循环依赖 | Circular dependency | 元素样式与尺寸互相影响的死循环 |
| CSS Containment | CSS 包含 | 隔离元素渲染的 CSS 属性 |

## 附录 B：浏览器兼容性速查表

| 特性 | Chrome | Firefox | Safari | Edge |
| --- | --- | --- | --- | --- |
| `container-type` | 105+ | 110+ | 16+ | 105+ |
| `container-name` | 105+ | 110+ | 16+ | 105+ |
| `@container` 尺寸查询 | 105+ | 110+ | 16+ | 105+ |
| `cqw` / `cqi` 单位 | 105+ | 110+ | 16+ | 105+ |
| 命名容器 | 105+ | 110+ | 16+ | 105+ |
| Style Queries | 111+（部分） | 不支持 | 17+（部分） | 111+（部分） |
| DevTools 支持 | 105+ | 110+ | 16+ | 105+ |

## 附录 C：容器查询 Checklist

设计与开发容器查询时，按以下顺序检查：

1. [ ] 确认是否真的需要容器查询（组件复用场景）
2. [ ] 优先使用 `container-type: inline-size`
3. [ ] 为嵌套容器使用 `container-name` 命名
4. [ ] 提供 `@container` 规则外的基础样式
5. [ ] 使用 `@supports (container-type: inline-size)` 渐进增强
6. [ ] SSR 场景考虑布局抖动（CLS）
7. [ ] 使用 `cqi` 单位实现响应式字体
8. [ ] 配合 `clamp()` 限制字体范围
9. [ ] 在 Storybook 中测试各种容器尺寸
10. [ ] 检查 Lighthouse CLS 指标
11. [ ] 文档化容器查询断点
12. [ ] 避免过度嵌套容器
13. [ ] 性能测试：避免 `size` 容器导致布局开销
14. [ ] 检查 `prefers-reduced-motion` 适配

---

> 本文最后更新于 2026-06-14，内容基于 W3C CSS Containment Module Level 3（2024 Working Draft）。如规范更新，请以 W3C 最新发布为准。
