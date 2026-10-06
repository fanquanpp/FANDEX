---
order: 470
title: 溢出与滚动条控制（Overflow and Scrollbar）
module: 'css'
category: 前端技术
difficulty: beginner
description: overflow 四取值与 BFC 的关系、overscroll-behavior 阻断滚动链、scrollbar-gutter 防布局跳动、scrollbar 自定义主题——滚动行为专篇，附文档站侧栏/横向卡片轨/模态框三实战
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---


## 知识点地图

- **知识类别**：溢出与滚动行为（overflow 家族 + 滚动条样式 + 滚动链）。
  440-ScrollSnap 管滚动的「对齐节奏」，本篇管滚动的「发生与形态」。
- **解决什么问题**：内容超出容器时世界怎么继续——裁剪、滚动还是
  溢出？滚动条出现时布局跳不跳？弹层里滚到底，页面跟着滚怎么办？
- **什么时候用到**：文档站侧栏独立滚动、横向卡片轨道、模态框打开时
  锁定背景、代码块横向滚动、聊天窗「滚到底」的体验细节。

## 真实场景：FANDEX 文档站的侧栏与代码块

FANDEX 这类文档站（Astro 构建）有两处滚动是体验命门：

1. **左侧导航树比视口高**——目录几百项，整页滚动会丢目录位置；
   侧栏必须自己滚（`overflow-y: auto` + 独立高度），并且滚到底时
   **不能**把主内容区拖着一起飞（`overscroll-behavior: contain`）；
2. **代码块横向溢出**——一行 SQL 300 字符，代码块不能把整页撑出
   横向滚动条（`overflow-x: auto` 收在块内）。

这两处都是「overflow 一行 CSS」的事，但配齐「独立滚动 + 不链动 +
滚动条不跳动 + 主题化」要动 4-5 个属性——本篇把这串属性一次讲透。

## 1. overflow 四取值与 BFC 的隐藏绑定

```css
.box {
  overflow: visible;  /* 默认：溢出可见，画在盒子外 */
  overflow: hidden;   /* 裁剪，无滚动条，内容不可达 */
  overflow: scroll;   /* 裁剪 + 永远显示滚动条（含空滚动条） */
  overflow: auto;     /* 裁剪 + 需要时才出滚动条（绝大多数场景选它） */
  overflow: clip;     /* 裁剪但禁止一切编程滚动（overflow clip margin 可配） */
}
/* 两轴分开写：代码块只要横向滚、纵向随文档 */
pre { overflow-x: auto; overflow-y: visible; }
```

**逐行讲解**：`auto` 与 `scroll` 的区别只在「没有溢出时是否占位」
——`scroll` 的空滚动条会持续占 14px 左右宽度，工具栏、侧栏这类
「随时会溢出」的容器用它防跳动；`clip` 与 `hidden` 的区别是 clip
**连 `scrollTo` 等编程滚动都禁止**，且可以配 `overflow-clip-margin`
让裁剪边界外扩几像素。**易错点**：`overflow-x: hidden` 会把
`overflow-y` 的 `visible` 强制变成 `auto`——规范规定两轴一轴裁剪
时另一轴的 visible 不成立，这就是「只要横向隐藏，纵向莫名出现
滚动条」的来源。

**与 BFC 的绑定**：`overflow` 非 visible 即创建 BFC（065-BFCAndFormattingContexts
的触发条件表）——所以「用 overflow: hidden 清浮动」是借 BFC 的光，
同时也带来「裁剪溢出内容」的副作用。**选触发器先想清你要不要裁剪**
：要清浮动不要裁剪，用 `display: flow-root`。

## 2. overscroll-behavior：阻断滚动链

页面里嵌一个滚动区（侧栏、聊天窗、弹层），用户在里面滚到底继续滚，
**滚动会「链」到外层页面**——侧栏滚完页面开始动，光标还在侧栏上，
体验错乱。这就是滚动链（scroll chaining）：

```css
.sidebar {
  overflow-y: auto;
  overscroll-behavior: contain;  /* 滚到边界后停在本地，不传给页面 */
}
```

- `contain`：滚动到边界后不再外传，但边界处的「回弹/发光」效果保留
  （移动端 rubber-band 仍在）；
- `none`：连边界回弹效果一起禁掉；
- 默认值 `auto`：边界后外传（链动）。

**换成别的写法会发生什么**：老方案是 JS 监听 `wheel` 事件并
`preventDefault`——手写边界判断、破坏被动事件监听的滚动性能、
还要处理触摸与键盘滚动，一堆代码换不来比一行 CSS 更好的效果。
2026 年 `overscroll-behavior` 已是全绿基线，JS 方案只存在
需要条件判断（如「仅某状态下禁止外传」）的场景。

模态框场景的完整配方（第 5 节实践）把 contain 与「背景页面锁定」
分开：contain 管弹层内部的滚动链，背景锁定还要另外处理。

## 3. scrollbar-gutter：滚动条出现/消失的布局跳动

