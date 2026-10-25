---
order: 230
title: SVG 可访问性：ARIA、键盘导航与动效降级
module: 'svg'
category: 前端技术
difficulty: beginner
description: 按「装饰、语义、交互」三类给 SVG 配齐无障碍属性——title/desc、role 与 ARIA 速查、focus 与键盘导航、prefers-reduced-motion 与颜色对比度
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：SVG 可访问性（无障碍）——让屏幕阅读器用户、键盘用户、动效敏感用户与低视力用户都能使用 SVG 图形。图标系统工程本身（sprite、变体、构建链路）见 [SVG 图标系统工程](/svg/170-SVGIconSystemEngineering)。
- **解决什么问题**：图表对屏幕阅读器是「一堆无语义的矩形」；装饰图标被逐个朗读打断阅读；点击图标按钮不知道是什么按钮；加载动画让前庭障碍用户眩晕；浅灰图标在白底上看不清。
- **什么时候用到**：写每一个 svg 元素时都要做一次「它传达信息吗」的判断；组件提测前的无障碍自查；图表、信息图、带动画的插画交付前。
- **本篇不讲**：图标的绘制规范与工程管理（见 170 篇）、图表数据结构的无障碍表述（入口见 [数据可视化方法论](/svg/155-SVGDataVizEssentials) 的最小三件套）。

## 学习目标

1. 用「装饰 / 语义 / 交互」三分法给任意 SVG 图标配齐 aria-hidden、role、aria-label；
2. 正确组合 title/desc 与 aria-labelledby/aria-describedby，避免裸 title 的朗读不确定性；
3. 让自绘的可交互 SVG 支持 Tab 聚焦、Enter/Space 触发与 ：focus-visible 样式；
4. 用 prefers-reduced-motion 降级动画，用 WCAG 对比度阈值校验图标配色，并掌握屏幕阅读器的实测方法。

预计 35 到 50 分钟。

## 1. 你现在要解决什么问题

先做一个实验：打开任意一页有图标的网站，开启系统屏幕阅读器（Windows 用 NVDA，macOS 用 VoiceOver），用方向键逐元素走一遍。你大概率听到两类事故：一串「图形 图形 图形」（每个 svg 都是个匿名图形，没有名字）——或者更糟，装饰性小图标被认真朗读成「图表」；再或者按钮只读「按钮」，读不出它是干什么的，因为它的全部内容就是一枚没名字的 SVG。

无障碍不是附加题：对屏幕阅读器用户它是能不能用的问题，对键盘用户（大量健全用户也在用键盘导航）它是效率问题，对动效敏感用户它是健康问题。SVG 的好消息是：补齐这些能力只改属性，不用重画。

## 2. 三分法：这个图标传达信息吗

一切 SVG 无障碍的起点是回答一个问题：**这个图形给用户传递信息，还是纯装饰？** 答案决定属性组合：

| 类别 | 判断标准 | 属性组合 |
| --- | --- | --- |
| 装饰性 | 删掉它，信息无损（按钮旁的点缀、背景花纹） | `aria-hidden="true"` |
| 语义性 | 它本身就是信息（状态图标、独立图表） | `role="img"` + 可访问名称 |
| 交互性 | 它可点击、可操作 | 名称放在触发控件上，图形自身隐藏 |

### 2.1 装饰性图标

纯装饰图标应隐藏于屏幕阅读器：

```html
<svg class="icon" aria-hidden="true">
  <use href="#icon-decorative" />
</svg>
```

`aria-hidden="true"` 让屏幕阅读器跳过此元素。

易错点：装饰图标上残留 `<title>` 或 aria-label 会被朗读——aria-hidden 与可访问名称二选一，写了 aria-hidden 就不要再给名字。另一个隐蔽翻车：`aria-hidden="true"` 的元素里含可聚焦子元素（链接、按钮），部分屏幕阅读器仍会聚焦它——隐藏的元素里不能藏可聚焦内容。

### 2.2 语义图标

传递信息的图标需提供替代文本：

```html
<svg class="icon" role="img" aria-label="搜索">
  <use href="#icon-search" />
</svg>

<!-- 或使用 title -->
<svg class="icon" role="img" aria-labelledby="search-title">
  <title id="search-title">搜索</title>
  <use href="#icon-search" />
</svg>
```

