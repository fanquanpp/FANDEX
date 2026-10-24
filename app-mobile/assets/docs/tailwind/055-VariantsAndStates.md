---
order: 100
title: Tailwind 变体引擎与交互状态
module: 'tailwind'
category: 前端技术
difficulty: beginner
description: Tailwind CSS v4 变体引擎系统讲解：hover/focus-visible/active/disabled 交互状态、peer-/group-has-/not-/子代 * 关系型变体、任意变体与 data-* 变体、变体叠加顺序与生成 CSS 优先级原理、@custom-variant 自定义
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- 知识类别：Tailwind 的变体（variant）机制——同一个工具类在不同状态、不同关系、不同属性条件下生效的引擎层原理。
- 解决什么问题：不写一行自定义 CSS，表达"悬停时""兄弟输入框非法时""后代被选中时""仅键盘聚焦时"等条件样式，并理解叠加顺序与覆盖规则。
- 什么时候用到：一切交互反馈（按钮、表单、卡片）、组件联动（父子、兄弟）、按 data/aria 状态换肤、封装项目自己的变体。
- 入门清单版见[核心概念与工具类](/tailwind/030-UtilityCore)第 9 节；本篇讲引擎面：原理、关系型变体、叠加顺序与自定义。

## 前置知识

- [Tailwind CSS 核心概念与工具类](/tailwind/030-UtilityCore)：会读"前缀 + 值"的类名结构，用过 `hover:` 与 `group-hover:`。
- [Tailwind CSS 伪元素与内容装饰](/tailwind/035-PseudoElementsAndContent)：见过 `hover:after:` 这类双变体叠加。

## 学习目标

- 能说清变体的本质：它把工具类的选择器改写成"条件 + 目标"，并理解叠加变体时条件的组合顺序。
- 能区分 `focus:`、`focus-visible:`、`focus-within:` 三兄弟，并按可访问性要求选对。
- 能用 `peer-*`、`group-*`（含 data 属性写法）、`has-*`、`not-*`、子代 `*:` 表达元素间的关系条件。
- 能用任意变体 `[&_p]:`、`data-[size=large]:` 处理预设清单之外的场合。
- 能解释"HTML 里类名顺序不影响结果、生成 CSS 的顺序才影响"，并据此排查覆盖失效。
- 能用 `@custom-variant` 注册项目自己的变体。

## 0. 同一个类，换前缀即换状态

[核心概念与工具类](/tailwind/030-UtilityCore)里说：变体是"在工具类前加状态前缀"。本篇往下挖一层——**变体到底做了什么**。

`hover:bg-blue-700` 编译后并不是 `.bg-blue-700` 多了一行，而是生成了一个**条件选择器**：

```css
/* hover:bg-blue-700 的产物（示意） */
.hover\:bg-blue-700:hover {
  background-color: var(--color-blue-700);
}
```

对比基础类 `.bg-blue-700 { ... }`：变体只做了一件事——把"无条件生效"改写成"满足条件才生效"。条件可以是伪类（`:hover`）、伪类函数（`:has(...)`、`:not(...)`）、兄弟组合器（`.peer:checked ~ .peer-checked\:block`）、媒体查询（`md:`）等。**记住这个模型：变体 = 选择器改写器**，后面所有花样都是它的推论。

由此立刻推出两条工程事实：其一，`hover:bg-blue-700` 与 `bg-blue-700` 是两个不同的类，HTML 里忘了写变体前缀，样式就变成了常驻——这是初学最常见事故；其二，变体可以无限叠，每叠一层条件就多包一层（第 5 节展开）。

## 1. 交互状态变体：按钮与表单的四种表情

### 1.1 hover / active：鼠标的两个时刻

`hover:` 是悬停中，`active:` 是按下未松开。两者配合形成"静止 - 悬停 - 按下"的完整反馈链：

