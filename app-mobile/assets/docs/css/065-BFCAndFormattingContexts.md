---
order: 70
title: BFC 与格式化上下文
module: 'css'
category: 前端技术
difficulty: beginner
description: 从 BFC 到 IFC/FFC/GFC：display 值与格式化上下文的对应关系、触发条件速查、清浮动/防塌陷/自适应两栏的 BFC 视角解法——格式化上下文专篇
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---


## 知识点地图

- **知识类别**：视觉格式化模型中的「格式化上下文」家族——BFC（块级）、
  IFC（行内）、FFC（弹性）、GFC（网格）。050-CSS3BoxModelDetailed 讲
  盒子怎么算尺寸，本篇讲**盒子们被放进哪种规则里排版**。
- **解决什么问题**：浮动导致父元素塌陷、外边距互相穿透、两栏布局
  主栏被浮动文字环绕——这些「反直觉」现象的根因都是格式化上下文
  的边界规则。理解 BFC 后，解决方案从「背口诀」变成「推规则」。
- **什么时候用到**：清浮动、阻止塌陷穿透、自适应两栏、排查「为什么
  margin 没生效」、阅读 MDN 属性文档时理解 side effects
  （如 `overflow: hidden` 顺手创建了 BFC）。

## 真实场景：卡片列表图浮动导致底部文字环绕

电商卡片列表里，封面图 `float: left`，后面的标题与价格文字环绕图片
排列——这正是浮动的本职。但当最后一行只有一张卡片时，页脚文字突然
窜上来环绕卡片，整个列表底部乱掉。三个候选修法：

1. 给环绕的元素加 `clear: both`（逐个清理，累）；
2. 让页脚所在容器触发 BFC（一处修复，容器内部自成一块，浮动不再
   越界）；
3. 整个列表换成 Flex/Grid（釜底抽薪，见 240/250）。

方案 2 与方案 3 的取舍正是本篇主线：**BFC 是理解传统布局的钥匙，
Flex/Grid 是现代答案**——传统布局仍是存量代码的现实，读懂 BFC 才能
维护它们。

## 1. 心智模型：四种格式化上下文

格式化上下文（Formatting Context）决定「一块区域内的子元素按什么
规则排版」。CSS 的四大上下文与 display 值一一对应：

```text
display 值                    建立的上下文    子元素的排版规则
------------------------------------------------------------
block / list-item ...         BFC            块盒从上到下堆叠
inline / inline-block 等参与  IFC            行内盒水平排布，行盒折行
flex / inline-flex            FFC            弹性主轴/交叉轴布局
grid / inline-grid            GFC            网格轨道布局
```

**关键推论**：

- 每个块级容器默认只是「参与」BFC 的一个块盒；只有满足触发条件的
  元素才**创建**一个新的 BFC——新 BFC 内部自成规则，与外界隔离；
- `inline-block` 是「对外参与 IFC、对内建立 BFC」的双面盒——这解释了
  它为什么能挡住 margin 穿透（见第 3 节）；
- FFC/GFC 建立的上下文里，margin 塌陷**根本不会发生**（弹性/网格
  项目的 margin 永远不合并）——现代布局从机制上消灭了塌陷问题，
  这也是「换 Flex 就好了」的原理层答案。

### BFC 的边界规则（三条)

1. **内部的盒在垂直方向依次排列**，盒子间的垂直 margin 由 BFC 内的
   塌陷规则决定（相邻取最大）；
2. **BFC 区域不与浮动元素重叠**——同一 BFC 内的块盒会避让浮动
   （两栏布局的原理），而**新 BFC 整体**则不与外部浮动重叠；
3. **BFC 是隔离的独立容器**：内部元素不会影响外部，外部也不会
   影响内部——父元素高度计算（清浮动）、margin 穿透阻断都源于此。

## 2. 触发 BFC 的条件（速查）

| 条件 | 代码示例 | 备注 |
| --- | --- | --- |
| 浮动元素 | `float: left;` 或 `float: right;` | 非 none 即触发 |
| 绝对/固定定位 | `position: absolute;` 或 `position: fixed;` | 脱离文档流 |
| 行内块元素 | `display: inline-block;` | 对内 BFC、对外 IFC |
| 表格单元/标题 | `display: table-cell;` 等 | 旧时代清浮动常客 |
| 弹性容器 | `display: flex;` 或 `display: inline-flex;` | 建立 FFC，同时行为类似 BFC |
| 网格容器 | `display: grid;` 或 `display: inline-grid;` | 建立 GFC |
| overflow 非 visible | `overflow: hidden;` / `auto;` / `scroll;` | 最常用的「无副作用」触发器 |
| 多列容器 | `column-count` / `column-width` 非 auto | 列容器本身是 BFC |
| 根元素 | `<html>` | 整页的初始 BFC |

