---
order: 210
title: 响应式 SVG：流式适配、容器查询与媒体特性
module: 'svg'
category: 前端技术
difficulty: beginner
description: 让一份 SVG 在按钮、卡片与大屏之间自由伸缩——viewBox 流式范式、preserveAspectRatio 取值、流式内容切换、Container Queries 与媒体特性
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：响应式 SVG——同一份图形资源如何随容器尺寸、设备能力自动适配。这是「性能优化」（见 [SVG 性能优化](/svg/160-SVGPerformanceOptimization)）之外 SVG 工程化的另一半。
- **解决什么问题**：一个图标要同时出现在 16px 按钮和整幅营销海报上；一张数据图在桌面端显示完整版、移动端只显示简化版；海报在超宽 banner 里被 meet 引擎加上两条难看的白边。这些问题都不该靠「再导出一份不同尺寸的文件」解决。
- **什么时候用到**：图标系统接入主题与多尺寸场景；图表组件要塞进任意宽度的卡片；同一插画用于官网 hero 区、移动端 banner 与 OG 分享图。
- **本篇不讲**：viewBox 的坐标原理（见 [坐标系与 viewBox](/svg/030-SVGCoordinateSystemViewBox)）、大节点数下的渲染性能（见 160 篇）、动效降级的无障碍语义（见 [可访问性](/svg/175-SVGAccessibilityPrinciples)）。

## 学习目标

1. 掌握「元素只写 viewBox + 外部 CSS 控尺寸」的响应式黄金范式，并能解释为什么宽高比一致时留白消失；
2. 按场景选对 preserveAspectRatio：meet 保完整、slice 保铺满、none 牺牲比例，并记住九宫格对齐段的全部取值；
3. 用媒体查询与 Container Queries 分别实现「按视口切换内容」与「按容器切换内容」，说清两者的适用边界；
4. 了解 prefers-color-scheme、prefers-reduced-motion、hover/pointer 等媒体特性在 SVG 里的响应式用法。

预计 40 到 55 分钟。

## 1. 你现在要解决什么问题

PNG 时代的响应式做法是导出 @1x/@2x/@3x 多套图再靠 srcset 挑选。SVG 理论上是矢量的、可以无限缩放，但实践中「缩放了」不等于「适配了」：图表被塞进 16:9 的横条卡片时按 meet 引擎上下留白；图标在移动端等比缩到 12px 后点击热区过小；桌面端的复杂细节图在手机上成了糊成一片的缩小版。响应式 SVG 要解决的就是这三层问题：**尺寸随容器（CSS 的事）、比例随策略（preserveAspectRatio 的事）、内容随环境（媒体查询与容器查询的事）**。

## 2. 基石范式：只声明 viewBox，尺寸交给外部 CSS

### 2.1 最小可运行示例

```html
<svg viewBox="0 0 400 300" class="responsive">
  <!-- 内容 -->
</svg>
```

```css
.responsive {
  width: 100%;
  height: auto;
  display: block;
}
```

> 不指定 width/height，仅声明 viewBox，让外层 CSS 控制实际尺寸。SVG 会按宽高比自动缩放。

逐项拆解：

- 删掉 width/height 只留 viewBox 后，svg 元素的固有宽高比由 viewBox 决定（现代浏览器均支持），`width: 100%; height: auto` 的表现与一张图片完全一致：宽度随容器、高度按比例、永不变形；
- `display: block` 去掉 svg 作为替换元素底部的基线空隙（与 img 同源的老问题）；
- 反例：同时在标签上写死 `width="400" height="300"` 又想让 CSS 拉伸——属性作为表现提示存在，CSS 能覆盖，但源码里两套尺寸并存会误导后续维护者去改属性而不是改样式。源文件只留 viewBox，尺寸永远一个出口。

### 2.2 preserveAspectRatio：比例不一致时的让步策略

```html
<!-- 完整显示，留白 -->
<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
  <!-- 4:3 内容在 16:9 容器中会上下留白 -->
</svg>

<!-- 填满容器，可能裁剪 -->
<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
  <!-- 4:3 内容在 16:9 容器中左右被裁 -->
</svg>
```

取值由「九宫格对齐 + 缩放策略」两段组成（`none` 单独使用，直接拉伸不保比例）：

