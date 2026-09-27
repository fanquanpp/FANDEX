---
order: 30
title: 环境准备与第一个页面：浏览器加编辑器就够了
module: 'html5'
category: 前端技术
difficulty: beginner
description: 网页开发没有「装环境」这回事：一个浏览器加一个编辑器就是全部。建立 first-page 项目并跑通「改、存、刷、看」的即时反馈循环，对照双击打开与 Live Server 两种工作方式，用 DevTools 把 HTML/CSS/JS 三层连起来检查，并掌握页面白屏的排查三步。
author: fanquanpp
updated: '2026-09-27'
related:
  - 'html5/040-DocTypeDeclaration'
  - 'html5/050-HTML5CommentsAndEntities'
  - 'html5/060-MetadataCharacterEncoding'
  - 'html5/070-HTML5BlockVsInline'
  - 'start/060-FirstProgramJavaScript'
  - 'shell/060-VSCodeInstall'
prerequisites:
  - 'html5/020-HTML5OverviewCoreFeature'
  - 'start/030-DevEnvironmentSetup'
---

## 前置知识

- 已读 [HTML5 概述与核心特性](/html5/020-HTML5OverviewCoreFeature)：知道 DOCTYPE 与字符编码各是干什么的；
- 已在 [开发环境搭建](/start/030-DevEnvironmentSetup) 装好 VS Code 与浏览器。还没装也不拦路：本篇 2.1 给出两分钟安装路径，或者先用记事本顶替——所有实验照样跑得通。

**与 start/030 的分工**：那篇管「装工具」，本篇只管「建工作流」——不重复安装任何软件，只回答：工具装好之后，网页开发每天的实际动作是什么。

## 学习目标

读完本文你将能够：

1. 跑通网页开发的最小工作流——编辑器改代码、保存、浏览器刷新、看效果——并说清每一拍归谁管；
2. 说出双击打开（file://）与 Live Server（http://localhost）的区别，以及从哪一刻起必须换用后者；
3. 用 DevTools 的 Elements、Styles、Console 三个面板，把同一页面的结构层、外观层、行为层连起来检查；
4. 遇到页面白屏，按「没保存 → 路径错 → 大小写不符」三步排查，并用 Ctrl+U 拿到铁证；
5. 把练习文件收进 first-page 项目文件夹，开始用项目化的方式管理代码。

预计 40 到 60 分钟，包含 1 个贯穿项目与 4 道练习。

## 1. 问题引入：装环境？网页开发不需要

学其他语言的同学还在配解释器、设环境变量、装虚拟机，你这边——010 已经双击打开过自己写的网页了，**环境早就齐了**。浏览器免费送了网页的全部运行环境：读 HTML、算 CSS、跑 JS 都是它的本职；编辑器负责写字。就这两个角色，没有第三个。

所以本篇不装任何软件（一个 VS Code 插件除外，它只是提速器）。要做的是把「凑合能跑」升级成「顺手好跑」：给练习文件安个家，把四拍循环提速，并给工作流配上第一件调试武器 DevTools——前两篇你只用过它的 Elements，今天把三层看全。

## 2. 工具盘点：两个角色，两条纪律

### 2.1 编辑器：VS Code

写字工具，本身不运行网页。安装与界面速览见 [VS Code 安装配置](/shell/060-VSCodeInstall)（或 [开发环境搭建](/start/030-DevEnvironmentSetup)），两分钟的事。两条纪律：

- 记事本可以起步，**Word 绝对不行**——它会往文件里塞隐藏格式字符，浏览器读到就是乱码；
- 记事本没有语法高亮和配对提示，标签一多就看花眼；VS Code 给配对标签高亮，少写一个 `</div>` 当场能看出来。

### 2.2 浏览器：Chrome 或 Edge

既是运行环境又是调试器，按 F12 掏出全套工具。用顺手的那个即可；本篇以 Chrome 为例（Edge 同源，几乎一致）。

## 3. 建项目：first-page 文件夹

