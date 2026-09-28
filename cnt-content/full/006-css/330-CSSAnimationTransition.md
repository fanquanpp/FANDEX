---
order: 330
title: CSS 动画与过渡
module: 'css'
category: 前端技术
difficulty: intermediate
description: "从「按钮 hover 变色瞬间完成，显得廉价生硬」出发，用 transition 补间状态变化，用 @keyframes 排演多帧动画，吃透时序函数、fill-mode 与简写的双时间陷阱，并按「过渡还是动画、动 transform 还是动 width」的决策表写出 60fps 的动效。"
author: fanquanpp
updated: '2026-09-29'
related:
  - 'css/340-CSSViewTransitions'
  - 'css/350-CSSScrollDrivenAnimations'
  - 'css/700-Transform3D'
  - 'css/360-MediaQuery'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
  - 'css/050-CSS3BoxModelDetailed'
---

## 前置知识

- 已完成 [CSS3 概述与基本语法](/css/020-CSS3OverviewBasicSyntax)；
- 例子会用到 `transform: translate/scale/rotate` 的基础写法，深水版见 [transform 与 3D 变换](/css/700-Transform3D)，看不懂变换不影响理解「怎么让变化变平滑」。

## 学习目标

读完本文你将能够：

1. 用 `transition` 四件套让状态变化平滑起来，并说出哪些属性能补间、哪些不能；
2. 用 `@keyframes` 加 `animation` 排出多帧循环动画，解释 `fill-mode: forwards` 解决了什么问题；
3. 选对时序函数：命名曲线、`cubic-bezier`、`steps()` 各管什么感觉；
4. 按决策表回答「这个效果用过渡还是动画」「动 transform 还是动 width」，写出不掉帧的动效；
5. 用 `prefers-reduced-motion` 尊重晕动症用户，用 `@starting-style` 处理元素首次出现的入场动画。

预计 40 到 60 分钟，含 1 组动手实验与 4 道练习。

## 1. 问题引入：会动和「动得对」是两回事

你给按钮加了 hover 变色，功能没问题，但鼠标扫过去的瞬间颜色「啪」地一下就变了——不是 bug，是没有中间过程，观感生硬廉价。再加一个「提交中」的旋转圈、一个弹窗淡入，问题开始分化：hover 变化是**状态 A 到状态 B**，转圈是**循环多帧**，弹窗是**一次性入场**。

CSS 对应两套工具：**transition 补间**（浏览器自动在两个状态之间生成中间帧）与 **animation 关键帧**（你自己排演每一帧）。选错工具不是不能做，而是代码量和坑点翻倍——本文的主线就是「先选对工具，再调对手感」。

## 2. 最小示例：从「啪」到「缓」

`styles.css`：

```css
.button {
  background: #2563eb;
  color: #fff;
  padding: 10px 20px;
  border-radius: 6px;
  /* 过渡三要素：属性、时长、曲线 */
  transition: background-color 0.2s ease, transform 0.2s ease;
}
.button:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
}
.button:active {
  transform: translateY(0) scale(0.98);
}
```

预期效果：hover 时背景色 0.2 秒渐变、按钮轻微上浮；按下时回落并轻微缩小。同一个属性被写成两条过渡目标（hover 与 active），浏览器会自动按当前状态插值——transition 只声明「属性要平滑」，不声明「从哪到哪」。

## 3. 核心概念

### 3.1 过渡四件套与能补间的属性

```css
.card {
  transition-property: transform;   /* 哪些属性参与 */
  transition-duration: 0.3s;        /* 时长 */
  transition-timing-function: ease; /* 曲线 */
  transition-delay: 0s;             /* 延迟 */
  /* 简写：属性 时长 曲线 延迟，多组逗号分隔 */
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
```

能补间的属性必须「有中间值」：颜色、长度、透明度、transform 都行；`display`、`font-family` 这类离散属性没有中间值，写了也不动（2024 年起可用 `transition-behavior: allow-discrete` 让 display 在动画末尾才切换，见 3.5）。**`transition: all` 是反模式**：新属性一加就意外参与动画，性能与可预测性双输，明确列出属性名。

### 3.2 时序函数：动效的「手感」

| 函数 | 感觉 | 典型用途 |
| --- | --- | --- |
| `ease`（默认） | 快进缓出 | 通用微交互 |
| `linear` | 匀速 | 旋转、进度、循环动画 |
| `ease-out` | 快起缓停 | 入场元素（先响应后安顿） |
| `ease-in` | 缓起快走 | 离场元素 |
| `cubic-bezier(0.34, 1.56, 0.64, 1)` | 带过冲的弹性 | 通知弹入 |
| `steps(4)` | 跳格离散 | 逐帧雪碧图、数字翻牌 |

