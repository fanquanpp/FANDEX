---
order: 10
title: CSS 是什么：给素坯上妆的化妆师
module: 'css'
category: 前端技术
difficulty: beginner
description: 用「HTML 是素坯，CSS 是化妆师」建立 CSS 心智模型：结构与外观分离、一条规则如何改变整页、三种引入方式预告，并在本篇内从零建出 experiment.html 与 styles.css 完成 DevTools 现场改妆实验。
author: fanquanpp
updated: '2026-09-27'
related:
  - 'css/020-CSS3OverviewBasicSyntax'
  - 'css/030-CSSHowItWorks'
  - 'css/040-StyleSheetImportMethod'
  - 'html5/010-WhatIsWebpage'
prerequisites:
  - 'start/020-ComputerBasicsForBeginners'
  # 建议性前置：html5/010 没学过也能跟，本文自带可复制的实验文件
  - 'html5/010-WhatIsWebpage'
---

## 前置知识

- 已完成 [零基础计算机常识](/start/020-ComputerBasicsForBeginners)：会新建文件夹与文件，知道扩展名是怎么回事；
- 建议先读 [网页是什么](/html5/010-WhatIsWebpage)：知道「标签」长什么样、浏览器怎么打开一个 HTML 文件。

**「建议性前置」的意思**：没读过上面第二篇也完全能跟。本文不要求你做过任何之前的作业——所有实验文件从本篇现场新建，每一步代码都完整给出，直接复制即可。你只需要一个能打字的编辑器（VS Code 或记事本）和一个浏览器（Chrome 或 Edge）。

## 学习目标

读完本文你将能够：

1. 说清 CSS 解决的根本问题——结构与外观分离，以及为什么 HTML 和 CSS 要拆成两个文件；
2. 默写一条 CSS 规则的三段式结构：选择器、属性、值；
3. 在本篇内从零建出 `experiment.html` 与 `styles.css`，看着同一个素坯页面被一段样式改头换面；
4. 用开发者工具（F12）的 Elements 面板现场修改任何网页的样式，并知道改的是内存不是文件；
5. 用 DevTools 里被划线的声明，排查「样式写了却不生效」的第一类原因。

预计 40 到 60 分钟，包含 2 组动手实验与 4 道练习。

## 1. 问题引入：内容不动，脸面全换

假设你花一晚上写好了一个游戏周报页面：一个标题、两段文字。白底黑字，内容都在，但你自己看着都嫌素。朋友提议：「加个浅色背景，标题弄成蓝色，重点句标红。」

摆在面前的选择有两个。

选择一：回到 HTML 里，想办法给每个标签塞进颜色、字号信息。且不说 HTML 标签本来就没有干净的写法去描述「行距 1.8」这种事——真要换一套夜间主题，你就得把整个文件重改一遍。内容和外观焊死在一起，改脸就要动骨。

选择二：外观信息单独放一个文件，HTML 里只留一行「请去加载那个文件」。换主题时只换外观文件，内容一个字不动。

CSS（Cascading Style Sheets，层叠样式表）就是为选择二而生的语言。用一句类比记住分工：**HTML 是素坯，CSS 是化妆师**。素坯决定有没有眉眼、有没有段落结构，化妆师决定脸色、口红色号、眉毛粗细——换妆不用重新捏坯。

## 2. 动手实验一：先看素坯，再上妆

### 2.1 建素坯

新建一个文件夹 `css-experiment`，在里面新建文件 `experiment.html`，完整内容如下：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>CSS 化妆实验</title>
</head>
<body>
  <h1>我的游戏周报</h1>
  <p>这周我把《跳跳岛》通关了三次，手柄都没摸热。</p>
  <p class="highlight">唯一差评：周二的服务器不行。</p>
</body>
</html>
```

两处语法说明：`<h1>`、`<p>` 是标题和段落标签（建议性前置里讲过）；`class="highlight"` 是给这个段落贴的名字标签，本文只需要知道「它存在」，选择器的全家福在第 130 篇讲透。

双击文件用浏览器打开（或把文件拖进浏览器窗口）。预期效果：白底黑字，左上角一个加粗大标题，下面两段普通文字。这就是素坯——功能齐全，毫无修饰。

### 2.2 上妆

在同一文件夹里新建第二个文件 `styles.css`（扩展名必须是 `.css`），内容如下：

```css
body {
  font-family: sans-serif;
  background: #f8fafc;
  margin: 40px;
}

h1 {
  color: #1d4ed8;
}

p {
  line-height: 1.8;
  color: #1f2937;
}

