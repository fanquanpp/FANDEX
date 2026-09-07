---
order: 510
title: CSS 锚点定位
module: 'css'
category: 前端技术
difficulty: advanced
description: 用 anchor 属性把元素相对另一个元素定位，替代“JS 测量 + 绝对定位”的弹层方案。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'css/015-PositionDetailed'
  - 'css/023-CSS3GridGridLayout'
  - 'css/065-CSSNewFeatures'
prerequisites:
  - 'css/015-PositionDetailed'
  - 'css/002-CSS3OverviewBasicSyntax'
---

## 0. 直觉：让弹层“钉”在触发按钮旁边

做 tooltip、下拉菜单、气泡弹层时，传统做法是 JS 测量按钮位置再计算弹层坐标，滚动/缩放后还要重新计算。CSS 锚点定位（Anchor Positioning）让弹层直接声明“我相对哪个元素、放在哪一侧”，浏览器自动跟随。

## 1. 基本用法

```html
<button class="trigger">菜单</button>
<div class="popover">选项一 / 选项二</div>
```

```css
.trigger {
  anchor-name: --trigger;
}

.popover {
  position: absolute;
  position-anchor: --trigger;
  inset-area: bottom;   /* 放在锚点下方 */
}
```

**讲解：** 锚点元素用 `anchor-name` 命名（必须以 `--` 开头），弹层用 `position-anchor` 引用，再通过 `inset-area` 指定相对方位（`top`/`bottom`/`left`/`right` 及组合）。

## 2. inset-area 方位

```css
.tooltip {
  position: absolute;
  position-anchor: --trigger;
  inset-area: top center;       /* 上方居中 */
}
.dropdown {
  position: absolute;
  position-anchor: --trigger;
  inset-area: bottom span-right; /* 下方，向右展开 */
}
```

**讲解：** `inset-area` 的格式是“块方向 + 行内方向”：`top center` 表示顶部居中，`bottom span-right` 表示下方并向右拉伸到锚点右边缘。方向也可写成物理关键词，语义与逻辑属性一致。

## 3. 精细控制：anchor() 函数

```css
.popover {
  position: absolute;
  position-anchor: --trigger;
  left: anchor(right);        /* 左边缘对齐锚点右边缘 */
  top: anchor(bottom);        /* 上边缘对齐锚点下边缘 */
  margin-top: 8px;
}
```

**讲解：** 需要精确对齐时用 `anchor()` 函数读取锚点的物理边缘（`left`/`right`/`top`/`bottom`/`center`）作为坐标，配合 margin 形成间距；还可以用 `anchor(--other right)` 引用其它锚点。

## 4. 防溢出：position-try

```css
.popover {
  position: absolute;
  position-anchor: --trigger;
  inset-area: bottom;
  position-try-fallbacks: flip-block;   /* 下方放不下时翻到上方 */
}
```

**讲解：** `position-try-fallbacks` 提供备选方位（`flip-block`/`flip-inline`/自定义 `inset-area`），浏览器在空间不足时自动尝试下一个，弹层不再“溢出屏幕”。这是锚点定位相对 JS 方案的杀手锏。

## 5. 与弹层 API 的关系

```html
<button popovertarget="menu">菜单</button>
<div id="menu" popover class="menu">内容</div>
```

**讲解：** Popover API 负责“显示/隐藏与层级”，锚点定位负责“贴在哪里”，两者常搭配使用：`popover` 默认在顶层渲染，配合 `position-anchor` 即实现“点击按钮弹出下拉面板”，无需任何 JS。

## 6. 动手试试

1. 给按钮和 tooltip 建立锚点关系，用 `inset-area` 切换上下左右；
2. 用 `anchor()` 函数实现“弹层右边缘对齐按钮左边缘”；
3. 给弹层加 `position-try-fallbacks: flip-block`，把页面缩窄观察自动翻转；
4. 进阶挑战：用 `popover` + 锚点定位实现一个无 JS 下拉菜单。

## 7. 核心知识点

> 一句话记住锚点定位：anchor-name 命名锚点，position-anchor 引用，inset-area 定方位，position-try 防溢出。

- `anchor-name: --x` 命名锚点，`position-anchor: --x` 引用；
- `inset-area` 用“块方向 + 行内方向”描述相对方位；
- `anchor()` 函数读取锚点边缘做精细对齐；
- `position-try-fallbacks` 自动尝试备选方位，防溢出；
- 与 Popover API 搭配可实现无 JS 弹层；
- 现代浏览器支持中，使用前查 Baseline。

## 8. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 浏览器不支持 | 弹层位置失效 | 保留 JS 测量方案作为回退 |
| 锚点 display:none | 引用关系失效 | 确保锚点可见或用 `anchor-default` |
| 忘记设置 position | position-anchor 无效 | 弹层必须 absolute/fixed |
| 大量弹层同用锚点 | 命名冲突 | 命名遵循组件前缀 |

## 9. 扩展学习

- 定位体系：`css/014-PositionDetailed`；
- 新特性总览：`css/064-CSSNewFeatures`；
- 层叠上下文与弹层层级：`css/016-StackingContext`；
- 可访问性样式：`css/045-AccessibleStyling`。
