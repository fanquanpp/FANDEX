---
order: 220
title: 传统布局技术
module: 'css'
category: 前端技术
difficulty: intermediate
description: 读懂并迁移传统布局：float 与高度塌陷的四种修法、position 五种参照系、BFC 的规则与应用、圣杯/双飞翼布局原理，以及每一项在 Flex/Grid 时代的现代等价写法。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'css/050-CSS3BoxModelDetailed'
  - 'css/200-FloatClear'
  - 'css/220-PositionDetailed'
  - 'css/230-StackingContext'
  - 'css/240-CSS3FlexboxFlexLayout'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
---

## 前置知识

- [CSS3 概述与基本语法](/css/020-CSS3OverviewBasicSyntax)
- [盒模型](/css/050-CSS3BoxModelDetailed)：本文反复用到宽度、margin 与文档流概念。

> 篇幅定位：圣杯/双飞翼布局是进阶内容，零基础第一遍可只读第 1、2 节，第 4 节等接触老项目时再回来。

## 0. 场景切入：接手一个 2015 年的老项目

你被拉去维护一个老官网：三栏排版靠 `float`，弹窗靠 `position: absolute`，中间还有一行注释写着 `overflow: hidden 是为了清浮动，别删！`。同时你的新任务是把它慢慢迁到 Flex/Grid——迁错了哪根柱子就塌。

传统布局技术就是这把"考古刷子"。学它的目的不是在新项目里用 float 拼页面（Flex/Grid 早已全面取代），而是三件事：

1. **读懂老代码**：知道 `margin-left: -100%` 这种咒语在干什么；
2. **用好定位**：`position` 系列不属于"历史"，吸顶、弹窗、角标今天仍然全靠它；
3. **理解 BFC**：它解释了 margin 折叠、高度塌陷这一批"玄学"现象，Flex/Grid 时代依然会撞上。

## 1. 动手：一张能看到全部行为的实验页

