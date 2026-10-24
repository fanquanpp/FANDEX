---
order: 30
title: Tailwind CSS 核心概念与工具类
module: 'tailwind'
category: 前端技术
difficulty: beginner
description: Tailwind CSS 核心工具类清单：颜色、间距、排版、边框、圆角、阴影、滤镜七大族逐一盘点，排版族覆盖换行优化与装饰线全集，含类名命名规律、状态变体与任意值
author: fanquanpp
updated: '2026-10-07'
related:
  - 'tailwind/020-InstallConfig'
  - 'tailwind/041-FlexboxLayout'
prerequisites:
  - 'tailwind/020-InstallConfig'
---

## 知识点地图

- 知识类别：Tailwind 工具类（utility class）的命名规律与七大功能族清单，外加状态变体入门与任意值语法。
- 解决什么问题：脱离手写 CSS，用统一刻度的类名完成组件的常规样式——配色、留白、排版、描边、圆角、阴影、滤镜。
- 什么时候用到：写任何 Tailwind 页面的每一步；本篇是全模块的"字典地基"，布局、变体、主题各篇都建立在七大族之上。
- 变体的引擎层原理（peer/has/not/任意变体/叠加顺序）在[变体引擎与交互状态](/tailwind/055-VariantsAndStates)系统展开。

## 前置知识

- [Tailwind CSS 安装与配置](/tailwind/020-InstallConfig)：建议先完成前一篇的学习

## 学习目标

- 能拆解任意工具类名的"前缀 + 色相/对象 + 刻度"结构，从类名直接读出它对应的 CSS 声明。
- 能用颜色、间距、排版、边框、圆角、阴影、滤镜七大族工具类，脱离自定义 CSS 完成常规组件样式。
- 排版不止五维度基本盘：会用 text-balance/truncate 控制换行、decoration 家族美化装饰线、list 与表格工具类整理结构化内容、fill/stroke 给 SVG 着色。
- 能用 `hover:`/`focus:`/`disabled:` 等状态变体表达交互状态，理解 `group-hover:` 的父子联动机制。
- 能判断何时该用任意值语法，并知道如何把高频例外值提升为 `@theme` 设计令牌或 `@utility` 自定义工具类。
- 能识别 `bg-opacity-*`、动态拼接类名等旧写法或错误写法，并给出 v4 下的正确替代。



## 0. 工具箱里的成套扳手

修理工的工具箱里，扳手从来不是一支，而是一套：4mm、6mm、8mm、10mm……从小到大排成一排，卡在专用的扳手架上。为什么要成套？因为拧不同尺寸的螺栓，就要用对应尺寸的扳手——用 8mm 扳手去拧 10mm 的螺栓，要么拧不紧，要么滑扣。成套工具的意义在于：**每种规格都有明确位置，拿起来就能用，用错了立刻知道**。

Tailwind 的工具类就是这套"成套扳手"。它把 CSS 属性按"族"组织：颜色是一族、间距是一族、排版是一族……每一族内部又按刻度细分。你不需要"发明"一个类名，只需要从架上挑选合适的那一支。而且整套扳手的规格是统一的——颜色都在 50 到 950 的明度刻度上，间距都在 0.25rem 的倍数上，不会有任何一支"扳手"长得和其他支不一样。

本篇采用"清单驱动"的写法：按七大工具类族逐一盘点（颜色、间距、排版、边框、圆角、阴影、滤镜），每族配示例与命名规律讲解，最后补充状态变体与任意值，并给出常见错误表与实战练习。

## 1. 先认识命名规律：工具类怎么"读"出来

在逐族盘点之前，先掌握 Tailwind 类名的通用拼写规则。绝大多数工具类遵循"属性前缀 + 值"两级命名：

```text
bg-blue-500   → 前缀 bg（background 背景）+ blue（色相）+ 500（明度刻度）
text-sm       → 前缀 text（字号/文字颜色）+ sm（小号）
p-4           → 前缀 p（padding 内边距）+ 4（间距刻度）
rounded-lg    → 前缀 rounded（圆角）+ lg（大）
```

三种常见结构：

第一，**属性前缀直接对应 CSS 属性**：`bg` 对应 `background`，`text` 对应 `font-size`/`color`，`p` 对应 `padding`，`m` 对应 `margin`，`w`/`h` 对应 `width`/`height`。

