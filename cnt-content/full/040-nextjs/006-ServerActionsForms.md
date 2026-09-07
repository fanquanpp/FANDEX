---
order: 60
title: Server Actions 与表单
module: 'nextjs'
category: 前端技术
difficulty: intermediate
description: 不写 API 也能改数据：'use server'、useActionState 与安全校验。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'nextjs/003-DataFetchingCaching'
  - 'nextjs/004-DeploymentOptimization'
prerequisites:
  - 'nextjs/002-AppRouterRouting'
  - 'react/001-OverviewEnvSetup'
---

## 0. Server Actions 是什么（先读这里）

> 学习目标：会用 `'use server'` 定义 Server Action 并绑定到 `<form action>`；会用 `useActionState` 把校验错误带回表单并回填输入；会用 `useFormStatus` / `useTransition` 展示提交中状态；会用 zod 在服务端做强校验；会用 `revalidatePath` / `revalidateTag` 失效缓存；理解渐进增强与"Action 是公开端点"的安全模型。

改数据有两条路：Route Handler（自己定义接口、自己 fetch）与 Server Actions（框架代劳）。后者把"表单提交、服务器执行、缓存更新"串成一个函数调用，是 App Router 时代写表单的首选。

| 对比项 | Route Handler | Server Actions |
| --- | --- | --- |
| 定位 | 通用 HTTP 接口，供任何调用方使用 | 专为本应用 UI 服务的"服务器函数" |
| 调用方式 | fetch + 手写 URL 与方法 | 直接 `import` 函数或绑定 `<form action>` |
| 请求协议 | HTTP/JSON，格式自己约定 | 框架自动序列化（内部走 POST） |
| 错误处理 | 手动解析响应与状态码 | 返回值直接进入 React 状态 |
| 适合场景 | 开放 API、Webhook、第三方回调 | 表单提交、增删改、按钮触发 |

**讲解：**

1. Server Actions 并没有"消灭"后端：它本质仍是框架托管的 HTTP 端点，只是 URL、序列化与调用协议都不再需要你操心。
2. 需要精确控制 HTTP 语义、供外部系统调用时用 Route Handler（见第 5 篇）；本应用内部的表单与按钮用 Server Actions。
3. 两者可共存：Action 负责页面交互，Handler 负责开放能力，底层共享同一套数据库访问代码。

## 1. 第一个 Server Action：'use server' 与 form action

Action 就是标了 `'use server'` 的 async 函数。有两种定义位置：独立文件（文件顶部声明）或内联在组件里（函数体首行声明）。

```ts
// app/todos/actions.ts
"use server" // 文件级声明：此文件所有导出函数都是 Server Action

import { db } from "@/lib/db" // db 为任意数据库客户端，此处仅示意

// 约定：入参 FormData，返回 void 或可序列化对象
export async function addTodo(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim()
  if (!title) return // 最简示例：真实项目必须用 zod 校验，见第 4 节
  await db.todo.create({ data: { title, done: false } })
}
```

```tsx
// app/todos/page.tsx
import { addTodo } from "./actions"

export default function TodoPage() {
  return (
    <form action={addTodo}> {/* action 绑定服务器函数，而不是 onSubmit */}
      <input name="title" placeholder="要做什么？" required />
      <button type="submit">添加</button>
    </form>
  )
}
```

**讲解：**

1. 独立 `actions.ts` 利于复用与测试；内联写法是在 async 函数体首行写 `'use server'`，只有该函数是 Action，适合一次性小逻辑。
2. Action 的入参与返回值必须可序列化（字符串、数字、普通对象、FormData），不能传类实例、函数等无法跨越网络的结构。
3. `<form action={addTodo}>` 的 `action` 接收函数：提交时浏览器把 FormData 以 POST 发给服务器执行，相当于一次隐藏的 RPC。

## 2. useActionState：把结果带回表单

Action 的返回值不会自动更新 UI，需要用 `useActionState`（React 19 内置）接进组件状态。

```ts
// lib/form.ts —— Action 状态的统一类型
export type FormState = {
  message: string // 整体提示
  fieldErrors: Record<string, string[]> // 字段级错误：title -> ["标题不能为空"]
  values: Record<string, string> // 提交前的输入，用于回填
}

export const emptyState: FormState = { message: "", fieldErrors: {}, values: {} }
```

```ts
// app/todos/actions.ts（节选）
"use server"

import { revalidatePath } from "next/cache"
import { emptyState, type FormState } from "@/lib/form"

export async function addTodo(_prev: FormState, formData: FormData): Promise<FormState> {
  // 签名固定：(上一次状态, 表单数据) => 新状态
  const title = String(formData.get("title") ?? "").trim()
  if (!title) {
    return { ...emptyState, fieldErrors: { title: ["标题不能为空"] } }
  }
  await db.todo.create({ data: { title, done: false } })
  revalidatePath("/todos") // 新增后失效列表缓存（见第 5 节）
  return { ...emptyState, message: "已添加" }
}
```