.highlight {
  color: #dc2626;
  font-weight: bold;
}
```

再回到 `experiment.html`，在 `<head>` 里、`<title>` 的下面加一行：

```html
<link rel="stylesheet" href="styles.css">
```

保存两个文件，刷新浏览器。预期效果：页面出现极浅的灰蓝背景，四周留出 40px 的空白；标题变成深蓝色；两段文字行距拉开，读起来不再挤；最后一段整句变红、加粗。内容一个字没动，脸面全换。

`<link>` 那一行的作用：告诉浏览器「去加载同文件夹下的 styles.css，把它当作我的化妆指令」。浏览器加载后按文件里的规则逐个给元素上妆。`font-weight` 控制字重（粗细），`font-family` 控制字体，属性名基本见名知意。

### 2.3 分离的第一个红利：一份外观，多页共用

再新建一个 `second.html`（复制上面 experiment.html 的骨架，把标题和文字换成别的内容），同样在 head 里引用 `styles.css`。预期效果：两份内容不同的页面，长出同一副面孔。改一处 CSS，两个页面同时换装——这就是结构与外观分离换来的第一笔红利。

## 3. 核心概念：一条规则的三段式

解剖 styles.css 里的其中一条：

```css
h1 {
  color: #1d4ed8;
}
```

- `h1` 是**选择器**——「选中谁」。浏览器拿着它在页面里找出所有 `<h1>` 标签；
- `color: #1d4ed8;` 是一条**声明**——「改成什么样」。声明由**属性**（改哪里：文字颜色）和**值**（改成什么）组成，以分号结尾；
- 花括号包住的整块叫**声明块**，里面可以装任意多条声明。

`#1d4ed8` 是颜色的十六进制写法（红、绿、蓝三个分量各两位），也可以偷懒写英文关键字 `blue`、`red`。开头的点（`.highlight`）表示「按名字选」：选中所有 `class="highlight"` 的元素；class 可以贴给多个元素复用。先混个眼熟即可，第 130 篇会把选择器体系讲透。

## 4. 三种上妆方式（预告）

本文用的「外部文件」是真实项目的标准做法。完整的三种：

| 方式 | 写法 | 适用场景 |
| --- | --- | --- |
| 行内 | `<p style="color: red">` | 临时覆盖某一处，不推荐大量使用 |
| 内部 | `<style>` 块写在 head 里 | 单页练习、一次性演示 |
| 外部 | `<link rel="stylesheet" href="styles.css">` | 真实项目标准，本文用法 |

三种方式同时出现、互相打架时听谁的？这是「层叠」要回答的问题——下一篇给你第一次现场感，第 040 篇把全部引入方式（包括 @import）展开讲透。

## 5. 动手实验二：F12 现场改妆

CSS 最好的玩具是开发者工具。在 experiment.html 页面上按 `F12`，点工具栏左上角的箭头图标（或按 `Ctrl+Shift+C`），再去点页面上的蓝色标题——Elements 面板会高亮对应的 HTML，右侧 Styles 面板列出命中它的全部规则。

现在依次做三件事：

1. 在 Styles 面板里点中 `color: #1d4ed8` 的值，改成 `crimson`，回车——标题当场变红；
2. 取消 `background` 声明前面复选框的勾——页面背景立即消失；
3. 点规则右下角的 `+` 号，给 h1 补一条 `letter-spacing: 4px`——标题字距拉开。

预期效果：每一步都即时生效，不需要保存和刷新。

关键认知：**你改的是浏览器内存里的样式副本，刷新一次全部还原，文件本身毫发无伤**。它的正确用法是「试」而不是「改」——试出满意的值，再誊回 styles.css。以后看到任何喜欢的网页，都可以 F12 拆开看它怎么化的妆，这是前端学习者独有的特权。

## 6. 修改实验

对 styles.css 动手，每一步先预测再刷新：

1. 把 body 的 `background` 改成 `#111827`（近黑的深蓝灰）。预测：页面会变成什么样？——刷新后大概率「黑底黑字，什么都看不清」。原因：化妆要成套换，背景换深了，文字颜色也得跟着换浅。补一条 body 的 `color: #e5e7eb` 再看，夜间模式雏形就出来了；
2. 把 body 的 `margin: 40px` 改成 `margin: 0`：四周留白消失，内容顶到窗口边缘。margin 是外边距，属于盒模型的地盘，第 050 篇专门讲；
3. 给 h1 加 `font-size: 40px`：标题变大。再改成 `14px`：标题比正文还小。字号永远是相对预期而言的，大小本身没有对错。

## 7. 常见错误与调试实录

错误一：漏了分号。把 h1 的规则改成：

```css
h1 {
  color: #1d4ed8
  font-size: 32px;
}
```

刷新：标题既没变蓝也没变大——**两条声明一起死**。原因：分号是声明之间的分隔符，漏掉后浏览器把 `#1d4ed8 font-size: 32px` 整体当成 color 的值，这个值非法，整条声明作废。排查方法：按 F12 选中标题，Styles 面板里这条声明整体被划掉，旁边出现黄色感叹号图标——**被划线的属性就是浏览器拒绝执行的属性**。补上分号，图标消失，两条声明复活。

