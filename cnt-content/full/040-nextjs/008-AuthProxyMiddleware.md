---
order: 80
title: 认证、代理与安全
module: 'nextjs'
category: 前端技术
difficulty: intermediate
description: 会话、JWT 与 proxy.ts：守住 Next.js 应用的入口。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'nextjs/003-DataFetchingCaching'
  - 'nextjs/004-DeploymentOptimization'
prerequisites:
  - 'nextjs/002-AppRouterRouting'
---

## 0. 认证与入口防线（先读这里）

> 学习目标：能对比 Session+Cookie 与 JWT 两种会话方案的取舍；会在 Route Handler / Server Action 中用 `next/headers` 的 `cookies()` 读写会话；了解 `proxy.ts` 的来历（16 起由 `middleware.ts` 更名）、运行位置与能力边界；会用 matcher 配置做登录重定向与安全响应头；建立"proxy 粗筛、action/handler 强校验"的分层鉴权模型。

Web 应用的安全起点是两个问题：**你是谁**（认证，登录态放哪）与**你能做什么**（鉴权，在哪里校验）。Next.js 为此提供了 Cookie 工具、proxy 入口层与服务器端的强校验位置，三层各司其职。

## 1. 认证两大流派：Session + Cookie 与 JWT

| 对比项 | Session + Cookie（会话） | JWT（JSON Web Token） |
| --- | --- | --- |
| 状态存储 | 服务端保存会话（内存/Redis/数据库），Cookie 只存会话 ID | 无状态，用户信息编码进令牌本身 |
| 吊销与登出 | 删除服务端会话立即生效 | 困难，需黑名单或很短的有效期 |
| 令牌体积 | 小（一个 ID） | 较大（头部 + 载荷 + 签名） |
| 跨服务共享 | 需要共享会话存储 | 自带签名，天然适合多服务验证 |
| 典型组合 | 同域 Web 应用、传统全栈 | 移动端、开放 API、微服务 |
| Next.js 生态 | Auth.js、Clerk 等默认方案 | Supabase Auth 等方案常见 |

**讲解：**

1. 服务端渲染的 Web 应用优先选 Session + Cookie：页面在服务器上就能读到会话，登出可控、实现直观。
2. JWT 的签名保证"没被改过"，但**不保密**：载荷只是 Base64 编码，任何拿到令牌的人都能读出内容，不要放敏感明文。
3. 两者可组合使用：Cookie 里放不透明会话 ID，或放短有效期的 JWT 并在服务端验证；具体选型与实现可参考成熟认证库，细节以官方文档为准。

## 2. 在 Route Handler 与 Server Action 中读写 Cookie

登录的本质：校验凭据后把凭证写进 Cookie。`next/headers` 的 `cookies()` 是统一入口。

```ts
// app/api/login/route.ts
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { username, password } = await request.json()
  const token = await verifyCredentials(username, password) // 校验凭据（示意）
  if (!token) {
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 })
  }

  const store = await cookies() // Next.js 15 起 cookies() 为异步，需要 await
  store.set("session", token, {
    httpOnly: true, // 禁止 JS 读取，防 XSS 窃取会话
    secure: true,   // 仅通过 HTTPS 传输
    sameSite: "lax", // 跨站请求不自动携带，缓解 CSRF
    maxAge: 60 * 60 * 24 * 7, // 一周过期
    path: "/",
  })
  return NextResponse.json({ ok: true })
}
```

```tsx
// app/dashboard/page.tsx —— 服务器组件中只读会话
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function Dashboard() {
  const session = (await cookies()).get("session") // 组件中只能读，不能 set
  if (!session) {
    redirect("/login") // 未登录直接跳走
  }
  return <h1>欢迎回来</h1>
}
```

**讲解：**

1. `cookies()` 读取在页面、Server Action、Route Handler 中均可用；**写入只允许出现在 Server Action 或 Route Handler 中**——服务器组件渲染阶段写 Cookie 会被直接报错。
2. 会话 Cookie 三件套：`httpOnly`（防脚本偷取）、`secure`（只走 HTTPS）、`sameSite`（限制跨站携带）；三者缺一都有已知攻击面。
3. 读取 Cookie 属于动态 API，会让该页面进入动态渲染（见第 7 篇），这是"登录态页面默认动态"的原因。

## 3. proxy.ts：请求进入应用前的关卡

历史与定位：`middleware.ts` 自 Next.js 16 起更名为 `proxy.ts`（旧文件名仍可运行，建议统一迁移）。它运行在请求到达页面/接口之前，是全应用唯一的"入口中间件"。

