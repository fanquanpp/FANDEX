---
order: 20
title: HTML5 概述与核心特性：不是更难的 HTML，是更明确的 HTML
module: 'html5'
category: 前端技术
difficulty: beginner
description: 以「HTML 从 1991 年的 18 个标签长成今天，HTML5 是分水岭」开场：语义标签、原生音视频、表单增强、Canvas 与本地能力四个用户可感知的变化，DOCTYPE 与标准模式用 document.compatMode 现场验证，并澄清「HTML5 之后没有 HTML6」。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'html5/030-HTML5EnvSetupFirstPage'
  - 'html5/040-DocTypeDeclaration'
  - 'html5/170-SemanticTag'
  - 'html5/190-HTML5FormValidation'
  - 'html5/200-AudioVideo'
  - 'html5/230-HTML5MultimediaCanvasDrawing'
prerequisites:
  - 'html5/010-WhatIsWebpage'
---

## 前置知识

- 已读 [网页是什么](/html5/010-WhatIsWebpage)：手里有一个能双击打开的 index.html，知道标签长什么样，会「改、存、刷、看」四拍循环；
- **没做过 010 的实验也能跟**：本篇所有代码都能原样复制，新建一个文件照抄即可，只是少了「改造自己的页面」那层实感，建议先回 010 花十分钟补上。

## 学习目标

读完本文你将能够：

1. 说出 HTML5 相对老 HTML 的四个用户可感知变化（语义标签、原生音视频、表单增强、图形与本地能力）各自解决了什么老痛点；
2. 说出 `<!DOCTYPE html>` 的作用，并会用 Console 里的 `document.compatMode` 验证页面处于标准模式还是怪异模式；
3. 把一个 div 满天飞的页面改造成 header/main/footer 结构，并解释为什么渲染效果几乎不变；
4. 纠正两个常见误解：「HTML5 是要安装的新版本」与「语义标签自带样式」；
5. 拿不准某个特性支持度时，知道去 MDN 对应页面底部查兼容性表。

预计 30 到 45 分钟，包含 3 组动手实验与 4 道练习。

## 1. 问题引入：从 18 个标签到 HTML5

一句话交代身世：HTML 从 1991 年的 18 个标签长成今天这样，**HTML5 是分水岭**——1991 年 Berners-Lee 写下第一版 HTML 时只有 18 个标签，写文档够用，做应用远远不够；2014 年 HTML5 定稿，把浏览器欠了十几年的能力一次补齐。

欠了什么？把时间拨回 2010 年：想在网页放视频，得求访客装 Flash 插件——插件一崩，整个页面跟着白屏，手机浏览器干脆不支持；想记住用户的设置，只能挤在 4KB 的 cookie 里。那个年代的热词是「插件」「补丁」「装不上」。

HTML5 的思路一句话：**浏览器自己长出这些能力，别再求插件**。下面按用户可感知的程度看四个变化。

## 2. 变化一：语义标签——标签自己会说话

同一个页面的头部，两代写法：

```html
<!-- 2005 年的写法：一堆没有含义的盒子 -->
<div class="top">
  <div class="menu">导航链接</div>
</div>

<!-- HTML5 的写法：标签自己会说话 -->
<header>
  <nav>导航链接</nav>
</header>
```

同样的改法作用于正文（`<div class="content">` 变 `<main>`、文章变 `<article>`）和页脚（`<div class="bottom">` 变 `<footer>`）。亲手做完这个改造再刷新——**预期效果：页面几乎没有任何变化**，还是那几个上下排列的区块。

这正是语义标签最容易让人失望又最值得记住的地方：它不是给眼睛看的，读者是三类——半年后的你自己（`<header>` 比 `<div class="top">` 好读得多）、搜索引擎（结构清晰更容易被正确收录）、屏幕阅读器（视障用户「听」网页靠的就是这套结构，第 180 篇展开）。

再强调一遍以防走偏：`<header>` **不自带任何样式**，可以理解为「div 的别名加一行注释」。化妆永远是 CSS 的事。语义标签全家福在第 170 篇。

## 3. 变化二：原生音视频——插件退休

```html
<video src="demo.mp4" controls width="480"></video>
<audio src="demo.mp3" controls></audio>
```

`src` 填你自己的媒体文件，`controls` 是属性，意思是「给播放控件」。预期效果：页面出现一个 480 像素宽的视频框和一个音频条，都自带播放、暂停、进度条、音量按钮。文件不存在时控件依然在，点播放没反应（排查见第 9 节）。

对比一句话：HTML4 时代这块地盘归 `<object>` 加 Flash 插件。音视频全集在第 200 篇。

## 4. 变化三：表单增强——校验白送

