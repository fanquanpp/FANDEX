---
order: 40
title: 伪元素与内容装饰
module: 'tailwind'
category: 前端技术
difficulty: intermediate
description: 'Tailwind CSS 伪元素与内容装饰：before/after 与 content 机制、面包屑分隔符与必填星号等高频装饰、marker/selection/placeholder 文本细节、与变体体系组合及可访问性边界'
author: fanquanpp
updated: '2026-10-05'
related:
  - 'tailwind/030-UtilityCore'
  - 'tailwind/060-ResponsiveDark'
  - 'tailwind/090-TailwindAnimationTransition'
prerequisites:
  - 'tailwind/030-UtilityCore'
---

装饰是界面里"最不值钱也最频繁"的部分：面包屑中间的分隔符、表单必填项的小星号、引用块两侧的引号、悬停时滑出的小箭头。为它们每处都塞一个真实 DOM 元素，模板会被 `<span>` 淹没；CSS 伪元素（::before / ::after）正是浏览器为此准备的"免费额外元素"——不写进 HTML、由样式凭空生成。Tailwind 把伪元素做成了 `before:` 与 `after:` 变体，让这些装饰继续住在类名里。本篇讲清它们的机制、高频用法、与变体体系的组合，以及"伪元素内容会被读屏朗读"这条常被忽视的可访问性边界。

## 前置知识

- [Tailwind 工具类核心机制](/tailwind/030-UtilityCore)：变体语法是 before:/after: 的地基，任意值语法本篇大量使用。
- [Tailwind 响应式与暗色模式](/tailwind/060-ResponsiveDark)：变体叠加顺序在本篇有实战版。
- [Tailwind 动画与过渡](/tailwind/090-TailwindAnimationTransition)：悬停装饰动画是伪元素的高频搭档。

## 学习目标

1. 能解释伪元素"凭空生成、不进 DOM"的机制，说出 Tailwind 里 before:/after: 为什么必须配 content。
2. 能用 after: 写出面包屑分隔符与必填星号，用 before:/after: 做下划线延展装饰。
3. 能用 marker:、selection:、placeholder: 修饰列表符号、选中文本与占位符。
4. 能把伪元素变体与 hover:/group-hover:/dark: 等状态变体自由组合。
5. 能判断一个装饰该用伪元素还是真实元素，守住可访问性边界。

## 1. before/after 与 content：凭空生成的元素

每个元素最多挂两个伪元素：`::before` 生成在内容**之前**、`::after` 生成在内容**之后**，它们像隐形子元素一样参与布局，但在 DOM 树里不存在——JS 选不到它们，Elements 面板里也看不到（要在 Computed 面板按伪元素过滤才可见）。浏览器约定：**伪元素必须有 content 属性才会渲染**，content 为空或未设置时整个伪元素不存在。

Tailwind 的对应写法是把伪元素当变体用：`before:` 与 `after:` 前缀修饰任何工具类，内容用 `content-*` 工具类给出：

```html
<!-- 经典组合：after:content-[''] 开空伪元素，再给它形状 -->
<a class="relative flex items-center gap-1 hover:text-primary">
  歌单详情
  <span class="after:absolute after:-bottom-0.5 after:left-0
               after:h-px after:w-full after:origin-left
               after:scale-x-0 after:bg-primary
               after:transition-transform after:duration-200
               after:content-['']
               hover:after:scale-x-100"
  >悬停看我</span>
</a>
```

逐段拆解这个"下划线从左向右滑出"的招牌效果：

1. `after:content-['']` 是开关——没有它，后面所有 after: 类全部静默无效。方括号里是任意值语法，两个单引号表示空字符串。
2. `after:absolute` 配合父级的 `relative`，让伪元素定位于文字底部；`h-px w-full` 给出一条与文字等宽的细线。
3. `after:origin-left after:scale-x-0` 把线在水平方向缩到 0（以左端为锚），`hover:after:scale-x-100` 在悬停时展开——注意这里是**双变体叠加**：hover（状态）+ after（伪元素）+ 工具类。
4. `after:transition-transform` 让 scale 的变化走过渡（合成属性，性能安全，原理见 090 篇）。

