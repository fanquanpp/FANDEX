---
order: 150
title: SVG 嵌入与交付方式
module: 'svg'
category: 前端技术
difficulty: beginner
description: 对比 inline、img、CSS background、object/iframe、symbol sprite、favicon 六种把 SVG 放进网页的方式，以及各自的 CSS/JS 可控性与资源加载限制
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：SVG 在网页中的嵌入与交付方式，对应 MDN「Adding vector graphics to the Web」指南主题。
- **解决什么问题**：同一个 SVG 图标/图表，放进网页至少有六种姿势，能力差异巨大：有的能被页面 CSS 换色，有的连字体都加载不了；选错方式不会报错，只会出现「样式不生效」「图标变黑块」「外部图片消失」这类难以定位的现场。
- **什么时候用到**：接入设计系统的图标时选交付形态；SVG 图表组件选容器；写文档站/邮件模板时判断哪些 SVG 能力可用。
- **本篇不讲**：SVG 内部的 image/foreignObject 元素（见 [image 与 foreignObject](/svg/115-SVGImageAndForeignObject)）、SVG 的 CSS 样式化细节（见 [CSS 样式化](/svg/130-SVGCSSStyling)）。

## 学习目标

1. 说出六种嵌入方式各自的能力边界（CSS 可控性、脚本、外部资源、缓存、SEO）；
2. 解释「静态安全模式」是什么、它禁止了什么、为什么存在；
3. 面对一个具体需求（按钮图标/文档插图/可交互图表/站外分享图），能直接给出嵌入方式选型与理由。

预计 25 到 40 分钟。

## 1. 六种嵌入方式总览

| 方式 | 写法 | 页面 CSS 控制 | 页面 JS 控制 | 外部资源 | 独立缓存 | SEO 可索引 |
| --- | --- | --- | --- | --- | --- | --- |
| inline 内联 | 把 `<svg>` 直接写进 HTML | 完全可控 | 完全可控 | 可加载 | 否（随页面） | 可（DOM 一部分） |
| `<img>` | `<img src="icon.svg">` | 不可 | 不可 | 禁止 | 是（图片缓存） | 弱（alt 文本） |
| CSS background | `background-image: url(a.svg)` | 不可 | 不可 | 禁止 | 是 | 不可（纯装饰） |
| `<object>` / `<iframe>` | `<object data="chart.svg">` | 不可（跨文档） | 受限（contentDocument） | 可加载 | 是 | 弱 |
| symbol sprite 外链 | `<use href="sprite.svg#id">` | 不可（外链时） | 不可 | 受限 | 是（整包） | 不可 |
| favicon | `<link rel="icon" href="f.svg">` | 不可 | 不可 | 禁止（部分浏览器允许） | 是 | 不可 |

两个补充维度：

- **CORS**：`<img>` 与 CSS background 跨域引用 SVG 只要不读像素就不需要 CORS；一旦要 `drawImage` 后 `getImageData`，源服务器必须返回 CORS 头，否则画布被污染；
- **动画能力**：CSS 动画/SMIL 动画写在 SVG 文件内部时，六种方式全都能播（动画属于文档内部行为）；被页面 CSS 驱动的动画只有 inline 能做到。

## 2. 静态安全模式：img 与 background 的封印

SVG 文件通过 `<img>`、CSS background-image 引用时，运行在「静态安全模式」（secure static mode）：**不允许加载任何外部资源**，也不允许执行脚本。

被禁止的行为清单：

- SVG 内部 `<image href="...">` 引用的外部位图——不显示；
- 外部字体 `@font-face`——回退到系统字体；
- `<?xml-stylesheet?>` 处理指令引用的外部 CSS——不生效；
- `<script>` ——不执行。

为什么存在这个限制：`<img>` 的历史契约是「图片是无害的静态资源」。SVG 是 XML，可以发请求、可以跑脚本，如果 img 里的 SVG 能随意发请求，任何网页就能借「一张图片」绕过内容安全策略做跨站请求。浏览器厂商的解法是把 img 上下文的 SVG 封印成「纯绘制」。

翻车现场：图表在开发页 inline 嵌入时位图截图正常，切到营销落地页改成 `<img>` 引用后位图全部消失，文字与矩形还在——现象精确对应「外部资源被禁、文档内部元素照常绘制」。排查第一步永远是确认引用方式。

## 3. 逐方式讲透适用边界

### 3.1 inline：唯一的全能方式

```html
<button class="btn">
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
    <path d="M8 1 L15 14 H1 Z" fill="currentColor" />
  </svg>
  上传
</button>
```

