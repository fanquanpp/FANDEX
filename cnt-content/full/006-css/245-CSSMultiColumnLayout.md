---
order: 260
title: 多栏布局（Multi-column Layout）
module: 'css'
category: 前端技术
difficulty: beginner
description: 报纸式正文分栏：column-count/column-width/column-gap/column-rule/column-span/break-inside 的完整用法，与 Grid auto-fill 的选型对照，附文章分栏/设置面板/卡片列表三场景与练习
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---


## 知识点地图

- **知识类别**：CSS 多栏布局（CSS Multi-column Layout Module）。Flex 管
  「一维排项目」、Grid 管「显式网格」，多栏管的是第四种东西——
  **内容流自动分栏**（内容像水一样流进一列列栏）。
- **解决什么问题**：长文本在大屏上一行太长（每行 100+ 字符阅读体验差），
  需要自动分成报纸式多栏；一列设置项/卡片希望按列均匀填充。
- **什么时候用到**：文章页排版、打印样式（多栏打印是报纸排版传统）、
  设置面板、词典/条款这类「短条目密集」的内容。UI 结构性布局
  （导航+主区+侧栏）**不**用它，那是 Grid/Flex 的地盘。

## 真实场景：文档站正文的阅读宽度问题

FANDEX 这类文档站的正文区在宽屏上有一个经典缺陷：内容区占满
1400px 后一行 90+ 字符，视线回扫下一行行首时容易串行。印刷排版
的经验法则是每行 45-75 字符最舒适。三种修法：

1. `max-width` 限宽 + 居中（最常见，单栏长流）；
2. 限宽不够时——正文极长的条款页/词汇表页——用多栏把内容分成
   2-3 栏，屏幕利用率与阅读节奏兼得；
3. 卡片式内容用 Grid `auto-fill`（结构性网格，见第 5 节的选型对照）。

方案 2 就是本篇主角。文档站词汇表页把 300 个术语词条按 `columns`
分三栏，词条自动流进下一栏，不需要手工分配——这是多栏与 Grid
的本质区别：**Grid 放格子，多栏放内容流**。

## 1. 两个入口属性：栏数与栏宽

多栏布局的入口只有两个属性，且互斥（写一个另一个作参考值）：

```css
/* 方式一：固定栏数 */
.article {
  column-count: 3;        /* 3 栏，每栏宽度 = (容器 - 间隙) / 3 */
}

/* 方式二：理想栏宽，栏数自动 */
.article {
  column-width: 300px;    /* 期望栏宽 300px，实际栏数随容器宽度自适应 */
}

/* 简写：columns */
.article {
  columns: 3;             /* = column-count: 3 */
  columns: 300px;         /* = column-width: 300px */
  columns: 3 300px;       /* 两个都写时 count 是上限、width 是下限 */
}
```

**逐行讲解**：`column-width` 不是精确值——浏览器用它算「能放下几栏」，
实际栏宽 = (容器宽 - 间隙) / 栏数，只会比 300px **更宽不会更窄**。
**换成别的写法会发生什么**：用 `column-count: 3` 写死，窄屏上每栏
只剩 100px，一行挤 3 个汉字——所以响应式场景几乎总用 `column-width`
或 `columns` 简写，把「几栏」的决策交给浏览器；写死 `column-count`
只用于打印样式这类容器宽度可预期的场合。

`columns: 3 300px` 组合的语义：至少 300px 宽、至多 3 栏——容器
1200px 时 3 栏各 384px；缩到 700px 时只放 2 栏各 340px；再缩到
500px 时 1 栏。**这是移动优先排版的最省写法**。

## 2. 栏的装饰与控制

```css
.article {
  columns: 300px;
  column-gap: 2rem;                  /* 栏间隙 */
  column-rule: 1px solid #ddd;       /* 栏间分隔线，语法同 border */
  column-fill: balance;              /* balance：各栏高度均衡（默认，块级内） */
}
.article h1 {
  column-span: all;                  /* 标题横跨全部栏 */
}
.article figure {
  break-inside: avoid;               /* 图文块不跨栏拆开 */
}
```

- `column-rule` 与 border 完全同构（width/style/color 三段），画在
  栏间隙正中，不占额外空间（画在 gap 里）；
- `column-span: all` 只有 `none` 与 `all` 两值——「跨全部栏」的
  元素会把它上下的内容切成两组多栏流。**易错点**：span 元素前后的
  内容是**两个独立的多栏容器**，栏的平衡各自计算，内容分布会
  重新洗牌；
