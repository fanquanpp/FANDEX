---
order: 140
title: CSS3 选择器系统
module: 'css'
category: 前端技术
difficulty: beginner
description: "从「第三方组件不许改 HTML，样式还得准」出发，掌握基础五件套与属性选择器、组合器四兄弟（空格、>、+、~）的命中规则，理解为什么类选择器是工程首选而 ID 是优先级炸弹，为伪类与伪元素进阶打好地基。"
author: fanquanpp
updated: '2026-10-07'
related:
  - 'css/140-PseudoClassPseudoElement'
  - 'css/170-PriorityCalculation'
  - 'css/190-DebuggingCSS'
  - 'css/020-CSS3OverviewBasicSyntax'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
---

## 前置知识

- 已完成 [CSS3 概述与基本语法](/css/020-CSS3OverviewBasicSyntax)：知道一条规则由选择器加声明块组成即可；
- 本篇只讲「怎么选中」，选中之后的对齐与布局问题分属后续篇章。

## 学习目标

读完本文你将能够：

1. 默写基础五件套：`*`、`div`、`.card`、`#top`、`[type="text"]`，并说出各自适合的场景；
2. 熟练使用属性选择器的六种匹配符（`=`、`~=`、`^=`、`$=`、`*=`、`i` 修饰），不靠 JS 就能按属性精准命中；
3. 区分组合器四兄弟——后代（空格）、子代（`>`）、相邻兄弟（`+`）、通用兄弟（`~`），给一段 HTML 能口算每条选择器命中谁；
4. 解释工程里「多用 class、少用 ID」的两条理由（复用与优先级）；
5. 选择器「没选中」时，按拼写、结构、大小写三步排查。

预计 30 到 50 分钟，含 1 组动手实验与 4 道练习。

## 1. 问题引入：HTML 不许动，样式还得准

你接手一个嵌了第三方评论组件的页面：组件的 DOM 结构动不了（改了升级就失效），但设计师要求「置顶评论加金边、含图片的评论去掉内边距、作者链接标蓝」。这时候 `!important` 满天飞只会把优先级搞成灾难（见 [优先级计算](/css/170-PriorityCalculation)），唯一的正路是把选择器写准——**CSS 的威力上限，就是选择器的精准度**。本文把「选中」这件事一次练熟。

## 2. 最小示例：一段评论区的选择器实战

`index.html` 的 body：

```html
<section class="comments">
  <article class="comment" data-pinned="true">
    <a class="author" href="/user/1">阿珍</a>
    <p class="body">前排支持！</p>
  </article>
  <article class="comment">
    <a class="author" href="/user/2">阿强</a>
    <p class="body"><img src="cat.png" alt="猫" /> 看我猫</p>
  </article>
</section>
```

`styles.css`：

```css
.comments > .comment {      /* 子代：.comments 的直接孩子 */
  border-bottom: 1px solid #e2e8f0;
  padding: 16px;
}

.comment[data-pinned="true"] {  /* 属性精确匹配 */
  border: 2px solid #f59e0b;
}

.comment:has(img) {         /* 含图片的评论：去内边距（:has 详见伪类篇） */
  padding: 0;
}

.author[href^="/user/"] {   /* href 以 /user/ 开头的链接 */
  color: #2563eb;
  text-decoration: none;
}
```

预期效果：置顶评论有金色边框；第二条（含图片）内边距消失；两个作者链接都是蓝色。注意全程没有一个元素被要求加新类名——选择器读的是「结构与属性」，不是「约定好的名字」。

## 3. 核心概念

### 3.1 基础五件套

| 选择器 | 写法 | 命中谁 | 场景 |
| --- | --- | --- | --- |
| 通配符 | `*` | 所有元素 | 全局重置（配合 `*::before` 等更常见） |
| 标签 | `p` | 该标签全部元素 | 排版基线（p、h1-h6、ul） |
| 类 | `.card` | class 含该词的元素 | 工程主力，可复用可组合 |
| ID | `#top` | 该 id 的唯一元素 | 页面锚点、JS 取元素；样式慎用 |
| 属性 | `[type="text"]` | 具有该属性的元素 | 表单控件、data-* 状态 |

类可以叠着用：`.card.is-active` 命中「同时有两个类」的元素。这是状态管理的地基——`.is-active`、`.is-open` 这类状态类加上基础类组合，比 `.active-card` 这种新造类名干净得多。

### 3.2 属性选择器：六种匹配符

