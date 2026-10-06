---
order: 740
title: CSS Grid 快速上手：一张网格管住整页布局
module: 'css'
category: 前端技术
difficulty: beginner
description: "从「Flex 管一行，整页三栏加页眉页脚谁来管」出发，用 display: grid 与 fr 单位搭出第一张网格，用 repeat(auto-fill, minmax()) 做出不写媒体查询的响应式卡片墙，再用 grid-template-areas 画出博客页面骨架，并给出 Grid 与 Flex 的分工决策表。"
author: fanquanpp
updated: '2026-09-27'
related:
  - 'css/240-CSS3FlexboxFlexLayout'
  - 'css/250-CSS3GridGridLayout'
  - 'css/360-MediaQuery'
  - 'css/680-CSSProjectExampleResponsiveHomepage'
prerequisites:
  - 'css/050-CSS3BoxModelDetailed'
---

## 前置知识

- 已完成 [CSS3 盒模型详解](/css/050-CSS3BoxModelDetailed)。本文只用到盒模型的一条常识：「块级元素默认独占一行」，050 没读完也能跟；
- 不要求读过 [CSS3 Flexbox 弹性布局](/css/240-CSS3FlexboxFlexLayout)，第 1 节会用一次尝试把 Flex 的定位讲清。

**与第 250 篇的分工**：本模块有两篇 Grid。[CSS3 Grid 网格布局](/css/250-CSS3GridGridLayout) 是深水篇，讲全全部属性与对齐、隐式网格、subgrid；本篇是快速上手，只用最常用的少数属性，一小时内做出整页骨架和响应式卡片墙。

## 学习目标

读完本文你将能够：

1. 用 `display: grid` 加 `grid-template-columns` 排出多列网格，预测 fr 与 px 混用时的每列宽度；
2. 用 `repeat(auto-fill, minmax(220px, 1fr))` 写出不写媒体查询的响应式卡片墙，说清 auto-fill 与 auto-fit 的区别；
3. 用 `grid-template-areas` 画出「页眉、三栏、页脚」的博客骨架，解释区域名为什么必须拼成矩形；
4. 遇到「格子没按预期排」的页面，按 display: grid、区域名拼写、每行格子数三步定位；
5. 用决策表判断一个布局需求该交给 Flex 还是 Grid。

预计 40 到 60 分钟，含 3 组动手实验与 4 道练习。

## 1. 问题引入：Flex 管一行，页面整体的三栏加页眉页脚谁来管

你在给自己的游戏周报博客搭首页：页眉横贯全宽，中间左侧 220px 侧栏、自适应正文、右侧 180px「本周热榜」，页脚横贯全宽。用 Flex 先试：外层竖向容器装「页眉、中间、页脚」，中间再套一行装三栏。能做出来，但很快遇到三件烦事——嵌套层层对齐，错一处就歪；整页尺寸分散在三四条规则里，看不出全貌；页脚要在内容不满一屏时贴住窗口底部，只能靠 min-height 配弹性生长的组合技巧。

根子在于：Flex 是一维工具，一次只管一行或一列；整页布局是二维问题，行和列要同时定义。换 Grid 出场：**先画出一张格子网，再让每个孩子认领自己的格子**。

## 2. 最小示例：三条声明排出三等分栏

新建文件夹 `grid-experiment` 放两个文件。`index.html` 沿用第 010 篇的页面骨架（DOCTYPE、head 与 link），body 内容如下：

```html
<div class="row">
  <div class="cell">本周通关</div>
  <div class="cell">本周翻车</div>
  <div class="cell">本周语录</div>
</div>
```

`styles.css`：

```css
.row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
}

.cell {
  background: #fff;
  border: 2px solid #94a3b8;
  padding: 20px;
}
```

预期效果：三块白底卡片等宽横排、间隙 16px，拉宽拉窄窗口始终等分。

## 3. 核心概念：fr 与 gap

### 3.1 fr：分配的是剩余空间的比例

fr 是 Grid 专属单位（fraction，份数），不表示固定宽度，表示「剩余空间分给我几份」。把 `.row` 的列定义改成 `grid-template-columns: 100px 1fr 2fr`。

预期效果：第一列固定 100px，剩余宽度按 1 比 2 分给后两列。容器 900px、gap 共占 32px 时剩余 768px，中间列约 256px、右边列约 512px；缩放窗口，100px 纹丝不动，两个 fr 列按比例伸缩。口诀：**px 是先扣掉的固定开支，fr 是剩下的按股份分**。行同理用 `grid-template-rows` 定义，写法一样；不定义时行高默认由内容撑开。

gap 则把间距还给容器：一条 `gap: 16px` 管住全部行列间距（可分写 `row-gap` 与 `column-gap`），子元素 margin 的「最后一个元素多出的边距」尾差也随之消失。