```html
<button class="rounded-md bg-blue-600 px-4 py-2 text-white
               hover:bg-blue-700 active:bg-blue-800 active:scale-95">
  提交订单
</button>
```

讲解：`active:scale-95` 给按下一瞬加了"缩一点"的物理感（scale 在 v4 用独立 CSS 属性 `scale` 实现，可直接被过渡驱动，见[变换、滤镜与视觉特效](/tailwind/085-TailwindVisualEffects)）。注意触屏设备上 `hover:` 的语义是"点按瞬间"，不要把关键功能只放在 hover 里——触屏用户可能永远"悬停"不到。

### 1.2 focus 三兄弟：键盘、鼠标、子元素

三个聚焦变体语义不同，混用是最常见的可访问性事故：

| 变体 | 触发条件 | 典型场景 |
| --- | --- | --- |
| `focus:` | 获得焦点（点击、Tab 都算） | 输入框高亮边框 |
| `focus-visible:` | 仅键盘/辅助技术触发的聚焦 | 给 Tab 导航画轮廓环，鼠标点击不画 |
| `focus-within:` | 自身或**任意后代**获得焦点 | 下拉容器整体高亮 |

```html
<!-- 推荐：outline 只给键盘用户，鼠标点击不出现蓝圈 -->
<button class="rounded-md bg-blue-600 px-4 py-2 text-white
               focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">
  键盘 Tab 到我试试
</button>

<!-- focus-within：搜索框容器随内部输入聚焦而整体变色 -->
<label class="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2
              focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
  <!-- 图标建议用 SVG，此处省略 -->
  <input class="w-full outline-none" placeholder="搜索课程" />
</label>
```

讲解：老项目里常见"点按钮闪出一个丑蓝框，于是全局 `outline-none`"——这会把键盘用户直接推向失焦盲区。正确姿势是 `focus:outline-none`（或 v4 的 `outline-hidden`）与 `focus-visible:outline-*` 成对出现：鼠标点击安静，键盘 Tab 仍有清晰焦点环。`focus-within` 则解决"焦点在看不见的后代上，容器也要有反应"。

### 1.3 disabled 与表单态变体

表单相关的状态变体成体系：`disabled:`、`required:`、`invalid:`、`user-invalid:`、`read-only:`、`checked:`、`placeholder-shown:`、`autofill:`。其中 `invalid:` 在"提交瞬间就标红"上过于激进，`user-invalid:`（用户与该字段交互过之后才判定）体验更温和，v4 已内建。

```html
<!-- 禁用态：置灰 + 禁点光标，悬停不变色 -->
<button class="rounded-md bg-blue-600 px-4 py-2 text-white
               enabled:hover:bg-blue-700 enabled:active:bg-blue-800
               disabled:cursor-not-allowed disabled:opacity-50"
        disabled>
  提交中……
</button>

<!-- 只读态与非法态 -->
<input class="read-only:bg-gray-50 invalid:border-red-400 user-invalid:border-red-400" />
```

讲解：`disabled:hover:bg-blue-700` 不会生效的原因很简单——禁用元素根本不响应鼠标事件，条件永远为假。反过来，正确写法是把悬停效果限定在"可用时"：`enabled:hover:*` 或 `not-disabled:hover:*`，这样禁用切换时悬停样式自动失效，不需要 JS 配合。

## 2. 关系型变体：条件不在自己身上

第 1 节的变体条件都在元素自身；关系型变体把条件放到**别人**身上——兄弟（peer）、祖先（group/has）、后代（*）。这是 Tailwind 变体引擎最有表达力的部分。

### 2.1 peer：兄弟状态的前向反馈

`peer` 只响应**前面**的兄弟：给前一个元素标 `peer`，后面的元素用 `peer-*:` 响应它的状态。CSS 只有"后面的元素跟随前面"（`~` 组合器）这一个方向，这是引擎约束，不是写法偏好。