- CSS/JS 完全可控：`fill: currentColor` 让图标随按钮文字换色，`:hover` 改路径、CSS 变量换主题都畅通；
- 代价：图标进入 HTML 文档流，无法被浏览器单独缓存（改一个按钮的图标就要整页重新下载 HTML）；大型站点的 HTML 体积会被图标撑大；
- 常见落地是构建期注入：打包工具把 `import icon from './a.svg?raw'` 的内容内联进组件，源码仍是独立文件。

### 3.2 img 与 CSS background：封存的图片

```html
<img src="/img/chart.svg" alt="季度营收趋势" width="600" height="400" />
```

```css
.logo {
  width: 32px;
  height: 32px;
  background-image: url("/img/logo.svg");
  background-size: contain;
}
```

- 静态安全模式生效，换色必须预先烘焙进文件（或提供多份配色版本）；
- 可独立缓存：图标文件被浏览器缓存后，跨页面复用零成本——图标数量大且不变色时，这是对 inline 的关键优势；
- CSS background 无法设置 `alt`，纯装饰用途专属；有语义的图必须走 `<img>` 的 alt；
- width/height 同样要显式写：SVG 有 viewBox 无固有尺寸，不写宽高时 img 按 300x150 默认尺寸或容器规则渲染，容易出「图标巨大」事故。

### 3.3 object / iframe：独立文档

```html
<object data="/img/interactive-map.svg" type="image/svg+xml" width="600" height="400">
  <img src="/img/interactive-map.png" alt="地图（降级）" />
</object>
```

- SVG 作为**独立文档**运行：文件内部可以引用外部资源、可以有脚本（脚本运行在 SVG 文档自己的上下文里）；
- 页面 CSS 管不到它（跨文档边界），JS 要通过 `object.contentDocument` 才能触碰，且同源才行；
- 换来的是「自包含交互」：一个自带缩放脚本的地图 SVG，经 object 嵌入任何页面都能工作；
- `<iframe src="a.svg">` 行为类似但语义更重（完整浏览上下文）；object 支持子元素降级内容，iframe 不支持。

### 3.4 symbol sprite 外链引用

```html
<!-- sprite.svg（构建期从图标目录合成） -->
<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
  <symbol id="ic-search" viewBox="0 0 16 16">
    <circle cx="7" cy="7" r="5" fill="currentColor" />
    <path d="M11 11 L15 15" stroke="currentColor" stroke-width="2" />
  </symbol>
</svg>

<!-- 页面引用 -->
<svg width="16" height="16"><use href="/img/sprite.svg#ic-search" /></svg>
```

- 一次请求整包缓存，页面零重复体积——图标工程（见 [图标工程化](/svg/170-SVGIconSystemEngineering)）的默认形态；
- **致命边界：外链 sprite 时浏览器视其为图片资源，页面 CSS 的 color 传不进 use 的影子树，currentColor 失效**。内联 sprite（把 sprite 内容直接贴进页面）才有完整换色能力；
- 兼容性注意：老版本 IE 需要 xlink:href 与 polyfill，现代浏览器 `href` 即可。

