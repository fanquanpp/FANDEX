---
order: 190
title: SVG 数据可视化方法论：比例尺、坐标轴与数据驱动更新
module: 'svg'
category: 前端技术
difficulty: beginner
description: 把数据映射成坐标的比例尺思想、坐标轴与网格线的标准结构、数据更新与过渡动画、图表无障碍的最小要求
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：SVG 数据可视化的通用方法论——不教某一个图表库，而是讲所有柱图、折线图、气泡图共用的那套骨架：数据到像素的映射、轴与网格的构造、数据变更后的更新与过渡。
- **解决什么问题：**拿到一组业务数据要画成 SVG 图表时，最大的坑不是「画不出来」，而是映射写错（负值穿轴、极端值压扁其余数据、类别数据被当数值处理）与更新写错（数据变了图没变、或整图重建丢动画）。
- **什么时候用到**：手写轻量图表（不引图表库的场景：大屏、邮件模板、组件库内置图形）、读懂 d3 这类库的比例尺 API、审查图表库生成的 SVG 结构。
- **本篇不讲**：图表库选型与开箱组件；交互动画的 API 细节见 [JavaScript 交互](/svg/150-SVGJavaScriptInteraction)，无障碍的完整体系见 [可访问性](/svg/175-SVGAccessibilityPrinciples)。

## 学习目标

1. 用「定义域到值域的线性映射」手工实现一个线性比例尺，并说清对数与序数比例尺各自适用什么数据；
2. 用线段与 text 组装坐标轴与网格线，理解为什么轴要「画成数据的一部分」而不是装饰；
3. 掌握数据驱动的更新三分法：enter（新增）、update（更新）、exit（移除），并用 CSS transition 做补间；
4. 给图表配齐 role=img、aria-label 与数据表格替代方案的最小无障碍组合。

预计 50 到 65 分钟。

## 1. 你现在要解决什么问题

新手画图表的典型写法：数据值 100 就画 100px 高的柱子。立刻遇到三个问题——最大值 1000 时小数据看不见；有负值时柱子画出画布；容器变宽时整张图要手算重排。根因是把「数据值」直接当成了「屏幕像素」，而正确做法是在两者之间放一层**比例尺（scale）**：数据值永远只进比例尺，屏幕坐标永远只从比例尺出来。

这一层抽象正是 d3 等 All 图表库的第一个导出函数，也是手写图表与读懂图表库源码的共同地基。本篇按「映射、轴、更新、无障碍」四步把骨架搭完整。

## 2. 核心概念：比例尺——数据到像素的翻译官

### 2.1 线性比例尺：手写只要五行

```js
function linearScale(domain, range) {
  const [d0, d1] = domain;   // 数据的取值范围，如 [0, 1200]
  const [r0, r1] = range;    // 屏幕的目标范围，如 [0, 400]
  const k = (r1 - r0) / (d1 - d0);          // 缩放系数
  return (v) => r0 + (v - d0) * k;          // 数据值 -> 屏幕坐标
}

const y = linearScale([0, 1200], [400, 0]); // 注意 range 反着写
y(0);    // => 400   数据 0 画在画布底部
y(1200); // => 0     数据最大值画在画布顶部
y(600);  // => 200   中点在正中
```

逐行讲解：

- **domain 是数据空间，range 是屏幕空间**，比例尺就是这两个区间之间的仿射映射。任何「数据不对劲」先检查这两个区间的方向与边界；
- `range` 写 `[400, 0]` 而不是 `[0, 400]`：SVG 的 y 轴向下（见 [坐标系与 viewBox](/svg/030-SVGCoordinateSystemViewBox)），数据越大越要靠上，所以把屏幕区间的两端**倒过来写**，y(值) 直接就是可用的 cy/y 坐标。这是比例尺最优雅的一步——「向上为正」的语义被吸进了函数里，调用处不再出现任何减法；
- 换成别的写法会发生什么：如果在调用处手写 `400 - value / 3`，刻度、网格、提示框里每一处都要重复这个算式，改一处漏一处；比例尺把算式收敛成唯一出口。

易错点：domain 的下界写死 0。数据全在 [800, 1200] 区间时，从 0 起映射会浪费 2/3 画布高度；合理做法是取数据实际范围再留 5% 余量。但**柱状图例外**——柱图从非零起画是经典的视觉误导，宁可视化浪费也不能误导。

