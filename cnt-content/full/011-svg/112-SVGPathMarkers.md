---
order: 120
title: 端点标记 marker：路径的附属符号
module: 'svg'
category: 前端技术
difficulty: beginner
description: 用 marker 给路径挂箭头、圆点与刻度，掌握 refX/refY、markerUnits、orient 四组旋钮与尺寸联动规则
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：SVG 端点标记（`<marker>` 元素与 `marker-start` / `marker-mid` / `marker-end` 三个挂载属性），属于「路径的附属符号」这一独立知识类别，对应 MDN SVG Reference 的 marker element 页。
- **解决什么问题**：画流程图时箭头永远对不准线的端点；线一有斜率，三角形的朝向就要用三角函数重算；十条线就是十次手算。marker 把「端点符号」变成路径的附属品——浏览器替你完成定位、旋转、缩放，路径只管画自己的线。
- **什么时候用到**：连线类图示（流程图、时序图、思维导图、Git 分支图）挂箭头；折线图给每个数据点挂符号；坐标轴末端画轴箭头；地铁线路图的端点站符号。
- **本篇不讲**：把位图装进 SVG 的 `<image>` 与嵌 HTML 的 `<foreignObject>`（见 [image 与 foreignObject](/svg/115-SVGImageAndForeignObject)）、路径 `d` 命令本身怎么写（见 [path 详解](/svg/050-SVGPathDetailed)）。

## 学习目标

1. 用 `<marker>` 给路径挂上起点、中间点、终点符号，并解释 refX/refY、markerWidth/Height、orient、markerUnits 各自管什么；
2. 算清「箭头实际像素尺寸 = markerWidth 乘以引用元素 stroke-width」这条联动规则，并知道如何解耦；
3. 在不写任何三角函数的前提下，让斜线、折线上的箭头自动对齐与转向；
4. 给「箭头对不上」「箭头消失」「箭头大小失控」三类现场各准备一套排查顺序。

预计 30 到 45 分钟。

## 1. 你现在要解决什么问题

先看一个没学 marker 的人写流程图的真实翻车现场：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60">
  <path d="M 10 30 L 160 30" stroke="#333" stroke-width="2" />
  <polygon points="160,24 172,30 160,36" fill="#333" />
</svg>
```

手画一个三角形充当箭头，问题马上暴露：线的终点必须「倒退一个箭头长度」才不会戳穿箭头；线一有斜率，三角形的朝向就要用三角函数重算；十条线就是十次手算。marker 的价值在于把「端点符号」变成路径的附属品——浏览器替你完成旋转、对齐、定位，路径只管画自己的线。

## 2. marker：把端点符号交给系统托管

### 2.1 最小可运行示例

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#333" />
    </marker>
  </defs>
  <path d="M 10 30 L 160 30" stroke="#333" stroke-width="2"
        marker-end="url(#arrow)" />
</svg>
```

逐行拆解：

- `<marker id="arrow" ...>` 定义在 defs 里，本身不渲染，只等路径来引用。id 是引用句柄，全文档唯一；
- `viewBox="0 0 10 10"` 声明标记内容自己的坐标系，箭头三角形按 0-10 的坐标书写。这与根 svg 的 viewBox 是同一套机制（见 [坐标系与 viewBox](/svg/030-SVGCoordinateSystemViewBox)）；
- `refX="9" refY="5"` 是**锚点**：内容坐标系里的这个点会被对齐到路径的端点上。箭头三角形的「尖端」在 (10, 5)，取 refX=9 让尖端略微越过端点、避免线帽把箭头顶开一截。改成 refX=0 会发生什么：整个箭头挂在端点右侧、且线会戳进箭头身体——这是箭头「对不上」最常见的原因；
- `markerWidth="6" markerHeight="6"` 是标记视口的**显示尺寸**，单位由 markerUnits 决定（下节）。6 乘以 stroke-width 2 = 12px，即箭头实际渲染为 12x12；
- `orient="auto-start-reverse"`：符号自动旋转到路径切线方向，start 端额外反转 180 度（箭头尖端朝外）；
- `marker-end="url(#arrow)"` 挂载。换成 CSS 写法 `path { marker-end: url(#arrow); }` 等价，且便于批量控制。

