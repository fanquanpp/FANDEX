---
order: 170
title: SVG 动画基础
module: 'svg'
category: 前端技术
difficulty: advanced
description: 从「给页面加一个加载圈」出发：SMIL/animate/animateMotion、CSS 动画的 transform-box 坑、WAAPI 三条路线选型与性能铁律。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'svg/090-SVGTransform'
  - 'svg/050-SVGPathDetailed'
  - 'svg/130-SVGCSSStyling'
prerequisites:
  - 'svg/090-SVGTransform'
---

## 前置知识

- [SVG 变换 transform](/svg/090-SVGTransform)：transform 与嵌套坐标系
- [SVG path 详解](/svg/050-SVGPathDetailed)：路径动画需要看懂 `d` 语法

> 学习目标：能在 SMIL / CSS / JS（rAF、WAAPI）三条动画路线里做技术选型；掌握 SMIL 三件套 animate / animateTransform / animateMotion 的关键属性；理解 CSS 动画 SVG 时的 transform-box 坑；知道哪些属性可以被 CSS 平滑过渡。

## 知识点地图

- **知识类别**：SVG 动画的三条实现路线（SMIL 声明式、CSS、JS/WAAPI），对应 MDN「SVG animations」与 CSS animations 主题。
- **解决什么问题**：图标要转圈、图表要画线、引导浮层要沿路径飞行——同一个「动起来」的需求有三套技术栈，能力、宿主环境（独立文件 vs 内联页面）、可维护性各不相同；选错路线的经典事故是「动画放进 img 就不动了」。
- **什么时候用到**：加载指示器（独立 SVG 文件）；数据可视化入场动画（画线、数字滚动）；营销页的引导动效与路径动画；任何需要动效的 SVG 图形。
- **本篇主线**：先问「动画住在哪里」——独立 .svg 文件只有 SMIL 可用（CSS/JS 被静态安全模式隔离），内联页面三选一按交互复杂度递进：纯循环选 CSS、声明式交互链选 SMIL、数据驱动/复杂编排选 JS。第 10 节性能铁律与第 12 节坑点自检是三路线通用的护身符。
- **本篇不讲**：WebGL/canvas 动画、Lottie/GSAP 等第三方动效库、CSS `offset-path` 沿路径运动（HTML 元素侧的对应物）。

## 1. 你现在要解决什么问题

两个马上要交付的小需求：

1. 数据面板正在加载，需要一个转圈的 loading 图标——要求放进独立
   `.svg` 文件里复用，不能依赖页面环境；
2. 品牌页的 Logo 图标要在鼠标悬停时轻微放大，页面里一段曲线 Logo
   要「自己画出来」。

SVG 动画有三条技术路线（SMIL、CSS、JavaScript），选错路线的表现是：
要么独立 `.svg` 文件里动画静默失效，要么绕 viewBox 原点疯狂旋转。
本文的目标是让你**先会选路线，再会写三件套**。

## 2. 先做出来：一个纯 CSS 的加载圈

内联在 HTML 里时，CSS 是第一选择。新建 HTML 文件，粘贴运行：

```html
<svg viewBox="0 0 100 100" width="100" height="100">
  <g class="spinner">
    <circle cx="50" cy="50" r="40" fill="none" stroke="#e0e0e0" stroke-width="6" />
    <circle
      cx="50" cy="50" r="40" fill="none"
      stroke="#4f5bd5" stroke-width="6" stroke-linecap="round"
      stroke-dasharray="60 200"
    />
  </g>
  <style>
    .spinner {
      transform-origin: center;
      transform-box: fill-box;   /* 没有这一行，圆会绕 viewBox 原点转出画面 */
      animation: spin 1.2s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</svg>
```

**原理**：`stroke-dasharray: 60 200` 让圆环只显示一段 60 单位长的弧，
整体旋转就是加载圈。

