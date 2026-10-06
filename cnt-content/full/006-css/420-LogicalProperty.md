---
order: 450
title: 逻辑属性
module: 'css'
category: 前端技术
difficulty: intermediate
description: 用「两根轴」的心智模型讲透逻辑属性：block/inline 轴随书写模式与文本书写方向翻转，一套样式同时适配 LTR/RTL 与竖排，附 RTL 卡片实战。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'css/430-CSSWritingModes'
  - 'css/050-CSS3BoxModelDetailed'
  - 'css/460-FeatureQuery'
  - 'css/440-ScrollSnap'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
  - 'css/050-CSS3BoxModelDetailed'
---

## 前置知识

- [盒模型详解](/css/050-CSS3BoxModelDetailed)：margin/padding/border 的物理四方向写法。

## 学习目标

- 用「block 轴与 inline 轴」两根轴解释全部逻辑属性的命名，不再死记对照表；
- 理解逻辑属性为什么能「一套样式适配 LTR/RTL 与竖排」，以及它翻转的触发条件（书写模式 + 文本方向）；
- 知道哪些场合**不该**用逻辑属性，避免为了「新」而用错。

预计 40 到 60 分钟。

## 概念引入：物理方向是「给眼睛写的」，不是「给文字写的」

传统 CSS 属性按屏幕物理方向命名：`margin-left`、`padding-top`、`text-align: left`。这对横排、从左往右书写的页面毫无问题。但 CSS 承诺支持三种自由：

1. 文本可以从右往左（阿拉伯语、希伯来语的 `direction: rtl`）；
2. 整个书写流可以竖排（日文段落的 `writing-mode: vertical-rl`）；
3. 同一个页面上可以混排多种书写系统。

这时「左」这个物理词就露馅了：阿拉伯语段落的「行首」在右边，`margin-left` 表达不了「行首留白」这个**意图**。逻辑属性的解法是把方向词从「上下左右」换成「文字流的开始与结束」：

> 逻辑属性 = 按文字流说话的属性。block 轴是「一行的堆叠方向」，inline 轴是「一行文字的行进方向」，start/end 指这条行进路线的头和尾。

默认横排 + LTR 下：block 轴是竖直的（从上往下），inline 轴是水平的（从左往右），`margin-block-start` 恰好等于 `margin-top`、`margin-inline-start` 等于 `margin-left`——这就是很多人误以为「逻辑属性只是换了个名字」的原因：**换名不换值，但换了语义**。一旦书写方向变化，两者分道扬镳。

## 两根轴：命名规则一次记全

所有逻辑属性都由「轴 + 端点」拼出来，不用背表：

- **轴**：`block`（块的堆叠方向）/ `inline`（行的行进方向）；
- **端点**：`start` / `end`；
- 组合出四方向：`*-block-start`、`*-block-end`、`*-inline-start`、`*-inline-end`。

```css
.card {
  margin-block-start: 1rem;    /* 默认横排下 = margin-top */
  margin-inline: 1.5rem;       /* inline-start 与 inline-end 的简写 */
  padding-block: 0.75rem 1rem; /* 两个端点各给一个值 */
  border-inline-start: 3px solid #2563eb;  /* 「行首」竖线，RTL 下自动到右侧 */
}
```

尺寸与偏移同理：

```css
.panel {
  inline-size: 320px;          /* 行进方向的长度：横排下 = width */
  block-size: auto;            /* 堆叠方向的长度：横排下 = height */
  inset-inline-start: 12px;    /* 定位四方向 top/right/bottom/left 的逻辑版 */
  inset: 0;                    /* 全方向简写不变 */
}
```

圆角命名是「两轴交叉点」：`border-start-start-radius` = block-start 与 inline-start 交界处的角，其余三个角对称类推。

margin/padding 的**老四值简写 `margin: 1px 2px 3px 4px` 是物理顺序**（上右下左）；逻辑属性新增的两值简写 `margin: 10px 15px` 官方语义是「block 两个端点 + inline 两个端点」，注意它和老简写的顺序含义不同，混用前先确认语义。

## 翻转的触发条件：两处设置、处处受益

逻辑属性由**容器上下文**决定映射关系，触发源有两个：

1. `writing-mode` 改变 block/inline 两根轴的朝向（竖排时 block 轴变水平）；
2. `direction: rtl`（或元素处于 RTL 文档）让 inline 轴反向，`*-inline-start` 变成物理右侧。

于是同一份样式在两种语言里自动正确：

```css
.list-item {
  padding-inline-start: 2rem;        /* LTR：左内边距；RTL：右内边距 */
  border-inline-end: 1px solid #ccc; /* LTR：右边框；RTL：左边框 */
}
```

英文与阿拉伯语界面共用一套 CSS，不再需要 `[dir='rtl'] .list-item { padding-right: ... }` 的镜像补丁。支持范围可用 `@supports (margin-block-start: 0)` 检测（详见[Feature Queries](/css/460-FeatureQuery)）。

**变换不参与翻转**：`transform: translateX(8px)` 是纯物理位移，RTL 下不会自动反向，图标位移、箭头装饰这类代码要单独处理。这是逻辑属性最常见的「漏网之鱼」。