易错点：`url(#arrow)` 里的 id 写错时**不报错、箭头直接消失**。排查顺序：先查 id 拼写，再查 marker 是否真的在 defs 里（放在渲染树里会画出一个多余的三角形），最后查是否被 SVGO 的 cleanupIds 插件删掉了「未使用」的 id（内联 sprite 场景必须关闭该插件，见 [性能优化](/svg/160-SVGPerformanceOptimization)）。

### 2.2 三个挂载点：start / mid / end

```svg
<path d="M 20 80 L 80 30 L 140 80 L 190 30"
      fill="none" stroke="#4f5bd5" stroke-width="2"
      marker-start="url(#dot)" marker-mid="url(#dot)" marker-end="url(#dot)" />
```

- `marker-start` 只挂在路径起点，`marker-end` 只挂终点；
- `marker-mid` 挂在**除首尾外的每个折点**上——上面这条三段折线会在 (80, 30) 与 (140, 80) 两个拐角各挂一个。想要每个数据点一个符号（散点折线图），这是零 JS 的原生方案；
- 没有折点的平滑曲线上 marker-mid 一个都不挂。贝塞尔曲线的控制点不算折点。

### 2.3 markerUnits：标记尺寸跟着谁走

| 取值 | 缩放基准 | 典型用途 |
| --- | --- | --- |
| `strokeWidth`（默认） | 跟随引用元素的 stroke-width | 箭头随线变粗而等比变大，视觉一致 |
| `userSpaceOnUse` | 固定在用户坐标系 | 所有标记恒定大小，与线粗无关 |

换算规则必须记牢：**默认情况下标记的实际像素尺寸 = markerWidth/Height 乘以引用元素的 stroke-width**。所以示例里 markerWidth=6、线宽 2 时箭头是 12px；把线加粗到 4，箭头自动变 24px。新手翻车现场：线宽 0.5 的细线图里箭头小到看不见——不是 marker 写错了，是乘出来的结果只有 3px。要么调大 markerWidth，要么改 `markerUnits="userSpaceOnUse"` 摆脱联动。

### 2.4 orient：自动旋转的三种取法

- `orient="auto"`：符号旋转到该顶点处路径的切线方向。start 端的切线方向是「离开起点」，所以起点处的 auto 箭头尖端朝内（指向路径前进方向），做「进入符号」合适，做「起始箭头」就需要反转；
- `orient="auto-start-reverse"`：同 auto，但 marker-start 端反转 180 度。双箭头连线（两端都朝外）用这一个值加同一支 marker 就够了，不需要定义两支；
- `orient="45"`：固定角度，单位是度。做罗盘刻度、恒定朝向的装饰符号时用。

### 2.5 样式继承：currentColor 也能穿进标记

marker 内容会**从引用它的元素继承可继承属性**（fill、stroke、color 等），和 use 的影子树机制同源（见 [符号与复用](/svg/120-SVGSymbolReuse)）。这给了我们主题化能力：

```svg
<marker id="arrow-theme" viewBox="0 0 10 10" refX="9" refY="5"
        markerWidth="6" markerHeight="6" orient="auto-start-reverse">
  <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
</marker>

<path class="link" stroke="#d63031" color="#d63031"
      marker-end="url(#arrow-theme)" d="M 10 10 L 90 10" />
```

把标记的填充写成 `currentColor`，再在引用元素上设 `color`——换主题色时只改一处 CSS，箭头与线一起变色。若把箭头 fill 写死为 `#333`，暗色主题下会出现黑底黑箭头的不可见事故。

## 3. 三个工程场景

### 场景一：审批流图的自适应箭头

真实背景：OA 系统的审批流画布，节点由后端下发坐标，连线动态生成，箭头手画需要对每条线算三角函数。用 marker 一次定义、处处挂载：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 140">
  <defs>
    <marker id="flow-arrow" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="5" markerHeight="5" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
    </marker>
    <g id="node">
      <rect x="-50" y="-22" width="100" height="44" rx="6"
            fill="#fff" stroke="#4f5bd5" stroke-width="2" />
    </g>
  </defs>

  <use href="#node" x="60" y="40" color="#4f5bd5" />
  <text x="60" y="45" text-anchor="middle" font-size="13">提交申请</text>

  <use href="#node" x="250" y="40" color="#00b894" />
  <text x="250" y="45" text-anchor="middle" font-size="13">主管审批</text>

  <path d="M 110 40 L 195 40" stroke="#2f3640" stroke-width="2" fill="none"
        color="#2f3640" marker-end="url(#flow-arrow)" />
  <text x="152" y="32" text-anchor="middle" font-size="11" fill="#57606f">通过</text>
