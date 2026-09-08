---
order: 20
title: CSS3 概述与基本语法
module: 'css'
category: 前端技术
difficulty: beginner
description: CSS 发展历程、语法结构与层叠规则。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'css/004-CSS3BoxModelDetailed'
  - 'css/008-CSS3SelectorSystem'
prerequisites:
  - 'html5/007-HTML5OverviewCoreFeature'
---

## 0.3 CSS 核心语法扩展：选择器、声明与层叠

### 一条规则由三部分组成

```css
.card {
  color: #1f2937;
  padding: 16px;
}
```

| 部分 | 示例 | 含义 | 排错方法 |
| --- | --- | --- | --- |
| 选择器 | `.card` | 找到要应用样式的元素 | 在 DevTools Elements 中确认元素是否真的有该类名 |
| 属性 | `padding` | 说明要改变哪类视觉特征 | 拼写错误时浏览器会忽略该声明 |
| 值 | `16px` | 属性的具体取值 | 值不合法时该行不会生效 |

### 初学者最常用的属性

| 类别 | 属性 | 典型值 | 适用场景 |
| --- | --- | --- | --- |
| 文本 | `color`、`font-size`、`line-height` | `#111827`、`16px`、`1.7` | 控制阅读体验 |
| 盒模型 | `width`、`padding`、`border`、`margin` | `320px`、`1rem`、`1px solid` | 控制尺寸与间距 |
| 布局 | `display`、`gap`、`align-items` | `flex`、`grid`、`12px` | 控制元素排列 |
| 背景 | `background`、`background-size` | `#fff`、`cover` | 做卡片、横幅和状态块 |
| 交互 | `cursor`、`transition`、`:hover` | `pointer`、`150ms ease` | 提升按钮和链接反馈 |

### 层叠判断顺序

1. 先看来源：浏览器默认样式、作者样式、用户样式。
2. 再看重要性：普通声明与 `!important` 声明分开比较。
3. 再看优先级：内联样式高于 id，id 高于 class，class 高于元素选择器。
4. 最后看出现顺序：优先级相同，后写的覆盖先写的。


## 0. 快速上手：2 分钟写出第一行 CSS

> 目标：不管懂不懂 CSS，先让浏览器里的字变色。

### 0.0 学前准备（30 秒）

开始前确认三样东西已就位：

1. **浏览器**：Chrome 或 Edge（本模块的调试演示均基于 Chrome DevTools）；
2. **编辑器**：VS Code（或任意纯文本编辑器，记事本也可以）；
3. **HTML 基础**：能写一个含 `<h1>` 与 `<p>` 标签的 `index.html`（HTML 入门见 `html5/007-HTML5OverviewCoreFeature`）。

不需要装任何额外软件，CSS 由浏览器直接解析，本模块所有示例都可用“一个 HTML 文件 + 一个 CSS 文件”复现。

### 0.1 准备（30 秒）

打开你 HTML 第一课写的 `index.html`，在 `<head>` 里插入一行（没有就新建一个 `index.html`）：

```html
<link rel="stylesheet" href="style.css" />
```

### 0.2 写 CSS（30 秒）

在 `index.html` 旁边新建一个文本文档，重命名为 `style.css`（确保后缀是 `.css`），敲入：

```css
h1 {
  color: red;
}
```

### 0.3 看效果（30 秒）

保存两个文件，刷新浏览器——标题变红了！

你已经完成了第一行 CSS。记住这种感觉：`选择器 { 属性: 值; }`，后面全是这个格式的展开。

### 0.4 动手试试（1 分钟）

- 把 `red` 改成 `blue`，保存刷新，看颜色变化；
- 再写一行 `p { font-size: 20px; }`，看段落文字是否变大。

> 阅读指南：
>
> - 核心必学（第 0-5 节）：第一遍逐字精读，每个“动手试试”都做；
> - 进阶选修（第 6-8 节）：扫一眼标题，知道“有这个东西”即可，不必现在死磕；
> - 参考手册（第 9-14 节）：随用随查。

### 0.5 学完本章后你能做什么

学完本章（第 0-5 节）后，你应该能：

- 说出 CSS 的三个组成部分：选择器、属性、值；
- 用外部样式表让页面的标题与段落改变颜色和字号；
- 区分行内、内部、外部、@import 四种引入方式并说出各自适用场景；
- 解释“后写的规则为什么能覆盖先写的规则”；
- 说出 `px`/`em`/`rem` 的大致区别；
- 按“三步急救法”排查样式不生效的常见原因。

