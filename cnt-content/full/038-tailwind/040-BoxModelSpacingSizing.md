---
order: 50
title: 盒模型、间距与尺寸
module: 'tailwind'
category: 前端技术
difficulty: beginner
description: Tailwind CSS 布局地基：文档流与 display、盒模型与 border-box、尺寸类（w/h/max/min）、margin 家族与负值、space-* 兄弟间距，配盒模型实证与阅读宽度等示例
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- 知识类别：CSS 布局地基——文档流、display、盒模型（box-sizing），以及 Tailwind 的尺寸类与 margin 间距体系。
- 解决什么问题：理解元素"默认怎么排、默认多大、间距从哪来"，进而精确控制盒子的宽度高度、内外留白与水平居中——这是一切布局的最底层。
- 什么时候用到：写任何布局之前。一维的 Flex 与二维的 Grid 都建立在这套地基上：盒子的尺寸与间距没想清楚，再高阶的布局也会塌。
- 一维排布（Flex）在[Flexbox 一维弹性布局](/tailwind/041-FlexboxLayout)展开，二维版面与悬浮层在[Grid 网格布局](/tailwind/043-GridLayout)与[定位与层叠上下文](/tailwind/044-PositioningAndStacking)展开。

## 前置知识

- [Tailwind CSS 核心概念与工具类](/tailwind/030-UtilityCore)：间距刻度（`p-4` = 16px）与任意值语法，本篇直接使用

## 学习目标

- 理解文档流、display 与盒模型如何决定元素的默认排布与默认尺寸。
- 说清 Tailwind 预设的 border-box 意味着什么，`w-24` 到底量到哪里，第三方样式覆盖时怎么排查。
- 能用 `w-*`/`h-*`/`max-w-*`/`min-h-*` 控制盒子尺寸，理解 `min-w-0` 与 `max-w-*` 这两个"反直觉救命类"的用途。
- 能用 margin 家族（含负值与 `mx-auto`）与 `space-y-*` 管理间距，知道它们与 `gap-*` 的分工边界。

## 0. 摆积木的排布学问

儿童玩具桌上有两盒积木。第一盒是"串珠"：一根绳子，把珠子一颗颗穿进去，顺序固定、方向单一，只能排成一列或一串——这是**一维**排布。第二盒是"底板"：一块带凸点的塑料板，积木可以横着放、竖着放、跨两格、占满一行——这是**二维**排布。

网页布局和摆积木是同一件事：决定"谁在谁旁边、谁占多大地方、空间多了怎么办"。CSS 为此提供了两套排布系统：**Flex（弹性盒子）**像串珠，擅长一维排布（一行或一列），详见[Flexbox 一维弹性布局](/tailwind/041-FlexboxLayout)；**Grid（网格）**像底板，擅长二维排布（行列同时控制），详见[Grid 网格布局](/tailwind/043-GridLayout)。

但无论用哪套系统排，每颗珠子、每块积木自己先得是个**有确定大小、有确定内外留白的盒子**——这盒子的学问（文档流、display、盒模型、尺寸与间距）就是本篇的内容。它是 Flex 与 Grid 之前的必修课。

## 1. 布局的起点：文档流与盒模型

在认识 Flex 与 Grid 之前，先理解它们出现之前的世界——普通文档流（normal flow）。

### 1.1 块级与行内

HTML 元素天然分两类：

- **块级元素**（div、p、h1、section）：独占一行，宽度默认占满父容器，从上到下堆叠。
- **行内元素**（span、a、strong）：随文本从左到右排列，一行放不下才换行，宽度由内容决定。

```html
<!-- 三个块级元素：上下堆叠 -->
<div class="bg-blue-100 p-2">块一：独占一行</div>
<div class="bg-blue-100 p-2">块二：独占一行</div>

<!-- 三个行内元素：从左到右流动 -->
<span class="bg-green-100 px-2">行内一</span>
<span class="bg-green-100 px-2">行内二</span>
<span class="bg-green-100 px-2">行内三</span>
```

