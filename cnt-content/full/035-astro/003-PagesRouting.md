---
order: 30
title: Astro 页面与路由
module: 'astro'
category: 前端技术
difficulty: beginner
description: 以城市路牌为线索讲解 Astro 文件路由：静态路由、动态路由 [slug]、多级与 Rest 参数、嵌套路由、404、重定向与布局
author: fanquanpp
updated: '2026-09-08'
related:
  - 'astro/004-ComponentsProps'
  - 'astro/005-ContentCollections'
prerequisites:
  - 'astro/002-QuickStartProject'
---


## 0. 城市道路与路牌：理解路由的第一把钥匙

想象你站在一座陌生的城市里。这座城市的路网设计有一个奇特的规定：**每条街道的名字，就是这条街上唯一的门牌**。

- 你走在"中山路"，想去"图书馆"，只要沿路寻找"图书馆"字样的门牌即可；
- 每条街只有一块"整街名牌"（首页），而街上的每家店铺都按门牌编号排列（文章页、详情页）；
- 如果一座大楼里有多个楼层、多个房间，门牌就会写成"中山路 12 号 3 层 05 室"这样的多级地址；
- 如果城市改造把"旧街"并入了"新街"，市政部门会在旧街口立一块告示："本街已并入新街，请前往"——这就是重定向（Redirect）。

Astro 的**文件路由**（File-based Routing）与这套路牌逻辑完全一致：`src/pages/` 目录就是"城市道路"，目录里的每个文件就是"门牌"——**文件在目录里的路径，决定了它在网站上的 URL 地址**。你不需要维护任何"路由表"，放一个文件，就多一个页面。

## 1. 文件路由的原理

### 1.1 先直观理解

把 `src/pages/` 想象成"城市地图"，规则只有三条：

第一，`.astro`、`.md`、`.mdx`、`.html` 文件放在 `src/pages/` 下，自动变成网站页面；

第二，文件路径 = URL 路径：`src/pages/about.astro` 就是 `/about`；

第三，`index.astro` 是一个特殊名字：它代表"这条街的入口"，即目录的默认页。

### 1.2 再讲原理

Astro 构建器在构建期扫描 `src/pages/` 下的全部文件，把每个文件映射为一个路由对象。静态模式下，这些路由在构建时全部生成 HTML 文件输出到 `dist/`。整个过程不需要你注册任何配置，所以官方文档说："Astro 项目没有独立的路由配置。"

页面之间跳转使用**标准 HTML 的 `<a>` 链接**即可——Astro 刻意不提供类似 Next.js 的 `<Link>` 组件，因为对内容站来说，浏览器原生的链接就是最好的选择。

```astro
---
// src/pages/index.astro
---
<nav>
  <a href="/">首页</a>
  <a href="/about">关于</a>
  <a href="/blog">博客</a>
  <a href="/docs/getting-started">文档</a>
</nav>
```

注意：链接路径以 `/` 开头表示"站点根路径"。如果站点部署在子路径（例如 GitHub Pages 的 `https://user.github.io/repo/`），需要在 `astro.config.mjs` 中配置 `base: '/repo/'`，并把所有链接写成 `/repo/about` 的形式。

## 2. 静态路由：固定的路牌

### 2.1 路由映射规则表

`src/pages/` 目录下的文件与 URL 的对应关系：

| 文件路径（src/pages/ 下） | 生成的 URL |
| --- | --- |
| `index.astro` | `/` |
| `about.astro` | `/about` |
| `blog/index.astro` | `/blog` |
| `blog/post.md` | `/blog/post` |
| `docs/guide/getting-started.md` | `/docs/guide/getting-started` |
| `404.astro` | `/404`（特殊错误页） |

讲解：`index.astro` 是目录入口页；其余文件名直接对应路径段。Markdown 文件（`.md`）也能直接成为页面——正文写在 Markdown 里，frontmatter 中的 `title` 等字段自动成为页面元数据。URL 末尾是否带 `/` 取决于部署平台，一般无需关心。

