---
order: 280
title: 渐变
module: 'css'
category: 前端技术
difficulty: beginner
description: "从「头图想从紫过渡到蓝，不想切一张大图」出发，掌握 linear/radial/conic 三种渐变的几何模型与色标写法，用硬停做出条纹与饼图，用 background-clip: text 做渐变文字，理解插值色彩空间（oklch）与色带成因，最终把渐变收进设计令牌。"
author: fanquanpp
updated: '2026-10-07'
related:
  - 'css/270-Shadow'
  - 'css/290-BackgroundEnhancement'
  - 'css/400-ModernColorSpace'
  - 'css/410-CSSVariableCustomAttribute'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
---

## 前置知识

- 已完成 [CSS3 概述与基本语法](/css/020-CSS3OverviewBasicSyntax)；
- 渐变是 `background-image` 的一种取值——它是「图」不是「颜色」，理解这一点后，多重背景、定位等玩法都会顺理成章（背景属性详见 [背景增强](/css/290-BackgroundEnhancement)）。

## 学习目标

读完本文你将能够：

1. 用一句话区分三种渐变的几何模型：直线过渡、从圆心扩散、绕一圈过渡；
2. 写出带角度、多色标、硬停（hard stop）的 `linear-gradient`，并用硬停做出条纹、进度环、饼图；
3. 用 `background-clip: text` 做渐变文字，并知道必须补的兜底；
4. 解释渐变里的「脏灰色带」从哪来，会用 oklch 插值修掉它；
5. 把常用渐变抽成 CSS 变量令牌，主题切换时整套换色。

预计 30 到 50 分钟，含 1 组动手实验与 4 道练习。

## 1. 问题引入：头图的大图能不能不切

设计稿给了一张「紫到蓝」渐变头图，你正要切图，同事说：这用 CSS 一行就能画，还无限清晰、随便改色。渐变的本质是**用数学公式描述的图像**——浏览器按公式实时上色，放大不糊、改色零成本、还省一张几十 KB 的请求。

三种公式对应三种几何：`linear-gradient` 沿一条直线过渡，`radial-gradient` 从圆心向外扩散，`conic-gradient` 绕着圆心转一圈过渡。剩下的全部语法（角度、色标、重复）都是在这三句话上添细节。

## 2. 最小示例：从一条线开始

`styles.css`：

```css
.hero {
  height: 200px;
  /* 方向 + 起点色 + 终点色，最小模型 */
  background: linear-gradient(to right, #7c3aed, #2563eb);
}

/* 多色标：每个颜色后面可以跟位置 */
.banner {
  height: 120px;
  background: linear-gradient(
    to bottom,
    #1e293b 0%,
    #334155 60%,
    #64748b 100%
  );
}
```

预期效果：头图从左到右紫渐变到蓝；横幅从上到下三段色平滑过渡。两个高频方向写法：`to right` / `to bottom right` 这类关键词适合「大约朝哪」，`45deg` 这类角度适合精确控制（0deg 朝上，顺时针增大）。

## 3. 核心概念

### 3.1 硬停：渐变的第一妙用是「不渐变」

两个色标位置相同时没有过渡空间，产生硬边——这是所有「条纹、格纹、进度环」技巧的支点：

```css
/* 理发店条纹：重复线性渐变 */
.stripes {
  background: repeating-linear-gradient(
    45deg,
    #e2e8f0 0 12px,
    #94a3b8 12px 24px
  );
}

/* 饼图：锥形渐变按比例分段 */
.pie {
  border-radius: 50%;
  background: conic-gradient(
    #ef4444 0% 30%,
    #f59e0b 30% 60%,
    #22c55e 60% 100%
  );
}

/* 进度环：锥形渐变 + 内圆遮出镂空 */
.ring {
  border-radius: 50%;
  background: conic-gradient(#22c55e 0 75%, #e2e8f0 75% 100%);
}
.ring::before {
  content: '';
  display: block;
  margin: 20px;             /* 内圆半径 */
  border-radius: 50%;
  background: #fff;         /* 或用 mask 挖空更通用 */
  aspect-ratio: 1;
}
```

`repeating-linear-gradient` 是「自动复读机」：写一段色标周期，它自动铺满整个区域，条纹、斑马纹、网格纸背景全靠它。