如果以上任一项答不上来，建议回头重读对应小节；都能回答，就可以进入 `css/004-CSS3BoxModelDetailed`。



> 本节为增量补充，帮助零基础者理解"CSS 没有 4.0/5.0 版本号"的原因。

- CSS 不再整体发布版本，而是按模块演进，W3C 每年发布一次 CSS Snapshot 汇总当前基线。
- 2026 年现代 CSS 基线已包含：Flexbox、Grid、容器查询、:has()、层叠层 @layer、颜色函数（oklch/color-mix）、原生嵌套、逻辑属性、滚动捕捉等。
- 判断某个新特性能否在目标浏览器使用：优先查 MDN 的 Baseline 标记或 caniuse，而不是看"CSS 版本"。

## 1. CSS 是什么（极简版）

> 一句话概括：CSS 就是给 HTML 标签“穿衣服”的规则清单。

- 选择器：告诉浏览器“我要打扮谁”（如 `h1`、`.card`）；
- 属性：告诉浏览器“我要改哪里”（如 `color`、`font-size`）；
- 值：告诉浏览器“改成什么样”（如 `red`、`20px`）。

CSS3 能做什么（挑 3 个记住就够了）：

| 能力 | 对应属性 | 你在第 0 节刚用过 |
| --- | --- | --- |
| 改颜色 | `color` / `background-color` | `color: red` |
| 改大小 | `font-size` / `width` / `height` | `font-size: 20px` |
| 改位置 | `margin` / `padding` / `display: flex` | 后续课程 |

至于 CSS 历史（1996/1998……）和全部特性清单，请移步文末扩展学习，第一遍学习不需要背。
## 2. 基本语法

### 2.1 语法结构

CSS 的基本语法由选择器、属性和值组成：

```css
/* 选择器 { 属性: 值; } */
h1 {
  color: blue;
  font-size: 24px; /* 声明以分号结束 */
}
/* 多个选择器共享同一组样式 */
h1,
h2,
h3 {
  font-family: Arial, sans-serif;
}
/* 嵌套选择器 */
.container {
  width: 100%;
  .header {
    height: 100px;
  }
  .content {
    padding: 20px;
  }
}
```

**讲解：**

- 每条规则由“选择器 + 声明块”组成，声明块里是“属性: 值;”；
- 分号是声明的结束符，漏掉分号会让下一条声明失效；
- 多个选择器用逗号分隔共享样式；原生 CSS 已支持嵌套，但入门阶段先掌握平铺写法。

动手试试（2 分钟）：

1. 打开你的 `style.css`，把 `h1` 颜色改成 `green`，加一条 `font-size: 32px`（注意分号）；
2. 故意漏掉分号（`color: green` 后面不写 `;`），保存刷新，观察第二条样式是否生效；
3. 把分号补上，再次刷新，确认恢复。

提示：这个练习能帮你记住——分号是声明之间的分隔符，漏掉会让后面的声明失效。

### 2.2 注释

CSS 中的注释使用 `/* */` 语法：

```css
/* 这是一个单行注释 */
/*
 这是一个
 多行注释
 */
/* 注释可以放在任何位置 */
h1 {
  color: blue; /* 颜色设置 */
  font-size: 24px; /* 字体大小设置 */
}
```

**讲解：** CSS 注释用 `/* */` 包裹，可单行可多行；注释不会影响渲染，适合标记分区与解释特殊逻辑。

动手试试（1 分钟）：在 `style.css` 顶部加一行注释 `/* 我的第一个样式表 */`，保存刷新，确认页面不受影响。

### 2.3 空白与格式化

CSS 忽略多余的空白，因此可以使用空白来提高代码可读性：

```css
/* 良好的格式化 */
body {
  font-family: Arial, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  color: #333;
}
/* 压缩格式（用于生产环境） */
body {
  font-family: Arial, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  color: #333;
}
```

### 2.4 大小写敏感性

CSS 对选择器和属性名不区分大小写，但对属性值区分大小写（特别是字体名称和URL）：

```css
/* 以下两种写法效果相同 */
H1 {
  color: BLUE;
}
h1 {
  color: blue;
}
/* 但以下写法效果不同 */
.font {
  font-family: 'Times New Roman', serif; /* 正确 */
  font-family: 'times new roman', serif; /* 可能不生效 */
}
```