两行 CSS 决定成败：SVG 元素默认 `transform-origin` 以 **viewBox 原点**
为参考，先写 `transform-box: fill-box`（以元素自身边界框为参考系），
再谈 `transform-origin: center`。顺序反了，动画照样能跑，位置完全不对。

## 3. 三条路线怎么选

| 方案           | 说明                                          | 优势                    | 劣势                           |
| -------------- | --------------------------------------------- | ----------------------- | ------------------------------ |
| **SMIL**       | `<animate>`、`<animateTransform>` 等 SVG 原生 | 无需 JS、声明式、写进独立 .svg 文件依然生效 | 语法繁琐；前景存疑（见第 11 节） |
| **CSS**        | `@keyframes` + `transform`                    | 浏览器优化好、生态成熟、写起来最短 | 仅限 CSS 可控属性；无法响应复杂逻辑 |
| **JavaScript** | requestAnimationFrame / WAAPI                 | 灵活、可做复杂逻辑、可数据驱动 | 代码量最大；rAF 手写循环需自己管性能 |

选型口诀：**简单循环、要进独立 .svg 文件选 SMIL；内联页面元素选
CSS；需要交互逻辑/数据驱动选 JS 或 WAAPI**。

## 4. SMIL 三件套之一：animate（属性动画）

`<animate>` 在指定时间内变化某个属性值。把下面文件存成 `.svg`
直接用浏览器打开——CSS 方案做不到这一点，SMIL 的核心价值先体会一下：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
  <rect x="10" y="40" width="40" height="20" fill="#4f5bd5">
    <animate attributeName="x" from="10" to="150" dur="2s" repeatCount="indefinite" />
  </rect>
</svg>
```

### 4.1 关键属性

| 属性            | 说明                                            |
| --------------- | ----------------------------------------------- |
| `attributeName` | 要变化的属性名                                  |
| `from / to`     | 起始/结束值                                     |
| `values`        | 关键帧值列表（分号分隔）                        |
| `dur`           | 持续时间（如 `2s`、`500ms`）                    |
| `repeatCount`   | 重复次数（数字或 `indefinite`）                 |
| `begin`         | 开始时间（如 `1s`、`btn.click`）                |
| `end`           | 结束条件                                        |
| `fill`          | 动画结束行为：`freeze` 保留终值 / `remove` 还原 |
| `calcMode`      | 插值模式：linear / paced / spline / discrete    |

### 4.2 values 关键帧与插值

```svg
<circle cx="50" cy="50" r="20" fill="#4f5bd5">
  <animate
    attributeName="cx"
    values="50;150;100;50"
    keyTimes="0;0.5;0.8;1"
    dur="4s"
    repeatCount="indefinite"
  />
</circle>
```

`keyTimes` 与 `values` 一一对应（0 到 1，必须从 0 开始到 1 结束）。
缓动用 `calcMode="spline"` 配 `keySplines`（四个数字即一条贝塞尔，
等价于 CSS 的 `cubic-bezier`）：

```svg
<animate
  attributeName="cx"
  values="50;150;50"
  keyTimes="0;0.5;1"
  keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
  calcMode="spline"
  dur="2s"
  repeatCount="indefinite"
/>
```

### 4.3 set：瞬间的状态切换

`<set>` 是 `<animate>` 的简化版，不带插值，到点直接改值：

```svg
<rect width="100" height="100" fill="#4f5bd5">
  <set attributeName="fill" to="#d63031" begin="2s" />
</rect>
<!-- 2 秒后突然变红 -->
```

## 5. 三件套之二：animateTransform（变换动画）

`<animateTransform>` 专用于 `transform` 属性，`type` 取
translate / rotate / scale / skewX / skewY：

```svg
<rect x="-25" y="-25" width="50" height="50" fill="#4f5bd5">
  <animateTransform
    attributeName="transform"
    type="rotate"
    from="0 0 0"
    to="360 0 0"
    dur="4s"
    repeatCount="indefinite"
  />