两种写法等效，团队统一一种即可；aria-label 胜在简洁，aria-labelledby 在名称需要复用或包含动态内容时更灵活。

### 2.3 交互图标

可点击的图标需有合适语义：

```html
<button class="icon-btn" aria-label="关闭">
  <svg class="icon" aria-hidden="true">
    <use href="#icon-close" />
  </svg>
</button>
```

`aria-label` 在按钮上，SVG 本身 `aria-hidden`，避免重复朗读。

为什么名称放在外层控件上：屏幕阅读器朗读的「可访问名称」来自控件本身；图形只是按钮的视觉内容。名称写在 svg 上时，按钮的可访问名称计算会试图从内容继承，不同浏览器与阅读器的组合下结果不稳定——把名字放在语义控件上，是唯一全平台一致的位置。同时原生 `<button>` 白拿键盘焦点、Enter/Space 触发与按钮 role 语义；自造 `role="button" tabindex="0"` 的 svg 是退路而不是首选（退路写法见第 5 节）。

## 3. role、title 与 desc：给图形一个身份

### 3.1 role 属性速查

| role 值        | 用途                           |
| -------------- | ------------------------------ |
| `img`          | 图像（需 aria-label 或 title） |
| `button`       | 按钮（通常外层用 `<button>`）  |
| `presentation` | 仅为展示，无语义               |
| `none`         | 等价于 presentation            |

```html
<!-- 图表作为整体图像 -->
<svg role="img" aria-labelledby="chart-title chart-desc">
  <title id="chart-title">2024 季度销售额</title>
  <desc id="chart-desc">柱状图展示 Q1-Q4 销售额，Q3 最高 210 万</desc>
  <!-- 图表内容 -->
</svg>
```

`role="img"` 是图表类 SVG 的关键一步：它把整张图声明为一个图像原子，辅助技术不再深入内部逐个朗读矩形与文字。

### 3.2 title 与 desc：SVG 规范原生的描述机制

`<title>` 提供简短名称、`<desc>` 提供长描述，两者是 SVG 规范原生的可访问性机制；配合 `aria-labelledby` / `aria-describedby` 引用其 id 后，各屏幕阅读器朗读行为更一致（仅裸放 `<title>` 时，部分浏览器会把它渲染成悬停提示，朗读支持参差）。

```html
<svg viewBox="0 0 100 100" role="img" aria-labelledby="icon-t icon-d">
  <title id="icon-t">警告</title>
  <desc id="icon-d">黄色三角形带感叹号，表示警告状态</desc>
  <polygon points="50,10 90,90 10,90" fill="#f9a825" />
  <text x="50" y="70" text-anchor="middle" font-size="40" fill="#fff">!</text>
</svg>
```

| 元素      | 用途           | 配合属性            |
| --------- | -------------- | ------------------- |
| `<title>` | 简短可访问名称 | `id` + `aria-labelledby` |
| `<desc>`  | 详细描述       | `id` + `aria-describedby` |

写作要领：title 写「是什么」，desc 写「结论」而不是「元素清单」——「柱状图展示 Q1-Q4 销售额，Q3 最高」是结论，「四个矩形五条线」是废描述。desc 里的关键数字用文本写全，别指望听者看图。

### 3.3 常用 ARIA 属性速查

| 属性               | 说明             | 取值               |
| ------------------ | ---------------- | ------------------ |
| `aria-hidden`      | 对辅助技术隐藏   | `true` / `false`   |
| `aria-label`       | 可访问名称       | 任意字符串         |
| `aria-labelledby`  | 引用 id 作为名称 | `id [id2 ...]`     |
| `aria-describedby` | 引用 id 作为描述 | `id [id2 ...]`     |
| `aria-pressed`     | 按钮按下状态     | `true`/`false`/`mixed` |
| `aria-expanded`    | 展开/折叠状态    | `true` / `false`   |
| `aria-disabled`    | 禁用状态         | `true` / `false`   |

状态类属性（aria-pressed/aria-expanded）的价值在「状态变化可感知」：切换图标（空心心变实心心）若只换图，朗读器用户毫无感知；把 aria-pressed 同步翻转，状态变化才进得了耳朵。用法示例见第 7 节的动效降级与 170 篇的状态切换图标。

## 4. focus 与键盘导航

自绘的可交互 SVG（不用原生 button 的场景）必须手动补齐三件事：可聚焦、可触发、可见的焦点态。

