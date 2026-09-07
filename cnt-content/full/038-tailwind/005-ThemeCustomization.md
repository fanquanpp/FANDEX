---
order: 50
title: Tailwind CSS 主题定制与设计令牌
module: 'tailwind'
category: 前端技术
difficulty: intermediate
description: Tailwind CSS 4 主题定制全攻略：@theme 设计令牌、@theme inline、@utility、OKLCH 色彩与运行时换肤，从品牌设计规范视角落地你的设计系统
author: fanquanpp
updated: '2026-08-30'
related:
  - 'tailwind/002-InstallConfig'
  - 'tailwind/008-V4Features'
prerequisites:
  - 'tailwind/002-InstallConfig'
---


## 0. 先打个比方：装修前先出"设计图纸"

想象你要装修一套新房。专业的设计公司不会让施工队"边装边想"，而是先出一整套**设计图纸**：墙漆用哪个色号、地板选什么材质、灯光的色温是多少、门把手是圆角还是直角……每一处细节都提前定好，施工队照图施工，整屋风格才能统一。

网站开发也是一样。一个网站有成百上千个按钮、卡片、标题，如果每个页面各写各的颜色值，很容易出现"这个按钮的蓝和那个按钮的蓝不一样"的灾难。而 **Tailwind CSS 的"设计图纸"**，就是本篇文章的主角——**设计令牌（Design Token）与 @theme 配置**。

Tailwind 4 之前，这份"图纸"写在一个叫 `tailwind.config.js` 的 JavaScript 文件里；Tailwind 4 之后，图纸直接写进 CSS，用 `@theme` 块声明。本篇文章就以"品牌设计规范"的视角，带你逐步建立一套属于自己的设计系统。

## 1. 设计令牌：网站的品牌设计规范

### 1.1 直观理解：给设计决策起名字

什么是设计令牌？一句话：**把"颜色、字体、间距、圆角、阴影"等设计决策，起一个有意义的名字，存成一个可复用的变量**。

举个例子，你家楼下的奶茶店有自己的品牌色——"暖阳橙" `#ff7a45`。如果店里每张海报都写一遍 `#ff7a45`，改版时就要全城找一遍所有海报。正确的做法是：定义一次"品牌橙"这个名字，所有海报引用它，改版时只改一处定义。

设计令牌就是这个道理：

```css
/* 给"品牌橙"起个名字，全站共用 */
--color-brand-500: #ff7a45;
```

以后写 `bg-brand-500`、`text-brand-500`，底层都是同一个值。改品牌色时，只动这一行。

### 1.2 为什么要从设计规范视角看主题

一个成熟的主题定制，应该像品牌设计规范书一样分章节管理，Tailwind 4 的 `@theme` 恰好支持这种组织方式。一份完整的品牌规范通常包含六类，正好对应六类令牌：

| 品牌规范章节 | Tailwind 令牌命名空间 | 生成的工具类示例 |
| --- | --- | --- |
| 品牌色板 | `--color-*` | `bg-primary`、`text-danger`、`border-primary` |
| 字体体系 | `--font-*`、`--text-*` | `font-sans`、`text-lg` |
| 间距体系 | `--spacing-*` | `p-4`、`m-2`、`gap-6` |
| 圆角规范 | `--radius-*` | `rounded-card` |
| 阴影规范 | `--shadow-*` | `shadow-card` |
| 响应式断点 | `--breakpoint-*` | `md:`、`lg:` 前缀 |

后续章节就按照这份"品牌规范书"逐章展开。

## 2. @theme：Tailwind 4 的 CSS-first 配置核心

### 2.1 直观理解：一张"声明台"

在 Tailwind 4 中，配置从 JavaScript 文件迁移到了 CSS，核心入口就是一个 `@theme` 块。你可以把它想象成品牌规范书的"声明台"：**在这里声明的每一个变量，既是一个真实的 CSS 变量，又会自动生成对应的工具类**。

### 2.2 原理：变量与工具类的映射

`@theme` 为什么能同时产生"CSS 变量"和"工具类"两种产物？因为 Tailwind 4 的编译引擎（Rust 编写的 Oxide）会在构建时读取 `@theme` 块：一方面把变量原样输出到 `:root` 中（供 JS 和任意值使用），另一方面根据变量的**命名空间前缀**（如 `--color-`、`--font-`）生成对应的全套工具类。