- `break-inside: avoid` 防止一块内容（图、代码块、卡片）被从中间
  拆到两栏。姊妹属性 `break-before/after: column` 强制从新栏开始——
  词典类排版按字母分组换栏就靠它；
- `column-fill: balance`（默认）让各栏高度尽量相等；`auto` 则按顺序
  填满一栏再下一栏——**多栏容器有固定高度时**两者差异才显现，
  auto 会把最后一栏留成半空。

## 3. 三个场景实例

### 3.1 场景一：文章正文分栏（内容流场景）

```css
.longform {
  columns: 2 40ch;      /* 至少 40 字符宽、至多 2 栏 */
  column-gap: 3rem;
  column-rule: 1px dotted #ccc;
  text-align: justify;
  hyphens: auto;        /* 英文连字符断词，配合窄栏 */
  line-height: 1.7;
}
.longform .pull-quote {
  break-inside: avoid;
  background: #f7f7f7;
  padding: 1rem;
}
```

**为什么 `40ch` 而不是 `300px`**：`ch` 单位是「0 字符的宽度」，
直接对齐「每行 45-75 字符」的排版经验——40ch 的栏宽保证单行
永远在舒适区，与字号无关（字号变大栏宽同步变大）。
**易错点**：多栏里 `text-align: justify` 配窄栏会产生大段空隙
（一行只 3-4 个词时 justify 强行拉开），英文必须配 `hyphens: auto`，
中文无断词概念但 justify 也会拉伸字距，窄于 15ch 的栏应放弃 justify。

### 3.2 场景二：设置面板（固定条目流）

设置页的一列开关项很长，用多栏填满可用高度：

```css
.settings {
  columns: 240px;
  column-gap: 2.5rem;
  height: 70vh;           /* 固定高度时 column-fill 才有意义 */
  column-fill: auto;      /* 从左往右填满，顺序阅读 */
}
.setting-item {
  break-inside: avoid;    /* 一项设置（标签+开关）不拆开 */
  padding: .5rem 0;
}
```

选 `column-fill: auto` 的理由：设置项有业务顺序（账号 -> 通知 ->
隐私），balance 会把顺序打散成「之」字形阅读（读 完第一栏半截
跳第二栏）——**内容有顺序用 auto，内容无顺序（词典）用 balance**。

### 3.3 场景三：卡片列表（多栏 vs Grid 的分界线）

```css
/* 多栏版：高度优先填充 */
.card-list {
  columns: 250px;
  column-gap: 1rem;
}
.card { break-inside: avoid; margin-bottom: 1rem; }

/* Grid 版：行优先填充（对照） */
.card-list-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}
```

两者在「响应式卡片墙」上看似等价，实际行为不同：
**多栏是按列填充**（第 1 栏从上到下满再到第 2 栏），卡片高度
不一时各栏底部参差（瀑布流效果，类似 Pinterest）；**Grid auto-fill
按行填充**，同一行内的卡片等高拉伸（1fr 行为），排列顺序是
「之」字。内容有阅读顺序选 Grid，瀑布流观感选多栏。

## 4. 与其他布局的协作和嵌套

- 多栏容器内部的子元素可以用任何 display；但**多栏容器本身不是
  BFC 之外的新上下文**——多栏容器是独立的格式化上下文（见 065
  的触发条件表：column-count 非 auto 即触发 BFC）；
- 嵌套：多栏里放 Flex 卡片很常见（`break-inside: avoid` 的卡片内部
  是 flex 排版）；多栏套多栏合法但可读性差，慎用；
- 与 440-ScrollSnap 的横向滚动轨道是两个方向：Snap 管「横着滚的
  一行卡片」，多栏管「竖着的分栏文本流」——不要用多栏模拟横向
  滚动（栏数受容器宽度控制，做不到溢出滚动）。

## 5. 选型对照：多栏 / Grid / Flex

| 需求特征 | 用谁 | 一句话理由 |
| --- | --- | --- |
| 长文本自动分栏、栏高均衡 | 多栏 | 唯一能「内容流式分栏」的机制 |
| 词典/条款/设置项的密集条目 | 多栏 | break-inside 控制粒度 + 顺序填充 |
| 卡片墙、结构对齐、行列规则 | Grid auto-fill | 行优先、等高控制 |
| 一维排布（导航、按钮组） | Flex | 天然主轴模型 |
| 需要精确指定某元素位置 | Grid | line-based 定位 |

**判断口诀：内容在「流」，用多栏；元素在「格」，用 Grid；元素在
「队」，用 Flex。** 三者不是竞争关系，一页内并用完全正常。