```html
<svg class="icon-btn" role="button" tabindex="0" aria-label="菜单" id="menu-btn">
  <use href="#icon-menu" />
</svg>

<script>
  const btn = document.getElementById('menu-btn');
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleMenu();
    }
  });
  btn.addEventListener('click', toggleMenu);
</script>
```

逐行讲解：

- `tabindex="0"` 把 svg 纳入 Tab 序——没有它键盘用户永远到不了这个按钮；`tabindex` 正值会打乱自然 Tab 顺序，一律不要用；
- `role="button"` 让朗读器把它播报成按钮而不是图形；
- keydown 里 Enter 与 Space 都要处理且 `preventDefault()`：Space 在按钮上的默认行为是滚动页面，不拦会「一按空格页面跳走」；
- 再强调一次：这三件事原生 `<button>` 全部免费自带，只有标签语义不可用时（如在 svg 内部画交互节点）才走这条路。

### 4.1 focus 样式

```css
.icon-btn:focus-visible {
  outline: 2px solid #4f5bd5;
  outline-offset: 4px;
  border-radius: 4px;
}
```

`:focus-visible` 仅在键盘聚焦时显示，鼠标点击不显示。

易错点：全局 CSS 里 `outline: none`（常见于「去掉丑焦点框」的复位样式）会把键盘用户的定位标尺整个抹掉——要美化就用 ：focus-visible 重设样式，永远不要只删不给。SVG 元素的焦点框在部分浏览器里被裁进 viewBox，`outline-offset` 留白或给 svg 一点 padding 是稳妥解法。

## 5. 语义化与屏幕阅读器实测

属性写得再规范，没有实测都只是自我安慰。最小实测流程：

1. **环境**：Windows 装 NVDA（免费，市占率最高之一），macOS 直接用 VoiceOver（Cmd+F5 开启）；
2. **走查**：用方向键按文档顺序走一遍页面，记录每个 SVG 的朗读内容，对照第 2 节的三分法逐个判定「该读的读到了吗、不该读的安静吗」；
3. **交互**：只用 Tab + Enter 完成一次完整操作流，记录是否能聚焦、触发、并听到状态变化（aria-pressed 翻转后要能听到「已按下」）；
4. **回归**：把无障碍属性检查纳入 code review 清单——属性 diff 一目了然，比事后走查便宜得多。

结构语义补充：一组相关的图形（如仪表盘）可给容器加 landmark role 或用真实标题组织层级，让朗读器用户能按区块跳转；纯图形页面至少保证「标题在前、图形在后」的朗读顺序合理。遇到读不出、读不对的组合，优先怀疑可访问名称的计算链（外层控件是否吞掉了内层名称），再查 role 是否被覆盖。

## 6. prefers-reduced-motion：动效降级

```css
.animated-icon {
  animation: spin 2s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .animated-icon {
    animation: none;
  }
}
```

尊重用户的系统偏好，禁用动画。

为什么这是可访问性议题：持续旋转、闪烁、视差滚动的动画会诱发前庭障碍用户（约前庭功能失调人群）的眩晕与不适，prefers-reduced-motion 是他们唯一的求助通道。降级策略分三档：循环装饰动画直接停（加载旋转改静态图形 + 文字「加载中」）；入场动画改为瞬时出现；功能必需的动效（进度推进）保留但降低幅度。SVG 内部 `<style>` 里同样支持该媒体查询（见 [响应式 SVG](/svg/165-SVGResponsiveTechniques) 的媒体特性一节），经 img 引用的外链文件也生效。

## 7. 颜色对比度

图标颜色需满足 WCAG 对比度要求：

| 文本类型        | 最小对比度（WCAG AA） |
| --------------- | --------------------- |
| 正常文本        | 4.5:1                 |
| 大文本（18pt+） | 3:1                   |
| 图标与图形      | 3:1                   |

```css
/* 检查对比度 */
.icon-primary {
  color: #4f5bd5; /* 对比度 4.8:1（白底） */
}

/* 错误：对比度不足 */
.icon-low-contrast {
  color: #ccc; /* 对比度 1.6:1 */
}
```

三条工程经验：

