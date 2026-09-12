---
order: 650
title: CSS 新特性
module: 'css'
category: 前端技术
difficulty: advanced
description: 2024-2026 CSS 现代特性总览：if() 条件取值、text-box 文本裁剪、shape() 与 corner-shape、field-sizing、滚动条样式、跨文档视图过渡、@starting-style 等，附支持状态与渐进增强策略。
author: fanquanpp
updated: '2026-09-13'
related:
  - 'css/390-ContainerQuery'
  - 'css/450-CascadeLayer'
  - 'css/480-CSSNativeNesting'
  - 'css/340-CSSViewTransitions'
  - 'css/350-CSSScrollDrivenAnimations'
  - 'css/470-CSSAnchorPositioning'
  - 'css/460-FeatureQuery'
  - 'css/400-ModernColorSpace'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
  - 'css/170-PriorityCalculation'
---

## 前置知识

建议先阅读以下内容再进入本文：

- [CSS3 概述与基本语法](/css/020-CSS3OverviewBasicSyntax)
- [优先级计算](/css/170-PriorityCalculation)

## 1. 这篇文档解决什么问题

CSS 在 2023-2026 年经历了一轮罕见的“能力大爆炸”：容器查询、原生嵌套、`:has()`、层叠层、锚点定位、视图过渡……几乎每个季度都有新东西落地。旧教程常见的两个极端是：要么只讲十年前的特性，要么罗列一堆还没法用的草案。

本篇是整个 CSS 模块的“新特性索引”：

- **已经能放心用的**（进入 Baseline，见下节），给出用法与迁移建议；
- **刚落地、支持有限的**（2025-2026 新兴能力），给出语法预览、适用场景和明确的兼容性提示；
- 每个特性都有独立深入的文档，本篇负责“串起来看地图”，并给出交叉引用。

## 2. 先学会读“支持状态”：Baseline 是什么

判断一个 CSS 特性能不能用于生产，业内通用口径是 **Baseline**（由 Web 平台主要浏览器厂商共同维护的兼容性基准），分三档：

| 档位 | 含义 | 使用建议 |
| --- | --- | --- |
| Baseline Widely Available | 新登基满 30 个月 | 放心用，几乎无需回退 |
| Baseline Newly Available | 四大引擎（Chrome/Edge/Firefox/Safari）均已支持，但未满 30 个月 | 可以用，老版本浏览器需 `@supports` 回退 |
| Limited availability | 部分引擎未支持 | 学习了解，生产慎用 |

习惯查询方式：

- MDN 每个特性页面顶部会标注 Baseline 状态与起始版本；
- caniuse.com 可按特性查各版本覆盖百分比；
- 写代码时用 `@supports`（见 `css/460-FeatureQuery`）做能力检测，而不是猜测版本号。

> 纪律提示：本文对新兴特性一律不给“全绿”结论。各引擎落地节奏以 MDN / caniuse 实时数据为准，这是查阅 Web 兼容性的唯一可靠习惯。

## 3. if()：在属性值里写条件分支

`if()` 是 CSS Values 5 引入的条件取值函数：让**一个属性的值**根据条件自动选择，不再需要为每种状态写一整条规则。它接受三种条件（可 `and` / `or` / `not` 组合），分支用分号分隔，`else` 兜底：

```css
/* 语法：if(条件1: 值1; 条件2: 值2; else: 兜底值) */
/* 注意：if 与左括号之间不能有空格，否则整条声明无效 */

.card {
  /* 条件一：style() 查询同元素的自定义属性值 */
  background: if(
    style(--scheme: dark): #1a1a2e;
    style(--scheme: light): #ffffff;
    else: #f5f5f5
  );

  /* 条件二：media() 直接在属性值里写媒体查询 */
  padding: if(
    media(width < 700px): 8px;
    else: 24px
  );

  /* 条件三：supports() 检测特性支持 */
  color: if(
    supports(color: oklch(70% 0.15 250)): oklch(70% 0.15 250);
    else: #3366cc
  );
}
```

