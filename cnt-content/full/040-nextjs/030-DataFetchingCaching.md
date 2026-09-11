---
order: 30
title: Next.js 数据获取与缓存
module: 'nextjs'
category: 前端技术
difficulty: intermediate
description: 服务器组件直接取数、Next.js 15+ 的 fetch 缓存默认语义、四层缓存地图、按需失效与 ISR 增量静态再生。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'nextjs/020-AppRouterRouting'
  - 'nextjs/090-DeploymentOptimization'
  - 'nextjs/070-CacheComponentsDeepDive'
prerequisites:
  - 'nextjs/020-AppRouterRouting'
---

## 0. 一句话理解

> 服务器组件里可以直接 `await fetch()` 拿数据；Next.js 15 起 fetch **默认不缓存**，缓存要显式选择：`force-cache` 存起来、`no-store` 完全不存、`next.revalidate` 定期更新。

先纠正一个流传很广的旧认知：Next.js 13/14 时代 fetch 默认缓存，15（2024-10）起改为**默认不缓存**。读旧教程时凡是"fetch 默认缓存"的说法，都要按 15+ 的语义换算一遍。

## 1. 服务器组件直接取数

```tsx
// app/posts/page.tsx
interface Post {
  id: number
  title: string
}

export default async function PostsPage() {
  const res = await fetch("https://jsonplaceholder.typicode.com/posts")
  if (!res.ok) throw new Error("文章列表加载失败") // 交给 error.tsx 呈现
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

1. 页面组件标 `async` 后可直接 `await` 网络请求——这段代码运行在服务器上，不会出现在浏览器端 JS 里，浏览器拿到的已是渲染好的 HTML。
2. `res.ok` 判断 HTTP 状态：fetch 对 404/500 不会抛异常，只有网络级失败才会，所以要手动检查；抛出的错误由 `error.tsx` 错误边界接管。
3. `res.json()` 把响应解析为对象数组；用 `interface Post` 声明类型后，`post.title` 有完整类型提示。
4. `key` 属性是 React 列表渲染的要求，用稳定的 `post.id` 而不是数组下标。
5. 数据库客户端（Prisma、Drizzle 等）的调用同理：任何 `await` 都能直接写在服务器组件里，不需要"先有接口再取数"这层间接。

## 2. 缓存策略：15+ 的默认语义

```tsx
// 默认（auto）：不进入数据缓存。
// 若页面没有其他动态信号，页面仍在构建期静态生成，
// 这次 fetch 的结果被烘焙进静态 HTML（构建时快照）
await fetch("https://api.example.com/static")

// 显式长期缓存：进入数据缓存，跨请求复用（类似 14 的默认行为）
await fetch("https://api.example.com/static", { cache: "force-cache" })

// 动态：每次请求都重新抓取，并把整个页面转为动态渲染
await fetch("https://api.example.com/dynamic", { cache: "no-store" })

// 增量静态再生（ISR）：缓存 + 每 60 秒后台再生一次
await fetch("https://api.example.com/price", { next: { revalidate: 60 } })
```

| 写法 | 数据缓存 | 页面渲染模式 | 适用数据 |
| --- | --- | --- | --- |
| 默认不写 | 不缓存 | 无动态信号则构建期静态 | 能接受构建时快照的内容 |
| `cache: "force-cache"` | 长期缓存 | 静态 | 横幅、配置、不常变的列表 |
| `cache: "no-store"` | 不缓存 | 动态（每次请求） | 登录态、实时库存 |
| `next: { revalidate: N }` | 缓存 N 秒 | 静态 + 定时再生 | 价格、榜单等可容忍延迟的数据 |

**讲解：**

1. **默认值反转的原因**：隐式缓存让"为什么页面没更新"成为高频疑难；15 把"是否缓存"的选择权还给开发者，第三方库发出的 fetch 也不再被框架偷偷缓存。
2. `cache: "no-store"` 与 `next: { revalidate: 0 }` 等价，都会让页面进入动态渲染，构建日志里该路由标记为 `ƒ`（Dynamic）。
3. `next.revalidate: 60` 就是 ISR：用户 60 秒内读到缓存（速度快），后台异步再生（新鲜度有界）。这是"静态的速度 + 可控的陈旧度"的折中，内容型页面的主力武器。
4. `fetch` 的 `next.tags` 可以给缓存打标签，配合按需失效使用（见第 4 节）。

## 3. 四层缓存地图

fetch 只是入口，一个请求路径上其实有四层独立的缓存。建立全景地图，才能定位"页面为什么旧/为什么慢"：

| 层 | 缓存对象 | 默认行为（15+） | 失效手段 |
| --- | --- | --- | --- |
| 请求记忆化 | 同一次渲染内重复的 fetch/查询 | 始终开启（单次渲染内去重） | 无需管理，渲染结束即失效 |
| 数据缓存（Data Cache） | fetch 的响应体 | 默认不缓存 | revalidate / tags |
| 全路由缓存（Full Route Cache） | 渲染好的静态 HTML | 静态路由构建期生成 | 路由段 revalidate、revalidatePath |
| 客户端路由缓存（Router Cache） | 已访问路由的 RSC 载荷 | 页面段不缓存（staleTime 0），布局短期缓存 | 导航时按需刷新 |

**讲解：**

1. **请求记忆化**是 React 级别的去重：同一次页面渲染中，10 个组件都 `fetch` 同一个 URL，实际只发一次请求；它不跨请求存在，与数据缓存互不影响。数据库查询的去重用 React 的 `cache()` 函数实现。
2. **全路由缓存**与数据缓存是两层：页面静态化后即使 fetch 不缓存，HTML 也已生成；反过来 fetch 加了缓存而页面读了 Cookie，页面依然是动态的。判断页面静态还是动态看"动态信号"（cookies、headers、searchParams 等），不是看 fetch。
3. **客户端路由缓存**在 15 也反转了默认值：页面段不再缓存（导航总是拿最新），后退/前进仍走缓存以恢复滚动位置。16 的新模型（Cache Components + Partial Prefetching）再次升级了这套预取逻辑，详见第 6、7 篇。
4. 排查缓存问题时先问一句："我说的'缓存'是哪一层？"四层混为一谈是大多数缓存疑难的根源。

## 4. 按需失效：revalidatePath 与 revalidateTag

定时再生之外，写操作后往往需要**立刻**让相关缓存失效：

```ts
import { revalidatePath, revalidateTag } from "next/cache"

