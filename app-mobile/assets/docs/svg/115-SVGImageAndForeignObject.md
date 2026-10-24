---
order: 130
title: 嵌入内容：image 与 foreignObject
module: 'svg'
category: 前端技术
difficulty: beginner
description: 用 image 在 SVG 里引入位图、用 foreignObject 嵌入 HTML 富文本，以及两者在导出与外链场景下的可用边界
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：SVG 嵌入内容（`<image>` 位图引用与 `<foreignObject>` HTML 领地），对应 MDN「Other content in SVG」主题目录下的两个元素。同族的端点标记 marker 已拆到独立一篇（见 [端点标记 marker](/svg/112-SVGPathMarkers)）。
- **解决什么问题**：SVG 是图形格式，但真实工程里的图示总要混入位图（截图、照片、徽标）与富文本（自动换行的说明文字、可点击的链接）。硬用 SVG 原生元素模拟（clipPath 裁位图、text 手动断行）都会把简单问题做复杂。
- **什么时候用到**：图表图例、数据看板里混排位图缩略图；节点内需要真正的 HTML 排版能力（自动换行、超链接、表单控件）时。
- **本篇不讲**：SVG 文件整体放进网页的六种方式与各自的资源加载限制（见 [SVG 嵌入与交付方式](/svg/128-SVGEmbeddingMethods)）、路径端点符号 marker（见 [端点标记 marker](/svg/112-SVGPathMarkers)）。

## 学习目标

1. 用 `<image>` 在 SVG 里引入位图，并预测 preserveAspectRatio 在固定宽高比框内的裁切行为；
2. 用 `<foreignObject>` 在 SVG 内嵌 HTML 富文本，说清它在哪些使用场景下会失效；
3. 给「图片变形」「foreignObject 不显示」「导出后内容丢失」三类现场各准备一套排查思路。

预计 25 到 40 分钟。

## 1. 你现在要解决什么问题

image 与 foreignObject 解决的是同一类问题的两个方向：SVG 是图形格式，但真实工程里的图示总要混入位图（截图、照片）与富文本（自动换行的说明文字），硬用 SVG 原生元素模拟都会把简单问题做复杂——位图要靠 clipPath 手动裁切，多行文本要按字数估行数再手拆 tspan，内容一改全重来。

这两个元素的共同点是「把别的格式装进 SVG」：image 装位图，foreignObject 装 HTML。装进来的东西越强，约束也越多——本篇的核心就是搞清楚每种「装法」在哪些上下文里会失效。

## 2. image：在 SVG 里引入位图

### 2.1 基本用法与 preserveAspectRatio

```svg
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     viewBox="0 0 200 120">
  <image href="photo.jpg" x="10" y="10" width="180" height="100"
         preserveAspectRatio="xMidYMid slice" />
</svg>
```

逐项说明：

- `href` 是 SVG 2 的标准写法；`xlink:href` 是 SVG 1.1 的旧写法，现代浏览器两者都认，但新代码一律用 `href`。只有当目标环境包含旧版工具链（如部分 PDF 导出器、老版 Safari）时才两个都写。**易错点：混用两者且值不同时，不同浏览器取值优先级不同，属于未定义行为**；
- `x/y/width/height` 定义图片要装进的矩形框。width/height 不写时多数浏览器按图片原始尺寸渲染，但 Firefox 下为 0——始终显式声明；
- `preserveAspectRatio` 的语义与根 svg 完全相同：默认 `xMidYMid meet` 完整显示留白，`slice` 撑满裁切，`none` 拉伸变形。一张 4:3 的照片放进 16:9 的框：meet 左右留白、slice 上下裁掉、none 压扁——与 viewBox 一节学的判定规则一字不差，只是这次的「内容」换成了位图（见 [坐标系与 viewBox](/svg/030-SVGCoordinateSystemViewBox)）。

### 2.2 边界：外链上下文里外部资源一律失效

SVG 文件通过 `<img>`、CSS background-image、iframe src 引用时，运行在「静态安全模式」：**不允许加载任何外部资源**，包括 image 引用的图片、外部字体、外部 CSS。翻车现象：inline 写在页面里的 SVG 图表图片显示正常，改成 img 引用后位图全部消失。六种嵌入方式各自的资源限制与选型对比，见 [SVG 嵌入与交付方式](/svg/128-SVGEmbeddingMethods)。

排查顺序：先确认 SVG 是内联还是外链引用；内联场景查图片路径与 CORS；外链场景要么把位图转成 data URI 内嵌，要么改用 inline SVG。同一约束也直接决定了下节 foreignObject 的可用边界。

## 3. foreignObject：SVG 里嵌 HTML