**讲解：** 选择器与属性名不区分大小写，但属性值（尤其字体名、URL、`id` 引用）区分大小写。统一小写是团队规范，避免隐患。

动手试试（1 分钟）：把 `h1` 改成 `H1` 并保存，刷新确认样式仍然生效；再把颜色值改成 `RED`，确认同样生效。

## 3. 引入方式

### 3.1 行内样式 (Inline)

直接在 HTML 元素的 `style` 属性中定义样式：

```html
<div style="color: red; font-size: 18px;">行内样式示例</div>
```

**讲解：** 行内样式直接写在 `style` 属性里，优先级最高，但样式与结构耦合、无法复用，只适合临时调试或动态注入。

**优点**：

- 优先级最高，可覆盖其他样式
- 适用于单个元素的特殊样式
  **缺点**：
- 难以维护，样式与结构混合
- 不能重用
- 增加 HTML 文件大小

### 3.2 内部样式 (Internal)

在 HTML 文档的 `<head>` 标签中使用 `<style>` 标签定义样式：

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f0f0f0;
      }
      h1 {
        color: blue;
      }
    </style>
  </head>
  <body>
    <h1>内部样式示例</h1>
  </body>
</html>
```

**讲解：** 内部样式把 CSS 写在 `<head>` 的 `<style>` 里，适合单页小项目；多页面共用的样式应抽取为外部文件。

**优点**：

- 样式与结构分离
- 适用于单个页面的样式
- 无需额外的 HTTP 请求
  **缺点**：
- 样式不能在多个页面间重用
- 增加 HTML 文件大小

### 3.3 外部样式 (External)

在单独的 CSS 文件中定义样式，然后通过 `<link>` 标签引入：
**style.css**：

```css
body {
  font-family: Arial, sans-serif;
  background-color: #f0f0f0;
}
h1 {
  color: blue;
}
```

**HTML**：

```html
<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <h1>外部样式示例</h1>
  </body>
</html>
```

**讲解：** 外部样式通过 `<link rel="stylesheet">` 引入，可被多个页面复用、可缓存、便于维护，是生产环境的标准方式。

动手试试（2 分钟）：用外部样式给 `h1` 设置 `color: blue`，给 `body` 设置 `line-height: 1.6`，保存刷新验证。

**优点**：

- 样式与结构完全分离
- 样式可以在多个页面间重用
- 浏览器可以缓存 CSS 文件，提高加载速度
- 便于维护和管理
  **缺点**：
- 需要额外的 HTTP 请求

### 3.4 导入式 (@import)

在 CSS 文件中使用 `@import` 规则引入其他 CSS 文件：
**main.css**：

```css
@import url('reset.css');
@import url('layout.css');
body {
  font-family: Arial, sans-serif;
}
```

**讲解：** `@import` 在 CSS 内部引入其它样式表，会串行加载、阻塞渲染，性能不如 `<link>`；现代项目已基本不用。

**优点**：

- 可以将样式模块化，便于管理
  **缺点**：
- 会增加 HTTP 请求
- 可能导致页面加载延迟（因为 @import 是在 CSS 解析时才加载）
- 不建议在生产环境中使用

### 3.5 引入方式对比

| 引入方式 | 优先级 | 优点                         | 缺点               | 适用场景             |
| -------- | ------ | ---------------------------- | ------------------ | -------------------- |
| 行内样式 | 最高   | 优先级高，适用于特殊样式     | 难以维护，不能重用 | 单个元素的特殊样式   |
| 内部样式 | 中     | 样式与结构分离，无需额外请求 | 不能跨页面重用     | 单个页面的样式       |
| 外部样式 | 中     | 完全分离，可重用，可缓存     | 需要额外请求       | 多个页面的共用样式   |
| 导入式   | 中     | 样式模块化                   | 增加请求，可能延迟 | 开发环境中的样式组织 |

### 3.6 样式没生效？三步急救

如果刷新浏览器后样式毫无变化，按顺序检查这 3 件事：

1. 保存了吗？按 `Ctrl+S` 保存 `style.css` 和 `index.html`（很多人只保存了一个）；
2. 路径对吗？`<link rel="stylesheet" href="style.css">` 中的文件必须与 `index.html` 在同一文件夹；在子文件夹则写 `href="css/style.css"`；
3. 控制台有报错吗？按 F12 打开开发者工具，点 Console（控制台），红色报错会告诉你哪里出了问题。

提示：90% 的新手问题都出在上面三条，每次卡住先过一遍。

## 4. 优先级规则

CSS 遵循“就近原则”和“权重计算”来确定样式的优先级。

### 4.1 权重计算

CSS 选择器的权重由四部分组成，按从高到低的顺序计算：

1. **!important**：最高优先级，覆盖所有其他规则
2. **行内样式**：权重为 1000
3. **ID 选择器**：权重为 100
4. **类选择器、伪类选择器、属性选择器**：权重为 10
5. **元素选择器、伪元素选择器**：权重为 1
6. **通配符选择器 (\*)、后代选择器 (空格)、相邻兄弟选择器 (+)**：权重为 0

### 4.2 优先级顺序

1. **!important** 声明
2. 行内样式
3. ID 选择器
4. 类选择器、伪类选择器、属性选择器
5. 元素选择器、伪元素选择器
6. 继承的样式
7. 浏览器默认样式

### 4.3 优先级计算示例

```css
/* 权重：1 (元素选择器) */
div {
  color: blue;
}
/* 权重：10 (类选择器) */
.container {
  color: red;
}
/* 权重：100 (ID 选择器) */
#main {
  color: green;
}
/* 权重：101 (ID 选择器 + 元素选择器) */
#main div {
  color: purple;
}
/* 权重：20 (两个类选择器) */
.container .box {
  color: orange;
}
/* 行内样式：权重 1000 */
/* <div style="color: black;"> */
/* !important：最高优先级 */
div {
  color: yellow !important;
}
```

**讲解：**

- 权重从低到高：元素选择器(1) < 类选择器(10) < ID 选择器(100)，行内样式 1000，`!important` 最高；
- 权重相同按“就近原则”，后写的覆盖先写的；
- `!important` 会破坏层叠，应尽量避免，调试时优先查权重而不是加 `!important`。

动手试试（2 分钟）：给同一个 `h1` 分别写 `div h1 { color: blue }` 和 `.title { color: red }`，用开发者工具查看哪个生效，再把 `.title` 改成 `#main .title` 观察变化。