**心智模型**：把 `before:`/`after:` 读成"给它肚子里塞一个看不见的子元素"。既然是子元素，宽高、定位、颜色、过渡全套布局工具都适用——你会的排版知识一个都不浪费。

## 2. 高频装饰三件套：分隔符、星号、引号

三个出现频率最高的装饰，各有讲究：

**面包屑分隔符**：最后一项不应有分隔符。用 `last:after:hidden` 把"末尾多出来的那一条"藏掉：

```html
<nav class="flex items-center gap-2 text-sm text-text-secondary">
  <a href="/" class="hover:text-primary">首页</a>
  <a href="/live" class="after:content-['/'] after:ml-2 last:after:hidden hover:text-primary">演唱会</a>
  <span>魔法未来 2026</span>
</nav>
```

**必填星号**：用 before: 放在标签前面，红色星号与文案解耦——文案怎么改，星号规则不变：

```html
<label class="before:mr-1 before:content-['*'] before:text-danger">
  手机号
</label>
```

**引用块引号**：大段引用左右各一个装饰性引号，伪元素做纯装饰、正文可读性不受影响：

```html
<blockquote class="relative px-8 py-4 italic text-text-secondary
                   before:absolute before:left-0 before:top-0
                   before:content-['“'] before:text-4xl before:text-primary/40
                   after:absolute after:right-0 after:bottom-0
                   after:content-['”'] after:text-4xl after:text-primary/40">
  这句歌词第一次出现是在 2019 年的巡演上。
</blockquote>
```

三例的共同点：**装饰信息不在 HTML 里**。内容改版时模板零改动；设计师要把"/"换成">"、星号换成"必填"，改一个类名即可。

## 3. 文本细节：marker、selection、placeholder

除了 before/after，还有三个直接修饰文本部件的变体，它们不需要 content：

```html
<!-- 列表符号：marker: 修饰 li 的圆点/序号 -->
<ul class="list-disc marker:text-primary">
  <li>开票提醒</li>
  <li>应援色投票</li>
</ul>

<!-- 选中文本：用鼠标划过看看 -->
<p class="selection:bg-primary selection:text-white">
  选中这段文字，高亮颜色跟主题走。
</p>

<!-- 占位符与原生控件 -->
<input
  placeholder="搜索歌姬或专辑"
  class="border border-border rounded-md px-3 py-2
         placeholder:text-text-secondary/60 focus:border-primary"
/>
```

1. `marker:` 修饰列表符号，颜色之外字号字重也有效——`marker:font-bold` 让序号加重是排行榜页的常见细节。
2. `selection:` 修改划词高亮。默认的蓝色高亮与品牌色打架时，一行 `selection:bg-primary selection:text-white` 全站（放 body 上）统一。
3. `placeholder:` 修饰输入框占位文本。注意占位符只该放**示例**（"搜索歌姬或专辑"），不该放字段说明——用户输入后占位符就消失了，说明文字放 `<p>` 或 aria 属性。
4. 同族的还有 `file:`（文件选择按钮）与 `first-letter:`（首字下沉），频率较低但语法同源，用到时按同样套路写即可。

## 4. 与变体体系组合：装饰也是响应式的

伪元素既然住在类名里，就自动继承整套变体体系——响应式、暗色、分组悬停全都直接可用：

```html
<!-- 暗色模式下换装饰颜色 -->
<span class="after:content-['NEW'] after:ml-1 after:text-xs after:text-danger
             dark:after:text-warning">
  新歌上架
</span>

<!-- 分组悬停：悬停卡片时伪元素才出现 -->
<a class="group flex items-center justify-between rounded-md p-3 hover:bg-surface-muted">
  <span>魔法未来 2026</span>
  <span class="opacity-0 -translate-x-1 transition
               group-hover:opacity-100 group-hover:translate-x-0
               after:content-['→']">
    查看
  </span>
</a>
```