页面内容短于视口时无滚动条，切到长内容滚动条出现——非覆盖式
滚动条（Windows 经典样式）会**挤压内容区宽度**，居中布局瞬间
左跳。`scrollbar-gutter` 提前把滚动条的槽位占住：

```css
html {
  scrollbar-gutter: stable;            /* 始终预留滚动条槽位 */
}
.dialog-scroll {
  scrollbar-gutter: stable both-edges; /* 两侧对称预留（居中内容不歪） */
}
```

**逐行讲解**：`stable` 在溢出方向恒定留槽（即便当前无溢出）；
`both-edges` 两侧都留，对称场景（居中的对话窗）不歪头。
**易错点**：gutter 是「预留槽位」不是「显示滚动条」——它只影响
布局盒，视觉上滚动条仍按需出现；对覆盖式滚动条（macOS 默认、
移动端）没有布局影响，属「无害的保险」。

## 4. 滚动条样式：两套语法

### 4.1 标准语法（Firefox 系 + 趋同中的 Chrome）

```css
body {
  scrollbar-width: thin;           /* auto | thin | none */
  scrollbar-color: #6b7280 transparent;  /* thumb 色 track 色 */
}
```

### 4.2 ::-webkit-scrollbar 伪元素（Chromium/Safari 深度定制）

```css
.sidebar::-webkit-scrollbar { width: 8px; height: 8px; }
.sidebar::-webkit-scrollbar-track { background: #f3f4f6; }
.sidebar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
.sidebar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
```

**两套的关系**：标准语法是「接受平台样式、微调粗细与颜色」；
webkit 伪元素是「完全自绘」（圆角、渐变、hover 态都可控），但
Chrome 121 起 `::-webkit-scrollbar` 与 `scrollbar-width/color`
**互相覆盖**（写了标准属性则伪元素失效）。工程策略：设计系统级
深度定制用 webkit 伪元素 + @supports 兜底，普通页面用标准两行。
**坑**：`scrollbar-width: none` 隐藏滚动条同时让滚轮/触摸仍可滚
——「隐藏但可滚」的正解；`overflow: hidden` 是「既隐藏又不可滚」，
两个需求别混。

## 5. 三个实战

### 5.1 文档站侧栏：独立滚动 + 防链动

```css
.layout { display: grid; grid-template-columns: 280px 1fr; height: 100vh; }
.sidebar {
  overflow-y: auto;
  overscroll-behavior: contain;   /* 滚到底不带动主区 */
  scrollbar-gutter: stable;       /* 目录树伸缩不引起横向跳动 */
  scrollbar-width: thin;
}
```

`height: 100vh` + 内部 auto 滚动是「页面骨架级滚动」模式：整页不滚
（html 上 `overflow: hidden` 或各区域独立滚），每栏自己滚——
Gmail/VS Code 的交互模型。与「整页滚动 + sticky 侧栏」是两条路线，
选择取决于内容长度分布（目录远长于正文选独立滚动）。

### 5.2 横向卡片轨道：与 440 的分工

```css
.rail {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x proximity;   /* 对齐节奏交给 440-ScrollSnap */
  scrollbar-width: none;           /* 横向轨隐藏滚动条，手势已足够 */
}
.rail::-webkit-scrollbar { display: none; }
```

本篇管「横着滚、不链动、滚动条隐藏」，440 管「停下来的对齐方式」
——`scroll-snap-type` 与 overflow 同容器配合，职责不重叠。

### 5.3 模态框：弹层滚动 + 背景锁定

```css
/* 弹层内滚动区 */
.modal-body {
  max-height: 60vh;
  overflow-y: auto;
  overscroll-behavior: contain;   /* 弹层滚到底不带动背景 */
}
/* 背景锁定：锁 html 滚动并补偿滚动条宽度，防跳动 */
body.modal-open {
  overflow: hidden;
  padding-right: var(--scrollbar-w, 0px);
}
```

```js
// 打开时测量滚动条宽度存进 CSS 变量
const w = window.innerWidth - document.documentElement.clientWidth;
document.body.style.setProperty("--scrollbar-w", w + "px");
```

**逐行讲解**：背景锁定若只 `overflow: hidden`，覆盖式滚动条消失
导致内容区凭空变宽、页面右移——用「测量宽度 + padding 补偿」
对冲；`--scrollbar-w` 在无滚动条（macOS）时为 0，补偿自然空转。
现代替代：`scrollbar-gutter: stable` 提前占位后可以省掉 JS 补偿，
但弹层组件要与页面级 gutter 约定一致——两条路线选一条贯彻。

## 常见陷阱与调试

- **坑 1：`overflow-x: hidden` 偷走纵向滚动。** 见第 1 节的「两轴
  联动」规则；只想藏横向溢出时，检查是否真需要 hidden（修根因：
  谁在溢出？DevTools 的 scroll badges 定位溢出源）。
- **坑 2：`overflow: hidden` 裁掉下拉菜单/阴影。** 借 BFC 清浮动的
  顺手裁剪，换 `flow-root`。
- **坑 3：contain 不等于锁定。** `overscroll-behavior: contain` 只断
  滚动链；背景页面仍可被键盘、触控板双指滚动——模态框背景锁定
  需要它 + `overflow: hidden` 组合。
