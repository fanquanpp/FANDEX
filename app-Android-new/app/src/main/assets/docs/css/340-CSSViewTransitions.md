---
order: 340
title: CSS 视图过渡
module: 'css'
category: 前端技术
difficulty: advanced
description: View Transitions API 在页面状态切换时自动生成平滑过渡，支持自定义动画与跨文档过渡。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'css/330-CSSAnimationTransition'
  - 'css/650-CSSNewFeatures'
  - 'css/170-PriorityCalculation'
prerequisites:
  - 'css/330-CSSAnimationTransition'
  - 'css/020-CSS3OverviewBasicSyntax'
---

## 0. 直觉：让“旧画面”和“新画面”自然地切换

平时切换列表/详情页是“瞬间跳变”。View Transitions 会先拍下旧画面，再拍下新画面，然后自动生成一段默认的淡入淡出过渡；开发者可以只关注“新旧状态”，动画交给浏览器。

## 1. 单文档过渡：startViewTransition

```html
<button id="switch">切换主题</button>
```

```js
document.getElementById("switch").addEventListener("click", () => {
  document.startViewTransition(() => {
    document.body.classList.toggle("dark");
  });
});
```

**讲解：** 回调里同步修改 DOM，浏览器自动为整个页面生成过渡。Chrome/Edge 已稳定支持，Safari 18 起跟进，Firefox 的支持进度以 MDN/caniuse 为准；旧浏览器直接跳过动画，功能不受影响。

## 2. 命名视图：只让部分元素动

```css
.avatar {
  view-transition-name: avatar;
}

::view-transition-group(avatar) {
  animation-duration: 0.4s;
}
```

**讲解：** 默认整个页面都参与过渡；给元素加 `view-transition-name` 后，只有该元素单独生成“旧→新”的位移与缩放动画，其余部分保持淡入淡出，适合头像、卡片、图片列表。

## 3. 自定义动画与禁用

```css
::view-transition-old(root) {
  animation: fade-out 0.2s ease forwards;
}
::view-transition-new(root) {
  animation: fade-in 0.2s ease forwards;
}

@keyframes fade-out {
  to { opacity: 0; }
}
@keyframes fade-in {
  from { opacity: 0; }
}
```

**讲解：** `::view-transition-old(root)` 与 `::view-transition-new(root)` 分别代表旧/新画面层，可以像普通元素一样写动画。`animation: none` 可禁用某层的默认动画，实现“不想要淡出只想要淡入”等定制。

## 4. 跨文档过渡

跨文档过渡让传统的多页面跳转（MPA）也拥有视图过渡，核心是 `@view-transition` at-rule：

```css
/* 在 A 页面（列表）与 B 页面（详情）同时声明：开启跨文档导航过渡 */
@view-transition {
  navigation: auto;
}

/* 两页中需要衔接的元素取同一个名字 */
.article-card {
  view-transition-name: article;
}
```

**讲解：** 声明 `@view-transition { navigation: auto; }` 后，同源页面之间的导航会被浏览器拦截为一次视图过渡：旧页面的截图与新页面的渲染自动衔接，两边同名 `view-transition-name` 的元素（如上例的 `.article-card`）直接做位置/尺寸补间，实现“卡片从列表飞入详情”。零 JS。

三个硬条件：

- 页面必须**同源**（协议、域名、端口一致），跨站导航不参与；
- 旧页面不能被 `unload` 阻塞逻辑拖慢，且两边都要声明 `@view-transition`；
- 跨文档过渡属较新能力：Chromium 系与较新的 Safari 已支持，Firefox 以 MDN/caniuse 为准，生产使用前查支持状态，不支持时导航行为完全正常（动画只是增强）。

## 5. 与动画/新特性的关系

- `css/330-CSSAnimationTransition`：transition/keyframes 基础，是自定义过渡动画的前提；
- `css/650-CSSNewFeatures`：视图过渡属于现代 CSS 新特性族，与容器查询、@scope 同期推进；
- 视图过渡适合“状态切换”而非“持续动画”，持续动效仍用 animation。

## 6. 动手试试

1. 用 `startViewTransition` 包裹一个明暗主题切换，观察默认淡入淡出；
2. 给列表中的头像加 `view-transition-name`，切换视图时观察单独位移动画；
3. 自定义 `::view-transition-old(root)` 的动画时长与曲线；
4. 进阶挑战：做“列表点击卡片 → 详情页卡片放大展开”的跨文档过渡原型。

## 7. 核心知识点

> 一句话记住视图过渡：startViewTransition 捕获新旧状态，view-transition-name 圈定重点元素，伪元素自定义动画，旧浏览器自动降级。

- `document.startViewTransition(callback)` 触发过渡；
- 默认全页淡入淡出，无需写动画；
- `view-transition-name` 让指定元素单独动画；
- `::view-transition-old/new()` 定制旧/新画面层；
- 跨文档过渡用 `@view-transition { navigation: auto; }` 开启，要求同源与同名视图；
- 不支持时静默降级为直接切换。

## 8. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 默认过渡让整页闪动 | 全页都参与淡入淡出 | 只给关键元素命名视图 |
| 忘记降级方案 | 旧浏览器直接无过渡 | 先保证功能，动画作为增强 |
| 过渡期间重复点击 | 连续触发导致动画叠加 | 加状态锁或在回调中防抖 |
| 与 reduced-motion 冲突 | 动晕用户不适 | 遵循 `prefers-reduced-motion` 关闭过渡 |

## 9. 扩展学习

- 动画与过渡：`css/330-CSSAnimationTransition`；
- 新特性总览：`css/650-CSSNewFeatures`；
- 可访问性与减少动效：`css/500-AccessibleStyling`；
- 滚动驱动动画：`css/350-CSSScrollDrivenAnimations`。