别再把文件散在桌面。新建文件夹 `first-page`，在里面新建 `index.html`，完整内容如下：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>first-page 起步页</title>
  <style>
    h1 { color: #1d4ed8; }
  </style>
</head>
<body>
  <h1>我的工作流通了</h1>
  <p>改这一行文字，保存，刷新，看变化。</p>
  <button id="cheer">点我一下</button>
  <script>
    const button = document.getElementById('cheer');
    button.addEventListener('click', function () {
      console.log('按钮被点了，当前时间：' + new Date().toLocaleTimeString());
    });
  </script>
</body>
</html>
```

比 010 的页面多了两小块，凑齐三件套的三层：

- `<style>` 块里一条 CSS 规则，把 h1 染成蓝色——「化妆」的最小样本。真实项目会把样式拆到单独的 .css 文件（[CSS 是什么](/css/010-WhatIsCSS) 演示过拆法），练习阶段先住一个屋便于观察；
- `<script>` 块里四行 JavaScript，给按钮装了「被点击时打印一行日志」的监听。[第一门语言体验](/start/060-FirstProgramJavaScript) 里你在控制台玩过 `console.log`——现在它住进了页面文件，专职「行为」。

JS 语法先不抠，JavaScript 模块从头教；`const` 和 `function` 先混个眼熟。

## 4. 两种打开方式：双击 vs Live Server

### 4.1 先用老办法确认它活着

双击 index.html。预期效果：页面有蓝色大标题、一行说明文字、一个按钮；按 F12 切到 Console，没有红色报错；点一下按钮，Console 打印一行「按钮被点了，当前时间：…」。三层全部就位。

### 4.2 再装提速器 Live Server

VS Code 左侧点「扩展」图标（四个方块），搜索 `Live Server`，点 Install——本篇唯一的安装动作。装完回到 index.html，右下角状态栏出现 **Go Live**，点它。预期效果：默认浏览器自动弹出新标签页，地址栏是：

```text
http://127.0.0.1:5500/index.html
```

两种方式对照：

| | 双击打开 | Live Server |
| --- | --- | --- |
| 地址栏 | `file:///C:/...`（读硬盘文件） | `http://127.0.0.1:5500`（本机伪装成服务器） |
| 保存后 | 手动按 F5 刷新 | 自动刷新，浏览器不用碰 |
| 能力 | 单文件练习够用 | 与真实网站一致，多文件、网络请求的实验不受限 |
| 定位 | 自行车 | 电动车，去的是同一个地方 |

结论：现在双击照样能学；从「多文件、要发网络请求」起必须换 Live Server。装上它，十分钟后你就回不去了。

## 5. 即时反馈循环：前端的心跳

对着 first-page 完整跑一遍循环，每一拍都有预期：

1. 把 `<p>` 里的文字改成自己的话 → 保存 → 刷新（Live Server 免刷新）→ 页面文字变化；
2. 把 `<title>` 改成 `first-page 2.0` → 刷新 → 标签页标题变了，正文纹丝不动（head 与 body 分工，010 讲过）；
3. 把 style 里的 `#1d4ed8` 改成 `crimson` → 刷新 → 标题变红；
4. 把 script 里的 `'按钮被点了，当前时间：'` 改成 `'收到点击：'` → 保存刷新 → 点按钮 → Console 打印新文案。

改、存、刷、看——这四拍就是前端开发的心跳，以后所有页面都在这个节拍里长大。立一条纪律：**怀疑代码之前，先怀疑没刷新**。

## 6. DevTools 三层联动：一个面板看全三件套

在 first-page 页面上按 F12，依次做四件事：

1. **Elements（结构层）**：点面板左上角箭头图标（或 `Ctrl+Shift+C`），再点页面上的蓝色标题——面板里 `<h1>` 当场高亮。你点的不是「一张图」，是一个标签；
2. **Styles（外观层）**：就在 Elements 右侧，能看到 `h1 { color: #1d4ed8; }`。点中颜色值改成 `green` 回车——标题当场变绿。改的是内存副本，刷新即还原；试出满意的值再誊回文件；
3. **Console（行为层）**：输入 `document.title` 回车：

预期输出：

```text
'first-page 起步页'
```

JS 能读到页面元信息。再点几下按钮，看日志一条条排下来。

4. **串起来看**：Elements 是素坯（结构），Styles 是化妆（外观），Console 是操偶（行为）——010 的三件套类比，在同一个工具里各占一个面板。排查「页面不对劲」先问：结构不对（Elements）、样式不对（Styles），还是行为不对（Console）？

## 7. 常见错误与调试实录：页面白屏排查三步

症状：双击或刷新之后，页面一片白，什么都没有。别慌，九成的白屏落在下面三步里：

**第一步：没保存。** 最便宜也最高频。看 VS Code 标签页——文件名旁有圆点就是没存，Ctrl+S（macOS 用 Cmd+S）后刷新。铁证法：白屏页面上按 `Ctrl+U`，浏览器实际拿到的文本和你刚写的不一致，就是保存环节的锅。

**第二步：路径错。** 你打开的可能不是你以为的那个文件。对照两个地址：地址栏 `file:///` 后面的路径，和编辑器正在改的文件，是同一个吗？页面内链接与资源路径写错同理——`href="pages/about.html"` 而文件其实在根目录，点过去就是白屏或「找不到文件」错误页。通过 http 访问时，F12 的 Console 留下原文：

```text
GET http://127.0.0.1:5500/pages/about.html net::ERR_FILE_NOT_FOUND
```

读法：报错里的路径 → 对照硬盘实际位置 → 改 href 或挪文件。

**第三步：大小写不符。** Windows 不区分大小写，`Index.html` 与 `index.html` 本地都能开，你以为没写错；部署到 Linux 服务器（严格区分大小写）立刻 404。规矩从今天立：**文件名一律小写，引用与实际逐字符一致**。

三步都不中再回来——那时候的问题开始有意思了，线索通常就在 F12 的 Console 里。

## 8. 实际场景

- 真实项目的日常：以后上了框架与构建工具，工具更花哨，但「改、存、刷、看」的节拍一个字不变；
- Live Server 的 `http://127.0.0.1:5500` 是部署的预演：以后网站放上真服务器，浏览器与服务器之间就是同一类对话（networking 模块深讲）；
- 帮别人看页面：让对方按 F12 截图 Elements 与 Console，比远程瞎猜快十倍。

## 9. 小练习

预测题（5 分钟）：把 script 里的文案改成 `'收到点击：'`，**故意不保存**，直接去浏览器点按钮。Console 打印旧文案还是新文案？

答案（写完再对照）：旧文案。浏览器跑的是硬盘上保存过的版本——「先保存再怀疑代码」就是这么来的。

修改题（10 分钟）：加第二个按钮 `<button id="date">今天几号</button>`，script 末尾追加三行：`getElementById` 拿到它，`addEventListener('click', ...)`，点击时打印 `new Date().toLocaleDateString()`。验收：两个按钮各打各的日志，互不干扰；Console 无红色报错。

修Bug 题（10 分钟）：同学发来项目文件夹，说「index.html 打开白屏」。你检查发现：文件夹里确实有 index.html；VS Code 标签页上文件名旁有圆点；页面里还有一行 `<a href="About.html">关于本站</a>`，而实际文件叫 `about.html`。按本篇三步说出问题与修法。

答案（修完再对照）：问题一，没保存（圆点未消）——Ctrl+S；问题二，大小写不符——本地侥幸能开，迟早要炸的雷，href 改成 `about.html`。两条都在白屏三步之内。

挑战题（半小时，不看正文独立完成）：把 first-page 扩成两页小站。新建 `about.html`（结构同 index.html，标题与正文换成自我介绍），两页互链（`<a href="about.html">` 与 `<a href="index.html">`），各自 `<title>` 不同。验收清单：双击 index.html 能点到 about 再点回来；Live Server 下改 about.html 保存即自动刷新；两页 Console 都无红色报错；在 about 页执行 `document.title`，返回它自己的标题。

## 10. 与之前和之后的知识的关系

- 之前：[开发环境搭建](/start/030-DevEnvironmentSetup) 装好工具，[网页是什么](/html5/010-WhatIsWebpage) 造了第一个页面，[HTML5 概述与核心特性](/html5/020-HTML5OverviewCoreFeature) 给了全景——本篇把三者拧成每天可用的流程；
- 跨模块：[第一门语言体验](/start/060-FirstProgramJavaScript) 里控制台玩过的 console.log，今天住进了页面；[CSS 是什么](/css/010-WhatIsCSS) 演示的 Styles 改妆，今天你用同款手法改了颜色；
- 本模块之后：[DOCTYPE 声明](/html5/040-DocTypeDeclaration) 深讲第一行那五个词；[注释与实体](/html5/050-HTML5CommentsAndEntities)、[元信息与字符编码](/html5/060-MetadataCharacterEncoding) 解释 head 里「先混个眼熟」的两行；[块级与行内元素](/html5/070-HTML5BlockVsInline) 回答「为什么 h1 独占一行、a 只占自己的位置」。

## 11. 官方文档

- MDN「HTML 结构化 Web 内容」入门模块：https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Structuring_content
- MDN HTML 元素参考：https://developer.mozilla.org/zh-CN/docs/Web/HTML

## 12. 自我检查

- 能不看笔记跑通完整循环，说清双击打开与 Live Server 的地址栏区别（file:// 与 http://）；
- 能在 first-page/index.html 里指出哪几行是 HTML、哪几行是 CSS、哪几行是 JS；
- 会用 Elements 定位元素、在 Styles 里现场改颜色、在 Console 里读 `document.title`；
- 白屏三步能背出来，知道用 Ctrl+U 拿铁证；
- 「文件名一律小写」的规矩立住了，能说清为什么（Windows 侥幸，服务器不饶）。

## 本章总结

网页开发没有装环境这回事：浏览器是运行环境，编辑器是写字工具。本篇建立了 first-page 项目，跑通了「改、存、刷、看」的即时反馈循环，用 Live Server 把刷新变成自动，并用 DevTools 的 Elements、Styles、Console 把三件套连起来检查。页面白屏按「没保存、路径错、大小写不符」三步排查，Ctrl+U 是拿铁证的手段。

## 下一步

工作流通了，开始正式学标签。进入 [DOCTYPE 声明](/html5/040-DocTypeDeclaration)：把你每个页面第一行的那五个词讲透——标准模式与怪异模式的恩怨、为什么它必须站在第一行。之后注释、字符编码、块级与行内会接连登场。
