---
order: 10
title: Astro 框架概述与文档站实践
module: 'astro'
category: 前端技术
difficulty: beginner
description: 从一篇加载缓慢的博客说起：认识 Astro 是什么、岛屿架构如何解决内容站的性能困境，以及 Astro 5/6 时代内容集合、路由、部署与文档站实践的全貌
author: fanquanpp
updated: '2026-08-03'
related:
  - 'vite/001-ViteOverview'
  - 'markdown/001-SyntaxGuide'
  - 'tailwind/001-TailwindOverview'
prerequisites:
  - 'markdown/001-SyntaxGuide'
---

## 前置知识

- 具备本模块学习路径中前置文档的基础知识

## 学习目标

- 掌握「0. 从一个真实的故事说起」的核心机制、典型用法与常见陷阱
- 掌握「1. 问题解剖：内容站的性能困境」的核心机制、典型用法与常见陷阱
- 掌握「2. Astro 是什么」的核心机制、典型用法与常见陷阱
- 掌握「3. 岛屿架构：用最少的 JS 换最多的交互」的核心机制、典型用法与常见陷阱
- 掌握「4. 项目结构：一本书的目录」的核心机制、典型用法与常见陷阱



## 0. 从一个真实的故事说起

2023 年，一位叫阿禾的博主运营着一个技术博客，每周更新两三篇文章，内容扎实，读者不少。但有一个问题一直困扰着他：**网站加载太慢**。读者在微信里转发他的文章链接，点开后要转圈 3 到 5 秒才能看到正文，很多人等不及就关掉了页面。

阿禾很困惑：自己的博客文章就是文字加少量图片，数据量并不大，为什么会这么慢？他打开浏览器开发者工具查看网络请求，发现罪魁祸首是一大坨 JavaScript 文件——他的博客框架（一个典型的单页应用 SPA）把整个网站的"程序逻辑"打包成了一个近 300KB 的脚本。浏览器必须先下载、解析、执行完这段脚本，才能把文章渲染出来。也就是说，读者为了看一篇 2KB 的纯文字文章，被迫先下载 300KB 的代码。

这个场景在 2026 年的今天依然每天都在发生。而它的解法，就是本模块要学习的框架：**Astro**。



> 本节为增量补充，帮助你选择 Astro 版本。

- Astro：6.x 为当前稳定版（6.0 于 2026-03 发布，6.2 为最新），要求 Node.js 22+。
- 6.x 重点：新开发服务器、字体 API、内置 CSP、实验性 Rust 编译器、Adapter API 重构。
- 新项目直接执行 `npm create astro@latest`，模板会安装当前稳定版。

## 1. 问题解剖：内容站的性能困境

### 1.1 先直观理解：读者要的只是"一本书"

把阿禾的博客想象成一家书店。读者走进书店，只想直接拿走一本已经印好的书翻看。可是 SPA 式的网站相当于一家"没有现货、全靠现场打印"的书店：读者要书，店员才启动一台复印机，现场把纸一张张打印、装订、再递给读者。复印机（JavaScript 引擎）启动得再快，也比不上直接从书架上拿书快。

绝大多数内容站（博客、文档站、新闻站、产品介绍页）的本质就是"卖书"——把已经写好的内容交给读者。这类网站 90% 的页面内容在发布时就已经是确定的了，根本不需要浏览器现场"计算"出来。

### 1.2 再讲原理：SPA 为什么"重"

传统单页应用（SPA，Single Page Application）的工作方式是：

第一，浏览器下载一个包含全部页面逻辑的 JavaScript 大包（bundle）；

第二，JavaScript 在浏览器里运行，动态创建 DOM 节点，把内容"画"到页面上；

第三，用户点击导航时，不重新请求页面，而是由 JavaScript 直接换掉页面内容。

这套机制对"交互密集型应用"（如在线表格、后台管理系统）非常合适，但对内容站来说是大炮打蚊子。以 FANDEX 文档站为例，一篇文章页面里真正需要 JavaScript 的交互只有：目录高亮、主题切换、站内搜索。这些交互可能只占页面内容的 5% 到 10%。

**为 10% 的交互，付出 100% 的 JavaScript 成本，显然不划算。**