普通文档流的问题是：**无法精确控制排布方向与对齐方式**。想让两个块并排、让元素垂直居中、让某块占剩余空间——靠文档流都做不到。于是 CSS 引入了"主动布局"方案：一维的 Flex 与二维的 Grid（分别见姊妹篇）。

### 1.2 一切布局的前提：display

`display` 属性决定元素以何种身份参与布局。Tailwind 提供了对应的工具类：

| 类名 | CSS 值 | 用途 |
| --- | --- | --- |
| `block` | display: block | 强制块级 |
| `inline` | display: inline | 强制行内 |
| `inline-block` | display: inline-block | 行内但可设宽高 |
| `flex` | display: flex | 开启弹性布局（详见[Flexbox 一维弹性布局](/tailwind/041-FlexboxLayout)） |
| `grid` | display: grid | 开启网格布局（详见[Grid 网格布局](/tailwind/043-GridLayout)） |
| `hidden` | display: none | 从页面移除元素 |

```html
<!-- span 变成块级：独占一行 -->
<span class="block bg-gray-100 p-2">我是 span，但显示为块级</span>

<!-- div 变成行内块：可设宽度，又随文本排列 -->
<div class="inline-block w-24 bg-gray-100 p-2">行内块</div>

<!-- 响应式显隐：移动端隐藏，桌面端显示 -->
<div class="hidden md:block bg-gray-100 p-2">桌面端才显示</div>
```

讲解：`hidden` 配合断点前缀（`md:block`）是"移动端隐藏/桌面端显示"的常用手段，无需手写媒体查询。还有一个隐蔽规则：**行内元素设置宽高无效**——`<span class="w-24">` 不生效，必须先改成 `inline-block` 或 `block`。排查"宽高类写了没反应"时，第一反应就查元素的 display。

### 1.3 盒模型与 box-sizing：Tailwind 已替你选好

每个元素都是一个"盒子"，由四层组成：内容（content）→ 内边距（padding）→ 边框（border）→ 外边距（margin）。`w-*`、`h-*` 量的是哪一层，由 `box-sizing` 决定：

| box-sizing | `w-24`（96px）量到哪里 | 手工算尺寸时 |
| --- | --- | --- |
| content-box（CSS 默认） | 只量内容区；加 `p-4` 后实际占 96 + 32 = 128px | 要自己做减法，容易错 |
| border-box（Tailwind 预设） | 内容 + 内边距 + 边框合计 96px | 写多少就是多少 |

Tailwind 的 Preflight（预检样式）把所有元素的 `box-sizing` 统一设为 `border-box`，所以"卡片 `w-64 p-6 border` 仍然正好 256px 宽"。易错点只在一处：**当你自己写原生 CSS 或给第三方组件库写覆盖样式时，若忘了对方是 content-box，加 padding 就会把容器撑爆**。确认方式：DevTools 选中元素，Computed 面板搜 `box-sizing`。

```html
<!-- border-box 下：总宽就是 w-64 的 256px，padding 向内收缩内容 -->
<div class="w-64 border-4 border-gray-900 bg-blue-100 p-6">总宽恒定 256px</div>
```

讲解：如果把它改回 content-box（`[box-sizing:content-box]`），同一组类会占到 256 + 48 + 8 = 312px——"写死宽度却仍被撑爆"的悬案多半出在这里。

## 2. 尺寸类：定宽定高与弹性上下限

尺寸类分四组：固定尺寸、最小尺寸、最大尺寸、按比例。

| 类名 | CSS | 用途 |
| --- | --- | --- |
| `w-64` / `h-16` | width/height: 16rem/4rem | 固定尺寸，走间距刻度 |
| `w-full` / `h-screen` | width: 100% / height: 100vh | 撑满父容器 / 满屏高 |
| `size-12` | width + height 同时 3rem | 正方形速记（头像、图标位） |
| `max-w-md` / `max-w-2xl` / `max-w-7xl` | max-width: 28rem / 42rem / 80rem | 内容最大宽度上限 |
| `max-w-full` | max-width: 100% | 不超过父容器（图片防溢出标配） |
| `min-h-screen` / `min-h-0` / `min-w-0` | min-height/min-width | 最小尺寸；`min-w-0` 是防溢出兜底 |