</rect>
```

一个元素同时平移又旋转时，两个动画会互相覆盖——`additive="sum"`
让它们叠加生效，这是 SMIL 最容易忘的属性：

```svg
<g>
  <animateTransform
    attributeName="transform" type="translate"
    values="0 0; 100 0; 0 0"
    dur="4s" repeatCount="indefinite" additive="sum"
  />
  <animateTransform
    attributeName="transform" type="rotate"
    values="0; 360"
    dur="2s" repeatCount="indefinite" additive="sum"
  />
  <rect x="-20" y="-20" width="40" height="40" fill="#4f5bd5" />
</g>
```

rotate 的取值可以带旋转中心：`from="0 cx cy" to="360 cx cy"`。

## 6. 三件套之三：animateMotion（路径动画）

让元素沿指定路径运动——品牌页「Logo 沿曲线滑过」类需求的原生解法：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200">
  <path id="motion-path" d="M 20 100 Q 150 20 280 100" fill="none" stroke="#ccc" />
  <circle r="10" fill="#4f5bd5">
    <animateMotion dur="3s" repeatCount="indefinite">
      <mpath href="#motion-path" />
    </animateMotion>
  </circle>
</svg>
```

两种引用路径的方式：`<mpath href="#id">` 复用现有路径，或直接内联
`<animateMotion path="M 0 0 L 100 0 ..." />`。

三个常用增强：

- `rotate="auto"`：元素方向跟随路径切线（小火箭沿轨道转头），
  `auto-reverse` 反向；
- `keyPoints="0;0.5;1"` 配 `keyTimes`：控制「路径位置进度」的节奏，
  做前快后慢；
- 路径本身可以是 `closed`（Z 结尾），元素就循环绕圈。

## 7. SMIL 的事件触发：不用 JS 的交互

`begin` 不只接受时间，还能监听事件——这是 CSS 做不到的能力：

```svg
<rect id="btn" x="50" y="30" width="100" height="40" rx="8" fill="#4f5bd5" />
<circle cx="100" cy="50" r="0" fill="#d63031">
  <animate attributeName="r" from="0" to="80" begin="btn.click" dur="0.5s" fill="remove" />
</circle>
```

| 事件                   | 触发时机            |
| ---------------------- | ------------------- |
| `click`                | 点击                |
| `mouseover` / `mouseout` | 悬停 / 移出       |
| `focusin` / `focusout` | 获取/失去焦点       |
| `a1.end` / `a1.begin`  | 其他动画的结束/开始 |
| `a1.repeat(n)`         | 动画第 n 次重复     |

动画链式触发（水波纹、逐帧展开的引导动画）因此可以纯声明式完成：

```svg
<rect>
  <animate id="a1" attributeName="x" from="0" to="100" dur="1s" begin="0s" fill="freeze" />
  <animate attributeName="y" from="0" to="100" dur="1s" begin="a1.end" fill="freeze" />
</rect>
```

## 8. CSS 路线的完整能力清单

除了第 2 节的 transform，CSS 还能动画哪些 SVG 属性：

| 类别                 | 示例                               |
| -------------------- | ---------------------------------- |
| 几何属性（SVG 2 属性化） | `cx`、`cy`、`r`、`x`、`y`、`width`、`height` |
| 颜色属性             | `fill`、`stroke`、`stop-color`     |
| 透明度               | `opacity`、`fill-opacity`、`stroke-opacity` |
| 描边（画线动画）     | `stroke-dasharray`、`stroke-dashoffset` |
| 变换                 | `transform`                        |
| 滤镜                 | `filter`                           |

几何属性能被 CSS 动画，本质是 SVG 2 把它们定义成了 CSS 属性；
`d` 也被属性化了，但目前只有 Chromium 实现了 CSS 动画 `d`——
**跨浏览器代码不要用 CSS 改 `d`**。

### 8.1 画线动画：stroke-dashoffset 技巧

