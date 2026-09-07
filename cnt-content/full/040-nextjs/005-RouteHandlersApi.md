---
order: 50
title: Route Handlers 与 API 设计
module: 'nextjs'
category: 前端技术
difficulty: intermediate
description: 用 route.ts 编写后端接口：方法、动态段、请求响应与缓存语义。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'nextjs/003-DataFetchingCaching'
  - 'nextjs/004-DeploymentOptimization'
prerequisites:
  - 'nextjs/002-AppRouterRouting'
---

## 0. Route Handlers 是什么（先读这里）

> 学习目标：理解 `route.ts` 与 `page.tsx` 的分工；会导出 GET/POST/PUT/DELETE 响应各 HTTP 方法；会用动态段 params 与 searchParams 接收参数；会用 NextRequest/NextResponse 处理 Cookie、重定向与流式响应；能说清 GET 接口的缓存语义，并落地统一的错误处理与状态码规范。

Route Handler 是 Next.js 内置的"后端"：在 `app` 目录下创建 `route.ts`，导出与 HTTP 方法同名的异步函数，即可对外提供真实接口，不必再单独维护一个 Express/Koa 服务。

```text
app/
  api/
    todos/
      route.ts          # 对应 /api/todos（集合级接口）
      [id]/
        route.ts        # 对应 /api/todos/42（单条资源接口）
```

| 对比项 | page.tsx（页面） | route.ts（接口） |
| --- | --- | --- |
| 对外产出 | 渲染好的 HTML / React UI | HTTP 响应（JSON、文本、流） |
| 典型调用方 | 浏览器地址栏、`<Link>` 导航 | fetch、curl、移动端、第三方系统 |
| 必须导出 | default 的 React 组件 | 与方法同名的函数：GET、POST 等 |
| 返回值 | JSX | Web 标准 Response 对象 |
| 同目录关系 | 两者不能共存，一个文件夹二选一 | 同左 |

**讲解：**

1. 同一个文件夹里 `page.tsx` 与 `route.ts` 互斥：该路径要么渲染页面、要么响应接口，同时存在会在构建时报错。
2. `route.ts` 里的代码只在服务器执行，可以直接连数据库、读取环境变量密钥，不会被打包进浏览器 JS。
3. 它完全基于 Web 标准 Request/Response API，与各类边缘运行时的写法一致，学习一次即可多处复用。

## 1. 导出 HTTP 方法：GET / POST / PUT / DELETE

一个 `route.ts` 可以同时导出多个方法函数，分别响应不同的 HTTP 动词。

```tsx
// app/api/todos/route.ts
// 说明：db 为任意数据库客户端（如 Prisma），此处仅示意

// GET /api/todos：查询列表
export async function GET() {
  const todos = await db.todo.findMany({ orderBy: { id: "desc" } })
  return Response.json(todos) // 快捷返回 JSON，状态码默认 200
}

// POST /api/todos：新建
export async function POST(request: Request) {
  const body = await request.json() // 读取 JSON 请求体
  if (!body?.title) {
    return Response.json({ error: "title 必填" }, { status: 400 })
  }
  const todo = await db.todo.create({ data: { title: String(body.title) } })
  return Response.json(todo, { status: 201 }) // 201 表示资源创建成功
}

// DELETE /api/todos?id=3：删除（查询参数用法见第 2 节）
export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id")
  if (!id) {
    return Response.json({ error: "id 必填" }, { status: 400 })
  }
  await db.todo.delete({ where: { id: Number(id) } })
  return new Response(null, { status: 204 }) // 204：成功但无响应体
}
```

**讲解：**

1. 只有导出的方法才能被调用：只导出 `GET` 的接口收到 POST 请求会返回 405 Method Not Allowed。
2. `Response.json()` 是标准快捷方式；`new Response(null, { status: 204 })` 常用于"成功但无内容"的删除场景。
3. REST 风格约定：GET 读、POST 建、PUT/PATCH 改、DELETE 删；集合用名词复数（`/api/todos`），单条资源用动态段（`/api/todos/[id]`）。

## 2. 动态段与查询参数：params 与 searchParams

动态段文件夹（如 `[id]`）会把 URL 片段注入 `params`。注意：Next.js 15 起 `params` 与 `searchParams` 都是 Promise，必须先 `await` 再读取。