### 3.1 基本用法与命名空间

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 100">
  <rect x="5" y="5" width="210" height="90" rx="8" fill="#f5f6fa" stroke="#dcdde1" />
  <foreignObject x="15" y="15" width="190" height="70">
    <div xmlns="http://www.w3.org/1999/xhtml"
         style="font: 13px/1.6 sans-serif; color: #2f3640;">
      <strong>发布卡点：</strong>接口 P99 延迟 480ms，
      超过 300ms 预算，<a href="/doc/sla">SLA 文档</a>要求降级后再发布。
    </div>
  </foreignObject>
</svg>
```

要点逐条：

- `foreignObject` 的 x/y/width/height 开出一块「HTML 领地」，领地内的排版权完全归 HTML：自动换行、加粗、超链接、列表，甚至表单控件都能用。这正是 SVG 原生 `text` 做不到的（text 不会自动换行，多行要手写 tspan，见 [文本与排版](/svg/060-SVGTextTypography)）；
- **子元素必须处于 XHTML 命名空间**：`xmlns="http://www.w3.org/1999/xhtml"` 写在第一个 HTML 子元素上。内联在 HTML 文档里时，解析器对 HTML 上下文中的 svg 有特殊处理，但严谨写法是始终显式声明——漏写命名空间是 foreignObject「内容不显示」的第一大原因；
- 领地外的 SVG 元素与领地内的 HTML 各画各的，z 序由文档顺序决定。矩形边框在上例先画、所以垫底。

### 3.2 边界与兼容：什么时候不能用

| 使用场景 | foreignObject 是否可用 | 说明 |
| --- | --- | --- |
| 内联在 HTML 文档里 | 可用 | 主战场；D3 图表的富文本标签即此用法 |
| 经 `<img>` / background-image 引用 | 不可用 | 静态安全模式禁用 HTML 内容，渲染结果为空或整体失败 |
| 画到 canvas（drawImage） | 不可靠 | Safari 长期不支持；跨浏览器代码不要依赖 |
| 导出 PDF / 打印 | 看导出器 | 多数工具链对 foreignObject 支持不完整，上线前必须实测 |

结论：foreignObject 适合「页面内交互式图示」这一个场景；凡是图示要离开页面（导出图片、打印、邮件附件），就退回 text + tspan 手动排版或位图方案。设计阶段就要问清楚交付形态，这是它最大的工程风险。

## 4. 三个工程场景

### 场景一：监控大屏图例里嵌服务截图

真实背景：告警大屏的图例要在文字旁边显示对应服务的架构缩略图（PNG）。image 负责装入，preserveAspectRatio 控制裁切：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 300">
  <g transform="translate(10,10)">
    <rect width="220" height="88" rx="6" fill="#f1f2f6" />
    <image href="/thumbs/order-service.png" x="8" y="8"
           width="72" height="72" preserveAspectRatio="xMidYMid slice" />
    <text x="92" y="36" font-size="14" font-weight="bold">订单服务</text>
    <text x="92" y="58" font-size="12" fill="#57606f">P99 480ms</text>
    <circle cx="98" cy="76" r="5" fill="#00b894" />
    <text x="110" y="80" font-size="12">正常</text>
  </g>
  <!-- 其余图例项同理向下排布 -->
</svg>
```

讲解：

- 缩略图框 72x72 是正方形，而截图多为 16:9——选 `slice` 让位图撑满裁掉两侧，保证缩略图占满卡片不留白边；换成默认 meet 会在左右留两条灰缝，视觉上像「没加载完」；
- 状态圆点与状态文字是 SVG 原生元素，与 image 混排无碍——**image 只是普通图形元素**，同样参与 transform、clipPath、滤镜；
- 工程注意：大屏页面是 inline SVG 才能加载外链位图；若同一份 SVG 还要导出发周报邮件，位图必须转 data URI 或导出时替换（见 2.2 的边界）。

### 场景二：思维导图节点的富文本

真实背景：知识库产品的思维导图，节点内容含多行摘要与内链，text + tspan 手动断行要按内容长度算行数。foreignObject 直接把排版交给浏览器：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 120">
  <path d="M 120 60 C 160 60 160 60 200 60" fill="none"
        stroke="#a4b0be" stroke-width="2" />

  <foreignObject x="200" y="10" width="150" height="100">
    <div xmlns="http://www.w3.org/1999/xhtml"
         style="box-sizing: border-box; width: 150px; padding: 10px;
                border-radius: 8px; background: #dff9fb;
                font: 12px/1.7 sans-serif; color: #130f40;">
      <b>容器网络</b><br />
      参考<a href="/kb/cni">CNI 选型笔记</a>：Cilium 与
      Calico 的 eBPF 路径差异。
    </div>
  </foreignObject>

  <rect x="10" y="35" width="110" height="50" rx="8" fill="#4f5bd5" />
  <text x="65" y="65" text-anchor="middle" font-size="14" fill="#fff">K8s 网络</text>