三个必须知道的特性：

- **分支按顺序求值**，第一个为真的分支生效；`else` 恒为真，放在最后；
- **条件可以是组合表达式**：`style((--scheme: dark) and (--contrast: high))`；
- **不支持优雅降级**：旧浏览器会把整条声明当无效丢弃，所以必须**在前面补一条普通声明**当回退：

```css
padding: 8px; /* 回退：不支持 if() 的浏览器用这条 */
padding: if(media(width < 700px): 4px; else: 8px);
```

支持状态：2025 年起在 Chrome 137+ 可用；其他引擎的支持仍在推进中，生产使用前务必查 MDN/caniuse，并按上面的“回退声明在前”模式写。它与容器查询的 `@container style(...)` 是两套互补机制——`@container` 只能改**子元素**样式，`if()` 直接在**当前元素**的任意属性值里分支。

## 4. text-box：修剪文本框的“多余空隙”

排版的经典痛点：`line-height: 1` 时文字上下仍留白（字体 ascent/descent 天然比字面高），导致“标题文字与容器边缘的间距永远调不准”。`text-box-trim` 与 `text-box-edge`（简写 `text-box`）让浏览器直接裁掉这些空隙：

```css
h1 {
  /* 简写：修剪两端；上边缘裁到大写字高（cap），下边缘裁到基线（alphabetic） */
  text-box: trim-both cap alphabetic;
}

/* 等价的长写法 */
h1 {
  text-box-trim: trim-both;   /* trim-both | trim-start | trim-end | none */
  text-box-edge: cap alphabetic; /* 起始边 cap/ex/text，结束边 alphabetic/text */
}
```

| 值 | 含义 |
| --- | --- |
| `cap` | 大写字母顶线（上边常用） |
| `ex` | 小写 x 字高 |
| `text` | 文本内容区边界 |
| `alphabetic` | 基线（下边常用） |

典型收益：标题在卡片里“视觉垂直居中”、按钮文字上下留白对称、竖排标题与容器严丝合缝。

支持状态：Chrome 128 / Safari 18.2 起可用，Firefox 落地较晚（以 MDN 为准）。它是纯视觉增强，不支持的浏览器只是“多留一点空隙”，可直接使用、无需 JS 回退。

## 5. shape()：clip-path 有了可读、可动画的绘制语法

`clip-path` 的 `path()` 函数只能写 SVG 路径字符串——用像素单位、不能响应式、不能平滑动画。新 `shape()` 函数用类似“海龟绘图”的命令序列（`from 起点` + `move/line/curve/arc...`）绘制形状，且**接受任意 CSS 单位与百分比、支持插值动画**：

```css
/* 悬浮卡片：右上角切一个斜角，宽度随容器伸缩 */
.card {
  clip-path: shape(
    from 0 0,
    line to calc(100% - 24px) 0, /* 顶边到缺口处 */
    line to 100% 24px,           /* 斜角 */
    line to 100% 100%,           /* 右边 */
    line to 0 100%,              /* 底边 */
    line to 0 0                  /* 回到起点 */
  );
}

/* shape() 可以在两个形状间平滑动画（命令与参数数量一致即可） */
.card:hover {
  clip-path: shape(
    from 0 0,
    line to calc(100% - 48px) 0,
    line to 100% 48px,
    line to 100% 100%,
    line to 0 100%,
    line to 0 0
  );
  transition: clip-path 0.3s;
}
```

支持的命令族：`move` / `line` / `hline` / `vline` / `curve`（贝塞尔）/ `smooth` / `arc` / `close`，坐标可用 `px`、`%`、`calc()`。与 `clip-path: polygon()` 相比，`shape()` 能画曲线、能精确控制每个点的单位。