```tsx
// app/api/todos/[id]/route.ts
// 说明：db 为任意数据库客户端，此处仅示意

interface RouteContext {
  params: Promise<{ id: string }> // 动态段参数是异步的，类型上就是 Promise
}

// GET /api/todos/42：查询单条
export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params // 先 await 拿到 { id: "42" }
  const numId = Number(id)
  if (!Number.isInteger(numId)) {
    return Response.json({ error: "id 必须是数字" }, { status: 400 })
  }
  const todo = await db.todo.findUnique({ where: { id: numId } })
  if (!todo) {
    return Response.json({ error: "资源不存在" }, { status: 404 })
  }
  return Response.json(todo)
}

// PUT /api/todos/42：整体更新
export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params
  const body = await request.json()
  const todo = await db.todo.update({
    where: { id: Number(id) },
    data: { done: Boolean(body.done) },
  })
  return Response.json(todo)
}
```

```tsx
// app/api/search/route.ts —— 查询参数示例：/api/search?q=next&page=2
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  // NextRequest 提供 nextUrl，读取查询参数比手动解析 request.url 更顺手
  const q = request.nextUrl.searchParams.get("q") ?? ""
  const page = Number(request.nextUrl.searchParams.get("page") ?? 1)
  const results = await searchPosts(q, page) // 按关键词分页检索（示意）
  return Response.json({ q, page, results })
}
```

**讲解：**

1. `params` 对应路径中的动态段（`[id]` 单段、`[...slug]` 捕获多段），`searchParams` 对应 `?key=value` 查询串；两者都必须 `await`。
2. 使用 `NextRequest` 时用 `request.nextUrl.searchParams.get("key")` 读取查询参数；用普通 `Request` 时可自行 `new URL(request.url)` 解析。
3. 动态段的值永远是字符串，转数字前必须校验，非法输入直接返回 400，避免脏数据打到数据库。

## 3. 请求与响应：NextRequest 与 NextResponse

`next/server` 提供两个增强类型：`NextRequest` 简化读取 Cookie、查询串与请求地址；`NextResponse` 在 Response 之上支持设置 Cookie、重定向与改写。

```tsx
// app/api/legacy/route.ts
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  // 读取 Cookie：等价于手动解析 request.headers.get("cookie")
  const hasSession = request.cookies.has("session")

  // 旧版本调用方：重定向到新接口
  if (request.nextUrl.searchParams.get("v") === "1") {
    return NextResponse.redirect(new URL("/api/v2/legacy", request.url))
  }

  const res = NextResponse.json({ ok: true, hasSession })
  res.headers.set("Cache-Control", "no-store") // 动态接口显式禁止任何缓存
  return res
}
```

**讲解：**

1. `request.cookies.get(name)?.value` / `res.cookies.set(name, value, options)` 是类型安全的 Cookie 读写通道，set 时可指定 httpOnly、maxAge 等属性。
2. `NextResponse.redirect(new URL(目标, request.url))` 用于跳转；`NextResponse.rewrite()` 则在不改变浏览器地址的情况下把请求改写到另一路径。
3. 处理函数签名是 `(request, context)`：第二个参数只在动态路由里有意义，非动态路由可像第 1 节那样直接省略。

## 4. 流式响应：边生成边发送

返回值是标准 Response，因此可以直接返回 `ReadableStream`，实现"生成多少、发送多少"的流式输出，适合大文本导出、AI 逐字回答等场景。

```tsx
// app/api/stream/route.ts
export async function GET() {
  const encoder = new TextEncoder() // 流中只能传二进制，字符串需先编码

  const stream = new ReadableStream({
    async start(controller) {
      for (const word of ["你好", "，", "世界", "！"]) {
        controller.enqueue(encoder.encode(word)) // 每推一段，客户端立即收到一段
        await new Promise((resolve) => setTimeout(resolve, 300)) // 模拟逐步生成的耗时
      }
      controller.close() // 发送完毕，必须关闭流
    },
  })

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
```

**讲解：**

1. 客户端用 `response.body.getReader()` 逐段读取；配合 `text/event-stream` 等协议可实现打字机效果，页面无需等待完整响应。
2. 典型场景：服务端转发大模型回答、按批导出大 CSV，显著降低首字节等待时间（TTFB）。
3. 流式响应始终按动态处理，不会被静态缓存；具体的流式协议选择与边界情况以官方文档为准。

## 5. 缓存语义：GET 接口什么时候会被缓存

Route Handler 的缓存行为经历过一次重要转向：早期版本（13/14）默认缓存 GET 请求，Next.js 15 起改为默认不缓存，改由开发者显式声明（当前版本的细节以官方文档为准）。POST/PUT/DELETE 等写操作从不缓存。

