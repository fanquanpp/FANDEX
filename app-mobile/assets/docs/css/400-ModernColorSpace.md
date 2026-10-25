---
order: 430
title: 现代色彩空间：oklch、color-mix 与广色域
module: 'css'
category: 前端技术
difficulty: beginner
description: 从「设计稿的颜色上屏总差一点」出发拆掉 srgb 的历史包袱：动手调 oklch 的亮度/色度/色相三个旋钮、用 color-mix 从一个主色派生 hover 与浅底变体，并用 @supports 建立渐进增强的降级习惯。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'css/410-CSSVariableCustomAttribute'
  - 'css/460-FeatureQuery'
  - 'css/260-Gradient'
prerequisites:
  - 'css/110-CSSValuesAndUnits'
  - 'css/120-CSSFunctions'
---

## 前置知识

- 已完成 [CSS 值与单位深入](/css/110-CSSValuesAndUnits)：会写 hex 与 rgb() 颜色；
- 建议先读 [函数](/css/120-CSSFunctions)：calc() 与 var() 的调用习惯，本文会用 var() 装颜色。

**还没读函数篇也能跟**：新函数都是 `函数名(参数)` 的形状，代码复制即可运行。

## 学习目标

读完本文你将能够：

1. 说清 sRGB 的两个历史包袱：色域装不下新屏幕的鲜艳色、亮度感知不均匀导致配色靠手调；
2. 调 oklch() 的 L、C、H 三个分量，用同一个色相生成一套深浅色阶；
3. 用 color-mix() 从一个主色派生 hover 色、浅底色和半透明变体；
4. 写出双声明兜底与 @supports (color: oklch(0.7 0.1 200)) 门闩，说清渐进增强在颜色上的含义；
5. 遇到新颜色函数，会用 caniuse 查支持现状，会用 DevTools 警告图标识别被丢弃的声明。

预计 50 到 70 分钟，含 2 组动手实验与 4 道练习。

## 1. 问题引入：设计稿上的那个颜色，屏幕上总差一点

设计师发来一版活动页：主视觉是一种浓得发亮的橙红。你取色写进 CSS，截图发群，设计回了一句：「怎么在我手机上更艳，到你截图里就闷了？」这不是谁调错了，是两个历史包袱一起发作。

包袱一：**hex 和 rgb 写下的每个颜色，都住在 sRGB 色彩空间里**。这是上世纪的标准，管不着近几年的广色域屏——某些屏幕能显示的鲜艳色，sRGB 调色板里没有条目，浏览器只能就近取个暗淡些的凑数。

包袱二：**sRGB 的亮度是「数学上的」，不是「人眼上的」**。最直接的受害者是 HSL：`hsl(0 100% 50%)` 的红和 `hsl(240 100% 50%)` 的蓝都自称亮度 50%，摆在一起红得晃眼、蓝得发黑，做一套 100 到 900 的色阶只能一档档手调。

2020 年发布的 Oklab 色彩空间（oklch 是它的极坐标写法）同时回应了这两件事：色域够宽，装得下广色域屏的颜色；亮度按人眼感知校准，同一个 L 不同色相看起来一样亮。本文的主角 oklch() 就是为这两件事来的。

## 2. 动手实验一：三种红摆在一起