### 4.4 特殊情况

- **继承的样式**：继承的样式优先级最低，即使是低权重的选择器也能覆盖继承的样式。
- **就近原则**：当权重相同时，后定义的样式会覆盖先定义的样式。
- **!important 的使用**：应尽量避免使用 `!important`，因为它会破坏样式的层叠性，使调试变得困难。

## 5. CSS 单位

### 5.1 绝对单位

绝对单位是固定的，不会随其他因素变化：

- **px** (像素)：最常用的单位，适合固定尺寸的元素。
- **pt** (点)：主要用于印刷，1pt = 1/72 英寸。
- **pc** (派卡)：1pc = 12pt。
- **in** (英寸)：1in = 2.54cm。
- **cm** (厘米)：实际长度单位。
- **mm** (毫米)：实际长度单位。

### 5.2 相对单位

相对单位是相对于其他值计算的：

- **em**：相对于当前元素的字体大小。如果当前元素没有设置字体大小，则继承父元素的字体大小。
- **rem**：相对于根元素 (`<html>`) 的字体大小，推荐使用。
- **vw/vh**：相对于视口宽度/高度的 1%。
- **vmin/vmax**：相对于视口宽度和高度中较小/较大值的 1%。
- **%**：相对于父元素的相应属性值。
- **ch**：相对于数字 "0" 的宽度。
- **ex**：相对于字母 "x" 的高度。

### 5.3 单位使用场景

| 单位      | 适用场景                                   | 示例                         |
| --------- | ------------------------------------------ | ---------------------------- |
| px        | 固定尺寸的元素，如边框、按钮大小           | `border: 1px solid #ccc;`    |
| em        | 相对于当前元素字体大小的间距和尺寸         | `padding: 0.5em;`            |
| rem       | 响应式字体大小，便于整体调整               | `font-size: 1.2rem;`         |
| vw/vh     | 响应式布局，相对于视口大小                 | `width: 50vw; height: 50vh;` |
| %         | 相对于父元素的尺寸，如宽度、高度           | `width: 100%;`               |
| vmin/vmax | 响应式设计，确保元素在不同屏幕比例下的显示 | `font-size: 5vmin;`          |