revalidatePath("/posts") // 失效指定路径的全路由缓存
revalidateTag("posts") // 失效所有打了 posts 标签的缓存
```

```tsx
// 给 fetch 打标签，之后可按标签整体失效
await fetch("https://api.example.com/posts", {
  next: { tags: ["posts"] },
})
```

**讲解：**

1. `revalidateTag`/`revalidatePath` 只能在 Server Action 或 Route Handler 中调用，不能在渲染过程中调用（15 起会直接抛错）。
2. Next.js 16 调整了 `revalidateTag` 的签名：推荐传第二个参数（`cacheLife` profile，如 `revalidateTag("posts", "max")`）以获得"先回旧值、后台再生"的 SWR 行为；单个参数的写法已标记废弃。需要"写后立读"语义时，在 Server Action 里改用 `updateTag("posts")`——它失效缓存后立即读取新数据。
3. 精细度选择：改了单条数据、多个页面共用 -> 按标签失效；只影响一个页面 -> `revalidatePath`。失效要"最小够用"，避免整站缓存反复重建。

## 5. 客户端数据获取

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
3. 更复杂的数据请求建议使用 TanStack Query 或 SWR 管理缓存、去重与重试；客户端库的缓存与 Next.js 的四层缓存相互独立。

## 6. Server Actions：表单提交的最短路径

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
3. 没有 JavaScript 也能提交，这是渐进增强；执行成功后可用 `revalidatePath("/")` 刷新相关页面缓存。错误回显、提交状态、zod 校验等完整玩法见第 5 篇《Server Actions 与表单》。

## 7. 预告：Cache Components 模式下的取数

在 `next.config.ts` 打开 `cacheComponents: true` 后，缓存语义再次变化：**一切取数默认动态执行**，`fetch` 的 `cache`/`next.revalidate` 选项淡出，改用 `'use cache'` 指令显式声明"这个函数/组件的输出可以缓存"，用 `cacheLife('hours')` 这类 profile 声明缓存时长。传统选项与新模型并存于 16，但新项目建议直接学新模型——它把"什么被缓存"写在代码里而不是藏在默认值里。系统讲解见第 7 篇《缓存体系与 Cache Components 深入》。

## 8. 动手试试

1. 把首页改成从 `jsonplaceholder` 拉取 10 条文章并展示，故意把 URL 改错，观察 `error.tsx` 如何接管。
2. 同一页面并排放三种 fetch（默认、`no-store`、`revalidate: 30`），跑 `next build` 看该路由被标记为静态还是动态，并用 Network 面板对比响应头差异。
3. 写一个 Server Action 收集"订阅邮箱"，提交后用 `revalidatePath` 刷新页面，观察构建日志与页面更新行为。

## 9. 一句话记住

> 能服务器取数就在服务器取；15 起 fetch 默认不缓存，`no-store` 求实时、`revalidate` 求平衡、`force-cache` 求速度；缓存问题先分清四层（记忆化/数据/全路由/客户端），按需失效用 revalidatePath/Tag，写后立读用 updateTag。