### 2.2 一个纯 Markdown 的页面

```md
---
title: 关于本站
description: FANDEX 学习平台简介
---
# 关于本站

FANDEX 是一个面向零基础中文学习者的编程学习平台。
```

保存为 `src/pages/about.md` 后，访问 `/about` 即可看到渲染后的页面。这就是内容站"写 Markdown 即出页面"的体验。

## 3. 动态路由：带参数的路牌 [slug]

### 3.1 先直观理解

内容站经常有大量结构相同的页面：100 篇博客文章、2000 篇课程文档。总不能为每一篇都手动建一个文件吧？动态路由就是解决办法：**用方括号 `[xxx]` 在文件名里开一个"参数位"**，一个文件生成无数个页面，就像"中山路每家店铺的门牌都是『中山路 + 编号』"。

### 3.2 再看代码

```astro
---
// src/pages/blog/[slug].astro
// 静态模式下，动态路由必须导出 getStaticPaths，声明要生成哪些页面

export async function getStaticPaths() {
  // 模拟博客文章数据（实战中通常来自内容集合，见 005 篇）
  const posts = [
    { slug: 'hello', title: '你好，世界' },
    { slug: 'astro-guide', title: 'Astro 入门指南' },
    { slug: 'islands', title: '岛屿架构详解' },
  ]

  // 返回数组：每一项生成一个页面
  return posts.map((post) => ({
    params: { slug: post.slug },   // params：路由参数，键名必须与 [slug] 一致
    props: { title: post.title },  // props：传给页面的任意数据
  }))
}

const { slug } = Astro.params   // 当前路由的参数
const { title } = Astro.props   // getStaticPaths 传入的数据
---

<h1>{title}</h1>
<p>当前文章路径：/blog/{slug}</p>
```

讲解：这个文件会一次性生成 `/blog/hello`、`/blog/astro-guide`、`/blog/islands` 三个静态页面。`Astro.params` 读取 URL 里的参数；`Astro.props` 读取 `getStaticPaths` 传给页面的数据。

### 3.3 getStaticPaths 返回值的字段

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `params` | 是 | 路由参数对象，键必须与文件名中的 `[占位符]` 一一对应，值为字符串 |
| `props` | 否 | 传给页面的任意数据，模板中通过 `Astro.props` 访问 |

关键理解：静态模式下，`getStaticPaths` 在**构建期**执行，声明"这个动态路由要生成哪些页面"。漏掉的参数组合不会生成页面。这正是"内容规模可枚举"的静态站的正确打开方式。

## 4. 多级参数与 Rest 参数：更复杂的门牌

### 4.1 多级动态参数

URL 可以有多个路径段参数，例如国际化文档站：

```text
src/pages/docs/[lang]/[chapter].astro
  -> 生成 /docs/zh/intro
  -> 生成 /docs/en/setup
```

此时 `getStaticPaths` 中的 `params` 必须同时提供 `lang` 和 `chapter` 两个键：

```astro
---
// src/pages/docs/[lang]/[chapter].astro
export function getStaticPaths() {
  return [
    { params: { lang: 'zh', chapter: 'intro' } },
    { params: { lang: 'en', chapter: 'setup' } },
  ]
}

const { lang, chapter } = Astro.params
---

<p>语言：{lang}，章节：{chapter}</p>
```

### 4.2 Rest 参数 [...path]：通配门牌

当路径层级不确定（比如文档可能嵌套多级子目录）时，用 `[...path]` 匹配"剩余的所有路径段"：

```astro
---
// src/pages/docs/[...path].astro
export function getStaticPaths() {
  return [
    { params: { path: 'getting-started' } },  // /docs/getting-started
    { params: { path: 'guides/deploy' } },    // /docs/guides/deploy
    { params: { path: 'guides/deploy/vercel' } }, // 任意深度都行
    { params: { path: undefined } },          // 匹配 /docs 本身
  ]
}

const { path } = Astro.params
---

<!-- path 可能是字符串、字符串数组或 undefined -->
<p>文档路径：{path ?? '文档首页'}</p>
```