第二，**颜色类多一级"色相"**：`bg-blue-500` 是"背景 + 蓝色 + 明度 500"，色相有 red、orange、amber、yellow、lime、green、emerald、teal、cyan、sky、blue、indigo、violet、purple、fuchsia、pink、rose，以及中性色 gray、zinc、neutral、stone、slate。

第三，**同一前缀在不同语境可能映射不同属性**：比如 `text-sm` 管字号、`text-blue-500` 管颜色、`text-center` 管对齐。Tailwind 会按词意自动识别，初学者偶尔会困惑，但用的多了自然熟悉。

只要掌握了"前缀 + 值"的规律，看到陌生的类名也能猜出七八分。下面是七大工具类族的完整清单。

## 2. 颜色族：全站配色都在这一层

颜色是页面的第一印象。Tailwind 的调色板采用"色相-明度"两级命名，明度从 50（最浅）到 950（最深），共 11 个刻度。v4 的默认调色板全面升级为 OKLCH 色彩空间，颜色更鲜艳、明度过渡更均匀，并支持 P3 广色域。

颜色工具类按作用对象分为四组：

| 前缀 | 作用 | 示例 |
| --- | --- | --- |
| `bg-*` | 背景色 | `bg-blue-600` |
| `text-*` | 文字色 | `text-gray-700` |
| `border-*` | 边框色 | `border-emerald-200` |
| `ring-*` | 外圈光晕色 | `ring-blue-300` |

```html
<!-- 主按钮：蓝色背景 + 悬停加深 -->
<button class="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
  提交
</button>

<!-- 次按钮：浅色背景 + 描边 -->
<button class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-700">
  草稿
</button>

<!-- 错误提示：红色文字 -->
<p class="text-sm text-red-500">手机号格式不正确</p>

<!-- 透明度修饰：v4 用斜杠写法，bg-black/50 即半透明黑 -->
<div class="bg-black/50 text-white">遮罩层</div>
```

讲解：`bg-blue-600 hover:bg-blue-700` 实现"主色 + 悬停加深"的标准按钮交互。`/50` 是 v4 的透明度修饰符，替代了 v3 的 `bg-opacity-50` 单独类；斜杠后可以是 0-100 的任意百分比。

v4 在 4.2 版本还新增了 mauve（灰紫）、olive（橄榄）、mist（雾灰）、taupe（灰褐）四个中性色板，配合原有的 gray、zinc、neutral、stone、slate，共有九个中性色可选。

## 3. 间距族：一切留白都有刻度

间距体系是 Tailwind 设计一致性的基石。它基于 0.25rem（4px）的刻度：`p-4` 中的 4 表示 4 × 4px = 16px。数字越大间距越大，且全部来自统一刻度，从机制上杜绝了"随手写 17px"。

内边距（padding）四向与方向缩写：

| 类名 | 值 | 说明 |
| --- | --- | --- |
| `p-4` | 1rem | 四边内边距 |
| `px-4` | 1rem | 左右（x 轴）内边距 |
| `py-2` | 0.5rem | 上下（y 轴）内边距 |
| `pt-4` / `pb-2` / `pl-3` / `pr-1` | 各方向 | 上/下/左/右单方向内边距 |

外边距（margin）完全同构，只是把 `p` 换成 `m`：`m-4`、`mx-auto`（左右自动，经典居中）、`mt-8`（上边距）、`mb-6`。

```html
<!-- 卡片内统一留白 -->
<div class="rounded-lg border border-gray-200 p-6">
  <h2 class="text-lg font-semibold">课程大纲</h2>
  <!-- 区块之间用 mb-4 拉开距离 -->
  <p class="mb-4 text-sm text-gray-600">第一章：认识编程</p>
  <p class="mb-4 text-sm text-gray-600">第二章：变量与运算</p>
</div>

<!-- 子元素间距：space-y-4 为所有相邻子元素添加垂直间距 -->
<div class="space-y-4">
  <div class="rounded bg-gray-100 p-3">条目一</div>
  <div class="rounded bg-gray-100 p-3">条目二</div>
</div>
```