```html
<!-- 邮箱输入非法时，右侧出现提示箭头与文案 -->
<div class="flex items-center gap-2">
  <input type="email" required
         class="peer w-64 rounded-md border border-gray-300 px-3 py-2
                invalid:border-red-400" />
  <span class="hidden text-xs text-red-500 peer-invalid:block">邮箱格式不正确</span>
</div>
```

讲解：`peer-invalid:block` 编译为 `.peer:invalid ~ .peer-invalid\:block`——"前面的 peer 非法时，显示我"。整条链路没有一行 JS：浏览器原生校验判定 `:invalid`，CSS 完成反馈。要点有三：`peer` 类必须加在**前面**那个元素上；目标元素必须是 peer 的**后续**兄弟（前面不响应后面）；同一容器要有多组"前驱 + 反应物"时用命名 peer（`peer/draft` 与 `peer-checked/draft:`）避免互相串扰。

### 2.2 group 与数据属性：祖先状态的联动

`group-hover:` 在[核心概念与工具类](/tailwind/030-UtilityCore)已入门。本篇补上它的完整形态——**group 的数据属性写法**：状态不用伪类表达，而是挂在祖先的 `data-*` 属性上，JS 只改属性、类名零改动：

```html
<!-- 卡片列表：JS 只需 toggle 祖先的 data-state -->
<div class="group flex items-center justify-between rounded-xl border p-4
            data-[state=selected]:border-blue-400 data-[state=selected]:bg-blue-50"
     data-state="selected">
  <span class="font-medium group-data-[state=selected]:text-blue-700">订单 #1024</span>
  <span class="rounded bg-gray-100 px-2 py-0.5 text-xs
               group-data-[state=selected]:bg-blue-100 group-data-[state=selected]:text-blue-700">
    已选中
  </span>
</div>
```

讲解：`data-[state=selected]:` 是"自身属性变体"，`group-data-[state=selected]:` 是"祖先属性变体"。这类写法是组件库（如 Radix/shadcn 风格）的标准接口：组件对外只暴露一个 `data-state` 属性，样式层全部用变体消费。嵌套列表里有多个 group 时，用命名 group `group/item` 与 `group-data-[...]/item:` 精确指向。v4 还提供"隐式 group"：`in-focus:` 响应任意祖先聚焦，连 `group` 类都不用标。

### 2.3 has-：后代状态反向告知祖先

`peer` 是"后面跟前面"，`has-` 是"里面变外面"——祖先根据**后代**的状态换装。v4 里常用形态是裸值简写 `has-checked:`（等价 `has-[:checked]`）：

```html
<!-- 计费方案卡片：内部单选被选中时整卡高亮 -->
<label class="flex cursor-pointer flex-col gap-2 rounded-xl border-2 border-gray-200 p-5
              has-checked:border-blue-500 has-checked:bg-blue-50">
  <input type="radio" name="plan" class="size-4" />
  <span class="font-semibold">专业版</span>
  <span class="text-sm text-gray-500">¥ 68 / 月，含全部课程与题库</span>
</label>
```

讲解：`has-checked:border-blue-500` 编译为 `&:has(:checked)`——"我的后代里有被勾选的元素时"。它把传统上必须靠 JS 维护的"选中卡样式"压缩进纯 CSS。同族还有 `group-has-*`（祖先的祖先联动）与 `peer-has-*`（前面兄弟的后代联动）；更复杂的条件用任意值写：`has-[img]:p-0`（包含图片时去内边距）、`has-[a]:underline`（内部含链接时加下划线）。

### 2.4 not- 与子代 *：补齐两个方向

`not-*` 把任意条件取反；`*:` 把样式批量发给**直接子元素**，`**:` 发给所有后代：

