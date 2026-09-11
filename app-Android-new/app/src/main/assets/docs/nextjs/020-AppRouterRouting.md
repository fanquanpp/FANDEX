---
order: 20
title: Next.js App Router 路由系统
module: 'nextjs'
category: 前端技术
difficulty: intermediate
description: 布局嵌套、动态路由、导航预取、加载与错误状态——App Router 文件约定的完整入门。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'nextjs/010-NextJS16Overview'
  - 'nextjs/030-DataFetchingCaching'
  - 'react/010-OverviewEnvSetup'
prerequisites:
  - 'nextjs/010-NextJS16Overview'
---

## 0. 一句话理解

> App Router 的文件约定：`page.tsx` 是页面、`layout.tsx` 是共享壳、`[参数]` 文件夹是动态路由、`loading/error/not-found` 是三种状态页面；文件夹嵌套即 URL 嵌套，不写任何路由表。

先给一张速查表，后面逐个展开：

| 文件 | 职责 | 备注 |
| --- | --- | --- |
| `page.tsx` | 页面内容，使路由可访问 | 文件夹里没有 `page.tsx` 就不是一个可访问路由 |
| `layout.tsx` | 共享壳，包裹子路由 | 切换子页面时不重新渲染 |
| `template.tsx` | 类似布局，但每次导航都会重新挂载 | 需要入场动画等"每次都重来"的效果时用 |
| `loading.tsx` | 路由级加载占位 | 等价于包了一层 `<Suspense>` |
| `error.tsx` | 路由级错误边界 | 必须是客户端组件 |
| `not-found.tsx` | 404 兜底页面 | `notFound()` 也会触发它 |
| `route.ts` | 后端 HTTP 接口 | 与 `page.tsx` 同目录互斥，详见第 4 篇 |

## 1. 布局嵌套

```tsx
// app/layout.tsx：根布局
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "我的站点",
  description: "Next.js 16 学习示例"
}

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <header>全站导航</header>
        {children}
        <footer>页脚</footer>
      </body>
    </html>
  )
}
```

**讲解：**

1. `layout.tsx` 接收 `children`（子路由渲染结果），布局本身在切换子页面时**不会重新渲染**，导航条写在布局里可以避免整页刷新、保持滚动位置与状态。
2. 布局可以嵌套：`app/blog/layout.tsx` 只包裹博客区块的页面，且嵌套在根布局之内——子布局渲染进父布局的 `{children}` 里。
3. `metadata` 导出对象用于设置页面标题与描述，Next.js 会自动注入 `<head>`，这是内置 SEO 能力；需要动态元数据（如按文章标题生成）则用 `generateMetadata` 异步函数。
4. `lang="zh-CN"` 声明页面语言，有利于无障碍与搜索引擎。

**类比**：布局像会议室的四面墙与投影仪——换一批参会人（子页面）时房间不动，只有白板上的内容（`children`）在换。

## 2. 动态路由

创建文件夹 `app/posts/[id]/page.tsx`：

```tsx
import { notFound } from "next/navigation"

export default async function PostPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!/^\d+$/.test(id)) notFound()

  return <main>文章编号：{id}</main>
}
```

**讲解：**

1. 文件夹名 `[id]` 表示动态段：`/posts/42` 会匹配并把 `id` 设为 `"42"`。
2. Next.js 15 起 `params` 是 Promise，必须 `await` 后才能读取；同步访问在 16 中已直接报错。这是从"渲染前必须等请求"走向"能先渲染的先渲染"的架构铺垫。
3. `notFound()` 会触发最近的 `not-found.tsx`，返回 404 页面；示例用正则校验"必须是数字"。
4. 三种动态段写法：`[id]` 匹配单段；`[...slug]` 捕获 1 段以上（`/a/b/c` 全进数组）；`[[...slug]]` 连 0 段也匹配（可选捕获-all，`/docs` 本身也能命中）。
5. 配合 `generateStaticParams` 可以在构建期为已知参数预生成静态页：

```tsx
// app/posts/[id]/page.tsx（追加导出）
export function generateStaticParams() {
  return [{ id: "1" }, { id: "2" }] // 构建期生成 /posts/1 与 /posts/2
}
```

未被列出的参数默认仍可在请求时按需渲染（`dynamicParams` 默认为 `true`）；想只允许预生成的那几条，把它设为 `false`，其余参数直接 404。

## 3. 导航与预取

```tsx
import Link from "next/link"

export default function Nav() {
  return (
    <nav>
      <Link href="/">首页</Link>
      <Link href="/about">关于</Link>
      <Link href={`/posts/${42}`}>文章 42</Link>
    </nav>
  )
}
```

**讲解：**

