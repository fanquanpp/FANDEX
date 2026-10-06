---
order: 340
title: 用 Markdown 做演示文稿
module: 'markdown'
category: 工具链
difficulty: beginner
description: Marp、Slidev 与 reveal.js 三条路线的分页语法、讲者注释、主题与导出对比
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：用 Markdown（或轻量 HTML）写演示文稿的三条技术路线：Marp（Markdown 指令分页）、Slidev（开发者向组件嵌入）、reveal.js（HTML 形态框架）。
- **解决什么问题**：PowerPoint/KeyNote 手动排版慢、无法版本管理、改一处要全局手调。文本化的幻灯片可以用 Git 管理、用 diff 审查、用模板统一风格，写起来像写文档。
- **什么时候用到**：技术分享与课程讲义；需要代码高亮的开发向演示；团队要统一风格的批量课件；想用 CI 自动出 PDF 的场景。

## 1. 三条路线总览

| 维度         | Marp                    | Slidev                       | reveal.js                  |
| :----------- | :---------------------- | :---------------------------- | :------------------------- |
| 本质         | Markdown 转 PPT/PDF/HTML | 基于 Vue 的 Markdown 幻灯片框架 | 纯 HTML/JS 演示框架        |
| 分页语法     | `---` 分隔线            | `---` 分隔线                  | `<section>` 元素           |
| 组件嵌入     | 不支持（纯 Markdown）   | 原生 Vue 组件、任意 Web 能力  | 直接写 HTML/CSS/JS         |
| 学习成本     | 最低                    | 中（要懂一点 Vue）            | 中高（要懂前端）           |
| 主题定制     | CSS 主题文件            | 主题 + 组件 +UnoCSS           | 完全自由                   |
| 导出         | PPTX/PDF/HTML           | PDF/PNG/SPA 站点              | PDF（print 样式）          |
| 适合场景     | 快速讲义、课程课件      | 开发者技术分享                | 高度定制的发布会级演示     |

选择的经验法则：**内容是纯文本 + 图片，选 Marp；需要交互 demo 或代码实时运行，选 Slidev；需要逐元素动画与完全的视觉控制，上 reveal.js**。

## 2. Marp：指令注释分页

```markdown
---
marp: true
theme: gaia
paginate: true
---

# 技术分享标题

副标题与日期

---

## 第二页：要点列表

- 第一点
- 第二点

<!--
讲者注释：这里写只有自己看得到的备注
-->

---

## 第三页：分栏布局

<div class="columns">
<div>

左栏内容

</div>
<div>

右栏内容

</div>
</div>
```

逐段看：frontmatter 的 `marp: true` 声明这是 Marp 文档，`theme` 选主题、`paginate` 加页码；`---` 独占一行即分页——这与 frontmatter 分隔符撞车，所以**文档第一页之前**的 `---` 是元数据、之后的都是分页；`<!-- ... -->` HTML 注释默认是讲者注释（演示者视图可见，导出 PDF 可选隐藏）；分栏这类布局需求用内嵌 HTML 解决（`class="columns"` 配合主题 CSS）。

**Marp 的指令系统**是它的精髓：页内指令写在 HTML 注释里控制单页行为：

```markdown
<!-- _class: lead -->   <!-- 本页用居中标题版式 -->
<!-- _paginate: false --> <!-- 本页不显示页码 -->
```

CLI 一行导出：`marp deck.md --pdf` / `--pptx` / `--html`。

## 3. Slidev：开发者向的组件嵌入

```markdown
---
theme: seriph
---

# 技术分享

用 Markdown 写的开发者幻灯片

---

## 代码即时运行

```ts {2|3-4|all}
const fib = (n: number): number =>
  n <= 1 ? n
  : fib(n - 1) + fib(n - 2)
console.log(fib(10))   // 55
```

<!--
点击步进高亮：第 2 行、第 3-4 行、全部
-->

---
layout: two-cols
---

## 左栏：概念

要点文字

::right::

## 右栏：代码

```js
demo()
```
```

Slidev 的杀手级特性：代码块后 `{2|3-4|all}` 定义**点击步进高亮**——讲到哪行亮哪行；`layout: two-cols` 用 frontmatter 切版式；因为底层是 Vue，任意组件（图表、live coding 编辑器、VueUse 传感器）都能直接嵌进幻灯片。

## 4. reveal.js：HTML 形态与 fragment 逐条入场

reveal.js 的幻灯片是 `<section>`，动画的核心机制是 `fragment`：

```html
<link rel="stylesheet" href="dist/reveal.css">
<link rel="stylesheet" href="dist/theme/black.css">
<div class="reveal">
  <div class="slides">
    <section>
      <h1>HTML 结构骨架</h1>
      <ul>
        <li class="fragment fade-up">HTML 网页的骨架</li>
        <li class="fragment fade-up">CSS 网页的皮肤</li>
        <li class="fragment fade-up">JavaScript 网页的灵魂</li>
      </ul>
    </section>
    <section>
      <h2>嵌套页：向右进入</h2>
      <section>横向子页一</section>
      <section>横向子页二</section>
    </section>
  </div>
</div>
<script src="dist/reveal.js"></script>
<script>Reveal.initialize();</script>
```

