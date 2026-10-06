---
order: 390
title: 媒体查询
module: 'css'
category: 前端技术
difficulty: intermediate
description: "从「手机打开自己的页面缩成一团」出发，用 viewport meta 加移动优先断点让一套代码适配全设备，掌握 @media 语法解剖与区间新写法，收下深色模式、减少动画、hover 指针探测三个用户偏好查询，并划清媒体查询与容器查询的分工边界。"
author: fanquanpp
updated: '2026-09-29'
related:
  - 'css/370-ResponsiveDesign'
  - 'css/390-ContainerQuery'
  - 'css/410-CSSVariableCustomAttribute'
  - 'css/460-FeatureQuery'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
---

## 前置知识

- 已完成 [CSS3 概述与基本语法](/css/020-CSS3OverviewBasicSyntax)；
- 例子里的网格布局看不懂不影响主线，只把它当「一段会变的样式」，深入版见 [CSS3 Grid 网格布局](/css/250-CSS3GridGridLayout)。

## 学习目标

读完本文你将能够：

1. 写出移动优先的断点体系：基础样式管窄屏，`min-width` 逐级增强；
2. 解剖任何一条 `@media` 规则：媒体类型、媒体特性、逻辑操作符各管什么，并用区间新写法 `(400px <= width <= 800px)` 替代 min/max 拼接；
3. 解释为什么缺了 viewport meta 手机上媒体查询会集体失效；
4. 用 `prefers-color-scheme`、`prefers-reduced-motion`、`(hover: hover)` 响应系统偏好与设备能力；
5. 在 JS 里用 `matchMedia` 监听同一套条件，并说清页面级响应（媒体查询）与组件级响应（容器查询）的分工。

预计 40 到 60 分钟，含 1 组动手实验与 4 道练习。

## 知识点地图

- **知识类别**：媒体查询（@media）——按设备与用户偏好切换样式的
  条件语法，响应式设计的技术底座。
- **解决什么问题**：一套代码适配全设备（断点）与尊重用户偏好
  （深色模式、减少动画、hover 能力）。
- **什么时候用到**：所有生产页面；与 [390-ContainerQuery](/css/390-ContainerQuery)
  分工——媒体查询看「视口/设备」，容器查询看「父容器」。

## 1. 问题引入：自己的页面在手机上缩成一团

你把桌面版的周报站发给朋友，他用手机打开：页面按 980px 左右的宽度渲染再整体缩小，字小得要用两根手指放大才能看。你明明在 CSS 里写了「窄屏单列」的规则，为什么没生效？

两个原因叠在一起：一是手机浏览器默认按约 980px 的「布局视口」渲染页面（模拟桌面浏览器），你的窄屏断点条件根本不成立；二是就算成立，你的规则也可能是「桌面优先」的覆盖式补丁，窄屏样式永远打不赢。解法是一套组合拳：**meta 声明真实视口宽度，移动优先的断点从窄到宽叠加增强**。这套组合拳就是本文的主线。

## 2. 最小示例：单列到三列的移动优先网格

`index.html` 的 head 里必须有这行（原因见 3.2）：

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

`styles.css`：

```css
/* 基础样式：默认面向窄屏，不包任何媒体查询 */
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

/* 平板起：两列 */
@media (min-width: 640px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 桌面起：三列 */
@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

预期效果：手机上单列；把浏览器窗口从窄拉宽，640px 时变两列、1024px 时变三列，且不需要刷新。窄屏设备只吃到最简样式，增强逐级叠加——这就是移动优先：**为最受限的设备写默认值，再问「更大的屏幕能多给什么」**。

## 3. 核心概念

### 3.1 语法解剖：一条 @media 由三部分组成

```css
@media screen and (min-width: 768px), print {
  /* 命中条件之一即应用 */
}
```

- **媒体类型**：`all`（默认）、`screen`、`print`。2000 年代还能见到 `speech`，实际项目里最常用的是省略类型直接写特性；
- **媒体特性**：`(min-width: 768px)`、`(orientation: portrait)`、`(prefers-color-scheme: dark)`，写成「特性: 值」，无值特性如 `(color)` 表示「支持该能力」；
- **逻辑操作符**：`and` 连接且语义；逗号分隔任一命中即真（或语义）；`not` 取反整个查询（不能只取反一个特性）；`only` 是给远古浏览器的历史兼容词，现代可删。

区间新写法（Media Queries Level 4，2023 年起全主流支持）把 min/max 拼接变成数学不等式：

```css
@media (width >= 768px) { }              /* 等价 min-width: 768px */
@media (768px <= width <= 1024px) { }    /* 只命中这个区间 */
```

新写法天然消灭「767 还是 768」的边界笔误，新项目建议直接用它。

### 3.2 viewport meta：不写它，一切白搭

媒体查询里的 `width` 指的是**布局视口**宽度。手机浏览器默认把布局视口设为约 980px 来模拟桌面——此时 `(max-width: 767px)` 永远为假，所有窄屏规则集体沉默，页面再被整体缩小塞进屏幕。`<meta name="viewport" content="width=device-width, initial-scale=1">` 把布局视口锁到设备真实宽度，媒体查询才有真实的判断依据。它是响应式的第一行代码，不是可选项。

### 3.3 层叠行为：媒体查询不改优先级，只管「参不参赛」

`@media` 内外的规则优先级算法完全一样，媒体查询只决定这批规则**是否参与层叠**。同优先级时仍是后写者胜。移动优先之所以顺：基础样式在前、增强断点在后，天然「后者覆盖前者」。反过来说，把宽屏规则写在文件末尾、窄屏补丁写在前面，就要靠优先级硬刚——自找麻烦。层叠的完整规则见 [层叠与继承](/css/160-CascadeInheritanceBasics)，现代的 `@layer` 加持见 [级联层](/css/450-CascadeLayer)。

### 3.4 用户偏好查询：把「系统的设置」变成设计约束

这组特性问的不是「设备多宽」，而是「用户怎么用设备」，是 2020 年代媒体查询的主角：

```css
/* 深色模式：只切变量，一套选择器管两种主题 */
:root {
  --bg: #ffffff;
  --text: #171717;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #171717;
    --text: #f5f5f5;
  }
}
body { background: var(--bg); color: var(--text); }