## 6. [进阶选修] CSS 变量

第一遍学习可以先跳过本节，知道“CSS 变量 = 可复用的命名值”即可，后续主题课程会展开。

CSS 变量（也称为自定义属性）允许你定义可重用的值，提高代码的可维护性。

### 6.1 变量定义与使用

使用 `--` 前缀定义变量，使用 `var()` 函数使用变量：

```css
 /* 定义变量 */
 :root {
  --primary-color: #3498db;
  --secondary-color: #2ecc71;
  --font-size: 16px;
  --spacing: 1rem;
 }
 /* 使用变量 */
 body {
  font-size: var(--font-size);
  color: var(--primary-color);
 }
 .button {
  background-color: var(--primary-color);
  padding: var(--spacing);
 }
 .button:hover {
  background-color: var(--secondary-color);
 }
```

**讲解：**

- 用 `--` 前缀定义变量，用 `var(变量名)` 引用；
- 变量写在 `:root` 中即全局可用，一处修改、全局生效；
- 变量是运行时特性，可以被媒体查询与 JavaScript 动态覆盖（详见 `css/036-CSSVariableCustomAttribute`）。

动手试试（2 分钟）：在 `:root` 中定义 `--main-color: #3498db` 与 `--spacing: 1rem`，在按钮样式中使用它们；改一处变量值，观察全局变化。

### 6.2 变量作用域

- **全局作用域**：在 `:root` 选择器中定义的变量，可在整个文档中使用。
- **局部作用域**：在特定选择器中定义的变量，只在该选择器及其后代中使用。

```css
 /* 全局变量 */
 :root {
  --color: blue;
 }
 /* 局部变量 */
 .container {
  --color: red;
  color: var(--color); /* 红色 */
 }
 .box {
  color: var(--color); /* 继承容器的红色 */
 }
 .footer {
  color: var(--color); /* 全局的蓝色 */
 }
```

**讲解：** 变量遵循“继承 + 就近覆盖”：元素会继承父级的变量，自己或更近的祖先定义了同名变量就覆盖。`.footer` 不在 `.container` 内，所以取全局蓝色。

### 6.3 变量使用示例

```css
 /* 主题变量 */
 :root {
  /* 浅色主题 */
  --bg-color: #ffffff;
  --text-color: #333333;
  --primary-color: #3498db;
  /* 间距 */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  /* 圆角 */
  --border-radius-sm: 4px;
  --border-radius-md: 8px;
  --border-radius-lg: 12px;
  /* 阴影 */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.1);
 }
 /* 深色主题 */
 @media (prefers-color-scheme: dark) {
  :root {
  --bg-color: #121212;
  --text-color: #e0e0e0;
  --primary-color: #64b5f6;
  }
 }
 /* 使用变量 */
 body {
  background-color: var(--bg-color);
  color: var(--text-color);
  margin: 0;
  padding: var(--spacing-md);
  font-family: Arial, sans-serif;
 }
 .card {
  background-color: var(--bg-color);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
 }
 .button {
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--border-radius-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: pointer;
  transition: background-color 0.3s ease;
 }
 .button:hover {
  background-color: darken(var(--primary-color), 10%);
 }
```

**讲解：**

- 这个示例是“设计令牌”的经典写法：颜色、间距、圆角、阴影分四类变量，主题切换只改颜色变量；
- 深色模式用 `@media (prefers-color-scheme: dark)` 覆盖同一组变量，结构变量保持不变；
- 注意：`darken()` 是 Sass/Less 的语法，**原生 CSS 不支持**，悬停不会变暗。修正方案：`filter: brightness(0.9)`、`color-mix(in srgb, var(--primary-color), black 10%)`，或预定义 `--primary-color-dark` 变量；
- 卡片背景与页面背景相同会缺乏层次感，建议为卡片单独定义 `--card-bg`。

## 7. [进阶选修] CSS 函数

CSS 提供了多种函数，用于计算值、处理颜色等。

### 7.1 颜色函数

- **rgb()/rgba()**：使用红、绿、蓝和透明度值定义颜色。
- **hsl()/hsla()**：使用色相、饱和度、亮度和透明度值定义颜色。
- **color()**：使用指定颜色空间的颜色。
- **darken()/lighten()**：使颜色变暗或变亮。
- **saturate()/desaturate()**：增加或减少颜色的饱和度。
- **opacity()**：设置颜色的透明度。