## 常见陷阱与调试

- **坑 1：子元素高度把栏撑爆。** 多栏内高个子内容（一张 2000px 的图）
  会独占一栏还溢出，配 `max-height` + `break-inside: avoid` 收住。
- **坑 2：`column-span: all` 前后的栏各自平衡。** 视觉上「标题下面
  突然从第 1 栏重新开始」是规范行为不是 bug；要标题真正居顶，
  把标题移出多栏容器。
- **坑 3：打印样式忘了加。** 屏幕单栏、打印双栏是高频组合——
  `@media print { .article { columns: 2; } }`（打印场景容器宽度
  可预期，写死 column-count 合理，联动 360-MediaQuery）。
- **坑 4：老 WebView 的 column-span 缺失。** span 失效时布局仍成立
  （只是不跨栏），属于渐进增强；不要把关键结构依赖在 span 上。
- **坑 5：负 margin 想造「贴边栏」。** 多栏的间隙由 column-gap 管理，
  负 margin 在多栏内行为不可预期——装饰用 column-rule 与背景色。

## 动手实践

**任务**：把一篇长文（可用 FANDEX 任一文档页内容）在多栏 / Grid /
Flex 三种实现之间切换，总结取舍——这是理解三种布局边界的最快路径。

1. 多栏版：`columns: 2 40ch` + `column-rule` + 段落 `break-inside: avoid`；
2. Grid 版：`grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))`，
   把段落当卡片塞进去；
3. Flex 版：两列 flex 容器，手动把段落对半分配；
4. 缩放窗口从 1400px 到 500px，记录三个版本分别发生什么；
5. 回答：哪个版本在窄屏退化得最体面？为什么？

**提示**：第 3 步手动分配是刻意的——体会「Flex 没有内容流」意味着
什么；第 4 步重点观察多栏版的 `columns: 2 40ch` 何时变成单栏；
第 5 步的答案要点：多栏按宽度自动降栏数，Grid 降列数，Flex 版
两列不会降（需要媒体查询手动干预）。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: system-ui; max-width: 1100px; margin: 2rem auto; }
    h2 { margin-top: 2.5rem; }
    /* 版本 1：多栏 */
    .mc { columns: 2 40ch; column-gap: 3rem; column-rule: 1px dotted #bbb; }
    .mc p { break-inside: avoid; line-height: 1.75; text-align: justify; }
    /* 版本 2：Grid */
    .gd { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
    .gd p { margin: 0; padding: 1rem; background: #f6f6f6; break-inside: avoid; }
    /* 版本 3：Flex（手动分配） */
    .fx { display: flex; gap: 1rem; }
    .fx > div { flex: 1; }
    @media (max-width: 600px) { .fx { flex-direction: column; } }
  </style>
</head>
<body>
  <h2>多栏：内容自动流动</h2>
  <div class="mc">
    <p>第一段。多栏布局里段落像水流进容器……（放足 6 段观察分栏）</p>
    <p>第二段。栏宽低于 40ch 时自动降为单栏。</p>
  </div>
  <h2>Grid：段落变成等宽卡片</h2>
  <div class="gd">
    <p>第一段。auto-fill 按宽度决定列数……</p>
    <p>第二段。行优先排列，段落顺序是「之」字。</p>
  </div>
  <h2>Flex：必须手动分配内容</h2>
  <div class="fx">
    <div><p>左列第 1 段。</p><p>左列第 2 段。</p></div>
    <div><p>右列第 1 段。</p><p>右列第 2 段。</p></div>
  </div>
</body>
</html>
```

**逐段讲解**：`.mc` 的两个入口值直接决定降级行为（40ch 保证单行
舒适区）；`.gd p` 的背景色把「Grid 眼里段落是格子」可视化——
它不再有段落流，只有等宽项；`.fx` 的左右两栏是**手工写死**的内容
分配，窗口缩窄时 flex-direction 换列但内容分配不变（第 2 段永远在
左列）——这就是第 5 步问题的答案：**Flex 版退化最不体面，因为
内容分布是手动的，响应式要靠额外语义（媒体查询）救场；多栏版的
降级是机制自带的**。三个版本放一页里来回对比，选型直觉就长出来。

</details>

## 参考与致谢

- MDN：CSS Multi-column Layout（https://developer.mozilla.org/docs/Web/CSS/CSS_multicol_layout ，CC-BY-SA 2.5）
- CSS Multi-column Layout Module Level 1 规范
  （https://drafts.csswg.org/css-multicol/ ，W3C 文档许可）
