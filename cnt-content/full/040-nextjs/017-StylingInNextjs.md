---
order: 30
title: Next.js 样式方案
module: 'nextjs'
category: 前端技术
difficulty: beginner
description: 全局 CSS、CSS Modules 与 Tailwind 的组织与取舍，以及 CSS-in-JS 在服务器组件下的边界
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- 知识类别：Next.js（App Router）下的样式组织——全局样式、CSS Modules、Tailwind 与 CSS-in-JS。
- 解决什么问题：样式写在哪、怎么不互相污染、怎么和服务器/客户端组件边界共存；新项目选型与存量项目混用时的判断依据。
- 什么时候用到：新项目初始化定样式方案、接现成组件库、做主题换肤、排查"样式互相覆盖"或"styled-components 在服务器组件里报错"。
- 本篇只讲样式的组织方式；图片字体等资源优化见《静态资源与性能优化》，主题令牌与设计系统的思路见 006-css 模块。

## 0. 一句话理解

> Next.js 官方推荐的三层样式结构：真正全局的（重置、令牌、Tailwind 基础层）进根布局的全局 CSS；组件级样式用 Tailwind 工具类为主、CSS Modules 兜底；CSS-in-JS 库在 App Router 下必须包在客户端边界里——样式体系本身没有运行时开销才是首选。

## 1. 全局 CSS：只放"真正全局"的东西

```css
/* app/globals.css */
:root {
  --color-brand: #2563eb;
  --font-sans: var(--font-inter), system-ui, sans-serif;
}

body {
  margin: 0;
  font-family: var(--font-sans);
}
```

```tsx
// app/layout.tsx —— 根布局导入，作用于所有路由
import "./globals.css"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
```

**讲解：**

1. 全局 CSS 在根布局导入一次即可作用于全站；它适合放三样东西：样式重置（reset/normalize）、CSS 变量令牌（颜色/字体/间距）、以及 Tailwind 这类框架的基础层。
2. 官方文档明确提醒：全局样式不要用来写具体组件的样式。原因在 React 19 的样式表集成机制下，路由切换时样式表不会按路由卸载，两个页面各自在全局 CSS 里写 `.header` 会静默互相覆盖——这是"改了 A 页样式 B 页崩了"的最常见来源。
3. 易错点：任何组件文件里都能 import 全局 CSS（不止根布局），但顺序决定覆盖关系——生产构建会按 import 顺序合并 CSS 文件，所以"后 import 的赢"只在当前顺序下成立，跨文件调整 import 顺序就可能翻转样式。官方建议把全局样式的 import 收敛到根布局一处。

## 2. CSS Modules：类名自动隔离的组件样式

```css
/* app/dashboard/table.module.css */
.table {
  width: 100%;
  border-collapse: collapse;
}

.table th {
  background: var(--color-brand);
  color: white;
}
```

```tsx
// app/dashboard/page.tsx（服务器组件里直接用）
import styles from "./table.module.css"

export default function DashboardPage() {
  return (
    <table className={styles.table}>
      {/* ... */}
    </table>
  )
}
```

**讲解：**

1. `.module.css` 后缀是约定：构建器把文件里每个类名改写成"文件名_类名_随机哈希"的唯一名，`styles.table` 拿到的就是改写后的真实类名。两个模块文件里都叫 `.table`，最终 DOM 上也是两个不同类名——隔离是构建器给的，不是约定俗成的命名规范给的。
2. CSS Modules 在服务器组件中直接可用：它只是构建期类名替换 + 样式注入，没有任何运行时。这是它和 CSS-in-JS 的本质区别。
3. 组合既有类用 `composes`；动态值不要往 CSS Modules 里塞（它没有插值能力），动态部分交给行内 `style` 或 CSS 变量：`<div style={{ "--offset": offset }}>配合 var(--offset)`。
4. 易错点：`styles` 是对象，取不存在的键得到 `undefined`，React 会静默忽略 className 里的 undefined——样式"没生效"先打印 `styles` 看键名，别急着怀疑构建。