```html
<!-- not-：最后一个之外都加底边线（比 last:border-b-0 的写法更直白） -->
<ul class="divide-y divide-gray-100 not-last:border-b">
  <li class="py-2">第一章</li>
  <li class="py-2">第二章</li>
  <li class="py-2">第三章</li>
</ul>

<!-- 子代 *：标签列表里每个直接子元素统一描边，子元素自己零类名 -->
<div class="flex flex-wrap gap-2 *:rounded-full *:border *:border-sky-100 *:bg-sky-50 *:px-3 *:py-1 *:text-sm">
  <span>Vue</span><span>React</span><span>Svelte</span>
</div>
```

讲解：`*:` 的编译形态是 `& > *` 加 `:is()` 包裹，与子元素自己的常规类**特异性相同**——所以在子元素上写 `rounded-lg` 想覆盖父级的 `*:rounded-full` 是不生效的（生成 CSS 里子代规则排在后面）。需要覆盖时改用任意变体提高特异性，或干脆在父级改条件。`not-` 可以叠加在状态前：`hover:not-focus:bg-indigo-700` 表示"悬停且未聚焦"，两个条件的交集。

### 2.5 任意变体：清单之外的一切

预设变体覆盖不到的，用方括号手写选择器，`_` 代表空格，`&` 代表元素自身：

```html
<!-- CMS 富文本容器：正文里所有段落加间距、表格加边框 -->
<article class="[&_p]:mt-4 [&_table]:w-full [&_th]:border [&_th]:px-2 [&_th]:py-1">
  <!-- 后端渲染的富文本 HTML 原样塞进来，样式由容器统一接管 -->
</article>

<!-- 类名条件：被第三方脚本加上 .is-dragging 时生效 -->
<li class="[&.is-dragging]:cursor-grabbing">可拖拽项</li>

<!-- 特性查询：支持 Grid 就用 Grid -->
<div class="flex [@supports(display:grid)]:grid [@supports(display:grid)]:grid-cols-3">...</div>
```

讲解：任意变体是变体引擎的"逃生舱"，前两篇的任意值语法（`w-[320px]`）管"任意属性值"，任意变体管"任意条件"。最实用的场景就是富文本/CMS 容器与第三方库的 class 钩子——外部内容的类名你控制不了，但容器的任意变体可以精确圈住它们。

## 3. 三个工程场景串联

### 3.1 评论区楼层：peer 校验反馈链

回复框输入超长或为空时，发布按钮禁用并提示——三个变体族在同一场景协作：

```html
<div class="flex flex-col gap-2 rounded-xl border border-gray-200 p-4">
  <textarea maxlength="500" required
            class="peer h-24 w-full resize-none rounded-md border border-gray-300 p-3 text-sm
                   focus:border-blue-400 focus:outline-none"></textarea>
  <div class="flex items-center justify-between">
    <span class="text-xs text-gray-400 peer-placeholder-shown:text-gray-300">
      还可以输入 500 字
    </span>
    <button class="rounded-md bg-blue-600 px-4 py-2 text-sm text-white
                   disabled:cursor-not-allowed disabled:opacity-50
                   enabled:hover:bg-blue-700">发布</button>
  </div>
</div>
```

讲解：`peer-placeholder-shown:text-gray-300` 让字数提示在"还没输入"时变浅——placeholder 还在就是没输入，这个信号通过 peer 跨元素传递。发布按钮的禁用由表单校验驱动（`:invalid` 传递给按钮或由前端框架控制 `disabled` 属性），样式层全部用 `disabled:`/`enabled:hover:` 接住。

### 3.2 卡片列表选中态：has- 一行顶过去二十行

多选列表"勾选行整行高亮"，传统写法要给每行维护一个 `selected` state：