### 2.2 对数与序数：两种数据就要换两把尺

```js
// 对数比例尺：数量级差异巨大的数据（接口耗时 1ms 到 10s）
function logScale(domain, range) {
  const [d0, d1] = domain.map(Math.log10);
  const [r0, r1] = range;
  const k = (r1 - r0) / (d1 - d0);
  return (v) => r0 + (Math.log10(v) - d0) * k;
}

// 序数比例尺：类别数据（季度、渠道名），离散位置分配
function bandScale(domain, range, padding = 0.2) {
  const step = (range[1] - range[0]) / domain.length;
  const band = step * (1 - padding);
  const map = new Map(domain.map((d, i) => [d, i]));
  return {
    center: (d) => range[0] + (map.get(d) + 0.5) * step, // 类别中心，放文字
    band,                                                 // 每格带宽，放柱宽
  };
}
```

选型口诀：**数值连续用线性、跨数量级用对数、类别离散用序数**。接口耗时监控里 1ms 与 10s 同图时，线性尺会把 1ms 那根线压成 0 像素——对数尺让每个数量级占同等高度；季度名「Q1/Q2/Q3」是类别不是数，用序数尺分配等宽格位，柱宽从 band 来、标签从 center 来。

### 2.3 气泡图要多一把半径尺

面积应正比于数值，所以半径要用**开方比例尺**：`r = Math.sqrt(value / maxValue) * rMax`。直接线性映射到半径会让大数值的气泡面积呈平方膨胀，视觉上夸大差异。这是地图气泡图最常被忽略的一处失真。

## 3. 坐标轴与网格线：轴是数据结构，不是装饰

### 3.1 轴的标准 SVG 结构

```svg
<g class="axis axis-y" aria-hidden="true">
  <line x1="60" y1="20" x2="60" y2="420" stroke="#2f3640" />       <!-- 轴线 -->
  <g class="tick" transform="translate(60, 200)">                   <!-- 每个刻度一组 -->
    <line x1="0" y1="0" x2="-6" y2="0" stroke="#2f3640" />          <!-- 刻度线 -->
    <text x="-10" y="4" text-anchor="end" font-size="12">600</text> <!-- 刻度值 -->
  </g>
  <!-- 其余刻度同构 -->
</g>
```

结构要点：

- 整条轴包在一个 `g` 里，每个刻度又是一个 `g`，用 `transform="translate(x, y)"` 定位——**刻度内部坐标永远是 (0,0) 起算的局部坐标**，生成代码因此不需要为每个刻度算绝对坐标。这个「分组 + 局部坐标系」的模式是 090 变换一节在图表里的直接应用；
- `text-anchor="end"` 让刻度值右对齐贴着刻度线，数字位数不同也不会左右乱跳；
- 刻度值从比例尺来：在 JS 里对 domain 取 5 到 6 个「好看」的步长（1、2、5 乘 10 的幂），`ticks.forEach(t => g.append(...))` 生成。手写刻度值（每 100 一个）遇到 1200 的 domain 就会多出一截没有刻度的轴。

### 3.2 网格线与轴的取舍

网格线是从每个 y 刻度横贯绘图区的细线，`stroke="#e0e0e0"`、放在数据图层**之下**（文档顺序在前）。两条工程经验：

- 网格线跟着刻度走，同一个 ticks 数组既生成刻度又生成网格，两者永不错位；
- 横向柱状图把轴与网格一起转 90 度比竖排长标签更可读——类别名（如「华东大区」「西南大区」）竖排必然截断，横排有完整宽度可用。

坐标轴箭头用上一学的 marker 挂在轴线两端即可（`marker-end="url(#axis-arrow)"`），不再手画三角形。

## 4. 数据驱动更新：enter / update / exit 三分法

### 4.1 心智模型

数据变更是图表的常态（轮询刷新、筛选联动）。把「数据集」到「图形元素集」的关系想成三个集合的运算：

- **enter**：新数据里有、页面上没有的——创建元素；
- **update**：两边都有的——只改属性，不重建；
- **exit**：页面上有、新数据里没有的——移除。