```tsx
// app/todos/form.tsx —— 客户端组件
"use client"

import { useActionState } from "react"
import { addTodo } from "./actions"
import { emptyState } from "@/lib/form"

export function TodoForm() {
  // 返回 [状态, 提交函数, 是否提交中]
  const [state, formAction, pending] = useActionState(addTodo, emptyState)

  return (
    <form action={formAction}>
      {/* defaultValue 用上次提交的值回填，校验失败不丢输入 */}
      <input name="title" defaultValue={state.values.title} required />
      {state.fieldErrors.title?.[0] && <p>{state.fieldErrors.title[0]}</p>}
      <button type="submit" disabled={pending}>
        {pending ? "提交中" : "添加"}
      </button>
    </form>
  )
}
```

**讲解：**

1. `useActionState(fn, initialState)` 的 `fn` 签名固定为 `(prevState, formData) => newState`；第一个参数是上一次返回的状态，初始为 `initialState`。
2. 第三个返回值 `pending` 表示提交进行中，可直接禁用按钮；不用它时也可用 `useFormStatus`（见第 3 节）。
3. 想回填输入就要在返回的状态里带上 `values`：服务器读 FormData 时顺手把原值放回去，经 `defaultValue` 显示。

## 3. 提交中状态：useFormStatus 与 useTransition

| 手段 | 用法 | 适用场景 |
| --- | --- | --- |
| `useActionState` 第三返回值 | 直接拿 `pending` | 已在用 useActionState 的表单 |
| `useFormStatus` | 表单子组件内读取 pending | 把提交按钮抽成独立组件复用 |
| `useTransition` | `startTransition(() => action())` | onClick 直接调用 Action 的场景 |

```tsx
// app/todos/submit-button.tsx
"use client"

import { useFormStatus } from "react-dom"

// 必须是 <form> 的子组件，否则读不到提交状态
export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending}>
      {pending ? "提交中……" : children}
    </button>
  )
}
```

**讲解：**

1. `useFormStatus` 读取的是最近父级 form 的提交状态，所以按钮组件必须写在 `<form>` 内部。
2. 非表单触发的 Action（如删除按钮的 onClick）用 `useTransition` 包裹：`startTransition(() => deleteTodo(id))`，其 `pending` 值同样用于禁用按钮与文案反馈。
3. 提交中禁用按钮是防重复提交的第一道手段；关键写操作还应在服务端做幂等设计。

## 4. zod 服务端校验：永远不信任客户端

浏览器端的 `required`、正则只是体验优化：攻击者可绕过页面直接构造请求。校验的唯一权威位置在服务器，推荐用 zod 声明式完成。

```ts
// lib/post-schema.ts
import { z } from "zod"

// 服务端唯一信任的校验来源
export const postSchema = z.object({
  title: z.string().trim().min(1, "标题不能为空").max(50, "标题最长 50 字"),
  content: z.string().trim().min(10, "正文至少 10 个字"),
})

// 由 schema 推导 TypeScript 类型：类型与校验永远同步
export type PostInput = z.infer<typeof postSchema>
```

```ts
// app/posts/actions.ts（节选）
"use server"

import { postSchema } from "@/lib/post-schema"
import { emptyState, type FormState } from "@/lib/form"

export async function createPost(_prev: FormState, formData: FormData): Promise<FormState> {
  // 1. 从 FormData 取出原始字符串，交给 zod 解析
  const parsed = postSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
  })

  // 2. 校验失败：返回字段级错误，绝不写库
  if (!parsed.success) {
    return {
      ...emptyState,
      fieldErrors: parsed.error.flatten().fieldErrors, // { title: [...], content: [...] }
      values: { title: String(formData.get("title") ?? ""), content: String(formData.get("content") ?? "") },
    }
  }

  // 3. parsed.data 已通过校验且类型为 PostInput，可放心入库
  await db.post.create({ data: parsed.data })
  revalidatePath("/posts")
  return { ...emptyState, message: "发布成功" }
}
```

**讲解：**

1. `safeParse` 不抛异常：成功时 `parsed.data` 是校验并清洗后的数据，失败时 `parsed.error` 携带全部错误。
2. `flatten().fieldErrors` 把错误整理成 `{ 字段名: [文案] }`，正好对应 `useActionState` 的回填结构。
3. 复杂字段同理：`z.coerce.number()` 转数字、`z.enum([...])` 限定取值，让非法输入在边界处就被拒绝。

## 5. 缓存失效与页面跳转

Action 改完数据后，页面看到的可能还是旧缓存。用 `revalidatePath` / `revalidateTag` 主动失效，用 `redirect` 跳转。

```ts
// app/posts/actions.ts（节选）
"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { redirect } from "next/navigation"

export async function publishPost(id: string) {
  await db.post.update({ where: { id }, data: { published: true } })

  revalidatePath("/posts") // 方式一：精确失效某个路径
  revalidateTag("posts") // 方式二：失效打有该标签的所有缓存
  redirect("/posts") // 跳转；redirect 通过抛错终止后续代码，不要用 try/catch 包它
}
```