讲解：`space-y-4` 用一条类替代"给每个子元素加 `mt-4`"的重复劳动，它通过相邻兄弟选择器（`> * + *`）实现，只影响相邻子元素之间的间距。口诀：**p 是 padding（往内撑开），m 是 margin（往外推开）**。

间距刻度速查（常用值）：`1` = 4px、`2` = 8px、`3` = 12px、`4` = 16px、`6` = 24px、`8` = 32px、`12` = 48px、`16` = 64px。v4 还支持任意动态值，`mt-17` 这种非预设数值也可直接使用。

## 4. 排版族：从五维度基本盘到杂志级细节

排版的五个基本维度：字号（font-size）、字重（font-weight）、行高（line-height）、字距（letter-spacing）、对齐（text-align）。

| 维度 | 前缀 | 示例类 | 说明 |
| --- | --- | --- | --- |
| 字号 | `text-*` | `text-sm` / `text-2xl` | 预设字号刻度 |
| 字重 | `font-*` | `font-bold` / `font-medium` | 400 到 900 |
| 行高 | `leading-*` | `leading-relaxed` | 阅读舒适度 |
| 字距 | `tracking-*` | `tracking-tight` | 字母/汉字间距 |
| 对齐 | `text-*` | `text-center` / `text-left` | 段落对齐 |

```html
<!-- 标题：大字号 + 加粗 + 紧凑字距 + 紧凑行高 -->
<h1 class="text-3xl font-bold leading-tight tracking-tight">课程简介</h1>

<!-- 正文：常规字号 + 宽松行高，阅读更舒适 -->
<p class="mt-3 text-base leading-relaxed text-gray-600">
  这是一门面向零基础学习者的编程入门课程，
  通过项目实战帮助学员建立完整的编程思维。
</p>

<!-- 辅助文字：小字号 + 浅灰色 -->
<p class="mt-1 text-sm text-gray-400">更新于 2026 年 8 月</p>

<!-- 徽标：极小字号 + 大写 + 宽字距 -->
<span class="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-blue-700">
  初级
</span>
```

讲解：字号刻度按等比缩放设计（`xs` 12px、`sm` 14px、`base` 16px、`lg` 18px、`xl` 20px、`2xl` 24px、`3xl` 30px……），标题层级用 `text-2xl` 到 `text-6xl` 拉开视觉落差。`leading-*` 与 `tracking-*` 让标题更紧凑、正文更宽松，是"高级感"排版的小技巧。这五个维度是"每一页都要用"的基本盘；下面四组是"好页面与普通页面拉开差距"的细节——换行控制、装饰线、列表样式与 SVG 着色。

### 4.1 换行与留白：text-balance、whitespace 与断词

长标题与长单词是排版的两大翻车源，对应三组工具：

| 类名 | CSS | 解决什么 |
| --- | --- | --- |
| `text-balance` | text-wrap: balance | 标题多行时各行长度均衡，告别"第一行撑满、第二行一个字" |
| `text-pretty` | text-wrap: pretty | 正文段落避免孤行（最后一行只剩一两个字） |
| `whitespace-nowrap` / `truncate` | white-space: nowrap（truncate 叠加溢出省略） | 单行标签不换行；`truncate` 一行搞定"超长省略号" |
| `whitespace-pre-line` | white-space: pre-line | 保留文本里的换行符（用户输入的简介） |
| `break-words` / `hyphens-auto` | overflow-wrap / hyphens | 长 URL、长单词不再撑爆容器 |

```html
<!-- 标题换行均衡：三行标题各行长度接近，视觉重量平均 -->
<h1 class="text-balance text-3xl font-bold tracking-tight">
  从零到上线：一门给设计专业的 Web 入门课
</h1>

<!-- 列表项单行省略：课程名超长时截断，不撑破布局 -->
<li class="truncate">JavaScript 高级程序设计（第 4 版·全彩·附赠源码与视频）</li>

<!-- 用户简介保留换行 -->
<p class="whitespace-pre-line text-sm text-gray-600">{user.bio}</p>

<!-- 长 URL 防爆版：容器内断词换行 -->
<p class="break-words text-sm text-gray-500">
  https://example.com/courses/web-basics/chapters/very-long-chapter-slug-name
</p>
```

