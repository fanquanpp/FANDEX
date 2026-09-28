---
order: 120
title: CSS 函数
module: 'css'
category: 前端技术
difficulty: beginner
description: "从「容器要限宽 1200px 还要减掉两侧内边距，媒体查询写了三遍」出发，用 min/max/clamp 三兄弟一行搞定响应式尺寸，吃透 calc 的空格语法与流体排版公式，再用 color-mix 从一个主色派生出整套交互色，让 CSS 自己会算术。"
author: fanquanpp
updated: '2026-09-13'
related:
  - 'css/410-CSSVariableCustomAttribute'
  - 'css/400-ModernColorSpace'
  - 'css/260-Gradient'
  - 'css/460-FeatureQuery'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
---

## 前置知识

- 已完成 [CSS3 概述与基本语法](/css/020-CSS3OverviewBasicSyntax)；
- 知道 CSS 变量长什么样即可（`--x` 声明、`var(--x)` 使用），细节在下一篇展开。

## 学习目标

读完本文你将能够：

1. 用 `calc()` 做混合单位算术，并记住「加减号两侧必须空格」这条静默失效规则；
2. 用 `min()`、`max()`、`clamp()` 表达尺寸边界，把「限宽容器」写成一行；
3. 推导流体排版公式 `clamp(1.5rem, 1rem + 2vw, 3rem)`，能从设计稿两端字号反推参数；
4. 用 `color-mix()` 从主色派生 hover、禁用、边框色，主色一改全套跟随；
5. 认识三角、取整这批新数学函数的适用场景，知道什么时候才需要它们。

预计 30 到 50 分钟，含 1 组动手实验与 4 道练习。

## 1. 问题引入：三遍媒体查询才管住一个宽度

你要做内容主区：宽屏时限宽 1200px 居中，窄屏时占满全宽但两侧留 16px。老写法是基础样式加一条媒体查询：

```css
.container { width: 100%; padding: 0 16px; }
@media (min-width: 1232px) { .container { width: 1200px; } }
```

数值 1232 是手算的（1200 + 32），设计稿一改就得重算。而且「字号随屏幕平滑变大」这类需求，断点写法会做成一档一档跳变——体验粗糙。

CSS 函数就是给样式装上计算器：**min/max/clamp 管边界，calc 管算术，color-mix 管调色**。上面的需求一行就够：`width: min(1200px, 100% - 32px)`——取两者较小值，语义与代码完全一致。

## 2. 最小示例：会算术的容器与标题

`styles.css`：

```css
/* 限宽容器：宽屏 1200 封顶，窄屏留边自适应 */
.container {
  width: min(1200px, 100% - 32px);
  margin-inline: auto;
}

/* 流体标题：小屏 1.5rem、大屏 3rem，中间连续缩放 */
.hero-title {
  font-size: clamp(1.5rem, 1rem + 2.5vw, 3rem);
}
```

预期效果：容器在 1232px 视口处自动从「全宽留边」过渡到「1200 封顶」，不需要任何媒体查询；标题从窄屏拉宽到宽屏，字号连续平滑变大、到 3rem 停住。把窗口缓慢拖一遍，感受「连续」和「跳变」的差别——这就是函数式写法的体验升级。

## 3. 核心概念

### 3.1 calc()：混合单位算术与空格规则

```css
.sidebar-layout { width: calc(100% - 240px); }        /* 百分比减像素 */
.delayed { transition-delay: calc(0.1s * 3); }        /* 时间也能乘 */
.tilted { transform: rotate(calc(45deg + 10deg)); }   /* 角度也能加 */
```

语法红线：**`+` 和 `-` 两侧必须有空格**。`calc(100%-240px)` 会被解析成「100 减号后缀 -240px 的 px」这种非法式子，整条声明静默失效——不报错、不生效、最烦人。乘除两侧不强制空格，但除数必须是数字（`calc(100% / 3)` 合法，`calc(100% / 3px)` 非法）。

### 3.2 min、max、clamp：边界思维

```css
width: min(1200px, 100% - 32px);  /* 上界：再宽也不超过 1200 */
width: max(160px, 100%);          /* 下界：再窄也不小于 160 */
width: clamp(200px, 50%, 400px);  /* 区间：等价 max(200px, min(50%, 400px)) */
```

`clamp(最小, 首选, 最大)` 是 min 与 max 的合体，参数顺序口诀「**最小、理想、最大**」。流体排版的标准公式与推导：

```css
font-size: clamp(1.5rem, 1rem + 2.5vw, 3rem);
```