讲解：`[...path]` 是"兜底"参数，一个文件覆盖该目录下所有未匹配的路径。常见应用：文档站把所有章节统一渲染到同一模板，配合内容集合查询对应文档（见 005 篇）。

### 4.3 路由优先级

当静态路由与动态路由可能冲突时（如同时存在 `about.astro` 与 `[slug].astro`），Astro 有固定的优先级规则：**静态路由优先于动态路由**，`[param]` 优先于 `[...rest]`。也就是说，`/about` 永远命中 `about.astro`，不会被 `[slug].astro` 抢走。

## 5. 嵌套路由：目录即层级

### 5.1 用文件夹组织层级

文件路由天然支持嵌套——`src/pages/` 下的子目录就是 URL 的层级：

```text
src/pages/
  index.astro                  ->  /
  products/
    index.astro                ->  /products
    categories/
      [category].astro         ->  /products/categories/electronics
    [id].astro                 ->  /products/123
```

讲解：嵌套目录让 URL 结构清晰、有语义，也方便团队按功能划分代码。`products/index.astro` 是 `/products` 的入口页，`products/[id].astro` 为每个产品生成详情页。

### 5.2 实战：文档站目录 + 详情页

一个典型的文档站路由结构：

```text
src/pages/
  index.astro              # 首页
  docs/
    index.astro            # 文档列表
    [slug].astro           # 单篇文档详情
  404.astro                # 错误页
```

`docs/[slug].astro` 配合内容集合即可实现"一篇文档一个页面"（完整代码见第 8 节）。

## 6. 布局 Layout：统一的门面

### 6.1 布局组件与插槽

每个页面都写一遍 `<html>`、`<head>`、导航、页脚太重复。解决方案是布局组件：把公共骨架抽出来，用 `<slot />`（插槽）留出"内容注入点"。

```astro
---
// src/layouts/BaseLayout.astro
interface Props {
  title: string
  description?: string
}
const { title, description = 'FANDEX 文档站' } = Astro.props
---

<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <slot name="head" />  <!-- 具名插槽：页面可向 head 追加内容 -->
  </head>
  <body>
    <header>
      <nav>
        <a href="/">首页</a>
        <a href="/docs">文档</a>
      </nav>
    </header>
    <main>
      <slot />  <!-- 默认插槽：页面正文注入这里 -->
    </main>
    <footer>© 2026 FANDEX</footer>
  </body>
</html>
```

### 6.2 页面使用布局

```astro
---
// src/pages/about.astro
import BaseLayout from '../layouts/BaseLayout.astro'
---

<BaseLayout title="关于我们">
  <h1>关于我们</h1>
  <p>这是一个使用布局组件的页面。</p>

  <!-- 向 head 区域追加内容：通过 slot="head" 属性 -->
  <meta slot="head" name="og:type" content="website" />
</BaseLayout>
```

讲解：页面只需关心自身内容，通过 Props 传 `title`，通过默认插槽提供正文。全站结构统一、样式一致，这是内容站组织页面的标准做法。Props 与插槽的底层机制在 004 篇详述。

## 7. 特殊页面与重定向

### 7.1 404 页面

```astro
---
// src/pages/404.astro
const pageTitle = '页面不存在'
---

<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{pageTitle}</title>
  </head>
  <body>
    <h1>404：页面不存在</h1>
    <p>你访问的页面可能已被移动或删除。</p>
    <a href="/">返回首页</a>
  </body>
</html>
```

讲解：`404.astro` 是 Astro 的保留路由名，自动成为全站错误页。静态托管平台与 SSR 服务器都会在找不到路由时返回它。404 页面也可以像普通页面一样使用布局组件和样式。