```html
<ul class="divide-y divide-gray-100 rounded-xl border border-gray-200">
  <li class="flex items-center gap-3 px-4 py-3 has-checked:bg-emerald-50">
    <input type="checkbox" class="size-4 accent-emerald-600" checked />
    <span class="text-sm">导出用户列表</span>
    <span class="ml-auto text-xs text-emerald-600 opacity-0 has-checked:opacity-100">已选</span>
  </li>
  <li class="flex items-center gap-3 px-4 py-3 has-checked:bg-emerald-50">
    <input type="checkbox" class="size-4 accent-emerald-600" />
    <span class="text-sm">清理缓存</span>
    <span class="ml-auto text-xs text-emerald-600 opacity-0 has-checked:opacity-100">已选</span>
  </li>
</ul>
```

讲解：`li` 不需要任何状态类，勾选框也不需要 id/for 关联——`has-checked:` 把"后代被勾选"直接翻译成祖先的样式条件。"已选"角标用 `opacity-0 has-checked:opacity-100` 淡入，比 `hidden` 切换多一个可过渡的中间态。

### 3.3 表单禁用提交按钮：状态链的端到端

```html
<form class="flex flex-col gap-3">
  <input required class="rounded-md border border-gray-300 px-3 py-2
                         invalid:border-red-300 user-invalid:border-red-400" placeholder="手机号" />
  <button type="submit"
          class="rounded-md bg-blue-600 px-4 py-2 font-medium text-white
                 transition-colors
                 enabled:hover:bg-blue-700 enabled:active:bg-blue-800
                 disabled:cursor-not-allowed disabled:opacity-50">提交</button>
</form>
```

讲解：按钮的三态全部由变体声明：可用时悬停加深、按下再深一档；禁用时置灰禁点。把 `transition-colors` 加上后（详见[动画与过渡](/tailwind/090-TailwindAnimationTransition)），状态切换是渐变而不是跳变。注意禁用态下 `enabled:hover:` 不生效是**正确行为**——别用"更浅的颜色"去表达禁用，统一交给 `disabled:opacity-50`。

## 4. data-* 变体与 @custom-variant：把约定固化下来

`data-[size=large]:p-8` 这类任意属性变体写多了会显得冗长，`@custom-variant` 把它们注册成项目级短名（本篇第 2.2 节的 data-state 写法就是它的天然用户）：

```css
/* src/styles/global.css */
@import "tailwindcss";

/* 短名形态：一行声明，选择器手写 */
@custom-variant hocus (&:hover, &:focus-visible);

/* 块形态：复杂条件用 @slot 占位 */
@custom-variant theme-midnight {
  &:where([data-theme="midnight"] *) {
    @slot;
  }
}
```

```html
<button class="hocus:bg-blue-700 hocus:outline-2">悬停或键盘聚焦都高亮</button>
<div class="theme-midnight:bg-black">午夜主题下变黑</div>
```

讲解：`@custom-variant` 是 v4 对 v3 插件式变体的替代。三步法：先写任意变体验证条件（`data-[state=selected]:`），确认高频后注册短名（`@custom-variant data-selected (&[data-state="selected"]);`），最后全项目替换。`dark:` 变体的类名切换模式（[响应式与暗色模式](/tailwind/060-ResponsiveDark)）正是靠 `@custom-variant dark (&:where(.dark, .dark *));` 实现的——同一个机制。

## 5. 变体叠加顺序与覆盖规则：排错的理论基础

### 5.1 叠加从左往右读

变体叠加的书写顺序是**从左到右逐层收紧**：`dark:md:hover:bg-fuchsia-600` 读作"暗色模式下、中等屏幕以上、悬停时"。引擎按同样的顺序嵌套条件：外层暗色媒体查询，中层断点媒体查询，内层 `:hover` 伪类。写错顺序大多数场合只是语义变化（`hover:md:` 与 `md:hover:` 殊途同归），但涉及 `peer`/`group` 这类组合器方向时会产生实质差异——[伪元素与内容装饰](/tailwind/035-PseudoElementsAndContent)里"状态在前、伪元素在后"的约定就是一例：`after:hover:` 永远不触发，因为伪元素不是悬停目标。