- 两个端点是设计稿给的：小屏 1.5rem（24px）、大屏 3rem（48px）；
- 中间项的职责是「斜率」：`1rem + 2.5vw` 表示随视口每 100px 增长 2.5px；
- 斜率公式：`(大端 - 小端) ÷ (大视口 - 小视口)`。如 24px 到 48px 跨 1000px 视口，斜率 = 24 ÷ 1000 = 0.024 = 2.4vw，再减去小端随视口的部分得到截距。日常记「1rem + 2vw 起步，看着调」就够用。

间距同理：`padding-block: clamp(2rem, 1rem + 4vw, 6rem)`。clamp 管连续缩放，媒体查询管结构性跳变（单列换多列），分工见 [媒体查询](/css/360-MediaQuery)。

### 3.3 color-mix()：从一个主色派生整套色

```css
:root {
  --color-primary: #2563eb;
}
.button { background: var(--color-primary); }
.button:hover {
  /* 主色 90% + 黑 10% = 深一档的悬停色 */
  background: color-mix(in srgb, var(--color-primary) 90%, black);
}
.button:disabled {
  /* 主色 40% 掺透明 = 禁用态 */
  background: color-mix(in srgb, var(--color-primary) 40%, transparent);
}
.card {
  /* 主色 30% 掺透明 = 淡淡的强调边框 */
  border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
}
```

写完这四条，把 `--color-primary` 换成任意颜色刷新：悬停、禁用、边框全部自动跟随。以前要在设计软件里配一套色板再抄进 CSS，现在浏览器自己调。`in srgb` 指定混合空间，追求更自然的中途色可换 `in oklab`（色彩空间详见 [现代色彩空间](/css/400-ModernColorSpace)）。

### 3.4 数学函数族：认识即可，别硬用

2023 年起 CSS 补齐了完整数学函数：`sin/cos/tan`（周期动画、圆形轨迹）、`atan2`（从坐标反推角度）、`round/mod/rem`（取整与余数，做阶梯值）、`abs/sign`、`pow/sqrt/hypot`。典型用法：

```css
/* 装饰点排布在圆轨道上 */
.orbit {
  left: calc(50% + 120px * cos(45deg));
  top: calc(50% + 120px * sin(45deg));
}
```

日常业务 95% 的场景只用到 calc/min/max/clamp 加 color-mix；图形与动效类需求再回来查这批函数。

### 3.5 求值时机：一句话版

calc 等数学函数在「计算值」阶段求值，此时单位已统一，所以混合百分比与像素不会递归；var() 在更早的替换阶段生效，替换结果无效时整条声明失效而不是落到回退值——这条规则的完整展开在 [CSS 变量](/css/410-CSSVariableCustomAttribute) 的陷阱一节。渐变函数（linear/radial/conic）也是本家族成员，专篇见 [渐变](/css/260-Gradient)。

## 4. 修改实验

对第 2 节动手，每步先预测再刷新：

1. 把容器改成 `min(1200px, 100% - 10vw)`：窄屏时两侧留白随视口变宽——min 的参数可以都很「活」；
2. 标题斜率从 2.5vw 改成 0.5vw：字号几乎不动，再改成 6vw：早早顶到 3rem——亲手感受斜率参数；
3. 把 color-mix 的 `black` 换成 `white`：hover 变亮档——一个参数翻转整套明暗策略；
4. 写一条 `calc(100%-32px)`（故意无空格）：宽度失效，DevTools 里显示 Invalid property value——把这条红线记进肌肉记忆。

## 5. 常见错误与调试实录

错误一：加减号缺空格。静默失效，样式被划掉。排查：DevTools 的 Styles 面板看该声明是否标 Invalid；写 calc 时先把空格敲上。

错误二：类型不匹配。`min(1, 100px)` 把无单位数字和长度混比，整条无效。min/max/clamp 的参数必须能化成同一类型。

错误三：clamp 最小值大于最大值。`clamp(3rem, 2vw, 1.5rem)` 结果不可预期。先写死两端点检查大小，再补中间斜率。

错误四：旧浏览器没兜底。color-mix、三角函数属于较新特性，面向旧内核的项目用 `@supports` 给回退值（写法见 [特性检测](/css/460-FeatureQuery)）；clamp 与 calc 本身已广泛可用，不需要保护。

错误五：把能算的都写死。设计稿标注 376px，你抄 376px，不如问一句它是不是 `50% - 24px` 或 `min(376px, 100%)`——函数的意义就是让尺寸跟随环境，而不是复刻快照。