```js
const rects = svg.selectGroup('bars').selectAll('rect');
const bound = rects.data(newData, (d) => d.name); // 第二参数是 key，按业务键对齐

// enter：新建，从 0 高度起步
bound.enter().append('rect')
  .attr('class', 'bar')
  .attr('y', y(0)).attr('height', 0);

// update：所有柱（含刚 enter 的）统一落到目标状态
svg.selectGroup('bars').selectAll('rect')
  .attr('x', (d) => x.center(d.name) - x.band / 2)
  .attr('width', x.band)
  .attr('y', (d) => y(d.value))
  .attr('height', (d) => y(0) - y(d.value));

// exit：移除多余柱
bound.exit().remove();
```

逐段讲解：

- `data(newData, d => d.name)` 的第二个参数是**对齐键**。不给键时 d3 按下标对齐，数据重排会把 A 公司的数据过渡到 B 公司的柱子上——数值「正确」但归属全错，这是数据更新里最阴险的 bug。手写实现时同理：必须按业务键建立 Map 再比对，不能按数组下标；
- enter 只负责「出生」（高度 0），update 负责所有元素「就位」——两个阶段分离后，新生柱与存量柱走同一段定位代码，不会出现新柱位置对、旧柱位置漂的分裂；
- 删掉的写法差异：`exit().remove()` 直接消失；配上 CSS transition 则先收成 0 高再删，视觉上是「缩回去」。

### 4.2 过渡：CSS transition 就够，不必 JS 逐帧

```css
.bar {
  transition: y 0.4s ease, height 0.4s ease;
}
```

SVG 几何属性 `y`/`height`/`x`/`width`/`cx`/`r` 在现代浏览器里都是可过渡的 CSS 属性（它们已映射为 CSS 属性），数据更新时只改属性、动画交给 CSS：**代码只描述起止状态，中间帧浏览器补**。与 150 篇的 SMIL/JS 动画对照：SMIL 适合声明式的循环装饰动画，数据驱动的过渡用 CSS 最省事；大量元素（数千）同时过渡时再用 160 篇的 transform 优化思路评估。

易错点：给 `y`/`height` 写 transition 后，**初次挂载也会从 0 过渡**（这正是想要的入场动画），但若元素被整棵重建（innerHTML 重设），transition 失效——这就是必须用 enter/update 分离而不是整图重绘的最终理由。

## 5. 图表无障碍：最小可行组合

图表默认对屏幕阅读器是「一堆无语义的矩形」。最小修补三件套：

```html
<svg viewBox="0 0 480 460" role="img"
     aria-labelledby="chart-title chart-desc">
  <title id="chart-title">2024 年各季度销售额</title>
  <desc id="chart-desc">柱状图。Q1 至 Q4 销售额依次为 820、960、1240、1100 万元，第三季度最高。</desc>
  <!-- 图形内容 -->
</svg>
```

- `role="img"` 把整张图声明为一个图像原子，内部图形对辅助技术静默，避免逐个朗读矩形；
- `<title>` 一句话结论、`<desc>` 关键数字，经 `aria-labelledby` 关联——只裸放 title 朗读行为不稳定（见 175 篇的机制详解）；
- **表格替代方案**：复杂图表（多系列、多维度）旁边提供真实的数据 `<table>`（可用 CSS 视觉隐藏但保留给屏幕阅读器），数字检索效率远超任何文字描述。这是 WCAG 认可的标准替代路径，细节见 175 篇。

装饰性网格线、坐标轴加 `aria-hidden="true"`，它们不携带结论信息。

## 6. 三个工程场景

### 场景一：告警大屏的接口耗时折线

真实背景：SRE 大屏每 10 秒刷新一次各接口 P99 耗时，耗时跨度 2ms 到 9s，需要新数据滑入、超阈值段变红：

```js
const width = 800, height = 300, margin = { top: 20, right: 20, bottom: 30, left: 60 };
const y = logScale([1, 10000], [height - margin.bottom, margin.top]); // 1ms 到 10s
const x = linearScale([0, 59], [margin.left, width - margin.right]);  // 最近 60 个点

function render(points) {
  const path = points.map((p, i) =>
    `${i ? 'L' : 'M'} ${x(i).toFixed(1)} ${y(p.ms).toFixed(1)}`).join(' ');
  const danger = points.some((p) => p.ms > 3000);
  const line = svg.querySelector('.p99-line');
  line.setAttribute('d', path);
  line.classList.toggle('is-danger', danger);
}
```

