---
order: 20
title: CSS3 基本语法：规则集、级联初见与继承
module: 'css'
category: 前端技术
difficulty: beginner
description: 在上一章的实验页面上解剖规则集结构，速战 color/background/font-size/padding 四个属性，现场制造并裁决「两处规则打架」，用继承实验分清哪些样式会传给孩子、哪些不会。
author: fanquanpp
updated: '2026-09-27'
related:
  - 'css/010-WhatIsCSS'
  - 'css/050-CSS3BoxModelDetailed'
  - 'css/130-CSS3SelectorSystem'
  - 'css/160-CascadeInheritanceBasics'
prerequisites:
  - 'css/010-WhatIsCSS'
---

## 前置知识

- 已完成 [CSS 是什么](/css/010-WhatIsCSS)：亲手建过 `experiment.html` 与 `styles.css`，会用 F12 打开 Elements 与 Styles 面板；
- 本文直接沿用那两个文件，案例跟着长大。文件删了也没事，第 2 节开头有 30 秒重建版。

## 学习目标

读完本文你将能够：

1. 默写规则集结构：选择器、声明块、属性、值，说出声明结束符与 CSS 唯一的注释写法；
2. 用 `color`、`background`、`font-size`、`padding` 四个属性，把一块朴素内容做成有留白的卡片；
3. 现场制造「两条规则同时命中一个元素」，预测并验证谁赢，说出这套裁决机制的名字：层叠；
4. 做一个继承实验，分清 `color` 这类「会传给孩子」与 `border` 这类「不传」的属性差别；
5. 用 DevTools 里被划线的声明与警告图标，定位分号漏写、属性拼错、规则被覆盖三类真实故障。

预计 45 到 60 分钟，含 3 组动手实验与 4 道练习。

## 1. 问题引入：两条规则同时命中，听谁的？

打开上一篇的 styles.css，你现在手里同时有这两条规则：

```css
p {
  color: #1f2937;
}

.highlight {
  color: #dc2626;
}
```

两段文字都命中 `p`；最后一段还额外命中 `.highlight`。问：最后一段到底是什么颜色？

直觉答案是「红的，因为写得具体」。对，但只是冰山一角：同样两条矛盾的规则，为什么有时后写的赢、有时更具体的赢、有时全输给行内 `style`？这套裁决机制有正式名字——**层叠（cascade）**，它就是 CSS 全名里的那个 C。本章先给你现场感，完整仲裁规则在第 130 篇与层叠专章讲透。先把语法这层皮扒干净，问题才问得清楚。

## 2. 规则集解剖：一条规则的三块骨头

文件丢了，30 秒恢复现场。`experiment.html` 重建版：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>CSS 化妆实验</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <h1>我的游戏周报</h1>
  <p>这周我把《跳跳岛》通关了三次，手柄都没摸热。</p>
  <p class="highlight">唯一差评：周二的服务器不行。</p>
</body>
</html>
```

`styles.css` 重建版：

```css
body {
  font-family: sans-serif;
  background: #f8fafc;
  margin: 40px;
  color: #1f2937;
}

h1 {
  color: #1d4ed8;
}

p {
  line-height: 1.8;
}

.highlight {
  color: #dc2626;
  font-weight: bold;
}
```

解剖其中一条规则：

```css
p {                  /* 选择器：选中页面上所有 <p> */
  color: #1f2937;    /* 声明：属性 color，值 #1f2937 */
  font-size: 16px;   /* 声明：属性 font-size，值 16px */
}
```

一条**规则集** = 选择器 + 声明块。声明块里每条声明 = `属性: 值;`，分号是声明之间的分隔符，不是装饰（漏写的后果见第 7 节实录）。

两条语法事实：选择器与属性名不区分大小写，但对**值**区分（字体名改了大小写就可能匹配不上），社区约定全小写；空白换行浏览器不在乎，统一成「选择器单独一行、每条声明独占一行」是为了半年后的自己。

顺带说清这个「3」字：CSS 不按版本发布，而是按模块滚动演进，CSS3 只是模块化时代那批模块的口头统称；今天没有 CSS 4 或 5，新特性能不能用查 MDN 的 Baseline 标记或 caniuse，不看版本号。

## 3. 动手实验一：四个属性，做出一张卡片

在 `experiment.html` 的两段文字后面追加一块卡片：

```html
<div class="card">
  <h2>本周最佳操作</h2>
  <p>用盾反接住了 Boss 的三连击。</p>
</div>
```

`div` 是无语义的容器标签，先当「能装东西的盒子」用。把 styles.css 里 body 的 `background` 改深一档，并在文件末尾追加：

```css
body {
  background: #e2e8f0;
}

