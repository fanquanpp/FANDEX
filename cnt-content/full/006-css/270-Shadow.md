---
order: 290
title: 阴影
module: 'css'
category: 前端技术
difficulty: beginner
description: "从「卡片平贴在背景上，一点浮起感都没有」出发，掌握 box-shadow 五段语法与多层叠加的「海拔」语言，分清 box-shadow（贴盒子）与 drop-shadow（贴轮廓）的适用场景，学会用伪元素让悬浮动画不掉帧，并把阴影海拔收进设计令牌。"
author: fanquanpp
updated: '2026-09-29'
related:
  - 'css/260-Gradient'
  - 'css/290-BackgroundEnhancement'
  - 'css/310-CSSFilters'
  - 'css/410-CSSVariableCustomAttribute'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
---

## 前置知识

- 已完成 [CSS3 概述与基本语法](/css/020-CSS3OverviewBasicSyntax)；
- 「浮起感」与渐变、圆角共同构成卡片质感三件套，本文只管阴影，另两件见 [渐变](/css/260-Gradient) 与 [圆角](/css/280-BorderRadius)。

## 学习目标

读完本文你将能够：

1. 默写 `box-shadow` 五段语法：水平偏移、垂直偏移、模糊、扩展、颜色，并解释 `inset` 的作用；
2. 用多层阴影叠加做出「海拔」体系——离用户越近的元素阴影越大越柔；
3. 分清 `box-shadow`（沿盒子外形）与 `filter: drop-shadow`（沿内容实际轮廓），知道透明 PNG 图标该用哪个；
4. 做出 hover 悬浮且不掉帧的卡片，说清为什么直接动画 box-shadow 不是最优解；
5. 把海拔体系收进 CSS 变量令牌，随主题一起切换。

预计 30 到 50 分钟，含 1 组动手实验与 4 道练习。

## 1. 问题引入：为什么你的卡片「贴」在屏幕上

同一个仪表盘，设计稿里的卡片像悬浮在背景上方，你写出来的却像贴纸——差别就是阴影。真实世界里，物体离观察者越近：投影**越大、越模糊、越淡**；贴在桌面上的物体：投影**小、锐利、深**。CSS 阴影的全部设计语言都从这条物理直觉出发：**想表达「浮起」，就给更大更柔更淡的影子；想表达「嵌入」，就用 `inset` 内阴影**。

## 2. 最小示例：一张会呼吸的卡片

`styles.css`：

```css
.card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  /* 多层叠加：贴近的锐影打底，远处的柔影造浮起感 */
  box-shadow:
    0 1px 2px rgb(0 0 0 / 0.06),
    0 4px 12px rgb(0 0 0 / 0.08);
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}

.card:hover {
  transform: translateY(-4px);
  /* 抬起来：偏移更大、模糊更散、透明度更低 */
  box-shadow:
    0 2px 4px rgb(0 0 0 / 0.06),
    0 12px 32px rgb(0 0 0 / 0.12);
}
```

预期效果：卡片平时轻微浮起，hover 时上移 4px 且阴影变大变柔——「呼吸感」来自阴影参数与位移的同步变化，而不是只放大模糊值。

## 3. 核心概念

### 3.1 五段语法逐段拆

```css
box-shadow: <offset-x> <offset-y> <blur> <spread> <color>;
box-shadow: 0 4px 12px 0 rgb(0 0 0 / 0.1);
/*           x  y   模糊 扩展  颜色 */
```

- **offset-x / offset-y**：影子相对元素的位移。光源在正上方时 x 为 0、y 为正——现代 UI 几乎都这么写；
- **blur**：模糊半径，值越大影缘越柔。0 是硬边剪影；
- **spread**：影子在模糊之前先「胖/瘦」一圈。负值收缩影子（贴合感），正值放大（光晕感）；
- **color**：几乎永远用半透明黑（`rgb(0 0 0 / 0.1)`），实色黑是廉价感的直接来源；
- 前面加 `inset` 反转为内阴影：`inset 0 2px 4px rgb(0 0 0 / 0.2)`，用于输入框凹陷、按压态。

多条阴影逗号分隔，先写的画在上层。组合出的常见模板：

```css
/* 边框替身：0 偏移 0 模糊 1 扩展 = 一圈实线 */
.ring { box-shadow: 0 0 0 1px #e2e8f0; }

/* 聚焦环：比 outline 兼容性更老的画法（新代码建议 outline） */
.focusable:focus-visible {
  outline: 3px solid #93c5fd;
  outline-offset: 2px;
}

/* 底部细影：贴桌面的输入框 */
.sunken { box-shadow: 0 2px 4px rgb(0 0 0 / 0.15); }

/* 内嵌凹陷 */
.well { box-shadow: inset 0 2px 6px rgb(0 0 0 / 0.15); }
```

