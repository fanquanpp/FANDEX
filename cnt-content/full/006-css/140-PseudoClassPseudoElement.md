---
order: 140
title: 伪类与伪元素
module: 'css'
category: 前端技术
difficulty: intermediate
description: "从「列表最后一项的分割线多了一条」这类真实样式需求出发，掌握结构伪类 :nth-child 的 An+B 公式与 :is/:where/:has 现代匹配工具，分清一个冒号的伪类与两个冒号的伪元素，并能在不写一行 JS 的前提下完成悬停、表单校验反馈与内容装饰。"
author: fanquanpp
updated: '2026-09-29'
related:
  - 'css/130-CSS3SelectorSystem'
  - 'css/170-PriorityCalculation'
  - 'css/190-DebuggingCSS'
  - 'css/520-CSSCounters'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
  - 'css/130-CSS3SelectorSystem'
---

## 前置知识

- 已完成 [CSS3 选择器系统](/css/130-CSS3SelectorSystem)：知道类选择器、后代选择器怎么写即可；
- 不需要任何 JavaScript 基础——伪类要解决的正是「不写 JS 也能响应状态」。

## 学习目标

读完本文你将能够：

1. 写出 `li:nth-child(3n + 1)` 这类 An+B 公式，并预测它到底选中哪几个元素；
2. 分清伪类（一个冒号，描述状态）与伪元素（两个冒号，造出页面上不存在的零件），不再混用；
3. 用 `:hover`、`:focus-visible`、`:checked`、`:valid` 响应用户交互与表单状态；
4. 用 `:not()`、`:is()`、`:where()`、`:has()` 组合复杂条件，说清四者对优先级的不同影响；
5. 遇到「样式没生效」时，能按「冒号数、兄弟节点、content 是否写了、元素是否可替换」四步排查。

预计 40 到 60 分钟，含 2 组动手实验与 4 道练习。

## 1. 问题引入：一个待办列表逼出来的五种选择器

你在给自己的周报工具做待办列表：每一行之间要一条浅分割线，但最后一行下面不能再有线，否则和容器边框贴出「双线」；鼠标扫过某一行要有底色；勾选完成的那行文字要变灰；列表为空时要显示一句提示。这四个需求有一个共同点：它们取决于「元素的状态或位置」，而不是元素本身长什么样。

给每一行手写 `.item-1`、`.item-2` 加类名当然能做，但列表是动态渲染的，行数会变，类名方案会立刻崩。CSS 早就为这类问题准备好了工具：**伪类**描述元素的「状态或位置」，**伪元素**则更进一步，能在页面里「无中生有」地造出零件。本文一次讲透。

## 2. 最小示例：不写 JS 的待办列表

新建文件夹 `pseudo-experiment`，放两个文件。`index.html`：

```html
<ul class="todos">
  <li class="todo">整理周报素材</li>
  <li class="todo done">写完 Grid 章节</li>
  <li class="todo">检查错别字</li>
  <li class="todo">发布</li>
</ul>
<p class="empty-tip">今天没有待办，摸鱼吧。</p>
```

`styles.css`：

```css
/* 分割线只画在行与行之间：最后一行不用画 */
.todo {
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
}
.todo:last-child {
  border-bottom: none;
}

/* 鼠标悬停换底色 */
.todo:hover {
  background: #f1f5f9;
}

/* 已完成：文字变灰加删除线 */
.todo.done {
  color: #94a3b8;
  text-decoration: line-through;
}

/* 列表为空时显示提示（配合 :has 由父容器判断） */
.todos:not(:has(.todo)) {
  display: none;
}
body:has(.todos:not(:has(.todo))) .empty-tip {
  display: block;
}
.empty-tip {
  display: none;
  color: #64748b;
}
```

预期效果：四行任务，行间各一条浅线、最后一行无线；鼠标悬停哪行哪行变灰底；「写完 Grid 章节」呈灰色删除线态。删光所有 `li` 后刷新，列表整体消失、提示文字出现——全程零 JavaScript。

## 3. 核心概念

### 3.1 一个冒号与两个冒号：先分清两种「伪」

| | 伪类 Pseudo-class | 伪元素 Pseudo-element |
| --- | --- | --- |
| 冒号 | 一个，如 `:hover` | 两个，如 `::before` |
| 回答的问题 | 这个元素现在处于什么状态/位置 | 页面上有个不存在于 HTML 里的零件 |
| 举例 | `:hover`、`:nth-child(2)`、`:checked` | `::before`、`::placeholder` |