- **坑 4：`100vh` 在移动端的虚高。** 侧栏 `height: 100vh` 遇移动端
  地址栏收缩会溢出视口，用 `100dvh`（dynamic viewport height）。
- **坑 5：自定义滚动条后忘了 `scrollbar-color` 的 hover 态。** 标准
  语法没有 hover 态（thumb 恒色），需要 hover 反馈就得上 webkit
  伪元素——设计要求评审时确认。

## 动手实践

**任务**：在本仓库 app-web 的视角下做一个「文档站布局」小样：
三栏（侧栏/正文/TOC），把本篇四组属性全部用上并逐项验证。

1. 侧栏：独立滚动 + contain + thin 滚动条 + stable gutter；
2. 正文代码块：横向 auto 滚动，纵向保持文档流（验证两轴联动坑）；
3. 横向卡片轨：flex + overflow-x + 隐藏滚动条 + contain-x；
4. 模拟弹层：内滚动 + 背景 `overflow: hidden` + 滚动条宽度补偿；
5. 窄窗口缩放观察：滚动条出现/消失时正文宽度跳不跳（gutter 生效
   与否的对照：删掉 stable 再试一次）。

**提示**：制造长侧栏内容用循环生成列表即可；第 2 步故意把
`overflow-x: hidden` 换成 `overflow: hidden auto` 观察纵轴被强制
改为 auto 的现象；第 4 步的测量脚本一行就够（第 5.3 节）。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    html { scrollbar-gutter: stable; }
    body { margin: 0; font-family: system-ui; }
    .layout { display: grid; grid-template-columns: 260px 1fr 180px; height: 100dvh; }
    .sidebar, .toc {
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
      scrollbar-color: #94a3b8 transparent;
      padding: 1rem;
      background: #f8fafc;
    }
    .toc::-webkit-scrollbar { width: 6px; }
    .toc::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    main { padding: 2rem; overflow-y: auto; overscroll-behavior: contain; }
    pre {
      background: #1e293b; color: #e2e8f0; padding: 1rem;
      overflow-x: auto; overflow-y: hidden;
      /* 验证坑 1：把 overflow-y 改回 visible，纵轴会被强制变 auto */
    }
    .rail {
      display: flex; gap: 1rem; overflow-x: auto;
      overscroll-behavior-x: contain; scrollbar-width: none;
      padding: .5rem 0;
    }
    .rail::-webkit-scrollbar { display: none; }
    .rail > div { flex: 0 0 160px; height: 90px; background: #dbeafe; border-radius: 8px; }
    .modal-body {
      max-height: 40vh; overflow-y: auto;
      overscroll-behavior: contain;
      border: 1px solid #cbd5e1; border-radius: 8px; padding: 1rem;
    }
  </style>
</head>
<body>
  <div class="layout">
    <nav class="sidebar">
      <!-- 用 40 个列表项撑出滚动 -->
      <ul></ul>
    </nav>
    <main>
      <h1>正文</h1>
      <pre>SELECT id, title, author, updated_at, module, category FROM documents WHERE module = 'css' ORDER BY order_no; -- 一行 120 字符触发横向滚动</pre>
      <div class="rail"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
      <div class="modal-body">
        <p>弹层内滚动区。滚到底继续滚，主区不动（contain）。</p>
        <p style="height:60vh">撑高内容。</p>
      </div>
    </main>
    <aside class="toc"><p>TOC</p></aside>
  </div>
  <script>
    const ul = document.querySelector(".sidebar ul");
    for (let i = 1; i <= 40; i++) {
      const li = document.createElement("li");
      li.textContent = "目录项 " + i;
      ul.appendChild(li);
    }
  </script>
</body>
</html>
```

**逐段讲解**：`.layout` 的 `100dvh` 修掉移动端虚高（坑 4）；三个
滚动区各自 `overscroll-behavior: contain`，在任何一个里滚到底
页面都不链动——把 contain 逐个删掉对比，是理解滚动链最快的实验；
`pre` 的组合 `overflow-x: auto; overflow-y: hidden` 是刻意的演示：
按第 1 节规则 hidden 会强拉 y 轴，这里 y 本来就该 hidden 所以
无事发生，改成 `overflow-y: visible` 立刻看到 y 变 auto——
规范条款的现场验证；`.rail` 的 `scrollbar-width: none` 与 webkit
`display: none` 双写保证 Chromium/Firefox 双轨一致。

</details>

## 参考与致谢

- MDN：overflow、overscroll-behavior、scrollbar-gutter、scrollbar-style
  （https://developer.mozilla.org/docs/Web/CSS/overflow ，CC-BY-SA 2.5）
- CSS Overflow Module Level 3 规范（https://drafts.csswg.org/css-overflow-3/ ，W3C 文档许可）
- CSS Scrollbars Styling Module Level 1（https://drafts.csswg.org/css-scrollbars-1/ ，W3C 文档许可）
- 场景素材：本仓库 app-web 文档站（Astro）侧栏与代码块的真实滚动需求