新建 `legacy-lab.html`，整份复制运行。它包含浮动环绕、高度塌陷与四种修法：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>传统布局实验页</title>
  <style>
    .demo { border: 2px solid #39C5BB; padding: 8px; margin-bottom: 16px; }
    .box { width: 100px; height: 100px; margin-right: 8px;
           background: #ffd9e3; text-align: center; line-height: 100px; }

    /* 实验一：浮动环绕 */
    .float-left { float: left; }
    .ring-text { color: #555; }

    /* 实验二：塌陷现场（故意不修） */
    .collapsed { border-color: #e05d5d; }

    /* 实验三：修法——flow-root（现代推荐） */
    .flow-rooted { display: flow-root; }
  </style>
</head>
<body>
  <h3>实验一：文字环绕（float 的本职工作）</h3>
  <div class="demo">
    <div class="box float-left">图</div>
    <p class="ring-text">这段文字会环绕在方块右侧。float 诞生的唯一动机就是这种
    报纸式图文混排，今天它仍然是唯一的 CSS 原生环绕方案——这也是它没被彻底淘汰的原因。</p>
  </div>

  <h3>实验二：高度塌陷（子元素全浮动，父容器高度归零）</h3>
  <div class="demo collapsed">
    <div class="box float-left">A</div>
    <div class="box float-left">B</div>
  </div>
  <p>注意红色边框塌成了一条线：浮动元素不参与父容器的高度计算。</p>

  <h3>实验三：一行修复</h3>
  <div class="demo flow-rooted">
    <div class="box float-left">A</div>
    <div class="box float-left">B</div>
  </div>

  <h3>实验四：吸顶标题（position: sticky，传统与现代通用）</h3>
  <div class="demo" style="height: 160px; overflow: auto;">
    <p>滚动这个区域。</p>
    <p style="position: sticky; top: 0; background: #39C5BB; color: #fff; padding: 6px;">
      我会粘在容器顶部
    </p>
    <p>内容 1</p><p>内容 2</p><p>内容 3</p><p>内容 4</p><p>内容 5</p>
  </div>
</body>
</html>
```

动手清单：

1. 观察实验一的文字环绕，这是 float 依然不可替代的场景；
2. 对比实验二与实验三的边框高度，理解"塌陷"和"修复"各是什么；
3. 把实验三的 `display: flow-root` 依次换成 `overflow: hidden`、伪元素 clearfix（见第 2 节），三种修法效果相同但代价不同；
4. 滚动实验四，sticky 是本文唯一直接推荐写进新项目的传统定位成员。

## 2. 讲为什么（一）：浮动、塌陷与四代修法

### 2.1 float 的规则

`float: left | right` 让元素脱离正常文档流的"块排列"，向指定方向靠到容器边缘或兄弟浮动元素旁，行内内容（文字）环绕它。两条必须背下来的推论：

- **浮动元素不参与父容器高度计算**——全员浮动时父容器高度塌成 0（实验二）；
- **`clear` 是给"想躲开浮动的块"用的**：`clear: left | right | both` 声明"我的顶部左侧/右侧/两侧不允许出现浮动元素"，效果是把自己挪到浮动元素下方。

### 2.2 高度塌陷的修法演进

| 方案 | 写法 | 评价 |
| --- | --- | --- |
| 额外空标签 | `<div style="clear:both"></div>` | 污染结构，已淘汰，但老项目里大量存在，见到要认得 |
| `overflow: hidden` | 父容器 `overflow: hidden` | 有效，但会裁剪溢出内容（下拉菜单、阴影会被切） |
| 伪元素 clearfix | `.clearfix::after { content: ""; display: block; clear: both; }` | 2010 年代的事实标准，老项目必见；旧写法里的 `*zoom: 1` 是 IE6/7 hack，现代代码直接删 |
| `display: flow-root` | 父容器 `display: flow-root` | 现代标准答案：专为"创建 BFC 包含浮动"设计，无副作用。所有主流浏览器已支持多年 |

新代码一律 `flow-root`；前三种的唯一价值是让你读得懂历史代码。float 属性本身、图文环绕与塌陷原理的更细拆解见 `css/200-FloatClear`。

## 3. 讲为什么（二）：position 的五种参照系

`position` 决定"元素以什么为基准摆放"，五种值本质是五种参照系：

| 值 | 参照系 | 脱离文档流 | 典型用途 |
| --- | --- | --- | --- |
| `static` | 无（默认） | 否 | 一切定位的起点；`top/left` 对它无效 |
| `relative` | 自己原来的位置 | 否（原位占坑） | 微调元素；**给 absolute 子元素当锚点** |
| `absolute` | 最近的非 static 祖先（没有则相对初始包含块） | 是 | 弹窗、角标、下拉菜单 |
| `fixed` | 视口 | 是 | 固定导航、回到顶部按钮 |
| `sticky` | 滚动容器内的阈值 | 否 | 吸顶导航、表头、章节标题 |

```css
/* absolute 经典搭配：父 relative 打锚，子 absolute 定位 */
.card { position: relative; }
.card .close {
  position: absolute;
  top: 8px; right: 8px;
}

/* fixed：始终钉在视口右下角 */
.back-to-top { position: fixed; bottom: 30px; right: 30px; }

/* sticky：滚到 top:0 时粘住，被父容器边界"推走"后失效 */
.section-title { position: sticky; top: 0; }
```

三个高频坑，记下来能省大量调试时间：

1. **absolute 找不到锚点会满页跑**：忘了给父元素 `position: relative`，元素就相对整个页面定位；
2. **transform/filer/perspective 会劫持 fixed**：祖先链上任何一个元素设置了这些属性，`fixed` 子元素的参照系就从视口变成那个祖先——"我写的是 fixed 怎么跟着滚了"的元凶；
3. **sticky 的两个失效条件**：必须写至少一个 `top/bottom/left/right`；父容器或任何滚动祖先设了 `overflow: hidden/auto/scroll` 也会失效（`overflow: clip` 不算，这是它近年流行的原因之一）。

`z-index` 只对非 static 定位元素生效，且受层叠上下文约束（`opacity < 1`、`transform`、`filter` 等都会创建上下文，子元素 z-index 再大也跳不出父级）——完整机制见 `css/230-StackingContext`。

## 4. 讲为什么（三）：BFC，传统布局的"隔离舱"

BFC（Block Formatting Context，块格式化上下文）是一块独立渲染区域：内部布局不影响外部。它的五条规则里最有用的三条：

1. BFC 的高度计算**包含浮动子元素**（所以能修塌陷）；
2. BFC 区域**不与浮动元素重叠**（所以能做自适应两栏）；
3. 属于不同 BFC 的相邻块**不会发生 margin 折叠**（所以能阻止外边距合并，详见 `css/060-MarginCollapse`）。

触发 BFC 的常用属性：

| 属性 | 触发值 |
| --- | --- |
| `display` | `flow-root`、`flex`、`grid`、`inline-block`、`table-cell` 等 |
| `overflow` | `hidden`、`auto`、`scroll`（非 `visible`） |
| `position` | `absolute`、`fixed` |
| `float` | 非 `none` |

三个经典应用，全部对应实验页里能亲眼验证的行为：

```css
/* 应用一：包含浮动（修塌陷） */
.wrapper { display: flow-root; }

/* 应用二：阻止 margin 折叠——把其中一个块包进 BFC */
.wrap { display: flow-root; }   /* 内部块的 margin 不再与外部折叠 */

/* 应用三：左固定右自适应——右栏触发 BFC 后不与浮动的左栏重叠 */
.left  { float: left; width: 200px; }
.right { overflow: hidden; }    /* 或 display: flow-root */
```

应用三是"自适应两栏"的传统写法，原理巧但可读性差；同样的需求今天写 `display: flex` 一行完成。BFC 的价值在于**解释现象**：margin 为什么合并了、高度为什么塌了、文字为什么绕开浮动了——知道有"隔离舱"这回事，这些现象就不再是玄学。

## 5. 进阶：圣杯与双飞翼，浮动时代的巅峰手艺

三栏布局（左右定宽、中间自适应、**中间栏 DOM 靠前以优先渲染**）在只有 float 的年代是硬仗，两个经典解法值得当智力体操读懂。下面的版本已经去掉老 IE hack，可直接运行。

### 5.1 圣杯布局

```html
<div class="holy-grail">
  <div class="center">Center 主内容，DOM 第一</div>
  <div class="left">Left 150px</div>
  <div class="right">Right 200px</div>
</div>
```

```css
.holy-grail {
  display: flow-root;            /* 顺手解决塌陷 */
  padding: 0 200px 0 150px;      /* 给两翼预留空间 */
  min-width: 400px;
}
.holy-grail .center {
  float: left; width: 100%; min-height: 200px; background: #eef3f6;
}
.holy-grail .left {
  float: left; width: 150px; min-height: 200px; background: #ffd9e3;
  margin-left: -100%;            /* 关键咒语一：整行上移，回到最左 */
  position: relative; left: -150px;  /* 再相对自身挪进 padding 区 */
}
.holy-grail .right {
  float: left; width: 200px; min-height: 200px; background: #d9f2ee;
  margin-left: -200px;           /* 关键咒语二：拉回中栏右缘 */
  position: relative; right: -200px;
}
```

读法：三栏全部浮动排成一行，中栏 `width: 100%` 占满整行；两个负 `margin` 把左右栏"提行"搬到中栏两侧，最后用 `relative` 微调推进父容器 padding 让出的空间里。

### 5.2 双飞翼布局

同样的目标，换一种留空间方式——不动父容器 padding，而是**给中栏多包一层**，用内层 margin 腾地方：

```html
<div class="double-wing">
  <div class="center-wrap">
    <div class="center">Center 主内容</div>
  </div>
  <div class="left">Left 150px</div>
  <div class="right">Right 200px</div>
</div>
```

```css
.double-wing { display: flow-root; min-width: 400px; }
.double-wing .center-wrap { float: left; width: 100%; }
.double-wing .center {
  margin: 0 200px 0 150px;       /* 空间留在自己身上 */
  min-height: 200px; background: #eef3f6;
}
.double-wing .left {
  float: left; width: 150px; min-height: 200px; background: #ffd9e3;
  margin-left: -100%;
}
.double-wing .right {
  float: left; width: 200px; min-height: 200px; background: #d9f2ee;
  margin-left: -200px;
}
```

两者对比：

| 对比项 | 圣杯 | 双飞翼 |
| --- | --- | --- |
| 留空间方式 | 父容器 padding + 左右栏 relative 微调 | 中栏内层 margin |
| DOM 结构 | 三栏同级 | 中栏多包一层 |
| 是否需要 relative | 需要 | 不需要 |
| 抗挤压 | 窄窗口时左右栏可能被挤错位 | 中栏内容区收窄，结构更稳 |

另有等高列的传统 hack 一并收入：`padding-bottom: 9999px; margin-bottom: -9999px` 配合父容器 `overflow: hidden`，靠"把背景撑到无限深再裁掉"伪装等高。

```css
.equal-height { overflow: hidden; }
.equal-height .col {
  float: left; width: 33.33%;
  padding-bottom: 9999px; margin-bottom: -9999px;
}
```

### 5.3 迁移对照：同需求在现代 CSS 里怎么写

读老代码是必须，写老代码是自找。同一批需求 2026 年的写法：

| 需求 | 传统写法 | 现代写法 |
| --- | --- | --- |
| 三栏（中自适应） | 圣杯/双飞翼（约 20 行） | `display: grid; grid-template-columns: 150px 1fr 200px;` 一行 |
| 左固定右自适应 | float + BFC | `display: flex;`（右栏 `flex: 1`） |
| 等高多列 | padding/margin ±9999px | flex/grid **天然等高**，什么都不用做 |
| 水平垂直居中 | absolute + translate（仍可用） | `display: grid; place-items: center;` |
| 图文环绕 | `float` + flow-root | 仍然是 float——唯一没有现代替代的场景 |

居中方案的传统全家族（table-cell、负 margin、absolute + margin:auto）在面试和考古中还常出现，新项目一律 `place-items: center`；absolute + `translate(-50%, -50%)` 在"浮层居中"里依然常见、依然正确，可以继续用。

## 6. 坑点自检

| 现象 | 原因 | 修法 |
| --- | --- | --- |
| 父容器高度为 0 | 子元素全浮动 | `display: flow-root`（新代码）或认识 clearfix（旧代码） |
| 溢出内容被切掉 | 用 `overflow: hidden` 清浮动 | 换 `flow-root`；或确认确实要裁剪 |
| absolute 元素满页乱跑 | 祖先没有定位锚点 | 父元素加 `position: relative` |
| fixed 元素跟着滚动 | 祖先有 `transform/filter/perspective` | 去掉祖先的属性，或把浮层挪出该子树 |
| sticky 不粘 | 少写 top/bottom 或祖先 `overflow` 非 visible | 补阈值；用 `overflow: clip` 替代 hidden |
| z-index 调不动 | 父级创建了层叠上下文 | 查 `opacity/transform/filter`，见 `css/230-StackingContext` |
| 两个块的间距不是 50px | 相邻 margin 折叠取大者 | 包 BFC 或改用单侧 margin，见 `css/060-MarginCollapse` |
| 窗口一窄三栏就崩 | 圣杯布局天然抗挤压弱 | 新代码直接 Grid |

## 7. 练习

1. （必做）完成第 1 节实验页的全部四个实验，并把实验三的修法逐个替换验证；
2. （必做）复刻第 5 节圣杯与双飞翼布局各一遍，然后把窗口拉窄，观察两者谁先崩、怎么崩；
3. （必做）用 `position: sticky` 做一个"章节吸顶标题"：滚动时当前章标题钉在顶部，被下一章推出（参考实验四的容器写法）；
4. （选做）把圣杯布局改写为 Grid 版本，对比代码行数与窄窗口行为；
5. （选做）考古题：找任意一个开源老项目的 CSS，找出它清浮动用的方案（额外标签/overflow/clearfix 中的哪种），并说明换成 `flow-root` 是否安全。

## 8. 下一步

- 浮动的完整原理（视觉格式化模型视角）：`css/200-FloatClear`；
- 定位与层叠的深水区：`css/220-PositionDetailed`、`css/230-StackingContext`；
- 现代布局的正主：`css/240-CSS3FlexboxFlexLayout`、`css/250-CSS3GridGridLayout`；
- margin 折叠专题：`css/060-MarginCollapse`。