讲解：`text-balance` 加给**标题**、`text-pretty` 加给**正文**，两者是 v4.1 起内建的换行优化——一行类替代过去的手动 `<br>` 或手调 max-width。`truncate` 是"宽度不足"的通用答案（需要元素本身有宽度约束，如 `max-w-*` 或 flex 的 `min-w-0`）；`whitespace-nowrap` 只禁止换行不省略，用它却忘了限宽就会横向撑破容器。中文排版少用 `hyphens-auto`（中文没有连字符断词），它的用户是英文长词。

### 4.2 装饰线家族：下划线的四要素

下划线（以及删除线、上划线）可以拆成四个维度分别控制：

| 类名 | 控制什么 |
| --- | --- |
| `underline` / `line-through` / `no-underline` | 有无线与线型 |
| `decoration-gray-400` / `decoration-primary` | 线的颜色 |
| `decoration-1` 到 `decoration-4` | 线的粗细 |
| `underline-offset-2` 到 `underline-offset-8` | 线与文字的距离 |
| `decoration-dotted` / `decoration-dashed` / `decoration-wavy` | 线的样式 |

```html
<!-- 链接的"体面"下划线：细一点、淡一点、离字远一点 -->
<a href="/syllabus" class="underline decoration-1 underline-offset-4 decoration-gray-400 hover:decoration-gray-900">
  查看完整大纲
</a>

<!-- 错误文本：波浪线示意"拼写或格式可疑" -->
<p class="text-sm text-red-600 line-through decoration-2">原价 199 元</p>

<!-- 热词标记：波浪下划线 -->
<em class="not-italic underline decoration-wavy decoration-blue-500 underline-offset-4">闭包</em>
```

讲解：浏览器默认下划线"又粗又贴字"，中文里尤其容易穿过笔画——`underline-offset-*` 把线挪下去是中文排版的实用微调。线的颜色与文字颜色默认相同，`decoration-*` 让线比字浅一档，链接既明显又不吵。`hover:decoration-gray-900` 这类组合说明装饰线维度也支持全部状态变体。

### 4.3 列表样式与表格工具类

无序列表、有序列表与表格各有自己的默认样式开关：

| 类名 | 作用 |
| --- | --- |
| `list-disc` / `list-decimal` / `list-none` | 圆点 / 数字 / 去标记 |
| `list-inside` / `list-outside` | 标记在文本内侧 / 外侧 |
| `border-collapse` / `border-separate` | 单元格边框合并 / 分离 |
| `table-fixed` / `table-auto` | 列宽固定均分 / 按内容自适应 |
| `caption-top` / `caption-bottom` | 表格标题位置 |

```html
<!-- 大纲列表：数字编号 + 嵌套 -->
<ol class="list-decimal list-inside space-y-1 text-sm text-gray-600">
  <li>HTML 网页的骨架</li>
  <li>CSS 网页的皮肤</li>
  <li>JavaScript 网页的灵魂</li>
</ol>

<!-- 数据表格：边框合并 + 固定列宽，长内容不挤乱其他列 -->
<table class="w-full table-fixed border-collapse text-sm">
  <thead>
    <tr class="border-b border-gray-300 text-left">
      <th class="py-2">章节</th>
      <th class="py-2">时长</th>
    </tr>
  </thead>
  <tbody class="divide-y divide-gray-100">
    <tr><td class="py-2 truncate">环境搭建与第一个页面</td><td class="py-2">18 分钟</td></tr>
  </tbody>
</table>
```

讲解：v4 的 Preflight 已把列表默认标记去掉，`list-disc`/`list-decimal` 是"要回标记"的开关——常与 `list-inside`（标记参与缩进流）配合。表格三件套的分工：`border-collapse` 让相邻单元格边框合并成一条线（数据表标配）；`table-fixed` 让列宽只看表头定义、不看内容长短（配合 `truncate` 保证行高稳定），`table-auto` 则按内容分配——内容长度不可控的后台表格优先 fixed。

### 4.4 SVG 着色：fill-* 与 stroke-*

内联 SVG 图标可以像文字一样吃到工具类：`fill-*` 管填充色、`stroke-*` 管描边色，且支持全部变体——这是"图标跟随主题与状态"的关键：

