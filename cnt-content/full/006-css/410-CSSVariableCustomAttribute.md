---
order: 410
title: CSS 变量与自定义属性
module: 'css'
category: 前端技术
difficulty: intermediate
description: "从「老板要求换个主色，你却要全文替换 30 处色值」出发，用自定义属性把值抽成语义令牌，吃透运行时变量与预处理器变量的本质区别、作用域继承的层叠规则、var() 回退与无效化陷阱，最终搭出 JS 可实时改写的双主题系统。"
author: fanquanpp
updated: '2026-09-13'
related:
  - 'css/120-CSSFunctions'
  - 'css/360-MediaQuery'
  - 'css/450-CascadeLayer'
  - 'css/460-FeatureQuery'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
  - 'css/160-CascadeInheritanceBasics'
---

## 前置知识

- 已完成 [CSS3 概述与基本语法](/css/020-CSS3OverviewBasicSyntax)；
- 「层叠与继承」一节的概念（谁覆盖谁、子元素继承什么）会被直接使用，建议先过一遍 [层叠与继承](/css/160-CascadeInheritanceBasics)。

## 学习目标

读完本文你将能够：

1. 把散落各处的色值、间距抽成语义化变量，换主题只改一处；
2. 说清 CSS 自定义属性与 Sass 变量的本质区别（运行时 vs 编译期），以及由此带来的能力差异；
3. 预测变量在嵌套结构里的取值：作用域、继承、覆盖都遵循普通层叠规则；
4. 用 `var()` 回退值兜底，并解释「变量拼错为什么不是报错而是整条属性失效」；
5. 搭一套「系统偏好加手动切换」的双主题系统，并让 JS 能实时读写变量。

预计 40 到 60 分钟，含 1 组动手实验与 4 道练习。

## 1. 问题引入：换个主色，改了 30 处还漏了 3 处

你的周报站主色是蓝色 `#2563eb`，散落在按钮、链接、边框、选中态……大概 30 条规则里。老板看过竞品后拍板：「换成紫色。」你全文替换跑了一遍，上线后总有几个犄角旮旯还是蓝的——渐变里拼了一半、rgba 里写的是 `37, 99, 235`。

这类「同一个值出现在 N 处」的问题，任何语言的标准答案都是**变量**，CSS 也有：自定义属性。把值抽出来起个语义名字，组件只认名字不认值。更重要的是，它是**运行时**变量——JS 能改、媒体查询能切、继承能覆盖，这是 Sass 变量做不到的事，也是主题系统能存在的地基。

## 2. 最小示例：三行变量救一次改色

`styles.css`：

```css
:root {
  /* 语义命名：说「它是什么」，不说「它是什么值」 */
  --color-accent: #2563eb;
  --color-accent-hover: #1d4ed8;
  --space-unit: 8px;
}

.button {
  background: var(--color-accent);
  padding: var(--space-unit) calc(var(--space-unit) * 2);
}
.button:hover {
  background: var(--color-accent-hover);
}
.link {
  color: var(--color-accent);
}
```

换主色只需要改 `:root` 里那两行，全站按钮、链接、所有引用点一次到位。顺手记两个语法点：变量必须 `--` 开头、区分大小写（`--Main` 与 `--main` 是两个变量）；`var()` 负责取值，`calc()` 负责计算——`--space-unit: 8px` 存带单位的值，`calc(var(--space-unit) * 2)` 得 16px。

预期效果：把 `--color-accent` 改成 `#7c3aed` 刷新，按钮与链接同时变紫，不用碰任何组件规则。

## 3. 核心概念

### 3.1 运行时 vs 编译期：和 Sass 变量的本质区别

| | CSS 自定义属性 | Sass/Less 变量 |
| --- | --- | --- |
| 生效时机 | 运行时，浏览器实时求值 | 编译期，构建时文本替换 |
| 能否被 JS 读写 | 能（`getPropertyValue` / `setProperty`） | 不能，编译后就没了 |
| 能否随媒体查询/类名切换 | 能 | 不能 |
| 作用域 | 跟随 DOM 继承与层叠 | 全局或文件级 |
| 浏览器要求 | 现代浏览器 | 编译成 CSS 后无要求 |

一句话：Sass 变量在交付前就被「抄死」进样式表；自定义属性活着进了浏览器，所以主题切换、交互反馈、JS 联动全都可能。两者不冲突——Sass 管构建期的代码组织，自定义属性管运行期的动态性。

### 3.2 作用域与继承：变量就是普通属性

自定义属性遵循和 `color` 一模一样的层叠与继承规则——这句话能推出全部行为：

