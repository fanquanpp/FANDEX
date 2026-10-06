---
order: 250
title: CSS3 Flexbox 弹性布局
module: 'css'
category: 前端技术
difficulty: intermediate
description: "从「导航条 logo 在左、菜单在右、窗口一拉就散架」出发，用 display: flex 加 justify-content 三行代码排稳一行内容，吃透 flex: 1 背后的 grow/shrink/basis 三兄弟与空间分配算术，再收下居中、侧栏、吸底页脚、卡片墙四个高频模式与 min-width: auto 这个头号坑。"
author: fanquanpp
updated: '2026-09-29'
related:
  - 'css/250-CSS3GridGridLayout'
  - 'css/690-GridQuickStart'
  - 'css/210-TraditionalLayoutTech'
  - 'css/360-MediaQuery'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
  - 'css/050-CSS3BoxModelDetailed'
---

## 前置知识

- 已完成 [CSS3 盒模型详解](/css/050-CSS3BoxModelDetailed)：知道 width 默认指内容宽度、padding 会撑大盒子即可；
- 不需要先学 Grid；第 4 节会给出两者的分工决策，快速上手版见 [CSS Grid 快速上手](/css/690-GridQuickStart)。

## 学习目标

读完本文你将能够：

1. 用 `display: flex` 加一条对齐属性排稳导航条、工具栏这类「一行内容」，窗口缩放不散架；
2. 说清 `flex: 1` 展开成什么、空间是怎么按 grow/basis 算出来的，能预测三个子元素的最终宽度；
3. 默写居中、等分、固定侧栏、吸底页脚四个高频模式的代码；
4. 遇到「子元素被压扁/溢出不换行」时，知道先查 `flex-wrap` 和 `min-width: auto`；
5. 用决策表判断一个布局该交给 Flex 还是 Grid。

预计 40 到 60 分钟，含 1 组动手实验与 4 道练习。Flexbox 本身早已是全平台基线能力（Baseline 广泛可用），本文不讨论旧浏览器前缀。

## 1. 问题引入：导航条为什么一拉就散

你给周报站写页头：左边 logo，右边四个菜单项，中间留白。第一反应是给每个元素算 margin——logo 右边多少、第一个菜单项左边多少。窗口拉宽后，右边一坨元素钉在原地，中间变成一大片空白；窗口缩窄，菜单项和 logo 挤在一起甚至换行。

问题的根子在于：**margin 描述的是「我离别人多远」，是静态的**；而页头真正想要的是「两个组之间始终留白、窗口变化时自动伸缩」——这是一种**关系**。Flex 的思路是把「排列与分配」这件事整个交给父容器：孩子只管报尺寸，容器管怎么摆。

## 2. 最小示例：三行代码排稳导航条

新建文件夹 `flex-experiment`，`index.html` 的 body：

```html
<nav class="nav">
  <span class="logo">周报站</span>
  <ul class="menu">
    <li>首页</li>
    <li>归档</li>
    <li>关于</li>
  </ul>
</nav>
```

`styles.css`：

```css
.nav {
  display: flex;             /* 容器出场，孩子变成弹性项目 */
  justify-content: space-between; /* 主轴两端对齐，中间自动留白 */
  align-items: center;       /* 侧轴垂直居中 */
  padding: 12px 24px;
  background: #1e293b;
  color: #f8fafc;
}

.menu {
  display: flex;             /* 菜单自己也是容器，flex 可以嵌套 */
  gap: 24px;                 /* 项与项的间距交给容器统一管 */
  list-style: none;
  margin: 0;
  padding: 0;
}
```

预期效果：logo 贴左、三项菜单贴右且彼此间距 24px，两组在导航条内垂直居中；窗口从宽拉到窄，两端始终贴边、间距纹丝不动——「关系」代替了「算术」。

## 3. 核心概念

### 3.1 两条轴：所有对齐属性的地基

容器一出场就有两条轴。**主轴**是孩子排列的方向，由 `flex-direction` 决定（默认 `row` 从左到右）；**侧轴**与主轴垂直（默认从上到下）。关键在下面这句：

> `justify-content` 管主轴，`align-items` 管侧轴——主轴一旦被 `flex-direction: column` 转成竖直，这两个属性的横竖效果就整体互换。

所以背口诀没有用，正确动作是先画轴再选属性：这行内容是横着排还是竖着排？横排时想水平对齐找 `justify-content`，想垂直对齐找 `align-items`。

容器属性速查：

| 属性 | 管什么 | 常用值 |
| --- | --- | --- |
| `flex-direction` | 主轴方向 | `row`（默认）、`column` |
| `justify-content` | 主轴对齐与分配 | `center`、`space-between`、`flex-end` |
| `align-items` | 侧轴对齐 | `center`、`stretch`（默认）、`baseline` |
| `flex-wrap` | 挤不下是否换行 | `nowrap`（默认）、`wrap` |
| `gap` | 项目间距 | `16px`、`12px 24px`（行 列） |
| `align-content` | 多行（或多行空间）的分配 | `center`、`space-between` |

### 3.2 项目三兄弟：grow、shrink、basis