错误二：link 路径写错。把 `href="styles.css"` 改成 `href="style.css"`（少个 s）再刷新，页面退回素坯。按 F12 打开 Console（控制台）面板，真实报错：

```text
GET file:///C:/css-experiment/style.css net::ERR_FILE_NOT_FOUND
```

读报错三步：看请求的完整路径 → 对照你硬盘里的实际文件名 → 修正 href。Console、Elements、Styles 三个面板，就是 CSS 排错的全部基础设施。

错误三：属性名拼错。把 `color` 写成 `colour`：浏览器不报错、不弹窗，只是安静地忽略这条声明，症状永远是「不生效」。在 DevTools 的 Styles 面板里，非法属性会带警告图标。这也解释了为什么排查样式问题的第一站永远是 DevTools，而不是肉眼盯代码。

## 8. 实际场景

- 主题与换肤：内容不动，换一份 CSS 就是夜间模式。第 2.3 节的两页共用就是它的雏形；
- 团队分工：结构（HTML）与外观（CSS）可以由不同的人并行修改，互不踩脚；
- 响应式：同一份 HTML，在手机上是单列、在电脑上是多列，变的只是 CSS（第 360 篇起展开）；
- 接手任何项目：先 F12 看样式怎么组织的，比读文档快。

## 9. 小练习

预测题（5 分钟）：在 styles.css 末尾追加下面的规则，先写下预测再刷新验证：

```css
.highlight {
  color: #16a34a;
  font-weight: normal;
}
```

最后一段现在是绿色还是红色？加粗还是正常？

答案（写完再对照）：绿色、正常字重。两条 `.highlight` 规则都命中它，同样具体时后写的赢——这就是层叠的第一次现身，下一篇展开。

修改题（10 分钟）：给 body 规则追加 `max-width: 560px;` 和 `margin: 40px auto;`（auto 表示左右平分剩余空间）。验收：段落不再横跨整个窗口，而是在窗口中央形成一条窄栏；把窗口拉宽，窄栏始终居中。（max-width 与 auto 居中先混个眼熟，第 050 篇盒模型讲透。）

修 Bug 题（10 分钟）：下面这份 styles.css 有两处真实 bug，症状是「标题既没变蓝也没变大，红色段落没变红」。先用 DevTools 定位（看哪条声明被划线、带警告图标），再修复：

```css
h1 {
  color: #1d4ed8
  font-size: 32px;
}

.highlight {
  colour: #dc2626;
}
```

挑战题（半小时，不看正文独立完成）：把 experiment.html 做成夜间模式。验收清单：深色背景（如 #0f172a）、浅色正文（如 #e5e7eb）、标题用亮一档的蓝（如 #93c5fd）、红色差评句换成醒目的亮色；全部改动只落在 styles.css，experiment.html 一个字不动。

## 10. 与之前和之后的知识的关系

- 之前：[网页是什么](/html5/010-WhatIsWebpage)（建议性前置）给了素坯的概念，本文让素坯第一次有了脸面；
- 之后：[CSS3 基本语法](/css/020-CSS3OverviewBasicSyntax) 把规则集、注释、级联与继承讲细；[CSS 工作原理](/css/030-CSSHowItWorks) 揭秘浏览器怎么把两个文件变成画面；[样式表引入方式](/css/040-StyleSheetImportMethod) 展开全部引入方式；[盒模型](/css/050-CSS3BoxModelDetailed) 解释 margin 与留白的原理。

## 11. 官方文档

- MDN「CSS 第一步」入门模块：https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Styling_basics
- MDN CSS 参考手册（属性字典，随用随查）：https://developer.mozilla.org/zh-CN/docs/Web/CSS

## 12. 自我检查

- 能不看笔记说出「HTML 是素坯、CSS 是化妆师」各自负责什么；
- 能默写一条规则的三段式，并说出声明以什么符号结尾；
- experiment.html 与 styles.css 是你自己从零建出来的，且能解释 `<link>` 那一行的作用；
- 会用 F12 的 Elements 与 Styles 面板改样式，并能认出被划线的非法声明；
- 拿到一个「样式不生效」的页面，知道先查保存、路径、分号三件事。

## 本章总结

CSS 把「长什么样」从 HTML 里剥离出来，结构与外观分离让换肤、复用、分工成为可能。一条规则 = 选择器 + 声明块，一条声明 = `属性: 值;`，分号是声明的分隔符。外部样式表是真实项目的标准引入方式。DevTools 的 Elements 与 Styles 面板是 CSS 的第一调试工具：被划线的声明就是浏览器拒绝执行的声明。

## 下一步

进入 [CSS3 基本语法](/css/020-CSS3OverviewBasicSyntax)：把规则集拆得更细，第一次正面撞上层叠与继承——「两处规则打架谁赢」的完整规则从那里开局。