</svg>
```

讲解：

- 摘要文字不管多长都在 150px 宽的领地里自动换行、自动撑高（配合 JS 量取实际高度后调整 foreignObject 即可做到自适应框），text 方案则要按字数估行数再手拆 tspan，内容一改全重来；
- 链接 `<a>` 在领地内是真正的 HTML 链接，可点击、有 hover 样式；SVG 原生链接元素虽然存在，但混排富文本时维护成本高；
- 边界自检：这个导图若要「导出为 PNG 下载」，foreignObject 方案在 Safari 的 canvas 导出路径上不可靠——交付前先确认产品只要求页面内展示，否则回到备选：text + tspan。

### 场景三：一份图示、两种交付形态的降级策略

真实背景：内容团队的架构图组件要求同时服务两个出口：文档站页面内展示（inline SVG），以及每周构建一次的 PDF 手册（经无头浏览器导出）。团队最初全用 foreignObject 写节点说明，PDF 导出后发现说明全部丢失——这正是 3.2 节表格里「导出看导出器」的真实代价。

落地方案是把「富文本节点」抽象成带两个渲染分支的组件：

```svg
<!-- 页面内（inline SVG）：foreignObject 版本 -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 90">
  <rect x="5" y="5" width="190" height="80" rx="8" fill="#f5f6fa" stroke="#4f5bd5" />
  <foreignObject x="15" y="15" width="170" height="60">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font: 12px/1.6 sans-serif;">
      <b>网关</b>：限流 1000 QPS，详见<a href="/kb/gw">选型笔记</a>
    </div>
  </foreignObject>
</svg>

<!-- PDF 导出（构建期替换）：text 版本 -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 90">
  <rect x="5" y="5" width="190" height="80" rx="8" fill="#f5f6fa" stroke="#4f5bd5" />
  <text x="15" y="35" font-size="12" font-weight="bold">网关</text>
  <text x="15" y="55" font-size="11" fill="#57606f">限流 1000 QPS</text>
  <text x="15" y="72" font-size="10" fill="#0984e3">详见选型笔记（KB-1024）</text>
