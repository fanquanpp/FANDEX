---
order: 20
title: "SVG 文档结构：画布、命名空间与复用"
module: 'svg'
category: 前端技术
difficulty: beginner
description: "以「同一个圆要画十次」引入，讲透 svg 根元素与 xmlns、defs/use 复用、g 分组与继承、title 可访问性，附白屏与失真两类问题的排查实录。"
author: fanquanpp
updated: '2026-09-28'
related:
  - 'svg/010-SVGOverviewEnvSetup'
  - 'svg/030-SVGCoordinateSystemViewBox'
  - 'svg/120-SVGSymbolReuse'
prerequisites:
  - 'svg/010-SVGOverviewEnvSetup'
---

## 前置知识

- 已完成 [SVG 概述](/svg/010-SVGOverviewEnvSetup)：能写出六行的 .svg 并在浏览器打开。

## 学习目标

读完本文你将能够：

1. 说出 `xmlns` 这行「咒语」的真实作用，并解释缺它为什么白屏；
2. 用 `<defs>` + `<use>` 把一个形状画十次而只定义一次；
3. 用 `<g>` 分组并利用属性继承批量改样式；
4. 给图形加 `<title>` 提升可访问性，并完成一个「图标库文件」的最小组织。

预计 30 到 50 分钟。

## 1. 你现在要解决什么问题

010 篇的六行文件能跑，但有两个隐藏问题：`xmlns` 那串网址是干什么的（删了似乎也能显示？）；以及一个现实需求——设计稿里有十个一样的圆点，难道复制十行 `<circle>`？本文补齐 SVG 文档的完整骨架，让文件从「能跑」变成「可维护」。

## 2. 最小可运行示例：定义一次，使用十次

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="220" height="60">
  <defs>
    <circle id="dot" cx="10" cy="10" r="8" fill="#39C5BB" />
  </defs>
  <use href="#dot" x="0" />
  <use href="#dot" x="40" />
  <use href="#dot" x="80" />
  <use href="#dot" x="120" />
  <use href="#dot" x="160" />
  <use href="#dot" x="200" />
</svg>
```

预期效果：横排六枚圆点。`<defs>` 里的形状**本身不渲染**，`<use href="#dot">` 是「在这里盖一个章」——改 `defs` 里的半径或颜色，六个章全部同步。这就是图标库文件（一个 svg 文件装全套图标）的组织原理，120 篇的 `<symbol>` 是它的进阶形态。

## 3. 发生了什么：xmlns 与 g 分组

**xmlns 不是网址，是名字空间声明**：`<rect>` 这类标签名在 XML 世界可能被不同语言各自定义（HTML 与 SVG 都想叫 `<rect>`？），`xmlns` 告诉浏览器「本文件的标签按 SVG 规范解释」。缺了它，浏览器按 HTML 规则解析未知名标签——形状全部失去几何含义，表现就是**白屏**。

`<g>`（group）是形状的文件夹：把多个形状包进 `<g fill="#333" transform="translate(10,0)">`，组内未显式声明 fill 的形状全部继承组属性——「整组换色、整组平移」一次完成。

`<title>` 子元素是形状的悬停提示与读屏文案：给每个图标加 `<title>设置</title>`，可访问性就从「能看」升级到「能懂」。

## 4. 调试实录：两类高频问题

问题一，删除 xmlns 后白屏。验证方式：把文件拖进浏览器开发者工具的 Elements 面板，看到 `<rect>` 被解析成普通未知元素（无几何属性）。修复：补回 xmlns。记住：**内嵌在 HTML 里的 `<svg>` 可以省略 xmlns（HTML 解析器宽容），独立 .svg 文件必须保留（XML 解析器严格）**——这解释了「为什么网上抄的片段放进 .svg 文件就白屏」。

问题二，`<use>` 引用后图形失真或错位：`href` 的 id 拼写错误时 use 静默渲染空（不报错，引用失效）；`x`/`y` 是「平移量」而非绝对坐标（在 defs 里坐标的基础上叠加）。排查工具：浏览器 Elements 面板里展开 use 的影子树，核对实际渲染的节点。

## 5. 修改实验

1. 把六个 `use` 里的三个改成 `fill="#FF6699"`——预测哪些圆变色（use 上覆盖属性对 defs 中已显式声明 fill 的形状**无效**，这是继承的边界，040 篇展开），验证你的理解；
2. 用 `<g transform="scale(2)">` 包住全部 use，观察坐标系翻倍——为 030 篇的变换埋种子；
3. 给每个 use 之间插入 `<title>`，验证悬停提示。

## 6. 小练习

预测题（先写答案再运行）：`<g fill="red"><rect width="10" height="10" fill="blue" /><rect width="10" height="10" /></g>` 里两个方块各是什么颜色？

修改题：把六枚圆点改为「前四枚灰、后两枚绿」，要求 defs 只定义一次、颜色差异在使用处表达（提示：把 fill 从 defs 里的 circle 移除）。

修 Bug 题：同事的图标库文件里 `<use href="#icon-search">` 渲染空白，`<defs>` 里有 `<rect id="icon-search">`。给出两个最可能的检查点（id 拼写与 defs 是否真的包含目标）。

挑战题（不看提示）：制作一个含三枚图标（播放、暂停、停止，各用基本形状拼出）的图标库文件，要求：定义各一次、使用处横排三个 40x40 格、每个图标带中文 title。验收：浏览器 300% 缩放锐利、悬停出现提示。

先自己动手或写下预测，再展开参考答案对照：

<details>
<summary>参考答案（先自己写，再展开对照）</summary>

预测题：第一个方块是 **blue**，第二个是 **red**。第一个矩形显式声明了 fill="blue"，组属性对它无效——显式声明优先于继承；第二个没写 fill，继承组的 red。这正是第 2 节「定义一次、样式继承」的边界：继承只填空位，不搞推翻。

修改题：把 defs 里的 circle 改为不带 fill（`<circle id="dot" cx="10" cy="10" r="8" />`），前四个 use 写 `fill="#999999"`、后两个写 `fill="#22AA55"`。原理与预测题同源：defs 里不声明 fill，颜色这一格是空的，使用处才有机会填；只要 defs 里写了显式 fill，use 上怎么覆盖都无效。

修 Bug 题：两个检查点，按命中概率排序——其一，id 与 href 的大小写或拼写不一致（icon-search 与 iconSearch 是两个 id，use 引用失效时不报错、静默空白）；其二，目标是否真的在 `<defs>` 内部且 id 全文档唯一（重复 id 时 use 只认第一个，若第一个被藏在别处或被裁剪就渲染异常）。验证手段：浏览器 Elements 面板展开 use 的影子树，看它实际引用到了什么。

挑战题参考骨架（形状细节可自由发挥，验收看三条硬标准）：

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40">
  <defs>
    <g id="icon-play"><polygon points="14,10 30,20 14,30" /></g>
    <g id="icon-pause"><rect x="12" y="10" width="6" height="20" /><rect x="22" y="10" width="6" height="20" /></g>
    <g id="icon-stop"><rect x="12" y="12" width="16" height="16" /></g>
  </defs>
  <use href="#icon-play" x="0" fill="#39C5BB"><title>播放</title></use>
  <use href="#icon-pause" x="40" fill="#39C5BB"><title>暂停</title></use>
  <use href="#icon-stop" x="80" fill="#39C5BB"><title>停止</title></use>
</svg>
```