| 对齐段     | 说明                                                              |
| ---------- | ----------------------------------------------------------------- |
| `xMin/xMid/xMax` | 水平方向：靠左 / 居中 / 靠右                                |
| `YMin/YMid/YMax` | 垂直方向：靠上 / 居中 / 靠下                                |
| `meet`     | 完整显示内容，不足处留白（默认值 `xMidYMid meet`）                |
| `slice`    | 填满视口，超出部分被裁剪                                          |
| `none`     | 不保持宽高比，拉伸变形铺满                                        |

场景化的选法：图标与图表用 meet（信息不容裁切）；整幅海报、背景插画用 slice（构图完整比局部完整重要）；`none` 只用于刻意变形的装饰（如拉伸的渐变条）。对齐段的实际价值在 slice 下最明显——`xMinYMin slice` 是「取左上角」的裁切视角，头图聚焦人物左上区域时用它，不用改 viewBox 的 minX/minY。

### 2.3 CSS aspect-ratio：给容器兜住宽高比

```css
.chart {
  width: 100%;
  aspect-ratio: 4 / 3;
}
```

```html
<svg class="chart" viewBox="0 0 400 300">...</svg>
```

确保容器保持宽高比，避免 SVG 高度坍塌。

讲解：宽高比一致时（容器 4/3、viewBox 4/3），meet 留白恰好为零，`aspect-ratio` 因此是消灭意外留白的最直接手段。它把「这个位置的图形期望什么比例」声明在容器上，和 svg 自身的 preserveAspectRatio 形成两层保险：容器层保证占位比例、图形层决定万一不一致时谁让步。不写 aspect-ratio 时，容器高度由内容撑开——svg 在 `height: auto` 下其实也能撑，但容器还裹着其他流内容时（标题 + 图 + 说明）就会出高度抖动。

## 3. 断点式尺寸变体：不等比缩放才是常态

图标类 SVG 常用「断点改尺寸」而非等比缩放，保证小屏上的点击与视觉密度：

```css
.responsive-icon {
  width: 32px;
  height: 32px;
}

@media (max-width: 768px) {
  .responsive-icon {
    width: 24px;
    height: 24px;
  }
}

@media (max-width: 480px) {
  .responsive-icon {
    width: 16px;
    height: 16px;
  }
}
```

```html
<svg class="responsive-icon" viewBox="0 0 24 24"><use href="#icon-menu" /></svg>
```

为什么不做等比缩放：导航栏在 375px 宽的屏幕上等比缩小后图标只剩 12px，低于 44x44 的最小点击热区规范；断点式让图标在小屏保持可用尺寸、由间距与布局吸收差值。**图标是交互控件，密度优先于等比**；插画与图表才是「随容器流动」的候选。

## 4. 流式 SVG：同一份文件里按环境切换内容

### 4.1 媒体查询写在 SVG 内部

不同屏幕显示不同内容：

```html
<svg viewBox="0 0 400 200">
  <style>
    .mobile-only {
      display: none;
    }
    .desktop-only {
      display: block;
    }

    @media (max-width: 600px) {
      .mobile-only {
        display: block;
      }
      .desktop-only {
        display: none;
      }
    }
  </style>
  <g class="mobile-only">
    <!-- 移动端简化版 -->
    <text x="200" y="100" text-anchor="middle" font-size="20">简化视图</text>
  </g>
  <g class="desktop-only">
    <!-- 桌面端完整版 -->
    <text x="200" y="50" text-anchor="middle" font-size="32">完整视图</text>
    <text x="200" y="100" text-anchor="middle" font-size="16">更多细节</text>
  </g>
</svg>
```

讲解：`<style>` 写在 SVG 内部时，媒体查询的判定基准是**该 SVG 所在文档的视口**（inline 时即页面视口；经 img 引用时是 img 元素所在文档的视口）。这带来两个工程含义：

- 简化版与完整版**同时存在于 DOM**，display 只是视觉隐藏——文件体积是两版之和，复杂插画要掂量（对比 160 篇的节点预算）；
- 经 `<img>` 引用的外链 SVG 内部样式与媒体查询依然生效（它们不算「外部资源」），所以这份文件可以直接当图片用，适配逻辑跟着文件走。

### 4.2 文字随容器「呼吸」：em 相对单位

文本还可以用 em 相对单位随容器呼吸：给 `<svg>` 设一个基准 `font-size`，图内文字统一用 em，改一处即可整体缩放。

```html
<svg viewBox="0 0 400 200">
  <text x="200" y="100" text-anchor="middle" font-size="2em">响应式文本</text>
</svg>
```