```css
[data-state="open"]     { }  /* 精确等于 */
[data-tags~="css"]      { }  /* 空格分隔词列表中「含该词」 */
[href^="https://"]      { }  /* 前缀匹配：外部 https 链接 */
[href$=".pdf"]          { }  /* 后缀匹配：PDF 链接加图标 */
[class*="card"]         { }  /* 子串匹配：慎用，易误伤 */
input[type="text" i]    { }  /* i 修饰：值不区分大小写 */
```

`^=`、`$=`、`*=` 是工程里最实用的三个：外链加图标、文件类型标记、按 data 属性驱动状态，都不需要 JS 介入。匹配值默认区分大小写，拿不准就加 ` i`。

### 3.3 组合器四兄弟：空格、>、+、~

假设结构是 `div.card > p` 且 p 后面还跟着 p：

```css
.card p      { }  /* 后代：.card 里面所有层级的 p */
.card > p    { }  /* 子代：只认直接孩子这一层 */
h2 + p       { }  /* 相邻兄弟：紧跟在 h2 后面的那一个 p */
h2 ~ p       { }  /* 通用兄弟：h2 之后同级的所有 p */
```

记忆锚点：**空格是「不管隔几代」，`>` 是「只认亲儿子」，`+` 是「紧挨着的下一个」，`~` 是「排在后面的全部兄弟」**。最容易混的是后代与子代——组件封装时优先用子代或直接类名，防止结构变化让「隔代命中」悄悄失效或误伤。

### 3.4 为什么工程首选 class、慎用 ID

- 复用：ID 天然唯一，一段样式没法用在第二个元素上；类随便叠；
- 优先级：ID 的优先级是 (0,1,0,0)，一条 `#sidebar .title` 就能压死任何类组合的规则，后期覆盖只能跟着上 ID 或 `!important`——这就是「优先级军备竞赛」的起点。类与类之间同权重，后者覆盖前者，规则可预测。

现代 CSS 架构（BEM、原子类、CSS Modules）全部建立在类选择器上，详见 [CSS 架构方法论](/css/560-CSSArchitectureMethodology)。

### 3.5 往上走一层：伪类、伪元素与优先级

本文的 `:has(img)` 已经用到了伪类——它们把「状态与位置」也纳入选中条件，是选择器系统的另一半，完整清单见 [伪类与伪元素](/css/140-PseudoClassPseudoElement)。多条规则抢同一个元素时谁赢，由优先级算法决定，见 [优先级计算](/css/170-PriorityCalculation)。选中结果不对时先打开 DevTools 的 Elements 面板：Ctrl+F 搜选择器字符串，立刻知道命中了几个元素。

## 4. 修改实验

对第 2 节动手，每步先预测再刷新：

1. 把 `.comments > .comment` 的 `>` 删掉变后代选择器，再往 section 里塞一个 `.comment` 嵌套结构：观察重复命中与双层边框——后代选择器的误伤面；
2. `[data-pinned="true"]` 改成 `[data-pinned]`：只要带该属性就命中，值是什么无所谓——布尔型 data 属性的惯用写法；
3. 新增 `.comment:hover { background: #f8fafc; }`：状态伪类零成本入门；
4. 把作者链接选择器改成 `.comments + .author`：一个都不命中——相邻兄弟找的是「同级」，作者链接在 article 里面，层级都不对。用 DevTools 的搜索验证命中数。

## 5. 常见错误与调试实录

错误一：拼写静默失败。`.comment` 写成 `.commnet` 不报错，就是命中 0 个元素。排查固定三步：DevTools 搜字符串确认命中数、核对 HTML 的 class 属性原文、检查大小写（class 与选择器都区分大小写）。

错误二：后代与子代用错导致「家族式误伤」。`.card p` 在卡片里再嵌一层卡片时，内外卡片的所有 p 全中。组件内部样式优先 `.card > p` 或直接给类。

错误三：ID 起手，后期覆盖不了。写着写着发现怎么改类都盖不过 `#header` 里的规则。修复方向：把 ID 选择器降为类选择器，而不是往上加 `!important`——优先级的完整解法见 [优先级计算](/css/170-PriorityCalculation)。

错误四：属性值大小写翻车。`[data-id=Abc]` 匹配不到 `data-id="abc"`——属性值匹配区分大小写（` i` 修饰除外），HTML 校验器不报这类错。