- 「图标与图形 3:1」针对的是**承载信息的图形**（WCAG 1.4.11 非文本对比度）；纯装饰图形不受约束——这又回到第 2 节的三分法；
- 深浅双主题的图标必须**两套底色分别验一遍**：白底 4.8:1 的主色在 #2d3436 深底上可能跌到 2:1；
- 状态不能只靠颜色区分（红绿不分的色觉用户）：错误图标除了变红，形状也要变（叉号 vs 对勾），这就是「错误」永远画叉、「成功」永远画勾的原因。

## 8. 三个工程场景

### 场景一：纯装饰图标的批量隐藏

真实背景：导航栏十个图标里八个是装饰（文字已表意），只有「消息」图标带未读角标是语义的。装饰的批量处理：

```html
<nav class="navbar">
  <a href="/home" class="nav-item"><svg class="icon" aria-hidden="true"><use href="#icon-home" /></svg>首页</a>
  <a href="/msg" class="nav-item">
    <svg class="icon" aria-hidden="true"><use href="#icon-msg" /></svg>消息
    <span class="badge" aria-label="3 条未读">3</span>
  </a>
</nav>
```

讲解：装饰图标统一在图标组件的模板层写死 `aria-hidden="true"`——**约定进组件，不靠每个调用点自觉**（模板里一处属性，胜过调用点十次自觉）；「消息」的文字已表意，图标仍是装饰，而未读数角标是独立信息，用 aria-label 挂在数字元素上。漏判场景：有人觉得「消息」图标该加 role=img，结果朗读成「消息 图标 消息 3 条未读」——信息重复是过度无障碍的典型症状。

### 场景二：交互图标按钮的无障碍命名

真实背景：表格行操作列的三个图标按钮（编辑、复制、删除），无文字。错误的命名位置与正确的对比：

```html
<!-- 错：名字在 svg 上，外层按钮无名 -->
<button class="row-btn"><svg role="img" aria-label="删除" /></button>

<!-- 对：名字在按钮上，svg 隐藏 -->
<button class="row-btn" aria-label="删除第 3 行" >
  <svg class="icon" aria-hidden="true"><use href="#icon-trash" /></svg>
</button>
```

讲解：列表场景的致命细节是**多行重复按钮**——三个「删除」按钮对朗读器毫无区分度，用户不知道会删哪一行；把行号拼进 aria-label（「删除第 3 行」）才能定位。名字放按钮上还有一层保险：禁用状态用原生 disabled（或 aria-disabled + 样式），朗读器能正确播报「已禁用 删除第 3 行」。

### 场景三：加载动效的三档降级

真实背景：数据大屏的加载图标是持续旋转的圆弧，要照顾动效敏感用户：

```html
<svg class="spinner" viewBox="0 0 24 24" role="img" aria-label="加载中">
  <path d="M12 2 A10 10 0 0 1 22 12" fill="none"
        stroke="currentColor" stroke-width="3" stroke-linecap="round" />
</svg>
<style>
  .spinner { animation: spin 1s linear infinite; transform-origin: center; transform-box: fill-box; }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (prefers-reduced-motion: reduce) {
    .spinner { animation: none; }
    .spinner + .loading-text { display: inline; }
  }
</style>
<span class="loading-text" hidden>正在加载…</span>
```

讲解：动效敏感用户看到的是**静止的圆弧加明确的文字提示**——信息不丢、眩晕不犯；圆弧保留 role=img 与「加载中」名称，朗读器用户不依赖视觉也能知道状态。`transform-box: fill-box` 让旋转以图形自身为轴（否则 transform-origin 的 center 解析在 svg 里默认对齐画布，圆弧会绕画布中心甩）——这是 SVG 动画与 reduced-motion 之外最容易翻车的属性。

## 9. 修改实验

1. 给 2.2 的语义图标加一个 `<desc>`，用 aria-describedby 挂上，再用 NVDA 走查听朗读顺序（名称在前、描述在后）；
2. 把 4 节的自绘按钮替换为原生 `<button>` 包裹，删掉 tabindex/role/keydown 三件套，验证行为完全等价——体会「退路写法」的维护成本；
3. 系统开「减弱动态效果」（Windows 设置-辅助功能-视觉效果；macOS 辅助功能-显示），验证场景三的旋转停止且文字出现；
4. 用浏览器 DevTools 的 Rendering 面板（或对比度检查器）验证 #ccc 图标与 #4f5bd5 图标在白底和 #2d3436 深底上的对比度，记录哪一组在深底上失守。

## 10. 小练习