### 1.3 换一种思路：像报社一样出版

Astro 换了一种思路，它的工作方式更像一家**报社**：

- 编辑（开发者）写文章时用各种工具排版；
- 印刷厂（Astro 构建器）在每天凌晨把全部文章**提前印成报纸**（纯 HTML 文件）；
- 读者订阅时，快递员（静态托管/CDN）直接送报纸，**不需要现场印刷**；
- 只有"填字游戏"这种需要动笔的内容，才在报纸上附一支笔（按需加载的小段 JavaScript）。

这正是本模块 002 到 005 各篇将要展开的机制。下面先给出整体认知。

## 2. Astro 是什么

### 2.1 官方定义与版本现状

Astro 是一个面向**内容驱动网站**（博客、文档站、营销页、电商展示页）的 Web 框架。它于 2021 年发布，核心理念是：**默认输出零 JavaScript 的静态 HTML，只有显式标记的交互组件才在浏览器加载脚本**。

截至 2026 年 8 月，Astro 的版本演进如下：

| 版本 | 时间 | 关键特性 |
| --- | --- | --- |
| Astro 1.x | 2022 年 | 岛屿架构、SSG 起步 |
| Astro 2.x | 2023 年 | 内容集合（Content Collections）、类型安全的 Markdown |
| Astro 3.x | 2023 年 | View Transitions 预览、图片优化 |
| Astro 4.x | 2023 年底 | 更快的构建、国际化（i18n）路由 |
| Astro 5.x | 2024 年 12 月 | **Content Layer**（统一内容加载）、**Server Islands**（服务器岛） |
| Astro 6.x | 2026 年 | **Live Content Collections**（实时内容集合）、Fonts API、CSP 支持、Rust 编译器、Advanced Routing 预览 |
| Astro 7.x | 2026 年 | 预览阶段，基于 6.x 演进 |

其中 Astro 5 引入的 Content Layer 把"内容集合"从只能读本地 Markdown 扩展为"可以从任何数据源加载"的统一 API；Astro 6 进一步推出 Live Content Collections，允许内容在**请求时实时拉取**而非仅构建时获取，非常适合内容频繁更新的场景。2026 年 1 月 Cloudflare 收购了 Astro 团队，框架保持 MIT 开源许可。

### 2.2 Astro 的三大核心能力

第一，**静态优先**：默认构建时输出纯 HTML，首屏不需要任何 JavaScript，加载极快，SEO 友好；

第二，**按需水合**：交互组件通过 `client:` 指令显式声明加载时机，浏览器只加载用得到的脚本；

第三，**框架无关**：同一个页面可以混合使用 React、Vue、Svelte、Solid 等框架组件，互不冲突。

### 2.3 一分钟看懂 Astro 长什么样

一个最简单的 Astro 页面：

```astro
---
// 三个横线之间是"组件脚本"，在构建期运行，不会发给浏览器
const siteName = 'FANDEX 文档站'
const today = new Date().toLocaleDateString('zh-CN')
---

<!-- 下面是模板，输出为静态 HTML -->
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{siteName}</title>
  </head>
  <body>
    <h1>欢迎来到 {siteName}</h1>
    <p>今天日期：{today}</p>
  </body>
</html>
```

运行 `npm run build` 后，`dist/` 目录里就是一个不包含任何 JavaScript 的完整 HTML 文件。这正是 Astro 与 React/Vue SPA 最本质的区别。

## 3. 岛屿架构：用最少的 JS 换最多的交互

### 3.1 岛屿是什么

"岛屿架构"（Islands Architecture）这个概念最早由 Etsy 的前端架构师 Katie Sylor-Miller 在 2019 年提出，2020 年由 Preact 作者 Jason Miller 系统化阐述，Astro 是第一个把"选择性水合"作为内置能力的框架。

想象一片大海：整张网页是"海"，默认情况下海面只漂浮着静态 HTML，轻快而平静。只有少数需要交互的区域，像是海上的岛屿——搜索框、图片轮播、点赞按钮——才单独加载自己的 JavaScript，成为"岛屿"。岛屿之间互相独立，互不干扰。