.card {
  background: #ffffff;
  padding: 24px;
  font-size: 20px;
  color: #1f2937;
}
```

保存刷新。预期效果：页面底色变成一眼可辨的浅灰蓝；中间浮出一块纯白长方形，四边各有一圈明显留白（padding 的效果），里面的标题和文字比其余段落大一圈。

四个属性各自干了什么：

- `background`：背景色，元素自己那块地的地皮颜色；
- `padding`：内边距，内容与元素边界之间的留白，「卡片呼吸感」全是它给的；盒模型四层（content/padding/border/margin）第 050 篇讲透；
- `font-size`：字号；
- `color`：文字颜色。

修改实验：把 `padding` 从 24px 依次改成 4px、48px，观察「贴边」与「空旷」两种极端；再把 `font-size` 换成 14px，卡片文字立刻比正文还小。

## 4. 动手实验二：级联初见——两处规则打架，谁赢

现在揭晓第 1 节的答案：最后一段是红的。两个实验把「为什么」变成可预测的规律。

**实验 A：同选择器，先后打架。** 在 styles.css 末尾追加：

```css
.highlight {
  color: #16a34a;
}
```

刷新：最后一段变绿。两条 `.highlight` 规则同时命中——**一样具体的规则，后写的赢**。把新规则剪切到文件最顶部再刷新，变回红的。顺序不是玄学，是裁决依据。

**实验 B：具体度打架。** 删掉实验 A 的规则，改为追加：

```css
p {
  color: #16a34a;
}
```

刷新：普通段落变绿，最后一段依然是红。`p` 和 `.highlight` 都命中它，但 `.highlight` 点名比泛指更具体，**更具体的赢**。

两组实验合成层叠最常用的两条判据：**先比具体程度，分不出胜负再比出现顺序**。更复杂的维度（id 选择器、行内样式、`!important`、来源与继承）构成的完整仲裁表，在第 130 篇选择器系统与层叠专章（第 160、170 篇）展开。现在带走这两条，已能解释日常八成的打架场面。顺手去 DevTools 看这场官司：Styles 面板里赢的声明正常显示，输的被横线划掉，旁边标注来源文件与行号。以后判断谁赢，看划线比猜快。

## 5. 注释：给半年后的自己留纸条

```css
/* ===== 卡片区：所有卡片共用 ===== */

.card {
  background: #ffffff;
  /* padding 被设计稿定死为 24，别随手改小 */
  padding: 24px;
}
```

CSS 只有块注释 `/* */`，没有 `//`；单行跨行、放规则之间或声明后面都行，浏览器直接跳过。两个高频用法：给分区立路标（文件长了以后救命）、记录「为什么这样做」——代码说的是做了什么，注释说的是为什么。第三个调试用法：怀疑某条声明惹祸时，把它注释掉刷新看效果，注释就是 CSS 排错的手动开关。

## 6. 动手实验三：继承——有些样式会传染

在 styles.css 的 body 规则里追加一条：

```css
body {
  border: 2px solid #94a3b8;
}
```

刷新后先预测：段落颜色和字号从没单独设过，为什么和 body 一致？边框为什么只在页面最外圈，没传染给段落和卡片？

答案：`color`、`font-size`、`font-family`、`line-height` 这类**文字属性会继承**——子元素没有自己的声明时，自动使用父元素的值。`border`、`padding`、`background` 这类**盒子属性不继承**——边框若也传染，每个段落都会长出一圈框，页面瞬间变表格。这不是语法的意外，是设计者的取舍：文字像家族遗传，盒子各自独立。

在 DevTools 里选中普通段落，Styles 面板往下滚，能看到 `Inherited from body` 分区，继承来的样式单独列出。继承的完整规则（哪些属性在名单上、`inherit` 怎么强制继承）在第 160 篇讲透。

## 7. 常见错误与调试实录

错误一：漏分号，两条声明一起死。把 `.card` 改成：

```css
.card {
  background: #ffffff
  padding: 24px;
}
```

刷新：卡片没白底也没留白——两条全灭。浏览器把 `#ffffff padding: 24px` 整体当成 background 的值，值非法，整条声明作废。F12 选中卡片，Styles 面板里这条声明整体被划掉、旁边有黄色感叹号图标。补上分号，复活。

错误二：属性名拼错，静默失败。`colour: red;` 或 `backgroud: #ffffff;`——浏览器不报错、不弹窗，只是忽略。这是 CSS 与 Python、JavaScript 最大的排错差异：**CSS 几乎不崩溃，它只安静地不生效**。所以「样式为什么不生效」的排查永远从 DevTools 开始：选中元素，看你的规则在不在列表里；在，看哪条带警告图标；不在，查选择器写没写对、link 路径通不通。

错误三：花括号不配对。丢一个 `}`，后面所有规则被吞进上一条规则里，成片失效。编辑器（如 VS Code）会即时标出配对错误；DevTools 里的表现是「后半文件的规则全部消失」。