错误五：被过时的「选择器性能」建议绑架。老教程爱说「通配符慢、后代层级别超三层」。真相是现代引擎的选择器匹配早已高度优化，这些在 2026 年都属于微优化，**可维护性才是选择器设计的首要去向**：选择器越贴近结构语义，改动 HTML 时样式越不容易碎。

## 6. 实际场景

- 组件化样式：类加状态类（`.card.is-active`）是所有主流 CSS 架构的地基；
- data 属性驱动状态：`[data-state="loading"]` 直接把组件状态写进样式，JS 只改属性不碰类名拼接；
- 内容增强：`[href^="https://"]` 给外链加图标、`a[href$=".pdf"]` 标文件类型，纯 CSS 完成；
- 第三方组件覆盖：结构动不了时，用精准的组合器加属性选择器定点打击，配合 `:has()` 还能看内容选容器；
- FANDEX 网页端前端实验室的「选择器命中演示」可以逐条勾选选择器、实时高亮命中元素，组合器混着试一遍比读十遍记得牢。

## 7. 小练习

预测题（3 分钟）：结构 `<ul><li>A</li><li class="hot">B</li><li>C</li></ul>`，`li.hot + li` 与 `li.hot ~ li` 各命中谁？（前者只命中 C；后者命中 C——`~` 只算排在后面的兄弟，不含自己。）

修改题（8 分钟）：给评论区加「含图片的评论，作者名加粗」：用 `:has()` 与后代组合实现，再想一个不用 `:has()` 的替代方案（给作者名加状态类）并对比两者对 HTML 侵入性的差别。

修 Bug 题（10 分钟）：下面规则想给「直接位于 h2 后的提示段落」上色，实际页面上 h2 与 p 之间隔了个空 div，规则失效。重写一条不依赖「紧邻」的选择器，并说明原选择器为什么脆：

```css
h2 + p.tip {
  color: #b45309;
}
```

（答案方向：`+` 要求紧邻，空 div 打断了相邻关系。结构噪音存在时改用 `h2 ~ p.tip` 或给 p 加类直取；「依赖紧邻」的选择器对 DOM 插入零容忍，封装组件时慎用。）

挑战题（20 分钟，不看正文独立完成）：只写选择器不加任何 HTML 属性，实现：表格隔行变色；第一列文字左对齐加粗；含链接的单元格底色变浅。验收：不使用 `!important`、不新建类名、每条规则附一行注释说明命中范围。

## 8. 与之前和之后的知识的关系

- 之前：[CSS3 概述与基本语法](/css/020-CSS3OverviewBasicSyntax) 给出了「选择器加声明块」的规则外形，本篇把选择器一侧展开讲透；
- 并行：[伪类与伪元素](/css/140-PseudoClassPseudoElement) 是选择器状态维度的完整展开；[优先级计算](/css/170-PriorityCalculation) 决定命中之后的胜负；[BEM 命名方法论](/css/600-BEMNamingMethodology) 讨论类名怎么起；
- 之后：[调试技巧](/css/190-DebuggingCSS) 教你用 DevTools 验证命中与排查失效——选择器写不准的排错全靠它。

## 9. 官方文档

- MDN「CSS 选择器」总览：https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_selectors
- MDN 属性选择器参考：https://developer.mozilla.org/zh-CN/docs/Web/CSS/Attribute_selectors
- MDN「选择器优先级」：https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_cascade/Specificity

## 10. 自我检查

- 给任意一段 HTML，能口算每条组合器选择器命中哪些元素；
- 能默写属性选择器六种匹配符并各举一例；
- 能说出「类优先于 ID」的两条工程理由；
- 「样式没生效」的第一反应是打开 DevTools 搜选择器验证命中数，而不是改代码碰运气。

## 本章总结

选择器是 CSS 的寻址系统：基础五件套（通配、标签、类、ID、属性）管「找谁」，属性选择器六种匹配符管「按特征找」，组合器四兄弟（空格、>、+、~）管「按关系找」。工程首选类选择器——复用与同权重层叠两条理由；ID 留给锚点与 JS。伪类与伪元素把状态与位置纳入寻址，优先级决定多规则竞争的胜负。选择器性能在 2026 年不是问题，结构与语义的稳定性才是。

## 下一步

进入 [伪类与伪元素](/css/140-PseudoClassPseudoElement)：结构选择器只能按「静态位置」找元素，下一篇加上「状态」与「造零件」两个维度——:nth-child 的公式、:has 的反向选择与 ::before 的无中生有。