在 Astro 的术语中，岛屿有两种：

| 类型 | 说明 | 典型场景 |
| --- | --- | --- |
| Client Island（客户端岛） | 交互组件在浏览器端独立水合（hydration），与页面其余静态部分隔离 | 搜索框、轮播图、表单校验 |
| Server Island（服务器岛） | 组件在服务器端按需渲染动态内容，不影响页面整体静态输出 | 登录用户头像、实时库存、个性化推荐 |

### 3.2 看代码：client 指令

```astro
---
// src/pages/index.astro
import SearchBox from '../components/SearchBox.tsx'   // React 组件
import ThemeToggle from '../components/ThemeToggle.astro'
---

<!-- 页面其余部分都是纯静态 HTML，不加载任何脚本 -->

<SearchBox client:load />   <!-- 页面加载时立即水合 -->
<ThemeToggle client:visible /> <!-- 滚动到可见区域才水合 -->
```

讲解：

- 不加任何指令的组件，只输出服务端渲染好的 HTML，零脚本；
- `client:load`：页面一加载就下载并执行该组件脚本；
- `client:idle`：浏览器空闲时再加载（默认值）；
- `client:visible`：组件进入视口才加载；
- `client:only`：只在客户端渲染（如纯前端组件）；
- `client:media="(max-width: 640px)"`：满足媒体查询才加载。

水合（hydration）的意思是：组件在构建期已经把 HTML 渲染出来了，浏览器端再加载一小段脚本，给这些 HTML"接上"事件、状态和交互能力。这样首屏内容立即可见，交互功能随后补齐。

### 3.3 性能收益有多大

Astro 官方及社区 2026 年的实测数据（来源见文末链接）：

- 一个典型 Astro 5 内容页每页的客户端 JavaScript 为 0 至 15KB；同等内容的 Next.js 16 页面为 85 至 250KB；
- 66% 的真实 Astro 站点在 Core Web Vitals（核心网页指标）上表现良好，同期 WordPress 为 48%、Gatsby 为 47%、Next.js 为 30%、Nuxt 为 28%。

对内容站而言，"快"不是锦上添花，而是用户留存和搜索引擎排名的决定性因素。

## 4. 项目结构：一本书的目录

理解 Astro 项目结构，相当于看一本书的目录——每个目录都有明确分工：

```text
my-astro-site/
  src/                      # 源码目录
    pages/                  # 路由目录：每个 .astro / .md 文件对应一个页面
      index.astro           # 首页 /
      about.md              # /about
      blog/[slug].astro     # 动态路由，生成 /blog/xxx
    components/             # 组件目录（.astro、.jsx、.vue 等）
    layouts/                # 布局组件目录（页面骨架）
    content/                # 内容目录（内容集合的数据源，可选）
    styles/                 # 全局样式
    content.config.ts       # 内容集合配置文件（用到内容集合时创建）
  public/                   # 静态资源：favicon、robots.txt 等，原样拷贝
  astro.config.mjs          # Astro 配置文件
  package.json              # 依赖与脚本
  tsconfig.json             # TypeScript 配置
```

讲解：`src/pages` 是文件路由——`pages/about.md` 自动生成 `/about` 页面；`pages/blog/[slug].astro` 是动态路由，一个文件可以生成无数个文章页。本模块 003 篇会详细展开路由，005 篇展开内容集合。

## 5. 组件与页面

### 5.1 .astro 组件三段式

每个 `.astro` 文件由三部分组成：组件脚本（frontmatter）、组件模板、可选的作用域样式。

```astro
---
// 第一部分：组件脚本，构建期运行
import Layout from '../layouts/BaseLayout.astro'
const title = 'Astro 入门'

// 可以在这里 fetch 数据、读取文件系统、访问环境变量
const apiUrl = import.meta.env.PUBLIC_API_URL
---

<!-- 第二部分：组件模板，输出 HTML -->
<Layout pageTitle={title}>
  <h1>{title}</h1>
  <p>本文数据来源：{apiUrl}</p>
</Layout>

<style>
  /* 第三部分：组件样式，默认自动加作用域，只影响本组件 */
  h1 { color: #1e40af; }
</style>
```