### 3.2 repeat 与 minmax：不写媒体查询的响应式卡片墙

想要「放得下几列就摆几列」，把三个 cell 换成六个，列定义换成 `grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))`。

每列最窄 220px、最宽均分剩余空间；`auto-fill` 让浏览器按这个规格尽量多摆列。预期效果：宽屏四列，窗口缩窄自动降为三列、两列、一列，全程没有横向滚动条——一行声明替代一整套断点。

auto-fill 与 auto-fit 只差在「空格子」：卡片只有 3 张而宽屏算出 4 列时，auto-fill 保留第 4 条空轨道，3 张卡守在窄格子里；auto-fit 把空轨道塌缩掉，3 张卡均分全宽变宽卡。要撑满用 auto-fit，要规格稳定用 auto-fill。

### 3.3 grid-template-areas：给格子起名字，布局即图纸

回到第 1 节的博客首页。`grid-template-areas` 允许先用文字画出整页图纸，再让区块按名字入座。替换 index.html 的 body 与 styles.css：

```html
<body class="page">
  <header class="site-header">站点页眉</header>
  <nav class="sidebar">分类侧栏</nav>
  <main class="content">正文内容</main>
  <aside class="hot">本周热榜</aside>
  <footer class="site-footer">站点页脚</footer>
</body>
```

```css
.page {
  display: grid;
  grid-template-columns: 220px 1fr 180px;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "header header header"
    "sidebar main aside"
    "footer footer footer";
  min-height: 100vh;
}

.site-header { grid-area: header; }
.sidebar     { grid-area: sidebar; }
.content     { grid-area: main; }
.hot         { grid-area: aside; }
.site-footer { grid-area: footer; }
```

预期布局效果：页眉横贯顶部；第二行左侧 220px 侧栏、中间正文撑满剩余宽度、右侧 180px 热榜；页脚横贯底部。内容不满一屏时页脚依然贴住窗口底——`min-height: 100vh` 撑满视口，中间的 1fr 行吃掉多余高度。

图纸的规则只有三条：每行引号里的词数必须相同（等于列数）；同名格子必须拼成矩形，L 形非法；`.` 是占位符。`grid-area` 的值就是区域名，认领后自动入座，HTML 里的先后顺序不再决定位置——调布局不用动 HTML。

## 4. Grid 与 Flex 的分工决策表

| 需求 | 用谁 | 一句话理由 |
| --- | --- | --- |
| 导航条、按钮组这类一行或一列排开 | Flex | 一维问题，内容自适应，代码最少 |
| 整页骨架：页眉、多栏、页脚同时定义 | Grid | 二维轨道一次画完，不靠嵌套 |
| 固定栏宽 + 自适应正文的经典三栏 | Grid | 「固定 px + fr」一行列定义 |
| 卡片墙：列数随宽度自动增减 | Grid | repeat(auto-fill, minmax()) 专属能力 |

一句话决策：先问「这是一维还是二维」，一条轴交给 Flex，行和列同时定义交给 Grid；真实项目两者嵌套混用，Grid 管骨架、骨架里的一维排列用 Flex。

## 5. 修改实验

对 3.3 的博客骨架动手，每步先预测再刷新：

1. 把 220px 改成 300px：侧栏变宽，正文相应变窄；热榜列 180px 改成 1fr：热榜与正文平分剩余空间；
2. 把图纸第一行改成 `header header .`：页眉只占左两列，右上角空出一格——图纸改一笔，全家跟着挪；
3. 卡片墙 minmax 的 220px 改成 400px：宽屏也从四列掉到两列；改成 150px：列数变多；
4. auto-fill 换成 auto-fit，卡片减到 3 张观察撑满效果。

## 6. 常见错误与调试实录

错误一：图纸行列不齐，整条 areas 声明作废。中间行多写一个词、或页脚行只写两个词，浏览器判定整条声明非法——不报错，安静作废，布局退化成自动摆放，页眉缩在左上角一格，区块挤成两行。F12 里 `grid-template-areas` 整条被划掉。修复：每行词数一致，缺位用 `.` 占位。

错误二：区域名拼错，元素掉进自动流。`grid-area: hedader`（少个 a）匹配不到 header 区域，该元素按自动流塞进第一个空格子，与别的区块挤在一起。排查：DevTools 选中元素看 `grid-area` 的值，再到 Layout 面板勾选显示区域名，对照之下拼写错误无处藏身。

错误三：内容撑破 1fr。正文里粘进一条超长英文链接后，1fr 列被撑得比预期宽，整页出现横向滚动条——网格项目默认最小宽度是「内容的固有宽度」，长单词拒绝折行，就把轨道撑开了。修复：

```css
.page {
  grid-template-columns: 220px minmax(0, 1fr) 180px;
}
```