```html
<!-- 头像：size-12 一条顶 w-12 h-12 两条 -->
<img src="/avatar.png" alt="头像" class="size-12 rounded-full object-cover" />

<!-- 阅读宽度：长文限在 42rem 内，一行 60 到 75 个英文字符最舒适 -->
<article class="mx-auto max-w-2xl px-6">
  <p>超过 45rem 的行宽，读者眼睛从行尾扫回行首容易串行——这就是杂志与文档站都给正文限宽的原因。</p>
</article>

<!-- 图片防溢出：容器再窄也不撑破 -->
<img src="/chart.png" alt="图表" class="max-w-full h-auto rounded-lg" />
```

讲解：`max-w-*` 的刻度（sm 24rem、md 28rem、lg 32rem、xl 36rem、2xl 42rem、…、7xl 80rem）专为"内容容器"设计。两个高频组合值得背下来：**长文正文用 `mx-auto max-w-2xl`**（限宽 + 居中），**图片用 `max-w-full`**（在小容器里缩、在宽容器里不放大失真）。`min-w-0` 看起来无用，实际是 Flex/Grid 布局里"内容里有长 URL/长单词把弹性栏撑爆"的标准解药——默认 min-width: auto 会让子内容拒绝收缩，`min-w-0` 解除这个下限。深挖见 041 篇动手实践。

## 3. 间距：margin 家族与兄弟间距

padding 往内撑开盒子，margin 往外推开邻居——间距刻度两者共用（`0.25rem` 步进，见 030 篇第 3 节）。margin 有三件 padding 没有的本事：负值、`auto`、与兄弟选择器。

### 3.1 方向类、负 margin 与 auto

| 类名 | CSS | 用途 |
| --- | --- | --- |
| `mt-8` / `mb-4` / `ml-2` / `mr-2` | margin-top/bottom/left/right | 单方向外边距 |
| `-mt-2` | margin-top: -0.5rem | 负 margin：让元素"越界" |
| `mx-auto` | margin-inline: auto | 水平居中（块级元素标配） |
| `my-6` | margin-block: 1.5rem | 上下同时 |

```html
<!-- 卡片内的节奏：标题与正文拉开 12px，区块之间 24px -->
<div class="rounded-xl border border-gray-200 p-6">
  <h2 class="text-lg font-bold">第 3 章：函数</h2>
  <p class="mt-3 text-sm text-gray-600">函数是一段可复用的代码……</p>
  <div class="mt-6 flex gap-2">
    <span class="rounded bg-gray-100 px-2 py-1 text-xs">示例</span>
    <span class="rounded bg-gray-100 px-2 py-1 text-xs">练习</span>
  </div>
</div>

<!-- 负 margin：图片顶出卡片边界，做出"破格"海报感 -->
<div class="rounded-xl border border-gray-200 bg-white p-4">
  <img src="/cover.png" alt="封面" class="-mt-10 h-28 w-28 rounded-lg border-4 border-white shadow-lg" />
  <h3 class="mt-3 font-semibold">破格封面</h3>
</div>

<!-- 块级水平居中：定宽或限宽 + mx-auto -->
<main class="mx-auto max-w-7xl px-6">
  <p>内容在 1280px 以内水平居中，两侧保留 24px 内边距</p>
</main>
```

讲解：`mx-auto` 生效有个前提——元素得有"多余的空间可分"：定宽（`w-*`）或限宽（`max-w-*`）之一必须存在，`w-full` 的元素加 `mx-auto` 毫无效果。负 margin 的典型用途是"破格"装饰与紧凑叠放；它是唯一能让元素越过父容器内边距的常规手段，但方向要成对想清楚（`-mt-10` 上移，会不会盖住上一个元素）。