```html
<!-- 实心收藏图标：默认灰、悬停变红，颜色全部走工具类 -->
<button class="group">
  <svg viewBox="0 0 24 24" class="size-6 fill-gray-300 transition-colors group-hover:fill-red-500" aria-hidden="true">
    <path d="M12 21l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.18L12 21z" />
  </svg>
</button>

<!-- 线性图标：stroke 跟随文字色 -->
<svg viewBox="0 0 24 24" class="size-5 stroke-gray-500" fill="none" stroke-width="2" aria-hidden="true">
  <path d="M4 6h16M4 12h16M4 18h16" />
</svg>
```

讲解：SVG 内部的 `fill="#xxx"` 硬编码会盖住工具类——要图标吃到类系统，SVG 元素本身别写 fill/stroke 属性，交给类。`fill-current`/`stroke-current` 是"继承当前文字颜色"的速记，让图标的颜色完全跟随父级 `text-*`，是图标组件化的标准做法。



## 5. 边框族：描边与分割线

边框用于分隔信息与勾勒轮廓，包含粗细、颜色、样式三个维度，加上 `divide-*`（子元素分割线）与 `ring-*`（外圈光晕）两个扩展。

| 类名 | 作用 |
| --- | --- |
| `border` | 四边 1px 边框 |
| `border-2` / `border-4` | 2px / 4px 边框 |
| `border-t` / `border-b` | 仅上边 / 下边 |
| `border-gray-200` | 边框颜色 |
| `border-dashed` | 虚线边框 |
| `divide-y-2` | 子元素之间加分隔线 |
| `ring-2` | 外圈 2px 光晕 |

```html
<!-- 描边卡片 -->
<div class="rounded-lg border border-gray-200 p-4">
  轻量卡片，仅用描边区分层级
</div>

<!-- 虚线框：常用于"拖拽上传"区域 -->
<div class="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
  拖拽文件到此处上传
</div>

<!-- 列表分隔线：divide-y 自动在子元素之间加线 -->
<ul class="divide-y divide-gray-100">
  <li class="py-3">第一章：认识编程</li>
  <li class="py-3">第二章：变量与运算</li>
  <li class="py-3">第三章：条件与循环</li>
</ul>

<!-- 焦点光晕：表单聚焦时的高亮圈 -->
<input class="rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-300 focus:outline-none" />
```

讲解：`divide-y` 是"列表内部分隔线"的标准写法，比给每个 `li` 加 `border-t` 更省事且不会出现首尾多线。`ring` 使用 `box-shadow` 实现，不占据布局空间，适合做焦点提示；配合 `focus:` 变体就是"聚焦高亮"的标准交互。

## 6. 圆角族：一张卡片的气质由圆角决定

圆角工具类前缀统一为 `rounded`，按预设刻度选择：

| 类名 | 值 | 视觉 |
| --- | --- | --- |
| `rounded-sm` | 2px | 几乎看不出圆 |
| `rounded` | 4px | 轻微圆角 |
| `rounded-md` | 6px | 常规控件 |
| `rounded-lg` | 8px | 卡片常用 |
| `rounded-xl` | 12px | 大卡片、弹窗 |
| `rounded-2xl` | 16px | 卡片墙 |
| `rounded-3xl` | 24px | 更夸张的圆 |
| `rounded-full` | 9999px | 胶囊 / 圆形 |

单角与双角控制：`rounded-t-lg`（上两角）、`rounded-b-md`（下两角）、`rounded-l-xl`（左两角）、`rounded-tl-lg`（左上单角）。

```html
<!-- 胶囊按钮：rounded-full 两端全圆 -->
<button class="rounded-full bg-gray-900 px-6 py-2 text-sm text-white">开始学习</button>

<!-- 头像：正方形 + rounded-full 变圆形 -->
<img src="/avatar.png" alt="头像" class="h-12 w-12 rounded-full object-cover" />

<!-- 图片卡片：顶部圆角 + 内容区 -->
<figure class="overflow-hidden rounded-xl border border-gray-200">
  <img src="/cover.png" alt="封面" class="h-40 w-full object-cover" />
  <figcaption class="p-4 text-sm text-gray-600">课程封面图</figcaption>
</figure>
```

