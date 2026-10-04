---
order: 100
title: 元数据与 SEO
module: 'nextjs'
category: 前端技术
difficulty: intermediate
description: Metadata 对象与 generateMetadata、title 模板与 metadataBase、Open Graph 与 Twitter 卡片、opengraph-image 动态生成、sitemap 与 robots 文件约定，以及 JSON-LD 结构化数据。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'nextjs/020-AppRouterRouting'
  - 'nextjs/090-DeploymentOptimization'
  - 'nextjs/080-AuthProxyMiddleware'
prerequisites:
  - 'nextjs/020-AppRouterRouting'
  - 'nextjs/030-DataFetchingCaching'
---

## 0. 一句话理解

> 页面的 `<head>` 不用手写：从 `layout.tsx`/`page.tsx` 导出 `metadata` 对象，Next.js 构建期自动组装成完整标签；需要按数据生成的标题、分享图，就把静态对象换成 `generateMetadata` 异步函数。

## 前置知识

- [App Router 路由系统](/nextjs/020-AppRouterRouting)：`layout.tsx` 与 `page.tsx` 的分工、动态路由 `params` 是 Promise——本篇的元数据就挂在这两类文件上。
- [数据获取与缓存](/nextjs/030-DataFetchingCaching)：`generateMetadata` 与页面组件在同一请求里取数、共享请求记忆化。

## 学习目标

1. 能用 `metadata` 静态导出与 `generateMetadata` 动态导出覆盖静态页与详情页两种场景。
2. 能配置 title 模板，让"页面标题 | 站点名"的格式全站自动生效。
3. 能说清 `metadataBase` 为什么必须设置，避免分享链接变成相对路径。
4. 能用文件约定（`opengraph-image`、`sitemap.ts`、`robots.ts`）完成分享图、站点地图与爬虫规则。
5. 能判断哪些 SEO 需求要上 JSON-LD 结构化数据。

## 1. 两级导出：静态对象与动态函数

元数据可以从任何 `layout.tsx` 或 `page.tsx` 导出，遵循"就近覆盖"：子级页面的同名规则覆盖父级（根布局）的设置。

```tsx
// app/layout.tsx —— 全站默认值
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: {
    default: "演唱会票务站",
    template: "%s | 演唱会票务站",   // 子页面 title 自动套上后缀
  },
  description: "一手演唱会门票信息与购票服务",
}

// app/about/page.tsx —— 静态页面只写差异项
export const metadata: Metadata = {
  title: "关于我们",   // 渲染为：关于我们 | 演唱会票务站
}
```

详情页的标题来自数据，改成异步函数：

```tsx
// app/events/[id]/page.tsx
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params            // 15 起 params 是 Promise
  const event = await getEvent(id)       // 与页面组件取同一份数据
  if (!event) return { title: "演出不存在" }
  return {
    title: event.name,
    description: `${event.date} ${event.venue}，¥${event.priceFrom} 起`,
  }
}
```

**讲解：**

1. **静态对象 vs 动态函数的选择标准**：值在写代码时已知，用对象；值依赖数据库或路由参数，用函数。`generateMetadata` 与页面组件并行执行，同一个 `fetch` 调用会被请求记忆化去重，不会取两遍数。
2. `template` 只对子级生效，根布局自己的标题走 `default`——这就是"站点名不重复出现两次"的实现方式。
3. `generateMetadata` 里抛错会触发与页面一致的 `error.tsx`；对不存在的资源返回 `{ title: "..." }` 或调用 `notFound()`，与页面组件保持同一语义。
4. 动态路由取数失败要有兜底：函数返回前先判空，否则一个 404 演出会让整条路由报错。

## 2. metadataBase 与分享链接的绝对地址

```tsx
// app/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL("https://tickets.example.com"),
  openGraph: {
    title: "演唱会票务站",
    description: "一手演唱会门票信息与购票服务",
    images: ["/og-default.png"],   // 借助 metadataBase 解析成绝对地址
  },
}
```

**讲解：**

1. Open Graph 协议要求图片与规范链接是**绝对 URL**，但代码里自然写的是相对路径；`metadataBase` 就是补全域名的那块拼图。不设置时 Next.js 会告警，并在生产环境用环境变量兜底（`VERCEL_URL` 等），自托管项目必须显式写。
2. `openGraph.images` 里的相对路径会在输出 HTML 时被解析为 `https://tickets.example.com/og-default.png`；微信、Twitter、Slack 等平台的分享卡片抓取的就是这些标签。
3. `twitter` 元数据与 `openGraph` 结构相似，未单独提供时多数卡片字段回落到 Open Graph 的值，所以实践中通常只精心配置 `openGraph`，`twitter` 补一个 `card: "summary_large_image"` 即可。