## 3. Tailwind：脚手架默认，工具类为主线

`create-next-app --tailwind`（见《Next.js 16 快速上手》第 1 节）装好的 Tailwind v4 接法只有两处：

```js
// postcss.config.mjs
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
}
```

```css
/* app/globals.css */
@import "tailwindcss";
```

```tsx
export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold">Welcome to Next.js!</h1>
    </main>
  )
}
```

**讲解：**

1. Tailwind v4 与 v3 的接入方式不同：v4 不再要 `tailwind.config.js` 与 `@tailwind` 三连指令，一个 PostCSS 插件加一行 `@import` 即可；需要兼容老浏览器时官方保留 v3 接法文档。
2. 工具类写进 `className`，组件本身仍是普通组件——服务器组件里用 Tailwind 完全没有边界问题，这是官方把 Tailwind 列为首选样式的核心原因之一。
3. 生产构建会按路由拆分并压缩 CSS，页面只加载它用到的规则；开发时配合 Fast Refresh 即时生效。注意开发与生产的 CSS 合并顺序可能有差异，上线前用 `next build` 验证一次最终样式。
4. 官方推荐的位置感：Tailwind 覆盖大部分场景；Tailwind 表达不了的复杂选择器/状态（如深层子元素、伪元素组合）用 CSS Modules；两者可以共存于同一组件。

## 4. CSS-in-JS：为什么必须包客户端边界

```tsx
// components/themed-card.tsx
"use client"   // 没有这一行，styled-components 直接在服务器组件里报错

import styled from "styled-components"

const Card = styled.div`
  border: 1px solid var(--color-brand);
  padding: 16px;
`

export function ThemedCard({ children }: { children: React.ReactNode }) {
  return <Card>{children}</Card>
}
```

```tsx
// app/page.tsx —— 服务器组件引用客户端样式组件
import { ThemedCard } from "@/components/themed-card"

export default function Page() {
  return <ThemedCard>你好</ThemedCard>
}
```

**讲解：**

1. styled-components 这类库的工作原理是"组件渲染时在 JS 运行时里生成样式并插进 `<style>` 标签"。服务器组件不做 hydration、没有浏览器运行时，无法执行这套逻辑，所以官方文档明确：CSS-in-JS 库在 App Router 下需要标记 `"use client"`，由客户端渲染这些组件。
2. 后果与代价：样式组件一旦标了 `"use client"`，它的 children 仍可以是服务器组件传进来的（children 作为 props 穿边界），但组件自身的样式逻辑进入了客户端 bundle——这正是 RSC 世界里 CSS-in-JS 使用率下降的原因：为样式付出运行时体积，不如 Tailwind/CSS Modules 的零运行时方案。
3. 两种务实姿势：a) 新代码优先 Tailwind + CSS Modules；b) 存量 styled-components 项目渐进迁移——把带样式的叶子组件收进客户端边界，页面骨架保持服务器组件，不要因为样式问题把整个页面改成 `"use client"`。
4. 易错点：`"use client"` 边界上的样式组件丢失服务器端数据获取能力。若一个 styled 组件需要取数，正确结构是"服务器组件取数 -> 把数据作为 props 传给客户端样式组件"，而不是让样式组件自己取。

## 5. 三个真实场景

**场景一：营销页主题色改造。** 市场部要求品牌主色从蓝换成橙，且大促期间一键切换。原型代码里颜色硬编码在三十多个组件的 Tailwind 类里（`bg-blue-600`）。改造方案：全局 CSS 定义 `--color-brand` 令牌，`tailwind` 侧用 v4 的 `@theme` 把令牌映射成工具类，组件统一用 `bg-brand` 这类语义类名；大促切换只需在根布局换一组 CSS 变量。教训：主题色从第一天就该是变量，工具类里写具体色值等于把设计决策撒进每个文件。