讲解：图片裁圆角时要注意两点：图片本身用 `object-cover` 裁剪填充；外层容器加 `overflow-hidden` 防止图片溢出圆角边界。圆角刻度与间距刻度一样来自设计令牌，可在 `@theme` 中用 `--radius-*` 自定义（例如 `--radius-4xl: 2rem`）。

## 7. 阴影族：用投影建立空间层级

阴影让元素"浮"起来，是区分卡片层级的重要手段。`shadow-*` 按大小分五档：

```html
<!-- 阴影五档：sm（微弱）→ md（中等）→ lg → xl → 2xl -->
<div class="rounded-lg bg-white p-6 shadow-sm">常规卡片</div>
<div class="rounded-lg bg-white p-6 shadow-lg">浮起卡片</div>
<div class="rounded-lg bg-white p-6 shadow-2xl">弹窗层卡片</div>
```

```html
<!-- 彩色阴影 + 透明度：v4 支持 shadow-颜色/透明度 -->
<div class="rounded-xl bg-white p-6 shadow-lg shadow-blue-500/20">
  品牌色投影：适合强调性卡片
</div>

<!-- 移除默认阴影 -->
<button class="rounded-md bg-blue-600 px-4 py-2 text-white shadow-md hover:shadow-lg active:shadow-none">
  悬停浮起、按下收起
</button>
```

讲解：按钮"悬停浮起、按下按下"的动效只靠三个类：`shadow-md` 默认、`hover:shadow-lg` 悬停加深、`active:shadow-none` 按下消失，配合 `transition-shadow` 可让变化平滑。彩色阴影（如 `shadow-blue-500/20`）能给卡片注入品牌色调，但要克制使用，避免全页面彩色阴影。

## 8. 滤镜族：模糊、亮度、灰度、混合

滤镜类处理图片与背景的视觉效果，前缀为 `blur-*`、`brightness-*`、`grayscale`、`sepia`、`hue-rotate-*`、`saturate-*` 等：

```html
<!-- 模糊背景：常用于弹窗背后的毛玻璃层 -->
<div class="fixed inset-0 bg-black/40 backdrop-blur-sm"></div>

<!-- 灰度图：未完成课程的封面 -->
<img src="/course.png" alt="未开课" class="h-32 w-full object-cover grayscale" />

<!-- 悬停恢复彩色：hover:grayscale-0 -->
<img src="/course.png" alt="封面"
     class="h-32 w-full object-cover grayscale transition-all hover:grayscale-0" />
```

```html
<!-- 亮度与透明度：图片浮层上的文字可读性处理 -->
<div class="relative">
  <img src="/banner.png" alt="横幅" class="h-48 w-full object-cover brightness-50" />
  <p class="absolute inset-0 flex items-center justify-center text-lg font-medium text-white">
    半暗背景上的白色标题
  </p>
</div>
```

讲解：`backdrop-blur-*` 作用于元素背后的内容（毛玻璃效果），是模态框遮罩的流行做法；`brightness-50` 把图片压暗 50%，让叠加的文字清晰可读。滤镜类同样支持 `hover:`、`group-hover:` 等变体，实现"悬停去灰"这类细腻交互。

## 9. 状态变体：同一类，不同状态

变体（variant）是 Tailwind 的"灵魂"：在工具类前加状态前缀，样式只在特定状态生效。样式不变，前缀一换，状态即变。

```html
<!-- 一个按钮覆盖四种状态 -->
<button class="rounded-md bg-blue-600 px-4 py-2 text-white
               hover:bg-blue-700 focus:ring-2 focus:ring-blue-300
               active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed">
  提交
</button>
```

常用状态变体清单：

| 变体 | 触发时机 | 典型用途 |
| --- | --- | --- |
| `hover:` | 鼠标悬停 | 颜色加深、浮起 |
| `focus:` | 键盘/点击聚焦 | 焦点高亮 |
| `focus-visible:` | 仅键盘聚焦 | 可访问性优先（推荐） |
| `active:` | 元素被按下 | 按下反馈 |
| `disabled:` | 元素禁用 | 置灰、禁点 |
| `first:` / `last:` | 第一个 / 最后一个子元素 | 首尾去边距 |
| `group-hover:` | 祖先含 `group` 类时悬停 | 整卡联动 |
| `dark:` | 暗色模式 | 明暗双套样式 |
| `md:` 等断点前缀 | 视口宽度 | 响应式 |

