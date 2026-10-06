---
order: 760
title: "@scope 规则：给样式圈一块地盘"
module: 'css'
category: 前端技术
difficulty: beginner
description: 从「同一个 .card 在侧边栏要紧凑、主区要宽松」的选择器军备竞赛出发：读懂 @scope 的根与 to 下限边界、用 :scope 指回根元素、用邻近性裁决嵌套作用域，并学会「未知 at 规则整体丢弃」下的降级写法。
author: fanquanpp
updated: '2026-09-27'
related:
  - 'css/130-CSS3SelectorSystem'
  - 'css/170-PriorityCalculation'
  - 'css/480-CSSNativeNesting'
  - 'css/600-BEMNamingMethodology'
  - 'css/720-CSSNestingInPractice'
prerequisites:
  - 'css/130-CSS3SelectorSystem'
---

## 前置知识

- 已完成 [CSS3 选择器系统](/css/130-CSS3SelectorSystem)：会写后代选择器，知道两条规则打架时先比谁更具体；
- [优先级计算](/css/170-PriorityCalculation) 学过更好，没学过也能跟——本文用到的裁决知识在第 4 节当场给足。

## 学习目标

读完本文你将能够：

1. 说清 @scope 要解决的两个老问题：全局样式泄漏进组件、防泄漏催生的长选择器与命名前缀；
2. 读懂 @scope (.card) to (.card-content) 的边界，预测一条作用域规则会命中哪些元素；
3. 用 :scope 给作用域根本身写样式；
4. 用「作用域邻近性」解释嵌套作用域里谁赢、为什么与书写顺序无关；
5. 写出 @scope 的降级结构，说清「不认识的 at 规则连内容一起丢弃」的恢复规则。

预计 50 到 70 分钟，含 2 组动手实验与 4 道练习。

## 1. 问题引入：同一个 .card，两种命运

页面左侧栏和主区都挂着 `.card`，设计要求：侧边栏的卡片紧凑，主区的宽松。

第一反应是后代选择器：

```css
.card { padding: 24px; }
.sidebar .card { padding: 12px; }
```

能用。然后需求继续长：弹窗里也要卡片、要更紧的版本……每加一个场景就多一条更长的选择器，全靠「更具体所以赢」吃饭——哪天有人写出同样长度的选择器，胜负就掉到书写顺序上。另一条路是改名加前缀（`.sidebar-card` 这类），选择器短了，代价是每次调整都牵动所有 HTML（见第 600 篇）。

两条路共同的根源是同一件事：**CSS 的规则默认对全页生效，没有作用域**，只好用选择器长度或名字前缀手工圈地。@scope 把圈地交给语言本身：

```css
@scope (.sidebar) {
  .card {
    padding: 12px;
  }
}
```

读法：「下面这批规则，只许命中 .sidebar 子树里的元素」。选择器照常写短名，泄漏问题在语法层被关掉。

## 2. 动手实验一：先圈一块最小的地