关键点：frontmatter 中的代码**在构建期于服务端执行**，可以访问文件系统、网络、环境变量，但永远不会发送到浏览器；模板部分使用 `{表达式}` 输出变量值。

### 5.2 交互组件作为岛屿

```astro
---
// src/pages/docs/index.astro
import SearchBox from '../components/SearchBox.tsx'
import { Code } from 'astro/components'
---

<h1>文档中心</h1>

<!-- 交互组件：显式声明水合时机 -->
<SearchBox client:visible />

<!-- 内置组件：代码高亮，构建期生成，零脚本 -->
<Code code="console.log('hi')" lang="js" theme="github-dark" />
```

讲解：`<Code />` 是 Astro 内置组件，由 Shiki 在构建期完成高亮，用户看到的只是高亮后的 HTML，没有运行时成本。这就是"能构建期做的，绝不留到浏览器做"的哲学体现。

## 6. 内容集合：文档站的"数据库"

### 6.1 内容集合解决什么问题

内容站有大量结构相同的 Markdown 文档（如 2000+ 篇课程文档），每篇都有 title、order、description 等元数据。如果没有约束，字段写错、缺失要到渲染时才暴露。内容集合用 **schema（数据结构校验规则）** 在构建期就拦住这些问题：

```ts
// src/content.config.ts
import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const docs = defineCollection({
  // loader：声明内容从哪里来（这里是从磁盘读 Markdown）
  loader: glob({ pattern: '**/*.md', base: './cnt-content/full' }),
  // schema：声明 frontmatter 必须长什么样
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    order: z.number().default(0),
    updated: z.coerce.date().optional(),
    module: z.string(),
  }),
})

export const collections = { docs }
```

### 6.2 查询与渲染

```astro
---
// src/pages/docs/index.astro
import { getCollection } from 'astro:content'

// 查询全部文档，按 order 排序
const docs = (await getCollection('docs')).sort(
  (a, b) => a.data.order - b.data.order
)
---

<h1>课程目录</h1>
<ul>
  {docs.map((doc) => (
    <li>
      <a href={`/docs/${doc.id}/`}>{doc.data.title}</a>
      <span>{doc.data.description}</span>
    </li>
  ))}
</ul>
```

讲解：`getCollection` 返回带类型的条目数组，每条包含 `id`（由文件路径生成）、`data`（校验后的 frontmatter）与 `body`（正文）。schema 校验失败时构建直接报错并给出精确信息，从源头保证元数据质量。这是 FANDEX 文档站的基石。

## 7. 布局、样式与集成

### 7.1 布局组件

布局（Layout）是一种特殊的组件，用于提供页面骨架（head、导航、页脚）：

```astro
---
// src/layouts/BaseLayout.astro
interface Props {
  title: string
}
const { title } = Astro.props
---

<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <slot name="head" />  <!-- 具名插槽：页面可向 head 追加内容 -->
  </head>
  <body>
    <header>站点导航</header>
    <main>
      <slot />  <!-- 默认插槽：页面正文注入这里 -->
    </main>
    <footer>页脚</footer>
  </body>
</html>
```

### 7.2 样式方案

Astro 的样式体系覆盖四个层次：

第一，全局 CSS：在 `src/styles/` 引入，作用于全站；

第二，组件 scoped 样式：`<style>` 默认自动加作用域，互不污染；

第三，CSS Modules：`<style module>` 提供类名对象；

第四，集成 Tailwind：`npx astro add tailwind` 一键接入，FANDEX 文档站即采用 Tailwind。

### 7.3 常用官方集成

| 集成包 | 用途 |
| --- | --- |
| `@astrojs/react` / `@astrojs/vue` / `@astrojs/svelte` | 接入 UI 框架，构建交互岛屿 |
| `@astrojs/mdx` | 支持 MDX（Markdown 内嵌组件） |
| `@astrojs/sitemap` | 自动生成 sitemap.xml |
| `@astrojs/rss` | 生成 RSS 订阅源 |
| `@astrojs/cloudflare` / `@astrojs/netlify` / `@astrojs/vercel` | 部署适配器 |
| `@astrojs/tailwind` | Tailwind CSS 集成 |