## 3. 动态分享图：opengraph-image 文件约定

给每个演出生成一张"演出名 + 日期"的分享图，用文件约定 + `ImageResponse`：

```tsx
// app/events/[id]/opengraph-image.tsx
import { ImageResponse } from "next/og"

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "演出分享图"

export default async function OgImage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const event = await getEvent(id)
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%",
          display: "flex", flexDirection: "column",
          justifyContent: "center", padding: 80,
          background: "linear-gradient(135deg, #1e1b4b, #4c1d95)",
          color: "white", fontSize: 64, fontWeight: 700,
        }}
      >
        <div>{event?.name ?? "未知演出"}</div>
        <div style={{ fontSize: 32, opacity: 0.8 }}>{event?.date}</div>
      </div>
    ),
    size
  )
}
```

**讲解：**

1. 路由段内放一个 `opengraph-image.tsx`，构建后访问 `/events/42/opengraph-image` 就能得到 PNG，同时该路由段的 Open Graph 标签自动指向它——不需要手写 `images` 配置，文件即配置。
2. `ImageResponse` 用 JSX 描述图片，底层按 Satori 规范渲染，只支持 Flexbox 布局（没有 CSS Grid），样式用内联对象。
3. 静态站也可以直接放 `opengraph-image.png` 图片文件，约定对"图片文件"与"tsx 生成器"一视同仁；`twitter-image` 同理。
4. 动态生成的成本是每个 URL 一次渲染，量大的站点配合 CDN 缓存（该路由自带 `s-maxage`）。

## 4. sitemap 与 robots：两个文件约定

```ts
// app/sitemap.ts
import type { MetadataRoute } from "next"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const events = await getAllEventIds()
  return [
    { url: "https://tickets.example.com", priority: 1 },
    { url: "https://tickets.example.com/about" },
    ...events.map((id) => ({
      url: `https://tickets.example.com/events/${id}`,
      lastModified: new Date(),
    })),
  ]
}
```

```ts
// app/robots.ts
import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard/", "/api/"] },
    sitemap: "https://tickets.example.com/sitemap.xml",
  }
}
```

**讲解：**

1. 这两个文件让"站点地图"与"爬虫规则"也变成代码：数据驱动的 URL 列表（演出、文章）不必手工维护静态 XML。
2. `sitemap.ts` 构建时执行（静态）或请求时执行（动态，取决于页面渲染模式），输出 `/sitemap.xml`；`robots.ts` 输出 `/robots.txt`。
3. `robots` 只能"建议"爬虫，真正的访问控制靠鉴权（见第 8 篇）；把后台路径写进 `disallow` 反而会向攻击者暴露目录结构，敏感区域的正确做法是登录墙，robots 里可以干脆不提。

## 5. JSON-LD：给搜索引擎的"结构化说明书"

分享卡片解决"人看到什么"，结构化数据解决"机器理解什么"。演出页想富摘要（评分、票价、日期直接出现在搜索结果里），注入 JSON-LD：

```tsx
// app/events/[id]/page.tsx 内
export default async function EventPage({ params }) {
  const { id } = await params
  const event = await getEvent(id)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: event.name,
    startDate: event.date,
    location: { "@type": "Place", name: event.venue },
    offers: {
      "@type": "Offer",
      price: event.priceFrom,
      priceCurrency: "CNY",
      availability: "https://schema.org/InStock",
    },
  }
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1>{event.name}</h1>
    </main>
  )
}
```

**讲解：**

1. JSON-LD 放在 `<script type="application/ld+json">` 里，`@type` 对应 schema.org 的类型词典；演出用 `MusicEvent`、文章用 `Article`、商品用 `Product`。
2. `dangerouslySetInnerHTML` 在这里是标准写法：JSON.stringify 的输出转义了 HTML 字符，注入内容全部来自自家数据库时风险可控；**不要**把用户输入未清洗地拼进去。
3. 优先级建议：先保证标题、描述、分享图三件套正确（覆盖所有页面的基本盘），再对核心页面（详情页、文章页）补 JSON-LD——本末倒置的常见表现是首页堆满结构化数据，详情页却没有分享图。

## 6. 常见陷阱

1. **忘记 `metadataBase`**：分享图输出成相对路径，各平台抓不到图。自托管项目必须在根布局显式设置。
2. **在 `generateMetadata` 里重复取数却以为更慢**：同一渲染内的相同 fetch 会被请求记忆化去重，放心与页面共用取数函数；真正要避免的是"元数据里取列表、页面里取详情"这类两份不同数据。
3. **`viewport` 写进 `metadata`**：14 起 `themeColor`、`viewport` 从 Metadata 对象中拆出，需要单独导出 `export const viewport: Viewport`——写在 metadata 里会收到废弃告警。
4. **标题全站一样**：详情页忘了 `generateMetadata`，搜索结果里每条都是站点名；检查方法是 `view-source:` 看 `<title>` 是否随页面变化。
5. **把 robots 当访问控制**：`disallow` 是给守规矩的爬虫看的，敏感路径一律上真鉴权。

## 7. 动手实践

**任务一：模板标题。** 给学习项目配置全站 title 模板（`%s | 站点名`），让 `/about` 与一个详情页分别输出"关于我们 | 站点名"与"<数据标题> | 站点名"。提示：模板写在根布局，子页面只写 `title: "关于我们"`。

**任务二：详情页完整元数据。** 给 `events/[id]` 页面实现 `generateMetadata`：标题取演出名、description 拼日期与场地、`openGraph.images` 指向该路由的分享图。完成后 `view-source:` 逐项核对 `<title>`、`og:title`、`og:image` 的值。提示：本模块示例用 `jsonplaceholder` 没有演出数据，可以把"演出"换成"文章"——标题取 `post.title`，描述取正文前 80 个字符。

**任务三：站点地图与爬虫规则。** 用 `sitemap.ts` 列出首页、关于页与全部文章详情页；用 `robots.ts` 禁止爬虫访问 `/dashboard/`，并声明 sitemap 地址。提示：`getAllEventIds` 的角色就是"从数据源拿全部 id"，jsonplaceholder 的 `/posts` 列表可以充当。

先自己写，再对照参考实现：

<details>
<summary>任务一参考实现</summary>

```tsx
// app/layout.tsx
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: {
    default: "Next.js 学习站",
    template: "%s | Next.js 学习站",
  },
}