1. `next/link` 是客户端导航：点击后不会整页刷新，共享布局与状态得以保留。
2. 生产环境下 `<Link>` 进入视口会自动预取目标路由，点击时几乎零等待。Next.js 16 重写了预取：多个链接共享布局时布局只下载一次（布局去重），并且只预取缓存里还没有的部分（增量预取，离开视口会取消）。
3. `prefetch={false}` 可以关停个别链接的预取，适合支付确认页这类"不希望用户拿着旧数据点进来"的页面。
4. 编程式跳转与读取路由信息的 Hook 都来自 `next/navigation`，且必须在客户端组件中使用：`useRouter().push("/login")` 跳转、`usePathname()` 取路径、`useSearchParams()` 取查询串。
5. 带查询参数的搜索表单可以直接用 `next/form` 的 `<Form>` 组件：它像 `<Link>` 一样带预取与客户端导航，JS 未加载时退化为原生表单提交。

## 4. 加载、错误与 404 三种状态

```tsx
// app/posts/[id]/loading.tsx
export default function Loading() {
  return <p>加载中……</p>
}
```

```tsx
// app/posts/[id]/error.tsx（"use client" 是必须的）
"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <p>出错了</p>
      <button onClick={reset}>重试</button>
    </div>
  )
}
```

**讲解：**

1. `loading.tsx` 在路由进入 Suspense 加载态时显示，配合流式渲染避免白屏：导航立即切到占位 UI，数据就绪后流式补齐。
2. `error.tsx` 必须标注 `"use client"`，因为错误边界需要在浏览器里捕获并交互；`reset` 函数由 Next.js 注入，点击后重新渲染出错的页面段。
3. 生产环境里传给 `error.tsx` 的 `error.message` 会被抹除成笼统信息（只保留 `digest` 摘要用于关联服务端日志），防止把内部细节泄露给访客；调试信息应在服务端日志里看。
4. `not-found.tsx` 渲染在最近的布局内；`app/not-found.tsx` 是全站兜底，用户访问任何不匹配的 URL 都会命中它。

## 5. 路由组织与路由段配置

三个实用技巧，覆盖 90% 的目录组织需求：

```text
app/
  (marketing)/            # 圆括号 = 路由组：只影响分组，不出现在 URL 里
    about/page.tsx        # URL 是 /about，不是 /marketing/about
  dashboard/
    layout.tsx            # 只包住后台区块的子布局
    settings/page.tsx     # /dashboard/settings
  api/
    health/route.ts       # 接口路由，与 page.tsx 同目录互斥
```

```tsx
// 路由段配置：写在 page.tsx / layout.tsx / route.ts 顶部
export const revalidate = 300 // 本路由每 5 分钟再生（ISR）
export const dynamic = "force-dynamic" // 强制每次请求动态渲染
```

**讲解：**

1. **路由组** `(marketing)` 用于把若干路由归到同一布局下，圆括号目录本身不进入 URL；同一层级的两个路由组不能定义相同路径，否则冲突报错。
2. **同目录 `page.tsx` 与 `route.ts` 互斥**：一个路径要么渲染页面、要么响应接口，同时存在会在构建时报错。
3. **路由段配置**是写在文件顶部的导出常量，作用于该路由段及其子段：`revalidate` 定时再生、`dynamic` 强制静态/动态。它们是"传统模式"的控制手段；在 16 的 Cache Components 模型下被 `use cache` + `cacheLife` 的显式声明取代（见第 6、7 篇）。

## 6. 常见陷阱

1. **同步读取 `params`/`searchParams`**：两者都是 Promise，直接 `params.id` 得到 `undefined`；类型上也要写成 `Promise<{ id: string }>`。
2. **以为布局能拿到查询参数**：`layout.tsx` 的 props 只有 `children` 与 `params`，没有 `searchParams`——查询串属于请求信息，读取它会让页面转为动态渲染，因此布局不提供。
3. **在静态页面里裸用 `useSearchParams`**：静态渲染中它没有确定值，需要把使用它的客户端组件包进 `<Suspense>`，否则构建报错。
4. **路由组路径冲突**：`(shop)/page.tsx` 与 `(web)/page.tsx` 都会解析成 `/`，同时存在构建失败。

## 7. 动手试试

1. 给 `app/posts/[id]/page.tsx` 配合 `generateStaticParams` 生成两篇预渲染文章，再访问一个未列出的 id，观察"按需渲染"仍然成功。
2. 在 `app/posts/` 下新建 `not-found.tsx`，访问一个非数字 id，确认 404 页面生效；再访问一个不存在的整站路径，确认走的是根级 `not-found.tsx`。
3. 把导航改成动态生成的文章列表（先写死 5 个 id），并用 DevTools Network 面板观察生产模式下 Link 的预取请求。
4. 用路由组给"营销页"（首页、关于）与"后台"（dashboard）分别配一套布局。

## 8. 一句话记住

> 路由就是文件夹约定：`page` 管页面、`layout` 管外壳、`[id]` 管动态参数、`loading/error/not-found` 管三种状态；`params` 记得 `await`，路由组只分组不改 URL，预取在 16 已增量化和布局去重。