**选择建议**：清浮动场景首选 `display: flow-root`（专门的「创建 BFC」
值，无任何附带效果）；`overflow: hidden` 会在内容溢出时裁剪，
`float`/`position` 会改变布局流，都带副作用——
**为副作用选触发器，不是为触发器找理由**。

## 3. BFC 的三大经典应用

### 3.1 清浮动：父元素高度塌陷

父元素只含浮动子元素时高度为 0（浮动脱离常规流，父元素「看不见」
它们），后续内容与背景全部错位：

```html
<style>
  .parent {
    background-color: #f0f0f0;
    display: flow-root;   /* 创建 BFC：父元素把浮动子元素算进高度 */
  }
  .child {
    float: left;
    width: 100px;
    height: 100px;
    margin: 10px;
    background-color: #fff;
  }
</style>
<div class="parent">
  <div class="child">子元素 1</div>
  <div class="child">子元素 2</div>
  <div class="child">子元素 3</div>
</div>
```

原理是边界规则第 3 条：BFC 容器在计算高度时必须包含浮动子元素。
**换成别的写法会发生什么**：老代码里的 `overflow: hidden` 同样有效，
但卡片有下拉阴影/溢出菜单时会被裁剪；`::after { clear: both }` 的
 clearfix 是更老的方案，需要额外伪元素与背口诀——`flow-root` 语义
直白，2026 年的新代码没有理由用它俩。

### 3.2 阻止外边距穿透

父子元素的首个 margin 会穿透父元素（机制详解见 060-MarginCollapse），
BFC 从机制上隔断：

```html
<style>
  .container {
    display: flow-root;  /* 新 BFC：子元素的 margin 在容器内结算 */
  }
  .box {
    margin: 20px;
    padding: 20px;
    background-color: #f0f0f0;
  }
</style>
<div class="box">Box 1</div>
<div class="container">
  <div class="box">Box 2（container 是新 BFC）</div>
</div>
```

塌陷的规则是「同一个 BFC 内相邻块盒的 margin 合并」——container
建立了新 BFC，Box 1 与 Box 2 的 margin 分属两个上下文，不再合并。
机制本位的完整推演（为什么相邻会取最大、哪三种情形合并）在
[060-MarginCollapse](/css/060-MarginCollapse)；本篇提供的是
「用上下文边界拦住它」的工程手段。

### 3.3 自适应两栏布局

浮动侧栏 + BFC 主栏，是 Flex 出现之前的标准答案（存量代码高频）：

```html
<style>
  .container { width: 100%; }
  .sidebar {
    float: left;
    width: 200px;
    height: 300px;
    background-color: #f0f0f0;
  }
  .content {
    display: flow-root;  /* 触发 BFC：不与浮动重叠，自动让出侧栏宽度 */
    height: 300px;
    background-color: #e0e0e0;
  }
</style>
<div class="container">
  <div class="sidebar">侧边栏</div>
  <div class="content">主内容区</div>
</div>
```

原理是边界规则第 2 条：BFC 区域不与浮动元素重叠，主栏自动占据
侧栏右侧的全部剩余宽度，且**不需要写死 margin-left**——侧栏加宽，
主栏自动适应（对比写死 `margin-left: 210px` 的脆性方案）。
新项目请直接用 240 的 `flex: 1` 或 250 的 Grid 模板。

## 4. 与层叠上下文的辨析

BFC 与 230-StackingContext 的层叠上下文都叫「上下文」且都「隔离」，
但管的维度不同：

| 维度 | BFC | 层叠上下文 |
| --- | --- | --- |
| 管什么 | 布局流：盒怎么排、margin 怎么算 | 绘制顺序：谁盖住谁 |
| 触发 | overflow/flow-root/float/... | z-index + 定位、opacity < 1、transform 等 |
| 隔离什么 | 内外布局互不影响 | 内部 z-index 不与外部比较 |

两者可以同时触发（`position: absolute` 两样都建）。排查布局问题先想
BFC，排查遮挡问题先想层叠上下文——把两个「上下文」分开装，调试
效率立竿见影。

## 常见陷阱与调试

- **坑 1：`overflow: hidden` 清浮动后下拉菜单消失。** hidden 裁剪
  溢出内容，子菜单「溢出」被裁——换 `flow-root` 或 `overflow: clip`
  （只裁剪滚动溢出但同属 overflow 家族，行为略有差异，谨慎）。