1. **运行位置**：部署时通常运行在离用户更近的边缘环境；它不是完整的 Node.js 进程——完整的 Node API（如直接读写文件、连接数据库）不可用，代码必须保持轻量（具体运行时能力以官方文档为准）。
2. **能力**：改写/重定向请求、读写转发头与 Cookie、短路返回响应；**没有服务器端数据库会话**，只能看到请求本身携带的信息。
3. **不是鉴权层**：它适合做"粗筛"与体验优化，不能作为敏感操作唯一的安全边界。

```ts
// proxy.ts —— 放在项目根目录（使用 src 目录时放 src 下）
import { NextRequest, NextResponse } from "next/server"

export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("session") // 只能判断"有 Cookie"，不能证明"已登录"

  // 未登录访问受保护路径：跳转登录页并记录回跳地址
  if (!hasSession && request.nextUrl.pathname.startsWith("/dashboard")) {
    const login = new URL("/login", request.url)
    login.searchParams.set("from", request.nextUrl.pathname)
    return NextResponse.redirect(login)
  }

  const res = NextResponse.next() // 放行，继续正常的渲染流程
  res.headers.set("X-Frame-Options", "DENY") // 顺手统一注入安全响应头
  return res
}

export const config = {
  // matcher：只对页面请求执行，排除静态资源，降低每次请求的开销
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
```

**讲解：**

1. 导出函数即为处理函数（`proxy.ts` 中推荐命名 `proxy`，旧的 `middleware.ts` 中为 `middleware`）；返回 `NextResponse.next()` 放行、`redirect()` 跳转、`rewrite()` 改写。
2. `matcher` 支持 `/dashboard/:path*` 这类通配与负向前瞻正则；匹配范围越小，边缘开销与误伤越少。
3. proxy 的正确用法清单：登录态粗筛与跳转、A/B 分流、按地理/设备改写、安全头注入；错误用法：在 proxy 里直连数据库、做重计算或唯一鉴权。

## 4. 完整链路：登录、回跳与登出

把 Cookie 与 proxy 串成完整流程：受保护页被 proxy 拦下带到 `/login?from=/dashboard`，登录成功后写会话并跳回来源页。

```tsx
// app/login/page.tsx —— 登录页把回跳地址放进隐藏字段
import { login } from "./actions"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const { from } = await searchParams
  return (
    <form action={login}>
      {/* from 经服务端页面传入，Action 内只接受本站路径，防开放重定向 */}
      <input type="hidden" name="from" value={from ?? "/dashboard"} />
      <input name="username" placeholder="用户名" required />
      <input name="password" type="password" placeholder="密码" required />
      <button type="submit">登录</button>
    </form>
  )
}
```

```ts
// app/login/actions.ts
"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function login(formData: FormData) {
  const username = String(formData.get("username") ?? "")
  const password = String(formData.get("password") ?? "")
  const token = await verifyCredentials(username, password) // 校验凭据（示意）

  if (!token) {
    redirect("/login?error=1") // 失败：回到登录页并提示
  }

  const store = await cookies()
  store.set("session", token, { httpOnly: true, sameSite: "lax", path: "/" })

  // 只允许站内路径：以 "/" 开头且不以 "//" 开头，防止跳往外部站点
  const from = String(formData.get("from") ?? "/dashboard")
  const safeFrom = from.startsWith("/") && !from.startsWith("//") ? from : "/dashboard"
  redirect(safeFrom)
}
```

**讲解：**

1. 回跳地址必须做**开放重定向防护**：只接受本站相对路径，否则攻击者可构造 `/login?from=https://evil.com` 钓鱼。
2. 登出即反向操作：Server Action 中 `store.delete("session")` 后 `redirect("/")`；如有服务端会话记录，同时删除。
3. 表单绑定 Server Action 的写法来自第 6 篇；错误提示可用 `useActionState` 替代这里的 `?error=1` 参数。

## 5. 安全响应头清单

安全头是零成本的防线，建议全站注入。两种方式二选一：`next.config.ts` 静态配置，或 `proxy.ts` 动态注入。

| 响应头 | 作用 | 示例值 |
| --- | --- | --- |
| Content-Security-Policy | 限制脚本/样式等资源来源，防 XSS | `default-src 'self'; script-src 'self'` |
| Strict-Transport-Security | 强制浏览器后续走 HTTPS | `max-age=63072000; includeSubDomains` |
| X-Frame-Options | 禁止被 iframe 嵌套，防点击劫持 | `DENY` 或 `SAMEORIGIN` |
| X-Content-Type-Options | 禁止 MIME 嗅探 | `nosniff` |
| Referrer-Policy | 控制跳转时泄露来源地址 | `strict-origin-when-cross-origin` |
| Permissions-Policy | 收拢摄像头、麦克风等能力 | `camera=(), microphone=()` |