| 控制手段 | 写法 | 效果 |
| --- | --- | --- |
| 默认（15 起） | 不做任何声明 | GET 每次请求都执行，等价于动态接口 |
| 路由段配置 | `export const dynamic = "force-static"` | GET 在构建期执行一次并缓存为静态 |
| 路由段配置 | `export const revalidate = 60` | 缓存 60 秒，后台定时再生（ISR） |
| 路由段配置 | `export const dynamic = "force-dynamic"` | 强制每次请求都执行；读取 Cookie 等动态 API 时也会自动进入动态模式 |
| fetch 级别 | `{ next: { revalidate: 30 } }` | 只控制这一次取数自身的缓存 |

```tsx
// app/api/stats/route.ts
export const revalidate = 60 // 访问统计 60 秒内复用缓存，扛住高频轮询

export async function GET() {
  const stats = await db.metrics.aggregate() // 聚合查询较重，适合加缓存
  return Response.json(stats)
}
```

**讲解：**

1. 缓存只对 GET 生效；写接口永远直达服务器执行，不必担心"返回了缓存的写入结果"。
2. 默认不缓存让动态接口更安全：涉及登录态、库存、价格的接口，不声明就不会被意外静态化。
3. 值得缓存的接口是"读得多、变得慢"的那类（统计、榜单、配置）；拿不准时先保持默认动态，再依据监控数据逐步加缓存。

## 6. 统一错误处理与状态码

散落的 try/catch 很快会失控。推荐封装统一的响应工具：成功与失败结构一致，任何情况下客户端都能用同一套解析逻辑。

```tsx
// lib/api.ts —— 统一响应工具
export function ok<T>(data: T, status = 200) {
  return Response.json({ success: true, data }, { status })
}

export function fail(message: string, status = 400) {
  return Response.json({ success: false, error: message }, { status })
}
```

```tsx
// app/api/todos/[id]/route.ts
import { fail } from "@/lib/api"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const numId = Number(id)
    if (!Number.isInteger(numId)) {
      return fail("id 必须是整数", 400) // 客户端错误：参数不合法
    }
    await db.todo.delete({ where: { id: numId } })
    return new Response(null, { status: 204 })
  } catch (err) {
    console.error("删除 todo 失败:", err) // 服务端只记日志，不向外泄露细节
    return fail("服务器内部错误", 500) // 客户端只看到笼统的 500
  }
}
```

常用状态码速查：

| 状态码 | 含义 | 典型场景 |
| --- | --- | --- |
| 200 / 201 | 成功 / 已创建 | 查询成功；POST 新建成功 |
| 204 | 成功无内容 | DELETE 成功 |
| 400 | 参数错误 | 缺字段、格式非法 |
| 401 / 403 | 未登录 / 无权限 | 会话缺失；普通用户删他人数据 |
| 404 | 资源不存在 | id 查不到对应记录 |
| 405 | 方法不允许 | 用 POST 访问只导出 GET 的接口 |
| 500 | 服务器错误 | 数据库宕机、代码异常 |

**讲解：**

1. 4xx 归因于调用方（参数、权限），5xx 归因于服务器；错误文案要告诉调用方"该做什么"，而不是抛出内部堆栈。
2. 不要把 `err.message` 原样返回给客户端，避免泄露表结构、文件路径等内部信息。
3. 统一的 `{ success, data | error }` 结构，让前端可以用同一个响应解析器处理全部接口，减少散落的 if 判断。

## 7. 动手试试

1. 为第 3 篇的文章列表补一套接口：`/api/posts`（GET/POST）与 `/api/posts/[id]`（GET/DELETE），用 `curl -i` 逐一验证状态码。
2. 给 `/api/posts` 加 `export const revalidate = 30`，在 `next build` 日志里观察它的缓存类型变化。
3. 写一个流式接口逐字输出一句话，前端用 `res.body.getReader()` 渲染打字机效果。

## 小结与延伸

> `route.ts` 导出方法即接口：params/searchParams 记得 `await`；NextRequest/NextResponse 管 Cookie 与跳转；GET 是否缓存由你显式声明；错误统一封装，4xx 说人话、5xx 不泄密。

- 接口只负责"承形"；本应用内部的改数据操作更推荐 Server Actions，见第 6 篇《Server Actions 与表单》。
- 缓存语义与渲染策略的全局视角，见第 3 篇《Next.js 数据获取与缓存》与第 7 篇《渲染策略与缓存》。
- 接口的鉴权与安全响应头设置，见第 8 篇《认证、代理与安全》。
- 更多接口细节（如 Edge 与 Node 运行时差异、Webhook 校验）以官方文档为准。