## 6. 实际场景

- 限宽容器与栅格间距：`min(1200px, 100% - 32px)` 是 2026 年的「标准开头三板斧」之一；
- 流体字号与留白：clamp 公式一套用到黑，配合变量做成 `--step-0` 到 `--step-5` 的字号令牌阶梯；
- 主题派生色：color-mix 从主色生成 hover/active/disabled/border 全家族，与 [CSS 变量](/css/410-CSSVariableCustomAttribute) 的令牌体系组合是现代设计系统的标配——FANDEX 网页端双主题的整套派生色就是「一个主色变量加一串 color-mix」驱动的；
- 布局残余计算：侧栏定宽后 `calc(100% - var(--sidebar-w))`；有 Grid/Flex 之后这类算术大多能省，优先用布局系统；
- 阶梯化取值：`round(up, var(--n), 8px)` 对齐 8px 网格，设计走查神器。

## 7. 小练习

预测题（3 分钟）：视口 900px 时，`width: min(1200px, 100% - 32px)` 结果是多少？视口 1600px 时呢？（868px；1200px。）

修改题（8 分钟）：把标题改成从 2rem 到 4rem、跨越 800 到 1600px 视口的流体字号，写出完整 clamp 值（斜率 = 32 ÷ 800 = 4vw，中间项约 `2rem + 4vw` 减去小端截距，验证手感后微调）。

修 Bug 题（10 分钟）：下面代码在部分浏览器里宽度无效。指出两处问题并修复：

```css
.sidebar {
  width: calc(100% -240px);
}
.badge {
  min-width: min(20, 5vw);
}
```

（答案方向：`-240px` 前缺空格；`min(20, 5vw)` 类型不匹配，无单位数字应为 `20px`。）

挑战题（半小时，不看正文独立完成）：用纯函数（不用媒体查询）做一节「自适应文章页」：容器限宽 65ch 等效宽度、标题与正文用两档 clamp 字号、按钮三态颜色全部 color-mix 派生。验收：窗口 360 到 1920px 全程无跳变、主色变量改一处全页跟随、CSS 至少一条注释推导某个 clamp 的斜率。

## 8. 与之前和之后的知识的关系

- 之前：[CSS3 概述与基本语法](/css/020-CSS3OverviewBasicSyntax) 里的「值与单位」是函数的运算对象；
- 并行：[CSS 变量](/css/410-CSSVariableCustomAttribute) 是函数最好的搭档（令牌进、计算值出）；[媒体查询](/css/360-MediaQuery) 与 clamp 的分工（连续缩放 vs 结构跳变）；[渐变](/css/260-Gradient)、[现代色彩空间](/css/400-ModernColorSpace) 是函数家族的颜色分支；
- 之后：[响应式设计](/css/370-ResponsiveDesign) 把流体单位与断点组织成完整方法论；[CSS 变量](/css/410-CSSVariableCustomAttribute) 下一篇马上展开 var 的全部行为。

## 9. 官方文档

- MDN calc() 参考：https://developer.mozilla.org/zh-CN/docs/Web/CSS/calc
- MDN min/max/clamp 参考：https://developer.mozilla.org/zh-CN/docs/Web/CSS/clamp
- MDN color-mix() 参考：https://developer.mozilla.org/zh-CN/docs/Web/CSS/color_value/color-mix

## 10. 自我检查

- 能默写 min/max/clamp 的语义与 clamp 三参数口诀，并推导流体字号斜率；
- calc 的空格规则与类型匹配限制能各举一个反例；
- 能用 color-mix 写出主色的 hover、禁用、边框三个派生色；
- 拿到「限宽加留边」需求时第一反应是 min() 而不是媒体查询。

## 本章总结

CSS 函数让样式从「抄数值」变成「写公式」：calc 管混合单位算术（加减号两侧必须空格），min/max/clamp 管边界与区间，clamp 三参数是最小、理想、最大，配合 vw 斜率就是流体排版；color-mix 从主色派生整套交互色，主色一改全套跟随；三角与取整函数属于图形场景的储备。求值时机一句话：数学函数在计算值阶段算，var 在替换阶段换。函数加变量，是 2026 年 CSS 写法的默认起手式。

## 下一步

进入 [CSS 变量与自定义属性](/css/410-CSSVariableCustomAttribute)：函数负责算，变量负责存与传——把值抽成语义令牌、搭出双主题系统，让本文的计算结果可以被全局复用。