```css
/* src/styles/global.css —— 项目唯一的样式入口 */
@import "tailwindcss";

/* 品牌规范书的"声明台"：一次声明，两处生效 */
@theme {
  /* 色彩章节 */
  --color-primary: #1677ff;          /* 生成 bg-primary / text-primary / border-primary ... */
  --color-primary-hover: #4096ff;    /* 生成 bg-primary-hover 等 */
  --color-surface: #ffffff;          /* 卡片、页面底色 */
  --color-text-main: #1f1f1f;        /* 正文主色 */

  /* 字体章节 */
  --font-sans: "Inter", system-ui, sans-serif;  /* 覆盖默认字体族 */

  /* 圆角章节 */
  --radius-card: 12px;               /* 生成 rounded-card */

  /* 阴影章节 */
  --shadow-card: 0 2px 8px rgb(0 0 0 / 0.08);   /* 生成 shadow-card */
}
```

### 2.3 在 HTML 中使用

```html
<!-- 主按钮：bg-primary 指向品牌主色，rounded-card 指向 12px 圆角 -->
<button class="bg-primary text-white rounded-card px-4 py-2 hover:bg-primary-hover">
  主按钮
</button>

<!-- 卡片：语义化令牌组合，修改一处全站生效 -->
<div class="bg-surface shadow-card rounded-card text-text-main p-6">卡片内容</div>
```

### 2.4 命名空间速查表

`@theme` 中的变量名前缀决定了它能生成哪些工具类，这是 Tailwind 4 主题定制的"语法核心"：

| 变量前缀 | 生成的工具类 | 说明 |
| --- | --- | --- |
| `--color-*` | `bg-*`、`text-*`、`border-*`、`fill-*`、`ring-*` 等 | 颜色全家桶 |
| `--font-*` | `font-*` | 字体族 |
| `--text-*` | `text-*` | 字号（注意与文字颜色前缀区分） |
| `--font-weight-*` | `font-*`（字重） | 如 `font-semibold` |
| `--spacing-*` | `p-*`、`m-*`、`gap-*`、`w-*`、`h-*` 等 | 间距与尺寸 |
| `--radius-*` | `rounded-*` | 圆角 |
| `--shadow-*` | `shadow-*` | 外阴影 |
| `--breakpoint-*` | `sm:`、`md:`、`lg:` 等前缀 | 响应式断点 |
| `--animate-*` | `animate-*` | 动画 |
| `--ease-*` | `ease-*` | 缓动函数 |

> 提示：`--text-*` 既指字号也涵盖行高，Tailwind 内部用 `--text-lg--line-height` 这样的复合变量控制行高，不必深究，只需知道"字号也能量身定制"。

## 3. 色彩令牌：网站的第一张脸

### 3.1 新增令牌 vs 覆盖默认令牌

在 `@theme` 中定义 `--color-*` 有两种语义，新手务必分清：

- **新增令牌**：定义 `--color-brand-500`，`bg-brand-500` 立即可用，**默认色板不受影响**，安全；
- **覆盖默认令牌**：重新定义 `--color-blue-500`，会**覆盖 Tailwind 预设的蓝色 500**，影响所有使用 `blue-500` 的地方，需谨慎。

```css
@theme {
  /* 覆盖默认色板：把全站 blue-* 换成品牌蓝（影响面大，谨慎使用） */
  --color-blue-500: #1677ff;
  --color-blue-600: #0958d9;
  --color-blue-700: #003eb3;

  /* 新增品牌色系：完全安全，默认色板不受影响 */
  --color-brand-50: #e6f4ff;
  --color-brand-100: #bae0ff;
  --color-brand-500: #1677ff;
  --color-brand-600: #0958d9;
  --color-brand-700: #003eb3;
}
```

推荐的组合策略是"**新增为主、覆盖为辅**"：日常开发优先用 `brand-*` 这类自定义色系；只有确需把默认色统一替换为品牌色时，才覆盖 `blue-*` 等默认命名。

### 3.2 认识 OKLCH 色彩空间

Tailwind 4 的默认调色板改用 **OKLCH 色彩空间**，它是 CSS 原生支持的颜色函数，三个参数分别是：亮度 L（0-1）、饱和度 C、色相 H（角度）。

```css
@theme {
  /* 用 oklch() 定义颜色：同一色系的色阶过渡更均匀、更符合人眼感知 */
  --color-brand-500: oklch(0.623 0.214 259.8);
  --color-brand-600: oklch(0.546 0.245 262.9);
}
```