### 3.2 海拔体系：阴影是层级语言

Material Design 把「离用户多近」量化为海拔（elevation），每级对应一组多层阴影。项目里的正确做法是把这套参数收进变量：

```css
:root {
  --shadow-1: 0 1px 2px rgb(0 0 0 / 0.07);
  --shadow-2: 0 1px 2px rgb(0 0 0 / 0.07), 0 4px 12px rgb(0 0 0 / 0.08);
  --shadow-3: 0 2px 4px rgb(0 0 0 / 0.07), 0 12px 32px rgb(0 0 0 / 0.12);
}
.card     { box-shadow: var(--shadow-1); }
.dropdown { box-shadow: var(--shadow-2); }
.modal    { box-shadow: var(--shadow-3); }
```

直觉规则：**层级越高（模态框 > 下拉菜单 > 卡片 > 输入框），阴影越大越柔越淡**。深色主题里阴影几乎不可见，通行做法是改用更亮的表面色加细边框来分层（变量令牌换一张表即可，见 [CSS 变量](/css/410-CSSVariableCustomAttribute)）。

### 3.3 text-shadow 与 drop-shadow

```css
/* 文字阴影：同 box-shadow 但没有 spread 与 inset */
h1 { text-shadow: 0 2px 4px rgb(0 0 0 / 0.3); }

/* 霓虹字：同色多层零偏移叠加，模糊逐层放大 */
.neon {
  color: #fff;
  text-shadow:
    0 0 7px #fff,
    0 0 42px #0fa,
    0 0 82px #0fa;
}
```

PNG 图标、镂空 SVG 想要投影时，`box-shadow` 会沿矩形盒子画——镂空处也被填上，效果假。正确工具是滤镜，它沿**内容的实际不透明轮廓**投影子：

```css
.icon {
  filter: drop-shadow(0 4px 6px rgb(0 0 0 / 0.3));
}
```

一句话分工：**规则矩形用 box-shadow（便宜），异形轮廓用 drop-shadow（贵一点但贴形）**。滤镜族的其他成员见 [CSS 滤镜](/css/310-CSSFilters)。

### 3.4 悬浮动画不掉帧

box-shadow 变化触发重绘（不是重排），元素大、列表长时 hover 一片卡一掉帧。标准解法是「影不离身、动的是透明度」：

```css
.card { position: relative; }
.card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: 0 12px 32px rgb(0 0 0 / 0.12);
  opacity: 0;
  transition: opacity 0.3s;
}
.card:hover { transform: translateY(-4px); }
.card:hover::after { opacity: 1; }
```

大阴影常驻在伪元素上，hover 只切换 `opacity` 与 `transform`——两者都只触发合成，60fps 无压力。原理见 [CSS 性能优化](/css/540-CSSPerformanceOptimizationDetailed)。

## 4. 修改实验

对第 2 节动手，每步先预测再刷新：

1. 给 `.card` 加第四段 spread `0 4px 12px 4px`：影子整体胖一圈，光晕感；改负值 `-2px`：影子收紧贴身；
2. 阴影改成实色黑 `#000`：立刻廉价——理解「永远用半透明」；
3. 把 hover 的 box-shadow 过渡换掉，改用 3.4 的伪元素方案，DevTools 打开 Rendering 面板的 Paint flashing 对比两种写法的重绘面积；
4. 给文字标题加 `text-shadow` 再试霓虹配方；给一张透明 PNG 图标分别用 box-shadow 与 drop-shadow，观察盒子形与轮廓形的差别。

## 5. 常见错误与调试实录

错误一：黑实色阴影。`box-shadow: 0 4px 8px black` 在浅色背景上像贴了黑纸。修复：一律 `rgb(0 0 0 / 0.05)` 到 `0.15` 区间的半透明黑，或用带品牌色的深色半透明。

错误二：光源方向不一致。左边卡片影子朝左、右边朝右，页面像地震现场。全站统一一个光源（惯例：正上方，x = 0），写进海拔令牌自然统一。

错误三：小元素配大阴影。48px 的按钮顶着 40px 模糊的巨影，比例失衡。阴影尺度与元素尺寸成比例，小控件用 --shadow-1。