历史坑点：CSS2 时代 `:before`、`:after` 都是一个冒号，CSS3 起规范要求伪元素写两个冒号以示区分。老代码里的单冒号写法浏览器仍兼容，但新代码一律写两个。

### 3.2 结构伪类：按位置选元素

最常用的一组。假设 `.todos` 里有 4 个 `li`：

```css
li:first-child       { }  /* 第 1 个 */
li:last-child        { }  /* 第 4 个 */
li:nth-child(2)      { }  /* 第 2 个 */
li:nth-child(odd)    { }  /* 第 1、3 个（奇数） */
li:nth-child(even)   { }  /* 第 2、4 个（偶数），斑马纹就用它 */
li:nth-child(-n + 3) { }  /* 前 3 个 */
li:nth-last-child(2) { }  /* 倒数第 2 个 */
li:only-child        { }  /* 独生子 */
```

An+B 公式是这里的唯一难点。把它读成「从 A 开始，每隔 B 取一个」，n 依次取 0、1、2...：

- `3n + 1`：n=0 取第 1 个，n=1 取第 4 个，n=2 取第 7 个——每 3 个取第 1 个；
- `2n`：第 2、4、6 个——偶数位，即 `even`；
- `-n + 3`：n=0 取第 3 个，n=1 取第 2 个，n=2 取第 1 个，n 再大结果为负被丢弃——前 3 个。

**`nth-child` 数的是「所有兄弟元素」，不筛标签**。容器里混着 `h2` 和 `p` 时，`p:nth-child(2)` 要求「既是第 2 个孩子，又是 p」，两个条件同时成立才命中；只想数同类标签用 `p:nth-of-type(2)`（第 2 个 p）。这是两者唯一的区别，也是选错时布局错位的根源。

### 3.3 交互伪类：响应用户的手

```css
/* 悬停与按下，按钮反馈的标配组合 */
.button:hover  { background: #2563eb; }
.button:active { transform: scale(0.97); }

/* 键盘 Tab 聚焦才显示焦点环，鼠标点击不显示 */
.button:focus-visible {
  outline: 3px solid #93c5fd;
  outline-offset: 2px;
}

/* 自己或后代获得焦点时生效，常用于搜索框高亮整个容器 */
.search:focus-within {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px #dbeafe;
}
```

`a:link`（未访问）与 `a:visited`（已访问）是链接专属的历史伪类；出于隐私保护，浏览器只允许在 `:visited` 里改有限几个颜色属性，无法读取「用户访问过哪些链接」。

### 3.4 表单伪类：校验反馈不写 JS

```css
input:required + label::after { content: " *"; color: #ef4444; }
input:disabled { background: #f1f5f9; color: #94a3b8; }
input:not(:placeholder-shown):invalid {
  border-color: #ef4444;
}
input:not(:placeholder-shown):valid {
  border-color: #22c55e;
}
input[type="checkbox"]:checked + span {
  color: #2563eb;
}
```

`input:not(:placeholder-shown):invalid` 是最实用的一条组合：用户还没输入时不报错（`:placeholder-shown` 表示占位符还显示着，即空输入框），一旦输入了内容且不合法立刻红框，输入合法变绿。纯 HTML 校验属性加这两条 CSS，就是一个不打扰人的实时反馈系统。`:checked` 更是「纯 CSS 交互」的基石——自定义开关、选项卡、手风琴都靠它。

### 3.5 现代匹配四件套：:not、:is、:where、:has

```css
/* :not 排除：除最后一行外都画下边框 */
li:not(:last-child) { border-bottom: 1px solid #e2e8f0; }

/* :is 任一命中即可，等价于把选择器列表抄三遍 */
:is(h1, h2, h3):hover { color: #2563eb; }

/* :where 与 :is 写法相同，但优先级恒为 0，适合做可被轻松覆盖的默认样式 */
:where(h1, h2, h3) { margin-block: 0; }

/* :has 依据后代/兄弟选父级：含图片的卡片去掉内边距 */
.card:has(img) { padding: 0; }
```

四个工具的优先级行为各不相同，这是面试与排错的共同高频点：