### 3.2 兄弟间距：space-y-*

给容器里**相邻子元素**之间统一加间距，一条类替代逐个加 `mt-*`：

```html
<!-- 列表条目统一 16px 垂直间距，不用每个条目写 mt-4 -->
<ul class="space-y-4">
  <li class="rounded bg-gray-100 p-3">条目一</li>
  <li class="rounded bg-gray-100 p-3">条目二</li>
  <li class="rounded bg-gray-100 p-3">条目三</li>
</ul>
```

讲解：`space-y-4` 通过相邻兄弟选择器（`> * + *`）实现，只影响相邻子元素之间，不给首尾元素加外边距。口诀：**兄弟之间用 `space-*` 或 `gap-*`，自己与外部用 margin**——`gap` 需要 flex/grid 容器（详见 041 篇第 3 节），`space-*` 在任何容器都能用，但它假设子元素"垂直单列堆叠"，子元素换行成多列时 `space-x-*` 会只加在每列第一个元素左边（flex 布局下请优先 `gap`）。

### 3.3 文字居中与块级居中

| 需求 | 工具类 | 说明 |
| --- | --- | --- |
| 文字（行内内容）居中 | `text-center` | 文本水平居中 |
| 块级元素水平居中 | `mx-auto` + 定宽/限宽 | 左右外边距自动平分 |

```html
<!-- 文字居中 -->
<h1 class="text-center text-2xl font-bold">居中标题</h1>

<!-- 限宽居中的页面容器 -->
<div class="mx-auto max-w-3xl px-4">表单、文章等窄内容区</div>
```

双轴（垂直 + 水平）居中需要 Flex 容器配合，见[Flexbox 一维弹性布局](/tailwind/041-FlexboxLayout)第 3 节。

## 4. 常见错误与对策

| 错误场景 | 表现 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| 宽度失效 | 子元素设了 `w-24` 仍占满 | 行内元素宽高无效，或块级宽度受父容器约束 | 先设 `inline-block`/`block`；需要并排交给 Flex |
| 写死宽度被撑爆 | `w-64 p-6 border` 实际比 256px 宽 | 该元素处在 content-box 上下文（如第三方样式覆盖了 Preflight） | 检查 `box-sizing`，补 `[box-sizing:border-box]` 或全局恢复 |
| mx-auto 不居中 | `mx-auto` 加了却没居中 | 元素 `w-full` 或没设宽度，没有可平分的空隙 | 配 `max-w-*` 或 `w-*` 一起用 |
| 负 margin 盖住邻元素 | 图片装饰盖住了上一段文字 | 负 margin 让元素越界但层叠顺序没管 | 配合 `relative` 与 `z-*` 控制层叠（见 044 篇） |
| space-x 多列错乱 | 换行布局下第一列左侧多出一条缝 | `space-*` 假设子元素单列/单行排列 | flex/grid 容器统一用 `gap-*` |
| 内容撑爆弹性栏 | 长 URL 把栏宽顶爆 | min-width: auto 默认拒绝收缩 | 内容所在栏加 `min-w-0` |

## 5. 动手实践

**任务一：盒模型实证。** 写两个 `w-40 p-4 border-2` 的盒子，一个默认、一个加 `[box-sizing:content-box]`，量出两者实际宽度差并解释。提示：内容 160px；padding 左右各 16px；border 左右各 2px。

**任务二：阅读宽度改造。** 把一段通栏长文（`w-full`）改造成"居中限宽"的舒适排版，再解释为什么"只用 max-w 不加 mx-auto"达不到效果。提示：限宽后元素靠左，需要 margin 自动平分来居中。

**任务三：破格头像卡。** 实现一张"头像一半露在卡片外"的会员卡：卡片有顶部留白，头像用负 margin 上移越界，且头像要盖住卡片边框而不是被边框盖住。提示：`-mt-*` 负 margin + 父容器不加 `overflow-hidden`；层叠问题交给 `relative`。