// app/about/page.tsx
export const metadata: Metadata = { title: "关于我们" }
```

验证：访问 `/about` 后 `view-source:`，`<title>` 应为 `关于我们 | Next.js 学习站`；首页没有子级 title，走 `default`，输出 `Next.js 学习站`，站点名不会重复两次。
</details>

<details>
<summary>任务二参考实现</summary>

```tsx
// app/posts/[id]/page.tsx（节选）
import type { Metadata } from "next"

async function getPost(id: string) {
  const res = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`)
  if (!res.ok) return null
  return res.json() as Promise<{ id: number; title: string; body: string }>
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const post = await getPost(id)
  if (!post) return { title: "文章不存在" }
  return {
    title: post.title,
    description: post.body.slice(0, 80),
    openGraph: {
      title: post.title,
      description: post.body.slice(0, 80),
      images: [`/posts/${id}/opengraph-image`],
    },
  }
}
```

`view-source:` 核对清单：`<title>` 含文章标题；`<meta property="og:title">` 与之一致；`<meta property="og:image">` 是绝对地址（有 `metadataBase` 时自动补全域名，没有则注意告警）。同一 `getPost` 被页面组件复用时只发一次请求——请求记忆化在起作用。
</details>

<details>
<summary>任务三参考实现</summary>

```ts
// app/sitemap.ts
import type { MetadataRoute } from "next"

const BASE = "https://example.com"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const res = await fetch("https://jsonplaceholder.typicode.com/posts")
  const posts = (await res.json()) as { id: number }[]
  return [
    { url: BASE, priority: 1 },
    { url: `${BASE}/about` },
    ...posts.map((p) => ({ url: `${BASE}/posts/${p.id}` })),
  ]
}
```

```ts
// app/robots.ts
import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard/"] },
    sitemap: "https://example.com/sitemap.xml",
  }
}
```

验证：构建后访问 `/sitemap.xml` 应看到全部文章 URL，`/robots.txt` 应包含 disallow 与 sitemap 两行。练习里的 `BASE` 用了占位域名，真实项目里把它换成与 `metadataBase` 一致的常量——两处域名不一致是站点地图失效的常见原因。
</details>

## 8. 一句话记住

> 静态值导 `metadata` 对象、动态值导 `generateMetadata` 函数；`metadataBase` 补全分享链接域名，`opengraph-image.tsx` 让分享图变成代码，`sitemap.ts` 与 `robots.ts` 让 SEO 配置数据驱动；机器可读的富摘要交给 JSON-LD，但先保证标题、描述、分享图三件套。
