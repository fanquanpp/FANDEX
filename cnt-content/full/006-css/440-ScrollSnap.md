---
order: 480
title: 滚动捕捉
module: 'css'
category: 前端技术
difficulty: intermediate
description: 用「磁铁与对齐线」的心智模型讲透 scroll-snap：容器严格度、子项对齐线、scroll-padding/margin 避让，以及 mandatory 全屏翻页的可访问性风险，附轮播实战。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'css/240-CSS3FlexboxFlexLayout'
  - 'css/220-PositionDetailed'
  - 'css/500-AccessibleStyling'
  - 'css/420-LogicalProperty'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
  - 'css/240-CSS3FlexboxFlexLayout'
---

## 前置知识

- [Flexbox 布局](/css/240-CSS3FlexboxFlexLayout)：横向轮播的子项排列靠它；
- 溢出与滚动的基本概念：`overflow: auto` 创建滚动容器。

## 学习目标

- 用「容器撒磁铁、子项是对齐线」的模型解释 scroll-snap 三个属性族的分工；
- 会选 `mandatory` 与 `proximity`，知道前者的可访问性代价；
- 会用 `scroll-padding`/`scroll-margin` 解决「停靠后内容被吸顶导航挡住」这类避让问题。

预计 40 到 60 分钟。

## 概念引入：把「对齐」从 JS 交还给滚动本身

轮播、图库、整屏翻页这类需求，传统做法是监听 scroll 事件、计算最近一页、再 `scrollTo` 补偿——代码长、手感差（惯性滚动与补偿互相打架）。滚动捕捉（CSS Scroll Snap）把这件事变成声明式：**你只声明「停下来的位置在哪」，吸附动作由浏览器完成**，于是吸附直接参与原生滚动的物理手感——带惯性、跟手、无 JS。

心智模型：

> 滚动容器在滚动坐标轴上「撒磁铁」，每个子元素贡献一条对齐线；滚动结束前，浏览器把最近的磁铁吸住。容器属性决定磁铁的轴向与吸力强弱，子项属性决定对齐线在元素自己的哪个位置。

注意「轴」的概念与[逻辑属性](/css/420-LogicalProperty)一脉相承：横排页面里 `x` 就是行内轴、`y` 就是块轴，书写模式变化时行为随之变化。

## 容器侧：轴向与严格度

```css
.carousel {
  display: flex;
  overflow-x: auto;             /* 先有滚动容器，才有吸附 */
  scroll-snap-type: x mandatory; /* 轴向 + 严格度 */
}
```

`scroll-snap-type` 是容器属性，由两部分组成：

| 部分 | 取值 | 含义 |
| --- | --- | --- |
| 轴向 | `x` / `y` / `both` | 在哪根轴上吸附 |
| 严格度 | `mandatory` / `proximity` | 吸力强度 |

**mandatory**：滚动必须停在某个对齐线上——手指一松立刻吸附，不可能停在两页之间。它适合「每一屏都是完整内容单元」的场景（整屏翻页、分页轮播），代价是**强制剥夺了「停在中间」的能力**：一张比容器高的卡片在 mandatory 下用户永远无法从容读完超出部分。无障碍视角看，内容高于视口的场景必须放弃 mandatory。

**proximity**：只有停在磁铁附近才吸附，离得远就随用户停在原地。它才是长内容、图文混排的安全默认值。

## 子项侧：对齐线与禁止跳过

```css
.carousel-item {
  flex: 0 0 80%;
  scroll-snap-align: center;  /* 这条对齐线落在元素自身的中心 */
  scroll-snap-stop: always;   /* 一次滑动不允许掠过这张卡 */
}
```

`scroll-snap-align` 有三个值：`start`（元素起点对齐容器起点）、`center`、`end`。「起点/终点」按行进方向解释，RTL 下自动反向——与逻辑属性共享同一套方向语义。

`scroll-snap-stop: always` 解决「一次快速滑动连翻三页」的问题：快速滑动时默认（`normal`）允许掠过中间的对齐线，`always` 强制每张卡都停一次。逐张阅读的分步引导用它，大图库不要用（用户会被迫逐张翻）。

## 避让：scroll-padding 与 scroll-margin

对齐线的计算是「容器边缘对元素边缘」，两个偏移属性分别在两侧加缓冲：

```css
.carousel {
  scroll-padding-inline: 24px;  /* 容器侧：把「容器起点」向内缩 24px */
}
.carousel-item {
  scroll-margin-block: 64px;    /* 子项侧：把自己外扩 64px 再参与对齐 */
}
```

记忆口诀：**padding 归容器、margin 归子项**。典型用途：容器上方有 fixed 吸顶导航时，给容器 `scroll-padding-block-start: 64px`，让 `start` 对齐线自动落在导航下沿；再如希望停靠时卡片旁边露出下一张的边缘，用 `scroll-margin` 调。

## 两个实战骨架

横向分页轮播（每屏一张、支持触摸滑动）：

```css
.carousel {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: 16px;
}
.carousel > * {
  flex: 0 0 100%;               /* 每页占满一屏 */
  scroll-snap-align: start;
}
```

纵向整屏翻页（务必配 reduced-motion 与内容高度检查）：

```css
.fullpage {
  height: 100vh;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
}
.fullpage > section {
  min-height: 100vh;   /* 注意是 min-height：内容超出时不被截断 */
  scroll-snap-align: start;
}
```