支持状态：2025 年起 Chromium 系率先支持，其他引擎以 MDN/caniuse 为准；不支持时 `clip-path` 整条无效，先用 `polygon()` 或不裁剪做回退。

## 6. corner-shape：border-radius 的形状升级

`border-radius` 只能切出四分之一圆。`corner-shape` 让每个圆角变成可指定的形状——最亮眼的是 `superellipse()`（超椭圆，俗称 squircle，即 iOS 图标那种“比方更饱满、比圆更利落”的曲线）：

```css
.card {
  border-radius: 24px;
  corner-shape: superellipse(3); /* 数值 1=正圆角，越大越方 */
}

.tag {
  border-radius: 8px;
  corner-shape: bevel; /* 斜切角 */
}

.ticket {
  border-radius: 50% 50% 50% 50% / 12px;
  corner-shape: scoop; /* 内凹弧形，适合票券缺口 */
}
```

可用关键字：`round`（默认圆角）、`bevel`（斜切）、`scoop`（内凹）、`notch`（直角缺口）、`squircle`、`superellipse(<number>)`。四个角可用与 `border-radius` 相同的斜杠语法分别指定；由于形状由数值参数驱动，`superellipse()` 的数值还能参与过渡动画。

支持状态：2025 年起 Chromium 系率先落地，其他引擎跟进中（以 MDN 为准）；不支持的浏览器保持普通圆角，属安全增强。

## 7. sibling-count() / sibling-index()：兄弟元素的数量与序号

过去“第 N 个子元素偏移一点”只能靠 `:nth-child(n)` 逐个硬写。新函数让样式直接读取**兄弟元素总数**与**自己的序号**，配合 `calc()` 做出真正的“数据驱动布局”：

```css
/* 圆环排列：每个子元素按序号旋转 45 度，无需逐个写 nth-child */
.sector li {
  rotate: calc(sibling-index() * 45deg);
  transform-origin: 200% center;
}

/* 子元素越多每列越窄：数量变化时布局自动适应 */
.auto-grid {
  display: grid;
  grid-template-columns: repeat(sibling-count(), 1fr);
}

/* 级联延迟入场动画：第 N 个延迟 N * 60ms */
.menu li {
  animation: fade-in 0.4s both;
  animation-delay: calc(sibling-index() * 60ms);
}
```

支持状态：2025 年起 Chromium 系率先支持，其他引擎以 MDN/caniuse 为准。注意两个函数都只统计“同一父元素下的元素子节点”，文本节点不计入。

## 8. @function：自定义 CSS 函数（早期）

Sass 用户熟悉的“自定义函数”正在进入 CSS。`@function` 用 `--` 命名参数，通过 `result` 返回值，让重复计算收敛成一处定义：

```css
/* 定义：两数平均（参数以 -- 开头，类似自定义属性） */
@function --avg(--x, --y) {
  result: calc((--x + --y) / 2);
}

.card {
  /* 使用：传入带单位的值即可 */
  width: --avg(200px, 400px);        /* 300px */
  padding: --avg(1rem, 2rem);        /* 1.5rem */
}
```

进阶形态支持类型标注、`using` 声明局部变量与媒体/容器条件分支。`@function` 与 `var()` 的分工：`var()` 是“存一个值”，`@function` 是“封装一段计算”，后者适合间距体系换算、尺寸推导这类重复公式。

支持状态：规范仍在推进，2025 年起 Chromium 系提供早期实现，属**明确的新兴特性**——语法细节可能调整，生产项目建议观望或封装在构建层（见 `css/590-PostCSS`）。

## 9. field-sizing: content：表单控件随内容伸缩

`textarea` 想要“初始一行、输入多了自动长高”，传统要 JS 监听 `input` 事件算行数。`field-sizing: content` 一行搞定：