## 什么时候不要用逻辑属性

- **纯视觉装饰**：阴影朝向、渐变角度、装饰性位移——设计上要的就是「屏幕的左上角」，用物理属性反而忠实；
- **与物理坐标联动的代码**：canvas 绘制、JS 读取 `getBoundingClientRect` 后的定位，天然物理坐标系，混入逻辑值只会添乱；
- **大面积改造存量样式**：物理与逻辑属性混用时，谁覆盖谁按层叠规则走，同一个盒子上 `margin-left` 与 `margin-inline-start` 是不同属性，不会互相取消——改造要一次做完，不要做一半。

## 常见坑与调试实录

**坑 1：`text-align: left` 没换成 `text-align: start`。** 前者是物理值，RTL 下文字仍贴左；`start` 才跟随文本方向。排查 RTL 错位时先查这一条。

**坑 2：以为 flex/grid 会自动翻转布局方向。** flex 主轴方向确实由书写模式决定（RTL 行内轴反向，`row` 自动从右往左排），但**绝对定位、float、table 布局里的物理属性不受管**——布局容器交给逻辑属性没问题，内部散落的物理值要单独审。

**坑 3：`inline-size` 设了、`width` 也设了。** 两个属性都合法且不冲突，后者按层叠覆盖前者，容易被当成「逻辑属性失效」。同类属性不要成对出现。

**坑 4：竖排场景忘了轴互换。** `writing-mode: vertical-rl` 下 `margin-block-start` 变成物理 right，看起来像 bug，其实是轴换向的正确行为。先打印 `getComputedStyle` 确认映射再下结论。

## 与之前和之后的知识的关系

- 之前：[盒模型详解](/css/050-CSS3BoxModelDetailed) 的物理四方向是逻辑属性的「翻译底稿」；
- 并行：[书写模式](/css/430-CSSWritingModes) 是轴方向的开关；[滚动捕捉](/css/440-ScrollSnap) 与 [定位](/css/220-PositionDetailed) 的属性族都有对应逻辑版本；
- 之后：多语言站点的排版规范（[排版与栅格](/css/490-TypeScaleAndSpacingTokens)）默认以逻辑属性书写。

## 自我检查

- 不查表写出「行首外边距」「行尾内边距」「块轴尺寸」三个逻辑属性名；
- 能说出逻辑属性翻转的两个触发源，以及 transform 为什么不在其列；
- 能举出两个「不该用逻辑属性」的场合。

## 小练习

### 练习 1：轴感训练（预测题）

任务：在默认横排 LTR 页面里写下四个声明，先预测它们的物理等价物，再打开 DevTools 的 Computed 面板验证：

```css
.demo {
  margin-block-end: 8px;
  padding-inline-start: 16px;
  inline-size: 200px;
  inset-block-start: 0;
}
```

提示：横排 LTR = block 轴向下、inline 轴向右。

参考答案（先预测再看）：margin-bottom: 8px；padding-left: 16px；width: 200px；top: 0。

### 练习 2：一张卡片的 RTL 自适应（实践题）

任务：写一个「图标在行首、文字跟随、右上角有操作按钮」的卡片组件，要求把 `dir="rtl"` 放到容器上时整个卡片镜像正确，CSS 不改动一个字符。

提示：行首图标用 `margin-inline-end` 拉开与文字的距离；操作按钮用 `inset-inline-end` 定位；文字对齐用 `start`。

参考实现：

```html
<div class="card" dir="rtl">
  <img class="avatar" src="avatar.png" alt="">
  <p class="text">这段文字会跟随方向对齐。</p>
  <button class="action" aria-label="更多">...</button>
</div>
```

```css
.card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;          /* gap 本身不分方向，天然安全 */
}
.avatar {
  margin-inline-end: 0.25rem;
}
.text {
  text-align: start;
}
.action {
  position: absolute;
  inset-inline-end: 8px;
  inset-block-start: 8px;
}
```

验收：切换 `dir` 为 `ltr`/`rtl`，图标、按钮、文字对齐全部镜像，无需任何 `[dir='rtl']` 选择器。

### 练习 3：找出不能自动翻转的地方（挑战题）

任务：在练习 2 的卡片上加两个故意「不翻转」的细节：图标hover 时物理右移 2px（`transform: translateX(2px)`），以及一条从左上到右下的装饰渐变边。用 `:dir()`（或属性选择器）分别给出 RTL 下的补偿写法，并体会「物理意图」与「逻辑意图」的边界。

提示：transform 是纯物理属性；渐变角度同样按物理方向解释。

参考实现：

```css
.avatar:hover {
  transform: translateX(2px);
}
/* RTL 下改为向左移，保持「朝文字方向靠拢」的逻辑意图 */
.card:dir(rtl) .avatar:hover {
  transform: translateX(-2px);
}
```

## 下一步

- [书写模式](/css/430-CSSWritingModes)：轴方向的完整开关，竖排排版的规则书；
- [定位详解](/css/220-PositionDetailed)：`inset` 逻辑偏移所在的定位体系；
- [排版与栅格系统](/css/490-TypeScaleAndSpacingTokens)：多语言排版的整体视角。