**场景二：后台管理表格的样式隔离。** 老后台把 jQuery 时代的 `table.css`（`.table { border: ... }`）全局引入后，新做的官网落地页表格样式全乱——全局 `.table` 类被两边互相覆盖。修复：把表格样式改写为 `data-table.module.css`，类名构建期自动加哈希，两边互不感知；全局 CSS 只保留 reset。这类"类名泄漏"事故在多人协作的全局 CSS 里必然发生，CSS Modules 的价值就在这里。

**场景三：把现成 Tailwind 组件库接进 App Router。** 团队选定 shadcn/ui（基于 Tailwind + Radix 的复制式组件库）。接入三步：按库文档初始化（本质是写入令牌到 globals.css + 安装依赖）；复制需要的组件源码进 `components/`；在服务器组件页面里直接使用纯展示组件。注意点：库中依赖浏览器 API 的复合组件（Dialog、Dropdown）自带客户端标记，按第 4 节的边界规则使用即可；不要把整个组件库做成一个 `"use client"` 的大出口。

## 6. 动手实践

**任务一：把全局样式收拾干净。** 找一个（或造一个）在全局 CSS 里写了组件级类名的项目，把组件样式迁移到 CSS Modules，保留 reset 与令牌在全局。验证方式：路由 A、B 各有一个同名类名的组件，切换时互不影响。提示：迁移时先 grep 全局 CSS 里所有类名，逐个确认消费方，防止漏改。

**任务二：体验 styled-components 的边界报错。** 新建一个不写 `"use client"` 的 styled 组件并在服务器组件页面里使用，读一遍报错信息；加上 `"use client"` 修复，再把页面骨架的重心移回服务器组件（数据在服务器取、样式组件只管渲染）。提示：报错的关键词是事件处理器/浏览器 API 在服务器组件中不可用，与样式无关的错误经常从这里连锁出现。

**任务三：语义令牌替换硬编码色值。** 把一个页面里所有具体色值的 Tailwind 类（如 `bg-blue-600`）替换为基于 CSS 变量的语义类（如 `bg-brand`），并实现一个"暗色模式"开关切换令牌值。提示：Tailwind v4 用 `@theme` 定义令牌映射；开关只需切换根元素上的 class 或 data 属性，不必重渲染组件树。

先自己操作，再对照参考实现：

<details>
<summary>任务三参考实现</summary>

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-brand: #2563eb;        /* 语义令牌：亮色默认值 */
}

:root[data-theme="dark"] {
  --color-brand: #f59e0b;        /* 暗色下品牌色换档 */
}
```

```tsx
// app/theme-switcher.tsx
"use client"

export function ThemeSwitcher() {
  return (
    <button
      className="rounded bg-brand px-3 py-1 text-white"
      onClick={() => {
        const root = document.documentElement
        root.dataset.theme = root.dataset.theme === "dark" ? "" : "dark"
      }}
    >
      切换主题
    </button>
  )
}
```

要点：a) `@theme` 里定义的 `--color-brand` 会生成 `bg-brand` 工具类；b) 切换只改 `data-theme` 属性，颜色变化由 CSS 变量级联完成——按钮重渲染与否不影响其他组件；c) 服务器组件页面里直接放 `<ThemeSwitcher />`，边界只包这一个按钮。
</details>

## 7. 一句话记住

> 全局 CSS 只放重置与令牌；组件样式首选 Tailwind 工具类，复杂选择器用 CSS Modules；CSS-in-JS 在 App Router 下必须 `"use client"` 且付出运行时代价——新项目没有理由把它当默认。

## 参考与致谢

- Next.js 官方文档 CSS 章节（Global CSS / CSS Modules / Tailwind / Ordering and Merging）与 CSS-in-JS 指南，来源：https://nextjs.org/docs/app/getting-started/css ，许可证 CC BY 4.0。本文接入代码形态与"样式表不随路由卸载"等注意事项依据 16 版官方文档整理。