要点核对：三个图标各定义一次，使用处只给 x 偏移（0/40/80 正好三个 40x40 格）；title 作为 use 的子元素提供悬停文案；填充色在使用处统一给，未来换主题色只改三行。300% 缩放锐利无需任何操作——矢量放大不损失清晰度，这是 SVG 对位图图标的根本优势。

</details>

## 7. 什么时候应该 / 不应该这样组织

应该：同一形状复用两次以上立刻上 defs/use；成组的装饰元素用 g 管理；独立 .svg 保留 xmlns；给信息性图形配 title。

不应该：为不复用的形状建 defs（增加间接层）；在 defs 内写「希望逐实例变色」的显式 fill（继承边界会让覆盖失效）；用 use 滥引超大文件（性能与缓存要预算）。

## 8. 与之前和之后的知识的关系

- 往前：010 的六行文件是本文的退化形态——补上 xmlns 的含义、defs/use 的复用、g 的继承，骨架才完整；
- 往后：030 的 viewBox 决定「这棵元素树以什么比例呈现」，是响应式图标的钥匙；120 篇的 symbol 是 defs/use 的图标库正解；
- 更远：图标工程（SVG Sprite、按主题换色）全部建立在「定义一次、样式继承、引用实例」三件套上。

## 9. 官方文档

- MDN：SVG 元素参考（defs/use/g 全解）：https://developer.mozilla.org/zh-CN/docs/Web/SVG/Element
- MDN：use 的引用规则：https://developer.mozilla.org/zh-CN/docs/Web/SVG/Element/use

## 10. 自我检查

- 能解释 xmlns 的作用与「HTML 内嵌可省、独立文件必须留」的分界；
- 能用 defs/use 把重复形状收敛为单一定义；
- 能预测 fill 在 g 与 use 上的继承与覆盖边界；
- 已完成图标库挑战题。

## 本章总结

SVG 文档的骨架 = 画布（svg）+ 名字空间（xmlns）+ 定义区（defs）+ 实例（use）+ 分组（g）+ 语义（title）。复用让文件可维护，分组让批量操作可行，title 让图形可被理解。骨架之上，下一步是把「画在哪个位置、以什么比例」讲清楚。

## 下一步

进入 [坐标系与 viewBox](/svg/030-SVGCoordinateSystemViewBox)：SVG 最容易翻车也最有威力的一个概念。