新建 `scope-lab.html`：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>@scope 实验</title>
  <style>
    p { color: #334155; }

    @scope (.card) {
      p { color: #b45309; line-height: 1.8; }
      :scope { border: 1px solid #cbd5e1; padding: 16px; }
    }
  </style>
</head>
<body>
  <p>全局段落：深灰蓝。</p>
  <div class="card">
    <p>卡片里的段落。</p>
  </div>
</body>
</html>
```

预期效果：第一段保持全局的深灰蓝；卡片里的段落变成琥珀棕色、行距拉开；卡片自己长出细边框和留白。做一次对照：把 @scope 块整个删掉，两段立刻同色——这就是「样式泄漏」与「圈地」的直观差别。

两个新面孔：

- **@scope (根) { 规则 }**：根命中哪些元素，规则的射程就是哪些子树；不写 to 时覆盖根的整个子树，第 3 节再加边界；
- **:scope**：作用域内指向根元素本身的伪类。块内以关系符开头的写法（如 `> p`）也从 :scope 数起，等价 `:scope > p`。

## 3. 核心概念一：上界与下限，甜甜圈怎么读

@scope 的完整形状是 `@scope (根) to (下限) { 规则 }`，两条边界各自独立：

- **根（上界）**：规则只考虑根的后代；根自己用 :scope 单独点；
- **下限（to）**：命中下限的元素，其**子树**被排除——洞挖在下限元素里面，下限元素本人仍在作用域内。

最经典的应用是文章排版：正文里的图片统一加框，但作者自己插的 figure 已带样式，不想再叠一层。

```css
@scope (.article-body) to (figure) {
  img {
    border: 4px solid #94a3b8;
  }
}
```

预期效果：正文里裸插的 img 带上灰框；figure 内部的 img 一根毛都不动——.article-body 的地盘挖掉每个 figure 的内部，形如甜甜圈。易惊到的细节：figure 本身仍在作用域内，同一条 @scope 里写 `figure { outline: 2px dashed #ef4444; }` 会给 figure 画上虚线框。

根与下限都接受选择器列表，匹配语义等同 :is（命中任意一个即可）：`@scope (.card, .panel) to (figure, .ad)` 一次服务两种容器、同时挖掉两类洞。

### 修改实验

在 scope-lab.html 的卡片里塞一层 `<div class="inner"><p>内层段落</p></div>`，然后：

1. 把下限改为 `to (.inner)`。预测：哪几段变色？——卡片里外层的段落变色，inner 里的不动；
2. 把 `to (.inner)` 删掉刷新。预期效果：inner 里的段落也变色——没有下限，作用域就是「根的整个子树」，即不写 to 时的默认行为。

## 4. 核心概念二：邻近性——嵌套作用域的裁决

真实页面常有嵌套：侧边栏里还有一个「置顶区」，置顶区的卡片要有第三种密度。写两条 @scope：

```css
@scope (.sidebar) {
  .card { padding: 12px; }
}
@scope (.pinned) {
  .card { padding: 8px; }
}
```

当一张卡片同时位于 .sidebar 和 .pinned 之内（.pinned 嵌在 .sidebar 里），两条规则的根都命中它。按第 130、170 篇的思路该比优先级了——但这里先比一条新判据：**作用域邻近性（scope proximity）**。谁的根在 DOM 上离目标更近，谁赢：.pinned 是直接祖先，.sidebar 隔了一层，于是 padding: 8px 胜出。

关键性质：**这场裁决与书写顺序无关**。把两条 @scope 块前后对调，结果不变——这是它与「一样具体时后写的赢」最大的不同。在级联链条里，邻近性排在层叠层（第 450 篇）之后、普通优先级之前。放进 `.sidebar > .pinned > .card` 结构验证：置顶卡片 padding 是 8px；把它挪出 .pinned、只留在 .sidebar 下，padding 跳回 12px——改 DOM 结构就能改样式归属，一行选择器都不用碰。

## 5. 核心概念三：:is 与 :where 的配合

优先级上有个安静的变化：裸写 img 只算 img 自己的 0-0-1，**根的优先级默认不计入**——从 `.card img`（0-1-1）迁移老代码时，全局规则可能反超，谁赢看 Styles 面板里的划线。想保持原优先级写 `:scope img`（0-1-1）；`:where(:scope) img` 引用根却把权重清零。:is 与 :where 的分工照常成立：:is 取列表里命中的最高优先级，:where 一律归零，两个伪类在 @scope 里可用。

## 6. 降级：不认识的 at 规则，连锅端

@scope 是 at 规则，没有 @supports 那样的声明试探检测方式，降级靠另一条恢复规则：**浏览器遇到不认识的带块 at 规则，整个块连同里面所有规则一起丢弃**。所以兜底规则必须写在 @scope 块外面、前面：

```css
/* 兜底：所有浏览器都执行（无作用域，靠后代选择器限制范围） */
.article-body img { border: 4px solid #94a3b8; }

/* 增强：支持的浏览器用作用域版本接管 */
@scope (.article-body) to (figure) {
  img { border: 4px solid #94a3b8; }
}
```

支持的浏览器两份都收到，作用域版按层叠规则接管；不支持的丢弃整个 @scope 块，兜底独自顶上——效果打折但页面不坏。兜底版没有「挖洞」能力（老浏览器里 figure 内的 img 也带框），这是渐进增强的换算法：为旧引擎保留能用的近似，为新引擎保留精确版。

支持现状怎么查：老规矩，caniuse 搜 @scope。给一个快照：截至 2025 年三大引擎都已在正式版本支持（Chrome 118+、Safari 17.4+、Firefox 128+），但请把这句当快照不当承诺——动手前查一次表，比信任何文章都稳。另外：不支持 @scope 的环境里，Styles 面板看不到 @scope 块的痕迹——被丢弃的规则不带警告图标，无声消失。「样式怎么全没了」的第一排查动作：先确认环境支持，再看兜底是否就位。

## 7. 常见错误与调试实录

错误一：以为 @scope 是样式隔离舱。在 @scope (.card) 里写 `p { color: red; }`，卡片文字红了，但 body 上设的 font-size 照样管着卡片里的字。@scope 挡**选择器匹配**，挡不住**继承**——继承是第 160 篇讲过的纵向管道，不经过选择器。想让某属性不听外面的话，得在作用域内显式声明它。

错误二：把下限元素当成「也被挖掉」——在 `@scope (.card) to (.card-content)` 里写 `.card-content { border: 1px solid #ef4444; }`，刷新后边框出现了：下限元素本人仍在作用域内，被排除的只是它的子树。

错误三：Styles 面板里找不到自己的规则。两个可能：环境不支持（整块无声丢弃，见第 6 节）；或根选择器没命中（.card 写成 .cards，同样安静）。先在 Elements 面板确认目标元素的祖先链上真有匹配根的元素，再核对环境——「面板里没有」说明规则没被采纳，不是显示问题。

## 8. 实际场景

- 内容型站点：正文排版用 `@scope (.article-body) to (figure, blockquote)` 圈住，作者插入什么都不会内外互相污染；
- 组件多密度：卡片在侧边栏、弹窗、置顶区各有密度，靠邻近性按 DOM 归属裁决，不再军备竞赛选择器长度；
- 渐进替代 BEM：新项目少起一半命名；老项目不必推倒重来——BEM 管语义，@scope 管边界（第 600 篇）；
- 富文本与嵌入区：给评论区、广告位圈一块地。更彻底的隔离还有 shadow DOM 那层，先知道边界在哪。

## 9. 小练习

预测题（5 分钟）：卡片结构是 `.card > .inner > p` 和 `.card > p` 各一段，规则如下。哪几段变色？.inner 自己会带浅灰背景吗？

```css
@scope (.card) to (.inner) {
  p { color: #b45309; }
  .inner { background: #f1f5f9; }
}
```

答案（写完再对照）：`.card > p` 变色；`.inner > p` 在洞里，不变色；.inner 本身命中——下限元素的子树被排除，元素本人仍在作用域内，背景色生效。

修改题（15 分钟）：给 scope-lab.html 搭出 .main、.sidebar、.sidebar 内嵌 .pinned 三个区域各含一张卡片，写三条 @scope 给出三种 padding（24px / 12px / 8px）。验收：交换三条 @scope 块的书写顺序，三张卡片的 padding 一个都不变；把置顶卡片挪出 .pinned 后，解释它归哪条规则管。

修 Bug 题（15 分钟）：下面样式想让正文排版「img 带框、figure 内不加框、老浏览器保底」，现在新浏览器和老浏览器上图片都没框。找出两处问题并修复：

```css
@scope (.artical-body) to (figure) {
  img { border: 4px solid #94a3b8; }
  .article-body img { border: 4px solid #94a3b8; }
}
```

提示：一条一条排查——根选择器拼写对不对（拼错的根不命中任何元素，静默失败）；兜底该待在哪（第 6 节的铁律）。

挑战题（半小时，不看正文独立完成）：做一个「评论区组件」：.comments 内评论头像圆形、正文行距 1.7；作者粘贴的 blockquote（如推文卡片）整块排除；评论区头部 .comments-header 用更松的行距（嵌套作用域加邻近性）。验收：评论区外段落不受影响；blockquote 内不套用评论正文规则；.comments-header 行距靠「更近的根」胜出，对调 @scope 块顺序结果不变；兜底全部位于 @scope 块外。

## 10. 与之前和之后的知识的关系

- 之前：[CSS3 选择器系统](/css/130-CSS3SelectorSystem) 教会你读选择器，@scope 只是把「命中范围」收窄到一块地；[继承与层叠机制入门](/css/160-CascadeInheritanceBasics) 解释了「围栏挡不住继承」的现象；[优先级计算](/css/170-PriorityCalculation) 的级联链条里，邻近性是插在层叠层与优先级之间的新判据；
- 之后：[CSS 原生嵌套](/css/480-CSSNativeNesting) 的 & 与本文的 :scope 在作用域块内配合食用；[BEM 命名方法论](/css/600-BEMNamingMethodology) 与本文互为替代：BEM 用命名换兼容性，@scope 用浏览器能力换命名；[CSS 原生嵌套工程实践](/css/720-CSSNestingInPractice) 是下一篇。

## 11. 官方文档

- MDN @scope：https://developer.mozilla.org/zh-CN/docs/Web/CSS/@scope
- MDN :scope 伪类：https://developer.mozilla.org/zh-CN/docs/Web/CSS/:scope
- CSS Scoping Module Level 1（规范原文）：https://drafts.csswg.org/css-scoping/
- caniuse：https://caniuse.com

## 12. 自我检查

- 能向同事说清 @scope 与「写更长选择器」各自付出什么、得到什么；
- 拿到任意一条 @scope 规则，能画出它命中范围的甜甜圈草图（含下限元素本人在内）；
- 能说出 :scope 的指向、以及作用域挡不住继承这个关键边界；
- 能默写降级铁律：兜底在块外、块前，因为不认识的 at 规则连内容一起丢弃；
- 知道用 caniuse 查支持现状，能在 DevTools 里判断「规则是被丢弃了还是没命中」。

## 本章总结

@scope (根) { 规则 } 把规则的命中范围收进根的子树，不写 to 时覆盖整个子树；to (下限) 在子树里挖洞，下限元素的子树被排除、本人仍在作用域内。:scope 指向根元素，块内以关系符开头的写法从根数起。多个作用域同时命中时按邻近性裁决——DOM 距离近的赢，与书写顺序无关。@scope 挡选择器匹配、不挡继承；裸写选择器不计根的优先级，:scope img 与 :where(:scope) img 是两档调节旋钮。降级靠「兜底写在块外块前」：浏览器遇到不认识的 at 规则，整块连同内容一起静默丢弃。支持现状查 caniuse，不背版本。

## 下一步

进入 [CSS 原生嵌套工程实践](/css/720-CSSNestingInPractice)：本文的 :scope 与嵌套的 & 是同一套现代 CSS 组件化思路的两半，下一篇把它们放进真实项目，看作用域、嵌套与命名怎么配合落地。