手感经验：界面动效偏爱 ease-out（尽快给反馈、缓缓停稳）；循环动画用 linear 避免每圈「喘气」；想要 Q 弹就在 cubic-bezier 里让控制点超过 1。曲线不必背，浏览器 DevTools 的动效面板可以直接拖贝塞尔曲线试听。

### 3.3 关键帧动画：自己排演每一帧

```css
@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateX(-16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.toast {
  animation: slide-in 0.3s ease-out forwards;
}

@keyframes spin {
  to { transform: rotate(360deg); }   /* from 可省略，默认取当前样式 */
}
.spinner {
  animation: spin 0.8s linear infinite;
}
```

`animation` 简写有两个高频坑：**第一个时间值是时长、第二个才是延迟**（只写一个时永远是时长）；`forwards` 让动画结束后停最后一帧——不加它，淡入的弹窗播完会「弹」回透明，这是「动画结束状态回弹」事故的头号来源。fill-mode 四值：`none` 不保留、`forwards` 保终态、`backwards` 延迟期间应用首帧、`both` 两头都保。

### 3.4 决策表：过渡还是动画，动 transform 还是动 width

| 问题 | 答案 | 理由 |
| --- | --- | --- |
| 只有明确的两态切换（hover、展开/收起） | transition | 声明少，浏览器自动插值 |
| 三帧以上、循环、延迟序列 | @keyframes | 过渡表达不了多帧 |
| 动画属性选谁 | transform、opacity | 只触发合成，不重排不重绘，最省 |
| width/left/top/margin 参与动画 | 换成 transform | 它们触发重排，每帧重算布局，掉帧元凶 |
| 需要中途暂停（`animation-play-state`）或逐帧控制 | animation | 过渡没有播放控制 |

「动 transform 代替动 left」是性能篇的核心原则之一，原理（合成层与渲染管线）见 [CSS 性能优化](/css/540-CSSPerformanceOptimizationDetailed)。

### 3.5 2026 年的两个新零件

- **`@starting-style`**（Baseline 2024）：`display: none` 到显示的元素过去无法过渡（显示瞬间没有「前状态」），现在用它声明首帧样式，弹窗、popover 的纯 CSS 淡入成为可能；
- **`transition-behavior: allow-discrete`**：让 `display`、`overlay` 这类离散属性参与过渡——关闭弹窗时淡出完成后再真正隐藏。

页面级转场（两个页面间的 morph 过渡）由 View Transitions API 负责，见 [视图过渡](/css/340-CSSViewTransitions)；滚动进度驱动的动画见 [滚动驱动动画](/css/350-CSSScrollDrivenAnimations)。

## 4. 修改实验

对第 2 节动手，每步先预测再刷新：

1. 把 `transition` 的 `background-color` 改成 `all`，再给 hover 加 `border-radius: 12px`：新属性也跟着动画——体会 all 的不可控；
2. 时长从 0.2s 改成 0.6s 再改成 0.08s：太慢显得拖沓，太快等于没动——界面微交互的甜点区在 150 到 300ms；
3. 换 `cubic-bezier(0.34, 1.56, 0.64, 1)`：按钮 hover 带一点过冲回弹；
4. 把 `.toast` 的 `forwards` 删掉：弹窗淡入后瞬间消失回弹——亲手复现 fill-mode 事故；
5. 系统开启「减少动态效果」前先写上第 5 节的降级样式，对比开启前后的表现。

## 5. 常见错误与调试实录

错误一：动画结束回弹。淡入淡出类动画播完跳回原状，因为默认 `fill-mode: none` 不保留终态。修复：`animation-fill-mode: forwards`（或简写里带 `forwards`）。

错误二：display 切换让 transition 失效。`.panel { display: none; }` 切到 `block` 时所有过渡静默跳变——元素从「不渲染」到「渲染」没有前状态可插值。修复：用 `visibility` 加 `opacity` 组合，或上 `@starting-style` 加 `allow-discrete`。

错误三：简写里两个时间值写反。`transition: color 0.3s` 正确，`animation: spin 0.5s 1s infinite` 里 0.5s 是时长、1s 是延迟——顺序固定，先时长后延迟，位置不换。

错误四：动画 width/top 卡成 PPT。布局属性每帧触发重排，元素一多立刻掉帧。把位移交给 `transform: translate()`、缩放交给 `scale()`，width 动画实在要去掉时考虑高度塌缩的其他方案。

错误五：无限动画常驻耗电。挂着的 `infinite` 动画即使元素在视口外也可能阻止休眠。用 IntersectionObserver 挪出视口时暂停，或换滚动驱动动画（播放进度由滚动位置决定，见 [滚动驱动动画](/css/350-CSSScrollDrivenAnimations)）。

