---
order: 60
title: Tailwind CSS 响应式与暗色模式
module: 'tailwind'
category: 前端技术
difficulty: intermediate
description: 'Tailwind CSS 响应式与暗色模式原理篇：从移动优先断点与 prefers-color-scheme 媒体查询讲起，掌握 sm:/md:/lg: 前缀、dark: 变体与 @custom-variant 策略切换'
author: fanquanpp
updated: '2026-09-12'
related:
  - 'tailwind/040-LayoutFlexGrid'
  - 'tailwind/050-ThemeCustomization'
prerequisites:
  - 'tailwind/030-UtilityCore'
---


## 0. 先打个比方：给"变形金刚"准备多套衣服

你有没有想过，变形金刚为什么能同时适应汽车和机器人两种形态？因为它有一套"变形逻辑"：**根据当前环境，决定展示哪套外观**。

网页也面临同样的问题：同一份内容，要在手机（375px 宽）、平板（768px 宽）、电脑（1440px 宽）上都能正常阅读。更麻烦的是，同一个用户可能白天用亮色界面、晚上用暗色界面。响应式设计和暗色模式，就是网页的"变形逻辑"。

Tailwind CSS 用一套非常聪明的语法解决了这个问题：**把"变形条件"（视口宽度、系统明暗偏好）写成类名前缀**，比如 `md:grid-cols-2` 表示"当屏幕达到平板宽度时变成两列"，`dark:bg-gray-900` 表示"当系统处于暗色偏好时换成深色背景"。

本篇文章采用**原理驱动**的讲法：先搞懂响应式和暗色模式背后的 CSS 原理，再学习 Tailwind 的语法糖，最后看代码。原理清楚了，再复杂的布局你都能自己推理出来。

## 1. 响应式原理：从媒体查询说起

### 1.1 直观理解：一道"宽度闸门"

响应式的本质，是 CSS 的**媒体查询（Media Query）**。它就像一道"宽度闸门"：当浏览器窗口宽度达到某个值，闸门打开，闸门内的样式才生效。

```css
/* 原生 CSS：当视口宽度 ≥ 768px 时，.card 变成两列布局 */
@media (min-width: 768px) {
  .card { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
```

### 1.2 移动优先：从最窄开始写

Tailwind 采用**移动优先（mobile-first）**策略，理解这一点是掌握响应式的关键：

- **不加前缀的类**（如 `grid-cols-1`）：默认作用于所有屏幕，包括手机；
- **带前缀的类**（如 `md:grid-cols-2`）：仅在视口"达到该宽度及以上"时生效。

就像变形金刚默认是"汽车形态"（手机最常用），只有满足条件才切换成其他形态。这种策略的工程理由是：手机端是流量大头，且"从窄到宽逐级增强"的思维比"从宽到窄逐步降级"更容易维护。

```html
<!-- 移动优先示例：默认 1 列，平板 2 列，桌面 4 列 -->
<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
  <div>卡片 1</div>
  <div>卡片 2</div>
  <div>卡片 3</div>
  <div>卡片 4</div>
</div>
```

### 1.3 原理：编译后的 CSS 长什么样

上面的写法，Tailwind 会编译成下面这段原生 CSS——**每一个前缀类都被包进对应的 `@media (min-width: ...)` 媒体查询里**：

```css
.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }

/* md: 前缀的类被包进 768px 闸门 */
@media (min-width: 768px) {
  .md\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

/* lg: 前缀的类被包进 1024px 闸门 */
@media (min-width: 1024px) {
  .lg\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
```

看懂这段编译结果，你就明白了响应式的全部真相：**断点前缀不过是一个"自动包裹媒体查询"的语法糖**，类名之间互不干扰，浏览器自己根据当前视口宽度决定哪些媒体查询内的规则生效。

## 2. 断点体系：默认的五档宽度

Tailwind 4 内置五档断点（在 `@theme` 中以 `--breakpoint-*` 变量存在，可自定义）：

| 前缀 | 最小宽度 | 对应媒体查询 | 典型设备 |
| --- | --- | --- | --- |
| （无前缀） | 0 | 无 | 手机 |
| `sm:` | 640px（40rem） | `@media (width >= 640px)` | 大屏手机 / 小平板 |
| `md:` | 768px（48rem） | `@media (width >= 768px)` | 平板 |
| `lg:` | 1024px（64rem） | `@media (width >= 1024px)` | 笔记本 |
| `xl:` | 1280px（80rem） | `@media (width >= 1280px)` | 桌面显示器 |
| `2xl:` | 1536px（96rem） | `@media (width >= 1536px)` | 大屏显示器 |