`class="fragment fade-up"` 让每个列表项在按键时**逐条入场**（fade-up 是从下方淡入）；`<section>` 嵌套 `<section>` 形成横向子页（讲完一页下右键进子页）。这套机制是手写 Markdown 路线给不了的精确控制——什么时候出现什么、从哪个方向出现，逐元素可指定。

### 4.1 真实工程对照：同一内容的三种实现

本仓库扫描素材里有一组现成对照（社团演示文稿，e-new-areas 005-html5 节）：「HTML 骨架 / CSS 皮肤 / JS 灵魂」三句话的入门内容，先后被做成三种形态——

1. **社团PPT_1.html（手写 CSS 幻灯片）**：Tailwind Play CDN 单文件 + CSS 变量配色板 + 全屏 slide 容器（`.slide` 绝对定位、`opacity/transform` 过渡、`.active` 类切换），缓动用 cubic-bezier、装饰用 clip-path 几何切割。这是「不引框架、自己造轮子」路线：完全可控，代价是分页、翻页、缩放全要手写；
2. **社团PPT_3/4.html（Reveal.js）**：同样的内容改用 `<h1 class="fragment fade-up">` 分片动画逐条入场——框架接管翻页/缩放/进度，作者只写内容与动画类名；
3. **Marp 讲义版（社团讲稿文本）**：13 页逐页讲稿本来就是结构化 Markdown，套上 Marp 主题即成课件，用于课后分发。

对照结论：**临时一次的内部演示，手写 HTML 最快；要逐条入场等演示动效，Reveal.js；要发给大家反复看的讲义，Markdown（Marp）最省**。三条路线不是进阶关系，是「交付物形态」决定的选择。

## 5. 不同场景下的例子

**例一：课程讲义批量生产（真实工程场景，社团课程）**。一个学期 12 次课，讲师只有零散 Markdown 笔记。用 Marp：每章一个 `.md`，共用一个主题 CSS（统一配色与页码），CI 里 `marp *.md --pdf` 一键出全套 PDF。改一处主题、全部课件联动更新——PPT 时代不可想象。

**例二：技术大会分享**。内容含 live coding 与可交互图表，选 Slidev：代码块步进高亮控制讲解节奏，演示中途切浏览器跑 demo 再切回不丢位置（Slidev 的录制模式还自带摄像头画中画）。

**例三：发布会级演示（社团 PPT 素材的对照场景）**。需要每条要点按键入场、背景几何动画、精确的品牌视觉——reveal.js 手写 CSS 或社团PPT_1 式的纯手写方案。Markdown 路线在这一档让位，因为控制粒度需求超出了文本抽象的表达力。

**例四：讲者注释工作流**。三个路线都支持备注：Marp 用 HTML 注释、Slidev 用注释块（演示者视图可见）、reveal.js 用 `<aside class="notes">`。讲义归档时注释同源保留——「幻灯片 + 讲稿」一套文件维护，这是相对 PPT 双文件的最大工作流收益。

## 动手实践

**练习 1（Marp 最小演示）**：写一个 4 页的 Marp 文档（标题页/两页内容/总结页），加一段讲者注释与一页 `_class: lead`，导出 PDF 目检分页与页码。

**提示**：VS Code 装 Marp for VS Code 扩展可实时预览；没有扩展时用 `npx @marp-team/marp-cli deck.md --pdf`。

**练习 2（Slidev 步进高亮）**：写一个含 5 行代码的 Slidev 页，配置 `{1|2-3|all}` 三段步进；再用 `layout: two-cols` 做一页双栏。

**提示**：`npm init slidev@latest` 起模板；步进高亮的分割语法在代码块语言标注后的大括号里。

**练习 3（Reveal fragment 对照）**：把练习 1 的一页要点改写为 reveal.js `<section>` + `fragment fade-up`，浏览器打开对比「Markdown 一页全出」与「HTML 逐条入场」的演示节奏差异。

<details>
<summary>参考实现（先自己动手，再看这里）</summary>

```markdown
<!-- 练习 1：deck.md -->
---
marp: true
theme: default
paginate: true
---

<!-- _class: lead -->

# Markdown 做幻灯片

sub-title

---

## 为什么要文本化

- 版本管理
- diff 审查
- 模板统一

<!--
讲者注释：强调「改动可 review」这一 PPT 做不到的点
-->

---

## 分栏示例

<div class="columns">
<div>

左：概念

</div>
<div>

右：示例

</div>
</div>

---

## 总结

文本化幻灯片 = 文档工作流
```

导出：`npx @marp-team/marp-cli deck.md --pdf --allow-local-files`

```bash
# 练习 2
npm init slidev@latest slidev-lab
# slides.md 中：
# ---
# # 步进演示
#
# ```ts {1|2-3|all}
# const a = 1
# const b = 2
# console.log(a + b)
# ```
# npm run dev 后按右方向键观察三段高亮

# 练习 3：reveal 最小骨架（见第 4 节代码），保存后
# npx serve . 打开浏览器，按空格观察 fragment 逐条入场
```

</details>

## 参考与致谢

- Marp 官方文档：<https://marpit.marp.app/> 与 <https://github.com/marp-team/marp-cli>（MIT）
- Slidev 官方文档：<https://sli.dev/>（MIT）
- reveal.js 官方文档：<https://revealjs.com/>（MIT）
- 本文三种形态的对照案例来自本仓库扫描素材「社团演示文稿三实现」（仓库内部素材，e-new-areas 005-html5 节）。
