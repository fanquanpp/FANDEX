---
order: 90
title: CSS 重置与 normalize
module: 'css'
category: 前端技术
difficulty: intermediate
description: 浏览器默认样式差异的来源，以及 reset、normalize、现代重置方案的选择与写法。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'css/004-CSS3BoxModelDetailed'
  - 'css/011-CascadeInheritanceBasics'
  - 'css/058-BEMNamingMethodology'
prerequisites:
  - 'css/002-CSS3OverviewBasicSyntax'
  - 'css/008-CSS3SelectorSystem'
---

## 0. 直觉：浏览器给 HTML 元素“预装了默认样式”

`h1` 为什么比 `p` 大？`ul` 为什么有缩进？按钮为什么有边框？因为浏览器内置了用户代理样式（user agent stylesheet）。问题是各家默认样式不完全一致，所以项目开头通常要“清场”或“统一”，这就是 CSS 重置。

## 1. 为什么需要重置

```css
/* 没有重置时，不同浏览器对同一元素可能有细微差异 */
/* 例如 button 的默认 padding、字体、背景在不同浏览器不同 */
```

**讲解：** 重置解决两类问题：一是跨浏览器差异，二是默认样式（如 `h1` 外边距）干扰设计系统。但“全部清零”会丢掉有用的语义默认值，所以现代方案从“清空”走向“统一基线”。

## 2. 经典 reset：全部归零

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
```

**讲解：** 经典 reset 简单粗暴，把常见默认值清零。缺点是 `*` 选择器性能与继承语义欠佳，而且把所有 `h1`-`h6` 都抹成一样大小后，需要自己重建层级。

## 3. normalize.css：保留有用默认值

normalize.css 的思路不是清空，而是“把各浏览器默认样式拉齐”：

```css
/* 示例（normalize.css 片段风格） */
html {
  line-height: 1.15;            /* 统一行高 */
  -webkit-text-size-adjust: 100%; /* 禁止横屏自动放大字号 */
}
body {
  margin: 0;
}
```

**讲解：** normalize 保留 `h1` 层级、列表缩进等语义默认值，只修差异。适合“希望浏览器默认值作为设计起点”的项目；代价是文件里有些规则你可能永远用不到。

## 4. 现代重置：兼顾基线与语义

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, "PingFang SC", "Microsoft YaHei", sans-serif;
  line-height: 1.5;
  color: #333;
  -webkit-font-smoothing: antialiased;
}

img,
picture,
video {
  display: block;
  max-width: 100%;
}

button,
input,
textarea,
select {
  font: inherit;   /* 表单控件跟随页面字体 */
}

ul[role="list"],
ol[role="list"] {
  list-style: none;
}
```

**讲解：** 现代重置（如 Andy Bell 的现代 CSS Reset 思路）只做四件事：统一盒模型、去掉 body 外边距、媒体元素自适应、表单继承字体。保留标题层级与列表语义，配合 `role` 控制无标记列表。

## 5. 三种方案如何选

| 方案 | 思路 | 适用场景 |
| --- | --- | --- |
| 经典 reset | 全部清零 | 从零搭建、默认值不想要 |
| normalize.css | 拉齐差异 | 依赖浏览器默认语义 |
| 现代重置 | 最小统一 | 设计系统/组件库首选 |

**讲解：** 现代项目推荐“现代重置 + 设计令牌（CSS 变量）”，框架项目（Tailwind 等）自带预置，通常不需要再引 normalize。工程化细节见 `css/044-CSSArchitectureMethodology`。

## 6. 动手试试

1. 不写任何 CSS，对比 Chrome 与 Edge（或手机浏览器）中同一页面的默认间距差异；
2. 分别应用经典 reset 与现代重置，对比 `h1` 大小、列表缩进、按钮字体的变化；
3. 给 `<img>` 加 `display: block; max-width: 100%`，观察图片底部间隙消失；
4. 进阶挑战：为你的项目写一份 20 行以内的“现代重置”，并注释每行的目的。

## 7. 核心知识点

> 一句话记住重置方案：reset 全清零，normalize 拉齐差异，现代重置只统一基线；盒模型统一 + 媒体自适应 + 表单继承字体是底线。

- 浏览器默认样式是用户代理样式，优先级最低；
- 经典 reset：`* { margin: 0; padding: 0 }`，简单但粗暴；
- normalize.css：保留语义默认值，只修差异；
- 现代重置：统一盒模型、图片块级化、表单继承字体；
- `box-sizing: border-box` 全局统一是重置的核心项；
- 框架项目自带预置，不必重复引入。

## 8. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 重置后又把默认值写回来 | 重复劳动 | 先列设计基线，再决定重置范围 |
| `* { margin:0 }` 破坏间距语义 | 所有元素都需重设间距 | 用现代重置 + 间距令牌 |
| 引入 normalize 又手写 reset | 规则冲突难排查 | 二选一，推荐现代重置 |
| 重置文件放最后 | 覆盖自己的业务样式 | 重置必须放最前，未分层时会被业务覆盖 |

## 9. 扩展学习

- 盒模型与 box-sizing：`css/004-CSS3BoxModelDetailed`；
- 继承与层叠：`css/011-CascadeInheritanceBasics`；
- 层叠层 @layer（重置入层）：`css/040-CascadeLayer`；
- 架构方法论：`css/044-CSSArchitectureMethodology`。