错误四：规则存在但被覆盖。症状：规则在 Styles 面板里看得见，但整行被划线。这不是 bug，是第 4 节的层叠裁决：有更具体或更靠后的规则赢了。顺着划线声明旁标注的来源找到赢家，再决定提高具体度还是删掉旧规则——先查清再动手，别一上来就加 `!important`。

## 8. 实际场景

- 接手旧项目：先 F12 打开任何元素的 Styles 面板，划线与来源标注能告诉你这套样式是怎么组织的，比读文档快；
- 团队协作：注释分区是多人同改一份 styles.css 时的最低成本秩序；
- 排查线上样式：绝大多数「样式 bug」属于三类——没保存、选择器没选中、被更高优先级覆盖，本章实验让你对每一类都有肌肉记忆；
- 写组件样式：「白底 + 留白 + 字号层级」的卡片是所有界面的原子积木，第 050 篇之后你会把它拆到像素级。

## 9. 小练习

预测题（5 分钟）：基于本章文件追加下面两条规则后，卡片标题「本周最佳操作」是什么颜色？最后一段红色差评句是什么颜色？

```css
h2 {
  color: #1d4ed8;
}

.card h2 {
  color: #b45309;
}
```

答案（先写完再对照）：卡片标题是 `#b45309`——两条都命中，`.card h2` 更具体，赢；差评句仍是红——两条都没命中它，`.highlight` 没被动摇。

修改题（10 分钟）：给 `.card` 追加 `max-width: 480px;` 与 `margin: 24px auto;`。验收：卡片不再横贯整个窗口，变成窗口中央的一块窄卡；拖动窗口宽度，卡片始终居中。（margin 的 auto 居中第 050 篇讲原理，先用。）

修 Bug 题（10 分钟）：下面这份样式有三个真实 bug，症状：卡片没白底、没留白，标题没变色。先用 DevTools 逐条定位（哪条被划线、哪条带警告图标），再全部修复：

```css
.card {
  backgroud: #ffffff
  padding: 24px;
}

h2 {
  color: #B453O9;
}
```

挑战题（半小时，不看正文独立完成）：为 experiment.html 再做一张「本周翻车记录」卡片。验收清单：白底、padding 不小于 20px、标题颜色与「最佳操作」卡片不同、正文文字继承 body 的颜色（不允许在卡片里写 color）；两张卡片外观统一；用 DevTools 确认卡片正文的 color 确实来自 `Inherited from body`；styles.css 里至少留一条注释说明你的取舍。

## 10. 与之前和之后的知识的关系

- 之前：[CSS 是什么](/css/010-WhatIsCSS) 建立了素坯与化妆师的分工，本文把化妆师的工具箱打开；
- 之后：[CSS 工作原理](/css/030-CSSHowItWorks) 讲浏览器怎么把规则变成画面；[样式表引入方式](/css/040-StyleSheetImportMethod) 展开全部引入方式；[盒模型](/css/050-CSS3BoxModelDetailed) 把 padding 与 margin 讲到像素级；[选择器系统](/css/130-CSS3SelectorSystem) 把「具体赢泛指」升级成完整计算规则，[层叠与继承基础](/css/160-CascadeInheritanceBasics) 与 [优先级计算](/css/170-PriorityCalculation) 把本文埋的钩子全部收线。

## 11. 官方文档

- MDN「CSS 第一步」入门模块：https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Styling_basics
- MDN CSS 属性参考（每个属性的标准定义）：https://developer.mozilla.org/zh-CN/docs/Web/CSS
- caniuse（查特性兼容性，代替看「版本号」）：https://caniuse.com

## 12. 自我检查

- 能默写规则集结构，并说出分号、花括号、注释各自的语法角色；
- 不查资料能写出 `color`、`background`、`font-size`、`padding` 四条声明并描述各自的效果；
- 能现场制造两条规则的冲突并预测胜负（具体赢泛指，后写赢先写）；
- 能说出 color 会继承、border 不会，并在 DevTools 里指出 Inherited from 区块；
- 拿到「样式没生效」的现场，能用被划线的声明与警告图标定位三类故障。

## 本章总结

规则集 = 选择器 + 声明块，声明 = `属性: 值;`，分号是声明的分隔符；注释只有 `/* */` 一种。`color`、`background`、`font-size`、`padding` 是起步四件套。层叠裁决打架的两条基础判据：先比具体程度，再比出现顺序；继承让文字样式从 body 传向全页，盒子样式各自独立。CSS 的故障模式是静默失效，所以调试主场永远是 DevTools 的 Styles 面板。

## 下一步

进入 [CSS 工作原理与渲染流程](/css/030-CSSHowItWorks)：看浏览器拿到 HTML 和 CSS 之后做了哪几件事才画出画面——理解它，你才知道规则在哪个环节丢的。