注意：Tailwind 4 编译输出的媒体查询写法是 `@media (width >= 768px)` 这种新式语法，与传统 `@media (min-width: 768px)` 等价，语义更直观。旧浏览器会自动被工具降级处理。

### 2.1 自定义断点

断点也是设计令牌，在 `@theme` 中修改即可（承接上一篇的主题定制知识）：

```css
@theme {
  /* 覆盖默认断点：把 sm 从 640px 改为 560px */
  --breakpoint-sm: 560px;

  /* 新增断点：自动生成 3xl: 前缀 */
  --breakpoint-3xl: 1920px;
}
```

```html
<div class="grid grid-cols-1 3xl:grid-cols-4">超大屏 4 列</div>
```

### 2.2 任意断点 min-[...]

当预设断点都不合适时，用任意值语法精确控制（生成 `@media (width >= 880px)`）：

```html
<div class="grid grid-cols-1 min-[880px]:grid-cols-3">
  当视口宽度 ≥ 880px 时变为三列
</div>
```

> 建议：任意断点适合"设计稿刚好在非标准宽度断列"的一次性场景，但应控制数量，否则断点碎片化会严重增加维护成本。

## 3. 移动优先的思维模式：先写"地板"，再铺"台阶"

响应式布局的推荐写法遵循"**渐进增强**"原则——先保证手机端可用，再逐档增强：

```html
<!-- 先写手机端（基础样式），再逐级增强 -->
<h1 class="text-2xl sm:text-3xl md:text-4xl font-bold">
  响应式标题：手机 2xl，平板 3xl，桌面 4xl
</h1>

<section class="py-8 md:py-12 lg:py-16 px-4 md:px-8">
  响应式内边距
</section>
```

也可以反向理解"不要做什么"：不要写 `lg:text-lg md:text-base text-sm` 这种"从大往小降级"的排列，它会让人难以判断基础样式是什么。**基础样式（无前缀）永远在最前，增强样式按断点从小到大排列。**

## 4. 暗色模式原理：prefers-color-scheme

### 4.1 直观理解：系统的一道"明暗闸门"

和媒体查询一样，CSS 原生就支持按用户的系统明暗偏好来切换样式，靠的是 `prefers-color-scheme` 媒体特性：

```css
/* 原生 CSS：系统处于暗色偏好时，页面换深色背景 */
@media (prefers-color-scheme: dark) {
  body { background-color: #111827; color: #f3f4f6; }
}
```

这就像变形金刚感知到"天黑自动切换夜行形态"。用户不需要在网页上做任何操作——**操作系统设置成深色模式，网页自动变暗**。

### 4.2 dark: 变体：Tailwind 的暗色语法糖

Tailwind 4 把这道"明暗闸门"封装成 `dark:` 前缀。**无需任何配置，开箱即用**：

```html
<div class="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
  亮色下白底黑字，暗色下黑底白字
</div>
```

原理和断点完全一样：`dark:bg-gray-900` 会被编译成 `@media (prefers-color-scheme: dark) { .dark\:bg-gray-900 { ... } }`。

### 4.3 与主题令牌配合的推荐写法

结合上一篇的主题定制，把亮/暗两套取值定义为语义令牌，`dark:` 负责切换，避免组件里散落大量颜色值：

```css
@theme {
  --color-surface: #ffffff;
  --color-surface-dark: #141414;
  --color-text-main: #1f1f1f;
  --color-text-dark: #e5e5e5;
}
```

```html
<div class="bg-surface text-text-main dark:bg-surface-dark dark:text-text-dark">
  语义令牌 + dark 变体：主题更可控
</div>
```

## 5. class 策略：让用户手动切换主题

### 5.1 为什么需要 class 策略

系统策略（跟随系统偏好）适合"开箱即用"，但真实产品通常还要提供"**用户手动切换**"的功能——用户可能想在系统亮色时把网站调成暗色。这时 `prefers-color-scheme` 就不够用了，我们需要用 class 策略：**由 JS 在 `<html>` 元素上挂一个 `.dark` 类，`dark:` 变体检测这个类是否存在**。

### 5.2 原理：@custom-variant 重新定义 dark

Tailwind 4 用 `@custom-variant` 指令重新定义 `dark:` 变体的匹配条件：

```css
/* src/styles/global.css */
@import "tailwindcss";

/* 重新定义 dark 变体：当祖先元素存在 .dark 类时生效 */
@custom-variant dark (&:where(.dark, .dark *));
```

```html
<html class="dark">
  <body class="bg-white dark:bg-gray-900">内容</body>
</html>
```

`&:where(.dark, .dark *)` 是 CSS 选择器语法：`&` 代表当前元素，`.dark` 代表"元素自身或祖先有 `.dark` 类"，`.dark *` 代表"`.dark` 的后代元素"。合起来就是：**只要祖先树里出现 `.dark`，`dark:` 样式就生效**。`@where` 的选择器优先级恒为 0，保证不会干扰其他样式规则。