- **坑 2：Flex 容器里找 BFC。** FFC 内不存在 margin 合并，行高与
  基线对齐规则也不同——在 Flex 里调 BFC 口诀全部失效，先确认自己
  在哪种上下文里。
- **坑 3：塌陷「消失」以为修好。** 给相邻元素各加一层 div 包裹，
  塌陷看似消失，实则是引入了新的父子结构（穿透视窗变化）——
  结构修复要能说出「为什么」，说不出就是碰运气。
- **坑 4：`display: flow-root` 与行内上下文混用。** flow-root 建立
  BFC 的同时元素自身仍是块级；想要「行内对外 + BFC 对内」组合
  是 inline-block（旧）或 `display: flow-root` 不存在行内变体时
  的取舍点。

## 动手实践

**任务**：用一份 HTML 复现三个经典 bug 并用 BFC 各修一次，把口诀
变成推演。

1. 塌陷高度：父元素只含两个浮动子元素，背景色验证父高度为 0；
   修复：`flow-root`；
2. margin 穿透：子元素 `margin-top: 60px` 把父元素整体推下 60px
   （用父元素上方空隙验证）；修复：`flow-root`；
3. 环绕清除：浮动图 + 页脚文字环绕；修复：页脚容器 `flow-root`；
4. 进阶对照：把三个修法分别换成 Flex 容器实现，观察塌陷与穿透
   「从未发生」——用一句话写下原因（提示：FFC 的 margin 规则）。

**提示**：每个实验都用背景色或边框让「不可见的边界」现形；
第 4 步的关键不是记住结论，是把「弹性项目 margin 不合并、容器
把浮动子元素算进高度」与 BFC 边界规则逐条对照。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <style>
    .demo { margin-bottom: 24px; }
    /* 实验 1：高度塌陷与修复 */
    .collapse-parent { background: #ffd; }
    .collapse-parent.fixed { display: flow-root; }
    .floater { float: left; width: 80px; height: 80px; margin: 8px; background: #fa0; }
    /* 实验 2：margin 穿透与修复 */
    .penetrate-parent { background: #dfd; }
    .penetrate-parent.fixed { display: flow-root; }
    .penetrate-child { margin-top: 60px; padding: 8px; background: #fff; }
    /* 实验 3：环绕与清除 */
    .float-img { float: left; width: 120px; height: 90px; margin: 8px; background: #9cf; }
    .footer { background: #eee; margin-top: 12px; }
    .footer.fixed { display: flow-root; }
  </style>
</head>
<body>
  <div class="demo">
    <div class="collapse-parent fixed">
      <div class="floater">A</div>
      <div class="floater">B</div>
    </div>
    <p>父元素有背景色高度：fixed 后包住浮动子元素</p>
  </div>
  <div class="demo">
    <div class="penetrate-parent fixed">
      <div class="penetrate-child">margin-top 60px 被拦在容器内</div>
    </div>
    <div class="penetrate-parent" style="margin-top:24px">
      <div class="penetrate-child">去掉 fixed：穿透把父元素一起推下去</div>
    </div>
  </div>
  <div class="demo">
    <div class="float-img">封面图</div>
    <p>环绕文字：排版围绕浮动图，页脚若无 BFC 会继续环绕。</p>
    <div class="footer fixed">页脚（fixed：自成 BFC，不再环绕）</div>
  </div>
</body>
</html>
```

**逐段讲解**：三个实验共用一个修法（`flow-root`）但对应三条不同的
边界规则——实验 1 是「BFC 计算高度包含浮动」，实验 2 是「margin
合并不跨 BFC 边界」，实验 3 是「BFC 区域不与外部浮动重叠」；第二组
对照容器刻意去掉 `.fixed`，让你在同一页面直接看到修复前后的差异；
进阶对照的答案是：FFC/GFC 的子项是 flex/grid item，规范规定其
margin 永不合并、容器高度天然包含所有子项（含浮动），所以换布局
模式等于换掉了一整套边界规则。

</details>

## 参考与致谢

- MDN：Formatting contexts 与 Block formatting context
  （https://developer.mozilla.org/docs/Web/CSS/CSS_flow_layout ，CC-BY-SA 2.5）
- CSS Display Module Level 3 规范（https://drafts.csswg.org/css-display/ ，W3C 文档许可）
- 原始素材：本仓库 050-CSS3BoxModelDetailed §4 全量搬移扩写