### 3.2 径向与锥形：光晕与转圈

```css
/* 光晕：圆心默认在正中，可改位置与形状 */
.glow {
  background: radial-gradient(circle at 30% 20%, rgb(255 255 255 / 0.35), transparent 60%);
}

/* 色轮：颜色绕一圈，首尾同色才能闭合无缝 */
.wheel {
  border-radius: 50%;
  background: conic-gradient(red, yellow, lime, aqua, blue, magenta, red);
}
```

径向渐变的尺寸关键字（`closest-side`、`farthest-corner` 等）控制扩散到哪为止，做「探照灯」和「聚光卡片」时才需要精细调整，需要时再查 MDN。

### 3.3 渐变文字：background-clip 三件套

```css
.gradient-text {
  font-size: 48px;
  font-weight: 700;
  background: linear-gradient(to right, #7c3aed, #2563eb);
  background-clip: text;          /* 渐变裁剪进文字形状 */
  -webkit-background-clip: text;  /* 旧引擎前缀兜底 */
  color: transparent;             /* 文字本身透明，露出背景 */
}
```

三行缺一不可，顺序也别乱：先画背景、再把背景裁进文字、最后让文字透明。它已进入 Baseline（`background-clip: text` 全主流支持），但 `-webkit-` 前缀的兜底行保留成本极低，建议照写。注意兜底策略：极老环境不支持时文字会整个透明，严谨项目用 `@supports` 给降级纯色（见 [特性检测](/css/460-FeatureQuery)），无障碍场景在强制高对比模式下应回退纯色。

### 3.4 脏灰色带与 oklch 插值

蓝到黄这类「跨色相大跨度」渐变，中间常出现一段浑浊的灰——因为默认在 sRGB 空间里按 RGB 通道直线插值，路过低饱和区。2023 年起 CSS 支持指定插值色彩空间，一行修复：

```css
.bad  { background: linear-gradient(to right, blue, yellow); }                 /* 中段发灰 */
.good { background: linear-gradient(to right in oklch, blue, yellow); }        /* 中段鲜亮 */
```

`in oklch`（或 `in oklab`）让浏览器在感知均匀的色彩空间里插值，过渡自然得多。色彩空间的话题展开见 [现代色彩空间](/css/400-ModernColorSpace)。

### 3.5 渐变进令牌：主题化与动画

```css
:root {
  --gradient-brand: linear-gradient(to right, #7c3aed, #2563eb);
}
.button {
  background: var(--gradient-brand);
}
[data-theme='dark'] {
  --gradient-brand: linear-gradient(to right, #4c1d95, #1e3a8a);
}
```

渐变整个值存进一个变量，主题切换时换一张令牌表即可。想让渐变本身动起来（背景位移动画之外的位置/角度动画），未注册的变量做不到插值，需要 `@property` 注册带类型的角度变量再 transition，思路见 [CSS 变量](/css/410-CSSVariableCustomAttribute) 第 3.4 节。

## 4. 修改实验

对第 2 节动手，每步先预测再刷新：

1. 把 `to right` 改成 `45deg` 再改 `135deg`：感受角度语义（0deg 朝上顺时针）；
2. 多色标里把 60% 改成 59%：几乎无感的 1% 缝隙，改成两个色标同位置 60%：出现硬边——理解硬停成因；
3. 用 `repeating-linear-gradient` 给 `.hero` 叠一层 45 度半透明细条纹（多层背景逗号叠加，第一层在上）；
4. 给 `.good` 与 `.bad` 并排放一起对比 oklch 差异；把颜色换成 orange 与 cyan 再看一次——跨度越大差异越明显。

## 5. 常见错误与调试实录

错误一：色带效应（banding）。大面积低对比渐变出现一圈圈「等高线」。成因是 8bit 颜色精度加显示器抖动。缓解：降低色彩跨度、叠加细噪点纹理、用 oklch 插值。

错误二：色轮有条缝。`conic-gradient` 首尾颜色不同就会在 0/360 度处出现接缝——首尾写同一个颜色即可闭合。

错误三：渐变文字在老内核上消失。`background-clip: text` 不被支持时 `color: transparent` 让文字整体隐形。防御：`@supports not (background-clip: text)` 里回退纯色。

错误四：把渐变当 background-color 用。渐变是 image 类型，`background-color: linear-gradient(...)` 非法；声明要用 `background` 或 `background-image`。