### 5.2 HTML 类名顺序不算数，生成 CSS 顺序才算数

```html
<!-- 两个类都命中时，谁赢？ -->
<div class="bg-red-500 bg-blue-500">蓝色（blue-500 在生成 CSS 中靠后）</div>
```

CSS 特异性相同时，**样式表里靠后的规则获胜**，与 HTML 属性里类名的先后毫无关系。Tailwind 对工具类有固定的内部排序，所以上例稳定输出蓝色；同理，`hover:bg-blue-700` 稳定压过 `bg-blue-600`（变体类整体排在基础类之后生成）。这条原理直接给出排错口诀：**两条规则打架时，别调换 HTML 里的类名顺序，去查 DevTools 里哪个规则被划掉了、来自样式表哪个位置**。

### 5.3 覆盖失效的常见根因

| 现象 | 根因 | 解法 |
| --- | --- | --- |
| `*:rounded-full` 改不动子元素圆角 | 子代变体与子元素自身类特异性相同，且生成在后 | 用任意变体加权重，如子元素写 `[&]:rounded-lg` 或父级调整条件 |
| `disabled:hover:bg-blue-700` 不生效 | 禁用元素不派发鼠标事件 | 改 `enabled:hover:*` |
| `after:hover:*` 永远不触发 | 伪元素不是悬停目标 | 顺序换成 `hover:after:*` |
| `peer-*` 不生效 | 目标元素在 peer **前面** | 调整 DOM 顺序，或改用 group/has 方向 |
| 同名状态互相串扰 | 容器里有多组 group/peer | 命名：`group/item`、`peer/draft` |

## 6. 常见错误与对策

| 错误场景 | 表现 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| 忘写变体前缀 | 样式常驻，交互消失 | 把状态类写成了基础类 | 状态样式必须带前缀 |
| focus 与 focus-visible 混用 | 鼠标点击也出焦点环，或键盘无焦点环 | 语义没分清 | 鼠标+键盘都要：focus；仅键盘：focus-visible |
| peer 方向写反 | 后面的输入框变化，前面的提示不动 | CSS 兄弟组合器只有前向 | peer 标在前驱上，反应物放后面 |
| 嵌套列表 group 串扰 | 内层卡片响应了外层悬停 | 未命名 group | `group/card` + `group-hover/card:` |
| 任意变体空格 | `[&_ p]:mt-4` 不生效 | 类名不允许空格 | 用下划线：`[&_p]:mt-4` |
| 滥用 not- 叠加 | 条件组合没人看得懂 | 一行塞四个变体 | 超过三层拆成组件级约定或 @custom-variant 短名 |

## 7. 动手实践

**任务一：按钮五态。** 实现一个按钮，覆盖静止、悬停、按下、键盘聚焦、禁用五种状态，且禁用时悬停不变色。提示：基础类 + `hover:` + `active:` + `focus-visible:` + `disabled:`，悬停链路用 `enabled:` 限定。

**任务二：tabs 联动。** 用 radio + peer 实现"选中的 tab 有底色"，不写任何 JS。提示：radio 标 `peer`，标签文字是它的后续兄弟，`peer-checked:` 接管样式；多个 tab 并列时想想 `peer` 作用范围。

**任务三：富文本容器。** 给一段无类名的富文本 HTML（含 p、ul、a、table）做容器级排版：段落间距、链接下划线、表格细边框，全部用任意变体在容器上完成。提示：`[&_p]:`、`[&_a]:`、`[&_table]:`；链接要单独给颜色。

先自己写，再对照参考实现：

<details>
<summary>任务一参考实现</summary>

```html
<button class="rounded-lg bg-blue-600 px-5 py-2.5 text-white transition-colors
               enabled:hover:bg-blue-700
               enabled:active:bg-blue-800 enabled:active:scale-95
               focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500
               disabled:cursor-not-allowed disabled:opacity-50">
  保存设置
</button>
```