```css
textarea {
  field-sizing: content;  /* 尺寸跟随内容 */
  min-height: 3lh;        /* 至少 3 行高，防止初始太矮 */
  max-height: 12lh;       /* 上限，防止无限撑高 */
  min-width: 20ch;
}

input {
  field-sizing: content;  /* 输入框宽度随内容增长 */
  min-width: 8ch;
  max-width: 100%;
}
```

对 `input` / `textarea` / `select` 均有效。`lh`（行高单位）与 `ch`（"0"字宽单位）在这里特别好用——尺寸语义与文字直接挂钩。

支持状态：Chromium 系 2024 年起支持；Firefox/Safari 跟进情况以 MDN 为准。回退表现友好：不支持时控件保持默认尺寸，功能不受影响。

## 10. scrollbar-color / scrollbar-width：滚动条进入标准

自定义滚动条终于不用 `::-webkit-scrollbar` 私有前缀了。两个标准属性即可：

```css
/* 全局：滚动条颜色（滑块色 轨道色） */
:root {
  scrollbar-color: #6b7280 #e5e7eb;
}

/* 局部：细滚动条（auto | thin | none） */
.code-panel {
  overflow: auto;
  scrollbar-width: thin;
}

/* 隐藏滚动条但保留滚动能力 */
.carousel {
  scrollbar-width: none; /* Firefox 系 */
}
.carousel::-webkit-scrollbar {
  display: none; /* Chromium/Safari 回退 */
}
```

要点：

- 已进入 Baseline Newly Available（2024 年起各引擎陆续补齐，Chrome/Edge 121 起支持这两个属性）；
- `scrollbar-width` 只有 `auto` / `thin` / `none` 三档，**没有**任意像素值——宽度审美统一交给浏览器；
- 彩色滚动条建议用半透明灰色系，避免在浅色/深色主题下突兀；
- 需要复杂造型（圆角滑块、悬浮态）时仍需 `::-webkit-scrollbar`，那是渐进增强而非常规手段。

## 11. View Transitions：同文档已普及，跨文档正在路上

视图过渡（View Transitions）让“新旧两个界面状态”之间自动生成补间动画。它分两个层级，成熟度不同：

**同文档过渡（single-document）**——已经进入 Baseline（Chrome/Edge/Safari 均支持），适合 SPA 内的状态切换：

```js
// 点击切换主题时，包一层过渡即可
document.startViewTransition(() => {
  document.body.classList.toggle("dark");
});
```

```css
.avatar {
  view-transition-name: avatar; /* 该元素单独做位移/缩放补间 */
}
```

**跨文档过渡（cross-document）**——新兴能力，Chromium 系自 2024 年中起、Safari 较新版本已跟进，Firefox 以 MDN 为准。它服务于传统的**多页面跳转**（MPA）：无需 JS，只要两页都声明下面的规则，浏览器会在导航时自动衔接：

```css
/* A 页（列表）与 B 页（详情）都写：启用跨文档过渡 */
@view-transition {
  navigation: auto;
}

/* 两页中同名的元素会被识别为同一个“视图”，自动做位置/尺寸补间 */
.article-card {
  view-transition-name: article;
}
```

限制与注意：跨文档过渡要求同源导航；捕获期间页面暂停渲染，回调里只做同步 DOM 修改；应尊重 `prefers-reduced-motion` 关闭过渡。完整机制、伪元素定制与降级方案见 `css/340-CSSViewTransitions`。

## 12. @starting-style 与 transition-behavior：离散属性的过渡补全

这两个特性解决两个历史遗留问题，均已进入 Baseline Newly Available（2024 年起各引擎支持），是“元素出现动画”的标配：

**问题一：元素第一次出现时 transition 不生效**（没有“上一个状态”可过渡）。`@starting-style` 专门声明“进入瞬间的起始样式”：

```css
.dialog {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.3s, transform 0.3s, display 0.3s allow-discrete, overlay 0.3s allow-discrete;
}

/* 首次渲染 / 从 display:none 变为可见时，从这里开始过渡 */
@starting-style {
  .dialog {
    opacity: 0;
    transform: translateY(16px);
  }
}

.dialog[hidden] {
  opacity: 0;
  transform: translateY(16px);
}
```