变体叠加的书写顺序约定为"**状态在前、伪元素在后**"：`hover:after:scale-x-100`、`group-hover:after:opacity-100`、`dark:after:text-warning`。写反了（`after:hover:...`）语义变成"给伪元素加悬停态"——伪元素自己不会成为悬停目标，样式将永远不触发，而且不报错。

装饰的定位小技巧也归入组合纪律：伪元素用 absolute 时，宿主必须 `relative`。把这个配对写进团队代码评审清单（"看到 before:absolute/after:absolute 就检查宿主 relative"），能消掉一大类"装饰飞到页面角落"的事故。

## 5. 底层边界：伪元素不是万能替身

决定"用伪元素还是真实元素"前，过三道边界：

1. **可访问性边界**：`content` 里的文本会被屏幕阅读器朗读。星号、分隔符这类符号通常无害（读作 "star"、"slash"，略有噪音），但把关键信息只放在伪元素里（如"（已售罄）"）会让视觉用户与读屏用户看到不一致的页面。规则：**伪元素内容只做装饰，信息一律写在真实 DOM 里**。
2. **可交互边界**：伪元素不响应事件。点击目标（按钮热区、可点的图标）必须是真实元素；伪元素做的箭头、加号如果"看起来能点"，要确认真正接收点击的是宿主。
3. **元素类型边界**：`img`、`input` 这类**替换元素**（replaced element）没有"内容"可挂前后，`img::before` 在任何浏览器都不渲染——给图片加角标要用真实子元素或容器包裹。

另一个隐性成本是**调试盲区**：伪元素不在 DOM 里，Elements 面板默认看不到、JS 也选不到。排查装饰异常时，在 DevTools 选中宿主元素，切到 Styles 面板展开 `::before`/`::after` 分支才能看到它的样式。知道这个入口，"我的装饰类明明写了却不生效"的排查时间能从半小时缩到两分钟——先查 content 在不在，再查宿主 relative 在不在，最后查变体顺序对不对。

## 易错点与最佳实践

1. **漏写 content**。`after:ml-2 after:w-4` 写了一堆却没有 `after:content-['']`，整个伪元素不存在且无任何报错。修正：把 `content-['']` 当成 after: 组的第一个类形成肌肉记忆。
2. **变体顺序写反**。`after:hover:scale-x-100` 永远不触发（伪元素不是悬停目标）。修正：状态变体在外、伪元素变体在内，`hover:after:scale-x-100`。
3. **伪元素 absolute 而宿主没 relative**。装饰相对更上层的定位祖先飞走。修正：宿主补 `relative`，评审清单固定检查这一对。
4. **把信息放进伪元素**。`after:content-['（售罄）']` 让读屏用户错过关键状态。修正：售罄状态写在 DOM 里（文本或 aria-label），伪元素只补视觉样式。
5. **在 img 上用 before/after**。替换元素不渲染伪元素。修正：包一层容器，伪元素挂在容器上。
6. **用伪元素省 DOM 省过头**。一个组件上叠七八个 after: 类名比一个真实 `<span>` 更难读。修正：复杂装饰回归真实元素——伪元素的收益在"简单、高频、纯装饰"三条件同时满足时最大。

## 本篇小结

1. 伪元素是浏览器凭空生成的"隐形子元素"：不进 DOM、JS 选不到，必须有 content 才渲染；Tailwind 用 before:/after: 变体加 content-* 类表达。
2. 三个高频装饰：面包屑分隔符（last:after:hidden 收尾）、必填星号（before:content-['*']）、引用引号——装饰信息不进 HTML。
3. 文本细节三变体：marker: 修饰列表符号、selection: 修饰划词高亮、placeholder: 修饰占位符，语法同源。
4. 装饰自动继承变体体系，叠加顺序"状态在前、伪元素在后"；伪元素 absolute 必配宿主 relative。
5. 边界三问：信息进 DOM（读屏可及）、交互用真实元素、替换元素挂不了伪元素。