| 选择器 | 作用 | 优先级 |
| --- | --- | --- |
| `:not(...)` | 排除括号内的 | 取括号里最具体那个的优先级 |
| `:is(...)` | 括号内任一命中 | 取括号里**最高**的那个 |
| `:where(...)` | 同 `:is` | **恒为 0** |
| `:has(...)` | 看后代/后续兄弟的脸色选自己 | 取括号里最高的那个 |

`:has()` 已于 2023 年起全主流浏览器可用（Baseline 新近可用），它终结了「CSS 永远只能从父看子」的时代：表单里有无效项就把提交按钮置灰、网格里有长描述就换成两行布局，都不再需要 JS 加类名。

### 3.6 伪元素：页面上不存在的零件

```css
/* content 是 ::before/::after 的灵魂，不写就不渲染（哪怕空字符串） */
.required::after { content: " *"; color: #ef4444; }

/* 装饰性引号 */
.quote::before { content: "\201C"; font-size: 2em; color: #cbd5e1; }

/* 选中文字的高亮色 */
::selection { background: #2563eb; color: #fff; }

/* 占位符、列表圆点、文件选择按钮 */
input::placeholder { color: #94a3b8; }
li::marker { color: #2563eb; }
input[type="file"]::file-selector-button {
  background: #2563eb;
  color: #fff;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
}
```

(::before/::after 创建的盒子默认是行内的，想参与布局就加 `display`；首字下沉用 `p::first-letter` 配 `float: left`，首行加粗用 `p::first-line`。`::backdrop` 用于 `<dialog>` 弹层的遮罩，见 [dialog 与 popover 指南](/html5/430-HTML5DialogPopoverGuide)。)

## 4. 修改实验

对第 2 节的待办列表动手，每步先预测再刷新：

1. 把 `.todo:last-child` 改成 `.todo:nth-last-child(2)`：观察分割线挪到了倒数第二行——位置伪类改一个词，效果平移；
2. 追加 `li:nth-child(even) { background: #f8fafc; }` 做斑马纹，再在第二行前插一个 `li`，看斑马纹自动跟着位置走，不需要改任何类名；
3. 把 `:has(.todo)` 的判断改成 `:has(.done)`：只要有已完成项，列表就隐藏（体验很怪，但能验证 :has 是「看后代脸色」）；
4. 给 `.search` 例子的容器加一条 `:focus-within` 边框，Tab 键与鼠标点击分别试，感受 `:focus-visible` 与 `:focus-within` 的差别。

## 5. 常见错误与调试实录

错误一：`:first-child` 死活不命中。列表前面多了个不被注意的兄弟（比如渲染组件悄悄插进来的 `div`），第一个 `li` 就不再是「第一个孩子」。排查：DevTools 选中元素，在 Elements 面板确认它在兄弟里的真实序号；拿不准就把 `:first-child` 换成 `:first-of-type` 试试，能命中就说明是「孩子序号」与「同类序号」的差别。

错误二：`::before` 不显示。绝大多数情况是忘了写 `content`——没有 content 的伪元素等于没创建；`img`、`input`、`iframe` 这类可替换元素身上伪元素也一律无效，别在它们身上浪费时间。

错误三：`:is()` 让整条规则变高冷。`.card :is(.title, h2)` 的优先级取括号里最高的 `h2`（0,0,1），后续想用 `.title` 覆盖时怎么都盖不住。排查：DevTools 的 Styles 面板看被划掉的那条规则来自谁；想写「零负担默认值」就换 `:where()`。

错误四：手机上 `:hover` 粘住不放。触屏设备第一次点按会触发 hover 且松手后可能保持。桌面交互样式建议包进 `@media (hover: hover)` 里，只在真正有鼠标的设备生效（媒体查询详见 [媒体查询](/css/360-MediaQuery)）。

错误五：优先级内战。`li:nth-child(2n)` 和 `.done` 同时想改颜色，谁赢取决于优先级而非书写顺序——伪类会计入优先级（`:nth-child()` 值 0,0,1,0，与一个类相同）。规则记不清时翻 [优先级计算](/css/170-PriorityCalculation)。

## 6. 实际场景

- 列表与表格：斑马纹 `:nth-child(even)`、首尾去线 `:first-child/:last-child`，是后台系统的日常；
- 表单即时反馈：`:invalid/:valid` 配合 `:not(:placeholder-shown)`，加上 `:user-valid/:user-invalid`（等用户真正离开输入框才判定，打扰更小）可以做完整校验 UI；
- 无 JS 交互：`:checked` 驱动开关与选项卡，`:target` 驱动锚点弹层，原型阶段连 JS 都不用写；
- 内容装饰：`::before` 画图标与徽标、`::after` 做清除浮动（历史用法，现多用 `display: flow-root`）、计数器编号见 [CSS 计数器](/css/520-CSSCounters)；
- FANDEX 网页端的前端实验室里有一个「纯 CSS 选项卡」互动示例，就是 `:checked` + 兄弟选择器搭出来的，可以对照着拆。