每个直接子元素都有三个伸缩参数，`flex` 简写一次给全：

```css
.item {
  flex: 1;         /* 展开为 flex: 1 1 0% */
}
.logo {
  flex: 0 0 120px; /* 不放大不缩小，钉死 120px */
}
.main {
  flex: auto;      /* 展开为 flex: 1 1 auto */
}
img {
  flex: none;      /* 展开为 flex: 0 0 auto，图片按固有尺寸放 */
}
```

三个参数的含义：**basis 是起点**（分配空间前先按 basis 占位，`0%` 表示不带内容尺寸入场，`auto` 表示按内容/width），**grow 是分剩菜的比例**（剩余空间按 grow 值分配），**shrink 是抢着缩小的权重**（空间不够时按比例收缩）。

算一遍就懂了。容器 700px、`gap: 20px`、三个子元素都写 `flex: 1`：

- 可分配空间 = 700 - 2 × 20 = 660px；
- 三个 basis 都是 0，剩余 660px 按 grow = 1 : 1 : 1 平分，每项 220px。

把中间那个改成 `flex: 2`：660px 按 1 : 2 : 1 分，得 165、330、165。把三个都改成 `flex: auto`（basis 为 auto）：先按各自内容宽度占位，再把剩余空间平分——这就是 `flex: 1` 和 `flex: auto` 的本质区别：**前者内容不影响宽度（等宽卡片用它），后者内容参与计算（工具栏按钮用它）**。

### 3.3 项目侧的对齐与排序

```css
/* 单个项目不听容器 align-items 的，自己开小灶 */
.avatar { align-self: flex-end; }

/* 视觉顺序 ≠ DOM 顺序；屏幕阅读器仍按 DOM 读，别滥用 */
.first { order: -1; }
```

## 4. 高频模式清单（背下来直接用）

| 模式 | 代码 | 一句话要点 |
| --- | --- | --- |
| 水平垂直居中 | `display: flex; justify-content: center; align-items: center;` | 替代定位居中的首选 |
| 等分一栏 | `.parent > * { flex: 1; }` | basis 为 0，纯按份分 |
| 固定侧栏 | `.side { flex: 0 0 220px; } .main { flex: 1; }` | 侧栏钉死，正文吃剩余 |
| 吸底页脚 | `.page { display: flex; flex-direction: column; min-height: 100vh; } .content { flex: 1; }` | 内容不满一屏页脚也贴底 |
| 自适应卡片墙 | `.cards { display: flex; flex-wrap: wrap; gap: 20px; } .card { flex: 1 1 280px; }` | basis 280 兼作最小宽，挤不下自动换行 |
| 状态条两端对齐 | `justify-content: space-between;` | logo/按钮分居两侧 |

二维骨架（页眉加多栏加页脚一次定义）不是 Flex 的主场，分工决策表见 [CSS Grid 快速上手](/css/690-GridQuickStart) 第 4 节：一条轴交 Flex，行与列同时定义交 Grid。

## 5. 修改实验

对第 2 节的导航条动手，每步先预测再刷新：

1. 给 `.logo` 加 `flex: 1`，给 `.menu` 加 `flex: 1`：两组各占一半，菜单不再贴右——space-between 和 grow 混用时，分配逻辑以 grow 为准；
2. `.menu` 里加第 5、6 个菜单项并保留，窗口缩到 400px：菜单被压扁（默认 `nowrap` 不换行）；
3. 给 `.nav` 加 `flex-wrap: wrap` 再缩窗口：装不下的菜单整体换行——「先换行保内容，再谈对齐」；
4. 把 `.nav` 的 `flex-direction` 改成 `column`：logo 跑到上面，`justify-content: space-between` 变成竖直方向的两端对齐——验证第 3.1 节的轴互换结论。

## 6. 常见错误与调试实录

错误一：内容把弹性项目撑爆。弹性项目里塞一张超宽图片或一条长链接，项目拒绝缩小，整行溢出。原因：项目默认 `min-width: auto`，最小宽度是内容的固有宽度，shrink 再大也压不下去。修复：

```css
.main {
  flex: 1;
  min-width: 0; /* 允许压缩到 0，长内容自己折行或滚动 */
}
```

这是 Flex 排错率最高的一条，与 Grid 的 `minmax(0, 1fr)` 同源，原理都指向「内容固有宽度参与最小尺寸计算」。

错误二：用 margin 做间距，最后一项多出一截。`.item + .item { margin-left: 20px }` 在换行后行首也会顶出 20px。修复：删掉 margin，容器一条 `gap: 20px`，行尾差、行首差全部消失。

错误三：flex 简写记错顺序。`flex: 200px` 这种单值写法会被解释为 basis 而不是 grow——无单位数字是 grow，带单位才是 basis。拿不准就写全 `flex: 0 0 200px`。

错误四：父容器没设 `display: flex`，子元素的 `flex: 1` 全部无效。`flex` 系列属性只在弹性容器里生效，排错第一步永远是 F12 看父元素的 `display`。