```css
svg {
  font-size: 16px;
}

@media (max-width: 600px) {
  svg {
    font-size: 12px;
  }
}
```

原理：SVG 的 font-size 与 CSS 一样参与继承，`font-size="2em"` 解析为 svg 基准值的两倍。基准从 16px 降到 12px，所有 em 计价的文字等比缩小，而形状坐标不变——文字密度独立于图形缩放调节，这是修复「缩小后文字糊掉」的最轻手段。注意 em 只对 font-size 类文字属性有意义，形状几何属性没有 em 概念。

## 5. Container Queries：跟着容器而不是视口变

```css
.chart-container {
  container-type: inline-size;
}

@container (max-width: 400px) {
  .chart .detailed {
    display: none;
  }
}
```

```html
<div class="chart-container">
  <svg class="chart" viewBox="0 0 400 300">
    <g class="detailed">...</g>
  </svg>
</div>
```

根据容器宽度（而非视口）响应式显示。

对比媒体查询的本质差异：同一个图表组件放进侧栏（300px）与主区（800px）时，视口可能都是 1200px——媒体查询对「组件所在位置」无感，组件只能靠容器查询知道自己多宽。组件化页面（设计系统、仪表盘栅格）里容器查询才是图表的正确开关；媒体查询留给「整页级」的布局换版。两者可以叠加：外层用媒体查询换整页骨架，内层用容器查询管组件自身的显隐与密度。

注意：`@container` 规则写在页面 CSS 里即可命中 inline SVG 的后代（同文档 CSS 树），写在 SVG 内部 `<style>` 里时查的是 SVG 外层最近的可查询容器，同样有效——但经 img 引用时不生效（img 内文档没有可查询容器），需要容器级适配的图示必须 inline。

## 6. 媒体特性：让 SVG 响应设备能力

媒体查询家族里除了宽度，还有一组「设备能力」特性，SVG 内部样式同样可用：

```html
<svg viewBox="0 0 200 200">
  <style>
    .badge-bg { fill: #ffffff; stroke: #dcdde1; }
    .badge-fg { fill: #2f3640; }

    @media (prefers-color-scheme: dark) {
      .badge-bg { fill: #2d3436; stroke: #636e72; }
      .badge-fg { fill: #dfe6e9; }
    }

    @media (hover: none) and (pointer: coarse) {
      /* 触屏：放大点击热区相关的透明命中区域 */
      .hit { display: block; }
    }

    @media (prefers-reduced-motion: reduce) {
      .pulse { animation: none; }
    }
  </style>
  <rect class="badge-bg" x="10" y="10" width="180" height="180" rx="16" />
  <text class="badge-fg" x="100" y="110" text-anchor="middle" font-size="24">状态</text>
</svg>
```

逐项说明：

- `prefers-color-scheme`：跟随系统深浅色切换图形配色，让内联徽标、插图在暗色页面里不再「白块刺眼」；色彩的具体对比度要求见 175 篇；
- `hover: none` + `pointer: coarse`：识别触屏环境，典型用法是放大透明命中区或停用 hover 依赖的提示（触屏没有 hover）；
- `prefers-reduced-motion`：减弱动态偏好下停用循环动画——在响应式篇它是「设备特性适配」，在无障碍语境是用户权利（完整语义见 175 篇），两篇互补。

## 7. 三个工程场景

### 场景一：同一图标适配按钮与大屏卡片

真实背景：营销活动页同一枚「分享」图标既要进 40px 高的按钮（16px 图标），又要出现在 320px 宽的卡片头部（48px 图标），还要上 1920px 大屏（96px）。图标文件一份：

```html
<!-- icon-share.svg：内容坐标 0-24，只有 viewBox -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path d="M12 3 L20 10 L15 10 C15 16 10 19 4 20 C7 16 8 12 8 10 L3 10 Z"
        fill="currentColor" />
</svg>
```

```html
<button class="btn"><svg class="icon icon-sm" aria-hidden="true"><use href="#icon-share" /></svg>分享</button>
<div class="card"><svg class="icon icon-lg" aria-hidden="true"><use href="#icon-share" /></svg></div>
```

```css
.icon { fill: currentColor; }
.icon-sm { width: 16px; height: 16px; }
.icon-lg { width: 48px; height: 48px; }
@media (min-width: 1440px) {
  .card .icon-lg { width: 96px; height: 96px; }
}
```