**问题二：`display`、`overlay` 这类离散属性本来不能过渡**（只有“开/关”两个值，没有中间态）。`transition-behavior: allow-discrete` 允许它们参与过渡——浏览器会在过渡期间**延迟切换**离散值（离开动画播完才真正 `display: none`），上面简写里的 `allow-discrete` 就是这么用的：

```css
/* 长写法等价形式 */
.dialog {
  transition: opacity 0.3s, transform 0.3s;
  transition-behavior: allow-discrete;
}
```

典型组合拳是 popover / dialog 的“打开淡入、关闭淡出且不闪断”，配合 `overlay` 属性还能让元素在退出动画期间留在顶层。完整示例见 `css/330-CSSAnimationTransition` 的“现代动画新特性”节。

## 13. 已普及的基石特性速览

以下特性均已 Baseline，本模块有独立文档，此处只列“一句话定位”供索引：

| 特性 | 一句话定位 | 独立文档 |
| --- | --- | --- |
| 容器查询 `@container` | 组件按父容器尺寸响应，cqw/cqi 单位 | `css/390-ContainerQuery` |
| 样式查询 `style()` | 按容器自定义属性值选择样式 | `css/390-ContainerQuery` |
| 层叠层 `@layer` | 声明式控制优先级，收纳第三方样式 | `css/450-CascadeLayer` |
| 原生嵌套 + `&` | 无预处理器写嵌套选择器 | `css/480-CSSNativeNesting` |
| `:has()` | 按后代/兄弟状态选父级与前辈 | `css/130-CSS3SelectorSystem` |
| 逻辑属性 `margin-inline-*` | 书写模式无关的方向语义 | `css/420-LogicalProperty` |
| `color-mix()` / oklch / 相对颜色 / `light-dark()` | 现代颜色系统 | `css/400-ModernColorSpace` |
| 滚动驱动动画 `scroll()` / `view()` | 动画进度跟随滚动 | `css/350-CSSScrollDrivenAnimations` |
| 锚点定位 `position-area` / `anchor()` | 纯 CSS 弹层定位 | `css/470-CSSAnchorPositioning` |
| `@scope` | 选择器作用域限定（Don't/Scope 区间） | `css/710-ScopeAtRule` |
| `@property` | 注册带类型/初始值/可动画的自定义属性 | `css/410-CSSVariableCustomAttribute` |
| `text-wrap: balance` / `pretty` | 标题平衡折行、避免孤行 | `css/070-TextAndFontsBasics` |
| `accent-color` / `light-dark()` | 控件着色与明暗自适应 | `css/400-ModernColorSpace` |

## 14. 采用策略：如何把新特性引入存量项目

一条经过验证的路径是“**三层渐进**”：

```mermaid
flowchart LR
    A["基础层<br>所有浏览器可用的传统写法"] --> B["增强层<br>Baseline Newly Available<br>@supports 包裹"]
    B --> C["前沿层<br>新兴特性<br>demo / 内部工具先行"]
```

1. **先写基础层**：功能必须完整（布局用 flex/grid、定位用普通绝对定位）；
2. **增强层用 `@supports` 开关**：锚点定位、`text-box`、滚动驱动动画这类“不支持只是不够精致”的特性，直接渐进增强；
3. **前沿层控制风险**：`if()`、`shape()`、`@function`、`corner-shape` 先在内部工具/演示项目验证，等待 Baseline Newly Available 再进核心产品；
4. **建设施而非散装检测**：把兼容性结论沉淀到团队 browserslist、构建配置（`css/590-PostCSS`）与 UI 组件库里，而不是每处样式各自 `@supports`。

## 15. 常见陷阱

