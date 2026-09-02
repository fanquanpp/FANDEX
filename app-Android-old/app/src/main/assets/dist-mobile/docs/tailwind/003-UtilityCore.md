## 前置知识

- [Tailwind CSS 安装与配置](/tailwind/002-InstallConfig)：建议先完成前一篇的学习

## 学习目标

- 掌握「0. 工具箱里的成套扳手」的核心机制、典型用法与常见陷阱
- 掌握「1. 先认识命名规律：工具类怎么"读"出来」的核心机制、典型用法与常见陷阱
- 掌握「2. 颜色族：全站配色都在这一层」的核心机制、典型用法与常见陷阱
- 掌握「3. 间距族：一切留白都有刻度」的核心机制、典型用法与常见陷阱
- 掌握「4. 排版族：字号、字重、行高、字距一次配齐」的核心机制、典型用法与常见陷阱



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

## 4. 排版族：字号、字重、行高、字距一次配齐

排版涉及五个维度：字号（font-size）、字重（font-weight）、行高（line-height）、字距（letter-spacing）、对齐（text-align）。

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

讲解：字号刻度按等比缩放设计（`xs` 12px、`sm` 14px、`base` 16px、`lg` 18px、`xl` 20px、`2xl` 24px、`3xl` 30px……），标题层级用 `text-2xl` 到 `text-6xl` 拉开视觉落差。`leading-*` 与 `tracking-*` 让标题更紧凑、正文更宽松，是"高级感"排版的小技巧。

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

讲解：父元素加 `group` 标记，子元素用 `group-hover:` 就能响应父元素的悬停状态，实现"整卡联动"而无需为子元素单独挂事件。`dark:` 变体在 v4 中默认跟随系统（`prefers-color-scheme`），如需类名切换模式，用 `@custom-variant dark` 自定义。

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

## 13. 一句话记忆

工具类就是成套扳手：按"属性前缀 + 刻度值"的规律从颜色、间距、排版、边框、圆角、阴影、滤镜七大族里挑选组合，状态切换靠 `hover:` 等前缀，刻度的例外用任意值与 `@utility` 补充。