## 6. 实际场景

- 微交互：按钮、输入框聚焦、开关——transition 三行搞定，时长 150 到 300ms；
- 加载与反馈：spinner（rotate 加 linear 加 infinite）、骨架屏微光（translateX 循环）、toast 入场（keyframes 加 forwards）;
- 引导与叙事：多帧序列用 `animation-delay` 排错峰入场；
- 可访问性降级：所有动效都包一层 `@media (prefers-reduced-motion: reduce)` 关闭动画、保留终态（`animation: none` 配 `forwards` 语义的落点样式），参考 [媒体查询](/css/360-MediaQuery) 的偏好查询一节——晕动症用户不是少数；
- FANDEX 网页端前端实验室的缓动曲线对比器可以并排试不同 cubic-bezier 的手感，调参前先去拖一圈。

## 7. 小练习

预测题（3 分钟）：`animation: fade 2s linear 1s 2 alternate forwards;` 逐段说出每个值的含义，动画总耗时多久？（时长 2s、延迟 1s、播放 2 次、往返方向、保留终态；总时长 1 + 2 × 2 = 5s。）

修改题（8 分钟）：把第 2 节按钮改造成「提交中」状态：文字消失、出现 16px spinner。验收：spinner 用 `border` 加 `rotate` 实现、linear 匀速、状态切换由 `.is-loading` 类驱动。

修 Bug 题（10 分钟）：下面的抽屉面板想实现「打开淡入、关闭淡出」，症状是打开有淡入、关闭瞬间消失。定位根因并用 3.5 节的现代方案修复：

```css
.panel {
  opacity: 0;
  display: none;
  transition: opacity 0.3s;
}
.panel.open {
  display: block;
  opacity: 1;
}
```

（答案方向：关闭时 `display` 立刻变 none，opacity 过渡没有机会播放。修复：`.panel { transition: opacity 0.3s, display 0.3s allow-discrete, overlay 0.3s allow-discrete; }` 配合 `@starting-style { opacity: 0 }`，让 display 在过渡结束后才切换。）

挑战题（半小时，不看正文独立完成）：做一个「卡片飞入网格」入场：6 张卡片错峰滑入（transform 加 opacity），每张延迟 60ms，带轻微过冲曲线，尊重 prefers-reduced-motion（降级为直接显示）。验收：全程 60fps（动效只碰 transform/opacity）、刷新后可重复触发、CSS 至少一条注释解释 fill-mode 的选择。

## 8. 与之前和之后的知识的关系

- 之前：[transform 与 3D 变换](/css/700-Transform3D) 提供位移、缩放、旋转这三件「高性能动画素材」；[媒体查询](/css/360-MediaQuery) 的偏好查询负责无障碍降级；
- 并行：[视图过渡](/css/340-CSSViewTransitions) 把动画的粒度升到页面级；[滚动驱动动画](/css/350-CSSScrollDrivenAnimations) 把时间轴换成滚动进度；
- 之后：[CSS 性能优化](/css/540-CSSPerformanceOptimizationDetailed) 解释「为什么动 transform 不卡」的渲染管线原理；will-change 的正确用法也在那边展开。

## 9. 官方文档

- MDN「使用 CSS 过渡」：https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_transitions/Using_CSS_transitions
- MDN「使用 CSS 动画」：https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_animations/Using_CSS_animations
- MDN @starting-style 参考：https://developer.mozilla.org/zh-CN/docs/Web/CSS/@starting-style

## 10. 自我检查

- 能说出 transition 与 @keyframes 的选择依据，以及各自解决不了的问题；
- 看到一条 animation 简写能拆出全部八个成分并指出时长与延迟；
- 「关闭动画瞬间消失」能定位到 display 与 fill-mode 两类根因；
- 拿到掉帧的动效能检查是否在动布局属性，并给出 transform 替代方案；
- 知道 prefers-reduced-motion 是必做项而不是加分项。

## 本章总结

动效两件套：transition 管「两态之间的补间」，四件套是属性、时长、曲线、延迟，只声明属性名不声明起止；@keyframes 管「多帧与循环」，animation 简写先时长后延迟，fill-mode 决定播完留不留终态。手感靠时序函数：界面偏爱 ease-out，循环用 linear，弹性靠贝塞尔过冲。性能铁律：只动 transform 与 opacity，布局属性动画是掉帧元凶。2024 年后的拼图是 @starting-style 与 allow-discrete——display 参与过渡后，「关闭时淡出」不再需要 JS 打补丁。

## 下一步

进入 [视图过渡](/css/340-CSSViewTransitions)：元素级动效已经就位，下一篇把镜头拉到页面级——让两个视图之间产生 morph 转场，SPA 的丝滑感用原生 API 实现。