### 7.2 重定向：旧门牌换新

方式一：配置式重定向（推荐，静态生成时直接用）

```js
// astro.config.mjs
export default defineConfig({
  redirects: {
    '/old-blog/': '/blog/',          // 整段路径重定向
    '/old-post/hello': '/blog/hello', // 单页重定向
  },
})
```

方式二：页面级动态重定向

```astro
---
// src/pages/legacy/[slug].astro
// 旧链接统一 301 到新地址
export async function getStaticPaths() {
  return [
    { params: { slug: 'old-hello' } },
    { params: { slug: 'old-guide' } },
  ]
}

const { slug } = Astro.params
// 返回 301 响应，浏览器自动跳转
return new Response(null, {
  status: 301,
  headers: { Location: `/blog/${slug.replace('old-', '')}` },
})
---
```

讲解：`301` 是"永久重定向"状态码，告诉搜索引擎"旧地址已废弃，用新地址收录"，是网站改版、文章迁移的标准做法。配置式重定向更简单直观，优先使用。

## 8. 路由与内容集合：黄金组合

动态路由 + 内容集合是内容站的核心模式：先用 `getCollection` 查询全部内容，再用 `getStaticPaths` 为每篇内容生成页面。

```astro
---
// src/pages/docs/[slug].astro
// 完整实现：一篇文档一个页面
import { getCollection, render } from 'astro:content'
import BaseLayout from '../../layouts/BaseLayout.astro'

// 构建期：列出全部文档路径
export async function getStaticPaths() {
  const docs = await getCollection('docs')
  return docs.map((doc) => ({
    params: { slug: doc.id },   // 用文档 id 作为 URL 参数
    props: { doc },
  }))
}

// 当前文档数据
const { doc } = Astro.props
const { Content } = await render(doc)  // 把 Markdown 正文编译为组件
---

<BaseLayout title={doc.data.title} description={doc.data.description}>
  <article>
    <h1>{doc.data.title}</h1>
    <Content />
  </article>
</BaseLayout>
```

讲解：这个文件运行时，全站每篇文档都有对应页面；`doc.data` 是经 schema 校验的 frontmatter（见 005 篇），`<Content />` 输出 Markdown 正文。构建期自动生成全部文章页，零运行时成本。

## 9. 常见错误与对策表

| 常见错误 | 报错/现象 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| 动态路由未导出 `getStaticPaths` | 构建报 `getStaticPaths is required for dynamic routes` | 静态模式下，`[slug]` 等动态路由必须声明生成哪些页面 | 在页面中导出 `getStaticPaths`，返回含 `params` 的对象数组 |
| params 键名与文件名不匹配 | 构建报错或路由参数取不到值 | `getStaticPaths` 里 `params` 的键与 `[占位符]` 名称不一致 | 保证 `{ params: { slug: ... } }` 中的键名与 `[slug]` 完全一致 |
| props 是 undefined | 页面渲染空白或报错 | 忘记在 `getStaticPaths` 中传 `props`，或模板访问的字段名写错 | 返回项中加 `props`，模板中通过 `Astro.props.字段名` 访问 |
| 404 页面不生效 | 访问不存在地址显示空白页 | 未创建 `src/pages/404.astro` | 创建 404.astro，配置好看的错误页 |
| 旧链接失效 | 用户收藏的链接 404 | 改版后没有处理重定向 | 用 `astro.config.mjs` 的 `redirects` 配置 301 重定向 |
| 子路径部署后样式丢失 | 图片、CSS 全部 404 | 部署在 `/repo/` 子路径但未配置 `base` | 在 `astro.config.mjs` 配置 `base: '/repo/'`，链接使用 `/repo/` 前缀 |

## 11. 一句话记忆

**文件即路牌：`src/pages/` 里的每个文件对应一个 URL，`[方括号]` 是参数位，`index` 是入口，`404` 是错误页，`redirects` 是换路牌——放一个文件，就多一条路。**