</svg>
```

讲解：

- 连线 `M 110 40 L 195 40` 的终点 195 略微缩进节点左边缘（250-50=200，再让出 5px），配合 refX=9 让箭头尖贴住节点边框——**箭头定位职责全在 marker，线的终点只管别穿模**；
- 斜线场景（比如从「主管审批」驳回回「提交申请」的对角连线）无需任何额外计算，orient 自动旋转，这就是对手画方案的核心优势；
- 状态色（通过绿、驳回红）靠 CSS 切换 path 的 stroke 与 color 两个属性，箭头经 currentColor 跟随，不必为每种状态定义新 marker。

### 场景二：折线看板的零 JS 数据点标记

真实背景：运维值班室的折线看板用纯 SVG 生成，要求每个采样点画一个醒目的圆点供肉眼对数。常规做法是 JS 遍历数据逐个 append circle；用 marker-mid 可以让「画点」完全交给一条 path：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 140">
  <defs>
    <marker id="pt" viewBox="0 0 10 10" refX="5" refY="5"
            markerWidth="2.5" markerHeight="2.5" orient="0">
      <circle cx="5" cy="5" r="3.5" fill="#0984e3" stroke="#fff" stroke-width="1.2" />
    </marker>
  </defs>

  <path d="M 20 110 L 70 80 L 120 95 L 170 50 L 220 65 L 270 25"
        fill="none" stroke="#0984e3" stroke-width="2.5"
        marker-mid="url(#pt)" marker-start="url(#pt)" marker-end="url(#pt)" />
</svg>
```

讲解：

- 数据点是 `L` 折线的每个顶点：首点由 `marker-start` 挂、末点由 `marker-end` 挂、中间点全部由 `marker-mid` 挂——一条 path 六个数据点六个圆点，没有一行循环代码。数据更新时只重算 `d` 字符串，符号自动跟着走；
- 圆点标记把 `orient` 显式写成 `0`（固定角度）：圆是旋转对称的，跟着切线转毫无意义；而 `refX=5 refY=5` 把圆心对到数据点上，圆点才不会偏心；
- `markerWidth="2.5"` 配 stroke-width 2.5 乘出来 6.25px 的标记视口，内容里 r=3.5 的圆被缩放成直径约 4.4px——**想调圆点大小，优先调 markerWidth（乘 stroke-width 后生效），别去改内容里的 r**，否则换线宽时圆点又跟着变；
- 如果这个看板后续要叠加「正常/告警」两色圆点：定义第二支不同 fill 的 marker，JS 只需按数据切换每个顶点所在 path 的 marker 属性——比逐点 append/移除 circle 节点的 DOM 操作量小得多。

### 场景三：CI 流水线依赖图的互指连线

真实背景：发布系统的依赖图要表达「A 构建 -> B 部署，B 失败则回滚到 A」这类双向语义：正向箭头表示依赖方向，反向箭头表示回滚路径，且同一条回滚线的两端都要有箭头（从 B 出发、指回 A）。

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 160">
  <defs>
    <marker id="dep" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#57606f" />
    </marker>
  </defs>

  <rect x="15" y="60" width="80" height="40" rx="6" fill="#fff" stroke="#57606f" stroke-width="2" />
  <text x="55" y="85" text-anchor="middle" font-size="13">build</text>

  <rect x="245" y="60" width="80" height="40" rx="6" fill="#fff" stroke="#57606f" stroke-width="2" />
  <text x="285" y="85" text-anchor="middle" font-size="13">deploy</text>

  <!-- 正向依赖：单箭头 -->
  <path d="M 95 72 L 240 72" fill="none" stroke="#57606f" stroke-width="2"
        marker-end="url(#dep)" />
  <!-- 回滚路径：双向箭头，同一支 marker 挂 start 与 end -->
  <path d="M 240 100 C 170 140 170 140 95 100" fill="none"
        stroke="#d63031" stroke-width="2" stroke-dasharray="6 4"
        marker-start="url(#dep)" marker-end="url(#dep)" />
  <text x="167" y="145" text-anchor="middle" font-size="11" fill="#d63031">rollback</text>
