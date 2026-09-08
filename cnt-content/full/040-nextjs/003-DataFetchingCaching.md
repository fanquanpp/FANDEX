---
order: 30
title: Next.js 数据获取与缓存
module: 'nextjs'
category: 前端技术
difficulty: intermediate
description: 服务器组件直接取数、fetch 缓存策略、ISR 增量静态再生与 Server Actions 表单提交。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'nextjs/002-AppRouterRouting'
  - 'nextjs/004-DeploymentOptimization'
prerequisites:
  - 'nextjs/002-AppRouterRouting'
---

## 0. 一句话理解

> 服务器组件里可以直接 `await fetch()` 拿数据；缓存策略就三个词：`force-cache` 存起来、`no-store` 不存、`revalidate` 定期更新。

## 1. 服务器组件直接取数

```tsx
// app/posts/page.tsx
interface Post {
  id: number
  title: string
}

export default async function PostsPage() {
  const res = await fetch("https://jsonplaceholder.typicode.com/posts")
  const posts: Post[] = await res.json()

  return (
    <ul>
      {posts.slice(0, 10).map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}
```

**讲解：**

1. 页面组件标 `async` 后可直接 `await` 网络请求——这段代码运行在服务器上，不会出现在浏览器端 JS 里。
2. `res.json()` 把响应解析为对象数组；用 `interface Post` 声明类型后，`post.title` 有完整类型提示。
3. `key` 属性是 React 列表渲染的要求，用稳定的 `post.id` 而不是数组下标。

## 2. 缓存策略

```tsx
// 静态：构建时抓一次，之后直接读缓存（默认）
await fetch("https://api.example.com/static")

// 动态：每次请求都重新抓取
await fetch("https://api.example.com/dynamic", { cache: "no-store" })

// 增量：每 60 秒后台重新生成一次
await fetch("https://api.example.com/price", { next: { revalidate: 60 } })
```

**讲解：**

1. 不传选项时 Next.js 会尽力静态化：构建时抓取并缓存，适合内容型页面。
2. `cache: "no-store"` 跳过缓存，适合登录态、实时库存等数据。
3. `next.revalidate: 60` 实现 ISR：用户仍读到旧缓存，后台每 60 秒最多重建一次，兼顾速度与新鲜度。

## 3. 客户端数据获取

```tsx
"use client"

import { useEffect, useState } from "react"

export default function LiveTime() {
  const [now, setNow] = useState("")

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date().toLocaleTimeString())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return <p>现在时间：{now}</p>
}
```

**讲解：**

1. 需要实时更新、用户交互的数据才放客户端组件（`"use client"`）。
2. `useEffect` 在浏览器挂载后执行，`return () => clearInterval(timer)` 是清理函数，防止组件卸载后定时器泄漏。
3. 更复杂的数据请求建议使用 `useSWR` 或 TanStack Query 管理缓存与重试。

## 4. Server Actions：表单提交

```tsx
// app/contact/page.tsx
async function submit(formData: FormData) {
  "use server"

  const name = formData.get("name")
  // 生产环境：写入数据库或调用 API
  console.log("收到提交：", name)
}

export default function ContactPage() {
  return (
    <form action={submit}>
      <input name="name" placeholder="你的名字" required />
      <button type="submit">提交</button>
    </form>
  )
}
```

**讲解：**

1. 函数内部标注 `"use server"` 后成为 Server Action：浏览器把表单数据发给服务器执行，不需要自己写 API 路由。
2. `formData.get("name")` 读取表单字段，字段名以 `input` 的 `name` 属性为准。
3. 没有 JavaScript 也能提交，这是渐进增强；执行成功后可用 `revalidatePath("/")` 刷新相关页面缓存。

## 5. 动手试试

1. 把首页改成从 `jsonplaceholder` 拉取 10 条文章并展示。
2. 给文章列表加 `{ next: { revalidate: 30 } }`，观察构建日志中的重新验证行为。
3. 写一个 Server Action 收集"订阅邮箱"，提交后在页面上方显示成功提示（提示可用 `useActionState`）。

## 6. 一句话记住

> 能服务器取数就在服务器取；`no-store` 求实时、`revalidate` 求平衡、默认缓存求速度；表单用 Server Action 最省事。