「Logo 自己画出来」的经典三步（SVG 描边动画第一课）：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
  <path
    d="M 10 50 Q 100 10 190 50"
    fill="none" stroke="#4f5bd5" stroke-width="3"
    pathLength="100"
    stroke-dasharray="100"
    stroke-dashoffset="100">
    <animate attributeName="stroke-dashoffset" from="100" to="0" dur="2s" fill="freeze" />
  </path>
</svg>
```

1. `pathLength="100"` 把路径长度归一化为 100，从此不用 `getTotalLength()`
   实测，dasharray/dashoffset 直接按 100 写（不写它就要先实测长度）；
2. `stroke-dasharray` 等于总长：一段实线恰好盖满全路径；
3. `stroke-dashoffset` 从总长降到 0，实线段从起点「长」出来。

同样的技巧用 CSS `@keyframes` 动画 `stroke-dashoffset` 也完全可行，
内联场景推荐 CSS 版。

## 9. JavaScript 路线：rAF 与 WAAPI

数据驱动、物理模拟、跟随鼠标这类需求，JS 是唯一解。手写版用
requestAnimationFrame：

```javascript
const circle = document.querySelector('circle');
let start = null;

function animate(timestamp) {
  if (!start) start = timestamp;
  const progress = ((timestamp - start) / 2000) % 1;
  circle.setAttribute('cx', 50 + progress * 100);
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
```

更推荐 Web Animations API（WAAPI）：一行拿到可播放、可暂停、可取
finished Promise 的动画对象，性能走浏览器合成管线，接近 CSS：

```javascript
const rect = document.querySelector('rect');
rect.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(200px)' }], {
  duration: 2000,
  iterations: Infinity,
  easing: 'ease-in-out',
});
```

顺带一提：CSS 的 offset-path（motion path）正在成为沿路径动画的
标准化替代，`offset-path: path('M ...')` 配合动画 `offset-distance`，
在内联场景可以取代 animateMotion；但 `<img>` 引用的独立 SVG 里
仍然只有 SMIL 可用。

## 10. 性能铁律与自检

优先级从高到低：

1. **CSS/WAAPI 动 transform 与 opacity**（可走合成器，不重排不重绘）；
2. **SMIL**（声明式，浏览器内部优化）;
3. **JS + rAF 改属性**（每帧重绘，成本最高，务必缓存读取值）。

```css
/* 给长动画元素一个提示，让浏览器提前分层 */
.animated-element {
  will-change: transform;
}
```

rAF 循环里最常见的自伤是「每帧读布局再写样式」（读写交错强制回流）：

```javascript
// 错误：每帧读 offsetWidth 触发布局
function animate() {
  const x = element.offsetWidth;                 // 读
  element.style.transform = `translateX(${x + 1}px)`;  // 写
  requestAnimationFrame(animate);
}