## 8. 路由、SSR 与部署

### 8.1 静态与按需渲染

Astro 默认 `output: 'static'`，构建期生成全部页面，部署到任何静态托管即可。若需要按请求渲染的页面（如用户信息、实时数据），有两种方式：

- 在 `astro.config.mjs` 中配置 `output: 'server'` 全站启用 SSR（需配合适配器）；
- 更精细的做法：保持静态模式，在个别页面导出 `export const prerender = false`，只让该页面按需渲染。

文档站通常全部静态输出，个别页面（如搜索接口）按需渲染。

### 8.2 部署流水线

```bash
# 本地构建
npm run build

# 产物在 dist/ 目录，上传到任意静态托管即可
```

CI 中典型的做法是：`pnpm install && pnpm build`，然后把 `dist/` 上传到 GitHub Pages、Netlify、Vercel 或对象存储（OSS）。

## 9. 性能与 SEO

### 9.1 性能基线

- 零 JS 默认：HTML 直接可读，LCP（最大内容绘制）极快；
- 图片优化：`astro:assets` 的 `<Image />` 组件自动压缩、生成响应式尺寸、防布局偏移（CLS）；
- 资源内联：构建期内联关键 CSS 与字体，减少请求数；
- Astro 6 起 Sharp 成为默认图片处理引擎，开箱即用。

### 9.2 SEO 内置能力

- 语义化 HTML：默认输出可被搜索引擎直接解析；
- sitemap：`@astrojs/sitemap` 自动生成站点地图；
- RSS：`@astrojs/rss` 生成订阅源；
- 规范链接与 Open Graph：通过 frontmatter 与布局组件统一生成。

## 10. FANDEX 文档站实践

FANDEX 文档站的关键设计（即本模块所讲内容的综合应用）：

- 内容源：`cnt-content/full` 目录作为内容集合数据源，2000+ 篇 Markdown 文档；
- 元数据：frontmatter 统一规范（title、order、module、difficulty、related、prerequisites），由 schema 强制校验；
- 导航：按模块与 order 自动生成目录、面包屑与上一篇/下一篇；
- 检索：搜索组件作为岛屿按需加载，不拖慢首屏；
- 构建：`node scripts/build-stats.mjs && astro build`，CI 门禁包含构建检查与链接检查。

```mermaid
flowchart LR
    A["Markdown 文档"] --> B["内容集合 schema 校验"]
    B --> C["Astro 构建"]
    C --> D["静态 HTML 输出"]
    D --> E["交互岛屿（搜索/主题切换）"]
    E --> F["部署到静态托管"]
```

## 11. 常见错误与对策表

| 常见错误 | 报错/现象 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| 交互组件没写 `client:` 指令 | 页面渲染了但按钮点了没反应 | Astro 默认不水合任何组件，组件只是静态 HTML | 给交互组件加 `client:load` 或 `client:visible` |
| 在 frontmatter 里使用 `window` / `document` | 构建时报 `window is not defined` | frontmatter 在 Node 环境（构建期）执行，没有浏览器 API | 改用 `<script>` 标签、`client:only` 组件或条件判断 |
| 内容集合 schema 缺失 | 文档元数据错误到运行时才暴露 | 没有定义 schema 或 schema 过松 | 为每个集合定义完整 schema，构建期即校验 |
| 全站开启 SSR | 失去静态优势，性能下降、托管成本升高 | `output: 'server'` 导致所有页面按请求渲染 | 默认静态输出，个别页面用 `prerender = false` |
| 忽略构建产物分析 | 页面 JS 体积悄悄变大 | 交互组件越加越多，未检查水合成本 | 查看 `astro build` 报告，按报告调整 `client:` 指令 |
| 误以为 Astro 是 SPA | 页面切换整页刷新，体验"传统" | 对 Astro 的工作模式理解偏差 | 可选接入 View Transitions 获得 SPA 般的平滑过渡 |

## 13. 一句话记忆

**Astro 是"内容优先"的 Web 框架：默认零 JavaScript 输出静态 HTML，交互组件像大海中的岛屿一样按需加载，让内容站又快又省。**