错误五：动画渐变的性能坑。直接对 `background-position` 或大面积渐变做动画会触发重绘。小范围用伪元素位移，值动画用注册过的 `@property` 变量。

## 6. 实际场景

- 品牌头图与按钮：一层主渐变加一层 `radial-gradient` 高光，比纯色按钮高级一档；
- 数据可视化：`conic-gradient` 饼图与进度环，零 SVG 零 JS；
- 纹理与网格纸：`repeating-linear-gradient` 两个方向叠加出方格纸、蓝图网格背景；
- 骨架屏微光：灰色块上叠一条移动的高光条纹（配合动画篇的 transform 位移）；
- 渐变与可访问性：文字压在渐变上时检查对比度（深浅两端的对比都要达标），装饰性渐变别承载信息。

## 7. 小练习

预测题（3 分钟）：`linear-gradient(to right, red 0 40%, blue 40% 100%)` 渲染出什么？（左 40% 纯红、右 60% 纯蓝、中间一条硬边——双值色标「起点 终点」的写法。）

修改题（8 分钟）：把饼图改成 25/35/40 三个分段并换成主题色变量；再加一条 65% 的白色分隔线（提示：在锥形渐变里插两个相邻色标 `#fff 35% 35%` 制造细缝）。

修 Bug 题（10 分钟）：下面代码想让标题显示渐变文字，实际标题完全看不见。指出问题行并给出修复：

```css
.title {
  background: linear-gradient(to right, #7c3aed, #2563eb);
  color: transparent;
  background-position: center;
}
```

（答案方向：缺 `background-clip: text`（含 -webkit- 兜底）——背景没有裁进文字形状，文字透明后什么都看不到。）

挑战题（半小时，不看正文独立完成）：做一张「演唱会海报头」：oklch 插值的紫粉主渐变、右上角 radial 光晕、45 度 repeating 细纹理、渐变大标题，全部颜色走 CSS 变量并支持深色主题换色。验收：无接缝、无色带感、强制高对比模式下文字可读、CSS 至少一条注释解释插值空间的选择。

## 8. 与之前和之后的知识的关系

- 之前：[背景增强](/css/290-BackgroundEnhancement) 解释了渐变作为 background-image 的图层属性（多重背景、定位、裁剪）；[CSS 变量](/css/410-CSSVariableCustomAttribute) 提供令牌化与动画化基建；
- 并行：[阴影](/css/270-Shadow) 与渐变是视觉层次的双人组（光影一体）；[现代色彩空间](/css/400-ModernColorSpace) 展开插值与 oklch 的完整话题；
- 之后：[动画与过渡](/css/330-CSSAnimationTransition) 让渐变动起来；[特性检测](/css/460-FeatureQuery) 负责渐变文字的降级兜底。

## 9. 官方文档

- MDN「使用 CSS 渐变」：https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_images/Using_CSS_gradients
- MDN linear-gradient 参考：https://developer.mozilla.org/zh-CN/docs/Web/CSS/gradient/linear-gradient
- MDN conic-gradient 参考：https://developer.mozilla.org/zh-CN/docs/Web/CSS/gradient/conic-gradient

## 10. 自我检查

- 能一句话说清三种渐变的几何差异，并各自举一个只能用它做的效果；
- 能用硬停写出条纹、饼图，并解释「同位置双色标」的成因；
- 渐变文字三件套能默写，并说出无支持环境的降级策略；
- 蓝黄渐变发灰时知道加 `in oklch`，并说清原因。

## 本章总结

渐变是数学描述的图像：linear 沿直线、radial 从圆心扩散、conic 绕圈，色标带位置即可分段，同位置即硬停——条纹、饼图、进度环全部由硬停派生。渐变文字三件套（background、background-clip: text、color: transparent）缺一不可；跨色相渐变发灰是 sRGB 插值的锅，`in oklch` 一行修复。工程上把渐变收进变量令牌，主题换色改一张表；动渐变先想性能，值动画交给注册过的 @property 变量。

## 下一步

进入 [阴影](/css/270-Shadow)：渐变管「面」，阴影管「浮起」——box-shadow 的多层叠加、drop-shadow 与 filter 的区别、以及「阴影越柔层级越高」的设计语言。