| 对比项 | revalidatePath | revalidateTag |
| --- | --- | --- |
| 失效对象 | 指定路径（支持动态段） | 一组打了相同标签的缓存 |
| 精确度 | 高，路径级 | 中，按数据域分组 |
| 典型用法 | 表单提交后刷新当前列表 | 多个页面共用同一份数据源 |

**讲解：**

1. 给 fetch 打标签：`fetch(url, { next: { tags: ["posts"] } })`，之后一处 `revalidateTag("posts")` 即可让所有用到它的页面同步更新。
2. 带动态段的路径也可失效，如 `revalidatePath("/posts/[id]", "page")`。
3. 失效要"最小够用"：只 revalidate 真正受影响的路径与标签，避免整站缓存频繁失效。

## 6. 渐进增强：JS 加载前也能提交

`<form action={serverAction}>` 不是普通 `onSubmit`：Next.js 会为表单注入隐藏字段来标识要调用的 Action，即使浏览器还没加载完 JS（甚至禁用 JS），点击提交也能把数据 POST 到服务器并执行 Action。

| 对比项 | onSubmit + fetch | action 绑定 Server Action |
| --- | --- | --- |
| JS 加载前可提交 | 否，事件绑定尚未就绪 | 是，原生表单直发 |
| 需要手写请求代码 | 是，URL、方法、序列化 | 否，函数即接口 |
| 错误与状态管理 | 手动 setState、loading 变量 | useActionState 自动接入 |
| 组件要求 | 必须是客户端组件 | 表单所在页面可以是服务器组件 |

**讲解：**

1. 需要错误回填、pending 反馈时，把使用 `useActionState` 的部分抽成客户端子组件；外层页面与表单骨架仍可以是服务器组件。
2. 渐进增强意味着弱网、脚本加载慢的用户也能完成核心流程，对可访问性与 SEO 都是加分项。
3. 提交成功后的反馈（跳转、提示）优先用 `redirect` / `revalidatePath` 在服务端完成，天然不依赖 JS。

## 7. 安全要点：Action 是公开端点

Server Action 编译后是一个**任何人都能直接调用的公开 HTTP 端点**：框架生成的隐藏 URL 是公开的，参数可以被任意构造。它的安全完全取决于你在函数体内做了什么。

```ts
// app/admin/actions.ts
"use server"

import { cookies } from "next/headers"
import { verifySession } from "@/lib/auth"
import { fail } from "@/lib/form"

export async function deleteUser(formData: FormData) {
  // 1. 鉴权必须在 Action 内部做：proxy.ts 的拦截只是体验层，可以被绕过
  const token = (await cookies()).get("session")?.value
  const session = await verifySession(token)
  if (!session || session.role !== "admin") {
    return fail("无权限", 403) // 未授权直接返回，绝不执行敏感操作
  }

  // 2. 不信任任何来自表单的身份信息：以服务端会话为准
  const id = String(formData.get("id") ?? "")
  if (!id) return fail("缺少 id", 400)

  await db.user.delete({ where: { id } })
  revalidatePath("/admin/users")
  return { success: true }
}
```

**讲解：**

1. 把 Action 当作公开的 POST 接口来审视：鉴权、校验、限流一个都不能少；"页面上没有暴露这个按钮"不是安全边界。
2. 身份只认服务端会话（Cookie + 服务端验证），永远不要相信表单里传来的 `userId`、`role` 等字段。
3. 敏感操作考虑幂等与重放：带请求 id 去重、限制频率；关键业务（支付、扣库存）要有审计日志。
4. 更多入口防线（proxy 粗筛、安全响应头、CSRF）见第 8 篇《认证、代理与安全》。

## 8. 动手试试

1. 把第 3 篇的"订阅邮箱"表单升级为 `useActionState` 版本：支持字段错误提示、输入回填与提交中禁用。
2. 用 zod 重写文章创建 Action：标题 1-50 字、正文至少 10 字，错误逐字段展示。
3. 给文章删除按钮加 `useTransition` 的 pending 反馈，并在 Action 内部加管理员校验。

## 小结与延伸

> Action = 标了 `'use server'` 的 async 函数：`<form action>` 一绑即用；结果用 `useActionState` 接回组件，pending 用 `useFormStatus`；校验只认服务端 zod；改完数据 `revalidatePath/Tag` 失效缓存；它本质是公开端点，鉴权必须写在函数体内。

- 与本文互补的 HTTP 接口写法，见第 5 篇《Route Handlers 与 API 设计》。
- `revalidateTag` 与 fetch 标签的配合细节，见第 3 篇《Next.js 数据获取与缓存》。
- 渐进增强与 Server Actions 的更多 API 行为，以官方文档为准。