```css
/* rgb() 示例 */
.color1 {
  color: rgb(255, 0, 0); /* 红色 */
}
/* rgba() 示例 */
.color2 {
  color: rgba(255, 0, 0, 0.5); /* 半透明红色 */
}
/* hsl() 示例 */
.color3 {
  color: hsl(120, 100%, 50%); /* 绿色 */
}
/* hsla() 示例 */
.color4 {
  color: hsla(120, 100%, 50%, 0.5); /* 半透明绿色 */
}
```

### 7.2 数学函数

- **calc()**：执行计算，可混合不同单位。
- **clamp()**：将值限制在一个范围内。
- **min()**：返回多个值中的最小值。
- **max()**：返回多个值中的最大值。

```css
/* calc() 示例 */
.container {
  width: calc(100% - 20px); /* 宽度为父元素宽度减去 20px */
  height: calc(100vh - 100px); /* 高度为视口高度减去 100px */
  font-size: calc(16px + 0.5vw); /* 字体大小随视口宽度变化 */
}
/* clamp() 示例 */
.text {
  font-size: clamp(16px, 2vw, 24px); /* 字体大小在 16px 到 24px 之间，随视口宽度变化 */
}
/* min() 示例 */
.box {
  width: min(500px, 100%); /* 宽度为 500px 和 100% 中的较小值 */
}
/* max() 示例 */
.header {
  height: max(100px, 10vh); /* 高度为 100px 和 10vh 中的较大值 */
}
```

### 7.3 其他常用函数

- **url()**：引用资源的 URL。
- **linear-gradient()/radial-gradient()**：创建线性或径向渐变。
- **repeat()**：重复值，用于 Grid 布局。
- **var()**：使用 CSS 变量。
- **attr()**：获取元素的属性值。

```css
/* url() 示例 */
.background {
  background-image: url('image.jpg');
}
/* linear-gradient() 示例 */
.gradient {
  background: linear-gradient(to right, red, blue);
}
/* radial-gradient() 示例 */
.radial-gradient {
  background: radial-gradient(circle, red, blue);
}
/* repeat() 示例 */
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* 创建 3 个等宽列 */
}
/* attr() 示例 */
[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: white;
  padding: 5px;
  border-radius: 4px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.3s;
}
[data-tooltip]:hover::after {
  opacity: 1;
}
```

## 8. [进阶选修] 浏览器兼容性

### 8.1 浏览器前缀

为了支持不同浏览器的实验性特性，需要使用浏览器前缀：

```css
/* 带浏览器前缀的 CSS */
.box {
  /* Chrome, Safari, Opera */
  -webkit-border-radius: 8px;
  /* Firefox */
  -moz-border-radius: 8px;
  /* 标准语法 */
  border-radius: 8px;
  /* Chrome, Safari, Opera */
  -webkit-box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  /* Firefox */
  -moz-box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  /* 标准语法 */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  /* Chrome, Safari, Opera */
  -webkit-transition: all 0.3s ease;
  /* Firefox */
  -moz-transition: all 0.3s ease;
  /* 标准语法 */
  transition: all 0.3s ease;
}
```

### 8.2 兼容性检测

使用 `@supports` 规则检测浏览器是否支持特定特性：