```html
<!-- group-hover 示例：悬停整张卡片时标题变色、阴影加深 -->
<div class="group rounded-xl border border-gray-200 p-6 transition-shadow hover:shadow-md">
  <h3 class="text-lg font-semibold group-hover:text-blue-600">课程卡片</h3>
  <p class="mt-2 text-sm text-gray-500">悬停本卡片试试，标题会变蓝</p>
</div>
```

讲解：父元素加 `group` 标记，子元素用 `group-hover:` 就能响应父元素的悬停状态，实现"整卡联动"而无需为子元素单独挂事件。本节是入门清单：`peer-`、`has-`、`not-`、任意变体与叠加顺序等引擎面内容见[变体引擎与交互状态](/tailwind/055-VariantsAndStates)。`dark:` 变体在 v4 中默认跟随系统（`prefers-color-scheme`），如需类名切换模式，用 `@custom-variant dark` 自定义。

## 10. 任意值与 @utility：清单之外的补充

预设刻度覆盖 95% 的场景，剩下的 5% 用两个手段解决。

第一，**任意值**：方括号语法直接写任意 CSS 值。注意类名中不能有空格，用下划线 `_` 代替：

```html
<!-- 任意宽度、任意颜色、任意网格 -->
<div class="w-[320px] bg-[#f8fafc] p-[13px]">精确到像素</div>
<div class="grid grid-cols-[1fr_2fr]">自定义网格列</div>
<p class="text-[clamp(1rem,2vw,1.5rem)]">响应式字号</p>
```

第二，**@utility 自定义工具类**：把反复出现的复杂样式封装成自己的工具类，且自动支持变体组合：

```css
/* src/styles/global.css */
@import "tailwindcss";

@utility card-base {
  border-radius: 0.75rem;
  border: 1px solid var(--color-gray-200);
  box-shadow: var(--shadow-sm);
}
```

```html
<!-- 自定义工具类 + 变体直接可用 -->
<div class="card-base hover:shadow-md">封装样式</div>
```

使用原则：**偶尔的例外值用任意值；频繁出现的值提升为 `@theme` 设计令牌或 `@utility` 工具类**，保证全站一致性。

## 11. 常见错误与对策

| 错误场景 | 表现 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| 混淆 m 与 p | 加间距没效果或布局错乱 | 分不清内边距与外边距 | 记口诀：p 是往里撑，m 是往外推 |
| 颜色找不到 | `bg-sky-400` 样式缺失 | 色相名拼写错误（如 `skyblue`） | 对照官方色板：sky、emerald、rose 等均为标准色相名 |
| 忘写变体前缀 | hover 样式直接常驻 | 写了 `bg-blue-700` 但没写 `hover:` | 状态样式必须带前缀：`hover:bg-blue-700` |
| 任意值空格报错 | `grid-cols-[1fr 2fr]` 不生效 | 类名不允许空格 | 用下划线：`grid-cols-[1fr_2fr]` |
| 阴影叠加混乱 | 多层阴影不生效 | `shadow-md` 会覆盖默认阴影变量 | 单层元素只写一个 `shadow-*`；组合阴影用任意值 |
| 圆角图片四角发方 | 图片盖住了圆角 | 图片溢出容器圆角 | 容器加 `overflow-hidden` |
| v3 透明度写法残留 | `bg-opacity-50` 无效 | v4 已移除该旧类 | 用 `bg-black/50` 斜杠修饰符 |

## 12. 动手实践

**任务一：给"错误卡片"上全套样式。** 用七大族工具类完成一张错误提示卡：红色系背景与文字、统一内边距、细描边、圆角、浅阴影、左侧竖条（border-l 加粗），全程不写一行自定义 CSS。提示：颜色族选 red 色阶（背景用 50、文字用 600、描边用 200）；竖条是 `border-l-4`。