```html
<form>
  <p>邮箱：<input type="email" required></p>
  <p>提醒日期：<input type="date"></p>
  <p><button>提交</button></p>
</form>
```

预期效果：点日期框，浏览器弹出日历让你挑；邮箱框输入 `abc` 点提交，浏览器直接拦下，弹出「请在电子邮件地址中包括 @ 符号」之类的原生气泡（各浏览器文案略有差异）。

注意刚才发生了什么：**一行 JavaScript 都没写**。HTML4 时代这种校验全靠手写 JS，每个网站各写一遍、参差不齐。表单与校验在第 190 篇。

## 5. 变化四：Canvas 与本地能力（预告）

最后一批能力要配合 JavaScript 才用得上——JS 你还没学，本节只认名字：

- **Canvas**：交给 JS 自由作画的画板，游戏、图表的地盘（第 230 篇）；
- **localStorage**：存在浏览器里的键值数据库，游戏存档、界面偏好的去处（第 240 篇）；
- 还有拖拽、地理定位、离线应用等一串（第 250、260、300 篇）。

这批能力是「Web 应用」的底气——网页从「看文档」长成了「能跑程序」。

## 6. DOCTYPE 与标准模式：第一行的含金量

010 的页面第一行是 `<!DOCTYPE html>`，作用一句话：告诉浏览器「按现行标准渲染」，让页面进入**标准模式**。不写或写错，浏览器退回**怪异模式**——按上世纪的老规矩渲染，最著名的差异是盒模型算尺寸的方式不同，CSS 写得再对也可能错位。

危险之处在于：页面太简单时，怪异模式**看不出来**。所以用证据说话。在 index.html 页面上按 F12，切到 Console，输入：

```javascript
document.compatMode
```

预期输出：

```text
"CSS1Compat"
```

然后删掉 index.html 的第一行，保存，刷新——页面毫无变化，再输一遍：

```text
"BackCompat"
```

BackCompat 就是怪异模式。看完把 DOCTYPE 加回去。模式差异的来龙去脉，第 040 篇整篇展开。

## 7. 核心概念：HTML5 到底是什么

三个澄清，一次到位：

1. **没有 HTML6**。HTML5 之后，标准组织 WHATWG 改为「活标准」（Living Standard）滚动更新：标准小步演进，浏览器自动跟上，不存在「等 HTML6 再学」这回事。2023 年以后的新能力（如 `<search>`、popover）都属于现行标准，第 440 篇介绍；
2. **HTML5 不是更难的 HTML，是更明确的 HTML**。010 学的标签一个都没变；新增的东西要么是「原来做不到、现在原生做到」（音视频、日历控件），要么是「原来靠 class 猜意思、现在标签名直说」（语义标签）。难度曲线没抬，表达力抬了；
3. **兼容性基本不用担心**。主流浏览器（Chrome、Edge、Firefox、Safari）对 HTML5 核心能力的支持早已对齐。拿不准就翻 MDN 对应页面底部的兼容性表。

## 8. 修改实验

对 010 的 index.html 动手：

1. 用 `<header>` 包住 h1，其余内容装进 `<main>`，链接放进 `<footer>`。预测：页面变不变？——不变。按 F12 到 Elements 确认层级真的变了：渲染归眼睛，结构归代码与机器；
2. 复制第 4 节的表单加进页面，再补一行 `<p>主题色：<input type="color"></p>`，看看拾色器长什么样；
3. 重做 compatMode 实验：删 DOCTYPE → BackCompat → 加回来 → CSS1Compat。练熟它，以后接手任何陌生页面第一件事就是查它。

## 9. 常见错误与调试实录

错误一：DOCTYPE 写成 `<!DOCTYPE HTML5>`。看着挺像那么回事，页面也一切正常，但 `document.compatMode` 返回 `"BackCompat"`——解析器只认 `html` 这个词，多了个 5 就不算数，页面静默退回怪异模式。标准写法死记：`<!DOCTYPE html>`。这类错误 Console 不报红字，全靠主动验证。

错误二：把语义标签当样式用。症状：听说 header 高大上，把 div 换成 header，刷新后发现页面毫无变化，怀疑自己写错了。没写错——**语义标签本来就不改变外观**。结构归 HTML，外观归 CSS（化妆师的工作，css/010 起步）。

错误三：视频点播放没反应。三步排查：

1. 保存了吗？没保存的话浏览器拿到的是旧文件；
2. `src` 与硬盘文件名逐字符对照，**含大小写**——Windows 不区分，本地侥幸能放，上服务器立刻失效；
3. 格式认不认：mp4、webm 通吃，avi、rmvb 别想。

通过 Live Server（第 030 篇装）或真实服务器访问时，加载失败会在 F12 的 Console 留下原文：

```text
GET http://127.0.0.1:5500/demo.mp4 net::ERR_FILE_NOT_FOUND
```

