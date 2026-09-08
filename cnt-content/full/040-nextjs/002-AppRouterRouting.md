---
order: 20
title: Next.js App Router 路由系统
module: 'nextjs'
category: 前端技术
difficulty: intermediate
description: 布局嵌套、动态路由、导航、加载与错误状态——App Router 文件约定的完整入门。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'nextjs/001-NextJS16Overview'
  - 'nextjs/003-DataFetchingCaching'
  - 'react/001-OverviewEnvSetup'
prerequisites:
  - 'nextjs/001-NextJS16Overview'
---

## 0. 一句话理解

> App Router 的文件约定：`page.tsx` 是页面、`layout.tsx` 是共享壳、`[参数]` 文件夹是动态路由、`loading/error/not-found` 是三种状态页面。

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

1. `layout.tsx` 接收 `children`（子路由渲染结果），布局本身在切换子页面时**不会重新渲染**，导航条写在布局里可以避免整页刷新。
2. `metadata` 导出对象用于设置页面标题与描述，Next.js 会自动注入 `<head>`，这是内置 SEO 能力。
3. `lang="zh-CN"` 声明页面语言，有利于无障碍与搜索引擎。

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
2. Next.js 15+ 中 `params` 是 Promise，必须 `await` 后才能读取。
3. `notFound()` 会触发最近的 `not-found.tsx`，返回 404 页面；示例用正则校验"必须是数字"。
4. 多段动态路由用 `[...slug]`（匹配 1 段以上）或 `[[...slug]]`（可匹配 0 段）。

## 3. 导航

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

1. `next/link` 是客户端导航：点击后不会整页刷新，Next.js 会预取视口内的链接页面。
2. 服务端组件里也能用 `Link`，它最终在客户端接管导航。
3. 编程式跳转用 `useRouter()`（来自 `next/navigation`，必须在 `"use client"` 组件里）。

## 4. 加载与错误状态

```tsx
// app/posts/[id]/loading.tsx
export default function Loading() {
  return <p>加载中……</p>
}
```

```tsx
// app/posts/[id]/error.tsx（"use client" 是必须的）
"use client"

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div>
      <p>出错了</p>
      <button onClick={reset}>重试</button>
    </div>
  )
}
```

**讲解：**

1. `loading.tsx` 在路由进入 Suspense 加载态时显示，配合流式渲染避免白屏。
2. `error.tsx` 必须标注 `"use client"`，因为错误边界需要在浏览器里捕获并交互。
3. `reset` 函数由 Next.js 注入，点击后重新渲染出错的页面。

## 5. 动手试试

1. 给 `app/posts/[id]/page.tsx` 加 `generateStaticParams`，预习静态生成：
   ```tsx
   export function generateStaticParams() {
     return [{ id: "1" }, { id: "2" }]
   }
   ```
2. 在 `app/posts/` 下新建 `not-found.tsx`，访问一个非数字 id，确认 404 页面生效。
3. 把导航改成动态生成的文章列表（先写死 5 个 id）。

## 6. 一句话记住

> 路由就是文件夹约定：`page` 管页面、`layout` 管外壳、`[id]` 管动态参数、`loading/error/not-found` 管三种状态。