// 正确：用变量缓存，循环里只写
let x = 0;
function animate() {
  x += 1;
  element.style.transform = `translateX(${x}px)`;
  requestAnimationFrame(animate);
}
```

给 `<text>`、滤镜、大面积 mask 做动画前，先在 DevTools Performance
面板录一段——这三类是 SVG 动画的成本黑洞。

## 11. 浏览器兼容与 SMIL 前景

| 特性                 | Chrome | Firefox | Safari | Edge |
| -------------------- | ------ | ------- | ------ | ---- |
| SMIL                 | 支持    | 支持    | 支持   | 支持 |
| CSS transform on SVG | 支持    | 支持    | 支持   | 支持 |
| CSS 动画几何属性     | 支持    | 支持（较新版本） | 支持 | 支持 |
| WAAPI on SVG         | 支持    | 支持    | 支持   | 支持 |
| CSS 的 d 属性（path）| 仅 Chromium | 不支持 | 不支持 | 仅 Chromium |

SMIL 的历史一句话讲清：Chrome 曾在 2015 年前后宣布废弃，因社区反馈
（尤其是「独立 SVG 文件内无替代品」这一条）于 2016 年撤回并稳定支持
至今，此后再无厂商给出移除时间表；规范层面其定义已移入独立的
SVG Animations 规范，SVG 2 不强制实现，MDN 的 SMIL 相关页面也因此
长期挂着「不再推荐（deprecated）」横幅——注意这是「规范停滞」的
标注而不是「浏览器将移除」的预告，截至 2026 年四大引擎照常渲染。

落到选型口径（与第 3 节呼应）：**SMIL 按「现状全支持、演进已冻结」
对待**——独立 SVG 文件里的自循环动画（img 引用场景）继续放心用
SMIL，它仍是这个上下文里唯一的免 JS 方案；内联页面元素优先 CSS 或
WAAPI，享受更好的调试工具（Animations 面板）与未来演进；新项目不要
把 SMIL 用在「可迁移」的场景自找迁移成本。

## 12. 坑点与自检

- **transform-box 顺序**：CSS 旋转/缩放 SVG 图形，先
  `transform-box: fill-box` 再 `transform-origin`，否则绕 viewBox
  原点转。自检：动画元素是否「转出画面」。
- **additive="sum" 缺失**：多个 animateTransform 互相覆盖，只剩
  最后一个生效。自检：组合变换是否丢失。
- **animateMotion 的坐标是叠加**：路径坐标会加在元素当前坐标上，
  元素画在 (100,50) 时路径 `M 0 0 L 100 0` 实际从 (100,50) 开始。
  自检：起点不对应时，把元素画在 (0,0) 或改路径。
- **fill="freeze" 与 remove**：SMIL 动画结束默认回弹（remove），
  要停在终点必须 `fill="freeze"`。CSS 对应 `animation-fill-mode: forwards`。
- **prefers-reduced-motion**：正式产品加一段媒体查询关掉非必要动画
  （前庭障碍用户的可访问性要求，见 170 篇）。
- **<img> 引用的 SVG**：内部 CSS/JS 被隔离，SMIL 照常播放；需要
  JS 交互就必须内联。

## 13. 练习

1. 把第 2 节的加载圈改造成 SMIL 版本放进独立 `.svg` 文件（用
   `animateTransform type="rotate"`，旋转中心写 `50 50`），双击文件
   验证独立打开也能转。提示：SMIL 不认 CSS transform-origin，旋转
   中心直接写进 `from`/`to` 的「角度 cx cy」三元组。
2. 用 `pathLength="100"` + `stroke-dashoffset` 给你自己的名字笔画
   （一条 path）做 2 秒画线动画，分别用 SMIL 和 CSS 各实现一次。
   提示：两版的「从 100 到 0」数值相同，差别只在驱动方式——SMIL 是
   `<animate attributeName="stroke-dashoffset">`，CSS 是 @keyframes。
3. 给第 6 节的路径动画加上 `rotate="auto"` 和一个小三角 polygon，
   观察朝向变化；再把 `dur` 拉长一倍，配合 `keyPoints="0;0.6;1"`
   `keyTimes="0;0.3;1"` 做出「先慢后快再慢」的节奏。提示：
   keyPoints 是「路径进度百分比」，keyTimes 是「时间进度百分比」，
   两者都从 0 开始到 1 结束且个数相同。
4. 写一个 `prefers-reduced-motion: reduce` 查询，让上面所有动画在
   开启该设置时停止。提示：CSS 侧 `animation: none`；SMIL 无对应
   媒体查询，要么换 CSS 路线，要么接受它不可关（或用 JS 检测后
   `pauseAnimations()`）。

先自己写完再展开参考实现对照：

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

第 1 题（加载圈 SMIL 版，可存为 spinner.svg 双击验证）：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="40" fill="none" stroke="#e9ecef"
          stroke-width="8" />
  <path d="M 50 10 A 40 40 0 0 1 90 50" fill="none" stroke="#4f5bd5"
        stroke-width="8" stroke-linecap="round">
    <animateTransform attributeName="transform" type="rotate"
                      from="0 50 50" to="360 50 50" dur="1s"
                      repeatCount="indefinite" />
  </path>
</svg>
```