错误五：把 `order` 当万能重排器。`order` 只改视觉顺序，Tab 聚焦与屏幕阅读器仍按 DOM 顺序走，交互控件乱用会做出「看着在左、键盘先到右边」的可访问性事故。

## 7. 实际场景

- 导航条、工具栏、按钮组、表单一行：Flex 是唯一正确答案，代码最少；
- 弹窗与卡片的内容居中：第 4 节第一个模式；
- 内容驱动的流（聊天消息、标签组）：`flex: auto` 让内容决定宽度；
- 卡片墙：`flex: 1 1 280px` 能做，但要「空轨道塌缩、严格对齐」时换 Grid 的 `repeat(auto-fit, minmax(280px, 1fr))`，对比见 [响应式设计](/css/370-ResponsiveDesign)；
- FANDEX 网页端前端实验室有 Flex 与 Grid 的并排对照实验，拖动分隔条能直接看到两者对同一组卡片的分配差异，建议动手玩一遍再回来做练习。

## 8. 小练习

预测题（5 分钟）：容器 900px、`gap: 20px`，三个子元素依次是 `flex: 1`、`flex: 0 0 200px`、`flex: 2`。先写下三个项目的最终宽度再验证。

答案（写完再对照）：可用空间 900 - 40 = 860px；固定项占 200px，剩 660px 按 1 : 2 分，三项依次 220、200、440。

修改题（8 分钟）：把第 2 节导航改成「logo 居左，菜单紧跟其后，右侧一个登录按钮」，用 `margin-left: auto` 推按钮到最右——这是 space-between 之外更灵活的「一组贴左一组贴右」方案。

修 Bug 题（10 分钟）：下面代码想实现左侧 240px 侧栏加自适应正文，症状是「窗口缩窄时正文没缩，页面出现横向滚动条，图片把布局撑开」。定位并修复：

```css
.layout {
  display: flex;
}
.sidebar {
  flex: 0 0 240px;
}
.main {
  flex: 1;
}
.main img {
  max-width: 100%;
}
```

（答案方向：正文里若有 `white-space: nowrap` 的长文本或表格等固有宽度内容，`flex: 1` 项目受 `min-width: auto` 保护拒绝收缩；补 `min-width: 0`。`max-width: 100%` 只管图片不管文本。）

挑战题（半小时，不看正文独立完成）：做一条「播放器控制栏」：封面缩略图 64px 固定，中间歌名与进度条自适应（歌名过长省略号截断），右侧三个按钮不缩放。验收：窗口 1200px 缩到 360px 无溢出、按钮不被压扁、歌名始终单行省略；至少一条注释解释 min-width: 0 的去处。

## 9. 与之前和之后的知识的关系

- 之前：[CSS3 盒模型详解](/css/050-CSS3BoxModelDetailed) 决定了每个项目的「入场尺寸」，basis 的 auto 就读它；[定位详解](/css/220-PositionDetailed) 的居中方案与 Flex 居中是两代技术；
- 并行：[CSS3 Grid 网格布局](/css/250-CSS3GridGridLayout) 与其分工见第 4 节；[媒体查询](/css/360-MediaQuery) 负责换方向、换断点这类环境级调整，`gap: clamp()` 还能做流式间距；
- 之后：[响应式设计](/css/370-ResponsiveDesign) 把 Flex 组合进整页方案；FANDEX 网页端的「设计令牌双主题」演示里，导航与卡片流就是用本文的模式搭的，切主题时布局纹丝不动。

## 10. 官方文档

- MDN「Flexbox 的基本概念」：https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_flexible_box_layout/Basic_concepts_of_flexbox
- MDN flex 简写参考：https://developer.mozilla.org/zh-CN/docs/Web/CSS/flex
- web.dev「Flexbox 完全指南」：https://web.dev/learn/css/flexbox

## 11. 自我检查

- 能展开 `flex: 1`、`flex: auto`、`flex: none` 并说出三者的适用场景；
- 给定容器宽度、gap 与各项目 grow/basis，能手算每个项目的最终宽度；
- 「项目被内容撑爆」时第一反应是查 `min-width: auto`，「挤不下」第一反应是查 `flex-wrap`；
- 拿到一个布局截图，能说出哪部分归 Flex、哪部分该交给 Grid。

## 本章总结

Flex 是一维布局：容器 `display: flex` 接管排列与分配，先定 `flex-direction` 画主轴，再按轴选 `justify-content`（主轴）与 `align-items`（侧轴）。项目三兄弟 basis 定起点、grow 分剩菜、shrink 抢收缩，`flex: 1` 是「零起点等分」，`flex: auto` 让内容参与计算，`flex: none` 钉死尺寸。间距交给 `gap`，换行交给 `flex-wrap`，溢出先查 `min-width: auto` 配 `min-width: 0`。一维找 Flex、二维找 Grid，两者嵌套混用才是真实项目的常态。

## 下一步

进入 [CSS3 Grid 网格布局](/css/250-CSS3GridGridLayout)：一行排好了，接下来画整张格子网——轨道、区域、命名网格线与 subgrid，把「页眉加多栏加页脚」的整页骨架一次定义完。