按图索骥即可。

## 10. 实际场景

- 新项目起手式：`<!DOCTYPE html>` 与 `<meta charset="UTF-8">` 开头，body 用语义骨架；
- 接手老项目：先看 DOCTYPE 在不在、div 是否嵌了七八层，一眼判断改造空间；
- 讲清「为什么用语义标签」：可读性、SEO、无障碍三条，面试与评审都够用；
- 判断资料新旧：开头还在教你装 Flash 插件的教程，直接关掉。

## 11. 小练习

预测题（5 分钟）：页面没有任何样式时，这两行的渲染结果有区别吗？

```html
<div>跳跳岛</div>
<article>跳跳岛</article>
```

答案（写完再对照）：没有区别。语义标签不改变默认渲染，变的是机器对内容的理解——这句话本篇说了三遍，因为它反直觉且重要。

修改题（10 分钟）：给第 4 节的表单追加两行——`<p>音量：<input type="range"></p>` 和 `<p>徽章颜色：<input type="color"></p>`。验收：拖动滑块有滑动手感，点击色块弹出系统拾色器；全程没有写一行 JS。

修Bug 题（10 分钟）：同学的「视频页」藏了两个真实 bug，症状是：`document.compatMode` 返回 `"BackCompat"`，而且视频控件点播放没反应。先定位再修复（提示：文件夹里实际的文件叫 `intro.mp4`）：

```html
<!DOCTYPE HTML5>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>演示视频</title>
</head>
<body>
  <h1>本作宣传片</h1>
  <video src="Intro.mp4" controls width="480"></video>
</body>
</html>
```

答案（修完再对照）：bug 一，DOCTYPE 写成 `<!DOCTYPE HTML5>`，改回 `<!DOCTYPE html>`；bug 二，`src="Intro.mp4"` 大小写与实际文件 `intro.mp4` 不符，改成一致。两个都是「不报错但坏事」的典型。

挑战题（半小时，不看正文独立完成）：把 010 挑战题的榜单页升级成 HTML5 版。验收清单：header（站名）+ main（每条目一个 article，内含 h2 与 p）+ footer（版权一行）的语义骨架；在 Console 执行 `document.compatMode`，输出应为 `"CSS1Compat"`；页面底部放一个小表单（type="email" 加 required），空邮箱或无 @ 的输入提交时会被浏览器拦下；渲染效果与 div 版相比几乎不变——这是及格线，不是事故。

## 12. 与之前和之后的知识的关系

- 之前：[网页是什么](/html5/010-WhatIsWebpage) 建立了「网页 = 文本文件 + 三件套」的心智模型，本篇回答「HTML5 这个 5 是什么、给了什么」；
- 本模块之后：[环境准备与第一个页面](/html5/030-HTML5EnvSetupFirstPage) 把双击打开升级成正规工作流；[DOCTYPE 声明](/html5/040-DocTypeDeclaration) 把第 6 节的一句话展开成整篇；[语义化标签](/html5/170-SemanticTag)、[表单校验](/html5/190-HTML5FormValidation)、[音视频](/html5/200-AudioVideo)、[Canvas 绘图](/html5/235-Canvas2DDrawing) 分别深讲四个变化。

## 13. 官方文档

- MDN「HTML 结构化 Web 内容」入门模块：https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Structuring_content
- MDN HTML 元素参考：https://developer.mozilla.org/zh-CN/docs/Web/HTML
- WHATWG HTML Living Standard（现行规范原文，供查证）：https://html.spec.whatwg.org/multipage/

## 14. 自我检查

- 能一口气说出四个变化各解决了什么老痛点（插件、白屏、手写校验、装不了应用）；
- 能默写 `<!DOCTYPE html>`，并知道用 `document.compatMode` 验证模式；
- 能复述「没有 HTML6」与「语义标签不自带样式」两个澄清；
- 日历控件与原生气泡校验是你亲手触发过的；
- 拿不准兼容性时，知道去 MDN 页面底部查表。

## 本章总结

HTML5 是 HTML 演化的分水岭：语义标签让标签自己会说话（渲染不变，机器可读），原生音视频送走了插件，表单增强白送了校验，Canvas 与本地能力把网页推向应用。DOCTYPE 让页面进入标准模式，`document.compatMode` 可以现场验证；活标准意味着没有 HTML6。记住这句定调：HTML5 不是更难的 HTML，是更明确的 HTML。

## 下一步

能力盘点完了，该升级干活的家伙事了。进入 [环境准备与第一个页面](/html5/030-HTML5EnvSetupFirstPage)：用 VS Code 与 Live Server 把「改、存、刷、看」提速一档，并用 DevTools 把三件套在同一个页面里连起来。