五个状态各占一行，互不依赖 JS。`transition-colors` 只过渡颜色、不过渡 scale；若希望按下缩放也平滑，把过渡改成 `transition-[background-color,scale]`。全局场景里"禁用悬停不变色"由 `enabled:` 限定实现——换成 `disabled:hover:bg-blue-700`（什么都不写）则是另一类错误：以为写了悬停、实际从未生效。
</details>

<details>
<summary>任务二参考实现</summary>

```html
<div class="inline-flex rounded-lg bg-gray-100 p-1">
  <input type="radio" name="tab" id="tab-a" class="peer/a sr-only" checked />
  <label for="tab-a" class="rounded-md px-4 py-1.5 text-sm text-gray-500
                            peer-checked/a:bg-white peer-checked/a:text-gray-900 peer-checked/a:shadow-sm">课程</label>
  <input type="radio" name="tab" id="tab-b" class="peer/b sr-only" />
  <label for="tab-b" class="rounded-md px-4 py-1.5 text-sm text-gray-500
                            peer-checked/b:bg-white peer-checked/b:text-gray-900 peer-checked/b:shadow-sm">题库</label>
</div>
```

关键在**命名 peer**：同一个容器里有两组"radio + label"，若都用匿名 `peer`，第一组选中时第二组 label 也会响应（`~` 是"所有后续兄弟"）。`peer/a` + `peer-checked/a:` 把响应范围锁到自己的组。`sr-only` 让 radio 视觉隐藏但保留键盘可访问性——tab 键盘操作天然可用，这是"零 JS 交互"的可访问性底线。
</details>

<details>
<summary>任务三参考实现</summary>

```html
<article class="max-w-3xl text-sm leading-relaxed text-gray-700
                [&_p]:mt-3
                [&_a]:text-blue-600 [&_a]:underline [&_a]:underline-offset-2
                [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6
                [&_table]:mt-4 [&_table]:w-full [&_table]:border-collapse
                [&_th]:border [&_th]:border-gray-200 [&_th]:bg-gray-50 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left
                [&_td]:border [&_td]:border-gray-200 [&_td]:px-2 [&_td]:py-1">
  <!-- 富文本内容原样注入 -->
</article>
```

全部样式住在容器一个元素上，内部节点零类名——这正是任意变体存在的理由：内容不受你控制（CMS、用户输入、markdown 渲染产物），样式必须"圈住"而不是"逐个贴"。若要暗色模式跟随，在每条任意变体前叠 `dark:`（`dark:[&_a]:text-blue-400`），这就是第 5 节"从左往右"叠加的实战读法。
</details>

## 8. 一句话记忆

变体是选择器改写器：自身条件用状态变体（分清 focus 三兄弟与 disabled 家族），关系条件用 peer（前驱之后）、group + data-*（祖先属性）、has-（后代反向）、not- 与子代 `*:`；清单外用任意变体，高频条件用 `@custom-variant` 固化成短名；叠加从左往右读，覆盖看生成 CSS 顺序而不看 HTML 类名顺序。

## 9. 相关阅读

- 入门级状态变体清单：[核心概念与工具类](/tailwind/030-UtilityCore)第 9 节
- 伪元素变体与"状态在前、伪元素在后"约定：[伪元素与内容装饰](/tailwind/035-PseudoElementsAndContent)
- `dark:` 与断点变体的系统展开：[响应式与暗色模式](/tailwind/060-ResponsiveDark)
- 变体驱动的过渡与动画：[动画与过渡](/tailwind/090-TailwindAnimationTransition)

## 参考与致谢

- 本文变体清单、语法与编译行为依据 Tailwind CSS 官方文档 v4（Hover, focus, and other states / Using custom variants，CC-BY 4.0）：https://tailwindcss.com/docs/hover-focus-and-other-states 、https://tailwindcss.com/docs/adding-custom-styles