`scroll-behavior: smooth` 控制的是**编程式滚动**（锚点跳转、`scrollTo`）的动效，与用户手势无关，但会让捕捉后的编程补位更自然；记得在 `prefers-reduced-motion: reduce` 下关闭（见[无障碍样式](/css/500-AccessibleStyling)）。

需要「用户停在哪张卡上」这个信号时，现代浏览器提供了滚动捕捉事件：`scrollsnapchange`（停靠完成后触发）与 `scrollsnapchanging`（即将停靠）（基线说明：Chrome 129 起，2026 年新项目可用，旧浏览器退回 scroll 事件计算）。这把「监听滚动 + 手算页码」整段 JS 淘汰掉了。

## 常见坑与调试实录

**坑 1：mandatory + 内容高于视口。** 用户永远停不到「中间」，超出部分读不到。这是 mandatory 唯一但致命的适用性判断：**每屏内容都完整且不超高，才允许 mandatory**，否则 proximity。

**坑 2：忘了先创建滚动容器。** `scroll-snap-type` 不产生滚动，`overflow` 才产生；两者缺一吸附不生效。排查第一步永远是确认容器真的可滚。

**坑 3：停靠位置被遮挡。** 吸顶导航盖住了停靠内容的头几行——容器侧加 `scroll-padding-block-start`，而不是给子项硬塞 padding-top（那会改变布局本身）。

**坑 4：wheel 与触摸行为差异。** 鼠标滚轮在 mandatory 下逐格吸附、触摸下滑带惯性吸附，同一份代码手感不同属正常现象；验收要在真机与桌面各过一遍。

## 与之前和之后的知识的关系

- 之前：[Flexbox](/css/240-CSS3FlexboxFlexLayout) 排出「一页一张卡」的轨道，snap 只管停在哪；[定位详解](/css/220-PositionDetailed) 的 fixed 导航是 scroll-padding 避让的对手方；
- 并行：[滚动驱动动画](/css/350-CSSScrollDrivenAnimations) 同样以滚动容器为基础，把「滚动进度」变成时间轴——snap 管「停哪」，scroll-driven 管「边滚边动」；
- 之后：[无障碍样式](/css/500-AccessibleStyling) 的 reduced-motion 原则直接约束整屏翻页方案。

## 自我检查

- 能分别说出容器两属性、子项两属性各管什么；
- 能对「图片画廊」「分步引导」「整屏宣传页」三个场景分别指定严格度并说明理由；
- 遇到「停靠被导航挡住」能说出该用哪个属性、加在哪一侧。

## 小练习

### 练习 1：手感对照（预测题）

任务：搭一个横向滚动的卡片列表（每张 300px 宽），分别以 `x proximity` 与 `x mandatory` 滚动。先预测：缓慢拖到两张卡中间松手，两种严格度下分别停在哪？快速滑动一屏半呢？再验证。

提示：proximity 只在「附近」吸附；mandatory 允许掠过 `normal` 的对齐线。

参考现象（先预测再看）：缓慢停在中间时，proximity 不吸附、mandatory 吸回最近的卡；快速滑动两者都可能掠过中间卡（`scroll-snap-stop: normal` 时）。

### 练习 2：带吸顶导航的锚点式章节（实践题）

任务：页面顶部有 64px 高的 fixed 导航，主体是纵向滚动、逐章停靠的长文。要求停靠后每章标题完整可见、不被导航遮住。写出容器与导航的关键 CSS。

提示：别动子项布局，用容器侧避让。

参考实现：

```css
header {
  position: fixed;
  inset-block-start: 0;
  inline-size: 100%;
  block-size: 64px;
}
main {
  height: 100vh;
  overflow-y: auto;
  scroll-snap-type: y proximity;
  scroll-padding-block-start: 64px;  /* 对齐线整体下移一个导航高度 */
}
main > section {
  min-height: 100vh;
  scroll-snap-align: start;
}
```

### 练习 3：停靠感知的页码指示器（挑战题）

任务：给练习 1 的轮播加一排圆点指示器，当前停靠的卡对应高亮圆点。优先用 `scrollsnapchange` 事件实现，并为不支持的浏览器写 scroll 事件回退（可用四舍五入页码近似）。写出核心 JS。

提示：事件对象的 `snapTargetBlock`/`snapTargetInline` 给出停靠的元素。

参考实现：

```javascript
const track = document.querySelector('.carousel');
const dots = [...document.querySelectorAll('.dot')];

function highlight(target) {
  const index = [...track.children].indexOf(target);
  dots.forEach((d, i) => d.classList.toggle('active', i === index));
}

if ('onscrollsnapchange' in track) {
  track.addEventListener('scrollsnapchange', (e) => {
    highlight(e.snapTargetInline ?? e.snapTargetBlock); // 横向容器取 inline
  });
} else {
  // 回退：按滚动位置近似页码
  track.addEventListener('scroll', () => {
    const page = Math.round(track.scrollLeft / track.clientWidth);
    highlight(track.children[page]);
  }, { passive: true });
}
```

## 下一步

- [滚动驱动动画](/css/350-CSSScrollDrivenAnimations)：同一滚动容器的另一种声明式能力；
- [无障碍样式](/css/500-AccessibleStyling)：reduced-motion 与键盘滚动的底线；
- [定位详解](/css/220-PositionDetailed)：fixed 导航与 scroll-padding 避让的完整背景。