先自己写，再对照参考实现：

<details>
<summary>任务一参考实现</summary>

```html
<div class="w-40 border-2 border-gray-900 bg-blue-100 p-4">border-box：总宽 160px</div>
<div class="w-40 border-2 border-gray-900 bg-blue-100 p-4 [box-sizing:content-box]">
  content-box：总宽 196px
</div>
```

196px = 内容 160 + 内边距 16 x 2 + 边框 2 x 2。DevTools 的 Computed 面板里两个盒子的 `box-sizing` 一目了然；把尺寸换算成"内容区 + 四层"的心算习惯，比背口诀更能防坑。真实工程里这个问题最常出现在"往第三方组件里塞 Tailwind 类"的时候——组件库自带的 CSS 可能改回了 content-box。
</details>

<details>
<summary>任务二参考实现</summary>

```html
<!-- 改造前：通栏正文，行宽随视口无限拉长 -->
<p class="text-gray-700">（长文……）</p>

<!-- 改造后：限宽 + 居中 -->
<article class="mx-auto max-w-2xl px-6 text-gray-700">
  <p>（长文……）</p>
</article>
```

只写 `max-w-2xl` 不写 `mx-auto` 时，块级元素在剩余空间里默认靠左——限宽只回答"最宽多宽"，居中要靠 margin 自动平分回答"空隙怎么分"。`px-6` 是给窄屏兜底的内边距：视口小于 42rem 时 `max-w` 不再起作用，两侧留白全靠 padding。这两条合起来就是"长文容器三件套"：`mx-auto max-w-2xl px-6`。
</details>

<details>
<summary>任务三参考实现</summary>

```html
<div class="mx-auto max-w-xs rounded-xl border border-gray-200 bg-white px-4 pb-5 pt-12 text-center shadow-sm">
  <img
    src="/avatar.png"
    alt="会员头像"
    class="relative mx-auto -mt-16 size-20 rounded-full border-4 border-white object-cover shadow-md"
  />
  <h3 class="mt-3 font-bold text-gray-900">暮色会员</h3>
  <p class="mt-1 text-sm text-gray-500">头像一半在卡外，一半在卡内</p>
</div>
```

三个关键点：`pt-12` 给卡片顶部留出"给头像越过来的空位"；`-mt-16` 让头像上移出界（头像自身 `size-20`，一半即 40px，约等于 `mt-10`，这里取 `mt-16` 制造更明显的破格）；`relative` 让头像建立定位上下文并抬高绘制层级，配合白色粗边框盖住卡片边框线。若把 `-mt-16` 写成 `mb-*` 方向，头像只会把内容往下推——负 margin 是"位移"语义，正 margin 是"占位"语义，这组对照值得亲手各写一遍体会差别。
</details>

## 6. 一句话记忆

每颗珠子自己先是个盒子：文档流决定默认排法，display 决定参与身份，border-box 让"写多少是多少"；尺寸用 `w/h/size/max-w/min-w-0`，间距靠 margin 三件套（方向类、负值、`mx-auto`）与兄弟选择器 `space-*`，一维排布与 `gap` 交棒给[Flexbox 一维弹性布局](/tailwind/041-FlexboxLayout)。

## 7. 相关阅读

- 一维排布（容器/项目、flex-1 家族、导航栏综合示例）：[Flexbox 一维弹性布局](/tailwind/041-FlexboxLayout)
- 二维版面（Grid、命名区域、auto-fill 卡片墙）：[Grid 网格布局](/tailwind/043-GridLayout)
- 脱离正常流的角标、吸顶与弹窗遮罩：[定位与层叠上下文](/tailwind/044-PositioningAndStacking)
- 间距与圆角的刻度来源（设计令牌）：[Tailwind 主题定制与设计令牌](/tailwind/050-ThemeCustomization)