讲解：

- **对数比例尺**是这条线的命门：9s 的尖峰与 2ms 的常态同图，线性尺会把常态压成一条贴底直线，告警失去对比意义；
- 滚动窗口数据的更新策略：60 个点全部重算 `d`（点数固定，没有 enter/exit 问题），配合 `transition: d` 或直接切换——折线的 update 就是「换一条 path」，比逐点挪 circle 便宜得多；
- 阈值线（3s）是 `y(3000)` 处的一条虚线 + 红色，**画在数据层下、轴层上**；超阈值时用 class 切换线的描边色，transition 负责颜色渐变。这里的 3000 应来自配置而非写死，告警阈值是运营参数。

### 场景二：季度报表柱状图（序数尺 + enter/update）

真实背景：财务后台按季度出报表，四个季度固定但金额随筛选年份变化，要求切换年份时柱子平滑过渡：

```js
const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
const x = bandScale(quarters, [margin.left, width - margin.right]);
const y = linearScale([0, maxOf(data) * 1.1], [height - margin.bottom, margin.top]);

const bars = gBars.selectAll('rect').data(data, (d) => d.quarter);
bars.enter().append('rect')
  .attr('class', 'bar')
  .attr('x', (d) => x.center(d.quarter) - x.band / 2)
  .attr('y', y(0)).attr('height', 0)
  .merge && null; // 手写实现里 enter 后直接进入下方统一 update 即可

gBars.selectAll('rect')
  .attr('x', (d) => x.center(d.quarter) - x.band / 2)
  .attr('width', x.band)
  .attr('y', (d) => y(d.value))
  .attr('height', (d) => y(0) - y(d.value));
bars.exit().remove();
```

讲解：

- 季度是类别数据，用 **bandScale** 而不是线性尺：柱宽从 band 来（`x.band`），标签放在格子中心（`x.center`），四根柱自动均分画布且留有间距；
- `y` 的上界取「数据最大值乘 1.1」留出头部余量，顶端数值标签不会顶到画布边；**domain 上界随数据动态计算**，切换年份时先更新比例尺再更新柱子，两步都做完 CSS transition 才会全程生效；
- 柱顶数值标签与柱子同步更新：同样的 enter/update 模式作用于 `text` 元素，`y` 用 `y(d.value) - 6` 微调到柱顶上方。漏更新标签是柱图改值后「图变字没变」的直接原因。

### 场景三：区域分布气泡图（开方半径 + 地图叠加）

真实背景：运营后台在省域轮廓 SVG 上叠加各城市订单量气泡：

```js
const maxOrders = Math.max(...cities.map((c) => c.orders));
const rScale = (v) => Math.sqrt(v / maxOrders) * 24; // 半径最大 24px

const dots = gDots.selectAll('circle').data(cities, (d) => d.city);
dots.enter().append('circle')
  .attr('class', 'bubble')
  .attr('cx', (d) => d.cx).attr('cy', (d) => d.cy)  // 城市坐标由设计稿标定
  .attr('r', 0).attr('fill', 'rgba(79, 91, 213, 0.45)')
  .attr('stroke', '#4f5bd5');
gDots.selectAll('circle').attr('r', (d) => rScale(d.orders));
dots.exit().remove();
```

讲解：

- **半径开方映射**：数值 4 倍的城市气泡半径只翻一倍，面积才真正 4 倍——直接线性映射半径会让头部城市面积 16 倍于尾部，视觉严重夸大；
- 城市屏幕坐标来自设计稿标定（或地图投影库），本篇不展开投影；关键是气泡图层 `gDots` 与底图分层，底图换肤不影响数据层；
- 气泡过密时的降级：先按半径排序让小气泡画在上层可点，再考虑 160 篇的节点数预算；城市数超几百就改聚合（按省合并再画一个大气泡）。

## 7. 修改实验

1. 把 2.1 线性比例尺的 range 改回 `[0, 400]`（不反转），观察数据「向下生长」的现场，然后只改 range 恢复正常——体会语义收敛在比例尺里的好处；
2. 场景二里给 `y` 的 domain 上界改成固定 1000，再传入一个 1500 的数据点，观察柱子越界的现场并修复（提示：`clamp` 或动态上界二选一，说清各自副作用）；
3. 给场景一的折线加一条均值线：对 points 求均值后画横虚线，数据刷新时均值线用 CSS transition 平滑移动；
4. 把场景二的数据换成包含负值（某季度亏损），先用现有比例尺观察柱子「向上穿轴」的 bug，再改成带正负域的对称映射修复。