讲解：尺寸差异全部由 CSS 类承担，图标文件零改动——viewBox 解耦坐标系与显示尺寸的直接回报（030 篇的挑战题结论在工程里的样子）。大屏断点用 `min-width` 增量增强；`currentColor` 让按钮内图标继承按钮文字色、卡片内继承卡片色，同一文件三处三色。

### 场景二：响应式数据条（呼应 CSS 样式化篇实战）

真实背景：130 篇实战里用 rect + width 做的数据条，要求在窄容器里自动变细并隐藏数值标签、宽容器里恢复。用容器查询实现组件级自适应：

```html
<div class="stat">
  <svg class="stat-bar" viewBox="0 0 200 24" preserveAspectRatio="none">
    <rect class="track" x="0" y="8" width="200" height="8" rx="4" />
    <rect class="fill" x="0" y="8" width="140" height="8" rx="4" />
  </svg>
  <svg class="stat-num" viewBox="0 0 40 24"><text x="20" y="17" text-anchor="middle">70%</text></svg>
</div>
```

```css
.stat { container-type: inline-size; display: flex; align-items: center; gap: 8px; }
.stat-bar { flex: 1; height: 24px; }
.stat-num { width: 40px; height: 24px; }

@container (max-width: 240px) {
  .stat { flex-direction: column; }
  .stat-num { display: none; }   /* 窄容器隐藏数值，hover 或长按再显示 */
  .stat-bar { height: 12px; }
}
```

讲解：数据条用 `preserveAspectRatio="none"` 让 200x24 的坐标系**沿宽度拉伸**——进度条的填充宽度是数据语义（140/200 = 70%），纵向高度无关紧要，none 是这里唯一正确的策略，meet 会让它在宽容器里上下留白、slice 会裁掉填充终点。数值标签独立成 svg 以便整块显隐；容器查询让同一组件在侧栏卡片与全宽表格里自动换形态。

### 场景三：海报图的裁切控制

真实背景：运营在 CMS 上传一张 4:3 主视觉 SVG，要同时投到 16:9 首页 banner（裁切）、1:1 分享卡（裁切）与 4:3 详情页（完整）。关键是把「视觉重心」放进构图，让 slice 裁掉的都是可牺牲区：

```html
<!-- 主视觉：viewBox 400x300，主体居中偏上，左右两侧是留白装饰 -->
<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" class="poster">
  <!-- 远景装饰：贴边，允许被裁 -->
  <g class="deco" opacity="0.4">
    <circle cx="20" cy="40" r="60" fill="#dfe6e9" />
    <circle cx="390" cy="260" r="80" fill="#dfe6e9" />
  </g>
  <!-- 主体：安全区内 -->
  <g class="subject">
    <rect x="140" y="90" width="120" height="120" rx="12" fill="#4f5bd5" />
    <text x="200" y="160" text-anchor="middle" font-size="20" fill="#fff">主标题</text>
  </g>
</svg>
```

```css
.banner { width: 100%; aspect-ratio: 16 / 9; }  /* slice 自动裁上下 */
.share-card { width: 200px; aspect-ratio: 1 / 1; }
.detail { width: 100%; aspect-ratio: 4 / 3; }   /* 比例一致，无裁切 */
```

讲解：slice 裁切沿两个方向对称进行（xMidYMid 下各裁一半），所以**主体必须留在画布中央安全区**——本例把主体限制在 x 140-260、y 90-210 的中央区域，两侧贴边的装饰圆承担「被裁」的职责。设计阶段与设计师约定安全区（可用虚线框在源文件标注、交付前删除），是 slice 方案能否落地的前提；若主体本就铺满画布，slice 必然裁掉关键内容，那就退回 meet 接受留白或按渠道单独出图。

## 8. 修改实验

1. 把 2.1 示例的 `.responsive` 高度改成固定 `height: 200px`（宽度仍 100%），观察 meet 引擎在宽容器里的留白，再改 `preserveAspectRatio="xMidYMid slice"` 对比——总结「容器比例失控时两个引擎各自的代价」；
2. 给 4.1 的流式 SVG 增加第三种形态：`@media (max-width: 380px)` 下连简化版也隐藏副标题（加一个 .compact-only 组）；
3. 把场景二的数据条复制进两个不同宽度的卡片容器，验证容器查询分别命中不同分支，再把它放进经 img 引用的外链 SVG 里验证失效——亲手确认「容器查询要求 inline」；
4. 在场景三上把 preserveAspectRatio 换成 `xMinYMid slice`，观察构图重心偏移的方向，回答「为什么分享卡场景反而适合 xMidYMid」。