## 7. 小练习

预测题（3 分钟）：列表共 7 个 `li`，`li:nth-child(3n + 1)` 选中哪几个？先写答案再验证（第 1、4、7 个）。

修改题（8 分钟）：把第 2 节的斑马纹从 `even` 改成基于公式的前 3 行高亮 `:nth-child(-n + 3)`，再增删一行验证高亮范围自动变化。

修 Bug 题（10 分钟）：下面代码想实现「只有必填且为空时，label 前显示红色感叹号」，实际效果是所有输入框都显示了感叹号。找出两处问题并修复：

```css
input + label::before {
  content: "!";
  color: red;
}

input:required::placeholder-shown {
  border: 1px solid red;
}
```

（答案方向：一是缺少 `:required` 与 `:placeholder-shown` 的组合条件、感叹号无条件渲染；二是 `:placeholder-shown` 是伪类，一个冒号，写在 `::placeholder` 后面非法，应为 `input:placeholder-shown`。）

挑战题（20 分钟，不看正文独立完成）：做一个「评分组件」：5 个星形用 5 个 radio 实现，选中项及之前的星全亮（`:checked` + `~` 兄弟组合），悬停时预览。验收：零 JavaScript、键盘可操作（radio 天生可 Tab 聚焦）、CSS 里至少一条注释解释选择器思路。

## 8. 与之前和之后的知识的关系

- 之前：[CSS3 选择器系统](/css/130-CSS3SelectorSystem) 的基础选择器是原材料，伪类与伪元素是往上面叠加的条件；[优先级计算](/css/170-PriorityCalculation) 决定伪类之间打架谁赢；
- 并行：表单伪类与 [HTML5 表单校验](/html5/190-HTML5FormValidation) 是一对——HTML 属性定义规则，CSS 伪类负责展示；`::backdrop`、`:modal` 与 [dialog 与 popover 指南](/html5/430-HTML5DialogPopoverGuide) 配合；
- 之后：[CSS 计数器](/css/520-CSSCounters) 把 `::before` + `content` 用出「自动编号」的花活；[调试技巧](/css/190-DebuggingCSS) 教你在 DevTools 里开关伪类状态（:hover、:checked 可以强制触发，调样式不用真悬停）。

## 9. 官方文档

- MDN 伪类参考（全列表）：https://developer.mozilla.org/zh-CN/docs/Web/CSS/Pseudo-classes
- MDN 伪元素参考（全列表）：https://developer.mozilla.org/zh-CN/docs/Web/CSS/Pseudo-elements
- MDN :has() 指南：https://developer.mozilla.org/zh-CN/docs/Web/CSS/:has

## 10. 自我检查

- 能口算 `:nth-child(2n + 3)` 在 10 个元素里选中哪几个，并解释 child 与 of-type 的计数差别；
- 能说出 `:is` 与 `:where` 的唯一区别，以及为什么重置样式偏爱 `:where`；
- 被问到「不写 JS 怎么做一个开关」，能说出 `:checked` + 相邻兄弟选择器这套方案；
- 「伪元素不显示」时能按 content 缺失与可替换元素两条线索排查。

## 本章总结

伪类一个冒号管「状态与位置」，伪元素两个冒管「造零件」。结构伪类的核心是 An+B 公式（从 A 起每隔 B 取一个，n 从 0 起）与 child/of-type 的计数差别；交互与表单伪类让样式跟随 hover、focus、checked、valid 走，全程不碰 JS；`:not` 排除、`:is` 合并、`:where` 零优先级、`:has()` 让父级看后代脸色——四件套是 2020 年代选择器的分水岭。伪元素里 `content` 是 ::before/::after 的开关，`::selection`、`::placeholder`、`::marker` 各管一小块体验。

## 下一步

进入 [CSS3 Flexbox 弹性布局](/css/240-CSS3FlexboxFlexLayout)：选择器已经能精准命中任何元素，下一步解决「命中之后怎么排」——把导航、卡片和表单排得整整齐齐。