/* 减少动态效果：前庭敏感用户的一等公民权益 */
.banner { animation: slide-in 0.6s ease; }
@media (prefers-reduced-motion: reduce) {
  .banner { animation: none; }
}

/* 只在真正有鼠标的设备启用悬停效果，触屏不粘住 */
@media (hover: hover) and (pointer: fine) {
  .card:hover { transform: translateY(-2px); }
}
```

深色模式与 CSS 变量是绝配——变量管「色值是什么」，媒体查询管「什么时候换」，组件层完全不感知主题切换。FANDEX 网页端的「设计令牌双主题」演示就是这个结构的完整实现：所有颜色收敛为令牌变量，`prefers-color-scheme` 只改令牌，可对照着拆。

### 3.5 打印与方向

```css
/* 打印：藏起导航广告，正文铺满，卡片不跨页截断 */
@media print {
  .navbar, .sidebar { display: none; }
  main { width: 100%; }
  .card { break-inside: avoid; }
}

/* 平板横屏切两栏 */
@media (orientation: landscape) {
  .profile { grid-template-columns: 200px 1fr; }
}
```

### 3.6 JS 侧的同一套条件

CSS 的媒体查询和 JS 的 `matchMedia` 读的是同一个判定器，两边写同一条字符串就能保证行为一致：

```js
const mq = window.matchMedia('(min-width: 1024px)')

function sync(e) {
  console.log('桌面布局:', e.matches)
}