直观理解：同样是在 500、600、700 之间渐变，OKLCH 的明暗变化是"人眼觉得均匀"的，而传统 HEX/RGB 的色阶在人眼看来往往"中间偏亮或偏暗"。这就是为什么 Tailwind 4 用 OKLCH 重新设计整套色板。

实际项目不必强求写 `oklch()`，**直接写 HEX（如 `#1677ff`）完全没问题**，Tailwind 会自动处理兼容性（对不支持 OKLCH 的浏览器生成兜底颜色）。OKLCH 的价值主要在你需要精心设计一套色阶时体现。

### 3.3 语义令牌：让颜色名表达业务含义

"品牌规范"进阶做法是把颜色分为三层：

- **基础层**：原始取值，如 `--color-blue-500: #1677ff`；
- **语义层**：表达业务语义，如 `--color-primary: var(--color-blue-500)`；
- **组件层**：落到具体组件，如 `--color-btn-bg: var(--color-primary)`。

```css
@theme {
  /* 基础层：真实取值 */
  --color-blue-500: #1677ff;
  --color-red-500: #f5222d;

  /* 语义层：通过 var() 引用基础层，形成依赖 */
  --color-primary: var(--color-blue-500);
  --color-danger: var(--color-red-500);
}
```

这样做的好处是：**未来换肤只改基础层，语义层与组件层零改动**。比如品牌蓝从 `#1677ff` 换成 `#0ea5e9`，只动 `--color-blue-500` 一行，所有用 `bg-primary` 的地方全部跟着变。

## 4. 字体令牌：排版体系的骨架

字体体系是品牌规范的第二大板块。Tailwind 4 中，字体相关的命名空间主要有 `--font-*`（字体族）、`--text-*`（字号）、`--font-weight-*`（字重）：

```css
@theme {
  /* 覆盖默认字体族：全站文字使用品牌字体 */
  --font-sans: "Inter", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;

  /* 新增展示字体：标题用 */
  --font-display: "Satoshi", "Inter", sans-serif;

  /* 自定义一个"标题级"字号 */
  --text-hero: 2.5rem;
  --text-hero--line-height: 1.2;
}
```

```html
<h1 class="font-display text-hero">品牌标题</h1>
<p class="font-sans">正文内容使用 --font-sans 定义的字体栈</p>
```

## 5. 间距令牌：让页面呼吸感统一

设计规范里通常规定"间距刻度"，比如 4px 的整数倍：4、8、12、16、24……Tailwind 默认的 `--spacing-*` 就是 0.25rem 的倍数。你可以新增自定义间距刻度：

```css
@theme {
  /* 新增间距刻度：18 = 4.5rem，用于特殊大区块 */
  --spacing-18: 4.5rem;
  --spacing-128: 32rem;
}
```

```html
<!-- 大区块用自定义间距 -->
<section class="p-18">内容</section>
```

新增的 `--spacing-18` 会自动让 `p-18`、`m-18`、`gap-18`、`w-18` 等所有间距类可用。

## 6. 圆角与阴影：视觉质感的最后一块拼图

```css
@theme {
  /* 圆角规范：卡片 12px，胶囊按钮 9999px */
  --radius-card: 12px;
  --radius-pill: 9999px;

  /* 阴影规范：柔和卡片阴影 + 悬浮提升阴影 */
  --shadow-card: 0 2px 8px rgb(0 0 0 / 0.08);
  --shadow-card-hover: 0 4px 16px rgb(0 0 0 / 0.12);
}
```

```html
<div class="rounded-card shadow-card hover:shadow-card-hover transition-shadow">
  悬浮时阴影加深，形成"卡片抬起来"的层次感
</div>
```

## 7. 断点令牌：响应式布局的刻度

断点也是品牌规范的一部分。Tailwind 4 用 `--breakpoint-*` 定义断点，**新增变量自动生成对应前缀，覆盖变量则改变默认断点**：

```css
@theme {
  /* 覆盖默认断点：把 sm 从 640px 调整为 560px */
  --breakpoint-sm: 560px;

  /* 新增断点：自动生成 3xl: 前缀 */
  --breakpoint-3xl: 1920px;
}
```

```html
<div class="grid grid-cols-1 3xl:grid-cols-4">
  超大屏幕（≥1920px）下显示 4 列
</div>
```

断点的完整用法在下一篇《响应式与暗色模式》中详述，这里只需记住：断点也是 `@theme` 里的一等公民。