预测题：`<button aria-label="关闭"><svg role="img" aria-label="叉号" /></button>` 会被朗读成什么？哪几个属性该删？

修 Bug 题：弹窗的关闭按钮在 NVDA 下朗读正常，但键盘用户按 Tab 走不到它。检查方向与最小修复。

挑战题（不看提示）：为一张「双系列折线图」写出无障碍最小三件套（role/名称/描述）加数据表替代方案的完整结构，desc 里要包含可比较的结论句式。

先自己推理，再展开参考答案对照：

<details>
<summary>参考答案（先自己推，再展开对照）</summary>

预测题：大概率读成「关闭 按钮」——按钮的可访问名称由 aria-label 提供，内部 svg 的 aria-label 多数组合下被吞或造成重复朗读（如「关闭 图形 叉号」）。该删的是 svg 上的 `role="img"` 与 `aria-label="叉号"`，改成 `aria-hidden="true"`；按钮的 aria-label 保留。信息只有「关闭」一个，就让它只被读一次。

修 Bug 题：朗读正常说明名称与语义没问题，Tab 走不到说明**可聚焦性**缺失——按钮若是自绘 svg（role=button）而没有 tabindex，或被外层容器设置了 `visibility/aria-hidden` 类的隐藏，或用了 `tabindex="-1"`。最小修复：改原生 button；若必须 svg 自绘，加 `tabindex="0"` 并补 keydown（Enter/Space）与 ：focus-visible 样式。排查顺序先查 tabindex 值，再查祖先的隐藏属性。

挑战题：

```html
<svg role="img" aria-labelledby="t d">
  <title id="t">2024 上半年两条产品线营收对比</title>
  <desc id="d">折线图。A 线从 120 万升至 210 万，B 线从 180 万降至 150 万；A 线 5 月反超 B 线。</desc>
</svg>
<table class="visually-hidden">
  <caption>2024 上半年营收（万元）</caption>
  <tr><th>月份</th><td>1月</td><td>2月</td><td>3月</td><td>4月</td><td>5月</td><td>6月</td></tr>
  <tr><th>A 线</th><td>120</td><td>135</td><td>150</td><td>170</td><td>195</td><td>210</td></tr>
  <tr><th>B 线</th><td>180</td><td>175</td><td>170</td><td>162</td><td>155</td><td>150</td></tr>
</table>
```

要点：desc 写趋势结论（谁升谁降、何时反超）而不是逐点报数；数字细节交给表格；表用 visually-hidden 类视觉隐藏但保留给朗读器；caption 必写（朗读器进表先读标题）。

</details>

## 11. 与之前和之后的知识的关系

- 往前：交互图标的焦点与触发建立在 150（JavaScript 交互）的 DOM 操作之上；动效降级对照 140（动画）的三种实现机制；
- 往后：155 篇的图表最小三件套是本篇 title/desc 机制在数据图表上的应用；170 篇的图标工程（sprite、变体、命名）决定了无障碍属性落在组件的哪一层；165 篇的媒体特性一节与本篇 reduced-motion 互补。

## 12. 官方文档

- MDN：SVG 可访问性：https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/Accessible_SVG
- WAI：ARIA 图形模块（Graphics ARIA）：https://www.w3.org/WAI/ARIA/apg/patterns/
- WCAG 2.2 非文本对比度（1.4.11）：https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- MDN：prefers-reduced-motion：https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion

## 13. 自我检查

- 能用三分法在 30 秒内判定任意 SVG 的属性组合；
- 能解释为什么交互图标的名称要放在外层控件上；
- 能默写自绘可交互 SVG 的三件套（tabindex/role/keydown）并说出原生 button 的替代优势；
- 已在真实屏幕阅读器下完整走查过一个页面并记录朗读输出。

## 本章总结

SVG 无障碍的主线只有一个判断：图形传不传信息。装饰的 aria-hidden 静默；语义的 role=img 加可访问名称（title/desc 配 aria 引用才稳定）；交互的名称归外层控件、图形自隐藏、键盘三件套补齐。再叠加三道保险：prefers-reduced-motion 降级动效、3:1 对比度底线、屏幕阅读器实测走查。属性便宜，实测无价。

## 下一步

进入 [SVG 图标系统工程](/svg/170-SVGIconSystemEngineering)：把本篇的属性组合固化进图标组件与构建链路，让无障碍成为工程的默认输出。