### 3.5 favicon：被忽视的 SVG 出口

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="alternate icon" href="/favicon.ico" />
```

- 现代 Chrome/Firefox/Safari 均支持 SVG favicon；文件内部可以写媒体查询实现暗色模式自动换色（这是 ico 做不到的）；
- 上下文同样受限：不支持外部资源，动画在多数浏览器标签页里不播；
- 提供保留的 `.ico` 或 PNG 回退给老环境。

## 4. 三个工程场景

### 场景一：设计系统按钮图标（同一枚图标三种交付形态）

真实背景：设计系统要求一枚「搜索」图标同时服务三个出口——站内按钮（需要 hover 换色）、文档站正文插图（静态、要被搜索引擎理解）、运营导出的 PNG 素材包。选型决策表：

| 交付形态 | 选用的方式 | 决策理由 |
| --- | --- | --- |
| 站内按钮 | 构建期 inline + currentColor | 必须跟 CSS 换色；单页图标量有限，inline 体积可接受 |
| 文档站正文 | `<img src="search.svg">` + alt | 无换色需求；跨页面复用吃缓存；alt 给 SEO 与读屏 |
| 运营素材包 | 构建脚本导出 PNG（多分辨率） | 目标软件（PPT、微信）对 SVG 支持参差，PNG 最稳 |

讲解：

- 决策的关键输入不是「SVG 怎么写」而是「这个出口要不要 CSS 联动、要不要被单独缓存、目标环境认不认 SVG」——三个问题答完，方式自动浮出；
- 三个出口共享同一份 SVG 源文件，靠构建管线分流（inline 注入、拷贝为静态资源、光栅化导出），而不是手工维护三份；
- 反例复盘：团队曾把按钮图标做成外链 sprite 引用，上线后发现 hover 换色全部失效——外链 use 的 currentColor 断链（3.4 节），最后迁移为构建期 inline，sprite 仅保留给不变色的装饰图标。

### 场景二：文档站的架构图（图文混排选型）

真实背景：技术文档站的文章里嵌架构图。图内有说明文字需要与站点字体一致、且暗色模式下要换配色；同时文章页有大量图，希望缓存友好。

- 首选 inline：文档站多为服务端渲染，构建期把 SVG 注入 HTML；站点全局 CSS（含暗色主题变量）直接作用到图内元素，字体、配色自动一致；
- 若单页图超 20 张导致 HTML 膨胀：对「不变色」的图降级为 `<img>`（缓存），只 inline 需要主题联动的图——混用而非二选一；
- 检查清单：inline 图必须补 `aria-hidden` 或 `role="img"` + `title`（无障碍见 [SVG 无障碍](/svg/175-SVGAccessibilityPrinciples)），img 方式则把语义写在 alt 里。

### 场景三：营销页的可交互产品图（object 的正确岗位）

真实背景：营销页需要一张「鼠标悬停热点显示参数」的产品爆炸图，由 3D 团队交付为自带交互脚本的 SVG；营销页本身是低代码平台，无法注入自定义 JS。

- 选择 `<object>`：交互脚本运行在 SVG 独立文档内，不需要营销页环境支持任何东西；低代码平台只要允许贴一段 object 标签即可；
- 降级链：object 内放 `<img>` 的 PNG 截图，老环境或加载失败时仍有静态图可看；
- 边界自检：这张图不需要跟随营销页主题换色（3D 团队已烘焙配色），所以「页面 CSS 管不到」这个 object 的最大缺点在此场景为零成本——**object 的短板恰好落在需求之外时，它就是最优解**。

## 5. 修改实验

1. 把 3.4 节的 sprite 示例先以内联方式（把 sprite.svg 的内容直接贴进页面）接入按钮，验证 hover 换色生效；再改成外链 `<use href="sprite.svg#ic-search">`，观察换色失效，解释 color 是在哪一跳断掉的；
2. 写一个内部含 `<image href="photo.jpg">` 的 SVG，分别用 inline 与 img 两种方式放进页面，对照位图的显示差异，并把 img 方式修好（提示：构建脚本把位图转 data URI）；
3. 给 3.5 节的 favicon.svg 内部写一段 `@media (prefers-color-scheme: dark)` 换底色，在系统暗色模式下观察标签页图标变化。

<details>
<summary>参考实现与现象（先自己改，再展开对照）</summary>

第 1 题：内联时 sprite 与 use 同属当前文档，按钮的 `color` 经 CSS 继承进入 use 的影子树，symbol 内 `fill="currentColor"` 拿到颜色，hover 生效。外链时 sprite.svg 是独立资源，use 渲染的是该文件内的符号副本，跨文档边界的 CSS 继承链断开，currentColor 解析为默认黑色。断点在「文档边界」而不是 use 本身。

第 2 题：inline 方式位图正常显示（文档可加载外部资源）；img 方式位图消失（静态安全模式）。修复脚本思路：读 SVG 文本，把 `href="photo.jpg"` 替换为 `href="data:image/jpeg;base64,..."`（读文件、base64 编码、正则替换），输出独立副本供 img 使用。

第 3 题：favicon.svg 内部：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <style>
    rect { fill: #4f5bd5; }
    @media (prefers-color-scheme: dark) {
      rect { fill: #74b9ff; }
    }
  </style>
  <rect width="32" height="32" rx="6" />
</svg>
```

favicon 是独立文档，内部媒体查询以「渲染该图标的上下文」为准，支持的浏览器会随系统主题换色；不支持媒体查询的老环境显示默认色，不报错。

</details>

## 6. 小练习

预测题：同一份带 `<?xml-stylesheet?>` 外部样式表指令与 SMIL 动画的 SVG，分别在 inline 与 CSS background 两种方式下呈现，样式表与动画各会发生什么？

修 Bug 题：设计交付的图标在站内一切正常，接入运营的第三方建站平台后变成黑块且 hover 效果消失。图标源文件内只有 `fill="currentColor"` 的路径。说明原因并给出两种可行修复。

挑战题（不看提示）：某站点有 200 枚不变色图标与 10 枚需主题联动图标，给出嵌入方式的组合方案，估算与「全部 inline」相比的 HTML 体积收益方向，并说明 symbol sprite 在该方案中的位置。