```ts
// next.config.ts —— 静态配置全站安全头
import type { NextConfig } from "next"

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
]

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }] // 匹配全站路径
  },
}

export default nextConfig
```

**讲解：**

1. CSP 配置不当容易"误伤"自己的脚本与样式：初期可先用 `Content-Security-Policy-Report-Only` 观察违规报告，再逐步收紧为强制模式。
2. 以上为常用起步值，具体指令组合需结合站点实际的第三方资源调整；完整指令清单以官方文档为准。
3. 静态资源、CDN 缓存与安全头的相互作用属于部署话题，可延伸阅读第 4 篇《Next.js 部署与性能优化》。

## 6. CSRF 与鉴权分层模型

**CSRF（跨站请求伪造）**：攻击者诱导已登录用户的浏览器向你的站点发起伪造请求（如表单自动提交），浏览器会自动带上 Cookie。防线：

1. `sameSite: "lax"`（或 strict）让跨站请求不携带会话 Cookie，挡住绝大多数 CSRF；
2. 对关键写操作校验请求的 `Origin` 头，或使用 CSRF token（认证库通常内置，以官方文档为准）；
3. 永远不用 GET 执行写操作——GET 可能被链接、预取与爬虫触发。

**鉴权分层模型**：任何一层都不是多余的，也任何一层都不能单独作为安全边界。

| 层级 | 位置 | 职责 | 强度 |
| --- | --- | --- | --- |
| 第一层：入口粗筛 | proxy.ts | 未登录访问受保护页时跳转登录、注入安全头 | 体验层，可被绕过 |
| 第二层：强校验 | Server Action / Route Handler | 校验会话与角色、zod 校验输入 | 真正的安全边界 |
| 第三层：数据兜底 | 数据库权限 / 行级安全 | 即使前两层失误也限制损失 | 最后防线 |

```ts
// app/admin/actions.ts —— 第二层的标准姿势
"use server"

import { cookies } from "next/headers"
import { verifySession } from "@/lib/auth"

export async function deleteUser(formData: FormData) {
  // 每个敏感 Action 都重新鉴权：不依赖 proxy 是否放行
  const token = (await cookies()).get("session")?.value
  const session = await verifySession(token)
  if (!session || session.role !== "admin") {
    throw new Error("无权限")
  }
  await db.user.delete({ where: { id: String(formData.get("id")) } })
}
```

**讲解：**

1. **永远不要只靠 proxy.ts**：Server Action 是公开端点（见第 6 篇），攻击者可以直接构造请求调用，绕过页面上的按钮与 proxy 的跳转。
2. 第二层的纪律是"每个敏感操作都自证权限"：读会话、验角色、再动数据；公共函数封装 `requireAdmin()` 可减少遗漏。
3. 第三层是运维与架构话题：为数据库账号分配最小权限、启用行级安全，属于纵深防御，超出框架层职责。

## 7. 动手试试

1. 实现完整登录链路：`/dashboard` 被 proxy 重定向到 `/login`，登录成功写 httpOnly Cookie 并回跳，登出删除 Cookie。
2. 在 `next.config.ts` 配置三个安全头，用浏览器 DevTools 的 Network 面板确认响应中已生效。
3. 给第 6 篇的文章删除 Action 补上管理员校验，并尝试不带 Cookie 直接调用该 Action，确认返回无权限。

## 小结与延伸

> 登录态首选 Cookie + 服务端会话：`cookies()` 读 anywhere、写只在 Action/Handler；`proxy.ts`（16 起由 middleware.ts 更名）在边缘做粗筛与安全头，跑不了完整 Node API；CSRF 靠 sameSite 加 Origin 校验；分层模型记住一句：proxy 粗筛、action/handler 强校验、数据层兜底，永远不要只靠 proxy。

- Server Action 与 Route Handler 的写法基础，见第 5 篇《Route Handlers 与 API 设计》与第 6 篇《Server Actions 与表单》。
- 会话读取导致的动态渲染、缓存失效逻辑，见第 7 篇《渲染策略与缓存》。
- 生产环境的 HTTPS、反代与密钥管理，见第 4 篇《Next.js 部署与性能优化》。
- 认证库（Auth.js、Clerk 等）的接入方式、proxy 运行时的具体能力边界，以官方文档为准。