```css
:root {
  --theme-color: blue;      /* 全局默认 */
}
.container {
  --theme-color: green;     /* 局部覆盖，子孙继承到 green */
}
.container .item {
  color: var(--theme-color); /* green：继承自最近声明者 .container */
}
.sidebar .item {
  color: var(--theme-color); /* blue：没人在路上覆盖，继承 :root */
}
#hero {
  --theme-color: red;       /* ID 优先级更高，覆盖 .container 的同款 */
}
```

「组件局部变量」就是这套规则的正面用法：`.card` 里定义 `--card-bg`，卡片子孙随取随用；父级想给某块区域换肤，只需在祖先上覆盖一两个变量，整棵子树跟着变——不需要重写任何组件样式。

### 3.3 var() 的回退与「无效化」陷阱

```css
/* 未定义时用第二参兜底；兜底值本身也可以是变量 */
color: var(--text-color, #333);
background: var(--bg-color, var(--default-bg, white));
/* 兜底可以带空格与逗号 */
box-shadow: var(--shadow, 0 2px 8px rgb(0 0 0 / 0.1));
```

关键陷阱：**没写兜底且变量未定义时，不报错，而是该属性「计算值阶段无效」**——表现为整条声明被丢弃，属性落到继承值或初始值。比如 `color: var(--texit-color)`（拼错）不会让文字变黑，而是继承父元素的 color。这种错误 DevTools 里显示为「Invalid property value」，样式被划掉。所以公共组件引用外部变量时，务必带兜底值。

另一个高频困惑：**媒体查询的条件里不能用变量**。`@media (min-width: var(--bp-md))` 是非法的——媒体查询在变量求值之前就要判定。断点令牌的正确姿势是「CSS 里写死数值 + JS 侧用同一份常量」，或交给 Sass 在构建期拼进 `@media`。

### 3.4 数值型变量与 @property：给变量上「类型」

```css
:root {
  --ratio: 1.618;             /* 存纯数字，单位在使用处乘 */
}
.hero {
  width: calc(100vw / var(--ratio));
}

/* 注册类型后，变量可参与过渡动画（Baseline 2024） */
@property --accent-h {
  syntax: '<number>';
  inherits: false;
  initial-value: 220;
}
.button {
  --accent-h: 220;
  background: hsl(var(--accent-h) 80% 50%);
  transition: --accent-h 0.3s;
}
.button:hover {
  --accent-h: 260;
}
```

未注册的自定义属性是「无类型 token」，浏览器只会整体替换、无法插值，`transition` 对它无效；`@property` 注册出带类型的变量后，颜色、角度、数字都能平滑过渡。这是 2024 年起全主流可用的能力，动效一节的进阶玩法大量依赖它。

## 4. 修改实验

对第 2 节动手，每步先预测再刷新：

1. 在 `.card` 里加 `--color-accent: #dc2626;`，卡片内放一个 `.button`：按钮只在这个卡片里变红——局部覆盖加继承；
2. 把 `var(--color-accent)` 改成 `var(--color-aksent, green)`（故意拼错加兜底）：按钮变绿而不是失效——验证兜底机制；
3. 删掉兜底再拼错一次：按钮的 background 声明失效，退回透明，DevTools Styles 面板里能看到划掉的无效值；
4. 追加 `@property` 注册并做 hover 变色过渡；再删掉注册块重试：过渡消失、颜色瞬切——亲手对比类型注册的价值。

## 5. 常见错误与调试实录

错误一：变量名拼错却毫无动静。如上所述不报错、只失效。排查：DevTools 选中元素看 Computed 面板的「Invalid property value」，再全局搜索变量名核对拼写；公共组件一律带兜底。

错误二：循环依赖。`--a: var(--b); --b: var(--a);` 两条互相引用，浏览器判定两者都无效。变量链要保持单向：令牌（原色值）→ 语义变量（主色/危险色）→ 组件变量，箭头不许回头。

错误三：在 @media 条件里用 var()。非法，整条查询失效。记住求值顺序：媒体查询先判定，变量后求值。

错误四：变量存了裸数字却当长度用。`--gap: 16; gap: var(--gap);` 无效——长度值必须带单位（或用 calc 乘单位）。反过来，想统一改单位时存裸数字加 `calc(var(--n) * 1px)` 更灵活，两种风格选定一种全站统一。

错误五：所有值都抽成变量。变量过载会让样式表变成「查表游戏」。只抽「会变或需成套」的值：色板、间距体系、圆角、阴影、动效时长；一次性的临时值留在原地。

## 6. 实际场景