</svg>
```

讲解：

- 回滚线的两端箭头用的是**同一支 marker**：`marker-start` 与 `marker-end` 都指向 `url(#dep)`，靠 `orient="auto-start-reverse"` 让 start 端自动反转 180 度、尖端朝外指向 build。如果用 `orient="auto"`，start 端的箭头尖会转向路径前进方向（指向线内部），形成「一头进一头出」的怪相——这正是 2.4 节两种取值差异的实战落点；
- 回滚线走贝塞尔曲线 `C` 绕开中间地带，控制点 (170, 140) 把弧压在下方。**曲线没有折点，所以 marker-mid 在这条线上一个都不挂**——marker 只出现在 start/end，恰好就是双向语义需要的位置；
- 虚线 `stroke-dasharray` 只作用于线身，不影响箭头渲染；箭头颜色写死 `#57606f` 而非 currentColor，是因为回滚线想保持灰色箭头、红线只强调线身。若希望箭头也变红，把 marker 内 fill 换成 currentColor 即可（见 2.5）。

## 4. 修改实验

按顺序做，每一步先预测再刷新验证：

1. 把 2.1 示例的 refX 从 9 改成 0，观察箭头与线端的相对位置，解释「线戳进箭头」的成因；
2. 把线宽从 2 改成 4 再改回 0.5，观察箭头尺寸随 markerUnits 默认值的联动；然后改 `markerUnits="userSpaceOnUse"` 并把 markerWidth/Height 调到合适值，验证箭头不再随线宽变化；
3. 给场景一的「主管审批」节点加一条回到「提交申请」的对角驳回线，观察 orient 让箭头自动转向的效果，并用 currentColor 把驳回线与箭头一起改成红色。

<details>
<summary>参考实现（先自己改，再展开对照）</summary>

第 1 题：refX=0 时内容坐标 (0, 5)（三角形左边缘中点）被对齐到路径端点，箭头整体甩到端点右侧，而线仍画到端点为止，所以线头直接插进箭头身体。修复思路就是让「尖端」而不是「边缘」对齐端点：refX 取尖端附近的值（如 9）。

第 2 题：默认 `markerUnits="strokeWidth"` 下，线宽 4 时箭头 24px、线宽 0.5 时箭头 3px（小到几乎不可见）。改 userSpaceOnUse 后 markerWidth/Height 直接以用户坐标系单位生效，与线粗解耦：

```svg
<marker id="arrow-fixed" viewBox="0 0 10 10" refX="9" refY="5"
        markerWidth="12" markerHeight="12"
        markerUnits="userSpaceOnUse" orient="auto-start-reverse">
  <path d="M 0 0 L 10 5 L 0 10 z" fill="#333" />
</marker>
```

注意 userSpaceOnUse 下 markerWidth 就是像素数（粗略地说），取 12 左右在 2px 线宽的图里视觉合适。

第 3 题：在场景一 SVG 里追加（驳回线从主管节点底部绕回提交节点顶部，orient 自动旋转）：

```svg
<path d="M 250 66 C 250 110 60 110 60 66" fill="none"
      stroke="#d63031" stroke-width="2"
      color="#d63031" marker-end="url(#flow-arrow)" />
<text x="155" y="112" text-anchor="middle" font-size="11" fill="#d63031">驳回</text>
```

曲线无折点，箭头只出现在终点；终点 (60, 66) 落在提交节点下缘附近，箭头尖经 refX=9 贴住节点边框，朝向由终点处切线决定（大致竖直向上），全程无三角函数。

</details>

## 5. 小练习

预测题：`markerWidth="4" markerHeight="4"`、引用元素 `stroke-width="3"`，箭头实际渲染多少像素？若 marker 内还有 `viewBox="0 0 20 20"`，内容坐标系如何映射？

修 Bug 题：内联 SVG 图表的箭头全部消失，但线还在；同一份文件在另一页里正常。列出至少三个可能原因并按排查顺序排列。

挑战题（不看提示）：实现一条「地铁线路」折线：三段不同粗细的线段共享同一支箭头 marker，要求箭头在所有端点处尺寸一致、颜色跟随各段线路色。给出结构与关键属性，并说明 `strokeWidth` 与 `userSpaceOnUse` 两种 markerUnits 各自能不能直接满足「尺寸一致」。

先自己推理或动手验证，再展开参考答案对照：

<details>
<summary>参考答案（先自己推，再展开对照）</summary>

预测题：默认 markerUnits="strokeWidth"，实际尺寸 = 4 乘以 3 = 12px。viewBox="0 0 20 20" 与 12px 的标记视口之间再做一次等比映射：内容坐标系 0-20 被缩放进 12x12 像素，比例 0.6，内容坐标 (10,10) 落在标记中心 (6,6)。三层坐标系（marker viewBox、标记视口、引用路径的用户坐标系）依次叠加，与根 svg 的 viewBox 机制同构。

修 Bug 题：排查顺序——1) id 拼写：url(#arrow) 与 defs 里 id 是否逐字符一致（大小写敏感）；2) marker 元素是否还在文档里（SVGO 清理或模板条件渲染删掉了 defs）；3) 引用路径的 marker-end 属性是否被组件库/CSS 覆盖（DevTools 查 computed style 的 marker-end 值）；4) 该页 SVG 是否经 img 引用导致静态安全模式（箭头与线会一起消失，与本例「线还在」矛盾，可排除）。本例「线在箭头无」最指向 1) 与 3)。

挑战题：marker 定义一次，`orient="auto-start-reverse"`、`fill="currentColor"`；每段 path 各设自己的 stroke 与 color 为线路色，共享 `marker-end="url(#metro-arrow)"`。尺寸一致性：markerUnits="strokeWidth" 下箭头尺寸随各段线宽变化，三段粗细不同则箭头不等大，不满足要求；改 `markerUnits="userSpaceOnUse"` 后标记尺寸固定在用户坐标系，与线粗解耦，尺寸一致且颜色经 currentColor 各随其段——这是两种取值语义差异的直接应用。

</details>

## 6. 什么时候应该 / 不应该用

- 应该用：凡是「沿路径的端点符号」（箭头、圆点、叉号、刻度）一律用 marker，不要手画三角形；折线图的逐点符号优先考虑 marker-mid；
- 不应该用：符号本身需要复杂交互（hover 提示、拖拽）时，marker 内的符号难以单独绑定事件，退回 use 或直接绘制元素；「沿路径均匀分布多个符号」也不是 marker 的职责（那是 textPath 或 JS 采样的领域）。

## 7. 与之前和之后的知识的关系

- 往前：marker 的定位依赖 050 的路径端点概念，尺寸映射复用 030 的 viewBox 缩放规则；currentColor 继承接自 130 的 CSS 样式化；
- 往后：155 的数据可视化用 marker 画坐标轴箭头与数据点符号；115 篇的 image/foreignObject 与本篇同属「把别的东西装进 SVG」，但装的是位图与 HTML，约束不同。

## 8. 官方文档

- MDN：marker element：https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/marker
- MDN：marker-start / marker-mid / marker-end 属性：https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/marker-start
- MDN：Other content in SVG（主题目录）：https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/Content_in_SVG

## 9. 自我检查

- 能不看文档写出 refX/refY、markerWidth/Height、orient、markerUnits 四组属性各自的作用；
- 能解释「箭头尺寸 = markerWidth 乘以 stroke-width」的联动并知道如何解耦；
- 能说出 marker-start / mid / end 各挂在路径的哪些位置、平滑曲线上 mid 会发生什么；
- 能给「箭头对不上」「箭头消失」「箭头忽大忽小」各说出至少两个可能原因。

## 本章总结

marker 把端点符号变成路径的附属品，锚点（refX/refY）、视口（markerWidth/Height）、旋转（orient）、缩放基准（markerUnits）四个旋钮覆盖几乎所有连线场景：refX/refY 决定符号哪个点贴住路径端点，markerWidth/Height 决定显示尺寸（默认还要乘 stroke-width），orient 负责切线对齐与 start 端反转，markerUnits 决定尺寸跟线粗联动还是固定。配合 currentColor 继承，一支 marker 就能服务整套主题色系统。

## 下一步

继续看同族的另外两个「装进 SVG」手段：[image 与 foreignObject](/svg/115-SVGImageAndForeignObject)，或直接进入 [SVG 数据可视化方法论](/svg/155-SVGDataVizEssentials)。