`minmax(0, 1fr)` 明确告诉浏览器「这列最小允许 0，长内容自己折行」。这是 Grid 排错率最高的一条，原理见第 250 篇，排查工具箱见第 190 篇调试技巧。

## 7. 实际场景

- 博客、文档站、管理后台的整页骨架：areas 画图纸是标准解法；
- 卡片墙与图库：一行声明顶一打断点，[响应式个人主页](/css/680-CSSProjectExampleResponsiveHomepage) 里有完整应用；
- 表单排版：「标签列固定宽 + 控件列自适应」用两列网格比手工对齐省心；
- 何时不用：单行导航、工具条这类一维需求继续用 Flex；内容驱动的场景（聊天消息流）也是 Flex 更合适。

## 8. 小练习

预测题（5 分钟）：容器宽 900px、gap 为 20px，声明 `grid-template-columns: 100px 1fr 2fr`。先写下三列预测宽度再验证。

答案（写完再对照）：可用宽度 900 - 100 - 40（两条 gap）= 760px，1fr 列约 253px，2fr 列约 507px。

修改题（10 分钟）：卡片墙只放 3 张卡，列定义依次用 auto-fill 与 auto-fit 各截一张图。验收：前者 3 张卡偏窄、右侧留着空轨道位，后者均分整行。并解释差别出在空轨道保不保留。

修 Bug 题（10 分钟）：下面这份样式想做第 3.3 节的博客骨架，症状是「页眉没有横贯全宽，区块挤在左上角像表格，热榜整栏消失」。先用 DevTools 定位两处 bug，再修复：

```css
.page {
  display: grid;
  grid-template-columns: 220px 1fr 180px;
  grid-template-areas:
    "header header header"
    "sidebar main aside"
    "footer footer";
}

.site-header { grid-area: hedader; }
```

挑战题（半小时，不看正文独立完成）：为游戏周报站做完整首页。验收：页眉页脚横贯全宽且贴住窗口上下边缘（内容不满一屏也贴底）；左侧 200px 侧栏加自适应正文；正文下方 auto-fill 卡片墙放 6 张游戏卡；窗口从 1200px 缩到 360px 无横向滚动条；超长链接不撑破列；CSS 里至少一条注释解释取舍。

## 9. 与之前和之后的知识的关系

- 之前：[CSS3 盒模型详解](/css/050-CSS3BoxModelDetailed) 解释了盒子尺寸从哪来，fr 的「剩余空间」正是扣掉盒模型尺寸与 gap 的余量；[响应式个人主页](/css/680-CSSProjectExampleResponsiveHomepage) 里 Grid 已实战过一轮；
- 并行：[CSS3 Flexbox 弹性布局](/css/240-CSS3FlexboxFlexLayout) 是搭档，分工见第 4 节；[CSS3 Grid 网格布局](/css/250-CSS3GridGridLayout) 是深水篇，对齐、隐式轨道、命名网格线、subgrid 都在那边；
- 之后：[transform 与 3D 变换](/css/700-Transform3D) 下一篇登场——骨架稳了，让网格里的卡片动起来。

## 10. 官方文档

- MDN「Grid 布局的基本概念」：https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_grid_layout/Basic_concepts_of_grid_layout
- MDN grid-template-areas 属性参考：https://developer.mozilla.org/zh-CN/docs/Web/CSS/grid-template-areas
- MDN 学习区 Grids 教程：https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/CSS_layout/Grids

## 11. 自我检查

- 能默写 `repeat(auto-fill, minmax(220px, 1fr))` 并解释每个零件，说清 auto-fill 与 auto-fit 的差异；
- 能用 grid-template-areas 画出三栏加页眉页脚的骨架，解释区域名必须成矩形、每行词数必须一致的原因；
- 「格子没按预期排」时会按三步排查（display: grid、区域名拼写、每行格子数），长内容撑破列知道换 minmax(0, 1fr)；
- 面对布局需求，能用决策表说出选 Flex 还是 Grid。

## 本章总结

Grid 是二维布局系统：`display: grid` 让直接子元素按格子就位，`grid-template-columns/rows` 用轨道定义行与列，px 是先扣的固定开支、fr 是剩余空间的股份，gap 把间距还给容器。repeat 加 minmax 一行声明得到响应式卡片墙；`grid-template-areas` 先画图纸再按名入座，图纸必须行列对齐、区域成矩形，长内容多的列记得 minmax(0, 1fr)。分工一句话：一维找 Flex，二维找 Grid。

## 下一步

进入 [transform 与 3D 变换](/css/700-Transform3D)：骨架已经稳了，下一步让网格里的卡片动起来——hover 轻轻抬起、3D 翻转，以及「为什么动 transform 不卡」的性能真相。