| 陷阱 | 症状 | 原因与解法 |
| --- | --- | --- |
| `if(` 与括号之间写了空格 | 整条声明无效 | `if()` 是函数，`if (` 是语法错误 |
| `if()` 不写回退声明 | 旧浏览器样式缺失 | 先写普通声明，再写 if() 版本 |
| 新特性直接裸用 | 部分用户样式断裂 | `@supports` 渐进增强 + 基础层兜底 |
| 拿过时教程的属性名抄代码 | 属性无效 | 以 MDN 现行文档为准（如 `inset-area` 已改名 `position-area`） |
| 用 `::-webkit-scrollbar` 写“标准”样式 | Firefox 全不生效 | 标准属性优先，私有选择器只做增强 |
| 只在 Chromium 里验收 | 上线后其他浏览器异常 | 兼容性结论以 caniuse 数据 + 多引擎实测为准 |
| 新兴特性写进核心链路 | 依赖未定型语法 | 前沿特性只做视觉增强，不承载功能 |

## 动手试试

1. 用 `if()` + `style()` 实现一个由 `--density: compact` 切换的紧凑模式（记得写回退声明）；
2. 给标题加 `text-box: trim-both cap alphabetic`，对比裁剪前后的视觉居中效果；
3. 用 `shape()` 画一个带曲线缺口的卡片，并让它 hover 时平滑变形；
4. 用 `sibling-index()` 给导航项生成级联延迟入场动画；
5. 用 `@view-transition { navigation: auto; }` 给多页面站点加上“列表卡片飞入详情”的跨文档过渡；
6. 给 `textarea` 加 `field-sizing: content`，体验免 JS 自动增高；
7. 进阶挑战：把本文的新特性按“基础层/增强层/前沿层”给自己当前的项目做一次分层盘点。

## 核心知识点

> 一句话记住本文：Baseline 分三档看支持状态；`if()` 值内分支、`text-box` 裁文本空隙、`shape()`/`corner-shape` 形状升级、`field-sizing` 控件自适应、`scrollbar-color/width` 滚动条标准化已可用；`@function`、`sibling-count()`、跨文档视图过渡仍属新兴。

- 判断可用性看 Baseline 档位，不背版本号；`@supports` 是标准落地手段；
- `if()`：`style()/media()/supports()` 三种条件，必须先写回退声明；
- `text-box` 简写 = `text-box-trim` + `text-box-edge`，解决排版留白顽疾；
- `shape()` 可动画、可响应式；`corner-shape: superellipse()` 升级圆角；
- `field-sizing: content` 替代“textarea 自动增高”的 JS 方案；
- `@starting-style` + `transition-behavior: allow-discrete` 补全元素出入场动画；
- 新兴特性（`if()` 全生态、`@function`、跨文档过渡的 Firefox 侧）支持状态有限，生产前查 MDN/caniuse。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 追新过度 | 核心功能依赖未普及特性 | 分层采用，前沿特性只做增强 |
| 无检测裸写 | 旧浏览器声明整条失效 | 回退声明在前 / `@supports` 包裹 |
| 兼容信息过时 | 教程版本号陈旧 | 以 MDN/caniuse 实时数据为准 |
| 私有方案当标准 | `-webkit-` 前缀样式跨端失效 | 标准属性优先 |
| 团队口径不一 | 有人用新语法有人不用 | 建立 browserslist 与代码评审约定 |

## 扩展学习

- 特性检测：`css/460-FeatureQuery`；
- 容器查询与样式查询：`css/390-ContainerQuery`；
- 层叠层：`css/450-CascadeLayer`；
- 原生嵌套：`css/480-CSSNativeNesting`、`css/720-CSSNestingInPractice`；
- 视图过渡：`css/340-CSSViewTransitions`；
- 滚动驱动动画：`css/350-CSSScrollDrivenAnimations`；
- 锚点定位：`css/470-CSSAnchorPositioning`；
- 现代颜色：`css/400-ModernColorSpace`。