## 动手实践

**任务一：面包屑与星号。** 给一个三级面包屑导航实现"/"分隔符（末项无分隔符），再给表单的三个必填标签加红色星号。提示：分隔符内容放在 after:，收尾用 last:；星号是 before:。

**任务二：悬停下划线。** 按第 1 节实现"下划线从左滑出"的导航链接，把过渡时长改成 200ms 并解释为什么用 transform 而不是宽度。提示：复习 090 篇的"只动合成属性"；用宽度实现的版本做对照，Performance 面板录一次看布局长条。

**任务三：暗色装饰组合。** 实现"NEW"角标：亮色下红色、暗色下琥珀色，且在卡片悬停时才淡入。提示：需要 dark:、group-hover:、after: 三个变体叠加，注意顺序与 opacity 过渡。

先自己写，再对照参考实现：

<details>
<summary>任务一参考实现</summary>

```html
<nav class="flex items-center gap-1 text-sm text-text-secondary" aria-label="面包屑">
  <a href="/" class="hover:text-primary">首页</a>
  <a href="/live" class="after:content-['/'] after:mx-1.5 last:after:hidden hover:text-primary">演唱会</a>
  <a href="/live/miku" class="after:content-['/'] after:mx-1.5 last:after:hidden hover:text-primary">歌姬巡演</a>
  <span class="text-text-primary" aria-current="page">魔法未来 2026</span>
</nav>

<label class="before:mr-1 before:content-['*'] before:text-danger">手机号</label>
<label class="before:mr-1 before:content-['*'] before:text-danger">证件号</label>
```

末项处理用了两道保险：中间项全部带 after:，当前页 `<span>` 根本没有 after: 类；若列表由循环渲染、末项与中间项共用同一模板，`last:after:hidden` 负责把最后一项的分隔符藏掉。分隔符还可以换成图标字符（`after:content-['›']`），模板零改动。
</details>

<details>
<summary>任务二参考实现</summary>

```html
<a
  href="/live"
  class="relative inline-block pb-0.5 hover:text-primary
         after:absolute after:bottom-0 after:left-0
         after:h-0.5 after:w-full after:origin-left
         after:scale-x-0 after:bg-primary
         after:transition-transform after:duration-200
         after:content-[''] hover:after:scale-x-100"
>
  演唱会
</a>
```

宽度对照版：把 `after:scale-x-0 hover:after:scale-x-100` 换成 `after:w-0 hover:after:w-full`（并把 transition-transform 换成 transition-all）。Performance 面板录制两次悬停：transform 版帧全部落在合成通道；width 版每帧出现 Layout（紫色长条）——链接多、悬停频繁的导航上差距会被放大。这就是"装饰动画也守合成属性底线"的实证。
</details>

<details>
<summary>任务三参考实现</summary>

```html
<a class="group relative inline-flex items-center gap-2 rounded-md p-2 hover:bg-surface-muted">
  魔法未来 2026
  <span
    class="after:content-['NEW'] after:ml-1 after:text-xs after:font-bold
           after:text-danger dark:after:text-warning
           after:opacity-0 after:transition-opacity after:duration-200
           group-hover:after:opacity-100"
  >日程公布</span>
</a>
```

注意三个细节：变体顺序是 `dark:after:` 与 `group-hover:after:`（状态在前、伪元素在后）；颜色用语义令牌（danger/warning）而不是写死色值，主题换肤跟随；淡入用 opacity 过渡而非 display 切换——display 不参与过渡，改用它会丢掉动画（090 篇第 3 节讲过纯 CSS 时代的解法，这里用最朴素的 opacity 足够）。伪元素与真实元素在这里做了一次分工：视觉角标交给 after:，"日程公布"这个信息本身在 DOM 里，读屏用户不依赖角标也能获知状态。
</details>

## 一句话记忆

> 伪元素是类名里的隐形子元素：`content-['']` 是开关、宿主 relative 是地基、状态变体写在伪元素变体前面；装饰只做视觉，信息进 DOM。