## 9. 小练习

预测题：`viewBox="0 0 400 300"` 的图表放进 `aspect-ratio: 16 / 9` 且宽度 640px 的容器，默认 preserveAspectRatio 下上下各留白多少像素？

修 Bug 题：设计系统里的图标组件在侧栏（视口 1440px、侧栏 280px）里应显示简化版，用 `@media (max-width: 600px)` 写的断点从不命中。说明原因并给出两种修复路径。

挑战题（不看提示）：一份内联 SVG 需求：暗色系统下自动换配色、触屏设备上放大命中区、且放在任何宽度的卡片里都保持 4:3。写出该 SVG 的关键结构与三段 CSS。

先自己推理，再展开参考答案对照：

<details>
<summary>参考答案（先自己推，再展开对照）</summary>

预测题：容器 640x360（16/9），viewBox 4/3。meet 系数取 min(640/400, 360/300) = 1.2，内容缩放为 480x360，横向占 480、剩余 160px 左右各留 80——注意是**左右留白、上下为 0**（宽容器装「相对更方」的内容，短边在横向）。若算成上下留白，是把 meet 系数取成了 max。

修 Bug 题：媒体查询判的是视口（1440px），侧栏只有 280px 但视口远大于断点，永远不命中。修复路径一：给侧栏容器加 `container-type: inline-size`，改用 `@container (max-width: 300px)` 判组件所在容器；路径二：组件内部对「简化/完整」的切换改由 JS 读容器实际宽度（ResizeObserver）控制 class——容器查询是声明式的首选，JS 是兼容兜底。

挑战题：SVG inline 写入页面，内部 `<style>` 三段——`@media (prefers-color-scheme: dark)` 切换 fill/stroke 的配色类；`@media (hover: none) and (pointer: coarse)` 把透明命中 rect 的宽高或 opacity 调大（或显示专门的 .hit 层）；外层容器 CSS 用 `aspect-ratio: 4 / 3` + svg `width: 100%; height: 100%`（或 width:100%; height:auto 且容器比例一致）保证任意宽度下 4:3。三件事分属三类响应维度：设备偏好、输入方式、容器尺寸，各用各的机制，互不替代。

</details>

## 10. 什么时候用哪种适配手段

| 手段 | 判定基准 | 典型场景 |
| --- | --- | --- |
| width/height: auto + viewBox | 容器 | 等比缩放的默认起点 |
| aspect-ratio | 容器 | 锁定占位比例、消灭抖动 |
| preserveAspectRatio | 图形内部 | 比例不一致时的让步策略 |
| 媒体查询 | 视口 | 整页布局换版、设备特性 |
| 容器查询 | 组件容器 | 组件级显隐与密度 |
| em 文字 | svg 基准 font-size | 文字密度独立调节 |

## 11. 与之前和之后的知识的关系

- 往前：整个响应式体系的地基是 030 的「视口 + 取景框」分工与 preserveAspectRatio 语义；2.3 的容器比例与 130 的样式接管一脉相承；
- 往后：160 篇决定「响应式内容切换」的体积代价上限（两版共存 = 节点翻倍）；175 篇接管 prefers-reduced-motion 的无障碍语义与动效降级规范。

## 12. 官方文档

- MDN：Responsive SVG（响应式 SVG 图像）：https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_as_an_image
- MDN：CSS Container Queries：https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries
- MDN：使用媒体查询：https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_media_queries/Using_media_queries

## 13. 自我检查

- 能口头复述「只写 viewBox + 外部 CSS 控尺寸」范式及 `height: auto` 依赖的固有宽高比来源；
- 能按场景为 meet/slice/none 各举一个真实用例；
- 能说清媒体查询与容器查询的判定基准差异及各自失效条件；
- 知道流式 SVG 的「双版本共存」体积代价。

## 本章总结

响应式 SVG 的分工表：容器管占位（aspect-ratio + width:100%），viewBox 管坐标系，preserveAspectRatio 管比例不一致时的让步，媒体查询管视口与设备特性，容器查询管组件自身宽度，em 管文字密度。同一份文件要同时服务按钮与海报，靠的不是导出多套，而是把这六层职责各就各位。

## 下一步

进入 [SVG 性能优化](/svg/160-SVGPerformanceOptimization)：响应式内容切换会让节点翻倍，先算清性能预算再上双版本方案。