- 设计令牌体系：原色值层加语义层的双列表结构，是设计系统的事实标准——FANDEX 网页端的「设计令牌双主题」演示完整展示了这套结构，色板、圆角、阴影全部令牌化，深浅主题各一张令牌表；
- 双主题切换：`:root` 定义亮色令牌，`[data-theme='dark']` 覆盖一张暗色表，`@media (prefers-color-scheme: dark)` 跟随系统，手动切换时 JS 改 `data-theme`（实现骨架见 [媒体查询](/css/360-MediaQuery) 第 3.4 节）；
- JS 联动：光标跟随效果每帧 `setProperty('--mouse-x', ...)`，比逐个改元素 style 高效且只触发合成；`getComputedStyle(el).getPropertyValue('--x')` 反向读值；
- 流式排版与间距：`--step-0: clamp(1rem, 0.8rem + 0.5vw, 1.25rem)` 这类流式令牌，字号随视口平滑缩放、无需断点；
- 组件换肤：卡片、按钮把「可配置点」暴露为局部变量，使用方只覆写变量不覆写组件样式。

## 7. 小练习

预测题（3 分钟）：`:root { --x: blue; } .a { --x: red; }`，页面结构 `<div class="a"><p>` 与 `<div><p class="a">`，两个 p 里 `color: var(--x)` 各是什么色？（前者 red，继承自最近的 .a；后者 blue，.a 是 p 自己——p 自己声明的变量对自己生效。）

修改题（8 分钟）：把第 2 节扩展成语义层：`--color-accent` 引用 `--color-blue-600`，加一套 `--color-green-600` 作为成功色；再让 `.button--success` 通过覆写 `--color-accent` 实现绿色按钮——体验「组件不改一行样式」的换肤。

修 Bug 题（10 分钟）：下面的主题切换在「先手动切暗色、再把系统切到亮色」时表现混乱（手动暗色被系统亮色盖掉）。分析 `@media` 与 `data-theme` 的优先级关系并给出修复思路：

```css
:root { --bg: #fff; }
[data-theme='dark'] { --bg: #111; }
@media (prefers-color-scheme: dark) {
  :root { --bg: #111; }
}
```

（答案方向：两条声明的优先级与顺序有关，系统偏好块写在后面时覆盖了 `[data-theme='dark']`。修复思路：让手动选择优先于系统——把系统偏好只应用在 `:root:not([data-theme])` 上，或用 `@layer` 把「系统默认」放低优先级层，见级联层篇。）

挑战题（半小时，不看正文独立完成）：给周报站做完整双主题：语义令牌（背景/前景/强调/边框至少四组）、跟随系统加手动切换按钮、切换状态存 localStorage、深浅切换带 0.3s 颜色过渡（提示：`transition` 写在 `:root` 的引用属性上或用 `@property`）。验收：无系统偏好或手动切换组合下颜色冲突、CSS 无一处裸色值出现在组件层、至少一条注释解释令牌分层。

## 8. 与之前和之后的知识的关系

- 之前：[层叠与继承](/css/160-CascadeInheritanceBasics) 是变量取值规则的唯一来源——「变量就是属性」理解了，作用域问题全部消失；
- 并行：[CSS 函数](/css/120-CSSFunctions) 里 calc/clamp/min/max 是变量的运算器；[媒体查询](/css/360-MediaQuery) 的偏好查询负责拨主题开关（但记住 @media 条件里不能用变量）；[级联层](/css/450-CascadeLayer) 可以给「系统默认主题」与「手动覆盖」分层定序；
- 之后：[Sass](/css/570-Sass) 在构建期组织变量代码，与运行时变量分工；FANDEX 网页端的双主题演示是本文知识的生产级落地，可对照源码拆令牌表。

## 9. 官方文档

- MDN「使用 CSS 自定义属性」：https://developer.mozilla.org/zh-CN/docs/Web/CSS/Using_CSS_custom_properties
- MDN var() 参考：https://developer.mozilla.org/zh-CN/docs/Web/CSS/var
- MDN @property 参考：https://developer.mozilla.org/zh-CN/docs/Web/CSS/@property

## 10. 自我检查

- 能说清自定义属性与 Sass 变量的三条本质区别，并各举一个只有运行时变量能做的场景；
- 给一个嵌套结构能口算每个节点读到的变量值；
- 「变量拼错页面没报错但样式丢了」能解释无效化机制并说出排查路径；
- 能写出「跟随系统加手动覆盖」的主题切换骨架，并解释两者优先级如何安排。

## 本章总结

自定义属性是 CSS 的运行时变量：`--` 声明、`var()` 取值、`calc()` 计算，取值完全遵循普通层叠与继承规则——祖先覆盖、子孙继承，组件换肤因此只改变量不改样式。与 Sass 变量的分水岭在运行时：JS 可读写、媒体查询可切换、`@property` 注册后还能参与过渡。三大陷阱记牢：未定义变量是静默失效不是报错（公共组件带兜底）、@media 条件里不能用变量、循环依赖双双无效。落到工程就是设计令牌：原色层加语义层，主题切换只是一张变量表的替换。

## 下一步

进入 [CSS 函数](/css/120-CSSFunctions)：变量解决了「值从哪来」，函数解决「值怎么算」——calc、clamp、min/max 与颜色函数是令牌体系的运算引擎。