错误四：文字阴影模糊过大导致发虚。text-shadow 模糊超过 4 到 6px 时正文文字开始难读——正文阴影只做 1 到 2px 的「增重」，大模糊留给标题与霓虹特效。

错误五：给 box-shadow 写 transition 但感觉卡。大列表场景换伪元素 opacity 方案（3.4）；单卡片小阴影直接过渡通常可接受，先测量再优化。

## 6. 实际场景

- 卡片与列表：shadow-1 常态加 hover 抬升，是内容流的标准交互；
- 弹层家族：下拉、popover、模态按海拔递增，配合 [定位详解](/css/220-PositionDetailed) 的 z-index 分层；
- 输入与按压：inset 内阴影表达「凹进去」，按下时外阴影收缩加内阴影出现，物理感十足；
- 空状态与插画：drop-shadow 给镂空插画贴形投影，配合渐变背景出高级感；
- 海拔令牌化：三到四档阴影变量进设计令牌，FANDEX 网页端的双主题令牌表里阴影与圆角、色板并列管理，深色主题自动切到「亮表面加细边」的分层方案，可以对照抄结构。

## 7. 小练习

预测题（3 分钟）：`box-shadow: 0 0 0 6px rgb(37 99 235 / 0.3)` 渲染出什么？（一圈 6px 宽的半透明蓝色实环——零偏移零模糊正扩展。）

修改题（8 分钟）：把第 2 节卡片改成「按下态」：`:active` 时位移归零、阴影收缩为贴桌面的细影、加一层 inset 内阴影，并配 0.1s 的快速过渡。

修 Bug 题（10 分钟）：下拉菜单在深色主题里「层级感消失」，白底卡片看得出悬浮、黑底上看不出深浅。给出两条不依赖加大阴影的分层手段。（答案方向：深色主题换更亮一档的表面色（elevation surface），加 1px 半透明白细边框；或顶部加一条极淡的高光内阴影模拟环境光。）

挑战题（半小时，不看正文独立完成）：给列表页做完整海拔体系：三档阴影令牌（卡片/悬浮卡/模态）、hover 用伪元素 opacity 方案抬升、深色主题下自动切换分层策略。验收：无实色黑阴影、光源方向全站一致、动效只碰 transform/opacity、CSS 至少一条注释解释某档参数的物理直觉。

## 8. 与之前和之后的知识的关系

- 之前：[盒模型详解](/css/050-CSS3BoxModelDetailed) 的圆角会让阴影跟随外形（`border-radius: inherit` 在伪元素方案里因此必要）；
- 并行：[渐变](/css/260-Gradient) 与阴影共同构成光影语言；[CSS 滤镜](/css/310-CSSFilters) 是 drop-shadow 的老家，blur、brightness 同住一个屋檐；[CSS 变量](/css/410-CSSVariableCustomAttribute) 承载海拔令牌；
- 之后：[CSS 性能优化](/css/540-CSSPerformanceOptimizationDetailed) 解释重绘与合成的成本差异，为什么伪元素方案能到 60fps。

## 9. 官方文档

- MDN box-shadow 参考：https://developer.mozilla.org/zh-CN/docs/Web/CSS/box-shadow
- MDN text-shadow 参考：https://developer.mozilla.org/zh-CN/docs/Web/CSS/text-shadow
- MDN drop-shadow() 函数：https://developer.mozilla.org/zh-CN/docs/Web/CSS/filter-function/drop-shadow

## 10. 自我检查

- 能默写 box-shadow 五段语法并解释 spread 与 inset 的用途；
- 能说出海拔体系的核心直觉（越近越大越柔越淡）并落地成三档令牌；
- 给透明 PNG 图标配阴影时会选 drop-shadow 并说清原因；
- 知道动画阴影的 60fps 方案是把阴影常驻伪元素、hover 只动 opacity。

## 本章总结

阴影是层级语言：五段语法（x、y、模糊、扩展、色）加 inset 反转，多条叠加出「近锐远柔」的海拔。设计守则三条：永远半透明色、全站统一光源、尺度随元素大小。box-shadow 沿盒子、drop-shadow 沿轮廓，异形用后者。动效上，大阴影常驻伪元素、hover 只切 opacity，是 60fps 的标准姿势。工程落点是把海拔收进令牌，深色主题用亮表面加细边替代加大阴影。

## 下一步

进入 [背景增强](/css/290-BackgroundEnhancement)：卡片的底该怎么铺——多重背景图层、background-clip 的裁剪魔法与 background 简写的完整拼图。