### 5.3 JS 切换 + 持久化

```js
// theme-toggle.js —— 手动切换主题
function toggleTheme() {
  document.documentElement.classList.toggle('dark')
}
```

进阶：配合 `localStorage` 持久化 + `matchMedia` 检测系统偏好，实现"跟随系统 + 手动覆盖"三态切换：

```js
// theme-manager.js —— 支持"亮色 / 暗色 / 跟随系统"三态
function applyTheme(theme) {
  const root = document.documentElement
  if (theme === 'system') {
    // 未显式设置时，跟随系统偏好
    localStorage.removeItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  } else {
    localStorage.setItem('theme', theme)
    root.classList.toggle('dark', theme === 'dark')
  }
}
// 建议在 <head> 内联执行一次，避免页面加载时"闪白/闪黑"（FOUC）
```

### 5.4 data 属性策略

不想用 `.dark` 类？也可以改用 `data-theme` 属性，把 `@custom-variant` 的匹配条件换成属性选择器：

```css
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
```

```html
<html data-theme="dark">
  <body class="bg-white dark:bg-black">内容</body>
</html>
```

两种策略只是选择器不同，原理完全一致，按团队习惯选择即可。

## 6. 响应式与暗色的组合：变体叠加

### 6.1 变体可以任意叠加

Tailwind 的变体（断点前缀、状态前缀、暗色前缀）可以像积木一样叠加，顺序自由，语义从右往左读：

```html
<button class="bg-blue-600 px-4 py-2 text-white rounded-md
               hover:bg-blue-700
               dark:bg-blue-500 dark:hover:bg-blue-400
               md:px-6">
  叠加变体的按钮
</button>
```

- `dark:hover:bg-blue-400`：暗色模式下悬停时变亮蓝；
- `md:px-6`：桌面端加大内边距。

编译结果会生成 `@media (prefers-color-scheme: dark)` 内的 `:hover` 规则、`@media (width >= 768px)` 内的规则，各归其位、互不干扰。

### 6.2 典型示例：响应式导航栏

导航栏是响应式 + 暗色的经典组合场景：

```html
<nav class="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900">
  <a href="/" class="font-bold dark:text-white">Logo</a>

  <!-- 移动端隐藏、桌面端显示的菜单 -->
  <ul class="hidden md:flex gap-6">
    <li><a class="dark:text-gray-300" href="/docs">文档</a></li>
    <li><a class="dark:text-gray-300" href="/blog">博客</a></li>
  </ul>

  <!-- 仅移动端显示的菜单按钮（反向控制） -->
  <button class="md:hidden">菜单按钮</button>
</nav>
```

两个关键模式：
- `hidden md:flex`：默认隐藏，平板及以上显示（渐进增强）；
- `md:hidden`：默认显示，平板及以上隐藏（反向控制）。

## 7. 常见错误与对策

| 常见错误 | 报错 / 现象 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| 只写了 `md:grid-cols-2` 没写基础类 | 手机上永远是默认布局 | 无前缀类才是基础样式，前缀类只在对应宽度生效 | 先写无前缀基础类（如 `grid-cols-1`），再写增强类 |
| 断点类顺序写反（`lg:... md:...` 从大到小） | 行为诡异、难以排查 | 移动优先要求从小到大排列，保证代码可读 | 基础类在前，断点从小到大 |
| 想用 class 策略但没写 `@custom-variant` | `dark:` 一直跟随系统，JS 切类无效 | 默认策略是 `prefers-color-scheme`，不是 class | 在 CSS 中加入 `@custom-variant dark (&:where(.dark, .dark *))` |
| `dark:` 写在没有祖先 `.dark` 的元素上 | 暗色样式不生效 | class 策略要求 `.dark` 在元素祖先链上 | 把 `.dark` 加到 `<html>` 上（`document.documentElement`） |
| 拼接动态类名 `bg-${color}-500` | 样式缺失 | 内容扫描只识别完整类名，无法解析拼接 | 使用完整类名，或用映射表（如 `const map = { red: 'bg-red-500' }`） |
| 深色模式下忘记处理图片/阴影 | 图片过亮、阴影突兀 | `dark:` 只覆盖显式书写的类 | 给图片加 `dark:opacity-80`、阴影换 `dark:shadow-none` 等 |

## 8. 一句话记忆

**响应式 = "移动优先"断点闸门（`sm:`/`md:`/`lg:` 只是自动包一层媒体查询）；暗色 = `dark:` 变体（默认听系统，`@custom-variant` 后听 `.dark` 类）；二者都是"环境条件 + 类名前缀"的语法糖。**