</svg>
```

讲解：

- 关键决策在**构建期**而非运行期：导出脚本（或组件的 `mode` prop）按交付形态切换渲染分支，两个分支的数据源相同，只是排版引擎不同。这把 3.2 的兼容性表格从「踩坑后排查」提前到「设计时规避」；
- text 分支的链接退化为「编号文本」（选型笔记 KB-1024）——PDF 里点不了超链接是常态，写编号反而让读者能在站内检索；
- 同样的策略适用于 image：页面内分支引用外链位图，导出分支在构建时把位图转成 data URI 内嵌（用脚本读文件拼 `data:image/png;base64,...`），一份源码两种产物，互不污染。

## 5. 修改实验

按顺序做，每一步先预测再刷新验证：

1. 在场景一的 image 上分别试 `meet`、`slice`、`none` 三种 preserveAspectRatio，记录同一张 16:9 截图在 72x72 框里的三种命运；
2. 把场景二 foreignObject 里的 XHTML 命名空间声明 `xmlns="http://www.w3.org/1999/xhtml"` 删掉，观察内容是否还渲染，并解释为什么把这份 SVG 存成独立 .svg 文件再打开时失败得更彻底；
3. 给场景三的 text 分支加一行超出节点宽度的长文本，观察溢出行为，再对比 foreignObject 分支同样文本的自动换行，体会「排版权移交」的得失。

<details>
<summary>参考实现与现象对照（先自己改，再展开对照）</summary>

第 1 题：meet——截图完整显示但左右留白（16:9 图在正方形框里上下贴边、左右空）；slice——截图撑满 72x72 但左右被裁掉约三分之一；none——横向压扁，人脸和文字变形。选型口诀：内容裁得起用 slice，内容裁不得用 meet，两者都不行就换框的比例。

第 2 题：HTML 文档内联时浏览器解析器对 svg 内容有容错，部分上下文里仍能渲染；但作为独立 .svg 文件（XML 解析）时，无命名空间的 div 不属于 XHTML，foreignObject 内容直接不渲染。结论：命名空间声明不是「可省略的仪式」，它决定元素属于哪个渲染体系。

第 3 题：text 分支长文本直接溢出节点边框（text 不换行，见 [文本与排版](/svg/060-SVGTextTypography)），需要手动拆 tspan 或缩短文案；foreignObject 分支自动折行，但若领地高度不够，内容溢出 foreignObject 框或被裁剪。两者都不是「免费的自动排版」：foreignObject 只在领地内自动折行，领地大小仍要负责。

</details>

## 6. 小练习

预测题：一张 1000x500 的位图放进 `width="200" height="200"` 的 image 框，三种 preserveAspectRatio 取值下最终可见的区域各是原图的哪一部分？

修 Bug 题：inline SVG 图表里的位图截图在开发环境正常，部署到生产环境后全部消失；文字与矩形都正常。列出至少三个可能原因并按排查顺序排列。

挑战题（不看提示）：给场景二的思维导图节点加「内容自适应高度」：JS 量出 HTML 内容实际高度后，把 foreignObject 的 height 与背后的背景矩形高度同步调整。写出量取与同步的关键代码思路，并指出量高度必须发生在哪一层（SVG 层还是 HTML 层）。

先自己推理或动手验证，再展开参考答案对照：

<details>
<summary>参考答案（先自己推，再展开对照）</summary>

预测题：原图 2:1，框 1:1。meet——整图缩到 200x100 居中，上下各留 50px 空白，可见区域是全部；slice——缩放到 200x200 需要把 2:1 拉成 1:1，即以高度为基准放大到 500x500 再居中裁剪，可见区域是原图水平居中的 500x500（一半宽度）；none——横向压缩到 200 宽，全图可见但比例压扁一半。

修 Bug 题：1) 生产环境把该 SVG 经 img 或 background-image 引用（静态安全模式禁外部资源，位图全灭而矢量元素正常——与本例现象完全吻合，头号嫌疑）；2) 位图路径在生产环境 404（部署时静态资源目录没同步）；3) CORS：位图在另一域且未开 CORS 头（img 标签加载图片通常不受 CORS 限制，但 SVG 内的 image 在部分严格场景受影响）。排查从 1) 开始：改回 inline 立即恢复即可定案。

挑战题：量高度必须发生在 HTML 层——foreignObject 领地内的 div 是正常 HTML，`div.getBoundingClientRect().height` 或 `scrollHeight` 可量；SVG 层的元素没有「内容高度」概念。思路：渲染后读取 div 实际高度 h，然后同步三处——foreignObject 的 height 设 h 加内边距、背景 rect 的 height 同步、必要时更新节点下方元素的 y 坐标避免重叠。注意初次渲染时 foreignObject 高度给足（如先 9999 再收缩），否则内容被裁剪量出来的高度就是错的。

</details>

## 7. 什么时候应该 / 不应该用

- image：图表混排位图、插画合成用它；注意外链限制与显式宽高；位图本身响应式加载策略（srcset 等）在 SVG 内不适用，需要外层 HTML 控制；
- foreignObject：仅在「页面内交互式 SVG」需要真正 HTML 排版时用；导出、打印、img 引用场景一律绕开（或按场景三做构建期降级）。

## 8. 与之前和之后的知识的关系

- 往前：image 的 preserveAspectRatio 与 030 的 viewBox 判定规则完全同构；foreignObject 领地开在 030 讲过的用户坐标系上；
- 往后：六种整体嵌入方式与「静态安全模式」的全景对比在 128；155 的数据可视化用 foreignObject 做富文本轴标签；160 的性能篇提醒 foreignObject 区域不宜过多（每个都是独立的 HTML 排版树）；165 的响应式篇处理 image 的容器适配。

## 9. 官方文档

- MDN：image element：https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/image
- MDN：foreignObject：https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/foreignObject
- MDN：Other content in SVG（主题目录）：https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/Content_in_SVG

## 10. 自我检查

- 能预测 image 在 meet/slice/none 三种取值下的表现；
- 能说出 foreignObject 可用与不可用的各两个场景；
- 能解释「内容必须处于 XHTML 命名空间」在 HTML 内联与独立 .svg 文件两种解析环境下的差异；
- 能描述「一份图示、两种交付形态」的构建期降级思路。

## 本章总结

image 用与 viewBox 同构的 preserveAspectRatio 语义装入位图，但受「外链上下文禁外部资源」约束；foreignObject 把 HTML 排版领地开进 SVG，是页面内富文本图示的独门武器，也是离开页面就失效的玻璃 hammer——用之前先问交付形态，交付形态多于一种时，把降级做成构建期的渲染分支而不是运行时的兼容 hack。

## 下一步

系统对比 SVG 整体放进网页的六种方式：[SVG 嵌入与交付方式](/svg/128-SVGEmbeddingMethods)；或进入 [SVG 数据可视化方法论](/svg/155-SVGDataVizEssentials)。