**任务二：杂志级排版迁移。** 把一段"默认样式"的图文升级为排版规范：标题紧凑字距且多行均衡、正文宽松行高、辅助信息小字号浅灰、大纲用数字列表、装饰线离字一档。提示：`tracking-tight` 与 `text-balance` 给标题、`leading-relaxed` 给正文、`text-sm text-gray-400` 给辅助行、`list-decimal list-inside` 给大纲、`underline-offset-4 decoration-gray-400` 给链接；对照第 4 节示例逐项核对。

**任务三：任意值到令牌的提升。** 页面里出现第三处 `w-[280px]` 时停下来：把它提升为 `@theme` 令牌或 `@utility`，并说明这个动作防住了什么。提示：对照第 10 节使用原则；防住的是"同一个尺寸三处写法开始漂移"。

先自己写，再对照参考实现：

<details>
<summary>任务一参考实现</summary>

```html
<div class="rounded-lg border border-red-200 border-l-4 border-l-red-500 bg-red-50 p-4 shadow-sm">
  <h3 class="text-sm font-semibold text-red-600">支付失败</h3>
  <p class="mt-1 text-sm text-red-500">银行卡余额不足，请更换支付方式后重试。</p>
</div>
```

七个族里动用了六个：颜色（bg/text/border 的 red 阶梯）、间距（p-4 与 mt-1）、排版（字号与字重）、边框（描边 + 左侧加粗竖条）、圆角（rounded-lg）、阴影（shadow-sm）。`border-red-200` 管"普通三边"、`border-l-red-500` 单独覆盖左边——方向性边框色与整体边框色是两套类，可并存。红色阶梯的分工是 50 铺底、200 描边、500 强调、600 正文：同一色相不同明度表达层级，这就是"色阶"存在的意义。
</details>

<details>
<summary>任务二参考实现</summary>

```html
<article class="max-w-2xl">
  <h2 class="text-balance text-xl font-bold leading-tight tracking-tight text-gray-900">为什么坚持写代码</h2>
  <p class="mt-3 text-base leading-relaxed text-gray-600">
    编程是一项手艺，手艺靠刻意练习积累。每天固定写一点，比周末突击四小时更有效。
  </p>
  <ol class="mt-3 list-inside list-decimal space-y-1 text-sm text-gray-600">
    <li>HTML 网页的骨架</li>
    <li>CSS 网页的皮肤</li>
    <li>JavaScript 网页的灵魂</li>
  </ol>
  <a href="#syllabus" class="mt-3 inline-block text-sm text-blue-600 underline decoration-gray-400 decoration-1 underline-offset-4 hover:decoration-blue-600">
    查看完整大纲
  </a>
  <p class="mt-1 text-sm text-gray-400">更新于 2026-10-06</p>
</article>
```

排版规范落在四层类上：标题 `leading-tight tracking-tight text-balance` 收紧行距字距且多行均衡；正文 `leading-relaxed` 放宽到 1.625 的行高，长段阅读不易串行；大纲 `list-decimal list-inside` 找回序号、`space-y-1` 统一条目间距；链接下划线用 `decoration-gray-400 underline-offset-4` 做到"看得见但不吵"，悬停时装饰线加深呼应文字变色。辅助行 `text-sm text-gray-400` 退居信息次要层。整套"高级感"全部来自刻度系统的对比与新换行属性，没有任何魔法值。
</details>

<details>
<summary>任务三参考实现</summary>

```css
/* src/styles/global.css */
@import "tailwindcss";

@theme {
  --spacing-sidebar: 280px;
}
```

```html
<!-- 三处 w-[280px] 全部替换为 -->
<aside class="w-sidebar">侧栏</aside>
```

提升动作防住两类事故：其一，"宽度漂移"——三处 280px 中有一处被手滑改成 272px，视觉对不齐却没人知道，令牌化后这类值有唯一出处；其二，"语义缺失"——`w-[280px]` 只说明多宽，`--spacing-sidebar` 说明了**这是侧栏的宽度**，后来者改布局时会先找到它。判断时点记一句话：任意值是"例外"，例外第三次出现就变成了"规范"，该入令牌了。
</details>

## 13. 一句话记忆

工具类就是成套扳手：按"属性前缀 + 刻度值"的规律从颜色、间距、排版、边框、圆角、阴影、滤镜七大族里挑选组合，状态切换靠 `hover:` 等前缀，刻度的例外用任意值与 `@utility` 补充。