新建 `color-lab.html`（单文件，双击即可打开）：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>色彩空间对比</title>
  <style>
    .swatch {
      width: 260px;
      height: 64px;
      padding: 16px;
      box-sizing: border-box;
      color: white;
      margin-bottom: 8px;
    }
    .srgb  { background: #ff0000; }
    .p3    { background: color(display-p3 1 0 0); }
    .oklch { background: oklch(62% 0.25 29); }
  </style>
</head>
<body>
  <div class="swatch srgb">sRGB：#ff0000</div>
  <div class="swatch p3">display-p3：color(1 0 0)</div>
  <div class="swatch oklch">oklch：62% 0.25 29</div>
</body>
</html>
```

预期效果：在近几年的广色域屏上，第二条色块明显比第一条更「多汁」，像刚切开的番茄和洗印照片里番茄的差别；在只有 sRGB 的旧屏上前两条看起来一样——浏览器把装不下的颜色「夹」回了 sRGB 能表达的范围。

`color(display-p3 1 0 0)` 读作「display-p3 空间里红绿蓝全开到顶的红」，是绕过 sRGB 调色板、直接对新屏幕喊话的写法；第三条 `oklch(62% 0.25 29)` 艳度接近它，三个数字是什么下一节拆。

## 3. 核心概念：oklch 的三个旋钮

oklch(L C H) 把颜色拆成三个可独立拧的旋钮：**L**（Lightness，亮度 0% 到 100%，按人眼感知校准）、**C**（Chroma，色度即鲜艳程度，0 是无彩灰，日常 0 到 0.3 出头）、**H**（Hue，色相角度 0 到 360，29 附近橙红、145 绿、264 蓝）。L 管明暗、C 管艳度、H 管色相，三者互不牵连——这正是它比 hex 好用的根源：想给品牌蓝做个更浅的 hover 底色，只动 L 一根手指。

感知均匀还带来一个可批量生产的红利——**同一个 L、不同 H 的颜色，看起来一样亮**：

```css
/* 同一个色相（250，蓝）拉出一套色阶 */
:root {
  --brand-100: oklch(96% 0.03 250);
  --brand-300: oklch(80% 0.10 250);
  --brand-500: oklch(60% 0.18 250);
  --brand-700: oklch(45% 0.16 250);
  --brand-900: oklch(28% 0.09 250);
}
```

预期效果：一排从近白到近黑的蓝，各档过渡均匀。浅深两端各降一档色度是常见手法：极浅极深的颜色留一点彩就够，堆满色度反而显脏。

### 修改实验

对着色阶做两个观察，先预测再刷新：

1. 把五个变量里的 250 全改成 145（绿）再改成 29（橙红）。需要重调 L 吗？——不需要，只动 H，整套明暗节奏原样平移到新色相上；换 HSL 得把每档的 L 重调一遍，这就是「感知均匀」的价钱；
2. 把 --brand-500 的 0.18 改成 0.35。预期效果：更艳了，但出现「屏幕装不下、浏览器自行夹取」的迹象，且和另一台设备上的不一致——日常把 C 控制在 0.3 以内最稳。

## 4. color-mix()：从一个主色派生整个家族

真实项目里设计师往往只给一个主色，hover 色和浅底色让你「按主色自己派」。以前靠取色器肉眼调近似值，主色一改全部重调。color-mix() 把「派生」变成声明式：

```css
.btn {
  --brand: oklch(58% 0.19 250);
  background: var(--brand);
  color: white;
  padding: 10px 24px;
}
.btn:hover {
  background: color-mix(in oklch, var(--brand), black 12%);
}
.btn-soft {
  background: color-mix(in oklch, var(--brand), white 88%);
  color: oklch(45% 0.16 250);
}
```

预期效果：默认按钮是品牌蓝；悬停瞬间暗一小截；`.btn-soft` 是几乎白的浅蓝底、深蓝文字——浅底深字的次级按钮，全部由同一个 --brand 派生，改一处全体跟着变。

三点说破：**in 后面是混合发生的地方**，同样两种颜色在不同空间里连出的「中间路径」不同，派生场景无脑选 in oklch；**比例可以只写一头**，`black 12%` 即黑占 12%、主色占 88%，都省略时对半；**与 transparent 混合是半透明变体的正路**，`color-mix(in srgb, var(--brand), transparent 60%)` 只把透明度降到 40%、色相亮度原封不动（预乘透明度规则），比手写 rgba 好维护——主色改了，变体自动跟上。

## 5. 降级策略：兜底双声明与 @supports 门闩

颜色声明失败的方式很安静：**整条声明被丢弃，不报错**——第 020 篇讲过的静默失效在这里重演，后果是背景变透明、页面看着「坏了」，Console 里一片安详。

第一层防护是**双声明**，靠层叠兜底：

```css
.btn {
  background: #3b82f6;                 /* 老浏览器：留在这里 */
  background: oklch(62% 0.19 258);     /* 老浏览器读不懂，丢弃这条 */
}
```

读得懂的第二条覆盖第一条；读不懂的按无效值丢弃，第一条还在。零成本，顺手就写。

第二层防护是 **@supports 门闩**，对付「兜底结构本身不同」的场合：

```css
.btn-soft {
  /* 不支持 oklch 时，文字退回中性深灰，而不是写死的蓝 */
  color: #334155;
}

@supports (color: oklch(0.7 0.1 200)) {
  .btn-soft {
    color: oklch(45% 0.16 250);
  }
}
```

@supports 的参数是一条「试探用的假声明」：括号里写上用想检测的函数拼出的合法形状，支持则整块生效，不支持则整块跳过。当降级是「换一套搭配」而非「换个值」（浅底深字必须成对出现时），双声明表达不了，门闩上场。合起来就是渐进增强：**先让所有浏览器能看，再让新浏览器更好**。

兼容性怎么查：不背版本号，caniuse.com 搜函数名，看绿色格子覆盖的版本与 Baseline 状态。这类事实以季度为单位变化，任何教程的快照都可能过期，查表永远比背表可靠。

## 6. 常见错误与调试实录

错误一：color-mix 少了 in 空间。写成 `color-mix(red, blue)`——in 是语法硬性要求，整条声明作废，按钮背景消失。F12 选中按钮，Styles 面板里这条声明带黄色警告图标（非法值）；补上 `in oklch`，图标消失。Console 始终没有报错——CSS 的故障模式是静默失效，警告图标是唯一的案发现场。

错误二：色度写飞了，两台屏幕两个颜色。`oklch(70% 0.4 29)` 的 C 超出常规色域，浏览器把装不下的部分各自「夹」回能表达的范围，夹法因设备而异，症状是「我电脑上好看，设计机上发闷」。点 Styles 面板里颜色值左边的小色样，新版 Chrome DevTools 的取色器会标注颜色落在哪个色彩空间，还支持按住 Shift 在 hex、rgb、oklch 间轮换；把 C 收回 0.3 以内——先把 sRGB 里的样子调对，再考虑广色域外扩。

错误三：删了兜底。看到 caniuse 全绿就把双声明里的 hex 行删掉，某天用户反馈「按钮是透明的」——他的浏览器不在那片绿色里。兜底行留着不占地。

## 7. 实际场景

- 设计系统与主题：一个 --brand 用 color-mix 派生全套 hover、浅底、半透明变体，换主题只改一个变量（第 410 篇展开）；
- 广色域营销页：主视觉用 display-p3 配双声明，老设备落回 sRGB，新设备多得一分鲜艳；
- 夜间模式铺路：同一组 H、两套 L，就是亮暗两套主题的骨架；走查还原度时，先确认双方屏幕色域与浏览器是否同代，再查代码。

## 8. 小练习

预测题（5 分钟）：分别写 `background: color-mix(in srgb, blue, yellow)` 与 `background: color-mix(in oklch, blue, yellow)`，运行前写下两条色块的预测再验证。答案（写完再对照）：srgb 版是一滩没精打采的灰——蓝黄在 sRGB 里的直线中点正好穿过低饱和区；oklch 版是依然鲜艳的绿青色——感知均匀的中点保住了色度。

修改题（15 分钟）：从第 3 节色阶出发，用 color-mix 补两个成员：--brand-hover（比 --brand-500 暗一点，混 black 12%）和 --brand-surface（比 --brand-100 更浅更淡，混 white 60%）。验收：不写任何新的 oklch 字面量；把 250 改成 145 后，两个新成员自动跟着变绿。

修 Bug 题（15 分钟）：下面样式有两个真实 bug，症状是「按钮没有背景色，且悬停色在设计机和开发机上不一致」。先用 DevTools 定位（哪条声明带警告图标、哪个值的 C 超标），再修复，并给第一条声明补上 hex 兜底：

```css
.btn {
  --brand: oklch(58% 0.19 250);
  background: color-mix(var(--brand), white 20%);
  color: white;
}
.btn:hover {
  background: oklch(70% 0.45 260);
}
```

挑战题（半小时，不看正文独立完成）：只给起点色 oklch(58% 0.19 250)，做一张「订阅卡片」：主按钮（默认加 hover）、浅底提示条、半透明遮罩全部派生，每个新函数声明都配 sRGB 或 hex 兜底。验收：起点色 H 改成 145 后整体变绿且无一处写死的蓝；注释掉所有新函数行后，页面退化为能看的灰色系而不是空白；DevTools 查不到警告图标。

## 9. 与之前和之后的知识的关系

- 之前：[CSS 值与单位深入](/css/110-CSSValuesAndUnits) 给了 hex、rgb 与百分数的底子，本文是在它之上换坐标系；[函数](/css/120-CSSFunctions) 教的函数调用习惯与 var() 在 color-mix 里全部兑现；
- 之后：[CSS 变量与自定义属性](/css/410-CSSVariableCustomAttribute) 让写死的 --brand 变成可运行时替换的真变量；[特性查询](/css/460-FeatureQuery) 把 @supports 扩展成完整工具箱；[渐变](/css/260-Gradient) 的插值也能指定 in oklch。

## 10. 官方文档

- MDN color 值总览（各色彩空间函数入口）：https://developer.mozilla.org/zh-CN/docs/Web/CSS/color_value
- MDN oklch()：https://developer.mozilla.org/zh-CN/docs/Web/CSS/color_value/oklch
- MDN color-mix()：https://developer.mozilla.org/zh-CN/docs/Web/CSS/color_value/color-mix
- CSS Color Module Level 4（规范原文）：https://www.w3.org/TR/css-color-4/
- caniuse：https://caniuse.com

## 11. 自我检查

- 能讲清 sRGB 的两个历史包袱各导致什么日常症状；
- 能徒手写出「同一色相、五个亮度档」的 oklch 色阶，并说出浅深两端为何降色度；
- 能说出 color-mix 的 in 参数决定什么、与 transparent 混合为何只动透明度；
- 能默写双声明与 @supports 两种降级各自的适用场合，拿到没见过的颜色函数第一反应开 caniuse。

## 本章总结

hex 与 rgb 住在 sRGB 里：色域窄，装不下广色域屏的鲜艳色；亮度不按人眼感知，配色只能手调。oklch(L C H) 用感知均匀的三个旋钮把明暗与色相解耦，同一 L 不同色相一样亮，色阶可批量生成。color-mix 把派生色变成声明式，in oklch 是派生场景的默认选择，与 transparent 混合只动透明度。降级靠双声明与 @supports 门闩，原则是渐进增强：先能看，再更好。兼容性事实会过期，caniuse 与 DevTools 警告图标是常备工具。

## 下一步

进入 [CSS 变量与自定义属性](/css/410-CSSVariableCustomAttribute)：本文的 --brand 还只是占位名字，下一篇让它变成真正可在运行时读取、替换、计算的颜色变量——派生色家族在那一步才算完整成型。