旋转中心 `50 50` 写在 from/to 里——CSS 版用 transform-origin 的
思路在这里无效，这是两套坐标心智最直接的对比。

第 2 题（画线动画，SMIL 版）：

```svg
<path d="..." pathLength="100" fill="none" stroke="#333"
      stroke-width="3" stroke-dasharray="100" stroke-dashoffset="100">
  <animate attributeName="stroke-dashoffset" from="100" to="0"
           dur="2s" fill="freeze" />
</path>
```

CSS 版（内联场景）：同一 path 去掉 animate 子元素，加：

```css
.signature {
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
  animation: draw 2s ease-out forwards;
}
@keyframes draw { to { stroke-dashoffset: 0; } }
```

`fill="freeze"` 与 `forwards` 是同一个语义在两种语法里的名字。

第 3 题：

```svg
<path id="track" d="M 20 80 Q 100 0 180 80" fill="none" stroke="#ddd" />
<polygon points="-8,-5 8,0 -8,5" fill="#d63031">
  <animateMotion dur="4s" repeatCount="indefinite" rotate="auto"
                 keyPoints="0;0.6;1" keyTimes="0;0.3;1"
                 calcMode="linear">
    <mpath href="#track" />
  </animateMotion>
</polygon>
```

三角形顶点画在 +x 方向，`rotate="auto"` 让 +x 轴对齐切线，朝向才
正确；keyPoints 前 30% 时间走 60% 路程（快），后 70% 时间走 40%
（慢）。别忘了 calcMode="linear"——默认 paced 会忽略 keyPoints。

第 4 题（CSS 侧）：

```css
@media (prefers-reduced-motion: reduce) {
  .spinner, .signature {
    animation: none;
    stroke-dashoffset: 0;
  }
}
```

关掉动画的同时把 dashoffset 归零，名字才不会停留在「没画出来」的
状态——可访问性不是一刀切「消失」，而是「给出静止的完整形态」。

</details>

## 14. 下一步

- [SVG JavaScript 交互](/svg/150-SVGJavaScriptInteraction)：本文 JS
  路线的展开，含事件系统与拖拽；
- [SVG 响应式与性能](/svg/160-SVGPerformanceOptimization)：性能铁律
  的完整背景；
- [SVG 图标与可访问性](/svg/175-SVGAccessibilityPrinciples)：动画之外，
  图标的语义与 reduced-motion 规范。

## 本章总结

初学者要点：

- 选型口诀：**简单循环、要进独立 .svg 文件选 SMIL；内联页面元素选
  CSS；需要交互逻辑/数据驱动选 JS 或 WAAPI**。
- SMIL 三件套各管一事：`<animate>` 属性、`<animateTransform>` 变换
  （记得 `additive="sum"` 才能叠加）、`<animateMotion>` 路径
  （`rotate="auto"` 让元素朝向切线）。
- CSS 动画 SVG 图形，先写 `transform-box: fill-box`，再谈
  `transform-origin: center`，否则默认绕 viewBox 原点转。

进阶注意：

- SMIL 的 `begin` 支持事件与动画链（`a1.end`、`btn.click`、
  `repeat(n)`），可以做纯声明式的交互动画，这是 CSS 做不到的。
- CSS 能动画的几何属性（cx/cy/r/x/y/width/height）本质是 SVG 2 把
  它们定义成了 CSS 属性；`d` 也被属性化了，但目前只有 Chromium 实现，
  别在跨浏览器代码里用 CSS 改 `d`。
- 性能铁律依旧是 transform/opacity 优先；给 `<text>`、滤镜、大面积
  mask 做动画前先在 Performance 面板里确认成本。
