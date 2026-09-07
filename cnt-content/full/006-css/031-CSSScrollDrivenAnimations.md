---
order: 310
title: CSS 滚动驱动动画
module: 'css'
category: 前端技术
difficulty: advanced
description: 让动画进度跟随滚动位置或滚动容器，替代 JS 滚动监听实现视差与进度条。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'css/029-CSSAnimationTransition'
  - 'css/039-ScrollSnap'
  - 'css/032-MediaQuery'
prerequisites:
  - 'css/029-CSSAnimationTransition'
  - 'css/002-CSS3OverviewBasicSyntax'
---

## 0. 直觉：滚动到哪，动画走到哪

传统做法是 JS 监听 `scroll` 事件，把滚动百分比换算成动画进度。滚动驱动动画直接把 `animation-timeline` 指向“滚动进度”，浏览器按滚动位置驱动关键帧，滚动停下动画就停，无需 JS。

## 1. scroll progress timeline：跟随滚动容器

```css
.progress {
  height: 4px;
  background: #4f5bd5;
  transform-origin: left;
  animation: grow linear both;
  animation-timeline: scroll();   /* 跟随最近滚动容器 */
}

@keyframes grow {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
```

**讲解：** `scroll()` 时间线把动画进度绑定到滚动位置：页面顶部为 0%，底部为 100%。上面的例子就是“阅读进度条”。默认跟踪最近的滚动容器，可用 `scroll(nearest)`/`scroll(root)` 明确范围。

## 2. view progress timeline：跟随元素可见度

```css
.reveal {
  animation: fade-up both;
  animation-timeline: view();   /* 元素进入/离开视口时驱动 */
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
```

**讲解：** `view()` 时间线以“元素在视口中的可见度”为进度：元素刚进入视口是 0%，完全进入后是 100%。配合 `animation-range` 可控制从“进入 20%”到“离开 80%”的窗口，实现滚动浮现、视差等效果。

## 3. 控制窗口：animation-range

```css
.parallax {
  animation: float-up both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;   /* 只在进入阶段播放 */
}
```

**讲解：** 默认窗口覆盖“进入 + 离开”全程；`animation-range` 可裁剪为 `entry`（进入阶段）、`exit`（离开阶段）或具体百分比，例如 `entry 0% entry 50%` 表示进入一半时播完。

## 4. 命名时间线：一个滚动容器驱动多个元素

```css
.scroller {
  scroll-timeline-name: --page;   /* 给滚动容器命名 */
}
.item {
  animation: rotate both;
  animation-timeline: --page;     /* 引用命名时间线 */
}
```

**讲解：** 多个元素想共享同一个滚动进度时，用 `scroll-timeline-name` 命名滚动容器，各元素通过 `animation-timeline: --name` 引用，适合整页滚动叙事。

## 5. 兼容与降级

```css
.reveal {
  animation: fade-up 1s ease both;   /* 不支持时的兜底：直接播放一次 */
  animation-timeline: view();
}
```

**讲解：** 不支持滚动驱动动画的浏览器会忽略 `animation-timeline`，此时应保证普通动画先声明，作为兜底。现代 Chrome/Edge 已支持，Safari/Firefox 逐步跟进，上线前查 Baseline。

## 6. 动手试试

1. 用 `scroll()` 实现页面顶部阅读进度条；
2. 用 `view()` 让卡片进入视口时逐张浮现；
3. 用 `animation-range: exit` 实现元素滚出时淡出；
4. 进阶挑战：用命名时间线做一个“滚动翻页”的长页叙事。

## 7. 核心知识点

> 一句话记住滚动驱动动画：animation-timeline 指向 scroll()/view()/命名时间线，动画进度跟滚动走，animation-range 控制播放窗口。

- `scroll()`：进度 = 滚动容器位置；
- `view()`：进度 = 元素在视口中的可见度；
- `animation-range` 裁剪进入/离开阶段；
- `scroll-timeline-name` 命名时间线，多元素共享；
- 先写普通动画做兼容兜底；
- 与滚动捕捉（027）搭配可做翻页体验。

## 8. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 不支持时无动画 | 功能缺失 | 先写普通动画兜底 |
| 时间线作用范围错 | 绑定了错误的滚动容器 | 显式 `scroll(root)` 或命名时间线 |
| 动画范围失控 | 元素一出现就播完 | 用 `animation-range` 收缩窗口 |
| 忽略 reduced-motion | 大量滚动动画加重不适 | 媒体查询中禁用滚动驱动动画 |

## 9. 扩展学习

- 动画与过渡：`css/028-CSSAnimationTransition`；
- 滚动捕捉：`css/038-ScrollSnap`；
- 视图过渡：`css/029-CSSViewTransitions`；
- 减少动效：`css/045-AccessibleStyling`。