mq.addEventListener('change', sync) // 命中状态变化时触发
sync(mq)                            // 初始化先手动执行一次
```

组件卸载时 `removeEventListener` 清理；已废弃的 `addListener`/`removeListener` 不要再用。

## 4. 修改实验

对第 2 节动手，每步先预测再刷新：

1. 把 `min-width: 640px` 改成区间写法 `(640px <= width < 1024px)`：两列规则只在中间档生效，桌面回落到三列——体会区间语法的排他性；
2. 追加 `@media (prefers-color-scheme: dark)` 切换 body 底色，再在系统设置里切深浅主题看联动；
3. 给 `.grid` 加 `gap: clamp(8px, 2vw, 24px)`：断点没动，间距先流式起来——媒体查询与流式单位是互补不是二选一；
4. 删掉 viewport meta（如果是在本地桌面浏览器实验，可用 DevTools 的设备模拟器验证）：窄屏模拟下断点全部失效——亲手复现第 1 节的事故。

## 5. 常见错误与调试实录

错误一：忘了 viewport meta。症状是手机上页面「整页缩小、字极小、断点全哑」。检查 head 第一区有没有 `width=device-width`；用 DevTools 设备模拟器（它会自动模拟真实视口）复现最直接。

错误二：767 与 768 之间漏缝。`max-width: 767px` 加 `min-width: 768px` 理论无缝，但实际写 `766.5px` 这类小数视口（缩放、折叠屏）时就漏。改用区间写法 `(width < 768px)` 与 `(width >= 768px)`，数学上互补，永不漏缝。

错误三：桌面优先的补丁越打越多。基础样式按 1440px 写，再用 `max-width` 一层层往下覆盖，三档之后每条规则都在和前一条打架。重构方向：反转成移动优先；过渡期至少把同一属性的断点规则收敛到一处。

错误四：断点跟着设备走而不是跟着内容走。照着 iPhone 15、iPad Pro 的宽度定断点，新设备一出就碎。断点应该在内容「开始难看」的地方取值：把窗口从宽往窄拖，正文行长超过约 70 字符、卡片挤成条时，那里就是断点。

错误五：触屏上的 hover 粘滞。没有 hover 能力的设备上 `:hover` 样式会在点按后粘住不消失。悬停交互包进 `@media (hover: hover)`（第 2 节实验里那条组合），没有指针的设备直接给静态态。

## 6. 实际场景

- 页面级响应：布局骨架、导航形态（侧栏换底部标签栏）、字号阶梯——视口级信息，媒体查询的主场；
- 组件级响应：同一张卡片在侧栏和主区里表现不同——该容器查询出场（`container-type` 加 `@container`），见 [容器查询](/css/390-ContainerQuery)。分工口诀：**页面找视口，组件找容器**，两者长期共存而非替代；
- 主题与无障碍：深浅主题、减少动画、强制深色（`forced-colors`）这类「尊重用户设置」的适配，全部走偏好查询；
- 断点即令牌：把 640/1024/1440 写进 CSS 变量或设计令牌，团队与 JS 侧 `matchMedia` 共用一套数值——FANDEX 网页端的令牌体系把断点与色板一起纳入了双主题令牌清单，值得参考；
- 打印与电子墨水：`@media print` 做导出友好的文档页。

## 7. 小练习

预测题（3 分钟）：视口宽 800px，`(min-width: 640px)` 和 `(max-width: 799px)` 两条规则分别命中吗？改成区间写法再表达一次第二条。（前者命中；后者命中；区间写法 `(640px <= width < 800px)`。）

修改题（8 分钟）：给第 2 节加第四档 `min-width: 1440px`：容器限宽 1200px 居中。验收：超宽屏上内容不铺满全屏（行长可控），窄屏行为不变。

修 Bug 题（10 分钟）：同事的页面在手机上不响应，但桌面浏览器缩窄窗口时断点又都正常。给出你的排查顺序与最可能的根因。（提示：桌面缩窄改的是窗口宽度所以断点活着；手机上布局视口没被声明，默认 980px——查 viewport meta。）

挑战题（半小时，不看正文独立完成）：把周报站首页做成完整响应式：窄屏单列、640 起两列、1024 起侧栏加正文双栏；全站颜色走变量并支持深色模式；动画一律尊重 `prefers-reduced-motion`。验收：无桌面优先补丁（只有 min-width 或区间写法）、断点数值与 JS 侧 matchMedia 用同一组常量、CSS 至少一条注释解释某个断点的取值依据。

## 8. 与之前和之后的知识的关系

- 之前：[层叠与继承](/css/160-CascadeInheritanceBasics) 解释了「断点内规则为什么盖得住基础样式」；[CSS 变量与自定义属性](/css/410-CSSVariableCustomAttribute) 是主题切换的执行器，媒体查询只拨开关；
- 并行：[容器查询](/css/390-ContainerQuery) 接管组件级响应；[特性检测 @supports](/css/460-FeatureQuery) 与媒体查询长得像但问的问题不同——前者问「支不支持这个属性」，后者问「环境是什么样」；[移动端适配](/css/380-MobileAdaptation) 讲 rem/vw 这套尺寸策略，与断点配合；
- 之后：[响应式设计](/css/370-ResponsiveDesign) 把 viewport、断点、流式单位、响应式图片组装成完整方法论。

## 9. 官方文档

- MDN「使用媒体查询」：https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_media_queries/Using_media_queries
- MDN prefers-color-scheme 参考：https://developer.mozilla.org/zh-CN/docs/Web/CSS/@media/prefers-color-scheme
- web.dev「响应式设计基础」：https://web.dev/learn/design

## 10. 自我检查

- 能默写移动优先三档断点体系，并解释为什么基础样式不该包在媒体查询里；
- 看到任何一条 @media 能拆出媒体类型、特性、操作符，并用区间写法改写 min/max；
- 「手机上断点全哑」第一反应是查 viewport meta；
- 能说出深色模式的推荐实现（变量加偏好查询）与减少动画的必要性；
- 面对需求能判断该用媒体查询还是容器查询。

## 本章总结

媒体查询让样式响应「环境」：viewport meta 先锁定真实布局视口，移动优先从窄屏基础样式起步，min-width 或区间语法逐级增强；@media 由类型、特性、操作符组成，层叠优先级不受它影响、只由书写顺序与优先级决定。用户偏好查询（深色模式、减少动画、hover/pointer）把系统设置变成设计约束，与 CSS 变量配合是主题系统的标准结构。页面级找媒体查询、组件级找容器查询，断点跟着内容取值并收敛为团队令牌。

## 下一步

进入 [响应式设计](/css/370-ResponsiveDesign)：断点只是零件，下一篇把 viewport、流式单位、弹性布局、响应式图片与本文的媒体查询组装成一套完整的响应式方法论。