## 8. @theme inline：内联展开的取舍

当你让一个令牌引用另一个令牌时，会面临"内联展开"还是"保留引用链"的选择：

```css
/* 普通 @theme：工具类输出 var(--color-primary)，运行时跟随变量变化 */
@theme {
  --color-primary: var(--color-blue-600);
}
/* 编译结果：.bg-primary { background-color: var(--color-primary); } */

/* @theme inline：把值直接内联到工具类，不保留变量引用链 */
@theme inline {
  --color-primary: var(--color-blue-600);
}
/* 编译结果：.bg-primary { background-color: var(--color-blue-600); } */
```

两种写法各有用处：

- **普通 `@theme`**：适合希望"运行时能通过覆盖变量换肤"的场景（见第 10 节）；
- **`@theme inline`**：适合"类名渲染结果必须稳定、不依赖变量链"的场景。Tailwind 默认主题内部大量使用 inline 展开，以保证内置工具类取值稳定。

官方文档特别提醒：当变量引用会跨作用域时（如 `--font-sans: var(--font-inter)`，而 `--font-inter` 定义在更深层选择器），必须用 `@theme inline`，否则 `var()` 可能在解析时取不到值而回退到兜底值。

## 9. @utility：把设计规范固化为自定义工具类

有时候，你需要一个"不属于任何命名空间"的自定义工具类。Tailwind 4 提供了 `@utility` 指令，在 CSS 中即可注册一个全新的工具类，并支持搭配 `hover:`、`dark:` 等变体使用：

```css
/* 自定义工具类：文字渐变 */
@utility text-gradient {
  background-image: linear-gradient(to right, #1677ff, #722ed1);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
```

```html
<!-- 像普通工具类一样使用，还能叠加变体 -->
<h2 class="text-gradient hover:opacity-80">渐变标题</h2>
```

`@utility` 相比 v3 时代"写 JS 插件注册工具类"的方式，心智负担小得多，是 Tailwind 4 自定义能力的首选。

## 10. 运行时换肤：CSS-first 的核心红利

因为令牌本质就是 CSS 变量，**运行时换肤（如亮色/暗色/品牌色切换）只需用 JS 覆盖变量值**，无需重新构建：

```js
// theme-switcher.js —— 运行时换肤
const themes = {
  light: { '--color-primary': '#1677ff', '--color-surface': '#ffffff' },
  dark:  { '--color-primary': '#4096ff', '--color-surface': '#141414' },
}

function applyTheme(name) {
  const vars = themes[name]
  const root = document.documentElement
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value)  // 覆盖 :root 上的令牌变量
  }
}
```

组件里全程使用语义类（`bg-primary`、`bg-surface`），切换主题时 JS 只改变量，样式代码零改动。这就是"CSS-first 配置 + CSS 变量"相比旧配置方案的核心红利。

## 11. 常见错误与对策

| 常见错误 | 报错 / 现象 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| 在 `@theme` 外定义 `--color-*` 却期待生成工具类 | `bg-primary` 无效，样式缺失 | 只有 `@theme` 内的令牌才会生成工具类 | 把令牌定义移入 `@theme`；`:root` 中的变量仅用于运行时覆盖 |
| 定义 `--primary: #1677ff`（漏了 `color`） | `bg-primary` 不生效 | 变量前缀不属于任何命名空间 | 使用完整命名空间 `--color-primary` |
| 覆盖 `--color-blue-500` 后全站蓝色"失控" | 多处蓝色意外改变 | 覆盖默认令牌影响所有引用处 | 优先用 `--color-brand-*` 新增色系，仅在有明确需求时覆盖默认令牌 |
| 在 `@theme` 里嵌套选择器 | 编译报错或变量不生效 | `@theme` 要求变量定义在顶层 | 把嵌套内容移到 `@theme` 之外，`@theme` 只放顶层变量 |
| 语义令牌换肤不生效 | 切换主题后颜色不变 | 用了 `@theme inline`，值被内联无法覆盖 | 需要运行时换肤的令牌用普通 `@theme` |
| 用 `bg-[var(--color-primary)]` 写任意值 | 能运行但可读性差 | 忽略了令牌已生成工具类的事实 | 直接用 `bg-primary`，任意值仅用于一次性场景 |

## 13. 一句话记忆

**设计令牌 = 网站的装修设计图纸；`@theme` 声明令牌，一个变量同时变身"CSS 变量 + 全套工具类"，改一处、全站生效。**