先自己推理或动手验证，再展开参考答案对照：

<details>
<summary>参考答案（先自己推，再展开对照）</summary>

预测题：inline——外部样式表随文档加载生效（同文档处理指令在 inline 场景多数浏览器忽略，严格说该指令为独立文档设计；SMIL 动画正常播放）；CSS background——静态安全模式：外部样式表不加载（指令被无视），但写在文件内部的 SMIL 动画照常播放。注意区分「外部资源」与「文档内部行为」：封印的是前者。

修 Bug 题：建站平台通常把上传的 SVG 当作 img/background 图片引用——静态安全模式开启，且页面 CSS 的 color 无法传入，currentColor 退化为初始值黑色（黑块来源）。修复一：交付「烘焙好配色的多份静态 SVG」由平台按场景选用；修复二：若平台支持内联 HTML 片段，改走 inline 方案恢复换色。

挑战题：200 枚不变色图标走外链 sprite（一次请求整包缓存，页面零重复体积）或 img（按需缓存）；10 枚联动图标走构建期 inline。相比全部 inline，HTML 体积省下 200 枚图标的路径数据量（通常占大头），换来的是每页多一次 sprite 请求（有缓存后近乎免费）。sprite 在方案里承担「不变色图标」的托管层，与 inline 的「联动图标」分工互补。

</details>

## 7. 动手实践

任务：给自己的项目做一次「图标出口审计」——找出三处 SVG 使用点（按钮/导航图标、文章插图、favicon 或 logo），逐点回答三个问题：要不要 CSS 联动？要不要跨页缓存？目标环境是什么？然后对照第 4 节场景一的决策表给出当前方式是否恰当的结论。

提示：

- 用 DevTools 查元素确认当前引用方式（DOM 里有 svg 节点 = inline；只有 img 标签 = 图片方式）；
- 联动测试：临时在页面 CSS 写 `svg path { fill: red }`，变红的是 inline；
- 缓存测试：Network 面板勾选 Disable cache 前后对比二次加载。

## 8. 什么时候应该 / 不应该用

- 默认心智：需要主题联动与交互选 inline；需要缓存与隔离选 img/sprite；需要自包含脚本选 object；favicon 是独立小生态；
- 不应该用：同一个图标在项目里混用多种方式且不说明理由——半年后没人记得哪个文件改了会同步到哪里；把含外部资源的 SVG 直接交给 img 场景而不做 data URI 预处理。

## 9. 与之前和之后的知识的关系

- 往前：本篇的「静态安全模式」是 115 篇 image/foreignObject 边界的上层原因；CSS 可控性对比承接 130 的样式化体系；
- 往后：170 的图标工程化把本篇选型表固化为构建管线；175 的无障碍篇补齐各方式的读屏语义差异；160 的性能篇量化 inline 与 sprite 的体积/请求权衡。

## 10. 官方文档

- MDN：Adding vector graphics to the Web：https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/Adding_vector_graphics_to_the_Web
- MDN：SVG in img 简介（Other content in SVG）：https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/Content_in_SVG
- MDN：CSS background-image：https://developer.mozilla.org/en-US/docs/Web/CSS/background-image

## 参考与致谢

本文嵌入方式分类、静态安全模式（secure static mode）行为描述与能力对照维度参考 MDN Web Docs（SVG Guides：Adding vector graphics to the Web 等），按 CC-BY-SA 2.5 许可使用并重新组织改写。来源：https://developer.mozilla.org/en-US/docs/Web/SVG （License: https://creativecommons.org/licenses/by-sa/2.5/）。

## 自我检查

- 能默写六种方式在「页面 CSS 可控 / 外部资源 / 独立缓存」三个维度的差异；
- 能解释静态安全模式禁止什么、为什么存在；
- 给定一个新需求，能先问出「联动/缓存/环境」三问再给选型。

## 本章总结

六种嵌入方式的差异可以压成一句话：inline 是唯一全能形态，其余五种都在不同维度上「封存」了 SVG——img 与 background 封掉外部资源和脚本、object/iframe 封掉页面文档边界、外链 sprite 封掉跨文档样式继承、favicon 封进 16px 小世界。选型的本质是把需求（联动？缓存？脚本？环境？）对到封印清单上，封印落在需求之外的，就是好选择。

## 下一步

进入 [CSS 样式化](/svg/130-SVGCSSStyling) 看 inline 场景下样式系统的完整玩法，或看 [图标工程化](/svg/170-SVGIconSystemEngineering) 把选型表落成构建管线。