## 8. 小练习

预测题：`linearScale([0, 1200], [400, 0])` 下，数据 300 对应的 y 坐标是多少？若这是柱图，柱子的 `y` 与 `height` 各是多少？

修 Bug 题：季度柱图切换年份后，柱子平滑过渡到新高度，但柱顶数值标签瞬间跳变——最可能的原因是什么？

挑战题（不看提示）：为场景三补充「点击气泡弹出城市名与订单量」的提示层，要求提示框不超出画布（右缘城市向左弹）。给出定位计算式。

先自己推理，再展开参考答案对照：

<details>
<summary>参考答案（先自己推，再展开对照）</summary>

预测题：y(300) = 400 + (300 - 0) 乘 (0 - 400)/1200 = 400 - 100 = 300，即屏幕纵向 300px 处。柱子从基线 y(0)=400 向上长到 300，所以 `y="300"`、`height="100"`（height 恒等于 y(0) - y(值)）。算出 height 为负说明把 range 当成正序了。

修 Bug 题：柱子是 rect，走了 enter/update 与 CSS transition；标签 text 的 y 多半在 enter 时设置后没有进入统一 update 段（或标签整棵重建导致 transition 失效）。修复：把 text 与 rect 放进同一个 update 流程，用同一个比例尺算 `y(d.value) - 6`；确认 text 是被修改属性而不是被重建。

挑战题：提示框锚点取气泡圆心 `cx, cy`，框宽 w、高 h；`left = cx + r + 8`，当 `left + w > 画布宽 - 4` 时改 `left = cx - r - 8 - w`（右侧放不下换左侧）；`top = clamp(cy - h / 2, 4, 画布高 - h - 4)`。要点：用半径 r 做锚点偏移让框贴着气泡外缘，clamp 防上下越界；框若用 foreignObject 实现，记得 115 篇的命名空间与适用边界。

</details>

## 9. 什么时候手写图表 / 什么时候用库

手写：大屏与邮件等体积敏感场景、图表结构特殊（地图叠加、组合图形）、需要完全掌控 SVG 输出的组件库。用库：常规 CRUD 报表、需要 tooltip/图例/缩放全套交互、交付时间紧。即便用库，本篇的比例尺与 enter/update 心智模型也是读懂 d3/ECharts 源码与排查图表 bug 的通用语言。

## 10. 与之前和之后的知识的关系

- 往前：映射与轴建立在 030 的坐标系与 050 的 path 之上；轴箭头来自 115 的 marker；过渡动画对照 150 的三种动画机制；
- 往后：175 篇把本篇的 role=img/表格替代展开成完整无障碍体系；160 篇决定大数据点时的性能兜底（何时放弃 SVG 改 Canvas）；165 篇让本篇的图表随容器自适应。

## 11. 官方文档

- MDN：SVG 与 CSS 可过渡属性：https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_animated_properties
- d3-scale（比例尺参考实现）：https://github.com/d3/d3-scale
- WCAG 非文本内容（1.1.1）：https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html

## 12. 自我检查

- 能白板手写线性比例尺并解释 range 反转的原因；
- 能说出线性/对数/序数三种尺各对应什么数据特征；
- 能按 enter/update/exit 三分法口述一次数据刷新的完整流程；
- 能给一张裸图表配齐 role=img、title/desc、表格替代三件套。

## 本章总结

比例尺把「数据值」与「屏幕像素」解耦，range 反转吸收 y 轴向下的语义；轴与网格是跟着刻度数组生成的数据结构而非装饰；数据更新按 enter/update/exit 三分，配 CSS transition 描述起止状态；无障碍最小三件套是 role=img、title/desc 与表格替代。这四件事构成所有 SVG 图表的公共骨架，也是一切图表库 API 背后的通用语言。

## 下一步

进入 [响应式 SVG](/svg/165-SVGResponsiveTechniques)：让本篇的图表随容器与设备特性自适应；或直接跳到 [SVG 可访问性](/svg/175-SVGAccessibilityPrinciples) 深化图表的辅助技术支持。