```css
/* 检测是否支持 Grid 布局 */
@supports (display: grid) {
  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
  }
}
/* 检测是否支持 Flexbox */
@supports (display: flex) {
  .flex {
    display: flex;
    justify-content: center;
    align-items: center;
  }
}
/* 降级方案 */
.grid {
  /* 传统布局作为降级方案 */
  display: block;
}
@supports (display: grid) {
  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### 8.3 兼容性最佳实践

- **使用 Autoprefixer**：自动添加浏览器前缀。
- **渐进增强**：先实现基本功能，再添加高级特性。
- **优雅降级**：为不支持高级特性的浏览器提供替代方案。
- **使用 CSS Reset 或 Normalize.css**：统一不同浏览器的默认样式。
- **测试**：在不同浏览器中测试你的样式。

## 9. 最佳实践

### 9.1 代码组织

- **使用模块化 CSS**：将样式按功能或组件分类。
- **使用命名约定**：如 BEM (Block, Element, Modifier) 命名规范。
- **使用注释**：为复杂样式添加注释。
- **保持代码整洁**：使用一致的缩进和格式。

### 9.2 性能优化

- **减少 CSS 文件大小**：使用压缩工具。
- **减少选择器复杂度**：使用简单的选择器。
- **避免使用 @import**：使用 `<link>` 标签代替。
- **使用 CSS 变量**：减少重复代码。
- **避免过度使用 !important**：保持样式的层叠性。

### 9.3 可维护性

- **使用语义化的类名**：类名应反映元素的用途。
- **避免内联样式**：使用外部或内部样式。
- **使用 CSS 预处理器**：如 Sass、Less 等，提供变量、嵌套、混合等功能。
- **定期清理**：移除未使用的样式。
- **文档化**：为样式添加文档说明。

## 10. 总结

CSS3 是现代网页设计的重要组成部分，提供了丰富的特性和功能：

- **核心特性**：响应式设计、现代布局、视觉效果、交互动画等。
- **语法结构**：选择器、属性、值的基本结构，以及注释、空白等语法规则。
- **引入方式**：行内样式、内部样式、外部样式、导入式，各有优缺点。
- **优先级规则**：基于权重计算和就近原则，决定样式的应用顺序。
- **CSS 单位**：绝对单位和相对单位，适用于不同的场景。
- **CSS 变量**：可重用的值，提高代码的可维护性。
- **CSS 函数**：用于计算值、处理颜色等。
- **浏览器兼容性**：使用浏览器前缀和特性检测，确保在不同浏览器中的一致性。
- **最佳实践**：代码组织、性能优化、可维护性等方面的建议。
  通过掌握 CSS3 的这些特性和最佳实践，开发者可以创建美观、响应式、高性能的网页设计。

## 11. 本章综合挑战（选做）

学完本章后，把前面每个“动手试试”串起来：

1. 给 HTML 第一课的博客页面加一个外部样式表，用 CSS 变量定义主色、间距与卡片背景；
2. 用 `.card` 类做一张带圆角与阴影的卡片（背景色用 `--card-bg`，不要与页面背景相同）；
3. 用 `@media (prefers-color-scheme: dark)` 做深色主题，只覆盖颜色变量；
4. 用 `color-mix()` 或 `filter: brightness()` 实现按钮悬停变暗（不要用 `darken()`）；
5. 用开发者工具验证优先级与盒模型，确保“三步急救”能解决你遇到的问题。

## 12. 核心知识点

> 一句话记住 CSS：选择器选中元素，`属性: 值` 改样式；外部 `<link>` 最常用，权重高者胜，后写覆盖先写。

- CSS 规则 = 选择器 + 声明块，声明以分号结尾；
- 三种主流引入方式：行内（最高优先级，不推荐）、内部（单页）、外部（生产标准）；
- 优先级：`!important` > 行内 > ID > 类 > 元素；权重相同就近原则；
- CSS 变量 `--name` + `var()` 实现设计令牌与主题切换；
- 相对单位（`rem`/`%`/`vw`）优于绝对单位（`px` 用于细节）；
- `@import` 阻塞渲染，用 `<link>` 代替。

## 13. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 滥用行内样式 | 无法复用、难以维护 | 抽取到类与外部样式表 |
| 依赖 `!important` | 破坏层叠，调试困难 | 检查权重与选择器结构 |
| 使用 `darken()` | 原生 CSS 不支持 | 用 `color-mix()`/`filter`/预定义变量 |
| 变量名无语义 | 维护者看不懂 | `--color-primary`/`--spacing-md` 等语义命名 |
| 大量 `@import` | 串行阻塞渲染 | 用 `<link>` 合并加载 |
| 不设卡片背景 | 与页面同色缺乏层次 | 单独定义 `--card-bg` 并适配深色 |

## 14. 扩展学习

- CSS 历史：CSS1（1996）→ CSS2（1998）→ CSS2.1（2011）→ CSS3 模块化（2012 起），了解即可；
- 选择器：`css/008-CSS3SelectorSystem` 系统掌握选择器；
- 盒模型：`css/004-CSS3BoxModelDetailed` 理解尺寸计算；
- 变量深入：`css/036-CSSVariableCustomAttribute` 作用域与动态主题；
- 响应式：`css/034-ResponsiveDesign` 与 `css/032-MediaQuery`；
- 工程化：`css/044-CSSArchitectureMethodology` 与 BEM 命名。
